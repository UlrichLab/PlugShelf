import AppKit
import Foundation

/// Everything the page can ask for. Static files from web/, JSON under /api/.
final class API {
    let user = UserStore()
    let scanner = Scanner()
    let thumbs = Thumbs()
    private let lock = NSLock()
    private var library: Library?
    private var libraryData = Data("null".utf8)
    var inApp = false
    var onTop: ((Bool) -> Void)?

    init() {
        if let d = try? Data(contentsOf: Paths.library), let lib = try? JSONDecoder().decode(Library.self, from: d) {
            library = lib
            libraryData = d
        }
    }

    var hasLibrary: Bool { lock.lock(); defer { lock.unlock() }; return library != nil }

    func startScan() {
        if scanner.progress.running { return }
        DispatchQueue.global(qos: .userInitiated).async { [self] in
            guard let lib = scanner.scan() else { return }
            let enc = JSONEncoder()
            guard let d = try? enc.encode(lib) else { return }
            writeAtomically(d, to: Paths.library)
            lock.lock(); library = lib; libraryData = d; lock.unlock()
        }
    }

    private func plugins(_ ids: [String]) -> [Plugin] {
        lock.lock(); defer { lock.unlock() }
        let byId = Dictionary((library?.plugins ?? []).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        return ids.compactMap { byId[$0] }
    }

    private func knownPath(_ path: String) -> Bool {
        lock.lock(); defer { lock.unlock() }
        return library?.plugins.contains { $0.path == path } ?? false
    }

    // MARK: routing

    func handle(_ r: HTTPRequest) -> HTTPResponse {
        if r.path.hasPrefix("/thumbs/") { return thumb(r.path) }
        if !r.path.hasPrefix("/api/") { return file(r.path) }
        switch (r.method, r.path) {
        case ("GET", "/api/state"):
            return state()
        case ("POST", "/api/scan"):
            startScan()
            return .json(["ok": true])
        case ("POST", "/api/scan/cancel"):
            scanner.cancel()
            return .json(["ok": true])
        case ("GET", "/api/scan"):
            let p = scanner.progress
            lock.lock(); let at = library?.scannedAt ?? 0; lock.unlock()
            return .json(["running": p.running, "phase": p.phase, "done": p.done, "total": p.total, "scannedAt": at])
        case ("POST", "/api/user"):
            user.replace(with: r.json())
            return .json(["ok": true])
        case ("POST", "/api/load"):
            return load(r.json())
        case ("GET", "/api/daw"):
            return .json(Ableton.send(["op": "ping"], timeout: 0.6))
        case ("POST", "/api/reveal"):
            let path = r.json()["path"] as? String ?? ""
            guard knownPath(path) else { return .error(400, "Unbekannter Pfad") }
            DispatchQueue.main.async {
                NSWorkspace.shared.activateFileViewerSelecting([URL(fileURLWithPath: path)])
            }
            return .json(["ok": true])
        case ("GET", "/api/ableton"):
            return .json(Ableton.scriptStatus())
        case ("POST", "/api/ableton/install"):
            return .json(Ableton.installScript())
        case ("GET", "/api/thumbs"):
            var out = thumbs.index()
            out["capture"] = captureProgress()
            return .json(out)
        case ("POST", "/api/capture"):
            return startCapture(r.json()["families"] as? [String] ?? [])
        case ("GET", "/api/capture"):
            return .json(captureProgress())
        case ("POST", "/api/capture/cancel"):
            thumbs.cancel()
            return .json(["ok": true])
        case ("POST", "/api/thumbs/delete"):
            for f in r.json()["families"] as? [String] ?? [] { thumbs.delete(f) }
            return .json(["ok": true])
        case ("GET", "/api/thumbs/rone"):
            lock.lock(); let lib = library; lock.unlock()
            return .json(["available": thumbs.roneAvailable(lib)])
        case ("POST", "/api/thumbs/rone"):
            lock.lock(); let lib = library; lock.unlock()
            let n = thumbs.importRone(lib)
            return .json(["ok": true, "imported": n])
        case ("POST", "/api/window"):
            let on = r.json()["onTop"] as? Bool ?? false
            DispatchQueue.main.async { self.onTop?(on) }
            return .json(["ok": true])
        default:
            return .error(404, "Unbekannt: \(r.path)")
        }
    }

    private func captureProgress() -> [String: Any] {
        let p = thumbs.progress
        return ["running": p.running, "done": p.done, "total": p.total, "ok": p.ok, "failed": p.failed, "current": p.current]
    }

    /// Queues pictures for the given families, each with the format it can best be opened in.
    private func startCapture(_ families: [String]) -> HTTPResponse {
        if thumbs.progress.running { return .json(["ok": false, "msg": "Es werden schon Bilder aufgenommen"]) }
        lock.lock()
        var byFamily: [String: [Plugin]] = [:]
        for p in library?.plugins ?? [] { byFamily[p.family, default: []].append(p) }
        lock.unlock()
        var jobs: [Thumbs.Job] = [], skipped: [String] = []
        for f in families {
            guard let items = byFamily[f], let p = Thumbs.hostable(items) else { skipped.append(f); continue }
            jobs.append(Thumbs.Job(family: f, plugin: p, label: p.display))
        }
        thumbs.start(jobs)
        return .json(["ok": true, "queued": jobs.count, "skipped": skipped])
    }

    private func thumb(_ path: String) -> HTTPResponse {
        let name = String(path.dropFirst("/thumbs/".count))
        guard name.range(of: #"^[0-9a-f]{16}\.png$"#, options: .regularExpression) != nil,
              let d = try? Data(contentsOf: Thumbs.dir.appendingPathComponent(name)) else { return .error(404, "Kein Bild") }
        var res = HTTPResponse.data(d, type: "image/png")
        res.headers["Cache-Control"] = "max-age=31536000"   // the URL carries a version
        return res
    }

    private func state() -> HTTPResponse {
        lock.lock(); let lib = libraryData; lock.unlock()
        let info: [String: Any] = [
            "app": "PlugShelf",
            "version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "dev",
            "inApp": inApp,
            "data": Paths.support.path,
            "machine": Scanner.machine,
        ]
        var out = Data("{\"library\":".utf8)
        out.append(lib)
        out.append(Data(",\"user\":".utf8))
        out.append(user.data())
        out.append(Data(",\"info\":".utf8))
        out.append((try? JSONSerialization.data(withJSONObject: info)) ?? Data("{}".utf8))
        out.append(Data(",\"pics\":".utf8))
        out.append((try? JSONSerialization.data(withJSONObject: thumbs.index())) ?? Data("{}".utf8))
        out.append(Data("}".utf8))
        return .data(out)
    }

    /// {"ids": [...]} loads one plugin, or a rack of several in order, onto Live's selected track.
    private func load(_ body: [String: Any]) -> HTTPResponse {
        let ids = (body["ids"] as? [String]) ?? [(body["id"] as? String) ?? ""]
        let ps = plugins(ids)
        guard !ps.isEmpty else { return .error(400, "Plugin nicht gefunden – bitte neu scannen") }
        if let aax = ps.first(where: { $0.format == "AAX" }) {
            return .json(["ok": false, "msg": "\(aax.display) gibt es hier nur als AAX – das lädt nur Pro Tools."])
        }
        let items: [[String: Any]] = ps.map { ["name": $0.liveName, "format": $0.format, "vendor": $0.vendor] }
        var reply = ps.count == 1
            ? Ableton.send(["op": "load"].merging(items[0]) { a, _ in a })
            : Ableton.send(["op": "rack", "items": items], timeout: 3.0)
        if reply["ok"] as? Bool == true {
            var usage: [String: Int] = [:], last: [String: Double] = [:]
            for f in Set(ps.map(\.family)) {
                let (n, t) = user.recordUse(f)
                usage[f] = n; last[f] = t
            }
            reply["usage"] = usage
            reply["lastUsed"] = last
        }
        return .json(reply)
    }

    // MARK: static files

    private static let types: [String: String] = [
        "html": "text/html; charset=utf-8", "css": "text/css; charset=utf-8", "js": "text/javascript; charset=utf-8",
        "svg": "image/svg+xml", "png": "image/png", "json": "application/json", "woff2": "font/woff2", "ico": "image/x-icon",
    ]

    private func file(_ path: String) -> HTTPResponse {
        let rel = path == "/" ? "index.html" : String(path.dropFirst())
        let url = Paths.web.appendingPathComponent(rel).standardizedFileURL
        guard url.path.hasPrefix(Paths.web.standardizedFileURL.path + "/"),
              let d = try? Data(contentsOf: url) else { return .error(404, "Nicht gefunden") }
        return .data(d, type: API.types[url.pathExtension.lowercased()] ?? "application/octet-stream")
    }
}
