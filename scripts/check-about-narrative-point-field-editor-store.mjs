import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

import {
  createAboutNarrativePointFieldEditorStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditorStore.js';
import {
  getAboutNarrativeComposerCameraSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import {
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';

const canonicalV7 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const createStore = (options = {}) => createAboutNarrativePointFieldEditorStore(
  structuredClone(canonicalV7),
  options,
);
const bytes = (value) => JSON.stringify(value);
const editableKey = (document) => document.tracks.pointField.keys.find((key) => !key.protected);
const morphSegment = (document) => document.tracks.pointField.segments.find((segment) => (
  segment.transition.type === 'morph'
));

test('canonical v7 camera data omits obsolete locks and no-op responsive overrides', () => {
  const baseKeys = new Map(['moveKeys', 'lookKeys', 'lensKeys'].flatMap((lane) => (
    canonicalV7.tracks.camera[lane].map((key) => [key.id, key])
  )));
  for (const lane of ['moveKeys', 'lookKeys', 'lensKeys']) {
    assert.equal(canonicalV7.tracks.camera[lane].some((key) => 'locked' in key), false);
  }
  for (const profile of Object.values(canonicalV7.profiles)) {
    for (const [id, override] of Object.entries(profile.overrides?.camera || {})) {
      for (const [property, value] of Object.entries(override)) {
        assert.notDeepEqual(value, baseKeys.get(id)?.[property], `${id}.${property} must change the base value`);
      }
    }
  }
});

test('v7 store owns input and publishes a renderer-compatible snapshot', () => {
  const input = structuredClone(canonicalV7);
  const store = createAboutNarrativePointFieldEditorStore(input);
  let publications = 0;
  const unsubscribe = store.subscribe(() => { publications += 1; });
  input.tracks.pointField.keys[1].atWU = 99;
  assert.notEqual(store.getSnapshot().document.tracks.pointField.keys[1].atWU, 99);
  assert.equal(store.getSnapshot().compiledPlan.valid, true);
  assert.equal(store.getSnapshot().compiledPlan.sourceSchemaVersion, 7);
  assert.equal(store.getSnapshot().compiledPlan, store.getSnapshot().lastValidPlan);
  assert.deepEqual(store.getSnapshot().selection, { type: 'track', id: 'point-field' });
  store.pointField.select('point-field-key', editableKey(store.getSnapshot().document).id);
  assert.equal(store.getSnapshot().selection.type, 'point-field-key');
  assert.equal(publications, 1);
  unsubscribe();
});

test('point-field commands are atomic across history, selection, undo, and redo', () => {
  const store = createStore();
  const segment = morphSegment(store.getSnapshot().document);
  const original = structuredClone(segment.transition);
  assert.equal(store.pointField.patchSegment({
    id: segment.id,
    patch: { transition: { ...segment.transition, easing: 'ease-in-out' } },
  }), true);
  assert.equal(store.getSnapshot().selection.id, segment.id);
  assert.equal(store.getSnapshot().history.undoLabel, 'Edit point-field segment');
  assert.equal(store.getSnapshot().document.tracks.pointField.segments
    .find((item) => item.id === segment.id).transition.easing, 'ease-in-out');
  assert.equal(store.undo(), true);
  assert.deepEqual(store.getSnapshot().document.tracks.pointField.segments
    .find((item) => item.id === segment.id).transition, original);
  assert.equal(store.redo(), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.segments
    .find((item) => item.id === segment.id).transition.easing, 'ease-in-out');
});

test('Camera boundary keys support move, duplicate, delete, and undo', () => {
  const store = createStore();
  const cameraId = store.getSnapshot().document.tracks.camera.moveKeys[0].id;
  store.setSelection({ type: 'camera-key', id: cameraId });

  assert.equal(store.moveSelection(0.25, { snap: false }), true);
  assert.equal(store.getSnapshot().document.tracks.camera.moveKeys
    .find((key) => key.id === cameraId).atWU, 0.25);
  assert.equal(store.undo(), true);

  assert.equal(store.duplicateSelection({ offsetWU: 0.1 }), true);
  const duplicateId = store.getSnapshot().selection.id;
  assert.notEqual(duplicateId, cameraId);
  assert.equal('locked' in store.getSnapshot().document.tracks.camera.moveKeys
    .find((key) => key.id === duplicateId), false);
  assert.equal(store.undo(), true);

  store.setSelection({ type: 'camera-key', id: cameraId });
  assert.equal(store.deleteSelection(), true);
  assert.equal(store.getSnapshot().document.tracks.camera.moveKeys
    .some((key) => key.id === cameraId), false);
  assert.deepEqual(validateAboutNarrativePointFieldDocument(store.getSnapshot().document), []);
  assert.equal(store.undo(), true);
  assert.equal(store.getSnapshot().document.tracks.camera.moveKeys
    .some((key) => key.id === cameraId), true);

  for (const [lane, type] of [
    ['lookKeys', 'camera-orientation-key'],
    ['lensKeys', 'camera-lens-key'],
  ]) {
    const id = store.getSnapshot().document.tracks.camera[lane][0].id;
    store.setSelection({ type, id });
    assert.equal(store.deleteSelection(), true, `${lane} boundary delete`);
    assert.equal(store.getSnapshot().document.tracks.camera[lane]
      .some((key) => key.id === id), false);
    assert.deepEqual(validateAboutNarrativePointFieldDocument(store.getSnapshot().document), []);
    assert.equal(store.undo(), true);
  }
});

test('Camera deletion previews and saves the new path despite choreography guidance', () => {
  const store = createStore({ baselineHash: 'camera-delete-base' });
  const cameraId = 'move-discipline-travel-start';
  const approvedPlan = store.getSnapshot().lastValidPlan;
  store.setSelection({ type: 'camera-key', id: cameraId });

  assert.equal(store.deleteSelection(), true);
  assert.equal(store.getSnapshot().document.tracks.camera.moveKeys
    .some((key) => key.id === cameraId), false);
  assert.equal(store.getSnapshot().dirty, true);
  assert.notEqual(store.getSnapshot().lastValidPlan, approvedPlan);
  assert.equal(store.getSnapshot().compiledPlan, store.getSnapshot().lastValidPlan);
  assert.equal(store.getSnapshot().compiledPlan.model.tracks.camera.moveKeys
    .some((key) => key.id === cameraId), false);
  const beforeDeletedTime = getAboutNarrativeComposerCameraSample(
    store.getSnapshot().compiledPlan,
    7.69,
  );
  const atDeletedTime = getAboutNarrativeComposerCameraSample(
    store.getSnapshot().compiledPlan,
    7.7,
  );
  const afterDeletedTime = getAboutNarrativeComposerCameraSample(
    store.getSnapshot().compiledPlan,
    7.71,
  );
  assert.notDeepEqual(beforeDeletedTime.position, atDeletedTime.position);
  assert.notDeepEqual(atDeletedTime.position, afterDeletedTime.position);
  assert.equal(store.getSnapshot().previewDocumentState.status, 'valid-draft');
  assert.equal(store.getSaveEligibility().code, 'ready');
  assert.match(
    store.getSnapshot().diagnostics.find((item) => item.level === 'warning')?.message || '',
    /viewfinder band/i,
  );

  assert.equal(store.undo(), true);
  assert.equal(store.getSnapshot().document.tracks.camera.moveKeys
    .some((key) => key.id === cameraId), true);
  assert.equal(store.getSnapshot().previewDocumentState.status, 'saved');
  assert.equal(store.getSnapshot().diagnostics.some((item) => item.level === 'error'), false);
});

test('Move, Look, and Lens lanes can each be reduced to one key despite legacy locks', () => {
  const lockedDocument = structuredClone(canonicalV7);
  ['moveKeys', 'lookKeys', 'lensKeys'].forEach((lane) => {
    lockedDocument.tracks.camera[lane].forEach((key) => { key.locked = true; });
  });
  const store = createAboutNarrativePointFieldEditorStore(lockedDocument, {
    baselineHash: 'camera-reduction-base',
  });

  ['moveKeys', 'lookKeys', 'lensKeys'].forEach((lane) => {
    assert.equal(store.getSnapshot().document.tracks.camera[lane]
      .some((key) => 'locked' in key), false, `${lane} should discard legacy locks`);
  });

  const linkedAtWU = 5.122;
  const linkedSelection = { type: 'camera-key', id: 'move-complexity-exit' };
  assert.equal(store.beginGesture('Move linked Camera beat', {
    selection: linkedSelection,
    operation: { type: 'linked-camera', atWU: linkedAtWU },
  }), true);
  assert.equal(store.updateGestureMove(0.01), true);
  assert.equal(store.commitGesture(), true);
  for (const lane of ['moveKeys', 'lookKeys', 'lensKeys']) {
    assert.equal(store.getSnapshot().document.tracks.camera[lane]
      .some((key) => key.atWU === 5.132), true, `${lane} linked key should move`);
  }
  assert.equal(store.undo(), true);

  for (const [lane, type] of [
    ['moveKeys', 'camera-key'],
    ['lookKeys', 'camera-orientation-key'],
    ['lensKeys', 'camera-lens-key'],
  ]) {
    const ids = store.getSnapshot().document.tracks.camera[lane].map((key) => key.id);
    for (const id of ids.slice(1)) {
      store.setSelection({ type, id });
      assert.equal(store.deleteSelection(), true, `${lane} should delete ${id}`);
    }
    assert.equal(store.getSnapshot().document.tracks.camera[lane].length, 1);
    assert.equal(store.getSnapshot().document.tracks.camera[lane][0].id, ids[0]);

    store.setSelection({ type, id: ids[0] });
    assert.equal(store.deleteSelection(), false, `${lane} must retain one defining key`);
    assert.match(store.getSnapshot().rejectedEdit.reason, /at least one key/i);
  }
});

test('invalid gesture previews retain the last-known-good plan and cancel exactly', () => {
  const store = createStore();
  const before = bytes(store.getSnapshot().document);
  const approvedPlan = store.getSnapshot().lastValidPlan;
  assert.equal(store.beginGesture('Invalid key target'), true);
  assert.equal(store.updateGesture((draft) => {
    editableKey(draft).stateId = 'missing-state';
  }), false);
  assert.equal(store.getSnapshot().compiledPlan, approvedPlan);
  assert.equal(store.getSnapshot().lastValidPlan, approvedPlan);
  assert.equal(store.getSnapshot().previewDocumentState.status, 'last-valid-fallback');
  assert.equal(store.getSnapshot().draftState.valid, false);
  assert.equal(store.getSnapshot().gestureState.valid, false);
  assert.equal(store.commitGesture({ requireValid: true }), false);
  assert.equal(store.cancelGesture(), true);
  assert.equal(bytes(store.getSnapshot().document), before);
});

test('responsive state, key, and segment overrides stay profile-scoped and resettable', () => {
  const store = createStore();
  const state = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => item.id === 'world-grid');
  const baseY = state.transform.position[1];
  assert.equal(store.pointField.patchState({
    id: state.id,
    scope: 'mobile',
    patch: { transform: { mobileYOffset: 0.75 } },
  }), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => item.id === state.id).transform.position[1], baseY);
  assert.equal(
    store.getSnapshot().document.profiles.mobile.overrides.pointField
      .stateDefinitions[state.id].transform.mobileYOffset,
    0.75,
  );
  assert.equal(store.pointField.resetOverride({
    profileId: 'mobile',
    type: 'point-field-state',
    id: state.id,
  }), true);
  assert.equal(
    store.getSnapshot().document.profiles.mobile.overrides.pointField
      .stateDefinitions[state.id],
    undefined,
  );
});

test('key movement gestures preview repeatedly and commit one history command', () => {
  const store = createStore();
  const key = editableKey(store.getSnapshot().document);
  const originalWU = key.atWU;
  const compilationStart = store.getMetrics().compilations;
  assert.equal(store.pointField.beginMoveKey({ keyId: key.id }), true);
  assert.equal(store.pointField.updateMoveKey(originalWU + 0.01), true);
  assert.equal(store.pointField.updateMoveKey(originalWU + 0.02), true);
  assert.equal(store.getSnapshot().revision, 0);
  assert.equal(store.pointField.commitGesture({ requireValid: true }), true);
  assert.equal(store.getSnapshot().revision, 1);
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(store.getSnapshot().saveState.status, 'idle');
  assert.equal(store.getMetrics().gestureUpdates, 2);
  assert.equal(store.getMetrics().compilations - compilationStart, 1);
  assert.equal(store.undo(), true);
  assert.equal(editableKey(store.getSnapshot().document).atWU, originalWU);
  assert.equal(store.getSnapshot().history.canUndo, false);
  assert.equal(store.getSnapshot().dirty, false);
  assert.equal(store.getSnapshot().saveState.status, 'saved');
});

test('segment movement gestures keep responsive timing scoped and atomic', () => {
  const store = createStore();
  const before = bytes(store.getSnapshot().document);
  const segment = morphSegment(store.getSnapshot().document);
  const fromKey = store.getSnapshot().document.tracks.pointField.keys
    .find((item) => item.id === segment.fromKeyId);
  const baseFromWU = fromKey.atWU;
  const compilationStart = store.getMetrics().compilations;
  assert.equal(store.pointField.beginMoveSegment({
    segmentId: segment.id,
    scope: 'mobile',
  }), true);
  assert.equal(store.pointField.updateMoveSegment(0.01), true);
  assert.equal(store.pointField.updateMoveSegment(0.02), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.keys
    .find((item) => item.id === segment.fromKeyId).atWU, baseFromWU);
  assert.equal(store.getMetrics().compilations - compilationStart, 0);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  assert.equal(store.getMetrics().compilations - compilationStart, 1);
  assert.equal(store.getSnapshot().history.undoLabel, 'Move point-field segment');
  assert.equal(store.undo(), true);
  assert.equal(bytes(store.getSnapshot().document), before);
});

test('segment motion patch gestures preview live and commit one validated command', () => {
  const store = createStore();
  const before = bytes(store.getSnapshot().document);
  const segment = morphSegment(store.getSnapshot().document);
  const compilationStart = store.getMetrics().compilations;
  assert.equal(store.pointField.beginPatch({
    type: 'point-field-segment',
    id: segment.id,
    scope: 'base',
    label: 'Shape organic path',
  }), true);
  assert.equal(store.pointField.updatePatch({
    transition: { path: { mode: 'arc', amount: 0.2 } },
  }), true);
  assert.equal(store.pointField.updatePatch({
    transition: { path: { mode: 'arc', amount: 0.35 } },
  }), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.segments
    .find((item) => item.id === segment.id).transition.path.amount, 0.35);
  assert.equal(store.getMetrics().compilations - compilationStart, 0);
  assert.equal(store.getSnapshot().revision, 0);
  assert.equal(store.pointField.updatePatch({
    transition: { path: { mode: 'arc', amount: 2 } },
  }), false);
  assert.equal(store.getSnapshot().gestureState.valid, false);
  assert.equal(store.pointField.updatePatch({
    transition: { path: { mode: 'arc', amount: 0.4 } },
  }), true);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  assert.equal(store.getMetrics().compilations - compilationStart, 1);
  assert.equal(store.getSnapshot().history.undoLabel, 'Shape organic path');
  assert.equal(store.undo(), true);
  assert.equal(bytes(store.getSnapshot().document), before);
});

test('state transform and shape patch previews cancel back to exact source bytes', () => {
  const store = createStore();
  const before = bytes(store.getSnapshot().document);
  const state = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => item.id === 'world-complexity');
  assert.equal(store.pointField.beginPatch({
    type: 'point-field-state',
    id: state.id,
    scope: 'base',
    label: 'Shape state geometry',
  }), true);
  assert.equal(store.pointField.updatePatch({
    transform: { position: [0.25, state.transform.position[1], state.transform.position[2]] },
    shapeParameters: { width: 11 },
  }), true);
  const preview = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => item.id === state.id);
  assert.equal(preview.transform.position[0], 0.25);
  assert.equal(preview.shapeParameters.width, 11);
  assert.equal(store.pointField.cancelGesture(), true);
  assert.equal(bytes(store.getSnapshot().document), before);

  assert.equal(store.pointField.beginPatch({
    type: 'point-field-state',
    id: state.id,
    scope: 'watch',
  }), false);
  assert.equal(store.pointField.beginPatch({
    type: 'point-field-state',
    id: state.id,
  }), true);
  assert.equal(store.pointField.updatePatch({ unknown: 1 }), false);
  assert.equal(store.cancelGesture(), true);
});

test('a selected Forms key edits its shared form until Make unique isolates it', () => {
  const store = createStore();
  const sourceKey = store.getSnapshot().document.tracks.pointField.keys
    .find((key) => key.id === 'key-world-complexity-arrival');
  const sharedStateId = sourceKey.stateId;
  const sharedKeyIds = store.getSnapshot().document.tracks.pointField.keys
    .filter((key) => key.stateId === sharedStateId)
    .map((key) => key.id);
  const sharedState = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((state) => state.id === sharedStateId);
  const sharedDensity = sharedState.shapeParameters.density + 0.01;

  store.pointField.select('point-field-key', sourceKey.id);
  assert.deepEqual(store.getSnapshot().selection, { type: 'point-field-key', id: sourceKey.id });
  assert.equal(store.pointField.patchState({
    id: sharedStateId,
    scope: 'base',
    patch: { shapeParameters: { ...sharedState.shapeParameters, density: sharedDensity } },
  }), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((state) => state.id === sharedStateId).shapeParameters.density, sharedDensity);
  assert.deepEqual(store.getSnapshot().document.tracks.pointField.keys
    .filter((key) => sharedKeyIds.includes(key.id))
    .map((key) => key.stateId), [sharedStateId, sharedStateId]);

  assert.equal(store.pointField.makeKeyStateUnique({ keyId: sourceKey.id }), true);
  const uniqueKey = store.getSnapshot().document.tracks.pointField.keys
    .find((key) => key.id === sourceKey.id);
  assert.notEqual(uniqueKey.stateId, sharedStateId);
  const uniqueState = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((state) => state.id === uniqueKey.stateId);
  assert.equal(store.pointField.patchState({
    id: uniqueState.id,
    scope: 'base',
    patch: { shapeParameters: { ...uniqueState.shapeParameters, density: sharedDensity + 0.01 } },
  }), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((state) => state.id === sharedStateId).shapeParameters.density, sharedDensity);
});

test('state topology actions use guarded reusable-state operations', () => {
  const store = createStore();
  const source = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((state) => !state.protected);
  assert.equal(store.pointField.duplicateState({ stateId: source.id }), true);
  const duplicateId = store.getSnapshot().selection.id;
  assert.notEqual(duplicateId, source.id);
  assert.equal(store.pointField.deleteState({ stateId: duplicateId }), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.stateDefinitions
    .some((state) => state.id === duplicateId), false);

  const key = store.getSnapshot().document.tracks.pointField.keys
    .find((item) => item.id === 'key-world-complexity-arrival');
  const previousStateId = key.stateId;
  assert.equal(store.pointField.makeKeyStateUnique({ keyId: key.id }), true);
  const uniqueStateId = editableKey(store.getSnapshot().document).stateId;
  assert.notEqual(uniqueStateId, previousStateId);
  assert.equal(store.pointField.deleteState({ stateId: uniqueStateId }), false);
  assert.match(store.getSnapshot().rejectedEdit.reason, /still used/i);

  const segment = morphSegment(store.getSnapshot().document);
  const fromKey = store.getSnapshot().document.tracks.pointField.keys
    .find((item) => item.id === segment.fromKeyId);
  const toKey = store.getSnapshot().document.tracks.pointField.keys
    .find((item) => item.id === segment.toKeyId);
  assert.equal(store.pointField.splitSegment({
    segmentId: segment.id,
    atWU: fromKey.atWU + ((toKey.atWU - fromKey.atWU) * 0.5),
  }), true);
  assert.equal(validateAboutNarrativePointFieldDocument(store.getSnapshot().document).length, 0);
});

test('non-point Text and interaction edits remain native v7 operations', () => {
  const store = createStore();
  const title = store.getSnapshot().document.tracks.text.fields.find((field) => (
    field.kind === 'title' && !field.protected
  ));
  store.setSelection({ type: 'text-field', id: title.id });
  const originalStart = title.startWU;
  assert.equal(store.moveSelection(0.01, { snap: false }), true);
  assert.equal(store.getSnapshot().document.tracks.text.fields
    .find((field) => field.id === title.id).startWU, originalStart + 0.01);
  assert.equal(store.getSnapshot().document.schemaVersion, 7);
  assert.equal(store.getSnapshot().compiledPlan.valid, true);

  assert.equal(store.createObject({ track: 'camera', atWU: 2.123 }), true);
  assert.equal(store.getSnapshot().selection.type, 'camera-key');
  assert.equal(store.createObject({ track: 'visibility', atWU: 2.234 }), true);
  assert.equal(store.getSnapshot().selection.type, 'visibility-key');
  assert.equal(store.createObject({
    track: 'interaction',
    atWU: 6,
    targetStateId: 'world-grid',
  }), true);
  const createdInteraction = store.getSnapshot().document.tracks.interactions.clips
    .find((clip) => clip.id === store.getSnapshot().selection.id);
  assert.equal(createdInteraction.targetStateId, 'world-grid');
  assert.equal('targetWorldId' in createdInteraction, false);

  const interaction = store.getSnapshot().document.tracks.interactions.clips
    .find((clip) => clip.type === 'grid-ripple');
  assert.equal(typeof interaction.targetStateId, 'string');
  store.setSelection({ type: 'interaction', id: interaction.id });
  assert.equal(store.beginGesture('Resize v7 interaction'), true);
  assert.equal(store.updateGestureResizeInteraction(
    interaction.id,
    'end',
    interaction.endWU - 0.01,
  ), true);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  const resized = store.getSnapshot().document.tracks.interactions.clips
    .find((clip) => clip.id === interaction.id);
  assert.equal(resized.targetStateId, interaction.targetStateId);
  assert.equal('targetWorldId' in resized, false);

  const emergent = store.getSnapshot().document.tracks.interactions.clips
    .find((clip) => clip.id === 'interaction-emergent-ripple');
  const extendedStartWU = Number((emergent.startWU + 0.23).toFixed(3));
  store.setSelection({ type: 'interaction', id: emergent.id });
  assert.equal(store.beginGesture('Extend v7 interaction preparation'), true);
  assert.equal(store.updateGestureResizeInteraction(emergent.id, 'start', extendedStartWU), true);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  assert.equal(store.getSnapshot().document.tracks.interactions.clips
    .find((clip) => clip.id === emergent.id).startWU, extendedStartWU);
});

test('save reconciliation preserves edits made after a v7 submission', () => {
  const store = createStore({ baselineHash: 'base-v7' });
  const submission = store.createSaveSubmission();
  const state = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => !item.protected);
  assert.equal(store.pointField.patchState({
    id: state.id,
    patch: { label: `${state.label} revised` },
  }), true);
  const result = store.markSaved(submission.document, 'persisted-v7', submission.revision);
  assert.equal(result.newerEditsExist, true);
  assert.equal(result.clean, false);
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(store.getSnapshot().baselineHash, 'persisted-v7');
  assert.equal(store.getSnapshot().saveState.status, 'idle');
});

test('source installation preserves edits made while canonical load is in flight', () => {
  const store = createStore();
  const state = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => !item.protected);
  const localLabel = `${state.label} local`;
  assert.equal(store.pointField.patchState({ id: state.id, patch: { label: localLabel } }), true);
  const remote = structuredClone(canonicalV7);
  remote.globals.readingWidthRem += 0.25;
  assert.equal(store.installSource(remote, 'remote-hash', { status: 'ready' }), true);
  assert.equal(store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => item.id === state.id).label, localLabel);
  assert.equal(store.getSnapshot().baselineDocument.globals.readingWidthRem, remote.globals.readingWidthRem);
  assert.equal(store.getSnapshot().baselineHash, 'remote-hash');
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(store.getSnapshot().sourceState.status, 'ready');
});

test('save lifecycle reconciles newer edits and keeps the next If-Match baseline', () => {
  const store = createStore({ baselineHash: 'base-v7' });
  const initialState = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => !item.protected);
  store.pointField.patchState({
    id: initialState.id,
    patch: { label: `${initialState.label} submitted` },
  });
  const first = store.beginSave();
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.document));
  assert.equal(store.getSnapshot().saveState.status, 'saving');
  const submittedState = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => item.id === initialState.id);
  store.pointField.patchState({
    id: submittedState.id,
    patch: { label: `${submittedState.label} newer` },
  });
  const result = store.markSaved(first.document, 'persisted-v7', first.revision);
  assert.equal(result.newerEditsExist, true);
  assert.equal(store.getSnapshot().saveState.status, 'idle');
  const second = store.beginSave();
  assert.equal(second.baselineHash, 'persisted-v7');
  assert.equal(second.revision, store.getSnapshot().revision);
  const clean = store.markSaved(second.document, 'persisted-v7-next', second.revision);
  assert.equal(clean.newerEditsExist, false);
  assert.equal(clean.clean, true);
  assert.equal(store.getSnapshot().saveState.status, 'saved');
  assert.equal(store.getSnapshot().baselineHash, 'persisted-v7-next');
});

test('conflict preserves local work and confirmed reload remains undoable', () => {
  const store = createStore({ baselineHash: 'base-v7' });
  const state = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => !item.protected);
  const localLabel = `${state.label} local conflict`;
  store.pointField.patchState({ id: state.id, patch: { label: localLabel } });
  const localBytes = bytes(store.getSnapshot().document);
  const remote = structuredClone(canonicalV7);
  remote.globals.readingWidthRem += 0.5;
  store.markConflict({
    currentHash: 'remote-hash',
    remoteDocument: remote,
    localDocument: store.getSnapshot().document,
    comparison: { localChanges: ['state.label'], remoteChanges: ['globals.readingWidthRem'] },
  });
  assert.equal(bytes(store.getSnapshot().document), localBytes);
  assert.equal(store.getSnapshot().saveState.status, 'conflict');
  assert.equal(store.reloadSource(remote, 'remote-hash'), true);
  assert.equal(store.getSnapshot().dirty, false);
  assert.equal(store.undo(), true);
  assert.equal(bytes(store.getSnapshot().document), localBytes);
  assert.equal(store.getSnapshot().dirty, true);
});

test('restore last saved is one undoable command', () => {
  const store = createStore({ baselineHash: 'base-v7' });
  const state = store.getSnapshot().document.tracks.pointField.stateDefinitions
    .find((item) => !item.protected);
  const initial = bytes(store.getSnapshot().document);
  store.pointField.patchState({ id: state.id, patch: { label: `${state.label} changed` } });
  const changed = bytes(store.getSnapshot().document);
  assert.equal(store.restoreBaseline(), true);
  assert.equal(bytes(store.getSnapshot().document), initial);
  assert.equal(store.undo(), true);
  assert.equal(bytes(store.getSnapshot().document), changed);
});

test('live point-field gestures defer full compilation until the atomic commit', () => {
  const store = createStore();
  const key = editableKey(store.getSnapshot().document);
  const updates = 40;
  const compilationStart = store.getMetrics().compilations;
  const startedAt = performance.now();
  assert.equal(store.pointField.beginMoveKey({ keyId: key.id }), true);
  for (let index = 0; index < updates; index += 1) {
    assert.equal(store.pointField.updateMoveKey(key.atWU + ((index % 10) * 0.001)), true);
  }
  const elapsedMs = performance.now() - startedAt;
  assert.equal(store.getMetrics().gestureUpdates, updates);
  assert.equal(store.getMetrics().compilations - compilationStart, 0);
  assert.equal(store.getMetrics().publishedDocuments, 0);
  assert.equal(store.getSnapshot().revision, 0);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  assert.equal(store.getMetrics().compilations - compilationStart, 1);
  assert.ok(elapsedMs < 1_000, `40 live point-field previews took ${elapsedMs.toFixed(1)}ms.`);
  console.log(
    `40 v7 store gesture previews: ${elapsedMs.toFixed(1)}ms; 0 full compiles; `
      + 'one transient document/snapshot pair per update; one retained history command on commit',
  );
});

test('40 inspector patch previews allocate transient drafts without full preview compilation', () => {
  const store = createStore();
  const segment = morphSegment(store.getSnapshot().document);
  const updates = 40;
  const compilationStart = store.getMetrics().compilations;
  const startedAt = performance.now();
  assert.equal(store.pointField.beginPatch({
    type: 'point-field-segment',
    id: segment.id,
    label: 'Shape point stagger',
  }), true);
  for (let index = 0; index < updates; index += 1) {
    assert.equal(store.pointField.updatePatch({
      transition: { stagger: { mode: 'axis', axis: 'y', amount: index / updates } },
    }), true);
  }
  const elapsedMs = performance.now() - startedAt;
  assert.equal(store.getMetrics().gestureUpdates, updates);
  assert.equal(store.getMetrics().compilations - compilationStart, 0);
  assert.equal(store.getMetrics().publishedDocuments, 0);
  assert.equal(store.getSnapshot().revision, 0);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  assert.equal(store.getMetrics().compilations - compilationStart, 1);
  assert.ok(elapsedMs < 1_000, `40 live point-field patch previews took ${elapsedMs.toFixed(1)}ms.`);
  console.log(
    `40 v7 patch previews: ${elapsedMs.toFixed(1)}ms; 0 full compiles; `
      + 'one transient draft per update; one retained history command on commit',
  );
});
