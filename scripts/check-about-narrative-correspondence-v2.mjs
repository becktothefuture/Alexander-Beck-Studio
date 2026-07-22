import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyAboutNarrativePermutation,
  createAboutNarrativeCorrespondence,
  createAboutNarrativeCumulativeSequence,
  validateAboutNarrativePermutation,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondence.js';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_DISPATCH_IDS,
  getAboutNarrativeCorrespondenceDispatchKey,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondenceStrategyDispatch.js';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES,
  getAboutNarrativeCorrespondenceStrategy,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondenceRegistry.js';
import {
  ABOUT_NARRATIVE_RADIAL_EMERGENCE_BAND_COUNT,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRadialEmergence.js';

const IDENTITY_MATRIX = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function createFixture(points, {
  presence = null,
  size = null,
  groups = null,
  attributes = {},
} = {}) {
  const count = points.length;
  const positions = new Float32Array(points.flatMap((point) => (
    point.length === 3 ? point : [point[0], 0, 0]
  )));
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let index = 0; index < count; index += 1) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], positions[(index * 3) + axis]);
      max[axis] = Math.max(max[axis], positions[(index * 3) + axis]);
    }
  }
  const outputAttributes = Object.fromEntries(Object.entries(attributes).map(([name, values]) => (
    [name, new Float32Array(values)]
  )));
  if (groups) outputAttributes.disciplineGroup = new Float32Array(groups);
  return {
    positions,
    presence: new Float32Array(presence || new Array(count).fill(1)),
    size: new Float32Array(size || new Array(count).fill(1)),
    attributes: outputAttributes,
    bounds: { min, max },
  };
}

function snapshotOutput(output) {
  return {
    positions: [...output.positions],
    presence: [...output.presence],
    size: [...output.size],
    attributes: Object.fromEntries(Object.entries(output.attributes).map(([name, values]) => [name, [...values]])),
    bounds: structuredClone(output.bounds),
  };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

test('metadata and executable dispatch expose the same registered strategy set', () => {
  assert.deepEqual([...ABOUT_NARRATIVE_CORRESPONDENCE_MODES].sort(), [...ABOUT_NARRATIVE_CORRESPONDENCE_DISPATCH_IDS]);
  assert.equal(getAboutNarrativeCorrespondenceStrategy('spatial-nearest-v2').version, '2.0.0');
  assert.equal(getAboutNarrativeCorrespondenceDispatchKey('spatial-nearest-v2'), 'spatialV2');
  assert.equal(getAboutNarrativeCorrespondenceStrategy('radial-emergence-v1').version, '1.0.0');
  assert.equal(getAboutNarrativeCorrespondenceDispatchKey('radial-emergence-v1'), 'radialEmergenceV1');
  assert.equal(ABOUT_NARRATIVE_CORRESPONDENCE_METRICS_SCHEMA.visibilityThreshold, 0.001);
  assert.equal(JSON.stringify(ABOUT_NARRATIVE_CORRESPONDENCE_STRATEGIES).includes('function'), false);
  assert.throws(() => getAboutNarrativeCorrespondenceDispatchKey('injected-strategy'), /Unknown correspondence strategy/);
});

test('radial emergence feeds each rising target band from the corresponding center-out source band', () => {
  const count = 128;
  const centerX = 10;
  const centerZ = -4;
  const fromMatrix = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    centerX, 0, centerZ, 1,
  ];
  const toMatrix = [...fromMatrix];
  const sourcePoints = Array.from({ length: count }, (_, index) => {
    const radialRank = (index * 37) % count;
    const radius = 0.25 + (radialRank * 0.18);
    const angle = ((index * 53) % count) / count * Math.PI * 2;
    return [Math.cos(angle) * radius, -1.72, Math.sin(angle) * radius];
  });
  const targetPoints = Array.from({ length: count }, (_, index) => {
    const emergenceRank = (index * 29) % count;
    const angle = ((index * 41) % count) / count * Math.PI * 2;
    return [Math.cos(angle) * 1.4, (count - emergenceRank) * 0.04, Math.sin(angle) * 1.1];
  });
  const from = createFixture(sourcePoints, {
    attributes: { sentinel: Array.from({ length: count }, (_, index) => index) },
  });
  const to = createFixture(targetPoints, {
    attributes: { sentinel: Array.from({ length: count }, (_, index) => count - index) },
  });
  const beforeFrom = snapshotOutput(from);
  const beforeTo = snapshotOutput(to);
  const first = createAboutNarrativeCorrespondence(from, to, 'radial-emergence-v1', {
    fromMatrix,
    toMatrix,
    fromId: 'grid',
    toId: 'bust',
  });
  const second = createAboutNarrativeCorrespondence(from, to, 'radial-emergence-v1', {
    fromMatrix,
    toMatrix,
    fromId: 'grid',
    toId: 'bust',
  });
  const sourceOrder = Array.from({ length: count }, (_, index) => index).sort((left, right) => {
    const leftPoint = sourcePoints[left];
    const rightPoint = sourcePoints[right];
    return Math.hypot(leftPoint[0], leftPoint[2]) - Math.hypot(rightPoint[0], rightPoint[2])
      || left - right;
  });
  const targetOrder = Array.from({ length: count }, (_, index) => index).sort((left, right) => (
    targetPoints[right][1] - targetPoints[left][1]
  ) || (left - right));
  const targetRanks = new Int32Array(count);
  targetOrder.forEach((targetIndex, rank) => { targetRanks[targetIndex] = rank; });

  sourceOrder.forEach((sourceIndex, sourceRank) => {
    const sourceBand = Math.floor(
      (sourceRank * ABOUT_NARRATIVE_RADIAL_EMERGENCE_BAND_COUNT) / count,
    );
    const targetBand = Math.floor(
      (targetRanks[first.permutation[sourceIndex]] * ABOUT_NARRATIVE_RADIAL_EMERGENCE_BAND_COUNT) / count,
    );
    assert.equal(targetBand, sourceBand, `Source rank ${sourceRank} crossed an emergence band.`);
  });
  const earliestTarget = targetOrder[0];
  const earliestSource = first.permutation.findIndex((targetIndex) => targetIndex === earliestTarget);
  assert.ok(sourceOrder.slice(0, 2).includes(earliestSource));
  assert.equal(sourceOrder.slice(-2).includes(earliestSource), false);
  assert.equal(first.installedStrategy, 'radial-emergence-v1');
  assert.equal(first.fallbackReason, '');
  assert.equal(first.metrics.visibleToHiddenCount, 0);
  validateAboutNarrativePermutation(first.permutation, count);
  assert.deepEqual(first.permutation, second.permutation);
  assert.deepEqual(snapshotOutput(from), beforeFrom);
  assert.deepEqual(snapshotOutput(to), beforeTo);
});

test('radial emergence preserves visibility priority when hidden capacity is interleaved', () => {
  const count = 96;
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    return [Math.cos(angle) * (1 + index), 0, Math.sin(angle) * (1 + index)];
  });
  const targets = Array.from({ length: count }, (_, index) => [
    (index % 8) * 0.1,
    count - index,
    Math.floor(index / 8) * 0.1,
  ]);
  const presence = Array.from({ length: count }, (_, index) => Number(index % 3 !== 0));
  const from = createFixture(points, { presence });
  const to = createFixture(targets, { presence: [...presence].reverse() });
  const result = createAboutNarrativeCorrespondence(from, to, 'radial-emergence-v1');

  validateAboutNarrativePermutation(result.permutation, count);
  assert.equal(result.installedStrategy, 'radial-emergence-v1');
  assert.equal(result.metrics.visibleToHiddenCount, 0);
});
test('unknown direct modes reject while all legacy permutations remain byte-compatible', () => {
  const from = createFixture([[0], [1], [2], [3]], { groups: [1, 0, 2, 0] });
  const to = createFixture([[3], [2], [1], [0]], { groups: [0, 2, 0, 1] });
  const expected = {
    'index-v1': [0, 1, 2, 3],
    'stable-seed': [0, 1, 2, 3],
    'group-aware': [3, 2, 1, 0],
    'spatial-nearest-v1': [3, 2, 1, 0],
  };
  Object.entries(expected).forEach(([mode, permutation]) => {
    assert.deepEqual([...createAboutNarrativeCorrespondence(from, to, mode).permutation], permutation);
  });
  assert.throws(
    () => createAboutNarrativeCorrespondence(from, to, 'injected-strategy'),
    /Unknown correspondence strategy/,
  );
});

test('v2 rejects fractional, negative, out-of-range, and non-finite semantic group IDs exactly', () => {
  const from = createFixture([[0], [1]], { groups: [0, 1] });
  [1.5, -1, 7, Number.NaN, Number.POSITIVE_INFINITY].forEach((invalid) => {
    const to = createFixture([[0], [1]], { groups: [0, invalid] });
    assert.throws(
      () => createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v2', {
        fromId: 'from-shape',
        toId: 'to-shape',
      }),
      (error) => error.message.includes('Target Shape to-shape point 1 attribute disciplineGroup')
        && error.message.includes(String(invalid)),
    );
  });
});

test('v2 preserves visible material inside a shared semantic group before spatial distance', () => {
  const from = createFixture([[0], [10], [30], [40]], {
    presence: [1, 0, 1, 0],
    groups: [1, 1, 0, 0],
  });
  const to = createFixture([[0], [10], [40], [30]], {
    presence: [0, 1, 0, 1],
    groups: [1, 1, 0, 0],
  });
  const result = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v2');
  assert.equal(result.installedStrategy, 'spatial-nearest-v2');
  assert.equal(result.metrics.visibleToHiddenCount, 0);
  assert.equal(result.permutation[0], 1, 'The visible group-one source must own the visible group-one target.');
  assert.equal(result.permutation[1], 0, 'The hidden group-one source must retain hidden capacity.');
});

test('v2 jointly assigns target-only anchors independently of target declaration order', () => {
  const from = createFixture([[0], [4], [9], [20]], { presence: [1, 1, 1, 0] });
  const firstTarget = createFixture([[8], [1], [20], [4]], {
    presence: [1, 1, 0, 1],
    groups: [2, 1, 0, 0],
  });
  const reorderedTarget = createFixture([[1], [8], [20], [4]], {
    presence: [1, 1, 0, 1],
    groups: [1, 2, 0, 0],
  });
  const first = createAboutNarrativeCorrespondence(from, firstTarget, 'spatial-nearest-v2');
  const reordered = createAboutNarrativeCorrespondence(from, reorderedTarget, 'spatial-nearest-v2');
  const groupOwners = (target, result) => {
    const mapped = applyAboutNarrativePermutation(target, result.permutation);
    const owners = {};
    mapped.attributes.disciplineGroup.forEach((group, sourceIndex) => {
      if (group > 0) owners[group] = sourceIndex;
    });
    return owners;
  };
  assert.deepEqual(groupOwners(firstTarget, first), groupOwners(reorderedTarget, reordered));
  assert.deepEqual(first.metrics.anchorSourceIndices, reordered.metrics.anchorSourceIndices);
  assert.equal(first.metrics.anchorCount, 2);
  assert.equal(new Set(first.metrics.anchorSourceIndices).size, 2);
});

test('v2 remains deterministic for degenerate, duplicate, tiny, and extreme valid coordinates', () => {
  const fixtures = [
    [createFixture([[0], [0], [0]]), createFixture([[0], [0], [0]])],
    [createFixture([[0], [1e-20], [2e-20]]), createFixture([[2e-20], [0], [1e-20]])],
    [createFixture([[0], [1e20], [-1e20]]), createFixture([[1e20], [-1e20], [0]])],
    [createFixture([[0, 0, 0], [0, 4, 0], [0, 8, 0]]), createFixture([[0, 8, 0], [0, 0, 0], [0, 4, 0]])],
  ];
  fixtures.forEach(([from, to]) => {
    const first = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v2');
    const second = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v2');
    assert.deepEqual(first.permutation, second.permutation);
    validateAboutNarrativePermutation(first.permutation, from.presence.length);
    Object.entries(first.metrics).forEach(([key, value]) => {
      if (typeof value === 'number') assert.equal(Number.isFinite(value), true, `${key} must remain finite.`);
    });
  });
});

test('v2 cumulative outputs and fingerprints are byte-identical for direct and repeated preparation', () => {
  const a = createFixture([[0], [1], [2], [3]], { attributes: { sentinel: [0, 1, 2, 3] } });
  const b = createFixture([[3], [1], [0], [2]], { attributes: { sentinel: [30, 10, 0, 20] } });
  const c = createFixture([[2], [0], [3], [1]], { attributes: { sentinel: [200, 0, 300, 100] } });
  const entries = [
    { id: 'a', mode: 'index-v1', matrix: IDENTITY_MATRIX, output: a },
    { id: 'b', mode: 'spatial-nearest-v2', matrix: IDENTITY_MATRIX, output: b },
    { id: 'c', mode: 'spatial-nearest-v2', matrix: IDENTITY_MATRIX, output: c },
  ];
  const first = createAboutNarrativeCumulativeSequence(entries);
  const second = createAboutNarrativeCumulativeSequence(entries);
  assert.deepEqual(first.fingerprints, second.fingerprints);
  assert.ok(first.fingerprints.every((fingerprint) => /^fnv1a32-v1:[0-9a-f]{8}$/.test(fingerprint)));
  assert.deepEqual(first.outputs.map(snapshotOutput), second.outputs.map(snapshotOutput));
  assert.equal(first.pairs[2].fromFingerprint, first.pairs[1].toFingerprint);
  const direct = createAboutNarrativeCorrespondence(first.outputs[1], c, 'spatial-nearest-v2');
  assert.deepEqual(first.pairs[2].permutation, direct.permutation);

  const changedDownstream = createAboutNarrativeCumulativeSequence([
    entries[0],
    entries[1],
    { ...entries[2], output: createFixture([[20], [0], [30], [10]]) },
  ]);
  assert.equal(changedDownstream.fingerprints[0], first.fingerprints[0]);
  assert.equal(changedDownstream.fingerprints[1], first.fingerprints[1]);
});

test('v2 satisfies bijection, determinism, immutability, and finite metrics across 1,000 recorded seeds', () => {
  const recordedSeeds = Array.from({ length: 1000 }, (_, index) => index + 1);
  recordedSeeds.forEach((seed) => {
    const random = mulberry32(seed);
    const count = 1 + (seed % 32);
    const points = Array.from({ length: count }, () => [
      (random() - 0.5) * 200,
      (random() - 0.5) * (seed % 5 === 0 ? 0 : 20),
      (random() - 0.5) * 80,
    ]);
    const targets = Array.from({ length: count }, () => [
      (random() - 0.5) * 200,
      (random() - 0.5) * (seed % 7 === 0 ? 0 : 20),
      (random() - 0.5) * 80,
    ]);
    const densityValues = [0, 0.0005, 0.25, 1];
    const from = createFixture(points, {
      presence: Array.from({ length: count }, () => densityValues[Math.floor(random() * densityValues.length)]),
      size: Array.from({ length: count }, () => random() * 4),
      attributes: { sentinel: Array.from({ length: count }, (_, index) => index) },
    });
    const to = createFixture(targets, {
      presence: Array.from({ length: count }, () => densityValues[Math.floor(random() * densityValues.length)]),
      size: Array.from({ length: count }, () => random() * 4),
      attributes: { sentinel: Array.from({ length: count }, (_, index) => count - index) },
    });
    const beforeFrom = snapshotOutput(from);
    const beforeTo = snapshotOutput(to);
    const first = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v2');
    const second = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v2');
    validateAboutNarrativePermutation(first.permutation, count);
    assert.deepEqual(first.permutation, second.permutation, `Seed ${seed} must be deterministic.`);
    assert.deepEqual(snapshotOutput(from), beforeFrom, `Seed ${seed} mutated the source.`);
    assert.deepEqual(snapshotOutput(to), beforeTo, `Seed ${seed} mutated the target.`);
    Object.values(first.metrics).forEach((value) => {
      if (typeof value === 'number') assert.equal(Number.isFinite(value), true, `Seed ${seed} emitted a non-finite metric.`);
    });
  });
});
