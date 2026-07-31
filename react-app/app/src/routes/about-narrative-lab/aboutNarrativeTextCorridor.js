const ABOUT_NARRATIVE_TEXT_CORRIDOR_PROFILE_METRICS = Object.freeze({
  desktop: Object.freeze({
    outerViewportWidthPx: 1440,
    viewportWidthPx: 1420,
    minimumInsetPx: 20,
    fluidInsetRatio: 0.09,
    maximumInsetPx: 144,
  }),
  mobile: Object.freeze({
    outerViewportWidthPx: 390,
    viewportWidthPx: 370,
    minimumInsetPx: 24,
    fluidInsetRatio: 0,
    maximumInsetPx: 24,
  }),
});

const POSITION_MAP_EDGE_INSET = 0.06;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function getAboutNarrativePositionMapCorridor(
  readingWidthRem,
  profile = 'desktop',
  { rootFontSizePx = 16 } = {},
) {
  const metrics = ABOUT_NARRATIVE_TEXT_CORRIDOR_PROFILE_METRICS[profile]
    || ABOUT_NARRATIVE_TEXT_CORRIDOR_PROFILE_METRICS.desktop;
  const viewportWidth = metrics.viewportWidthPx;
  const fluidInset = metrics.outerViewportWidthPx * metrics.fluidInsetRatio;
  const inset = clamp(fluidInset, metrics.minimumInsetPx, metrics.maximumInsetPx);
  const availableWidth = Math.max(1, viewportWidth - (inset * 2));
  const requestedWidth = Math.max(
    1,
    finiteOr(readingWidthRem, 58) * Math.max(1, finiteOr(rootFontSizePx, 16)),
  );
  const corridorWidth = Math.min(requestedWidth, availableWidth);
  const normalizedInset = (viewportWidth - corridorWidth) / (viewportWidth * 2);
  const min = clamp(normalizedInset, POSITION_MAP_EDGE_INSET, 0.44);
  const max = 1 - min;
  return Object.freeze({
    min,
    max,
    width: max - min,
    corridorWidthPx: corridorWidth,
    viewportWidthPx: viewportWidth,
  });
}

function getDisciplineCopyWidth(
  labelWidth,
  labelOffset,
  corridorLeft,
  corridorRight,
) {
  const left = finiteOr(corridorLeft, 0);
  const right = Math.max(left, finiteOr(corridorRight, left));
  const availableWidth = right - left;
  const offset = clamp(finiteOr(labelOffset, 0), 0, availableWidth);
  return clamp(finiteOr(labelWidth, 0), 0, Math.max(0, availableWidth - offset));
}

export function getAboutNarrativeDisciplineLabelNudge({
  anchorX,
  labelWidth,
  labelOffset = 0,
  corridorLeft,
  corridorRight,
  side = 1,
}) {
  const left = finiteOr(corridorLeft, 0);
  const right = Math.max(left, finiteOr(corridorRight, left));
  const availableWidth = right - left;
  const offset = clamp(finiteOr(labelOffset, 0), 0, availableWidth);
  const width = clamp(finiteOr(labelWidth, 0), 0, Math.max(0, availableWidth - offset));
  const anchor = finiteOr(anchorX, left);
  const proposedLeft = Number(side) < 0
    ? anchor - offset - width
    : anchor + offset;
  const containedLeft = clamp(proposedLeft, left, Math.max(left, right - width));
  return Math.round((containedLeft - proposedLeft) * 100) / 100;
}

export function getAboutNarrativeDisciplinePointMinX(
  labelWidth,
  labelOffset,
  corridorLeft,
  corridorRight,
  side = 1,
) {
  const left = finiteOr(corridorLeft, 0);
  const right = Math.max(left, finiteOr(corridorRight, left));
  const offset = clamp(finiteOr(labelOffset, 0), 0, right - left);
  const width = getDisciplineCopyWidth(labelWidth, offset, left, right);
  return Number(side) < 0 ? Math.min(right, left + offset + width) : left;
}

export function getAboutNarrativeDisciplinePointMaxX(
  labelWidth,
  labelOffset,
  corridorLeft,
  corridorRight,
  side = 1,
) {
  const left = finiteOr(corridorLeft, 0);
  const right = Math.max(left, finiteOr(corridorRight, left));
  const offset = clamp(finiteOr(labelOffset, 0), 0, right - left);
  const width = getDisciplineCopyWidth(labelWidth, offset, left, right);
  return Number(side) < 0 ? right : Math.max(left, right - offset - width);
}

export function getAboutNarrativeHorizontalCorridorOverflow(value, min, max) {
  const left = finiteOr(min, 0);
  const right = Math.max(left, finiteOr(max, left));
  const position = finiteOr(value, left);
  if (position < left) return left - position;
  if (position > right) return position - right;
  return 0;
}

export function isAboutNarrativeRectInsideCorridor(rect, corridor, tolerance = 1) {
  if (!rect || !corridor) return false;
  const inset = Math.max(0, finiteOr(tolerance, 1));
  return finiteOr(rect.left, Number.NEGATIVE_INFINITY) >= finiteOr(corridor.left, 0) - inset
    && finiteOr(rect.right, Number.POSITIVE_INFINITY) <= finiteOr(corridor.right, 0) + inset;
}
