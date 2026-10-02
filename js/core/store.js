/**
 * Local progress storage (localStorage only — no login, no personal data,
 * nothing is sent to a server).
 *
 * data.progress[parkId] = {
 *   active: null | { gameId, state, savedAt }   // game in progress (1 per playground)
 *   games: { [gameId]: { won, bestMs, plays, wonAt } }
 * }
 * The active game is saved after every tap, so closing the app (or an iPhone
 * opening a tag link in a fresh page) resumes exactly where the player was.
 */
const KEY = 'playquest.v1';

const DEFAULTS = {
  settings: {
    sound: true,       // sound effects
    music: true,       // light background music (ducks under the voice)
    voice: true,       // spoken narration + clues
    clips: true,       // use the pre-recorded natural voice clips (else device text-to-speech)
    testControls: true, // "Simulate correct / wrong tap" buttons
    pocket: false,     // Pocket Mode: hide on-screen text during games
    baseUrl: '',       // base URL written into tags ('' = this page)
  },
  progress: {},
  parkOverrides: {},   // { parkId: { lat, lng } } set from the Grown-ups page
  lastParkId: null,
  geoAsked: false,
};

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...structuredClone(DEFAULTS), ...raw, settings: { ...DEFAULTS.settings, ...(raw.settings || {}) } };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export const store = {
  data: load(),

  /** Re-read from localStorage (another tab changed it). */
  reload() { this.data = load(); },

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* storage full / private mode */ }
  },

  park(parkId) {
    return (this.data.progress[parkId] ||= { active: null, games: {} });
  },

  gameStats(parkId, gameId) {
    return this.park(parkId).games[gameId] || { won: false, bestMs: null, plays: 0 };
  },

  // ----- active game (one per playground) -----
  saveActive(parkId, gameId, state) {
    this.park(parkId).active = { gameId, state, savedAt: Date.now() };
    this.save();
  },
  active(parkId) {
    return this.data.progress[parkId]?.active || null;
  },
  clearActive(parkId) {
    if (this.data.progress[parkId]) { this.data.progress[parkId].active = null; this.save(); }
  },

    /** Badges won at a playground (count). */
  wonCount(parkId, gameIds) {
    return gameIds.filter((g) => this.gameStats(parkId, g).won).length;
  },

  /** Record a won game. Returns { newBest, prevBest }. */
  recordWin(parkId, gameId, ms) {
    const g = (this.park(parkId).games[gameId] ||= { won: false, bestMs: null, plays: 0 });
    const prevBest = g.bestMs;
    g.won = true;
    g.plays += 1;
    g.wonAt = Date.now();
    const newBest = prevBest == null || ms < prevBest;
    if (newBest) g.bestMs = ms;
    this.save();
    return { newBest, prevBest };
  },

  /** Reset one playground's badges, best times and active game. */
  resetPark(parkId) {
    delete this.data.progress[parkId];
    this.save();
  },
};
