/**
 * Text → voice-clip key. Shared by the app (js/core/voice.js) and the clip
 * generator (tools/voice-lines.mjs), so a line always finds its recording.
 */
export function normalize(text) {
  return String(text).toLowerCase()
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u20E3/gu, ' ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
/** FNV-1a 32-bit of the normalized text → 8 hex chars. */
export function hashText(text) {
  let h = 0x811c9dc5;
  const s = normalize(text);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
