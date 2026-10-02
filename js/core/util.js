/** Small shared helpers. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape text for safe insertion into HTML templates. */
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 83500 ms -> "1:23.5" */
export function fmtTime(ms, tenths = true) {
  ms = Math.max(0, ms);
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const t = Math.floor((ms % 1000) / 100);
  return `${m}:${String(s).padStart(2, '0')}${tenths ? '.' + t : ''}`;
}

/** Show a short toast message at the top of the screen. */
export function toast(html, kind = 'info', ms = 2200) {
  const el = document.createElement('div');
  el.className = `toast toast-${kind}`;
  el.innerHTML = html;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, ms);
}

/** Burst of confetti (pure DOM/CSS, no canvas). */
export function confetti(count = 80) {
  const colors = ['#FF6B6B', '#FFC83D', '#4D96FF', '#06D6A0', '#9B5DE5', '#FF9F1C'];
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.style.background = pick(colors);
    p.style.left = Math.random() * 100 + 'vw';
    p.style.animationDelay = Math.random() * 0.6 + 's';
    p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    p.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
    p.style.setProperty('--drift', (Math.random() * 40 - 20) + 'vw');
    layer.appendChild(p);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 4000);
}

/** Vibrate if the device supports it (Android; iOS Safari has no vibration API).
 *  Browsers only allow it after the user has interacted with the page. */
export function buzz(pattern = 30) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
