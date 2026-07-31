const DEFAULT_DPR_CAP = 2;
const DEFAULT_MAX_VISIBLE_DOTS = 20000;
const MAX_PALETTE_COLORS = 12;
const COLOR_OPACITY_BUCKET_COUNT = 16;
const COLOR_WAKE_HOLD_RATIO = 0.55;
const COLOR_WAKE_RISE_MIN_MS = 220;
const COLOR_WAKE_RISE_VARIANCE_MS = 260;
const COLOR_WAKE_DELAY_MAX_MS = 120;
const COLOR_WAKE_PEAK_MIN = 0.68;
const COLOR_WAKE_RADIUS_SCALE_MIN = 0.82;
const COLOR_WAKE_RADIUS_SCALE_MAX = 1.18;
const MIN_TEMPORAL_FRAME_INTERVAL_MS = 1000 / 60;
const TWO_PI = Math.PI * 2;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finite(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function wrapInteger(value, period) {
  const remainder = value % period;
  return remainder < 0 ? remainder + period : remainder;
}

export function hashDotCoordinate(column, row, seed = 1) {
  let hash = (Number(seed) >>> 0) ^ 0x9e3779b9;
  hash ^= Math.imul(Number(column) | 0, 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 16), 0xc2b2ae35);
  hash ^= Math.imul(Number(row) | 0, 0x27d4eb2f);
  hash = Math.imul(hash ^ (hash >>> 15), 0x165667b1);
  return (hash ^ (hash >>> 16)) >>> 0;
}

function secondaryHash(hash) {
  let mixed = (hash ^ 0xa511e9b3) >>> 0;
  mixed = Math.imul(mixed ^ (mixed >>> 16), 0x7feb352d);
  mixed = Math.imul(mixed ^ (mixed >>> 15), 0x846ca68b);
  return (mixed ^ (mixed >>> 16)) >>> 0;
}

function paletteMatches(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function numericArrayMatches(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

/**
 * Creates a redraw-on-change Canvas 2D dot renderer. Camera and pointer changes
 * coalesce into one frame; only a rising or fading colour wake keeps a temporary loop alive.
 */
export function createPlaygroundDotFieldRenderer(canvas, options = {}) {
  const context = canvas?.getContext?.('2d', { alpha: true, desynchronized: true });
  if (!canvas || !context) throw new TypeError('A Canvas 2D surface is required.');
  const windowObject = options.windowObject || globalThis.window;
  const documentObject = options.documentObject || globalThis.document;
  if (!windowObject?.requestAnimationFrame || !windowObject?.cancelAnimationFrame) {
    throw new TypeError('A window-like animation frame owner is required.');
  }

  let started = false;
  let disposed = false;
  let paused = false;
  let hidden = documentObject?.visibilityState === 'hidden';
  let frameId = 0;
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
  let colorWakeRadiusPx = clamp(finite(options.colorWakeRadiusPx, 168), 1, 2048);
  let colorWakePersistenceMs = clamp(finite(options.colorWakePersistenceMs, 1200), 1, 10000);
  let colorWakeOpacity = clamp(finite(options.colorWakeOpacity, 0.88), 0, 1);
  let colorWakeDensity = clamp(finite(options.colorWakeDensity, 1), 0, 1);
  let colorWakeEdgeSoftness = clamp(finite(options.colorWakeEdgeSoftness, 0), 0, 1);
  let colorWakeDotScale = clamp(finite(options.colorWakeDotScale, 1), 0.1, 3);
  let neutralColor = String(options.neutralColor || '#8a8a8a');
  let layoutSeed = Number(options.layoutSeed ?? 1) >>> 0;
  let maximumDpr = clamp(finite(options.maximumDpr, DEFAULT_DPR_CAP), 1, 3);
  let maximumVisibleDots = Math.max(
    256,
    Math.floor(finite(options.maximumVisibleDots, DEFAULT_MAX_VISIBLE_DOTS)),
  );
  let paletteId = '';
  let paletteGeneration = 0;
  let colors = [];
  let roleColorIndices = new Int16Array(0);
  let roleThresholds = new Float64Array(0);
  let drawCount = 0;
  let lastVisibleDotCount = 0;
  let lastDrawnDotCount = 0;
  let lastSamplingStride = 1;
  let renderDirty = true;
  let pointerDirty = false;
  let pointerActive = false;
  let pointerX = 0;
  let pointerY = 0;
  let lastTemporalDrawAt = 0;
  let activationSequence = 1;
  let activeCount = 0;
  let hoveredDotCount = 0;
  let risingDotCount = 0;
  let fadingDotCount = 0;
  let hoverPass = 0;
  let minimumInfluenceRadiusScale = 0;
  let maximumInfluenceRadiusScale = 0;
  let minimumInfluenceStrength = 0;
  let maximumInfluenceStrength = 0;
  let activationTimes = new Float64Array(0);
  let activationColorSamples = new Uint32Array(0);
  let activationStrengths = new Float32Array(0);
  let activationStartStrengths = new Float32Array(0);
  let releaseStrengths = new Float32Array(0);
  let hoverPasses = new Uint32Array(0);
  let activeFlags = new Uint8Array(0);
  let activeIndices = new Int32Array(0);
  let activeBucketNext = new Int32Array(0);
  let activeScreenX = new Float64Array(0);
  let activeScreenY = new Float64Array(0);
  const bucketHeads = new Int32Array(MAX_PALETTE_COLORS * COLOR_OPACITY_BUCKET_COUNT);
  const resizeTarget = options.resizeTarget || canvas;
  const onDraw = typeof options.onDraw === 'function' ? options.onDraw : null;

  function resetActivationState() {
    const dotCount = worldColumns * worldRows;
    activationTimes = new Float64Array(dotCount);
    activationColorSamples = new Uint32Array(dotCount);
    activationStrengths = new Float32Array(dotCount);
    activationStartStrengths = new Float32Array(dotCount);
    releaseStrengths = new Float32Array(dotCount);
    hoverPasses = new Uint32Array(dotCount);
    activeFlags = new Uint8Array(dotCount);
    activeIndices = new Int32Array(dotCount);
    activeBucketNext = new Int32Array(dotCount);
    activeScreenX = new Float64Array(dotCount);
    activeScreenY = new Float64Array(dotCount);
    activeCount = 0;
    hoveredDotCount = 0;
    risingDotCount = 0;
    fadingDotCount = 0;
    hoverPass = 0;
    minimumInfluenceRadiusScale = 0;
    maximumInfluenceRadiusScale = 0;
    minimumInfluenceStrength = 0;
    maximumInfluenceStrength = 0;
    bucketHeads.fill(-1);
  }

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
    const visibleRadius = dotRadiusPx * worldScale;
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

  function resolveHoveredProgress(index, now) {
    const sample = activationColorSamples[index];
    const delayMs = (secondaryHash(sample ^ 0x3c6ef372) / 4294967296)
      * COLOR_WAKE_DELAY_MAX_MS;
    const durationMs = COLOR_WAKE_RISE_MIN_MS
      + ((secondaryHash(sample ^ 0xbb67ae85) / 4294967296)
        * COLOR_WAKE_RISE_VARIANCE_MS);
    const startedAt = -activationTimes[index];
    return clamp((now - startedAt - delayMs) / durationMs, 0, 1);
  }

  function resolveHoveredStrength(index, progress) {
    const sample = activationColorSamples[index];
    const peakStrength = COLOR_WAKE_PEAK_MIN
      + ((secondaryHash(sample ^ 0xa54ff53a) / 4294967296) * (1 - COLOR_WAKE_PEAK_MIN));
    const easedProgress = progress * progress * (3 - (2 * progress));
    const startStrength = activationStartStrengths[index];
    return startStrength + ((peakStrength - startStrength) * easedProgress);
  }

  function resolveReleasedStrength(index, now) {
    const age = now - activationTimes[index];
    if (age <= 0) return releaseStrengths[index];
    const holdMs = colorWakePersistenceMs * COLOR_WAKE_HOLD_RATIO;
    if (age <= holdMs) return releaseStrengths[index];
    const fadeMs = Math.max(1, colorWakePersistenceMs - holdMs);
    return releaseStrengths[index] * clamp(1 - ((age - holdMs) / fadeMs), 0, 1);
  }

  function resolveInfluenceRadiusScale(deltaX, deltaY, coordinateHash) {
    const angle = Math.atan2(deltaY, deltaX);
    const seedPhase = (layoutSeed / 4294967296) * TWO_PI;
    const broadVariation = (Math.sin((angle * 3) + seedPhase) * 0.09)
      + (Math.sin((angle * 5) - (seedPhase * 0.61)) * 0.055);
    const microVariation = (
      (secondaryHash(coordinateHash ^ 0x510e527f) / 4294967296) - 0.5
    ) * 0.08;
    return clamp(
      1 + broadVariation + microVariation,
      COLOR_WAKE_RADIUS_SCALE_MIN,
      COLOR_WAKE_RADIUS_SCALE_MAX,
    );
  }

  function resolveInfluenceStrength(normalizedDistance) {
    const distance = clamp(normalizedDistance, 0, 1);
    const smoothDistance = distance * distance * (3 - (2 * distance));
    const falloffPower = 0.72 + (colorWakeEdgeSoftness * 0.78);
    return Math.pow(1 - smoothDistance, falloffPower);
  }

  function releaseUnvisitedHoveredDots(now, currentPass) {
    for (let offset = 0; offset < activeCount; offset += 1) {
      const index = activeIndices[offset];
      if (activationTimes[index] >= 0 || hoverPasses[index] === currentPass) continue;
      releaseStrengths[index] = resolveHoveredStrength(
        index,
        resolveHoveredProgress(index, now),
      );
      activationTimes[index] = now;
    }
  }

  function activatePointerArea(now) {
    if (!pointerDirty) return;
    pointerDirty = false;
    hoverPass = (hoverPass + 1) >>> 0;
    if (hoverPass === 0) {
      hoverPasses.fill(0);
      hoverPass = 1;
    }
    const currentPass = hoverPass;
    if (!pointerActive || !colors.length) {
      minimumInfluenceRadiusScale = 0;
      maximumInfluenceRadiusScale = 0;
      minimumInfluenceStrength = 0;
      maximumInfluenceStrength = 0;
      releaseUnvisitedHoveredDots(now, currentPass);
      return;
    }

    const pointerWorldX = cameraX + ((pointerX - viewportCenterX) / worldScale);
    const pointerWorldY = cameraY + ((pointerY - viewportCenterY) / worldScale);
    const wakeRadiusPx = colorWakeRadiusPx / worldScale;
    const searchRadiusPx = wakeRadiusPx * COLOR_WAKE_RADIUS_SCALE_MAX;
    const minimumColumn = Math.ceil((pointerWorldX - searchRadiusPx) / gridSpacingPx);
    const maximumColumn = Math.floor((pointerWorldX + searchRadiusPx) / gridSpacingPx);
    const minimumRow = Math.ceil((pointerWorldY - searchRadiusPx) / gridSpacingPx);
    const maximumRow = Math.floor((pointerWorldY + searchRadiusPx) / gridSpacingPx);
    minimumInfluenceRadiusScale = COLOR_WAKE_RADIUS_SCALE_MAX;
    maximumInfluenceRadiusScale = COLOR_WAKE_RADIUS_SCALE_MIN;
    minimumInfluenceStrength = 1;
    maximumInfluenceStrength = 0;
    let influencedDotCount = 0;

    for (let row = minimumRow; row <= maximumRow; row += 1) {
      const deltaY = (row * gridSpacingPx) - pointerWorldY;
      const wrappedRow = wrapInteger(row, worldRows);
      for (let column = minimumColumn; column <= maximumColumn; column += 1) {
        const deltaX = (column * gridSpacingPx) - pointerWorldX;
        const distanceSquared = (deltaX * deltaX) + (deltaY * deltaY);
        const wrappedColumn = wrapInteger(column, worldColumns);
        const coordinateHash = hashDotCoordinate(wrappedColumn, wrappedRow, layoutSeed);
        const densitySample = secondaryHash(coordinateHash ^ 0x6d2b79f5) / 4294967296;
        if (densitySample >= colorWakeDensity) continue;
        const influenceRadiusScale = resolveInfluenceRadiusScale(
          deltaX,
          deltaY,
          coordinateHash,
        );
        const influenceRadiusPx = wakeRadiusPx * influenceRadiusScale;
        if (distanceSquared >= influenceRadiusPx * influenceRadiusPx) continue;
        const normalizedDistance = Math.sqrt(distanceSquared) / influenceRadiusPx;
        const influenceStrength = resolveInfluenceStrength(normalizedDistance);
        if (influenceStrength <= 0) continue;
        const index = (wrappedRow * worldColumns) + wrappedColumn;
        if (!activeFlags[index]) {
          activeFlags[index] = 1;
          activeIndices[activeCount] = index;
          activeCount += 1;
          activationColorSamples[index] = secondaryHash(
            coordinateHash ^ activationSequence,
          );
          activationSequence = (activationSequence + 1) >>> 0;
          activationStartStrengths[index] = 0;
          releaseStrengths[index] = 0;
          activationTimes[index] = -now;
        } else if (activationTimes[index] >= 0) {
          activationStartStrengths[index] = resolveReleasedStrength(index, now);
          activationTimes[index] = -now;
        }
        hoverPasses[index] = currentPass;
        activationStrengths[index] = influenceStrength;
        minimumInfluenceRadiusScale = Math.min(
          minimumInfluenceRadiusScale,
          influenceRadiusScale,
        );
        maximumInfluenceRadiusScale = Math.max(
          maximumInfluenceRadiusScale,
          influenceRadiusScale,
        );
        minimumInfluenceStrength = Math.min(minimumInfluenceStrength, influenceStrength);
        maximumInfluenceStrength = Math.max(maximumInfluenceStrength, influenceStrength);
        influencedDotCount += 1;
      }
    }
    if (influencedDotCount === 0) {
      minimumInfluenceRadiusScale = 0;
      maximumInfluenceRadiusScale = 0;
      minimumInfluenceStrength = 0;
      maximumInfluenceStrength = 0;
    }
    releaseUnvisitedHoveredDots(now, currentPass);
  }

  function resolveColorIndex(sample) {
    if (!colors.length) return -1;
    if (!roleThresholds.length) return sample % colors.length;
    const roleIndex = sample % roleColorIndices.length;
    const colorIndex = roleColorIndices[roleIndex];
    return Number.isInteger(colorIndex) && colorIndex >= 0 && colorIndex < colors.length
      ? colorIndex
      : 0;
  }

  function drawActiveColors(now) {
    bucketHeads.fill(-1);
    hoveredDotCount = 0;
    risingDotCount = 0;
    fadingDotCount = 0;
    let retainedCount = 0;
    const worldWidthPx = worldColumns * gridSpacingPx;
    const worldHeightPx = worldRows * gridSpacingPx;

    for (let offset = 0; offset < activeCount; offset += 1) {
      const index = activeIndices[offset];
      const activationTime = activationTimes[index];
      const hovered = activationTime < 0;
      const age = hovered ? 0 : now - activationTime;
      if (!hovered && (age < 0 || age >= colorWakePersistenceMs)) {
        activeFlags[index] = 0;
        activationTimes[index] = 0;
        continue;
      }

      activeIndices[retainedCount] = index;
      retainedCount += 1;
      let temporalStrength;
      if (hovered) {
        hoveredDotCount += 1;
        const hoverProgress = resolveHoveredProgress(index, now);
        temporalStrength = resolveHoveredStrength(index, hoverProgress);
        if (hoverProgress < 1) risingDotCount += 1;
      } else {
        fadingDotCount += 1;
        temporalStrength = resolveReleasedStrength(index, now);
      }

      const row = Math.floor(index / worldColumns);
      const column = index - (row * worldColumns);
      const baseX = column * gridSpacingPx;
      const baseY = row * gridSpacingPx;
      const copyColumn = Math.round((cameraX - baseX) / worldWidthPx);
      const copyRow = Math.round((cameraY - baseY) / worldHeightPx);
      const screenX = viewportCenterX + ((baseX + (copyColumn * worldWidthPx) - cameraX)
        * worldScale);
      const screenY = viewportCenterY + ((baseY + (copyRow * worldHeightPx) - cameraY)
        * worldScale);
      const visibleRadius = dotRadiusPx * worldScale;
      if (screenX < -visibleRadius || screenX > width + visibleRadius
        || screenY < -visibleRadius || screenY > height + visibleRadius) continue;

      const colorIndex = resolveColorIndex(activationColorSamples[index]);
      if (colorIndex < 0) continue;
      const combinedStrength = activationStrengths[index] * temporalStrength;
      if (combinedStrength <= 0) continue;
      const opacityBucket = Math.min(
        COLOR_OPACITY_BUCKET_COUNT - 1,
        Math.floor((1 - combinedStrength) * COLOR_OPACITY_BUCKET_COUNT),
      );
      const bucketIndex = (colorIndex * COLOR_OPACITY_BUCKET_COUNT) + opacityBucket;
      activeScreenX[index] = screenX;
      activeScreenY[index] = screenY;
      activeBucketNext[index] = bucketHeads[bucketIndex];
      bucketHeads[bucketIndex] = index;
    }
    activeCount = retainedCount;

    const colorCount = Math.min(colors.length, MAX_PALETTE_COLORS);
    const activeRadius = dotRadiusPx * worldScale * colorWakeDotScale;
    for (let colorIndex = 0; colorIndex < colorCount; colorIndex += 1) {
      context.fillStyle = colors[colorIndex];
      for (let opacityBucket = 0; opacityBucket < COLOR_OPACITY_BUCKET_COUNT; opacityBucket += 1) {
        let index = bucketHeads[(colorIndex * COLOR_OPACITY_BUCKET_COUNT) + opacityBucket];
        if (index < 0) continue;
        context.globalAlpha = colorWakeOpacity
          * (1 - (opacityBucket / COLOR_OPACITY_BUCKET_COUNT));
        context.beginPath();
        while (index >= 0) {
          const screenX = activeScreenX[index];
          const screenY = activeScreenY[index];
          context.moveTo(screenX + activeRadius, screenY);
          context.arc(screenX, screenY, activeRadius, 0, TWO_PI);
          index = activeBucketNext[index];
        }
        context.fill();
      }
    }
  }

  function completeDraw() {
    drawCount += 1;
    onDraw?.();
  }

  function draw(timestamp) {
    frameId = 0;
    if (!started || disposed || paused || hidden || !width || !height) return;
    const now = Number.isFinite(Number(timestamp))
      ? Number(timestamp)
      : (windowObject.performance?.now?.() || globalThis.performance?.now?.() || 1);
    if (!renderDirty && !pointerDirty
      && lastTemporalDrawAt > 0
      && now - lastTemporalDrawAt < MIN_TEMPORAL_FRAME_INTERVAL_MS) {
      scheduleDraw();
      return;
    }
    activatePointerArea(Math.max(1, now));
    lastDrawnCameraX = cameraX;
    lastDrawnCameraY = cameraY;
    clear();
    if (dotOpacity <= 0 || dotRadiusPx <= 0) {
      completeDraw();
      lastVisibleDotCount = 0;
      lastDrawnDotCount = 0;
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
    drawActiveColors(Math.max(1, now));
    context.globalAlpha = 1;
    renderDirty = false;
    lastTemporalDrawAt = now;
    completeDraw();
    if (risingDotCount > 0 || fadingDotCount > 0) scheduleDraw();
  }

  function scheduleDraw() {
    if (!started || disposed || paused || hidden || frameId) return;
    frameId = windowObject.requestAnimationFrame(draw);
  }

  function drawImmediately() {
    if (!started || disposed || paused || hidden) return false;
    if (frameId) windowObject.cancelAnimationFrame(frameId);
    frameId = 0;
    draw(windowObject.performance?.now?.() || globalThis.performance?.now?.() || 1);
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
        || lastDrawnCameraX !== cameraX
        || lastDrawnCameraY !== cameraY)) drawImmediately();
      return false;
    }
    cameraX = resolvedX;
    cameraY = resolvedY;
    viewportCenterX = resolvedCenterX;
    viewportCenterY = resolvedCenterY;
    if (hasAuthoredCenter) automaticViewportCenter = false;
    if (pointerActive) pointerDirty = true;
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
    resetActivationState();
    renderDirty = true;
    scheduleDraw();
  }

  function setPalette(snapshot = {}) {
    const nextColors = Array.isArray(snapshot.colors)
      ? snapshot.colors.slice(0, MAX_PALETTE_COLORS).map((color) => String(color))
      : [];
    const distribution = Array.isArray(snapshot.distribution) ? snapshot.distribution : [];
    let totalWeight = 0;
    for (let index = 0; index < distribution.length; index += 1) {
      const weight = Number(distribution[index]?.weight);
      if (Number.isFinite(weight) && weight > 0) totalWeight += weight;
    }
    const nextRoleColorIndices = new Int16Array(distribution.length);
    const nextRoleThresholds = new Float64Array(distribution.length);
    let accumulatedWeight = 0;
    for (let index = 0; index < distribution.length; index += 1) {
      const row = distribution[index];
      const colorIndex = Number(row?.colorIndex);
      const weight = Number(row?.weight);
      nextRoleColorIndices[index] = Number.isInteger(colorIndex)
        && colorIndex >= 0
        && colorIndex < nextColors.length
        ? colorIndex
        : 0;
      accumulatedWeight += Number.isFinite(weight) && weight > 0 ? weight : 0;
      nextRoleThresholds[index] = totalWeight > 0 ? accumulatedWeight / totalWeight : 1;
    }
    const nextPaletteId = String(snapshot.paletteId || '');
    const nextGeneration = Number(snapshot.generation) || 0;
    const changed = !paletteMatches(colors, nextColors)
      || nextPaletteId !== paletteId
      || nextGeneration !== paletteGeneration
      || !numericArrayMatches(roleColorIndices, nextRoleColorIndices)
      || !numericArrayMatches(roleThresholds, nextRoleThresholds);
    colors = nextColors;
    roleColorIndices = nextRoleColorIndices;
    roleThresholds = nextRoleThresholds;
    paletteId = nextPaletteId;
    paletteGeneration = nextGeneration;
    if (changed) {
      if (pointerActive) pointerDirty = true;
      renderDirty = true;
      scheduleDraw();
    }
  }

  function setPointer(nextX, nextY, nextActive = true) {
    const active = nextActive === true;
    const resolvedX = active ? finite(nextX, pointerX) : pointerX;
    const resolvedY = active ? finite(nextY, pointerY) : pointerY;
    if (active === pointerActive && resolvedX === pointerX && resolvedY === pointerY) return false;
    pointerActive = active;
    pointerX = resolvedX;
    pointerY = resolvedY;
    pointerDirty = true;
    scheduleDraw();
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
    const nextColorWakeRadius = clamp(
      finite(nextOptions.colorWakeRadiusPx, colorWakeRadiusPx),
      1,
      2048,
    );
    const nextColorWakePersistence = clamp(
      finite(nextOptions.colorWakePersistenceMs, colorWakePersistenceMs),
      1,
      10000,
    );
    const nextColorWakeOpacity = clamp(
      finite(nextOptions.colorWakeOpacity, colorWakeOpacity),
      0,
      1,
    );
    const nextColorWakeDensity = clamp(
      finite(nextOptions.colorWakeDensity, colorWakeDensity),
      0,
      1,
    );
    const nextColorWakeEdgeSoftness = clamp(
      finite(nextOptions.colorWakeEdgeSoftness, colorWakeEdgeSoftness),
      0,
      1,
    );
    const nextColorWakeDotScale = clamp(
      finite(nextOptions.colorWakeDotScale, colorWakeDotScale),
      0.1,
      3,
    );
    const nextNeutralColor = String(nextOptions.neutralColor || neutralColor);
    const nextSeed = Number(nextOptions.layoutSeed ?? layoutSeed) >>> 0;
    const nextMaximumDpr = clamp(finite(nextOptions.maximumDpr, maximumDpr), 1, 3);
    const nextMaximumVisibleDots = Math.max(
      256,
      Math.floor(finite(nextOptions.maximumVisibleDots, maximumVisibleDots)),
    );
    const dprChanged = nextMaximumDpr !== maximumDpr;
    dotRadiusPx = nextRadius;
    worldScale = nextWorldScale;
    dotOpacity = nextOpacity;
    colorWakeRadiusPx = nextColorWakeRadius;
    colorWakePersistenceMs = nextColorWakePersistence;
    colorWakeOpacity = nextColorWakeOpacity;
    colorWakeDensity = nextColorWakeDensity;
    colorWakeEdgeSoftness = nextColorWakeEdgeSoftness;
    colorWakeDotScale = nextColorWakeDotScale;
    neutralColor = nextNeutralColor;
    layoutSeed = nextSeed;
    maximumDpr = nextMaximumDpr;
    maximumVisibleDots = nextMaximumVisibleDots;
    if (pointerActive) pointerDirty = true;
    renderDirty = true;
    if (dprChanged) resize(true);
    else scheduleDraw();
  }

  function handleVisibilityChange() {
    hidden = documentObject?.visibilityState === 'hidden';
    if (hidden && frameId) {
      windowObject.cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!hidden) {
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
    resetActivationState();
    documentObject?.addEventListener?.('visibilitychange', handleVisibilityChange);
    windowObject.addEventListener?.('resize', handleWindowResize);
    resizeObserver?.observe(resizeTarget);
    setPalette(options.palette || options);
    resize(true);
    scheduleDraw();
  }

  function setPaused(nextPaused) {
    paused = nextPaused === true;
    if (paused && frameId) {
      windowObject.cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!paused) {
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
      frameScheduled: frameId !== 0,
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
      colorWakeRadiusPx,
      colorWakePersistenceMs,
      colorWakeOpacity,
      colorWakeDensity,
      colorWakeEdgeSoftness,
      colorWakeDotScale,
      pointerActive,
      minimumInfluenceRadiusScale,
      maximumInfluenceRadiusScale,
      minimumInfluenceStrength,
      maximumInfluenceStrength,
      activeColoredDotCount: activeCount,
      hoveredColoredDotCount: hoveredDotCount,
      risingColoredDotCount: risingDotCount,
      fadingColoredDotCount: fadingDotCount,
      visibleDotCount: lastVisibleDotCount,
      drawnDotCount: lastDrawnDotCount,
      samplingStride: lastSamplingStride,
      paletteId,
      paletteGeneration,
      paletteColorCount: colors.length,
      roleCount: roleThresholds.length,
    };
  }

  function destroy() {
    if (disposed) return;
    disposed = true;
    started = false;
    if (frameId) windowObject.cancelAnimationFrame(frameId);
    frameId = 0;
    resizeObserver?.disconnect();
    windowObject.removeEventListener?.('resize', handleWindowResize);
    documentObject?.removeEventListener?.('visibilitychange', handleVisibilityChange);
    clear();
    colors.length = 0;
    roleColorIndices = new Int16Array(0);
    roleThresholds = new Float64Array(0);
  }

  return Object.freeze({
    start,
    resize,
    setCamera,
    setWorld,
    setPointer,
    setPalette,
    configure,
    setPaused,
    getSnapshot,
    destroy,
  });
}
