const DEFAULT_DPR_CAP = 2;
const DEFAULT_MAX_VISIBLE_DOTS = 20000;
const TWO_PI = Math.PI * 2;
const FIELD_MODE_GRID = 'grid';
const FIELD_MODE_DEPTH = 'depth';
const UINT32_RANGE = 4294967296;
const DEPTH_GRID_SPACING_PX = 72;
const DEPTH_VARIATION = 0.18;

const DEPTH_FIELD_LAYERS = Object.freeze([
  Object.freeze({
    opacityMultiplier: 0.34,
    parallax: 0.16,
    radiusMultiplier: 0.42,
    seed: 0x14f3a72d,
    spacingMultiplier: 1.7,
  }),
  Object.freeze({
    opacityMultiplier: 0.52,
    parallax: 0.34,
    radiusMultiplier: 0.64,
    seed: 0x6c8e9cf5,
    spacingMultiplier: 1.15,
  }),
  Object.freeze({
    opacityMultiplier: 1,
    parallax: 0.58,
    radiusMultiplier: 0.92,
    seed: 0x9e3779b9,
    spacingMultiplier: 0.82,
  }),
]);

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function hashCell(column, row, seed) {
  let hash = Math.imul(column | 0, 0x1f123bb5)
    ^ Math.imul(row | 0, 0x5f356495)
    ^ seed;
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return (hash >>> 0) / UINT32_RANGE;
}

/**
 * Creates a redraw-on-change Canvas 2D dot renderer. Camera changes coalesce
 * into one frame. Stable world cells own position, depth, colour, and density;
 * moving the viewport never reseeds or changes the sampling lattice.
 */
export function createPlaygroundDotFieldRenderer(canvas, options = {}) {
  const context = canvas?.getContext?.('2d', { alpha: true, desynchronized: true });
  if (!canvas || !context) throw new TypeError('A Canvas 2D surface is required.');
  const windowObject = options.windowObject || globalThis.window;
  const documentObject = options.documentObject || globalThis.document;
  const requestRenderFrame = typeof options.requestRenderFrame === 'function'
    ? options.requestRenderFrame
    : null;
  if (!windowObject?.requestAnimationFrame || !windowObject?.cancelAnimationFrame) {
    throw new TypeError('A window-like animation frame owner is required.');
  }

  let started = false;
  let disposed = false;
  let paused = false;
  let hidden = documentObject?.visibilityState === 'hidden';
  let frameId = 0;
  let externalFrameRequested = false;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let backingScaleX = 1;
  let backingScaleY = 1;
  let cameraX = finite(options.cameraX, 0);
  let cameraY = finite(options.cameraY, 0);
  let lastDrawnCameraX = null;
  let lastDrawnCameraY = null;
  let viewportCenterX = finite(options.viewportCenterX, 0);
  let viewportCenterY = finite(options.viewportCenterY, 0);
  let automaticViewportCenter = !Number.isFinite(Number(options.viewportCenterX))
    || !Number.isFinite(Number(options.viewportCenterY));
  let gridSpacingPx = clamp(finite(options.gridSpacingPx, 48), 4, 512);
  let worldScale = clamp(finite(options.worldScale, 1), 0.5, 1);
  let worldColumns = Math.max(1, Math.round(finite(options.worldColumns, 80)));
  let worldRows = Math.max(1, Math.round(finite(options.worldRows, 56)));
  let dotRadiusPx = clamp(finite(options.dotRadiusPx, 2.25), 0.25, gridSpacingPx * 0.45);
  let dotOpacity = clamp(finite(options.dotOpacity, 0.28), 0, 1);
  let dotDensity = clamp(finite(options.dotDensity, 0.58), 0, 1);
  let dotRandomness = clamp(finite(options.dotRandomness, 0.65), 0, 1);
  let reducedMotion = options.reducedMotion === true;
  let routeVisualScale = clamp(finite(options.routeVisualScale, 1), 0, 1);
  let neutralColor = String(options.neutralColor || '#8a8a8a');
  let colors = Array.isArray(options.colors) && options.colors.length
    ? options.colors.slice(0, 8)
    : [neutralColor];
  const fieldMode = options.fieldMode === FIELD_MODE_DEPTH
    ? FIELD_MODE_DEPTH
    : FIELD_MODE_GRID;
  let maximumDpr = clamp(finite(options.maximumDpr, DEFAULT_DPR_CAP), 1, 3);
  let maximumVisibleDots = Math.max(
    256,
    Math.floor(finite(options.maximumVisibleDots, DEFAULT_MAX_VISIBLE_DOTS)),
  );
  let drawCount = 0;
  let lastVisibleDotCount = 0;
  let lastDrawnDotCount = 0;
  let lastSamplingStride = 1;
  let renderDirty = true;
  const resizeTarget = options.resizeTarget || canvas;
  const onDraw = typeof options.onDraw === 'function' ? options.onDraw : null;

  function clear() {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
  }

  function drawNeutralDots(
    minimumColumn,
    maximumColumn,
    minimumRow,
    maximumRow,
    samplingStride,
  ) {
    const visibleRadius = dotRadiusPx * worldScale * routeVisualScale;
    if (visibleRadius <= 0.01) return;
    context.beginPath();
    for (let row = minimumRow; row <= maximumRow; row += samplingStride) {
      const screenY = viewportCenterY + (((row * gridSpacingPx) - cameraY) * worldScale);
      for (let column = minimumColumn; column <= maximumColumn; column += samplingStride) {
        const screenX = viewportCenterX + (((column * gridSpacingPx) - cameraX) * worldScale);
        context.moveTo(screenX + visibleRadius, screenY);
        context.arc(screenX, screenY, visibleRadius, 0, TWO_PI);
      }
    }
    context.fill();
  }

  function calculateDepthCandidateCount(stride = 1) {
    let candidateCount = 0;
    for (let index = 0; index < DEPTH_FIELD_LAYERS.length; index += 1) {
      const layer = DEPTH_FIELD_LAYERS[index];
      // Use the worst-case cell extent, independent of camera and randomness.
      // Otherwise a one-pixel pan can change stride and replace the whole field.
      const spacing = DEPTH_GRID_SPACING_PX * layer.spacingMultiplier
        * (1 - DEPTH_VARIATION) * worldScale;
      const columns = Math.ceil(width / spacing) + 5;
      const rows = Math.ceil(height / spacing) + 5;
      candidateCount += Math.ceil(columns / stride) * Math.ceil(rows / stride);
    }
    return candidateCount;
  }

  function drawDepthDots(samplingStride) {
    let drawnCount = 0;
    if (dotDensity === 0) return 0;
    const fieldCameraX = reducedMotion ? 0 : cameraX;
    const fieldCameraY = reducedMotion ? 0 : cameraY;
    for (let index = 0; index < DEPTH_FIELD_LAYERS.length; index += 1) {
      const layer = DEPTH_FIELD_LAYERS[index];
      const spacing = DEPTH_GRID_SPACING_PX * layer.spacingMultiplier / layer.parallax;
      const minimumDepth = layer.parallax * (1 - DEPTH_VARIATION);
      const minimumColumn = Math.floor(
        (fieldCameraX - (viewportCenterX / (worldScale * minimumDepth))) / spacing,
      ) - 1;
      const maximumColumn = Math.ceil(
        (fieldCameraX + ((width - viewportCenterX) / (worldScale * minimumDepth))) / spacing,
      ) + 1;
      const minimumRow = Math.floor(
        (fieldCameraY - (viewportCenterY / (worldScale * minimumDepth))) / spacing,
      ) - 1;
      const maximumRow = Math.ceil(
        (fieldCameraY + ((height - viewportCenterY) / (worldScale * minimumDepth))) / spacing,
      ) + 1;
      const radius = dotRadiusPx
        * layer.radiusMultiplier
        * worldScale
        * routeVisualScale;
      if (radius <= 0.01) continue;

      context.globalAlpha = dotOpacity * layer.opacityMultiplier;
      const firstRow = Math.ceil(minimumRow / samplingStride) * samplingStride;
      const firstColumn = Math.ceil(minimumColumn / samplingStride) * samplingStride;
      // A handful of palette batches, no per-dot state changes or frame allocations.
      for (let colorIndex = 0; colorIndex < colors.length; colorIndex += 1) {
        context.fillStyle = colors[colorIndex];
        context.beginPath();
        let batchCount = 0;
        for (let row = firstRow; row <= maximumRow; row += samplingStride) {
          for (let column = firstColumn; column <= maximumColumn; column += samplingStride) {
            if (hashCell(column, row, layer.seed) >= dotDensity) continue;
            if (Math.floor(hashCell(column, row, layer.seed ^ 0x40acbe19) * colors.length)
              !== colorIndex) continue;
            const jitterX = (hashCell(column, row, layer.seed ^ 0x68bc21eb) - 0.5)
              * dotRandomness;
            const jitterY = (hashCell(column, row, layer.seed ^ 0x02e5be93) - 0.5)
              * dotRandomness;
            const depth = layer.parallax * (1 + ((hashCell(column, row, layer.seed ^ 0x17b423d1)
              * 2 - 1) * DEPTH_VARIATION * dotRandomness));
            const screenX = viewportCenterX
              + (((column + jitterX) * spacing - fieldCameraX) * depth * worldScale);
            const screenY = viewportCenterY
              + (((row + jitterY) * spacing - fieldCameraY) * depth * worldScale);
            const pointRadius = radius * depth / layer.parallax;
            if (screenX < -pointRadius || screenX > width + pointRadius
              || screenY < -pointRadius || screenY > height + pointRadius) continue;
            context.moveTo(screenX + pointRadius, screenY);
            context.arc(screenX, screenY, pointRadius, 0, TWO_PI);
            batchCount += 1;
          }
        }
        if (batchCount > 0) context.fill();
        drawnCount += batchCount;
      }
    }
    return drawnCount;
  }

  function completeDraw() {
    drawCount += 1;
    onDraw?.();
  }

  function draw() {
    frameId = 0;
    externalFrameRequested = false;
    if (!started || disposed || paused || hidden || !width || !height || !renderDirty) return;
    lastDrawnCameraX = cameraX;
    lastDrawnCameraY = cameraY;
    clear();
    if (dotOpacity <= 0 || dotRadiusPx <= 0 || routeVisualScale <= 0.001) {
      renderDirty = false;
      lastVisibleDotCount = 0;
      lastDrawnDotCount = 0;
      completeDraw();
      return;
    }
    const depthMode = fieldMode === FIELD_MODE_DEPTH;
    const minimumColumn = depthMode ? 0 : Math.ceil(
      (cameraX - (viewportCenterX / worldScale) - dotRadiusPx) / gridSpacingPx,
    );
    const maximumColumn = depthMode ? -1 : Math.floor(
      (cameraX + ((width - viewportCenterX) / worldScale) + dotRadiusPx) / gridSpacingPx,
    );
    const minimumRow = depthMode ? 0 : Math.ceil(
      (cameraY - (viewportCenterY / worldScale) - dotRadiusPx) / gridSpacingPx,
    );
    const maximumRow = depthMode ? -1 : Math.floor(
      (cameraY + ((height - viewportCenterY) / worldScale) + dotRadiusPx) / gridSpacingPx,
    );
    const columnCount = depthMode ? 0 : Math.max(0, maximumColumn - minimumColumn + 1);
    const rowCount = depthMode ? 0 : Math.max(0, maximumRow - minimumRow + 1);
    const visibleDotCount = depthMode
      ? calculateDepthCandidateCount()
      : columnCount * rowCount;
    let samplingStride = visibleDotCount > maximumVisibleDots
      ? Math.ceil(Math.sqrt(visibleDotCount / maximumVisibleDots))
      : 1;
    if (depthMode) {
      while (calculateDepthCandidateCount(samplingStride) > maximumVisibleDots) {
        samplingStride += 1;
      }
    }
    lastVisibleDotCount = visibleDotCount;
    lastSamplingStride = samplingStride;
    const sampledColumnCount = columnCount
      ? Math.floor((columnCount - 1) / samplingStride) + 1
      : 0;
    const sampledRowCount = rowCount
      ? Math.floor((rowCount - 1) / samplingStride) + 1
      : 0;
    if (depthMode) {
      lastDrawnDotCount = drawDepthDots(samplingStride);
    } else {
      lastDrawnDotCount = sampledColumnCount * sampledRowCount;
      context.globalAlpha = dotOpacity;
      context.fillStyle = neutralColor;
      drawNeutralDots(
        minimumColumn,
        maximumColumn,
        minimumRow,
        maximumRow,
        samplingStride,
      );
    }
    context.globalAlpha = 1;
    renderDirty = false;
    completeDraw();
  }

  function scheduleDraw() {
    if (!started || disposed || paused || hidden || frameId || externalFrameRequested) return;
    if (requestRenderFrame) {
      externalFrameRequested = requestRenderFrame() === true;
      return;
    }
    frameId = windowObject.requestAnimationFrame(draw);
  }

  function drawImmediately() {
    if (!started || disposed || paused || hidden) return false;
    if (frameId) windowObject.cancelAnimationFrame(frameId);
    frameId = 0;
    draw();
    return true;
  }

  function resize(force = false) {
    if (disposed) return false;
    const rect = resizeTarget.getBoundingClientRect();
    const nextWidth = Math.max(1, rect.width);
    const nextHeight = Math.max(1, rect.height);
    const nextDpr = Math.min(maximumDpr, Math.max(1, windowObject.devicePixelRatio || 1));
    const unchanged = width === nextWidth && height === nextHeight && dpr === nextDpr;
    if (!force && unchanged) return false;
    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    if (automaticViewportCenter) {
      viewportCenterX = width / 2;
      viewportCenterY = height / 2;
    }
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    backingScaleX = canvas.width / width;
    backingScaleY = canvas.height / height;
    context.setTransform(backingScaleX, 0, 0, backingScaleY, 0, 0);
    renderDirty = true;
    scheduleDraw();
    return true;
  }

  /** Depth uses the unbounded logical camera; the compatibility grid uses wrapped coordinates. */
  function setCamera(nextCameraX, nextCameraY, nextCenterX, nextCenterY, renderImmediately = false) {
    const resolvedX = finite(nextCameraX, cameraX);
    const resolvedY = finite(nextCameraY, cameraY);
    const hasAuthoredCenter = Number.isFinite(Number(nextCenterX))
      && Number.isFinite(Number(nextCenterY));
    const resolvedCenterX = hasAuthoredCenter ? Number(nextCenterX) : viewportCenterX;
    const resolvedCenterY = hasAuthoredCenter ? Number(nextCenterY) : viewportCenterY;
    const changed = resolvedX !== cameraX || resolvedY !== cameraY
      || resolvedCenterX !== viewportCenterX || resolvedCenterY !== viewportCenterY;
    if (!changed) {
      if (renderImmediately && (frameId
        || externalFrameRequested
        || lastDrawnCameraX !== cameraX
        || lastDrawnCameraY !== cameraY)) drawImmediately();
      return false;
    }
    cameraX = resolvedX;
    cameraY = resolvedY;
    viewportCenterX = resolvedCenterX;
    viewportCenterY = resolvedCenterY;
    if (hasAuthoredCenter) automaticViewportCenter = false;
    renderDirty = true;
    if (renderImmediately) drawImmediately();
    else scheduleDraw();
    return true;
  }

  function setWorld(nextColumns, nextRows, nextGridSpacingPx = gridSpacingPx) {
    const columns = Math.max(1, Math.round(finite(nextColumns, worldColumns)));
    const rows = Math.max(1, Math.round(finite(nextRows, worldRows)));
    const spacing = clamp(finite(nextGridSpacingPx, gridSpacingPx), 4, 512);
    if (columns === worldColumns && rows === worldRows && spacing === gridSpacingPx) return;
    worldColumns = columns;
    worldRows = rows;
    gridSpacingPx = spacing;
    dotRadiusPx = Math.min(dotRadiusPx, gridSpacingPx * 0.45);
    renderDirty = true;
    scheduleDraw();
  }

  function setRouteVisualScale(nextScale, { immediate = true } = {}) {
    const scale = clamp(finite(nextScale, routeVisualScale), 0, 1);
    if (scale === routeVisualScale) return false;
    routeVisualScale = scale;
    renderDirty = true;
    if (immediate) drawImmediately();
    else scheduleDraw();
    return true;
  }

  function configure(nextOptions = {}) {
    const nextRadius = clamp(
      finite(nextOptions.dotRadiusPx, dotRadiusPx),
      0.25,
      gridSpacingPx * 0.45,
    );
    const nextOpacity = clamp(finite(nextOptions.dotOpacity, dotOpacity), 0, 1);
    const nextWorldScale = clamp(finite(nextOptions.worldScale, worldScale), 0.5, 1);
    const nextNeutralColor = String(nextOptions.neutralColor || neutralColor);
    const nextMaximumDpr = clamp(finite(nextOptions.maximumDpr, maximumDpr), 1, 3);
    const nextMaximumVisibleDots = Math.max(
      256,
      Math.floor(finite(nextOptions.maximumVisibleDots, maximumVisibleDots)),
    );
    const dprChanged = nextMaximumDpr !== maximumDpr;
    dotRadiusPx = nextRadius;
    worldScale = nextWorldScale;
    dotOpacity = nextOpacity;
    dotDensity = clamp(finite(nextOptions.dotDensity, dotDensity), 0, 1);
    dotRandomness = clamp(finite(nextOptions.dotRandomness, dotRandomness), 0, 1);
    if (typeof nextOptions.reducedMotion === 'boolean') reducedMotion = nextOptions.reducedMotion;
    if (Array.isArray(nextOptions.colors) && nextOptions.colors.length) {
      colors = nextOptions.colors.slice(0, 8);
    }
    neutralColor = nextNeutralColor;
    maximumDpr = nextMaximumDpr;
    maximumVisibleDots = nextMaximumVisibleDots;
    renderDirty = true;
    if (dprChanged) resize(true);
    else scheduleDraw();
  }

  function handleVisibilityChange() {
    hidden = documentObject?.visibilityState === 'hidden';
    if (hidden) {
      if (frameId) windowObject.cancelAnimationFrame(frameId);
      frameId = 0;
      externalFrameRequested = false;
    } else {
      renderDirty = true;
      scheduleDraw();
    }
  }

  function handleWindowResize() {
    resize();
  }

  const resizeObserver = typeof globalThis.ResizeObserver === 'function'
    ? new globalThis.ResizeObserver(() => resize())
    : null;

  function start() {
    if (started || disposed) return;
    started = true;
    documentObject?.addEventListener?.('visibilitychange', handleVisibilityChange);
    windowObject.addEventListener?.('resize', handleWindowResize);
    resizeObserver?.observe(resizeTarget);
    resize(true);
  }

  function setPaused(nextPaused) {
    paused = nextPaused === true;
    if (paused) {
      if (frameId) windowObject.cancelAnimationFrame(frameId);
      frameId = 0;
      externalFrameRequested = false;
    } else {
      renderDirty = true;
      scheduleDraw();
    }
  }

  function getSnapshot() {
    return {
      started,
      disposed,
      paused,
      hidden,
      frameScheduled: frameId !== 0 || externalFrameRequested,
      drawCount,
      width,
      height,
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      dpr,
      backingScaleX,
      backingScaleY,
      cameraX,
      cameraY,
      lastDrawnCameraX,
      lastDrawnCameraY,
      viewportCenterX,
      viewportCenterY,
      gridSpacingPx,
      worldScale,
      worldColumns,
      worldRows,
      dotRadiusPx,
      dotOpacity,
      dotDensity,
      dotRandomness,
      reducedMotion,
      colors: colors.slice(),
      routeVisualScale,
      neutralColor,
      fieldMode,
      depthLayerCount: fieldMode === FIELD_MODE_DEPTH ? DEPTH_FIELD_LAYERS.length : 0,
      visibleDotCount: lastVisibleDotCount,
      drawnDotCount: lastDrawnDotCount,
      samplingStride: lastSamplingStride,
    };
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    started = false;
    if (frameId) windowObject.cancelAnimationFrame(frameId);
    frameId = 0;
    externalFrameRequested = false;
    resizeObserver?.disconnect();
    windowObject.removeEventListener?.('resize', handleWindowResize);
    documentObject?.removeEventListener?.('visibilitychange', handleVisibilityChange);
    clear();
  }

  return Object.freeze({
    start,
    resize,
    setCamera,
    setWorld,
    configure,
    setRouteVisualScale,
    drawImmediately,
    setPaused,
    getSnapshot,
    destroy,
  });
}
