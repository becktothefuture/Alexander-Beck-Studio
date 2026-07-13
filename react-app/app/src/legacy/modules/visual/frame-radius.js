export const FRAME_RADIUS_MOBILE_VIEWPORT_PX = 480;
export const FRAME_RADIUS_DESKTOP_VIEWPORT_PX = 991;
export const DEFAULT_FRAME_RADIUS_MOBILE_PX = 20;
export const DEFAULT_FRAME_RADIUS_DESKTOP_PX = 32;

function parseRadiusPx(value, fallback) {
  const numeric = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

function formatCssNumber(value) {
  return String(Number(Number(value).toFixed(9)));
}

export function resolveFrameRadiusEndpoints(layout = {}) {
  const mobile = parseRadiusPx(
    layout.frameRadiusMobile,
    DEFAULT_FRAME_RADIUS_MOBILE_PX
  );
  const desktop = Math.max(
    mobile,
    parseRadiusPx(layout.frameRadiusDesktop, DEFAULT_FRAME_RADIUS_DESKTOP_PX)
  );

  return { mobile, desktop };
}

export function resolveResponsiveFrameRadiusPx({
  mobile = DEFAULT_FRAME_RADIUS_MOBILE_PX,
  desktop = DEFAULT_FRAME_RADIUS_DESKTOP_PX,
  viewportWidth = FRAME_RADIUS_DESKTOP_VIEWPORT_PX,
} = {}) {
  const safeMobile = Math.max(0, Number(mobile) || 0);
  const safeDesktop = Math.max(safeMobile, Number(desktop) || safeMobile);
  const width = Number.isFinite(Number(viewportWidth))
    ? Number(viewportWidth)
    : FRAME_RADIUS_DESKTOP_VIEWPORT_PX;
  const progress = Math.min(1, Math.max(0, (
    width - FRAME_RADIUS_MOBILE_VIEWPORT_PX
  ) / (
    FRAME_RADIUS_DESKTOP_VIEWPORT_PX - FRAME_RADIUS_MOBILE_VIEWPORT_PX
  )));

  return safeMobile + ((safeDesktop - safeMobile) * progress);
}

export function buildResponsiveFrameRadiusCss({ mobile, desktop }) {
  const safeMobile = Math.max(0, Number(mobile) || 0);
  const safeDesktop = Math.max(safeMobile, Number(desktop) || safeMobile);
  if (safeMobile === safeDesktop) return `${formatCssNumber(safeMobile)}px`;

  const widthRange = FRAME_RADIUS_DESKTOP_VIEWPORT_PX - FRAME_RADIUS_MOBILE_VIEWPORT_PX;
  const slopeVw = ((safeDesktop - safeMobile) / widthRange) * 100;
  const interceptPx = safeMobile - ((slopeVw * FRAME_RADIUS_MOBILE_VIEWPORT_PX) / 100);

  return `clamp(${formatCssNumber(safeMobile)}px, calc(${formatCssNumber(interceptPx)}px + ${formatCssNumber(slopeVw)}vw), ${formatCssNumber(safeDesktop)}px)`;
}
