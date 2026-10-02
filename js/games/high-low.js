/**
 * 3. HIGH AND LOW CHALLENGE — Sequence, fixed order, exact order required.
 * A tap out of order does not count. Clues alternate high places and low places.
 */
import { fixedOrderGame } from './fixed-order.js';

export default fixedOrderGame({
  id: 'highlow',
  name: 'High and Low Challenge',
  short: 'High & Low',
  icon: '↕️',
  color: '#3D8BFF', color2: '#D4E6FF', ink: '#163E7A',
  badge: { name: 'High and Low Master', icon: '⛰️' },
  rule: 'Sequence',
  timeLabel: 'No time limit',
  how: 'Go high, then go low! Tap the tags in the exact order. Out-of-order taps do not count.',
  intro: 'High and Low Challenge! Go up high, then down low, in just the right order!',

  clueTemplate: (loc) => (loc.level === 'high' ? `Go HIGH! Head to ${loc.hint}!` : `Go LOW! Head to ${loc.hint}!`),
  wrongSay: 'Oops, wrong order! Listen again.',

  onCorrect(s, i, park) {
    return { say: 'Yes! Right in order!', toast: '✅' };
  },
});
