# 🛝 PlayQuest: playground NFC quest games (prototype)

PlayQuest is a location-based playground game for families with kids aged about 5–12. Players walk to ten
physical spots on a playground and tap an NFC tag at each one. The app reads the tag, **speaks the next
clue out loud**, and tracks progress through **10 steps** until the player finishes and earns a **badge**.

* Installable **PWA**: plain HTML/CSS/ES-module JavaScript with **no build step**. Any static HTTPS host works.
* Works **offline** after the first load (service worker). Playgrounds often have poor signal.
* **Local storage only.** No login, no personal data, and nothing is sent to a server.
* Big, colorful, icon-first UI. Clues are read aloud (text-to-speech), and **Pocket Mode** hides the text so kids look at the playground instead of the phone.
* Supports **many playgrounds** from the start. Each one has its own ID and ten tags, LOC01–LOC10. The **nearest playground is suggested by geolocation**, with a manual list and ID entry as the fallback.

**🌐 Live demo:** <https://swainmade-oss.github.io/playquest/> (GitHub Pages, served from the `/playquest/` subpath).
Example tag link: <https://swainmade-oss.github.io/playquest/?park=123&loc=LOC04>

> ⚠️ Playgrounds, coordinates and clues in `js/data/playgrounds.js` are **SAMPLE DATA** (IDs 123, 456, 789).

---

## Quick start

```bash
cd playground-app
python3 -m http.server 8080          # or: npx serve .
# open http://localhost:8080 (phone-size view in DevTools)
```

Every game screen has the **🧪 Test controls**: *Simulate Correct Tap* and *Simulate Wrong Tap*, plus
buttons for LOC01–LOC10. You can play the whole flow without walking to a tag.

On a real phone you need **HTTPS** (Web NFC, geolocation and PWA install all require it). Use GitHub Pages,
Netlify or Cloudflare Pages, or a tunnel (`cloudflared tunnel --url http://localhost:8080`).

**Hosting from a subpath (GitHub Pages).** The live demo is published from the `main` branch root of
[swainmade-oss/playquest](https://github.com/swainmade-oss/playquest) to `https://swainmade-oss.github.io/playquest/`.
All asset paths, the manifest `start_url`/`scope` (`./`) and the service worker (registered as `./sw.js`, so its
scope is `/playquest/`) are relative, so the app works under any subpath without changes. Tag links are built from
the page's own address, so on the live site they come out as `https://swainmade-oss.github.io/playquest/?park=123&loc=LOC04`.
`.nojekyll` turns off Jekyll processing. To test a subpath locally:

```bash
mkdir -p /tmp/srv && ln -s "$PWD" /tmp/srv/playquest && (cd /tmp/srv && python3 -m http.server 8090)
# open http://localhost:8090/playquest/
```

**Automated check and screenshots:** `npm install` (installs playwright-core only and uses the Chrome you have)
and then `npm run screenshots` while the server runs. It plays all five games, tests the tag-link, resume,
reset and location-denied flows, and writes 390×844 PNGs plus `tag-links-print.pdf` to `screenshots/`.
Set `TAG_BASE_URL=https://swainmade-oss.github.io/playquest/` so the tag table and PDF show the live links
(and `BASE_URL=http://localhost:8090/playquest/` to run against a local subpath).

---

## Spec → implementation map

| Spec item | Where / how |
|---|---|
| **Start screen**: choose playground ID + game, press start | `js/screens/start.js`. The nearest playground is auto-selected by geolocation (≤ 200 m), the list is sorted by distance, there's a "Playground ID" box, and the five games show 🏅 badge status and best time. A **Continue** card appears when a game is in progress. Big **START ▶**. |
| **Game screen**: name, step X of 10, elapsed time, Play Clue, Pocket Mode | `js/screens/play.js`. Header shows the name and a 👀/🙈 **Pocket** toggle, with a "Step X of 10" pill, a ⏱️ elapsed clock and a progress bar. There's a game-specific visual, the clue card and a big **🔊 Play Clue** button. |
| **Pocket Mode** hides on-screen text | Replaces the visual and clue with a dark "🙈 Pocket Mode 5/10" card. Clues are still spoken, and the setting is remembered. |
| **Badge screen** after 10th correct tap: badge + total time, Play Again / Back to Start | Overlay in `play.js` with a medal, badge name, total time, best-time note and the two buttons. |
| **Test controls**: simulate correct / wrong tap | `play.js` → `testPanel()`. They can be hidden in Grown-ups settings. |
| Read location code from a tag | `js/core/nfc.js`: tag link `?park=123&loc=LOC04` (page load) plus Web NFC `NDEFReader` (Android Chrome). |
| Match tap against expected next step | Each game's `expected()` / `tap()` in `js/games/`. |
| Speak clue with TTS | `js/core/sound.js` → `say()` (Web Speech API). Runs on start, after each correct tap and on **Play Clue**. |
| Success sound + short vibration / error sound + vibration | `sfx('good')` with `buzz(60)`, and `sfx('bad')` with `buzz([80,60,80])`. Sounds are synthesized with Web Audio, so there are no audio files. |
| Track step, elapsed time, won | Game state `{ step, startedAt, … }`. The win is recorded in `store.recordWin()`. |
| One badge status per game per playground, best time per game | `store.data.progress[parkId].games[gameId] = { won, bestMs, plays }` |
| Save and reload progress if the app is closed | Active game saved after every tap (`progress[parkId].active`). Reopening the app, or opening any tag link, resumes it. |
| Reset progress for a playground | Grown-ups page → **🗑️ Reset this playground**. |
| Per playground: ID + ten location codes | `js/data/playgrounds.js` |
| No personal data, nothing sent to a server | Only `localStorage`. There are no network calls except loading the app itself. |

### The five games (all use the same ten tags)

| Game | Badge | Rule | Time limit | How it plays in the app |
|---|---|---|---|---|
| 🐰 **Rescue the Playground Critters** | 🐾 Critter Rescuer | Explore | None | Fixed order of 10 steps. Each correct tag "rescues" a critter (🐰🐿️🐢…), which fills the rescue slots, and the next clue says where the next critter hides. |
| 🔌 **Power Outage** | ⚡ Power Restorer | Timed | 30 s per step | Fixed order. A 30-second bar counts down for each step. If it runs out, the power goes out and **the step resets**: the timer restarts and the clue repeats, but you don't advance. Light bulbs show restored stations. |
| ↕️ **High and Low Challenge** | ⛰️ High and Low Master | Sequence | None | Exact fixed order. The clues alternate HIGH and LOW spots, shown with a big ⬆️ HIGH or ⬇️ LOW. **Out-of-order taps don't count.** |
| 🔄 **The Great Playground Loop** | 🏅 Loop Champion | Flow | None | Fixed order around the playground. A ring shows the lap. A flow meter nudges "⚠️ Keep moving!" after 45 s without a tag, and the badge screen says "Non-stop loop!" if you never stopped that long. |
| 🃏 **Memory Mode** | 🧠 Memory Master | Memory | None | At the start each tag secretly gets a number from 1 to 10 (shuffled). Find them in order 1 → 10. **A wrong tag reveals its number** (spoken, and shown on the memory board) as a hint for later. |

---

## Architecture

```
index.html  manifest.webmanifest  sw.js (offline cache — bump CACHE on changes)
.nojekyll                   tells GitHub Pages to serve files as-is
css/app.css                 all styles (kid UI, game visuals, print layout)
fonts/Fredoka.ttf  icons/   rounded font (OFL) and app icons
js/app.js                   bootstrap, tiny router, the single tap entry point app.handleTap()
js/core/nfc.js              tag link format/parse, Web NFC scan and write
js/core/geo.js              geolocation, distance, nearest playground (≤ 200 m)
js/core/store.js            localStorage: settings, per-playground progress, active game
js/core/sound.js            synthesized sounds and text-to-speech
js/core/icons.js, util.js   emoji/SVG icons; toast, confetti, vibration, time format
js/data/playgrounds.js      ★ playgrounds, LOC01–LOC10 spots, game orders and clues (edit here)
js/games/index.js           game registry + documented game API
js/games/fixed-order.js     shared engine for the 4 fixed-order games
js/games/critters.js  power-outage.js  high-low.js  great-loop.js  memory.js
js/screens/start.js         Start screen
js/screens/play.js          Game screen host + badge screen + test controls
js/screens/parent.js        Grown-ups: settings, reset, tag setup, printable tag links
tools/                      Playwright smoke test/screenshots, icon renderer
```

**One tap pipeline.** A Web NFC read, a tag link opening the page, and the test buttons all call
`app.handleTap({ parkId, loc })`. In a game, the game screen checks the tap against the expected step.
Outside a game, the tap resumes that playground's saved game if there is one. Otherwise it selects the
playground on the Start screen.

**Games are small rule objects.** The host (`play.js`) handles sounds, vibration, speech, saving, timers
and the badge screen. A game supplies `start / expected / clue / view / tap` and optionally `tick / live`
(see `js/games/index.js`). State is plain JSON saved after every tap. Timers use timestamps, so they
keep running correctly across reloads.

### Editing clues and adding playgrounds

Everything lives in **`js/data/playgrounds.js`**:

```js
{
  id: '123', name: 'Sunny Meadow Park', icon: '🌻', color: '#FFC83D', lat: 41.88, lng: -87.62,
  locations: { LOC01: { name: 'Front Gate', icon: '🚪', hint: 'the front gate', level: 'low' }, … LOC10 },
  games: {
    critters: [ { loc: 'LOC02', clue: 'A little bunny is hiding where kids zoom down fast. Head to the tallest slide!' }, … 10 ],
    power:    [ … 10 ], highlow: [ … 10 ], loop: [ … 10 ],
  },
}
```

* Each step's `clue` leads the player to that step's `loc`. It's spoken when the step starts.
* **If you leave out `clue`,** the game builds one from the location's `hint` (e.g. *"Turtle is hiding near the spinner. Go find it!"*).
  Playground 123 has every clue hand-written. 456 and 789 use the templates, so a new playground only needs its 10 spots and 4 orders.
* Memory Mode needs no data (the numbers are shuffled at game start).
* For testing geolocation, the Grown-ups page has **"Use my location for this playground"**. It moves a sample playground to where you're standing, stored on that device only.

---

## NFC tags

**Format:** one URL record per tag, with the playground ID and the tag's location code:

```
https://<your-host>/<path>/?park=123&loc=LOC04
```

For the live demo that is **`https://swainmade-oss.github.io/playquest/?park=123&loc=LOC04`**.

The game is chosen in the app, so **the same ten tags work for all five games**. (`#park=123&loc=LOC04` is also accepted.)

**Printable tag link list:** open 👪 **Grown-ups** (answer the grown-up question), then use **📋 Tag links**
and **🖨️ Print table**. It gives one table per playground (LOC01–LOC10, the spot, and the link), with Copy,
▶ Test, and ✍️ Write (Android Chrome) buttons. Links default to the address the app is running from (on the live site: `https://swainmade-oss.github.io/playquest/`).
Set **Tag base URL** first if the tags should point somewhere else.
`screenshots/tag-links-print.pdf` is the printed list with the live GitHub Pages links for the three sample playgrounds.

**Writing the tags:**
1. Get 10 NTAG213/NTAG215 stickers per playground and label them **LOC01–LOC10**.
2. In the free **NFC Tools** app (iPhone or Android), go to **Write → Add a record → URL/URI**, paste the tag's link, press **Write**, and hold the phone on the sticker.
   On Android Chrome you can press **✍️ Write** in PlayQuest instead.
3. Test each tag, then optionally **lock** it in NFC Tools.
4. **Mounting:** **avoid mounting tags directly on metal, because metal blocks the read.** Use wood or plastic posts, a plastic spacer, or "on-metal" tags.
   Put them at kid height, away from pinch points and slide exits, with a small "📱 tap here" label. Use weatherproof tags or covers outdoors.

### How a tap reaches the app

| | App open | App closed |
|---|---|---|
| **Android + Chrome** | After **📡 Turn on tag reader** once (permission prompt), **Web NFC** reads the tag inside the page. It starts automatically on later visits. | Android opens the tag link in Chrome (or in the installed PWA). The saved game resumes and the tap counts. |
| **iPhone (XS or newer)** | **iOS Safari has no Web NFC.** Background tag reading shows a banner, and tapping it opens the link. The game resumes and the tap counts. | Same. |
| **Testing** | 🧪 Simulate Correct / Wrong Tap, or LOC buttons. | – |

### Limitations

* **iPhone:** there's no Web NFC, so every tap is a banner tap plus a page load (fast with the offline cache).
  **Home Screen web apps on iOS have storage that is separate from Safari, and tag links open in Safari.**
  For the demo on iPhone, play in Safari rather than the Home Screen icon. A native wrapper fixes this.
* **iOS has no vibration API**, so iPhones get sound only. Browsers also block vibration until the user has touched the page once.
* Text-to-speech voices vary by device. The first sound needs a user tap (autoplay rules). Pressing START counts.
* Web NFC needs HTTPS, Chrome on Android, and the screen on with the page in the foreground.
* Tag links can be typed by hand, so there's no anti-cheat in this demo.
* Sample coordinates are made up, so use "Use my location for this playground" to try the 200 m suggestion.

---

## Next steps

1. **Native wrapper for direct NFC.** Wrap the app with **Capacitor** and add an NFC plugin (Core NFC on iOS, Android NFC)
   so both platforms read the chip in-app. There'd be no banner and no reload, and one storage for everything. Add Universal Links / App Links so
   tag links open the native app. The game code stays the same: call `app.handleTap()` from the plugin callback.
2. **Recorded voice clips as a fallback to TTS.** Add an optional `audio: 'clips/123/critters-01.mp3'` per step and play it
   in `say()` when present, falling back to speech synthesis. Precache the clips in the service worker.
3. **Accounts and cloud sync (later).** Family account with kid profiles and badges synced between devices.
   Design for COPPA compliance, keep it opt-in, and keep the local-only mode.
4. **Backend / admin.** Playground catalog and clue editor, tag provisioning, signed tag links (HMAC) or tag UID checks
   against cheating, and anonymous usage analytics.
5. **More play.** Difficulty levels (longer timers for younger kids), sibling turn-taking, seasonal clue packs, more languages,
   and a QR code fallback on the same link.
