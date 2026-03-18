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
    return Boolean(window.sessionStorage.getItem(accessKey));
  } catch {
    return false;
  }
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

  const destination = new URL('index.html', window.location.href);
  destination.searchParams.set('gate', gateId);
  window.location.replace(destination.toString());
}
