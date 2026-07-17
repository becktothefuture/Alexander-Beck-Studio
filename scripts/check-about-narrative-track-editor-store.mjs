import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compileAboutNarrativeTrackModel,
  createAboutNarrativeTrackModel,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackModel.js';
import { createAboutNarrativeTrackEditorStore } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackEditorStore.js';

const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));

const createModel = () => structuredClone(createAboutNarrativeTrackModel(canonical));
const getTitle = (document, index = 0) => document.tracks.text.fields.filter((field) => field.kind === 'title')[index];
const bytes = (value) => JSON.stringify(value);

test('v3 store owns its input, compiles once, normalizes selection, and publishes subscriptions', () => {
  const input = createModel();
  const selected = getTitle(input);
  let publications = 0;
  const store = createAboutNarrativeTrackEditorStore(input, {
    initialSelection: { type: 'text-field', id: selected.id },
  });
  const unsubscribe = store.subscribe(() => { publications += 1; });
  input.tracks.text.fields[0].startWU = 99;
  assert.notEqual(store.getSnapshot().document.tracks.text.fields[0].startWU, 99);
  assert.equal(store.getSnapshot().compiledPlan.valid, true);
  assert.equal(store.getSnapshot().compiledPlan, store.getSnapshot().lastValidPlan);
  assert.deepEqual(store.getSnapshot().selection, { type: 'text-field', id: selected.id });
  store.setSelection({ type: 'text-field', id: 'missing' });
  assert.deepEqual(store.getSnapshot().selection, { type: 'track', id: 'text' });
  assert.equal(publications, 1);
  unsubscribe();
});

test('history restores distinct before and after selections across commit, undo, and redo', () => {
  const model = createModel();
  const first = getTitle(model, 0);
  const second = getTitle(model, 1);
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'text-field', id: first.id },
  });
  const original = first.text;
  assert.equal(store.commit('Edit first title', (draft) => {
    draft.tracks.text.fields.find((field) => field.id === first.id).text = 'Edited title';
  }, { selectionAfter: { type: 'text-field', id: second.id }, requireValid: true }), true);
  assert.equal(store.getSnapshot().selection.id, second.id);
  assert.equal(store.getSnapshot().history.undoLabel, 'Edit first title');
  assert.equal(store.undo(), true);
  assert.equal(getTitle(store.getSnapshot().document, 0).text, original);
  assert.deepEqual(store.getSnapshot().selection, { type: 'text-field', id: first.id });
  assert.equal(store.redo(), true);
  assert.equal(getTitle(store.getSnapshot().document, 0).text, 'Edited title');
  assert.deepEqual(store.getSnapshot().selection, { type: 'text-field', id: second.id });
});

test('invalid candidates retain the last-valid plan and destructive commits can reject atomically', () => {
  const model = createModel();
  const title = getTitle(model);
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'text-field', id: title.id },
  });
  const approvedPlan = store.getSnapshot().compiledPlan;
  assert.equal(store.commit('Allow invalid draft', (draft) => {
    const field = draft.tracks.text.fields.find((item) => item.id === title.id);
    field.focusWU = field.endWU + 1;
  }), true);
  assert.equal(store.getSnapshot().compiledPlan, approvedPlan);
  assert.equal(store.getSnapshot().lastValidPlan, approvedPlan);
  assert.ok(store.getSnapshot().diagnostics.some((item) => item.level === 'error'));
  assert.equal(store.undo(), true);
  const beforeRejected = bytes(store.getSnapshot().document);
  assert.equal(store.commit('Reject invalid destructive edit', (draft) => {
    draft.tracks.worlds.objects.length = 0;
  }, { requireValid: true }), false);
  assert.equal(bytes(store.getSnapshot().document), beforeRejected);
  assert.match(store.getSnapshot().rejectedEdit.reason, /World|world/i);
});

test('continuous gestures preview repeatedly, block overlap, and commit as one history command', () => {
  const model = createModel();
  const first = getTitle(model, 0);
  const second = getTitle(model, 1);
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'text-field', id: first.id },
  });
  const original = first.text;
  assert.equal(store.beginGesture('Drag title'), true);
  assert.equal(store.beginGesture('Overlapping drag'), false);
  assert.equal(store.beginTry('Overlapping try', () => {}), false);
  assert.equal(store.updateGesture((draft) => {
    draft.tracks.text.fields.find((field) => field.id === first.id).text = `${original} A`;
  }), true);
  assert.equal(store.updateGesture((draft) => {
    draft.tracks.text.fields.find((field) => field.id === first.id).text = `${original} A B`;
  }), true);
  assert.equal(store.commitGesture({ selectionAfter: { type: 'text-field', id: second.id }, requireValid: true }), true);
  assert.equal(store.getSnapshot().revision, 1);
  assert.equal(store.getSnapshot().selection.id, second.id);
  assert.equal(store.undo(), true);
  assert.equal(getTitle(store.getSnapshot().document).text, original);
  assert.equal(store.getSnapshot().history.canUndo, false, 'One Undo consumes the whole gesture.');

  assert.equal(store.beginGesture('Cancelled drag'), true);
  store.updateGesture((draft) => {
    draft.tracks.text.fields.find((field) => field.id === first.id).text = 'Temporary preview';
  });
  assert.equal(store.cancelGesture(), true);
  assert.equal(getTitle(store.getSnapshot().document).text, original);
});

test('invalid required gestures remain cancellable and never replace the last-valid plan', () => {
  const model = createModel();
  const title = getTitle(model);
  const store = createAboutNarrativeTrackEditorStore(model);
  const approvedPlan = store.getSnapshot().compiledPlan;
  store.beginGesture('Invalid timing');
  assert.equal(store.updateGesture((draft) => {
    const field = draft.tracks.text.fields.find((item) => item.id === title.id);
    field.startWU = field.endWU + 1;
  }), false);
  assert.equal(store.getSnapshot().compiledPlan, approvedPlan);
  assert.equal(store.commitGesture({ requireValid: true }), false);
  assert.equal(store.getSnapshot().gestureState.valid, false);
  assert.equal(store.cancelGesture(), true);
  assert.equal(store.getSnapshot().compiledPlan, approvedPlan);
  assert.deepEqual(store.getSnapshot().document, model);
});

test('try states block gestures, apply valid candidates once, and preserve invalid candidates for cancellation', () => {
  const model = createModel();
  const title = getTitle(model);
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'text-field', id: title.id },
  });
  assert.equal(store.beginTry('Try copy', (draft) => {
    draft.tracks.text.fields.find((field) => field.id === title.id).text = 'Tried title';
  }), true);
  assert.equal(store.getSnapshot().tryState.document.tracks.text.fields.find((field) => field.id === title.id).text, 'Tried title');
  assert.equal(store.updateTry((draft) => {
    draft.tracks.text.fields.find((field) => field.id === title.id).text = 'Updated tried title';
  }), true);
  assert.equal(store.beginGesture('Blocked gesture'), false);
  assert.equal(store.applyTry(), true);
  assert.equal(getTitle(store.getSnapshot().document).text, 'Updated tried title');
  assert.equal(store.undo(), true);
  assert.notEqual(getTitle(store.getSnapshot().document).text, 'Updated tried title');

  assert.equal(store.beginTry('Invalid try', (draft) => {
    draft.tracks.camera.keys[0].atWU = 2;
  }), false);
  assert.equal(store.getSnapshot().tryState.valid, false);
  assert.equal(store.applyTry(), false);
  assert.equal(store.cancelTry(), true);
  assert.equal(store.getSnapshot().tryState, null);
});

test('selection normalizes after object removal instead of retaining stale object addresses', () => {
  const model = createModel();
  const title = getTitle(model);
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'text-field', id: title.id },
  });
  assert.equal(store.commit('Remove selected title', (draft) => {
    draft.tracks.text.fields = draft.tracks.text.fields.filter((field) => field.id !== title.id);
  }, { selectionAfter: { type: 'text-field', id: title.id }, requireValid: true }), true);
  assert.deepEqual(store.getSnapshot().selection, { type: 'track', id: 'text' });
});

test('store-backed pure operations create, move, copy, paste, duplicate, and delete valid v3 objects', () => {
  const store = createAboutNarrativeTrackEditorStore(createModel());
  assert.equal(store.createObject({ track: 'text', kind: 'title', atWU: 7.1 }), true);
  const titleId = store.getSnapshot().selection.id;
  assert.equal(store.createObject({ track: 'text', kind: 'scroll-block', atWU: 8.2 }), true);
  assert.equal(store.createObject({ track: 'text', kind: 'stub', atWU: 9.2 }), true);
  assert.equal(store.createObject({ track: 'camera', atWU: 0.8 }), true);
  assert.equal(store.createObject({ track: 'world', atWU: 10 }), true);
  const worldId = store.getSnapshot().selection.id;
  assert.equal(store.createObject({ track: 'interaction', atWU: 10.5, targetWorldId: worldId }), true);
  assert.equal(compileAboutNarrativeTrackModel(store.getSnapshot().document).valid, true);

  store.setSelection({ type: 'text-field', id: titleId });
  const beforeMove = getAboutNarrativeTrackObjectTime(store.getSnapshot().document, titleId);
  assert.equal(store.moveSelection(0.2), true);
  assert.ok(Math.abs(
    getAboutNarrativeTrackObjectTime(store.getSnapshot().document, titleId) - (beforeMove + 0.2),
  ) < 1e-9);
  assert.equal(store.copySelection(), true);
  assert.equal(store.pasteClipboard({ atWU: 11 }), true);
  const pastedId = store.getSnapshot().selection.id;
  assert.notEqual(pastedId, titleId);
  assert.equal(store.duplicateSelection({ offsetWU: 0.3 }), true);
  const duplicatedId = store.getSnapshot().selection.id;
  assert.notEqual(duplicatedId, pastedId);
  assert.equal(store.deleteSelection(), true);
  assert.equal(store.getSnapshot().document.tracks.text.fields.some((field) => field.id === duplicatedId), false);
  assert.equal(compileAboutNarrativeTrackModel(store.getSnapshot().document).valid, true);
});

function getAboutNarrativeTrackObjectTime(document, id) {
  return document.tracks.text.fields.find((field) => field.id === id).startWU;
}

test('clipboard is store-owned and protected objects cannot use destructive operation wrappers', () => {
  const model = createModel();
  const title = getTitle(model);
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'text-field', id: title.id },
  });
  assert.equal(store.copySelection(), true);
  const external = structuredClone(store.getSnapshot().clipboard);
  assert.equal(store.setClipboard(external), true);
  external.items[0].object.id = 'mutated-outside-store';
  assert.notEqual(store.getSnapshot().clipboard.items[0].object.id, 'mutated-outside-store');
  assert.equal(store.setClipboard({ version: 999 }), false);

  const protectedWorld = store.getSnapshot().document.tracks.worlds.objects.find((world) => world.protected);
  store.setSelection({ type: 'world', id: protectedWorld.id });
  assert.equal(store.moveSelection(-0.2), false);
  assert.equal(store.deleteSelection(), false);
  assert.equal(store.duplicateSelection(), false);
});

test('layout, orientation, and motion preview are orthogonal UI state and never mutate authored timing', () => {
  const store = createAboutNarrativeTrackEditorStore(createModel());
  const documentBefore = bytes(store.getSnapshot().document);
  const revisionBefore = store.getSnapshot().revision;
  assert.equal(store.setPreviewState({ layoutProfile: 'mobile' }), true);
  assert.equal(store.setPreviewState({ orientation: 'landscape' }), true);
  assert.equal(store.setPreviewState({ motionProfile: 'reduced' }), true);
  assert.deepEqual(store.getSnapshot().previewState, {
    layoutProfile: 'mobile', orientation: 'landscape', motionProfile: 'reduced',
  });
  assert.equal(bytes(store.getSnapshot().document), documentBefore);
  assert.equal(store.getSnapshot().revision, revisionBefore);
  assert.equal(store.getSnapshot().history.canUndo, false);
  assert.equal(store.setPreviewState({ layoutProfile: 'watch' }), false);
});

test('transport is bounded by the active plan and remains orthogonal through edits and history', () => {
  const store = createAboutNarrativeTrackEditorStore(createModel());
  const durationWU = store.getSnapshot().lastValidPlan.durationWU;
  assert.deepEqual(store.getSnapshot().transport, {
    owner: 'scroll', storyWU: 0, playing: false, liveAmbient: true, loop: null,
  });
  assert.equal(store.setTransport({
    owner: 'timeline',
    storyWU: durationWU + 12,
    playing: true,
    liveAmbient: false,
    loop: { startWU: durationWU - 1, endWU: durationWU + 10 },
  }), true);
  assert.deepEqual(store.getSnapshot().transport, {
    owner: 'timeline',
    storyWU: durationWU,
    playing: true,
    liveAmbient: false,
    loop: { startWU: durationWU - 1, endWU: durationWU },
  });
  assert.equal(store.commit('Edit while playing', (draft) => {
    getTitle(draft).text = 'Transport-safe edit';
  }, { requireValid: true }), true);
  assert.equal(store.getSnapshot().transport.storyWU, durationWU);
  assert.equal(store.undo(), true);
  assert.equal(store.getSnapshot().transport.owner, 'timeline');
  assert.equal(store.getSnapshot().transport.playing, true);
  assert.equal(store.setTransport({ owner: 'invalid-owner', storyWU: -4, loop: { startWU: 3, endWU: 2 } }), true);
  assert.deepEqual(store.getSnapshot().transport, {
    owner: 'scroll', storyWU: 0, playing: true, liveAmbient: false, loop: null,
  });
});
