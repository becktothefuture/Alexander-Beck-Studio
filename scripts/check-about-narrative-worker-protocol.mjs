import assert from 'node:assert/strict';
import test from 'node:test';
import {
  prepareAboutNarrativeWorkerResponse,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondence.worker.js';
import {
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
  collectAboutNarrativeWorkerTransferables,
  validateAboutNarrativeWorkerRequest,
  validateAboutNarrativeWorkerResponse,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeWorkerProtocol.js';

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function createOutput(values, { assetId } = {}) {
  const count = values.length;
  return {
    positions: new Float32Array(values.flatMap((value) => [value, 0, 0])),
    presence: new Float32Array(count).fill(1),
    size: new Float32Array(count).fill(1),
    attributes: {
      disciplineGroup: new Float32Array(count),
    },
    bounds: {
      min: [Math.min(...values), 0, 0],
      max: [Math.max(...values), 0, 0],
    },
    ...(assetId ? { assetId } : {}),
  };
}

function createRequest(overrides = {}) {
  return {
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    generation: 7,
    sequenceKey: 'desktop:canonical-sequence',
    pointCount: 4,
    quality: 'desktop',
    entries: [
      {
        id: 'promise',
        mode: 'index-v1',
        matrix: [...IDENTITY_MATRIX],
        shapeId: 'cluster-v1',
        seed: 12,
        parameters: {},
      },
      {
        id: 'complexity',
        mode: 'spatial-nearest-v1',
        matrix: [...IDENTITY_MATRIX],
        shapeId: 'turbulent-field-v1',
        seed: 12,
        parameters: { density: 1 },
      },
    ],
    ...overrides,
  };
}

function createGenerator() {
  return async ({ shapeId }) => shapeId === 'cluster-v1'
    ? createOutput([0, 1, 2, 3])
    : createOutput([3, 2, 1, 0]);
}

test('request validation accepts the bounded canonical envelope', () => {
  const request = createRequest();
  assert.equal(validateAboutNarrativeWorkerRequest(request), request);
});

test('request validation rejects unknown fields, modes, matrices, and unsafe parameters', () => {
  assert.throws(() => validateAboutNarrativeWorkerRequest(createRequest({ extra: true })), /unknown field/);
  const unknownMode = createRequest();
  unknownMode.entries[1].mode = 'mystery-mode';
  assert.throws(() => validateAboutNarrativeWorkerRequest(unknownMode), /mode is unknown/);
  const invalidMatrix = createRequest();
  invalidMatrix.entries[1].matrix[4] = Number.NaN;
  assert.throws(() => validateAboutNarrativeWorkerRequest(invalidMatrix), /16 finite numbers/);
  const invalidParameters = createRequest();
  invalidParameters.entries[1].parameters = { density: Number.POSITIVE_INFINITY };
  assert.throws(() => validateAboutNarrativeWorkerRequest(invalidParameters), /non-finite/);
});

test('Worker preparation returns final cumulative outputs without permutations', async () => {
  const request = createRequest();
  const response = await prepareAboutNarrativeWorkerResponse(request, {
    generateShape: createGenerator(),
  });
  assert.equal(response.status, 'success');
  validateAboutNarrativeWorkerResponse(response, request);
  assert.deepEqual(response.outputs.map((item) => item.id), ['promise', 'complexity']);
  assert.deepEqual([...response.outputs[0].output.positions], [...response.outputs[1].output.positions]);
  assert.deepEqual(response.pairs.map((pair) => pair.pairId), ['promise->promise', 'promise->complexity']);
  assert.equal(response.pairs[1].installedStrategy, 'spatial-nearest-v1');
  response.pairs.forEach((pair) => assert.equal(Object.hasOwn(pair, 'permutation'), false));
  assert.equal(Object.hasOwn(response, 'permutations'), false);
});

test('Worker preparation is deterministic and preserves aligned target attributes', async () => {
  const request = createRequest();
  const first = await prepareAboutNarrativeWorkerResponse(request, { generateShape: createGenerator() });
  const second = await prepareAboutNarrativeWorkerResponse(request, { generateShape: createGenerator() });
  assert.deepEqual(first.outputs.map(({ output }) => [...output.positions]), second.outputs.map(({ output }) => [...output.positions]));
  assert.deepEqual(
    [...first.outputs[1].output.attributes.disciplineGroup],
    [...second.outputs[1].output.attributes.disciplineGroup],
  );
});

test('response validation permits the bounded edited-world asset identifier', async () => {
  const request = createRequest();
  const response = await prepareAboutNarrativeWorkerResponse(request, {
    generateShape: async ({ shapeId }) => createOutput(
      shapeId === 'cluster-v1' ? [0, 1, 2, 3] : [3, 2, 1, 0],
      { assetId: 'about-v2-edited-world' },
    ),
  });
  assert.equal(response.status, 'success');
  assert.equal(response.outputs[0].output.assetId, 'about-v2-edited-world');
  validateAboutNarrativeWorkerResponse(response, request);
});

test('response validation fails closed for stale, malformed, non-finite, and reordered data', async () => {
  const request = createRequest();
  const response = await prepareAboutNarrativeWorkerResponse(request, { generateShape: createGenerator() });
  assert.throws(
    () => validateAboutNarrativeWorkerResponse(response, { ...request, generation: request.generation + 1 }),
    /generation is stale/,
  );
  const unknownField = structuredClone(response);
  unknownField.extra = true;
  assert.throws(() => validateAboutNarrativeWorkerResponse(unknownField, request), /unknown field/);
  const nonFinite = structuredClone(response);
  nonFinite.pairs[1].metrics.p95Distance = Number.NaN;
  assert.throws(() => validateAboutNarrativeWorkerResponse(nonFinite, request), /metric p95Distance is invalid/);
  const reordered = structuredClone(response);
  reordered.outputs[1].id = 'promise';
  assert.throws(() => validateAboutNarrativeWorkerResponse(reordered, request), /out of order/);
  const wrongType = structuredClone(response);
  wrongType.outputs[1].output.positions = new Float64Array(wrongType.outputs[1].output.positions);
  assert.throws(() => validateAboutNarrativeWorkerResponse(wrongType, request), /positions are invalid/);
});

test('transfer collection transfers every final ArrayBuffer once', async () => {
  const request = createRequest();
  const response = await prepareAboutNarrativeWorkerResponse(request, { generateShape: createGenerator() });
  assert.equal(collectAboutNarrativeWorkerTransferables(response).length, 8);
  const shared = structuredClone(response);
  shared.outputs[1].output = shared.outputs[0].output;
  validateAboutNarrativeWorkerResponse(shared, request);
  assert.equal(collectAboutNarrativeWorkerTransferables(shared).length, 4);
});

test('invalid requests and generation errors return structured public-safe failures', async () => {
  const invalid = await prepareAboutNarrativeWorkerResponse(createRequest({ unknown: true }), {
    generateShape: createGenerator(),
  });
  assert.deepEqual(invalid.error, {
    category: 'validation',
    code: 'invalid-request',
    message: 'The point-field preparation request was invalid.',
  });
  validateAboutNarrativeWorkerResponse(invalid);

  const failed = await prepareAboutNarrativeWorkerResponse(createRequest(), {
    generateShape: async () => { throw new Error('private asset path'); },
  });
  assert.deepEqual(failed.error, {
    category: 'generation',
    code: 'shape-generation-failed',
    message: 'A point-field Shape could not be prepared.',
  });
  assert.equal(JSON.stringify(failed).includes('private asset path'), false);
});
