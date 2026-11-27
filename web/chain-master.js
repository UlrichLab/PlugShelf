'use strict';
/* PlugShelf – mastering chains, mostly built from UAD plug-ins (others where UAD has no match).
   A few follow chains engineers described in Universal Audio interviews (see `src`); the others are
   common mastering recipes by style and goal and are not credited to anyone.
   `device` names the hardware or plug-in meant: PlugShelf takes it (or another emulation of it) when it is
   installed, otherwise a comparable plug-in of the same kind (`prefer`) stands in and the slot says so.
   Preferred where the library has them: Pro-Q 4 and Weiss EQs, Ozone, soothe. */
(function () {
  const T = typeof CHAIN_TEMPLATES !== 'undefined' ? CHAIN_TEMPLATES : require('./chain-data.js').CHAIN_TEMPLATES;

  const D = {
    pultec: /pultec|eqp-?1a/i,
    massive: /massive passive/i,
    bax: /\bbax\b/i,
    sontec: /sontec|eq-?432/i,
    weissEq: /weiss eq/i,
    proq: /pro-?q ?4|pro-?q/i,
    maag: /maag eq/i,
    neve: /neve 1084|neve 88rs|1073|eq-?73|bx_console n\b/i,
    sslBus: /ssl g bus|ssl.*bus comp/i,
    n33609: /33609/i,
    n2254: /\b2254\b/i,
    api2500: /api 2500/i,
    fairchild: /fairchild|vc-?670/i,
    varimu: /vari-?mu|dyna-?mu/i,
    shadow: /shadow hills/i,
    la2a: /la-?2a|teletronix/i,
    weissDs1: /weiss ds1/i,
    weissCl: /weiss compressor limiter/i,
    weissMm1: /weiss mm-?1/i,
    weissDs5: /weiss ds5/i,
    studer: /studer|a800/i,
    atr102: /atr-?102|ampex/i,
    precLim: /precision limiter/i,
    precMb: /precision multiband/i,
    proL: /pro-?l ?2|pro-?l\b/i,
    ozoneMax: /ozone \d+ maximizer/i,
    ozoneEq: /ozone \d+ (vintage )?eq|ozone \d+ equalizer/i,
    ozoneDyn: /ozone \d+ dynamics/i,
    ozoneImg: /ozone \d+ imager/i,
    ozoneClarity: /ozone \d+ clarity/i,
    ozoneExc: /ozone \d+ exciter/i,
    ozoneTape: /ozone \d+ vintage tape/i,
    ozoneVComp: /ozone \d+ vintage compressor/i,
    ozoneVLim: /ozone \d+ vintage limiter/i,
    inflator: /inflator/i,
    soothe: /soothe/i,
    masterdesk: /bx_masterdesk/i,
    elysia: /elysia alpha/i,
    karacter: /karacter/i,
    bxDigital: /bx_digital/i,
    refinement: /bx_refinement/i,
    oxfordLim: /oxford limiter/i,
    fatso: /fatso/i,
    proMb: /pro-?mb/i,
    clipper: /clip/i,
  };
  // what stands in when the named device is missing
  const K = {
    eqColor: /pultec|eqp|maag|bax|eq-?432|neve|1084|88rs|sie-?q|passive|eq-?p[abg]|massive|bx_2098|vintage eq/i,
    eqClean: /pro-?q ?4|weiss eq|pro-?q|bx_digital|kirchhoff|ozone \d+ equalizer|linear phase/i,
    busComp: /ssl|bus|glue|33609|2254|2500|townhouse|shadow hills|weiss compressor|alpha|vari-?mu|dyna-?mu|fairchild/i,
    tubeComp: /fairchild|670|vari-?mu|dyna-?mu|tube|la-?2a/i,
    limiter: /pro-?l ?2|weiss mm-?1|ozone \d+ maximizer|oxford limiter|precision limiter/i,
    mb: /precision multiband|pro-?mb|ozone \d+ dynamics|weiss ds5|md4|md3|multi/i,
    tape: /studer|a800|atr|ampex|tape machine|j-?37|vintage tape|kiss of shame/i,
    exciter: /inflator|exciter|enhancer|karacter|ozone \d+ exciter/i,
    width: /ozone \d+ imager|stereomaker|imager|spread|ms|mid.?side/i,
    deess: /weiss ds1|weiss deess|pro-?ds|de-?ess/i,
    meter: /span|meter|loudness|insight|metric ?ab|vision/i,
  };
  // favor: UAD versions first when several plug-ins model the same unit
  const m = (role, label, device, prefer, tip, more = {}) => ({ role, label, ...(device ? { device } : {}), ...(prefer ? { prefer } : {}), favor: /universal audio|\buadx?\b/i, tip, ...more });
  const E = {
    pultec: (tip = 'Low-end lift at 30–60 Hz with a touch of attenuation; air at 10–16 kHz, 1–2 dB.') => m('eq', 'Pultec EQP-1A', D.pultec, K.eqColor, tip),
    pultecFlat: () => m('eq', 'Pultec (flat, for colour)', D.pultec, K.eqColor, 'All boosts at 0 – only the tube and transformer colour.'),
    massive: (tip = 'Broad passive curves: shelf the lows and highs by 0.5–1.5 dB.') => m('eq', 'Manley Massive Passive', D.massive, K.eqColor, tip),
    bax: (tip = 'Baxandall shelves: +1 dB at 18 kHz, +0.5–1 dB at 70 Hz, high-pass at 12–18 Hz.') => m('eq', 'Dangerous BAX EQ', D.bax, K.eqColor, tip),
    sontec: (tip = 'Precise musical moves, 0.5–1 dB.') => m('eq', 'Sontec EQ', D.sontec, K.eqColor, tip),
    weissEq: (tip = 'Surgical corrections and gentle shelves, 0.5–1.5 dB.') => m('eq', 'Weiss EQ1', D.weissEq, K.eqClean, tip),
    proq: (tip = 'Corrections first: narrow cuts on resonances, linear phase on the lows if needed.') => m('eq', 'FabFilter Pro-Q 4', D.proq, K.eqClean, tip),
    maag: (tip = 'Air band at 10–20 kHz, 1–2 dB.') => m('eq', 'Maag EQ4 – Air', D.maag, /maag|air|pultec|bax/i, tip),
    neve: (tip = 'Neve colour: small shelf moves, mid presence at 3.2 kHz if needed.') => m('eq', 'Neve EQ', D.neve, K.eqColor, tip),
    ozoneEq: (tip = 'Broad tonal moves, mid/side if needed.') => m('eq', 'Ozone EQ', D.ozoneEq, K.eqClean, tip),
    bxDigital: (tip = 'Mid/side EQ: tighten the side lows, open the side highs.') => m('eq', 'bx_digital (M/S)', D.bxDigital, K.eqClean, tip),
    refinement: (tip = 'Tames harsh upper mids.') => m('dyneq', 'bx_refinement', D.refinement, /refinement|soothe|smooth/i, tip),
    soothe: (tip = 'Gentle: depth low, only the harshest resonances.') => m('dyneq', 'soothe2', D.soothe, /soothe|refinement|dynamic ?eq/i, tip),
    clarity: (tip = 'Spectral clarity – small amounts.') => m('eq', 'Ozone Clarity', D.ozoneClarity, /clarity|soothe/i, tip),
    ssl: (tip = 'Ratio 2:1, attack 30 ms, release Auto, 1–2 dB of glue.') => m('comp', 'SSL G Bus Compressor', D.sslBus, K.busComp, tip, { set: { Ratio: [2, ''] } }),
    n33609: (tip = 'Ratio 2:1, slow recovery, 1–2 dB.') => m('comp', 'Neve 33609', D.n33609, K.busComp, tip),
    n2254: (tip = 'Gentle diode-bridge compression, 1–2 dB.') => m('comp', 'Neve 2254', D.n2254, K.busComp, tip),
    api: (tip = 'Ratio 1.5–2:1, Thrust on, soft knee, 1–2 dB for punch.') => m('comp', 'API 2500', D.api2500, K.busComp, tip),
    fairchild: (tip = 'Time constant 2–3, 1 dB – thickens and glues.') => m('comp', 'Fairchild 670', D.fairchild, K.tubeComp, tip),
    varimu: (tip = 'Ratio 1.5:1, slow, 1–2 dB.') => m('comp', 'Manley Vari-Mu', D.varimu, K.tubeComp, tip),
    shadow: (tip = 'Optical stage for the level, discrete stage for the peaks, 1–2 dB each.') => m('comp', 'Shadow Hills Mastering Comp', D.shadow, K.busComp, tip),
    la2a: (tip = 'Very little peak reduction – smoothness on soft material.') => m('comp', 'LA-2A', D.la2a, K.tubeComp, tip),
    weissCl: (tip = 'Transparent compression, 1–2 dB.') => m('comp', 'Weiss Compressor', D.weissCl, K.busComp, tip),
    elysia: (tip = 'Class-A bus compression, 1–2 dB, M/S if needed.') => m('comp', 'elysia alpha', D.elysia, K.busComp, tip),
    fatso: (tip = 'Warmth 1–2 for tape-like rounding of harsh highs.') => m('sat', 'FATSO', D.fatso, K.tape, tip),
    precMb: (tip = 'Only the bands that jump out, 1–2 dB each.') => m('multiband', 'Precision Multiband', D.precMb, K.mb, tip),
    proMb: (tip = 'Dynamic control on lows and harsh highs, 1–2 dB.') => m('multiband', 'FabFilter Pro-MB', D.proMb, K.mb, tip),
    ozoneDyn: (tip = 'Multiband compression, 1–2 dB per band.') => m('multiband', 'Ozone Dynamics', D.ozoneDyn, K.mb, tip),
    weissDs5: (tip = 'Multiband, gentle.') => m('multiband', 'Weiss DS5', D.weissDs5, K.mb, tip),
    weissDs1: (tip = 'De-essing and dynamic EQ on harsh moments.') => m('deess', 'Weiss DS1-MK3', D.weissDs1, K.deess, tip),
    studer: (tip = '30 ips, low input – subtle glue and rounded highs.') => m('tape', 'Studer A800', D.studer, K.tape, tip),
    atr: (tip = 'Mastering tape: 30 ips, ½-inch, low input.') => m('tape', 'Ampex ATR-102', D.atr102, K.tape, tip),
    ozoneTape: (tip = 'Vintage tape: low drive, harmonics for warmth.') => m('tape', 'Ozone Vintage Tape', D.ozoneTape, K.tape, tip),
    inflator: (tip = 'Effect 20–40 %, curve 0 – louder without limiting.') => m('exciter', 'Oxford Inflator', D.inflator, K.exciter, tip),
    exciter: (tip = 'A little harmonic excitement on the highs.') => m('exciter', 'Ozone Exciter', D.ozoneExc, K.exciter, tip),
    karacter: (tip = 'Subtle saturation, M/S if needed.') => m('sat', 'elysia karacter', D.karacter, K.exciter, tip),
    imager: (tip = 'Narrow the lows below 150 Hz, widen the highs a little; check in mono.') => m('width', 'Ozone Imager', D.ozoneImg, K.width, tip),
    precLim: (tip = 'Ceiling −1 dB, gain until the loudness fits, at most 2–3 dB of gain reduction.') => m('limiter', 'Precision Limiter', D.precLim, K.limiter, tip, { set: { Ceiling: [-1, 'dB'] } }),
    proL: (tip = 'Ceiling −1 dBTP, Modern or Transparent style, oversampling 4×.') => m('limiter', 'FabFilter Pro-L 2', D.proL, K.limiter, tip, { set: { Ceiling: [-1, 'dB'] } }),
    ozoneMax: (tip = 'IRC IV, ceiling −1 dB, target loudness by ear.') => m('limiter', 'Ozone Maximizer', D.ozoneMax, K.limiter, tip, { set: { Ceiling: [-1, 'dB'] } }),
    weissMm1: (tip = 'Choose a style and loudness; ceiling −1 dB.') => m('limiter', 'Weiss MM-1', D.weissMm1, K.limiter, tip),
    oxfordLim: (tip = 'Ceiling −1 dB, enhance to taste.') => m('limiter', 'Oxford Limiter', D.oxfordLim, K.limiter, tip, { set: { Ceiling: [-1, 'dB'] } }),
    clip: (tip = 'Clip only the loudest transients, 0.5–1 dB, before the limiter.') => m('clipper', 'Clipper', D.clipper, /clip/i, tip),
    masterdesk: (tip = 'All-in-one console master section: EQ, glue, width, limiter.') => m('suite', 'bx_masterdesk', D.masterdesk, /masterdesk|ozone \d+$|t-racks/i, tip),
    meter: () => m('meter', 'Meter', null, K.meter, 'Watch integrated LUFS, true peak and the stereo image.', { opt: .8 }),
  };

  let n = 0;
  const mc = (name, desc, src, genres, slots) => T.push({ id: 'mst-' + String(++n).padStart(3, '0') + 'x', rubric: 'master', also: genres, name, desc, src, slots });
  const UA = 'Universal Audio interviews (uaudio.com)';

  // ---------- chains engineers described to Universal Audio ----------
  mc('Peter Doell – Pultec flat into multiband', 'A Pultec set flat only for its colour, then the Precision Multiband.', '“7 Questions with Famed Mastering Engineers” (uaudio.com)', ['pop', 'indie'],
    [E.pultecFlat(), E.precMb(), E.precLim(), E.meter()]);
  mc('Emily Lazar – UAD picks', 'Her go-to UAD tools: Pultec, Fairchild, Precision Multiband and the SSL G Bus Compressor.', 'Emily Lazar on Mastering Hits with UAD Plug-Ins (uaudio.com)', ['pop', 'indie'],
    [E.pultec(), E.fairchild(), E.precMb(), E.ssl(), E.precLim()]);
  mc('Jacquire King – bus chain as a master', 'bx_refinement, 33609, ATR-102, Pultec and Precision Limiter – his Jamie Lidell mix-bus chain, used as a mastering chain.', 'Jacquire King UAD interview (uaudio.com)', ['rnb', 'indie'],
    [E.refinement(), E.n33609(), E.atr(), E.pultec(), E.precLim()]);
  mc('Paul Blakemore – Neve and 33609', 'Neve EQ and 33609 compression – his favourite UAD pairing.', 'Paul Blakemore UAD interview (uaudio.com)', ['indie', 'pop'],
    [E.neve(), E.n33609(), E.studer(), E.precLim()]);

  // ---------- classic analog-style UAD masters ----------
  mc('UAD analog classic', 'Pultec, Fairchild, tape and limiter – the warm, glued analog master.', '', ['pop', 'rnb'],
    [E.pultec(), E.fairchild(), E.studer(), E.precLim(), E.meter()]);
  mc('Pultec, SSL, Precision Limiter', 'The everyday UAD master: tone, glue, loudness.', '', ['pop', 'hiphop', 'electronic'],
    [E.pultec(), E.ssl(), E.precLim()]);
  mc('Neve warmth master', 'Neve EQ, 33609 and tape – thick and warm.', '', ['rnb', 'indie'],
    [E.neve(), E.n33609(), E.studer(), E.proL()]);
  mc('Massive Passive and Vari-Mu', 'Passive tube EQ and tube compression – the classic high-end analog combination.', '', ['pop', 'indie'],
    [E.massive(), E.varimu(), E.atr(), E.precLim()]);
  mc('Shadow Hills master', 'Corrective EQ, Shadow Hills, BAX air and limiter.', '', ['pop', 'electronic'],
    [E.proq(), E.shadow(), E.bax(), E.proL()]);
  mc('API punch master', 'API 2500 punch for drums-heavy mixes.', '', ['hiphop', 'indie'],
    [E.pultec(), E.api(), E.precLim()]);
  mc('2254 vintage master', 'Neve 2254 and Pultec – vintage colour for soul and funk.', '', ['rnb'],
    [E.pultec(), E.n2254(), E.studer(), E.precLim()]);
  mc('Tube glue master', 'Fairchild and Vari-Mu in series, very light – tube density.', '', ['rnb', 'indie'],
    [E.fairchild('Time constant 3, 0.5–1 dB.'), E.varimu('Another 0.5–1 dB.'), E.bax(), E.precLim()]);
  mc('Tape-first master', 'ATR-102 first for glue, then EQ and limiter.', '', ['indie', 'rnb'],
    [E.atr(), E.pultec(), E.ssl(), E.precLim()]);
  mc('Dangerous BAX finish', 'Corrective EQ, SSL glue, BAX shelves, limiter.', '', ['pop', 'electronic'],
    [E.weissEq(), E.ssl(), E.bax(), E.precLim()]);
  mc('Sontec and Fairchild', 'Precise musical EQ and tube glue.', '', ['pop', 'indie'],
    [E.sontec(), E.fairchild(), E.precLim()]);

  // ---------- modern / loud ----------
  mc('Modern pop loud', 'Corrections, glue, clarity, clipping and a transparent limiter – competitive loudness.', '', ['pop'],
    [E.proq(), E.soothe(), E.ssl(), E.clip(), E.proL(), E.meter()]);
  mc('Hip-hop low-end master', 'Pultec low end, SSL glue, multiband on the lows, loud limiter.', '', ['hiphop'],
    [E.pultec('Low-end trick at 30 or 60 Hz.'), E.ssl(), E.proMb('Control the 808 and sub, 1–2 dB.'), E.clip(), E.proL()]);
  mc('EDM / club master', 'Tight lows, controlled highs, clip and limit – loud and clean.', '', ['electronic'],
    [E.proq(), E.proMb(), E.imager(), E.clip(), E.proL(), E.meter()]);
  mc('Trap master', 'Sub control, saturation and loud limiting.', '', ['hiphop'],
    [E.proq(), E.inflator(), E.proMb(), E.proL()]);
  mc('Rock master', 'API punch, Pultec tone, tape and limiter.', '', ['indie'],
    [E.pultec(), E.api(), E.studer(), E.precLim()]);
  mc('Metal master', 'Tight lows, tamed harshness, punchy and loud.', '', ['indie'],
    [E.proq(), E.soothe(), E.api(), E.proMb(), E.proL()]);
  mc('Loud and clean (Weiss)', 'Weiss EQ, compressor and MM-1 – transparent loudness.', '', ['pop', 'electronic'],
    [E.weissEq(), E.weissCl(), E.weissMm1()]);
  mc('Ozone modern master', 'Ozone EQ, Dynamics, Imager and Maximizer – the all-Ozone chain.', '', ['pop', 'electronic'],
    [E.ozoneEq(), E.ozoneDyn(), E.imager(), E.ozoneMax(), E.meter()]);
  mc('Ozone clarity master', 'Corrections, Clarity, soothe and Maximizer for harsh or dull mixes.', '', ['pop'],
    [E.proq(), E.clarity(), E.soothe(), E.ozoneMax()]);
  mc('Inflator loudness', 'Glue, Inflator and limiter – loudness without squashing.', '', ['pop', 'hiphop'],
    [E.ssl(), E.inflator(), E.proL()]);
  mc('Streaming −14 LUFS', 'Gentle chain for streaming level: dynamic and clean.', '', ['pop', 'indie'],
    [E.weissEq(), E.ssl('1 dB at most.'), E.proL('Ceiling −1 dBTP, aim for about −14 LUFS integrated.'), E.meter()]);

  // ---------- gentle / acoustic / jazz / classical ----------
  mc('Acoustic and jazz master', 'Minimal: Sontec-style EQ, a touch of tube, transparent limiter.', '', ['indie'],
    [E.sontec(), E.la2a(), E.weissMm1('Very light – keep the dynamics.')]);
  mc('Classical / orchestral', 'Almost transparent: EQ and a gentle limiter.', '', ['indie'],
    [E.weissEq('Very small moves.'), E.proL('Only the highest peaks, ceiling −1 dBTP.'), E.meter()]);
  mc('Singer-songwriter warmth', 'Neve EQ, LA-2A smoothness, tape and limiter.', '', ['indie', 'pop'],
    [E.neve(), E.la2a(), E.studer(), E.precLim()]);
  mc('Lo-fi / chill master', 'Tape, gentle glue and a soft top.', '', ['hiphop', 'electronic'],
    [E.ozoneTape(), E.pultec('Soft top: a little high attenuation.'), E.ssl(), E.proL()]);
  mc('Ambient master', 'Wide and dynamic: EQ, M/S, light limiting.', '', ['electronic'],
    [E.bxDigital(), E.imager(), E.weissMm1('Light – keep the space.')]);

  // ---------- by genre ----------
  mc('Techno master', 'Tight sub, glued mids, clean limiting.', '', ['electronic', 'dubtechno'],
    [E.proq(), E.ssl(), E.proMb('Lows only, 1–2 dB.'), E.proL()]);
  mc('Dub techno vinyl-style', 'Mono lows, soft highs, tape and gentle limit.', '', ['dubtechno', 'electronic'],
    [E.bxDigital('Mono below 150 Hz, soften the side highs.'), E.studer(), E.fairchild(), E.precLim()]);
  mc('House master', 'Pultec bottom, SSL glue, air and limiter.', '', ['electronic'],
    [E.pultec(), E.ssl(), E.maag(), E.proL()]);
  mc('Drum & bass master', 'Controlled sub, punch and loudness.', '', ['electronic'],
    [E.proq(), E.api(), E.proMb(), E.clip(), E.proL()]);
  mc('R&B silk', 'Smooth top, warm lows, glue.', '', ['rnb'],
    [E.pultec(), E.soothe(), E.n33609(), E.precLim()]);
  mc('Soul / funk vintage', '2254, Pultec and tape – the 70s record sound.', '', ['rnb'],
    [E.pultec(), E.n2254(), E.atr(), E.precLim()]);
  mc('Indie warmth', 'Neve, Fairchild and tape.', '', ['indie'],
    [E.neve(), E.fairchild(), E.studer(), E.proL()]);
  mc('Synthwave master', 'Warm tape, glue and wide highs.', '', ['electronic', 'pop'],
    [E.pultec(), E.ssl(), E.studer(), E.imager(), E.proL()]);
  mc('Pop ballad', 'Open, airy and dynamic.', '', ['pop'],
    [E.weissEq(), E.varimu(), E.maag(), E.precLim()]);
  mc('Reggae / dub master', 'Big lows, soft top, tape.', '', ['dubtechno'],
    [E.pultec('Low-end trick at 60 Hz.'), E.studer(), E.la2a(), E.precLim()]);
  mc('Film / trailer master', 'Huge but controlled: multiband, clipper, limiter.', '', ['electronic'],
    [E.proq(), E.proMb(), E.clip(), E.proL()]);
  mc('Podcast / voice master', 'De-ess, level and limit to −16 LUFS.', '', ['pop'],
    [E.proq('High-pass 80 Hz, cut mud at 200–300 Hz.'), E.weissDs1(), E.la2a(), E.proL('Ceiling −1 dBTP, about −16 LUFS.')]);

  // ---------- problem solvers ----------
  mc('Harsh mix fix', 'Tames harshness before anything else.', '', ['pop', 'indie'],
    [E.soothe(), E.weissDs1('Dynamic control at 3–8 kHz.'), E.pultec('Soft top: a little high attenuation.'), E.precLim()]);
  mc('Dull mix fix', 'Opens up a dull mix.', '', ['pop'],
    [E.clarity(), E.maag(), E.exciter(), E.proL()]);
  mc('Muddy low end fix', 'Cleans and tightens the lows.', '', ['hiphop', 'electronic'],
    [E.proq('Cut 200–350 Hz, high-pass 20–25 Hz.'), E.proMb('Lows only.'), E.imager(), E.precLim()]);
  mc('Narrow mix fix', 'More width without losing the centre.', '', ['pop', 'electronic'],
    [E.bxDigital(), E.imager(), E.precLim()]);
  mc('Over-compressed mix', 'Little compression, more air and a gentle limit.', '', ['pop'],
    [E.bax(), E.ozoneTape(), E.weissMm1('Light.')]);

  // ---------- all-in-one and hybrids ----------
  mc('bx_masterdesk quick master', 'One plug-in master, then a meter.', '', ['pop', 'electronic'],
    [E.masterdesk(), E.meter()]);
  mc('elysia hybrid', 'elysia alpha and karacter with Pultec and limiter.', '', ['electronic', 'pop'],
    [E.pultec(), E.elysia(), E.karacter(), E.proL()]);
  mc('FATSO glue master', 'Pultec, FATSO tape rounding, SSL and limiter.', '', ['hiphop', 'indie'],
    [E.pultec(), E.fatso(), E.ssl(), E.precLim()]);
  mc('Weiss and UAD hybrid', 'Weiss precision with UAD colour.', '', ['pop'],
    [E.weissEq(), E.fairchild(), E.weissDs1(), E.weissMm1()]);
  mc('Vintage vs. modern blend', 'Analog colour first, digital precision last.', '', ['pop', 'electronic'],
    [E.pultec(), E.n33609(), E.studer(), E.proq('Final corrections.'), E.proL()]);
  mc('Ozone vintage master', 'Ozone Vintage EQ, Compressor, Tape and Limiter.', '', ['indie', 'rnb'],
    [E.ozoneEq(), m('comp', 'Ozone Vintage Compressor', D.ozoneVComp, K.busComp, 'Gentle glue.'), E.ozoneTape(), m('limiter', 'Ozone Vintage Limiter', D.ozoneVLim, K.limiter, 'Soft, analog-style limiting.')]);
})();
