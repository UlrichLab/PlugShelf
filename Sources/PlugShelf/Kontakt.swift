import Foundation
import SQLite3

/// Native Instruments Kontakt: the installed libraries (from Kontakt's own database, read from a temp copy),
/// their NI artwork, and the Kontakt presets (.vstpreset) saved anywhere in Ableton's User Library.
/// A preset holds Kontakt with an instrument loaded, so Live can load the instrument directly.
enum Kontakt {
    struct Library {
        var id: String, name: String, path: String, category: String, instruments: Int, art: String?, vendor: String
        var json: [String: Any] {
            var o: [String: Any] = ["id": id, "name": name, "category": category, "instruments": instruments, "vendor": vendor, "online": FileManager.default.fileExists(atPath: path)]
            if art != nil { o["art"] = "kontakt/art/\(id).png" }
            return o
        }
    }

    /// Kontakt's VST3 class ids start with "VSTNiK" + "8kontakt 8" etc.; the header carries it as hex text.
    private static let classPrefix = "5653544E694B"

    private static func newestDatabase() -> URL? {
        let base = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Native Instruments")
        for v in ["Kontakt 8", "Kontakt 7"] {
            let u = base.appendingPathComponent(v).appendingPathComponent("komplete.db3")
            if FileManager.default.fileExists(atPath: u.path) { return u }
        }
        return nil
    }

    static func id(_ s: String) -> String { Classify.stableId(s) }

    /// NI artwork for a library: /Users/Shared/NI Resources/image/<lower-cased name>/MST_artwork.png
    private static func artwork(_ name: String) -> String? {
        let dir = "/Users/Shared/NI Resources/image/" + name.lowercased()
        for f in ["MST_artwork.png", "VB_artwork.png", "OSO_logo.png"] where FileManager.default.fileExists(atPath: dir + "/" + f) {
            return dir + "/" + f
        }
        return nil
    }

    /// Sound categories from NI's tags, folded into the groups the library view shows.
    static func group(_ c: String) -> String {
        let l = c.lowercased()
        if l.contains("bowed") || l.contains("string") && !l.contains("plucked") { return "Strings" }
        if l.contains("brass") { return "Brass" }
        if l.contains("reed") || l.contains("flute") { return "Woodwinds" }
        if l.contains("piano") || l.contains("keys") || l.contains("organ") { return "Piano & Keys" }
        if l.contains("drum") || l.contains("percussion") || l.contains("mallet") { return "Drums & Percussion" }
        if l.contains("synth") { return "Synths & Pads" }
        if l.contains("soundscape") || l.contains("sound effects") { return "Soundscapes & FX" }
        if l.contains("guitar") || l.contains("plucked") { return "Guitars & Plucked" }
        if l.contains("bass") { return "Bass" }
        if l.contains("vocal") { return "Vocals" }
        if l.contains("loop") { return "Loops" }
        return "Other"
    }

    /// For libraries NI did not tag: the group from words in the library's name.
    static func guess(_ name: String) -> String {
        let n = name.lowercased()
        let rules: [(String, [String])] = [
            ("Strings", ["string", "violin", "viola", "cello", "contrabass", "fiddle", "quartet", "orchestra", "symphon", "legato", "tina guo"]),
            ("Brass", ["trumpet", "trombone", "horn", "tuba", "brass"]),
            ("Woodwinds", ["flute", "clarinet", "oboe", "bassoon", "sax", "woodwind", "duduk", "ney", "pan pipe", "recorder", "whistle", "winds"]),
            ("Piano & Keys", ["piano", "keys", "rhodes", "wurli", "organ", "harpsichord", "celesta", "clavinet", "grand"]),
            ("Drums & Percussion", ["drum", "perc", "tabla", "taiko", "kit", "beat", "cajon", "djembe", "marimba", "vibraphone", "mallet", "bell", "gamelan", "timpani", "impact"]),
            ("Vocals", ["vocal", "choir", "voice", "voices", "sing", "chant"]),
            ("Guitars & Plucked", ["guitar", "harp", "oud", "sitar", "koto", "banjo", "ukulele", "mandolin", "lute", "bouzouki", "gyl", "kora", "plucked", "music box", "guzheng", "mbira", "kalimba", "cimbalom"]),
            ("Bass", ["bass"]),
            ("Synths & Pads", ["synth", "pad", "analog", "modular", "retro", "juno", "moog", "arp", "pulse", "wave"]),
            ("Soundscapes & FX", ["ambient", "texture", "atmos", "cinematic", "soundscape", "fx", "drone", "hybrid", "aura", "dark", "horror", "trailer", "tension"]),
            ("Loops", ["loop", "groove", "phrase"]),
        ]
        for (g, words) in rules where words.contains(where: { n.contains($0) }) { return g }
        return "Other"
    }


    /// The maker of a library: Kontakt's own tag, else words in the name, else the <Company> in the .nicnt file.
    static func vendor(db: String, name: String, path: String) -> String {
        if let v = clean(db) { return v }
        let n = (name + " " + (path as NSString).lastPathComponent).lowercased()
        let rules: [(String, [String])] = [
            ("Spitfire Audio", ["spitfire", "olafur", "hans zimmer", "hz01", "london contemporary", "albion", "andy findon", "andy_findon", "clarvis", "loegria", "enigma", "evo grid", "sable", "hearth and hollow", "inder goldfinger"]),
            ("Strezov Sampling", ["strezov"]), ("8Dio", ["8dio"]), ("Cinesamples", ["cinesamples", "cineperc", "cinewinds", "cinestrings", "cinepiano", "voxos"]),
            ("Native Instruments", ["scarbee", "session ", "abbey road", "berlin concert grand", "new york concert grand", "upright piano", "vintage organs", "world impact"]),
            ("ARIA Sounds", ["aria sounds"]), ("Performance Samples", ["performance samples"]), ("Heavyocity", ["heavyocity"]),
            ("Sonica Instruments", ["sonica"]), ("Slate + Ash", ["slate and ash", "slate + ash"]), ("Zero-G", ["ethera"]), ("Impact Soundworks", ["impact soundworks"]),
        ]
        for (v, words) in rules where words.contains(where: { n.contains($0) }) { return v }
        if let f = try? FileManager.default.contentsOfDirectory(atPath: path).first(where: { $0.lowercased().hasSuffix(".nicnt") }),
           let h = FileHandle(forReadingAtPath: path + "/" + f) {
            let d = h.readData(ofLength: 65536); try? h.close()
            if let t = String(data: d, encoding: .isoLatin1), let r = t.range(of: #"<Company>([^<]*)</Company>"#, options: .regularExpression) {
                let c = String(t[r]).replacingOccurrences(of: "<Company>", with: "").replacingOccurrences(of: "</Company>", with: "")
                if let v = clean(c) { return v }
            }
        }
        return "Other"
    }

    /// One spelling per maker; placeholders ("Kontakt", "MyCompany") count as unknown.
    private static func clean(_ raw: String) -> String? {
        let v = raw.trimmingCharacters(in: .whitespaces)
        let l = v.lowercased()
        if l.isEmpty || l == "kontakt" || l == "mycompany" || l == "unknown" { return nil }
        if l.hasPrefix("native instruments") { return "Native Instruments" }
        if l.contains("spitfire") { return "Spitfire Audio" }
        if l.hasPrefix("heavyocity") { return "Heavyocity" }
        if l.hasPrefix("strezov") { return "Strezov Sampling" }
        if l.hasPrefix("slate") && l.contains("ash") { return "Slate + Ash" }
        if l.hasPrefix("cinematic samples") || l == "cinesamples" { return "Cinesamples" }
        return v == l ? v.capitalized : v
    }

    static func key(_ s: String) -> String { s.lowercased().filter { $0.isLetter || $0.isNumber } }

    static func libraries() -> [Library] {
        guard let src = newestDatabase() else { return [] }
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-kontakt-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmp) }
        let copy = tmp.appendingPathComponent("k.db3")
        guard (try? FileManager.default.copyItem(at: src, to: copy)) != nil else { return [] }
        for ext in ["-wal", "-shm"] where FileManager.default.fileExists(atPath: src.path + ext) {
            try? FileManager.default.copyItem(atPath: src.path + ext, toPath: copy.path + ext)
        }
        var db: OpaquePointer?
        guard sqlite3_open_v2(copy.path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_close(db) }
        let sql = """
        SELECT p.alias, p.path,
          (SELECT c.category FROM k_sound_info s JOIN k_sound_info_category sc ON sc.sound_info_id = s.id
             JOIN k_category c ON c.id = sc.category_id WHERE s.content_path_id = p.id
             GROUP BY c.category ORDER BY COUNT(*) DESC LIMIT 1),
          (SELECT COUNT(*) FROM k_sound_info s WHERE s.content_path_id = p.id AND s.file_ext IN ('nki','nkm','nksn')),
          (SELECT s.vendor FROM k_sound_info s WHERE s.content_path_id = p.id AND s.vendor <> '' GROUP BY s.vendor ORDER BY COUNT(*) DESC LIMIT 1)
        FROM k_content_path p WHERE p.content_type = 2 AND p.visible
        """
        var st: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return [] }
        defer { sqlite3_finalize(st) }
        var out: [Library] = []
        func text(_ i: Int32) -> String { sqlite3_column_text(st, i).map { String(cString: $0) } ?? "" }
        while sqlite3_step(st) == SQLITE_ROW {
            let name = text(0).replacingOccurrences(of: "_", with: " ")
            let path = text(1)
            var cat = group(text(2))
            if cat == "Other" { cat = guess(name) }
            out.append(Library(id: id(path), name: name.trimmingCharacters(in: .whitespaces), path: path, category: cat, instruments: Int(sqlite3_column_int(st, 3)), art: artwork(text(0)), vendor: vendor(db: text(4), name: name, path: path)))
        }
        return out.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
    }

    /// Kontakt presets anywhere in the User Library (.vstpreset whose header names a Kontakt class),
    /// plus Instrument Racks (.adg) saved in any folder named "Kontakt Presets".
    static func presets(libraries: [Library]) -> [[String: Any]] {
        guard let lib = Ableton.userLibrary(),
              let en = FileManager.default.enumerator(at: lib, includingPropertiesForKeys: [.fileSizeKey, .contentModificationDateKey]) else { return [] }
        var out: [[String: Any]] = []
        for case let u as URL in en {
            let ext = u.pathExtension.lowercased()
            if ext == "adg" {
                // Instrument Racks count when they sit in a folder called "Kontakt Presets"
                // (e.g. Presets › Instruments › Instrument Rack › Kontakt Presets)
                let rel = u.path.dropFirst(lib.path.count).lowercased()
                guard rel.contains("/kontakt presets/") else { continue }
            } else if ext == "vstpreset" {
                guard let h = try? FileHandle(forReadingFrom: u) else { continue }
                let head = h.readData(ofLength: 40); try? h.close()
                guard head.count >= 40, String(data: head.subdata(in: 8..<40), encoding: .ascii)?.hasPrefix(classPrefix) == true else { continue }
            } else { continue }
            let name = u.deletingPathExtension().lastPathComponent
            let rel = String(u.path.dropFirst(lib.path.count + 1))
            // "Library - Instrument": match the library for its artwork and category
            let libName = name.components(separatedBy: " - ").first ?? name
            // exact, then one name containing the other ("8dio Legion Series 66 …" ↔ "Legion Series 66 …")
            let lk = key(libName)
            let match = libraries.first { key($0.name) == lk }
                ?? libraries.filter { let k = key($0.name); return k.count >= 4 && (k.contains(lk) || lk.contains(k)) }.max { key($0.name).count < key($1.name).count }
            let rv = try? u.resourceValues(forKeys: [.fileSizeKey, .contentModificationDateKey])
            var o: [String: Any] = ["id": id(rel), "name": name, "file": u.lastPathComponent, "folder": u.deletingLastPathComponent().lastPathComponent,
                                    "library": match?.name ?? libName, "vendor": match?.vendor ?? "Other", "category": match?.category ?? guess(name),
                                    "kind": ext == "adg" ? "rack" : "preset", "bytes": rv?.fileSize ?? 0, "mtime": (rv?.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000]
            if match?.art != nil { o["art"] = "kontakt/art/\(match!.id).png" }
            out.append(o)
        }
        return out.sorted { ($0["name"] as! String).localizedCaseInsensitiveCompare($1["name"] as! String) == .orderedAscending }
    }
}
