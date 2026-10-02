/**
 * GAME SCREEN (host for all five games)
 * =====================================
 * Spec: game name, current step out of 10, elapsed time, Play Clue button,
 * Pocket Mode toggle (hides on-screen text), test controls (simulate a
 * correct / wrong tap). After the 10th correct tap → badge screen.
 *
 * The host does all plumbing (sounds, vibration, text-to-speech, saving,
 * timers, badge + best time); games in js/games/ only supply rules.
 */
import { store } from '../core/store.js';
import { sfx, say } from '../core/sound.js';
import { esc, toast, confetti, buzz, fmtTime, $ } from '../core/util.js';
import { iconHTML } from '../core/icons.js';
import { gameById, STEPS } from '../games/index.js';
import { LOC_CODES } from '../data/playgrounds.js';

let S = null; // { app, park, game, state, ctx, timer, done }

const ctxFor = (park) => ({ now: () => Date.now(), store, park });

export function render(app, root) {
  const park = app.park();
  const game = gameById(app.gameId);
  if (!park || !game) return app.go('start');

  // Resume the saved game for this playground, or start a fresh one.
  const saved = store.active(park.id);
  const ctx = ctxFor(park);
  let state;
  let resumed = false;
  if (saved && saved.gameId === game.id && !app.fresh) { state = saved.state; resumed = true; }
  else { state = game.start(park, ctx); store.saveActive(park.id, game.id, state); }
  app.fresh = false;

  S = { app, park, game, state, ctx, timer: null, done: false };
  const pocket = store.data.settings.pocket;

  root.innerHTML = `
    <header class="topbar game-top" style="--c:${game.color}">
      <button class="icon-btn" data-quit aria-label="Back to start">✖️</button>
      <div class="title"><span class="g-ico">${game.icon}</span> <span class="pocket-hide">${esc(game.name)}</span></div>
      <button class="pocket-toggle ${pocket ? 'on' : ''}" data-pocket aria-pressed="${pocket}" aria-label="Pocket mode">
        <span>${pocket ? '🙈' : '👀'}</span><small>Pocket</small></button>
    </header>

    <div class="status-row">
      <div class="step-pill" style="--c:${game.color}">Step <b id="step-num">${Math.min(state.step + 1, STEPS)}</b> of ${STEPS}</div>
      <div class="elapsed">⏱️ <span data-live="elapsed">0:00</span></div>
    </div>
    <div class="progress"><div class="progress-fill" id="progress-fill" style="--c:${game.color}"></div></div>

    <main id="game-body" class="game-body"></main>

    <button class="btn btn-clue big" data-clue style="--c:${game.color}">🔊 Play Clue</button>

    ${store.data.settings.testControls ? testPanel(park) : ''}
    <div class="nfc-chip" data-nfc-chip></div>
    <div id="overlay"></div>
  `;
  root.classList.toggle('pocket', pocket);
  root.onclick = onClick;

  renderBody();
  startTimer();
  // Speak the current clue (starting or resuming). When resuming because a tag
  // link was opened, app.handleTap applies the tap right after this.
  if (!app.pendingTap) say((resumed ? 'Welcome back! ' : `${game.name}! `) + game.clue(state, park, ctx));
}

export function cleanup() {
  if (S?.timer) clearInterval(S.timer);
  window.speechSynthesis?.cancel();
  S = null;
}

/** Called by app.handleTap for every tag tap while this screen is showing. */
export function onTap(app, park, loc) {
  if (!S || S.done) return !!S;
  if (park.id !== S.park.id) {
    sfx('bad'); buzz([80, 60, 80]);
    toast('🤔 That tag is from a different playground!', 'bad');
    say('That tag is from a different playground!');
    return true;
  }
  flashLoc(loc);
  apply(S.game.tap(S.state, loc, S.park, S.ctx));
  return true;
}

// ------------------------------------------------------------------ UI

function testPanel(park) {
  return `
    <section class="test-panel">
      <div class="test-head">🧪 Test controls <small>(no tag needed)</small></div>
      <div class="test-main">
        <button class="btn btn-go" data-sim="correct">✅ Simulate<br>Correct Tap</button>
        <button class="btn btn-bad" data-sim="wrong">❌ Simulate<br>Wrong Tap</button>
      </div>
      <details class="test-locs">
        <summary>Tap a specific tag (LOC01–LOC10)</summary>
        <div class="loc-grid">
          ${LOC_CODES.map((c) => `<button class="loc-btn" data-loc="${c}">${iconHTML(park.locations[c].icon)}<b>${c}</b><small>${esc(park.locations[c].name)}</small></button>`).join('')}
        </div>
      </details>
    </section>`;
}

function flashLoc(loc) {
  const b = document.querySelector(`[data-loc="${loc}"]`);
  if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
}

function renderBody() {
  const { game, park, state, ctx } = S;
  const pocket = store.data.settings.pocket;
  const step = Math.min(state.step, STEPS - 1);
  $('#step-num').textContent = step + 1;
  $('#progress-fill').style.width = (state.step / STEPS) * 100 + '%';
  $('#game-body').innerHTML = pocket
    ? `<div class="pocket-card pop">
         <div class="pocket-ico">🙈</div>
         <div class="pocket-title">Pocket Mode</div>
         <div class="pocket-step">${step + 1}<small>/ ${STEPS}</small></div>
         <div class="pocket-sub">👂 Listen · 👀 Look · 📱 Tap</div>
       </div>`
    : `${game.view(state, park, ctx)}
       <div class="clue-card pop" style="--c:${game.color}">
         <div class="clue-label">🗣️ Clue ${step + 1}</div>
         <div class="clue-text">${esc(game.clue(state, park, ctx))}</div>
       </div>`;
  updateLive();
}

function updateLive() {
  if (!S) return;
  const { game, park, state, ctx } = S;
  const el = document.querySelector('[data-live="elapsed"]');
  if (el) el.textContent = fmtTime(Date.now() - state.startedAt, false);
  if (!game.live) return;
  for (const [key, val] of Object.entries(game.live(state, park, ctx) || {})) {
    const node = document.querySelector(`[data-live="${key}"]`);
    if (!node) continue;
    const u = typeof val === 'string' ? { text: val } : val;
    if (u.text != null && node.textContent !== u.text) node.textContent = u.text;
    if (u.style) Object.assign(node.style, u.style);
    if (u.cls != null && u.cls !== node.dataset.cls) {
      if (node.dataset.cls) node.classList.remove(node.dataset.cls);
      if (u.cls) node.classList.add(u.cls);
      node.dataset.cls = u.cls;
    }
  }
}

function startTimer() {
  S.timer = setInterval(() => {
    if (!S || S.done) return;
    if (S.game.tick) apply(S.game.tick(S.state, S.park, S.ctx));
    updateLive();
  }, 250);
}

/** Apply an Outcome from a game (see js/games/index.js). */
function apply(o) {
  if (!o || !S) return;
  const { game, park, state, ctx } = S;
  if (o.result === 'correct') { sfx('good'); buzz(60); }
  else if (o.result === 'wrong') { sfx('bad'); buzz([80, 60, 80]); }
  if (o.toast) toast(o.toast, o.result === 'wrong' ? 'bad' : 'good');

  if (o.done) return finish(o.done);

  store.saveActive(park.id, game.id, state);
  if (o.say) say(o.say);
  if (o.result === 'correct' || o.reclue) say(game.clue(state, park, ctx), { queue: !!o.say });
  renderBody();
}

/** 10th correct tap → badge screen. */
function finish(done) {
  const { park, game, state } = S;
  S.done = true;
  clearInterval(S.timer);
  const ms = Date.now() - state.startedAt;
  const hadBadge = store.gameStats(park.id, game.id).won;
  const { newBest, prevBest } = store.recordWin(park.id, game.id, ms);
  store.clearActive(park.id);
  $('#progress-fill').style.width = '100%';

  setTimeout(() => {
    if (!S) return;
    $('#overlay').innerHTML = `
      <div class="modal badge-screen pop" style="--c:${game.color}">
        <div class="badge-medal"><span class="bounce">${game.badge.icon}</span></div>
        <div class="badge-earned">${hadBadge ? 'Badge earned again!' : 'New badge!'}</div>
        <h2>${esc(game.badge.name)}</h2>
        <div class="badge-time">⏱️ Total time <b>${fmtTime(ms)}</b></div>
        <div class="badge-best">${newBest && prevBest != null ? `🏆 New best! (old ${fmtTime(prevBest)})` : newBest ? '🏆 Your first best time!' : `🏆 Best: ${fmtTime(prevBest)}`}</div>
        ${(done.extra || []).map((l) => `<div class="badge-extra">${l}</div>`).join('')}
        <div class="badge-park">${iconHTML(park.icon)} ${esc(park.name)} · #${esc(park.id)}</div>
        <div class="reward-actions">
          <button class="btn btn-go" data-again>🔁 Play Again</button>
          <button class="btn btn-alt" data-home>🏠 Back to Start</button>
        </div>
      </div>`;
    sfx('win');
    confetti(90);
    say(`Amazing! You earned the ${game.badge.name} badge! Your time was ${Math.floor(ms / 60000)} minutes and ${Math.round((ms % 60000) / 1000)} seconds.`, { queue: true });
  }, 300);
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
      const pool = fresh.length ? fresh : others;
      loc = pool[Math.floor(Math.random() * pool.length)];
    }
    app.handleTap({ parkId: park.id, loc }, 'test');
  } else if (t('[data-loc]')) {
    app.handleTap({ parkId: park.id, loc: t('[data-loc]').dataset.loc }, 'test');
  } else if (t('[data-clue]')) {
    sfx('tap');
    say(game.clue(state, park, S.ctx));
  } else if (t('[data-pocket]')) {
    store.data.settings.pocket = !store.data.settings.pocket;
    store.save();
    const on = store.data.settings.pocket;
    const btn = t('[data-pocket]');
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on);
    btn.querySelector('span').textContent = on ? '🙈' : '👀';
    app.root.classList.toggle('pocket', on);
    sfx('tap');
    say(on ? 'Pocket mode on. Listen for the clues!' : 'Pocket mode off.');
    renderBody();
  } else if (t('[data-quit]')) {
    sfx('tap');
    app.go('start'); // progress is saved; "Continue" appears on the Start screen
  } else if (t('[data-again]')) {
    app.go('play', { gameId: game.id, fresh: true });
  } else if (t('[data-home]')) {
    app.go('start');
  }
}
