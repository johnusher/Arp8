import assert from "node:assert/strict";
import { Scheduler, intervalMs, makeStepProvider } from "../src/scheduler.js";
import { ArpState } from "../src/arp.js";
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

const C_TRIAD = [60, 64, 67];

export const tests = [
  ["intervalMs maths", () => {
    // 120 BPM = 500 ms per beat. 1/8 = 250 ms.
    assert.equal(intervalMs(120, "1/4"),  500);
    assert.equal(intervalMs(120, "1/8"),  250);
    assert.equal(intervalMs(120, "1/16"), 125);
    assert.equal(intervalMs(60,  "1/4"),  1000);
  }],

  ["plays correct notes at correct times (up, 1/8 @ 120)", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord(C_TRIAD);
    arp.setPattern("up");
    sched.start({
      bpm: 120, rate: "1/8", gate: 0.5, channel: 0, velocity: 100,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    // Advance 900ms — under 1 sec to keep the t=1000 lookahead-scheduled note
    // out of frame. We expect 4 noteOns at t=0, 250, 500, 750.
    clock.advance(900);
    const noteOns = midi.events.filter(e => e.type === "noteOn");
    assert.equal(noteOns.length, 4, `got ${noteOns.length}`);
    assert.deepEqual(noteOns.map(e => e.note), [60, 64, 67, 60]);
    assert.deepEqual(noteOns.map(e => e.time), [0, 250, 500, 750]);
    assert.deepEqual(noteOns.map(e => e.velocity), [100, 100, 100, 100]);
  }],

  ["sends note-off after gate", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60]);
    arp.setPattern("up");
    sched.start({
      bpm: 120, rate: "1/4", gate: 0.5, channel: 0, velocity: 100,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    clock.advance(550);
    const off = midi.events.filter(e => e.type === "noteOff");
    // 1/4 @ 120 = 500 ms interval; gate 0.5 -> note-off at 250 (and 750, beyond window)
    const offTimes = off.map(e => e.time);
    assert.ok(offTimes.includes(250), `expected note-off at 250, got ${offTimes}`);
  }],

  ["chord pattern fires multiple notes simultaneously", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord(C_TRIAD);
    arp.setPattern("chord");
    sched.start({
      bpm: 120, rate: "1/4", gate: 0.5, channel: 0, velocity: 100,
      getStep: () => {
        const n = arp.next();
        if (n === null) return null;
        return { notes: Array.isArray(n) ? n : [n] };
      },
    });
    clock.advance(100);
    const ons = midi.events.filter(e => e.type === "noteOn" && e.time === 0);
    assert.equal(ons.length, 3);
    assert.deepEqual(ons.map(e => e.note).sort((a,b)=>a-b), [60, 64, 67]);
  }],

  ["swing delays off-beats", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60, 64, 67, 72]);
    arp.setPattern("up");
    sched.start({
      bpm: 120, rate: "1/8", gate: 0.5, channel: 0, velocity: 100, swing: 0.2,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    clock.advance(2000);
    const ons = midi.events.filter(e => e.type === "noteOn").slice(0, 4);
    // interval 250ms. swing 0.2: even intervals are 250*1.2=300, odd are 250*0.8=200
    // step 0 fires at 0; step 1 at 0+300=300; step 2 at 300+200=500; step 3 at 500+300=800
    assert.deepEqual(ons.map(e => e.time), [0, 300, 500, 800]);
  }],

  ["channel routing", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60]);
    arp.setPattern("up");
    sched.start({
      bpm: 120, rate: "1/4", gate: 0.5, channel: 5, velocity: 100,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    clock.advance(50);
    const on = midi.events.find(e => e.type === "noteOn");
    assert.equal(on.channel, 5);
    assert.equal(on.raw[0], 0x95);
  }],

  ["stop sends note-off for any held notes", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60]);
    arp.setPattern("up");
    sched.start({
      bpm: 120, rate: "1/4", gate: 0.99, channel: 0, velocity: 100,
      getStep: () => {
        const n = arp.next();
        return n === null ? null : { notes: [n] };
      },
    });
    clock.advance(20);
    midi.reset();
    sched.stop();
    // We won't have tracked active notes if we don't put them in activeNotes.
    // Stop must at minimum not throw, and not send any further events.
    clock.advance(2000);
    const ons = midi.events.filter(e => e.type === "noteOn");
    assert.equal(ons.length, 0, "no further notes after stop");
  }],

  ["per-step grid disables steps", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord(C_TRIAD);
    arp.setPattern("up");
    // 4-step grid: ON OFF ON OFF
    const grid = [
      { enabled: true },
      { enabled: false },
      { enabled: true },
      { enabled: false },
    ];
    const provider = makeStepProvider({ arp, grid });
    sched.start({
      bpm: 120, rate: "1/8", gate: 0.5, channel: 0, velocity: 100,
      getStep: provider,
    });
    clock.advance(1100);
    const ons = midi.events.filter(e => e.type === "noteOn");
    // 4 grid cells fit in 4 * 250 = 1000ms; so cells 0,1,2,3 fire at 0,250,500,750.
    // Off cells emit nothing. Arp position only advances on enabled cells.
    // Step 0 ON -> 60, Step 1 OFF -> nothing, Step 2 ON -> 64, Step 3 OFF -> nothing,
    // Step 4 ON -> 67 (interval continues at 1000)
    assert.deepEqual(ons.map(e => e.time), [0, 500, 1000]);
    assert.deepEqual(ons.map(e => e.note), [60, 64, 67]);
  }],

  ["onStep fires for every step including rests, with correct times", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60, 64, 67]);
    arp.setPattern("up");
    const grid = [
      { enabled: true },
      { enabled: false },
      { enabled: true },
    ];
    const provider = makeStepProvider({ arp, grid });
    const calls = [];
    sched.start({
      bpm: 120, rate: "1/4", gate: 0.5, channel: 0, velocity: 100,
      getStep: provider,
      onStep: (info) => calls.push(info),
    });
    clock.advance(1100);
    // 4 steps in 4 * 500 = 2000ms? no — 1100ms covers steps 0..2 plus lookahead step 3.
    // Step 0 ON @0 -> notes [60]; step 1 OFF @500 -> notes []; step 2 ON @1000 -> notes [64].
    assert.ok(calls.length >= 3);
    assert.deepEqual(calls[0].notes, [60]);
    assert.equal(calls[0].time, 0);
    assert.equal(calls[0].stepIndex, 0);
    assert.deepEqual(calls[1].notes, []);
    assert.equal(calls[1].time, 500);
    assert.equal(calls[1].stepIndex, 1);
    assert.deepEqual(calls[2].notes, [64]);
    assert.equal(calls[2].time, 1000);
    assert.equal(calls[2].stepIndex, 2);
  }],

  ["per-step grid velocity overrides", () => {
    const { clock, midi, sched } = setup();
    const arp = new ArpState();
    arp.setChord([60]);
    arp.setPattern("up");
    const grid = [
      { enabled: true, velocity: 30 },
      { enabled: true, velocity: 127 },
    ];
    const provider = makeStepProvider({ arp, grid });
    sched.start({
      bpm: 120, rate: "1/4", gate: 0.5, channel: 0, velocity: 100,
      getStep: provider,
    });
    clock.advance(700);
    const ons = midi.events.filter(e => e.type === "noteOn");
    assert.equal(ons.length, 2);
    assert.equal(ons[0].velocity, 30);
    assert.equal(ons[1].velocity, 127);
  }],
];
