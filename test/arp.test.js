import assert from "node:assert/strict";
import { buildSequence, ArpState } from "../src/arp.js";
import { seededRng } from "./mocks.js";

const C_TRIAD = [60, 64, 67];

function take(arp, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(arp.next());
  return out;
}

export const tests = [
  ["buildSequence up", () => {
    assert.deepEqual(buildSequence(C_TRIAD, "up"), [60, 64, 67]);
  }],

  ["buildSequence down", () => {
    assert.deepEqual(buildSequence(C_TRIAD, "down"), [67, 64, 60]);
  }],

  ["buildSequence updown does not double extremes", () => {
    assert.deepEqual(buildSequence(C_TRIAD, "updown"), [60, 64, 67, 64]);
  }],

  ["buildSequence converge outside-in", () => {
    assert.deepEqual(buildSequence([60, 64, 67, 71], "converge"), [60, 71, 64, 67]);
  }],

  ["buildSequence diverge inside-out", () => {
    assert.deepEqual(buildSequence([60, 64, 67, 71], "diverge"), [64, 67, 60, 71]);
  }],

  ["octave replication ascends", () => {
    assert.deepEqual(buildSequence(C_TRIAD, "up", 2), [60, 64, 67, 72, 76, 79]);
  }],

  ["played preserves input order", () => {
    assert.deepEqual(buildSequence([67, 60, 64], "played"), [67, 60, 64]);
  }],

  ["chord pattern returns single step with all notes", () => {
    const seq = buildSequence(C_TRIAD, "chord");
    assert.equal(seq.length, 1);
    assert.deepEqual(seq[0], [60, 64, 67]);
  }],

  ["ArpState up loops correctly", () => {
    const a = new ArpState();
    a.setChord(C_TRIAD);
    a.setPattern("up");
    assert.deepEqual(take(a, 7), [60, 64, 67, 60, 64, 67, 60]);
  }],

  ["ArpState updown over chord & repeats", () => {
    const a = new ArpState();
    a.setChord(C_TRIAD);
    a.setPattern("updown");
    // sequence is 60,64,67,64; loops
    assert.deepEqual(take(a, 8), [60, 64, 67, 64, 60, 64, 67, 64]);
  }],

  ["ArpState chord pattern returns array each step", () => {
    const a = new ArpState();
    a.setChord(C_TRIAD);
    a.setPattern("chord");
    assert.deepEqual(a.next(), [60, 64, 67]);
    assert.deepEqual(a.next(), [60, 64, 67]);
  }],

  ["ArpState random with seeded RNG is deterministic", () => {
    const rng = seededRng(42);
    const a = new ArpState({ rng });
    a.setChord(C_TRIAD);
    a.setPattern("random");
    const seq = take(a, 5);
    // All values must be from the chord
    for (const n of seq) assert.ok(C_TRIAD.includes(n), `${n} not in chord`);
    // And the seeded sequence is reproducible
    const rng2 = seededRng(42);
    const b = new ArpState({ rng: rng2 });
    b.setChord(C_TRIAD);
    b.setPattern("random");
    assert.deepEqual(take(b, 5), seq);
  }],

  ["ArpState randomOther does not repeat until cycle exhausted", () => {
    const rng = seededRng(7);
    const a = new ArpState({ rng });
    a.setChord(C_TRIAD);
    a.setPattern("randomOther");
    const seq = take(a, 9); // 3 cycles of 3 notes
    for (let i = 0; i < seq.length; i += 3) {
      const window = new Set(seq.slice(i, i + 3));
      assert.equal(window.size, 3, `expected 3 unique in window ${seq.slice(i, i + 3)}`);
    }
  }],

  ["ArpState randomOnce locks a pattern then loops it", () => {
    const rng = seededRng(99);
    const a = new ArpState({ rng });
    a.setChord(C_TRIAD);
    a.setPattern("randomOnce");
    const cycle1 = take(a, 3);
    const cycle2 = take(a, 3);
    assert.deepEqual(cycle1, cycle2);
  }],

  ["ArpState resets when chord changes", () => {
    const a = new ArpState();
    a.setChord(C_TRIAD);
    a.setPattern("up");
    a.next(); a.next(); // position = 2
    a.setChord([62, 65, 69]); // D minor
    assert.equal(a.next(), 62, "should restart at first note of new chord");
  }],

  ["ArpState empty chord yields null", () => {
    const a = new ArpState();
    a.setPattern("up");
    assert.equal(a.next(), null);
    a.setChord([]);
    assert.equal(a.next(), null);
  }],

  ["ArpState octaves expand the loop", () => {
    const a = new ArpState();
    a.setChord(C_TRIAD);
    a.setPattern("up");
    a.setOctaves(2);
    // sequence: 60,64,67,72,76,79
    assert.deepEqual(take(a, 7), [60, 64, 67, 72, 76, 79, 60]);
  }],
];
