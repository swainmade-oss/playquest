/**
 * 1. RESCUE THE PLAYGROUND CRITTERS — Explore, no time limit, fixed order.
 * Each tag reveals the hiding critter; the next clue says where the next one hides.
 */
import { fixedOrderGame } from './fixed-order.js';

// Default critters, one per step (a step in playgrounds.js may override with `critter: ['🐰', 'Bunny']`).
export const CRITTERS = [
  ['🐰', 'Bunny'], ['🐿️', 'Squirrel'], ['🐢', 'Turtle'], ['🦔', 'Hedgehog'], ['🐸', 'Frog'],
  ['🦉', 'Owl'], ['🐞', 'Ladybug'], ['🦊', 'Fox'], ['🐌', 'Snail'], ['🐥', 'Chick'],
];

export const critterAt = (park, i) => park.games.critters[i].critter || CRITTERS[i];

export default fixedOrderGame({
  id: 'critters',
  name: 'Rescue the Playground Critters',
  short: 'Critter Rescue',
  icon: '🐰',
  color: '#20B486', color2: '#C8F5E3', ink: '#0E5E46',
  badge: { name: 'Critter Rescuer', icon: '🐾' },
  rule: 'Explore',
  timeLabel: 'No time limit',
  how: 'Ten critters are hiding! Listen to each clue, find the tag, and rescue them all.',
  intro: 'Rescue the Playground Critters! Ten little critters are hiding. Can you find them all?',

  clueTemplate: (loc, i) => `${CRITTERS[i][1]} is hiding near ${loc.hint}. Go find it!`,
  wrongSay: 'No critter here. Listen to the clue again!',

  onCorrect(s, i, park) {
    const [emoji, name] = critterAt(park, i);
    return { say: `You rescued ${name}!`, toast: `${emoji} ${name}!`, reveal: emoji };
  },
});
