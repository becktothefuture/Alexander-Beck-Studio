/**
 * Synchronize a canvas backing store into a caller-owned metrics object.
 * Render loops should call this only after a resize or DPR invalidation so a
 * steady frame does not allocate a DOMRect or a replacement metrics object.
 */
export function syncCanvasDisplayMetrics(canvas, dpr, metrics) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  const changed = canvas.width !== width || canvas.height !== height;

  if (changed) {
    canvas.width = width;
    canvas.height = height;
  }

  metrics.changed = changed;
  metrics.cssWidth = Math.max(1, rect.width);
  metrics.cssHeight = Math.max(1, rect.height);
  metrics.width = width;
  metrics.height = height;
  metrics.dpr = dpr;
  return metrics;
}
