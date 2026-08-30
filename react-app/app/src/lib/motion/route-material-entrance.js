import { easeSimulationVisualProgress } from '../simulationVisualTransition.js';
import {
  cancelStableAnimationFrame,
  clearStableTimeout,
  requestStableAnimationFrame,
  setStableTimeout,
} from '../legacy-runtime-scope.js';
import { getShellRouteTransitionConfig } from '../../legacy/modules/visual/site-shell.js';

// Cubic ease-out keeps both directions visibly moving from their first painted
// frames and avoids hiding most of an exit in an abrupt endpoint collapse.
const MATERIAL_ENTER_EASING = 'cubic-bezier(0.215, 0.61, 0.355, 1)';
const MATERIAL_EXIT_EASING = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

function clamp(value, min, max, fallback = min) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function now() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

export function getRouteMaterialEntranceTiming({ reducedMotion = prefersReducedMotion() } = {}) {
  const config = getShellRouteTransitionConfig();
  if (reducedMotion) {
    return Object.freeze({
      startScale: 1,
      endScale: 1,
      durationMs: 0,
      staggerMs: 0,
      delayMs: 0,
      easing: MATERIAL_ENTER_EASING,
      cardTravelPx: 0,
      cardTiltDeg: 0,
      reducedMotion: true,
      direction: 'in',
    });
  }
  return Object.freeze({
    // Circle material has one authored entrance contract: it starts at zero.
    // Keeping this fixed prevents opacity fades or partially visible first frames.
    startScale: 0,
    endScale: 1,
    durationMs: Math.round(clamp(config.materialDurationMs, 0, 3000, 1200)),
    staggerMs: Math.round(clamp(config.materialStaggerMs, 0, 2000, 720)),
    delayMs: Math.round(clamp(config.materialDelayMs, 0, 2000, 80)),
    easing: MATERIAL_ENTER_EASING,
    cardTravelPx: clamp(config.cardTravelPx, 0, 80, 16),
    cardTiltDeg: clamp(config.cardTiltDeg, 0, 8, 1.2),
    reducedMotion: false,
    direction: 'in',
  });
}

export function getRouteMaterialExitTiming({ reducedMotion = prefersReducedMotion() } = {}) {
  const config = getShellRouteTransitionConfig();
  if (reducedMotion) {
    return Object.freeze({
      startScale: 1,
      endScale: 0,
      durationMs: 0,
      staggerMs: 0,
      delayMs: 0,
      easing: MATERIAL_EXIT_EASING,
      cardTravelPx: 0,
      cardTiltDeg: 0,
      reducedMotion: true,
      direction: 'out',
    });
  }
  return Object.freeze({
    startScale: 1,
    endScale: 0,
    durationMs: Math.round(clamp(config.materialExitDurationMs, 0, 1000, 140)),
    staggerMs: Math.round(clamp(config.materialExitStaggerMs, 0, 1000, 70)),
    delayMs: 0,
    easing: MATERIAL_EXIT_EASING,
    cardTravelPx: clamp(config.cardTravelPx, 0, 80, 16),
    cardTiltDeg: clamp(config.cardTiltDeg, 0, 8, 1.2),
    reducedMotion: false,
    direction: 'out',
  });
}

/**
 * Shared presentation frame for route-owned cards.
 *
 * Layout transforms stay on the card's positioning element. The Work canvas
 * applies this frame to a centred inner surface so cards share one lift, tilt,
 * and scale without changing their settled geometry. Opacity is
 * deliberately absent: cards enter and leave through geometry, never by fading.
 * Animation controllers pass a reusable output object to avoid per-frame GC.
 */
export function getRouteCardMotionFrame(progress, {
  direction = 1,
  timing = null,
} = {}, output = {}) {
  const scaleProgress = clamp(progress, 0, 1, 1);
  const remaining = 1 - scaleProgress;
  const travelPx = clamp(timing?.cardTravelPx, 0, 80, 16);
  const tiltDeg = clamp(timing?.cardTiltDeg, 0, 8, 1.2);
  const directionSign = Number(direction) < 0 ? -1 : 1;
  output.scale = scaleProgress;
  output.translateY = remaining * travelPx;
  output.rotate = directionSign * remaining * tiltDeg;
  return output;
}

function dedupeTargets(values) {
  const seen = new Set();
  const targets = [];
  const source = values || [];
  for (let index = 0; index < source.length; index += 1) {
    const target = source[index];
    if (!target || seen.has(target)) continue;
    seen.add(target);
    targets.push(target);
  }
  return targets;
}

/**
 * Owns the presentation scale for one route material layer.
 *
 * The shell owns route phases. Route adapters only supply stable targets and a
 * scale writer, so Canvas, WebGL, and DOM surfaces all follow the same timing
 * without nesting independent route timelines.
 */
export function createRouteMaterialEntranceController({
  id,
  routeId,
  diagnosticRoot = null,
  getTargets,
  setTargetScale,
  getDelayRatio = null,
  requestRender = null,
  getReducedMotion = prefersReducedMotion,
} = {}) {
  let targets = [];
  let delayRatios = [];
  let startScales = [];
  let frameId = 0;
  let delayTimerId = 0;
  let runToken = 0;
  let resolveActive = null;
  let removeActiveAbortListener = null;
  let destroyed = false;
  let activeDirection = 'in';
  let activeTiming = null;
  let activeStartedAt = 0;
  let activeRunning = false;
  let runStartScales = new WeakMap();
  let lastPublishedState = '';
  let lastPublishedAt = -Infinity;
  const scales = new WeakMap();
  const frameDetail = {
    phase: 'idle',
    direction: 'in',
    progress: 0,
    timing: null,
  };

  const getRoot = () => (
    typeof diagnosticRoot === 'function' ? diagnosticRoot() : diagnosticRoot
  );

  const publishState = (state, detail = {}) => {
    const root = getRoot();
    if (!root?.dataset) return;
    const publishedAt = now();
    const terminal = state === 'complete' || state === 'prepared' || state === 'exited';
    if (
      !terminal
      && detail.force !== true
      && state === lastPublishedState
      && publishedAt - lastPublishedAt < 50
    ) return;
    lastPublishedState = state;
    lastPublishedAt = publishedAt;
    root.dataset.routeMaterialId = String(id || routeId || 'route-material');
    root.dataset.routeMaterialState = state;
    root.dataset.routeMaterialDirection = String(detail.direction || '');
    root.dataset.routeMaterialReason = String(detail.reason || '');
    root.dataset.routeMaterialTargetCount = String(detail.targetCount ?? targets.length);
    if (Number.isFinite(detail.minScale)) {
      root.dataset.routeMaterialMinScale = detail.minScale.toFixed(4);
    }
    if (Number.isFinite(detail.maxScale)) {
      root.dataset.routeMaterialMaxScale = detail.maxScale.toFixed(4);
    }
    if (Number.isFinite(detail.progress)) {
      root.dataset.routeMaterialProgress = detail.progress.toFixed(4);
    }
    if (Number.isFinite(detail.startedAt)) {
      root.dataset.routeMaterialStartedAt = detail.startedAt.toFixed(2);
    }
    if (Number.isFinite(detail.completedAt)) {
      root.dataset.routeMaterialCompletedAt = detail.completedAt.toFixed(2);
    }
  };

  const cancelScheduledWork = () => {
    if (frameId) cancelStableAnimationFrame(frameId);
    if (delayTimerId) clearStableTimeout(delayTimerId);
    frameId = 0;
    delayTimerId = 0;
  };

  const resolveCurrentRun = (value = false) => {
    removeActiveAbortListener?.();
    removeActiveAbortListener = null;
    const resolve = resolveActive;
    resolveActive = null;
    resolve?.(value);
  };

  const readTargets = () => {
    try {
      return dedupeTargets(getTargets?.());
    } catch {
      return [];
    }
  };

  const applyScale = (target, scale, index, detail = frameDetail) => {
    const nextScale = clamp(scale, 0, 1, 1);
    scales.set(target, nextScale);
    try {
      setTargetScale?.(target, nextScale, index, detail);
    } catch {
      /* A detached route target must not break shell settlement. */
    }
  };

  const requestPaint = () => {
    try {
      requestRender?.();
    } catch {
      /* The route may already be unmounting. */
    }
  };

  const applyEndpoint = (scale, state, reason, direction) => {
    runToken += 1;
    cancelScheduledWork();
    activeDirection = direction;
    activeTiming = null;
    activeStartedAt = 0;
    activeRunning = false;
    runStartScales = new WeakMap();
    const liveTargets = readTargets();
    targets = dedupeTargets([...targets, ...liveTargets]);
    frameDetail.phase = state;
    frameDetail.direction = direction;
    frameDetail.progress = 1;
    frameDetail.timing = null;
    for (let index = 0; index < targets.length; index += 1) {
      applyScale(targets[index], scale, index, frameDetail);
    }
    requestPaint();
    publishState(state, {
      direction,
      reason,
      targetCount: targets.length,
      completedAt: now(),
      minScale: scale,
      maxScale: scale,
      progress: 1,
    });
    resolveCurrentRun(true);
    return true;
  };

  const settle = (reason = 'complete') => applyEndpoint(1, 'complete', reason, 'in');
  const hide = (reason = 'exited') => applyEndpoint(0, 'exited', reason, 'out');

  const prepare = ({ signal = null, reducedMotion = getReducedMotion?.() } = {}) => {
    if (destroyed || signal?.aborted) return false;
    runToken += 1;
    cancelScheduledWork();
    resolveCurrentRun(false);
    const timing = getRouteMaterialEntranceTiming({ reducedMotion });
    activeDirection = 'in';
    activeTiming = timing;
    activeStartedAt = 0;
    activeRunning = false;
    runStartScales = new WeakMap();
    targets = readTargets();
    frameDetail.phase = 'prepared';
    frameDetail.direction = 'in';
    frameDetail.progress = 0;
    frameDetail.timing = timing;
    for (let index = 0; index < targets.length; index += 1) {
      applyScale(targets[index], timing.startScale, index, frameDetail);
    }
    requestPaint();
    publishState(timing.reducedMotion ? 'complete' : 'prepared', {
      direction: 'in',
      targetCount: targets.length,
      minScale: timing.startScale,
      maxScale: timing.startScale,
      progress: timing.reducedMotion ? 1 : 0,
    });
    return true;
  };

  const refreshTargets = ({ requestPaint: shouldRequestPaint = true } = {}) => {
    if (destroyed) return false;
    targets = readTargets();
    delayRatios = new Array(targets.length);
    startScales = new Array(targets.length);
    const entering = activeDirection !== 'out';
    const timing = activeTiming;
    const elapsed = activeRunning && activeStartedAt > 0
      ? Math.max(0, now() - activeStartedAt)
      : 0;
    let minScale = 1;
    let maxScale = 0;

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      const delayRatio = clamp(
        typeof getDelayRatio === 'function'
          ? getDelayRatio(target, index, targets, activeDirection)
          : (targets.length > 1 ? index / (targets.length - 1) : 0),
        0,
        1,
        0,
      );
      const startScale = runStartScales.get(target) ?? (entering ? 0 : 1);
      delayRatios[index] = delayRatio;
      startScales[index] = startScale;

      let scale = scales.get(target) ?? 1;
      if (frameDetail.phase === 'prepared') {
        scale = timing?.startScale ?? 0;
      } else if (frameDetail.phase === 'complete') {
        scale = 1;
      } else if (frameDetail.phase === 'exited') {
        scale = 0;
      } else if (activeRunning && timing) {
        const localDelay = delayRatio * timing.staggerMs;
        const progress = clamp((elapsed - localDelay) / timing.durationMs, 0, 1, 0);
        const eased = easeSimulationVisualProgress(timing.easing, progress, activeDirection);
        scale = entering ? eased : startScale * (1 - eased);
      }
      minScale = Math.min(minScale, scale);
      maxScale = Math.max(maxScale, scale);
      applyScale(target, scale, index, frameDetail);
    }

    if (targets.length === 0) {
      minScale = 0;
      maxScale = 0;
    }
    if (shouldRequestPaint) requestPaint();
    publishState(frameDetail.phase, {
      force: true,
      direction: activeDirection,
      targetCount: targets.length,
      minScale,
      maxScale,
      progress: frameDetail.progress,
    });
    return true;
  };

  const run = (direction, { signal = null, reducedMotion = getReducedMotion?.() } = {}) => {
    if (destroyed || signal?.aborted) return Promise.resolve(false);
    const entering = direction !== 'out';
    const timing = entering
      ? getRouteMaterialEntranceTiming({ reducedMotion })
      : getRouteMaterialExitTiming({ reducedMotion });
    activeDirection = direction;
    activeTiming = timing;
    activeStartedAt = 0;
    activeRunning = true;
    runStartScales = new WeakMap();
    runToken += 1;
    const localToken = runToken;
    cancelScheduledWork();
    resolveCurrentRun(false);
    targets = dedupeTargets([...targets, ...readTargets()]);
    delayRatios = new Array(targets.length);
    startScales = new Array(targets.length);
    frameDetail.phase = entering ? 'prepared' : 'exiting';
    frameDetail.direction = direction;
    frameDetail.progress = 0;
    frameDetail.timing = timing;

    for (let index = 0; index < targets.length; index += 1) {
      const target = targets[index];
      if (entering) applyScale(target, 0, index, frameDetail);
      startScales[index] = entering ? 0 : (scales.get(target) ?? 1);
      runStartScales.set(target, startScales[index]);
      delayRatios[index] = clamp(
        typeof getDelayRatio === 'function'
          ? getDelayRatio(target, index, targets, direction)
          : (targets.length > 1 ? index / (targets.length - 1) : 0),
        0,
        1,
        0,
      );
    }
    requestPaint();

    if (
      timing.reducedMotion
      || timing.durationMs <= 0
      || targets.length === 0
    ) {
      return Promise.resolve(entering ? settle('reduced-motion') : hide('reduced-motion'));
    }

    publishState(entering ? 'entering' : 'exiting', {
      direction,
      targetCount: targets.length,
      startedAt: now(),
      minScale: entering ? 0 : 1,
      maxScale: entering ? 0 : 1,
      progress: 0,
    });

    return new Promise((resolve) => {
      resolveActive = resolve;
      let renderedIntermediateFrame = false;
      let forcedIntermediateFrame = false;
      const abort = () => {
        if (localToken !== runToken || destroyed) return;
        runToken += 1;
        cancelScheduledWork();
        activeStartedAt = 0;
        activeRunning = false;
        resolveCurrentRun(false);
      };
      if (signal) {
        signal.addEventListener('abort', abort, { once: true });
        removeActiveAbortListener = () => signal.removeEventListener('abort', abort);
      }

      const startAnimation = () => {
        delayTimerId = 0;
        if (localToken !== runToken || signal?.aborted || destroyed) {
          abort();
          return;
        }
        const startedAt = now();
        activeStartedAt = startedAt;
        const step = () => {
          frameId = 0;
          if (localToken !== runToken || signal?.aborted || destroyed) {
            abort();
            return;
          }
          const rawElapsed = now() - startedAt;
          // Under a long main-thread stall the first RAF can arrive after the
          // whole timeline. Stretch by one paint so material never endpoint-pops.
          const shouldForceIntermediate = (
            !renderedIntermediateFrame
            && !forcedIntermediateFrame
            && rawElapsed >= timing.durationMs + timing.staggerMs
            && timing.durationMs > 2
          );
          const elapsed = shouldForceIntermediate
            ? Math.min(
                timing.durationMs + timing.staggerMs - 1,
                Math.max(1, timing.durationMs * 0.62),
              )
            : rawElapsed;
          if (shouldForceIntermediate) forcedIntermediateFrame = true;
          let complete = true;
          let minScale = 1;
          let maxScale = 0;
          frameDetail.phase = entering ? 'entering' : 'exiting';
          frameDetail.direction = direction;
          frameDetail.timing = timing;
          for (let index = 0; index < targets.length; index += 1) {
            const localDelay = delayRatios[index] * timing.staggerMs;
            const progress = clamp((elapsed - localDelay) / timing.durationMs, 0, 1, 0);
            if (progress < 1) complete = false;
            const eased = easeSimulationVisualProgress(timing.easing, progress, direction);
            const startScale = startScales[index];
            const scale = entering
              ? eased
              : startScale * (1 - eased);
            minScale = Math.min(minScale, scale);
            maxScale = Math.max(maxScale, scale);
            frameDetail.progress = progress;
            applyScale(targets[index], scale, index, frameDetail);
          }
          renderedIntermediateFrame ||= (
            (minScale > 0.02 && minScale < 0.98)
            || (maxScale > 0.02 && maxScale < 0.98)
          );
          requestPaint();
          const totalDuration = timing.durationMs + timing.staggerMs;
          publishState(entering ? 'entering' : 'exiting', {
            direction,
            targetCount: targets.length,
            minScale,
            maxScale,
            progress: Math.min(1, elapsed / Math.max(1, totalDuration)),
          });
          if (
            !shouldForceIntermediate
            && (complete || rawElapsed >= totalDuration + 32)
            && (renderedIntermediateFrame || forcedIntermediateFrame)
          ) {
            if (entering) settle('complete');
            else hide('complete');
            return;
          }
          frameId = requestStableAnimationFrame(step);
        };
        frameId = requestStableAnimationFrame(step);
      };

      if (timing.delayMs > 0) {
        delayTimerId = setStableTimeout(startAnimation, timing.delayMs);
      } else {
        startAnimation();
      }
    });
  };

  return Object.freeze({
    prepare,
    refreshTargets,
    enter: (options) => run('in', options),
    exit: (options) => run('out', options),
    settle,
    hide,
    cancel: (reason = 'cancelled') => settle(reason),
    destroy({ settleTargets = true } = {}) {
      if (destroyed) return;
      if (settleTargets) settle('destroyed');
      destroyed = true;
      runToken += 1;
      cancelScheduledWork();
      resolveCurrentRun(false);
      targets = [];
      delayRatios = [];
      startScales = [];
      activeTiming = null;
      activeStartedAt = 0;
      activeRunning = false;
      runStartScales = new WeakMap();
    },
  });
}
