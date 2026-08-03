import { DEFAULT_SIMULATION_ATMOSPHERE_CADENCE_FPS } from './simulation-atmosphere-config.js';

const BROAD_ALPHA_SHARE = 0.92;
const COLOUR_ALPHA_SHARE = 0.68;
const BROAD_BRIGHTNESS = 1.02;
const BROAD_SATURATION_MULTIPLIER = 1.08;
const COLOUR_BRIGHTNESS = 1.08;
const COLOUR_SATURATION_MULTIPLIER = 1.6;
const BLUR_PYRAMID_LEVELS = 6;
// A low-resolution nine-tap kernel keeps Safari's filter-free path broad and
// isotropic without scaling nine full-size draws on every compositor frame.
const SPREAD_CENTER_WEIGHT = 0.2;
const SPREAD_CARDINAL_WEIGHT = 0.12;
const SPREAD_DIAGONAL_WEIGHT = 0.08;
const SPREAD_CARDINAL_RADIUS_SHARE = 0.7;
const SPREAD_DIAGONAL_RADIUS_SHARE = 0.5;
// Match the native path after its brightness and saturation filters are applied.
const FALLBACK_ALPHA_SCALE = 0.54;
let reliableCanvasFilter = null;

function supportsReliableCanvasFilter() {
  if (reliableCanvasFilter !== null) return reliableCanvasFilter;
  const canvas = document.createElement('canvas');
  canvas.width = 9;
  canvas.height = 9;
  const context = canvas.getContext('2d', { alpha: true });
  if (!context || !('filter' in context)) {
    reliableCanvasFilter = false;
    return reliableCanvasFilter;
  }
  context.filter = 'blur(2px)';
  context.fillStyle = '#ffffff';
  context.fillRect(4, 4, 1, 1);
  reliableCanvasFilter = context.getImageData(2, 4, 1, 1).data[3] > 0;
  return reliableCanvasFilter;
}

function resolveBlurLevelIndex(radius, levelCount) {
  const footprint = Math.max(2, Number(radius) || 2);
  return Math.min(
    levelCount - 1,
    Math.max(0, Math.round(Math.log2(footprint)) - 1),
  );
}

function createBlurLevel() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: true });
  if (!context) throw new Error('Canvas 2D atmosphere blur context unavailable');
  return { canvas, context };
}

function drawSpreadLayer(context, sourceCanvas, width, height, radiusX, radiusY, alpha) {
  const cardinalOffsetX = radiusX * SPREAD_CARDINAL_RADIUS_SHARE;
  const cardinalOffsetY = radiusY * SPREAD_CARDINAL_RADIUS_SHARE;
  const diagonalOffsetX = radiusX * SPREAD_DIAGONAL_RADIUS_SHARE;
  const diagonalOffsetY = radiusY * SPREAD_DIAGONAL_RADIUS_SHARE;

  context.globalAlpha = alpha * SPREAD_CENTER_WEIGHT;
  context.drawImage(sourceCanvas, 0, 0, width, height);

  context.globalAlpha = alpha * SPREAD_CARDINAL_WEIGHT;
  context.drawImage(sourceCanvas, cardinalOffsetX, 0, width, height);
  context.drawImage(sourceCanvas, -cardinalOffsetX, 0, width, height);
  context.drawImage(sourceCanvas, 0, cardinalOffsetY, width, height);
  context.drawImage(sourceCanvas, 0, -cardinalOffsetY, width, height);

  context.globalAlpha = alpha * SPREAD_DIAGONAL_WEIGHT;
  context.drawImage(sourceCanvas, diagonalOffsetX, diagonalOffsetY, width, height);
  context.drawImage(sourceCanvas, diagonalOffsetX, -diagonalOffsetY, width, height);
  context.drawImage(sourceCanvas, -diagonalOffsetX, diagonalOffsetY, width, height);
  context.drawImage(sourceCanvas, -diagonalOffsetX, -diagonalOffsetY, width, height);
}

export class DiffuseGlowEffect {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true });
    if (!this.outputContext) throw new Error('Canvas 2D atmosphere context unavailable');
    this.freshCanvas = document.createElement('canvas');
    this.freshCanvas.width = outputCanvas.width;
    this.freshCanvas.height = outputCanvas.height;
    // Intermediate frames are sampled immediately by another Canvas, so keep
    // their publication ordered across browser engines.
    this.freshContext = this.freshCanvas.getContext('2d', { alpha: true });
    if (!this.freshContext) throw new Error('Canvas 2D atmosphere fresh-frame context unavailable');
    this.historyCanvas = document.createElement('canvas');
    this.historyCanvas.width = outputCanvas.width;
    this.historyCanvas.height = outputCanvas.height;
    this.historyContext = this.historyCanvas.getContext('2d', { alpha: true });
    if (!this.historyContext) throw new Error('Canvas 2D atmosphere history context unavailable');
    this.useNativeFilter = supportsReliableCanvasFilter();
    this.renderMode = this.useNativeFilter ? 'native-filter' : 'spread-pyramid-fallback';
    this.blurPyramid = Array.from({ length: BLUR_PYRAMID_LEVELS }, createBlurLevel);
    this.spreadPyramid = Array.from({ length: BLUR_PYRAMID_LEVELS }, createBlurLevel);
    this.hasHistory = false;
    this.temporalMemoryFrames = 0;
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
    this.cachedSaturation = -1;
    this.broadFilter = 'none';
    this.colourFilter = 'none';
    this.resizeBlurPyramid(outputCanvas.width, outputCanvas.height);
  }

  resizeBlurPyramid(width, height) {
    let levelWidth = width;
    let levelHeight = height;
    for (let index = 0; index < this.blurPyramid.length; index += 1) {
      levelWidth = Math.max(2, Math.ceil(levelWidth / 2));
      levelHeight = Math.max(2, Math.ceil(levelHeight / 2));
      const level = this.blurPyramid[index];
      const spreadLevel = this.spreadPyramid[index];
      if (level.canvas.width !== levelWidth) level.canvas.width = levelWidth;
      if (level.canvas.height !== levelHeight) level.canvas.height = levelHeight;
      if (spreadLevel.canvas.width !== levelWidth) spreadLevel.canvas.width = levelWidth;
      if (spreadLevel.canvas.height !== levelHeight) spreadLevel.canvas.height = levelHeight;
      level.context.imageSmoothingEnabled = true;
      level.context.imageSmoothingQuality = 'high';
      spreadLevel.context.imageSmoothingEnabled = true;
      spreadLevel.context.imageSmoothingQuality = 'high';
    }
  }

  resize(width, height) {
    if (
      this.outputCanvas.width === width
      && this.outputCanvas.height === height
      && this.freshCanvas.width === width
      && this.freshCanvas.height === height
      && this.historyCanvas.width === width
      && this.historyCanvas.height === height
    ) return;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.freshCanvas.width = width;
    this.freshCanvas.height = height;
    this.historyCanvas.width = width;
    this.historyCanvas.height = height;
    this.resizeBlurPyramid(width, height);
    this.hasHistory = false;
    this.temporalMemoryFrames = 0;
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
  }

  prepareSpreadLevel(index, source, radius, alpha, outputWidth, outputHeight) {
    const level = this.spreadPyramid[index];
    const levelWidth = level.canvas.width;
    const levelHeight = level.canvas.height;
    level.context.setTransform(1, 0, 0, 1, 0, 0);
    level.context.globalCompositeOperation = 'source-over';
    level.context.clearRect(0, 0, levelWidth, levelHeight);
    drawSpreadLayer(
      level.context,
      source,
      levelWidth,
      levelHeight,
      radius * (levelWidth / outputWidth),
      radius * (levelHeight / outputHeight),
      alpha,
    );
    level.context.globalAlpha = 1;
    return level.canvas;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.freshContext.clearRect(0, 0, this.freshCanvas.width, this.freshCanvas.height);
    this.historyContext.clearRect(0, 0, this.historyCanvas.width, this.historyCanvas.height);
    for (let index = 0; index < this.blurPyramid.length; index += 1) {
      const level = this.blurPyramid[index];
      level.context.clearRect(0, 0, level.canvas.width, level.canvas.height);
      const spreadLevel = this.spreadPyramid[index];
      spreadLevel.context.clearRect(0, 0, spreadLevel.canvas.width, spreadLevel.canvas.height);
    }
    this.hasHistory = false;
    this.temporalMemoryFrames = 0;
  }

  render({ sourceCanvas, config }) {
    const context = this.freshContext;
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;
    const intensity = Math.min(1, Math.max(0, Number(config.intensity) || 0));
    const largeBlurRadius = Math.max(
      0.5,
      Number(config.largeBlurRadiusBackingPx ?? config.blurRadiusBackingPx) || 0.5,
    );
    const smallBlurRadius = Math.max(
      0.5,
      Number(config.smallBlurRadiusBackingPx) || largeBlurRadius * 0.34,
    );
    const memoryMs = Math.min(600, Math.max(0, Number(config.memoryMs) || 0));
    const colourStrength = Math.max(0, Number(config.colourStrength) || 0);
    const broadSaturation = colourStrength * BROAD_SATURATION_MULTIPLIER;
    const colourSaturation = colourStrength * COLOUR_SATURATION_MULTIPLIER;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    if (!sourceCanvas || intensity <= 0 || width <= 1 || height <= 1) {
      this.clear();
      return;
    }

    if (this.useNativeFilter) {
      if (
        largeBlurRadius !== this.cachedLargeBlurRadius
        || smallBlurRadius !== this.cachedSmallBlurRadius
        || colourStrength !== this.cachedSaturation
      ) {
        this.cachedLargeBlurRadius = largeBlurRadius;
        this.cachedSmallBlurRadius = smallBlurRadius;
        this.cachedSaturation = colourStrength;
        this.broadFilter = [
          `blur(${largeBlurRadius.toFixed(1)}px)`,
          `brightness(${BROAD_BRIGHTNESS})`,
          `saturate(${broadSaturation.toFixed(2)})`,
        ].join(' ');
        this.colourFilter = [
          `blur(${smallBlurRadius.toFixed(1)}px)`,
          `brightness(${COLOUR_BRIGHTNESS})`,
          `saturate(${colourSaturation.toFixed(2)})`,
        ].join(' ');
      }
      context.globalAlpha = intensity * BROAD_ALPHA_SHARE;
      context.filter = this.broadFilter;
      context.drawImage(sourceCanvas, 0, 0, width, height);
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = intensity * COLOUR_ALPHA_SHARE;
      context.filter = this.colourFilter;
      context.drawImage(sourceCanvas, 0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
      context.filter = 'none';
    } else {
      this.renderSpreadFallback(
        context,
        sourceCanvas,
        width,
        height,
        intensity,
        colourStrength,
        largeBlurRadius,
        smallBlurRadius,
      );
    }

    const outputContext = this.outputContext;
    outputContext.setTransform(1, 0, 0, 1, 0, 0);
    outputContext.globalCompositeOperation = 'source-over';
    outputContext.globalAlpha = 1;
    outputContext.filter = 'none';
    outputContext.clearRect(0, 0, width, height);
    outputContext.drawImage(this.freshCanvas, 0, 0, width, height);

    const cadenceFps = Math.max(
      1,
      Number(config.cadenceFps) || DEFAULT_SIMULATION_ATMOSPHERE_CADENCE_FPS,
    );
    const decay = memoryMs > 0
      ? Math.exp((-Math.LN2 * (1000 / cadenceFps)) / memoryMs)
      : 0;
    if (decay > 0.01) {
      // A fixed one-frame blend cannot pulse when renderer deadlines vary by a
      // few milliseconds. On the first frame, blend the clean field with itself
      // so source resets do not introduce a one-frame brightness pop.
      outputContext.globalCompositeOperation = 'destination-over';
      outputContext.globalAlpha = decay;
      outputContext.drawImage(
        this.hasHistory ? this.historyCanvas : this.freshCanvas,
        0,
        0,
        width,
        height,
      );
    }

    outputContext.globalCompositeOperation = 'source-over';
    outputContext.globalAlpha = 1;

    if (memoryMs > 0) {
      // Store only the clean current field. Copying the composited output here
      // recursively reintroduced every older position, causing bright buildup
      // and visible trail bands in dense, fast-moving simulations such as Flow.
      // Swapping the offscreen buffers keeps that contract without another
      // full-frame copy on the hot path.
      const previousHistoryCanvas = this.historyCanvas;
      const previousHistoryContext = this.historyContext;
      this.historyCanvas = this.freshCanvas;
      this.historyContext = this.freshContext;
      this.freshCanvas = previousHistoryCanvas;
      this.freshContext = previousHistoryContext;
      this.hasHistory = true;
      this.temporalMemoryFrames = 1;
    } else if (this.hasHistory) {
      this.historyContext.clearRect(0, 0, width, height);
      this.hasHistory = false;
      this.temporalMemoryFrames = 0;
    }
  }

  renderSpreadFallback(
    context,
    sourceCanvas,
    width,
    height,
    intensity,
    colourStrength,
    largeBlurRadius,
    smallBlurRadius,
  ) {
    const firstLevel = this.blurPyramid[0];
    firstLevel.context.setTransform(1, 0, 0, 1, 0, 0);
    firstLevel.context.globalCompositeOperation = 'source-over';
    firstLevel.context.globalAlpha = 1;
    firstLevel.context.clearRect(0, 0, firstLevel.canvas.width, firstLevel.canvas.height);
    firstLevel.context.drawImage(sourceCanvas, 0, 0, firstLevel.canvas.width, firstLevel.canvas.height);
    for (let index = 1; index < this.blurPyramid.length; index += 1) {
      const previous = this.blurPyramid[index - 1];
      const level = this.blurPyramid[index];
      level.context.setTransform(1, 0, 0, 1, 0, 0);
      level.context.globalCompositeOperation = 'source-over';
      level.context.globalAlpha = 1;
      level.context.clearRect(0, 0, level.canvas.width, level.canvas.height);
      level.context.drawImage(previous.canvas, 0, 0, level.canvas.width, level.canvas.height);
    }

    const broadIndex = resolveBlurLevelIndex(largeBlurRadius, this.blurPyramid.length);
    const smallIndex = resolveBlurLevelIndex(smallBlurRadius, this.blurPyramid.length);
    const broadLevel = this.blurPyramid[broadIndex];
    const smallLevel = this.blurPyramid[smallIndex];
    const fineIndex = Math.max(0, smallIndex - 1);
    const fineLevel = this.blurPyramid[fineIndex];

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const broadSpread = this.prepareSpreadLevel(
      broadIndex,
      broadLevel.canvas,
      largeBlurRadius,
      intensity * BROAD_ALPHA_SHARE * BROAD_BRIGHTNESS * FALLBACK_ALPHA_SCALE,
      width,
      height,
    );
    context.globalAlpha = 1;
    context.drawImage(broadSpread, 0, 0, width, height);
    context.globalCompositeOperation = 'screen';
    const colourAlpha = Math.min(
      1,
      intensity
        * COLOUR_ALPHA_SHARE
        * COLOUR_BRIGHTNESS
        * colourStrength
        * FALLBACK_ALPHA_SCALE,
    );
    const smallSpread = this.prepareSpreadLevel(
      smallIndex,
      smallLevel.canvas,
      smallBlurRadius,
      colourAlpha,
      width,
      height,
    );
    context.drawImage(smallSpread, 0, 0, width, height);
    const fineSpread = this.prepareSpreadLevel(
      fineIndex,
      fineLevel.canvas,
      smallBlurRadius * 0.5,
      colourAlpha * 0.5 * Math.min(1.25, COLOUR_SATURATION_MULTIPLIER),
      width,
      height,
    );
    context.drawImage(fineSpread, 0, 0, width, height);
    context.globalCompositeOperation = 'source-over';
  }

  destroy() {
    this.clear();
  }
}
