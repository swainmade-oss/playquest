/**
 * 3. HIGH AND LOW CHALLENGE — Sequence, fixed order, exact order required.
 * A tap out of order does not count. Clues alternate high places and low places.
 */
import { fixedOrderGame, STEPS, stepsFor } from './fixed-order.js';

export default fixedOrderGame({
  id: 'highlow',
  name: 'High and Low Challenge',
  icon: '↕️',
  color: '#3DA5FF',
  badge: { name: 'High and Low Master', icon: '⛰️' },
  rule: 'Sequence',
  timeLabel: 'No time limit',
  how: 'Go high, then go low! Tap the tags in the exact order. Out-of-order taps do not count.',

  clueTemplate: (loc) => loc.level === 'high' ? `Go HIGH! Head to ${loc.hint}!` : `Go LOW! Head to ${loc.hint}!`,
  wrongSay: "That one doesn't count. Go in order!",

  onCorrect() {
    return { say: 'Yes!', toast: '✅ In order!' };
  },

  view(s, park) {
    const steps = stepsFor(park, 'highlow');
    const loc = park.locations[steps[Math.min(s.step, STEPS - 1)].loc];
    const high = loc.level === 'high';
    const seq = steps.map((st, i) => {
      const l = park.locations[st.loc];
      return `<span class="seq ${l.level} ${i < s.step ? 'done' : i === s.step ? 'now' : ''}">${l.level === 'high' ? '▲' : '▼'}</span>`;
    }).join('');
    return `
      <div class="visual hl-visual ${high ? 'high' : 'low'}">
        <div class="hl-arrow bounce">${high ? '⬆️' : '⬇️'}</div>
        <div class="hl-word">${high ? 'HIGH' : 'LOW'}</div>
      </div>
      <div class="seq-row">${seq}</div>`;
  },
});
