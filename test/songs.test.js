// Structural tests across the entire SONGS catalogue. Each song must conform
// to the engine's expectations regardless of its musical character.
import assert from "node:assert/strict";
import { SONGS, SongPlayer, PHASE8_CC } from "../src/song.js";
import { VirtualClock, seededRng } from "./mocks.js";

const RATES_OK = ["1/4","1/4T","1/8","1/8T","1/16","1/16T","1/32"];
const PATTERNS_OK = ["up","down","updown","downup","converge","diverge","random","randomOther","randomOnce","played","chord"];

export const tests = [
  ["catalogue has the expected song count + 8 originals + classical canon", () => {
    // 8 originals + 20 classical = 28
    assert.equal(SONGS.length, 28, `expected 28 songs, got ${SONGS.length}`);
    const titles = new Set();
    for (const s of SONGS) {
      assert.ok(s.title,     `song missing title`);
      assert.ok(s.subtitle,  `${s.title} missing subtitle`);
      assert.ok(s.bpm > 0,   `${s.title} missing bpm`);
      assert.ok(s.key,       `${s.title} missing key`);
      assert.ok(s.mode === "major" || s.mode === "minor", `${s.title} has bad mode ${s.mode}`);
      assert.ok(Array.isArray(s.scenes) && s.scenes.length > 0, `${s.title} has no scenes`);
      titles.add(s.title);
    }
    assert.equal(titles.size, 28, "songs must have distinct titles");
    // First 8 are the originals (in known order)
    assert.equal(SONGS[0].title, "Tines & Time");
    assert.equal(SONGS[7].title, "Choral");
    // Position 8 onwards are classical pieces (subtitle includes composer · year)
    for (let i = 8; i < SONGS.length; i++) {
      assert.match(SONGS[i].subtitle, /·\s+\d{4}\s+·/, `${SONGS[i].title} subtitle missing year`);
    }
  }],

  ["every scene in every song has valid pattern + rate (when set)", () => {
    for (const s of SONGS) {
      // Resolve via SongPlayer.resolveScene so we check the EFFECTIVE values,
      // since later scenes may inherit pattern/rate from earlier ones.
      const p = new SongPlayer({ song: s, getChord: () => [60], applyScene: () => {} });
      for (let i = 0; i < s.scenes.length; i++) {
        const r = p.resolveScene(i);
        if (r.pattern !== undefined) assert.ok(PATTERNS_OK.includes(r.pattern), `${s.title} ${s.scenes[i].name}: bad pattern ${r.pattern}`);
        if (r.rate !== undefined)    assert.ok(RATES_OK.includes(r.rate),       `${s.title} ${s.scenes[i].name}: bad rate ${r.rate}`);
        if (r.octaves !== undefined) assert.ok(r.octaves >= 1 && r.octaves <= 4, `${s.title} ${s.scenes[i].name}: bad octaves ${r.octaves}`);
        if (r.gate !== undefined)    assert.ok(r.gate > 0 && r.gate <= 1,        `${s.title} ${s.scenes[i].name}: bad gate ${r.gate}`);
        if (r.velocity !== undefined)assert.ok(r.velocity >= 1 && r.velocity <= 127, `${s.title} ${s.scenes[i].name}: bad velocity ${r.velocity}`);
        if (r.bpm !== undefined)     assert.ok(r.bpm >= 20 && r.bpm <= 300,     `${s.title} ${s.scenes[i].name}: bad bpm ${r.bpm}`);
      }
    }
  }],

  ["every scene resolves to a chord index 0..6 OR an explicit notes array", () => {
    for (const s of SONGS) {
      for (const sc of s.scenes) {
        const hasChord = sc.chord !== undefined && sc.chord >= 0 && sc.chord <= 6;
        const hasNotes = Array.isArray(sc.notes);
        assert.ok(hasChord || hasNotes, `${s.title} scene ${sc.name}: neither chord nor notes`);
      }
    }
  }],

  ["every song lands within sensible duration (60s..240s)", () => {
    for (const s of SONGS) {
      const p = new SongPlayer({ song: s, getChord: () => [60], applyScene: () => {} });
      const ms = p.totalMs();
      assert.ok(ms >= 60_000 && ms <= 240_000, `${s.title} duration ${(ms/1000).toFixed(1)}s out of range`);
    }
  }],

  ["each song plays end-to-end against virtual clock without throwing", () => {
    for (const s of SONGS) {
      const clock = new VirtualClock();
      let ended = false;
      const p = new SongPlayer({
        song: s,
        getChord: (idx) => [60 + idx],
        applyScene: () => {},
        sendCC: () => {},
        onEnd: () => { ended = true; },
        schedule: (cb, ms) => clock.setTimeout(cb, ms),
        cancel: (id) => clock.clearTimeout(id),
        rng: seededRng(s.title.length),
      });
      p.play();
      clock.advance(p.totalMs() + 100);
      assert.ok(ended, `${s.title} did not fire onEnd`);
      assert.equal(p.isPlaying, false);
    }
  }],

  ["SongPlayer.play(song) accepts a song parameter, switching mid-life", () => {
    const clock = new VirtualClock();
    const fired = [];
    const p = new SongPlayer({
      getChord: () => [60],
      applyScene: (params) => fired.push(params.name),
      sendCC: () => {},
      schedule: (cb, ms) => clock.setTimeout(cb, ms),
      cancel: (id) => clock.clearTimeout(id),
    });
    // No initial song — should require one passed to play()
    assert.throws(() => p.play(), /no song/);
    p.play(SONGS[1]); // Prelude
    clock.advance(50);
    assert.equal(fired[0], SONGS[1].scenes[0].name);
    p.stop();
    fired.length = 0;
    p.play(SONGS[5]); // Gymnopédie
    clock.advance(50);
    assert.equal(fired[0], SONGS[5].scenes[0].name);
  }],

  ["each song's first scene fires its base CC payload", () => {
    for (const s of SONGS) {
      const clock = new VirtualClock();
      const ccs = [];
      const p = new SongPlayer({
        song: s,
        getChord: () => [60],
        applyScene: () => {},
        sendCC: (n, v) => ccs.push({ n, v }),
        schedule: (cb, ms) => clock.setTimeout(cb, ms),
        cancel: (id) => clock.clearTimeout(id),
      });
      p.play();
      clock.advance(10);
      // First scene of every song specifies a cc payload, so we expect AIR (CC 30) to be present.
      const sawAir = ccs.some(c => c.n === PHASE8_CC.air);
      assert.ok(sawAir, `${s.title} first scene didn't send AIR CC`);
    }
  }],
];
