// Mock infrastructure for headless testing of the arp.

// Virtual clock with deterministic setTimeout/clearTimeout.
// Time is in milliseconds. advance(ms) fires any due callbacks in order.
export class VirtualClock {
  constructor() {
    this.time = 0;
    this.queue = [];
    this.nextId = 1;
  }
  now() { return this.time; }
  setTimeout(cb, delay) {
    const id = this.nextId++;
    this.queue.push({ id, time: this.time + delay, cb });
    this.queue.sort((a, b) => a.time - b.time || a.id - b.id);
    return id;
  }
  clearTimeout(id) {
    this.queue = this.queue.filter(t => t.id !== id);
  }
  advance(ms) {
    const target = this.time + ms;
    // Loop because new setTimeouts may be scheduled inside callbacks.
    while (this.queue.length && this.queue[0].time <= target) {
      const t = this.queue.shift();
      this.time = t.time;
      t.cb();
    }
    this.time = target;
  }
}

// Captures send() calls and exposes a structured event log.
export class MockMIDIOutput {
  constructor() {
    this.events = []; // [{time, type, channel, note, velocity, raw}]
  }
  send = (data, time = 0) => {
    const status = data[0];
    const cmd = status & 0xf0;
    const channel = status & 0x0f;
    const note = data[1];
    const velocity = data[2];
    let type;
    if      (cmd === 0x90 && velocity > 0) type = "noteOn";
    else if (cmd === 0x80 || (cmd === 0x90 && velocity === 0)) type = "noteOff";
    else if (cmd === 0xb0) type = "cc";
    else                    type = "raw";
    this.events.push({ time, type, channel, note, velocity, raw: [...data] });
  };

  notesAt(time) {
    return this.events.filter(e => Math.abs(e.time - time) < 0.001);
  }

  reset() { this.events.length = 0; }
}

// Deterministic RNG (mulberry32) so random patterns can be asserted exactly.
export function seededRng(seed = 0xdecafbad) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
