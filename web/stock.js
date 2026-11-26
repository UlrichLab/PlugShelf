'use strict';
/* PlugShelf – Live's own devices ("stock plugins").
   The list comes from Live's browser through the Live script (/api/stock, kept for when Live is closed).
   They appear under "Stock Plugins" in the sidebar, and in All plugins and the categories when
   "+ Stock Plugins" is ticked. A click loads the device onto the selected track. */

S.stock = [];
FMT_LABEL.Live = 'Live';

/** Category (and further categories) for each Live device. First match wins. */
const STOCK_CATS = [
  [/^(compressor|glue compressor|gate)$/i, 'Dynamics'],
  [/^multiband dynamics$/i, 'Dynamics', 'Mastering'],
  [/^limiter$/i, 'Dynamics', 'Mastering'],
  [/^color limiter$/i, 'Dynamics', 'Mastering', 'Distortion'],
  [/^drum buss$/i, 'Dynamics', 'Distortion', 'Drums'],
  [/^dynamic tube$/i, 'Distortion', 'Dynamics'],
  [/^re-enveloper$/i, 'Dynamics', 'Creative'],
  [/^(eq eight|eq three|channel eq)$/i, 'EQ'],
  [/^auto filter$/i, 'Filter', 'Modulation'],
  [/^(reverb|hybrid reverb|convolution reverb|convolution reverb pro)$/i, 'Reverb'],
  [/^(delay|echo|filter delay|gated delay|vector delay)$/i, 'Delay'],
  [/^grain delay$/i, 'Delay', 'Creative', 'Pitch'],
  [/^pitchloop89$/i, 'Pitch', 'Delay', 'Creative'],
  [/^(shifter|auto shift)$/i, 'Pitch', 'Vocal'],
  [/^pitch hack$/i, 'Pitch', 'Creative'],
  [/^(chorus-ensemble|phaser-flanger|auto pan-tremolo)$/i, 'Modulation'],
  [/^(lfo|shaper|envelope follower|vector map|variations|performer)$/i, 'Modulation', 'Utility'],
  [/^(saturator|overdrive|pedal|erosion|redux|vinyl distortion|roar)$/i, 'Distortion'],
  [/^(amp|cabinet)$/i, 'Distortion'],
  [/^surround panner$/i, 'Spatial'],
  [/^(spectrum|tuner)$/i, 'Analyzer'],
  [/^vocoder$/i, 'Creative', 'Vocal'],
  [/^(corpus|resonators|spectral blur|spectral resonator|spectral time|beat repeat|looper|arrangement looper|prearranger)$/i, 'Creative'],
  [/^(utility|align delay|external audio effect|ir measurement device|audio effect rack)$/i, 'Utility'],
  [/^cv /i, 'Utility'],
  // instruments
  [/^(analog|drift|meld|operator|wavetable|poli|vector fm|vector grain|emit|granulator iii|bass|tree tone)$/i, 'Synth'],
  [/^electric$/i, 'Keys'],
  [/^(drum rack|drum sampler|impulse)$/i, 'Drums'],
  [/^ds /i, 'Drums', 'Synth'],
  [/^(sampler|simpler)$/i, 'Sampler'],
  [/^(collision|tension|instrument rack|external instrument)$/i, 'Instrument'],
];
const stockCats = (name, kind) => {
  for (const [re, main, ...also] of STOCK_CATS) if (re.test(name)) return [main, ...also];
  return [kind === 'midi' ? 'MIDI' : kind === 'inst' ? 'Instrument' : 'Other'];
};

/** Adds Live's devices to the families (called at the end of rebuild()). */
function addStockFams() {
  const ov = S.user.overrides || {};
  for (const d of S.stock) {
    const key = 'live:' + d.name.toLowerCase();
    const o = ov[key] || {};
    const [main, ...also] = stockCats(d.name, d.kind);
    const f = {
      key, items: [], name: d.name, vendor: 'Ableton', kind: d.kind, stock: true,
      category: o.category || main, also: o.also || (o.category ? [] : also),
      formats: ['Live'], bytes: 0, mtime: 0, loadable: true,
    };
    f.hay = [f.name, 'ableton live stock', cat(f.category).label, f.category, ...f.also.map(x => cat(x).label), KIND_NAME[f.kind], S.user.notes?.[key] || ''].join(' ').toLowerCase();
    S.fams.push(f);
    S.famBy.set(key, f);
  }
}

async function loadStockList() {
  try { const r = await api.get('/api/stock'); S.stock = r.devices || []; } catch { /* app busy */ }
  if (S.user) { rebuild(); if (S.view === 'lib') renderLib(); }
}

async function loadStock(f) {
  flash(f.key);
  let r;
  try { r = await api.post('/api/stock/load', { name: f.name, kind: f.kind }); } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  toast(r.ok ? (r.msg || `${f.name} → Live`) : (r.msg || 'Loading failed'), r.ok ? 'ok' : 'err', r.offline ? { label: 'Open Setup', fn: () => show('setup') } : null);
}
/** Pictures of the stock devices: Live puts each one alone on a scratch track and PlugShelf photographs it. */
async function takeStockPictures() {
  const n = S.stock.length;
  if (!n) return toast('Open Live once so PlugShelf knows its devices.', 'err');
  const ok = await confirmDlg('Take pictures of the stock plugins?',
    `PlugShelf puts each of Live’s ${n} devices on a scratch track, one after another, and photographs it (about ${Math.ceil(n * 2.6 / 60)} minutes). Use an empty Live set and keep Live’s window in front and uncovered until it is done. The scratch track is removed afterwards. The first time, macOS asks to allow Screen Recording for PlugShelf.`,
    'Start');
  if (!ok) return;
  let r;
  try { r = await api.post('/api/stock/shots', {}); } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  if (!r.ok) return toast(r.msg || 'Could not start', 'err', r.offline ? { label: 'Open Setup', fn: () => show('setup') } : null);
  watchStockShots();
}

let stockShotTimer;
async function watchStockShots() {
  clearTimeout(stockShotTimer);
  let p;
  try { p = await api.get('/api/stock/shots'); } catch { stockShotTimer = setTimeout(watchStockShots, 1500); return; }
  const bar = $('#capbar');
  if (p.running) {
    bar.hidden = false;
    $('#capFill').style.width = (p.total ? Math.round(p.done / p.total * 100) : 3) + '%';
    $('#capText').textContent = `Stock pictures ${p.done}/${p.total}${p.current ? ' – ' + p.current : ''}`;
    $('#capStop').onclick = () => api.post('/api/stock/shots', { cancel: true });
    watchCapture();                                   // picks up the new pictures as they come
    stockShotTimer = setTimeout(watchStockShots, 1200);
  } else {
    bar.hidden = true;
    $('#capStop').onclick = () => api.post('/api/capture/cancel');
    await watchCapture();
    if (p.total) toast(`Stock pictures: ${p.ok} taken${p.failed ? `, ${p.failed} failed` : ''}.`, p.failed ? 'err' : 'ok');
  }
}

loadStockList();
