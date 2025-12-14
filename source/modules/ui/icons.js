// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               UI ICONS                                       ║
// ║              24px line icons (rounded caps/joins)                            ║
// ║          No external deps · inline SVG strings                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// NOTE: We keep all icons on a 24×24 viewBox and rely on CSS for sizing.
// Each SVG uses stroke-based rendering for consistent, crisp line icons.

export const ICON_SOUND_OFF = `
<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M11 5L6.5 8.5H3v7h3.5L11 19V5z" />
  <path d="M16 9l5 5" />
  <path d="M21 9l-5 5" />
</svg>
`;

export const ICON_SOUND_ON = `
<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M11 5L6.5 8.5H3v7h3.5L11 19V5z" />
  <path d="M15.5 9.5a4 4 0 0 1 0 5" />
  <path d="M18.5 7.5a7 7 0 0 1 0 9" />
</svg>
`;

export const ICON_INSTAGRAM = `
<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <rect x="7" y="7" width="10" height="10" rx="3" />
  <path d="M10.2 12a1.8 1.8 0 1 0 3.6 0 1.8 1.8 0 0 0-3.6 0z" />
  <path d="M16.5 7.5h.01" />
</svg>
`;

export const ICON_LINKEDIN = `
<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M6.5 10.5V18" />
  <path d="M6.5 7.5h.01" />
  <path d="M10.5 10.5V18" />
  <path d="M10.5 13c0-1.6 1-2.6 2.4-2.6 1.5 0 2.6 1 2.6 3V18" />
  <rect x="4" y="4" width="16" height="16" rx="4" />
</svg>
`;

// Apple logo (line icon) for Apple Music
// Source shape: Lucide "apple" (24x24 stroke icon), adapted to our svg wrapper.
export const ICON_MUSIC = `
<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" />
  <path d="M10 2c1 .5 2 2 2 5" />
</svg>
`;
