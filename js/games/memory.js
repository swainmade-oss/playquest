/**
 * 5. MEMORY MODE — Memory, no time limit.
 * At game start each tag is secretly given a number 1–10. Find them in order
 * 1 → 10. Tapping a wrong tag reveals its number as a hint for later.
 */
import { shuffle } from '../core/util.js';
import { LOC_CODES } from '../data/playgrounds.js';

const STEPS = 10;
export const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

export default {
  id: 'memory',
  name: 'Memory Mode',
  short: 'Memory Match',
  icon: '🃏',
  color: '#9B5DE5', color2: '#EBDDFB', ink: '#45207A',
  badge: { name: 'Memory Master', icon: '🧠' },
  rule: 'Memory',
  timeLabel: 'No time limit',
  how: 'Every tag has a secret number. Find them in order, 1 to 10. A wrong tag tells you its number, so remember it!',
  intro: 'Memory Mode! Every spot has a secret number. Find them all, from one to ten!',

  start(park, ctx) {
    const nums = shuffle(LOC_CODES.map((_, i) => i + 1));
    const assign = Object.fromEntries(LOC_CODES.map((loc, i) => [loc, nums[i]]));
    return { step: 0, startedAt: ctx.now(), assign, revealed: {}, wrong: 0 };
  },

  expected(s) {
    const n = Math.min(s.step, STEPS - 1) + 1;
    return Object.keys(s.assign).find((loc) => s.assign[loc] === n);
  },

  clue(s) {
    const n = s.step + 1;
    return n === 1 ? 'Find secret number one! Tap any tag to start searching.' : `Now find secret number ${NUMBER_WORDS[Math.min(n, 10)]}!`;
  },

  tap(s, loc) {
    const n = s.assign[loc];
    if (loc === this.expected(s)) {
      s.step++;
      s.revealed[loc] = true;
      const out = { result: 'correct', say: `Yes! That’s number ${NUMBER_WORDS[n]}!`, toast: `#${n}`, flip: loc };
      if (s.step >= STEPS) out.done = {};
      return out;
    }
    s.wrong++;
    if (n <= s.step) return { result: 'wrong', say: 'You already found that one!', reclue: true, flip: loc };
    s.revealed[loc] = true;
    return { result: 'wrong', kind: 'hint', say: `Ooh! This one is number ${NUMBER_WORDS[n]}. Remember it!`, toast: `#${n}`, reclue: true, flip: loc };
  },
};
