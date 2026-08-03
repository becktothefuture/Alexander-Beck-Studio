export const ROUTE_TRANSACTION_PHASES = Object.freeze({
  IDLE: 'idle',
  ROUTE_OUT: 'route-out',
  ROUTE_LOADING: 'route-loading',
  ROUTE_IN: 'route-in',
});

export const ROUTE_NAVIGATION_DECISIONS = Object.freeze({
  START: 'start',
  IGNORE: 'ignore',
  QUEUE: 'queue',
  PREEMPT: 'preempt',
  RETARGET_COVERED: 'retarget-covered',
  RECOVER_ROUTE_IN: 'recover-route-in',
});

export const ROUTE_SETTLEMENT_ENDPOINTS = Object.freeze({
  RESTORE_OUTGOING: 'restore-outgoing',
  PRESERVE_COVERED_DESTINATION: 'preserve-covered-destination',
  SETTLE_INCOMING: 'settle-incoming',
  DISCARD_DETACHED_CONTENT: 'discard-detached-content',
});

const LEGAL_PHASES = Object.freeze({
  [ROUTE_TRANSACTION_PHASES.IDLE]: new Set([
    ROUTE_TRANSACTION_PHASES.ROUTE_OUT,
    ROUTE_TRANSACTION_PHASES.ROUTE_LOADING,
  ]),
  [ROUTE_TRANSACTION_PHASES.ROUTE_OUT]: new Set([
    ROUTE_TRANSACTION_PHASES.ROUTE_LOADING,
  ]),
  [ROUTE_TRANSACTION_PHASES.ROUTE_LOADING]: new Set([
    ROUTE_TRANSACTION_PHASES.ROUTE_IN,
  ]),
  [ROUTE_TRANSACTION_PHASES.ROUTE_IN]: new Set([
    ROUTE_TRANSACTION_PHASES.IDLE,
  ]),
});

export function createRouteTransitionTransaction({
  generation,
  fromState,
  toState,
  fromReadinessRouteId = fromState?.route?.id || '',
  toReadinessRouteId = toState?.route?.id || '',
  historyMode = 'push',
  activation = 'pointer',
  resumedCovered = false,
  timingMode = 'normal',
  abortController = null,
  participants = null,
  animationRegistry = null,
  loaderTimingDriver = null,
} = {}) {
  if (!Number.isFinite(Number(generation)) || Number(generation) <= 0) {
    throw new TypeError('Route transition transactions require a positive generation.');
  }

  return {
    id: Number(generation),
    generation: Number(generation),
    fromState,
    toState,
    fromReadinessRouteId,
    toReadinessRouteId,
    historyMode,
    activation,
    phase: ROUTE_TRANSACTION_PHASES.IDLE,
    phaseHistory: [ROUTE_TRANSACTION_PHASES.IDLE],
    resumedCovered: Boolean(resumedCovered),
    timingMode,
    committed: false,
    recovering: false,
    settled: false,
    cancelled: false,
    cancellationReason: '',
    settlementStatus: '',
    settlementEndpoint: '',
    abortController,
    participants,
    animationRegistry,
    loaderTimingDriver,
    readinessWaiter: null,
  };
}

export function advanceRouteTransitionTransaction(transaction, nextPhase) {
  if (!transaction || transaction.cancelled || transaction.settled) return false;
  if (transaction.phase === nextPhase) return true;
  const legal = LEGAL_PHASES[transaction.phase];
  if (!legal?.has(nextPhase)) return false;
  transaction.phase = nextPhase;
  transaction.phaseHistory.push(nextPhase);
  return true;
}

export function markRouteTransitionCommitted(transaction) {
  if (!transaction || transaction.cancelled || transaction.settled || transaction.committed) return false;
  transaction.committed = true;
  return true;
}

export function cancelRouteTransitionTransaction(
  transaction,
  reason = 'cancelled',
  endpoint = ROUTE_SETTLEMENT_ENDPOINTS.DISCARD_DETACHED_CONTENT,
) {
  if (!transaction || transaction.cancelled || transaction.settled) return false;
  transaction.cancelled = true;
  transaction.cancellationReason = String(reason || 'cancelled');
  transaction.settlementEndpoint = endpoint;
  return true;
}

export function settleRouteTransitionTransaction(
  transaction,
  status = 'ready',
  endpoint = ROUTE_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
) {
  if (!transaction || transaction.cancelled || transaction.settled) return false;
  if (transaction.phase !== ROUTE_TRANSACTION_PHASES.IDLE) {
    if (transaction.phase === ROUTE_TRANSACTION_PHASES.ROUTE_IN) {
      if (!advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.IDLE)) return false;
    } else {
      transaction.phase = ROUTE_TRANSACTION_PHASES.IDLE;
      transaction.phaseHistory.push(ROUTE_TRANSACTION_PHASES.IDLE);
    }
  }
  transaction.settled = true;
  transaction.settlementStatus = String(status || 'ready');
  transaction.settlementEndpoint = endpoint;
  return true;
}

export function isRouteTransitionTransactionStale(transaction, generation) {
  return Boolean(
    !transaction
    || transaction.cancelled
    || transaction.settled
    || transaction.generation !== Number(generation)
  );
}

export function classifyRouteNavigationIntent({
  transitionActive = false,
  phase = ROUTE_TRANSACTION_PHASES.IDLE,
  activeCommitted = false,
  activeRecovering = false,
  repeatsActive = false,
  repeatsQueued = false,
  gateActive = false,
  allowPreempt = false,
} = {}) {
  if (repeatsActive || repeatsQueued) return ROUTE_NAVIGATION_DECISIONS.IGNORE;
  if (!transitionActive) return ROUTE_NAVIGATION_DECISIONS.START;
  if (activeRecovering || gateActive) return ROUTE_NAVIGATION_DECISIONS.QUEUE;
  // The outgoing route is still visible during route-out. Keep the latest
  // intent queued until its departure has finished and the cover is real.
  if (phase === ROUTE_TRANSACTION_PHASES.ROUTE_OUT) {
    return ROUTE_NAVIGATION_DECISIONS.QUEUE;
  }
  if (activeCommitted && phase === ROUTE_TRANSACTION_PHASES.ROUTE_IN) {
    return ROUTE_NAVIGATION_DECISIONS.RECOVER_ROUTE_IN;
  }
  if (phase === ROUTE_TRANSACTION_PHASES.ROUTE_LOADING) {
    return ROUTE_NAVIGATION_DECISIONS.RETARGET_COVERED;
  }
  if (allowPreempt) return ROUTE_NAVIGATION_DECISIONS.PREEMPT;
  return ROUTE_NAVIGATION_DECISIONS.QUEUE;
}
