'use strict';
/* PlugShelf – Kontakt libraries and presets in the library view.
   Libraries come from Kontakt's own database (/api/kontakt), with NI's artwork as pictures; a click loads
   Kontakt onto the selected track. Presets are Kontakt .vstpreset files in the User Library – they hold
   Kontakt with an instrument loaded, so a click puts the instrument straight onto the track. */

S.kontakt = { libraries: [], presets: [] };
const K_GROUPS = ['Strings', 'Brass', 'Woodwinds', 'Piano & Keys', 'Drums & Percussion', 'Synths & Pads', 'Soundscapes & FX',
  'Guitars & Plucked', 'Bass', 'Vocals', 'Loops', 'Other'];
const K_HUE = { Strings: 28, Brass: 45, Woodwinds: 95, 'Piano & Keys': 32, 'Drums & Percussion': 8, 'Synths & Pads': 268,
  'Soundscapes & FX': 222, 'Guitars & Plucked': 14, Bass: 300, Vocals: 340, Loops: 190, Other: 220 };
const isKontaktView = () => S.f.coll === 'kontakt' || S.f.coll === 'kpresets';

async function loadKontakt(refresh = false) {
  try { S.kontakt = await api.get('/api/kontakt' + (refresh ? '?refresh=1' : '')); } catch { /* app busy */ }
  if (S.view === 'lib') renderLib();
}

function kontaktItems(skip) {
  const presets = S.f.coll === 'kpresets';
  const q = (S.f.q || '').toLowerCase();
  return (presets ? S.kontakt.presets : S.kontakt.libraries).filter(x =>
    (!presets || skip === 'kind' || !S.f.kkind || (x.kind || 'preset') === S.f.kkind) && (skip === 'cat' || !S.f.kcat || x.category === S.f.kcat) && (skip === 'ven' || !S.f.kven || x.vendor === S.f.kven) && (!q || (x.name + ' ' + (x.library || '') + ' ' + x.category + ' ' + (x.vendor || '')).toLowerCase().includes(q)));
}

/** The saved preset for a library, if there is one ("Library - Instrument"). */
const presetFor = lib => S.kontakt.presets.find(p => p.library === lib.name);

function kontaktCard(x, presets) {
  const sub = presets ? (x.kind === 'rack' ? 'Instrument Rack · ' : '') + x.library : `${x.instruments} instrument${x.instruments === 1 ? '' : 's'}${x.online === false ? ' · drive offline' : ''}`;
  const attr = presets ? `data-kp="${esc(x.id)}"` : `data-kl="${esc(x.id)}"`;
  const dead = !presets && x.online === false ? ' dead' : '';
  if (x.art) {
    return `<div class="card pic${dead}" ${attr} style="--h:${K_HUE[x.category] || 220}"><div class="face">
      <img class="bg" src="${esc(x.art)}" alt="" loading="lazy"><img class="fg" src="${esc(x.art)}" alt="" loading="lazy">
      <div class="cap"><div class="t"><b>${esc(x.name)}</b><small>${esc(sub)}</small></div>${presets || presetFor(x) ? `<span class="fmts"><b>${x.kind === 'rack' ? 'RACK' : 'PRESET'}</b></span>` : ''}</div></div></div>`;
  }
  return `<div class="card${dead}" ${attr} style="--h:${K_HUE[x.category] || 220}"><div class="face">
    <div class="fv">${esc(presets ? (x.kind === 'rack' ? 'Kontakt rack' : 'Kontakt preset') : 'Kontakt library')}</div><div class="fn">${esc(x.name)}</div>
    <div class="ff"><span class="fc">${esc(sub)}</span>${!presets && presetFor(x) ? '<span class="fmts"><b>PRESET</b></span>' : ''}</div></div></div>`;
}

function renderKontakt() {
  const presets = S.f.coll === 'kpresets';
  const list = kontaktItems().slice().sort((a, b) => K_GROUPS.indexOf(a.category) - K_GROUPS.indexOf(b.category) || a.name.localeCompare(b.name));
  let title = presets ? 'Kontakt Presets' : 'Kontakt Libraries';
  if (S.f.kcat) title += ' · ' + S.f.kcat;
  if (S.f.kven) title += ' · ' + S.f.kven;
  if (S.f.q) title = `Search “${S.f.q}”`;
  $('#title').textContent = title;
  $('#count').textContent = `${list.length} ${presets ? 'presets' : 'libraries'}`;
  $('#shelfWrap').hidden = true;
  // top bar: the plugin-format chips make no sense here – presets get All / Presets / Racks instead
  const all = presets ? kontaktItems('kind') : [];
  const n = k => all.filter(x => (x.kind || 'preset') === k).length;
  $('#fmts').innerHTML = presets ? [[null, 'All', all.length], ['preset', 'Presets', n('preset')], ['rack', 'Racks', n('rack')]].map(([k, l, c]) =>
    `<button class="chip${(S.f.kkind || null) === k ? ' on' : ''}" data-kk="${k || ''}">${l} <small>${c}</small></button>`).join('') : '';
  const note = presets ? '' : `<div class="knote">A library with <b>PRESET</b> loads Kontakt with its saved instrument. The others load an empty Kontakt – pick the instrument there, then save it as a preset in Live (User Library › Kontakt Presets). Instrument Racks with Kontakt show up too when saved in a folder named <b>Kontakt Presets</b> (e.g. Presets › Instruments › Instrument Rack › Kontakt Presets).</div>`;
  $('#grid').innerHTML = note + list.map((x, i) => {
    const head = i === 0 || list[i - 1].category !== x.category
      ? `<div class="grp" style="--h:${K_HUE[x.category] || 220}"><i class="dot"></i>${esc(x.category)}<span>${list.filter(y => y.category === x.category).length}</span></div>` : '';
    return head + kontaktCard(x, presets);
  }).join('');
  if (list.length) $('#empty').hidden = true;
  else showEmpty(presets
    ? '<h3>No Kontakt presets yet</h3><p>Load an instrument in Kontakt inside Live and save it with the save icon in the device header (User Library › Kontakt Presets). It shows up here and loads with one click.</p>'
    : '<h3>No Kontakt libraries found</h3><p>PlugShelf reads them from Kontakt 8’s own database.</p>');
}

/** Sidebar categories while a Kontakt view is open. */
function kontaktSide() {
  const cc = {};
  for (const x of kontaktItems('cat')) cc[x.category] = (cc[x.category] || 0) + 1;
  return '<h4>Categories</h4>' + K_GROUPS.filter(g => cc[g] || S.f.kcat === g).map(g =>
    `<button class="item${S.f.kcat === g ? ' on' : ''}" data-kcat="${esc(g)}" style="--h:${K_HUE[g]}"><i class="dot"></i><span class="t">${esc(g)}</span><span class="n">${cc[g] || 0}</span></button>`).join('') + kontaktVendors();
}

/** Makers, most libraries first; "Other" last. */
function kontaktVendors() {
  const vc = {};
  for (const x of kontaktItems('ven')) vc[x.vendor || 'Other'] = (vc[x.vendor || 'Other'] || 0) + 1;
  const names = Object.keys(vc).sort((a, b) => (a === 'Other') - (b === 'Other') || vc[b] - vc[a] || a.localeCompare(b));
  if (S.f.kven && !vc[S.f.kven]) names.unshift(S.f.kven);
  return '<h4>Vendors</h4>' + names.map(v =>
    `<button class="item${S.f.kven === v ? ' on' : ''}" data-kven="${esc(v)}"><span class="t">${esc(v)}</span><span class="n">${vc[v] || 0}</span></button>`).join('');
}

async function loadKontaktLibrary(id) {
  const lib = S.kontakt.libraries.find(x => x.id === id);
  if (lib?.online === false) return toast(`${lib.name}: its drive is not connected.`, 'err');
  const pre = lib && presetFor(lib);
  if (pre) return loadKontaktPreset(pre.id);
  const f = S.fams.find(x => /^kontakt 8$/i.test(x.name)) || S.fams.find(x => /^kontakt( \d+)?$/i.test(x.name));
  if (!f) return toast('Kontakt is not installed as a plugin.', 'err');
  await loadFam(f);
  toast(`Empty Kontakt is on the track – no preset for “${lib?.name || 'this library'}” yet. Pick it in Kontakt, then save a preset.`, 'ok');
}

async function loadKontaktPreset(id) {
  const p = S.kontakt.presets.find(x => x.id === id);
  let r;
  try { r = await api.post('/api/kontakt/load', { id }); } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  toast(r.ok ? `${p?.name || 'Preset'} → Live` : (r.msg || 'Loading failed'), r.ok ? 'ok' : 'err', r.offline ? { label: 'Setup', fn: () => show('setup') } : null);
}

$('#grid').addEventListener('click', e => {
  const l = e.target.closest('[data-kl]'), p = e.target.closest('[data-kp]');
  if (l) loadKontaktLibrary(l.dataset.kl);
  if (p) loadKontaktPreset(p.dataset.kp);
});
$('#fmts').addEventListener('click', e => {
  const b = e.target.closest('[data-kk]');
  if (b) { S.f.kkind = b.dataset.kk || null; renderLib(); }
});
$('#side').addEventListener('click', e => {
  const kk = e.target.closest('[data-kkind]');
  if (kk) { S.f.kkind = kk.dataset.kkind === 'all' ? null : kk.dataset.kkind; return renderLib(); }
  const v = e.target.closest('[data-kven]');
  if (v) { S.f.kven = S.f.kven === v.dataset.kven ? null : v.dataset.kven; $('#main').scrollTop = 0; return renderLib(); }
  const t = e.target.closest('[data-kcat]');
  if (t) { S.f.kcat = S.f.kcat === t.dataset.kcat ? null : t.dataset.kcat; $('#main').scrollTop = 0; renderLib(); }
});
loadKontakt();
