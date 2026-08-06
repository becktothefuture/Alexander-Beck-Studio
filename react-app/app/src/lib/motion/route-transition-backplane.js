export const ROUTE_LOADER_BACKDROP_MODES = Object.freeze({
  OPAQUE: 'opaque',
  PRESERVE: 'preserve',
});

const SHARED_SHELL_ROUTE_IDS = new Set([
  'home',
  'portfolio',
  'about',
  'contact',
  'playground',
]);

export function normalizeRouteLoaderBackdropMode(mode) {
  return mode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE
    ? ROUTE_LOADER_BACKDROP_MODES.PRESERVE
    : ROUTE_LOADER_BACKDROP_MODES.OPAQUE;
}

export function resolveRouteLoaderBackdropMode(fromRouteId, toRouteId) {
  const fromRoute = String(fromRouteId || '').trim();
  const toRoute = String(toRouteId || '').trim();

  // The shell owns the physical window, its base surface, and grain. Every
  // primary tab swaps only route-owned material, so its loader is status/input
  // chrome rather than a visual plate. Unknown or standalone routes retain the
  // opaque fallback because they do not share that certified backplane.
  return (
    fromRoute !== toRoute
    && SHARED_SHELL_ROUTE_IDS.has(fromRoute)
    && SHARED_SHELL_ROUTE_IDS.has(toRoute)
  )
    ? ROUTE_LOADER_BACKDROP_MODES.PRESERVE
    : ROUTE_LOADER_BACKDROP_MODES.OPAQUE;
}
