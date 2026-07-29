const BROAD_ALPHA_SHARE = 0.92;
const COLOUR_ALPHA_SHARE = 0.68;
const BROAD_BRIGHTNESS = 1.02;
const BROAD_SATURATION_MULTIPLIER = 1.08;
const COLOUR_BRIGHTNESS = 1.08;
const COLOUR_SATURATION_MULTIPLIER = 1.6;
const MEMORY_REFERENCE_FRAME_MS = 1000 / 30;

export class DiffuseGlowEffect {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true });
    if (!this.outputContext) throw new Error('Canvas 2D atmosphere context unavailable');
    this.freshCanvas = document.createElement('canvas');
    this.freshCanvas.width = outputCanvas.width;
    this.freshCanvas.height = outputCanvas.height;
    this.freshContext = this.freshCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.freshContext) throw new Error('Canvas 2D atmosphere fresh-frame context unavailable');
    this.historyCanvas = document.createElement('canvas');
    this.historyCanvas.width = outputCanvas.width;
    this.historyCanvas.height = outputCanvas.height;
    this.historyContext = this.historyCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.historyContext) throw new Error('Canvas 2D atmosphere history context unavailable');
    this.hasHistory = false;
    this.temporalMemoryFrames = 0;
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
    this.cachedSaturation = -1;
    this.broadFilter = 'none';
    this.colourFilter = 'none';
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
    this.hasHistory = false;
    this.temporalMemoryFrames = 0;
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.freshContext.clearRect(0, 0, this.freshCanvas.width, this.freshCanvas.height);
    this.historyContext.clearRect(0, 0, this.historyCanvas.width, this.historyCanvas.height);
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
    const saturation = Math.max(0, Number(config.colourStrength) || 0);
    const memoryMs = Math.min(600, Math.max(0, Number(config.memoryMs) || 0));
    const broadSaturation = saturation * BROAD_SATURATION_MULTIPLIER;
    const colourSaturation = saturation * COLOUR_SATURATION_MULTIPLIER;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    if (!sourceCanvas || intensity <= 0 || width <= 1 || height <= 1) {
      this.clear();
      return;
    }

    if (
      largeBlurRadius !== this.cachedLargeBlurRadius
      || smallBlurRadius !== this.cachedSmallBlurRadius
      || saturation !== this.cachedSaturation
    ) {
      this.cachedLargeBlurRadius = largeBlurRadius;
      this.cachedSmallBlurRadius = smallBlurRadius;
      this.cachedSaturation = saturation;
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

    const outputContext = this.outputContext;
    outputContext.setTransform(1, 0, 0, 1, 0, 0);
    outputContext.globalCompositeOperation = 'source-over';
    outputContext.globalAlpha = 1;
    outputContext.filter = 'none';
    outputContext.clearRect(0, 0, width, height);
    outputContext.drawImage(this.freshCanvas, 0, 0, width, height);

    const decay = memoryMs > 0
      ? Math.exp((-Math.LN2 * MEMORY_REFERENCE_FRAME_MS) / memoryMs)
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

  destroy() {
    this.clear();
  }
}
