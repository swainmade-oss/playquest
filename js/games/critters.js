/**
 * 1. RESCUE THE PLAYGROUND CRITTERS — Explore, no time limit, fixed order.
 * Each tag reveals the hiding critter; the next clue says where the next one hides.
 */
import { fixedOrderGame, STEPS } from './fixed-order.js';

// Default critters, one per step (a step in playgrounds.js may override with `critter: ['🐰', 'Bunny']`).
export const CRITTERS = [
  ['🐰', 'Bunny'], ['🐿️', 'Squirrel'], ['🐢', 'Turtle'], ['🦔', 'Hedgehog'], ['🐸', 'Frog'],
  ['🦉', 'Owl'], ['🐞', 'Ladybug'], ['🦊', 'Fox'], ['🐌', 'Snail'], ['🐥', 'Chick'],
];

const critterAt = (park, i) => park.games.critters[i].critter || CRITTERS[i];

export default fixedOrderGame({
  id: 'critters',
  name: 'Rescue the Playground Critters',
  icon: '🐰',
  color: '#FF8C42',
  badge: { name: 'Critter Rescuer', icon: '🐾' },
  rule: 'Explore',
  timeLabel: 'No time limit',
  how: 'Ten critters are hiding! Listen to each clue, find the tag, and rescue them all.',

  clueTemplate: (loc, i) => `${CRITTERS[i][1]} is hiding near ${loc.hint}. Go find it!`,
  wrongSay: 'No critter here. Listen to the clue again!',

  onCorrect(s, i, park) {
    const [emoji, name] = critterAt(park, i);
    return { say: `You rescued ${name}!`, toast: `${emoji} You rescued ${name}!` };
  },

  view(s, park) {
    const slots = Array.from({ length: STEPS }, (_, i) => {
      const [emoji] = critterAt(park, i);
      return `<span class="slot ${i < s.step ? 'got pop' : i === s.step ? 'now' : ''}">${i < s.step ? emoji : i === s.step ? '❔' : ''}</span>`;
    }).join('');
    return `
      <div class="visual critter-visual">
        <div class="bush bounce">🌳<span class="peek">👀</span></div>
        <div class="visual-label">Who's hiding?</div>
      </div>
      <div class="slots">${slots}</div>`;
  },
});
