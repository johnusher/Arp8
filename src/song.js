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

export const TINES_AND_TIME = {
  title: "Tines & Time",
  subtitle: "axis pop · pachelbel bridge · cage interlude · 2 min",
  bpm: 88, // default; per-scene `bpm` overrides
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
    this.song       = deps.song;
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

  play() {
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
