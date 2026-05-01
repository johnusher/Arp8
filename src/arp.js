// Arpeggiator pattern engine. Pure / no I/O so it's trivially testable.

export const PATTERNS = ["up", "down", "updown", "downup", "converge", "diverge", "random", "randomOther", "randomOnce", "played", "chord"];

export function buildSequence(notes, pattern, octaves = 1) {
  if (notes.length === 0) return [];
  const expanded = [];
  // First, replicate notes across octaves (ascending stack).
  for (let o = 0; o < octaves; o++) {
    for (const n of notes) expanded.push(n + 12 * o);
  }
  // Sort copy for patterns that need ordering.
  const asc = [...expanded].sort((a, b) => a - b);
  switch (pattern) {
    case "up":       return asc;
    case "down":     return [...asc].reverse();
    case "updown": {
      // Up then down without repeating extremes: 1,2,3,4,3,2 (then repeat)
      if (asc.length <= 1) return asc;
      const down = [...asc].slice(1, -1).reverse();
      return [...asc, ...down];
    }
    case "downup": {
      const desc = [...asc].reverse();
      if (desc.length <= 1) return desc;
      const up = [...desc].slice(1, -1).reverse();
      return [...desc, ...up];
    }
    case "converge": {
      // outside-in: low, high, next-low, next-high...
      const out = [];
      let lo = 0, hi = asc.length - 1;
      while (lo <= hi) {
        out.push(asc[lo++]);
        if (lo <= hi) out.push(asc[hi--]);
      }
      return out;
    }
    case "diverge": {
      // inside-out
      const out = [];
      const mid = Math.floor((asc.length - 1) / 2);
      let lo = mid, hi = asc.length % 2 === 0 ? mid + 1 : mid + 1;
      out.push(asc[lo--]);
      while (lo >= 0 || hi < asc.length) {
        if (hi < asc.length) out.push(asc[hi++]);
        if (lo >= 0)         out.push(asc[lo--]);
      }
      return out;
    }
    case "played":
      return expanded; // in input order, replicated by octave
    case "chord":
      return [asc]; // marker: a single "step" is the whole chord (handled by player)
    case "random":
    case "randomOther":
    case "randomOnce":
      // Random patterns are stateful — handled by ArpState.
      return asc;
  }
  return asc;
}

// Stateful arp position tracker.
export class ArpState {
  constructor({ rng = Math.random } = {}) {
    this.rng = rng;
    this.notes = [];
    this.pattern = "up";
    this.octaves = 1;
    this.sequence = [];
    this.position = 0;
    this.lastRandom = -1;
    this.recentlyPlayed = new Set(); // for randomOther
  }

  setChord(notes) {
    this.notes = notes;
    this._rebuild();
  }

  setPattern(pattern) {
    this.pattern = pattern;
    this._rebuild();
  }

  setOctaves(octaves) {
    this.octaves = Math.max(1, Math.min(4, octaves | 0));
    this._rebuild();
  }

  _rebuild() {
    this.sequence = buildSequence(this.notes, this.pattern, this.octaves);
    this.position = 0;
    this.recentlyPlayed.clear();
    this.randomOnceSeq = null;
  }

  // Returns the next "step": either a single MIDI note, or an array of notes (for chord pattern), or null if no notes.
  next() {
    if (this.notes.length === 0 || this.sequence.length === 0) return null;

    if (this.pattern === "chord") {
      return this.sequence[0]; // array of notes
    }

    if (this.pattern === "random") {
      const i = Math.floor(this.rng() * this.sequence.length);
      return this.sequence[i];
    }

    if (this.pattern === "randomOther") {
      // Don't repeat any note until all have been played.
      if (this.recentlyPlayed.size >= this.sequence.length) this.recentlyPlayed.clear();
      const candidates = this.sequence.filter((_, i) => !this.recentlyPlayed.has(i));
      const choice = Math.floor(this.rng() * candidates.length);
      const note = candidates[choice];
      const idx = this.sequence.indexOf(note);
      this.recentlyPlayed.add(idx);
      return note;
    }

    if (this.pattern === "randomOnce") {
      // Pick a single random permutation, then loop it until chord changes.
      if (!this.randomOnceSeq) {
        this.randomOnceSeq = this._shuffle([...this.sequence]);
      }
      const n = this.randomOnceSeq[this.position % this.randomOnceSeq.length];
      this.position++;
      return n;
    }

    const note = this.sequence[this.position % this.sequence.length];
    this.position++;
    return note;
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  reset() {
    this.position = 0;
    this.recentlyPlayed.clear();
    this.randomOnceSeq = null;
  }
}
