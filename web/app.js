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
};
const CATS = {
  Synth: { de: 'Synthesizer', hue: 268, i: I.wave },
  Keys: { de: 'Keys & Piano', hue: 32, i: I.keys },
  Drums: { de: 'Drums', hue: 8, i: I.drum },
  Sampler: { de: 'Sampler', hue: 300, i: I.sampler },
  Instrument: { de: 'Instrumente', hue: 245, i: I.dot },
  EQ: { de: 'EQ', hue: 190, i: I.eq },
  Dynamics: { de: 'Dynamik', hue: 152, i: I.dyn },
  'Channel Strip': { de: 'Channel Strip', hue: 170, i: I.strip },
  Reverb: { de: 'Hall', hue: 222, i: I.verb },
  Delay: { de: 'Delay', hue: 205, i: I.delay },
  Modulation: { de: 'Modulation', hue: 320, i: I.mod },
  Distortion: { de: 'Sättigung', hue: 14, i: I.dist },
  Filter: { de: 'Filter', hue: 48, i: I.filter },
  Pitch: { de: 'Pitch', hue: 280, i: I.pitch },
  Vocal: { de: 'Vocals', hue: 340, i: I.mic },
  Spatial: { de: 'Stereo & Raum', hue: 236, i: I.spatial },
  Mastering: { de: 'Mastering', hue: 40, i: I.master },
  Analyzer: { de: 'Analyse', hue: 125, i: I.meter },
  Restoration: { de: 'Restauration', hue: 100, i: I.spark },
  Utility: { de: 'Werkzeuge', hue: 210, i: I.tool },
  MIDI: { de: 'MIDI', hue: 215, i: I.midi },
  Other: { de: 'Sonstige', hue: 220, i: I.dot },
};
const cat = c => CATS[c] || CATS.Other;
const svg = (body, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}">${body}</svg>`;
const FMT_LABEL = { VST3: 'VST3', VST: 'VST2', AU: 'AU', CLAP: 'CLAP', AAX: 'AAX' };
const KIND_DE = { inst: 'Instrument', fx: 'Effekt', midi: 'MIDI-Effekt' };
const SORTS = [['name', 'Name'], ['vendor', 'Hersteller'], ['cat', 'Kategorie'], ['used', 'Meist geladen'], ['recent', 'Zuletzt geladen'], ['new', 'Neu installiert'], ['size', 'Größe']];

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
  if (b >= 1e9) return (b / 1e9).toFixed(b >= 1e10 ? 0 : 1).replace('.', ',') + ' GB';
  if (b >= 1e6) return Math.round(b / 1e6) + ' MB';
  return Math.max(1, Math.round(b / 1e3)) + ' KB';
};
const fmtDate = t => t ? new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '–';
const ago = t => {
  if (!t) return 'nie';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? 'gestern' : `vor ${d} Tagen`;
};
const settings = () => S.user.settings;
const prefer = () => { const p = settings().prefer || ['VST3', 'AU', 'VST', 'CLAP']; return [...p, ...['VST3', 'AU', 'VST', 'CLAP'].filter(x => !p.includes(x))]; };
const fmtRank = f => { const i = prefer().indexOf(f); return i < 0 ? 9 : i; };
const native = p => !p.archs?.length || p.archs.includes('arm64') || S.lib?.machine !== 'arm64';

/* ---------- families ---------- */
function rebuild() {
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
      vendor: b.vendor || 'Unbekannt',
      kind: o.kind || b.kind,
      category: o.category || b.category,
      formats: [...new Set(items.map(p => p.format))].sort((x, y) => fmtRank(x) - fmtRank(y)),
      bytes: [...paths.values()].reduce((s, x) => s + x, 0),
      mtime: Math.max(...items.map(p => p.mtime || 0)),
    };
    f.loadable = items.some(p => p.format !== 'AAX' && p.status === 'ok');
    f.hay = [f.name, f.vendor, cat(f.category).de, f.category, KIND_DE[f.kind], ...f.formats.map(x => FMT_LABEL[x]), ...new Set(items.map(p => p.name)), S.user.notes?.[key] || ''].join(' ').toLowerCase();
    S.fams.push(f);
    S.famBy.set(key, f);
  }
  $('#tLib').textContent = S.fams.filter(f => showable(f)).length;
}

const showable = f => settings().showAAX || f.formats.some(x => x !== 'AAX');
const picsOn = () => settings().pics !== false;
/** Can PlugShelf open this plugin to take its picture? (VST3, AU or a non-shell VST2) */
const hostable = f => f.items.some(p => p.status === 'ok' && (p.format === 'VST3' || p.format === 'AU' || (p.format === 'VST' && !p.shell)));

/** The plugin to load for a family: preferred format first, native before Intel-only, Stereo before Mono. */
function pickItem(f, format, name) {
  const order = format ? [format] : prefer();
  const variant = p => (/stereo/i.test(p.name) ? 0 : /mono/i.test(p.name) ? 2 : 1) * 1000 + p.name.length;
  for (const needNative of [true, false]) {
    for (const fmt of order) {
      const c = f.items.filter(p => p.format === fmt && p.status === 'ok' && (!needNative || native(p)) && (!name || p.name === name));
      if (c.length) return c.sort((a, b) => variant(a) - variant(b))[0];
    }
  }
  return null;
}

/* ---------- filtering ---------- */
function passes(f, skip = '') {
  const F = S.f, u = S.user;
  if (!showable(f)) return false;
  const hidden = u.hidden.includes(f.key);
  if (F.coll === 'hidden' ? !hidden : hidden) return false;
  if (F.coll === 'favs' && !u.favs.includes(f.key)) return false;
  if (F.coll === 'recent' && !u.lastUsed[f.key]) return false;
  if (F.coll === 'new' && f.mtime < Date.now() - 30 * 864e5) return false;
  if (F.coll?.startsWith('c:')) {
    const c = u.collections.find(x => x.id === F.coll.slice(2));
    if (!c || !c.items.includes(f.key)) return false;
  }
  if (F.kind !== 'all' && f.kind !== F.kind) return false;
  if (skip !== 'cat' && F.cat && f.category !== F.cat) return false;
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
  const name = (a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
  if (S.f.q) return list.map(f => [score(f), f]).sort((a, b) => b[0] - a[0] || name(a[1], b[1])).map(x => x[1]);
  const cmp = {
    name,
    vendor: (a, b) => a.vendor.localeCompare(b.vendor, 'de', { sensitivity: 'base' }) || name(a, b),
    cat: (a, b) => cat(a.category).de.localeCompare(cat(b.category).de, 'de') || name(a, b),
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
  const favSvg = fav ? '<svg class="favmark" viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>' : '';
  const acts = `<div class="acts">
      <button data-act="fav" title="${fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}">${fav ? '★' : '☆'}</button>
      <button data-act="info" title="Details">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>')}</button>
      <button data-act="menu" title="Mehr">${svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}</button>
    </div>`;
  if (pic) {
    return `<div class="card pic${i === S.sel && (S.kbd || S.f.q) ? ' sel' : ''}${f.loadable ? '' : ' dead'}${extra}" data-k="${esc(f.key)}" data-i="${i}" draggable="true" style="--h:${c.hue}">
  <div class="face">
    <img class="bg" src="${esc(pic)}" alt="" loading="lazy" decoding="async"><img class="fg" src="${esc(pic)}" alt="" loading="lazy" decoding="async">
    <div class="cap"><div class="t"><b>${esc(f.name)}</b><small>${esc(f.vendor)}</small></div><span class="fmts">${fm.map(x => `<b>${FMT_LABEL[x]}</b>`).join('')}</span></div>
    <i class="led ${f.kind}" title="${KIND_DE[f.kind]}"></i>${favSvg}${acts}
  </div>
</div>`;
  }
  return `<div class="card${i === S.sel && (S.kbd || S.f.q) ? ' sel' : ''}${f.loadable ? '' : ' dead'}${extra}" data-k="${esc(f.key)}" data-i="${i}" draggable="true" style="--h:${c.hue}">
  <div class="face">
    <div class="fv">${esc(f.vendor)}</div>
    <div class="fn">${esc(f.name)}</div>
    <div class="ff"><span class="fc">${svg(c.i)}${esc(c.de)}</span><span class="fmts">${fm.map(x => `<b>${FMT_LABEL[x]}</b>`).join('')}</span></div>
    ${svg(c.i, 'wm')}
    <i class="led ${f.kind}" title="${KIND_DE[f.kind]}"></i>
    ${fav ? '<svg class="favmark" viewBox="0 0 24 24"><path d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>' : ''}
    <div class="acts">
      <button data-act="fav" title="${fav ? 'Aus Favoriten entfernen' : 'Zu Favoriten'}">${fav ? '★' : '☆'}</button>
      <button data-act="info" title="Details">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>')}</button>
      <button data-act="menu" title="Mehr">${svg('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>')}</button>
    </div>
  </div>
</div>`;
}

function renderLib() {
  if (!S.lib) {
    $('#grid').innerHTML = '';
    $('#side').innerHTML = '';
    showEmpty('<h3>Deine Plugins werden gescannt…</h3><p>Das dauert beim ersten Mal ein paar Sekunden.</p>');
    return;
  }
  renderSide();
  const list = sorted(S.fams.filter(f => passes(f)));
  S.list = list;
  if (S.sel >= list.length) S.sel = Math.max(0, list.length - 1);

  const F = S.f;
  let title = 'Alle Plugins';
  if (F.coll === 'favs') title = 'Favoriten';
  else if (F.coll === 'recent') title = 'Zuletzt geladen';
  else if (F.coll === 'new') title = 'Neu installiert (30 Tage)';
  else if (F.coll === 'hidden') title = 'Ausgeblendet';
  else if (F.coll?.startsWith('c:')) title = S.user.collections.find(x => x.id === F.coll.slice(2))?.name || 'Sammlung';
  const sub = [F.cat && cat(F.cat).de, F.maker].filter(Boolean);
  if (sub.length) title += ' · ' + sub.join(' · ');
  if (F.q) title = `Suche „${F.q}“`;
  $('#title').textContent = title;
  $('#count').textContent = `${list.length} ${list.length === 1 ? 'Plugin' : 'Plugins'}`;

  const fmts = ['VST3', 'AU', 'VST', 'CLAP', ...(settings().showAAX ? ['AAX'] : [])];
  $('#fmts').innerHTML = fmts.map(x => `<button class="chip${F.formats.has(x) ? ' on' : ''}" data-f="${x}">${FMT_LABEL[x]}</button>`).join('');
  $('#sort').innerHTML = SORTS.map(([k, l]) => `<option value="${k}"${k === F.sort ? ' selected' : ''}>${l}</option>`).join('');
  $('#zoom').value = settings().zoom || 190;

  // most-loaded shelf on the plain "all" view
  const top = Object.entries(S.user.usage).sort((a, b) => b[1] - a[1]).map(([k]) => S.famBy.get(k)).filter(f => f && showable(f) && !S.user.hidden.includes(f.key)).slice(0, 10);
  const plain = !F.q && !F.coll && !F.cat && !F.maker && !F.formats.size && F.kind === 'all';
  $('#shelfWrap').hidden = !(plain && top.length >= 3);
  if (!$('#shelfWrap').hidden) $('#shelf').innerHTML = top.map(f => cardHTML(f, -1)).join('');

  $('#grid').innerHTML = list.map((f, i) => cardHTML(f, i)).join('');
  if (!list.length) {
    if (F.q) showEmpty(`<h3>Nichts gefunden für „${esc(F.q)}“</h3><p>Andere Schreibweise, oder Filter in der Seitenleiste lösen.</p>`);
    else if (F.coll === 'favs') showEmpty('<h3>Noch keine Favoriten</h3><p>Fahr über eine Kachel und klick auf ☆ – oder ziehe sie auf „Favoriten“.</p>');
    else if (F.coll?.startsWith('c:')) showEmpty('<h3>Die Sammlung ist leer</h3><p>Ziehe Kacheln auf den Namen der Sammlung in der Seitenleiste.</p>');
    else if (F.coll === 'recent') showEmpty('<h3>Noch nichts geladen</h3><p>Klick auf eine Kachel lädt das Plugin auf die gewählte Spur in Live.</p>');
    else showEmpty('<h3>Keine Plugins für diese Filter</h3>');
  } else $('#empty').hidden = true;
  renderBanner();
}

function showEmpty(html) { $('#empty').innerHTML = html; $('#empty').hidden = false; }

function renderBanner() {
  const b = $('#banner');
  const need = S.script && (!S.script.installed || !S.script.current) && !S.daw.ok && !settings().bannerOff;
  b.hidden = !need;
  if (!need) return;
  b.innerHTML = `<div><b>${S.script.installed ? 'Neue Version des Live-Scripts' : 'Plugins direkt in Ableton laden'}</b> – ${S.script.installed ? 'bitte im Setup aktualisieren.' : 'dafür einmal das kleine Live-Script installieren.'}</div><div class="grow"></div><button class="btn sm pri" data-go="setup">Zum Setup</button><button class="x" data-banner-off title="Ausblenden">×</button>`;
}

function renderSide() {
  const u = S.user, F = S.f;
  const base = S.fams.filter(f => showable(f) && !u.hidden.includes(f.key));
  const it = (key, label, n, icon, extra = '') => `<button class="item${F.coll === key ? ' on' : ''}" data-coll="${key ?? ''}" ${extra}>${icon}<span class="t">${esc(label)}</span><span class="n">${n}</span></button>`;
  const newCount = base.filter(f => f.mtime >= Date.now() - 30 * 864e5).length;
  let h = `<h4>Bibliothek</h4>
    ${it(null, 'Alle Plugins', base.length, svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'))}
    ${it('favs', 'Favoriten', u.favs.filter(k => S.famBy.has(k)).length, svg('<path d="m12 3 2.6 5.5 6 .8-4.4 4.1 1.1 6L12 16.5l-5.3 2.9 1.1-6-4.4-4.1 6-.8z"/>'), 'data-drop="favs"')}
    ${it('recent', 'Zuletzt geladen', Object.keys(u.lastUsed).filter(k => S.famBy.has(k)).length, svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'))}
    ${newCount ? it('new', 'Neu installiert', newCount, svg('<path d="M12 3v18M3 12h18"/>')) : ''}
    ${u.hidden.length ? it('hidden', 'Ausgeblendet', u.hidden.length, svg('<path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 22 12a14 14 0 0 1-3 3.8M6.2 6.3A14 14 0 0 0 2 12s4 7 10 7a9.6 9.6 0 0 0 4.2-1"/>')) : ''}
    <h4>Typ</h4>
    <div class="seg">${[['all', 'Alle'], ['inst', 'Instr.'], ['fx', 'Effekte'], ['midi', 'MIDI']].map(([k, l]) => `<button data-kind="${k}" class="${F.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <h4><span>Sammlungen</span><button class="link" id="newColl">+ Neu</button></h4>`;
  if (!u.collections.length) h += '<div class="hint">Eigene Listen, z. B. „Vocal Chain“ oder „Mixbus“. Kacheln einfach hierher ziehen.</div>';
  for (const c of u.collections) {
    h += `<button class="item${F.coll === 'c:' + c.id ? ' on' : ''}" data-coll="c:${c.id}" data-drop="c:${c.id}" data-cmenu="${c.id}">${svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')}<span class="t">${esc(c.name)}</span><span class="n">${c.items.filter(k => S.famBy.has(k)).length}</span></button>`;
  }
  h += `<h4><span>Racks</span><button class="link" id="newRack">+ Neu</button></h4>`;
  if (!u.racks.length) h += '<div class="hint">Eine Kette aus Plugins, die mit einem Klick in dieser Reihenfolge auf die Spur kommt.</div>';
  for (const r of u.racks) {
    const on = S.drawer?.type === 'rack' && S.drawer.id === r.id;
    h += `<button class="item${on ? ' on' : ''}" data-rack="${r.id}" data-drop="r:${r.id}">${svg('<rect x="3" y="4" width="18" height="5" rx="1.5"/><rect x="3" y="11" width="18" height="5" rx="1.5"/><path d="M7 20h10"/>')}<span class="t">${esc(r.name)}</span><span class="n">${r.items.length}</span></button>`;
  }

  // categories (counted without the category filter itself)
  const cc = {};
  for (const f of S.fams) if (passes(f, 'cat')) cc[f.category] = (cc[f.category] || 0) + 1;
  h += '<h4>Kategorien</h4>';
  for (const k of Object.keys(CATS)) {
    if (!cc[k] && F.cat !== k) continue;
    h += `<button class="item${F.cat === k ? ' on' : ''}" data-cat="${k}" style="--h:${CATS[k].hue}"><i class="dot"></i><span class="t">${CATS[k].de}</span><span class="n">${cc[k] || 0}</span></button>`;
  }

  // makers
  const mc = {};
  for (const f of S.fams) if (passes(f, 'maker')) mc[f.vendor] = (mc[f.vendor] || 0) + 1;
  let makers = Object.entries(mc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (S.makerQ) makers = makers.filter(([m]) => m.toLowerCase().includes(S.makerQ.toLowerCase()));
  const cut = S.makersAll || S.makerQ ? makers : makers.slice(0, 14);
  if (F.maker && !cut.some(([m]) => m === F.maker)) cut.unshift([F.maker, mc[F.maker] || 0]);
  h += `<h4>Hersteller <span class="n" style="font-weight:600">${makers.length}</span></h4><input class="mini-input" id="makerQ" placeholder="Hersteller filtern" value="${esc(S.makerQ)}">`;
  h += cut.map(([m, n]) => `<button class="item${F.maker === m ? ' on' : ''}" data-maker="${esc(m)}"><span class="t">${esc(m)}</span><span class="n">${n}</span></button>`).join('');
  if (!S.makerQ && makers.length > 14) h += `<button class="link more" id="moreMakers">${S.makersAll ? 'Weniger zeigen' : `Alle ${makers.length} zeigen`}</button>`;

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
}

function archLabel(p) {
  if (!p.archs?.length) return '';
  if (p.archs.includes('arm64') && p.archs.includes('x86_64')) return '<span class="tag ok">Universal</span>';
  if (p.archs.includes('arm64')) return '<span class="tag ok">Apple Silicon</span>';
  return '<span class="tag warn">nur Intel</span>';
}

function renderInfo(d, f) {
  if (!f) { S.drawer = null; d.hidden = true; return; }
  const u = S.user, c = cat(f.category), fav = u.favs.includes(f.key);
  const rows = f.items.slice().sort((a, b) => fmtRank(a.format) - fmtRank(b.format) || a.name.localeCompare(b.name)).map(p => {
    const tags = [archLabel(p), p.status !== 'ok' ? `<span class="tag err">${esc(p.issue || 'defekt')}</span>` : '', p.liveFailed ? '<span class="tag warn">Live: Fehler</span>' : '', p.inLive === false ? '<span class="tag warn">nicht in Live</span>' : ''].join('');
    const canLoad = p.format !== 'AAX' && p.status === 'ok';
    return `<div class="frow"><span class="fm">${FMT_LABEL[p.format]}</span>
      <div><div class="nm">${esc(p.name)}${tags}</div><div class="meta">${esc(p.version || '–')} · ${fmtBytes(p.bytes)}${p.shell ? ' · Shell' : ''}</div><div class="meta">${esc(p.path)}</div></div>
      <div class="btns" style="flex-direction:column">${canLoad ? `<button class="btn sm" data-load="${p.id}">Laden</button>` : ''}<button class="btn sm" data-reveal="${esc(p.path)}">Finder</button></div></div>`;
  }).join('');
  const catOpts = Object.keys(CATS).map(k => `<option value="${k}"${k === f.category ? ' selected' : ''}>${CATS[k].de}</option>`).join('');
  const kindOpts = Object.entries(KIND_DE).map(([k, l]) => `<option value="${k}"${k === f.kind ? ' selected' : ''}>${l}</option>`).join('');
  d.innerHTML = `<div class="dhead"><h3>${esc(f.name)}</h3><button class="x" data-close>×</button></div>
  <div class="dbody">
    ${cardHTML(f, -2)}
    <div class="btns"><button class="btn pri" data-loadfam ${f.loadable ? '' : 'disabled'}>${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}In Live laden</button>
      <button class="btn" data-favfam>${fav ? '★ Favorit' : '☆ Favorit'}</button>
      <button class="btn" data-hidefam>${u.hidden.includes(f.key) ? 'Einblenden' : 'Ausblenden'}</button></div>
    <dl class="kv">
      <dt>Hersteller</dt><dd>${esc(f.vendor)}</dd>
      <dt>Kategorie</dt><dd><select data-setcat>${catOpts}</select></dd>
      <dt>Typ</dt><dd><select data-setkind>${kindOpts}</select></dd>
      <dt>Größe</dt><dd>${fmtBytes(f.bytes)}</dd>
      <dt>Installiert</dt><dd>${fmtDate(f.mtime)}</dd>
      <dt>Geladen</dt><dd>${u.usage[f.key] ? `${u.usage[f.key]}× · zuletzt ${ago(u.lastUsed[f.key])}` : 'noch nie'}</dd>
      <dt>Bild</dt><dd>${S.pics.thumbs[f.key] ? 'vorhanden' : S.pics.failed[f.key] ? `ging nicht – ${esc(S.pics.failed[f.key])}` : 'noch keins'}
        ${hostable(f) ? `<button class="btn sm" data-capfam style="margin-left:6px">${S.pics.thumbs[f.key] ? 'Neu aufnehmen' : 'Aufnehmen'}</button>` : ''}</dd>
    </dl>
    <div class="sect"><h5>Formate & Dateien</h5>${rows}</div>
    <div class="sect"><h5>Sammlungen</h5><div class="checks">${u.collections.map(col => `<label class="check"><input type="checkbox" data-incoll="${col.id}" ${col.items.includes(f.key) ? 'checked' : ''}> ${esc(col.name)}</label>`).join('') || '<span class="hint" style="padding:0">Noch keine Sammlungen.</span>'}</div></div>
    <div class="sect"><h5>Notiz</h5><textarea data-note placeholder="z. B. „gut auf Vocals, Preset Air“">${esc(u.notes[f.key] || '')}</textarea></div>
  </div>`;
}

function renderRack(d, r) {
  if (!r) { S.drawer = null; d.hidden = true; return; }
  const slots = r.items.map((it, i) => {
    const f = S.famBy.get(it.family);
    if (!f) return `<div class="slot" data-slot="${i}"><span class="num">${i + 1}</span><div class="t"><b>Nicht mehr installiert</b><small>${esc(it.family)}</small></div><button class="x" data-unslot="${i}">×</button></div>`;
    const fmts = f.formats.filter(x => x !== 'AAX');
    return `<div class="slot" data-slot="${i}" draggable="true" style="--h:${cat(f.category).hue}">
      <span class="grip" title="Ziehen zum Sortieren">⋮⋮</span><span class="num">${i + 1}</span><i class="sw"></i>
      <div class="t"><b>${esc(f.name)}</b><small>${esc(f.vendor)}</small></div>
      <select data-slotfmt="${i}" title="Format"><option value="">Auto</option>${fmts.map(x => `<option value="${x}"${it.format === x ? ' selected' : ''}>${FMT_LABEL[x]}</option>`).join('')}</select>
      <button class="x" data-unslot="${i}" title="Entfernen">×</button></div>`;
  }).join('');
  d.innerHTML = `<div class="dhead"><h3>Rack</h3><button class="x" data-close>×</button></div>
  <div class="dbody">
    <input class="field" data-rackname value="${esc(r.name)}" placeholder="Name des Racks">
    <div class="btns"><button class="btn pri" data-loadrack ${r.items.length ? '' : 'disabled'}>${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Rack in Live laden</button><button class="btn danger" data-delrack>Löschen</button></div>
    <div class="slots" id="slots">${slots || ''}</div>
    <div class="dropzone" id="rackDrop">Plugins aus der Bibliothek hierher ziehen<br>oder per Rechtsklick → „Zu Rack“</div>
    <p class="hint" style="padding:0">Die Plugins kommen in dieser Reihenfolge auf die gewählte Spur in Live, hinter das gewählte Gerät.</p>
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
    .map(p => ({ p, why: 'VST2-Kopie – das VST3 ist auch da' }));
  const aax = S.lib?.proTools ? [] : files.filter(p => p.format === 'AAX').map(p => ({ p, why: 'nur für Pro Tools' }));
  const intel = S.lib?.machine === 'arm64' ? files.filter(p => p.archs?.length && !p.archs.includes('arm64') && p.format !== 'AAX').map(p => ({ p, why: 'nur Intel – läuft nicht nativ auf Apple Silicon' })) : [];
  const broken = files.filter(p => p.status !== 'ok' && p.format !== 'AAX').map(p => ({ p, why: p.issue }));
  const brokenAax = files.filter(p => p.status !== 'ok' && p.format === 'AAX');
  const liveFail = files.filter(p => p.liveFailed).map(p => ({ p, why: 'Live hat die Datei gescannt, aber kein Plugin darin gefunden' }));
  const notInLive = S.lib?.liveDB ? files.filter(p => (p.format === 'VST3' || p.format === 'VST') && p.inLive === false).map(p => ({ p, why: 'Live hat diese Datei noch nicht gescannt' })) : [];
  const biggest = files.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 20).map(p => ({ p, why: '' }));
  const sum = a => a.reduce((s, x) => s + x.p.bytes, 0);
  const reclaim = new Map();
  for (const x of [...dup, ...aax, ...broken]) reclaim.set(x.p.path, x.p.bytes);
  return { files, total, dup, aax, intel, broken, brokenAax, liveFail, notInLive, biggest, sum, fname, reclaim: [...reclaim.values()].reduce((s, b) => s + b, 0) };
}

function renderHealth() {
  const el = $('#health');
  if (!S.lib) { el.innerHTML = '<div class="empty"><h3>Noch kein Scan</h3></div>'; return; }
  const H = healthData();
  const issues = H.intel.length + H.broken.length;
  $('#tHealth').textContent = issues || '✓';
  const tile = (id, label, val, sub, cls = '') => `<button class="tile ${cls}" data-jump="${id}"><small>${label}</small><b>${val}</b><span>${sub}</span></button>`;
  const vstNotInLive = H.notInLive.filter(x => x.p.format === 'VST').length;
  const vstTotal = H.files.filter(p => p.format === 'VST').length;
  const sec = (id, title, items, why, open = false, showWhy = false) => {
    if (!items.length) return '';
    return `<section class="hsec${open ? ' open' : ''}" id="h-${id}"><header data-toggle>${svg('<path d="m9 6 6 6-6 6"/>')}<h2>${title}</h2><span class="count">${items.length} · ${fmtBytes(H.sum(items))}</span></header>
      <p class="why">${why}</p>
      <table><thead><tr><th>Plugin</th><th>Format</th><th>Hersteller</th>${showWhy ? '<th>Grund</th>' : ''}<th style="text-align:right">Größe</th><th>Pfad</th><th></th></tr></thead><tbody>
      ${items.map(({ p, why: w }) => `<tr><td>${esc(H.fname(p))}</td><td><span class="fm">${FMT_LABEL[p.format]}</span></td><td>${esc(p.vendor)}</td>${showWhy ? `<td>${esc(w)}</td>` : ''}<td class="num">${fmtBytes(p.bytes)}</td><td class="p" title="${esc(p.path)}">${esc(p.path)}</td><td><button class="btn sm" data-reveal="${esc(p.path)}">Finder</button></td></tr>`).join('')}
      </tbody></table></section>`;
  };
  el.innerHTML = `<h1>Health</h1>
  <p class="lead">Was auf deinem Mac an Plugins liegt, wo doppelt Platz verbraucht wird und was Live nicht laden kann. PlugShelf löscht nichts – „Finder“ zeigt die Datei, entscheiden tust du.</p>
  <div class="tiles">
    ${tile('biggest', 'Plugins gesamt', fmtBytes(H.total), `${H.files.length} Dateien`)}
    ${tile('dup', 'Freizugeben', fmtBytes(H.reclaim), 'Doppelte, AAX ohne Pro Tools, Defekte', H.reclaim > 1e9 ? 'warn' : '')}
    ${tile('dup', 'VST2 neben VST3', H.dup.length, fmtBytes(H.sum(H.dup)), H.dup.length ? 'warn' : 'good')}
    ${tile('aax', 'AAX ohne Pro Tools', H.aax.length, fmtBytes(H.sum(H.aax)), H.aax.length ? 'warn' : 'good')}
    ${tile('intel', 'Nur Intel', H.intel.length, 'braucht Rosetta', H.intel.length ? 'err' : 'good')}
    ${tile('broken', 'Defekt', H.broken.length, 'Bundle unvollständig', H.broken.length ? 'err' : 'good')}
    ${tile('livefail', 'Live: Fehler', H.liveFail.length, 'beim Scan in Live', H.liveFail.length ? 'err' : 'good')}
    ${tile('notinlive', 'Nicht in Live', H.notInLive.length, 'noch nicht gescannt', H.notInLive.length ? 'warn' : 'good')}
  </div>
  ${sec('dup', 'VST2-Kopien neben einem VST3', H.dup, 'Von diesen Plugins ist auch die VST3-Version installiert. Live nimmt in der Regel VST3; die VST2-Datei brauchst du nur noch für alte Projekte, die sie verwenden.', true)}
  ${sec('aax', 'AAX ohne Pro Tools', H.aax, 'AAX-Plugins laufen nur in Pro Tools – und Pro Tools ist auf diesem Mac nicht installiert. Sie liegen unter /Library/Application Support/Avid/Audio/Plug-Ins.' + (H.brokenAax.length ? ` ${H.brokenAax.length} davon sind zudem unvollständig.` : ''))}
  ${sec('intel', 'Nur für Intel-Macs', H.intel, 'Diese Plugins enthalten kein Apple-Silicon-Programm. Live lädt sie nur, wenn es selbst unter Rosetta läuft. Ein Update beim Hersteller behebt das meist.', true)}
  ${sec('broken', 'Defekte Bundles', H.broken, 'Hier fehlt die Programmdatei oder die Info.plist – oft Reste einer Deinstallation oder eines abgebrochenen Updates.', true, true)}
  ${sec('livefail', 'Live konnte nichts damit anfangen', H.liveFail, 'Live hat diese Dateien gescannt und kein brauchbares Plugin darin gefunden (z. B. abgelaufene Lizenz, fehlende Autorisierung, nur Intel).', true)}
  ${sec('notinlive', 'Noch nicht in Live', H.notInLive, vstTotal && vstNotInLive > vstTotal * 0.6
    ? `Die meisten VST2-Plugins fehlen in Live – vermutlich ist in Live unter Einstellungen → Plug-Ins „VST2-Plug-in-Systemordner verwenden“ aus. Für VST3 hilft „Neu scannen“ in Live.`
    : 'Diese Dateien kennt Live noch nicht. In Live unter Einstellungen → Plug-Ins „Neu scannen“ wählen.')}
  ${sec('biggest', 'Die größten Plugins', H.biggest, 'Viel Platz steckt oft in Instrumenten mit eingebauten Samples.')}`;
}

/* ---------- setup ---------- */
async function renderSetup() {
  const el = $('#setup');
  const st = S.script || {};
  const lib = S.lib;
  const order = prefer();
  el.innerHTML = `<h1>Setup</h1><p class="lead">Einmal einrichten, dann landet jedes Plugin mit einem Klick auf der gewählten Spur in Ableton Live.</p>
  <div class="setgrid">
    <div class="box">
      <h2>Ableton Live ${S.daw.ok ? '<span class="tag ok">verbunden</span>' : '<span class="tag">nicht verbunden</span>'}</h2>
      <p>PlugShelf spricht mit Live über ein kleines Control-Surface-Script in deiner User Library.</p>
      <ol class="steps">
        <li>Script installieren ${st.installed ? (st.current ? '<span class="tag ok">installiert</span>' : '<span class="tag warn">veraltet</span>') : '<span class="tag">fehlt</span>'}</li>
        <li><b>Live neu starten</b> (nur beim ersten Mal)</li>
        <li>In Live: <b>Einstellungen → Link, Tempo & MIDI → Control Surface</b> → <b>PlugShelf</b> wählen (Ein- und Ausgang: Keine)</li>
        <li>Verbindung testen</li>
      </ol>
      <div class="btns"><button class="btn pri" id="install">${st.installed ? 'Script aktualisieren' : 'Script installieren'}</button><button class="btn" id="testLive">Verbindung testen</button></div>
      <p class="hint" style="padding:10px 0 0">${st.target ? `Ziel: <span class="code">${esc(st.target)}</span>` : 'Keine User Library gefunden – ist Ableton Live installiert?'}</p>
      ${S.daw.msg ? `<p class="hint" style="padding:4px 0 0">Live meldet: ${esc(S.daw.msg)}</p>` : ''}
    </div>
    <div class="box">
      <h2>Format-Reihenfolge</h2>
      <p>Gibt es ein Plugin in mehreren Formaten, lädt ein Klick das erste verfügbare in dieser Reihenfolge.</p>
      <div class="order">${order.map((x, i) => `<div class="o"><span class="num">${i + 1}</span><b>${FMT_LABEL[x]}</b><button class="btn sm" data-up="${i}" ${i ? '' : 'disabled'}>↑</button><button class="btn sm" data-down="${i}" ${i < order.length - 1 ? '' : 'disabled'}>↓</button></div>`).join('')}</div>
      <label class="check"><input type="checkbox" id="showAAX" ${settings().showAAX ? 'checked' : ''}> AAX-Plugins in der Bibliothek zeigen (lädt nur Pro Tools)</label>
    </div>
    ${picsBox()}
    <div class="box">
      <h2>Scan</h2>
      <p>${lib ? `Zuletzt gescannt ${ago(lib.scannedAt)} – ${lib.plugins.length} Einträge in ${new Set(lib.plugins.map(p => p.path)).size} Dateien. ${lib.liveDB ? 'Ableton-Plugin-Datenbank gelesen.' : 'Keine Ableton-Plugin-Datenbank gefunden.'}` : 'Noch nicht gescannt.'}</p>
      <div class="btns"><button class="btn" id="scanNow">Neu scannen</button></div>
      <p class="hint" style="padding:10px 0 0">Durchsuchte Ordner:</p>
      ${(lib?.roots || []).map(r => `<div class="hint" style="padding:1px 0"><span class="code">${esc(r)}</span></div>`).join('')}
    </div>
    <div class="box">
      <h2>Tastatur</h2>
      <div class="keys">
        <kbd>/</kbd><span>Suche</span>
        <kbd>↑ ↓ ← →</kbd><span>Kachel wählen</span>
        <kbd>Enter</kbd><span>gewählte Kachel in Live laden</span>
        <kbd>Esc</kbd><span>Suche leeren / Seitenleiste schließen</span>
        <kbd>F5</kbd><span>Neu scannen</span>
        <kbd>Ctrl + Mausrad</kbd><span>Kachelgröße</span>
        <kbd>Rechtsklick</kbd><span>Formate, Sammlungen, Racks, Finder</span>
      </div>
      <p class="hint" style="padding:12px 0 0">Deine Daten: <span class="code">${esc(S.info?.data || '')}</span></p>
    </div>
  </div>`;
}

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
    <h2>Plugin-Bilder</h2>
    <p>PlugShelf öffnet jedes Plugin kurz in einem kleinen Fenster unten rechts auf dem Bildschirm und fotografiert es – etwa 2 bis 6 Sekunden pro Plugin. Jedes läuft in einem eigenen Prozess: stürzt eins ab, passiert der App nichts.</p>
    <div class="picstats"><div><b>${c.have.length}</b><small>mit Bild</small></div><div><b>${c.missing.length}</b><small>fehlen</small></div><div><b>${c.failed.length}</b><small>ging nicht</small></div>${c.impossible.length ? `<div><b>${c.impossible.length}</b><small>nur AAX/CLAP</small></div>` : ''}</div>
    <div class="btns">
      <button class="btn pri" id="capMissing" ${c.missing.length && !running ? '' : 'disabled'}>Fehlende aufnehmen (${c.missing.length})</button>
      ${c.failed.length ? `<button class="btn" id="capFailed" ${running ? 'disabled' : ''}>Erneut versuchen (${c.failed.length})</button>` : ''}
      ${S.rone ? `<button class="btn" id="roneImport">${S.rone} Bilder aus RONE VST MANAGER übernehmen</button>` : ''}
    </div>
    ${S.rone ? '<p class="hint" style="padding:8px 0 0">RONE VST MANAGER hat auf diesem Mac schon Bilder deiner Plugins gemacht. PlugShelf kann seine eigenen Aufnahmen davon übernehmen.</p>' : ''}
    <label class="check" style="margin-top:12px"><input type="checkbox" id="picsOn" ${picsOn() ? 'checked' : ''}> Bilder auf den Kacheln zeigen</label>
    ${c.failed.length ? `<details class="fails"><summary>Ging nicht (${c.failed.length})</summary><ul>${c.failed.map(f => `<li><b>${esc(f.name)}</b><span>${esc(S.pics.failed[f.key])}</span></li>`).join('')}</ul></details>` : ''}
    <p class="hint" style="padding:10px 0 0">Zeigt ein Plugin nur sein Aktivierungsfenster: Rechtsklick auf die Kachel → „Bild entfernen“ oder „Bild neu aufnehmen“.</p>
  </div>`;
}

async function capture(keys) {
  if (!keys.length) return;
  let r;
  try { r = await api.post('/api/capture', { families: keys }); } catch { r = { ok: false, msg: 'PlugShelf antwortet nicht' }; }
  if (!r.ok) return toast(r.msg || 'Aufnahme nicht möglich', 'err');
  if (!r.queued) return toast('Dieses Plugin lässt sich nicht öffnen (nur AAX oder CLAP).', 'err');
  if (keys.length > 1) toast(`${r.queued} Plugins werden fotografiert – unten rechts öffnen sich kurz ihre Fenster.`, 'ok');
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
    $('#capText').textContent = `Bilder: ${c.done} von ${c.total}${c.current ? ' – ' + c.current : ''}${c.failed ? ` · ${c.failed} ging nicht` : ''}`;
    capTimer = setTimeout(watchCapture, 1200);
  } else {
    bar.hidden = true;
    if (wasRunning) {
      if (c.total === 1) toast(c.ok ? `Bild von ${c.current || S.famBy.get(changed[0])?.name || 'Plugin'} aufgenommen` : `Kein Bild: ${Object.values(S.pics.failed).slice(-1)[0] || 'ging nicht'}`, c.ok ? 'ok' : 'err');
      else toast(`${c.ok} Bilder aufgenommen${c.failed ? `, ${c.failed} gingen nicht` : ''}.`, 'ok');
    }
  }
  if (S.view === 'setup' && wasRunning !== c.running) renderSetup();
}

/* ---------- actions ---------- */
let saveT;
function saveUser() {
  clearTimeout(saveT);
  saveT = setTimeout(() => api.post('/api/user', S.user), 250);
}

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
  setTimeout(() => t.remove(), kind === 'err' ? 6500 : 3200);
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
  const p = pickItem(f, format, name);
  if (!p) return toast(`${f.name}: keine Version, die Live laden kann (nur AAX oder defekt).`, 'err');
  flash(f.key);
  let r;
  try { r = await api.post('/api/load', { ids: [p.id] }); } catch { r = { ok: false, msg: 'PlugShelf antwortet nicht' }; }
  if (r.ok) {
    applyUsage(r);
    toast(r.msg || `${f.name} geladen`, 'ok');
    if (S.f.sort === 'used' || S.f.sort === 'recent' || S.f.coll === 'recent') renderLib();
  } else {
    toast(r.msg || 'Laden fehlgeschlagen', 'err', r.offline ? { label: 'Setup öffnen', fn: () => show('setup') } : null);
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
  if (!ids.length) return toast('Nichts in diesem Rack lässt sich laden.', 'err');
  let res;
  try { res = await api.post('/api/load', { ids }); } catch { res = { ok: false, msg: 'PlugShelf antwortet nicht' }; }
  if (res.ok) {
    applyUsage(res);
    toast((res.msg || `${r.name} geladen`) + (missing.length ? ` – übersprungen: ${missing.join(', ')}` : ''), 'ok');
  } else toast(res.msg || 'Laden fehlgeschlagen', 'err', res.offline ? { label: 'Setup öffnen', fn: () => show('setup') } : null);
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
  if (i < 0) toast(`${f?.name} ausgeblendet`, '', { label: 'Rückgängig', fn: () => toggleHidden(key) });
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
  const name = await ask('Neue Sammlung', 'z. B. Vocal Chain, Mixbus, Lieblings-Synths');
  if (!name) return;
  const c = { id: uid(), name, items: addKey ? [addKey] : [] };
  S.user.collections.push(c);
  saveUser(); renderLib();
}

async function newRack(addKey) {
  const name = await ask('Neues Rack', 'Plugins, die zusammen auf eine Spur kommen, z. B. „Vocal Chain“');
  if (!name) return;
  const r = { id: uid(), name, items: addKey ? [{ family: addKey, format: null }] : [] };
  S.user.racks.push(r);
  S.drawer = { type: 'rack', id: r.id };
  saveUser(); renderLib(); renderDrawer();
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
  const loadables = f.items.filter(p => p.format !== 'AAX' && p.status === 'ok').sort((a, b) => fmtRank(a.format) - fmtRank(b.format) || a.name.localeCompare(b.name));
  const inColl = S.f.coll?.startsWith('c:') ? u.collections.find(c => c.id === S.f.coll.slice(2)) : null;
  menu(x, y, [
    { label: 'In Live laden', bold: true, disabled: !f.loadable, fn: () => loadFam(f) },
    ...(loadables.length > 1 ? [{ label: 'Laden als', sub: loadables.map(p => ({ label: p.name === f.name ? FMT_LABEL[p.format] : `${FMT_LABEL[p.format]} · ${p.name}`, hint: native(p) ? '' : 'Intel', fn: () => loadFam(f, p.format, p.name) })) }] : []),
    '-',
    { label: u.favs.includes(f.key) ? 'Aus Favoriten entfernen' : 'Zu Favoriten', fn: () => toggleFav(f.key) },
    { label: 'Zu Sammlung', sub: [...u.collections.map(c => ({ label: c.name, hint: c.items.includes(f.key) ? '✓' : '', fn: () => addToColl(c.id, f.key) })), ...(u.collections.length ? ['-'] : []), { label: 'Neue Sammlung…', fn: () => newColl(f.key) }] },
    ...(inColl ? [{ label: `Aus „${inColl.name}“ entfernen`, fn: () => { inColl.items = inColl.items.filter(k => k !== f.key); saveUser(); renderLib(); } }] : []),
    { label: 'Zu Rack', sub: [...u.racks.map(r => ({ label: r.name, hint: `${r.items.length}`, fn: () => addToRack(r.id, f.key) })), ...(u.racks.length ? ['-'] : []), { label: 'Neues Rack…', fn: () => newRack(f.key) }] },
    '-',
    { label: 'Details', fn: () => openInfo(f.key) },
    { label: 'Im Finder zeigen', fn: () => reveal((pickItem(f) || f.items[0]).path) },
    ...(hostable(f) ? [{ label: S.pics.thumbs[f.key] ? 'Bild neu aufnehmen' : 'Bild aufnehmen', fn: () => capture([f.key]) }] : []),
    ...(S.pics.thumbs[f.key] ? [{ label: 'Bild entfernen', fn: () => deleteThumbs([f.key]) }] : []),
    { label: u.hidden.includes(f.key) ? 'Wieder einblenden' : 'Ausblenden', fn: () => toggleHidden(f.key) },
  ]);
}

function ask(title, hint, value = '') {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg"><h3>${esc(title)}</h3>${hint ? `<p>${esc(hint)}</p>` : ''}<input class="field" id="askIn" value="${esc(value)}"><div class="btns"><button class="btn" data-no>Abbrechen</button><button class="btn pri" data-yes>OK</button></div></div>`;
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

function confirmDlg(title, text, yes = 'Löschen') {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="dlg"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="btns"><button class="btn" data-no>Abbrechen</button><button class="btn pri" data-yes>${esc(yes)}</button></div></div>`;
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
  for (const id of ['lib', 'health', 'setup']) $('#v-' + id).hidden = id !== v;
  if (v === 'lib') renderLib();
  if (v === 'health') renderHealth();
  if (v === 'setup') { renderSetup(); Promise.all([refreshScript(), refreshRone()]).then(() => S.view === 'setup' && renderSetup()); }
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
  $('span', el).textContent = r.ok ? `${r.msg || 'Live'} · verbunden` : 'Live nicht verbunden';
  el.title = r.ok ? 'Plugins landen auf der gewählten Spur in Live' : (r.msg || '');
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
    $('#scanText').textContent = s.total ? `${s.phase} – ${s.done} von ${s.total}` : s.phase || 'Scanne…';
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
        toast(added ? `Scan fertig – ${added} neue Plugins` : 'Scan fertig – nichts Neues', 'ok', added ? { label: 'Zeigen', fn: () => { S.f = { ...S.f, coll: 'new', q: '', cat: null, maker: null }; $('#q').value = ''; show('lib'); } } : null);
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
  $('#picsToggle').onclick = () => { settings().pics = !picsOn(); saveUser(); $('#picsToggle').classList.toggle('on', picsOn()); renderLib(); renderDrawer(); };
  $('#capStop').onclick = () => api.post('/api/capture/cancel');
  $('#zoom').oninput = e => setZoom(+e.target.value);
  $('#fmts').onclick = e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    const f = b.dataset.f;
    S.f.formats.has(f) ? S.f.formats.delete(f) : S.f.formats.add(f);
    renderLib();
  };
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
    if (t.id === 'newRack') return newRack();
    if (t.id === 'moreMakers') { S.makersAll = !S.makersAll; return renderSide(); }
    if (t.dataset.kind) { S.f.kind = t.dataset.kind; S.sel = 0; return renderLib(); }
    if (t.dataset.rack) {
      S.drawer = S.drawer?.type === 'rack' && S.drawer.id === t.dataset.rack ? null : { type: 'rack', id: t.dataset.rack };
      renderSide(); return renderDrawer();
    }
    if ('coll' in t.dataset) { S.f.coll = t.dataset.coll || null; S.sel = 0; $('#main').scrollTop = 0; return renderLib(); }
    if (t.dataset.cat) { S.f.cat = S.f.cat === t.dataset.cat ? null : t.dataset.cat; S.sel = 0; $('#main').scrollTop = 0; return renderLib(); }
    if (t.dataset.maker) { S.f.maker = S.f.maker === t.dataset.maker ? null : t.dataset.maker; S.sel = 0; $('#main').scrollTop = 0; return renderLib(); }
  });
  side.addEventListener('input', e => { if (e.target.id === 'makerQ') { S.makerQ = e.target.value; renderSide(); } });
  side.addEventListener('contextmenu', e => {
    const c = e.target.closest('[data-cmenu]'), r = e.target.closest('[data-rack]');
    if (c) {
      e.preventDefault();
      const col = S.user.collections.find(x => x.id === c.dataset.cmenu);
      menu(e.clientX, e.clientY, [
        { label: 'Umbenennen…', fn: async () => { const n = await ask('Sammlung umbenennen', '', col.name); if (n) { col.name = n; saveUser(); renderLib(); } } },
        { label: 'Löschen', fn: async () => { if (await confirmDlg(`„${col.name}“ löschen?`, 'Die Plugins selbst bleiben natürlich installiert.')) { S.user.collections = S.user.collections.filter(x => x !== col); if (S.f.coll === 'c:' + col.id) S.f.coll = null; saveUser(); renderLib(); } } },
      ]);
    } else if (r) {
      e.preventDefault();
      const rack = S.user.racks.find(x => x.id === r.dataset.rack);
      menu(e.clientX, e.clientY, [
        { label: 'In Live laden', bold: true, disabled: !rack.items.length, fn: () => loadRack(rack) },
        { label: 'Bearbeiten', fn: () => { S.drawer = { type: 'rack', id: rack.id }; renderSide(); renderDrawer(); } },
        { label: 'Löschen', fn: () => deleteRack(rack) },
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
    if (d === 'favs') { if (!S.user.favs.includes(key)) toggleFav(key); toast(`${S.famBy.get(key)?.name} → Favoriten`, 'ok'); }
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
      loadFam(f);
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
  if (!(await confirmDlg(`Rack „${rack.name}“ löschen?`, 'Die Plugins bleiben installiert, nur die Kette verschwindet.'))) return;
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
    const j = e.target.closest('[data-jump]');
    if (j) { const s = $('#h-' + j.dataset.jump); if (s) { s.classList.add('open'); s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
  });
  $('#setup').addEventListener('click', async e => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'install') {
      const r = await api.post('/api/ableton/install');
      toast(r.msg, r.ok ? 'ok' : 'err');
      await refreshScript(); renderSetup(); renderBanner();
    }
    if (t.id === 'testLive') {
      await pollDaw();
      toast(S.daw.ok ? `Verbunden: ${S.daw.msg}` : (S.daw.msg || 'Keine Antwort von Live'), S.daw.ok ? 'ok' : 'err');
      renderSetup();
    }
    if (t.id === 'scanNow') { startScan(); }
    if (t.id === 'capMissing') capture(picCounts().missing.map(f => f.key));
    if (t.id === 'capFailed') capture(picCounts().failed.map(f => f.key));
    if (t.id === 'roneImport') {
      t.disabled = true;
      const r = await api.post('/api/thumbs/rone');
      toast(`${r.imported} Bilder übernommen`, 'ok');
      await watchCapture();
      await refreshRone();
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
  try { await loadState(); } catch (e) { showEmpty(`<h3>PlugShelf antwortet nicht</h3><p>${esc(e.message)}</p>`); return; }
  if (settings().onTop && window.__plugshelfApp) { $('#pin').classList.add('on'); api.post('/api/window', { onTop: true }); }
  watchScan();
  $('#picsToggle').classList.toggle('on', picsOn());
  watchCapture();
  await refreshScript();
  renderBanner();
  pollDaw();
  setInterval(pollDaw, 4000);
})();
