import Foundation

/// A small blocking HTTP/1.1 server bound to 127.0.0.1 only.
/// One request per connection; each connection is handled on a concurrent queue.
struct HTTPRequest {
    var method: String
    var path: String
    var query: [String: String]
    var headers: [String: String]   // lower-cased keys
    var body: Data

    func json() -> [String: Any] {
        (try? JSONSerialization.jsonObject(with: body)) as? [String: Any] ?? [:]
    }
}

struct HTTPResponse {
    var status: Int = 200
    var contentType: String = "application/json; charset=utf-8"
    var body: Data = Data()
    var headers: [String: String] = [:]

    static func json(_ obj: Any, status: Int = 200) -> HTTPResponse {
        let data = (try? JSONSerialization.data(withJSONObject: obj, options: [])) ?? Data("{}".utf8)
        return HTTPResponse(status: status, body: data)
    }

    static func data(_ data: Data, type: String = "application/json; charset=utf-8") -> HTTPResponse {
        HTTPResponse(status: 200, contentType: type, body: data)
    }

    static func error(_ status: Int, _ msg: String) -> HTTPResponse {
        json(["ok": false, "msg": msg], status: status)
    }
}

final class HTTPServer {
    private var fd: Int32 = -1
    private(set) var port: UInt16 = 0
    private let handler: (HTTPRequest) -> HTTPResponse
    private let queue = DispatchQueue(label: "plugshelf.http", attributes: .concurrent)

    init(handler: @escaping (HTTPRequest) -> HTTPResponse) {
        self.handler = handler
    }

    /// Tries the preferred port first, then the next few.
    func start(preferredPort: UInt16) throws {
        for p in preferredPort..<(preferredPort + 20) {
            if bind(port: p) {
                port = p
                let t = Thread { [weak self] in self?.acceptLoop() }
                t.name = "plugshelf.accept"
                t.start()
                return
            }
        }
        throw NSError(domain: "PlugShelf", code: 1, userInfo: [NSLocalizedDescriptionKey: "No free port"])
    }

    private func bind(port p: UInt16) -> Bool {
        let s = socket(AF_INET, SOCK_STREAM, 0)
        guard s >= 0 else { return false }
        var yes: Int32 = 1
        setsockopt(s, SOL_SOCKET, SO_REUSEADDR, &yes, socklen_t(MemoryLayout<Int32>.size))
        var addr = sockaddr_in()
        addr.sin_family = sa_family_t(AF_INET)
        addr.sin_port = p.bigEndian
        addr.sin_addr.s_addr = inet_addr("127.0.0.1")
        let ok = withUnsafePointer(to: &addr) {
            $0.withMemoryRebound(to: sockaddr.self, capacity: 1) {
                Darwin.bind(s, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) == 0
            }
        }
        guard ok, listen(s, 64) == 0 else { close(s); return false }
        fd = s
        return true
    }

    private func acceptLoop() {
        while true {
            let c = accept(fd, nil, nil)
            if c < 0 { continue }
            var noSig: Int32 = 1
            setsockopt(c, SOL_SOCKET, SO_NOSIGPIPE, &noSig, socklen_t(MemoryLayout<Int32>.size))
            var tv = timeval(tv_sec: 10, tv_usec: 0)
            setsockopt(c, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
            queue.async { [weak self] in self?.serve(c) }
        }
    }

    private func serve(_ c: Int32) {
        defer { close(c) }
        guard let req = readRequest(c) else { return }
        var res: HTTPResponse
        // Requests must come from our own page: the Host header guards against DNS rebinding,
        // and a custom header on POST forces a CORS preflight that we never answer.
        let host = (req.headers["host"] ?? "").split(separator: ":").first.map(String.init) ?? ""
        if host != "127.0.0.1" && host != "localhost" {
            res = .error(403, "forbidden host")
        } else if req.method == "POST" && req.headers["x-plugshelf"] != "1" {
            res = .error(403, "missing header")
        } else if req.method == "OPTIONS" {
            res = .error(403, "no cross-origin access")
        } else {
            res = handler(req)
        }
        write(res, to: c)
    }

    private func readRequest(_ c: Int32) -> HTTPRequest? {
        var buf = Data()
        var chunk = [UInt8](repeating: 0, count: 65536)
        var headerEnd: Range<Data.Index>?
        let sep = Data("\r\n\r\n".utf8)
        while headerEnd == nil {
            let n = recv(c, &chunk, chunk.count, 0)
            if n <= 0 { return nil }
            buf.append(chunk, count: n)
            headerEnd = buf.range(of: sep)
            if buf.count > 1_000_000 { return nil }
        }
        guard let he = headerEnd,
              let head = String(data: buf[buf.startIndex..<he.lowerBound], encoding: .utf8) else { return nil }
        var lines = head.components(separatedBy: "\r\n")
        let first = lines.removeFirst().split(separator: " ")
        guard first.count >= 2 else { return nil }
        var headers: [String: String] = [:]
        for l in lines {
            guard let i = l.firstIndex(of: ":") else { continue }
            headers[l[..<i].trimmingCharacters(in: .whitespaces).lowercased()] =
                l[l.index(after: i)...].trimmingCharacters(in: .whitespaces)
        }
        var body = Data(buf[he.upperBound...])
        let length = Int(headers["content-length"] ?? "0") ?? 0
        if length > 50_000_000 { return nil }
        while body.count < length {
            let n = recv(c, &chunk, chunk.count, 0)
            if n <= 0 { return nil }
            body.append(chunk, count: n)
        }
        let target = String(first[1])
        let comps = URLComponents(string: target)
        var query: [String: String] = [:]
        for item in comps?.queryItems ?? [] { query[item.name] = item.value ?? "" }
        return HTTPRequest(method: String(first[0]), path: comps?.percentEncodedPath.removingPercentEncoding ?? target,
                           query: query, headers: headers, body: body)
    }

    private func write(_ res: HTTPResponse, to c: Int32) {
        let reason: String
        switch res.status {
        case 200: reason = "OK"
        case 404: reason = "Not Found"
        case 403: reason = "Forbidden"
        case 400: reason = "Bad Request"
        default: reason = "Status"
        }
        var head = "HTTP/1.1 \(res.status) \(reason)\r\n"
        head += "Content-Type: \(res.contentType)\r\n"
        head += "Content-Length: \(res.body.count)\r\n"
        if res.headers["Cache-Control"] == nil { head += "Cache-Control: no-store\r\n" }
        head += "Connection: close\r\n"
        for (k, v) in res.headers { head += "\(k): \(v)\r\n" }
        head += "\r\n"
        var out = Data(head.utf8)
        out.append(res.body)
        out.withUnsafeBytes { raw in
            var sent = 0
            while sent < raw.count {
                let n = send(c, raw.baseAddress!.advanced(by: sent), raw.count - sent, 0)
                if n <= 0 { break }
                sent += n
            }
        }
    }
}
