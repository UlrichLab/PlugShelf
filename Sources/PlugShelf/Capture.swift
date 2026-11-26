import AppKit
import AVFoundation
import AudioToolbox
import CoreAudioKit
import CPlugHost
import ImageIO
import UniformTypeIdentifiers

/// `PlugShelf --capture <format> <bundle path> <class name> <uid> <out.png>`
///
/// Runs in its own short-lived process: opens one plugin's editor in a small window at the
/// edge of the screen, takes a picture of that window and exits. A plugin that crashes,
/// hangs or shows a modal dialog only takes this process down; the app kills it after a timeout.
/// Prints `PLUGSHELF-OK <w> <h>` or `PLUGSHELF-ERR <message>` on stdout.
enum CaptureMode {
    static var panel: NSPanel!
    static var container: NSView!
    static var vst2: UnsafeMutableRawPointer?
    static var auController: NSViewController?

    static func run(_ args: [String]) -> Never {
        guard args.count >= 5 else { fail("Usage: --capture <format> <path> <name> <uid> <out.png>") }
        let (format, path, name, uid, out) = (args[0], args[1], args[2], args[3], URL(fileURLWithPath: args[4]))
        // Plugins print all sorts of things; keep our own answer easy to find.
        setvbuf(stdout, nil, _IOLBF, 0)
        ph_install_crash_guard()

        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)
        app.finishLaunching()

        panel = NSPanel(contentRect: NSRect(x: 0, y: 0, width: 640, height: 400),
                        styleMask: [.borderless, .nonactivatingPanel], backing: .buffered, defer: false)
        panel.isFloatingPanel = true
        panel.level = .floating
        panel.hidesOnDeactivate = false
        panel.backgroundColor = .black
        panel.hasShadow = false
        container = NSView(frame: NSRect(x: 0, y: 0, width: 640, height: 400))
        container.wantsLayer = true
        panel.contentView = container

        ph_set_resize_callback { w, h in CaptureMode.resize(Int(w), Int(h)) }

        var err = [CChar](repeating: 0, count: 512)
        switch format {
        case "VST3":
            guard let h = ph_vst3_load(path, name, 1, &err, Int32(err.count)) else { fail(String(cString: err)) }
            var w: Int32 = 0, hh: Int32 = 0
            if ph_vst3_size(h, &w, &hh) != 0 { resize(Int(w), Int(hh)) }
            show()
            guard ph_vst3_attach(h, Unmanaged.passUnretained(container).toOpaque(), &err, Int32(err.count)) != 0 else {
                fail(String(cString: err))
            }
            if ph_vst3_size(h, &w, &hh) != 0 { resize(Int(w), Int(hh)) }
        case "VST":
            guard let h = ph_vst2_load(path, &err, Int32(err.count)) else { fail(String(cString: err)) }
            vst2 = h
            var w: Int32 = 0, hh: Int32 = 0
            if ph_vst2_size(h, &w, &hh) != 0 { resize(Int(w), Int(hh)) }
            show()
            _ = ph_vst2_attach(h, Unmanaged.passUnretained(container).toOpaque(), &err, Int32(err.count))
            if ph_vst2_size(h, &w, &hh) != 0 { resize(Int(w), Int(hh)) }
        case "AU":
            openAU(uid)
        default:
            fail("Format \(format) is not supported")
        }

        captureLoop(to: out)
    }

    static func show() {
        positionPanel()
        panel.orderFrontRegardless()
    }

    static func resize(_ w: Int, _ h: Int) {
        guard w > 10, h > 10, w < 8000, h < 8000 else { return }
        let size = NSSize(width: w, height: h)
        panel.setContentSize(size)
        container.setFrameSize(size)
        positionPanel()
    }

    /// Bottom-right corner of the main screen, a little inset.
    static func positionPanel() {
        guard let screen = NSScreen.main ?? NSScreen.screens.first else { return }
        let v = screen.visibleFrame
        let f = panel.frame
        panel.setFrameOrigin(NSPoint(x: max(v.minX, v.maxX - f.width - 12), y: v.minY + 12))
    }

    // MARK: Audio Units

    static func fourCC(_ s: String) -> OSType {
        var r: OSType = 0
        for b in s.utf8.prefix(4) { r = (r << 8) | OSType(b) }
        return r
    }

    static func openAU(_ uid: String) {
        let p = uid.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
        guard p.count == 3 else { fail("Unknown AU id") }
        let desc = AudioComponentDescription(componentType: fourCC(p[0]), componentSubType: fourCC(p[1]),
                                             componentManufacturer: fourCC(p[2]), componentFlags: 0, componentFlagsMask: 0)
        var done = false
        AVAudioUnit.instantiate(with: desc, options: []) { unit, error in
            DispatchQueue.main.async {
                guard let unit = unit else { fail("AU does not start: \(error?.localizedDescription ?? "unknown")") }
                unit.auAudioUnit.requestViewController { vc in
                    DispatchQueue.main.async {
                        guard let vc = vc else { fail("The plugin has no editor window") }
                        auController = vc
                        var size = vc.preferredContentSize
                        if size.width < 10 || size.height < 10 { size = vc.view.frame.size }
                        if size.width < 10 || size.height < 10 { size = NSSize(width: 640, height: 400) }
                        resize(Int(size.width), Int(size.height))
                        vc.view.frame = container.bounds
                        vc.view.autoresizingMask = [.width, .height]
                        container.addSubview(vc.view)
                        show()
                        done = true
                    }
                }
                _ = unit   // keep it alive while the view is shown
                objc_setAssociatedObject(panel as Any, "unit", unit, .OBJC_ASSOCIATION_RETAIN)
            }
        }
        let until = Date().addingTimeInterval(15)
        while !done && Date() < until { pump(0.05) }
        if !done { fail("The AU does not respond") }
    }

    // MARK: picture

    static func pump(_ seconds: Double) {
        let until = Date().addingTimeInterval(seconds)
        repeat {
            if let v = vst2 { ph_vst2_idle(v) }
            if let e = NSApp.nextEvent(matching: .any, until: min(until, Date().addingTimeInterval(0.03)),
                                       inMode: .default, dequeue: true) {
                NSApp.sendEvent(e)
            }
        } while Date() < until
    }

    /// Waits until the editor has drawn something and stopped changing, then saves it.
    static func captureLoop(to out: URL) -> Never {
        pump(1.2 + (Double(ProcessInfo.processInfo.environment["PLUGSHELF_CAPTURE_WAIT"] ?? "") ?? 0))
        var last: CGImage?
        var lastSig: [UInt8]?
        let deadline = Date().addingTimeInterval(9)
        while Date() < deadline {
            if let img = grab() {
                let sig = signature(img)
                if !blank(sig) {
                    if let ls = lastSig, distance(sig, ls) < 4 { save(img, to: out) }
                    lastSig = sig
                    last = img
                }
            }
            pump(0.6)
        }
        if let l = last { save(l, to: out) }
        fail("The window stayed empty")
    }

    private typealias WindowImageFn = @convention(c) (CGRect, UInt32, UInt32, UInt32) -> Unmanaged<CGImage>?

    /// A picture of our own window. CGWindowListCreateImage is looked up at run time because
    /// newer SDKs hide it; capturing a window of one's own process needs no screen-recording permission.
    static func grab() -> CGImage? {
        let id = UInt32(panel.windowNumber)
        if let sym = dlsym(UnsafeMutableRawPointer(bitPattern: -2), "CGWindowListCreateImage") {
            let fn = unsafeBitCast(sym, to: WindowImageFn.self)
            // kCGWindowListOptionIncludingWindow, kCGWindowImageBoundsIgnoreFraming | kCGWindowImageBestResolution
            if let img = fn(.null, 1 << 3, id, (1 << 0) | (1 << 3))?.takeRetainedValue(), img.width > 4 { return img }
        }
        // Fallback for views that draw with Core Graphics.
        let b = container.bounds
        guard let rep = container.bitmapImageRepForCachingDisplay(in: b) else { return nil }
        container.cacheDisplay(in: b, to: rep)
        return rep.cgImage
    }

    /// 16×16 grey thumbnail used to tell "blank" and "still changing" apart.
    static func signature(_ img: CGImage) -> [UInt8] {
        var px = [UInt8](repeating: 0, count: 256)
        guard let ctx = CGContext(data: &px, width: 16, height: 16, bitsPerComponent: 8, bytesPerRow: 16,
                                  space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return px }
        ctx.interpolationQuality = .medium
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: 16, height: 16))
        return px
    }

    static func blank(_ s: [UInt8]) -> Bool {
        guard let lo = s.min(), let hi = s.max() else { return true }
        return Int(hi) - Int(lo) < 10
    }

    static func distance(_ a: [UInt8], _ b: [UInt8]) -> Double {
        var d = 0
        for i in 0..<min(a.count, b.count) { d += abs(Int(a[i]) - Int(b[i])) }
        return Double(d) / Double(max(1, a.count))
    }

    static func save(_ img: CGImage, to url: URL) -> Never {
        let scale = min(1.0, 640.0 / Double(img.width))
        let w = max(1, Int((Double(img.width) * scale).rounded())), h = max(1, Int((Double(img.height) * scale).rounded()))
        guard let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0,
                                  space: CGColorSpace(name: CGColorSpace.sRGB)!,
                                  bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { fail("Cannot scale the picture") }
        ctx.interpolationQuality = .high
        ctx.draw(img, in: CGRect(x: 0, y: 0, width: w, height: h))
        guard let small = ctx.makeImage(),
              let dst = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
            fail("Cannot save the picture")
        }
        CGImageDestinationAddImage(dst, small, nil)
        guard CGImageDestinationFinalize(dst) else { fail("Cannot save the picture") }
        print("PLUGSHELF-OK \(w) \(h)")
        fflush(stdout)
        // Skip tearing the plugin down: some crash on the way out, and the picture is safe.
        // _exit, not exit: skip the plugin's static destructors – some (e.g. UAD's) crash on the way out,
        // and the result is already written.
        _exit(0)
    }

    static func fail(_ msg: String) -> Never {
        print("PLUGSHELF-ERR \(msg.replacingOccurrences(of: "\n", with: " "))")
        fflush(stdout)
        _exit(1)
    }
}
