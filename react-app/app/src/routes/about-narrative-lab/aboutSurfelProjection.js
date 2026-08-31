// CPU diagnostics for the vertex shader's admitted outer disk. Depth and the
// fragment shader can remove pixels from this disk, so overlap is conservative.
// These helpers run only when diagnostics are requested, never in the RAF loop.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const smoothstep = (low, high, value) => {
  const t = clamp((value - low) / (high - low), 0, 1);
  return t * t * (3 - 2 * t);
};

export function decodeAboutSurfelNormal(xEncoded, yEncoded) {
  let x = Math.max(xEncoded / 32767, -1);
  let y = Math.max(yEncoded / 32767, -1);
  const z = 1 - Math.abs(x) - Math.abs(y);
  if (z < 0) {
    const oldX = x;
    x = (1 - Math.abs(y)) * (x >= 0 ? 1 : -1);
    y = (1 - Math.abs(oldX)) * (y >= 0 ? 1 : -1);
  }
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

export function resolveAboutSurfelRadiusPx(point, controls) {
  const { radiusWU, cameraDepthWU, projectionScalePx, surfaceFacing,
    lodRank, featureClass, preserve, revealProgress, detailBiasScale = 1 } = point;
  if (revealProgress <= 0 || surfaceFacing < -clamp(controls.backfaceRetention, 0, 1)) return 0;
  const depth = 8 * Math.pow(Math.max(0.0001, cameraDepthWU) / 8,
    clamp(controls.perspectiveResponse, 0.1, 2));
  const physicalRadiusPx = radiusWU * projectionScalePx / Math.max(0.0001, depth);
  const spacingForDetail = Math.max(physicalRadiusPx, controls.minPointSizePx) / 0.56;
  const featureRetention = 1 + 0.12 * clamp(featureClass * 0.5, 0, 1);
  const detailFraction = clamp(spacingForDetail * controls.detailBias * detailBiasScale
    * featureRetention / 3.5, 0.12, 1);
  if (!preserve && lodRank > detailFraction) return 0;
  const facingArea = clamp(Math.abs(surfaceFacing), 0.16, 1);
  const facingAxis = clamp(Math.abs(surfaceFacing), 0.30, 1);
  const grazingWeight = 0.5 * (1 - smoothstep(0.15, 0.55, Math.abs(surfaceFacing)));
  const footprint = Math.sqrt(facingArea) * (1 - grazingWeight) + facingAxis * grazingWeight;
  const spacingCap = 0.42 * physicalRadiusPx / 0.56 * footprint;
  const preferred = Math.max(physicalRadiusPx * controls.surfelCoverage, controls.minPointSizePx);
  const radius = Math.min(Math.max(controls.minPointSizePx, controls.maxPointSizePx),
    preferred, spacingCap) * (0.64 + 0.36 * revealProgress);
  if (!Number.isFinite(radius)) throw new RangeError('Invalid projected surfel radius.');
  return radius;
}

export function aboutSurfelIntersectsRect(x, y, radiusPx, widthPx, heightPx, bounds) {
  if (!(radiusPx > 0)) return false;
  const dx = Math.max(bounds.minX - x, 0, x - bounds.maxX) * Math.max(1, widthPx) / 2;
  const dy = Math.max(bounds.minY - y, 0, y - bounds.maxY) * Math.max(1, heightPx) / 2;
  return dx * dx + dy * dy < radiusPx * radiusPx;
}

// A segment clipped against the radius-expanded rectangle encloses the entire
// swept circle, including intermediate phases. Square corners are deliberately
// conservative. Convert both axes independently for portrait and high DPR.
export function aboutSurfelSweepIntersectsRect(start, end, radiusPx, widthPx, heightPx, bounds) {
  if (!(radiusPx > 0)) return false;
  if (![...start, ...end, radiusPx, widthPx, heightPx, ...Object.values(bounds)].every(Number.isFinite)) {
    throw new RangeError('Invalid projected surfel sweep.');
  }
  let enter = 0, leave = 1;
  for (const [axis, low, high, size] of [[0, bounds.minX, bounds.maxX, widthPx],
    [1, bounds.minY, bounds.maxY, heightPx]]) {
    const expansion = 2 * radiusPx / Math.max(1, size);
    const delta = end[axis] - start[axis];
    if (Math.abs(delta) < 1e-12) {
      if (start[axis] < low - expansion || start[axis] > high + expansion) return false;
      continue;
    }
    const a = (low - expansion - start[axis]) / delta;
    const b = (high + expansion - start[axis]) / delta;
    enter = Math.max(enter, Math.min(a, b));
    leave = Math.min(leave, Math.max(a, b));
    if (enter > leave) return false;
  }
  return true;
}
