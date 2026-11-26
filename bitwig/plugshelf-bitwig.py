#!/usr/bin/env python3
"""Loads a plugin from your PlugShelf library onto Bitwig Studio's selected track.

  python3 plugshelf-bitwig.py ping
  python3 plugshelf-bitwig.py load "Pro-Q 4"

It reads the plugin's id from the running PlugShelf app (http://127.0.0.1:47900, read only) and sends
one command to the PlugShelf controller script in Bitwig (UDP 127.0.0.1:47813). Nothing is changed in
PlugShelf or in the Ableton Live connection.
"""
import json
import socket
import sys
import urllib.request

BITWIG = ("127.0.0.1", 47813)
PLUGSHELF = "http://127.0.0.1:47900/api/state"
ORDER = {"VST3": 0, "CLAP": 1, "VST": 2}          # what Bitwig can load, best first


def send(cmd, timeout=3.0):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.bind(("127.0.0.1", 0))
    s.settimeout(timeout)
    cmd["reply"] = s.getsockname()[1]
    s.sendto(json.dumps(cmd).encode("utf-8"), BITWIG)
    try:
        return json.loads(s.recv(65536).decode("utf-8"))
    except socket.timeout:
        return {"ok": False, "msg": "Bitwig does not answer – is the PlugShelf controller added in Bitwig?"}


def find(name):
    req = urllib.request.Request(PLUGSHELF, headers={"X-PlugShelf": "1"})
    with urllib.request.urlopen(req, timeout=5) as r:
        state = json.load(r)
    lib = state.get("library") or state
    want = name.lower()
    hits = [p for p in lib["plugins"] if p["format"] in ORDER and p.get("status") == "ok"
            and want in ((p.get("display") or p["name"]).lower(), p["name"].lower())]
    if not hits:
        hits = [p for p in lib["plugins"] if p["format"] in ORDER and p.get("status") == "ok"
                and want in (p.get("display") or p["name"]).lower()]
    if not hits:
        return None
    hits.sort(key=lambda p: (ORDER[p["format"]], len(p["name"])))
    return hits[0]


def main(argv):
    if len(argv) >= 2 and argv[1] == "ping":
        print(send({"op": "ping"}))
        return
    if len(argv) >= 3 and argv[1] == "load":
        p = find(" ".join(argv[2:]))
        if not p:
            print("Not in your PlugShelf library as VST3, CLAP or VST2:", " ".join(argv[2:]))
            sys.exit(1)
        print(send({"op": "load", "name": p.get("display") or p["name"], "format": p["format"],
                    "id": p["uid"], "instrument": p.get("kind") == "inst"}))
        return
    print(__doc__)


if __name__ == "__main__":
    main(sys.argv)
