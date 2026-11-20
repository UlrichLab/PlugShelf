import Foundation

/// Names, makers and categories: turning raw bundle metadata into something to browse by.
enum Classify {

    // MARK: keys

    /// Lower-case letters and digits only, accents removed.
    static func key(_ s: String) -> String {
        let folded = s.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
        return String(folded.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) && $0.isASCII }.map(Character.init))
    }

    private static let suffixPatterns: [NSRegularExpression] = [
        #"\s*[\(\[]\s*(mono|stereo|m|s|ms|m/s|mono/stereo|stereo/mono|mono\s*>\s*stereo|5\.1|7\.1|surround|x64|64[- ]?bit|vst3?|au|aax|clap|native|dsp)\s*[\)\]]$"#,
        #"\s+(mono|stereo|m|s)\s*/\s*(mono|stereo|5\.1|7\.1|\d\.\d(\.\d)?)$"#,
        #"\s+(mono|stereo|mono/stereo|x64|vst3?|vst2|au|aax|clap|64[- ]?bit)$"#,
        #"[-_ ](vst3?|au|aax|clap)$"#,
    ].map { try! NSRegularExpression(pattern: $0, options: [.caseInsensitive]) }

    /// "Magma Lil Tube Stereo" -> "Magma Lil Tube", "Foo (VST3)" -> "Foo".
    private static let hookRe = try! NSRegularExpression(pattern: #"^iZ(?=[A-Z])|(AAX|AU|VST3?)?Hook$"#)

    static func cleanName(_ s: String) -> String {
        var out = s.trimmingCharacters(in: CharacterSet.whitespaces.union(CharacterSet(charactersIn: "_")))
        // iZotope's Pro Tools / AU helper bundles: "iZRX9De-clickAAXHook" -> "RX9De-click"
        out = hookRe.stringByReplacingMatches(in: out, range: NSRange(out.startIndex..., in: out), withTemplate: "")
        var changed = true
        while changed {
            changed = false
            for re in suffixPatterns {
                let r = NSRange(out.startIndex..., in: out)
                let next = re.stringByReplacingMatches(in: out, range: r, withTemplate: "")
                    .trimmingCharacters(in: .whitespaces)
                if next != out && !next.isEmpty { out = next; changed = true }
            }
        }
        return out
    }

    // MARK: makers

    private static let vendorAliases: [String: String] = [
        "pluginalliance": "Plugin Alliance", "brainworx": "Plugin Alliance", "brainworxaudio": "Plugin Alliance",
        "nativeinstruments": "Native Instruments", "nativeinstrumentsgmbh": "Native Instruments", "ni": "Native Instruments",
        "universalaudio": "Universal Audio", "uaudio": "Universal Audio", "universalaudioinc": "Universal Audio", "uad": "Universal Audio",
        "izotope": "iZotope", "izotopeinc": "iZotope",
        "fabfilter": "FabFilter",
        "soundtoys": "Soundtoys", "soundtoysinc": "Soundtoys",
        "xferrecords": "Xfer Records", "xfer": "Xfer Records",
        "arturia": "Arturia",
        "waves": "Waves", "wavesaudio": "Waves", "wavesaudioltd": "Waves",
        "meldaproduction": "MeldaProduction", "melda": "MeldaProduction",
        "valhalladsp": "Valhalla DSP", "valhalla": "Valhalla DSP", "valhalladspllc": "Valhalla DSP",
        "uhe": "u-he",
        "spectrasonics": "Spectrasonics",
        "toontrack": "Toontrack",
        "ikmultimedia": "IK Multimedia", "ik": "IK Multimedia",
        "softube": "Softube",
        "slatedigital": "Slate Digital",
        "eventide": "Eventide", "eventideinc": "Eventide", "eventideaudio": "Eventide",
        "babyaudio": "BABY Audio", "babyaud": "BABY Audio",
        "antares": "Antares", "antaresaudiotechnologies": "Antares", "antarestech": "Antares",
        "sugarbytes": "Sugar Bytes",
        "cableguys": "Cableguys",
        "kilohearts": "Kilohearts", "kiloheartsab": "Kilohearts",
        "oeksound": "oeksound",
        "sonnox": "Sonnox",
        "sonible": "sonible",
        "nugenaudio": "NUGEN Audio", "nugen": "NUGEN Audio",
        "klanghelm": "Klanghelm",
        "d16group": "D16 Group", "d16": "D16 Group",
        "korg": "KORG",
        "roland": "Roland", "rolandcloud": "Roland",
        "solidstatelogic": "Solid State Logic", "ssl": "Solid State Logic",
        "sonarworks": "Sonarworks",
        "voxengo": "Voxengo",
        "wavesfactory": "Wavesfactory",
        "polyversemusic": "Polyverse", "polyverse": "Polyverse",
        "output": "Output", "outputinc": "Output",
        "unfilteredaudio": "Unfiltered Audio",
        "appliedacousticssystems": "Applied Acoustics Systems", "aas": "Applied Acoustics Systems",
        "moog": "Moog", "moogmusic": "Moog",
        "soundparticles": "Sound Particles",
        "strymon": "Strymon",
        "bozdigitallabs": "Boz Digital Labs", "bozdigital": "Boz Digital Labs",
        "musicdevelopments": "Music Developments",
        "pluginboutique": "Plugin Boutique",
        "xlnaudio": "XLN Audio",
        "spitfireaudio": "Spitfire Audio",
        "steinberg": "Steinberg",
        "celemony": "Celemony",
        "goodhertz": "Goodhertz",
        "tokyodawnrecords": "Tokyo Dawn Records", "tokyodawn": "Tokyo Dawn Records", "tdr": "Tokyo Dawn Records",
        "acusticaaudio": "Acustica Audio", "acustica": "Acustica Audio",
        "audiothing": "AudioThing",
        "psp": "PSPaudioware", "pspaudioware": "PSPaudioware",
        "adptraudio": "ADPTR Audio",
        "soundtheory": "Sound Theory",
        "studiolinked": "StudioLinked",
        "forever89": "Forever 89",
        "raredsp": "raredsp",
        "apple": "Apple",
        "d16groupaudiosoftware": "D16 Group",
        "nativeinstrumentsusa": "iZotope",
        "universalaudiouadx": "Universal Audio",
        "adptr": "ADPTR Audio",
        "synapseaudio": "Synapse Audio", "synapseaudiosoftware": "Synapse Audio",
        "elektronmusicmachines": "Elektron", "elektron": "Elektron",
        "tcelectronic": "TC Electronic",
        "scalermusic": "Scaler Music",
    ]

    /// Generic bundle-id parts that say nothing about the maker.
    private static let genericIdParts: Set<String> = [
        "com", "net", "org", "de", "io", "co", "uk", "fr", "audio", "plugin", "plugins", "plug-ins", "vst", "vst3", "au", "aax",
        "clap", "yourcompany", "mycompany", "company", "juce", "developer", "audiounit", "audiounits", "components", "music",
    ]

    private static let legalSuffix = try! NSRegularExpression(
        pattern: #"[,\s]+(gmbh|inc\.?|ltd\.?|llc|ab|s\.?a\.?s?|s\.?r\.?l\.?|b\.?v\.?|corp\.?|co\.?|limited|oy|kg|ag|pty|all rights reserved.*)$"#,
        options: [.caseInsensitive])

    static func canonicalVendor(_ raw: String) -> String {
        var v = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if v.isEmpty { return "" }
        if let a = vendorAliases[key(v)] { return a }
        var prev = ""
        while prev != v {
            prev = v
            let r = NSRange(v.startIndex..., in: v)
            v = legalSuffix.stringByReplacingMatches(in: v, range: r, withTemplate: "").trimmingCharacters(in: .whitespaces)
        }
        if let a = vendorAliases[key(v)] { return a }
        return v
    }

    static func vendorKey(_ v: String) -> String { key(canonicalVendor(v)) }

    private static let copyrightRe = try! NSRegularExpression(
        pattern: #"(?:©|\(c\)|copyright)\s*(?:\d{4}(?:\s*[-–]\s*\d{4})?)?[,\s]*(?:by\s+)?([A-Za-z][A-Za-z0-9 .&'\-]{1,40})"#,
        options: [.caseInsensitive])

    /// A best guess at the maker from Info.plist when the plugin itself says nothing.
    static func guessVendor(plist: [String: Any]) -> String {
        for k in ["NSHumanReadableCopyright", "CFBundleGetInfoString"] {
            if let s = plist[k] as? String {
                let r = NSRange(s.startIndex..., in: s)
                if let m = copyrightRe.firstMatch(in: s, range: r), let rr = Range(m.range(at: 1), in: s) {
                    let v = canonicalVendor(String(s[rr]).trimmingCharacters(in: CharacterSet(charactersIn: " .,")))
                    if v.count >= 2 && !v.lowercased().hasPrefix("all rights") { return v }
                }
            }
        }
        if let id = plist["CFBundleIdentifier"] as? String {
            let parts = id.split(separator: ".").map { String($0) }
            for p in parts.dropFirst() where !genericIdParts.contains(p.lowercased()) && p.count >= 2 {
                if let a = vendorAliases[key(p)] { return a }
                return p.prefix(1).uppercased() + p.dropFirst()
            }
        }
        return ""
    }

    // MARK: categories

    static let instrumentCategories: Set<String> = ["Synth", "Sampler", "Drums", "Keys", "Instrument"]

    private static let subcatMap: [(String, String)] = [
        ("reverb", "Reverb"), ("delay", "Delay"), ("eq", "EQ"), ("dynamics", "Dynamics"), ("distortion", "Distortion"),
        ("modulation", "Modulation"), ("filter", "Filter"), ("pitch shift", "Pitch"), ("pitch", "Pitch"),
        ("restoration", "Restoration"), ("mastering", "Mastering"), ("analyzer", "Analyzer"),
        ("spatial", "Spatial"), ("surround", "Spatial"), ("up-downmix", "Spatial"),
        ("drum", "Drums"), ("drums", "Drums"), ("piano", "Keys"), ("sampler", "Sampler"),
        ("synth", "Synth"), ("synthesizer", "Synth"), ("time effect", "Delay"),
    ]

    private static let nameRules: [(String, String)] = [
        (#"channel ?strip|vocal ?strip|\bstrip\b|console|\bneve\b|\b88rs\b|\b1073|\bapi ?vision|\bssl ?(e|g|4000|9000)|voxbox|neutron|\bbx_console|\bbx_megasingle|ultimate channel"#, "Channel Strip"),
        (#"midi|chord|scaler(?! ?eq)|\barp(?! ?\d)|arpegg|sequenc|composer|captain|cthulhu|harmony gen"#, "MIDI"),
        (#"ozone|master(ing)?\b|maximi[sz]er|mastercheck|\bl2\b|\bl3\b"#, "Mastering"),
        (#"delay|echo|timeless|\bdig\b|el capitan|\bh-?delay|crystallizer|fragments|\bmanifold|\bportal\b|freq ?echo"#, "Delay"),
        (#"verb|plate|\bhall\b|\broom\b|space|shimmer|\bchamber|convolution|\bir\b|blackhole|\brev\b|supermassive|vintage ?verb|\bspring\b"#, "Reverb"),
        (#"auto-?tune|melodyne|vocal|voice|\bvox\b|de-?ess|sibil|harmoni[sz]|nectar|\bvea\b|throat|\bbreath"#, "Vocal"),
        (#"pitch|transpos|formant|octaver"#, "Pitch"),
        (#"\beq\b|equali|pultec|pro-q|\bq\d\b|\bmeq\b|\bpeq\b|tilt|gullfoss|\bbx_digital|soothe|\bresonance supp|dynamic eq|\bpassive eq|\bmaag"#, "EQ"),
        (#"compress|\bcomp\b|limit|\bgate\b|expand|transient|clipper|leveler|1176|\b176\b|la-?2a|la-?3a|fet-?76|\bvca\b|opto|fairchild|\b670\b|dynamic|\bsmack|ducker|sidechain|volume shaper|pumper|pro-g\b|\bspiff|\bpro-c|\bpro-l|\bpro-mb|\bpro-ds|squeez|glue|\bpunch"#, "Dynamics"),
        (#"chorus|flang|phas|tremol|vibrato|rotary|ensemble|dimension|\bjun-?6|wobble|shaper|stutter|glitch|turnado|effectrix|\blfo|ubermod|space ?mod|\bmod\b|morph|freak|\bsweep"#, "Modulation"),
        (#"satur|distor|drive|plasma|rocker|shred|\bgain ?\d|\bamp ?\d|\bstomp|\bpedal|\bbass one|\btube|\btape|fuzz|crush|decimat|\bdirt|\bheat|warmth|warmer|\bamp\b|\bcab|guitar|bass amp|tct|culture|decapitator|devil-?loc|karacter|radiator|lofi|lo-fi|vinyl"#, "Distortion"),
        (#"filter|\bwah|resonat|cleansweep|\bvolcano|\bsweep ?filter"#, "Filter"),
        (#"pan(ner)?\b|stereo|imager|width|binaural|spatial|surround|\b360\b|panipulator|micro ?shift|doubler"#, "Spatial"),
        (#"analy[sz]|meter|scope|spectrum|loudness|tuner|insight|tonal balance|correlat|\blufs"#, "Analyzer"),
        (#"denois|de-?noise|declick|de-?click|\brx\b|restor|repair|dereverb|de-?reverb|declip|de-?crackle|de-?hum|unchirp|unveil|\bwns\b|de-?bleed|de-?plosive|mouth de"#, "Restoration"),
        (#"utility|\bgain\b|\btrim\b|tool|routing|polarity|phase align|\bsend\b|monitor|reference|soundid|metric ?ab|visual mixer|\brelay\b|\bmatch\b|\bconnect\b"#, "Utility"),
        (#"drum|\bkit\b|beat|perc|\b808|\b909|groove|addictive drums|superior drummer|\bezdrummer|battery"#, "Drums"),
        (#"piano|keys|rhodes|\borgan|wurl|\bep-?\d|\bb-?3\b|clavinet|\bclav\b|lounge lizard|\bcp-?70|stage-?73"#, "Keys"),
        (#"sampler|kontakt|rompler|\bromplur|sample"#, "Sampler"),
        (#"synth|\bosc\b|analog|serum|vital|massive|\bpigments|\bdiva|\brepro|\bjup|\bmini ?v|\bprophet|\bob-?x|\bcs-?80|\bdx7|\bsem\b|\barp ?2600|\bmodular|\bwavetable|\bfm\b|zenology"#, "Synth"),
    ]

    private static let compiledNameRules: [(NSRegularExpression, String)] = nameRules.map {
        (try! NSRegularExpression(pattern: $0.0, options: [.caseInsensitive]), $0.1)
    }

    private static let camelRe = try! NSRegularExpression(pattern: #"(?<=[a-z])(?=[A-Z])|(?<=[A-Za-z])(?=[0-9])|_"#)

    static func categoryFromName(_ raw: String) -> String? {
        // "ValhallaRoom" -> "Valhalla Room", "bx_cleansweep" keeps "bx_" visible to rules below
        let spaced = camelRe.stringByReplacingMatches(in: raw, range: NSRange(raw.startIndex..., in: raw), withTemplate: " ")
        let name = raw + " | " + spaced
        let r = NSRange(name.startIndex..., in: name)
        for (re, cat) in compiledNameRules where re.firstMatch(in: name, range: r) != nil {
            return cat
        }
        return nil
    }

    /// Picks one browsing category from VST3 sub-categories / AU tags, then from the name.
    static func category(subcats: [String], tags: [String], name: String, kind: String) -> String {
        let s = (subcats + tags).map { $0.lowercased().trimmingCharacters(in: .whitespaces) }
        let fromName = categoryFromName(name)
        // A name that says MIDI, Mastering or Vocal is more telling than a generic sub-category.
        if let n = fromName, ["Mastering", "Vocal", "Channel Strip"].contains(n) || (n == "MIDI" && kind != "inst") { return n }
        for (sub, cat) in subcatMap where s.contains(sub) {
            if kind == "inst" && !instrumentCategories.contains(cat) {
                // e.g. a drum sampler tagged "Restoration": keep looking for an instrument tag
                continue
            }
            return cat
        }
        if let n = fromName {
            if kind == "inst" && !instrumentCategories.contains(n) && n != "MIDI" { return "Instrument" }
            if kind == "fx" && instrumentCategories.contains(n) && n != "Drums" { return "Other" }
            return n
        }
        if kind != "inst" && (s.contains("tools") || s.contains("generator")) { return "Utility" }
        if kind == "inst" { return s.contains("instrument") || s.contains("synth") ? "Synth" : "Instrument" }
        if kind == "midi" { return "MIDI" }
        return "Other"
    }

    static func guessKind(name: String, category: String) -> String {
        if category == "MIDI" { return "midi" }
        if category == "Drums" {
            // "Drum Bus" and friends are effects.
            let n = name.lowercased()
            if n.contains("bus") || n.contains("comp") || n.contains("verb") { return "fx" }
        }
        return instrumentCategories.contains(category) ? "inst" : "fx"
    }

    // MARK: ids

    static func stableId(_ parts: String...) -> String {
        var h: UInt64 = 0xcbf29ce484222325
        for p in parts {
            for b in p.utf8 { h ^= UInt64(b); h = h &* 0x100000001b3 }
            h ^= 0x1f; h = h &* 0x100000001b3
        }
        return String(format: "%016llx", h)
    }
}
