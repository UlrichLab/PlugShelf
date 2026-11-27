'use strict';
/* PlugShelf – three more chain categories:
   - "Instrument Chains": a synth (Arturia V Collection, The Legend HZ, KORG, …) with a preset of the right kind,
     followed by the effects that sound is usually run through – loads as an Instrument Rack onto a MIDI track.
   - "Sound Design": effect chains for textures, risers, impacts, transitions and special effects.
   - "Experimental": like Sound Design, but every module also gets a random maker preset (H3000, Soundtoys,
     Plugin Alliance, Strymon …), so each roll is a new sound.
   Instrument choices and effects follow well-known records and common production practice (see `src`);
   presets are picked at random from the kind given in `pcat` (category / type / name of the maker's presets). */
(function () {
  const T = typeof CHAIN_TEMPLATES !== 'undefined' ? CHAIN_TEMPLATES : require('./chain-data.js').CHAIN_TEMPLATES;
  const R = typeof CHAIN_RUBRICS !== 'undefined' ? CHAIN_RUBRICS : require('./chain-data.js').CHAIN_RUBRICS;
  const at = R.findIndex(r => r.group);
  R.splice(at < 0 ? R.length : at, 0, { id: 'synth', name: 'Instrument Chains' }, { id: 'sounddesign', name: 'Sound Design' }, { id: 'experimental', name: 'Experimental' });

  // ---------- instruments: which synth for which sound, and which presets ----------
  const SYN = {
    moog: /mini ?v|legend/i,                                     // Minimoog-style: Mini V, The Legend (HZ)
    bass: /mini ?v|legend|acid v|arp 2600|ms-?20|prophet|jup-?8|op-?xa|monopoly|pigments|bass bully/i,
    acid: /acid v|phoscyon/i,
    lead: /mini ?v|legend|prophet|jup-?8|op-?xa|cs-?80|arp 2600|pigments|ms-?20|monopoly/i,
    pad: /jun-?6|jup-?8|cs-?80|prophet|op-?xa|pigments|polysix|dx7|cmi|m1|zenology/i,
    juno: /jun-?6|polysix/i,
    cs80: /cs-?80/i,
    poly: /prophet|jup-?8|op-?xa|polysix|jun-?6|cs-?80/i,
    keys: /stage-?73|wurli|piano v|dx7|lounge lizard|m1|ezkeys/i,
    ep: /stage-?73|wurli|lounge lizard|dx7/i,
    organ: /b-?3/i,
    fm: /dx7|digitone/i,
    arp: /legend|pigments|jup-?8|mini ?v|prophet|monopoly|op-?xa|microkorg/i,
    texture: /pigments|cmi|augmented|cs-?80|dx7|soundpaint|dust/i,
    brass: /cs-?80|op-?xa|jup-?8|prophet|ob-?xd/i,
    house: /m1|microkorg|dx7|pigments|zenology/i,
    any: /./,
  };
  const PC = {
    bass: /bass/i, sub: /sub|bass/i, lead: /lead/i, pad: /pad|string|atmo|ambient|texture|choir/i, keys: /key|piano|\bep\b|electric|clav|rhodes|wurl/i,
    organ: /organ/i, brass: /brass|horn/i, arp: /arp|seq|sequence/i, pluck: /pluck|bell|mallet|perc/i, fx: /sfx|effect|\bfx\b|texture|noise|atmo|drone/i,
    chord: /chord|stab|poly/i, strings: /string|orchestr/i,
  };
  /** The instrument slot. */
  const I = (label, syn, pcat, tip, more = {}) => ({ role: 'inst', label, prefer: syn, ...(syn.source !== '.' ? { only: syn } : {}), ...(pcat ? { pcat } : {}), tip, ...more });
  const s = (role, label, prefer, tip, more = {}) => ({ role, label, ...(prefer ? { prefer } : {}), tip, ...more });

  // ---------- effects ----------
  const X = {
    eqClean: () => s('eq', 'Clean-up EQ', /pro-?q|weiss eq|bx_digital|kirchhoff|ozone \d+ equalizer/i, 'High-pass below the lowest note, cut mud at 200–400 Hz.'),
    eqTone: (tip = 'Broad tone shaping – lift the air, tame the low mids.') => s('eq', 'Tone EQ', /pultec|eqp|maag|sie-?q|eq-?73|1073|bx_digital|pro-?q|weiss eq/i, tip),
    soothe: (tip = 'Takes out harsh resonances that bright synths build up.') => s('dyneq', 'Resonance control', /soothe/i, tip, { opt: .7 }),
    fet: (tip = 'Fast attack, 3–5 dB – keeps the level steady.') => s('comp', 'FET compressor', /1176|\b76\b|\bfet\b/i, tip, { set: { Ratio: [4, ''] } }),
    opto: (tip = 'Gentle, smooth leveling – 2–4 dB.') => s('comp', 'Opto compressor', /la-?2a|opto|white 2a|teletronix/i, tip),
    glue: (tip = 'Slow attack, auto release, 1–3 dB of glue.') => s('comp', 'Bus compressor', /ssl|glue|bus|townhouse|2500|33609/i, tip, { set: { Ratio: [2, ''] } }),
    ott: (tip = 'Upward and downward multiband compression – denser and brighter.') => s('multiband', 'Multiband (OTT style)', /\bott\b|pro-?mb|multi/i, tip),
    tube: (tip = 'Warm tube saturation – drive until it thickens.') => s('sat', 'Tube saturation', /decapitator|tube|culture|radiator|saturn|magma|redoptor/i, tip),
    decap: (tip = 'Drive for grit and harmonics; blend with Mix.') => s('sat', 'Saturation', /decapitator|saturn|kraftur|devastor|culture/i, tip),
    dist: (tip = 'Distortion for bite – tone down the fizz.') => s('dist', 'Distortion', /devastor|decapitator|saturn|kraftur|coldfire|opamp|blackdist|distorange|rat|raw/i, tip),
    tape: (tip = 'Tape saturation and a little wow – the analog record feel.') => s('tape', 'Tape', /tape|studer|a800|j-?37|kiss of shame|teac|tascam|mello-?fi|vintage tape/i, tip),
    lofi: (tip = 'Bit and sample-rate reduction, noise – the sampler/cassette feel.') => s('crush', 'Lo-fi', /decimort|sp950|s12x|ak9x|lo-?fi|redux|samplex|vinyl/i, tip),
    juno: (tip = 'Juno chorus – the classic 80s width.') => s('chorus', 'Juno chorus', /jun-?6|chorus ?60|syntorus/i, tip),
    dim: (tip = 'Dimension D – width without obvious wobble.') => s('chorus', 'Dimension chorus', /dimension|studio d/i, tip),
    chorus: (tip = 'Chorus for width; slow rate.') => s('chorus', 'Chorus', /chorus|dimension|jun-?6|syntorus|ensemble|microshift/i, tip),
    phaser: (tip = 'Slow phaser sweep in time with the song.') => s('mod', 'Phaser', /bi-?tron|phasemistress|fazortan|godfazer|phas/i, tip),
    flanger: (tip = 'Jet flanger – slow rate, feedback for the whoosh.') => s('mod', 'Flanger', /flang|ubermod|spacemodulator|syntorus/i, tip),
    trem: (tip = 'Tremolo or auto-pan synced to the tempo.') => s('mod', 'Tremolo / pan', /tremolator|panman|auto ?pan|tremolo/i, tip),
    filt: (tip = 'Filter with envelope or LFO movement.') => s('filter', 'Filter', /filterfreak|volcano|m12|filter mini|filtron|ms-?20|moog|simplon|micro/i, tip),
    tapeDly: (tip = 'Tape echo – dotted 1/8, feedback 25–35 %.') => s('delay', 'Tape echo', /re-?201|tape-?201|galaxy|echoboy|el capistan|space delay|tape echo/i, tip, { set: { Mix: [20, '%'], Feedback: [30, '%'] } }),
    dly: (tip = 'Synced delay – 1/8 dotted or 1/4, filter the repeats.') => s('delay', 'Delay', /timeless|echoboy|primaltap|valhalladelay|bx_delay2500|brigade|\bdig\b/i, tip, { set: { Mix: [18, '%'], Feedback: [30, '%'] } }),
    pingpong: (tip = 'Ping-pong delay for stereo movement.') => s('delay', 'Ping-pong delay', /timeless|echoboy|valhalladelay|tekturon|primaltap/i, tip, { set: { Mix: [15, '%'], Feedback: [35, '%'] } }),
    plate: (tip = 'Plate reverb, 1.5–2.5 s.') => s('reverb', 'Plate', /plate|emt|140/i, tip, { set: { Mix: [18, '%'] } }),
    hall: (tip = 'Big hall, 3–5 s – the 80s Lexicon sound.') => s('reverb', 'Hall', /lx-?24|480|vintageverb|valhallaroom|pro-?r|hall/i, tip, { set: { Mix: [22, '%'] } }),
    huge: (tip = 'Endless, modulated space.') => s('reverb', 'Huge reverb', /supermassive|shimmer|blackhole|toraverb|spacerek|intensity/i, tip, { set: { Mix: [30, '%'] } }),
    spring: (tip = 'Spring reverb for dub and surf.') => s('reverb', 'Spring', /spring/i, tip, { set: { Mix: [20, '%'] } }),
    room: (tip = 'Short room for depth.') => s('reverb', 'Room', /room|chamber|ambien|stone/i, tip, { set: { Mix: [15, '%'] } }),
    width: (tip = 'Widen the top, keep the low end mono.') => s('width', 'Stereo width', /microshift|stereomaker|spread|imager/i, tip, { opt: .7 }),
    pump: (tip = 'Rhythmic ducking against the kick.') => s('sidechain', 'Sidechain pump', /shaperbox|midishaper|trackspacer|kickstart/i, tip),
    glitch: (tip = 'Stutter, slice and repeat in time.') => s('glitch', 'Glitch', /effectrix|turnado|fragments|portal|graindad|shaperbox/i, tip),
    pitch: (tip = 'Pitch and harmonies – octaves, detune, shimmer.') => s('pitch', 'Pitch', /h3000|microshift|alterboy|crystallizer|octave|harmon/i, tip),
    amp: (tip = 'Run the synth through an amp for grit.') => s('amp', 'Amp', /rockrack|ampeg|plexi|rocker|bass one|marshall/i, tip),
    limit: (tip = 'Catch the peaks of resonant patches.') => s('limiter', 'Limiter', /pro-?l|limit/i, tip, { opt: .5 }),
  };

  // shared with chain-more.js
  (typeof window !== 'undefined' ? window : globalThis).CHAIN_FX = { X, s, I, SYN, PC };

  // ---------- Instrument Chains (~100) ----------
  // [name, description, source or '', genres, instrument slot, effect slots]
  const add = (id, name, desc, src, also, slots, rubric = 'synth') => T.push({ id, rubric, also, name, desc, src, slots });
  let n = 0;
  const synth = (name, desc, src, also, inst, fx) => add('syn-' + String(++n).padStart(3, '0'), name, desc, src, also, [inst, ...fx]);

  // basses
  synth('Minimoog funk bass', 'Fat mono bass with glide, compressed and warmed – the 70s funk and G-funk low end.', 'Classic Minimoog bass practice', ['rnb', 'hiphop'],
    I('Moog bass', SYN.moog, PC.bass, 'A Minimoog-style bass: three oscillators, low-pass with some envelope.'), [X.fet('Ratio 4:1, 4–6 dB – an even bass line.'), X.tube('A little drive brings the bass out on small speakers.'), X.eqTone('Boost 60–80 Hz, cut 250 Hz.')]);
  synth('G-funk whistle lead', 'Sine-like Minimoog lead with portamento, vibrato and space – West Coast hip-hop.', 'Dr. Dre / G-funk era Minimoog leads', ['hiphop'],
    I('Moog lead', SYN.moog, PC.lead, 'A soft Minimoog lead – high portamento, vibrato on the mod wheel.'), [X.opto(), X.dim(), X.plate('Plate, 1.5 s, pre-delay 30 ms.'), X.dly('1/4 delay, low in the mix.')]);
  synth('Acid line', 'TB-303 squelch pushed into distortion, then a stereo delay – the Chicago acid sound.', 'Acid producers ran the 303 into distortion pedals (MusicRadar)', ['electronic'],
    I('303', SYN.acid, PC.bass, 'Accent and slide do the work; resonance high.'), [X.dist('Distortion before the delay – square wave distorts more musically.'), X.filt('Optional filter for extra squelch.'), X.pingpong('Stereo delay instead of reverb keeps it focused.'), X.fet()]);
  synth('Reese bass', 'Two detuned saws through low-pass, distortion and chorus – drum & bass and garage.', 'Reese bass (Native Instruments, LANDR)', ['electronic'],
    I('Detuned bass', SYN.bass, PC.bass, 'Two detuned saws, low-pass at 300–800 Hz.'), [X.decap('Distortion brings out the mid-range.'), X.chorus('Chorus for width – keep the sub mono.'), X.ott(), X.eqClean()]);
  synth('Sub bass', 'Clean sine sub, controlled and mono.', '', ['electronic', 'hiphop'],
    I('Sub', SYN.bass, PC.sub, 'A clean sub patch – sine or triangle.'), [X.eqClean(), X.opto('2–3 dB for an even sub.'), X.limit()]);
  synth('Dub techno bass', 'Round bass with a touch of tape – deep and soft.', 'Dub techno practice', ['dubtechno', 'electronic'],
    I('Round bass', SYN.moog, PC.bass, 'Soft low-pass bass, short decay.'), [X.tape(), X.opto(), X.eqTone('Cut above 2 kHz for softness.')]);
  synth('Synthwave bass', 'Pulsing 16th-note bass with tape and chorus – 80s retro.', 'Synthwave practice (MusicRadar, Output)', ['electronic', 'pop'],
    I('Poly bass', SYN.poly, PC.bass, 'A fat polysynth bass playing 16ths.'), [X.juno(), X.tape(), X.fet(), X.pump()]);
  synth('Distorted electro bass', 'Saw bass driven hard through distortion and amp – the French electro sound.', 'Electro house practice', ['electronic'],
    I('Saw bass', SYN.bass, PC.bass, 'Bright saw bass, filter half open.'), [X.dist(), X.amp(), X.fet('Fast compressor after the distortion.'), X.eqClean()]);
  synth('Growl bass', 'Moving bass through distortion, multiband and filter – dubstep growls.', 'Dubstep practice: distortion, compression, LFO and auto filter', ['electronic'],
    I('Growl', SYN.bass, PC.bass, 'A bass with filter LFO.'), [X.dist(), X.ott(), X.filt('Filter LFO synced to 1/8 or 1/16.'), X.eqClean(), X.limit()]);
  synth('House organ bass', 'The M1 organ-bass of 90s house – punchy and simple.', 'Korg M1 organ in early-90s house', ['electronic'],
    I('M1 bass', SYN.house, PC.bass, 'An M1/90s organ or synth bass.'), [X.fet(), X.eqTone('Boost 100 Hz, cut 400 Hz.'), X.room()]);
  synth('Wobble bass', 'LFO filter bass with sidechain – UK bass and dubstep wobble.', '', ['electronic'],
    I('Wobble', SYN.bass, PC.bass, 'A bass with a synced filter LFO.'), [X.filt(), X.decap(), X.pump(), X.limit()]);
  synth('Pluck bass', 'Short plucked bass with saturation and slapback.', '', ['pop', 'electronic'],
    I('Pluck bass', SYN.bass, PC.bass, 'Short decay, no sustain.'), [X.fet(), X.tube(), X.dly('Slapback 80–120 ms, one repeat.')]);
  synth('Arp 2600 bass', 'Gritty modular bass with tape and room.', '', ['electronic', 'indie'],
    I('ARP bass', /arp 2600/i, PC.bass, 'ARP 2600 bass patch.'), [X.tape(), X.fet(), X.room()]);
  synth('Moog bass, tape and spring', 'Dub-style Moog bass with tape echo and spring.', '', ['dubtechno'],
    I('Moog bass', SYN.moog, PC.bass, 'Round Moog bass.'), [X.tape(), X.tapeDly('Short dub echo, low feedback.'), X.spring()]);

  // leads
  synth('Legend HZ lead', 'Minimoog-style lead with more oscillators – compressed, saturated and delayed.', 'The Legend HZ (Synapse Audio)', ['electronic', 'pop'],
    I('Legend lead', /legend hz/i, PC.lead, 'A Legend HZ lead – try the extra oscillators for thickness.'), [X.fet(), X.decap(), X.dly(), X.plate()]);
  synth('Supersaw trance lead', 'Detuned saws drenched in reverb and delay, ducked against the kick.', 'Trance lead practice (Syntorial, forums)', ['electronic'],
    I('Supersaw', SYN.lead, PC.lead, 'Many detuned saws.'), [X.ott(), X.soothe(), X.pingpong(), X.huge('Big reverb – 4–6 s, high-pass the reverb.'), X.pump()]);
  synth('Synthwave lead', 'Bright lead with chorus, tape and a big hall – Stranger Things style retro.', 'Synthwave tips (MusicRadar, Output)', ['electronic', 'pop'],
    I('Retro lead', SYN.poly, PC.lead, 'A bright poly lead.'), [X.juno(), X.tape(), X.dly(), X.hall()]);
  synth('Daft Punk filtered lead', 'Lead through phaser and filter with tape – the French touch.', 'French house practice', ['electronic'],
    I('Filter lead', SYN.lead, PC.lead, 'A saw lead with filter movement.'), [X.phaser(), X.filt(), X.tape(), X.fet()]);
  synth('Prophet lead', 'Classic poly lead with chorus and plate.', '', ['pop', 'indie'],
    I('Prophet', /prophet/i, PC.lead, 'Prophet-5 lead.'), [X.chorus(), X.opto(), X.plate(), X.dly()]);
  synth('Screaming mono lead', 'Overdriven mono lead with amp and delay – rock synth solo.', '', ['indie'],
    I('Mono lead', SYN.lead, PC.lead, 'Bright mono lead with glide.'), [X.amp(), X.fet(), X.tapeDly(), X.hall()]);
  synth('MS-20 squeal', 'MS-20 lead with screaming filter, distortion and spring.', '', ['electronic', 'indie'],
    I('MS-20', /ms-?20/i, PC.lead, 'MS-20 lead, resonance high.'), [X.dist(), X.spring(), X.dly()]);
  synth('Chiptune lead', 'Square lead crushed and delayed – 8-bit games feel.', '', ['electronic'],
    I('Square lead', SYN.lead, PC.lead, 'Square wave lead.'), [X.lofi(), X.dly('1/16 delay, short feedback.'), X.room()]);
  synth('Ambient sine lead', 'Soft lead in a huge space.', '', ['electronic'],
    I('Soft lead', SYN.lead, PC.lead, 'Soft, slow-attack lead.'), [X.chorus(), X.dly(), X.huge()]);
  synth('Jupiter lead', 'Big 80s Jupiter-8 lead with chorus and hall.', '', ['pop'],
    I('Jupiter', /jup-?8/i, PC.lead, 'Jupiter-8 lead.'), [X.dim(), X.opto(), X.hall(), X.dly()]);
  synth('Arp 2600 lead', 'Modular lead with tape echo.', '', ['electronic'],
    I('ARP lead', /arp 2600/i, PC.lead, 'ARP 2600 lead.'), [X.tape(), X.tapeDly(), X.plate()]);
  synth('Pigments lead', 'Modern wavetable lead – OTT, soothe and stereo delay.', '', ['electronic', 'pop'],
    I('Pigments lead', /pigments/i, PC.lead, 'A Pigments lead.'), [X.ott(), X.soothe(), X.pingpong(), X.plate()]);

  // pads and chords
  synth('Blade Runner brass pad', 'CS-80 brass in a cavernous Lexicon-style hall with Dimension chorus.', 'Vangelis: CS-80, Lexicon 224, Dimension D (Reverb Machine)', ['famous'],
    I('CS-80', SYN.cs80, PC.brass, 'CS-80 brass – slow filter envelope, long release, aftertouch.'), [X.dim('Dimension D chorus as on the soundtrack.'), X.hall('Lexicon-style hall – long, cavernous.'), X.eqTone()]);
  synth('Juno pad', 'Warm Juno pad with its chorus, tape and plate.', 'Juno-style chorus pads (UJAM, MusicRadar)', ['pop', 'electronic'],
    I('Juno', SYN.juno, PC.pad, 'Juno-6 pad, slow attack and release.'), [X.juno(), X.tape(), X.plate('Long plate, 3 s.')]);
  synth('80s dreamy poly', 'Detuned polysynth with chorus, delay and hall – the dreamy 80s sound.', 'How to program a dreamy 80s polysynth (MusicRadar)', ['pop'],
    I('Poly', SYN.poly, PC.pad, 'Detuned saws, low-pass, slow attack.'), [X.dim(), X.dly(), X.hall(), X.tape()]);
  synth('Dub techno chord', 'Stab chord into tape echo, spring and filter – Basic Channel style.', 'Dub techno practice', ['dubtechno'],
    I('Chord stab', SYN.poly, PC.chord, 'Short minor-7th chord stab.'), [X.filt('Low-pass with slow LFO.'), X.tapeDly('High feedback, filtered repeats.'), X.spring(), X.huge()]);
  synth('Ambient drone', 'Evolving texture in endless reverb.', 'Ambient practice', ['electronic'],
    I('Texture', SYN.texture, PC.fx, 'An evolving pad or texture.'), [X.chorus(), X.dly(), X.huge('Endless reverb, Mix high.'), X.eqClean()]);
  synth('Boards of Canada pad', 'Warm pad with pitch wobble, band-limited and tape-worn.', 'Boards of Canada sound: pitch LFO, EQ 120 Hz–6 kHz, tape (Soundfly, MusicRadar)', ['electronic'],
    I('Warm pad', SYN.pad, PC.pad, 'Add a slow pitch LFO in the synth for the wobble.'), [X.eqTone('High-pass 120 Hz, low-pass around 6 kHz.'), X.tape('Wow and flutter.'), X.lofi(), X.plate()]);
  synth('Strings pad', 'Synth strings with ensemble chorus and hall.', '', ['pop'],
    I('Strings', SYN.pad, PC.strings, 'String machine or synth strings.'), [X.chorus(), X.hall(), X.eqTone()]);
  synth('Prophet poly chords', 'Rich Prophet chords, compressed and spaced.', '', ['pop', 'indie'],
    I('Prophet', /prophet/i, PC.pad, 'Prophet-5 pad.'), [X.glue(), X.chorus(), X.plate()]);
  synth('Jupiter pad', 'Lush Jupiter-8 pad.', '', ['pop'],
    I('Jupiter', /jup-?8/i, PC.pad, 'Jupiter-8 pad.'), [X.dim(), X.hall(), X.eqTone()]);
  synth('OB brass stab', 'Oberheim brass stabs – the Jump sound.', 'Oberheim OB-Xa brass (Van Halen "Jump")', ['pop'],
    I('OB brass', /op-?xa|ob-?xd/i, PC.brass, 'OB-Xa brass.'), [X.fet(), X.chorus(), X.plate()]);
  synth('Polysix pad', 'Korg Polysix pad with ensemble and tape.', '', ['pop', 'electronic'],
    I('Polysix', /polysix/i, PC.pad, 'Polysix pad – its ensemble is the sound.'), [X.chorus(), X.tape(), X.plate()]);
  synth('Pigments evolving pad', 'Moving wavetable pad with phaser and huge space.', '', ['electronic'],
    I('Pigments', /pigments/i, PC.pad, 'An evolving Pigments pad.'), [X.phaser(), X.dly(), X.huge()]);
  synth('Shoegaze synth wall', 'Synth through fuzz, chorus and reverse-like reverb – a wall of sound.', 'Shoegaze sounds with synths and pedals (Perfect Circuit)', ['indie'],
    I('Pad', SYN.pad, PC.pad, 'A thick pad.'), [X.dist(), X.chorus(), X.huge(), X.dly()]);
  synth('Lo-fi chords', 'Warm chords, crushed and tape-worn – lo-fi hip-hop.', '', ['hiphop'],
    I('Keys or pad', SYN.keys, PC.keys, 'Soft keys or pad chords.'), [X.lofi(), X.tape(), X.opto(), X.room()]);
  synth('Trance gated pad', 'Pad chopped in time with a sidechain or gate.', '', ['electronic'],
    I('Pad', SYN.pad, PC.pad, 'Bright pad.'), [X.glitch('Rhythmic gate in 1/16.'), X.pump(), X.hall()]);
  synth('CS-80 strings', 'CS-80 strings with chorus and hall.', 'Vangelis-style CS-80 strings', ['famous'],
    I('CS-80', SYN.cs80, PC.strings, 'CS-80 strings.'), [X.chorus(), X.hall()]);
  synth('Synthwave arp pad', 'Pad and arp layered with chorus, tape and gated feel.', '', ['electronic'],
    I('Poly', SYN.poly, PC.pad, 'Polysynth pad.'), [X.juno(), X.tape(), X.pump(), X.hall()]);

  // keys
  synth('Rhodes with tremolo', 'Electric piano with stereo tremolo and phaser – soul and R&B.', 'Classic Rhodes stage-piano vibrato/phaser sound', ['rnb'],
    I('Rhodes', /stage-?73|lounge lizard/i, PC.keys, 'A Rhodes-style electric piano.'), [X.trem(), X.phaser(), X.opto(), X.plate()]);
  synth('Wurlitzer soul', 'Wurli with tremolo, amp grit and spring.', '', ['rnb', 'indie'],
    I('Wurli', /wurli/i, PC.keys, 'Wurlitzer electric piano.'), [X.trem(), X.amp(), X.spring()]);
  synth('DX7 electric piano', 'The 80s FM EP – chorus and plate.', 'DX7 E.Piano 1 – the 80s ballad keys', ['pop'],
    I('DX7', SYN.fm, PC.keys, 'DX7 electric piano.'), [X.chorus(), X.opto(), X.plate()]);
  synth('B-3 with Leslie', 'Tonewheel organ through a Leslie and amp.', '', ['rnb', 'indie'],
    I('B-3', SYN.organ, PC.organ, 'Hammond B-3 – drawbars 888000000.'), [s('mod', 'Leslie', /leslie|rotary/i, 'Slow and fast rotor speeds.'), X.amp(), X.room()]);
  synth('Lo-fi Rhodes', 'Electric piano crushed, wobbling and warm.', '', ['hiphop'],
    I('EP', SYN.ep, PC.keys, 'Electric piano.'), [X.lofi(), X.tape(), X.opto(), X.room()]);
  synth('Piano in a hall', 'Acoustic piano, gently compressed in a hall.', '', ['pop'],
    I('Piano', /piano v|ezkeys/i, PC.keys, 'Acoustic piano.'), [X.eqTone(), X.opto(), X.hall()]);
  synth('M1 house piano', 'The M1 piano of 90s house – bright and compressed.', 'Korg M1 piano in 90s house', ['electronic'],
    I('M1 piano', /\bm1\b/i, PC.keys, 'M1 piano preset.'), [X.fet(), X.eqTone('Lift 5 kHz for brightness.'), X.room()]);
  synth('FM bell keys', 'Glassy FM bells with delay and shimmer.', '', ['pop', 'electronic'],
    I('FM bells', SYN.fm, PC.pluck, 'Bell or mallet patch.'), [X.dly(), X.huge(), X.eqClean()]);
  synth('Clavinet funk', 'Clav through envelope filter and phaser.', '', ['rnb'],
    I('Clav-like keys', SYN.keys, /clav|key/i, 'A clav or funky keys.'), [X.filt('Envelope filter – auto-wah.'), X.phaser(), X.fet()]);
  synth('CMI choir', 'Fairlight-style sampled choir in a hall.', 'Fairlight CMI choir sounds of the 80s', ['pop'],
    I('CMI', /cmi/i, /choir|voice|vox|pad/i, 'Fairlight CMI choir or voice.'), [X.chorus(), X.hall()]);

  // plucks, arps, sequences
  synth('Legend HZ arpeggio', 'Legend HZ arp with ping-pong delay and plate.', 'The Legend HZ arp presets', ['electronic'],
    I('Legend arp', /legend hz/i, PC.arp, 'A Legend HZ arp or sequence preset.'), [X.fet(), X.pingpong(), X.plate()]);
  synth('Berlin school sequence', 'Moog-style sequence with tape echo and hall – Tangerine Dream style.', 'Berlin school sequencer music', ['electronic'],
    I('Sequence', SYN.arp, PC.arp, 'A 16th-note sequence.'), [X.filt(), X.tapeDly(), X.hall()]);
  synth('House pluck', 'Short pluck with delay and sidechain.', '', ['electronic'],
    I('Pluck', SYN.any, PC.pluck, 'Short pluck.'), [X.ott(), X.dly(), X.plate(), X.pump()]);
  synth('Trance arp', 'Gated trance arpeggio with delay and big reverb.', '', ['electronic'],
    I('Arp', SYN.arp, PC.arp, 'Arp or sequence preset.'), [X.pingpong(), X.huge(), X.pump()]);
  synth('Synthwave arp', '16th-note arp with chorus and tape echo.', '', ['electronic'],
    I('Arp', SYN.arp, PC.arp, 'Arp preset.'), [X.juno(), X.tapeDly(), X.hall()]);
  synth('Minimal techno pluck', 'Short pluck with filter and dub delay.', '', ['electronic', 'dubtechno'],
    I('Pluck', SYN.arp, PC.pluck, 'Short percussive pluck.'), [X.filt(), X.tapeDly(), X.room()]);
  synth('Pigments sequence', 'Moving Pigments sequence with glitch and delay.', '', ['electronic'],
    I('Pigments', /pigments/i, PC.arp, 'Pigments sequence.'), [X.glitch(), X.pingpong(), X.plate()]);
  synth('Electro arp', 'Saw arp with phaser and distortion.', '', ['electronic'],
    I('Arp', SYN.arp, PC.arp, 'Saw arp.'), [X.decap(), X.phaser(), X.dly()]);
  synth('Mono sequence with flanger', 'Sequence swept by a jet flanger.', '', ['electronic'],
    I('Sequence', SYN.arp, PC.arp, 'Mono sequence.'), [X.flanger(), X.dly(), X.room()]);
  synth('Chord stab with delay', 'Rave chord stab with saturation and delay.', '', ['electronic'],
    I('Stab', SYN.poly, PC.chord, 'Chord stab.'), [X.decap(), X.dly(), X.room()]);

  // special and textures
  synth('Cinematic texture', 'Evolving texture with granular pitch and endless reverb.', '', ['electronic'],
    I('Texture', SYN.texture, PC.fx, 'Texture or soundscape preset.'), [X.pitch(), X.huge(), X.eqClean()]);
  synth('Sci-fi FX', 'Synth effects through flanger, pitch and delay.', '', ['electronic'],
    I('FX synth', SYN.texture, PC.fx, 'Sound-effect preset.'), [X.flanger(), X.pitch(), X.pingpong()]);
  synth('Augmented Yangtze', 'Hybrid Chinese instrument through chorus and hall.', '', ['electronic'],
    I('Yangtze', /yangtze/i, null, 'Augmented YANGTZE preset.'), [X.chorus(), X.hall()]);
  synth('Brass section', 'Synth brass with compression and plate.', '', ['pop', 'rnb'],
    I('Brass', SYN.brass, PC.brass, 'Synth brass.'), [X.fet(), X.eqTone(), X.plate()]);
  synth('Bell pad', 'Bells and pad with shimmer.', '', ['pop', 'electronic'],
    I('Bells', SYN.pad, PC.pluck, 'Bell-like preset.'), [X.chorus(), X.dly(), X.huge()]);

  // genre and era chains
  synth('Italo disco bass', 'Octave bass with chorus and delay – Italo disco.', '', ['electronic', 'pop'],
    I('Octave bass', SYN.poly, PC.bass, 'Octave-jumping bass.'), [X.chorus(), X.fet(), X.dly('1/16 delay, low.')]);
  synth('New wave poly', 'Cold new-wave poly with chorus and gated hall.', 'Depeche Mode / new wave synths', ['pop', 'indie'],
    I('Poly', SYN.poly, PC.chord, 'Polysynth chords.'), [X.chorus(), X.glitch('Gate the reverb tail.'), X.hall()]);
  synth('Psychedelic phaser synth', 'Synth swirling through phaser, chorus and tape – Tame Impala style.', 'Psych-pop: phasers and tape on synths', ['indie'],
    I('Synth', SYN.poly, PC.lead, 'Warm poly lead or chords.'), [X.phaser(), X.chorus(), X.tape(), X.plate()]);
  synth('Funk synth bass', 'Envelope-filtered funk bass with compression.', '', ['rnb'],
    I('Bass', SYN.moog, PC.bass, 'Funky Moog bass.'), [X.filt('Envelope filter for the quack.'), X.fet(), X.tube()]);
  synth('Trap 808 bass', '808-style sub with saturation and limiter.', '', ['hiphop'],
    I('808', SYN.bass, /808|sub|bass/i, 'An 808 or sub bass.'), [X.decap('Saturation so the 808 is heard on phones.'), X.eqClean(), X.limit()]);
  synth('Trap bell melody', 'Bell melody with delay and reverb.', '', ['hiphop'],
    I('Bells', SYN.fm, PC.pluck, 'Bell or pluck.'), [X.dly(), X.plate(), X.eqClean()]);
  synth('R&B pad', 'Silky pad with chorus and plate – modern R&B.', '', ['rnb'],
    I('Pad', SYN.pad, PC.pad, 'Soft pad.'), [X.chorus(), X.opto(), X.plate(), X.soothe()]);
  synth('Pop synth hook', 'Bright pop lead, controlled and wide.', '', ['pop'],
    I('Lead', SYN.lead, PC.lead, 'Bright pop lead.'), [X.soothe(), X.fet(), X.width(), X.dly(), X.plate()]);
  synth('Techno stab', 'Dark stab with distortion and dub echo.', '', ['electronic', 'dubtechno'],
    I('Stab', SYN.poly, PC.chord, 'Dark chord stab.'), [X.dist(), X.tapeDly(), X.room()]);
  synth('Krautrock sequence', 'Motorik sequence through tape and spring.', '', ['indie', 'electronic'],
    I('Sequence', SYN.arp, PC.arp, 'Sequence preset.'), [X.tape(), X.spring(), X.dly()]);
  synth('Disco strings', 'Synth strings with phaser – the disco sweep.', 'Solina strings + phaser on disco records', ['rnb', 'pop'],
    I('Strings', SYN.pad, PC.strings, 'String machine.'), [X.phaser(), X.chorus(), X.plate()]);
  synth('Vaporwave keys', 'Keys slowed, chorused and tape-worn.', '', ['electronic'],
    I('Keys', SYN.keys, PC.keys, 'EP or keys.'), [X.chorus(), X.tape(), X.lofi(), X.hall()]);
  synth('Electro funk talk-lead', 'Funky lead through filter and chorus.', '', ['rnb'],
    I('Lead', SYN.moog, PC.lead, 'Funky lead.'), [X.filt(), X.chorus(), X.dly()]);
  synth('Big room lead', 'Massive lead with OTT, distortion and reverb.', '', ['electronic'],
    I('Lead', SYN.lead, PC.lead, 'Bright lead.'), [X.ott(), X.decap(), X.huge(), X.pump()]);
  synth('Chillwave synth guitar', 'Synth played like a guitar: chorus, delay, reverb.', 'How to make a synth sound like a chillwave guitar (MusicTech)', ['indie'],
    I('Pluck', SYN.poly, PC.pluck, 'Short pluck.'), [X.chorus(), X.tapeDly(), X.plate()]);
  synth('Glitch pad', 'Pad sliced and repeated.', '', ['electronic'],
    I('Pad', SYN.pad, PC.pad, 'Pad.'), [X.glitch(), X.dly(), X.huge()]);
  synth('MonoPoly drive bass', 'KORG MonoPoly bass with drive and tape.', '', ['electronic'],
    I('MonoPoly', /monopoly/i, null, 'MonoPoly bass patch.'), [X.decap(), X.tape(), X.fet()]);
  synth('microKORG lead', 'microKORG lead with phaser and delay.', '', ['electronic', 'indie'],
    I('microKORG', /microkorg/i, null, 'microKORG patch.'), [X.phaser(), X.dly(), X.plate()]);
  synth('Wavestation-style motion', 'Moving digital pad with chorus and hall.', '', ['pop'],
    I('Pad', /m1|pigments|zenology|dx7/i, PC.pad, 'Digital pad.'), [X.chorus(), X.dly(), X.hall()]);
  synth('Phat Moog with flanger', 'Moog lead swept by flanger – 70s prog.', '70s prog rock Moog sounds', ['indie'],
    I('Moog', SYN.moog, PC.lead, 'Moog lead.'), [X.flanger(), X.tapeDly(), X.hall()]);
  synth('Legend HZ bass, tape and comp', 'Legend HZ bass with tape and compression – solid and warm.', 'The Legend HZ bass presets', ['electronic', 'hiphop'],
    I('Legend bass', /legend hz/i, PC.bass, 'A Legend HZ bass preset.'), [X.tape(), X.fet(), X.eqTone()]);
  synth('Legend HZ big lead', 'Legend HZ lead with drive, chorus and hall.', 'The Legend HZ lead presets', ['electronic'],
    I('Legend lead', /legend hz/i, PC.lead, 'A Legend HZ lead preset.'), [X.decap(), X.chorus(), X.hall()]);
  synth('Legend HZ sequence', 'Legend HZ sequence with filter and dub echo.', 'The Legend HZ sequence presets', ['electronic', 'dubtechno'],
    I('Legend seq', /legend hz/i, /seq|arp/i, 'A Legend HZ sequence preset.'), [X.filt(), X.tapeDly(), X.room()]);
  synth('Phoscyon acid', 'D16 Phoscyon 303 into D16 distortion and delay.', 'D16 Phoscyon (TB-303 emulation)', ['electronic'],
    I('Phoscyon', /phoscyon/i, null, 'Phoscyon – program a line with accents and slides.'), [s('dist', 'D16 distortion', /devastor|redoptor|decimort/i, 'D16 distortion for the acid bite.'), s('delay', 'D16 delay', /tekturon|sigmund/i, 'Multi-tap delay.'), X.room()]);
  synth('Drumazon through D16', 'TR-909 machine through D16 effects.', 'D16 Drumazon (TR-909 emulation)', ['electronic'],
    I('Drumazon', /drumazon/i, null, 'Drumazon 909 pattern.'), [s('crush', 'Decimort', /decimort/i, 'Sampler grit.'), X.glue(), s('reverb', 'Toraverb', /toraverb|spacerek/i, 'Short room.')]);
  synth('Electribe groove', 'KORG Electribe groove with compression and room.', '', ['electronic'],
    I('Electribe', /electribe/i, null, 'Electribe pattern.'), [X.glue(), X.decap(), X.room()]);
  synth('Kaoss Pad performance', 'Synth into KAOSS PAD effects.', '', ['electronic'],
    I('Synth', SYN.any, null, 'Any synth.'), [s('glitch', 'KAOSS PAD', /kaoss/i, 'Play the pad – filters, delays, loopers.'), X.room()]);

  synth('Jupiter arp', 'Jupiter-8 arpeggio with chorus and delay – 80s pop.', '', ['pop'],
    I('Jupiter', /jup-?8/i, PC.arp, 'Jupiter-8 arp preset.'), [X.dim(), X.dly(), X.hall()]);
  synth('Prophet bass', 'Prophet-5 bass, saturated and compressed.', '', ['pop', 'indie'],
    I('Prophet', /prophet/i, PC.bass, 'Prophet-5 bass.'), [X.tube(), X.fet(), X.eqTone()]);
  synth('Mini V pluck with tape echo', 'Moog pluck into tape echo and spring.', '', ['electronic', 'dubtechno'],
    I('Mini V', /mini ?v/i, PC.pluck, 'Mini V pluck or short preset.'), [X.tapeDly(), X.spring()]);
  synth('DX7 bass', 'The 80s FM slap bass – punchy and bright.', 'DX7 bass sounds of 80s pop', ['pop'],
    I('DX7', SYN.fm, PC.bass, 'DX7 bass.'), [X.fet(), X.eqTone(), X.room()]);
  synth('OP-Xa pad with phaser', 'Oberheim pad through a slow phaser and hall.', '', ['pop', 'indie'],
    I('OP-Xa', /op-?xa/i, PC.pad, 'OP-Xa pad.'), [X.phaser(), X.hall()]);

  // ---------- Sound Design (effect chains; ~40) ----------
  const sd = (name, desc, src, slots) => add('sd-' + String(++n).padStart(3, '0'), name, desc, src, ['electronic'], slots, 'sounddesign');
  const S = X;
  sd('Riser', 'Turns any sound into a rising build-up: pitch up, filter open, reverb grows.', 'Risers with reverb and pitch (MusicRadar, Splice)', [S.filt('Automate the cutoff up over 4–8 bars.'), S.pitch('Pitch up an octave over the build.'), S.huge('Reverb Mix up over the riser.')]);
  sd('Reverse reverb swell', 'Pre-echo swell: reverb that leads into the sound (bounce and reverse the wet signal).', 'Reverse reverb technique (MusicRadar)', [S.huge('100 % wet, long decay – bounce, then reverse the audio.'), S.eqClean()]);
  sd('Impact with tail', 'Big hit with saturation and a huge tail.', 'Impacts and tails (Ableton blog)', [S.decap('Drive for weight.'), S.glue(), S.huge('Huge reverb tail, 6–10 s.')]);
  sd('Granular cloud', 'Granular reverse echoes and endless space.', '', [s('delay', 'Granular echo', /crystallizer|fragments|portal|graindad/i, 'Reverse grains, pitch up an octave.'), S.huge()]);
  sd('Shimmer', 'Pitch-shifted feedback into a huge reverb – the shimmer effect.', '', [S.pitch('Octave up into the reverb.'), s('reverb', 'Shimmer reverb', /shimmer|supermassive|blackhole/i, 'Long decay, shimmer on.')]);
  sd('Robot voice', 'Bit crush, ring-mod-like pitch and short delay – robots and radios.', '', [S.lofi(), S.pitch('Pitch or harmonizer for metallic tone.'), S.dly('Very short delay, high feedback – comb filter.')]);
  sd('Telephone / radio', 'Band-limited, distorted and boxy.', '', [S.eqClean('High-pass 400 Hz, low-pass 3 kHz.'), S.dist(), S.room('Small room.')]);
  sd('Underwater', 'Low-pass, chorus and wobble.', '', [S.filt('Low-pass at 400–800 Hz.'), S.chorus(), S.huge()]);
  sd('Space ambience', 'Pad-like space from any source.', '', [S.dly(), S.huge(), S.width()]);
  sd('Glitch transition', 'Stutter, slice and filter for transitions.', '', [S.glitch(), S.filt(), S.dly()]);
  sd('Tape stop and wobble', 'Tape effects for transitions.', '', [s('tape', 'Tape stop', /tapestop|tape stop|warble|neold/i, 'Automate the tape stop.'), S.tape()]);
  sd('Lo-fi texture', 'Vinyl, crush and tape for textures.', '', [S.lofi(), S.tape(), S.eqTone('Band-limit 150 Hz – 6 kHz.')]);
  sd('Metallic resonator', 'Comb filtering and pitch for metallic sounds.', '', [S.pitch(), S.flanger('High feedback, slow rate.'), S.plate()]);
  sd('Dub siren space', 'Siren through tape echo and spring.', 'Dub sound-system practice', [S.tapeDly('Self-oscillating echo, ride Repeat Rate.'), S.spring()]);
  sd('Whoosh', 'Noise or texture swept with flanger and filter.', '', [S.flanger(), S.filt(), S.huge()]);
  sd('Drone builder', 'Long sustained drone with pitch layers and space.', '', [S.pitch('Add fifths and octaves.'), S.chorus(), S.huge()]);
  sd('Distorted hit', 'Aggressive impacts.', '', [S.dist(), S.ott(), S.room()]);
  sd('Frozen reverb pad', 'Freeze a moment into a pad.', '', [S.huge('Freeze or infinite decay.'), S.filt(), S.eqClean()]);
  sd('Stutter gate', 'Rhythmic gating for drops.', '', [S.glitch(), S.pump()]);
  sd('Haunted voice', 'Pitch down, reverse-like space, filter.', '', [S.pitch('Pitch down 5–12 semitones.'), S.huge(), S.filt()]);
  sd('Glitch percussion', 'Slice percussion into new rhythms.', '', [S.glitch(), S.lofi(), S.room()]);
  sd('Wide stereo texture', 'Micro-pitch widening and modulation.', '', [S.width('Micro-shift for width.'), S.chorus(), S.huge()]);
  sd('Bass drop', 'Pitched sub drop with saturation.', '', [S.pitch('Pitch down over the drop.'), S.decap(), S.limit()]);
  sd('Alien textures', 'Ring-mod-like pitch, flanger and huge space.', '', [S.pitch(), S.flanger(), S.huge()]);
  sd('Cassette memory', 'Nostalgic, wobbly and dusty.', '', [S.tape('Heavy wow and flutter.'), S.lofi(), S.room()]);
  sd('Ping-pong sparkle', 'Stereo delay and shimmer on short sounds.', '', [S.pingpong(), S.pitch('Octave up on the delay.'), S.plate()]);
  sd('Infinite delay wash', 'Feedback delay into reverb.', '', [S.dly('Feedback 70–90 %, filtered.'), S.huge()]);
  sd('Filter sweep FX', 'Big filter sweeps for builds.', '', [S.filt(), S.phaser(), S.dly()]);
  sd('Crushed noise riser', 'Noise crushed and rising.', '', [S.lofi(), S.filt(), S.huge()]);
  sd('Analog warmth', 'Tape, tube and EQ for warmth.', '', [S.tape(), S.tube(), S.eqTone()]);
  sd('Vinyl ghost', 'Sound as if played from an old record in another room.', '', [S.lofi(), S.eqClean('High-pass 300 Hz, low-pass 4 kHz.'), S.room()]);
  sd('Megaphone', 'Narrow, distorted, loud.', '', [S.eqClean('Band-pass 800 Hz – 3 kHz.'), S.dist(), S.fet()]);
  sd('Dream sequence', 'Chorus, delay and shimmer for flashbacks.', '', [S.chorus(), S.dly(), S.huge()]);
  sd('Tension drone', 'Dark, filtered and slowly moving.', '', [S.filt('Low-pass with very slow LFO.'), S.phaser(), S.huge()]);
  sd('Arcade FX', '8-bit crush and short delays.', '', [S.lofi(), S.dly('1/32 delay.')]);
  sd('Ghost echoes', 'Dark echoes that trail off into space.', '', [S.tapeDly('Low-pass the repeats, long feedback.'), S.huge()]);
  sd('Rhythmic texture', 'Pads chopped into rhythm.', '', [S.trem('Tremolo in 1/16.'), S.glitch(), S.dly()]);
  sd('Distant thunder', 'Low rumble with saturation and huge space.', '', [S.eqClean('Low-pass at 300 Hz.'), S.decap(), S.huge()]);
  sd('Swirling portal', 'Flanger, phaser and pitch for magic effects.', '', [S.flanger(), S.phaser(), S.pitch()]);
  sd('Radio tuning', 'Band-limited, crushed and wobbling.', '', [S.eqClean('Band-pass 500 Hz – 3 kHz.'), S.lofi(), S.flanger()]);

  // ---------- Experimental (effects with maker presets; ~30) ----------
  // every slot loads a random preset of its plugin (pre) – re-roll the presets with "Roll plugins" or per module
  const ex = (name, desc, slots) => add('ex-' + String(++n).padStart(3, '0'), name, desc, '', ['electronic'], slots.map(x => ({ ...x, pre: true, ...(x.prefer ? { only: x.prefer } : {}) })), 'experimental');
  const H3000 = (tip, pcat) => s('pitch', 'H3000', /h3000/i, tip, pcat ? { pcat } : {});
  const ST = {
    crystal: (pcat) => s('delay', 'Crystallizer', /crystallizer/i, 'Granular reverse echo – Soundtoys preset.', pcat ? { pcat } : {}),
    echo: (pcat) => s('delay', 'EchoBoy', /echoboy/i, 'EchoBoy preset – tape, space and rhythm echoes.', pcat ? { pcat } : {}),
    decap: () => s('sat', 'Decapitator', /decapitator/i, 'Decapitator preset.'),
    phase: () => s('mod', 'PhaseMistress', /phasemistress/i, 'PhaseMistress preset.'),
    trem: () => s('mod', 'Tremolator', /tremolator/i, 'Tremolator preset – rhythmic.'),
    filter: () => s('filter', 'FilterFreak', /filterfreak/i, 'FilterFreak preset.'),
    pan: () => s('mod', 'PanMan', /panman/i, 'PanMan preset.'),
    plate: () => s('reverb', 'SuperPlate', /superplate|little plate/i, 'Plate preset.'),
    primal: () => s('delay', 'PrimalTap', /primaltap/i, 'PrimalTap preset.'),
    micro: () => s('width', 'MicroShift', /microshift/i, 'MicroShift preset.'),
    rack: () => s('glitch', 'EffectRack', /effectrack/i, 'Soundtoys EffectRack preset – a whole chain in one.'),
    devil: () => s('dist', 'Devil-Loc', /devil-?loc/i, 'Devil-Loc preset.'),
  };
  ex('H3000 harmonizer space', 'Eventide H3000 preset into Soundtoys space.', [H3000('A random H3000 factory preset.'), ST.echo(), ST.plate()]);
  ex('H3000 into Crystallizer', 'Pitch madness into granular echoes.', [H3000('H3000 preset.'), ST.crystal()]);
  ex('Crystallizer cloud', 'Crystallizer and EchoBoy presets in a big space.', [ST.crystal(), ST.echo(), X.huge()]);
  ex('Decapitator and FilterFreak', 'Saturation into moving filter.', [ST.decap(), ST.filter(), ST.echo()]);
  ex('PhaseMistress swirl', 'Phaser, tremolo and plate presets.', [ST.phase(), ST.trem(), ST.plate()]);
  ex('EffectRack roulette', 'A random EffectRack chain preset – 920 to choose from.', [ST.rack()]);
  ex('Rhythmic chop', 'Tremolator and PanMan presets with delay.', [ST.trem(), ST.pan(), ST.primal()]);
  ex('Devil-Loc crush', 'Devil-Loc into FilterFreak and EchoBoy.', [ST.devil(), ST.filter(), ST.echo()]);
  ex('H3000 delays', 'H3000 delay presets into SuperPlate.', [H3000('H3000 delay preset.', /delay/i), ST.plate()]);
  ex('H3000 synth FX', 'H3000 presets made for synths.', [H3000('H3000 synth preset.', /synth/i), ST.echo()]);
  ex('H3000 vocal FX', 'H3000 vocal presets with plate.', [H3000('H3000 vocal preset.', /vocal/i), ST.plate()]);
  ex('H3000 drum FX', 'H3000 drum presets with saturation.', [H3000('H3000 drum preset.', /drum|perc/i), ST.decap()]);
  ex('Micro-shifted echoes', 'MicroShift, PrimalTap and plate.', [ST.micro(), ST.primal(), ST.plate()]);
  ex('Plugin Alliance colour', 'Random Plugin Alliance presets: console, saturation, space.', [s('preamp', 'bx_console', /bx_console/i, 'Console preset.'), s('sat', 'Saturation', /bx_saturator|karacter|bx_enhancer/i, 'Saturation preset.'), s('reverb', 'bx_rooMS', /bx_rooms/i, 'Room preset – 200 to choose from.')]);
  ex('Strymon pedals', 'Strymon presets: Deco tape, El Capistan echo, DIG delay.', [s('tape', 'Deco', /^deco$|deco/i, 'Deco preset.'), s('delay', 'El Capistan', /capistan/i, 'El Capistan preset.'), s('delay', 'DIG', /\bdig\b/i, 'DIG preset.')]);
  ex('Warble and space', 'NEOLD WARBLE preset into reverb.', [s('tape', 'WARBLE', /warble/i, 'WARBLE preset.'), X.huge()]);
  ex('Guitar rig on synth', 'Plugin Alliance amp presets on a synth or drums.', [s('amp', 'Amp rig', /bx_rockrack|bx_rockergain|bx_megadual|bx_megasingle|bx_bassdude/i, 'Amp preset.'), ST.echo()]);
  ex('Glue and grit', 'Random bx_glue and Decapitator presets.', [s('comp', 'bx_glue', /bx_glue/i, 'bx_glue preset.'), ST.decap()]);
  ex('Delay into delay', 'bx_delay2500 and EchoBoy presets in series.', [s('delay', 'bx_delay2500', /bx_delay2500/i, 'bx_delay2500 preset.'), ST.echo()]);
  ex('Soundtoys full chain', 'Decapitator, PhaseMistress, EchoBoy, SuperPlate – all with random presets.', [ST.decap(), ST.phase(), ST.echo(), ST.plate()]);
  ex('Crystallizer reverse', 'Reverse Crystallizer presets.', [ST.crystal(/reverse|backward/i), X.huge()]);
  ex('EchoBoy rhythms', 'EchoBoy rhythm presets.', [ST.echo(/rhythm|groove|pattern/i), ST.plate()]);
  ex('Filtered movement', 'FilterFreak and PanMan presets.', [ST.filter(), ST.pan()]);
  ex('Elysia colour', 'elysia presets: karacter and nvelope.', [s('sat', 'karacter', /karacter/i, 'karacter preset.'), s('transient', 'nvelope', /nvelope/i, 'nvelope preset.')]);
  ex('Console roulette', 'A random console preset, then glue.', [s('preamp', 'Console', /bx_console/i, 'Console preset.'), s('comp', 'bx_glue', /bx_glue/i, 'Glue preset.')]);
  ex('Space roulette', 'Random reverb presets in series.', [s('reverb', 'bx_rooMS', /bx_rooms/i, 'Room preset.'), ST.plate()]);
  ex('H3000 into EffectRack', 'H3000 preset into a random EffectRack chain.', [H3000('H3000 preset.'), ST.rack()]);
  ex('Lo-fi roulette', 'Tape and crush presets.', [s('tape', 'WARBLE / Deco', /warble|deco/i, 'Tape preset.'), ST.devil()]);
  ex('Tremolo and echo', 'Tremolator into PrimalTap.', [ST.trem(), ST.primal()]);
  ex('Phase and crystals', 'PhaseMistress into Crystallizer.', [ST.phase(), ST.crystal()]);

})();
