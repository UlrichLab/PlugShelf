import Foundation

/// Turns a chain into an Ableton Audio Effect Rack (.adg) with mapped, named and coloured macros,
/// saves it in the User Library and can load it onto Live's selected track.
final class RackBuilder {
    /// `set`: starting values per knob label. `macros`: knob labels that must get a macro first
    /// (the settings a chain leaves to taste, e.g. "Thresh" for "about 3 dB of gain reduction").
    struct Slot {
        var family: String; var role: String; var label: String
        var set: [String: (Double, String)] = [:]
        var macros: [String] = []
    }
    struct Progress { var running = false; var done = 0; var total = 0; var current = "" }

    private let lock = NSLock()
    private var _progress = Progress()
    private var _result: [String: Any]?

    var progress: Progress { lock.lock(); defer { lock.unlock() }; return _progress }
    var result: [String: Any]? { lock.lock(); defer { lock.unlock() }; return _result }

    static let cacheDir: URL = {
        let u = Paths.support.appendingPathComponent("params", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()

    // MARK: what goes on the macros

    private static let mix = ["^mix$", "^mix ?%", "^dry ?/ ?wet$", "^dry ?wet$", "^wet$", "^blend$", "^mix level$", "^parallel"]
    private static let low = ["^bass ?gain", "^boost 1 ch", "^low ?boost", "^lf ?boost", "^lo ?boost", "^low ?gain", "^lf ?gain", "^low ?shelf", "^bass$", "^lf$"]
    private static let high = ["^treble ?gain", "^boost 7 ch", "^high ?boost", "^hf ?boost", "^hi ?boost", "^high ?gain", "^hf ?gain", "^high ?shelf", "^air", "^treble$", "^hf$"]
    private static let hpf = ["^hpf", "high ?pass", "^low ?cut", "^lo ?cut", "^hp ?freq", "^lcf"]
    private static let presence = ["^presence", "^hi ?mid ?gain", "^mid ?gain", "^hmf ?gain", "^hm ?gain", "^mid ?boost", "^mf ?gain"]
    private static let tone = ["^tone$", "^colou?r$", "^damp", "^high ?cut", "^hi ?cut", "^lpf"]
    private static let feedback = ["feedback", "^regen", "^repeats?$"]
    private static let noise = ["crackle", "^noise", "^dust", "^vinyl", "^hiss"]

    /// Per role: (macro label, title patterns tried in order). The first entry is the main knob.
    static let macroSpecs: [String: [(String, [String])]] = [
        "comp": [("Thresh", ["^thresh", "^comp ?thresh", "threshold", "^input( gain)?$", "^peak ?red", "^compress", "^squash", "^amount$"]), ("Ratio", ["^ratio", "^comp ?ratio"]), ("Attack", ["^attack", "^comp ?attack"]), ("Release", ["^release", "^comp ?rel"]), ("Mix", mix), ("Output", ["^output", "^makeup", "^out ?gain", "^gain$"])],
        "multiband": [("Depth", ["^depth", "^amount", "^range$"]), ("Output", ["^output", "^gain$"])],
        "limiter": [("Thresh", ["^thresh", "threshold", "^limiter gain", "^gain$", "^input", "^drive"]), ("Ceiling", ["ceiling", "^output( level)?$", "^out ?ceiling", "true ?peak"])],
        "clipper": [("Thresh", ["^thresh", "threshold", "^input", "^drive", "^gain$", "^ceiling"]), ("Output", ["^output"])],
        "gate": [("Thresh", ["thresh"]), ("Range", ["^range", "^floor"]), ("Release", ["^release", "^decay"]), ("Hold", ["^hold"])],
        "transient": [("Attack", ["attack", "punch"]), ("Sustain", ["sustain", "body"])],
        "deess": [("Thresh", ["thresh", "^range", "reduction", "^amount", "intensity"]), ("Freq", ["^freq", "frequency"])],
        "eq": [("Low", low), ("High", high), ("HPF", hpf), ("Presence", presence), ("Output", ["^output", "^out ?gain", "^master gain", "^gain$"])],
        "dyneq": [("Depth", ["^depth", "^amount", "^mix$", "^delta"]), ("Mix", mix)],
        "sat": [("Drive", ["^drive", "^satur", "^input", "^amount", "^gain$", "warmth", "^heat", "^tube"]), ("Mix", mix), ("Tone", tone)],
        "dist": [("Drive", ["^drive", "^distort", "^input", "^amount", "^gain$", "^fuzz"]), ("Mix", mix), ("Tone", tone)],
        "amp": [("Gain", ["^gain", "^drive", "^input"]), ("Tone", ["^tone", "^treble", "^presence"])],
        "tape": [("Drive", ["^input", "^drive", "^satur", "^record"]), ("Wow", ["^wow", "flutter"]), ("Noise", noise), ("Mix", mix)],
        "crush": [("Crush", ["^bits?$", "bit ?depth", "^crush", "downsample", "^rate", "^amount"]), ("Mix", mix), ("Noise", noise)],
        "exciter": [("Amount", ["^amount", "^drive", "^harmonic", "^mix$", "^intensity"]), ("Mix", mix)],
        "reverb": [("Mix", mix), ("Decay", ["^decay", "decay time", "^time$", "reverb time", "^size$", "^length", "rt60"]), ("PreDly", ["pre.?delay"]), ("Tone", tone)],
        "delay": [("Mix", mix), ("Feedback", feedback), ("Time", ["^time", "delay time"]), ("Mod", ["^mod", "^wow", "flutter", "^age"]), ("Tone", tone)],
        "chorus": [("Mix", mix), ("Depth", ["^depth", "^amount", "^width"]), ("Feedback", feedback)],
        "mod": [("Mix", mix), ("Rate", ["^rate", "^speed", "^freq"]), ("Depth", ["^depth"]), ("Feedback", feedback + ["^resonance"])],
        "filter": [("Cutoff", ["cutoff", "^freq", "frequency"]), ("Reso", ["^reso", "^q$", "^emphasis"]), ("LFO", ["lfo ?(amount|depth)", "^mod ?depth", "^env(elope)? ?(amount|depth)", "^depth$"]), ("Drive", ["^drive"]), ("Mix", mix)],
        "tune": [("Retune", ["retune", "^speed", "correction", "^amount"]), ("Humanize", ["humani"])],
        "pitch": [("Pitch", ["^pitch", "semitone", "^shift", "transpose"]), ("Mix", mix), ("Detune", ["detune", "^fine", "^cents?"])],
        "width": [("Width", ["width", "spread", "^stereo", "^amount"])],
        "sidechain": [("Depth", ["^mix$", "^depth", "^amount", "^duck"]), ("Rate", ["^rate", "^speed"])],
        "glitch": [("Mix", mix)],
        "preamp": [("Drive", ["^drive", "^gain$", "^input", "^preamp", "^mic gain"]), ("Output", ["^output", "^trim"]), ("High", high), ("HPF", hpf), ("Low", low)],
        "suite": [("Output", ["^output", "^gain$"])],
        "meter": [],
    ]

    /// The knob that makes a dynamics module work; it always gets a macro and starts engaged
    /// (compressor −12 dB, limiter −3 dB, clipper −2 dB) unless the template says otherwise.
    static let dynamicsKnob: [String: String] = ["comp": "Thresh", "limiter": "Thresh", "clipper": "Thresh", "multiband": "Depth", "gate": "Thresh", "deess": "Thresh"]

    /// Every knob label once, so a slot can ask for a knob its role does not list (e.g. "High" on a preamp).
    static let allSpecs: [String: [String]] = {
        var out: [String: [String]] = [:]
        for (_, specs) in macroSpecs { for (label, pats) in specs where out[label] == nil { out[label] = pats } }
        return out
    }()

    static let roleShort: [String: String] = [
        "comp": "Comp", "multiband": "MB", "limiter": "Limit", "clipper": "Clip", "gate": "Gate", "transient": "Trans",
        "deess": "DeEss", "eq": "EQ", "dyneq": "DynEQ", "sat": "Sat", "dist": "Dist", "amp": "Amp", "tape": "Tape",
        "crush": "Crush", "exciter": "Excite", "reverb": "Verb", "delay": "Delay", "chorus": "Chorus", "mod": "Mod",
        "filter": "Filter", "tune": "Tune", "pitch": "Pitch", "width": "Width", "sidechain": "Duck", "glitch": "Glitch",
        "preamp": "Pre", "suite": "Master", "meter": "Meter",
    ]

    /// Live palette indices, one colour family per kind of module.
    static let roleColor: [String: Int] = [
        "comp": 1, "multiband": 1, "limiter": 1, "clipper": 1, "gate": 1, "transient": 1, "deess": 1,
        "eq": 9, "dyneq": 9, "filter": 8, "sat": 14, "dist": 14, "amp": 14, "tape": 16, "crush": 14, "exciter": 3,
        "reverb": 24, "delay": 22, "chorus": 26, "mod": 26, "glitch": 26, "width": 20, "sidechain": 4,
        "preamp": 16, "tune": 12, "pitch": 12, "suite": 13, "meter": 13,
    ]

    /// Starting values engineers commonly reach for. On send/return chains effects run 100 % wet.
    /// Templates add their own per slot (ratio, attack, decay …) on top of these.
    static func targets(role: String, returns: Bool) -> [String: (Double, String)] {
        switch role {
        case "comp": return ["Ratio": (3, ""), "Thresh": (-12, "dB")]
        case "reverb": return ["Mix": (returns ? 100 : 25, "%"), "Decay": (1.8, "s"), "PreDly": (20, "ms")]
        case "delay": return ["Mix": (returns ? 100 : 20, "%"), "Feedback": (30, "%")]
        case "chorus", "mod": return ["Mix": (40, "%")]
        case "limiter": return ["Ceiling": (-1, "dB"), "Thresh": (-3, "dB")]
        case "clipper": return ["Thresh": (-2, "dB")]
        default: return [:]
        }
    }

    // MARK: building

    func start(name: String, annotation: String, slots: [Slot], returns: Bool, library: Library?, load: Bool) -> Bool {
        lock.lock()
        if _progress.running { lock.unlock(); return false }
        _progress = Progress(running: true, done: 0, total: slots.count, current: "")
        _result = nil
        lock.unlock()
        DispatchQueue.global(qos: .userInitiated).async { [self] in
            let r = build(name: name, annotation: annotation, slots: slots, returns: returns, library: library, load: load)
            lock.lock(); _result = r; _progress.running = false; _progress.current = ""; lock.unlock()
        }
        return true
    }

    private func build(name: String, annotation: String, slots: [Slot], returns: Bool, library: Library?, load: Bool) -> [String: Any] {
        var byFamily: [String: [Plugin]] = [:]
        for p in library?.plugins ?? [] { byFamily[p.family, default: []].append(p) }

        var devices: [RackWriter.Device] = []
        var macros: [RackWriter.Macro] = []
        var skipped: [String] = []
        // per device: the knobs found for it, main one first
        // per device: the knobs that get a macro first (template's choice or the main knob), then the others
        var found: [[(label: String, param: [String: Any], target: Double?)]] = []
        var later: [[(label: String, param: [String: Any], target: Double?)]] = []
        var roles: [String] = []

        for slot in slots {
            let items = byFamily[slot.family] ?? []
            let display = items.first?.display ?? slot.family
            lock.lock(); _progress.current = display; lock.unlock()
            defer { lock.lock(); _progress.done += 1; lock.unlock() }

            let native = { (p: Plugin) in p.archs.isEmpty || p.archs.contains("arm64") || Scanner.machine != "arm64" }
            guard let p = items.filter({ $0.format == "VST3" && $0.status == "ok" && $0.liveFailed != true }).sorted(by: { native($0) && !native($1) }).first else {
                skipped.append("\(display) (no VST3)"); continue
            }
            if !native(p) { skipped.append("\(display) (Intel only)"); continue }
            guard let info = readParams(p) else { skipped.append("\(display) (cannot be opened)"); continue }

            let params = (info["params"] as? [[String: Any]]) ?? []
            var knobs: [(String, [String: Any], Double?)] = []
            var used = Set<UInt32>()
            var want = RackBuilder.targets(role: slot.role, returns: returns)
            for (k, v) in slot.set { want[k] = v }
            if returns, slot.role == "reverb" || slot.role == "delay" { want["Mix"] = (100, "%") }
            // The role's knobs, plus any knob the template asks for that the role does not list.
            var specs = RackBuilder.macroSpecs[slot.role] ?? []
            for label in slot.macros + Array(slot.set.keys) where !specs.contains(where: { $0.0 == label }) {
                if let pats = RackBuilder.allSpecs[label] { specs.append((label, pats)) }
            }
            for (label, patterns) in specs {
                guard let prm = RackBuilder.match(params, patterns, used) else { continue }
                used.insert(RackBuilder.pid(prm))
                // A limiter/clipper without a threshold knob uses its input gain instead: −3 dB threshold = +3 dB gain.
                var w = want[label]
                if label == "Thresh", let v = w, v.1 == "dB", !((prm["title"] as? String ?? "").lowercased().contains("thresh")),
                   slot.role == "limiter" || slot.role == "clipper" { w = (-v.0, v.1) }
                let t = w.flatMap { RackBuilder.solve(prm, value: $0.0, unit: $0.1) }
                knobs.append((label, prm, t))
            }
            // Knobs the template leaves to taste come first (in its order), else the main knob;
            // then the knobs that carry a starting value, then the rest.
            var first = slot.macros.compactMap { m in knobs.first { $0.0 == m } }
            if first.isEmpty, let head = knobs.first { first = [head] }
            // Compressors, limiters and clippers always get their working knob on a macro, ahead of everything else.
            if let main = RackBuilder.dynamicsKnob[slot.role], let k = knobs.first(where: { $0.0 == main }) {
                first.removeAll { $0.0 == main }
                first.insert(k, at: 0)
            }
            let rest = knobs.filter { k in !first.contains { $0.0 == k.0 } }
            found.append(first)
            later.append(rest.filter { $0.2 != nil } + rest.filter { $0.2 == nil })
            roles.append(slot.role)
            devices.append(RackWriter.Device(
                cid: RackBuilder.bytes(info["cid"] as? String ?? ""),
                processorState: info["proc"] as? String ?? "",
                controllerState: info["ctrl"] as? String ?? "",
                params: []))
        }

        guard !devices.isEmpty else {
            return ["ok": false, "msg": "None of these plugins can go into a rack as VST3.", "skipped": skipped]
        }

        // Main knob of every module first, then second knobs, up to 16 macros.
        let roleCount = Dictionary(grouping: roles, by: { $0 }).mapValues(\.count)
        var roleSeen: [String: Int] = [:]
        let prefixes: [String] = roles.map { r in
            roleSeen[r, default: 0] += 1
            let short = RackBuilder.roleShort[r] ?? r.capitalized
            return roleCount[r]! > 1 ? "\(short)\(roleSeen[r]!)" : short
        }
        // Phase 1: every module's first-choice knobs, taking turns; phase 2: the remaining knobs, taking turns.
        var queue: [(d: Int, knob: (label: String, param: [String: Any], target: Double?))] = []
        // Phase 0: the working knob of every compressor / limiter / clipper, so none is left without a macro.
        var dyn: [[(label: String, param: [String: Any], target: Double?)]] = []
        for (d, knobs) in found.enumerated() {
            if let main = RackBuilder.dynamicsKnob[roles[d]], let k = knobs.first, k.label == main {
                dyn.append([k]); found[d].removeFirst()
            } else { dyn.append([]) }
        }
        for phase in [dyn, found, later] {
            var round = 0
            while true {
                var any = false
                for (d, knobs) in phase.enumerated() where round < knobs.count { any = true; queue.append((d, knobs[round])) }
                if !any { break }
                round += 1
            }
        }
        for (d, knob) in queue where macros.count < 16 {
            do {
                let (label, prm, target) = knob
                // Live maps a macro linearly onto the parameter's own units (e.g. -60…0 dB).
                let lo = (prm["pmin"] as? Double) ?? 0, hi = (prm["pmax"] as? Double) ?? 1
                let norm = target ?? (prm["cur"] as? Double ?? 0)
                let plain = RackBuilder.plain(prm, at: norm) ?? (lo + norm * (hi - lo))
                let pos = hi != lo ? max(0, min(1, (plain - lo) / (hi - lo))) : 0
                devices[d].params.append(RackWriter.Mapping(paramId: RackBuilder.pid(prm), macro: macros.count, min: lo, max: hi))
                macros.append(RackWriter.Macro(name: "\(prefixes[d]) \(label)", value: (pos * 127 * 1000).rounded() / 1000))
            }
        }

        guard let lib = Ableton.userLibrary() else { return ["ok": false, "msg": "No Ableton User Library found"] }
        let folder = lib.appendingPathComponent("Presets/Audio Effects/Audio Effect Rack/PlugShelf", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let safe = RackBuilder.fileName(name)
        let file = folder.appendingPathComponent(safe + ".adg")
        let xml = RackWriter.xml(name: name, annotation: annotation, devices: devices, macros: macros)
        guard let gz = RackWriter.gzip(Data(xml.utf8)), (try? gz.write(to: file, options: .atomic)) != nil else {
            return ["ok": false, "msg": "Cannot save the rack"]
        }

        var out: [String: Any] = ["ok": true, "path": file.path, "name": safe, "macros": macros.map(\.name),
                                  "devices": devices.count, "skipped": skipped]
        if load {
            let r = RackBuilder.loadIntoLive(safe)
            out["loaded"] = r["ok"] as? Bool ?? false
            out["msg"] = r["msg"] ?? ""
            if r["offline"] as? Bool == true { out["offline"] = true }
        }
        return out
    }

    /// Asks the Live script to load the preset; Live needs a moment to notice a new file.
    static func loadIntoLive(_ name: String) -> [String: Any] {
        var r: [String: Any] = [:]
        for attempt in 0..<12 {
            r = Ableton.send(["op": "load_preset", "folder": "PlugShelf", "name": name], timeout: 1.5)
            if r["ok"] as? Bool == true || r["offline"] as? Bool == true || r["retry"] as? Bool != true { return r }
            if attempt == 3 { _ = Ableton.send(["op": "rescan_browser"], timeout: 1) }
            Thread.sleep(forTimeInterval: 0.8)
        }
        return r
    }

    // MARK: helpers

    static func pid(_ p: [String: Any]) -> UInt32 {
        if let n = p["id"] as? NSNumber { return n.uint32Value }
        return 0
    }

    static func bytes(_ hex: String) -> [UInt8] {
        var out: [UInt8] = []
        var i = hex.startIndex
        while i < hex.endIndex, let j = hex.index(i, offsetBy: 2, limitedBy: hex.endIndex) {
            out.append(UInt8(hex[i..<j], radix: 16) ?? 0)
            i = j
        }
        return out
    }

    static func fileName(_ s: String) -> String {
        let bad = CharacterSet(charactersIn: "/\\:*?\"<>|")
        let cleaned = s.components(separatedBy: bad).joined(separator: "-").trimmingCharacters(in: .whitespaces)
        return cleaned.isEmpty ? "PlugShelf Rack" : String(cleaned.prefix(80))
    }

    /// First usable parameter whose title matches the patterns, tried in order.
    static func match(_ params: [[String: Any]], _ patterns: [String], _ used: Set<UInt32>) -> [String: Any]? {
        let usable = params.filter { p in
            let f = (p["flags"] as? Int) ?? 0
            let steps = (p["steps"] as? Int) ?? 0
            // read-only, hidden, program change, bypass; and switches. Some makers (Softube, IK) give every knob
            // a step count (e.g. 60 or 238 positions) – those are knobs; real switches have a handful of positions.
            return f & (1 << 1) == 0 && f & (1 << 4) == 0 && f & (1 << 15) == 0 && f & (1 << 16) == 0 && (steps == 0 || steps >= 12)
                && !used.contains(pid(p))
        }
        for pat in patterns {
            guard let re = try? NSRegularExpression(pattern: pat, options: [.caseInsensitive]) else { continue }
            if let hit = usable.first(where: { p in
                let t = (p["title"] as? String ?? "").trimmingCharacters(in: .whitespaces)
                return re.firstMatch(in: t, range: NSRange(t.startIndex..., in: t)) != nil
            }) { return hit }
        }
        return nil
    }

    private static let number = try! NSRegularExpression(pattern: #"[-+]?\d+(?:[.,]\d+)?"#)

    private static func parse(_ text: String, unit: String) -> Double? {
        let t = text.trimmingCharacters(in: .whitespaces)
        if t.lowercased().contains("inf") { return t.contains("-") ? -1000 : 1000 }
        guard let m = number.firstMatch(in: t, range: NSRange(t.startIndex..., in: t)), let r = Range(m.range, in: t),
              var v = Double(t[r].replacingOccurrences(of: ",", with: ".")) else { return nil }
        let low = t.lowercased()
        if unit == "s" && low.contains("ms") { v /= 1000 }
        if unit == "ms" && low.range(of: #"\d\s*s\b"#, options: .regularExpression) != nil && !low.contains("ms") { v *= 1000 }
        return v
    }

    /// The parameter's plain value at a normalized position, from the sampled curve.
    static func plain(_ prm: [String: Any], at norm: Double) -> Double? {
        guard let samples = prm["samples"] as? [[Any]] else { return nil }
        let pts: [(Double, Double)] = samples.compactMap { s in
            guard s.count >= 3, let n = s[0] as? Double, let p = s[2] as? Double else { return nil }
            return (n, p)
        }
        guard pts.count >= 2 else { return nil }
        for k in 1..<pts.count where pts[k].0 >= norm {
            let (n0, p0) = pts[k - 1], (n1, p1) = pts[k]
            return n1 == n0 ? p0 : p0 + (norm - n0) / (n1 - n0) * (p1 - p0)
        }
        return pts.last?.1
    }

    /// The normalized value at which the plugin shows `value` (e.g. 25 %), from its sampled labels.
    static func solve(_ prm: [String: Any], value: Double, unit: String) -> Double? {
        guard let samples = prm["samples"] as? [[Any]] else { return nil }
        var pts: [(Double, Double)] = samples.compactMap { s in
            guard s.count >= 2, let n = s[0] as? Double, let t = s[1] as? String, let v = parse(t, unit: unit) else { return nil }
            return (n, v)
        }
        // A plugin that labels every position the same cannot tell us where a value sits.
        guard pts.count >= 2, Set(pts.map { ($0.1 * 1000).rounded() }).count >= 3 else { return nil }
        // A percentage shown as 0…1
        if unit == "%", (pts.map(\.1).max() ?? 0) <= 1.0001, !samples.contains(where: { ($0.last as? String ?? "").contains("%") }) {
            pts = pts.map { ($0.0, $0.1 * 100) }
        }
        for k in 1..<pts.count {
            let (n0, v0) = pts[k - 1], (n1, v1) = pts[k]
            if (v0 <= value && value <= v1) || (v1 <= value && value <= v0) {
                if v1 == v0 { return n0 }
                return n0 + (value - v0) / (v1 - v0) * (n1 - n0)
            }
        }
        return nil
    }

    /// Parameters and default state of a VST3 plugin, from cache or a helper process (two tries:
    /// the very first launch of a freshly installed app can be slowed down by macOS' checks).
    func readParams(_ p: Plugin) -> [String: Any]? {
        readParamsOnce(p) ?? readParamsOnce(p)
    }

    private func readParamsOnce(_ p: Plugin) -> [String: Any]? {
        let key = Classify.stableId(p.path, p.liveName, String(Int(p.mtime)))
        let cache = RackBuilder.cacheDir.appendingPathComponent(key + ".json")
        if let d = try? Data(contentsOf: cache), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { return o }

        let exe = Bundle.main.executablePath ?? CommandLine.arguments[0]
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: exe)
        proc.arguments = ["--params", p.path, p.liveName, cache.path]
        proc.standardOutput = FileHandle.nullDevice
        proc.standardError = FileHandle.nullDevice
        let done = DispatchSemaphore(value: 0)
        proc.terminationHandler = { _ in done.signal() }
        do { try proc.run() } catch { return nil }
        if done.wait(timeout: .now() + 30) == .timedOut {
            proc.terminate()
            _ = done.wait(timeout: .now() + 2)
            return nil
        }
        guard let d = try? Data(contentsOf: cache), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return nil }
        return o
    }
}
