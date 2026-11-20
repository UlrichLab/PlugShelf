# PlugShelf - the commands the app sends to Live. Re-read on {"op": "reload"}.
#
#   {"op": "ping"}
#   {"op": "load", "name": "Pro-Q 3", "format": "VST3", "vendor": "FabFilter"}
#   {"op": "rack", "items": [{"name": ..., "format": ..., "vendor": ...}, ...]}
#   {"op": "load_preset", "folder": "PlugShelf", "name": "Vocal Chain"}   a rack PlugShelf saved
#   {"op": "inspect"}                                                    what is on the selected track
#   {"op": "test_track", "action": "create" | "delete", ...}             scratch track for testing

VERSION = "3"

# Folder names Live uses for each plugin format in its browser.
FORMAT_FOLDERS = {
    "VST3": ("vst3",),
    "VST": ("vst", "vst2", "vst plug-ins"),
    "AU": ("audio units", "audiounits", "au", "components"),
    "CLAP": ("clap",),
}


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
    if op == "load_preset":
        item = find_preset(cs, cmd.get("folder", "PlugShelf"), cmd.get("name", ""))
        if item is None:
            return {"ok": False, "retry": True, "msg": "Live does not show the rack in its browser yet"}
        cs.queue.append(item)
        return {"ok": True, "msg": "%s → %s" % (cmd.get("name"), track.name)}
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
