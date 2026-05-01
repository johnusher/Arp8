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

  ["pitches not in tines pass through unchanged", () => {
    assert.equal(pitchToSlotMidi(70, tines, "static"), 70);
  }],

  ["a C-major triad in STATIC -> [36, 38, 40] (slots 1, 3, 5)", () => {
    const triad = [48, 52, 55]; // C3, E3, G3
    const out = triad.map(p => pitchToSlotMidi(p, tines, "static"));
    assert.deepEqual(out, [36, 38, 40]);
  }],
];
