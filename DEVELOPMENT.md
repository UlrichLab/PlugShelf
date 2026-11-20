# PlugShelf development

This document is for contributors and release maintainers. If you only want to use PlugShelf, download the
ready-to-run app as described in the [README](README.md#download-and-install-for-users).

## Prerequisites

- macOS 13 or later
- Xcode Command Line Tools or Xcode with Swift 5.9 or later
- `zsh`, `codesign`, `iconutil`, and `ditto` from macOS

Python, Node.js, npm, and Homebrew are not used by the build.

## Build the app

```bash
./scripts/build.sh
ditto --noextattr build/PlugShelf.app /Applications/PlugShelf.app
```

`build.sh` produces a universal Apple Silicon and Intel application at `build/PlugShelf.app`. It uses an Apple
Development or Developer ID certificate when one is available and otherwise applies an ad-hoc signature.

To run only the local server and open the page in a normal browser during development:

```bash
swift build -c release
.build/release/PlugShelf --headless
```

The page is served on `http://127.0.0.1:47900/`, or the next free port up to 47919.

## Verify a finished app or release ZIP

Run the verification script against either an app bundle or a release archive:

```bash
./scripts/verify-release.sh build/PlugShelf.app
./scripts/verify-release.sh PlugShelf-0.1.0-mac.zip
```

The script verifies the bundle signature, both processor slices, the minimum macOS version, required resources,
and linked libraries. It then launches the finished binary with an isolated home directory and an empty `PATH`,
and checks the web interface and API. This proves that the packaged app does not invoke Swift, Python, Node.js,
Homebrew, or other developer commands at startup.

This smoke test is not a substitute for testing Gatekeeper on a clean Mac or the full integration with supported
Ableton Live versions and third-party plugins.

## Runtime dependency model

- The finished executable uses frameworks and Swift runtime libraries supplied by macOS 13 or later.
- Static web assets and the Ableton control-surface script are copied into the app bundle.
- The `.py` files under `ableton/` run inside Ableton Live's bundled Python environment; PlugShelf never invokes a
  system `python` command.
- The application does not require a package manager or a network service to start.

## Source layout

| Part | Files |
| --- | --- |
| App, window, local HTTP server, API | `Sources/PlugShelf/main.swift`, `HTTPServer.swift`, `API.swift` |
| Scanner, names, categories, Live plugin database | `Scanner.swift`, `Classify.swift`, `LiveDB.swift` |
| Live connection and user data | `Ableton.swift`, `Store.swift` |
| Plugin pictures and parameters | `Thumbs.swift`, `Capture.swift`, `Params.swift` |
| Rack macros, starting values, `.adg` writer | `Racks.swift`, `RackWriter.swift`, `RackTemplates.swift` |
| VST3 and VST2 mini host | `Sources/CPlugHost/` |
| User interface | `web/` |
| Chain roles, categories, and templates | `web/chain-data.js`, `web/chain-famous.js`, `web/chains.js` |
| Ableton Live control surface | `ableton/PlugShelf/` |
| Build and verification tools | `scripts/` |

## Signing and distribution

An ad-hoc-signed build runs after the user approves it in macOS Privacy & Security, but a public release should
ideally be signed with a **Developer ID Application** certificate and notarized by Apple. Notarization removes the
manual first-launch workaround and gives users a normal Gatekeeper experience.

`build.sh` stages the app outside the repository because cloud-synced folders can add Finder metadata that causes
`codesign` verification to fail.
