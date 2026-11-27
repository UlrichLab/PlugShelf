'use strict';
/* PlugShelf – more detail for the Universal Audio (UAD / UADx) plugins: what the hardware was, what the
   plugin adds and starting points. PIX(names, special, settings) adds lines to an existing entry;
   PI(...) (plugin-info.js) creates a new one. Written from UA's product pages and manuals. */
/** Tips from tutorials (UA's videos and articles, engineers' guides) – shown under "Tips from tutorials". */
function PIT(names, tips) {
  for (const n of names.split('|')) { const x = pluginInfo(n); if (x) x.tips = [...(x.tips || []), ...tips.filter(t => !(x.tips || []).includes(t))]; }
}
function PIX(names, special = [], settings = []) {
  for (const n of names.split('|')) {
    const x = pluginInfo(n);
    if (!x) continue;
    for (const t of special) if (!x.special.includes(t)) x.special.push(t);
    for (const t of settings) if (!x.settings.includes(t)) x.settings.push(t);
  }
}

// ---------- new entries ----------
PI('Cooper Time Cube|Cooper Time Cube Delay|Cooper Time Cube Mk II|uaudio_cooper_time_cube',
  'Emulation of the Cooper Time Cube Mk II (1970s) – a delay that sends the sound through long coiled tubes, like a garden hose, instead of tape or chips.',
  ['Acoustic delay line: two short delays (about 14 and 16 ms in the original) with a soft, mid-range voice',
   'Short, slightly filtered repeats that thicken instead of echoing – a studio secret for doubling'],
  ['Vocals: a short delay on one side, the dry voice in the middle, for natural doubling',
   'Stereo width: slightly different delays left and right on guitars or keys',
   'Snare or claps: a short slap for a thicker hit']);

PI('Empirical Labs FATSO Jr|Empirical Labs FATSO Sr|FATSO Jr|FATSO Sr|uaudio_empirical_labs_fatso_jr|uaudio_empirical_labs_fatso_sr',
  'Emulation of the Empirical Labs FATSO (“Full Analog Tape Simulator and Optimizer”) by Dave Derr – tape-style saturation and compression in one box.',
  ['Warmth: soft high-frequency saturation and limiting, like hitting tape hard',
   'Tranny: transformer harmonics, mostly in the low end', 'Built-in compressor with several characters, from gentle bus glue to aggressive squash',
   'Jr is the compact version; Sr is the deluxe version with more control over the compressor',
   'Belongs to both Dynamics and Saturation: it compresses and colours at the same time'],
  ['Drum bus: Warmth around 3–5, compressor on a gentle setting, then Input for more colour',
   'Bass: Tranny on for weight and harmonics', 'Mix bus: little Warmth for tape-like rounding of harsh highs',
   'Harsh cymbals or vocals: Warmth tames the top end without an EQ']);

// ---------- compressors ----------
PIX('UAD UA 175-B|UA 175-B|175-B Compressor|UA 176|176 Compressor',
  ['Bill Putnam’s tube compressors from the early 1960s; the 176 was the last tube design before the solid-state 1176'],
  ['Vocals: 3–5 dB, slow attack, for a warm, upfront voice', 'Bass and acoustic guitar: gentle leveling with tube colour', 'Mix bus: 1–2 dB for vintage glue']);
PIX('UAD Fairchild 670 Legacy|Fairchild 670 Legacy|Fairchild 670',
  [],
  ['Mix bus: time constant 2 or 3, 1–2 dB', 'Vocals: time constant 1–2, input for 3–5 dB', 'Drums: time constant 1, harder input, in parallel for thickness']);
PIX('UAD Neve 2254 E|Neve 2254 E|Neve 2254 E Dual',
  ['Diode-bridge gain reduction from Neve consoles of the late 1960s', 'Compressor and limiter in one unit, with three recovery times'],
  ['Drum bus: ratio 3:1, fast recovery, 3–4 dB', 'Bass: 4:1 with the limiter catching peaks', 'Mix bus: 2:1, slow recovery, 1–2 dB']);
PIX('UAD Neve 33609 C|Neve 33609 C|Neve 33609SE|Neve 33609',
  ['The 33609/C is the later revision with the cleaner, more modern sound'],
  ['Mix bus: compressor 2:1, recovery Auto 1, 1–3 dB', 'Drum bus: 4:1, fast recovery, limiter on to catch peaks', 'Bass: 3:1 for an even level without losing punch']);
PIX('UAD API 2500|API 2500|API 2500 Bus Compressor',
  [],
  ['Mix bus: ratio 2:1, attack 10–30 ms, Thrust on, Knee soft, 1–3 dB']);
PIX('UAD SSL G Bus Compressor|SSL G Bus Compressor|SSL G Bus Compressor Legacy',
  ['The new version adds a variable sidechain high-pass filter and a Mix knob for parallel compression'],
  []);
PIX('UAD Empirical Labs Distressor|Empirical Labs Distressor',
  ['Belongs to both Dynamics and Saturation: Dist 2 and Dist 3 add even and odd harmonics'],
  []);

// ---------- channel strips, preamps and EQs ----------
PIX('UAD UA 610-A|UAD UA 610-B|UA 610-A|UA 610-B|610-A Preamp and EQ|610-B Preamp and EQ',
  ['610-A: from Bill Putnam’s 610 console of the early 1960s – darker, with simple high and low shelves',
   '610-B: UA’s modern reissue – cleaner, with more EQ options', 'Gain and Level together decide how much tube colour you get'],
  ['Vocals: drive Gain high and turn Level down for warm, thick colour', 'Drums and room mics: hit it hard for vintage saturation', 'DI bass: a little low shelf and drive for weight']);
PIX('UAD Neve 1084|Neve 1084',
  ['Class-A transformer-coupled preamp and three-band EQ from Neve’s 1970s consoles', 'Mid band with a high-Q option, high and low shelves, high pass'],
  ['Vocals: a few dB at 3.2 or 4.8 kHz for presence', 'Kick: low shelf at 60 Hz plus a cut at 400 Hz', 'Guitars: drive the preamp for harmonics']);
PIX('UAD Neve 88RS|Neve 88RS|Neve 88RS Legacy',
  ['The channel of the large-format Neve 88R console (late 1990s) – cleaner and more modern than the 1073 era',
   'Preamp, four-band EQ, filters, compressor/limiter and gate/expander in one strip'],
  ['Drums: gate for tighter toms and snare, then EQ', 'Vocals: compressor 3:1, 3–6 dB, high pass at 80–100 Hz', 'Whole mix: the same strip on every channel for a console-like sound']);
PIX('UAD Avalon VT-737sp|Avalon VT-737sp|Avalon VT-737 Channel Strip',
  ['Class-A tube preamp, optical compressor and four-band EQ from the 1990s – known for clean, big vocals'], []);
PIX('UAD Manley VOXBOX|Manley VOXBOX|Manley VOXBOX Channel Strip',
  ['Tube preamp, optical compressor, EQ, de-esser and limiter – a complete vocal chain in one unit'],
  ['Vocals: compressor 3–6 dB, de-esser at 6–8 kHz, a little high boost for air', 'Bass: preamp drive and compressor for a round, even tone']);
PIX('UAD Century Tube Channel Strip|Century Tube Channel Strip',
  ['Kept simple on purpose: a few controls for quick, musical tracking'],
  ['Vocals and acoustic guitar: compressor to taste, a little high EQ', 'As a quick colour strip on any track']);
PIX('UAD Precision Channel Strip|Precision Channel Strip',
  [],
  ['Any track: high pass first, then EQ, then compressor 3:1 with 3–5 dB', 'Drums: gate/expander to clean up bleed']);
PIX('UAD CS-1|CS-1',
  ['Combines four UA modules: EX-1 EQ/compressor, DM-1 delay/modulation and RS-1 reflection engine'],
  ['Quick vocal chain: EQ and compressor, a little room from the RS-1', 'Doubling: DM-1 with short delay and slow modulation']);
PIX('UAD Pultec EQP-1A Legacy|Pultec EQP-1A Legacy|UAD Pultec-Pro Legacy|Pultec-Pro Legacy',
  ['Pultec-Pro combines the EQP-1A with the MEQ-5 mid-range equalizer for full-range shaping'], []);
PIX('UAD Dangerous BAX EQ Master|Dangerous BAX EQ Master|UAD Dangerous BAX EQ Mix|Dangerous BAX EQ Mix',
  ['Master: stepped controls for exact recall; Mix: continuous controls for mixing'],
  ['Mix bus: low shelf +1 dB at 70 Hz, high shelf +1 dB at 18 kHz', 'Mix bus: high pass at 12–18 Hz to clean up sub rumble']);

// ---------- reverbs and delays ----------
PIX('UAD EMT 250|EMT 250|EMT 250 Electronic Reverb',
  ['Lever controls for decay and pre-delay; programs for reverb, delay, phase, chorus and echo'],
  ['Vocals: reverb program, decay 1.5–2.5 s, pre-delay 20–60 ms', 'Snare: short decay for the classic 80s room-plate sound', 'Chorus program on synths or guitars for width']);
PIX('UAD Lexicon 480L|Lexicon 480L',
  ['Lexicon’s famous Random Hall: moving reflections that avoid metallic ringing'],
  ['Vocals: Hall or Plate, 1.8–2.5 s, pre-delay 30–60 ms', 'Drums: Ambience or Room, short, for space without a tail', 'Orchestral and pads: large hall, 3–4 s']);
PIX('UAD Pure Plate|Pure Plate|Pure Plate Reverb',
  [],
  ['Vocals: decay 1.5–2 s, pre-delay 20–40 ms, low cut around 200 Hz', 'Snare: 1 s for a bright tail']);
PIX('UAD Precision Reflection Engine|Precision Reflection Engine',
  [],
  ['Dry sources: a small room to place them in a space', 'Mix: one room on several tracks so they sound recorded together']);
PIX('UAD RealVerb-Pro|RealVerb-Pro',
  ['Separate room shape, size and surface material, plus a spectral EQ for the reverb'],
  ['Vocals: medium room, wood surface for warmth', 'Morph between two rooms for evolving space']);
PIX('UAD Capitol Chambers|Capitol Chambers',
  ['The underground echo chambers at Capitol Studios, Hollywood – designed with Les Paul in the 1950s; heard on records by Frank Sinatra and many others'],
  []);
PIX('UAD Precision Delay Mod|Precision Delay Mod|UAD Precision Delay Mod L|Precision Delay Mod L',
  ['Two independent delays with modulation, tempo sync and filters'],
  ['Doubling: 20–30 ms with slow modulation', 'Stereo slapback: 90 ms left, 120 ms right, little feedback', 'Chorus: 10–15 ms with modulation depth up']);
PIX('UAD Studio D Chorus|Studio D Chorus',
  [],
  ['Synth pads and keys: mode 1 or 2 for width', 'Clean guitar: mode 3 or 4', 'Vocals: mode 1 on a send for subtle width']);

// ---------- amps, saturation and tape ----------
PIX('UAD Ampeg SVTVR Classic|Ampeg SVTVR Classic',
  ['Models the Ampeg SVT-VR tube head and its 8×10 cabinet – the classic rock bass rig since 1969', 'Ultra Lo and Ultra Hi switches and a mid-frequency selector'],
  ['Rock bass: gain around halfway, mids up at 800 Hz', 'Blend it with the clean DI for low end and definition', 'Ultra Lo for a scooped, modern tone']);
PIX('UAD Marshall Plexi Classic|Marshall Plexi Classic',
  ['Models the Marshall 1959 Super Lead 100 W head of the late 1960s – no master volume, so the tone comes from turning it up'],
  ['Classic rock: volume high, treble and presence to taste', 'Blues crunch: lower volume and play with your guitar’s volume knob']);
PIX('UAD Raw|Raw',
  ['Models the Pro Co RAT pedal from 1978', 'Filter works backwards: turning it up makes the sound darker'],
  ['Guitar: Distortion halfway, Filter around 10 o’clock', 'Bass or synths: in parallel for gritty edge', 'Drums: a little on a parallel bus for aggression']);
PIX('UAD Studer A800|Studer A800|Studer A800 Tape Recorder',
  ['Tape types like 250, 456, 900 and GP9; speeds 7.5, 15 and 30 ips', 'Each speed shifts the low-end “head bump” and changes the distortion; 7.5 ips is the noisiest'],
  ['Drums and bass: push Input for saturation', 'Mix bus: 30 ips, little Input, for subtle glue', 'Every track: a tape stage on all channels for an analog feel']);
PIX('UAD Precision Enhancer Hz|Precision Enhancer Hz',
  [],
  ['Bass: choose the bass’s fundamental, add harmonics until it is heard on small speakers', 'Kick: a little enhancement at 50–60 Hz']);
PIX('UAD Moog Multimode Filter|Moog Multimode Filter|UAD Moog Multimode Filter SE|Moog Multimode Filter SE|UAD Moog Multimode Filter XL|Moog Multimode Filter XL',
  ['SE is the lower-DSP version; XL adds a step sequencer, envelope follower and LFO'], []);
PIX('UAD Galaxy Tape Echo|Galaxy Tape Echo',
  ['Models the Roland RE-201 Space Echo with its three heads and spring reverb'], []);

// ---------- tips from tutorials: UA's "Tips & Tricks" / "5-Minute UAD Tips" and engineers' guides ----------
PIT('UAD UA 1176 Rev A|UAD UA 1176AE|UAD UA 1176LN Legacy|UAD UA 1176LN Rev E|UAD UA 1176SE Legacy|1176 FET Compressor|1176 Rev A Compressor|1176AE Compressor|1176LN Rev E Compressor', [
  'All buttons: Shift-click any ratio button – used mostly on drums and room mics',
  'Drums: plenty of Input, fairly slow attack, quick release, all buttons in',
  'Fastest attack and release add distortion – useful on bass, and on lead vocals for grit',
  '1176AE: the 2:1 ratio gives smooth, soft compression for vocals',
  'Bass and kick: blend in parallel with the Mix control, or shape what drives the compressor with the sidechain filter (newer versions)',
  'The GR meter looks strange with all buttons in – the hardware does the same']);
PIT('UAD Pultec EQP-1A Legacy|UAD Pultec-Pro Legacy|EQP-1A', [
  'Mix bus: lift the top end and combine low boost and attenuation – a bigger low end without mud',
  'Kick: 60 Hz, boost about 5, attenuate a little more than that',
  'Bass: 20 or 30 Hz for extra weight; vocals: 100 Hz is where the body sits',
  'Careful with heavy drive: kick and bass can get muddy in the low mids']);
PIT('UAD SSL G Bus Compressor|SSL G Bus Compressor Legacy', [
  'Mix bus (UA): slow attack, fast release or Auto, sidechain filter on, 2–4 dB',
  'Dynamic mixes that pump: use a slower release',
  'More punch: lower threshold, faster attack, then turn the Mix knob down for parallel compression',
  'Drum bus: 10:1 for the harder sound; fast attack and release are the most audible']);
PIT('UAD Empirical Labs Distressor|Empirical Labs Distressor', [
  'Vocals: start with the Opto ratio – 10:1 with an optical compressor’s response',
  'Drums: a parallel bus with Nuke, fast attack and release, pushed hard',
  'Drum bus: the sidechain high-pass stops low-end pumping',
  'Harsh vocals: Band Emphasis makes it react harder to upper mids and sibilance']);
PIT('Empirical Labs FATSO Jr|Empirical Labs FATSO Sr', [
  'Set the compressor first – it changes how Warmth reacts',
  'Think of Warmth as a threshold: 7 gives the most Warmth',
  'Do not copy settings between tracks – Input level and compressor mode change the sound completely',
  'Compressor modes: Buss, G.P., Tracking and Spank']);
PIT('UAD Studer A800|Studer A800 Tape Recorder', [
  'Mix bus: keep Input and Output conservative to keep headroom',
  'Start from the presets: tape type, speed, CAL level and EQ set up for different genres',
  'Example (Sound On Sound): 456 tape, 15 ips, CAL +9 dB, bias slightly up for extra saturation']);
PIT('UAD Fairchild 670 Legacy|VC-670', [
  'Time constants 1–2 for drums and aggressive sources; 5 and 6 react to the music (program-dependent)',
  'Mix bus (UA user tip): Mix about 75 %, time constant 5',
  'Too fast a setting can kill sustain']);
PIT('UAD Galaxy Tape Echo|Galaxy Tape Echo', [
  'Mode 2 adds stereo width to mono sources',
  'Dub: raise Intensity until it self-oscillates, then ride Repeat Rate to bend the pitch',
  'The Echo/Normal switch is the dub switch: it cuts the send into the echo while the tail rings out',
  'Vocals and drums: crank Input for tape harmonics; on vocals, from tight slapback to long throws at phrase ends']);
PIT('UAD EMT 140|EMT 140 Plate Reverb', [
  'The dampers set the reverb time from 0.5 to 5.5 s',
  'Width: narrow on snare, wide on vocals – each gets its own space',
  'Ballads: longer decay, less pre-delay; modern, tight sound: shorter decay, more pre-delay',
  'Balance keeps a mono snare reverb centred']);
PIT('UAD Pure Plate|Pure Plate Reverb', [
  'Vocals (UA, Peter Mokran): ballads with longer decay and less pre-delay; tighter, modern sound with shorter decay and more pre-delay']);
PIT('UAD API 2500|API 2500 Bus Compressor', [
  'Parallel drum bus: attack 0.03 ms, release variable at its fastest (50 ms), ratio 10:1',
  'Gentler: compress the single drums lightly, then 2–3 dB more on the drum bus']);
PIT('UAD Neve 1084|Neve 1084', [
  'Vocals: the high shelf at 10, 12 or 16 kHz adds air – the 1073 does not have these choices',
  'Kick: leave the high pass off unless the drum booms']);
