import { THEME_CHANGE_EVENT, isDarkThemeDocument } from '../../../../lib/theme-state.js';
import {
  normalizeAtmosphereLabConfig,
  resolveAtmosphereProfile,
  resolveAtmosphereQualityScale,
  shouldRenderSimulationAtmosphereFrame,
} from '../../../../routes/atmosphere-lab/atmosphereLabControls.js';
import {
  ATMOSPHERE_LAB_SIMULATION_OPTIONS,
  isAtmosphereLabSimulationMode,
} from '../../../../routes/atmosphere-lab/atmosphereLabSimulations.js';
import { createAtmosphereParameterizer } from '../../../../routes/atmosphere-lab/atmosphereParameterizer.js';
import { MODES } from '../../core/constants.js';
import { setMode } from '../../modes/mode-controller.js';
import { setTheme } from '../../visual/dark-mode-v2.js';
import { DiffuseGlowEffect } from './diffuse-glow-effect.js';
import {
  normalizeSimulationAtmosphereConfig,
  resolveSimulationAtmosphereBlurGeometry,
  resolveSimulationAtmosphereRenderProfile,
} from './simulation-atmosphere-config.js';

const METRICS_INTERVAL_MS = 500;

function createCanvas(className = '', layer = '') {
  const canvas = document.createElement('canvas');
  if (className) canvas.className = className;
  if (layer) canvas.dataset.atmosphereLayer = layer;
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

function getContext(canvas, options = {}) {
  const context = canvas.getContext('2d', { alpha: true, ...options });
  if (!context) throw new Error('Hybrid glow Canvas 2D context unavailable');
  return context;
}

function resizeCanvas(canvas, width, height) {
  if (canvas.width === width && canvas.height === height) return false;
  canvas.width = width;
  canvas.height = height;
  return true;
}

function clearContext(context) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
}

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

export class HybridGlowLabController {
  constructor({ globals, labConfig, productionConfig }) {
    this.variant = 'hybridGlow';
    this.globals = globals;
    this.config = normalizeAtmosphereLabConfig(labConfig);
    this.productionConfig = normalizeSimulationAtmosphereConfig(productionConfig);
    this.mainCanvas = globals.canvas;
    this.routeLayer = this.mainCanvas.parentElement;
    this.outputCanvas = createCanvas(
      'atmosphere-output-canvas atmosphere-hybrid-glow-output',
      'hybrid-glow',
    );
    this.outputContext = getContext(this.outputCanvas, { desynchronized: true });
    this.sourceCanvas = createCanvas();
    this.sourceContext = getContext(this.sourceCanvas, { desynchronized: true });
    this.broadWorkCanvas = createCanvas();
    this.tightWorkCanvas = createCanvas();
    this.referenceCanvas = createCanvas();
    this.broadFrames = [createCanvas(), createCanvas()];
    this.broadFrameContexts = this.broadFrames.map((canvas) => getContext(canvas));
    this.broadEffect = new DiffuseGlowEffect(this.broadWorkCanvas);
    this.tightEffect = new DiffuseGlowEffect(this.tightWorkCanvas);
    this.referenceEffect = new DiffuseGlowEffect(this.referenceCanvas);
    this.routeLayer.append(this.outputCanvas);

    this.dynamicQuality = resolveAtmosphereQualityScale(this.config.common.qualityMode);
    this.themeMode = isDarkThemeDocument() ? 'dark' : 'light';
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    this.geometryKey = '';
    this.blurGeometry = null;
    this.schedules = {
      broad: { nextFrameAt: 0 },
      tight: { nextFrameAt: 0 },
      reference: { nextFrameAt: 0 },
    };
    this.hasBroadFrame = false;
    this.broadCurrentIndex = 0;
    this.broadTargetIndex = 1;
    this.broadBlendStartedAt = 0;
    this.broadBlendDurationMs = 0;
    this.isBroadBlending = false;
    this.hasTightFrame = false;
    this.hasReferenceFrame = false;
    this.hasReducedMotionFrame = false;
    this.destroyed = false;

    this.presentationFrameCount = 0;
    this.broadUpdateCount = 0;
    this.tightUpdateCount = 0;
    this.referenceUpdateCount = 0;
    this.metricsStartedAt = performance.now();
    this.metricsPresentationFrames = 0;
    this.metricsBroadUpdates = 0;
    this.metricsTightUpdates = 0;
    this.metricsReferenceUpdates = 0;
    this.metricsEffectCostMs = 0;
    this.metricsPresentationCostMs = 0;
    this.lastMetrics = {
      presentationFps: 0,
      broadFps: 0,
      tightFps: 0,
      referenceFps: 0,
      effectCostPerSecondMs: 0,
      presentationCostPerSecondMs: 0,
      totalCostPerSecondMs: 0,
    };

    this.handleThemeChange = (event) => {
      const nextTheme = event?.detail?.isDark ? 'dark' : 'light';
      if (nextTheme === this.themeMode) return;
      this.themeMode = nextTheme;
      this.rebuildProfiles();
      this.clear();
      this.parameterizer?.setThemeMode(nextTheme);
    };
    window.addEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);

    this.rebuildProfiles();
    this.parameterizer = new URLSearchParams(window.location.search).get('panel') === '0'
      ? null
      : createAtmosphereParameterizer({
        variant: this.variant,
        initialConfig: this.config,
        simulationMode: globals.currentMode,
        simulationOptions: ATMOSPHERE_LAB_SIMULATION_OPTIONS,
        themeMode: this.themeMode,
        onChange: (nextConfig) => this.setConfig(nextConfig),
        onReset: () => this.clear(),
        onSimulationChange: (nextMode) => this.setSimulationMode(nextMode),
        onThemeChange: (nextTheme) => setTheme(nextTheme),
      });
    this.applyPresentationState();
    this.installAuditHandle();
  }

  rebuildProfiles() {
    this.hybridProfile = resolveAtmosphereProfile(this.config, this.variant, this.themeMode);
    this.renderProfile = resolveSimulationAtmosphereRenderProfile(
      this.productionConfig,
      this.themeMode,
    );
  }

  applyPresentationState() {
    this.outputCanvas.hidden = !this.config.common.enabled;
  }

  resetSchedules() {
    this.schedules.broad.nextFrameAt = 0;
    this.schedules.tight.nextFrameAt = 0;
    this.schedules.reference.nextFrameAt = 0;
  }

  setConfig(nextConfig) {
    const previousQuality = this.config.common.qualityMode;
    this.config = normalizeAtmosphereLabConfig(nextConfig);
    if (previousQuality !== this.config.common.qualityMode) {
      this.dynamicQuality = resolveAtmosphereQualityScale(this.config.common.qualityMode);
      this.geometryKey = '';
    }
    this.rebuildProfiles();
    this.applyPresentationState();
    this.clear();
  }

  clear() {
    clearContext(this.outputContext);
    clearContext(this.sourceContext);
    this.broadFrameContexts.forEach(clearContext);
    this.broadEffect.clear();
    this.tightEffect.clear();
    this.referenceEffect.clear();
    this.hasBroadFrame = false;
    this.hasTightFrame = false;
    this.hasReferenceFrame = false;
    this.hasReducedMotionFrame = false;
    this.isBroadBlending = false;
    this.broadBlendStartedAt = 0;
    this.resetSchedules();
  }

  syncSize() {
    const rect = this.mainCanvas.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return false;
    const geometryKey = `${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (geometryKey !== this.geometryKey) {
      this.geometryKey = geometryKey;
      if (this.config.common.qualityMode === 'auto') {
        this.dynamicQuality = resolveAtmosphereQualityScale('auto');
      }
    }
    const width = Math.max(2, Math.round(rect.width * this.dynamicQuality.scale));
    const height = Math.max(2, Math.round(rect.height * this.dynamicQuality.scale));
    let resized = false;
    [
      this.sourceCanvas,
      this.outputCanvas,
      ...this.broadFrames,
    ].forEach((canvas) => {
      resized = resizeCanvas(canvas, width, height) || resized;
    });
    if (resized) {
      this.broadEffect.resize(width, height);
      this.tightEffect.resize(width, height);
      this.referenceEffect.resize(width, height);
      this.clear();
    }
    this.blurGeometry = resolveSimulationAtmosphereBlurGeometry({
      widthCss: rect.width,
      heightCss: rect.height,
      backingWidth: width,
      backingHeight: height,
      largeSpread: this.renderProfile.largeSpread,
      smallSpread: this.renderProfile.smallSpread,
    });
    return true;
  }

  copySimulationSource() {
    const context = this.sourceContext;
    const width = this.sourceCanvas.width;
    const height = this.sourceCanvas.height;
    clearContext(context);
    const layers = [this.mainCanvas];
    const frontDepthCanvas = this.globals.depthTitleFrontCanvas;
    if (
      frontDepthCanvas?.isConnected
      && frontDepthCanvas.id !== 'simulation-title-canvas'
    ) {
      layers.push(frontDepthCanvas);
    }
    layers.forEach((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement) || canvas.width <= 1 || canvas.height <= 1) return;
      context.drawImage(canvas, 0, 0, width, height);
    });
    return layers.length;
  }

  createEffectConfig({ fieldMode = 'both', cadenceFps, intensityScale = 1, memoryMs } = {}) {
    return {
      ...this.renderProfile,
      fieldMode,
      cadenceFps,
      intensity: Math.min(1, this.renderProfile.intensity * intensityScale),
      memoryMs: memoryMs ?? this.renderProfile.memoryMs,
      largeBlurRadiusBackingPx: this.blurGeometry.largeRadiusBackingPx,
      smallBlurRadiusBackingPx: this.blurGeometry.smallRadiusBackingPx,
    };
  }

  settleBroadBlend(now, force = false) {
    if (!this.isBroadBlending) return;
    const elapsed = Math.max(0, now - this.broadBlendStartedAt);
    if (!force && elapsed < this.broadBlendDurationMs) return;
    this.broadCurrentIndex = this.broadTargetIndex;
    this.broadTargetIndex = 1 - this.broadCurrentIndex;
    this.isBroadBlending = false;
  }

  commitBroadFrame(now, broadCadence) {
    if (!this.hasBroadFrame) {
      const context = this.broadFrameContexts[this.broadCurrentIndex];
      clearContext(context);
      context.drawImage(this.broadWorkCanvas, 0, 0);
      this.hasBroadFrame = true;
      return;
    }
    this.settleBroadBlend(now, true);
    const targetContext = this.broadFrameContexts[this.broadTargetIndex];
    clearContext(targetContext);
    targetContext.drawImage(this.broadWorkCanvas, 0, 0);
    this.broadBlendDurationMs = Math.min(
      this.hybridProfile.crossfadeMs,
      1000 / Math.max(1, broadCadence),
    );
    if (this.broadBlendDurationMs <= 0) {
      this.broadCurrentIndex = this.broadTargetIndex;
      this.broadTargetIndex = 1 - this.broadCurrentIndex;
      this.isBroadBlending = false;
      return;
    }
    this.broadBlendStartedAt = now;
    this.isBroadBlending = true;
  }

  presentHybrid(now) {
    const startedAt = performance.now();
    const context = this.outputContext;
    clearContext(context);
    if (this.hasBroadFrame) {
      if (this.isBroadBlending) {
        const progress = clamp01(
          (now - this.broadBlendStartedAt) / Math.max(1, this.broadBlendDurationMs),
        );
        context.globalAlpha = 1 - progress;
        context.drawImage(this.broadFrames[this.broadCurrentIndex], 0, 0);
        context.globalCompositeOperation = 'lighter';
        context.globalAlpha = progress;
        context.drawImage(this.broadFrames[this.broadTargetIndex], 0, 0);
        if (progress >= 1) this.settleBroadBlend(now, true);
      } else {
        context.drawImage(this.broadFrames[this.broadCurrentIndex], 0, 0);
      }
    }
    if (this.hasTightFrame) {
      context.globalCompositeOperation = this.hasBroadFrame ? 'screen' : 'source-over';
      context.globalAlpha = 1;
      context.drawImage(this.tightWorkCanvas, 0, 0);
    }
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = 1;
    this.recordPresentationCost(performance.now() - startedAt);
  }

  presentReference() {
    const startedAt = performance.now();
    clearContext(this.outputContext);
    this.outputContext.drawImage(this.referenceCanvas, 0, 0);
    this.recordPresentationCost(performance.now() - startedAt);
  }

  recordPresentationCost(costMs) {
    this.presentationFrameCount += 1;
    this.metricsPresentationFrames += 1;
    this.metricsPresentationCostMs += costMs;
  }

  renderHybrid(now) {
    const broadCadence = Number(this.hybridProfile.broadCadence) || 8;
    const tightCadence = Number(this.hybridProfile.tightCadence) || 24;
    const broadDue = shouldRenderSimulationAtmosphereFrame(
      this.schedules.broad,
      now,
      broadCadence,
    );
    const tightDue = shouldRenderSimulationAtmosphereFrame(
      this.schedules.tight,
      now,
      tightCadence,
    );
    if (broadDue || tightDue) {
      const effectStartedAt = performance.now();
      this.copySimulationSource();
      if (broadDue) {
        this.broadEffect.render({
          sourceCanvas: this.sourceCanvas,
          config: this.createEffectConfig({
            fieldMode: 'broad',
            cadenceFps: broadCadence,
            intensityScale: this.hybridProfile.broadStrength,
            memoryMs: 0,
          }),
        });
        this.commitBroadFrame(now, broadCadence);
        this.broadUpdateCount += 1;
        this.metricsBroadUpdates += 1;
      }
      if (tightDue) {
        this.tightEffect.render({
          sourceCanvas: this.sourceCanvas,
          config: this.createEffectConfig({
            fieldMode: 'tight',
            cadenceFps: tightCadence,
            intensityScale: this.hybridProfile.tightStrength,
            memoryMs: 0,
          }),
        });
        this.hasTightFrame = true;
        this.tightUpdateCount += 1;
        this.metricsTightUpdates += 1;
      }
      this.metricsEffectCostMs += performance.now() - effectStartedAt;
    }
    if (broadDue || tightDue || this.isBroadBlending) this.presentHybrid(now);
  }

  renderReference(now, mode) {
    const cadence = mode === 'hold'
      ? Number(this.hybridProfile.broadCadence) || 8
      : Number(this.hybridProfile.tightCadence) || 24;
    if (!shouldRenderSimulationAtmosphereFrame(this.schedules.reference, now, cadence)) return;
    const effectStartedAt = performance.now();
    this.copySimulationSource();
    this.referenceEffect.render({
      sourceCanvas: this.sourceCanvas,
      config: this.createEffectConfig({
        cadenceFps: cadence,
        memoryMs: this.reducedMotion ? 0 : this.renderProfile.memoryMs,
      }),
    });
    this.metricsEffectCostMs += performance.now() - effectStartedAt;
    this.hasReferenceFrame = true;
    this.referenceUpdateCount += 1;
    this.metricsReferenceUpdates += 1;
    this.presentReference();
  }

  render(now = performance.now()) {
    if (this.destroyed || !this.syncSize()) return;
    if (!this.config.common.enabled) {
      this.updateMetrics(now);
      return;
    }
    if (this.reducedMotion && this.hasReducedMotionFrame) {
      this.updateMetrics(now);
      return;
    }
    const mode = this.reducedMotion ? 'reference' : this.hybridProfile.presentationMode;
    if (mode === 'hybrid') this.renderHybrid(now);
    else this.renderReference(now, mode);
    if (this.reducedMotion && this.hasReferenceFrame) this.hasReducedMotionFrame = true;
    this.updateMetrics(now);
  }

  updateMetrics(now) {
    const elapsed = now - this.metricsStartedAt;
    if (elapsed < METRICS_INTERVAL_MS) return;
    const seconds = Math.max(0.001, elapsed / 1000);
    this.lastMetrics = {
      presentationFps: this.metricsPresentationFrames / seconds,
      broadFps: this.metricsBroadUpdates / seconds,
      tightFps: this.metricsTightUpdates / seconds,
      referenceFps: this.metricsReferenceUpdates / seconds,
      effectCostPerSecondMs: this.metricsEffectCostMs / seconds,
      presentationCostPerSecondMs: this.metricsPresentationCostMs / seconds,
      totalCostPerSecondMs: (this.metricsEffectCostMs + this.metricsPresentationCostMs) / seconds,
    };
    const mode = this.hybridProfile.presentationMode;
    const cadenceSummary = mode === 'hybrid'
      ? `${this.hybridProfile.broadCadence}/${this.hybridProfile.tightCadence}`
      : mode === 'hold' ? this.hybridProfile.broadCadence : this.hybridProfile.tightCadence;
    this.parameterizer?.setMetrics({
      summary: `${mode} · ${cadenceSummary} fps · ${this.lastMetrics.totalCostPerSecondMs.toFixed(1)} ms/s`,
    });
    this.metricsStartedAt = now;
    this.metricsPresentationFrames = 0;
    this.metricsBroadUpdates = 0;
    this.metricsTightUpdates = 0;
    this.metricsReferenceUpdates = 0;
    this.metricsEffectCostMs = 0;
    this.metricsPresentationCostMs = 0;
  }

  async setSimulationMode(nextMode) {
    const requestedMode = String(nextMode || '');
    const previousMode = this.globals.currentMode;
    if (!isAtmosphereLabSimulationMode(requestedMode)) return previousMode;
    if (requestedMode === previousMode) return previousMode;
    this.clear();
    const applied = await setMode(requestedMode);
    const resolvedMode = this.globals.currentMode;
    if (!applied || resolvedMode !== requestedMode) {
      this.parameterizer?.setSimulationMode(resolvedMode);
      return resolvedMode;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('mode', requestedMode);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    if (requestedMode === MODES.BUBBLES) {
      const { refreshBubbleAtmosphereDepth } = await import('../../modes/bubbles.js');
      refreshBubbleAtmosphereDepth();
    }
    this.parameterizer?.setSimulationMode(requestedMode);
    return requestedMode;
  }

  installAuditHandle() {
    window.__ABS_ATMOSPHERE_LAB__ = {
      getSnapshot: () => ({
        variant: this.variant,
        renderer: this.broadEffect.renderMode,
        presentationMode: this.hybridProfile.presentationMode,
        broadCadence: Number(this.hybridProfile.broadCadence),
        tightCadence: Number(this.hybridProfile.tightCadence),
        crossfadeMs: this.hybridProfile.crossfadeMs,
        effectiveCrossfadeMs: this.broadBlendDurationMs,
        quality: this.dynamicQuality.id,
        scale: this.dynamicQuality.scale,
        outputWidth: this.outputCanvas.width,
        outputHeight: this.outputCanvas.height,
        simulationMode: this.globals.currentMode,
        themeMode: this.themeMode,
        reducedMotion: this.reducedMotion,
        presentationFrameCount: this.presentationFrameCount,
        broadUpdateCount: this.broadUpdateCount,
        tightUpdateCount: this.tightUpdateCount,
        referenceUpdateCount: this.referenceUpdateCount,
        broadBlending: this.isBroadBlending,
        renderProfile: {
          intensity: this.renderProfile.intensity,
          colourStrength: this.renderProfile.colourStrength,
          largeSpread: this.renderProfile.largeSpread,
          smallSpread: this.renderProfile.smallSpread,
          memoryMs: this.renderProfile.memoryMs,
        },
        metrics: this.lastMetrics,
        config: this.config,
      }),
      clear: () => this.clear(),
      setSimulationMode: (nextMode) => this.setSimulationMode(nextMode),
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
    this.parameterizer?.destroy();
    this.broadEffect.destroy();
    this.tightEffect.destroy();
    this.referenceEffect.destroy();
    this.outputCanvas.remove();
    if (window.__ABS_ATMOSPHERE_LAB__) delete window.__ABS_ATMOSPHERE_LAB__;
  }
}
