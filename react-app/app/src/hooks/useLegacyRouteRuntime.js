import { useEffect } from 'react';
import { createLegacyRuntimeScope } from '../lib/legacy-runtime-scope.js';

function dispatchRouteReady(routeId) {
  if (typeof window === 'undefined' || !routeId) return;
  window.dispatchEvent(new CustomEvent('abs:route-ready', { detail: { routeId } }));
}

export function useLegacyRouteRuntime({ active, loadModule, exportName, routeId }) {
  useEffect(() => {
    if (!active || typeof loadModule !== 'function' || !exportName) return undefined;

    const scope = createLegacyRuntimeScope();
    let cancelled = false;
    let legacyCleanup = null;

    Promise.resolve()
      .then(() => loadModule())
      .then((module) => {
        if (cancelled) return;
        const boot = module?.[exportName];
        if (typeof boot === 'function') {
          return Promise.resolve(boot()).then((cleanup) => {
            if (typeof cleanup === 'function') {
              legacyCleanup = cleanup;
            }
            if (!cancelled) {
              dispatchRouteReady(routeId);
            }
          });
        }
        throw new Error(`Legacy module is missing export "${exportName}"`);
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`[spa] Failed to bootstrap legacy route export "${exportName}"`, error);
        }
      });

    return () => {
      cancelled = true;
      try {
        legacyCleanup?.();
      } catch (error) {
        console.error(`[spa] Failed to cleanup legacy route export "${exportName}"`, error);
      }
      scope.cleanup();
    };
  }, [active, exportName, loadModule, routeId]);
}
