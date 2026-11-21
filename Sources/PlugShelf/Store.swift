import Foundation

enum Paths {
    static let support: URL = {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let u = base.appendingPathComponent("PlugShelf", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()
    static var library: URL { support.appendingPathComponent("library.json") }
    static var user: URL { support.appendingPathComponent("user.json") }
    static var sizes: URL { support.appendingPathComponent("sizes-cache.json") }
    static var backups: URL { support.appendingPathComponent("backups", isDirectory: true) }

    /// The folder with index.html: inside the .app, or the project's web/ folder during development.
    static let web: URL = {
        if let r = Bundle.main.resourceURL?.appendingPathComponent("web"),
           FileManager.default.fileExists(atPath: r.appendingPathComponent("index.html").path) {
            return r
        }
        return findUp("web")
    }()

    static let abletonScript: URL = {
        if let r = Bundle.main.resourceURL?.appendingPathComponent("ableton/PlugShelf"),
           FileManager.default.fileExists(atPath: r.appendingPathComponent("__init__.py").path) {
            return r
        }
        return findUp("ableton/PlugShelf")
    }()

    private static func findUp(_ rel: String) -> URL {
        var dir = URL(fileURLWithPath: CommandLine.arguments[0]).resolvingSymlinksInPath().deletingLastPathComponent()
        for _ in 0..<8 {
            let c = dir.appendingPathComponent(rel)
            if FileManager.default.fileExists(atPath: c.path) { return c }
            dir.deleteLastPathComponent()
        }
        return URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent(rel)
    }
}

func writeAtomically(_ data: Data, to url: URL) {
    try? data.write(to: url, options: .atomic)
}

/// The user's own data (favourites, collections, racks, usage, settings).
/// Kept as plain JSON: the page owns its shape, the app only touches usage.
final class UserStore {
    private let lock = NSLock()
    private var doc: [String: Any]

    static let defaults: [String: Any] = [
        "favs": [String](),
        "hidden": [String](),
        "collections": [[String: Any]](),
        "racks": [[String: Any]](),
        "usage": [String: Int](),
        "lastUsed": [String: Double](),
        "notes": [String: String](),
        "settings": [
            "prefer": ["VST3", "AU", "VST", "CLAP"],
            "zoom": 190,
            "showAAX": false,
        ] as [String: Any],
    ]

    init() {
        if let d = try? Data(contentsOf: Paths.user),
           let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] {
            doc = UserStore.defaults.merging(o) { _, new in new }
        } else {
            doc = UserStore.defaults
        }
    }

    func data() -> Data {
        lock.lock(); defer { lock.unlock() }
        return (try? JSONSerialization.data(withJSONObject: doc, options: [.sortedKeys])) ?? Data("{}".utf8)
    }

    func replace(with incoming: [String: Any]) {
        lock.lock()
        doc = UserStore.defaults.merging(incoming) { _, new in new }
        lock.unlock()
        save()
    }

    /// Adds or removes one favourite (used by the iPad remote, which never writes the whole document).
    func setFav(_ key: String, _ on: Bool) -> [String] {
        lock.lock()
        var favs = doc["favs"] as? [String] ?? []
        favs.removeAll { $0 == key }
        if on { favs.append(key) }
        doc["favs"] = favs
        lock.unlock()
        save()
        return favs
    }

    /// Counts one load of a plugin family. Returns the new count and timestamp.
    func recordUse(_ family: String) -> (Int, Double) {
        lock.lock()
        var usage = doc["usage"] as? [String: Int] ?? [:]
        var last = doc["lastUsed"] as? [String: Double] ?? [:]
        let n = (usage[family] ?? 0) + 1
        let t = Date().timeIntervalSince1970 * 1000
        usage[family] = n
        last[family] = t
        doc["usage"] = usage
        doc["lastUsed"] = last
        lock.unlock()
        save()
        return (n, t)
    }

    private func save() {
        let d = data()
        writeAtomically(d, to: Paths.user)
        // One backup per day, the first save of that day.
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        let b = Paths.backups.appendingPathComponent("user-\(f.string(from: Date())).json")
        if !FileManager.default.fileExists(atPath: b.path) {
            try? FileManager.default.createDirectory(at: Paths.backups, withIntermediateDirectories: true)
            writeAtomically(d, to: b)
        }
    }
}
