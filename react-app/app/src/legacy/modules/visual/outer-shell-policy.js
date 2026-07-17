export const DEFAULT_AUTHORED_FRAME = '#000000';

function normalizeFrameColor(value) {
  const color = String(value || '').trim();
  return color || DEFAULT_AUTHORED_FRAME;
}

/**
 * Resolve the exposed website frame without consulting the site theme, browser
 * family, browser scheme, or display gamut. Opaque sRGB black is zero on every
 * channel and therefore already represents true black on wide-gamut displays.
 */
export function resolveOuterFramePolicy({
  authoredFrame = DEFAULT_AUTHORED_FRAME,
} = {}) {
  const authored = normalizeFrameColor(authoredFrame);
  return { active: authored, source: 'authored-black' };
}
