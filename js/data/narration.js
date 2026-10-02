/**
 * NARRATION — every fixed line Pip says. Pre-recorded voice clips are made for
 * all of these (plus every clue in playgrounds.js) by tools/make-voice.py, via
 * tools/voice-lines.mjs. Anything not recorded falls back to text-to-speech.
 * Change a line → re-run `npm run voice` to re-record it.
 */
import { NUMBER_WORDS } from '../games/memory.js';

export const L = {
  hello: 'Yay! Let’s play!',
  welcomeBack: 'Welcome back! Let’s keep going!',
  where: 'Where are we playing? Let me look!',
  isThis: (park) => `Is this ${park.name}?`,
  yesPark: (park) => `${park.name}! Hooray!`,
  pickPark: 'Which playground are we at? Tap one!',
  parkName: (park) => `${park.name}.`,
  spotName: (loc) => `${loc.name}!`,
  typeNumber: 'Type the playground number.',
  unknownNumber: 'Hmm, I don’t know that one. Try again!',
  pickAdventure: 'Pick an adventure!',
  tagHello: 'You found a tag! Now pick an adventure!',
  tapGo: 'Tap the big play button to start!',
  keepGoing: 'Tap play to keep going!',
  ready: 'Ready?',
  count: ['Three!', 'Two!', 'One!', 'Go!'],
  wrong: ['Oops! Not this one. You can do it!', 'Hmm, not quite! Try another spot!', 'So close! Let’s listen again.'],
  streak: { 3: 'Three in a row! You’re on fire!', 5: 'Five in a row! Super star!', 8: 'Eight in a row! Wow wow wow!' },
  hurry: 'Hurry! Ten seconds left!',
  nudge: 'Keep moving! Don’t stop!',
  win: (game) => `Hooray! You did it! You earned the ${game.badge.name} badge!`,
  newBest: 'That’s your best time ever!',
  again: 'Want to play again?',
  shelf: 'Here are your stickers! Play every adventure to collect them all!',
  shelfEarned: (game) => `${game.badge.name}! You earned this one!`,
  shelfLocked: (game) => `Play ${game.name} to win this sticker!`,
  allBadges: 'You collected every sticker! You’re a PlayQuest champion!',
  pocketOn: 'Pocket mode! Put the phone away and listen for my clues.',
  pocketOff: 'Pocket mode off!',
  grownups: 'That part is for grown-ups!',
  gateWrong: 'Oops! Ask a grown-up for help.',
  unknownTag: 'Hmm, I don’t know that tag.',
  memoryFind: (n) => `Find number ${NUMBER_WORDS[n]}!`,
  voiceTest: 'Hi! I’m Pip, your PlayQuest guide!',
  musicOn: 'Music on!',
};
