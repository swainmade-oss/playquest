/**
 * AUDIO ENGINE (Web Audio, zero sound files for effects + music)
 * ==============================================================
 *   ctx ─┬─ sfxBus ─────────────┐
 *        ├─ reverb send → convolver ─┤
 *        ├─ musicBus → duck ─────┤→ master → compressor → speakers
 *        └─ voiceBus ────────────┘
 * - sfx(name): designed sound effects (glockenspiel chimes, marimba, sparkle
 *   arpeggios, boing, whoosh, fanfare, soft "uh-oh", clock ticks …)
 * - music.start(mood) / music.stop(): light procedural background loop
 *   (marimba melody + soft bass + shaker). Ducks under the voice.
 * - unlockAudio(): must be called from a tap (iOS/Chrome autoplay rules).
 * Settings respected: store.data.settings.sound / .music
 */
import { store } from './store.js';

let ctx = null;
let master, comp, sfxBus, musicBus, musicDuck, voiceBus, verbSend;
export let unlocked = false;

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: 'interactive' });
  graph(ctx);
  return ctx;
}

/** Wire the buses on a (real or offline) audio context. */
function graph(c) {
  comp = c.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4;
  comp.attack.value = 0.004; comp.release.value = 0.2;
  master = c.createGain(); master.gain.value = 0.9;
  master.connect(comp).connect(c.destination);
  sfxBus = c.createGain(); sfxBus.gain.value = 1.4; sfxBus.connect(master);
  voiceBus = c.createGain(); voiceBus.gain.value = 1.0; voiceBus.connect(master);
  musicDuck = c.createGain(); musicDuck.gain.value = 1; musicDuck.connect(master);
  musicBus = c.createGain(); musicBus.gain.value = 0; musicBus.connect(musicDuck);
  // small "room" reverb from a synthetic impulse response
  const conv = c.createConvolver();
  const len = Math.floor(c.sampleRate * 1.6);
  const ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
  }
  conv.buffer = ir;
  verbSend = c.createGain(); verbSend.gain.value = 0.22;
  verbSend.connect(conv).connect(master);
  noiseBuf = null;
}

/**
 * Render one effect (or a few bars of music) offline → AudioBuffer.
 * Used by tools/render-sfx.mjs to export WAVs for listening / checking levels.
 */
export async function renderOffline(name, seconds = 3) {
  const saved = [ctx, master, comp, sfxBus, musicBus, musicDuck, voiceBus, verbSend, noiseBuf];
  const off = new OfflineAudioContext(2, Math.ceil(44100 * seconds), 44100);
  ctx = off; graph(off);
  try {
    if (name === 'music') {
      musicBus.gain.value = 0.3; const m = { ...music, nextT: 0.05, step: 0, mood: 'menu' };
      while (m.nextT < seconds - 0.5) music.schedule.call(m, true);
    } else SFX[name](0.02);
  } finally {
    [ctx, master, comp, sfxBus, musicBus, musicDuck, voiceBus, verbSend, noiseBuf] = saved;
  }
  // restore happens before rendering; nodes keep their own context references
  return off.startRendering();
}

export function audioCtx() {
  if (!ctx && !build()) return null;
  if (ctx.state === 'suspended' && unlocked) ctx.resume().catch(() => {});
  return ctx;
}
export const buses = () => ({ voiceBus, musicDuck });

/** Call synchronously inside a tap handler. Unlocks Web Audio + speech on iOS. */
export function unlockAudio() {
  const a = audioCtx();
  unlocked = true;
  if (a) {
    a.resume().catch(() => {});
    const b = a.createBuffer(1, 1, 22050); const s = a.createBufferSource();
    s.buffer = b; s.connect(a.destination); s.start(0);
  }
  try { // iOS only lets speechSynthesis talk after it was used inside a gesture once
    if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }
  } catch { /* no tts */ }
}

// Pause everything when the app is hidden (pocket / lock screen keeps NFC link flow).
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend().catch(() => {});
  else if (unlocked) ctx.resume().catch(() => {});
});

// ------------------------------------------------------------ instruments
const now = () => ctx.currentTime;

function env(g, t, a, peak, d, sustain = 0.0001) {
  g.gain.cancelScheduledValues(t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
}

function osc(type, freq, t, dur, out, vol, { a = 0.004, glide = null, glideT = dur, detune = 0 } = {}) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + glideT);
  env(g, t, a, vol, dur);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + a + dur + 0.05);
  return { o, g };
}

/** Glockenspiel-ish bell: additive partials (1, 2.76, 5.4) with fast-decaying highs. */
function bell(f, t, vol = 0.18, dur = 1.1, out = sfxBus, verb = true) {
  osc('sine', f, t, dur, out, vol, { a: 0.002 });
  osc('sine', f * 2.756, t, dur * 0.35, out, vol * 0.35, { a: 0.002 });
  osc('sine', f * 5.404, t, dur * 0.15, out, vol * 0.15, { a: 0.001 });
  if (verb) osc('sine', f, t, dur, verbSend, vol * 0.6, { a: 0.002 });
}

/** Warm marimba: sine + 4th partial "knock". */
function marimba(f, t, vol = 0.2, dur = 0.45, out = sfxBus) {
  osc('sine', f, t, dur, out, vol, { a: 0.003 });
  osc('sine', f * 3.99, t, 0.06, out, vol * 0.3, { a: 0.001 });
  osc('triangle', f * 2, t, 0.12, out, vol * 0.15, { a: 0.002 });
}

let noiseBuf = null;
function noise(t, dur, out, vol, { type = 'bandpass', f = 1000, f2 = null, q = 1 } = {}) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.Q.value = q;
  fl.frequency.setValueAtTime(f, t); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const g = ctx.createGain(); env(g, t, Math.min(0.02, dur / 3), vol, dur);
  s.connect(fl).connect(g).connect(out);
  s.start(t); s.stop(t + dur + 0.1);
}

const N = (semi) => 440 * Math.pow(2, (semi - 69) / 12); // midi → Hz
// C major pentatonic helpers
const C5 = 72, D5 = 74, E5 = 76, G5 = 79, A5 = 81, C6 = 84, D6 = 86, E6 = 88, G6 = 91, A6 = 93, C7 = 96;

const SFX = {
  // soft bubble pop for any button
  tap: (t) => { osc('sine', 520, t, 0.09, sfxBus, 0.22, { glide: 1100, glideT: 0.06 }); },
  // two-note marimba "ba-ding" when choosing something
  select: (t) => { marimba(N(G5), t, 0.2); marimba(N(C6), t + 0.09, 0.22); },
  back: (t) => { marimba(N(E5), t, 0.16); marimba(N(C5), t + 0.08, 0.16); },
  // whoosh for screen transitions
  whoosh: (t) => { noise(t, 0.42, sfxBus, 0.28, { f: 300, f2: 3200, q: 0.9 }); },
  // springy boing
  boing: (t) => {
    const { o } = osc('sine', 160, t, 0.5, sfxBus, 0.26, { glide: 380, glideT: 0.25 });
    const lfo = ctx.createOscillator(); const lg = ctx.createGain();
    lfo.frequency.value = 16; lg.gain.setValueAtTime(40, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.5);
    lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(t + 0.55);
  },
  // correct tap: marimba hit + rising bell sparkle
  correct: (t) => {
    marimba(N(C5), t, 0.18); marimba(N(G5), t, 0.12);
    [C6, E6, G6, C7].forEach((m, i) => bell(N(m), t + 0.05 + i * 0.07, 0.12, 0.9));
  },
  // fast pentatonic sparkle arpeggio (stars, streaks)
  sparkle: (t) => { [E6, G6, A6, C7, D6 + 12].forEach((m, i) => bell(N(m), t + i * 0.045, 0.07, 0.6)); },
  star: (t) => { bell(N(G6), t, 0.12, 0.7); bell(N(C7), t + 0.08, 0.12, 0.9); },
  streak: (t) => { [C6, E6, G6, C7, E6 + 12].forEach((m, i) => { bell(N(m), t + i * 0.06, 0.1, 0.7); }); noise(t, 0.5, verbSend, 0.03, { type: 'highpass', f: 6000 }); },
  // gentle wrong tap: a soft, cartoony "uh-oh" (never harsh)
  uhoh: (t) => {
    const voice = (f, f2, s, d) => {
      const o = ctx.createOscillator(); const fl = ctx.createBiquadFilter(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f2, s + d);
      const vib = ctx.createOscillator(); const vg = ctx.createGain(); vib.frequency.value = 7; vg.gain.value = 6;
      vib.connect(vg).connect(o.frequency); vib.start(s); vib.stop(s + d + 0.05);
      fl.type = 'lowpass'; fl.frequency.value = 1400; fl.Q.value = 3;
      env(g, s, 0.02, 0.22, d);
      o.connect(fl).connect(g).connect(sfxBus); o.start(s); o.stop(s + d + 0.1);
    };
    voice(N(67), N(68), t, 0.2);          // "uh" (G4, slight lift)
    voice(N(62), N(58), t + 0.24, 0.38);  // "oh" (D4 sliding down)
  },
  // card flip (memory)
  flip: (t) => { noise(t, 0.07, sfxBus, 0.18, { f: 2500, q: 2 }); osc('sine', 700, t + 0.03, 0.12, sfxBus, 0.12, { glide: 1400, glideT: 0.08 }); },
  // countdown blips 3-2-1 and GO
  count: (t) => { marimba(N(G5), t, 0.24, 0.3); noise(t, 0.03, sfxBus, 0.1, { type: 'highpass', f: 4000 }); },
  go: (t) => {
    [C5, E5, G5, C6].forEach((m) => osc('sawtooth', N(m), t, 0.55, brass(t, 0.55), 0.06, { a: 0.02 }));
    [C6, E6, G6, C7].forEach((m, i) => bell(N(m), t + i * 0.04, 0.09, 0.8));
    noise(t, 0.4, sfxBus, 0.1, { f: 500, f2: 4000 });
  },
  // timer ticks (Power Outage)
  tick: (t) => { osc('sine', 1250, t, 0.035, sfxBus, 0.2); noise(t, 0.02, sfxBus, 0.06, { f: 3000, q: 4 }); },
  tock: (t) => { osc('sine', 950, t, 0.04, sfxBus, 0.2); noise(t, 0.02, sfxBus, 0.06, { f: 2200, q: 4 }); },
  // power ran out: soft descending "wooo" + flicker
  powerdown: (t) => {
    osc('triangle', 520, t, 0.8, brass(t, 0.8, 1800, 300), 0.22, { glide: 70, glideT: 0.8 });
    [0, 0.12, 0.2].forEach((d) => noise(t + d, 0.05, sfxBus, 0.05, { type: 'highpass', f: 5000 }));
  },
  powerup: (t) => { osc('sine', 200, t, 0.35, sfxBus, 0.16, { glide: 900, glideT: 0.3 }); bell(N(G6), t + 0.3, 0.1, 0.8); },
  // badge fanfare: brassy chords, timpani, bell sparkle
  fanfare: (t) => {
    const chord = (ms, at, dur, v = 0.05) => ms.forEach((m) => {
      osc('sawtooth', N(m), at, dur, brass(at, dur), v, { a: 0.025, detune: -6 });
      osc('sawtooth', N(m), at, dur, brass(at, dur), v * 0.7, { a: 0.025, detune: 7 });
    });
    const timp = (at, v = 0.35) => osc('sine', 110, at, 0.5, sfxBus, v, { glide: 70, glideT: 0.4, a: 0.003 });
    chord([60, 64, 67], t, 0.14); chord([60, 64, 67], t + 0.16, 0.14); chord([60, 64, 67], t + 0.32, 0.14);
    timp(t); timp(t + 0.32, 0.25);
    chord([65, 69, 72], t + 0.5, 0.3); timp(t + 0.5);
    chord([67, 71, 74], t + 0.84, 0.3);
    chord([72, 76, 79, 84], t + 1.18, 1.3, 0.055); timp(t + 1.18, 0.45);
    [C6, E6, G6, C7, E6 + 12, G6 + 12].forEach((m, i) => bell(N(m), t + 1.2 + i * 0.07, 0.08, 1.2));
    noise(t + 1.18, 1.2, verbSend, 0.03, { type: 'highpass', f: 7000 });
  },
  // little "ta-da" for stickers and unlocking
  tada: (t) => { marimba(N(G5), t, 0.18); marimba(N(C6), t + 0.1, 0.2); bell(N(E6), t + 0.2, 0.12); bell(N(G6), t + 0.2, 0.1); },
  pop: (t) => { osc('sine', 300, t, 0.12, sfxBus, 0.25, { glide: 900, glideT: 0.05 }); },
};

/** Lowpass "brass" filter sweep; returns the filter input node. */
function brass(t, dur, hi = 2600, lo = 900) {
  const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.Q.value = 1.2;
  fl.frequency.setValueAtTime(lo, t); fl.frequency.exponentialRampToValueAtTime(hi, t + 0.06);
  fl.frequency.exponentialRampToValueAtTime(lo, t + dur);
  fl.connect(sfxBus);
  return fl;
}

export function sfx(name, delay = 0) {
  if (!store.data.settings.sound || !unlocked) return;
  const a = audioCtx(); if (!a || !SFX[name]) return;
  try { SFX[name](now() + 0.01 + delay); } catch { /* audio not available */ }
}
export const SFX_NAMES = Object.keys(SFX);

// ------------------------------------------------------------ music
// A gentle 8-bar loop at 100 BPM: C – Am – F – G, marimba melody on a
// pentatonic phrase, warm round bass, very soft shaker. Two moods:
//   'menu' = full loop, 'game' = sparser and quieter (clues matter most).
const BPM = 100, STEP = 60 / BPM / 2; // eighth notes
const CHORDS = [[48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 55, 59, 62]];
// 8 bars × 8 eighths; null = rest. Two-bar call/response phrase in C pentatonic.
const MEL = [
  76, null, 79, null, 81, 79, 76, null,   72, null, 74, 76, null, 74, 72, null,
  69, null, 72, null, 76, null, 74, 72,   74, null, null, 79, null, 76, 74, null,
  76, null, 79, null, 84, null, 81, 79,   76, null, 74, 76, null, 79, 76, null,
  77, null, 76, 74, null, 72, 74, null,   74, 76, null, 79, 76, null, 74, null,
];

export const music = {
  playing: false, mood: 'menu', step: 0, nextT: 0, timer: null,
  start(mood = 'menu') {
    this.mood = mood;
    if (!store.data.settings.music || !unlocked) return;
    const a = audioCtx(); if (!a) return;
    const target = mood === 'game' ? 0.16 : 0.3;
    musicBus.gain.cancelScheduledValues(a.currentTime);
    musicBus.gain.setTargetAtTime(target, a.currentTime, 0.6);
    if (this.playing) return;
    this.playing = true; this.step = 0; this.nextT = a.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  },
  stop(fade = 0.5) {
    if (!this.playing || !ctx) return;
    musicBus.gain.setTargetAtTime(0, ctx.currentTime, fade / 3);
    clearInterval(this.timer); this.timer = null; this.playing = false;
  },
  schedule(offline = false) {
    if (!ctx || (!offline && ctx.state !== 'running')) return;
    const horizon = offline ? this.nextT + 0.01 : ctx.currentTime + 0.25;
    while (this.nextT < horizon) {
      const i = this.step % MEL.length; const t = this.nextT;
      const bar = Math.floor(i / 8) % 4; const beat = i % 8; const ch = CHORDS[bar];
      const sparse = this.mood === 'game';
      if (beat === 0 || beat === 4) osc('triangle', N(ch[0]), t, 0.5, musicBus, 0.22, { a: 0.01 }); // bass
      if (beat === 6 && !sparse) osc('triangle', N(ch[0] + 7), t, 0.25, musicBus, 0.12, { a: 0.01 });
      if (beat === 0) ch.slice(1).forEach((m) => osc('sine', N(m), t, 1.6, musicBus, 0.035, { a: 0.25 })); // soft pad
      const m = MEL[i];
      if (m && (!sparse || beat % 4 === 0)) marimba(N(m), t, sparse ? 0.08 : 0.11, 0.4, musicBus);
      if (!sparse && beat % 2 === 1) noise(t, 0.04, musicBus, 0.025, { type: 'highpass', f: 7000 });
      this.step++; this.nextT += STEP;
    }
  },
  /** Called by voice: lower music while talking. */
  duck(on) {
    if (!ctx) return;
    musicDuck.gain.setTargetAtTime(on ? 0.28 : 1, ctx.currentTime, on ? 0.05 : 0.4);
  },
  setEnabled(on) {
    store.data.settings.music = on; store.save();
    if (on) this.start(this.mood); else this.stop(0.3);
  },
};
