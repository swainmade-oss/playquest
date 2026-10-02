/**
 * GAME SCREEN (host for all five games)
 * =====================================
 * Dominated by a giant picture of WHAT to find (js/ui/views.js) and a giant
 * "hear it again" button. Pip reads every clue, cheers on correct taps and
 * gently encourages on wrong ones (never punishing). Stars fill up per step,
 * streaks earn extra sparkle. Spec bits: game name, step X of 10 (stars + "3/10"),
 * elapsed time, play-clue button, pocket mode, test controls (🧪, grown-up toggle).
 * Rules + saving live in js/games/ and js/core/session.js.
 */
import { store } from '../core/store.js';
import { sfx, music } from '../core/audio.js';
import { esc, fmtTime, pick } from '../core/util.js';
import { talk, pipHTML, pipMood } from '../ui/mascot.js';
import { gameArt, floatingShapes } from '../ui/art.js';
import { VIEWS } from '../ui/views.js';
import { buzz, flyStar, sparkle } from '../ui/fx.js';
import { gameById, STEPS } from '../games/index.js';
import * as session from '../core/session.js';
import { LOC_CODES } from '../data/playgrounds.js';
import { L } from '../data/narration.js';

let S = null; // { app, park, game, state, timer, lastSec, hurried, nudged }

export const currentPark = () => S?.park || null;

const STAR = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6l13 29 32 3-24 21 7 32-28-17-28 17 7-32L5 38l32-3z"/></svg>';

export function render(app, root, params = {}) {
  const park = app.park();
  const game = gameById(app.gameId);
  if (!park || !game) return app.go('map', {});

  const saved = session.active(park);
  let state;
  if (!params.fresh && saved && saved.gameId === game.id) state = saved.state;
  else state = session.newGame(park, game.id);

  S = { app, park, game, state, timer: null, lastSec: null, hurried: false, nudged: false, done: false };
  const pocket = store.data.settings.pocket;
  music.start('game');

  root.innerHTML = `
    <div class="game-bg ${game.dark ? 'dark' : ''}" style="--c:${game.color};--c2:${game.color2}"></div>
    ${floatingShapes(7, game.id.length)}
    <div class="game ${game.dark ? 'dark' : ''}" style="--c:${game.color};--c2:${game.color2};--ink:${game.ink}">
      <header class="game-top">
        <button class="round-btn" data-quit aria-label="Back to the map">✕</button>
        <div class="game-title"><span class="gt-art">${gameArt(game.id)}</span>
          <span class="gt-text"><span class="gt-name pocket-hide">${esc(game.short)}</span><span class="timer-chip">⏱️ <span data-elapsed>0:00</span></span></span></div>
        <button class="round-btn pocket-btn ${pocket ? 'on' : ''}" data-pocket aria-pressed="${pocket}" aria-label="Pocket mode">${pocket ? '🙈' : '👀'}</button>
      </header>
      <div class="stars-row">
        <div class="stars" data-stars></div>
        <span class="step-count"><b data-step>1</b>/${STEPS}</span>
      </div>
      <main class="game-main" data-main></main>
      <span class="streak" data-streak hidden></span>
      <div class="game-bottom">
        <div class="guide guide-game"><div class="guide-pip">${pipHTML()}</div><div class="bubble pocket-hide" data-bubble></div></div>
        <button class="hear-btn" data-clue aria-label="Hear the clue again">
          <span class="hear-ring"></span>
          <svg viewBox="0 0 100 100" aria-hidden="true"><path d="M18 40h14l20-16v52L32 60H18z" fill="#fff" stroke="#2D2A4A" stroke-width="6" stroke-linejoin="round"/>
          <path d="M62 36c6 8 6 20 0 28M72 26c12 14 12 34 0 48" fill="none" stroke="#2D2A4A" stroke-width="6" stroke-linecap="round"/></svg>
        </button>
      </div>
      ${store.data.settings.testControls ? testPanel(park) : ''}
      <div class="react" data-react aria-live="polite"></div>
      <div class="nfc-chip" data-nfc-chip hidden></div>
    </div>`;
  root.classList.toggle('pocket', pocket);
  root.onclick = onClick;

  renderBody();
  startTimer();

  const clue = game.clue(state, park);
  if (params.replay) present(params.replay, true);
  else if (params.welcome || (!params.fresh && saved)) { talk([L.welcomeBack, clue], { show: clue }); pipMood('cheer'); }
  else talk(clue);
}

export function cleanup() {
  if (S?.timer) clearInterval(S.timer);
  document.getElementById('app').classList.remove('pocket');
  S = null;
}

/** Called by app.handleTap for every tag tap while this screen is showing. */
export function onTap(app, park, loc) {
  if (!S) return false;
  if (S.done) return true;
  flashLoc(loc);
  present(session.applyTap(S.park, S.game.id, S.state, loc));
  return true;
}

// ------------------------------------------------------------------ rendering

function renderBody() {
  const { game, park, state } = S;
  const root = S.app.root;
  const pocket = store.data.settings.pocket;
  const step = session.stepOf(state);
  root.querySelector('[data-step]').textContent = Math.min(state.step + 1, STEPS);
  root.querySelector('[data-stars]').innerHTML = Array.from({ length: STEPS }, (_, i) =>
    `<span class="star ${i < state.step ? 'on' : i === state.step ? 'now' : ''}" data-star="${i}">${STAR}</span>`).join('');
  const streak = root.querySelector('[data-streak]');
  streak.hidden = (state.streak || 0) < 2;
  streak.textContent = `🔥 ${state.streak || 0}`;
  root.querySelector('[data-main]').innerHTML = pocket
    ? `<div class="pocket-card">
         <div class="pocket-ear">👂</div>
         <div class="pocket-num">${step + 1}<small>/${STEPS}</small></div>
         <div class="pocket-icons">👂 → 👀 → 📱</div>
       </div>`
    : `<div class="view view-${game.id}">${VIEWS[game.id].main(state, park, game)}</div>`;
  const bubble = root.querySelector('[data-bubble]');
  if (bubble && !bubble.textContent) bubble.textContent = game.clue(state, park);
  updateLive();
}

function updateLive() {
  if (!S) return;
  const { game, park, state, app } = S;
  const el = app.root.querySelector('[data-elapsed]');
  if (el) el.textContent = fmtTime(Date.now() - state.startedAt, false);
  if (store.data.settings.pocket) return;
  const info = VIEWS[game.id].live?.(state, park, app.root);
  if (!info) return;
  // Power Outage: clock ticks for the last 10 seconds, "Hurry!" at 10
  if (info.secs != null && info.secs !== S.lastSec) {
    if (info.secs <= 10 && info.secs > 0 && S.lastSec != null) sfx(info.secs % 2 ? 'tick' : 'tock');
    if (info.secs === 10 && !S.hurried) { S.hurried = true; talk(L.hurry, { queue: true, bubble: false }); }
    S.lastSec = info.secs;
  }
  // Loop: nudge once per stop if the walker stopped
  if (info.nudge && !S.nudged) { S.nudged = true; sfx('boing'); pipMood('think'); talk(L.nudge, { queue: true, bubble: false }); }
}

function startTimer() {
  S.timer = setInterval(() => {
    if (!S || S.done) return;
    const o = session.applyTick(S.park, S.game.id, S.state);
    if (o) present(o);
    updateLive();
  }, 250);
}

// ------------------------------------------------------------------ outcomes

/** Show + play an Outcome (from a tap, a timer, or a tag link that opened the app). */
function present(o, cold = false) {
  if (!o || !S) return;
  const { game, park, state, app } = S;
  const root = app.root;
  const main = root.querySelector('[data-main]');

  if (o.result === 'correct') {
    sfx('correct'); buzz(60);
    pipMood('cheer');
    const reveal = o.reveal ? `<span class="react-reveal">${o.reveal}</span>` : '';
    react(`<div class="react-card good">${reveal || `<span class="react-star">${STAR}</span>`}</div>`);
    const streakLine = L.streak[o.streak];
    if (streakLine) sfx('streak', 0.5);
    S.hurried = false; S.nudged = false; S.lastSec = null;
    if (o.win) {
      S.done = true;
      renderBody();
      flyStar(main, root.querySelector(`[data-star="${STEPS - 1}"]`));
      setTimeout(() => S && app.go('win', { parkId: park.id, gameId: game.id, win: o.win }), 1100);
      return;
    }
    renderBody();
    const target = root.querySelector(`[data-star="${state.step - 1}"]`);
    flyStar(main, target, () => { sfx('star'); sparkle(target, 8); });
    const lines = [o.say, streakLine, game.clue(state, park)].filter(Boolean);
    talk(lines, { show: game.clue(state, park) });
  } else if (o.result === 'wrong') {
    if (o.kind === 'timeout') { sfx('powerdown'); buzz([100, 50, 100]); root.querySelector('.game')?.classList.add('blackout'); setTimeout(() => root.querySelector('.game')?.classList.remove('blackout'), 900); }
    else { sfx('uhoh'); buzz([40, 30, 40]); }
    pipMood('sad', 1300);
    S.lastSec = null; S.hurried = false;
    renderBody();
    if (o.flip) {
      const card = root.querySelector(`[data-mcard="${o.flip}"]`);
      if (card) { card.classList.add('flipping'); sfx('flip', 0.15); setTimeout(() => sparkle(card, 6), 300); }
    } else {
      root.querySelector('.view')?.classList.add('wobble');
    }
    const icon = o.kind === 'hint' ? `<b class="react-num">${esc(o.toast || '')}</b>` : o.kind === 'timeout' ? '🔋' : '👂';
    react(`<div class="react-card soft">${icon}<small>${o.kind === 'hint' ? '' : 'Try again!'}</small></div>`);
    const encourage = o.say || pick(L.wrong);
    talk([encourage, game.clue(state, park)], { show: encourage });
  }
  if (cold) { /* a tag link opened the app: the tap was counted before the splash */ }
}

function react(html) {
  const el = S.app.root.querySelector('[data-react]');
  el.innerHTML = html;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('show'), 1600);
}

// ------------------------------------------------------------------ test controls

function testPanel(park) {
  return `
    <button class="test-fab" data-testfab aria-label="Test controls">🧪</button>
    <section class="test-panel" data-testpanel hidden>
      <div class="test-head">🧪 Test controls <small>(no tag needed)</small><button data-testfab aria-label="Close">✕</button></div>
      <div class="test-main">
        <button class="tbtn good" data-sim="correct">✅ Correct tap</button>
        <button class="tbtn bad" data-sim="wrong">❌ Wrong tap</button>
      </div>
      <div class="loc-grid">
        ${LOC_CODES.map((c) => `<button class="loc-btn" data-loc="${c}"><b>${c}</b><small>${esc(park.locations[c].name)}</small></button>`).join('')}
      </div>
    </section>`;
}

function flashLoc(loc) {
  const b = document.querySelector(`[data-loc="${loc}"]`);
  if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
}

function onClick(e) {
  const t = (sel) => e.target.closest(sel);
  if (!S) return;
  const { app, park, game, state } = S;

  if (t('[data-sim]')) {
    const want = game.expected(state, park);
    let loc = want;
    if (t('[data-sim]').dataset.sim === 'wrong') {
      // pick a wrong tag (prefer one not yet revealed, so Memory Mode shows a hint)
      const others = LOC_CODES.filter((c) => c !== want);
      const fresh = others.filter((c) => !state.revealed?.[c]);
      loc = pick(fresh.length ? fresh : others);
    }
    app.handleTap({ parkId: park.id, loc }, 'test');
  } else if (t('[data-loc]')) {
    app.handleTap({ parkId: park.id, loc: t('[data-loc]').dataset.loc }, 'test');
  } else if (t('[data-testfab]')) {
    const p = app.root.querySelector('[data-testpanel]');
    p.hidden = !p.hidden; sfx('tap');
  } else if (t('[data-clue]') || t('.find-blob') || t('.mem-card') || t('.pocket-card')) {
    sfx('pop'); buzz(10);
    const b = app.root.querySelector('[data-clue]'); b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
    talk(game.clue(state, park));
  } else if (t('[data-mcard]')) {
    sfx('tap');
    talk(L.spotName(park.locations[t('[data-mcard]').dataset.mcard]), { bubble: false });
  } else if (t('[data-pocket]')) {
    store.data.settings.pocket = !store.data.settings.pocket;
    store.save();
    const on = store.data.settings.pocket;
    const btn = t('[data-pocket]');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    btn.textContent = on ? '🙈' : '👀';
    app.root.classList.toggle('pocket', on);
    sfx('boing');
    talk(on ? [L.pocketOn, game.clue(state, park)] : L.pocketOff, { bubble: false });
    renderBody();
  } else if (t('[data-quit]')) {
    sfx('back');
    app.go('map', { parkId: park.id }); // progress is saved; the island shows ▶ to continue
  }
}
