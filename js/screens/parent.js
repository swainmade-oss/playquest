/**
 * GROWN-UPS / SETUP PAGE (behind a simple grown-up gate)
 * - Settings: sound, voice, test controls, pocket mode, tag base URL
 * - Reset progress per playground (badges, best times, saved game)
 * - How to write + mount the ten NFC tags
 * - Printable list of tag links (LOC01..LOC10) per playground, Copy / Write / Test
 * - "Use my location for this playground" (to try the nearest-playground feature)
 */
import { store } from '../core/store.js';
import { sfx, say } from '../core/sound.js';
import { esc, toast, fmtTime, $ } from '../core/util.js';
import { iconHTML } from '../core/icons.js';
import { getPosition } from '../core/geo.js';
import * as nfc from '../core/nfc.js';
import { LOC_CODES } from '../data/playgrounds.js';
import { GAMES } from '../games/index.js';

let unlocked = false;

export function render(app, root) {
  if (!unlocked) return gate(app, root);
  const st = store.data.settings;
  const base = st.baseUrl || nfc.defaultBaseUrl();
  const isHttps = location.protocol === 'https:' || location.hostname === 'localhost';

  const tables = app.parks().map((p) => {
    const won = GAMES.filter((g) => store.gameStats(p.id, g.id).won);
    return `
    <div class="payload-park">
      <h4>${iconHTML(p.icon)} ${esc(p.name)} <code>#${esc(p.id)}</code> <span class="tag-sample">SAMPLE</span></h4>
      <table class="payloads">
        <thead><tr><th>Tag</th><th>Spot</th><th>Link to write on the tag</th><th class="no-print"></th></tr></thead>
        <tbody>
          ${LOC_CODES.map((code) => {
            const loc = p.locations[code];
            const url = nfc.tagUrl(base, p.id, code);
            return `<tr>
              <td class="code-cell"><b>${code}</b></td>
              <td class="st-cell">${iconHTML(loc.icon, 'mini')} ${esc(loc.name)}</td>
              <td><code class="payload">${esc(url)}</code></td>
              <td class="no-print actions">
                <button class="btn btn-tiny" data-copy="${esc(url)}">📋 Copy</button>
                ${nfc.nfcSupported ? `<button class="btn btn-tiny" data-write="${p.id}:${code}">✍️ Write</button>` : ''}
                <button class="btn btn-tiny" data-test="${p.id}:${code}">▶ Test</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
      <div class="park-progress no-print">
        🏅 Badges: ${won.length ? won.map((g) => `${g.badge.icon} ${esc(g.badge.name)} (${fmtTime(store.gameStats(p.id, g.id).bestMs, false)})`).join(', ') : 'none yet'}
        ${store.active(p.id) ? ' · ▶ game in progress' : ''}
        <button class="btn btn-tiny btn-danger" data-resetpark="${p.id}">🗑️ Reset this playground</button>
      </div>
      <div class="park-loc no-print">📍 ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}
        ${store.data.parkOverrides[p.id] ? '<em>(set on this device)</em>' : ''}
        <button class="btn btn-tiny" data-here="${p.id}">Use my location for this playground</button>
        ${store.data.parkOverrides[p.id] ? `<button class="btn btn-tiny" data-unhere="${p.id}">Reset location</button>` : ''}
      </div>
    </div>`;
  }).join('');

  root.innerHTML = `
    <header class="topbar no-print">
      <button class="icon-btn" data-back aria-label="Back">⬅️</button>
      <div class="title">👪 <span>Grown-ups</span></div>
      <div></div>
    </header>

    <section class="panel no-print">
      <h3>⚙️ Settings</h3>
      <label class="toggle"><input type="checkbox" data-set="sound" ${st.sound ? 'checked' : ''}> 🔊 Sound effects</label>
      <label class="toggle"><input type="checkbox" data-set="voice" ${st.voice ? 'checked' : ''}> 🗣️ Speak clues aloud (text-to-speech)</label>
      <label class="toggle"><input type="checkbox" data-set="pocket" ${st.pocket ? 'checked' : ''}> 🙈 Pocket Mode (hide on-screen text during games)</label>
      <label class="toggle"><input type="checkbox" data-set="testControls" ${st.testControls ? 'checked' : ''}> 🧪 Show test controls (simulate correct / wrong tap)</label>
      <label class="field">🔗 Tag base URL (where the app is hosted)
        <input type="url" data-base value="${esc(st.baseUrl)}" placeholder="${esc(nfc.defaultBaseUrl())}">
        <small>Leave empty to use this page's address. Must be HTTPS for Web NFC + PWA install.</small>
      </label>
      <div class="status-list">
        <div>${nfc.nfcSupported ? '✅ Web NFC available (Android Chrome): the app can read tags while it is open.' : '⚠️ Web NFC not available in this browser (e.g. iPhone Safari, desktop). Tags still work: the phone opens the tag link and the app counts the tap.'}</div>
        <div>${'speechSynthesis' in window ? '✅ Text-to-speech available.' : '⚠️ No text-to-speech in this browser. Clues are shown as text only.'}</div>
        <div>🔒 Progress is stored only on this device. No login, no personal data, nothing is sent to a server.</div>
        <div>${isHttps ? '✅ Secure context (HTTPS/localhost).' : '⚠️ Not HTTPS — Web NFC, location and install need HTTPS.'}</div>
      </div>
    </section>

    <section class="panel no-print">
      <h3>🏷️ How to set up the ten tags</h3>
      <ol class="howto">
        <li>Get <b>10 NFC stickers</b> (NTAG213 or NTAG215) per playground. Label them <b>LOC01</b> to <b>LOC10</b>.</li>
        <li>Install the free <b>NFC Tools</b> app (Android or iPhone).</li>
        <li>In NFC Tools, go to <b>Write → Add a record → URL/URI</b>, paste that tag's <b>link</b> from the table below, press <b>Write</b> and hold the phone on the sticker.
          On Android Chrome you can also press <b>✍️ Write</b> in the table.</li>
        <li>Test every tag with a phone, then (optionally) <b>lock</b> it in NFC Tools so it can't be overwritten.</li>
        <li><b>Mounting:</b> <b>don't stick tags directly on metal</b>, because metal blocks the read. Use wood or plastic posts, a plastic spacer, or special "on-metal" tags. Put them at kid height, away from pinch points, with a small 📱 "tap here" label. Weatherproof tags or covers last longer outdoors.</li>
        <li>The same ten tags work for <b>all five games</b>. The game is chosen in the app, not on the tag.</li>
      </ol>
      <p class="note"><b>How a tap works:</b> iPhone (XS or newer) and Android read the tag link automatically. A banner or notification opens PlayQuest, and the tap counts toward the saved game. On Android Chrome, after "📡 Turn on tag reader", tags are read right inside the app. iPhone Safari has no Web NFC, so iPhones always go through the link.</p>
    </section>

    <section class="panel print-area">
      <div class="print-head">
        <h3>📋 Tag links</h3>
        <button class="btn btn-small no-print" data-print>🖨️ Print table</button>
      </div>
      <p class="note">Base URL: <code>${esc(base)}</code>. Format: <code>…?park=&lt;ID&gt;&amp;loc=LOC01…LOC10</code>. One link per tag, the same tags for every game.</p>
      ${tables}
    </section>
  `;

  root.onclick = async (e) => {
    const t = (sel) => e.target.closest(sel);
    if (t('[data-back]')) { unlocked = false; sfx('tap'); return app.go('start'); }
    if (t('[data-print]')) return window.print();
    if (t('[data-copy]')) {
      const v = t('[data-copy]').dataset.copy;
      try { await navigator.clipboard.writeText(v); toast('📋 Copied!', 'good'); } catch { prompt('Copy this:', v); }
      return;
    }
    if (t('[data-test]')) {
      const [parkId, loc] = t('[data-test]').dataset.test.split(':');
      unlocked = false;
      return app.handleTap({ parkId, loc }, 'test');
    }
    if (t('[data-write]')) {
      const [parkId, loc] = t('[data-write]').dataset.write.split(':');
      toast('📱 Hold a blank tag to the back of the phone…', 'info', 6000);
      try {
        await nfc.writeTag(parkId, loc, store.data.settings.baseUrl);
        sfx('good'); toast('✅ Tag written!', 'good');
      } catch (err) { sfx('bad'); toast('❌ ' + esc(err.message), 'bad', 4000); }
      return;
    }
    if (t('[data-here]')) {
      const id = t('[data-here]').dataset.here;
      try {
        const pos = await getPosition();
        store.data.parkOverrides[id] = { lat: pos.lat, lng: pos.lng };
        store.save(); app.geo.status = 'idle';
        toast('📍 Playground location saved on this device', 'good');
        render(app, root);
      } catch { toast('📍 Could not get location', 'bad'); }
      return;
    }
    if (t('[data-unhere]')) {
      delete store.data.parkOverrides[t('[data-unhere]').dataset.unhere];
      store.save(); app.geo.status = 'idle';
      return render(app, root);
    }
    if (t('[data-resetpark]')) {
      const id = t('[data-resetpark]').dataset.resetpark;
      if (confirm(`Reset badges, best times and the saved game for playground #${id}?`)) {
        store.resetPark(id); toast(`Playground #${esc(id)} reset`, 'good'); render(app, root);
      }
    }
  };

  root.onchange = (e) => {
    const set = e.target.dataset.set;
    if (set) { store.data.settings[set] = e.target.checked; store.save(); if (set !== 'voice') sfx('tap'); else say('Voice on!'); }
    if (e.target.matches('[data-base]')) {
      store.data.settings.baseUrl = e.target.value.trim();
      store.save(); render(app, root);
    }
  };
}

/** Simple grown-up gate: a multiplication question kids are unlikely to know. */
function gate(app, root) {
  const a = 3 + Math.floor(Math.random() * 7);
  const b = 3 + Math.floor(Math.random() * 7);
  root.innerHTML = `
    <header class="topbar">
      <button class="icon-btn" data-back aria-label="Back">⬅️</button>
      <div class="title">👪 <span>Grown-ups only</span></div>
      <div></div>
    </header>
    <section class="panel gate">
      <p>To continue, answer:</p>
      <div class="gate-q">${a} × ${b} = ?</div>
      <input class="gate-in" type="number" inputmode="numeric" autocomplete="off">
      <button class="btn btn-go" data-check>Enter</button>
    </section>`;
  const check = () => {
    if (Number($('.gate-in', root).value) === a * b) { unlocked = true; render(app, root); }
    else { sfx('bad'); toast('Ask a grown-up! 🙂', 'bad'); app.go('start'); }
  };
  root.onclick = (e) => {
    if (e.target.closest('[data-back]')) return app.go('start');
    if (e.target.closest('[data-check]')) check();
  };
  root.onkeydown = (e) => { if (e.key === 'Enter') check(); };
}
