import {
  ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA,
} from './aboutNarrativeCorrespondenceRegistry.js';

const GROUP_MIN = 0;
const GROUP_MAX = 6;
const MAX_TARGET_ONLY_ANCHORS = 6;
const MORTON_SCALE = 1023;
const SWAP_STRIDES = Object.freeze([1, 2, 4, 8]);

function expandMortonBits(value) {
  let result = value & 0x3ff;
  result = (result | (result << 16)) & 0x030000ff;
  result = (result | (result << 8)) & 0x0300f00f;
  result = (result | (result << 4)) & 0x030c30c3;
  result = (result | (result << 2)) & 0x09249249;
  return result;
}

function squaredDistance(fromPositions, sourceIndex, toPositions, targetIndex) {
  const sourceOffset = sourceIndex * 3;
  const targetOffset = targetIndex * 3;
  const x = fromPositions[sourceOffset] - toPositions[targetOffset];
  const y = fromPositions[sourceOffset + 1] - toPositions[targetOffset + 1];
  const z = fromPositions[sourceOffset + 2] - toPositions[targetOffset + 2];
  return (x * x) + (y * y) + (z * z);
}

function createSpatialContext(fromPositions, toPositions, count) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let maximumMagnitude = 0;
  const include = (positions, index) => {
    const offset = index * 3;
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[offset + axis];
      min[axis] = Math.min(min[axis], value);
      max[axis] = Math.max(max[axis], value);
      maximumMagnitude = Math.max(maximumMagnitude, Math.abs(value));
    }
  };
  for (let index = 0; index < count; index += 1) {
    include(fromPositions, index);
    include(toPositions, index);
  }
  const diagonal = Math.hypot(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  const scale = diagonal > Number.EPSILON
    ? diagonal
    : Math.max(1, maximumMagnitude) * Number.EPSILON * 64;
  const scaleSquared = scale * scale;
  // Distances are compared after division by the combined-bounds scale, so a
  // fixed machine-precision tolerance here remains proportional in world space.
  const tieTolerance = Number.EPSILON * 64;
  const spans = [0, 1, 2].map((axis) => max[axis] - min[axis]);
  const createRank = (positions) => {
    const entries = new Array(count);
    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const quantized = [0, 1, 2].map((axis) => spans[axis] <= scale * Number.EPSILON * 64
        ? 0
        : Math.max(0, Math.min(MORTON_SCALE, Math.round(
          ((positions[offset + axis] - min[axis]) / spans[axis]) * MORTON_SCALE,
        ))));
      const code = (
        (expandMortonBits(quantized[0]) << 2)
        | (expandMortonBits(quantized[1]) << 1)
        | expandMortonBits(quantized[2])
      ) >>> 0;
      entries[index] = { index, code };
    }
    entries.sort((left, right) => (left.code - right.code) || (left.index - right.index));
    const rank = new Int32Array(count);
    entries.forEach((entry, index) => { rank[entry.index] = index; });
    return rank;
  };
  return {
    diagonal,
    scale,
    scaleSquared,
    tieTolerance,
    sourceRank: createRank(fromPositions),
    targetRank: createRank(toPositions),
  };
}

function createGroupTable(output, label, count) {
  const groups = Array.from({ length: GROUP_MAX + 1 }, () => []);
  const buffer = output.attributes?.disciplineGroup;
  if (buffer !== undefined && (!(buffer instanceof Float32Array) || buffer.length !== count)) {
    throw new Error(`${label} disciplineGroup must be a Float32Array matching the point count.`);
  }
  for (let index = 0; index < count; index += 1) {
    const value = buffer ? buffer[index] : 0;
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < GROUP_MIN || value > GROUP_MAX) {
      throw new Error(`${label} point ${index} attribute disciplineGroup has invalid value ${String(value)}.`);
    }
    groups[value].push(index);
  }
  return groups;
}

export function validateAboutNarrativeV2Output(output, label) {
  if (!(output?.positions instanceof Float32Array) || output.positions.length % 3 !== 0) {
    throw new Error(`${label} positions must be a stride-3 Float32Array.`);
  }
  const count = output.positions.length / 3;
  if (!count) throw new Error(`${label} must contain at least one point.`);
  for (let index = 0; index < output.positions.length; index += 1) {
    if (!Number.isFinite(output.positions[index])) throw new Error(`${label} positions contains a non-finite value at index ${index}.`);
  }
  ['presence', 'size'].forEach((name) => {
    const buffer = output[name];
    if (!(buffer instanceof Float32Array) || buffer.length !== count) {
      throw new Error(`${label} ${name} must be a scalar Float32Array matching the point count.`);
    }
    for (let index = 0; index < count; index += 1) {
      const value = buffer[index];
      if (!Number.isFinite(value)
        || (name === 'presence' && (value < 0 || value > 1))
        || (name === 'size' && value < 0)) {
        throw new Error(`${label} point ${index} attribute ${name} has invalid value ${String(value)}.`);
      }
    }
  });
  Object.entries(output.attributes || {}).forEach(([name, buffer]) => {
    if (!(buffer instanceof Float32Array) || buffer.length !== count) {
      throw new Error(`${label} ${name} must be a scalar Float32Array matching the point count.`);
    }
    for (let index = 0; index < count; index += 1) {
      if (!Number.isFinite(buffer[index])) {
        throw new Error(`${label} point ${index} attribute ${name} has invalid value ${String(buffer[index])}.`);
      }
    }
  });
  if (!output.bounds || !Array.isArray(output.bounds.min) || !Array.isArray(output.bounds.max)
    || output.bounds.min.length !== 3 || output.bounds.max.length !== 3) {
    throw new Error(`${label} bounds must contain minimum and maximum vectors.`);
  }
  for (let axis = 0; axis < 3; axis += 1) {
    const minimum = output.bounds.min[axis];
    const maximum = output.bounds.max[axis];
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum) || minimum > maximum) {
      throw new Error(`${label} bounds are invalid on axis ${axis}.`);
    }
  }
  return { count, groups: createGroupTable(output, label, count) };
}

function assignPair(mapping, usedSources, usedTargets, sourceIndex, targetIndex) {
  mapping[sourceIndex] = targetIndex;
  usedSources[sourceIndex] = 1;
  usedTargets[targetIndex] = 1;
}

function refinePairs(sourceOrder, mapping, fromPositions, toPositions, spatial) {
  SWAP_STRIDES.forEach((stride) => {
    if (stride >= sourceOrder.length) return;
    for (let orderIndex = 0; orderIndex < sourceOrder.length - stride; orderIndex += 1) {
      const sourceA = sourceOrder[orderIndex];
      const sourceB = sourceOrder[orderIndex + stride];
      const targetA = mapping[sourceA];
      const targetB = mapping[sourceB];
      const current = (
        squaredDistance(fromPositions, sourceA, toPositions, targetA)
        + squaredDistance(fromPositions, sourceB, toPositions, targetB)
      ) / spatial.scaleSquared;
      const swapped = (
        squaredDistance(fromPositions, sourceA, toPositions, targetB)
        + squaredDistance(fromPositions, sourceB, toPositions, targetA)
      ) / spatial.scaleSquared;
      if (swapped + spatial.tieTolerance < current) {
        mapping[sourceA] = targetB;
        mapping[sourceB] = targetA;
      }
    }
  });
}

function assignBucket({
  sources,
  targets,
  mapping,
  usedSources,
  usedTargets,
  fromPositions,
  toPositions,
  spatial,
}) {
  if (!sources.length || !targets.length) return;
  const sourceOrder = [...sources].sort((left, right) => (
    spatial.sourceRank[left] - spatial.sourceRank[right]
  ) || (left - right));
  const targetOrder = [...targets].sort((left, right) => (
    spatial.targetRank[left] - spatial.targetRank[right]
  ) || (left - right));
  const pairCount = Math.min(sourceOrder.length, targetOrder.length);
  sourceOrder.length = pairCount;
  for (let index = 0; index < pairCount; index += 1) {
    assignPair(mapping, usedSources, usedTargets, sourceOrder[index], targetOrder[index]);
  }
  refinePairs(sourceOrder, mapping, fromPositions, toPositions, spatial);
}

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

function candidateSourceVectorIsLower({
  previous,
  previousOffset,
  current,
  currentOffset,
  assignedAnchor,
  sourceIndex,
  mask,
  anchorCount,
}) {
  for (let anchor = 0; anchor < anchorCount; anchor += 1) {
    if (!(mask & (1 << anchor))) continue;
    const nextValue = anchor === assignedAnchor
      ? sourceIndex
      : previous[previousOffset + anchor];
    const currentValue = current[currentOffset + anchor];
    if (nextValue !== currentValue) return nextValue < currentValue;
  }
  return false;
}

function solveTargetOnlyAnchors({
  anchors,
  candidateSources,
  mapping,
  usedSources,
  usedTargets,
  fromOutput,
  toOutput,
  fromPositions,
  toPositions,
  spatial,
}) {
  const anchorCount = anchors.length;
  if (!anchorCount) return { sourceIndices: [], totalNormalizedSquaredDistance: 0, maximumNormalizedDistance: 0 };
  if (anchorCount > MAX_TARGET_ONLY_ANCHORS) {
    throw new Error(`Target-only semantic anchors exceed the supported maximum of ${MAX_TARGET_ONLY_ANCHORS}.`);
  }
  if (candidateSources.length < anchorCount) throw new Error('Target-only semantic anchors have insufficient unique source capacity.');
  const stateCount = 1 << anchorCount;
  let mismatch = new Float64Array(stateCount).fill(Infinity);
  let presenceDifference = new Float64Array(stateCount).fill(Infinity);
  let total = new Float64Array(stateCount).fill(Infinity);
  let maximum = new Float64Array(stateCount).fill(Infinity);
  let sources = new Int32Array(stateCount * anchorCount).fill(-1);
  mismatch[0] = 0;
  presenceDifference[0] = 0;
  total[0] = 0;
  maximum[0] = 0;

  [...candidateSources].sort((left, right) => left - right).forEach((sourceIndex) => {
    const nextMismatch = mismatch.slice();
    const nextPresenceDifference = presenceDifference.slice();
    const nextTotal = total.slice();
    const nextMaximum = maximum.slice();
    const nextSources = sources.slice();
    for (let mask = 0; mask < stateCount; mask += 1) {
      if (!Number.isFinite(total[mask])) continue;
      for (let anchor = 0; anchor < anchorCount; anchor += 1) {
        if (mask & (1 << anchor)) continue;
        const targetIndex = anchors[anchor].targetIndex;
        const nextMask = mask | (1 << anchor);
        const distance = squaredDistance(fromPositions, sourceIndex, toPositions, targetIndex) / spatial.scaleSquared;
        const candidateMismatch = mismatch[mask]
          + Number(isVisible(fromOutput.presence[sourceIndex]) !== isVisible(toOutput.presence[targetIndex]));
        const candidatePresenceDifference = presenceDifference[mask]
          + Math.abs(fromOutput.presence[sourceIndex] - toOutput.presence[targetIndex]);
        const candidateTotal = total[mask] + distance;
        const candidateMaximum = Math.max(maximum[mask], distance);
        const sourceOffset = mask * anchorCount;
        const nextSourceOffset = nextMask * anchorCount;
        const better = candidateMismatch < nextMismatch[nextMask]
          || (candidateMismatch === nextMismatch[nextMask]
            && candidatePresenceDifference + spatial.tieTolerance < nextPresenceDifference[nextMask])
          || (candidateMismatch === nextMismatch[nextMask]
            && Math.abs(candidatePresenceDifference - nextPresenceDifference[nextMask]) <= spatial.tieTolerance
            && candidateTotal + spatial.tieTolerance < nextTotal[nextMask])
          || (candidateMismatch === nextMismatch[nextMask]
            && Math.abs(candidatePresenceDifference - nextPresenceDifference[nextMask]) <= spatial.tieTolerance
            && Math.abs(candidateTotal - nextTotal[nextMask]) <= spatial.tieTolerance
            && candidateMaximum + spatial.tieTolerance < nextMaximum[nextMask])
          || (candidateMismatch === nextMismatch[nextMask]
            && Math.abs(candidatePresenceDifference - nextPresenceDifference[nextMask]) <= spatial.tieTolerance
            && Math.abs(candidateTotal - nextTotal[nextMask]) <= spatial.tieTolerance
            && Math.abs(candidateMaximum - nextMaximum[nextMask]) <= spatial.tieTolerance
            && candidateSourceVectorIsLower({
              previous: sources,
              previousOffset: sourceOffset,
              current: nextSources,
              currentOffset: nextSourceOffset,
              assignedAnchor: anchor,
              sourceIndex,
              mask: nextMask,
              anchorCount,
            }));
        if (!better) continue;
        nextMismatch[nextMask] = candidateMismatch;
        nextPresenceDifference[nextMask] = candidatePresenceDifference;
        nextTotal[nextMask] = candidateTotal;
        nextMaximum[nextMask] = candidateMaximum;
        for (let sourceAnchor = 0; sourceAnchor < anchorCount; sourceAnchor += 1) {
          nextSources[nextSourceOffset + sourceAnchor] = sourceAnchor === anchor
            ? sourceIndex
            : sources[sourceOffset + sourceAnchor];
        }
      }
    }
    mismatch = nextMismatch;
    presenceDifference = nextPresenceDifference;
    total = nextTotal;
    maximum = nextMaximum;
    sources = nextSources;
  });

  const completeMask = stateCount - 1;
  if (!Number.isFinite(total[completeMask])) throw new Error('Target-only semantic anchor assignment could not complete.');
  const sourceOffset = completeMask * anchorCount;
  const selectedSources = [...sources.subarray(sourceOffset, sourceOffset + anchorCount)];
  selectedSources.forEach((sourceIndex, anchor) => {
    assignPair(mapping, usedSources, usedTargets, sourceIndex, anchors[anchor].targetIndex);
  });
  return {
    sourceIndices: selectedSources,
    totalNormalizedSquaredDistance: total[completeMask],
    maximumNormalizedDistance: Math.sqrt(maximum[completeMask]),
  };
}

export function createAboutNarrativeSpatialNearestV2({
  fromOutput,
  toOutput,
  fromPositions,
  toPositions,
  fromLabel = 'Source Shape',
  toLabel = 'Target Shape',
}) {
  const fromValidation = validateAboutNarrativeV2Output(fromOutput, fromLabel);
  const toValidation = validateAboutNarrativeV2Output(toOutput, toLabel);
  if (fromValidation.count !== toValidation.count) throw new Error('Correspondence Shapes must use the same point count.');
  const count = fromValidation.count;
  const mapping = new Int32Array(count).fill(-1);
  const usedSources = new Uint8Array(count);
  const usedTargets = new Uint8Array(count);
  const spatial = createSpatialContext(fromPositions, toPositions, count);
  const assign = (sources, targets) => assignBucket({
    sources,
    targets,
    mapping,
    usedSources,
    usedTargets,
    fromPositions,
    toPositions,
    spatial,
  });

  for (let group = 1; group <= GROUP_MAX; group += 1) {
    const sourceGroup = fromValidation.groups[group];
    const targetGroup = toValidation.groups[group];
    if (!sourceGroup.length || !targetGroup.length) continue;
    const source = partitionUnused(sourceGroup, usedSources, fromOutput.presence);
    const target = partitionUnused(targetGroup, usedTargets, toOutput.presence);
    assign(source.visible, target.visible);
    assign(source.visible.filter((index) => !usedSources[index]), target.hidden.filter((index) => !usedTargets[index]));
    assign(source.hidden.filter((index) => !usedSources[index]), target.visible.filter((index) => !usedTargets[index]));
    assign(source.hidden.filter((index) => !usedSources[index]), target.hidden.filter((index) => !usedTargets[index]));
  }

  const anchors = [];
  for (let group = 1; group <= GROUP_MAX; group += 1) {
    if (fromValidation.groups[group].length || !toValidation.groups[group].length) continue;
    toValidation.groups[group].forEach((targetIndex) => anchors.push({ group, targetIndex }));
  }
  anchors.sort((left, right) => (left.group - right.group) || (left.targetIndex - right.targetIndex));
  const candidateSources = [];
  for (let index = 0; index < count; index += 1) {
    if (!usedSources[index]) candidateSources.push(index);
  }
  const anchorObjective = solveTargetOnlyAnchors({
    anchors,
    candidateSources,
    mapping,
    usedSources,
    usedTargets,
    fromOutput,
    toOutput,
    fromPositions,
    toPositions,
    spatial,
  });

  const allIndices = Array.from({ length: count }, (_, index) => index);
  const remainingSource = partitionUnused(allIndices, usedSources, fromOutput.presence);
  const remainingTarget = partitionUnused(allIndices, usedTargets, toOutput.presence);
  assign(remainingSource.visible, remainingTarget.visible);
  assign(remainingSource.visible.filter((index) => !usedSources[index]), remainingTarget.hidden.filter((index) => !usedTargets[index]));
  assign(remainingSource.hidden.filter((index) => !usedSources[index]), remainingTarget.visible.filter((index) => !usedTargets[index]));
  assign(remainingSource.hidden.filter((index) => !usedSources[index]), remainingTarget.hidden.filter((index) => !usedTargets[index]));
  const finalSources = allIndices.filter((index) => !usedSources[index]);
  const finalTargets = allIndices.filter((index) => !usedTargets[index]);
  assign(finalSources, finalTargets);

  return {
    permutation: new Uint32Array(mapping),
    anchorObjective,
    normalizationScale: spatial.scale,
    tieTolerance: spatial.tieTolerance,
  };
}
