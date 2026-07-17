import { createAboutNarrativeSequenceCorrespondence } from './aboutNarrativeCorrespondence.js';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from './aboutNarrativePointShapes.js';

function collectTransferables(outputs, pairs) {
  const transferables = pairs.map((pair) => pair.permutation.buffer);
  outputs.forEach((output) => {
    transferables.push(output.positions.buffer, output.presence.buffer, output.size.buffer);
    Object.values(output.attributes || {}).forEach((value) => transferables.push(value.buffer));
  });
  return transferables;
}

globalThis.onmessage = async (event) => {
  const { generation, entries, pointCount, quality } = event.data || {};
  try {
    const generationStartedAt = performance.now();
    const outputs = await Promise.all(entries.map((entry) => generateAboutNarrativeShape({
      shapeId: entry.shapeId,
      pointCount,
      seeds: createAboutNarrativeSeeds(pointCount, entry.seed),
      quality,
      parameters: entry.parameters,
    })));
    const generationDurationMs = performance.now() - generationStartedAt;
    const correspondenceStartedAt = performance.now();
    const pairs = createAboutNarrativeSequenceCorrespondence(entries.map((entry, index) => ({
      id: entry.id,
      mode: entry.mode,
      matrix: entry.matrix,
      output: outputs[index],
    })));
    const correspondenceDurationMs = performance.now() - correspondenceStartedAt;
    globalThis.postMessage(
      { generation, outputs, pairs, generationDurationMs, correspondenceDurationMs },
      collectTransferables(outputs, pairs),
    );
  } catch (error) {
    globalThis.postMessage({
      generation,
      error: error?.message || 'Correspondence preparation failed.',
    });
  }
};
