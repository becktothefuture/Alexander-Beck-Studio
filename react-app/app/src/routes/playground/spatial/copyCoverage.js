import { positiveModulo } from './cameraMath.js';

function requirePositive(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero.`);
  }
  return number;
}

function nonNegative(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
}

/**
 * Calculates the minimum whole-period copy range whose buffered tile bounds
 * intersect the current viewport. Logical camera values are wrapped only here.
 */
export function calculateNeighbouringCopyCoverage({
  viewportWidthPx,
  viewportHeightPx,
  worldWidthPx,
  worldHeightPx,
  cameraX = 0,
  cameraY = 0,
  largestItemWidthPx = 0,
  largestItemHeightPx = 0,
} = {}) {
  const viewportWidth = requirePositive(viewportWidthPx, 'viewportWidthPx');
  const viewportHeight = requirePositive(viewportHeightPx, 'viewportHeightPx');
  const worldWidth = requirePositive(worldWidthPx, 'worldWidthPx');
  const worldHeight = requirePositive(worldHeightPx, 'worldHeightPx');
  const renderedCameraX = positiveModulo(Number(cameraX) || 0, worldWidth);
  const renderedCameraY = positiveModulo(Number(cameraY) || 0, worldHeight);
  const horizontalBuffer = nonNegative(largestItemWidthPx);
  const verticalBuffer = nonNegative(largestItemHeightPx);
  const viewportLeft = renderedCameraX - (viewportWidth / 2);
  const viewportRight = renderedCameraX + (viewportWidth / 2);
  const viewportTop = renderedCameraY - (viewportHeight / 2);
  const viewportBottom = renderedCameraY + (viewportHeight / 2);

  const minimumColumn = Math.ceil(
    (viewportLeft - (worldWidth / 2) - horizontalBuffer) / worldWidth,
  );
  const maximumColumn = Math.floor(
    (viewportRight + (worldWidth / 2) + horizontalBuffer) / worldWidth,
  );
  const minimumRow = Math.ceil(
    (viewportTop - (worldHeight / 2) - verticalBuffer) / worldHeight,
  );
  const maximumRow = Math.floor(
    (viewportBottom + (worldHeight / 2) + verticalBuffer) / worldHeight,
  );
  const columnCount = Math.max(0, maximumColumn - minimumColumn + 1);
  const rowCount = Math.max(0, maximumRow - minimumRow + 1);

  return {
    renderedCameraX,
    renderedCameraY,
    minimumColumn,
    maximumColumn,
    minimumRow,
    maximumRow,
    columnCount,
    rowCount,
    copyCount: columnCount * rowCount,
    horizontalBuffer,
    verticalBuffer,
    worldWidthPx: worldWidth,
    worldHeightPx: worldHeight,
  };
}

/** Iterates copy offsets without constructing an intermediate offset array. */
export function forEachNeighbouringCopy(coverage, callback) {
  if (!coverage || typeof coverage !== 'object') {
    throw new TypeError('A coverage object is required.');
  }
  if (typeof callback !== 'function') {
    throw new TypeError('A copy callback is required.');
  }
  let index = 0;
  for (let row = coverage.minimumRow; row <= coverage.maximumRow; row += 1) {
    const offsetY = row * coverage.worldHeightPx;
    for (let column = coverage.minimumColumn;
      column <= coverage.maximumColumn;
      column += 1) {
      callback(
        column * coverage.worldWidthPx,
        offsetY,
        column,
        row,
        index,
      );
      index += 1;
    }
  }
  return index;
}
