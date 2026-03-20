const ROUTE_DEFS = {
  home: {
    id: 'home',
    path: '/index.html',
    aliases: ['/', '/index.html', '/index'],
    gated: false,
  },
  portfolio: {
    id: 'portfolio',
    path: '/portfolio.html',
    aliases: ['/portfolio.html', '/portfolio'],
    gated: true,
  },
  cv: {
    id: 'cv',
    path: '/cv.html',
    aliases: ['/cv.html', '/cv'],
    gated: true,
  },
  styleguide: {
    id: 'styleguide',
    path: '/styleguide.html',
    aliases: ['/styleguide.html', '/styleguide'],
    gated: false,
  },
  'palette-lab': {
    id: 'palette-lab',
    path: '/palette-lab.html',
    aliases: ['/palette-lab.html', '/palette-lab'],
    gated: false,
  },
};

function normalizePathname(pathname = '/') {
  const raw = String(pathname || '/').trim();
  if (!raw) return '/';
  const normalized = raw.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  return normalized.toLowerCase();
}

export function getRouteById(routeId) {
  return ROUTE_DEFS[routeId] || ROUTE_DEFS.home;
}

export function resolveRouteFromPathname(pathname = '/') {
  const normalized = normalizePathname(pathname);
  const match = Object.values(ROUTE_DEFS).find((route) => route.aliases.includes(normalized));
  return match || ROUTE_DEFS.home;
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
  const url = new URL(route.path, window.location.origin);

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
