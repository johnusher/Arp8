// Lookahead scheduler for arp playback.
// Style: run a tick every TICK_MS, schedule any notes whose time falls within
// the next LOOKAHEAD_MS via send(data, exactTimestamp). Web MIDI / virtual clock
// will dispatch the byte stream at the right moment.
//
// All time values are milliseconds. The clock is injected (`now`) so tests
// drive a virtual clock and assert exact event times.

// Rate name -> beat fraction (1 beat = 1 quarter note).
export const RATES = {
  "1/4":   1,
  "1/4T":  2 / 3,
  "1/8":   0.5,
  "1/8T":  1 / 3,
  "1/16":  0.25,
  "1/16T": 1 / 6,
  "1/32":  0.125,
};

export function intervalMs(bpm, rate) {
  const beats = RATES[rate];
  if (!beats) throw new Error(`unknown rate: ${rate}`);
  const msPerBeat = 60000 / bpm;
  return msPerBeat * beats;
}

export class Scheduler {
  // deps: { now: () => ms, send: (bytes, ms) => void, schedule: (cb, delayMs) => id, cancel: (id) => void }
  // opts: { bpm, rate, gate (0..1), swing (0..0.5), velocity (0..127), channel (0..15), getStep: () => Step | null }
  // A Step is { notes: number[], gate?: number, velocity?: number } where notes[] are the MIDI notes to fire simultaneously.
  constructor(deps) {
    this.now = deps.now;
    this.send = deps.send;
    this.schedule = deps.schedule;
    this.cancel = deps.cancel;
    this.tickId = null;
    this.running = false;

    this.LOOKAHEAD_MS = 100;
    this.TICK_MS = 25;

    this.opts = null;
    this.nextNoteTime = 0;
    this.stepIndex = 0;
    this.activeNotes = []; // notes currently sounding [{pitch, channel, offTime}]
  }

  start(opts) {
    if (this.running) this.stop();
    this.opts = { swing: 0, gate: 0.5, velocity: 100, channel: 0, ...opts };
    this.running = true;
    this.stepIndex = 0;
    this.nextNoteTime = this.now();
    this._tick();
  }

  stop() {
    this.running = false;
    if (this.tickId !== null) {
      this.cancel(this.tickId);
      this.tickId = null;
    }
    // All-notes-off: send note-off for any pending active notes immediately.
    const t = this.now();
    for (const n of this.activeNotes) {
      this.send([0x80 | n.channel, n.pitch, 0], t);
    }
    this.activeNotes = [];
  }

  setBpm(bpm)         { if (this.opts) this.opts.bpm = bpm; }
  setRate(rate)       { if (this.opts) this.opts.rate = rate; }
  setGate(gate)       { if (this.opts) this.opts.gate = gate; }
  setSwing(swing)     { if (this.opts) this.opts.swing = swing; }
  setVelocity(v)      { if (this.opts) this.opts.velocity = v; }
  setChannel(c)       { if (this.opts) this.opts.channel = c; }

  _tick() {
    if (!this.running) return;
    const horizon = this.now() + this.LOOKAHEAD_MS;
    while (this.nextNoteTime < horizon) {
      this._fireStep(this.nextNoteTime);
      this._advance();
    }
    this.tickId = this.schedule(() => this._tick(), this.TICK_MS);
  }

  _fireStep(time) {
    const step = this.opts.getStep ? this.opts.getStep(this.stepIndex) : null;
    const stepIndex = this.stepIndex;
    // Always notify the UI hook so step indicators advance even on rests.
    if (step && this.opts.onStep) {
      this.opts.onStep({ time, notes: step.notes ?? [], stepIndex });
    }
    if (!step || !step.notes || step.notes.length === 0) return;
    const ch = this.opts.channel & 0x0f;
    const vel = step.velocity ?? this.opts.velocity;
    const gate = step.gate ?? this.opts.gate;
    const interval = intervalMs(this.opts.bpm, this.opts.rate);
    const dur = Math.max(10, interval * gate);
    for (const n of step.notes) {
      this.send([0x90 | ch, n & 0x7f, vel & 0x7f], time);
      this.send([0x80 | ch, n & 0x7f, 0], time + dur);
    }
  }

  _advance() {
    const interval = intervalMs(this.opts.bpm, this.opts.rate);
    const swing = this.opts.swing || 0;
    if (this.stepIndex % 2 === 0) {
      this.nextNoteTime += interval * (1 + swing);
    } else {
      this.nextNoteTime += interval * (1 - swing);
    }
    this.stepIndex++;
  }
}

// Helper: compose an "arp player" that pulls from an ArpState and respects
// per-step toggles & velocity from a rhythm grid.
// grid is an array of { enabled: bool, velocity?: number } — its length defines the rhythm period.
export function makeStepProvider({ arp, grid }) {
  return function getStep(rawIndex) {
    const gridLen = grid.length || 16;
    const cell = grid[rawIndex % gridLen] ?? { enabled: true };
    if (!cell.enabled) {
      return { notes: [] }; // emit silence; arp position does not advance
    }
    const next = arp.next();
    if (next === null) return null;
    const notes = Array.isArray(next) ? next : [next];
    return { notes, velocity: cell.velocity };
  };
}
