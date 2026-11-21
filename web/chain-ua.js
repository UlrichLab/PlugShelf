'use strict';
/* PlugShelf – UA Console channel-strip presets as chains.
   PlugShelf reads the presets from the user's own UA installation (/api/uapresets: group, name, UAD
   plugins in insert order) and turns each into a chain under "UAD Chains", sub-grouped like in Console.
   The exact plugin settings stay in UA's own format; the racks use PlugShelf's starting values. */

/** Sub-groups shown under "UAD Chains", one per Console preset folder. */
function uaGroupId(group) { return 'ua-' + String(group).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/** Role, macros and a stand-in kind for a UAD plugin name. */
function uaSlotFor(plugin) {
  const n = plugin.replace(/^UAD\s+/i, '');
  const core = n.replace(/\s+Legacy$/i, '').replace(/^UA\s+/i, '');
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // The exact plugin, or another version of the same model (DSP ↔ UADx, Legacy ↔ new)
  const device = new RegExp(esc(core).replace(/\\ /g, '.?'), 'i');
  const R = [
    [/610|neve|1073|1084|api ?(pre|vision)|channel strip|cs-1|vt-737|voxbox|century/i, 'preamp', ['Drive'], /preamp|channel|neve|610|console|tube/i],
    [/pultec|eq\b|eqp|equali|bax|maag|massive|helios|ex-1(?!\w)/i, 'eq', ['Low', 'High'], /pultec|eqp|\beq-?p|eq/i],
    [/1176|la-2a|la-3a|fairchild|175|176|distressor|compress|33609|2254|ssl g|api 2500|vari/i, 'comp', ['Thresh'], /1176|la-?2a|opto|fet|comp/i],
    [/limit|maximi/i, 'limiter', ['Thresh'], /limit|maximi/i],
    [/realverb|reflection|rs-1|plate|emt|lexicon|chamber|reverb|verb/i, 'reverb', ['Mix', 'Decay'], /verb|plate|room|hall/i],
    [/delay|dm-1|echo|ep-34|galaxy|re-201/i, 'delay', ['Mix', 'Feedback'], /delay|echo/i],
    [/chorus|dimension|ce-1|flang/i, 'chorus', ['Mix'], /chorus|dimension/i],
    [/amp|fender|marshall|ampeg|engl|friedman|diezel|suhr|gallien|eden/i, 'amp', ['Gain', 'Tone'], /amp|marshall|plexi|bass one|rocker|ampeg/i],
    [/raw|tube screamer|overdrive|ts808/i, 'dist', ['Drive'], /drive|dist|screamer|raw/i],
    [/auto-?tune|vocal tune/i, 'tune', ['Retune'], /auto-?tune|tune/i],
    [/moog|filter/i, 'filter', ['Cutoff', 'Reso'], /filter|moog/i],
    [/studer|atr|tape|oxide/i, 'tape', ['Drive'], /tape|studer/i],
    [/de-?ess/i, 'deess', ['Thresh'], /de-?ess/i],
    [/transient/i, 'transient', ['Attack'], /transient/i],
  ];
  // EX-1 is UA's compressor/EQ; treat it as the compressor it is mostly used as
  if (/^ex-1$/i.test(core)) return { role: 'comp', label: n, device, prefer: /1176|comp|bus/i, macros: ['Thresh'], tip: `${n} from the Console preset.` };
  const hit = R.find(([re]) => re.test(core)) || [null, 'eq', [], null];
  return { role: hit[1], label: n, device, prefer: hit[3] || undefined, macros: hit[2], tip: `${n} from the Console preset.` };
}

/** Console presets → chain templates (rubric "uad", sub-group "ua-<folder>"). */
function uaTemplates(list) {
  return (list || []).map((p, i) => ({
    id: 'ua-' + i + '-' + uaGroupId(p.name),
    rubric: 'uad',
    also: [uaGroupId(p.group)],
    uaGroup: p.group,
    name: p.name,
    desc: `UA Console preset (${p.group}): ${p.plugins.map(x => x.replace(/^UAD\s+/i, '')).join(' → ')}.`,
    src: 'UA Console channel-strip preset on this Mac – plugin order from the preset; the exact settings stay in UA’s format, the rack starts from PlugShelf’s values',
    slots: p.plugins.map(uaSlotFor),
  }));
}

/** Adds the Console presets and their folders as sub-groups of "UAD Chains". */
function uaRegister(list) {
  const groups = [...new Set((list || []).map(p => p.group))];
  for (const g of groups) if (!CHAIN_RUBRICS.some(r => r.id === uaGroupId(g))) CHAIN_RUBRICS.push({ id: uaGroupId(g), name: g, group: 'ua' });
  CHAIN_TEMPLATES.push(...uaTemplates(list));
}

if (typeof module !== 'undefined') module.exports = { uaTemplates, uaSlotFor, uaGroupId, uaRegister };
