// Renders every synthesized sound effect (+ 12 s of the music loop) to WAV files
// using the app's own audio engine in an OfflineAudioContext, and prints levels.
//   npm run serve   then   node tools/render-sfx.mjs [outDir=/tmp/playquest-sfx]
import { launch } from './browser.mjs';
import fs from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:8080/';
const OUT = process.argv[2] || '/tmp/playquest-sfx';
fs.mkdirSync(OUT, { recursive: true });
const browser = await launch();
const page = await browser.newPage();
await page.goto(BASE);
const res = await page.evaluate(async () => {
  const m = await import('./js/core/audio.js');
  const out = [];
  for (const name of [...m.SFX_NAMES, 'music']) {
    const buf = await m.renderOffline(name, name === 'music' ? 12 : name === 'fanfare' ? 3.5 : 2);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, sum = 0, last = 0;
    for (let i = 0; i < L.length; i++) { const v = Math.max(Math.abs(L[i]), Math.abs(R[i])); peak = Math.max(peak, v); sum += L[i] * L[i]; if (v > 0.003) last = i; }
    // 16-bit stereo WAV
    const n = L.length, wav = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, s) => [...s].forEach((c, i) => wav.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); wav.setUint32(4, 36 + n * 4, true); w(8, 'WAVEfmt '); wav.setUint32(16, 16, true); wav.setUint16(20, 1, true);
    wav.setUint16(22, 2, true); wav.setUint32(24, 44100, true); wav.setUint32(28, 44100 * 4, true); wav.setUint16(32, 4, true); wav.setUint16(34, 16, true);
    w(36, 'data'); wav.setUint32(40, n * 4, true);
    for (let i = 0; i < n; i++) { wav.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); wav.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
    let bin = ''; const bytes = new Uint8Array(wav.buffer);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    out.push({ name, peakDb: 20 * Math.log10(peak + 1e-9), rmsDb: 10 * Math.log10(sum / n + 1e-12), seconds: last / 44100, b64: btoa(bin) });
  }
  return out;
});
for (const r of res) {
  fs.writeFileSync(`${OUT}/${r.name}.wav`, Buffer.from(r.b64, 'base64'));
  console.log(`${r.name.padEnd(10)} peak ${r.peakDb.toFixed(1).padStart(6)} dBFS  rms ${r.rmsDb.toFixed(1).padStart(6)} dB  ${r.seconds.toFixed(2)} s`);
}
await browser.close();
