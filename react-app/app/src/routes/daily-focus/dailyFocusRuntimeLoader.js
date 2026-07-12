const RUNTIME_LOADERS = Object.freeze({
  'beach-ball-room': () => import('../beach-ball-room/BeachBallRoomRuntime.jsx'),
  'napoleon-point-cloud': () => import('../concept-simulations/NapoleonPointCloudRuntime.jsx'),
  'rift-rings': () => import('../concept-simulations/RiftRingsRuntime.jsx'),
  'flock-of-birds': () => import('../flock-of-birds/FlockOfBirdsRuntime.jsx'),
  'mineral-growth': () => import('../mineral-growth/MineralGrowthRuntime.jsx'),
  'repel-room': () => import('../repel-room/RepelRoomRuntime.jsx'),
});

export const DAILY_FOCUS_RUNTIME_EXPORTS = Object.freeze({
  'beach-ball-room': 'BeachBallRoomRuntime',
  'napoleon-point-cloud': 'NapoleonPointCloudRuntime',
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
  const exportName = DAILY_FOCUS_RUNTIME_EXPORTS[simulationId];
  if (!loader || !exportName) throw new Error(`Unknown Daily Simulation runtime "${simulationId}"`);
  if (runtimeModuleCache.has(simulationId)) return runtimeModuleCache.get(simulationId);
  if (runtimeLoadPromises.has(simulationId)) return runtimeLoadPromises.get(simulationId);

  const promise = (async () => {
    let lastError = null;
    publishRuntimeLoadState(simulationId, 'loading');
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        const module = await loader();
        if (typeof module?.[exportName] !== 'function') {
          throw new Error(`Daily Simulation runtime "${simulationId}" is missing ${exportName}`);
        }
        runtimeModuleCache.set(simulationId, module);
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
