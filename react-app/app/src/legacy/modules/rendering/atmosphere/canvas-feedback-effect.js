function createBufferCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function resolveCompositeOperation(mode) {
  if (mode === 'add') return 'lighter';
  if (mode === 'screen') return 'screen';
  return 'source-over';
}

export class CanvasFeedbackEffect {
  constructor(outputCanvas) {
    this.outputCanvas = outputCanvas;
    this.outputContext = outputCanvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!this.outputContext) throw new Error('Canvas 2D atmosphere context unavailable');
    this.history = [createBufferCanvas(2, 2), createBufferCanvas(2, 2)];
    this.historyContexts = this.history.map((canvas) => canvas.getContext('2d', { alpha: true }));
    this.readIndex = 0;
    this.outputBlurKey = -1;
    this.outputSaturationKey = -1;
    this.outputFilter = 'none';
  }

  resize(width, height) {
    if (this.outputCanvas.width === width && this.outputCanvas.height === height) return;
    this.outputCanvas.width = width;
    this.outputCanvas.height = height;
    this.history.forEach((canvas) => {
      canvas.width = width;
      canvas.height = height;
    });
    this.readIndex = 0;
    this.outputBlurKey = -1;
    this.outputSaturationKey = -1;
  }

  clear() {
    this.outputContext.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
    this.historyContexts.forEach((context) => {
      context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    });
  }

  render({ sourceCanvas, config, dtMs, qualityScale, responsiveScale = 1, nowMs = 0 }) {
    const readCanvas = this.history[this.readIndex];
    const writeIndex = 1 - this.readIndex;
    const writeContext = this.historyContexts[writeIndex];
    const width = this.outputCanvas.width;
    const height = this.outputCanvas.height;
    const halfLife = Math.max(0, config.afterglowHalfLifeMs);
    const decay = halfLife > 0 ? Math.exp((-Math.LN2 * dtMs) / halfLife) : 0;
    const spatialScale = Math.max(0.65, Math.min(1, Number(responsiveScale) || 1));
    const drift = config.driftSpeedPxPerSec * qualityScale * spatialScale * (dtMs / 1000);
    const wobble = Math.sin((Number(nowMs) || 0) * 0.00037) * config.turbulence * 1.5;
    const passes = Math.max(1, Math.round(config.diffusionPasses));

    writeContext.setTransform(1, 0, 0, 1, 0, 0);
    writeContext.globalCompositeOperation = 'source-over';
    writeContext.globalAlpha = 1;
    writeContext.filter = 'none';
    writeContext.clearRect(0, 0, width, height);

    writeContext.globalAlpha = decay / passes;
    for (let pass = 0; pass < passes; pass += 1) {
      const phase = (pass / passes) * Math.PI * 2;
      const diffusion = pass * 0.35 * config.haloSpread;
      writeContext.drawImage(
        readCanvas,
        drift + Math.cos(phase) * diffusion,
        drift * 0.35 + wobble + Math.sin(phase) * diffusion,
      );
    }

    writeContext.globalCompositeOperation = resolveCompositeOperation(config.blendMode);
    writeContext.globalAlpha = Math.min(1, config.sourceGain * (0.75 + config.emissionGain * 0.25));
    writeContext.drawImage(sourceCanvas, 0, 0, width, height);

    this.outputContext.setTransform(1, 0, 0, 1, 0, 0);
    this.outputContext.globalCompositeOperation = 'source-over';
    this.outputContext.globalAlpha = Math.min(1, config.fogDensity);
    this.outputContext.clearRect(0, 0, width, height);
    const blurRadius = Math.max(1, config.blurRadiusFxPx * qualityScale * config.haloSpread * spatialScale);
    const saturation = 1 + config.accentLift * 0.65;
    const outputBlurKey = Math.round(blurRadius * 10);
    const outputSaturationKey = Math.round(saturation * 100);
    if (outputBlurKey !== this.outputBlurKey || outputSaturationKey !== this.outputSaturationKey) {
      this.outputBlurKey = outputBlurKey;
      this.outputSaturationKey = outputSaturationKey;
      this.outputFilter = `blur(${blurRadius.toFixed(1)}px) saturate(${saturation.toFixed(2)})`;
    }
    this.outputContext.filter = this.outputFilter;
    this.outputContext.drawImage(this.history[writeIndex], 0, 0);
    this.outputContext.filter = 'none';
    const lightDefinition = Math.min(0.65, Math.max(0, Number(config.lightDefinition) || 0));
    if (lightDefinition > 0) {
      this.outputContext.globalAlpha = lightDefinition;
      this.outputContext.globalCompositeOperation = 'screen';
      this.outputContext.drawImage(sourceCanvas, 0, 0);
    }
    this.outputContext.globalCompositeOperation = 'source-over';
    this.outputContext.globalAlpha = 1;

    this.readIndex = writeIndex;
  }

  destroy() {
    this.clear();
  }
}
