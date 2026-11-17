// Procedural audio: no files, everything is synthesised with WebAudio.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.engine = null;
    this.engineGain = null;
    this.musicTimer = null;
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.42;
      this.master.connect(this.ctx.destination);
    } catch (e) {
      this.ctx = null;
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  tone(freq, dur, type = 'sine', vol = 0.2, slide = 0, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  noise(dur = 0.12, vol = 0.3, freq = 900, q = 1) {
    if (!this.ctx || this.muted) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(f).connect(g).connect(this.master);
    src.start();
  }

  shot(kind = 'pistol') {
    this.resume();
    if (this.muted) return;
    const base = kind === 'shotgun' ? 140 : kind === 'smg' ? 260 : 200;
    this.noise(0.09, 0.45, base * 4, 0.7);
    this.tone(base, 0.09, 'square', 0.18, -base * 0.5);
  }

  hit() {
    this.noise(0.06, 0.28, 400, 1.2);
  }

  explosion() {
    this.resume();
    if (this.muted) return;
    this.noise(0.5, 0.7, 160, 0.5);
    this.tone(70, 0.5, 'sine', 0.35, -40);
  }

  pickup() {
    this.tone(660, 0.08, 'triangle', 0.18);
    this.tone(990, 0.12, 'triangle', 0.16, 0, 0.07);
  }

  ui() {
    this.tone(520, 0.05, 'triangle', 0.08);
  }

  siren() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(620, t);
    o.frequency.linearRampToValueAtTime(880, t + 0.35);
    o.frequency.linearRampToValueAtTime(620, t + 0.7);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + 0.05);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.72);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.75);
  }

  startEngine() {
    this.resume();
    if (!this.ctx || this.engine) return;
    this.engine = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 55;
    this.engineGain.gain.value = 0.0001;
    this.engine.connect(this.engineGain).connect(this.master);
    this.engine.start();
  }

  setEngine(speed, on) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.engine.frequency.setTargetAtTime(45 + Math.min(120, speed * 0.5), t, 0.08);
    this.engineGain.gain.setTargetAtTime(on && !this.muted ? 0.08 : 0.0001, t, 0.1);
  }

  stopEngine() {
    if (this.engineGain && this.ctx) this.engineGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.1);
  }

  startMusic() {
    this.resume();
    if (!this.ctx || this.musicTimer) return;
    const bass = [55, 55, 73.42, 65.41, 55, 55, 82.41, 73.42];
    const arp = [220, 329.63, 261.63, 392, 220, 293.66, 329.63, 261.63];
    this.musicTimer = setInterval(() => {
      if (this.muted) return;
      const i = this.step % 8;
      this.tone(bass[i], 0.22, 'sawtooth', 0.055);
      this.tone(arp[i], 0.16, 'triangle', 0.035, 0, 0.12);
      if (this.step % 4 === 0) this.noise(0.04, 0.06, 6000, 2);
      this.step++;
    }, 260);
  }

  stopMusic() {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  toggle() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.42;
    return this.muted;
  }
}
