import { buildRouteHref } from './routes.js';

export const SHELL_ROUTE_TABS = Object.freeze([
  {
    id: 'home',
    routeId: 'home',
    label: 'Home',
    icon: 'ti-home',
    iconOnly: true,
    href: () => buildRouteHref('home'),
  },
  {
    id: 'contact',
    routeId: 'contact',
    label: 'Contact',
    href: () => buildRouteHref('contact'),
  },
  {
    id: 'portfolio',
    routeId: 'portfolio',
    label: 'Portfolio',
    gated: true,
    gateId: 'portfolio',
    href: () => buildRouteHref('portfolio'),
  },
  {
    id: 'about',
    routeId: 'cv',
    label: 'About Me',
    gated: true,
    gateId: 'cv',
    href: () => buildRouteHref('cv'),
  },
]);

export const SHELL_GATE_EVENTS = Object.freeze({
  request: 'abs:gate-request',
  open: 'abs:gate-open',
  dismiss: 'abs:gate-dismiss',
  success: 'abs:gate-success',
});

export function dispatchShellGateEvent(type, gateId, detail = {}) {
  if (typeof document === 'undefined') return;
  const eventName = SHELL_GATE_EVENTS[type];
  if (!eventName || !gateId) return;
  document.dispatchEvent(new CustomEvent(eventName, {
    detail: {
      gateId,
      ...detail,
    },
  }));
}
