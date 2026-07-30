import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  applyAboutNarrativePointFieldOverrides,
  loadAboutNarrativePointFieldSource,
  migrateAboutNarrativeVersion5To6,
  projectAboutNarrativePointFieldDocumentToVersion5,
  sampleAboutNarrativePointField,
  serializeAboutNarrativePointFieldDocument,
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  compileAboutNarrativeRuntimePlan,
  sampleAboutNarrativeRuntimePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import {
  validateAboutNarrativeTrackDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';

const canonicalV6Source = await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
);
const fixtureSource = await readFile(
  new URL('./fixtures/about-narrative/contents-about-v5.json', import.meta.url),
  'utf8',
);
const canonicalV5 = JSON.parse(fixtureSource);
const canonicalV6 = JSON.parse(canonicalV6Source);
const clone = (value) => structuredClone(value);
const EXPECTED_KEY_TIMES = Object.freeze([
  0,
  0.72314,
  1.864941,
  4.1,
  4.505974,
  16.15,
  18.45,
  19.05,
]);

function assertClose(actual, expected, message, tolerance = 0.0000001) {
  assert.ok(
    Math.abs(Number(actual) - Number(expected)) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`,
  );
}

function stateFieldsFromWorld(world) {
  return {
    id: world.id,
    label: world.label,
    adapterId: world.adapterId,
    shapeId: world.shapeId,
    seed: world.seed,
    railAnchorWU: world.anchorWU,
    entryDistanceWU: world.entryDistanceWU,
    transform: world.transform,
    shapeParameters: world.shapeParameters,
    modifiers: world.modifiers,
    ...(world.protected === true ? { protected: true } : {}),
  };
}

function seededSamples(durationWU, count = 400) {
  let seed = 0x6d2b79f5;
  const samples = [...EXPECTED_KEY_TIMES];
  for (let index = 0; index < count; index += 1) {
    seed = ((1664525 * seed) + 1013904223) >>> 0;
    samples.push((seed / 0x100000000) * durationWU);
  }
  return samples;
}

function compareRuntimeSamples(left, right, storyWU) {
  const leftFrame = sampleAboutNarrativeRuntimePlan(left, storyWU);
  const rightFrame = sampleAboutNarrativeRuntimePlan(right, storyWU);
  const visualState = (frame) => {
    if (frame.world.transitionProgress <= 0.0000001) return frame.world.from.id;
    if (frame.world.transitionProgress >= 0.9999999) return frame.world.to.id;
    return null;
  };
  const leftState = visualState(leftFrame);
  const rightState = visualState(rightFrame);
  if (leftState || rightState) {
    assert.equal(rightState, leftState, `settled state at ${storyWU}`);
    return;
  }
  assert.equal(rightFrame.world.from.id, leftFrame.world.from.id, `from state at ${storyWU}`);
  assert.equal(rightFrame.world.to.id, leftFrame.world.to.id, `to state at ${storyWU}`);
  assertClose(rightFrame.world.transitionProgress, leftFrame.world.transitionProgress, `progress at ${storyWU}`);
}

test('the canonical source is native deterministic v6 and the legacy oracle remains v5', () => {
  assert.equal(canonicalV6.schemaVersion, ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION);
  assert.equal(canonicalV5.schemaVersion, 5);
  assert.deepEqual(validateAboutNarrativePointFieldDocument(canonicalV6), []);
  assert.equal(serializeAboutNarrativePointFieldDocument(canonicalV6), canonicalV6Source);
});

test('canonical v5 migrates to four reusable states, eight keys, and seven adjacent segments', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const pointField = migrated.tracks.pointField;
  assert.equal(migrated.schemaVersion, ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION);
  assert.deepEqual(pointField.keys.map((key) => key.atWU), EXPECTED_KEY_TIMES);
  assert.equal(pointField.stateDefinitions.length, 4);
  assert.equal(pointField.keys.length, 8);
  assert.equal(pointField.segments.length, 7);
  assert.equal(pointField.keys[0].protected, true);
  assert.equal(pointField.keys.at(-1).protected, true);
  pointField.segments.forEach((segment, index) => {
    assert.equal(segment.fromKeyId, pointField.keys[index].id);
    assert.equal(segment.toKeyId, pointField.keys[index + 1].id);
    assert.equal(segment.id, `segment-${segment.fromKeyId}-to-${segment.toKeyId}`);
  });
  assert.deepEqual(
    pointField.stateDefinitions.map((state) => state.id).sort(),
    canonicalV5.tracks.worlds.objects.map((world) => world.id).sort(),
  );
  assert.deepEqual(validateAboutNarrativePointFieldDocument(migrated), []);
});

test('state definitions preserve every v5 spatial field without timing ownership', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const expected = canonicalV5.tracks.worlds.objects
    .map(stateFieldsFromWorld)
    .sort((left, right) => left.id.localeCompare(right.id));
  assert.deepEqual(migrated.tracks.pointField.stateDefinitions, expected);
  migrated.tracks.pointField.stateDefinitions.forEach((state) => {
    assert.equal('startWU' in state, false);
    assert.equal('transitionIn' in state, false);
    assert.equal('anchorWU' in state, false);
    assert.equal(Number.isFinite(state.railAnchorWU), true);
  });
});

test('the first v5 self-transition becomes the v6 initial state and projects as a neutral cut', () => {
  const firstV5World = canonicalV5.tracks.worlds.objects[0];
  assert.notEqual(firstV5World.transitionIn.type, 'cut');
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const firstKey = migrated.tracks.pointField.keys[0];
  assert.deepEqual(firstKey, {
    id: `key-${firstV5World.id}-initial`,
    atWU: 0,
    stateId: firstV5World.id,
    protected: true,
  });
  assert.equal(migrated.tracks.pointField.segments.some((segment) => (
    segment.toKeyId === firstKey.id
  )), false);
  const projectedFirst = projectAboutNarrativePointFieldDocumentToVersion5(migrated)
    .tracks.worlds.objects[0];
  assert.deepEqual(projectedFirst.transitionIn, {
    startWU: 0,
    endWU: 0,
    type: 'cut',
    easing: 'linear',
    correspondence: 'index-v1',
  });
});

test('same-state spans are settled holds with no correspondence or hidden motion', () => {
  const pointField = migrateAboutNarrativeVersion5To6(canonicalV5).tracks.pointField;
  const keyById = new Map(pointField.keys.map((key) => [key.id, key]));
  const holdSegments = pointField.segments.filter((segment) => segment.transition.type === 'hold');
  assert.ok(holdSegments.length >= 4);
  holdSegments.forEach((segment) => {
    assert.equal(keyById.get(segment.fromKeyId).stateId, keyById.get(segment.toKeyId).stateId);
    assert.equal(segment.transition.progress, 1);
    assert.equal(segment.transition.correspondence, null);
    assert.deepEqual(segment.transition.stagger, { mode: 'uniform', amount: 0 });
    assert.deepEqual(segment.transition.path, { mode: 'direct', amount: 0 });
    assert.deepEqual(segment.transition.flatten, { mode: 'none', amount: 0 });
  });
  const finalSegment = pointField.segments.at(-1);
  assert.equal(keyById.get(finalSegment.fromKeyId).stateId, 'world-emergent');
  assert.equal(keyById.get(finalSegment.toKeyId).stateId, 'world-emergent');
  assert.equal(finalSegment.transition.progress, 1, 'final bust formation remains latched');
});

test('v6 accepts omitted neutral motion controls and keeps the v5 compatibility projection stable', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const withoutControls = clone(migrated);
  withoutControls.tracks.pointField.segments.forEach((segment) => {
    delete segment.transition.stagger;
    delete segment.transition.path;
    delete segment.transition.flatten;
  });
  assert.deepEqual(validateAboutNarrativePointFieldDocument(withoutControls), []);
  assert.deepEqual(
    projectAboutNarrativePointFieldDocumentToVersion5(withoutControls),
    projectAboutNarrativePointFieldDocumentToVersion5(migrated),
  );
});

test('point-field boundaries are half-open and the final key is inclusive and settled', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const pointField = migrated.tracks.pointField;
  const durationWU = migrated.profiles.desktop.storyDurationWU;
  const transitionStart = sampleAboutNarrativePointField(pointField, 0.72314, durationWU);
  assert.equal(transitionStart.fromStateId, 'world-promise');
  assert.equal(transitionStart.toStateId, 'world-complexity');
  assert.equal(transitionStart.transitionProgress, 0);
  const arrival = sampleAboutNarrativePointField(pointField, 1.864941, durationWU);
  assert.equal(arrival.fromStateId, 'world-complexity');
  assert.equal(arrival.toStateId, 'world-complexity');
  assert.equal(arrival.transitionProgress, 1);
  assert.equal(arrival.settled, true);
  const final = sampleAboutNarrativePointField(pointField, durationWU, durationWU);
  assert.equal(final.stateId, 'world-emergent');
  assert.equal(final.transitionProgress, 1);
  assert.equal(final.settled, true);
});

test('v6 projects to a v5 plan with boundary and randomized visual sampling parity', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const projected = projectAboutNarrativePointFieldDocumentToVersion5(migrated);
  const originalPlan = compileAboutNarrativeRuntimePlan(canonicalV5, { layoutProfile: 'desktop' });
  const projectedPlan = compileAboutNarrativeRuntimePlan(projected, { layoutProfile: 'desktop' });
  assert.equal(originalPlan.valid, true);
  assert.equal(projectedPlan.valid, true);
  seededSamples(originalPlan.durationWU).forEach((storyWU) => {
    compareRuntimeSamples(originalPlan, projectedPlan, storyWU);
  });
});

test('profile migration resolves partial timing and geometry overrides before three-scope diffing', () => {
  const source = clone(canonicalV5);
  source.profiles.mobile.overrides.worlds['world-complexity'] = {
    anchorWU: 1.25,
    transform: {
      position: [1, 2, 3],
    },
    transitionIn: {
      startWU: 0.9,
      endWU: 2,
    },
  };
  assert.equal(validateAboutNarrativeTrackDocument(source).some((item) => item.level === 'error'), false);
  const migrated = migrateAboutNarrativeVersion5To6(source);
  const overrides = migrated.profiles.mobile.overrides.pointField;
  assert.deepEqual(
    Object.keys(overrides).sort(),
    ['keys', 'segments', 'stateDefinitions'],
  );
  assert.equal(overrides.stateDefinitions['world-complexity'].railAnchorWU, 1.25);
  assert.deepEqual(overrides.stateDefinitions['world-complexity'].transform.position, [1, 2, 3]);
  assert.equal(overrides.keys['key-world-complexity-departure'].atWU, 0.9);
  assert.equal(overrides.keys['key-world-complexity-arrival'].atWU, 2);
  assert.deepEqual(overrides.segments, {}, 'unchanged transition shape stays out of the segment override scope');

  const resolved = applyAboutNarrativePointFieldOverrides(migrated.tracks.pointField, overrides);
  assert.deepEqual(resolved.keys.slice(0, 3).map((key) => key.atWU), [0, 0.9, 2]);
  const projected = projectAboutNarrativePointFieldDocumentToVersion5(migrated);
  assert.deepEqual(projected.profiles.mobile.overrides.worlds['world-complexity'], {
    anchorWU: 1.25,
    startWU: 0.9,
    transform: { position: [1, 2, 3] },
    transitionIn: { endWU: 2, startWU: 0.9 },
  });
  const originalPlan = compileAboutNarrativeRuntimePlan(source, { layoutProfile: 'mobile' });
  const projectedPlan = compileAboutNarrativeRuntimePlan(projected, { layoutProfile: 'mobile' });
  assert.equal(originalPlan.valid, true);
  assert.equal(projectedPlan.valid, true);
  seededSamples(originalPlan.durationWU, 100).forEach((storyWU) => {
    compareRuntimeSamples(originalPlan, projectedPlan, storyWU);
  });
});

test('profile timing collapse preserves the base point-field IDs and validates cleanly', () => {
  const source = clone(canonicalV5);
  source.profiles.mobile.overrides.worlds['world-grid'] = {
    startWU: 1.864941,
    transitionIn: {
      startWU: 1.864941,
      endWU: 2.2,
    },
  };
  assert.equal(validateAboutNarrativeTrackDocument(source).some((item) => item.level === 'error'), false);
  const migrated = migrateAboutNarrativeVersion5To6(source);
  const baseKeyIds = new Set(migrated.tracks.pointField.keys.map((key) => key.id));
  const baseSegmentIds = new Set(migrated.tracks.pointField.segments.map((segment) => segment.id));
  const overrides = migrated.profiles.mobile.overrides.pointField;
  assert.deepEqual(Object.keys(overrides.keys).sort(), [
    'key-world-grid-arrival',
    'key-world-grid-departure',
  ]);
  Object.keys(overrides.keys).forEach((id) => assert.equal(baseKeyIds.has(id), true));
  Object.keys(overrides.segments).forEach((id) => assert.equal(baseSegmentIds.has(id), true));
  assert.equal(overrides.keys['key-world-grid-departure'].atWU, 1.864941);
  assert.equal(overrides.keys['key-world-grid-arrival'].atWU, 2.2);
  assert.deepEqual(validateAboutNarrativePointFieldDocument(migrated), []);
  const resolved = applyAboutNarrativePointFieldOverrides(
    migrated.tracks.pointField,
    overrides,
  );
  assert.equal(resolved.keys.find((key) => key.id === 'key-world-grid-departure').atWU, 1.864941);
});

test('a noncanonical World start before transition start maps motion to departure and arrival keys', () => {
  const source = clone(canonicalV5);
  const world = source.tracks.worlds.objects[1];
  world.startWU = 0.7;
  world.transitionIn.startWU = 0.9;
  world.transitionIn.endWU = 2;
  assert.equal(validateAboutNarrativeTrackDocument(source).some((item) => item.level === 'error'), false);
  const migrated = migrateAboutNarrativeVersion5To6(source);
  const departure = migrated.tracks.pointField.keys.find((key) => (
    key.id === 'key-world-complexity-departure'
  ));
  const arrival = migrated.tracks.pointField.keys.find((key) => (
    key.id === 'key-world-complexity-arrival'
  ));
  assert.equal(departure.atWU, 0.9);
  assert.equal(arrival.atWU, 2);
  assert.equal(migrated.tracks.pointField.keys.some((key) => key.atWU === 0.7), false);
  const projected = projectAboutNarrativePointFieldDocumentToVersion5(migrated);
  const originalPlan = compileAboutNarrativeRuntimePlan(source, { layoutProfile: 'desktop' });
  const projectedPlan = compileAboutNarrativeRuntimePlan(projected, { layoutProfile: 'desktop' });
  for (const storyWU of [0.699999, 0.7, 0.8, 0.899999, 0.9, 1.45, 2]) {
    compareRuntimeSamples(originalPlan, projectedPlan, storyWU);
  }
});

test('interaction targets migrate by stable state ID and may begin during an incoming segment', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  migrated.tracks.interactions.clips.forEach((clip, index) => {
    assert.equal(clip.targetStateId, canonicalV5.tracks.interactions.clips[index].targetWorldId);
    assert.equal('targetWorldId' in clip, false);
  });
  const emergent = migrated.tracks.interactions.clips.find((clip) => (
    clip.id === 'interaction-emergent-ripple'
  ));
  assert.equal(emergent.targetStateId, 'world-emergent');
  assert.equal(emergent.startWU, 16.15);
  const incoming = sampleAboutNarrativePointField(
    migrated.tracks.pointField,
    emergent.startWU,
    migrated.profiles.desktop.storyDurationWU,
  );
  assert.equal(incoming.toStateId, emergent.targetStateId);
  assert.equal(incoming.transitionProgress, 0);
});

test('segment IDs remain unique occurrence identities even when states repeat', () => {
  const migrated = migrateAboutNarrativeVersion5To6(canonicalV5);
  const ids = migrated.tracks.pointField.segments.map((segment) => segment.id);
  assert.equal(new Set(ids).size, ids.length);
  migrated.tracks.pointField.segments.forEach((segment) => {
    assert.match(segment.id, new RegExp(`${segment.fromKeyId}-to-${segment.toKeyId}$`));
  });
});

test('v6 migration rejects a first-world crossfade with one explicit diagnostic', () => {
  const v5Crossfade = clone(canonicalV5);
  v5Crossfade.tracks.worlds.objects[0].transitionIn.type = 'crossfade';
  assert.equal(validateAboutNarrativeTrackDocument(v5Crossfade).some((item) => item.level === 'error'), false);
  assert.throws(
    () => migrateAboutNarrativeVersion5To6(v5Crossfade),
    (error) => error.name === 'AboutNarrativePointFieldMigrationError'
      && error.diagnostics.length === 1
      && error.diagnostics[0].code === 'transition-crossfade-unsupported'
      && error.diagnostics[0].path === 'tracks.worlds.objects.0.transitionIn.type',
  );
});

test('v6 validation rejects crossfade transitions', () => {
  const v6Crossfade = migrateAboutNarrativeVersion5To6(canonicalV5);
  v6Crossfade.tracks.pointField.segments.find((segment) => (
    segment.transition.type === 'morph'
  )).transition.type = 'crossfade';
  assert.ok(validateAboutNarrativePointFieldDocument(v6Crossfade).some((item) => (
    item.code === 'transition-crossfade-unsupported'
  )));
});

test('same-state segments reject morphs, step-end cuts, and non-neutral hold motion', () => {
  for (const type of ['morph', 'dissolve-morph', 'step-end']) {
    const candidate = migrateAboutNarrativeVersion5To6(canonicalV5);
    const hold = candidate.tracks.pointField.segments.find((segment) => (
      segment.transition.type === 'hold'
    ));
    hold.transition.type = type;
    assert.ok(validateAboutNarrativePointFieldDocument(candidate).some((item) => (
      item.code === 'same-state-transition'
    )), `${type} must fail same-state validation`);
  }

  const movingHold = migrateAboutNarrativeVersion5To6(canonicalV5);
  movingHold.tracks.pointField.segments.find((segment) => (
    segment.transition.type === 'hold'
  )).transition.path = { mode: 'arc', amount: 0.2 };
  assert.ok(validateAboutNarrativePointFieldDocument(movingHold).some((item) => (
    item.code === 'hold-motion'
  )));
});

test('non-contiguous reusable-state recurrence fails closed with a precise diagnostic', () => {
  const recurrent = migrateAboutNarrativeVersion5To6(canonicalV5);
  recurrent.tracks.pointField.keys.find((key) => (
    key.id === 'key-world-grid-arrival'
  )).stateId = 'world-promise';
  recurrent.tracks.pointField.keys.find((key) => (
    key.id === 'key-world-emergent-departure'
  )).stateId = 'world-promise';
  assert.ok(validateAboutNarrativePointFieldDocument(recurrent).some((item) => (
    item.code === 'state-recurrence-unsupported'
      && item.path === 'tracks.pointField.keys'
  )));
  assert.throws(
    () => projectAboutNarrativePointFieldDocumentToVersion5(recurrent),
    (error) => error.name === 'AboutNarrativePointFieldProjectionError'
      && error.diagnostics.length === 1
      && error.diagnostics[0].code === 'state-recurrence-unsupported'
      && error.diagnostics[0].path === 'tracks.pointField.keys',
  );
});

test('a final morph remains active until the exact final key time', () => {
  const source = clone(canonicalV5);
  const durationWU = source.profiles.desktop.storyDurationWU;
  source.tracks.worlds.objects.at(-1).transitionIn.endWU = durationWU;
  const migrated = migrateAboutNarrativeVersion5To6(source);
  const beforeFinal = sampleAboutNarrativePointField(
    migrated.tracks.pointField,
    durationWU - 0.0000005,
    durationWU,
  );
  assert.notEqual(beforeFinal.segmentId, null);
  assert.equal(beforeFinal.settled, false);
  assert.ok(beforeFinal.transitionProgress < 1);
  const final = sampleAboutNarrativePointField(
    migrated.tracks.pointField,
    durationWU,
    durationWU,
  );
  assert.equal(final.segmentId, null);
  assert.equal(final.settled, true);
  assert.equal(final.stateId, source.tracks.worlds.objects.at(-1).id);
});

test('migration and serialization are deterministic and never mutate v5 input', () => {
  const source = clone(canonicalV5);
  const before = JSON.stringify(source);
  const first = migrateAboutNarrativeVersion5To6(source);
  const second = migrateAboutNarrativeVersion5To6(source);
  assert.deepEqual(second, first);
  assert.equal(JSON.stringify(source), before);
  const serialized = serializeAboutNarrativePointFieldDocument(first);
  const repeated = serializeAboutNarrativePointFieldDocument(JSON.parse(serialized));
  assert.equal(repeated, serialized);
});

test('future and invalid v6 sources fail closed with their exact source preserved', () => {
  const futureSource = '{"schemaVersion":7,"futurePointField":true}\n';
  const future = loadAboutNarrativePointFieldSource(futureSource);
  assert.equal(future.status, 'future');
  assert.equal(future.readOnly, true);
  assert.equal(future.original, futureSource);

  const invalidSource = migrateAboutNarrativeVersion5To6(canonicalV5);
  invalidSource.tracks.pointField.segments[0].transition.progress = 0;
  const before = JSON.stringify(invalidSource);
  const invalid = loadAboutNarrativePointFieldSource(invalidSource);
  assert.equal(invalid.status, 'invalid');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.document, null);
  assert.equal(JSON.stringify(invalid.original), before);
  assert.ok(invalid.diagnostics.some((item) => item.code === 'hold-progress'));
});
