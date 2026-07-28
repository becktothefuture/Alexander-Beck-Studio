export const SIMULATION_SWITCH_PHASES = Object.freeze({
  IDLE: 'idle',
  PREPARE: 'prepare',
  OUT: 'out',
  COMMIT: 'commit',
  PRIME: 'prime',
  IN: 'in',
});

export const SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS = Object.freeze({
  SETTLE_INCOMING: 'settle-incoming',
  RESTORE_OUTGOING: 'restore-outgoing',
  RESTORE_PREVIOUS: 'restore-previous',
  PRESERVE_TARGET: 'preserve-target',
  PRESERVE_MOUNTED: 'preserve-mounted',
  DISCARD_STALE: 'discard-stale',
});

const LEGAL_PHASES = Object.freeze({
  [SIMULATION_SWITCH_PHASES.IDLE]: SIMULATION_SWITCH_PHASES.PREPARE,
  [SIMULATION_SWITCH_PHASES.PREPARE]: SIMULATION_SWITCH_PHASES.OUT,
  [SIMULATION_SWITCH_PHASES.OUT]: SIMULATION_SWITCH_PHASES.COMMIT,
  [SIMULATION_SWITCH_PHASES.COMMIT]: SIMULATION_SWITCH_PHASES.PRIME,
  [SIMULATION_SWITCH_PHASES.PRIME]: SIMULATION_SWITCH_PHASES.IN,
  [SIMULATION_SWITCH_PHASES.IN]: SIMULATION_SWITCH_PHASES.IDLE,
});

function hasCurrentGeneration(transaction, generation) {
  return Boolean(
    transaction
    && transaction.generation === Number(generation)
  );
}

function canMutate(transaction, generation) {
  return Boolean(
    hasCurrentGeneration(transaction, generation)
    && !transaction.cancelled
    && !transaction.settled
  );
}

function abortTransaction(transaction, reason) {
  if (!transaction.abortController || transaction.abortController.signal?.aborted) return;
  try {
    transaction.abortController.abort(reason);
  } catch {
    transaction.abortController.abort();
  }
}

function recordRecoveryPhase(transaction, phase) {
  if (!transaction.recovering) return;
  if (transaction.recoveryPhaseHistory.at(-1) === phase) return;
  transaction.recoveryPhaseHistory.push(phase);
}

function hasCompletedRecoveryIn(transaction) {
  const primeIndex = transaction.recoveryPhaseHistory.lastIndexOf(SIMULATION_SWITCH_PHASES.PRIME);
  const inIndex = transaction.recoveryPhaseHistory.lastIndexOf(SIMULATION_SWITCH_PHASES.IN);
  return primeIndex >= 0 && inIndex > primeIndex;
}

export function createSimulationSwitchTransaction({
  transactionId,
  generation,
  from,
  to,
  topology,
  timingMode = 'normal',
  abortController = null,
} = {}) {
  if (transactionId === undefined || transactionId === null || transactionId === '') {
    throw new TypeError('Simulation switch transactions require a transaction ID.');
  }
  if (!Number.isFinite(Number(generation)) || Number(generation) <= 0) {
    throw new TypeError('Simulation switch transactions require a positive generation.');
  }

  return {
    id: transactionId,
    generation: Number(generation),
    from,
    to,
    topology,
    phase: SIMULATION_SWITCH_PHASES.IDLE,
    phaseHistory: [SIMULATION_SWITCH_PHASES.IDLE],
    timingMode,
    committed: false,
    published: false,
    recovering: false,
    cancelled: false,
    settled: false,
    failure: false,
    error: null,
    commitCount: 0,
    publicationCount: 0,
    settlementEndpoint: '',
    settlementStatus: '',
    cancellationRequested: false,
    cancellationReason: '',
    rollbackHistory: [],
    recoveryPhaseHistory: [],
    abortController,
  };
}

export function advanceSimulationSwitchTransaction(
  transaction,
  nextPhase,
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation)) return false;
  if (transaction.phase === nextPhase) return true;
  if (LEGAL_PHASES[transaction.phase] !== nextPhase) return false;
  if (
    transaction.phase === SIMULATION_SWITCH_PHASES.COMMIT
    && nextPhase === SIMULATION_SWITCH_PHASES.PRIME
    && !transaction.committed
  ) {
    return false;
  }

  transaction.phase = nextPhase;
  transaction.phaseHistory.push(nextPhase);
  recordRecoveryPhase(transaction, nextPhase);
  return true;
}

export function markSimulationSwitchCommitted(
  transaction,
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation)) return false;
  if (transaction.phase !== SIMULATION_SWITCH_PHASES.COMMIT || transaction.committed) return false;
  transaction.committed = true;
  transaction.commitCount += 1;
  return true;
}

export function markSimulationSwitchPublished(
  transaction,
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation)) return false;
  if (!transaction.committed || transaction.published) return false;
  transaction.published = true;
  transaction.publicationCount += 1;
  return true;
}

export function beginSimulationSwitchRollback(
  transaction,
  error,
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation) || transaction.failure) return false;

  transaction.failure = true;
  transaction.error = error ?? new Error('Simulation switch failed.');
  transaction.settlementEndpoint = transaction.committed
    ? SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS
    : SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING;
  transaction.recovering = transaction.committed;
  transaction.rollbackHistory.push({
    type: 'rollback-begun',
    phase: transaction.phase,
    endpoint: transaction.settlementEndpoint,
  });
  abortTransaction(transaction, transaction.error);
  return true;
}

export function rewindSimulationSwitchTransactionForRecovery(
  transaction,
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation)) return false;
  if (!transaction.committed || !transaction.recovering) return false;
  if (transaction.settlementEndpoint !== SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS) {
    return false;
  }
  if (
    transaction.phase !== SIMULATION_SWITCH_PHASES.COMMIT
    && transaction.phase !== SIMULATION_SWITCH_PHASES.PRIME
    && transaction.phase !== SIMULATION_SWITCH_PHASES.IN
  ) {
    return false;
  }

  const fromPhase = transaction.phase;
  if (fromPhase === SIMULATION_SWITCH_PHASES.COMMIT) {
    transaction.phase = SIMULATION_SWITCH_PHASES.PRIME;
    transaction.phaseHistory.push(SIMULATION_SWITCH_PHASES.PRIME);
  } else if (fromPhase === SIMULATION_SWITCH_PHASES.IN) {
    transaction.phase = SIMULATION_SWITCH_PHASES.PRIME;
    transaction.phaseHistory.push(SIMULATION_SWITCH_PHASES.PRIME);
  }
  recordRecoveryPhase(transaction, SIMULATION_SWITCH_PHASES.PRIME);
  transaction.rollbackHistory.push({
    type: 'recovery-prime',
    fromPhase,
    toPhase: SIMULATION_SWITCH_PHASES.PRIME,
  });
  return true;
}

export function cancelSimulationSwitchTransaction(
  transaction,
  reason = 'cancelled',
  generation = transaction?.generation,
) {
  if (!transaction || transaction.cancelled || transaction.settled || transaction.cancellationRequested) {
    return false;
  }

  const cancellationReason = String(reason || 'cancelled');
  transaction.cancellationRequested = true;
  transaction.cancellationReason = cancellationReason;

  if (!hasCurrentGeneration(transaction, generation)) {
    transaction.cancelled = true;
    transaction.settlementEndpoint = SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.DISCARD_STALE;
  } else if (!transaction.committed) {
    transaction.cancelled = true;
    transaction.settlementEndpoint = SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING;
    if (transaction.phase !== SIMULATION_SWITCH_PHASES.IDLE) {
      transaction.phase = SIMULATION_SWITCH_PHASES.IDLE;
      transaction.phaseHistory.push(SIMULATION_SWITCH_PHASES.IDLE);
    }
    transaction.settlementStatus = 'cancelled';
  } else {
    transaction.failure = true;
    transaction.error = new Error(cancellationReason);
    transaction.recovering = true;
    transaction.settlementEndpoint = SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS;
  }

  transaction.rollbackHistory.push({
    type: 'cancelled',
    phase: transaction.phase,
    endpoint: transaction.settlementEndpoint,
  });
  abortTransaction(transaction, cancellationReason);
  return true;
}

export function canSettleSimulationSwitchTransaction(
  transaction,
  {
    endpoint = SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
    publish = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
  } = {},
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation)) return false;
  if (!Object.values(SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS).includes(endpoint)) return false;

  const settlesIncoming = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING;
  const restoresOutgoing = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING;
  const restoresPrevious = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS;
  const preservesTarget = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_TARGET;

  if (settlesIncoming) {
    if (!transaction.committed || transaction.failure || transaction.recovering || publish !== true) {
      return false;
    }
    if (transaction.published || transaction.phase !== SIMULATION_SWITCH_PHASES.IN) return false;
  } else if (restoresOutgoing) {
    if (transaction.committed || !transaction.failure || transaction.recovering || publish) return false;
  } else if (restoresPrevious) {
    if (!transaction.committed || !transaction.recovering || publish) return false;
    if (transaction.phase !== SIMULATION_SWITCH_PHASES.IN || !hasCompletedRecoveryIn(transaction)) {
      return false;
    }
  } else if (preservesTarget) {
    if (!transaction.committed || !transaction.failure || !transaction.recovering || publish !== true) {
      return false;
    }
    if (transaction.published || transaction.phase !== SIMULATION_SWITCH_PHASES.IN) return false;
  } else {
    return false;
  }

  return true;
}

export function settleSimulationSwitchTransaction(
  transaction,
  options = {},
  generation = transaction?.generation,
) {
  const {
    status = 'ready',
    endpoint = SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
    publish = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
  } = options;
  if (!canSettleSimulationSwitchTransaction(transaction, {
    status,
    endpoint,
    publish,
  }, generation)) return false;

  const settlesIncoming = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING;
  const restoresPrevious = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS;
  const preservesTarget = endpoint === SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_TARGET;

  if (settlesIncoming || restoresPrevious || preservesTarget) {
    if (!advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IDLE, generation)) {
      return false;
    }
  } else if (transaction.phase !== SIMULATION_SWITCH_PHASES.IDLE) {
    const fromPhase = transaction.phase;
    transaction.phase = SIMULATION_SWITCH_PHASES.IDLE;
    transaction.phaseHistory.push(SIMULATION_SWITCH_PHASES.IDLE);
    transaction.rollbackHistory.push({
      type: 'outgoing-restored',
      fromPhase,
      toPhase: SIMULATION_SWITCH_PHASES.IDLE,
    });
  }

  if (publish && !markSimulationSwitchPublished(transaction, generation)) return false;
  transaction.settled = true;
  transaction.settlementStatus = String(status || 'ready');
  transaction.settlementEndpoint = endpoint;
  return true;
}

export function failOpenSimulationSwitchTransaction(
  transaction,
  status = 'failed-open-mounted',
  generation = transaction?.generation,
) {
  if (!canMutate(transaction, generation)) return false;
  if (!transaction.committed || !transaction.failure || !transaction.recovering) return false;

  const fromPhase = transaction.phase;
  if (fromPhase !== SIMULATION_SWITCH_PHASES.IDLE) {
    transaction.phase = SIMULATION_SWITCH_PHASES.IDLE;
    transaction.phaseHistory.push(SIMULATION_SWITCH_PHASES.IDLE);
  }
  transaction.rollbackHistory.push({
    type: 'failed-open-mounted',
    fromPhase,
    toPhase: SIMULATION_SWITCH_PHASES.IDLE,
  });
  transaction.settled = true;
  transaction.settlementStatus = String(status || 'failed-open-mounted');
  transaction.settlementEndpoint = SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_MOUNTED;
  return true;
}

export function isSimulationSwitchTransactionStale(transaction, generation) {
  return Boolean(
    !transaction
    || transaction.cancelled
    || transaction.settled
    || transaction.generation !== Number(generation)
  );
}
