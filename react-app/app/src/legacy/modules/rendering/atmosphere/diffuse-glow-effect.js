export class DiffuseGlowEffect {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.outputContext) throw new Error('Canvas 2D atmosphere context unavailable');
    this.filterKey = '';
    this.outputFilter = 'none';
  }

  resize(width, height) {
    if (this.outputCanvas.width === width && this.outputCanvas.height === height) return;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.filterKey = '';
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
  }

  render({ sourceCanvas, maskCanvas = null, config }) {
    const context = this.outputContext;
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;
    const intensity = Math.min(1, Math.max(0, Number(config.intensity) || 0));
    const blurRadius = Math.max(0.5, Number(config.blurRadiusBackingPx) || 0.5);
    const saturation = Math.max(0, Number(config.colourStrength) || 0);

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    if (!sourceCanvas || intensity <= 0 || width <= 1 || height <= 1) return;

    const filterKey = `${Math.round(blurRadius * 10)}:${Math.round(saturation * 100)}`;
    if (filterKey !== this.filterKey) {
      this.filterKey = filterKey;
      this.outputFilter = `blur(${blurRadius.toFixed(1)}px) saturate(${saturation.toFixed(2)})`;
    }

    context.globalAlpha = intensity;
    context.filter = this.outputFilter;
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
