export const ROUTE_ENTRANCE_START_EVENT = 'abs:route-entrance-start';

export function dispatchRouteEntranceStart(routeId, mode = 'route') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ROUTE_ENTRANCE_START_EVENT, {
    detail: { routeId, mode },
  }));
}
