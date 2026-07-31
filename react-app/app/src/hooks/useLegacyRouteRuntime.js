import { useEffect, useRef } from 'react';
import { createLegacyRuntimeScope } from '../lib/legacy-runtime-scope.js';

let nextRuntimeGeneration = 0;
const runtimeModulePromises = new WeakMap();
let activeRuntimeSnapshot = Object.freeze({
  routeId: null,
  generation: 0,
  status: 'idle',
});

export function getActiveLegacyRuntimeSnapshot() {
  return activeRuntimeSnapshot;
}

function publishRuntimeLifecycle(routeId, generation, status) {
  if (generation !== activeRuntimeSnapshot.generation) return;

  activeRuntimeSnapshot = Object.freeze({ routeId, generation, status });
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  root.dataset.absRuntimeRoute = routeId;
  root.dataset.absRuntimeGeneration = String(generation);
  root.dataset.absRuntimeStatus = status;
  window.__ABS_RUNTIME_LIFECYCLE__ = activeRuntimeSnapshot;

  if (routeId === 'home' && status !== 'ready') {
    root.dataset.absHomeRouteReady = 'false';
    root.dataset.absHomeSimulationReady = 'false';
    root.dataset.absHomeCanvasTitlePrepared = 'false';
    root.dataset.absHomeCanvasTitleReady = 'false';
  }
}

function dispatchRouteReady(routeId, generation) {
  if (typeof window === 'undefined' || !routeId) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (
        activeRuntimeSnapshot.generation !== generation
        || activeRuntimeSnapshot.status !== 'ready'
      ) return;
      window.dispatchEvent(new CustomEvent('abs:route-ready', {
        detail: { routeId, generation },
      }));
    });
  });
}

function dispatchRouteFailed(routeId, generation, error) {
  if (typeof window === 'undefined' || !routeId) return;
  window.dispatchEvent(new CustomEvent('abs:route-failed', {
    detail: { routeId, generation, error },
  }));
}

export function loadRouteRuntimeModule(loadModule) {
  if (typeof loadModule !== 'function') return Promise.resolve(undefined);
  const cached = runtimeModulePromises.get(loadModule);
  if (cached) return cached;
  const pending = Promise.resolve()
    .then(() => loadModule())
    .catch((error) => {
      runtimeModulePromises.delete(loadModule);
      throw error;
    });
  runtimeModulePromises.set(loadModule, pending);
  return pending;
}

export function useLegacyRouteRuntime({
  active,
  loadModule,
  exportName,
  routeId,
  runtimeContext = null,
}) {
  const runtimeContextRef = useRef(runtimeContext);

  useEffect(() => {
    runtimeContextRef.current = runtimeContext;
  }, [runtimeContext]);

  useEffect(() => {
    if (!active || typeof loadModule !== 'function' || !exportName) return undefined;

    const scope = createLegacyRuntimeScope();
    const controller = new AbortController();
    const generation = ++nextRuntimeGeneration;
    const bootstrapContext = runtimeContextRef.current;
    const frozenRuntimeContext = bootstrapContext && typeof bootstrapContext === 'object'
      ? (Object.isFrozen(bootstrapContext) ? bootstrapContext : Object.freeze({ ...bootstrapContext }))
      : null;
    const cleanups = [];
    const cleanupStates = new Map();
    let cancelled = false;
    let runtimeReady = false;
    const isCurrent = () => (
      !cancelled
      && !controller.signal.aborted
      && activeRuntimeSnapshot.generation === generation
    );
    const runCleanup = (cleanup) => {
      if (typeof cleanup !== 'function' || cleanupStates.get(cleanup) !== 'pending') return;
      cleanupStates.set(cleanup, 'cleaned');
      try {
        cleanup();
      } catch (error) {
        console.error(`[spa] Failed to cleanup legacy route export "${exportName}"`, error);
      }
    };
    const registerCleanup = (cleanup) => {
      if (typeof cleanup !== 'function' || cleanupStates.has(cleanup)) return cleanup;
      cleanups.push(cleanup);
      cleanupStates.set(cleanup, 'pending');
      if (cancelled || controller.signal.aborted) runCleanup(cleanup);
      return cleanup;
    };
    const markReady = () => {
      if (!runtimeReady && isCurrent()) {
        runtimeReady = true;
        publishRuntimeLifecycle(routeId, generation, 'ready');
        dispatchRouteReady(routeId, generation);
      }
    };

    activeRuntimeSnapshot = Object.freeze({ routeId, generation, status: 'booting' });
    publishRuntimeLifecycle(routeId, generation, 'booting');

    Promise.resolve()
      .then(() => loadRouteRuntimeModule(loadModule))
      .then((module) => {
        if (!isCurrent()) return undefined;
        const boot = module?.[exportName];
        if (typeof boot === 'function') {
          // Prefer explicit route cleanup from boot exports; the legacy runtime
          // scope remains a safety net for older imperative modules.
          return Promise.resolve(boot({
            signal: controller.signal,
            routeId,
            generation,
            isCurrent,
            registerCleanup,
            markReady,
            simulationSwitch: frozenRuntimeContext,
          })).then(registerCleanup);
        }
        throw new Error(`Legacy module is missing export "${exportName}"`);
      })
      .then(() => {
        scope.stopCapturing?.();
        markReady();
      })
      .catch((error) => {
        scope.stopCapturing?.();
        if (isCurrent()) {
          publishRuntimeLifecycle(routeId, generation, 'failed');
          dispatchRouteFailed(routeId, generation, error);
          console.error(`[spa] Failed to bootstrap legacy route export "${exportName}"`, error);
        }
      });

    return () => {
      if (activeRuntimeSnapshot.generation === generation) {
        publishRuntimeLifecycle(routeId, generation, 'cancelled');
      }
      cancelled = true;
      controller.abort();
      for (let index = cleanups.length - 1; index >= 0; index -= 1) {
        runCleanup(cleanups[index]);
      }
      scope.cleanup();
    };
  // The bootstrap context is consumed only when runtime ownership changes.
  // Clearing a completed switch context must not remount an otherwise-stable
  // Home runtime and replay direct-boot choreography.
  }, [active, exportName, loadModule, routeId]);
}
