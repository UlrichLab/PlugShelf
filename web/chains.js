'use strict';
/* PlugShelf – Chains tab. A chain is a typical signal flow (from chain-data.js) whose slots are
   filled with plugins from the library. Two dice:
   - "Roll plugins": same modules, every unlocked slot gets another plugin of the same kind.
   - "New chain": a new layout from the chosen category, then filled at random. */

const C = { rubric: 'all', chain: null, history: [], building: false, buildText: '' };
// Ableton rack export (.adg with macros). The format follows a rack Live 12.4 saved itself;
// set to false to fall back to loading the chain's plugins one by one.
const RACK_EXPORT = true;

// UA Console's channel-strip presets on this Mac become chains under "UAD Chains" (see chain-ua.js).
api.get('/api/uapresets').then(list => {
  uaRegister(list);
  roleCache = null;
  if (S.view === 'chains') renderChains();
}).catch(() => {});
let roleCache = null;

const DICE = '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/></svg>';
const LOCK = on => on
  ? '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
  : '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/></svg>';

// The library changed (rescan, category fixes, AAX switch): role lists must be rebuilt.
const _rebuildLibrary = rebuild;
rebuild = function () { _rebuildLibrary(); roleCache = null; };

function chainFam(f) {
  return { name: f.name, vendor: f.vendor, category: f.category, kind: f.kind, names: [...new Set(f.items.map(p => p.name))] };
}

/** Plugins the rack builder could not open (crash, licence): not picked for chains any more. */
const rackBad = () => new Set(settings().rackBad || []);
function noteUnusable(keys) {
  const add = (keys || []).filter(k => !(settings().rackBad || []).includes(k));
  if (!add.length) return;
  settings().rackBad = [...(settings().rackBad || []), ...add];
  roleCache = null;
  saveUser();
}

/** role -> family keys of loadable, visible effect plugins that fit it */
function roleIndex() {
  const sig = S.user.hidden.join(',') + '|' + settings().showAAX + '|' + (settings().rackBad || []).length;
  if (roleCache && roleCache.sig === sig) return roleCache.map;
  // only plugins that can go into the Ableton rack (VST3) – Live's own devices cannot
  const bad = rackBad();
  const fx = S.fams.filter(f => f.loadable && showable(f) && !S.user.hidden.includes(f.key) && !bad.has(f.key) && f.kind !== 'inst' && f.items.some(p => p.format === 'VST3' && usable(p)));
  const map = {};
  for (const r of Object.keys(CHAIN_ROLES)) map[r] = fx.filter(f => chainRoleFits(r, chainFam(f))).map(f => f.key);
  // instruments: an Instrument Rack needs the VST3
  map.inst = S.fams.filter(f => f.loadable && showable(f) && !S.user.hidden.includes(f.key) && !bad.has(f.key) && f.kind === 'inst'
    && f.items.some(p => p.format === 'VST3' && usable(p))).map(f => f.key);
  roleCache = { sig, map };
  return map;
}

function slotWeight(key, slot) {
  const f = S.famBy.get(key);
  if (!f) return 0;
  let w = 1;
  if (slot.prefer && new RegExp(slot.prefer, 'i').test([f.name, ...f.items.map(p => p.name)].join(' '))) w *= 4;
  if (S.user.favs.includes(key)) w *= 2.5;
  if (slot.favor && new RegExp(slot.favor, 'i').test(f.vendor + ' ' + f.name)) w *= 4;
  if ((slot.role === 'eq' || slot.role === 'dyneq') && isTopEq(f)) w *= 3;
  if (S.user.usage[key]) w *= 1.3;
  return w;
}

const famText = f => [f.vendor, f.name, ...f.items.map(p => p.name)].join(' ');

/** EQs the user prefers: FabFilter Pro-Q 4 and the Weiss EQs – first in every EQ list. */
const TOP_EQ = /pro-?q ?4|weiss eq/i;
const isTopEq = f => !!f && TOP_EQ.test(f.name);
/** An older FabFilter version (Pro-Q 3) gives way to the newest one installed (Pro-Q 4). */
function newestOnly(keys) {
  const base = n => n.toLowerCase().replace(/^fabfilter\s+/, '').replace(/\s*\d+$/, '');
  const ver = n => +(n.match(/(\d+)$/) || [0, 0])[1];
  const best = new Map();
  for (const k of keys) { const f = S.famBy.get(k); if (!f || f.vendor !== 'FabFilter') continue; const b = base(f.name); if (!best.has(b) || ver(f.name) > ver(S.famBy.get(best.get(b)).name)) best.set(b, k); }
  return keys.filter(k => { const f = S.famBy.get(k); return !f || f.vendor !== 'FabFilter' || best.get(base(f.name)) === k; });
}

/** Plugins in the library that emulate the slot's named hardware (any role), e.g. every 1176 model. */
function deviceMatches(slot) {
  if (!slot.device) return [];
  const re = new RegExp(slot.device, 'i');
  // Surround versions (Waves 360, 5.1) never stand in for stereo hardware.
  return S.fams.filter(f => f.loadable && f.kind !== 'inst' && showable(f) && !S.user.hidden.includes(f.key)
    && f.items.some(p => p.format === 'VST3' && usable(p)) && !rackBad().has(f.key)
    && re.test(famText(f)) && !/\b360\b|\b5\.[01]\b|\blfe/i.test(famText(f))).map(f => f.key);
}

/** Does the plugin in this slot stand in for the named hardware rather than emulate it? */
function isSubstitute(slot, f) {
  return !!(slot.device && f && !new RegExp(slot.device, 'i').test(famText(f)));
}

/** A random plugin for a slot, weighted towards plugins made for the job; avoids `exclude`.
    A slot that names hardware takes an emulation of it whenever there is one. */
function pickForSlot(slot, exclude) {
  const dev = newestOnly(deviceMatches(slot).filter(k => !exclude.has(k)));
  if (dev.length) {
    // The plugin named exactly like the slot (e.g. "Weiss DS1-MK3") is the one meant; other emulations get a chance.
    const norm = x => String(x).toLowerCase().replace(/[^a-z0-9]/g, '');
    const lbl = norm(slot.label);
    const exact = k => { const n = norm(S.famBy.get(k).name); return n.length > 3 && (lbl.includes(n) || n.includes(lbl)); };
    const ws = dev.map(k => slotWeight(k, slot) * (exact(k) ? 8 : 1));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < dev.length; i++) { r -= ws[i]; if (r <= 0) return dev[i]; }
    return dev[dev.length - 1];
  }
  const all = (roleIndex()[slot.role] || []).filter(k => S.famBy.has(k));
  let pool = newestOnly(all.filter(k => !exclude.has(k)));
  if (!pool.length) pool = all.filter(k => k !== slot.family);
  if (!pool.length) return slot.family || null;
  // A slot that names a maker (the UAD chains) picks from that maker's plugins whenever there are any.
  if (slot.only) {
    const re = new RegExp(slot.only, 'i');
    const own = pool.filter(k => { const f = S.famBy.get(k); return re.test(f.vendor + ' ' + f.name); });
    if (own.length) pool = own;
  }
  // Mostly stay true to the slot's style (a "fast" compressor is usually a 1176 type), sometimes surprise.
  if (slot.prefer) {
    const re = new RegExp(slot.prefer, 'i');
    const styled = pool.filter(k => { const f = S.famBy.get(k); return re.test([f.name, ...f.items.map(p => p.name)].join(' ')); });
    // A stand-in for named hardware should be the same kind of thing (another FET compressor, another plate).
    if (styled.length && (slot.only || slot.device || Math.random() < 0.8)) pool = styled;
  }
  const ws = pool.map(k => slotWeight(k, slot));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

const SET_NAMES = { Thresh: 'Threshold', Ratio: 'Ratio', Attack: 'Attack', Release: 'Release', Mix: 'Mix', Decay: 'Decay', PreDly: 'Pre-delay', Feedback: 'Feedback', Ceiling: 'Ceiling' };
function setLabel(k, [v, unit]) {
  const n = String(v);
  if (k === 'Ratio') return `${n}:1`;
  return `${SET_NAMES[k] || k} ${n}${unit === '%' ? ' %' : unit ? ' ' + unit : ''}`;
}

function rubricName(id) { return (CHAIN_RUBRICS.find(r => r.id === id) || {}).name || id; }
const rubricChip = r => `<button class="chip${C.rubric === r.id ? ' on' : ''}" data-rubric="${r.id}">${esc(r.name)}</button>`;

function remember() {
  if (C.chain) C.history.push(JSON.stringify(C.chain));
  if (C.history.length > 30) C.history.shift();
}

function persistChain() {
  settings().chain = C.chain;
  settings().chainRubric = C.rubric;
  saveUser();
}

/* ---------- maker presets (loaded into the plugin inside the rack) ---------- */

const presetCache = new Map();
function presetsFor(key) {
  if (!presetCache.has(key)) presetCache.set(key, api.get('/api/presets?family=' + encodeURIComponent(key)).then(r => r.presets || []).catch(() => []));
  return presetCache.get(key);
}
/** Does the slot take a maker preset? Instruments and slots of preset chains (`pre`) do. */
const wantsPreset = s => s.role === 'inst' || !!s.pre || !!s.pcat;
/** A random preset of the slot's kind (`pcat`: category / type / name), else any. */
async function pickPreset(s) {
  if (!s.family || !wantsPreset(s)) { s.preset = null; return; }
  const list = await presetsFor(s.family);
  if (!list.length) { s.preset = null; return; }
  const re = s.pcat ? new RegExp(s.pcat, 'i') : null;
  const fit = re ? list.filter(p => re.test(p.category + ' ' + p.type + ' ' + p.name)) : list;
  const pool = fit.length ? fit : (s.role === 'inst' ? [] : list);
  const p = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  s.preset = p ? { path: p.path, name: p.name, category: p.category, type: p.type, info: p.info } : null;
}
async function fillPresets(indices) {
  const ch = C.chain;
  await Promise.all(indices.map(i => ch.slots[i] && pickPreset(ch.slots[i])));
  // a slot with a Live Drum Rack as fallback (e.g. Shimmer Shake Strike missing) uses that rack instead
  for (const i of indices) { const s = ch.slots[i]; if (s && s.core && s.role === 'inst' && !s.preset) s.family = null; }
  if (C.chain !== ch) return;
  persistChain();
  renderChains();
}

/* ---------- the two randomizers ---------- */

/** Same modules, other plugins: every unlocked slot changes to another plugin of its kind. */
function rollPlugins() {
  if (!C.chain) return rollChain();
  remember();
  const slots = C.chain.slots;
  slots.forEach((s, i) => {
    if (s.locked) return;
    const others = new Set(slots.filter((_, j) => j !== i).map(x => x.family).filter(Boolean));
    if (s.family) others.add(s.family);
    s.family = pickForSlot(s, others);
  });
  persistChain();
  renderChains(true);
  fillPresets(slots.map((s, i) => (!s.locked && wantsPreset(s) ? i : -1)).filter(i => i >= 0));
}

/** A new layout from the chosen category (or any), filled at random. */
function rollChain() {
  const idx = roleIndex();
  let pool = CHAIN_TEMPLATES.filter(t => chainInRubric(t, C.rubric));
  if (pool.length > 1 && C.chain) pool = pool.filter(t => t.id !== C.chain.template);
  if (!pool.length) return toast('No template for this category.', 'err');
  const t = pool[Math.floor(Math.random() * pool.length)];
  const possible = t.slots.filter(s => s.core || (idx[s.role] || []).length || deviceMatches({ device: s.device ? s.device.source : '' }).length);
  let chosen = possible.filter(s => Math.random() < (s.opt ?? 1));
  if (chosen.length < Math.min(2, possible.length)) chosen = possible;
  remember();
  const slots = chosen.map(s => ({ role: s.role, label: s.label, tip: s.tip || '', prefer: s.prefer ? s.prefer.source : '', only: s.only ? s.only.source : '',
    pcat: s.pcat ? s.pcat.source : '', pre: !!s.pre, favor: s.favor ? s.favor.source : '', core: s.core || '',
    device: s.device ? s.device.source : '', set: s.set || null, macros: s.macros || null, family: null, locked: false }));
  const used = new Set();
  for (const s of slots) { s.family = pickForSlot(s, used); if (s.family) used.add(s.family); }
  const missing = t.slots.filter(s => !possible.includes(s)).map(s => CHAIN_ROLES[s.role].name);
  C.chain = { template: t.id, rubric: t.rubric, also: t.also || [], name: t.name, desc: t.desc, src: t.src || '', slots, missing: [...new Set(missing)] };
  persistChain();
  renderChains(true);
  fillPresets(slots.map((s, i) => (wantsPreset(s) ? i : -1)).filter(i => i >= 0));
}

function rollSlot(i) {
  const s = C.chain.slots[i];
  remember();
  const others = new Set(C.chain.slots.map(x => x.family).filter(Boolean));
  s.family = pickForSlot(s, others);
  s.preset = null;
  persistChain();
  renderChains();
  flashSlot(i);
  if (wantsPreset(s)) fillPresets([i]);
}

function flashSlot(i) {
  const el = $(`.cslot[data-i="${i}"]`);
  if (el) { el.classList.remove('rolled'); void el.offsetWidth; el.classList.add('rolled'); }
}

function undoChain() {
  const prev = C.history.pop();
  if (!prev) return;
  C.chain = JSON.parse(prev);
  persistChain();
  renderChains();
}

/* ---------- rendering ---------- */

function slotFace(f) {
  if (!f) return '<div class="cs-face none">No matching plugin installed</div>';
  const pic = picsOn() && S.pics.thumbs[f.key];
  const c = cat(f.category);
  if (pic) return `<div class="cs-face pic"><img class="bg" src="${esc(pic)}${pic.includes("?") ? "&" : "?"}s=blur" alt="" decoding="async"><img class="fg" src="${esc(pic)}${pic.includes("?") ? "&" : "?"}s=tile" alt="" decoding="async"></div>`;
  return `<div class="cs-face plate" style="--h:${c.hue}"><span class="fv">${esc(f.vendor)}</span><span class="fn">${esc(f.name)}</span>${svg(c.i, 'wm')}</div>`;
}

/* ---------- pictures for the plugins in the chain ---------- */
// The slots show the same pictures as the library. A plugin in the chain without a picture gets one
// taken in the background (at most once per session); the slot swaps to it as soon as it is there.
const chainPicTried = new Set();
let chainPicTimer;
function chainPics() {
  clearTimeout(chainPicTimer);
  if (!picsOn() || !C.chain || S.view !== 'chains') return;
  const keys = [...new Set(C.chain.slots.map(s => s.family).filter(Boolean))].filter(k => {
    const f = S.famBy.get(k);
    return f && !S.pics.thumbs[k] && !S.pics.failed[k] && !chainPicTried.has(k) && hostable(f);
  });
  if (!keys.length) return;
  // The app runs one capture batch at a time: try again once the running one is done.
  if (S.capture?.running) { chainPicTimer = setTimeout(chainPics, 2500); return; }
  keys.forEach(k => chainPicTried.add(k));
  api.post('/api/capture', { families: keys }).then(r => { if (r.ok && r.queued) watchCapture(); }).catch(() => {});
}

// New pictures arrived: swap them into the chain slots, next to the library's own refresh.
const _refreshCards = refreshCards;
refreshCards = function (keys) {
  _refreshCards(keys);
  if (!C.chain) return;
  for (const el of $$('.cslot')) {
    const s = C.chain.slots[+el.dataset.i];
    const face = el.querySelector('.cs-face');
    const f = s && keys.includes(s.family) && S.famBy.get(s.family);
    if (!f || !face) continue;
    const t = document.createElement('div');
    t.innerHTML = slotFace(f);
    face.replaceWith(t.firstElementChild);
  }
};

function renderChains(animate = false) {
  const el = $('#chains');
  if (!el) return;
  if (!S.lib) { el.innerHTML = '<div class="empty"><h3>No scan yet</h3></div>'; return; }
  if (!C.chain && settings().chain) { C.chain = settings().chain; C.rubric = settings().chainRubric || 'all'; }
  if (!C.chain) { rollChain(); return; }
  const ch = C.chain;
  const idx = roleIndex();
  // A saved chain can hold a plugin that is gone, hidden or no longer usable on this Mac
  // (Intel-only, AAX-only, rejected by Live): give that slot another plugin of its kind.
  let swapped = false;
  ch.slots.forEach(s => {
    const f = s.family && S.famBy.get(s.family);
    if (!s.family || (f && f.loadable && !S.user.hidden.includes(f.key))) return;
    const k = pickForSlot(s, new Set(ch.slots.map(x => x.family).filter(Boolean)));
    s.family = k && S.famBy.get(k)?.loadable ? k : null;
    swapped = true;
  });
  if (swapped) persistChain();
  // macros per module are worked out again for the current plugins (planMacros, cached per layout)
  ch.slots.forEach(s => { delete s._macros; });
  const slots = ch.slots.map((s, i) => {
    const f = s.family && S.famBy.get(s.family);
    const count = (idx[s.role] || []).length;
    return `${i ? '<div class="arrow">' + svg('<path d="M4 12h15M14 7l5 5-5 5"/>') + '</div>' : ''}
    <div class="cslot${s.locked ? ' locked' : ''}" data-i="${i}" style="--h:${f ? cat(f.category).hue : 220}">
      <div class="cs-top"><span class="num">${i + 1}</span><span class="role" title="${esc(CHAIN_ROLES[s.role]?.name || '')}">${esc(s.label)}</span>
        <button class="cs-lock" data-lock title="${s.locked ? 'Unlock' : 'Lock – stays put when you roll'}">${LOCK(s.locked)}</button></div>
      <button class="cs-main" data-pick title="Pick another plugin">${!f && s.core ? `<div class="cs-face none">Live Drum Rack – ${esc(s.core)}</div>` : slotFace(f)}
        <div class="cs-name"><b>${esc(f ? f.name : s.core || '—')}</b><small>${esc(f ? f.vendor : s.core ? 'Live Drum Rack (Core Library)' : CHAIN_ROLES[s.role]?.name || '')}</small>
          ${isSubstitute(s, f) ? `<em class="subst" title="You have no plugin of the original – this is a comparable one">Stand-in for ${esc(s.label)}</em>` : ''}</div></button>
      ${f && wantsPreset(s) ? `<button class="cs-preset" data-preset title="Pick a preset">${s.preset ? `<b>Preset</b> ${esc(s.preset.name)}<small>${esc(s.preset.type || s.preset.category || '')}</small>` : '<b>Preset</b> <small>none for this plugin – default sound</small>'}</button>` : ''}
      <div class="cs-tip">${esc(s.tip)}</div>
      ${s.set && Object.keys(s.set).length ? `<div class="cs-set" title="Starting values in the Ableton rack (via the macros)">${Object.entries(s.set).map(([k, v]) => `<span>${esc(setLabel(k, v))}</span>`).join('')}</div>` : ''}
      <div class="cs-acts">
        <button data-roll title="Roll only this module (${count} to choose from)">${DICE}</button>
        <button data-left title="Move earlier" ${i ? '' : 'disabled'}>‹</button>
        <button data-right title="Move later" ${i < ch.slots.length - 1 ? '' : 'disabled'}>›</button>
        <button data-del title="Remove module">×</button>
        <span class="cnt">${count}</span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
  <div class="chainhead">
    <div class="rubricrows">
      <div class="chips rubrics">${CHAIN_RUBRICS.filter(r => !r.group).map(rubricChip).join('')}</div>
      ${C.rubric === 'uad' || C.rubric.startsWith('ua-') ? `<div class="chips rubrics genres"><span class="rlabel">UA Console</span>${CHAIN_RUBRICS.filter(r => r.group === 'ua').map(rubricChip).join('') || '<span class="rlabel">no presets found</span>'}</div>` : ''}
      <div class="chips rubrics genres"><span class="rlabel">Genre</span>${CHAIN_RUBRICS.filter(r => r.group === 'genre').map(rubricChip).join('')}</div>
    </div>
    <div class="dice">
      <button class="btn dicebtn" id="rollPlugins" title="Same modules, each gets another plugin of its kind">${DICE}<span>Roll plugins</span></button>
      <button class="btn pri dicebtn" id="rollChain" title="A new layout from “${esc(rubricName(C.rubric))}”">${DICE}<span>New chain</span></button>
    </div>
  </div>
  <div class="chaininfo">
    <div class="ci-text">
      <small>${[ch.rubric, ...(ch.also || []).filter(x => x !== 'famous')].map(r => esc(rubricName(r))).join(' · ')} · ${ch.slots.length} modules</small>
      <h1>${esc(ch.name)}</h1>
      <p>${esc(ch.desc || '')}</p>
      ${ch.src ? `<p class="src">Source: ${esc(ch.src)}</p>` : ''}
      <p class="rackprog" id="rackProg" ${C.building ? '' : 'hidden'}>${esc(C.buildText || 'Building the rack…')}</p>
      ${ch.missing?.length ? `<p class="hint" style="padding:0">Left out because no matching plugin is installed: ${esc(ch.missing.join(', '))}</p>` : ''}
    </div>
    <div class="btns">
      <button class="btn" id="undoChain" ${C.history.length ? '' : 'disabled'} title="Previous chain">↶ Back</button>
      ${RACK_EXPORT ? `<button class="btn" id="saveChain" ${C.building ? 'disabled' : ''} title="Saves an Ableton Audio Effect Rack with mapped macros to your User Library">Save as Ableton rack</button>` : ''}
      <button class="btn pri" id="loadChain" ${ch.slots.some(s => s.family) && !C.building ? '' : 'disabled'} title="${RACK_EXPORT ? 'Builds the rack and loads it onto the selected track in Live' : 'Loads the plugins in this order onto the selected track in Live'}">${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Load in Live</button>
    </div>
  </div>
  <div class="flow${animate ? ' anim' : ''}">
    <div class="io">IN</div><div class="arrow">${svg('<path d="M4 12h15M14 7l5 5-5 5"/>')}</div>
    ${slots}
    <div class="arrow">${svg('<path d="M4 12h15M14 7l5 5-5 5"/>')}</div><div class="io">OUT</div>
    <button class="addslot" id="addSlot" title="Add a module">+ Module</button>
  </div>
  ${chainGuide(ch)}
  <p class="hint chainhint">Click a plugin to pick another one. The lock keeps a module when you roll. “Load in Live” builds an Ableton rack (VST3 versions, key knobs on named macros at the starting values) and puts it on the selected track.</p>`;
  chainPics();
  planMacros();
}

/* ---------- guide below the chain ---------- */

/** What to adjust when using the chain for its purpose – by category, then per module. */
const CHAIN_ADJUST = {
  vocals: ['Set the input so the first compressor shows about 3–6 dB of gain reduction on the loudest words.',
    'Tune the de-esser to the singer: sibilance sits somewhere between 5 and 9 kHz.',
    'High-pass to taste (80–120 Hz) – lower for deep voices, higher for thin ones.',
    'Set reverb and delay amounts against the full track, not soloed.'],
  drums: ['Attack decides the punch: slower lets the stick hit through, faster flattens it.',
    'Tune EQ boosts to the kit – kick body 50–80 Hz, snare body 150–250 Hz, crack 2–5 kHz.',
    'When a module runs in parallel, set the blend with Mix rather than the threshold.'],
  bass: ['Match low boosts and the high-pass to the song’s key and the kick so they do not fight.',
    'Drive the saturation until the bass is heard on small speakers, then back off a little.',
    'Keep the low end below about 100 Hz in mono.'],
  perc: ['Shape attack and release to the groove – the release should breathe in time with the tempo.',
    'Thin out low end below 150–200 Hz so percussion does not cloud the kick.'],
  instr: ['Cut what the instrument does not need (low end on guitars and keys) before boosting.',
    'Set compression for an even level: 2–4 dB is usually enough.',
    'Effects in time with the song: sync delay and modulation rates to the tempo.'],
  lead: ['Bright leads: tame harshness at 2–5 kHz before adding width or reverb.',
    'Sync delays to the tempo (1/8 dotted, 1/4) and keep the mix low enough that the line stays clear.'],
  mod: ['Set rates in time with the song and keep Mix low enough that the sound stays in place.'],
  returns: ['Put the chain on a return track: every wet/dry Mix at 100 %, the amount comes from the send.',
    'High-pass the return (around 150–300 Hz) so the effect does not muddy the low end.'],
  mixbus: ['Aim for 1–3 dB of gain reduction – the bus should glue, not squash.',
    'Compare at equal loudness: match the output to the bypassed level before judging.'],
  master: ['Limiter ceiling at −1 dBTP for streaming; loudness to taste (about −14 to −9 LUFS).',
    'Compare at equal loudness and against a reference track.',
    'Small moves: EQ changes of 0.5–1.5 dB are usually enough on a master.'],
  shakers: ['Pick the shaker inside Shimmer Shake Strike (or the pad in the Drum Rack) that fits the groove, then play 16ths with velocity changes.',
    'High-pass shakers hard (300–600 Hz) – they live in the top end.',
    'Keep the level low: a shaker should be felt more than heard.'],
  synth: ['Pick the preset first (click “Preset” on the instrument), then adjust the effects to it.',
    'Play in the register the sound is meant for – basses below C2, pads and leads higher.',
    'Bright, resonant patches: let the resonance control and EQ take out harshness before reverb and delay.',
    'Sync delays and LFO effects to the tempo; set reverb and delay amounts against the full track.'],
  sounddesign: ['Most of these chains shine on a return or bounced to audio, so you can reverse, stretch and re-pitch the result.',
    'Automate the key knobs (filter, pitch, Mix) over time – sound design is movement.',
    'Bounce, reverse and process again for new material.'],
  experimental: ['Every module loads a random maker preset – roll the presets (Roll plugins, or “Preset” on a module) until something sparks.',
    'Presets are set for their original use: lower Mix and output levels to fit your track.',
    'Found something good? Save it as an Ableton rack before you roll again.'],
  uad: ['Set the input of the first UAD module so its meter moves around 0 VU – UAD emulations sound best at their nominal level.',
    'Compression: 3–6 dB on the loudest parts as a start.'],
};

/** Starting settings per module type, used when a module's own tip says little ("Colour."). [mix, master/bus] */
const ROLE_HOW = {
  preamp: ['Drive the input until the colour is heard, then match the output level.', 'Drive gently – only enough for subtle colour.'],
  eq: ['Cut before you boost; 2–4 dB moves, sweep to find the frequency.', 'Broad moves of 0.5–1.5 dB; low and high shelves first.'],
  dyneq: ['Threshold so it only reacts on the harsh or boomy moments; 2–4 dB.', 'Only 1–2 dB on problem frequencies.'],
  comp: ['Threshold for 3–6 dB of gain reduction; attack 10–30 ms, release in time with the song.', 'Ratio 1.5–2:1, slow attack, auto release, 1–2 dB.'],
  multiband: ['Only touch the bands that jump out; 2–3 dB per band.', '1–2 dB per band, mostly on lows and highs.'],
  limiter: ['Catch only the peaks: 1–3 dB.', 'Ceiling −1 dBTP; raise the input until the loudness fits, at most 2–3 dB of gain reduction.'],
  clipper: ['Clip only the loudest transients, 1–2 dB.', 'Only 0.5–1.5 dB before the limiter.'],
  gate: ['Threshold just above the bleed; release so the tail stays natural.', ''],
  transient: ['More attack for punch, less sustain for tightness – small moves.', ''],
  deess: ['Find the “s” frequency (5–9 kHz) and reduce it by 3–6 dB.', 'Only 1–2 dB on the harshest moments.'],
  sat: ['Drive until it adds warmth, then back off; match the level.', 'Very little drive – it should glue, not distort.'],
  dist: ['Drive to taste and blend with Mix for control.', ''],
  amp: ['Gain for the amount of crunch; blend with the clean signal if needed.', ''],
  tape: ['Push the input for saturation; choose the speed/tape type for the low end.', 'Low input – subtle glue and rounding of the highs.'],
  crush: ['Blend with Mix so the original stays audible.', ''],
  exciter: ['Add until it is just audible, then back off a little.', 'Very little – it adds up quickly on a master.'],
  reverb: ['Decay to the tempo; pre-delay 20–60 ms; high-pass the reverb.', ''],
  delay: ['Sync to the tempo; feedback 15–30 %; filter the repeats.', ''],
  chorus: ['Slow rate, low depth; Mix to taste.', ''],
  mod: ['Rate in time with the song; Mix to taste.', ''],
  filter: ['Set the cutoff by ear; automate it for movement.', ''],
  tune: ['Set the key and scale; retune speed fast for the hard effect, slower for natural.', ''],
  pitch: ['Small shifts (5–15 cents) for width; Mix to taste.', ''],
  width: ['Widen the highs, keep the lows mono; check in mono.', 'Little width, and keep everything below about 150 Hz mono.'],
  sidechain: ['Trigger from the kick; depth to taste, release in time with the tempo.', ''],
  meter: ['No settings – watch loudness, peaks and balance.', 'Watch integrated LUFS and true peak.'],
};

function chainGuide(ch) {
  const li = a => a.map(t => `<li>${t}</li>`).join('');
  // the hardware the chain was built around: named devices, or the original a chosen plugin models
  const hw = [];
  ch.slots.forEach((s, i) => {
    const f = s.family && S.famBy.get(s.family);
    const o = f && typeof famOriginal === 'function' ? famOriginal(f) : null;
    if (s.device) {
      const sub = isSubstitute(s, f);
      hw.push(`<b>${i + 1}. ${esc(s.label)}</b>${f ? ` – in your chain: ${esc(f.name)}${sub ? ' (a comparable plugin)' : ''}` : ''}`);
    } else if (o) {
      hw.push(`<b>${i + 1}. ${esc(o.title)}</b> – modelled by ${esc(f.name)}`);
    }
  });
  // step by step: the plugin chosen for each module, and below it what to set
  const steps = ch.slots.map((s, i) => {
    const f = s.family && S.famBy.get(s.family);
    const vals = s.set && Object.keys(s.set).length ? 'Starting values: ' + Object.entries(s.set).map(([k, v]) => setLabel(k, v)).join(', ') + '.' : '';
    const tip = (s.tip || '').trim();
    const extra = slotExtraTip(s, ch);
    const how = [tip, extra, vals].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('') || `<span class="none">Set to taste.</span>`;
    const pre = s.preset ? `<span>Preset: <b>${esc(s.preset.name)}</b>${s.preset.type ? ' (' + esc(s.preset.type) + ')' : ''}${s.preset.info ? ' – ' + esc(s.preset.info) : ''}</span>` : '';
    // the macros the rack gives this plugin (worked out by the app), and what the text asks for but the plugin has no knob for
    let mac = '';
    if (f && Array.isArray(s._macros)) {
      const missing = macroWishes(s, ch).filter(w => !s._macros.includes(w));
      mac = `<div class="macs">${s._macros.length ? `<em>Macros</em>${s._macros.map(m => `<span>${esc(m)}</span>`).join('')}` : '<em>No macro</em>'}${missing.length ? `<small>no matching knob in this plugin: ${esc(missing.join(', '))}</small>` : ''}</div>`;
    } else if (f) mac = '<div class="macs"><em>Macros</em><small>working out…</small></div>';
    return `<li><b>${i + 1}. ${esc(f ? f.name : s.core ? s.core + ' (Live Drum Rack)' : s.label)}</b><div class="how">${pre}${how}</div>${mac}</li>`;
  });
  const general = CHAIN_ADJUST[ch.rubric] || (String(ch.rubric).startsWith('ua-') ? CHAIN_ADJUST.uad : []);
  return `<div class="chainguide">
    <div><h5>Adjust for your track</h5><ol class="steps">${steps.join('')}</ol>
      ${general.length ? `<h5 class="gen">Also check</h5><ul>${li(general.map(esc))}</ul>` : ''}</div>
    ${hw.length ? `<div><h5>Original hardware</h5><ul>${li(hw)}</ul></div>` : ''}
  </div>`;
}

/* ---------- Ableton racks ---------- */

/* ---------- macros for what the description says to set ---------- */

/** Knob labels the rack knows per role (mirrors RackBuilder.macroSpecs in Racks.swift). */
const ROLE_KNOBS = {
  comp: ['Thresh', 'Ratio', 'Attack', 'Release', 'Mix', 'Output'], multiband: ['Depth', 'Output'], limiter: ['Thresh', 'Ceiling'],
  clipper: ['Thresh', 'Output'], gate: ['Thresh', 'Range', 'Release', 'Hold'], transient: ['Attack', 'Sustain'], deess: ['Thresh', 'Freq'],
  eq: ['Low', 'High', 'HPF', 'Presence', 'Output', 'Tone'], dyneq: ['Depth', 'Mix'], sat: ['Drive', 'Mix', 'Tone'], dist: ['Drive', 'Mix', 'Tone'],
  amp: ['Gain', 'Tone'], tape: ['Drive', 'Wow', 'Noise', 'Mix'], crush: ['Crush', 'Mix', 'Noise'], exciter: ['Amount', 'Mix'],
  reverb: ['Mix', 'Decay', 'PreDly', 'Tone'], delay: ['Mix', 'Feedback', 'Time', 'Mod', 'Tone'], chorus: ['Mix', 'Depth', 'Feedback'],
  mod: ['Mix', 'Rate', 'Depth', 'Feedback'], filter: ['Cutoff', 'Reso', 'LFO', 'Drive', 'Mix'], tune: ['Retune', 'Humanize'],
  pitch: ['Pitch', 'Mix', 'Detune'], width: ['Width'], sidechain: ['Depth', 'Rate'], glitch: ['Mix'],
  preamp: ['Drive', 'Output', 'High', 'HPF', 'Low'], suite: ['Output'], inst: ['Cutoff', 'Reso', 'Attack', 'Release', 'Glide', 'Volume'],
};
/** What a description talks about → the knob that sets it. Checked in this order. */
const SAYS = [
  [/high-?pass|low[- ]?cut|\bhpf\b|rumble/, 'HPF'], [/low-?pass|high[- ]?cut|roll(s|ed)? off|soft(er)? top|band-?limit|darker|filter the repeats|filtered repeats|low-pass the/, 'Tone'],
  [/ceiling|dbtp/, 'Ceiling'], [/threshold|gain reduction|\d\s*(–\s*\d+\s*)?db\b(?! (at|of boost))|peak reduction|catch(es)? the peaks|level steady|even level|compress|limit(ing)?\b|squash|crush the|glue|de-?ess|the “s”|sibilan|duck/, 'Thresh'],
  [/ratio|\d+(\.\d)?\s*:\s*1/, 'Ratio'], [/attack|snap|punch/, 'Attack'], [/release|recovery|breathe/, 'Release'],
  [/\bmix\b|blend|parallel|wet|send|amount|low in the mix|keep the level/, 'Mix'], [/feedback|repeats|regen|self-?oscillat/, 'Feedback'],
  [/decay|reverb time|tail|\b\d(\.\d)?\s*(–\s*\d+(\.\d)?\s*)?s\b|long, |cavernous|endless|freeze/, 'Decay'], [/pre-?delay/, 'PreDly'],
  [/dotted|\b1\/\d+|\bms\b|delay time|slapback|\bsync/, 'Time'], [/wow|flutter|wobble|warble/, 'Wow'], [/noise|hiss|vinyl|crackle|dust/, 'Noise'],
  [/drive|satur|distort|grit|warmth|warm|harmonic|crunch|overdrive|bite|colour|color|thicken|hit .* hard|push/, 'Drive'], [/\bgain\b|crunch/, 'Gain'],
  [/cutoff|filter|low-?pass at|sweep|squelch|wah/, 'Cutoff'], [/resonan|squelch|scream/, 'Reso'], [/\blfo\b|movement|envelope|moving/, 'LFO'],
  [/width|wide|widen|stereo|spread|mono/, 'Width'], [/\brate\b|speed|in time|synced|tempo|1\/(8|16)/, 'Rate'], [/depth|deep|chorus|intensit/, 'Depth'],
  [/\bair\b|high shelf|top end|bright|lift .*k?hz|1[0-6]\s*khz|treble|open(s)? up|shimmer/, 'High'], [/low end|low shelf|low-end|\bbass\b|\d0\s*hz|kick|\bsub\b|weight|bottom|bump/, 'Low'],
  [/presence|\bmids?\b|mud|200|300|400|2–5 khz|crack|body|nasal|boxy/, 'Presence'], [/glide|portamento/, 'Glide'], [/octave|semitone|pitch/, 'Pitch'], [/detune|cents/, 'Detune'],
  [/retune/, 'Retune'], [/bit|sample.?rate|crush/, 'Crush'], [/sustain|tight/, 'Sustain'], [/\bhold\b/, 'Hold'], [/\brange\b|floor/, 'Range'],
  [/frequenc|\bkhz\b/, 'Freq'], [/output|make-?up|match the level|loudness|louder/, 'Output'], [/excit|harmonics|until it is (just )?audible/, 'Amount'],
];
/** The knobs a module's description asks for, in the order they come up (only those its kind of module has). */
function macroWishes(s, ch) {
  const knobs = ROLE_KNOBS[s.role] || [];
  const text = [s.tip, slotExtraTip(s, ch), ...(s.set ? Object.keys(s.set).map(k => SET_NAMES[k] || k) : [])].join(' ').toLowerCase();
  const out = [];
  for (const [re, label] of SAYS) if (knobs.includes(label) && re.test(text) && !out.includes(label)) out.push(label);
  for (const m of s.macros || []) if (!out.includes(m)) out.push(m);
  return out;
}
/** The extra starting tip the guide adds when a module's own tip says little (see chainGuide). */
function slotExtraTip(s, ch) {
  const r = ROLE_HOW[s.role];
  const tip = (s.tip || '').trim();
  return r && tip.length < 40 ? (/^(master|mixbus)$/.test(ch?.rubric) && r[1]) || r[0] : '';
}
/** The slots as the rack builder takes them: instrument first, then the effects. */
function rackSlots(ch) {
  const ordered = [...ch.slots.filter(s => s.family && s.role === 'inst').slice(0, 1), ...ch.slots.filter(s => s.family && s.role !== 'inst')];
  return { ordered, slots: ordered.map(s => ({ family: s.family, role: s.role, label: s.label, set: s.set || {}, macros: macroWishes(s, ch), ...(s.preset ? { preset: s.preset.path } : {}) })) };
}

// which macros each module gets – asked from the app (no file is written), cached per chain layout
const macroPlans = new Map();
let planTimer = null;
function planMacros() {
  clearTimeout(planTimer);
  planTimer = setTimeout(async () => {
    const ch = C.chain;
    if (!ch || S.view !== 'chains') return;
    const { ordered, slots } = rackSlots(ch);
    if (!slots.length) return;
    const sig = JSON.stringify([slots, ch.rubric === 'returns']);
    let plan = macroPlans.get(sig);
    if (!plan) {
      try { plan = await api.post('/api/rack/plan', { slots, returns: ch.rubric === 'returns' }); } catch { return; }
      noteUnusable(plan?.unusable);
      if (!plan?.ok) return;
      macroPlans.set(sig, plan);
    }
    if (C.chain !== ch) return;
    ordered.forEach((s, i) => { s._macros = plan.slotMacros?.[String(i)] || []; });
    const g = $('.chainguide');
    if (g) { const t = document.createElement('div'); t.innerHTML = chainGuide(ch); g.replaceWith(t.firstElementChild); }
  }, 250);
}

/** Builds an Audio Effect Rack (.adg) from the chain; with `load`, puts it on Live's selected track. */
async function buildRack(name, load) {
  const ch = C.chain;
  // the instrument goes first; an Instrument Rack lands on a MIDI track
  const { slots } = rackSlots(ch);
  const core = ch.slots.find(s => s.role === 'inst' && !s.family && s.core)?.core;
  if (!slots.length) return;
  let r;
  try {
    r = await api.post('/api/rack/build', { name, annotation: [ch.desc, ch.src && 'Source: ' + ch.src].filter(Boolean).join(' – '), slots, returns: ch.rubric === 'returns', load, ...(core ? { core } : {}) });
  } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  if (!r.ok) return toast(r.msg || 'Cannot build the rack', 'err');
  C.building = true;
  C.buildText = 'Building the rack…';
  renderChains();
  const poll = async () => {
    let p;
    try { p = await api.get('/api/rack/build'); } catch { p = { running: false, result: { ok: false, msg: 'PlugShelf is not responding' } }; }
    if (p.running) {
      C.buildText = `Building the rack – ${p.done + 1 > p.total ? p.total : p.done + 1} of ${p.total}: ${p.current || ''} (reading parameters)`;
      const el = $('#rackProg'); if (el) el.textContent = C.buildText;
      return setTimeout(poll, 500);
    }
    C.building = false;
    renderChains();
    const res = p.result || {};
    noteUnusable(res.unusable);
    const skipped = res.skipped?.length ? ` Not in the rack: ${res.skipped.join(', ')}.` : '';
    if (!res.ok) return toast((res.msg || 'Cannot build the rack') + skipped, 'err');
    if (load) {
      if (res.loaded) toast(`${res.core && !res.coreMsg ? `Live Drum Rack “${res.core}” and r` : 'R'}ack “${res.name}” with ${res.macros.length} macros → ${String(res.msg || '').split('\u2192 ').pop()}.${res.coreMsg ? ' ' + res.coreMsg + '.' : ''}${skipped}`, 'ok');
      else toast(`Rack saved, but Live did not load it: ${res.msg || 'no answer'}.${skipped}`, 'err', res.offline ? { label: 'Setup', fn: () => show('setup') } : null);
    } else {
      toast(res.instrument
        ? `Saved instrument rack “${res.name}” – ${res.devices} plugins, ${res.macros.length} macros. In Live: Browser › User Library › Presets › Instruments › Instrument Rack › PlugShelf Instruments.${skipped}`
        : `Saved rack “${res.name}” – ${res.devices} plugins, ${res.macros.length} macros. In Live: Browser › User Library › Presets › Audio Effects › Audio Effect Rack › PlugShelf.${skipped}`, 'ok');
    }
  };
  setTimeout(poll, 400);
}

/* ---------- picking by hand ---------- */

function openPicker(i) {
  const s = C.chain.slots[i];
  const idx = roleIndex();
  const byName = (a, b) => a.name.localeCompare(b.name, 'de');
  const fits = (idx[s.role] || []).map(k => S.famBy.get(k)).filter(Boolean).sort(byName);
  // The same kind of device first: emulations of the named hardware, plugins of the slot's style
  // (another preamp for a preamp, another opto compressor for an opto) and models of the same original.
  // a saved chain keeps the style it was made with; take the template's current one when it still exists
  const ts = CHAIN_TEMPLATES.find(t => t.id === C.chain.template)?.slots.find(x => x.role === s.role && x.label === s.label);
  const prefer = ts ? (ts.prefer ? ts.prefer.source : '') : s.prefer;
  const same = new Set(deviceMatches(ts ? { device: ts.device ? ts.device.source : '' } : s));
  if (prefer) { const re = new RegExp(prefer, 'i'); for (const f of fits) if (re.test([f.name, ...f.items.map(p => p.name)].join(' '))) same.add(f.key); }
  const cur = s.family && S.famBy.get(s.family);
  const orig = cur && typeof famOriginal === 'function' ? famOriginal(cur) : null;
  if (orig) for (const f of fits) if (famOriginal(f) === orig) same.add(f.key);
  if (cur && fits.includes(cur)) same.add(cur.key);
  // EQ slots: Pro-Q 4 and the Weiss EQs always at the top
  const topF = s.role === 'eq' || s.role === 'dyneq' ? S.fams.filter(f => isTopEq(f) && f.loadable && showable(f) && f.items.some(p => p.format === 'VST3' && usable(p))).sort(byName) : [];
  const top = new Set(topF.map(f => f.key));
  const sameF = [...same].filter(k => !top.has(k)).map(k => S.famBy.get(k)).filter(Boolean).sort(byName);
  const rest = fits.filter(f => !same.has(f.key) && !top.has(f.key));
  const roleName = CHAIN_ROLES[s.role]?.name || 'Plugins';
  const m = $('#modal');
  const row = f => `<button class="pk${f.key === s.family ? ' on' : ''}" data-k="${esc(f.key)}" style="--h:${cat(f.category).hue}"><i class="dot"></i><span class="t">${esc(f.name)}</span><span class="v">${esc(f.vendor)}</span></button>`;
  const listHTML = (q, all) => {
    const ql = q.toLowerCase();
    const hit = f => !ql || f.hay.includes(ql);
    if (all) {
      const src = S.fams.filter(f => f.loadable && showable(f) && (s.role === 'inst' ? f.kind === 'inst' : f.kind !== 'inst') && f.items.some(p => p.format === 'VST3' && usable(p)));
      return src.filter(hit).slice(0, 300).map(row).join('') || '<div class="hint">Nothing found.</div>';
    }
    const t = topF.filter(hit), a = sameF.filter(hit), b = rest.filter(hit);
    const head = t.length ? `<div class="pkh">Your top EQs · ${t.length}</div>${t.map(row).join('')}` : '';
    if (!sameF.length) return head + (b.length && head ? `<div class="pkh">More: ${esc(roleName)} · ${b.length}</div>` : '') + b.map(row).join('') || '<div class="hint">Nothing found.</div>';
    return head + (a.length ? `<div class="pkh">Same kind · ${a.length}</div>${a.map(row).join('')}` : '')
      + (b.length ? `<div class="pkh">More: ${esc(roleName)} · ${b.length}</div>${b.map(row).join('')}` : '')
      || '<div class="hint">Nothing found.</div>';
  };
  const lead = sameF.length ? `${sameF.length} of the same kind in your library, ${rest.length} more of type “${esc(roleName)}”.` : `${fits.length} matching plugins in your library.`;
  m.innerHTML = `<div class="dlg picker"><h3>${esc(s.label)}</h3><p>${lead}</p>
    <input class="field" id="pkQ" placeholder="Search" autocomplete="off">
    <label class="check" style="margin:8px 0"><input type="checkbox" id="pkAll"> Show all effects</label>
    <div class="pklist" id="pkList">${listHTML('', false)}</div>
    <div class="btns"><button class="btn" data-no>Close</button></div></div>`;
  m.hidden = false;
  const q = $('#pkQ'), all = $('#pkAll'), list = $('#pkList');
  const upd = () => { list.innerHTML = listHTML(q.value, all.checked); };
  q.oninput = upd; all.onchange = upd;
  q.focus();
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  q.onkeydown = e => { if (e.key === 'Escape') close(); e.stopPropagation(); };
  $('[data-no]', m).onclick = close;
  m.onclick = e => { if (e.target === m) close(); };
  list.onclick = e => {
    const b = e.target.closest('.pk'); if (!b) return;
    remember();
    s.family = b.dataset.k;
    s.preset = null;
    persistChain();
    close();
    renderChains();
    flashSlot(i);
    if (wantsPreset(s)) fillPresets([i]);
  };
}

async function openPresetPicker(i) {
  const s = C.chain.slots[i];
  if (!s.family) return;
  const list = await presetsFor(s.family);
  const m = $('#modal');
  const f = S.famBy.get(s.family);
  const row = p => `<button class="pk${s.preset?.path === p.path ? ' on' : ''}" data-p="${esc(p.path)}"><span class="t">${esc(p.name)}</span><span class="v">${esc(p.type || p.category)}</span></button>`;
  const listHTML = q => {
    const ql = q.toLowerCase();
    const hit = list.filter(p => !ql || (p.name + ' ' + p.category + ' ' + p.type).toLowerCase().includes(ql)).slice(0, 400);
    let last = null, out = '';
    for (const p of hit) { if (p.category !== last) { out += `<div class="pkh">${esc(p.category || 'Presets')}</div>`; last = p.category; } out += row(p); }
    return out || '<div class="hint">No presets found.</div>';
  };
  m.innerHTML = `<div class="dlg picker"><h3>${esc(f ? f.name : '')} – preset</h3><p>${list.length ? `${list.length} presets of this plugin that PlugShelf can load into the rack.` : 'PlugShelf cannot load presets of this plugin into a rack – it starts with its default sound.'}</p>
    <input class="field" id="ppQ" placeholder="Search presets" autocomplete="off">
    <div class="pklist" id="ppList">${listHTML('')}</div>
    <div class="btns"><button class="btn" data-none>Default sound</button><button class="btn" data-rnd>${DICE} Random</button><button class="btn" data-no>Close</button></div></div>`;
  m.hidden = false;
  const q = $('#ppQ'), box = $('#ppList');
  q.oninput = () => { box.innerHTML = listHTML(q.value); };
  q.focus();
  const close = () => { m.hidden = true; m.innerHTML = ''; };
  const done = () => { persistChain(); close(); renderChains(); flashSlot(i); };
  q.onkeydown = e => { if (e.key === 'Escape') close(); e.stopPropagation(); };
  $('[data-no]', m).onclick = close;
  $('[data-none]', m).onclick = () => { remember(); s.preset = null; done(); };
  $('[data-rnd]', m).onclick = async () => { remember(); await pickPreset(s); done(); };
  m.onclick = e => { if (e.target === m) close(); };
  box.onclick = e => {
    const b = e.target.closest('.pk'); if (!b) return;
    const p = list.find(x => x.path === b.dataset.p); if (!p) return;
    remember();
    s.preset = { path: p.path, name: p.name, category: p.category, type: p.type, info: p.info };
    done();
  };
}

function addSlotMenu(x, y) {
  const idx = roleIndex();
  const roles = Object.entries(CHAIN_ROLES).filter(([k]) => (idx[k] || []).length).sort((a, b) => a[1].name.localeCompare(b[1].name, 'de'));
  menu(x, y, roles.map(([k, r]) => ({
    label: r.name, hint: String(idx[k].length),
    fn: () => {
      remember();
      const s = { role: k, label: r.name, tip: '', prefer: '', family: null, locked: false };
      s.family = pickForSlot(s, new Set(C.chain.slots.map(x => x.family).filter(Boolean)));
      C.chain.slots.push(s);
      persistChain();
      renderChains();
      flashSlot(C.chain.slots.length - 1);
    },
  })));
}

/* ---------- events ---------- */

function bindChains() {
  const el = $('#chains');
  el.addEventListener('click', async e => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.rubric) { C.rubric = t.dataset.rubric; rollChain(); return; }
    if (t.id === 'rollPlugins') return rollPlugins();
    if (t.id === 'rollChain') return rollChain();
    if (t.id === 'undoChain') return undoChain();
    if (t.id === 'addSlot') { const r = t.getBoundingClientRect(); return addSlotMenu(r.left, r.bottom + 4); }
    if (t.id === 'loadChain') {
      if (RACK_EXPORT) return buildRack(C.chain.name, true);
      return loadRack({ name: C.chain.name, items: C.chain.slots.filter(s => s.family).map(s => ({ family: s.family, format: null })) });
    }
    if (t.id === 'saveChain') {
      const inst = C.chain.slots.some(s => s.role === 'inst' && s.family);
      const name = await ask('Save as Ableton rack', inst
        ? 'An Instrument Rack in your User Library under Presets › Instruments › Instrument Rack › PlugShelf Instruments – instrument, effects and presets, with the key knobs on macros.'
        : 'Goes to your User Library under Presets › Audio Effects › Audio Effect Rack › PlugShelf – with the key knobs on named, coloured macros.', C.chain.name);
      if (name) buildRack(name, false);
      return;
    }
    const slot = t.closest('.cslot');
    if (!slot) return;
    const i = +slot.dataset.i, s = C.chain.slots[i];
    if ('lock' in t.dataset) { s.locked = !s.locked; persistChain(); return renderChains(); }
    if ('roll' in t.dataset) return rollSlot(i);
    if ('pick' in t.dataset) return openPicker(i);
    if ('preset' in t.dataset) return openPresetPicker(i);
    if ('del' in t.dataset) { remember(); C.chain.slots.splice(i, 1); persistChain(); return renderChains(); }
    if ('left' in t.dataset || 'right' in t.dataset) {
      const j = 'left' in t.dataset ? i - 1 : i + 1;
      remember();
      [C.chain.slots[i], C.chain.slots[j]] = [C.chain.slots[j], C.chain.slots[i]];
      persistChain();
      renderChains();
      flashSlot(j);
    }
  });
  el.addEventListener('contextmenu', e => {
    const slot = e.target.closest('.cslot');
    if (!slot) return;
    e.preventDefault();
    const s = C.chain.slots[+slot.dataset.i];
    const f = s.family && S.famBy.get(s.family);
    if (!f) return;
    menu(e.clientX, e.clientY, [
      { label: 'Load only this plugin in Live', bold: true, fn: () => loadFam(f) },
      { label: 'Details', fn: () => { show('lib'); openInfo(f.key); } },
      { label: S.user.favs.includes(f.key) ? 'Remove from favourites' : 'Add to favourites', fn: () => { toggleFav(f.key); renderChains(); } },
    ]);
  });
}

bindChains();
