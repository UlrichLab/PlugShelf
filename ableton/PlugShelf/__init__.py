# PlugShelf - Ableton Live control surface script.
#
# PlugShelf copies this folder to <User Library>/Remote Scripts/PlugShelf.
# In Live pick "PlugShelf" once under Settings > Link, Tempo & MIDI > Control Surface.
#
# Protocol: the PlugShelf app sends one JSON datagram to 127.0.0.1:47812 and
# gets one JSON datagram back.
#   {"op": "ping"}
#   {"op": "load", "name": "Pro-Q 3", "format": "VST3", "vendor": "FabFilter"}
#   {"op": "rack", "items": [{"name": ..., "format": ..., "vendor": ...}, ...]}
#   {"op": "reindex"}

import json
import socket

import Live
from _Framework.ControlSurface import ControlSurface

PORT = 47812

# Folder names Live uses for each plugin format in its browser.
FORMAT_FOLDERS = {
    "VST3": ("vst3",),
    "VST": ("vst", "vst2", "vst plug-ins"),
    "AU": ("audio units", "audiounits", "au", "components"),
    "CLAP": ("clap",),
}


def _norm(s):
    return "".join(ch for ch in s.lower() if ch.isalnum())


class PlugShelf(ControlSurface):
    def __init__(self, c_instance):
        ControlSurface.__init__(self, c_instance)
        self._index = None
        self._queue = []          # browser items still to load, one per tick
        self._sock = None
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.bind(("127.0.0.1", PORT))
            s.setblocking(False)
            self._sock = s
            self.show_message("PlugShelf verbunden")
        except Exception as e:
            self.log_message("PlugShelf: port %d not available (%s)" % (PORT, e))
            self.show_message("PlugShelf: Port %d ist belegt" % PORT)

    def disconnect(self):
        if self._sock is not None:
            try:
                self._sock.close()
            except Exception:
                pass
            self._sock = None
        ControlSurface.disconnect(self)

    # Live calls this roughly ten times a second on its main thread.
    def update_display(self):
        ControlSurface.update_display(self)
        if self._queue:
            item = self._queue.pop(0)
            try:
                self.application().browser.load_item(item)
            except Exception as e:
                self.log_message("PlugShelf: load failed (%s)" % e)
        self._poll()

    def _poll(self):
        if self._sock is None:
            return
        for _ in range(16):
            try:
                data, addr = self._sock.recvfrom(65536)
            except (BlockingIOError, OSError):
                return
            try:
                reply = self._handle(json.loads(data.decode("utf-8")))
            except Exception as e:
                reply = {"ok": False, "msg": "Live: %s" % e}
            try:
                self._sock.sendto(json.dumps(reply).encode("utf-8"), addr)
            except Exception:
                pass

    # ---- Live's plugin browser ---------------------------------------------------

    def _build_index(self):
        out = []

        def walk(item, path, depth):
            if depth > 8:
                return
            for child in item.children:
                if child.is_loadable and not child.is_folder:
                    out.append((_norm(child.name), child.name.lower(), [p.lower() for p in path], child))
                if child.is_folder or (not child.is_loadable and len(child.children) > 0):
                    walk(child, path + [child.name], depth + 1)

        walk(self.application().browser.plugins, [], 0)
        self._index = out

    def _find(self, name, fmt, vendor):
        want = _norm(name or "")
        if not want:
            return None
        folders = FORMAT_FOLDERS.get(fmt or "", ())
        vend = _norm(vendor or "")
        for attempt in range(2):
            if self._index is None:
                self._build_index()
            hits = [x for x in self._index if x[0] == want]
            if not hits:
                hits = [x for x in self._index if x[0].startswith(want)]
            if hits:
                def rank(x):
                    in_format = any(p in folders or p.split(" ")[0] in folders for p in x[2])
                    by_vendor = bool(vend) and any(_norm(p) == vend for p in x[2])
                    return (0 if in_format else 1, 0 if by_vendor else 1, len(x[0]))
                hits.sort(key=rank)
                return hits[0][3]
            self._index = None   # installed since the last look: rebuild once
        return None

    # ---- commands --------------------------------------------------------------

    def _handle(self, cmd):
        op = cmd.get("op")
        app = self.application()
        if op == "ping":
            return {"ok": True, "msg": "Live %d.%d" % (app.get_major_version(), app.get_minor_version())}
        if op == "reindex":
            self._index = None
            return {"ok": True, "msg": "index cleared"}
        track = self.song().view.selected_track
        if op == "load":
            item = self._find(cmd.get("name"), cmd.get("format"), cmd.get("vendor"))
            if item is None:
                return {"ok": False, "msg": "Live listet %s (%s) nicht. In Live unter Einstellungen > Plug-Ins neu scannen."
                        % (cmd.get("name"), cmd.get("format"))}
            self._queue.append(item)
            return {"ok": True, "msg": "%s → %s" % (item.name, track.name)}
        if op == "rack":
            items, missing = [], []
            for it in cmd.get("items", []):
                found = self._find(it.get("name"), it.get("format"), it.get("vendor"))
                if found is None:
                    missing.append(it.get("name") or "?")
                else:
                    items.append(found)
            if not items:
                return {"ok": False, "msg": "Live listet keins dieser Plugins: %s" % ", ".join(missing)}
            self._queue.extend(items)
            msg = "%d Plugins → %s" % (len(items), track.name)
            if missing:
                msg += " (nicht gefunden: %s)" % ", ".join(missing)
            return {"ok": True, "msg": msg}
        return {"ok": False, "msg": "Unbekannter Befehl %s" % op}


def create_instance(c_instance):
    return PlugShelf(c_instance)
