import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

import {
  createAboutNarrativePointFieldPreparationDescriptor,
  createAboutNarrativePointFieldStateGeometryFingerprint,
  createAboutNarrativePointFieldTimelineFingerprint,
  resolveAboutNarrativePointFieldPreparationTransform,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldIdentity.js';

function createState(id, overrides = {}) {
  return {
    id,
    adapterId: 'point-field-v1',
    shapeId: 'cluster-v1',
    seed: 506832829,
    railAnchorWU: 0,
    entryDistanceWU: 4,
    transform: {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: 1,
      pointSizeScale: 1,
    },
    shapeParameters: { density: 0.5, radius: 2 },
    modifiers: [],
    ...overrides,
  };
}

function createTransition(overrides = {}) {
  return {
    type: 'morph',
    easing: 'linear',
    correspondence: 'index-v1',
    stagger: { mode: 'uniform', amount: 0 },
    path: { mode: 'direct', amount: 0 },
    flatten: { mode: 'none', amount: 0 },
    ...overrides,
  };
}

function createLinearPointField(stateIds = ['state-a', 'state-b', 'state-c', 'state-d']) {
  const stateDefinitions = stateIds.map((id, index) => createState(id, {
    railAnchorWU: index * 2,
    shapeParameters: { density: 0.5, radius: 2 + (index * 0.1) },
  }));
  const keys = stateIds.map((stateId, index) => ({
    id: `key-${stateId}-${index}`,
    atWU: index,
    stateId,
  }));
  const segments = keys.slice(0, -1).map((key, index) => ({
    id: `segment-${stateIds[index]}-to-${stateIds[index + 1]}`,
    fromKeyId: key.id,
    toKeyId: keys[index + 1].id,
    transition: createTransition(),
  }));
  return { stateDefinitions, keys, segments };
}

function createDescriptor(pointField, options = {}) {
  return createAboutNarrativePointFieldPreparationDescriptor({
    pointField,
    pointProfile: 'desktop',
    preparationVariant: 'standard',
    ...options,
  });
}

function correspondenceFingerprints(descriptor) {
  return descriptor.correspondences.map((record) => ({
    occurrenceId: record.occurrenceId,
    inputFingerprint: record.inputFingerprint,
    outputFingerprint: record.outputFingerprint,
  }));
}

function geometryFingerprintByState(descriptor) {
  return new Map(descriptor.stateReferences.map((reference) => [
    reference.stateId,
    reference.geometryFingerprint,
  ]));
}

test('state identity is canonical, noise-tolerant, and excludes point-size and modifiers', () => {
  const baseline = createState('state-a', {
    shapeParameters: { radius: 2, density: 0.5 },
  });
  const reordered = structuredClone(baseline);
  reordered.shapeParameters = { density: 0.5, radius: 2 };
  reordered.railAnchorWU += 0.0000001;
  reordered.transform.position[0] += 0.0000001;
  reordered.transform.pointSizeScale = 4;
  reordered.modifiers = [{
    id: 'ambient-drift-v1',
    enabled: true,
    parameters: { amplitude: 1, speed: 7, timeMode: 'ambient' },
  }];
  assert.equal(
    createAboutNarrativePointFieldStateGeometryFingerprint({ state: reordered }),
    createAboutNarrativePointFieldStateGeometryFingerprint({ state: baseline }),
  );
});

test('resolved World rail changes invalidate affected state geometry and correspondence', () => {
  const pointField = createLinearPointField(['state-a', 'state-b']);
  const first = createDescriptor(pointField, {
    globals: { worldRail: { originZ: 8, unitsPerWU: 7.05 } },
  });
  const changed = createDescriptor(pointField, {
    globals: { worldRail: { originZ: 8, unitsPerWU: 6.1 } },
  });
  const firstGeometry = geometryFingerprintByState(first);
  const changedGeometry = geometryFingerprintByState(changed);
  assert.equal(changedGeometry.get('state-a'), firstGeometry.get('state-a'));
  assert.notEqual(changedGeometry.get('state-b'), firstGeometry.get('state-b'));
  assert.notEqual(
    changed.correspondences[0].targetGeometryFingerprint,
    first.correspondences[0].targetGeometryFingerprint,
  );
  assert.notEqual(changed.preparationFingerprint, first.preparationFingerprint);
});

test('timing and transition motion change only the timeline identity', () => {
  const baseline = createLinearPointField();
  const baselinePreparation = createDescriptor(baseline);
  const baselineTimeline = createAboutNarrativePointFieldTimelineFingerprint({
    pointField: baseline,
    interactions: [{
      id: 'interaction-a',
      type: 'discipline-reveal',
      targetStateId: 'state-b',
      startWU: 1,
      activationWU: 1.2,
      endWU: 1.8,
      parameters: { restoreDurationWU: 0.1 },
    }],
  });
  const edits = [
    (pointField) => { pointField.keys[1].atWU += 0.2; },
    (pointField) => { pointField.segments[1].transition.type = 'dissolve-morph'; },
    (pointField) => { pointField.segments[1].transition.easing = 'ease-in-out'; },
    (pointField) => { pointField.segments[1].transition.stagger = { mode: 'random', amount: 0.5 }; },
    (pointField) => { pointField.segments[1].transition.path = { mode: 'arc', amount: 0.5 }; },
    (pointField) => { pointField.segments[1].transition.flatten = { mode: 'toward-plane', amount: 0.5 }; },
  ];
  edits.forEach((edit) => {
    const changed = structuredClone(baseline);
    edit(changed);
    const changedPreparation = createDescriptor(changed);
    assert.equal(changedPreparation.preparationFingerprint, baselinePreparation.preparationFingerprint);
    assert.deepEqual(
      correspondenceFingerprints(changedPreparation),
      correspondenceFingerprints(baselinePreparation),
    );
    assert.notEqual(
      createAboutNarrativePointFieldTimelineFingerprint({
        pointField: changed,
        interactions: [{
          id: 'interaction-a',
          type: 'discipline-reveal',
          targetStateId: 'state-b',
          startWU: 1,
          activationWU: 1.2,
          endWU: 1.8,
          parameters: { restoreDurationWU: 0.1 },
        }],
      }),
      baselineTimeline,
    );
  });

  const interactionEdit = createAboutNarrativePointFieldTimelineFingerprint({
    pointField: baseline,
    interactions: [{
      id: 'interaction-a',
      type: 'discipline-reveal',
      targetStateId: 'state-b',
      startWU: 1,
      activationWU: 1.25,
      endWU: 1.8,
      parameters: { restoreDurationWU: 0.2 },
    }],
  });
  assert.notEqual(interactionEdit, baselineTimeline);
});

test('state geometry changes invalidate only that state and its downstream point chain', () => {
  const baseline = createLinearPointField();
  const changed = structuredClone(baseline);
  changed.stateDefinitions[2].shapeParameters.radius += 0.25;
  changed.stateDefinitions[2].transform.position[0] += 0.1;
  const before = createDescriptor(baseline);
  const after = createDescriptor(changed);
  const beforeGeometry = geometryFingerprintByState(before);
  const afterGeometry = geometryFingerprintByState(after);
  ['state-a', 'state-b', 'state-d'].forEach((stateId) => {
    assert.equal(afterGeometry.get(stateId), beforeGeometry.get(stateId));
  });
  assert.notEqual(afterGeometry.get('state-c'), beforeGeometry.get('state-c'));
  assert.deepEqual(after.correspondences[0], before.correspondences[0]);
  assert.notEqual(after.correspondences[1].inputFingerprint, before.correspondences[1].inputFingerprint);
  assert.notEqual(after.correspondences[2].inputFingerprint, before.correspondences[2].inputFingerprint);
});

test('correspondence strategy invalidates its occurrence and downstream chain only', () => {
  const baseline = createLinearPointField();
  const changed = structuredClone(baseline);
  changed.segments[1].transition.correspondence = 'radial-emergence-v1';
  const before = createDescriptor(baseline);
  const after = createDescriptor(changed);
  assert.deepEqual(after.correspondences[0], before.correspondences[0]);
  assert.notEqual(after.correspondences[1].inputFingerprint, before.correspondences[1].inputFingerprint);
  assert.notEqual(after.correspondences[2].sourceChainFingerprint, before.correspondences[2].sourceChainFingerprint);
  assert.deepEqual(after.stateReferences, before.stateReferences);
});

test('key moves and neutral hold insertion create no geometry or correspondence work', () => {
  const baseline = createLinearPointField(['state-a', 'state-b']);
  baseline.segments[0].id = 'stable-morph-occurrence';
  const before = createDescriptor(baseline);

  const moved = structuredClone(baseline);
  moved.keys[1].atWU = 2.5;
  assert.equal(createDescriptor(moved).preparationFingerprint, before.preparationFingerprint);

  const held = structuredClone(baseline);
  held.keys.splice(1, 0, { id: 'key-state-a-hold', atWU: 0.5, stateId: 'state-a' });
  held.segments = [
    {
      id: 'neutral-hold-occurrence',
      fromKeyId: held.keys[0].id,
      toKeyId: held.keys[1].id,
      transition: createTransition({
        type: 'hold',
        correspondence: null,
        progress: 1,
      }),
    },
    {
      ...held.segments[0],
      fromKeyId: held.keys[1].id,
      toKeyId: held.keys[2].id,
    },
  ];
  const after = createDescriptor(held);
  assert.equal(after.correspondences.length, 1);
  assert.deepEqual(correspondenceFingerprints(after), correspondenceFingerprints(before));
  assert.equal(after.preparationFingerprint, before.preparationFingerprint);
});

test('step-end and zero-length boundaries skip correspondence and reset the downstream chain', () => {
  const createBoundaryGraph = (transition, targetTime = 1) => {
    const pointField = createLinearPointField(['state-a', 'state-b', 'state-c']);
    pointField.keys[1].atWU = targetTime;
    pointField.keys[2].atWU = 2;
    pointField.segments[0].transition = createTransition(transition);
    return pointField;
  };
  const stepEnd = createDescriptor(createBoundaryGraph({ type: 'step-end' }));
  const zeroLength = createDescriptor(createBoundaryGraph({ type: 'morph' }, 0));
  [stepEnd, zeroLength].forEach((descriptor) => {
    assert.equal(descriptor.correspondences.length, 1);
    assert.equal(descriptor.correspondences[0].occurrenceId, 'segment-state-b-to-state-c');
    assert.equal(
      descriptor.correspondences[0].sourceChainFingerprint,
      geometryFingerprintByState(descriptor).get('state-b'),
    );
  });

  const interpolated = createDescriptor(createBoundaryGraph({ type: 'morph' }));
  assert.equal(interpolated.correspondences.length, 2);
  assert.notEqual(
    interpolated.correspondences[1].sourceChainFingerprint,
    geometryFingerprintByState(interpolated).get('state-b'),
  );
});

test('reused states keep one geometry and stable correspondence occurrence identities', () => {
  const pointField = createLinearPointField(['state-a', 'state-b', 'state-a']);
  pointField.stateDefinitions = pointField.stateDefinitions.slice(0, 2);
  pointField.stateDefinitions[1].shapeParameters.radius = 3;
  pointField.segments[0].id = 'outbound-occurrence';
  pointField.segments[1].id = 'return-occurrence';
  const descriptor = createDescriptor(pointField);
  assert.equal(descriptor.geometries.length, 2);
  assert.deepEqual(
    descriptor.correspondences.map((record) => record.occurrenceId),
    ['outbound-occurrence', 'return-occurrence'],
  );
  assert.equal(
    descriptor.correspondences[0].sourceGeometryFingerprint,
    descriptor.correspondences[1].targetGeometryFingerprint,
  );
});

test('responsive variants invalidate only when their resolved geometry differs', () => {
  const state = createState('state-responsive');
  const pointField = {
    stateDefinitions: [state],
    keys: [{ id: 'key-responsive', atWU: 0, stateId: state.id }],
    segments: [],
  };
  const standard = createDescriptor(pointField);
  const mobile = createDescriptor(pointField, { preparationVariant: 'mobile-default' });
  const landscape = createDescriptor(pointField, {
    preparationVariant: 'mobile-short-landscape',
  });
  assert.equal(mobile.preparationFingerprint, standard.preparationFingerprint);
  assert.equal(landscape.preparationFingerprint, standard.preparationFingerprint);
  assert.notEqual(
    createDescriptor(pointField, { pointProfile: 'mobile' }).preparationFingerprint,
    standard.preparationFingerprint,
  );

  const changed = structuredClone(pointField);
  changed.stateDefinitions[0].transform.mobileYOffset = 0.5;
  const changedMobile = createDescriptor(changed, { preparationVariant: 'mobile-default' });
  assert.notEqual(changedMobile.preparationFingerprint, standard.preparationFingerprint);
  const changedLandscape = structuredClone(changed);
  changedLandscape.stateDefinitions[0].transform.mobileLandscapeXOffset = 0.25;
  assert.notEqual(
    createDescriptor(changedLandscape, {
      preparationVariant: 'mobile-short-landscape',
    }).preparationFingerprint,
    changedMobile.preparationFingerprint,
  );
  assert.deepEqual(
    resolveAboutNarrativePointFieldPreparationTransform(state.transform, 'standard'),
    resolveAboutNarrativePointFieldPreparationTransform(state.transform, 'mobile-default'),
  );
});

test('identical state geometry is deduplicated independent of state-definition order', () => {
  const first = createState('state-a');
  const second = createState('state-b');
  const pointField = {
    stateDefinitions: [second, first],
    keys: [
      { id: 'key-a', atWU: 0, stateId: 'state-a' },
      { id: 'key-b', atWU: 1, stateId: 'state-b' },
    ],
    segments: [{
      id: 'segment-identical',
      fromKeyId: 'key-a',
      toKeyId: 'key-b',
      transition: createTransition(),
    }],
  };
  const descriptor = createDescriptor(pointField);
  assert.equal(descriptor.geometries.length, 1);
  const reordered = structuredClone(pointField);
  reordered.stateDefinitions.reverse();
  assert.equal(createDescriptor(reordered).preparationFingerprint, descriptor.preparationFingerprint);
});

test('geometry hash collisions never silently deduplicate different canonical states', () => {
  const pointField = createLinearPointField(['state-a', 'state-b']);
  assert.throws(
    () => createDescriptor(pointField, { hashIdentity: () => 'forced-collision' }),
    (error) => (
      error.name === 'AboutNarrativePointFieldIdentityCollisionError'
      && error.code === 'point-field-geometry-fingerprint-collision'
      && /state-a.*state-b/.test(error.message)
    ),
  );
});

test('12k-state cumulative identity stays linear, fixed-width, and practical', () => {
  const count = 12_000;
  const stateDefinitions = Array.from({ length: count }, (_, index) => createState(
    `state-${index}`,
    {
      railAnchorWU: index * 0.01,
      shapeParameters: { density: 0.5, radius: 2 + (index * 0.0001) },
    },
  ));
  const keys = stateDefinitions.map((state, index) => ({
    id: `key-${index}`,
    atWU: index * 0.01,
    stateId: state.id,
  }));
  const segments = keys.slice(0, -1).map((key, index) => ({
    id: `segment-${index}`,
    fromKeyId: key.id,
    toKeyId: keys[index + 1].id,
    transition: createTransition(),
  }));
  const startedAt = performance.now();
  const descriptor = createDescriptor({ stateDefinitions, keys, segments });
  const elapsedMs = performance.now() - startedAt;
  assert.equal(descriptor.geometries.length, count);
  assert.equal(descriptor.correspondences.length, count - 1);
  assert.ok(descriptor.preparationFingerprint.length < 64);
  assert.ok(descriptor.finalPointFingerprint.length < 64);
  descriptor.correspondences.forEach((record) => {
    assert.ok(record.sourceChainFingerprint.length < 64);
    assert.ok(record.inputFingerprint.length < 64);
    assert.ok(record.outputFingerprint.length < 64);
  });
  assert.ok(elapsedMs < 1_500, `12k-state identity took ${elapsedMs.toFixed(1)}ms.`);
  console.log(`12k-state identity: ${elapsedMs.toFixed(1)}ms`);
});
