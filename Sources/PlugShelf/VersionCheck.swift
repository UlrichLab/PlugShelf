import Foundation

/// Online version check for makers that publish their current versions openly on their own websites
/// (and allow fetching them). Only the maker's public page is fetched; the plugin list never leaves the Mac.
/// Every other maker: the Setup list links to its updater app or website instead.
final class VersionCheck {
    struct Progress { var running = false; var done = 0; var total = 0 }
    private let lock = NSLock()
    private var _progress = Progress()
    var progress: Progress { lock.lock(); defer { lock.unlock() }; return _progress }
    private static var file: URL { Paths.support.appendingPathComponent("versions.json") }

    /// Makers this check can answer for.
    static let covered = ["FabFilter", "Soundtoys", "Sugar Bytes", "Xfer Records"]

    /// {"checkedAt": ms, "covered": [...], "results": {family: {"latest", "newer", "note"}}}
    func last() -> [String: Any] {
        if let d = try? Data(contentsOf: VersionCheck.file), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { return o }
        return ["covered": VersionCheck.covered, "results": [String: Any]()]
    }

    private static func fetch(_ s: String) -> String? {
        guard let url = URL(string: s) else { return nil }
        var req = URLRequest(url: url, timeoutInterval: 12)
        req.setValue("PlugShelf version check", forHTTPHeaderField: "User-Agent")
        let sem = DispatchSemaphore(value: 0)
        var out: String?
        URLSession.shared.dataTask(with: req) { d, r, _ in
            if (r as? HTTPURLResponse)?.statusCode == 200, let d { out = String(decoding: d, as: UTF8.self) }
            sem.signal()
        }.resume()
        _ = sem.wait(timeout: .now() + 14)
        return out
    }
    private static func first(_ s: String, _ pattern: String) -> String? {
        guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
              let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)), let r = Range(m.range(at: 1), in: s) else { return nil }
        return String(s[r])
    }

    /// "4.13" vs installed "4.12.0": compares as many parts as the published version has.
    static func isNewer(_ latest: String, than installed: String) -> Bool {
        let a = latest.split(separator: ".").map { Int($0) ?? 0 }
        let b = installed.split(separator: ".").map { Int($0.prefix { $0.isNumber }) ?? 0 }
        for i in 0..<a.count {
            let x = a[i], y = i < b.count ? b[i] : 0
            if x != y { return x > y }
        }
        return false
    }

    /// Makers write one version differently: "4.13" on the website, "4.1.3.0" in the VST3, "1,3,7,0" in another.
    /// A plugin counts as out of date only when no installed format is current – by part-wise numbers AND by digits.
    static func outdated(_ latest: String, installed: [String]) -> Bool {
        func clean(_ v: String) -> String {
            String(v.replacingOccurrences(of: ",", with: ".").prefix { $0.isNumber || $0 == "." })
        }
        func digits(_ v: String) -> String {
            var d = clean(v).filter(\.isNumber)
            while d.hasSuffix("0") && d.count > 1 { d.removeLast() }
            return d
        }
        let l = digits(latest)
        let current = installed.map(clean).filter { $0.contains(".") || $0.count > 1 }.contains { v in
            if !isNewer(latest, than: v) { return true }                       // 4.13 vs 4.13 or newer
            let d = digits(v)
            let n = max(d.count, l.count)
            let a = d.padding(toLength: n, withPad: "0", startingAt: 0), b = l.padding(toLength: n, withPad: "0", startingAt: 0)
            return a >= b                                                       // 4.1.3.0 vs 4.13
        }
        return !current
    }

    /// families: [(key, name, vendor, versions of all formats)]
    func run(_ families: [(key: String, name: String, vendor: String, versions: [String])]) {
        lock.lock()
        guard !_progress.running else { lock.unlock(); return }
        _progress = Progress(running: true, done: 0, total: VersionCheck.covered.count)
        lock.unlock()
        DispatchQueue.global(qos: .utility).async { [self] in
            var latest: [String: [String: String]] = [:]     // vendor -> product name (lower case) -> version
            func step() { lock.lock(); _progress.done += 1; lock.unlock() }

            // FabFilter: one download page lists every current product with its version
            if let h = VersionCheck.fetch("https://www.fabfilter.com/download"),
               let re = try? NSRegularExpression(pattern: #"<h2 class="h4">Download FabFilter ([^<]+)</h2>\s*<p>\s*[^<]*<br>\s*([0-9][0-9.]*)\s*&mdash;"#) {
                var m: [String: String] = [:]
                for x in re.matches(in: h, range: NSRange(h.startIndex..., in: h)) {
                    if let n = Range(x.range(at: 1), in: h), let v = Range(x.range(at: 2), in: h) { m[h[n].lowercased()] = String(h[v]) }
                }
                latest["FabFilter"] = m
            }
            step()
            // Soundtoys: all plugins share the Soundtoys 5 version
            if let h = VersionCheck.fetch("https://www.soundtoys.com/product/soundtoys-5/"),
               let v = VersionCheck.first(h, #"Version (5\.[0-9]+(?:\.[0-9]+)*)"#) { latest["Soundtoys"] = ["*": v] }
            step()
            // Sugar Bytes: one page per product
            var sb: [String: String] = [:]
            for (name, slug) in [("turnado", "turnado"), ("effectrix2", "effectrix2"), ("graindad", "graindad"), ("drumcomputer", "drumcomputer")] {
                if let h = VersionCheck.fetch("https://sugar-bytes.de/\(slug)"), let v = VersionCheck.first(h, #"Version ([0-9]+\.[0-9]+(?:\.[0-9]+)*)"#) { sb[name] = v }
            }
            latest["Sugar Bytes"] = sb
            step()
            // Xfer: OTT on the freeware page ("OTT_137.dmg" = 1.37)
            if let h = VersionCheck.fetch("https://xferrecords.com/freeware"), let d = VersionCheck.first(h, #"OTT_([0-9])([0-9]+)\.dmg"#),
               let m = VersionCheck.first(h, #"OTT_[0-9]([0-9]+)\.dmg"#) { latest["Xfer Records"] = ["ott": "\(d).\(m)"] }
            step()

            var results: [String: Any] = [:]
            for f in families {
                guard let table = latest[f.vendor], !table.isEmpty else { continue }
                let name = f.name.lowercased().replacingOccurrences(of: "fabfilter ", with: "")
                var entry: [String: Any]? = nil
                if let v = table["*"] {
                    entry = ["latest": v, "newer": VersionCheck.outdated(v, installed: f.versions)]
                } else if let v = table[name] {
                    entry = ["latest": v, "newer": VersionCheck.outdated(v, installed: f.versions)]
                } else if f.vendor == "FabFilter" {
                    // an older major version (Pro-Q 3 while Pro-Q 4 is current)
                    let base = name.replacingOccurrences(of: #"\s*\d+$"#, with: "", options: .regularExpression)
                    if let (prod, v) = table.first(where: { $0.key.replacingOccurrences(of: #"\s*\d+$"#, with: "", options: .regularExpression) == base && $0.key != name }) {
                        entry = ["latest": v, "newer": true, "note": "FabFilter \(prod.capitalized(with: nil)) is the current version"]
                    }
                }
                if let e = entry { results[f.key] = e }
            }
            let out: [String: Any] = ["checkedAt": Date().timeIntervalSince1970 * 1000, "covered": VersionCheck.covered, "results": results]
            if let d = try? JSONSerialization.data(withJSONObject: out) { try? d.write(to: VersionCheck.file, options: .atomic) }
            lock.lock(); _progress.running = false; lock.unlock()
        }
    }
}
