/** COUNTDOWN — Ready? 3 · 2 · 1 · GO! in the game's colors, then the game starts. */
import { sfx, music } from '../core/audio.js';
import { say } from '../core/voice.js';
import { gameArt, floatingShapes } from '../ui/art.js';
import { buzz } from '../ui/fx.js';
import { gameById } from '../games/index.js';
import { L } from '../data/narration.js';

let timers = [];

export function render(app, root, { gameId }) {
  const game = gameById(gameId);
  music.stop(0.4);
  root.style.setProperty('--c', game.color);
  root.style.setProperty('--c2', game.color2);
  root.innerHTML = `
    <div class="count-bg ${game.dark ? 'dark' : ''}" style="--c:${game.color};--c2:${game.color2}"></div>
    ${floatingShapes(12, 11)}
    <div class="count-wrap">
      <div class="count-art">${gameArt(game.id)}</div>
      <div class="count-num" data-num aria-live="assertive">Ready?</div>
    </div>`;
  const num = root.querySelector('[data-num]');
  const show = (txt, cls) => { num.textContent = txt; num.className = `count-num ${cls || ''}`; void num.offsetWidth; num.classList.add('boom'); };
  say(L.ready);
  const seq = [['3', L.count[0]], ['2', L.count[1]], ['1', L.count[2]], ['GO!', L.count[3]]];
  seq.forEach(([txt, line], i) => {
    timers.push(setTimeout(() => {
      show(txt, i === 3 ? 'go' : '');
      sfx(i === 3 ? 'go' : 'count'); buzz(i === 3 ? 60 : 20);
      say(line);
    }, 900 + i * 900));
  });
  timers.push(setTimeout(() => app.go('play', { parkId: app.parkId, gameId: game.id, fresh: true }), 900 + 3 * 900 + 750));
}

export function cleanup() { timers.forEach(clearTimeout); timers = []; document.getElementById('app').style.cssText = ''; }
