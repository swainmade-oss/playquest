/**
 * ART — hand-made SVG illustrations (no image files, no emoji dependency).
 *   spotArt(name)   a playground spot (slide, swings, …) for the BIG "find this" card
 *   gameArt(id)     the character/icon of each of the five games
 *   badgeArt(game, earned)  the sticker/medal for a game (locked = grey silhouette)
 * All drawings use a 100×100 viewBox, a chunky dark outline and flat toy colors.
 */
const K = '#2D2A4A'; // ink outline
const S = `stroke="${K}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"`;
const S3 = `stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const shadow = (cx = 50, rx = 38) => `<ellipse cx="${cx}" cy="92" rx="${rx}" ry="5" fill="#000" opacity=".12"/>`;
const svg = (body, cls = '') => `<svg class="art ${cls}" viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`;

export const SPOTS = {
  slide: () => svg(`${shadow()}
    <g ${S}><path d="M18 90V30M32 90V30" fill="none"/><path d="M18 46h14M18 60h14M18 74h14" fill="none"/>
    <rect x="13" y="22" width="34" height="9" rx="3" fill="#FF9F1C"/>
    <path d="M44 31c18 0 20 40 46 52v8C60 80 56 46 44 44z" fill="#FF5D73"/>
    <path d="M24 22l8-12 8 12" fill="#FFD23F"/></g>`),
  tubeslide: () => svg(`${shadow()}
    <g ${S}><rect x="12" y="18" width="26" height="72" rx="4" fill="#4D96FF"/>
    <path d="M10 18l15-12 15 12z" fill="#FFD23F"/>
    <path d="M38 34c30 0 44 10 44 22s-14 16-30 16c-10 0-12 8-4 12h26v6H40c-14-6-10-26 10-26 16 0 22-4 22-8s-10-10-34-10z" fill="#9B5DE5"/>
    <circle cx="25" cy="36" r="6" fill="#A0E7FF"/></g>`),
  twistyslide: () => svg(`${shadow()}
    <g ${S}><path d="M20 90V20M34 90V20" fill="none"/><rect x="14" y="14" width="26" height="8" rx="3" fill="#FFD23F"/>
    <path d="M38 22c34 2 40 18 18 26-20 7-16 20 6 24 12 2 20 8 26 18H76c-6-6-12-10-20-11-30-4-32-26-6-35 14-5 10-12-12-14z" fill="#3BCEAC"/></g>`),
  swings: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M8 90L26 14M92 90L74 14" fill="none" stroke-width="7" stroke="#FF5D73"/>
    <path d="M8 90L26 14M92 90L74 14" fill="none" stroke-width="2"/>
    <rect x="20" y="9" width="60" height="9" rx="4" fill="#FF9F1C"/>
    <path d="M38 18v42M52 18v42" fill="none" stroke-width="3"/><path d="M62 18l6 36M74 18l-2 36" fill="none" stroke-width="3"/>
    <rect x="32" y="58" width="26" height="8" rx="4" fill="#4D96FF"/><rect x="62" y="52" width="16" height="7" rx="3" fill="#3BCEAC"/></g>`),
  monkeybars: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M14 90V24M86 90V24" fill="none" stroke="#4D96FF" stroke-width="8"/><path d="M14 90V24M86 90V24" fill="none" stroke-width="2"/>
    <rect x="8" y="16" width="84" height="12" rx="6" fill="#FFD23F"/>
    ${[24, 38, 52, 66, 80].map((x) => `<circle cx="${x}" cy="22" r="3" fill="${K}"/>`).join('')}
    <circle cx="50" cy="48" r="9" fill="#FFB38A"/><path d="M42 40l-4-10M58 40l4-10" fill="none"/><path d="M44 56h12v16H44z" fill="#FF5D73"/>
    <circle cx="47" cy="47" r="1.5" fill="${K}"/><circle cx="53" cy="47" r="1.5" fill="${K}"/></g>`),
  climbwall: () => svg(`${shadow()}
    <g ${S}><path d="M22 90L34 10h40l8 80z" fill="#9B5DE5"/>
    <circle cx="44" cy="24" r="5" fill="#FFD23F"/><circle cx="62" cy="30" r="5" fill="#3BCEAC"/><circle cx="40" cy="46" r="5" fill="#FF5D73"/>
    <circle cx="64" cy="54" r="5" fill="#FF9F1C"/><circle cx="46" cy="68" r="5" fill="#A0E7FF"/><circle cx="68" cy="76" r="5" fill="#FFD23F"/></g>`),
  sandbox: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M10 60h80v26H10z" fill="#B5835A"/><path d="M14 60c10-14 26-18 36-10 10-10 26-6 36 10z" fill="#F7D59C"/>
    <path d="M58 30h18l-3 22H61z" fill="#FF5D73"/><path d="M60 30c0-8 14-8 14 0" fill="none"/>
    <path d="M30 26l10 22" fill="none" stroke-width="5"/><path d="M38 44l8-2 2 10-10 2z" fill="#4D96FF"/></g>
    <path d="M14 72h72" stroke="#8a5e3b" stroke-width="2" stroke-dasharray="6 6"/>`),
  seesaw: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M50 52L34 88h32z" fill="#3BCEAC"/><path d="M6 66L94 36" fill="none" stroke="#FF9F1C" stroke-width="10"/>
    <path d="M6 66L94 36" fill="none" stroke-width="2"/><path d="M18 60v-12M84 38v-12" fill="none"/>
    <circle cx="18" cy="44" r="5" fill="#FF5D73"/><circle cx="84" cy="22" r="5" fill="#4D96FF"/></g>`),
  tunnel: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M8 88V60a42 42 0 0 1 84 0v28H72V60a22 22 0 0 0-44 0v28z" fill="#3BCEAC"/>
    <path d="M28 60a22 22 0 0 1 44 0v28H28z" fill="#2D2A4A" opacity=".85"/>
    <path d="M24 30l10 10M50 18v14M76 30l-10 10" fill="none" stroke="#FFD23F" stroke-width="5"/></g>
    <circle cx="44" cy="70" r="3" fill="#fff"/><circle cx="56" cy="70" r="3" fill="#fff"/>`),
  tower: () => svg(`${shadow()}
    <g ${S}><path d="M28 90V36h44v54z" fill="#FF9F1C"/><path d="M20 38L50 10l30 28z" fill="#FF5D73"/>
    <path d="M50 10V2" fill="none"/><path d="M50 2l14 4-14 4z" fill="#FFD23F"/>
    <rect x="40" y="46" width="20" height="16" rx="3" fill="#A0E7FF"/><path d="M40 90V74h20v16" fill="#B5835A"/></g>`),
  picnic: () => svg(`${shadow(50, 44)}
    <g ${S}><rect x="10" y="46" width="80" height="10" rx="4" fill="#B5835A"/>
    <path d="M26 56L16 88M74 56l10 32M30 72h40" fill="none" stroke-width="5"/>
    <path d="M36 46l4-18h22l4 18z" fill="#FF5D73"/><path d="M42 28c0-12 18-12 18 0" fill="none"/></g>
    <path d="M40 34h22M38 40h26" stroke="#fff" stroke-width="2"/>`),
  bench: () => svg(`${shadow(50, 44)}
    <g ${S}><rect x="12" y="26" width="76" height="10" rx="4" fill="#4D96FF"/><rect x="12" y="40" width="76" height="10" rx="4" fill="#4D96FF"/>
    <rect x="8" y="56" width="84" height="10" rx="4" fill="#FF9F1C"/><path d="M20 66v22M80 66v22M20 50v6M80 50v6" fill="none" stroke-width="5"/></g>`),
  gate: () => svg(`${shadow(50, 44)}
    <g ${S}><rect x="8" y="22" width="12" height="68" rx="3" fill="#FF5D73"/><rect x="80" y="22" width="12" height="68" rx="3" fill="#FF5D73"/>
    <circle cx="14" cy="18" r="6" fill="#FFD23F"/><circle cx="86" cy="18" r="6" fill="#FFD23F"/>
    <path d="M20 40c10-14 50-14 60 0v44H20z" fill="#A0E7FF" opacity=".6"/>
    <path d="M20 40c10-14 50-14 60 0M20 84h60M34 34v50M50 31v53M66 34v50" fill="none"/></g>`),
  sign: () => svg(`${shadow(50, 20)}
    <g ${S}><path d="M50 90V50" fill="none" stroke="#B5835A" stroke-width="8"/><path d="M50 90V50" fill="none" stroke-width="2"/>
    <rect x="12" y="14" width="76" height="40" rx="8" fill="#3BCEAC"/>
    <path d="M50 22l4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#FFD23F"/></g>`),
  spinner: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M50 30V70" fill="none"/><ellipse cx="50" cy="70" rx="42" ry="14" fill="#FF9F1C"/>
    <path d="M8 70v6c0 8 19 14 42 14s42-6 42-14v-6" fill="#FF5D73"/>
    <path d="M22 66V40h56v26M50 30v36" fill="none" stroke-width="5"/><circle cx="50" cy="28" r="7" fill="#FFD23F"/></g>`),
  net: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M50 8L10 90h80z" fill="#A0E7FF" opacity=".5"/>
    <path d="M50 8L10 90h80zM50 8L36 90M50 8L64 90M30 50h40M20 70h60M40 30h20" fill="none" stroke="#FF5D73" stroke-width="4"/>
    <circle cx="50" cy="8" r="5" fill="#FFD23F"/></g>`),
  bridge: () => svg(`${shadow(50, 46)}
    <g ${S}><path d="M10 30v58M90 30v58" fill="none" stroke="#B5835A" stroke-width="8"/>
    <path d="M10 34c20 22 60 22 80 0M10 56c20 18 60 18 80 0" fill="none" stroke="#FF9F1C" stroke-width="4"/>
    ${[18, 30, 42, 54, 66, 78].map((x, i) => `<rect x="${x - 4}" y="${56 + [5, 10, 13, 13, 10, 5][i]}" width="9" height="8" rx="2" fill="#FFD23F"/>`).join('')}
    <circle cx="10" cy="28" r="5" fill="#FF5D73"/><circle cx="90" cy="28" r="5" fill="#FF5D73"/></g>`),
  firepole: () => svg(`${shadow()}
    <g ${S}><rect x="10" y="22" width="50" height="10" rx="3" fill="#FF9F1C"/><path d="M20 32v58M50 32v58" fill="none" stroke-width="5"/>
    <path d="M74 10v80" fill="none" stroke="#FFD23F" stroke-width="8"/><path d="M74 10v80" fill="none" stroke-width="2"/>
    <path d="M60 26h14" fill="none"/><path d="M62 52c0-12 24-12 24 0z" fill="#FF5D73"/><rect x="60" y="51" width="28" height="5" rx="2" fill="#FF5D73"/></g>`),
  fountain: () => svg(`${shadow(50, 26)}
    <g ${S}><path d="M38 90l4-46h16l4 46z" fill="#4D96FF"/><path d="M26 36h48l-6 12H32z" fill="#A0E7FF"/>
    <path d="M56 34c0-16 18-20 22-8" fill="none" stroke="#4D96FF" stroke-width="4" stroke-dasharray="4 5"/></g>
    <circle cx="80" cy="30" r="3" fill="#4D96FF"/><circle cx="84" cy="40" r="2.5" fill="#4D96FF"/>`),
  rocket: () => svg(`${shadow(50, 28)}
    <g ${S}><path d="M50 4c18 14 22 40 16 66H34C28 44 32 18 50 4z" fill="#F15BB5"/>
    <circle cx="50" cy="34" r="9" fill="#A0E7FF"/><path d="M34 54L20 74l14-4zM66 54l14 20-14-4z" fill="#FFD23F"/>
    <path d="M40 70l4 16 6-8 6 8 4-16z" fill="#FF9F1C"/></g>`),
  anchor: () => svg(`${shadow(50, 30)}
    <g ${S}><circle cx="50" cy="16" r="8" fill="none" stroke-width="5"/><path d="M50 24v60M34 36h32" fill="none" stroke-width="6"/>
    <path d="M14 56c4 18 18 28 36 28s32-10 36-28" fill="none" stroke-width="6"/><path d="M8 60l8-10 6 12zM92 60l-8-10-6 12z" fill="${K}"/></g>`),
  ship: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M6 60h88l-12 26H18z" fill="#B5835A"/><path d="M50 60V8" fill="none"/>
    <path d="M50 12c22 8 26 30 0 40z" fill="#fff"/><path d="M48 16c-16 8-20 24 0 32z" fill="#FFD23F"/>
    <path d="M50 8h16l-4 5 4 5H50" fill="${K}"/><circle cx="28" cy="72" r="3" fill="${K}"/><circle cx="46" cy="72" r="3" fill="${K}"/><circle cx="64" cy="72" r="3" fill="${K}"/></g>`),
  ladder: () => svg(`${shadow(50, 22)}
    <g ${S}><path d="M10 8h80" fill="none" stroke="#B5835A" stroke-width="8"/>
    <path d="M34 8c-4 30 4 50 0 82M66 8c4 30-4 50 0 82" fill="none" stroke="#FF9F1C" stroke-width="4"/>
    ${[24, 40, 56, 72].map((y) => `<rect x="32" y="${y}" width="36" height="7" rx="3" fill="#FFD23F"/>`).join('')}</g>`),
  crowsnest: () => svg(`${shadow(50, 30)}
    <g ${S}><path d="M50 90V10" fill="none" stroke="#B5835A" stroke-width="8"/><path d="M50 90V10" fill="none" stroke-width="2"/>
    <path d="M26 26h48l-6 20H32z" fill="#FF9F1C"/><path d="M26 32h48" fill="none"/>
    <path d="M62 20l20-8 2 6-20 8z" fill="#4D96FF"/><path d="M50 6h16l-4 5 4 5H50" fill="${K}"/></g>`),
  treasure: () => svg(`${shadow(50, 40)}
    <g ${S}><rect x="12" y="46" width="76" height="40" rx="6" fill="#B5835A"/>
    <path d="M12 46c0-24 76-24 76 0z" fill="#FF9F1C"/><path d="M12 46h76M50 26v60" fill="none"/>
    <rect x="44" y="50" width="12" height="14" rx="3" fill="#FFD23F"/></g>
    <circle cx="30" cy="36" r="4" fill="#FFD23F"/><circle cx="72" cy="34" r="3" fill="#FFF3B0"/>`),
  beach: () => svg(`${shadow(50, 46)}
    <g ${S}><path d="M4 76c20-10 70-10 92 0v12H4z" fill="#F7D59C"/><path d="M38 80L58 20" fill="none"/>
    <path d="M24 30c10-22 54-14 60 6z" fill="#FF5D73"/><path d="M40 26c6-8 18-8 26 0" fill="none" stroke="#fff" stroke-width="3"/>
    <circle cx="18" cy="16" r="9" fill="#FFD23F"/></g>`),
  palm: () => svg(`${shadow(50, 44)}
    <g ${S}><path d="M44 88c4-22 2-46 8-62" fill="none" stroke="#B5835A" stroke-width="9"/><path d="M44 88c4-22 2-46 8-62" fill="none" stroke-width="2"/>
    <path d="M52 26c-14-12-32-8-40 2 14-4 26-2 40-2zM52 26c14-14 32-10 38 2-14-4-26-2-38-2zM52 26c-6-12-2-22 6-24-2 8-2 16-6 24z" fill="#3BCEAC"/>
    <rect x="58" y="70" width="34" height="8" rx="3" fill="#FF9F1C"/><path d="M62 78v10M88 78v10" fill="none"/></g>`),
};

/** Big spot illustration for a location (falls back to the emoji icon). */
export function spotArt(loc) {
  if (loc?.art && SPOTS[loc.art]) return SPOTS[loc.art]();
  return `<span class="art art-emoji">${loc?.icon && !String(loc.icon).startsWith('svg:') ? loc.icon : '📍'}</span>`;
}

// ------------------------------------------------------------ game characters
export const GAME_ART = {
  critters: () => svg(`
    <g ${S}><path d="M36 34c-6-18-2-30 5-30s8 16 6 30M56 34c-2-14 0-30 7-30s9 14 4 30" fill="#fff"/>
    <path d="M40 32c-2-10 0-18 2-21M60 32c0-10 2-17 4-21" fill="none" stroke="#F15BB5" stroke-width="4"/>
    <ellipse cx="50" cy="50" rx="22" ry="20" fill="#fff"/>
    <path d="M4 94c0-18 10-25 20-25 3-11 17-14 26-7 9-7 23-4 26 7 10 0 20 7 20 25z" fill="#3BCEAC"/></g>
    <circle cx="42" cy="47" r="3.5" fill="${K}"/><circle cx="58" cy="47" r="3.5" fill="${K}"/><circle cx="43" cy="46" r="1.2" fill="#fff"/><circle cx="59" cy="46" r="1.2" fill="#fff"/>
    <circle cx="35" cy="55" r="4" fill="#FF9EB5" opacity=".8"/><circle cx="65" cy="55" r="4" fill="#FF9EB5" opacity=".8"/>
    <path d="M47 55l3 3 3-3" fill="none" ${S3}/>
    <circle cx="22" cy="82" r="3.5" fill="#FFD23F"/><circle cx="80" cy="84" r="3.5" fill="#FF5D73"/><circle cx="52" cy="80" r="3" fill="#fff"/>`),
  power: () => svg(`
    <g ${S}><rect x="14" y="26" width="64" height="52" rx="10" fill="#fff"/><rect x="78" y="40" width="10" height="24" rx="3" fill="${K}"/>
    <rect x="20" y="32" width="38" height="40" rx="6" fill="#3BCEAC" stroke="none"/>
    <path d="M52 16L30 56h16l-6 32 26-44H48z" fill="#FFD23F"/></g>`),
  highlow: () => svg(`
    <g ${S}><path d="M4 90L38 20l20 36 10-14 28 48z" fill="#4D96FF"/><path d="M30 36l8-16 8 16-4 4-4-4-4 4z" fill="#fff"/>
    <path d="M78 8v26M70 18l8-10 8 10" fill="none" stroke="#FF5D73" stroke-width="6"/>
    <path d="M18 50v26M10 66l8 10 8-10" fill="none" stroke="#FFD23F" stroke-width="6"/></g>`),
  loop: () => svg(`
    <g ${S}><rect x="8" y="22" width="84" height="58" rx="29" fill="#3BCEAC"/><rect x="24" y="36" width="52" height="30" rx="15" fill="#B9F3E4"/>
    <rect x="8" y="22" width="84" height="58" rx="29" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="6 6"/>
    <path d="M50 4v22" fill="none"/><path d="M50 4h18v12H50z" fill="#fff"/></g>
    <path d="M50 4h6v6h-6zM62 4h6v6h-6zM56 10h6v6h-6z" fill="${K}"/>
    <circle cx="20" cy="56" r="7" fill="#FF5D73" ${S3}/>`),
  memory: () => svg(`
    <g ${S}><rect x="8" y="24" width="40" height="56" rx="8" fill="#F15BB5" transform="rotate(-12 28 52)"/>
    <rect x="44" y="18" width="44" height="62" rx="8" fill="#fff" transform="rotate(8 66 49)"/></g>
    <text x="68" y="62" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="34" fill="#9B5DE5" transform="rotate(8 66 49)">7</text>
    <text x="28" y="60" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="26" fill="#fff" transform="rotate(-12 28 52)">?</text>`),
};

export const gameArt = (id) => (GAME_ART[id] ? GAME_ART[id]() : '');

/** Sticker / medal for a game. Locked = soft grey silhouette with a "?". */
export function badgeArt(game, earned = true) {
  const c = earned ? game.color : '#C9CED6';
  const pts = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const r = i % 2 ? 40 : 46;
    return `${(50 + r * Math.cos(a)).toFixed(1)},${(50 + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return `<svg class="art badge-art ${earned ? 'earned' : 'locked'}" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M30 70L20 98l14-6 8 12 8-30zM70 70l10 28-14-6-8 12-8-30z" fill="${earned ? '#FF5D73' : '#B4BAC4'}" stroke="${K}" stroke-width="3" stroke-linejoin="round"/>
    <polygon points="${pts}" fill="${c}" stroke="${K}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="50" cy="50" r="31" fill="${earned ? '#fff' : '#E4E7EC'}" stroke="${K}" stroke-width="3"/>
    ${earned ? `<g transform="translate(24 24) scale(.52)">${GAME_ART[game.id]?.().replace(/^<svg[^>]*>|<\/svg>$/g, '') || ''}</g>
      <path d="M30 26a26 26 0 0 1 18-7" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".9"/>`
    : `<text x="50" y="62" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="34" fill="#A7AEB9">?</text>`}
  </svg>`;
}

/** Decorative floating shapes for backgrounds. */
export function floatingShapes(n = 10, seed = 1) {
  const shapes = ['circle', 'star', 'tri', 'blob', 'ring', 'squig'];
  const colors = ['#FFD23F', '#FF5D73', '#4D96FF', '#3BCEAC', '#9B5DE5', '#FF9F1C', '#F15BB5'];
  let r = seed * 9301 + 49297;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const out = [];
  for (let i = 0; i < n; i++) {
    const kind = shapes[Math.floor(rnd() * shapes.length)];
    const col = colors[Math.floor(rnd() * colors.length)];
    const size = 18 + Math.floor(rnd() * 34);
    const style = `left:${Math.floor(rnd() * 92)}%;top:${Math.floor(rnd() * 92)}%;width:${size}px;height:${size}px;animation-delay:-${(rnd() * 8).toFixed(1)}s;animation-duration:${(7 + rnd() * 8).toFixed(1)}s`;
    const body = {
      circle: `<circle cx="50" cy="50" r="44" fill="${col}"/>`,
      ring: `<circle cx="50" cy="50" r="36" fill="none" stroke="${col}" stroke-width="16"/>`,
      star: `<path d="M50 4l13 30 32 3-24 21 7 32-28-17-28 17 7-32L5 37l32-3z" fill="${col}"/>`,
      tri: `<path d="M50 8l44 80H6z" fill="${col}" stroke-linejoin="round"/>`,
      blob: `<path d="M52 6c22 0 42 16 40 40s-14 46-42 46S6 76 8 50 30 6 52 6z" fill="${col}"/>`,
      squig: `<path d="M6 60c12-24 22-24 30 0s18 24 30 0 18-24 28 0" fill="none" stroke="${col}" stroke-width="12" stroke-linecap="round"/>`,
    }[kind];
    out.push(`<svg class="float-shape" viewBox="0 0 100 100" style="${style}" aria-hidden="true">${body}</svg>`);
  }
  return `<div class="floaters" aria-hidden="true">${out.join('')}</div>`;
}
