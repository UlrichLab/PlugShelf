// PlugShelf for Bitwig Studio: loads plugins chosen in PlugShelf onto the selected track.
// PlugShelf sends one JSON datagram to 127.0.0.1:47813 with the port it listens on ("reply"),
// this script answers with one JSON datagram {"ok": true|false, "msg": "..."}.
// Needs Bitwig Studio 5 or later (Controller API 18, for CLAP).

loadAPI(18);

host.setShouldFailOnDeprecatedUse(false);
host.defineController("PlugShelf", "PlugShelf", "1.0", "DC862C46-2A34-4774-ACCD-680352A1F07F", "PlugShelf");
host.defineMidiPorts(0, 0);

var PORT = 47813;
var VERSION = 1;
var cursorTrack, cursorDevice;

function init() {
   cursorTrack = host.createCursorTrack("PLUGSHELF", "PlugShelf", 0, 0, true);
   cursorTrack.exists().markInterested();
   cursorTrack.name().markInterested();
   cursorDevice = cursorTrack.createCursorDevice();
   cursorDevice.exists().markInterested();
   cursorDevice.name().markInterested();
   if (!host.addDatagramPacketObserver("PlugShelf", PORT, onPacket)) {
      host.errorln("PlugShelf: port " + PORT + " is in use – is a second PlugShelf controller added?");
   } else {
      host.println("PlugShelf: listening on 127.0.0.1:" + PORT);
   }
}

function flush() {}
function exit() {}

// ---------- UTF-8 <-> bytes (the API hands over Java byte arrays; sending wants signed bytes) ----------

function decode(data) {
   var s = "", i = 0, n = data.length;
   while (i < n) {
      var c = data[i++] & 0xff;
      if (c < 0x80) { s += String.fromCharCode(c); continue; }
      var extra = c >= 0xf0 ? 3 : c >= 0xe0 ? 2 : 1;
      var cp = c & (0x3f >> extra);
      for (var k = 0; k < extra && i < n; k++) cp = (cp << 6) | (data[i++] & 0x3f);
      if (cp > 0xffff) { cp -= 0x10000; s += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff)); }
      else s += String.fromCharCode(cp);
   }
   return s;
}

function encode(s) {
   var out = [];
   for (var i = 0; i < s.length; i++) {
      var cp = s.charCodeAt(i);
      if (cp >= 0xd800 && cp < 0xdc00 && i + 1 < s.length) cp = 0x10000 + ((cp - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00);
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
   }
   for (var j = 0; j < out.length; j++) if (out[j] > 127) out[j] -= 256;
   return out;
}

// ---------- commands ----------

function onPacket(data) {
   var msg;
   try { msg = JSON.parse(decode(data)); } catch (e) { return; }
   var reply;
   try { reply = handle(msg); } catch (e) { reply = { ok: false, msg: "Bitwig: " + e }; }
   reply.daw = "bitwig";
   if (msg.reply > 0 && msg.reply < 65536) host.sendDatagramPacket("127.0.0.1", msg.reply, encode(JSON.stringify(reply)));
}

function trackName() { return cursorTrack.exists().get() ? cursorTrack.name().get() : ""; }

function handle(msg) {
   switch (msg.op) {
      case "ping":
         return { ok: true, msg: "Bitwig", track: trackName(), version: VERSION, clap: true };
      case "load":
         return load([msg], false);
      case "chain":
         return load(msg.items || [], true);
      case "file":
         if (!cursorTrack.exists().get()) return noTrack();
         where(!!msg.instrument, false).insertFile(String(msg.path || ""));
         return { ok: true, msg: (msg.name || "Preset") + " → " + trackName() };
      default:
         return { ok: false, msg: "Unknown command: " + msg.op };
   }
}

function noTrack() { return { ok: false, msg: "Select a track in Bitwig first" }; }

// An instrument goes to the start of the track's chain; an effect after the selected device
// (or at the end of the chain). A chain is appended at the end, in order.
function where(instrument, chain) {
   if (instrument) return cursorTrack.startOfDeviceChainInsertionPoint();
   if (!chain && cursorDevice.exists().get()) return cursorDevice.afterDeviceInsertionPoint();
   return cursorTrack.endOfDeviceChainInsertionPoint();
}

function insert(ip, it) {
   var id = String(it.id || "");
   if (!id) throw it.name + " has no plugin id";
   // VST3 class ids come as 32 hex characters (PlugShelf stores them with dashes)
   if (it.format === "VST3") ip.insertVST3Device(id.replace(/-/g, "").toUpperCase());
   else if (it.format === "CLAP") {
      if (typeof ip.insertCLAPDevice !== "function") throw it.name + ": this Bitwig version cannot insert CLAP plugins from a script";
      ip.insertCLAPDevice(id);
   }
   else if (it.format === "VST") ip.insertVST2Device(parseInt(id, 10));
   else throw it.name + ": Bitwig cannot load " + it.format;
}

function load(items, chain) {
   if (!cursorTrack.exists().get()) return noTrack();
   if (!items.length) return { ok: false, msg: "Nothing to load" };
   // instruments first, in reverse, so the first one ends up first in the chain
   var inst = items.filter(function (it) { return it.instrument; });
   var fx = items.filter(function (it) { return !it.instrument; });
   for (var i = inst.length - 1; i >= 0; i--) insert(where(true, chain), inst[i]);
   for (var j = 0; j < fx.length; j++) insert(where(false, chain), fx[j]);
   var names = items.map(function (it) { return it.name; }).join(", ");
   return { ok: true, msg: names + " → " + trackName() };
}
