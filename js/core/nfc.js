/**
 * NFC + tag payloads
 * ==================
 * Every tag holds a LINK with the playground ID and its location code:
 *
 *     https://<host>/<path>/?park=123&loc=LOC04
 *
 * The game is picked in the app, so the same ten tags (LOC01..LOC10) work for
 * every game. A "tap" reaches the app in three ways, all funnelled into
 * app.handleTap({ parkId, loc }):
 *
 *  1. The phone opens the link itself (iPhone XS+ and Android read URL tags
 *     natively). The page loads, consumeUrlTap() reads ?park=&loc=, the saved
 *     game for that playground resumes, and the tap is applied.
 *  2. Web NFC (Chrome on Android, HTTPS) while the app is open: NDEFReader
 *     reads the same link without leaving the page. See startScan().
 *  3. Test controls (Simulate correct / wrong tap, LOC buttons) in the UI.
 *
 * iOS Safari has NO Web NFC, so iPhones always use (1). A native wrapper
 * (e.g. Capacitor + a Core NFC plugin) could read the chip directly.
 */

/** Is the Web NFC API available (Chrome on Android, secure context)? */
export const nfcSupported = typeof window !== 'undefined' && 'NDEFReader' in window;

const LOC_RE = /^LOC\d{2}$/i;

/** Base URL for tag links: settings override, else the current page. */
export function defaultBaseUrl() {
  // Works from a subpath too (e.g. https://user.github.io/playquest/).
  // Drop a trailing "index.html" so links stay canonical: .../playquest/?park=…
  return location.origin + location.pathname.replace(/index\.html$/, '');
}

/** Link written on a tag, e.g. https://host/app/?park=123&loc=LOC04 */
export function tagUrl(base, parkId, loc) {
  const b = (base || defaultBaseUrl()).replace(/[?#].*$/, '');
  return `${b}?park=${encodeURIComponent(parkId)}&loc=${loc}`;
}

/**
 * Parse a tag payload / URL. Accepts the park & loc as query (?park=&loc=)
 * or hash (#park=&loc=) parameters. Returns { parkId, loc } or null.
 */
export function parsePayload(raw) {
  if (!raw) return null;
  let text = String(raw).trim();
  // Unwrap redirect links (e.g. Gmail's https://www.google.com/url?q=<real link>&...)
  // and percent-encoded params (park%3D123%26loc%3DLOC01), so copied links still work.
  for (let i = 0; i < 3; i++) {
    const m = text.match(/[?&](?:q|url|u)=([^&]+)/i);
    if (/\/url\?|redirect|safelinks/i.test(text) && m) { text = m[1]; }
    if (/%3D|%26|%3F/i.test(text)) { try { text = decodeURIComponent(text); } catch { /* keep */ } }
    else break;
  }
  const idx = text.search(/[?#]/);
  const params = new URLSearchParams((idx >= 0 ? text.slice(idx + 1) : text).replace(/#/g, '&'));
  const parkId = params.get('park');
  const loc = (params.get('loc') || '').toUpperCase();
  if (!parkId || !LOC_RE.test(loc)) return null;
  return { parkId, loc };
}

/**
 * If the page was opened from a tag link, return the tap and strip the
 * parameters from the address bar so a refresh doesn't count it twice.
 */
export function consumeUrlTap() {
  const tap = parsePayload(location.search) || parsePayload(location.hash);
  if (tap) history.replaceState(null, '', location.pathname);
  return tap;
}

/** Decode one NDEF record to a string (text or URL records). */
function decodeRecord(record) {
  try {
    if (record.recordType === 'text') {
      return new TextDecoder(record.encoding || 'utf-8').decode(record.data);
    }
    if (record.recordType === 'url' || record.recordType === 'absolute-url') {
      return new TextDecoder().decode(record.data);
    }
    if (record.recordType === 'mime' && /text/.test(record.mediaType || '')) {
      return new TextDecoder().decode(record.data);
    }
  } catch { /* unreadable record */ }
  return null;
}

let controller = null;
export const nfcState = { scanning: false, error: null };

/**
 * Start Web NFC scanning. Must be called from a user gesture the first time
 * (Chrome shows a permission prompt). onTap({ parkId, loc }, rawText) is
 * called for every recognised tag; onUnknown(rawText) for other tags.
 */
export async function startScan({ onTap, onUnknown, onError }) {
  if (!nfcSupported) throw new Error('Web NFC not supported on this device/browser');
  if (nfcState.scanning) return;
  controller = new AbortController();
  const reader = new NDEFReader();
  reader.onreading = (event) => {
    for (const record of event.message.records) {
      const text = decodeRecord(record);
      const tap = parsePayload(text);
      if (tap) { onTap(tap, text); return; }
    }
    onUnknown?.(event.serialNumber);
  };
  reader.onreadingerror = () => onError?.(new Error("Couldn't read that tag. Try again!"));
  await reader.scan({ signal: controller.signal });
  nfcState.scanning = true;
  nfcState.error = null;
}

export function stopScan() {
  controller?.abort();
  controller = null;
  nfcState.scanning = false;
}

/** If NFC permission was granted before, we can start scanning without a tap. */
export async function nfcPermissionGranted() {
  try {
    const p = await navigator.permissions.query({ name: 'nfc' });
    return p.state === 'granted';
  } catch {
    return false;
  }
}

/**
 * Write a location tag from the Grown-ups page (Android Chrome only).
 * Writes one URL record: ?park=<id>&loc=LOCxx
 */
export async function writeTag(parkId, loc, base) {
  if (!nfcSupported) throw new Error('Web NFC not supported');
  stopScan(); // a page can't scan and write at the same time reliably
  const writer = new NDEFReader();
  await writer.write({ records: [{ recordType: 'url', data: tagUrl(base, parkId, loc) }] }, { overwrite: true });
}
