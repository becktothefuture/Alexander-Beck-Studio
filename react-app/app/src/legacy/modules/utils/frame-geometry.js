function toFiniteNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function readCssPx(value, fallback = 0) {
  const numeric = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(numeric) ? Math.max(0, numeric) : fallback;
}

export function resolveSimulationCornerShape(style) {
  const value = style?.cornerTopLeftShape
    || style?.cornerShape
    || style?.getPropertyValue?.('corner-top-left-shape')
    || style?.getPropertyValue?.('corner-shape')
    || '';
  const normalized = String(value).trim().toLowerCase();
  return normalized.includes('squircle') || /superellipse\(\s*2(?:\.0+)?\s*\)/.test(normalized)
    ? 'squircle'
    : 'round';
}

export function getSimulationCollisionInsetCssPx(globals) {
  return Math.max(0, toFiniteNumber(globals?.simulationCollisionInsetPx, 0));
}

export function getSimulationCollisionInsetPx(globals) {
  const dpr = Math.max(0.01, toFiniteNumber(globals?.DPR, 1));
  return getSimulationCollisionInsetCssPx(globals) * dpr;
}

/**
 * Cache the authored physics boundary in canvas pixels.
 *
 * CSS owns the visible wall and clips the full-size canvas. This boundary is
 * deliberately physics-only: changing it moves collisions without moving,
 * shrinking, or re-rounding any rendered layer.
 */
export function syncSimulationCollisionBounds(globals, container, canvas) {
  if (!globals || !container || !canvas || !(canvas.width > 0) || !(canvas.height > 0)) {
    return null;
  }

  const containerStyle = getComputedStyle(container);
  const canvasStyle = getComputedStyle(canvas);
  const containerCssWidth = readCssPx(containerStyle.width, container.clientWidth);
  const containerCssHeight = readCssPx(containerStyle.height, container.clientHeight);
  const canvasCssWidth = readCssPx(canvasStyle.width, containerCssWidth);
  const canvasCssHeight = readCssPx(canvasStyle.height, containerCssHeight);
  if (!(containerCssWidth > 0) || !(containerCssHeight > 0)
    || !(canvasCssWidth > 0) || !(canvasCssHeight > 0)) {
    return null;
  }

  const canvasPixelsPerCssX = canvas.width / canvasCssWidth;
  const canvasPixelsPerCssY = canvas.height / canvasCssHeight;
  const authoredInset = getSimulationCollisionInsetCssPx(globals);
  const maxInsetCss = Math.max(0, Math.min(containerCssWidth, containerCssHeight) * 0.5 - 0.5);
  const insetCss = Math.min(authoredInset, maxInsetCss);
  const cssWidth = Math.max(1, containerCssWidth - (insetCss * 2));
  const cssHeight = Math.max(1, containerCssHeight - (insetCss * 2));
  const outerCssRadius = readCssPx(containerStyle.borderTopLeftRadius);
  const cornerShape = resolveSimulationCornerShape(containerStyle);
  const cssRadius = Math.max(0, Math.min(
    outerCssRadius - insetCss,
    cssWidth * 0.5,
    cssHeight * 0.5
  ));
  const x = insetCss * canvasPixelsPerCssX;
  const y = insetCss * canvasPixelsPerCssY;
  const width = cssWidth * canvasPixelsPerCssX;
  const height = cssHeight * canvasPixelsPerCssY;
  const radius = Math.max(0, Math.min(
    cssRadius * canvasPixelsPerCssX,
    cssRadius * canvasPixelsPerCssY,
    width * 0.5,
    height * 0.5
  ));

  const bounds = {
    x,
    y,
    width,
    height,
    radius,
    cornerShape,
    generation: globals.simulationCanvasGeneration ?? 0,
    css: {
      x: insetCss,
      y: insetCss,
      width: cssWidth,
      height: cssHeight,
      radius: cssRadius,
      authoredInset,
      inset: insetCss,
      outerRadius: outerCssRadius,
      cornerShape,
    },
  };
  globals.simulationCollisionBounds = bounds;
  return bounds;
}
