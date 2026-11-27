import CPlugHost
import Foundation

/// Turns a plugin maker's own preset file into the state a VST3 plugin accepts (IComponent::setState).
/// Makers store presets in many formats; for each file there are one or more candidate states, and the
/// helper process keeps the first one the plugin really takes (its parameters change).
///
/// Formats:
/// - `.vstpreset` (Steinberg): the "Comp" chunk is the component state
/// - Arturia (no extension, "serialization::archive"): the file is the state
/// - `.fxp` program chunk (Synapse Audio, KORG, …): the chunk, with or without a length in front, or wrapped
/// - `.tide` (Eventide, JSON) and `.toy` (Soundtoys): the text inside the plugin's own VST2-style wrapper
enum PresetState {
    /// Candidate states for `file`, given the plugin's default state (for makers that wrap their data).
    static func candidates(file: URL, defaultState: [UInt8]) -> [(String, [UInt8])] {
        guard let raw = try? Data(contentsOf: file) else { return [] }
        let d = [UInt8](raw)
        let ext = file.pathExtension.lowercased()
        var out: [(String, [UInt8])] = []

        if ext == "vstpreset", let comp = vstpresetChunk(d, "Comp") { out.append(("vstpreset", comp)) }
        if d.starts(with: Array("22 serialization::archive".utf8)) { out.append(("archive", d)) }
        if d.count > 60, d.starts(with: Array("CcnK".utf8)), d[8..<12] == ArraySlice("FPCh".utf8) {
            let chunk = Array(d[60...])
            out.append(("fxp-le", le32(chunk.count) + chunk))
            out.append(("fxp-chunk", chunk))
            out.append(("fxp-file", d))
            if let w = wrap(defaultState, chunk) { out.append(("fxp-wrapped", w)) }
        }
        if ext == "tide", let w = wrap(defaultState, d) { out.append(("tide", w)) }
        if ext == "toy", let text = String(data: raw, encoding: .utf8) {
            // the plugin saves "PRESET =" where the preset file says "ARCHIVE ="
            for (name, t) in [("toy-preset", text.replacingOccurrences(of: "ARCHIVE =", with: "PRESET =")), ("toy", text)] {
                if let w = wrap(defaultState, Array(t.utf8)) { out.append((name, w)) }
            }
        }
        if out.isEmpty { out.append(("file", d)) }
        return out
    }

    /// A VST2-style bank chunk inside a VST3 state ("VstW" header, then "CcnK … FBCh"): the plugin's own
    /// header with new data and the two sizes recalculated.
    static func wrap(_ state: [UInt8], _ data: [UInt8]) -> [UInt8]? {
        guard state.count >= 176, state.starts(with: Array("VstW".utf8)), state[16..<20] == ArraySlice("CcnK".utf8),
              state[24..<28] == ArraySlice("FBCh".utf8) else { return nil }
        var head = Array(state[0..<172])
        let total = 172 + 4 + data.count
        head.replaceSubrange(20..<24, with: be32(total - 24))       // CcnK byte size: everything after this field
        return head + be32(data.count) + data
    }

    /// A chunk of a .vstpreset file: header "VST3", version, class id (32), offset of the chunk list.
    static func vstpresetChunk(_ d: [UInt8], _ id: String) -> [UInt8]? {
        guard d.count > 48, d.starts(with: Array("VST3".utf8)) else { return nil }
        let listAt = Int(readLE64(d, 40))
        guard listAt + 8 <= d.count, d[listAt..<listAt + 4] == ArraySlice("List".utf8) else { return nil }
        let n = Int(readLE32(d, listAt + 4))
        for i in 0..<n {
            let e = listAt + 8 + i * 20
            guard e + 20 <= d.count else { break }
            if d[e..<e + 4] == ArraySlice(id.utf8) {
                let off = Int(readLE64(d, e + 4)), size = Int(readLE64(d, e + 12))
                guard off >= 0, size >= 0, off + size <= d.count else { return nil }
                return Array(d[off..<off + size])
            }
        }
        return nil
    }

    static func le32(_ n: Int) -> [UInt8] { (0..<4).map { UInt8((n >> (8 * $0)) & 0xFF) } }
    static func be32(_ n: Int) -> [UInt8] { (0..<4).reversed().map { UInt8((n >> (8 * $0)) & 0xFF) } }
    static func readLE32(_ d: [UInt8], _ at: Int) -> UInt32 { (0..<4).reduce(0) { $0 | UInt32(d[at + $1]) << (8 * $1) } }
    static func readLE64(_ d: [UInt8], _ at: Int) -> UInt64 { (0..<8).reduce(0) { $0 | UInt64(d[at + $1]) << (8 * $1) } }

    /// Applies the preset to an opened plugin: tries the candidates until the parameters change.
    /// Returns the method that worked and how many parameters changed, or nil.
    static func apply(_ h: UnsafeMutableRawPointer, file: URL) -> (String, Int)? {
        var out: UnsafeMutablePointer<UInt8>?
        var len: Int32 = 0
        ph_vst3_get_state(h, &out, &len)
        let def = out.map { Array(UnsafeBufferPointer(start: $0, count: Int(len))) } ?? []
        free(out)
        let ids = paramIds(h)
        let before = ids.map { ph_vst3_param_value(h, $0) }
        for (method, cand) in candidates(file: file, defaultState: def) {
            let rc = cand.withUnsafeBufferPointer { ph_vst3_set_state(h, $0.baseAddress, Int32($0.count)) }
            let after = ids.map { ph_vst3_param_value(h, $0) }
            let changed = zip(before, after).filter { abs($0 - $1) > 1e-5 }.count
            if rc == 0 && changed > 0 { return (method, changed) }
            if !def.isEmpty { _ = def.withUnsafeBufferPointer { ph_vst3_set_state(h, $0.baseAddress, Int32($0.count)) } }
        }
        return nil
    }

    static func paramIds(_ h: UnsafeMutableRawPointer) -> [UInt32] {
        var title = [CChar](repeating: 0, count: 256), units = [CChar](repeating: 0, count: 64)
        let n = min(Int(ph_vst3_param_count(h)), 3000)
        return (0..<n).compactMap { i in
            var id: UInt32 = 0, def = 0.0, steps: Int32 = 0, flags: Int32 = 0
            return ph_vst3_param_info(h, Int32(i), &id, &title, Int32(title.count), &units, Int32(units.count), &def, &steps, &flags) != 0 ? id : nil
        }
    }
}
