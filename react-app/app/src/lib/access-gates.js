const GATE_ACCESS_KEYS = {
  portfolio: 'abs_portfolio_ok',
  cv: 'abs_cv_ok'
};

const GATE_REQUEST_KEYS = {
  portfolio: 'abs_open_portfolio_gate',
  cv: 'abs_open_cv_gate'
};

const LEGACY_GATE_REQUEST_KEYS = {
  portfolio: ['abs_open_portfolio_modal'],
  cv: ['abs_open_cv_modal']
};

const GATE_PAGE_PATHS = {
  portfolio: '/portfolio.html',
  cv: '/cv.html'
};

function isDevGatePreview(gateId) {
  if (!import.meta.env.DEV) return false;

  try {
    const expectedPath = GATE_PAGE_PATHS[gateId];
    const currentPath = String(window.location.pathname || '').toLowerCase();
    return Boolean(expectedPath && currentPath.endsWith(expectedPath));
  } catch {
    return false;
  }
}

function getHomeUrl() {
  try {
    return new URL('./', window.location.href);
  } catch {
    return new URL('/', window.location.origin);
  }
}

function getAccessKey(gateId) {
  return GATE_ACCESS_KEYS[gateId] || '';
}

function getRequestKeys(gateId) {
  const currentKey = GATE_REQUEST_KEYS[gateId];
  const legacyKeys = LEGACY_GATE_REQUEST_KEYS[gateId] || [];
  return [currentKey, ...legacyKeys].filter(Boolean);
}

export function hasGateAccess(gateId) {
  const accessKey = getAccessKey(gateId);
  if (!accessKey) return false;

  try {
    if (window.sessionStorage.getItem(accessKey)) {
      return true;
    }
  } catch {
    return isDevGatePreview(gateId);
  }

  if (isDevGatePreview(gateId)) {
    markGateAccess(gateId);
    return true;
  }

  return false;
}

// Client-side invite tokens provide UX friction only. They are not secure auth.
export function markGateAccess(gateId) {
  const accessKey = getAccessKey(gateId);
  if (!accessKey) return false;

  try {
    window.sessionStorage.setItem(accessKey, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function requestGateOpen(gateId) {
  const requestKey = GATE_REQUEST_KEYS[gateId];
  if (!requestKey) return;

  try {
    window.sessionStorage.setItem(requestKey, '1');
  } catch {
    return;
  }
}

export function consumeGateRequest(gateId) {
  let requested = false;

  try {
    getRequestKeys(gateId).forEach((key) => {
      if (window.sessionStorage.getItem(key)) {
        requested = true;
        window.sessionStorage.removeItem(key);
      }
    });
  } catch {
    // Continue with URL-based fallback when storage is unavailable.
  }

  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('gate') === gateId) {
      requested = true;
      url.searchParams.delete('gate');
      window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    return requested;
  }

  return requested;
}

export function redirectToGateHome(gateId) {
  requestGateOpen(gateId);

  const destination = getHomeUrl();
  destination.searchParams.set('gate', gateId);
  window.location.replace(destination.toString());
}

export function navigateToGatePage(gateId, { allowDevAccess = false } = {}) {
  const destinationPath = GATE_PAGE_PATHS[gateId];
  if (!destinationPath) return;

  if (allowDevAccess && import.meta.env.DEV) {
    markGateAccess(gateId);
  }

  const destination = new URL(destinationPath, window.location.href);
  window.location.assign(destination.toString());
}

export function navigateToHome(options = {}) {
  const destination = getHomeUrl();

  if (options.openContact) {
    try {
      window.sessionStorage.setItem('abs_open_contact_modal', '1');
    } catch {}
  }

  window.location.assign(destination.toString());
}
