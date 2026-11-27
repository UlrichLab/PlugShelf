'use strict';
/* PlugShelf – more chains: hi-hats, snares and claps (Percussion), a Shakers category, Send Effects,
   Bass, Mix Bus and more Experimental preset chains.
   Shakers: the instrument is Kontakt with "Shimmer Shake Strike 2" (In Session Audio); without that library
   one of Live's own Drum Racks with shakers ("Percussion Core Kit", Core Library) is loaded instead.
   Built from common production practice; nothing here is credited to a particular record. */
(function () {
  const G = typeof window !== 'undefined' ? window : globalThis;
  const T = typeof CHAIN_TEMPLATES !== 'undefined' ? CHAIN_TEMPLATES : require('./chain-data.js').CHAIN_TEMPLATES;
  const R = typeof CHAIN_RUBRICS !== 'undefined' ? CHAIN_RUBRICS : require('./chain-data.js').CHAIN_RUBRICS;
  const { X, s } = G.CHAIN_FX;
  const perc = R.findIndex(r => r.id === 'perc');
  R.splice(perc + 1, 0, { id: 'shakers', name: 'Shakers' });

  // extra building blocks
  const Y = {
    hp: (tip = 'High-pass 300–600 Hz, a little air at 10 kHz.') => s('eq', 'EQ – high-pass', /pro-?q ?4|weiss eq|pro-?q|bx_digital|eq/i, tip),
    trans: (tip = 'More attack for snap, less sustain for tightness.') => s('transient', 'Transient shaper', /transient|spiff|smack|transgressor|nvelope|impact/i, tip),
    gate: (tip = 'Gate the tail – the gated 80s sound.') => s('gate', 'Gate', /pro-?g|gate/i, tip),
    deess: (tip = 'Take the edge off at 6–10 kHz.') => s('deess', 'De-esser', /weiss ds1|pro-?ds|de-?ess/i, tip),
    clip: (tip = 'Clip the peaks for punch, 1–3 dB.') => s('clipper', 'Clipper', /clip/i, tip),
    allButtons: () => s('comp', '1176 – all buttons (parallel)', /1176|\b76\b|fet/i, 'All buttons in, Mix 30–50 % – parallel crush.', { set: { Mix: [40, '%'] } }),
    amp: (tip = 'Bass amp for grit and growl.') => s('amp', 'Bass amp', /ampeg|bassdude|bass one|amp/i, tip),
    chamber: (tip = 'Echo chamber – natural and dense.') => s('reverb', 'Chamber', /capitol chambers|chamber|room/i, tip),
    emt250: (tip = 'EMT 250 – the classic digital reverb.') => s('reverb', 'EMT 250', /emt 250|250/i, tip),
    lex: (tip = 'Lexicon-style hall.') => s('reverb', 'Lexicon hall', /480|lx-?24|vintageverb|hall/i, tip),
    gran: (tip = 'Granular reverse echoes.') => s('delay', 'Granular echo', /crystallizer|fragments|portal|graindad/i, tip),
  };

  let n = 0;
  const add = (pre, rubric, name, desc, also, slots, src = '') => T.push({ id: pre + '-' + String(++n).padStart(3, '0'), rubric, also, name, desc, src, slots });

  // ---------- Percussion: hi-hats, snares, claps (29) ----------
  const pc = (name, desc, also, slots) => add('pcx', 'perc', name, desc, also, slots);
  pc('Crisp techno hats', 'Bright, tight hats for techno: high-pass, snap, a little grit, short room.', ['electronic'], [Y.hp(), Y.trans(), X.decap('Light drive for presence.'), X.room('Very short room.')]);
  pc('Shuffled house hats', 'Swinging hats with a 1/16 delay and room.', ['electronic'], [Y.hp(), Y.trans('Attack up a little.'), X.dly('1/16 delay, low feedback, Mix 10 %.'), X.room()]);
  pc('Trap hi-hat rolls', 'Fast rolls kept clean and wide.', ['hiphop'], [Y.hp('High-pass 500 Hz.'), X.decap('A little saturation for presence.'), X.pingpong('1/32 ping-pong, very low.'), X.width()]);
  pc('Lo-fi hats', 'Dusty, crushed hats.', ['hiphop'], [X.lofi(), X.tape(), Y.hp('Low-pass 8 kHz, high-pass 400 Hz.')]);
  pc('Open hat with pump', 'Open hat ducked against the kick.', ['electronic'], [Y.hp(), X.fet(), X.pump('Duck the open hat on the kick.')]);
  pc('Moving hats', 'Hats with filter and stereo movement.', ['electronic'], [Y.hp(), X.filt('Slow LFO on the cutoff.'), X.trem('Auto-pan in 1/8.')]);
  pc('Dub techno hats', 'Hats into tape echo and spring.', ['dubtechno'], [Y.hp(), X.tapeDly('Filtered repeats, 1/8 dotted.'), X.spring()]);
  pc('UK garage hats', 'Snappy, swung hats with a small room.', ['electronic'], [Y.trans(), X.decap(), X.room()]);
  pc('Minimal glitch hats', 'Hats sliced and repeated.', ['electronic'], [Y.hp(), X.glitch(), X.dly('1/16, short.')]);
  pc('Wide hats', 'Micro-pitch width for hats.', ['electronic', 'pop'], [Y.hp(), X.width('MicroShift-style width.'), X.room()]);
  pc('Hats without harshness', 'Smooth, non-fatiguing hats.', ['pop', 'electronic'], [X.soothe(), Y.deess(), Y.hp()]);
  pc('Bright pop hats', 'Polished, airy hats.', ['pop'], [Y.hp('Air shelf at 12 kHz.'), X.opto(), X.plate('Short plate, Mix 8 %.')]);
  pc('808 snare punch', 'Punchy electronic snare.', ['hiphop', 'electronic'], [Y.trans(), X.fet(), X.plate()]);
  pc('Gated 80s snare', 'Big snare into a gated reverb – the 80s sound.', ['pop'], [X.fet(), X.hall('Big hall, Mix high.'), Y.gate('Gate after the reverb.')]);
  pc('Trap snare and clap', 'Saturated, clipped snare/clap.', ['hiphop'], [X.decap(), Y.clip(), X.room()]);
  pc('Techno clap', 'Distorted clap with a long space.', ['electronic'], [Y.trans(), X.dist(), X.huge('Long reverb, Mix 15 %.')]);
  pc('House clap', 'Classic house clap: EQ, compression, plate and delay.', ['electronic'], [Y.hp('High-pass 200 Hz.'), X.fet(), X.plate(), X.dly('1/8 dotted, low.')]);
  pc('Lo-fi snare', 'Crushed and taped snare.', ['hiphop'], [X.lofi(), X.tape(), X.room()]);
  pc('Big pop snare', 'Fat, bright snare with plate and room.', ['pop'], [X.eqTone('Body at 200 Hz, crack at 4 kHz.'), X.fet(), X.plate(), X.room()]);
  pc('Dub snare', 'Snare into spring and tape echo.', ['dubtechno'], [X.spring(), X.tapeDly('Dub echo, feedback 40 %.')]);
  pc('Drum & bass snare', 'Snappy, clipped DnB snare.', ['electronic'], [Y.trans(), Y.clip(), X.room()]);
  pc('Snare crack', 'Crack and bite for a dull snare.', ['indie', 'pop'], [X.eqTone('Boost 2–5 kHz, cut 400 Hz.'), Y.trans(), X.tube()]);
  pc('Breakbeat snare', 'Gritty breakbeat snare.', ['electronic', 'hiphop'], [X.decap(), X.fet(), X.room()]);
  pc('Reverse snare build', 'Snare into a huge reverb – bounce and reverse for builds.', ['electronic'], [X.huge('100 % wet, bounce and reverse.'), X.eqClean()]);
  pc('Techno rimshot', 'Rim with distortion and delay.', ['electronic'], [X.dist(), X.dly('1/16 dotted, low.')]);
  pc('Wide clap stack', 'Layered claps spread wide.', ['electronic', 'pop'], [X.width(), X.plate()]);
  pc('Parallel snare crush', 'Snare with a parallel 1176 smash.', ['indie', 'pop'], [Y.allButtons(), X.room()]);
  pc('Perc loop glue', 'Glue a percussion loop together.', ['electronic'], [Y.hp('High-pass 150 Hz.'), X.glue(), X.room()]);
  pc('Tribal toms and perc', 'Big, saturated toms and perc.', ['electronic'], [Y.trans(), X.tube(), X.room()]);

  // ---------- Shakers (12) ----------
  const shaker = () => ({ role: 'inst', label: 'Shimmer Shake Strike 2', prefer: /kontakt/i, only: /kontakt/i, pcat: /shimmer shake/i, core: 'Percussion Core Kit',
    tip: 'Kontakt with Shimmer Shake Strike 2 – pick a shaker inside the library. Without it, Live’s Percussion Core Kit Drum Rack.' });
  const sh = (name, desc, also, fx) => add('shk', 'shakers', name, desc, also, [shaker(), ...fx]);
  sh('Shaker groove polish', 'Clean, steady shaker: high-pass, snap, gentle compression, room.', ['pop', 'electronic'], [Y.hp(), Y.trans('A little attack.'), X.opto(), X.room()]);
  sh('Shaker with swing delay', 'Shaker with a dotted 1/16 delay for swing.', ['electronic', 'pop'], [Y.hp(), X.dly('1/16 dotted, Mix 12 %.'), X.plate()]);
  sh('Wide shaker', 'Shaker spread across the stereo field.', ['pop', 'electronic'], [Y.hp(), X.width(), X.trem('Slow auto-pan.'), X.room()]);
  sh('Lo-fi shaker', 'Dusty, warm shaker.', ['hiphop'], [X.lofi(), X.tape(), Y.hp()]);
  sh('House shaker pump', 'Shaker ducked against the kick.', ['electronic'], [Y.hp(), X.pump(), X.room()]);
  sh('Dub shaker', 'Shaker into tape echo and spring.', ['dubtechno'], [Y.hp(), X.tapeDly(), X.spring()]);
  sh('Shaker without harshness', 'Soft, smooth shaker.', ['pop', 'rnb'], [X.soothe(), Y.deess(), Y.hp()]);
  sh('Afro house shaker', 'Driving shaker with snap, warmth and movement.', ['electronic'], [Y.trans(), X.tube('Light warmth.'), X.trem('Pan in 1/8.'), X.room()]);
  sh('Pop shaker', 'Airy, polished pop shaker.', ['pop'], [Y.hp('Air shelf at 12 kHz.'), X.opto(), X.plate()]);
  sh('Techno shaker', 'Gritty shaker with glitch and delay.', ['electronic'], [Y.hp(), X.decap(), X.glitch(), X.dly('1/16, low.')]);
  sh('Ambient shaker', 'Shaker dissolving into space.', ['electronic'], [X.filt('Low-pass, slow LFO.'), X.huge()]);
  sh('R&B shaker', 'Soft shaker with chorus and plate.', ['rnb'], [Y.hp(), X.chorus('Subtle chorus.'), X.plate()]);

  // ---------- Send Effects (25) ----------
  const rt = (name, desc, also, slots) => add('rtx', 'returns', name, desc, also, slots);
  const pre = (tip = 'Before the effect: high-pass 200–300 Hz, low-pass 8–10 kHz.') => s('eq', 'Send EQ', /pro-?q ?4|weiss eq|pro-?q|eq/i, tip);
  rt('Vocal plate send', 'The classic vocal plate on a return.', ['pop', 'rnb'], [pre(), X.plate('1.5–2 s, pre-delay 30–60 ms.')]);
  rt('Hall send with pre-delay', 'Big hall that stays out of the way.', ['pop'], [pre(), X.hall('2.5–3.5 s, pre-delay 60–80 ms.')]);
  rt('Tape echo send', 'Warm tape echo return.', ['indie', 'rnb'], [pre(), X.tapeDly('1/4 or 1/8 dotted.'), X.tape()]);
  rt('Ping-pong send', 'Stereo ping-pong delay return.', ['electronic', 'pop'], [pre(), X.pingpong('1/8, feedback 30 %.')]);
  rt('Shimmer send', 'Octave shimmer into a huge reverb.', ['electronic'], [pre(), X.pitch('Octave up.'), X.huge()]);
  rt('Dub echo send', 'Dub echo with filter and spring.', ['dubtechno'], [X.filt('Band-pass the echoes.'), X.tapeDly('Feedback 50–70 %.'), X.spring()]);
  rt('Short room send', 'A small room to glue dry tracks.', ['pop', 'indie'], [pre(), X.room('0.6–1 s.')]);
  rt('Chamber send', 'Natural echo-chamber space.', ['rnb', 'pop'], [pre(), Y.chamber()]);
  rt('Gated reverb send', 'Reverb chopped by a gate – the 80s drum sound.', ['pop'], [X.hall(), Y.gate()]);
  rt('Slapback send', 'Rockabilly and vocal slapback.', ['indie'], [pre(), X.tapeDly('80–120 ms, one repeat.')]);
  rt('Chorus send', 'Dimension-style chorus on a return for width.', ['pop', 'electronic'], [pre(), X.dim()]);
  rt('Delay into reverb send', 'Delay feeding a reverb – a soft, wide space.', ['pop', 'electronic'], [pre(), X.dly(), X.plate()]);
  rt('Filtered delay send', 'Delay with filtered, moving repeats.', ['electronic'], [X.dly(), X.filt('Filter the repeats, slow LFO.')]);
  rt('Spring send', 'Spring reverb return – surf and dub.', ['indie', 'dubtechno'], [pre(), X.spring()]);
  rt('Lexicon hall send', '80s Lexicon-style hall return.', ['pop'], [pre(), Y.lex()]);
  rt('EMT 250 send', 'The EMT 250 on a return.', ['pop', 'rnb'], [pre(), Y.emt250()]);
  rt('Haas width send', 'Very short delay (10–30 ms) on one side for width.', ['pop', 'electronic'], [s('delay', 'Short delay', /timeless|echoboy|primaltap|delay/i, '10–30 ms on one side, no feedback.')]);
  rt('Granular send', 'Granular echoes on a return.', ['electronic'], [Y.gran(), X.huge()]);
  rt('Octave pitch send', 'Pitch layer under the dry sound.', ['electronic', 'pop'], [X.pitch('Octave down or up, mix by ear.'), X.plate()]);
  rt('Parallel distortion send', 'Distortion blended under the dry signal.', ['indie', 'electronic'], [X.dist(), s('eq', 'Post EQ', /pro-?q|eq/i, 'Band-pass 300 Hz – 5 kHz after the distortion.')]);
  rt('Parallel compression send', 'New York compression on a return.', ['indie', 'hiphop', 'pop'], [Y.allButtons(), X.eqTone('Lift lows and highs a little.')]);
  rt('Vocal throw send', 'Long delay throws for single words.', ['pop', 'hiphop'], [pre(), X.dly('1/4, feedback 30 %, automate the send.'), X.plate()]);
  rt('Reverse-style swell send', 'Swelling reverb with slow attack feel.', ['electronic'], [X.huge(), X.filt('Low-pass the swell.')]);
  rt('Plate and delay combo', 'Plate and 1/8 delay together.', ['pop'], [pre(), X.dly('1/8, low feedback.'), X.plate()]);
  rt('Tape-saturated reverb send', 'Reverb with tape warmth.', ['indie', 'rnb'], [pre(), X.hall(), X.tape()]);

  // ---------- Bass (20) ----------
  const bs = (name, desc, also, slots) => add('bsx', 'bass', name, desc, also, slots);
  bs('DI bass polish', 'Clean DI bass made solid.', ['pop', 'indie'], [X.eqClean(), X.opto(), X.tube('A little drive for small speakers.')]);
  bs('Rock bass amp', 'DI through a bass amp, compressed.', ['indie'], [Y.amp(), X.fet(), X.eqTone()]);
  bs('Motown bass', 'Warm, round 60s bass.', ['rnb'], [X.opto(), X.eqTone('Pultec low boost at 60 Hz, roll off highs.'), X.tape()]);
  bs('Sub control', 'Even, controlled sub.', ['electronic', 'hiphop'], [X.eqClean('High-pass 25 Hz, cut 250 Hz.'), X.opto(), X.limit()]);
  bs('808 saturation', '808 heard on phones.', ['hiphop'], [X.decap('Saturation adds harmonics.'), X.eqClean(), Y.clip()]);
  bs('Synth bass glue', 'Synth bass compressed and warmed.', ['electronic', 'pop'], [X.fet(), X.tape(), X.eqTone()]);
  bs('Parallel distortion bass', 'Clean lows, distorted mids.', ['electronic', 'indie'], [X.dist('Mix 30–50 %.'), X.eqClean('High-pass the distorted part around 150 Hz.'), X.fet()]);
  bs('Funk slap bass', 'Punchy slap with controlled peaks.', ['rnb'], [X.fet('Fast attack for the slaps.'), X.eqTone('Scoop 400 Hz, lift 2 kHz.'), X.chorus('Subtle chorus.')]);
  bs('Reggae bass', 'Deep, round reggae bass.', ['dubtechno'], [X.eqTone('Low-pass around 1 kHz.'), X.opto(), X.tape()]);
  bs('Sidechained bass', 'Bass ducking under the kick.', ['electronic'], [X.fet(), X.pump()]);
  bs('Techno rumble', 'Kick rumble: reverb, low-pass, drive.', ['electronic'], [X.huge('Reverb on the kick, low-passed.'), X.filt('Low-pass at 200 Hz.'), X.decap()]);
  bs('Reese processing', 'Width on the mids, mono lows, grit.', ['electronic'], [X.chorus(), X.dist(), X.ott(), X.width('Width above 200 Hz only.')]);
  bs('Lo-fi bass', 'Warm, dusty bass.', ['hiphop'], [X.tape(), X.lofi(), X.opto()]);
  bs('Octave bass', 'Octave layer for weight.', ['electronic', 'indie'], [X.pitch('Octave down, mix 30 %.'), X.fet()]);
  bs('Growling mid bass', 'Mid growl for heavy music.', ['indie', 'electronic'], [Y.amp(), X.decap(), X.eqTone('Boost 800 Hz – 1.2 kHz.')]);
  bs('Upright bass', 'Natural upright bass.', ['indie'], [X.opto(), X.eqTone('Cut boom at 150 Hz.'), X.room()]);
  bs('Fretless chorus', 'Smooth fretless with chorus.', ['rnb', 'pop'], [X.opto(), X.chorus()]);
  bs('Bass de-mud', 'Clean up a muddy bass.', ['pop', 'indie'], [X.soothe('Low resonances only.'), X.eqClean('Cut 200–300 Hz.'), X.opto()]);
  bs('Distorted rock bass', 'Overdriven rock bass.', ['indie'], [X.dist(), Y.amp(), X.fet()]);
  bs('Trap bass loudness', '808 clipped and limited.', ['hiphop'], [X.decap(), Y.clip(), X.limit()]);

  // ---------- Mix Bus (15) ----------
  const mb = (name, desc, also, slots) => add('mbx', 'mixbus', name, desc, also, slots);
  const ssl = () => s('comp', 'SSL G Bus Compressor', /ssl g bus|ssl/i, 'Ratio 2:1, attack 30 ms, release Auto, 1–3 dB.', { set: { Ratio: [2, ''] } });
  mb('SSL glue classic', 'The classic mix-bus glue.', ['pop', 'electronic'], [ssl(), X.limit()]);
  mb('API punch bus', 'Punchy API bus compression.', ['indie', 'hiphop'], [s('comp', 'API 2500', /api 2500|2500/i, 'Ratio 2:1, Thrust on, 1–3 dB.'), X.limit()]);
  mb('Neve 33609 bus', 'Fat Neve bus compression.', ['rnb', 'indie'], [s('comp', 'Neve 33609', /33609/i, 'Ratio 2:1, 1–2 dB.'), X.tape()]);
  mb('Fairchild tube bus', 'Tube glue and warmth.', ['rnb', 'indie'], [s('comp', 'Fairchild', /fairchild|670/i, 'Time constant 2, 1 dB.'), X.eqTone()]);
  mb('Tape bus', 'Tape for glue and soft highs.', ['indie', 'rnb'], [X.tape('30 ips, low input.'), ssl()]);
  mb('Pultec and SSL', 'Tone and glue.', ['pop'], [s('eq', 'Pultec', /pultec|eqp/i, 'Low end and air, 1 dB.'), ssl()]);
  mb('Hip-hop bus', 'Punch, low end and loudness.', ['hiphop'], [s('eq', 'Pultec', /pultec|eqp/i, 'Low-end trick at 60 Hz.'), ssl(), Y.clip()]);
  mb('Electronic bus with clipper', 'Glue and clip for club tracks.', ['electronic'], [ssl(), Y.clip(), X.limit()]);
  mb('Rock bus', 'API punch and tape.', ['indie'], [s('comp', 'API 2500', /api 2500|2500/i, '1–3 dB.'), X.tape()]);
  mb('Gentle acoustic bus', 'Barely-there glue for acoustic music.', ['indie'], [X.opto('0.5–1 dB.'), X.eqTone('Air at 12 kHz.')]);
  mb('Parallel bus compression', 'Heavy compression blended in.', ['pop', 'indie'], [s('comp', 'Bus compressor', /ssl|glue|bus|2500/i, '4:1, 6–8 dB, Mix 30–40 %.', { set: { Mix: [35, '%'] } })]);
  mb('Bus with soothe', 'Glue plus resonance control for bright mixes.', ['pop', 'electronic'], [X.soothe('Very light.'), ssl()]);
  mb('Shadow Hills bus', 'Optical and discrete compression.', ['pop', 'electronic'], [s('comp', 'Shadow Hills', /shadow hills/i, '1–2 dB on each stage.')]);
  mb('Vari-Mu bus', 'Smooth tube compression.', ['rnb', 'pop'], [s('comp', 'Vari-Mu', /vari-?mu|dyna-?mu|fairchild/i, 'Ratio 1.5:1, 1–2 dB.'), X.eqTone()]);
  mb('Console bus', 'Console emulation then glue.', ['pop', 'indie'], [s('preamp', 'Console', /bx_console|console|channel/i, 'Console colour, drive low.'), ssl()]);

  // ---------- Experimental (20 more; maker presets on every module) ----------
  const ex = (name, desc, slots) => add('exx', 'experimental', name, desc, ['electronic'], slots.map(x => ({ ...x, pre: true, ...(x.prefer ? { only: x.prefer } : {}) })));
  const A = {
    fragments: () => s('glitch', 'Efx FRAGMENTS', /fragments/i, 'Arturia FRAGMENTS preset – granular slicing.'),
    intensity: () => s('reverb', 'Rev INTENSITY', /intensity/i, 'Arturia INTENSITY preset.'),
    tape201: () => s('delay', 'Delay TAPE-201', /tape-?201/i, 'Arturia TAPE-201 preset.'),
    brigade: () => s('delay', 'Delay BRIGADE', /brigade/i, 'Arturia BRIGADE preset.'),
    coldfire: () => s('dist', 'Dist COLDFIRE', /coldfire/i, 'Arturia COLDFIRE preset.'),
    culture: () => s('sat', 'Dist TUBE-CULTURE', /tube-?culture/i, 'Arturia TUBE-CULTURE preset.'),
    ms20: () => s('filter', 'Filter MS-20', /filter ms-?20/i, 'Arturia Filter MS-20 preset.'),
    m12: () => s('filter', 'Filter M12', /filter m12/i, 'Arturia Filter M12 preset.'),
    bitron: () => s('mod', 'Phaser BI-TRON', /bi-?tron/i, 'Arturia BI-TRON preset.'),
    jun6: () => s('chorus', 'Chorus JUN-6', /chorus jun-?6/i, 'Arturia JUN-6 preset.'),
    mellofi: () => s('tape', 'Tape MELLO-FI', /mello-?fi/i, 'Arturia MELLO-FI preset.'),
    lx24: () => s('reverb', 'Rev LX-24', /lx-?24/i, 'Arturia LX-24 preset.'),
    spring: () => s('reverb', 'Rev SPRING-636', /spring-?636/i, 'Arturia SPRING-636 preset.'),
    busforce: () => s('comp', 'Bus FORCE', /bus force/i, 'Arturia Bus FORCE preset.'),
  };
  const ST = {
    crystal: () => s('delay', 'Crystallizer', /crystallizer/i, 'Soundtoys preset.'),
    echo: () => s('delay', 'EchoBoy', /echoboy/i, 'Soundtoys preset.'),
    decap: () => s('sat', 'Decapitator', /decapitator/i, 'Soundtoys preset.'),
    filter: () => s('filter', 'FilterFreak', /filterfreak/i, 'Soundtoys preset.'),
    plate: () => s('reverb', 'SuperPlate', /superplate/i, 'Soundtoys preset.'),
    blender: () => s('reverb', 'SpaceBlender', /spaceblender/i, 'Soundtoys preset.'),
    alter: () => s('pitch', 'Little AlterBoy', /alterboy/i, 'Soundtoys preset.'),
    radiator: () => s('sat', 'Radiator', /radiator/i, 'Soundtoys preset.'),
  };
  const H3 = () => s('pitch', 'H3000', /h3000/i, 'H3000 factory preset.');
  ex('FRAGMENTS into INTENSITY', 'Arturia granular slicing into a huge Arturia reverb.', [A.fragments(), A.intensity()]);
  ex('Arturia tape world', 'MELLO-FI, TAPE-201 and SPRING-636 presets.', [A.mellofi(), A.tape201(), A.spring()]);
  ex('Arturia filter and drive', 'Filter MS-20 into COLDFIRE.', [A.ms20(), A.coldfire(), A.brigade()]);
  ex('Arturia vintage modulation', 'JUN-6 and BI-TRON presets into LX-24.', [A.jun6(), A.bitron(), A.lx24()]);
  ex('Arturia M12 movement', 'Filter M12 preset into TAPE-201.', [A.m12(), A.tape201()]);
  ex('Tube culture crush', 'TUBE-CULTURE into Bus FORCE.', [A.culture(), A.busforce()]);
  ex('H3000 into INTENSITY', 'Eventide pitch madness into Arturia space.', [H3(), A.intensity()]);
  ex('FRAGMENTS into EchoBoy', 'Arturia slicing into Soundtoys echoes.', [A.fragments(), ST.echo()]);
  ex('Crystallizer into LX-24', 'Granular echoes into an 80s hall.', [ST.crystal(), A.lx24()]);
  ex('SpaceBlender worlds', 'Random SpaceBlender presets with EchoBoy.', [ST.echo(), ST.blender()]);
  ex('AlterBoy creatures', 'Little AlterBoy presets into H3000.', [ST.alter(), H3()]);
  ex('Radiator and FilterFreak', 'Tube colour into a moving filter.', [ST.radiator(), ST.filter(), A.tape201()]);
  ex('Decapitator and COLDFIRE', 'Two distortions stacked.', [ST.decap(), A.coldfire()]);
  ex('BRIGADE and SuperPlate', 'Bucket-brigade delay into plate.', [A.brigade(), ST.plate()]);
  ex('Phaser and crystals', 'BI-TRON into Crystallizer.', [A.bitron(), ST.crystal()]);
  ex('MS-20 into H3000', 'Screaming filter into harmonizer.', [A.ms20(), H3()]);
  ex('Mello-Fi and Crystallizer', 'Lo-fi tape into granular echoes.', [A.mellofi(), ST.crystal()]);
  ex('Spring and tape chaos', 'SPRING-636, TAPE-201 and EchoBoy.', [A.spring(), A.tape201(), ST.echo()]);
  ex('JUN-6 into FRAGMENTS', 'Chorus into granular slicing.', [A.jun6(), A.fragments()]);
  ex('Full Arturia chain', 'Filter, distortion, chorus, delay, reverb – all Arturia presets.', [A.m12(), A.culture(), A.jun6(), A.brigade(), A.intensity()]);
})();
