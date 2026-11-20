#!/bin/zsh
# Builds build/PlugShelf.app (Apple Silicon + Intel) from the Swift package, web/ and ableton/.
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="0.1.0"
OUT="build/PlugShelf.app"
# Assemble and sign outside the project folder: when it lives in iCloud Drive, the File Provider
# stamps Finder info onto a fresh bundle, and codesign refuses to sign it ("detritus not allowed").
STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/plugshelf-build.XXXXXX")"
trap 'rm -rf "$STAGE_DIR"' EXIT
APP="$STAGE_DIR/PlugShelf.app"

swift build -c release --arch arm64 --arch x86_64
BIN="$(swift build -c release --arch arm64 --arch x86_64 --show-bin-path)/PlugShelf"

rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN" "$APP/Contents/MacOS/PlugShelf"
cp -R web "$APP/Contents/Resources/web"
mkdir -p "$APP/Contents/Resources/ableton"
cp -R ableton/PlugShelf "$APP/Contents/Resources/ableton/PlugShelf"
find "$APP/Contents/Resources" -name "__pycache__" -prune -exec rm -rf {} +

ICONSET="build/PlugShelf.iconset"
rm -rf "$ICONSET"
swift scripts/make_icon.swift "$ICONSET"
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/PlugShelf.icns"
rm -rf "$ICONSET"

cat > "$APP/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>PlugShelf</string>
  <key>CFBundleDisplayName</key><string>PlugShelf</string>
  <key>CFBundleIdentifier</key><string>local.plugshelf.app</string>
  <key>CFBundleExecutable</key><string>PlugShelf</string>
  <key>CFBundleIconFile</key><string>PlugShelf</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>${VERSION}</string>
  <key>CFBundleVersion</key><string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
  <key>NSHumanReadableCopyright</key><string>PlugShelf</string>
</dict>
</plist>
PLIST

xattr -cr "$APP"

# Sign with a stable identity when there is one, so macOS keeps privacy permissions
# (e.g. "access to Documents", which plugins opened by PlugShelf ask for) across rebuilds.
# An ad-hoc signature changes with every build, and macOS then asks again.
# Override with PLUGSHELF_SIGN_ID=<identity or SHA-1>, or PLUGSHELF_SIGN_ID=- for ad hoc.
SIGN_ID="${PLUGSHELF_SIGN_ID:-}"
if [[ -z "$SIGN_ID" ]]; then
  SIGN_ID=$(security find-identity -v -p codesigning 2>/dev/null \
    | awk '/"(Apple Development|Developer ID Application|Mac Developer)/ { print $2; exit }')
fi
if [[ -n "$SIGN_ID" && "$SIGN_ID" != "-" ]]; then
  codesign --force --deep --timestamp=none --sign "$SIGN_ID" "$APP"
  echo "Signed with a stable identity (${SIGN_ID:0:8}…)"
else
  codesign --force --deep --sign - "$APP"
  echo "Signed ad hoc (macOS will ask for permissions again after each build)"
fi
mkdir -p build
rm -rf "$OUT"
ditto --noextattr "$APP" "$OUT"
codesign --verify --deep --strict "$OUT"
echo "Done: $OUT"
