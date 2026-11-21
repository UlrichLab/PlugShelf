import AppKit
import Foundation
import WebKit

// PlugShelf: a plugin library for the Mac that loads plugins straight onto Ableton Live's selected track.
// The window is a WKWebView showing a page served by the app itself on 127.0.0.1.
// `PlugShelf --headless` runs only the server (for development in a normal browser).

// A helper process that photographs one plugin's editor (see Capture.swift).
if CommandLine.arguments.count > 1 && CommandLine.arguments[1] == "--capture" {
    CaptureMode.run(Array(CommandLine.arguments.dropFirst(2)))
}
// A helper process that reads one VST3 plugin's parameters and default state (see Params.swift).
if CommandLine.arguments.count > 1 && CommandLine.arguments[1] == "--params" {
    ParamsMode.run(Array(CommandLine.arguments.dropFirst(2)))
}

let api = API()
let server = HTTPServer { api.handle($0) }
do {
    try server.start(preferredPort: 47900)
    api.remote.start(api: api)
} catch {
    FileHandle.standardError.write(Data("PlugShelf: \(error.localizedDescription)\n".utf8))
    exit(1)
}
print("PlugShelf is running on http://127.0.0.1:\(server.port)/")
if !api.hasLibrary { api.startScan() }

if CommandLine.arguments.contains("--headless") {
    dispatchMain()
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
    var window: NSWindow!
    var web: WKWebView!

    func applicationDidFinishLaunching(_ note: Notification) {
        api.inApp = true
        buildMenu()

        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        config.userContentController.addUserScript(
            WKUserScript(source: "window.__plugshelfApp = true;", injectionTime: .atDocumentStart, forMainFrameOnly: true))
        // WKWebView ignores CSS app-region, so the top bar asks the window to move (and double-click zooms, like a title bar)
        config.userContentController.addUserScript(WKUserScript(source: """
            document.addEventListener('mousedown', e => {
              if (e.button !== 0) return;
              const t = e.target;
              if (!t.closest || !t.closest('.top, .brand') || t.closest('button, input, select, textarea, a, label, .chip, [role=button]')) return;
              window.webkit.messageHandlers.win.postMessage(e.detail === 2 ? 'zoom' : 'drag');
            }, true);
            """, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
        config.userContentController.add(self, name: "win")
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        if #available(macOS 13.3, *) { web.isInspectable = true }
        web.setValue(false, forKey: "drawsBackground")

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1320, height: 860),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
                          backing: .buffered, defer: false)
        window.title = "PlugShelf"
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.appearance = NSAppearance(named: .darkAqua)
        window.backgroundColor = NSColor(red: 0.07, green: 0.075, blue: 0.085, alpha: 1)
        window.minSize = NSSize(width: 820, height: 520)
        window.contentView = web
        window.setFrameAutosaveName("PlugShelfMain")
        if !window.setFrameUsingName("PlugShelfMain") { window.center() }
        window.makeKeyAndOrderFront(nil)

        api.onTop = { [weak self] on in self?.window.level = on ? .floating : .normal }
        web.load(URLRequest(url: URL(string: "http://127.0.0.1:\(server.port)/")!))
        NSApp.activate(ignoringOtherApps: true)
    }

    func userContentController(_ c: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "win", let what = message.body as? String else { return }
        if what == "zoom" { window.zoom(nil); return }
        // the message arrives after the click, so follow the mouse ourselves until the button goes up
        guard NSEvent.pressedMouseButtons & 1 == 1, dragMonitor == nil else { return }
        let start = NSEvent.mouseLocation, origin = window.frame.origin
        dragMonitor = NSEvent.addLocalMonitorForEvents(matching: [.leftMouseDragged, .leftMouseUp]) { [weak self] e in
            guard let self else { return e }
            if e.type == .leftMouseUp {
                if let m = self.dragMonitor { NSEvent.removeMonitor(m) }
                self.dragMonitor = nil
                return e
            }
            let p = NSEvent.mouseLocation
            self.window.setFrameOrigin(NSPoint(x: origin.x + p.x - start.x, y: origin.y + p.y - start.y))
            return nil
        }
    }
    private var dragMonitor: Any?

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    // Links to other sites open in the default browser, not in the app window.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let u = action.request.url, u.host != "127.0.0.1" {
            NSWorkspace.shared.open(u)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // window.confirm / window.alert / window.prompt from the page
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let a = NSAlert()
        a.messageText = message
        a.addButton(withTitle: "OK")
        a.addButton(withTitle: "Cancel")
        completionHandler(a.runModal() == .alertFirstButtonReturn)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let a = NSAlert()
        a.messageText = message
        a.runModal()
        completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        let a = NSAlert()
        a.messageText = prompt
        let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 280, height: 24))
        field.stringValue = defaultText ?? ""
        a.accessoryView = field
        a.addButton(withTitle: "OK")
        a.addButton(withTitle: "Cancel")
        a.window.initialFirstResponder = field
        completionHandler(a.runModal() == .alertFirstButtonReturn ? field.stringValue : nil)
    }

    private func buildMenu() {
        let main = NSMenu()

        let appItem = NSMenuItem()
        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "About PlugShelf", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Hide PlugShelf", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        appMenu.addItem(.separator())
        appMenu.addItem(withTitle: "Quit PlugShelf", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        main.addItem(appItem)

        let editItem = NSMenuItem()
        let edit = NSMenu(title: "Edit")
        edit.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        edit.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "Z")
        edit.addItem(.separator())
        edit.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        edit.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        edit.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        edit.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        editItem.submenu = edit
        main.addItem(editItem)

        let viewItem = NSMenuItem()
        let view = NSMenu(title: "View")
        view.addItem(withTitle: "Reload", action: #selector(reloadPage), keyEquivalent: "r")
        viewItem.submenu = view
        main.addItem(viewItem)

        let winItem = NSMenuItem()
        let win = NSMenu(title: "Window")
        win.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        win.addItem(withTitle: "Close", action: #selector(NSWindow.performClose(_:)), keyEquivalent: "w")
        winItem.submenu = win
        main.addItem(winItem)

        NSApp.mainMenu = main
    }

    @objc func reloadPage() { web.reload() }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
