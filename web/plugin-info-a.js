'use strict';
/* Plugin descriptions, part A: Universal Audio, Arturia, IK Multimedia. */

// ---- Universal Audio (UAD = DSP/Apollo or native "UAD Spark", UADx = native) ----
PI('Console Recall', 'Universal Audio helper that saves the UA Console mixer settings (preamps, Unison plugins, inserts) inside your DAW session.',
  ['Recalls the Apollo console with the project', 'No sound processing of its own']);
PI('API 2500|API 2500 Bus Compressor', 'Emulation of the API 2500 stereo bus compressor – punchy, with selectable feedback/feed-forward detection.',
  ['“Thrust” high-pass in the sidechain keeps the low end from pumping', 'Hard, medium and soft knee; old (feedback) or new (feed-forward) tone', 'Stereo link and L/R or M/S style imaging control'],
  ['Drum bus: ratio 4:1, attack 10 ms, release auto, Thrust med, 2–4 dB GR']);
PI('Ampeg SVTVR', 'Bass amp emulation of the Ampeg SVT-VR tube head with its 8×10 cabinet.', ['Classic rock bass tone from clean to growl', 'Ultra Hi / Ultra Lo switches and mic choice']);
PI('Auto-Tune Realtime Access|Auto-Tune Realtime Advanced|Auto-Tune Realtime X|Auto-Tune Realtime', 'Antares Auto-Tune for UAD/Apollo – pitch correction with near-zero latency for tracking and live use.',
  ['Retune speed from natural to the hard “T-Pain” effect', 'Key and scale setting, humanize and flex-tune (Advanced/X)', 'Runs on the Apollo DSP during recording'],
  ['Natural correction: Retune 20–40', 'Hard effect: Retune 0, correct key and scale']);
PI('Avalon VT-737sp|Avalon VT-737 Channel Strip', 'Emulation of the Avalon VT-737sp tube channel strip: preamp, opto compressor and four-band EQ.',
  ['Very open, airy top end – a favourite on vocals', 'Opto compressor with fast/slow attack and release', 'EQ can be placed before or after the compressor'],
  ['Vocals: compressor at 3–5 dB GR, gentle high shelf at 10–15 kHz']);
PI('CS-1', 'UA’s channel strip: EQ, compressor, delay/modulation and reflection in one plugin, inspired by classic studio processors.', ['Light on DSP', 'Good for quick tracking chains']);
PI('Capitol Chambers', 'Emulation of the famous underground echo chambers at Capitol Studios in Hollywood.',
  ['Real chamber rooms with mic and speaker choices', 'Dense, natural reverb heard on many classic records'], ['Vocals: chamber 4, decay 1.5–2.5 s, pre-delay 20 ms']);
PI('Century Tube Channel Strip', 'UA’s simple tube channel strip: preamp, compressor and three-band EQ in one window.', ['Few controls, quick results', 'Warm tube colour']);
PI('Dangerous BAX EQ Master|Dangerous BAX EQ Mix|Dangerous BAX EQ', 'Emulation of the Dangerous Music BAX EQ – broad Baxandall shelves and very gentle high/low cut filters.',
  ['Wide, musical tone curves for the mix bus and mastering', 'Master version with stepped controls for recall, Mix version with continuous knobs'],
  ['Mix bus: low cut 12–18 Hz, +1 dB air shelf']);
PI('EMT 140|EMT 140 Plate Reverb', 'Emulation of the EMT 140 plate reverb – the classic bright, dense plate on countless vocals and snares.',
  ['Three different EMT plates from the Gold Star / Ocean Way collections', 'Damper control sets the decay', 'Pre-delay and modulation'], ['Vocal plate: decay 1.5–2 s, high-pass the send at 200 Hz']);
PI('EMT 250|EMT 250 Electronic Reverb', 'Emulation of the EMT 250, the first digital reverb (1976) – warm, grainy and full of character.', ['Also delay, chorus, phaser and echo programs', 'Lush 80s reverb sound']);
PI('Empirical Labs Distressor', 'Emulation of the Empirical Labs EL8 Distressor – a versatile compressor from gentle to brutally distorted.',
  ['Ratios from 1:1 to “Nuke”', 'Distortion modes Dist 2 (tube-like) and Dist 3 (tape-like)', 'Sidechain high-pass and band emphasis'],
  ['Drum room: ratio 10:1 or Nuke, fast attack, Dist 3', 'Vocals: ratio 3:1, attack 5, release 5']);
PI('Fairchild 670', 'Emulation of the Fairchild 660/670 variable-mu tube limiter – rich, gentle compression.', ['Six time constants', 'Lateral/vertical (M/S) mode', 'Tube warmth even without compression']);
PI('Galaxy Tape Echo', 'Emulation of the Roland RE-201 Space Echo tape delay with spring reverb.',
  ['Three tape heads, mode selector for 12 head/reverb combinations', 'Wow, flutter and tape wear', 'Self-oscillation when Intensity is turned up'], ['Dub: mode 4–7, Intensity just below oscillation']);
PI('Lexicon 480L', 'Emulation of the Lexicon 480L digital reverb – the reverb of 80s and 90s pop records.', ['Halls, rooms, plates and ambience programs', 'Very smooth, deep tails']);
PI('Manley VOXBOX|Manley VOXBOX Channel Strip', 'Emulation of the Manley VOXBOX tube channel strip made for vocals.', ['Tube mic preamp, opto compressor, EQ and de-esser', 'Rich, present vocal sound']);
PI('Marshall Plexi', 'Guitar amp emulation of a late-60s Marshall Plexi Super Lead.', ['Classic rock crunch', 'Cabinet and mic choices']);
PI('Moog Multimode Filter|Moog Multimode Filter SE|Moog Multimode Filter XL', 'Moog-style ladder filter with low-pass, high-pass and band-pass modes and drive.',
  ['Resonant analog-style filter with envelope follower and LFO', 'XL adds a step sequencer and stereo modes', 'SE is the lighter DSP version'], ['Filter sweep: low-pass, resonance 30 %, LFO synced to 1 bar']);
PI('Neve 1084', 'Emulation of the Neve 1084 preamp/EQ module – the warm, musical British console sound.', ['Three-band EQ with high-pass and low-pass', 'Preamp drive adds harmonic colour']);
PI('Neve 2254 E|Neve 2254 E Dual|Neve 2254', 'Emulation of the Neve 2254/E compressor/limiter – thick, characterful Neve dynamics.', ['Compressor plus limiter', 'Classic on drums and bass']);
PI('Neve 33609 C|Neve 33609SE|Neve 33609', 'Emulation of the Neve 33609 stereo bus compressor/limiter.', ['Smooth glue on mix bus and drums', 'Separate limiter section']);
PI('Neve 88RS', 'Emulation of the Neve 88RS console channel: preamp, EQ, dynamics and filters.', ['Modern Neve sound, cleaner than the 1073/1084', 'Full channel strip']);
PI('Precision Channel Strip', 'Clean, flexible UAD channel strip: EQ, compressor, gate/expander.', ['Transparent sound', 'Light on DSP']);
PI('Precision Delay Mod|Precision Delay Mod L', 'UA’s clean dual delay with modulation for chorus and doubling effects.', ['Tempo sync', 'L version: longer delay times']);
PI('Precision Enhancer Hz', 'Low-end enhancer that adds harmonics so bass and kick are heard on small speakers.', ['Works by frequency', 'Subtle to obvious']);
PI('Precision Reflection Engine', 'UA’s algorithmic room reverb with detailed early reflections.', ['Room size, shape and materials', 'Clean and natural']);
PI('Pultec EQP-1A|Pultec-Pro|EQP-1A|EQ-PA|EQ-PB|EQ-PG', 'Emulation of the Pultec passive tube EQ – broad, musical boosts with a famous low-end trick.',
  ['Boost and cut the same low frequency at once for a tight, big low end (“Pultec trick”)', 'Smooth high shelf for air', 'Tube make-up gain adds colour'],
  ['Kick/bass: 60 Hz boost 3–4 with attenuation 2', 'Air: 10–12 kHz boost 2']);
PI('Pure Plate|Pure Plate Reverb', 'Simple, clean plate reverb from UA – bright and dense.', ['Few controls', 'Good on vocals and snare']);
PI('UAD Raw', 'Distortion pedal emulation based on the Pro Co RAT.', ['Gritty, aggressive distortion', 'Filter knob for tone']);
PI('RealVerb-Pro', 'Algorithmic reverb from UA with detailed room shape and material settings.', ['Morph between two room designs']);
PI('SSL G Bus Compressor', 'Emulation of the SSL 4000 G bus compressor – the classic mix-bus “glue”.',
  ['Ratios 2, 4, 10; attack 0.1–30 ms; release including Auto', 'Makes mixes sound tighter and more finished'],
  ['Mix bus: ratio 2:1, attack 30 ms, release Auto, 1–3 dB GR']);
PI('Studer A800|Studer A800 Tape Recorder', 'Emulation of the Studer A800 multitrack tape machine.', ['Tape types, speeds and calibration', 'Warm saturation and gentle compression']);
PI('Studio D Chorus', 'Emulation of the Roland Dimension D chorus – wide, subtle stereo chorus.', ['Four buttons for four intensities', 'Classic on synths, guitars and vocals']);
PI('UAD UA 175-B|UA 175-B|175-B Compressor|UA 176|176 Compressor', 'Emulation of the UA 175-B and 176 tube compressors – the vari-mu ancestors of the 1176.', ['Warm tube compression', 'Smooth on vocals and bass']);
PI('UAD UA 610-A|UAD UA 610-B|UA 610-A|UA 610-B|610-A Preamp and EQ|610-B Preamp and EQ', 'Emulation of the UA 610 tube preamp and EQ from the 1950s/60s console.', ['Warm, thick tube colour', 'Simple shelving EQ']);

// ---- Arturia ----
PI('ARP 2600', 'Arturia’s emulation of the ARP 2600 semi-modular synthesizer.', ['Patch cables for modular sounds', 'Famous for sound effects and leads'], ['Start from presets, then re-patch']);
PI('Acid V', 'Arturia’s emulation of the Roland TB-303 bass line synthesizer.', ['Squelchy acid bass', 'Built-in step sequencer with slide and accent']);
PI('Augmented YANGTZE', 'Arturia hybrid instrument: sampled Chinese instruments layered with synthesis.', ['Two layers – sample and synth', 'Morph control between them']);
PI('B-3', 'Arturia’s emulation of the Hammond B-3 organ with rotary speaker.', ['Drawbars, percussion, vibrato/chorus', 'Leslie simulation']);
PI('Bus FORCE', 'Arturia’s mix-bus processor: compressor, EQ, saturation and stereo width in one.', ['Several compressor types in one window', 'Made for glue on buses and the master']);
PI('CMI V', 'Arturia’s emulation of the Fairlight CMI – the 80s sampler and additive synth.', ['Grainy 8-bit sampler sound', 'Famous 80s pop textures']);
PI('CS-80', 'Arturia’s emulation of the Yamaha CS-80 polysynth.', ['Huge brass and string pads (Blade Runner)', 'Ribbon controller and polyphonic aftertouch']);
PI('Chorus DIMENSION-D', 'Arturia’s emulation of the Roland Dimension D chorus.', ['Subtle, wide stereo chorus', 'Four modes']);
PI('Chorus JUN-6', 'Arturia’s emulation of the Juno-6 chorus.', ['Lush, slightly noisy 80s chorus', 'Modes I and II']);
PI('Comp FET-76', 'Arturia’s 1176-style FET compressor.', ['Fast, punchy, bright', 'All-buttons mode']);
PI('Comp TUBE-STA', 'Arturia’s emulation of a tube variable-mu compressor (Gates Sta-Level).', ['Warm, slow compression', 'Great on vocals and bass']);
PI('Comp VCA-65', 'Arturia’s emulation of the dbx 165A VCA compressor.', ['Clean, punchy VCA compression', 'Good for drums and bass']);
PI('DX7', 'Arturia’s emulation of the Yamaha DX7 FM synthesizer.', ['Classic electric pianos and bells', 'Easier editing than the hardware']);
PI('Delay BRIGADE', 'Arturia’s bucket-brigade (BBD) analog delay.', ['Dark, warm repeats with modulation', 'Like a Memory Man pedal']);
PI('Delay TAPE-201', 'Arturia’s emulation of the Roland RE-201 Space Echo.', ['Tape echo and spring reverb', 'Wow and flutter']);
PI('Dist COLDFIRE', 'Arturia’s modern distortion plugin with several algorithms and filters.', ['From warm drive to digital destruction']);
PI('Dist OPAMP-21', 'Arturia’s distortion based on an op-amp fuzz/drive pedal circuit.', ['Pedal-style grit']);
PI('Dist TUBE-CULTURE', 'Arturia’s emulation of the Thermionic Culture Vulture tube distortion.', ['Triode and pentode modes', 'Rich harmonics from warm to fuzzy']);
PI('EQ SITRAL-295', 'Arturia’s emulation of the Siemens Sitral console EQ (W295b).', ['Broad, musical boosts', 'Vintage German broadcast sound']);
PI('Efx FRAGMENTS', 'Arturia’s granular effect – cuts audio into grains and rearranges them.', ['Textures, stutters and pads from any sound']);
PI('Filter M12', 'Arturia’s filter based on the Oberheim Matrix-12 multimode filter.', ['15 filter modes', 'Envelope, LFO and sequencer']);
PI('Filter MINI', 'Arturia’s Minimoog ladder filter as an effect.', ['Fat low-pass', 'Envelope follower and LFO']);
PI('Filter MS-20', 'Arturia’s Korg MS-20 filter as an effect.', ['Aggressive, screaming resonance']);
PI('Jun-6', 'Arturia’s emulation of the Roland Juno-6 polysynth.', ['Simple, warm pads and bass', 'Famous Juno chorus']);
PI('Jup-8', 'Arturia’s emulation of the Roland Jupiter-8 polysynth.', ['Big analog pads and brass', 'Split and layer modes']);
PI('KORG MS-20 V', 'Arturia’s emulation of the Korg MS-20 semi-modular synth.', ['Aggressive filters', 'Patch bay']);
PI('Mini', 'Arturia’s emulation of the Minimoog Model D.', ['The classic fat mono bass and lead', 'Three oscillators and ladder filter']);
PI('OP-Xa', 'Arturia’s emulation of the Oberheim OB-Xa polysynth.', ['Brassy 80s pads (“Jump”)']);
PI('Phaser BI-TRON', 'Arturia’s emulation of the Musitronics Bi-Phase dual phaser.', ['Two phasers, series or parallel', 'Deep, swirling sweeps']);
PI('Piano V3|Piano V', 'Arturia’s physically modelled acoustic piano.', ['Several piano models and mics', 'Small download, many settings']);
PI('Pigments', 'Arturia’s flagship software synth: wavetable, virtual analog, granular, harmonic, sample and modal engines.',
  ['Two main engines plus a utility engine', 'Clear colour-coded modulation', 'Huge preset library'], ['Start from a preset and change the macros']);
PI('Pre 1973', 'Arturia’s emulation of the Neve 1073 preamp and EQ.', ['Warm British preamp colour', 'Three-band EQ with high-pass']);
PI('Prophet-5', 'Arturia’s emulation of the Sequential Prophet-5 (and Prophet VS).', ['Classic polysynth pads and brass']);
PI('Rev INTENSITY', 'Arturia’s modern algorithmic reverb for big, evolving spaces.', ['Modulation and movement', 'Sound design reverbs']);
PI('Rev LX-24', 'Arturia’s emulation of the Lexicon 224 digital reverb.', ['Classic 80s halls and plates']);
PI('Rev PLATE-140', 'Arturia’s EMT 140 plate reverb.', ['Bright, dense plate', 'Three plates']);
PI('Rev SPRING-636', 'Arturia’s spring reverb (Grampian 636-style).', ['Boingy, surf and dub reverb']);
PI('Stage-73', 'Arturia’s emulation of the Fender Rhodes Stage 73 electric piano.', ['Bell-like Rhodes tone', 'Amp and effects']);
PI('Tape J-37', 'Arturia’s emulation of the Studer J37 tape machine (Abbey Road, Beatles era).', ['Tape colour, wow and flutter', 'Three tape formulas']);
PI('Tape MELLO-FI', 'Arturia’s lo-fi tape effect.', ['Wobble, noise and worn cassette sound']);
PI('Wurli', 'Arturia’s emulation of the Wurlitzer 200A electric piano.', ['Bark and bite', 'Tremolo and amp']);

// ---- IK Multimedia (T-RackS and Amplitube) ----
PI('T-RackS 6|T-RackS', 'IK Multimedia’s mixing and mastering suite – a rack for all T-RackS modules with metering.', ['Chains of modules in series or parallel', 'Album assembly and loudness metering']);
PI('One', 'IK’s all-in-one mastering processor: EQ, compressor, saturation and limiter with simple controls.', ['Quick mastering with few knobs']);
PI('Bass One', 'IK’s bass processing plugin for bass guitar and synth bass.');
PI('Brickwall Limiter', 'IK’s transparent brickwall limiter for mastering.', ['True peak', 'Several styles']);
PI('British Channel', 'IK’s emulation of an SSL 4000 E channel strip.', ['EQ, dynamics and filters', 'Punchy British console sound']);
PI('Bus Compressor', 'IK’s SSL-style bus compressor.', ['Mix-bus glue']);
PI('CSR Hall|CSR Plate|CSR Room|CSR Inverse', 'IK’s Classik Studio Reverb – algorithmic reverbs (hall, plate, room, inverse).', ['Clean, adjustable reverbs']);
PI('Channel Strip X', 'IK’s modern channel strip: gate, compressor and EQ.');
PI('Classic Clipper', 'IK’s clipper for shaving peaks before the limiter.', ['Soft or hard clipping']);
PI('Classic Comp', 'IK’s simple general-purpose compressor.');
PI('Classic EQ', 'IK’s simple general-purpose equalizer.');
PI('Classic Multi Band Limiter', 'IK’s multiband limiter for mastering.');
PI('Comprexxor', 'IK’s versatile compressor with sidechain filter and saturation.');
PI('De Esser', 'IK’s de-esser for vocals.', ['Split or wideband mode']);
PI('Delay Lab', 'IK’s multi-tap delay with modulation and filters.');
PI('Dual Spring', 'IK’s spring reverb emulation.');
PI('Dyna-Mu', 'IK’s emulation of the Manley Variable Mu tube compressor.', ['Smooth mastering glue']);
PI('EQ-73', 'IK’s emulation of the Neve 1073 EQ.');
PI('EQ-81', 'IK’s emulation of the Neve 1081 EQ.');
PI('EQual', 'IK’s clean parametric EQ with analyser.');
PI('Fame Studio Reverb', 'IK’s reverb modelled on the live room and chambers of FAME Studios, Muscle Shoals.');
PI('Filter Fusion', 'IK’s creative multimode filter effect.');
PI('Joe Chiccarelli Vocal Strip', 'IK’s vocal channel strip designed with producer Joe Chiccarelli.', ['De-esser, EQ, compression and saturation in one']);
PI('Leslie', 'IK’s rotary speaker (Leslie) emulation.', ['Slow/fast rotor with ramp', 'Organs, guitars and keys']);
PI('Linear Phase EQ', 'IK’s linear-phase EQ for mastering.');
PI('Lo-Fi Punch', 'IK’s lo-fi compressor for crunchy, pumping drums.');
PI('Master EQ-432', 'IK’s emulation of the Sontec MES-432 mastering EQ.');
PI('Master Match X', 'IK’s mastering tool that matches the tone and loudness of a reference track.');
PI('Metering', 'IK’s loudness, peak, phase and spectrum meters.');
PI('Mic Room', 'IK’s room simulation that adds realistic microphone ambience.');
PI('Opto Comp', 'IK’s optical compressor emulation.');
PI('Precision Comp-Limiter', 'IK’s transparent compressor-limiter.');
PI('Pusher', 'IK’s one-knob tool for more punch and loudness.');
PI('Quad Compressor|Quad Limiter', 'IK’s four-band multiband compressor / limiter.');
PI('Quad Image', 'IK’s four-band stereo imager.');
PI('Saturator X', 'IK’s saturation plugin with several analog-style models.');
PI('Space Delay', 'IK’s emulation of a Roland Space Echo-style tape delay.');
PI('Stealth Limiter', 'IK’s transparent mastering limiter.');
PI('Sunset Sound Studio Reverb', 'IK’s reverb modelled on the rooms and chambers of Sunset Sound, Hollywood.');
PI('TASCAM 388|TASCAM PORTA ONE', 'IK’s emulations of TASCAM tape recorders – lo-fi cassette (Porta One) and reel-to-reel (388) colour.');
PI('TEAC A-3340S|TEAC A-6100', 'IK’s emulations of TEAC tape machines.', ['Tape saturation and wobble']);
PI('Tape Echo', 'IK’s tape echo emulation.');
PI('Tape Machine 24|Tape Machine 440|Tape Machine 80|Tape Machine 99', 'IK’s tape machine emulations (Ampex/Studer/Otari/MCI-style models).', ['Tape saturation, compression and noise']);
PI('The Farm Stone Room', 'IK’s reverb modelled on the stone room at The Farm studio (Genesis).');
PI('VC-670', 'IK’s emulation of the Fairchild 670 tube limiter.');
PI('White Channel', 'IK’s emulation of an SSL 4000 G channel strip.');
