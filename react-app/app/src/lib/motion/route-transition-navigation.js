export function createRouteHistoryDriver({
  source = 'navigation',
  replace = false,
  state = {},
  nextHref,
  previousHref,
} = {}) {
  const historyMode = source === 'history' ? 'none' : (replace ? 'replace' : 'push');
  let committed = historyMode === 'none';

  return {
    historyMode,
    get committed() {
      return committed;
    },
    commit(overrideMode = null) {
      if (committed) return false;
      const mode = overrideMode || historyMode;
      if (mode === 'replace') {
        window.history.replaceState(state, '', nextHref);
      } else if (mode === 'push') {
        window.history.pushState(state, '', nextHref);
      }
      committed = true;
      return true;
    },
    rollback() {
      window.history.replaceState(window.history.state || {}, '', previousHref);
      committed = false;
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
