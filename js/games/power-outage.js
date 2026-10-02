/**
 * 2. POWER OUTAGE — Timed, 30 seconds per step, fixed order.
 * Reach each tag before its timer runs out, or that step resets (timer restarts).
 */
import { fixedOrderGame, STEPS } from './fixed-order.js';

export const STEP_MS = 30000;

export default fixedOrderGame({
  id: 'power',
  name: 'Power Outage',
  icon: '🔌',
  color: '#F5A300',
  badge: { name: 'Power Restorer', icon: '⚡' },
  rule: 'Timed',
  timeLabel: '30 seconds per step',
  how: 'The playground lost power! Reach each power station tag before the 30 second timer runs out.',

  clueTemplate: (loc, i) => `Power station ${i + 1}! Run to ${loc.hint}!`,
  wrongSay: 'Wrong power station! Keep going!',
  extraState: (ctx) => ({ stepStartedAt: ctx.now(), resets: 0 }),

  onCorrect(s, i, park, ctx) {
    s.stepStartedAt = ctx.now();
    return { say: 'Power restored!', toast: `💡 Power station ${i + 1} is back on!` };
  },

  tick(s, park, ctx) {
    if (s.step >= STEPS) return null;
    if (ctx.now() - s.stepStartedAt >= STEP_MS) {
      s.stepStartedAt = ctx.now();
      s.resets++;
      return { result: 'wrong', say: 'Oh no, the power went out! This step starts over.', toast: '🔌 Power out! Step reset', reclue: true };
    }
    return null;
  },

  view(s) {
    const bulbs = Array.from({ length: STEPS }, (_, i) => `<span class="bulb ${i < s.step ? 'on' : i === s.step ? 'now' : ''}">💡</span>`).join('');
    return `
      <div class="visual power-visual">
        <div class="step-timer"><div class="step-timer-fill" data-live="bar"></div><span class="step-timer-txt" data-live="secs">30</span></div>
        <div class="visual-label">⏱️ seconds to reach this tag</div>
      </div>
      <div class="bulbs">${bulbs}</div>`;
  },

  live(s, park, ctx) {
    const left = Math.max(0, STEP_MS - (ctx.now() - s.stepStartedAt));
    return {
      bar: { style: { width: (left / STEP_MS) * 100 + '%' }, cls: left < 10000 ? 'low' : '' },
      secs: { text: String(Math.ceil(left / 1000)) },
    };
  },
});
