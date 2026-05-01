import assert from "node:assert/strict";
import {
  midiOf, nameOf, chordNotes, diatonicChords,
  phase8Tines, snapToTines, snapChord,
} from "../src/chords.js";

export const tests = [
  ["midiOf middle C is 60", () => {
    assert.equal(midiOf("C", 4), 60);
    assert.equal(midiOf("A", 4), 69);
    assert.equal(midiOf("C", 3), 48);
  }],

  ["nameOf round-trips", () => {
    assert.equal(nameOf(60), "C4");
    assert.equal(nameOf(69), "A4");
    assert.equal(nameOf(48), "C3");
  }],

  ["C major triad", () => {
    assert.deepEqual(chordNotes(midiOf("C", 4), "maj"), [60, 64, 67]);
  }],

  ["D minor triad", () => {
    assert.deepEqual(chordNotes(midiOf("D", 4), "min"), [62, 65, 69]);
  }],

  ["G dominant 7 is G B D F", () => {
    assert.deepEqual(chordNotes(midiOf("G", 3), "dom7"), [55, 59, 62, 65]);
  }],

  ["Cmaj9 spans two octaves", () => {
    assert.deepEqual(chordNotes(60, "maj9"), [60, 64, 67, 71, 74]);
  }],

  ["diatonic C major has correct qualities & romans", () => {
    const ds = diatonicChords(midiOf("C", 3), "major");
    assert.equal(ds.length, 7);
    assert.deepEqual(ds.map(d => d.roman),  ["I","ii","iii","IV","V","vi","vii°"]);
    assert.deepEqual(ds.map(d => d.quality), ["maj","min","min","maj","maj","min","dim"]);
    // roots: C3 D3 E3 F3 G3 A3 B3
    assert.deepEqual(ds.map(d => d.root), [48, 50, 52, 53, 55, 57, 59]);
    // C major triad notes
    assert.deepEqual(ds[0].notes, [48, 52, 55]);
    // F major triad: F3 A3 C4
    assert.deepEqual(ds[3].notes, [53, 57, 60]);
  }],

  ["diatonic A minor", () => {
    const ds = diatonicChords(midiOf("A", 3), "minor");
    assert.deepEqual(ds.map(d => d.roman),  ["i","ii°","III","iv","v","VI","VII"]);
    // A minor triad: A C E
    assert.deepEqual(ds[0].notes, [57, 60, 64]);
  }],

  ["phase8Tines is C3..C4 in C major (8 notes)", () => {
    assert.deepEqual(phase8Tines(), [48, 50, 52, 53, 55, 57, 59, 60]);
  }],

  ["snapToTines preserves note class then nearest", () => {
    const t = phase8Tines();
    assert.equal(snapToTines(48, t), 48);  // exact
    assert.equal(snapToTines(60, t), 60);  // exact (top tine)
    assert.equal(snapToTines(65, t), 53);  // F4 -> F3 (preserve note class across octave)
    assert.equal(snapToTines(72, t), 60);  // C5 -> C4 (note-class match)
    // Off-scale (chromatic): no class match, fall back to nearest with ties going lower.
    assert.equal(snapToTines(49, t), 48);  // C#3 between C3 and D3 -> C3
    assert.equal(snapToTines(51, t), 50);  // D#3 between D3 and E3 -> D3
    assert.equal(snapToTines(36, t), 48);  // way below -> bottom tine
  }],

  ["snapChord dedupes", () => {
    const t = phase8Tines();
    // F major an octave up: F4 A4 C5 (65, 69, 72) -> snap to F3 A3 C4 (53, 57, 60)
    const out = snapChord([65, 69, 72], t);
    assert.deepEqual(out, [53, 57, 60]);
    // C5 + C6 should both snap to C4 and dedupe
    const out2 = snapChord([72, 84], t);
    assert.deepEqual(out2, [60]);
  }],
];
