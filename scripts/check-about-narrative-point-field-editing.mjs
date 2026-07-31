import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  deleteAboutNarrativePointFieldState,
  duplicateAboutNarrativePointFieldState,
  getAboutNarrativePointFieldItemLabel,
  getAboutNarrativePointFieldItemRange,
  getAboutNarrativePointFieldSelectionObject,
  getAboutNarrativePointFieldStateUseCount,
  makeAboutNarrativePointFieldKeyStateUnique,
  moveAboutNarrativePointFieldKey,
  moveAboutNarrativePointFieldSegment,
  normalizeAboutNarrativePointFieldSelection,
  remapAboutNarrativePointFieldSelection,
  resetAboutNarrativePointFieldOverride,
  splitAboutNarrativePointFieldSegment,
  writeAboutNarrativePointFieldTarget,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditing.js';
import {
  applyAboutNarrativePointFieldOverrides,
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';

const source = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));

const fixture = () => structuredClone(source);
const pointField = (document, profileId = '') => (profileId
  ? applyAboutNarrativePointFieldOverrides(
    document.tracks.pointField,
    document.profiles[profileId].overrides.pointField,
  )
  : document.tracks.pointField);
const key = (document, id, profileId = '') => pointField(document, profileId).keys
  .find((item) => item.id === id);
const segment = (document, id, profileId = '') => pointField(document, profileId).segments
  .find((item) => item.id === id);

const IDS = Object.freeze({
  initial: 'key-world-promise-initial',
  complexityDeparture: 'key-world-complexity-departure',
  complexityArrival: 'key-world-complexity-arrival',
  gridDeparture: 'key-world-grid-departure',
  gridArrival: 'key-world-grid-arrival',
  emergentDeparture: 'key-world-emergent-departure',
  final: 'key-world-emergent-final',
  complexityTransition: 'segment-key-world-complexity-departure-to-key-world-complexity-arrival',
  complexityHold: 'segment-key-world-complexity-arrival-to-key-world-grid-departure',
});

test('selection helpers resolve keys, segments, states, labels, ranges, and use counts', () => {
  const document = fixture();
  const selected = { type: 'point-field-segment', id: IDS.complexityTransition };
  assert.equal(getAboutNarrativePointFieldSelectionObject(document, selected).id, selected.id);
  assert.deepEqual(getAboutNarrativePointFieldItemRange(document, selected), {
    startWU: 0.7,
    endWU: 2.75,
  });
  assert.equal(getAboutNarrativePointFieldItemLabel(document, selected), 'A → B');
  assert.equal(
    getAboutNarrativePointFieldItemLabel(document, 'point-field-key', IDS.gridArrival),
    'C key',
  );
  assert.deepEqual(getAboutNarrativePointFieldStateUseCount(document, 'world-grid'), {
    keys: 2,
    interactions: 2,
    total: 4,
  });
});

test('selection normalization and remapping use the fixed point-field selection contract', () => {
  const document = fixture();
  assert.deepEqual(
    normalizeAboutNarrativePointFieldSelection(
      { type: 'point-field-key', id: IDS.gridArrival },
      document,
    ),
    { type: 'point-field-key', id: IDS.gridArrival },
  );
  assert.deepEqual(
    remapAboutNarrativePointFieldSelection(
      { type: 'point-field-key', id: 'retired-key' },
      { 'point-field-key': { 'retired-key': IDS.gridArrival } },
      document,
    ),
    { type: 'point-field-key', id: IDS.gridArrival },
  );
  assert.deepEqual(
    normalizeAboutNarrativePointFieldSelection({ type: 'world', id: 'world-grid' }, document),
    { type: 'track', id: 'point-field' },
  );
});

test('base key movement clamps at neighbouring keys and preserves equal-time boundaries', () => {
  const document = fixture();
  const before = structuredClone(document);
  const result = moveAboutNarrativePointFieldKey(document, {
    keyId: IDS.complexityArrival,
    atWU: -20,
  });
  assert.equal(result.valid, true);
  assert.equal(result.clamped, true);
  assert.equal(result.appliedAtWU, 0.7);
  assert.equal(key(result.document, IDS.complexityArrival).atWU, 0.7);
  assert.deepEqual(document, before, 'the input document stays immutable');
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('base key bounds intersect every profile whose key inherits base timing', () => {
  const document = fixture();
  document.profiles.mobile.overrides.pointField.keys[IDS.gridDeparture] = { atWU: 4 };
  assert.equal(validateAboutNarrativePointFieldDocument(document).length, 0);
  const result = moveAboutNarrativePointFieldKey(document, {
    keyId: IDS.complexityArrival,
    atWU: 5,
  });
  assert.equal(result.valid, true);
  assert.equal(result.appliedAtWU, 4);
  assert.equal(key(result.document, IDS.complexityArrival, 'mobile').atWU, 4);
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('protected boundary keys cannot move in base or profile scope', () => {
  const document = fixture();
  assert.equal(moveAboutNarrativePointFieldKey(document, {
    keyId: IDS.initial,
    atWU: 1,
  }).code, 'protected-key');
  assert.equal(moveAboutNarrativePointFieldKey(document, {
    keyId: IDS.final,
    atWU: 18,
    scope: 'mobile',
  }).code, 'protected-key');
});

test('profile key timing writes are ID-addressed, validated, and reset cleanly', () => {
  const document = fixture();
  const moved = moveAboutNarrativePointFieldKey(document, {
    keyId: IDS.gridArrival,
    atWU: 6,
    scope: 'mobile',
  });
  assert.equal(moved.valid, true);
  assert.equal(key(moved.document, IDS.gridArrival).atWU, 5.35);
  assert.equal(key(moved.document, IDS.gridArrival, 'mobile').atWU, 6);
  assert.deepEqual(
    moved.document.profiles.mobile.overrides.pointField.keys[IDS.gridArrival],
    { atWU: 6 },
  );
  const reset = resetAboutNarrativePointFieldOverride(moved.document, {
    profileId: 'mobile',
    type: 'point-field-key',
    id: IDS.gridArrival,
  });
  assert.equal(reset.valid, true);
  assert.equal(key(reset.document, IDS.gridArrival, 'mobile').atWU, 5.35);
  assert.equal(validateAboutNarrativePointFieldDocument(reset.document).length, 0);
});

test('segment movement shifts both boundaries, clamps against holds, and is one atomic result', () => {
  const document = fixture();
  const before = structuredClone(document);
  const result = moveAboutNarrativePointFieldSegment(document, {
    segmentId: IDS.complexityTransition,
    deltaWU: 10,
  });
  assert.equal(result.valid, true);
  assert.equal(result.clamped, true);
  assert.equal(result.appliedDeltaWU, 2.3);
  assert.equal(key(result.document, IDS.complexityDeparture).atWU, 3);
  assert.equal(key(result.document, IDS.complexityArrival).atWU, 5.05);
  assert.deepEqual(result.selection, {
    type: 'point-field-segment',
    id: IDS.complexityTransition,
  });
  assert.deepEqual(document, before);
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('segment movement rejects non-hold neighbours and ambiguous base profile boundaries', () => {
  const document = fixture();
  assert.equal(moveAboutNarrativePointFieldSegment(document, {
    segmentId: IDS.complexityHold,
    deltaWU: 0.1,
  }).code, 'segment-neighbour-motion');

  document.profiles.mobile.overrides.pointField.keys[IDS.complexityArrival] = { atWU: 2 };
  assert.equal(validateAboutNarrativePointFieldDocument(document).length, 0);
  assert.equal(moveAboutNarrativePointFieldSegment(document, {
    segmentId: IDS.complexityTransition,
    deltaWU: 0.1,
  }).code, 'profile-key-override');
});

test('state duplication copies responsive overrides without copying protection', () => {
  const document = fixture();
  document.profiles.mobile.overrides.pointField.stateDefinitions['world-grid'] = {
    transform: { scale: 0.75 },
  };
  const result = duplicateAboutNarrativePointFieldState(document, {
    stateId: 'world-grid',
    id: 'world-grid-variant',
    label: 'C variant',
  });
  assert.equal(result.valid, true);
  const duplicate = result.document.tracks.pointField.stateDefinitions
    .find((state) => state.id === 'world-grid-variant');
  assert.equal(duplicate.label, 'C variant');
  assert.equal(duplicate.protected, undefined);
  assert.deepEqual(
    result.document.profiles.mobile.overrides.pointField.stateDefinitions['world-grid-variant'],
    { transform: { scale: 0.75 } },
  );
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('make unique duplicates one key state and repairs newly state-changing holds', () => {
  const document = fixture();
  const result = makeAboutNarrativePointFieldKeyStateUnique(document, {
    keyId: IDS.gridArrival,
    id: 'world-grid-arrival-variant',
  });
  assert.equal(result.valid, true);
  assert.equal(key(result.document, IDS.gridArrival).stateId, 'world-grid-arrival-variant');
  assert.equal(segment(result.document, IDS.complexityHold).transition.type, 'hold');
  const outgoing = result.document.tracks.pointField.segments
    .find((item) => item.fromKeyId === IDS.gridArrival);
  assert.equal(outgoing.transition.type, 'morph');
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('state deletion guards references and removes an unused state plus overrides atomically', () => {
  const document = fixture();
  assert.equal(deleteAboutNarrativePointFieldState(document, {
    stateId: 'world-grid',
  }).code, 'state-in-use');

  const duplicated = duplicateAboutNarrativePointFieldState(document, {
    stateId: 'world-grid',
    id: 'unused-grid',
  });
  const deleted = deleteAboutNarrativePointFieldState(duplicated.document, {
    stateId: 'unused-grid',
  });
  assert.equal(deleted.valid, true);
  assert.equal(
    deleted.document.tracks.pointField.stateDefinitions.some((state) => state.id === 'unused-grid'),
    false,
  );
  assert.deepEqual(deleted.selection, { type: 'track', id: 'point-field' });
});

test('source split inserts a same-state key and keeps the original ID on the transition half', () => {
  const document = fixture();
  const result = splitAboutNarrativePointFieldSegment(document, {
    segmentId: IDS.complexityTransition,
    atWU: 1.1,
    duplicate: 'source',
  });
  assert.equal(result.valid, true);
  assert.equal(result.document.tracks.pointField.keys.length, 9);
  assert.equal(result.document.tracks.pointField.segments.length, 8);
  const inserted = key(result.document, result.keyId);
  assert.equal(inserted.stateId, 'world-promise');
  const retained = segment(result.document, IDS.complexityTransition);
  assert.equal(retained.fromKeyId, result.keyId);
  assert.equal(retained.transition.type, 'morph');
  assert.equal(segment(result.document, result.createdSegmentId).transition.type, 'hold');
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('destination split clamps across profiles and keeps the original ID on the first half', () => {
  const document = fixture();
  document.profiles.mobile.overrides.pointField.keys[IDS.complexityDeparture] = { atWU: 1 };
  document.profiles.mobile.overrides.pointField.keys[IDS.complexityArrival] = { atWU: 1.5 };
  const result = splitAboutNarrativePointFieldSegment(document, {
    segmentId: IDS.complexityTransition,
    atWU: 0,
    duplicate: 'destination',
  });
  assert.equal(result.valid, true);
  assert.equal(result.appliedAtWU, 1);
  assert.equal(key(result.document, result.keyId).stateId, 'world-complexity');
  assert.equal(segment(result.document, IDS.complexityTransition).toKeyId, result.keyId);
  assert.equal(segment(result.document, result.createdSegmentId).transition.type, 'hold');
  assert.equal(validateAboutNarrativePointFieldDocument(result.document).length, 0);
});

test('generic writes enforce base and profile field ownership', () => {
  const document = fixture();
  assert.equal(writeAboutNarrativePointFieldTarget(document, {
    scope: 'mobile',
    type: 'point-field-state',
    id: 'world-grid',
    patch: { label: 'Not profile-owned' },
  }).code, 'target-patch-scope');
  assert.equal(writeAboutNarrativePointFieldTarget(document, {
    scope: 'mobile',
    type: 'point-field-key',
    id: IDS.gridArrival,
    patch: { stateId: 'world-promise' },
  }).code, 'target-patch-scope');

  const profiled = writeAboutNarrativePointFieldTarget(document, {
    scope: 'mobile',
    type: 'point-field-state',
    id: 'world-grid',
    patch: { transform: { position: [0, -1, 0] } },
  });
  assert.equal(profiled.valid, true);
  assert.deepEqual(
    pointField(profiled.document, 'mobile').stateDefinitions
      .find((state) => state.id === 'world-grid').transform.position,
    [0, -1, 0],
  );
  assert.equal(validateAboutNarrativePointFieldDocument(profiled.document).length, 0);
});

test('every successful edit returns a fully valid base and resolved profile topology', () => {
  const moved = moveAboutNarrativePointFieldKey(fixture(), {
    keyId: IDS.complexityArrival,
    atWU: 2,
    scope: 'tablet',
  });
  assert.equal(moved.valid, true);
  assert.equal(validateAboutNarrativePointFieldDocument(moved.document).length, 0);
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const resolved = pointField(moved.document, profileId);
    assert.equal(resolved.segments.length, resolved.keys.length - 1);
    resolved.segments.forEach((item, index) => {
      assert.equal(item.fromKeyId, resolved.keys[index].id);
      assert.equal(item.toKeyId, resolved.keys[index + 1].id);
      assert.ok(Number(resolved.keys[index].atWU) <= Number(resolved.keys[index + 1].atWU));
    });
  }
});
