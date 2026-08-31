import { resolveRouteFromPathname } from '../../lib/routes.js';

export const ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY = 'absAboutNarrativeProgress';

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export function readAboutNarrativeHistoryProgress(
  state = typeof window !== 'undefined' ? window.history?.state : null,
) {
  if (!state || typeof state !== 'object') return 0;
  return clamp01(state[ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]);
}

export function hasAboutNarrativeRestoredProgress(state) {
  return readAboutNarrativeHistoryProgress(state) > 0.0001;
}

export function writeAboutNarrativeHistoryProgress(
  progress,
  history = typeof window !== 'undefined' ? window.history : null,
) {
  if (!history?.replaceState) return false;
  const nextProgress = Number(clamp01(progress).toFixed(6));
  const currentState = history.state && typeof history.state === 'object'
    ? history.state
    : {};
  if (currentState[ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY] === nextProgress) return false;
  try {
    history.replaceState({
      ...currentState,
      [ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]: nextProgress,
    }, '');
    return true;
  } catch {
    return false;
  }
}

// Checkpoint long gestures at a bounded cadence. The native scroll event must
// not serialize history state or force geometry reads on every camera frame.
export function createAboutNarrativeScrollPersistence(scrollport, {
  win = window,
  intervalMs = 250,
} = {}) {
  const currentRouteId = () => resolveRouteFromPathname(new URL(win.location.href).pathname)?.id;
  const entryRouteId = currentRouteId();
  let timer = 0;
  let restoreTimer = 0;
  let departed = false;
  let destroyed = false;
  const cancelPending = () => {
    win.clearTimeout(timer);
    timer = 0;
  };
  const flush = () => {
    cancelPending();
    // popstate already selects the destination entry. Never copy About's
    // outgoing position into that entry, or read a detached scrollport.
    if (destroyed || departed || currentRouteId() !== entryRouteId
      || scrollport.isConnected === false) return false;
    const travel = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    return writeAboutNarrativeHistoryProgress(travel > 0 ? scrollport.scrollTop / travel : 0, win.history);
  };
  const schedule = () => {
    if (!timer && !departed) timer = win.setTimeout(flush, intervalMs);
  };
  const restoreHistoryEntry = () => {
    win.clearTimeout(restoreTimer);
    restoreTimer = 0;
    if (destroyed || scrollport.isConnected === false || currentRouteId() !== entryRouteId) return;
    const travel = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    scrollport.scrollTop = readAboutNarrativeHistoryProgress(win.history.state) * travel;
    departed = false;
  };
  const leaveHistoryEntry = () => {
    departed = true;
    cancelPending();
    win.clearTimeout(restoreTimer);
    // The shell retains this component for same-route history traversal.
    // Rebind after popstate's native restoration, without saving the old pose
    // into the newly selected entry while the event is still being handled.
    restoreTimer = win.setTimeout(restoreHistoryEntry, 0);
  };
  const handlePageShow = (event) => {
    if (event.persisted) restoreHistoryEntry();
  };
  const handleVisibilityChange = () => {
    if (win.document.hidden) flush();
  };
  scrollport.addEventListener('scroll', schedule, { passive: true });
  scrollport.addEventListener('scrollend', flush, { passive: true });
  win.addEventListener('pagehide', flush);
  win.addEventListener('pageshow', handlePageShow);
  win.addEventListener('popstate', leaveHistoryEntry, { capture: true });
  win.document.addEventListener('visibilitychange', handleVisibilityChange);
  flush();
  return {
    flush,
    destroy() {
      flush();
      destroyed = true;
      win.clearTimeout(restoreTimer);
      scrollport.removeEventListener('scroll', schedule);
      scrollport.removeEventListener('scrollend', flush);
      win.removeEventListener('pagehide', flush);
      win.removeEventListener('pageshow', handlePageShow);
      win.removeEventListener('popstate', leaveHistoryEntry, { capture: true });
      win.document.removeEventListener('visibilitychange', handleVisibilityChange);
    },
  };
}
