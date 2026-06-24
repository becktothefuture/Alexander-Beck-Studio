import { stripBasePath, withBasePath } from './base-path.js';

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
  'beach-ball-room': {
    id: 'beach-ball-room',
    path: '/lab/beach-ball-room.html',
    aliases: ['/lab/beach-ball-room.html', '/lab/beach-ball-room', '/beach-ball-room.html', '/beach-ball-room'],
    gated: false,
  },
  'flock-of-birds': {
    id: 'flock-of-birds',
    path: '/lab/flock-of-birds.html',
    aliases: ['/lab/flock-of-birds.html', '/lab/flock-of-birds', '/flock-of-birds.html', '/flock-of-birds'],
    gated: false,
  },
  'rain-prism': {
    id: 'rain-prism',
    path: '/lab/rain-prism.html',
    aliases: ['/lab/rain-prism.html', '/lab/rain-prism', '/rain-prism.html', '/rain-prism'],
    gated: false,
  },
  'wall-repel': {
    id: 'wall-repel',
    path: '/lab/wall-repel.html',
    aliases: ['/lab/wall-repel.html', '/lab/wall-repel', '/wall-repel.html', '/wall-repel'],
    gated: false,
  },
  'mineral-growth': {
    id: 'mineral-growth',
    path: '/lab/mineral-growth.html',
    aliases: ['/lab/mineral-growth.html', '/lab/mineral-growth', '/mineral-growth.html', '/mineral-growth'],
    gated: false,
  },
  'aperture-bloom': {
    id: 'aperture-bloom',
    path: '/lab/aperture-bloom.html',
    aliases: ['/lab/aperture-bloom.html', '/lab/aperture-bloom', '/aperture-bloom.html', '/aperture-bloom'],
    gated: false,
  },
  'pressure-mosaic': {
    id: 'pressure-mosaic',
    path: '/lab/pressure-mosaic.html',
    aliases: ['/lab/pressure-mosaic.html', '/lab/pressure-mosaic', '/pressure-mosaic.html', '/pressure-mosaic'],
    gated: false,
  },
  'napoleon-point-cloud': {
    id: 'napoleon-point-cloud',
    path: '/lab/napoleon-point-cloud.html',
    aliases: ['/lab/napoleon-point-cloud.html', '/lab/napoleon-point-cloud', '/napoleon-point-cloud.html', '/napoleon-point-cloud'],
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
  const normalized = normalizePathname(stripBasePath(pathname));
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
