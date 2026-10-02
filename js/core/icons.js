/**
 * Icon helper. Station/park icons are usually emoji, but there is no emoji
 * for some playground gear (swings, seesaw), so a few tiny inline SVGs live
 * here. Use them in data as "svg:<name>".
 */
const SVGS = {
  // A-frame swing set with a seat
  swing: `<svg viewBox="0 0 64 64" aria-hidden="true"><g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 58 L20 8 L44 8 L58 58" stroke="#E4572E" stroke-width="6"/>
    <path d="M26 10 L26 42 M38 10 L38 42" stroke="#555" stroke-width="3"/>
    <rect x="21" y="41" width="22" height="7" rx="3" fill="#2E86DE" stroke="#1B4F8A" stroke-width="2"/></g></svg>`,
  // Seesaw on a triangle
  seesaw: `<svg viewBox="0 0 64 64" aria-hidden="true"><g stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 34 L60 20" stroke="#F4A259" stroke-width="7" fill="none"/>
    <path d="M32 28 L20 56 L44 56 Z" fill="#06D6A0" stroke="#048A67" stroke-width="3"/>
    <circle cx="10" cy="26" r="5" fill="#FF6B6B"/><circle cx="54" cy="12" r="5" fill="#4D96FF"/></g></svg>`,
};

/** Returns HTML for an icon (emoji span or inline SVG). */
export function iconHTML(icon, cls = '') {
  if (typeof icon === 'string' && icon.startsWith('svg:')) {
    const svg = SVGS[icon.slice(4)] || '❓';
    return `<span class="ico ico-svg ${cls}">${svg}</span>`;
  }
  return `<span class="ico ${cls}">${icon}</span>`;
}
