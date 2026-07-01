import { useEffect } from 'react';
import { createLegacyRuntimeScope } from '../lib/legacy-runtime-scope.js';

function dispatchRouteReady(routeId) {
  if (typeof window === 'undefined' || !routeId) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.dispatchEvent(new CustomEvent('abs:route-ready', { detail: { routeId } }));
    });
  });
}

export function useLegacyRouteRuntime({ active, loadModule, exportName, routeId }) {
  useEffect(() => {
    if (!active || typeof loadModule !== 'function' || !exportName) return undefined;

    const scope = createLegacyRuntimeScope();
    let cancelled = false;
    let legacyCleanup = null;
    const markReady = () => {
      if (!cancelled) {
        dispatchRouteReady(routeId);
      }
    };

    Promise.resolve()
      .then(() => loadModule())
      .then((module) => {
        if (cancelled) return;
        const boot = module?.[exportName];
        if (typeof boot === 'function') {
          // Prefer explicit route cleanup from boot exports; the legacy runtime
          // scope remains a safety net for older imperative modules.
          return Promise.resolve(boot()).then((cleanup) => {
            if (typeof cleanup === 'function') {
              legacyCleanup = cleanup;
            }
          });
        }
        throw new Error(`Legacy module is missing export "${exportName}"`);
      })
      .then(() => {
        if (!cancelled) {
          markReady();
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error(`[spa] Failed to bootstrap legacy route export "${exportName}"`, error);
        }
      });

    return () => {
      cancelled = true;
      try {
        // Run explicit cleanup before the scope removes listeners/timers that
        // were registered during bootstrap.
        legacyCleanup?.();
      } catch (error) {
        console.error(`[spa] Failed to cleanup legacy route export "${exportName}"`, error);
      }
      scope.cleanup();
    };
  }, [active, exportName, loadModule, routeId]);
}
