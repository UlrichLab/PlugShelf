'use strict';
/* PlugShelf – more chain templates:
   - 100 documented hardware chains of well-known records, engineers and mastering rooms
     (from a list the user imported; spot-checked where noted in `src`),
   - dub techno effect chains (one after Studio Brootle's guide),
   - mastering chains after the Lazi Akademie wiki.
   Each slot names the original hardware in `device`: PlugShelf picks an emulation of it whenever the
   library has one, otherwise a comparable plugin of the same kind (`prefer`) stands in.
   `set` holds documented values (starting values on the macros); `macros` lists the settings the
   source leaves to taste ("variable") – those get macros first. */
(function () {
  const T = typeof CHAIN_TEMPLATES !== 'undefined' ? CHAIN_TEMPLATES : require('./chain-data.js').CHAIN_TEMPLATES;

  /** The named hardware → names of its plugin emulations. */
  const D = {
    neve: /\bneve\b(?! ?(2254|33609))|1073|1084|eq-?73|pre 1973|88rs|bx_console n\b/i,
    ssl: /bx_console ssl|british channel|ssl 4000|ssl channel|ssl e-?channel/i,
    api: /\bapi ?5[15]0\b|\bapi\b(?! ?2500)/i,
    helios: /helios/i,
    v76: /\bv ?76\b|\bv ?72\b/i,
    avalon: /avalon|vt-?737/i,
    u1176: /1176|black 76|fet-?76/i,
    la2a: /la-?2a|white 2a|teletronix/i,
    la3a: /la-?3a/i,
    cl1b: /cl ?1b|tube-?sta|tube-?tech/i,          // Arturia Comp TUBE-STA models the CL 1B
    fairchild: /fairchild|\b6[67]0\b|vc-?670/i,
    dbx: /\bdbx\b|\b16[05][ax]?\b|vca-?65/i,          // Arturia Comp VCA-65 models the dbx 165
    distressor: /distressor/i,
    vari: /vari-?mu|dyna-?mu/i,                    // IK Dyna-Mu models the Manley Variable-Mu
    n33609: /33609/i,
    sslbus: /ssl g bus|g ?bus comp|g-?master|townhouse/i,
    api2500: /api ?2500|2500 bus/i,
    shadow: /shadow hills/i,
    pultec: /pultec|eqp-?1a|\beq-?p[abg]\b/i,
    gml: /\bgml\b|8200/i,
    maag: /maag eq/i,
    massive: /massive passive/i,
    sontec: /sontec|eq-?432/i,                     // IK Master EQ-432 models the Sontec MES-432
    bax: /\bbax\b/i,
    weissDS1: /weiss ds1|ds1-?mk3|weiss compressor ?limiter/i,   // Softube Weiss DS1-MK3 / Compressor Limiter
    weissEQ1: /weiss eq ?1\b|weiss eq mp/i,
    maselec: /maselec|\bmea-?2\b/i,
    lex480: /480l|lexicon 480/i,
    lex224: /lx-?24|lexicon 224|\b224\b/i,          // Arturia Rev LX-24 models the 224
    pcm: /\bpcm ?\d+/i,
    emt140: /emt ?140|plate-?140/i,
    nonlin: /nonlin|rmx ?16/i,
    re201: /re-?201|tape-?201|space echo/i,         // Arturia Delay TAPE-201 models the RE-201
    sde: /sde-?3000/i,
    primetime: /prime ?time|primaltap/i,           // Soundtoys PrimalTap models the Prime Time
    ams: /dmx ?15|ams ?delay/i,
    h3000: /h3000/i,
    h910: /h910|h3000/i,
    harmony: /h8000|harmony engine|h3000/i,
    culture: /culture|vulture/i,                   // Arturia Dist TUBE-CULTURE models the Culture Vulture
    radiator: /radiator|1567/i,                    // Soundtoys Radiator models the Altec 1567A
    sansamp: /sansamp/i,
    jcm: /jcm|marshall|plexi/i,
    studer: /studer|a800/i,
    atr: /atr-?102|tape machine 99/i,              // IK Tape Machine 99 models the Ampex ATR-102
    otari: /otari|mtr-?90/i,
    revox: /revox|b77/i,
    tascam: /tascam|porta ?one/i,
    sp1200: /sp-?1200|sp950/i,                     // waveTracing SP950 models the SP-1200
    sp303: /sp-?30[34]|sp-?404/i,
    mpc: /\bmpc\b/i,
    asr: /asr-?10/i,
    sherman: /sherman/i,
    mutron: /mu-?tron ?iii|envelope filter/i,
    biphase: /bi-?tron|bi-?phase/i,                // Arturia Phaser BI-TRON models the Mu-Tron Bi-Phase
    mf101: /mf-?101|moog multimode|multimode filter/i,
    jc120: /jc-?120/i,
    deco: /\bdeco\b/i,
    bigsky: /big ?sky/i,
    espace: /eventide space|blackhole/i,
    bam: /\bbam\b|\boto\b/i,
    midiverb: /midiverb/i,
    alesis: /3630/i,
    mackie: /mackie/i,
    autotune: /auto-?tune/i,
    melodyne: /melodyne/i,
    dbx902: /dbx ?902/i,
    smartc2: /smart ?c2\b|\bc2 comp/i,
    hg2: /hg-?2|black box/i,
    l2: /\bl2\b|ultramaximizer/i,
    elysia: /elysia alpha|alpha master/i,
    smc2b: /smc ?2b/i,
    mla4: /mla-?4/i,
    portico: /portico/i,
    curve: /curve ?bender/i,
    ocl2: /ocl-?2/i,
    knoll: /knoll/i,
    fatso: /fatso/i,
    rat: /\brat\b|\bds-?1\b|opamp-?21/i,
    bd2: /bd-?2|blues driver/i,
    overdrive: /overdrive|screamer|yellowdrive|\bod-?\d/i,
    oxford: /oxford eq/i,
    cello: /cello|palette eq/i,
    twobus: /2-?bus\+?/i,
    proq: /pro-?q/i,
    proL2: /pro-?l ?2/i,
    decap: /decapitator/i,
    ozoneImager: /ozone \d+ imager/i,
    sslGMaster: /ssl g-?master|ssl g bus|g ?bus comp|townhouse/i,
    vtm: /virtual tape|vtm|tape machine/i,
  };

  /** Comparable kinds, for when the library has no emulation of the original. */
  const K = {
    fast: /1176|\b76\b|\bfet\b|distressor|pro-?c|vca|black 76|fet-?76/i,
    opto: /la-?2a|la-?3a|opto|\b2a\b|cl ?1b|teletronix|white 2a|tube-?sta|leveler/i,
    tubeComp: /fairchild|\b670\b|vari-?mu|dyna-?mu|tube|vc-?670|tube-?sta/i,
    vca: /dbx|vca|\b16[05]\b|ssl|bus|glue|api/i,
    bus: /\bssl\b|bus|glue|\bvca\b|api ?2500|g-?comp|shadow hills|fairchild|\b670\b|townhouse|33609/i,
    pre: /neve|1073|1084|eq-?73|pre 1973|88rs|610|tube|avalon|v76|console|british|channel/i,
    console: /console|ssl|neve|api|amek|british|channel strip|focusrite/i,
    vintageEq: /pultec|eqp|\beq-?p[abg]\b|tube|1073|neve|api|passive|vintage|maag|88rs|sie-?q|eq-?73|sitral/i,
    air: /maag|\bair\b|sie-?q|pultec|eqp|gml|bax|pro-?q/i,
    precise: /pro-?q|linear|precision|parametric|digital|ozone \d+ equalizer|bx_digital|kirchhoff/i,
    masterEq: /bax|eq-?432|weiss eq|master|linear|pro-?q|kirchhoff|museq|bx_digital|ozone \d+ (vintage )?eq/i,
    passive: /massive passive|manley|passive|eq-?pa|maag|bx_2098|kirchhoff|pultec/i,
    plate: /plate|emt|140|\b250\b/i,
    hall: /hall|lexicon|480|lx-?24|vintageverb|valhalla|supermassive|pro-?r|cathedral|space/i,
    room: /room|chamber|ambien|studio|stone/i,
    spring: /spring/i,
    tapeEcho: /re-?201|tape-?201|galaxy|tape echo|space echo|echoboy|capistan|timeless|\bdig\b|delay lab/i,
    digiDelay: /digital|bx_delay2500|primaltap|brigade|timeless|\bdig\b|echoboy/i,
    tape: /tape|studer|a800|ampex|atr|j-?37|kiss of shame|teac|tascam|mello-?fi/i,
    tubeSat: /tube|culture|radiator|satur|decapitator|warm|karacter|inflator|magma/i,
    desk: /tascam|console|388|porta|radiator|decapitator|neold|magma/i,
    dist: /distort|drive|decapitator|devil|fuzz|dist|\brat\b|ds-?1|metal|screamer/i,
    amp: /\bamp|sansamp|plexi|rocker|bass one|marshall|ampeg/i,
    lofi: /lo-?fi|sp950|decimort|\bbit|vinyl|mello-?fi|dust|crush|redoptor|samplex/i,
    pitch: /h3000|microshift|harmoni|pitch|alterboy|shift|voices|backer/i,
    micro: /microshift|h3000|dimension|doubler|chorus/i,
    filter: /filter|volcano|filtron|filterfreak|ms-?20|m12|mini|moog/i,
    envFilter: /envelope|filterfreak|wah|mu-?tron|volcano|moog/i,
    phaser: /phas|bi-?tron|fazortan|godfazer|mistress/i,
    flanger: /flang|phas|bi-?tron|mistress|ubermod|spacemodulator/i,
    chorus: /chorus|dimension|jun-?6|ensemble|syntorus|bluechorus/i,
    limiter: /pro-?l|limit|maximi|\bl2\b|elevate/i,
    clipper: /clip/i,
    mb: /multi|pro-?mb|\bmb\b|dynamics|smc/i,
    width: /imager|stereo|width|stereomaker|spread|panman/i,
    monoBass: /mono|low end|bass control|imager|stereo/i,
    pump: /3630|pump|duck|shaperbox|midishaper|trackspacer|volume|vca/i,
    tune: /auto-?tune|melodyne|nectar \d+ pitch|alterboy/i,
    deess: /de-?ess|pro-?ds|esser/i,
    gate: /pro-?g|gate/i,
    reverse: /inverse|reverse|bloom|space delay/i,
    crushComp: /devil-?loc|smack|british|fet|1176/i,
    meter: /youlean|loudness|meter|span|insight/i,
  };

  /** A slot: role, label shown on it, the original device (regex or null), comparable kind, extras. */
  const s = (role, label, device, prefer, more = {}) => ({ role, label, ...(device ? { device } : {}), ...(prefer ? { prefer } : {}), ...more });
  const unchecked = x => `${x} – as given in the imported list, not checked`;
  const add = (id, rubric, also, name, desc, src, slots) => T.push({ id, rubric, also, name, desc, src, slots });
  const famous = (n, rubric, genres, name, desc, src, slots) => add('fam-' + String(n).padStart(3, '0'), rubric, ['famous', ...genres], name, desc, src, slots);
  /** Not part of a documented mastering chain, offered for streaming delivery. */
  const finalLimiter = () => s('limiter', 'Limiter (not in the original chain)', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], opt: .5, tip: 'Not in the documented chain: ceiling −1 dBTP for streaming.' });

  // Recurring modules
  const neve = (label = 'Neve 1073 preamp', tip = 'Neve preamp and EQ colour at the input.') => s('preamp', label, D.neve, K.pre, { macros: ['Drive'], tip });
  const ssl = (label = 'SSL 4000 channel', tip = 'Gain staging through the SSL channel.') => s('preamp', label, D.ssl, K.console, { macros: ['Drive'], tip });
  const cl1b = (tip = 'Tube-Tech CL 1B: smooth opto compression.') => s('comp', 'Tube-Tech CL 1B', D.cl1b, K.opto, { macros: ['Thresh'], tip });
  const la2a = tip => s('comp', 'Teletronix LA-2A', D.la2a, K.opto, { macros: ['Thresh'], tip });
  const u1176 = (tip, more = {}) => s('comp', 'Urei 1176', D.u1176, K.fast, { macros: ['Thresh'], tip, ...more });
  const fairchild = (label, tip, more = {}) => s('comp', label, D.fairchild, K.tubeComp, { macros: ['Thresh'], tip, ...more });
  const dbx = (label, tip, more = {}) => s('comp', label, D.dbx, K.vca, { macros: ['Thresh'], tip, ...more });
  const distressor = (tip, more = {}) => s('comp', 'Empirical Labs Distressor', D.distressor, K.fast, { macros: ['Thresh'], tip, ...more });
  const pultec = (tip, macros = ['Low', 'High']) => s('eq', 'Pultec EQP-1A', D.pultec, K.vintageEq, { macros, tip });
  const spaceEcho = (tip, more = {}) => s('delay', 'Roland RE-201 Space Echo', D.re201, K.tapeEcho, { set: { Mix: [20, '%'] }, macros: ['Mix', 'Feedback'], tip, ...more });
  const h3000 = tip => s('pitch', 'Eventide H3000', D.h3000, K.micro, { set: { Mix: [25, '%'] }, macros: ['Mix', 'Detune'], tip });
  const mackie = (label, tip) => s('sat', label, D.mackie, K.desk, { macros: ['Drive'], tip });
  const culture = (tip, more = {}) => s('sat', 'Thermionic Culture Vulture', D.culture, K.tubeSat, { macros: ['Drive', 'Mix'], tip, ...more });
  const massive = tip => s('eq', 'Manley Massive Passive', D.massive, K.passive, { macros: ['Low', 'High'], tip });
  const weissLimiter = (tip, more = {}) => s('limiter', 'Weiss DS1-MK3', D.weissDS1, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip, ...more });
  const sontec = (tip, macros = ['Low', 'High']) => s('eq', 'Sontec EQ', D.sontec, K.masterEq, { macros, tip });
  const maselec = () => s('eq', 'Maselec MEA-2', D.maselec, K.masterEq, { macros: ['Low', 'High'], tip: 'Mastering EQ, small moves.' });
  const vari = tip => s('comp', 'Manley Variable-Mu', D.vari, K.tubeComp, { macros: ['Thresh'], tip });
  const smc2b = tip => s('multiband', 'Tube-Tech SMC 2B', D.smc2b, K.mb, { macros: ['Depth'], tip });

  /* ======================= Part 1: Vocals (Pop, Hip-Hop, R&B, Soul) ======================= */
  famous(1, 'vocals', ['pop'], 'Michael Jackson – Thriller',
    'Shure SM7 → Neve 1084 → Urei 1176 (Bruce Swedien). No de-esser.',
    'In the Studio with Michael Jackson (book); the SM7 → Neve 1084 → 1176 chain is confirmed by Sweetwater – the settings are not documented there',
    [neve('Neve 1084 preamp/EQ'), u1176('Ratio 4:1, about 3 dB of gain reduction – set it on the macro.', { set: { Ratio: [4, ''] } })]);
  famous(2, 'vocals', ['hiphop', 'rnb'], 'Drake – Take Care / Views',
    'Sony C800G → Neve 1073 → Tube-Tech CL 1B (Noah "40" Shebib).',
    unchecked('Sound On Sound (Inside Track)') + '; Mix magazine documents an LA-2A used lightly on Take Care',
    [neve(), s('comp', 'Tube-Tech CL 1B', D.cl1b, K.opto, { set: { Ratio: [3.5, ''] }, macros: ['Thresh', 'Ratio', 'Attack'], tip: 'Ratio 3–4:1, attack around 12 o’clock, release auto, 4–5 dB of gain reduction.' })]);
  famous(3, 'vocals', ['pop', 'rnb'], 'Rihanna – Umbrella / Diamonds',
    'Sony C800G → Neve 1073 → Tube-Tech CL 1B → Avalon VT-737sp (Kuk Harrell).',
    unchecked('Mix With The Masters / Sound On Sound'),
    [neve(), cl1b('Catches the peaks.'), s('preamp', 'Avalon VT-737sp', D.avalon, K.pre, { macros: ['High'], tip: 'A gentle high-shelf lift.' })]);
  famous(4, 'vocals', ['pop', 'rnb'], 'Adele – Rolling in the Deep',
    'Coles 4038 → Neve 1073 → Fairchild 660 → dbx 160 in parallel (Tom Elmhirst).',
    unchecked('Sound On Sound (Inside Track)'),
    [neve(), fairchild('Fairchild 660', 'Gentle compression.'),
      dbx('dbx 160 – parallel', 'Squashed hard and blended in parallel: the Mix macro sets the blend.', { set: { Mix: [35, '%'] }, macros: ['Thresh', 'Mix'] })]);
  famous(5, 'vocals', ['pop'], 'Billie Eilish – Bad Guy',
    'Neumann TLM 103 → Neve 1073 preamp (UA Apollo) → LA-2A-style compression (Waves CLA-2A) → high boost (Finneas O’Connell; mixed by Rob Kinelski). The AT2020 was on her early songs.',
    'Sound On Sound (Inside Track: Bad Guy); microphone corrected to the Neumann TLM 103 (Mix, MusicRadar) – the AT2020 in the list was on earlier songs',
    [neve(), la2a('3–5 dB of gain reduction.'), s('eq', 'High boost', null, K.air, { macros: ['High'], tip: 'A lift in the highs.' })]);
  famous(6, 'vocals', ['hiphop'], 'Eminem – The Marshall Mathers LP',
    'Shure SM7B → Neve 1073 → Empirical Labs Distressor (Dr. Dre / Richard Segal Huredia).',
    unchecked('Scratch Magazine / Tape Op'),
    [neve(), distressor('Ratio 6:1, "Dist 2" mode on (a switch on the plugin), threshold set to the level.', { set: { Ratio: [6, ''] } })]);
  famous(7, 'vocals', ['rnb', 'pop'], 'Amy Winehouse – Back to Black',
    'Lead vocal mix chain (Tom Elmhirst): Pultec EQ → Urei 1176 → Fairchild. The list’s tracking chain (RCA 44BX → Altec 1567A tube mixer → RCA BA-6A) is kept as an optional first module.',
    'Sound On Sound (Secrets Of The Mix Engineers: Tom Elmhirst) for the mix chain; the tracking chain from the list is not confirmed',
    [s('sat', 'Altec 1567A tube mixer', D.radiator, K.tubeSat, { macros: ['Drive'], opt: .6, tip: 'From the list: the tube preamps driven slightly.' }),
      pultec('Shape before compression.'), u1176('Catches the peaks.'),
      fairchild('Fairchild (RCA BA-6A in the list)', 'Dense tube compression.')]);
  famous(8, 'vocals', ['electronic', 'pop'], 'Daft Punk – Get Lucky (Vocals)',
    'Neumann U47 → Neve 1073 → Teletronix LA-2A → GML 8200 (Mick Guzauski).',
    unchecked('Sound On Sound (Inside Track)'),
    [neve(), la2a('3–4 dB of gain reduction.'), s('eq', 'GML 8200', D.gml, K.air, { macros: ['High'], tip: 'A fine lift around 10–12 kHz.' })]);
  famous(9, 'vocals', ['hiphop'], 'Kendrick Lamar – DAMN.',
    'Sony C800G → Neve 1073 → Tube-Tech CL 1B → SSL channel (Waves) (Derek "MixedByAli" Ali).',
    unchecked('Mix With The Masters'),
    [neve(), cl1b(), s('eq', 'SSL channel EQ', D.ssl, K.console, { macros: ['HPF', 'Presence'], tip: 'High-pass around 100 Hz, presence lift between 3 and 5 kHz.' })]);
  famous(10, 'vocals', ['rnb', 'pop'], 'Beyoncé – Crazy in Love',
    'Neumann U47 → Neve 1073 → Urei 1176 → Teletronix LA-2A (Tony Maserati).',
    unchecked('Sound On Sound / Puremix'),
    [neve(), u1176('Ratio 4:1 for the peaks.', { set: { Ratio: [4, ''] } }), la2a('About 3 dB to smooth.')]);
  famous(11, 'vocals', ['rnb'], 'Frank Ocean – Blonde',
    'Sony C800G → Neve 1073 → Teletronix LA-2A (Om’Mas Keith / Malay). Very dry, hardly any reverb.',
    unchecked('Tape Op / studio interviews'),
    [neve(), la2a('Compression to the dynamics of the take – no reverb after it.')]);
  famous(12, 'vocals', ['pop', 'rnb'], 'The Weeknd – Blinding Lights',
    'Neumann U87 → Neve 1073 → Tube-Tech CL 1B → Eventide H3000 (Serban Ghenea / Illangelo).',
    unchecked('Sound On Sound (Inside Track)'),
    [neve(), cl1b(), h3000('Micro pitch shift blended into the chorus.')]);
  famous(13, 'vocals', ['hiphop'], 'Tupac Shakur – All Eyez on Me',
    'Sony C800G → SSL 4000 G console → Urei 1176 (Dave Aron).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [ssl('SSL 4000 G channel'), u1176('Ratio 8:1, fast attack and release, threshold set to the rap level.', { set: { Ratio: [8, ''] } })]);
  famous(14, 'vocals', ['pop'], 'Dua Lipa – Don’t Start Now',
    'Telefunken ELA M 251 → Neve 1073 → Tube-Tech CL 1B → Maag EQ4 (Josh Gudwin).',
    unchecked('Mix With The Masters'),
    [neve(), cl1b(), s('eq', 'Maag EQ4 – Air Band', D.maag, K.air, { macros: ['High'], tip: 'Air band at 20 kHz lifted.' })]);
  famous(15, 'vocals', ['hiphop'], 'Travis Scott – Sicko Mode',
    'Sony C800G → Neve 1073 → Tube-Tech CL 1B → Antares Auto-Tune (Mike Dean).',
    unchecked('Sound On Sound / live streams'),
    [neve(), cl1b('Moderate gain reduction.'), s('tune', 'Antares Auto-Tune', D.autotune, K.tune, { set: { Retune: [3, 'ms'] }, macros: ['Retune'], tip: 'Retune speed 0–5 ms.' })]);
  famous(16, 'vocals', ['pop', 'rnb'], 'Whitney Houston – I Will Always Love You',
    'Telefunken ELA M 251 → Neve 1073 → Urei 1176 → Lexicon 480L (David Foster / Humberto Gatica).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [neve(), u1176('Ratio 4:1.', { set: { Ratio: [4, ''] } }),
      s('reverb', 'Lexicon 480L – plate', D.lex480, K.plate, { set: { Mix: [20, '%'] }, macros: ['Mix', 'Decay'], tip: 'Plate program blended in.' })]);
  famous(17, 'vocals', ['hiphop'], 'Kanye West – My Beautiful Dark Twisted Fantasy',
    'Sony C800G → Avalon VT-737sp → Empirical Labs Distressor (Mike Dean / Anthony Kilhoffer).',
    unchecked('Complex / Sound On Sound'),
    [s('preamp', 'Avalon VT-737sp', D.avalon, K.pre, { macros: ['Drive'], tip: 'Tube preamp, compressor and EQ.' }),
      distressor('Driven hard for deliberate harmonic distortion.', { macros: ['Thresh', 'Output'] })]);
  famous(18, 'vocals', ['pop'], 'Lady Gaga – Bad Romance',
    'Telefunken U47 → Neve 1073 → Urei 1176 → SansAmp PSA-1 in parallel (Dave Russell / Mark "Spike" Stent).',
    unchecked('Sound On Sound (Inside Track)'),
    [neve(), u1176('Peak control.'),
      s('dist', 'SansAmp PSA-1 – parallel', D.sansamp, K.amp, { set: { Mix: [30, '%'] }, macros: ['Mix', 'Drive'], tip: 'On its own bus for mid-range grit – the Mix macro blends it in.' })]);
  famous(19, 'vocals', ['rnb'], 'SZA – SOS',
    'Sony C800G → Neve 1073 → Tube-Tech CL 1B (Carter Lang / Rob Bisel). The same chain on the doubles.',
    unchecked('Sound On Sound (Inside Track)'),
    [neve(), cl1b('3–5 dB of gain reduction; use the same rack on the doubled takes.')]);
  famous(20, 'vocals', ['hiphop', 'pop'], 'Post Malone – Rockstar',
    'Melodyne for intonation, then Sony C800G → Neve 1073 → Tube-Tech CL 1B (Louis Bell).',
    unchecked('Billboard / Sound On Sound'),
    [s('tune', 'Melodyne', D.melodyne, K.tune, { macros: ['Retune'], tip: 'Intonation first, compression after it.' }), neve(), cl1b()]);
  famous(21, 'vocals', ['pop', 'rnb'], 'Ariana Grande – Thank U, Next',
    'Sony C800G → Neve 1073 → Avalon VT-737sp → dbx 902 de-esser (Serban Ghenea / Tommy Brown).',
    unchecked('Sound On Sound'),
    [neve(), s('preamp', 'Avalon VT-737sp', D.avalon, K.pre, { macros: ['Drive'], tip: 'Tube strip.' }),
      s('deess', 'dbx 902 de-esser', D.dbx902, K.deess, { macros: ['Thresh'], tip: 'Sibilance down as needed.' })]);
  famous(22, 'vocals', ['hiphop'], 'Jay-Z – The Black Album',
    'Sony C800G → SSL 4000 G+ → Urei 1176 → dbx 160X (Young Guru).',
    unchecked('Red Bull Music Academy / Tape Op'),
    [ssl('SSL 4000 G+ channel'), u1176('About 2–3 dB.'), dbx('dbx 160X', 'Another 2–3 dB, in series.')]);
  famous(23, 'vocals', ['pop', 'indie'], 'Lana Del Rey – Video Games',
    'Neumann U47 → Telefunken V76 → Fairchild 660 → Roland RE-201 Space Echo (Justin Parker / Dan Heath).',
    unchecked('Sound On Sound'),
    [s('preamp', 'Telefunken V76', D.v76, K.pre, { macros: ['Drive'], tip: 'Tube preamp.' }), fairchild('Fairchild 660', 'Gentle tube compression.'),
      spaceEcho('Tape echo set to the mood of the song.'),
      s('reverb', 'Space Echo spring', null, K.spring, { set: { Mix: [15, '%'] }, macros: ['Mix'], opt: .5, tip: 'The RE-201’s spring reverb.' })]);
  famous(24, 'vocals', ['pop'], 'Justin Bieber – Sorry',
    'Telefunken ELA M 251 → Neve 1073 → Tube-Tech CL 1B, bright top end, de-essing as needed (Josh Gudwin).',
    unchecked('Mix With The Masters'),
    [neve(), cl1b(), s('eq', 'Bright top end', null, K.air, { macros: ['High'], tip: 'Bright high-end tuning.' }),
      s('deess', 'De-esser', null, K.deess, { macros: ['Thresh'], opt: .7, tip: 'As needed.' })]);
  famous(25, 'vocals', ['hiphop', 'pop'], 'OutKast – Hey Ya!',
    'Neumann U87 → Neve 1073 → Empirical Labs Distressor → Eventide H3000 (Neal H Pogue).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [neve(), distressor('Ratio 10:1 or "Nuke" (a switch on the plugin).', { set: { Ratio: [10, ''] } }), h3000('H3000 for width.')]);

  /* ======================= Part 2: Drums & Percussion ======================= */
  famous(26, 'drums', ['electronic'], 'Daft Punk – Homework (Drums)',
    'Roland TR-909 → Mackie CR-1604 (trim fully up, clipping) → Alesis 3630 sidechain compression (Thomas Bangalter).',
    'Mixmag / Sound On Sound; the duo named the Alesis 3630 their main compressor on Homework (2001 interview, via Mix) – the Mackie comes from secondary sources',
    [mackie('Mackie CR-1604 – trim clipping', 'Trim fully up: the desk clips.'),
      s('comp', 'Alesis 3630 – pumping', D.alesis, K.pump, { set: { Ratio: [8, ''] }, macros: ['Thresh', 'Release'], tip: 'Sidechain pumping (8:1 or more is often quoted) – set the sidechain to the kick in the plugin.' })]);
  famous(27, 'drums', ['pop', 'indie'], 'Phil Collins – In The Air Tonight',
    'Room mics → SSL 4000 E listen-mic compressor (hard-wired, extreme) → noise gates (Hugh Padgham). The AMS RMX16 "NonLin 2" program came a little later as the digital version of this sound.',
    'Sound On Sound (Classic Tracks); corrected via Wikipedia "Gated reverb", MusicRadar and Sweetwater: in 1980 the sound came from the listen-mic compressor and gates',
    [s('comp', 'SSL listen-mic compressor', null, K.crushComp, { set: { Ratio: [20, ''] }, macros: ['Thresh', 'Mix'], tip: 'Extreme, fixed compression on the room sound.' }),
      s('gate', 'Noise gate', null, K.gate, { macros: ['Thresh', 'Release'], tip: 'Cuts the squashed room off abruptly – the gated sound.' }),
      s('reverb', 'AMS RMX16 "NonLin 2"', D.nonlin, K.room, { set: { Decay: [0.9, 's'] }, macros: ['Decay', 'Mix'], opt: .7, tip: 'Decay about 0.8–1.0 s.' })]);
  famous(28, 'drums', ['hiphop'], 'J Dilla – Donuts (Drums)',
    'Akai MPC3000 → Boss SP-303 vinyl sim (J Dilla).',
    unchecked('Dilla Time (book)'),
    [s('crush', 'Akai MPC3000', D.mpc, K.lofi, { macros: ['Crush'], opt: .7, tip: 'The sampler’s grit.' }),
      s('tape', 'Boss SP-303 Vinyl Sim', D.sp303, K.lofi, { macros: ['Drive', 'Noise'], tip: 'The built-in vinyl sim compressor turned up hard.' })]);
  famous(29, 'drums', ['hiphop'], 'Dr. Dre – 2001 (Drums)',
    'Akai MPC3000 → SSL 4000 G+ → Neve 1073 / Pultec EQP-1A (Dr. Dre / Mauricio Iragorri).',
    unchecked('Scratch Magazine'),
    [ssl('SSL 4000 G+ preamp', 'Hot gain staging through the SSL preamps.'), neve('Neve 1073', 'Colour.'), pultec('Pultec sub-bass boost.', ['Low'])]);
  famous(30, 'drums', ['electronic'], 'Jeff Mills – The Bells (909 Kick)',
    'Roland TR-909 → Mackie 1604 → Roland RE-201 Space Echo (Jeff Mills).',
    unchecked('Resident Advisor / Future Music'),
    [mackie('Mackie 1604 – driven inputs', 'The desk inputs overdriven.'), spaceEcho('Echo amount as needed.', { set: { Mix: [15, '%'] } })]);
  famous(31, 'drums', ['pop', 'hiphop'], 'Timbaland – SexyBack (Drums)',
    'Akai MPC3000 → SSL 4000 E → Empirical Labs Distressor (Jimmy Douglass).',
    unchecked('Sound On Sound (Inside Track)'),
    [ssl('SSL 4000 E channel'), distressor('Slow attack (about 6–7) and fast release (about 2) on the Distressor’s scale.', { set: { Attack: [6.5, ''], Release: [2, ''] }, macros: ['Attack', 'Release', 'Thresh'] })]);
  famous(32, 'drums', ['electronic'], 'Richie Hawtin – Plastikman',
    'Roland TR-909 / TR-808 → Mackie CR-1604 → Sherman Filterbank (Richie Hawtin).',
    unchecked('Sound On Sound / Groove'),
    [mackie('Mackie CR-1604', 'Desk drive.'), s('filter', 'Sherman Filterbank', D.sherman, K.filter, { macros: ['Drive', 'Cutoff', 'Reso'], tip: 'Drive and resonant filters played live.' })]);
  famous(33, 'drums', ['hiphop'], 'The Neptunes – Grindin’',
    'Ensoniq ASR-10 → SSL 4000 G+ → dbx 160X (Andrew Coleman).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('crush', 'Ensoniq ASR-10', D.asr, K.lofi, { macros: ['Crush'], opt: .5, tip: 'Sampler character.' }), ssl('SSL 4000 G+ channel'),
      dbx('dbx 160X', 'Heavy compression on kick and snare for hard transients.')]);
  famous(34, 'drums', ['electronic'], 'Aphex Twin – Windowlicker',
    'Custom sampler → Roland Space Echo → Lexicon PCM70 (Richard D. James). No fixed settings documented; echo feedback and reverb decay heavily automated.',
    unchecked('Sound On Sound / Future Music'),
    [spaceEcho('Echo feedback – automate it.', { macros: ['Feedback', 'Mix'] }), s('reverb', 'Lexicon PCM70', D.pcm, K.hall, { macros: ['Decay', 'Mix'], tip: 'Reverb decay – automate it.' })]);
  famous(35, 'drums', ['hiphop'], 'Kanye West – 808s & Heartbreak',
    'Roland TR-808 → Neve 1073 → Empirical Labs Distressor (Anthony Kilhoffer / Mike Dean).',
    unchecked('Sound On Sound'),
    [neve(), distressor('"Dist 3" mode for harmonics on the 808 (a switch on the plugin).', { macros: ['Thresh', 'Output'] })]);
  famous(36, 'drums', ['electronic'], 'Carl Cox – Techno Rumble',
    'Roland TR-909 → Allen & Heath Xone → Boss overdrive pedals on an aux send, mixed under the kick (Carl Cox).',
    unchecked('Future Music'),
    [s('dist', 'Boss overdrive – on a send', D.overdrive, K.dist, { set: { Mix: [30, '%'] }, macros: ['Drive', 'Mix'], tip: 'The send into a guitar overdrive, mixed in under the kick as rumble.' })]);
  famous(37, 'drums', ['pop'], 'Madonna – Vogue (Drums)',
    'Akai S1000 → SSL 4000 E → Lexicon 480L (Shep Pettibone / Goh Hotoda).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [s('eq', 'SSL 4000 E EQ', D.ssl, K.console, { macros: ['High'], tip: 'A clear high boost between 8 and 10 kHz.' }),
      s('reverb', 'Lexicon 480L', D.lex480, K.hall, { macros: ['Mix', 'Decay'], tip: 'Lexicon space.' })]);
  famous(38, 'drums', ['hiphop'], 'DJ Premier – Mass Appeal',
    'Akai MPC60 (12-bit) → Neve / SSL console → Urei 1176 (DJ Premier).',
    unchecked('Scratch Magazine / Tape Op'),
    [s('crush', 'Akai MPC60 – 12-bit', /mpc ?60|sp950|sp-?1200/i, K.lofi, { macros: ['Crush'], tip: '12-bit sampling.' }),
      s('preamp', 'Neve / SSL console', null, K.console, { macros: ['Drive'], opt: .6, tip: 'Console colour.' }), u1176('Compression to thicken the loop.')]);
  famous(39, 'drums', ['electronic'], 'Chemical Brothers – Block Rockin’ Beats',
    'Akai S3000XL → Mackie 32-8 (overdriven) → Empirical Labs Distressor in "Nuke" (Tom Rowlands / Ed Simons).',
    unchecked('Sound On Sound'),
    [mackie('Mackie 32-8 – overdriven preamps', 'Preamps overdriven.'), distressor('"Nuke" mode – brickwall (a switch on the plugin).', { macros: ['Thresh', 'Output'] })]);
  famous(40, 'drums', ['pop'], 'Michael Jackson – Billie Jean (Kick)',
    'Neumann U47 FET → Neve 1084 → Urei 1176 (Bruce Swedien). A very dry room, no artificial reverb.',
    unchecked('In the Studio with Michael Jackson (book)'),
    [neve('Neve 1084 preamp/EQ'), u1176('Light compression – and no reverb after it.')]);
  famous(41, 'drums', ['electronic'], 'Underworld – Born Slippy',
    'Roland TR-909 → Soundcraft desk → Alesis Midiverb II (Rick Smith).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [s('sat', 'Soundcraft desk', null, K.desk, { macros: ['Drive'], opt: .6, tip: 'Desk colour.' }),
      s('reverb', 'Alesis Midiverb II – bloom/reverse', D.midiverb, K.reverse, { macros: ['Mix', 'Decay'], tip: 'Bloom and reverse programs blended in.' })]);
  famous(42, 'drums', ['hiphop'], 'Wu-Tang Clan – C.R.E.A.M.',
    'E-mu SP-1200 → Ensoniq ASR-10 → Tascam Portastudio (RZA).',
    unchecked('The Wu-Tang Manual (book)'),
    [s('crush', 'E-mu SP-1200', D.sp1200, K.lofi, { macros: ['Crush'], tip: 'Samples recorded pitched up and played back down – the grainy 12-bit sound.' }),
      s('tape', 'Tascam Portastudio', D.tascam, K.tape, { macros: ['Drive', 'Wow'], tip: 'Cassette four-track.' })]);
  famous(43, 'drums', ['electronic'], 'Ben Klock – Techno Kick',
    'Roland TR-909 → SSL EQ → Thermionic Culture Vulture in triode mode (Ben Klock).',
    unchecked('Resident Advisor / Electronic Beats'),
    [s('eq', 'SSL EQ', D.ssl, K.console, { macros: ['Low'], tip: 'Shape the kick.' }), culture('Triode mode for warm saturation on the kick.')]);
  famous(44, 'drums', ['pop', 'rnb'], 'Bruno Mars – Uptown Funk',
    'Vintage Ludwig drums → RCA 77DX → Helios console → Fairchild 670 on the drum bus (Serban Ghenea / Boo Mitchell).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('preamp', 'Helios console', D.helios, K.console, { macros: ['Drive'], tip: 'Console colour.' }), fairchild('Fairchild 670', 'Gentle tube compression on the drum bus.')]);
  famous(45, 'drums', ['hiphop'], 'Metro Boomin – Trap 808',
    'FL Studio → Neve 1073 → Tube-Tech CL 1B → soft clipper (Metro Boomin / Ethan Stevens).',
    unchecked('Complex / Sound On Sound'),
    [neve(), cl1b(), s('clipper', 'Soft clipper', null, K.clipper, { macros: ['Thresh'], tip: 'Last: clips the transients for maximum loudness.' })]);
  famous(46, 'drums', ['electronic'], 'The Prodigy – Firestarter',
    'Roland W-30 → Mackie 32-8 → dbx 160X → Tech 21 SansAmp in parallel (Liam Howlett).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [mackie('Mackie 32-8', 'Desk drive.'), dbx('dbx 160X', 'Punch.'),
      s('dist', 'SansAmp – parallel', D.sansamp, K.amp, { set: { Mix: [35, '%'] }, macros: ['Mix', 'Drive'], tip: 'Blended in parallel with the dry break.' })]);
  famous(47, 'drums', ['pop', 'rnb'], 'Prince – When Doves Cry',
    'LinnDrum LM-1 → API console → Eventide H910 Harmonizer (Prince / Peggy McCreary).',
    unchecked('Tape Op / Sound On Sound'),
    [s('preamp', 'API console', D.api, K.console, { macros: ['Drive'], tip: 'Console colour.' }),
      s('pitch', 'Eventide H910 Harmonizer', D.h910, K.pitch, { set: { Mix: [30, '%'] }, macros: ['Pitch', 'Mix'], tip: 'A slight pitch shift for the metallic snare.' })]);
  famous(48, 'drums', ['electronic'], 'Four Tet – Electronic Drums',
    'Custom samples → Manley Variable-Mu → Thermionic Culture Vulture (Kieran Hebden). No exact numbers documented.',
    unchecked('Sound On Sound / Future Music'),
    [vari('Fine compression.'), culture('Fine saturation.')]);
  famous(49, 'drums', ['electronic', 'hiphop'], 'Kaytranada – Bounce Drums',
    'Ableton Live → Roland SP-404SX → API 2500 (Kaytranada).',
    unchecked('Red Bull Music Academy'),
    [s('crush', 'Roland SP-404SX', D.sp303, K.lofi, { macros: ['Crush', 'Mix'], tip: 'Sampler colour.' }),
      s('comp', 'API 2500', D.api2500, K.bus, { set: { Attack: [30, 'ms'] }, macros: ['Attack', 'Thresh'], tip: 'Slow attack (about 30 ms) for the springy bounce.' })]);
  famous(50, 'perc', ['electronic'], 'Kraftwerk – Trans Europa Express',
    'Custom electronic percussion → Telefunken V76 → EMT 140 plate (Florian Schneider / Ralf Hütter).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [s('preamp', 'Telefunken V76', D.v76, K.pre, { macros: ['Drive'], tip: 'Tube preamp.' }),
      s('reverb', 'EMT 140 plate', D.emt140, K.plate, { macros: ['Decay', 'Mix'], tip: 'Plate time set per track.' })]);

  /* ======================= Part 3: Synths, Bass & Instruments ======================= */
  famous(51, 'bass', ['electronic'], 'Phuture – Acid Tracks (303)',
    'Roland TB-303 (cutoff, resonance and env mod turned live – on the synth) → Boss DS-1 / ProCo RAT → Roland Space Echo (DJ Pierre).',
    unchecked('Resident Advisor / Sound On Sound'),
    [s('filter', 'Filter sweep (the 303’s own is on the synth)', null, K.filter, { macros: ['Cutoff', 'Reso'], opt: .6, tip: 'For live cutoff and resonance in the rack.' }),
      s('dist', 'Boss DS-1 / ProCo RAT', D.rat, K.dist, { macros: ['Drive', 'Tone'], tip: 'Distortion after the 303.' }), spaceEcho('Echo.')]);
  famous(52, 'lead', ['hiphop'], 'Dr. Dre – G-Funk Lead',
    'Minimoog Model D (portamento on) → Neve 1073 → Teletronix LA-3A (Dr. Dre).',
    unchecked('Scratch Magazine'),
    [neve(), s('comp', 'Teletronix LA-3A', D.la3a, K.opto, { macros: ['Thresh'], tip: 'Keeps the level steady.' })]);
  famous(53, 'instr', ['dubtechno', 'electronic'], 'Basic Channel – Dub Techno',
    'Waldorf Microwave / Prophet-5 → Roland RE-201 → Mu-Tron Bi-Phase (Moritz von Oswald / Mark Ernestus).',
    unchecked('Groove / Resident Advisor') + '; I found no source that documents the duo’s gear',
    [spaceEcho('High feedback, just below self-oscillation.', { set: { Feedback: [70, '%'], Mix: [35, '%'] }, macros: ['Feedback', 'Mix', 'Time'] }),
      s('mod', 'Mu-Tron Bi-Phase', D.biphase, K.phaser, { macros: ['Rate', 'Feedback'], tip: 'Phasing over the echoes.' })]);
  famous(54, 'instr', ['electronic'], 'Daft Punk – Around the World',
    'Roland Juno-106 → Alesis 3630 (ducked by the kick) → dbx 160A (Thomas Bangalter).',
    unchecked('Sound On Sound'),
    [s('comp', 'Alesis 3630 – kick ducking', D.alesis, K.pump, { set: { Ratio: [8, ''] }, macros: ['Thresh', 'Release'], tip: 'Ducked by the kick – set the sidechain in the plugin.' }), dbx('dbx 160A', 'Level.')]);
  famous(55, 'instr', ['rnb', 'pop'], 'Nile Rodgers / Chic – Funk Guitar',
    'Fender Stratocaster → DI box → Neve 1073 → Urei 1176, no amp (Bob Clearmountain).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [neve(), u1176('Catches the fast pick attack.')]);
  famous(56, 'instr', ['rnb'], 'Stevie Wonder – Superstition',
    'Hohner Clavinet C → Mu-Tron III → Neve console → Urei 1176 (Malcolm Cecil / Robert Margouleff).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [s('filter', 'Mu-Tron III envelope filter', D.mutron, K.envFilter, { macros: ['LFO', 'Cutoff'], tip: 'Envelope sensitivity follows how hard you play.' }), neve('Neve console'), u1176('Peak control.')]);
  famous(57, 'instr', ['electronic'], 'Boards of Canada – Synth Pad',
    'Roland SH-101 / Yamaha CS-70 → Akai S1000 → Revox B77 tape (Marcus Eoin / Michael Sandison).',
    unchecked('Sound On Sound / Future Music'),
    [s('crush', 'Akai S1000', null, K.lofi, { macros: ['Crush'], opt: .5, tip: 'Sampler.' }),
      s('tape', 'Revox B77', D.revox, K.tape, { macros: ['Wow', 'Drive'], tip: 'Recorded to tape for analogue wow and flutter.' })]);
  famous(58, 'bass', ['indie'], 'Tame Impala – Psych Bass/Synth',
    'Rickenbacker bass → Boss BD-2 → Roland Space Echo → dbx 165A (Kevin Parker).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('dist', 'Boss BD-2 Blues Driver', D.bd2, K.dist, { macros: ['Drive'], tip: 'Drive.' }), spaceEcho('Space Echo as a fixed insert.'),
      dbx('dbx 165A', 'Heavy compression.')]);
  famous(59, 'lead', ['electronic'], 'Deadmau5 – Progressive Pluck',
    'Moog Voyager / Prophet-5 (short filter decay) → Neve 1073 → Lexicon 480L (Joel Zimmerman).',
    unchecked('Future Music / Masterclass'),
    [neve(), s('reverb', 'Lexicon 480L', D.lex480, K.hall, { set: { Mix: [30, '%'], Decay: [3.5, 's'] }, macros: ['Mix', 'Decay'], tip: 'A big Lexicon reverb blended in.' })]);
  famous(60, 'bass', ['pop'], 'Max Martin – Pop Synth Bass',
    'Access Virus TI / Serum → SSL EQ → FabFilter Pro-Q (Max Martin / Serban Ghenea).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('eq', 'SSL EQ', D.ssl, K.console, { macros: ['Low'], tip: 'Tone.' }),
      s('eq', 'FabFilter Pro-Q', D.proq, K.precise, { macros: ['HPF', 'Low'], tip: 'High-pass around 30 Hz, boost between 60 and 80 Hz.' })]);
  famous(61, 'instr', ['hiphop'], 'J Dilla – Soul/Rhodes Samples',
    'Fender Rhodes → Akai MPC3000 (low-pass down) → Boss SP-303 (J Dilla).',
    unchecked('Dilla Time (book)'),
    [s('filter', 'MPC low-pass', D.mpc, K.filter, { macros: ['Cutoff'], tip: 'Low-pass lowered for muffled warmth.' }),
      s('tape', 'Boss SP-303', D.sp303, K.lofi, { macros: ['Drive', 'Noise'], tip: 'Vinyl sim.' })]);
  famous(62, 'bass', ['electronic'], 'Plastikman – Minimal Acid',
    'Roland TB-303 → Roland SDE-3000 delay → Eventide H3000 (Richie Hawtin).',
    unchecked('Sound On Sound'),
    [s('filter', 'Filter sweep (the 303’s own is on the synth)', null, K.filter, { macros: ['Cutoff', 'Reso'], opt: .6, tip: 'For live cutoff and resonance in the rack.' }),
      s('delay', 'Roland SDE-3000', D.sde, K.digiDelay, { macros: ['Time', 'Feedback', 'Mix'], tip: 'Synced to the song tempo.' }), h3000('Pitch/width.')]);
  famous(63, 'instr', ['electronic'], 'Stranger Things – Theme',
    'Sequential Prophet-6 / Roland SH-2 → Strymon BigSky → tape (Kyle Dixon / Michael Stein). No exact settings documented.',
    unchecked('Tape Op / Sound On Sound'),
    [s('reverb', 'Strymon BigSky', D.bigsky, K.hall, { macros: ['Mix', 'Decay'], tip: 'Reverb amount.' }), s('tape', 'Tape', null, K.tape, { macros: ['Drive'], tip: 'Tape saturation.' })]);
  famous(64, 'instr', ['electronic'], 'Vangelis – Blade Runner',
    'Yamaha CS-80 → Lexicon 224 "Concert Hall", decay over 5 s (Vangelis).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [s('reverb', 'Lexicon 224 – Concert Hall', D.lex224, K.hall, { set: { Decay: [5.5, 's'], Mix: [35, '%'] }, macros: ['Decay', 'Mix'], tip: 'A long hall, over 5 seconds.' })]);
  famous(65, 'bass', ['rnb'], 'Thundercat – Funk E-Bass',
    'Ibanez 6-string bass → Moogerfooger MF-101 → Neve preamp (Flying Lotus / Thundercat).',
    unchecked('Tape Op'),
    [s('filter', 'Moogerfooger MF-101', D.mf101, K.envFilter, { macros: ['Cutoff', 'LFO'], tip: 'Low-pass driven by the playing dynamics.' }), neve('Neve preamp')]);
  famous(66, 'lead', ['electronic'], 'Jon Hopkins – Open Eye Signal',
    'Korg MS-20 → Sherman Filterbank 2 → Eventide Space (Jon Hopkins).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('filter', 'Sherman Filterbank 2', D.sherman, K.filter, { macros: ['Drive', 'Cutoff', 'Reso'], tip: 'The MS-20 distorted through the Sherman, cutoff played live.' }),
      s('reverb', 'Eventide Space', D.espace, K.hall, { macros: ['Mix', 'Decay'], tip: 'Space.' })]);
  famous(67, 'instr', ['rnb'], 'Frank Ocean – Nights (Guitar)',
    'Fender Stratocaster → Roland JC-120 (stereo chorus on) → Eventide H3000 (Malay).',
    unchecked('Sound On Sound'),
    [s('chorus', 'Roland JC-120 chorus', D.jc120, K.chorus, { macros: ['Mix', 'Depth'], tip: 'Its built-in stereo chorus.' }), h3000('Shimmer.')]);
  famous(68, 'bass', ['electronic'], 'Disclosure – UK Garage Bass',
    'Roland Juno-106 / NI Massive → API 550A → dbx 160A (Guy & Howard Lawrence).',
    unchecked('Future Music'),
    [s('eq', 'API 550A', D.api, K.vintageEq, { macros: ['Presence'], tip: 'Mid boost between 800 Hz and 1.5 kHz.' }), dbx('dbx 160A', 'Level.')]);
  famous(69, 'instr', ['electronic', 'hiphop'], 'Herbie Hancock – Rockit',
    'Fairlight CMI → Oberheim DMX → Lexicon Prime Time (Bill Laswell / Martin Bisi).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [s('crush', 'Fairlight CMI', null, K.lofi, { macros: ['Crush'], opt: .5, tip: '8-bit sampler grit.' }),
      s('delay', 'Lexicon Prime Time', D.primetime, K.digiDelay, { set: { Mix: [25, '%'] }, macros: ['Time', 'Mix'], tip: 'Short echo times for rhythmic doubling.' })]);
  famous(70, 'vocals', ['indie'], 'Bon Iver – 22, A Million',
    'Eventide H8000 + Antares Harmony Engine, the "Messina" (Chris Messina / Justin Vernon).',
    unchecked('Tape Op / Sound On Sound'),
    [s('pitch', 'Harmonizer (H8000 / Harmony Engine)', D.harmony, /harmoni|voices|backer|vocalsynth|h3000|pitch/i, { macros: ['Mix', 'Pitch'], tip: 'A real-time harmonizer turns the voice into chords (most need MIDI notes).' })]);
  famous(71, 'bass', ['electronic'], 'Justice – D.A.N.C.E. (Bass)',
    'Korg MS-20 → Marshall JCM800 guitar amp → Alesis 3630 (Gaspard Augé / Xavier de Rosnay).',
    unchecked('Sound On Sound'),
    [s('amp', 'Marshall JCM800', D.jcm, K.amp, { macros: ['Gain', 'Tone'], tip: 'The MS-20 through a guitar amp.' }),
      s('comp', 'Alesis 3630', D.alesis, K.vca, { macros: ['Thresh'], tip: 'Compression.' })]);
  famous(72, 'instr', ['rnb'], 'Alicia Keys – Fallin’ (Piano)',
    'Yamaha C7 grand → Neumann U87 → Neve 1073 → Fairchild 670 (Kerry "Krucial" Brothers).',
    unchecked('Sound On Sound'),
    [neve(), fairchild('Fairchild 670', '2–3 dB for dense warmth.')]);
  famous(73, 'instr', ['electronic'], 'Bicep – Glue (Synth)',
    'Roland Juno-106 → Strymon Deco → OTO Bam reverb (Matt McBriar / Andy Ferguson).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('tape', 'Strymon Deco', D.deco, K.tape, { macros: ['Drive', 'Wow'], tip: 'Tape saturation and wobble by ear.' }),
      s('reverb', 'OTO Bam', D.bam, K.hall, { macros: ['Mix', 'Decay'], tip: 'Lush digital reverb.' })]);
  famous(74, 'lead', ['hiphop'], 'Tyler, The Creator – IGOR',
    'Moog Subsequent 37 → Neve 1073 → Thermionic Culture Vulture (Tyler Okonma / Vic Wainstein).',
    unchecked('Mix With The Masters'),
    [neve(), culture('Driven hard for deliberate distortion.')]);
  famous(75, 'instr', ['electronic', 'pop'], 'Depeche Mode – Enjoy the Silence',
    'Emulator II / Minimoog → SSL 4000 E → AMS DMX 15-80S (Flood / François Kevorkian).',
    unchecked('Sound On Sound (Classic Tracks)'),
    [ssl('SSL 4000 E channel'), s('delay', 'AMS DMX 15-80S', D.ams, K.digiDelay, { macros: ['Time', 'Feedback', 'Mix'], tip: 'Rhythmic echo trails.' })]);

  /* ======================= Part 4: Mix Bus & Mastering ======================= */
  famous(76, 'mixbus', ['pop', 'indie'], 'Chris Lord-Alge – Mix Bus (Pop/Rock)',
    'SSL G-Series bus compressor → Pultec EQP-1A → Sony Oxford EQ.',
    unchecked('Puremix / Sound On Sound') + '; I found no source with CLA’s exact SSL settings',
    [s('comp', 'SSL G bus compressor', D.sslbus, K.bus, { set: { Ratio: [4, ''], Attack: [30, 'ms'] }, macros: ['Attack', 'Thresh'], tip: 'Ratio 4:1, attack 10 or 30 ms, release auto, at most 4 dB.' }),
      pultec('+2 dB at 60 Hz.'), s('eq', 'Sony Oxford EQ', D.oxford, K.precise, { tip: 'Precise finishing EQ.' })]);
  famous(77, 'mixbus', ['pop'], 'Serban Ghenea – Mix Bus (Modern Pop)',
    'Pro Tools → Waves SSL bus compressor → FabFilter Pro-Q.',
    unchecked('Sound On Sound (Inside Track)'),
    [s('comp', 'SSL bus compressor', D.sslbus, K.bus, { macros: ['Thresh'], tip: 'Only 1–2 dB for subtle glue.' }), s('eq', 'FabFilter Pro-Q', D.proq, K.precise, { tip: 'Precise EQ.' })]);
  famous(78, 'mixbus', ['hiphop', 'rnb'], 'Manny Marroquin – Mix Bus (Hip-Hop / R&B)',
    'SSL 4000 G → Shadow Hills Mastering Compressor → Manley Massive Passive.',
    unchecked('Mix With The Masters'),
    [ssl('SSL 4000 G bus'), s('comp', 'Shadow Hills Mastering Compressor', D.shadow, K.bus, { macros: ['Thresh'], tip: 'Optical and discrete stages combined.' }), massive('Broad tone shaping.')]);
  famous(79, 'mixbus', ['pop', 'electronic'], 'Tom Elmhirst – Mix Bus (Pop / Dance)',
    'Neve 33609 → Pultec EQP-1A → Thermionic Culture Vulture (subtle, in parallel).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('comp', 'Neve 33609', D.n33609, K.bus, { set: { Ratio: [2, ''] }, macros: ['Attack', 'Thresh'], tip: 'Ratio 2:1, slow attack.' }), pultec('Broad boosts.'),
      culture('Subtle, in parallel.', { set: { Mix: [20, '%'] }, macros: ['Mix', 'Drive'] })]);
  famous(80, 'mixbus', ['pop', 'indie'], 'Michael Brauer – Mix Bus (Multi-Bus Routing)',
    'Neve / API / Fairchild on four parallel stereo buses, split by instrument group. Here the compressors sit in series, each with its Mix knob as the parallel blend – for the real routing, build parallel chains in the rack.',
    unchecked('Sound On Sound / Puremix'),
    [s('comp', 'Neve (33609)', D.n33609, K.bus, { set: { Mix: [50, '%'] }, macros: ['Mix', 'Thresh'], tip: 'Bus A.' }),
      s('comp', 'API 2500', D.api2500, K.bus, { set: { Mix: [50, '%'] }, macros: ['Mix', 'Thresh'], tip: 'Bus B.' }),
      fairchild('Fairchild', 'Bus C.', { set: { Mix: [50, '%'] }, macros: ['Mix', 'Thresh'] })]);
  famous(81, 'mixbus', ['hiphop', 'pop'], 'Derek "MixedByAli" Ali – Mix Bus (Hip-Hop / Pop)',
    'SSL bus compressor → Black Box HG-2 → Waves L2.',
    unchecked('Mix With The Masters'),
    [s('comp', 'SSL bus compressor', D.sslbus, K.bus, { macros: ['Thresh'], tip: 'Glue.' }),
      s('sat', 'Black Box HG-2', D.hg2, K.tubeSat, { macros: ['Drive', 'Mix'], tip: 'Gentle saturation.' }),
      s('limiter', 'Waves L2', D.l2, K.limiter, { macros: ['Thresh'], tip: 'Only catches extreme peaks.' })]);
  famous(82, 'mixbus', ['electronic', 'pop'], 'Mark "Spike" Stent – Mix Bus (Electronic / Pop)',
    'SSL 4000 G+ → Smart Research C2 → GML 8200.',
    unchecked('Sound On Sound'),
    [ssl('SSL 4000 G+ bus'), s('comp', 'Smart Research C2', D.smartc2, K.bus, { macros: ['Thresh', 'Attack'], tip: 'Bus compression for transient control.' }),
      s('eq', 'GML 8200', D.gml, K.air, { macros: ['High'], tip: 'Fine finishing EQ.' })]);
  famous(83, 'mixbus', ['hiphop'], 'Mike Dean – Mix Bus (Hip-Hop / Trap)',
    'SSL G compressor → Manley Massive Passive → Weiss DS1-MK3.',
    unchecked('Sound On Sound'),
    [s('comp', 'SSL G compressor', D.sslbus, K.bus, { macros: ['Thresh'], tip: 'Glue.' }),
      s('eq', 'Manley Massive Passive', D.massive, K.passive, { macros: ['Low'], tip: 'Focus on the sub bass (30–50 Hz).' }), weissLimiter('Weiss DS1 as the limiter.')]);
  famous(84, 'mixbus', ['pop', 'rnb'], 'Tony Maserati – Mix Bus (Pop / Soul)',
    'API 2500 → Pultec EQP-1A → Studer A800 (2-track tape).',
    unchecked('Puremix'),
    [s('comp', 'API 2500', D.api2500, K.bus, { macros: ['Thresh'], tip: '"Thrust" side-chain filter on (a switch on the plugin).' }), pultec('Broad boosts.'),
      s('tape', 'Studer A800', D.studer, K.tape, { macros: ['Drive'], tip: 'To tape.' })]);
  famous(85, 'mixbus', ['indie'], 'Dave Fridmann – Mix Bus (Indie / Pop)',
    'Otari MTR-90 tape → Empirical Labs Fatso → Neve 33609, all hit hot.',
    unchecked('Tape Op'),
    [s('tape', 'Otari MTR-90', D.otari, K.tape, { macros: ['Drive'], tip: 'Deliberately hot to tape.' }),
      s('sat', 'Empirical Labs Fatso', D.fatso, K.tape, { macros: ['Drive'], tip: 'Hot into the Fatso.' }),
      s('comp', 'Neve 33609', D.n33609, K.bus, { macros: ['Thresh'], tip: 'Bus compression.' })]);
  famous(86, 'master', ['pop', 'hiphop'], 'Chris Gehringer – Mastering (Pop / Hip-Hop)',
    'Lavry Gold AD122 (converter) → Manley Massive Passive → Dangerous BAX EQ (Sterling Sound).',
    unchecked('Sound On Sound'),
    [massive('Very subtle: about 0.5–1 dB.'), s('eq', 'Dangerous BAX EQ', D.bax, K.masterEq, { macros: ['Low', 'High'], tip: 'Broad shelves, subtle.' }), finalLimiter()]);
  famous(87, 'master', ['electronic', 'dubtechno'], 'Rashad Becker – Mastering (Techno / Vinyl)',
    'Neumann VMS-80 (lathe) → Manley Massive Passive → Weiss EQ1, lows in mono below about 120 Hz for the cut (Dubplates & Mastering).',
    unchecked('Resident Advisor / Groove'),
    [massive('Tone.'), s('eq', 'Weiss EQ1', D.weissEQ1, K.masterEq, { macros: ['Low', 'High'], tip: 'Precise mastering EQ.' }),
      s('width', 'Mono below 120 Hz', null, K.monoBass, { macros: ['Width'], tip: 'Lows in mono for the vinyl cut (about 120 Hz).' }), finalLimiter()]);
  famous(88, 'master', ['pop', 'indie'], 'Bob Ludwig – Mastering (Pop / Rock)',
    'Cello Audio Palette EQ → Manley Variable-Mu → Weiss DS1-MK3 (Gateway Mastering).',
    unchecked('Sound On Sound / Tape Op'),
    [s('eq', 'Cello Audio Palette', D.cello, K.masterEq, { macros: ['Low', 'High'], tip: 'Broad tone.' }), vari('1–2 dB of gain reduction.'), weissLimiter('Transparent limiting.')]);
  famous(89, 'master', ['pop', 'rnb'], 'Randy Merrill – Mastering (Modern Pop / R&B)',
    'Manley Massive Passive → Sontec MES-432D9 → Weiss DS1-MK3 (Sterling Sound). No exact numbers documented.',
    unchecked('Sound On Sound'),
    [massive('Colour.'), sontec('Precision.'), weissLimiter('Limiting.')]);
  famous(90, 'master', ['hiphop'], 'Dave Kutch – Mastering (Hip-Hop)',
    'Neve Portico II Master Buss Processor ("Silk" and width by ear) → Chandler Curve Bender → Lavry Gold (converter) (The Mastering Palace).',
    unchecked('Mix With The Masters'),
    [s('comp', 'Neve Portico II MBP', D.portico, /bus|master|33609|bx_masterdesk/i, { macros: ['Thresh', 'Width'], tip: '"Silk" saturation and stereo width by ear.' }),
      s('eq', 'Chandler Curve Bender', D.curve, K.vintageEq, { macros: ['Low', 'High'], tip: 'Tone.' }), finalLimiter()]);
  famous(91, 'master', ['electronic'], 'Matt Colton – Mastering (Electronic / Club)',
    'Maselec MEA-2 → Maselec MLA-4 → Prism Sound converters (Metropolis). No fixed values documented; clean club transients.',
    unchecked('Sound On Sound / Resident Advisor'),
    [maselec(), s('multiband', 'Maselec MLA-4', D.mla4, K.mb, { macros: ['Depth'], tip: 'Clean, controlled transients.' }), finalLimiter()]);
  famous(92, 'master', ['electronic'], 'Daft Punk – Random Access Memories (Mastering)',
    'Ampex ATR-102 (1/2" tape) → Manley Massive Passive → Lavry Gold (converter) (Bob Ludwig / Chab).',
    unchecked('Sound On Sound (Inside Track)'),
    [s('tape', 'Ampex ATR-102', D.atr, K.tape, { macros: ['Drive'], tip: 'Tape as colour before the conversion.' }), massive('Tone.'), finalLimiter()]);
  famous(93, 'master', ['pop'], 'Ted Jensen – Mastering (Loudness / Pop)',
    'Sontec EQ → Tube-Tech SMC 2B → custom analogue limiter (Sterling Sound).',
    unchecked('Sound On Sound'),
    [sontec('Tone.'), smc2b('Multiband compression to control the bass.'), s('limiter', 'Analogue limiter (custom)', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: 'Loudness.' })]);
  famous(94, 'master', ['electronic', 'dubtechno'], 'Stefan Betke – Mastering (Techno / Minimal)',
    'Maselec MEA-2 → Elysia Alpha Compressor (feed-forward, side-chain filter) → Mytek converters (Scape Mastering).',
    unchecked('Groove / Sound On Sound'),
    [maselec(), s('comp', 'Elysia Alpha Compressor', D.elysia, K.bus, { macros: ['Thresh'], tip: 'Feed-forward mode with side-chain filter (switches on the plugin).' }), finalLimiter()]);
  famous(95, 'master', ['pop'], 'Emily Lazar – Mastering (Mid/Side)',
    'Dangerous BAX EQ → Knoll M/S matrix → Fairchild 670 in Lat/Vert mode (The Lodge).',
    unchecked('Sound On Sound / Tape Op'),
    [s('eq', 'Dangerous BAX EQ', D.bax, K.masterEq, { macros: ['Low', 'High'], tip: 'Broad shelves.' }),
      s('width', 'Knoll M/S matrix', D.knoll, K.width, { macros: ['Width'], tip: 'Mid/side balance.' }),
      fairchild('Fairchild 670 – Lat/Vert', 'Mid and side compressed separately (Lat/Vert – a switch on the plugin).'), finalLimiter()]);
  famous(96, 'master', ['hiphop'], 'Herb Powers Jr. – Mastering (90s Hip-Hop)',
    'Sontec MEP-250EX → Manley Variable-Mu → Apogee AD-16X (converter). No exact settings documented; a punchy bass focus.',
    unchecked('Scratch Magazine'),
    [sontec('Bass focus.', ['Low']), vari('Punch.'), finalLimiter()]);
  famous(97, 'master', ['electronic'], 'Nilesh Patel – Mastering (UK Dance)',
    'Neve mastering console → Pultec EQP-1A3 → Neumann VMS-80 lathe (The Exchange).',
    unchecked('Sound On Sound / Resident Advisor'),
    [s('preamp', 'Neve mastering console', D.neve, K.console, { macros: ['Drive'], opt: .6, tip: 'Console colour.' }), pultec('Strong low-end boosts for club vinyl.', ['Low']), finalLimiter()]);
  famous(98, 'master', ['pop'], 'Bernie Grundman – Mastering (Audiophile)',
    'Custom Grundman console → custom discrete EQ and compressor – an all-discrete class-A chain without ICs.',
    unchecked('Tape Op / Sound On Sound'),
    [s('eq', 'Discrete EQ', null, K.masterEq, { macros: ['Low', 'High'], tip: 'Clean and broad.' }), s('comp', 'Discrete compressor', null, K.bus, { macros: ['Thresh'], tip: 'Gentle.' }), finalLimiter()]);
  famous(99, 'master', ['electronic'], 'Luca Pretolesi – Mastering (EDM / Festival)',
    'Dangerous 2-Bus+ → Tube-Tech SMC 2B → Weiss DS1-MK3; compression and clipping to about −5 to −6 LUFS (Studio DMI).',
    unchecked('Mix With The Masters'),
    [s('sat', 'Dangerous 2-Bus+', D.twobus, K.tubeSat, { macros: ['Drive'], tip: 'Analogue summing colour.' }), smc2b('Band control.'),
      s('clipper', 'Clipper', null, K.clipper, { macros: ['Thresh'], tip: 'Clipping for loudness.' }), weissLimiter('Loud: about −5 to −6 LUFS.')]);
  famous(100, 'master', [], 'Bob Katz – Mastering (K-System)',
    'Weiss EQ1 → Pendulum OCL-2 → Weiss DS1-MK3; target K-14 / K-12 (Digital Domain).',
    unchecked('Mastering Audio (book)'),
    [s('eq', 'Weiss EQ1', D.weissEQ1, K.masterEq, { macros: ['Low', 'High'], tip: 'Precise EQ.' }),
      s('comp', 'Pendulum OCL-2', D.ocl2, K.opto, { set: { Ratio: [1.5, ''] }, macros: ['Ratio', 'Thresh'], tip: 'Ratio 1.5:1 to 2:1, at most 1.5 dB of gain reduction.' }),
      weissLimiter('Target K-14 / K-12.'), s('meter', 'Loudness meter', null, K.meter, { opt: .7, tip: 'Check the K-System level.' })]);

  /* ======================= Dub techno ======================= */
  add('dub-brootle', 'instr', ['dubtechno', 'electronic'], 'Dub Techno Chord Chain (Studio Brootle)',
    'Chorus and light drive thicken the chord, vinyl crackle runs into two tape-style echoes (2/16 and 3/16, ping-pong) with a moving band-pass and phaser between them, a long dark reverb, and a final crunch. The chord itself (filtered sampler or synth stab) comes before the rack.',
    'Studio Brootle – Dub Techno Effects Chains (studiobrootle.com); the macro list follows the article',
    [s('chorus', 'Chorus', null, K.chorus, { macros: ['Feedback', 'Mix'], tip: 'Thickens the chord; a little feedback for odd tones.' }),
      s('sat', 'Overdrive – desk drive', null, K.dist, { set: { Mix: [30, '%'] }, macros: ['Drive'], tip: 'Only a little, not fully wet – like analogue desk drive.' }),
      s('tape', 'Vinyl crackle', null, /vinyl|dust|crackle|lo-?fi|mello-?fi/i, { macros: ['Noise'], tip: 'Crackle before the first echo, so it runs through the delays.' }),
      s('delay', 'Echo 1 – 2/16 ping-pong', null, K.tapeEcho, { set: { Mix: [35, '%'], Feedback: [45, '%'] }, macros: ['Feedback', 'Mix'], tip: '2/16, a little reverb, ping-pong, modulation about 11 % for tape-style error.' }),
      s('filter', 'Band-pass with LFO', null, K.filter, { macros: ['LFO', 'Mix'], tip: 'Moving band-pass with phase offset for width – mix some dry back in.' }),
      s('mod', 'Phaser / flanger', null, K.flanger, { macros: ['Feedback', 'Mix'], tip: 'Stereo phasing; feedback for odd tones.' }),
      s('delay', 'Echo 2 – 3/16', null, K.tapeEcho, { set: { Mix: [30, '%'], Feedback: [40, '%'] }, macros: ['Feedback', 'Mix'], tip: '3/16, different errors, less reverb.' }),
      s('reverb', 'Reverb – long and dark', null, K.hall, { set: { Decay: [4, 's'] }, macros: ['Decay', 'Tone'], tip: 'About 4 s decay, highs filtered off.' }),
      s('dist', 'Final crunch', null, /drum ?bus|crunch|decapitator|saturn|devil|radiator|drive/i, { set: { Mix: [50, '%'] }, macros: ['Drive'], tip: 'About 50 % wet, crunch around 14 %: brings out the echo artefacts.' })]);
  add('dub-send', 'returns', ['dubtechno', 'electronic'], 'Dub Techno Send: Tape Echo → Spring → Phaser',
    'The classic dub send: a dark tape echo close to self-oscillation, a spring reverb behind it and a slow phaser over everything. Send stabs, hats and rim shots into it and ride the feedback.',
    'PlugShelf template (common dub practice)',
    [s('filter', 'High-pass before the echo', null, K.filter, { macros: ['Cutoff'], tip: 'Keeps the echoes from muddying the low end.' }),
      s('delay', 'Tape echo', D.re201, K.tapeEcho, { set: { Feedback: [65, '%'] }, macros: ['Feedback', 'Time', 'Tone'], tip: 'Dotted eighths or 3/16; ride the feedback.' }),
      s('reverb', 'Spring reverb', null, K.spring, { set: { Decay: [2.5, 's'] }, macros: ['Decay'], tip: 'The dub spring.' }),
      s('mod', 'Slow phaser', D.biphase, K.phaser, { macros: ['Rate', 'Feedback'], tip: 'Slow sweep over the tails.' })]);
  add('dub-pad', 'instr', ['dubtechno', 'electronic'], 'Dub Techno Pad Wash',
    'Turns a chord or pad into a hazy wash: chorus, tape wobble, a huge dark reverb, then a low cut to keep the kick clear.',
    'PlugShelf template',
    [s('chorus', 'Chorus', null, K.chorus, { macros: ['Mix'], tip: 'Width.' }),
      s('tape', 'Tape wobble', null, K.tape, { macros: ['Wow', 'Noise'], tip: 'Wow, flutter and hiss.' }),
      s('reverb', 'Huge dark reverb', null, K.hall, { set: { Decay: [8, 's'], Mix: [45, '%'] }, macros: ['Decay', 'Mix', 'Tone'], tip: 'Long and dark.' }),
      s('eq', 'Low cut', null, K.precise, { macros: ['HPF'], tip: 'Keeps the low end free for kick and bass.' })]);

  /* ======================= Mastering (Lazi Akademie wiki) ======================= */
  const lazi = 'Lazi Akademie wiki – Mastering-Chain (lazi-akademie.de)';
  add('lazi-full', 'master', [], 'Mastering Chain – the full order (Lazi Akademie)',
    'High-pass (optional, below 20–30 Hz) → corrective EQ (±1–3 dB, broad) → glue compressor (1.5–2:1, slow attack, auto release, 1–2 dB) → musical EQ → subtle saturation → stereo width (lows mono) → clipper (optional) → true-peak limiter at −1 dBTP → loudness check.',
    lazi,
    [s('eq', 'Corrective EQ + high-pass', null, K.precise, { macros: ['HPF', 'Low', 'High'], tip: 'High-pass below 20–30 Hz only if needed; ±1–3 dB, broad Q.' }),
      s('comp', 'Glue compressor', null, K.bus, { set: { Ratio: [2, ''], Attack: [30, 'ms'] }, macros: ['Thresh', 'Ratio'], tip: 'VCA or vari-mu, 1.5–2:1, slow attack, auto release, 1–2 dB.' }),
      s('eq', 'Musical EQ (Pultec style)', null, K.vintageEq, { macros: ['Low', 'High'], tip: 'Low-mid warmth and top-end sheen – a small boost is enough.' }),
      s('sat', 'Saturation', null, K.tubeSat, { macros: ['Drive', 'Mix'], opt: .7, tip: 'Very subtle – missed when gone, not heard when on.' }),
      s('width', 'Stereo width', null, K.width, { macros: ['Width'], opt: .7, tip: 'Lows mono, highs slightly wider.' }),
      s('clipper', 'Clipper', null, K.clipper, { macros: ['Thresh'], opt: .5, tip: 'Before the limiter: shaves peaks without pumping.' }),
      s('limiter', 'True-peak limiter', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh', 'Ceiling'], tip: 'Ceiling −1 dBTP, at most 3–4 dB of gain reduction.' }),
      s('meter', 'Loudness meter', null, K.meter, { opt: .8, tip: 'Integrated LUFS and true peak.' })]);
  add('lazi-podcast', 'master', [], 'Podcast / Speech Master (Lazi Akademie)',
    'High-pass at 80 Hz → EQ (cut the nasal 300 Hz) → glue compressor (1 dB) → de-esser → limiter at −1 dBTP → −16 LUFS for Apple Podcasts.',
    lazi,
    [s('eq', 'EQ – high-pass 80 Hz, cut 300 Hz', null, K.precise, { macros: ['HPF', 'Presence'], tip: 'High-pass at 80 Hz, cut the nasal area around 300 Hz.' }),
      s('comp', 'Glue compressor', null, K.bus, { macros: ['Thresh'], tip: 'About 1 dB.' }),
      s('deess', 'De-esser', null, K.deess, { macros: ['Thresh'], tip: 'Sibilance.' }),
      s('limiter', 'Limiter', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: '−1 dBTP, about −16 LUFS integrated.' }),
      s('meter', 'Loudness meter', null, K.meter, { opt: .8, tip: '−16 LUFS ±1 dB.' })]);
  add('lazi-standard', 'master', ['pop', 'indie'], 'Standard Pop/Rock Master (Lazi Akademie)',
    'High-pass → linear-phase EQ → bus compressor → analogue-style EQ → saturation → mid/side width → limiter.',
    lazi,
    [s('eq', 'Linear-phase EQ', null, /linear|pro-?q|ozone \d+ equalizer|kirchhoff/i, { macros: ['HPF', 'Low'], tip: 'High-pass and corrective moves.' }),
      s('comp', 'Bus compressor', null, K.bus, { set: { Ratio: [2, ''] }, macros: ['Thresh'], tip: '1–2 dB of glue.' }),
      s('eq', 'Analogue EQ', null, K.vintageEq, { macros: ['Low', 'High'], tip: 'Character.' }),
      s('sat', 'Saturation', null, K.tubeSat, { macros: ['Drive'], tip: 'Subtle.' }),
      s('width', 'M/S width', null, K.width, { macros: ['Width'], tip: 'Lows mono.' }),
      s('limiter', 'Limiter', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: '−1 dBTP.' })]);
  add('lazi-vinyl', 'master', ['electronic'], 'Vinyl Master (Lazi Akademie)',
    'High-pass → EQ → compressor → de-esser for sibilance → gentle limiting; keep the bass in the middle. RIAA is done by the cutting system, not in the chain.',
    lazi,
    [s('eq', 'EQ + high-pass', null, K.precise, { macros: ['HPF'], tip: 'Clean low end.' }),
      s('comp', 'Compressor', null, K.bus, { macros: ['Thresh'], tip: 'Gentle.' }),
      s('deess', 'De-esser', null, K.deess, { macros: ['Thresh'], tip: 'Sibilance is hard to cut.' }),
      s('width', 'Bass mono', null, K.monoBass, { macros: ['Width'], tip: 'Bass in the middle for the cut.' }),
      s('limiter', 'Gentle limiter', null, K.limiter, { macros: ['Thresh'], tip: 'Behutsam: little gain reduction.' })]);
  add('lazi-indiepop', 'master', ['indie', 'pop'], 'Indie-Pop Song Master (Lazi Akademie)',
    'Linear-phase EQ (low-end control) → SSL G-bus emulation (2 dB) → Pultec EQ (low shelf 60 Hz, high shelf 12 kHz) → Slate Virtual Tape Machine → iZotope Ozone Imager → FabFilter Pro-L 2 → Youlean.',
    lazi,
    [s('eq', 'Linear-phase EQ', null, /linear|pro-?q|ozone \d+ equalizer|kirchhoff/i, { macros: ['Low'], tip: 'Low-end control.' }),
      s('comp', 'SSL G-bus', D.sslGMaster, K.bus, { macros: ['Thresh'], tip: 'About 2 dB of gain reduction.' }),
      pultec('Low shelf at 60 Hz, high shelf at 12 kHz.'),
      s('tape', 'Virtual tape machine', D.vtm, K.tape, { macros: ['Drive'], tip: 'Tape colour.' }),
      s('width', 'Ozone Imager', D.ozoneImager, K.width, { macros: ['Width'], tip: 'Width.' }),
      s('limiter', 'FabFilter Pro-L 2', D.proL2, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: '−1 dBTP.' }),
      s('meter', 'Youlean loudness meter', /youlean/i, K.meter, { opt: .8, tip: 'Loudness.' })]);
  add('lazi-film', 'master', [], 'Film Score Master (Lazi Akademie)',
    'A very subtle chain that keeps the dynamics: corrective EQ only, minimal limiting (about 1 dB), −23 LUFS for broadcast (EBU R 128).',
    lazi,
    [s('eq', 'Corrective EQ', null, K.precise, { macros: ['Low', 'High'], tip: 'Only corrective.' }),
      s('limiter', 'Minimal limiter', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: 'About 1 dB at most.' }),
      s('meter', 'Loudness meter', null, K.meter, { tip: '−23 LUFS (EBU R 128).' })]);
  add('lazi-edm', 'master', ['electronic'], 'EDM / Electronic Master (Lazi Akademie)',
    'EQ → multiband compressor for band control → saturation → clipper before the limiter → harder limiting. Spotify turns louder masters down to −14 LUFS.',
    lazi,
    [s('eq', 'EQ', null, K.precise, { macros: ['Low', 'High'], tip: 'Balance.' }),
      s('multiband', 'Multiband compressor', null, K.mb, { macros: ['Depth'], tip: 'Controls single bands.' }),
      s('sat', 'Saturation', null, K.tubeSat, { macros: ['Drive'], opt: .7, tip: 'Density.' }),
      s('clipper', 'Clipper', null, K.clipper, { macros: ['Thresh'], tip: 'More loudness with less pumping.' }),
      s('limiter', 'Limiter', null, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: 'Harder limiting is fine here.' })]);
  add('lazi-plugins', 'master', [], 'Plugin Mastering Chain (Lazi Akademie example)',
    'FabFilter Pro-Q 4 → Waves SSL G-Master Buss → Soundtoys Decapitator → iZotope Ozone Imager → FabFilter Pro-L 2 → Youlean.',
    lazi,
    [s('eq', 'FabFilter Pro-Q 4', /pro-?q ?4/i, K.precise, { macros: ['Low', 'High'], tip: 'EQ.' }),
      s('comp', 'SSL G-Master Buss', D.sslGMaster, K.bus, { macros: ['Thresh'], tip: 'Glue.' }),
      s('sat', 'Soundtoys Decapitator', D.decap, K.tubeSat, { set: { Mix: [25, '%'] }, macros: ['Drive', 'Mix'], tip: 'Saturation, blended.' }),
      s('width', 'iZotope Ozone Imager', D.ozoneImager, K.width, { macros: ['Width'], tip: 'Width.' }),
      s('limiter', 'FabFilter Pro-L 2', D.proL2, K.limiter, { set: { Ceiling: [-1, 'dB'] }, macros: ['Thresh'], tip: 'Limiter.' }),
      s('meter', 'Youlean loudness meter', /youlean/i, K.meter, { opt: .8, tip: 'Metering.' })]);
})();
