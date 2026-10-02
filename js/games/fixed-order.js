/**
 * Shared engine for the four FIXED-ORDER games (Critters, Power Outage,
 * High and Low, Great Loop). The 10-step order and clues come from
 * park.games[gameId] in js/data/playgrounds.js; a step without `clue`
 * gets one from the game's clueTemplate(location, stepIndex).
 */
export const STEPS = 10;

export function stepsFor(park, gameId) {
  const steps = park.games?.[gameId];
  if (!steps || steps.length !== STEPS) throw new Error(`Playground ${park.id} needs 10 steps for "${gameId}"`);
  return steps;
}

export function fixedOrderGame(cfg) {
  return {
    ...cfg,

    start(park, ctx) {
      stepsFor(park, cfg.id); // validate data early
      return { step: 0, startedAt: ctx.now(), wrong: 0, ...(cfg.extraState?.(ctx) || {}) };
    },

    expected(s, park) {
      return stepsFor(park, cfg.id)[Math.min(s.step, STEPS - 1)].loc;
    },

    clue(s, park) {
      const step = stepsFor(park, cfg.id)[Math.min(s.step, STEPS - 1)];
      return step.clue || cfg.clueTemplate(park.locations[step.loc], s.step, step);
    },

    tap(s, loc, park, ctx) {
      const want = this.expected(s, park);
      if (loc !== want) {
        s.wrong++;
        return { result: 'wrong', say: cfg.wrongSay || 'Not this one. Listen to the clue again!' };
      }
      const i = s.step;
      s.step++;
      const out = cfg.onCorrect?.(s, i, park, ctx) || {};
      if (s.step >= STEPS) return { result: 'correct', ...out, done: out.done || {} };
      return { result: 'correct', ...out };
    },
  };
}
