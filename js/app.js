/**
 * PLAYQUEST — APP BOOTSTRAP + ROUTER
 * ==================================
 * Tiny screen router (no framework). Each screen module exports
 * `render(app, root)` and may export `cleanup()` and `onTap(app, park, loc)`.
 *
 *   start  – choose playground (geolocation / list / ID) + game, press START
 *   play   – game screen (step X of 10, time, Play Clue, Pocket Mode, test controls)
 *            → badge screen overlay after the 10th correct tap
 *   parent – grown-ups: settings, reset per playground, printable tag links
 *
 * Every tap — Web NFC read, a tag link opening the page (?park=&loc=), or a
 * test button — goes through app.handleTap({ parkId, loc }).
 */
import { PLAYGROUNDS } from './data/playgrounds.js';
import { store } from './core/store.js';
import { sfx, say, unlockAudio } from './core/sound.js';
import { toast, buzz, esc } from './core/util.js';
import * as nfc from './core/nfc.js';
import * as start from './screens/start.js';
import * as play from './screens/play.js';
import * as parent from './screens/parent.js';

const SCREENS = { start, play, parent };

export const app = {
  screen: null,
  parkId: store.data.lastParkId,
  gameId: null,
  parkChosenByUser: false,
  geo: { status: 'idle', pos: null },  // idle | asking | ok | denied | unsupported
  pendingTap: false,
  root: document.getElementById('app'),

  /** Playgrounds with any on-device location overrides applied. */
  parks() {
    return PLAYGROUNDS.map((p) => ({ ...p, ...(store.data.parkOverrides[p.id] || {}) }));
  },
  park(id = this.parkId) {
    return this.parks().find((p) => p.id === String(id)) || null;
  },

  /** Navigate to a screen. */
  go(screen, params = {}) {
    SCREENS[this.screen]?.cleanup?.();
    Object.assign(this, params);
    if (this.parkId) { store.data.lastParkId = this.parkId; store.save(); }
    this.screen = screen;
    this.root.className = `screen-${screen}`;
    this.root.innerHTML = '';
    this.root.onclick = this.root.onchange = this.root.onkeydown = this.root.onsubmit = null;
    document.querySelectorAll('.confetti, .toast').forEach((el) => el.remove());
    window.scrollTo(0, 0);
    SCREENS[screen].render(this, this.root);
    this.renderNfcChip();
  },

  // ---------------------------------------------------------------- taps
  _lastTap: { key: '', at: 0 },

  /** Single entry point for every tap. source: 'nfc' | 'link' | 'test' */
  handleTap(tap, source = 'test') {
    const key = `${tap.parkId}:${tap.loc}`;
    const now = Date.now();
    // NFC readers often fire twice for one touch — ignore quick repeats (not for test buttons).
    if (source !== 'test' && key === this._lastTap.key && now - this._lastTap.at < 1500) return;
    this._lastTap = { key, at: now };

    const park = this.park(tap.parkId);
    if (!park || !park.locations[tap.loc]) {
      sfx('bad'); buzz([80, 60, 80]);
      toast(`🤔 Unknown tag (playground ${esc(tap.parkId)}, ${esc(tap.loc)})`, 'bad');
      return;
    }

    // In a game: the game screen decides if it's right or wrong.
    if (SCREENS[this.screen]?.onTap?.(this, park, tap.loc, source)) return;

    // Not in a game. If this playground has a saved game, resume it and apply the tap.
    const active = store.active(park.id);
    if (active) {
      this.pendingTap = true;
      this.go('play', { parkId: park.id, gameId: active.gameId, fresh: false });
      this.pendingTap = false;
      play.onTap(this, park, tap.loc, source);
      return;
    }
    // Otherwise a tag just tells us which playground we're at.
    sfx('tap');
    this.parkChosenByUser = true;
    this.go('start', { parkId: park.id });
    toast(`📍 <b>${esc(park.name)}</b> · ${tap.loc}<br>Pick a game and press START!`, 'good', 3500);
    say(`You're at ${park.name}! Pick a game and press start!`);
  },

  // ---------------------------------------------------------------- NFC
  async startNfc(fromGesture = false) {
    if (!nfc.nfcSupported) return false;
    try {
      await nfc.startScan({
        onTap: (tap) => this.handleTap(tap, 'nfc'),
        onUnknown: () => { sfx('bad'); toast('🤔 That is not a PlayQuest tag', 'bad'); },
        onError: (e) => toast('📡 ' + esc(e.message), 'bad'),
      });
      if (fromGesture) { sfx('good'); toast('📡 Tag reader is ON! Touch a tag.', 'good'); }
      this.renderNfcChip();
      return true;
    } catch (e) {
      if (fromGesture) toast('📡 ' + (e.name === 'NotAllowedError' ? 'NFC permission denied' : esc(e.message)), 'bad', 3500);
      this.renderNfcChip();
      return false;
    }
  },

  /** Updates NFC status chips ([data-nfc-chip]) on the current screen. */
  renderNfcChip() {
    document.querySelectorAll('[data-nfc-chip]').forEach((el) => {
      if (nfc.nfcSupported) {
        el.innerHTML = nfc.nfcState.scanning ? '<span class="dot on"></span> Tag reader ON' : '📡 Turn on tag reader';
        el.classList.toggle('clickable', !nfc.nfcState.scanning);
        el.onclick = nfc.nfcState.scanning ? null : () => this.startNfc(true);
      } else {
        el.innerHTML = '📱 Hold the top of the phone near a tag';
        el.onclick = () => toast('iPhone: touch the top of the phone to the tag, then tap the banner that pops up.', 'info', 4500);
      }
    });
  },
};

// ------------------------------------------------------------------ boot
function boot() {
  unlockAudio();

  const linkTap = nfc.consumeUrlTap();                 // opened from a tag link?
  const last = app.park(store.data.lastParkId);
  const lastActive = last && store.active(last.id);

  if (linkTap) {
    app.go('start');
    app.handleTap(linkTap, 'link');                    // resumes that playground's game if any
  } else if (lastActive) {
    app.go('play', { parkId: last.id, gameId: lastActive.gameId, fresh: false }); // came back → resume
  } else {
    app.go('start');
  }

  // A tag link can also arrive while the page is open (same tab, hash form).
  window.addEventListener('hashchange', () => {
    const t = nfc.consumeUrlTap();
    if (t) app.handleTap(t, 'link');
  });

  // iPhone often opens a tag link in a NEW tab. If this older tab is used
  // again, pick up whatever the other tab saved.
  window.addEventListener('storage', (e) => {
    if (e.key !== 'playquest.v1') return;
    store.reload();
    const a = app.parkId && store.active(app.parkId);
    if (a) app.go('play', { gameId: a.gameId, fresh: false });
    else if (app.screen === 'play') app.go('start');
  });

  // Web NFC: auto-start if permission was granted before (else needs a button press).
  if (nfc.nfcSupported) nfc.nfcPermissionGranted().then((ok) => ok && app.startNfc(false));

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

boot();
window.app = app; // handy for debugging in DevTools
