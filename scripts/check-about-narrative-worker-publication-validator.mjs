import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
  createAboutNarrativeWorkerFailure,
  validateAboutNarrativeWorkerResponse,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeWorkerProtocol.js';
import {
  AboutNarrativePublicationValidationError,
  validateAboutNarrativeWorkerPublication,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeWorkerPublicationValidator.js';
import {
  fingerprintAboutNarrativeOutput,
  fingerprintAboutNarrativePairInput,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondenceFingerprint.js';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondenceRegistry.js';

const MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function createExpected(pointCount) {
  return {
    generation: 4,
    sequenceKey: 'publication-validation',
    pointCount,
    entries: [{
      id: 'promise',
      mode: 'index-v1',
      matrix: MATRIX,
      shapeId: 'cluster-v1',
      seed: 1,
      parameters: {},
    }],
  };
}

function createOutput(pointCount) {
  return {
    positions: new Float32Array(pointCount * 3),
    presence: new Float32Array(pointCount).fill(1),
    size: new Float32Array(pointCount).fill(1),
    attributes: {
      disciplineGroup: new Float32Array(pointCount),
    },
    bounds: { min: [0, 0, 0], max: [1, 1, 1] },
  };
}

function createMetrics(pointCount) {
  return {
    totalDistance: 0,
    totalSquaredDistance: 0,
    rmsDistance: 0,
    weightedRmsDistance: 0,
    meanDistance: 0,
    p50Distance: 0,
    p90Distance: 0,
    p95Distance: 0,
    p99Distance: 0,
    maxDistance: 0,
    visibleOnlyTotalDistance: 0,
    visibleOnlyMeanDistance: 0,
    longPathRatio25: 0,
    longPathRatio50: 0,
    visiblePointCount: pointCount,
    sharedBoundsDiagonal: 1,
    normalizationScale: 1,
    normalizedTotalDistance: 0,
    normalizedMeanDistance: 0,
    normalizedP50Distance: 0,
    normalizedP90Distance: 0,
    normalizedP95Distance: 0,
    normalizedP99Distance: 0,
    normalizedMaxDistance: 0,
    groupMismatchCount: 0,
    visibleToHiddenCount: 0,
    improvement: 0,
    preparationDurationMs: 0,
    metricsVersion: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.id,
    units: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.distanceUnits,
    normalizedUnits: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.normalizedDistanceUnits,
    baselineMode: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.baselineMode,
    requestedAlgorithmVersion: '1.0.0',
    installedAlgorithmVersion: '1.0.0',
    anchorCount: 0,
    anchorTotalNormalizedSquaredDistance: 0,
    anchorMaximumNormalizedDistance: 0,
    anchorSourceIndices: [],
    tailGuardCount: 0,
  };
}

function createResponse(pointCount) {
  const output = createOutput(pointCount);
  const fingerprint = fingerprintAboutNarrativeOutput(output);
  const inputFingerprint = fingerprintAboutNarrativePairInput({
    fromFingerprint: fingerprint,
    targetFingerprint: fingerprint,
    strategyId: 'index-v1',
    strategyVersion: '1.0.0',
    fromMatrix: MATRIX,
    toMatrix: MATRIX,
  });
  return {
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    generation: 4,
    sequenceKey: 'publication-validation',
    status: 'success',
    outputs: [{ id: 'promise', fingerprint, output }],
    pairs: [{
      pairId: 'promise->promise',
      fromId: 'promise',
      toId: 'promise',
      requestedStrategy: 'index-v1',
      installedStrategy: 'index-v1',
      fallbackReason: '',
      inputFingerprint,
      fromFingerprint: fingerprint,
      toFingerprint: fingerprint,
      metrics: createMetrics(pointCount),
    }],
    timings: { generationMs: 1, correspondenceMs: 1, totalMs: 2 },
  };
}

test('publication validation scans every scalar in bounded yielding chunks', async () => {
  const pointCount = 4096;
  const expected = createExpected(pointCount);
  const response = createResponse(pointCount);
  const chunkStats = [];
  let yields = 0;
  const result = await validateAboutNarrativeWorkerPublication(response, expected, {
    valuesPerChunk: 256,
    chunkBudgetMs: 8,
    now: () => 0,
    yieldControl: async () => { yields += 1; },
    onChunk: (chunk) => chunkStats.push(chunk),
  });
  const expectedValues = pointCount * 6;
  assert.equal(result.response, response);
  assert.equal(result.valuesScanned, expectedValues);
  assert.equal(result.chunks, Math.ceil(expectedValues / 256));
  assert.equal(yields, result.chunks - 1);
  assert.ok(chunkStats.every((chunk) => chunk.values > 0 && chunk.values <= 256));
  assert.equal(chunkStats.at(-1).valuesScanned, expectedValues);
});

test('asynchronous scan rejects non-finite data missed by structural-only validation', async () => {
  const pointCount = 2048;
  const expected = createExpected(pointCount);
  const response = createResponse(pointCount);
  const badIndex = response.outputs[0].output.positions.length - 2;
  response.outputs[0].output.positions[badIndex] = Number.NaN;
  assert.equal(validateAboutNarrativeWorkerResponse(response, { ...expected, scanValues: false }), response);
  await assert.rejects(
    validateAboutNarrativeWorkerPublication(response, expected, {
      valuesPerChunk: 128,
      now: () => 0,
      yieldControl: async () => {},
    }),
    (error) => error instanceof AboutNarrativePublicationValidationError
      && error.details.attribute === 'positions'
      && error.details.index === badIndex,
  );
});

test('publication scan rejects presence, size, and custom-attribute range failures', async () => {
  const expected = createExpected(128);
  const cases = [
    ['presence', 1.1, /presence is outside/],
    ['size', -0.1, /size is negative/],
    ['disciplineGroup', Number.POSITIVE_INFINITY, /non-finite/],
    ['disciplineGroup', 1.5, /disciplineGroup is invalid/],
  ];
  for (const [attribute, value, pattern] of cases) {
    const response = createResponse(128);
    const output = response.outputs[0].output;
    const array = attribute === 'disciplineGroup' ? output.attributes[attribute] : output[attribute];
    array[127] = value;
    await assert.rejects(
      validateAboutNarrativeWorkerPublication(response, expected, {
        valuesPerChunk: 64,
        now: () => 0,
        yieldControl: async () => {},
      }),
      pattern,
    );
  }
});

test('publication validation is abortable between bounded chunks', async () => {
  const pointCount = 4096;
  const controller = new AbortController();
  let yields = 0;
  await assert.rejects(
    validateAboutNarrativeWorkerPublication(createResponse(pointCount), createExpected(pointCount), {
      signal: controller.signal,
      valuesPerChunk: 64,
      now: () => 0,
      yieldControl: async () => {
        yields += 1;
        controller.abort();
      },
    }),
    (error) => error?.name === 'AbortError',
  );
  assert.equal(yields, 1);
});

test('failure envelopes need no scalar scan and preserve their identity', async () => {
  const failure = createAboutNarrativeWorkerFailure({
    generation: 4,
    sequenceKey: 'publication-validation',
    category: 'generation',
    code: 'shape-generation-failed',
    message: 'A point-field Shape could not be prepared.',
  });
  let yields = 0;
  const result = await validateAboutNarrativeWorkerPublication(failure, createExpected(128), {
    yieldControl: async () => { yields += 1; },
  });
  assert.equal(result.response, failure);
  assert.equal(result.valuesScanned, 0);
  assert.equal(result.chunks, 0);
  assert.equal(yields, 0);
});

test('structural validation bounds attribute descriptor count before asynchronous work', async () => {
  const response = createResponse(1);
  response.outputs[0].output.attributes = Object.fromEntries(
    Array.from({ length: 33 }, (_, index) => [`attribute${index}`, new Float32Array(1)]),
  );
  let yields = 0;
  await assert.rejects(
    validateAboutNarrativeWorkerPublication(response, createExpected(1), {
      yieldControl: async () => { yields += 1; },
    }),
    /too many attributes/,
  );
  assert.equal(yields, 0);
});
