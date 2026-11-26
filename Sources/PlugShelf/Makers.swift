import AppKit
import Foundation

/// Where each maker's plugins are updated: its own updater app when it is installed, otherwise its download page.
enum Makers {
    struct Source { var apps: [String]; var url: String }

    static let table: [String: Source] = [
        "Universal Audio": Source(apps: ["UA Connect.app"], url: "https://www.uaudio.com/downloads"),
        "Native Instruments": Source(apps: ["Native Access.app"], url: "https://www.native-instruments.com/en/specials/native-access/"),
        "iZotope": Source(apps: ["Native Access.app", "iZotope Product Portal.app"], url: "https://www.izotope.com/en/products/downloads.html"),
        "Plugin Alliance": Source(apps: ["Plugin Alliance InstallationManager.app", "InstallationManager.app"], url: "https://www.plugin-alliance.com/en/installation-manager.html"),
        "Unfiltered Audio": Source(apps: ["Plugin Alliance InstallationManager.app"], url: "https://www.plugin-alliance.com/en/installation-manager.html"),
        "IK Multimedia": Source(apps: ["IK Product Manager.app"], url: "https://www.ikmultimedia.com/userarea/"),
        "Arturia": Source(apps: ["Arturia Software Center.app"], url: "https://www.arturia.com/support/downloads-and-manuals"),
        "Waves": Source(apps: ["Waves Central.app"], url: "https://www.waves.com/downloads/central"),
        "Softube": Source(apps: ["Softube Central.app"], url: "https://www.softube.com/softube-central"),
        "KORG": Source(apps: ["KORG Software Pass.app"], url: "https://www.korg.com/us/support/download/"),
        "MeldaProduction": Source(apps: ["MDownloader.app"], url: "https://www.meldaproduction.com/download"),
        "Roland": Source(apps: ["Roland Cloud Manager.app"], url: "https://www.roland.com/global/support/"),
        "Toontrack": Source(apps: ["Toontrack Product Manager.app"], url: "https://www.toontrack.com/product-manager/"),
        "Sonarworks": Source(apps: ["SoundID Download Manager.app"], url: "https://www.sonarworks.com/soundid-reference/downloads"),
        "Antares": Source(apps: ["Antares Central.app"], url: "https://www.antarestech.com/"),
        "Elektron": Source(apps: [], url: "https://www.elektron.se/support-downloads"),
        "Soundtoys": Source(apps: [], url: "https://www.soundtoys.com/my-account/"),
        "FabFilter": Source(apps: [], url: "https://www.fabfilter.com/download"),
        "Valhalla DSP": Source(apps: [], url: "https://valhalladsp.com/my-account/"),
        "D16 Group": Source(apps: [], url: "https://d16.pl/"),
        "Zynaptiq": Source(apps: [], url: "https://www.zynaptiq.com/"),
        "TC Electronic": Source(apps: [], url: "https://www.tcelectronic.com/"),
        "sonible": Source(apps: [], url: "https://www.sonible.com/"),
        "Sonnox": Source(apps: [], url: "https://www.sonnox.com/"),
        "Sugar Bytes": Source(apps: [], url: "https://sugar-bytes.de/"),
        "Eventide": Source(apps: [], url: "https://www.eventideaudio.com/downloads/"),
        "Xfer Records": Source(apps: [], url: "https://xferrecords.com/"),
        "oeksound": Source(apps: [], url: "https://oeksound.com/"),
        "Strymon": Source(apps: [], url: "https://www.strymon.net/"),
        "Synapse Audio": Source(apps: [], url: "https://www.synapse-audio.com/"),
        "Cableguys": Source(apps: [], url: "https://www.cableguys.com/"),
        "Klanghelm": Source(apps: [], url: "https://klanghelm.com/"),
        "Voxengo": Source(apps: [], url: "https://www.voxengo.com/"),
        "Output": Source(apps: [], url: "https://output.com/"),
        "Wavesfactory": Source(apps: [], url: "https://www.wavesfactory.com/"),
    ]

    /// The updater app for a maker, if one is installed (searched in Applications and one folder deeper).
    static func app(for vendor: String) -> URL? {
        guard let src = table[vendor] else { return nil }
        let fm = FileManager.default
        let roots = [URL(fileURLWithPath: "/Applications"), fm.homeDirectoryForCurrentUser.appendingPathComponent("Applications")]
        for name in src.apps {
            for r in roots {
                let direct = r.appendingPathComponent(name)
                if fm.fileExists(atPath: direct.path) { return direct }
                for sub in (try? fm.contentsOfDirectory(at: r, includingPropertiesForKeys: [.isDirectoryKey])) ?? [] where sub.pathExtension.isEmpty {
                    let u = sub.appendingPathComponent(name)
                    if fm.fileExists(atPath: u.path) { return u }
                }
            }
        }
        return nil
    }

    /// {vendor: {"app": "UA Connect", "url": "…"}} for the vendors given.
    static func links(_ vendors: Set<String>) -> [String: [String: String]] {
        var out: [String: [String: String]] = [:]
        for v in vendors {
            var o: [String: String] = [:]
            if let a = app(for: v) { o["app"] = a.deletingPathExtension().lastPathComponent }
            if let u = table[v]?.url { o["url"] = u }
            out[v] = o
        }
        return out
    }

    /// Opens the maker's updater app; without one, its page (or a web search) in the browser.
    static func open(vendor: String, how: String = "app") -> [String: Any] {
        if how != "web", let a = app(for: vendor) {
            NSWorkspace.shared.openApplication(at: a, configuration: NSWorkspace.OpenConfiguration())
            return ["ok": true, "msg": "\(a.deletingPathExtension().lastPathComponent) opens"]
        }
        let s = table[vendor]?.url
            ?? "https://duckduckgo.com/?q=" + (vendor + " plugin download").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!
        if let u = URL(string: s) { NSWorkspace.shared.open(u) }
        return ["ok": true, "msg": "Opening \(vendor) in the browser"]
    }
}
