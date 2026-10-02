/**
 * SESSION — game logic plumbing shared by the game screen and by tag links
 * that open the app cold (an iPhone opens a NEW page for every tag tap).
 * No DOM here: apply a tap, update streak/stars, save, record wins.
 */
import { store } from './store.js';
import { gameById, STEPS } from '../games/index.js';

export const ctxFor = (park) => ({ now: () => Date.now(), store, park });

/** Start a fresh game (replaces any saved game for this playground). */
export function newGame(park, gameId) {
  const game = gameById(gameId);
  const state = game.start(park, ctxFor(park));
  state.streak = 0; state.bestStreak = 0;
  store.saveActive(park.id, gameId, state);
  return state;
}

export function active(park) {
  const a = park && store.active(park.id);
  return a && gameById(a.gameId) ? a : null;
}

/**
 * Apply one tag tap to a game state. Returns the game's Outcome plus
 *   streak (current streak after this tap)
 *   win    { ms, newBest, prevBest, hadBadge, extra } on the 10th correct tap
 */
export function applyTap(park, gameId, state, loc) {
  const game = gameById(gameId);
  const o = game.tap(state, loc, park, ctxFor(park)) || {};
  return settle(park, game, state, o);
}

/** Timer rules (Power Outage). Returns an Outcome or null. */
export function applyTick(park, gameId, state) {
  const game = gameById(gameId);
  if (!game.tick) return null;
  const o = game.tick(state, park, ctxFor(park));
  return o ? settle(park, game, state, o) : null;
}

function settle(park, game, state, o) {
  if (o.result === 'correct') {
    state.streak = (state.streak || 0) + 1;
    state.bestStreak = Math.max(state.bestStreak || 0, state.streak);
  } else if (o.result === 'wrong') state.streak = 0;
  o.streak = state.streak || 0;
  if (o.done) {
    const ms = Date.now() - state.startedAt;
    const hadBadge = store.gameStats(park.id, game.id).won;
    const { newBest, prevBest } = store.recordWin(park.id, game.id, ms);
    store.clearActive(park.id);
    o.win = { ms, newBest, prevBest, hadBadge, extra: o.done.extra || [], bestStreak: state.bestStreak || 0, wrong: state.wrong || 0 };
  } else {
    store.saveActive(park.id, game.id, state);
  }
  return o;
}

export const stepOf = (state) => Math.min(state.step, STEPS - 1);
