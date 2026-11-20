import Foundation

/// Talks to the PlugShelf control-surface script inside Ableton Live:
/// one JSON datagram to 127.0.0.1:47812, one JSON datagram back.
enum Ableton {
    static let port: UInt16 = 47812
    static let scriptFolder = "PlugShelf"

    static func send(_ msg: [String: Any], timeout: Double = 2.0) -> [String: Any] {
        guard let payload = try? JSONSerialization.data(withJSONObject: msg) else {
            return ["ok": false, "msg": "Internal error"]
        }
        let s = socket(AF_INET, SOCK_DGRAM, 0)
        guard s >= 0 else { return ["ok": false, "msg": "No socket"] }
        defer { close(s) }
        var tv = timeval(tv_sec: Int(timeout), tv_usec: Int32((timeout - floor(timeout)) * 1_000_000))
        setsockopt(s, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = port.bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")
        let sent = payload.withUnsafeBytes { raw in
            withUnsafePointer(to: &addr) {
                $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                    sendto(s, raw.baseAddress, raw.count, 0, $0, socklen_t(MemoryLayout<sockaddr_in>.size))
                }
            }
        }
        guard sent == payload.count else { return ["ok": false, "msg": "Sending failed"] }

        var buf = [UInt8](repeating: 0, count: 65536)
        let n = recv(s, &buf, buf.count, 0)
        guard n > 0 else {
            return ["ok": false, "offline": true,
                    "msg": "Ableton does not answer. Is Live running, with PlugShelf chosen as a control surface?"]
        }
        let reply = (try? JSONSerialization.jsonObject(with: Data(buf[0..<n]))) as? [String: Any]
        return reply ?? ["ok": false, "msg": "Unreadable answer from Live"]
    }

    // MARK: User Library and the script

    /// The User Library of the Live version used last (newest Library.cfg).
    static func userLibrary() -> URL? {
        let prefs = URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Preferences/Ableton")
        let dirs = (try? FileManager.default.contentsOfDirectory(at: prefs, includingPropertiesForKeys: nil)) ?? []
        var newest: (Date, URL)?
        for d in dirs where d.lastPathComponent.hasPrefix("Live ") {
            let cfg = d.appendingPathComponent("Library.cfg")
            guard let m = (try? cfg.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate else { continue }
            if newest == nil || m > newest!.0 { newest = (m, cfg) }
        }
        if let cfg = newest?.1, let text = try? String(contentsOf: cfg, encoding: .utf8),
           let r = text.range(of: #"<UserLibrary>[\s\S]*?ProjectPath Value="([^"]*)""#, options: .regularExpression) {
            let chunk = String(text[r])
            if let v = chunk.range(of: #"Value="([^"]*)""#, options: .regularExpression) {
                let path = String(chunk[v]).dropFirst(7).dropLast()
                let u = URL(fileURLWithPath: String(path)).appendingPathComponent("User Library")
                if FileManager.default.fileExists(atPath: u.path) { return u }
            }
        }
        let fallback = URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Music/Ableton/User Library")
        return FileManager.default.fileExists(atPath: fallback.path) ? fallback : nil
    }

    static func scriptTarget() -> URL? {
        userLibrary()?.appendingPathComponent("Remote Scripts").appendingPathComponent(scriptFolder)
    }

    /// The script's files as shipped with the app.
    static func scriptFiles() -> [String] {
        ((try? FileManager.default.contentsOfDirectory(atPath: Paths.abletonScript.path)) ?? [])
            .filter { $0.hasSuffix(".py") }.sorted()
    }

    static func scriptStatus() -> [String: Any] {
        guard let target = scriptTarget() else {
            return ["userLibrary": NSNull(), "installed": false, "current": false]
        }
        let files = scriptFiles()
        let installed = FileManager.default.fileExists(atPath: target.appendingPathComponent("__init__.py").path)
        let current = installed && files.allSatisfy { f in
            let a = try? Data(contentsOf: Paths.abletonScript.appendingPathComponent(f))
            let b = try? Data(contentsOf: target.appendingPathComponent(f))
            return a != nil && a == b
        }
        return [
            "userLibrary": target.deletingLastPathComponent().deletingLastPathComponent().path,
            "target": target.path,
            "installed": installed,
            "current": current,
        ]
    }

    static func installScript() -> [String: Any] {
        guard let target = scriptTarget() else {
            return ["ok": false, "msg": "No Ableton User Library found"]
        }
        let fm = FileManager.default
        do {
            try fm.createDirectory(at: target, withIntermediateDirectories: true)
            for f in scriptFiles() {
                let dst = target.appendingPathComponent(f)
                if fm.fileExists(atPath: dst.path) { try fm.removeItem(at: dst) }
                try fm.copyItem(at: Paths.abletonScript.appendingPathComponent(f), to: dst)
            }
            // Live keeps compiled copies; drop them so the new script is used.
            try? fm.removeItem(at: target.appendingPathComponent("__pycache__"))
            // A running Live with a reload-capable script picks the new commands up at once.
            let r = send(["op": "reload"], timeout: 1.0)
            let live = r["ok"] as? Bool == true ? " Live picked it up right away." : ""
            return ["ok": true, "msg": "Script installed in \(target.path).\(live)"]
        } catch {
            return ["ok": false, "msg": "Could not copy the script: \(error.localizedDescription)"]
        }
    }
}
