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

export const SONGS = [
  TINES_AND_TIME,
  PRELUDE,
  PULSE,
  DRIFT,
  DRIVER,
  GYMNOPEDIE,
  INDETERMINACY,
  CHORAL,
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
