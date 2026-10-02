/** WIN — the badge drops in, confetti + stars, fanfare, Pip dances. */
import { store } from '../core/store.js';
import { sfx, music } from '../core/audio.js';
import { esc, fmtTime } from '../core/util.js';
import { talk, pipHTML, pipMood } from '../ui/mascot.js';
import { badgeArt } from '../ui/art.js';
import { confetti, buzz } from '../ui/fx.js';
import { GAMES, gameById } from '../games/index.js';
import { L } from '../data/narration.js';

let timers = [];

export function render(app, root, { gameId, win }) {
  const game = gameById(gameId);
  const park = app.park();
  if (!game || !park || !win) return app.go('map', {});
  music.stop(0.2);
  const all = store.wonCount(park.id, GAMES.map((g) => g.id)) === GAMES.length;
  const best = win.newBest && win.prevBest != null ? `<span class="chip best">🏆 New best!</span>`
    : win.newBest ? '' : `<span class="chip">🏆 ${fmtTime(win.prevBest, false)}</span>`;
  root.innerHTML = `
    <div class="win-bg" style="--c:${game.color};--c2:${game.color2}"><div class="sunburst"></div></div>
    <div class="win">
      <div class="win-title">${'YOU DID IT!'.split('').map((c, i) => `<span style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('')}</div>
      <div class="win-badge"><div class="badge-spin">${badgeArt(game, true)}</div><div class="shine"></div></div>
      <div class="win-name">${esc(game.badge.name)}</div>
      <div class="win-stars">${Array.from({ length: 10 }, (_, i) => `<span style="--i:${i}">★</span>`).join('')}</div>
      <div class="win-chips"><span class="chip time">⏱️ ${fmtTime(win.ms)}</span>${best}${win.bestStreak >= 3 ? `<span class="chip">🔥 ${win.bestStreak}</span>` : ''}
        ${(win.extra || []).map((l) => `<span class="chip">${esc(l)}</span>`).join('')}</div>
      <div class="win-pip">${pipHTML('cheer dance')}</div>
      <div class="win-actions">
        <button class="act again" data-again aria-label="Play again">🔁</button>
        <button class="act home" data-home aria-label="Adventure map">🗺️</button>
        <button class="act book" data-shelf aria-label="My stickers">📒</button>
      </div>
    </div>`;
  timers.push(setTimeout(() => { sfx('fanfare'); buzz([60, 40, 60, 40, 120]); confetti(); }, 250));
  timers.push(setTimeout(() => confetti({ count: 80 }), 1700));
  const lines = [L.win(game)];
  if (win.newBest && win.prevBest != null) lines.push(L.newBest);
  if (all) lines.push(L.allBadges);
  timers.push(setTimeout(() => { talk(lines, { bubble: false }); }, 1500));
  pipMood('cheer', 0);

  root.onclick = (e) => {
    const t = (s) => e.target.closest(s);
    if (t('[data-again]')) { sfx('select'); app.go('countdown', { parkId: park.id, gameId: game.id }); }
    else if (t('[data-home]')) { sfx('select'); app.go('map', { parkId: park.id }); }
    else if (t('[data-shelf]')) { sfx('select'); app.go('shelf', { parkId: park.id, fresh: game.id }); }
    else if (t('.win-badge')) { sfx('sparkle'); talk(game.badge.name + '!', { bubble: false }); }
  };
}

export function cleanup() { timers.forEach(clearTimeout); timers = []; }
