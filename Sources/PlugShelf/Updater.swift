import AppKit
import Foundation

/// Checks GitHub for a newer PlugShelf release and, when the user asks, installs it and restarts.
/// Only the public releases page of the PlugShelf repository is contacted; nothing about the user is sent.
final class Updater {
    static let repo = "UlrichLab/PlugShelf"
    struct State { var phase = "idle"; var msg = "" }   // idle | downloading | installing | restarting | error

    private let lock = NSLock()
    private var latest: [String: Any]?
    private var checkedAt = Date.distantPast
    private var _state = State()
    var state: State { lock.lock(); defer { lock.unlock() }; return _state }
    private func set(_ phase: String, _ msg: String = "") { lock.lock(); _state = State(phase: phase, msg: msg); lock.unlock() }

    static var current: String { Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0" }

    /// "0.10.1" > "0.9.3"
    static func newer(_ a: String, than b: String) -> Bool {
        let x = a.split(separator: ".").map { Int($0.filter(\.isNumber)) ?? 0 }, y = b.split(separator: ".").map { Int($0.filter(\.isNumber)) ?? 0 }
        for i in 0..<max(x.count, y.count) {
            let p = i < x.count ? x[i] : 0, q = i < y.count ? y[i] : 0
            if p != q { return p > q }
        }
        return false
    }

    /// {current, latest, available, notes, page} – asks GitHub at most every 6 hours unless forced.
    func check(force: Bool = false) -> [String: Any] {
        lock.lock()
        let fresh = !force && Date().timeIntervalSince(checkedAt) < 6 * 3600
        let cached = latest
        lock.unlock()
        var info = cached
        if !fresh || info == nil {
            var req = URLRequest(url: URL(string: "https://api.github.com/repos/\(Updater.repo)/releases/latest")!, timeoutInterval: 8)
            req.setValue("PlugShelf", forHTTPHeaderField: "User-Agent")
            req.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
            let sem = DispatchSemaphore(value: 0)
            var got: [String: Any]?
            URLSession.shared.dataTask(with: req) { d, r, _ in
                if (r as? HTTPURLResponse)?.statusCode == 200, let d, let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { got = o }
                sem.signal()
            }.resume()
            _ = sem.wait(timeout: .now() + 10)
            if let got {
                info = got
                lock.lock(); latest = got; checkedAt = Date(); lock.unlock()
            }
        }
        guard let rel = info else { return ["current": Updater.current, "available": false, "error": "GitHub not reachable"] }
        let tag = (rel["tag_name"] as? String ?? "").trimmingCharacters(in: CharacterSet(charactersIn: "vV"))
        let zip = (rel["assets"] as? [[String: Any]] ?? []).first { ($0["name"] as? String ?? "").hasSuffix("-mac.zip") }
        return ["current": Updater.current, "latest": tag, "available": Updater.newer(tag, than: Updater.current) && zip != nil,
                "notes": rel["body"] as? String ?? "", "page": rel["html_url"] as? String ?? ""]
    }

    /// Downloads the release ZIP, checks it is a signed PlugShelf, replaces this app and restarts.
    func install() {
        guard state.phase == "idle" || state.phase == "error" else { return }
        set("downloading", "Downloading the update…")
        DispatchQueue.global(qos: .userInitiated).async { [self] in
            lock.lock(); let rel = latest; lock.unlock()
            guard let asset = (rel?["assets"] as? [[String: Any]] ?? []).first(where: { ($0["name"] as? String ?? "").hasSuffix("-mac.zip") }),
                  let s = asset["browser_download_url"] as? String, let url = URL(string: s),
                  url.host == "github.com" || url.host?.hasSuffix(".githubusercontent.com") == true else { return set("error", "No download in the release") }
            let work = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-update-\(UUID().uuidString)", isDirectory: true)
            try? FileManager.default.createDirectory(at: work, withIntermediateDirectories: true)
            let zip = work.appendingPathComponent("update.zip")
            guard let data = try? Data(contentsOf: url), data.count > 100_000, (try? data.write(to: zip)) != nil else { return set("error", "Download failed") }
            set("installing", "Installing…")
            guard run("/usr/bin/ditto", ["-x", "-k", zip.path, work.path]) else { return set("error", "Cannot unpack the update") }
            let app = work.appendingPathComponent("PlugShelf.app")
            guard let b = Bundle(url: app), b.bundleIdentifier == Bundle.main.bundleIdentifier,
                  let v = b.infoDictionary?["CFBundleShortVersionString"] as? String, Updater.newer(v, than: Updater.current) else { return set("error", "The download is not a newer PlugShelf") }
            guard run("/usr/bin/codesign", ["--verify", "--deep", app.path]) else { return set("error", "The download's signature is not valid") }
            _ = run("/usr/bin/xattr", ["-cr", app.path])
            let here = URL(fileURLWithPath: Bundle.main.bundlePath)
            do { _ = try FileManager.default.replaceItemAt(here, withItemAt: app, backupItemName: nil, options: []) } catch { return set("error", "Cannot replace the app: \(error.localizedDescription)") }
            set("restarting", "Restarting…")
            let p = Process()
            p.executableURL = URL(fileURLWithPath: "/bin/sh")
            p.arguments = ["-c", "sleep 1; /usr/bin/open \"$0\"", here.path]
            try? p.run()
            DispatchQueue.main.async { NSApp.terminate(nil) }
        }
    }

    private func run(_ exe: String, _ args: [String]) -> Bool {
        let p = Process()
        p.executableURL = URL(fileURLWithPath: exe)
        p.arguments = args
        p.standardOutput = FileHandle.nullDevice; p.standardError = FileHandle.nullDevice
        do { try p.run() } catch { return false }
        p.waitUntilExit()
        return p.terminationStatus == 0
    }
}
