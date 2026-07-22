import {
  ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA,
} from './aboutNarrativeCorrespondenceRegistry.js';
import {
  assignAboutNarrativeSpatialBucket,
  createAboutNarrativeSpatialContext,
  validateAboutNarrativeV2Output,
} from './aboutNarrativeCorrespondenceV2.js';

export const ABOUT_NARRATIVE_RADIAL_EMERGENCE_BAND_COUNT = 64;

function isVisible(value) {
  return value > ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.visibilityThreshold;
}

function partitionUnused(indices, used, presence) {
  const visible = [];
  const hidden = [];
  indices.forEach((index) => {
    if (used[index]) return;
    (isVisible(presence[index]) ? visible : hidden).push(index);
  });
  return { visible, hidden };
}

function sourceRadiusSquared(positions, index, centerX, centerZ) {
  const offset = index * 3;
  const x = positions[offset] - centerX;
  const z = positions[offset + 2] - centerZ;
  return (x * x) + (z * z);
}

function targetEmergenceY(positions, index) {
  return positions[(index * 3) + 1];
}

function assignRadialBands({
  sources,
  targets,
  mapping,
  usedSources,
  usedTargets,
  fromPositions,
  toPositions,
  spatial,
  centerX,
  centerZ,
}) {
  const pairCount = Math.min(sources.length, targets.length);
  if (!pairCount) return;
  const sourceOrder = [...sources].sort((left, right) => (
    sourceRadiusSquared(fromPositions, left, centerX, centerZ)
      - sourceRadiusSquared(fromPositions, right, centerX, centerZ)
  ) || (left - right)).slice(0, pairCount);
  const targetOrder = [...targets].sort((left, right) => (
    targetEmergenceY(toPositions, right) - targetEmergenceY(toPositions, left)
  ) || (left - right)).slice(0, pairCount);
  const bandCount = Math.min(ABOUT_NARRATIVE_RADIAL_EMERGENCE_BAND_COUNT, pairCount);

  for (let band = 0; band < bandCount; band += 1) {
    const start = Math.floor((band * pairCount) / bandCount);
    const end = Math.floor(((band + 1) * pairCount) / bandCount);
    assignAboutNarrativeSpatialBucket({
      sources: sourceOrder.slice(start, end),
      targets: targetOrder.slice(start, end),
      mapping,
      usedSources,
      usedTargets,
      fromPositions,
      toPositions,
      spatial,
    });
  }
}

export function createAboutNarrativeRadialEmergence({
  fromOutput,
  toOutput,
  fromPositions,
  toPositions,
  centerX = 0,
  centerZ = 0,
  fromLabel = 'Source Shape',
  toLabel = 'Target Shape',
}) {
  const fromValidation = validateAboutNarrativeV2Output(fromOutput, fromLabel);
  const toValidation = validateAboutNarrativeV2Output(toOutput, toLabel);
  if (fromValidation.count !== toValidation.count) {
    throw new Error('Correspondence Shapes must use the same point count.');
  }
  const count = fromValidation.count;
  const mapping = new Int32Array(count).fill(-1);
  const usedSources = new Uint8Array(count);
  const usedTargets = new Uint8Array(count);
  const spatial = createAboutNarrativeSpatialContext(fromPositions, toPositions, count);
  const assign = (sources, targets) => assignAboutNarrativeSpatialBucket({
    sources,
    targets,
    mapping,
    usedSources,
    usedTargets,
    fromPositions,
    toPositions,
    spatial,
  });
  const allIndices = Array.from({ length: count }, (_, index) => index);
  const source = partitionUnused(allIndices, usedSources, fromOutput.presence);
  const target = partitionUnused(allIndices, usedTargets, toOutput.presence);

  assignRadialBands({
    sources: source.visible,
    targets: target.visible,
    mapping,
    usedSources,
    usedTargets,
    fromPositions,
    toPositions,
    spatial,
    centerX,
    centerZ,
  });

  assign(
    source.visible.filter((index) => !usedSources[index]),
    target.hidden.filter((index) => !usedTargets[index]),
  );
  assign(
    source.hidden.filter((index) => !usedSources[index]),
    target.visible.filter((index) => !usedTargets[index]),
  );
  assign(
    source.hidden.filter((index) => !usedSources[index]),
    target.hidden.filter((index) => !usedTargets[index]),
  );
  assign(
    allIndices.filter((index) => !usedSources[index]),
    allIndices.filter((index) => !usedTargets[index]),
  );

  return {
    permutation: new Uint32Array(mapping),
    normalizationScale: spatial.scale,
    tieTolerance: spatial.tieTolerance,
  };
}
