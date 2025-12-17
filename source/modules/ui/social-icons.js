// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOCIAL ICONS UPGRADE                               ║
// ║      Replace exported icons with a self-hosted icon font                     ║
// ║                 (no inline SVGs in the DOM)                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const ICON_BY_LABEL = new Map([
  ['apple music', '<i class="ti ti-brand-apple" aria-hidden="true"></i>'],
  ['instagram', '<i class="ti ti-brand-instagram" aria-hidden="true"></i>'],
  ['linkedin', '<i class="ti ti-brand-linkedin" aria-hidden="true"></i>'],
]);

export function upgradeSocialIcons() {
  const list = document.getElementById('social-links');
  if (!list) return;

  // Idempotent: if we already upgraded one icon, bail out fast.
  if (list.querySelector('i.ti')) return;

  const links = Array.from(list.querySelectorAll('a.footer_icon-link[aria-label]'));
  for (const a of links) {
    const label = (a.getAttribute('aria-label') || '').trim().toLowerCase();
    const iconHtml = ICON_BY_LABEL.get(label);
    if (!iconHtml) continue;

    const existingSvg = a.querySelector('svg');
    if (existingSvg) {
      // Replace only the icon; preserve the screen-reader text span.
      a.insertAdjacentHTML('afterbegin', iconHtml);
      existingSvg.remove();
    } else {
      a.insertAdjacentHTML('afterbegin', iconHtml);
    }
  }
}

