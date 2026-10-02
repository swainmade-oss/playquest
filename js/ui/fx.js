/** Visual effects: confetti (canvas), sparkle bursts, flying stars. */
const COLORS = ['#FF5D73', '#FFD23F', '#4D96FF', '#3BCEAC', '#9B5DE5', '#FF9F1C', '#F15BB5'];
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Full-screen confetti: circles, stars, ribbons. */
export function confetti({ count = 140, duration = 4200 } = {}) {
  if (reduced()) return;
  const c = document.createElement('canvas');
  c.className = 'fx-confetti';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  document.body.appendChild(c);
  const g = c.getContext('2d'); g.scale(dpr, dpr);
  const parts = Array.from({ length: count }, (_, i) => ({
    x: W / 2 + (Math.random() - 0.5) * 60, y: H * 0.42,
    vx: (Math.random() - 0.5) * 13, vy: -6 - Math.random() * 11,
    r: 5 + Math.random() * 7, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
    kind: i % 4, color: COLORS[i % COLORS.length], delay: Math.random() * 300,
  }));
  const t0 = performance.now();
  const star = (r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2; const rr = k % 2 ? r * 0.45 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill(); };
  function frame(t) {
    const el = t - t0;
    g.clearRect(0, 0, W, H);
    for (const p of parts) {
      if (el < p.delay) continue;
      p.vy += 0.28; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color;
      g.globalAlpha = Math.max(0, 1 - el / duration);
      if (p.kind === 0) { g.beginPath(); g.arc(0, 0, p.r * 0.6, 0, 7); g.fill(); }
      else if (p.kind === 1) star(p.r);
      else if (p.kind === 2) g.fillRect(-p.r, -p.r * 0.3, p.r * 2, p.r * 0.6);
      else { g.beginPath(); g.moveTo(-p.r, 0); g.quadraticCurveTo(0, -p.r, p.r, 0); g.lineWidth = 3; g.strokeStyle = p.color; g.stroke(); }
      g.restore();
    }
    if (el < duration) requestAnimationFrame(frame); else c.remove();
  }
  requestAnimationFrame(frame);
}

/** Little burst of stars/dots around an element. */
export function sparkle(el, n = 12) {
  if (!el || reduced()) return;
  const r = el.getBoundingClientRect();
  const layer = document.createElement('div');
  layer.className = 'fx-sparkle';
  layer.style.left = r.left + r.width / 2 + 'px';
  layer.style.top = r.top + r.height / 2 + 'px';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    const a = (i / n) * Math.PI * 2;
    const d = Math.max(r.width, r.height) * 0.55 + Math.random() * 30;
    s.style.setProperty('--x', Math.cos(a) * d + 'px');
    s.style.setProperty('--y', Math.sin(a) * d + 'px');
    s.style.background = COLORS[i % COLORS.length];
    s.className = i % 3 ? 'dot' : 'st';
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 900);
}

/** A star flies from one element to another (e.g. into the star bar). */
export function flyStar(from, to, onLand) {
  if (!from || !to || reduced()) { onLand?.(); return; }
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const s = document.createElement('div');
  s.className = 'fx-flystar';
  s.innerHTML = '<svg viewBox="0 0 100 100"><path d="M50 4l13 30 32 3-24 21 7 32-28-17-28 17 7-32L5 37l32-3z" fill="#FFD23F" stroke="#2D2A4A" stroke-width="6" stroke-linejoin="round"/></svg>';
  const x0 = a.left + a.width / 2 - 30, y0 = a.top + a.height / 2 - 30;
  s.style.left = x0 + 'px'; s.style.top = y0 + 'px';
  document.body.appendChild(s);
  const dx = b.left + b.width / 2 - 30 - x0, dy = b.top + b.height / 2 - 30 - y0;
  const anim = s.animate([
    { transform: 'translate(0,0) scale(.4) rotate(0)', opacity: 0 },
    { transform: 'translate(0,-40px) scale(1.5) rotate(90deg)', opacity: 1, offset: 0.3 },
    { transform: `translate(${dx}px,${dy}px) scale(.45) rotate(360deg)`, opacity: 1 },
  ], { duration: 850, easing: 'cubic-bezier(.5,0,.3,1)' });
  anim.onfinish = () => { s.remove(); onLand?.(); };
}

/** Haptics (Android; iOS Safari has no vibration API). Only after user interaction. */
export function buzz(pattern = 30) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
}
