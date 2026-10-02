/**
 * VOICE — Pip the guide talks.
 * ============================
 * 1. Pre-recorded natural voice clips (audio/voice/*.mp3, made offline with
 *    Piper TTS, see tools/make-voice.py). Each line of text maps to a clip by
 *    a hash of its normalized text, listed in audio/voice/manifest.json.
 * 2. Fallback: the device's speechSynthesis, using the best English voice we
 *    can find (natural / enhanced / Google US English / Samantha …).
 *
 * Utterances are QUEUED and never overlap. say() interrupts by default,
 * say(x, { queue: true }) appends. cancel() runs on every navigation.
 * Listeners (mascot mouth + music ducking) get onTalk(true/false, text).
 */
import { store } from './store.js';
import { audioCtx, buses, unlocked, music } from './audio.js';
import { normalize, hashText } from './textkey.js';

const BASE = 'audio/voice/';
let manifest = null; // { voice, clips: { hash: [file, ms] } }
const manifestReady = fetch(BASE + 'manifest.json').then((r) => (r.ok ? r.json() : null))
  .then((m) => { manifest = m; }).catch(() => {});

export { normalize, hashText };

const buffers = new Map(); // hash → Promise<AudioBuffer|null>
function loadClip(hash) {
  if (!buffers.has(hash)) {
    const entry = manifest?.clips?.[hash];
    const a = audioCtx();
    const p = !entry || !a ? Promise.resolve(null)
      : fetch(BASE + entry[0]).then((r) => (r.ok ? r.arrayBuffer() : null))
        .then((ab) => ab && new Promise((res) => a.decodeAudioData(ab, res, () => res(null))))
        .catch(() => null);
    buffers.set(hash, p);
    p.then((b) => { if (!b) buffers.delete(hash); });
  }
  return buffers.get(hash);
}
export const hasClip = (text) => !!manifest?.clips?.[hashText(text)];

/** Warm the cache for lines that are about to be spoken. */
export async function preload(lines) {
  await manifestReady;
  if (!store.data.settings.clips) return;
  for (const l of [].concat(lines)) if (l && hasClip(l)) loadClip(hashText(l));
}

/**
 * Fetch every clip once in the background so the service worker caches them
 * (playgrounds often have bad signal). Skipped on "save data" connections.
 */
export async function warmCache() {
  await manifestReady;
  if (!manifest || navigator.connection?.saveData || localStorage.getItem('playquest.voiceWarm') === manifest.count + ':' + (manifest.voice || '')) return;
  const files = Object.values(manifest.clips).map((c) => c[0]);
  for (let i = 0; i < files.length; i += 6) {
    await Promise.all(files.slice(i, i + 6).map((f) => fetch(BASE + f).catch(() => null)));
    await new Promise((r) => setTimeout(r, 150));
  }
  try { localStorage.setItem('playquest.voiceWarm', manifest.count + ':' + (manifest.voice || '')); } catch { /* ignore */ }
}

// ---------------------------------------------------------------- TTS voice pick
const GOOD = [/natural/i, /neural/i, /enhanced/i, /premium/i, /google us english/i, /samantha/i, /\bava\b/i, /allison/i, /aria/i, /jenny/i, /zira/i, /karen/i, /moira/i, /google uk english female/i];
const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|deranged|good news|hysterical|jester|junior|organ|pipe|princess|ralph|superstar|trinoids|whisper|wobble|zarvox|fred|grandpa|grandma|rocko|shelley|sandy|reed|eddy|flo/i;
let ttsVoice = null;
function scoreVoice(v) {
  let s = 0;
  if (/^en[-_]US/i.test(v.lang)) s += 30; else if (/^en/i.test(v.lang)) s += 15; else return -1;
  GOOD.forEach((re, i) => { if (re.test(v.name)) s += 40 - i; });
  if (NOVELTY.test(v.name)) s -= 100;
  if (/compact|espeak/i.test(v.name)) s -= 30;
  if (/female/i.test(v.name)) s += 3;
  return s;
}
export function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  ttsVoice = voices.map((v) => [scoreVoice(v), v]).filter(([s]) => s >= 0).sort((a, b) => b[0] - a[0])[0]?.[1] || null;
  return ttsVoice;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}
export const voiceInfo = () => ({ clips: !!manifest, clipVoice: manifest?.voice || null, tts: ttsVoice?.name || null });

// ---------------------------------------------------------------- queue
const listeners = new Set();
export const onTalk = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = (on, text) => { music.duck(on); listeners.forEach((fn) => { try { fn(on, text); } catch { /* ignore */ } }); };

let queue = [];
let token = 0;
let running = false;
let stopCurrent = null;
export const lastSpoken = { text: '' };

/** Speak one line or an array of lines. */
export function say(lines, { queue: append = false } = {}) {
  const list = [].concat(lines).filter(Boolean).map(String);
  if (!append) cancel();
  if (!store.data.settings.voice || !list.length) return Promise.resolve();
  queue.push(...list);
  if (!running) return pump(token);
  return Promise.resolve();
}

export function cancel() {
  token++;
  queue = [];
  stopCurrent?.(); stopCurrent = null;
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  if (running) { running = false; emit(false, ''); }
}

export const isTalking = () => running;

async function pump(my) {
  running = true;
  await manifestReady;
  while (queue.length && my === token) {
    const text = queue.shift();
    lastSpoken.text = text;
    window.__voiceLog?.push?.(text); // test hook
    emit(true, text);
    await speakOne(text, my);
    if (my !== token) return;
    emit(false, text);
    await new Promise((r) => setTimeout(r, 140)); // tiny breath between lines
  }
  if (my === token) running = false;
}

async function speakOne(text, my) {
  if (!unlocked) return; // audio not unlocked yet (no tap so far)
  const hash = hashText(text);
  if (store.data.settings.clips && manifest?.clips?.[hash]) {
    const buf = await Promise.race([loadClip(hash), new Promise((r) => setTimeout(() => r(null), 2500))]);
    if (my !== token) return;
    const a = audioCtx();
    if (buf && a && a.state === 'running') return playBuffer(a, buf);
  }
  return speakTTS(text);
}

function playBuffer(a, buf) {
  return new Promise((resolve) => {
    const src = a.createBufferSource();
    src.buffer = buf;
    src.connect(buses().voiceBus);
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(guard); resolve(); } };
    const guard = setTimeout(finish, buf.duration * 1000 + 800);
    src.onended = finish;
    stopCurrent = () => { try { src.stop(); } catch { /* ignore */ } finish(); };
    src.start();
  });
}

function speakTTS(text) {
  if (!('speechSynthesis' in window)) return new Promise((r) => setTimeout(r, 600));
  return new Promise((resolve) => {
    const clean = text.replace(/\p{Extended_Pictographic}|\uFE0F|\u20E3/gu, '').trim();
    if (!clean) return resolve();
    const u = new SpeechSynthesisUtterance(clean);
    if (!ttsVoice) pickVoice();
    if (ttsVoice) { u.voice = ttsVoice; u.lang = ttsVoice.lang; } else u.lang = 'en-US';
    u.rate = 0.95; u.pitch = 1.1;
    let done = false;
    const finish = () => { if (!done) { done = true; clearTimeout(guard); resolve(); } };
    // onend is unreliable on some browsers: guard with an estimate
    const guard = setTimeout(finish, 1500 + clean.length * 85);
    u.onend = finish; u.onerror = finish;
    stopCurrent = () => { try { speechSynthesis.cancel(); } catch { /* ignore */ } finish(); };
    speechSynthesis.speak(u);
  });
}
