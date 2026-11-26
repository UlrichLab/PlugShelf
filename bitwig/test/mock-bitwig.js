// Runs PlugShelf.control.js against a stand-in for Bitwig's controller API (no Bitwig needed):
//   node bitwig/test/mock-bitwig.js
// It checks the commands PlugShelf sends end up as the right insert calls with the right ids.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const calls = [];
const sent = [];
const value = v => ({ get: () => v, markInterested() {} });
const point = where => ({
  insertVST3Device: id => calls.push([where, 'VST3', id]),
  insertVST2Device: id => calls.push([where, 'VST2', id]),
  insertCLAPDevice: id => calls.push([where, 'CLAP', id]),
  insertFile: p => calls.push([where, 'file', p]),
});
let observer = null;
const host = {
  setShouldFailOnDeprecatedUse() {}, defineController() {}, defineMidiPorts() {},
  println() {}, errorln: m => { throw new Error(m); },
  addDatagramPacketObserver: (name, port, cb) => { if (port !== 47813) throw new Error('port ' + port); observer = cb; return true; },
  sendDatagramPacket: (h, port, bytes) => sent.push(JSON.parse(Buffer.from(bytes.map(b => b & 255)).toString('utf8'))),
  createCursorTrack: () => ({
    exists: () => value(true), name: () => value('Audio 1'),
    startOfDeviceChainInsertionPoint: () => point('start'), endOfDeviceChainInsertionPoint: () => point('end'),
    createCursorDevice: () => ({ exists: () => value(true), name: () => value('EQ Eight'), afterDeviceInsertionPoint: () => point('after') }),
  }),
};
const ctx = { host, loadAPI() {}, JSON, String, parseInt };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'PlugShelf', 'PlugShelf.control.js'), 'utf8'), ctx);
ctx.init();

const packet = obj => observer([...Buffer.from(JSON.stringify(obj), 'utf8')].map(b => (b > 127 ? b - 256 : b)));
let fail = 0;
const expect = (label, ok) => { console.log((ok ? 'ok   ' : 'FAIL ') + label); if (!ok) fail++; };

packet({ op: 'ping', reply: 5000 });
expect('ping answers', sent[0]?.ok === true && sent[0].daw === 'bitwig');

packet({ op: 'load', name: 'Acid V', format: 'VST3', id: '41727475-4156-4953-5433-303350726f63', instrument: true, reply: 5000 });
expect('VST3 instrument at the start, id without dashes', JSON.stringify(calls[0]) === JSON.stringify(['start', 'VST3', '41727475415649535433303350726F63']));

packet({ op: 'load', name: 'Acid V', format: 'VST', id: '1412640819', instrument: false, reply: 5000 });
expect('VST2 effect after the selected device, numeric id', JSON.stringify(calls[1]) === JSON.stringify(['after', 'VST2', 1412640819]));

packet({ op: 'load', name: 'ANINA', format: 'CLAP', id: 'com.crql.anina', reply: 5000 });
expect('CLAP by its id', JSON.stringify(calls[2]) === JSON.stringify(['after', 'CLAP', 'com.crql.anina']));

packet({ op: 'chain', items: [{ name: 'A', format: 'VST3', id: 'aa' }, { name: 'B', format: 'VST3', id: 'bb' }], reply: 5000 });
expect('chain appended at the end, in order', calls[3]?.[0] === 'end' && calls[3][2] === 'AA' && calls[4][2] === 'BB');

packet({ op: 'load', name: 'X', format: 'AU', id: 'aufx:a:b', reply: 5000 });
expect('AU refused with a message', sent[sent.length - 1].ok === false && /cannot load AU/.test(sent[sent.length - 1].msg));

packet({ op: 'load', name: 'Beyoncé – Ümlaut', format: 'VST3', id: 'cc', reply: 5000 });
expect('UTF-8 names survive', sent[sent.length - 1].msg.startsWith('Beyoncé – Ümlaut'));

console.log(fail ? `${fail} failed` : 'all passed');
process.exit(fail ? 1 : 0);
