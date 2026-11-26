// audio.js — all sound is synthesised live with WebAudio: engine hum, wind,
// ring chimes and alarms. No audio files, no network.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.windSource = null;
    this.windGain = null;
    this.windFilter = null;
    this.muted = false;
  }

  // Must be called from a user gesture (click / key press).
  start() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();

    // Engine: two detuned sawtooth oscillators through a low-pass filter.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 55 * 1.5;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    this.engineOsc.connect(engineFilter);
    osc2.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    osc2.start();
    this.engineOsc2 = osc2;

    // Wind: looped noise buffer through a band-pass filter.
    const len = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.0;
    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    this.windSource.start();
  }

  // Called every frame while flying: hum and wind follow throttle and speed.
  update(throttle, speed, engineOut) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const hum = engineOut ? 0 : 0.028 + throttle * 0.05;
    this.engineGain.gain.setTargetAtTime(hum, t, 0.15);
    const freq = 42 + throttle * 68;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.2);
    this.engineOsc2.frequency.setTargetAtTime(freq * 1.5, t, 0.2);
    const wind = Math.min(0.09, Math.max(0, (speed - 30) * 0.0011));
    this.windGain.gain.setTargetAtTime(wind, t, 0.3);
    this.windFilter.frequency.setTargetAtTime(320 + speed * 9, t, 0.3);
  }

  blip(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  ringChime() {
    this.blip(880, 0.35, 'sine', 0.16);
    this.blip(1318, 0.5, 'sine', 0.12, 0.09);
  }

  alarm() {
    this.blip(620, 0.22, 'square', 0.07);
    this.blip(620, 0.22, 'square', 0.07, 0.28);
  }

  thud() {
    this.blip(70, 0.4, 'sine', 0.3);
    this.blip(48, 0.5, 'triangle', 0.22, 0.05);
  }

  fanfare() {
    [523, 659, 784, 1046].forEach((f, i) => this.blip(f, 0.5, 'triangle', 0.14, i * 0.13));
  }
}
