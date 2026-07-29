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
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
    this.cachedSaturation = -1;
    this.broadFilter = 'none';
    this.colourFilter = 'none';
  }

  resize(width, height) {
    if (this.outputCanvas.width === width && this.outputCanvas.height === height) return;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.cachedLargeBlurRadius = -1;
    this.cachedSmallBlurRadius = -1;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
  }

  render({ sourceCanvas, maskCanvas = null, config }) {
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
    const broadSaturation = saturation * BROAD_SATURATION_MULTIPLIER;
    const colourSaturation = saturation * COLOUR_SATURATION_MULTIPLIER;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    if (!sourceCanvas || intensity <= 0 || width <= 1 || height <= 1) return;

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

    if (maskCanvas) {
      context.globalCompositeOperation = 'destination-out';
      context.globalAlpha = 1;
      context.drawImage(maskCanvas, 0, 0, width, height);
    }

    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }

  destroy() {
    this.clear();
  }
}
