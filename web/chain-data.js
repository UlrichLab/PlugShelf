'use strict';
/* PlugShelf – chain building blocks: module roles, categories and chain templates.
   A template is a typical signal flow (e.g. a vocal strip in the style of an Apollo/Unison chain);
   every slot names a role, and the randomizers fill roles with plugins from the user's library. */

/** Module roles. A plugin family fits a role by its category and/or its name. */
const CHAIN_ROLES = {
  inst:      { name: 'Instrument', re: /(?!)/ },   // filled from instrument plugins in chains.js (roleIndex)
  preamp:    { name: 'Preamp / Channel', cats: ['Channel Strip'], re: /preamp|pre-?amp|channel ?strip|console|\bneve\b|1073|\b610\b|\bapi\b|\bssl\b|avalon|manley|voxbox|v76|unison|\bstrip\b|\bcs-?1\b/i, not: /meter|analy|2254|33609|\b2500\b|bus ?comp|recall/i },
  eq:        { name: 'EQ', cats: ['EQ'], re: /\beq\b|equali|pultec|eqp|pro-?q|\bq\d\b|maag|tilt|passive eq/i, not: /soothe|gullfoss|unmask|match eq|de[- ]?ess/i },
  dyneq:     { name: 'Dynamic EQ / Resonances', re: /soothe|gullfoss|dynamic ?eq|smart:?eq|smarteq|resonance|pro-?q ?[34]|unmask|trackspacer|bx_dyneq|\bf6\b/i },
  comp:      { name: 'Compressor', cats: ['Dynamics'], re: /compress|\bcomp\b|1176|\b176\b|la-?2a|la-?3a|fairchild|distressor|opto|\bfet\b|\bvca\b|\b76\b|glue|2254|33609|\b2500\b|vari-?mu|fatso|dbx ?160/i,
               not: /limit|maximi|gate|expand|transient|transgressor|de[- ]?ess|clip|multi-?band|\bmb\b|side-?chain|shaper|duck|volume|loudness ?meter|meter|spiff|smack|pumper|trackspacer/i, mode: 'either' },
  multiband: { name: 'Multiband Compressor', cats: ['Dynamics', 'Mastering'], re: /multi-?band|pro-?mb|\bmb\b|\bc[46]\b|dynamics|xtc|\bmbc\b/i, mode: 'both' },
  limiter:   { name: 'Limiter', re: /limit|maximi[sz]|\bl[123]\b|pro-?l\b|pro-?l ?2|elevate|loudness max/i, not: /unlimiter|meter/i },
  clipper:   { name: 'Clipper', re: /clip(per)?\b|kclip|standardclip|clip ?to ?zero|gclip/i, not: /de-?clip/i },
  gate:      { name: 'Gate / Expander', re: /\bgate|expander|pro-?g\b|noise ?gate|drumgate/i },
  transient: { name: 'Transient Shaper', re: /transient|spiff|smack|transgressor|trans-?x|\bpunch|envelope|\bimpact\b/i, not: /meter/i },
  deess:     { name: 'De-Esser', re: /de[- ]?ess|sibil|pro-?ds|esser/i },
  sat:       { name: 'Saturation', cats: ['Distortion'], re: /satur|tape|\btube|warm|heat|inflator|culture|karacter|decapitator|saturn|radiator|j37|ampex|studer|kramer|\btct|analog|harmonic|exciter/i,
               not: /fuzz|bit ?crush|crush|decimat|trash|destroy|grind|rocker|\bamp\b|guitar|stomp|pedal|shred|bass amp|devil|screamer|blackdist|distorange|megadual|bassdude/i, mode: 'either' },
  dist:      { name: 'Distortion', cats: ['Distortion'], re: /distort|fuzz|drive|dirt|trash|decapitator|devil|saturn|crush|destroy/i },
  amp:       { name: 'Amp / Pedal', re: /\bamp\b|amplifier|guitar|bass ?amp|\bcab\b|\brig\b|sansamp|darkglass|bass one|rocker|shred|stomp|pedal|ampeg|tonex|amplitube|slapper/i, not: /sample|example|de-?noise|denois|opto/i },
  tape:      { name: 'Tape / Vintage', re: /tape|j37|ampex|studer|kramer|\batr\b|vinyl|wow|flutter|kiss of shame|lo-?fi|cassette|rc-?20|retro|vhs/i },
  crush:     { name: 'Bitcrusher / Lo-Fi', re: /bit ?crush|crush|decimat|lo-?fi|redux|degrad|trash|destroy|vinyl/i },
  exciter:   { name: 'Exciter / Air', re: /excit|aural|vitamin|enhanc|\bair\b|maag|clarity|inflator|low ?end|bass ?control|subhoofer|rbass|maxxbass|spectre/i },
  reverb:    { name: 'Reverb', cats: ['Reverb'], re: /reverb|\bverb/i, mode: 'either', not: /de-?reverb|dereverb/i },
  delay:     { name: 'Delay', cats: ['Delay'], re: /delay|echo/i, mode: 'either' },
  chorus:    { name: 'Chorus / Doubler', re: /chorus|dimension|ensemble|jun-?6|unison|microshift|doubler|vibrato/i },
  mod:       { name: 'Modulation', cats: ['Modulation'], re: /chorus|flang|phas|tremol|vibrato|rotary|leslie|ensemble/i, mode: 'either', not: /stutter|glitch/i },
  filter:    { name: 'Filter', cats: ['Filter'], re: /filter|\bwah/i, mode: 'either', not: /eq\b/i },
  tune:      { name: 'Pitch Correction', re: /auto-?tune|melodyne|pitch ?correct|waves ?tune|graillon|metatune|\btune\b|alterboy|pitchmap/i },
  pitch:     { name: 'Pitch / Formant', cats: ['Pitch'], re: /pitch|alterboy|octav|formant|harmoni[sz]|shift|vocalsynth|h3000|crystallizer/i, mode: 'either', not: /auto-?tune|melodyne|pitchmonster|vovious|tuner/i },
  width:     { name: 'Stereo Width', cats: ['Spatial'], re: /stereo|width|wider|imager|microshift|doubler|haas|panman|spread|panner/i, mode: 'either', not: /meter|analy|scope|5\.[01]|7\.1|360|lfe|surround|dorrough|tuner/i },
  sidechain: { name: 'Sidechain / Pump', re: /shaperbox|volume ?shaper|kickstart|lfo ?tool|trackspacer|\bduck|\bpump|side-?chain|\brift\b/i, not: /midi/i },
  glitch:    { name: 'Glitch / Stutter', re: /stutter|glitch|turnado|effectrix|fragments|portal|graindad|\bgrain|crystallizer|shaperbox|looper/i },
  suite:     { name: 'Mastering Suite', re: /^ozone \d+( advanced)?$|t-racks|^neutron \d+$|master ?plan|^elevate/i, nameOnly: true },
  meter:     { name: 'Analyzer / Meter', cats: ['Analyzer'], re: /meter|analy|scope|loudness|lufs|insight|tonal balance|mastercheck|\bspan\b|youlean|metric ?ab/i, mode: 'either', not: /compress|limit|tuner/i },
};

/** Categories shown above the randomizer: what the chain is for, and (second row) the genre. */
const CHAIN_RUBRICS = [
  { id: 'all', name: 'All' },
  { id: 'famous', name: 'Famous Chains' },
  { id: 'uad', name: 'UAD Chains' },
  { id: 'vocals', name: 'Vocals' },
  { id: 'drums', name: 'Drums' },
  { id: 'bass', name: 'Bass' },
  { id: 'perc', name: 'Percussion' },
  { id: 'instr', name: 'Instrument Effects' },
  { id: 'lead', name: 'Trance & Leads' },
  { id: 'mod', name: 'Modulation & FX' },
  { id: 'returns', name: 'Send Effects' },
  { id: 'mixbus', name: 'Mix Bus' },
  { id: 'master', name: 'Mastering' },
  { id: 'pop', name: 'Pop', group: 'genre' },
  { id: 'hiphop', name: 'Hip-Hop', group: 'genre' },
  { id: 'rnb', name: 'R&B, Soul & Funk', group: 'genre' },
  { id: 'electronic', name: 'Techno & Electronic', group: 'genre' },
  { id: 'dubtechno', name: 'Dub Techno', group: 'genre' },
  { id: 'indie', name: 'Indie & Rock', group: 'genre' },
];

/** A template shows under its own category and under every category in `also` (genres, "famous"). */
function chainInRubric(t, r) {
  return r === 'all' || t.rubric === r || (t.also || []).includes(r);
}

/* Slot fields:
   role    – the kind of module (see CHAIN_ROLES)
   label   – shown on the slot and stored as the device's info text in the rack
   set     – starting values for knobs on the rack's macros, e.g. { Ratio: [4, ''], Attack: [30, 'ms'] }
             (common engineering starting points)
   macros  – knob labels that get a macro first: the settings the chain leaves to taste
   device  – regex: the named hardware; its plugin emulations are always picked when there are any,
             otherwise a comparable plugin (see prefer) stands in and the slot says so
   only    – regex: pick only from plugins matching maker + name when there are any (UAD chains)
   prefer  – regex: plugins that fit this job are picked most of the time, e.g. 1176-style for a fast compressor
   opt     – chance that "New chain" includes the slot (1 when missing)
   tip     – why the module sits here */
const P = {
  fast: /1176|\b176\b|\b76\b|\bfet\b|distressor|pro-?c|vca|cla-?76|black 76|\bh-?comp/i,
  opto: /la-?2a|la-?3a|opto|\b2a\b|cl ?1b|teletronix|white 2a|rvox|leveler|tube/i,
  bus: /\bssl\b|bus|glue|\bvca\b|api ?2500|g-?comp|shadow hills|fairchild|\b670\b/i,
  vintageEq: /pultec|eqp|\bmeq\b|tube|1073|\bneve\b|api|passive|vintage|maag|\b88rs\b/i,
  surgicalEq: /pro-?q|\bq\d\b|equali[sz]er|digital|precision|parametric|\beq\b/i,
  plate: /plate|emt|140|\b250\b/i,
  hall: /hall|cathedral|supermassive|shimmer|blackhole|valhalla|space|vintage ?verb|lexicon|\b480\b|pro-?r/i,
  room: /room|chamber|ambien|studio|spring/i,
  tapeDelay: /echoboy|tape|space echo|re-?201|timeless|galaxy|h-?delay|primaltap|el capitan|\bdig\b/i,
  tapeSat: /tape|j37|ampex|studer|kramer|\batr\b|vintage tape/i,
  bassAmp: /bass|sansamp|darkglass|ampeg|amp\b|tube|rbass|bass one/i,
  wideChorus: /dimension|chorus|ensemble|jun|microshift|doubler|unison/i,
  phaserFlanger: /phas|flang/i,
};

/** UAD / UADx plugins: matched against maker and name */
const U = /universal audio/i;

const CHAIN_TEMPLATES = [
  /* ---------- UAD Chains (Apollo / Unison style, UAD plugins only where you have them) ---------- */
  { id: 'uad-unison-vocal', rubric: 'uad', name: 'UAD Unison Vocal: 610 → 1176 → LA-2A → Pultec', desc: 'The Apollo classic: 610 tube preamp, 1176 for the peaks, LA-2A to smooth, Pultec for sheen and air.', slots: [
    { role: 'preamp', label: 'UA 610 Preamp', only: U, prefer: /610/i, tip: 'Tube warmth at the input – a Unison preamp on the Apollo.' },
    { role: 'comp', label: '1176 – fast', set: { Ratio: [4, ''] }, only: U, prefer: /1176|\b176\b/i, tip: 'Ratio 4, medium attack, fast release: catches the peaks.' },
    { role: 'comp', label: 'LA-2A – opto', only: U, prefer: /la-?2a/i, tip: '2–4 dB of peak reduction, smooths gently.' },
    { role: 'eq', label: 'Pultec EQP-1A', only: U, prefer: /pultec/i, tip: 'Lift 10–12 kHz, the low-end trick at 100 Hz.' },
    { role: 'reverb', label: 'EMT 140 Plate', set: { Mix: [15, '%'] }, only: U, prefer: /emt 140|pure plate/i, opt: .6, tip: 'The vocal plate.' },
  ] },
  { id: 'uad-neve-vocal', rubric: 'uad', name: 'UAD Neve Vocal: Neve → 1176 → LA-2A → EMT 140', desc: 'Dense, mid-forward Neve sound – rock and soul.', slots: [
    { role: 'preamp', label: 'Neve preamp/EQ', only: U, prefer: /neve (1084|88rs|1073)/i, tip: 'Neve mids and transformer saturation.' },
    { role: 'comp', label: '1176', set: { Ratio: [4, ''] }, only: U, prefer: /1176/i, tip: 'Fast, for presence.' },
    { role: 'comp', label: 'LA-2A', only: U, prefer: /la-?2a/i, tip: 'Gentle leveling.' },
    { role: 'reverb', label: 'EMT 140 Plate', set: { Decay: [1.6, 's'], Mix: [15, '%'] }, only: U, prefer: /emt 140/i, tip: 'Plate at 1.5–2 s.' },
  ] },
  { id: 'uad-strip-vocal', rubric: 'uad', name: 'UAD Channel Strip Vocal (Avalon / Manley)', desc: 'A whole channel strip in one plugin, plus delay and space.', slots: [
    { role: 'preamp', label: 'Channel strip', only: U, prefer: /avalon|voxbox|century|precision channel/i, tip: 'Preamp, compressor and EQ in one.' },
    { role: 'comp', label: 'Distressor', set: { Ratio: [3, ''] }, only: U, prefer: /distressor/i, opt: .5, tip: 'Even more bite.' },
    { role: 'delay', label: 'Galaxy Tape Echo', set: { Mix: [12, '%'], Feedback: [25, '%'] }, only: U, prefer: /galaxy|precision delay/i, opt: .7, tip: 'Space Echo style tape delay.' },
    { role: 'reverb', label: 'Pure Plate / EMT 250', only: U, prefer: /pure plate|emt 250|480/i, tip: 'A shiny space.' },
  ] },
  { id: 'uad-drumbus', rubric: 'uad', name: 'UAD Drum Bus: Neve → SSL G Bus → Studer A800', desc: 'Channel colour, SSL glue and tape – the classic drum bus.', slots: [
    { role: 'preamp', label: 'Neve 88RS / 1084', only: U, prefer: /88rs|1084|neve/i, opt: .7, tip: 'EQ and colour.' },
    { role: 'comp', label: 'SSL G Bus', set: { Ratio: [4, ''], Attack: [30, 'ms'] }, only: U, prefer: /ssl g bus|api 2500/i, tip: 'Attack 30 ms, release auto, 2–4 dB.' },
    { role: 'sat', label: 'Studer A800', only: U, prefer: /studer|a800/i, tip: 'Tape saturation rounds off the transients.' },
    { role: 'eq', label: 'Pultec', only: U, prefer: /pultec/i, opt: .5, tip: 'Kick depth and cymbal sheen.' },
  ] },
  { id: 'uad-smash', rubric: 'uad', name: 'UAD Drum Smash: Distressor / 1176 all-buttons', desc: 'Studio-style parallel compression – put it on a return and blend it in.', slots: [
    { role: 'comp', label: 'Distressor / 1176', set: { Ratio: [10, ''], Attack: [1, 'ms'] }, only: U, prefer: /distressor|1176/i, tip: 'High ratio, fastest attack: crush it.' },
    { role: 'sat', label: 'Studer A800 / Raw', only: U, prefer: /studer|raw/i, opt: .7, tip: 'More dirt.' },
    { role: 'eq', label: 'Pultec', only: U, prefer: /pultec/i, tip: 'Lows and highs after the crush.' },
  ] },
  { id: 'uad-bass', rubric: 'uad', name: 'UAD Bass: Ampeg SVT → LA-2A → Pultec', desc: 'Amp growl, even level, depth.', slots: [
    { role: 'amp', label: 'Ampeg SVT', only: U, prefer: /ampeg|svt/i, tip: 'The rock bass amp.' },
    { role: 'comp', label: 'LA-2A / 175-B', only: U, prefer: /la-?2a|175|1176/i, tip: 'Even level.' },
    { role: 'eq', label: 'Pultec', only: U, prefer: /pultec/i, tip: 'Boost and cut the lows at once: the Pultec trick.' },
  ] },
  { id: 'uad-guitar', rubric: 'uad', name: 'UAD Guitar: Plexi → 1176 → Galaxy → EMT 140', desc: 'British amp, compressor, tape echo, plate.', slots: [
    { role: 'amp', label: 'Marshall Plexi', only: U, prefer: /marshall|plexi/i, tip: 'The classic rock amp.' },
    { role: 'comp', label: '1176', set: { Ratio: [4, ''] }, only: U, prefer: /1176/i, opt: .6, tip: 'More sustain.' },
    { role: 'delay', label: 'Galaxy Tape Echo', set: { Mix: [15, '%'], Feedback: [30, '%'] }, only: U, prefer: /galaxy/i, tip: 'Tape echo.' },
    { role: 'reverb', label: 'EMT 140', set: { Mix: [15, '%'] }, only: U, prefer: /emt 140|pure plate/i, tip: 'Plate.' },
  ] },
  { id: 'uad-keys', rubric: 'uad', name: 'UAD Keys: 610 → Studio D Chorus → EMT 250', desc: 'Warm tube, wide chorus, classy reverb – for electric piano and synths.', slots: [
    { role: 'preamp', label: 'UA 610', only: U, prefer: /610/i, tip: 'Tube warmth.' },
    { role: 'chorus', label: 'Studio D Chorus', set: { Mix: [40, '%'] }, only: U, prefer: /studio d|dimension/i, tip: 'The Dimension D chorus.' },
    { role: 'reverb', label: 'EMT 250 / Lexicon 480L', set: { Decay: [2.2, 's'], Mix: [20, '%'] }, only: U, prefer: /emt 250|480|capitol/i, tip: 'Classic digital reverb.' },
  ] },
  { id: 'uad-mixbus', rubric: 'uad', name: 'UAD Mix Bus: Studer → SSL G Bus → Pultec', desc: 'The analogue mix to tape – big-studio style.', slots: [
    { role: 'sat', label: 'Studer A800', only: U, prefer: /studer|a800/i, tip: 'Light tape saturation.' },
    { role: 'comp', label: 'SSL G Bus / API 2500', set: { Ratio: [2, ''], Attack: [30, 'ms'] }, only: U, prefer: /ssl g bus|api 2500|fairchild/i, tip: '1–2 dB of glue.' },
    { role: 'eq', label: 'Pultec / BAX', only: U, prefer: /pultec|bax/i, tip: 'Broad, musical moves.' },
  ] },
  { id: 'uad-master', rubric: 'uad', name: 'UAD Mastering: BAX EQ → Neve 33609 → Studer', desc: 'Mastering like an analogue room: EQ, bus compressor, tape – limiter last.', slots: [
    { role: 'eq', label: 'Dangerous BAX EQ', only: U, prefer: /bax/i, tip: 'Gentle shelves, high and low pass.' },
    { role: 'comp', label: 'Neve 33609 / Fairchild', set: { Ratio: [2, ''] }, only: U, prefer: /33609|fairchild|2254|ssl g bus/i, tip: '1 dB, slow.' },
    { role: 'sat', label: 'Studer A800', only: U, prefer: /studer/i, opt: .7, tip: 'Density.' },
    { role: 'limiter', label: 'Limiter', set: { Ceiling: [-1, 'dB'] }, tip: 'Always last.' },
  ] },
  { id: 'uad-chamber', rubric: 'uad', name: 'UAD Reverb Return: Capitol Chambers / Lexicon 480L', desc: 'Legendary rooms on a return track.', slots: [
    { role: 'eq', label: 'Pultec – before', only: U, prefer: /pultec/i, tip: 'Cut the lows so the reverb stays clear.' },
    { role: 'reverb', label: 'Capitol / 480L / EMT 250', set: { Mix: [100, '%'] }, only: U, prefer: /capitol|480|emt 250/i, tip: '100 % wet on the return.' },
  ] },
  { id: 'uad-synth', rubric: 'uad', name: 'UAD Synth FX: Moog Filter → Galaxy → Plate', desc: 'Moog filter to automate, tape echo, plate.', slots: [
    { role: 'filter', label: 'Moog Multimode Filter', only: U, prefer: /moog/i, tip: 'Automate the cutoff.' },
    { role: 'delay', label: 'Galaxy Tape Echo / Precision Delay', set: { Mix: [20, '%'], Feedback: [35, '%'] }, only: U, prefer: /galaxy|precision delay/i, tip: 'Echoes.' },
    { role: 'reverb', label: 'Pure Plate', set: { Mix: [20, '%'] }, only: U, prefer: /pure plate|emt|reflection/i, tip: 'Space.' },
  ] },

  /* ---------- Vocals ---------- */
  { id: 'voc-apollo', rubric: 'vocals', name: 'Apollo-style vocal strip', desc: 'The classic Unison path: preamp colour, a fast FET compressor catches peaks, an opto smooths, a tube EQ adds sheen.', slots: [
    { role: 'preamp', label: 'Preamp colour', prefer: /610|neve|1073|avalon|manley|api|v76|unison/i, opt: .7, tip: 'Colours right at the input – like a Unison preamp.' },
    { role: 'comp', label: 'Compressor – fast', set: { Ratio: [4, ''] }, prefer: P.fast, tip: 'Catches peaks (1176 style, 4:1, fast attack).' },
    { role: 'comp', label: 'Compressor – opto', prefer: P.opto, tip: 'Smooths the dynamics gently (LA-2A style).' },
    { role: 'eq', label: 'EQ – sheen', prefer: P.vintageEq, tip: 'Broad boosts for air and warmth (Pultec style).' },
    { role: 'deess', label: 'De-esser', opt: .6, tip: 'After EQ and compression the S sounds are louder.' },
  ] },
  { id: 'voc-modern', rubric: 'vocals', name: 'Modern pop / rap vocal', desc: 'Clean up first, compress in two stages, tame sibilance and resonances, then colour and space.', slots: [
    { role: 'tune', label: 'Pitch correction', opt: .6, tip: 'First, so everything after it sees clean pitch.' },
    { role: 'eq', label: 'EQ – subtractive', prefer: P.surgicalEq, tip: 'High-pass, mud and resonances out before compressing.' },
    { role: 'comp', label: 'Compressor – fast', set: { Ratio: [4, ''], Thresh: [-20, 'dB'], Attack: [10, 'ms'], Release: [80, 'ms'] }, prefer: P.fast, tip: 'Stage one: control the peaks.' },
    { role: 'deess', label: 'De-esser', tip: 'Compression brings up sibilance – tame it here.' },
    { role: 'dyneq', label: 'Smooth resonances', opt: .5, tip: 'Dip harsh frequencies only when they appear.' },
    { role: 'comp', label: 'Compressor – glue', set: { Ratio: [2, ''], Thresh: [-12, 'dB'] }, prefer: P.opto, opt: .7, tip: 'A second, gentle stage for a steady level.' },
    { role: 'sat', label: 'Saturation', opt: .6, tip: 'Harmonics: denser and more present without getting louder.' },
    { role: 'eq', label: 'EQ – air', prefer: P.vintageEq, opt: .6, tip: 'A high shelf for sheen at the end.' },
    { role: 'delay', label: 'Delay', set: { Mix: [12, '%'], Feedback: [25, '%'] }, prefer: P.tapeDelay, opt: .6, tip: 'Delay before reverb – otherwise the reverb smears the echoes.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [1.4, 's'], PreDly: [30, 'ms'], Mix: [15, '%'] }, prefer: P.plate, opt: .7, tip: 'A plate is the classic on vocals. Even better on a send.' },
  ] },
  { id: 'voc-trance', rubric: 'vocals', name: 'Trance vocal (atmospheric)', desc: 'A controlled core, then lots of space: timed delay and a big reverb with long pre-delay.', slots: [
    { role: 'eq', label: 'EQ – high-pass', prefer: P.surgicalEq, tip: 'Lows out, room for kick and bass.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Thresh: [-18, 'dB'] }, prefer: P.opto, tip: 'An even level across the phrase.' },
    { role: 'deess', label: 'De-esser', tip: 'Important before delay and reverb multiply the S sounds.' },
    { role: 'sat', label: 'Saturation', opt: .5, tip: 'Some warmth and presence.' },
    { role: 'delay', label: 'Delay – dotted 1/8', set: { Mix: [20, '%'], Feedback: [35, '%'] }, prefer: P.tapeDelay, tip: 'Timed echoes give the vocal movement.' },
    { role: 'reverb', label: 'Big reverb', set: { Decay: [3.5, 's'], PreDly: [100, 'ms'], Mix: [25, '%'] }, prefer: P.hall, tip: 'A long tail; over 100 ms of pre-delay keeps the voice in front.' },
    { role: 'width', label: 'Stereo width', opt: .5, tip: 'Spread the reverb tail.' },
  ] },
  { id: 'voc-backing', rubric: 'vocals', name: 'Backing vocals', desc: 'Leaner than the lead: thinner, wider, further back.', slots: [
    { role: 'eq', label: 'EQ – lean', prefer: P.surgicalEq, tip: 'More high-pass than on the lead so it doesn\'t get muddy.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Thresh: [-22, 'dB'] }, prefer: P.opto, tip: 'Compress harder than the lead – they support, they don\'t lead.' },
    { role: 'deess', label: 'De-esser', tip: 'Many voices = many S sounds.' },
    { role: 'chorus', label: 'Doubler / chorus', opt: .6, tip: 'Makes the voices wider and denser.' },
    { role: 'width', label: 'Stereo width', opt: .6, tip: 'Out to the sides, leaving the centre to the lead.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2.2, 's'], PreDly: [20, 'ms'], Mix: [30, '%'] }, prefer: P.hall, tip: 'More space than the lead – pushes them back.' },
  ] },
  { id: 'voc-raw', rubric: 'vocals', name: 'Minimal lead vocal', desc: 'Four modules that almost always work.', slots: [
    { role: 'eq', label: 'EQ', prefer: P.surgicalEq, tip: 'High-pass and problem frequencies.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Thresh: [-18, 'dB'] }, tip: 'An even level.' },
    { role: 'deess', label: 'De-esser', tip: 'S sounds after compression.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [1.4, 's'], PreDly: [30, 'ms'], Mix: [15, '%'] }, prefer: P.plate, tip: 'A touch of space.' },
  ] },

  /* ---------- Drums ---------- */
  { id: 'drum-glue', rubric: 'drums', name: 'Drum bus glue', desc: 'Glues the kit together: SSL-style bus compressor, tape saturation, gentle peak control.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Mud around 300 Hz out, kick depth and cymbal sheen up.' },
    { role: 'comp', label: 'Bus compressor', set: { Ratio: [2, ''], Attack: [30, 'ms'], Release: [100, 'ms'], Thresh: [-10, 'dB'] }, prefer: P.bus, tip: '2–4 dB of gain reduction; a slow attack lets the transients through.' },
    { role: 'sat', label: 'Tape saturation', prefer: P.tapeSat, tip: 'Rounds off peaks and adds density.' },
    { role: 'clipper', label: 'Clipper', opt: .5, tip: 'Shaves off single peaks cleanly.' },
    { role: 'limiter', label: 'Limiter', opt: .3, tip: 'Just a safety net.' },
  ] },
  { id: 'drum-punch', rubric: 'drums', name: 'Punchy drums', desc: 'More attack: shape the transients first, then compress and drive.', slots: [
    { role: 'transient', label: 'Transient shaper', tip: 'More attack, shorter sustain – more kick, more snap.' },
    { role: 'eq', label: 'EQ', tip: 'Bring out the punch (60–100 Hz, 2–5 kHz).' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [10, 'ms'], Release: [50, 'ms'] }, prefer: P.fast, tip: 'A fast release for drive.' },
    { role: 'sat', label: 'Saturation', tip: 'Density and bite.' },
    { role: 'clipper', label: 'Clipper', opt: .7, tip: 'More loudness without pumping.' },
  ] },
  { id: 'drum-smash', rubric: 'drums', name: 'Parallel smash (on a return)', desc: 'Put it on a return track and blend 20–35 % under the dry drums (New York compression).', slots: [
    { role: 'eq', label: 'EQ – before', tip: 'Lower the lows a little, or everything pumps.' },
    { role: 'comp', label: 'Compressor – brutal', set: { Ratio: [10, ''], Attack: [1, 'ms'], Release: [50, 'ms'], Thresh: [-30, 'dB'] }, prefer: /1176|\b76\b|distressor|fet|smack|black 76|all buttons/i, tip: 'High ratio, fast attack: really crush it.' },
    { role: 'dist', label: 'Distortion', opt: .6, tip: 'More dirt in the parallel signal.' },
    { role: 'eq', label: 'EQ – after', prefer: P.vintageEq, tip: 'Lift highs and lows after the crush.' },
    { role: 'limiter', label: 'Limiter', opt: .5, tip: 'Keeps the parallel path in check.' },
  ] },
  { id: 'drum-kick', rubric: 'drums', name: 'Kick', desc: 'Depth, click and control for the kick drum.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Sub (50–60 Hz) and click (2–4 kHz), cardboard around 300 Hz out.' },
    { role: 'transient', label: 'Transient shaper', opt: .6, tip: 'More click, shorter tail.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [15, 'ms'], Release: [60, 'ms'] }, prefer: P.fast, opt: .7, tip: 'Shapes the body.' },
    { role: 'sat', label: 'Saturation', tip: 'Harmonics make the kick audible on small speakers.' },
    { role: 'clipper', label: 'Clipper', opt: .6, tip: 'Typical in electronic music: louder without pumping.' },
  ] },
  { id: 'drum-snare', rubric: 'drums', name: 'Snare', desc: 'Crack, body and a classic plate.', slots: [
    { role: 'gate', label: 'Gate', opt: .5, tip: 'Removes hi-hat bleed.' },
    { role: 'eq', label: 'EQ', tip: 'Body at 200 Hz, crack at 5 kHz.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [5, 'ms'], Release: [80, 'ms'] }, prefer: P.fast, tip: 'Snap and consistency.' },
    { role: 'sat', label: 'Saturation', opt: .7, tip: 'More bite.' },
    { role: 'reverb', label: 'Plate reverb', set: { Decay: [1.2, 's'], PreDly: [10, 'ms'], Mix: [15, '%'] }, prefer: P.plate, tip: 'The classic snare space.' },
  ] },

  /* ---------- Bass ---------- */
  { id: 'bass-di', rubric: 'bass', name: 'Bass: DI → amp', desc: 'Fix the problems first, then even it out, then add amp character.', slots: [
    { role: 'eq', label: 'EQ – clean up', prefer: P.surgicalEq, tip: 'Subsonic high-pass and problem frequencies out – the compressor gets a clean signal.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [10, 'ms'], Release: [100, 'ms'] }, prefer: P.opto, tip: 'An even level across all strings.' },
    { role: 'amp', label: 'Amp / drive', prefer: P.bassAmp, tip: 'Mid growl so it cuts through.' },
    { role: 'eq', label: 'EQ – tone', prefer: P.vintageEq, tip: 'Low shelf and presence.' },
    { role: 'limiter', label: 'Limiter', opt: .4, tip: 'Keeps the lowest notes in check.' },
  ] },
  { id: 'bass-synth', rubric: 'bass', name: 'Synth / sub bass', desc: 'Saturation for harmonics, compression for density, sidechain to make room for the kick.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Below 30 Hz out, shape the mids.' },
    { role: 'sat', label: 'Saturation', prefer: /decapitator|saturn|trash|culture|satur/i, tip: 'Harmonics – so the bass is audible on a phone.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Attack: [20, 'ms'], Release: [80, 'ms'] }, tip: 'Even pressure.' },
    { role: 'exciter', label: 'Bass enhancer', prefer: /bass|low ?end|subhoofer|rbass|maxx/i, opt: .5, tip: 'More perceived depth.' },
    { role: 'sidechain', label: 'Sidechain / ducking', opt: .8, tip: 'Makes room when the kick hits.' },
  ] },
  { id: 'bass-trance', rubric: 'bass', name: 'Trance rolling bass', desc: 'The rolling off-beat bass: density plus clear pumping with the kick.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Foundation around 60–90 Hz, mud out.' },
    { role: 'sat', label: 'Saturation', tip: 'Bite for the mids.' },
    { role: 'sidechain', label: 'Sidechain / pump', tip: 'The typical pump – short, on every kick.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''] }, opt: .6, tip: 'Evens out the level after the pump.' },
    { role: 'eq', label: 'EQ – final touch', opt: .5, tip: 'Match it to the rest of the mix.' },
  ] },
  { id: 'bass-808', rubric: 'bass', name: '808', desc: 'A deep 808 with bite – loud but controlled.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Below 30 Hz out, bring out the fundamental.' },
    { role: 'sat', label: 'Saturation', prefer: /decapitator|saturn|trash|satur/i, tip: 'Harmonics: audible even on phone speakers.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [10, 'ms'], Release: [100, 'ms'] }, opt: .6, tip: 'An even sustain.' },
    { role: 'clipper', label: 'Clipper', opt: .7, tip: 'Louder without pumping.' },
    { role: 'sidechain', label: 'Sidechain', opt: .5, tip: 'Room for the kick.' },
  ] },

  /* ---------- Percussion ---------- */
  { id: 'perc-bus', rubric: 'perc', name: 'Percussion bus', desc: 'Crisp, wide, with a little space – the centre stays free for kick and snare.', slots: [
    { role: 'eq', label: 'EQ – high-pass', tip: 'Lows out; percussion lives in the mids and highs.' },
    { role: 'transient', label: 'Transient shaper', tip: 'Clearer hits.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [2, ''], Attack: [20, 'ms'], Release: [100, 'ms'] }, prefer: P.bus, opt: .7, tip: 'Light compression.' },
    { role: 'width', label: 'Stereo width', tip: 'Out to the sides, the centre stays free.' },
    { role: 'reverb', label: 'Room', set: { Decay: [0.8, 's'], PreDly: [5, 'ms'], Mix: [15, '%'] }, prefer: P.room, opt: .7, tip: 'A short room glues it all together.' },
  ] },
  { id: 'perc-hats', rubric: 'perc', name: 'Hi-hats & shakers', desc: 'Groove and sheen without harshness.', slots: [
    { role: 'eq', label: 'EQ', tip: 'High-pass, tame harshness around 3–6 kHz.' },
    { role: 'transient', label: 'Transient shaper', opt: .7, tip: 'More or less edge, depending on the groove.' },
    { role: 'sat', label: 'Saturation', prefer: P.tapeSat, opt: .5, tip: 'Tape rounds off harsh highs.' },
    { role: 'width', label: 'Stereo width', opt: .7, tip: 'A little width for movement.' },
    { role: 'delay', label: 'Delay', set: { Mix: [12, '%'], Feedback: [20, '%'] }, opt: .4, tip: 'A short timed delay for more groove.' },
  ] },
  { id: 'perc-groove', rubric: 'perc', name: 'Toms & groove percussion', desc: 'Body, density and a shared space.', slots: [
    { role: 'gate', label: 'Gate', opt: .4, tip: 'Removes bleed.' },
    { role: 'eq', label: 'EQ', tip: 'Bring out the body, mud out.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Attack: [10, 'ms'], Release: [80, 'ms'] }, tip: 'Even hits.' },
    { role: 'sat', label: 'Saturation', opt: .6, tip: 'More tone.' },
    { role: 'reverb', label: 'Room', set: { Decay: [0.9, 's'], Mix: [20, '%'] }, prefer: P.room, tip: 'A space shared with the drums.' },
  ] },

  /* ---------- Instruments ---------- */
  { id: 'inst-keys', rubric: 'instr', name: 'Keys & piano', desc: 'Stay natural: little compression, some colour, a nice space.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Clear the low mids, leave room for bass and vocals.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [2, ''], Attack: [20, 'ms'], Release: [150, 'ms'] }, prefer: P.opto, tip: 'Gentle – the playing should breathe.' },
    { role: 'sat', label: 'Saturation', prefer: P.tapeSat, opt: .5, tip: 'Tape warmth.' },
    { role: 'chorus', label: 'Chorus', opt: .4, tip: 'A classic on electric pianos.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2, 's'], PreDly: [20, 'ms'], Mix: [20, '%'] }, prefer: /hall|room|chamber|plate/i, tip: 'Gives the instrument a place.' },
  ] },
  { id: 'inst-guitar', rubric: 'instr', name: 'Guitar', desc: 'Amp tone, then control, then modulation and space – like a pedalboard plus a console.', slots: [
    { role: 'amp', label: 'Amp / pedal', opt: .7, tip: 'The core sound.' },
    { role: 'eq', label: 'EQ', tip: 'High-pass, mud out, shape the presence.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Attack: [15, 'ms'], Release: [120, 'ms'] }, opt: .7, tip: 'More even, more sustain.' },
    { role: 'mod', label: 'Modulation', opt: .5, tip: 'Chorus, phaser or tremolo.' },
    { role: 'delay', label: 'Delay', set: { Mix: [15, '%'], Feedback: [25, '%'] }, prefer: P.tapeDelay, tip: 'Delay before reverb.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [1.6, 's'], Mix: [15, '%'] }, tip: 'Space at the end.' },
  ] },
  { id: 'inst-acoustic', rubric: 'instr', name: 'Acoustic guitar', desc: 'Natural and airy – body without boom.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Boom around 200 Hz out, air at 10 kHz.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Attack: [15, 'ms'], Release: [120, 'ms'] }, prefer: P.opto, tip: 'Even playing.' },
    { role: 'exciter', label: 'Air', opt: .4, tip: 'Sheen for the strings.' },
    { role: 'width', label: 'Stereo width', opt: .4, tip: 'A little width for mono recordings.' },
    { role: 'reverb', label: 'Room', set: { Decay: [1.2, 's'], Mix: [15, '%'] }, prefer: P.room, tip: 'A small, natural room.' },
  ] },
  { id: 'inst-crunch', rubric: 'instr', name: 'Electric guitar crunch', desc: 'Rhythm guitar with amp bite.', slots: [
    { role: 'amp', label: 'Amp', tip: 'Crunch tone.' },
    { role: 'eq', label: 'EQ', tip: 'High-pass at 80–100 Hz, tame fizz above 8 kHz.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''] }, opt: .5, tip: 'Consistency.' },
    { role: 'reverb', label: 'Room', set: { Decay: [0.9, 's'], Mix: [12, '%'] }, prefer: P.room, tip: 'A short room.' },
  ] },
  { id: 'inst-clean', rubric: 'instr', name: 'Clean guitar', desc: 'Crystal clear and wide, with chorus and echo.', slots: [
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [10, 'ms'] }, tip: 'Sustain and evenness.' },
    { role: 'eq', label: 'EQ', tip: 'Sheen and clarity.' },
    { role: 'chorus', label: 'Chorus', set: { Mix: [35, '%'] }, tip: 'The eighties clean sound.' },
    { role: 'delay', label: 'Delay', set: { Mix: [18, '%'], Feedback: [30, '%'] }, prefer: P.tapeDelay, tip: 'Echoes.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2, 's'], Mix: [20, '%'] }, tip: 'Space.' },
  ] },
  { id: 'inst-rhodes', rubric: 'instr', name: 'Electric piano / Rhodes', desc: 'Warm, with tremolo or chorus and tape.', slots: [
    { role: 'eq', label: 'EQ', tip: 'A little less low mids.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [2, ''] }, prefer: P.opto, tip: 'Gentle.' },
    { role: 'mod', label: 'Tremolo / chorus', set: { Mix: [40, '%'] }, prefer: /tremol|chorus|dimension/i, tip: 'The Rhodes shimmer.' },
    { role: 'sat', label: 'Tape', prefer: P.tapeSat, opt: .6, tip: 'Warmth.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [1.8, 's'], Mix: [20, '%'] }, tip: 'Space.' },
  ] },
  { id: 'inst-organ', rubric: 'instr', name: 'Organ', desc: 'Leslie movement and tube drive.', slots: [
    { role: 'mod', label: 'Rotary / Leslie', prefer: /rotary|leslie/i, tip: 'The typical Leslie swirl.' },
    { role: 'sat', label: 'Tube drive', prefer: /tube|drive|satur/i, tip: 'A light overdrive.' },
    { role: 'eq', label: 'EQ', tip: 'Room for bass and vocals.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [1.6, 's'], Mix: [15, '%'] }, tip: 'Space.' },
  ] },
  { id: 'inst-strings', rubric: 'instr', name: 'Strings & orchestra', desc: 'Big, soft, far back in the room.', slots: [
    { role: 'eq', label: 'EQ', tip: 'High-pass, tame harsh highs.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [1.5, ''], Attack: [30, 'ms'] }, prefer: P.opto, opt: .5, tip: 'Only lightly – dynamics are the music here.' },
    { role: 'width', label: 'Stereo width', opt: .5, tip: 'Wide sections.' },
    { role: 'reverb', label: 'Big reverb', set: { Decay: [3, 's'], PreDly: [30, 'ms'], Mix: [30, '%'] }, prefer: P.hall, tip: 'Concert hall.' },
  ] },
  { id: 'inst-brass', rubric: 'instr', name: 'Brass', desc: 'Assertive, with sheen.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Mud out, presence at 2–4 kHz.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [3, ''], Attack: [10, 'ms'] }, prefer: P.fast, tip: 'A steady level.' },
    { role: 'sat', label: 'Saturation', opt: .6, tip: 'More bite.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [1.8, 's'], Mix: [20, '%'] }, prefer: /plate|hall/i, tip: 'Space.' },
  ] },
  { id: 'inst-pad', rubric: 'instr', name: 'Synth pad', desc: 'Wide, soft and deep in the room.', slots: [
    { role: 'eq', label: 'EQ – high-pass', tip: 'Pads need hardly any lows.' },
    { role: 'mod', label: 'Chorus / modulation', prefer: P.wideChorus, tip: 'Movement and width.' },
    { role: 'width', label: 'Stereo width', opt: .7, tip: 'Place it far out.' },
    { role: 'delay', label: 'Delay', set: { Mix: [25, '%'], Feedback: [40, '%'] }, opt: .6, tip: 'Soft, long echoes.' },
    { role: 'reverb', label: 'Big reverb', set: { Decay: [5, 's'], PreDly: [40, 'ms'], Mix: [40, '%'] }, prefer: P.hall, tip: 'A long reverb turns the pad into a surface.' },
  ] },
  { id: 'inst-pluck', rubric: 'instr', name: 'Pluck / arp', desc: 'Short notes that play rhythmically with echoes and space.', slots: [
    { role: 'eq', label: 'EQ', tip: 'High-pass, bring out the click.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [5, 'ms'], Release: [60, 'ms'] }, prefer: P.fast, opt: .6, tip: 'Consistent hits.' },
    { role: 'sat', label: 'Saturation', opt: .6, tip: 'More presence.' },
    { role: 'delay', label: 'Delay – timed', set: { Mix: [25, '%'], Feedback: [35, '%'] }, tip: 'Echoes fill the gaps between notes.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2.5, 's'], PreDly: [30, 'ms'], Mix: [25, '%'] }, tip: 'Space at the end.' },
    { role: 'sidechain', label: 'Sidechain', opt: .5, tip: 'Pumps echoes and reverb with the kick.' },
  ] },

  /* ---------- Trance & Leads ---------- */
  { id: 'lead-supersaw', rubric: 'lead', name: 'Trance supersaw lead', desc: 'The big trance lead: wide, timed delay, huge reverb with long pre-delay – and it all pumps with the kick at the end.', slots: [
    { role: 'eq', label: 'EQ', tip: 'High-pass around 150–200 Hz, tame harshness at 3 kHz.' },
    { role: 'sat', label: 'Saturation', opt: .5, tip: 'Density and bite.' },
    { role: 'chorus', label: 'Chorus / width', prefer: P.wideChorus, opt: .7, tip: 'Even more width for the supersaw.' },
    { role: 'delay', label: 'Delay – dotted 1/8', set: { Mix: [20, '%'], Feedback: [35, '%'] }, prefer: P.tapeDelay, tip: 'The typical trance echo rhythm. Delay before reverb.' },
    { role: 'reverb', label: 'Big reverb', set: { Decay: [4, 's'], PreDly: [120, 'ms'], Mix: [30, '%'] }, prefer: P.hall, tip: 'Over 100 ms of pre-delay keeps the lead in front.' },
    { role: 'sidechain', label: 'Sidechain / pump', tip: 'Last: pumps the delay and reverb tails with the kick too.' },
    { role: 'limiter', label: 'Limiter', opt: .3, tip: 'Level safety.' },
  ] },
  { id: 'lead-acid', rubric: 'lead', name: 'Acid line', desc: 'The squelchy 303 line: filter, distortion, echoes.', slots: [
    { role: 'filter', label: 'Filter', opt: .6, tip: 'Extra resonance to automate.' },
    { role: 'dist', label: 'Distortion', tip: 'Makes the acid line aggressive.' },
    { role: 'eq', label: 'EQ', tip: 'Tame shrill resonances.' },
    { role: 'delay', label: 'Delay', set: { Mix: [20, '%'], Feedback: [40, '%'] }, prefer: P.tapeDelay, tip: 'Echoes as a counter-rhythm.' },
    { role: 'reverb', label: 'Reverb', opt: .5, tip: 'Some space.' },
  ] },
  { id: 'lead-edm', rubric: 'lead', name: 'EDM / festival lead', desc: 'Loud, wide and present.', slots: [
    { role: 'eq', label: 'EQ', tip: 'High-pass and presence.' },
    { role: 'comp', label: 'Compressor', set: { Ratio: [4, ''], Attack: [10, 'ms'], Release: [80, 'ms'] }, prefer: P.fast, tip: 'A constant level.' },
    { role: 'sat', label: 'Saturation', tip: 'Harmonics so it cuts through.' },
    { role: 'width', label: 'Stereo width', tip: 'Wide – but check it in mono.' },
    { role: 'delay', label: 'Delay', set: { Mix: [15, '%'], Feedback: [30, '%'] }, tip: 'Timed echoes.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2.5, 's'], PreDly: [60, 'ms'], Mix: [20, '%'] }, prefer: P.hall, tip: 'A big space.' },
    { role: 'sidechain', label: 'Sidechain', tip: 'Pumps with the kick.' },
  ] },

  /* ---------- Modulation & FX ---------- */
  { id: 'mod-classic', rubric: 'mod', name: 'Classic modulation chain', desc: 'Like a pedalboard: modulation first, then time effects.', slots: [
    { role: 'chorus', label: 'Chorus', tip: 'Width and shimmer.' },
    { role: 'mod', label: 'Phaser / flanger', prefer: P.phaserFlanger, tip: 'Movement in the spectrum.' },
    { role: 'delay', label: 'Delay', set: { Mix: [25, '%'], Feedback: [35, '%'] }, tip: 'Delay before reverb.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2.5, 's'], Mix: [25, '%'] }, tip: 'Space at the end.' },
  ] },
  { id: 'mod-filter', rubric: 'mod', name: 'Filter movement', desc: 'For builds and breaks: filter and modulation to automate.', slots: [
    { role: 'filter', label: 'Filter', tip: 'Open slowly for tension.' },
    { role: 'mod', label: 'Modulation', tip: 'Movement in the stereo image.' },
    { role: 'delay', label: 'Delay', opt: .7, tip: 'Echoes reinforce the movement.' },
    { role: 'width', label: 'Stereo width', opt: .5, tip: 'More width in the break.' },
  ] },
  { id: 'mod-glitch', rubric: 'mod', name: 'Glitch & stutter', desc: 'Rhythmic chopping effects, then filter and space.', slots: [
    { role: 'glitch', label: 'Glitch / stutter', tip: 'Chops and repeats in time.' },
    { role: 'filter', label: 'Filter', opt: .7, tip: 'Shapes the chopped sound.' },
    { role: 'delay', label: 'Delay', opt: .7, tip: 'More rhythm.' },
    { role: 'reverb', label: 'Reverb', opt: .6, tip: 'Glues it all together.' },
  ] },
  { id: 'mod-design', rubric: 'mod', name: 'Sound design', desc: 'Distort, filter, move, place in a room.', slots: [
    { role: 'dist', label: 'Distortion', tip: 'New harmonics as raw material.' },
    { role: 'filter', label: 'Filter', tip: 'Shapes the distortion.' },
    { role: 'mod', label: 'Modulation', tip: 'Movement.' },
    { role: 'pitch', label: 'Pitch / formant', opt: .4, tip: 'For unusual timbres.' },
    { role: 'delay', label: 'Delay', tip: 'Echoes.' },
    { role: 'reverb', label: 'Reverb', opt: .7, tip: 'Space.' },
  ] },
  { id: 'mod-lofi', rubric: 'mod', name: 'Lo-fi', desc: 'Old, warm and a little broken.', slots: [
    { role: 'tape', label: 'Tape / vintage', tip: 'Wow, flutter and tape saturation.' },
    { role: 'filter', label: 'Filter', prefer: /low ?pass|filter/i, tip: 'Roll off the highs like old hardware.' },
    { role: 'crush', label: 'Bitcrusher', opt: .6, tip: 'Fewer bits, lower sample rate.' },
    { role: 'mod', label: 'Wow / chorus', opt: .6, tip: 'Warbling tape.' },
    { role: 'reverb', label: 'Reverb', prefer: P.room, opt: .6, tip: 'A small, dark room.' },
  ] },

  /* ---------- Send effects ---------- */
  { id: 'ret-reverb', rubric: 'returns', name: 'Reverb return', desc: 'On a return track: reverb 100 % wet, EQ before and after.', slots: [
    { role: 'eq', label: 'EQ – before', tip: 'High-pass around 300 Hz, a little less top: the reverb stays clear.' },
    { role: 'reverb', label: 'Reverb', set: { Decay: [2.5, 's'], PreDly: [30, 'ms'] }, tip: '100 % wet on the return.' },
    { role: 'eq', label: 'EQ – after', opt: .5, tip: 'Fit the tail into the mix.' },
    { role: 'sidechain', label: 'Ducking', opt: .5, tip: 'The reverb steps back while the voice sings.' },
  ] },
  { id: 'ret-delay', rubric: 'returns', name: 'Delay return', desc: 'Echoes that get darker and dirtier with every repeat.', slots: [
    { role: 'delay', label: 'Delay', set: { Feedback: [35, '%'] }, prefer: P.tapeDelay, tip: '100 % wet on the return.' },
    { role: 'filter', label: 'Filter', opt: .6, tip: 'High- and low-pass keep the echoes out of the way.' },
    { role: 'sat', label: 'Saturation', opt: .5, tip: 'Dirtier echoes.' },
    { role: 'reverb', label: 'Reverb', opt: .5, tip: 'Put the echoes in a room.' },
  ] },
  { id: 'ret-trance', rubric: 'returns', name: 'Pumping trance reverb', desc: 'A huge reverb that breathes with the kick – the sound of big trance breaks.', slots: [
    { role: 'reverb', label: 'Big reverb', set: { Decay: [5, 's'], PreDly: [100, 'ms'] }, prefer: P.hall, tip: 'Long decay, long pre-delay.' },
    { role: 'eq', label: 'EQ', tip: 'Lows out so the reverb doesn\'t boom.' },
    { role: 'width', label: 'Stereo width', opt: .5, tip: 'Even wider.' },
    { role: 'sidechain', label: 'Sidechain / pump', tip: 'The reverb pumps with the kick.' },
  ] },

  /* ---------- Mix bus ---------- */
  { id: 'mix-analog', rubric: 'mixbus', name: 'Analogue mix bus', desc: 'As if mixed through a console to tape.', slots: [
    { role: 'sat', label: 'Tape / console', prefer: P.tapeSat, tip: 'Light tape saturation ties the tracks together.' },
    { role: 'eq', label: 'EQ', prefer: P.vintageEq, tip: 'Gentle, broad moves.' },
    { role: 'comp', label: 'Bus compressor', set: { Ratio: [2, ''], Attack: [30, 'ms'], Release: [100, 'ms'], Thresh: [-8, 'dB'] }, prefer: P.bus, tip: '1–2 dB of glue, slow attack, auto release.' },
    { role: 'eq', label: 'EQ – final touch', opt: .4, tip: 'Air and depth after the compression.' },
    { role: 'limiter', label: 'Limiter', opt: .4, tip: 'Only to check loudness – switch it off before mastering.' },
  ] },
  { id: 'mix-modern', rubric: 'mixbus', name: 'Modern clean mix bus', desc: 'Precise tools instead of colour.', slots: [
    { role: 'dyneq', label: 'Smooth resonances', opt: .7, tip: 'Tame harsh frequencies dynamically.' },
    { role: 'eq', label: 'EQ', prefer: P.surgicalEq, tip: 'Precise corrections.' },
    { role: 'comp', label: 'Bus compressor', set: { Ratio: [2, ''], Attack: [30, 'ms'], Release: [100, 'ms'] }, prefer: P.bus, tip: 'Light glue.' },
    { role: 'meter', label: 'Analyzer', opt: .6, tip: 'Keep an eye on spectrum and loudness.' },
  ] },

  /* ---------- Mastering ---------- */
  { id: 'mst-classic', rubric: 'master', name: 'Classic mastering chain', desc: 'Correct, compress, colour, widen – the limiter right at the end.', slots: [
    { role: 'eq', label: 'EQ – corrective', prefer: P.surgicalEq, tip: 'Fix the problems first.' },
    { role: 'multiband', label: 'Multiband / dyn. EQ', opt: .6, tip: 'Control single frequency ranges.' },
    { role: 'comp', label: 'Glue compressor', set: { Ratio: [1.5, ''], Attack: [30, 'ms'], Release: [200, 'ms'] }, prefer: P.bus, tip: '1–2 dB, slow attack.' },
    { role: 'sat', label: 'Saturation / exciter', opt: .6, tip: 'Density and sheen.' },
    { role: 'width', label: 'Stereo width', opt: .4, tip: 'Carefully – keep the lows mono.' },
    { role: 'limiter', label: 'Limiter', set: { Ceiling: [-1, 'dB'] }, tip: 'Always last: loudness and true peak.' },
    { role: 'meter', label: 'Analyzer', opt: .7, tip: 'Measure after the limiter: LUFS and true peak.' },
  ] },
  { id: 'mst-club', rubric: 'master', name: 'Club / trance master', desc: 'Loud and punchy for big systems.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Control the sub, mud out.' },
    { role: 'multiband', label: 'Multiband', tip: 'Lows tight, highs free.' },
    { role: 'comp', label: 'Glue compressor', set: { Ratio: [2, ''], Attack: [30, 'ms'], Release: [100, 'ms'] }, prefer: P.bus, tip: 'Glues the whole track.' },
    { role: 'sat', label: 'Saturation', tip: 'More density without more level.' },
    { role: 'width', label: 'Stereo width', opt: .5, tip: 'Highs wide, lows mono.' },
    { role: 'clipper', label: 'Clipper', opt: .6, tip: 'Shaves peaks before the limiter.' },
    { role: 'limiter', label: 'Limiter', set: { Ceiling: [-1, 'dB'] }, tip: 'Last.' },
    { role: 'meter', label: 'Analyzer', opt: .7, tip: 'Check the loudness.' },
  ] },
  { id: 'mst-suite', rubric: 'master', name: 'All-in-one suite', desc: 'One mastering suite that does it all in a single plugin.', slots: [
    { role: 'suite', label: 'Mastering suite', tip: 'EQ, dynamics, width and limiter in one.' },
    { role: 'meter', label: 'Analyzer', opt: .7, tip: 'Behind it, to check.' },
  ] },
];

/** Does a plugin family fit a role? `fam`: {name, vendor, category, kind, names: [variant names]} */
function chainRoleFits(roleKey, fam) {
  const R = CHAIN_ROLES[roleKey];
  if (!R || fam.kind === 'inst') return false;
  // Leave the maker out: "FabFilter" is not a filter, "Soundtoys" not a toy.
  const maker = (fam.vendor || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let text = R.nameOnly ? fam.name : [fam.name, ...(fam.names || [])].join(' | ');
  if (maker) text = text.replace(new RegExp(maker, 'ig'), ' ');
  if (R.not && R.not.test(text)) return false;
  const byCat = !!R.cats && R.cats.includes(fam.category);
  const byName = !!R.re && R.re.test(text);
  if (R.mode === 'both') return byCat && byName;
  if (R.cats && !R.re) return byCat;
  if (R.cats && R.mode !== 'either') return byCat || byName;
  return byCat || byName;
}

if (typeof module !== 'undefined') module.exports = { CHAIN_ROLES, CHAIN_RUBRICS, CHAIN_TEMPLATES, chainRoleFits, chainInRubric };
