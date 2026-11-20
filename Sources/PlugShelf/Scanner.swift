import Foundation

/// One plugin as one format offers it. Several of these with the same `family`
/// are the same plugin in different formats (or its mono/stereo variants).
struct Plugin: Codable {
    var id: String
    var family: String = ""
    var name: String
    var display: String = ""     // name without "Stereo", "(VST3)" and the like
    var vendor: String
    var version: String
    var format: String           // VST3 | VST | AU | CLAP | AAX
    var path: String
    var kind: String             // inst | fx | midi
    var category: String
    var subcats: [String]
    var uid: String
    var bytes: Int64
    var mtime: Double            // ms since 1970, when the binary was last written
    var archs: [String]
    var status: String           // ok | broken
    var issue: String
    var shell: Bool
    var liveName: String         // the name Ableton's browser shows
    var bundleId: String
    var source: String           // plist | moduleinfo | live | guess
    var inLive: Bool?            // VST/VST3: Ableton has this file in its plugin database
    var liveFailed: Bool?        // Ableton scanned the file and found nothing it could use
}

struct Library: Codable {
    var version: Int = 1
    var scannedAt: Double
    var plugins: [Plugin]
    var proTools: Bool
    var liveDB: Bool
    var machine: String
    var roots: [String]
}

final class Scanner {
    struct Progress { var running = false; var phase = ""; var done = 0; var total = 0 }

    static let extFormat: [String: String] = ["vst3": "VST3", "vst": "VST", "component": "AU", "clap": "CLAP", "aaxplugin": "AAX"]

    private let lock = NSLock()
    private var _progress = Progress()
    private var _cancelled = false

    var progress: Progress { lock.lock(); defer { lock.unlock() }; return _progress }
    private var cancelled: Bool { lock.lock(); defer { lock.unlock() }; return _cancelled }
    func cancel() { lock.lock(); _cancelled = true; lock.unlock() }

    private func set(_ f: (inout Progress) -> Void) { lock.lock(); f(&_progress); lock.unlock() }

    static func roots() -> [String] {
        let home = NSHomeDirectory()
        var r: [String] = []
        for base in ["", home] {
            for sub in ["VST3", "VST", "Components", "CLAP"] { r.append(base + "/Library/Audio/Plug-Ins/" + sub) }
        }
        r.append("/Library/Application Support/Avid/Audio/Plug-Ins")
        return r.filter { FileManager.default.fileExists(atPath: $0) }
    }

    static let machine: String = {
        var v: Int32 = 0
        var size = MemoryLayout<Int32>.size
        if sysctlbyname("hw.optional.arm64", &v, &size, nil, 0) == 0, v == 1 { return "arm64" }
        return "x86_64"
    }()

    static func proToolsInstalled() -> Bool {
        let apps = (try? FileManager.default.contentsOfDirectory(atPath: "/Applications")) ?? []
        return apps.contains { $0.hasPrefix("Pro Tools") }
    }

    // MARK: scan

    /// Blocking. Call off the main thread.
    func scan() -> Library? {
        lock.lock()
        if _progress.running { lock.unlock(); return nil }
        _progress = Progress(running: true, phase: "Searching folders", done: 0, total: 0)
        _cancelled = false
        lock.unlock()
        defer { set { $0.running = false; $0.phase = "" } }

        let roots = Scanner.roots()
        var seen = Set<String>()
        var bundles: [URL] = []
        for r in roots {
            for u in findBundles(URL(fileURLWithPath: r)) {
                let real = u.resolvingSymlinksInPath().path
                if seen.insert(real).inserted { bundles.append(u) }
            }
        }
        if cancelled { return nil }

        set { $0.phase = "Reading Ableton’s database" }
        let live = LiveDB.load()

        set { $0.phase = "Reading plugins"; $0.total = bundles.count; $0.done = 0 }
        let sizeCache = SizeCache(loadSizeCache())
        var results = [[Plugin]](repeating: [], count: bundles.count)
        let resultLock = NSLock()

        DispatchQueue.concurrentPerform(iterations: bundles.count) { i in
            if self.cancelled { return }
            let b = self.facts(bundles[i], cache: sizeCache)
            let e = self.entries(for: b, live: live)
            resultLock.lock(); results[i] = e; resultLock.unlock()
            self.set { $0.done += 1 }
        }
        if cancelled { return nil }
        saveSizeCache(sizeCache.all)

        set { $0.phase = "Sorting" }
        var all = results.flatMap { $0 }
        Scanner.resolveFamilies(&all)
        all.sort { ($0.display.lowercased(), $0.format) < ($1.display.lowercased(), $1.format) }

        return Library(scannedAt: Date().timeIntervalSince1970 * 1000, plugins: all,
                       proTools: Scanner.proToolsInstalled(), liveDB: live != nil,
                       machine: Scanner.machine, roots: roots)
    }

    private func findBundles(_ root: URL) -> [URL] {
        var out: [URL] = []
        func walk(_ dir: URL, _ depth: Int) {
            guard depth < 6,
                  let items = try? FileManager.default.contentsOfDirectory(
                    at: dir, includingPropertiesForKeys: [.isDirectoryKey], options: [.skipsHiddenFiles]) else { return }
            for u in items {
                if Scanner.extFormat[u.pathExtension.lowercased()] != nil { out.append(u); continue }
                if (try? u.resourceValues(forKeys: [.isDirectoryKey]))?.isDirectory == true { walk(u, depth + 1) }
            }
        }
        walk(root, 0)
        return out
    }

    // MARK: bundle facts

    private struct Facts {
        var url: URL
        var format: String
        var plist: [String: Any] = [:]
        var archs: [String] = []
        var bytes: Int64 = 0
        var mtime: Double = 0
        var issue = ""
    }

    private func facts(_ url: URL, cache: SizeCache) -> Facts {
        var f = Facts(url: url, format: Scanner.extFormat[url.pathExtension.lowercased()] ?? "?")
        let fm = FileManager.default
        let contents = url.appendingPathComponent("Contents")
        if let d = try? Data(contentsOf: contents.appendingPathComponent("Info.plist")),
           let p = try? PropertyListSerialization.propertyList(from: d, format: nil) as? [String: Any] {
            f.plist = p
        }
        var exe: URL?
        let macos = contents.appendingPathComponent("MacOS")
        if let name = f.plist["CFBundleExecutable"] as? String, fm.fileExists(atPath: macos.appendingPathComponent(name).path) {
            exe = macos.appendingPathComponent(name)
        } else if let first = (try? fm.contentsOfDirectory(at: macos, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]))?.first {
            exe = first
        }
        var isDir: ObjCBool = false
        fm.fileExists(atPath: url.path, isDirectory: &isDir)
        if !isDir.boolValue {
            exe = url   // a single-file plugin
        }
        if let exe = exe {
            f.archs = Scanner.archs(of: exe)
            let m = (try? exe.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
            f.mtime = (m ?? .distantPast).timeIntervalSince1970 * 1000
            if f.archs.isEmpty { f.issue = "The binary is not a Mac program" }
        } else {
            f.issue = "Binary missing"
            let m = (try? url.resourceValues(forKeys: [.contentModificationDateKey]))?.contentModificationDate
            f.mtime = (m ?? .distantPast).timeIntervalSince1970 * 1000
        }
        if f.plist.isEmpty && isDir.boolValue && f.issue.isEmpty { f.issue = "Info.plist missing" }

        if let c = cache.get(url.path), c.count == 2, c[0] == f.mtime {
            f.bytes = Int64(c[1])
        } else {
            f.bytes = isDir.boolValue ? Scanner.allocatedSize(url) : Int64((try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize ?? 0)
            cache.set(url.path, [f.mtime, Double(f.bytes)])
        }
        return f
    }

    static func allocatedSize(_ url: URL) -> Int64 {
        let keys: [URLResourceKey] = [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .isRegularFileKey]
        guard let e = FileManager.default.enumerator(at: url, includingPropertiesForKeys: keys, options: [],
                                                     errorHandler: { _, _ in true }) else { return 0 }
        var total: Int64 = 0
        for case let f as URL in e {
            guard let v = try? f.resourceValues(forKeys: Set(keys)), v.isRegularFile == true else { continue }
            total += Int64(v.totalFileAllocatedSize ?? v.fileAllocatedSize ?? 0)
        }
        return total
    }

    /// CPU types in a Mach-O (thin or universal) file.
    static func archs(of exe: URL) -> [String] {
        guard let h = FileHandle(forReadingAtPath: exe.path) else { return [] }
        defer { try? h.close() }
        let b = [UInt8](h.readData(ofLength: 4096))
        guard b.count >= 8 else { return [] }
        func be(_ o: Int) -> UInt32 {
            guard o + 4 <= b.count else { return 0 }
            return UInt32(b[o]) << 24 | UInt32(b[o + 1]) << 16 | UInt32(b[o + 2]) << 8 | UInt32(b[o + 3])
        }
        func le(_ o: Int) -> UInt32 {
            guard o + 4 <= b.count else { return 0 }
            return UInt32(b[o + 3]) << 24 | UInt32(b[o + 2]) << 16 | UInt32(b[o + 1]) << 8 | UInt32(b[o])
        }
        func name(_ cpu: UInt32) -> String {
            switch cpu {
            case 0x0100_0007: return "x86_64"
            case 0x0100_000C: return "arm64"
            case 0x0200_000C: return "arm64_32"
            case 7: return "i386"
            case 18: return "ppc"
            case 0x0100_0012: return "ppc64"
            default: return String(format: "cpu%x", cpu)
            }
        }
        switch be(0) {
        case 0xCAFE_BABE, 0xCAFE_BABF:
            let n = Int(be(4)), stride = be(0) == 0xCAFE_BABE ? 20 : 32
            guard n > 0 && n < 16 else { return [] }
            return (0..<n).map { name(be(8 + $0 * stride)) }
        case 0xFEED_FACF, 0xFEED_FACE: return [name(be(4))]
        case 0xCFFA_EDFE, 0xCEFA_EDFE: return [name(le(4))]
        default: return []
        }
    }

    private func loadSizeCache() -> [String: [Double]] {
        guard let d = try? Data(contentsOf: Paths.sizes),
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: [Double]] else { return [:] }
        return o
    }

    private func saveSizeCache(_ c: [String: [Double]]) {
        if let d = try? JSONSerialization.data(withJSONObject: c) { writeAtomically(d, to: Paths.sizes) }
    }

    // MARK: plugins in a bundle

    private func entries(for f: Facts, live: [String: LiveModule]?) -> [Plugin] {
        let path = f.url.path
        let stem = Classify.cleanName(f.url.deletingPathExtension().lastPathComponent)
        let bundleVersion = (f.plist["CFBundleShortVersionString"] as? String) ?? (f.plist["CFBundleVersion"] as? String) ?? ""
        let bundleId = f.plist["CFBundleIdentifier"] as? String ?? ""
        let liveMod = live?[LiveDB.standard(path)]

        func make(name: String, vendor: String, version: String, kind: String, subcats: [String], tags: [String] = [],
                  uid: String, liveName: String, source: String) -> Plugin {
            let cat = Classify.category(subcats: subcats, tags: tags, name: name, kind: kind)
            return Plugin(id: Classify.stableId(f.format, path, uid, name), name: name, display: Classify.cleanName(name),
                          vendor: Classify.canonicalVendor(vendor), version: version.isEmpty ? bundleVersion : version,
                          format: f.format, path: path, kind: kind, category: cat, subcats: subcats + tags, uid: uid,
                          bytes: f.bytes, mtime: f.mtime, archs: f.archs, status: f.issue.isEmpty ? "ok" : "broken",
                          issue: f.issue, shell: false, liveName: liveName, bundleId: bundleId, source: source)
        }

        func fromLive(_ m: LiveModule) -> [Plugin] {
            m.entries.map { e in
                make(name: e.name, vendor: e.vendor, version: e.version, kind: e.kind, subcats: e.subcats,
                     uid: e.uid, liveName: e.name, source: "live")
            }
        }

        var out: [Plugin] = []
        switch f.format {
        case "AU":
            for c in (f.plist["AudioComponents"] as? [[String: Any]]) ?? [] {
                let full = (c["name"] as? String) ?? stem
                var vendor = "", name = full
                if let r = full.range(of: ": ") {
                    vendor = String(full[..<r.lowerBound])
                    name = String(full[r.upperBound...])
                }
                let type = c["type"] as? String ?? ""
                let kind = type == "aumu" ? "inst" : (type == "aumi" ? "midi" : "fx")
                let tags = (c["tags"] as? [String]) ?? []
                let uid = "\(type):\(c["subtype"] as? String ?? ""):\(c["manufacturer"] as? String ?? "")"
                let src = vendor.isEmpty ? "guess" : "plist"
                if vendor.isEmpty { vendor = Classify.guessVendor(plist: f.plist) }
                out.append(make(name: name, vendor: vendor, version: "", kind: kind, subcats: [], tags: tags,
                                uid: uid, liveName: name, source: src))
            }
        case "VST3":
            if let mi = moduleInfo(f.url) {
                for c in mi {
                    let kind = c.subcats.contains { $0.lowercased() == "instrument" } ? "inst" : "fx"
                    out.append(make(name: c.name, vendor: c.vendor, version: c.version, kind: kind, subcats: c.subcats,
                                    uid: c.cid, liveName: c.name, source: "moduleinfo"))
                }
            } else if let m = liveMod, !m.entries.isEmpty {
                out = fromLive(m)
            }
        case "VST":
            if let m = liveMod, !m.entries.isEmpty { out = fromLive(m) }
        default:
            break
        }

        if out.isEmpty {
            let name = stem
            let cat = Classify.categoryFromName(name) ?? "Other"
            let kind = Classify.guessKind(name: name, category: cat)
            out.append(make(name: name, vendor: Classify.guessVendor(plist: f.plist), version: "", kind: kind,
                            subcats: [], uid: bundleId, liveName: name, source: "guess"))
        }

        let shell = out.count > 3
        for i in out.indices {
            out[i].shell = shell
            if (f.format == "VST" || f.format == "VST3") && live != nil {
                out[i].inLive = liveMod != nil
                out[i].liveFailed = liveMod.map { $0.scanState != 1 && $0.entries.isEmpty } ?? false
            }
        }
        return out
    }

    private struct ModuleClass { var name: String; var vendor: String; var version: String; var cid: String; var subcats: [String] }

    /// VST3 bundles built with SDK 3.7+ describe themselves in moduleinfo.json (JSON5 with trailing commas).
    private func moduleInfo(_ url: URL) -> [ModuleClass]? {
        let file = url.appendingPathComponent("Contents/Resources/moduleinfo.json")
        guard let d = try? Data(contentsOf: file),
              let o = try? JSONSerialization.jsonObject(with: d, options: [.json5Allowed]) as? [String: Any] else { return nil }
        let factoryVendor = (o["Factory Info"] as? [String: Any])?["Vendor"] as? String ?? ""
        let classes = (o["Classes"] as? [[String: Any]] ?? []).filter { ($0["Category"] as? String) == "Audio Module Class" }
        let out: [ModuleClass] = classes.compactMap { c in
            guard let name = c["Name"] as? String, !name.isEmpty else { return nil }
            var subs: [String] = []
            if let a = c["Sub Categories"] as? [String] { subs = a }
            else if let s = c["Sub Categories"] as? String { subs = s.split(separator: "|").map(String.init) }
            let v = (c["Vendor"] as? String).flatMap { $0.isEmpty ? nil : $0 } ?? factoryVendor
            return ModuleClass(name: name, vendor: v, version: c["Version"] as? String ?? "", cid: c["CID"] as? String ?? "", subcats: subs)
        }
        return out.isEmpty ? nil : out
    }

    // MARK: families

    /// Gives every plugin a family key so its VST3, AU, VST, CLAP and AAX copies land on one card,
    /// and lets formats without metadata borrow maker, kind and category from the ones that have it.
    static func resolveFamilies(_ all: inout [Plugin]) {
        func strong(_ p: Plugin) -> Bool { p.source != "guess" && !p.vendor.isEmpty }

        var nameKeys = all.map { Classify.key($0.display.isEmpty ? $0.name : $0.display) }
        // nameKey -> vendorKey -> pretty vendor, from formats that know their maker
        var byName: [String: [String: String]] = [:]
        var vendorKeys = Set<String>()
        for (i, p) in all.enumerated() where strong(p) {
            let vk = Classify.key(p.vendor)
            byName[nameKeys[i], default: [:]][vk] = p.vendor
            vendorKeys.insert(vk)
        }
        let sortedVendorKeys = vendorKeys.filter { $0.count >= 2 }.sorted { $0.count > $1.count }

        for i in all.indices {
            var nk = nameKeys[i]
            var vk = Classify.key(all[i].vendor)
            // "FabFilter Pro-Q 3.aaxplugin" next to a VST3 called "Pro-Q 3" by FabFilter
            if byName[nk] == nil || !strong(all[i]) {
                for v in sortedVendorKeys where nk.hasPrefix(v) && nk.count > v.count {
                    let rest = String(nk.dropFirst(v.count))
                    if let known = byName[rest]?[v] {
                        nk = rest
                        vk = v
                        all[i].vendor = known
                        break
                    }
                }
            }
            if !strong(all[i]), let cands = byName[nk] {
                if cands.count == 1, let only = cands.first {
                    vk = only.key; all[i].vendor = only.value
                } else if let m = cands.first(where: { !vk.isEmpty && ($0.key.hasPrefix(vk) || vk.hasPrefix($0.key)) }) {
                    vk = m.key; all[i].vendor = m.value
                }
            }
            nameKeys[i] = nk
            all[i].family = (vk.isEmpty ? "?" : vk) + ":" + nk
        }

        // Borrow kind and category from the best-described member of each family.
        var best: [String: Plugin] = [:]
        let rank = ["moduleinfo": 0, "plist": 1, "live": 2, "guess": 3]
        for p in all {
            if let b = best[p.family], rank[b.source, default: 3] <= rank[p.source, default: 3] { continue }
            best[p.family] = p
        }
        // The category a family is filed under: its best member's, unless that says nothing.
        var familyCategory: [String: String] = [:]
        var counts: [String: [String: Int]] = [:]
        for p in all where p.category != "Other" { counts[p.family, default: [:]][p.category, default: 0] += 1 }
        for (f, b) in best {
            familyCategory[f] = b.category != "Other" ? b.category
                : (counts[f]?.max { $0.value < $1.value }?.key ?? "Other")
        }
        for i in all.indices {
            guard let b = best[all[i].family] else { continue }
            if !b.vendor.isEmpty { all[i].vendor = b.vendor }   // one spelling of the maker per card
            if all[i].source == "guess" && b.source != "guess" {
                all[i].kind = b.kind
                all[i].category = b.category
            }
            if let c = familyCategory[all[i].family], all[i].category == "Other" || all[i].source == "guess" {
                all[i].category = c
            }
        }
    }
}

/// Bundle sizes from the last scan, keyed by path and binary date, shared across scan threads.
final class SizeCache {
    private let lock = NSLock()
    private var map: [String: [Double]]
    init(_ m: [String: [Double]]) { map = m }
    func get(_ k: String) -> [Double]? { lock.lock(); defer { lock.unlock() }; return map[k] }
    func set(_ k: String, _ v: [Double]) { lock.lock(); map[k] = v; lock.unlock() }
    var all: [String: [Double]] { lock.lock(); defer { lock.unlock() }; return map }
}
