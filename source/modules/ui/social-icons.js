// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOCIAL ICONS UPGRADE                               ║
// ║      Replace Webflow-exported filled icons with 24px line SVGs               ║
// ║                 (no external fonts, consistent rendering)                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { ICON_INSTAGRAM, ICON_LINKEDIN, ICON_MUSIC } from './icons.js';

const ICON_BY_LABEL = new Map([
  ['apple music', ICON_MUSIC],
  ['instagram', ICON_INSTAGRAM],
  ['linkedin', ICON_LINKEDIN],
]);

export function upgradeSocialIcons() {
  const list = document.getElementById('social-links');
  if (!list) return;

  // Idempotent: if we already upgraded one icon, bail out fast.
  if (list.querySelector('svg.ui-icon')) return;

  const links = Array.from(list.querySelectorAll('a.footer_icon-link[aria-label]'));
  for (const a of links) {
    const label = (a.getAttribute('aria-label') || '').trim().toLowerCase();
    const svg = ICON_BY_LABEL.get(label);
    if (!svg) continue;

    const existingSvg = a.querySelector('svg');
    if (existingSvg) {
      // Replace only the SVG; preserve the screen-reader text span.
      try {
        existingSvg.outerHTML = svg;
      } catch (e) {
        // Fallback: inject at start.
        a.insertAdjacentHTML('afterbegin', svg);
        existingSvg.remove();
      }
    } else {
      a.insertAdjacentHTML('afterbegin', svg);
    }
  }
}

