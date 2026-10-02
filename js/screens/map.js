/**
 * MAP — "Pick an adventure!" Five islands on a wavy sea, each with its own
 * shape, color and character. Tap an island → a big card slides up, Pip
 * explains the game, and a giant ▶ starts the 3-2-1 countdown.
 */
import { store } from '../core/store.js';
import { sfx, music } from '../core/audio.js';
import { esc, fmtTime } from '../core/util.js';
import { talk, pipHTML, pipMood } from '../ui/mascot.js';
import { gameArt, badgeArt } from '../ui/art.js';
import { buzz, sparkle } from '../ui/fx.js';
import { GAMES, gameById, STEPS } from '../games/index.js';
import * as session from '../core/session.js';
import { L } from '../data/narration.js';

// Island silhouettes (viewBox 0 0 200 140), one per game.
const ISLANDS = {
  critters: 'M18 78C8 52 30 30 52 34 60 14 90 10 104 26 120 8 156 14 164 38 190 40 198 70 184 92 196 114 168 132 140 124 118 138 80 136 62 124 34 132 8 112 18 78Z',
  power: 'M48 22L152 22 188 70 152 120 48 120 12 70Z',
  highlow: 'M10 116C30 104 40 66 64 40 76 54 82 62 92 50 106 26 118 14 130 30 148 54 168 80 192 116 150 132 50 132 10 116Z',
  loop: 'M60 26H140A50 46 0 0 1 140 118H60A50 46 0 0 1 60 26Z',
  memory: 'M40 20C70 10 150 12 170 24 192 40 190 100 172 118 150 134 52 132 30 118 8 100 10 38 40 20Z',
};
const POS = [[4, 0], [46, 116], [2, 236], [44, 352], [6, 470]]; // left %, top px

export function render(app, root, params = {}) {
  const park = app.park();
  if (!park) return app.go('park', {});
  music.start('menu');
  const won = store.wonCount(park.id, GAMES.map((g) => g.id));
  const a = session.active(park);

  const islands = GAMES.map((g, i) => {
    const st = store.gameStats(park.id, g.id);
    const going = a?.gameId === g.id;
    const [x, y] = POS[i];
    return `
      <button class="island ${going ? 'going' : ''}" data-game="${g.id}" style="--c:${g.color};--c2:${g.color2};left:${x}%;top:${y}px;--i:${i}" aria-label="${esc(g.name)}">
        <svg class="island-shape" viewBox="0 0 200 140" aria-hidden="true">
          <path d="${ISLANDS[g.id]}" transform="translate(-6 6) scale(1.06)" class="isl-foam"/>
          <path d="${ISLANDS[g.id]}" class="isl-sand" transform="translate(0 6)"/>
          <path d="${ISLANDS[g.id]}" class="isl-top"/>
        </svg>
        <span class="island-art">${gameArt(g.id)}</span>
        <span class="island-name">${esc(g.short)}</span>
        ${st.won ? `<span class="island-badge">${badgeArt(g, true)}</span>` : ''}
        ${going ? `<span class="island-flag">▶ ${Math.min(a.state.step + 1, STEPS)}/${STEPS}</span>` : ''}
      </button>`;
  }).join('');

  root.innerHTML = `
    <div class="sea-bg"><svg class="waves" viewBox="0 0 400 40" preserveAspectRatio="none"><path d="M0 20 Q25 0 50 20 T100 20 T150 20 T200 20 T250 20 T300 20 T350 20 T400 20 V40 H0Z"/></svg></div>
    <header class="map-top">
      <button class="park-chip" data-park style="--c:${park.color}" aria-label="Change playground">
        <span class="park-chip-ico">${park.icon}</span><span class="park-chip-name">${esc(park.name)}</span>
      </button>
      <button class="round-btn music ${store.data.settings.music ? '' : 'off'}" data-music aria-label="Music">🎵</button>
      <button class="round-btn book" data-shelf aria-label="My stickers">📒<b class="count">${won}</b></button>
      <button class="round-btn grown" data-parent aria-label="Grown-ups">🔒</button>
    </header>
    <div class="guide guide-map">
      <div class="guide-pip">${pipHTML()}</div>
      <div class="bubble" data-bubble></div>
    </div>
    <div class="islands">
      <svg class="island-path" viewBox="0 0 390 600" preserveAspectRatio="none" aria-hidden="true">
        <path d="M100 60 C 260 60, 280 110, 270 176 S 110 240, 100 296 S 270 360, 270 412 S 110 470, 100 530"/>
      </svg>
      ${islands}
    </div>
    <div class="nfc-chip" data-nfc-chip hidden></div>`;

  const line = params.greet === 'tag' ? L.tagHello : L.pickAdventure;
  talk(line);
  if (params.greet === 'tag') pipMood('cheer');

  root.onclick = (e) => {
    const t = (s) => e.target.closest(s);
    if (t('[data-game]')) { sfx('select'); buzz(15); openSheet(app, root, park, gameById(t('[data-game]').dataset.game), t('[data-game]')); }
    else if (t('[data-park]')) { sfx('boing'); app.go('park', { choose: true }); }
    else if (t('[data-shelf]')) { sfx('select'); app.go('shelf', { parkId: park.id }); }
    else if (t('[data-parent]')) { sfx('tap'); app.go('parent', {}); }
    else if (t('[data-music]')) {
      const on = !store.data.settings.music;
      music.setEnabled(on);
      t('[data-music]').classList.toggle('off', !on);
      sfx('tap');
    }
  };
}

function openSheet(app, root, park, game, from) {
  sparkle(from, 10);
  const st = store.gameStats(park.id, game.id);
  const a = session.active(park);
  const going = a?.gameId === game.id;
  const facts = [
    game.id === 'power' ? '⏱️ 30s' : null,
    game.id === 'memory' ? '🔢 1 → 10' : '🏷️ ×10',
    st.bestMs != null ? `🏆 ${fmtTime(st.bestMs, false)}` : null,
  ].filter(Boolean);
  const layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.innerHTML = `
    <div class="sheet" style="--c:${game.color};--c2:${game.color2}">
      <button class="sheet-close" data-close aria-label="Close">✕</button>
      <div class="sheet-art bounce-in">${gameArt(game.id)}</div>
      <h2>${esc(game.name)}</h2>
      <div class="facts">${facts.map((f) => `<span>${f}</span>`).join('')}
        <span class="fact-badge">${badgeArt(game, st.won)}</span></div>
      <div class="sheet-actions">
        ${going ? `
          <button class="play-btn" data-continue aria-label="Keep going"><svg viewBox="0 0 100 100"><path d="M36 24 L78 50 L36 76 Z"/></svg><small>${Math.min(a.state.step + 1, STEPS)}/${STEPS}</small></button>
          <button class="restart-btn" data-new aria-label="Start over">↺</button>`
        : `<button class="play-btn" data-start aria-label="Play"><svg viewBox="0 0 100 100"><path d="M36 24 L78 50 L36 76 Z"/></svg></button>`}
      </div>
    </div>`;
  document.body.appendChild(layer);
  requestAnimationFrame(() => layer.classList.add('open'));
  pipMood('cheer', 900);
  talk([game.intro, going ? L.keepGoing : L.tapGo], { show: game.short + '!' });

  const close = () => { layer.classList.remove('open'); setTimeout(() => layer.remove(), 300); };
  layer.onclick = (e) => {
    const t = (s) => e.target.closest(s);
    if (t('[data-close]') || e.target === layer) { sfx('back'); close(); talk(L.pickAdventure); }
    else if (t('[data-start]') || t('[data-new]')) { sfx('select'); buzz(30); layer.remove(); app.go('countdown', { parkId: park.id, gameId: game.id }); }
    else if (t('[data-continue]')) { sfx('select'); buzz(30); layer.remove(); app.go('play', { parkId: park.id, gameId: game.id }); }
    else if (t('.sheet-art')) { sfx('boing'); talk(game.intro); }
  };
}
