'use strict';
/* PlugShelf Remote – the iPad / iPhone page. Served by the Mac app's remote server (Remote.swift) after
   pairing with the code shown in PlugShelf → Setup. It reads a trimmed library (no file paths), loads
   plugins and chains into Live on the Mac, and keeps its own view settings in this browser only.
   The chain picking follows web/chains.js (same templates, same device-first rule). */

const $ = (s, e = document) => e.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const svg = b => `<svg viewBox="0 0 24 24">${b}</svg>`;
const store = {
  get(k, d) { try { const v = localStorage.getItem('ps.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('ps.' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

class NeedPair extends Error {}
const api = {
  async get(p) { const r = await fetch(p, { cache: 'no-store' }); if (r.status === 401) throw new NeedPair(); return r.json(); },
  async post(p, b) {
    const r = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-PlugShelf': '1' }, body: JSON.stringify(b || {}) });
    if (r.status === 401) throw new NeedPair();
    return r.json();
  },
};

const CATS = {
  Synth: ['Synths', 268], Keys: ['Keys & Piano', 32], Drums: ['Drums', 8], Sampler: ['Sampler', 300], Instrument: ['Other instruments', 245],
  EQ: ['EQ', 190], Dynamics: ['Dynamics', 152], 'Channel Strip': ['Channel Strip', 170], Reverb: ['Reverb', 222], Delay: ['Delay', 205],
  Modulation: ['Modulation', 320], Distortion: ['Saturation', 14], Tape: ['Tape & lo-fi', 26], Amp: ['Amps & pedals', 0], Filter: ['Filter', 48], Pitch: ['Pitch', 280], Vocal: ['Vocals', 340],
  Spatial: ['Stereo & space', 236], Surround: ['Surround', 252], Mastering: ['Mastering', 40], Analyzer: ['Analysis', 125], Restoration: ['Restoration', 100],
  Creative: ['Creative & multi-FX', 290], Utility: ['Utilities', 210], MIDI: ['MIDI', 215], Other: ['Other', 220],
};
const cat = c => CATS[c] || CATS.Other;

const R = {
  lib: null, user: null, pics: { thumbs: {} }, fams: [], famBy: new Map(), daw: false,
  view: store.get('view', 'lib'), f: { coll: null, cat: null, kind: 'all', q: '' },
  side: innerWidth > 1000, size: store.get('size', 170),
  kontakt: { libraries: [], presets: [] },
  rubric: store.get('rubric', 'all'), chain: store.get('chain', null), building: false, buildText: '',
};

/* ---------- library ---------- */
const prefer = () => { const p = R.user.settings?.prefer || ['VST3', 'AU', 'VST', 'CLAP']; return [...p, ...['VST3', 'AU', 'VST', 'CLAP'].filter(x => !p.includes(x))]; };
const native = p => !p.archs?.length || p.archs.includes('arm64') || R.lib.machine !== 'arm64';
const usable = p => p.status === 'ok' && p.format !== 'AAX' && native(p) && !p.liveFailed;
const isUAD = f => /universal audio/i.test(f.vendor);

function buildFams() {
  const by = new Map();
  for (const p of R.lib.plugins || []) { if (!by.has(p.family)) by.set(p.family, []); by.get(p.family).push(p); }
  const ov = R.user.overrides || {};
  R.fams = []; R.famBy = new Map();
  for (const [key, items] of by) {
    const b = items[0], o = ov[key] || {};
    const f = { key, items, name: o.name || b.display || b.name, vendor: b.vendor || 'Unknown', kind: o.kind || b.kind, category: o.category || (typeof fixCategory === 'function' ? fixCategory(o.name || b.display || b.name, b.category)[0] : b.category), also: o.also || (o.category || typeof fixCategory !== 'function' ? [] : fixCategory(o.name || b.display || b.name, b.category).slice(1)),
      formats: [...new Set(items.map(p => p.format))], mtime: Math.max(...items.map(p => p.mtime || 0)) };
    f.loadable = items.some(usable);
    f.hay = [f.name, f.vendor, cat(f.category)[0], ...new Set(items.map(p => p.name))].join(' ').toLowerCase();
    if (!R.user.settings?.showAAX && !f.formats.some(x => x !== 'AAX')) continue;
    R.fams.push(f); R.famBy.set(key, f);
  }
  R.fams.sort((a, b) => a.name.localeCompare(b.name));
}

function pickItem(f) {
  const variant = p => (/stereo/i.test(p.name) ? 0 : /mono/i.test(p.name) ? 2 : 1) * 1000 + p.name.length;
  for (const fmt of prefer()) {
    const c = f.items.filter(p => p.format === fmt && usable(p));
    if (c.length) return c.sort((a, b) => variant(a) - variant(b))[0];
  }
  return null;
}

function passes(f, skip) {
  const F = R.f, u = R.user;
  const hidden = u.hidden?.includes(f.key);
  if (hidden) return false;
  if (F.coll === 'favs' && !u.favs?.includes(f.key)) return false;
  if (F.coll === 'recent' && !u.lastUsed?.[f.key]) return false;
  if (F.coll === 'uad' && !isUAD(f)) return false;
  if (F.coll?.startsWith('c:')) { const c = u.collections?.find(x => x.id === F.coll.slice(2)); if (!c?.items.includes(f.key)) return false; }
  if (F.kind !== 'all' && f.kind !== F.kind) return false;
  if (skip !== 'cat' && F.cat && f.category !== F.cat && !f.also?.includes(F.cat)) return false;
  if (F.q && !F.q.toLowerCase().split(/\s+/).every(w => f.hay.includes(w))) return false;
  return true;
}

function tileFace(f, eager = false) {
  let pic = R.pics.thumbs?.[f.key];
  if (pic && !pic.startsWith('/')) pic = '/' + pic;   // picture URLs are relative to the Mac page's root
  const fav = R.user.favs?.includes(f.key) ? '<span class="fav">★</span>' : '';
  const lazy = eager ? '' : ' loading="lazy"';
  if (pic) return `<img class="bg" src="${esc(pic)}&s=blur" alt=""${lazy} decoding="async"><img class="fg" src="${esc(pic)}&s=tile" alt=""${lazy} decoding="async">
    <div class="cap"><b>${esc(f.name)}</b><small>${esc(f.vendor)}</small></div>${fav}`;
  return `<div class="plate"><b>${esc(f.name)}</b></div><div class="cap"><small>${esc(f.vendor)}</small></div>${fav}`;
}

/* ---------- Kontakt libraries and presets ---------- */
const K_GROUPS = ['Strings', 'Brass', 'Woodwinds', 'Piano & Keys', 'Drums & Percussion', 'Synths & Pads', 'Soundscapes & FX', 'Guitars & Plucked', 'Bass', 'Vocals', 'Loops', 'Other'];
const K_HUE = { Strings: 28, Brass: 45, Woodwinds: 95, 'Piano & Keys': 32, 'Drums & Percussion': 8, 'Synths & Pads': 268, 'Soundscapes & FX': 222, 'Guitars & Plucked': 14, Bass: 300, Vocals: 340, Loops: 190, Other: 220 };
const isK = () => R.f.coll === 'kontakt' || R.f.coll === 'kpresets';
function kItems(skip) {
  const q = (R.f.q || '').toLowerCase();
  return (R.f.coll === 'kpresets' ? R.kontakt.presets : R.kontakt.libraries).filter(x =>
    (skip === 'cat' || !R.f.kcat || x.category === R.f.kcat) && (skip === 'ven' || !R.f.kven || x.vendor === R.f.kven) && (R.f.coll !== 'kpresets' || !R.f.kkind || (x.kind || 'preset') === R.f.kkind) && (!q || (x.name + ' ' + (x.library || '')).toLowerCase().includes(q)));
}
function renderKontakt() {
  const pre = R.f.coll === 'kpresets';
  const list = kItems().slice().sort((a, b) => K_GROUPS.indexOf(a.category) - K_GROUPS.indexOf(b.category) || a.name.localeCompare(b.name));
  const tiles = list.map((x, i) => {
    const head = i === 0 || list[i - 1].category !== x.category ? `<div class="grp" style="--h:${K_HUE[x.category]}"><i></i>${esc(x.category)}</div>` : '';
    const art = x.art ? '/' + x.art.replace(/^\//, '') : '';
    const has = !pre && R.kontakt.presets.some(p => p.library === x.name);
    const sub = pre ? (x.kind === 'rack' ? 'Rack · ' : '') + x.library : `${has ? '★ preset · ' : ''}${x.instruments} instruments${x.online === false ? ' · drive offline' : ''}`;
    const face = art ? `<img class="bg" src="${esc(art)}" alt="" loading="lazy"><img class="fg" src="${esc(art)}" alt="" loading="lazy"><div class="cap"><b>${esc(x.name)}</b><small>${esc(sub)}</small></div>`
      : `<div class="plate"><b>${esc(x.name)}</b></div><div class="cap"><small>${esc(sub)}</small></div>`;
    return `${head}<button class="tile${!pre && x.online === false ? ' dead' : ''}" ${pre ? 'data-kp' : 'data-kl'}="${esc(x.id)}" style="--h:${K_HUE[x.category]}">${face}</button>`;
  }).join('');
  const title = (pre ? 'Kontakt Presets' : 'Kontakt Libraries') + (R.f.kcat ? ' · ' + R.f.kcat : '') + (R.f.kven ? ' · ' + R.f.kven : '');
  return `<div class="title"><h1>${esc(R.f.q ? `Search “${R.f.q}”` : title)}</h1><span>${list.length}</span></div>
    ${list.length ? `<div class="grid">${tiles}</div>` : `<div class="empty">${pre ? 'No Kontakt presets yet – save one in Live (User Library › Kontakt Presets).' : 'No Kontakt libraries found.'}</div>`}`;
}
function kVendors() {
  const vc = {};
  for (const x of kItems('ven')) vc[x.vendor || 'Other'] = (vc[x.vendor || 'Other'] || 0) + 1;
  const names = Object.keys(vc).sort((a, b) => (a === 'Other') - (b === 'Other') || vc[b] - vc[a] || a.localeCompare(b));
  return '<h4>Vendors</h4>' + names.map(v => `<button class="item${R.f.kven === v ? ' on' : ''}" data-kven="${esc(v)}"><span>${esc(v)}</span><span class="n">${vc[v]}</span></button>`).join('');
}
async function kLoad(kind, id) {
  try {
    if (kind === 'kp') {
      const r = await api.post('/api/kontakt/load', { id });
      return toast(r.ok ? (r.msg || 'Loaded') : (r.msg || 'Loading failed'), r.ok ? 'ok' : 'err');
    }
    const lib = R.kontakt.libraries.find(x => x.id === id);
    if (lib?.online === false) return toast(`${lib.name}: its drive is not connected.`, 'err');
    const pre = lib && R.kontakt.presets.find(p => p.library === lib.name);
    if (pre) return kLoad('kp', pre.id);
    const f = R.fams.find(x => /^kontakt 8$/i.test(x.name)) || R.fams.find(x => /^kontakt( \d+)?$/i.test(x.name));
    if (!f) return toast('Kontakt is not installed as a plugin.', 'err');
    await loadFam(f.key);
    toast(`Empty Kontakt is on the track – no preset for “${lib?.name}” yet.`, 'ok');
  } catch (e) { if (e instanceof NeedPair) pairScreen(); }
}

function renderLib() {
  if (isK()) return renderKontakt();
  const F = R.f;
  let list = R.fams.filter(f => passes(f));
  const grouped = F.coll === 'uad' && !F.q && !F.cat;
  if (grouped) { const order = Object.keys(CATS); list.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.name.localeCompare(b.name)); }
  if (F.coll === 'recent') list.sort((a, b) => (R.user.lastUsed[b.key] || 0) - (R.user.lastUsed[a.key] || 0));
  const names = { favs: 'Favourites', recent: 'Recently loaded', uad: 'UAD Plugins' };
  let title = names[F.coll] || (F.coll?.startsWith('c:') ? R.user.collections.find(x => x.id === F.coll.slice(2))?.name : 'All plugins');
  if (F.cat) title += ' · ' + cat(F.cat)[0];
  if (F.q) title = `Search “${F.q}”`;
  const tiles = list.map((f, i) => {
    const head = grouped && (i === 0 || list[i - 1].category !== f.category) ? `<div class="grp" style="--h:${cat(f.category)[1]}"><i></i>${esc(cat(f.category)[0])}</div>` : '';
    return `${head}<button class="tile${f.loadable ? '' : ' dead'}" data-load="${esc(f.key)}" style="--h:${cat(f.category)[1]}">${tileFace(f)}</button>`;
  }).join('');
  return `<div class="title"><h1>${esc(title)}</h1><span>${list.length} plugins</span></div>
    ${list.length ? `<div class="grid">${tiles}</div>` : '<div class="empty">No plugins here.</div>'}`;
}

function renderSide() {
  const u = R.user, F = R.f;
  const base = R.fams.filter(f => !u.hidden?.includes(f.key));
  const it = (key, label, n) => `<button class="item${F.coll === key ? ' on' : ''}" data-coll="${key ?? ''}"><span>${esc(label)}</span><span class="n">${n}</span></button>`;
  let h = `<h4>Library</h4>${it(null, 'All plugins', base.length)}${it('favs', 'Favourites', (u.favs || []).filter(k => R.famBy.has(k)).length)}
    ${it('recent', 'Recently loaded', Object.keys(u.lastUsed || {}).filter(k => R.famBy.has(k)).length)}
    ${base.some(isUAD) ? it('uad', 'UAD Plugins', base.filter(isUAD).length) : ''}
    ${R.kontakt.libraries.length ? it('kontakt', 'Kontakt Libraries', R.kontakt.libraries.length) : ''}
    ${R.kontakt.libraries.length || R.kontakt.presets.length ? it('kpresets', 'Kontakt Presets', R.kontakt.presets.length) : ''}
    ${F.coll === 'kpresets' ? `<h4>Type</h4><div class="seg">${[['all', 'All'], ['preset', 'Presets'], ['rack', 'Racks']].map(([k, l]) => `<button data-kkind="${k}" class="${(F.kkind || 'all') === k ? 'on' : ''}">${l}</button>`).join('')}</div>`
      : F.coll === 'kontakt' ? '' : `<h4>Type</h4><div class="seg">${[['all', 'All'], ['inst', 'Instr.'], ['fx', 'Effects']].map(([k, l]) => `<button data-kind="${k}" class="${F.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>`}`;
  if (u.collections?.length) h += '<h4>Collections</h4>' + u.collections.map(c => it('c:' + c.id, c.name, c.items.filter(k => R.famBy.has(k)).length)).join('');
  if (isK()) {
    const kc = {};
    for (const x of kItems('cat')) kc[x.category] = (kc[x.category] || 0) + 1;
    return h + '<h4>Categories</h4>' + K_GROUPS.filter(g => kc[g] || R.f.kcat === g).map(g =>
      `<button class="item${R.f.kcat === g ? ' on' : ''}" data-kcat="${esc(g)}" style="--h:${K_HUE[g]}"><i class="dot"></i><span>${esc(g)}</span><span class="n">${kc[g] || 0}</span></button>`).join('') + kVendors();
  }
  const cc = {};
  for (const f of R.fams) if (passes(f, 'cat')) for (const c of [f.category, ...(f.also || [])]) cc[c] = (cc[c] || 0) + 1;
  h += '<h4>Categories</h4>' + Object.keys(CATS).filter(k => cc[k] || F.cat === k).map(k =>
    `<button class="item${F.cat === k ? ' on' : ''}" data-cat="${k}" style="--h:${CATS[k][1]}"><i class="dot"></i><span>${CATS[k][0]}</span><span class="n">${cc[k] || 0}</span></button>`).join('');
  return h;
}

async function loadFam(key) {
  const f = R.famBy.get(key), p = f && pickItem(f);
  if (!p) return toast(`${f?.name || 'Plugin'}: no version that loads in Live on this Mac.`, 'err');
  const el = document.querySelector(`[data-load="${CSS.escape(key)}"]`);
  if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  try {
    const r = await api.post('/api/load', { ids: [p.id] });
    if (r.ok) { R.user.lastUsed = { ...R.user.lastUsed, [key]: Date.now() }; toast(r.msg || `Loaded ${f.name}`, 'ok'); }
    else toast(r.msg || 'Loading failed', 'err');
  } catch (e) { if (e instanceof NeedPair) return pairScreen(); toast('PlugShelf on the Mac is not responding', 'err'); }
}

/* ---------- chains (same rules as web/chains.js) ---------- */
const famText = f => [f.vendor, f.name, ...f.items.map(p => p.name)].join(' ');
let roleCache = null;
function roleIndex() {
  if (roleCache) return roleCache;
  const ok = R.fams.filter(f => f.loadable && f.kind !== 'inst' && !R.user.hidden?.includes(f.key));
  roleCache = {};
  for (const r of Object.keys(CHAIN_ROLES)) roleCache[r] = ok.filter(f => chainRoleFits(r, { name: f.name, vendor: f.vendor, category: f.category, kind: f.kind, names: [...new Set(f.items.map(p => p.name))] })).map(f => f.key);
  return roleCache;
}
function deviceMatches(slot) {
  if (!slot.device) return [];
  const re = new RegExp(slot.device, 'i');
  return R.fams.filter(f => f.loadable && f.kind !== 'inst' && !R.user.hidden?.includes(f.key) && re.test(famText(f)) && !/\b360\b|\b5\.[01]\b|\blfe/i.test(famText(f))).map(f => f.key);
}
const isSubstitute = (slot, f) => !!(slot.device && f && !new RegExp(slot.device, 'i').test(famText(f)));
function weightedPick(keys, w) { const ws = keys.map(w); let r = Math.random() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) return keys[i]; } return keys[keys.length - 1]; }
function slotWeight(key, slot) {
  const f = R.famBy.get(key); let w = 1;
  if (slot.prefer && new RegExp(slot.prefer, 'i').test(famText(f))) w *= 4;
  if (R.user.favs?.includes(key)) w *= 2.5;
  if (R.user.usage?.[key]) w *= 1.3;
  return w;
}
function pickForSlot(slot, exclude) {
  const norm = x => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
  const dev = deviceMatches(slot).filter(k => !exclude.has(k));
  if (dev.length) { const l = norm(slot.label); return weightedPick(dev, k => { const n = norm(R.famBy.get(k).name); return slotWeight(k, slot) * (n.length > 3 && (l.includes(n) || n.includes(l)) ? 8 : 1); }); }
  const all = roleIndex()[slot.role] || [];
  let pool = all.filter(k => !exclude.has(k));
  if (!pool.length) pool = all.filter(k => k !== slot.family);
  if (!pool.length) return slot.family || null;
  if (slot.only) { const re = new RegExp(slot.only, 'i'); const own = pool.filter(k => re.test(famText(R.famBy.get(k)))); if (own.length) pool = own; }
  if (slot.prefer) { const re = new RegExp(slot.prefer, 'i'); const st = pool.filter(k => re.test(famText(R.famBy.get(k)))); if (st.length && (slot.only || slot.device || Math.random() < 0.8)) pool = st; }
  return weightedPick(pool, k => slotWeight(k, slot));
}
function newChain(quiet = false) {
  const idx = roleIndex();
  let pool = CHAIN_TEMPLATES.filter(t => chainInRubric(t, R.rubric));
  if (pool.length > 1 && R.chain) pool = pool.filter(t => t.id !== R.chain.template);
  if (!pool.length) return toast('No chain in this category.', 'err');
  const t = pool[Math.floor(Math.random() * pool.length)];
  const possible = t.slots.filter(s => (idx[s.role] || []).length || deviceMatches({ device: s.device ? s.device.source : '' }).length);
  let chosen = possible.filter(s => Math.random() < (s.opt ?? 1));
  if (chosen.length < Math.min(2, possible.length)) chosen = possible;
  const slots = chosen.map(s => ({ role: s.role, label: s.label, tip: s.tip || '', prefer: s.prefer ? s.prefer.source : '', only: s.only ? s.only.source : '',
    device: s.device ? s.device.source : '', set: s.set || null, macros: s.macros || null, family: null, locked: false }));
  const used = new Set();
  for (const s of slots) { s.family = pickForSlot(s, used); if (s.family) used.add(s.family); }
  R.chain = { template: t.id, rubric: t.rubric, also: t.also || [], name: t.name, desc: t.desc, src: t.src || '', slots };
  saveChain(); if (!quiet) render();
}
function rollPlugins() {
  if (!R.chain) return newChain();
  R.chain.slots.forEach((s, i) => {
    if (s.locked) return;
    const others = new Set(R.chain.slots.filter((_, j) => j !== i).map(x => x.family).filter(Boolean));
    if (s.family) others.add(s.family);
    s.family = pickForSlot(s, others);
  });
  saveChain(); render();
}
function saveChain() { store.set('chain', R.chain); store.set('rubric', R.rubric); }
async function loadChain() {
  const ch = R.chain;
  const slots = ch.slots.filter(s => s.family).map(s => ({ family: s.family, role: s.role, label: s.label, set: s.set || {}, macros: s.macros || [] }));
  if (!slots.length) return;
  try {
    const r = await api.post('/api/rack/build', { name: ch.name, annotation: [ch.desc, ch.src && 'Source: ' + ch.src].filter(Boolean).join(' – '), slots, returns: ch.rubric === 'returns', load: true });
    if (!r.ok) return toast(r.msg || 'Cannot build the rack', 'err');
    R.building = true; R.buildText = 'Building the rack…'; render();
    for (;;) {
      await new Promise(res => setTimeout(res, 600));
      const p = await api.get('/api/rack/build');
      if (p.running) { R.buildText = `Building – ${Math.min(p.done + 1, p.total)} of ${p.total}: ${p.current || ''}`; const el = $('#prog'); if (el) el.textContent = R.buildText; continue; }
      R.building = false; render();
      const res = p.result || {};
      if (!res.ok) return toast(res.msg || 'Cannot build the rack', 'err');
      toast(res.loaded ? `Rack “${res.name}” with ${res.macros.length} macros is on the track` : `Rack saved, but Live did not load it: ${res.msg || 'no answer'}`, res.loaded ? 'ok' : 'err');
      return;
    }
  } catch (e) { R.building = false; render(); if (e instanceof NeedPair) return pairScreen(); toast('PlugShelf on the Mac is not responding', 'err'); }
}

function renderChains() {
  if (!R.chain) newChain(true);
  if (!R.chain) return '<div class="empty">No chains available.</div>';
  const ch = R.chain, name = id => (CHAIN_RUBRICS.find(r => r.id === id) || {}).name || id;
  const chip = r => `<button class="chip${R.rubric === r.id ? ' on' : ''}" data-rubric="${r.id}">${esc(r.name)}</button>`;
  const showUA = R.rubric === 'uad' || R.rubric.startsWith('ua-');
  const slots = ch.slots.map((s, i) => {
    const f = s.family && R.famBy.get(s.family);
    return `<div class="slot${s.locked ? ' locked' : ''}">
      <div class="hd"><span class="num">${i + 1}</span><span class="lbl">${esc(s.label)}</span></div>
      ${f ? `<button class="tile" data-pick="${i}" style="--h:${cat(f.category)[1]}">${tileFace(f, true)}</button>` : `<button class="tile" data-pick="${i}"><div class="plate"><b>Choose a plugin</b></div></button>`}
      <div class="nm"><b>${esc(f ? f.name : '—')}</b><small>${esc(f ? f.vendor : '')}</small>${isSubstitute(s, f) ? `<em>Stand-in for ${esc(s.label)}</em>` : ''}</div>
      <div class="tip">${esc(s.tip)}</div>
      <div class="acts"><button data-roll="${i}">Roll</button><button data-pick="${i}">Choose</button><button data-lock="${i}">${s.locked ? 'Unlock' : 'Lock'}</button></div>
    </div>`;
  }).join('');
  return `<div class="chips">${CHAIN_RUBRICS.filter(r => !r.group).map(chip).join('')}</div>
    <div class="chips"><span class="rlabel">Genre</span>${CHAIN_RUBRICS.filter(r => r.group === 'genre').map(chip).join('')}</div>
    ${showUA ? `<div class="chips"><span class="rlabel">UA Console</span>${CHAIN_RUBRICS.filter(r => r.group === 'ua').map(chip).join('')}</div>` : ''}
    <div class="chainhead"><small>${[ch.rubric, ...(ch.also || []).filter(x => x !== 'famous')].map(r => esc(name(r))).join(' · ')} · ${ch.slots.length} modules</small>
      <h2>${esc(ch.name)}</h2><p>${esc(ch.desc || '')}</p>${ch.src ? `<p class="src">Source: ${esc(ch.src)}</p>` : ''}
      ${R.building ? `<p class="prog" id="prog">${esc(R.buildText)}</p>` : ''}</div>
    <div class="btns"><button class="btn" data-act="roll">${svg('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/>')}Roll plugins</button>
      <button class="btn" data-act="new">${svg('<path d="M12 5v14M5 12h14"/>')}New chain</button>
      <button class="btn pri" data-act="load" ${R.building ? 'disabled' : ''}>${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Load in Live</button></div>
    <div class="slots">${slots}</div>`;
}

/* ---------- plugin picker for a chain slot ---------- */
function pickerHTML() {
  const s = R.chain?.slots[R.pick];
  if (!s) return '';
  const dev = new Set(deviceMatches(s));
  const role = (roleIndex()[s.role] || []).filter(k => !dev.has(k));
  const q = (R.pickQ || '').toLowerCase();
  const keys = [...dev, ...role.sort((a, b) => R.famBy.get(a).name.localeCompare(R.famBy.get(b).name))]
    .filter(k => !q || R.famBy.get(k).hay.includes(q));
  const row = k => { const f = R.famBy.get(k); return `<button class="prow${k === s.family ? ' on' : ''}" data-choose="${esc(k)}">
      <span class="tile mini" style="--h:${cat(f.category)[1]}">${tileFace(f)}</span>
      <span class="pt"><b>${esc(f.name)}</b><small>${esc(f.vendor)}${dev.has(k) ? ' · original' : ''}</small></span></button>`; };
  return `<div class="sheetwrap" data-close-pick><div class="sheet" role="dialog">
    <div class="sh"><b>${esc(s.label)}</b><button class="iconbtn" data-close-pick aria-label="Close">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>
    <input class="search" id="pickQ" type="search" placeholder="Search ${keys.length} plugins" value="${esc(R.pickQ || '')}">
    <div class="plist">${keys.map(row).join('') || '<div class="empty">Nothing fits.</div>'}</div>
  </div></div>`;
}

async function toggleFav(key) {
  const on = !R.user.favs?.includes(key);
  try {
    const r = await api.post('/api/remote/fav', { key, on });
    if (r.ok) { R.user.favs = r.favs; toast(`${on ? '★ Added to' : 'Removed from'} favourites: ${R.famBy.get(key)?.name || ''}`, 'ok'); render(); }
  } catch (e) { if (e instanceof NeedPair) pairScreen(); }
}

// Long press on a library tile toggles the favourite; a normal tap loads the plugin.
let pressT = null, pressed = false;
document.addEventListener('pointerdown', e => {
  const t = e.target.closest('[data-load]');
  if (!t) return;
  pressed = false;
  pressT = setTimeout(() => { pressed = true; toggleFav(t.dataset.load); }, 550);
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) document.addEventListener(ev, () => clearTimeout(pressT));
document.addEventListener('contextmenu', e => { if (e.target.closest('[data-load]')) e.preventDefault(); });

/* ---------- shell ---------- */
function render() {
  document.documentElement.style.setProperty('--card', R.size + 'px');
  const lib = R.view === 'lib';
  $('#app').innerHTML = `<div class="top">
      ${lib ? `<button class="iconbtn" data-act="side" aria-label="Sidebar">${svg('<path d="M4 6h16M4 12h16M4 18h16"/>')}</button>` : ''}
      <div class="tabs"><button data-view="lib" class="${lib ? 'on' : ''}">Library</button><button data-view="chains" class="${lib ? '' : 'on'}">Chains</button></div>
      ${lib ? `<input class="search" id="q" type="search" placeholder="Search plugins" value="${esc(R.f.q)}">` : '<div style="flex:1"></div>'}
      <input class="size" id="size" type="range" min="110" max="320" value="${R.size}" aria-label="Tile size">
      <span class="live${R.daw ? ' on' : ''}"><i></i>${R.daw ? 'Live' : 'Live offline'}</span>
    </div>
    <div class="main">
      ${lib && R.side ? `${innerWidth <= 1000 ? '<div class="scrim" data-act="side"></div>' : ''}<aside class="side">${renderSide()}</aside>` : ''}
      <div class="content">${lib ? renderLib() : renderChains()}</div>
    </div>${R.pick != null ? pickerHTML() : ''}`;
}

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

document.addEventListener('click', e => {
  if (e.target.classList?.contains('sheetwrap')) { R.pick = null; render(); return; }   // tap beside the sheet closes it
  const t = e.target.closest('button,[data-act]');
  if (!t) return;
  const d = t.dataset;
  if (d.view) { R.view = d.view; store.set('view', R.view); render(); scrollTo(0, 0); }
  else if (d.act === 'side') { R.side = !R.side; render(); }
  else if (d.kkind) { R.f.kkind = d.kkind === 'all' ? null : d.kkind; render(); scrollTo(0, 0); }
  else if (d.kven) { R.f.kven = R.f.kven === d.kven ? null : d.kven; if (innerWidth <= 1000) R.side = false; render(); scrollTo(0, 0); }
  else if (d.kcat) { R.f.kcat = R.f.kcat === d.kcat ? null : d.kcat; if (innerWidth <= 1000) R.side = false; render(); scrollTo(0, 0); }
  else if (d.kl) kLoad('kl', d.kl);
  else if (d.kp) kLoad('kp', d.kp);
  else if (d.coll !== undefined) { R.f.coll = d.coll || null; R.f.cat = null; R.f.kcat = null; R.f.kven = null; R.f.kkind = null; if (innerWidth <= 1000) R.side = false; render(); scrollTo(0, 0); }
  else if (d.cat) { R.f.cat = R.f.cat === d.cat ? null : d.cat; if (innerWidth <= 1000) R.side = false; render(); scrollTo(0, 0); }
  else if (d.kind) { R.f.kind = d.kind; render(); }
  else if (d.load) { if (pressed) { pressed = false; return; } loadFam(d.load); }
  else if (d.choose) { R.chain.slots[R.pick].family = d.choose; R.pick = null; R.pickQ = ''; saveChain(); render(); }
  else if (d.pick !== undefined) { R.pick = +d.pick; R.pickQ = ''; render(); }
  else if (d.closePick !== undefined) { R.pick = null; render(); }
  else if (d.rubric) { R.rubric = d.rubric; newChain(); }
  else if (d.roll !== undefined) { const s = R.chain.slots[+d.roll]; const others = new Set(R.chain.slots.map(x => x.family).filter(Boolean)); s.family = pickForSlot(s, others); saveChain(); render(); }
  else if (d.lock !== undefined) { const s = R.chain.slots[+d.lock]; s.locked = !s.locked; saveChain(); render(); }
  else if (d.act === 'roll') rollPlugins();
  else if (d.act === 'new') newChain();
  else if (d.act === 'load') loadChain();
});
let qT;
document.addEventListener('input', e => {
  if (e.target.id === 'q') { clearTimeout(qT); qT = setTimeout(() => { R.f.q = e.target.value; const c = $('.content'); if (c) c.innerHTML = renderLib(); }, 120); }
  if (e.target.id === 'pickQ') { R.pickQ = e.target.value; const l = $('.plist'); const tmp = document.createElement('div'); tmp.innerHTML = pickerHTML(); const nl = tmp.querySelector('.plist'); if (l && nl) l.replaceWith(nl); }
  if (e.target.id === 'size') { R.size = +e.target.value; store.set('size', R.size); document.documentElement.style.setProperty('--card', R.size + 'px'); }
});

/* ---------- pairing and start ---------- */
function pairScreen(msg = '') {
  $('#app').innerHTML = `<div class="pair"><h1>PlugShelf Remote</h1>
    <p>On the Mac, open <b>PlugShelf → Setup → iPad remote</b> and type the 6-digit code shown there.</p>
    <input id="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="000000">
    <button class="btn pri" data-pair>Connect</button>
    <p style="color:#e5484d">${esc(msg)}</p></div>`;
  const go = async () => {
    const code = $('#code').value.trim();
    try { const r = await api.post('/api/remote/pair', { code }); if (r.ok) return start(); } catch { /* falls through */ }
    pairScreen('Wrong code – check the code on the Mac (it changes after 5 wrong tries).');
  };
  $('[data-pair]').onclick = go;
  $('#code').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  $('#code').focus();
}

async function pollDaw() {
  try { const r = await api.get('/api/daw'); const ok = !!r.ok; if (ok !== R.daw) { R.daw = ok; const el = $('.live'); if (el) { el.classList.toggle('on', ok); el.lastChild.textContent = ok ? 'Live' : 'Live offline'; } } } catch { /* ignore */ }
  setTimeout(pollDaw, 8000);
}

async function start() {
  $('#app').innerHTML = '<div class="pair"><h1>PlugShelf Remote</h1><p>Connecting to PlugShelf on the Mac…</p></div>';
  try {
    const st = await api.get('/api/remote/state');
    R.lib = st.library; R.user = st.user || {}; R.pics = st.pics || { thumbs: {} };
    for (const c of R.user.customCats || []) CATS[c.id] = [c.label, c.hue];
    buildFams();
    try { uaRegister(await api.get('/api/uapresets')); } catch { /* no UA presets */ }
    try { R.kontakt = await api.get('/api/kontakt'); } catch { /* no Kontakt */ }
    if (R.chain && !R.chain.slots?.every(s => !s.family || R.famBy.has(s.family))) R.chain = null;
    render(); pollDaw();
  } catch (e) {
    if (e instanceof NeedPair) return pairScreen();
    $('#app').innerHTML = '<div class="pair"><h1>PlugShelf Remote</h1><p>PlugShelf on the Mac does not answer. Is the app open and the iPad remote switched on?</p><button class="btn pri" onclick="location.reload()">Try again</button></div>';
  }
}
let lastW = innerWidth;
addEventListener('resize', () => { if (Math.abs(innerWidth - lastW) > 40) { lastW = innerWidth; render(); } });
start();
