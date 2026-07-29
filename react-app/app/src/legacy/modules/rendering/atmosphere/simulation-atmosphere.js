import { THEME_CHANGE_EVENT, isDarkThemeDocument } from '../../../../lib/theme-state.js';
import {
  createSimulationMaterialSequence,
  getSimulationPaletteSnapshot,
  subscribeSimulationPalette,
} from '../../../../palette/simulationPaletteController.js';
import { AtmosphereEdgeLight } from './atmosphere-edge-light.js';
import { DiffuseGlowEffect } from './diffuse-glow-effect.js';
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
const GLOW_RADIUS_MIN_CSS_PX = 36;
const GLOW_RADIUS_MAX_CSS_PX = 180;
const SMALL_GLOW_RADIUS_MIN_CSS_PX = 12;
const SMALL_GLOW_RADIUS_MAX_CSS_PX = 72;
const AMBIENT_COUNT = 8;

let host = null;
let hostGeneration = 0;
let activeSource = null;
let sourceGeneration = 0;
let replacementTransaction = null;
let activeSourceGeneration = 0;
let outputSourceGeneration = 0;
let resetSourceGeneration = 0;
let firstCompositeGeneration = 0;
let outputTransactionId = '';
let outputResetCount = 0;
let sourceUnregisterCount = 0;
let configuration = normalizeSimulationAtmosphereConfig(DEFAULT_SIMULATION_ATMOSPHERE_CONFIG);
let themeMode = 'light';
let transitionPhase = 'idle';
let simulationSwitchPhase = 'idle';
let transitionSourceGeneration = 0;
let internalFrameId = 0;
let geometryDirty = true;
let maskDirty = true;
let staticFrameDirty = true;
let lastEffectAt = 0;
let renderProfile = null;
let dynamicQuality = QUALITY_LEVELS.balanced;
let pendingQuality = null;
let cadence = 30;
let responsiveScale = 1;
let resolvedGlowRadiusCss = 0;
let smallResponsiveScale = 1;
let resolvedSmallGlowRadiusCss = 0;
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
let ambientPaletteSnapshot = getSimulationPaletteSnapshot();
let ambientColours = createSimulationMaterialSequence(
  AMBIENT_COUNT,
  {},
  ambientPaletteSnapshot,
).map((role) => ambientPaletteSnapshot.colors[role.colorIndex]);
let lastSourceLightCount = 0;
let lastSourceLayerCount = 0;
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
  color: ambientColours[index % ambientColours.length],
  pebbleSeed: 7000 + index * 37,
  baseX: 0.08 + ((index * 0.317) % 0.84),
  baseY: 0.1 + ((index * 0.463) % 0.8),
  phase: index * 1.731,
}));

const effectRenderArgs = {
  sourceCanvas: null,
  maskCanvas: null,
  config: null,
};
const resolvedCanvasLayers = [];

function getQualityById(id) {
  return QUALITY_LEVELS[id] || QUALITY_LEVELS.balanced;
}

function resolveQuality() {
  const resolved = resolveSimulationAtmosphereQualityScale('auto');
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

function normalizeTransactionId(value) {
  return String(value || '').trim();
}

function createReplacementDeferred() {
  let resolve = null;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve, settled: false };
}

function isReplacementCurrent(transactionId) {
  return Boolean(
    replacementTransaction
    && replacementTransaction.transactionId === normalizeTransactionId(transactionId)
  );
}

function maybeSettleReplacementReadiness() {
  const replacement = replacementTransaction;
  if (
    !replacement
    || replacement.readiness.settled
    || !replacement.committed
    || !replacement.armed
    || !replacement.targetFrameReady
    || (!replacement.firstCompositeReady && !replacement.degraded)
  ) return;
  replacement.readiness.settled = true;
  replacement.readiness.resolve(Object.freeze({
    status: replacement.degraded ? 'degraded' : 'ready',
    transactionId: replacement.transactionId,
    targetSimulationId: replacement.targetSimulationId,
    generation: replacement.generation,
    targetFrameReady: true,
    firstCompositeReady: replacement.firstCompositeReady,
    reason: replacement.degradedReason || '',
  }));
}

function markReplacementDegraded(source, reason) {
  const replacement = replacementTransaction;
  if (!replacement || source?.generation !== replacement.generation) return;
  replacement.degraded = true;
  replacement.degradedReason = String(reason || 'atmosphere-failed-open');
  maybeSettleReplacementReadiness();
}

function createReplacementHandle(replacement) {
  return Object.freeze({
    transactionId: replacement.transactionId,
    targetSimulationId: replacement.targetSimulationId,
    targetSourceRouteId: replacement.targetSourceRouteId,
    generation: replacement.generation,
  });
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
  outputSourceGeneration = 0;
  firstCompositeGeneration = 0;
  outputTransactionId = '';
  staticFrameDirty = true;
  if (!preservePresentation && host) {
    host.glowCanvas.hidden = true;
    host.edgeCanvas.hidden = true;
    host.root.dataset.atmosphereReady = 'false';
    host.root.dataset.atmosphereStatus = configuration.enabled && activeSource && !failureReason
      ? 'waiting-source'
      : 'idle';
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
    markReplacementDegraded(source, failureReason);
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
  if (resetQuality) {
    dynamicQuality = resolveQuality();
    pendingQuality = null;
  }
  renderProfile = resolveSimulationAtmosphereRenderProfile(configuration, themeMode);
  cadence = resolveSimulationAtmosphereCadence('auto');
  host?.edgeLight?.setQuality(dynamicQuality.id);
  geometryDirty = true;
  maskDirty = true;
  staticFrameDirty = true;
  applyPresentationState();
}

function applyPresentationState() {
  if (!host) return;
  const enabled = configuration.enabled && Boolean(activeSource) && !failureReason;
  const root = host.root;
  root.dataset.atmosphereActive = String(enabled);
  root.dataset.atmosphereStatus = enabled ? (firstCompositeAt ? 'ready' : 'waiting-source') : 'idle';
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
  if (!quietZone || renderProfile.contentClearance <= 0 || rootRect.width <= 0 || rootRect.height <= 0) {
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
  const clearance = renderProfile.contentClearance;
  const paddingCss = resolvedGlowRadiusCss * (0.3 + clearance * 0.7);
  const radiusX = Math.max(1, (quietRect.width * 0.5 + paddingCss) * scaleX);
  const radiusY = Math.max(1, (quietRect.height * 0.5 + paddingCss) * scaleY);
  const removal = Math.min(1, 0.2 + clearance * 0.8);

  maskContext.save();
  maskContext.translate(centerX, centerY);
  maskContext.scale(radiusX, radiusY);
  const gradient = maskContext.createRadialGradient(0, 0, 0.08, 0, 0, 1);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${removal})`);
  gradient.addColorStop(0.46, `rgba(255, 255, 255, ${removal * 0.92})`);
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
  cadence = resolveSimulationAtmosphereCadence('auto');
  const nextQuality = resolveQuality();
  if (nextQuality.id !== dynamicQuality.id) {
    dynamicQuality = nextQuality;
    host.edgeLight.setQuality(dynamicQuality.id);
    resetCostMetrics();
    lastEffectAt = 0;
  }
  const rect = host.root.getBoundingClientRect();
  geometryReadCount += 1;
  if (rect.width <= 1 || rect.height <= 1) return false;
  const shortestSide = Math.min(rect.width, rect.height);
  resolvedGlowRadiusCss = Math.max(
    GLOW_RADIUS_MIN_CSS_PX,
    Math.min(GLOW_RADIUS_MAX_CSS_PX, shortestSide * renderProfile.largeSpread),
  );
  responsiveScale = resolvedGlowRadiusCss / shortestSide;
  resolvedSmallGlowRadiusCss = Math.max(
    SMALL_GLOW_RADIUS_MIN_CSS_PX,
    Math.min(SMALL_GLOW_RADIUS_MAX_CSS_PX, shortestSide * renderProfile.smallSpread),
  );
  smallResponsiveScale = resolvedSmallGlowRadiusCss / shortestSide;
  const width = Math.max(2, Math.round(rect.width * dynamicQuality.scale));
  const height = Math.max(2, Math.round(rect.height * dynamicQuality.scale));
  if (host.sourceCanvas.width !== width || host.sourceCanvas.height !== height) {
    host.sourceCanvas.width = width;
    host.sourceCanvas.height = height;
    host.effect.resize(width, height);
    maskDirty = true;
    lastEffectAt = 0;
  }
  const backingScaleX = width / rect.width;
  const backingScaleY = height / rect.height;
  const backingScale = Math.sqrt(backingScaleX * backingScaleY);
  renderProfile.largeBlurRadiusBackingPx = resolvedGlowRadiusCss * backingScale;
  renderProfile.smallBlurRadiusBackingPx = resolvedSmallGlowRadiusCss * backingScale;
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
  const time = reducedMotion ? 0 : nowMs * 0.000045;
  for (let index = 0; index < AMBIENT_COUNT; index += 1) {
    const ball = ambientBalls[index];
    const orbit = time + ball.phase;
    ball.x = (ball.baseX + Math.sin(orbit) * 0.035) * canvas.width;
    ball.y = (ball.baseY + Math.cos(orbit * 0.83) * 0.028) * canvas.height;
    ball.r = shortest * (0.026 + (index % 3) * 0.006);
    ball.color = ambientColours[index % ambientColours.length];
  }
  lastSourceLayerCount = 0;
  lastSourceLightCount = renderEmitterDiscs(ambientBalls, canvas, 1);
}

function renderEmitterDiscs(emitters, mainCanvas, emitterStride = 1) {
  const context = host.sourceContext;
  const canvas = host.sourceCanvas;
  const count = Array.isArray(emitters) ? emitters.length : 0;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (count === 0 || !mainCanvas) return 0;

  const scaleX = canvas.width / Math.max(1, mainCanvas.width);
  const scaleY = canvas.height / Math.max(1, mainCanvas.height);
  const radiusScale = Math.sqrt(scaleX * scaleY);
  const stride = Math.max(1, Math.round(Number(emitterStride) || 1));
  let rendered = 0;
  for (let index = 0; index < count; index += stride) {
    const emitter = emitters[index];
    const radius = typeof emitter?.getDisplayRadius === 'function'
      ? emitter.getDisplayRadius()
      : Number(emitter?.r || 0);
    if (!Number.isFinite(emitter?.x) || !Number.isFinite(emitter?.y) || radius <= 0) continue;
    context.fillStyle = String(emitter.color || '#ffffff');
    context.beginPath();
    context.arc(emitter.x * scaleX, emitter.y * scaleY, Math.max(0.5, radius * radiusScale), 0, Math.PI * 2);
    context.fill();
    rendered += 1;
  }
  lastSampledEmitterCount = rendered;
  return rendered;
}

function resolveCanvasLayers(source) {
  const candidates = typeof source?.getCanvasLayers === 'function'
    ? source.getCanvasLayers()
    : source?.canvasLayers;
  resolvedCanvasLayers.length = 0;
  const layerCount = Array.isArray(candidates) ? candidates.length : 1;
  for (let index = 0; index < layerCount; index += 1) {
    const canvas = Array.isArray(candidates) ? candidates[index] : source?.canvas;
    if (!(canvas instanceof HTMLCanvasElement) || !canvas.isConnected) continue;
    if (
      canvas.width <= 1
      || canvas.height <= 1
      || resolvedCanvasLayers.includes(canvas)
    ) continue;
    resolvedCanvasLayers.push(canvas);
  }
  return resolvedCanvasLayers;
}

function copyCanvasSource(source) {
  const context = host.sourceContext;
  const canvas = host.sourceCanvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalAlpha = 1;
  context.globalCompositeOperation = 'source-over';
  context.filter = 'none';
  context.clearRect(0, 0, canvas.width, canvas.height);
  const layers = resolveCanvasLayers(source);
  lastSourceLayerCount = layers.length;
  if (layers.length === 0) return false;
  for (let index = 0; index < layers.length; index += 1) {
    context.drawImage(layers[index], 0, 0, canvas.width, canvas.height);
  }
  lastSourceLightCount = Math.max(0, Number(source.canvas?.dataset.simulationBodyCount) || 0);
  lastSampledEmitterCount = 0;
  return true;
}

function copyEmitterSource(source, nowMs) {
  const emitters = source.getEmitters();
  const count = Array.isArray(emitters) ? emitters.length : 0;
  if (count === 0) return copyCanvasSource(source);
  lastSourceLayerCount = 0;
  const stride = Math.max(1, Math.ceil(count / dynamicQuality.emitterBudget));
  lastSourceLightCount = renderEmitterDiscs(emitters, source.canvas, stride);
  return true;
}

function copyActiveSource(nowMs) {
  if (!host || !activeSource) return false;
  if (activeSource.kind === 'ambient') {
    updateAmbientSource(nowMs);
    return true;
  }
  if (activeSource.kind === 'emitters') return copyEmitterSource(activeSource, nowMs);
  return copyCanvasSource(activeSource);
}

function settleFirstFrame(source, now) {
  if (!source || source !== activeSource || source.firstFrame.settled) return;
  if (source.firstFrameTimeoutId) window.clearTimeout(source.firstFrameTimeoutId);
  source.firstFrameTimeoutId = 0;
  source.firstFrame.settled = true;
  source.firstFrame.resolve({ status: 'ready', generation: source.generation, at: now });
  outputSourceGeneration = source.generation;
  outputTransactionId = source.transactionId || '';
  firstCompositeGeneration = source.generation;
  const replacement = replacementTransaction;
  if (replacement?.generation === source.generation) {
    replacement.firstCompositeReady = true;
    maybeSettleReplacementReadiness();
  }
}

function maybeDowngradeQuality() {
  if (dynamicQuality.id === 'low' || pendingQuality) return;
  const budget = dynamicQuality.id === 'balanced' ? 0.95 : 1.35;
  overBudgetSamples = costEmaMs > budget
    ? overBudgetSamples + 1
    : Math.max(0, overBudgetSamples - 2);
  if (overBudgetSamples < 18) return;
  pendingQuality = dynamicQuality.id === 'high' ? QUALITY_LEVELS.balanced : QUALITY_LEVELS.low;
  overBudgetSamples = 0;
}

function applyPendingQuality() {
  if (!pendingQuality) return;
  dynamicQuality = pendingQuality;
  pendingQuality = null;
  host?.edgeLight?.setQuality(dynamicQuality.id);
  geometryDirty = true;
  maskDirty = true;
  staticFrameDirty = true;
  lastEffectAt = 0;
}

function renderComposite(now) {
  if (!host || !activeSource || !configuration.enabled || document.hidden || failureReason) return false;
  if (activeSource.requiresRealFrame && !activeSource.realFrameReady) return false;
  if (
    replacementTransaction?.generation === activeSource.generation
    && !replacementTransaction.armed
  ) return false;
  if (transitionPhase !== 'idle' && activeSource.generation === transitionSourceGeneration) return false;
  if (reducedMotion && !staticFrameDirty) return false;
  applyPendingQuality();
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
  lastEffectAt = now;
  const start = performance.now();
  if (!copyActiveSource(now)) return false;
  effectRenderArgs.sourceCanvas = host.sourceCanvas;
  effectRenderArgs.maskCanvas = host.hasQuietZoneMask ? host.maskCanvas : null;
  effectRenderArgs.config = renderProfile;
  host.effect.render(effectRenderArgs);
  host.edgeLight.render(host.glowCanvas, renderProfile.edgeStrength);
  const costMs = performance.now() - start;
  recordCost(costMs);
  compositedFrameCount += 1;
  firstCompositeAt ||= now;
  consecutiveErrors = 0;
  staticFrameDirty = false;
  host.glowCanvas.hidden = false;
  host.edgeCanvas.hidden = transitionPhase !== 'idle' || renderProfile.edgeStrength <= 0;
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

function activateCurrentSource({ resetOutput = true } = {}) {
  if (!activeSource) return;
  if (!host) {
    if (
      replacementTransaction?.generation === activeSource.generation
      && replacementTransaction.armed
    ) markReplacementDegraded(activeSource, 'atmosphere-host-unavailable');
    return;
  }
  failureReason = '';
  consecutiveErrors = 0;
  geometryDirty = true;
  maskDirty = true;
  staticFrameDirty = true;
  lastEffectAt = 0;
  refreshQuietZoneObservation();
  rebuildProfile({ resetQuality: true });
  if (resetOutput) clearOutput();
  applyPresentationState();
  if (configuration.enabled) markSourceElement(activeSource, true);
  resetCostMetrics();
  const replacement = replacementTransaction;
  const canStartFirstFrameTimeout = replacement?.generation !== activeSource.generation
    || replacement.armed;
  if (configuration.enabled && canStartFirstFrameTimeout) armSourceFirstFrameTimeout(activeSource);
  if (!configuration.enabled && replacement?.generation === activeSource.generation && replacement.armed) {
    markReplacementDegraded(activeSource, 'atmosphere-disabled');
  }
  if (configuration.enabled && activeSource.scheduler === 'internal') scheduleInternalFrame();
}

function armSourceFirstFrameTimeout(source) {
  if (!source || source !== activeSource || source.firstFrame.settled || source.firstFrameTimeoutId) return;
  const generation = source.generation;
  source.firstFrameTimeoutId = window.setTimeout(() => {
    if (activeSource?.generation !== generation || source.firstFrame.settled) return;
    failOpen('source-first-frame-timeout', source);
  }, FIRST_FRAME_TIMEOUT_MS);
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
    transactionId: replacementTransaction?.transactionId || activeSource?.transactionId || '',
    activeSourceGeneration,
    outputSourceGeneration,
    resetSourceGeneration,
    firstCompositeGeneration,
    outputTransactionId,
    outputResetCount,
    sourceUnregisterCount,
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
    responsiveScale,
    smallResponsiveScale,
    themeMode,
    paletteGeneration: ambientPaletteSnapshot.generation,
    paletteId: ambientPaletteSnapshot.paletteId,
    reducedMotion,
    temporalMemoryFrames: 0,
    resolvedGlowRadiusCss,
    resolvedSmallGlowRadiusCss,
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
    sourceLayerCount: lastSourceLayerCount,
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
    simulationSwitchPhase,
  };
}

function installDiagnosticHandle() {
  window.__ABS_SIMULATION_ATMOSPHERE__ = Object.freeze({
    getSnapshot: getDiagnosticSnapshot,
    invalidateGeometry: invalidateSimulationAtmosphereGeometry,
    prepareReplacement: prepareSimulationAtmosphereReplacement,
    prepareRollback: prepareSimulationAtmosphereRollback,
    commitReplacement: commitSimulationAtmosphereReplacement,
    armReplacement: armSimulationAtmosphereReplacement,
    waitUntilReady: waitForSimulationAtmosphereReady,
    settleReplacement: settleSimulationAtmosphereReplacement,
    rollbackReplacement: rollbackSimulationAtmosphereReplacement,
    setSwitchPhase: setSimulationAtmosphereSwitchPhase,
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
  const effect = new DiffuseGlowEffect(glowCanvas);
  const edgeLight = new AtmosphereEdgeLight(edgeCanvas);
  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => invalidateSimulationAtmosphereGeometry('resize-observer'))
    : null;
  const reducedMotionQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
  const unsubscribePalette = subscribeSimulationPalette((snapshot) => {
    ambientPaletteSnapshot = snapshot;
    ambientColours = createSimulationMaterialSequence(AMBIENT_COUNT, {}, snapshot)
      .map((role) => snapshot.colors[role.colorIndex]);
    staticFrameDirty = true;
    root.dataset.simulationPaletteGeneration = String(snapshot.generation);
    if (host && activeSource?.kind === 'ambient') scheduleInternalFrame();
  });
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
    resizeObserver,
    reducedMotionQuery,
    unsubscribePalette,
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
    unsubscribePalette();
    resizeObserver?.disconnect();
    markSourceElement(activeSource, false);
    edgeLight.destroy();
    effect.destroy();
    glowCanvas.hidden = true;
    edgeCanvas.hidden = true;
    delete root.dataset.atmosphereActive;
    delete root.dataset.atmosphereReady;
    delete root.dataset.atmosphereStatus;
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

/**
 * Reserve the next compositor generation without touching the active source or
 * its output. The route coordinator owns the returned transaction id.
 */
export function prepareSimulationAtmosphereReplacement({
  transactionId,
  targetSimulationId,
  targetSourceRouteId = '',
  reuseActiveDefinition = false,
} = {}) {
  const id = normalizeTransactionId(transactionId);
  const targetId = String(targetSimulationId || '').trim();
  if (!id || !targetId) {
    throw new TypeError('Atmosphere replacement requires transactionId and targetSimulationId.');
  }
  if (isReplacementCurrent(id)) return createReplacementHandle(replacementTransaction);

  const previous = replacementTransaction;
  if (previous && !previous.readiness.settled) {
    previous.readiness.settled = true;
    previous.readiness.resolve(Object.freeze({
      status: 'cancelled',
      transactionId: previous.transactionId,
      targetSimulationId: previous.targetSimulationId,
      generation: previous.generation,
    }));
  }
  replacementTransaction = {
    transactionId: id,
    targetSimulationId: targetId,
    targetSourceRouteId: String(
      targetSourceRouteId || (reuseActiveDefinition ? activeSource?.routeId : '') || targetId,
    ),
    reuseActiveDefinition: reuseActiveDefinition === true,
    generation: ++sourceGeneration,
    committed: false,
    armed: false,
    targetFrameReady: false,
    firstCompositeReady: false,
    degraded: false,
    degradedReason: '',
    resetApplied: false,
    readiness: createReplacementDeferred(),
  };
  return createReplacementHandle(replacementTransaction);
}

/** Reserve a fresh generation for the previous runtime after a committed failure. */
export function prepareSimulationAtmosphereRollback({
  transactionId,
  targetSimulationId,
  targetSourceRouteId = '',
  reuseActiveDefinition = false,
} = {}) {
  const id = normalizeTransactionId(transactionId);
  const targetId = String(targetSimulationId || '').trim();
  if (!id || !targetId || !isReplacementCurrent(id)) return false;
  const failedTarget = replacementTransaction;
  if (!failedTarget.readiness.settled) {
    failedTarget.readiness.settled = true;
    failedTarget.readiness.resolve(Object.freeze({
      status: 'cancelled',
      transactionId: failedTarget.transactionId,
      targetSimulationId: failedTarget.targetSimulationId,
      generation: failedTarget.generation,
      reason: 'rollback-prepared',
    }));
  }
  replacementTransaction = {
    transactionId: id,
    targetSimulationId: targetId,
    targetSourceRouteId: String(
      targetSourceRouteId || (reuseActiveDefinition ? activeSource?.routeId : '') || targetId,
    ),
    reuseActiveDefinition: reuseActiveDefinition === true,
    generation: ++sourceGeneration,
    committed: false,
    armed: false,
    rollback: true,
    targetFrameReady: false,
    firstCompositeReady: false,
    degraded: false,
    degradedReason: '',
    resetApplied: false,
    readiness: createReplacementDeferred(),
  };
  return createReplacementHandle(replacementTransaction);
}

/** Remove the outgoing source and reset compositor output exactly once. */
export function commitSimulationAtmosphereReplacement({ transactionId } = {}) {
  if (!isReplacementCurrent(transactionId)) return false;
  const replacement = replacementTransaction;
  if (replacement.committed) return createReplacementHandle(replacement);
  replacement.committed = true;
  let reusableDefinition = null;
  let reusableOwner = null;
  if (activeSource && activeSource.generation !== replacement.generation) {
    const outgoing = activeSource;
    if (
      replacement.reuseActiveDefinition
      && outgoing.routeId === replacement.targetSourceRouteId
    ) {
      reusableDefinition = outgoing.definition;
      reusableOwner = outgoing.owner;
    }
    activeSource = null;
    activeSourceGeneration = 0;
    sourceUnregisterCount += 1;
    sourceSwitchCount += 1;
    deactivateSource(outgoing, { preserveOutput: true });
  }
  if (!replacement.resetApplied) {
    replacement.resetApplied = true;
    outputResetCount += 1;
    resetSourceGeneration = replacement.generation;
    outputSourceGeneration = 0;
    firstCompositeGeneration = 0;
    outputTransactionId = '';
    clearOutput();
  }
  refreshQuietZoneObservation();
  applyPresentationState();
  if (reusableDefinition && reusableOwner && !reusableOwner.cleaned) {
    registerSimulationAtmosphereSource({
      ...reusableDefinition,
      transactionId: replacement.transactionId,
      requireRealFrame: true,
      sourceOwner: reusableOwner,
    });
  }
  return createReplacementHandle(replacement);
}

/** Arm the prime barrier after the target runtime has initialized. */
export function armSimulationAtmosphereReplacement({ transactionId } = {}) {
  if (!isReplacementCurrent(transactionId) || !replacementTransaction.committed) return false;
  replacementTransaction.armed = true;
  staticFrameDirty = true;
  if (!host) {
    markReplacementDegraded(activeSource, 'atmosphere-host-unavailable');
  } else if (!configuration.enabled) {
    markReplacementDegraded(activeSource, 'atmosphere-disabled');
  } else {
    armSourceFirstFrameTimeout(activeSource);
  }
  if (activeSource?.scheduler === 'internal') scheduleInternalFrame();
  maybeSettleReplacementReadiness();
  return createReplacementHandle(replacementTransaction);
}

export function waitForSimulationAtmosphereReady({
  transactionId,
  targetSimulationId = '',
  timeoutMs = FIRST_FRAME_TIMEOUT_MS,
  signal,
} = {}) {
  if (!isReplacementCurrent(transactionId)) {
    return Promise.reject(new Error('Atmosphere replacement transaction is stale or missing.'));
  }
  const replacement = replacementTransaction;
  if (targetSimulationId && replacement.targetSimulationId !== String(targetSimulationId)) {
    return Promise.reject(new Error('Atmosphere replacement target does not match the active transaction.'));
  }
  if (signal?.aborted) {
    return Promise.reject(signal.reason || new DOMException('Aborted', 'AbortError'));
  }
  const waitMs = Math.max(1, Number(timeoutMs) || FIRST_FRAME_TIMEOUT_MS);
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      signal?.removeEventListener?.('abort', handleAbort);
      callback(value);
    };
    const handleAbort = () => finish(
      reject,
      signal.reason || new DOMException('Aborted', 'AbortError'),
    );
    const timeoutId = window.setTimeout(() => {
      finish(reject, new Error(`Atmosphere target surface did not become ready within ${waitMs}ms.`));
    }, waitMs);
    signal?.addEventListener?.('abort', handleAbort, { once: true });
    replacement.readiness.promise.then((result) => {
      if (result?.status === 'cancelled') {
        finish(reject, new Error(`Atmosphere replacement was cancelled (${result.reason || 'stale'}).`));
        return;
      }
      finish(resolve, result);
    });
  });
}

/**
 * Rollback/cancel never restores a captured output. The previous route remount
 * registers a fresh source after the coordinator restores its immutable state.
 */
export function rollbackSimulationAtmosphereReplacement({ transactionId, reason = 'rollback' } = {}) {
  if (!isReplacementCurrent(transactionId)) return false;
  const replacement = replacementTransaction;
  if (activeSource?.generation === replacement.generation) {
    const target = activeSource;
    activeSource = null;
    activeSourceGeneration = 0;
    sourceUnregisterCount += 1;
    deactivateSource(target);
  }
  if (!replacement.readiness.settled) {
    replacement.readiness.settled = true;
    replacement.readiness.resolve(Object.freeze({
      status: 'cancelled',
      transactionId: replacement.transactionId,
      targetSimulationId: replacement.targetSimulationId,
      generation: replacement.generation,
      reason: String(reason || 'rollback'),
    }));
  }
  replacementTransaction = null;
  return true;
}

export function settleSimulationAtmosphereReplacement({ transactionId } = {}) {
  if (!isReplacementCurrent(transactionId)) return false;
  if (!replacementTransaction.readiness.settled) maybeSettleReplacementReadiness();
  if (!replacementTransaction.readiness.settled) return false;
  replacementTransaction = null;
  return true;
}

export function getSimulationAtmosphereReplacementContext(targetSimulationId = '') {
  const replacement = replacementTransaction;
  if (!replacement?.committed) return null;
  if (targetSimulationId && replacement.targetSimulationId !== String(targetSimulationId)) return null;
  return createReplacementHandle(replacement);
}

export function getSimulationAtmosphereReplacementByTransactionId(transactionId) {
  if (!isReplacementCurrent(transactionId)) return null;
  return createReplacementHandle(replacementTransaction);
}

/**
 * Called immediately after a simulation renderer has produced a real frame.
 * The hot path is one identity check and one conditional scheduler callback.
 */
export function notifySimulationAtmosphereSourceFrame(simulationId = '') {
  const source = activeSource;
  if (!source || !source.requiresRealFrame || source.realFrameReady) return false;
  const id = String(simulationId || '');
  if (id && id !== source.routeId && id !== source.id) return false;
  source.realFrameReady = true;
  const replacement = replacementTransaction;
  if (replacement?.generation === source.generation) {
    replacement.targetFrameReady = true;
    maybeSettleReplacementReadiness();
  }
  if (
    window.__ABS_AUDIT_FORCE_ATMOSPHERE_FIRST_FRAME_FAILURE__ === true
    && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ) {
    failOpen('audit-first-composite-failure', source);
    return true;
  }
  staticFrameDirty = true;
  if (source.scheduler === 'internal') scheduleInternalFrame();
  return true;
}

export function isSimulationAtmosphereSourceFrameReady(simulationId = '') {
  const source = activeSource;
  const id = String(simulationId || '');
  return Boolean(
    source
    && source.realFrameReady
    && (!id || id === source.routeId || id === source.id)
  );
}

export function registerSimulationAtmosphereSource(definition) {
  const normalized = validateSource(definition);
  const requestedTransactionId = normalizeTransactionId(definition.transactionId);
  const replacement = replacementTransaction;
  const definitionRouteId = String(definition.routeId || '');
  const transactionMatches = Boolean(
    requestedTransactionId
    && requestedTransactionId === replacement?.transactionId
  );
  const matchesReplacementTarget = Boolean(
    replacement
    && (
      transactionMatches
      || definitionRouteId === replacement.targetSourceRouteId
      || definitionRouteId === replacement.targetSimulationId
      || String(definition.id || '') === replacement.targetSimulationId
      || (replacement.targetSimulationId === 'home' && definitionRouteId === 'home')
    )
  );
  const staleTransactionalRegistration = Boolean(
    (requestedTransactionId && requestedTransactionId !== replacement?.transactionId)
    || (replacement?.committed && !matchesReplacementTarget)
  );
  if (staleTransactionalRegistration) {
    const staleFirstFrame = Promise.resolve(Object.freeze({
      status: 'cancelled',
      generation: 0,
      reason: 'stale-transaction-registration',
    }));
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      staleCleanupCount += 1;
    };
    cleanup.generation = 0;
    cleanup.firstFrame = staleFirstFrame;
    cleanup.sourceId = normalized.id;
    return cleanup;
  }
  const bindsReplacement = Boolean(
    replacement?.committed
    && (!requestedTransactionId || requestedTransactionId === replacement.transactionId)
    && matchesReplacementTarget
  );
  const generation = bindsReplacement ? replacement.generation : ++sourceGeneration;
  const firstFrame = createFirstFrameDeferred();
  const source = {
    ...definition,
    ...normalized,
    routeId: String(definition.routeId || ''),
    quietZoneElement: definition.quietZoneElement || definition.getQuietZoneElement || null,
    opacityElement: definition.opacityElement || definition.materialElement || null,
    transactionId: bindsReplacement ? replacement.transactionId : requestedTransactionId,
    requiresRealFrame: bindsReplacement || definition.requireRealFrame === true,
    realFrameReady: !bindsReplacement && definition.requireRealFrame !== true,
    definition: Object.freeze({ ...definition, sourceOwner: undefined }),
    generation,
    firstFrame,
    firstFrameTimeoutId: 0,
  };
  const owner = definition.sourceOwner && typeof definition.sourceOwner === 'object'
    ? definition.sourceOwner
    : { generation, cleaned: false };
  owner.generation = generation;
  source.owner = owner;
  const previous = activeSource;
  activeSource = source;
  activeSourceGeneration = generation;
  sourceSwitchCount += previous ? 1 : 0;
  if (previous) {
    sourceUnregisterCount += 1;
    deactivateSource(previous, { preserveOutput: transitionPhase !== 'idle' });
  }
  activateCurrentSource({ resetOutput: !bindsReplacement });

  const cleanup = () => {
    if (owner.cleaned) return;
    owner.cleaned = true;
    if (activeSource?.generation !== owner.generation) {
      staleCleanupCount += 1;
      markSourceElement(source, false);
      return;
    }
    const preserveOutput = transitionPhase !== 'idle';
    sourceUnregisterCount += 1;
    deactivateSource(source, { preserveOutput });
    activeSource = null;
    activeSourceGeneration = 0;
    if (preserveOutput && host) {
      host.root.dataset.atmosphereStatus = 'frozen';
      host.edgeCanvas.hidden = true;
    } else {
      refreshQuietZoneObservation();
      applyPresentationState();
      if (host) host.root.dataset.atmosphereStatus = 'waiting-source';
    }
  };
  Object.defineProperty(cleanup, 'generation', { get: () => owner.generation });
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
  host.edgeCanvas.hidden = !firstCompositeAt || renderProfile.edgeStrength <= 0;
  staticFrameDirty = true;
  if (activeSource.scheduler === 'internal') scheduleInternalFrame();
}

/**
 * Simulation prepare/out deliberately keep the outgoing compositor live. The
 * coordinator calls this diagnostic boundary for every lifecycle phase; only
 * commitSimulationAtmosphereReplacement performs the atomic source cutoff.
 */
export function setSimulationAtmosphereSwitchPhase(phase = 'idle', transactionId = '') {
  const nextPhase = String(phase || 'idle');
  if (
    transactionId
    && replacementTransaction
    && replacementTransaction.transactionId !== normalizeTransactionId(transactionId)
  ) return false;
  simulationSwitchPhase = nextPhase;
  if (nextPhase === 'idle' && activeSource?.scheduler === 'internal') scheduleInternalFrame();
  return true;
}

export function getSimulationAtmosphereSnapshot() {
  return getDiagnosticSnapshot();
}

export function isSimulationAtmosphereActive() {
  return Boolean(host && activeSource && configuration.enabled && !failureReason);
}

export function getSimulationAtmosphereMaterialOpacity() {
  return 1;
}
