'use strict';
/* PlugShelf – Chains tab. A chain is a typical signal flow (from chain-data.js) whose slots are
   filled with plugins from the library. Two dice:
   - "Roll plugins": same modules, every unlocked slot gets another plugin of the same kind.
   - "New chain": a new layout from the chosen category, then filled at random. */

const C = { rubric: 'all', chain: null, history: [], building: false, buildText: '' };
// Ableton rack export (.adg with macros). The format follows a rack Live 12.4 saved itself;
// set to false to fall back to loading the chain's plugins one by one.
const RACK_EXPORT = true;
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

/** role -> family keys of loadable, visible effect plugins that fit it */
function roleIndex() {
  const sig = S.user.hidden.join(',') + '|' + settings().showAAX;
  if (roleCache && roleCache.sig === sig) return roleCache.map;
  const usable = S.fams.filter(f => f.loadable && showable(f) && !S.user.hidden.includes(f.key) && f.kind !== 'inst');
  const map = {};
  for (const r of Object.keys(CHAIN_ROLES)) map[r] = usable.filter(f => chainRoleFits(r, chainFam(f))).map(f => f.key);
  roleCache = { sig, map };
  return map;
}

function slotWeight(key, slot) {
  const f = S.famBy.get(key);
  if (!f) return 0;
  let w = 1;
  if (slot.prefer && new RegExp(slot.prefer, 'i').test([f.name, ...f.items.map(p => p.name)].join(' '))) w *= 4;
  if (S.user.favs.includes(key)) w *= 2.5;
  if (S.user.usage[key]) w *= 1.3;
  return w;
}

const famText = f => [f.vendor, f.name, ...f.items.map(p => p.name)].join(' ');

/** Plugins in the library that emulate the slot's named hardware (any role), e.g. every 1176 model. */
function deviceMatches(slot) {
  if (!slot.device) return [];
  const re = new RegExp(slot.device, 'i');
  // Surround versions (Waves 360, 5.1) never stand in for stereo hardware.
  return S.fams.filter(f => f.loadable && f.kind !== 'inst' && showable(f) && !S.user.hidden.includes(f.key)
    && re.test(famText(f)) && !/\b360\b|\b5\.[01]\b|\blfe/i.test(famText(f))).map(f => f.key);
}

/** Does the plugin in this slot stand in for the named hardware rather than emulate it? */
function isSubstitute(slot, f) {
  return !!(slot.device && f && !new RegExp(slot.device, 'i').test(famText(f)));
}

/** A random plugin for a slot, weighted towards plugins made for the job; avoids `exclude`.
    A slot that names hardware takes an emulation of it whenever there is one. */
function pickForSlot(slot, exclude) {
  const dev = deviceMatches(slot).filter(k => !exclude.has(k));
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
  let pool = all.filter(k => !exclude.has(k));
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
}

/** A new layout from the chosen category (or any), filled at random. */
function rollChain() {
  const idx = roleIndex();
  let pool = CHAIN_TEMPLATES.filter(t => chainInRubric(t, C.rubric));
  if (pool.length > 1 && C.chain) pool = pool.filter(t => t.id !== C.chain.template);
  if (!pool.length) return toast('No template for this category.', 'err');
  const t = pool[Math.floor(Math.random() * pool.length)];
  const possible = t.slots.filter(s => (idx[s.role] || []).length || deviceMatches({ device: s.device ? s.device.source : '' }).length);
  let chosen = possible.filter(s => Math.random() < (s.opt ?? 1));
  if (chosen.length < Math.min(2, possible.length)) chosen = possible;
  remember();
  const slots = chosen.map(s => ({ role: s.role, label: s.label, tip: s.tip || '', prefer: s.prefer ? s.prefer.source : '', only: s.only ? s.only.source : '',
    device: s.device ? s.device.source : '', set: s.set || null, macros: s.macros || null, family: null, locked: false }));
  const used = new Set();
  for (const s of slots) { s.family = pickForSlot(s, used); if (s.family) used.add(s.family); }
  const missing = t.slots.filter(s => !possible.includes(s)).map(s => CHAIN_ROLES[s.role].name);
  C.chain = { template: t.id, rubric: t.rubric, also: t.also || [], name: t.name, desc: t.desc, src: t.src || '', slots, missing: [...new Set(missing)] };
  persistChain();
  renderChains(true);
}

function rollSlot(i) {
  const s = C.chain.slots[i];
  remember();
  const others = new Set(C.chain.slots.map(x => x.family).filter(Boolean));
  s.family = pickForSlot(s, others);
  persistChain();
  renderChains();
  flashSlot(i);
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
  if (pic) return `<div class="cs-face pic"><img class="bg" src="${esc(pic)}" alt=""><img class="fg" src="${esc(pic)}" alt=""></div>`;
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
  const slots = ch.slots.map((s, i) => {
    const f = s.family && S.famBy.get(s.family);
    const count = (idx[s.role] || []).length;
    return `${i ? '<div class="arrow">' + svg('<path d="M4 12h15M14 7l5 5-5 5"/>') + '</div>' : ''}
    <div class="cslot${s.locked ? ' locked' : ''}" data-i="${i}" style="--h:${f ? cat(f.category).hue : 220}">
      <div class="cs-top"><span class="num">${i + 1}</span><span class="role" title="${esc(CHAIN_ROLES[s.role]?.name || '')}">${esc(s.label)}</span>
        <button class="cs-lock" data-lock title="${s.locked ? 'Unlock' : 'Lock – stays put when you roll'}">${LOCK(s.locked)}</button></div>
      <button class="cs-main" data-pick title="Pick another plugin">${slotFace(f)}
        <div class="cs-name"><b>${esc(f ? f.name : '—')}</b><small>${esc(f ? f.vendor : CHAIN_ROLES[s.role]?.name || '')}</small>
          ${isSubstitute(s, f) ? `<em class="subst" title="You have no plugin of the original – this is a comparable one">Stand-in for ${esc(s.label)}</em>` : ''}</div></button>
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
      <div class="chips rubrics">${CHAIN_RUBRICS.filter(r => r.group !== 'genre').map(rubricChip).join('')}</div>
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
  <p class="hint chainhint">Click a plugin to pick another one. The lock keeps a module when you roll. “Load in Live” builds an Ableton rack (VST3 versions, key knobs on named macros at the starting values) and puts it on the selected track.</p>`;
  chainPics();
}

/* ---------- Ableton racks ---------- */

/** Builds an Audio Effect Rack (.adg) from the chain; with `load`, puts it on Live's selected track. */
async function buildRack(name, load) {
  const ch = C.chain;
  const slots = ch.slots.filter(s => s.family).map(s => ({ family: s.family, role: s.role, label: s.label, set: s.set || {}, macros: s.macros || [] }));
  if (!slots.length) return;
  let r;
  try {
    r = await api.post('/api/rack/build', { name, annotation: [ch.desc, ch.src && 'Source: ' + ch.src].filter(Boolean).join(' – '), slots, returns: ch.rubric === 'returns', load });
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
    const skipped = res.skipped?.length ? ` Not in the rack: ${res.skipped.join(', ')}.` : '';
    if (!res.ok) return toast((res.msg || 'Cannot build the rack') + skipped, 'err');
    if (load) {
      if (res.loaded) toast(`Rack “${res.name}” with ${res.macros.length} macros → ${String(res.msg || '').split('\u2192 ').pop()}.${skipped}`, 'ok');
      else toast(`Rack saved, but Live did not load it: ${res.msg || 'no answer'}.${skipped}`, 'err', res.offline ? { label: 'Setup', fn: () => show('setup') } : null);
    } else {
      toast(`Saved rack “${res.name}” – ${res.devices} plugins, ${res.macros.length} macros. In Live: Browser › User Library › Presets › Audio Effects › Audio Effect Rack › PlugShelf.${skipped}`, 'ok');
    }
  };
  setTimeout(poll, 400);
}

/* ---------- picking by hand ---------- */

function openPicker(i) {
  const s = C.chain.slots[i];
  const idx = roleIndex();
  const fits = (idx[s.role] || []).map(k => S.famBy.get(k)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const m = $('#modal');
  const listHTML = (q, all) => {
    const src = all ? S.fams.filter(f => f.loadable && showable(f) && f.kind !== 'inst' && f.items.some(p => p.format === 'VST3' && usable(p))) : fits;
    const ql = q.toLowerCase();
    return src.filter(f => !ql || f.hay.includes(ql)).slice(0, 300).map(f =>
      `<button class="pk${f.key === s.family ? ' on' : ''}" data-k="${esc(f.key)}" style="--h:${cat(f.category).hue}"><i class="dot"></i><span class="t">${esc(f.name)}</span><span class="v">${esc(f.vendor)}</span></button>`).join('')
      || '<div class="hint">Nothing found.</div>';
  };
  m.innerHTML = `<div class="dlg picker"><h3>${esc(s.label)}</h3><p>${fits.length} matching plugins in your library.</p>
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
    persistChain();
    close();
    renderChains();
    flashSlot(i);
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
      const name = await ask('Save as Ableton rack', 'Goes to your User Library under Presets › Audio Effects › Audio Effect Rack › PlugShelf – with the key knobs on named, coloured macros.', C.chain.name);
      if (name) buildRack(name, false);
      return;
    }
    const slot = t.closest('.cslot');
    if (!slot) return;
    const i = +slot.dataset.i, s = C.chain.slots[i];
    if ('lock' in t.dataset) { s.locked = !s.locked; persistChain(); return renderChains(); }
    if ('roll' in t.dataset) return rollSlot(i);
    if ('pick' in t.dataset) return openPicker(i);
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
