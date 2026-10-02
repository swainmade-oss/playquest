/**
 * SPLASH — "Tap to play". Phones only allow sound after a tap, so this one
 * giant button unlocks audio + voice, then hands over to the next step.
 * If a tag link opened the app, the tap was already counted (app.resolveColdTap)
 * and Pip shows a hint of what happened.
 */
import { unlockAudio, sfx, music } from '../core/audio.js';
import { pipHTML, pipMood } from '../ui/mascot.js';
import { floatingShapes } from '../ui/art.js';
import { buzz } from '../ui/fx.js';

export function render(app, root, { cold } = {}) {
  const hint = cold?.kind === 'game'
    ? (cold.outcome.result === 'correct' ? '<div class="splash-hint good">⭐</div>' : '<div class="splash-hint">👂</div>')
    : cold ? '<div class="splash-hint">📍</div>' : '';
  root.innerHTML = `
    <div class="sky-bg"></div>
    ${floatingShapes(14, 3)}
    <div class="splash">
      <h1 class="logo" aria-label="PlayQuest">
        ${'PlayQuest'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}
      </h1>
      <div class="splash-pip">${pipHTML('big')}${hint}</div>
      <button class="tap-to-play" data-play aria-label="Tap to play">
        <span class="ttp-ring"></span><span class="ttp-ring r2"></span>
        <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M36 24 L78 50 L36 76 Z" fill="#fff" stroke="#2D2A4A" stroke-width="6" stroke-linejoin="round"/></svg>
      </button>
      <div class="splash-label">Tap to play!</div>
    </div>`;

  root.onclick = (e) => {
    if (!e.target.closest('[data-play]')) return;
    unlockAudio();           // synchronous, inside the tap
    sfx('tada'); buzz(25);
    pipMood('cheer', 900);
    music.start('menu');
    root.querySelector('[data-play]').classList.add('pressed');
    setTimeout(() => app.afterSplash(cold), 650);
  };
}
