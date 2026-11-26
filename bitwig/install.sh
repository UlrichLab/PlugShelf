#!/bin/zsh
# Installs the PlugShelf controller script for Bitwig Studio – and nothing else.
# It only copies bitwig/PlugShelf into Bitwig's "Controller Scripts" folder; PlugShelf itself,
# the Ableton Live script and your PlugShelf data are not touched.
set -e
here="${0:A:h}"
dest="$HOME/Documents/Bitwig Studio/Controller Scripts/PlugShelf"

if [[ ! -d "$HOME/Documents/Bitwig Studio" ]]; then
  echo "Bitwig Studio's folder was not found ($HOME/Documents/Bitwig Studio)."
  echo "Start Bitwig once so it creates the folder, then run this again."
  exit 1
fi
mkdir -p "$dest"
cp "$here/PlugShelf/PlugShelf.control.js" "$dest/PlugShelf.control.js"
echo "Installed: $dest/PlugShelf.control.js"
echo "Next: Bitwig → Settings → Controllers → Add controller → PlugShelf → PlugShelf."
