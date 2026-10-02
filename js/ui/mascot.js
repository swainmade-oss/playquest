/**
 * PIP — the PlayQuest guide. A round sunny blob with a star antenna, built in
 * SVG and animated with CSS: idle bounce, blink, talk (mouth moves while the
 * voice plays), cheer (jump + arms up), sad (gentle wobble), think (tilt).
 */
import { say, onTalk } from '../core/voice.js';

const K = '#2D2A4A';
const SVG = `<svg class="pip-svg" viewBox="0 0 120 132" aria-hidden="true">
  <defs>
    <radialGradient id="pipBody" cx="40%" cy="32%" r="75%">
      <stop offset="0" stop-color="#FFE27A"/><stop offset=".55" stop-color="#FFC93C"/><stop offset="1" stop-color="#FF9F1C"/>
    </radialGradient>
  </defs>
  <ellipse class="pip-shadow" cx="60" cy="126" rx="34" ry="5" fill="#000" opacity=".15"/>
  <g class="pip-jump">
    <g class="pip-antenna"><path d="M60 26 C58 16 64 12 62 4" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
      <path d="M62 -6l3.5 7 7.7.8-5.8 5.2 1.7 7.6-7.1-4-7.1 4 1.7-7.6-5.8-5.2 7.7-.8z" fill="#F15BB5" stroke="${K}" stroke-width="3" stroke-linejoin="round"/></g>
    <g class="pip-arm pip-arm-l"><path d="M24 76 C10 74 6 62 10 56" fill="none" stroke="${K}" stroke-width="11" stroke-linecap="round"/><path d="M24 76 C10 74 6 62 10 56" fill="none" stroke="#FFB627" stroke-width="5" stroke-linecap="round"/></g>
    <g class="pip-arm pip-arm-r"><path d="M96 76 C110 74 114 62 110 56" fill="none" stroke="${K}" stroke-width="11" stroke-linecap="round"/><path d="M96 76 C110 74 114 62 110 56" fill="none" stroke="#FFB627" stroke-width="5" stroke-linecap="round"/></g>
    <ellipse cx="44" cy="118" rx="11" ry="7" fill="#FF7A3D" stroke="${K}" stroke-width="4"/>
    <ellipse cx="76" cy="118" rx="11" ry="7" fill="#FF7A3D" stroke="${K}" stroke-width="4"/>
    <path class="pip-body" d="M60 24 C88 24 102 50 102 78 C102 104 84 116 60 116 C36 116 18 104 18 78 C18 50 32 24 60 24 Z" fill="url(#pipBody)" stroke="${K}" stroke-width="4.5"/>
    <ellipse cx="60" cy="94" rx="24" ry="16" fill="#FFF1B8" opacity=".75"/>
    <path d="M36 40 C42 32 50 30 56 30" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".7"/>
    <g class="pip-face">
      <g class="pip-brows"><path d="M36 48 l12 -4M84 48 l-12 -4" stroke="${K}" stroke-width="3.5" stroke-linecap="round"/></g>
      <g class="pip-eyes">
        <ellipse cx="45" cy="62" rx="10" ry="12" fill="#fff" stroke="${K}" stroke-width="3.5"/>
        <ellipse cx="75" cy="62" rx="10" ry="12" fill="#fff" stroke="${K}" stroke-width="3.5"/>
        <g class="pip-pupils"><circle cx="47" cy="64" r="5.5" fill="${K}"/><circle cx="77" cy="64" r="5.5" fill="${K}"/>
          <circle cx="49" cy="61.5" r="2" fill="#fff"/><circle cx="79" cy="61.5" r="2" fill="#fff"/></g>
      </g>
      <g class="pip-eyes-happy"><path d="M36 64 q9 -12 18 0M66 64 q9 -12 18 0" fill="none" stroke="${K}" stroke-width="4.5" stroke-linecap="round"/></g>
      <ellipse cx="32" cy="80" rx="7" ry="4.5" fill="#FF8FA3" opacity=".8"/><ellipse cx="88" cy="80" rx="7" ry="4.5" fill="#FF8FA3" opacity=".8"/>
      <path class="pip-m pip-m-smile" d="M48 80 q12 12 24 0" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
      <g class="pip-m pip-m-open"><path d="M47 79 q13 20 26 0 z" fill="#7A2340" stroke="${K}" stroke-width="3.5" stroke-linejoin="round"/><path d="M53 86 q7 5 14 0" fill="#FF6F8E"/></g>
      <path class="pip-m pip-m-sad" d="M50 88 q10 -8 20 0" fill="none" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
    </g>
  </g>
</svg>`;

export const pipHTML = (cls = '') => `<div class="pip ${cls}" data-pip>${SVG}</div>`;

/** Make every Pip on screen react: 'cheer' | 'sad' | 'think' | null. */
export function pipMood(mood, ms = 1500) {
  document.querySelectorAll('[data-pip]').forEach((el) => {
    el.classList.remove('cheer', 'sad', 'think');
    void el.getBoundingClientRect();
    clearTimeout(el._moodT);
    if (!mood) return;
    el.classList.add(mood);
    if (ms) el._moodT = setTimeout(() => el.classList.remove(mood), ms);
  });
}

// Mouth moves while the voice is talking.
onTalk((on) => document.body.classList.toggle('talking', on));

/**
 * Pip says something: shows it in the speech bubble ([data-bubble]) and
 * speaks it. `show` overrides the bubble text (e.g. a shorter version).
 */
export function talk(lines, { queue = false, show = null, bubble = true } = {}) {
  const list = [].concat(lines).filter(Boolean);
  if (bubble) {
    const b = document.querySelector('[data-bubble]');
    if (b) {
      b.textContent = show ?? list[list.length - 1] ?? '';
      b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    }
  }
  return say(list, { queue });
}
