// Draws PlugShelf's app icon into an .iconset folder: swift make_icon.swift <out.iconset>
import AppKit

let out = URL(fileURLWithPath: CommandLine.arguments[1])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

func draw(_ px: Int) -> Data {
    let s = CGFloat(px)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8,
                               samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB,
                               bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let inset = s * 0.09
    let body = NSRect(x: inset, y: inset, width: s - 2 * inset, height: s - 2 * inset)
    let shape = NSBezierPath(roundedRect: body, xRadius: s * 0.2, yRadius: s * 0.2)
    NSGradient(colors: [NSColor(red: 0.13, green: 0.14, blue: 0.17, alpha: 1),
                        NSColor(red: 0.05, green: 0.055, blue: 0.065, alpha: 1)])!.draw(in: shape, angle: -90)
    NSColor(white: 1, alpha: 0.08).setStroke()
    shape.lineWidth = max(1, s * 0.006)
    shape.stroke()

    // three rack units, the top one lit
    let colors: [(NSColor, NSColor)] = [
        (NSColor(red: 1.0, green: 0.62, blue: 0.24, alpha: 1), NSColor(red: 1.0, green: 0.37, blue: 0.24, alpha: 1)),
        (NSColor(red: 0.30, green: 0.33, blue: 0.40, alpha: 1), NSColor(red: 0.22, green: 0.24, blue: 0.30, alpha: 1)),
        (NSColor(red: 0.30, green: 0.33, blue: 0.40, alpha: 1), NSColor(red: 0.22, green: 0.24, blue: 0.30, alpha: 1)),
    ]
    let w = body.width * 0.62, h = body.height * 0.15, gap = body.height * 0.06
    let x0 = body.midX - w / 2
    var y = body.midY + h * 1.5 + gap - h
    for (i, c) in colors.enumerated() {
        let r = NSRect(x: x0, y: y, width: w, height: h)
        let p = NSBezierPath(roundedRect: r, xRadius: h * 0.28, yRadius: h * 0.28)
        NSGradient(colors: [c.0, c.1])!.draw(in: p, angle: 0)
        // knob dots
        let dot = h * 0.26
        for k in 0..<3 {
            let dx = r.maxX - h * 0.55 - CGFloat(k) * dot * 1.9
            let d = NSBezierPath(ovalIn: NSRect(x: dx - dot / 2, y: r.midY - dot / 2, width: dot, height: dot))
            (i == 0 ? NSColor(red: 0.2, green: 0.08, blue: 0.0, alpha: 0.55) : NSColor(white: 1, alpha: 0.25)).setFill()
            d.fill()
        }
        y -= h + gap
    }
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

for (name, px) in [("16x16", 16), ("16x16@2x", 32), ("32x32", 32), ("32x32@2x", 64), ("128x128", 128),
                   ("128x128@2x", 256), ("256x256", 256), ("256x256@2x", 512), ("512x512", 512), ("512x512@2x", 1024)] {
    try! draw(px).write(to: out.appendingPathComponent("icon_\(name).png"))
}
