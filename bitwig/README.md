# PlugShelf for Bitwig Studio (experimental, untested)

A small controller script that lets Bitwig Studio load plugins from your PlugShelf library onto the selected
track. It lives entirely in this folder: installing it does **not** change the PlugShelf app, the Ableton Live
script or your PlugShelf data.

> **Status:** written against Bitwig's official Controller API (API 18, Bitwig Studio 5 or later) and tested
> with a stand-in for the API (`test/mock-bitwig.js`), **not yet in Bitwig itself**. Feedback welcome.

## What it does

| | |
| --- | --- |
| VST3 | inserted by its class id |
| VST2 | inserted by its unique id |
| CLAP | inserted by its id (if your Bitwig version offers CLAP insertion to scripts) |
| AU | not possible – Bitwig does not load Audio Units |
| Instruments | go to the start of the track's device chain |
| Effects | go after the selected device, or at the end of the chain |

## Install

1. Start Bitwig Studio once (it creates `~/Documents/Bitwig Studio`).
2. In Terminal, from this repository:
   ```bash
   ./bitwig/install.sh
   ```
   It copies `PlugShelf/PlugShelf.control.js` to `~/Documents/Bitwig Studio/Controller Scripts/PlugShelf/`.
3. In Bitwig: **Settings → Controllers → Add controller → PlugShelf → PlugShelf**.

To remove it, delete that `Controller Scripts/PlugShelf` folder and remove the controller in Bitwig.

## Try it

With PlugShelf running and a track selected in Bitwig:

```bash
python3 bitwig/plugshelf-bitwig.py ping
```

```bash
python3 bitwig/plugshelf-bitwig.py load "Pro-Q 4"
```

`load` looks up the plugin's id in your PlugShelf library (read only) and sends it to Bitwig, preferring
VST3, then CLAP, then VST2.

## Protocol

One JSON datagram to `127.0.0.1:47813` (a different port from the Live script's 47812, so both can run):

```json
{"op": "load", "name": "Pro-Q 4", "format": "VST3", "id": "<VST3 class id>", "instrument": false, "reply": 50123}
```

Other commands: `{"op": "ping"}`, `{"op": "chain", "items": [ … ]}`, `{"op": "file", "path": "…"}`.
The script answers on the `reply` port with `{"ok": true|false, "msg": "…", "daw": "bitwig"}`.

## Test without Bitwig

```bash
node bitwig/test/mock-bitwig.js
```

## Not in the PlugShelf app yet

The PlugShelf app itself still loads into Ableton Live only. A click-to-load for Bitwig inside the app would
need a small, optional addition to the app; it is left out on purpose until the script has been tested in
Bitwig.
