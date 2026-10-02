/**
 * Service worker: offline-first app shell (playgrounds often have bad signal).
 * Bump CACHE when you change files so phones pick up the new version.
 * Voice clips (audio/voice/*.mp3) are cached as they are fetched; the app warms
 * them in the background once (js/core/voice.js warmCache) so clues work offline.
 */
const CACHE = 'playquest-v3-redesign';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'fonts/Fredoka.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'audio/voice/manifest.json',
  'js/app.js',
  'js/core/audio.js', 'js/core/voice.js', 'js/core/textkey.js', 'js/core/session.js',
  'js/core/geo.js', 'js/core/nfc.js', 'js/core/store.js', 'js/core/util.js',
  'js/data/playgrounds.js', 'js/data/narration.js',
  'js/games/index.js', 'js/games/fixed-order.js', 'js/games/critters.js',
  'js/games/power-outage.js', 'js/games/high-low.js', 'js/games/great-loop.js', 'js/games/memory.js',
  'js/ui/art.js', 'js/ui/mascot.js', 'js/ui/fx.js', 'js/ui/views.js',
  'js/screens/splash.js', 'js/screens/park.js', 'js/screens/map.js', 'js/screens/countdown.js',
  'js/screens/play.js', 'js/screens/win.js', 'js/screens/shelf.js', 'js/screens/parent.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Stale-while-revalidate for same-origin GETs. Navigations (incl. tag links
// like /playquest/?park=123&loc=LOC04) fall back to the cached index.html offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: req.mode === 'navigate' })
        || (req.mode === 'navigate' ? await cache.match('index.html') : null);
      const network = fetch(req).then((res) => {
        if (res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
