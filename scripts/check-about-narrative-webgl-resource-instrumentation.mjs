import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createAboutNarrativeResourceLedger,
  instrumentAboutNarrativeWebGLContext,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeResourceLedger.js';

class FakeWebGLContext {
  constructor() {
    this.ARRAY_BUFFER = 0x8892;
    this.STATIC_DRAW = 0x88e4;
    this.canvas = new EventTarget();
    this.calls = [];
    this.nextBufferId = 0;
  }

  createBuffer() {
    const buffer = { fakeBufferId: this.nextBufferId += 1 };
    this.calls.push(['createBuffer', buffer]);
    return buffer;
  }

  deleteBuffer(buffer) {
    this.calls.push(['deleteBuffer', buffer]);
  }

  bindBuffer(target, buffer) {
    this.calls.push(['bindBuffer', target, buffer]);
  }

  bufferData(...args) {
    this.calls.push(['bufferData', ...args]);
  }

  bufferSubData(...args) {
    this.calls.push(['bufferSubData', ...args]);
  }
}

function createLedger() {
  return createAboutNarrativeResourceLedger({
    owners: [{ id: 'webgl-context', kind: 'gpu' }],
  });
}

test('actual WebGL calls report creates, allocations, uploads, reallocations, and deletes', () => {
  const context = new FakeWebGLContext();
  const ledger = createLedger();
  const originalCreateBuffer = context.createBuffer;
  const originalDeleteBuffer = context.deleteBuffer;
  const tracker = instrumentAboutNarrativeWebGLContext({
    context,
    ledger,
    ownerId: 'webgl-context',
    idPrefix: 'test-world',
  });

  assert.strictEqual(tracker.getSnapshot(), tracker.getSnapshot());
  assert.strictEqual(ledger.getSnapshot(), ledger.getSnapshot());

  const first = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, first);
  context.bufferData(context.ARRAY_BUFFER, 64, context.STATIC_DRAW);
  context.bufferSubData(context.ARRAY_BUFFER, 8, new Uint8Array(16));
  context.bufferData(
    context.ARRAY_BUFFER,
    new Float32Array([1, 2, 3, 4]),
    context.STATIC_DRAW,
    1,
    2,
  );

  const active = tracker.getSnapshot();
  assert.deepEqual({
    created: active.created,
    allocations: active.allocations,
    reallocations: active.reallocations,
    uploads: active.uploads,
    uploadedBytes: active.uploadedBytes,
    liveCount: active.liveCount,
    liveBytes: active.liveBytes,
  }, {
    created: 1,
    allocations: 2,
    reallocations: 1,
    uploads: 1,
    uploadedBytes: 16,
    liveCount: 1,
    liveBytes: 8,
  });
  assert.ok(active.uploadSubmissionDurationMs >= 0);
  assert.ok(active.maxUploadSubmissionDurationMs >= 0);
  const ledgerActive = ledger.getSnapshot();
  assert.equal(ledgerActive.gpu.liveCount, 1);
  assert.equal(ledgerActive.gpu.liveBytes, 8);
  assert.equal(ledgerActive.gpu.allocations, 2);
  assert.equal(ledgerActive.gpu.reallocations, 1);
  assert.equal(ledgerActive.gpu.uploads, 1);
  assert.equal(ledgerActive.gpu.uploadedBytes, 16);

  context.deleteBuffer(first);
  assert.equal(tracker.getSnapshot().liveCount, 0);
  assert.equal(ledger.getSnapshot().gpu.liveCount, 0);
  assert.equal(context.calls.filter(([name]) => name === 'deleteBuffer').length, 1);

  tracker.dispose();
  assert.strictEqual(context.createBuffer, originalCreateBuffer);
  assert.strictEqual(context.deleteBuffer, originalDeleteBuffer);
  assert.strictEqual(tracker.getSnapshot(), tracker.getSnapshot());
  assert.equal(ledger.dispose().gpu.liveCount, 0);
});

test('context loss closes one epoch and restored resources receive fresh identities', () => {
  const context = new FakeWebGLContext();
  const ledger = createLedger();
  const tracker = instrumentAboutNarrativeWebGLContext({
    context,
    ledger,
    ownerId: 'webgl-context',
  });

  const first = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, first);
  context.bufferData(context.ARRAY_BUFFER, new ArrayBuffer(48), context.STATIC_DRAW);
  const second = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, second);
  context.bufferData(context.ARRAY_BUFFER, new Uint16Array(10), context.STATIC_DRAW);
  const beforeLoss = tracker.getSnapshot();
  assert.equal(beforeLoss.epoch, 1);
  assert.equal(beforeLoss.liveCount, 2);
  assert.equal(beforeLoss.liveBytes, 68);

  context.canvas.dispatchEvent(new Event('webglcontextlost'));
  const lost = tracker.getSnapshot();
  assert.equal(lost.epoch, 2);
  assert.equal(lost.contextLosses, 1);
  assert.equal(lost.implicitDeletes, 2);
  assert.equal(lost.liveCount, 0);
  assert.equal(ledger.getSnapshot().gpu.liveCount, 0);
  context.deleteBuffer(first);
  assert.equal(tracker.getSnapshot().unobservedDeletes, 0);

  context.canvas.dispatchEvent(new Event('webglcontextrestored'));
  const restored = tracker.getSnapshot();
  assert.equal(restored.epoch, 2);
  assert.equal(restored.contextRestores, 1);

  const replacement = context.createBuffer();
  context.bindBuffer(context.ARRAY_BUFFER, replacement);
  context.bufferData(context.ARRAY_BUFFER, 32, context.STATIC_DRAW);
  assert.equal(tracker.getSnapshot().liveBytes, 32);
  context.deleteBuffer(replacement);
  assert.equal(ledger.getSnapshot().gpu.liveCount, 0);

  tracker.dispose();
  ledger.dispose();
});

test('late installation is observable and duplicate wrapping is rejected', () => {
  const context = new FakeWebGLContext();
  const preExisting = context.createBuffer();
  const ledger = createLedger();
  const tracker = instrumentAboutNarrativeWebGLContext({
    context,
    ledger,
    ownerId: 'webgl-context',
  });
  assert.throws(
    () => instrumentAboutNarrativeWebGLContext({ context, ledger, ownerId: 'webgl-context' }),
    /already instrumented/,
  );

  context.bindBuffer(context.ARRAY_BUFFER, preExisting);
  context.bufferData(context.ARRAY_BUFFER, 16, context.STATIC_DRAW);
  context.deleteBuffer(preExisting);
  const snapshot = tracker.getSnapshot();
  assert.equal(snapshot.unboundMutations, 1);
  assert.equal(snapshot.unobservedDeletes, 1);
  assert.deepEqual(
    snapshot.diagnostics.map(({ code }) => code),
    ['unobserved-buffer-mutation', 'unobserved-buffer-delete'],
  );

  tracker.dispose();
  ledger.dispose();
});

test('partial installation failure restores every method already wrapped', () => {
  const context = new FakeWebGLContext();
  context.bufferSubData = null;
  const ledger = createLedger();
  const originalCreateBuffer = context.createBuffer;
  const originalDeleteBuffer = context.deleteBuffer;

  assert.throws(
    () => instrumentAboutNarrativeWebGLContext({ context, ledger, ownerId: 'webgl-context' }),
    /requires context\.bufferSubData/,
  );
  assert.strictEqual(context.createBuffer, originalCreateBuffer);
  assert.strictEqual(context.deleteBuffer, originalDeleteBuffer);
  ledger.dispose();
});
