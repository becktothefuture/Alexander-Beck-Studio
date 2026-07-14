export const FRAME_INSET_MOBILE_VIEWPORT_PX = 480;
export const FRAME_INSET_DESKTOP_VIEWPORT_PX = 991;
export const DEFAULT_FRAME_INSET_MOBILE_PX = 10;
export const DEFAULT_FRAME_INSET_DESKTOP_PX = 16;

function parseInsetPx(value, fallback) {
  const numeric = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function formatCssNumber(value) {
  return String(Number(Number(value).toFixed(9)));
}

export function resolveFrameInsetEndpoints(layout = {}) {
  const mobile = parseInsetPx(layout.frameInsetMobile, DEFAULT_FRAME_INSET_MOBILE_PX);
  const desktop = Math.max(
    mobile,
    parseInsetPx(layout.frameInsetDesktop, DEFAULT_FRAME_INSET_DESKTOP_PX)
  );

  return { mobile, desktop };
}

export function resolveResponsiveFrameInsetPx({
  mobile = DEFAULT_FRAME_INSET_MOBILE_PX,
  desktop = DEFAULT_FRAME_INSET_DESKTOP_PX,
  viewportWidth = FRAME_INSET_DESKTOP_VIEWPORT_PX,
} = {}) {
  const safeMobile = Math.max(0, Number(mobile) || 0);
  const safeDesktop = Math.max(safeMobile, Number(desktop) || safeMobile);
  const width = Number.isFinite(Number(viewportWidth))
    ? Number(viewportWidth)
    : FRAME_INSET_DESKTOP_VIEWPORT_PX;
  const progress = Math.min(1, Math.max(0, (
    width - FRAME_INSET_MOBILE_VIEWPORT_PX
  ) / (
    FRAME_INSET_DESKTOP_VIEWPORT_PX - FRAME_INSET_MOBILE_VIEWPORT_PX
  )));

  return safeMobile + ((safeDesktop - safeMobile) * progress);
}

export function buildResponsiveFrameInsetCss({ mobile, desktop }) {
  const safeMobile = Math.max(0, Number(mobile) || 0);
  const safeDesktop = Math.max(safeMobile, Number(desktop) || safeMobile);
  if (safeMobile === safeDesktop) return `${formatCssNumber(safeMobile)}px`;

  const widthRange = FRAME_INSET_DESKTOP_VIEWPORT_PX - FRAME_INSET_MOBILE_VIEWPORT_PX;
  const slopeVw = ((safeDesktop - safeMobile) / widthRange) * 100;
  const interceptPx = safeMobile - ((slopeVw * FRAME_INSET_MOBILE_VIEWPORT_PX) / 100);

  return `clamp(${formatCssNumber(safeMobile)}px, calc(${formatCssNumber(interceptPx)}px + ${formatCssNumber(slopeVw)}vw), ${formatCssNumber(safeDesktop)}px)`;
}
