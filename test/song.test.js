// Verify the composition's structure and the SongPlayer's scene-timing
// behaviour against the virtual clock.
import assert from "node:assert/strict";
import { TINES_AND_TIME, SongPlayer, PHASE8_CC } from "../src/song.js";
import { VirtualClock, seededRng } from "./mocks.js";

export const tests = [
  ["song lands within ±15s of 2 minutes (varying BPM)", () => {
    const p = new SongPlayer({ song: TINES_AND_TIME, getChord: () => [60], applyScene: () => {} });
    const ms = p.totalMs();
    assert.ok(Math.abs(ms - 120_000) < 15_000, `got ${(ms/1000).toFixed(1)}s`);
  }],

  ["every scene has either a chord index (0..6) or explicit notes array", () => {
    for (const s of TINES_AND_TIME.scenes) {
      const hasChord = s.chord !== undefined && s.chord >= 0 && s.chord <= 6;
      const hasNotes = Array.isArray(s.notes);
      assert.ok(hasChord || hasNotes, `scene ${s.name} has neither chord index nor notes`);
    }
  }],

  ["song uses tempo variation, pauses, and explicit-note Cage sections", () => {
    // Should have at least 3 distinct BPMs (tempo dynamics) and at least one
    // silent (`notes: []`) and one single-tine (`notes: [n]`) scene.
    const bpms = new Set(TINES_AND_TIME.scenes.map(s => s.bpm).filter(b => b !== undefined));
    assert.ok(bpms.size >= 3, `expected ≥3 distinct BPMs, got ${[...bpms]}`);
    const silent = TINES_AND_TIME.scenes.filter(s => Array.isArray(s.notes) && s.notes.length === 0);
    assert.ok(silent.length >= 1, "expected ≥1 silent (paused) scene");
    const cage = TINES_AND_TIME.scenes.filter(s => Array.isArray(s.notes) && s.notes.length === 1);
    assert.ok(cage.length >= 2, `expected ≥2 single-tine scenes, got ${cage.length}`);
  }],

  ["every scene specifies a positive bar count and a name", () => {
    for (const s of TINES_AND_TIME.scenes) {
      assert.ok(s.bars > 0, `bad bars in ${s.name}`);
      assert.ok(s.name && s.name.length, "scene missing name");
    }
  }],

  ["resolveScene inherits unset params from prior scenes", () => {
    const p = new SongPlayer({ song: TINES_AND_TIME, getChord: () => [60], applyScene: () => {} });
    // scene 1 ("verse 1·b") has only chord and velocity-overridden via inheritance.
    // verse 1·a sets velocity=82; verse 1·b should inherit it.
    const idxOfB = TINES_AND_TIME.scenes.findIndex(s => s.name === "verse 1·b");
    const r = p.resolveScene(idxOfB);
    assert.equal(r.velocity, 82, "verse 1·b should inherit velocity from verse 1·a");
    assert.equal(r.pattern, "up");
    assert.equal(r.rate, "1/8");
    assert.equal(r.octaves, 1);
  }],

  ["resolveScene picks up overrides at the section that introduces them", () => {
    const p = new SongPlayer({ song: TINES_AND_TIME, getChord: () => [60], applyScene: () => {} });
    const chorusA = p.resolveScene(TINES_AND_TIME.scenes.findIndex(s => s.name === "chorus·a"));
    assert.equal(chorusA.pattern, "up");
    assert.equal(chorusA.rate, "1/16");
    assert.equal(chorusA.octaves, 3);
    assert.equal(chorusA.velocity, 115);
  }],

  ["SongPlayer fires every scene in order at the right wallclock time (variable BPM)", () => {
    const clock = new VirtualClock();
    const fired = [];
    const p = new SongPlayer({
      song: TINES_AND_TIME,
      getChord: (idx) => [60 + idx],
      applyScene: (params) => fired.push({ time: clock.time, name: params.name, notes: params.notes, bpm: params.bpm }),
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
    });

    p.play();
    clock.advance(p.totalMs() + 100);

    assert.equal(fired.length, TINES_AND_TIME.scenes.length, "one fire per scene");
    assert.equal(fired[0].time, 0);
    assert.deepEqual(fired.map(f => f.name), TINES_AND_TIME.scenes.map(s => s.name));
    // Verify intermediate timings: cumulative bar offsets at per-scene BPM.
    let cum = 0;
    for (let i = 0; i < TINES_AND_TIME.scenes.length; i++) {
      assert.equal(fired[i].time, cum, `scene ${i} (${fired[i].name}) fire time`);
      const sceneBpm = TINES_AND_TIME.scenes[i].bpm ?? TINES_AND_TIME.bpm;
      cum += TINES_AND_TIME.scenes[i].bars * (60000 / sceneBpm) * 4;
    }
  }],

  ["explicit notes scenes pass through to applyScene; getChord is bypassed", () => {
    const clock = new VirtualClock();
    let getChordCalls = 0;
    const fired = [];
    const p = new SongPlayer({
      song: TINES_AND_TIME,
      getChord: (idx) => { getChordCalls++; return [60]; },
      applyScene: (params) => fired.push({ name: params.name, notes: params.notes }),
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
    });
    p.play();
    clock.advance(p.totalMs() + 100);
    // The Cage scene cage·c3 has notes:[48] so its applyScene should see [48].
    const cage = fired.find(f => f.name === "cage·c3");
    assert.deepEqual(cage.notes, [48]);
    // The pause scene has notes:[] so applyScene should see [] (silence).
    const pause = fired.find(f => f.name === "·· pause");
    assert.deepEqual(pause.notes, []);
  }],

  ["SongPlayer onEnd fires after the last scene's bars elapse", () => {
    const clock = new VirtualClock();
    let endedAt = null;
    const p = new SongPlayer({
      song: TINES_AND_TIME,
      getChord: () => [60],
      applyScene: () => {},
      onEnd: () => { endedAt = clock.time; },
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
    });
    p.play();
    clock.advance(p.totalMs() + 50);
    assert.equal(endedAt, p.totalMs(), "onEnd at exactly totalMs");
    assert.equal(p.isPlaying, false);
  }],

  ["scene CC payload sent on scene entry — air / modDepth / modRate + 8 envelope + 8 velocity", () => {
    const clock = new VirtualClock();
    const ccs = [];
    const p = new SongPlayer({
      song: TINES_AND_TIME,
      getChord: () => [60],
      applyScene: () => {},
      sendCC: (n, v) => ccs.push({ n, v, t: clock.time }),
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
      rng: seededRng(1),
    });
    p.play();
    clock.advance(10); // just enter scene 0 (intro)
    // Intro sends air + modDepth + modRate + 8 envelope + 8 velocity = 19 CCs.
    const ccsAt0 = ccs.filter(c => c.t === 0);
    assert.equal(ccsAt0.length, 19, `intro should send 19 CCs, got ${ccsAt0.length}`);
    // Includes AIR (CC 30)
    assert.ok(ccsAt0.some(c => c.n === PHASE8_CC.air));
    // Includes all 8 envelope CCs
    for (const e of PHASE8_CC.envelope) {
      assert.ok(ccsAt0.some(c => c.n === e), `missing envelope CC ${e}`);
    }
    // Includes all 8 velocity CCs
    for (const v of PHASE8_CC.velocity) {
      assert.ok(ccsAt0.some(c => c.n === v), `missing velocity CC ${v}`);
    }
    // Intro chaos=0, so envelope CCs are all the base value (no jitter).
    const envValues = ccsAt0.filter(c => PHASE8_CC.envelope.includes(c.n)).map(c => c.v);
    assert.ok(envValues.every(v => v === envValues[0]), "no jitter at chaos=0");
  }],

  ["chaos jitter happens every beat in scenes with chaos > 0", () => {
    const clock = new VirtualClock();
    const airCCs = [];
    const p = new SongPlayer({
      song: TINES_AND_TIME,
      getChord: () => [60],
      applyScene: () => {},
      sendCC: (n, v) => { if (n === PHASE8_CC.air) airCCs.push({ v, t: clock.time }); },
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
      rng: seededRng(7),
    });
    p.play();
    // Compute bridge start using each scene's actual BPM (song has tempo changes).
    let bridgeStart = 0;
    for (const s of TINES_AND_TIME.scenes) {
      if (s.name === "bridge·a") break;
      bridgeStart += s.bars * 4 * (60000 / (s.bpm ?? TINES_AND_TIME.bpm));
    }
    const bridgeBpm = 78; // bridge·a sets bpm=78
    const beatMs = 60000 / bridgeBpm;
    clock.advance(bridgeStart + 5 * beatMs);
    const inBridge = airCCs.filter(c => c.t >= bridgeStart);
    assert.ok(inBridge.length >= 4, `expected ≥4 AIR ticks in bridge, got ${inBridge.length}`);
    const unique = new Set(inBridge.map(c => c.v));
    assert.ok(unique.size > 1, "chaos should produce varying AIR values");
  }],

  ["chaos = 0 scenes do NOT send per-beat CC ticks", () => {
    const clock = new VirtualClock();
    const ccsAfterEntry = [];
    const p = new SongPlayer({
      song: TINES_AND_TIME, // intro and final outro both have chaos=0
      getChord: () => [60],
      applyScene: () => {},
      sendCC: (n, v) => { if (clock.time > 50) ccsAfterEntry.push({ n, v, t: clock.time }); },
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
      rng: seededRng(9),
    });
    p.play();
    // Intro lasts 2 bars at 88 BPM = ~2727 ms. Advance 2000ms (still in intro).
    clock.advance(2000);
    assert.equal(ccsAfterEntry.length, 0, "no CC traffic after scene entry while chaos=0");
  }],

  ["resolveScene inherits cc + chaos from prior scenes", () => {
    const p = new SongPlayer({ song: TINES_AND_TIME, getChord: () => [60], applyScene: () => {} });
    const verseB = p.resolveScene(TINES_AND_TIME.scenes.findIndex(s => s.name === "verse 1·b"));
    // verse 1·a sets the cc baseline; verse 1·b should inherit it.
    assert.equal(verseB.cc.air, 38);
    assert.equal(verseB.chaos, 0.06);
  }],

  ["stop() cancels all pending scenes", () => {
    const clock = new VirtualClock();
    const fired = [];
    const p = new SongPlayer({
      song: TINES_AND_TIME,
      getChord: () => [60],
      applyScene: (params) => fired.push(params.name),
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
    });
    p.play();
    clock.advance(10_000); // 10 sec into the piece
    const halfwayCount = fired.length;
    p.stop();
    clock.advance(120_000);
    assert.equal(fired.length, halfwayCount, "no further scenes after stop()");
  }],
];
