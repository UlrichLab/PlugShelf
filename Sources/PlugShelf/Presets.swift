import Foundation

/// Lists the maker presets of a plugin that PlugShelf can load into a rack (see PresetState):
/// Arturia, Synapse Audio (The Legend), Eventide, Soundtoys and every plugin with .vstpreset files.
/// Nothing is read beyond file names and, for Arturia, the preset's own header (type, sub-type, comment).
enum Presets {
    struct Preset { var name: String; var path: String; var category: String; var type: String; var info: String }

    private static let home = FileManager.default.homeDirectoryForCurrentUser.path
    private static var cache: [String: [Preset]] = [:]
    private static let lock = NSLock()

    static func norm(_ s: String) -> String { s.lowercased().filter { $0.isLetter || $0.isNumber } }

    /// names: the plugin's display names (all formats); vendor: its maker.
    static func list(names: [String], vendor: String) -> [Preset] {
        let key = vendor + "|" + names.sorted().joined(separator: "|")
        lock.lock(); if let c = cache[key] { lock.unlock(); return c }; lock.unlock()
        // "The Legend HZ" lives in a folder called "Legend HZ"
        let wanted = Set(names.flatMap { [norm($0), norm($0.replacingOccurrences(of: #"^(?i)the\s+"#, with: "", options: .regularExpression))] })
        var out: [Preset] = []
        func folder(in base: String) -> String? {
            guard let items = try? FileManager.default.contentsOfDirectory(atPath: base) else { return nil }
            return items.first { wanted.contains(norm($0)) }.map { base + "/" + $0 }
        }
        let v = vendor.lowercased()
        if v.contains("arturia"), let dir = folder(in: "/Library/Arturia/Presets") {
            out += walk(dir, skip: ["tutorials"]) { url in url.pathExtension.isEmpty || url.pathExtension.count > 6 }.compactMap { arturia($0, root: dir) }
        }
        if v.contains("synapse") {
            for base in ["/Library/Application Support/Synapse Audio", home + "/Music/Synapse Audio"] {
                if let dir = folder(in: base) {
                    out += walk(dir + "/Soundbanks") { $0.pathExtension.lowercased() == "fxp" }.map { simple($0) }
                }
            }
        }
        if v.contains("eventide"), let dir = folder(in: home + "/Music/Eventide") {
            // the "Alphabetically" folder repeats every preset in A–Z folders
            out += walk(dir + "/Presets", skip: ["21 - alphabetically", "13 - alphabetic", "alphabetic", "alphabetically"]) { $0.pathExtension.lowercased() == "tide" }.map { simple($0) }
        }
        if v.contains("soundtoys"), let dir = folder(in: "/Users/Shared/Soundtoys/Soundtoys 5") {
            out += walk(dir) { $0.pathExtension.lowercased() == "toy" && $0.lastPathComponent != "Default.toy" }.map { simple($0) }
        }
        // Kontakt: the library presets PlugShelf's Kontakt builder saved in the User Library (one per library)
        if wanted.contains(where: { $0.hasPrefix("kontakt") }), let lib = Ableton.userLibrary() {
            out += walk(lib.appendingPathComponent("Kontakt Presets").path) { $0.pathExtension.lowercased() == "vstpreset" }
                .map { u in Preset(name: u.deletingPathExtension().lastPathComponent, path: u.path, category: "Kontakt libraries", type: "Kontakt library", info: "") }
        }
        // .vstpreset: <Presets>/<maker>/<plugin>/… or <Presets>/<plugin>/…
        for base in [home + "/Library/Audio/Presets", "/Library/Audio/Presets"] {
            var dirs: [String] = []
            if let d = folder(in: base) { dirs.append(d) }
            for maker in (try? FileManager.default.contentsOfDirectory(atPath: base)) ?? [] {
                if let d = folder(in: base + "/" + maker) { dirs.append(d) }
            }
            for d in dirs { out += walk(d) { $0.pathExtension.lowercased() == "vstpreset" }.map { simple($0) } }
        }
        // the same preset can sit in two places (e.g. ~/Music and /Library): keep one per name and category
        var seen = Set<String>()
        out = out.filter { seen.insert($0.category + "/" + $0.name).inserted }.sorted { ($0.category, $0.name) < ($1.category, $1.name) }
        lock.lock(); cache[key] = out; lock.unlock()
        return out
    }

    private static func walk(_ dir: String, skip: [String] = [], _ ok: (URL) -> Bool) -> [URL] {
        guard let en = FileManager.default.enumerator(at: URL(fileURLWithPath: dir), includingPropertiesForKeys: [.isRegularFileKey],
                                                      options: [.skipsHiddenFiles]) else { return [] }
        var out: [URL] = []
        for case let u as URL in en {
            if skip.contains(u.lastPathComponent.lowercased()) { en.skipDescendants(); continue }
            if (try? u.resourceValues(forKeys: [.isRegularFileKey]).isRegularFile) == true, ok(u) { out.append(u) }
            if out.count > 6000 { break }
        }
        return out
    }

    /// Category: the folder the preset sits in, without numbering like "02 - ".
    private static func simple(_ u: URL) -> Preset {
        let cat = u.deletingLastPathComponent().lastPathComponent.replacingOccurrences(of: #"^\d+\s*(-\s*)?"#, with: "", options: .regularExpression)
        return Preset(name: u.deletingPathExtension().lastPathComponent, path: u.path, category: cat, type: cat, info: "")
    }

    /// Arturia presets start with a text header: name, bank, author, comment, then tags such as "Type 4 Keys".
    private static func arturia(_ u: URL, root: String) -> Preset? {
        guard let fh = try? FileHandle(forReadingFrom: u) else { return nil }
        defer { try? fh.close() }
        let head = String(decoding: fh.readData(ofLength: 3000), as: UTF8.self)
        guard head.hasPrefix("22 serialization::archive") else { return nil }
        func field(_ name: String) -> String {
            // "<len> <name> <len> <value>"
            guard let r = head.range(of: " \(name.count) \(name) ") else { return "" }
            let rest = head[r.upperBound...]
            guard let sp = rest.firstIndex(of: " "), let n = Int(rest[..<sp]) else { return "" }
            let start = rest.index(after: sp)
            guard let end = rest.index(start, offsetBy: n, limitedBy: rest.endIndex) else { return "" }
            return String(rest[start..<end])
        }
        let type = field("Type"), sub = field("Subtype")
        // the comment is the length-prefixed text right before a 10-digit time stamp
        var info = ""
        let ns = head as NSString
        if let ts = try? NSRegularExpression(pattern: #" \d{10} "#).firstMatch(in: head, range: NSRange(location: 0, length: ns.length)) {
            let before = ns.substring(to: ts.range.location)
            let b = before as NSString
            for m in (try? NSRegularExpression(pattern: #" (\d+) "#).matches(in: before, range: NSRange(location: 0, length: b.length))) ?? [] {
                let n = Int(b.substring(with: m.range(at: 1))) ?? -1
                let start = m.range.location + m.range.length
                if n > 10, b.length - start == n { info = b.substring(from: start); break }
            }
        }
        let bank = u.path.replacingOccurrences(of: root + "/", with: "").components(separatedBy: "/").dropLast().last ?? ""
        return Preset(name: u.lastPathComponent, path: u.path, category: type.isEmpty ? bank : type,
                      type: [type, sub].filter { !$0.isEmpty }.joined(separator: " · "), info: info)
    }
}
