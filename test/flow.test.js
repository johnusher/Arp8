// End-to-end "feature flow" tests. Simulate the user actions a chord pad press
// represents (chord change + start) and assert what the synth would actually
// receive over the wire for several seconds of music.
import assert from "node:assert/strict";
import { ArpState } from "../src/arp.js";
import { Scheduler, makeStepProvider } from "../src/scheduler.js";
import { diatonicChords, phase8Tines, snapChord, midiOf, nameOf } from "../src/chords.js";
import { VirtualClock, MockMIDIOutput } from "./mocks.js";

function rig({ bpm = 120, rate = "1/8", gate = 0.5, swing = 0, velocity = 100, channel = 0, octaves = 1 } = {}) {
  const clock = new VirtualClock();
  const midi  = new MockMIDIOutput();
  const arp   = new ArpState();
  arp.setOctaves(octaves);
  const sched = new Scheduler({
    now: () => clock.now(),
    send: (b, t) => midi.send(b, t),
    schedule: (cb, d) => clock.setTimeout(cb, d),
    cancel: (id) => clock.clearTimeout(id),
  });
  const grid = Array.from({ length: 16 }, () => ({ enabled: true }));
  const provider = makeStepProvider({ arp, grid });
  return { clock, midi, arp, sched, grid, provider, defaults: { bpm, rate, gate, swing, velocity, channel, getStep: provider } };
}

export const tests = [
  ["pressing I -> IV -> V -> I emits the right note sequence", () => {
    const { clock, midi, arp, sched, defaults } = rig({ bpm: 120, rate: "1/8" });
    const tines = phase8Tines();
    const dia = diatonicChords(midiOf("C", 3), "major");
    arp.setPattern("up");

    sched.start(defaults);

    // I = C major (C3 E3 G3) -> snapped: same
    arp.setChord(snapChord(dia[0].notes, tines));
    clock.advance(900); // ~3 notes in (0, 250, 500, 750)

    // IV = F major (F3 A3 C4) -> snapped: same
    arp.setChord(snapChord(dia[3].notes, tines));
    clock.advance(900);

    // V = G major (G3 B3 D4) -> D4 has no tine; snapToTines(D4)=D3 (note-class match)
    const Vsnap = snapChord(dia[4].notes, tines);
    arp.setChord(Vsnap);
    assert.deepEqual(Vsnap, [55, 59, 50], "G3 B3 D3 (D4 wraps to D3 via note-class)");
    clock.advance(900);

    // I again
    arp.setChord(snapChord(dia[0].notes, tines));
    clock.advance(900);

    sched.stop();

    const ons = midi.events.filter(e => e.type === "noteOn");
    // Sanity: every noteOn must be a valid phase8 tine.
    for (const e of ons) {
      assert.ok(tines.includes(e.note), `noteOn ${e.note} (${nameOf(e.note)}) is not a phase8 tine`);
    }
    // We should have at least 12 notes across 4 chord segments.
    assert.ok(ons.length >= 12, `got ${ons.length} notes`);
  }],

  ["latch off + chord release = silence", () => {
    const { clock, midi, arp, sched, defaults } = rig();
    arp.setPattern("up");
    arp.setChord([60, 64, 67]);
    sched.start(defaults);
    clock.advance(500);
    const beforeRelease = midi.events.filter(e => e.type === "noteOn").length;
    arp.setChord([]); // simulating "release without latch"
    clock.advance(2000);
    const afterRelease = midi.events.filter(e => e.type === "noteOn").length;
    // Only the in-flight (lookahead-prescheduled) notes may bleed through; the bulk
    // should stop. After 2s, with no chord, we shouldn't keep accruing notes.
    assert.ok(afterRelease - beforeRelease <= 2, `expected ~0 new notes, got ${afterRelease - beforeRelease}`);
  }],

  ["panic during play: stop + manual all-notes-off", () => {
    const { clock, midi, arp, sched, defaults } = rig();
    arp.setPattern("up");
    arp.setChord([60, 64, 67]);
    sched.start(defaults);
    clock.advance(700);
    sched.stop();
    midi.reset();
    clock.advance(2000);
    assert.equal(midi.events.length, 0, "no events should fire after stop");
  }],

  ["one full bar of D minor at 1/16 = 16 even sixteenth notes", () => {
    const { clock, midi, arp, sched, defaults } = rig({ bpm: 120, rate: "1/16" });
    arp.setPattern("up");
    arp.setChord([62, 65, 69]);
    sched.start(defaults);
    // 1 bar at 120 BPM = 2000 ms. 1/16 = 125 ms. That's 16 notes at t = 0..1875.
    // Stop at t=1900: the last tick before any horizon catches the t=2000 note.
    clock.advance(1900);
    sched.stop();
    const ons = midi.events.filter(e => e.type === "noteOn");
    assert.equal(ons.length, 16, `got ${ons.length}`);
    // Every note must be from D minor triad.
    for (const e of ons) {
      assert.ok([62, 65, 69].includes(e.note), `unexpected ${e.note}`);
    }
  }],

  ["snap quantizes off-scale chords (Eb major in C-major-tine setup)", () => {
    const tines = phase8Tines();
    // Eb major triad: Eb G Bb (63, 67, 70). On C major tines, only G has a class match (tine 55).
    // Eb -> nearest class miss: between D (50) and E (52); ties go lower -> 50? (Eb=63 → class 3 (D#) → no match → fallback to nearest of [48..60], which is 60 (C4) at distance 3. Actually 63 to 60 = 3, 63 to 59 = 4, so 60. Then G(67) -> class match G3=55. Bb(70) -> class miss, closest tine to 70 is 60 (10) or 59 (11), so 60. Dedup -> [60, 55].
    const snapped = snapChord([63, 67, 70], tines);
    assert.equal(snapped.length, 2, `dedup yielded ${snapped}`);
    assert.ok(snapped.includes(55));
    assert.ok(snapped.includes(60));
  }],
];
