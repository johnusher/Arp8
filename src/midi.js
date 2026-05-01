// Thin Web MIDI wrapper. Mirrors what we want for the app: device list, selected
// output, send helpers. Browser-only: requires navigator.requestMIDIAccess.

export class MidiBridge {
  constructor() {
    this.access = null;
    this.outputs = []; // [{id, name, port}]
    this.selectedId = null;
    this.onChange = null; // callback fired when device list changes
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      throw new Error("Web MIDI not supported in this browser. Try Chrome / Edge / Opera on macOS.");
    }
    // Chrome (2026) deprecates passing { sysex: false } — the permission prompt
    // is now mandatory regardless of sysex, so omitting the options object
    // suppresses the warning. Sysex defaults to false anyway.
    this.access = await navigator.requestMIDIAccess();
    this._refresh();
    this.access.onstatechange = () => {
      this._refresh();
      this.onChange?.();
    };
  }

  _refresh() {
    this.outputs = [];
    for (const out of this.access.outputs.values()) {
      this.outputs.push({ id: out.id, name: out.name || "(unnamed)", port: out });
    }
    if (this.selectedId && !this.outputs.find(o => o.id === this.selectedId)) {
      this.selectedId = null;
    }
    if (!this.selectedId && this.outputs.length > 0) {
      // Auto-select phase8 if present, else first device.
      const phase = this.outputs.find(o => /phase8/i.test(o.name));
      this.selectedId = (phase || this.outputs[0]).id;
    }
  }

  select(id) {
    this.selectedId = id;
  }

  send = (data, time) => {
    const out = this._currentPort();
    if (!out) {
      this.onLog?.({ ok: false, why: "no device selected", data });
      return;
    }
    try {
      out.send(data, time);
      this.onLog?.({ ok: true, port: out.name, data, time });
    } catch (e) {
      try { out.send(data); this.onLog?.({ ok: true, port: out.name, data, fallback: true }); }
      catch (e2) { this.onLog?.({ ok: false, why: e2.message, data }); }
    }
  };

  _currentPort() {
    const o = this.outputs.find(o => o.id === this.selectedId);
    return o?.port;
  }

  // Send a Control Change message. CC numbers per phase8 manual §12.0.
  sendCC = (ccNum, value, channel = 0, time = 0) => {
    this.send([0xb0 | (channel & 0x0f), ccNum & 0x7f, value & 0x7f], time);
  };

  // Panic: send all-notes-off and all-sound-off on every channel.
  panic() {
    const out = this._currentPort();
    if (!out) return;
    for (let ch = 0; ch < 16; ch++) {
      out.send([0xb0 | ch, 123, 0]);  // all notes off
      out.send([0xb0 | ch, 120, 0]);  // all sound off
    }
  }
}
