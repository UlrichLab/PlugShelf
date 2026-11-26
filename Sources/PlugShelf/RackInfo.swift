import Foundation

/// Reads a rack preset (.adg) for the details panel: the devices in it and what lies on each macro.
/// VST3 plugins are named from their class id (matched against the scanned library), Live's own devices
/// by their device type; parameter names come from PlugShelf's parameter cache when a plugin was read before.
enum RackInfo {
    private static let nativeNames: [String: String] = [
        "Compressor2": "Compressor", "GlueCompressor": "Glue Compressor", "Eq8": "EQ Eight", "FilterEQ3": "EQ Three",
        "MultibandDynamics": "Multiband Dynamics", "Limiter": "Limiter", "Saturator": "Saturator", "Overdrive": "Overdrive",
        "Pedal": "Pedal", "DrumBuss": "Drum Buss", "Redux2": "Redux", "Erosion": "Erosion", "Vinyl": "Vinyl Distortion",
        "AutoFilter": "Auto Filter", "AutoFilter2": "Auto Filter", "AutoPan": "Auto Pan", "Chorus2": "Chorus-Ensemble",
        "PhaserNew": "Phaser-Flanger", "Flanger": "Flanger", "Phaser": "Phaser", "Delay": "Delay", "Echo": "Echo",
        "FilterDelay": "Filter Delay", "PingPongDelay": "Ping Pong Delay", "Reverb": "Reverb", "Hybrid": "Hybrid Reverb",
        "StereoGain": "Utility", "Tuner": "Tuner", "SpectrumAnalyzer": "Spectrum", "Gate": "Gate", "Amp": "Amp",
        "Cabinet": "Cabinet", "Corpus": "Corpus", "Resonator": "Resonators", "FrequencyShifter": "Frequency Shifter",
        "GrainDelay": "Grain Delay", "BeatRepeat": "Beat Repeat", "Looper": "Looper", "Shifter": "Shifter",
        "Roar": "Roar", "Transmute": "Spectral Resonator", "SpectralTime": "Spectral Time", "ColorLimiter": "Color Limiter",
        "Vocoder": "Vocoder", "AudioEffectGroupDevice": "Audio Effect Rack", "InstrumentGroupDevice": "Instrument Rack",
        "DrumGroupDevice": "Drum Rack", "MidiEffectGroupDevice": "MIDI Effect Rack", "MxDeviceAudioEffect": "Max for Live device",
        "MxDeviceInstrument": "Max for Live instrument", "MxDeviceMidiEffect": "Max for Live MIDI effect",
        "OriginalSimpler": "Simpler", "MultiSampler": "Sampler", "InstrumentVector": "Wavetable", "Operator": "Operator",
        "UltraAnalog": "Analog", "Collision": "Collision", "LoungeLizard": "Electric", "StringStudio": "Tension",
        "Drift": "Drift", "Meld": "Meld", "MidiArpeggiator": "Arpeggiator", "MidiChord": "Chord", "MidiScale": "Scale",
        "MidiNoteLength": "Note Length", "MidiPitcher": "Pitch", "MidiRandom": "Random", "MidiVelocity": "Velocity",
    ]

    /// class id (32 hex chars, lower case) → (plugin name, [param id: title]) from the library and the parameter cache.
    private static func catalog(_ lib: Library?) -> (names: [String: String], params: [String: [Int: String]]) {
        var names: [String: String] = [:]
        for p in lib?.plugins ?? [] where p.format == "VST3" {
            let k = p.uid.lowercased().filter(\.isHexDigit)
            if k.count == 32, names[k] == nil { names[k] = p.display.isEmpty ? p.name : p.display }
        }
        var params: [String: [Int: String]] = [:]
        let dir = Paths.support.appendingPathComponent("params", isDirectory: true)
        for f in (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? [] where f.pathExtension == "json" {
            guard let d = try? Data(contentsOf: f), let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any],
                  let cid = (o["cid"] as? String)?.lowercased().filter(\.isHexDigit), let ps = o["params"] as? [[String: Any]] else { continue }
            var m: [Int: String] = [:]
            for p in ps { if let id = p["id"] as? Int, let t = p["title"] as? String { m[id] = t } }
            params[cid] = m
        }
        return (names, params)
    }

    static func info(_ url: URL, library: Library?) -> [String: Any] {
        guard let raw = try? Data(contentsOf: url), let xml = gunzipString(raw) else { return ["ok": false, "msg": "Cannot read the rack file"] }
        let cat = catalog(library)
        struct Dev { var name: String; var kind: String; var cid = ""; var maps: [(param: Int, macro: Int)] = [] }
        var devs: [Dev] = []

        // walk the file once, in order: device starts, class-id fields, parameter→macro mappings
        let re = try! NSRegularExpression(pattern:
            #"<Vst3Preset |<AbletonDevicePreset[^>]*>\s*<OverwriteProtectionNumber[^>]*>\s*<Device>\s*<(\w+)|<PluginDevice |<PlugName Value="([^"]*)"|<Fields\.(\d) Value="(-?\d+)"|<ParameterId Value="(-?\d+)"\s*/>\s*(?:<[^>]*>\s*)*?<MacroControlIndex Value="(-?\d+)""#)
        var fields = [UInt32](repeating: 0, count: 4)
        let ns = xml as NSString
        for m in re.matches(in: xml, range: NSRange(location: 0, length: ns.length)) {
            let whole = ns.substring(with: m.range)
            func g(_ i: Int) -> String? { m.range(at: i).location == NSNotFound ? nil : ns.substring(with: m.range(at: i)) }
            if whole.hasPrefix("<Vst3Preset") { devs.append(Dev(name: "VST3 plugin", kind: "vst3")); fields = [0, 0, 0, 0] }
            else if let t = g(1) { devs.append(Dev(name: nativeNames[t] ?? t, kind: "live")) }
            else if whole.hasPrefix("<PluginDevice") { devs.append(Dev(name: "Plugin", kind: "plugin")) }
            else if let n = g(2), !n.isEmpty, !devs.isEmpty, devs[devs.count - 1].kind == "plugin" { devs[devs.count - 1].name = n }
            else if let i = g(3).flatMap(Int.init), let v = g(4).flatMap(Int64.init), !devs.isEmpty, devs[devs.count - 1].kind == "vst3", i < 4 {
                fields[i] = UInt32(truncatingIfNeeded: v)
                if i == 3 {
                    let cid = fields.map { String(format: "%08x", $0) }.joined()
                    devs[devs.count - 1].cid = cid
                    if let n = cat.names[cid] { devs[devs.count - 1].name = n }
                }
            }
            else if let p = g(5).flatMap(Int.init), let mc = g(6).flatMap(Int.init), mc >= 0, !devs.isEmpty { devs[devs.count - 1].maps.append((p, mc)) }
        }

        // macro names (only the ones in use or renamed)
        var macroNames: [Int: String] = [:]
        let mre = try! NSRegularExpression(pattern: #"<MacroDisplayNames\.(\d+) Value="([^"]*)""#)
        for m in mre.matches(in: xml, range: NSRange(location: 0, length: ns.length)) {
            if let i = Int(ns.substring(with: m.range(at: 1))) , macroNames[i] == nil { macroNames[i] = ns.substring(with: m.range(at: 2)) }
        }
        var macros: [Int: [String]] = [:]
        for d in devs {
            for mp in d.maps {
                let title = cat.params[d.cid]?[mp.param] ?? "parameter \(mp.param)"
                macros[mp.macro, default: []].append("\(d.name) › \(title)")
            }
        }
        let used = Set(macros.keys).union(macroNames.filter { !$0.value.isEmpty && !$0.value.hasPrefix("Macro ") }.keys)
        let macroList: [[String: Any]] = used.sorted().map { i in ["index": i + 1, "name": macroNames[i] ?? "Macro \(i + 1)", "targets": macros[i] ?? []] }
        let deviceList: [[String: Any]] = devs.filter { $0.name != "AudioBranchMixerDevice" }.map { ["name": $0.name, "kind": $0.kind] }
        return ["ok": true, "devices": deviceList, "macros": macroList]
    }

    static func gunzipString(_ d: Data) -> String? {
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("plugshelf-adg-\(UUID().uuidString).gz")
        defer { try? FileManager.default.removeItem(at: tmp) }
        guard (try? d.write(to: tmp)) != nil else { return nil }
        let p = Process()
        p.executableURL = URL(fileURLWithPath: "/usr/bin/gunzip")
        p.arguments = ["-c", tmp.path]
        let pipe = Pipe(); p.standardOutput = pipe; p.standardError = Pipe()
        do { try p.run() } catch { return nil }
        let out = pipe.fileHandleForReading.readDataToEndOfFile()
        p.waitUntilExit()
        return p.terminationStatus == 0 ? String(data: out, encoding: .utf8) : nil
    }
}
