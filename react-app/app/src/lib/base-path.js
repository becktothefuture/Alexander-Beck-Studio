const RAW_BASE_URL = import.meta.env.BASE_URL || '/';

function normalizeBasePath(baseUrl) {
  const raw = String(baseUrl || '/').trim();
  if (!raw || raw === '/') return '';

  try {
    const url = new URL(raw, 'https://abs.local');
    const pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    return pathname === '/' ? '' : pathname;
  } catch {
    const pathname = raw.replace(/\/{2,}/g, '/').replace(/\/+$/, '');
    if (!pathname || pathname === '/') return '';
    return pathname.startsWith('/') ? pathname : `/${pathname}`;
  }
}

export function getBasePath() {
  return normalizeBasePath(RAW_BASE_URL);
}

export function getBasePathWithTrailingSlash() {
  const basePath = getBasePath();
  return basePath ? `${basePath}/` : '';
}

export function stripBasePath(pathname = '/') {
  const normalizedPath = String(pathname || '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const basePath = getBasePath();
  if (!basePath) return normalizedPath;

  const lowerPath = normalizedPath.toLowerCase();
  const lowerBase = basePath.toLowerCase();
  if (lowerPath === lowerBase) return '/';
  if (lowerPath.startsWith(`${lowerBase}/`)) {
    return normalizedPath.slice(basePath.length) || '/';
  }
  return normalizedPath;
}

export function withBasePath(path = '/') {
  const value = String(path || '/');
  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const basePath = getBasePath();
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${basePath}${normalizedPath}`.replace(/\/{2,}/g, '/') || '/';
}
