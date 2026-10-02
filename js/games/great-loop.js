/**
 * 4. THE GREAT PLAYGROUND LOOP — Flow, no time limit, fixed order.
 * One continuous lap of the playground, meant to be walked without stopping.
 * A "flow meter" shows time since the last tag and nudges "keep moving!".
 */
import { fixedOrderGame, STEPS, stepsFor } from './fixed-order.js';

const NUDGE_MS = 45000; // after this long without a tag, show "keep moving!"

export default fixedOrderGame({
  id: 'loop',
  name: 'The Great Playground Loop',
  icon: '🔄',
  color: '#06C28F',
  badge: { name: 'Loop Champion', icon: '🏅' },
  rule: 'Flow',
  timeLabel: 'No time limit',
  how: 'Walk one big loop around the playground, tag to tag, without stopping!',

  clueTemplate: (loc, i) => (i === 0 ? `Start your loop at ${loc.hint}!` : `Keep walking! Next stop, ${loc.hint}.`),
  wrongSay: 'Not the next stop. Keep flowing!',
  extraState: (ctx) => ({ lastTapAt: ctx.now(), maxGap: 0 }),

  onCorrect(s, i, park, ctx) {
    const now = ctx.now();
    if (i > 0) s.maxGap = Math.max(s.maxGap, now - s.lastTapAt); // gap between stops (not before the first)
    s.lastTapAt = now;
    const out = { say: i === 0 ? 'Loop started!' : 'Keep going!', toast: '🔄 Nice flow!' };
    if (s.step >= STEPS) out.done = { extra: [s.maxGap < NUDGE_MS ? '🌊 Non-stop loop!' : `Longest stop gap: ${Math.round(s.maxGap / 1000)}s`] };
    return out;
  },

  view(s, park, ctx) {
    const steps = stepsFor(park, 'loop');
    const stops = steps.map((st, i) => {
      const a = (i / STEPS) * 2 * Math.PI - Math.PI / 2;
      const x = 50 + 42 * Math.cos(a);
      const y = 50 + 42 * Math.sin(a);
      return `<span class="ring-stop ${i < s.step ? 'done' : i === s.step ? 'now' : ''}" style="left:${x}%;top:${y}%">${i + 1}</span>`;
    }).join('');
    return `
      <div class="visual loop-visual">
        <div class="ring">${stops}<div class="ring-center"><span class="walker">🚶</span><small data-live="flow">Keep moving!</small></div></div>
      </div>`;
  },

  live(s, park, ctx) {
    const gap = ctx.now() - s.lastTapAt;
    return { flow: { text: gap > NUDGE_MS ? '⚠️ Keep moving!' : '🌊 Flowing!', cls: gap > NUDGE_MS ? 'nudge' : '' } };
  },
});
