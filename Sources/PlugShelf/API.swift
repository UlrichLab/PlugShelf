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
        if r.path.hasPrefix("/thumbs/") { return thumb(r.path, size: r.query["s"]) }
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
                          "setFile": KontaktBuilder.shown(KontaktBuilder.setFile), "skipped": KontaktBuilder.skipped()])
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
        case ("GET", "/api/versions"):
            var o = versionCheck.last()
            let pr = versionCheck.progress
            o["running"] = pr.running; o["done"] = pr.done; o["total"] = pr.total
            return .json(o)
        case ("POST", "/api/versions/scan"):
            lock.lock(); let plugins = library?.plugins ?? []; lock.unlock()
            var by: [String: (name: String, vendor: String, versions: [String])] = [:]
            for p in plugins where p.format != "AAX" && !p.version.isEmpty {
                var e = by[p.family] ?? (name: p.display.isEmpty ? p.name : p.display, vendor: p.vendor, versions: [])
                e.versions.append(p.version)
                by[p.family] = e
            }
            versionCheck.run(by.map { (key: $0.key, name: $0.value.name, vendor: $0.value.vendor, versions: $0.value.versions) })
            return .json(["ok": true])
        case ("GET", "/api/makers"):
            // each maker's updater app (when installed) or download page, for the plugin version list
            lock.lock(); let vendors = Set((library?.plugins ?? []).map { $0.vendor }.filter { !$0.isEmpty }); lock.unlock()
            return .json(Makers.links(vendors))
        case ("POST", "/api/makers/open"):
            let v = r.json()["vendor"] as? String ?? ""
            lock.lock(); let known = (library?.plugins ?? []).contains { $0.vendor == v }; lock.unlock()
            guard known else { return .error(404, "Unknown maker") }
            return .json(Makers.open(vendor: v, how: r.json()["how"] as? String ?? "app"))
        case ("GET", "/api/update"):
            return .json(updater.check(force: r.query["force"] == "1"))
        case ("POST", "/api/update/install"):
            updater.install()
            return .json(["ok": true])
        case ("GET", "/api/update/state"):
            let st = updater.state
            return .json(["phase": st.phase, "msg": st.msg])
        case ("GET", "/api/stock"):
            // Live's own devices, asked from the Live script and kept for when Live is closed
            let file = Paths.support.appendingPathComponent("stock.json")
            let res = Ableton.send(["op": "list_stock"], timeout: 2)
            if res["ok"] as? Bool == true, let devs = res["devices"] as? [[String: Any]], !devs.isEmpty,
               let d = try? JSONSerialization.data(withJSONObject: devs) {
                try? d.write(to: file, options: .atomic)
                return .json(["devices": devs, "live": true])
            }
            let cached = (try? Data(contentsOf: file)).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [[String: Any]] ?? []
            return .json(["devices": cached, "live": false])
        case ("GET", "/api/stock/shots"):
            let pr = stockShots.progress
            return .json(["running": pr.running, "done": pr.done, "total": pr.total, "ok": pr.ok, "failed": pr.failed, "current": pr.current, "last": pr.last, "permitted": StockShots.permitted])
        case ("POST", "/api/stock/shots"):
            let b = r.json()
            if b["cancel"] as? Bool == true { stockShots.cancel(); return .json(["ok": true]) }
            guard StockShots.permitted else {
                DispatchQueue.main.async { StockShots.askPermission() }
                return .json(["ok": false, "permission": true, "msg": "PlugShelf needs Screen Recording: allow it under System Settings → Privacy & Security → Screen Recording, then start again."])
            }
            let file = Paths.support.appendingPathComponent("stock.json")
            var devs = (try? Data(contentsOf: file)).flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [[String: Any]] ?? []
            if let only = b["names"] as? [String], !only.isEmpty { devs = devs.filter { only.contains($0["name"] as? String ?? "") } }
            guard !devs.isEmpty else { return .json(["ok": false, "msg": "No stock devices known yet – open Live first."]) }
            guard Ableton.send(["op": "ping"], timeout: 1)["ok"] as? Bool == true else { return .json(["ok": false, "offline": true, "msg": "Live is not connected"]) }
            stockShots.start(devs) { [weak self] fam, png in self?.thumbs.store(fam, png: png, source: "live") }
            return .json(["ok": true, "total": devs.count])
        case ("POST", "/api/stock/load"):
            let b = r.json()
            return .json(Ableton.send(["op": "load_stock", "name": b["name"] as? String ?? "", "kind": b["kind"] as? String ?? "fx"], timeout: 2))
        case ("GET", "/api/userracks"):
            return .json(API.userRacks())
        case ("GET", "/api/userracks/info"):
            let want = r.query["id"] ?? ""
            guard let x = API.userRacks().first(where: { $0["id"] as? String == want }), let rel = x["rel"] as? String,
                  let lib = Ableton.userLibrary() else { return .error(404, "Rack not found") }
            lock.lock(); let l = library; lock.unlock()
            return .json(RackInfo.info(lib.appendingPathComponent(rel), library: l))
        case ("POST", "/api/userracks/load"):
            let want = r.json()["id"] as? String ?? ""
            guard let x = API.userRacks().first(where: { $0["id"] as? String == want }) else { return .error(404, "Rack not found") }
            let kind = x["kind"] as? String ?? "fx"
            var res = Ableton.send(["op": "load_user", "folder": x["folder"] ?? "", "name": x["file"] ?? "", "instrument": kind == "inst" || kind == "drum"], timeout: 2)
            if res["ok"] as? Bool == true { res["msg"] = "\(x["name"] as? String ?? "Rack") → Live" }
            return .json(res)
        case ("POST", "/api/health/trash"):
            // only VST2/AU files whose plugin is installed as VST3 too, or AAX when Pro Tools is missing; Finder moves them to the Trash (it asks for the admin password itself)
            lock.lock(); let lib = library; lock.unlock()
            let plugins = lib?.plugins ?? []
            let vst3 = Set(plugins.filter { $0.format == "VST3" }.map { $0.family })
            let aax = lib?.proTools == true ? [] : plugins.filter { $0.format == "AAX" }.map { $0.path }
            // … plus files Live could not use, broken bundles and Intel-only files on Apple Silicon
            let unusable = plugins.filter { $0.liveFailed == true || $0.status != "ok" || (Scanner.machine == "arm64" && !$0.archs.isEmpty && !$0.archs.contains("arm64")) }.map { $0.path }
            // AU components whose every plugin is installed as VST3 too
            let auPaths = Set(plugins.filter { $0.format == "AU" }.map { $0.path })
            let au = auPaths.filter { path in plugins.filter { $0.path == path }.allSatisfy { vst3.contains($0.family) } }
            let allowed = Set(plugins.filter { $0.format == "VST" && vst3.contains($0.family) }.map { $0.path } + aax + unusable + au)
            let want = (r.json()["paths"] as? [String] ?? []).filter { allowed.contains($0) }
            guard !want.isEmpty else { return .error(400, "Nothing to move") }
            guard trashJob.running == false else { return .error(409, "Already running") }
            trashJob = (true, want.count, 0, nil)
            DispatchQueue.global().async { [self] in
                let list = want.map { "POSIX file \"" + $0.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"") + "\"" }.joined(separator: ", ")
                let p = Process()
                p.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
                p.arguments = ["-e", "tell application \"Finder\" to delete {\(list)}"]
                let err = Pipe(); p.standardError = err; p.standardOutput = Pipe()
                var msg: String? = nil
                do { try p.run(); p.waitUntilExit() } catch { msg = error.localizedDescription }
                if p.terminationStatus != 0 && msg == nil { msg = String(data: err.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) }
                let moved = want.filter { !FileManager.default.fileExists(atPath: $0) }.count
                trashJob = (false, want.count, moved, msg)
                if moved > 0 { startScan() }
            }
            return .json(["ok": true, "started": want.count])
        case ("GET", "/api/health/trash"):
            let j = trashJob
            var o: [String: Any] = ["running": j.running, "total": j.total, "moved": j.moved]
            if let m = j.error { o["error"] = m }
            return .json(o)
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
                                        macros: (s["macros"] as? [String]) ?? [], preset: s["preset"] as? String)
            }
            guard !slots.isEmpty else { return .error(400, "Empty chain") }
            lock.lock(); let lib = library; lock.unlock()
            let ok = racks.start(name: b["name"] as? String ?? "PlugShelf Rack", annotation: b["annotation"] as? String ?? "",
                                 slots: slots, returns: b["returns"] as? Bool ?? false, library: lib, load: b["load"] as? Bool ?? false,
                                 core: b["core"] as? String)
            return .json(ok ? ["ok": true] as [String: Any] : ["ok": false, "msg": "A rack is already being built"])
        case ("GET", "/api/presets"):
            // maker presets PlugShelf can load into a rack, for one plugin family
            let fam = r.query["family"] ?? ""
            lock.lock(); let lib = library; lock.unlock()
            let items = (lib?.plugins ?? []).filter { $0.family == fam }
            guard let first = items.first else { return .json(["presets": [Any]()]) }
            let names = Array(Set(items.flatMap { [$0.name, $0.display] }))
            let list = Presets.list(names: names, vendor: first.vendor)
            return .json(["presets": list.map { ["name": $0.name, "path": $0.path, "category": $0.category, "type": $0.type, "info": $0.info] }])
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

    /// /thumbs/<id>.jpg – the picture (max 1000 px); ?s=tile – a small JPEG for the grid; ?s=blur – a tiny JPEG for the blurred backdrop.
    /// Small versions are made once and kept next to the capture (thumbs/small/), so scrolling decodes far less.
    private func thumb(_ path: String, size: String? = nil) -> HTTPResponse {
        let name = String(path.dropFirst("/thumbs/".count))
        guard name.range(of: #"^[0-9a-f]{16}\.(png|jpg)$"#, options: .regularExpression) != nil else { return .error(404, "No picture") }
        // pictures are JPEGs now; an old PNG is used until it has been converted
        let base = String(name.prefix(16))
        var src = Thumbs.dir.appendingPathComponent(base + ".jpg")
        if !FileManager.default.fileExists(atPath: src.path) { src = Thumbs.dir.appendingPathComponent(base + ".png") }
        var res: HTTPResponse
        if let size, let px = ["tile": 520, "blur": 24][size], let d = Thumbs.small(src, maxPixels: px, tag: size) {
            res = HTTPResponse.data(d, type: "image/jpeg")
        } else {
            guard let d = try? Data(contentsOf: src) else { return .error(404, "No picture") }
            res = HTTPResponse.data(d, type: src.pathExtension == "png" ? "image/png" : "image/jpeg")
        }
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

    /// Racks saved in the User Library's standard rack folders (Presets › Instruments › Instrument Rack etc.).
    static func userRacks() -> [[String: Any]] {
        guard let lib = Ableton.userLibrary() else { return [] }
        let kinds: [(String, String)] = [("inst", "Presets/Instruments/Instrument Rack"), ("drum", "Presets/Instruments/Drum Rack"),
                                         ("fx", "Presets/Audio Effects/Audio Effect Rack"), ("midi", "Presets/MIDI Effects/MIDI Effect Rack")]
        var out: [[String: Any]] = []
        for (kind, sub) in kinds {
            let base = lib.appendingPathComponent(sub)
            guard let en = FileManager.default.enumerator(at: base, includingPropertiesForKeys: [.contentModificationDateKey]) else { continue }
            for case let u as URL in en where u.pathExtension.lowercased() == "adg" {
                let rel = String(u.path.dropFirst(lib.path.count + 1))
                let folder = u.deletingLastPathComponent().lastPathComponent
                let mtime = (try? u.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate?.timeIntervalSince1970) ?? 0
                out.append(["id": Classify.stableId(rel), "rel": rel, "name": u.deletingPathExtension().lastPathComponent, "kind": kind,
                            "folder": folder, "file": u.lastPathComponent, "sub": u.deletingLastPathComponent().path == base.path ? "" : folder,
                            "mtime": (mtime ?? 0) * 1000])
            }
        }
        return out.sorted { ($0["name"] as! String).localizedCaseInsensitiveCompare($1["name"] as! String) == .orderedAscending }
    }
    let stockShots = StockShots()
    let updater = Updater()
    let versionCheck = VersionCheck()
    private var trashJob: (running: Bool, total: Int, moved: Int, error: String?) = (false, 0, 0, nil)
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
            for k in ["favs", "hidden", "collections", "lastUsed", "usage", "overrides", "customCats"] { u[k] = o[k] }
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
