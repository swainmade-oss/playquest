/**
 * Sounds + voice, with zero audio files:
 *  - sfx(name): tiny synthesized sound effects via the Web Audio API
 *  - say(text): reads text aloud with speechSynthesis so pre-readers can play
 * Both respect the Parent settings (store.data.settings.sound / .voice).
 */
import { store } from './store.js';

let ctx = null;
function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Play one synth note. */
function tone(freq, start, dur, type = 'sine', vol = 0.18, slideTo = null) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

const SFX = {
  tap:  () => tone(660, 0, 0.08, 'triangle'),
  // correct tap: short happy arpeggio
  good: () => [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.18, 'triangle')),
  // wrong tap: short low "bonk"
  bad:  () => { tone(220, 0, 0.18, 'square', 0.08); tone(180, 0.15, 0.25, 'square', 0.08); },
  // badge fanfare
  win:  () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, i * 0.12, 0.22, 'triangle', 0.2)),
};

export function sfx(name) {
  if (!store.data.settings.sound) return;
  try { SFX[name]?.(); } catch { /* audio not available */ }
}

/** Unlock audio on first user gesture (mobile browsers require this). */
export function unlockAudio() {
  const go = () => { audio(); window.removeEventListener('pointerdown', go); };
  window.addEventListener('pointerdown', go);
}

let voice = null;
function pickVoice() {
  const voices = window.speechSynthesis?.getVoices() || [];
  voice = voices.find((v) => /en[-_]US/i.test(v.lang) && /female|samantha|google us/i.test(v.name))
       || voices.find((v) => /^en/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

/**
 * Read text aloud. `queue` = wait for current speech instead of interrupting.
 * Emoji are stripped so the voice doesn't read "slide emoji".
 */
export function say(text, { queue = false } = {}) {
  if (!store.data.settings.voice || !('speechSynthesis' in window) || !text) return;
  const clean = String(text).replace(/\p{Extended_Pictographic}|\uFE0F|\u20E3/gu, '').trim();
  if (!clean) return;
  if (!queue) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean);
  if (voice) u.voice = voice;
  u.rate = 0.95;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}
