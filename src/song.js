// "Tines & Time" — a ~2-minute generative arpeggio composition for the phase8.
//
// Built from several sources:
//   - The "axis" pop progression I-V-vi-IV (Axis of Awesome's "4 Chords").
//   - A Pachelbel-style descending sequence (vi-iii-IV-I) in the bridge.
//   - A John-Cage-prepared-piano interlude where single tines repeat
//     hypnotically and the tempo crashes to a near-standstill (BPM 30) before
//     a sudden burst back to a 140-BPM chord-stab climax.
//
// Designed for the default phase8 install: C major resonators, C3..C4. Every
// chord referenced (I, ii, iii, IV, V, vi) generates triads that sit cleanly
// on those eight tines after snap-to-tines.
//
// Engine features the piece exercises:
//   - Per-scene BPM (sudden tempo shifts: 88 → 105 → 30 → 140 → 50)
//   - Pauses (`notes: []` empties the arp -> silence)
//   - Explicit single-tine sequences (`notes: [48]`) for Cage repetition
//   - Full phase8 CC palette automated:
//       AIR (slider, CC 30)         — tight intro → feedback-edge chorus → exhale
//       MOD DEPTH / MOD RATE (28/29)— slow swell → shimmer → psychedelia
//       ENVELOPE per resonator      — long sustains in chorus, percussive in bridge
//       VELOCITY per resonator      — ducks for verses, slams for chorus
//   - `chaos` (0..1) — per-beat random walk on global CCs, so the bridge
//     actually sounds like it's coming apart instead of holding a fixed setting

// phase8 CC numbers (manual §12.0 MIDI Implementation Chart).
export const PHASE8_CC = {
  velocity: [12, 13, 14, 15, 16, 17, 18, 19],   // per resonator slot 1..8
  envelope: [20, 21, 22, 23, 24, 25, 26, 27],   // per resonator slot 1..8
  modDepth: 28,
  modRate:  29,
  air:      30,
  tempo:    31,
  shift:    90,
  modType:  92,
};

const _ = undefined; // shorthand for "inherit from previous scene"

// Each song is a self-contained composition. Same engine vocabulary, different
// musical territory. All use the default phase8 install (C major C3..C4) — the
// minor-key songs run in A minor and the modal song in D Dorian, both of which
// share the C-major scale notes so every chord lands on installed tines.
export const TINES_AND_TIME = {
  title: "Tines & Time",
  subtitle: "axis pop · pachelbel bridge · cage interlude · 2 min",
  bpm: 88, // default; per-scene `bpm` overrides
  key: "C", mode: "major",
  // chord = diatonic-triad index (0=I, 1=ii, ... 6=vii°) for the current key.
  // notes = array of MIDI pitches (overrides chord lookup); [] = silence.
  scenes: [
    // ── Intro (2 bars @ 88) — tight + dry ────────────────────────────
    { name: "intro",     bars: 2, chord: 0, bpm: 88, pattern: "up",  rate: "1/8",  octaves: 1, gate: 0.55, swing: 0, velocity: 70,
      cc: { air: 25, modDepth: 8,  modRate: 35, envelope: 60, velocity: 70  }, chaos: 0 },

    // ── Verse 1 (6 bars) — I-V-vi ────────────────────────────────────
    { name: "verse 1·a", bars: 2, chord: 0, velocity: 82,
      cc: { air: 38, modDepth: 18, modRate: 42, envelope: 65, velocity: 82  }, chaos: 0.06 },
    { name: "verse 1·b", bars: 2, chord: 4 },
    { name: "verse 1·c", bars: 2, chord: 5 },

    // ── PAUSE (1 bar) — sudden silence to set up V2 entry ────────────
    { name: "·· pause",  bars: 1, notes: [], cc: { air: 80, modDepth: 0, modRate: 0, envelope: 60, velocity: 0 }, chaos: 0 },

    // ── Verse 2 (6 bars) — lifted updown, +1 oct ─────────────────────
    { name: "verse 2·a", bars: 2, chord: 0, pattern: "updown", octaves: 2, gate: 0.5, velocity: 92,
      cc: { air: 55, modDepth: 32, modRate: 55, envelope: 72, velocity: 92  }, chaos: 0.10 },
    { name: "verse 2·b", bars: 2, chord: 4 },
    { name: "verse 2·c", bars: 2, chord: 5 },

    // ── Pre-chorus (6 bars) — converge/diverge, swing in, build ──────
    { name: "pre·a",     bars: 2, chord: 3, pattern: "converge", rate: "1/16", gate: 0.45, swing: 0.08, velocity: 100,
      cc: { air: 78, modDepth: 55, modRate: 72, envelope: 82, velocity: 100 }, chaos: 0.18 },
    { name: "pre·b",     bars: 2, chord: 4 },
    { name: "pre·c",     bars: 2, chord: 2, pattern: "diverge" },

    // ── Chorus (6 bars @ 105 BPM) — TEMPO LIFT ───────────────────────
    { name: "chorus·a",  bars: 2, chord: 5, bpm: 105, pattern: "up", rate: "1/16", octaves: 3, gate: 0.55, swing: 0.05, velocity: 115,
      cc: { air: 105, modDepth: 88, modRate: 90, envelope: 95, velocity: 115 }, chaos: 0.22 },
    { name: "chorus·b",  bars: 2, chord: 3 },
    { name: "chorus·c",  bars: 2, chord: 0 },

    // ── Cage interlude — single-tine repetition + tempo crashes ──────
    // 2 bars of just C3 hammering, slowed to 60 BPM
    { name: "cage·c3",   bars: 2, notes: [48], bpm: 60, pattern: "up", rate: "1/8", octaves: 1, gate: 0.6, swing: 0, velocity: 38,
      cc: { air: 100, modDepth: 30, modRate: 25, envelope: 90, velocity: 38 }, chaos: 0.04 },
    // 2 bars of G3 alone, same tempo
    { name: "cage·g3",   bars: 2, notes: [55], velocity: 55,
      cc: { velocity: 55 } },
    // 1 bar of a single C4 at BPM 30 — almost stopped
    { name: "·· slow",   bars: 1, notes: [60], bpm: 30, gate: 0.95, velocity: 70,
      cc: { air: 110, envelope: 110, velocity: 70 } },
    // 1 bar of total silence
    { name: "·· still",  bars: 1, notes: [], bpm: 88, cc: { air: 30, envelope: 0 } },

    // ── Bridge (3 bars @ 78) — psychedelic CHAOS ─────────────────────
    { name: "bridge·a",  bars: 1, chord: 5, bpm: 78, pattern: "random", rate: "1/16", octaves: 2, gate: 0.4, velocity: 100,
      cc: { air: 122, modDepth: 115, modRate: 118, envelope: 100, velocity: 105 }, chaos: 0.65 },
    { name: "bridge·b",  bars: 1, chord: 2 },
    { name: "bridge·c",  bars: 1, chord: 3 },

    // ── Burst (1 bar @ 140) — sudden chord-stab climax ───────────────
    { name: "!! burst",  bars: 1, chord: 0, bpm: 140, pattern: "chord", rate: "1/8", octaves: 2, gate: 0.5, velocity: 127,
      cc: { air: 90, modDepth: 70, modRate: 80, envelope: 105, velocity: 127 }, chaos: 0.3 },

    // ── Outro (5 bars, decelerating) ─────────────────────────────────
    { name: "outro·a",   bars: 2, chord: 5, bpm: 80, pattern: "down", rate: "1/8", octaves: 1, gate: 0.7, velocity: 85,
      cc: { air: 60, modDepth: 28, modRate: 50, envelope: 78, velocity: 85 }, chaos: 0.08 },
    { name: "outro·b",   bars: 2, chord: 4, bpm: 65 },
    // Final I held — chord pattern at 1/4 with 99% gate = a sustained ring
    { name: "outro·end", bars: 2, chord: 0, bpm: 50, pattern: "chord", rate: "1/4", gate: 0.99, velocity: 60,
      cc: { air: 22, modDepth: 5,  modRate: 18, envelope: 60, velocity: 60 }, chaos: 0 },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 2. PRELUDE — after Bach's Prelude in C, BWV 846 (1722). Continuous broken
//    chords, locked tempo, no chaos. Pure mathematical motion.
// ──────────────────────────────────────────────────────────────────────────
export const PRELUDE = {
  title: "Prelude",
  subtitle: "after Bach · BWV 846",
  bpm: 76,
  key: "C", mode: "major",
  scenes: [
    { name: "intro",  bars: 2, chord: 0, bpm: 76, pattern: "up", rate: "1/16", octaves: 1, gate: 0.5, swing: 0, velocity: 80,
      cc: { air: 18, modDepth: 5, modRate: 30, envelope: 70, velocity: 80 }, chaos: 0 },
    // A: tonic-dominant prolongation
    { name: "A·1", bars: 2, chord: 0 }, { name: "A·2", bars: 2, chord: 5 },
    { name: "A·3", bars: 2, chord: 1 }, { name: "A·4", bars: 2, chord: 4 },
    { name: "A·5", bars: 2, chord: 2 }, { name: "A·6", bars: 2, chord: 5 },
    { name: "A·7", bars: 2, chord: 3 }, { name: "A·8", bars: 2, chord: 4 },
    // B: deeper journey, octaves up for richness
    { name: "B·1", bars: 2, chord: 0, octaves: 2,
      cc: { air: 32, envelope: 78 } },
    { name: "B·2", bars: 2, chord: 3 }, { name: "B·3", bars: 2, chord: 6 },
    { name: "B·4", bars: 2, chord: 2 }, { name: "B·5", bars: 2, chord: 5 },
    { name: "B·6", bars: 2, chord: 1 }, { name: "B·7", bars: 2, chord: 4 },
    // Coda — back to root with long sustain
    { name: "coda·1", bars: 2, chord: 0, octaves: 1, pattern: "up",
      cc: { air: 24 } },
    { name: "coda·2", bars: 4, chord: 0, pattern: "chord", rate: "1/4", gate: 0.99, velocity: 70,
      cc: { air: 18, envelope: 90, velocity: 70 } },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 3. PULSE — Steve Reich minimalism. One chord held for many bars, octaves
//    morph slowly, low chaos for organic phasing. "Music for 18 Musicians"
//    in spirit.
// ──────────────────────────────────────────────────────────────────────────
export const PULSE = {
  title: "Pulse",
  subtitle: "after Reich · phase music for 18 tines",
  bpm: 132,
  key: "A", mode: "minor",  // i=Am, iv=Dm, v=Em, VI=F, VII=G — all on C-maj tines
  scenes: [
    // Long single-chord stretches; the variation comes from CC drift, not chord changes.
    { name: "A·i  (Am)",   bars: 12, chord: 0, bpm: 132, pattern: "up", rate: "1/16", octaves: 1, gate: 0.45, swing: 0, velocity: 88,
      cc: { air: 45, modDepth: 22, modRate: 60, envelope: 70, velocity: 88 }, chaos: 0.08 },
    { name: "B·i  (oct 2)",bars: 12, chord: 0, octaves: 2, velocity: 95,
      cc: { air: 60, envelope: 78, velocity: 95 }, chaos: 0.10 },
    { name: "C·VII (G)",   bars: 10, chord: 6, octaves: 2, velocity: 100,
      cc: { air: 70, modDepth: 35, envelope: 82, velocity: 100 }, chaos: 0.12 },
    { name: "D·VI (F)",    bars: 10, chord: 5, octaves: 3, velocity: 108,
      cc: { air: 85, modDepth: 50, envelope: 88, velocity: 108 }, chaos: 0.14 },
    { name: "E·III(C)",    bars: 8,  chord: 2, octaves: 2,
      cc: { air: 70, modDepth: 35, envelope: 78 }, chaos: 0.10 },
    { name: "F·i  (return)",bars: 8, chord: 0, octaves: 1, velocity: 80,
      cc: { air: 40, modDepth: 18, envelope: 72, velocity: 80 }, chaos: 0.06 },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 4. DRIFT — Brian Eno ambient. Very slow, mostly chord-pads with tons of
//    AIR, sparse phrases punctuated by silence. "Music for Airports" vibe.
// ──────────────────────────────────────────────────────────────────────────
export const DRIFT = {
  title: "Drift",
  subtitle: "after Eno · music for tines",
  bpm: 48,
  key: "A", mode: "minor",
  scenes: [
    { name: "fade in",  bars: 2, chord: 0, bpm: 48, pattern: "chord", rate: "1/4", octaves: 1, gate: 0.99, swing: 0, velocity: 40,
      cc: { air: 95, modDepth: 12, modRate: 18, envelope: 110, velocity: 40 }, chaos: 0 },
    { name: "i (Am)",   bars: 4, chord: 0, velocity: 55,
      cc: { air: 100, envelope: 115, velocity: 55 } },
    { name: "·· quiet", bars: 2, notes: [], cc: { air: 110 } },
    { name: "VI (F)",   bars: 4, chord: 5, velocity: 50,
      cc: { air: 105, modDepth: 18, envelope: 115, velocity: 50 } },
    { name: "·· quiet", bars: 2, notes: [], cc: { air: 115 } },
    { name: "iv (Dm)",  bars: 4, chord: 3, velocity: 45,
      cc: { air: 110, envelope: 118, velocity: 45 } },
    { name: "·· dream", bars: 3, notes: [], cc: { air: 120, modDepth: 30 } },
    { name: "v (Em)",   bars: 4, chord: 4, velocity: 60,
      cc: { air: 115, envelope: 120, velocity: 60 } },
    { name: "·· quiet", bars: 2, notes: [], cc: { air: 100 } },
    { name: "i return", bars: 6, chord: 0, velocity: 50,
      cc: { air: 90, envelope: 125, velocity: 50 } },
    { name: "fade out", bars: 4, notes: [], cc: { air: 30, envelope: 0 } },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 5. DRIVER — John Carpenter synthwave. Minor key, descending ostinato, locked
//    96 BPM, big air for cinema, dynamics build to drop. Halloween / Escape
//    from NY territory.
// ──────────────────────────────────────────────────────────────────────────
export const DRIVER = {
  title: "Driver",
  subtitle: "after Carpenter · cinematic minor ostinato",
  bpm: 96,
  key: "A", mode: "minor",
  scenes: [
    { name: "intro·i",  bars: 4, chord: 0, bpm: 96, pattern: "down", rate: "1/16", octaves: 1, gate: 0.4, swing: 0, velocity: 95,
      cc: { air: 55, modDepth: 30, modRate: 70, envelope: 65, velocity: 95 }, chaos: 0.08 },
    { name: "build·i",  bars: 4, chord: 0, octaves: 2, velocity: 105,
      cc: { air: 75, modDepth: 50, envelope: 75, velocity: 105 } },
    { name: "drop·i",   bars: 4, chord: 0, octaves: 3, velocity: 122,
      cc: { air: 100, modDepth: 75, modRate: 95, envelope: 85, velocity: 122 }, chaos: 0.12 },
    { name: "drive·VII",bars: 4, chord: 6, octaves: 3, velocity: 122 },
    { name: "drive·VI", bars: 4, chord: 5, octaves: 3 },
    { name: "drive·v",  bars: 4, chord: 4, octaves: 3 },
    { name: "drive·i",  bars: 4, chord: 0, octaves: 3 },
    // Shock pause — Carpenter classic
    { name: "·· stop",  bars: 1, notes: [], cc: { air: 60, modDepth: 20 } },
    // Return with extra swagger
    { name: "back·i",   bars: 4, chord: 0, octaves: 2, velocity: 115,
      cc: { air: 85, modDepth: 60, envelope: 80, velocity: 115 }, chaos: 0.10 },
    { name: "back·VI",  bars: 4, chord: 5 },
    { name: "outro·i",  bars: 4, chord: 0, octaves: 1, velocity: 90,
      cc: { air: 60, modDepth: 30, envelope: 70, velocity: 90 }, chaos: 0.06 },
    { name: "fade",     bars: 2, chord: 0, pattern: "chord", rate: "1/4", gate: 0.99, velocity: 55,
      cc: { air: 30, envelope: 80, velocity: 55 } },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 6. GYMNOPÉDIE — Satie-inspired tender slow piece in D Dorian (so 7 of the
//    7 diatonic chords land on C-major tines and the modal flavour is gentle).
// ──────────────────────────────────────────────────────────────────────────
export const GYMNOPEDIE = {
  title: "Gymnopédie",
  subtitle: "after Satie · tender, sparse, slow",
  bpm: 60,
  key: "D", mode: "minor",  // D dorian if you flatten the appropriate scale degree, but minor reads close
  scenes: [
    { name: "i (Dm)",   bars: 3, chord: 0, bpm: 60, pattern: "played", rate: "1/4", octaves: 1, gate: 0.85, swing: 0, velocity: 60,
      cc: { air: 55, modDepth: 8, modRate: 25, envelope: 95, velocity: 60 }, chaos: 0 },
    { name: "·· rest",  bars: 1, notes: [], cc: { air: 60 } },
    { name: "VI (Bb→C)",bars: 3, chord: 5, velocity: 65,
      cc: { air: 60, envelope: 100, velocity: 65 } },
    { name: "·· rest",  bars: 1, notes: [] },
    { name: "VII (C)",  bars: 3, chord: 6, velocity: 70 },
    { name: "·· rest",  bars: 1, notes: [] },
    { name: "iv (Gm)",  bars: 3, chord: 3, velocity: 60,
      cc: { air: 65, envelope: 105, velocity: 60 } },
    { name: "·· rest",  bars: 1, notes: [] },
    { name: "v (Am)",   bars: 3, chord: 4, velocity: 65 },
    { name: "·· rest",  bars: 2, notes: [], cc: { air: 70 } },
    { name: "i return", bars: 4, chord: 0, pattern: "chord", rate: "1/4", gate: 0.95, velocity: 55,
      cc: { air: 50, envelope: 110, velocity: 55 } },
    { name: "·· silence", bars: 2, notes: [], cc: { air: 35, envelope: 0 } },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 7. INDETERMINACY — pure John Cage. Mostly single-tine random selections,
//    huge tempo swings between scenes, wild chaos values, frequent silence.
//    "Music of Changes" / "Indeterminacy" in spirit.
// ──────────────────────────────────────────────────────────────────────────
export const INDETERMINACY = {
  title: "Indeterminacy",
  subtitle: "after Cage · chance procedures for 8 tines",
  bpm: 90,
  key: "C", mode: "major",
  scenes: [
    { name: "C3 alone",   bars: 2, notes: [48], bpm: 70, pattern: "up", rate: "1/8", octaves: 1, gate: 0.7, swing: 0, velocity: 50,
      cc: { air: 80, modDepth: 40, modRate: 50, envelope: 95, velocity: 50 }, chaos: 0.3 },
    { name: "·· rest",    bars: 2, notes: [], cc: { air: 90 } },
    { name: "G3 fast",    bars: 1, notes: [55], bpm: 200, gate: 0.3, velocity: 90,
      cc: { air: 105, modDepth: 95, modRate: 110 }, chaos: 0.5 },
    { name: "·· rest",    bars: 1, notes: [] },
    { name: "C4 SLOW",    bars: 2, notes: [60], bpm: 35, gate: 0.95, velocity: 110,
      cc: { air: 115, modDepth: 70, envelope: 120, velocity: 110 }, chaos: 0.4 },
    { name: "scatter",    bars: 2, notes: [48, 55, 60], bpm: 110, pattern: "random", rate: "1/16", octaves: 1, velocity: 95,
      cc: { air: 90, modDepth: 80, modRate: 95 }, chaos: 0.8 },
    { name: "·· void",    bars: 3, notes: [], cc: { air: 60, modDepth: 0 } },
    { name: "burst chord",bars: 1, chord: 0, bpm: 160, pattern: "chord", rate: "1/16", octaves: 2, gate: 0.4, velocity: 127,
      cc: { air: 120, modDepth: 115, modRate: 120, envelope: 100, velocity: 127 }, chaos: 0.6 },
    { name: "F3 still",   bars: 2, notes: [53], bpm: 50, pattern: "up", rate: "1/4", gate: 0.9, velocity: 65,
      cc: { air: 100, envelope: 115, velocity: 65 }, chaos: 0.2 },
    { name: "·· silence", bars: 2, notes: [], cc: { air: 40 } },
    { name: "B3 dancing", bars: 2, notes: [59], bpm: 140, gate: 0.4, velocity: 100,
      cc: { air: 95, modDepth: 100, modRate: 105, envelope: 70 }, chaos: 0.7 },
    { name: "all tines",  bars: 1, notes: [48, 50, 52, 53, 55, 57, 59, 60], bpm: 60, pattern: "random", octaves: 1, velocity: 105,
      cc: { air: 110, modDepth: 90, envelope: 90 }, chaos: 0.55 },
    { name: "·· coda",    bars: 4, notes: [], cc: { air: 20, modDepth: 0, envelope: 0 } },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// 8. CHORAL — Arvo Pärt's tintinnabuli style. Held chord pads with vast
//    sustain, soft velocity, sacred minimalism. C major.
// ──────────────────────────────────────────────────────────────────────────
export const CHORAL = {
  title: "Choral",
  subtitle: "after Pärt · tintinnabuli",
  bpm: 50,
  key: "C", mode: "major",
  scenes: [
    { name: "I (C)",     bars: 4, chord: 0, bpm: 50, pattern: "chord", rate: "1/4", octaves: 1, gate: 0.99, swing: 0, velocity: 65,
      cc: { air: 70, modDepth: 8, modRate: 18, envelope: 120, velocity: 65 }, chaos: 0 },
    { name: "·· breath", bars: 1, notes: [], cc: { air: 75 } },
    { name: "vi (Am)",   bars: 4, chord: 5, velocity: 70,
      cc: { air: 75, envelope: 122, velocity: 70 } },
    { name: "·· breath", bars: 1, notes: [] },
    { name: "IV (F)",    bars: 4, chord: 3, velocity: 75,
      cc: { air: 80, envelope: 124, velocity: 75 } },
    { name: "·· breath", bars: 1, notes: [], cc: { air: 80 } },
    { name: "V (G)",     bars: 4, chord: 4, velocity: 80,
      cc: { air: 85, envelope: 126, velocity: 80 } },
    { name: "·· hush",   bars: 2, notes: [], cc: { air: 70 } },
    { name: "ii (Dm)",   bars: 3, chord: 1, velocity: 65,
      cc: { air: 70, envelope: 122, velocity: 65 } },
    { name: "V (G)",     bars: 3, chord: 4, velocity: 70 },
    { name: "I return",  bars: 6, chord: 0, velocity: 55,
      cc: { air: 60, envelope: 127, velocity: 55 } },
    { name: "·· amen",   bars: 4, notes: [], cc: { air: 25, envelope: 0 } },
  ],
};

// ──────────────────────────────────────────────────────────────────────────
// CLASSICAL CATALOGUE — sacred, organ, drone, minimalist. NOT the orchestral
// "bangers" — these pieces lean into the phase8's strengths: sustained tones,
// modal harmony, slow-evolving texture. Most are *played as melodies* (using
// pattern: "played" + explicit `notes:` arrays), not just rolled chord arps.
//
// All pitched within the default C-major C3..C4 install (MIDI 48..60). Major
// pieces sit in C major; minor / modal pieces sit in A minor (which uses the
// same scale notes), and Phrygian / Dorian etc. use the closest fit.
// ──────────────────────────────────────────────────────────────────────────

// Tine MIDI quick reference (default C-major install):
//   C3=48  D3=50  E3=52  F3=53  G3=55  A3=57  B3=59  C4=60
// Above 60 (octaves=2): C5=72, etc. Engine quantises any unsupported pitches
// back onto installed tines, so writing melodies inside 48..60 is safest.
const _baseCC = { air: 50, modDepth: 6, modRate: 22, envelope: 95 };

// helper to build a "played-melody" scene compactly
const m = (name, bars, notes, opts = {}) => ({
  name, bars, notes, pattern: "played", rate: opts.rate || "1/4",
  octaves: opts.oct || 1, gate: opts.gate ?? 0.85, swing: 0, velocity: opts.vel || 75,
  ...(opts.bpm    && { bpm: opts.bpm }),
  ...(opts.cc     && { cc: opts.cc }),
  ...(opts.chaos !== undefined && { chaos: opts.chaos }),
});
// helper for a "chord pad" scene (sustained chord)
const c = (name, bars, chord, opts = {}) => ({
  name, bars, chord, pattern: "chord", rate: opts.rate || "1/4",
  octaves: opts.oct || 1, gate: opts.gate ?? 0.95, swing: 0, velocity: opts.vel || 70,
  ...(opts.bpm    && { bpm: opts.bpm }),
  ...(opts.cc     && { cc: opts.cc }),
  ...(opts.chaos !== undefined && { chaos: opts.chaos }),
});
// helper for a "note rest" silence scene
const rest = (bars, opts = {}) => ({ name: "·· rest", bars, notes: [], cc: { air: opts.air || 70 } });

// 1 — Pachelbel Canon: melodic variation over the iconic 8-chord ostinato
const PACHELBEL_CANON = {
  title: "Pachelbel — Canon", subtitle: "Pachelbel · 1680 · played in C major",
  bpm: 60, key: "C", mode: "major",
  scenes: [
    c("intro",   2, 0, { bpm: 60, vel: 60, cc: { ..._baseCC, velocity: 60 }, chaos: 0 }),
    // chord-arp pass through I-V-vi-iii-IV-I-IV-V
    { name: "I",   bars: 1, chord: 0, pattern: "up", rate: "1/8", octaves: 1, gate: 0.5, velocity: 75 },
    { name: "V",   bars: 1, chord: 4 }, { name: "vi", bars: 1, chord: 5 }, { name: "iii", bars: 1, chord: 2 },
    { name: "IV",  bars: 1, chord: 3 }, { name: "I",  bars: 1, chord: 0 }, { name: "IV",  bars: 1, chord: 3 },
    { name: "V",   bars: 1, chord: 4 },
    // Canon melody pass: descending & ascending scalar fragments per chord
    m("mel·I",   1, [60,59,57,55,57,55,53,52], { rate: "1/8", vel: 90, cc: { air: 65 } }),
    m("mel·V",   1, [55,52,50,55,53,52,50,55]),
    m("mel·vi",  1, [57,55,52,57,55,52,50,52]),
    m("mel·iii", 1, [52,55,52,55,53,55,53,52]),
    m("mel·IV",  1, [53,52,50,48,50,52,53,55]),
    m("mel·I",   1, [55,52,48,52,55,57,55,52]),
    m("mel·IV",  1, [53,55,57,55,53,52,50,53]),
    m("mel·V",   1, [55,53,50,52,53,55,57,55]),
    // Final pass: full chord arp, octaves 2
    { name: "I°",   bars: 1, chord: 0, pattern: "up", rate: "1/16", octaves: 2, velocity: 105, cc: { air: 80 } },
    { name: "V°",   bars: 1, chord: 4 }, { name: "vi°", bars: 1, chord: 5 }, { name: "iii°", bars: 1, chord: 2 },
    { name: "IV°",  bars: 1, chord: 3 }, { name: "I°",  bars: 1, chord: 0 }, { name: "IV°",  bars: 1, chord: 3 },
    { name: "V°",   bars: 1, chord: 4 },
    c("amen", 4, 0, { gate: 0.99, vel: 60, cc: { air: 25, envelope: 105, velocity: 60 } }),
  ],
};

// 2 — Bach Air on the G String (transposed C major) — slow sustained melody
const BACH_AIR = {
  title: "Bach — Air on the G String", subtitle: "J.S. Bach · 1730 · played in C major",
  bpm: 56, key: "C", mode: "major",
  scenes: [
    c("intro", 2, 0, { bpm: 56, vel: 55, cc: { ..._baseCC, velocity: 55 }, chaos: 0 }),
    // The famous "Air" melody — long held high tone then descending phrases.
    // Pitch-reduced to fit C3..C4. 1/4 rate so each note is a half-bar pulse.
    m("phrase·1", 2, [60, 60, 60, 60, 57, 55, 53, 52], { rate: "1/4", vel: 78, cc: { air: 60 } }),
    c("I",  1, 0, { gate: 0.95, vel: 70 }),
    c("V",  1, 4),
    m("phrase·2", 2, [57, 55, 53, 52, 53, 55, 53, 52]),
    c("vi", 1, 5),
    c("ii", 1, 1),
    m("phrase·3", 2, [55, 53, 52, 50, 52, 50, 48, 50], { vel: 85, cc: { air: 70 } }),
    c("V", 1, 4), c("I", 1, 0),
    m("phrase·4·high", 2, [60, 59, 57, 55, 57, 60, 59, 57], { oct: 2, vel: 92, cc: { air: 80 } }),
    c("amen", 4, 0, { gate: 0.99, vel: 60, cc: { air: 25, envelope: 105, velocity: 60 } }),
  ],
};

// 3 — Bach Jesu, Joy of Man's Desiring — flowing scalar melody over diatonic chords
const BACH_JESU_JOY = {
  title: "Bach — Jesu, Joy of Man's Desiring", subtitle: "J.S. Bach · 1723 · played in C major",
  bpm: 80, key: "C", mode: "major",
  scenes: [
    c("intro", 2, 0, { bpm: 80, rate: "1/8", vel: 60, cc: { ..._baseCC, velocity: 60 }, chaos: 0 }),
    // First verse — flowing 9/8-style triplet phrases
    m("flow·1", 2, [48, 50, 52, 53, 55, 57, 55, 53, 52, 50, 52, 53], { rate: "1/8", vel: 80, cc: { air: 50 } }),
    m("flow·2", 2, [50, 52, 53, 55, 57, 59, 57, 55, 53, 52, 53, 55]),
    m("flow·3", 2, [52, 53, 55, 57, 59, 60, 59, 57, 55, 53, 55, 57], { vel: 90 }),
    m("flow·4", 2, [55, 57, 59, 60, 57, 55, 53, 52, 50, 48, 50, 52], { vel: 92, cc: { air: 65 } }),
    // Second verse — same shape, octaves up
    m("flow·5", 2, [48, 52, 55, 57, 60, 57, 55, 52, 53, 55, 57, 55], { oct: 2, vel: 98, cc: { air: 75 } }),
    m("flow·6", 2, [50, 52, 55, 57, 60, 59, 57, 55, 53, 52, 53, 55], { oct: 2, vel: 100 }),
    m("flow·7", 2, [52, 55, 57, 60, 59, 57, 55, 53, 52, 50, 52, 53], { oct: 2, vel: 102 }),
    m("flow·8", 2, [55, 57, 60, 59, 57, 55, 53, 52, 50, 48, 50, 52], { oct: 2, vel: 100 }),
    c("amen", 4, 0, { gate: 0.99, vel: 65, cc: { air: 30, envelope: 110, velocity: 65 } }),
  ],
};

// 4 — Bach Toccata in D minor BWV 565 — the iconic organ opening gesture
const BACH_TOCCATA = {
  title: "Bach — Toccata in D minor", subtitle: "J.S. Bach · 1707 · BWV 565 · A minor",
  bpm: 80, key: "A", mode: "minor",
  scenes: [
    // Iconic opening: A-G-A (mordent feel) then long held A — three times, descending
    m("call·1", 1, [57, 55, 57], { bpm: 80, rate: "1/16", oct: 1, vel: 110, gate: 0.6, cc: { air: 70, modDepth: 30, envelope: 95, velocity: 110 }, chaos: 0.05 }),
    c("hold·1", 2, 0, { gate: 0.99, vel: 95 }),
    m("call·2", 1, [52, 50, 52], { vel: 110 }),
    c("hold·2", 2, 0, { vel: 90 }),
    m("call·3", 1, [48, 47, 48], { vel: 115 }),
    c("hold·3", 3, 0, { gate: 0.99, vel: 85 }),
    // Diminished-chord passage — vii° for the dramatic suspended feel
    { name: "vii°", bars: 1, chord: 6, pattern: "down", rate: "1/16", octaves: 2, gate: 0.5, velocity: 110, cc: { air: 90, modDepth: 60 }, chaos: 0.1 },
    { name: "V",    bars: 1, chord: 4, pattern: "down" },
    { name: "i",    bars: 2, chord: 0, pattern: "up",   rate: "1/16", octaves: 2, vel: 110 },
    // Cascading flourish — descending scale fragments at high speed
    m("flourish·1", 2, [60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48], { rate: "1/16", oct: 2, vel: 120, gate: 0.5, cc: { air: 100, modDepth: 80 }, chaos: 0.12 }),
    m("flourish·2", 2, [48, 50, 52, 53, 55, 57, 59, 60, 48, 50, 52, 53, 55, 57, 59, 60, 48, 50, 52, 53, 55, 57, 59, 60, 48, 50, 52, 53, 55, 57, 59, 60], { rate: "1/16", oct: 2, vel: 122, cc: { air: 105 }, chaos: 0.15 }),
    // Final massive chord
    c("ENDING", 4, 0, { gate: 0.99, vel: 90, cc: { air: 60, envelope: 120, velocity: 90 } }),
    c("amen",   2, 0, { gate: 0.99, vel: 70, cc: { air: 30, envelope: 125, velocity: 70 } }),
  ],
};

// 5 — Bach Cello Suite No. 1 Prelude — naturally an arpeggio
const BACH_CELLO_PRELUDE = {
  title: "Bach — Cello Suite No. 1 Prelude", subtitle: "J.S. Bach · 1720 · transposed to C major",
  bpm: 84, key: "C", mode: "major",
  scenes: [
    { name: "intro", bars: 2, chord: 0, bpm: 84, pattern: "up", rate: "1/16", octaves: 1, gate: 0.5, swing: 0, velocity: 75, cc: { ..._baseCC, velocity: 75 }, chaos: 0 },
    // First pass through chord cycle
    { name: "I",   bars: 1, chord: 0 }, { name: "IV", bars: 1, chord: 3 }, { name: "V",  bars: 1, chord: 4 }, { name: "I",  bars: 1, chord: 0 },
    { name: "vi",  bars: 1, chord: 5 }, { name: "IV", bars: 1, chord: 3 }, { name: "V",  bars: 1, chord: 4 }, { name: "I",  bars: 1, chord: 0 },
    // Second pass — octaves up
    { name: "ii", bars: 1, chord: 1, octaves: 2, velocity: 90, cc: { air: 70 } },
    { name: "V·b",  bars: 1, chord: 4 }, { name: "I·b",  bars: 1, chord: 0 }, { name: "V·c",  bars: 1, chord: 4 },
    { name: "I°2",  bars: 1, chord: 0 }, { name: "IV·b", bars: 1, chord: 3 }, { name: "vi·b", bars: 1, chord: 5 }, { name: "V·d", bars: 1, chord: 4 },
    // Third pass — full octaves
    { name: "I°3", bars: 1, chord: 0, octaves: 2, velocity: 105, cc: { air: 85 } },
    { name: "vii°",bars: 1, chord: 6 }, { name: "iii", bars: 1, chord: 2 }, { name: "vi°",bars: 1, chord: 5 },
    { name: "ii°", bars: 1, chord: 1 }, { name: "V°",  bars: 1, chord: 4 }, { name: "I·hold", bars: 2, chord: 0, octaves: 2 },
    c("amen", 4, 0, { gate: 0.99, vel: 65, cc: { air: 30, envelope: 110, velocity: 65 } }),
  ],
};

// 6 — Bach Passacaglia in C minor BWV 582 — 8-bar bass ostinato with variations
const BACH_PASSACAGLIA = {
  title: "Bach — Passacaglia in C minor", subtitle: "J.S. Bach · 1707 · BWV 582 · organ in A minor",
  bpm: 64, key: "A", mode: "minor",
  scenes: [
    // First the bass ostinato played alone — 8 notes descending in A minor (transposed from C minor)
    m("ostinato·1", 4, [57, 55, 53, 52, 50, 48, 50, 53], { bpm: 64, rate: "1/4", oct: 1, vel: 75, gate: 0.85, cc: { ..._baseCC, velocity: 75 }, chaos: 0 }),
    // Variations layer chord pads on the same bass
    c("var·1·i",   2, 0, { vel: 80, cc: { air: 55 } }),
    c("var·1·VII", 1, 6),
    c("var·1·VI",  1, 5),
    c("var·1·V",   2, 4),
    // Second pass with octaves up
    m("ostinato·2", 4, [57, 55, 53, 52, 50, 48, 50, 53], { oct: 2, vel: 95, cc: { air: 75 } }),
    c("var·2·i",   2, 0, { oct: 2, vel: 100 }),
    c("var·2·iv",  2, 3, { oct: 2 }),
    c("var·2·V",   2, 4, { oct: 2 }),
    c("amen", 4, 0, { gate: 0.99, vel: 70, cc: { air: 30, envelope: 110, velocity: 70 } }),
  ],
};

// 7 — Schubert Ave Maria — sacred melodic
const SCHUBERT_AVE_MARIA = {
  title: "Schubert — Ave Maria", subtitle: "Schubert · 1825 · played in C major",
  bpm: 60, key: "C", mode: "major",
  scenes: [
    c("intro", 2, 0, { bpm: 60, vel: 55, cc: { ..._baseCC, velocity: 55 }, chaos: 0 }),
    // "A-ve Ma-ri-a" - simplified melodic shape: ascending then descending
    m("verse·1", 4, [55, 60, 59, 60, 57, 55, 53, 55, 57, 55, 53, 52, 50, 48, 50, 52], { rate: "1/4", vel: 78, cc: { air: 55 } }),
    c("I",  1, 0, { gate: 0.95 }),
    c("IV", 1, 3),
    m("verse·2", 4, [57, 60, 59, 57, 55, 53, 52, 50, 52, 55, 53, 52, 50, 48, 50, 53], { vel: 85 }),
    c("ii", 1, 1, { gate: 0.95 }),
    c("V",  1, 4),
    m("climax", 4, [60, 60, 59, 57, 55, 57, 60, 59, 57, 55, 53, 52, 53, 50, 48, 50], { oct: 2, vel: 95, cc: { air: 70 } }),
    c("amen", 4, 0, { gate: 0.99, vel: 60, cc: { air: 30, envelope: 110, velocity: 60 } }),
  ],
};

// 8 — Satie Gymnopédie No. 1 — gentle melody, sparse harmony
const SATIE_GYM_1 = {
  title: "Satie — Gymnopédie No. 1", subtitle: "Satie · 1888 · played in C major",
  bpm: 70, key: "C", mode: "major",
  scenes: [
    c("intro·I",  2, 0, { bpm: 70, vel: 55, cc: { ..._baseCC, velocity: 55 }, chaos: 0 }),
    c("intro·IV", 2, 3, { vel: 55 }),
    // Famous descending melody: F# E D B (in D major) → in C: E D C A
    m("mel·1", 2, [52, 50, 48, 57, 52, 50, 48, 57], { rate: "1/4", vel: 75, cc: { air: 50 } }),
    c("I",  2, 0), c("IV", 2, 3),
    m("mel·2", 2, [55, 53, 52, 50, 55, 53, 52, 50]),
    c("vi", 2, 5), c("ii", 2, 1),
    m("mel·3", 2, [60, 59, 57, 55, 53, 52, 50, 48], { oct: 1, vel: 80 }),
    c("V",  2, 4), c("I",  2, 0),
    c("amen", 4, 0, { gate: 0.99, vel: 55, cc: { air: 25, envelope: 110, velocity: 55 } }),
  ],
};

// 9 — Albinoni Adagio — sacred-feeling melody with descending lines
const ALBINONI_ADAGIO = {
  title: "Albinoni — Adagio in G minor", subtitle: "Albinoni / Giazotto · 1958 · played in A minor",
  bpm: 50, key: "A", mode: "minor",
  scenes: [
    c("intro", 2, 0, { bpm: 50, vel: 55, cc: { ..._baseCC, velocity: 55 }, chaos: 0 }),
    // Famous descending melodic line with sigh-like phrasing
    m("phrase·1", 4, [57, 55, 53, 52, 50, 53, 52, 50, 48, 50, 52, 53, 55, 53, 52, 50], { rate: "1/4", vel: 78, cc: { air: 60 } }),
    c("i",  2, 0, { gate: 0.99, vel: 70 }),
    c("VI", 2, 5),
    m("phrase·2", 4, [55, 53, 52, 50, 48, 50, 52, 53, 55, 53, 52, 50, 48, 47, 48, 50], { vel: 82 }),
    c("V",  2, 4),
    c("i",  2, 0),
    m("climb", 4, [48, 50, 52, 53, 55, 57, 60, 59, 57, 55, 53, 52, 50, 48, 50, 52], { oct: 2, vel: 90, cc: { air: 75 } }),
    c("amen", 4, 0, { gate: 0.99, vel: 60, cc: { air: 30, envelope: 115, velocity: 60 } }),
  ],
};

// 10 — Carl Orff "O Fortuna" — iconic descending phrase, modal
const ORFF_O_FORTUNA = {
  title: "Orff — O Fortuna", subtitle: "Carl Orff · 1936 · Carmina Burana · A minor",
  bpm: 78, key: "A", mode: "minor",
  scenes: [
    // The iconic SLAM: i-iv-i, three loud chord stabs
    c("slam·1", 1, 0, { bpm: 78, gate: 0.4, vel: 127, cc: { air: 95, modDepth: 75, envelope: 80, velocity: 127 }, chaos: 0.1 }),
    c("slam·2", 1, 3, { gate: 0.4, vel: 127 }),
    c("slam·3", 1, 0, { gate: 0.4, vel: 127 }),
    rest(1, { air: 80 }),
    // Hushed chant section: "O for-tu-na, ve-lut lu-na, sta-tu var-i-a-bi-lis"
    m("chant·1", 2, [57, 55, 53, 55, 57, 57, 53, 55], { rate: "1/4", vel: 75, gate: 0.6, cc: { air: 70 } }),
    m("chant·2", 2, [57, 55, 53, 52, 53, 55, 53, 52], { vel: 78 }),
    m("chant·3", 2, [55, 53, 52, 50, 52, 53, 55, 53], { vel: 82 }),
    m("chant·4", 2, [55, 53, 50, 48, 50, 52, 53, 55], { vel: 88 }),
    // Build with the choral chords — i-VII-VI-V
    c("i",   1, 0, { vel: 105 }), c("VII", 1, 6, { vel: 110 }),
    c("VI",  1, 5, { vel: 115 }), c("V",   1, 4, { vel: 120 }),
    // Hammered final chant ascending
    m("hammer·1", 2, [57, 55, 53, 52, 50, 48, 50, 52], { oct: 2, vel: 122, gate: 0.4, cc: { air: 100 }, chaos: 0.15 }),
    m("hammer·2", 2, [48, 50, 52, 53, 55, 57, 55, 60], { oct: 2, vel: 125, cc: { air: 105 } }),
    // Final crash chord
    c("CRASH", 2, 0, { gate: 0.5, vel: 127, cc: { air: 110, modDepth: 90, envelope: 95 }, chaos: 0.2 }),
    c("end",   3, 0, { gate: 0.99, vel: 75, cc: { air: 35, envelope: 120, velocity: 75 } }),
  ],
};

// 11 — Pärt Spiegel im Spiegel — F major slow descending scale + held tonic
const PART_SPIEGEL = {
  title: "Pärt — Spiegel im Spiegel", subtitle: "Arvo Pärt · 1978 · tintinnabuli in C major",
  bpm: 50, key: "C", mode: "major",
  scenes: [
    c("hold·1", 6, 0, { bpm: 50, vel: 55, cc: { ..._baseCC, air: 80, velocity: 55 }, chaos: 0 }),
    // Slow melodic descents — m-voice (scalar) + held t-voice (chord)
    m("descend·1", 4, [60, 59, 57, 55, 53, 52, 50, 48], { rate: "1/4", vel: 60, gate: 0.95, cc: { air: 85 } }),
    c("hold·2", 4, 0, { vel: 55 }),
    m("descend·2", 4, [60, 59, 57, 55, 53, 52, 50, 48], { vel: 65 }),
    c("hold·3", 4, 4, { vel: 55 }), // shift to V
    m("descend·3", 4, [55, 53, 52, 50, 48, 50, 52, 53], { vel: 60 }),
    c("hold·4", 4, 0, { vel: 50 }),
    c("amen",   6, 0, { gate: 0.99, vel: 50, cc: { air: 60, envelope: 120, velocity: 50 } }),
  ],
};

// 12 — Pärt Für Alina — sparse, single voice, B minor → A minor
const PART_FUR_ALINA = {
  title: "Pärt — Für Alina", subtitle: "Arvo Pärt · 1976 · tintinnabuli in A minor",
  bpm: 40, key: "A", mode: "minor",
  scenes: [
    rest(2, { air: 90 }),
    // Just slow descending pairs — m-voice (scale) over t-voice (i held)
    m("dyad·1", 4, [60, 57, 59, 57], { bpm: 40, rate: "1/4", oct: 1, vel: 50, gate: 0.95, cc: { ..._baseCC, air: 95, envelope: 120, velocity: 50 }, chaos: 0 }),
    rest(1, { air: 95 }),
    m("dyad·2", 4, [57, 55, 53, 52], { vel: 55 }),
    rest(1, { air: 95 }),
    m("dyad·3", 4, [55, 53, 52, 50], { vel: 55 }),
    rest(1, { air: 95 }),
    m("dyad·4", 4, [52, 50, 48, 50], { vel: 60 }),
    rest(2, { air: 100 }),
    c("breath", 4, 0, { gate: 0.99, vel: 45, cc: { air: 60, envelope: 125, velocity: 45 } }),
  ],
};

// 13 — Pärt Cantus in Memoriam Britten — descending A minor scale at varying rates
const PART_CANTUS = {
  title: "Pärt — Cantus in Memoriam Britten", subtitle: "Arvo Pärt · 1977 · A minor descent",
  bpm: 60, key: "A", mode: "minor",
  scenes: [
    rest(1, { air: 100 }),
    // The cantus IS just the A natural minor scale descending, played at various rates.
    m("descent·slow", 4, [60, 59, 57, 55, 53, 52, 50, 48], { bpm: 60, rate: "1/4", oct: 1, vel: 60, gate: 0.9, cc: { ..._baseCC, air: 90, velocity: 60 }, chaos: 0 }),
    m("descent·mid",  4, [60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48], { rate: "1/8", vel: 75 }),
    m("descent·fast", 4, [60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48, 60, 59, 57, 55, 53, 52, 50, 48], { rate: "1/16", oct: 2, vel: 85, cc: { air: 100 } }),
    c("hold·i", 6, 0, { gate: 0.99, vel: 65, cc: { air: 95, envelope: 125 } }),
    c("amen",   4, 0, { gate: 0.99, vel: 50, cc: { air: 50, envelope: 127, velocity: 50 } }),
  ],
};

// 14 — Pärt Fratres — drone of A-E with descending modal motif
const PART_FRATRES = {
  title: "Pärt — Fratres", subtitle: "Arvo Pärt · 1977 · A minor drone",
  bpm: 70, key: "A", mode: "minor",
  scenes: [
    // Drone: A and E held (open 5th feel) — slow pulse at 1/4 with high gate
    m("drone·intro", 4, [48, 55, 48, 55], { bpm: 70, rate: "1/4", oct: 1, vel: 50, gate: 0.99, cc: { ..._baseCC, air: 95, envelope: 125, velocity: 50 }, chaos: 0 }),
    m("motif·1", 4, [57, 55, 53, 52, 53, 55, 57, 60], { rate: "1/4", vel: 65, gate: 0.85 }),
    c("drone", 4, 0, { gate: 0.99, vel: 55 }),
    m("motif·2", 4, [60, 57, 55, 53, 52, 53, 55, 57], { vel: 70 }),
    c("drone", 4, 0, { vel: 55 }),
    m("motif·3", 4, [57, 55, 53, 52, 50, 52, 53, 55], { oct: 2, vel: 80, cc: { air: 105 } }),
    c("drone", 6, 0, { gate: 0.99, vel: 50 }),
    c("amen",  4, 0, { gate: 0.99, vel: 45, cc: { air: 60, envelope: 125, velocity: 45 } }),
  ],
};

// 15 — Tavener The Lamb — modal melody in C major, sacred, parallel motion
const TAVENER_LAMB = {
  title: "Tavener — The Lamb", subtitle: "John Tavener · 1982 · sacred · C major",
  bpm: 64, key: "C", mode: "major",
  scenes: [
    c("intro", 2, 0, { bpm: 64, vel: 55, cc: { ..._baseCC, air: 70, velocity: 55 }, chaos: 0 }),
    // Modal melody: "Lit-tle Lamb, who made thee?" — gentle stepwise phrasing
    m("verse·1", 4, [60, 59, 60, 59, 57, 55, 57, 55, 53, 52, 53, 55, 53, 52, 50, 48], { rate: "1/4", vel: 70, gate: 0.85, cc: { air: 65 } }),
    c("V",  2, 4), c("I",  2, 0),
    m("verse·2", 4, [60, 59, 57, 55, 57, 55, 53, 52, 53, 55, 53, 52, 50, 52, 53, 50], { vel: 75 }),
    c("vi", 2, 5), c("IV", 2, 3),
    m("amen·mel", 4, [55, 53, 52, 50, 52, 53, 55, 57, 55, 53, 52, 50, 48, 50, 52, 48], { vel: 70 }),
    c("end", 4, 0, { gate: 0.99, vel: 55, cc: { air: 50, envelope: 120, velocity: 55 } }),
  ],
};

// 16 — Hildegard von Bingen O Virtus Sapientiae — modal chant (Dorian-ish)
const HILDEGARD_VIRTUS = {
  title: "Hildegard — O Virtus Sapientiae", subtitle: "Hildegard von Bingen · ~1150 · Dorian chant",
  bpm: 56, key: "A", mode: "minor",  // A minor / Aeolian fits the modal feel
  scenes: [
    rest(1, { air: 100 }),
    // Single-line chant — modal melismatic phrasing, slow stepwise motion
    m("verse·1", 4, [57, 59, 57, 55, 53, 52, 53, 55], { bpm: 56, rate: "1/4", oct: 1, vel: 65, gate: 0.85, cc: { ..._baseCC, air: 95, envelope: 110, velocity: 65 }, chaos: 0 }),
    m("verse·2", 4, [57, 55, 57, 60, 57, 55, 53, 52]),
    rest(1, { air: 100 }),
    m("verse·3", 4, [57, 55, 53, 52, 50, 52, 53, 55]),
    m("verse·4", 4, [55, 53, 52, 50, 48, 50, 52, 55], { vel: 70 }),
    rest(1, { air: 90 }),
    m("verse·5", 4, [57, 60, 59, 57, 55, 53, 52, 53], { vel: 70 }),
    m("amen·mel", 4, [55, 53, 52, 50, 48, 47, 48, 50]),
    c("end", 4, 0, { gate: 0.99, vel: 55, cc: { air: 70, envelope: 120, velocity: 55 } }),
  ],
};

// 17 — Allegri Miserere — Renaissance polyphony reduced to chord sequence + chant melody
const ALLEGRI_MISERERE = {
  title: "Allegri — Miserere mei, Deus", subtitle: "Allegri · 1638 · Renaissance · A minor",
  bpm: 56, key: "A", mode: "minor",
  scenes: [
    c("intro", 2, 0, { bpm: 56, vel: 55, gate: 0.99, cc: { ..._baseCC, air: 80, velocity: 55 }, chaos: 0 }),
    // Chant motion — repeated syllabic on tonic, descend, return
    m("chant·1", 4, [57, 57, 57, 55, 53, 55, 57, 55], { rate: "1/4", vel: 65, gate: 0.85 }),
    c("VII", 2, 6), c("i", 2, 0),
    m("chant·2", 4, [55, 55, 53, 52, 50, 52, 53, 55]),
    c("VI",  2, 5), c("V", 2, 4),
    m("verse·high", 4, [60, 60, 59, 57, 55, 53, 52, 50], { oct: 1, vel: 75, cc: { air: 90 } }),
    c("i",   2, 0),
    m("amen·mel", 4, [55, 53, 52, 50, 48, 50, 48, 47], { vel: 60 }),
    c("end", 4, 0, { gate: 0.99, vel: 50, cc: { air: 50, envelope: 122, velocity: 50 } }),
  ],
};

// 18 — Górecki Symphony No. 3 (Sorrowful Songs), 1st mvt — slow modal canon
const GORECKI_SYM3 = {
  title: "Górecki — Symphony of Sorrowful Songs", subtitle: "Henryk Górecki · 1976 · A minor",
  bpm: 50, key: "A", mode: "minor",
  scenes: [
    rest(1, { air: 105 }),
    // Slow modal melody, building
    m("phrase·1", 6, [48, 50, 52, 53, 55, 53, 52, 50, 48, 50, 52, 50], { bpm: 50, rate: "1/4", oct: 1, vel: 55, gate: 0.9, cc: { ..._baseCC, air: 90, envelope: 120, velocity: 55 }, chaos: 0 }),
    m("phrase·2", 6, [50, 52, 53, 55, 57, 55, 53, 52, 50, 52, 53, 50], { vel: 65 }),
    m("phrase·3", 6, [52, 53, 55, 57, 59, 57, 55, 53, 52, 53, 55, 52], { oct: 2, vel: 75, cc: { air: 100 } }),
    m("phrase·4·peak", 4, [60, 59, 57, 55, 57, 55, 53, 52, 50, 48, 50, 53, 55, 53, 52, 50], { oct: 2, vel: 85, cc: { air: 115 } }),
    c("descend", 4, 0, { gate: 0.99, vel: 60, cc: { air: 80, envelope: 125 } }),
    c("end", 4, 0, { gate: 0.99, vel: 45, cc: { air: 50, envelope: 127, velocity: 45 } }),
  ],
};

// 19 — Pachelbel Chaconne in F minor — organ ostinato variations (transposed to A minor)
const PACHELBEL_CHACONNE = {
  title: "Pachelbel — Chaconne in F minor", subtitle: "Pachelbel · 1693 · organ · A minor",
  bpm: 70, key: "A", mode: "minor",
  scenes: [
    // 4-bar bass ostinato: descending tetrachord A-G-F-E (chromatic feel reduced to diatonic)
    m("bass·alone", 4, [57, 55, 53, 52], { bpm: 70, rate: "1/4", oct: 1, vel: 75, gate: 0.85, cc: { ..._baseCC, air: 60, envelope: 100, velocity: 75 }, chaos: 0 }),
    // Variations layer chord pads on the ostinato
    c("var·1·i",  1, 0, { gate: 0.95 }), c("var·1·VII", 1, 6), c("var·1·VI", 1, 5), c("var·1·V", 1, 4),
    c("var·2·i",  1, 0, { vel: 85, oct: 2, cc: { air: 75 } }), c("var·2·VII", 1, 6), c("var·2·VI", 1, 5), c("var·2·V", 1, 4),
    // Melodic variation
    m("var·3·mel", 4, [60, 59, 57, 55, 53, 55, 57, 60, 57, 55, 53, 52, 50, 52, 53, 55], { rate: "1/8", vel: 90, gate: 0.6, cc: { air: 85 } }),
    c("var·4·i",  2, 0, { oct: 2, vel: 95 }),
    c("var·4·V",  2, 4, { oct: 2 }),
    c("end", 4, 0, { gate: 0.99, vel: 65, cc: { air: 35, envelope: 115, velocity: 65 } }),
  ],
};

// 20 — Terry Riley In C — pure C major, just rhythmic patterns over the tonic
const RILEY_IN_C = {
  title: "Riley — In C", subtitle: "Terry Riley · 1964 · minimalist · C major drone",
  bpm: 120, key: "C", mode: "major",
  scenes: [
    // The whole piece is in C; players choose from 53 cells. We approximate
    // with rhythmic variations over a continuous C-major drone.
    c("pulse·intro", 4, 0, { bpm: 120, rate: "1/8", gate: 0.6, vel: 70, cc: { ..._baseCC, air: 60, velocity: 70 }, chaos: 0.04 }),
    // Cell 1: short ascending pattern (E E F G)
    m("cell·1", 4, [52, 52, 53, 55], { rate: "1/8", vel: 80, gate: 0.55 }),
    // Cell 2: held G then turn (G A G E)
    m("cell·2", 4, [55, 57, 55, 52], { vel: 85 }),
    // Cell 3: rising fifths-feel (C E G C)
    m("cell·3", 4, [48, 52, 55, 60], { vel: 90, cc: { air: 75 } }),
    // Cell 4: descending pattern with octave (C E G E C E G E)
    m("cell·4", 4, [60, 55, 52, 48, 60, 55, 52, 48], { oct: 2, vel: 95, cc: { air: 85 } }),
    // Cell 5: pulse on E
    m("cell·5", 4, [52, 52, 52, 55, 52, 52, 52, 53], { vel: 95, gate: 0.45 }),
    // Sustained close
    c("hold·I", 4, 0, { rate: "1/4", gate: 0.99, vel: 70, cc: { air: 70, envelope: 115 } }),
    c("amen",   4, 0, { gate: 0.99, vel: 55, cc: { air: 35, envelope: 125, velocity: 55 } }),
  ],
};

export const CLASSICAL_SONGS = [
  PACHELBEL_CANON,
  PACHELBEL_CHACONNE,
  BACH_AIR,
  BACH_JESU_JOY,
  BACH_TOCCATA,
  BACH_PASSACAGLIA,
  BACH_CELLO_PRELUDE,
  SCHUBERT_AVE_MARIA,
  SATIE_GYM_1,
  ALBINONI_ADAGIO,
  ORFF_O_FORTUNA,
  PART_SPIEGEL,
  PART_FUR_ALINA,
  PART_CANTUS,
  PART_FRATRES,
  TAVENER_LAMB,
  HILDEGARD_VIRTUS,
  ALLEGRI_MISERERE,
  GORECKI_SYM3,
  RILEY_IN_C,
];

export const SONGS = [
  TINES_AND_TIME,
  PRELUDE,
  PULSE,
  DRIFT,
  DRIVER,
  GYMNOPEDIE,
  INDETERMINACY,
  CHORAL,
  ...CLASSICAL_SONGS,
];

// Total bar count cross-check happens in tests.

export class SongPlayer {
  // deps:
  //   song          — { bpm, scenes }
  //   getChord(idx) — returns array of MIDI pitches for diatonic chord index, snapped to tines
  //   applyScene(p) — setter the host uses to push pattern/rate/octaves/etc. into arp + scheduler + UI
  //   sendCC(num,v) — sends a Control Change message on the current channel
  //   onScene(scene, i, total)
  //   onEnd()
  //   schedule(cb, ms) -> id   (defaults to setTimeout for the browser)
  //   cancel(id)
  //   rng()         — function returning [0..1); deterministic in tests
  constructor(deps) {
    this.song       = deps.song || null;   // optional initial; can also be passed to play()
    this.getChord   = deps.getChord;
    this.applyScene = deps.applyScene;
    this.sendCC     = deps.sendCC  || (() => {});
    this.onScene    = deps.onScene || (() => {});
    this.onEnd      = deps.onEnd   || (() => {});
    this.schedule   = deps.schedule || ((cb, ms) => setTimeout(cb, ms));
    this.cancel     = deps.cancel   || ((id)     => clearTimeout(id));
    this.rng        = deps.rng     || Math.random;
    this.timers     = [];
    this.isPlaying  = false;
  }

  setSong(song) { this.song = song; }

  // Per-scene bpm overrides this.song.bpm; default if unset.
  _sceneBpm(i) { return this.song.scenes[i].bpm ?? this.song.bpm; }
  _sceneBeatMs(i) { return 60000 / this._sceneBpm(i); }
  _sceneBarMs(i)  { return this._sceneBeatMs(i) * 4; }

  totalMs() {
    return this.song.scenes.reduce((acc, _s, i) => acc + this.song.scenes[i].bars * this._sceneBarMs(i), 0);
  }

  // Returns the inherited param set at scene index i.
  resolveScene(i) {
    const out = {};
    for (let k = 0; k <= i; k++) {
      const s = this.song.scenes[k];
      for (const key of ["pattern", "rate", "octaves", "gate", "swing", "velocity", "bpm"]) {
        if (s[key] !== undefined) out[key] = s[key];
      }
      if (s.cc)                  out.cc    = { ...(out.cc || {}), ...s.cc };
      if (s.chaos !== undefined) out.chaos = s.chaos;
    }
    const s = this.song.scenes[i];
    out.chord = s.chord;
    out.notes = s.notes;
    out.name  = s.name;
    out.bars  = s.bars;
    if (out.bpm === undefined) out.bpm = this.song.bpm;
    return out;
  }

  sceneAtMs(t) {
    let acc = 0;
    for (let i = 0; i < this.song.scenes.length; i++) {
      const dur = this.song.scenes[i].bars * this._sceneBarMs(i);
      if (t < acc + dur) return { ...this.resolveScene(i), _startMs: acc };
      acc += dur;
    }
    return null;
  }

  play(song) {
    if (song) this.song = song;
    if (!this.song) throw new Error("SongPlayer.play() called with no song set");
    this.stop();
    this.isPlaying = true;
    let t = 0;

    for (let i = 0; i < this.song.scenes.length; i++) {
      const startMs = t;
      const idx = i;
      this.timers.push(this.schedule(() => {
        if (!this.isPlaying) return;
        this._enterScene(idx);
      }, startMs));
      const sceneEnd = t + this.song.scenes[i].bars * this._sceneBarMs(i);
      // Per-beat chaos ticks within this scene (use scene's tempo, not song's).
      const beatMs = this._sceneBeatMs(i);
      for (let bt = startMs + beatMs; bt < sceneEnd; bt += beatMs) {
        const beatT = bt;
        this.timers.push(this.schedule(() => {
          if (!this.isPlaying) return;
          this._chaosTick(beatT);
        }, beatT));
      }
      t = sceneEnd;
    }
    const totalMs = t;

    this.timers.push(this.schedule(() => {
      if (!this.isPlaying) return;
      this.isPlaying = false;
      this.onEnd();
    }, totalMs));
  }

  stop() {
    this.isPlaying = false;
    for (const id of this.timers) this.cancel(id);
    this.timers = [];
  }

  _enterScene(idx) {
    const params = this.resolveScene(idx);
    // Explicit notes override diatonic chord lookup; [] = pause/silence.
    const notes = params.notes !== undefined ? params.notes : this.getChord(params.chord);
    this.applyScene({ ...params, notes });
    this.onScene(params, idx, this.song.scenes.length);
    this._sendBaseCCs(params);
  }

  // Send the scene's "anchor" CC values, with mild deterministic per-slot
  // shimmer for envelope/velocity (so the 8 resonators don't all behave
  // identically — gives the unit some life).
  _sendBaseCCs(params) {
    const cc = params.cc;
    if (!cc) return;
    const chaos = params.chaos || 0;
    if (cc.air      !== undefined) this.sendCC(PHASE8_CC.air,      this._clip(cc.air));
    if (cc.modDepth !== undefined) this.sendCC(PHASE8_CC.modDepth, this._clip(cc.modDepth));
    if (cc.modRate  !== undefined) this.sendCC(PHASE8_CC.modRate,  this._clip(cc.modRate));
    if (cc.envelope !== undefined) {
      for (let s = 0; s < 8; s++) {
        this.sendCC(PHASE8_CC.envelope[s], this._jitter(cc.envelope, chaos, 18));
      }
    }
    if (cc.velocity !== undefined) {
      for (let s = 0; s < 8; s++) {
        this.sendCC(PHASE8_CC.velocity[s], this._jitter(cc.velocity, chaos, 12));
      }
    }
  }

  // Per-beat jitter on global CCs. Per-slot CCs get re-randomised every other
  // beat to keep the bus quieter.
  _chaosTick(t) {
    const params = this.sceneAtMs(t);
    if (!params || !params.cc || !params.chaos) return;
    const cc = params.cc;
    const chaos = params.chaos;
    if (cc.air      !== undefined) this.sendCC(PHASE8_CC.air,      this._jitter(cc.air,      chaos, 28));
    if (cc.modDepth !== undefined) this.sendCC(PHASE8_CC.modDepth, this._jitter(cc.modDepth, chaos, 32));
    if (cc.modRate  !== undefined) this.sendCC(PHASE8_CC.modRate,  this._jitter(cc.modRate,  chaos, 28));
    const beatMs = 60000 / params.bpm;
    const beatIdx = Math.round((t - (params._startMs || 0)) / beatMs);
    if (beatIdx % 2 === 0 && cc.envelope !== undefined) {
      for (let s = 0; s < 8; s++) {
        this.sendCC(PHASE8_CC.envelope[s], this._jitter(cc.envelope, chaos, 22));
      }
    }
  }

  _clip(v)            { return Math.max(0, Math.min(127, Math.round(v))); }
  _signed()           { return this.rng() * 2 - 1; }
  _jitter(b, c, amp)  { return this._clip(b + this._signed() * c * amp); }
}
