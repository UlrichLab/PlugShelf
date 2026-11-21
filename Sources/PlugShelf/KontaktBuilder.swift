import Foundation
import SQLite3

/// Kontakt preset builder: makes many Kontakt presets in blocks.
///
/// 1. `plan`: one main instrument per library without a preset (from Kontakt's database), in blocks of 15.
/// 2. The Live script puts a block onto MIDI tracks named "KP · <Library> - <Instrument>", each with Kontakt.
/// 3. Someone loads the listed instrument into each Kontakt and saves the set (Cmd+S) as
///    `~/Music/Ableton/Kontakt Preset Builder/Kontakt Preset Builder.als`.
/// 4. `harvest`: reads every "KP · …" track's Kontakt state from that set and writes it as a .vstpreset to
///    User Library › Kontakt Presets – the same file Live writes when you save a plugin preset.
enum KontaktBuilder {
    static let trackPrefix = "KP · "
    static let blockSize = 15
    static var setFile: URL {
        FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Music/Ableton/Kontakt Preset Builder/Kontakt Preset Builder.als")
    }
    /// A path as "~/…" for showing on screen, so no user name appears.
    static func shown(_ u: URL) -> String {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return u.path.hasPrefix(home + "/") ? "~" + u.path.dropFirst(home.count) : u.path
    }
    private static let stateFile = Paths.support.appendingPathComponent("kontakt-builder.json")
    private static let infoXML = "<?xml version='1.0' encoding='utf-8'?>\n<MetaInfo><Attribute id='MediaType' value='VstPreset' type='string' flags='writeProtected'></Attribute><Attribute id='PlugInCategory' value='Instrument' type='string' flags='writeProtected'></Attribute><Attribute id='plugtype' value='Instrument' type='string' flags='writeProtected'></Attribute><Attribute id='PlugInName' value='Kontakt 8' type='string' flags='writeProtected'></Attribute><Attribute id='plugname' value='Kontakt 8' type='string' flags='writeProtected'></Attribute><Attribute id='PlugInVendor' value='Native Instruments' type='string' flags='writeProtected'></Attribute></MetaInfo>"
    private static let kontakt8ClassId = "5653544E694B386B6F6E74616B742038"

    // MARK: progress (skipped libraries are remembered so they are not offered again)

    static func skipped() -> [String: String] {
        guard let d = try? Data(contentsOf: stateFile), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return [:] }
        return o["skipped"] as? [String: String] ?? [:]
    }
    static func skip(_ library: String, reason: String) {
        var s = skipped(); s[library] = reason
        if let d = try? JSONSerialization.data(withJSONObject: ["skipped": s], options: [.prettyPrinted]) { try? d.write(to: stateFile, options: .atomic) }
    }

    /// File-name-safe "Library - Instrument".
    static func presetName(_ library: String, _ instrument: String) -> String {
        let bad = CharacterSet(charactersIn: "/:\\?%*|\"<>")
        let clean = { (s: String) in s.components(separatedBy: bad).joined(separator: "-").trimmingCharacters(in: .whitespaces) }
        let i = clean(instrument), l = clean(library)
        return i.lowercased() == l.lowercased() || i.isEmpty ? l : "\(l) - \(i)"
    }

    // MARK: 1. the plan

    /// Libraries (online, not yet with a preset, not skipped) with their main instrument file.
    static func plan(libraries: [Kontakt.Library], presets: [[String: Any]]) -> [[String: Any]] {
        let have = Set(presets.compactMap { $0["library"] as? String })
        let skip = skipped()
        guard let rows = instrumentRows() else { return [] }
        var out: [[String: Any]] = []
        for lib in libraries where lib.instruments > 0 && FileManager.default.fileExists(atPath: lib.path) && !have.contains(lib.name) && skip[lib.name] == nil {
            guard let files = rows[lib.path], let main = mainInstrument(files) else { continue }
            out.append(["library": lib.name, "instrument": main.name, "path": main.path,
                        "preset": presetName(lib.name, main.name), "track": trackPrefix + presetName(lib.name, main.name)])
        }
        return out
    }

    /// The instrument a player most likely wants first: names like Main/Full/Ensemble/Articulations win,
    /// single articulations and FX lose; then the shortest name.
    static func mainInstrument(_ files: [(name: String, path: String)]) -> (name: String, path: String)? {
        func score(_ n: String) -> Int {
            let l = n.lowercased()
            var s = 0
            for w in ["main", "full", "ensemble", "articulations", "multi", "master", "patch", "complete", "all", "basic", "standard", "core"] where l.contains(w) { s -= 10 }
            for w in ["fx", "lite", "ecs", "legato only", "release", "noise", "test", "demo", "bonus", "extra", "_old", "keyswitch only"] where l.contains(w) { s += 10 }
            return s * 100 + l.count
        }
        return files.filter { FileManager.default.fileExists(atPath: $0.path) }.min { score($0.name) < score($1.name) }
    }

    /// Library path → its .nki files (name, full path), from Kontakt's database.
    private static func instrumentRows() -> [String: [(name: String, path: String)]]? {
        let base = FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Native Instruments/Kontakt 8/komplete.db3")
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-kb-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmp) }
        let copy = tmp.appendingPathComponent("k.db3")
        guard (try? FileManager.default.copyItem(at: base, to: copy)) != nil else { return nil }
        for ext in ["-wal", "-shm"] where FileManager.default.fileExists(atPath: base.path + ext) { try? FileManager.default.copyItem(atPath: base.path + ext, toPath: copy.path + ext) }
        var db: OpaquePointer?
        guard sqlite3_open_v2(copy.path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_close(db) }
        var st: OpaquePointer?
        let sql = "SELECT p.path, s.name, s.sub_path, s.file_name FROM k_sound_info s JOIN k_content_path p ON p.id = s.content_path_id WHERE p.content_type = 2 AND s.file_ext = 'nki'"
        guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_finalize(st) }
        func text(_ i: Int32) -> String { sqlite3_column_text(st, i).map { String(cString: $0) } ?? "" }
        var out: [String: [(name: String, path: String)]] = [:]
        while sqlite3_step(st) == SQLITE_ROW {
            let root = text(0), name = text(1), sub = text(2), file = text(3)
            let full = file.hasPrefix("/") ? file : ([root, sub, file].filter { !$0.isEmpty }.joined(separator: "/"))
            out[root, default: []].append((name, full))
        }
        return out
    }

    // MARK: 4. harvest

    /// Writes a .vstpreset exactly like Live does for a VST3 plugin: header, the processor state ("Comp"),
    /// an empty controller state ("Cont") and the meta info ("Info").
    static func vstpreset(_ comp: Data) -> Data {
        let info = Data(infoXML.utf8)
        var d = Data("VST3".utf8)
        d.append(le32(1))
        d.append(Data(kontakt8ClassId.utf8))
        let compOff = Int64(48), infoOff = compOff + Int64(comp.count), listOff = infoOff + Int64(info.count)
        d.append(le64(listOff))
        d.append(comp); d.append(info)
        d.append(Data("List".utf8)); d.append(le32(3))
        for (id, off, len) in [("Comp", compOff, Int64(comp.count)), ("Cont", infoOff, Int64(0)), ("Info", infoOff, Int64(info.count))] {
            d.append(Data(id.utf8)); d.append(le64(off)); d.append(le64(len))
        }
        return d
    }
    private static func le32(_ v: Int32) -> Data { withUnsafeBytes(of: v.littleEndian) { Data($0) } }
    private static func le64(_ v: Int64) -> Data { withUnsafeBytes(of: v.littleEndian) { Data($0) } }

    /// Reads the saved builder set and writes one preset per "KP · …" track that has a loaded Kontakt.
    static func harvest() -> [String: Any] {
        guard let raw = try? Data(contentsOf: setFile) else {
            return ["ok": false, "msg": "No saved set at \(shown(setFile)) – save the builder set there first (Cmd+Shift+S once, then Cmd+S)."]
        }
        guard let xmlData = gunzip(raw), let xml = String(data: xmlData, encoding: .utf8) else { return ["ok": false, "msg": "Cannot read the set file"] }
        guard let lib = Ableton.userLibrary() else { return ["ok": false, "msg": "No Ableton User Library found"] }
        let folder = lib.appendingPathComponent("Kontakt Presets", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)

        var written: [String] = [], empty: [String] = []
        // each MIDI track: its name and the first Kontakt 8 processor state inside it
        let tracks = xml.components(separatedBy: "<MidiTrack ").dropFirst()
        for t in tracks {
            guard let name = match(t, #"<EffectiveName Value="([^"]*)""#), name.hasPrefix(trackPrefix) else { continue }
            let presetName = String(name.dropFirst(trackPrefix.count))
            guard t.contains("Kontakt 8"), let hex = match(t, #"<ProcessorState>([\s0-9A-Fa-f]*)</ProcessorState>"#) else { empty.append(presetName); continue }
            guard let comp = Data(hexString: hex.filter { !$0.isWhitespace }), comp.count > 8000 else { empty.append(presetName); continue }   // ~4 KB = empty Kontakt
            let file = folder.appendingPathComponent(presetName + ".vstpreset")
            if (try? vstpreset(comp).write(to: file, options: .atomic)) != nil { written.append(presetName) }
        }
        return ["ok": true, "written": written, "empty": empty, "folder": shown(folder)]
    }

    private static func match(_ s: String, _ pattern: String) -> String? {
        guard let re = try? NSRegularExpression(pattern: pattern), let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)),
              let r = Range(m.range(at: 1), in: s) else { return nil }
        return String(s[r])
    }

    private static func gunzip(_ d: Data) -> Data? {
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-als-\(UUID().uuidString).gz")
        defer { try? FileManager.default.removeItem(at: tmp) }
        guard (try? d.write(to: tmp)) != nil else { return nil }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/gunzip")
        p.arguments = ["-c", tmp.path]
        let pipe = Pipe(); p.standardOutput = pipe
        do { try p.run() } catch { return nil }
        let out = pipe.fileHandleForReading.readDataToEndOfFile()
        p.waitUntilExit()
        return p.terminationStatus == 0 ? out : nil
    }
}

extension Data {
    init?(hexString s: String) {
        var d = Data(capacity: s.count / 2)
        var i = s.startIndex
        while i < s.endIndex {
            guard let j = s.index(i, offsetBy: 2, limitedBy: s.endIndex), let b = UInt8(s[i..<j], radix: 16) else { return nil }
            d.append(b); i = j
        }
        self = d
    }
}
