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
        var preset: String? = nil      // a maker preset file, loaded into the plugin first (see PresetState)
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
        "inst": [("Cutoff", ["^cutoff", "filter ?cutoff", "^vcf ?cutoff", "^filter ?freq", "^brightness", "^cut ?off", "^flt.*cutoff"]), ("Reso", ["^reso", "filter ?reso", "^emphasis", "^peak$"]), ("Attack", ["^amp.*attack", "^vca.*attack", "^attack"]), ("Release", ["^amp.*release", "^vca.*release", "^release"]), ("Glide", ["^glide", "^portamento", "^porta"]), ("Volume", ["^master ?vol", "^volume", "^output", "^level$"])],
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

    /// More names makers give the same knob (UAD, Neve, API, Arturia, Valhalla, D16, Ozone …), tried after the role's own.
    static let more: [String: [String]] = [
        "Thresh": [#"^comp ?\d? ?thr"#, #"\bthresh"#, #"^max: input gain"#, #"^l thresh"#, #"^limiter gain"#],
        "Ratio": [#"^comp ?\d? ?rat"#, #"\bratio\b"#],
        "Attack": [#"^comp ?\d? ?(atk|attack)"#, #"\battack\b"#],
        "Release": [#"time ?c(o)?nst"#, #"^comp ?\d? ?(rcv|rcvr|rec|release)"#, #"recovery"#, #"\brelease\b"#],
        "Output": [#"\boutput\b"#, #"^comp ?\d? ?gain"#, #"make ?up"#, #"^output ?\d"#, #"out ?trim"#, #"output level"#, #"output volume"#, #"^level$"#],
        "Mix": [#"wet ?/ ?dry"#, #"dry ?/ ?wet"#, #"wet ?dry"#, #"^fx$"#, #"echo vol"#, #"parallel mix"#],
        "Decay": [#"t60"#, #"decay rate"#, #"^damp ?a"#, #"late size"#, #"late feedback"#, #"^feedback$"#, #"^space$"#, #"^time$"#],
        "PreDly": [#"pre.?dly"#, #"predelay"#, #"delay_?ms"#, #"^early delay"#],
        "Feedback": [#"repeats"#, #"^intensity"#, #"recirc"#, #"feedback amount"#],
        "Time": [#"echo ?1? ?time"#, #"^d1 time"#, #"echo ?rate"#, #"repeat rate"#, #"^delay time"#, #"^delay [ab]$"#, #"left delay time"#, #"delay 1 amount"#],
        "Tone": [#"^ch\d? ?tr$"#, #"high ?cut"#, #"highcut"#, #"low ?pass"#, #"^treble$"#, #"lp ?freq"#, #"\blpf\b"#, #"hf ?decay"#, #"^brightness$"#],
        "Low": [#"boost ?low"#, #"lowshelf gain"#, #"lo eq gain"#, #"\blf ?gain"#, #"lf boost"#, #"^bass$"#],
        "High": [#"boost ?high"#, #"highshelf gain"#, #"hi eq gain"#, #"\bhf ?gain"#, #"hf boost"#, #"^treble$"#],
        "Presence": [#"presence gain"#, #"\bmf ?gain"#, #"^mid$"#, #"^middle$"#, #"^presence$"#],
        "HPF": [#"highpass"#, #"hp ?filt"#, #"hp ?freq"#, #"low ?cut ?freq"#, #"^low ?cut$"#, #"^lowcut$"#, #"hi pass"#],
        "Drive": [#"input gain"#, #"mic gain"#, #"line gain"#, #"^input level"#, #"input drive"#, #"character drive"#, #"band 1 drive"#, #"^input$"#, #"^saturation$"#],
        "Gain": [#"^ch\d? ?vol$"#, #"^volume 1"#, #"^input$"#, #"^drive$"#],
        "Width": [#"width percent"#, #"global amount"#, #"stereo width"#, #"^width$"#],
        "Depth": [#"modulation ?depth"#, #"depth"#, #"^ratio$"#],
        "Rate": [#"mode i rate"#, #"manual rate"#, #"modrate"#, #"lfo rate"#, #"\brate\b"#],
        "Ceiling": [#"output level"#, #"out(put)? ?trim"#, #"max: output level"#],
        "Noise": [#"hiss noise"#, #"^noise"#],
        "Wow": [#"flutter"#, #"wow"#, #"motor"#],
        "LFO": [#"modulation ?depth"#, #"lfo ?amount"#, #"mod ?depth"#],
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

    func start(name: String, annotation: String, slots: [Slot], returns: Bool, library: Library?, load: Bool, core: String? = nil) -> Bool {
        lock.lock()
        if _progress.running { lock.unlock(); return false }
        _progress = Progress(running: true, done: 0, total: slots.count, current: "")
        _result = nil
        lock.unlock()
        DispatchQueue.global(qos: .userInitiated).async { [self] in
            let r = build(name: name, annotation: annotation, slots: slots, returns: returns, library: library, load: load, core: core)
            lock.lock(); _result = r; _progress.running = false; _progress.current = ""; lock.unlock()
        }
        return true
    }

    /// Which macros a chain would get, per module – without saving anything (for the chain's description).
    /// One plan at a time: requests from the page queue up instead of opening plugins side by side.
    private let planLock = NSLock()
    func plan(slots: [Slot], returns: Bool, library: Library?) -> [String: Any] {
        planLock.lock(); defer { planLock.unlock() }
        return build(name: "plan", annotation: "", slots: slots, returns: returns, library: library, load: false, dry: true)
    }

    private func build(name: String, annotation: String, slots: [Slot], returns: Bool, library: Library?, load: Bool, core: String? = nil, dry: Bool = false) -> [String: Any] {
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
        var allParams: [[[String: Any]]] = []      // per device: every parameter, for filling up the macros
        var slotOf: [Int] = []                     // per device: its slot in `slots`
        var unusable: [String] = []                // families whose plugin cannot be opened (crashes, licence)

        for (slotIndex, slot) in slots.enumerated() {
            let items = byFamily[slot.family] ?? []
            let display = items.first?.display ?? slot.family
            if !dry { lock.lock(); _progress.current = display; lock.unlock() }
            defer { if !dry { lock.lock(); _progress.done += 1; lock.unlock() } }

            let native = { (p: Plugin) in p.archs.isEmpty || p.archs.contains("arm64") || Scanner.machine != "arm64" }
            guard let p = items.filter({ $0.format == "VST3" && $0.status == "ok" && $0.liveFailed != true }).sorted(by: { native($0) && !native($1) }).first else {
                skipped.append("\(display) (no VST3)"); continue
            }
            if !native(p) { skipped.append("\(display) (Intel only)"); continue }
            let isInstrument = slot.role == "inst"
            if isInstrument && !devices.isEmpty { skipped.append("\(display) (only one instrument per rack)"); continue }
            var info: [String: Any]? = nil
            if let preset = slot.preset, !preset.isEmpty {
                info = readParams(p, preset: preset)
                if (info?["preset"] as? [String: Any])?["applied"] as? Bool != true {
                    skipped.append("preset “\(URL(fileURLWithPath: preset).lastPathComponent)” for \(display) (the plugin did not take it)")
                    info = readParams(p)
                }
            } else {
                info = readParams(p)
            }
            guard let info else { skipped.append("\(display) (cannot be opened)"); unusable.append(slot.family); continue }

            let params = (info["params"] as? [[String: Any]]) ?? []
            var knobs: [(String, [String: Any], Double?)] = []
            var used = Set<UInt32>()
            // A loaded preset keeps its own values; only what the chain asks for explicitly is changed.
            let presetApplied = (info["preset"] as? [String: Any])?["applied"] as? Bool == true
            var want = presetApplied ? [:] : RackBuilder.targets(role: slot.role, returns: returns)
            for (k, v) in slot.set { want[k] = v }
            if returns, slot.role == "reverb" || slot.role == "delay" { want["Mix"] = (100, "%") }
            // The role's knobs, plus any knob the template asks for that the role does not list.
            var specs = RackBuilder.macroSpecs[slot.role] ?? []
            for label in slot.macros + Array(slot.set.keys) where !specs.contains(where: { $0.0 == label }) {
                if let pats = RackBuilder.allSpecs[label] { specs.append((label, pats)) }
            }
            for (label, patterns) in specs {
                guard let prm = RackBuilder.match(params, patterns + (RackBuilder.more[label] ?? []), used,
                                                  stepped: RackBuilder.steppedOK.contains(label)) else { continue }
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
            allParams.append(params)
            slotOf.append(slotIndex)
            devices.append(RackWriter.Device(
                cid: RackBuilder.bytes(info["cid"] as? String ?? ""),
                processorState: info["proc"] as? String ?? "",
                controllerState: info["ctrl"] as? String ?? "",
                params: [], instrument: isInstrument,
                // "Plugin · Preset", for the rack's chain name and info text
                name: presetApplied ? "\(display) · \(URL(fileURLWithPath: slot.preset ?? "").deletingPathExtension().lastPathComponent)" : ""))
        }

        guard !devices.isEmpty else {
            return ["ok": false, "msg": "None of these plugins can go into a rack as VST3.", "skipped": skipped, "unusable": unusable]
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
            if roles[d] == "inst" {
                // the synth's own knobs (cutoff, resonance, envelope …) come before everything else, up to 6
                let all = knobs + later[d]
                dyn.append(Array(all.prefix(6)))
                found[d] = []
                later[d] = Array(all.dropFirst(6))
            } else if let main = RackBuilder.dynamicsKnob[roles[d]], let k = knobs.first, k.label == main {
                dyn.append([k]); found[d].removeFirst()
            } else { dyn.append([]) }
        }
        // Then every module's second knob (so each plugin has two before any gets a third), then the rest.
        var second: [[(label: String, param: [String: Any], target: Double?)]] = later.map { _ in [] }
        for d in later.indices {
            let have = dyn[d].count + found[d].count
            if have < 2, !later[d].isEmpty { second[d] = Array(later[d].prefix(2 - have)); later[d].removeFirst(second[d].count) }
        }
        var laterQueue: [(d: Int, knob: (label: String, param: [String: Any], target: Double?))] = []
        for (k, phase) in [dyn, found, second, later].enumerated() {
            var round = 0
            while true {
                var any = false
                for (d, knobs) in phase.enumerated() where round < knobs.count { any = true; if k < 3 { queue.append((d, knobs[round])) } else { laterQueue.append((d, knobs[round])) } }
                if !any { break }
                round += 1
            }
        }
        // a plugin whose own knobs give fewer than two macros takes further knobs before the others get more
        var reserve = 0
        do {
            var have = [Int](repeating: 0, count: devices.count)
            for q in queue { have[q.d] += 1 }
            for d in devices.indices {
                let need = devices[d].instrument ? 6 : 2     // a synth gets at least 6
                if have[d] < need { reserve += min(need - have[d], RackBuilder.extraKnobs(allParams[d]).count) }
            }
        }
        queue += laterQueue.prefix(max(0, 16 - queue.count - reserve))
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

        // Every plugin gets at least 2 macros, and a rack at least 8: further useful knobs, taking turns across the modules.
        var used = devices.map { Set($0.params.map(\.paramId)) }
        let picks = allParams.map { RackBuilder.extraKnobs($0) }
        func addExtra(_ d: Int) -> Bool {
            guard macros.count < 16, let prm = picks[d].first(where: { !used[d].contains(RackBuilder.pid($0)) }) else { return false }
            used[d].insert(RackBuilder.pid(prm))
            let lo = (prm["pmin"] as? Double) ?? 0, hi = (prm["pmax"] as? Double) ?? 1
            let norm = prm["cur"] as? Double ?? 0
            let plain = RackBuilder.plain(prm, at: norm) ?? (lo + norm * (hi - lo))
            let pos = hi != lo ? max(0, min(1, (plain - lo) / (hi - lo))) : 0
            devices[d].params.append(RackWriter.Mapping(paramId: RackBuilder.pid(prm), macro: macros.count, min: lo, max: hi))
            macros.append(RackWriter.Macro(name: "\(prefixes[d]) \(RackBuilder.shortTitle(prm["title"] as? String ?? ""))",
                                           value: (pos * 127 * 1000).rounded() / 1000))
            return true
        }
        // a synth gets more (it is what you play): at least 6, an effect at least 2
        for d in devices.indices { while devices[d].params.count < (devices[d].instrument ? 6 : 2), addExtra(d) {} }
        while macros.count < RackBuilder.minMacros {
            var any = false
            for d in devices.indices where macros.count < RackBuilder.minMacros { if addExtra(d) { any = true } }
            if !any { break }
        }

        // per slot: the knob labels on macros (for the chain's description)
        var slotMacros: [String: [String]] = [:]
        for (d, dev) in devices.enumerated() {
            slotMacros[String(slotOf[d])] = dev.params.map { m in
                let n = macros[m.macro].name
                return n.hasPrefix(prefixes[d] + " ") ? String(n.dropFirst(prefixes[d].count + 1)) : n
            }
        }
        if dry { return ["ok": true, "macros": macros.map(\.name), "slotMacros": slotMacros, "skipped": skipped, "unusable": unusable] }

        guard let lib = Ableton.userLibrary() else { return ["ok": false, "msg": "No Ableton User Library found"] }
        let instrument = devices.first?.instrument == true
        let folder = lib.appendingPathComponent(instrument ? "Presets/Instruments/Instrument Rack/PlugShelf Instruments"
                                                          : "Presets/Audio Effects/Audio Effect Rack/PlugShelf", isDirectory: true)
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let safe = RackBuilder.fileName(name)
        let file = folder.appendingPathComponent(safe + ".adg")
        // Plugins do not show a preset that comes with the rack, and Live ignores device titles in a rack preset:
        // the presets go into the chain's name (shown in the rack's chain list) and the rack's info text.
        let presetNames = devices.map(\.name).filter { !$0.isEmpty }
        let chainName = presetNames.joined(separator: "  |  ")
        let info = presetNames.isEmpty ? annotation : ([annotation] + ["Presets: " + presetNames.joined(separator: ", ")]).filter { !$0.isEmpty }.joined(separator: " – ")
        let xml = RackWriter.xml(name: name, annotation: info, devices: devices, macros: macros, instrument: instrument, chainName: chainName)
        guard let gz = RackWriter.gzip(Data(xml.utf8)), (try? gz.write(to: file, options: .atomic)) != nil else {
            return ["ok": false, "msg": "Cannot save the rack"]
        }

        var out: [String: Any] = ["ok": true, "path": file.path, "name": safe, "macros": macros.map(\.name),
                                  "devices": devices.count, "skipped": skipped, "instrument": instrument, "slotMacros": slotMacros, "unusable": unusable]
        if let core, !instrument {
            // no instrument plug-in for this chain: one of Live's own Drum Racks goes first (e.g. a percussion kit)
            out["core"] = core
            if load {
                let c = Ableton.send(["op": "load_core", "root": "drums", "name": core, "instrument": true], timeout: 2)
                if c["ok"] as? Bool != true { out["coreMsg"] = c["msg"] ?? "Live did not load \(core)" }
            }
        }
        if load {
            let r = instrument ? RackBuilder.loadInstrumentIntoLive(safe) : RackBuilder.loadIntoLive(safe)
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

    /// An Instrument Rack goes onto a MIDI track without an instrument (a new one after the selected track if needed).
    static func loadInstrumentIntoLive(_ name: String) -> [String: Any] {
        var r: [String: Any] = [:]
        for attempt in 0..<12 {
            r = Ableton.send(["op": "load_user", "folder": "PlugShelf Instruments", "name": name + ".adg", "instrument": true], timeout: 1.5)
            if r["ok"] as? Bool == true || r["offline"] as? Bool == true { return r }
            if attempt == 3 { _ = Ableton.send(["op": "rescan_browser"], timeout: 1) }
            Thread.sleep(forTimeInterval: 0.8)
        }
        return r
    }

    static let minMacros = 8

    /// Further knobs worth a macro when a rack has fewer than 8: the musically useful ones first, then any
    /// other automatable, continuous knob – never bypass, mode or meter switches, MIDI learn and the like.
    static func extraKnobs(_ params: [[String: Any]]) -> [[String: Any]] {
        let skip = try! NSRegularExpression(pattern: #"bypass|^on$|on/off|power|enable|active|midi|learn|program|preset|meter|oversampl|^parameter ?#|^param ?\d|mode$|^mode|select|link|solo|mute|polarity|invert|channel|zoom|page|^ui|display|undo|redo|^sync|panic|reset|random|lock|^hq|quality|latency|^tuning|voices|^poly|^unison voices|velocity|aftertouch|pitch ?bend|mod ?wheel|^bank"#, options: .caseInsensitive)
        let good = [#"^mix"#, #"dry ?/ ?wet|^wet"#, #"^amount"#, #"^drive|^satur"#, #"cutoff"#, #"^reso"#, #"^input"#, #"thresh"#, #"^attack"#, #"^release"#,
                    #"^decay"#, #"^time|delay time"#, #"^feedback"#, #"^size"#, #"pre.?delay"#, #"^width"#, #"^depth"#, #"^rate|^speed"#, #"^tone|^colou?r|^character"#,
                    #"^low|^bass"#, #"^high|^treble|^air"#, #"^mid"#, #"^freq"#, #"^macro|^timbre|^brightness"#, #"^output|^gain$|^level$|^volume"#]
        func title(_ p: [String: Any]) -> String { p["title"] as? String ?? "" }
        let ok = params.filter { p in
            let f = (p["flags"] as? Int) ?? 1
            let t = title(p)
            // automatable, not read-only / hidden / program change / bypass; continuous or with many steps
            guard f & 1 != 0, f & (2 | 16 | 32768 | 65536) == 0, !t.isEmpty else { return false }
            let steps = (p["steps"] as? Int) ?? 0
            guard steps == 0 || steps > 8 else { return false }
            return skip.firstMatch(in: t, range: NSRange(t.startIndex..., in: t)) == nil
        }
        var out: [[String: Any]] = []
        var seen = Set<UInt32>()
        for pat in good {
            for p in ok where !seen.contains(pid(p)) && title(p).range(of: pat, options: [.regularExpression, .caseInsensitive]) != nil {
                out.append(p); seen.insert(pid(p))
            }
        }
        for p in ok where !seen.contains(pid(p)) { out.append(p); seen.insert(pid(p)) }
        // a plugin with only stepped controls (e.g. Studio D Chorus: one mode selector) offers those
        if out.isEmpty {
            out = params.filter { p in
                let f = (p["flags"] as? Int) ?? 1, t = title(p), steps = (p["steps"] as? Int) ?? 0
                return f & 1 != 0 && f & (2 | 16 | 32768 | 65536) == 0 && steps >= 2 && !t.isEmpty
                    && t.range(of: #"bypass|power|meter|midi|program|preset|oversampl|dither"#, options: [.regularExpression, .caseInsensitive]) == nil
            }
        }
        return out
    }

    /// A short macro label from a plugin's parameter title ("Amplifier Env Release" → "Amp Env Release").
    static func shortTitle(_ t: String) -> String {
        var s = t.replacingOccurrences(of: "Amplifier", with: "Amp").replacingOccurrences(of: "Frequency", with: "Freq")
            .replacingOccurrences(of: "Resonance", with: "Reso").replacingOccurrences(of: "Envelope", with: "Env")
        if s.count > 16 { s = String(s.prefix(16)).trimmingCharacters(in: .whitespaces) }
        return s
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
    /// Knobs that may be stepped switches on vintage units (a 4-position ratio, a 6-position attack); never Mix, Width or Rate.
    static let steppedOK: Set<String> = ["Thresh", "Ratio", "Attack", "Release", "Time", "Drive", "Gain", "Output", "HPF", "Low", "High", "Presence", "Tone", "PreDly", "Decay", "Freq"]

    static func match(_ params: [[String: Any]], _ patterns: [String], _ used: Set<UInt32>, stepped allowStepped: Bool = false) -> [String: Any]? {
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
        // Stepped knobs (attack, release, ratio of UAD/Neve/API units with 3–11 positions) when nothing continuous fits;
        // on/off switches (1 step) stay out.
        guard allowStepped else { return nil }
        let stepped = params.filter { p in
            let f = (p["flags"] as? Int) ?? 0
            let steps = (p["steps"] as? Int) ?? 0
            return f & (1 << 1) == 0 && f & (1 << 4) == 0 && f & (1 << 15) == 0 && f & (1 << 16) == 0 && steps >= 2 && steps < 12
                && !used.contains(pid(p))
        }
        for pat in patterns {
            guard let re = try? NSRegularExpression(pattern: pat, options: [.caseInsensitive]) else { continue }
            if let hit = stepped.first(where: { p in
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
    func readParams(_ p: Plugin, preset: String? = nil) -> [String: Any]? {
        readParamsOnce(p, preset: preset) ?? readParamsOnce(p, preset: preset)
    }

    private func readParamsOnce(_ p: Plugin, preset: String? = nil) -> [String: Any]? {
        var key = Classify.stableId(p.path, p.liveName, String(Int(p.mtime)))
        if let preset {
            let mt = (try? FileManager.default.attributesOfItem(atPath: preset)[.modificationDate] as? Date)?.timeIntervalSince1970 ?? 0
            key = Classify.stableId(key, preset, String(Int(mt)))
        }
        let cache = RackBuilder.cacheDir.appendingPathComponent(key + ".json")
        if let d = try? Data(contentsOf: cache), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { return o }
        // a plugin that crashed or refused to open is not tried again until it changes (the key holds its file date)
        let failed = RackBuilder.cacheDir.appendingPathComponent(key + ".failed")
        if FileManager.default.fileExists(atPath: failed.path) { return nil }

        let exe = Bundle.main.executablePath ?? CommandLine.arguments[0]
        let proc = Process()
        proc.executableURL = URL(fileURLWithPath: exe)
        proc.arguments = ["--params", p.path, p.liveName, cache.path] + (preset.map { [$0] } ?? [])
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
        guard let d = try? Data(contentsOf: cache), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else {
            // remembered only for a real failure of the helper (crash, licence error), not for a slow first start
            if proc.terminationReason == .uncaughtSignal || proc.terminationStatus != 0 { FileManager.default.createFile(atPath: failed.path, contents: nil) }
            return nil
        }
        return o
    }
}
