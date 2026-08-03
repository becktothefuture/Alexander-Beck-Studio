import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectAboutNarrativeArrayBuffers,
  createAboutNarrativeBufferLru,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeBufferLru.js';
import {
  createAboutNarrativePersistentCacheStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePersistentCaches.js';
import { createAboutNarrativePreparationController } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePreparationController.js';
import {
  createAboutNarrativeRuntimeDiagnostics,
  projectAboutNarrativeRuntimeMetrics,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeDiagnostics.js';
import {
  ABOUT_NARRATIVE_CACHE_LIMITS,
  ABOUT_NARRATIVE_FIXED_ATTRIBUTE_SPECS,
  ABOUT_NARRATIVE_POINT_PROFILES,
  ABOUT_NARRATIVE_RETRY_POLICY,
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeConstants.js';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function createFakeTimers() {
  let nextId = 0;
  const tasks = new Map();
  return {
    setTimeout(callback, delay) {
      const id = ++nextId;
      tasks.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      tasks.delete(id);
    },
    count() {
      return tasks.size;
    },
    delays() {
      return [...tasks.values()].map((task) => task.delay);
    },
    runAll() {
      const pending = [...tasks.entries()];
      tasks.clear();
      pending.forEach(([, task]) => task.callback());
    },
  };
}

function intent(sequenceKey, pairId = 'pair-a', inputFingerprint = `${sequenceKey}:fingerprint`) {
  return { sequenceKey, pairId, inputFingerprint, input: { sequenceKey } };
}

function failure(category, message = category) {
  return Object.assign(new Error(message), { category });
}

test('runtime constants protect point profiles, caches, retry policy, and nine fixed attributes', () => {
  assert.equal(ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION, 2);
  assert.equal(ABOUT_NARRATIVE_POINT_PROFILES.desktop.pointCount, 12000);
  assert.equal(ABOUT_NARRATIVE_POINT_PROFILES.mobile.pointCount, 5000);
  assert.deepEqual(ABOUT_NARRATIVE_CACHE_LIMITS.shape, { maxEntries: 8, maxBytes: 4 * 1024 * 1024 });
  assert.deepEqual(ABOUT_NARRATIVE_CACHE_LIMITS.sequence, { maxEntries: 3, maxBytes: 16 * 1024 * 1024 });
  assert.deepEqual(ABOUT_NARRATIVE_RETRY_POLICY, { delayMs: 1000, maximumAutomaticRetries: 1 });
  assert.deepEqual(ABOUT_NARRATIVE_FIXED_ATTRIBUTE_SPECS.map((attribute) => attribute.id), [
    'position', 'targetPosition', 'pointSeed', 'fromPresence', 'toPresence',
    'fromPointSize', 'toPointSize', 'fromGroup', 'toGroup',
  ]);
  assert.equal(ABOUT_NARRATIVE_FIXED_ATTRIBUTE_SPECS.filter((attribute) => !attribute.mutable).length, 1);
});

test('buffer collector counts shared underlying ArrayBuffers once and handles cycles', () => {
  const buffer = new ArrayBuffer(64);
  const fixture = { first: new Float32Array(buffer, 0, 4), second: new Uint8Array(buffer, 16, 4) };
  fixture.self = fixture;
  fixture.map = new Map([['shared', fixture.first]]);
  fixture.set = new Set([fixture.second]);
  const buffers = collectAboutNarrativeArrayBuffers(fixture);
  assert.equal(buffers.size, 1);
  assert.equal([...buffers][0], buffer);
});

test('buffer LRU combines entry limits, LRU touch order, and unique shared-buffer bytes', () => {
  const cache = createAboutNarrativeBufferLru({ name: 'shape', maxEntries: 2, maxBytes: 96 });
  const shared = new ArrayBuffer(32);
  const second = new ArrayBuffer(32);
  const third = new ArrayBuffer(32);
  cache.set('a', { shared }, { owner: 'shape-cache', buffers: [shared] });
  cache.set('b', { shared, second }, { owner: 'shape-cache', buffers: [shared, second] });
  assert.equal(cache.getSnapshot().uniqueBytes, 64);
  assert.equal(cache.get('a').shared, shared);
  cache.set('c', { third }, { owner: 'shape-cache', buffers: [third] });
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.has('c'), true);
  assert.equal(cache.getSnapshot().uniqueBytes, 64);
  assert.equal(cache.getSnapshot().evictions, 1);
});

test('buffer LRU snapshots remain referentially stable between mutations', () => {
  const cache = createAboutNarrativeBufferLru({ name: 'shape', maxEntries: 2, maxBytes: 96 });
  const initial = cache.getSnapshot();
  assert.equal(initial, cache.getSnapshot());
  cache.set('a', 1, { owner: 'shape-cache' });
  const populated = cache.getSnapshot();
  assert.notEqual(initial, populated);
  assert.equal(populated, cache.getSnapshot());
  cache.get('a');
  const touched = cache.getSnapshot();
  assert.notEqual(populated, touched);
  assert.equal(touched, cache.getSnapshot());
});

test('buffer LRU pins and in-flight entries while evicting only safe candidates', () => {
  const cache = createAboutNarrativeBufferLru({ name: 'sequence', maxEntries: 1, maxBytes: 64 });
  cache.set('pinned', 1, { owner: 'sequence-cache', pins: ['installed'] });
  cache.set('candidate', 2, { owner: 'sequence-cache' });
  assert.equal(cache.has('pinned'), true);
  assert.equal(cache.has('candidate'), false);
  assert.equal(cache.getSnapshot().pinnedEntries, 1);
  cache.unpin('pinned', 'installed');
  cache.set('pending', 3, { owner: 'sequence-cache', inFlight: true });
  assert.equal(cache.has('pinned'), false);
  assert.equal(cache.has('pending'), true);
  assert.equal(cache.getSnapshot().inFlightEntries, 1);
});

test('buffer LRU retains an oversize active entry alone and reports its owner', () => {
  const cache = createAboutNarrativeBufferLru({ name: 'sequence', maxEntries: 3, maxBytes: 32 });
  cache.set('small', 1, { owner: 'sequence-cache', buffers: [new ArrayBuffer(16)] });
  cache.set('active', 2, {
    owner: 'sequence-cache',
    buffers: [new ArrayBuffer(48)],
    active: true,
  });
  const snapshot = cache.getSnapshot();
  assert.equal(snapshot.entries, 1);
  assert.equal(snapshot.activeKey, 'active');
  assert.equal(snapshot.uniqueBytes, 48);
  assert.equal(snapshot.oversizeActive, true);
  assert.equal(snapshot.budgetBlocked, true);
  assert.deepEqual(snapshot.owners, { 'sequence-cache': { entries: 1, entryBytes: 48 } });
});

test('buffer LRU removes rejected promises immediately and resolves registered buffers atomically', async () => {
  const cache = createAboutNarrativeBufferLru({ name: 'shape', maxEntries: 2, maxBytes: 128 });
  const rejected = deferred();
  const trackedRejection = cache.trackPromise('bad', rejected.promise, { owner: 'shape-cache' });
  assert.equal(cache.getSnapshot().inFlightEntries, 1);
  rejected.reject(new Error('bad shape'));
  await assert.rejects(trackedRejection, /bad shape/);
  assert.equal(cache.has('bad'), false);
  assert.equal(cache.getSnapshot().rejections, 1);

  const resolved = deferred();
  const trackedResolution = cache.trackPromise('good', resolved.promise, { owner: 'shape-cache' });
  const buffer = new ArrayBuffer(80);
  resolved.resolve({ positions: new Float32Array(buffer) });
  await trackedResolution;
  assert.equal(cache.getSnapshot().inFlightEntries, 0);
  assert.equal(cache.getSnapshot().pinnedEntries, 0);
  assert.equal(cache.getSnapshot().uniqueBytes, 80);
});

test('buffer LRU rejects unknown owners and disposes entries deterministically', () => {
  const disposed = [];
  const cache = createAboutNarrativeBufferLru({ name: 'shape', maxEntries: 3, maxBytes: 64 });
  assert.throws(() => cache.set('missing-owner', 1), /registered owner/);
  cache.set('a', 1, { owner: 'shape-cache', dispose: (_, reason) => disposed.push(`a:${reason}`) });
  cache.set('b', 2, { owner: 'shape-cache', dispose: (_, reason) => disposed.push(`b:${reason}`) });
  cache.dispose();
  assert.deepEqual(disposed, ['a:disposed', 'b:disposed']);
  assert.equal(cache.getSnapshot().entries, 0);
  assert.equal(cache.getSnapshot().uniqueBytes, 0);
  assert.throws(() => cache.get('a'), /disposed/);
});

test('document cache reuses resolved shape buffers across adapter leases', () => {
  const store = createAboutNarrativePersistentCacheStore({
    shapeLimits: { maxEntries: 2, maxBytes: 256 },
    sequenceLimits: { maxEntries: 2, maxBytes: 512 },
  });
  const shape = { positions: new Float32Array([1, 2, 3]) };
  const first = store.createLease();
  assert.equal(first.getShape('shape-a'), undefined);
  assert.equal(first.storeShape('shape-a', shape), shape);
  first.release();

  const second = store.createLease();
  assert.equal(second.getShape('shape-a'), shape);
  assert.equal(store.getShapeSnapshot().entries, 1);
  assert.equal(store.getShapeSnapshot().hits, 1);
  second.release();
  store.clear();
});

test('document cache returns mutable sequence wrappers over immutable cached preparation', () => {
  const store = createAboutNarrativePersistentCacheStore({
    shapeLimits: { maxEntries: 2, maxBytes: 256 },
    sequenceLimits: { maxEntries: 2, maxBytes: 2048 },
  });
  const positions = new Float32Array([1, 2, 3]);
  const prepared = {
    key: 'sequence-a',
    pairs: new Map([['world-a', {
      key: 'pair-a',
      fromWorld: { id: 'cached-from' },
      toWorld: { id: 'cached-to' },
      fromOutput: { positions },
      toOutput: { positions },
    }]]),
  };
  const first = store.createLease();
  const firstRuntime = first.storeSequence('sequence-a', prepared);
  firstRuntime.pairs.get('world-a').fromWorld = { id: 'runtime-from' };
  first.release();

  const second = store.createLease();
  const secondRuntime = second.getSequence('sequence-a');
  assert.notEqual(secondRuntime, firstRuntime);
  assert.notEqual(secondRuntime.pairs.get('world-a'), firstRuntime.pairs.get('world-a'));
  assert.equal(secondRuntime.pairs.get('world-a').fromWorld.id, 'cached-from');
  assert.equal(secondRuntime.pairs.get('world-a').fromOutput.positions, positions);
  assert.equal(store.getSequenceSnapshot().entries, 1);
  assert.equal(store.getSequenceSnapshot().pinnedEntries, 1);
  second.release();
  assert.equal(store.getSequenceSnapshot().pinnedEntries, 0);
  store.clear();
});

test('diagnostics snapshots stay stable between lifecycle emissions while metrics remain pull-based', () => {
  let timestamp = 0;
  const diagnostics = createAboutNarrativeRuntimeDiagnostics({ maxRecords: 2, now: () => ++timestamp });
  let emissions = 0;
  const listener = () => { emissions += 1; };
  const unsubscribeA = diagnostics.subscribe(listener);
  const unsubscribeB = diagnostics.subscribe(listener);
  const initial = diagnostics.getSnapshot();
  assert.equal(initial, diagnostics.getSnapshot());
  diagnostics.recordMetrics({ frameTimeMs: 3 });
  assert.equal(emissions, 0);
  assert.equal(initial, diagnostics.getSnapshot());
  assert.equal(diagnostics.getMetricsSnapshot().frameTimeMs, 3);
  diagnostics.recordLifecycle('loading', { state: 'preparing' });
  diagnostics.recordLifecycle('ready', { state: 'ready', installedPairId: 'pair-a' });
  diagnostics.recordLifecycle('again', { state: 'ready' });
  assert.equal(emissions, 3);
  assert.deepEqual(diagnostics.getSnapshot().records.map((record) => record.type), ['ready', 'again']);
  assert.equal(Object.isFrozen(diagnostics.getSnapshot()), true);
  assert.equal(Object.isFrozen(diagnostics.getSnapshot().records), true);
  assert.equal(projectAboutNarrativeRuntimeMetrics(diagnostics.getSnapshot()).correspondencePairId, 'pair-a');
  unsubscribeA();
  unsubscribeB();
  diagnostics.recordLifecycle('after-unsubscribe');
  assert.equal(emissions, 3);
});

test('preparation controller follows idle, preparing, ready, and disposed states atomically', async () => {
  const task = deferred();
  const published = [];
  let signal;
  const controller = createAboutNarrativePreparationController({
    startPreparation: (context) => {
      signal = context.signal;
      return task.promise;
    },
    validateCandidate: (candidate) => ({ ...candidate, validated: true }),
    publishReady: (candidate) => { published.push(candidate); },
  });
  assert.equal(controller.getSnapshot().state, 'idle');
  assert.equal(controller.requestPreparation(intent('sequence-a')).accepted, true);
  assert.equal(controller.getSnapshot().state, 'preparing');
  assert.equal(signal.aborted, false);
  task.resolve({ id: 'candidate-a' });
  await flush();
  assert.equal(controller.getSnapshot().state, 'ready');
  assert.deepEqual(published, [{ id: 'candidate-a', validated: true }]);
  assert.deepEqual(controller.getReadyCandidate(), { id: 'candidate-a', validated: true });
  assert.equal(controller.requestPreparation(intent('sequence-a')).reason, 'already-ready');
  controller.dispose();
  assert.equal(controller.getSnapshot().state, 'disposed');
  assert.equal(controller.requestPreparation(intent('sequence-b')).reason, 'disposed');
});

test('deterministic preparation failure latches and repeated frames cannot restart it', async () => {
  const timers = createFakeTimers();
  let starts = 0;
  const controller = createAboutNarrativePreparationController({
    timers,
    startPreparation: async () => {
      starts += 1;
      throw failure('validation');
    },
  });
  const request = intent('sequence-a');
  controller.requestPreparation(request);
  await flush();
  assert.equal(controller.getSnapshot().state, 'failed');
  assert.equal(controller.getSnapshot().lastFailure.code, 'validation');
  for (let frame = 0; frame < 600; frame += 1) controller.requestPreparation(request);
  assert.equal(starts, 1);
  assert.equal(timers.count(), 0);
});

test('transient preparation failure receives exactly one delayed automatic retry', async () => {
  const timers = createFakeTimers();
  let starts = 0;
  const controller = createAboutNarrativePreparationController({
    timers,
    startPreparation: async () => {
      starts += 1;
      throw failure('workerCrash');
    },
  });
  const request = intent('sequence-a');
  controller.requestPreparation(request);
  await flush();
  assert.equal(starts, 1);
  assert.equal(timers.count(), 1);
  assert.deepEqual(timers.delays(), [1000]);
  for (let frame = 0; frame < 600; frame += 1) controller.requestPreparation(request);
  assert.equal(starts, 1);
  timers.runAll();
  await flush();
  assert.equal(starts, 2);
  assert.equal(timers.count(), 0);
  assert.equal(controller.getSnapshot().automaticRetries, 1);
  assert.equal(controller.getSnapshot().state, 'failed');
});

test('manual Retry requires the exact current intent, cancels its timer, and starts one run', async () => {
  const timers = createFakeTimers();
  let starts = 0;
  const controller = createAboutNarrativePreparationController({
    timers,
    startPreparation: async () => {
      starts += 1;
      if (starts === 1) throw failure('workerCrash');
      return { id: 'ready' };
    },
  });
  const request = intent('sequence-a', 'pair-a', 'fingerprint-a');
  controller.requestPreparation(request);
  await flush();
  assert.equal(timers.count(), 1);
  assert.equal(controller.retryPreparation({ ...request, pairId: 'pair-b' }).reason, 'stale-intent');
  const retry = controller.retryPreparation(request);
  assert.equal(retry.accepted, true);
  assert.equal(timers.count(), 0);
  await flush();
  assert.equal(starts, 2);
  assert.equal(controller.getSnapshot().state, 'ready');
});

test('key changes invalidate the old generation and stale success cannot publish', async () => {
  const first = deferred();
  const second = deferred();
  const signals = [];
  const published = [];
  const controller = createAboutNarrativePreparationController({
    startPreparation: ({ sequenceKey, signal }) => {
      signals.push({ sequenceKey, signal });
      return sequenceKey === 'sequence-a' ? first.promise : second.promise;
    },
    publishReady: (candidate) => { published.push(candidate); },
  });
  controller.requestPreparation(intent('sequence-a'));
  controller.requestPreparation(intent('sequence-b'));
  assert.equal(signals[0].signal.aborted, true);
  second.resolve({ id: 'b' });
  await flush();
  first.resolve({ id: 'a' });
  await flush();
  assert.deepEqual(published, [{ id: 'b' }]);
  assert.equal(controller.getSnapshot().sequenceKey, 'sequence-b');
});

test('visibility cancels active work and pending retry without silently resuming', async () => {
  const timers = createFakeTimers();
  const active = deferred();
  let activeSignal;
  const activeController = createAboutNarrativePreparationController({
    timers,
    startPreparation: ({ signal }) => {
      activeSignal = signal;
      return active.promise;
    },
  });
  activeController.requestPreparation(intent('sequence-a'));
  activeController.setVisible(false);
  assert.equal(activeSignal.aborted, true);
  assert.equal(activeController.getSnapshot().state, 'idle');
  activeController.setVisible(true);
  assert.equal(activeController.getSnapshot().state, 'idle');

  const failedController = createAboutNarrativePreparationController({
    timers,
    startPreparation: async () => { throw failure('workerCrash'); },
  });
  const request = intent('sequence-b');
  failedController.requestPreparation(request);
  await flush();
  assert.equal(timers.count(), 1);
  failedController.setVisible(false);
  assert.equal(timers.count(), 0);
  assert.equal(failedController.getSnapshot().state, 'failed');
  failedController.setVisible(true);
  assert.equal(failedController.requestPreparation(request).reason, 'failed-latched');
});

test('validation failure blocks atomic publication and disposal aborts active work', async () => {
  const published = [];
  const controller = createAboutNarrativePreparationController({
    startPreparation: async () => ({ malformed: true }),
    validateCandidate: () => { throw failure('validation', 'malformed candidate'); },
    publishReady: (candidate) => { published.push(candidate); },
  });
  controller.requestPreparation(intent('sequence-a'));
  await flush();
  assert.equal(controller.getSnapshot().state, 'failed');
  assert.deepEqual(published, []);

  const task = deferred();
  let signal;
  const activeController = createAboutNarrativePreparationController({
    startPreparation: (context) => {
      signal = context.signal;
      return task.promise;
    },
  });
  activeController.requestPreparation(intent('sequence-b'));
  activeController.dispose();
  assert.equal(signal.aborted, true);
  assert.equal(activeController.getSnapshot().state, 'disposed');
  task.resolve({ late: true });
  await flush();
  assert.equal(activeController.getReadyCandidate(), null);
});
