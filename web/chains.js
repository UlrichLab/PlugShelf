'use strict';
/* PlugShelf – Chains tab. A chain is a typical signal flow (from chain-data.js) whose slots are
   filled with plugins from the library. Two dice:
   - "Plugins würfeln": same modules, every unlocked slot gets another plugin of the same kind.
   - "Neue Chain": a new layout from the chosen category, then filled at random. */

const C = { rubric: 'all', chain: null, history: [] };
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

/** A random plugin for a slot, weighted towards plugins made for the job; avoids `exclude`. */
function pickForSlot(slot, exclude) {
  const all = (roleIndex()[slot.role] || []).filter(k => S.famBy.has(k));
  let pool = all.filter(k => !exclude.has(k));
  if (!pool.length) pool = all.filter(k => k !== slot.family);
  if (!pool.length) return slot.family || null;
  // Mostly stay true to the slot's style (a "fast" compressor is usually a 1176 type), sometimes surprise.
  if (slot.prefer) {
    const re = new RegExp(slot.prefer, 'i');
    const styled = pool.filter(k => { const f = S.famBy.get(k); return re.test([f.name, ...f.items.map(p => p.name)].join(' ')); });
    if (styled.length && Math.random() < 0.8) pool = styled;
  }
  const ws = pool.map(k => slotWeight(k, slot));
  let r = Math.random() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

function rubricName(id) { return (CHAIN_RUBRICS.find(r => r.id === id) || {}).de || id; }

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
  let pool = CHAIN_TEMPLATES.filter(t => C.rubric === 'all' || t.rubric === C.rubric);
  if (pool.length > 1 && C.chain) pool = pool.filter(t => t.id !== C.chain.template);
  if (!pool.length) return toast('Keine Vorlage für diese Rubrik.', 'err');
  const t = pool[Math.floor(Math.random() * pool.length)];
  const possible = t.slots.filter(s => (idx[s.role] || []).length);
  let chosen = possible.filter(s => Math.random() < (s.opt ?? 1));
  if (chosen.length < Math.min(2, possible.length)) chosen = possible;
  remember();
  const slots = chosen.map(s => ({ role: s.role, label: s.label, tip: s.tip || '', prefer: s.prefer ? s.prefer.source : '', family: null, locked: false }));
  const used = new Set();
  for (const s of slots) { s.family = pickForSlot(s, used); if (s.family) used.add(s.family); }
  const missing = t.slots.filter(s => !(idx[s.role] || []).length).map(s => CHAIN_ROLES[s.role].de);
  C.chain = { template: t.id, rubric: t.rubric, name: t.name, desc: t.desc, slots, missing: [...new Set(missing)] };
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
  if (!f) return '<div class="cs-face none">Kein passendes Plugin installiert</div>';
  const pic = picsOn() && S.pics.thumbs[f.key];
  const c = cat(f.category);
  if (pic) return `<div class="cs-face pic"><img class="bg" src="${esc(pic)}" alt=""><img class="fg" src="${esc(pic)}" alt=""></div>`;
  return `<div class="cs-face plate" style="--h:${c.hue}"><span class="fv">${esc(f.vendor)}</span><span class="fn">${esc(f.name)}</span>${svg(c.i, 'wm')}</div>`;
}

function renderChains(animate = false) {
  const el = $('#chains');
  if (!el) return;
  if (!S.lib) { el.innerHTML = '<div class="empty"><h3>Noch kein Scan</h3></div>'; return; }
  if (!C.chain && settings().chain) { C.chain = settings().chain; C.rubric = settings().chainRubric || 'all'; }
  if (!C.chain) { rollChain(); return; }
  const ch = C.chain;
  const idx = roleIndex();
  const slots = ch.slots.map((s, i) => {
    const f = s.family && S.famBy.get(s.family);
    const count = (idx[s.role] || []).length;
    return `${i ? '<div class="arrow">' + svg('<path d="M4 12h15M14 7l5 5-5 5"/>') + '</div>' : ''}
    <div class="cslot${s.locked ? ' locked' : ''}" data-i="${i}" style="--h:${f ? cat(f.category).hue : 220}">
      <div class="cs-top"><span class="num">${i + 1}</span><span class="role" title="${esc(CHAIN_ROLES[s.role]?.de || '')}">${esc(s.label)}</span>
        <button class="cs-lock" data-lock title="${s.locked ? 'Entsperren' : 'Sperren – bleibt beim Würfeln stehen'}">${LOCK(s.locked)}</button></div>
      <button class="cs-main" data-pick title="Anderes Plugin wählen">${slotFace(f)}
        <div class="cs-name"><b>${esc(f ? f.name : '—')}</b><small>${esc(f ? f.vendor : CHAIN_ROLES[s.role]?.de || '')}</small></div></button>
      <div class="cs-tip">${esc(s.tip)}</div>
      <div class="cs-acts">
        <button data-roll title="Nur dieses Modul würfeln (${count} zur Auswahl)">${DICE}</button>
        <button data-left title="Nach vorne" ${i ? '' : 'disabled'}>‹</button>
        <button data-right title="Nach hinten" ${i < ch.slots.length - 1 ? '' : 'disabled'}>›</button>
        <button data-del title="Modul entfernen">×</button>
        <span class="cnt">${count}</span>
      </div>
    </div>`;
  }).join('');

  el.innerHTML = `
  <div class="chainhead">
    <div class="chips rubrics">${CHAIN_RUBRICS.map(r => `<button class="chip${C.rubric === r.id ? ' on' : ''}" data-rubric="${r.id}">${r.de}</button>`).join('')}</div>
    <div class="dice">
      <button class="btn dicebtn" id="rollPlugins" title="Gleiche Module, jedes bekommt ein anderes Plugin seiner Art">${DICE}<span>Plugins würfeln</span></button>
      <button class="btn pri dicebtn" id="rollChain" title="Neuer Aufbau aus „${esc(rubricName(C.rubric))}“">${DICE}<span>Neue Chain</span></button>
    </div>
  </div>
  <div class="chaininfo">
    <div class="ci-text">
      <small>${esc(rubricName(ch.rubric))} · ${ch.slots.length} Module</small>
      <h1>${esc(ch.name)}</h1>
      <p>${esc(ch.desc || '')}</p>
      ${ch.missing?.length ? `<p class="hint" style="padding:0">Ausgelassen, weil kein passendes Plugin installiert ist: ${esc(ch.missing.join(', '))}</p>` : ''}
    </div>
    <div class="btns">
      <button class="btn" id="undoChain" ${C.history.length ? '' : 'disabled'} title="Vorherige Chain">↶ Zurück</button>
      <button class="btn" id="saveChain">Als Rack speichern</button>
      <button class="btn pri" id="loadChain" ${ch.slots.some(s => s.family) ? '' : 'disabled'}>${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}In Live laden</button>
    </div>
  </div>
  <div class="flow${animate ? ' anim' : ''}">
    <div class="io">IN</div><div class="arrow">${svg('<path d="M4 12h15M14 7l5 5-5 5"/>')}</div>
    ${slots}
    <div class="arrow">${svg('<path d="M4 12h15M14 7l5 5-5 5"/>')}</div><div class="io">OUT</div>
    <button class="addslot" id="addSlot" title="Modul hinzufügen">+ Modul</button>
  </div>
  <p class="hint chainhint">Klick auf ein Plugin wählt ein anderes aus. Das Schloss hält ein Modul fest, wenn du würfelst. „In Live laden“ legt die ganze Kette in dieser Reihenfolge auf die gewählte Spur.</p>`;
}

/* ---------- picking by hand ---------- */

function openPicker(i) {
  const s = C.chain.slots[i];
  const idx = roleIndex();
  const fits = (idx[s.role] || []).map(k => S.famBy.get(k)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const m = $('#modal');
  const listHTML = (q, all) => {
    const src = all ? S.fams.filter(f => f.loadable && showable(f) && f.kind !== 'inst') : fits;
    const ql = q.toLowerCase();
    return src.filter(f => !ql || f.hay.includes(ql)).slice(0, 300).map(f =>
      `<button class="pk${f.key === s.family ? ' on' : ''}" data-k="${esc(f.key)}" style="--h:${cat(f.category).hue}"><i class="dot"></i><span class="t">${esc(f.name)}</span><span class="v">${esc(f.vendor)}</span></button>`).join('')
      || '<div class="hint">Nichts gefunden.</div>';
  };
  m.innerHTML = `<div class="dlg picker"><h3>${esc(s.label)}</h3><p>${fits.length} passende Plugins in deiner Bibliothek.</p>
    <input class="field" id="pkQ" placeholder="Suchen" autocomplete="off">
    <label class="check" style="margin:8px 0"><input type="checkbox" id="pkAll"> Alle Effekte zeigen</label>
    <div class="pklist" id="pkList">${listHTML('', false)}</div>
    <div class="btns"><button class="btn" data-no>Schließen</button></div></div>`;
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
  const roles = Object.entries(CHAIN_ROLES).filter(([k]) => (idx[k] || []).length).sort((a, b) => a[1].de.localeCompare(b[1].de, 'de'));
  menu(x, y, roles.map(([k, r]) => ({
    label: r.de, hint: String(idx[k].length),
    fn: () => {
      remember();
      const s = { role: k, label: r.de, tip: '', prefer: '', family: null, locked: false };
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
      const items = C.chain.slots.filter(s => s.family).map(s => ({ family: s.family, format: null }));
      return loadRack({ name: C.chain.name, items });
    }
    if (t.id === 'saveChain') {
      const name = await ask('Als Rack speichern', 'Das Rack erscheint links in der Bibliothek unter „Racks“.', C.chain.name);
      if (!name) return;
      const rack = { id: uid(), name, items: C.chain.slots.filter(s => s.family).map(s => ({ family: s.family, format: null })) };
      S.user.racks.push(rack);
      saveUser();
      toast(`Rack „${name}“ gespeichert`, 'ok', { label: 'Zeigen', fn: () => { S.drawer = { type: 'rack', id: rack.id }; show('lib'); renderDrawer(); } });
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
      { label: 'Nur dieses Plugin in Live laden', bold: true, fn: () => loadFam(f) },
      { label: 'Details', fn: () => { show('lib'); openInfo(f.key); } },
      { label: S.user.favs.includes(f.key) ? 'Aus Favoriten entfernen' : 'Zu Favoriten', fn: () => { toggleFav(f.key); renderChains(); } },
    ]);
  });
}

bindChains();
