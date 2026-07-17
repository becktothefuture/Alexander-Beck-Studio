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
  if (prefersReducedMotion()) return 1;
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
    initialVisualScale = 1;
    recordSimulationVisualTransitionEvent(`${normalizedDirection}-complete`, {
      sourceId: entry?.sourceId || activeSourceId || '',
      sequence,
      direction: normalizedDirection,
      reason: 'reduced-motion',
    });
    try {
      entry?.handlers?.setVisualScale?.(1, { immediate: true, phase: 'reduced-motion' });
    } catch (error) {
      void error;
    }
    publishDebug({
      phase: 'idle',
      sourceId: entry?.sourceId || activeSourceId || '',
      startedAt: now(),
      direction: normalizedDirection,
      minScale: 1,
      maxScale: 1,
      visibleRatio: 1,
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
      if (normalizedDirection === 'out') {
        recordSimulationVisualTransitionEvent('hold-start', {
          sourceId: entry?.sourceId || activeSourceId || '',
          sequence,
          direction: normalizedDirection,
          reason: transitionTimings.reason,
        });
      }
      try {
        completionHandler?.setVisualScale?.(targetScale, {
          immediate: true,
          phase: `${normalizedDirection}-complete`,
        });
      } catch (error) {
        void error;
      }
      publishDebug({
        phase: normalizedDirection === 'out' ? 'hold' : 'idle',
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uLmpzIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IERFRkFVTFRfRVhJVF9NUyA9IDgwMDtcbmNvbnN0IERFRkFVTFRfRU5URVJfTVMgPSA3NjA7XG5jb25zdCBERUZBVUxUX0hPTERfTVMgPSA4MDtcbmNvbnN0IERFRkFVTFRfRVhJVF9MT0NBTF9NUyA9IDM2MDtcbmNvbnN0IERFRkFVTFRfRU5URVJfTE9DQUxfTVMgPSA0MjA7XG5jb25zdCBERUZBVUxUX0VYSVRfRUFTSU5HID0gJ2N1YmljLWJlemllcigwLjcyLCAwLCAwLjg2LCAwLjMyKSc7XG5jb25zdCBERUZBVUxUX0VOVEVSX0VBU0lORyA9ICdjdWJpYy1iZXppZXIoMC4xNiwgMSwgMC4zLCAxKSc7XG5jb25zdCBNQVhfRVZFTlRfSElTVE9SWSA9IDEyMDtcblxuZXhwb3J0IGNvbnN0IFNJTVVMQVRJT05fVklTVUFMX1RSQU5TSVRJT05fREVGQVVMVFMgPSBPYmplY3QuZnJlZXplKHtcbiAgZXhpdE1zOiBERUZBVUxUX0VYSVRfTVMsXG4gIGVudGVyTXM6IERFRkFVTFRfRU5URVJfTVMsXG4gIGhvbGRNczogREVGQVVMVF9IT0xEX01TLFxuICBleGl0TG9jYWxNczogREVGQVVMVF9FWElUX0xPQ0FMX01TLFxuICBlbnRlckxvY2FsTXM6IERFRkFVTFRfRU5URVJfTE9DQUxfTVMsXG4gIGV4aXRFYXNpbmc6IERFRkFVTFRfRVhJVF9FQVNJTkcsXG4gIGVudGVyRWFzaW5nOiBERUZBVUxUX0VOVEVSX0VBU0lORyxcbn0pO1xuXG5jb25zdCByZWdpc3RyeSA9IG5ldyBNYXAoKTtcbmxldCBhY3RpdmVTb3VyY2VJZCA9ICcnO1xubGV0IGluaXRpYWxWaXN1YWxTY2FsZSA9IDE7XG5sZXQgcnVuVG9rZW4gPSAwO1xubGV0IHRyYW5zaXRpb25TZXF1ZW5jZSA9IDA7XG5sZXQgZGlyZWN0Qm9vdEVudGVyVG9rZW4gPSAwO1xubGV0IGZpcnN0RGFpbHlSZWdpc3RyYXRpb25QZW5kaW5nID0gdHJ1ZTtcbmxldCBldmVudEhpc3RvcnkgPSBbXTtcblxuZnVuY3Rpb24gbm93KCkge1xuICB0cnkge1xuICAgIHJldHVybiBwZXJmb3JtYW5jZS5ub3coKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIERhdGUubm93KCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xhbXAwMSh2YWx1ZSkge1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZSh2YWx1ZSkpIHJldHVybiAwO1xuICBpZiAodmFsdWUgPCAwKSByZXR1cm4gMDtcbiAgaWYgKHZhbHVlID4gMSkgcmV0dXJuIDE7XG4gIHJldHVybiB2YWx1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0V2luZG93KCkge1xuICByZXR1cm4gdHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogd2luZG93O1xufVxuXG5mdW5jdGlvbiBnZXREb2N1bWVudCgpIHtcbiAgcmV0dXJuIHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcgPyBudWxsIDogZG9jdW1lbnQ7XG59XG5cbmZ1bmN0aW9uIHByZWZlcnNSZWR1Y2VkTW90aW9uKCkge1xuICBjb25zdCB3aW4gPSBnZXRXaW5kb3coKTtcbiAgdHJ5IHtcbiAgICByZXR1cm4gQm9vbGVhbih3aW4/Lm1hdGNoTWVkaWE/LignKHByZWZlcnMtcmVkdWNlZC1tb3Rpb246IHJlZHVjZSknKT8ubWF0Y2hlcyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiB3YWl0KG1zKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHdpbiA9IGdldFdpbmRvdygpO1xuICAgIGlmICghd2luIHx8IG1zIDw9IDApIHtcbiAgICAgIHJlc29sdmUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgd2luLnNldFRpbWVvdXQocmVzb2x2ZSwgbXMpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZnJhbWUoKSB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IHdpbiA9IGdldFdpbmRvdygpO1xuICAgIGlmICghd2luPy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcbiAgICAgIHdhaXQoMTYpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHdpbi5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUocmVzb2x2ZSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRBY3RpdmVFbnRyeSgpIHtcbiAgaWYgKGFjdGl2ZVNvdXJjZUlkICYmIHJlZ2lzdHJ5LmhhcyhhY3RpdmVTb3VyY2VJZCkpIHtcbiAgICByZXR1cm4gcmVnaXN0cnkuZ2V0KGFjdGl2ZVNvdXJjZUlkKTtcbiAgfVxuICBsZXQgbGF0ZXN0ID0gbnVsbDtcbiAgZm9yIChjb25zdCBlbnRyeSBvZiByZWdpc3RyeS52YWx1ZXMoKSkge1xuICAgIGlmICghbGF0ZXN0IHx8IGVudHJ5LnJlZ2lzdGVyZWRBdCA+IGxhdGVzdC5yZWdpc3RlcmVkQXQpIGxhdGVzdCA9IGVudHJ5O1xuICB9XG4gIGFjdGl2ZVNvdXJjZUlkID0gbGF0ZXN0Py5zb3VyY2VJZCB8fCAnJztcbiAgcmV0dXJuIGxhdGVzdDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjdGl2ZVNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU291cmNlSWQoKSB7XG4gIHJldHVybiBnZXRBY3RpdmVFbnRyeSgpPy5zb3VyY2VJZCB8fCAnJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25Tb3VyY2VBY3RpdmUoc291cmNlSWQpIHtcbiAgcmV0dXJuIGdldEFjdGl2ZVNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU291cmNlSWQoKSA9PT0gU3RyaW5nKHNvdXJjZUlkIHx8ICcnKTtcbn1cblxuZnVuY3Rpb24gcHVibGlzaERlYnVnKG5leHQgPSB7fSkge1xuICBjb25zdCB3aW4gPSBnZXRXaW5kb3coKTtcbiAgaWYgKCF3aW4pIHJldHVybjtcbiAgY29uc3QgcHJldmlvdXMgPSB3aW4uX19BQlNfU0lNVUxBVElPTl9WSVNVQUxfVFJBTlNJVElPTl9fIHx8IHt9O1xuICB3aW4uX19BQlNfU0lNVUxBVElPTl9WSVNVQUxfVFJBTlNJVElPTl9fID0ge1xuICAgIHBoYXNlOiAnaWRsZScsXG4gICAgc291cmNlSWQ6IGFjdGl2ZVNvdXJjZUlkIHx8ICcnLFxuICAgIHN0YXJ0ZWRBdDogcHJldmlvdXMuc3RhcnRlZEF0IHx8IG5vdygpLFxuICAgIHVwZGF0ZWRBdDogbm93KCksXG4gICAgbWluU2NhbGU6IGluaXRpYWxWaXN1YWxTY2FsZSxcbiAgICBtYXhTY2FsZTogaW5pdGlhbFZpc3VhbFNjYWxlLFxuICAgIHZpc2libGVSYXRpbzogaW5pdGlhbFZpc3VhbFNjYWxlID4gMC4wMiA/IDEgOiAwLFxuICAgIHdhbGxTY2FsZTogMSxcbiAgICAuLi5wcmV2aW91cyxcbiAgICBldmVudHM6IGV2ZW50SGlzdG9yeS5zbGljZSgtTUFYX0VWRU5UX0hJU1RPUlkpLFxuICAgIC4uLm5leHQsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbkV2ZW50KHR5cGUsIGRldGFpbCA9IHt9KSB7XG4gIGNvbnN0IGV2ZW50ID0ge1xuICAgIHR5cGU6IFN0cmluZyh0eXBlIHx8ICdldmVudCcpLFxuICAgIGF0OiBub3coKSxcbiAgICB3YWxsVGltZTogRGF0ZS5ub3coKSxcbiAgICBzb3VyY2VJZDogZGV0YWlsLnNvdXJjZUlkIHx8IGFjdGl2ZVNvdXJjZUlkIHx8ICcnLFxuICAgIHNlcXVlbmNlOiBOdW1iZXIuaXNGaW5pdGUoZGV0YWlsLnNlcXVlbmNlKSA/IGRldGFpbC5zZXF1ZW5jZSA6IHRyYW5zaXRpb25TZXF1ZW5jZSxcbiAgICBkaXJlY3Rpb246IGRldGFpbC5kaXJlY3Rpb24gfHwgJycsXG4gICAgcm91dGVJZDogZGV0YWlsLnJvdXRlSWQgfHwgJycsXG4gICAgcmVhc29uOiBkZXRhaWwucmVhc29uIHx8ICcnLFxuICB9O1xuICBldmVudEhpc3RvcnkgPSBldmVudEhpc3RvcnkuY29uY2F0KGV2ZW50KS5zbGljZSgtTUFYX0VWRU5UX0hJU1RPUlkpO1xuICBwdWJsaXNoRGVidWcoe1xuICAgIGxhc3RFdmVudDogZXZlbnQsXG4gICAgZXZlbnRzOiBldmVudEhpc3Rvcnkuc2xpY2UoLU1BWF9FVkVOVF9ISVNUT1JZKSxcbiAgfSk7XG4gIHJldHVybiBldmVudDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHB1Ymxpc2hTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvblNuYXBzaG90KHNvdXJjZUlkLCBzbmFwc2hvdCA9IHt9KSB7XG4gIGNvbnN0IG5leHQgPSB7XG4gICAgc291cmNlSWQ6IHNvdXJjZUlkIHx8IGFjdGl2ZVNvdXJjZUlkIHx8ICcnLFxuICAgIGRpcmVjdGlvbjogc25hcHNob3QuZGlyZWN0aW9uLFxuICB9O1xuICBpZiAoTnVtYmVyLmlzRmluaXRlKHNuYXBzaG90Lm1pblNjYWxlKSkgbmV4dC5taW5TY2FsZSA9IHNuYXBzaG90Lm1pblNjYWxlO1xuICBpZiAoTnVtYmVyLmlzRmluaXRlKHNuYXBzaG90Lm1heFNjYWxlKSkgbmV4dC5tYXhTY2FsZSA9IHNuYXBzaG90Lm1heFNjYWxlO1xuICBpZiAoTnVtYmVyLmlzRmluaXRlKHNuYXBzaG90LnZpc2libGVSYXRpbykpIG5leHQudmlzaWJsZVJhdGlvID0gc25hcHNob3QudmlzaWJsZVJhdGlvO1xuICBpZiAoTnVtYmVyLmlzRmluaXRlKHNuYXBzaG90LmNvdW50KSkgbmV4dC5jb3VudCA9IHNuYXBzaG90LmNvdW50O1xuICBwdWJsaXNoRGVidWcobmV4dCk7XG59XG5cbmZ1bmN0aW9uIGlzRGFpbHlTaW11bGF0aW9uTGF5ZXJQcmVzZW50KCkge1xuICBjb25zdCBkb2MgPSBnZXREb2N1bWVudCgpO1xuICByZXR1cm4gQm9vbGVhbihkb2M/LnF1ZXJ5U2VsZWN0b3I/LignLmRhaWx5LXNpbXVsYXRpb24tbGF5ZXInKSk7XG59XG5cbmZ1bmN0aW9uIGlzU2ltdWxhdGlvbkZvY3VzU2hlbGxUcmFuc2l0aW9uQWN0aXZlKCkge1xuICBjb25zdCBkb2MgPSBnZXREb2N1bWVudCgpO1xuICByZXR1cm4gQm9vbGVhbihkb2M/LmRvY3VtZW50RWxlbWVudD8uZGF0YXNldD8uYWJzU2ltdWxhdGlvbkZvY3VzVHJhbnNpdGlvbik7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVJbml0aWFsVmlzdWFsU2NhbGVGb3JSZWdpc3RyYXRpb24oKSB7XG4gIGlmIChwcmVmZXJzUmVkdWNlZE1vdGlvbigpKSByZXR1cm4gMTtcbiAgaWYgKGluaXRpYWxWaXN1YWxTY2FsZSA8IDAuOTk5KSByZXR1cm4gaW5pdGlhbFZpc3VhbFNjYWxlO1xuICBpZiAoXG4gICAgZmlyc3REYWlseVJlZ2lzdHJhdGlvblBlbmRpbmdcbiAgICAmJiBpc0RhaWx5U2ltdWxhdGlvbkxheWVyUHJlc2VudCgpXG4gICAgJiYgIWlzU2ltdWxhdGlvbkZvY3VzU2hlbGxUcmFuc2l0aW9uQWN0aXZlKClcbiAgKSB7XG4gICAgcmV0dXJuIDA7XG4gIH1cbiAgcmV0dXJuIGluaXRpYWxWaXN1YWxTY2FsZTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gbWF5YmVSdW5EaXJlY3REYWlseUJvb3RFbnRlcihzb3VyY2VJZCwgc2NhbGUpIHtcbiAgaWYgKHNjYWxlID4gMC4wMDEpIHJldHVybjtcbiAgaWYgKCFpc0RhaWx5U2ltdWxhdGlvbkxheWVyUHJlc2VudCgpIHx8IGlzU2ltdWxhdGlvbkZvY3VzU2hlbGxUcmFuc2l0aW9uQWN0aXZlKCkpIHJldHVybjtcblxuICBjb25zdCB0b2tlbiA9ICsrZGlyZWN0Qm9vdEVudGVyVG9rZW47XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMTIwOyBpICs9IDEpIHtcbiAgICBpZiAodG9rZW4gIT09IGRpcmVjdEJvb3RFbnRlclRva2VuIHx8ICFyZWdpc3RyeS5oYXMoc291cmNlSWQpKSByZXR1cm47XG4gICAgY29uc3QgYm9vdFN0YXRlID0gZ2V0RG9jdW1lbnQoKT8uZG9jdW1lbnRFbGVtZW50Py5kYXRhc2V0Py5hYnNCb290U3RhdGUgfHwgJyc7XG4gICAgaWYgKGJvb3RTdGF0ZSAhPT0gJ2Jvb3RpbmcnKSBicmVhaztcbiAgICBhd2FpdCB3YWl0KDUwKTtcbiAgfVxuICBhd2FpdCBmcmFtZSgpO1xuICBhd2FpdCBmcmFtZSgpO1xuICBpZiAoXG4gICAgdG9rZW4gIT09IGRpcmVjdEJvb3RFbnRlclRva2VuXG4gICAgfHwgIXJlZ2lzdHJ5Lmhhcyhzb3VyY2VJZClcbiAgICB8fCBpc1NpbXVsYXRpb25Gb2N1c1NoZWxsVHJhbnNpdGlvbkFjdGl2ZSgpXG4gICkge1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBydW5TaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbignaW4nLCB7XG4gICAgZHVyYXRpb25NczogREVGQVVMVF9FTlRFUl9NUyxcbiAgICBsb2NhbER1cmF0aW9uTXM6IERFRkFVTFRfRU5URVJfTE9DQUxfTVMsXG4gICAgZWFzaW5nOiBERUZBVUxUX0VOVEVSX0VBU0lORyxcbiAgICByZWFzb246ICdkaXJlY3QtZGFpbHktcm91dGUnLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlZ2lzdGVyU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb24oc291cmNlSWQsIGhhbmRsZXJzID0ge30pIHtcbiAgY29uc3QgaWQgPSBTdHJpbmcoc291cmNlSWQgfHwgYHNpbXVsYXRpb24tJHtyZWdpc3RyeS5zaXplICsgMX1gKTtcbiAgY29uc3QgZW50cnkgPSB7XG4gICAgc291cmNlSWQ6IGlkLFxuICAgIGhhbmRsZXJzLFxuICAgIHJlZ2lzdGVyZWRBdDogbm93KCksXG4gIH07XG4gIHJlZ2lzdHJ5LnNldChpZCwgZW50cnkpO1xuICBhY3RpdmVTb3VyY2VJZCA9IGlkO1xuXG4gIGNvbnN0IHNjYWxlID0gcmVzb2x2ZUluaXRpYWxWaXN1YWxTY2FsZUZvclJlZ2lzdHJhdGlvbigpO1xuICB0cnkge1xuICAgIGhhbmRsZXJzLnNldFZpc3VhbFNjYWxlPy4oc2NhbGUsIHsgaW1tZWRpYXRlOiB0cnVlLCBwaGFzZTogJ3JlZ2lzdGVyZWQnIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHZvaWQgZXJyb3I7XG4gIH1cblxuICBwdWJsaXNoRGVidWcoe1xuICAgIHBoYXNlOiAncmVnaXN0ZXJlZCcsXG4gICAgc291cmNlSWQ6IGlkLFxuICAgIHN0YXJ0ZWRBdDogbm93KCksXG4gICAgbWluU2NhbGU6IHNjYWxlLFxuICAgIG1heFNjYWxlOiBzY2FsZSxcbiAgICB2aXNpYmxlUmF0aW86IHNjYWxlID4gMC4wMiA/IDEgOiAwLFxuICB9KTtcbiAgdm9pZCBtYXliZVJ1bkRpcmVjdERhaWx5Qm9vdEVudGVyKGlkLCBzY2FsZSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uIHVucmVnaXN0ZXJTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbigpIHtcbiAgICBpZiAocmVnaXN0cnkuZ2V0KGlkKSAhPT0gZW50cnkpIHJldHVybjtcbiAgICByZWdpc3RyeS5kZWxldGUoaWQpO1xuICAgIGlmIChhY3RpdmVTb3VyY2VJZCA9PT0gaWQpIHtcbiAgICAgIGFjdGl2ZVNvdXJjZUlkID0gJyc7XG4gICAgICBnZXRBY3RpdmVFbnRyeSgpO1xuICAgIH1cbiAgICBwdWJsaXNoRGVidWcoe1xuICAgICAgcGhhc2U6IHJlZ2lzdHJ5LnNpemUgPyAncmVnaXN0ZXJlZCcgOiAnaWRsZScsXG4gICAgICBzb3VyY2VJZDogYWN0aXZlU291cmNlSWQgfHwgJycsXG4gICAgfSk7XG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRJbml0aWFsU2ltdWxhdGlvblZpc3VhbFNjYWxlKHNjYWxlKSB7XG4gIGluaXRpYWxWaXN1YWxTY2FsZSA9IGNsYW1wMDEoTnVtYmVyKHNjYWxlKSk7XG4gIGNvbnN0IGVudHJ5ID0gZ2V0QWN0aXZlRW50cnkoKTtcbiAgdHJ5IHtcbiAgICBlbnRyeT8uaGFuZGxlcnM/LnNldFZpc3VhbFNjYWxlPy4oaW5pdGlhbFZpc3VhbFNjYWxlLCB7IGltbWVkaWF0ZTogdHJ1ZSwgcGhhc2U6ICdpbml0aWFsJyB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB2b2lkIGVycm9yO1xuICB9XG4gIHB1Ymxpc2hEZWJ1Zyh7XG4gICAgcGhhc2U6ICdpbml0aWFsJyxcbiAgICBtaW5TY2FsZTogaW5pdGlhbFZpc3VhbFNjYWxlLFxuICAgIG1heFNjYWxlOiBpbml0aWFsVmlzdWFsU2NhbGUsXG4gICAgdmlzaWJsZVJhdGlvOiBpbml0aWFsVmlzdWFsU2NhbGUgPiAwLjAyID8gMSA6IDAsXG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SW5pdGlhbFNpbXVsYXRpb25WaXN1YWxTY2FsZSgpIHtcbiAgcmV0dXJuIGluaXRpYWxWaXN1YWxTY2FsZTtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplVGltaW5ncyhkaXJlY3Rpb24sIHRpbWluZ3MgPSB7fSkge1xuICBjb25zdCBpc091dCA9IGRpcmVjdGlvbiA9PT0gJ291dCc7XG4gIGNvbnN0IGR1cmF0aW9uTXMgPSBOdW1iZXIodGltaW5ncy5kdXJhdGlvbk1zID8/IHRpbWluZ3NbaXNPdXQgPyAnZXhpdE1zJyA6ICdlbnRlck1zJ10pO1xuICBjb25zdCBsb2NhbER1cmF0aW9uTXMgPSBOdW1iZXIodGltaW5ncy5sb2NhbER1cmF0aW9uTXMgPz8gdGltaW5nc1tpc091dCA/ICdleGl0TG9jYWxNcycgOiAnZW50ZXJMb2NhbE1zJ10pO1xuICByZXR1cm4ge1xuICAgIGR1cmF0aW9uTXM6IE51bWJlci5pc0Zpbml0ZShkdXJhdGlvbk1zKSA/IE1hdGgubWF4KDAsIGR1cmF0aW9uTXMpIDogKGlzT3V0ID8gREVGQVVMVF9FWElUX01TIDogREVGQVVMVF9FTlRFUl9NUyksXG4gICAgbG9jYWxEdXJhdGlvbk1zOiBOdW1iZXIuaXNGaW5pdGUobG9jYWxEdXJhdGlvbk1zKVxuICAgICAgPyBNYXRoLm1heCgwLCBsb2NhbER1cmF0aW9uTXMpXG4gICAgICA6IChpc091dCA/IERFRkFVTFRfRVhJVF9MT0NBTF9NUyA6IERFRkFVTFRfRU5URVJfTE9DQUxfTVMpLFxuICAgIGVhc2luZzogdGltaW5ncy5lYXNpbmcgfHwgdGltaW5nc1tpc091dCA/ICdleGl0RWFzaW5nJyA6ICdlbnRlckVhc2luZyddIHx8IChpc091dCA/IERFRkFVTFRfRVhJVF9FQVNJTkcgOiBERUZBVUxUX0VOVEVSX0VBU0lORyksXG4gICAgcmVhc29uOiB0aW1pbmdzLnJlYXNvbiB8fCAnJyxcbiAgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uKGRpcmVjdGlvbiwgdGltaW5ncyA9IHt9KSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWREaXJlY3Rpb24gPSBkaXJlY3Rpb24gPT09ICdvdXQnID8gJ291dCcgOiAnaW4nO1xuICBjb25zdCB0YXJnZXRTY2FsZSA9IG5vcm1hbGl6ZWREaXJlY3Rpb24gPT09ICdvdXQnID8gMCA6IDE7XG4gIGNvbnN0IHRyYW5zaXRpb25UaW1pbmdzID0gbm9ybWFsaXplVGltaW5ncyhub3JtYWxpemVkRGlyZWN0aW9uLCB0aW1pbmdzKTtcbiAgY29uc3QgdG9rZW4gPSArK3J1blRva2VuO1xuICBjb25zdCBzZXF1ZW5jZSA9ICsrdHJhbnNpdGlvblNlcXVlbmNlO1xuICBjb25zdCBlbnRyeSA9IGdldEFjdGl2ZUVudHJ5KCk7XG5cbiAgaWYgKHByZWZlcnNSZWR1Y2VkTW90aW9uKCkpIHtcbiAgICBmaXJzdERhaWx5UmVnaXN0cmF0aW9uUGVuZGluZyA9IGZhbHNlO1xuICAgIGluaXRpYWxWaXN1YWxTY2FsZSA9IDE7XG4gICAgcmVjb3JkU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb25FdmVudChgJHtub3JtYWxpemVkRGlyZWN0aW9ufS1jb21wbGV0ZWAsIHtcbiAgICAgIHNvdXJjZUlkOiBlbnRyeT8uc291cmNlSWQgfHwgYWN0aXZlU291cmNlSWQgfHwgJycsXG4gICAgICBzZXF1ZW5jZSxcbiAgICAgIGRpcmVjdGlvbjogbm9ybWFsaXplZERpcmVjdGlvbixcbiAgICAgIHJlYXNvbjogJ3JlZHVjZWQtbW90aW9uJyxcbiAgICB9KTtcbiAgICB0cnkge1xuICAgICAgZW50cnk/LmhhbmRsZXJzPy5zZXRWaXN1YWxTY2FsZT8uKDEsIHsgaW1tZWRpYXRlOiB0cnVlLCBwaGFzZTogJ3JlZHVjZWQtbW90aW9uJyB9KTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdm9pZCBlcnJvcjtcbiAgICB9XG4gICAgcHVibGlzaERlYnVnKHtcbiAgICAgIHBoYXNlOiAnaWRsZScsXG4gICAgICBzb3VyY2VJZDogZW50cnk/LnNvdXJjZUlkIHx8IGFjdGl2ZVNvdXJjZUlkIHx8ICcnLFxuICAgICAgc3RhcnRlZEF0OiBub3coKSxcbiAgICAgIGRpcmVjdGlvbjogbm9ybWFsaXplZERpcmVjdGlvbixcbiAgICAgIG1pblNjYWxlOiAxLFxuICAgICAgbWF4U2NhbGU6IDEsXG4gICAgICB2aXNpYmxlUmF0aW86IDEsXG4gICAgICBzZXF1ZW5jZSxcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICByZWNvcmRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbkV2ZW50KGAke25vcm1hbGl6ZWREaXJlY3Rpb259LXN0YXJ0YCwge1xuICAgIHNvdXJjZUlkOiBlbnRyeT8uc291cmNlSWQgfHwgYWN0aXZlU291cmNlSWQgfHwgJycsXG4gICAgc2VxdWVuY2UsXG4gICAgZGlyZWN0aW9uOiBub3JtYWxpemVkRGlyZWN0aW9uLFxuICAgIHJlYXNvbjogdHJhbnNpdGlvblRpbWluZ3MucmVhc29uLFxuICB9KTtcblxuICBwdWJsaXNoRGVidWcoe1xuICAgIHBoYXNlOiBub3JtYWxpemVkRGlyZWN0aW9uLFxuICAgIHNvdXJjZUlkOiBlbnRyeT8uc291cmNlSWQgfHwgYWN0aXZlU291cmNlSWQgfHwgJycsXG4gICAgc3RhcnRlZEF0OiBub3coKSxcbiAgICBkaXJlY3Rpb246IG5vcm1hbGl6ZWREaXJlY3Rpb24sXG4gICAgZHVyYXRpb25NczogdHJhbnNpdGlvblRpbWluZ3MuZHVyYXRpb25NcyxcbiAgICBsb2NhbER1cmF0aW9uTXM6IHRyYW5zaXRpb25UaW1pbmdzLmxvY2FsRHVyYXRpb25NcyxcbiAgICBzZXF1ZW5jZSxcbiAgfSk7XG5cbiAgY29uc3QgaGFuZGxlciA9IGVudHJ5Py5oYW5kbGVycztcbiAgY29uc3QgdHJhbnNpdGlvbkZuID0gbm9ybWFsaXplZERpcmVjdGlvbiA9PT0gJ291dCcgPyBoYW5kbGVyPy50cmFuc2l0aW9uT3V0IDogaGFuZGxlcj8udHJhbnNpdGlvbkluO1xuICB0cnkge1xuICAgIGNvbnN0IHJ1blByb21pc2UgPSB0eXBlb2YgdHJhbnNpdGlvbkZuID09PSAnZnVuY3Rpb24nXG4gICAgICA/IHRyYW5zaXRpb25Gbih7XG4gICAgICAgIC4uLnRyYW5zaXRpb25UaW1pbmdzLFxuICAgICAgICBkaXJlY3Rpb246IG5vcm1hbGl6ZWREaXJlY3Rpb24sXG4gICAgICAgIHNlcXVlbmNlLFxuICAgICAgfSlcbiAgICAgIDogUHJvbWlzZS5yZXNvbHZlKClcbiAgICAgICAgLnRoZW4oKCkgPT4ge1xuICAgICAgICAgIGlmICh0eXBlb2YgaGFuZGxlcj8uc2V0VmlzdWFsU2NhbGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGhhbmRsZXIuc2V0VmlzdWFsU2NhbGUodGFyZ2V0U2NhbGUsIHsgaW1tZWRpYXRlOiB0cnVlLCBwaGFzZTogbm9ybWFsaXplZERpcmVjdGlvbiB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHdhaXQodHJhbnNpdGlvblRpbWluZ3MuZHVyYXRpb25NcykpO1xuICAgIGF3YWl0IFByb21pc2UucmFjZShbXG4gICAgICBQcm9taXNlLnJlc29sdmUocnVuUHJvbWlzZSkuY2F0Y2goKCkgPT4gdW5kZWZpbmVkKSxcbiAgICAgIHdhaXQodHJhbnNpdGlvblRpbWluZ3MuZHVyYXRpb25NcyArIHRyYW5zaXRpb25UaW1pbmdzLmxvY2FsRHVyYXRpb25NcyArIDE4MCksXG4gICAgXSk7XG4gIH0gZmluYWxseSB7XG4gICAgaWYgKHRva2VuID09PSBydW5Ub2tlbikge1xuICAgICAgY29uc3QgY29tcGxldGlvbkVudHJ5ID0gZ2V0QWN0aXZlRW50cnkoKSB8fCBlbnRyeTtcbiAgICAgIGNvbnN0IGNvbXBsZXRpb25IYW5kbGVyID0gY29tcGxldGlvbkVudHJ5Py5oYW5kbGVycyB8fCBoYW5kbGVyO1xuICAgICAgaW5pdGlhbFZpc3VhbFNjYWxlID0gdGFyZ2V0U2NhbGU7XG4gICAgICBpZiAobm9ybWFsaXplZERpcmVjdGlvbiA9PT0gJ2luJykgZmlyc3REYWlseVJlZ2lzdHJhdGlvblBlbmRpbmcgPSBmYWxzZTtcbiAgICAgIHJlY29yZFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uRXZlbnQoYCR7bm9ybWFsaXplZERpcmVjdGlvbn0tY29tcGxldGVgLCB7XG4gICAgICAgIHNvdXJjZUlkOiBjb21wbGV0aW9uRW50cnk/LnNvdXJjZUlkIHx8IGFjdGl2ZVNvdXJjZUlkIHx8ICcnLFxuICAgICAgICBzZXF1ZW5jZSxcbiAgICAgICAgZGlyZWN0aW9uOiBub3JtYWxpemVkRGlyZWN0aW9uLFxuICAgICAgICByZWFzb246IHRyYW5zaXRpb25UaW1pbmdzLnJlYXNvbixcbiAgICAgIH0pO1xuICAgICAgaWYgKG5vcm1hbGl6ZWREaXJlY3Rpb24gPT09ICdvdXQnKSB7XG4gICAgICAgIHJlY29yZFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uRXZlbnQoJ2hvbGQtc3RhcnQnLCB7XG4gICAgICAgICAgc291cmNlSWQ6IGVudHJ5Py5zb3VyY2VJZCB8fCBhY3RpdmVTb3VyY2VJZCB8fCAnJyxcbiAgICAgICAgICBzZXF1ZW5jZSxcbiAgICAgICAgICBkaXJlY3Rpb246IG5vcm1hbGl6ZWREaXJlY3Rpb24sXG4gICAgICAgICAgcmVhc29uOiB0cmFuc2l0aW9uVGltaW5ncy5yZWFzb24sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgdHJ5IHtcbiAgICAgICAgY29tcGxldGlvbkhhbmRsZXI/LnNldFZpc3VhbFNjYWxlPy4odGFyZ2V0U2NhbGUsIHtcbiAgICAgICAgICBpbW1lZGlhdGU6IHRydWUsXG4gICAgICAgICAgcGhhc2U6IGAke25vcm1hbGl6ZWREaXJlY3Rpb259LWNvbXBsZXRlYCxcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB2b2lkIGVycm9yO1xuICAgICAgfVxuICAgICAgcHVibGlzaERlYnVnKHtcbiAgICAgICAgcGhhc2U6IG5vcm1hbGl6ZWREaXJlY3Rpb24gPT09ICdvdXQnID8gJ2hvbGQnIDogJ2lkbGUnLFxuICAgICAgICBzb3VyY2VJZDogY29tcGxldGlvbkVudHJ5Py5zb3VyY2VJZCB8fCBhY3RpdmVTb3VyY2VJZCB8fCAnJyxcbiAgICAgICAgdXBkYXRlZEF0OiBub3coKSxcbiAgICAgICAgZGlyZWN0aW9uOiBub3JtYWxpemVkRGlyZWN0aW9uLFxuICAgICAgICBtaW5TY2FsZTogdGFyZ2V0U2NhbGUsXG4gICAgICAgIG1heFNjYWxlOiB0YXJnZXRTY2FsZSxcbiAgICAgICAgdmlzaWJsZVJhdGlvOiB0YXJnZXRTY2FsZSA+IDAuMDIgPyAxIDogMCxcbiAgICAgICAgc2VxdWVuY2UsXG4gICAgICB9KTtcbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VDdWJpY0JlemllcihlYXNpbmcpIHtcbiAgY29uc3QgbWF0Y2ggPSBTdHJpbmcoZWFzaW5nIHx8ICcnKS5tYXRjaCgvY3ViaWMtYmV6aWVyXFwoKFteKV0rKVxcKS9pKTtcbiAgaWYgKCFtYXRjaCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHZhbHVlcyA9IG1hdGNoWzFdLnNwbGl0KCcsJykubWFwKCh2YWx1ZSkgPT4gTnVtYmVyLnBhcnNlRmxvYXQodmFsdWUudHJpbSgpKSk7XG4gIGlmICh2YWx1ZXMubGVuZ3RoICE9PSA0IHx8IHZhbHVlcy5zb21lKCh2YWx1ZSkgPT4gIU51bWJlci5pc0Zpbml0ZSh2YWx1ZSkpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHZhbHVlcztcbn1cblxuZnVuY3Rpb24gY3ViaWNCZXppZXJBdCh0LCBwMXgsIHAxeSwgcDJ4LCBwMnkpIHtcbiAgY29uc3QgY3ggPSAzICogcDF4O1xuICBjb25zdCBieCA9IDMgKiAocDJ4IC0gcDF4KSAtIGN4O1xuICBjb25zdCBheCA9IDEgLSBjeCAtIGJ4O1xuICBjb25zdCBjeSA9IDMgKiBwMXk7XG4gIGNvbnN0IGJ5ID0gMyAqIChwMnkgLSBwMXkpIC0gY3k7XG4gIGNvbnN0IGF5ID0gMSAtIGN5IC0gYnk7XG5cbiAgbGV0IHggPSB0O1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkgKz0gMSkge1xuICAgIGNvbnN0IGVzdGltYXRlID0gKChheCAqIHggKyBieCkgKiB4ICsgY3gpICogeCAtIHQ7XG4gICAgY29uc3QgZGVyaXZhdGl2ZSA9ICgzICogYXggKiB4ICsgMiAqIGJ4KSAqIHggKyBjeDtcbiAgICBpZiAoTWF0aC5hYnMoZXN0aW1hdGUpIDwgMC4wMDAxIHx8IE1hdGguYWJzKGRlcml2YXRpdmUpIDwgMC4wMDAxKSBicmVhaztcbiAgICB4ID0gY2xhbXAwMSh4IC0gZXN0aW1hdGUgLyBkZXJpdmF0aXZlKTtcbiAgfVxuICByZXR1cm4gY2xhbXAwMSgoKGF5ICogeCArIGJ5KSAqIHggKyBjeSkgKiB4KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVhc2VTaW11bGF0aW9uVmlzdWFsUHJvZ3Jlc3MoZWFzaW5nLCBwcm9ncmVzcywgZGlyZWN0aW9uID0gJ2luJykge1xuICBjb25zdCB0ID0gY2xhbXAwMShwcm9ncmVzcyk7XG4gIGNvbnN0IGJlemllciA9IHBhcnNlQ3ViaWNCZXppZXIoZWFzaW5nKTtcbiAgaWYgKGJlemllcikgcmV0dXJuIGN1YmljQmV6aWVyQXQodCwgYmV6aWVyWzBdLCBiZXppZXJbMV0sIGJlemllclsyXSwgYmV6aWVyWzNdKTtcbiAgaWYgKGRpcmVjdGlvbiA9PT0gJ291dCcpIHJldHVybiB0ICogdCAqIHQ7XG4gIGNvbnN0IGludmVyc2UgPSAxIC0gdDtcbiAgcmV0dXJuIDEgLSAoaW52ZXJzZSAqIGludmVyc2UgKiBpbnZlcnNlKTtcbn1cblxuZnVuY3Rpb24gaGFzaFVuaXQoc2VlZCwgaW5kZXgpIHtcbiAgY29uc3QgeCA9IE1hdGguc2luKChOdW1iZXIoc2VlZCkgKyAxKSAqIDEyLjk4OTggKyAoaW5kZXggKyAxKSAqIDc4LjIzMykgKiA0Mzc1OC41NDUzO1xuICByZXR1cm4geCAtIE1hdGguZmxvb3IoeCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVJbmRleGVkU2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb24oe1xuICBzb3VyY2VJZCxcbiAgZ2V0Q291bnQsXG4gIHNldFNjYWxlQXQsXG4gIHJlcXVlc3RSZW5kZXIsXG4gIGdldFNlZWQsXG59ID0ge30pIHtcbiAgY29uc3QgaWQgPSBTdHJpbmcoc291cmNlSWQgfHwgJ3NpbXVsYXRpb24nKTtcbiAgbGV0IHNjYWxlcyA9IFtdO1xuICBsZXQgZGVsYXlzID0gW107XG4gIGxldCBjdXJyZW50U2NhbGUgPSBpbml0aWFsVmlzdWFsU2NhbGU7XG4gIGxldCBmcmFtZUlkID0gMDtcbiAgbGV0IHRva2VuID0gMDtcbiAgbGV0IHNuYXBzaG90ID0ge1xuICAgIGNvdW50OiAwLFxuICAgIG1pblNjYWxlOiBjdXJyZW50U2NhbGUsXG4gICAgbWF4U2NhbGU6IGN1cnJlbnRTY2FsZSxcbiAgICB2aXNpYmxlUmF0aW86IGN1cnJlbnRTY2FsZSA+IDAuMDIgPyAxIDogMCxcbiAgICBkaXJlY3Rpb246ICdpZGxlJyxcbiAgfTtcblxuICBjb25zdCBjYW5jZWxGcmFtZSA9ICgpID0+IHtcbiAgICBjb25zdCB3aW4gPSBnZXRXaW5kb3coKTtcbiAgICBpZiAoZnJhbWVJZCAmJiB3aW4/LmNhbmNlbEFuaW1hdGlvbkZyYW1lKSB7XG4gICAgICB3aW4uY2FuY2VsQW5pbWF0aW9uRnJhbWUoZnJhbWVJZCk7XG4gICAgfVxuICAgIGZyYW1lSWQgPSAwO1xuICB9O1xuXG4gIGNvbnN0IGdldFJlc29sdmVkQ291bnQgPSAoKSA9PiB7XG4gICAgY29uc3QgY291bnQgPSBOdW1iZXIoZ2V0Q291bnQ/LigpKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKGNvdW50KSA/IE1hdGgubWF4KDAsIE1hdGguZmxvb3IoY291bnQpKSA6IDA7XG4gIH07XG5cbiAgY29uc3QgZW5zdXJlQ291bnQgPSAoZmlsbFNjYWxlID0gY3VycmVudFNjYWxlKSA9PiB7XG4gICAgY29uc3QgY291bnQgPSBnZXRSZXNvbHZlZENvdW50KCk7XG4gICAgaWYgKHNjYWxlcy5sZW5ndGggIT09IGNvdW50KSB7XG4gICAgICBzY2FsZXMgPSBuZXcgQXJyYXkoY291bnQpO1xuICAgICAgZGVsYXlzID0gbmV3IEFycmF5KGNvdW50KTtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkgKz0gMSkge1xuICAgICAgICBzY2FsZXNbaV0gPSBmaWxsU2NhbGU7XG4gICAgICAgIGRlbGF5c1tpXSA9IDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb3VudDtcbiAgfTtcblxuICBjb25zdCBhcHBseVNjYWxlID0gKGluZGV4LCBzY2FsZSkgPT4ge1xuICAgIHNjYWxlc1tpbmRleF0gPSBzY2FsZTtcbiAgICB0cnkge1xuICAgICAgc2V0U2NhbGVBdD8uKGluZGV4LCBzY2FsZSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHZvaWQgZXJyb3I7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IHVwZGF0ZVNuYXBzaG90ID0gKGRpcmVjdGlvbiA9ICdpZGxlJykgPT4ge1xuICAgIGNvbnN0IGNvdW50ID0gc2NhbGVzLmxlbmd0aDtcbiAgICBsZXQgbWluU2NhbGUgPSBjb3VudCA/IDEgOiBjdXJyZW50U2NhbGU7XG4gICAgbGV0IG1heFNjYWxlID0gY291bnQgPyAwIDogY3VycmVudFNjYWxlO1xuICAgIGxldCB2aXNpYmxlID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpICs9IDEpIHtcbiAgICAgIGNvbnN0IHNjYWxlID0gc2NhbGVzW2ldID8/IGN1cnJlbnRTY2FsZTtcbiAgICAgIGlmIChzY2FsZSA8IG1pblNjYWxlKSBtaW5TY2FsZSA9IHNjYWxlO1xuICAgICAgaWYgKHNjYWxlID4gbWF4U2NhbGUpIG1heFNjYWxlID0gc2NhbGU7XG4gICAgICBpZiAoc2NhbGUgPiAwLjAyKSB2aXNpYmxlICs9IDE7XG4gICAgfVxuICAgIHNuYXBzaG90ID0ge1xuICAgICAgY291bnQsXG4gICAgICBtaW5TY2FsZSxcbiAgICAgIG1heFNjYWxlLFxuICAgICAgdmlzaWJsZVJhdGlvOiBjb3VudCA/IHZpc2libGUgLyBjb3VudCA6IChjdXJyZW50U2NhbGUgPiAwLjAyID8gMSA6IDApLFxuICAgICAgZGlyZWN0aW9uLFxuICAgIH07XG4gICAgcHVibGlzaFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uU25hcHNob3QoaWQsIHNuYXBzaG90KTtcbiAgfTtcblxuICBjb25zdCByZW5kZXIgPSAoKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVlc3RSZW5kZXI/LigpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB2b2lkIGVycm9yO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBzZXRWaXN1YWxTY2FsZSA9IChzY2FsZSkgPT4ge1xuICAgIGNhbmNlbEZyYW1lKCk7XG4gICAgdG9rZW4gKz0gMTtcbiAgICBjdXJyZW50U2NhbGUgPSBjbGFtcDAxKE51bWJlcihzY2FsZSkpO1xuICAgIGNvbnN0IGNvdW50ID0gZW5zdXJlQ291bnQoY3VycmVudFNjYWxlKTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpICs9IDEpIHtcbiAgICAgIGFwcGx5U2NhbGUoaSwgY3VycmVudFNjYWxlKTtcbiAgICB9XG4gICAgdXBkYXRlU25hcHNob3QoJ2lkbGUnKTtcbiAgICByZW5kZXIoKTtcbiAgfTtcblxuICBjb25zdCB0cmFuc2l0aW9uID0gKGRpcmVjdGlvbiwgdGltaW5ncyA9IHt9KSA9PiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNhbmNlbEZyYW1lKCk7XG4gICAgY29uc3Qgd2luID0gZ2V0V2luZG93KCk7XG4gICAgY29uc3QgbG9jYWxUb2tlbiA9ICsrdG9rZW47XG4gICAgY29uc3QgY291bnQgPSBlbnN1cmVDb3VudChkaXJlY3Rpb24gPT09ICdpbicgPyAwIDogY3VycmVudFNjYWxlKTtcbiAgICBjb25zdCBkdXJhdGlvbk1zID0gTWF0aC5tYXgoMCwgTnVtYmVyKHRpbWluZ3MuZHVyYXRpb25NcykgfHwgKGRpcmVjdGlvbiA9PT0gJ291dCcgPyBERUZBVUxUX0VYSVRfTVMgOiBERUZBVUxUX0VOVEVSX01TKSk7XG4gICAgY29uc3QgbG9jYWxEdXJhdGlvbk1zID0gTWF0aC5tYXgoMSwgTnVtYmVyKHRpbWluZ3MubG9jYWxEdXJhdGlvbk1zKSB8fCAoZGlyZWN0aW9uID09PSAnb3V0JyA/IERFRkFVTFRfRVhJVF9MT0NBTF9NUyA6IERFRkFVTFRfRU5URVJfTE9DQUxfTVMpKTtcbiAgICBjb25zdCBlYXNpbmcgPSB0aW1pbmdzLmVhc2luZyB8fCAoZGlyZWN0aW9uID09PSAnb3V0JyA/IERFRkFVTFRfRVhJVF9FQVNJTkcgOiBERUZBVUxUX0VOVEVSX0VBU0lORyk7XG4gICAgY29uc3Qgc3RhZ2dlcldpbmRvdyA9IE1hdGgubWF4KDAsIGR1cmF0aW9uTXMgLSBsb2NhbER1cmF0aW9uTXMpO1xuICAgIGNvbnN0IGZyb20gPSBkaXJlY3Rpb24gPT09ICdvdXQnID8gMSA6IDA7XG4gICAgY29uc3QgdG8gPSBkaXJlY3Rpb24gPT09ICdvdXQnID8gMCA6IDE7XG4gICAgY29uc3Qgc2VlZCA9IE51bWJlcihnZXRTZWVkPy4oKSkgfHwgdGltaW5ncy5zZXF1ZW5jZSB8fCB0cmFuc2l0aW9uU2VxdWVuY2UgfHwgMTtcblxuICAgIGlmICghd2luPy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgY291bnQgPD0gMCB8fCBkdXJhdGlvbk1zIDw9IDApIHtcbiAgICAgIGN1cnJlbnRTY2FsZSA9IHRvO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSArPSAxKSBhcHBseVNjYWxlKGksIHRvKTtcbiAgICAgIHVwZGF0ZVNuYXBzaG90KGRpcmVjdGlvbik7XG4gICAgICByZW5kZXIoKTtcbiAgICAgIHJlc29sdmUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvdW50OyBpICs9IDEpIHtcbiAgICAgIGRlbGF5c1tpXSA9IGhhc2hVbml0KHNlZWQsIGkpICogc3RhZ2dlcldpbmRvdztcbiAgICAgIGFwcGx5U2NhbGUoaSwgZnJvbSk7XG4gICAgfVxuICAgIHVwZGF0ZVNuYXBzaG90KGRpcmVjdGlvbik7XG4gICAgcmVuZGVyKCk7XG5cbiAgICBjb25zdCBzdGFydGVkQXQgPSBub3coKTtcbiAgICBjb25zdCBzdGVwID0gKCkgPT4ge1xuICAgICAgaWYgKGxvY2FsVG9rZW4gIT09IHRva2VuKSB7XG4gICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBlbGFwc2VkID0gbm93KCkgLSBzdGFydGVkQXQ7XG4gICAgICBsZXQgZG9uZSA9IHRydWU7XG4gICAgICBsZXQgc3VtID0gMDtcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY291bnQ7IGkgKz0gMSkge1xuICAgICAgICBjb25zdCBsb2NhbFByb2dyZXNzID0gY2xhbXAwMSgoZWxhcHNlZCAtIGRlbGF5c1tpXSkgLyBsb2NhbER1cmF0aW9uTXMpO1xuICAgICAgICBpZiAobG9jYWxQcm9ncmVzcyA8IDEpIGRvbmUgPSBmYWxzZTtcbiAgICAgICAgY29uc3QgZWFzZWQgPSBlYXNlU2ltdWxhdGlvblZpc3VhbFByb2dyZXNzKGVhc2luZywgbG9jYWxQcm9ncmVzcywgZGlyZWN0aW9uKTtcbiAgICAgICAgY29uc3Qgc2NhbGUgPSBmcm9tICsgKCh0byAtIGZyb20pICogZWFzZWQpO1xuICAgICAgICBzdW0gKz0gc2NhbGU7XG4gICAgICAgIGFwcGx5U2NhbGUoaSwgc2NhbGUpO1xuICAgICAgfVxuICAgICAgY3VycmVudFNjYWxlID0gY291bnQgPiAwID8gc3VtIC8gY291bnQgOiB0bztcbiAgICAgIHVwZGF0ZVNuYXBzaG90KGRpcmVjdGlvbik7XG4gICAgICByZW5kZXIoKTtcblxuICAgICAgaWYgKGRvbmUgfHwgZWxhcHNlZCA+PSBkdXJhdGlvbk1zICsgMzIpIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb3VudDsgaSArPSAxKSBhcHBseVNjYWxlKGksIHRvKTtcbiAgICAgICAgY3VycmVudFNjYWxlID0gdG87XG4gICAgICAgIHVwZGF0ZVNuYXBzaG90KGRpcmVjdGlvbik7XG4gICAgICAgIHJlbmRlcigpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGZyYW1lSWQgPSB3aW4ucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHN0ZXApO1xuICAgIH07XG5cbiAgICBmcmFtZUlkID0gd2luLnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBzZXRWaXN1YWxTY2FsZSxcbiAgICB0cmFuc2l0aW9uT3V0OiAodGltaW5ncykgPT4gdHJhbnNpdGlvbignb3V0JywgdGltaW5ncyksXG4gICAgdHJhbnNpdGlvbkluOiAodGltaW5ncykgPT4gdHJhbnNpdGlvbignaW4nLCB0aW1pbmdzKSxcbiAgICBnZXRTY2FsZUF0OiAoaW5kZXgpID0+IHNjYWxlc1tpbmRleF0gPz8gY3VycmVudFNjYWxlLFxuICAgIGdldFNuYXBzaG90OiAoKSA9PiAoeyAuLi5zbmFwc2hvdCB9KSxcbiAgICBkZXN0cm95OiBjYW5jZWxGcmFtZSxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzNCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUM1QixLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzFCLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNqQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDbEMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDL0QsS0FBSyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RCxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEdBQUc7O0FBRTdCLE1BQU0sQ0FBQyxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDbkUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWU7QUFDekIsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLGdCQUFnQjtBQUMzQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZTtBQUN6QixDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMscUJBQXFCO0FBQ3BDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxzQkFBc0I7QUFDdEMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLG1CQUFtQjtBQUNqQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsb0JBQW9CO0FBQ25DLENBQUMsQ0FBQzs7QUFFRixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDMUIsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3hDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFckIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUNkOztBQUVBLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUN0RDs7QUFFQSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDMUQ7O0FBRUEsUUFBUSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDaEIsQ0FBQyxDQUFDO0FBQ0Y7O0FBRUEsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQztBQUN2QyxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNuQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDM0UsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU07QUFDZjs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLDJDQUEyQyxDQUFDLENBQUMsQ0FBQztBQUM5RCxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsd0NBQXdDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLE1BQU0sQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGOztBQUVBLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNO0FBQ2xCLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ1gsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsaUJBQWlCLENBQUM7QUFDckUsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ2Q7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTO0FBQ2pDLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVE7QUFDM0UsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVE7QUFDM0UsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVk7QUFDdkYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUs7QUFDbEUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7QUFDcEI7O0FBRUEsUUFBUSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2pFOztBQUVBLFFBQVEsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLDRCQUE0QixDQUFDO0FBQzdFOztBQUVBLFFBQVEsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0I7QUFDM0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCO0FBQzNCOztBQUVBLEtBQUssQ0FBQyxRQUFRLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU07QUFDM0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07O0FBRTFGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0FBQ3RDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDbEIsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVE7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQ0FBc0MsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ1YsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0I7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxzQkFBc0I7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxvQkFBb0I7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSjs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLGtDQUFrQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDekIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsRUFBRTs7QUFFckIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLHdDQUF3QyxDQUFDLENBQUM7QUFDMUQsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNkLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUU7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUs7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDOztBQUU5QyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTTtBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsK0JBQStCLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNkLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsa0JBQWtCO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0o7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0I7QUFDM0I7O0FBRUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDbkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQzVHLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDO0FBQ3BILENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWU7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO0FBQ25JLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLENBQUMsT0FBTyxDQUFDO0FBQzFFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMxQixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQjtBQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7O0FBRWhDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLG1CQUFtQjtBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsbUJBQW1CO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNWLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxtQkFBbUI7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsbUJBQW1CO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLG1CQUFtQjtBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLFVBQVU7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVE7QUFDakMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxZQUFZO0FBQ3JHLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxtQkFBbUI7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO0FBQ2hHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3ZELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU87QUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDN0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUNBQXFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsbUJBQW1CO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsbUJBQW1CO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsaUJBQWlCLENBQUMsTUFBTTtBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQzlELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLG1CQUFtQjtBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ3pGLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTTtBQUNmOztBQUVBLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNwQixDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDakMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3hCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDcEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRTs7QUFFeEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUs7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQzFDLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5Qzs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzdCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7QUFDekMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUMxQzs7QUFFQSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJO0FBQ3RGLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUMx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QyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUM7O0FBRUgsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDWixDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQzVILENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbEosQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDO0FBQ3ZHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDWixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRVosQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUM7QUFDOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDcEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDOztBQUVkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUwsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFdBQVc7QUFDeEIsQ0FBQyxDQUFDLENBQUM7QUFDSDsifQ==