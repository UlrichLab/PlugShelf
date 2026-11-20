import CPlugHost
import Foundation

/// `PlugShelf --params <bundle path> <class name> <out.json>`
///
/// Helper process (like --capture, but without a window): opens one VST3 plugin and writes its
/// parameters (id, title, unit, default, current value and its text) plus its default state,
/// which Ableton needs to rebuild the plugin inside a rack preset.
enum ParamsMode {
    static let interesting = #"mix|wet|blend|amount|ceiling|output|feedback|thresh|ratio|attack|release|decay|time|size|pre.?delay|width|drive|depth|input|gain"#

    static func run(_ args: [String]) -> Never {
        guard args.count >= 3 else { fail("Usage: --params <path> <name> <out.json>") }
        let (path, name, out) = (args[0], args[1], URL(fileURLWithPath: args[2]))
        setvbuf(stdout, nil, _IOLBF, 0)
        ph_install_crash_guard()

        var err = [CChar](repeating: 0, count: 512)
        guard let h = ph_vst3_load(path, name, 0, &err, Int32(err.count)) else { fail(String(cString: err)) }

        var cid = [UInt8](repeating: 0, count: 16)
        var cname = [CChar](repeating: 0, count: 128)
        ph_vst3_class(h, &cid, &cname, Int32(cname.count))

        var params: [[String: Any]] = []
        let n = min(Int(ph_vst3_param_count(h)), 3000)
        var title = [CChar](repeating: 0, count: 512), units = [CChar](repeating: 0, count: 128), text = [CChar](repeating: 0, count: 256)
        for i in 0..<n {
            var id: UInt32 = 0, def = 0.0, steps: Int32 = 0, flags: Int32 = 0
            guard ph_vst3_param_info(h, Int32(i), &id, &title, Int32(title.count), &units, Int32(units.count), &def, &steps, &flags) != 0 else { continue }
            let cur = ph_vst3_param_value(h, id)
            ph_vst3_param_text(h, id, cur, &text, Int32(text.count))
            let t = String(cString: title)
            var entry: [String: Any] = [
                "id": id, "title": t, "units": String(cString: units),
                "def": def, "cur": cur, "steps": steps, "flags": flags, "text": String(cString: text),
                "pmin": ph_vst3_to_plain(h, id, 0), "pmax": ph_vst3_to_plain(h, id, 1),
            ]
            // For the knobs a chain cares about, how the plugin labels values across the range,
            // so the app can find e.g. the setting that reads "25 %" or "-1.0 dB".
            if t.range(of: Self.interesting, options: [.regularExpression, .caseInsensitive]) != nil {
                // Some plugins only label their current value, so turn the knob, read it, turn it back.
                entry["samples"] = (0...100).map { k -> [Any] in
                    let n = Double(k) / 100
                    ph_vst3_param_set(h, id, n)
                    ph_vst3_param_text(h, id, n, &text, Int32(text.count))
                    return [n, String(cString: text), ph_vst3_to_plain(h, id, n)]
                }
                ph_vst3_param_set(h, id, cur)
            }
            params.append(entry)
        }

        var proc: UnsafeMutablePointer<UInt8>?, ctrl: UnsafeMutablePointer<UInt8>?
        var procLen: Int32 = 0, ctrlLen: Int32 = 0
        ph_vst3_states(h, &proc, &procLen, &ctrl, &ctrlLen)
        func hex(_ p: UnsafeMutablePointer<UInt8>?, _ n: Int32) -> String {
            guard let p = p, n > 0 else { return "" }
            return (0..<Int(n)).map { String(format: "%02X", p[$0]) }.joined()
        }

        let obj: [String: Any] = [
            "class": String(cString: cname),
            "cid": cid.map { String(format: "%02X", $0) }.joined(),
            "params": params,
            "proc": hex(proc, procLen),
            "ctrl": hex(ctrl, ctrlLen),
        ]
        guard let d = try? JSONSerialization.data(withJSONObject: obj), (try? d.write(to: out, options: .atomic)) != nil else {
            fail("Cannot save the result")
        }
        print("PLUGSHELF-OK \(params.count)")
        fflush(stdout)
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
