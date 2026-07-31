import { stripBasePath, withBasePath } from './base-path.js';
import { ROUTE_MANIFEST } from './route-manifest.js';

const ROUTE_DEFS = Object.freeze(Object.fromEntries(
  Object.entries(ROUTE_MANIFEST).map(([routeId, route]) => [
    routeId,
    Object.freeze({
      ...route,
      aliases: Object.freeze([...route.aliases]),
      shellTab: route.shellTab ? Object.freeze({ ...route.shellTab }) : undefined,
    }),
  ]),
));

export const SHELL_ROUTE_TABS = Object.freeze(
  Object.values(ROUTE_DEFS)
    .filter((route) => route.shellTab)
    .sort((left, right) => left.shellTab.order - right.shellTab.order)
    .map((route) => Object.freeze({
      routeId: route.id,
      href: route.path,
      label: route.shellTab.label,
      ariaLabel: route.shellTab.ariaLabel,
      icon: route.shellTab.icon,
      iconOnly: route.shellTab.iconOnly,
    })),
);

function normalizePathname(pathname = '/') {
  const raw = String(pathname || '/').trim();
  if (!raw) return '/';
  const normalized = raw.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  return normalized.toLowerCase();
}

export function getRouteById(routeId) {
  return ROUTE_DEFS[routeId] || null;
}

export function isSharedShellRoute(route) {
  return route?.layout === 'shared-shell';
}

export function resolveRouteFromPathname(pathname = '/') {
  const normalized = normalizePathname(stripBasePath(pathname));
  return Object.values(ROUTE_DEFS).find((route) => route.aliases.includes(normalized)) || null;
}

export function resolveRouteFromHref(href, baseHref) {
  try {
    const base = baseHref || window.location.href;
    const url = new URL(href, base);
    if (url.origin !== window.location.origin) return null;
    return resolveRouteFromPathname(url.pathname);
  } catch {
    return null;
  }
}

export function isInternalRouteHref(href, baseHref) {
  return Boolean(resolveRouteFromHref(href, baseHref));
}

export function buildRouteHref(routeId, options = {}) {
  const route = getRouteById(routeId);
  if (!route) {
    throw new Error(`Unknown route id "${String(routeId)}".`);
  }
  const url = new URL(withBasePath(route.path), window.location.origin);

  if (options.searchParams && typeof options.searchParams === 'object') {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  if (options.hash) {
    url.hash = String(options.hash);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
