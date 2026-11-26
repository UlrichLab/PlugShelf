'use strict';
/* PlugShelf – short plugin descriptions for the details panel ("About").
   Written from the makers' own product information; nothing is fetched at runtime.
   PI(names, what, special, settings): names are separated by "|"; they are matched after pkey() below,
   so "UADx 1176AE Compressor", "UAD UA 1176AE" and "1176AE" can share one entry. */
const PLUGIN_INFO = {};

/** Name → lookup key: lower case, no punctuation, without maker prefixes and version/edition suffixes. */
function pkey(name) {
  let k = ' ' + String(name).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
  // a maker prefix goes only when a longer name is left ("UAD Raw" stays, "UAD Neve 1084" becomes "neve 1084")
  k = k.replace(/^ (uadx|uad|ua|fabfilter|izotope|soundtoys) (?=\S+ \S)/, ' ');
  for (let i = 0; i < 4; i++) k = k.replace(/ (legacy|classic|se|v\d+|mk ?ii|mkii|mk\d|deluxe|free|pro|hd|x)\s*$/, ' ');
  return k.trim().replace(/\s+/g, ' ');
}
function PI(names, what, special = [], settings = []) {
  for (const n of names.split('|')) PLUGIN_INFO[pkey(n)] = { what, special, settings };
}
/** The entry for a plugin name: exact key, then shorter keys (drops trailing words). */
function pluginInfo(name) {
  let k = pkey(name);
  while (k) {
    if (PLUGIN_INFO[k]) return PLUGIN_INFO[k];
    if (!k.includes(' ')) break;
    k = k.slice(0, k.lastIndexOf(' '));
  }
  return null;
}

PI('Decapitator', 'Analog saturation from Soundtoys, modelled on five hardware circuits – from subtle warmth to heavy distortion.',
  ['Five styles: A (Ampex 350 tape preamp), E (EMI TG channel), N (Neve 1057), T and P (Thermionic Culture Vulture triode / pentode)', '“Punish” adds 20 dB of drive', 'Tone and low/high cut shape the colour after the saturation', 'Auto gain keeps the level steady while you push Drive'],
  ['Drums: style A or E, Drive 3–5, Mix 30–50 %', 'Vocals: style N, Drive 2–3, Tone slightly dark', 'Bass: style T, Mix 50 %']);
PI('EchoBoy|EchoBoy Jr', 'Soundtoys delay that models classic tape, analog and digital echo units – from clean digital to worn tape.',
  ['Many echo styles (Space Echo, EchoPlex, Memory Man, DM-2, Studio Tape …)', 'Modes: Single, Dual, Ping-Pong and Rhythm (up to 16 taps); Jr is the one-knob-per-job version', 'Saturation, wobble and groove controls'],
  ['Vocal slap: 80–120 ms, Feedback 0–15 %', 'Dub delay: dotted 1/8, Feedback 45–60 %, style Space Echo']);
PI('Pro-Q 2|Pro-Q 3|Pro-Q 4|Pro-Q', 'FabFilter’s precise digital EQ with a large interactive spectrum display – surgical cuts as well as broad tone shaping.',
  ['Up to 24 bands; from version 3 every band can be dynamic', 'Zero latency, natural phase or linear phase', 'Mid/side and left/right per band', 'Spectrum Grab: drag a peak straight from the analyser'],
  ['High-pass at 80–120 Hz on non-bass tracks', 'Narrow dynamic cuts for resonances instead of static cuts']);
PI('Pro-L|Pro-L 2', 'Mastering limiter from FabFilter with several limiting algorithms and detailed loudness metering.',
  ['Version 2: eight algorithms (Transparent, Punchy, Dynamic, Allround, Aggressive, Modern, Safe, Bus)', 'True-peak limiting and oversampling', 'Loudness meter with LUFS targets'],
  ['Streaming master: ceiling −1 dBTP', 'Start with Modern or Transparent, attack and release in the middle']);
PI('Teletronix LA-2A|LA-2A Tube Compressor|White 2A', 'Emulation of the Teletronix LA-2A optical tube leveling amplifier – smooth, program-dependent compression.',
  ['Only two main controls: Peak Reduction and Gain', 'Compress / Limit switch', 'Slow, two-stage optical release that sounds natural on vocals and bass'],
  ['Vocals: Peak Reduction for 3–6 dB gain reduction', 'Bass: 4–8 dB, then make-up with Gain']);
PI('UA 1176LN Rev E|UA 1176 Rev A|UAD UA 1176 Rev A|UAD UA 1176LN Rev E|UA 1176AE|UA 1176SE|UA 1176LN|1176LN Rev E Compressor|1176 Rev A Compressor|1176AE Compressor|1176 FET Compressor|Black 76|Comp FET-76',
  'FET limiting amplifier in the style of the UREI/UA 1176 – very fast, punchy and with a forward, bright character.',
  ['Attack from 20 µs, release about 50 ms to 1.1 s; higher knob numbers are faster', 'Ratios 4, 8, 12, 20 and “all buttons in” for aggressive saturation', 'Rev A (“blue stripe”) is grittier, Rev E / LN cleaner, AE has a gentle 2:1 ratio and slower attack'],
  ['Vocals: ratio 4, attack 3, release 7, 3–7 dB reduction', 'Drum room: all buttons, attack 1, release 7, blend in parallel']);
PI('ValhallaVintageVerb', 'Algorithmic reverb from Valhalla DSP inspired by the digital reverbs of the 1970s and 1980s.',
  ['Many modes (Concert Hall, Plate, Room, Chamber, Smooth Random, Nonlinear …)', 'Colour modes 1970s, 1980s and Now change bandwidth and modulation', 'Very light on CPU'],
  ['Vocal plate: Plate mode, Decay 1.2–2 s, Pre-delay 20–40 ms', 'Pad: Concert Hall, 1980s colour, Decay 4–8 s']);
PI('soothe2', 'Dynamic resonance suppressor from oeksound – finds harsh or ringing frequencies and turns them down only when they appear.',
  ['Works across the whole spectrum at once', 'Mid/side processing and delta listening (hear only what is removed)', 'Sidechain input'],
  ['Harsh vocals: focus 2–6 kHz, moderate Depth', 'Mix bus: low Depth, slow release']);
PI('OTT', 'Free three-band compressor from Xfer Records based on Ableton’s “OTT” preset – heavy upward and downward compression.',
  ['Upward and downward compression in each band', 'Depth control for parallel blend', 'Signature sound of EDM and bass music'],
  ['Start with Depth 20–40 % – full depth is very extreme', 'On synths and drums rather than the whole mix']);
PI('Ozone 12|Ozone', 'iZotope’s mastering suite: EQ, dynamics, imaging, exciter and maximizer in one plugin, with an assistant that builds a starting chain.',
  ['Master Assistant analyses the track and suggests a chain', 'Modules such as Clarity, Stabilizer, Impact and Low End Focus', 'Reference matching against other songs'],
  ['Let the assistant start, then reduce what it adds', 'Maximizer: true peak on, ceiling −1 dB']);
