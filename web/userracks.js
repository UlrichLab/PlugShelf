'use strict';
/* PlugShelf – racks saved in the User Library's standard rack folders
   (Presets › Instruments › Instrument Rack, Drum Rack, Audio Effects › Audio Effect Rack, MIDI Effects › MIDI Effect Rack).
   They show up in the sidebar under Racks › In User Library; a click loads the rack onto the selected track. */

S.uracks = [];
const UR_KINDS = { inst: 'Instrument Racks', drum: 'Drum Racks', fx: 'Audio Effect Racks', midi: 'MIDI Effect Racks' };
const UR_HUE = { inst: 268, drum: 8, fx: 200, midi: 140 };
const isUserRackView = () => /^ur:/.test(S.f.coll || '');

async function loadUserRacks() {
  try { S.uracks = await api.get('/api/userracks'); } catch { /* app busy */ }
  if (S.view === 'lib') renderLib();
}

function userRackSide() {
  const n = k => S.uracks.filter(x => x.kind === k).length;
  const kinds = Object.keys(UR_KINDS).filter(k => n(k));
  if (!kinds.length) return '';
  return '<div class="subh">In User Library</div>' + kinds.map(k =>
    `<button class="item${S.f.coll === 'ur:' + k ? ' on' : ''}" data-coll="ur:${k}" style="--h:${UR_HUE[k]}"><i class="dot"></i><span class="t">${UR_KINDS[k]}</span><span class="n">${n(k)}</span></button>`).join('');
}

function renderUserRacks() {
  const kind = S.f.coll.slice(3), q = (S.f.q || '').toLowerCase();
  const list = S.uracks.filter(x => x.kind === kind && (!q || (x.name + ' ' + x.sub).toLowerCase().includes(q)))
    .sort((a, b) => (a.sub || '').localeCompare(b.sub || '') || a.name.localeCompare(b.name));
  $('#title').textContent = q ? `Search “${S.f.q}”` : UR_KINDS[kind];
  $('#count').textContent = `${list.length} rack${list.length === 1 ? '' : 's'}`;
  $('#fmts').innerHTML = '';
  $('#shelfWrap').hidden = true;
  $('#grid').innerHTML = list.map((x, i) => {
    const head = x.sub && (i === 0 || list[i - 1].sub !== x.sub) ? `<div class="grp" style="--h:${UR_HUE[kind]}"><i class="dot"></i>${esc(x.sub)}</div>` : '';
    return head + `<div class="card" data-urack="${esc(x.id)}" style="--h:${UR_HUE[kind]}"><div class="face">
      <div class="fv">${esc(UR_KINDS[kind].replace(/s$/, ''))}</div><div class="fn">${esc(x.name)}</div>
      <div class="ff"><span class="fc">${esc(x.sub || 'User Library')}</span></div></div></div>`;
  }).join('');
  if (list.length) $('#empty').hidden = true;
  else showEmpty(`<h3>No ${UR_KINDS[kind]} here</h3><p>Racks you save in Live land in User Library › Presets.</p>`);
}

async function loadUserRack(id) {
  const x = S.uracks.find(r => r.id === id);
  let r;
  try { r = await api.post('/api/userracks/load', { id }); } catch { r = { ok: false, msg: 'PlugShelf is not responding' }; }
  toast(r.ok ? `${x?.name || 'Rack'} → Live` : (r.msg || 'Loading failed'), r.ok ? 'ok' : 'err', r.offline ? { label: 'Setup', fn: () => show('setup') } : null);
}

/** Details panel: what is inside the rack and what lies on its macros. */
async function renderUserRackInfo(d, id) {
  const x = S.uracks.find(r => r.id === id);
  if (!x) { S.drawer = null; d.hidden = true; return; }
  const head = `<div class="dhead"><h3>${esc(x.name)}</h3><button class="x" data-close>×</button></div>`;
  const load = `<div class="btns"><button class="btn pri" data-urload="${esc(x.id)}">${svg('<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>')}Load in Live</button></div>`;
  d.innerHTML = head + `<div class="dbody">${load}<p class="hint">Reading the rack…</p></div>`;
  let info;
  try { info = await api.get('/api/userracks/info?id=' + encodeURIComponent(id)); } catch { info = { ok: false, msg: 'PlugShelf is not responding' }; }
  if (S.drawer?.type !== 'urack' || S.drawer.id !== id) return;          // another rack was picked meanwhile
  const devs = (info.devices || []).map(v => `<li>${esc(v.name)}${v.kind === 'live' ? ' <small>Live</small>' : ''}</li>`).join('');
  const macros = (info.macros || []).map(m => `<div class="umacro"><b>${m.index}</b><div><div class="nm">${esc(m.name)}</div>${m.targets.length ? m.targets.map(t => `<div class="meta">${esc(t)}</div>`).join('') : `<div class="meta">${(info.devices || []).some(v => v.kind === 'live') ? 'mapped inside Live devices' : 'not mapped'}</div>`}</div></div>`).join('');
  d.innerHTML = head + `<div class="dbody">${load}
    <dl class="kv"><dt>Type</dt><dd>${esc(UR_KINDS[x.kind].replace(/s$/, ''))}</dd><dt>Folder</dt><dd>${esc(x.sub || 'User Library')}</dd></dl>
    ${info.ok === false ? `<p class="hint">${esc(info.msg || 'Cannot read the rack')}</p>` : `
    <div class="sect"><h5>Devices</h5>${devs ? `<ol class="udevs">${devs}</ol>` : '<p class="hint">No devices found.</p>'}</div>
    <div class="sect"><h5>Macros</h5>${macros || '<p class="hint">No macros in use.</p>'}</div>`}</div>`;
}

$('#grid').addEventListener('click', e => {
  const c = e.target.closest('[data-urack]');
  if (!c) return;
  if (!settings().dblLoad) return loadUserRack(c.dataset.urack);
  // double-click mode: one click selects and shows what is inside, a double-click loads
  $$('#grid [data-urack].sel').forEach(x => x.classList.remove('sel'));
  c.classList.add('sel');
  S.drawer = { type: 'urack', id: c.dataset.urack };
  renderDrawer();
});
$('#grid').addEventListener('dblclick', e => {
  const c = e.target.closest('[data-urack]');
  if (c && settings().dblLoad) loadUserRack(c.dataset.urack);
});
$('#drawer').addEventListener('click', e => {
  const b = e.target.closest('[data-urload]');
  if (b) loadUserRack(b.dataset.urload);
});
loadUserRacks();
