import { stripBasePath, withBasePath } from './base-path.js';

const ROUTE_DEFS = {
  home: {
    id: 'home',
    path: '/index.html',
    aliases: ['/', '/index.html', '/index'],
    gated: false,
  },
  'atmosphere-webgl-post': {
    id: 'atmosphere-webgl-post',
    path: '/lab/atmosphere-webgl-post.html',
    aliases: ['/lab/atmosphere-webgl-post.html', '/lab/atmosphere-webgl-post'],
    gated: false,
  },
  'atmosphere-density': {
    id: 'atmosphere-density',
    path: '/lab/atmosphere-density.html',
    aliases: ['/lab/atmosphere-density.html', '/lab/atmosphere-density'],
    gated: false,
  },
  'atmosphere-feedback': {
    id: 'atmosphere-feedback',
    path: '/lab/atmosphere-feedback.html',
    aliases: ['/lab/atmosphere-feedback.html', '/lab/atmosphere-feedback'],
    gated: false,
  },
  'atmosphere-crisp-glow': {
    id: 'atmosphere-crisp-glow',
    path: '/lab/atmosphere-crisp-glow.html',
    aliases: ['/lab/atmosphere-crisp-glow.html', '/lab/atmosphere-crisp-glow'],
    gated: false,
  },
  contact: {
    id: 'contact',
    path: '/contact.html',
    aliases: ['/contact.html', '/contact'],
    gated: false,
  },
  portfolio: {
    id: 'portfolio',
    path: '/portfolio.html',
    aliases: ['/portfolio.html', '/portfolio'],
    gated: false,
  },
  about: {
    id: 'about',
    path: '/about.html',
    aliases: ['/about.html', '/about'],
    gated: false,
  },
  'about-narrative-lab': {
    id: 'about-narrative-lab',
    path: '/lab/about-narrative.html',
    aliases: ['/lab/about-narrative.html', '/lab/about-narrative'],
    gated: false,
  },
  styleguide: {
    id: 'styleguide',
    path: '/styleguide.html',
    aliases: ['/styleguide.html', '/styleguide'],
    gated: false,
  },
  simulations: {
    id: 'simulations',
    path: '/simulations.html',
    aliases: ['/simulations.html', '/simulations'],
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
  'repel-room': {
    id: 'repel-room',
    path: '/lab/repel-room.html',
    aliases: [
      '/lab/repel-room.html',
      '/lab/repel-room',
      '/repel-room.html',
      '/repel-room',
      '/lab/wall-repel.html',
      '/lab/wall-repel',
      '/wall-repel.html',
      '/wall-repel',
    ],
    gated: false,
  },
  'aperture-bloom': {
    id: 'aperture-bloom',
    path: '/lab/aperture-bloom.html',
    aliases: ['/lab/aperture-bloom.html', '/lab/aperture-bloom', '/aperture-bloom.html', '/aperture-bloom'],
    gated: false,
  },
  'confluence-bridges': {
    id: 'confluence-bridges',
    path: '/lab/confluence-bridges.html',
    aliases: ['/lab/confluence-bridges.html', '/lab/confluence-bridges', '/confluence-bridges.html', '/confluence-bridges'],
    gated: false,
  },
  'napoleon-point-cloud': {
    id: 'napoleon-point-cloud',
    path: '/lab/napoleon-point-cloud.html',
    aliases: ['/lab/napoleon-point-cloud.html', '/lab/napoleon-point-cloud', '/napoleon-point-cloud.html', '/napoleon-point-cloud'],
    gated: false,
  },
  'rift-rings': {
    id: 'rift-rings',
    path: '/lab/rift-rings.html',
    aliases: ['/lab/rift-rings.html', '/lab/rift-rings', '/rift-rings.html', '/rift-rings'],
    gated: false,
  },
  'spatial-scan': {
    id: 'spatial-scan',
    path: '/lab/spatial-scan.html',
    aliases: ['/lab/spatial-scan.html', '/lab/spatial-scan', '/spatial-scan.html', '/spatial-scan'],
    gated: false,
  },
  'loader-playground': {
    id: 'loader-playground',
    path: '/lab/loader-playground.html',
    aliases: ['/lab/loader-playground.html', '/lab/loader-playground', '/loader-playground.html', '/loader-playground'],
    gated: false,
  },
};

export const SHELL_ROUTE_TABS = Object.freeze([
  {
    routeId: 'home',
    href: '/index.html',
    label: 'Home',
    ariaLabel: 'Home',
    iconOnly: false,
  },
  {
    routeId: 'portfolio',
    href: '/portfolio.html',
    label: 'Work',
    ariaLabel: 'Work',
    icon: 'ti-briefcase',
    iconOnly: false,
  },
  {
    routeId: 'about',
    href: '/about.html',
    label: 'About Me',
    ariaLabel: 'About Me',
    icon: 'ti-user',
    iconOnly: false,
  },
  {
    routeId: 'contact',
    href: '/contact.html',
    label: 'Contact',
    ariaLabel: 'Contact',
    icon: 'ti-mail',
    iconOnly: false,
  },
]);

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
