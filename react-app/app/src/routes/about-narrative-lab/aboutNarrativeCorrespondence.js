import {
  ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA,
  getAboutNarrativeCorrespondenceStrategyVersion,
} from './aboutNarrativeCorrespondenceRegistry.js';
import {
  getAboutNarrativeCorrespondenceDispatchKey,
} from './aboutNarrativeCorrespondenceStrategyDispatch.js';
import {
  fingerprintAboutNarrativeOutput,
  fingerprintAboutNarrativePairInput,
} from './aboutNarrativeCorrespondenceFingerprint.js';
import {
  createAboutNarrativeSpatialNearestV2,
  validateAboutNarrativeV2Output,
} from './aboutNarrativeCorrespondenceV2.js';

const VISIBLE_THRESHOLD = 0.001;
const MORTON_SCALE = 1023;
const COST_EPSILON = 1e-8;
const SWAP_STRIDES = Object.freeze([1, 2, 4, 8]);
const IDENTITY_MATRIX = Object.freeze([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

function validateOutput(output, label) {
  if (!(output?.positions instanceof Float32Array) || output.positions.length % 3 !== 0) {
    throw new Error(`${label} positions must be a stride-3 Float32Array.`);
  }
  const count = output.positions.length / 3;
  ['presence', 'size'].forEach((key) => {
    const value = output[key];
    if (!(value instanceof Float32Array) || value.length !== count) {
      throw new Error(`${label} ${key} must be a scalar Float32Array matching the point count.`);
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Number.isFinite(value[index])) throw new Error(`${label} ${key} contains a non-finite value.`);
    }
  });
  Object.entries(output.attributes || {}).forEach(([name, value]) => {
    if (!(value instanceof Float32Array) || value.length !== count) {
      throw new Error(`${label} attribute ${name} must be a scalar Float32Array matching the point count.`);
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Number.isFinite(value[index])) throw new Error(`${label} attribute ${name} contains a non-finite value.`);
    }
  });
  return count;
}

function normalizeMatrix(matrix) {
  const values = matrix || IDENTITY_MATRIX;
  if (!Array.isArray(values) && !(values instanceof Float32Array) && !(values instanceof Float64Array)) {
    throw new Error('Correspondence transforms must be column-major 4×4 matrices.');
  }
  if (values.length !== 16 || Array.from(values).some((value) => !Number.isFinite(value))) {
    throw new Error('Correspondence transforms must contain 16 finite values.');
  }
  return values;
}

function transformPositions(positions, matrix) {
  const transformed = new Float64Array(positions.length);
  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const z = positions[index + 2];
    const w = (matrix[3] * x) + (matrix[7] * y) + (matrix[11] * z) + matrix[15];
    const inverseW = w && w !== 1 ? 1 / w : 1;
    transformed[index] = ((matrix[0] * x) + (matrix[4] * y) + (matrix[8] * z) + matrix[12]) * inverseW;
    transformed[index + 1] = ((matrix[1] * x) + (matrix[5] * y) + (matrix[9] * z) + matrix[13]) * inverseW;
    transformed[index + 2] = ((matrix[2] * x) + (matrix[6] * y) + (matrix[10] * z) + matrix[14]) * inverseW;
  }
  for (let index = 0; index < transformed.length; index += 1) {
    if (!Number.isFinite(transformed[index])) throw new Error('Correspondence produced a non-finite world coordinate.');
  }
  return transformed;
}

function squaredDistance(fromPositions, sourceIndex, toPositions, targetIndex) {
  const fromOffset = sourceIndex * 3;
  const toOffset = targetIndex * 3;
  const x = fromPositions[fromOffset] - toPositions[toOffset];
  const y = fromPositions[fromOffset + 1] - toPositions[toOffset + 1];
  const z = fromPositions[fromOffset + 2] - toPositions[toOffset + 2];
  return (x * x) + (y * y) + (z * z);
}

function expandMortonBits(value) {
  let result = value & 0x3ff;
  result = (result | (result << 16)) & 0x030000ff;
  result = (result | (result << 8)) & 0x0300f00f;
  result = (result | (result << 4)) & 0x030c30c3;
  result = (result | (result << 2)) & 0x09249249;
  return result;
}

function createMortonOrdering(indices, positions, sharedBounds) {
  const spans = [0, 1, 2].map((axis) => sharedBounds.max[axis] - sharedBounds.min[axis]);
  return indices.map((index) => {
    const offset = index * 3;
    const quantized = [0, 1, 2].map((axis) => spans[axis] <= COST_EPSILON
      ? 0
      : Math.max(0, Math.min(MORTON_SCALE, Math.round(
        ((positions[offset + axis] - sharedBounds.min[axis]) / spans[axis]) * MORTON_SCALE,
      ))));
    const code = (
      (expandMortonBits(quantized[0]) << 2)
      | (expandMortonBits(quantized[1]) << 1)
      | expandMortonBits(quantized[2])
    ) >>> 0;
    return { index, code };
  }).sort((a, b) => (a.code - b.code) || (a.index - b.index)).map((item) => item.index);
}

function calculateSharedBounds(fromPositions, sourceIndices, toPositions, targetIndices) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  const include = (positions, index) => {
    const offset = index * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[offset + axis]);
      max[axis] = Math.max(max[axis], positions[offset + axis]);
    }
  };
  sourceIndices.forEach((index) => include(fromPositions, index));
  targetIndices.forEach((index) => include(toPositions, index));
  if (!sourceIndices.length && !targetIndices.length) return { min: [0, 0, 0], max: [0, 0, 0] };
  return { min, max };
}

function refineSpatialPairs(sourceOrder, mapping, fromPositions, toPositions) {
  SWAP_STRIDES.forEach((stride) => {
    if (stride >= sourceOrder.length) return;
    for (let direction = 0; direction < 2; direction += 1) {
      const start = direction ? sourceOrder.length - stride - 1 : 0;
      const end = direction ? -1 : sourceOrder.length - stride;
      const step = direction ? -1 : 1;
      for (let orderIndex = start; orderIndex !== end; orderIndex += step) {
        const sourceA = sourceOrder[orderIndex];
        const sourceB = sourceOrder[orderIndex + stride];
        const targetA = mapping[sourceA];
        const targetB = mapping[sourceB];
        if (targetA < 0 || targetB < 0) continue;
        const current = squaredDistance(fromPositions, sourceA, toPositions, targetA)
          + squaredDistance(fromPositions, sourceB, toPositions, targetB);
        const swapped = squaredDistance(fromPositions, sourceA, toPositions, targetB)
          + squaredDistance(fromPositions, sourceB, toPositions, targetA);
        if (swapped + COST_EPSILON < current) {
          mapping[sourceA] = targetB;
          mapping[sourceB] = targetA;
        }
      }
    }
  });
}

function repairSpatialOutliers(sourceOrder, mapping, fromPositions, toPositions) {
  const ranked = sourceOrder.map((sourceIndex, orderIndex) => ({
    sourceIndex,
    orderIndex,
    cost: squaredDistance(fromPositions, sourceIndex, toPositions, mapping[sourceIndex]),
  })).sort((a, b) => (b.cost - a.cost) || (a.sourceIndex - b.sourceIndex));
  const repairCount = Math.min(320, ranked.length);
  for (let rankedIndex = 0; rankedIndex < repairCount; rankedIndex += 1) {
    const current = ranked[rankedIndex];
    const sourceA = current.sourceIndex;
    let targetA = mapping[sourceA];
    let costA = squaredDistance(fromPositions, sourceA, toPositions, targetA);
    let best = null;
    const windowStart = Math.max(0, current.orderIndex - 160);
    const windowEnd = Math.min(sourceOrder.length - 1, current.orderIndex + 160);
    for (let orderIndex = windowStart; orderIndex <= windowEnd; orderIndex += 1) {
      const sourceB = sourceOrder[orderIndex];
      if (sourceB === sourceA) continue;
      const targetB = mapping[sourceB];
      const costB = squaredDistance(fromPositions, sourceB, toPositions, targetB);
      const nextA = squaredDistance(fromPositions, sourceA, toPositions, targetB);
      if (nextA + COST_EPSILON >= costA) continue;
      const nextB = squaredDistance(fromPositions, sourceB, toPositions, targetA);
      const currentPairCost = costA + costB;
      const nextPairCost = nextA + nextB;
      const currentPairMax = Math.max(costA, costB);
      const nextPairMax = Math.max(nextA, nextB);
      if (nextPairCost > currentPairCost + COST_EPSILON || nextPairMax + COST_EPSILON >= currentPairMax) continue;
      if (!best || nextPairMax < best.max - COST_EPSILON
        || (Math.abs(nextPairMax - best.max) <= COST_EPSILON && nextPairCost < best.cost)) {
        best = { sourceB, targetB, max: nextPairMax, cost: nextPairCost };
      }
    }
    if (best) {
      mapping[sourceA] = best.targetB;
      mapping[best.sourceB] = targetA;
      targetA = mapping[sourceA];
      costA = squaredDistance(fromPositions, sourceA, toPositions, targetA);
    }
  }
}

function pairSets({
  sourceIndices,
  targetIndices,
  mapping,
  usedSources,
  usedTargets,
  fromPositions,
  toPositions,
  spatial,
}) {
  if (!sourceIndices.length || !targetIndices.length) return;
  const sharedBounds = calculateSharedBounds(fromPositions, sourceIndices, toPositions, targetIndices);
  const sourceOrder = spatial
    ? createMortonOrdering(sourceIndices, fromPositions, sharedBounds)
    : [...sourceIndices].sort((a, b) => a - b);
  const targetOrder = spatial
    ? createMortonOrdering(targetIndices, toPositions, sharedBounds)
    : [...targetIndices].sort((a, b) => a - b);
  const pairCount = Math.min(sourceOrder.length, targetOrder.length);
  const pairedSources = sourceOrder.slice(0, pairCount);
  for (let index = 0; index < pairCount; index += 1) {
    const sourceIndex = sourceOrder[index];
    const targetIndex = targetOrder[index];
    mapping[sourceIndex] = targetIndex;
    usedSources[sourceIndex] = 1;
    usedTargets[targetIndex] = 1;
  }
  if (spatial) {
    refineSpatialPairs(pairedSources, mapping, fromPositions, toPositions);
    repairSpatialOutliers(pairedSources, mapping, fromPositions, toPositions);
  }
}

function nearestUnusedSource(targetIndex, sourceIndices, usedSources, fromPositions, toPositions) {
  let nearest = -1;
  let nearestCost = Infinity;
  sourceIndices.forEach((sourceIndex) => {
    if (usedSources[sourceIndex]) return;
    const cost = squaredDistance(fromPositions, sourceIndex, toPositions, targetIndex);
    if (cost + COST_EPSILON < nearestCost || (Math.abs(cost - nearestCost) <= COST_EPSILON && sourceIndex < nearest)) {
      nearest = sourceIndex;
      nearestCost = cost;
    }
  });
  return nearest;
}

function createConstrainedPermutation(fromOutput, toOutput, fromPositions, toPositions, spatial) {
  const count = fromOutput.presence.length;
  const mapping = new Int32Array(count).fill(-1);
  const usedSources = new Uint8Array(count);
  const usedTargets = new Uint8Array(count);
  const fromGroups = fromOutput.attributes?.disciplineGroup;
  const toGroups = toOutput.attributes?.disciplineGroup;

  if (fromGroups && toGroups) {
    const groupIds = new Set();
    fromGroups.forEach((group) => { if (group > 0) groupIds.add(Math.round(group)); });
    toGroups.forEach((group) => { if (group > 0) groupIds.add(Math.round(group)); });
    [...groupIds].sort((a, b) => a - b).forEach((group) => {
      const sourceIndices = [];
      const targetIndices = [];
      for (let index = 0; index < count; index += 1) {
        if (!usedSources[index] && Math.round(fromGroups[index]) === group) sourceIndices.push(index);
        if (!usedTargets[index] && Math.round(toGroups[index]) === group) targetIndices.push(index);
      }
      pairSets({ sourceIndices, targetIndices, mapping, usedSources, usedTargets, fromPositions, toPositions, spatial });
    });
  }

  if (toGroups) {
    const visibleSources = [];
    const allSources = [];
    for (let index = 0; index < count; index += 1) {
      allSources.push(index);
      if (fromOutput.presence[index] > VISIBLE_THRESHOLD) visibleSources.push(index);
    }
    for (let targetIndex = 0; targetIndex < count; targetIndex += 1) {
      if (usedTargets[targetIndex] || toGroups[targetIndex] <= 0) continue;
      let sourceIndex = nearestUnusedSource(targetIndex, visibleSources, usedSources, fromPositions, toPositions);
      if (sourceIndex < 0) sourceIndex = nearestUnusedSource(targetIndex, allSources, usedSources, fromPositions, toPositions);
      if (sourceIndex < 0) continue;
      mapping[sourceIndex] = targetIndex;
      usedSources[sourceIndex] = 1;
      usedTargets[targetIndex] = 1;
    }
  }

  const sourceActive = [];
  const sourceInactive = [];
  const targetActive = [];
  const targetInactive = [];
  for (let index = 0; index < count; index += 1) {
    if (!usedSources[index]) (fromOutput.presence[index] > VISIBLE_THRESHOLD ? sourceActive : sourceInactive).push(index);
    if (!usedTargets[index]) (toOutput.presence[index] > VISIBLE_THRESHOLD ? targetActive : targetInactive).push(index);
  }
  pairSets({ sourceIndices: sourceActive, targetIndices: targetActive, mapping, usedSources, usedTargets, fromPositions, toPositions, spatial });
  pairSets({
    sourceIndices: sourceActive.filter((index) => !usedSources[index]),
    targetIndices: targetInactive.filter((index) => !usedTargets[index]),
    mapping, usedSources, usedTargets, fromPositions, toPositions, spatial,
  });
  pairSets({
    sourceIndices: sourceInactive.filter((index) => !usedSources[index]),
    targetIndices: targetActive.filter((index) => !usedTargets[index]),
    mapping, usedSources, usedTargets, fromPositions, toPositions, spatial,
  });
  pairSets({
    sourceIndices: sourceInactive.filter((index) => !usedSources[index]),
    targetIndices: targetInactive.filter((index) => !usedTargets[index]),
    mapping, usedSources, usedTargets, fromPositions, toPositions, spatial,
  });
  const remainingSources = [];
  const remainingTargets = [];
  for (let index = 0; index < count; index += 1) {
    if (!usedSources[index]) remainingSources.push(index);
    if (!usedTargets[index]) remainingTargets.push(index);
  }
  pairSets({ sourceIndices: remainingSources, targetIndices: remainingTargets, mapping, usedSources, usedTargets, fromPositions, toPositions, spatial });
  return new Uint32Array(mapping);
}

function createLegacyGroupAwarePermutation(fromOutput, toOutput) {
  const count = fromOutput.presence.length;
  const permutation = Uint32Array.from({ length: count }, (_, index) => index);
  const fromGroups = fromOutput.attributes?.disciplineGroup;
  const toGroups = toOutput.attributes?.disciplineGroup;
  if (!fromGroups || !toGroups) return permutation;
  const groupTarget = new Map();
  for (let index = 0; index < toGroups.length; index += 1) {
    if (toGroups[index] > 0) groupTarget.set(toGroups[index], index);
  }
  for (let index = 0; index < fromGroups.length; index += 1) {
    const group = fromGroups[index];
    const targetIndex = groupTarget.get(group);
    if (group <= 0 || !Number.isInteger(targetIndex) || index === targetIndex) continue;
    [permutation[index], permutation[targetIndex]] = [permutation[targetIndex], permutation[index]];
  }
  return permutation;
}

export function validateAboutNarrativePermutation(permutation, count) {
  if (!(permutation instanceof Uint32Array) || permutation.length !== count) {
    throw new Error('Correspondence must return one Uint32 target index per source point.');
  }
  const seen = new Uint8Array(count);
  for (let index = 0; index < permutation.length; index += 1) {
    const targetIndex = permutation[index];
    if (targetIndex >= count || seen[targetIndex]) throw new Error('Correspondence must be a complete one-to-one permutation.');
    seen[targetIndex] = 1;
  }
  return permutation;
}

function calculateMetrics(fromOutput, toOutput, permutation, fromPositions, toPositions) {
  let totalDistance = 0;
  let totalSquaredDistance = 0;
  let weightedSquaredDistance = 0;
  let totalVisibilityWeight = 0;
  let visibleOnlyTotalDistance = 0;
  let groupMismatchCount = 0;
  let visibleToHiddenCount = 0;
  const visibleDistances = [];
  const allIndices = Array.from({ length: permutation.length }, (_, index) => index);
  const sharedBounds = calculateSharedBounds(fromPositions, allIndices, toPositions, allIndices);
  const diagonal = Math.hypot(
    sharedBounds.max[0] - sharedBounds.min[0],
    sharedBounds.max[1] - sharedBounds.min[1],
    sharedBounds.max[2] - sharedBounds.min[2],
  );
  for (let sourceIndex = 0; sourceIndex < permutation.length; sourceIndex += 1) {
    const targetIndex = permutation[sourceIndex];
    const squared = squaredDistance(fromPositions, sourceIndex, toPositions, targetIndex);
    const distance = Math.sqrt(squared);
    totalDistance += distance;
    totalSquaredDistance += squared;
    const visibilityWeight = Math.max(fromOutput.presence[sourceIndex], toOutput.presence[targetIndex]);
    if (visibilityWeight > VISIBLE_THRESHOLD) {
      visibleDistances.push(distance);
      visibleOnlyTotalDistance += distance;
      weightedSquaredDistance += squared * visibilityWeight;
      totalVisibilityWeight += visibilityWeight;
    }
    const sourceGroup = fromOutput.attributes?.disciplineGroup?.[sourceIndex] || 0;
    const targetGroup = toOutput.attributes?.disciplineGroup?.[targetIndex] || 0;
    if (sourceGroup !== targetGroup) groupMismatchCount += 1;
    if (fromOutput.presence[sourceIndex] > VISIBLE_THRESHOLD
      && toOutput.presence[targetIndex] <= VISIBLE_THRESHOLD) visibleToHiddenCount += 1;
  }
  visibleDistances.sort((a, b) => a - b);
  const percentile = (values, quantile) => values[Math.max(0, Math.ceil(values.length * quantile) - 1)] || 0;
  const threshold25 = diagonal * 0.25;
  const threshold50 = diagonal * 0.5;
  const divisor = Math.max(1, visibleDistances.length);
  return {
    totalDistance,
    totalSquaredDistance,
    rmsDistance: Math.sqrt(totalSquaredDistance / Math.max(1, permutation.length)),
    weightedRmsDistance: Math.sqrt(weightedSquaredDistance / Math.max(COST_EPSILON, totalVisibilityWeight)),
    meanDistance: totalDistance / Math.max(1, permutation.length),
    p50Distance: percentile(visibleDistances, 0.5),
    p90Distance: percentile(visibleDistances, 0.9),
    p95Distance: percentile(visibleDistances, 0.95),
    p99Distance: percentile(visibleDistances, 0.99),
    maxDistance: visibleDistances.at(-1) || 0,
    visibleOnlyTotalDistance,
    visibleOnlyMeanDistance: visibleOnlyTotalDistance / Math.max(1, visibleDistances.length),
    longPathRatio25: visibleDistances.filter((distance) => distance > threshold25).length / divisor,
    longPathRatio50: visibleDistances.filter((distance) => distance > threshold50).length / divisor,
    visiblePointCount: visibleDistances.length,
    sharedBoundsDiagonal: diagonal,
    normalizationScale: diagonal > Number.EPSILON ? diagonal : 1,
    normalizedTotalDistance: totalDistance / (diagonal > Number.EPSILON ? diagonal : 1),
    normalizedMeanDistance: (totalDistance / Math.max(1, permutation.length))
      / (diagonal > Number.EPSILON ? diagonal : 1),
    normalizedP50Distance: percentile(visibleDistances, 0.5) / (diagonal > Number.EPSILON ? diagonal : 1),
    normalizedP90Distance: percentile(visibleDistances, 0.9) / (diagonal > Number.EPSILON ? diagonal : 1),
    normalizedP95Distance: percentile(visibleDistances, 0.95) / (diagonal > Number.EPSILON ? diagonal : 1),
    normalizedP99Distance: percentile(visibleDistances, 0.99) / (diagonal > Number.EPSILON ? diagonal : 1),
    normalizedMaxDistance: (visibleDistances.at(-1) || 0) / (diagonal > Number.EPSILON ? diagonal : 1),
    groupMismatchCount,
    visibleToHiddenCount,
  };
}

function finalizeMetrics(metrics, {
  requestedStrategy,
  installedStrategy,
  anchorObjective = null,
  tailGuardCount = 0,
} = {}) {
  return {
    ...metrics,
    metricsVersion: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.id,
    units: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.distanceUnits,
    normalizedUnits: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.normalizedDistanceUnits,
    baselineMode: ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.baselineMode,
    requestedAlgorithmVersion: getAboutNarrativeCorrespondenceStrategyVersion(requestedStrategy) || 'runtime-only',
    installedAlgorithmVersion: getAboutNarrativeCorrespondenceStrategyVersion(installedStrategy) || 'runtime-only',
    anchorCount: anchorObjective?.sourceIndices?.length || 0,
    anchorTotalNormalizedSquaredDistance: Number(anchorObjective?.totalNormalizedSquaredDistance || 0),
    anchorMaximumNormalizedDistance: Number(anchorObjective?.maximumNormalizedDistance || 0),
    anchorSourceIndices: [...(anchorObjective?.sourceIndices || [])],
    tailGuardCount,
  };
}

function candidateIsProtected(candidate, baseline) {
  const tailIsBalanced = (
    candidate.p95Distance <= baseline.p95Distance + COST_EPSILON
    && candidate.maxDistance <= (baseline.maxDistance * 1.02) + COST_EPSILON
  ) || (
    candidate.maxDistance <= baseline.maxDistance + COST_EPSILON
    && candidate.p95Distance <= (baseline.p95Distance * 1.08) + COST_EPSILON
  );
  return candidate.totalSquaredDistance <= baseline.totalSquaredDistance + COST_EPSILON
    && candidate.weightedRmsDistance <= baseline.weightedRmsDistance + COST_EPSILON
    && tailIsBalanced
    && candidate.longPathRatio50 <= baseline.longPathRatio50 + COST_EPSILON;
}

export function createAboutNarrativeCorrespondence(fromOutput, toOutput, mode = 'index-v1', {
  fromMatrix = IDENTITY_MATRIX,
  toMatrix = IDENTITY_MATRIX,
  fromId = 'source',
  toId = 'target',
} = {}) {
  const dispatchKey = getAboutNarrativeCorrespondenceDispatchKey(mode);
  if (dispatchKey === 'spatialV2') {
    const sourceValidation = validateAboutNarrativeV2Output(fromOutput, `Source Shape ${fromId}`);
    const targetValidation = validateAboutNarrativeV2Output(toOutput, `Target Shape ${toId}`);
    if (sourceValidation.count !== targetValidation.count) {
      throw new Error('Correspondence Shapes must use the same point count.');
    }
  }
  const count = validateOutput(fromOutput, 'Source Shape');
  if (validateOutput(toOutput, 'Target Shape') !== count) throw new Error('Correspondence Shapes must use the same point count.');
  const fromPositions = transformPositions(fromOutput.positions, normalizeMatrix(fromMatrix));
  const toPositions = transformPositions(toOutput.positions, normalizeMatrix(toMatrix));
  const identity = Uint32Array.from({ length: count }, (_, index) => index);
  let permutation = identity;
  let installedStrategy = mode;
  let fallbackReason = '';
  let baselinePermutation = identity;
  let candidateMetrics = null;
  let anchorObjective = null;
  let tailGuardCount = 0;

  if (dispatchKey === 'groupAwareV1') {
    permutation = createLegacyGroupAwarePermutation(fromOutput, toOutput);
  } else if (dispatchKey === 'spatialV1') {
    baselinePermutation = createConstrainedPermutation(fromOutput, toOutput, fromPositions, toPositions, false);
    const candidatePermutation = createConstrainedPermutation(fromOutput, toOutput, fromPositions, toPositions, true);
    const baselineMetrics = calculateMetrics(fromOutput, toOutput, baselinePermutation, fromPositions, toPositions);
    candidateMetrics = calculateMetrics(fromOutput, toOutput, candidatePermutation, fromPositions, toPositions);
    if (candidateIsProtected(candidateMetrics, baselineMetrics)) {
      permutation = candidatePermutation;
    } else {
      permutation = baselinePermutation;
      installedStrategy = 'constrained-index-v1';
      fallbackReason = 'Spatial candidate regressed a protected travel metric.';
    }
  } else if (dispatchKey === 'spatialV2') {
    const candidate = createAboutNarrativeSpatialNearestV2({
      fromOutput,
      toOutput,
      fromPositions,
      toPositions,
      fromLabel: `Source Shape ${fromId}`,
      toLabel: `Target Shape ${toId}`,
    });
    anchorObjective = candidate.anchorObjective;
    baselinePermutation = createConstrainedPermutation(fromOutput, toOutput, fromPositions, toPositions, false);
    const baselineMetrics = calculateMetrics(fromOutput, toOutput, baselinePermutation, fromPositions, toPositions);
    candidateMetrics = calculateMetrics(fromOutput, toOutput, candidate.permutation, fromPositions, toPositions);
    const semanticGuard = candidateMetrics.groupMismatchCount <= baselineMetrics.groupMismatchCount;
    const visibilityGuard = candidateMetrics.visibleToHiddenCount <= baselineMetrics.visibleToHiddenCount;
    const continuityImproved = candidateMetrics.groupMismatchCount < baselineMetrics.groupMismatchCount
      || candidateMetrics.visibleToHiddenCount < baselineMetrics.visibleToHiddenCount;
    const safeguards = [
      semanticGuard,
      visibilityGuard,
      continuityImproved || candidateIsProtected(candidateMetrics, baselineMetrics),
    ];
    tailGuardCount = safeguards.filter((passed) => !passed).length;
    if (tailGuardCount === 0) {
      permutation = candidate.permutation;
    } else {
      permutation = baselinePermutation;
      installedStrategy = 'constrained-index-v2';
      fallbackReason = 'Spatial v2 candidate regressed a semantic, visibility, or protected travel safeguard.';
    }
  }

  validateAboutNarrativePermutation(permutation, count);
  const metrics = calculateMetrics(fromOutput, toOutput, permutation, fromPositions, toPositions);
  const baselineMetrics = calculateMetrics(fromOutput, toOutput, baselinePermutation, fromPositions, toPositions);
  const baselineRms = baselineMetrics.weightedRmsDistance;
  const installedRms = metrics.weightedRmsDistance;
  metrics.improvement = baselineRms <= COST_EPSILON ? 0 : Math.max(0, 1 - (installedRms / baselineRms));
  metrics.preparationDurationMs = 0;
  const completeMetrics = finalizeMetrics(metrics, {
    requestedStrategy: mode,
    installedStrategy,
    anchorObjective,
    tailGuardCount,
  });
  return {
    permutation,
    metrics: completeMetrics,
    requestedStrategy: mode,
    installedStrategy,
    fallbackReason,
    baselineMetrics,
    candidateMetrics,
  };
}

export function applyAboutNarrativePermutation(output, permutation) {
  const count = validateOutput(output, 'Target Shape');
  validateAboutNarrativePermutation(permutation, count);
  const mapped = {
    ...output,
    positions: new Float32Array(output.positions.length),
    presence: new Float32Array(count),
    size: new Float32Array(count),
    attributes: Object.fromEntries(Object.entries(output.attributes || {}).map(([name]) => [name, new Float32Array(count)])),
  };
  const mappedAttributes = Object.entries(mapped.attributes);
  for (let sourceIndex = 0; sourceIndex < count; sourceIndex += 1) {
    const targetIndex = permutation[sourceIndex];
    const sourceOffset = sourceIndex * 3;
    const targetOffset = targetIndex * 3;
    mapped.positions[sourceOffset] = output.positions[targetOffset];
    mapped.positions[sourceOffset + 1] = output.positions[targetOffset + 1];
    mapped.positions[sourceOffset + 2] = output.positions[targetOffset + 2];
    mapped.presence[sourceIndex] = output.presence[targetIndex];
    mapped.size[sourceIndex] = output.size[targetIndex];
    mappedAttributes.forEach(([name, attribute]) => {
      attribute[sourceIndex] = output.attributes[name][targetIndex];
    });
  }
  return mapped;
}

export function applyAboutNarrativeCorrespondence(fromOutput, toOutput, mode = 'index-v1', options = {}) {
  const result = createAboutNarrativeCorrespondence(fromOutput, toOutput, mode, options);
  const mapped = applyAboutNarrativePermutation(toOutput, result.permutation);
  mapped.correspondence = Object.freeze({
    ...result.metrics,
    requestedStrategy: result.requestedStrategy,
    installedStrategy: result.installedStrategy,
    fallbackReason: result.fallbackReason,
  });
  return mapped;
}

export function createAboutNarrativeCumulativeSequence(entries) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('A correspondence sequence needs at least one World.');
  let orderedSource = entries[0].output;
  const outputs = [orderedSource];
  let orderedSourceFingerprint = fingerprintAboutNarrativeOutput(orderedSource);
  const fingerprints = [orderedSourceFingerprint];
  const initialMatrix = entries[0].matrix || IDENTITY_MATRIX;
  const initialPermutation = Uint32Array.from({ length: orderedSource.presence.length }, (_, index) => index);
  const initialPositions = transformPositions(orderedSource.positions, normalizeMatrix(initialMatrix));
  const initialMetrics = calculateMetrics(
    orderedSource,
    orderedSource,
    initialPermutation,
    initialPositions,
    initialPositions,
  );
  initialMetrics.improvement = 0;
  initialMetrics.preparationDurationMs = 0;
  const pairs = [{
    fromId: entries[0].id,
    toId: entries[0].id,
    permutation: initialPermutation,
    requestedStrategy: 'index-v1',
    installedStrategy: 'index-v1',
    fallbackReason: '',
    inputFingerprint: fingerprintAboutNarrativePairInput({
      fromFingerprint: orderedSourceFingerprint,
      targetFingerprint: orderedSourceFingerprint,
      strategyId: 'index-v1',
      strategyVersion: getAboutNarrativeCorrespondenceStrategyVersion('index-v1'),
      fromMatrix: initialMatrix,
      toMatrix: initialMatrix,
    }),
    fromFingerprint: orderedSourceFingerprint,
    toFingerprint: orderedSourceFingerprint,
    metrics: finalizeMetrics(initialMetrics, {
      requestedStrategy: 'index-v1',
      installedStrategy: 'index-v1',
    }),
  }];
  for (let index = 1; index < entries.length; index += 1) {
    const fromEntry = entries[index - 1];
    const toEntry = entries[index];
    const targetFingerprint = fingerprintAboutNarrativeOutput(toEntry.output);
    const strategyVersion = getAboutNarrativeCorrespondenceStrategyVersion(toEntry.mode);
    const pairInputFingerprint = fingerprintAboutNarrativePairInput({
      fromFingerprint: orderedSourceFingerprint,
      targetFingerprint,
      strategyId: toEntry.mode,
      strategyVersion,
      fromMatrix: fromEntry.matrix || IDENTITY_MATRIX,
      toMatrix: toEntry.matrix || IDENTITY_MATRIX,
    });
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const result = createAboutNarrativeCorrespondence(
      orderedSource,
      toEntry.output,
      toEntry.mode,
      {
        fromMatrix: fromEntry.matrix,
        toMatrix: toEntry.matrix,
        fromId: fromEntry.id,
        toId: toEntry.id,
      },
    );
    result.metrics.preparationDurationMs = (globalThis.performance?.now?.() ?? Date.now()) - startedAt;
    const fromFingerprint = orderedSourceFingerprint;
    orderedSource = applyAboutNarrativePermutation(toEntry.output, result.permutation);
    orderedSourceFingerprint = fingerprintAboutNarrativeOutput(orderedSource);
    pairs.push({
      fromId: fromEntry.id,
      toId: toEntry.id,
      inputFingerprint: pairInputFingerprint,
      fromFingerprint,
      toFingerprint: orderedSourceFingerprint,
      ...result,
    });
    outputs.push(orderedSource);
    fingerprints.push(orderedSourceFingerprint);
  }
  return { outputs, fingerprints, pairs };
}

export function createAboutNarrativeSequenceCorrespondence(entries) {
  return createAboutNarrativeCumulativeSequence(entries).pairs;
}
