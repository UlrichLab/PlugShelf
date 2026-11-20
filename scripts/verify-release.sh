#!/bin/zsh
# Verifies a built PlugShelf.app or release ZIP without relying on developer runtimes at launch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INPUT="${1:-$ROOT/build/PlugShelf.app}"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/plugshelf-verify.XXXXXX")"
APP_PID=""

cleanup() {
  if [[ -n "$APP_PID" ]]; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

if [[ ! -e "$INPUT" ]]; then
  print -u2 "Not found: $INPUT"
  exit 1
fi

if [[ "$INPUT" == *.zip ]]; then
  mkdir -p "$WORK/unpacked"
  ditto -x -k "$INPUT" "$WORK/unpacked"
  APPS=("$WORK"/unpacked/*.app(N))
  if (( ${#APPS} != 1 )); then
    print -u2 "Expected exactly one app bundle in $INPUT"
    exit 1
  fi
  APP="$APPS[1]"
else
  APP="$INPUT"
fi

EXE="$APP/Contents/MacOS/PlugShelf"
INFO="$APP/Contents/Info.plist"

[[ -x "$EXE" ]] || { print -u2 "Missing executable: $EXE"; exit 1; }
[[ -f "$INFO" ]] || { print -u2 "Missing Info.plist"; exit 1; }
[[ -f "$APP/Contents/Resources/web/index.html" ]] || { print -u2 "Missing web interface"; exit 1; }
[[ -f "$APP/Contents/Resources/ableton/PlugShelf/__init__.py" ]] || { print -u2 "Missing Ableton script"; exit 1; }

codesign --verify --deep --strict "$APP"

ARCHS="$(lipo -archs "$EXE")"
[[ " $ARCHS " == *" arm64 "* ]] || { print -u2 "Missing arm64 slice"; exit 1; }
[[ " $ARCHS " == *" x86_64 "* ]] || { print -u2 "Missing x86_64 slice"; exit 1; }

MIN_MACOS="$(plutil -extract LSMinimumSystemVersion raw "$INFO")"
[[ "$MIN_MACOS" == "13.0" ]] || { print -u2 "Unexpected minimum macOS version: $MIN_MACOS"; exit 1; }

BAD_LINKS="$(otool -L "$EXE" | sed -nE 's/^[[:space:]]+([^[:space:]]+).*/\1/p' \
  | grep -Ev '^(/usr/lib/|/System/Library/|@)' || true)"
if [[ -n "$BAD_LINKS" ]]; then
  print -u2 "Unexpected non-system runtime dependencies:"
  print -u2 "$BAD_LINKS"
  exit 1
fi

mkdir -p "$WORK/home" "$WORK/tmp"
LOG="$WORK/server.log"
env -i \
  HOME="$WORK/home" \
  CFFIXED_USER_HOME="$WORK/home" \
  TMPDIR="$WORK/tmp" \
  NSUnbufferedIO=YES \
  PATH=/nonexistent \
  "$EXE" --headless >"$LOG" 2>&1 &
APP_PID=$!

URL=""
for _ in {1..100}; do
  URL="$(sed -nE 's#.*(http://127\.0\.0\.1:[0-9]+/).*#\1#p' "$LOG" | head -n 1)"
  [[ -n "$URL" ]] && break
  kill -0 "$APP_PID" 2>/dev/null || { cat "$LOG"; print -u2 "App exited during startup"; exit 1; }
  sleep 0.1
done

[[ -n "$URL" ]] || { cat "$LOG"; print -u2 "Server did not start"; exit 1; }
curl -fsS "$URL" | grep -q '<title>PlugShelf</title>'
curl -fsS "${URL}api/state" | grep -q '"app":"PlugShelf"'

kill "$APP_PID" 2>/dev/null || true
wait "$APP_PID" 2>/dev/null || true
APP_PID=""

print "Verified: $APP"
print "Architectures: $ARCHS"
print "Minimum macOS: $MIN_MACOS"
print "Clean-runtime smoke test: passed with PATH=/nonexistent"
