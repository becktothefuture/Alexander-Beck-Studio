import { createDepthPackingBounds, getProjectParallaxFactor } from './projectDepth.js';
import { quantizeCells } from './world.js';

const PLACEMENT_PRESETS = new Set(['salon', 'balanced', 'loose', 'clustered']);
const MAX_DIAGNOSTIC_ISSUES = 12;
const DEFAULT_MAX_CANDIDATES_PER_PASS = 4096;
const DEFAULT_MAX_PASSES = 4;
const SALON_CLEARANCE_CANDIDATES_PER_PASS = 512;
const SALON_PADDED_OCCUPANCY = 0.64;
const SALON_COVERAGE_AXIS_LIMIT = 24;
const DEFAULT_SALON_COLUMNS = 128;
const DEFAULT_SALON_ROWS = 96;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function toFiniteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hashString(value, seed = 2166136261) {
  let hash = seed >>> 0;
  const source = String(value);
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hashPlacementValue(seed, itemId, salt = 0) {
  let hash = hashString(itemId, (Number(seed) >>> 0) ^ 0x9e3779b9);
  hash ^= Number(salt) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x21f0aaad);
  hash = Math.imul(hash ^ (hash >>> 15), 0x735a2d97);
  return (hash ^ (hash >>> 15)) >>> 0;
}

export function placementRandomUnit(seed, itemId, salt = 0) {
  return hashPlacementValue(seed, itemId, salt) / 4294967296;
}

export class PlaygroundPlacementError extends Error {
  constructor(code, message, issues = []) {
    super(message);
    this.name = 'PlaygroundPlacementError';
    this.code = code;
    this.issues = issues.slice(0, MAX_DIAGNOSTIC_ISSUES);
    this.omittedIssueCount = Math.max(0, issues.length - this.issues.length);
  }
}

function normalizeCellRect(rect, fallback = null) {
  if (!rect || typeof rect !== 'object') return fallback;
  const left = toFiniteNumber(rect.left, toFiniteNumber(rect.x, NaN));
  const top = toFiniteNumber(rect.top, toFiniteNumber(rect.y, NaN));
  const right = toFiniteNumber(
    rect.right,
    Number.isFinite(left) ? left + toFiniteNumber(rect.width, NaN) : NaN,
  );
  const bottom = toFiniteNumber(
    rect.bottom,
    Number.isFinite(top) ? top + toFiniteNumber(rect.height, NaN) : NaN,
  );
  if (![left, top, right, bottom].every(Number.isFinite) || right < left || bottom < top) {
    return fallback;
  }
  return { left, top, right, bottom };
}

export function pixelRectToCellRect(rect, gridSpacingPx, originX = 0, originY = 0) {
  const spacing = Number(gridSpacingPx);
  if (!Number.isFinite(spacing) || spacing <= 0) {
    throw new RangeError('gridSpacingPx must be greater than zero.');
  }
  const normalized = normalizeCellRect(rect);
  if (!normalized) {
    throw new TypeError('A finite pixel rectangle is required.');
  }
  return {
    left: Math.floor((normalized.left - originX) / spacing),
    top: Math.floor((normalized.top - originY) / spacing),
    right: Math.ceil((normalized.right - originX) / spacing),
    bottom: Math.ceil((normalized.bottom - originY) / spacing),
  };
}

function expandRect(rect, amount) {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    right: rect.right + amount,
    bottom: rect.bottom + amount,
  };
}

export function cellRectsOverlap(left, right, gapCells = 0) {
  const gap = Math.max(0, Number(gapCells) || 0);
  return !(
    left.right + gap <= right.left
    || right.right + gap <= left.left
    || left.bottom + gap <= right.top
    || right.bottom + gap <= left.top
  );
}

function wrapDirectionalDelta(delta, period) {
  if (!Number.isFinite(period) || period <= 0) return delta;
  return delta - (Math.round(delta / period) * period);
}

/**
 * Finds the closest toroidal neighbour in one cardinal direction. This keeps
 * keyboard movement spatial even when the nearest visual copy crosses a seam.
 */
export function findDirectionalPlaygroundItem(
  placements,
  currentId,
  direction,
  world = {},
) {
  if (!Array.isArray(placements) || !placements.length) return null;
  const axis = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  }[direction];
  if (!axis) return null;
  const current = placements.find((placement) => placement.id === currentId);
  if (!current) return null;
  const currentX = current.xCell + (current.footprintWidthCells / 2);
  const currentY = current.yCell + (current.footprintHeightCells / 2);
  const cameraX = Number(world.cameraXCells);
  const cameraY = Number(world.cameraYCells);
  const hasCamera = Number.isFinite(cameraX) && Number.isFinite(cameraY);
  const currentParallax = world.reducedMotion ? 1 : current.parallax || 1;
  const currentScreenX = wrapDirectionalDelta(currentX - cameraX, Number(world.columns)) * currentParallax;
  const currentScreenY = wrapDirectionalDelta(currentY - cameraY, Number(world.rows)) * currentParallax;
  let best = null;
  let bestScore = Infinity;

  placements.forEach((candidate) => {
    if (candidate.id === currentId) return;
    const candidateX = candidate.xCell + (candidate.footprintWidthCells / 2);
    const candidateY = candidate.yCell + (candidate.footprintHeightCells / 2);
    const parallax = world.reducedMotion ? 1 : candidate.parallax || 1;
    const deltaX = hasCamera
      ? wrapDirectionalDelta(candidateX - cameraX, Number(world.columns)) * parallax - currentScreenX
      : wrapDirectionalDelta(candidateX - currentX, Number(world.columns));
    const deltaY = hasCamera
      ? wrapDirectionalDelta(candidateY - cameraY, Number(world.rows)) * parallax - currentScreenY
      : wrapDirectionalDelta(candidateY - currentY, Number(world.rows));
    const forward = (deltaX * axis.x) + (deltaY * axis.y);
    if (forward <= 0.001) return;
    const cross = Math.abs((deltaX * axis.y) - (deltaY * axis.x));
    const score = Math.hypot(deltaX, deltaY) + (cross * 1.5);
    if (score < bestScore || (score === bestScore
      && candidate.placementOrder < best?.placementOrder)) {
      best = candidate;
      bestScore = score;
    }
  });

  return best;
}

export function resolveItemGridFootprint(item, options = {}) {
  const gridSpacingPx = toFiniteNumber(options.gridSpacingPx, 48);
  const itemScale = toFiniteNumber(options.itemScale, 1);
  const sizeVariation = clamp(toFiniteNumber(options.sizeVariation, 0.28), 0, 0.9);
  const seed = toFiniteNumber(options.layoutSeed, 1);
  const preferredWidthCells = item?.preferredWidthCells ?? item?.preferredGridSpan?.columns;
  const preferredHeightCells = item?.preferredHeightCells ?? item?.preferredGridSpan?.rows;
  const widthBase = Math.max(1, Math.round(toFiniteNumber(preferredWidthCells, 1)));
  const heightBase = Math.max(1, Math.round(toFiniteNumber(preferredHeightCells, 1)));
  const variationSample = (placementRandomUnit(seed, item?.id, 0x51a9) * 2) - 1;
  const caseStudy = item?.kind === 'case-study';
  const snippet = item?.kind === 'snippet';
  const variation = caseStudy ? Math.min(0.1, sizeVariation) : sizeVariation;
  const scale = Math.max(0.1, itemScale * (snippet ? 0.62 : 1)
    * (1 + (variationSample * variation)));
  const intrinsicRatio = Number(item?.intrinsicDimensions?.width)
    / Number(item?.intrinsicDimensions?.height);
  const aspectRatio = caseStudy ? 4 / 5 : intrinsicRatio;
  let mediaWidthCells = Math.max(1, Math.round(widthBase * scale));
  let mediaHeightCells = Math.max(1, Math.round(heightBase * scale));
  if ((caseStudy || snippet) && Number.isFinite(aspectRatio) && aspectRatio > 0) {
    const maximumWidth = caseStudy ? 15 : Math.min(10, 10 * aspectRatio);
    mediaWidthCells = Math.max(1, Math.min(mediaWidthCells, Math.floor(maximumWidth)));
    mediaWidthCells *= Math.max(0.1, toFiniteNumber(options.itemViewportScale, 1));
    if (caseStudy) {
      mediaWidthCells = Math.min(mediaWidthCells,
        toFiniteNumber(options.maximumCaseStudyWidthPx, Infinity) / gridSpacingPx);
    }
    // Only the packing footprint is quantized. Rounding both media axes distorts
    // the authored ratio and forces the opening animation to repair it visibly.
    mediaHeightCells = mediaWidthCells / aspectRatio;
  }
  const label = String(item?.label || '').trim();
  const description = caseStudy || snippet ? '' : String(item?.description || '').trim();
  const typeLabel = caseStudy ? `${item.client || ''} · Case study`
    : (options.includeTypeRow === false ? '' : String(item?.type || '').trim());
  const hasLabelBlock = Boolean(label || typeLabel || description);
  const labelGapCells = hasLabelBlock
    ? Math.max(0, Math.ceil(toFiniteNumber(options.labelGapPx, 8) / gridSpacingPx))
    : 0;
  const labelFontSizePx = Math.max(caseStudy ? 24 : 1, toFiniteNumber(options.labelFontSizePx, 14));
  const labelLineHeightPx = Math.max(caseStudy ? 28 : labelFontSizePx,
    toFiniteNumber(options.labelLineHeightPx, 18));
  const typeFontSizePx = Math.max(1, toFiniteNumber(options.labelTypeFontSizePx, 10));
  const typeLineHeightPx = Math.max(
    typeFontSizePx,
    toFiniteNumber(options.labelTypeLineHeightPx, 12),
  );
  const descriptionFontSizePx = Math.max(
    1,
    toFiniteNumber(options.labelDescriptionFontSizePx, 13),
  );
  const descriptionLineHeightPx = Math.max(
    descriptionFontSizePx,
    toFiniteNumber(options.labelDescriptionLineHeightPx, 18),
  );
  const innerGapPx = Math.max(0, toFiniteNumber(options.labelInnerGapPx, 4));
  const labelMeasurePx = Math.max(gridSpacingPx, mediaWidthCells * gridSpacingPx);
  const estimatedLabelWidthPx = label.length * labelFontSizePx * 0.62;
  const estimatedDescriptionWidthPx = description.length * descriptionFontSizePx * 0.62;
  const labelLineCount = label
    ? (snippet ? 1 : clamp(Math.ceil(estimatedLabelWidthPx / labelMeasurePx), 1, caseStudy ? 3 : 2))
    : 0;
  const labelTypeLineCount = typeLabel ? 1 : 0;
  const labelDescriptionLineCount = description
    ? Math.max(1, Math.ceil(estimatedDescriptionWidthPx / labelMeasurePx))
    : 0;
  let labelBlockHeightPx = labelLineCount * labelLineHeightPx;
  if (labelTypeLineCount) {
    if (labelBlockHeightPx > 0) labelBlockHeightPx += innerGapPx;
    labelBlockHeightPx += typeLineHeightPx;
  }
  if (labelDescriptionLineCount) {
    if (labelBlockHeightPx > 0) labelBlockHeightPx += innerGapPx;
    labelBlockHeightPx += labelDescriptionLineCount * descriptionLineHeightPx;
  }
  const labelHeightCells = hasLabelBlock
    ? Math.max(1, Math.ceil(labelBlockHeightPx / gridSpacingPx))
    : 0;
  return {
    mediaWidthCells,
    mediaHeightCells,
    labelGapCells,
    labelHeightCells,
    labelTitleLineCount: labelLineCount,
    labelTypeLineCount,
    labelDescriptionLineCount,
    labelBlockHeightPx,
    footprintWidthCells: mediaWidthCells,
    footprintHeightCells: Math.ceil(mediaHeightCells) + labelGapCells + labelHeightCells,
    scale,
  };
}

function squareSpiralCoordinate(index, target) {
  if (index <= 0) {
    target.x = 0;
    target.y = 0;
    return target;
  }
  const ring = Math.ceil((Math.sqrt(index + 1) - 1) / 2);
  const sideLength = ring * 2;
  const maximum = ((ring * 2) + 1) ** 2 - 1;
  const offset = maximum - index;
  const side = Math.floor(offset / sideLength);
  const position = offset % sideLength;
  if (side === 0) {
    target.x = ring - position;
    target.y = ring;
  } else if (side === 1) {
    target.x = -ring;
    target.y = ring - position;
  } else if (side === 2) {
    target.x = -ring + position;
    target.y = -ring;
  } else {
    target.x = ring;
    target.y = -ring + position;
  }
  return target;
}

function rotateQuarterTurns(x, y, turns, target) {
  const normalized = ((turns % 4) + 4) % 4;
  if (normalized === 1) {
    target.x = -y;
    target.y = x;
  } else if (normalized === 2) {
    target.x = -x;
    target.y = -y;
  } else if (normalized === 3) {
    target.x = y;
    target.y = -x;
  } else {
    target.x = x;
    target.y = y;
  }
  return target;
}

function quantizeSalonCoordinate(value) {
  return Math.round(value * 4) / 4;
}

function radicalInverse(index, base) {
  let value = Math.max(0, Math.floor(index));
  let fraction = 1 / base;
  let result = 0;
  while (value > 0) {
    result += (value % base) * fraction;
    value = Math.floor(value / base);
    fraction /= base;
  }
  return result;
}

function placementPassScale(preset, passIndex) {
  const pass = Math.max(0, Math.floor(passIndex));
  // A crowded field grows a little at a time. Doubling one overflow item's
  // search region creates the very large empty corridors between repeats.
  return preset === 'salon' ? 1 + (pass / 8) : 2 ** pass;
}

/**
 * Generates one deterministic cell candidate. Salon uses quarter-cells; the
 * other presets use integer cells. The caller owns target.
 * Later passes expand the same stable search rather than using unbounded retries.
 */
export function writePlacementCandidate({
  preset = 'balanced',
  seed = 1,
  itemId = '',
  placementOrder = 0,
  candidateIndex = 0,
  passIndex = 0,
  footprintWidthCells = 1,
  footprintHeightCells = 1,
  salonColumns = DEFAULT_SALON_COLUMNS,
  salonRows = DEFAULT_SALON_ROWS,
}, target) {
  if (!target || typeof target !== 'object') {
    throw new TypeError('A target object is required.');
  }
  if (!PLACEMENT_PRESETS.has(preset)) {
    throw new RangeError(`Unknown layout preset "${preset}".`);
  }
  const passScale = placementPassScale(preset, passIndex);
  const phaseHash = hashPlacementValue(seed, itemId, placementOrder);
  const turns = phaseHash & 3;
  const reflected = ((phaseHash >>> 2) & 1) === 1;
  const scratch = target;

  if (preset === 'salon') {
    const columns = Math.max(1, Number(salonColumns) * passScale);
    const rows = Math.max(1, Number(salonRows) * passScale);
    const phaseX = placementRandomUnit(seed, itemId, 0x5a10);
    const phaseY = placementRandomUnit(seed, itemId, 0x7319);
    const sequenceIndex = candidateIndex + 1;
    const unitX = (radicalInverse(sequenceIndex, 2) + phaseX) % 1;
    const unitY = (radicalInverse(sequenceIndex, 3) + phaseY) % 1;
    // Distribute centres over the entire torus. A footprint may straddle an
    // edge; its neighbouring render copy completes it without an empty border.
    scratch.x = quantizeSalonCoordinate(
      (unitX - 0.5) * columns - footprintWidthCells / 2,
    );
    scratch.y = quantizeSalonCoordinate(
      (unitY - 0.5) * rows - footprintHeightCells / 2,
    );
    return scratch;
  }

  if (preset === 'clustered') {
    const clusterCount = 5;
    const clusterIndex = hashPlacementValue(seed, itemId, 0xc1a5) % clusterCount;
    const clusterAngle = ((clusterIndex / clusterCount) * Math.PI * 2)
      + (placementRandomUnit(seed, 'cluster-phase', 0x7781) * GOLDEN_ANGLE);
    const clusterRadius = (12 + (Math.floor(placementOrder / clusterCount) * 2)) * passScale;
    const anchorX = Math.round(Math.cos(clusterAngle) * clusterRadius);
    const anchorY = Math.round(Math.sin(clusterAngle) * clusterRadius);
    squareSpiralCoordinate(candidateIndex, scratch);
    rotateQuarterTurns(scratch.x, reflected ? -scratch.y : scratch.y, turns, scratch);
    const localStride = 1;
    scratch.x = anchorX + (scratch.x * localStride * passScale);
    scratch.y = anchorY + (scratch.y * localStride * passScale);
  } else {
    const orderOffset = preset === 'loose'
      ? Math.max(0, Math.floor(placementOrder)) * 3
      : 0;
    squareSpiralCoordinate(candidateIndex + orderOffset, scratch);
    rotateQuarterTurns(scratch.x, reflected ? -scratch.y : scratch.y, turns, scratch);
    const stride = preset === 'loose' ? 3 : 1;
    scratch.x *= stride * passScale;
    scratch.y *= stride * passScale;
  }

  scratch.x = Math.round(scratch.x - (footprintWidthCells / 2));
  scratch.y = Math.round(scratch.y - (footprintHeightCells / 2));
  return scratch;
}

function validatePlacementInput(items, options) {
  const issues = [];
  const ids = new Set();
  const orders = new Set();
  if (!Array.isArray(items)) issues.push('items must be an array.');
  const source = Array.isArray(items) ? items : [];
  for (let index = 0; index < source.length && issues.length <= MAX_DIAGNOSTIC_ISSUES; index += 1) {
    const item = source[index];
    const id = String(item?.id || '').trim();
    const order = Number(item?.placementOrder);
    if (!id) issues.push(`items[${index}].id must be non-empty.`);
    else if (ids.has(id)) issues.push(`Duplicate item id "${id}".`);
    ids.add(id);
    if (!Number.isInteger(order) || order < 0) {
      issues.push(`Item "${id || index}" needs a non-negative integer placementOrder.`);
    } else if (orders.has(order)) {
      issues.push(`Duplicate placementOrder ${order}.`);
    }
    orders.add(order);
    const preferredWidthCells = item?.preferredWidthCells ?? item?.preferredGridSpan?.columns;
    const preferredHeightCells = item?.preferredHeightCells ?? item?.preferredGridSpan?.rows;
    if (!Number.isFinite(Number(preferredWidthCells)) || Number(preferredWidthCells) <= 0) {
      issues.push(`Item "${id || index}" needs preferredWidthCells greater than zero.`);
    }
    if (!Number.isFinite(Number(preferredHeightCells)) || Number(preferredHeightCells) <= 0) {
      issues.push(`Item "${id || index}" needs preferredHeightCells greater than zero.`);
    }
    if (item?.preferredAnchorCells != null) {
      const anchorX = Number(item.preferredAnchorCells?.x);
      const anchorY = Number(item.preferredAnchorCells?.y);
      if (!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) {
        issues.push(`Item "${id || index}" needs a finite preferredAnchorCells x and y.`);
      }
    }
  }
  const preset = options.layoutPreset ?? 'balanced';
  if (!PLACEMENT_PRESETS.has(preset)) issues.push(`Unknown layoutPreset "${preset}".`);
  const numericChecks = [
    ['gridSpacingPx', options.gridSpacingPx ?? 48, 1, Infinity],
    ['itemScale', options.itemScale ?? 1, 0.1, 8],
    ['sizeVariation', options.sizeVariation ?? 0.28, 0, 0.9],
    ['projectSpacing', options.projectSpacing ?? 1.5, 1, 4],
    ['itemGapCells', options.itemGapCells ?? 2, 0, 64],
    ['titleSafePaddingCells', options.titleSafePaddingCells ?? 2, 0, 64],
    ['maxCandidatesPerPass', options.maxCandidatesPerPass ?? DEFAULT_MAX_CANDIDATES_PER_PASS, 1, 65536],
    ['maxPasses', options.maxPasses ?? DEFAULT_MAX_PASSES, 1, 8],
  ];
  numericChecks.forEach(([name, value, minimum, maximum]) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < minimum || number > maximum) {
      issues.push(`${name} must be between ${minimum} and ${maximum}.`);
    }
  });
  if (issues.length) {
    throw new PlaygroundPlacementError(
      'INVALID_PLACEMENT_INPUT',
      `Playground placement input is invalid (${issues.length} issue${issues.length === 1 ? '' : 's'}).`,
      issues,
    );
  }
}

function createCandidateBounds(x, y, footprint) {
  return {
    left: x,
    top: y,
    right: x + footprint.footprintWidthCells,
    bottom: y + footprint.footprintHeightCells,
  };
}

function scaleBoundsFromOrigin(bounds, spacing, preset) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const radialSpacing = 1 + ((spacing - 1) * 0.35);
  const quantize = preset === 'salon' ? quantizeSalonCoordinate : Math.round;
  const left = quantize((centerX * radialSpacing) - (width / 2));
  const top = quantize((centerY * radialSpacing) - (height / 2));
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function depthClearanceSquared(left, right, leftDepth, rightDepth, options, columns = 0, rows = 0) {
  // At a visible collision point p, the two world centres differ by
  // p * (1 / leftDepth - 1 / rightDepth), plus their depth-adjusted extents.
  // Reserving this viewport-bounded travel protects every pan and repeat, not
  // just the initial camera position. Equal-depth neighbours need no drift pad.
  const depthDifference = Math.abs(1 / leftDepth - 1 / rightDepth);
  const driftX = options.halfViewportWidthCells * depthDifference;
  const driftY = options.halfViewportHeightCells * depthDifference;
  const gap = options.gapCells / Math.min(leftDepth, rightDepth);
  const centerX = (left.left + left.right - right.left - right.right) / 2;
  const centerY = (left.top + left.bottom - right.top - right.bottom) / 2;
  // The nearest wrapped centre is equivalent to checking all eight adjacent
  // copies, including corners, without allocating nine temporary rectangles.
  const deltaX = Math.abs(columns ? centerX - Math.round(centerX / columns) * columns : centerX)
    - (left.right - left.left + right.right - right.left) / 2 - driftX;
  const deltaY = Math.abs(rows ? centerY - Math.round(centerY / rows) * rows : centerY)
    - (left.bottom - left.top + right.bottom - right.top) / 2 - driftY;
  if (deltaX < gap && deltaY < gap) return -1;
  return (Math.max(0, deltaX) ** 2) + (Math.max(0, deltaY) ** 2);
}

function collides(bounds, parallax, placed, titleSafeArea, clearance) {
  if (titleSafeArea && depthClearanceSquared(bounds, titleSafeArea, parallax, 1, clearance) < 0) {
    return true;
  }
  return placed.some((obstacle) => (
    depthClearanceSquared(bounds, obstacle.bounds, parallax, obstacle.parallax, clearance) < 0
  ));
}

function getWrappedSalonClearanceSquared(
  bounds,
  parallax,
  placed,
  titleSafeArea,
  clearance,
  periodColumns,
  periodRows,
) {
  let minimumClearanceSquared = Infinity;
  if (titleSafeArea) {
    minimumClearanceSquared = depthClearanceSquared(bounds, titleSafeArea, parallax, 1,
      clearance, periodColumns, periodRows);
    if (minimumClearanceSquared < 0) return -1;
  }

  for (let obstacleIndex = 0; obstacleIndex < placed.length; obstacleIndex += 1) {
    const obstacle = placed[obstacleIndex];
    const distanceSquared = depthClearanceSquared(bounds, obstacle.bounds, parallax,
      obstacle.parallax, clearance, periodColumns, periodRows);
    if (distanceSquared < 0) return -1;
    minimumClearanceSquared = Math.min(minimumClearanceSquared, distanceSquared);
  }

  return minimumClearanceSquared;
}

function pointDistanceSquared(x, y, bounds, columns, rows) {
  const dx = x - (bounds.left + bounds.right) / 2;
  const dy = y - (bounds.top + bounds.bottom) / 2;
  return Math.max(0, Math.abs(dx - Math.round(dx / columns) * columns)
    - (bounds.right - bounds.left) / 2) ** 2
    + Math.max(0, Math.abs(dy - Math.round(dy / rows) * rows)
    - (bounds.bottom - bounds.top) / 2) ** 2;
}

function createSalonCoverage(columns, rows, titleSafeArea) {
  const countX = Math.min(SALON_COVERAGE_AXIS_LIMIT, Math.ceil(columns / 6));
  const countY = Math.min(SALON_COVERAGE_AXIS_LIMIT, Math.ceil(rows / 6));
  const points = [];
  for (let column = 0; column < countX; column += 1) {
    for (let row = 0; row < countY; row += 1) {
      const x = ((column + 0.5) / countX - 0.5) * columns;
      const y = ((row + 0.5) / countY - 0.5) * rows;
      points.push({ x, y, distance: pointDistanceSquared(x, y, titleSafeArea, columns, rows) });
    }
  }
  return points;
}

function scoreSalonCoverage(points, bounds, columns, rows, update = false) {
  let improvement = 0;
  for (const point of points) {
    const distance = pointDistanceSquared(point.x, point.y, bounds, columns, rows);
    if (distance < point.distance) {
      improvement += point.distance - distance;
      if (update) point.distance = distance;
    }
  }
  return improvement;
}

function createPlacement(item, footprint, bounds, parallax, attempts, passIndex) {
  return {
    id: item.id, placementOrder: item.placementOrder, type: item.type, kind: item.kind,
    ...footprint, parallax, xCell: bounds.left, yCell: bounds.top, bounds,
    packingBounds: createDepthPackingBounds(bounds, parallax), attempts, passIndex,
  };
}

function placeSalonItems(items, options, titleSafeArea, clearance, projectSpacing) {
  const seed = Number(options.layoutSeed ?? 1);
  const maxPasses = Math.floor(Number(options.maxPasses ?? 8));
  const candidatesPerPass = Math.min(SALON_CLEARANCE_CANDIDATES_PER_PASS,
    Math.floor(Number(options.maxCandidatesPerPass ?? DEFAULT_MAX_CANDIDATES_PER_PASS)));
  const descriptors = items.map((item) => ({
    item, footprint: resolveItemGridFootprint(item, options),
    parallax: getProjectParallaxFactor(item, options),
  })).sort((a, b) => Number(Boolean(b.item.preferredAnchorCells)) - Number(Boolean(a.item.preferredAnchorCells))
    || (a.item.preferredAnchorCells && b.item.preferredAnchorCells ? a.item.placementOrder - b.item.placementOrder : 0)
    || b.footprint.footprintWidthCells * b.footprint.footprintHeightCells / b.parallax ** 2
      - a.footprint.footprintWidthCells * a.footprint.footprintHeightCells / a.parallax ** 2
    || a.item.placementOrder - b.item.placementOrder);
  const minimumColumns = Math.max(1, Math.ceil(Number(options.minimumWorldColumns ?? 80)));
  const minimumRows = Math.max(1, Math.ceil(Number(options.minimumWorldRows ?? 56)));
  const quantum = Math.max(1, Math.ceil(Number(options.worldQuantumCells ?? 8)));
  const gap = clearance.gapCells;
  const titleWidth = titleSafeArea.right - titleSafeArea.left;
  const titleHeight = titleSafeArea.bottom - titleSafeArea.top;
  let paddedArea = (titleWidth + gap) * (titleHeight + gap);
  let widest = titleWidth + gap;
  let tallest = titleHeight + gap;
  for (const { footprint, parallax } of descriptors) {
    const width = (footprint.footprintWidthCells + gap) / parallax;
    const height = (footprint.footprintHeightCells + gap) / parallax;
    paddedArea += width * height;
    widest = Math.max(widest, width);
    tallest = Math.max(tallest, height);
  }
  const spacing = 1 + (projectSpacing - 1) * 0.35;
  const aspect = minimumColumns / minimumRows;
  const area = paddedArea / SALON_PADDED_OCCUPANCY;
  // Period size is chosen once per attempt. Never append padding after packing.
  const baseColumns = Math.max(minimumColumns, Math.sqrt(area * aspect) * spacing,
    widest);
  const baseRows = Math.max(minimumRows, Math.sqrt(area / aspect) * spacing,
    tallest);
  let totalAttempts = 0;
  let failedItem = null;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const columns = quantizeCells(baseColumns * placementPassScale('salon', pass), quantum);
    const rows = quantizeCells(baseRows * placementPassScale('salon', pass), quantum);
    const coverage = createSalonCoverage(columns, rows, titleSafeArea);
    const placements = [];
    const obstacles = [];
    const candidate = { x: 0, y: 0 };
    for (const { item, footprint, parallax } of descriptors) {
      let acceptedBounds = null;
      let anchorBounds = null;
      let anchorScore = -Infinity;
      let bestBounds = null;
      let bestScore = -Infinity;
      let attempts = 0;
      // Keep the opening hero anchor. Other authored anchors are preferences,
      // not an excuse to cluster all large images in the middle of the period.
      if (item.preferredAnchorCells) {
        const anchor = createCandidateBounds(
          quantizeSalonCoordinate(Number(item.preferredAnchorCells.x) * spacing),
          quantizeSalonCoordinate(Number(item.preferredAnchorCells.y) * spacing), footprint);
        const shiftX = Math.round((anchor.left + footprint.footprintWidthCells / 2) / columns) * columns;
        const shiftY = Math.round((anchor.top + footprint.footprintHeightCells / 2) / rows) * rows;
        anchor.left -= shiftX;
        anchor.right -= shiftX;
        anchor.top -= shiftY;
        anchor.bottom -= shiftY;
        attempts += 1;
        if (getWrappedSalonClearanceSquared(createDepthPackingBounds(anchor, parallax),
          parallax, obstacles, titleSafeArea, clearance, columns, rows) >= 0) {
          anchorBounds = anchor;
          anchorScore = scoreSalonCoverage(coverage, { ...anchor,
            bottom: anchor.top + footprint.mediaHeightCells }, columns, rows);
          if (placements.length === 0) acceptedBounds = anchor;
        }
      }
      for (let index = 0; index < candidatesPerPass && !acceptedBounds; index += 1) {
        attempts += 1;
        writePlacementCandidate({ preset: 'salon', seed, itemId: item.id,
          placementOrder: item.placementOrder, candidateIndex: index,
          footprintWidthCells: footprint.footprintWidthCells,
          footprintHeightCells: footprint.footprintHeightCells,
          salonColumns: columns, salonRows: rows }, candidate);
        const bounds = createCandidateBounds(candidate.x, candidate.y, footprint);
        const distance = getWrappedSalonClearanceSquared(createDepthPackingBounds(bounds, parallax),
          parallax, obstacles, titleSafeArea, clearance, columns, rows);
        if (distance < 0) continue;
        const mediaBounds = { ...bounds, bottom: bounds.top + footprint.mediaHeightCells };
        const score = scoreSalonCoverage(coverage, mediaBounds, columns, rows) + distance * 0.000001;
        if (score > bestScore) {
          bestScore = score;
          bestBounds = bounds;
        }
      }
      totalAttempts += attempts;
      acceptedBounds ||= anchorBounds && anchorScore >= bestScore * 0.85 ? anchorBounds : bestBounds;
      if (!acceptedBounds) {
        failedItem = item;
        break;
      }
      const placement = createPlacement(item, footprint, acceptedBounds, parallax, attempts, pass);
      placement.repeatColumns = columns;
      placement.repeatRows = rows;
      placements.push(placement);
      obstacles.push({ bounds: placement.packingBounds, parallax });
      scoreSalonCoverage(coverage, { ...acceptedBounds,
        bottom: acceptedBounds.top + footprint.mediaHeightCells }, columns, rows, true);
    }
    if (placements.length === items.length) return {
      placements: placements.sort((a, b) => a.placementOrder - b.placementOrder), titleSafeArea,
      diagnostics: { preset: 'salon', seed, itemCount: placements.length, totalAttempts,
        maximumPassIndex: placements.length ? pass : -1,
        boundedCandidatesPerItem: (candidatesPerPass + 1) * maxPasses,
        coverageSampleCount: coverage.length, repeatColumns: columns, repeatRows: rows, projectSpacing },
    };
    // A failed attempt is discarded in full. The next period is filled from
    // scratch, so early projects cannot leave a border around later outliers.
  }
  throw new PlaygroundPlacementError('PLACEMENT_EXHAUSTED',
    `Could not place item "${failedItem?.id}" after ${maxPasses} bounded whole-period attempts.`,
    [`preset=salon`, `items=${items.length}`, `passes=${maxPasses}`, `candidatesPerPass=${candidatesPerPass}`]);
}

/**
 * Placement order and seed are stable. Salon can recompose on any catalogue or
 * geometry change, even within the same period; other presets stay append-only.
 */
export function placePlaygroundItems(items, options = {}) {
  validatePlacementInput(items, options);
  const orderedItems = items.slice().sort((left, right) => (
    left.placementOrder - right.placementOrder || String(left.id).localeCompare(String(right.id))
  ));
  const preset = options.layoutPreset ?? 'balanced';
  const seed = Number(options.layoutSeed ?? 1);
  const gapCells = Math.max(0, Number(options.itemGapCells ?? 2), Number(options.projectClearanceCells) || 0);
  const clearance = {
    // Allow the final quarter-cell salon quantization without eroding the gap.
    gapCells: gapCells + (preset === 'salon' ? 0.25 : 1),
    halfViewportWidthCells: Math.max(0, Number(options.viewportWidthCells) || 0) / 2,
    halfViewportHeightCells: Math.max(0, Number(options.viewportHeightCells) || 0) / 2,
  };
  const projectSpacing = clamp(toFiniteNumber(options.projectSpacing, 1.5), 1, 4);
  const titlePaddingCells = Math.max(0, Math.floor(Number(options.titleSafePaddingCells ?? 2)));
  const rawTitleArea = normalizeCellRect(options.titleSafeAreaCells, {
    left: -8,
    top: -4,
    right: 8,
    bottom: 4,
  });
  const titleSafeArea = expandRect(rawTitleArea, titlePaddingCells);
  if (preset === 'salon') return placeSalonItems(orderedItems, options, titleSafeArea, clearance, projectSpacing);
  const maxCandidatesPerPass = Math.floor(Number(
    options.maxCandidatesPerPass ?? DEFAULT_MAX_CANDIDATES_PER_PASS,
  ));
  const maxPasses = Math.floor(Number(options.maxPasses ?? (preset === 'salon' ? 8 : DEFAULT_MAX_PASSES)));
  const placements = [];
  const basePlacements = [];
  const candidate = { x: 0, y: 0 };

  for (let itemIndex = 0; itemIndex < orderedItems.length; itemIndex += 1) {
    const item = orderedItems[itemIndex];
    const footprint = resolveItemGridFootprint(item, { ...options, layoutSeed: seed });
    const parallax = getProjectParallaxFactor(item, options);
    let acceptedBaseBounds = null;
    let attempts = 0;
    let acceptedPass = -1;
    if (item.preferredAnchorCells) {
      attempts += 1;
      const anchoredBounds = createCandidateBounds(
        Number(item.preferredAnchorCells.x),
        Number(item.preferredAnchorCells.y),
        footprint,
      );
      const anchorIsClear = !collides(createDepthPackingBounds(anchoredBounds, parallax), parallax,
        basePlacements, titleSafeArea, clearance);
      if (anchorIsClear) {
        acceptedBaseBounds = anchoredBounds;
        acceptedPass = 0;
      }
    }
    for (let passIndex = 0; passIndex < maxPasses && !acceptedBaseBounds; passIndex += 1) {
      for (let candidateIndex = 0; candidateIndex < maxCandidatesPerPass; candidateIndex += 1) {
        attempts += 1;
        writePlacementCandidate({
          preset,
          seed,
          itemId: item.id,
          placementOrder: item.placementOrder,
          candidateIndex,
          passIndex,
          footprintWidthCells: footprint.footprintWidthCells,
          footprintHeightCells: footprint.footprintHeightCells,
        }, candidate);
        const bounds = createCandidateBounds(candidate.x, candidate.y, footprint);
        if (!collides(createDepthPackingBounds(bounds, parallax), parallax,
          basePlacements, titleSafeArea, clearance)) {
          acceptedBaseBounds = bounds;
          acceptedPass = passIndex;
          break;
        }
      }
    }
    if (!acceptedBaseBounds) {
      throw new PlaygroundPlacementError(
        'PLACEMENT_EXHAUSTED',
        `Could not place item "${item.id}" after ${attempts} bounded candidates.`,
        [
          `preset=${preset}`,
          `placementOrder=${item.placementOrder}`,
          `placed=${placements.length}`,
          `footprint=${footprint.footprintWidthCells}x${footprint.footprintHeightCells}`,
          `passes=${maxPasses}`,
          `candidatesPerPass=${maxCandidatesPerPass}`,
        ],
      );
    }
    basePlacements.push({ bounds: createDepthPackingBounds(acceptedBaseBounds, parallax), parallax });
    const acceptedBounds = scaleBoundsFromOrigin(acceptedBaseBounds, projectSpacing, preset);
    placements.push(createPlacement(item, footprint, acceptedBounds, parallax, attempts, acceptedPass));
  }

  return {
    placements,
    titleSafeArea,
    diagnostics: {
      preset,
      seed,
      itemCount: placements.length,
      totalAttempts: placements.reduce((sum, placement) => sum + placement.attempts, 0),
      maximumPassIndex: placements.reduce(
        (maximum, placement) => Math.max(maximum, placement.passIndex),
        -1,
      ),
      boundedCandidatesPerItem: maxCandidatesPerPass * maxPasses,
      projectSpacing,
    },
  };
}

export const PLAYGROUND_PLACEMENT_PRESETS = Object.freeze([...PLACEMENT_PRESETS]);
