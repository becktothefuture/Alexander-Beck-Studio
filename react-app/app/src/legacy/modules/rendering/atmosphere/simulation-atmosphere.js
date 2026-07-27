import { THEME_CHANGE_EVENT, isDarkThemeDocument } from '../../../../lib/theme-state.js';
import { AtmosphereEdgeLight } from './atmosphere-edge-light.js';
import { CanvasFeedbackEffect } from './canvas-feedback-effect.js';
import { ParticleLightSource } from './particle-light-source.js';
import {
  DEFAULT_SIMULATION_ATMOSPHERE_CONFIG,
  normalizeSimulationAtmosphereConfig,
  resolveSimulationAtmosphereCadence,
  resolveSimulationAtmosphereQualityScale,
  resolveSimulationAtmosphereRenderProfile,
} from './simulation-atmosphere-config.js';

const SOURCE_KINDS = new Set(['emitters', 'canvas', 'ambient']);
const SOURCE_SCHEDULERS = new Set(['external', 'internal', 'renderer-coupled']);
const QUALITY_LEVELS = Object.freeze({
  high: Object.freeze({ id: 'high', scale: 0.5, emitterBudget: 160 }),
  balanced: Object.freeze({ id: 'balanced', scale: 0.375, emitterBudget: 96 }),
  low: Object.freeze({ id: 'low', scale: 0.25, emitterBudget: 64 }),
});
const COST_SAMPLE_CAPACITY = 120;
const FIRST_FRAME_TIMEOUT_MS = 1200;
const RESPONSIVE_REFERENCE_PX = 720;
const RESPONSIVE_MIN_SCALE = 0.72;
const CSS_MATERIAL_BLUR_SUPPORTED = (() => {
  try {
    return typeof CSS !== 'undefined' && CSS.supports?.('filter', 'blur(1px)') === true;
  } catch (e) {
    return false;
  }
})();
const AMBIENT_COLOURS_LIGHT = Object.freeze(['#4f7fff', '#ff7657', '#d8e54f', '#53d39c']);
const AMBIENT_COLOURS_DARK = Object.freeze(['#5c87ff', '#ff7657', '#dceb54', '#55dba0']);
const AMBIENT_COUNT = 8;

let host = null;
let hostGeneration = 0;
let activeSource = null;
let sourceGeneration = 0;
let configuration = normalizeSimulationAtmosphereConfig(DEFAULT_SIMULATION_ATMOSPHERE_CONFIG);
let themeMode = 'light';
let transitionPhase = 'idle';
let transitionSourceGeneration = 0;
let internalFrameId = 0;
let geometryDirty = true;
let maskDirty = true;
let staticFrameDirty = true;
let lastEffectAt = 0;
let renderProfile = null;
let dynamicQuality = QUALITY_LEVELS.balanced;
let cadence = 30;
let responsiveScale = 1;
let reducedMotion = false;
let destroyed = false;
let consecutiveErrors = 0;
let overBudgetSamples = 0;
let sourceSwitchCount = 0;
let clearCount = 0;
let staleCleanupCount = 0;
let compositedFrameCount = 0;
let skippedFrameCount = 0;
let geometryReadCount = 0;
let quietZoneGeometryReadCount = 0;
let firstCompositeAt = 0;
let failureReason = '';
let lastSourceLightCount = 0;
let lastSampledEmitterCount = 0;
let lastCostMs = 0;
let costEmaMs = 0;
let costSampleIndex = 0;
let costSampleCount = 0;
let costSampleSum = 0;
let costSampleMax = 0;
const costSamples = new Float32Array(COST_SAMPLE_CAPACITY);

const ambientBalls = Array.from({ length: AMBIENT_COUNT }, (_, index) => ({
  x: 0,
  y: 0,
  r: 1,
  color: AMBIENT_COLOURS_LIGHT[index % AMBIENT_COLOURS_LIGHT.length],
  pebbleSeed: 7000 + index * 37,
  baseX: 0.08 + ((index * 0.317) % 0.84),
  baseY: 0.1 + ((index * 0.463) % 0.8),
  phase: index * 1.731,
}));

const effectRenderArgs = {
  sourceCanvas: null,
  config: null,
  dtMs: 0,
  qualityScale: 0.375,
  responsiveScale: 1,
  nowMs: 0,
};
const particleRenderArgs = {
  context: null,
  canvas: null,
  balls: null,
  mainCanvas: null,
  config: null,
  nowMs: 0,
  emitterStride: 1,
};

function getQualityById(id) {
  return QUALITY_LEVELS[id] || QUALITY_LEVELS.balanced;
}

function resolveQuality() {
  const resolved = resolveSimulationAtmosphereQualityScale(configuration.qualityMode);
  return getQualityById(resolved.id);
}

function resolveQuietZoneElement(source = activeSource) {
  const candidate = typeof source?.quietZoneElement === 'function'
    ? source.quietZoneElement()
    : source?.quietZoneElement;
  return candidate instanceof Element ? candidate : null;
}

function validateSource(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('Simulation atmosphere source must be an object.');
  }
  const id = String(definition.id || '').trim();
  const kind = String(definition.kind || '').trim();
  const scheduler = String(definition.scheduler || '').trim();
  if (!id) throw new TypeError('Simulation atmosphere source requires a stable id.');
  if (!SOURCE_KINDS.has(kind)) throw new TypeError(`Unsupported simulation atmosphere source kind: ${kind}`);
  if (!SOURCE_SCHEDULERS.has(scheduler)) {
    throw new TypeError(`Unsupported simulation atmosphere scheduler: ${scheduler}`);
  }
  if (kind === 'emitters' && scheduler !== 'external') {
    throw new TypeError('Emitter atmosphere sources must use the external scheduler.');
  }
  if (kind === 'ambient' && scheduler !== 'internal') {
    throw new TypeError('Ambient atmosphere sources must use the internal scheduler.');
  }
  if (kind === 'canvas' && scheduler === 'external') {
    throw new TypeError('Canvas atmosphere sources must use internal or renderer-coupled scheduling.');
  }
  if (kind === 'emitters' && typeof definition.getEmitters !== 'function') {
    throw new TypeError('Emitter atmosphere sources require getEmitters().');
  }
  if (kind !== 'ambient' && !(definition.canvas instanceof HTMLCanvasElement)) {
    throw new TypeError(`${kind} atmosphere sources require a canvas.`);
  }
  if (
    host
    && definition.canvas
    && (definition.canvas === host.glowCanvas || definition.canvas === host.edgeCanvas)
  ) {
    throw new TypeError('The atmosphere compositor cannot sample one of its output canvases.');
  }
  return { id, kind, scheduler };
}

function createFirstFrameDeferred() {
  let resolve = null;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve, settled: false };
}

function markSourceElement(source, active) {
  const candidate = source?.opacityElement || source?.canvas;
  const element = typeof candidate === 'function' ? candidate() : candidate;
  if (!(element instanceof HTMLElement)) return;
  if (active) {
    element.dataset.atmosphereSourceMaterial = 'true';
    element.dataset.atmosphereSourceGeneration = String(source.generation);
    return;
  }
  if (element.dataset.atmosphereSourceGeneration !== String(source.generation)) return;
  delete element.dataset.atmosphereSourceMaterial;
  delete element.dataset.atmosphereSourceGeneration;
}

function resetCostMetrics() {
  costSamples.fill(0);
  costSampleIndex = 0;
  costSampleCount = 0;
  costSampleSum = 0;
  costSampleMax = 0;
  lastCostMs = 0;
  costEmaMs = 0;
  overBudgetSamples = 0;
}

function recordCost(costMs) {
  const value = Math.max(0, Number(costMs) || 0);
  if (costSampleCount === COST_SAMPLE_CAPACITY) {
    costSampleSum -= costSamples[costSampleIndex];
  } else {
    costSampleCount += 1;
  }
  costSamples[costSampleIndex] = value;
  costSampleSum += value;
  costSampleIndex = (costSampleIndex + 1) % COST_SAMPLE_CAPACITY;
  costSampleMax = Math.max(costSampleMax, value);
  lastCostMs = value;
  costEmaMs = costEmaMs > 0 ? costEmaMs * 0.88 + value * 0.12 : value;
}

function clearOutput({ preservePresentation = false } = {}) {
  host?.effect?.clear();
  host?.edgeLight?.clear();
  if (host?.sourceContext) {
    host.sourceContext.clearRect(0, 0, host.sourceCanvas.width, host.sourceCanvas.height);
  }
  if (host?.maskContext) {
    host.maskContext.clearRect(0, 0, host.maskCanvas.width, host.maskCanvas.height);
  }
  clearCount += 1;
  lastEffectAt = 0;
  firstCompositeAt = 0;
  staticFrameDirty = true;
  if (!preservePresentation && host) {
    host.glowCanvas.hidden = true;
    host.edgeCanvas.hidden = true;
    host.root.dataset.atmosphereReady = 'false';
  }
}

function failOpen(reason, source = activeSource) {
  failureReason = String(reason?.message || reason || 'unknown compositor failure');
  if (source) {
    if (source.firstFrameTimeoutId) window.clearTimeout(source.firstFrameTimeoutId);
    source.firstFrameTimeoutId = 0;
    markSourceElement(source, false);
    if (!source.firstFrame.settled) {
      source.firstFrame.settled = true;
      source.firstFrame.resolve({ status: 'failed-open', generation: source.generation, reason: failureReason });
    }
  }
  cancelInternalFrame();
  clearOutput();
  if (host) {
    host.root.dataset.atmosphereStatus = 'failed-open';
    host.root.dataset.atmosphereActive = 'false';
  }
}

function rebuildProfile({ resetQuality = false } = {}) {
  themeMode = isDarkThemeDocument() ? 'dark' : 'light';
  if (resetQuality || configuration.qualityMode !== 'auto') dynamicQuality = resolveQuality();
  const nextProfile = resolveSimulationAtmosphereRenderProfile(configuration, themeMode);
  renderProfile = reducedMotion
    ? { ...nextProfile, driftSpeedPxPerSec: 0, turbulence: 0, particleShimmer: 0 }
    : nextProfile;
  if (dynamicQuality.id === 'low') renderProfile.diffusionPasses = 1;
  cadence = resolveSimulationAtmosphereCadence(configuration.hazeCadence);
  host?.edgeLight?.setQuality(dynamicQuality.id);
  geometryDirty = true;
  maskDirty = true;
  staticFrameDirty = true;
  applyPresentationState();
}

function applyPresentationState() {
  if (!host) return;
  const enabled = configuration.enabled && Boolean(activeSource) && !failureReason;
  const materialBlurPx = enabled && CSS_MATERIAL_BLUR_SUPPORTED
    ? Math.max(0, Math.min(3, Number(renderProfile?.materialBlurPx) || 0))
    : 0;
  const root = host.root;
  const presentationRoot = document.documentElement;
  root.dataset.atmosphereActive = String(enabled);
  root.dataset.atmosphereStatus = enabled ? (firstCompositeAt ? 'ready' : 'waiting-source') : 'idle';
  root.dataset.atmosphereMaterialBlurActive = String(materialBlurPx > 0);
  root.dataset.atmosphereMaterialFilter = materialBlurPx > 0 ? 'css-compositor' : 'none';
  presentationRoot.style.setProperty('--atmosphere-core-presence', String(renderProfile?.ballPresence ?? 1));
  presentationRoot.style.setProperty('--atmosphere-material-blur', `${materialBlurPx}px`);
  presentationRoot.style.setProperty('--atmosphere-haze-strength', String(renderProfile?.hazeStrength ?? 1));
  presentationRoot.style.setProperty('--atmosphere-grain-strength', String(renderProfile?.grainStrength ?? 1));
  presentationRoot.style.setProperty('--atmosphere-edge-width', `${renderProfile?.edgeWidthPx ?? 1.5}px`);
  if (!enabled) {
    markSourceElement(activeSource, false);
    host.glowCanvas.hidden = true;
    host.edgeCanvas.hidden = true;
  }
}

function refreshQuietZoneObservation() {
  if (!host?.resizeObserver) return;
  if (host.observedQuietZone) host.resizeObserver.unobserve(host.observedQuietZone);
  host.observedQuietZone = resolveQuietZoneElement();
  if (host.observedQuietZone) host.resizeObserver.observe(host.observedQuietZone);
}

function rebuildQuietZoneMask(rootRect) {
  if (!host || !maskDirty) return;
  const { maskCanvas, maskContext, sourceCanvas } = host;
  if (maskCanvas.width !== sourceCanvas.width) maskCanvas.width = sourceCanvas.width;
  if (maskCanvas.height !== sourceCanvas.height) maskCanvas.height = sourceCanvas.height;
  maskContext.setTransform(1, 0, 0, 1, 0, 0);
  maskContext.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

  const quietZone = resolveQuietZoneElement();
  if (!quietZone || renderProfile.titleClearance <= 0 || rootRect.width <= 0 || rootRect.height <= 0) {
    host.hasQuietZoneMask = false;
    maskDirty = false;
    return;
  }
  const quietRect = quietZone.getBoundingClientRect();
  quietZoneGeometryReadCount += 1;
  const scaleX = sourceCanvas.width / rootRect.width;
  const scaleY = sourceCanvas.height / rootRect.height;
  const centerX = (quietRect.left + quietRect.width * 0.5 - rootRect.left) * scaleX;
  const centerY = (quietRect.top + quietRect.height * 0.5 - rootRect.top) * scaleY;
  const radiusX = Math.max(1, (quietRect.width * 0.72 + 72) * scaleX);
  const radiusY = Math.max(1, (quietRect.height * 1.35 + 68) * scaleY);
  const removal = Math.min(1, 0.46 + renderProfile.titleClearance * 0.72);

  maskContext.save();
  maskContext.translate(centerX, centerY);
  maskContext.scale(radiusX, radiusY);
  const gradient = maskContext.createRadialGradient(0, 0, 0.08, 0, 0, 1);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${removal})`);
  gradient.addColorStop(0.38, `rgba(255, 255, 255, ${removal * 0.92})`);
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  maskContext.fillStyle = gradient;
  maskContext.fillRect(-1, -1, 2, 2);
  maskContext.restore();
  host.hasQuietZoneMask = true;
  maskDirty = false;
}

function syncGeometry() {
  if (!host) return false;
  if (!geometryDirty) return host.sourceCanvas.width > 1 && host.sourceCanvas.height > 1;
  cadence = resolveSimulationAtmosphereCadence(configuration.hazeCadence);
  if (configuration.qualityMode === 'auto') {
    const nextQuality = resolveQuality();
    if (nextQuality.id !== dynamicQuality.id) {
      dynamicQuality = nextQuality;
      renderProfile.diffusionPasses = dynamicQuality.id === 'low' ? 1 : 2;
      host.edgeLight.setQuality(dynamicQuality.id);
      resetCostMetrics();
      lastEffectAt = 0;
    }
  }
  const rect = host.root.getBoundingClientRect();
  geometryReadCount += 1;
  if (rect.width <= 1 || rect.height <= 1) return false;
  const shortestSide = Math.min(rect.width, rect.height);
  responsiveScale = Math.max(RESPONSIVE_MIN_SCALE, Math.min(1, shortestSide / RESPONSIVE_REFERENCE_PX));
  const width = Math.max(2, Math.round(rect.width * dynamicQuality.scale));
  const height = Math.max(2, Math.round(rect.height * dynamicQuality.scale));
  if (host.sourceCanvas.width !== width || host.sourceCanvas.height !== height) {
    host.sourceCanvas.width = width;
    host.sourceCanvas.height = height;
    host.effect.resize(width, height);
    maskDirty = true;
    lastEffectAt = 0;
  }
  host.edgeLight.resize(width, height);
  host.geometry.left = rect.left;
  host.geometry.top = rect.top;
  host.geometry.width = rect.width;
  host.geometry.height = rect.height;
  geometryDirty = false;
  rebuildQuietZoneMask(rect);
  return true;
}

function updateAmbientSource(nowMs) {
  const canvas = host.sourceCanvas;
  const shortest = Math.min(canvas.width, canvas.height);
  const colours = themeMode === 'dark' ? AMBIENT_COLOURS_DARK : AMBIENT_COLOURS_LIGHT;
  const time = reducedMotion ? 0 : nowMs * 0.000045;
  for (let index = 0; index < AMBIENT_COUNT; index += 1) {
    const ball = ambientBalls[index];
    const orbit = time + ball.phase;
    ball.x = (ball.baseX + Math.sin(orbit) * 0.035) * canvas.width;
    ball.y = (ball.baseY + Math.cos(orbit * 0.83) * 0.028) * canvas.height;
    ball.r = shortest * (0.026 + (index % 3) * 0.006);
    ball.color = colours[index % colours.length];
  }
  lastSampledEmitterCount = AMBIENT_COUNT;
  particleRenderArgs.context = host.sourceContext;
  particleRenderArgs.canvas = canvas;
  particleRenderArgs.balls = ambientBalls;
  particleRenderArgs.mainCanvas = canvas;
  particleRenderArgs.config = renderProfile;
  particleRenderArgs.nowMs = nowMs;
  particleRenderArgs.emitterStride = 1;
  lastSourceLightCount = host.particleLightSource.render(particleRenderArgs);
}

function copyCanvasSource(sourceCanvas) {
  const context = host.sourceContext;
  const canvas = host.sourceCanvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!sourceCanvas?.isConnected || sourceCanvas.width <= 1 || sourceCanvas.height <= 1) return false;
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  lastSourceLightCount = Math.max(0, Number(sourceCanvas.dataset.simulationBodyCount) || 0);
  lastSampledEmitterCount = 0;
  return true;
}

function copyEmitterSource(source, nowMs) {
  const emitters = source.getEmitters();
  const count = Array.isArray(emitters) ? emitters.length : 0;
  if (count === 0) return copyCanvasSource(source.canvas);
  const stride = Math.max(1, Math.ceil(count / dynamicQuality.emitterBudget));
  lastSampledEmitterCount = Math.ceil(count / stride);
  particleRenderArgs.context = host.sourceContext;
  particleRenderArgs.canvas = host.sourceCanvas;
  particleRenderArgs.balls = emitters;
  particleRenderArgs.mainCanvas = source.canvas;
  particleRenderArgs.config = renderProfile;
  particleRenderArgs.nowMs = nowMs;
  particleRenderArgs.emitterStride = stride;
  lastSourceLightCount = host.particleLightSource.render(particleRenderArgs);
  return true;
}

function copyActiveSource(nowMs) {
  if (!host || !activeSource) return false;
  if (activeSource.kind === 'ambient') {
    updateAmbientSource(nowMs);
    return true;
  }
  if (activeSource.kind === 'emitters') return copyEmitterSource(activeSource, nowMs);
  return copyCanvasSource(activeSource.canvas);
}

function applyQuietZoneMask() {
  if (!host?.hasQuietZoneMask) return;
  const context = host.sourceContext;
  context.globalCompositeOperation = 'destination-out';
  context.globalAlpha = 1;
  context.drawImage(host.maskCanvas, 0, 0);
  context.globalCompositeOperation = 'source-over';
}

function settleFirstFrame(source, now) {
  if (!source || source !== activeSource || source.firstFrame.settled) return;
  if (source.firstFrameTimeoutId) window.clearTimeout(source.firstFrameTimeoutId);
  source.firstFrameTimeoutId = 0;
  source.firstFrame.settled = true;
  source.firstFrame.resolve({ status: 'ready', generation: source.generation, at: now });
}

function maybeDowngradeQuality() {
  if (configuration.qualityMode !== 'auto' || dynamicQuality.id === 'low') return;
  const budget = dynamicQuality.id === 'balanced' ? 0.95 : 1.35;
  overBudgetSamples = costEmaMs > budget
    ? overBudgetSamples + 1
    : Math.max(0, overBudgetSamples - 2);
  if (overBudgetSamples < 18) return;
  dynamicQuality = dynamicQuality.id === 'high' ? QUALITY_LEVELS.balanced : QUALITY_LEVELS.low;
  renderProfile.diffusionPasses = dynamicQuality.id === 'low' ? 1 : 2;
  host?.edgeLight?.setQuality(dynamicQuality.id);
  overBudgetSamples = 0;
  geometryDirty = true;
  maskDirty = true;
  clearOutput();
}

function renderComposite(now) {
  if (!host || !activeSource || !configuration.enabled || document.hidden || failureReason) return false;
  if (transitionPhase !== 'idle' && activeSource.generation === transitionSourceGeneration) return false;
  if (reducedMotion && !staticFrameDirty) return false;
  if (!syncGeometry()) return false;
  if (maskDirty) {
    const geometry = host.geometry;
    rebuildQuietZoneMask(geometry);
  }
  const interval = 1000 / Math.max(1, cadence);
  if (!reducedMotion && lastEffectAt && now - lastEffectAt < interval) {
    skippedFrameCount += 1;
    return false;
  }
  const dtMs = reducedMotion ? interval : (lastEffectAt ? Math.min(120, now - lastEffectAt) : interval);
  lastEffectAt = now;
  const start = performance.now();
  if (!copyActiveSource(now)) return false;
  applyQuietZoneMask();
  effectRenderArgs.sourceCanvas = host.sourceCanvas;
  effectRenderArgs.config = renderProfile;
  effectRenderArgs.dtMs = dtMs;
  effectRenderArgs.qualityScale = dynamicQuality.scale;
  effectRenderArgs.responsiveScale = responsiveScale;
  effectRenderArgs.nowMs = now;
  host.effect.render(effectRenderArgs);
  host.edgeLight.render(host.glowCanvas, renderProfile.edgeLight);
  const costMs = performance.now() - start;
  recordCost(costMs);
  compositedFrameCount += 1;
  firstCompositeAt ||= now;
  consecutiveErrors = 0;
  staticFrameDirty = false;
  host.glowCanvas.hidden = false;
  host.edgeCanvas.hidden = transitionPhase !== 'idle' || renderProfile.edgeLight <= 0;
  host.root.dataset.atmosphereReady = 'true';
  host.root.dataset.atmosphereStatus = 'ready';
  settleFirstFrame(activeSource, now);
  maybeDowngradeQuality();
  return true;
}

function renderSafely(now) {
  try {
    return renderComposite(now);
  } catch (error) {
    consecutiveErrors += 1;
    if (consecutiveErrors >= 2) failOpen(error);
    return false;
  }
}

function internalFrame(now) {
  internalFrameId = 0;
  if (
    !activeSource
    || activeSource.scheduler !== 'internal'
    || !configuration.enabled
    || document.hidden
    || destroyed
  ) return;
  renderSafely(now);
  if (!reducedMotion || staticFrameDirty) scheduleInternalFrame();
}

function scheduleInternalFrame() {
  if (
    internalFrameId
    || !host
    || !activeSource
    || activeSource.scheduler !== 'internal'
    || !configuration.enabled
    || document.hidden
    || destroyed
    || failureReason
  ) return;
  internalFrameId = window.requestAnimationFrame(internalFrame);
}

function cancelInternalFrame() {
  if (!internalFrameId) return;
  window.cancelAnimationFrame(internalFrameId);
  internalFrameId = 0;
}

function activateCurrentSource() {
  if (!host || !activeSource) return;
  failureReason = '';
  consecutiveErrors = 0;
  geometryDirty = true;
  maskDirty = true;
  staticFrameDirty = true;
  lastEffectAt = 0;
  refreshQuietZoneObservation();
  rebuildProfile({ resetQuality: true });
  clearOutput();
  applyPresentationState();
  if (configuration.enabled) markSourceElement(activeSource, true);
  resetCostMetrics();
  if (configuration.enabled && !activeSource.firstFrame.settled && !activeSource.firstFrameTimeoutId) {
    const generation = activeSource.generation;
    activeSource.firstFrameTimeoutId = window.setTimeout(() => {
      if (activeSource?.generation !== generation || activeSource.firstFrame.settled) return;
      failOpen('source-first-frame-timeout', activeSource);
    }, FIRST_FRAME_TIMEOUT_MS);
  }
  if (configuration.enabled && activeSource.scheduler === 'internal') scheduleInternalFrame();
}

function deactivateSource(source, { preserveOutput = false } = {}) {
  if (!source) return;
  if (source.firstFrameTimeoutId) window.clearTimeout(source.firstFrameTimeoutId);
  source.firstFrameTimeoutId = 0;
  markSourceElement(source, false);
  if (!source.firstFrame.settled) {
    source.firstFrame.settled = true;
    source.firstFrame.resolve({ status: 'cancelled', generation: source.generation });
  }
  cancelInternalFrame();
  if (!preserveOutput) clearOutput();
}

function handleVisibilityChange() {
  if (document.hidden) {
    cancelInternalFrame();
    return;
  }
  lastEffectAt = 0;
  staticFrameDirty = true;
  if (activeSource?.scheduler === 'internal') scheduleInternalFrame();
}

function handleThemeChange() {
  rebuildProfile();
  clearOutput();
  if (activeSource?.scheduler === 'internal') scheduleInternalFrame();
}

function handleReducedMotionChange(event) {
  reducedMotion = event.matches === true;
  rebuildProfile();
  clearOutput();
  if (activeSource?.scheduler === 'internal') scheduleInternalFrame();
}

function computeCostP95() {
  if (costSampleCount === 0) return 0;
  const values = new Array(costSampleCount);
  for (let index = 0; index < costSampleCount; index += 1) values[index] = costSamples[index];
  values.sort((left, right) => left - right);
  return values[Math.min(values.length - 1, Math.round((values.length - 1) * 0.95))];
}

function getDiagnosticSnapshot() {
  return {
    status: failureReason ? 'failed-open' : (host?.root.dataset.atmosphereStatus || 'idle'),
    scope: host?.scope || 'production',
    routeId: activeSource?.routeId || '',
    activeSourceId: activeSource?.id || '',
    sourceKind: activeSource?.kind || '',
    sourceGeneration: activeSource?.generation || 0,
    activeSourceCount: activeSource ? 1 : 0,
    compositorCount: host ? 1 : 0,
    glowCanvasCount: host ? 1 : 0,
    edgeCanvasCount: host ? 1 : 0,
    glowCanvasId: host?.glowCanvas.id || '',
    edgeCanvasId: host?.edgeCanvas.id || '',
    edgeWidth: host?.edgeCanvas.width || 0,
    edgeHeight: host?.edgeCanvas.height || 0,
    scheduler: activeSource?.scheduler || '',
    schedulerActive: activeSource?.scheduler === 'internal' ? Boolean(internalFrameId) : Boolean(activeSource),
    internalRafCount: internalFrameId ? 1 : 0,
    cadence,
    quality: dynamicQuality.id,
    scale: dynamicQuality.scale,
    themeMode,
    reducedMotion,
    effectiveDrift: renderProfile?.driftSpeedPxPerSec || 0,
    materialBlurPx: getSimulationAtmosphereMaterialBlurPx(),
    materialFilterSupported: CSS_MATERIAL_BLUR_SUPPORTED,
    materialFilterStrategy: getSimulationAtmosphereMaterialBlurPx() > 0 ? 'css-compositor' : 'none',
    crispTitleCanvasCount: typeof document === 'undefined'
      ? 0
      : document.querySelectorAll('#simulation-crisp-title-canvas').length,
    outputWidth: host?.glowCanvas.width || 0,
    outputHeight: host?.glowCanvas.height || 0,
    compositedFrameCount,
    skippedFrameCount,
    sourceSwitchCount,
    clearCount,
    staleCleanupCount,
    geometryReadCount,
    quietZoneGeometryReadCount,
    sampledEmitterCount: lastSampledEmitterCount,
    sourceLightCount: lastSourceLightCount,
    emitterBudget: dynamicQuality.emitterBudget,
    firstCompositeAt,
    cost: {
      sampleCount: costSampleCount,
      meanMs: costSampleCount ? costSampleSum / costSampleCount : 0,
      emaMs: costEmaMs,
      p95Ms: computeCostP95(),
      maxMs: costSampleMax,
      lastMs: lastCostMs,
    },
    failOpenReason: failureReason,
    transitioning: transitionPhase !== 'idle',
  };
}

function installDiagnosticHandle() {
  window.__ABS_SIMULATION_ATMOSPHERE__ = Object.freeze({
    getSnapshot: getDiagnosticSnapshot,
    invalidateGeometry: invalidateSimulationAtmosphereGeometry,
  });
}

export function attachSimulationAtmosphereHost({ root, glowCanvas, edgeCanvas, scope = 'production' }) {
  if (!(root instanceof HTMLElement)) throw new TypeError('Simulation atmosphere host requires a root element.');
  if (!(glowCanvas instanceof HTMLCanvasElement) || !(edgeCanvas instanceof HTMLCanvasElement)) {
    throw new TypeError('Simulation atmosphere host requires stable glow and edge canvases.');
  }
  if (host?.root === root && host.glowCanvas === glowCanvas && host.edgeCanvas === edgeCanvas) {
    return host.detach;
  }
  host?.detach?.();
  const generation = ++hostGeneration;
  const sourceCanvas = document.createElement('canvas');
  const maskCanvas = document.createElement('canvas');
  const sourceContext = sourceCanvas.getContext('2d', { alpha: true, desynchronized: true });
  const maskContext = maskCanvas.getContext('2d', { alpha: true });
  if (!sourceContext || !maskContext) throw new Error('Simulation atmosphere source contexts unavailable.');
  const effect = new CanvasFeedbackEffect(glowCanvas);
  const edgeLight = new AtmosphereEdgeLight(edgeCanvas);
  const particleLightSource = new ParticleLightSource();
  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => invalidateSimulationAtmosphereGeometry('resize-observer'))
    : null;
  const reducedMotionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  reducedMotion = reducedMotionQuery?.matches === true;
  destroyed = false;
  host = {
    generation,
    root,
    glowCanvas,
    edgeCanvas,
    sourceCanvas,
    sourceContext,
    maskCanvas,
    maskContext,
    effect,
    edgeLight,
    particleLightSource,
    resizeObserver,
    reducedMotionQuery,
    observedQuietZone: null,
    hasQuietZoneMask: false,
    geometry: { left: 0, top: 0, width: 0, height: 0 },
    scope,
    detach: null,
  };
  resizeObserver?.observe(root);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
  reducedMotionQuery?.addEventListener?.('change', handleReducedMotionChange);
  glowCanvas.hidden = true;
  edgeCanvas.hidden = true;
  installDiagnosticHandle();
  rebuildProfile({ resetQuality: true });
  resetCostMetrics();

  const detach = () => {
    if (!host || host.generation !== generation) return;
    destroyed = true;
    cancelInternalFrame();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    reducedMotionQuery?.removeEventListener?.('change', handleReducedMotionChange);
    resizeObserver?.disconnect();
    markSourceElement(activeSource, false);
    edgeLight.destroy();
    effect.destroy();
    particleLightSource.destroy();
    glowCanvas.hidden = true;
    edgeCanvas.hidden = true;
    document.documentElement.style.removeProperty('--atmosphere-core-presence');
    document.documentElement.style.removeProperty('--atmosphere-material-blur');
    document.documentElement.style.removeProperty('--atmosphere-haze-strength');
    document.documentElement.style.removeProperty('--atmosphere-grain-strength');
    document.documentElement.style.removeProperty('--atmosphere-edge-width');
    delete root.dataset.atmosphereActive;
    delete root.dataset.atmosphereReady;
    delete root.dataset.atmosphereStatus;
    delete root.dataset.atmosphereMaterialBlurActive;
    delete root.dataset.atmosphereMaterialFilter;
    if (window.__ABS_SIMULATION_ATMOSPHERE__) delete window.__ABS_SIMULATION_ATMOSPHERE__;
    host = null;
  };
  host.detach = detach;
  if (activeSource) activateCurrentSource();
  return detach;
}

export function setSimulationAtmosphereConfig(nextConfig) {
  configuration = normalizeSimulationAtmosphereConfig(nextConfig);
  failureReason = '';
  rebuildProfile({ resetQuality: true });
  clearOutput();
  if (!configuration.enabled) {
    markSourceElement(activeSource, false);
    cancelInternalFrame();
  } else {
    markSourceElement(activeSource, true);
    if (activeSource?.scheduler === 'internal') scheduleInternalFrame();
  }
  return configuration;
}

export function getSimulationAtmosphereConfig() {
  return normalizeSimulationAtmosphereConfig(configuration);
}

export function registerSimulationAtmosphereSource(definition) {
  const normalized = validateSource(definition);
  const generation = ++sourceGeneration;
  const firstFrame = createFirstFrameDeferred();
  const source = {
    ...definition,
    ...normalized,
    routeId: String(definition.routeId || ''),
    quietZoneElement: definition.quietZoneElement || definition.getQuietZoneElement || null,
    opacityElement: definition.opacityElement || definition.materialElement || null,
    generation,
    firstFrame,
    firstFrameTimeoutId: 0,
  };
  const previous = activeSource;
  activeSource = source;
  sourceSwitchCount += previous ? 1 : 0;
  if (previous) deactivateSource(previous, { preserveOutput: transitionPhase !== 'idle' });
  activateCurrentSource();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    if (activeSource?.generation !== generation) {
      staleCleanupCount += 1;
      markSourceElement(source, false);
      return;
    }
    const preserveOutput = transitionPhase !== 'idle';
    deactivateSource(source, { preserveOutput });
    activeSource = null;
    if (preserveOutput && host) {
      host.root.dataset.atmosphereStatus = 'frozen';
      host.edgeCanvas.hidden = true;
    } else {
      refreshQuietZoneObservation();
      applyPresentationState();
      if (host) host.root.dataset.atmosphereStatus = 'waiting-source';
    }
  };
  cleanup.generation = generation;
  cleanup.firstFrame = firstFrame.promise;
  cleanup.sourceId = source.id;
  return cleanup;
}

export function tickSimulationAtmosphere(now = performance.now(), sourceId = '') {
  if (!activeSource || !host) return false;
  if (sourceId && sourceId !== activeSource.id) return false;
  if (activeSource.scheduler === 'internal') return false;
  return renderSafely(Number(now) || performance.now());
}

export function invalidateSimulationAtmosphereGeometry() {
  geometryDirty = true;
  maskDirty = true;
  staticFrameDirty = true;
  if (activeSource?.scheduler === 'internal') scheduleInternalFrame();
}

export function setSimulationAtmosphereTransitionState(phase = 'idle') {
  const nextPhase = String(phase || 'idle');
  if (transitionPhase === 'idle' && nextPhase !== 'idle') {
    transitionSourceGeneration = activeSource?.generation || 0;
  }
  transitionPhase = nextPhase;
  if (!host) return;
  if (transitionPhase !== 'idle') {
    cancelInternalFrame();
    host.edgeCanvas.hidden = true;
    return;
  }
  transitionSourceGeneration = 0;
  if (!activeSource) {
    clearOutput();
    refreshQuietZoneObservation();
    applyPresentationState();
    host.root.dataset.atmosphereStatus = 'waiting-source';
    return;
  }
  host.edgeCanvas.hidden = !firstCompositeAt || renderProfile.edgeLight <= 0;
  staticFrameDirty = true;
  if (activeSource.scheduler === 'internal') scheduleInternalFrame();
}

export function getSimulationAtmosphereSnapshot() {
  return getDiagnosticSnapshot();
}

export function isSimulationAtmosphereActive() {
  return Boolean(host && activeSource && configuration.enabled && !failureReason);
}

export function getSimulationAtmosphereMaterialOpacity() {
  return isSimulationAtmosphereActive()
    ? Math.max(0, Math.min(1, Number(renderProfile?.ballPresence) || 0))
    : 1;
}

export function getSimulationAtmosphereMaterialBlurPx() {
  if (!CSS_MATERIAL_BLUR_SUPPORTED || !isSimulationAtmosphereActive()) return 0;
  return Math.max(0, Math.min(3, Number(renderProfile?.materialBlurPx) || 0));
}
