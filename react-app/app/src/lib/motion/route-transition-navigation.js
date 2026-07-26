export function createRouteHistoryCoordinator({ history = window.history } = {}) {
  let provisional = null;

  const publish = () => {
    if (typeof window === 'undefined') return;
    window.__ABS_ROUTE_HISTORY__ = provisional
      ? {
          provisional: true,
          href: provisional.nextHref,
          historyMode: provisional.historyMode,
        }
      : { provisional: false, href: '', historyMode: 'none' };
  };

  publish();
  return {
    stage(candidate) {
      if (!candidate || candidate.historyMode === 'none') return false;
      provisional = { ...candidate };
      publish();
      return true;
    },
    finalize(owner = null) {
      if (!provisional) return false;
      if (owner && provisional.owner !== owner) return false;
      const candidate = provisional;
      provisional = null;
      if (candidate.historyMode === 'replace') {
        history.replaceState(candidate.state, '', candidate.nextHref);
      } else {
        history.pushState(candidate.state, '', candidate.nextHref);
      }
      publish();
      return true;
    },
    rollback(owner = null) {
      if (!provisional) return false;
      if (owner && provisional.owner !== owner) return false;
      provisional = null;
      publish();
      return true;
    },
    discard() {
      provisional = null;
      publish();
    },
    get provisional() {
      return provisional ? { ...provisional } : null;
    },
  };
}

export function createRouteHistoryDriver({
  source = 'navigation',
  replace = false,
  state = {},
  nextHref,
  previousHref,
  coordinator = null,
} = {}) {
  const historyMode = source === 'history' ? 'none' : (replace ? 'replace' : 'push');
  const owner = {};
  const candidate = { owner, historyMode, state, nextHref, previousHref };
  let committed = historyMode === 'none';
  let finalized = historyMode === 'none';

  return {
    historyMode,
    get committed() {
      return committed;
    },
    commit(overrideMode = null) {
      if (committed) return false;
      const mode = overrideMode || historyMode;
      if (coordinator) {
        coordinator.stage({ ...candidate, historyMode: mode });
      } else if (mode === 'replace') {
        window.history.replaceState(state, '', nextHref);
        finalized = true;
      } else if (mode === 'push') {
        window.history.pushState(state, '', nextHref);
        finalized = true;
      }
      committed = true;
      return true;
    },
    finalize() {
      if (!committed || finalized || historyMode === 'none') return false;
      finalized = coordinator?.finalize(owner) || false;
      return finalized;
    },
    rollback() {
      coordinator?.rollback(owner);
      if (!coordinator && finalized) {
        window.history.replaceState(window.history.state || {}, '', previousHref);
      }
      committed = false;
      finalized = false;
    },
    get finalized() {
      return finalized;
    },
  };
}

export function settleRouteFocus({ activation, focusAtStart }) {
  if (activation !== 'keyboard' && activation !== 'history') return false;
  const activeElement = document.activeElement;
  const focusMoved = Boolean(
    activeElement
    && activeElement !== document.body
    && activeElement !== focusAtStart
    && activeElement.isConnected
  );
  if (focusMoved) return false;
  const target = document.querySelector('[data-route-focus-target]');
  target?.focus?.({ preventScroll: true });
  return Boolean(target);
}
