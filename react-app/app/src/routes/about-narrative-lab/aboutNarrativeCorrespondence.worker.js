import { createAboutNarrativeCumulativeSequence } from './aboutNarrativeCorrespondence.js';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';
import {
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
  collectAboutNarrativeWorkerTransferables,
  createAboutNarrativeWorkerFailure,
  validateAboutNarrativeWorkerRequest,
  validateAboutNarrativeWorkerResponse,
} from './aboutNarrativeWorkerProtocol.js';

function createPairDiagnostics(pair) {
  return {
    pairId: `${pair.fromId}->${pair.toId}`,
    fromId: pair.fromId,
    toId: pair.toId,
    requestedStrategy: pair.requestedStrategy,
    installedStrategy: pair.installedStrategy,
    fallbackReason: pair.fallbackReason,
    metrics: pair.metrics,
  };
}

export async function prepareAboutNarrativeWorkerResponse(value, {
  generateShape = generateAboutNarrativeShape,
  createSeeds = createAboutNarrativeSeeds,
  now = () => performance.now(),
} = {}) {
  let request;
  try {
    request = validateAboutNarrativeWorkerRequest(value);
  } catch {
    return createAboutNarrativeWorkerFailure({
      generation: value?.generation,
      sequenceKey: value?.sequenceKey,
      category: 'validation',
      code: 'invalid-request',
      message: 'The point-field preparation request was invalid.',
    });
  }

  const totalStartedAt = now();
  let outputs;
  let generationMs;
  try {
    const generationStartedAt = now();
    outputs = await Promise.all(request.entries.map((entry) => generateShape({
      shapeId: entry.shapeId,
      pointCount: request.pointCount,
      seeds: createSeeds(request.pointCount, entry.seed),
      quality: request.quality,
      parameters: entry.parameters,
    })));
    generationMs = Math.max(0, now() - generationStartedAt);
  } catch {
    return createAboutNarrativeWorkerFailure({
      generation: request.generation,
      sequenceKey: request.sequenceKey,
      category: 'generation',
      code: 'shape-generation-failed',
      message: 'A point-field Shape could not be prepared.',
    });
  }

  try {
    const correspondenceStartedAt = now();
    const cumulative = createAboutNarrativeCumulativeSequence(request.entries.map((entry, index) => ({
      id: entry.id,
      mode: entry.mode,
      matrix: entry.matrix,
      output: outputs[index],
    })));
    const correspondenceMs = Math.max(0, now() - correspondenceStartedAt);
    const response = {
      protocolVersion: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
      generation: request.generation,
      sequenceKey: request.sequenceKey,
      status: 'success',
      outputs: cumulative.outputs.map((output, index) => ({
        id: request.entries[index].id,
        output,
      })),
      pairs: cumulative.pairs.map(createPairDiagnostics),
      timings: {
        generationMs,
        correspondenceMs,
        totalMs: Math.max(0, now() - totalStartedAt),
      },
    };
    return validateAboutNarrativeWorkerResponse(response, request);
  } catch {
    return createAboutNarrativeWorkerFailure({
      generation: request.generation,
      sequenceKey: request.sequenceKey,
      category: 'correspondence',
      code: 'sequence-correspondence-failed',
      message: 'The point-field sequence could not be prepared.',
    });
  }
}

const isWorkerScope = typeof globalThis.WorkerGlobalScope !== 'undefined'
  && globalThis instanceof globalThis.WorkerGlobalScope;

if (isWorkerScope) {
  globalThis.onmessage = async (event) => {
    const response = await prepareAboutNarrativeWorkerResponse(event.data);
    globalThis.postMessage(response, collectAboutNarrativeWorkerTransferables(response));
  };
}
