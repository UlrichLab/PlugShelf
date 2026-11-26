import ImageIO
import Foundation

/// Pictures of plugin editors: where they live, how they are taken (one helper process per
/// plugin, see Capture.swift) and the one-time import of pictures RONE VST MANAGER already took.
final class Thumbs {
    struct Progress { var running = false; var done = 0; var total = 0; var ok = 0; var failed = 0; var current = "" }

    static let dir: URL = {
        let u = Paths.support.appendingPathComponent("thumbs", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()
    private static var statusFile: URL { Paths.support.appendingPathComponent("shots.json") }

    private let lock = NSLock()
    /// family -> {"ok": Bool, "v": version, "src": "capture"|"rone", "msg": String, "at": ms}
    private var shots: [String: [String: Any]] = [:]
    private var _progress = Progress()
    private var cancelled = false
    private var current: Process?

    init() {
        if let d = try? Data(contentsOf: Thumbs.statusFile),
           let o = try? JSONSerialization.jsonObject(with: d) as? [String: [String: Any]] {
            shots = o
        }
        // Forget pictures whose file has gone.
        for (f, s) in shots where s["ok"] as? Bool == true && !FileManager.default.fileExists(atPath: Thumbs.file(f).path)
            && !FileManager.default.fileExists(atPath: Thumbs.legacyFile(f).path) {
            shots[f] = nil
        }
    }

    /// Pictures are JPEGs of at most 1000 px (the largest view, the enlarged tile, shows about 980 px on Retina).
    static func file(_ family: String) -> URL { dir.appendingPathComponent(Classify.stableId(family) + ".jpg") }
    static func legacyFile(_ family: String) -> URL { dir.appendingPathComponent(Classify.stableId(family) + ".png") }
    static let maxPixels = 1000, quality = 0.88

    /// Writes any image (PNG capture, RONE picture …) as the compact JPEG.
    @discardableResult
    static func compact(_ source: CGImageSource, to dst: URL) -> Bool {
        guard let img = CGImageSourceCreateThumbnailAtIndex(source, 0, [
            kCGImageSourceCreateThumbnailFromImageAlways: true,
            kCGImageSourceCreateThumbnailWithTransform: true,
            kCGImageSourceThumbnailMaxPixelSize: maxPixels] as CFDictionary) else { return false }
        let data = NSMutableData()
        guard let d = CGImageDestinationCreateWithData(data, "public.jpeg" as CFString, 1, nil) else { return false }
        CGImageDestinationAddImage(d, img, [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary)
        guard CGImageDestinationFinalize(d) else { return false }
        return (try? (data as Data).write(to: dst, options: .atomic)) != nil
    }
    @discardableResult
    static func compact(_ src: URL, to dst: URL) -> Bool {
        guard let s = CGImageSourceCreateWithURL(src as CFURL, nil) else { return false }
        return compact(s, to: dst)
    }

    /// One-time: turns the old full-size PNG pictures into compact JPEGs; the PNGs go to the Trash.
    static func migrate() {
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        for f in files where f.pathExtension == "png" && f.lastPathComponent.range(of: #"^[0-9a-f]{16}\.png$"#, options: .regularExpression) != nil {
            autoreleasepool {
                let jpg = f.deletingPathExtension().appendingPathExtension("jpg")
                if FileManager.default.fileExists(atPath: jpg.path) || compact(f, to: jpg) {
                    try? FileManager.default.trashItem(at: f, resultingItemURL: nil)
                }
            }
        }
    }

    var progress: Progress { lock.lock(); defer { lock.unlock() }; return _progress }

    /// {"thumbs": {family: url}, "failed": {family: reason}}
    func index() -> [String: Any] {
        lock.lock(); defer { lock.unlock() }
        var thumbs: [String: String] = [:], failed: [String: String] = [:]
        for (f, s) in shots {
            if s["ok"] as? Bool == true {
                let v = (s["v"] as? Double).map { String(Int($0)) } ?? "0"
                thumbs[f] = "thumbs/\(Classify.stableId(f)).jpg?v=\(v)"
            } else {
                failed[f] = s["msg"] as? String ?? "no picture"
            }
        }
        return ["thumbs": thumbs, "failed": failed]
    }

    /// Keeps a picture taken elsewhere (e.g. of a Live device).
    func store(_ family: String, png: Data, source: String) {
        guard let src = CGImageSourceCreateWithData(png as CFData, nil), Thumbs.compact(src, to: Thumbs.file(family)) else { return }
        record(family, ["ok": true, "v": Date().timeIntervalSince1970 * 1000, "src": source, "at": Date().timeIntervalSince1970 * 1000])
    }

    private func record(_ family: String, _ entry: [String: Any]?) {
        lock.lock()
        shots[family] = entry
        let d = try? JSONSerialization.data(withJSONObject: shots)
        lock.unlock()
        if let d = d { writeAtomically(d, to: Thumbs.statusFile) }
    }

    func delete(_ family: String) {
        try? FileManager.default.removeItem(at: Thumbs.file(family))
        try? FileManager.default.removeItem(at: Thumbs.legacyFile(family))
        record(family, nil)
    }

    // MARK: taking pictures

    struct Job { var family: String; var plugin: Plugin; var label: String }

    /// The plugin to photograph for a family: VST3 first (best covered), then AU, then VST2;
    /// native before Intel-only. Shell VST2s and AAX cannot be hosted.
    static func hostable(_ items: [Plugin]) -> Plugin? {
        let rank = ["VST3": 0, "AU": 1, "VST": 2]
        let ok = items.filter { $0.status == "ok" && rank[$0.format] != nil && !($0.format == "VST" && $0.shell) }
        let native = { (p: Plugin) in p.archs.isEmpty || p.archs.contains("arm64") || Scanner.machine != "arm64" }
        let variant = { (p: Plugin) -> Int in
            let n = p.name.lowercased()
            return (n.contains("stereo") ? 0 : n.contains("mono") ? 2 : 1) * 1000 + p.name.count
        }
        return ok.min { a, b in
            (native(a) ? 0 : 1, rank[a.format]!, variant(a)) < (native(b) ? 0 : 1, rank[b.format]!, variant(b))
        }
    }

    func start(_ jobs: [Job]) {
        lock.lock()
        if _progress.running || jobs.isEmpty { lock.unlock(); return }
        _progress = Progress(running: true, done: 0, total: jobs.count)
        cancelled = false
        lock.unlock()
        DispatchQueue.global(qos: .utility).async { [self] in
            for job in jobs {
                lock.lock(); let stop = cancelled; _progress.current = job.label; lock.unlock()
                if stop { break }
                let (ok, msg) = capture(job)
                record(job.family, ok
                    ? ["ok": true, "v": Date().timeIntervalSince1970 * 1000, "src": "capture", "format": job.plugin.format]
                    : ["ok": false, "msg": msg, "at": Date().timeIntervalSince1970 * 1000, "format": job.plugin.format])
                lock.lock()
                _progress.done += 1
                if ok { _progress.ok += 1 } else { _progress.failed += 1 }
                lock.unlock()
            }
            lock.lock(); _progress.running = false; _progress.current = ""; current = nil; lock.unlock()
        }
    }

    func cancel() {
        lock.lock()
        cancelled = true
        let p = current
        lock.unlock()
        p?.terminate()
    }

    /// Runs one helper process, with a time limit. Returns (success, reason).
    private func capture(_ job: Job) -> (Bool, String) {
        let p = job.plugin
        let tmp = Thumbs.dir.appendingPathComponent("tmp-\(UUID().uuidString).png")
        defer { try? FileManager.default.removeItem(at: tmp) }

        let exe = Bundle.main.executablePath ?? CommandLine.arguments[0]
        let args = ["--capture", p.format, p.path, p.liveName, p.uid, tmp.path]
        let proc = Process()
        let intelOnly = Scanner.machine == "arm64" && !p.archs.isEmpty && !p.archs.contains("arm64") && p.archs.contains("x86_64")
        if intelOnly {
            proc.executableURL = URL(fileURLWithPath: "/usr/bin/arch")
            proc.arguments = ["-x86_64", exe] + args
        } else {
            proc.executableURL = URL(fileURLWithPath: exe)
            proc.arguments = args
        }
        let out = Pipe()
        proc.standardOutput = out
        proc.standardError = FileHandle.nullDevice
        var buffer = Data()
        let bufLock = NSLock()
        out.fileHandleForReading.readabilityHandler = { h in
            let d = h.availableData
            bufLock.lock(); if buffer.count < 1_000_000 { buffer.append(d) }; bufLock.unlock()
        }
        let done = DispatchSemaphore(value: 0)
        proc.terminationHandler = { _ in done.signal() }
        do { try proc.run() } catch { return (false, "The helper process does not start") }
        lock.lock(); current = proc; lock.unlock()

        var timedOut = false
        if done.wait(timeout: .now() + 35) == .timedOut {
            timedOut = true
            proc.terminate()
            if done.wait(timeout: .now() + 2) == .timedOut {
                kill(proc.processIdentifier, SIGKILL)
                _ = done.wait(timeout: .now() + 2)
            }
        }
        out.fileHandleForReading.readabilityHandler = nil
        bufLock.lock()
        buffer.append(out.fileHandleForReading.readDataToEndOfFile())
        let text = String(decoding: buffer, as: UTF8.self)
        bufLock.unlock()

        if text.contains("PLUGSHELF-OK"), FileManager.default.fileExists(atPath: tmp.path) {
            guard Thumbs.compact(tmp, to: Thumbs.file(job.family)) else { return (false, "Cannot save the picture") }
            try? FileManager.default.removeItem(at: Thumbs.legacyFile(job.family))
            return (true, "")
        }
        if let line = text.split(separator: "\n").last(where: { $0.hasPrefix("PLUGSHELF-ERR") }) {
            return (false, String(line.dropFirst("PLUGSHELF-ERR ".count)))
        }
        if timedOut { return (false, "Timed out – is the plugin waiting for activation?") }
        if intelOnly && proc.terminationStatus != 0 { return (false, "Intel only – Rosetta missing or the plugin crashed") }
        return (false, proc.terminationReason == .uncaughtSignal ? "The plugin crashed" : "The plugin quit")
    }

    // MARK: RONE VST MANAGER's pictures

    private static let roneDir = URL(fileURLWithPath: NSHomeDirectory())
        .appendingPathComponent("Library/Application Support/RONE/VstManager")

    /// RONE names each picture after juce::String::hashCode64() of its family key, in hex.
    private static func roneHash(_ s: String) -> String {
        var h: UInt64 = 0
        for u in s.unicodeScalars { h = h &* 101 &+ UInt64(u.value) }
        return String(h, radix: 16)
    }

    private static func pngWidth(_ url: URL) -> Int {
        guard let h = FileHandle(forReadingAtPath: url.path) else { return 0 }
        defer { try? h.close() }
        let b = [UInt8](h.readData(ofLength: 24))
        guard b.count == 24, b[1] == 0x50, b[2] == 0x4E, b[3] == 0x47 else { return 0 }
        return Int(b[16]) << 24 | Int(b[17]) << 16 | Int(b[18]) << 8 | Int(b[19])
    }

    /// RONE's own screenshots of this Mac's plugins, matched to PlugShelf families by file path.
    /// Only its 440-pixel-wide captures; pictures it fetched from elsewhere are left alone.
    private func roneCandidates(_ library: Library) -> [(String, URL)] {
        let fm = FileManager.default
        guard let d = try? Data(contentsOf: Thumbs.roneDir.appendingPathComponent("library.json")),
              let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
              let plugins = o["plugins"] as? [[String: Any]] else { return [] }
        var byPathName: [String: String] = [:], byPath: [String: [String]] = [:]
        for p in library.plugins {
            byPathName[p.path + "|" + Classify.key(p.name)] = p.family
            byPath[p.path, default: []].append(p.family)
        }
        var seen = Set<String>(), out: [(String, URL)] = []
        for rp in plugins {
            guard let fam = rp["family"] as? String, let file = rp["file"] as? String, let name = rp["name"] as? String else { continue }
            let pic = Thumbs.roneDir.appendingPathComponent("thumbs/\(Thumbs.roneHash(fam)).png")
            let mine = byPathName[file + "|" + Classify.key(name)]
                ?? (byPath[file].flatMap { Set($0).count == 1 ? $0.first : nil })
            guard let family = mine, !seen.contains(family), fm.fileExists(atPath: pic.path), Thumbs.pngWidth(pic) == 440 else { continue }
            seen.insert(family)
            out.append((family, pic))
        }
        return out
    }

    func roneAvailable(_ library: Library?) -> Int {
        guard let lib = library else { return 0 }
        lock.lock(); let have = shots.filter { $0.value["ok"] as? Bool == true }.map(\.key); lock.unlock()
        let haveSet = Set(have)
        return roneCandidates(lib).filter { !haveSet.contains($0.0) }.count
    }

    /// Copies RONE's pictures for families that have none yet. Returns how many.
    func importRone(_ library: Library?) -> Int {
        guard let lib = library else { return 0 }
        var n = 0
        for (family, pic) in roneCandidates(lib) {
            lock.lock(); let has = shots[family]?["ok"] as? Bool == true; lock.unlock()
            if has { continue }
            guard Thumbs.compact(pic, to: Thumbs.file(family)) else { continue }
            record(family, ["ok": true, "v": Date().timeIntervalSince1970 * 1000, "src": "rone"])
            n += 1
        }
        return n
    }

    /// A smaller JPEG of a capture (longest side `maxPixels`), cached in thumbs/small/ until the capture changes.
    static func small(_ src: URL, maxPixels: Int, tag: String) -> Data? {
        let dir = Thumbs.dir.appendingPathComponent("small", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let out = dir.appendingPathComponent(src.deletingPathExtension().lastPathComponent + "-" + tag + ".jpg")
        let fm = FileManager.default
        if let a = (try? fm.attributesOfItem(atPath: out.path))?[.modificationDate] as? Date,
           let b = (try? fm.attributesOfItem(atPath: src.path))?[.modificationDate] as? Date, a >= b,
           let d = try? Data(contentsOf: out) { return d }
        guard let source = CGImageSourceCreateWithURL(src as CFURL, nil),
              let img = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: maxPixels] as CFDictionary) else { return nil }
        let data = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(data, "public.jpeg" as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(dest, img, [kCGImageDestinationLossyCompressionQuality: tag == "blur" ? 0.6 : 0.84] as CFDictionary)
        guard CGImageDestinationFinalize(dest) else { return nil }
        try? (data as Data).write(to: out, options: .atomic)
        return data as Data
    }

    /// Makes the tile and blur versions of every capture that does not have them yet.
    static func warmSmall() {
        let files = (try? FileManager.default.contentsOfDirectory(at: Thumbs.dir, includingPropertiesForKeys: nil)) ?? []
        for f in files where f.pathExtension == "jpg" || f.pathExtension == "png" {
            autoreleasepool {
                _ = small(f, maxPixels: 520, tag: "tile")
                _ = small(f, maxPixels: 24, tag: "blur")
            }
        }
    }
}
