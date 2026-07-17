import { withBasePath } from './base-path.js';
import { trySpaNavigate } from './spa-navigation.js';

const GATE_ACCESS_KEYS = {
  portfolio: 'abs_portfolio_ok'
};

const GATE_REQUEST_KEYS = {
  portfolio: 'abs_open_portfolio_gate'
};

const GATE_PAGE_PATHS = {
  portfolio: '/portfolio.html'
};

export const GATE_INVITE_CODES = Object.freeze({
  portfolio: '739284'
});

export function getGateInviteCode(gateId) {
  return GATE_INVITE_CODES[gateId] || '';
}

export function getGateCodeLength(gateId) {
  return getGateInviteCode(gateId).length;
}

function consumeGateAccessFromUrl(gateId) {
  const inviteCode = getGateInviteCode(gateId);
  if (!inviteCode) return false;

  try {
    const url = new URL(window.location.href);
    const candidates = [
      url.searchParams.get(gateId),
      url.searchParams.get(`${gateId}Code`),
      url.searchParams.get('access'),
    ].filter(Boolean);
    const matched = candidates.some((value) => String(value).trim() === inviteCode);
    if (!matched) return false;

    url.searchParams.delete(gateId);
    url.searchParams.delete(`${gateId}Code`);
    url.searchParams.delete('access');
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
    markGateAccess(gateId);
    return true;
  } catch {
    return false;
  }
}

function getHomeUrl() {
  try {
    return new URL(withBasePath('/'), window.location.origin);
  } catch {
    return new URL('/', window.location.origin);
  }
}

function getAccessKey(gateId) {
  return GATE_ACCESS_KEYS[gateId] || '';
}

function readCookie(name) {
  try {
    const cookieName = `${encodeURIComponent(name)}=`;
    return document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(cookieName))
      ?.slice(cookieName.length) || '';
  } catch {
    return '';
  }
}

function writeAccessCookie(name) {
  try {
    document.cookie = `${encodeURIComponent(name)}=${Date.now()}; Path=/; SameSite=Lax; Max-Age=31536000`;
    return true;
  } catch {
    return false;
  }
}

function getRequestKeys(gateId) {
  const currentKey = GATE_REQUEST_KEYS[gateId];
  return [currentKey].filter(Boolean);
}

export function hasGateAccess(gateId) {
  const accessKey = getAccessKey(gateId);
  if (!accessKey) return false;

  if (consumeGateAccessFromUrl(gateId)) {
    return true;
  }

  try {
    if (readCookie(accessKey) || window.sessionStorage.getItem(accessKey)) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

// Client-side invite tokens provide UX friction only. They are not secure auth.
export function markGateAccess(gateId) {
  const accessKey = getAccessKey(gateId);
  if (!accessKey) return false;

  try {
    writeAccessCookie(accessKey);
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
  if (trySpaNavigate(destination.toString(), { replace: true })) {
    return;
  }
  window.location.replace(destination.toString());
}

export function navigateToGatePage(gateId, { allowDevAccess = false } = {}) {
  const destinationPath = GATE_PAGE_PATHS[gateId];
  if (!destinationPath) return;

  if (allowDevAccess && import.meta.env.DEV) {
    markGateAccess(gateId);
  }

  const destination = new URL(withBasePath(destinationPath), window.location.origin);
  if (trySpaNavigate(destination.toString())) {
    return;
  }
  window.location.assign(destination.toString());
}

export function navigateToHome(options = {}) {
  const destination = new URL(withBasePath(options.openContact ? '/contact.html' : '/'), window.location.origin);

  if (trySpaNavigate(destination.toString())) {
    return;
  }
  window.location.assign(destination.toString());
}
