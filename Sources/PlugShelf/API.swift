import AppKit
import Foundation

/// Everything the page can ask for. Static files from web/, JSON under /api/.
final class API {
    let user = UserStore()
    let scanner = Scanner()
    let thumbs = Thumbs()
    let racks = RackBuilder()
    let remote = RemoteAccess()
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
        if r.path.hasPrefix("/kontakt/art/") { return kontaktArt(r.path) }
        if !r.path.hasPrefix("/api/") { return file(r.path) }
        switch (r.method, r.path) {
        case ("GET", "/api/state"):
            return state()
        case ("GET", "/api/kontakt"):
            let libs = kontaktLibraries(refresh: r.query["refresh"] != nil)
            return .json(["libraries": libs.map(\.json), "presets": Kontakt.presets(libraries: libs)])
        case ("GET", "/api/kontakt/plan"):
            let libs = kontaktLibraries(refresh: true)
            let plan = KontaktBuilder.plan(libraries: libs, presets: Kontakt.presets(libraries: libs))
            return .json(["ok": true, "remaining": plan.count, "next": Array(plan.prefix(KontaktBuilder.blockSize)),
                          "setFile": KontaktBuilder.setFile.path, "skipped": KontaktBuilder.skipped()])
        case ("POST", "/api/kontakt/block"):
            let libs = kontaktLibraries(refresh: true)
            let next = Array(KontaktBuilder.plan(libraries: libs, presets: Kontakt.presets(libraries: libs)).prefix(KontaktBuilder.blockSize))
            guard !next.isEmpty else { return .json(["ok": true, "msg": "Every library has a preset", "tracks": []]) }
            var res = Ableton.send(["op": "kontakt_block", "tracks": next.map { $0["track"] as? String ?? "" }], timeout: 3)
            res["block"] = next
            return .json(res)
        case ("POST", "/api/kontakt/harvest"):
            let r = KontaktBuilder.harvest()
            lock.lock(); kontaktCache = nil; lock.unlock()
            return .json(r)
        case ("POST", "/api/kontakt/clear"):
            return .json(Ableton.send(["op": "kontakt_clear", "prefix": KontaktBuilder.trackPrefix], timeout: 3))
        case ("POST", "/api/kontakt/skip"):
            let b = r.json()
            guard let lib = b["library"] as? String, !lib.isEmpty else { return .error(400, "No library") }
            KontaktBuilder.skip(lib, reason: b["reason"] as? String ?? "skipped")
            return .json(["ok": true])
        case ("POST", "/api/kontakt/load"):
            let want = r.json()["id"] as? String ?? ""
            guard let p = Kontakt.presets(libraries: kontaktLibraries()).first(where: { $0["id"] as? String == want }) else { return .error(404, "Preset not found") }
            var res = Ableton.send(["op": "load_user", "folder": p["folder"] ?? "", "name": p["file"] ?? "", "instrument": true], timeout: 2)
            if res["ok"] as? Bool == true { res["msg"] = "\(p["name"] as? String ?? "Preset") → Live" }
            return .json(res)
        case ("GET", "/api/uapresets"):
            return .json(API.uaPresets)
        case ("GET", "/api/remote"):
            return .json(remote.status())
        case ("POST", "/api/remote"):
            let b = r.json()
            if let on = b["enabled"] as? Bool { remote.setEnabled(on, api: self) }
            if b["newCode"] as? Bool == true { remote.newCode() }
            if b["forget"] as? Bool == true { remote.forget() }
            return .json(remote.status())
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
        case ("GET", "/api/user"):
            return .data(user.data())
        case ("POST", "/api/remote/fav"):
            let b = r.json()
            guard let key = b["key"] as? String, !key.isEmpty, key.count < 200 else { return .error(400, "No plugin") }
            return .json(["ok": true, "favs": user.setFav(key, b["on"] as? Bool ?? true)])
        case ("POST", "/api/user"):
            user.replace(with: r.json())
            return .json(["ok": true])
        case ("POST", "/api/load"):
            return load(r.json())
        case ("GET", "/api/daw"):
            return .json(Ableton.send(["op": "ping"], timeout: 0.6))
        case ("POST", "/api/reveal"):
            let path = r.json()["path"] as? String ?? ""
            guard knownPath(path) else { return .error(400, "Unknown path") }
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
        case ("POST", "/api/rack/build"):
            let b = r.json()
            let slots = ((b["slots"] as? [[String: Any]]) ?? []).compactMap { s -> RackBuilder.Slot? in
                guard let f = s["family"] as? String, let role = s["role"] as? String else { return nil }
                var set: [String: (Double, String)] = [:]
                for (k, v) in (s["set"] as? [String: [Any]]) ?? [:] {
                    if let n = (v.first as? NSNumber)?.doubleValue { set[k] = (n, v.count > 1 ? (v[1] as? String ?? "") : "") }
                }
                return RackBuilder.Slot(family: f, role: role, label: s["label"] as? String ?? "", set: set,
                                        macros: (s["macros"] as? [String]) ?? [])
            }
            guard !slots.isEmpty else { return .error(400, "Empty chain") }
            lock.lock(); let lib = library; lock.unlock()
            let ok = racks.start(name: b["name"] as? String ?? "PlugShelf Rack", annotation: b["annotation"] as? String ?? "",
                                 slots: slots, returns: b["returns"] as? Bool ?? false, library: lib, load: b["load"] as? Bool ?? false)
            return .json(ok ? ["ok": true] as [String: Any] : ["ok": false, "msg": "A rack is already being built"])
        case ("GET", "/api/rack/build"):
            let p = racks.progress
            var out: [String: Any] = ["running": p.running, "done": p.done, "total": p.total, "current": p.current]
            if let res = racks.result { out["result"] = res }
            return .json(out)
        case ("POST", "/api/live"):
            // Developer helper: pass a command straight to the Live script (used for testing).
            return .json(Ableton.send(r.json(), timeout: 4))
        case ("POST", "/api/window"):
            let on = r.json()["onTop"] as? Bool ?? false
            DispatchQueue.main.async { self.onTop?(on) }
            return .json(["ok": true])
        default:
            return .error(404, "Unknown: \(r.path)")
        }
    }

    private func captureProgress() -> [String: Any] {
        let p = thumbs.progress
        return ["running": p.running, "done": p.done, "total": p.total, "ok": p.ok, "failed": p.failed, "current": p.current]
    }

    /// Queues pictures for the given families, each with the format it can best be opened in.
    private func startCapture(_ families: [String]) -> HTTPResponse {
        if thumbs.progress.running { return .json(["ok": false, "msg": "Pictures are already being taken"]) }
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
              let d = try? Data(contentsOf: Thumbs.dir.appendingPathComponent(name)) else { return .error(404, "No picture") }
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
        guard !ps.isEmpty else { return .error(400, "Plugin not found – please rescan") }
        if let aax = ps.first(where: { $0.format == "AAX" }) {
            return .json(["ok": false, "msg": "\(aax.display) is only installed as AAX – only Pro Tools loads that."])
        }
        let items: [[String: Any]] = ps.map { ["name": $0.liveName, "format": $0.format, "vendor": $0.vendor, "instrument": $0.kind == "inst"] }
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

    // MARK: Kontakt

    private var kontaktCache: (at: Date, libs: [Kontakt.Library])?
    func kontaktLibraries(refresh: Bool = false) -> [Kontakt.Library] {
        lock.lock(); let c = kontaktCache; lock.unlock()
        if !refresh, let c, Date().timeIntervalSince(c.at) < 300 { return c.libs }
        let libs = Kontakt.libraries()
        lock.lock(); kontaktCache = (Date(), libs); lock.unlock()
        return libs
    }

    private func kontaktArt(_ path: String) -> HTTPResponse {
        let id = String(path.dropFirst("/kontakt/art/".count).prefix { $0 != "." })
        guard let art = kontaktLibraries().first(where: { $0.id == id })?.art, let d = try? Data(contentsOf: URL(fileURLWithPath: art)) else { return .error(404, "No artwork") }
        var res = HTTPResponse.data(d, type: "image/png")
        res.headers["Cache-Control"] = "max-age=86400"
        return res
    }

    /// UA Console's channel-strip presets on this Mac (group = folder, plugins in insert order).
    /// Read from the user's own UA installation at runtime – nothing of UA's is copied into PlugShelf.
    static let uaPresets: [[String: Any]] = {
        let root = URL(fileURLWithPath: "/Library/Application Support/Universal Audio/Presets/Channel Strip")
        guard let en = FileManager.default.enumerator(at: root, includingPropertiesForKeys: nil) else { return [] }
        let re = try! NSRegularExpression(pattern: "<plugin_name>\\s*([^<]*?)\\s*</plugin_name>")
        var out: [[String: Any]] = []
        for case let u as URL in en where u.pathExtension == "uadchannel" {
            guard let s = try? String(contentsOf: u, encoding: .utf8) else { continue }
            let names = re.matches(in: s, range: NSRange(s.startIndex..., in: s)).compactMap { m in Range(m.range(at: 1), in: s).map { String(s[$0]) } }
            guard !names.isEmpty else { continue }
            let rel = u.path.dropFirst(root.path.count + 1).split(separator: "/")
            out.append(["group": rel.count > 1 ? String(rel[0]) : "Other", "name": u.deletingPathExtension().lastPathComponent, "plugins": names])
        }
        return out.sorted { ($0["group"] as! String, $0["name"] as! String) < ($1["group"] as! String, $1["name"] as! String) }
    }()

    /// The library for the iPad remote: names, makers, categories, formats and pictures – no file paths.
    func remoteState() -> HTTPResponse {
        lock.lock(); let lib = libraryData; lock.unlock()
        let keep: Set<String> = ["id", "family", "name", "display", "vendor", "kind", "category", "format", "archs", "status", "liveFailed", "source", "mtime", "shell"]
        var library: [String: Any] = [:]
        if let o = (try? JSONSerialization.jsonObject(with: lib)) as? [String: Any] {
            library["machine"] = o["machine"]
            library["plugins"] = ((o["plugins"] as? [[String: Any]]) ?? []).map { $0.filter { keep.contains($0.key) } }
        }
        var u: [String: Any] = [:]
        if let o = (try? JSONSerialization.jsonObject(with: user.data())) as? [String: Any] {
            for k in ["favs", "hidden", "collections", "lastUsed", "usage", "overrides"] { u[k] = o[k] }
            let st = o["settings"] as? [String: Any] ?? [:]
            u["settings"] = ["prefer": st["prefer"] ?? NSNull(), "showAAX": st["showAAX"] ?? false]
        }
        return .json(["library": library, "user": u, "pics": thumbs.index()])
    }

    func file(_ path: String) -> HTTPResponse {
        let rel = path == "/" ? "index.html" : String(path.dropFirst())
        let url = Paths.web.appendingPathComponent(rel).standardizedFileURL
        guard url.path.hasPrefix(Paths.web.standardizedFileURL.path + "/"),
              let d = try? Data(contentsOf: url) else { return .error(404, "Not found") }
        return .data(d, type: API.types[url.pathExtension.lowercased()] ?? "application/octet-stream")
    }
}
