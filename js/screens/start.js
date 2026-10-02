/**
 * START SCREEN (spec: "choose a playground ID and a game from a list, then press start")
 * - Playground: nearest one is suggested via geolocation (≤ ~200 m) and the list
 *   is sorted by distance; if location is denied, pick from the list or type the ID.
 * - Game: the five games with badge status + best time for this playground.
 * - "Continue" if this playground has a saved game in progress.
 * Tapping any tag while here also selects that tag's playground (app.handleTap).
 */
import { store } from '../core/store.js';
import { sfx, say } from '../core/sound.js';
import { esc, toast, fmtTime, $ } from '../core/util.js';
import { iconHTML } from '../core/icons.js';
import { getPosition, permissionState, sortByDistance, formatDistance, NEAR_METERS } from '../core/geo.js';
import { GAMES, gameById, STEPS } from '../games/index.js';

export function render(app, root) {
  const { geo } = app;
  let parks = app.parks();
  if (geo.status === 'ok' && geo.pos) parks = sortByDistance(parks, geo.pos);
  const nearest = parks[0]?.distance != null && parks[0].distance <= NEAR_METERS ? parks[0] : null;
  if (nearest && !app.parkChosenByUser && app.parkId !== nearest.id) app.parkId = nearest.id;
  if (!app.gameId) app.gameId = GAMES[0].id;
  const park = app.park();
  const active = park ? store.active(park.id) : null;

  // --- playground section
  let geoBlock;
  if (geo.status === 'asking') geoBlock = `<div class="geo-card"><span class="spin">🛰️</span> Finding the nearest playground…</div>`;
  else if (nearest) geoBlock = `<div class="geo-card good pop">📍 You're at <b>${esc(nearest.name)}</b>!</div>`;
  else if (geo.status === 'ok') geoBlock = `<div class="geo-card">📍 No playground right here. Closest first:</div>`;
  else if (geo.status === 'denied' || geo.status === 'unsupported') geoBlock = `<div class="geo-card muted">📍 Location is off. Pick below or type the ID. <button class="link" data-geo>Try again</button></div>`;
  else geoBlock = `<button class="btn btn-geo" data-geo>📍 Find nearest playground</button>`;

  const parkCards = parks.map((p) => {
    const won = GAMES.filter((g) => store.gameStats(p.id, g.id).won).length;
    return `
      <button class="park-card ${park?.id === p.id ? 'selected' : ''}" data-park="${p.id}" style="--c:${p.color}">
        <span class="park-ico">${iconHTML(p.icon)}</span>
        <span class="park-info">
          <span class="park-name">${esc(p.name)}</span>
          <span class="park-meta">
            <span class="park-id">#${esc(p.id)}</span>
            <span class="tag-sample">SAMPLE</span>
            ${p.distance != null ? `<span class="dist">📍 ${formatDistance(p.distance)}</span>` : ''}
            <span class="park-badges">🏅 ${won}/${GAMES.length}</span>
          </span>
        </span>
        <span class="check">${park?.id === p.id ? '✔' : ''}</span>
      </button>`;
  }).join('');

  // --- game section
  const gameRows = GAMES.map((g) => {
    const st = park ? store.gameStats(park.id, g.id) : { won: false, bestMs: null };
    return `
      <button class="game-row ${app.gameId === g.id ? 'selected' : ''}" data-game="${g.id}" style="--c:${g.color}">
        <span class="game-ico">${g.icon}</span>
        <span class="game-info">
          <span class="game-name">${esc(g.name)}</span>
          <span class="game-meta"><span class="chip">${esc(g.rule)}</span> ${esc(g.timeLabel)}</span>
        </span>
        <span class="game-badge ${st.won ? 'won' : ''}" title="${esc(g.badge.name)}">
          <span>${st.won ? g.badge.icon : '🔒'}</span>
          <small>${st.bestMs != null ? fmtTime(st.bestMs, false) : '—'}</small>
        </span>
      </button>`;
  }).join('');

  const g = gameById(app.gameId);
  root.innerHTML = `
    <header class="topbar">
      <div class="logo">🛝 <span>Play<b>Quest</b></span></div>
      <button class="icon-btn" data-go="parent" aria-label="Grown-ups">👪</button>
    </header>
    <div class="mascot"><span class="mascot-ico">🦊</span><div class="bubble">Pick a playground and a game!</div></div>

    ${active ? `
      <button class="continue-card pop" data-continue style="--c:${gameById(active.gameId).color}">
        <span class="cont-ico">${gameById(active.gameId).icon}</span>
        <span><b>▶ Continue</b><br>${esc(gameById(active.gameId).name)} · step ${Math.min(active.state.step + 1, STEPS)} of ${STEPS}</span>
      </button>` : ''}

    <h3 class="section-title"><span class="num">1</span> Playground</h3>
    ${geoBlock}
    <div class="park-list">${parkCards}</div>
    <form class="id-form" data-idform>
      <label for="park-id">Playground ID</label>
      <input id="park-id" inputmode="numeric" pattern="[0-9]*" placeholder="e.g. 123" value="${esc(park?.id || '')}" autocomplete="off">
      <button class="btn btn-small" type="submit">OK</button>
    </form>

    <h3 class="section-title"><span class="num">2</span> Game</h3>
    <div class="game-list">${gameRows}</div>
    <p class="how-line">${g ? `${g.icon} ${esc(g.how)}` : ''}</p>

    <div class="start-bar">
      <button class="btn btn-go big" data-start>START ▶</button>
    </div>
    <div class="nfc-chip" data-nfc-chip></div>
  `;

  root.onclick = (e) => {
    const t = (sel) => e.target.closest(sel);
    if (t('[data-park]')) {
      sfx('tap');
      app.parkChosenByUser = true;
      app.parkId = t('[data-park]').dataset.park;
      store.data.lastParkId = app.parkId; store.save();
      say(app.park().name);
      return render(app, root);
    }
    if (t('[data-game]')) {
      sfx('tap');
      app.gameId = t('[data-game]').dataset.game;
      say(gameById(app.gameId).name);
      return render(app, root);
    }
    if (t('[data-geo]')) return locate(app, true);
    if (t('[data-continue]')) { sfx('tap'); return app.go('play', { gameId: active.gameId, fresh: false }); }
    if (t('[data-start]')) {
      if (!app.park()) { sfx('bad'); toast('👆 Pick a playground first!', 'bad'); say('Pick a playground first!'); return; }
      return app.go('play', { gameId: app.gameId, fresh: true });
    }
    if (t('[data-go]')) { sfx('tap'); app.go(t('[data-go]').dataset.go); }
  };
  root.onsubmit = (e) => {
    e.preventDefault();
    const id = $('#park-id', root).value.trim();
    if (app.park(id)) {
      sfx('good'); app.parkChosenByUser = true; app.parkId = id;
      store.data.lastParkId = id; store.save();
      render(app, root);
    } else { sfx('bad'); toast(`🤔 No playground #${esc(id)}`, 'bad'); }
  };

  // Ask for location automatically if already granted or on the very first visit;
  // otherwise wait for the button. Denied → the list + ID box still work.
  if (geo.status === 'idle') {
    permissionState().then((state) => {
      if (state === 'granted' || (state === 'prompt' && !store.data.geoAsked)) locate(app, false);
      else if (state === 'denied' || state === 'unsupported') { geo.status = state; rerender(app); }
    });
  }
}

async function locate(app, fromButton) {
  store.data.geoAsked = true; store.save();
  app.geo.status = 'asking';
  rerender(app);
  try {
    app.geo.pos = await getPosition();
    app.geo.status = 'ok';
    const nearest = sortByDistance(app.parks(), app.geo.pos)[0];
    if (nearest.distance <= NEAR_METERS) { sfx('good'); say(`You're at ${nearest.name}!`); }
  } catch (err) {
    app.geo.status = err?.code === 1 ? 'denied' : 'unsupported';
    if (fromButton) say('Pick your playground!');
  }
  rerender(app);
}

function rerender(app) {
  if (app.screen === 'start') render(app, app.root);
}
