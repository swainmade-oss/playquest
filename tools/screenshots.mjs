/**
 * Smoke test + screenshots (390x844).
 *   python3 -m http.server 8080      (in another terminal)
 *   npm run screenshots               (BASE_URL=http://localhost:8080/ by default)
 * TAG_BASE_URL (optional) sets the Grown-ups "Tag base URL" so the tag table and
 * tag-links-print.pdf show the real hosted links, e.g.
 *   TAG_BASE_URL=https://swainmade-oss.github.io/playquest/ npm run screenshots
 * Plays through all five games with the test controls and the tag-link flow,
 * asserting the spec rules along the way, and saves PNGs + a print PDF to screenshots/.
 */
import { launch } from './browser.mjs';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8080/';
const TAG_BASE = process.env.TAG_BASE_URL || '';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
  geolocation: { latitude: 41.8823, longitude: -87.6272 }, // ~60 m from sample playground #123
  permissions: ['geolocation'],
});
const page = await context.newPage();
page.on('dialog', (d) => d.accept());
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const wait = (ms) => page.waitForTimeout(ms);
const shot = async (name, keepScroll = false) => {
  if (!keepScroll) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: OUT + name }); console.log('📸', name);
};
const assert = (c, msg) => { if (!c) throw new Error('ASSERT: ' + msg); console.log('✅', msg); };
const active = (park = '123') => page.evaluate((p) => JSON.parse(localStorage.getItem('playquest.v1')).progress[p]?.active, park);
const stats = (park, game) => page.evaluate(([p, g]) => JSON.parse(localStorage.getItem('playquest.v1')).progress[p]?.games?.[g], [park, game]);
const expected = () => page.evaluate(async () => {
  const { gameById } = await import('./js/games/index.js');
  const st = JSON.parse(localStorage.getItem('playquest.v1'));
  const a = st.progress[st.lastParkId].active;
  const { PLAYGROUNDS } = await import('./js/data/playgrounds.js');
  return gameById(a.gameId).expected(a.state, PLAYGROUNDS.find((p) => p.id === st.lastParkId));
});
// Shift a saved game's clocks into the past (fake a realistic elapsed time), then reload to resume it.
const backdate = async (ms, extra = {}) => {
  await page.evaluate(([ms, extra]) => {
    const st = JSON.parse(localStorage.getItem('playquest.v1'));
    const a = st.progress[st.lastParkId].active.state;
    a.startedAt -= ms;
    for (const [k, v] of Object.entries(extra)) a[k] = Date.now() - v;
    localStorage.setItem('playquest.v1', JSON.stringify(st));
  }, [ms, extra]);
  await page.reload(); await page.waitForSelector('#step-num'); await wait(400);
};
const correct = async (n = 1) => { for (let i = 0; i < n; i++) { await page.click('[data-sim="correct"]'); await wait(150); } };
const wrong = async () => { await page.click('[data-sim="wrong"]'); await wait(200); };
const stepNum = async () => Number(await page.textContent('#step-num'));
const hideToasts = () => page.addStyleTag({ content: '.toast{display:none!important}' });
const startGame = async (id) => { await page.click(`[data-game="${id}"]`); await page.click('[data-start]'); await page.waitForSelector('#step-num'); };

// ---- 1. Start screen: nearest playground suggested
await page.goto(BASE);
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('playquest.v1', JSON.stringify({ settings: { voice: false } })); });
if (TAG_BASE) await page.evaluate((b) => localStorage.setItem('playquest.v1', JSON.stringify({ settings: { voice: false, baseUrl: b } })), TAG_BASE);
await page.goto(BASE);
await page.waitForSelector('.geo-card.good');
assert((await page.textContent('.park-card.selected .park-name')) === 'Sunny Meadow Park', 'nearest playground (#123) auto-selected via geolocation');
assert((await page.$$('.game-row')).length === 5, 'five games listed');
await wait(500);
await shot('01-start-screen.png');

// ---- 2. Critters: game screen mid-game
await startGame('critters');
await correct(3);
assert(await stepNum() === 4, 'correct taps advance the step (Step 4 of 10)');
await wrong();
assert(await stepNum() === 4, 'wrong tap does not advance');
// Tag-link flow (what an iPhone does): open ?park=123&loc=<expected> in a fresh page load
const loc = await expected();
await page.goto(`${BASE}?park=123&loc=${loc}`);
await page.waitForSelector('#step-num');
assert(await stepNum() === 5, `tag link ?park=123&loc=${loc} resumed the saved game and counted the tap`);
assert(!(await page.evaluate(() => location.search)), 'link params removed from the address bar');
// Close + reopen app → resumes (and fake ~4 min of play for a realistic clock)
await backdate(4 * 60000 + 12000);
await page.goto(BASE);
await page.waitForSelector('#step-num');
assert(await stepNum() === 5, 'reopening the app resumes the game in progress');
await wait(300); await hideToasts();
await shot('02-game-screen.png');

// ---- 3. Pocket mode
await page.click('[data-pocket]');
await page.waitForSelector('.pocket-card');
assert(!(await page.$('.clue-text')), 'Pocket Mode hides the clue text');
await wait(400);
await shot('03-pocket-mode.png');
await page.click('[data-pocket]');

// ---- 5. Finish critters → badge screen
await backdate(3 * 60000 + 35000); // → total ≈ 7:47
await correct(6);
await page.waitForSelector('.badge-screen');
assert((await page.textContent('.badge-screen h2')) === 'Critter Rescuer', 'badge screen after the 10th correct tap');
const cs = await stats('123', 'critters');
assert(cs.won && cs.bestMs > 0, 'badge + best time stored for game/playground');
assert(!(await active()), 'active game cleared after winning');
await wait(3000);
await shot('05-badge-screen.png');
await page.click('[data-home]');

// ---- 4. Memory Mode hint
await startGame('memory');
await correct(2);
await backdate(2 * 60000 + 48000);
await wrong(); await wrong(); await wrong();
const hints = await page.$$('.mcard.hint');
assert(hints.length === 3, 'Memory Mode: wrong tags reveal their numbers as hints');
assert(await stepNum() === 3, 'Memory Mode: still looking for #3');
await wait(300); await hideToasts();
await shot('04-memory-mode-hint.png');
await page.click('[data-quit]');

// ---- Power Outage: 30 s per step, step resets
await startGame('power');
await correct(2);
await backdate(65000, { stepStartedAt: 12000 }); // 18 s left on this step
await wait(200); await hideToasts();
await shot('06-power-outage.png');
await page.evaluate(() => {
  const st = JSON.parse(localStorage.getItem('playquest.v1'));
  st.progress['123'].active.state.stepStartedAt = Date.now() - 31000;
  localStorage.setItem('playquest.v1', JSON.stringify(st));
});
await page.reload(); await page.waitForSelector('#step-num'); await wait(600);
let a = await active();
assert(a.state.resets === 1 && a.state.step === 2, 'Power Outage: timer ran out → step reset (not advanced)');
await page.click('[data-quit]');

// ---- High and Low: out-of-order tap doesn't count
await startGame('highlow');
await correct(4); await backdate(2 * 60000 + 5000); await wrong();
assert(await stepNum() === 5, 'High and Low: out-of-order tap does not count');
await wait(300); await hideToasts();
await shot('07-high-and-low.png');
await page.click('[data-quit]');

// ---- Loop
await startGame('loop');
await correct(6); await backdate(3 * 60000 + 20000, { lastTapAt: 9000 });
await wait(300); await hideToasts();
await shot('08-great-loop.png');
await correct(4);
await page.waitForSelector('.badge-screen');
assert((await page.textContent('.badge-screen h2')) === 'Loop Champion', 'Loop Champion badge');
await page.click('[data-home]');

// ---- Template clues on playground 456 + tag from another playground when idle
await page.goto(`${BASE}?park=456&loc=LOC07`);
await page.waitForSelector('.park-card.selected');
assert((await page.textContent('.park-card.selected .park-name')).includes('Rocket Ridge'), 'tag link from another playground selects it on the Start screen');
await startGame('critters');
assert((await page.textContent('.clue-text')).includes('is hiding near the spinner'), 'auto-generated clue from location hint (#456)');
await page.click('[data-quit]');

// ---- Grown-ups page: tag links + reset per playground
await page.click('[data-go="parent"]');
const q = await page.textContent('.gate-q');
const [x, y] = q.match(/\d+/g).map(Number);
await page.fill('.gate-in', String(x * y));
await page.click('[data-check]');
await page.waitForSelector('.payloads');
assert((await page.$$('.payloads tbody tr')).length === 30, 'tag link table lists 10 tags × 3 playgrounds');
assert((await page.textContent('.payloads')).includes('?park=123&loc=LOC04'), 'tag link format ?park=123&loc=LOC04');
if (TAG_BASE) assert((await page.textContent('.payloads')).includes(`${TAG_BASE}?park=123&loc=LOC04`), `tag links use ${TAG_BASE}`);
await page.evaluate(() => document.querySelector('.print-area').scrollIntoView());
await wait(300);
await shot('09-grown-ups-tag-links.png', true);
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT + 'tag-links-print.pdf', format: 'Letter', margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
console.log('🖨️  tag-links-print.pdf');
await page.emulateMedia({ media: 'screen' });
await page.click('[data-resetpark="123"]');
await wait(300);
assert(!(await stats('123', 'critters')), 'Reset this playground clears its badges/best times');

// ---- Location denied → manual list / ID entry
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
await p2.goto(BASE);
await p2.waitForSelector('.park-card');
await p2.waitForTimeout(1200);
assert(!(await p2.$('.park-card.selected')), 'no location → nothing auto-selected, manual list shown');
await p2.fill('#park-id', '789');
await p2.click('.id-form button');
assert((await p2.textContent('.park-card.selected .park-name')).includes('Pirate Cove'), 'typing playground ID 789 selects it');

assert(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker registered (PWA)');
await browser.close();
if (errors.length) { console.log('⚠️ Console errors:\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('🎉 No console errors');
