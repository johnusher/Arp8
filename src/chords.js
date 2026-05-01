// Music theory for ARP8.
// All "midi" values are integer MIDI note numbers (0..127). C-1 = 0, C4 = 60 (yes, MIDI's C4 is what some call "middle C"; we use that convention).

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function midiOf(name, octave) {
  const i = NOTE_NAMES.indexOf(name);
  if (i < 0) throw new Error(`bad note: ${name}`);
  return (octave + 1) * 12 + i;
}

export function nameOf(midi) {
  const n = NOTE_NAMES[midi % 12];
  const o = Math.floor(midi / 12) - 1;
  return `${n}${o}`;
}

// Chord qualities: intervals in semitones from root.
export const QUALITIES = {
  maj:    [0, 4, 7],
  min:    [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  sus2:   [0, 2, 7],
  sus4:   [0, 5, 7],
  maj7:   [0, 4, 7, 11],
  min7:   [0, 3, 7, 10],
  dom7:   [0, 4, 7, 10],
  dim7:   [0, 3, 6, 9],
  m7b5:   [0, 3, 6, 10],
  add9:   [0, 4, 7, 14],
  madd9:  [0, 3, 7, 14],
  maj9:   [0, 4, 7, 11, 14],
  min9:   [0, 3, 7, 10, 14],
};

export function chordNotes(rootMidi, quality) {
  const ivs = QUALITIES[quality];
  if (!ivs) throw new Error(`unknown quality: ${quality}`);
  return ivs.map(i => rootMidi + i);
}

// Diatonic triad qualities for major / natural minor scales.
const MAJOR_DIATONIC  = ["maj", "min", "min", "maj", "maj", "min", "dim"];
const MINOR_DIATONIC  = ["min", "dim", "maj", "min", "min", "maj", "maj"];
const ROMAN_MAJOR     = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];
const ROMAN_MINOR     = ["i", "ii°", "III", "iv", "v", "VI", "VII"];

const MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

// Returns the seven diatonic triads in a key.
// keyRootMidi is the MIDI of the tonic in the desired starting octave.
export function diatonicChords(keyRootMidi, mode = "major") {
  const ivs = mode === "minor" ? MINOR_INTERVALS : MAJOR_INTERVALS;
  const qs  = mode === "minor" ? MINOR_DIATONIC : MAJOR_DIATONIC;
  const rs  = mode === "minor" ? ROMAN_MINOR    : ROMAN_MAJOR;
  return ivs.map((iv, i) => {
    const root = keyRootMidi + iv;
    const q = qs[i];
    return {
      degree: i + 1,
      roman: rs[i],
      root,
      rootName: NOTE_NAMES[root % 12],
      quality: q,
      notes: chordNotes(root, q),
      label: `${NOTE_NAMES[root % 12]}${q === "maj" ? "" : q === "min" ? "m" : q === "dim" ? "°" : q}`,
    };
  });
}

// The 8 phase8 tines as the MIDI pitch of each *installed* resonator. Default
// assumes the user installed a C-major set spanning C3..C4.
export function phase8Tines() {
  return [
    midiOf("C", 3), midiOf("D", 3), midiOf("E", 3), midiOf("F", 3),
    midiOf("G", 3), midiOf("A", 3), midiOf("B", 3), midiOf("C", 4),
  ];
}

// Per the phase8 manual §8.4, the synth can be in one of three "MIDI Note
// Assignment" modes:
//  - "static"      slots 1..8 receive on MIDI 36..43 (Phase8 factory default)
//  - "frequency"   each slot receives on the MIDI note matching its tuned pitch
//  - "transposed"  same as static but shifted up two octaves -> 60..67
// In STATIC and TRANSPOSED modes the slot index is what matters, NOT the pitch.
// We map our pitch-space chord into the slot-MIDI the synth will recognise.
export const PHASE8_MODE_BASE = { static: 36, transposed: 60 };

export function pitchToSlotMidi(pitch, tines, mode) {
  if (mode === "frequency") return pitch;
  const base = PHASE8_MODE_BASE[mode];
  if (base === undefined) return pitch;
  const idx = tines.indexOf(pitch);
  if (idx < 0) return pitch; // no slot installed at this pitch — let it through
  return base + idx;
}

// Snap a midi note to the available tines. Preserves note class (pitch letter)
// when possible — F4 with no F4 tine but an F3 tine snaps to F3, not the
// chromatically nearest tine. Falls back to nearest tine when no class match.
// Ties go to the lower (warmer) tine.
export function snapToTines(midi, tines) {
  const cls = ((midi % 12) + 12) % 12;
  const matches = tines.filter(t => ((t % 12) + 12) % 12 === cls);
  if (matches.length > 0) {
    let best = matches[0], bestD = Math.abs(midi - matches[0]);
    for (const m of matches) {
      const d = Math.abs(midi - m);
      if (d < bestD) { best = m; bestD = d; }
    }
    return best;
  }
  let best = tines[0], bestD = Math.abs(midi - tines[0]);
  for (const t of tines) {
    const d = Math.abs(midi - t);
    if (d < bestD) { best = t; bestD = d; }
  }
  return best;
}

// Quantize a chord (array of MIDI notes) to the available tine set.
// Drops duplicates after snapping.
export function snapChord(notes, tines) {
  const out = [];
  const seen = new Set();
  for (const n of notes) {
    const s = snapToTines(n, tines);
    if (!seen.has(s)) { seen.add(s); out.push(s); }
  }
  return out;
}
