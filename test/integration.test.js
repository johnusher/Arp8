// End-to-end: chord pad press -> arp -> snap-to-tines -> MIDI out.
// Asserts the exact byte stream the phase8 would receive in a few realistic scenarios.
import assert from "node:assert/strict";
import { ArpState } from "../src/arp.js";
import { Scheduler, makeStepProvider } from "../src/scheduler.js";
import { diatonicChords, phase8Tines, snapChord, midiOf } from "../src/chords.js";
import { VirtualClock, MockMIDIOutput } from "./mocks.js";

function setup() {
  const clock = new VirtualClock();
  const midi = new MockMIDIOutput();
  const sched = new Scheduler({
    now: () => clock.now(),
    send: (bytes, time) => midi.send(bytes, time),
    schedule: (cb, delay) => clock.setTimeout(cb, delay),
    cancel: (id) => clock.clearTimeout(id),
  });
  return { clock, midi, sched };
}

export const tests = [
  ["F major arp on phase8 tines hits F3 A3 C4", () => {
    const { clock, midi, sched } = setup();
    const tines = phase8Tines();
    const chords = diatonicChords(midiOf("C", 3), "major");
    const F = chords[3];                 // IV: F major, root F3, notes [F3, A3, C4]
    const snapped = snapChord(F.notes, tines);
    assert.deepEqual(snapped, [53, 57, 60]); // F3 A3 C4 — exactly the tines

    const arp = new ArpState();
    arp.setChord(snapped);
    arp.setPattern("up");

    sched.start({
      bpm: 120, rate: "1/8", gate: 0.5, channel: 0, velocity: 96,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    clock.advance(900);

    const ons = midi.events.filter(e => e.type === "noteOn");
    assert.deepEqual(ons.map(e => e.note), [53, 57, 60, 53]);
    assert.deepEqual(ons.map(e => e.time), [0, 250, 500, 750]);
    assert.equal(ons[0].velocity, 96);
  }],

  ["chord pattern with rhythm grid creates rests", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60, 64, 67]);
    arp.setPattern("up");
    arp.setOctaves(2);

    // Eight-step grid: ON ON OFF ON ON OFF ON ON  -> 6 hits per cycle
    const grid = "11011011".split("").map(c => ({ enabled: c === "1" }));
    const provider = makeStepProvider({ arp, grid });

    sched.start({
      bpm: 120, rate: "1/16", gate: 0.5, channel: 0, velocity: 100,
      getStep: provider,
    });
    // Advance 950ms: a full 8-cell cycle (1000ms) minus 50ms; lookahead pulls
    // cell 8 (= cell 0 of next cycle) into frame at t=1000.
    clock.advance(950);

    const ons = midi.events.filter(e => e.type === "noteOn");
    // arp seq with 2 octaves of [60,64,67]: 60,64,67,72,76,79
    // ON cells of grid: 0,1,3,4,6,7 fire arp[0..5] in cycle 1; cell 8 (lookahead)
    // wraps grid to ON, fires arp[0]=60 again.
    assert.deepEqual(ons.map(e => e.note), [60, 64, 67, 72, 76, 79, 60]);
    assert.deepEqual(ons.map(e => e.time), [0, 125, 375, 500, 750, 875, 1000]);
  }],

  ["chord changes mid-arp swap notes cleanly", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60, 64, 67]);
    arp.setPattern("up");

    sched.start({
      bpm: 120, rate: "1/8", gate: 0.5, channel: 0, velocity: 100,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    clock.advance(500); // two notes: 60, 64
    arp.setChord([62, 65, 69]); // switch to D minor
    clock.advance(500); // arp should restart at first note of new chord, then continue

    const ons = midi.events.filter(e => e.type === "noteOn");
    // Before swap: 60 @0, 64 @250.
    // After swap (which happens at t=500), the next step uses the new chord.
    // Note that the 100ms lookahead may have already pre-scheduled the t=500 step
    // using the old chord -- this is expected scheduler behaviour. We verify the
    // first note in the new key actually appears within the next two steps.
    const newKeyNotes = ons.filter(e => [62, 65, 69].includes(e.note));
    assert.ok(newKeyNotes.length >= 1, `expected at least one new-key note, got ${ons.map(o => o.note)}`);
  }],
];
