# PlugShelf - the commands the app sends to Live. Re-read on {"op": "reload"}.
#
#   {"op": "ping"}
#   {"op": "load", "name": "Pro-Q 3", "format": "VST3", "vendor": "FabFilter"}
#   {"op": "rack", "items": [{"name": ..., "format": ..., "vendor": ...}, ...]}
#   {"op": "load_preset", "folder": "PlugShelf", "name": "Vocal Chain"}   a rack PlugShelf saved
#   {"op": "load_user", "folder": "Kontakt Presets", "name": "X.vstpreset"}  any file in the User Library
#   {"op": "load_core", "root": "drums", "name": "Percussion Core Kit"}  a preset from Live's own library
#   {"op": "kontakt_block", "tracks": ["KP · Lib - Instr", ...]}  MIDI tracks with Kontakt 8, for the preset builder
#   {"op": "kontakt_clear", "prefix": "KP · "}   deletes those tracks again
#   {"op": "inspect"}                                                    what is on the selected track
#   {"op": "test_track", "action": "create" | "delete", ...}             scratch track for testing

VERSION = "11"

# Folder names Live uses for each plugin format in its browser.
FORMAT_FOLDERS = {
    "VST3": ("vst3",),
    "VST": ("vst", "vst2", "vst plug-ins"),
    "AU": ("audio units", "audiounits", "au", "components"),
    "CLAP": ("clap",),
}


def _nfc(s):
    import unicodedata
    try:
        return unicodedata.normalize("NFC", s or "")
    except Exception:
        return s or ""


def _norm(s):
    return "".join(ch for ch in s.lower() if ch.isalnum())


def handle(cs, cmd):
    op = cmd.get("op")
    app = cs.application()
    if op == "ping":
        return {"ok": True, "msg": "Live %d.%d" % (app.get_major_version(), app.get_minor_version()), "version": VERSION}
    if op == "reindex":
        cs.index = None
        return {"ok": True, "msg": "index cleared"}
    track = cs.song().view.selected_track
    if op == "load":
        item = find_plugin(cs, cmd.get("name"), cmd.get("format"), cmd.get("vendor"))
        if item is not None and cmd.get("instrument"):
            track = free_instrument_track(cs, track)
        if item is None:
            return {"ok": False, "msg": "Live does not list %s (%s). Rescan under Settings > Plug-Ins in Live."
                    % (cmd.get("name"), cmd.get("format"))}
        cs.queue.append(item)
        return {"ok": True, "msg": "%s → %s" % (item.name, track.name)}
    if op == "rack":
        items, missing = [], []
        for it in cmd.get("items", []):
            found = find_plugin(cs, it.get("name"), it.get("format"), it.get("vendor"))
            if found is None:
                missing.append(it.get("name") or "?")
            else:
                items.append(found)
        if not items:
            return {"ok": False, "msg": "Live lists none of these plugins: %s" % ", ".join(missing)}
        cs.queue.extend(items)
        msg = "%d Plugins → %s" % (len(items), track.name)
        if missing:
            msg += " (not found: %s)" % ", ".join(missing)
        return {"ok": True, "msg": msg}
    if op == "shot_track":
        return shot_track(cs, cmd)
    if op == "shot_info":
        return shot_info(cs)
    if op == "shot_empty":
        t = cs.song().view.selected_track
        if t.name != SHOT_TRACK:
            return {"ok": False, "msg": "not the capture track"}
        for i in range(len(t.devices) - 1, -1, -1):
            t.delete_device(i)
        return {"ok": True}
    if op == "shot_clear":
        return shot_clear(cs, cmd)
    if op == "list_stock":
        return {"ok": True, "devices": stock_devices(cs)}
    if op == "load_stock":
        item = find_stock(cs, cmd.get("name", ""), cmd.get("kind", "fx"))
        if item is None:
            return {"ok": False, "msg": "Live does not list %s" % cmd.get("name")}
        if cmd.get("kind") == "inst":
            track = free_instrument_track(cs, track)
        cs.queue.append(item)
        return {"ok": True, "msg": "%s → %s" % (item.name, track.name)}
    if op == "load_preset":
        item = find_preset(cs, cmd.get("folder", "PlugShelf"), cmd.get("name", ""))
        if item is None:
            return {"ok": False, "retry": True, "msg": "Live does not show the rack in its browser yet"}
        cs.queue.append(item)
        return {"ok": True, "msg": "%s → %s" % (cmd.get("name"), track.name)}
    if op == "load_core":
        item = find_core_item(cs, cmd.get("root", "drums"), cmd.get("name", ""))
        if item is None:
            return {"ok": False, "msg": "%s is not in Live's library" % cmd.get("name")}
        if cmd.get("instrument"):
            track = free_instrument_track(cs, track)
        cs.queue.append(item)
        return {"ok": True, "msg": "%s → %s" % (item.name, track.name)}
    if op == "find_user":
        item = find_user_item(cs, cmd.get("folder", ""), cmd.get("name", ""))
        if item is None:
            return {"ok": False, "msg": "not found"}
        return {"ok": True, "name": item.name, "uri": getattr(item, "uri", ""), "loadable": item.is_loadable, "device": item.is_device}
    if op == "load_user":
        item = find_user_item(cs, cmd.get("folder", ""), cmd.get("name", ""))
        if item is None:
            return {"ok": False, "msg": "Live does not show %s in the User Library yet" % cmd.get("name")}
        if cmd.get("instrument"):
            track = free_instrument_track(cs, track)
        cs.queue.append(item)
        return {"ok": True, "msg": "%s → %s" % (item.name, track.name)}
    if op == "kontakt_block":
        return kontakt_block(cs, cmd.get("tracks", []))
    if op == "kontakt_clear":
        return kontakt_clear(cs, cmd.get("prefix", "KP · "))
    if op == "rescan_browser":
        return {"ok": True, "msg": "ok"}
    if op == "test_track":
        return test_track(cs, cmd)
    if op == "inspect":
        return {"ok": True, "track": track.name, "devices": [describe(d) for d in track.devices]}
    return {"ok": False, "msg": "Unknown command %s" % op}


# ---- Live's plugin browser ----------------------------------------------------------

def build_index(cs):
    out = []

    def walk(item, path, depth):
        if depth > 8:
            return
        for child in item.children:
            if child.is_loadable and not child.is_folder:
                out.append((_norm(child.name), child.name.lower(), [p.lower() for p in path], child))
            if child.is_folder or (not child.is_loadable and len(child.children) > 0):
                walk(child, path + [child.name], depth + 1)

    walk(cs.application().browser.plugins, [], 0)
    cs.index = out


def find_plugin(cs, name, fmt, vendor):
    want = _norm(name or "")
    if not want:
        return None
    folders = FORMAT_FOLDERS.get(fmt or "", ())
    vend = _norm(vendor or "")
    for attempt in range(2):
        if cs.index is None:
            build_index(cs)
        hits = [x for x in cs.index if x[0] == want]
        if not hits:
            hits = [x for x in cs.index if x[0].startswith(want)]
        if hits:
            def rank(x):
                in_format = any(p in folders or p.split(" ")[0] in folders for p in x[2])
                by_vendor = bool(vend) and any(_norm(p) == vend for p in x[2])
                return (0 if in_format else 1, 0 if by_vendor else 1, len(x[0]))
            hits.sort(key=rank)
            return hits[0][3]
        cs.index = None   # installed since the last look: rebuild once
    return None


# ---- racks saved by PlugShelf in the User Library -------------------------------------

def find_preset(cs, folder, name):
    want = (name or "").lower()
    names = (want, want + ".adg")
    folder = (folder or "").lower()

    def walk(item, depth, inside):
        if depth > 7:
            return None
        for child in item.children:
            n = child.name.lower()
            if inside and child.is_loadable and n in names:
                return child
            if child.is_folder or len(child.children) > 0:
                found = walk(child, depth + 1, inside or n == folder)
                if found is not None:
                    return found
        return None

    return walk(cs.application().browser.user_library, 0, False)


class TrackQueue(list):
    """The tick loader pops one entry at a time; an entry (item, track) selects its track first."""
    def __init__(self, song, items=()):
        list.__init__(self, items)
        self.song = song

    def pop(self, i=0):
        entry = list.pop(self, i)
        if isinstance(entry, tuple):
            item, track = entry
            try:
                self.song.view.selected_track = track
            except Exception:
                pass
            return item
        return entry


def kontakt_block(cs, names):
    """New MIDI tracks at the end of the set, named for the preset builder, each getting Kontakt 8."""
    song = cs.song()
    item = find_plugin(cs, "Kontakt 8", "VST3", "Native Instruments")
    if item is None:
        return {"ok": False, "msg": "Live does not list Kontakt 8 (VST3)"}
    if not isinstance(cs.queue, TrackQueue):
        cs.queue = TrackQueue(song, cs.queue)
    made = 0
    for name in names:
        song.create_midi_track(len(song.tracks))
        track = song.tracks[len(song.tracks) - 1]
        track.name = name
        cs.queue.append((item, track))
        made += 1
    return {"ok": True, "msg": "%d tracks with Kontakt 8" % made, "tracks": made}


def kontakt_clear(cs, prefix):
    """Deletes the preset builder's tracks (only those whose name starts with the prefix)."""
    song = cs.song()
    gone = 0
    for i in range(len(song.tracks) - 1, -1, -1):
        if song.tracks[i].name.startswith(prefix):
            try:
                song.delete_track(i)
                gone += 1
            except Exception:
                pass   # Live keeps at least one track
    return {"ok": True, "msg": "%d builder tracks removed" % gone, "removed": gone}


# ---- Live's own devices ("stock plugins") ------------------------------------------------

def _stock_roots(cs):
    b = cs.application().browser
    return (("fx", b.audio_effects), ("inst", b.instruments), ("midi", b.midi_effects))


def stock_devices(cs):
    """Live's built-in devices from the browser: [{"name", "kind"}]."""
    out = []
    for kind, root in _stock_roots(cs):
        for c in root.children:
            if c.is_device and c.is_loadable:
                out.append({"name": c.name, "kind": kind})
    return out


def find_stock(cs, name, kind):
    want = _nfc(name).lower()
    for k, root in _stock_roots(cs):
        if kind and k != kind:
            continue
        for c in root.children:
            if c.is_device and c.is_loadable and _nfc(c.name).lower() == want:
                return c
    return None


# ---- pictures of Live's own devices: one scratch track per device -----------------------

SHOT_TRACK = "PS · Capture"


def shot_clear(cs, cmd=None):
    song = cs.song()
    n = 0
    for i in range(len(song.tracks) - 1, -1, -1):
        if song.tracks[i].name == SHOT_TRACK:
            song.delete_track(i)
            n += 1
    app = cs.application()
    if cmd and cmd.get("restore_browser"):
        try:
            app.view.show_view("Browser")
        except Exception:
            pass
    return {"ok": True, "deleted": n}


def shot_info(cs):
    """Once the device has arrived on the capture track, only it stays (template devices go)."""
    t = cs.song().view.selected_track
    if t.name != SHOT_TRACK:
        return {"ok": False, "msg": "not the capture track"}
    base = getattr(cs, "shot_base", 0)
    loaded = len(t.devices) > base and not cs.queue
    if loaded:
        for i in range(len(t.devices) - 2, -1, -1):
            t.delete_device(i)
    return {"ok": True, "loaded": loaded, "devices": [d.name for d in t.devices]}


def shot_track(cs, cmd):
    """A fresh scratch track with only this device on it, selected and shown in the device view."""
    item = find_stock(cs, cmd.get("name", ""), cmd.get("kind", "fx"))
    if item is None:
        return {"ok": False, "msg": "Live does not list %s" % cmd.get("name")}
    shot_clear(cs)
    song = cs.song()
    if cmd.get("kind") in ("inst", "midi"):
        song.create_midi_track(-1)
    else:
        song.create_audio_track(-1)
    t = song.tracks[len(song.tracks) - 1]
    t.name = SHOT_TRACK
    song.view.selected_track = t
    cs.shot_base = len(t.devices)      # devices the track template brings along
    app = cs.application()
    browser_was = False
    try:
        browser_was = app.view.is_view_visible("Browser")
        if cmd.get("hide_browser"):
            app.view.hide_view("Browser")
        app.view.show_view("Detail")
        app.view.show_view("Detail/DeviceChain")
    except Exception:
        pass
    cs.queue.append(item)
    return {"ok": True, "browser": browser_was}


def free_instrument_track(cs, track):
    """An instrument goes onto a MIDI track without one: the selected track if it is free, otherwise a new
    MIDI track right after it (an instrument already on the track is never replaced)."""
    song = cs.song()
    try:
        busy = any(int(d.type) == 1 for d in track.devices)   # 1 = instrument
        if track.has_midi_input and not busy:
            return track
        tracks = list(song.tracks)
        index = tracks.index(track) + 1 if track in tracks else len(tracks)
        song.create_midi_track(index)
        new = song.tracks[index]
        song.view.selected_track = new
        return new
    except Exception as e:
        cs.log_message("PlugShelf: no free track (%s)" % e)
        return track


def find_core_item(cs, root, name):
    """A loadable item in one of Live's browser roots (drums, instruments, audio_effects, …) by name."""
    want = _nfc(name).lower()
    stem = want.rsplit(".", 1)[0] if want.endswith((".adg", ".adv")) else want
    start = getattr(cs.application().browser, root, None)
    if start is None:
        return None

    def walk(item, depth):
        if depth > 6:
            return None
        for child in item.children:
            n = _nfc(child.name).lower()
            if child.is_loadable and n in (want, stem, stem + ".adg"):
                return child
            if child.is_folder or len(child.children) > 0:
                found = walk(child, depth + 1)
                if found is not None:
                    return found
        return None

    return walk(start, 0)


def find_user_item(cs, folder, name):
    """A loadable item in the User Library by file name (Live may show it with or without extension)."""
    # macOS file names use decomposed accents ("e" + "́"), Live's browser the composed form ("é")
    want = _nfc(name).lower()
    stem = want.rsplit(".", 1)[0] if "." in want else want
    folder = _nfc(folder).lower()

    def walk(item, depth, inside):
        if depth > 8:
            return None
        for child in item.children:
            n = _nfc(child.name).lower()
            if inside and child.is_loadable and n in (want, stem):
                return child
            if child.is_folder or len(child.children) > 0:
                found = walk(child, depth + 1, inside or not folder or n == folder)
                if found is not None:
                    return found
        return None

    return walk(cs.application().browser.user_library, 0, not folder)


# ---- for testing: a scratch track, and what is on the selected track ------------------

def test_track(cs, cmd):
    song = cs.song()
    name = cmd.get("name", "PlugShelf Test")
    if cmd.get("action") == "create":
        song.create_audio_track(-1)
        t = song.tracks[len(song.tracks) - 1]
        t.name = name
        song.view.selected_track = t
        return {"ok": True, "index": len(song.tracks) - 1, "msg": t.name}
    if cmd.get("action") == "delete":
        i = int(cmd.get("index", -1))
        if 0 <= i < len(song.tracks) and song.tracks[i].name == name:
            song.delete_track(i)
            return {"ok": True, "msg": "deleted"}
        return {"ok": False, "msg": "track not found"}
    return {"ok": False, "msg": "unknown action"}


def describe(d, depth=0):
    info = {"name": d.name, "class": d.class_name,
            "params": [[p.name, round(p.value, 4), round(p.min, 4), round(p.max, 4)] for p in list(d.parameters)[:24]]}
    if depth < 2 and getattr(d, "can_have_chains", False):
        info["chains"] = [[describe(x, depth + 1) for x in ch.devices] for ch in d.chains]
    return info
