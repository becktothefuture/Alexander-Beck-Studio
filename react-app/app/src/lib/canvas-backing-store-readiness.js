function positiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

/**
 * Resolve the backing-store scale that is safe to require before presentation.
 *
 * Canvas renderers may intentionally cap DPR for performance, and desktop zoom
 * can expose a devicePixelRatio below one. Prefer the scale published by the
 * renderer. Before that marker exists, require only the usable baseline that a
 * capped renderer can always satisfy.
 */
export function resolveCanvasBackingStoreReadinessScale(canvas, options = {}) {
  const renderedScale = positiveNumber(canvas?.dataset?.renderedDpr, 0);
  if (renderedScale > 0) return renderedScale;

  const devicePixelRatio = positiveNumber(
    options.devicePixelRatio
      ?? options.windowRef?.devicePixelRatio
      ?? globalThis.window?.devicePixelRatio,
    1,
  );
  return Math.min(1, devicePixelRatio);
}

export function isCanvasBackingStoreUsable(canvas, options = {}) {
  if (!canvas) return false;
  const rect = options.rect || canvas.getBoundingClientRect?.();
  const cssWidth = positiveNumber(options.cssWidth ?? rect?.width ?? canvas.clientWidth, 0);
  const cssHeight = positiveNumber(options.cssHeight ?? rect?.height ?? canvas.clientHeight, 0);
  const minCssWidth = positiveNumber(options.minCssWidth, 1);
  const minCssHeight = positiveNumber(options.minCssHeight, 1);
  if (cssWidth < minCssWidth || cssHeight < minCssHeight) return false;

  const scale = resolveCanvasBackingStoreReadinessScale(canvas, options);
  const tolerancePx = Math.max(0, Number(options.tolerancePx) || 2);
  const minWidth = Math.max(1, Math.floor(cssWidth * scale) - tolerancePx);
  const minHeight = Math.max(1, Math.floor(cssHeight * scale) - tolerancePx);
  return canvas.width >= minWidth && canvas.height >= minHeight;
}
