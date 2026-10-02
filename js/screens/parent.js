/**
 * GROWN-UPS (behind a parent gate)
 * - Settings: sound effects, music, voice, natural voice clips, pocket mode, test controls, tag base URL
 * - Reset progress per playground (badges, best times, saved game)
 * - The ONE shared set of ten tag links (demo: every playground uses the same
 *   chips, written with ?park=123&loc=LOC01..LOC10), printable, Copy / Write / Test
 * - How to write + mount the tags; "Use my location for this playground"
 */
import { store } from '../core/store.js';
import { sfx, music } from '../core/audio.js';
import { say, voiceInfo, pickVoice } from '../core/voice.js';
import { esc, toast, fmtTime, $ } from '../core/util.js';
import { talk, pipHTML, pipMood } from '../ui/mascot.js';
import { getPosition } from '../core/geo.js';
import * as nfc from '../core/nfc.js';
import { LOC_CODES, SHARED_TAG_PARK_ID } from '../data/playgrounds.js';
import { GAMES } from '../games/index.js';
import { L } from '../data/narration.js';

let unlocked = false;

export function render(app, root) {
  music.stop(0.3);
  if (!unlocked) return gate(app, root);
  const st = store.data.settings;
  const base = st.baseUrl || nfc.defaultBaseUrl();
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';
  const parks = app.parks();
  const vi = (pickVoice(), voiceInfo());
  const toggle = (key, label, sub = '') => `
    <label class="tgl"><input type="checkbox" data-set="${key}" ${st[key] ? 'checked' : ''}><span class="tgl-ui"></span>
      <span class="tgl-txt">${label}${sub ? `<small>${sub}</small>` : ''}</span></label>`;

  root.innerHTML = `
    <header class="gu-top no-print">
      <button class="round-btn" data-back aria-label="Back">⬅</button>
      <h1>Grown-ups</h1><span></span>
    </header>

    <section class="panel no-print">
      <h3>⚙️ Settings</h3>
      ${toggle('sound', '🔊 Sound effects')}
      ${toggle('music', '🎵 Background music', 'Soft loop on menus, quieter in games, ducks under the voice.')}
      ${toggle('voice', '🗣️ Voice (Pip reads everything aloud)')}
      ${toggle('clips', '🎙️ Natural recorded voice', 'Uses the bundled voice clips; off = this device’s text-to-speech.')}
      ${toggle('pocket', '🙈 Pocket mode', 'Hide pictures and text during games so kids look at the playground.')}
      ${toggle('testControls', '🧪 Test controls', 'Shows a small 🧪 button in games: simulate a correct / wrong tap.')}
      <div class="voice-row"><button class="gbtn" data-voicetest>▶ Test voice</button>
        <small>Clips: ${vi.clips ? `✅ ${esc(vi.clipVoice || 'recorded')}` : '⚠️ not found'} · Device voice: ${esc(vi.tts || 'none found')}</small></div>
      <label class="field">🔗 Tag base URL
        <input type="url" data-base value="${esc(st.baseUrl)}" placeholder="${esc(nfc.defaultBaseUrl())}">
        <small>Leave empty to use this page’s address. Must be HTTPS for Web NFC + install.</small>
      </label>
      <ul class="status-list">
        <li>${nfc.nfcSupported ? '✅ Web NFC available (Android Chrome): tags are read inside the app.' : 'ℹ️ No Web NFC in this browser (e.g. iPhone). Tags still work: the phone opens the tag link and the tap counts.'}</li>
        <li>${'speechSynthesis' in window ? '✅ Text-to-speech available (fallback voice).' : '⚠️ No text-to-speech here; recorded clips still play.'}</li>
        <li>🔒 Progress stays on this device only. No login, no personal data, nothing is sent to a server.</li>
        <li>${isHttps ? '✅ Secure context (HTTPS/localhost).' : '⚠️ Not HTTPS: Web NFC, location and install need HTTPS.'}</li>
      </ul>
    </section>

    <section class="panel no-print">
      <h3>🏅 Progress per playground</h3>
      ${parks.map((p) => {
        const won = GAMES.filter((g) => store.gameStats(p.id, g.id).won);
        const a = store.active(p.id);
        return `<div class="prog-row">
          <div><b>${p.icon} ${esc(p.name)}</b> <code>#${esc(p.id)}</code><br>
            <small>${won.length}/5 badges${won.length ? ': ' + won.map((g) => `${esc(g.badge.name)} (${fmtTime(store.gameStats(p.id, g.id).bestMs, false)})`).join(', ') : ''}${a ? ` · game in progress: ${esc(GAMES.find((g) => g.id === a.gameId)?.name || '')}, step ${a.state.step + 1}` : ''}</small><br>
            <small>📍 ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} ${store.data.parkOverrides[p.id] ? '<em>(set on this device)</em>' : ''}</small></div>
          <div class="prog-actions">
            <button class="gbtn small" data-here="${p.id}">📍 Use my location</button>
            ${store.data.parkOverrides[p.id] ? `<button class="gbtn small" data-unhere="${p.id}">Undo location</button>` : ''}
            <button class="gbtn small danger" data-resetpark="${p.id}">Reset</button>
          </div></div>`;
      }).join('')}
    </section>

    <section class="panel print-area">
      <div class="print-head"><h3>🏷️ The ten tags (shared by all playgrounds)</h3>
        <button class="gbtn small no-print" data-print>🖨️ Print</button></div>
      <p class="note">Demo setup: <b>one set of ten chips works at every playground.</b> Write each link below on its tag.
        A tap counts for the playground selected in the app (or found by location); the <code>park=${esc(SHARED_TAG_PARK_ID)}</code>
        in the link is only a hint when nothing is selected yet. Progress and badges stay separate per playground.</p>
      <div class="table-wrap"><table class="payloads">
        <thead><tr><th>Tag</th>${parks.map((p) => `<th>${p.icon} ${esc(p.name)}</th>`).join('')}<th class="no-print"></th></tr></thead>
        <tbody>
          ${LOC_CODES.map((code) => {
            const url = nfc.tagUrl(base, SHARED_TAG_PARK_ID, code);
            return `<tr class="tag-row"><td><b>${code}</b></td>
              ${parks.map((p) => `<td>${esc(p.locations[code].name)}</td>`).join('')}
              <td class="no-print actions">
                <button class="gbtn tiny" data-copy="${esc(url)}" aria-label="Copy link">📋</button>
                ${nfc.nfcSupported ? `<button class="gbtn tiny" data-write="${code}" aria-label="Write tag">✍️</button>` : ''}
                <button class="gbtn tiny" data-test="${code}">▶ Test</button></td></tr>
              <tr class="link-row"><td colspan="${parks.length + 2}"><code class="payload">${esc(url)}</code></td></tr>`;
          }).join('')}
        </tbody></table></div>
    </section>

    <section class="panel no-print">
      <h3>📋 How to set up the tags</h3>
      <ol class="howto">
        <li>Get <b>10 NFC stickers</b> (NTAG213/215). Label them <b>LOC01</b> to <b>LOC10</b>.</li>
        <li>With the free <b>NFC Tools</b> app: <b>Write → Add a record → URL</b>, paste that tag’s link, write, then test it. Android Chrome can also use ✍️ above.</li>
        <li><b>Don’t stick tags directly on metal</b> (it blocks the read). Use wood/plastic, a spacer, or on-metal tags. Kid height, away from pinch points.</li>
        <li>The same ten tags work for <b>all five games</b> and (for now) <b>every playground</b>. The game and playground are chosen in the app.</li>
      </ol>
    </section>`;

  root.onclick = async (e) => {
    const t = (sel) => e.target.closest(sel);
    if (t('[data-back]')) { unlocked = false; sfx('back'); return app.go('map', {}); }
    if (t('[data-print]')) return window.print();
    if (t('[data-voicetest]')) { sfx('tap'); return say(L.voiceTest); }
    if (t('[data-copy]')) {
      const v = t('[data-copy]').dataset.copy;
      try { await navigator.clipboard.writeText(v); toast('📋 Copied!', 'good'); } catch { prompt('Copy this:', v); }
      return;
    }
    if (t('[data-test]')) {
      unlocked = false;
      return app.handleTap({ parkId: SHARED_TAG_PARK_ID, loc: t('[data-test]').dataset.test }, 'test');
    }
    if (t('[data-write]')) {
      toast('📱 Hold a blank tag to the back of the phone…', 'info', 6000);
      try { await nfc.writeTag(SHARED_TAG_PARK_ID, t('[data-write]').dataset.write, store.data.settings.baseUrl); sfx('tada'); toast('✅ Tag written!', 'good'); }
      catch (err) { sfx('uhoh'); toast('❌ ' + esc(err.message), 'bad', 4000); }
      return;
    }
    if (t('[data-here]')) {
      const id = t('[data-here]').dataset.here;
      try {
        const pos = await getPosition();
        store.data.parkOverrides[id] = { lat: pos.lat, lng: pos.lng };
        store.save(); app.geo.status = 'idle';
        toast('📍 Playground location saved on this device', 'good'); render(app, root);
      } catch { toast('📍 Could not get location', 'bad'); }
      return;
    }
    if (t('[data-unhere]')) { delete store.data.parkOverrides[t('[data-unhere]').dataset.unhere]; store.save(); return render(app, root); }
    if (t('[data-resetpark]')) {
      const id = t('[data-resetpark]').dataset.resetpark;
      if (confirm(`Reset badges, best times and the saved game for playground #${id}?`)) {
        store.resetPark(id); toast(`Playground #${esc(id)} reset`, 'good'); render(app, root);
      }
    }
  };
  root.onchange = (e) => {
    const set = e.target.dataset.set;
    if (set) {
      store.data.settings[set] = e.target.checked; store.save();
      if (set === 'voice' || set === 'clips') say(L.voiceTest); else sfx('tap');
    }
    if (e.target.matches('[data-base]')) { store.data.settings.baseUrl = e.target.value.trim(); store.save(); render(app, root); }
  };
}

/** Parent gate: a multiplication question on a big keypad (no keyboard). */
function gate(app, root) {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  let typed = '';
  root.innerHTML = `
    <div class="gate-bg"></div>
    <header class="gu-top"><button class="round-btn" data-back aria-label="Back">⬅</button><h1>🔒</h1><span></span></header>
    <div class="gate">
      <div class="guide guide-gate"><div class="guide-pip">${pipHTML('think')}</div><div class="bubble" data-bubble>For grown-ups!</div></div>
      <div class="gate-q" data-q>${a} × ${b} = ?</div>
      <div class="gate-show" data-show>&nbsp;</div>
      <div class="numpad-keys gate-keys">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
        <button data-k="del" aria-label="Delete">⌫</button><button data-k="0">0</button><button data-k="ok" class="ok" aria-label="Enter">✔</button>
      </div>
    </div>`;
  talk(L.grownups);
  pipMood('think', 0);
  root.onclick = (e) => {
    if (e.target.closest('[data-back]')) { sfx('back'); return app.go('map', {}); }
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (!k) return;
    sfx('tap');
    if (k === 'del') typed = typed.slice(0, -1);
    else if (k === 'ok') {
      if (Number(typed) === a * b) { unlocked = true; sfx('tada'); return render(app, root); }
      sfx('uhoh'); pipMood('sad'); talk(L.gateWrong); typed = '';
      return setTimeout(() => app.screen === 'parent' && app.go('map', {}), 1600);
    } else if (typed.length < 3) typed += k;
    $('[data-show]', root).textContent = typed || '\u00a0';
  };
}
