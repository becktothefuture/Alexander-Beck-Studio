import { withBasePath } from '../../../../lib/base-path.js';
import { THEME_CHANGE_EVENT, isDarkThemeDocument } from '../../../../lib/theme-state.js';
import {
  ATMOSPHERE_LAB_VARIANTS,
  DEFAULT_ATMOSPHERE_LAB_CONFIG,
  DEFAULT_SIMULATION_ATMOSPHERE_CONFIG,
  normalizeAtmosphereLabConfig,
  normalizeSimulationAtmosphereConfig,
  resolveAtmosphereCadence,
  resolveAtmosphereProfile,
  resolveAtmosphereQualityScale,
} from '../../../../routes/atmosphere-lab/atmosphereLabControls.js';
import { getAtmosphereLabVariant } from '../../../../routes/atmosphere-lab/atmosphereLabRoutes.js';
import {
  ATMOSPHERE_LAB_SIMULATION_OPTIONS,
  isAtmosphereLabSimulationMode,
} from '../../../../routes/atmosphere-lab/atmosphereLabSimulations.js';
import { createAtmosphereParameterizer } from '../../../../routes/atmosphere-lab/atmosphereParameterizer.js';
import {
  invalidateHomepageCanvasTitleGeometry,
} from '../title-depth.js';
import { AtmosphereEdgeLight } from './atmosphere-edge-light.js';
import { CanvasFeedbackEffect } from './canvas-feedback-effect.js';
import { WebglAtmosphereEffect } from './webgl-atmosphere-effect.js';
import {
  getAtmosphereFramePolicySnapshot,
  setAtmosphereFrameRenderer,
} from './atmosphere-frame-hook.js';
import { ParticleLightSource } from './particle-light-source.js';
import {
  getSimulationAtmosphereSnapshot,
  invalidateSimulationAtmosphereGeometry,
  registerSimulationAtmosphereSource,
  setSimulationAtmosphereConfig,
} from './simulation-atmosphere.js';
import { normalizeDesignSystemConfig } from '../../utils/design-config.js';
import { setMode } from '../../modes/mode-controller.js';
import { setTheme } from '../../visual/dark-mode-v2.js';
import { MODES } from '../../core/constants.js';

let activeController = null;

const RESPONSIVE_EFFECT_REFERENCE_PX = 720;
const RESPONSIVE_EFFECT_MIN_SCALE = 0.72;

function createLayerCanvas(className, label) {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  canvas.dataset.atmosphereLayer = label;
  return canvas;
}

function createEdgeLightLayer(canvas) {
  const layer = document.createElement('div');
  layer.className = 'simulation-atmosphere-edge-light-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.append(canvas);
  return layer;
}

function resolveResponsiveEffectScale(width, height) {
  const shortestSide = Math.max(1, Math.min(Number(width) || 1, Number(height) || 1));
  return Math.max(RESPONSIVE_EFFECT_MIN_SCALE, Math.min(1, shortestSide / RESPONSIVE_EFFECT_REFERENCE_PX));
}

function fetchLabConfig() {
  return fetch(withBasePath('/config/atmosphere-lab.json'), { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Atmosphere config request failed (${response.status})`);
      return response.json();
    })
    .then(normalizeAtmosphereLabConfig)
    .catch(() => normalizeAtmosphereLabConfig(DEFAULT_ATMOSPHERE_LAB_CONFIG));
}

function fetchDesignSystemConfig() {
  return fetch(withBasePath('/config/design-system.json'), { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Design system request failed (${response.status})`);
      return response.json();
    })
    .then(normalizeDesignSystemConfig);
}

function createCrispGlowAuthoringConfig(designSystem) {
  return normalizeSimulationAtmosphereConfig(designSystem?.shell?.surface?.simulationAtmosphere);
}

function downloadDesignSystemConfig(config) {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'design-system.json';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
}

class AtmosphereLabController {
  constructor({ variant, globals, config }) {
    this.variant = variant;
    this.globals = globals;
    this.config = config;
    this.mainCanvas = globals.canvas;
    this.routeLayer = this.mainCanvas.parentElement;
    this.outputCanvas = createLayerCanvas('atmosphere-output-canvas', 'fog');
    this.edgeLightCanvas = variant === 'crispGlow'
      ? createLayerCanvas('atmosphere-edge-light-canvas', 'edge-light')
      : null;
    this.edgeLightLayer = this.edgeLightCanvas ? createEdgeLightLayer(this.edgeLightCanvas) : null;
    this.edgeLight = this.edgeLightCanvas ? new AtmosphereEdgeLight(this.edgeLightCanvas) : null;
    this.sourceCanvas = document.createElement('canvas');
    this.sourceContext = this.sourceCanvas.getContext('2d', { alpha: true, desynchronized: true });
    this.particleLightSource = new ParticleLightSource();
    this.routeLayer.append(this.outputCanvas);
    if (this.edgeLightLayer) this.routeLayer.append(this.edgeLightLayer);
    this.effect = null;
    this.fallback = false;
    this.lastEffectAt = 0;
    this.lastFrameAt = performance.now();
    this.lastMetricsAt = this.lastFrameAt;
    this.metricsFrames = 0;
    this.metricsCost = 0;
    this.lastSourceLightCount = 0;
    this.lastFps = 0;
    this.lastCostMs = 0;
    this.dynamicQuality = resolveAtmosphereQualityScale(this.config.common.qualityMode);
    this.responsiveEffectScale = 1;
    this.lastResponsiveGeometryKey = '';
    this.overBudgetSamples = 0;
    this.destroyed = false;
    this.titleMaskCache = null;
    this.titleMaskDirty = true;
    this.titleMaskLayoutReadCount = 0;
    this.reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
    this.themeMode = isDarkThemeDocument() ? 'dark' : 'light';
    this.handleThemeChange = (event) => {
      const nextTheme = event?.detail?.isDark ? 'dark' : 'light';
      if (nextTheme === this.themeMode) return;
      this.themeMode = nextTheme;
      this.titleMaskDirty = true;
      this.rebuildProfiles();
      this.applyPresentationState();
      this.clear();
      this.parameterizer?.setThemeMode(nextTheme);
    };
    window.addEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
    this.titleResizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => {
        this.titleMaskDirty = true;
      })
      : null;
    const titleSource = document.getElementById('hero-title');
    if (titleSource) this.titleResizeObserver?.observe(titleSource);
    this.titleResizeObserver?.observe(this.mainCanvas);
    this.rebuildProfiles();
    this.createEffect();
    this.parameterizer = new URLSearchParams(window.location.search).get('panel') === '0'
      ? null
      : createAtmosphereParameterizer({
        variant,
        initialConfig: config,
        simulationMode: this.globals.currentMode,
        simulationOptions: variant === 'crispGlow' ? ATMOSPHERE_LAB_SIMULATION_OPTIONS : [],
        themeMode: this.themeMode,
        onChange: (nextConfig) => this.setConfig(nextConfig),
        onReset: () => this.clear(),
        onSimulationChange: (nextMode) => this.setSimulationMode(nextMode),
        onThemeChange: (nextTheme) => setTheme(nextTheme),
      });
    this.applyPresentationState();
    this.installAuditHandle();
  }

  createEffect() {
    try {
      if (this.variant === 'canvasFeedback' || this.variant === 'crispGlow') {
        this.effect = new CanvasFeedbackEffect(this.outputCanvas);
      } else {
        this.effect = new WebglAtmosphereEffect(this.outputCanvas, {
          mode: this.variant === 'density' ? 'density' : 'post',
        });
      }
    } catch (error) {
      console.warn('[atmosphere-lab] WebGL unavailable; using Canvas feedback', error);
      this.activateCanvasFallback();
    }
  }

  activateCanvasFallback() {
    try {
      this.effect?.destroy?.();
    } catch {
      // A lost WebGL context may reject cleanup; replacing the layer is enough.
    }
    const replacement = createLayerCanvas('atmosphere-output-canvas', 'fog');
    this.outputCanvas.replaceWith(replacement);
    this.outputCanvas = replacement;
    this.effect = new CanvasFeedbackEffect(this.outputCanvas);
    this.effect.resize(
      Math.max(2, this.sourceCanvas.width),
      Math.max(2, this.sourceCanvas.height),
    );
    this.outputCanvas.hidden = !this.config.common.enabled;
    this.fallback = true;
    this.lastEffectAt = 0;
  }

  installAuditHandle() {
    window.__ABS_ATMOSPHERE_LAB__ = {
      getSnapshot: () => {
        let rearCount = 0;
        let frontCount = 0;
        const balls = Array.isArray(this.globals.balls) ? this.globals.balls : [];
        for (let i = 0; i < balls.length; i += 1) {
          if ((balls[i].z ?? 1) < 0.5) rearCount += 1;
          else frontCount += 1;
        }
        return {
          variant: this.variant,
          renderer: this.fallback ? 'canvas-fallback' : this.variant,
          quality: this.dynamicQuality.id,
          scale: this.dynamicQuality.scale,
          fps: this.lastFps,
          costMs: this.lastCostMs,
          outputWidth: this.outputCanvas.width,
          outputHeight: this.outputCanvas.height,
          edgeWidth: this.edgeLightCanvas?.width || 0,
          edgeHeight: this.edgeLightCanvas?.height || 0,
          responsiveScale: this.responsiveEffectScale,
          simulationMode: this.globals.currentMode,
          themeMode: this.themeMode,
          titleOwner: getAtmosphereFramePolicySnapshot()?.titleOwner || null,
          titleVisible: Boolean(this.globals.canvasTitleRenderState?.visible),
          titleLayoutReadCount: Number(this.globals.titleLayoutReadCount) || 0,
          titleMaskLayoutReadCount: this.titleMaskLayoutReadCount,
          ballCount: balls.length,
          rearCount,
          frontCount,
          frontShare: balls.length > 0 ? frontCount / balls.length : 0,
          composition: {
            ballPresence: this.renderProfile.ballPresence ?? null,
            hazeStrength: this.renderProfile.hazeStrength ?? null,
            grainStrength: this.renderProfile.grainStrength ?? null,
            blendMode: this.renderProfile.blendMode ?? null,
            edgeWidthPx: this.renderProfile.edgeWidthPx ?? null,
            edgeInsetPx: this.renderProfile.edgeInsetPx ?? null,
          },
          particleLightCount: this.effect?.lastInstanceCount || this.lastSourceLightCount,
          firstEmitter: (() => {
            const ball = balls[0];
            if (!ball) return null;
            return {
              x: ball.x,
              y: ball.y,
              radius: typeof ball.getDisplayRadius === 'function' ? ball.getDisplayRadius() : ball.r,
              colour: ball.color,
            };
          })(),
          config: this.config,
        };
      },
      clear: () => this.clear(),
      setSimulationMode: (nextMode) => this.setSimulationMode(nextMode),
    };
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
    this.lastEffectAt = 0;
    this.clear();
    this.parameterizer?.setSimulationMode(requestedMode);
    return requestedMode;
  }

  setConfig(nextConfig) {
    const previousQuality = this.config.common.qualityMode;
    const wasEnabled = this.config.common.enabled;
    this.config = normalizeAtmosphereLabConfig(nextConfig);
    this.rebuildProfiles();
    if (previousQuality !== this.config.common.qualityMode) {
      this.dynamicQuality = resolveAtmosphereQualityScale(this.config.common.qualityMode);
      this.overBudgetSamples = 0;
      this.clear();
    }
    if (wasEnabled && !this.config.common.enabled) this.clear();
    this.applyPresentationState();
  }

  applyPresentationState() {
    const enabled = this.config.common.enabled;
    const preserveCrispRenderer = this.variant === 'crispGlow';
    const presentationProfile = preserveCrispRenderer ? this.renderProfile : null;
    const root = document.documentElement;
    document.body.style.setProperty(
      '--atmosphere-core-presence',
      preserveCrispRenderer ? String(presentationProfile.ballPresence) : '0',
    );
    root.style.setProperty('--atmosphere-haze-strength', String(presentationProfile?.hazeStrength ?? 1));
    root.style.setProperty('--atmosphere-grain-strength', String(presentationProfile?.grainStrength ?? 1));
    root.style.setProperty('--atmosphere-edge-width', `${presentationProfile?.edgeWidthPx ?? 1.5}px`);
    root.style.setProperty('--atmosphere-edge-inset', `${presentationProfile?.edgeInsetPx ?? 0}px`);
    this.outputCanvas.hidden = !enabled;
    if (this.edgeLightCanvas) {
      this.edgeLightCanvas.hidden = !enabled || this.renderProfile.edgeLight <= 0;
    }
  }

  rebuildProfiles() {
    const profile = resolveAtmosphereProfile(this.config, this.variant, this.themeMode);
    const motionProfile = this.reducedMotion
      ? { ...profile, driftSpeedPxPerSec: 0, turbulence: 0, particleShimmer: 0 }
      : profile;
    this.renderProfile = motionProfile;
    const fallbackProfile = resolveAtmosphereProfile(this.config, 'canvasFeedback');
    this.fallbackProfile = this.reducedMotion
      ? { ...fallbackProfile, driftSpeedPxPerSec: 0, turbulence: 0, particleShimmer: 0 }
      : fallbackProfile;
  }

  clear() {
    this.effect?.clear?.();
    this.edgeLight?.clear();
    this.sourceContext.clearRect(0, 0, this.sourceCanvas.width, this.sourceCanvas.height);
  }

  resolveTitleMask() {
    if (!this.titleMaskDirty && this.titleMaskCache) return this.titleMaskCache;
    const canvasRect = this.mainCanvas.getBoundingClientRect();
    const titleRect = document.getElementById('hero-title')?.getBoundingClientRect();
    this.titleMaskLayoutReadCount += 2;
    if (!titleRect || canvasRect.width <= 0 || canvasRect.height <= 0) {
      this.titleMaskCache = { x: 0.5, y: 0.5, radiusX: 0.24, radiusY: 0.18 };
      this.titleMaskDirty = false;
      return this.titleMaskCache;
    }
    this.titleMaskCache = {
      x: ((titleRect.left + titleRect.width * 0.5) - canvasRect.left) / canvasRect.width,
      y: ((titleRect.top + titleRect.height * 0.5) - canvasRect.top) / canvasRect.height,
      radiusX: Math.min(0.46, Math.max(0.14, (titleRect.width * 0.72 + 72) / canvasRect.width)),
      radiusY: Math.min(0.38, Math.max(0.12, (titleRect.height * 1.35 + 68) / canvasRect.height)),
    };
    this.titleMaskDirty = false;
    return this.titleMaskCache;
  }

  syncSize() {
    const rect = this.mainCanvas.getBoundingClientRect();
    const responsiveGeometryKey = `${Math.round(rect.width)}:${Math.round(rect.height)}`;
    if (responsiveGeometryKey !== this.lastResponsiveGeometryKey) {
      this.lastResponsiveGeometryKey = responsiveGeometryKey;
      this.responsiveEffectScale = resolveResponsiveEffectScale(rect.width, rect.height);
      this.titleMaskDirty = true;
      invalidateHomepageCanvasTitleGeometry();
      if (this.config.common.qualityMode === 'auto') {
        const nextQuality = resolveAtmosphereQualityScale('auto');
        if (nextQuality.id !== this.dynamicQuality.id) {
          this.dynamicQuality = nextQuality;
          this.overBudgetSamples = 0;
          this.lastEffectAt = 0;
          this.clear();
        }
      }
    }
    const width = Math.max(2, Math.round(rect.width * this.dynamicQuality.scale));
    const height = Math.max(2, Math.round(rect.height * this.dynamicQuality.scale));
    if (this.sourceCanvas.width !== width || this.sourceCanvas.height !== height) {
      this.sourceCanvas.width = width;
      this.sourceCanvas.height = height;
      this.effect.resize(width, height);
      this.titleMaskDirty = true;
      this.lastEffectAt = 0;
    }
    if (this.edgeLight) {
      this.edgeLight.resize(width, height);
    }
  }

  copySimulationSource(profile, titleMask, nowMs) {
    const context = this.sourceContext;
    const width = this.sourceCanvas.width;
    const height = this.sourceCanvas.height;
    const needsCanvasSource = this.fallback || this.variant !== 'density';
    if (needsCanvasSource) {
      const ballCount = Array.isArray(this.globals.balls) ? this.globals.balls.length : 0;
      if (this.variant === 'crispGlow' && ballCount === 0) {
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.filter = 'none';
        context.clearRect(0, 0, width, height);
        context.drawImage(this.mainCanvas, 0, 0, width, height);
        this.lastSourceLightCount = Math.max(0, Number(this.mainCanvas.dataset.simulationBodyCount) || 0);
      } else {
        this.lastSourceLightCount = this.particleLightSource.render({
          context,
          canvas: this.sourceCanvas,
          balls: this.globals.balls,
          mainCanvas: this.mainCanvas,
          config: profile,
          nowMs,
          emitterStride: this.variant === 'crispGlow' ? 3 : 1,
        });
      }
    } else {
      this.lastSourceLightCount = 0;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalAlpha = 1;
      context.globalCompositeOperation = 'source-over';
      context.filter = 'none';
      context.clearRect(0, 0, width, height);
    }

    if (profile.titleClearance <= 0) return;
    const centerX = titleMask.x * width;
    const centerY = titleMask.y * height;
    const radiusX = Math.max(1, titleMask.radiusX * width);
    const radiusY = Math.max(1, titleMask.radiusY * height);
    const removal = Math.min(1, 0.46 + profile.titleClearance * 0.72);
    context.save();
    context.globalCompositeOperation = 'destination-out';
    context.translate(centerX, centerY);
    context.scale(radiusX, radiusY);
    const gradient = context.createRadialGradient(0, 0, 0.08, 0, 0, 1);
    gradient.addColorStop(0, `rgba(0, 0, 0, ${removal})`);
    gradient.addColorStop(0.38, `rgba(0, 0, 0, ${removal * 0.92})`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = gradient;
    context.fillRect(-1, -1, 2, 2);
    context.restore();
  }

  resolveRenderProfile() {
    return this.fallback ? this.fallbackProfile : this.renderProfile;
  }

  updateAdaptiveQuality(costMs) {
    if (this.config.common.qualityMode !== 'auto') return;
    const frameRateConstrained = this.lastFps > 0 && this.lastFps < 54;
    this.overBudgetSamples = costMs > 8 || frameRateConstrained
      ? this.overBudgetSamples + 1
      : Math.max(0, this.overBudgetSamples - 2);
    if (this.overBudgetSamples < 24 || this.dynamicQuality.scale <= 0.25) return;
    this.dynamicQuality = this.dynamicQuality.scale > 0.4
      ? { id: 'balanced', scale: 0.375 }
      : { id: 'low', scale: 0.25 };
    this.overBudgetSamples = 0;
    this.clear();
  }

  render(now = performance.now()) {
    if (this.destroyed) return;
    this.lastFrameAt = now;
    this.metricsFrames += 1;
    this.syncSize();
    if (!this.config.common.enabled) return;

    const cadence = this.reducedMotion ? Math.min(20, resolveAtmosphereCadence(this.config.common.hazeCadence)) : resolveAtmosphereCadence(this.config.common.hazeCadence);
    const interval = 1000 / cadence;
    if (this.lastEffectAt && now - this.lastEffectAt < interval) {
      this.updateMetrics(now);
      return;
    }

    const effectDt = this.lastEffectAt ? Math.min(120, now - this.lastEffectAt) : interval;
    this.lastEffectAt = now;
    const start = performance.now();
    const profile = this.resolveRenderProfile();
    const titleMask = this.resolveTitleMask();
    this.copySimulationSource(profile, titleMask, now);
    try {
      this.effect.render({
        sourceCanvas: this.sourceCanvas,
        balls: this.globals.balls,
        mainCanvas: this.mainCanvas,
        config: profile,
        dtMs: effectDt,
        qualityScale: this.dynamicQuality.scale,
        titleMask,
        nowMs: now,
        responsiveScale: this.responsiveEffectScale,
      });
      const edgeWidthBackingPx = (this.renderProfile.edgeWidthPx ?? 1.5) * this.dynamicQuality.scale;
      const edgeInsetBackingPx = (this.renderProfile.edgeInsetPx ?? 0) * this.dynamicQuality.scale;
      this.edgeLight?.render(
        this.outputCanvas,
        this.renderProfile.edgeLight,
        edgeWidthBackingPx,
        edgeInsetBackingPx,
      );
    } catch (error) {
      if (!this.fallback) {
        console.warn('[atmosphere-lab] Renderer failed; activating Canvas fallback', error);
        this.activateCanvasFallback();
        this.syncSize();
      }
    }
    const costMs = performance.now() - start;
    this.metricsCost += costMs;
    this.lastCostMs = costMs;
    this.updateAdaptiveQuality(costMs);
    this.updateMetrics(now);
  }

  updateMetrics(now) {
    const elapsed = now - this.lastMetricsAt;
    if (elapsed < 500) return;
    this.lastFps = (this.metricsFrames * 1000) / Math.max(1, elapsed);
    this.lastCostMs = this.metricsCost / Math.max(1, Math.round(elapsed / (1000 / resolveAtmosphereCadence(this.config.common.hazeCadence))));
    this.parameterizer?.setMetrics({
      fps: this.lastFps,
      costMs: this.lastCostMs,
      quality: this.dynamicQuality.id,
      fallback: this.fallback,
    });
    this.lastMetricsAt = now;
    this.metricsFrames = 0;
    this.metricsCost = 0;
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    window.removeEventListener(THEME_CHANGE_EVENT, this.handleThemeChange);
    this.titleResizeObserver?.disconnect();
    this.parameterizer?.destroy();
    this.effect?.destroy?.();
    this.edgeLight?.destroy();
    this.particleLightSource.destroy();
    this.outputCanvas.remove();
    this.edgeLightLayer?.remove();
    document.body.style.removeProperty('--atmosphere-core-presence');
    document.documentElement.style.removeProperty('--atmosphere-haze-strength');
    document.documentElement.style.removeProperty('--atmosphere-grain-strength');
    document.documentElement.style.removeProperty('--atmosphere-edge-width');
    document.documentElement.style.removeProperty('--atmosphere-edge-inset');
    invalidateHomepageCanvasTitleGeometry();
    if (window.__ABS_ATMOSPHERE_LAB__) delete window.__ABS_ATMOSPHERE_LAB__;
    if (activeController === this) {
      activeController = null;
      setAtmosphereFrameRenderer(null);
    }
  }
}

class CrispGlowLabController {
  constructor({ globals, designSystem }) {
    this.variant = 'crispGlow';
    this.globals = globals;
    this.designSystem = designSystem;
    this.baseConfig = createCrispGlowAuthoringConfig(designSystem);
    this.config = createCrispGlowAuthoringConfig(designSystem);
    this.destroyed = false;
    this.canvasLayers = [globals.canvas];
    this.sourceCleanup = registerSimulationAtmosphereSource({
      id: 'lab:crisp-glow',
      routeId: 'atmosphere-crisp-glow',
      kind: 'canvas',
      canvas: globals.canvas,
      getCanvasLayers: () => {
        const frontDepthCanvas = this.globals.depthTitleFrontCanvas;
        if (frontDepthCanvas?.isConnected && frontDepthCanvas.id !== 'simulation-title-canvas') {
          this.canvasLayers[1] = frontDepthCanvas;
          this.canvasLayers.length = 2;
        } else {
          this.canvasLayers.length = 1;
        }
        return this.canvasLayers;
      },
      scheduler: 'renderer-coupled',
      opacityElement: globals.canvas,
    });
    this.applyConfig(this.config);
    this.parameterizer = new URLSearchParams(window.location.search).get('panel') === '0'
      ? null
      : createAtmosphereParameterizer({
        variant: this.variant,
        initialConfig: this.config,
        simulationMode: globals.currentMode,
        simulationOptions: ATMOSPHERE_LAB_SIMULATION_OPTIONS,
        themeMode: isDarkThemeDocument() ? 'dark' : 'light',
        onChange: (nextConfig) => this.applyConfig(nextConfig),
        onReset: () => invalidateSimulationAtmosphereGeometry('crisp-lab-reset'),
        onSave: (nextConfig) => this.save(nextConfig),
        onSimulationChange: (nextMode) => this.setSimulationMode(nextMode),
        onThemeChange: (nextTheme) => setTheme(nextTheme),
      });
    this.metricsTimer = window.setInterval(() => this.updateMetrics(), 500);
    this.installAuditHandle();
  }

  applyConfig(nextConfig) {
    this.config = normalizeSimulationAtmosphereConfig(nextConfig);
    setSimulationAtmosphereConfig(this.config);
    invalidateSimulationAtmosphereGeometry('crisp-lab-config');
  }

  async save(nextConfig) {
    this.applyConfig(nextConfig);
    const latest = await fetchDesignSystemConfig().catch(() => this.designSystem);
    const snapshot = normalizeDesignSystemConfig({
      ...latest,
      shell: {
        ...(latest?.shell || {}),
        surface: {
          ...(latest?.shell?.surface || {}),
          simulationAtmosphere: normalizeSimulationAtmosphereConfig(this.config),
        },
      },
    });
    try {
      const response = await fetch('/api/design-system/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: snapshot }),
      });
      if (!response.ok) throw new Error(`Save failed (${response.status})`);
      this.designSystem = snapshot;
      this.baseConfig = createCrispGlowAuthoringConfig(snapshot);
      return { saved: true, downloaded: false };
    } catch {
      downloadDesignSystemConfig(snapshot);
      return { saved: false, downloaded: true };
    }
  }

  async setSimulationMode(nextMode) {
    const requestedMode = String(nextMode || '');
    const previousMode = this.globals.currentMode;
    if (!isAtmosphereLabSimulationMode(requestedMode)) return previousMode;
    if (requestedMode === previousMode) return previousMode;
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
    invalidateSimulationAtmosphereGeometry('crisp-lab-simulation');
    this.parameterizer?.setSimulationMode(requestedMode);
    return requestedMode;
  }

  updateMetrics() {
    const snapshot = getSimulationAtmosphereSnapshot();
    this.parameterizer?.setMetrics({
      fps: snapshot.cadence || 0,
      costMs: snapshot.cost?.meanMs || 0,
      quality: snapshot.quality || '',
      fallback: snapshot.status === 'failed-open',
    });
  }

  installAuditHandle() {
    window.__ABS_ATMOSPHERE_LAB__ = {
      getSnapshot: () => {
        const production = getSimulationAtmosphereSnapshot();
        const balls = Array.isArray(this.globals.balls) ? this.globals.balls : [];
        let rearCount = 0;
        let frontCount = 0;
        for (let index = 0; index < balls.length; index += 1) {
          if ((balls[index].z ?? 1) < 0.5) rearCount += 1;
          else frontCount += 1;
        }
        return {
          ...production,
          variant: this.variant,
          renderer: 'production-diffuse-glow',
          simulationMode: this.globals.currentMode,
          titleOwner: 'shell',
          titleVisible: Boolean(this.globals.canvasTitleRenderState?.visible),
          titleLayoutReadCount: Number(this.globals.titleLayoutReadCount) || 0,
          ballCount: balls.length,
          rearCount,
          frontCount,
          frontShare: balls.length ? frontCount / balls.length : 0,
          config: this.config,
        };
      },
      setSimulationMode: (nextMode) => this.setSimulationMode(nextMode),
      clear: () => invalidateSimulationAtmosphereGeometry('crisp-lab-clear'),
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    window.clearInterval(this.metricsTimer);
    this.parameterizer?.destroy();
    this.sourceCleanup?.();
    setSimulationAtmosphereConfig(this.baseConfig || DEFAULT_SIMULATION_ATMOSPHERE_CONFIG);
    if (window.__ABS_ATMOSPHERE_LAB__) delete window.__ABS_ATMOSPHERE_LAB__;
    if (activeController === this) activeController = null;
  }
}

export async function initializeAtmosphereLab({ variant, globals }) {
  activeController?.destroy();
  const definition = ATMOSPHERE_LAB_VARIANTS[variant] || ATMOSPHERE_LAB_VARIANTS.webglPost;
  document.title = `${definition.title} - Alexander Beck Studio`;
  if (variant === 'crispGlow') {
    const designSystem = await fetchDesignSystemConfig().catch(() => normalizeDesignSystemConfig({
      shell: {
        surface: { simulationAtmosphere: DEFAULT_SIMULATION_ATMOSPHERE_CONFIG },
      },
    }));
    activeController = new CrispGlowLabController({ globals, designSystem });
    if (globals.currentMode === MODES.BUBBLES) {
      const { refreshBubbleAtmosphereDepth } = await import('../../modes/bubbles.js');
      refreshBubbleAtmosphereDepth();
    }
    return activeController;
  }
  const config = await fetchLabConfig();
  activeController = new AtmosphereLabController({ variant, globals, config });
  setAtmosphereFrameRenderer((frameGlobals) => {
    if (activeController?.globals !== frameGlobals) return;
    if (getAtmosphereLabVariant(window.location.pathname) !== activeController.variant) {
      disposeActiveAtmosphereLab();
      return;
    }
    activeController.render(performance.now());
  });
  return activeController;
}

export function disposeActiveAtmosphereLab() {
  activeController?.destroy();
  activeController = null;
  setAtmosphereFrameRenderer(null);
}
