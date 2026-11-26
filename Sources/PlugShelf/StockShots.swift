import AppKit
import CoreGraphics
import Foundation
import ImageIO

/// Pictures of Live's own devices. Live's devices cannot be opened outside Live, so the Live script puts each
/// one alone on a scratch track in an empty set; PlugShelf takes Live's window once with the device and once
/// without it, and the part that differs is the device. Needs macOS "Screen Recording" for PlugShelf.
final class StockShots {
    struct Progress { var running = false; var done = 0; var total = 0; var ok = 0; var failed = 0; var current = ""; var msg = ""; var last = "" }

    private let lock = NSLock()
    private var _progress = Progress()
    private var cancelled = false
    var progress: Progress { lock.lock(); defer { lock.unlock() }; return _progress }

    static var permitted: Bool { CGPreflightScreenCaptureAccess() }
    static func askPermission() { _ = CGRequestScreenCaptureAccess() }

    func cancel() { lock.lock(); cancelled = true; lock.unlock() }

    /// devices: [{"name", "kind"}]; store(family, png) keeps a picture.
    func start(_ devices: [[String: Any]], store: @escaping (String, Data) -> Void) {
        lock.lock()
        guard !_progress.running else { lock.unlock(); return }
        _progress = Progress(running: true, total: devices.count)
        cancelled = false
        lock.unlock()
        DispatchQueue.global(qos: .userInitiated).async { [self] in
            let browser = Ableton.send(["op": "shot_track", "name": devices.first?["name"] ?? "", "kind": devices.first?["kind"] ?? "fx", "hide_browser": true], timeout: 3)["browser"] as? Bool ?? false
            for d in devices {
                lock.lock(); let stop = cancelled; lock.unlock()
                if stop { break }
                let name = d["name"] as? String ?? "", kind = d["kind"] as? String ?? "fx"
                update { $0.current = name }
                let why = shoot(name: name, kind: kind, store: store)
                update { $0.done += 1; if why == nil { $0.ok += 1 } else { $0.failed += 1; $0.last = "\(name): \(why!)" } }
            }
            _ = Ableton.send(["op": "shot_clear", "restore_browser": browser], timeout: 3)
            update { $0.running = false; $0.current = "" }
        }
    }

    private func update(_ f: (inout Progress) -> Void) { lock.lock(); f(&_progress); lock.unlock() }

    /// nil when the picture was taken, otherwise the reason.
    private func shoot(name: String, kind: String, store: (String, Data) -> Void) -> String? {
        guard Ableton.send(["op": "shot_track", "name": name, "kind": kind], timeout: 8)["ok"] as? Bool == true else { return "Live did not make the track" }
        var loaded = false
        for _ in 0..<80 {                                 // up to 20 s – Max for Live devices take a while
            usleep(250_000)
            if Ableton.send(["op": "shot_info"], timeout: 6)["loaded"] as? Bool == true { loaded = true; break }
        }
        guard loaded else { return "the device did not arrive" }
        usleep(900_000)                                   // let Live draw the device
        guard let wid = StockShots.liveWindow() else { return "Live's window not found" }
        guard let with = StockShots.grab(wid) else { return "screen capture failed" }
        _ = Ableton.send(["op": "shot_empty"], timeout: 6)
        usleep(600_000)
        guard let without = StockShots.grab(wid) else { return "screen capture failed" }
        if ProcessInfo.processInfo.environment["PLUGSHELF_SHOT_DEBUG"] != nil || FileManager.default.fileExists(atPath: Paths.support.appendingPathComponent("stock-debug").path) { StockShots.debug(with, without, name) }
        guard let rect = StockShots.difference(with, without) else { return "device not found in the picture" }
        guard let crop = with.cropping(to: rect), let png = StockShots.png(crop) else { return "cannot crop" }
        store("live:" + name.lowercased(), png)
        return nil
    }

    /// The last two window pictures, for checking the cropping (overwritten each time).
    static func debug(_ a: CGImage, _ b: CGImage, _ name: String) {
        let dir = Paths.support.appendingPathComponent("stock-debug", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? png(a)?.write(to: dir.appendingPathComponent("with.png"))
        try? png(b)?.write(to: dir.appendingPathComponent("without.png"))
    }

    /// Live's main window (largest normal window of the Live app).
    static func liveWindow() -> CGWindowID? {
        guard let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] else { return nil }
        let live = list.filter { ($0[kCGWindowOwnerName as String] as? String ?? "").hasPrefix("Live") && ($0[kCGWindowLayer as String] as? Int) == 0 }
        let area: ([String: Any]) -> Double = { w in
            let b = w[kCGWindowBounds as String] as? [String: Any] ?? [:]
            return (b["Width"] as? Double ?? 0) * (b["Height"] as? Double ?? 0)
        }
        return (live.max { area($0) < area($1) }?[kCGWindowNumber as String] as? Int).map { CGWindowID($0) }
    }

    /// The window as an image, through macOS's own screencapture tool.
    static func grab(_ wid: CGWindowID) -> CGImage? {
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-live-\(UUID().uuidString).png")
        defer { try? FileManager.default.removeItem(at: tmp) }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/sbin/screencapture")
        p.arguments = ["-x", "-o", "-l", String(wid), tmp.path]
        do { try p.run(); p.waitUntilExit() } catch { return nil }
        // read the whole file first: the image is decoded lazily and the file is removed right after
        guard let data = try? Data(contentsOf: tmp), let src = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        return CGImageSourceCreateImageAtIndex(src, 0, [kCGImageSourceShouldCacheImmediately: true] as CFDictionary)
    }

    private static func rgba(_ img: CGImage) -> [UInt8]? {
        let w = img.width, h = img.height
        var buf = [UInt8](repeating: 0, count: w * h * 4)
        guard let ctx = CGContext(data: &buf, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4,
                                  space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
        return buf
    }

    /// The device's rectangle: the block of changed pixels that starts furthest left in the lower part of the window.
    static func difference(_ a: CGImage, _ b: CGImage) -> CGRect? {
        guard a.width == b.width, a.height == b.height, let pa = rgba(a), let pb = rgba(b) else { return nil }
        // the device view sits in the lower part; Live's status bar along the very bottom is left out
        let w = a.width
        var h = a.height * 965 / 1000, top = a.height * 35 / 100
        // the empty device view's colour: the most common colour in the lower part of the picture without the device
        var hist: [Int: Int] = [:]
        for y in stride(from: top, to: h, by: 3) { for x in stride(from: 0, to: w, by: 3) {
            let i = (y * w + x) * 4
            hist[(Int(pb[i]) >> 3) << 10 | (Int(pb[i + 1]) >> 3) << 5 | (Int(pb[i + 2]) >> 3), default: 0] += 1
        } }
        let bgKey = hist.max { $0.value < $1.value }?.key ?? 0
        let bg = [((bgKey >> 10) & 31) << 3 | 4, ((bgKey >> 5) & 31) << 3 | 4, (bgKey & 31) << 3 | 4]
        // Live's device view: in the picture without the device it is one large empty area of that colour.
        // Everything outside it (mixer, track headers, status bar) is ignored.
        func bgShare(_ y: Int) -> Double {
            var n = 0, all = 0
            for x in stride(from: 0, to: w, by: 4) {
                let i = (y * w + x) * 4
                all += 1
                if abs(Int(pb[i]) - bg[0]) + abs(Int(pb[i + 1]) - bg[1]) + abs(Int(pb[i + 2]) - bg[2]) < 24 { n += 1 }
            }
            return Double(n) / Double(max(all, 1))
        }
        // the device view is the lowest large block (the empty session grid above has the same colour)
        var panel = (top, h - 1), runA = -1, lastY = -10
        for y in top..<h where bgShare(y) > 0.55 {
            if runA < 0 || y - lastY > 3 { runA = y }
            lastY = y
            if lastY - runA > a.height / 16 { panel = (runA, lastY) }
        }
        let panelTop = max(top, panel.0 - 2), panelEnd = min(h, panel.1 + 3)
        top = panelTop; h = panelEnd
        // a pixel belongs to the device when it changed AND is not empty background in the picture with the device
        // (Live's "drop devices here" hint changes too, but only on empty background)
        func changed(_ x: Int, _ y: Int) -> Bool {
            let i = (y * w + x) * 4
            let d = abs(Int(pa[i]) - Int(pb[i])) + abs(Int(pa[i + 1]) - Int(pb[i + 1])) + abs(Int(pa[i + 2]) - Int(pb[i + 2]))
            guard d > 36 else { return false }
            return abs(Int(pa[i]) - bg[0]) + abs(Int(pa[i + 1]) - bg[1]) + abs(Int(pa[i + 2]) - bg[2]) > 30
        }
        var colCount = [Int](repeating: 0, count: w)
        for y in top..<h { for x in 0..<w where changed(x, y) { colCount[x] += 1 } }
        guard let first = colCount.firstIndex(where: { $0 > 3 }) else { return nil }
        // extend to the right until a clear gap of unchanged columns
        let gap = max(16, w / 90)
        var last = first, quiet = 0, x = first
        while x < w {
            if colCount[x] > 3 { last = x; quiet = 0 } else { quiet += 1; if quiet > gap { break } }
            x += 1
        }
        // rows: the tallest block of changed rows (Live's status bar below the device can change too)
        var rowCount = [Int](repeating: 0, count: h)
        for y in top..<h { for x in first...last where changed(x, y) { rowCount[y] += 1 } }
        var best = (0, -1), runStart = -1, lastHit = -1
        let rowGap = max(20, h / 30)            // devices have empty space inside (between sections)
        for y in top..<h {
            if rowCount[y] > 2 {
                if runStart < 0 || y - lastHit > rowGap { runStart = y }
                lastHit = y
                if lastHit - runStart > best.1 - best.0 { best = (runStart, lastHit) }
            }
        }
        var minY = best.0, maxY = best.1
        guard maxY > minY else { return nil }
        // grow up and down while rows still change at all (the title bar is close to the background colour)
        func rawRow(_ y: Int) -> Int {
            var n = 0
            for x in first...last {
                let i = (y * w + x) * 4
                if abs(Int(pa[i]) - Int(pb[i])) + abs(Int(pa[i + 1]) - Int(pb[i + 1])) + abs(Int(pa[i + 2]) - Int(pb[i + 2])) > 24 { n += 1 }
            }
            return n
        }
        // a row counts when a few pixels change (the title bar only has its name and buttons); small gaps are bridged
        let need = max(3, (last - first) / 90), bridge = max(4, h / 300)
        func grow(_ y: inout Int, _ step: Int, _ limit: (Int) -> Bool) {
            var probe = y + step, misses = 0
            while limit(probe) {
                if rawRow(probe) >= need { y = probe; misses = 0 } else { misses += 1; if misses > bridge { break } }
                probe += step
            }
        }
        grow(&minY, -1) { $0 > top }
        grow(&maxY, 1) { $0 < h }
        // cut flat columns on the right and left: the empty part of the device view has no structure
        func flat(_ x: Int) -> Bool {
            var lo = 255, hi = 0
            for y in stride(from: minY, through: maxY, by: 2) {
                let i = (y * w + x) * 4
                let l = (Int(pa[i]) * 3 + Int(pa[i + 1]) * 6 + Int(pa[i + 2])) / 10
                lo = min(lo, l); hi = max(hi, l)
            }
            return hi - lo < 14
        }
        while last > first + 40 && flat(last) { last -= 1 }
        guard maxY > minY, last - first > 40, maxY - minY > 40 else { return nil }
        let pad = 2
        return CGRect(x: max(0, first - pad), y: max(0, minY - pad), width: min(w, last + pad) - max(0, first - pad), height: min(h, maxY + pad) - max(0, minY - pad))
    }

    static func png(_ img: CGImage) -> Data? {
        let data = NSMutableData()
        guard let dest = CGImageDestinationCreateWithData(data, "public.png" as CFString, 1, nil) else { return nil }
        CGImageDestinationAddImage(dest, img, nil)
        return CGImageDestinationFinalize(dest) ? data as Data : nil
    }
}
