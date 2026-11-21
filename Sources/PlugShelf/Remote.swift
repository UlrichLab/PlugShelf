import Foundation

/// The optional iPad remote: a second HTTP server on all interfaces (port 47901), off by default.
/// A device pairs once with the 6-digit code shown in Setup and then holds a random token as a cookie.
/// Paired devices may only read a trimmed library (no file paths), load plugins and build racks.
final class RemoteAccess {
    private struct Saved: Codable { var enabled = false; var tokens: [String] = [] }
    private static let file = Paths.support.appendingPathComponent("remote.json")
    private let lock = NSLock()
    private var saved = Saved()
    private var code = ""
    private var fails = 0
    private var server: HTTPServer?
    private weak var api: API?

    init() {
        if let d = try? Data(contentsOf: RemoteAccess.file), let s = try? JSONDecoder().decode(Saved.self, from: d) { saved = s }
        code = RemoteAccess.makeCode()
    }

    private static func makeCode() -> String { String(format: "%06d", Int.random(in: 0..<1_000_000)) }
    private static func makeToken() -> String { (0..<32).map { _ in String(format: "%02x", UInt8.random(in: 0...255)) }.joined() }
    private func save() { if let d = try? JSONEncoder().encode(saved) { try? d.write(to: RemoteAccess.file, options: .atomic) } }

    /// Called once at launch: starts the remote server when it was switched on before.
    func start(api: API) { self.api = api; if saved.enabled { startServer() } }

    func setEnabled(_ on: Bool, api: API) {
        self.api = api
        lock.lock(); saved.enabled = on; code = RemoteAccess.makeCode(); fails = 0; save(); lock.unlock()
        if on { startServer() } else { server?.stop(); server = nil }
    }

    func newCode() { lock.lock(); code = RemoteAccess.makeCode(); fails = 0; lock.unlock() }
    func forget() { lock.lock(); saved.tokens = []; save(); lock.unlock() }

    private func startServer() {
        guard server == nil else { return }
        let s = HTTPServer(address: "0.0.0.0", localOnly: false) { [weak self] r in self?.handle(r) ?? .error(503, "off") }
        do { try s.start(preferredPort: 47901); server = s } catch { server = nil }
    }

    func status() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        let port = server?.port ?? 0
        return ["enabled": saved.enabled, "running": server != nil, "code": saved.enabled ? code : "",
                "devices": saved.tokens.count, "port": Int(port),
                "urls": port == 0 ? [] : RemoteAccess.addresses().map { "http://\($0):\(port)/remote/" }]
    }

    /// IPv4 addresses of the Mac on Wi-Fi / Ethernet.
    static func addresses() -> [String] {
        var out: [String] = []
        var ifa: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&ifa) == 0 else { return [] }
        defer { freeifaddrs(ifa) }
        var p = ifa
        while let i = p {
            let name = String(cString: i.pointee.ifa_name)
            if let a = i.pointee.ifa_addr, a.pointee.sa_family == UInt8(AF_INET), name.hasPrefix("en"),
               i.pointee.ifa_flags & UInt32(IFF_UP) != 0 {
                var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
                if getnameinfo(a, socklen_t(a.pointee.sa_len), &host, socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0 {
                    out.append(String(cString: host))
                }
            }
            p = i.pointee.ifa_next
        }
        return out
    }

    private func authorized(_ r: HTTPRequest) -> Bool {
        let cookie = r.headers["cookie"] ?? ""
        let tok = cookie.split(separator: ";").map { $0.trimmingCharacters(in: .whitespaces) }
            .first { $0.hasPrefix("ps_remote=") }.map { String($0.dropFirst("ps_remote=".count)) } ?? ""
        lock.lock(); defer { lock.unlock() }
        return !tok.isEmpty && saved.tokens.contains(tok)
    }

    private func pair(_ given: String) -> String? {
        lock.lock(); defer { lock.unlock() }
        guard saved.enabled else { return nil }
        if given == code {
            let t = RemoteAccess.makeToken()
            saved.tokens.append(t); save()
            code = RemoteAccess.makeCode(); fails = 0
            return t
        }
        fails += 1
        if fails >= 5 { code = RemoteAccess.makeCode(); fails = 0 }   // no guessing
        return nil
    }

    func handle(_ r: HTTPRequest) -> HTTPResponse {
        guard let api else { return .error(503, "Not ready") }
        if r.method == "GET" && (r.path == "/" || r.path == "/remote" || r.path == "/remote/") {
            var res = HTTPResponse(status: 302); res.headers["Location"] = "/remote/index.html"; return res
        }
        if r.method == "GET" && (r.path.hasPrefix("/remote/") || r.path == "/chain-data.js" || r.path == "/chain-famous.js" || r.path == "/chain-ua.js") {
            return api.file(r.path)
        }
        if r.method == "POST" && r.path == "/api/remote/pair" {
            guard let t = pair(r.json()["code"] as? String ?? "") else { return .error(403, "Wrong code") }
            var res = HTTPResponse.json(["ok": true])
            res.headers["Set-Cookie"] = "ps_remote=\(t); Path=/; Max-Age=31536000; HttpOnly; SameSite=Strict"
            return res
        }
        guard authorized(r) else { return .json(["ok": false, "pair": true], status: 401) }
        switch (r.method, r.path) {
        case ("GET", "/api/remote/state"): return api.remoteState()
        case ("POST", "/api/load"), ("GET", "/api/daw"), ("POST", "/api/rack/build"), ("GET", "/api/rack/build"), ("GET", "/api/thumbs"), ("GET", "/api/uapresets"), ("POST", "/api/remote/fav"), ("GET", "/api/kontakt"), ("POST", "/api/kontakt/load"):
            return api.handle(r)
        default:
            if r.method == "GET" && (r.path.hasPrefix("/thumbs/") || r.path.hasPrefix("/kontakt/art/")) { return api.handle(r) }
            return .error(404, "Not available on the remote")
        }
    }
}
