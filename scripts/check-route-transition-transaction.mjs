import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ROUTE_NAVIGATION_DECISIONS,
  ROUTE_SETTLEMENT_ENDPOINTS,
  ROUTE_TRANSACTION_PHASES,
  advanceRouteTransitionTransaction,
  cancelRouteTransitionTransaction,
  classifyRouteNavigationIntent,
  createRouteTransitionTransaction,
  isRouteTransitionTransactionStale,
  markRouteTransitionCommitted,
  settleRouteTransitionTransaction,
} from '../react-app/app/src/lib/motion/route-transition-transaction.js';
import { createRouteHistoryDriver } from '../react-app/app/src/lib/motion/route-transition-navigation.js';
import {
  createRouteTransitionParticipantGeneration,
  registerRouteTransitionParticipant,
} from '../react-app/app/src/lib/motion/route-transition-participants.js';

function createTransaction(overrides = {}) {
  return createRouteTransitionTransaction({
    generation: 1,
    fromState: { route: { id: 'home' } },
    toState: { route: { id: 'portfolio' } },
    ...overrides,
  });
}

test('normal route transaction follows the only legal phase order', () => {
  const transaction = createTransaction();
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT), true);
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_LOADING), true);
  assert.equal(markRouteTransitionCommitted(transaction), true);
  assert.equal(markRouteTransitionCommitted(transaction), false);
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_IN), true);
  assert.equal(settleRouteTransitionTransaction(transaction), true);
  assert.deepEqual(transaction.phaseHistory, ['idle', 'route-out', 'route-loading', 'route-in', 'idle']);
  assert.equal(transaction.settlementStatus, 'ready');
  assert.equal(transaction.settlementEndpoint, ROUTE_SETTLEMENT_ENDPOINTS.SETTLE_INCOMING);
});

test('covered resume starts at route-loading without inventing route-out', () => {
  const transaction = createTransaction({ resumedCovered: true });
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_LOADING), true);
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_IN), true);
  assert.equal(settleRouteTransitionTransaction(transaction), true);
  assert.deepEqual(transaction.phaseHistory, ['idle', 'route-loading', 'route-in', 'idle']);
});

test('illegal and stale completion cannot advance a transaction', () => {
  const transaction = createTransaction();
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_IN), false);
  assert.equal(isRouteTransitionTransactionStale(transaction, 2), true);
  assert.equal(cancelRouteTransitionTransaction(transaction, 'retargeted'), true);
  assert.equal(cancelRouteTransitionTransaction(transaction, 'again'), false);
  assert.equal(advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT), false);
  assert.equal(markRouteTransitionCommitted(transaction), false);
  assert.equal(settleRouteTransitionTransaction(transaction), false);
  assert.equal(transaction.cancellationReason, 'retargeted');
});

test('navigation intent decisions are deterministic', () => {
  assert.equal(classifyRouteNavigationIntent(), ROUTE_NAVIGATION_DECISIONS.START);
  assert.equal(classifyRouteNavigationIntent({ repeatsActive: true }), ROUTE_NAVIGATION_DECISIONS.IGNORE);
  assert.equal(classifyRouteNavigationIntent({ transitionActive: true, activeRecovering: true }), ROUTE_NAVIGATION_DECISIONS.QUEUE);
  assert.equal(classifyRouteNavigationIntent({ transitionActive: true, gateActive: true }), ROUTE_NAVIGATION_DECISIONS.QUEUE);
  assert.equal(classifyRouteNavigationIntent({
    transitionActive: true,
    activeCommitted: false,
    phase: ROUTE_TRANSACTION_PHASES.ROUTE_OUT,
  }), ROUTE_NAVIGATION_DECISIONS.RETARGET_COVERED);
  assert.equal(classifyRouteNavigationIntent({
    transitionActive: true,
    activeCommitted: true,
    phase: ROUTE_TRANSACTION_PHASES.ROUTE_LOADING,
  }), ROUTE_NAVIGATION_DECISIONS.RETARGET_COVERED);
  assert.equal(classifyRouteNavigationIntent({
    transitionActive: true,
    activeCommitted: true,
    phase: ROUTE_TRANSACTION_PHASES.ROUTE_IN,
  }), ROUTE_NAVIGATION_DECISIONS.RECOVER_ROUTE_IN);
  assert.equal(classifyRouteNavigationIntent({
    transitionActive: true,
    activeCommitted: true,
    phase: ROUTE_TRANSACTION_PHASES.ROUTE_OUT,
    allowPreempt: true,
  }), ROUTE_NAVIGATION_DECISIONS.PREEMPT);
});

test('pre-commit failure restores the outgoing route from a covered phase', () => {
  const transaction = createTransaction();
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT);
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_LOADING);
  assert.equal(settleRouteTransitionTransaction(
    transaction,
    'preload-failed',
    ROUTE_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING,
  ), true);
  assert.equal(transaction.committed, false);
  assert.equal(transaction.settlementEndpoint, ROUTE_SETTLEMENT_ENDPOINTS.RESTORE_OUTGOING);
  assert.deepEqual(transaction.phaseHistory, ['idle', 'route-out', 'route-loading', 'idle']);
});

test('post-commit failure can preserve a covered mounted destination', () => {
  const transaction = createTransaction();
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT);
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_LOADING);
  markRouteTransitionCommitted(transaction);
  assert.equal(settleRouteTransitionTransaction(
    transaction,
    'mount-failed',
    ROUTE_SETTLEMENT_ENDPOINTS.PRESERVE_COVERED_DESTINATION,
  ), true);
  assert.equal(transaction.committed, true);
  assert.equal(transaction.settlementEndpoint, ROUTE_SETTLEMENT_ENDPOINTS.PRESERVE_COVERED_DESTINATION);
});

test('readiness timeout follows the normal incoming settlement endpoint', () => {
  const transaction = createTransaction({ timingMode: 'reduced' });
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT);
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_LOADING);
  markRouteTransitionCommitted(transaction);
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_IN);
  assert.equal(settleRouteTransitionTransaction(transaction, 'readiness-timeout'), true);
  assert.equal(transaction.timingMode, 'reduced');
  assert.equal(transaction.settlementStatus, 'readiness-timeout');
});

test('retarget cancellation records detached-content cleanup', () => {
  const transaction = createTransaction();
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT);
  assert.equal(cancelRouteTransitionTransaction(transaction, 'latest-intent'), true);
  assert.equal(transaction.settlementEndpoint, ROUTE_SETTLEMENT_ENDPOINTS.DISCARD_DETACHED_CONTENT);
  assert.equal(isRouteTransitionTransactionStale(transaction, transaction.generation), true);
});

test('history navigation carries no write mode and uses the same phase machine', () => {
  const transaction = createTransaction({ historyMode: 'none', activation: 'history' });
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_OUT);
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_LOADING);
  markRouteTransitionCommitted(transaction);
  advanceRouteTransitionTransaction(transaction, ROUTE_TRANSACTION_PHASES.ROUTE_IN);
  settleRouteTransitionTransaction(transaction);
  assert.equal(transaction.historyMode, 'none');
  assert.equal(transaction.activation, 'history');
  assert.deepEqual(transaction.phaseHistory, ['idle', 'route-out', 'route-loading', 'route-in', 'idle']);
});

test('history driver does not rewrite a browser back or forward entry on commit', () => {
  const calls = [];
  globalThis.window = {
    history: {
      state: { key: 'existing' },
      pushState: (...args) => calls.push(['push', ...args]),
      replaceState: (...args) => calls.push(['replace', ...args]),
    },
  };
  try {
    const driver = createRouteHistoryDriver({
      source: 'history',
      nextHref: '/about.html',
      previousHref: '/index.html',
    });
    assert.equal(driver.historyMode, 'none');
    assert.equal(driver.committed, true);
    assert.equal(driver.commit(), false);
    assert.deepEqual(calls, []);
  } finally {
    delete globalThis.window;
  }
});

test('participant generation preserves the complete route lifecycle order', async () => {
  const calls = [];
  const unregister = registerRouteTransitionParticipant({
    id: 'transaction-test-lifecycle',
    routeId: '*',
    exit: ({ generation }) => calls.push(`exit:${generation}`),
    prepare: ({ generation }) => calls.push(`prepare:${generation}`),
    waitUntilReady: ({ generation }) => calls.push(`ready:${generation}`),
    enter: ({ generation }) => calls.push(`enter:${generation}`),
    complete: ({ generation, status }) => calls.push(`complete:${generation}:${status}`),
    cancel: () => calls.push('unexpected-cancel'),
  });
  try {
    const participantGeneration = createRouteTransitionParticipantGeneration({
      generation: 7,
      fromRouteId: 'home',
      toRouteId: 'portfolio',
      signal: new AbortController().signal,
    });
    await participantGeneration.exit();
    await participantGeneration.prepare();
    await participantGeneration.waitUntilReady();
    await participantGeneration.enter();
    participantGeneration.complete('ready');
    participantGeneration.complete('stale');
    participantGeneration.cancel('stale');
    assert.deepEqual(calls, [
      'exit:7',
      'prepare:7',
      'ready:7',
      'enter:7',
      'complete:7:ready',
    ]);
  } finally {
    unregister();
  }
});

test('participant restoration and cancellation are generation scoped and idempotent', async () => {
  const calls = [];
  const unregister = registerRouteTransitionParticipant({
    id: 'transaction-test-restore',
    routeId: '*',
    exit: () => calls.push('exit'),
    restore: () => calls.push('restore'),
    cancel: ({ generation, reason, signal }) => calls.push(
      `cancel:${generation}:${reason}:${signal.aborted}`
    ),
    complete: () => calls.push('unexpected-complete'),
  });
  try {
    const controller = new AbortController();
    const participantGeneration = createRouteTransitionParticipantGeneration({
      generation: 8,
      fromRouteId: 'portfolio',
      toRouteId: 'about',
      signal: controller.signal,
    });
    await participantGeneration.exit();
    await participantGeneration.restore();
    participantGeneration.cancel('preload-failed');
    participantGeneration.cancel('stale');
    participantGeneration.complete('stale');
    controller.abort('stale-parent');
    assert.deepEqual(calls, ['exit', 'restore', 'cancel:8:preload-failed:true']);
  } finally {
    unregister();
  }
});
