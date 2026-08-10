const DEFAULT_DPR_CAP = 2;
const DEFAULT_MAX_VISIBLE_DOTS = 20000;
const TWO_PI = Math.PI * 2;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

/**
 * Creates a redraw-on-change Canvas 2D dot renderer. Camera changes coalesce
 * into one frame and the neutral field sleeps whenever its geometry is stable.
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
  let routeVisualScale = clamp(finite(options.routeVisualScale, 1), 0, 1);
  let neutralColor = String(options.neutralColor || '#8a8a8a');
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
    const minimumColumn = Math.ceil(
      (cameraX - (viewportCenterX / worldScale) - dotRadiusPx) / gridSpacingPx,
    );
    const maximumColumn = Math.floor(
      (cameraX + ((width - viewportCenterX) / worldScale) + dotRadiusPx) / gridSpacingPx,
    );
    const minimumRow = Math.ceil(
      (cameraY - (viewportCenterY / worldScale) - dotRadiusPx) / gridSpacingPx,
    );
    const maximumRow = Math.floor(
      (cameraY + ((height - viewportCenterY) / worldScale) + dotRadiusPx) / gridSpacingPx,
    );
    const columnCount = Math.max(0, maximumColumn - minimumColumn + 1);
    const rowCount = Math.max(0, maximumRow - minimumRow + 1);
    const visibleDotCount = columnCount * rowCount;
    const samplingStride = visibleDotCount > maximumVisibleDots
      ? Math.ceil(Math.sqrt(visibleDotCount / maximumVisibleDots))
      : 1;
    lastVisibleDotCount = visibleDotCount;
    lastSamplingStride = samplingStride;
    const sampledColumnCount = columnCount
      ? Math.floor((columnCount - 1) / samplingStride) + 1
      : 0;
    const sampledRowCount = rowCount
      ? Math.floor((rowCount - 1) / samplingStride) + 1
      : 0;
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

  /** Camera coordinates must be the modulo-rendered values from the camera controller. */
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
      routeVisualScale,
      neutralColor,
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
