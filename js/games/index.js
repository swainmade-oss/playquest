/**
 * GAME REGISTRY — the five PlayQuest games (all use the same ten tags).
 *
 * Games are pure RULES (no DOM). The presentation lives in js/ui/views.js and
 * js/screens/play.js; the session plumbing (saving, streaks, wins) in
 * js/core/session.js.
 *
 *   id, name, short, icon       names (full name is spoken, short is shown)
 *   color, color2, ink, dark    color theme for the island, game screen and badge
 *   badge: { name, icon }       earned on completion (1 per game per playground)
 *   rule, timeLabel, how, intro rule type / time limit / explanation / spoken intro
 *   start(park, ctx) -> state   JSON state; MUST contain `step` (0..10 correct taps)
 *                               and `startedAt` (ms). Saved after every move, so use
 *                               timestamps, never setInterval, for timers.
 *   expected(state, park) -> 'LOCxx'   correct tag for the current step
 *   clue(state, park, ctx) -> string   clue for the current step (spoken + shown)
 *   tap(state, loc, park, ctx) -> Outcome
 *   tick?(state, park, ctx) -> Outcome|null   ~4×/sec (timers)
 *
 * Outcome: { result: 'correct'|'wrong', say?, toast?, reclue?, done?, kind?, reveal?, flip? }
 *   correct → success sound + short vibration, `say`, then the next clue
 *   wrong   → gentle "uh-oh" + vibration, `say` (step does not advance)
 *   reclue  → repeat the current clue after `say`
 *   done    → { extra?: [lines for the badge screen] }  (10th correct tap)
 */
import critters from './critters.js';
import power from './power-outage.js';
import highlow from './high-low.js';
import loop from './great-loop.js';
import memory from './memory.js';

export const GAMES = [critters, power, highlow, loop, memory];
export const STEPS = 10;

export const gameById = (id) => GAMES.find((g) => g.id === id);
