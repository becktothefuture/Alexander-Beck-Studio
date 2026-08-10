export const MAX_SUPPORTED_VIEWPORT_RATIO = 2.75;
export const MIN_SUPPORTED_LANDSCAPE_VIEWPORT_HEIGHT = 700;
export const MAX_MOBILE_LANDSCAPE_WIDTH = 900;
export const MAX_MOBILE_LANDSCAPE_HEIGHT = 480;

export function getViewportCoverMode(
  width,
  height,
  maxRatio = MAX_SUPPORTED_VIEWPORT_RATIO,
) {
  const resolvedWidth = Number(width);
  const resolvedHeight = Number(height);
  const resolvedMaxRatio = Number(maxRatio);

  if (
    !Number.isFinite(resolvedWidth)
    || !Number.isFinite(resolvedHeight)
    || !Number.isFinite(resolvedMaxRatio)
    || resolvedWidth <= 0
    || resolvedHeight <= 0
    || resolvedMaxRatio <= 1
  ) {
    return null;
  }

  const ratio = resolvedWidth / resolvedHeight;
  if (ratio > resolvedMaxRatio) return 'wide';
  if (ratio < 1 / resolvedMaxRatio) return 'tall';
  if (
    resolvedWidth > resolvedHeight
    && resolvedWidth <= MAX_MOBILE_LANDSCAPE_WIDTH
    && resolvedHeight <= MAX_MOBILE_LANDSCAPE_HEIGHT
  ) {
    return 'mobile-landscape';
  }
  if (
    resolvedWidth > resolvedHeight
    && resolvedHeight < MIN_SUPPORTED_LANDSCAPE_VIEWPORT_HEIGHT
  ) {
    return 'short';
  }
  return null;
}
