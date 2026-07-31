const PLACEMENT_PRESETS = new Set(['balanced', 'loose', 'clustered']);
const MAX_DIAGNOSTIC_ISSUES = 12;
const DEFAULT_MAX_CANDIDATES_PER_PASS = 4096;
const DEFAULT_MAX_PASSES = 4;
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
  const scale = Math.max(0.1, itemScale * (1 + (variationSample * sizeVariation)));
  const mediaWidthCells = Math.max(1, Math.round(widthBase * scale));
  const mediaHeightCells = Math.max(1, Math.round(heightBase * scale));
  const label = String(item?.label || '').trim();
  const description = String(item?.description || '').trim();
  const typeLabel = options.includeTypeRow === false ? '' : String(item?.type || '').trim();
  const hasLabelBlock = Boolean(label || typeLabel || description);
  const labelGapCells = hasLabelBlock
    ? Math.max(0, Math.ceil(toFiniteNumber(options.labelGapPx, 8) / gridSpacingPx))
    : 0;
  const labelFontSizePx = Math.max(1, toFiniteNumber(options.labelFontSizePx, 12));
  const labelLineHeightPx = Math.max(labelFontSizePx, toFiniteNumber(options.labelLineHeightPx, 16));
  const typeFontSizePx = Math.max(1, toFiniteNumber(options.labelTypeFontSizePx, 10));
  const typeLineHeightPx = Math.max(
    typeFontSizePx,
    toFiniteNumber(options.labelTypeLineHeightPx, 12),
  );
  const descriptionFontSizePx = Math.max(
    1,
    toFiniteNumber(options.labelDescriptionFontSizePx, 12),
  );
  const descriptionLineHeightPx = Math.max(
    descriptionFontSizePx,
    toFiniteNumber(options.labelDescriptionLineHeightPx, 16),
  );
  const innerGapPx = Math.max(0, toFiniteNumber(options.labelInnerGapPx, 4));
  const labelMeasurePx = Math.max(gridSpacingPx, mediaWidthCells * gridSpacingPx);
  const estimatedLabelWidthPx = label.length * labelFontSizePx * 0.62;
  const estimatedDescriptionWidthPx = description.length * descriptionFontSizePx * 0.54;
  const labelLineCount = label
    ? clamp(Math.ceil(estimatedLabelWidthPx / labelMeasurePx), 1, 2)
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
    footprintHeightCells: mediaHeightCells + labelGapCells + labelHeightCells,
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

/**
 * Generates one deterministic integer-cell candidate. The caller owns target.
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
}, target) {
  if (!target || typeof target !== 'object') {
    throw new TypeError('A target object is required.');
  }
  if (!PLACEMENT_PRESETS.has(preset)) {
    throw new RangeError(`Unknown layout preset "${preset}".`);
  }
  const passScale = 2 ** Math.max(0, Math.floor(passIndex));
  const phaseHash = hashPlacementValue(seed, itemId, placementOrder);
  const turns = phaseHash & 3;
  const reflected = ((phaseHash >>> 2) & 1) === 1;
  const scratch = target;

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
    const orderOffset = Math.max(0, Math.floor(placementOrder)) * 7;
    squareSpiralCoordinate(candidateIndex + orderOffset, scratch);
    rotateQuarterTurns(scratch.x, reflected ? -scratch.y : scratch.y, turns, scratch);
    const stride = preset === 'loose' ? 4 : 2;
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

function scaleBoundsFromOrigin(bounds, spacing) {
  const width = bounds.right - bounds.left;
  const height = bounds.bottom - bounds.top;
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const left = Math.round((centerX * spacing) - (width / 2));
  const top = Math.round((centerY * spacing) - (height / 2));
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
  };
}

function collides(bounds, placed, titleSafeArea, gapCells) {
  if (titleSafeArea && cellRectsOverlap(bounds, titleSafeArea, gapCells)) return true;
  for (let index = 0; index < placed.length; index += 1) {
    if (cellRectsOverlap(bounds, placed[index].bounds, gapCells)) return true;
  }
  return false;
}

/**
 * Places items in append-only placementOrder. Existing results do not depend on
 * the catalogue length or the eventual world dimensions.
 */
export function placePlaygroundItems(items, options = {}) {
  validatePlacementInput(items, options);
  const orderedItems = items.slice().sort((left, right) => (
    left.placementOrder - right.placementOrder || String(left.id).localeCompare(String(right.id))
  ));
  const preset = options.layoutPreset ?? 'balanced';
  const seed = Number(options.layoutSeed ?? 1);
  const gapCells = Math.max(0, Math.floor(Number(options.itemGapCells ?? 2)));
  const projectSpacing = clamp(toFiniteNumber(options.projectSpacing, 1.5), 1, 4);
  const titlePaddingCells = Math.max(0, Math.floor(Number(options.titleSafePaddingCells ?? 2)));
  const rawTitleArea = normalizeCellRect(options.titleSafeAreaCells, {
    left: -8,
    top: -4,
    right: 8,
    bottom: 4,
  });
  const titleSafeArea = expandRect(rawTitleArea, titlePaddingCells);
  const maxCandidatesPerPass = Math.floor(Number(
    options.maxCandidatesPerPass ?? DEFAULT_MAX_CANDIDATES_PER_PASS,
  ));
  const maxPasses = Math.floor(Number(options.maxPasses ?? DEFAULT_MAX_PASSES));
  const placements = [];
  const basePlacements = [];
  const candidate = { x: 0, y: 0 };

  for (let itemIndex = 0; itemIndex < orderedItems.length; itemIndex += 1) {
    const item = orderedItems[itemIndex];
    const footprint = resolveItemGridFootprint(item, { ...options, layoutSeed: seed });
    let acceptedBaseBounds = null;
    let attempts = 0;
    let acceptedPass = -1;
    for (let passIndex = 0; passIndex < maxPasses && !acceptedBaseBounds; passIndex += 1) {
      for (let candidateIndex = 0;
        candidateIndex < maxCandidatesPerPass && !acceptedBaseBounds;
        candidateIndex += 1) {
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
        if (!collides(bounds, basePlacements, titleSafeArea, gapCells)) {
          acceptedBaseBounds = bounds;
          acceptedPass = passIndex;
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
    basePlacements.push({ bounds: acceptedBaseBounds });
    const acceptedBounds = scaleBoundsFromOrigin(acceptedBaseBounds, projectSpacing);
    placements.push({
      id: item.id,
      placementOrder: item.placementOrder,
      type: item.type,
      xCell: acceptedBounds.left,
      yCell: acceptedBounds.top,
      mediaWidthCells: footprint.mediaWidthCells,
      mediaHeightCells: footprint.mediaHeightCells,
      labelGapCells: footprint.labelGapCells,
      labelHeightCells: footprint.labelHeightCells,
      labelTitleLineCount: footprint.labelTitleLineCount,
      labelTypeLineCount: footprint.labelTypeLineCount,
      labelDescriptionLineCount: footprint.labelDescriptionLineCount,
      labelBlockHeightPx: footprint.labelBlockHeightPx,
      footprintWidthCells: footprint.footprintWidthCells,
      footprintHeightCells: footprint.footprintHeightCells,
      scale: footprint.scale,
      bounds: acceptedBounds,
      attempts,
      passIndex: acceptedPass,
    });
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
