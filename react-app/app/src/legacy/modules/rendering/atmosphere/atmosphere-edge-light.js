export class AtmosphereEdgeLight {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.outputContext) throw new Error('Canvas 2D edge-light context unavailable');
    this.filterKey = '';
    this.exposureFilter = 'none';
    this.lastDrawCallCount = 0;
  }

  resize(backingWidth, backingHeight) {
    const width = Math.max(2, Math.round(backingWidth));
    const height = Math.max(2, Math.round(backingHeight));
    if (this.outputCanvas.width !== width || this.outputCanvas.height !== height) {
      this.outputCanvas.width = width;
      this.outputCanvas.height = height;
    }
  }

  render(sourceCanvas, intensity) {
    const context = this.outputContext;
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    context.filter = 'none';
    context.clearRect(0, 0, width, height);
    this.lastDrawCallCount = 0;
    if (!sourceCanvas || intensity <= 0) return;

    const strength = Math.min(5, Math.max(0, Number(intensity) || 0));
    // Keep one complete colour texture. CSS owns the single continuous wall
    // contour, so the renderer does not need separate edge or corner geometry.
    context.globalAlpha = Math.min(1, strength);
    const filterKey = Math.round(strength * 100);
    if (filterKey !== this.filterKey) {
      this.filterKey = filterKey;
      this.exposureFilter = `brightness(${(1 + strength * 1.15).toFixed(2)}) saturate(${(1.15 + strength * 0.25).toFixed(2)})`;
      this.outputCanvas.style.filter = this.exposureFilter;
    }
    context.drawImage(sourceCanvas, 0, 0, width, height);
    this.lastDrawCallCount += 1;

    const exposurePass = Math.min(1, Math.max(0, strength - 0.75) * 0.65);
    if (exposurePass > 0) {
      context.globalCompositeOperation = 'lighter';
      context.globalAlpha = exposurePass;
      context.drawImage(sourceCanvas, 0, 0, width, height);
      this.lastDrawCallCount += 1;
    }
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.lastDrawCallCount = 0;
  }

  destroy() {
    this.clear();
    this.outputCanvas.style.removeProperty('filter');
  }
}
