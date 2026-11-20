import Foundation

/// Talks to the PlugShelf control-surface script inside Ableton Live:
/// one JSON datagram to 127.0.0.1:47812, one JSON datagram back.
enum Ableton {
    static let port: UInt16 = 47812
    static let scriptFolder = "PlugShelf"

    static func send(_ msg: [String: Any], timeout: Double = 2.0) -> [String: Any] {
        guard let payload = try? JSONSerialization.data(withJSONObject: msg) else {
            return ["ok": false, "msg": "Interner Fehler"]
        }
        let s = socket(AF_INET, SOCK_DGRAM, 0)
        guard s >= 0 else { return ["ok": false, "msg": "Kein Socket"] }
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
        guard sent == payload.count else { return ["ok": false, "msg": "Senden fehlgeschlagen"] }

        var buf = [UInt8](repeating: 0, count: 65536)
        let n = recv(s, &buf, buf.count, 0)
        guard n > 0 else {
            return ["ok": false, "offline": true,
                    "msg": "Ableton antwortet nicht. Läuft Live, und ist PlugShelf als Control Surface gewählt?"]
        }
        let reply = (try? JSONSerialization.jsonObject(with: Data(buf[0..<n]))) as? [String: Any]
        return reply ?? ["ok": false, "msg": "Unlesbare Antwort von Live"]
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

    static func scriptStatus() -> [String: Any] {
        let bundled = (try? String(contentsOf: Paths.abletonScript.appendingPathComponent("__init__.py"), encoding: .utf8)) ?? ""
        guard let target = scriptTarget() else {
            return ["userLibrary": NSNull(), "installed": false, "current": false]
        }
        let installed = (try? String(contentsOf: target.appendingPathComponent("__init__.py"), encoding: .utf8))
        return [
            "userLibrary": target.deletingLastPathComponent().deletingLastPathComponent().path,
            "target": target.path,
            "installed": installed != nil,
            "current": installed != nil && installed == bundled,
        ]
    }

    static func installScript() -> [String: Any] {
        guard let target = scriptTarget() else {
            return ["ok": false, "msg": "Keine Ableton User Library gefunden"]
        }
        let fm = FileManager.default
        do {
            try fm.createDirectory(at: target, withIntermediateDirectories: true)
            let src = Paths.abletonScript.appendingPathComponent("__init__.py")
            let dst = target.appendingPathComponent("__init__.py")
            if fm.fileExists(atPath: dst.path) { try fm.removeItem(at: dst) }
            try fm.copyItem(at: src, to: dst)
            // Live keeps compiled copies; drop them so the new script is used.
            try? fm.removeItem(at: target.appendingPathComponent("__pycache__"))
            return ["ok": true, "msg": "Script installiert in \(target.path)"]
        } catch {
            return ["ok": false, "msg": "Konnte das Script nicht kopieren: \(error.localizedDescription)"]
        }
    }
}
