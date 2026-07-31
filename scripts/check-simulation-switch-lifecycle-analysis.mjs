import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateGeometrySamples,
  analyzeFaultEvidence,
} from './simulation-switch-lifecycle-analysis.mjs';

function geometrySample(centerX, centerY, dpr = 2, transform = 'none') {
  return { devicePixelRatio: dpr, transform, rect: { centerX, centerY } };
}

test('geometry aggregation uses repeated baselines and device-pixel snapped drift', () => {
  const baseline = [
    geometrySample(100.24, 200.24),
    geometrySample(100.25, 200.25),
    geometrySample(100.26, 200.26),
  ];
  const result = aggregateGeometrySamples([
    geometrySample(100.74, 200.24),
    geometrySample(100.75, 200.25),
    geometrySample(100.76, 200.26),
  ], baseline);
  assert.equal(result.valid, true);
  assert.equal(result.pass, true);
  assert.equal(result.maxSnappedDeviceDelta, 1);
  assert.ok(result.maxRawCssDelta > 0.49);
});

test('geometry aggregation rejects drift beyond one rendered device pixel', () => {
  const baseline = Array.from({ length: 3 }, () => geometrySample(100, 200, 2));
  const result = aggregateGeometrySamples(Array.from({ length: 3 }, () => geometrySample(101.1, 200, 2)), baseline);
  assert.equal(result.pass, false);
  assert.equal(result.maxSnappedDeviceDelta, 2);
});

test('geometry aggregation rejects an incomplete or mixed-DPR sample set', () => {
  const result = aggregateGeometrySamples(
    [geometrySample(100, 200, 1), geometrySample(100, 200, 2)],
    [geometrySample(100, 200, 1)],
  );
  assert.equal(result.valid, false);
  assert.equal(result.pass, false);
});

test('preload fault is invalid when interception and failed runtime state are absent', () => {
  const result = analyzeFaultEvidence({
    fault: 'preload',
    injection: { interceptionCount: 0 },
    trace: { runtimeEvents: [], switchEvents: [] },
    finalRuntimeId: 'repel-room',
    finalTransaction: { phase: 'idle', busy: false, commitCount: 1, publicationCount: 1 },
  });
  assert.equal(result.classification, 'invalid-test');
  assert.ok(result.issues.includes('invalid-test:fault-not-injected:preload'));
  assert.ok(result.issues.some((issue) => issue.startsWith('product-failure:')));
});

test('preload fault proves failed load, outgoing restoration, and zero publication', () => {
  const finalTransaction = { phase: 'idle', busy: false, commitCount: 0, publicationCount: 0, status: 'failed' };
  const result = analyzeFaultEvidence({
    fault: 'preload',
    injection: { interceptionCount: 2 },
    trace: {
      runtimeEvents: ['loading', 'retrying', 'failed'].map((status) => ({ detail: { status } })),
      switchEvents: [{ at: 1, detail: finalTransaction }],
    },
    finalRuntimeId: 'pit',
    finalTransaction,
  });
  assert.equal(result.classification, 'pass');
  assert.equal(result.expectedEndpoint, 'restore-outgoing');
  assert.equal(result.transactionTimeline.length, 1);
});

test('post-commit recovery requires the previous runtime and zero publication', () => {
  const result = analyzeFaultEvidence({
    fault: 'runtime-readiness',
    injection: { activationCount: 1 },
    trace: { runtimeEvents: [], switchEvents: [] },
    finalRuntimeId: 'repel-room',
    finalTransaction: { phase: 'idle', busy: false, commitCount: 1, publicationCount: 1 },
  });
  assert.equal(result.classification, 'product-failure');
  assert.equal(result.expectedEndpoint, 'restore-previous');
});
