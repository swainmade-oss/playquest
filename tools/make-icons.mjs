// Renders icons/icon.svg to the PNG sizes the manifest needs.
import fs from 'node:fs';
import { launch } from './browser.mjs';

const svg = fs.readFileSync(new URL('../icons/icon.svg', import.meta.url), 'utf8');
const browser = await launch();
const page = await browser.newPage();
for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.12]]) {
  await page.setViewportSize({ width: size, height: size });
  const inner = size * (1 - pad * 2);
  await page.setContent(`<html><body style="margin:0;background:${pad ? '#7FD3FF' : 'transparent'};display:grid;place-items:center;height:100vh">
    <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  await page.screenshot({ path: new URL(`../icons/${name}`, import.meta.url).pathname, omitBackground: !pad });
  console.log('wrote', name);
}
await browser.close();
