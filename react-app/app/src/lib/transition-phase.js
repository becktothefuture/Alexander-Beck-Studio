import { clearStableTimeout, setStableTimeout } from './legacy-runtime-scope.js';

export const TRANSITION_PHASES = Object.freeze({
  IDLE: 'idle',
  MODAL_OPEN: 'modal-open',
  ROUTE_OUT: 'route-out',
  ROUTE_IN: 'route-in',
});

const RETURNING_DATASET_KEY = 'absTransitionReturning';
let returningTimeoutId = 0;

function getRoot() {
  if (typeof document === 'undefined') return null;
  return document.documentElement;
}

function readRootMs(name, fallback) {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const value = Number.parseFloat(raw);
    if (!Number.isFinite(value)) return fallback;
    if (/ms$/i.test(raw)) return value;
    if (/s$/i.test(raw)) return value * 1000;
    return value;
  } catch {
    return fallback;
  }
}

function getModalReturnDurationMs() {
  return readRootMs('--ui-nav-return-duration', 240);
}

function clearReturningTimeout() {
  if (!returningTimeoutId) return;
  clearStableTimeout(returningTimeoutId);
  returningTimeoutId = 0;
}

export function clearTransitionReturningState() {
  const root = getRoot();
  if (!root) return;
  clearReturningTimeout();
  delete root.dataset[RETURNING_DATASET_KEY];
}

export function setTransitionReturningState(active) {
  const root = getRoot();
  if (!root) return;

  clearReturningTimeout();
  if (!active) {
    delete root.dataset[RETURNING_DATASET_KEY];
    return;
  }

  root.dataset[RETURNING_DATASET_KEY] = 'active';
  returningTimeoutId = setStableTimeout(() => {
    delete root.dataset[RETURNING_DATASET_KEY];
    returningTimeoutId = 0;
  }, getModalReturnDurationMs() + 50);
}

export function getTransitionPhase() {
  const root = getRoot();
  if (!root) return TRANSITION_PHASES.IDLE;
  return root.dataset.absTransitionPhase || TRANSITION_PHASES.IDLE;
}

export function isRouteTransitionPhase(phase = getTransitionPhase()) {
  return phase === TRANSITION_PHASES.ROUTE_OUT || phase === TRANSITION_PHASES.ROUTE_IN;
}

export function setTransitionPhase(phase, options = {}) {
  const root = getRoot();
  if (!root) return;

  root.dataset.absTransitionPhase = phase;
  if (phase !== TRANSITION_PHASES.IDLE) {
    clearTransitionReturningState();
    return;
  }

  if (options.returning) {
    setTransitionReturningState(true);
  }
}

function hasActiveModalVisuals(root = getRoot()) {
  if (!root || typeof document === 'undefined') return false;
  const blur = document.getElementById('modal-blur-layer');
  const content = document.getElementById('modal-content-layer');
  return Boolean(
    blur?.classList.contains('active')
    || content?.classList.contains('active')
  );
}

export function clearTransitionPhase({ preserveReturning = false } = {}) {
  const root = getRoot();
  if (!root) return;
  delete root.dataset.absTransitionPhase;
  if (!preserveReturning) {
    clearTransitionReturningState();
  }
}

export function setLegacyRouteTransitionActive(active, { gate = false } = {}) {
  const root = getRoot();
  if (!root) return;
  if (active) {
    root.dataset.absRouteTransition = 'active';
    if (gate) root.dataset.absGateTransition = 'active';
    return;
  }
  delete root.dataset.absRouteTransition;
  if (!gate) delete root.dataset.absGateTransition;
}

export function clearLegacyRouteTransitionFlags() {
  const root = getRoot();
  if (!root) return;
  delete root.dataset.absGateTransition;
  delete root.dataset.absRouteTransition;
}

export function syncTransitionPhaseFromDom(root = getRoot()) {
  if (!root) return TRANSITION_PHASES.IDLE;

  const current = getTransitionPhase();
  const routeBusy = root.dataset.absRouteTransition === 'active';
  const gateBusy = root.dataset.absGateTransition === 'active';

  if (routeBusy) {
    if (current === TRANSITION_PHASES.ROUTE_OUT || current === TRANSITION_PHASES.ROUTE_IN) {
      return current;
    }
    const next = gateBusy ? TRANSITION_PHASES.ROUTE_OUT : TRANSITION_PHASES.ROUTE_IN;
    setTransitionPhase(next);
    return next;
  }

  if (hasActiveModalVisuals(root)) {
    if (current !== TRANSITION_PHASES.MODAL_OPEN) {
      setTransitionPhase(TRANSITION_PHASES.MODAL_OPEN);
    }
    return TRANSITION_PHASES.MODAL_OPEN;
  }

  if (current !== TRANSITION_PHASES.IDLE) {
    setTransitionPhase(TRANSITION_PHASES.IDLE);
  }
  return TRANSITION_PHASES.IDLE;
}

export function installTransitionPhaseObserver({
  root = getRoot(),
  isRouteTransitionActive = null,
} = {}) {
  if (!root || typeof MutationObserver === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const blur = document.getElementById('modal-blur-layer');
  const content = document.getElementById('modal-content-layer');

  const sync = () => {
    if (typeof isRouteTransitionActive === 'function' && isRouteTransitionActive()) return;
    syncTransitionPhaseFromDom(root);
  };

  const observer = new MutationObserver(sync);
  const observeClass = (node) => {
    if (!node) return;
    observer.observe(node, {
      attributes: true,
      attributeFilter: ['class', 'data-modal-state'],
      subtree: true,
      childList: true,
    });
  };

  observeClass(root);
  observeClass(blur);
  observeClass(content);

  sync();
  return () => {
    observer.disconnect();
  };
}
