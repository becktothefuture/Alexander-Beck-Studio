const EMPTY_FIELDS = Object.freeze({});
const NOOP = () => {};

/**
 * Production keeps rendering but intentionally owns no authoring, fault, or
 * certification telemetry. Vite aliases this file in the deployable build.
 */
export function createAboutNarrativeRuntimeObserver({ renderer, scene, camera } = {}) {
  if (!renderer || typeof renderer.render !== 'function') {
    throw new TypeError('Runtime observers need a renderer.');
  }
  return Object.freeze({
    dispose: NOOP,
    getLifecycleFields: () => EMPTY_FIELDS,
    getMetrics: () => EMPTY_FIELDS,
    hotFrameDomQuery: NOOP,
    hotFrameDomWrite: NOOP,
    hotFrameOwnedAllocation: NOOP,
    hotFrameStarted: NOOP,
    pairInstalled: NOOP,
    render: () => renderer.render(scene, camera),
    reset: NOOP,
    resetHotFrameMetrics: NOOP,
    workerMessage: NOOP,
    workerStarted: NOOP,
    workerTerminated: NOOP,
    workerTimedOut: NOOP,
  });
}
