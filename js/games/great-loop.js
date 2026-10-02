/**
 * 4. THE GREAT PLAYGROUND LOOP — Flow, no time limit, fixed order.
 * One continuous lap of the playground, meant to be walked without stopping.
 * The racetrack view nudges "keep moving!" after NUDGE_MS without a tag.
 */
import { fixedOrderGame, STEPS } from './fixed-order.js';

export const NUDGE_MS = 45000; // after this long without a tag, nudge "keep moving!"

export default fixedOrderGame({
  id: 'loop',
  name: 'The Great Playground Loop',
  short: 'The Big Loop',
  icon: '🏁',
  color: '#FF6B4A', color2: '#FFE0D6', ink: '#7A2A16',
  badge: { name: 'Loop Champion', icon: '🏅' },
  rule: 'Flow',
  timeLabel: 'No time limit',
  how: 'Walk one big loop around the playground, tag to tag, without stopping!',
  intro: 'The Great Playground Loop! Zoom around one big lap of the playground. Keep moving, don’t stop!',

  clueTemplate: (loc, i) => (i === 0 ? `Start your loop at ${loc.hint}!` : `Keep walking! Next stop, ${loc.hint}.`),
  wrongSay: 'Not the next stop. Keep flowing!',
  extraState: (ctx) => ({ lastTapAt: ctx.now(), maxGap: 0 }),

  onCorrect(s, i, park, ctx) {
    const now = ctx.now();
    if (i > 0) s.maxGap = Math.max(s.maxGap, now - s.lastTapAt); // gap between stops (not before the first)
    s.lastTapAt = now;
    const out = { say: i === 0 ? 'Loop started! Go go go!' : 'Keep going!', toast: '🏁' };
    if (s.step >= STEPS) out.done = { extra: [s.maxGap < NUDGE_MS ? '🌊 Non-stop loop!' : `Longest stop: ${Math.round(s.maxGap / 1000)}s`] };
    return out;
  },
});
