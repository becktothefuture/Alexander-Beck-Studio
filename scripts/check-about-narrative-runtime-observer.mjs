import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createAboutNarrativeRuntimeDiagnostics } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeDiagnostics.js';
import { createAboutNarrativeRuntimeObserver as createCertificationObserver } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeObserver.certification.js';
import { createAboutNarrativeRuntimeObserver as createProductionObserver } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeObserver.production.js';

function createRenderer(onRender = () => {}) {
  let calls = 0;
  return {
    info: { render: { calls: 0 } },
    render() {
      calls += 1;
      this.info.render.calls = calls;
      onRender();
    },
  };
}

test('production observer renders without exposing certification telemetry', () => {
  const renderer = createRenderer();
  const observer = createProductionObserver({ renderer, scene: {}, camera: {} });
  observer.workerStarted();
  observer.pairInstalled(20);
  observer.render();
  assert.equal(renderer.info.render.calls, 1);
  assert.equal(observer.getLifecycleFields(), observer.getLifecycleFields());
  assert.deepEqual(observer.getLifecycleFields(), {});
  assert.deepEqual(observer.getMetrics(), {});
});

test('certification observer records lifecycle, timing, and resource metrics', () => {
  let uploadSubmissionDurationMs = 0;
  const renderer = createRenderer(() => { uploadSubmissionDurationMs += 0.75; });
  const diagnostics = createAboutNarrativeRuntimeDiagnostics();
  const position = { array: new Float32Array(6) };
  const fixedAttributes = { position };
  const geometry = { getAttribute: () => position };
  const ticks = [1, 3];
  const observer = createCertificationObserver({
    root: { dataset: {} },
    diagnostics,
    renderer,
    scene: {},
    camera: {},
    geometry,
    fixedAttributes,
    pointCount: 2,
    shapeCache: { getSnapshot: () => ({ entries: 1, uniqueBytes: 24 }) },
    sequenceCache: { getSnapshot: () => ({ entries: 1, uniqueBytes: 48 }) },
    resourceLedger: { getSnapshot: () => ({ buffers: { uniqueCount: 1, uniqueBytes: 48 }, gpu: { liveCount: 1, liveBytes: 24 }, diagnostics: { count: 0 } }) },
    webglTracker: {
      getSnapshot: () => ({
        liveCount: 1,
        liveBytes: 24,
        uploadSubmissionDurationMs,
        maxUploadSubmissionDurationMs: uploadSubmissionDurationMs,
        diagnostics: [],
      }),
    },
    now: () => ticks.shift(),
  });
  observer.workerStarted();
  observer.workerTerminated();
  observer.workerTimedOut();
  observer.workerMessage({ messageDurationMs: 4 });
  observer.pairInstalled(3);
  observer.render();
  const lifecycle = observer.getLifecycleFields();
  const metrics = observer.getMetrics({ sequenceState: 'ready' });
  assert.deepEqual(lifecycle, { workerStarts: 1, workerTerminations: 1, workerTimeouts: 1 });
  assert.equal(metrics.bufferRebuilds, 1);
  assert.equal(metrics.maxInstallDurationMs, 3);
  assert.equal(metrics.maxWorkerMessageDurationMs, 4);
  assert.equal(metrics.frameTimeMs, 2);
  assert.equal(metrics.maxFirstUploadDurationMs, 0.75);
  assert.equal(metrics.fixedAttributeIdentityStable, true);
  assert.equal(metrics.resourceDiagnosticCount, 0);
  observer.reset();
  assert.equal(observer.getMetrics().maxInstallDurationMs, 0);
});

test('production observer source contains no forbidden verbose counter names', async () => {
  const source = await readFile(
    new URL('../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeObserver.production.js', import.meta.url),
    'utf8',
  );
  ['maxInstallDurationMs', 'workerStarts', 'resourceDiagnosticCount'].forEach((needle) => {
    assert.equal(source.includes(needle), false, `Production observer contains ${needle}.`);
  });
});
