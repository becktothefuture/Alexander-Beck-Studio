import assert from 'node:assert/strict';
import test from 'node:test';
import {
  collectAboutNarrativeArrayBuffers,
  createAboutNarrativeResourceLedger,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeResourceLedger.js';

test('buffer collection is cycle-safe and deduplicates shared ArrayBuffers', () => {
  const shared = new ArrayBuffer(64);
  const root = {
    direct: shared,
    view: new Float32Array(shared),
    nested: new Map(),
  };
  root.self = root;
  root.nested.set('shared', new Uint8Array(shared));
  root.nested.set('set', new Set([shared]));
  assert.deepEqual([...collectAboutNarrativeArrayBuffers(root)], [shared]);
});

test('ledger counts shared buffers once globally and attributes them to every explicit owner', () => {
  const ledger = createAboutNarrativeResourceLedger({
    owners: [
      { id: 'shape-cache', kind: 'cache' },
      { id: 'sequence-cache', kind: 'cache' },
    ],
  });
  const shared = new ArrayBuffer(64);
  const unique = new ArrayBuffer(128);
  ledger.retain('shape-cache', { shared, unique });
  ledger.retain('sequence-cache', new Float32Array(shared));
  let snapshot = ledger.getSnapshot('shared');
  assert.equal(snapshot.buffers.uniqueCount, 2);
  assert.equal(snapshot.buffers.uniqueBytes, 192);
  assert.deepEqual(
    snapshot.owners.map(({ id, bufferCount, attributedBytes }) => ({ id, bufferCount, attributedBytes })),
    [
      { id: 'sequence-cache', bufferCount: 1, attributedBytes: 64 },
      { id: 'shape-cache', bufferCount: 2, attributedBytes: 192 },
    ],
  );
  ledger.release('shape-cache', shared);
  snapshot = ledger.getSnapshot('one-owner-remains');
  assert.equal(snapshot.buffers.uniqueCount, 2);
  assert.equal(snapshot.buffers.uniqueBytes, 192);
  ledger.releaseOwner('sequence-cache');
  snapshot = ledger.getSnapshot('shared-released');
  assert.equal(snapshot.buffers.uniqueCount, 1);
  assert.equal(snapshot.buffers.uniqueBytes, 128);
  ledger.releaseOwner('shape-cache');
  assert.equal(ledger.getSnapshot().buffers.uniqueCount, 0);
  assert.equal(ledger.dispose().gpu.liveCount, 0);
});

test('unknown and untracked retainers produce actionable diagnostics', () => {
  const ledger = createAboutNarrativeResourceLedger({
    strict: false,
    owners: ['known-cache'],
  });
  const tracked = new ArrayBuffer(32);
  const untracked = new ArrayBuffer(48);
  assert.equal(ledger.retain('unknown-cache', tracked), 0);
  ledger.retain('known-cache', tracked);
  assert.equal(ledger.auditRetainers([
    { ownerId: 'known-cache', value: { tracked, untracked } },
    { ownerId: 'other-cache', value: tracked },
  ]), false);
  assert.deepEqual(
    ledger.getSnapshot().diagnostics.items.map((item) => item.code),
    ['unknown-owner', 'untracked-retainer', 'unknown-retainer'],
  );
  ledger.releaseOwner('known-cache');
  ledger.dispose();
});

test('explicit GPU hooks count creates, deletes, bytes, peaks, and imbalance', () => {
  const ledger = createAboutNarrativeResourceLedger({
    strict: false,
    owners: [{ id: 'point-geometry', kind: 'gpu' }],
  });
  const zero = ledger.getSnapshot('zero');
  ledger.recordGpuBufferCreate({ id: 'position', byteLength: 1200, ownerId: 'point-geometry' });
  ledger.recordGpuBufferCreate({ id: 'presence', byteLength: 400, ownerId: 'point-geometry' });
  const active = ledger.getSnapshot('active');
  assert.deepEqual(
    {
      created: active.gpu.created,
      liveCount: active.gpu.liveCount,
      liveBytes: active.gpu.liveBytes,
      peakLiveCount: active.gpu.peakLiveCount,
    },
    { created: 2, liveCount: 2, liveBytes: 1600, peakLiveCount: 2 },
  );
  assert.equal(ledger.assertNoGrowth(zero), false);
  ledger.recordGpuBufferDelete('position');
  ledger.recordGpuBufferDelete('presence');
  assert.equal(ledger.assertMatches(zero), true);
  const final = ledger.getSnapshot('final');
  assert.equal(final.gpu.created, 2);
  assert.equal(final.gpu.deleted, 2);
  assert.equal(final.gpu.createdBytes, final.gpu.deletedBytes);
  ledger.dispose();
});

test('1,000 fixed-attribute install cycles retain zero CPU or GPU growth', () => {
  const pointCount = 256;
  const fixed = {
    position: new Float32Array(pointCount * 3),
    targetPosition: new Float32Array(pointCount * 3),
    pointSeed: new Float32Array(pointCount),
    fromPresence: new Float32Array(pointCount),
    toPresence: new Float32Array(pointCount),
    fromPointSize: new Float32Array(pointCount),
    toPointSize: new Float32Array(pointCount),
    fromGroup: new Float32Array(pointCount),
    toGroup: new Float32Array(pointCount),
  };
  const attributeIdentity = Object.fromEntries(Object.entries(fixed));
  const ledger = createAboutNarrativeResourceLedger({
    owners: [
      { id: 'fixed-gpu-arrays', kind: 'installed' },
      { id: 'pending-sequence', kind: 'pending' },
      { id: 'point-geometry', kind: 'gpu' },
    ],
  });
  const zero = ledger.getSnapshot('pre-mount');
  ledger.retain('fixed-gpu-arrays', fixed);
  Object.entries(fixed).forEach(([id, array]) => {
    ledger.recordGpuBufferCreate({ id, byteLength: array.byteLength, ownerId: 'point-geometry' });
  });
  const warmed = ledger.getSnapshot('warmed');

  for (let cycle = 0; cycle < 1000; cycle += 1) {
    const from = {
      positions: new Float32Array(pointCount * 3).fill(cycle % 7),
      presence: new Float32Array(pointCount).fill(1),
      size: new Float32Array(pointCount).fill(1),
      attributes: { disciplineGroup: new Float32Array(pointCount) },
    };
    const to = {
      positions: new Float32Array(pointCount * 3).fill((cycle + 1) % 7),
      presence: new Float32Array(pointCount).fill(cycle % 2),
      size: new Float32Array(pointCount).fill(1),
      attributes: { disciplineGroup: new Float32Array(pointCount) },
    };
    const pair = { from, to };
    ledger.retain('pending-sequence', pair);
    fixed.position.set(from.positions);
    fixed.targetPosition.set(to.positions);
    fixed.fromPresence.set(from.presence);
    fixed.toPresence.set(to.presence);
    fixed.fromPointSize.set(from.size);
    fixed.toPointSize.set(to.size);
    fixed.fromGroup.set(from.attributes.disciplineGroup);
    fixed.toGroup.set(to.attributes.disciplineGroup);
    ledger.release('pending-sequence', pair);
  }

  assert.equal(ledger.assertNoGrowth(warmed), true);
  const soaked = ledger.getSnapshot('soaked');
  assert.equal(soaked.gpu.liveCount, 9);
  assert.equal(soaked.gpu.created, 9);
  assert.equal(soaked.gpu.deleted, 0);
  assert.equal(soaked.buffers.uniqueCount, warmed.buffers.uniqueCount);
  assert.equal(soaked.buffers.uniqueBytes, warmed.buffers.uniqueBytes);
  assert.ok(soaked.buffers.peakUniqueCount <= warmed.buffers.uniqueCount + 8);
  assert.ok(soaked.owners.find((owner) => owner.id === 'pending-sequence').bufferCount === 0);
  Object.entries(fixed).forEach(([id, array]) => {
    assert.equal(fixed[id], attributeIdentity[id]);
    assert.equal(array.buffer.byteLength, attributeIdentity[id].buffer.byteLength);
    ledger.recordGpuBufferDelete(id);
  });
  ledger.releaseOwner('fixed-gpu-arrays');
  assert.equal(ledger.assertMatches(zero), true);
  const disposed = ledger.dispose();
  assert.equal(disposed.buffers.uniqueCount, 0);
  assert.equal(disposed.gpu.liveCount, 0);
  assert.equal(disposed.diagnostics.count, 0);
});
