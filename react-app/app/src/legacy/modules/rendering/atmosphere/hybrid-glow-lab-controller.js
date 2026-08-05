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
const ATMOSPHERIC_FIELD_MODE = 'broad';

function createCanvas(className = '', layer = '') {
  const canvas = document.createElement('canvas');
  if (className) canvas.className = className;
  if (layer) canvas.dataset.atmosphereLayer = layer;
  canvas.setAttribute('aria-hidden', 'true');
  return canvas;
}

function getContext(canvas, options = {}) {
  const context = canvas.getContext('2d', { alpha: true, ...options });
  if (!context) throw new Error('Atmospheric glow Canvas 2D context unavailable');
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

function canDrawCanvas(canvas) {
  return canvas instanceof HTMLCanvasElement && canvas.width > 1 && canvas.height > 1;
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
      'hybrid-atmosphere',
    );
    this.sourceCanvas = createCanvas();
    this.sourceContext = getContext(this.sourceCanvas, { desynchronized: true });
    this.effect = new DiffuseGlowEffect(this.outputCanvas);
    this.routeLayer.append(this.outputCanvas);

    this.dynamicQuality = resolveAtmosphereQualityScale(this.config.common.qualityMode);
    this.themeMode = isDarkThemeDocument() ? 'dark' : 'light';
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    this.geometryKey = '';
    this.geometryDirty = true;
    this.blurGeometry = null;
    this.schedule = { nextFrameAt: 0 };
    this.effectConfig = { fieldMode: ATMOSPHERIC_FIELD_MODE };
    this.effectRenderInput = {
      sourceCanvas: this.sourceCanvas,
      config: this.effectConfig,
    };
    this.hasReducedMotionFrame = false;
    this.destroyed = false;

    this.updateCount = 0;
    this.metricsStartedAt = performance.now();
    this.metricsUpdates = 0;
    this.metricsEffectCostMs = 0;
    this.lastMetrics = {
      atmosphereFps: 0,
      effectCostPerSecondMs: 0,
      totalCostPerSecondMs: 0,
    };

    this.handleGeometryChange = () => {
      this.geometryDirty = true;
    };
    this.resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(this.handleGeometryChange)
      : null;
    this.resizeObserver?.observe(this.mainCanvas);
    window.addEventListener('resize', this.handleGeometryChange, { passive: true });

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
    this.applyVisibility();
    this.installAuditHandle();
  }

  rebuildProfiles() {
    this.hybridProfile = resolveAtmosphereProfile(this.config, this.variant, this.themeMode);
    this.renderProfile = resolveSimulationAtmosphereRenderProfile(
      this.productionConfig,
      this.themeMode,
    );
    this.effectConfig.fieldMode = ATMOSPHERIC_FIELD_MODE;
    this.effectConfig.intensity = Math.min(
      1,
      this.renderProfile.intensity * this.hybridProfile.glowStrength,
    );
    this.effectConfig.colourStrength = this.renderProfile.colourStrength;
    this.effectConfig.memoryMs = this.reducedMotion ? 0 : this.renderProfile.memoryMs;
  }

  applyVisibility() {
    this.outputCanvas.hidden = !this.config.common.enabled;
  }

  resetMetricsWindow() {
    this.metricsStartedAt = performance.now();
    this.metricsUpdates = 0;
    this.metricsEffectCostMs = 0;
  }

  setConfig(nextConfig) {
    const previousQuality = this.config.common.qualityMode;
    this.config = normalizeAtmosphereLabConfig(nextConfig);
    if (previousQuality !== this.config.common.qualityMode) {
      this.dynamicQuality = resolveAtmosphereQualityScale(this.config.common.qualityMode);
      this.geometryKey = '';
      this.geometryDirty = true;
    }
    this.rebuildProfiles();
    this.applyVisibility();
    this.clear();
  }

  clear() {
    clearContext(this.sourceContext);
    this.effect.clear();
    this.hasReducedMotionFrame = false;
    this.schedule.nextFrameAt = 0;
    this.resetMetricsWindow();
  }

  syncSize() {
    if (!this.geometryDirty && this.blurGeometry) return true;
    const rect = this.mainCanvas.getBoundingClientRect();
    if (rect.width <= 1 || rect.height <= 1) return false;
    this.geometryDirty = false;
    const geometryKey = `${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (geometryKey !== this.geometryKey) {
      this.geometryKey = geometryKey;
      if (this.config.common.qualityMode === 'auto') {
        this.dynamicQuality = resolveAtmosphereQualityScale('auto');
      }
    }
    const width = Math.max(2, Math.round(rect.width * this.dynamicQuality.scale));
    const height = Math.max(2, Math.round(rect.height * this.dynamicQuality.scale));
    const sourceResized = resizeCanvas(this.sourceCanvas, width, height);
    const outputResized = resizeCanvas(this.outputCanvas, width, height);
    const resized = sourceResized || outputResized;
    if (resized) {
      this.effect.resize(width, height);
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
    this.effectConfig.largeBlurRadiusBackingPx = this.blurGeometry.largeRadiusBackingPx;
    this.effectConfig.smallBlurRadiusBackingPx = this.blurGeometry.smallRadiusBackingPx;
    return true;
  }

  copySimulationSource() {
    const context = this.sourceContext;
    const width = this.sourceCanvas.width;
    const height = this.sourceCanvas.height;
    clearContext(context);
    if (canDrawCanvas(this.mainCanvas)) {
      context.drawImage(this.mainCanvas, 0, 0, width, height);
    }
    const frontDepthCanvas = this.globals.depthTitleFrontCanvas;
    if (
      frontDepthCanvas?.isConnected
      && frontDepthCanvas.id !== 'simulation-title-canvas'
      && canDrawCanvas(frontDepthCanvas)
    ) {
      context.drawImage(frontDepthCanvas, 0, 0, width, height);
    }
  }

  renderAtmosphere(now) {
    const cadence = Number(this.hybridProfile.glowCadence) || 8;
    if (!shouldRenderSimulationAtmosphereFrame(this.schedule, now, cadence)) return false;
    const startedAt = performance.now();
    this.copySimulationSource();
    this.effectConfig.cadenceFps = cadence;
    this.effect.render(this.effectRenderInput);
    this.metricsEffectCostMs += performance.now() - startedAt;
    this.updateCount += 1;
    this.metricsUpdates += 1;
    return true;
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
    const rendered = this.renderAtmosphere(now);
    if (this.reducedMotion && rendered) this.hasReducedMotionFrame = true;
    this.updateMetrics(now);
  }

  updateMetrics(now) {
    const elapsed = now - this.metricsStartedAt;
    if (elapsed < METRICS_INTERVAL_MS) return;
    const seconds = Math.max(0.001, elapsed / 1000);
    this.lastMetrics = {
      atmosphereFps: this.metricsUpdates / seconds,
      effectCostPerSecondMs: this.metricsEffectCostMs / seconds,
      totalCostPerSecondMs: this.metricsEffectCostMs / seconds,
    };
    this.parameterizer?.setMetrics({
      summary: `atmosphere · ${this.hybridProfile.glowCadence} fps · ${this.lastMetrics.totalCostPerSecondMs.toFixed(1)} ms/s`,
    });
    this.metricsStartedAt = now;
    this.metricsUpdates = 0;
    this.metricsEffectCostMs = 0;
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
    this.parameterizer?.setSimulationMode(requestedMode);
    return requestedMode;
  }

  installAuditHandle() {
    window.__ABS_ATMOSPHERE_LAB__ = {
      getSnapshot: () => ({
        variant: this.variant,
        renderer: this.effect.renderMode,
        fieldMode: ATMOSPHERIC_FIELD_MODE,
        glowCadence: Number(this.hybridProfile.glowCadence),
        memoryMs: this.effectConfig.memoryMs,
        displaySmoothing: this.effectConfig.memoryMs > 0 ? 'temporal-memory' : 'none',
        quality: this.dynamicQuality.id,
        scale: this.dynamicQuality.scale,
        outputWidth: this.outputCanvas.width,
        outputHeight: this.outputCanvas.height,
        simulationMode: this.globals.currentMode,
        themeMode: this.themeMode,
        reducedMotion: this.reducedMotion,
        updateCount: this.updateCount,
        temporalMemoryFrames: this.effect.temporalMemoryFrames,
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
    window.removeEventListener('resize', this.handleGeometryChange);
    this.resizeObserver?.disconnect();
    this.parameterizer?.destroy();
    this.effect.destroy();
    this.outputCanvas.remove();
    if (window.__ABS_ATMOSPHERE_LAB__) delete window.__ABS_ATMOSPHERE_LAB__;
  }
}
