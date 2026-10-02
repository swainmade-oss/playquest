/**
 * PLAYQUEST — APP BOOTSTRAP + ROUTER
 * ==================================
 * Kid flow (few big steps, no forms, Pip the mascot narrates everything):
 *   splash    "Tap to play" (unlocks audio on phones)
 *   park      Pip finds the playground: "Is this your playground?" 👍 / pick another
 *   map       adventure islands, one per game → tap → ▶ play
 *   countdown 3-2-1-GO
 *   play      giant picture of WHAT to find + giant "hear it again" button
 *   win       animated badge, confetti, fanfare
 *   shelf     sticker book: 5 badges per playground
 *   parent    grown-ups (behind a gate): settings, reset, tag links, test controls
 *
 * TAGS: every tap (tag link ?park=&loc=, Web NFC, or a test button) goes through
 * app.handleTap({ parkId, loc }). DEMO RULE: all playgrounds share the same ten
 * chips (written with ?park=123&loc=LOCxx). A tap counts for the playground the
 * kid has selected (or found by location); the tag's park is only a hint when
 * nothing is selected yet. Progress + badges stay separate per playground.
 */
import { store } from './core/store.js';
import { sfx, unlockAudio, music, unlocked } from './core/audio.js';
import { cancel as cancelVoice, warmCache } from './core/voice.js';
import { buzz } from './ui/fx.js';
import { talk, pipMood } from './ui/mascot.js';
import { L } from './data/narration.js';
import * as nfc from './core/nfc.js';
import * as session from './core/session.js';
import * as splash from './screens/splash.js';
import * as parkScreen from './screens/park.js';
import * as map from './screens/map.js';
import * as countdown from './screens/countdown.js';
import * as play from './screens/play.js';
import * as win from './screens/win.js';
import * as shelf from './screens/shelf.js';
import * as parent from './screens/parent.js';
import { PLAYGROUNDS } from './data/playgrounds.js';

const SCREENS = { splash, park: parkScreen, map, countdown, play, win, shelf, parent };

export const app = {
  screen: null,
  parkId: store.data.lastParkId,
  gameId: null,
  geo: { status: 'idle', pos: null },  // idle | asking | ok | denied | unsupported
  params: {},
  root: document.getElementById('app'),

  /** Playgrounds with any on-device location overrides applied. */
  parks() {
    return PLAYGROUNDS.map((p) => ({ ...p, ...(store.data.parkOverrides[p.id] || {}) }));
  },
  park(id = this.parkId) {
    return this.parks().find((p) => p.id === String(id)) || null;
  },
  /** Make a playground the selected one (remembered on this device). */
  selectPark(id) {
    this.parkId = String(id);
    store.data.lastParkId = this.parkId; store.save();
  },

  /** Navigate to a screen. params are screen-specific (app.params). */
  go(screen, params = {}) {
    SCREENS[this.screen]?.cleanup?.();
    cancelVoice();
    if (params.parkId) this.selectPark(params.parkId);
    if (params.gameId) this.gameId = params.gameId;
    this.params = params;
    const prev = this.screen;
    this.screen = screen;
    this.root.className = `screen screen-${screen}`;
    this.root.innerHTML = '';
    this.root.onclick = this.root.onpointerdown = this.root.onkeydown = this.root.onchange = null;
    document.querySelectorAll('.fx-confetti, .toast, .sheet-layer').forEach((el) => el.remove());
    window.scrollTo(0, 0);
    if (prev && prev !== 'splash') sfx('whoosh');
    SCREENS[screen].render(this, this.root, params);
    this.renderNfcChip();
  },

  // ---------------------------------------------------------------- taps
  _lastTap: { key: '', at: 0 },

  /**
   * Which playground does a tap count for? The selected one (or the one being
   * played); the tag's park is only used when nothing is selected yet.
   */
  parkForTap(tap) {
    if (this.screen === 'play' && play.currentPark()) return play.currentPark();
    return this.park(this.parkId) || this.park(tap.parkId) || null;
  },

  /** Single entry point for every tap. source: 'nfc' | 'link' | 'test' */
  handleTap(tap, source = 'test') {
    const key = `${tap.parkId}:${tap.loc}`;
    const now = Date.now();
    // NFC readers often fire twice for one touch — ignore quick repeats (not for test buttons).
    if (source !== 'test' && key === this._lastTap.key && now - this._lastTap.at < 1500) return;
    this._lastTap = { key, at: now };

    if (this.screen === 'countdown') return; // the game starts at GO
    const park = this.parkForTap(tap);
    if (!park || !park.locations[tap.loc]) {
      sfx('uhoh'); buzz([60, 40, 60]); pipMood('think');
      talk(L.unknownTag);
      return;
    }
    // In a game: the game screen decides if it's right or wrong.
    if (this.screen === 'play' && play.onTap(this, park, tap.loc, source)) return;

    // Not on the game screen. If this playground has a saved game, resume it and count the tap.
    const a = session.active(park);
    if (a) {
      const outcome = session.applyTap(park, a.gameId, a.state, tap.loc);
      if (outcome.win) return this.go('win', { parkId: park.id, gameId: a.gameId, win: outcome.win });
      return this.go('play', { parkId: park.id, gameId: a.gameId, replay: outcome });
    }
    // No game in progress: the tag tells us we're at a playground → adventure picker.
    sfx('tada');
    this.go('map', { parkId: park.id, greet: 'tag' });
  },

  /**
   * A tag link opened the app cold (no gesture yet, so no sound). Count the tap
   * NOW (so it's saved even if the kid never taps the splash), and remember what
   * to show/say after "Tap to play".
   */
  resolveColdTap(tap) {
    const park = this.park(this.parkId) || null;
    if (!park) {
      // Nothing selected on this device yet: ask "Is this your playground?" with the tag's park as a hint.
      return { kind: 'pickpark', hint: this.park(tap.parkId)?.id || null };
    }
    if (!park.locations[tap.loc]) return { kind: 'unknown' };
    const a = session.active(park);
    if (!a) return { kind: 'map', parkId: park.id };
    const outcome = session.applyTap(park, a.gameId, a.state, tap.loc);
    return { kind: 'game', parkId: park.id, gameId: a.gameId, outcome };
  },

  /** After the splash tap: continue where the cold start wanted to go. */
  afterSplash(cold) {
    if (cold?.kind === 'game') {
      if (cold.outcome.win) return this.go('win', { parkId: cold.parkId, gameId: cold.gameId, win: cold.outcome.win });
      return this.go('play', { parkId: cold.parkId, gameId: cold.gameId, replay: cold.outcome });
    }
    if (cold?.kind === 'map') return this.go('map', { parkId: cold.parkId, greet: 'tag' });
    if (cold?.kind === 'pickpark') return this.go('park', { hint: cold.hint, then: 'tag' });
    const last = this.park(store.data.lastParkId);
    const a = last && session.active(last);
    if (a) return this.go('play', { parkId: last.id, gameId: a.gameId, welcome: true });
    return this.go('park', {});
  },

  // ---------------------------------------------------------------- NFC
  async startNfc(fromGesture = false) {
    if (!nfc.nfcSupported) return false;
    try {
      await nfc.startScan({
        onTap: (tap) => this.handleTap(tap, 'nfc'),
        onUnknown: () => { sfx('uhoh'); talk(L.unknownTag); },
        onError: () => { sfx('uhoh'); },
      });
      if (fromGesture) sfx('tada');
      this.renderNfcChip();
      return true;
    } catch {
      this.renderNfcChip();
      return false;
    }
  },

  /** Small NFC status chip ([data-nfc-chip]) on screens that have one. */
  renderNfcChip() {
    document.querySelectorAll('[data-nfc-chip]').forEach((el) => {
      if (!nfc.nfcSupported) { el.hidden = true; return; }
      el.hidden = false;
      el.classList.toggle('on', nfc.nfcState.scanning);
      el.innerHTML = nfc.nfcState.scanning ? '<span class="dot"></span>📡' : '📡 Tap to read tags';
      el.onclick = nfc.nfcState.scanning ? null : (e) => { e.stopPropagation(); this.startNfc(true); };
    });
  },
};

// ------------------------------------------------------------------ boot
function boot() {
  const linkTap = nfc.consumeUrlTap();                       // opened from a tag link?
  const cold = linkTap ? app.resolveColdTap(linkTap) : null; // counted right away
  app.go('splash', { cold });

  // A tag link can also arrive while the page is open (same tab, hash form).
  window.addEventListener('hashchange', () => {
    const t = nfc.consumeUrlTap();
    if (!t) return;
    if (!unlocked) { app.go('splash', { cold: app.resolveColdTap(t) }); return; }
    app.handleTap(t, 'link');
  });

  // iPhone often opens a tag link in a NEW tab. If this older tab is used
  // again, pick up whatever the other tab saved.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'playquest.v1') return;
    store.reload();
    if (app.screen === 'play') {
      const p = app.park();
      const a = p && session.active(p);
      if (a) app.go('play', { parkId: p.id, gameId: a.gameId });
      else app.go('map', { parkId: app.parkId });
    }
  });

  // Web NFC: auto-start if permission was granted before (else needs a button press).
  if (nfc.nfcSupported) nfc.nfcPermissionGranted().then((ok) => ok && app.startNfc(false));

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then(() => setTimeout(warmCache, 4000))
      .catch(() => {});
  }
}

export { unlockAudio, music };
boot();
window.app = app; // handy for debugging in DevTools
