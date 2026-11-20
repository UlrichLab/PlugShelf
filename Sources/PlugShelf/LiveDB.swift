import Foundation
import SQLite3

/// Reads Ableton Live's own plugin database (read-only, from a copy) so VST2 and VST3
/// bundles without metadata files still get their real names, makers and categories.
struct LiveEntry {
    var name: String
    var vendor: String
    var version: String
    var kind: String        // inst | fx | midi
    var uid: String
    var subcats: [String]
}

struct LiveModule {
    var scanState: Int
    var entries: [LiveEntry]
}

enum LiveDB {
    static func newestDatabase() -> URL? {
        let dir = URL(fileURLWithPath: NSHomeDirectory())
            .appendingPathComponent("Library/Application Support/Ableton/Live Database")
        guard let items = try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey]) else { return nil }
        let dbs = items.filter { $0.lastPathComponent.hasPrefix("Live-plugins-") && $0.pathExtension == "db" }
        return dbs.max { a, b in
            let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
            return da < db
        }
    }

    /// Module path -> what Live found in it.
    static func load() -> [String: LiveModule]? {
        guard let src = newestDatabase() else { return nil }
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-live-\(UUID().uuidString)")
        try? FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: tmp) }
        let copy = tmp.appendingPathComponent("plugins.db")
        do { try FileManager.default.copyItem(at: src, to: copy) } catch { return nil }
        for ext in ["-wal", "-shm"] {
            let side = URL(fileURLWithPath: src.path + ext)
            if FileManager.default.fileExists(atPath: side.path) {
                try? FileManager.default.copyItem(at: side, to: URL(fileURLWithPath: copy.path + ext))
            }
        }

        var db: OpaquePointer?
        // Our own temp copy: open it read-write, a WAL database cannot be read without creating its -shm file.
        guard sqlite3_open_v2(copy.path, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else { return nil }
        defer { sqlite3_close(db) }

        var modules: [Int64: (String, Int)] = [:]
        query(db, "SELECT module_id, path, scanstate FROM plugin_modules") { st in
            let id = sqlite3_column_int64(st, 0)
            let path = text(st, 1)
            modules[id] = (path, Int(sqlite3_column_int(st, 2)))
        }

        // Live keeps a row per scan of a file; only its newest row counts.
        var newest: [String: Int64] = [:]
        for (id, (path, _)) in modules {
            let p = standard(path)
            if id > newest[p] ?? -1 { newest[p] = id }
        }
        var out: [String: LiveModule] = [:]
        for (p, id) in newest {
            out[p] = LiveModule(scanState: modules[id]!.1, entries: [])
        }
        query(db, "SELECT module_id, dev_identifier, name, vendor, version, subcategories FROM plugins") { st in
            let mid = sqlite3_column_int64(st, 0)
            guard let (path, _) = modules[mid], newest[standard(path)] == mid else { return }
            let ident = text(st, 1)
            // device:vst3:audiofx:<uuid>   device:vst:instr:1249209905?n=Name
            let parts = ident.split(separator: ":", maxSplits: 3).map(String.init)
            let kindTok = parts.count > 2 ? parts[2] : ""
            let kind = kindTok.hasPrefix("instr") ? "inst" : (kindTok.hasPrefix("midi") ? "midi" : "fx")
            var uid = parts.count > 3 ? parts[3] : ""
            if let q = uid.firstIndex(of: "?") { uid = String(uid[..<q]) }
            let subs = text(st, 5).split(separator: "|").map { String($0) }.filter { !$0.isEmpty }
            let e = LiveEntry(name: text(st, 2), vendor: text(st, 3), version: text(st, 4), kind: kind, uid: uid, subcats: subs)
            out[standard(path), default: LiveModule(scanState: 1, entries: [])].entries.append(e)
        }
        return out
    }

    static func standard(_ p: String) -> String {
        URL(fileURLWithPath: p).standardizedFileURL.path
    }

    private static func query(_ db: OpaquePointer?, _ sql: String, _ row: (OpaquePointer?) -> Void) {
        var st: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK else { return }
        defer { sqlite3_finalize(st) }
        while sqlite3_step(st) == SQLITE_ROW { row(st) }
    }

    private static func text(_ st: OpaquePointer?, _ i: Int32) -> String {
        guard let c = sqlite3_column_text(st, i) else { return "" }
        return String(cString: c)
    }
}
