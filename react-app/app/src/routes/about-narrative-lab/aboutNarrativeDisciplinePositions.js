import { ABOUT_NARRATIVE_POINT_PROFILES } from './aboutNarrativeRuntimeConstants.js';

export const ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS = Object.freeze({
  x: Object.freeze({ min: 0.3, max: 0.48 }),
  y: Object.freeze({ min: 0.54, max: 0.67 }),
});

export const ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION = 0.01;

export const ABOUT_NARRATIVE_DISCIPLINE_DESKTOP_POSITIONS = Object.freeze([
  Object.freeze([43 / 126, 58 / 94]),
  Object.freeze([52 / 126, 58 / 94]),
  Object.freeze([43 / 126, 59 / 94]),
  Object.freeze([52 / 126, 59 / 94]),
  Object.freeze([43 / 126, 60 / 94]),
  Object.freeze([52 / 126, 60 / 94]),
]);

export const ABOUT_NARRATIVE_DISCIPLINE_MOBILE_POSITIONS = Object.freeze([
  Object.freeze([31 / 81, 38 / 60]),
  Object.freeze([34 / 81, 38 / 60]),
  Object.freeze([31 / 81, 39 / 60]),
  Object.freeze([34 / 81, 39 / 60]),
  Object.freeze([31 / 81, 40 / 60]),
  Object.freeze([34 / 81, 40 / 60]),
]);

function clamp(value, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min;
}

function clean(value) {
  return Number(Number(value).toFixed(6));
}

export function getAboutNarrativeDisciplineGridDimensions(profileOrPointCount = 'desktop') {
  const pointCount = typeof profileOrPointCount === 'number'
    ? profileOrPointCount
    : ABOUT_NARRATIVE_POINT_PROFILES[
      profileOrPointCount === 'tablet' ? 'mobile' : profileOrPointCount
    ]?.pointCount
      || ABOUT_NARRATIVE_POINT_PROFILES.desktop.pointCount;
  const columns = Math.max(24, Math.floor(Math.sqrt(pointCount * 1.36)));
  return Object.freeze({ columns, rows: Math.ceil(pointCount / columns), pointCount });
}

function getCellBounds(profile) {
  const dimensions = getAboutNarrativeDisciplineGridDimensions(profile);
  return {
    columns: dimensions.columns,
    rows: dimensions.rows,
    minColumn: Math.ceil(ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x.min * (dimensions.columns - 1)),
    maxColumn: Math.floor(ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x.max * (dimensions.columns - 1)),
    minRow: Math.ceil(ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y.min * (dimensions.rows - 1)),
    maxRow: Math.floor(ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y.max * (dimensions.rows - 1)),
  };
}

export function getAboutNarrativeDisciplineGridCell(position, profile = 'desktop') {
  const bounds = getCellBounds(profile);
  return [
    Math.min(bounds.maxColumn, Math.max(
      bounds.minColumn,
      Math.round(clamp(position?.[0], 0, 1) * (bounds.columns - 1)),
    )),
    Math.min(bounds.maxRow, Math.max(
      bounds.minRow,
      Math.round(clamp(position?.[1], 0, 1) * (bounds.rows - 1)),
    )),
  ];
}

export function getAboutNarrativeDisciplinePositionForGridCell(cell, profile = 'desktop') {
  const bounds = getCellBounds(profile);
  const requestedColumn = Number(cell?.[0]);
  const requestedRow = Number(cell?.[1]);
  const column = Number.isFinite(requestedColumn)
    ? Math.min(bounds.maxColumn, Math.max(bounds.minColumn, Math.round(requestedColumn)))
    : bounds.minColumn;
  const row = Number.isFinite(requestedRow)
    ? Math.min(bounds.maxRow, Math.max(bounds.minRow, Math.round(requestedRow)))
    : bounds.minRow;
  return [
    clean(column / Math.max(1, bounds.columns - 1)),
    clean(row / Math.max(1, bounds.rows - 1)),
  ];
}

export function getAboutNarrativeDisciplineGridCellBounds(profile = 'desktop') {
  return Object.freeze(getCellBounds(profile));
}

export function getAboutNarrativeDisciplinePosition(item, profile = 'desktop') {
  const groupIndex = Math.max(0, Math.min(5, Math.round(Number(item?.group || 1)) - 1));
  const desktopFallback = ABOUT_NARRATIVE_DISCIPLINE_DESKTOP_POSITIONS[groupIndex];
  const fallback = profile === 'mobile'
    ? ABOUT_NARRATIVE_DISCIPLINE_MOBILE_POSITIONS[groupIndex]
    : desktopFallback;
  const candidate = profile === 'mobile'
    ? item?.mobilePosition || item?.tabletPosition || item?.position || fallback
    : profile === 'tablet'
      ? item?.tabletPosition || item?.position || fallback
      : item?.position || fallback;
  return getAboutNarrativeDisciplinePositionForGridCell(
    getAboutNarrativeDisciplineGridCell(candidate, profile),
    profile,
  );
}

export function getAboutNarrativeDisciplineMinimumSeparation(items, profile = 'desktop') {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < items.length; left += 1) {
    const leftPosition = getAboutNarrativeDisciplinePosition(items[left], profile);
    for (let right = left + 1; right < items.length; right += 1) {
      const rightPosition = getAboutNarrativeDisciplinePosition(items[right], profile);
      minimum = Math.min(minimum, Math.hypot(
        leftPosition[0] - rightPosition[0],
        leftPosition[1] - rightPosition[1],
      ));
    }
  }
  return Number.isFinite(minimum) ? minimum : 1;
}

function clearsOtherPositions(items, group, profile, position) {
  return items.every((item) => {
    if (Number(item?.group) === Number(group)) return true;
    const other = getAboutNarrativeDisciplinePosition(item, profile);
    return Math.hypot(position[0] - other[0], position[1] - other[1])
      >= ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION - 0.000001;
  });
}

export function constrainAboutNarrativeDisciplinePosition(items, group, profile, requested) {
  const cellBounds = getCellBounds(profile);
  const targetCell = getAboutNarrativeDisciplineGridCell(requested, profile);
  const target = getAboutNarrativeDisciplinePositionForGridCell(targetCell, profile);
  if (clearsOtherPositions(items, group, profile, target)) return target;

  const currentItem = items.find((item) => Number(item?.group) === Number(group));
  const current = getAboutNarrativeDisciplinePosition(currentItem, profile);
  let best = clearsOtherPositions(items, group, profile, current) ? current : null;
  let bestDistance = best
    ? Math.hypot(best[0] - target[0], best[1] - target[1])
    : Number.POSITIVE_INFINITY;
  let bestCurrentDistance = best ? 0 : Number.POSITIVE_INFINITY;

  for (let column = cellBounds.minColumn; column <= cellBounds.maxColumn; column += 1) {
    for (let row = cellBounds.minRow; row <= cellBounds.maxRow; row += 1) {
      const candidate = getAboutNarrativeDisciplinePositionForGridCell([column, row], profile);
      if (!clearsOtherPositions(items, group, profile, candidate)) continue;
      const distance = Math.hypot(candidate[0] - target[0], candidate[1] - target[1]);
      const currentDistance = Math.hypot(candidate[0] - current[0], candidate[1] - current[1]);
      if (distance < bestDistance - 0.000001
        || (Math.abs(distance - bestDistance) <= 0.000001 && currentDistance < bestCurrentDistance)) {
        best = candidate;
        bestDistance = distance;
        bestCurrentDistance = currentDistance;
      }
    }
  }

  return best || current;
}
