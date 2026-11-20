'use strict';
/* PlugShelf – chain building blocks: module roles, categories and chain templates.
   A template is a typical signal flow (e.g. a vocal strip in the style of an Apollo/Unison chain);
   every slot names a role, and the randomizers fill roles with plugins from the user's library. */

/** Module roles. A plugin family fits a role by its category and/or its name. */
const CHAIN_ROLES = {
  preamp:    { de: 'Preamp / Channel', cats: ['Channel Strip'], re: /preamp|pre-?amp|channel ?strip|console|\bneve\b|1073|\b610\b|\bapi\b|\bssl\b|avalon|manley|voxbox|v76|unison|\bstrip\b/i, not: /meter|analy/i },
  eq:        { de: 'EQ', cats: ['EQ'], re: /\beq\b|equali|pultec|eqp|pro-?q|\bq\d\b|maag|tilt|passive eq/i, not: /soothe|gullfoss|unmask|match eq|de[- ]?ess/i },
  dyneq:     { de: 'Dynamischer EQ / Resonanzen', re: /soothe|gullfoss|dynamic ?eq|smart:?eq|smarteq|resonance|pro-?q ?[34]|unmask|trackspacer|bx_dyneq|\bf6\b/i },
  comp:      { de: 'Kompressor', cats: ['Dynamics'], re: /compress|\bcomp\b|1176|\b176\b|la-?2a|la-?3a|fairchild|distressor|opto|\bfet\b|\bvca\b|\b76\b|glue/i,
               not: /limit|maximi|gate|expand|transient|transgressor|de[- ]?ess|clip|multi-?band|\bmb\b|side-?chain|shaper|duck|volume|loudness ?meter|meter|spiff|smack|pumper|trackspacer/i, mode: 'either' },
  multiband: { de: 'Multiband-Kompressor', cats: ['Dynamics', 'Mastering'], re: /multi-?band|pro-?mb|\bmb\b|\bc[46]\b|dynamics|xtc|\bmbc\b/i, mode: 'both' },
  limiter:   { de: 'Limiter', re: /limit|maximi[sz]|\bl[123]\b|pro-?l\b|pro-?l ?2|elevate|loudness max/i, not: /unlimiter|meter/i },
  clipper:   { de: 'Clipper', re: /clip(per)?\b|kclip|standardclip|clip ?to ?zero|gclip/i, not: /de-?clip/i },
  gate:      { de: 'Gate / Expander', re: /\bgate|expander|pro-?g\b|noise ?gate|drumgate/i },
  transient: { de: 'Transient Shaper', re: /transient|spiff|smack|transgressor|trans-?x|\bpunch|envelope|\bimpact\b/i, not: /meter/i },
  deess:     { de: 'De-Esser', re: /de[- ]?ess|sibil|pro-?ds|esser/i },
  sat:       { de: 'Sättigung', cats: ['Distortion'], re: /satur|tape|\btube|warm|heat|inflator|culture|karacter|decapitator|saturn|radiator|j37|ampex|studer|kramer|\btct|analog|harmonic|exciter/i,
               not: /fuzz|bit ?crush|crush|decimat|trash|destroy|grind|rocker|\bamp\b|guitar|stomp|pedal|shred|bass amp|devil|screamer|blackdist|distorange|megadual|bassdude/i, mode: 'either' },
  dist:      { de: 'Distortion', cats: ['Distortion'], re: /distort|fuzz|drive|dirt|trash|decapitator|devil|saturn|crush|destroy/i },
  amp:       { de: 'Amp / Pedal', re: /\bamp\b|amplifier|guitar|bass ?amp|\bcab\b|\brig\b|sansamp|darkglass|bass one|rocker|shred|stomp|pedal|ampeg|tonex|amplitube|slapper/i, not: /sample|example|de-?noise|denois|opto/i },
  tape:      { de: 'Tape / Vintage', re: /tape|j37|ampex|studer|kramer|\batr\b|vinyl|wow|flutter|kiss of shame|lo-?fi|cassette|rc-?20|retro|vhs/i },
  crush:     { de: 'Bitcrusher / Lo-Fi', re: /bit ?crush|crush|decimat|lo-?fi|redux|degrad|trash|destroy|vinyl/i },
  exciter:   { de: 'Exciter / Air', re: /excit|aural|vitamin|enhanc|\bair\b|maag|clarity|inflator|low ?end|bass ?control|subhoofer|rbass|maxxbass|spectre/i },
  reverb:    { de: 'Hall', cats: ['Reverb'], re: /reverb|\bverb/i, mode: 'either', not: /de-?reverb|dereverb/i },
  delay:     { de: 'Delay', cats: ['Delay'], re: /delay|echo/i, mode: 'either' },
  chorus:    { de: 'Chorus / Doubler', re: /chorus|dimension|ensemble|jun-?6|unison|microshift|doubler|vibrato/i },
  mod:       { de: 'Modulation', cats: ['Modulation'], re: /chorus|flang|phas|tremol|vibrato|rotary|leslie|ensemble/i, mode: 'either', not: /stutter|glitch/i },
  filter:    { de: 'Filter', cats: ['Filter'], re: /filter|\bwah/i, mode: 'either', not: /eq\b/i },
  tune:      { de: 'Pitch-Korrektur', re: /auto-?tune|melodyne|pitch ?correct|waves ?tune|graillon|metatune|\btune\b|alterboy|pitchmap/i },
  pitch:     { de: 'Pitch / Formant', cats: ['Pitch'], re: /pitch|alterboy|octav|formant|harmoni[sz]|shift|vocalsynth/i, mode: 'either' },
  width:     { de: 'Stereo-Breite', cats: ['Spatial'], re: /stereo|width|wider|imager|microshift|doubler|haas|panman|spread|panner/i, mode: 'either', not: /meter|analy|scope|5\.[01]|7\.1|360|lfe|surround|dorrough|tuner/i },
  sidechain: { de: 'Sidechain / Pump', re: /shaperbox|volume ?shaper|kickstart|lfo ?tool|trackspacer|\bduck|\bpump|side-?chain|\brift\b/i, not: /midi/i },
  glitch:    { de: 'Glitch / Stutter', re: /stutter|glitch|turnado|effectrix|fragments|portal|graindad|\bgrain|crystallizer|shaperbox|looper/i },
  suite:     { de: 'Mastering-Suite', re: /^ozone \d+( advanced)?$|t-racks|^neutron \d+$|master ?plan|^elevate/i, nameOnly: true },
  meter:     { de: 'Analyse / Meter', cats: ['Analyzer'], re: /meter|analy|scope|loudness|lufs|insight|tonal balance|mastercheck|\bspan\b|youlean|metric ?ab/i, mode: 'either', not: /compress|limit|tuner/i },
};

/** Categories shown above the randomizer. */
const CHAIN_RUBRICS = [
  { id: 'all', de: 'Alle' },
  { id: 'vocals', de: 'Vocals' },
  { id: 'drums', de: 'Drums' },
  { id: 'bass', de: 'Bass' },
  { id: 'perc', de: 'Percussion' },
  { id: 'instr', de: 'Instrumental' },
  { id: 'lead', de: 'Trance & Leads' },
  { id: 'mod', de: 'Modulation & FX' },
  { id: 'returns', de: 'Send-Effekte' },
  { id: 'mixbus', de: 'Mixbus' },
  { id: 'master', de: 'Mastering' },
];

/* Slot fields: role, label (shown on the slot), prefer (regex: plugins that fit this job get picked
   more often, e.g. 1176-style for a fast compressor), opt (chance that "Neue Chain" includes the slot;
   1 when missing), tip (why it sits here). */
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

const CHAIN_TEMPLATES = [
  /* ---------- Vocals ---------- */
  { id: 'voc-apollo', rubric: 'vocals', name: 'Vocal-Strip im Apollo-Stil', desc: 'Der klassische Unison-Weg: Preamp-Farbe, schneller FET-Kompressor fängt Spitzen, Opto glättet, Röhren-EQ für Glanz.', slots: [
    { role: 'preamp', label: 'Preamp-Farbe', prefer: /610|neve|1073|avalon|manley|api|v76|unison/i, opt: .7, tip: 'Färbt schon am Eingang – wie ein Unison-Preamp.' },
    { role: 'comp', label: 'Kompressor – schnell', prefer: P.fast, tip: 'Fängt Spitzen ab (1176-Stil, 4:1, schnelle Attack).' },
    { role: 'comp', label: 'Kompressor – Opto', prefer: P.opto, tip: 'Glättet die Dynamik weich (LA-2A-Stil).' },
    { role: 'eq', label: 'EQ – Glanz', prefer: P.vintageEq, tip: 'Breite Boosts für Luft und Wärme (Pultec-Stil).' },
    { role: 'deess', label: 'De-Esser', opt: .6, tip: 'Nach EQ und Kompression: die S-Laute sind jetzt lauter.' },
  ] },
  { id: 'voc-modern', rubric: 'vocals', name: 'Moderner Pop-/Rap-Vocal', desc: 'Erst aufräumen, dann zweistufig komprimieren, Zischlaute und Resonanzen zähmen, am Ende Farbe und Raum.', slots: [
    { role: 'tune', label: 'Pitch-Korrektur', opt: .6, tip: 'Ganz vorne, damit alles danach saubere Tonhöhen sieht.' },
    { role: 'eq', label: 'EQ – subtraktiv', prefer: P.surgicalEq, tip: 'Hochpass, Mulm und Resonanzen raus, bevor komprimiert wird.' },
    { role: 'comp', label: 'Kompressor – schnell', prefer: P.fast, tip: 'Erste Stufe: Spitzen kontrollieren.' },
    { role: 'deess', label: 'De-Esser', tip: 'Kompression hebt Zischlaute an – hier zähmen.' },
    { role: 'dyneq', label: 'Resonanzen glätten', opt: .5, tip: 'Harte Frequenzen nur dann absenken, wenn sie auftreten.' },
    { role: 'comp', label: 'Kompressor – Glue', prefer: P.opto, opt: .7, tip: 'Zweite, sanfte Stufe für eine stabile Lautheit.' },
    { role: 'sat', label: 'Sättigung', opt: .6, tip: 'Obertöne: dichter und präsenter, ohne lauter zu werden.' },
    { role: 'eq', label: 'EQ – Air', prefer: P.vintageEq, opt: .6, tip: 'Höhen-Shelf für Glanz zum Schluss.' },
    { role: 'delay', label: 'Delay', prefer: P.tapeDelay, opt: .6, tip: 'Delay vor dem Hall – sonst verwäscht der Hall die Echos.' },
    { role: 'reverb', label: 'Hall', prefer: P.plate, opt: .7, tip: 'Plate klingt auf Vocals klassisch. Besser noch als Send.' },
  ] },
  { id: 'voc-trance', rubric: 'vocals', name: 'Trance-Vocal (atmosphärisch)', desc: 'Kontrollierter Kern, dann viel Raum: getimtes Delay und großer Hall mit langem Pre-Delay.', slots: [
    { role: 'eq', label: 'EQ – Hochpass', prefer: P.surgicalEq, tip: 'Tiefen raus, Platz für Kick und Bass.' },
    { role: 'comp', label: 'Kompressor', prefer: P.opto, tip: 'Gleichmäßige Lautheit über die ganze Phrase.' },
    { role: 'deess', label: 'De-Esser', tip: 'Wichtig, bevor Delay und Hall die S-Laute vervielfachen.' },
    { role: 'sat', label: 'Sättigung', opt: .5, tip: 'Etwas Wärme und Durchsetzung.' },
    { role: 'delay', label: 'Delay – 1/8 punktiert', prefer: P.tapeDelay, tip: 'Getimte Echos geben dem Vocal Bewegung.' },
    { role: 'reverb', label: 'Großer Hall', prefer: P.hall, tip: 'Langer Hall, Pre-Delay über 100 ms hält die Stimme vorne.' },
    { role: 'width', label: 'Stereo-Breite', opt: .5, tip: 'Die Hallfahne breit ziehen.' },
  ] },
  { id: 'voc-backing', rubric: 'vocals', name: 'Backing Vocals', desc: 'Schlanker als die Lead-Stimme: dünner, breiter, weiter hinten.', slots: [
    { role: 'eq', label: 'EQ – schlank', prefer: P.surgicalEq, tip: 'Mehr Hochpass als beim Lead, damit es nicht matscht.' },
    { role: 'comp', label: 'Kompressor', prefer: P.opto, tip: 'Stärker komprimieren als den Lead – sie sollen tragen, nicht führen.' },
    { role: 'deess', label: 'De-Esser', tip: 'Viele Stimmen = viele S-Laute.' },
    { role: 'chorus', label: 'Doubler / Chorus', opt: .6, tip: 'Macht die Stimmen breiter und dichter.' },
    { role: 'width', label: 'Stereo-Breite', opt: .6, tip: 'Nach außen, damit die Mitte für den Lead frei bleibt.' },
    { role: 'reverb', label: 'Hall', prefer: P.hall, tip: 'Mehr Raum als beim Lead – rückt sie nach hinten.' },
  ] },
  { id: 'voc-raw', rubric: 'vocals', name: 'Lead-Vocal minimal', desc: 'Vier Module, die fast immer funktionieren.', slots: [
    { role: 'eq', label: 'EQ', prefer: P.surgicalEq, tip: 'Hochpass und Problemfrequenzen.' },
    { role: 'comp', label: 'Kompressor', tip: 'Gleichmäßige Lautheit.' },
    { role: 'deess', label: 'De-Esser', tip: 'S-Laute nach der Kompression.' },
    { role: 'reverb', label: 'Hall', prefer: P.plate, tip: 'Ein Hauch Raum.' },
  ] },

  /* ---------- Drums ---------- */
  { id: 'drum-glue', rubric: 'drums', name: 'Drum-Bus Glue', desc: 'Klebt das Schlagzeug zusammen: Bus-Kompressor im SSL-Stil, Bandsättigung, sanfte Spitzenbegrenzung.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Mulm um 300 Hz raus, Kick-Tiefe und Becken-Glanz betonen.' },
    { role: 'comp', label: 'Bus-Kompressor', prefer: P.bus, tip: '2–4 dB Gain Reduction, langsame Attack lässt die Transienten durch.' },
    { role: 'sat', label: 'Band-Sättigung', prefer: P.tapeSat, tip: 'Rundet Spitzen ab und verdichtet.' },
    { role: 'clipper', label: 'Clipper', opt: .5, tip: 'Schneidet einzelne Spitzen sauber ab.' },
    { role: 'limiter', label: 'Limiter', opt: .3, tip: 'Nur als Sicherheitsnetz.' },
  ] },
  { id: 'drum-punch', rubric: 'drums', name: 'Punchy Drums', desc: 'Mehr Attacke: erst Transienten formen, dann verdichten und anzerren.', slots: [
    { role: 'transient', label: 'Transient Shaper', tip: 'Attack anheben, Sustain kürzen – mehr Kick, mehr Snap.' },
    { role: 'eq', label: 'EQ', tip: 'Punch-Frequenzen (60–100 Hz, 2–5 kHz) hervorheben.' },
    { role: 'comp', label: 'Kompressor', prefer: P.fast, tip: 'Schnelle Release für Druck.' },
    { role: 'sat', label: 'Sättigung', tip: 'Dichte und Biss.' },
    { role: 'clipper', label: 'Clipper', opt: .7, tip: 'Mehr Lautheit ohne Pumpen.' },
  ] },
  { id: 'drum-smash', rubric: 'drums', name: 'Parallel-Smash (als Return)', desc: 'Auf eine Return-Spur legen und 20–35 % unter das trockene Schlagzeug mischen (New-York-Kompression).', slots: [
    { role: 'eq', label: 'EQ – vorher', tip: 'Tiefen etwas absenken, sonst pumpt alles.' },
    { role: 'comp', label: 'Kompressor – brutal', prefer: /1176|\b76\b|distressor|fet|smack|black 76|all buttons/i, tip: 'Hohe Ratio, schnelle Attack: richtig zerquetschen.' },
    { role: 'dist', label: 'Distortion', opt: .6, tip: 'Für mehr Dreck im Parallelsignal.' },
    { role: 'eq', label: 'EQ – nachher', prefer: P.vintageEq, tip: 'Höhen und Tiefen nach dem Zerquetschen betonen.' },
    { role: 'limiter', label: 'Limiter', opt: .5, tip: 'Hält den Parallelweg im Zaum.' },
  ] },
  { id: 'drum-kick', rubric: 'drums', name: 'Kick', desc: 'Tiefe, Klick und Kontrolle für die Bassdrum.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Sub (50–60 Hz) und Klick (2–4 kHz), Pappe um 300 Hz raus.' },
    { role: 'transient', label: 'Transient Shaper', opt: .6, tip: 'Mehr Klick, kürzerer Ausklang.' },
    { role: 'comp', label: 'Kompressor', prefer: P.fast, opt: .7, tip: 'Formt den Körper.' },
    { role: 'sat', label: 'Sättigung', tip: 'Obertöne machen die Kick auch auf kleinen Boxen hörbar.' },
    { role: 'clipper', label: 'Clipper', opt: .6, tip: 'Typisch in elektronischer Musik: lauter ohne Pumpen.' },
  ] },
  { id: 'drum-snare', rubric: 'drums', name: 'Snare', desc: 'Knall, Körper und ein klassischer Plate-Hall.', slots: [
    { role: 'gate', label: 'Gate', opt: .5, tip: 'Übersprechen der Hi-Hat raus.' },
    { role: 'eq', label: 'EQ', tip: 'Körper bei 200 Hz, Knall bei 5 kHz.' },
    { role: 'comp', label: 'Kompressor', prefer: P.fast, tip: 'Snap und Konsistenz.' },
    { role: 'sat', label: 'Sättigung', opt: .7, tip: 'Mehr Biss.' },
    { role: 'reverb', label: 'Plate-Hall', prefer: P.plate, tip: 'Der klassische Snare-Raum.' },
  ] },

  /* ---------- Bass ---------- */
  { id: 'bass-di', rubric: 'bass', name: 'Bass: DI → Amp', desc: 'Erst Probleme beheben, dann gleichmäßig machen, dann Amp-Charakter.', slots: [
    { role: 'eq', label: 'EQ – aufräumen', prefer: P.surgicalEq, tip: 'Subsonic-Hochpass und Problemfrequenzen raus – der Kompressor bekommt ein sauberes Signal.' },
    { role: 'comp', label: 'Kompressor', prefer: P.opto, tip: 'Gleichmäßige Lautheit über alle Saiten.' },
    { role: 'amp', label: 'Amp / Drive', prefer: P.bassAmp, tip: 'Mittenknurren für Durchsetzung.' },
    { role: 'eq', label: 'EQ – Ton', prefer: P.vintageEq, tip: 'Tiefen-Shelf und Präsenz.' },
    { role: 'limiter', label: 'Limiter', opt: .4, tip: 'Hält die tiefsten Töne im Zaum.' },
  ] },
  { id: 'bass-synth', rubric: 'bass', name: 'Synth- / Sub-Bass', desc: 'Sättigung für Obertöne, Kompression für Dichte, Sidechain für Platz neben der Kick.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Unter 30 Hz raus, Mitten formen.' },
    { role: 'sat', label: 'Sättigung', prefer: /decapitator|saturn|trash|culture|satur/i, tip: 'Obertöne – damit der Bass auch auf dem Handy hörbar ist.' },
    { role: 'comp', label: 'Kompressor', tip: 'Gleichmäßiger Druck.' },
    { role: 'exciter', label: 'Bass-Enhancer', prefer: /bass|low ?end|subhoofer|rbass|maxx/i, opt: .5, tip: 'Mehr gefühlte Tiefe.' },
    { role: 'sidechain', label: 'Sidechain / Ducking', opt: .8, tip: 'Macht Platz, wenn die Kick kommt.' },
  ] },
  { id: 'bass-trance', rubric: 'bass', name: 'Trance-Rolling-Bass', desc: 'Der rollende Offbeat-Bass: Dichte plus deutliches Pumpen mit der Kick.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Fundament um 60–90 Hz, Mulm raus.' },
    { role: 'sat', label: 'Sättigung', tip: 'Biss für die Mitten.' },
    { role: 'sidechain', label: 'Sidechain / Pump', tip: 'Das typische Pumpen – kurz, auf jede Kick.' },
    { role: 'comp', label: 'Kompressor', opt: .6, tip: 'Glättet die Lautstärke nach dem Pumpen.' },
    { role: 'eq', label: 'EQ – Feinschliff', opt: .5, tip: 'Mit dem Rest des Mixes abgleichen.' },
  ] },

  /* ---------- Percussion ---------- */
  { id: 'perc-bus', rubric: 'perc', name: 'Percussion-Bus', desc: 'Knackig, breit, mit etwas Raum – Platz für Kick und Snare in der Mitte.', slots: [
    { role: 'eq', label: 'EQ – Hochpass', tip: 'Tiefen raus, die Percussion lebt in den Mitten und Höhen.' },
    { role: 'transient', label: 'Transient Shaper', tip: 'Klarere Anschläge.' },
    { role: 'comp', label: 'Kompressor', prefer: P.bus, opt: .7, tip: 'Leicht verdichten.' },
    { role: 'width', label: 'Stereo-Breite', tip: 'Nach außen, die Mitte bleibt frei.' },
    { role: 'reverb', label: 'Raum', prefer: P.room, opt: .7, tip: 'Kurzer Raum klebt alles zusammen.' },
  ] },
  { id: 'perc-hats', rubric: 'perc', name: 'Hi-Hats & Shaker', desc: 'Groove und Glanz ohne Schärfe.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Hochpass, Härte um 3–6 kHz zähmen.' },
    { role: 'transient', label: 'Transient Shaper', opt: .7, tip: 'Mehr oder weniger Spitze, je nach Groove.' },
    { role: 'sat', label: 'Sättigung', prefer: P.tapeSat, opt: .5, tip: 'Tape rundet harte Höhen ab.' },
    { role: 'width', label: 'Stereo-Breite', opt: .7, tip: 'Leicht breit für Bewegung.' },
    { role: 'delay', label: 'Delay', opt: .4, tip: 'Kurzes, getimtes Delay für mehr Groove.' },
  ] },
  { id: 'perc-groove', rubric: 'perc', name: 'Toms & Groove-Percussion', desc: 'Körper, Dichte und ein gemeinsamer Raum.', slots: [
    { role: 'gate', label: 'Gate', opt: .4, tip: 'Übersprechen raus.' },
    { role: 'eq', label: 'EQ', tip: 'Körper betonen, Mulm raus.' },
    { role: 'comp', label: 'Kompressor', tip: 'Gleichmäßige Anschläge.' },
    { role: 'sat', label: 'Sättigung', opt: .6, tip: 'Mehr Ton.' },
    { role: 'reverb', label: 'Raum', prefer: P.room, tip: 'Gemeinsamer Raum mit dem Schlagzeug.' },
  ] },

  /* ---------- Instrumental ---------- */
  { id: 'inst-keys', rubric: 'instr', name: 'Keys & Piano', desc: 'Natürlich bleiben: wenig Kompression, etwas Farbe, ein schöner Raum.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Tiefmitten entschlacken, Platz für Bass und Vocals.' },
    { role: 'comp', label: 'Kompressor', prefer: P.opto, tip: 'Sanft – das Spiel soll atmen.' },
    { role: 'sat', label: 'Sättigung', prefer: P.tapeSat, opt: .5, tip: 'Tape-Wärme.' },
    { role: 'chorus', label: 'Chorus', opt: .4, tip: 'Klassisch für E-Pianos.' },
    { role: 'reverb', label: 'Hall', prefer: /hall|room|chamber|plate/i, tip: 'Gibt dem Instrument einen Ort.' },
  ] },
  { id: 'inst-guitar', rubric: 'instr', name: 'Gitarre', desc: 'Amp-Ton, dann Kontrolle, dann Modulation und Raum – wie ein Pedalboard plus Mischpult.', slots: [
    { role: 'amp', label: 'Amp / Pedal', opt: .7, tip: 'Der Grundsound.' },
    { role: 'eq', label: 'EQ', tip: 'Hochpass, Mulm raus, Präsenz formen.' },
    { role: 'comp', label: 'Kompressor', opt: .7, tip: 'Gleichmäßiger, sustainreicher.' },
    { role: 'mod', label: 'Modulation', opt: .5, tip: 'Chorus, Phaser oder Tremolo.' },
    { role: 'delay', label: 'Delay', prefer: P.tapeDelay, tip: 'Delay vor dem Hall.' },
    { role: 'reverb', label: 'Hall', tip: 'Raum zum Schluss.' },
  ] },
  { id: 'inst-pad', rubric: 'instr', name: 'Synth-Pad', desc: 'Breit, weich und tief im Raum.', slots: [
    { role: 'eq', label: 'EQ – Hochpass', tip: 'Pads brauchen kaum Tiefen.' },
    { role: 'mod', label: 'Chorus / Modulation', prefer: P.wideChorus, tip: 'Bewegung und Breite.' },
    { role: 'width', label: 'Stereo-Breite', opt: .7, tip: 'Ganz außen hinlegen.' },
    { role: 'delay', label: 'Delay', opt: .6, tip: 'Weiche, lange Echos.' },
    { role: 'reverb', label: 'Großer Hall', prefer: P.hall, tip: 'Ein langer Hall macht das Pad zur Fläche.' },
  ] },
  { id: 'inst-pluck', rubric: 'instr', name: 'Pluck / Arp', desc: 'Kurze Töne, die rhythmisch mit Echos und Raum spielen.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Hochpass, Klick betonen.' },
    { role: 'comp', label: 'Kompressor', prefer: P.fast, opt: .6, tip: 'Konsistente Anschläge.' },
    { role: 'sat', label: 'Sättigung', opt: .6, tip: 'Mehr Durchsetzung.' },
    { role: 'delay', label: 'Delay – getimt', tip: 'Echos füllen die Lücken zwischen den Noten.' },
    { role: 'reverb', label: 'Hall', tip: 'Raum zum Schluss.' },
    { role: 'sidechain', label: 'Sidechain', opt: .5, tip: 'Pumpt Echos und Hall mit der Kick.' },
  ] },

  /* ---------- Trance & Leads ---------- */
  { id: 'lead-supersaw', rubric: 'lead', name: 'Trance-Supersaw-Lead', desc: 'Der große Trance-Lead: breit, getimtes Delay, riesiger Hall mit langem Pre-Delay – und alles pumpt am Ende mit der Kick.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Hochpass um 150–200 Hz, Härte bei 3 kHz zähmen.' },
    { role: 'sat', label: 'Sättigung', opt: .5, tip: 'Dichte und Biss.' },
    { role: 'chorus', label: 'Chorus / Breite', prefer: P.wideChorus, opt: .7, tip: 'Noch mehr Breite für die Supersaw.' },
    { role: 'delay', label: 'Delay – 1/8 punktiert', prefer: P.tapeDelay, tip: 'Der typische Trance-Echo-Rhythmus. Delay vor dem Hall.' },
    { role: 'reverb', label: 'Großer Hall', prefer: P.hall, tip: 'Pre-Delay über 100 ms hält den Lead vorne.' },
    { role: 'sidechain', label: 'Sidechain / Pump', tip: 'Am Ende: pumpt auch Delay- und Hallfahnen mit der Kick.' },
    { role: 'limiter', label: 'Limiter', opt: .3, tip: 'Pegel-Sicherheit.' },
  ] },
  { id: 'lead-acid', rubric: 'lead', name: 'Acid-Line', desc: 'Die quietschende 303-Linie: Filter, Verzerrung, Echos.', slots: [
    { role: 'filter', label: 'Filter', opt: .6, tip: 'Zusätzliche Resonanz zum Automatisieren.' },
    { role: 'dist', label: 'Distortion', tip: 'Macht die Acid-Linie aggressiv.' },
    { role: 'eq', label: 'EQ', tip: 'Schrille Resonanzen zähmen.' },
    { role: 'delay', label: 'Delay', prefer: P.tapeDelay, tip: 'Echos als Gegenrhythmus.' },
    { role: 'reverb', label: 'Hall', opt: .5, tip: 'Etwas Raum.' },
  ] },
  { id: 'lead-edm', rubric: 'lead', name: 'EDM-/Festival-Lead', desc: 'Laut, breit und präsent.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Hochpass und Präsenz.' },
    { role: 'comp', label: 'Kompressor', prefer: P.fast, tip: 'Konstante Lautheit.' },
    { role: 'sat', label: 'Sättigung', tip: 'Obertöne für Durchsetzung.' },
    { role: 'width', label: 'Stereo-Breite', tip: 'Breit, aber mono-kompatibel prüfen.' },
    { role: 'delay', label: 'Delay', tip: 'Getimte Echos.' },
    { role: 'reverb', label: 'Hall', prefer: P.hall, tip: 'Großer Raum.' },
    { role: 'sidechain', label: 'Sidechain', tip: 'Pumpt mit der Kick.' },
  ] },

  /* ---------- Modulation & FX ---------- */
  { id: 'mod-classic', rubric: 'mod', name: 'Klassische Mod-Kette', desc: 'Wie auf einem Pedalboard: erst Modulation, dann Zeit-Effekte.', slots: [
    { role: 'chorus', label: 'Chorus', tip: 'Breite und Schwebung.' },
    { role: 'mod', label: 'Phaser / Flanger', prefer: P.phaserFlanger, tip: 'Bewegung im Frequenzbild.' },
    { role: 'delay', label: 'Delay', tip: 'Delay vor dem Hall.' },
    { role: 'reverb', label: 'Hall', tip: 'Raum zum Schluss.' },
  ] },
  { id: 'mod-filter', rubric: 'mod', name: 'Filter-Bewegung', desc: 'Für Builds und Breaks: Filter und Modulation zum Automatisieren.', slots: [
    { role: 'filter', label: 'Filter', tip: 'Langsam öffnen für Spannung.' },
    { role: 'mod', label: 'Modulation', tip: 'Bewegung im Stereobild.' },
    { role: 'delay', label: 'Delay', opt: .7, tip: 'Echos verstärken die Bewegung.' },
    { role: 'width', label: 'Stereo-Breite', opt: .5, tip: 'Mehr Weite im Break.' },
  ] },
  { id: 'mod-glitch', rubric: 'mod', name: 'Glitch & Stutter', desc: 'Rhythmische Zerhacker-Effekte, danach Filter und Raum.', slots: [
    { role: 'glitch', label: 'Glitch / Stutter', tip: 'Zerhackt und wiederholt im Takt.' },
    { role: 'filter', label: 'Filter', opt: .7, tip: 'Formt den zerhackten Sound.' },
    { role: 'delay', label: 'Delay', opt: .7, tip: 'Mehr Rhythmus.' },
    { role: 'reverb', label: 'Hall', opt: .6, tip: 'Klebt alles zusammen.' },
  ] },
  { id: 'mod-design', rubric: 'mod', name: 'Sound-Design', desc: 'Verzerren, filtern, bewegen, in den Raum stellen.', slots: [
    { role: 'dist', label: 'Distortion', tip: 'Neue Obertöne als Material.' },
    { role: 'filter', label: 'Filter', tip: 'Formt die Verzerrung.' },
    { role: 'mod', label: 'Modulation', tip: 'Bewegung.' },
    { role: 'pitch', label: 'Pitch / Formant', opt: .4, tip: 'Für ungewöhnliche Klangfarben.' },
    { role: 'delay', label: 'Delay', tip: 'Echos.' },
    { role: 'reverb', label: 'Hall', opt: .7, tip: 'Raum.' },
  ] },
  { id: 'mod-lofi', rubric: 'mod', name: 'Lo-Fi', desc: 'Alt, warm und ein bisschen kaputt.', slots: [
    { role: 'tape', label: 'Tape / Vintage', tip: 'Gleichlaufschwankungen und Bandsättigung.' },
    { role: 'filter', label: 'Filter', prefer: /low ?pass|filter/i, tip: 'Höhen abschneiden wie auf alter Hardware.' },
    { role: 'crush', label: 'Bitcrusher', opt: .6, tip: 'Weniger Bits, weniger Samplerate.' },
    { role: 'mod', label: 'Wow / Chorus', opt: .6, tip: 'Leierndes Band.' },
    { role: 'reverb', label: 'Hall', prefer: P.room, opt: .6, tip: 'Kleiner, dunkler Raum.' },
  ] },

  /* ---------- Send-Effekte ---------- */
  { id: 'ret-reverb', rubric: 'returns', name: 'Hall-Return', desc: 'Auf eine Return-Spur: Hall zu 100 % nass, davor und danach EQ.', slots: [
    { role: 'eq', label: 'EQ – vorher', tip: 'Hochpass um 300 Hz, Höhen etwas raus: der Hall matscht nicht.' },
    { role: 'reverb', label: 'Hall', tip: '100 % nass auf dem Return.' },
    { role: 'eq', label: 'EQ – nachher', opt: .5, tip: 'Hallfahne in den Mix einpassen.' },
    { role: 'sidechain', label: 'Ducking', opt: .5, tip: 'Hall weicht zurück, wenn die Stimme singt.' },
  ] },
  { id: 'ret-delay', rubric: 'returns', name: 'Delay-Return', desc: 'Echos, die mit jeder Wiederholung dunkler und schmutziger werden.', slots: [
    { role: 'delay', label: 'Delay', prefer: P.tapeDelay, tip: '100 % nass auf dem Return.' },
    { role: 'filter', label: 'Filter', opt: .6, tip: 'Hoch- und Tiefpass halten die Echos aus dem Weg.' },
    { role: 'sat', label: 'Sättigung', opt: .5, tip: 'Dreckigere Echos.' },
    { role: 'reverb', label: 'Hall', opt: .5, tip: 'Echos in einen Raum stellen.' },
  ] },
  { id: 'ret-trance', rubric: 'returns', name: 'Trance-Hall mit Pumpen', desc: 'Riesiger Hall, der mit der Kick atmet – der Sound großer Trance-Breaks.', slots: [
    { role: 'reverb', label: 'Großer Hall', prefer: P.hall, tip: 'Lange Hallzeit, langes Pre-Delay.' },
    { role: 'eq', label: 'EQ', tip: 'Tiefen raus, damit der Hall nicht wummert.' },
    { role: 'width', label: 'Stereo-Breite', opt: .5, tip: 'Noch breiter.' },
    { role: 'sidechain', label: 'Sidechain / Pump', tip: 'Der Hall pumpt mit der Kick.' },
  ] },

  /* ---------- Mixbus ---------- */
  { id: 'mix-analog', rubric: 'mixbus', name: 'Analoger Mixbus', desc: 'Wie über ein Mischpult auf Band gemischt.', slots: [
    { role: 'sat', label: 'Band / Konsole', prefer: P.tapeSat, tip: 'Leichte Bandsättigung verbindet die Spuren.' },
    { role: 'eq', label: 'EQ', prefer: P.vintageEq, tip: 'Sanfte, breite Korrekturen.' },
    { role: 'comp', label: 'Bus-Kompressor', prefer: P.bus, tip: '1–2 dB Glue, langsame Attack, Auto-Release.' },
    { role: 'eq', label: 'EQ – Feinschliff', opt: .4, tip: 'Luft und Tiefe nach der Kompression.' },
    { role: 'limiter', label: 'Limiter', opt: .4, tip: 'Nur zum Abhören auf Lautheit, vor dem Mastern abschalten.' },
  ] },
  { id: 'mix-modern', rubric: 'mixbus', name: 'Moderner, sauberer Mixbus', desc: 'Präzise Werkzeuge statt Farbe.', slots: [
    { role: 'dyneq', label: 'Resonanzen glätten', opt: .7, tip: 'Harte Frequenzen dynamisch zähmen.' },
    { role: 'eq', label: 'EQ', prefer: P.surgicalEq, tip: 'Präzise Korrekturen.' },
    { role: 'comp', label: 'Bus-Kompressor', prefer: P.bus, tip: 'Leichter Glue.' },
    { role: 'meter', label: 'Analyse', opt: .6, tip: 'Spektrum und Lautheit im Blick.' },
  ] },

  /* ---------- Mastering ---------- */
  { id: 'mst-classic', rubric: 'master', name: 'Klassische Mastering-Kette', desc: 'Korrigieren, verdichten, färben, verbreitern – der Limiter ganz zum Schluss.', slots: [
    { role: 'eq', label: 'EQ – korrigierend', prefer: P.surgicalEq, tip: 'Zuerst Probleme beheben.' },
    { role: 'multiband', label: 'Multiband / Dyn. EQ', opt: .6, tip: 'Einzelne Frequenzbereiche kontrollieren.' },
    { role: 'comp', label: 'Glue-Kompressor', prefer: P.bus, tip: '1–2 dB, langsame Attack.' },
    { role: 'sat', label: 'Sättigung / Exciter', opt: .6, tip: 'Dichte und Glanz.' },
    { role: 'width', label: 'Stereo-Breite', opt: .4, tip: 'Vorsichtig – Tiefen mono lassen.' },
    { role: 'limiter', label: 'Limiter', tip: 'Immer zuletzt: Lautheit und True-Peak.' },
    { role: 'meter', label: 'Analyse', opt: .7, tip: 'Hinter dem Limiter messen: LUFS und True-Peak.' },
  ] },
  { id: 'mst-club', rubric: 'master', name: 'Club- / Trance-Master', desc: 'Laut und druckvoll für große Anlagen.', slots: [
    { role: 'eq', label: 'EQ', tip: 'Sub kontrollieren, Mulm raus.' },
    { role: 'multiband', label: 'Multiband', tip: 'Tiefen fest, Höhen frei.' },
    { role: 'comp', label: 'Glue-Kompressor', prefer: P.bus, tip: 'Verdichtet den ganzen Track.' },
    { role: 'sat', label: 'Sättigung', tip: 'Mehr Dichte ohne mehr Pegel.' },
    { role: 'width', label: 'Stereo-Breite', opt: .5, tip: 'Höhen breit, Tiefen mono.' },
    { role: 'clipper', label: 'Clipper', opt: .6, tip: 'Schneidet Spitzen vor dem Limiter.' },
    { role: 'limiter', label: 'Limiter', tip: 'Zum Schluss.' },
    { role: 'meter', label: 'Analyse', opt: .7, tip: 'Lautheit kontrollieren.' },
  ] },
  { id: 'mst-suite', rubric: 'master', name: 'All-in-one-Suite', desc: 'Eine Mastering-Suite, die alles in einem Plugin erledigt.', slots: [
    { role: 'suite', label: 'Mastering-Suite', tip: 'EQ, Dynamik, Breite und Limiter in einem.' },
    { role: 'meter', label: 'Analyse', opt: .7, tip: 'Zur Kontrolle dahinter.' },
  ] },
];

/** Does a plugin family fit a role? `fam`: {name, category, kind, names: [variant names]} */
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

if (typeof module !== 'undefined') module.exports = { CHAIN_ROLES, CHAIN_RUBRICS, CHAIN_TEMPLATES, chainRoleFits };
