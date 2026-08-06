export const ROUTE_LOADER_BACKDROP_MODES = Object.freeze({
  OPAQUE: 'opaque',
  PRESERVE: 'preserve',
});

const PERSISTENT_BACKPLANE_ROUTE_PAIRS = new Set([
  'home:portfolio',
  'portfolio:home',
]);

export function normalizeRouteLoaderBackdropMode(mode) {
  return mode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE
    ? ROUTE_LOADER_BACKDROP_MODES.PRESERVE
    : ROUTE_LOADER_BACKDROP_MODES.OPAQUE;
}

export function resolveRouteLoaderBackdropMode(fromRouteId, toRouteId) {
  const routePair = `${String(fromRouteId || '').trim()}:${String(toRouteId || '').trim()}`;

  // The first rollout is intentionally constrained to Home <-> Work. Other
  // routes retain their opaque fallback until their own frame audit proves
  // that every route-owned layer is safely suppressed during loading.
  return PERSISTENT_BACKPLANE_ROUTE_PAIRS.has(routePair)
    ? ROUTE_LOADER_BACKDROP_MODES.PRESERVE
    : ROUTE_LOADER_BACKDROP_MODES.OPAQUE;
}
