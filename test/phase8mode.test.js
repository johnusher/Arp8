// Verify the wire-byte translation for each phase8 MIDI Note Assignment mode.
// Per phase8 manual §8.4: STATIC = slots 1..8 on MIDI 36..43;
// FREQUENCY = MIDI matches the installed resonator pitch;
// TRANSPOSED = STATIC shifted +2 octaves (60..67).
import assert from "node:assert/strict";
import { pitchToSlotMidi, phase8Tines } from "../src/chords.js";

const tines = phase8Tines(); // [48, 50, 52, 53, 55, 57, 59, 60]

export const tests = [
  ["static maps C3..C4 to MIDI 36..43", () => {
    const pitches = tines;
    const expected = [36, 37, 38, 39, 40, 41, 42, 43];
    pitches.forEach((p, i) => {
      assert.equal(pitchToSlotMidi(p, tines, "static"), expected[i], `slot ${i}`);
    });
  }],

  ["transposed maps C3..C4 to MIDI 60..67", () => {
    const expected = [60, 61, 62, 63, 64, 65, 66, 67];
    tines.forEach((p, i) => {
      assert.equal(pitchToSlotMidi(p, tines, "transposed"), expected[i]);
    });
  }],

  ["frequency mode is identity", () => {
    for (const p of tines) {
      assert.equal(pitchToSlotMidi(p, tines, "frequency"), p);
    }
  }],

  ["pitches outside tine set get snapped to nearest same-class slot", () => {
    // E4 (64) — no E4 tine, but E3 (52) exists at slot 3 → wire MIDI 36+2 = 38
    assert.equal(pitchToSlotMidi(64, tines, "static"), 38);
    // G4 (67) — no G4 tine, but G3 (55) exists at slot 5 → wire MIDI 40
    assert.equal(pitchToSlotMidi(67, tines, "static"), 40);
    // C5 (72) — wraps back to C4 (60) which is slot 8 → wire MIDI 43
    assert.equal(pitchToSlotMidi(72, tines, "static"), 43);
    // Off-scale falls back to absolute nearest pitch (D#4 = 63 is closest to
    // C4 = 60 at distance 3 — not D3 = 50 at distance 13). Slot 8 → wire 43.
    assert.equal(pitchToSlotMidi(63, tines, "static"), 43);
  }],

  ["octave-stacked arp notes all map to valid slots (was bug — silent extras)", () => {
    // A 2-octave C-major arp from buildSequence is [48, 52, 55, 60, 64, 67].
    // Before the fix, 64 and 67 passed through as raw MIDI and the phase8's
    // STATIC firmware ignored them. Now every note lands on a slot in 36..43.
    const seq = [48, 52, 55, 60, 64, 67];
    const wired = seq.map(p => pitchToSlotMidi(p, tines, "static"));
    for (const w of wired) assert.ok(w >= 36 && w <= 43, `${w} out of slot range`);
    assert.deepEqual(wired, [36, 38, 40, 43, 38, 40]);
  }],

  ["a C-major triad in STATIC -> [36, 38, 40] (slots 1, 3, 5)", () => {
    const triad = [48, 52, 55]; // C3, E3, G3
    const out = triad.map(p => pitchToSlotMidi(p, tines, "static"));
    assert.deepEqual(out, [36, 38, 40]);
  }],
];
