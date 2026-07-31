export const MINIMUM_WORLD_COLUMNS = 80;
export const MINIMUM_WORLD_ROWS = 56;
export const DEFAULT_WORLD_QUANTUM_CELLS = 8;

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function quantizeCells(value, quantum = DEFAULT_WORLD_QUANTUM_CELLS) {
  const resolvedValue = Number(value);
  const resolvedQuantum = Number(quantum);
  if (!Number.isFinite(resolvedValue) || resolvedValue < 0) {
    throw new RangeError('Cell count must be a finite non-negative number.');
  }
  if (!Number.isInteger(resolvedQuantum) || resolvedQuantum <= 0) {
    throw new RangeError('World quantum must be a positive integer.');
  }
  return Math.ceil(resolvedValue / resolvedQuantum) * resolvedQuantum;
}

function includeBounds(accumulator, bounds) {
  if (!bounds || typeof bounds !== 'object') return;
  const left = Number(bounds.left);
  const top = Number(bounds.top);
  const right = Number(bounds.right);
  const bottom = Number(bounds.bottom);
  if (![left, top, right, bottom].every(Number.isFinite) || right < left || bottom < top) return;
  accumulator.minimumX = Math.min(accumulator.minimumX, left);
  accumulator.minimumY = Math.min(accumulator.minimumY, top);
  accumulator.maximumX = Math.max(accumulator.maximumX, right);
  accumulator.maximumY = Math.max(accumulator.maximumY, bottom);
}

/**
 * Builds a centred toroidal period. Centring the quantized boundary on logical
 * origin keeps the title anchor fixed while later items enlarge the period.
 */
export function calculateContentWorld(placements, options = {}) {
  if (!Array.isArray(placements)) {
    throw new TypeError('placements must be an array.');
  }
  const gridSpacingPx = finiteNumber(options.gridSpacingPx, 48);
  const minimumColumns = Math.max(
    1,
    Math.ceil(finiteNumber(options.minimumWorldColumns, MINIMUM_WORLD_COLUMNS)),
  );
  const minimumRows = Math.max(
    1,
    Math.ceil(finiteNumber(options.minimumWorldRows, MINIMUM_WORLD_ROWS)),
  );
  const paddingCells = Math.max(0, Math.ceil(finiteNumber(options.worldPaddingCells, 1)));
  const gapCells = Math.max(0, Math.ceil(finiteNumber(options.itemGapCells, 2)));
  const quantumCells = Math.max(
    1,
    Math.ceil(finiteNumber(options.worldQuantumCells, DEFAULT_WORLD_QUANTUM_CELLS)),
  );
  if (gridSpacingPx <= 0) throw new RangeError('gridSpacingPx must be greater than zero.');

  const extents = {
    minimumX: 0,
    minimumY: 0,
    maximumX: 0,
    maximumY: 0,
  };
  includeBounds(extents, options.titleSafeAreaCells);
  let largestItemWidthCells = 0;
  let largestItemHeightCells = 0;
  let occupiedCellArea = 0;
  for (let index = 0; index < placements.length; index += 1) {
    const placement = placements[index];
    const bounds = placement?.bounds || {
      left: placement?.xCell,
      top: placement?.yCell,
      right: Number(placement?.xCell) + Number(placement?.footprintWidthCells),
      bottom: Number(placement?.yCell) + Number(placement?.footprintHeightCells),
    };
    includeBounds(extents, bounds);
    const width = Math.max(0, Number(bounds.right) - Number(bounds.left));
    const height = Math.max(0, Number(bounds.bottom) - Number(bounds.top));
    largestItemWidthCells = Math.max(largestItemWidthCells, width);
    largestItemHeightCells = Math.max(largestItemHeightCells, height);
    occupiedCellArea += width * height;
  }

  const horizontalRadius = Math.max(Math.abs(extents.minimumX), Math.abs(extents.maximumX));
  const verticalRadius = Math.max(Math.abs(extents.minimumY), Math.abs(extents.maximumY));
  const contentColumns = Math.ceil((horizontalRadius + paddingCells + gapCells) * 2);
  const contentRows = Math.ceil((verticalRadius + paddingCells + gapCells) * 2);
  const columns = quantizeCells(
    Math.max(minimumColumns, contentColumns),
    quantumCells,
  );
  const rows = quantizeCells(
    Math.max(minimumRows, contentRows),
    quantumCells,
  );
  const widthPx = columns * gridSpacingPx;
  const heightPx = rows * gridSpacingPx;

  return {
    columns,
    rows,
    widthPx,
    heightPx,
    gridSpacingPx,
    minimumXCell: -columns / 2,
    maximumXCell: columns / 2,
    minimumYCell: -rows / 2,
    maximumYCell: rows / 2,
    paddingCells,
    gapCells,
    quantumCells,
    largestItemWidthCells,
    largestItemHeightCells,
    largestItemWidthPx: largestItemWidthCells * gridSpacingPx,
    largestItemHeightPx: largestItemHeightCells * gridSpacingPx,
    occupiedCellArea,
    occupancy: columns * rows > 0 ? occupiedCellArea / (columns * rows) : 0,
    contentBoundsCells: extents,
  };
}
