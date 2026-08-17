import { ABOUT_NARRATIVE_POINT_PROFILES } from './aboutNarrativeRuntimeConstants.js';

export const ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS = Object.freeze({
  x: Object.freeze({ min: 0.24, max: 0.7 }),
  y: Object.freeze({ min: 0.36, max: 0.82 }),
});

export const ABOUT_NARRATIVE_DISCIPLINE_SPACING_BOUNDS = Object.freeze({ min: 2, max: 8 });
export const ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION = 0.01;

export const ABOUT_NARRATIVE_DISCIPLINE_LAYOUT_DEFAULTS = Object.freeze({
  anchor: Object.freeze([48 / 126, 57 / 94]),
  tabletAnchor: Object.freeze([31 / 81, 36 / 60]),
  mobileAnchor: Object.freeze([31 / 81, 36 / 60]),
  spacingRows: 2,
  tabletSpacingRows: 3,
  mobileSpacingRows: 3,
});

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

function layoutFields(profile) {
  if (profile === 'mobile') return ['mobileAnchor', 'mobileSpacingRows'];
  if (profile === 'tablet') return ['tabletAnchor', 'tabletSpacingRows'];
  return ['anchor', 'spacingRows'];
}

export function getAboutNarrativeDisciplineGroupLayout(parameters = {}, profile = 'desktop') {
  const [anchorField, spacingField] = layoutFields(profile);
  const anchorCandidate = parameters?.[anchorField]
    || (profile !== 'desktop' ? parameters?.anchor : null)
    || ABOUT_NARRATIVE_DISCIPLINE_LAYOUT_DEFAULTS[anchorField];
  const spacingCandidate = parameters?.[spacingField]
    ?? (profile !== 'desktop' ? parameters?.spacingRows : null)
    ?? ABOUT_NARRATIVE_DISCIPLINE_LAYOUT_DEFAULTS[spacingField];
  const spacingRows = Math.round(clamp(
    spacingCandidate,
    ABOUT_NARRATIVE_DISCIPLINE_SPACING_BOUNDS.min,
    ABOUT_NARRATIVE_DISCIPLINE_SPACING_BOUNDS.max,
  ));
  const bounds = getCellBounds(profile);
  const [requestedColumn, requestedRow] = getAboutNarrativeDisciplineGridCell(anchorCandidate, profile);
  const topOffset = Math.floor((5 * spacingRows) / 2);
  const bottomOffset = Math.ceil((5 * spacingRows) / 2);
  const anchorRow = Math.min(
    bounds.maxRow - bottomOffset,
    Math.max(bounds.minRow + topOffset, requestedRow),
  );
  return Object.freeze({
    anchor: Object.freeze(getAboutNarrativeDisciplinePositionForGridCell(
      [requestedColumn, anchorRow],
      profile,
    )),
    anchorCell: Object.freeze([requestedColumn, anchorRow]),
    spacingRows,
    anchorField,
    spacingField,
  });
}

export function getAboutNarrativeDisciplineColumnPositions(parameters = {}, profile = 'desktop') {
  const layout = getAboutNarrativeDisciplineGroupLayout(parameters, profile);
  return Object.freeze(Array.from({ length: 6 }, (_, index) => (
    Object.freeze(getAboutNarrativeDisciplinePositionForGridCell([
      layout.anchorCell[0],
      layout.anchorCell[1] + ((index - 2.5) * layout.spacingRows),
    ], profile))
  )));
}

export function getAboutNarrativeDisciplinePosition(item, profile = 'desktop', parameters = null) {
  const groupIndex = Math.max(0, Math.min(5, Math.round(Number(item?.group || 1)) - 1));
  if (parameters) return getAboutNarrativeDisciplineColumnPositions(parameters, profile)[groupIndex];

  const field = profile === 'mobile'
    ? 'mobilePosition'
    : profile === 'tablet' ? 'tabletPosition' : 'position';
  const legacy = item?.[field]
    || (profile !== 'desktop' ? item?.position : null);
  if (legacy) {
    return getAboutNarrativeDisciplinePositionForGridCell(
      getAboutNarrativeDisciplineGridCell(legacy, profile),
      profile,
    );
  }
  return getAboutNarrativeDisciplineColumnPositions({}, profile)[groupIndex];
}

export function getAboutNarrativeDisciplineMinimumSeparation(items, profile = 'desktop', parameters = null) {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < items.length; left += 1) {
    const leftPosition = getAboutNarrativeDisciplinePosition(items[left], profile, parameters);
    for (let right = left + 1; right < items.length; right += 1) {
      const rightPosition = getAboutNarrativeDisciplinePosition(items[right], profile, parameters);
      minimum = Math.min(minimum, Math.hypot(
        leftPosition[0] - rightPosition[0],
        leftPosition[1] - rightPosition[1],
      ));
    }
  }
  return Number.isFinite(minimum) ? minimum : 1;
}

export const ABOUT_NARRATIVE_DISCIPLINE_DESKTOP_POSITIONS = getAboutNarrativeDisciplineColumnPositions({}, 'desktop');
export const ABOUT_NARRATIVE_DISCIPLINE_MOBILE_POSITIONS = getAboutNarrativeDisciplineColumnPositions({}, 'mobile');
