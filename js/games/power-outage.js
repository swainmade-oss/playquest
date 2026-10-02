/**
 * 2. POWER OUTAGE — Timed, 30 seconds per step, fixed order.
 * Reach each tag before its timer runs out, or that step resets (timer restarts).
 */
import { fixedOrderGame, STEPS } from './fixed-order.js';

export const STEP_MS = 30000;

export default fixedOrderGame({
  id: 'power',
  name: 'Power Outage',
  short: 'Power Outage',
  icon: '⚡',
  color: '#FFC93C', color2: '#2E2F7A', ink: '#1B1C4F', dark: true,
  badge: { name: 'Power Restorer', icon: '⚡' },
  rule: 'Timed',
  timeLabel: '30 seconds per step',
  how: 'The playground lost power! Reach each power station tag before the 30 second timer runs out.',
  intro: 'Power Outage! The lights went out! Run to each power station before the battery runs out!',

  clueTemplate: (loc, i) => `Power station ${i + 1}! Run to ${loc.hint}!`,
  wrongSay: 'Wrong power station! Keep going!',
  extraState: (ctx) => ({ stepStartedAt: ctx.now(), resets: 0 }),

  onCorrect(s, i, park, ctx) {
    s.stepStartedAt = ctx.now();
    return { say: 'Power restored!', toast: '💡 Power on!' };
  },

  tick(s, park, ctx) {
    if (s.step >= STEPS) return null;
    if (ctx.now() - s.stepStartedAt >= STEP_MS) {
      s.stepStartedAt = ctx.now();
      s.resets++;
      return { result: 'wrong', kind: 'timeout', say: 'Oh no! The battery ran out. Let’s try that one again!', toast: '🔋 Recharged! Try again', reclue: true };
    }
    return null;
  },
});
