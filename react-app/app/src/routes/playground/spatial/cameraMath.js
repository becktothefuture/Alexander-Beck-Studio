/**
 * Returns a value in the half-open range [0, period).
 * Logical camera values may be negative or larger than the world period.
 */
export function positiveModulo(value, period) {
  if (!Number.isFinite(value)) {
    throw new TypeError('Modulo value must be finite.');
  }
  if (!Number.isFinite(period) || period <= 0) {
    throw new RangeError('Modulo period must be a finite number greater than zero.');
  }
  const remainder = value % period;
  if (remainder === 0) return 0;
  return remainder < 0 ? remainder + period : remainder;
}

/**
 * Writes wrapped camera coordinates into a caller-owned object.
 * This form is suitable for hot paths because it does not allocate.
 */
export function writeRenderedCamera(
  logicalX,
  logicalY,
  worldWidth,
  worldHeight,
  target,
) {
  if (!target || typeof target !== 'object') {
    throw new TypeError('A target object is required.');
  }
  target.x = positiveModulo(logicalX, worldWidth);
  target.y = positiveModulo(logicalY, worldHeight);
  return target;
}

/**
 * Projects a world point into viewport-local CSS pixels.
 * Camera coordinates describe the world point under the usable viewport centre.
 */
export function writeWorldToScreen(
  worldX,
  worldY,
  cameraX,
  cameraY,
  viewportCenterX,
  viewportCenterY,
  target,
) {
  if (!target || typeof target !== 'object') {
    throw new TypeError('A target object is required.');
  }
  target.x = viewportCenterX + worldX - cameraX;
  target.y = viewportCenterY + worldY - cameraY;
  return target;
}

/** Writes the inverse viewport-to-world projection into a caller-owned object. */
export function writeScreenToWorld(
  screenX,
  screenY,
  cameraX,
  cameraY,
  viewportCenterX,
  viewportCenterY,
  target,
) {
  if (!target || typeof target !== 'object') {
    throw new TypeError('A target object is required.');
  }
  target.x = cameraX + screenX - viewportCenterX;
  target.y = cameraY + screenY - viewportCenterY;
  return target;
}

/**
 * Preserves the world point beneath an authored screen anchor as viewport geometry changes.
 * Passing each viewport centre as its anchor leaves the logical camera unchanged.
 */
export function writeResizePreservedCamera({
  cameraX,
  cameraY,
  previousCenterX,
  previousCenterY,
  nextCenterX,
  nextCenterY,
  previousAnchorX = previousCenterX,
  previousAnchorY = previousCenterY,
  nextAnchorX = nextCenterX,
  nextAnchorY = nextCenterY,
}, target) {
  if (!target || typeof target !== 'object') {
    throw new TypeError('A target object is required.');
  }
  const anchoredWorldX = cameraX + previousAnchorX - previousCenterX;
  const anchoredWorldY = cameraY + previousAnchorY - previousCenterY;
  target.x = anchoredWorldX - nextAnchorX + nextCenterX;
  target.y = anchoredWorldY - nextAnchorY + nextCenterY;
  return target;
}
