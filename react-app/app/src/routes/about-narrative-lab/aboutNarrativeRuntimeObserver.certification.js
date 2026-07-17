import { projectAboutNarrativeRuntimeMetrics } from './aboutNarrativeRuntimeDiagnostics.js';

function readSnapshot(source, label) {
  return source?.getSnapshot?.(label) || null;
}

/**
 * Development/certification-only runtime observer. All detailed counters live
 * in this mode-specific module so the production alias can omit them entirely.
 */
export function createAboutNarrativeRuntimeObserver({
  root,
  diagnostics,
  renderer,
  scene,
  camera,
  geometry,
  fixedAttributes,
  pointCount,
  shapeCache,
  sequenceCache,
  resourceLedger = null,
  webglTracker = null,
  now = () => performance.now(),
} = {}) {
  if (!renderer || typeof renderer.render !== 'function') {
    throw new TypeError('Runtime observers need a renderer.');
  }
  if (!diagnostics || typeof diagnostics.recordMetrics !== 'function') {
    throw new TypeError('Runtime observers need a diagnostics store.');
  }

  let bufferRebuilds = 0;
  let maxInstallDurationMs = 0;
  let maxWorkerMessageDurationMs = 0;
  let maxFirstUploadDurationMs = 0;
  let pendingFirstUpload = false;
  let workerStarts = 0;
  let workerTerminations = 0;
  let workerTimeouts = 0;
  let lastFrameTime = 0;

  const pairInstalled = (durationMs) => {
    const installDurationMs = Math.max(0, Number(durationMs) || 0);
    bufferRebuilds += 1;
    maxInstallDurationMs = Math.max(maxInstallDurationMs, installDurationMs);
    pendingFirstUpload = true;
    if (root?.dataset) root.dataset.worldBufferRebuilds = String(bufferRebuilds);
    diagnostics.recordMetrics({ installDurationMs, maxInstallDurationMs });
  };

  const workerStarted = () => { workerStarts += 1; };
  const workerTerminated = () => { workerTerminations += 1; };
  const workerTimedOut = () => { workerTimeouts += 1; };

  const workerMessage = (patch = {}) => {
    const messageDurationMs = Math.max(0, Number(patch.messageDurationMs) || 0);
    maxWorkerMessageDurationMs = Math.max(maxWorkerMessageDurationMs, messageDurationMs);
    diagnostics.recordMetrics({ ...patch, messageDurationMs, maxWorkerMessageDurationMs });
  };

  const render = () => {
    const uploadDurationBefore = Number(
      webglTracker?.getSnapshot?.().uploadSubmissionDurationMs || 0,
    );
    const startedAt = now();
    renderer.render(scene, camera);
    lastFrameTime = Math.max(0, now() - startedAt);
    if (!pendingFirstUpload) return;
    pendingFirstUpload = false;
    const uploadDurationAfter = Number(
      webglTracker?.getSnapshot?.().uploadSubmissionDurationMs || 0,
    );
    const firstUploadDurationMs = Math.max(0, uploadDurationAfter - uploadDurationBefore);
    maxFirstUploadDurationMs = Math.max(maxFirstUploadDurationMs, firstUploadDurationMs);
    diagnostics.recordMetrics({
      firstUploadDurationMs,
      maxFirstUploadDurationMs,
    });
  };

  const reset = () => {
    maxInstallDurationMs = 0;
    maxWorkerMessageDurationMs = 0;
    maxFirstUploadDurationMs = 0;
  };

  const getLifecycleFields = () => Object.freeze({
    workerStarts,
    workerTerminations,
    workerTimeouts,
  });

  const getMetrics = ({
    sequenceState = 'idle',
    installedPair = null,
    readySequence = null,
    latestFrame = null,
  } = {}) => {
    const shapeCacheSnapshot = readSnapshot(shapeCache);
    const sequenceCacheSnapshot = readSnapshot(sequenceCache);
    const resourceSnapshot = readSnapshot(resourceLedger, 'metrics');
    const webglSnapshot = readSnapshot(webglTracker);
    return Object.freeze({
      ...projectAboutNarrativeRuntimeMetrics(
        diagnostics.getSnapshot(),
        diagnostics.getMetricsSnapshot(),
      ),
      adapterId: 'point-field-v1',
      pointCount,
      drawCalls: renderer.info?.render?.calls || 0,
      frameTimeMs: lastFrameTime,
      bufferRebuilds,
      fixedAttributeCount: Object.keys(fixedAttributes).length,
      fixedAttributeIdentityStable: Object.entries(fixedAttributes)
        .every(([name, attribute]) => geometry.getAttribute(name) === attribute),
      maxInstallDurationMs,
      maxWorkerMessageDurationMs,
      maxFirstUploadDurationMs,
      workerStarts,
      workerTerminations,
      workerTimeouts,
      cacheEntries: shapeCacheSnapshot?.entries || 0,
      cacheBytes: shapeCacheSnapshot?.uniqueBytes || 0,
      sequenceCacheEntries: sequenceCacheSnapshot?.entries || 0,
      sequenceCacheBytes: sequenceCacheSnapshot?.uniqueBytes || 0,
      gpuBufferCount: webglSnapshot?.liveCount ?? resourceSnapshot?.gpu.liveCount ?? 9,
      gpuBufferBytes: webglSnapshot?.liveBytes ?? resourceSnapshot?.gpu.liveBytes
        ?? Object.values(fixedAttributes)
          .reduce((sum, attribute) => sum + attribute.array.byteLength, 0),
      gpuBufferCreates: webglSnapshot?.created || 0,
      gpuBufferDeletes: webglSnapshot?.deleted || 0,
      gpuBufferAllocations: webglSnapshot?.allocations || 0,
      gpuBufferReallocations: webglSnapshot?.reallocations || 0,
      gpuBufferUploads: webglSnapshot?.uploads || 0,
      webglUnobservedDeletes: webglSnapshot?.unobservedDeletes || 0,
      webglUnboundMutations: webglSnapshot?.unboundMutations || 0,
      generatedBufferCount: resourceSnapshot?.buffers.uniqueCount || 0,
      generatedBufferBytes: resourceSnapshot?.buffers.uniqueBytes || 0,
      resourceDiagnosticCount: (resourceSnapshot?.diagnostics.count || 0)
        + (webglSnapshot?.diagnostics.length || 0),
      correspondenceSequenceState: sequenceState,
      correspondencePairId: installedPair?.key || '',
      correspondenceToWorldId: installedPair?.toWorld?.sectionId || '',
      correspondenceRequestedStrategy: installedPair?.requestedStrategy || '',
      correspondenceInstalledStrategy: installedPair?.installedStrategy || '',
      correspondenceFallback: installedPair?.fallbackReason || '',
      correspondenceImprovement: Number(installedPair?.metrics?.improvement || 0),
      correspondenceWeightedRms: Number(installedPair?.metrics?.weightedRmsDistance || 0),
      correspondenceP95: Number(installedPair?.metrics?.p95Distance || 0),
      correspondenceMax: Number(installedPair?.metrics?.maxDistance || 0),
      correspondenceLongPathRatio25: Number(installedPair?.metrics?.longPathRatio25 || 0),
      correspondenceLongPathRatio50: Number(installedPair?.metrics?.longPathRatio50 || 0),
      correspondencePreparationDurationMs: Number(readySequence?.preparationDurationMs || 0),
      shapeGenerationDurationMs: Number(readySequence?.generationDurationMs || 0),
      correspondenceWorkerDurationMs: Number(readySequence?.correspondenceDurationMs || 0),
      preparedWorldIds: readySequence?.worldIds || [],
      activeModifiers: latestFrame?.world?.to?.modifiers?.filter((item) => item.enabled).length || 0,
    });
  };

  return Object.freeze({
    getLifecycleFields,
    getMetrics,
    pairInstalled,
    render,
    reset,
    workerMessage,
    workerStarted,
    workerTerminated,
    workerTimedOut,
  });
}
