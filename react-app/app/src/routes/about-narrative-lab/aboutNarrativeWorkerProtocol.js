import {
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  getAboutNarrativeShapeDefinition,
} from './aboutNarrativeDefinitions.js';
import { ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION } from './aboutNarrativeRuntimeConstants.js';

export { ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION };
export const ABOUT_NARRATIVE_WORKER_MAX_ENTRIES = 64;
export const ABOUT_NARRATIVE_WORKER_MAX_POINT_COUNT = 12000;
export const ABOUT_NARRATIVE_WORKER_MAX_ATTRIBUTES = 32;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROPERTY_PATTERN = /^[A-Za-z][A-Za-z0-9]*$/;
const QUALITY_VALUES = new Set(['desktop', 'mobile']);
const REQUEST_KEYS = new Set([
  'protocolVersion',
  'generation',
  'sequenceKey',
  'pointCount',
  'quality',
  'entries',
]);
const ENTRY_KEYS = new Set(['id', 'mode', 'matrix', 'shapeId', 'seed', 'parameters']);
const SUCCESS_KEYS = new Set([
  'protocolVersion',
  'generation',
  'sequenceKey',
  'status',
  'outputs',
  'pairs',
  'timings',
]);
const FAILURE_KEYS = new Set([
  'protocolVersion',
  'generation',
  'sequenceKey',
  'status',
  'error',
]);
const OUTPUT_WRAPPER_KEYS = new Set(['id', 'output']);
const OUTPUT_KEYS = new Set(['positions', 'presence', 'size', 'attributes', 'bounds', 'fallbackReason']);
const BOUNDS_KEYS = new Set(['min', 'max']);
const PAIR_KEYS = new Set([
  'pairId',
  'fromId',
  'toId',
  'requestedStrategy',
  'installedStrategy',
  'fallbackReason',
  'metrics',
]);
const METRIC_KEYS = new Set([
  'totalDistance',
  'totalSquaredDistance',
  'rmsDistance',
  'weightedRmsDistance',
  'p95Distance',
  'maxDistance',
  'longPathRatio25',
  'longPathRatio50',
  'visiblePointCount',
  'sharedBoundsDiagonal',
  'improvement',
  'preparationDurationMs',
]);
const TIMING_KEYS = new Set(['generationMs', 'correspondenceMs', 'totalMs']);
const ERROR_KEYS = new Set(['category', 'code', 'message']);
const INSTALLED_STRATEGIES = new Set([
  ...ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  'constrained-index-v1',
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertPlainObject(value, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object.`);
}

function assertExactKeys(value, allowed, label) {
  assertPlainObject(value, label);
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) throw new Error(`${label} contains unknown field ${key}.`);
  });
}

function assertBoundedString(value, label, maxLength, pattern = null) {
  if (typeof value !== 'string' || !value.length || value.length > maxLength || (pattern && !pattern.test(value))) {
    throw new Error(`${label} is invalid.`);
  }
}

function assertFiniteInteger(value, label, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be a finite integer between ${minimum} and ${maximum}.`);
  }
}

function assertFiniteVector(value, length, label) {
  if (!Array.isArray(value) || value.length !== length || value.some((item) => !Number.isFinite(item))) {
    throw new Error(`${label} must contain exactly ${length} finite numbers.`);
  }
}

function validateJsonValue(value, label, state, depth = 0) {
  if (depth > 8) throw new Error(`${label} exceeds the maximum nesting depth.`);
  state.nodes += 1;
  if (state.nodes > 2048) throw new Error(`${label} exceeds the maximum value count.`);
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${label} contains a non-finite number.`);
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 2048) throw new Error(`${label} contains an oversized string.`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateJsonValue(item, `${label}.${index}`, state, depth + 1));
    return;
  }
  if (!isPlainObject(value)) throw new Error(`${label} must contain JSON-safe values only.`);
  Object.entries(value).forEach(([key, item]) => {
    if (!ID_PATTERN.test(key) && !PROPERTY_PATTERN.test(key)) {
      throw new Error(`${label} contains unsafe key ${key}.`);
    }
    validateJsonValue(item, `${label}.${key}`, state, depth + 1);
  });
}

export function validateAboutNarrativeWorkerRequest(value) {
  assertExactKeys(value, REQUEST_KEYS, 'Worker request');
  if (value.protocolVersion !== ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION) {
    throw new Error('Worker request uses an unsupported protocol version.');
  }
  assertFiniteInteger(value.generation, 'Worker generation');
  assertBoundedString(value.sequenceKey, 'Worker sequence key', 4096);
  assertFiniteInteger(value.pointCount, 'Worker point count', 1, ABOUT_NARRATIVE_WORKER_MAX_POINT_COUNT);
  if (!QUALITY_VALUES.has(value.quality)) throw new Error('Worker quality is invalid.');
  if (!Array.isArray(value.entries) || !value.entries.length || value.entries.length > ABOUT_NARRATIVE_WORKER_MAX_ENTRIES) {
    throw new Error(`Worker entries must contain between 1 and ${ABOUT_NARRATIVE_WORKER_MAX_ENTRIES} Worlds.`);
  }
  const ids = new Set();
  value.entries.forEach((entry, index) => {
    const label = `Worker entry ${index}`;
    assertExactKeys(entry, ENTRY_KEYS, label);
    assertBoundedString(entry.id, `${label} id`, 128, ID_PATTERN);
    if (ids.has(entry.id)) throw new Error(`${label} id must be unique.`);
    ids.add(entry.id);
    if (!ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(entry.mode)) throw new Error(`${label} mode is unknown.`);
    if (index === 0 && entry.mode !== 'index-v1') throw new Error('The first Worker entry must use index-v1.');
    assertFiniteVector(entry.matrix, 16, `${label} matrix`);
    assertBoundedString(entry.shapeId, `${label} Shape id`, 128, ID_PATTERN);
    if (!getAboutNarrativeShapeDefinition(entry.shapeId)) throw new Error(`${label} Shape id is unknown.`);
    if (!Number.isFinite(entry.seed)) throw new Error(`${label} seed must be finite.`);
    assertPlainObject(entry.parameters, `${label} parameters`);
    validateJsonValue(entry.parameters, `${label} parameters`, { nodes: 0 });
  });
  return value;
}

function validateTypedOutput(output, pointCount, label, { scanValues = true } = {}) {
  assertExactKeys(output, OUTPUT_KEYS, label);
  if (!(output.positions instanceof Float32Array) || output.positions.length !== pointCount * 3) {
    throw new Error(`${label} positions are invalid.`);
  }
  if (!(output.presence instanceof Float32Array) || output.presence.length !== pointCount) {
    throw new Error(`${label} presence is invalid.`);
  }
  if (!(output.size instanceof Float32Array) || output.size.length !== pointCount) {
    throw new Error(`${label} size is invalid.`);
  }
  if (scanValues) {
    [output.positions, output.presence, output.size].forEach((array) => {
      for (let index = 0; index < array.length; index += 1) {
        if (!Number.isFinite(array[index])) throw new Error(`${label} contains non-finite typed-array data.`);
      }
    });
    for (let index = 0; index < pointCount; index += 1) {
      if (output.presence[index] < 0 || output.presence[index] > 1) {
        throw new Error(`${label} presence must stay between 0 and 1.`);
      }
      if (output.size[index] < 0) throw new Error(`${label} size must be non-negative.`);
    }
  }
  assertPlainObject(output.attributes, `${label} attributes`);
  const attributes = Object.entries(output.attributes);
  if (attributes.length > ABOUT_NARRATIVE_WORKER_MAX_ATTRIBUTES) {
    throw new Error(`${label} has too many attributes.`);
  }
  attributes.forEach(([name, attribute]) => {
    assertBoundedString(name, `${label} attribute name`, 128, PROPERTY_PATTERN);
    if (!(attribute instanceof Float32Array) || attribute.length !== pointCount) {
      throw new Error(`${label} attribute ${name} is invalid.`);
    }
    if (scanValues) {
      for (let index = 0; index < attribute.length; index += 1) {
        if (!Number.isFinite(attribute[index])) throw new Error(`${label} attribute ${name} contains non-finite data.`);
      }
    }
  });
  assertExactKeys(output.bounds, BOUNDS_KEYS, `${label} bounds`);
  assertFiniteVector(output.bounds.min, 3, `${label} minimum bounds`);
  assertFiniteVector(output.bounds.max, 3, `${label} maximum bounds`);
  for (let axis = 0; axis < 3; axis += 1) {
    if (output.bounds.min[axis] > output.bounds.max[axis]) throw new Error(`${label} bounds are inverted.`);
  }
  if (output.fallbackReason !== undefined && (typeof output.fallbackReason !== 'string' || output.fallbackReason.length > 512)) {
    throw new Error(`${label} fallback reason is invalid.`);
  }
}

function validateMetrics(metrics, label) {
  assertExactKeys(metrics, METRIC_KEYS, label);
  METRIC_KEYS.forEach((key) => {
    if (!Object.hasOwn(metrics, key) || !Number.isFinite(metrics[key]) || metrics[key] < 0) {
      throw new Error(`${label} metric ${key} is invalid.`);
    }
  });
  if (!Number.isInteger(metrics.visiblePointCount)) throw new Error(`${label} visible point count is invalid.`);
  ['longPathRatio25', 'longPathRatio50', 'improvement'].forEach((key) => {
    if (metrics[key] > 1) throw new Error(`${label} metric ${key} is invalid.`);
  });
}

function validateFailureResponse(value) {
  assertExactKeys(value, FAILURE_KEYS, 'Worker failure response');
  assertExactKeys(value.error, ERROR_KEYS, 'Worker failure');
  assertBoundedString(value.error.category, 'Worker failure category', 64, ID_PATTERN);
  assertBoundedString(value.error.code, 'Worker failure code', 128, ID_PATTERN);
  assertBoundedString(value.error.message, 'Worker failure message', 512);
}

export function validateAboutNarrativeWorkerResponse(value, {
  generation,
  sequenceKey,
  pointCount,
  entries,
  scanValues = true,
} = {}) {
  assertPlainObject(value, 'Worker response');
  if (value.protocolVersion !== ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION) {
    throw new Error('Worker response uses an unsupported protocol version.');
  }
  assertFiniteInteger(value.generation, 'Worker response generation');
  assertBoundedString(value.sequenceKey, 'Worker response sequence key', 4096);
  if (generation !== undefined && value.generation !== generation) throw new Error('Worker response generation is stale.');
  if (sequenceKey !== undefined && value.sequenceKey !== sequenceKey) throw new Error('Worker response sequence key is stale.');
  if (value.status === 'failure') {
    validateFailureResponse(value);
    return value;
  }
  if (value.status !== 'success') throw new Error('Worker response status is invalid.');
  assertExactKeys(value, SUCCESS_KEYS, 'Worker success response');
  assertFiniteInteger(pointCount, 'Expected Worker point count', 1, ABOUT_NARRATIVE_WORKER_MAX_POINT_COUNT);
  if (!Array.isArray(entries) || !entries.length) throw new Error('Expected Worker entries are required to validate a success response.');
  if (!Array.isArray(value.outputs) || value.outputs.length !== entries.length) {
    throw new Error('Worker response outputs do not match the requested sequence.');
  }
  value.outputs.forEach((item, index) => {
    assertExactKeys(item, OUTPUT_WRAPPER_KEYS, `Worker output ${index}`);
    if (item.id !== entries[index].id) throw new Error(`Worker output ${index} is out of order.`);
    validateTypedOutput(item.output, pointCount, `Worker output ${item.id}`, { scanValues });
  });
  if (!Array.isArray(value.pairs) || value.pairs.length !== entries.length) {
    throw new Error('Worker response pairs do not match the requested sequence.');
  }
  value.pairs.forEach((pair, index) => {
    const fromId = entries[Math.max(0, index - 1)].id;
    const toId = entries[index].id;
    assertExactKeys(pair, PAIR_KEYS, `Worker pair ${index}`);
    if (pair.fromId !== fromId || pair.toId !== toId || pair.pairId !== `${fromId}->${toId}`) {
      throw new Error(`Worker pair ${index} references the wrong Worlds.`);
    }
    if (pair.requestedStrategy !== entries[index].mode) throw new Error(`Worker pair ${index} requested strategy is stale.`);
    if (!INSTALLED_STRATEGIES.has(pair.installedStrategy)) throw new Error(`Worker pair ${index} installed strategy is unknown.`);
    if (typeof pair.fallbackReason !== 'string' || pair.fallbackReason.length > 512) {
      throw new Error(`Worker pair ${index} fallback reason is invalid.`);
    }
    validateMetrics(pair.metrics, `Worker pair ${index}`);
  });
  assertExactKeys(value.timings, TIMING_KEYS, 'Worker timings');
  TIMING_KEYS.forEach((key) => {
    if (!Number.isFinite(value.timings[key]) || value.timings[key] < 0) throw new Error(`Worker timing ${key} is invalid.`);
  });
  return value;
}

function collectOutputBuffers(output, buffers) {
  [output.positions, output.presence, output.size].forEach((array) => buffers.add(array.buffer));
  Object.values(output.attributes).forEach((array) => buffers.add(array.buffer));
}

export function collectAboutNarrativeWorkerTransferables(response) {
  if (response?.status !== 'success') return [];
  const buffers = new Set();
  response.outputs.forEach(({ output }) => collectOutputBuffers(output, buffers));
  return [...buffers];
}

export function createAboutNarrativeWorkerFailure({
  generation,
  sequenceKey,
  category,
  code,
  message,
}) {
  const response = {
    protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    generation: Number.isSafeInteger(generation) && generation >= 0 ? generation : 0,
    sequenceKey: typeof sequenceKey === 'string' && sequenceKey.length && sequenceKey.length <= 4096
      ? sequenceKey
      : 'invalid-request',
    status: 'failure',
    error: {
      category,
      code,
      message,
    },
  };
  return validateAboutNarrativeWorkerResponse(response);
}
