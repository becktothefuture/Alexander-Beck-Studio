const DEFAULT_EXIT_MS = 800;
const DEFAULT_ENTER_MS = 760;
const DEFAULT_HOLD_MS = 80;
const DEFAULT_EXIT_LOCAL_MS = 360;
const DEFAULT_ENTER_LOCAL_MS = 420;
const DEFAULT_EXIT_EASING = 'cubic-bezier(0.72, 0, 0.86, 0.32)';
const DEFAULT_ENTER_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
const MAX_EVENT_HISTORY = 120;

export const SIMULATION_VISUAL_TRANSITION_DEFAULTS = Object.freeze({
  exitMs: DEFAULT_EXIT_MS,
  enterMs: DEFAULT_ENTER_MS,
  holdMs: DEFAULT_HOLD_MS,
  exitLocalMs: DEFAULT_EXIT_LOCAL_MS,
  enterLocalMs: DEFAULT_ENTER_LOCAL_MS,
  exitEasing: DEFAULT_EXIT_EASING,
  enterEasing: DEFAULT_ENTER_EASING,
});

const registry = new Map();
let activeSourceId = '';
let initialVisualScale = 1;
let runToken = 0;
let transitionSequence = 0;
let directBootEnterToken = 0;
let firstDailyRegistrationPending = true;
let eventHistory = [];

function now() {
  try {
    return performance.now();
  } catch {
    return Date.now();
  }
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function getWindow() {
  return typeof window === 'undefined' ? null : window;
}

function getDocument() {
  return typeof document === 'undefined' ? null : document;
}

function prefersReducedMotion() {
  const win = getWindow();
  try {
    return Boolean(win?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => {
    const win = getWindow();
    if (!win || ms <= 0) {
      resolve();
      return;
    }
    win.setTimeout(resolve, ms);
  });
}

function frame() {
  return new Promise((resolve) => {
    const win = getWindow();
    if (!win?.requestAnimationFrame) {
      wait(16).then(resolve);
      return;
    }
    win.requestAnimationFrame(resolve);
  });
}

function getActiveEntry() {
  if (activeSourceId && registry.has(activeSourceId)) {
    return registry.get(activeSourceId);
  }
  let latest = null;
  for (const entry of registry.values()) {
    if (!latest || entry.registeredAt > latest.registeredAt) latest = entry;
  }
  activeSourceId = latest?.sourceId || '';
  return latest;
}

export function getActiveSimulationVisualTransitionSourceId() {
  return getActiveEntry()?.sourceId || '';
}

export function isSimulationVisualTransitionSourceActive(sourceId) {
  return getActiveSimulationVisualTransitionSourceId() === String(sourceId || '');
}

function publishDebug(next = {}) {
  const win = getWindow();
  if (!win) return;
  const previous = win.__ABS_SIMULATION_VISUAL_TRANSITION__ || {};
  win.__ABS_SIMULATION_VISUAL_TRANSITION__ = {
    phase: 'idle',
    sourceId: activeSourceId || '',
    startedAt: previous.startedAt || now(),
    updatedAt: now(),
    minScale: initialVisualScale,
    maxScale: initialVisualScale,
    visibleRatio: initialVisualScale > 0.02 ? 1 : 0,
    wallScale: 1,
    ...previous,
    events: eventHistory.slice(-MAX_EVENT_HISTORY),
    ...next,
  };
}

export function recordSimulationVisualTransitionEvent(type, detail = {}) {
  const event = {
    type: String(type || 'event'),
    at: now(),
    wallTime: Date.now(),
    sourceId: detail.sourceId || activeSourceId || '',
    sequence: Number.isFinite(detail.sequence) ? detail.sequence : transitionSequence,
    direction: detail.direction || '',
    routeId: detail.routeId || '',
    reason: detail.reason || '',
  };
  eventHistory = eventHistory.concat(event).slice(-MAX_EVENT_HISTORY);
  publishDebug({
    lastEvent: event,
    events: eventHistory.slice(-MAX_EVENT_HISTORY),
  });
  return event;
}

export function publishSimulationVisualTransitionSnapshot(sourceId, snapshot = {}) {
  const next = {
    sourceId: sourceId || activeSourceId || '',
    direction: snapshot.direction,
  };
  if (Number.isFinite(snapshot.minScale)) next.minScale = snapshot.minScale;
  if (Number.isFinite(snapshot.maxScale)) next.maxScale = snapshot.maxScale;
  if (Number.isFinite(snapshot.visibleRatio)) next.visibleRatio = snapshot.visibleRatio;
  if (Number.isFinite(snapshot.count)) next.count = snapshot.count;
  publishDebug(next);
}

function isDailySimulationLayerPresent() {
  const doc = getDocument();
  return Boolean(doc?.querySelector?.('.daily-simulation-layer'));
}

function isSimulationFocusShellTransitionActive() {
  const doc = getDocument();
  return Boolean(doc?.documentElement?.dataset?.absSimulationFocusTransition);
}

function resolveInitialVisualScaleForRegistration() {
  if (prefersReducedMotion()) return initialVisualScale;
  if (initialVisualScale < 0.999) return initialVisualScale;
  if (
    firstDailyRegistrationPending
    && isDailySimulationLayerPresent()
    && !isSimulationFocusShellTransitionActive()
  ) {
    return 0;
  }
  return initialVisualScale;
}

async function maybeRunDirectDailyBootEnter(sourceId, scale) {
  if (scale > 0.001) return;
  if (!isDailySimulationLayerPresent() || isSimulationFocusShellTransitionActive()) return;

  const token = ++directBootEnterToken;
  for (let i = 0; i < 120; i += 1) {
    if (token !== directBootEnterToken || !registry.has(sourceId)) return;
    const bootState = getDocument()?.documentElement?.dataset?.absBootState || '';
    if (bootState !== 'booting') break;
    await wait(50);
  }
  await frame();
  await frame();
  if (
    token !== directBootEnterToken
    || !registry.has(sourceId)
    || isSimulationFocusShellTransitionActive()
  ) {
    return;
  }
  await runSimulationVisualTransition('in', {
    durationMs: DEFAULT_ENTER_MS,
    localDurationMs: DEFAULT_ENTER_LOCAL_MS,
    easing: DEFAULT_ENTER_EASING,
    reason: 'direct-daily-route',
  });
}

export function registerSimulationVisualTransition(sourceId, handlers = {}) {
  const id = String(sourceId || `simulation-${registry.size + 1}`);
  const entry = {
    sourceId: id,
    handlers,
    registeredAt: now(),
  };
  registry.set(id, entry);
  activeSourceId = id;

  const scale = resolveInitialVisualScaleForRegistration();
  try {
    handlers.setVisualScale?.(scale, { immediate: true, phase: 'registered' });
  } catch (error) {
    void error;
  }

  publishDebug({
    phase: 'registered',
    sourceId: id,
    startedAt: now(),
    minScale: scale,
    maxScale: scale,
    visibleRatio: scale > 0.02 ? 1 : 0,
  });
  void maybeRunDirectDailyBootEnter(id, scale);

  return function unregisterSimulationVisualTransition() {
    if (registry.get(id) !== entry) return;
    registry.delete(id);
    if (activeSourceId === id) {
      activeSourceId = '';
      getActiveEntry();
    }
    publishDebug({
      phase: registry.size ? 'registered' : 'idle',
      sourceId: activeSourceId || '',
    });
  };
}

export function setInitialSimulationVisualScale(scale) {
  initialVisualScale = clamp01(Number(scale));
  const entry = getActiveEntry();
  if (entry && initialVisualScale >= 0.999) {
    firstDailyRegistrationPending = false;
    directBootEnterToken += 1;
  }
  try {
    entry?.handlers?.setVisualScale?.(initialVisualScale, { immediate: true, phase: 'initial' });
  } catch (error) {
    void error;
  }
  publishDebug({
    phase: 'initial',
    minScale: initialVisualScale,
    maxScale: initialVisualScale,
    visibleRatio: initialVisualScale > 0.02 ? 1 : 0,
  });
}

export function getInitialSimulationVisualScale() {
  return initialVisualScale;
}

function normalizeTimings(direction, timings = {}) {
  const isOut = direction === 'out';
  const durationMs = Number(timings.durationMs ?? timings[isOut ? 'exitMs' : 'enterMs']);
  const localDurationMs = Number(timings.localDurationMs ?? timings[isOut ? 'exitLocalMs' : 'enterLocalMs']);
  return {
    durationMs: Number.isFinite(durationMs) ? Math.max(0, durationMs) : (isOut ? DEFAULT_EXIT_MS : DEFAULT_ENTER_MS),
    localDurationMs: Number.isFinite(localDurationMs)
      ? Math.max(0, localDurationMs)
      : (isOut ? DEFAULT_EXIT_LOCAL_MS : DEFAULT_ENTER_LOCAL_MS),
    easing: timings.easing || timings[isOut ? 'exitEasing' : 'enterEasing'] || (isOut ? DEFAULT_EXIT_EASING : DEFAULT_ENTER_EASING),
    reason: timings.reason || '',
  };
}

export async function runSimulationVisualTransition(direction, timings = {}) {
  const normalizedDirection = direction === 'out' ? 'out' : 'in';
  const targetScale = normalizedDirection === 'out' ? 0 : 1;
  const transitionTimings = normalizeTimings(normalizedDirection, timings);
  const token = ++runToken;
  const sequence = ++transitionSequence;
  const entry = getActiveEntry();

  if (prefersReducedMotion()) {
    firstDailyRegistrationPending = false;
    initialVisualScale = targetScale;
    recordSimulationVisualTransitionEvent(`${normalizedDirection}-complete`, {
      sourceId: entry?.sourceId || activeSourceId || '',
      sequence,
      direction: normalizedDirection,
      reason: 'reduced-motion',
    });
    try {
      entry?.handlers?.setVisualScale?.(targetScale, { immediate: true, phase: 'reduced-motion' });
    } catch (error) {
      void error;
    }
    publishDebug({
      phase: 'idle',
      sourceId: entry?.sourceId || activeSourceId || '',
      startedAt: now(),
      direction: normalizedDirection,
      minScale: targetScale,
      maxScale: targetScale,
      visibleRatio: targetScale > 0.02 ? 1 : 0,
      sequence,
    });
    return;
  }

  recordSimulationVisualTransitionEvent(`${normalizedDirection}-start`, {
    sourceId: entry?.sourceId || activeSourceId || '',
    sequence,
    direction: normalizedDirection,
    reason: transitionTimings.reason,
  });

  publishDebug({
    phase: normalizedDirection,
    sourceId: entry?.sourceId || activeSourceId || '',
    startedAt: now(),
    direction: normalizedDirection,
    durationMs: transitionTimings.durationMs,
    localDurationMs: transitionTimings.localDurationMs,
    sequence,
  });

  const handler = entry?.handlers;
  const transitionFn = normalizedDirection === 'out' ? handler?.transitionOut : handler?.transitionIn;
  try {
    const runPromise = typeof transitionFn === 'function'
      ? transitionFn({
        ...transitionTimings,
        direction: normalizedDirection,
        sequence,
      })
      : Promise.resolve()
        .then(() => {
          if (typeof handler?.setVisualScale === 'function') {
            handler.setVisualScale(targetScale, { immediate: true, phase: normalizedDirection });
          }
        })
        .then(() => wait(transitionTimings.durationMs));
    await Promise.race([
      Promise.resolve(runPromise).catch(() => undefined),
      wait(transitionTimings.durationMs + transitionTimings.localDurationMs + 180),
    ]);
  } finally {
    if (token === runToken) {
      const completionEntry = getActiveEntry() || entry;
      const completionHandler = completionEntry?.handlers || handler;
      initialVisualScale = targetScale;
      if (normalizedDirection === 'in') firstDailyRegistrationPending = false;
      recordSimulationVisualTransitionEvent(`${normalizedDirection}-complete`, {
        sourceId: completionEntry?.sourceId || activeSourceId || '',
        sequence,
        direction: normalizedDirection,
        reason: transitionTimings.reason,
      });
      try {
        completionHandler?.setVisualScale?.(targetScale, {
          immediate: true,
          phase: `${normalizedDirection}-complete`,
        });
      } catch (error) {
        void error;
      }
      publishDebug({
        phase: normalizedDirection === 'out' ? 'out-complete' : 'idle',
        sourceId: completionEntry?.sourceId || activeSourceId || '',
        updatedAt: now(),
        direction: normalizedDirection,
        minScale: targetScale,
        maxScale: targetScale,
        visibleRatio: targetScale > 0.02 ? 1 : 0,
        sequence,
      });
    }
  }
}

function parseCubicBezier(easing) {
  const match = String(easing || '').match(/cubic-bezier\(([^)]+)\)/i);
  if (!match) return null;
  const values = match[1].split(',').map((value) => Number.parseFloat(value.trim()));
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return null;
  return values;
}

function cubicBezierAt(t, p1x, p1y, p2x, p2y) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  let x = t;
  for (let i = 0; i < 5; i += 1) {
    const estimate = ((ax * x + bx) * x + cx) * x - t;
    const derivative = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(estimate) < 0.0001 || Math.abs(derivative) < 0.0001) break;
    x = clamp01(x - estimate / derivative);
  }
  return clamp01(((ay * x + by) * x + cy) * x);
}

export function easeSimulationVisualProgress(easing, progress, direction = 'in') {
  const t = clamp01(progress);
  const bezier = parseCubicBezier(easing);
  if (bezier) return cubicBezierAt(t, bezier[0], bezier[1], bezier[2], bezier[3]);
  if (direction === 'out') return t * t * t;
  const inverse = 1 - t;
  return 1 - (inverse * inverse * inverse);
}

function hashUnit(seed, index) {
  const x = Math.sin((Number(seed) + 1) * 12.9898 + (index + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function createIndexedSimulationVisualTransition({
  sourceId,
  getCount,
  setScaleAt,
  requestRender,
  getSeed,
} = {}) {
  const id = String(sourceId || 'simulation');
  let scales = [];
  let delays = [];
  let currentScale = initialVisualScale;
  let frameId = 0;
  let token = 0;
  let snapshot = {
    count: 0,
    minScale: currentScale,
    maxScale: currentScale,
    visibleRatio: currentScale > 0.02 ? 1 : 0,
    direction: 'idle',
  };

  const cancelFrame = () => {
    const win = getWindow();
    if (frameId && win?.cancelAnimationFrame) {
      win.cancelAnimationFrame(frameId);
    }
    frameId = 0;
  };

  const getResolvedCount = () => {
    const count = Number(getCount?.());
    return Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  };

  const ensureCount = (fillScale = currentScale) => {
    const count = getResolvedCount();
    if (scales.length !== count) {
      scales = new Array(count);
      delays = new Array(count);
      for (let i = 0; i < count; i += 1) {
        scales[i] = fillScale;
        delays[i] = 0;
      }
    }
    return count;
  };

  const applyScale = (index, scale) => {
    scales[index] = scale;
    try {
      setScaleAt?.(index, scale);
    } catch (error) {
      void error;
    }
  };

  const updateSnapshot = (direction = 'idle') => {
    const count = scales.length;
    let minScale = count ? 1 : currentScale;
    let maxScale = count ? 0 : currentScale;
    let visible = 0;
    for (let i = 0; i < count; i += 1) {
      const scale = scales[i] ?? currentScale;
      if (scale < minScale) minScale = scale;
      if (scale > maxScale) maxScale = scale;
      if (scale > 0.02) visible += 1;
    }
    snapshot = {
      count,
      minScale,
      maxScale,
      visibleRatio: count ? visible / count : (currentScale > 0.02 ? 1 : 0),
      direction,
    };
    publishSimulationVisualTransitionSnapshot(id, snapshot);
  };

  const render = () => {
    try {
      requestRender?.();
    } catch (error) {
      void error;
    }
  };

  const setVisualScale = (scale) => {
    cancelFrame();
    token += 1;
    currentScale = clamp01(Number(scale));
    const count = ensureCount(currentScale);
    for (let i = 0; i < count; i += 1) {
      applyScale(i, currentScale);
    }
    updateSnapshot('idle');
    render();
  };

  const transition = (direction, timings = {}) => new Promise((resolve) => {
    cancelFrame();
    const win = getWindow();
    const localToken = ++token;
    const count = ensureCount(direction === 'in' ? 0 : currentScale);
    const durationMs = Math.max(0, Number(timings.durationMs) || (direction === 'out' ? DEFAULT_EXIT_MS : DEFAULT_ENTER_MS));
    const localDurationMs = Math.max(1, Number(timings.localDurationMs) || (direction === 'out' ? DEFAULT_EXIT_LOCAL_MS : DEFAULT_ENTER_LOCAL_MS));
    const easing = timings.easing || (direction === 'out' ? DEFAULT_EXIT_EASING : DEFAULT_ENTER_EASING);
    const staggerWindow = Math.max(0, durationMs - localDurationMs);
    const from = direction === 'out' ? 1 : 0;
    const to = direction === 'out' ? 0 : 1;
    const seed = Number(getSeed?.()) || timings.sequence || transitionSequence || 1;

    if (!win?.requestAnimationFrame || count <= 0 || durationMs <= 0) {
      currentScale = to;
      for (let i = 0; i < count; i += 1) applyScale(i, to);
      updateSnapshot(direction);
      render();
      resolve();
      return;
    }

    for (let i = 0; i < count; i += 1) {
      delays[i] = hashUnit(seed, i) * staggerWindow;
      applyScale(i, from);
    }
    updateSnapshot(direction);
    render();

    const startedAt = now();
    const step = () => {
      if (localToken !== token) {
        resolve();
        return;
      }

      const elapsed = now() - startedAt;
      let done = true;
      let sum = 0;
      for (let i = 0; i < count; i += 1) {
        const localProgress = clamp01((elapsed - delays[i]) / localDurationMs);
        if (localProgress < 1) done = false;
        const eased = easeSimulationVisualProgress(easing, localProgress, direction);
        const scale = from + ((to - from) * eased);
        sum += scale;
        applyScale(i, scale);
      }
      currentScale = count > 0 ? sum / count : to;
      updateSnapshot(direction);
      render();

      if (done || elapsed >= durationMs + 32) {
        for (let i = 0; i < count; i += 1) applyScale(i, to);
        currentScale = to;
        updateSnapshot(direction);
        render();
        resolve();
        return;
      }
      frameId = win.requestAnimationFrame(step);
    };

    frameId = win.requestAnimationFrame(step);
  });

  return {
    setVisualScale,
    transitionOut: (timings) => transition('out', timings),
    transitionIn: (timings) => transition('in', timings),
    getScaleAt: (index) => scales[index] ?? currentScale,
    getSnapshot: () => ({ ...snapshot }),
    destroy: cancelFrame,
  };
}
