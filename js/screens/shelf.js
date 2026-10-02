/**
 * SHELF — the sticker book. Five badge stickers per playground: earned ones
 * shine in color with the best time, locked ones are grey "?" silhouettes.
 * Tabs switch playgrounds (progress is separate per playground).
 */
import { store } from '../core/store.js';
import { sfx, music } from '../core/audio.js';
import { esc, fmtTime } from '../core/util.js';
import { talk, pipHTML, pipMood } from '../ui/mascot.js';
import { badgeArt } from '../ui/art.js';
import { sparkle, buzz } from '../ui/fx.js';
import { GAMES, gameById } from '../games/index.js';
import { L } from '../data/narration.js';

export function render(app, root, params = {}) {
  const park = app.park();
  if (!park) return app.go('park', {});
  music.start('menu');
  const won = store.wonCount(park.id, GAMES.map((g) => g.id));
  root.innerHTML = `
    <div class="book-bg"></div>
    <header class="book-top">
      <button class="round-btn" data-back aria-label="Back to the map">⬅</button>
      <h1>📒 <span>${won}</span>/${GAMES.length}</h1>
      <span></span>
    </header>
    <div class="park-tabs">
      ${app.parks().map((p) => `<button class="park-tab ${p.id === park.id ? 'on' : ''}" data-tab="${p.id}" style="--c:${p.color}" aria-label="${esc(p.name)}">
        <span>${p.icon}</span><small>${store.wonCount(p.id, GAMES.map((g) => g.id))}</small></button>`).join('')}
    </div>
    <div class="book-page">
      <div class="book-park">${park.icon} ${esc(park.name)}</div>
      <div class="sticker-grid">
        ${GAMES.map((g, i) => {
          const st = store.gameStats(park.id, g.id);
          return `<button class="sticker ${st.won ? 'earned' : 'locked'} ${params.fresh === g.id ? 'fresh' : ''}" data-sticker="${g.id}" style="--c:${g.color};--i:${i}">
            ${badgeArt(g, st.won)}
            <span class="sticker-name">${st.won ? esc(g.badge.name) : '?'}</span>
            ${st.won && st.bestMs != null ? `<span class="sticker-time">⏱️ ${fmtTime(st.bestMs, false)}</span>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="guide guide-book"><div class="guide-pip">${pipHTML()}</div><div class="bubble" data-bubble></div></div>`;
  talk(won === GAMES.length ? L.allBadges : L.shelf);
  if (won) pipMood('cheer');

  root.onclick = (e) => {
    const t = (s) => e.target.closest(s);
    if (t('[data-back]')) { sfx('back'); app.go('map', { parkId: park.id }); }
    else if (t('[data-tab]')) { sfx('select'); app.selectPark(t('[data-tab]').dataset.tab); render(app, root, {}); }
    else if (t('[data-sticker]')) {
      const g = gameById(t('[data-sticker]').dataset.sticker);
      const st = store.gameStats(park.id, g.id);
      buzz(15);
      if (st.won) { sfx('sparkle'); sparkle(t('[data-sticker]'), 10); pipMood('cheer'); talk(L.shelfEarned(g)); }
      else { sfx('boing'); talk(L.shelfLocked(g)); }
    }
  };
}
