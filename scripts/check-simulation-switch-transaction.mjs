import assert from 'node:assert/strict';
import test from 'node:test';

import {
  SIMULATION_SWITCH_PHASES,
  SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS,
  advanceSimulationSwitchTransaction,
  beginSimulationSwitchRollback,
  canSettleSimulationSwitchTransaction,
  cancelSimulationSwitchTransaction,
  createSimulationSwitchTransaction,
  failOpenSimulationSwitchTransaction,
  isSimulationSwitchTransactionStale,
  markSimulationSwitchCommitted,
  markSimulationSwitchPublished,
  rewindSimulationSwitchTransactionForRecovery,
  settleSimulationSwitchTransaction,
} from '../react-app/app/src/lib/motion/simulation-switch-transaction.js';

const SUCCESS_PHASE_HISTORY = ['idle', 'prepare', 'out', 'commit', 'prime', 'in', 'idle'];

function createTransaction(overrides = {}) {
  return createSimulationSwitchTransaction({
    transactionId: 'switch-1',
    generation: 1,
    from: { id: 'foundation' },
    to: { id: 'scaffold' },
    topology: 'home-mode-to-home-mode',
    ...overrides,
  });
}

function advanceTo(transaction, finalPhase) {
  const phases = [
    SIMULATION_SWITCH_PHASES.PREPARE,
    SIMULATION_SWITCH_PHASES.OUT,
    SIMULATION_SWITCH_PHASES.COMMIT,
    SIMULATION_SWITCH_PHASES.PRIME,
    SIMULATION_SWITCH_PHASES.IN,
  ];
  for (const phase of phases) {
    assert.equal(advanceSimulationSwitchTransaction(transaction, phase), true);
    if (phase === SIMULATION_SWITCH_PHASES.COMMIT) {
      assert.equal(markSimulationSwitchCommitted(transaction), true);
    }
    if (phase === finalPhase) break;
  }
}

test('success follows the exact phase history and commits and publishes once', () => {
  const transaction = createTransaction();
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.IN);

  assert.equal(settleSimulationSwitchTransaction(transaction, {
    status: 'ready',
    endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
    publish: true,
  }), true);
  assert.deepEqual(transaction.phaseHistory, SUCCESS_PHASE_HISTORY);
  assert.equal(transaction.commitCount, 1);
  assert.equal(transaction.publicationCount, 1);
  assert.equal(transaction.committed, true);
  assert.equal(transaction.published, true);
  assert.equal(transaction.settled, true);
});

test('illegal and stale transitions are rejected without mutation', () => {
  const transaction = createTransaction();
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.OUT), false);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE, 2), false);
  assert.equal(markSimulationSwitchCommitted(transaction), false);
  assert.equal(markSimulationSwitchPublished(transaction), false);
  assert.deepEqual(transaction.phaseHistory, ['idle']);
  assert.equal(isSimulationSwitchTransactionStale(transaction, 2), true);
  assert.equal(isSimulationSwitchTransactionStale(transaction, 1), false);
});

test('all four topology labels use the same phase rules', () => {
  const topologies = [
    'home-mode-to-home-mode',
    'home-mode-to-route-backed',
    'route-backed-to-home-mode',
    'route-backed-to-route-backed',
  ];

  for (const [index, topology] of topologies.entries()) {
    const transaction = createTransaction({
      transactionId: `topology-${index}`,
      topology,
    });
    advanceTo(transaction, SIMULATION_SWITCH_PHASES.IN);
    assert.equal(settleSimulationSwitchTransaction(transaction, { publish: true }), true);
    assert.equal(transaction.topology, topology);
    assert.deepEqual(transaction.phaseHistory, SUCCESS_PHASE_HISTORY);
  }
});

test('prepare failure restores the untouched outgoing simulation without publishing', () => {
  const transaction = createTransaction();
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE), true);
  const error = new Error('preload failed');
  assert.equal(beginSimulationSwitchRollback(transaction, error), true);
  assert.equal(transaction.committed, false);
  assert.equal(transaction.recovering, false);
  assert.equal(transaction.error, error);
  assert.equal(transaction.settlementEndpoint, SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING);
  assert.equal(settleSimulationSwitchTransaction(transaction, {
    status: 'preload-failed',
    endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING,
    publish: false,
  }), true);
  assert.deepEqual(transaction.phaseHistory, ['idle', 'prepare', 'idle']);
  assert.equal(transaction.publicationCount, 0);
});

test('out cancellation restores the outgoing simulation and is terminal and idempotent', () => {
  const transaction = createTransaction();
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.OUT), true);
  assert.equal(cancelSimulationSwitchTransaction(transaction, 'newer selection'), true);
  assert.equal(cancelSimulationSwitchTransaction(transaction, 'duplicate'), false);
  assert.equal(transaction.cancelled, true);
  assert.equal(transaction.recovering, false);
  assert.equal(transaction.settlementEndpoint, SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING);
  assert.equal(transaction.phase, SIMULATION_SWITCH_PHASES.IDLE);
  assert.deepEqual(transaction.phaseHistory, ['idle', 'prepare', 'out', 'idle']);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.COMMIT), false);
});

test('prime failure after commit requires an explicit previous-runtime recovery prime and in', () => {
  const transaction = createTransaction();
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.PRIME);
  assert.equal(beginSimulationSwitchRollback(transaction, new Error('runtime readiness failed')), true);
  assert.equal(transaction.recovering, true);
  assert.equal(transaction.settlementEndpoint, SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS);
  assert.equal(settleSimulationSwitchTransaction(transaction, {
    status: 'recovered',
    endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS,
    publish: false,
  }), false);

  assert.equal(rewindSimulationSwitchTransactionForRecovery(transaction), true);
  assert.deepEqual(transaction.recoveryPhaseHistory, ['prime']);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IN), true);
  assert.equal(settleSimulationSwitchTransaction(transaction, {
    status: 'recovered',
    endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS,
    publish: false,
  }), true);
  assert.deepEqual(transaction.recoveryPhaseHistory, ['prime', 'in', 'idle']);
  assert.equal(transaction.publicationCount, 0);
});

test('post-commit cancellation requests recovery instead of falsely settling', () => {
  const transaction = createTransaction();
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.PRIME);
  assert.equal(cancelSimulationSwitchTransaction(transaction, 'superseded'), true);
  assert.equal(transaction.cancelled, false);
  assert.equal(transaction.cancellationRequested, true);
  assert.equal(transaction.recovering, true);
  assert.equal(transaction.settled, false);
  assert.equal(transaction.settlementEndpoint, SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.RESTORE_PREVIOUS);
  assert.equal(cancelSimulationSwitchTransaction(transaction, 'again'), false);
});

test('generation-scoped stale cancellation discards only the stale transaction', () => {
  const transaction = createTransaction({ generation: 7 });
  assert.equal(cancelSimulationSwitchTransaction(transaction, 'stale callback', 8), true);
  assert.equal(transaction.cancelled, true);
  assert.equal(transaction.settlementEndpoint, SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.DISCARD_STALE);
  assert.equal(isSimulationSwitchTransactionStale(transaction, 7), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE, 7), false);
});

test('reduced motion uses the identical lifecycle', () => {
  const transaction = createTransaction({ timingMode: 'reduced' });
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.IN);
  assert.equal(settleSimulationSwitchTransaction(transaction, { publish: true }), true);
  assert.equal(transaction.timingMode, 'reduced');
  assert.deepEqual(transaction.phaseHistory, SUCCESS_PHASE_HISTORY);
});

test('duplicate settle, commit, and publication are rejected', () => {
  const transaction = createTransaction();
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.OUT), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.COMMIT), true);
  assert.equal(markSimulationSwitchCommitted(transaction), true);
  assert.equal(markSimulationSwitchCommitted(transaction), false);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PRIME), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IN), true);
  assert.equal(settleSimulationSwitchTransaction(transaction, { publish: true }), true);
  assert.equal(markSimulationSwitchPublished(transaction), false);
  assert.equal(settleSimulationSwitchTransaction(transaction, { publish: true }), false);
  assert.equal(transaction.commitCount, 1);
  assert.equal(transaction.publicationCount, 1);
});

test('same phase is idempotent and does not duplicate phase history', () => {
  const transaction = createTransaction();
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IDLE), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.PREPARE), true);
  assert.deepEqual(transaction.phaseHistory, ['idle', 'prepare']);
});

test('publication can be preflighted before atomic external side effects', () => {
  const transaction = createTransaction();
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.IN);
  const options = {
    status: 'ready',
    endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING,
    publish: true,
  };
  assert.equal(canSettleSimulationSwitchTransaction(transaction, options), true);
  assert.equal(settleSimulationSwitchTransaction(transaction, options), true);
  assert.equal(canSettleSimulationSwitchTransaction(transaction, options), false);
});

test('failed recovery may preserve and publish the actually mounted target', () => {
  const transaction = createTransaction();
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.PRIME);
  assert.equal(beginSimulationSwitchRollback(transaction, new Error('target failed')), true);
  assert.equal(rewindSimulationSwitchTransactionForRecovery(transaction), true);
  assert.equal(advanceSimulationSwitchTransaction(transaction, SIMULATION_SWITCH_PHASES.IN), true);
  assert.equal(settleSimulationSwitchTransaction(transaction, {
    status: 'degraded-target',
    endpoint: SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_TARGET,
    publish: true,
  }), true);
  assert.equal(transaction.publicationCount, 1);
  assert.equal(transaction.settlementEndpoint, SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_TARGET);
});

test('double recovery failure terminates on the mounted owner without a false publication', () => {
  const transaction = createTransaction();
  advanceTo(transaction, SIMULATION_SWITCH_PHASES.PRIME);
  assert.equal(beginSimulationSwitchRollback(transaction, new Error('target failed')), true);
  assert.equal(failOpenSimulationSwitchTransaction(transaction, 'recovery-failed-open'), true);
  assert.equal(transaction.phase, SIMULATION_SWITCH_PHASES.IDLE);
  assert.equal(transaction.settled, true);
  assert.equal(transaction.published, false);
  assert.equal(transaction.publicationCount, 0);
  assert.equal(transaction.settlementStatus, 'recovery-failed-open');
  assert.equal(
    transaction.settlementEndpoint,
    SIMULATION_SWITCH_SETTLEMENT_ENDPOINTS.PRESERVE_MOUNTED,
  );
});
