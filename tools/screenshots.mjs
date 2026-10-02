// End-to-end check + screenshots of the redesign (headless Chromium, 390×844).
//   npm run serve   (in another terminal)   then   npm run screenshots
// Plays all five games with the test controls, checks the rules, tag-link flows
// (shared chips ?park=123&loc=LOCxx count for the SELECTED playground), voice
// clip coverage and that there are no console errors.
// Env: BASE_URL (default http://localhost:8080/), TAG_BASE_URL (expected tag link base), VIDEO=1
import { launch } from './browser.mjs';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8080/';
const TAG_BASE = process.env.TAG_BASE_URL || 'https://swainmade-oss.github.io/playquest/';
const OUT = new URL('../screenshots/redesign/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const browser = await launch();
const errors = [];
const newCtx = (opts = {}) => browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  geolocation: { latitude: 41.8823, longitude: -87.6272 }, permissions: ['geolocation'], // ~70 m from #123
  ...opts,
});
const watch = (page, tag) => {
  page.on('pageerror', (e) => errors.push(`[${tag}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push(`[${tag}] ${m.text()}`); });
  page.on('dialog', (d) => d.accept());
};
const context = await newCtx();
await context.addInitScript(() => { // record every spoken line (kept across page loads)
  const log = JSON.parse(sessionStorage.getItem('vlog') || '[]'); const push = log.push.bind(log);
  log.push = (t) => { push(t); sessionStorage.setItem('vlog', JSON.stringify(log)); return log.length; };
  window.__voiceLog = log;
});
const page = await context.newPage();
watch(page, 'main');

const wait = (ms) => page.waitForTimeout(ms);
const tap = (sel, p = page) => p.click(sel, { force: true });
const shot = async (name, p = page) => { await p.screenshot({ path: OUT + name }); console.log('📸', name); };
const assert = (c, msg) => { if (!c) throw new Error('ASSERT: ' + msg); console.log('✅', msg); };
const data = (p = page) => p.evaluate(() => JSON.parse(localStorage.getItem('playquest.v1') || '{}'));
const active = async (park = '123', p = page) => (await data(p)).progress?.[park]?.active;
const stats = async (park, game, p = page) => (await data(p)).progress?.[park]?.games?.[game];
const stepNum = async (p = page) => Number(await p.textContent('[data-step]'));
const sim = (kind, p = page) => p.evaluate((k) => document.querySelector(`[data-sim="${k}"]`).click(), kind);
const correct = async (n = 1, gap = 350) => { for (let i = 0; i < n; i++) { await sim('correct'); await wait(gap); } };
// mutate the live game state (same object the game screen uses)
const patch = (fn, park = '123') => page.evaluate(async ([src, park]) => {
  const { store } = await import('./js/core/store.js');
  const s = store.data.progress[park].active.state;
  new Function('s', 'now', src)(s, Date.now());
  store.save();
}, [fn, park]);
const splashTap = async (p = page) => { await p.waitForSelector('[data-play]'); await wait(300); await tap('[data-play]', p); };
const toMap = async () => { await tap('[data-quit]'); await page.waitForSelector('.island'); await wait(300); };
const startGame = async (id) => {
  await tap(`.island[data-game="${id}"]`); await page.waitForSelector('.sheet-layer.open [data-start], .sheet-layer.open [data-new]');
  await wait(500); await tap('.sheet-layer [data-start], .sheet-layer [data-new]');
  await page.waitForSelector('[data-step]', { timeout: 10000 }); await wait(500);
};
const finishToWin = async () => { await page.waitForSelector('.win-badge', { timeout: 5000 }); };

// ---------------------------------------------------------------- 1. splash
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE);
await page.waitForSelector('[data-play]');
await wait(900);
await shot('01-splash.png');

// ---------------------------------------------------------------- 2. park confirm (geolocation)
await splashTap();
await page.waitForSelector('[data-yes]', { timeout: 8000 });
await wait(900);
assert((await page.textContent('.park-title')).includes('Sunny Meadow'), 'Pip found the nearest playground by location (#123)');
await shot('02-park-confirm.png');
await tap('[data-other]'); await page.waitForSelector('.park-pick'); await wait(700);
assert((await page.$$('.park-pick')).length === 3, '"pick another" shows all playgrounds as big bubbles');
await tap('[data-park="456"]'); await wait(500);
await shot('02b-park-pick.png');
await tap('[data-park="123"]'); await wait(200); await tap('[data-go]');

// ---------------------------------------------------------------- 3. game picker
await page.waitForSelector('.island'); await wait(1300);
assert((await page.$$('.island')).length === 5, 'five adventure islands');
await shot('03-game-picker.png');
await tap('.island[data-game="critters"]'); await page.waitForSelector('.sheet-layer.open'); await wait(900);
await shot('04-game-card.png');
await tap('.sheet-layer [data-start]');
await page.waitForSelector('.count-num'); await wait(1250);
await shot('05-countdown.png');

// ---------------------------------------------------------------- 4. critters
await page.waitForSelector('[data-step]', { timeout: 10000 }); await wait(600);
assert(await stepNum() === 1, 'game screen: step 1 of 10');
await correct(3);
assert(await stepNum() === 4, 'correct taps advance (step 4)');
await patch('s.startedAt -= 3*60000 + 12000');
await wait(1700);
await shot('06-game-critters.png');
await sim('wrong'); await wait(380);
assert(await stepNum() === 4, 'wrong tap does not advance');
await shot('07-wrong-tap.png');
await wait(1500);
// pocket mode
await tap('[data-pocket]'); await wait(500);
assert(!(await page.$('.find')), 'Pocket mode hides the picture + text');
await shot('08-pocket-mode.png');
await tap('[data-pocket]'); await wait(300);
// close + reopen the app → resumes
await page.reload(); await splashTap();
await page.waitForSelector('[data-step]');
assert(await stepNum() === 4, 'reopening the app resumes the game in progress');
await wait(400);
await correct(7, 300);
await finishToWin(); await wait(2600);
assert((await page.textContent('.win-name')).includes('Critter Rescuer'), 'win screen after the 10th correct tap: Critter Rescuer');
const cs = await stats('123', 'critters');
assert(cs.won && cs.bestMs > 0, 'badge + best time stored for game/playground');
assert(!(await active()), 'active game cleared after winning');
await shot('09-win.png');
await tap('[data-shelf]'); await page.waitForSelector('.sticker'); await wait(1300);
assert((await page.$$('.sticker.earned')).length === 1 && (await page.$$('.sticker.locked')).length === 4, 'sticker book: 1 earned, 4 locked silhouettes');
await shot('10-badge-shelf-1.png');
await tap('[data-back]'); await page.waitForSelector('.island'); await wait(400);

// ---------------------------------------------------------------- 5. power outage
await startGame('power');
await correct(2);
await wait(1500);
await patch('s.startedAt -= 65000; s.stepStartedAt = now - 21500');
await wait(900);
await shot('11-game-power-outage.png');
await patch('s.stepStartedAt = now - 30500');
await wait(900);
let a = await active();
assert(a.state.resets === 1 && a.state.step === 2, 'Power Outage: 30 s ran out → that step resets (not advanced)');
await wait(1200);
await correct(8, 300);
await finishToWin(); await wait(300);
assert((await page.textContent('.win-name')).includes('Power Restorer'), 'Power Restorer badge');
await tap('[data-home]'); await page.waitForSelector('.island'); await wait(300);

// ---------------------------------------------------------------- 6. high & low
await startGame('highlow');
await correct(4);
await patch('s.startedAt -= 2*60000');
await sim('wrong'); await wait(250);
assert(await stepNum() === 5, 'High and Low: out-of-order tap does not count');
await wait(1600);
await shot('12-game-high-low.png');
await correct(6, 300);
await finishToWin();
assert((await page.textContent('.win-name')).includes('High and Low Master'), 'High and Low Master badge');
await tap('[data-home]'); await page.waitForSelector('.island'); await wait(300);

// ---------------------------------------------------------------- 7. loop
await startGame('loop');
await correct(6);
await patch('s.startedAt -= 3*60000 + 20000; s.lastTapAt = now - 9000');
await wait(1500);
await shot('13-game-loop.png');
await correct(4, 300);
await finishToWin();
assert((await page.textContent('.win-name')).includes('Loop Champion'), 'Loop Champion badge');
await tap('[data-home]'); await page.waitForSelector('.island'); await wait(300);

// ---------------------------------------------------------------- 8. memory
await startGame('memory');
await correct(2);
await patch('s.startedAt -= 2*60000 + 48000');
await sim('wrong'); await wait(600); await sim('wrong'); await wait(600); await sim('wrong'); await wait(900);
assert((await page.$$('.mcard.hint')).length === 3, 'Memory Mode: wrong tags reveal their numbers as hints');
assert(await stepNum() === 3, 'Memory Mode: still looking for #3');
await shot('14-memory-wrong-tap-hint.png');
await wait(1700);
await shot('14b-game-memory.png');
await correct(8, 300);
await finishToWin();
assert((await page.textContent('.win-name')).includes('Memory Master'), 'Memory Master badge');
await tap('[data-shelf]'); await page.waitForSelector('.sticker'); await wait(1500);
assert((await page.$$('.sticker.earned')).length === 5, 'sticker book: all 5 badges earned at #123');
await shot('15-badge-shelf-full.png');
await tap('[data-tab="456"]'); await wait(800);
assert((await page.$$('.sticker.earned')).length === 0, 'badges are separate per playground (#456 has none)');
await tap('[data-back]'); await page.waitForSelector('.island'); await wait(300);

// ---------------------------------------------------------------- 9. shared tag links
// Kid is at #456 (selected) and starts Critters there. The shared chip says park=123.
await startGame('critters');
const want456 = await page.evaluate(async () => {
  const { gameById } = await import('./js/games/index.js'); const { PLAYGROUNDS } = await import('./js/data/playgrounds.js');
  const st = JSON.parse(localStorage.getItem('playquest.v1')); const a = st.progress['456'].active;
  return gameById(a.gameId).expected(a.state, PLAYGROUNDS.find((p) => p.id === '456'));
});
const before456 = (await active('456')).state.step;
await page.goto(`${BASE}?park=123&loc=${want456}`);           // what an iPhone does on a tag tap
await page.waitForSelector('[data-play]'); await wait(1000);
assert((await active('456')).state.step === before456 + 1, `shared chip ?park=123&loc=${want456} counted for the SELECTED playground #456 right on load`);
assert(!(await active('123')), '…and did not start anything at #123');
assert(!(await page.evaluate(() => location.search)), 'link params removed from the address bar');
await shot('16-tag-link-splash.png');
await splashTap(); await page.waitForSelector('[data-step]'); await wait(600);
assert(await stepNum() === 2, 'after "tap to play" the game shows the counted tap (step 2)');
// in-app tag tap (hash form, same tab) during the active game
const want2 = await page.evaluate(async () => {
  const { gameById } = await import('./js/games/index.js'); const { PLAYGROUNDS } = await import('./js/data/playgrounds.js');
  const st = JSON.parse(localStorage.getItem('playquest.v1')); const a = st.progress['456'].active;
  return gameById(a.gameId).expected(a.state, PLAYGROUNDS.find((p) => p.id === '456'));
});
await page.evaluate((l) => { location.hash = `park=123&loc=${l}`; }, want2); await wait(700);
assert(await stepNum() === 3, 'a tag tap while playing counts as the tap (step 3)');
await page.evaluate(async () => { const { store } = await import('./js/core/store.js'); store.clearActive('456'); });
// no game in progress → straight into the adventure picker for the selected park
await page.goto(`${BASE}?park=123&loc=LOC03`);
await splashTap(); await page.waitForSelector('.island'); await wait(900);
assert((await page.textContent('.park-chip-name')).includes('Rocket Ridge'), 'tag link with no game in progress → adventure picker for the selected playground');
await shot('17-tag-link-to-picker.png');

// ---------------------------------------------------------------- 10. grown-ups
await tap('[data-parent]'); await page.waitForSelector('[data-q]'); await wait(400);
await shot('18-parent-gate.png');
const [x, y] = (await page.textContent('[data-q]')).match(/\d+/g).map(Number);
for (const d of String(x * y)) await tap(`[data-k="${d}"]`);
await tap('[data-k="ok"]');
await page.waitForSelector('.payloads');
assert((await page.$$('.payloads tbody tr.tag-row')).length === 10, 'ONE shared set of 10 tag links on the grown-ups page');
await page.fill('[data-base]', TAG_BASE); await page.dispatchEvent('[data-base]', 'change'); await page.waitForSelector('.payloads'); await wait(200);
const tbl = await page.textContent('.payloads');
assert(tbl.includes(`${TAG_BASE}?park=123&loc=LOC01`) && tbl.includes(`${TAG_BASE}?park=123&loc=LOC10`), `tag links keep the exact format ${TAG_BASE}?park=123&loc=LOCxx`);
await page.evaluate(() => document.querySelector('.print-area').scrollIntoView()); await wait(300);
await shot('19-grown-ups-tags.png');
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: OUT + 'tag-links-print.pdf', format: 'Letter', margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' } });
await page.emulateMedia({ media: 'screen' });
await page.fill('[data-base]', ''); await page.dispatchEvent('[data-base]', 'change'); await wait(200);
await page.evaluate(() => window.scrollTo(0, 0)); await wait(200);
await shot('20-grown-ups-settings.png');
await tap('[data-resetpark="123"]'); await wait(300);
assert(!(await stats('123', 'critters')), 'Reset clears badges/best times for that playground');

// ---------------------------------------------------------------- 11. audio + voice
const audioOk = await page.evaluate(async () => {
  const m = await import('./js/core/audio.js');
  for (const n of m.SFX_NAMES) m.sfx(n);
  m.music.start('menu'); await new Promise((r) => setTimeout(r, 600)); m.music.stop();
  const ctx = m.audioCtx(); return { state: ctx.state, names: m.SFX_NAMES.length };
});
assert(audioOk.state === 'running' && audioOk.names >= 18, `Web Audio running, ${audioOk.names} synthesized effects + music played without errors`);
const vc = await page.evaluate(async () => {
  const v = await import('./js/core/voice.js');
  const log = [...new Set(window.__voiceLog)];
  return { spoken: log.length, missing: log.filter((t) => !v.hasClip(t)), info: v.voiceInfo() };
});
assert(vc.spoken > 40 && vc.missing.length === 0, `${vc.spoken} different lines spoken, all from recorded clips (${vc.info.clipVoice})`);

// ---------------------------------------------------------------- 12. fresh device, location off, tag link
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p2 = await ctx2.newPage(); watch(p2, 'fresh');
await p2.goto(`${BASE}?park=123&loc=LOC05`);
await splashTap(p2);
await p2.waitForSelector('[data-yes]', { timeout: 10000 });
assert((await p2.textContent('.park-title')).includes('Sunny Meadow'), 'brand-new phone, location off: tag park (#123) is suggested → "Is this your playground?"');
await tap('[data-yes]', p2); await p2.waitForSelector('.island', { timeout: 5000 });
assert(true, '👍 → adventure picker');
await ctx2.close();

assert(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())), 'service worker registered (PWA, offline)');
await context.close();

// ---------------------------------------------------------------- optional short video
if (process.env.VIDEO) {
  const vctx = await newCtx({ deviceScaleFactor: 1, recordVideo: { dir: OUT + 'video-tmp', size: { width: 390, height: 844 } } });
  const v = await vctx.newPage(); watch(v, 'video');
  await v.goto(BASE); await v.evaluate(() => localStorage.clear()); await v.goto(BASE);
  await v.waitForTimeout(1200); await tap('[data-play]', v);
  await v.waitForSelector('[data-yes]'); await v.waitForTimeout(1500); await tap('[data-yes]', v);
  await v.waitForSelector('.island'); await v.waitForTimeout(1800);
  await tap('.island[data-game="power"]', v); await v.waitForTimeout(2200); await tap('.sheet-layer [data-start]', v);
  await v.waitForSelector('[data-step]', { timeout: 10000 }); await v.waitForTimeout(2500);
  for (let i = 0; i < 3; i++) { await v.evaluate(() => document.querySelector('[data-sim="correct"]').click()); await v.waitForTimeout(1600); }
  await v.evaluate(() => document.querySelector('[data-sim="wrong"]').click()); await v.waitForTimeout(2000);
  for (let i = 0; i < 7; i++) { await v.evaluate(() => document.querySelector('[data-sim="correct"]').click()); await v.waitForTimeout(500); }
  await v.waitForTimeout(4500);
  const path = await v.video().path(); await vctx.close();
  fs.renameSync(path, OUT + 'playthrough.webm'); fs.rmSync(OUT + 'video-tmp', { recursive: true, force: true });
  console.log('🎬 playthrough.webm');
}

await browser.close();
if (errors.length) { console.log('⚠️ Console errors:\n' + errors.join('\n')); process.exitCode = 1; }
else console.log('🎉 No console errors');
