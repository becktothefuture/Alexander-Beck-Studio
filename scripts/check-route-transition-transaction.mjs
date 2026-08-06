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
import {
  createRouteHistoryCoordinator,
  createRouteHistoryDriver,
} from '../react-app/app/src/lib/motion/route-transition-navigation.js';
import {
  createAdaptiveSpinnerController,
} from '../react-app/app/src/lib/motion/route-transition-loader-timing.js';
import {
  ROUTE_LOADER_BACKDROP_MODES,
  resolveRouteLoaderBackdropMode,
} from '../react-app/app/src/lib/motion/route-transition-backplane.js';
import {
  createRouteTransitionParticipantGeneration,
  registerRouteTransitionParticipant,
} from '../react-app/app/src/lib/motion/route-transition-participants.js';
import {
  isDailyLabRouteId,
  observeRouteBaselineReady,
  waitForObservedRouteReady,
} from '../react-app/app/src/lib/motion/route-transition-readiness.js';
import {
  createIndexedSimulationVisualTransition,
  registerSimulationVisualTransition,
} from '../react-app/app/src/lib/simulationVisualTransition.js';
import {
  isCanvasBackingStoreUsable,
  resolveCanvasBackingStoreReadinessScale,
} from '../react-app/app/src/lib/canvas-backing-store-readiness.js';

function createTransaction(overrides = {}) {
  return createRouteTransitionTransaction({
    generation: 1,
    fromState: { route: { id: 'home' } },
    toState: { route: { id: 'portfolio' } },
    ...overrides,
  });
}

function createFakeClock() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => now,
    setTimer(callback, delayMs) {
      const id = nextId++;
      timers.set(id, { callback, at: now + Math.max(0, delayMs) });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    tick(durationMs) {
      const target = now + durationMs;
      while (true) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.at <= target)
          .sort((left, right) => left[1].at - right[1].at)[0];
        if (!next) break;
        const [id, timer] = next;
        timers.delete(id);
        now = timer.at;
        timer.callback();
      }
      now = target;
    },
    get pendingCount() {
      return timers.size;
    },
  };
}

function createFakeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (...names) => names.forEach((name) => values.add(name)),
    remove: (...names) => names.forEach((name) => values.delete(name)),
    contains: (name) => values.has(name),
  };
}

function createFakeElement({
  classes = [],
  dataset = {},
  rect = { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 },
  styles = { display: 'block', visibility: 'visible', opacity: '1' },
  width = 0,
  height = 0,
} = {}) {
  return {
    classList: createFakeClassList(classes),
    dataset: { ...dataset },
    width,
    height,
    clientWidth: rect.width,
    clientHeight: rect.height,
    styles,
    getBoundingClientRect: () => ({ ...rect }),
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

function createReadinessHarness({ hostname = 'example.test' } = {}) {
  const clock = createFakeClock();
  const listeners = new Map();
  const elementsById = new Map();
  const selectors = new Map();
  const root = createFakeElement();
  const body = createFakeElement();
  let runtimeSnapshot = { generation: 7, routeId: null, status: 'idle' };
  const fakeWindow = {
    location: { hostname },
    devicePixelRatio: 1,
    setTimeout: clock.setTimer,
    clearTimeout: clock.clearTimer,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
      if (listeners.get(type)?.size === 0) listeners.delete(type);
    },
    dispatchEvent(event) {
      [...(listeners.get(event.type) || [])].forEach((listener) => listener(event));
      return true;
    },
    getComputedStyle(element) {
      return element?.styles || { display: 'block', visibility: 'visible', opacity: '1' };
    },
  };
  const fakeDocument = {
    body,
    documentElement: root,
    getElementById: (id) => elementsById.get(id) || null,
    querySelector: (selector) => selectors.get(selector) || null,
    querySelectorAll: (selector) => selectors.get(selector) || [],
  };
  const previousDescriptors = {
    window: Object.getOwnPropertyDescriptor(globalThis, 'window'),
    document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
    performance: Object.getOwnPropertyDescriptor(globalThis, 'performance'),
  };
  Object.defineProperties(globalThis, {
    window: { configurable: true, writable: true, value: fakeWindow },
    document: { configurable: true, writable: true, value: fakeDocument },
    performance: { configurable: true, writable: true, value: { now: clock.now } },
  });

  const restoreProperty = (name, descriptor) => {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else delete globalThis[name];
  };

  return {
    body,
    clock,
    document: fakeDocument,
    elementsById,
    getRuntimeSnapshot: () => runtimeSnapshot,
    listenerCount: () => [...listeners.values()].reduce((count, group) => count + group.size, 0),
    root,
    selectors,
    setRuntimeSnapshot(next) {
      runtimeSnapshot = { ...next };
    },
    dispatch(type, detail = {}) {
      fakeWindow.dispatchEvent({ type, detail });
    },
    restore() {
      restoreProperty('window', previousDescriptors.window);
      restoreProperty('document', previousDescriptors.document);
      restoreProperty('performance', previousDescriptors.performance);
    },
  };
}

async function flushPromiseJobs() {
  await Promise.resolve();
  await Promise.resolve();
}

function assertReadinessWaiterClean(harness) {
  assert.equal(harness.listenerCount(), 0);
  assert.equal(harness.clock.pendingCount, 0);
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

test('persistent backplane handoff is limited to Home and Work', () => {
  assert.equal(
    resolveRouteLoaderBackdropMode('home', 'portfolio'),
    ROUTE_LOADER_BACKDROP_MODES.PRESERVE,
  );
  assert.equal(
    resolveRouteLoaderBackdropMode('portfolio', 'home'),
    ROUTE_LOADER_BACKDROP_MODES.PRESERVE,
  );
  assert.equal(
    resolveRouteLoaderBackdropMode('home', 'about'),
    ROUTE_LOADER_BACKDROP_MODES.OPAQUE,
  );
  assert.equal(
    resolveRouteLoaderBackdropMode('contact', 'portfolio'),
    ROUTE_LOADER_BACKDROP_MODES.OPAQUE,
  );
});

test('canonical navigation and effective readiness identities remain distinct', () => {
  const transaction = createTransaction({
    fromState: { route: { id: 'about' } },
    toState: { route: { id: 'home' } },
    fromReadinessRouteId: 'about',
    toReadinessRouteId: 'flock-of-birds',
  });
  assert.equal(transaction.toState.route.id, 'home');
  assert.equal(transaction.toReadinessRouteId, 'flock-of-birds');
  assert.equal(transaction.fromReadinessRouteId, 'about');
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
  }), ROUTE_NAVIGATION_DECISIONS.QUEUE);
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
  }), ROUTE_NAVIGATION_DECISIONS.QUEUE);
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

test('provisional history coalesces covered destinations until route-in', () => {
  const calls = [];
  globalThis.window = {
    history: {
      state: { key: 'home' },
      pushState: (...args) => calls.push(['push', ...args]),
      replaceState: (...args) => calls.push(['replace', ...args]),
    },
  };
  try {
    const coordinator = createRouteHistoryCoordinator({ history: window.history });
    const work = createRouteHistoryDriver({
      coordinator,
      nextHref: '/portfolio.html',
      previousHref: '/index.html',
    });
    const contact = createRouteHistoryDriver({
      coordinator,
      nextHref: '/contact.html',
      previousHref: '/index.html',
    });
    const about = createRouteHistoryDriver({
      coordinator,
      nextHref: '/about.html',
      previousHref: '/index.html',
    });
    work.commit();
    contact.commit();
    about.commit();
    assert.deepEqual(calls, []);
    assert.equal(coordinator.provisional.nextHref, '/about.html');
    assert.equal(about.finalize(), true);
    assert.deepEqual(calls, [['push', {}, '', '/about.html']]);
    assert.equal(coordinator.provisional, null);
    assert.equal(work.finalize(), false);
  } finally {
    delete globalThis.window;
  }
});

test('provisional history rollback performs no browser write', () => {
  const calls = [];
  globalThis.window = {
    history: {
      state: {},
      pushState: (...args) => calls.push(['push', ...args]),
      replaceState: (...args) => calls.push(['replace', ...args]),
    },
  };
  try {
    const coordinator = createRouteHistoryCoordinator({ history: window.history });
    const driver = createRouteHistoryDriver({
      coordinator,
      nextHref: '/contact.html',
      previousHref: '/index.html',
    });
    driver.commit();
    driver.rollback();
    assert.deepEqual(calls, []);
    assert.equal(coordinator.provisional, null);
  } finally {
    delete globalThis.window;
  }
});

test('adaptive spinner cancels a warm wait before the delay', async () => {
  const clock = createFakeClock();
  const presentations = [];
  const spinner = createAdaptiveSpinnerController({
    delayMs: 120,
    minimumMs: 140,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onPresentationChange: (presentation) => presentations.push(presentation),
  });
  spinner.begin();
  clock.tick(80);
  await spinner.resolve();
  clock.tick(100);
  assert.equal(spinner.presentation, 'plate');
  assert.deepEqual(presentations, []);
  assert.equal(clock.pendingCount, 0);
});

test('adaptive spinner escalates once and honours its minimum presence', async () => {
  const clock = createFakeClock();
  const presentations = [];
  const spinner = createAdaptiveSpinnerController({
    delayMs: 120,
    minimumMs: 140,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onPresentationChange: (presentation) => presentations.push([presentation, clock.now()]),
  });
  spinner.begin();
  clock.tick(120);
  assert.equal(spinner.presentation, 'spinner');
  const resolution = spinner.resolve();
  let resolved = false;
  void resolution.then(() => { resolved = true; });
  clock.tick(139);
  await Promise.resolve();
  assert.equal(resolved, false);
  clock.tick(1);
  await resolution;
  assert.deepEqual(presentations, [['spinner', 120]]);
});

test('covered retarget reuses the original spinner delay and cancellation clears timers', async () => {
  const clock = createFakeClock();
  const presentations = [];
  const spinner = createAdaptiveSpinnerController({
    delayMs: 120,
    minimumMs: 140,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    onPresentationChange: (presentation) => presentations.push([presentation, clock.now()]),
  });
  spinner.begin();
  clock.tick(90);
  spinner.begin();
  clock.tick(30);
  assert.deepEqual(presentations, [['spinner', 120]]);
  const resolution = spinner.resolve();
  spinner.cancel();
  await resolution;
  assert.equal(spinner.presentation, 'plate');
  assert.equal(clock.pendingCount, 0);
});

test('reduced motion uses the same delay without an artificial spinner hold', async () => {
  const clock = createFakeClock();
  const spinner = createAdaptiveSpinnerController({
    delayMs: 120,
    minimumMs: 140,
    reducedMotion: true,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  spinner.begin();
  clock.tick(150);
  assert.equal(spinner.presentation, 'spinner');
  await spinner.resolve();
  assert.equal(clock.pendingCount, 0);
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

test('readiness observes only the incoming route and shared participants', async () => {
  const calls = [];
  const unregister = [
    registerRouteTransitionParticipant({
      id: 'transaction-test-readiness-home',
      routeId: 'home',
      waitUntilReady: () => calls.push('unexpected-home-ready'),
      complete: ({ status }) => calls.push(`home-complete:${status}`),
    }),
    registerRouteTransitionParticipant({
      id: 'transaction-test-readiness-portfolio',
      routeId: 'portfolio',
      waitUntilReady: () => calls.push('portfolio-ready'),
      complete: ({ status }) => calls.push(`portfolio-complete:${status}`),
    }),
    registerRouteTransitionParticipant({
      id: 'transaction-test-readiness-shared',
      routeId: '*',
      waitUntilReady: () => calls.push('shared-ready'),
      complete: ({ status }) => calls.push(`shared-complete:${status}`),
    }),
  ];
  try {
    const participantGeneration = createRouteTransitionParticipantGeneration({
      generation: 9,
      fromRouteId: 'home',
      toRouteId: 'portfolio',
      signal: new AbortController().signal,
    });
    await participantGeneration.waitUntilReady();
    participantGeneration.complete('ready');
    assert.deepEqual(calls.slice(0, 2), ['portfolio-ready', 'shared-ready']);
    assert.deepEqual(calls.slice(2).sort(), [
      'home-complete:ready',
      'portfolio-complete:ready',
      'shared-complete:ready',
    ]);
  } finally {
    unregister.forEach((dispose) => dispose());
  }
});

test('route readiness observation keeps canonical daily route identities explicit', () => {
  assert.equal(isDailyLabRouteId('repel-room'), true);
  assert.equal(isDailyLabRouteId('flock-of-birds'), true);
  assert.equal(isDailyLabRouteId('rift-rings'), true);
  assert.equal(isDailyLabRouteId('home'), false);
  assert.equal(isDailyLabRouteId('beach-ball-room'), false);
});

test('route readiness accepts only matching route and runtime-generation events', async () => {
  const harness = createReadinessHarness();
  try {
    let settlement = null;
    const waiter = waitForObservedRouteReady(
      'standalone-tool',
      50,
      {},
      harness.getRuntimeSnapshot,
    );
    waiter.promise.then((status) => { settlement = status; });
    harness.elementsById.set('app-frame', createFakeElement());

    harness.dispatch('abs:route-ready', { routeId: 'portfolio', generation: 7 });
    harness.dispatch('abs:route-ready', { routeId: 'standalone-tool', generation: 6 });
    await flushPromiseJobs();
    assert.equal(settlement, null);
    assert.equal(harness.listenerCount(), 3);

    harness.dispatch('abs:route-ready', { routeId: 'standalone-tool', generation: 7 });
    assert.equal(await waiter.promise, 'ready');
    assertReadinessWaiterClean(harness);
  } finally {
    harness.restore();
  }
});

test('route readiness failure ignores other routes and cleans up deterministically', async () => {
  const harness = createReadinessHarness();
  try {
    let settlement = null;
    const waiter = waitForObservedRouteReady(
      'portfolio',
      50,
      {},
      harness.getRuntimeSnapshot,
    );
    waiter.promise.then((status) => { settlement = status; });
    harness.dispatch('abs:route-failed', { routeId: 'home' });
    await flushPromiseJobs();
    assert.equal(settlement, null);

    harness.dispatch('abs:daily-focus-failed', { routeId: 'portfolio' });
    assert.equal(await waiter.promise, 'failed');
    assertReadinessWaiterClean(harness);
  } finally {
    harness.restore();
  }
});

test('route readiness timeout and cancellation each remove listeners and timers', async () => {
  const timeoutHarness = createReadinessHarness();
  try {
    const waiter = waitForObservedRouteReady(
      'portfolio',
      40,
      {},
      timeoutHarness.getRuntimeSnapshot,
    );
    timeoutHarness.clock.tick(40);
    assert.equal(await waiter.promise, 'timeout');
    assertReadinessWaiterClean(timeoutHarness);
  } finally {
    timeoutHarness.restore();
  }

  const cancellationHarness = createReadinessHarness();
  try {
    const waiter = waitForObservedRouteReady(
      'portfolio',
      40,
      {},
      cancellationHarness.getRuntimeSnapshot,
    );
    waiter.cancel();
    waiter.cancel('ignored-second-settlement');
    assert.equal(await waiter.promise, 'cancelled');
    assertReadinessWaiterClean(cancellationHarness);
  } finally {
    cancellationHarness.restore();
  }
});

test('local route-readiness delay holds an otherwise ready route until its boundary', async () => {
  const harness = createReadinessHarness({ hostname: 'localhost' });
  try {
    harness.elementsById.set('app-frame', createFakeElement());
    window.__ABS_AUDIT_ROUTE_READINESS_DELAY_MS__ = 40;
    let settlement = null;
    const waiter = waitForObservedRouteReady(
      'standalone-tool',
      100,
      { readinessStartedAt: 1 },
      harness.getRuntimeSnapshot,
    );
    waiter.promise.then((status) => { settlement = status; });

    harness.clock.tick(40);
    harness.dispatch('abs:route-ready', { routeId: 'standalone-tool', generation: 7 });
    await flushPromiseJobs();
    assert.equal(settlement, null);

    harness.clock.tick(1);
    harness.dispatch('abs:route-ready', { routeId: 'standalone-tool', generation: 7 });
    assert.equal(await waiter.promise, 'ready');
    assertReadinessWaiterClean(harness);
  } finally {
    harness.restore();
  }
});

test('Home readiness requires the prepared Canvas, runtime, shell, and title contract', () => {
  const harness = createReadinessHarness();
  try {
    const canvas = createFakeElement({
      rect: { top: 0, left: 0, right: 640, bottom: 360, width: 640, height: 360 },
      width: 642,
      height: 362,
    });
    const hero = createFakeElement();
    hero.querySelector = (selector) => (
      selector === '.hero-title__name' ? { textContent: 'Alexander Beck' } : null
    );
    hero.querySelectorAll = (selector) => (
      selector === '.hero-title__role'
        ? [{ textContent: 'Designer' }, { textContent: 'Engineer' }]
        : []
    );
    harness.elementsById.set('c', canvas);
    harness.elementsById.set('hero-title', hero);
    harness.document.querySelectorAll = (selector) => (
      selector === '[data-route-tab]' ? [{}, {}, {}, {}, {}] : []
    );
    harness.root.dataset.absBootState = 'ready';
    harness.root.dataset.absHomeRouteReady = 'true';
    harness.root.dataset.absHomeCanvasTitleReady = 'true';
    harness.setRuntimeSnapshot({ generation: 7, routeId: 'home', status: 'ready' });

    assert.equal(observeRouteBaselineReady('home', {}, harness.getRuntimeSnapshot), true);
    canvas.width = 32;
    assert.equal(observeRouteBaselineReady('home', {}, harness.getRuntimeSnapshot), false);
  } finally {
    harness.restore();
  }
});

test('Canvas readiness follows renderer DPR below one and intentional performance caps', () => {
  const canvas = {
    dataset: { renderedDpr: '0.9' },
    width: 576,
    height: 324,
    getBoundingClientRect: () => ({ width: 640, height: 360 }),
  };
  assert.equal(resolveCanvasBackingStoreReadinessScale(canvas, { devicePixelRatio: 0.9 }), 0.9);
  assert.equal(isCanvasBackingStoreUsable(canvas, { devicePixelRatio: 0.9 }), true);
  assert.equal(
    isCanvasBackingStoreUsable({ ...canvas, width: 573 }, { devicePixelRatio: 0.9 }),
    false,
  );

  const cappedCanvas = {
    ...canvas,
    dataset: { renderedDpr: '1.25' },
    width: 800,
    height: 450,
  };
  assert.equal(resolveCanvasBackingStoreReadinessScale(cappedCanvas, { devicePixelRatio: 3 }), 1.25);
  assert.equal(isCanvasBackingStoreUsable(cappedCanvas, { devicePixelRatio: 3 }), true);
});

test('superseded Canvas material transitions settle without waiting for a timeout', async () => {
  const previousWindow = globalThis.window;
  let nextFrameId = 1;
  const frames = new Map();
  globalThis.window = {
    requestAnimationFrame(callback) {
      const id = nextFrameId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    matchMedia: () => ({ matches: false }),
  };

  try {
    const controller = createIndexedSimulationVisualTransition({
      sourceId: 'test-material',
      getCount: () => 3,
      setScaleAt: () => {},
      requestRender: () => {},
      getSeed: () => 1,
    });
    const first = controller.transitionOut({ durationMs: 210, localDurationMs: 140 });
    const second = controller.transitionOut({ durationMs: 210, localDurationMs: 140 });
    assert.equal(await Promise.race([
      first.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 25)),
    ]), true);

    controller.destroy();
    assert.equal(await Promise.race([
      second.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 25)),
    ]), true);
    assert.equal(frames.size, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('Portfolio readiness supports gate, prepared deck, and visible geometry contracts', () => {
  const harness = createReadinessHarness();
  try {
    harness.body.classList.add('portfolio-page');
    const gate = createFakeElement();
    harness.selectors.set('[data-route-content="portfolio-gate"]', gate);
    assert.equal(observeRouteBaselineReady(
      'portfolio',
      { lockedGateId: 'portfolio' },
      harness.getRuntimeSnapshot,
    ), true);

    harness.selectors.delete('[data-route-content="portfolio-gate"]');
    const mount = createFakeElement({ classes: ['is-portfolio-boot-preparing'] });
    harness.elementsById.set('portfolioProjectMount', mount);
    harness.setRuntimeSnapshot({ generation: 8, routeId: 'portfolio', status: 'ready' });
    assert.equal(observeRouteBaselineReady(
      'portfolio',
      { lockedGateId: null },
      harness.getRuntimeSnapshot,
    ), true);

    mount.classList.remove('is-portfolio-boot-preparing');
    const wall = createFakeElement({
      rect: { top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 },
    });
    const card = createFakeElement({
      rect: { top: 100, left: 100, right: 500, bottom: 400, width: 400, height: 300 },
    });
    mount.querySelector = () => card;
    harness.elementsById.set('simulations', wall);
    harness.selectors.set('.portfolio-deck-card.is-active, .portfolio-project-label', card);
    assert.equal(observeRouteBaselineReady(
      'portfolio',
      { lockedGateId: null },
      harness.getRuntimeSnapshot,
    ), true);

    card.styles.opacity = '0';
    assert.equal(observeRouteBaselineReady(
      'portfolio',
      { lockedGateId: null },
      harness.getRuntimeSnapshot,
    ), false);
  } finally {
    harness.restore();
  }
});

test('Daily readiness requires both a prepared Canvas and the matching visual source', () => {
  const harness = createReadinessHarness();
  let unregister = () => {};
  let unregisterOther = () => {};
  try {
    unregister = registerSimulationVisualTransition('repel-room');
    const canvas = createFakeElement({
      rect: { top: 0, left: 0, right: 640, bottom: 360, width: 640, height: 360 },
      width: 640,
      height: 360,
    });
    harness.selectors.set('#repel-room-canvas', canvas);
    assert.equal(observeRouteBaselineReady('repel-room', {}, harness.getRuntimeSnapshot), true);

    unregister();
    unregister = () => {};
    assert.equal(observeRouteBaselineReady('repel-room', {}, harness.getRuntimeSnapshot), false);

    unregisterOther = registerSimulationVisualTransition('flock-of-birds');
    assert.equal(observeRouteBaselineReady('repel-room', {}, harness.getRuntimeSnapshot), false);
  } finally {
    unregister();
    unregisterOther();
    harness.restore();
  }
});
