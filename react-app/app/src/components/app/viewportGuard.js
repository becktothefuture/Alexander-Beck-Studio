export const MAX_SUPPORTED_VIEWPORT_RATIO = 2.75;

export function getExtremeViewportMode(
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
  return null;
}
