'use strict';
/* PlugShelf – the classic hardware many plugins emulate. The details panel ("About") shows the original
   a plugin models (e.g. the 1176 for every 1176-style compressor) with its specs and typical use.
   ORIG(title, text, facts, uses, patterns): patterns are matched against the plugin's name, lower case.
   Written from the makers' published specs; nothing is fetched at runtime. */
const ORIGINALS = [];
function ORIG(title, text, facts, uses, patterns) { ORIGINALS.push({ title, text, facts, uses, patterns }); }

/** The original a plugin name models, or null. */
function originalFor(name) {
  const n = ' ' + String(name).toLowerCase().replace(/[_]+/g, ' ') + ' ';
  return ORIGINALS.find(o => o.patterns.some(r => r.test(n))) || null;
}

ORIG('UREI / Universal Audio 1176 (1967)',
  'Bill Putnam’s FET peak limiter – the first all-transistor compressor with true peak limiting, and the most copied compressor there is.',
  ['Attack 20–800 µs (very fast), release 50 ms–1.1 s', 'Ratios 4:1, 8:1, 12:1, 20:1 – and “all buttons in” for aggressive, distorted compression',
   'Revisions: Rev A “Bluestripe” (more colour), LN Rev D/E (low noise), AE (adds 2:1)'],
  ['Lead vocals: 4:1, attack slow-ish (3), release fast (7), 5–8 dB', 'Drums and room mics: all buttons in, in parallel', 'Bass: 4:1 or 8:1 to even out the notes'],
  [/\b1176/, /black 76/, /fet-?76/]);

ORIG('Teletronix LA-2A Leveling Amplifier (1962)',
  'Jim Lawrence’s optical tube leveler: a light panel and a photocell do the compression, so it reacts smoothly and program-dependently.',
  ['Attack about 10 ms; release about 60 ms to 50 %, then 1–15 s', 'Only Peak Reduction and Gain, plus Compress / Limit',
   'Family: LA-2 (early 60s, slowest), LA-2A Gray (mid 60s), LA-2A Silver (late 60s, fastest)'],
  ['Vocals: 3–6 dB of gain reduction', 'Bass: 4–8 dB for an even level', 'Silver for drums, Gray for vocals/keys/guitars, LA-2 for strings and legato vocals'],
  [/\bla-?2a?\b/, /teletronix/, /white 2a/]);

ORIG('Pultec EQP-1A Program Equalizer (1951)',
  'Pulse Techniques’ passive tube equalizer – broad, musical curves and the famous low-end trick.',
  ['Low boost and attenuation at 20, 30, 60 or 100 Hz – both at once give a tight, deep low end (“Pultec trick”)',
   'High boost at 3–16 kHz with a bandwidth control; high attenuation at 5, 10 or 20 kHz', 'Pultec-Pro adds the MEQ-5 mid-range equalizer'],
  ['Kick and bass: boost and attenuate 60 Hz together', 'Vocals and mix bus: gentle high boost at 10–12 kHz for air'],
  [/pultec/, /\beqp-?1a\b/]);

ORIG('Fairchild 660 / 670 (1959)',
  'Rein Narma’s variable-mu tube limiter – 20 tubes, about 30 kg, the sound of Abbey Road in the 1960s.',
  ['Six time constants: from about 0.2 ms attack / 0.3 s release (TC1) to slow, program-dependent release of many seconds (TC5/TC6)',
   '670 is the stereo / lateral-vertical version of the mono 660'],
  ['Mix bus: TC2–TC3, 1–2 dB for glue', 'Vocals and drums: thick, smooth level control'],
  [/fairchild/, /\bvc-?670\b/]);

ORIG('SSL 4000 G Bus Compressor (1987)',
  'The VCA compressor in the master section of Solid State Logic’s G-series console – the classic “glue” on the mix bus.',
  ['Attack 0.1, 0.3, 1, 3, 10 or 30 ms', 'Release 0.1, 0.3, 0.6, 1.2 s or Auto', 'Ratio 2:1, 4:1 or 10:1'],
  ['Mix bus: 2:1, attack 30 ms, release Auto, 2–4 dB', 'Drum bus: 4:1, attack 10 ms, release 0.1–0.3 s'],
  [/ssl g bus/]);

ORIG('SSL 4000 E / G and 9000 J console channels',
  'Solid State Logic’s channel strips: E (1979, punchy “brown” or “black knob” EQ), G (1987, smoother) and J (1994, cleaner).',
  ['Four-band EQ with high and low pass filters', 'Channel compressor/limiter and expander/gate'],
  ['Drums: punch and attack with the E EQ', 'Whole mixes through one console model for a consistent sound'],
  [/console ssl/]);

ORIG('Neve 1073 / 1081 / 1084 (1970 –)',
  'Rupert Neve’s class-A, transformer-coupled mic preamps and equalizers – warm, thick and forward.',
  ['1073: high shelf 12 kHz; mids 0.36, 0.7, 1.6, 3.2, 4.8, 7.2 kHz; low shelf 35, 60, 110, 220 Hz; high pass 50–300 Hz',
   '1081: four bands; 1084: more frequencies and a high-Q option'],
  ['Vocals: a few dB at 3.2 or 4.8 kHz for presence', 'Guitars and drums: drive the preamp for saturation'],
  [/\b1073\b/, /pre 1973/, /\beq-?73\b/, /\beq-?81\b/, /neve 108[14]/]);

ORIG('API 2500 Bus Compressor',
  'API’s stereo VCA bus compressor – punchy rather than smooth.',
  ['Feed-forward (“New”) or feedback (“Old”) detection, knee from hard to soft', 'Thrust: a high-pass in the sidechain so the low end does not pump'],
  ['Drum bus: punch with Thrust on', 'Mix bus: low ratio, 1–3 dB'],
  [/api 2500/]);

ORIG('Empirical Labs Distressor EL8 (1995)',
  'Dave Derr’s digitally controlled analog compressor that can sound like many classic units – from clean to heavily coloured.',
  ['Ratios 1:1 to 20:1 plus “Nuke”', 'Dist 2 / Dist 3 add tube- and tape-like harmonics; British mode like 1176 all buttons'],
  ['Drums and room mics: Nuke or 20:1, in parallel', 'Vocals: 3:1 or 4:1, 4–8 dB'],
  [/distressor/]);

ORIG('EMT 140 Plate Reverb (1957)',
  'A large steel plate hung in a frame, driven like a speaker – the bright, dense reverb on countless records.',
  ['Plate about 2 × 1 m; decay adjustable by a damping plate, roughly 1–5 s', 'No early reflections – a smooth, dense tail'],
  ['Vocals: 1.5–2.5 s with 50–100 ms pre-delay', 'Snare: shorter decay for a bright tail'],
  [/emt 140/, /plate-?140/, /little plate/]);

ORIG('EMT 250 Electronic Reverberator (1976)',
  'One of the first digital reverbs – shaped like a small table, with lever controls.',
  ['Reverb, delay, chorus, phase and echo programs', 'Decay up to about 4.5 s'],
  ['Vocals and snare: the classic late-70s and 80s plate/room sound'],
  [/emt 250/]);

ORIG('Lexicon 224 (1978)',
  'One of the first affordable digital reverbs – the sound of many 80s records.',
  ['Concert Hall, Plate and Room programs; adjustable bass and mid decay'],
  ['Ballad vocals and snare: long, lush halls and plates'],
  [/\blx-?24\b/, /lexicon 224/]);

ORIG('Lexicon 480L (1986)',
  'Lexicon’s flagship digital reverb – the studio standard of the late 80s and 90s.',
  ['Two engines; Random Hall, Plate, Room and Ambience programs'],
  ['Vocals and orchestral mixes: big, smooth halls'],
  [/\b480l\b/]);

ORIG('Studer A800 (1978)',
  'Studer’s 24-track multitrack tape recorder – fat low end and gentle compression on transients.',
  ['Tape speed 15 or 30 ips; different tape formulations change the sound', 'Hitting the tape harder adds saturation and soft peak limiting'],
  ['Drums and bass: 15 ips for more low end', 'Mix bus: subtle glue and warmth'],
  [/a800/]);

ORIG('Roland RE-201 Space Echo (1974)',
  'Tape echo with three playback heads and a spring reverb – the sound of dub and many guitar and vocal throws.',
  ['12 mode positions combine the three heads with or without reverb', 'Repeat Rate (tape speed) and Intensity (feedback) – turned up, it self-oscillates'],
  ['Dub: high Intensity and moving Repeat Rate', 'Vocal throws and guitars: one head, a few repeats'],
  [/galaxy tape echo/, /tape-?201/, /space echo/, /space delay/]);

ORIG('Roland Dimension D SDD-320 (1979)',
  'A subtle stereo chorus without obvious wobble – widens without sounding modulated.',
  ['Four buttons (modes 1–4) with increasing depth; two can be combined'],
  ['Synth pads, guitars and vocals: width without a chorus effect', 'Mode 1 or 2 on a mix bus'],
  [/dimension-?d\b/, /studio d chorus/]);

ORIG('Roland Juno-6 / Juno-60 (1982)',
  'Roland’s six-voice polysynth – loved for its bucket-brigade chorus as much as for the synth itself.',
  ['Chorus modes I, II and I+II', 'One oscillator per voice plus sub-oscillator, 24 dB filter'],
  ['Pads and chords: Chorus I or II', 'The chorus alone on synths and guitars for width'],
  [/\bjun-?6\b/, /chorus ?60/]);

ORIG('Moog Minimoog Model D (1970) and the Moog ladder filter',
  'The first portable synthesizer – three oscillators into Bob Moog’s 24 dB/oct transistor ladder filter.',
  ['Ladder filter: warm, slightly loses bass at high resonance', 'Three VCOs, mixer with noise and external input'],
  ['Bass and leads', 'The filter alone on drums and pads for movement'],
  [/\bmini v\d?\b/, /filter mini/, /moog/]);

ORIG('Korg MS-20 (1978)',
  'Korg’s semi-modular monosynth with two aggressive, screaming filters.',
  ['High-pass and low-pass filter with strong resonance', 'Patch panel and an external signal processor for running other sounds through it'],
  ['Acid and techno leads, distorted basses', 'The filter alone on drums and vocals'],
  [/ms-?20/]);

ORIG('Oberheim OB-X / OB-Xa (1979 / 1980)',
  'Oberheim’s polyphonic synths – big brass and pads of the 80s.',
  ['Two oscillators per voice; OB-Xa adds a switchable 12/24 dB filter'],
  ['Brass stabs, wide pads'],
  [/\bob-?x[ad]?\b/, /\bop-?xa\b/]);

ORIG('Gates Sta-Level (1950s)',
  'A broadcast tube compressor with variable-mu tubes – slow, smooth and thick.',
  ['Very slow, program-dependent release', 'Few controls: input and output'],
  ['Vocals and bass: gentle, smooth level control'],
  [/tube-?sta/, /sta-?level/]);

ORIG('dbx 160 / 165A',
  'dbx’s VCA compressors with “Over Easy” soft knee – punchy and straightforward.',
  ['Over Easy soft knee; fast VCA response'],
  ['Kick, snare and bass: punch and control'],
  [/vca-?65/, /\bdbx\b/]);

ORIG('Neve 33609 (1985)',
  'Neve’s stereo bus compressor/limiter with diode-bridge gain reduction – fat and musical.',
  ['Compressor ratios 1.5:1 to 6:1, separate limiter; recovery from fast to auto'],
  ['Mix bus and drum bus: 2–3 dB'],
  [/33609/]);

ORIG('Neve 2254 (1969)',
  'Neve’s early diode-bridge limiter/compressor from the BCM10 and A88 consoles.',
  ['Compressor ratios 1.5:1 to 6:1; limiter; three recovery times'],
  ['Drums and bass: thick, coloured compression'],
  [/\b2254\b/]);

ORIG('Hammond B-3 (1954) and Leslie speaker',
  'The tonewheel organ with drawbars and the rotating Leslie speaker it is almost always played through.',
  ['Nine drawbars, percussion, scanner vibrato/chorus', 'Leslie: slow (chorale) and fast (tremolo) rotor speeds'],
  ['Gospel, rock and jazz organ', 'Leslie alone on guitars, keys and vocals'],
  [/\bb-?3 v/, /^ leslie /]);
