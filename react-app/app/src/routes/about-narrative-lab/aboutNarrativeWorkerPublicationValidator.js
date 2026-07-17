import {
  validateAboutNarrativeWorkerResponse,
} from './aboutNarrativeWorkerProtocol.js';

const DEFAULT_VALUES_PER_CHUNK = 2048;
const DEFAULT_CHUNK_BUDGET_MS = 2.5;
const MIN_VALUES_PER_CHUNK = 64;
const MAX_VALUES_PER_CHUNK = 16384;
const MIN_CHUNK_BUDGET_MS = 0.25;
const MAX_CHUNK_BUDGET_MS = 8;
const CLOCK_CHECK_INTERVAL = 64;

export class AboutNarrativePublicationValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'AboutNarrativePublicationValidationError';
    this.code = 'worker-publication-values';
    this.details = Object.freeze({ ...details });
  }
}

function createAbortError() {
  if (typeof DOMException === 'function') return new DOMException('Publication validation was aborted.', 'AbortError');
  const error = new Error('Publication validation was aborted.');
  error.name = 'AbortError';
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw createAbortError();
}

function boundedNumber(value, fallback, minimum, maximum, label) {
  const resolved = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(resolved) || resolved < minimum || resolved > maximum) {
    throw new TypeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return resolved;
}

function defaultYield() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function createArrayDescriptors(response) {
  const descriptors = [];
  response.outputs.forEach(({ id, output }) => {
    descriptors.push({ outputId: id, attribute: 'positions', kind: 'finite', array: output.positions });
    descriptors.push({ outputId: id, attribute: 'presence', kind: 'presence', array: output.presence });
    descriptors.push({ outputId: id, attribute: 'size', kind: 'size', array: output.size });
    Object.entries(output.attributes).forEach(([name, array]) => {
      descriptors.push({
        outputId: id,
        attribute: name,
        kind: name === 'disciplineGroup' ? 'disciplineGroup' : 'finite',
        array,
      });
    });
  });
  return descriptors;
}

function validateScalar(descriptor, index) {
  const value = descriptor.array[index];
  const details = {
    outputId: descriptor.outputId,
    attribute: descriptor.attribute,
    index,
    value,
  };
  if (!Number.isFinite(value)) {
    throw new AboutNarrativePublicationValidationError(
      `Worker output ${descriptor.outputId} ${descriptor.attribute} contains a non-finite value at index ${index}.`,
      details,
    );
  }
  if (descriptor.kind === 'presence' && (value < 0 || value > 1)) {
    throw new AboutNarrativePublicationValidationError(
      `Worker output ${descriptor.outputId} presence is outside 0…1 at index ${index}.`,
      details,
    );
  }
  if (descriptor.kind === 'size' && value < 0) {
    throw new AboutNarrativePublicationValidationError(
      `Worker output ${descriptor.outputId} size is negative at index ${index}.`,
      details,
    );
  }
  if (descriptor.kind === 'disciplineGroup'
    && (!Number.isInteger(value) || value < 0 || value > 6)) {
    throw new AboutNarrativePublicationValidationError(
      `Worker output ${descriptor.outputId} disciplineGroup is invalid at index ${index}.`,
      details,
    );
  }
}

export async function validateAboutNarrativeWorkerPublication(response, expected, {
  signal,
  valuesPerChunk = DEFAULT_VALUES_PER_CHUNK,
  chunkBudgetMs = DEFAULT_CHUNK_BUDGET_MS,
  yieldControl = defaultYield,
  now = () => performance.now(),
  onChunk = null,
} = {}) {
  if (typeof yieldControl !== 'function') throw new TypeError('Publication validation yieldControl must be a function.');
  if (onChunk !== null && typeof onChunk !== 'function') throw new TypeError('Publication validation onChunk must be a function.');
  const maximumValues = Math.floor(boundedNumber(
    valuesPerChunk,
    DEFAULT_VALUES_PER_CHUNK,
    MIN_VALUES_PER_CHUNK,
    MAX_VALUES_PER_CHUNK,
    'Publication validation valuesPerChunk',
  ));
  const maximumDuration = boundedNumber(
    chunkBudgetMs,
    DEFAULT_CHUNK_BUDGET_MS,
    MIN_CHUNK_BUDGET_MS,
    MAX_CHUNK_BUDGET_MS,
    'Publication validation chunkBudgetMs',
  );
  throwIfAborted(signal);
  const startedAt = now();
  const validated = validateAboutNarrativeWorkerResponse(response, {
    ...expected,
    scanValues: false,
  });
  if (validated.status === 'failure') {
    return Object.freeze({
      response: validated,
      valuesScanned: 0,
      chunks: 0,
      durationMs: Math.max(0, now() - startedAt),
    });
  }

  const descriptors = createArrayDescriptors(validated);
  const totalValues = descriptors.reduce((total, descriptor) => total + descriptor.array.length, 0);
  let descriptorIndex = 0;
  let valueIndex = 0;
  let valuesScanned = 0;
  let chunks = 0;

  while (descriptorIndex < descriptors.length) {
    throwIfAborted(signal);
    const chunkStartedAt = now();
    let chunkValues = 0;
    while (descriptorIndex < descriptors.length && chunkValues < maximumValues) {
      const descriptor = descriptors[descriptorIndex];
      while (valueIndex < descriptor.array.length && chunkValues < maximumValues) {
        validateScalar(descriptor, valueIndex);
        valueIndex += 1;
        chunkValues += 1;
        valuesScanned += 1;
        if (chunkValues % CLOCK_CHECK_INTERVAL === 0
          && now() - chunkStartedAt >= maximumDuration) break;
      }
      if (valueIndex >= descriptor.array.length) {
        descriptorIndex += 1;
        valueIndex = 0;
      }
      if (chunkValues % CLOCK_CHECK_INTERVAL === 0
        && now() - chunkStartedAt >= maximumDuration) break;
    }
    chunks += 1;
    onChunk?.(Object.freeze({
      chunk: chunks,
      values: chunkValues,
      valuesScanned,
      totalValues,
      durationMs: Math.max(0, now() - chunkStartedAt),
    }));
    if (descriptorIndex < descriptors.length) {
      await yieldControl({ signal, chunk: chunks });
      throwIfAborted(signal);
    }
  }

  return Object.freeze({
    response: validated,
    valuesScanned,
    chunks,
    durationMs: Math.max(0, now() - startedAt),
  });
}
