// ARP8 — UI controller. Wires DOM to the engine.
import { MidiBridge } from "./midi.js";
import { ArpState, PATTERNS } from "./arp.js";
import { Scheduler, RATES, makeStepProvider } from "./scheduler.js";
import {
  diatonicChords, phase8Tines, snapChord, midiOf, nameOf, NOTE_NAMES,
  pitchToSlotMidi,
} from "./chords.js";
import { TINES_AND_TIME, SongPlayer } from "./song.js";

// ───── State ────────────────────────────────────────────────────────────────
const state = {
  bpm:      120,
  rate:     "1/8",
  octaves:  1,
  gate:     0.5,
  swing:    0,
  velocity: 100,
  pattern:  "up",
  channel:  0,
  latch:    true,
  snap:     true,
  key:      "C",
  mode:     "major",
  // Phase8 default ships in STATIC mode (slots → MIDI 36..43). Match that out of
  // the box; user can switch to "frequency" if they re-calibrated the synth.
  phase8Mode: "static",
  armedChord: null,        // {label, notes}
  armedPadId: null,
  pressedPadId: null,      // for non-latched mouse-hold play
  grid:     Array.from({ length: 16 }, () => ({ enabled: true })),
  tines:    phase8Tines(), // C3..C4
};

const RATE_LIST = ["1/4", "1/4T", "1/8", "1/8T", "1/16", "1/16T", "1/32"];
const PAD_PALETTE = [
  "var(--pad-1)", "var(--pad-2)", "var(--pad-3)", "var(--pad-4)",
  "var(--pad-5)", "var(--pad-6)", "var(--pad-7)", "var(--pad-8)", "var(--pad-9)",
];

// ───── Engine pieces ────────────────────────────────────────────────────────
const arp   = new ArpState();
const midi  = new MidiBridge();

// All MIDI bytes flow through here so we apply the phase8 mode transform once,
// at the wire boundary. Note On/Off pitches get rewritten to slot-MIDI when
// the synth is in STATIC or TRANSPOSED mode; the rest of the app keeps thinking
// in real pitches (chord theory, tine flashes, displays).
function sendToPhase8(bytes, time) {
  const status = bytes[0] & 0xf0;
  const isNote = status === 0x90 || status === 0x80;
  if (isNote && state.phase8Mode !== "frequency") {
    const slotMidi = pitchToSlotMidi(bytes[1], state.tines, state.phase8Mode);
    midi.send([bytes[0], slotMidi & 0x7f, bytes[2]], time);
  } else {
    midi.send(bytes, time);
  }
}

const sched = new Scheduler({
  now: () => performance.now(),
  send: sendToPhase8,
  schedule: (cb, delay) => setTimeout(cb, delay),
  cancel: (id) => clearTimeout(id),
});

// ───── DOM helpers ──────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

// ───── MIDI device list ─────────────────────────────────────────────────────
const midiSelect = $("midi-out");
const midiStatus = $("midi-status");

function refreshMidiList() {
  const sel = midi.selectedId;
  midiSelect.innerHTML = "";
  if (midi.outputs.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "(no devices)";
    opt.disabled = true;
    midiSelect.appendChild(opt);
    midiStatus.classList.remove("ok");
    return;
  }
  for (const o of midi.outputs) {
    const opt = document.createElement("option");
    opt.value = o.id;
    opt.textContent = o.name;
    if (o.id === sel) opt.selected = true;
    midiSelect.appendChild(opt);
  }
  midiStatus.classList.add("ok");
}
midiSelect.addEventListener("change", () => {
  midi.select(midiSelect.value);
});

// ───── Tines ────────────────────────────────────────────────────────────────
const tinesEl = $("tines");
function buildTines() {
  tinesEl.innerHTML = "";
  for (const t of state.tines) {
    const el = document.createElement("div");
    el.className = "tine";
    el.dataset.midi = t;
    el.innerHTML = `
      <div class="tine-bar"></div>
      <div class="tine-label">${NOTE_NAMES[t % 12]}</div>
      <div class="tine-num">${nameOf(t)}</div>
    `;
    tinesEl.appendChild(el);
  }
}

function flashTines(notes) {
  for (const note of notes) {
    const el = tinesEl.querySelector(`.tine[data-midi="${note}"]`);
    if (!el) continue;
    el.classList.add("active");
    setTimeout(() => el.classList.remove("active"), Math.max(60, 60 * state.gate * 4));
  }
}

// ───── Step grid ────────────────────────────────────────────────────────────
const stepsEl = $("steps");
function buildSteps() {
  stepsEl.innerHTML = "";
  state.grid.forEach((cell, i) => {
    const el = document.createElement("div");
    el.className = "step" + (cell.enabled ? " on" : "") + (i % 4 === 0 ? " beat" : "");
    el.dataset.idx = i;
    el.addEventListener("click", () => {
      cell.enabled = !cell.enabled;
      el.classList.toggle("on", cell.enabled);
    });
    el.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      cell.enabled = true;
      el.classList.add("on");
    });
    stepsEl.appendChild(el);
  });
}
function flashStep(rawIndex) {
  const i = ((rawIndex % state.grid.length) + state.grid.length) % state.grid.length;
  const el = stepsEl.children[i];
  if (!el) return;
  el.classList.add("playing");
  setTimeout(() => el.classList.remove("playing"), 100);
}

// ───── Patterns ─────────────────────────────────────────────────────────────
const patternsEl = $("patterns");
function setPattern(p) {
  state.pattern = p;
  arp.setPattern(p);
  for (const b of patternsEl.querySelectorAll(".pat")) {
    b.classList.toggle("active", b.dataset.p === p);
  }
}
patternsEl.addEventListener("click", (e) => {
  const b = e.target.closest(".pat");
  if (!b) return;
  setPattern(b.dataset.p);
});

// ───── Chord pads ───────────────────────────────────────────────────────────
const chordPadsEl = $("chord-pads");

function refreshChords() {
  chordPadsEl.innerHTML = "";
  const root3 = midiOf(state.key, 3);
  const chords = diatonicChords(root3, state.mode);

  let inRange = 0;
  chords.forEach((c, i) => {
    const padNotes = computePadNotes(c.notes);
    const allInRange = padNotes.every(n => state.tines.includes(n)) || !state.snap;
    if (allInRange) inRange++;
    const pad = document.createElement("button");
    pad.className = "pad";
    if (!allInRange) pad.classList.add("out-of-range");
    pad.style.setProperty("--pad-color", PAD_PALETTE[i % PAD_PALETTE.length]);
    pad.dataset.idx = i;
    pad.dataset.label = c.label;
    pad.dataset.notes = padNotes.join(",");
    pad.innerHTML = `
      <div class="pad-roman">${c.roman}</div>
      <div class="pad-name">${c.label}</div>
      <div class="pad-notes">${padNotes.map(nameOf).join(" · ")}</div>
    `;
    chordPadsEl.appendChild(pad);
  });

  $("key-tip").textContent = state.snap
    ? `notes that fit your phase8: ${inRange}/${chords.length}`
    : `${chords.length} chords · snap-to-tines off`;
}

function computePadNotes(rawNotes) {
  return state.snap ? snapChord(rawNotes, state.tines) : rawNotes;
}

function setArmedChord(idx, fromMouse = false) {
  const pad = chordPadsEl.children[idx];
  if (!pad) return;
  const notes = pad.dataset.notes.split(",").map(Number);
  arp.setChord(notes);
  state.armedChord = { label: pad.dataset.label, notes };
  state.armedPadId = idx;
  for (const p of chordPadsEl.children) p.classList.remove("armed");
  pad.classList.add("armed");
  $("np-chord").textContent = pad.dataset.label;
  if (!sched.running) startSched();
}

function releaseChord() {
  state.armedChord = null;
  state.armedPadId = null;
  arp.setChord([]);
  for (const p of chordPadsEl.children) p.classList.remove("armed");
  $("np-chord").textContent = "—";
}

chordPadsEl.addEventListener("mousedown", (e) => {
  const pad = e.target.closest(".pad");
  if (!pad) return;
  if (state.songPlaying) stopSong();
  const idx = Number(pad.dataset.idx);
  state.pressedPadId = idx;
  setArmedChord(idx, true);
});
chordPadsEl.addEventListener("mouseup", () => {
  if (!state.latch && state.pressedPadId !== null) releaseChord();
  state.pressedPadId = null;
});
chordPadsEl.addEventListener("mouseleave", () => {
  if (!state.latch && state.pressedPadId !== null) releaseChord();
  state.pressedPadId = null;
});

// ───── Knobs ────────────────────────────────────────────────────────────────
function setupKnob(id, opts, onChange) {
  const el = $(id);
  const min = Number(el.dataset.min);
  const max = Number(el.dataset.max);
  el.dataset.value = opts.initial;
  paintKnob(el, opts.initial, min, max);

  let dragStart = null, valueStart = 0;
  el.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragStart = e.clientY;
    valueStart = Number(el.dataset.value);
    document.body.style.cursor = "ns-resize";
  });
  window.addEventListener("mousemove", (e) => {
    if (dragStart == null) return;
    const dy = dragStart - e.clientY;
    const range = max - min;
    const sensitivity = e.shiftKey ? 800 : 200;
    let v = valueStart + (dy / sensitivity) * range;
    v = Math.max(min, Math.min(max, v));
    if (Number(el.dataset.int)) v = Math.round(v);
    if (Number(el.dataset.value) !== v) {
      el.dataset.value = v;
      paintKnob(el, v, min, max);
      onChange(v);
    }
  });
  window.addEventListener("mouseup", () => {
    dragStart = null;
    document.body.style.cursor = "";
  });
  el.addEventListener("wheel", (e) => {
    e.preventDefault();
    const range = max - min;
    const step = Number(el.dataset.int) ? 1 : range / 100;
    let v = Number(el.dataset.value) - Math.sign(e.deltaY) * step;
    v = Math.max(min, Math.min(max, v));
    if (Number(el.dataset.int)) v = Math.round(v);
    el.dataset.value = v;
    paintKnob(el, v, min, max);
    onChange(v);
  }, { passive: false });
}

function paintKnob(el, v, min, max) {
  const t = (v - min) / (max - min);
  const ARC_SPAN = 270; // degrees
  const ARC_START = -135;
  const rot = ARC_START + ARC_SPAN * t;
  el.style.setProperty("--rot", `${rot}deg`);
  el.style.setProperty("--arc", `${ARC_SPAN * t}`);
}

setupKnob("k-rate", { initial: RATE_LIST.indexOf(state.rate) }, (v) => {
  state.rate = RATE_LIST[v];
  $("v-rate").textContent = state.rate;
  sched.setRate(state.rate);
});
setupKnob("k-oct", { initial: state.octaves }, (v) => {
  state.octaves = v;
  arp.setOctaves(v);
  $("v-oct").textContent = `${v}`;
});
setupKnob("k-gate", { initial: 50 }, (v) => {
  state.gate = v / 100;
  $("v-gate").textContent = `${v}%`;
  sched.setGate(state.gate);
});
setupKnob("k-swing", { initial: 0 }, (v) => {
  state.swing = v / 100;
  $("v-swing").textContent = `${v}%`;
  sched.setSwing(state.swing);
});
setupKnob("k-vel", { initial: 100 }, (v) => {
  state.velocity = v;
  $("v-vel").textContent = `${v}`;
  sched.setVelocity(v);
});

// ───── Switches & channel ──────────────────────────────────────────────────
$("sw-latch").addEventListener("change", (e) => {
  state.latch = e.target.checked;
  if (!state.latch && !state.pressedPadId) releaseChord();
});
$("sw-snap").addEventListener("change", (e) => {
  state.snap = e.target.checked;
  refreshChords();
  if (state.armedPadId !== null) setArmedChord(state.armedPadId);
});
$("sel-channel").addEventListener("change", (e) => {
  state.channel = Number(e.target.value) - 1;
  sched.setChannel(state.channel);
});
$("sel-key").addEventListener("change", (e) => {
  state.key = e.target.value;
  refreshChords();
});
$("sel-mode").addEventListener("change", (e) => {
  state.mode = e.target.value;
  refreshChords();
});
$("sel-p8mode").addEventListener("change", (e) => {
  state.phase8Mode = e.target.value;
});

// ───── Tempo ────────────────────────────────────────────────────────────────
function setBpm(b) {
  state.bpm = Math.max(20, Math.min(300, Math.round(b)));
  $("bpm-num").textContent = state.bpm;
  sched.setBpm(state.bpm);
}
$("bpm-up").addEventListener("click",   () => setBpm(state.bpm + 1));
$("bpm-down").addEventListener("click", () => setBpm(state.bpm - 1));

// tap tempo
let taps = [];
$("tap").addEventListener("click", () => {
  const now = performance.now();
  taps = taps.filter(t => now - t < 2500);
  taps.push(now);
  if (taps.length >= 2) {
    const intervals = [];
    for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    setBpm(60000 / avg);
  }
});

// pulse light on the BPM screen
const pulseEl = $("pulse");
function pulseBeat() {
  pulseEl.classList.add("beat");
  setTimeout(() => pulseEl.classList.remove("beat"), 80);
}
let pulseTimer = null;
function restartPulse() {
  if (pulseTimer) clearInterval(pulseTimer);
  const beatMs = 60000 / state.bpm;
  pulseTimer = setInterval(pulseBeat, beatMs);
}
restartPulse();

// ───── Transport ────────────────────────────────────────────────────────────
const playBtn = $("btn-play");
function startSched() {
  const provider = makeStepProvider({ arp, grid: state.grid });
  sched.start({
    bpm: state.bpm,
    rate: state.rate,
    gate: state.gate,
    swing: state.swing,
    velocity: state.velocity,
    channel: state.channel,
    getStep: provider,
    onStep: ({ time, notes, stepIndex }) => {
      // Schedule UI updates for the *audible* moment.
      const delay = Math.max(0, time - performance.now());
      setTimeout(() => {
        flashStep(stepIndex);
        if (notes.length) flashTines(notes);
        const np = notes.length === 1 ? nameOf(notes[0]) : notes.length > 1 ? `${notes.length} ♪` : "—";
        $("np-note").textContent = np;
      }, delay);
    },
  });
  playBtn.classList.add("armed");
  restartPulse();
}
function stopSched() {
  sched.stop();
  midi.panic();
  playBtn.classList.remove("armed");
  $("np-note").textContent = "—";
  for (const t of tinesEl.children) t.classList.remove("active");
  if (state.songPlaying) {
    songPlayer.stop();
    state.songPlaying = false;
    songBtn.classList.remove("armed");
    $("np-chord").textContent = "—";
  }
}

playBtn.addEventListener("click", () => {
  if (sched.running) stopSched(); else startSched();
});
$("btn-stop").addEventListener("click", stopSched);
$("btn-panic").addEventListener("click", () => {
  midi.panic();
  for (const t of tinesEl.children) t.classList.remove("active");
});

// Test: fire a single C3 (note 48) for 400ms straight to MIDI, bypassing
// the arp/scheduler entirely. If you don't hear a tine, the issue is below
// us (channel mismatch, phase8 receive mode, or routing).
$("btn-test").addEventListener("click", () => {
  const ch = state.channel & 0x0f;
  const pitch = state.tines[0]; // lowest installed resonator (C3 by default)
  const now = performance.now();
  sendToPhase8([0x90 | ch, pitch, 100], now);
  sendToPhase8([0x80 | ch, pitch, 0],   now + 400);
  flashTines([pitch]);
  $("np-note").textContent = nameOf(pitch);
});

// ───── Song player ──────────────────────────────────────────────────────────
const songBtn = $("btn-song");

function getChordForSong(idx) {
  if (idx === undefined || idx === null) return [];
  const root3 = midiOf(state.key, 3);
  const chords = diatonicChords(root3, state.mode);
  if (!chords[idx]) return [];
  const raw = chords[idx].notes;
  return state.snap ? snapChord(raw, state.tines) : raw;
}

function sendCCToPhase8(ccNum, value) {
  sendToPhase8([0xb0 | (state.channel & 0x0f), ccNum & 0x7f, value & 0x7f], performance.now());
}

function highlightChordPad(idx) {
  for (const p of chordPadsEl.children) p.classList.remove("armed");
  if (idx === undefined || idx === null) return;
  const pad = chordPadsEl.children[idx];
  if (pad) pad.classList.add("armed");
}

function applySongScene(params) {
  // Push pattern / rate / octaves / gate / swing / velocity / bpm into the engine + UI.
  if (params.pattern  !== undefined) { setPattern(params.pattern); }
  if (params.rate     !== undefined) { state.rate = params.rate;            sched.setRate(params.rate);     $("v-rate").textContent  = params.rate; }
  if (params.octaves  !== undefined) { state.octaves = params.octaves;      arp.setOctaves(params.octaves); $("v-oct").textContent   = `${params.octaves}`; }
  if (params.gate     !== undefined) { state.gate = params.gate;            sched.setGate(params.gate);     $("v-gate").textContent  = `${Math.round(params.gate * 100)}%`; }
  if (params.swing    !== undefined) { state.swing = params.swing;          sched.setSwing(params.swing);   $("v-swing").textContent = `${Math.round(params.swing * 100)}%`; }
  if (params.velocity !== undefined) { state.velocity = params.velocity;    sched.setVelocity(params.velocity); $("v-vel").textContent = `${params.velocity}`; }
  if (params.bpm      !== undefined) { setBpm(params.bpm); }

  // Chord: explicit notes (Cage / pause) overrides diatonic chord lookup.
  arp.setChord(params.notes);
  if (params.notes && params.notes.length > 0) {
    flashTines(params.notes);
  }

  // Highlight the corresponding diatonic chord pad if this scene uses one.
  if (params.chord !== undefined && (!params.notes || params.notes.length > 1)) {
    highlightChordPad(params.chord);
  } else {
    highlightChordPad(null);
  }
}

const songPlayer = new SongPlayer({
  song: TINES_AND_TIME,
  getChord: getChordForSong,
  applyScene: applySongScene,
  sendCC: sendCCToPhase8,
  onScene: (params, idx, total) => {
    $("np-chord").textContent = `♫ ${TINES_AND_TIME.title} — ${params.name} (${idx + 1}/${total})`;
    $("np-note").textContent  = params.notes && params.notes.length === 1
      ? nameOf(params.notes[0])
      : params.notes && params.notes.length === 0
        ? "—"
        : params.notes
          ? `${params.notes.length} ♪`
          : "—";
  },
  onEnd: () => {
    songBtn.classList.remove("armed");
    state.songPlaying = false;
    stopSched();
    $("np-chord").textContent = "—";
  },
});

state.songPlaying = false;

function startSong() {
  if (state.songPlaying) return;
  if (sched.running) stopSched();
  // Start scheduler with the first scene's BPM placeholder (will be overridden immediately).
  arp.setChord([]); // no chord until first scene fires
  startSched();
  state.songPlaying = true;
  songBtn.classList.add("armed");
  songPlayer.play();
}
function stopSong() {
  songPlayer.stop();
  state.songPlaying = false;
  songBtn.classList.remove("armed");
  midi.panic();
  for (const t of tinesEl.children) t.classList.remove("active");
  $("np-chord").textContent = "—";
}
songBtn.addEventListener("click", () => {
  if (state.songPlaying) stopSong(); else startSong();
});

// ───── Keyboard shortcuts ───────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
  if (e.code === "Space") {
    e.preventDefault();
    if (sched.running) stopSched(); else startSched();
    return;
  }
  if (e.key === "Escape") {
    midi.panic();
    return;
  }
  // 1..7 for diatonic chords. 8/9 for extensions if added.
  const map = { "1":0, "2":1, "3":2, "4":3, "5":4, "6":5, "7":6 };
  if (map[e.key] !== undefined) setArmedChord(map[e.key]);
});

// ───── Demo mode (for screenshots / hardware-less browsing) ────────────────
// Activated by ?demo in the URL. Skips real MIDI init, mocks a phase8 device
// in the dropdown, primes a chord and pattern so the UI shows something alive.
function applyDemo() {
  const params = new URLSearchParams(location.search);
  if (!params.has("demo")) return false;
  midiSelect.innerHTML = "";
  const opt = document.createElement("option");
  opt.textContent = "phase8 out";
  opt.selected = true;
  midiSelect.appendChild(opt);
  midiStatus.classList.add("ok");
  $("midi-log").textContent = "midi: phase8 out ch1 ON  C2 v100  (#42)";
  setPattern(params.get("pattern") || "updown");
  const padIdx = Number(params.get("chord") ?? 3);
  setTimeout(() => {
    if (params.has("song")) {
      // Fake the song-playing visual state for screenshots.
      songBtn.classList.add("armed");
      $("np-chord").textContent = "♫ Tines & Time — chorus·a (15/26)";
      $("np-note").textContent  = "A3";
      $("midi-log").textContent = "midi: phase8 out ch1 CC  AIR=105  (#341)";
      const pad = chordPadsEl.children[5]; // vi armed
      if (pad) pad.classList.add("armed");
      // Light all 8 tines for the chorus
      for (const t of tinesEl.children) t.classList.add("active");
      stepsEl.children[8]?.classList.add("playing");
      return;
    }
    const pad = chordPadsEl.children[padIdx];
    if (pad) pad.classList.add("armed");
    $("np-chord").textContent = pad?.dataset.label ?? "";
    $("np-note").textContent  = pad ? nameOf(Number(pad.dataset.notes.split(",")[0])) : "—";
    const lit = pad ? pad.dataset.notes.split(",").map(Number).slice(0, 1) : [];
    for (const n of lit) {
      const el = tinesEl.querySelector(`.tine[data-midi="${n}"]`);
      if (el) el.classList.add("active");
    }
    stepsEl.children[4]?.classList.add("playing");
  }, 50);
  return true;
}

// ───── Boot ─────────────────────────────────────────────────────────────────
async function boot() {
  buildTines();
  buildSteps();
  refreshChords();
  setPattern("up");

  if (applyDemo()) return;

  // Live MIDI monitor in the footer — last byte sent and any send errors.
  const logEl = $("midi-log");
  let logCount = 0;
  midi.onLog = ({ ok, why, port, data, time }) => {
    logCount++;
    if (!ok) {
      logEl.classList.add("err");
      logEl.textContent = `midi: ${why}`;
      console.warn("[arp8] midi send failed:", why, data);
      return;
    }
    logEl.classList.remove("err");
    const cmd = data[0] & 0xf0;
    const ch  = (data[0] & 0x0f) + 1;
    const tag = cmd === 0x90 && data[2] > 0 ? "ON " : cmd === 0x80 || cmd === 0x90 ? "OFF" : cmd === 0xb0 ? "CC " : "RAW";
    logEl.textContent = `midi: ${port} ch${ch} ${tag} ${nameOf(data[1])} v${data[2]}  (#${logCount})`;
  };

  try {
    await midi.init();
    midi.onChange = refreshMidiList;
    refreshMidiList();
  } catch (err) {
    midiStatus.classList.add("err");
    const opt = document.createElement("option");
    opt.textContent = err.message;
    opt.disabled = true;
    midiSelect.appendChild(opt);
    console.warn("[arp8] MIDI init failed:", err);
  }
}
boot();
