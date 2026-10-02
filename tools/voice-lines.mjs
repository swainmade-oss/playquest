// Collects EVERY line Pip can say (fixed narration + all clues/reactions for all
// playgrounds and games) → tools/voice-lines.json, for tools/make-voice.py.
//   node tools/voice-lines.mjs
import fs from 'node:fs';
import { L } from '../js/data/narration.js';
import { PLAYGROUNDS, LOC_CODES } from '../js/data/playgrounds.js';
import { GAMES } from '../js/games/index.js';
import { hashText } from '../js/core/textkey.js';

const lines = new Map();
const add = (t, why) => {
  if (!t) return;
  const h = hashText(t);
  if (!lines.has(h)) lines.set(h, { hash: h, text: String(t), why });
};

// fixed narration
for (const [k, v] of Object.entries(L)) {
  if (typeof v === 'string') add(v, k);
  else if (Array.isArray(v)) v.forEach((x) => add(x, k));
  else if (typeof v === 'object') Object.values(v).forEach((x) => add(x, k));
}
for (const p of PLAYGROUNDS) {
  add(L.isThis(p), 'isThis'); add(L.yesPark(p), 'yesPark'); add(L.parkName(p), 'parkName');
  for (const c of LOC_CODES) add(L.spotName(p.locations[c]), 'spotName');
}
for (const g of GAMES) {
  add(g.intro, 'intro'); add(L.win(g), 'win'); add(L.shelfEarned(g), 'shelfEarned'); add(L.shelfLocked(g), 'shelfLocked');
  add(g.badge.name + '!', 'badge'); add(g.wrongSay, 'wrongSay');
}
for (let d = 0; d <= 9; d++) add(String(d), 'digit');

// play every game at every playground (simulated) and record what is said
let clock = 1_000_000;
const ctx = (park) => ({ now: () => clock, park });
for (const park of PLAYGROUNDS) {
  for (const g of GAMES) {
    const s = g.start(park, ctx(park));
    for (let i = 0; i < 10; i++) {
      add(g.clue(s, park, ctx(park)), `clue:${park.id}:${g.id}`);
      const want = g.expected(s, park);
      // a wrong tap (memory: try every other tag to collect all hint lines)
      const wrongs = g.id === 'memory' ? LOC_CODES.filter((c) => c !== want) : [LOC_CODES.find((c) => c !== want)];
      for (const w of wrongs) add(g.tap(structuredClone(s), w, park, ctx(park))?.say, `wrong:${g.id}`);
      if (g.tick) { const t = structuredClone(s); t.stepStartedAt = clock - 31000; add(g.tick(t, park, ctx(park))?.say, `tick:${g.id}`); }
      clock += 5000;
      add(g.tap(s, want, park, ctx(park))?.say, `correct:${park.id}:${g.id}`);
    }
  }
}

const out = [...lines.values()];
fs.writeFileSync(new URL('./voice-lines.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`${out.length} unique lines → tools/voice-lines.json`);
