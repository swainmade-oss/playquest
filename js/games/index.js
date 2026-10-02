/**
 * GAME REGISTRY — the five PlayQuest games (all use the same ten tags).
 *
 * The host (js/screens/play.js) draws the standard game screen from the spec:
 * game name, "Step X of 10", elapsed time, Play Clue button, Pocket Mode,
 * test controls; it plays sounds/vibration, speaks clues, saves progress
 * after every tap and shows the badge screen after the 10th correct tap.
 *
 * A game only supplies the rules:
 *   id, name, icon, color       list entry on the Start screen
 *   badge: { name, icon }       earned on completion (1 per game per playground)
 *   rule, timeLabel, how        rule type / time limit / one-line explanation
 *   start(park, ctx) -> state   JSON state; MUST contain `step` (0..10 correct taps)
 *                               and `startedAt` (ms). Saved after every move, so use
 *                               timestamps, never setInterval, for timers.
 *   expected(state, park) -> 'LOCxx'   correct tag for the current step
 *                                      (used by "Simulate correct tap")
 *   clue(state, park, ctx) -> string   clue for the current step (spoken + shown)
 *   view(state, park, ctx) -> html     visual card (hidden in Pocket Mode)
 *   tap(state, loc, park, ctx) -> Outcome
 *   tick?(state, park, ctx) -> Outcome|null   ~4×/sec (timers)
 *   live?(state, park, ctx) -> { key: text | { text, style, cls } }
 *                               cheap updates of [data-live="key"] elements
 *
 * Outcome: { result: 'correct'|'wrong'|'info', say?, toast?, reclue?, done? }
 *   correct → success sound + short vibration, `say`, then the next clue
 *   wrong   → error sound + vibration, `say` (step does not advance)
 *   reclue  → repeat the current clue after `say`
 *   done    → { extra?: [html lines for the badge screen] }  (10th correct tap)
 */
import critters from './critters.js';
import power from './power-outage.js';
import highlow from './high-low.js';
import loop from './great-loop.js';
import memory from './memory.js';

export const GAMES = [critters, power, highlow, loop, memory];
export const STEPS = 10;

export const gameById = (id) => GAMES.find((g) => g.id === id);
