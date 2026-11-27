'use strict';
/* PlugShelf – the page. Talks to the app's own server on 127.0.0.1 (see API.swift). */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);

const api = {
  async get(p) { const r = await fetch(p, { cache: 'no-store' }); return r.json(); },
  async post(p, body) {
    const r = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PlugShelf': '1' }, body: JSON.stringify(body || {}) });
    return r.json();
  },
};

/* ---------- categories ---------- */
const I = {
  wave: '<path d="M2 12c2.5-7 5-7 7.5 0s5 7 7.5 0 3.5-4 5-2"/>',
  keys: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 5v9M12 5v9M16 5v9M6.5 14h3M14.5 14h3"/>',
  drum: '<ellipse cx="12" cy="8" rx="8" ry="3"/><path d="M4 8v8c0 1.7 3.6 3 8 3s8-1.3 8-3V8M8 2l3 6M16 2l-3 6"/>',
  sampler: '<path d="M3 12h2M6 8v8M9 5v14M12 9v6M15 6v12M18 10v4M21 12h0"/>',
  eq: '<path d="M2 15c3 0 3-6 6-6s3 9 6 9 3-12 8-12"/>',
  dyn: '<path d="M3 20 12 11h9M3 20V4M3 20h18"/><path d="M12 11 21 4" stroke-dasharray="2 3"/>',
  verb: '<path d="M6 18a8 8 0 0 1 0-12M10 16a5 5 0 0 1 0-8M14 14a2 2 0 0 1 0-4"/><circle cx="18" cy="12" r="1.4"/>',
  delay: '<circle cx="5" cy="12" r="2.6"/><circle cx="12" cy="12" r="2" opacity=".7"/><circle cx="18" cy="12" r="1.4" opacity=".45"/><circle cx="22" cy="12" r=".8" opacity=".3"/>',
  mod: '<path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0"/><path d="M2 19h20" stroke-dasharray="1 3"/>',
  dist: '<path d="M2 12c1.5-6 2.5-7 4-7h3l1.5 7L12 19h3c1.5 0 2.5-1 4-7"/><path d="M2 5h20M2 19h20" opacity=".4"/>',
  filter: '<path d="M2 8h9c3 0 3-1.5 5 0s3 10 6 12"/>',
  pitch: '<path d="M8 20V6M4 10l4-4 4 4M16 4v14M12 14l4 4 4-4"/>',
  spatial: '<circle cx="8.5" cy="12" r="5.5"/><circle cx="15.5" cy="12" r="5.5"/>',
  meter: '<path d="M4 20V12M9 20V6M14 20V9M19 20V4"/>',
  master: '<path d="M3 18 6 7l4 5 2-8 2 8 4-5 3 11z"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L3 18l3 3 6.2-6.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.6-.4-.4-2.6z"/>',
  midi: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r=".9"/><circle cx="16" cy="10" r=".9"/><circle cx="12" cy="8" r=".9"/><circle cx="9" cy="14" r=".9"/><circle cx="15" cy="14" r=".9"/><path d="M10 19h4"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  strip: '<path d="M6 3v18M12 3v18M18 3v18"/><rect x="4" y="13" width="4" height="3" rx="1"/><rect x="10" y="7" width="4" height="3" rx="1"/><rect x="16" y="11" width="4" height="3" rx="1"/>',
  dot: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/>',
  tape: '<circle cx="7" cy="11" r="4"/><circle cx="17" cy="11" r="4"/><circle cx="7" cy="11" r="1"/><circle cx="17" cy="11" r="1"/><path d="M7 15h10M4 20h16"/>',
  amp: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6.5" r=".8"/><circle cx="10.5" cy="6.5" r=".8"/><circle cx="12" cy="14.5" r="3.5"/>',
  surround: '<circle cx="12" cy="12" r="2.5"/><path d="M5 5l2 2M19 5l-2 2M5 19l2-2M19 19l-2-2M12 3v2.5"/><circle cx="12" cy="12" r="8" stroke-dasharray="2 3"/>',
};
const CATS = {
  Synth: { label: 'Synths', hue: 268, i: I.wave },
  Keys: { label: 'Keys & Piano', hue: 32, i: I.keys },
  Drums: { label: 'Drums', hue: 8, i: I.drum },
  Sampler: { label: 'Sampler', hue: 300, i: I.sampler },
  Instrument: { label: 'Other instruments', hue: 245, i: I.dot },
  EQ: { label: 'EQ', hue: 190, i: I.eq },
  Dynamics: { label: 'Dynamics', hue: 152, i: I.dyn },
  'Channel Strip': { label: 'Channel Strip', hue: 170, i: I.strip },
  Reverb: { label: 'Reverb', hue: 222, i: I.verb },
  Delay: { label: 'Delay', hue: 205, i: I.delay },
  Modulation: { label: 'Modulation', hue: 320, i: I.mod },
  Distortion: { label: 'Saturation', hue: 14, i: I.dist },
  Tape: { label: 'Tape & lo-fi', hue: 26, i: I.tape },
  Amp: { label: 'Amps & pedals', hue: 0, i: I.amp },
  Filter: { label: 'Filter', hue: 48, i: I.filter },
  Pitch: { label: 'Pitch', hue: 280, i: I.pitch },
  Vocal: { label: 'Vocals', hue: 340, i: I.mic },
  Spatial: { label: 'Stereo & space', hue: 236, i: I.spatial },
  Surround: { label: 'Surround', hue: 252, i: I.surround },
  Mastering: { label: 'Mastering', hue: 40, i: I.master },
  Analyzer: { label: 'Analysis', hue: 125, i: I.meter },
  Restoration: { label: 'Restoration', hue: 100, i: I.spark },
  Creative: { label: 'Creative & multi-FX', hue: 290, i: I.mod },
  Utility: { label: 'Utilities', hue: 210, i: I.tool },
  MIDI: { label: 'MIDI', hue: 215, i: I.midi },
  Other: { label: 'Other', hue: 220, i: I.dot },
};
const cat = c => CATS[c] || CATS.Other;
const svg = (body, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${body}</svg>`;
const FMT_LABEL = { VST3: 'VST3', VST: 'VST2', AU: 'AU', CLAP: 'CLAP', AAX: 'AAX' };
const KIND_NAME = { inst: 'Instrument', fx: 'Effect', midi: 'MIDI effect' };
const SORTS = [['name', 'Name'], ['vendor', 'Maker'], ['cat', 'Category'], ['used', 'Most loaded'], ['recent', 'Recently loaded'], ['new', 'Newly installed'], ['size', 'Size']];

/* ---------- state ---------- */
const S = {
  lib: null, user: null, info: null,
  fams: [], famBy: new Map(), list: [],
  view: 'lib',
  f: { q: '', kind: 'all', cat: null, maker: null, formats: new Set(), coll: null, sort: 'name' },
  makerQ: '', makersAll: false,
  sel: 0,
  kbd: false,             // show the selected card only once the keyboard is used
  drawer: null,            // {type:'info', key} | {type:'rack', id}
  daw: { ok: false, msg: '' },
  script: null,
  scanning: false,
  pics: { thumbs: {}, failed: {} },
  capture: null,
  rone: 0,
};

const fmtBytes = b => {
  if (!b) return '0 MB';
  if (b >= 1e9) return (b / 1e9).toFixed(b >= 1e10 ? 0 : 1) + ' GB';
  if (b >= 1e6) return Math.round(b / 1e6) + ' MB';
  return Math.max(1, Math.round(b / 1e3)) + ' KB';
};
const fmtDate = t => t ? new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';
const ago = t => {
  if (!t) return 'never';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
};
const settings = () => S.user.settings;
const prefer = () => { const p = settings().prefer || ['VST3', 'AU', 'VST', 'CLAP']; return [...p, ...['VST3', 'AU', 'VST', 'CLAP'].filter(x => !p.includes(x))]; };
const fmtRank = f => { const i = prefer().indexOf(f); return i < 0 ? 9 : i; };
const native = p => !p.archs?.length || p.archs.includes('arm64') || S.lib?.machine !== 'arm64';
/** A plugin file PlugShelf may use: intact, not AAX, runs natively on this Mac, and Live did not reject it. */
const usable = p => p.status === 'ok' && p.format !== 'AAX' && native(p) && !p.liveFailed;

/* ---------- own categories ---------- */
const CUSTOM_HUES = [12, 48, 95, 160, 200, 250, 290, 330];
function applyCustomCats() {
  for (const k of Object.keys(CATS)) if (k.startsWith('u:')) delete CATS[k];
  for (const c of S.user?.customCats || []) CATS[c.id] = { label: c.label, hue: c.hue, i: I.dot, own: true };
}
async function newCategory() {
  const name = await ask('New category', 'Shown at the end of the category list. Add plugins to it in their details panel (Category).');
  if (!name) return;
  const list = (S.user.customCats ||= []);
  list.push({ id: 'u:' + Date.now().toString(36), label: name, hue: CUSTOM_HUES[list.length % CUSTOM_HUES.length] });
  saveUser(); rebuild(); renderLib();
}
function removeCategory(id) {
  S.user.customCats = (S.user.customCats || []).filter(c => c.id !== id);
  for (const o of Object.values(S.user.overrides || {})) {
    if (o.also) o.also = o.also.filter(x => x !== id);
    if (o.category === id) { o.category = o.also?.shift(); if (!o.category) { delete o.category; delete o.also; } }
  }
  if (S.f.cat === id) S.f.cat = null;
  saveUser(); rebuild(); renderLib(); renderDrawer();
}

/* ---------- families ---------- */
function rebuild() {
  applyCustomCats();
  const by = new Map();
  for (const p of S.lib?.plugins || []) {
    let a = by.get(p.family);
    if (!a) by.set(p.family, a = []);
    a.push(p);
  }
  const rank = { moduleinfo: 0, plist: 1, live: 2, guess: 3 };
  const ov = S.user.overrides || {};
  S.fams = []; S.famBy = new Map();
  for (const [key, items] of by) {
    items.sort((a, b) => (rank[a.source] - rank[b.source]) || (fmtRank(a.format) - fmtRank(b.format)) || a.name.length - b.name.length);
    const b = items[0];
    const paths = new Map(items.map(p => [p.path, p.bytes]));
    const o = ov[key] || {};
    const f = {
      key, items,
      name: o.name || b.display || b.name,
      vendor: b.vendor || 'Unknown',
      kind: o.kind || b.kind,
      category: o.category || fixCategory(o.name || b.display || b.name, b.category)[0],
      also: o.also || (o.category ? [] : fixCategory(o.name || b.display || b.name, b.category).slice(1)),
      formats: [...new Set(items.map(p => p.format))].sort((x, y) => fmtRank(x) - fmtRank(y)),
      bytes: [...paths.values()].reduce((s, x) => s + x, 0),
      mtime: Math.max(...items.map(p => p.mtime || 0)),
    };
    f.loadable = items.some(usable);
    f.hay = [f.name, f.vendor, cat(f.category).label, f.category, ...f.also.map(x => cat(x).label), KIND_NAME[f.kind], ...f.formats.map(x => FMT_LABEL[x]), ...new Set(items.map(p => p.name)), S.user.notes?.[key] || ''].join(' ').toLowerCase();
    S.fams.push(f);
    S.famBy.set(key, f);
  }
  if (typeof addStockFams === 'function') addStockFams();
  $('#tLib').textContent = S.fams.filter(f => showable(f) && !f.stock).length;
}

const showable = f => settings().showAAX || f.formats.some(x => x !== 'AAX');
const picsOn = () => settings().pics !== false;
/** Can PlugShelf open this plugin to take its picture? (VST3, AU or a non-shell VST2) */
const hostable = f => f.items.some(p => p.status === 'ok' && (p.format === 'VST3' || p.format === 'AU' || (p.format === 'VST' && !p.shell)));

/** The plugin to load for a family: preferred format first, native before Intel-only, Stereo before Mono. */
function pickItem(f, format, name) {
  const order = format ? [format] : prefer();
  const variant = p => (/stereo/i.test(p.name) ? 0 : /mono/i.test(p.name) ? 2 : 1) * 1000 + p.name.length;
  // Only versions that run on this Mac and that Live accepts; VST3 first unless Setup says otherwise.
  for (const fmt of order) {
    const c = f.items.filter(p => p.format === fmt && usable(p) && (!name || p.name === name));
    if (c.length) return c.sort((a, b) => variant(a) - variant(b))[0];
  }
  return null;
}

/* ---------- filtering ---------- */
/** Universal Audio plugins: UAD (Apollo DSP) and UADx (native), plus UA's own console/strip plugins. */
const isUAD = f => /universal audio/i.test(f.vendor || '');
function passes(f, skip = '') {
  const F = S.f, u = S.user;
  if (!showable(f)) return false;
  const hidden = u.hidden.includes(f.key);
  if (F.coll === 'hidden' ? !hidden : hidden) return false;
  if (F.coll === 'favs' && !u.favs.includes(f.key)) return false;
  if (F.coll === 'recent' && !u.lastUsed[f.key]) return false;
  if (F.coll === 'new' && f.mtime < Date.now() - 30 * 864e5) return false;
  if (F.coll === 'uad' && !isUAD(f)) return false;
  // Live's own devices: always under "Stock Plugins", elsewhere in the library only with "+ Stock Plugins"
  if (F.coll === 'stock' && !f.stock) return false;
  if (f.stock && !F.coll && !settings().showStock) return false;
  if (F.coll?.startsWith('c:')) {
    const c = u.collections.find(x => x.id === F.coll.slice(2));
    if (!c || !c.items.includes(f.key)) return false;
  }
  if (F.kind !== 'all' && f.kind !== F.kind) return false;
  if (skip !== 'cat' && F.cat && f.category !== F.cat && !f.also?.includes(F.cat)) return false;
  if (skip !== 'maker' && F.maker && f.vendor !== F.maker) return false;
  if (F.formats.size && !f.formats.some(x => F.formats.has(x))) return false;
  if (F.q && score(f) <= 0) return false;
  return true;
}

function score(f) {
  const q = S.f.q.toLowerCase().trim();
  if (!q) return 1;
  const toks = q.split(/\s+/);
  let s = 0;
  const n = f.name.toLowerCase();
  for (const t of toks) {
    if (!f.hay.includes(t)) return 0;
    if (n === t) s += 100;
    else if (n.startsWith(t)) s += 60;
    else if (n.split(/[\s\-_.]+/).some(w => w.startsWith(t))) s += 35;
    else if (n.includes(t)) s += 20;
    else if (f.vendor.toLowerCase().startsWith(t)) s += 12;
    else s += 4;
  }
  return s + (S.user.usage[f.key] || 0) * 0.01;
}

function sorted(list) {
  const u = S.user, by = S.f.sort;
  const name = (a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  if (S.f.q) return list.map(f => [score(f), f]).sort((a, b) => b[0] - a[0] || name(a[1], b[1])).map(x => x[1]);
  const cmp = {
    name,
    vendor: (a, b) => a.vendor.localeCompare(b.vendor, 'en', { sensitivity: 'base' }) || name(a, b),
    cat: (a, b) => cat(a.category).label.localeCompare(cat(b.category).label, 'en') || name(a, b),
    used: (a, b) => (u.usage[b.key] || 0) - (u.usage[a.key] || 0) || name(a, b),
    recent: (a, b) => (u.lastUsed[b.key] || 0) - (u.lastUsed[a.key] || 0) || name(a, b),
    new: (a, b) => b.mtime - a.mtime || name(a, b),
    size: (a, b) => b.bytes - a.bytes || name(a, b),
  }[by] || name;
  if (S.f.coll?.startsWith('c:') && by === 'name') {
    // a collection keeps the order its plugins were added in
    const c = u.collections.find(x => x.id === S.f.coll.slice(2));
    if (c) return list.sort((a, b) => c.items.indexOf(a.key) - c.items.indexOf(b.key));
  }
  return list.sort(cmp);
}

/* ---------- rendering: library ---------- */
function cardHTML(f, i, extra = '') {
  const c = cat(f.category), fav = S.user.favs.includes(f.key);
  const fm = f.formats.filter(x => x !== 'AAX' || settings().showAAX);
  const pic = picsOn() && S.pics.thumbs[f.key];
  if (i >= 0 && settings().dblLoad && S.bigKey === f.key) extra += ' big';
  const bigCss = i >= 0 && settings().dblLoad && S.bigKey === f.key ? bigStyle() : '';
  const favSvg = fav ? '<svg class="favmark" viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>' : '';
  const acts = `<div class="acts">
      <button data-act="fav" title="${fav ? 'Remove from favourites' : 'Add to favourites'}">${fav ? '★' : '☆'}</button>
      <button data-act="info" title="Details">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>')}</button>
      <button data-act="menu" title="More">${svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}</button>
    </div>`;
  if (pic) {
    return `<div class="card pic${i === S.sel && (S.kbd || S.f.q) ? ' sel' : ''}${f.loadable ? '' : ' dead'}${extra}" data-k="${esc(f.key)}" data-i="${i}" draggable="true" style="--h:${c.hue};${bigCss}">
  <div class="face">
    <img class="bg" src="${esc(pic)}&s=blur" alt="" loading="lazy" decoding="async"><img class="fg" src="${esc(pic)}${i === -2 ? '' : '&s=tile'}" alt="" loading="lazy" decoding="async">
    <div class="cap"><div class="t"><b>${esc(f.name)}</b><small>${esc(f.vendor)}</small></div><span class="fmts">${fm.map(x => `<b>${FMT_LABEL[x]}</b>`).join('')}</span></div>
    <i class="led ${f.kind}" title="${KIND_NAME[f.kind]}"></i>${favSvg}${acts}
  </div>
</div>`;
  }
  return `<div class="card${i === S.sel && (S.kbd || S.f.q) ? ' sel' : ''}${f.loadable ? '' : ' dead'}${extra}" data-k="${esc(f.key)}" data-i="${i}" draggable="true" style="--h:${c.hue};${bigCss}">
  <div class="face">
    <div class="fv">${esc(f.vendor)}</div>
    <div class="fn">${esc(f.name)}</div>
    <div class="ff"><span class="fc">${svg(c.i)}${esc(c.label)}</span><span class="fmts">${fm.map(x => `<b>${FMT_LABEL[x]}</b>`).join('')}</span></div>
    ${svg(c.i, 'wm')}
    <i class="led ${f.kind}" title="${KIND_NAME[f.kind]}"></i>
    ${fav ? '<svg class="favmark" viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>' : ''}
    <div class="acts">
      <button data-act="fav" title="${fav ? 'Remove from favourites' : 'Add to favourites'}">${fav ? '★' : '☆'}</button>
      <button data-act="info" title="Details">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>')}</button>
      <button data-act="menu" title="More">${svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}</button>
    </div>
  </div>
</div>`;
}

function renderLib() {
  if (!S.lib) {
    $('#grid').innerHTML = '';
    $('#side').innerHTML = '';
    showEmpty('<h3>Scanning your plugins…</h3><p>The first time takes a few seconds.</p>');
    return;
  }
  renderSide();
  if (typeof isKontaktView === 'function' && isKontaktView()) { renderKontakt(); renderBanner(); return; }
  if (typeof isUserRackView === 'function' && isUserRackView()) { renderUserRacks(); renderBanner(); return; }
  let list = sorted(S.fams.filter(f => passes(f)));
  // UAD view: grouped by category, in the sidebar's category order, then by name
  const grouped = S.f.coll === 'uad' && !S.f.q && !S.f.cat;
  if (grouped) {
    const order = Object.keys(CATS);
    list = [...list].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name));
  }
  S.list = list;
  if (S.sel >= list.length) S.sel = Math.max(0, list.length - 1);

  const F = S.f;
  let title = 'All plugins';
  if (F.coll === 'favs') title = 'Favourites';
  else if (F.coll === 'recent') title = 'Recently loaded';
  else if (F.coll === 'new') title = 'Newly installed (30 days)';
  else if (F.coll === 'uad') title = 'UAD Plugins';
  else if (F.coll === 'stock') title = 'Stock Plugins';
  else if (F.coll === 'hidden') title = 'Hidden';
  else if (F.coll?.startsWith('c:')) title = S.user.collections.find(x => x.id === F.coll.slice(2))?.name || 'Collection';
  const sub = [F.cat && cat(F.cat).label, F.maker].filter(Boolean);
  if (sub.length) title += ' · ' + sub.join(' · ');
  if (F.q) title = `Search “${F.q}”`;
  $('#title').textContent = title;
  $('#count').textContent = `${list.length} ${list.length === 1 ? 'plugin' : 'plugins'}`;

  const fmts = ['VST3', 'AU', 'VST', 'CLAP', ...(settings().showAAX ? ['AAX'] : [])];
  $('#fmts').innerHTML = fmts.map(x => `<button class="chip${F.formats.has(x) ? ' on' : ''}" data-f="${x}">${FMT_LABEL[x]}</button>`).join('');
  $('#sort').innerHTML = SORTS.map(([k, l]) => `<option value="${k}"${k === F.sort ? ' selected' : ''}>${l}</option>`).join('');
  $('#zoom').value = settings().zoom || 190;

  // most-loaded shelf on the plain "all" view
  const top = Object.entries(S.user.usage).sort((a, b) => b[1] - a[1]).map(([k]) => S.famBy.get(k)).filter(f => f && showable(f) && !S.user.hidden.includes(f.key)).slice(0, 10);
  const plain = !F.q && !F.coll && !F.cat && !F.maker && !F.formats.size && F.kind === 'all';
  $('#shelfWrap').hidden = !(plain && top.length >= 3);
  if (!$('#shelfWrap').hidden) $('#shelf').innerHTML = top.map(f => cardHTML(f, -1)).join('');

  $('#grid').classList.toggle('dblmode', !!settings().dblLoad);
  $('#grid').innerHTML = list.map((f, i) => {
    const head = grouped && (i === 0 || list[i - 1].category !== f.category)
      ? `<div class="grp" style="--h:${cat(f.category).hue}"><i class="dot"></i>${esc(cat(f.category).label)}<span>${list.filter(x => x.category === f.category).length}</span></div>` : '';
    return head + cardHTML(f, i);
  }).join('');
  if (!list.length) {
    if (F.q) showEmpty(`<h3>Nothing found for “${esc(F.q)}”</h3><p>Try another spelling, or clear the filters in the sidebar.</p>`);
    else if (F.coll === 'favs') showEmpty('<h3>No favourites yet</h3><p>Hover a tile and click ☆ – or drag it onto “Favourites”.</p>');
    else if (F.coll?.startsWith('c:')) showEmpty('<h3>This collection is empty</h3><p>Drag tiles onto the collection’s name in the sidebar.</p>');
    else if (F.coll === 'recent') showEmpty('<h3>Nothing loaded yet</h3><p>Clicking a tile loads the plugin onto the selected track in Live.</p>');
    else showEmpty('<h3>No plugins match these filters</h3>');
  } else $('#empty').hidden = true;
  renderBanner();
}

function showEmpty(html) { $('#empty').innerHTML = html; $('#empty').hidden = false; }

function renderBanner() {
  const b = $('#banner');
  const up = S.update?.available && settings().skipVersion !== S.update.latest;
  if (up) {
    b.hidden = false;
    b.innerHTML = `<div><b>PlugShelf ${esc(S.update.latest)} is available</b> – you have ${esc(S.update.current)}.</div><div class="grow"></div>
      <button class="btn sm" data-update-notes>What’s new</button><button class="btn sm pri" data-update-install>Install &amp; restart</button><button class="x" data-update-skip title="Not now">×</button>`;
    return;
  }
  const need = S.script && (!S.script.installed || !S.script.current) && !S.daw.ok && !settings().bannerOff;
  b.hidden = !need;
  if (!need) return;
  b.innerHTML = `<div><b>${S.script.installed ? 'New version of the Live script' : 'Load plugins straight into Ableton'}</b> – ${S.script.installed ? 'please update it in Setup.' : 'install the small Live script once.'}</div><div class="grow"></div><button class="btn sm pri" data-go="setup">Open Setup</button><button class="x" data-banner-off title="Hide">×</button>`;
}

function renderSide() {
  const u = S.user, F = S.f;
  const base = S.fams.filter(f => showable(f) && !u.hidden.includes(f.key) && !f.stock);
  const stockN = S.fams.filter(f => f.stock && !u.hidden.includes(f.key)).length;
  const it = (key, label, n, icon, extra = '') => `<button class="item${F.coll === key ? ' on' : ''}" data-coll="${key ?? ''}" ${extra}>${icon}<span class="t">${esc(label)}</span><span class="n">${n}</span></button>`;
  const newCount = base.filter(f => f.mtime >= Date.now() - 30 * 864e5).length;
  let h = `<h4>Library</h4>
    ${it(null, 'All plugins', base.length, svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'))}
    <label class="item chk" title="Show Live's own devices in All plugins and the categories too"><input type="checkbox" id="showStock" ${settings().showStock ? 'checked' : ''}><span class="t">+ Stock Plugins</span><button class="link snap" id="stockShots" title="Take pictures of the stock plugins (in an empty Live set)">${svg('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}Snap</button></label>
    ${stockN ? it('stock', 'Stock Plugins', stockN, svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h2M7 13h2M7 17h2M12 9v8M16 9v8"/>')) : ''}
    ${it('favs', 'Favourites', u.favs.filter(k => S.famBy.has(k)).length, svg('<path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6-4.4-4.1 6-.8z"/>'), 'data-drop="favs"')}
    ${it('recent', 'Recently loaded', Object.keys(u.lastUsed).filter(k => S.famBy.has(k)).length, svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'))}
    ${newCount ? it('new', 'Newly installed', newCount, svg('<path d="M12 3v18M3 12h18"/>')) : ''}
    ${base.some(isUAD) ? it('uad', 'UAD Plugins', base.filter(isUAD).length, svg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10v4M11 10v4M15 10v4"/>')) : ''}
    ${S.kontakt?.libraries.length ? it('kontakt', 'Kontakt Libraries', S.kontakt.libraries.length, svg('<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/>')) : ''}
    ${S.kontakt?.libraries.length || S.kontakt?.presets.length ? it('kpresets', 'Kontakt Presets', S.kontakt.presets.length, svg('<path d="M6 3h9l3 3v15H6z"/><path d="M9 13l2 2 4-4"/>')) : ''}
    ${u.hidden.length ? it('hidden', 'Hidden', u.hidden.length, svg('<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 22 12a14 14 0 0 1-3 3.8M6.2 6.3A14 14 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.2-1"/>')) : ''}
    ${S.f.coll === 'kpresets' ? `<h4>Type</h4><div class="seg">${[['all', 'All'], ['preset', 'Presets'], ['rack', 'Racks']].map(([k, l]) => `<button data-kkind="${k}" class="${(S.f.kkind || 'all') === k ? 'on' : ''}">${l}</button>`).join('')}</div>`
      : S.f.coll === 'kontakt' ? '' : `<h4>Type</h4>
    <div class="seg">${[['all', 'All'], ['inst', 'Instr.'], ['fx', 'Effects'], ['midi', 'MIDI']].map(([k, l]) => `<button data-kind="${k}" class="${F.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>`}</div>
    <h4><span>Collections</span><button class="link" id="newColl" title="New collection">+</button></h4>`;
  if (!u.collections.length) h += '<div class="hint">Your own lists, e.g. “Vocal chain” or “Mix bus”. Just drag tiles here.</div>';
  for (const c of u.collections) {
    h += `<button class="item${F.coll === 'c:' + c.id ? ' on' : ''}" data-coll="c:${c.id}" data-drop="c:${c.id}" data-cmenu="${c.id}">${svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')}<span class="t">${esc(c.name)}</span><span class="n">${c.items.filter(k => S.famBy.has(k)).length}</span></button>`;
  }
  h += `<h4><span>Racks</span><button class="link" id="newRack" title="New rack">+</button></h4>`;
  if (!u.racks.length) h += '<div class="hint">A chain of plugins that goes onto the track in this order with one click.</div>';
  for (const r of u.racks) {
    const on = S.drawer?.type === 'rack' && S.drawer.id === r.id;
    h += `<button class="item${on ? ' on' : ''}" data-rack="${r.id}" data-drop="r:${r.id}">${svg('<rect x="3" y="4" width="18" height="5" rx="1.5"/><rect x="3" y="11" width="18" height="5" rx="1.5"/><path d="M7 20h10"/>')}<span class="t">${esc(r.name)}</span><span class="n">${r.items.length}</span></button>`;
  }

  if (typeof userRackSide === 'function') h += userRackSide();
  if (typeof isUserRackView === 'function' && isUserRackView()) {
    const sd = $('#side'), sc = sd.scrollTop; sd.innerHTML = h; sd.scrollTop = sc; return;
  }
  if (typeof isKontaktView === 'function' && isKontaktView()) {
    h += kontaktSide();
    const sd = $('#side'), sc = sd.scrollTop; sd.innerHTML = h; sd.scrollTop = sc; return;
  }
  // categories (counted without the category filter itself)
  const cc = {};
  for (const f of S.fams) if (passes(f, 'cat')) for (const c of [f.category, ...(f.also || [])]) cc[c] = (cc[c] || 0) + 1;
  h += '<h4><span>Categories</span><button class="link" id="newCat" title="Add your own category">+</button></h4>';
  for (const k of Object.keys(CATS)) {
    if (!cc[k] && F.cat !== k && !CATS[k].own) continue;
    h += `<button class="item${F.cat === k ? ' on' : ''}" data-cat="${k}"${CATS[k].own ? ` data-owncat="${k}"` : ''} style="--h:${CATS[k].hue}"><i class="dot"></i><span class="t">${CATS[k].label}</span><span class="n">${cc[k] || 0}</span></button>`;
  }

  // makers
  const mc = {};
  for (const f of S.fams) if (passes(f, 'maker')) mc[f.vendor] = (mc[f.vendor] || 0) + 1;
  let makers = Object.entries(mc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (S.makerQ) makers = makers.filter(([m]) => m.toLowerCase().includes(S.makerQ.toLowerCase()));
  const cut = S.makersAll || S.makerQ ? makers : makers.slice(0, 14);
  if (F.maker && !cut.some(([m]) => m === F.maker)) cut.unshift([F.maker, mc[F.maker] || 0]);
  h += `<h4>Makers <span class="n" style="font-weight:600">${makers.length}</span></h4><input class="mini-input" id="makerQ" placeholder="Filter makers" value="${esc(S.makerQ)}">`;
  h += cut.map(([m, n]) => `<button class="item${F.maker === m ? ' on' : ''}" data-maker="${esc(m)}"><span class="t">${esc(m)}</span><span class="n">${n}</span></button>`).join('');
  if (!S.makerQ && makers.length > 14) h += `<button class="link more" id="moreMakers">${S.makersAll ? 'Show fewer' : `Show all ${makers.length}`}</button>`;

  const side = $('#side');
  const scroll = side.scrollTop;
  const hadFocus = document.activeElement?.id === 'makerQ';
  side.innerHTML = h;
  side.scrollTop = scroll;
  if (hadFocus) { const m = $('#makerQ'); m.focus(); m.setSelectionRange(m.value.length, m.value.length); }
}

/* ---------- drawer: details / rack ---------- */
function renderDrawer() {
  const d = $('#drawer');
  if (!S.drawer) { d.hidden = true; return; }
  d.hidden = false;
  if (S.drawer.type === 'info') return renderInfo(d, S.famBy.get(S.drawer.key));
  if (S.drawer.type === 'rack') return renderRack(d, S.user.racks.find(r => r.id === S.drawer.id));
  if (S.drawer.type === 'urack' && typeof renderUserRackInfo === 'function') return renderUserRackInfo(d, S.drawer.id);
}

function archLabel(p) {
  if (!p.archs?.length) return '';
  if (p.archs.includes('arm64') && p.archs.includes('x86_64')) return '<span class="tag ok">Universal</span>';
  if (p.archs.includes('arm64')) return '<span class="tag ok">Apple Silicon</span>';
  return '<span class="tag warn">Intel only</span>';
}

/** Short description from plugin-info.js (what it does, what stands out, typical settings, known uses). */
function infoText(f) {
  const x = typeof pluginInfo === 'function' && (pluginInfo(f.name) || f.items.map(p => pluginInfo(p.name)).find(Boolean));
  const li = a => a?.length ? `<ul>${a.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const o = famOriginal(f);
  if (!x && !o) return `<div class="pinfo none">No description for this plugin yet.</div>`;
  const own = x ? `<p>${esc(x.what)}</p>
    ${x.special?.length ? `<h5>What stands out</h5>${li(x.special)}` : ''}
    ${x.settings?.length ? `<h5>Typical settings</h5>${li(x.settings)}` : ''}
    ${x.tips?.length ? `<h5>Tips from tutorials</h5>${li(x.tips)}` : ''}` : '';
  let orig = '';
  if (o) {
    orig = `<div class="porig"><h5>The original: ${esc(o.title)}</h5><p>${esc(o.text)}</p>${li(o.facts)}
      ${o.uses?.length ? `<h5>Typical use of the original</h5>${li(o.uses)}` : ''}</div>`;
  }
  return `<div class="pinfo">${own}${orig}</div>`;
}

/** The classic hardware unit a plugin family emulates (originals.js), cached per family. */
function famOriginal(f) {
  if (typeof originalFor !== 'function') return null;
  if (f._orig === undefined) f._orig = originalFor(f.name) || f.items.map(p => originalFor(p.name)).find(Boolean) || null;
  return f._orig;
}

function renderInfo(d, f) {
  if (!f) { S.drawer = null; d.hidden = true; return; }
  const u = S.user, c = cat(f.category), fav = u.favs.includes(f.key);
  const rows = f.items.slice().sort((a, b) => fmtRank(a.format) - fmtRank(b.format) || a.name.localeCompare(b.name)).map(p => {
    const tags = [archLabel(p), p.status !== 'ok' ? `<span class="tag err">${esc(p.issue || 'broken')}</span>` : '', p.liveFailed ? '<span class="tag warn">Live: failed</span>' : '', p.inLive === false ? '<span class="tag warn">not in Live</span>' : ''].join('');
    const canLoad = usable(p);
    return `<div class="frow"><span class="fm">${FMT_LABEL[p.format]}</span>
      <div><div class="nm">${esc(p.name)}${tags}</div><div class="meta">${esc(p.version || '–')} · ${fmtBytes(p.bytes)}${p.shell ? ' · Shell' : ''}</div><div class="meta">${esc(p.path)}</div></div>
      <div class="btns" style="flex-direction:column">${canLoad ? `<button class="btn sm" data-load="${p.id}">Load</button>` : ''}<button class="btn sm" data-reveal="${esc(p.path)}">Finder</button></div></div>`;
  }).join('');
  const catOpts = Object.keys(CATS).map(k => `<option value="${k}"${k === f.category ? ' selected' : ''}>${CATS[k].label}</option>`).join('');
  const kindOpts = Object.entries(KIND_NAME).map(([k, l]) => `<option value="${k}"${k === f.kind ? ' selected' : ''}>${l}</option>`).join('');
  d.innerHTML = `<div class="dhead"><h3>${esc(f.name)}</h3><button class="x" data-close>×</button></div>
  <div class="dbody">
    ${cardHTML(f, -2)}
    <div class="btns"><button class="btn pri" data-loadfam ${f.loadable ? '' : 'disabled'}>${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Load in Live</button>
      <button class="btn" data-favfam>${fav ? '★ Favourite' : '☆ Favourite'}</button>
      <button class="btn" data-hidefam>${u.hidden.includes(f.key) ? 'Show' : 'Hide'}</button></div>
    <dl class="kv">
      <dt>Maker</dt><dd>${esc(f.vendor)}</dd>
      <dt>Category</dt><dd><details class="catpick"><summary>${esc(cat(f.category).label)}${f.also?.length ? ` <small>+${f.also.length}</small>` : ''}</summary>
        <div class="catlist">${Object.keys(CATS).map(k => `<label class="check"><input type="checkbox" data-catbox="${k}" ${k === f.category || f.also?.includes(k) ? 'checked' : ''}>${esc(CATS[k].label)}${k === f.category ? ' <small>main</small>' : ''}</label>`).join('')}</div></details></dd>
      ${f.also?.length ? `<dt>Also in</dt><dd>${f.also.map(x => esc(cat(x).label)).join(', ')}</dd>` : ''}
      <dt>Type</dt><dd><select data-setkind>${kindOpts}</select></dd>
      <dt>Size</dt><dd>${fmtBytes(f.bytes)}</dd>
      <dt>Installed</dt><dd>${fmtDate(f.mtime)}</dd>
      <dt>Loaded</dt><dd>${u.usage[f.key] ? `${u.usage[f.key]}× · last ${ago(u.lastUsed[f.key])}` : 'never'}</dd>
      <dt>Picture</dt><dd>${S.pics.thumbs[f.key] ? 'yes' : S.pics.failed[f.key] ? `failed – ${esc(S.pics.failed[f.key])}` : 'none yet'}
        ${hostable(f) ? `<button class="btn sm" data-capfam style="margin-left:6px">${S.pics.thumbs[f.key] ? 'Retake' : 'Take'}</button>` : ''}</dd>
    </dl>
    <div class="sect"><h5>About</h5>${infoText(f)}</div>
    <div class="sect"><h5>Note <small class="saved">saved automatically</small></h5><textarea data-note placeholder="e.g. “great on vocals, preset Air”">${esc(u.notes[f.key] || '')}</textarea></div>
    <div class="sect"><h5>Formats & files</h5>${rows}</div>
    <div class="sect"><h5>Collections</h5><div class="checks">${u.collections.map(col => `<label class="check"><input type="checkbox" data-incoll="${col.id}" ${col.items.includes(f.key) ? 'checked' : ''}> ${esc(col.name)}</label>`).join('') || '<span class="hint" style="padding:0">No collections yet.</span>'}</div></div>
  </div>`;
}

function renderRack(d, r) {
  if (!r) { S.drawer = null; d.hidden = true; return; }
  const slots = r.items.map((it, i) => {
    const f = S.famBy.get(it.family);
    if (!f) return `<div class="slot" data-slot="${i}"><span class="num">${i + 1}</span><div class="t"><b>No longer installed</b><small>${esc(it.family)}</small></div><button class="x" data-unslot="${i}">×</button></div>`;
    const fmts = f.formats.filter(x => x !== 'AAX');
    return `<div class="slot" data-slot="${i}" draggable="true" style="--h:${cat(f.category).hue}">
      <span class="grip" title="Drag to reorder">⋮⋮</span><span class="num">${i + 1}</span><i class="sw"></i>
      <div class="t"><b>${esc(f.name)}</b><small>${esc(f.vendor)}</small></div>
      <select data-slotfmt="${i}" title="Format"><option value="">Auto</option>${fmts.map(x => `<option value="${x}"${it.format === x ? ' selected' : ''}>${FMT_LABEL[x]}</option>`).join('')}</select>
      <button class="x" data-unslot="${i}" title="Remove">×</button></div>`;
  }).join('');
  d.innerHTML = `<div class="dhead"><h3>Rack</h3><button class="x" data-close>×</button></div>
  <div class="dbody">
    <input class="field" data-rackname value="${esc(r.name)}" placeholder="Rack name">
    <div class="btns"><button class="btn pri" data-loadrack ${r.items.length ? '' : 'disabled'}>${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Load rack in Live</button><button class="btn danger" data-delrack>Delete</button></div>
    <div class="slots" id="slots">${slots || ''}</div>
    <div class="dropzone" id="rackDrop">Drag plugins here from the library<br>or right-click → “Add to rack”</div>
    <p class="hint" style="padding:0">The plugins go onto the selected track in Live in this order, after the selected device.</p>
  </div>`;
}

/* ---------- health ---------- */
function healthData() {
  const plugins = S.lib?.plugins || [];
  const byPath = new Map();
  for (const p of plugins) if (!byPath.has(p.path)) byPath.set(p.path, p);
  const files = [...byPath.values()];
  const total = files.reduce((s, p) => s + p.bytes, 0);
  const famFormats = new Map();
  for (const p of plugins) { if (!famFormats.has(p.family)) famFormats.set(p.family, new Set()); famFormats.get(p.family).add(p.format); }
  const fname = p => S.famBy.get(p.family)?.name || p.display;

  const dup = files.filter(p => p.format === 'VST' && famFormats.get(p.family)?.has('VST3') && p.status === 'ok')
    .map(p => ({ p, why: 'VST2 copy – the VST3 is installed too' }));
  const auAll = plugins.filter(p => p.format === 'AU');
  const auRedundant = files.filter(p => p.format === 'AU' && auAll.filter(q => q.path === p.path).every(q => famFormats.get(q.family)?.has('VST3')))
    .map(p => ({ p, why: 'AU copy – the VST3 is installed too' }));
  const aax = S.lib?.proTools ? [] : files.filter(p => p.format === 'AAX').map(p => ({ p, why: 'Pro Tools only' }));
  const intel = S.lib?.machine === 'arm64' ? files.filter(p => p.archs?.length && !p.archs.includes('arm64') && p.format !== 'AAX').map(p => ({ p, why: 'Intel only – does not run natively on Apple Silicon' })) : [];
  const broken = files.filter(p => p.status !== 'ok' && p.format !== 'AAX').map(p => ({ p, why: p.issue }));
  const brokenAax = files.filter(p => p.status !== 'ok' && p.format === 'AAX');
  const liveFail = files.filter(p => p.liveFailed).map(p => ({ p, why: 'Live scanned the file but found no plugin in it' }));
  const notInLive = S.lib?.liveDB ? files.filter(p => (p.format === 'VST3' || p.format === 'VST') && p.inLive === false).map(p => ({ p, why: 'Live has not scanned this file yet' })) : [];
  const biggest = files.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 20).map(p => ({ p, why: '' }));
  const byName = (a, b) => fname(a.p).localeCompare(fname(b.p));
  const vst2 = files.filter(p => p.format === 'VST').map(p => ({ p, why: '' })).sort((a, b) => fname(a.p).localeCompare(fname(b.p)));
  const vst3 = files.filter(p => p.format === 'VST3').map(p => ({ p, why: '' })).sort(byName);
  const vst2only = files.filter(p => p.format === 'VST' && !famFormats.get(p.family)?.has('VST3')).map(p => ({ p, why: 'No VST3 version installed' })).sort(byName);
  const au = files.filter(p => p.format === 'AU').map(p => ({ p, why: '' })).sort(byName);
  const allAax = files.filter(p => p.format === 'AAX').map(p => ({ p, why: '' })).sort(byName);
  const sum = a => a.reduce((s, x) => s + x.p.bytes, 0);
  const reclaim = new Map();
  for (const x of [...dup, ...aax, ...broken]) reclaim.set(x.p.path, x.p.bytes);
  return { files, total, vst3, vst2, vst2only, au, auRedundant, allAax, dup, aax, intel, broken, brokenAax, liveFail, notInLive, biggest, sum, fname, reclaim: [...reclaim.values()].reduce((s, b) => s + b, 0) };
}

function renderHealth() {
  const el = $('#health');
  if (!S.lib) { el.innerHTML = '<div class="empty"><h3>No scan yet</h3></div>'; return; }
  const H = healthData();
  const issues = H.intel.length + H.broken.length;
  $('#tHealth').textContent = issues || '';
  const tile = (id, label, val, sub, cls = '') => `<button class="tile ${cls}" data-jump="${id}" title="${label}"><small>${label}</small><b>${val}</b><span>${sub}</span></button>`;
  const vstNotInLive = H.notInLive.filter(x => x.p.format === 'VST').length;
  const vstTotal = H.files.filter(p => p.format === 'VST').length;
  const sec = (id, title, items, why, open = false, showWhy = false, always = false) => {
    if (!items.length && always) return `<section class="hsec" id="h-${id}"><header data-toggle>${svg('<path d="m9 6 6 6-6 6"/>')}<h2>${title}</h2><span class="count">0</span></header><p class="why">${why} <b>None on this Mac.</b></p></section>`;
    if (!items.length) return '';
    return `<section class="hsec${open ? ' open' : ''}" id="h-${id}"><header data-toggle>${svg('<path d="m9 6 6 6-6 6"/>')}<h2>${title}</h2><span class="count">${items.length} · ${fmtBytes(H.sum(items))}</span></header>
      <p class="why">${why}</p>
      <table><thead><tr><th>Plugin</th><th>Format</th><th>Maker</th>${showWhy ? '<th>Reason</th>' : ''}<th style="text-align:right">Size</th><th>Path</th><th></th></tr></thead><tbody>
      ${items.map(({ p, why: w }) => `<tr><td>${esc(H.fname(p))}</td><td><span class="fm">${FMT_LABEL[p.format]}</span></td><td>${esc(p.vendor)}</td>${showWhy ? `<td>${esc(w)}</td>` : ''}<td class="num">${fmtBytes(p.bytes)}</td><td class="p" title="${esc(p.path)}">${esc(p.path)}</td><td><button class="btn sm" data-reveal="${esc(p.path)}">Finder</button></td></tr>`).join('')}
      </tbody></table></section>`;
  };
  el.innerHTML = `<div class="hhead"><div class="hrow"><h1>Health</h1>
    <span class="hgap"></span>
    <button class="btn sm danger" id="trashFailed" ${H.liveFail.length + H.broken.length ? '' : 'disabled'} title="Plugins Live could not use and broken bundles">Delete ${H.liveFail.length + H.broken.length} unusable</button>
    <button class="btn sm danger" id="trashIntel" ${H.intel.length ? '' : 'disabled'} title="Plugins without Apple Silicon code">Delete ${H.intel.length} Intel-only</button>
    <button class="btn sm danger" id="trashAax" ${H.aax.length ? '' : 'disabled'} title="AAX plugins only run in Pro Tools">Delete ${H.aax.length} AAX (Pro Tools only)</button>
    <button class="btn sm danger" id="trashVst2" ${H.dup.length ? '' : 'disabled'} title="Moves the VST2 copies of plugins that are installed as VST3 too to the Trash">Delete ${H.dup.length} VST2 (VST3 exists already)</button>
    <button class="btn sm danger" id="trashAu" ${H.auRedundant.length ? '' : 'disabled'} title="Moves the AU copies of plugins that are installed as VST3 too to the Trash">Delete ${H.auRedundant.length} AUs (VST3 exists already)</button></div>
  <div class="tiles">
    ${tile('biggest', 'All plugins', fmtBytes(H.total), `${H.files.length} files`)}
    ${tile('vst3', 'VST3', H.vst3.length, fmtBytes(H.sum(H.vst3)))}
    ${tile('vst2', 'VST2', H.vst2.length, fmtBytes(H.sum(H.vst2)))}
    ${tile('au', 'AU', H.au.length, fmtBytes(H.sum(H.au)))}
    ${tile('aax', 'AAX', H.allAax.length, fmtBytes(H.sum(H.allAax)), H.aax.length ? 'warn' : '')}
    ${tile('intel', 'Intel only', H.intel.length, fmtBytes(H.sum(H.intel)), H.intel.length ? 'err' : 'good')}
    ${tile('dup', 'VST2 that exists as VST3', H.dup.length, fmtBytes(H.sum(H.dup)), H.dup.length ? 'warn' : 'good')}
    ${tile('livefail', 'Live failed', H.liveFail.length, `${fmtBytes(H.sum(H.liveFail))} (when Live scanned it)`, H.liveFail.length ? 'err' : 'good')}
    ${tile('livefail', 'Not in Live', H.notInLive.length, `${fmtBytes(H.sum(H.notInLive))} (not scanned yet)`, H.notInLive.length ? 'warn' : 'good')}
  </div></div>
  ${sec('vst3', 'VST3 (all)', H.vst3, 'Every VST3 plugin on this Mac – the format Live prefers.', false, false, true)}
  ${sec('vst2', 'VST2 (all)', H.vst2, 'Every VST2 plugin on this Mac.', false, false, true)}
  ${sec('au', 'AU (all)', H.au, 'Every Audio Unit plugin on this Mac.', false, false, true)}
  ${sec('dup', 'VST2 that exists as VST3', H.dup, 'The VST3 version of these plugins is installed too. Live usually takes the VST3; you only need the VST2 file for old projects that use it.', true, false, true)}
  ${sec('aax', 'AAX (all)', H.allAax, (S.lib?.proTools ? 'AAX plugins run in Pro Tools.' : 'AAX plugins only run in Pro Tools – and Pro Tools is not installed on this Mac.') + ' They live in /Library/Application Support/Avid/Audio/Plug-Ins.', false, false, true)}
  ${sec('intel', 'Intel only (all)', H.intel, 'These plugins contain no Apple Silicon code and need Rosetta. An update from the maker usually fixes this.', false, false, true)}
  ${sec('livefail', 'Couldn’t use', H.liveFail, 'The plugin scan found no usable plugin in these files – e.g. an expired licence, missing authorisation or Intel only.', false, false, true)}
  ${sec('broken', 'Broken bundles', H.broken, 'The binary or the Info.plist is missing – often left over from an uninstall or an interrupted update.', true, true)}
  ${sec('biggest', 'Biggest plugins', H.biggest, 'Much of the space is often in instruments with built-in samples.')}`;
}

/** Moves plugins Live could not use (and broken bundles) to the Trash – after a warning that lists them. */
async function trashFailed() {
  const H = healthData();
  const seen = new Set(), items = [];
  for (const x of [...H.liveFail, ...H.broken]) if (!seen.has(x.p.path)) { seen.add(x.p.path); items.push(x.p); }
  if (!items.length) return toast('Nothing unusable found.', 'ok');
  const size = fmtBytes(items.reduce((a, p) => a + p.bytes, 0));
  const names = [...new Set(items.map(p => H.fname(p)))];
  const ok = await confirmDlg(`Move ${items.length} unusable plugins to the Trash?`,
    `Live scanned these files and could not use them (e.g. expired licence, missing authorisation, outdated or broken). ${items.length} files (${size}): ${names.slice(0, 12).join(', ')}${names.length > 12 ? ` and ${names.length - 12} more` : ''}. A plugin that only needs to be authorised again would be gone as well – check the list first. You can put them back from the Trash. macOS may ask for your admin password.`,
    `Move ${items.length} to Trash`);
  if (!ok) return;
  await runTrash(items, 'unusable plugins');
}

/** Moves Intel-only plugins (no Apple Silicon code) to the Trash – after a warning. */
async function trashIntel() {
  const H = healthData();
  const items = H.intel.map(x => x.p);
  if (!items.length) return toast('No Intel-only plugins.', 'ok');
  const names = [...new Set(items.map(p => H.fname(p)))];
  const ok = await confirmDlg(`Move ${items.length} Intel-only plugins to the Trash?`,
    `These plugins contain no Apple Silicon code and only run under Rosetta (${fmtBytes(H.sum(H.intel))}): ${names.slice(0, 12).join(', ')}${names.length > 12 ? ` and ${names.length - 12} more` : ''}. Often the maker has a newer version – check before deleting. You can put them back from the Trash. macOS may ask for your admin password.`,
    `Move ${items.length} to Trash`);
  if (!ok) return;
  await runTrash(items, 'Intel-only plugins');
}

/** Moves AAX plugins (Pro Tools only) to the Trash – after a warning. */
async function trashAax() {
  const H = healthData();
  const items = H.aax.map(x => x.p);
  if (!items.length) return toast('There are no AAX plugins to move.', 'ok');
  const ok = await confirmDlg('Move AAX plugins to the Trash?',
    `AAX plugins are only used by Pro Tools, and Pro Tools is not installed on this Mac. ${items.length} AAX plugins (${fmtBytes(H.sum(H.aax))}) will be moved to the Trash. Are you sure? You can put them back from the Trash. macOS may ask for your admin password.`,
    `Move ${items.length} to Trash`);
  if (!ok) return;
  await runTrash(items, 'AAX plugins');
}

/** Moves the VST2 copies of plugins that also exist as VST3 to the Trash – after a clear warning. */
async function trashVst2() {
  const H = healthData();
  const items = H.dup.map(x => x.p);
  if (!items.length) return;
  const ok = await confirmDlg('Trash the redundant VST2 versions?',
    `${items.length} plugins are installed both as VST3 and as VST2 with the same name. The ${items.length} VST2 copies (${fmtBytes(H.sum(H.dup))}) will be moved to the Trash; the VST3 versions stay. Old Live projects that use a VST2 version will not find it any more. You can put them back from the Trash. macOS may ask for your admin password.`,
    `Move ${items.length} to Trash`);
  if (!ok) return;
  const sure = await confirmDlg('Really move them to the Trash?',
    `Last check: ${items.length} VST2 plugin files will be moved to the Trash now. Only the VST2 copies go – the VST3 versions stay installed.`,
    `Yes, move ${items.length}`);
  if (!sure) return;
  await runTrash(items, 'VST2 copies');
}

/** Moves the AU copies of plugins that also exist as VST3 to the Trash – after a clear warning. */
async function trashAu() {
  const H = healthData();
  const items = H.auRedundant.map(x => x.p);
  if (!items.length) return toast('There are no AU copies to move.', 'ok');
  const ok = await confirmDlg('Trash the AU versions that exist as VST3?',
    `${items.length} Audio Units (${fmtBytes(H.sum(H.auRedundant))}) are installed as VST3 too. The AU copies will be moved to the Trash; the VST3 versions stay. Live does not need them, but Logic Pro, GarageBand and other AU-only apps will not find these plugins any more. You can put them back from the Trash. macOS may ask for your admin password.`,
    `Move ${items.length} to Trash`);
  if (!ok) return;
  const sure = await confirmDlg('Really move them to the Trash?',
    `Last check: ${items.length} AU plugin files will be moved to the Trash now. Only the AU copies go – the VST3 versions stay installed.`,
    `Yes, move ${items.length}`);
  if (!sure) return;
  await runTrash(items, 'AU copies');
}

async function runTrash(items, what) {
  let r;
  try { r = await api.post('/api/health/trash', { paths: items.map(p => p.path) }); } catch (e) { return toast('Could not start: ' + (e.message || e), 'err'); }
  toast(`Moving ${r.started} ${what} to the Trash – confirm in the Finder dialog if macOS asks.`, 'ok');
  for (;;) {
    await new Promise(res => setTimeout(res, 1000));
    const j = await api.get('/api/health/trash').catch(() => null);
    if (!j || j.running) continue;
    toast(j.moved ? `${j.moved} of ${j.total} ${what} are in the Trash. Rescanning…` : `Nothing was moved${j.error ? ': ' + j.error : ''}.`, j.moved ? 'ok' : 'err');
    break;
  }
}

/* ---------- updates from GitHub ---------- */
async function checkUpdate(force = false) {
  if (settings().updateCheck === false && !force) return;
  try { S.update = await api.get('/api/update' + (force ? '?force=1' : '')); } catch { return; }
  renderBanner();
  if (force) toast(S.update.available ? `PlugShelf ${S.update.latest} is available.` : S.update.error ? 'GitHub is not reachable right now.' : `PlugShelf ${S.update.current} is the newest version.`, S.update.error ? 'err' : 'ok');
}
async function installUpdate() {
  const ok = await confirmDlg(`Install PlugShelf ${S.update.latest}?`, `PlugShelf downloads the new version from GitHub, checks it, replaces this app and starts again. Your library, favourites, notes and pictures stay. macOS may ask once more for permissions (e.g. Screen Recording) after the update.`, 'Install & restart');
  if (!ok) return;
  await api.post('/api/update/install', {});
  for (;;) {
    await new Promise(r => setTimeout(r, 800));
    let st; try { st = await api.get('/api/update/state'); } catch { return; }   // the app is restarting
    if (st.phase === 'error') return toast(st.msg || 'The update failed', 'err');
    toast(st.msg, 'ok');
    if (st.phase === 'restarting') return;
  }
}

/* ---------- setup ---------- */
async function renderSetup() {
  const el = $('#setup');
  const st = S.script || {};
  const lib = S.lib;
  const order = prefer();
  el.innerHTML = `<h1>Setup</h1><p class="lead">Set up once, then a click puts any plugin on Live’s selected track.</p>
  <div class="setgrid">
    <div class="box">
      <h2>Ableton Live ${S.daw.ok ? '<span class="tag ok">connected</span>' : '<span class="tag">not connected</span>'}</h2>
      <p>A small Live script connects PlugShelf to Live.</p>
      <ol class="steps">
        <li>Install the script ${st.installed ? (st.current ? '<span class="tag ok">installed</span>' : '<span class="tag warn">outdated</span>') : '<span class="tag">missing</span>'}</li>
        <li><b>Restart Live</b> (first time only)</li>
        <li>In Live: <b>Settings → Link, Tempo & MIDI → Control Surface</b> → choose <b>PlugShelf</b> (input and output: None)</li>
        <li>Test the connection</li>
      </ol>
      <div class="btns"><button class="btn pri" id="install">${st.installed ? 'Update script' : 'Install script'}</button><button class="btn" id="testLive">Test connection</button></div>
      <p class="hint" style="padding:10px 0 0">${st.target ? `Target: <span class="code">${esc(st.target)}</span>` : 'No User Library found – is Ableton Live installed?'}</p>
      ${S.daw.msg ? `<p class="hint" style="padding:4px 0 0">Live says: ${esc(S.daw.msg)}</p>` : ''}
    </div>
    <div class="box">
      <h2>Format order</h2>
      <p>Which format loads first.</p>
      <div class="order">${order.map((x, i) => `<div class="o"><span class="num">${i + 1}</span><b>${FMT_LABEL[x]}</b><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-down="${i}" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('')}</div>
      <label class="check"><input type="checkbox" id="showAAX" ${settings().showAAX ? 'checked' : ''}> Show AAX plugins in the library (only Pro Tools loads them)</label>
    </div>
    ${picsBox()}
    ${updateBox()}
    ${versionsBox()}
    ${remoteBox()}
    ${builderBox()}
    <div class="box">
      <h2>Scan</h2>
      <p>${lib ? `Last scanned ${ago(lib.scannedAt)} – ${new Set(lib.plugins.map(p => p.path)).size} files.` : 'Not scanned yet.'}</p>
      <div class="btns"><button class="btn" id="scanNow">Rescan</button></div>
      <p class="hint" style="padding:10px 0 0">Folders scanned:</p>
      ${(lib?.roots || []).map(r => `<div class="hint" style="padding:1px 0"><span class="code">${esc(r)}</span></div>`).join('')}
    </div>
    <div class="box">
      <h2>Keyboard</h2>
      <div class="keys">
        <kbd>/</kbd><span>Search</span>
        <kbd>↑ ↓ ← →</kbd><span>Select a tile</span>
        <kbd>Enter</kbd><span>Load the selected tile in Live</span>
        <kbd>Esc</kbd><span>Clear search / close the side panel</span>
        <kbd>F5</kbd><span>Rescan</span>
        <kbd>Ctrl + mouse wheel</kbd><span>Tile size</span>
        <kbd>Right-click</kbd><span>Formats, collections, racks, Finder</span>
      </div>
      <p class="hint" style="padding:12px 0 0">Your data: <span class="code">${esc(S.info?.data || '')}</span></p>
    </div>
  </div>`;
}

/* ---------- Kontakt preset builder ---------- */
function builderBox() {
  const b = S.builder;
  if (!b) return '';
  const rows = (b.next || []).map((x, i) => `<li><b>${esc(x.library)}</b> – ${esc(x.instrument)}<br><span class="code" style="font-size:11px">${esc(x.path)}</span></li>`).join('');
  return `<div class="box wide">
    <h2>Kontakt preset builder <span class="tag">${b.remaining} libraries without a preset</span></h2>
    <p>Makes Kontakt presets in blocks of 15 tracks.</p>
    <ol class="steps">
      <li><button class="btn sm pri" id="kbBlock" ${b.remaining ? '' : 'disabled'}>Put the next ${Math.min(15, b.remaining)} on tracks</button> – in an empty Live set</li>
      <li>In each “KP · …” track’s Kontakt load the instrument below, then save the set as <span class="code">${esc(b.setFile)}</span> (first time Cmd+Shift+S, then Cmd+S)</li>
      <li><button class="btn sm" id="kbHarvest">Make presets from the saved set</button></li>
      <li><button class="btn sm" id="kbClear">Remove the KP tracks</button> – then start again at 1</li>
    </ol>
    ${S.builderMsg ? `<p class="hint" style="padding:6px 0">${esc(S.builderMsg)}</p>` : ''}
    ${rows ? `<details open><summary>Next block (${(b.next || []).length})</summary><ol class="kblist">${rows}</ol></details>` : '<p class="hint">Every connected library has a preset.</p>'}
  </div>`;
}
async function refreshBuilder() { try { S.builder = await api.get('/api/kontakt/plan'); } catch { S.builder = null; } }

/* ---------- iPad remote ---------- */
/** Makers with the number of out-of-date plugins; opened, only those plugins: Plugin | Installed | Latest | Update. */
function versionsList() {
  const V = S.versions || {}, R = V.results || {}, covered = new Set(V.covered || []);
  const q = (S.verQ || '').toLowerCase().trim();
  const by = new Map();
  for (const f of S.fams) {
    if (f.stock || !f.items.length) continue;
    if (q && !(f.name + ' ' + f.vendor).toLowerCase().includes(q)) continue;
    if (!by.has(f.vendor)) by.set(f.vendor, []);
    by.get(f.vendor).push(f);
  }
  const old = v => by.get(v).filter(f => R[f.key]?.newer);
  const vendors = [...by.keys()].sort((a, b) => old(b).length - old(a).length || by.get(b).length - by.get(a).length || a.localeCompare(b));
  if (!vendors.length) return '<p class="hint" style="padding:12px">No plugins match.</p>';
  const links = v => {
    const m = S.makers?.[v] || {};
    return (m.app ? `<button class="btn sm" data-maker-open="${esc(v)}" data-how="app" title="Opens ${esc(m.app)} on this Mac">${esc(m.app)}</button>` : '')
      + `<button class="btn sm" data-maker-open="${esc(v)}" data-how="web" title="${m.url ? 'Opens the maker’s download page' : 'Searches the web for the maker’s downloads'}">Website</button>`;
  };
  const head = '<div class="vrow vhead"><span class="vn">Plugin</span><span class="vv">Installed</span><span class="vl">Latest</span><span class="vk">Update</span></div>';
  return head + vendors.map(v => {
    const list = old(v).sort((a, b) => a.name.localeCompare(b.name));
    const badge = list.length ? `<span class="vbadge" title="${list.length} plugin${list.length === 1 ? '' : 's'} not up to date">${list.length}</span>` : '';
    let body;
    if (list.length) {
      body = list.map(f => {
        const best = f.items.filter(p => p.format !== 'AAX').sort((a, b) => fmtRank(a.format) - fmtRank(b.format))[0] || f.items[0];
        const r = R[f.key];
        return `<div class="vrow newer"><span class="vn">${esc(f.name)}${r.note ? `<small>${esc(r.note)}</small>` : ''}</span><span class="vv">${esc(best.version || '–')}</span><span class="vl">${esc(r.latest)}</span><span class="vk">${links(v)}</span></div>`;
      }).join('');
    } else if (covered.has(v)) {
      body = `<div class="vnote">${V.checkedAt ? `All ${by.get(v).length} plugins are up to date (checked ${ago(V.checkedAt)}).` : 'Not checked yet – press Scan.'}</div>`;
    } else {
      body = `<div class="vnote">${esc(v)} publishes no versions PlugShelf can check – the button opens where its updates are.</div>`;
    }
    return `<details class="vgrp"${q || list.length ? ' open' : ''}><summary><b>${esc(v)}</b>${badge}<span class="n">${by.get(v).length}</span><span class="vk">${links(v)}</span></summary>${body}</details>`;
  }).join('');
}

function versionsBox() {
  const V = S.versions || {};
  const outdated = Object.values(V.results || {}).filter(r => r.newer).length;
  return `<div class="box wide">
    <h2>Plugin versions ${V.checkedAt ? (outdated ? `<span class="tag warn">${outdated} to update</span>` : '<span class="tag ok">up to date</span>') : ''}</h2>
    <p>Scan checks for newer versions where makers publish them (${esc((V.covered || []).join(', '))}); every maker links to its updater app or website.</p>
    <div class="vbar"><button class="btn sm pri" id="verScan" ${V.running ? 'disabled' : ''} title="Check the makers’ websites for newer versions">${svg('<path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3"/><path d="M7 12h10"/>')}${V.running ? 'Scanning…' : 'Scan'}</button>
      <input class="field" id="verQ" placeholder="Filter by plugin or maker" value="${esc(S.verQ || '')}" autocomplete="off" spellcheck="false">
      ${V.checkedAt ? `<span class="hint" style="padding:0;white-space:nowrap">Last scan ${ago(V.checkedAt)}</span>` : ''}</div>
    <div class="vlist" id="verList">${versionsList()}</div>
  </div>`;
}

async function versionScan() {
  try { await api.post('/api/versions/scan', {}); } catch { return toast('PlugShelf is not responding', 'err'); }
  S.versions = { ...(S.versions || {}), running: true }; renderSetup();
  for (;;) {
    await new Promise(r => setTimeout(r, 1000));
    let v; try { v = await api.get('/api/versions'); } catch { continue; }
    if (v.running) continue;
    S.versions = v;
    if (S.view === 'setup') renderSetup();
    const n = Object.values(v.results || {}).filter(r => r.newer).length;
    return toast(n ? `${n} plugin${n === 1 ? '' : 's'} can be updated.` : 'All checked plugins are up to date.', 'ok');
  }
}

function updateBox() {
  const u = S.update || {};
  return `<div class="box">
    <h2>Updates ${u.available ? `<span class="tag warn">${esc(u.latest)} available</span>` : u.current ? '<span class="tag ok">up to date</span>' : ''}</h2>
    <p>PlugShelf ${esc(u.current || '')} – checks GitHub for new versions at start.</p>
    <label class="check"><input type="checkbox" id="updateCheck" ${settings().updateCheck === false ? '' : 'checked'}> Check for updates when PlugShelf starts</label>
    <div class="btns" style="margin-top:10px"><button class="btn sm" id="updateNow">Check now</button>${u.available ? '<button class="btn sm pri" data-update-install>Install &amp; restart</button>' : ''}</div>
  </div>`;
}

function remoteBox() {
  const r = S.remote || {};
  return `<div class="box">
    <h2>iPad remote ${r.running ? '<span class="tag ok">on</span>' : '<span class="tag">off</span>'}</h2>
    <p>Browse and load plugins from an iPad or iPhone in the same Wi-Fi.</p>
    <label class="check"><input type="checkbox" id="remoteOn" ${r.enabled ? 'checked' : ''}> Allow the iPad remote on this network</label>
    ${r.enabled ? `
      ${r.running ? `<ol class="steps">
        <li>On the iPad, open Safari at ${(r.urls || []).map(u => `<span class="code">${esc(u)}</span>`).join(' or ') || '<i>(no network found)</i>'}</li>
        <li>Enter the code <b class="code" style="font-size:18px;letter-spacing:.2em">${esc(r.code)}</b></li>
        <li>Share → <b>Add to Home Screen</b> – it then opens like an app</li>
      </ol>` : '<p class="hint">The remote server could not start (port in use?).</p>'}
      <div class="btns"><button class="btn" id="remoteCode">New code</button>${r.devices ? `<button class="btn" id="remoteForget">Unpair ${r.devices} device${r.devices > 1 ? 's' : ''}</button>` : ''}</div>
      <p class="hint" style="padding:8px 0 0">Allow incoming connections if macOS asks.</p>` : ''}
  </div>`;
}
async function refreshRemote() { try { S.remote = await api.get('/api/remote'); } catch { S.remote = null; } }

/* ---------- pictures ---------- */
function picCounts() {
  const fams = S.fams.filter(f => showable(f) && !S.user.hidden.includes(f.key));
  const have = fams.filter(f => S.pics.thumbs[f.key]);
  const failed = fams.filter(f => !S.pics.thumbs[f.key] && S.pics.failed[f.key]);
  const missing = fams.filter(f => !S.pics.thumbs[f.key] && !S.pics.failed[f.key] && hostable(f));
  const impossible = fams.filter(f => !S.pics.thumbs[f.key] && !hostable(f));
  return { fams, have, failed, missing, impossible };
}

function picsBox() {
  const c = picCounts();
  const running = S.capture?.running;
  return `<div class="box">
    <h2>Plugin pictures</h2>
    <p>Takes a picture (up to 1000 px) of each plugin.</p>
    <div class="picstats"><div><b>${c.have.length}</b><small>with picture</small></div><div><b>${c.missing.length}</b><small>missing</small></div><div><b>${c.failed.length}</b><small>failed</small></div>${c.impossible.length ? `<div><b>${c.impossible.length}</b><small>AAX/CLAP only</small></div>` : ''}</div>
    <div class="btns">
      <button class="btn pri" id="capMissing" ${c.missing.length && !running ? '' : 'disabled'}>Take missing (${c.missing.length})</button>
      ${c.failed.length ? `<button class="btn" id="capFailed" ${running ? 'disabled' : ''}>Try again (${c.failed.length})</button>` : ''}
      ${S.rone ? `<button class="btn" id="roneImport">Import ${S.rone} pictures from RONE VST MANAGER</button>` : ''}
    </div>
    ${S.rone ? '<p class="hint" style="padding:8px 0 0">RONE VST MANAGER pictures found – they can be imported.</p>' : ''}
    <label class="check" style="margin-top:12px"><input type="checkbox" id="picsOn" ${picsOn() ? 'checked' : ''}> Show pictures on the tiles</label>
    ${c.failed.length ? `<details class="fails"><summary>Failed (${c.failed.length})</summary><ul>${c.failed.map(f => `<li><b>${esc(f.name)}</b><span>${esc(S.pics.failed[f.key])}</span></li>`).join('')}</ul></details>` : ''}
    <p class="hint" style="padding:10px 0 0">Activation window instead of the plugin? Right-click the tile → Retake or Remove picture.</p>
  </div>`;
}

async function capture(keys) {
  if (!keys.length) return;
  let r;
  try { r = await api.post('/api/capture', { families: keys }); } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  if (!r.ok) return toast(r.msg || 'Cannot take the picture', 'err');
  if (!r.queued) return toast('This plugin cannot be opened (AAX or CLAP only).', 'err');
  if (keys.length > 1) toast(`Taking pictures of ${r.queued} plugins – their windows open briefly at the bottom right.`, 'ok');
  watchCapture();
}

async function deleteThumbs(keys) {
  await api.post('/api/thumbs/delete', { families: keys });
  for (const k of keys) { delete S.pics.thumbs[k]; delete S.pics.failed[k]; }
  refreshCards(keys);
  renderDrawer();
}

/** Re-draws only the cards of these families (keeps scroll position and hover). */
function refreshCards(keys) {
  for (const k of keys) {
    const f = S.famBy.get(k);
    if (!f) continue;
    for (const el of $$(`.card[data-k="${CSS.escape(k)}"]`)) {
      if (el.closest('.dbody')) continue;
      const tmp = document.createElement('div');
      tmp.innerHTML = cardHTML(f, +el.dataset.i);
      el.replaceWith(tmp.firstElementChild);
    }
  }
  if (S.drawer?.type === 'info' && keys.includes(S.drawer.key)) renderDrawer();
}

let capTimer;
async function watchCapture() {
  clearTimeout(capTimer);
  let r;
  try { r = await api.get('/api/thumbs'); } catch { return; }
  const before = S.pics.thumbs;
  S.pics = { thumbs: r.thumbs || {}, failed: r.failed || {} };
  const changed = Object.keys(S.pics.thumbs).filter(k => S.pics.thumbs[k] !== before[k]);
  const gone = Object.keys(before).filter(k => !S.pics.thumbs[k]);
  if (changed.length + gone.length) refreshCards([...changed, ...gone]);
  const c = r.capture || {};
  const wasRunning = S.capture?.running;
  S.capture = c;
  const bar = $('#capbar');
  if (c.running) {
    bar.hidden = false;
    $('#capFill').style.width = (c.total ? Math.round(c.done / c.total * 100) : 3) + '%';
    $('#capText').textContent = `Pictures: ${c.done} of ${c.total}${c.current ? ' – ' + c.current : ''}${c.failed ? ` · ${c.failed} failed` : ''}`;
    capTimer = setTimeout(watchCapture, 1200);
  } else {
    bar.hidden = true;
    if (wasRunning) {
      if (c.total === 1) toast(c.ok ? `Took a picture of ${c.current || S.famBy.get(changed[0])?.name || 'the plugin'}` : `No picture: ${Object.values(S.pics.failed).slice(-1)[0] || 'failed'}`, c.ok ? 'ok' : 'err');
      else toast(`Took ${c.ok} pictures${c.failed ? `, ${c.failed} failed` : ''}.`, 'ok');
    }
  }
  if (S.view === 'setup' && wasRunning !== c.running) renderSetup();
}

/* ---------- actions ---------- */
let saveT, userDirty = false;
function saveUser() {
  clearTimeout(saveT);
  userDirty = true;
  saveT = setTimeout(() => api.post('/api/user', S.user).finally(() => { userDirty = false; }), 250);
}

// Favourites set on the iPad remote: pick them up while nothing of our own is waiting to be saved.
setInterval(async () => {
  if (userDirty || !S.user || document.hidden) return;
  try {
    const u = await api.get('/api/user');
    if (userDirty || JSON.stringify(u.favs) === JSON.stringify(S.user.favs)) return;
    S.user.favs = u.favs;
    if (S.view === 'lib') renderLib();
  } catch { /* app busy */ }
}, 4000);

function toast(msg, kind = '', action) {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.innerHTML = `<span>${esc(msg)}</span>`;
  if (action) {
    const b = document.createElement('button');
    b.className = 'link';
    b.textContent = action.label;
    b.onclick = () => { action.fn(); t.remove(); };
    t.appendChild(b);
  }
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), Math.max(kind === 'err' ? 6500 : 3200, String(msg).length * 55));
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}

function flash(key) {
  for (const el of $$(`.card[data-k="${CSS.escape(key)}"]`)) {
    el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
  }
}

function applyUsage(r) {
  if (r.usage) Object.assign(S.user.usage, r.usage);
  if (r.lastUsed) Object.assign(S.user.lastUsed, r.lastUsed);
}

async function loadFam(f, format, name) {
  if (f.stock) return loadStock(f);
  const p = pickItem(f, format, name);
  if (!p) return toast(`${f.name}: no version that runs on this Mac and loads in Live.`, 'err');
  flash(f.key);
  let r;
  try { r = await api.post('/api/load', { ids: [p.id] }); } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  if (r.ok) {
    applyUsage(r);
    toast(r.msg || `Loaded ${f.name}`, 'ok');
    if (S.f.sort === 'used' || S.f.sort === 'recent' || S.f.coll === 'recent') renderLib();
  } else {
    toast(r.msg || 'Loading failed', 'err', r.offline ? { label: 'Open Setup', fn: () => show('setup') } : null);
  }
}

async function loadRack(r) {
  const ids = [];
  const missing = [];
  for (const it of r.items) {
    const f = S.famBy.get(it.family);
    const p = f && pickItem(f, it.format || null);
    if (p) ids.push(p.id); else missing.push(f?.name || it.family);
  }
  if (!ids.length) return toast('Nothing in this rack can be loaded.', 'err');
  let res;
  try { res = await api.post('/api/load', { ids }); } catch { res = { ok: false, msg: 'PlugShelf is not responding' }; }
  if (res.ok) {
    applyUsage(res);
    toast((res.msg || `Loaded ${r.name}`) + (missing.length ? ` – skipped: ${missing.join(', ')}` : ''), 'ok');
  } else toast(res.msg || 'Loading failed', 'err', res.offline ? { label: 'Open Setup', fn: () => show('setup') } : null);
}

function toggleFav(key) {
  const a = S.user.favs, i = a.indexOf(key);
  if (i >= 0) a.splice(i, 1); else a.push(key);
  saveUser(); renderLib(); renderDrawer();
}

function toggleHidden(key) {
  const a = S.user.hidden, i = a.indexOf(key);
  if (i >= 0) a.splice(i, 1); else a.push(key);
  const f = S.famBy.get(key);
  saveUser(); renderLib(); renderDrawer();
  if (i < 0) toast(`${f?.name} hidden`, '', { label: 'Undo', fn: () => toggleHidden(key) });
}

function addToColl(id, key) {
  const c = S.user.collections.find(x => x.id === id);
  if (!c) return;
  if (!c.items.includes(key)) { c.items.push(key); toast(`${S.famBy.get(key)?.name} → ${c.name}`, 'ok'); }
  saveUser(); renderLib(); renderDrawer();
}

function addToRack(id, key, at) {
  const r = S.user.racks.find(x => x.id === id);
  if (!r) return;
  const item = { family: key, format: null };
  if (at == null || at < 0 || at > r.items.length) r.items.push(item); else r.items.splice(at, 0, item);
  saveUser();
  if (!(S.drawer?.type === 'rack' && S.drawer.id === id)) toast(`${S.famBy.get(key)?.name} → Rack ${r.name}`, 'ok');
  renderSide(); renderDrawer();
}

async function newColl(addKey) {
  const name = await ask('New collection', 'e.g. Vocal chain, Mix bus, Favourite synths');
  if (!name) return;
  const c = { id: uid(), name, items: addKey ? [addKey] : [] };
  S.user.collections.push(c);
  saveUser(); renderLib();
}

async function newRack(addKey) {
  const name = await ask('New rack', 'Plugins that go onto a track together, e.g. “Vocal chain”');
  if (!name) return;
  const r = { id: uid(), name, items: addKey ? [{ family: addKey, format: null }] : [] };
  S.user.racks.push(r);
  S.drawer = { type: 'rack', id: r.id };
  saveUser(); renderLib(); renderDrawer();
}

/** Grid columns right now. */
const gridCols = () => getComputedStyle($('#grid')).gridTemplateColumns.split(' ').length;

/** Where the enlarged tile goes: its own column and row, moved left only as far as it must to fit. */
function bigPlace(card) {
  const cols = gridCols(), span = cols >= 4 ? 3 : Math.min(2, cols);
  const kids = [...$('#grid').children];
  const tops = [...new Set(kids.map(k => k.offsetTop))].sort((a, b) => a - b);
  const row = tops.indexOf(card.offsetTop) + 1;
  const g = $('#grid').getBoundingClientRect(), w = (g.width + 14) / cols;
  const col = Math.round((card.getBoundingClientRect().left - g.left) / w) + 1;
  return { col: Math.max(1, Math.min(col, cols - span + 1)), row: Math.max(1, row), span };
}
function bigStyle() {
  const b = S.bigPos; if (!b) return '';
  const cols = gridCols(), span = Math.min(b.span, cols), col = Math.max(1, Math.min(b.col, cols - span + 1));
  return `grid-column:${col} / span ${span};grid-row:${b.row} / span ${span};`;
}

/** Double-click mode: a click enlarges the tile in place (a second click makes it small again); details open on the right. */
function focusCard(card, f) {
  if (S.bigKey === f.key) {                       // second click: back to normal size
    S.bigKey = null; S.bigPos = null;
    card.classList.remove('big'); card.style.gridColumn = card.style.gridRow = '';
    return;
  }
  for (const c of $$('#grid .card.big')) { c.classList.toggle('big', false); c.style.gridColumn = c.style.gridRow = ''; }
  // the details panel narrows the grid first; measure the tile's place after that
  openInfo(f.key);   // measuring below forces the new layout at once
  {
    S.bigPos = bigPlace(card);
    S.bigKey = f.key;
    card.classList.add('big');
    card.style.gridColumn = `${S.bigPos.col} / span ${S.bigPos.span}`;
    card.style.gridRow = `${S.bigPos.row} / span ${S.bigPos.span}`;
    card.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}
function openInfo(key) { S.drawer = { type: 'info', key }; renderDrawer(); }

function reveal(path) { api.post('/api/reveal', { path }); }

/* ---------- menu & dialog ---------- */
function closeMenu() { $('#menu').hidden = true; $('#menu').innerHTML = ''; }

function menu(x, y, items) {
  const m = $('#menu');
  m.innerHTML = '';
  const build = (host, list) => {
    for (const it of list) {
      if (it === '-') { host.appendChild(document.createElement('hr')); continue; }
      const b = document.createElement('button');
      b.innerHTML = `<span>${esc(it.label)}</span>${it.sub ? '<span class="sub">›</span>' : it.hint ? `<small>${esc(it.hint)}</small>` : ''}`;
      if (it.bold) b.classList.add('b');
      if (it.disabled) b.disabled = true;
      if (it.sub) {
        const sm = document.createElement('div');
        sm.className = 'menu';
        sm.hidden = true;
        build(sm, it.sub);
        document.body.appendChild(sm);
        sm.dataset.child = '1';
        const open = () => {
          $$('.menu[data-child]').forEach(o => { if (o !== sm && !o.contains(b)) o.hidden = true; });
          $$('button.open', host).forEach(o => o.classList.remove('open'));
          b.classList.add('open');
          sm.hidden = false;
          const r = b.getBoundingClientRect();
          const w = sm.offsetWidth, h = sm.offsetHeight;
          sm.style.left = (r.right + w + 4 > innerWidth ? r.left - w - 2 : r.right + 2) + 'px';
          sm.style.top = Math.max(8, Math.min(r.top - 5, innerHeight - h - 8)) + 'px';
        };
        b.addEventListener('mouseenter', open);
        b.addEventListener('click', e => { e.stopPropagation(); open(); });
      } else {
        b.addEventListener('mouseenter', () => {
          $$('.menu[data-child]').forEach(o => { if (!o.contains(b)) o.hidden = true; });
          $$('button.open', host).forEach(o => o.classList.remove('open'));
        });
        b.addEventListener('click', e => { e.stopPropagation(); closeAll(); it.fn?.(); });
      }
      host.appendChild(b);
    }
  };
  build(m, items);
  m.hidden = false;
  const w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.min(x, innerWidth - w - 8) + 'px';
  m.style.top = Math.min(y, innerHeight - h - 8) + 'px';
}

function closeAll() {
  closeMenu();
  $$('.menu[data-child]').forEach(o => o.remove());
}

function cardMenu(f, x, y) {
  const u = S.user;
  const loadables = f.items.filter(usable).sort((a, b) => fmtRank(a.format) - fmtRank(b.format) || a.name.localeCompare(b.name));
  const inColl = S.f.coll?.startsWith('c:') ? u.collections.find(c => c.id === S.f.coll.slice(2)) : null;
  menu(x, y, [
    { label: 'Load in Live', bold: true, disabled: !f.loadable, fn: () => loadFam(f) },
    ...(loadables.length > 1 ? [{ label: 'Load as', sub: loadables.map(p => ({ label: p.name === f.name ? FMT_LABEL[p.format] : `${FMT_LABEL[p.format]} · ${p.name}`, hint: native(p) ? '' : 'Intel', fn: () => loadFam(f, p.format, p.name) })) }] : []),
    '-',
    { label: u.favs.includes(f.key) ? 'Remove from favourites' : 'Add to favourites', fn: () => toggleFav(f.key) },
    { label: 'Add to collection', sub: [...u.collections.map(c => ({ label: c.name, hint: c.items.includes(f.key) ? '✓' : '', fn: () => addToColl(c.id, f.key) })), ...(u.collections.length ? ['-'] : []), { label: 'New collection…', fn: () => newColl(f.key) }] },
    ...(inColl ? [{ label: `Remove from “${inColl.name}”`, fn: () => { inColl.items = inColl.items.filter(k => k !== f.key); saveUser(); renderLib(); } }] : []),
    { label: 'Add to rack', sub: [...u.racks.map(r => ({ label: r.name, hint: `${r.items.length}`, fn: () => addToRack(r.id, f.key) })), ...(u.racks.length ? ['-'] : []), { label: 'New rack…', fn: () => newRack(f.key) }] },
    '-',
    { label: 'Details', fn: () => openInfo(f.key) },
    { label: 'Show in Finder', fn: () => reveal((pickItem(f) || f.items[0]).path) },
    ...(hostable(f) ? [{ label: S.pics.thumbs[f.key] ? 'Retake picture' : 'Take picture', fn: () => capture([f.key]) }] : []),
    ...(S.pics.thumbs[f.key] ? [{ label: 'Remove picture', fn: () => deleteThumbs([f.key]) }] : []),
    { label: u.hidden.includes(f.key) ? 'Show again' : 'Hide', fn: () => toggleHidden(f.key) },
  ]);
}

function ask(title, hint, value = '') {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg"><h3>${esc(title)}</h3>${hint ? `<p>${esc(hint)}</p>` : ''}<input class="field" id="askIn" value="${esc(value)}"><div class="btns"><button class="btn" data-no>Cancel</button><button class="btn pri" data-yes>OK</button></div></div>`;
    m.hidden = false;
    const inp = $('#askIn');
    inp.focus(); inp.select();
    const done = v => { m.hidden = true; m.innerHTML = ''; res(v); };
    $('[data-yes]', m).onclick = () => done(inp.value.trim() || null);
    $('[data-no]', m).onclick = () => done(null);
    m.onclick = e => { if (e.target === m) done(null); };
    inp.onkeydown = e => { if (e.key === 'Enter') done(inp.value.trim() || null); if (e.key === 'Escape') done(null); e.stopPropagation(); };
  });
}

function confirmDlg(title, text, yes = 'Delete') {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="btns"><button class="btn" data-no>Cancel</button><button class="btn pri" data-yes>${esc(yes)}</button></div></div>`;
    m.hidden = false;
    const done = v => { m.hidden = true; m.innerHTML = ''; res(v); };
    $('[data-yes]', m).onclick = () => done(true);
    $('[data-no]', m).onclick = () => done(false);
    $('[data-yes]', m).focus();
  });
}

/* ---------- views ---------- */
function show(v) {
  S.view = v;
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  for (const id of ['lib', 'chains', 'health', 'setup']) $('#v-' + id).hidden = id !== v;
  if (v === 'lib') renderLib();
  if (v === 'chains') renderChains();
  if (v === 'health') renderHealth();
  if (v === 'setup') { renderSetup(); Promise.all([refreshScript(), refreshRone(), refreshRemote(), refreshBuilder(), api.get('/api/makers').then(m => { S.makers = m; }).catch(() => {}), api.get('/api/versions').then(v => { S.versions = v; }).catch(() => {})]).then(() => S.view === 'setup' && renderSetup()); }
}

async function refreshRone() {
  try { S.rone = (await api.get('/api/thumbs/rone')).available || 0; } catch { S.rone = 0; }
}

async function refreshScript() {
  try { S.script = await api.get('/api/ableton'); } catch { /* ignore */ }
}

async function pollDaw() {
  if (document.hidden) return;
  let r;
  try { r = await api.get('/api/daw'); } catch { r = { ok: false, msg: '' }; }
  const was = S.daw.ok;
  S.daw = r;
  const el = $('#daw');
  el.classList.toggle('on', !!r.ok);
  $('span', el).textContent = r.ok ? `${r.msg || 'Live'} · connected` : 'Live not connected';
  el.title = r.ok ? 'Plugins land on the selected track in Live' : (r.msg || '');
  if (was !== !!r.ok) { renderBanner(); if (S.view === 'setup') renderSetup(); }
}

async function startScan() {
  await api.post('/api/scan');
  watchScan();
}

let scanTimer;
async function watchScan() {
  clearTimeout(scanTimer);
  let s;
  try { s = await api.get('/api/scan'); } catch { return; }
  const bar = $('#scanbar');
  if (s.running) {
    S.scanning = true;
    bar.hidden = false;
    $('#rescan').classList.add('spin');
    $('#scanFill').style.width = (s.total ? Math.round(s.done / s.total * 100) : 5) + '%';
    $('#scanText').textContent = s.total ? `${s.phase} – ${s.done} of ${s.total}` : s.phase || 'Scanning…';
    scanTimer = setTimeout(watchScan, 400);
  } else {
    bar.hidden = true;
    $('#rescan').classList.remove('spin');
    if (S.scanning || (!S.lib && s.scannedAt)) {
      S.scanning = false;
      const before = S.lib ? new Set(S.lib.plugins.map(p => p.family)) : null;
      await loadState();
      if (before) {
        const added = S.fams.filter(f => !before.has(f.key)).length;
        if (S.view === 'setup') renderSetup();
        toast(added ? `Scan done – ${added} new plugins` : 'Scan done – nothing new', 'ok', added ? { label: 'Show', fn: () => { S.f = { ...S.f, coll: 'new', q: '', cat: null, maker: null }; $('#q').value = ''; show('lib'); } } : null);
      }
    } else if (!S.lib) scanTimer = setTimeout(watchScan, 800);
  }
}

async function loadState() {
  const st = await api.get('/api/state');
  S.lib = st.library;
  S.user = st.user;
  S.info = st.info;
  S.pics = { thumbs: st.pics?.thumbs || {}, failed: st.pics?.failed || {} };
  for (const k of ['favs', 'hidden', 'collections', 'racks']) if (!Array.isArray(S.user[k])) S.user[k] = [];
  for (const k of ['usage', 'lastUsed', 'notes', 'overrides', 'settings']) if (!S.user[k] || typeof S.user[k] !== 'object') S.user[k] = {};
  document.documentElement.style.setProperty('--card', (settings().zoom || 190) + 'px');
  rebuild();
  if (S.view === 'lib') renderLib(); else show(S.view);
  renderDrawer();
  renderHealth();
  if (S.view !== 'health') $('#v-health').hidden = true;
}

/* ---------- events ---------- */
function bind() {
  if (window.__plugshelfApp) {
    document.body.classList.add('in-app');
    $('#pin').hidden = false;
  }

  let qT;
  $('#q').addEventListener('input', e => {
    clearTimeout(qT);
    $('#qClear').hidden = !e.target.value;
    qT = setTimeout(() => { S.f.q = e.target.value; S.sel = 0; if (S.view !== 'lib') show('lib'); else renderLib(); $('#main').scrollTop = 0; }, 70);
  });
  $('#qClear').onclick = () => { $('#q').value = ''; $('#qClear').hidden = true; S.f.q = ''; renderLib(); $('#q').focus(); };
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.v); };
  $('#daw').onclick = () => show('setup');
  $('#rescan').onclick = () => startScan();
  $('#scanStop').onclick = () => api.post('/api/scan/cancel');
  $('#pin').onclick = () => {
    settings().onTop = !settings().onTop;
    $('#pin').classList.toggle('on', settings().onTop);
    api.post('/api/window', { onTop: settings().onTop });
    saveUser();
  };

  $('#sort').onchange = e => { S.f.sort = e.target.value; renderLib(); };
  $('#dblLoad').onchange = e => { settings().dblLoad = e.target.checked; saveUser(); if (!e.target.checked) { S.bigKey = null; S.bigPos = null; } renderLib(); };
  const applySide = () => { const off = !!settings().sideHidden; $('#v-lib').classList.toggle('noside', off); $('#sideToggle').classList.toggle('on', !off); };
  $('#sideToggle').onclick = () => { settings().sideHidden = !settings().sideHidden; saveUser(); applySide(); };
  document.addEventListener('keydown', e => { if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); $('#sideToggle').click(); } });
  $('#picsToggle').onclick = () => { settings().pics = !picsOn(); saveUser(); $('#picsToggle').classList.toggle('on', picsOn()); renderLib(); renderDrawer(); };
  $('#capStop').onclick = () => api.post('/api/capture/cancel');
  $('#zoom').oninput = e => setZoom(+e.target.value);
  $('#fmts').onclick = e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const f = b.dataset.f;
    S.f.formats.has(f) ? S.f.formats.delete(f) : S.f.formats.add(f);
    renderLib();
  };
  // a line under the pinned title bar once the grid scrolls beneath it
  $('#main').addEventListener('scroll', () => $('.bar1').classList.toggle('stuck', $('#main').scrollTop > 2), { passive: true });
  $('#main').addEventListener('wheel', e => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom((settings().zoom || 190) - Math.sign(e.deltaY) * 8);
  }, { passive: false });

  // sidebar
  const side = $('#side');
  side.addEventListener('click', e => {
    const t = e.target.closest('button, [data-coll]');
    if (!t) return;
    if (t.id === 'newColl') return newColl();
    if (t.id === 'newCat') return newCategory();
    if (t.id === 'stockShots' || t.closest?.('#stockShots')) { e.preventDefault(); return takeStockPictures(); }
    if (t.id === 'newRack') return newRack();
    if (t.id === 'moreMakers') { S.makersAll = !S.makersAll; return renderSide(); }
    if (t.dataset.kind) { S.f.kind = t.dataset.kind; S.sel = 0; return renderLib(); }
    if (t.dataset.rack) {
      S.drawer = S.drawer?.type === 'rack' && S.drawer.id === t.dataset.rack ? null : { type: 'rack', id: t.dataset.rack };
      renderSide(); return renderDrawer();
    }
    if ('coll' in t.dataset && !t.dataset.coll) { S.f.cat = null; S.f.maker = null; S.f.formats.clear(); S.f.kind = 'all'; S.f.q = ''; $('#q').value = ''; }
    if ('coll' in t.dataset) { S.f.coll = t.dataset.coll || null; S.f.kcat = null; S.f.kven = null; S.f.kkind = null; S.sel = 0; if (/^k(ontakt|presets)$/.test(S.f.coll || '')) loadKontakt(); if (/^ur:/.test(S.f.coll || '')) loadUserRacks(); $('#main').scrollTop = 0; return renderLib(); }
    if (t.dataset.cat) { S.f.cat = S.f.cat === t.dataset.cat ? null : t.dataset.cat; S.sel = 0; $('#main').scrollTop = 0; return renderLib(); }
    if (t.dataset.maker) { S.f.maker = S.f.maker === t.dataset.maker ? null : t.dataset.maker; S.sel = 0; $('#main').scrollTop = 0; return renderLib(); }
  });
  side.addEventListener('input', e => { if (e.target.id === 'makerQ') { S.makerQ = e.target.value; renderSide(); } });
  side.addEventListener('change', e => { if (e.target.id === 'showStock') { settings().showStock = e.target.checked; saveUser(); S.sel = 0; renderLib(); } });
  side.addEventListener('contextmenu', e => {
    const oc = e.target.closest('[data-owncat]');
    if (oc) {
      e.preventDefault();
      const cc = (S.user.customCats || []).find(x => x.id === oc.dataset.owncat);
      if (!cc) return;
      return menu(e.clientX, e.clientY, [
        { label: 'Rename…', fn: async () => { const n = await ask('Rename category', '', cc.label); if (n) { cc.label = n; saveUser(); rebuild(); renderLib(); renderDrawer(); } } },
        { label: 'Delete', fn: async () => { if (await confirmDlg(`Delete the category “${cc.label}”?`, 'The plugins stay installed and keep their other categories.')) removeCategory(cc.id); } },
      ]);
    }
    const c = e.target.closest('[data-cmenu]'), r = e.target.closest('[data-rack]');
    if (c) {
      e.preventDefault();
      const col = S.user.collections.find(x => x.id === c.dataset.cmenu);
      menu(e.clientX, e.clientY, [
        { label: 'Rename…', fn: async () => { const n = await ask('Rename collection', '', col.name); if (n) { col.name = n; saveUser(); renderLib(); } } },
        { label: 'Delete', fn: async () => { if (await confirmDlg(`Delete “${col.name}”?`, 'The plugins themselves stay installed, of course.')) { S.user.collections = S.user.collections.filter(x => x !== col); if (S.f.coll === 'c:' + col.id) S.f.coll = null; saveUser(); renderLib(); } } },
      ]);
    } else if (r) {
      e.preventDefault();
      const rack = S.user.racks.find(x => x.id === r.dataset.rack);
      menu(e.clientX, e.clientY, [
        { label: 'Load in Live', bold: true, disabled: !rack.items.length, fn: () => loadRack(rack) },
        { label: 'Edit', fn: () => { S.drawer = { type: 'rack', id: rack.id }; renderSide(); renderDrawer(); } },
        { label: 'Delete', fn: () => deleteRack(rack) },
      ]);
    }
  });

  // drag cards onto sidebar targets
  side.addEventListener('dragover', e => {
    const t = e.target.closest('[data-drop]');
    if (!t || !e.dataTransfer.types.includes('text/x-family')) return;
    e.preventDefault();
    $$('.item.drop', side).forEach(x => x !== t && x.classList.remove('drop'));
    t.classList.add('drop');
  });
  side.addEventListener('dragleave', e => { const t = e.target.closest('[data-drop]'); if (t && !t.contains(e.relatedTarget)) t.classList.remove('drop'); });
  side.addEventListener('drop', e => {
    const t = e.target.closest('[data-drop]');
    $$('.item.drop', side).forEach(x => x.classList.remove('drop'));
    const key = e.dataTransfer.getData('text/x-family');
    if (!t || !key) return;
    e.preventDefault();
    const d = t.dataset.drop;
    if (d === 'favs') { if (!S.user.favs.includes(key)) toggleFav(key); toast(`${S.famBy.get(key)?.name} → Favourites`, 'ok'); }
    else if (d.startsWith('c:')) addToColl(d.slice(2), key);
    else if (d.startsWith('r:')) addToRack(d.slice(2), key);
  });

  // cards
  const onCards = root => {
    root.addEventListener('click', e => {
      const card = e.target.closest('.card'); if (!card) return;
      const f = S.famBy.get(card.dataset.k); if (!f) return;
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'fav') return toggleFav(f.key);
      if (act === 'info') return openInfo(f.key);
      if (act === 'menu') { const r = e.target.getBoundingClientRect(); return cardMenu(f, r.left, r.bottom + 4); }
      const i = +card.dataset.i;
      if (i >= 0) { S.sel = i; $$('#grid .card.sel').forEach(c => c.classList.remove('sel')); card.classList.add('sel'); }
      if (settings().dblLoad && root.id === 'grid') {
        if (e.detail > 1) return;                          // part of a double-click
        clearTimeout(S.clickT);
        S.clickT = setTimeout(() => focusCard(card, f), 220);
        return;
      }
      loadFam(f);
    });
    root.addEventListener('dblclick', e => {
      if (!settings().dblLoad || root.id !== 'grid') return;
      const card = e.target.closest('.card'); if (!card || e.target.closest('[data-act]')) return;
      clearTimeout(S.clickT);
      const f = S.famBy.get(card.dataset.k); if (f) loadFam(f);
    });
    root.addEventListener('contextmenu', e => {
      const card = e.target.closest('.card'); if (!card) return;
      e.preventDefault();
      const f = S.famBy.get(card.dataset.k);
      if (f) cardMenu(f, e.clientX, e.clientY);
    });
    root.addEventListener('dragstart', e => {
      const card = e.target.closest('.card'); if (!card) return;
      e.dataTransfer.setData('text/x-family', card.dataset.k);
      e.dataTransfer.setData('text/plain', S.famBy.get(card.dataset.k)?.name || '');
      e.dataTransfer.effectAllowed = 'copy';
    });
  };
  onCards($('#grid'));
  onCards($('#shelf'));

  // banner
  $('#banner').addEventListener('click', e => {
    if (e.target.closest('[data-go]')) show('setup');
    if (e.target.closest('[data-banner-off]')) { settings().bannerOff = true; saveUser(); renderBanner(); }
    if (e.target.closest('[data-update-install]')) return installUpdate();
    if (e.target.closest('[data-update-skip]')) { settings().skipVersion = S.update?.latest; saveUser(); renderBanner(); }
    // the app opens other sites in the default browser
    if (e.target.closest('[data-update-notes]') && S.update?.page) location.href = S.update.page;
  });

  bindDrawer();
  bindPages();

  // menus close
  document.addEventListener('mousedown', e => {
    if (!e.target.closest('.menu')) closeAll();
  });
  $('#main').addEventListener('scroll', closeAll);
  window.addEventListener('blur', closeAll);
  window.addEventListener('resize', closeAll);

  document.addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) pollDaw(); });
}

function setZoom(z) {
  z = Math.max(140, Math.min(320, z));
  settings().zoom = z;
  document.documentElement.style.setProperty('--card', z + 'px');
  $('#zoom').value = z;
  saveUser();
}

async function deleteRack(rack) {
  if (!(await confirmDlg(`Delete rack “${rack.name}”?`, 'The plugins stay installed; only the chain goes.'))) return;
  S.user.racks = S.user.racks.filter(x => x !== rack);
  if (S.drawer?.id === rack.id) S.drawer = null;
  saveUser(); renderLib(); renderDrawer();
}

function bindDrawer() {
  const d = $('#drawer');
  d.addEventListener('click', e => {
    const t = e.target.closest('button'); if (!t) return;
    const key = S.drawer?.key;
    const f = key && S.famBy.get(key);
    if ('close' in t.dataset) { S.drawer = null; renderDrawer(); renderSide(); return; }
    if ('loadfam' in t.dataset && f) return loadFam(f);
    if ('favfam' in t.dataset && f) return toggleFav(f.key);
    if ('hidefam' in t.dataset && f) return toggleHidden(f.key);
    if ('capfam' in t.dataset && f) return capture([f.key]);
    if (t.dataset.load && f) { const p = f.items.find(x => x.id === t.dataset.load); return loadFam(f, p.format, p.name); }
    if (t.dataset.reveal) return reveal(t.dataset.reveal);
    const rack = S.drawer?.type === 'rack' && S.user.racks.find(r => r.id === S.drawer.id);
    if (!rack) return;
    if ('loadrack' in t.dataset) return loadRack(rack);
    if ('delrack' in t.dataset) return deleteRack(rack);
    if (t.dataset.unslot != null) { rack.items.splice(+t.dataset.unslot, 1); saveUser(); renderDrawer(); renderSide(); }
  });
  d.addEventListener('click', e => {
    // the big card in the details drawer loads, like in the grid
    const card = e.target.closest('.card'); if (!card || e.target.closest('button')) return;
    const f = S.famBy.get(card.dataset.k); if (f) loadFam(f);
  });
  d.addEventListener('change', e => {
    const t = e.target;
    const f = S.drawer?.key && S.famBy.get(S.drawer.key);
    if (t.dataset.catbox && f) {
      // the first ticked category stays the main one; the others are "also in"
      const now = [f.category, ...(f.also || [])].filter(k => k !== t.dataset.catbox);
      const next = t.checked ? [...now, t.dataset.catbox] : now;
      if (!next.length) { t.checked = true; return toast('A plugin needs at least one category.', 'err'); }
      const o = (S.user.overrides[f.key] ||= {});
      o.category = next[0]; o.also = next.slice(1);
      saveUser(); rebuild(); renderLib();
      const open = $('#drawer .catpick')?.open; renderDrawer(); if (open) $('#drawer .catpick').open = true;
      return;
    }
    if (t.dataset.note != null) { rebuild(); renderLib(); }
    if (t.dataset.setcat != null && f) { (S.user.overrides[f.key] ||= {}).category = t.value; saveUser(); rebuild(); renderLib(); renderDrawer(); }
    if (t.dataset.setkind != null && f) { (S.user.overrides[f.key] ||= {}).kind = t.value; saveUser(); rebuild(); renderLib(); renderDrawer(); }
    if (t.dataset.incoll && f) {
      const c = S.user.collections.find(x => x.id === t.dataset.incoll);
      if (t.checked) { if (!c.items.includes(f.key)) c.items.push(f.key); } else c.items = c.items.filter(k => k !== f.key);
      saveUser(); renderSide();
    }
    const rack = S.drawer?.type === 'rack' && S.user.racks.find(r => r.id === S.drawer.id);
    if (rack && t.dataset.slotfmt != null) { rack.items[+t.dataset.slotfmt].format = t.value || null; saveUser(); }
  });
  d.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.note != null && S.drawer?.key) { S.user.notes[S.drawer.key] = t.value; if (!t.value) delete S.user.notes[S.drawer.key]; saveUser(); }
    if (t.dataset.rackname != null) {
      const rack = S.user.racks.find(r => r.id === S.drawer.id);
      if (rack) { rack.name = t.value || 'Rack'; saveUser(); renderSide(); }
    }
  });

  // rack: drop cards in, drag slots to reorder
  let dragSlot = null;
  d.addEventListener('dragstart', e => {
    const s = e.target.closest('.slot'); if (!s) return;
    dragSlot = +s.dataset.slot;
    s.classList.add('dragging');
    e.dataTransfer.setData('text/x-slot', String(dragSlot));
    e.dataTransfer.effectAllowed = 'move';
  });
  d.addEventListener('dragend', () => { dragSlot = null; $$('.slot', d).forEach(s => s.classList.remove('dragging', 'over')); $('#slots')?.classList.remove('drop'); });
  d.addEventListener('dragover', e => {
    if (S.drawer?.type !== 'rack') return;
    const fam = e.dataTransfer.types.includes('text/x-family'), slot = e.dataTransfer.types.includes('text/x-slot');
    if (!fam && !slot) return;
    e.preventDefault();
    $$('.slot', d).forEach(s => s.classList.remove('over'));
    e.target.closest('.slot')?.classList.add('over');
    if (fam) $('#slots')?.classList.add('drop');
  });
  d.addEventListener('dragleave', e => { if (!d.contains(e.relatedTarget)) { $('#slots')?.classList.remove('drop'); $$('.slot', d).forEach(s => s.classList.remove('over')); } });
  d.addEventListener('drop', e => {
    if (S.drawer?.type !== 'rack') return;
    e.preventDefault();
    const rack = S.user.racks.find(r => r.id === S.drawer.id);
    const over = e.target.closest('.slot');
    const at = over ? +over.dataset.slot : rack.items.length;
    const key = e.dataTransfer.getData('text/x-family');
    if (key) return addToRack(rack.id, key, at);
    const from = e.dataTransfer.getData('text/x-slot');
    if (from !== '') {
      const [it] = rack.items.splice(+from, 1);
      rack.items.splice(Math.min(at, rack.items.length), 0, it);
      saveUser(); renderDrawer();
    }
  });
}

function bindPages() {
  $('#health').addEventListener('click', e => {
    const r = e.target.closest('[data-reveal]'); if (r) return reveal(r.dataset.reveal);
    const h = e.target.closest('[data-toggle]'); if (h) return h.parentElement.classList.toggle('open');
    if (e.target.closest('#trashVst2')) return trashVst2();
    if (e.target.closest('#trashAax')) return trashAax();
    if (e.target.closest('#trashAu')) return trashAu();
    if (e.target.closest('#trashFailed')) return trashFailed();
    if (e.target.closest('#trashIntel')) return trashIntel();
    const j = e.target.closest('[data-jump]');
    if (j) { const s = $('#h-' + j.dataset.jump); if (s) { s.classList.add('open'); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  });
  $('#setup').addEventListener('change', e => { if (e.target.id === 'updateCheck') { settings().updateCheck = e.target.checked; saveUser(); } });
  $('#setup').addEventListener('input', e => { if (e.target.id === 'verQ') { S.verQ = e.target.value; $('#verList').innerHTML = versionsList(); } });
  $('#setup').addEventListener('click', async e => {
    const mo = e.target.closest('[data-maker-open]');
    if (mo) { e.preventDefault(); e.stopPropagation(); const r = await api.post('/api/makers/open', { vendor: mo.dataset.makerOpen, how: mo.dataset.how }).catch(() => null); return toast(r?.msg || 'Could not open it', r?.ok ? 'ok' : 'err'); }
    if (e.target.closest('#verScan')) return versionScan();
    if (e.target.closest('#updateNow')) { await checkUpdate(true); return renderSetup(); }
    if (e.target.closest('[data-update-install]')) return installUpdate();
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'install') {
      const r = await api.post('/api/ableton/install');
      toast(r.msg, r.ok ? 'ok' : 'err');
      await refreshScript(); renderSetup(); renderBanner();
    }
    if (t.id === 'testLive') {
      await pollDaw();
      toast(S.daw.ok ? `Connected: ${S.daw.msg}` : (S.daw.msg || 'No answer from Live'), S.daw.ok ? 'ok' : 'err');
      renderSetup();
    }
    if (t.id === 'scanNow') { startScan(); }
    if (t.id === 'capMissing') capture(picCounts().missing.map(f => f.key));
    if (t.id === 'capFailed') capture(picCounts().failed.map(f => f.key));
    if (t.id === 'roneImport') {
      t.disabled = true;
      const r = await api.post('/api/thumbs/rone');
      toast(`Imported ${r.imported} pictures`, 'ok');
      await watchCapture();
      await refreshRone();
      renderSetup();
    }
    if (t.id === 'kbBlock' || t.id === 'kbHarvest' || t.id === 'kbClear') {
      const ep = { kbBlock: 'block', kbHarvest: 'harvest', kbClear: 'clear' }[t.id];
      const r = await api.post('/api/kontakt/' + ep, {});
      S.builderMsg = ep === 'harvest'
        ? (r.ok ? `${(r.written || []).length} presets written${r.empty?.length ? `; still empty (no instrument loaded): ${r.empty.join(', ')}` : ''}.` : r.msg)
        : (r.msg || (r.ok ? 'Done' : 'Live did not answer – is it open with the PlugShelf control surface?'));
      await refreshBuilder();
      if (ep === 'harvest') loadKontakt(true);
      renderSetup();
    }
    if (t.id === 'remoteCode' || t.id === 'remoteForget') {
      S.remote = await api.post('/api/remote', t.id === 'remoteCode' ? { newCode: true } : { forget: true });
      renderSetup();
    }
    if (t.dataset.up || t.dataset.down) {
      const o = prefer().slice(), i = +(t.dataset.up ?? t.dataset.down), j = t.dataset.up ? i - 1 : i + 1;
      [o[i], o[j]] = [o[j], o[i]];
      settings().prefer = o;
      saveUser(); rebuild(); renderSetup();
    }
  });
  $('#setup').addEventListener('change', e => {
    if (e.target.id === 'remoteOn') { api.post('/api/remote', { enabled: e.target.checked }).then(r => { S.remote = r; renderSetup(); }); }
    if (e.target.id === 'picsOn') { settings().pics = e.target.checked; saveUser(); $('#picsToggle').classList.toggle('on', picsOn()); }
    if (e.target.id === 'showAAX') {
      settings().showAAX = e.target.checked;
      if (!e.target.checked) S.f.formats.delete('AAX');
      saveUser(); rebuild();
    }
  });
}

function onKey(e) {
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
  const inSearch = document.activeElement?.id === 'q';
  if (!$('#modal').hidden) return;
  if (e.key === 'F5' || (e.key === 'r' && e.metaKey && e.shiftKey)) { e.preventDefault(); startScan(); return; }
  if (e.key === 'Escape') {
    if (!$('#menu').hidden) return closeAll();
    if (S.f.q) { $('#q').value = ''; $('#qClear').hidden = true; S.f.q = ''; renderLib(); return; }
    if (S.drawer) { S.drawer = null; renderDrawer(); renderSide(); return; }
    if (inField) document.activeElement.blur();
    return;
  }
  if (e.key === '/' && !inField) { e.preventDefault(); $('#q').focus(); $('#q').select(); return; }
  if (S.view !== 'lib' || (inField && !inSearch)) return;
  const n = S.list.length;
  if (!n) return;
  const cols = Math.max(1, getComputedStyle($('#grid')).gridTemplateColumns.split(' ').length);
  let s = S.sel;
  if (e.key === 'ArrowRight' && !inSearch) s++;
  else if (e.key === 'ArrowLeft' && !inSearch) s--;
  else if (e.key === 'ArrowDown') s += inSearch && s === 0 && !$('#grid .card.sel') ? 0 : cols;
  else if (e.key === 'ArrowUp') s -= cols;
  else if (e.key === 'Enter') { e.preventDefault(); const f = S.list[S.sel]; if (f) loadFam(f); return; }
  else return;
  e.preventDefault();
  S.kbd = true;
  S.sel = Math.max(0, Math.min(n - 1, s));
  $$('#grid .card.sel').forEach(c => c.classList.remove('sel'));
  const el = $(`#grid .card[data-i="${S.sel}"]`);
  if (el) { el.classList.add('sel'); el.scrollIntoView({ block: 'nearest' }); }
}

/* ---------- start ---------- */
(async function start() {
  bind();
  try { await loadState(); } catch (e) { showEmpty(`<h3>PlugShelf is not responding</h3><p>${esc(e.message)}</p>`); return; }
  if (settings().onTop && window.__plugshelfApp) { $('#pin').classList.add('on'); api.post('/api/window', { onTop: true }); }
  watchScan();
  $('#picsToggle').classList.toggle('on', picsOn());
  $('#v-lib').classList.toggle('noside', !!settings().sideHidden); $('#sideToggle').classList.toggle('on', !settings().sideHidden);
  $('#dblLoad').checked = !!settings().dblLoad;
  watchCapture();
  await refreshScript();
  checkUpdate();
  renderBanner();
  pollDaw();
  setInterval(pollDaw, 4000);
})();
