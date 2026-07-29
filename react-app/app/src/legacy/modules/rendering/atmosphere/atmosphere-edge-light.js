export class AtmosphereEdgeLight {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.outputContext) throw new Error('Canvas 2D edge-light context unavailable');
    this.filterKey = '';
    this.exposureFilter = 'none';
    this.smoothingQuality = 'high';
    this.lastStripBackingPx = 0;
    this.lastInsetBackingPx = 0;
    this.lastDrawCallCount = 0;
  }

  setQuality(qualityId) {
    this.smoothingQuality = qualityId === 'low' ? 'low' : qualityId === 'balanced' ? 'medium' : 'high';
  }

  resize(backingWidth, backingHeight) {
    const width = Math.max(2, Math.round(backingWidth));
    const height = Math.max(2, Math.round(backingHeight));
    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width;
      this.outputCanvas.height = height;
    }
  }

  render(sourceCanvas, intensity, edgeWidthBackingPx = 1, edgeInsetBackingPx = 0) {
    const context = this.outputContext;
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    this.lastStripBackingPx = 0;
    this.lastInsetBackingPx = 0;
    this.lastDrawCallCount = 0;
    if (!sourceCanvas || intensity <= 0) return 0;

    const strength = Math.min(5, Math.max(0, Number(intensity) || 0));
    // The CSS mask exposes only the physical rim. Keep two backing pixels of
    // antialiasing tolerance, then sample just that perimeter instead of
    // filtering the full atmosphere texture once or twice per frame.
    const strip = Math.min(
      Math.ceil(Math.min(width, height) * 0.5),
      Math.max(1, Math.ceil(Number(edgeWidthBackingPx) || 1) + 2),
    );
    const inset = Math.min(
      Math.max(0, Math.floor((Math.min(width, height) - strip * 2) * 0.5)),
      Math.max(0, Math.round(Number(edgeInsetBackingPx) || 0)),
    );
    this.lastStripBackingPx = strip;
    this.lastInsetBackingPx = inset;
    context.save();
    context.beginPath();
    const innerWidth = Math.max(0, width - inset * 2);
    const innerHeight = Math.max(0, height - inset * 2);
    context.rect(inset, inset, innerWidth, strip);
    context.rect(inset, height - inset - strip, innerWidth, strip);
    if (innerHeight > strip * 2) {
      context.rect(inset, inset + strip, strip, innerHeight - strip * 2);
      context.rect(width - inset - strip, inset + strip, strip, innerHeight - strip * 2);
    }
    context.clip();
    context.globalAlpha = Math.min(1, strength);
    const filterKey = Math.round(strength * 100);
    if (filterKey !== this.filterKey) {
      this.filterKey = filterKey;
      this.exposureFilter = `brightness(${(1 + strength * 1.15).toFixed(2)}) saturate(${(1.15 + strength * 0.25).toFixed(2)})`;
      this.outputCanvas.style.filter = this.exposureFilter;
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = this.smoothingQuality;
    context.drawImage(sourceCanvas, 0, 0, width, height);
    this.lastDrawCallCount += 1;

    const exposurePass = Math.min(1, Math.max(0, strength - 0.75) * 0.65);
    if (exposurePass > 0) {
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = exposurePass;
      context.drawImage(sourceCanvas, 0, 0, width, height);
      this.lastDrawCallCount += 1;
    }
    context.restore();
    return strip;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.lastStripBackingPx = 0;
    this.lastInsetBackingPx = 0;
    this.lastDrawCallCount = 0;
  }

  destroy() {
    this.clear();
    this.outputCanvas.style.removeProperty('filter');
  }
}
