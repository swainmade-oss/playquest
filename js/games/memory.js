/**
 * 5. MEMORY MODE — Memory, no time limit.
 * At game start each tag is secretly given a number 1–10. Find them in order
 * 1 → 10. Tapping a wrong tag reveals its number as a hint for later.
 */
import { shuffle } from '../core/util.js';
import { iconHTML } from '../core/icons.js';
import { LOC_CODES } from '../data/playgrounds.js';

const STEPS = 10;

export default {
  id: 'memory',
  name: 'Memory Mode',
  icon: '🃏',
  color: '#9B5DE5',
  badge: { name: 'Memory Master', icon: '🧠' },
  rule: 'Memory',
  timeLabel: 'No time limit',
  how: 'Every tag has a secret number. Find them in order, 1 to 10. A wrong tag tells you its number, so remember it!',

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
    return n === 1 ? 'Find secret number 1! Tap any tag to start searching.' : `Now find secret number ${n}!`;
  },

  tap(s, loc, park) {
    const n = s.assign[loc];
    if (loc === this.expected(s)) {
      s.step++;
      s.revealed[loc] = true;
      const out = { result: 'correct', say: `Yes! That's number ${n}!`, toast: `🎉 Number ${n}!` };
      if (s.step >= STEPS) out.done = {};
      return out;
    }
    s.wrong++;
    const name = park.locations[loc].name;
    if (n <= s.step) return { result: 'wrong', say: `You already found number ${n}. Find number ${s.step + 1}!` };
    s.revealed[loc] = true;
    return { result: 'wrong', say: `This is number ${n}, at the ${name}. Remember it for later!`, toast: `🔎 ${name} is number <b>${n}</b>` };
  },

  view(s, park) {
    const cards = LOC_CODES.map((loc) => {
      const n = s.assign[loc];
      const found = s.revealed[loc] && n <= s.step;
      const hint = s.revealed[loc] && !found;
      const l = park.locations[loc];
      return `<div class="mcard ${found ? 'found' : hint ? 'hint' : ''}">
        <span class="mcard-ico">${iconHTML(l.icon)}</span>
        <span class="mcard-num">${found || hint ? n : '?'}</span>
        <small>${l.name}</small></div>`;
    }).join('');
    return `
      <div class="visual mem-visual"><div class="mem-target">Find <b>#${Math.min(s.step + 1, STEPS)}</b></div></div>
      <div class="mem-grid">${cards}</div>`;
  },
};
