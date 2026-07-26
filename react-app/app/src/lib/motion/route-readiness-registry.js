const readinessEntries = new Map();

const PRIORITY_STAGES = Object.freeze({
  data: 'data',
  media: 'media',
  intent: 'media',
  navigation: 'media',
});

function roundDpr(value) {
  const dpr = Number(value) || 1;
  if (dpr >= 2.5) return 3;
  if (dpr >= 1.5) return 2;
  return 1;
}

function readViewportClass() {
  const width = typeof window === 'undefined' ? 1280 : window.innerWidth;
  if (width <= 767) return 'mobile';
  if (width <= 1023) return 'tablet';
  return 'desktop';
}

function readTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-abs-theme') || 'light';
}

function readConfigRevision() {
  if (typeof document === 'undefined') return '1';
  return document.documentElement.dataset.absDesignConfigRevision || '1';
}

function publishDiagnostics() {
  if (typeof window === 'undefined') return;
  window.__ABS_ROUTE_READINESS__ = {
    keys: [...readinessEntries.keys()],
    entries: [...readinessEntries.entries()].map(([key, entry]) => ({
      key,
      routeId: entry.routeId,
      contentSignature: entry.contentSignature,
      stages: [...entry.stages.entries()].map(([stage, job]) => ({
        stage,
        status: job.status,
        reason: job.reason,
        startedAt: job.startedAt,
        settledAt: job.settledAt,
      })),
    })),
  };
}

export function createRouteReadinessKey({
  routeId,
  contentSignature = routeId,
  viewportClass = readViewportClass(),
  dpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio,
  theme = readTheme(),
  configRevision = readConfigRevision(),
} = {}) {
  return [
    String(routeId || 'unknown'),
    String(contentSignature || routeId || 'unknown'),
    String(viewportClass),
    `dpr-${roundDpr(dpr)}`,
    String(theme),
    `config-${configRevision}`,
  ].join('|');
}

function waitForCaller(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) {
    return Promise.reject(new DOMException('Route prewarm aborted.', 'AbortError'));
  }
  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      signal.removeEventListener('abort', handleAbort);
      reject(new DOMException('Route prewarm aborted.', 'AbortError'));
    };
    signal.addEventListener('abort', handleAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', handleAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', handleAbort);
        reject(error);
      },
    );
  });
}

export function prewarmRouteReadiness({
  routeId,
  contentSignature,
  priority = 'data',
  reason = 'unknown',
  signal = null,
  prepare,
} = {}) {
  if (typeof prepare !== 'function') return Promise.resolve(false);

  const key = createRouteReadinessKey({ routeId, contentSignature });
  const stage = PRIORITY_STAGES[priority] || 'data';
  let entry = readinessEntries.get(key);
  if (!entry) {
    entry = {
      routeId,
      contentSignature,
      stages: new Map(),
    };
    readinessEntries.set(key, entry);
  }

  const mediaJob = entry.stages.get('media');
  const cached = stage === 'data'
    ? (mediaJob || entry.stages.get('data'))
    : mediaJob;
  if (cached) return waitForCaller(cached.promise, signal);

  const controller = new AbortController();
  const job = {
    status: 'loading',
    reason,
    startedAt: typeof performance === 'undefined' ? Date.now() : performance.now(),
    settledAt: 0,
    controller,
    promise: null,
  };
  const pending = Promise.resolve()
    .then(() => prepare({
      signal: controller.signal,
      reason,
      priority,
      stage,
    }))
    .then((result) => {
      if (result === false) {
        throw new Error(`Route prewarm returned an unusable result for "${routeId}".`);
      }
      job.status = 'ready';
      job.settledAt = typeof performance === 'undefined' ? Date.now() : performance.now();
      publishDiagnostics();
      return result ?? true;
    })
    .catch((error) => {
      if (entry.stages.get(stage) === job) entry.stages.delete(stage);
      if (entry.stages.size === 0) readinessEntries.delete(key);
      publishDiagnostics();
      throw error;
    });
  job.promise = pending;
  entry.stages.set(stage, job);
  publishDiagnostics();
  return waitForCaller(pending, signal);
}

export function readRouteReadinessDiagnostics() {
  return typeof window === 'undefined' ? null : window.__ABS_ROUTE_READINESS__ || null;
}

export function clearRouteReadinessRegistry() {
  readinessEntries.forEach((entry) => {
    entry.stages.forEach((job) => job.controller.abort('registry-cleared'));
  });
  readinessEntries.clear();
  publishDiagnostics();
}
