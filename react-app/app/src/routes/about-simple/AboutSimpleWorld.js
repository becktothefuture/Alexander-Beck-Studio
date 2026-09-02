import {
  getSimulationBodyMaterialConfig,
  getSimulationBodyMaterialSprite,
  getSimulationBodyMaterialStats,
  prewarmSimulationBodyMaterial,
  subscribeSimulationBodyMaterial,
} from '../../legacy/modules/rendering/materials/simulation-body-material.js';

const TAU = Math.PI * 2;
const PALETTE_SIZE = 6;
const FIELD_LAYER_COUNT = 3;
const FIELD_POINT_COUNT = 1800;
const GATE_COUNT = 16;
const GATE_EDGE_POINT_COUNT = 52;
const GATE_POINT_COUNT = GATE_COUNT * GATE_EDGE_POINT_COUNT * 4;
const LANDSCAPE_POINT_COUNT = 3240;
const MOBILE_BREAKPOINT_PX = 720;
const DESKTOP_DPR_CAP = 1.5;
const MOBILE_DPR_CAP = 1.25;
const CAMERA_START_Z = -12;
const CAMERA_TRAVEL_Z = 370;
const FIRST_GATE_Z = 38;
const GATE_SPACING_Z = 10.8;
const GATE_NEAR_CLIP_Z = 1.5;
const GATE_FAR_CLIP_Z = 225;
const GATE_REVEAL_START = 0.075;
const GATE_REVEAL_END = 0.13;
const LANDSCAPE_START = 0.58;
const LANDSCAPE_REVEAL_END = 0.66;
const REDUCED_MOTION_RENDER_PROGRESS = 0.82;
const UINT32_RANGE = 4294967296;
const FIELD_RADIUS_MULTIPLIER = 3.4;
const FIELD_DESKTOP_STRIDE = 3;
const FIELD_MOBILE_STRIDE = 4;
const GATE_DESKTOP_STRIDE = 2;
const GATE_MOBILE_STRIDE = 3;
const LANDSCAPE_DESKTOP_STRIDE = 2;
const LANDSCAPE_MOBILE_STRIDE = 3;

const POINT_FAMILY_FIELD = 'field';
const POINT_FAMILY_GATES = 'field,gates';
const POINT_FAMILY_LANDSCAPE = 'field,landscape';
const MOTION_MODE_DIRECT = 'direct-progress';
const MOTION_MODE_REDUCED = 'reduced-static';
const RENDER_PROGRESS_DIRECT = 'scroll-progress';
const RENDER_PROGRESS_REDUCED = '0.82';

const PALETTE_VARIABLES = Object.freeze([
  '--ball-1',
  '--ball-4',
  '--ball-3',
  '--ball-7',
  '--ball-8',
  '--ball-6',
]);

const PALETTE_FALLBACKS = Object.freeze([
  '#74777a',
  '#008f4d',
  '#ffffff',
  '#1852ff',
  '#a34b43',
  '#bd9530',
]);

const FIELD_LAYER_OPACITY = Object.freeze([0.3, 0.52, 0.84]);
const FIELD_LAYER_PARALLAX = Object.freeze([0.08, 0.2, 0.42]);
const FIELD_LAYER_SCALE = Object.freeze([0.62, 0.9, 1.2]);
const GATE_COUNT_LABELS = Object.freeze([
  '0', '1', '2', '3', '4', '5', '6', '7', '8',
  '9', '10', '11', '12', '13', '14', '15', '16',
]);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function lerp(start, end, progress) {
  return start + ((end - start) * progress);
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / UINT32_RANGE;
  };
}

function getCameraPathX(z) {
  const exitScale = clamp01((310 - z) / 105);
  return (
    (Math.sin((z - 18) * 0.034) * 15)
    + (Math.sin((z + 14) * 0.071) * 4.5)
  ) * exitScale;
}

function getCameraPathY(z) {
  const exitScale = clamp01((310 - z) / 105);
  return (
    (Math.cos((z + 8) * 0.027) * 3.8)
    + (Math.sin(z * 0.061) * 1.7)
  ) * exitScale;
}

function createFieldGeometry() {
  const x = new Float32Array(FIELD_POINT_COUNT);
  const y = new Float32Array(FIELD_POINT_COUNT);
  const size = new Float32Array(FIELD_POINT_COUNT);
  const ranges = new Uint16Array((FIELD_LAYER_COUNT * PALETTE_SIZE) + 1);
  const random = createSeededRandom(0x12fa62e1);
  const pointsPerBatch = FIELD_POINT_COUNT / (FIELD_LAYER_COUNT * PALETTE_SIZE);
  let pointIndex = 0;

  for (let layerIndex = 0; layerIndex < FIELD_LAYER_COUNT; layerIndex += 1) {
    for (let colorIndex = 0; colorIndex < PALETTE_SIZE; colorIndex += 1) {
      const rangeIndex = (layerIndex * PALETTE_SIZE) + colorIndex;
      ranges[rangeIndex] = pointIndex;
      const rangeEnd = pointIndex + pointsPerBatch;
      for (; pointIndex < rangeEnd; pointIndex += 1) {
        x[pointIndex] = random() - 0.5;
        y[pointIndex] = random() - 0.5;
        size[pointIndex] = 0.88 + (random() * 1.04);
      }
    }
  }
  ranges[ranges.length - 1] = pointIndex;

  return { x, y, size, ranges };
}

function createGateGeometry() {
  const x = new Float32Array(GATE_POINT_COUNT);
  const y = new Float32Array(GATE_POINT_COUNT);
  const z = new Float32Array(GATE_POINT_COUNT);
  const size = new Float32Array(GATE_POINT_COUNT);
  const offsets = new Uint16Array(GATE_COUNT + 1);
  const random = createSeededRandom(0xa17e5c43);
  let pointIndex = 0;

  for (let gateIndex = 0; gateIndex < GATE_COUNT; gateIndex += 1) {
    offsets[gateIndex] = pointIndex;
    const gateZ = FIRST_GATE_Z + (gateIndex * GATE_SPACING_Z);
    const centerX = getCameraPathX(gateZ);
    const centerY = getCameraPathY(gateZ);
    const halfExtent = 18.5 + (Math.sin(gateIndex * 0.74) * 1.35);
    const roll = (Math.sin(gateIndex * 0.58) * 0.14)
      + (Math.cos(gateIndex * 0.27) * 0.035);
    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);

    for (let edgeIndex = 0; edgeIndex < 4; edgeIndex += 1) {
      for (let edgePointIndex = 0;
        edgePointIndex < GATE_EDGE_POINT_COUNT;
        edgePointIndex += 1) {
        const edgeProgress = edgePointIndex / (GATE_EDGE_POINT_COUNT - 1);
        const edgePosition = lerp(-halfExtent, halfExtent, edgeProgress);
        let localX = edgePosition;
        let localY = -halfExtent;
        if (edgeIndex === 1) {
          localX = halfExtent;
          localY = edgePosition;
        } else if (edgeIndex === 2) {
          localY = halfExtent;
        } else if (edgeIndex === 3) {
          localX = -halfExtent;
          localY = edgePosition;
        }

        x[pointIndex] = centerX + (localX * cosRoll) - (localY * sinRoll);
        y[pointIndex] = centerY + (localX * sinRoll) + (localY * cosRoll);
        z[pointIndex] = gateZ;
        size[pointIndex] = 0.76 + (random() * 0.48);
        pointIndex += 1;
      }
    }
  }
  offsets[GATE_COUNT] = pointIndex;

  return { x, y, z, size, offsets };
}

function getLandscapeHeight(x, z) {
  const ground = -16
    + (Math.sin(x * 0.043) * 2.4)
    + (Math.sin((x + z) * 0.021) * 1.8);
  const ridgeDepth = Math.exp(-(((z - 474) / 88) ** 2));
  const leftPeak = Math.exp(-(((x + 112) / 60) ** 2)) * 44;
  const centerPeak = Math.exp(-(((x - 12) / 92) ** 2)) * 52;
  const rightPeak = Math.exp(-(((x - 138) / 66) ** 2)) * 37;
  return ground + (ridgeDepth * Math.max(leftPeak, centerPeak, rightPeak));
}

function createLandscapeGeometry() {
  const x = new Float32Array(LANDSCAPE_POINT_COUNT);
  const y = new Float32Array(LANDSCAPE_POINT_COUNT);
  const z = new Float32Array(LANDSCAPE_POINT_COUNT);
  const size = new Float32Array(LANDSCAPE_POINT_COUNT);
  const ranges = new Uint16Array(PALETTE_SIZE + 1);
  const random = createSeededRandom(0x6d2b79f5);
  const pointsPerBatch = LANDSCAPE_POINT_COUNT / PALETTE_SIZE;
  let pointIndex = 0;

  for (let colorIndex = 0; colorIndex < PALETTE_SIZE; colorIndex += 1) {
    ranges[colorIndex] = pointIndex;
    const rangeEnd = pointIndex + pointsPerBatch;
    for (; pointIndex < rangeEnd; pointIndex += 1) {
      const worldX = lerp(-520, 520, random());
      const worldZ = lerp(220, 720, random());
      x[pointIndex] = worldX;
      z[pointIndex] = worldZ;
      y[pointIndex] = getLandscapeHeight(worldX, worldZ);
      size[pointIndex] = 0.7 + (random() * 0.72);
    }
  }
  ranges[PALETTE_SIZE] = pointIndex;

  return { x, y, z, size, ranges };
}

const FIELD = createFieldGeometry();
const GATES = createGateGeometry();
const LANDSCAPE = createLandscapeGeometry();

/**
 * Mounts the simplified About point world onto an existing Canvas 2D surface.
 * Scroll progress is the camera state: no easing or delayed target is applied.
 */
export function mountAboutSimpleWorld(canvas, root) {
  const context = canvas?.getContext?.('2d', { alpha: true, desynchronized: true });
  if (!canvas || !root || !context) {
    throw new TypeError('AboutSimpleWorld requires a canvas and root element.');
  }

  const windowObject = root.ownerDocument?.defaultView || globalThis.window;
  const documentElement = root.ownerDocument?.documentElement || null;
  if (!windowObject?.requestAnimationFrame || !windowObject?.cancelAnimationFrame) {
    throw new TypeError('AboutSimpleWorld requires an animation frame owner.');
  }

  const palette = PALETTE_FALLBACKS.slice();
  let materialSprites = [];
  let materialTheme = 'light';
  let bodyMaterialEnabled = getSimulationBodyMaterialConfig().enabled;
  const reducedMotionQuery = windowObject.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  let reducedMotion = reducedMotionQuery?.matches === true;
  let destroyed = false;
  let frameId = 0;
  let progress = 0;
  let width = 1;
  let height = 1;
  let dpr = 1;
  let narrowViewport = false;
  let fieldSamplingStride = FIELD_DESKTOP_STRIDE;
  let gateSamplingStride = GATE_DESKTOP_STRIDE;
  let landscapeSamplingStride = LANDSCAPE_DESKTOP_STRIDE;
  let frameDrawCount = 0;
  let frameMaterialDrawCount = 0;
  let frameFlatDrawCount = 0;
  let maximumRenderMs = 0;
  let readySettled = false;
  let resolveReady;
  let rejectReady;
  const whenReady = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });

  function syncPalette() {
    const styles = windowObject.getComputedStyle(root);
    for (let index = 0; index < PALETTE_SIZE; index += 1) {
      palette[index] = styles.getPropertyValue(PALETTE_VARIABLES[index]).trim()
        || PALETTE_FALLBACKS[index];
    }
  }

  function resolveMaterialTheme() {
    const body = root.ownerDocument?.body;
    const dark = documentElement?.classList?.contains('dark-mode')
      || documentElement?.dataset?.absTheme === 'dark'
      || body?.classList?.contains('dark-mode');
    return dark ? 'dark' : 'light';
  }

  function syncMaterialSprites() {
    materialTheme = resolveMaterialTheme();
    bodyMaterialEnabled = getSimulationBodyMaterialConfig().enabled;
    if (bodyMaterialEnabled) {
      prewarmSimulationBodyMaterial(palette, { theme: materialTheme });
      materialSprites = palette.map((color) => (
        getSimulationBodyMaterialSprite(color, { theme: materialTheme })
      ));
    } else {
      materialSprites = [];
    }
    const completeSpriteSet = bodyMaterialEnabled
      && materialSprites.length === PALETTE_SIZE
      && materialSprites.every((sprite) => Boolean(sprite?.canvas));
    root.dataset.aboutPointFinish = completeSpriteSet
      ? 'cached-sphere-sticker'
      : 'flat-fill';
    root.dataset.aboutPointMaterialTheme = materialTheme;
    root.dataset.aboutPointSpriteCount = String(
      materialSprites.filter((sprite) => Boolean(sprite?.canvas)).length,
    );
  }

  function drawPoint(colorIndex, x, y, radius) {
    if (radius <= 0.05) return;
    frameDrawCount += 1;
    const sprite = materialSprites[colorIndex];
    if (bodyMaterialEnabled && sprite?.canvas) {
      const diameter = radius * 2;
      context.drawImage(sprite.canvas, x - radius, y - radius, diameter, diameter);
      frameMaterialDrawCount += 1;
      return;
    }
    context.fillStyle = palette[colorIndex];
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
    frameFlatDrawCount += 1;
  }

  function scheduleRender() {
    if (destroyed || frameId) return;
    frameId = windowObject.requestAnimationFrame(render);
  }

  function drawField(cameraX, cameraY, renderProgress) {
    const shortSideScale = Math.min(1.15, Math.max(0.68, Math.min(width, height) / 820));

    for (let layerIndex = 0; layerIndex < FIELD_LAYER_COUNT; layerIndex += 1) {
      const parallax = FIELD_LAYER_PARALLAX[layerIndex];
      const fieldScale = FIELD_LAYER_SCALE[layerIndex];
      const fieldWidth = width * (1.18 + (parallax * 0.45));
      const fieldHeight = height * (1.18 + (parallax * 0.4));
      const travelX = reducedMotion
        ? 0
        : (renderProgress * (0.045 + (parallax * 0.18))) + ((cameraX / 520) * parallax);
      const travelY = reducedMotion
        ? 0
        : (renderProgress * (0.02 + (parallax * 0.075))) + ((cameraY / 420) * parallax);
      context.globalAlpha = FIELD_LAYER_OPACITY[layerIndex];

      for (let colorIndex = 0; colorIndex < PALETTE_SIZE; colorIndex += 1) {
        const rangeIndex = (layerIndex * PALETTE_SIZE) + colorIndex;
        const rangeStart = FIELD.ranges[rangeIndex];
        const rangeEnd = FIELD.ranges[rangeIndex + 1];
        for (let pointIndex = rangeStart;
          pointIndex < rangeEnd;
          pointIndex += fieldSamplingStride) {
          let normalizedX = FIELD.x[pointIndex] - travelX;
          let normalizedY = FIELD.y[pointIndex] + travelY;
          normalizedX -= Math.floor(normalizedX + 0.5);
          normalizedY -= Math.floor(normalizedY + 0.5);
          const screenX = (width * 0.5) + (normalizedX * fieldWidth);
          const screenY = (height * 0.5) + (normalizedY * fieldHeight);
          const radius = FIELD.size[pointIndex]
            * fieldScale
            * shortSideScale
            * FIELD_RADIUS_MULTIPLIER;
          drawPoint(colorIndex, screenX, screenY, radius);
        }
      }
    }
  }

  function drawGates(cameraZ, cameraX, cameraY, focalLength, renderProgress) {
    const reveal = clamp01((renderProgress - GATE_REVEAL_START)
      / (GATE_REVEAL_END - GATE_REVEAL_START));
    let visibleGateCount = 0;
    let passedGateCount = 0;

    for (let gateIndex = GATE_COUNT - 1; gateIndex >= 0; gateIndex -= 1) {
      const gateZ = FIRST_GATE_Z + (gateIndex * GATE_SPACING_Z);
      const depth = gateZ - cameraZ;
      if (depth <= 0) {
        passedGateCount += 1;
        continue;
      }
      if (reveal <= 0 || depth <= GATE_NEAR_CLIP_Z || depth >= GATE_FAR_CLIP_Z) continue;

      const nearFade = clamp01((depth - GATE_NEAR_CLIP_Z) / 8);
      const farFade = 1 - clamp01((depth - 150) / (GATE_FAR_CLIP_Z - 150));
      const gateAlpha = reveal * nearFade * farFade * 0.82;
      if (gateAlpha <= 0.01) continue;
      visibleGateCount += 1;
      context.globalAlpha = gateAlpha;
      const colorIndex = (gateIndex + 3) % PALETTE_SIZE;

      const rangeStart = GATES.offsets[gateIndex];
      const rangeEnd = GATES.offsets[gateIndex + 1];
      for (let pointIndex = rangeStart;
        pointIndex < rangeEnd;
        pointIndex += gateSamplingStride) {
        const pointDepth = GATES.z[pointIndex] - cameraZ;
        const perspective = focalLength / pointDepth;
        const screenX = (width * 0.5) + ((GATES.x[pointIndex] - cameraX) * perspective);
        const screenY = (height * 0.5) - ((GATES.y[pointIndex] - cameraY) * perspective);
        if (screenX < -12 || screenX > width + 12 || screenY < -12 || screenY > height + 12) {
          continue;
        }
        const radius = Math.min(
          7.2,
          GATES.size[pointIndex] * (1.15 + (perspective * 0.34)),
        );
        drawPoint(colorIndex, screenX, screenY, radius);
      }
    }

    root.dataset.aboutVisibleGateCount = GATE_COUNT_LABELS[visibleGateCount];
    root.dataset.aboutPassedGateCount = GATE_COUNT_LABELS[passedGateCount];
    return visibleGateCount;
  }

  function drawLandscape(cameraZ, cameraX, cameraY, focalLength, renderProgress) {
    const reveal = clamp01((renderProgress - LANDSCAPE_START)
      / (LANDSCAPE_REVEAL_END - LANDSCAPE_START));
    if (reveal <= 0) return false;

    const horizonY = height * (0.475 - (renderProgress * 0.025));
    context.globalAlpha = reveal * 0.62;

    for (let colorIndex = 0; colorIndex < PALETTE_SIZE; colorIndex += 1) {
      const rangeStart = LANDSCAPE.ranges[colorIndex];
      const rangeEnd = LANDSCAPE.ranges[colorIndex + 1];

      for (let pointIndex = rangeStart;
        pointIndex < rangeEnd;
        pointIndex += landscapeSamplingStride) {
        const depth = LANDSCAPE.z[pointIndex] - cameraZ;
        if (depth <= 2 || depth > 510) continue;
        const perspective = focalLength / depth;
        const screenX = (width * 0.5)
          + ((LANDSCAPE.x[pointIndex] - cameraX) * perspective);
        const screenY = horizonY
          - ((LANDSCAPE.y[pointIndex] - cameraY) * perspective);
        if (screenX < -12 || screenX > width + 12 || screenY < -12 || screenY > height + 18) {
          continue;
        }
        const radius = Math.min(
          7,
          LANDSCAPE.size[pointIndex] * (1.08 + (perspective * 0.38)),
        );
        drawPoint(colorIndex, screenX, screenY, radius);
      }
    }
    return true;
  }

  function render() {
    frameId = 0;
    if (destroyed || width <= 0 || height <= 0) return;

    try {
      const startedAt = windowObject.performance?.now?.() ?? Date.now();
      const bakeCountBefore = getSimulationBodyMaterialStats().bakeCount;
      frameDrawCount = 0;
      frameMaterialDrawCount = 0;
      frameFlatDrawCount = 0;
      const renderProgress = reducedMotion ? REDUCED_MOTION_RENDER_PROGRESS : progress;
      context.clearRect(0, 0, width, height);
      const cameraZ = CAMERA_START_Z + (renderProgress * CAMERA_TRAVEL_Z);
      const lookAheadZ = cameraZ + 14;
      const cameraX = getCameraPathX(lookAheadZ);
      const cameraY = getCameraPathY(lookAheadZ);
      const focalLength = Math.min(width * 0.86, height * 1.08);

      drawField(cameraX, cameraY, renderProgress);
      const visibleGateCount = drawGates(
        cameraZ,
        cameraX,
        cameraY,
        focalLength,
        renderProgress,
      );
      const landscapeVisible = drawLandscape(
        cameraZ,
        cameraX,
        cameraY,
        focalLength,
        renderProgress,
      );

      if (landscapeVisible) root.dataset.aboutPointFamilies = POINT_FAMILY_LANDSCAPE;
      else if (visibleGateCount > 0) root.dataset.aboutPointFamilies = POINT_FAMILY_GATES;
      else root.dataset.aboutPointFamilies = POINT_FAMILY_FIELD;
      root.dataset.aboutMotionMode = reducedMotion ? MOTION_MODE_REDUCED : MOTION_MODE_DIRECT;
      root.dataset.aboutRenderProgress = reducedMotion
        ? RENDER_PROGRESS_REDUCED
        : RENDER_PROGRESS_DIRECT;
      const renderMs = (windowObject.performance?.now?.() ?? Date.now()) - startedAt;
      maximumRenderMs = Math.max(maximumRenderMs, renderMs);
      root.dataset.aboutLastRenderMs = renderMs.toFixed(3);
      root.dataset.aboutMaxRenderMs = maximumRenderMs.toFixed(3);
      root.dataset.aboutDrawCount = String(frameDrawCount);
      root.dataset.aboutMaterialDrawCount = String(frameMaterialDrawCount);
      root.dataset.aboutFlatDrawCount = String(frameFlatDrawCount);
      root.dataset.aboutMaterialBakesInFrame = String(
        getSimulationBodyMaterialStats().bakeCount - bakeCountBefore,
      );
      context.globalAlpha = 1;
      if (!readySettled) {
        readySettled = true;
        resolveReady();
      }
    } catch (error) {
      if (!readySettled) {
        readySettled = true;
        rejectReady(error);
      }
      throw error;
    }
  }

  function resize() {
    if (destroyed) return false;
    const canvasBounds = canvas.getBoundingClientRect();
    const rootBounds = root.getBoundingClientRect();
    const nextWidth = Math.max(1, canvasBounds.width || rootBounds.width || canvas.clientWidth || 1);
    const nextHeight = Math.max(
      1,
      canvasBounds.height || rootBounds.height || canvas.clientHeight || 1,
    );
    const nextNarrowViewport = nextWidth <= MOBILE_BREAKPOINT_PX;
    const dprCap = nextNarrowViewport ? MOBILE_DPR_CAP : DESKTOP_DPR_CAP;
    const nextDpr = Math.min(dprCap, Math.max(1, windowObject.devicePixelRatio || 1));
    const bufferWidth = Math.max(1, Math.round(nextWidth * nextDpr));
    const bufferHeight = Math.max(1, Math.round(nextHeight * nextDpr));
    const changed = width !== nextWidth
      || height !== nextHeight
      || dpr !== nextDpr
      || canvas.width !== bufferWidth
      || canvas.height !== bufferHeight;

    width = nextWidth;
    height = nextHeight;
    dpr = nextDpr;
    narrowViewport = nextNarrowViewport;
    fieldSamplingStride = narrowViewport ? FIELD_MOBILE_STRIDE : FIELD_DESKTOP_STRIDE;
    gateSamplingStride = narrowViewport ? GATE_MOBILE_STRIDE : GATE_DESKTOP_STRIDE;
    landscapeSamplingStride = narrowViewport
      ? LANDSCAPE_MOBILE_STRIDE
      : LANDSCAPE_DESKTOP_STRIDE;
    if (changed) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
      context.setTransform(bufferWidth / width, 0, 0, bufferHeight / height, 0, 0);
    }
    syncPalette();
    syncMaterialSprites();
    scheduleRender();
    return changed;
  }

  function setProgress(nextProgress) {
    const numericProgress = Number(nextProgress);
    const clampedProgress = clamp01(Number.isFinite(numericProgress) ? numericProgress : 0);
    if (clampedProgress === progress) return;
    progress = clampedProgress;
    if (!reducedMotion) scheduleRender();
  }

  function handleThemeMutation() {
    if (destroyed) return;
    syncPalette();
    syncMaterialSprites();
    scheduleRender();
  }

  function handleReducedMotionChange(event) {
    reducedMotion = event.matches === true;
    scheduleRender();
  }

  const resizeObserver = typeof windowObject.ResizeObserver === 'function'
    ? new windowObject.ResizeObserver(resize)
    : null;
  resizeObserver?.observe(root);
  windowObject.addEventListener('resize', resize, { passive: true });

  const themeObserver = typeof windowObject.MutationObserver === 'function'
    ? new windowObject.MutationObserver(handleThemeMutation)
    : null;
  if (documentElement) {
    themeObserver?.observe(documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
  }
  if (root !== documentElement) {
    themeObserver?.observe(root, {
      attributes: true,
      attributeFilter: ['class', 'style', 'data-theme'],
    });
  }
  reducedMotionQuery?.addEventListener?.('change', handleReducedMotionChange);
  const unsubscribeSimulationBodyMaterial = subscribeSimulationBodyMaterial(() => {
    if (destroyed) return;
    syncMaterialSprites();
    scheduleRender();
  });
  resize();

  return {
    setProgress,
    resize,
    whenReady,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (frameId) windowObject.cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      reducedMotionQuery?.removeEventListener?.('change', handleReducedMotionChange);
      unsubscribeSimulationBodyMaterial();
      windowObject.removeEventListener('resize', resize);
      if (!readySettled) {
        readySettled = true;
        const error = new Error('AboutSimpleWorld was destroyed before its first paint.');
        error.name = 'AbortError';
        rejectReady(error);
      }
      delete root.dataset.aboutVisibleGateCount;
      delete root.dataset.aboutPassedGateCount;
      delete root.dataset.aboutPointFamilies;
      delete root.dataset.aboutMotionMode;
      delete root.dataset.aboutRenderProgress;
      delete root.dataset.aboutPointFinish;
      delete root.dataset.aboutPointMaterialTheme;
      delete root.dataset.aboutPointSpriteCount;
      delete root.dataset.aboutLastRenderMs;
      delete root.dataset.aboutMaxRenderMs;
      delete root.dataset.aboutDrawCount;
      delete root.dataset.aboutMaterialDrawCount;
      delete root.dataset.aboutFlatDrawCount;
      delete root.dataset.aboutMaterialBakesInFrame;
    },
  };
}
