'use strict';
/* PlugShelf – category corrections and second categories.
   The scanner picks one category from the plugin's own tags and name; this table fixes known misses and adds
   further categories a plugin belongs to as well (e.g. a mastering EQ that also restores). First match wins.
   [pattern on the plugin name, main category, ...also] */
const CAT_FIX = [
  [/\b(vocal|bass|mix|drum)?\s*rider\b/i, 'Dynamics', 'Vocal'],
  [/^claro\b/i, 'Mastering', 'EQ', 'Restoration'],
  [/ozone \d+ clarity/i, 'Mastering', 'EQ', 'Restoration'],
  [/ozone \d+ (dynamics|maximizer|vintage (compressor|limiter)|unlimiter|impact)/i, 'Mastering', 'Dynamics'],
  [/ozone \d+ (equalizer|dynamic eq|match eq|vintage eq|stem eq|spectral shaper)/i, 'Mastering', 'EQ'],
  [/ozone \d+ (imager)/i, 'Mastering', 'Spatial'],
  [/ozone \d+ (exciter|vintage tape)/i, 'Mastering', 'Distortion'],
  [/ozone \d+ (master rebalance)/i, 'Mastering', 'Restoration'],
  [/neutron \d+ (compressor|gate|transient)/i, 'Dynamics', 'Channel Strip'],
  [/neutron \d+ (equalizer|sculptor|unmask)/i, 'EQ', 'Channel Strip'],
  [/neutron \d+ exciter/i, 'Distortion', 'Channel Strip'],
  [/neutron \d+ visual mixer/i, 'Utility', 'Channel Strip'],
  [/nectar \d+ (compressor|gate|deesser|auto-level|breath control)/i, 'Vocal', 'Dynamics'],
  [/nectar \d+ equalizer/i, 'Vocal', 'EQ'],
  [/nectar \d+ (pitch|voices|backer)/i, 'Vocal', 'Pitch'],
  [/nectar \d+ saturation/i, 'Vocal', 'Distortion'],
  [/nectar \d+ (reverb)/i, 'Reverb', 'Vocal'],
  [/nectar \d+ (delay)/i, 'Delay', 'Vocal'],
  [/nectar \d+ dimension/i, 'Modulation', 'Vocal'],
  [/rx \d+ (de-ess|breath control|voice de-noise|mouth de-click|de-plosive|dialogue isolate)/i, 'Restoration', 'Vocal'],
  [/rx \d+ (connect|monitor)/i, 'Utility', 'Restoration'],
  [/oxford inflator/i, 'Mastering', 'Distortion'],
  [/^t-racks|^one$/i, 'Mastering', 'Dynamics'],
  [/shadow hills.*master|bus force|weiss mm-1|elysia alpha master|weiss compressor limiter/i, 'Mastering', 'Dynamics'],
  [/elysia museq master|dangerous bax eq master|master eq-432/i, 'Mastering', 'EQ'],
  [/elysia karacter master/i, 'Mastering', 'Distortion'],
  [/bx_masterdesk/i, 'Mastering', 'EQ', 'Dynamics'],
  [/apu loudness|smartlimit|pro-l\b|bx_limiter|stealth limiter|brickwall/i, 'Dynamics', 'Mastering'],
  [/avalon vt-737|\b610-?[ab]\b|ua 610|\bcs-1\b|pre 1973|british channel|white channel/i, 'Channel Strip', 'EQ'],
  [/ssl g bus compressor|neve 33609|neve 2254|api 2500/i, 'Dynamics', 'Mastering'],
  [/trackspacer/i, 'Dynamics', 'EQ'],
  [/soothe|spiff/i, 'EQ', 'Dynamics'],
  [/dyneq|dynamic eq/i, 'EQ', 'Dynamics'],
  [/de-?ess|pro-ds|weiss ds1|weiss deess/i, 'Dynamics', 'Vocal'],
  [/\bleslie\b/i, 'Modulation'],
  [/ms-20 ?fx/i, 'Filter', 'Distortion'],
  [/h3000/i, 'Pitch', 'Delay', 'Modulation'],
  [/precision time align|riplink/i, 'Utility'],
  [/silencer/i, 'Restoration', 'Dynamics'],
  [/vumt|teleVU|dorrough(?!360)/i, 'Analyzer'],
  [/span plus/i, 'Analyzer'],
  [/kiss of shame|^trash$|sp950|ak9x|s12x|samplex3/i, 'Distortion'],
  [/chain (follower|leader)/i, 'Dynamics', 'Utility'],
  [/vision 4x/i, 'Analyzer'],
  [/motion harmonic/i, 'Modulation', 'EQ'],
  [/graindad|effectrix|turnado|shaperbox|kaoss pad|^dust \(fx\)|intensity|photism|effectrack|legend hz fx|cascadia/i, 'Creative'],
  [/drumazon|drumcomputer|^kick \d|phoscyon/i, 'Drums', 'Synth'],
  [/rapidcomposer|tugmidiseq|multiclock/i, 'MIDI'],
  [/unmix drums/i, 'Drums', 'Restoration'],
  [/unfilter|unveil|unchirp/i, 'Restoration', 'EQ'],
  [/bx_enhancer|enhancer hz/i, 'EQ', 'Distortion'],
  [/subhoofer|bx_subsynth|low control|bx_boom|ozone \d+ (bass control|low end focus)/i, 'EQ', 'Distortion'],
  [/auto-?tune|pitchmonster|vovious/i, 'Pitch', 'Vocal'],
  [/kontakt/i, 'Sampler'],
];

/** [main, ...also] for a plugin name and the scanner's category. */
function fixCategory(name, scanned) {
  for (const [re, main, ...also] of CAT_FIX) if (re.test(name)) return [main, ...also.filter(x => x !== main)];
  return [scanned];
}
