/**
 * GAME VIEWS — the big picture in the middle of the game screen, per game.
 *   main(state, park, game) -> html     re-rendered after every tap
 *   live?(state, park, root) -> info    cheap updates ~4×/sec (timers, flow)
 * The main element is always "WHAT to find": a giant illustration of the spot.
 */
import { esc } from '../core/util.js';
import { spotArt } from './art.js';
import { stepsFor } from '../games/fixed-order.js';
import { critterAt } from '../games/critters.js';
import { STEP_MS } from '../games/power-outage.js';
import { NUDGE_MS } from '../games/great-loop.js';
import { LOC_CODES } from '../data/playgrounds.js';

const STEPS = 10;
const cur = (s) => Math.min(s.step, STEPS - 1);
const targetLoc = (s, park, id) => park.locations[stepsFor(park, id)[cur(s)].loc];

const PEEK = `<svg class="peek" viewBox="0 0 80 60" aria-hidden="true"><path d="M4 58c0-16 8-24 18-24 2-14 16-20 26-12 10-8 26-2 26 14 4 2 6 10 6 22z" fill="#3BCEAC" stroke="#2D2A4A" stroke-width="4" stroke-linejoin="round"/>
  <g class="peek-eyes"><circle cx="34" cy="38" r="6" fill="#fff" stroke="#2D2A4A" stroke-width="2.5"/><circle cx="50" cy="38" r="6" fill="#fff" stroke="#2D2A4A" stroke-width="2.5"/>
  <circle cx="35" cy="39" r="2.8" fill="#2D2A4A"/><circle cx="51" cy="39" r="2.8" fill="#2D2A4A"/></g></svg>`;

function findCard(loc, extra = '', cls = '') {
  return `<div class="find ${cls}">
    <div class="find-blob"><div class="find-art">${spotArt(loc)}</div>${extra}</div>
    <div class="find-name"><span class="eye" aria-hidden="true">👀</span> ${esc(loc.name)}</div>
  </div>`;
}

export const VIEWS = {
  critters: {
    main(s, park) {
      const loc = targetLoc(s, park, 'critters');
      const slots = Array.from({ length: STEPS }, (_, i) => {
        const [emoji] = critterAt(park, i);
        const st = i < s.step ? 'got' : i === s.step ? 'now' : '';
        return `<span class="slot ${st}">${i < s.step ? emoji : i === s.step ? '?' : ''}</span>`;
      }).join('');
      return `${findCard(loc, PEEK)}<div class="tray tray-critters" aria-label="Rescued critters">${slots}</div>`;
    },
  },

  power: {
    main(s, park) {
      const loc = targetLoc(s, park, 'power');
      const bulbs = Array.from({ length: STEPS }, (_, i) => `<span class="bulb ${i < s.step ? 'on' : i === s.step ? 'now' : ''}"><svg viewBox="0 0 40 52"><path d="M20 3a15 15 0 0 0-9 27c2 2 3 4 3 7h12c0-3 1-5 3-7A15 15 0 0 0 20 3z"/><rect x="13" y="40" width="14" height="8" rx="3"/></svg></span>`).join('');
      return `${findCard(loc, '', 'find-power')}
        <div class="battery" data-battery><div class="battery-body"><div class="battery-fill" data-live="fill"></div>
          <svg class="battery-bolt" viewBox="0 0 40 60"><path d="M24 2L6 34h12l-4 24 20-34H22z" fill="#fff" stroke="#2D2A4A" stroke-width="3" stroke-linejoin="round"/></svg>
          <span class="battery-secs" data-live="secs">30</span></div><div class="battery-tip"></div></div>
        <div class="tray tray-bulbs">${bulbs}</div>`;
    },
    live(s, park, root) {
      const left = Math.max(0, STEP_MS - (Date.now() - s.stepStartedAt));
      const pct = (left / STEP_MS) * 100;
      const fill = root.querySelector('[data-live="fill"]');
      const secs = root.querySelector('[data-live="secs"]');
      const bat = root.querySelector('[data-battery]');
      const sec = Math.ceil(left / 1000);
      if (fill) { fill.style.width = pct + '%'; }
      if (secs && secs.textContent !== String(sec)) secs.textContent = String(sec);
      if (bat) { bat.classList.toggle('mid', left <= 15000 && left > 8000); bat.classList.toggle('low', left <= 8000); }
      return { secs: sec };
    },
  },

  highlow: {
    main(s, park) {
      const loc = targetLoc(s, park, 'highlow');
      const high = loc.level === 'high';
      const seq = stepsFor(park, 'highlow').map((st, i) => {
        const l = park.locations[st.loc];
        return `<span class="seq ${l.level} ${i < s.step ? 'done' : i === s.step ? 'now' : ''}">${l.level === 'high' ? '▲' : '▼'}</span>`;
      }).join('');
      const banner = `<div class="hl-banner ${high ? 'high' : 'low'}"><span class="hl-arrow">${high ? '▲' : '▼'}</span>${high ? 'HIGH' : 'LOW'}</div>`;
      return `<div class="hl-sky ${high ? 'high' : 'low'}">${banner}${findCard(loc)}</div><div class="tray tray-seq">${seq}</div>`;
    },
  },

  loop: {
    main(s, park) {
      const loc = targetLoc(s, park, 'loop');
      const steps = stepsFor(park, 'loop');
      // stadium-shaped racetrack: 10 stops around it
      const W = 300, H = 120, R = 50, cx = W / 2, cy = H / 2, half = (W - 2 * R) / 2 - 10;
      const per = 2 * (2 * half) + 2 * Math.PI * R;
      const pt = (f) => { // f in [0,1) clockwise from top-middle
        let d = f * per;
        if (d < half) return [cx + d, cy - R];
        d -= half; if (d < Math.PI * R) { const a = -Math.PI / 2 + d / R; return [cx + half + R * Math.cos(a), cy + R * Math.sin(a)]; }
        d -= Math.PI * R; if (d < 2 * half) return [cx + half - d, cy + R];
        d -= 2 * half; if (d < Math.PI * R) { const a = Math.PI / 2 + d / R; return [cx - half + R * Math.cos(a), cy + R * Math.sin(a)]; }
        d -= Math.PI * R; return [cx - half + d, cy - R];
      };
      const track = `M${cx} ${cy - R} H${cx + half} A${R} ${R} 0 0 1 ${cx + half} ${cy + R} H${cx - half} A${R} ${R} 0 0 1 ${cx - half} ${cy - R} Z`;
      const stops = steps.map((st, i) => {
        const [x, y] = pt(i / STEPS);
        return `<g class="stop ${i < s.step ? 'done' : i === s.step ? 'now' : ''}"><circle cx="${x}" cy="${y}" r="11"/><text x="${x}" y="${y + 5}">${i + 1}</text></g>`;
      }).join('');
      const [rx, ry] = pt(Math.max(0, s.step - 1) / STEPS);
      const done = s.step / STEPS;
      return `${findCard(loc, '', 'find-loop')}
        <div class="track-wrap"><svg class="track" viewBox="-14 -14 ${W + 28} ${H + 28}" aria-hidden="true">
          <path d="${track}" class="track-base"/><path d="${track}" class="track-lane"/>
          <path d="${track}" class="track-done" pathLength="100" style="stroke-dasharray:${done * 100} 100"/>
          ${stops}
          <g class="runner" style="transform:translate(${rx}px,${ry}px)"><circle r="13"/><text y="6">🏃</text></g>
        </svg><div class="flow" data-live="flow">Keep moving!</div></div>`;
    },
    live(s, park, root) {
      const gap = Date.now() - s.lastTapAt;
      const el = root.querySelector('[data-live="flow"]');
      const nudge = s.step > 0 && gap > NUDGE_MS;
      if (el) { el.classList.toggle('nudge', nudge); el.textContent = nudge ? '⚠️ Keep moving!' : '🌊 Flowing!'; }
      return { nudge };
    },
  },

  memory: {
    main(s, park) {
      const n = Math.min(s.step + 1, STEPS);
      const cards = LOC_CODES.map((code) => {
        const num = s.assign[code];
        const found = s.revealed[code] && num <= s.step;
        const hint = s.revealed[code] && !found;
        const l = park.locations[code];
        return `<button class="mcard ${found ? 'found' : hint ? 'hint' : ''}" data-mcard="${code}" aria-label="${esc(l.name)}">
          <span class="mcard-inner"><span class="mcard-art">${spotArt(l)}</span>
          <span class="mcard-num">${found || hint ? num : '?'}</span></span></button>`;
      }).join('');
      return `<div class="mem-target"><div class="mem-card"><small>Find</small><b>${n}</b></div></div>
        <div class="mem-board">${cards}</div>`;
    },
  },
};
