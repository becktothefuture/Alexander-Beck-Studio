const BROAD_ALPHA_SHARE = 1.45;
const COLOUR_ALPHA_SHARE = 0.9;
const BROAD_BRIGHTNESS = 0.62;
const BROAD_SATURATION_MULTIPLIER = 1.65;
const COLOUR_BRIGHTNESS = 0.82;
const COLOUR_SATURATION_MULTIPLIER = 2.4;

export class DiffuseGlowEffect {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.outputContext) throw new Error('Canvas 2D atmosphere context unavailable');
    this.historyCanvas = document.createElement('canvas');
    this.historyCanvas.width = outputCanvas.width;
    this.historyCanvas.height = outputCanvas.height;
    this.historyContext = this.historyCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.historyContext) throw new Error('Canvas 2D atmosphere history context unavailable');
    this.hasHistory = false;
    this.lastRenderAt = 0;
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
      && this.historyCanvas.width === width
      && this.historyCanvas.height === height
    ) return;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.historyCanvas.width = width;
    this.historyCanvas.height = height;
    this.hasHistory = false;
    this.lastRenderAt = 0;
    this.temporalMemoryFrames = 0;
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.historyContext.clearRect(0, 0, this.historyCanvas.width, this.historyCanvas.height);
    this.hasHistory = false;
    this.lastRenderAt = 0;
    this.temporalMemoryFrames = 0;
  }

  render({ sourceCanvas, config, nowMs = performance.now() }) {
    const context = this.outputContext;
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

    context.globalAlpha = intensity * COLOUR_ALPHA_SHARE;
    context.filter = this.colourFilter;
    context.drawImage(sourceCanvas, 0, 0, width, height);
    context.filter = 'none';

    const frameNow = Number(nowMs) || performance.now();
    const elapsedMs = this.lastRenderAt > 0 ? Math.max(0, frameNow - this.lastRenderAt) : 0;
    const decay = memoryMs > 0 && this.hasHistory && elapsedMs > 0
      ? Math.exp((-Math.LN2 * elapsedMs) / memoryMs)
      : 0;
    if (decay > 0.01) {
      // Preserve history only where the freshly rendered field leaves room.
      // This prevents stationary glow from accumulating into a muddy plate.
      context.globalCompositeOperation = 'destination-over';
      context.globalAlpha = decay;
      context.drawImage(this.historyCanvas, 0, 0, width, height);
    }

    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;

    if (memoryMs > 0) {
      const historyContext = this.historyContext;
      historyContext.setTransform(1, 0, 0, 1, 0, 0);
      historyContext.globalCompositeOperation = 'copy';
      historyContext.globalAlpha = 1;
      historyContext.filter = 'none';
      historyContext.drawImage(this.outputCanvas, 0, 0, width, height);
      this.hasHistory = true;
      this.lastRenderAt = frameNow;
      this.temporalMemoryFrames = 1;
    } else if (this.hasHistory) {
      this.historyContext.clearRect(0, 0, width, height);
      this.hasHistory = false;
      this.lastRenderAt = 0;
      this.temporalMemoryFrames = 0;
    }
  }

  destroy() {
    this.clear();
  }
}
