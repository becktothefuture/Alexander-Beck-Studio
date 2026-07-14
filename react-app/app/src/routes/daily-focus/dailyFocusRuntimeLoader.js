const RUNTIME_LOADERS = Object.freeze({
  'beach-ball-room': () => import('../beach-ball-room/BeachBallRoomRuntime.jsx'),
  'rift-rings': () => import('../concept-simulations/RiftRingsRuntime.jsx'),
  'flock-of-birds': () => import('../flock-of-birds/FlockOfBirdsRuntime.jsx'),
  'mineral-growth': () => import('../mineral-growth/MineralGrowthRuntime.jsx'),
  'repel-room': () => import('../repel-room/RepelRoomRuntime.jsx'),
});

// Safari/WebKit can cache a rejected module URL for the lifetime of a tab. These
// deliberately separate Vite chunks give automatic and user retries fresh URLs.
const RUNTIME_RETRY_LOADERS = Object.freeze({
  'beach-ball-room': () => import('../beach-ball-room/BeachBallRoomRuntime.jsx?runtime-retry'),
  'rift-rings': () => import('../concept-simulations/RiftRingsRuntime.jsx?runtime-retry'),
  'flock-of-birds': () => import('../flock-of-birds/FlockOfBirdsRuntime.jsx?runtime-retry'),
  'mineral-growth': () => import('../mineral-growth/MineralGrowthRuntime.jsx?runtime-retry'),
  'repel-room': () => import('../repel-room/RepelRoomRuntime.jsx?runtime-retry'),
});

const RUNTIME_USER_RETRY_LOADERS = Object.freeze({
  'beach-ball-room': () => import('../beach-ball-room/BeachBallRoomRuntime.jsx?runtime-user-retry'),
  'rift-rings': () => import('../concept-simulations/RiftRingsRuntime.jsx?runtime-user-retry'),
  'flock-of-birds': () => import('../flock-of-birds/FlockOfBirdsRuntime.jsx?runtime-user-retry'),
  'mineral-growth': () => import('../mineral-growth/MineralGrowthRuntime.jsx?runtime-user-retry'),
  'repel-room': () => import('../repel-room/RepelRoomRuntime.jsx?runtime-user-retry'),
});

const USER_RETRY_STORAGE_KEY = 'abs_daily_runtime_user_retry_v1';

export const DAILY_FOCUS_RUNTIME_EXPORTS = Object.freeze({
  'beach-ball-room': 'BeachBallRoomRuntime',
  'rift-rings': 'RiftRingsRuntime',
  'flock-of-birds': 'FlockOfBirdsRuntime',
  'mineral-growth': 'MineralGrowthRuntime',
  'repel-room': 'RepelRoomRuntime',
});

const runtimeModuleCache = new Map();
const runtimeLoadPromises = new Map();

function publishRuntimeLoadState(simulationId, status, error = null) {
  if (typeof window === 'undefined') return;
  const snapshot = Object.freeze({
    simulationId,
    status,
    error: error?.message || '',
    at: performance.now(),
  });
  window.__ABS_DAILY_RUNTIME_LOAD__ = snapshot;
  window.dispatchEvent(new CustomEvent('abs:daily-runtime-load', { detail: snapshot }));
}

function waitForRetryDelay(ms = 140) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function loadDailyFocusRuntimeModule(simulationId, attempts = 2) {
  const loader = RUNTIME_LOADERS[simulationId];
  const retryLoader = RUNTIME_RETRY_LOADERS[simulationId] || loader;
  let userRetryRequested = false;
  try {
    userRetryRequested = sessionStorage.getItem(USER_RETRY_STORAGE_KEY) === simulationId;
  } catch {
    userRetryRequested = false;
  }
  const userRetryLoader = RUNTIME_USER_RETRY_LOADERS[simulationId] || retryLoader;
  const exportName = DAILY_FOCUS_RUNTIME_EXPORTS[simulationId];
  if (!loader || !exportName) throw new Error(`Unknown Daily Simulation runtime "${simulationId}"`);
  if (runtimeModuleCache.has(simulationId)) return runtimeModuleCache.get(simulationId);
  if (runtimeLoadPromises.has(simulationId)) return runtimeLoadPromises.get(simulationId);

  const promise = (async () => {
    let lastError = null;
    publishRuntimeLoadState(simulationId, 'loading');
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const attemptLoader = userRetryRequested
          ? userRetryLoader
          : (attempt === 1 ? loader : retryLoader);
        const module = await attemptLoader();
        if (typeof module?.[exportName] !== 'function') {
          throw new Error(`Daily Simulation runtime "${simulationId}" is missing ${exportName}`);
        }
        runtimeModuleCache.set(simulationId, module);
        try {
          if (userRetryRequested) sessionStorage.removeItem(USER_RETRY_STORAGE_KEY);
        } catch {
          // Storage is optional; a successful module is already cached in memory.
        }
        publishRuntimeLoadState(simulationId, 'ready');
        return module;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          publishRuntimeLoadState(simulationId, 'retrying', error);
          await waitForRetryDelay();
        }
      }
    }
    publishRuntimeLoadState(simulationId, 'failed', lastError);
    throw lastError || new Error(`Daily Simulation runtime "${simulationId}" failed to load`);
  })().finally(() => {
    runtimeLoadPromises.delete(simulationId);
  });

  runtimeLoadPromises.set(simulationId, promise);
  return promise;
}

export function preloadDailyFocusRuntime(simulationId) {
  return loadDailyFocusRuntimeModule(simulationId);
}

export function hasDailyFocusRuntime(simulationId) {
  return Boolean(RUNTIME_LOADERS[simulationId]);
}

export function publishDailyFocusRuntimeFailure(simulationId, error) {
  publishRuntimeLoadState(simulationId, 'failed', error);
}

export function requestDailyFocusRuntimeDocumentRetry(simulationId) {
  try {
    sessionStorage.setItem(USER_RETRY_STORAGE_KEY, simulationId);
  } catch {
    // The cache-busting launch URL below still forces a fresh document.
  }
}
