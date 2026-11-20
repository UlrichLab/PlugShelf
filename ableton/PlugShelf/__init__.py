# PlugShelf - Ableton Live control surface script.
#
# PlugShelf copies this folder to <User Library>/Remote Scripts/PlugShelf.
# In Live pick "PlugShelf" once under Settings > Link, Tempo & MIDI > Control Surface.
#
# Protocol: the PlugShelf app sends one JSON datagram to 127.0.0.1:47812 and gets one back.
# The commands live in ops.py; {"op": "reload"} re-reads that file, so app updates
# reach a running Live without restarting it.

import importlib
import json
import socket

from _Framework.ControlSurface import ControlSurface

from . import ops

PORT = 47812


class PlugShelf(ControlSurface):
    def __init__(self, c_instance):
        ControlSurface.__init__(self, c_instance)
        self.index = None          # Live's plugin browser, flattened (built on first use)
        self.queue = []            # browser items still to load, one per tick
        self._sock = None
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.bind(("127.0.0.1", PORT))
            s.setblocking(False)
            self._sock = s
            self.show_message("PlugShelf connected")
        except Exception as e:
            self.log_message("PlugShelf: port %d not available (%s)" % (PORT, e))
            self.show_message("PlugShelf: port %d is in use" % PORT)

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
        if self.queue:
            item = self.queue.pop(0)
            try:
                self.application().browser.load_item(item)
            except Exception as e:
                self.log_message("PlugShelf: load failed (%s)" % e)
        self._poll()

    def _poll(self):
        global ops
        if self._sock is None:
            return
        for _ in range(16):
            try:
                data, addr = self._sock.recvfrom(65536)
            except (BlockingIOError, OSError):
                return
            try:
                cmd = json.loads(data.decode("utf-8"))
                if cmd.get("op") == "reload":
                    ops = importlib.reload(ops)
                    self.index = None
                    reply = {"ok": True, "msg": "reloaded", "version": getattr(ops, "VERSION", "?")}
                else:
                    reply = ops.handle(self, cmd)
            except Exception as e:
                reply = {"ok": False, "msg": "Live: %s" % e}
            try:
                self._sock.sendto(json.dumps(reply).encode("utf-8"), addr)
            except Exception:
                pass


def create_instance(c_instance):
    return PlugShelf(c_instance)
