export function shouldVisitForwardGridNeighbour(offsetX, offsetY) {
  return offsetY === 0
    ? offsetX >= 0 && offsetX <= 1
    : offsetY === 1 && offsetX >= -1 && offsetX <= 1;
}

export function resolveCollisionConvergenceThreshold(dpr = 1) {
  return Math.max(0.01, 0.05 * (Number(dpr) || 1));
}

export function shouldStopCollisionIterations(maxCorrectionPx, thresholdPx) {
  return Number(maxCorrectionPx) <= Number(thresholdPx);
}
