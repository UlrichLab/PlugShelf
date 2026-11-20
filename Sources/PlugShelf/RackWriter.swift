import Compression
import Foundation

/// Writes an Ableton Live Audio Effect Rack preset (.adg): one chain with VST3 plugins in order and
/// up to 16 named macros mapped to plugin parameters.
///
/// The format follows a rack Live 12.4 saved itself:
/// - the rack is a GroupDevicePreset; its chain lives in BranchPresets/AudioEffectBranchPreset/DevicePresets,
/// - each plugin there is a bare Vst3Preset (plugin id, processor/controller state, parameter list),
/// - a mapping is a PluginParameterSettings entry with MacroControlIndex and a MidiControllerRange
///   in the parameter's own units (e.g. -60…0 dB for a threshold),
/// - every automation/modulation id and LomId is 0; Live assigns real ones on load.
enum RackWriter {
    struct Mapping {
        var paramId: UInt32
        var macro: Int
        var min: Double            // plain value at the macro's 0
        var max: Double            // plain value at the macro's 127
    }

    struct Device {
        var cid: [UInt8]           // 16 bytes
        var processorState: String // hex
        var controllerState: String
        var params: [Mapping]
    }

    struct Macro {
        var name: String
        var value: Double          // 0...127
    }

    static func esc(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;").replacingOccurrences(of: "\"", with: "&quot;")
    }

    private static func num(_ d: Double) -> String {
        if d == d.rounded() && abs(d) < 1e9 { return String(Int(d)) }
        return String(format: "%.10g", d)
    }

    private static func uidFields(_ cid: [UInt8]) -> String {
        (0..<4).map { i -> String in
            let b = cid.count == 16 ? Array(cid[i * 4..<i * 4 + 4]) : [0, 0, 0, 0]
            let u = UInt32(b[0]) << 24 | UInt32(b[1]) << 16 | UInt32(b[2]) << 8 | UInt32(b[3])
            return "<Fields.\(i) Value=\"\(Int32(bitPattern: u))\" />"
        }.joined()
    }

    /// Live wraps long hex blobs over lines; it reads them either way.
    private static func blob(_ hex: String) -> String {
        guard !hex.isEmpty else { return "" }
        var lines: [String] = []
        var i = hex.startIndex
        while i < hex.endIndex {
            let j = hex.index(i, offsetBy: 80, limitedBy: hex.endIndex) ?? hex.endIndex
            lines.append(String(hex[i..<j]))
            i = j
        }
        return "\n" + lines.joined(separator: "\n") + "\n"
    }

    private static func deviceXML(_ d: Device, index: Int) -> String {
        let params = d.params.enumerated().map { k, p in
            "<PluginParameterSettings Id=\"\(k)\"><Index Value=\"\(k)\" /><VisualIndex Value=\"\(k)\" /><ParameterId Value=\"\(p.paramId)\" />"
                + "<Type Value=\"PluginFloatParameter\" /><MacroControlIndex Value=\"\(p.macro)\" />"
                + "<MidiControllerRange><MidiControllerRange Id=\"0\"><Min Value=\"\(num(p.min))\" /><Max Value=\"\(num(p.max))\" /></MidiControllerRange></MidiControllerRange>"
                + "<LomId Value=\"0\" /></PluginParameterSettings>"
        }.joined()
        let uid = uidFields(d.cid)
        return "<Vst3Preset Id=\"\(index)\"><OverwriteProtectionNumber Value=\"3076\" /><MpeEnabled Value=\"2\" />"
            + "<MpeSettings><ZoneType Value=\"0\" /><FirstNoteChannel Value=\"1\" /><LastNoteChannel Value=\"15\" /></MpeSettings>"
            + "<ParameterSettings>\(params)</ParameterSettings>"
            + "<IsOn Value=\"true\" /><PowerMacroControlIndex Value=\"-1\" /><PowerMacroMappingRange><Min Value=\"64\" /><Max Value=\"127\" /></PowerMacroMappingRange>"
            + "<IsFolded Value=\"false\" /><StoredAllParameters Value=\"true\" /><DeviceLomId Value=\"0\" /><DeviceViewLomId Value=\"0\" />"
            + "<IsOnLomId Value=\"0\" /><ParametersListWrapperLomId Value=\"0\" /><Uid>\(uid)</Uid><DeviceType Value=\"2\" />"
            + "<ProcessorState>\(blob(d.processorState))</ProcessorState><ControllerState>\(blob(d.controllerState))</ControllerState>"
            + "<Name Value=\"\" /><PresetRef /></Vst3Preset>"
    }

    static func xml(name: String, annotation: String, devices: [Device], macros: [Macro]) -> String {
        let m = (0..<16).map { i in i < macros.count ? macros[i] : Macro(name: "Macro \(i + 1)", value: 0) }
        let target = "<AutomationTarget Id=\"0\"><LockEnvelope Value=\"0\" /></AutomationTarget><ModulationTarget Id=\"0\"><LockEnvelope Value=\"0\" /></ModulationTarget>"
        var r = "<LomId Value=\"0\" /><LomIdView Value=\"0\" /><IsExpanded Value=\"true\" /><BreakoutIsExpanded Value=\"false\" />"
        r += "<On><LomId Value=\"0\" /><Manual Value=\"true\" /><AutomationTarget Id=\"0\"><LockEnvelope Value=\"0\" /></AutomationTarget><MidiCCOnOffThresholds><Min Value=\"64\" /><Max Value=\"127\" /></MidiCCOnOffThresholds></On>"
        r += "<ModulationSourceCount Value=\"0\" /><ParametersListWrapper LomId=\"0\" /><Pointee Id=\"0\" /><LastSelectedTimeableIndex Value=\"0\" /><LastSelectedClipEnvelopeIndex Value=\"0\" />"
        r += "<LastPresetRef><Value /></LastPresetRef><LockedScripts /><IsFolded Value=\"false\" /><ShouldShowPresetName Value=\"true\" /><UserName Value=\"\" />"
        r += "<Annotation Value=\"\(esc(annotation))\" /><SourceContext><Value /></SourceContext><MpePitchBendUsesTuning Value=\"true\" /><ViewData Value=\"{}\" />"
        r += "<OverwriteProtectionNumber Value=\"3076\" /><Branches /><IsBranchesListVisible Value=\"false\" /><IsReturnBranchesListVisible Value=\"false\" />"
        r += "<IsRangesEditorVisible Value=\"false\" /><AreDevicesVisible Value=\"true\" /><NumVisibleMacroControls Value=\"\(macros.count <= 8 ? 8 : 16)\" />"
        for (i, x) in m.enumerated() {
            r += "<MacroControls.\(i)><LomId Value=\"0\" /><Manual Value=\"\(num(x.value))\" /><MidiControllerRange><Min Value=\"0\" /><Max Value=\"127\" /></MidiControllerRange>\(target)</MacroControls.\(i)>"
        }
        for (i, x) in m.enumerated() { r += "<MacroDisplayNames.\(i) Value=\"\(esc(x.name))\" />" }
        for i in 0..<16 { r += "<MacroDefaults.\(i) Value=\"-1\" />" }
        for i in 0..<16 { r += "<MacroAnnotations.\(i) Value=\"\" />" }
        for i in 0..<16 { r += "<ForceDisplayGenericValue.\(i) Value=\"false\" />" }
        r += "<AreMacroControlsVisible Value=\"true\" /><IsAutoSelectEnabled Value=\"false\" />"
        r += "<ChainSelector><LomId Value=\"0\" /><Manual Value=\"0\" /><MidiControllerRange><Min Value=\"0\" /><Max Value=\"127\" /></MidiControllerRange>\(target)</ChainSelector>"
        r += "<ChainSelectorRelativePosition Value=\"-1073741824\" /><ViewsToRestoreWhenUnfolding Value=\"0\" /><ReturnBranches /><BranchesSplitterProportion Value=\"0.5\" /><ShowBranchesInSessionMixer Value=\"false\" />"
        for i in 0..<16 { r += "<MacroColor.\(i) Value=\"-1\" />" }
        r += "<LockId Value=\"0\" /><LockSeal Value=\"0\" /><ChainsListWrapper LomId=\"0\" /><ReturnChainsListWrapper LomId=\"0\" /><MacroVariations><MacroSnapshots /></MacroVariations>"
        for i in 0..<16 { r += "<ExcludeMacroFromRandomization.\(i) Value=\"false\" />" }
        for i in 0..<16 { r += "<ExcludeMacroFromSnapshots.\(i) Value=\"false\" />" }
        r += "<AreMacroVariationsControlsVisible Value=\"false\" />"

        let devs = devices.enumerated().map { deviceXML($0.element, index: $0.offset) }.joined()
        let branch = "<AudioEffectBranchPreset Id=\"0\"><Name Value=\"\" /><IsSoloed Value=\"false\" /><DevicePresets>\(devs)</DevicePresets>"
            + "<MixerPreset>\(RackTemplates.chainMixer)</MixerPreset>"
            + "<BranchSelectorRange><Min Value=\"0\" /><Max Value=\"0\" /><CrossfadeMin Value=\"0\" /><CrossfadeMax Value=\"0\" /></BranchSelectorRange>"
            + "<SessionViewBranchWidth Value=\"55\" /><DocumentColorIndex Value=\"67\" /><AutoColored Value=\"true\" /><AutoColorScheme Value=\"0\" /><SourceContext /></AudioEffectBranchPreset>"

        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <Ableton MajorVersion="5" MinorVersion="12.0_12402" SchemaChangeCount="5" Creator="Ableton Live 12.4.16" Revision="e33287a1c79501580a1e0f9f907e320757d3be44">
        <GroupDevicePreset><OverwriteProtectionNumber Value="3076" /><Device><AudioEffectGroupDevice Id="0">\(r)</AudioEffectGroupDevice></Device>\
        <PresetRef /><BranchPresets>\(branch)</BranchPresets><ReturnBranchPresets /></GroupDevicePreset>
        </Ableton>

        """
    }

    // MARK: gzip

    private static let crcTable: [UInt32] = (0..<256).map { n -> UInt32 in
        var c = UInt32(n)
        for _ in 0..<8 { c = (c & 1) != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
        return c
    }

    private static func crc32(_ d: Data) -> UInt32 {
        var c: UInt32 = 0xFFFF_FFFF
        for b in d { c = crcTable[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8) }
        return c ^ 0xFFFF_FFFF
    }

    /// Live's presets are gzip files. NSData's "zlib" is a raw DEFLATE stream; wrap it.
    static func gzip(_ d: Data) -> Data? {
        guard let deflated = try? (d as NSData).compressed(using: .zlib) as Data else { return nil }
        var out = Data([0x1F, 0x8B, 0x08, 0x00, 0, 0, 0, 0, 0x00, 0x03])
        out.append(deflated)
        var crc = crc32(d).littleEndian, size = UInt32(truncatingIfNeeded: d.count).littleEndian
        out.append(Data(bytes: &crc, count: 4))
        out.append(Data(bytes: &size, count: 4))
        return out
    }
}
