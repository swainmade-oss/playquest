// Renders every illustration (spots, game characters, badges) to screenshots/redesign/art-sheet.png
//   npm run serve   then   node tools/art-preview.mjs
import { launch } from './browser.mjs';
const BASE = process.env.BASE_URL || 'http://localhost:8080/';
const b = await launch(); const p = await b.newPage({ viewport: { width: 700, height: 900 } });
p.on('pageerror', (e) => { console.error('ERR', e.message); process.exitCode = 1; });
await p.goto(BASE + 'tools/art-preview.html'); await p.waitForTimeout(800);
await p.screenshot({ path: new URL('../screenshots/redesign/art-sheet.png', import.meta.url).pathname, fullPage: true });
console.log('📸 art-sheet.png'); await b.close();
