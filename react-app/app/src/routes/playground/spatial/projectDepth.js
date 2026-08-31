/** Two project planes share one camera; depth changes travel, never media size. */
export function getProjectParallaxFactor(item, config = {}, reducedMotion = false) {
  if (reducedMotion || item?.kind !== 'snippet') return 1;
  const depth = Number(config.snippetDepth);
  return 1 - (Number.isFinite(depth) ? Math.min(0.2, Math.max(0, depth)) : 0);
}

/** Project the footprint centre while keeping its image and caption unscaled. */
export function projectDepthCoordinate(position, size, parallax = 1) {
  return ((position + (size / 2)) * parallax) - (size / 2);
}

export function createDepthPackingBounds(bounds, parallax = 1) {
  const extraX = (bounds.right - bounds.left) * (1 / parallax - 1) / 2;
  const extraY = (bounds.bottom - bounds.top) * (1 / parallax - 1) / 2;
  return {
    left: bounds.left - extraX,
    top: bounds.top - extraY,
    right: bounds.right + extraX,
    bottom: bounds.bottom + extraY,
  };
}

/**
 * Invert the same projection for an actual tapped repeat. The footprint may be
 * taller than the button because packing reserves conservative caption space.
 */
export function resolveDepthSource({
  rect, viewportRect, camera, worldScale, parallax = 1, width, height,
}) {
  const scale = worldScale * parallax;
  const left = rect.left - viewportRect.left - camera.viewportCenterX;
  const top = rect.top - viewportRect.top - camera.viewportCenterY;
  return {
    x: camera.logicalX + ((left + width * worldScale / 2) / scale) - width / 2,
    y: camera.logicalY + ((top + height * worldScale / 2) / scale) - height / 2,
    targetX: camera.logicalX + (left + rect.width / 2) / scale,
    targetY: camera.logicalY + (top + rect.height / 2) / scale,
  };
}
