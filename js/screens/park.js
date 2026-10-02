/**
 * PARK — "Where are we playing?"
 *   1. Pip looks around (geolocation, nearest playground within ~200 m)
 *   2. "Is this your playground?"  👍 yes  /  🔄 pick another
 *   3. Pick another: big playground bubbles (tap = hear the name, tap 👍 = go)
 *      plus a number pad for typing a playground number (no keyboard / forms).
 * If location is off, falls back to the last playground, the tag's hint, or the list.
 */
import { store } from '../core/store.js';
import { sfx } from '../core/audio.js';
import { esc } from '../core/util.js';
import { talk, pipHTML, pipMood } from '../ui/mascot.js';
import { floatingShapes } from '../ui/art.js';
import { buzz } from '../ui/fx.js';
import { getPosition, permissionState, sortByDistance, formatDistance, NEAR_METERS } from '../core/geo.js';
import { GAMES } from '../games/index.js';
import { L } from '../data/narration.js';

let alive = false;
let picked = null;
let typed = '';

export function render(app, root, params = {}) {
  alive = true;
  picked = null; typed = '';
  if (params.choose) return choose(app, root, params);
  // Step 1: Pip looks for the playground.
  frame(root, `
    <div class="look">
      <div class="radar"><span></span><span></span><span></span><div class="radar-pin">📍</div></div>
    </div>`, L.where, 'think');
  talk(L.where);
  pipMood('think', 0);
  detect(app).then((park) => {
    if (!alive || app.screen !== 'park') return;
    pipMood(null);
    if (park) confirm(app, root, park, params);
    else choose(app, root, params);
  });
}

export function cleanup() { alive = false; }

function frame(root, body, bubble, mood = '') {
  root.innerHTML = `
    <div class="meadow-bg"></div>${floatingShapes(9, 7)}
    <div class="guide guide-top">
      <div class="guide-pip">${pipHTML(mood)}</div>
      <div class="bubble" data-bubble>${esc(bubble)}</div>
    </div>
    <div class="park-body">${body}</div>`;
}

/** Find the most likely playground. Resolves to a park or null. */
async function detect(app) {
  const parks = app.parks();
  const fallback = app.park(app.params.hint) || app.park(store.data.lastParkId) || null;
  const minWait = new Promise((r) => setTimeout(r, 1300)); // let Pip "look" for a moment
  let found = null;
  try {
    const perm = await permissionState();
    if (perm !== 'denied' && perm !== 'unsupported') {
      app.geo.status = 'asking';
      app.geo.pos = await getPosition(8000);
      app.geo.status = 'ok';
      const near = sortByDistance(parks, app.geo.pos)[0];
      if (near && near.distance <= NEAR_METERS) found = near;
    } else app.geo.status = perm;
  } catch (err) {
    app.geo.status = err?.code === 1 ? 'denied' : 'unsupported';
  }
  await minWait;
  return found || fallback;
}

function parkBlob(p, extra = '') {
  return `<span class="park-blob" style="--c:${p.color}"><span class="park-emoji">${p.icon}</span>${extra}</span>`;
}

function stickers(p) {
  const won = store.wonCount(p.id, GAMES.map((g) => g.id));
  return `<span class="mini-stars" aria-label="${won} of 5 stickers">${GAMES.map((g, i) => `<i class="${i < won ? 'on' : ''}">★</i>`).join('')}</span>`;
}

// ---------------------------------------------------------------- step 2: confirm
function confirm(app, root, park, params) {
  const dist = park.distance != null ? `<small class="dist">📍 ${formatDistance(park.distance)}</small>` : '';
  frame(root, `
    <div class="confirm pop">
      <button class="park-card-big" data-say style="--c:${park.color}">
        ${parkBlob(park)}
        <span class="park-title">${esc(park.name)}</span>
        <span class="park-sub">${stickers(park)} ${dist}</span>
      </button>
      <div class="yesno">
        <button class="big-round yes" data-yes aria-label="Yes, this is my playground">
          <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 46h-12v38h12zM34 84h34c6 0 9-4 10-8l6-24c1-6-3-9-8-9H58l3-14c1-7-4-11-8-11l-19 22z" fill="#fff" stroke="#2D2A4A" stroke-width="6" stroke-linejoin="round"/></svg>
        </button>
        <button class="big-round other" data-other aria-label="Pick another playground">
          <svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="#2D2A4A" stroke-width="7" stroke-linecap="round"><path d="M50 22a28 28 0 1 1-26 18"/></g><path d="M12 30l14 16 14-16z" fill="#2D2A4A"/>
          <g fill="#fff" stroke="#2D2A4A" stroke-width="4"><circle cx="50" cy="50" r="10"/></g></svg>
        </button>
      </div>
    </div>`, L.isThis(park));
  talk(L.isThis(park));
  root.onclick = (e) => {
    if (e.target.closest('[data-yes]')) {
      sfx('select'); buzz(20); pipMood('cheer');
      app.selectPark(park.id);
      talk(L.yesPark(park));
      root.querySelector('[data-yes]').classList.add('pressed');
      setTimeout(() => alive && app.go('map', { parkId: park.id, greet: params.then === 'tag' ? 'tag' : 'pick' }), 1500);
    } else if (e.target.closest('[data-other]')) {
      sfx('boing'); choose(app, root, params);
    } else if (e.target.closest('[data-say]')) {
      sfx('tap'); talk(L.isThis(park));
    }
  };
}

// ---------------------------------------------------------------- step 3: pick one
function choose(app, root, params) {
  let parks = app.parks();
  if (app.geo.status === 'ok' && app.geo.pos) parks = sortByDistance(parks, app.geo.pos);
  frame(root, `
    <div class="park-grid">
      ${parks.map((p, i) => `
        <button class="park-pick ${picked === p.id ? 'picked' : ''}" data-park="${p.id}" style="--c:${p.color};--i:${i}">
          ${parkBlob(p, picked === p.id ? '<span class="pick-check">✔</span>' : '')}
          <span class="park-pick-name">${esc(p.name)}</span>
          ${stickers(p)}
        </button>`).join('')}
    </div>
    <div class="choose-actions">
      <button class="numpad-btn" data-numpad aria-label="Type a playground number">🔢</button>
      <button class="big-round yes ${picked ? '' : 'dim'}" data-go aria-label="Go">
        <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M30 46h-12v38h12zM34 84h34c6 0 9-4 10-8l6-24c1-6-3-9-8-9H58l3-14c1-7-4-11-8-11l-19 22z" fill="#fff" stroke="#2D2A4A" stroke-width="6" stroke-linejoin="round"/></svg>
      </button>
    </div>
    <div class="numpad-layer" hidden></div>`, L.pickPark);
  if (!picked) talk(L.pickPark);

  root.onclick = (e) => {
    const t = (s) => e.target.closest(s);
    if (t('[data-park]')) {
      picked = t('[data-park]').dataset.park;
      sfx('select'); buzz(15);
      const p = app.park(picked);
      root.querySelectorAll('.park-pick').forEach((b) => {
        const on = b.dataset.park === picked;
        b.classList.toggle('picked', on);
        b.querySelector('.pick-check')?.remove();
        if (on) b.querySelector('.park-blob').insertAdjacentHTML('beforeend', '<span class="pick-check">✔</span>');
      });
      root.querySelector('[data-go]').classList.remove('dim');
      talk(L.parkName(p));
    } else if (t('[data-go]')) {
      if (!picked) { sfx('boing'); talk(L.pickPark); return; }
      const p = app.park(picked);
      sfx('select'); pipMood('cheer');
      app.selectPark(p.id);
      talk(L.yesPark(p));
      setTimeout(() => alive && app.go('map', { parkId: p.id, greet: params.then === 'tag' ? 'tag' : 'pick' }), 1400);
    } else if (t('[data-numpad]')) {
      sfx('tap'); numpad(app, root, params);
    }
  };
}

function numpad(app, root, params) {
  const layer = root.querySelector('.numpad-layer');
  typed = '';
  const draw = () => {
    layer.innerHTML = `<div class="numpad pop">
      <div class="numpad-show">${esc(typed) || '<span class="ph">#</span>'}</div>
      <div class="numpad-keys">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
        <button data-k="del" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok" aria-label="OK">✔</button>
      </div>
      <button class="numpad-close" data-k="close" aria-label="Close">✕</button></div>`;
  };
  draw();
  layer.hidden = false;
  talk(L.typeNumber);
  layer.onclick = (e) => {
    e.stopPropagation();
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (!k) return;
    if (k === 'close') { layer.hidden = true; sfx('back'); return; }
    if (k === 'del') { typed = typed.slice(0, -1); sfx('tap'); return draw(); }
    if (k === 'ok') {
      const p = app.park(typed);
      if (!p) { sfx('uhoh'); pipMood('sad'); talk(L.unknownNumber); typed = ''; return draw(); }
      layer.hidden = true;
      picked = p.id;
      return confirm(app, root, p, params);
    }
    if (typed.length < 6) { typed += k; sfx('tap'); talk(k); draw(); }
  };
}
