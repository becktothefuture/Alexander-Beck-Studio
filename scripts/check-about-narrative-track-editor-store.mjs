import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compileAboutNarrativeTrackModel,
  createAboutNarrativeTrackModel,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackModel.js';
import { createAboutNarrativeTrackEditorStore } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackEditorStore.js';
import { loadAboutNarrativeTrackSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackPersistence.js';

const canonicalV4 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const canonical = loadAboutNarrativeTrackSource(canonicalV4).document;

const createModel = () => structuredClone(createAboutNarrativeTrackModel(canonical));
const getTitle = (document, index = 0) => document.tracks.text.fields.filter((field) => field.kind === 'title')[index];
const bytes = (value) => JSON.stringify(value);

test('v5 store owns its input, compiles once, normalizes selection, and publishes subscriptions', () => {
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

test('World end gestures ripple later Worlds, stay contiguous, and undo as one command', () => {
  const model = createModel();
  const worlds = [...model.tracks.worlds.objects].sort((left, right) => left.startWU - right.startWU);
  const world = worlds[1];
  const next = worlds[2];
  const laterStartsBefore = worlds.slice(2).map((item) => item.startWU);
  const originalEndWU = next.startWU;
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'world', id: world.id },
  });
  assert.equal(store.beginGesture(`Resize World ${world.label}`), true);
  assert.equal(store.updateGestureResizeWorldEnd(world.id, originalEndWU - 0.1), true);
  assert.equal(store.updateGestureResizeWorldEnd(world.id, originalEndWU - 0.2), true);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  const resizedWorlds = [...store.getSnapshot().document.tracks.worlds.objects]
    .sort((left, right) => left.startWU - right.startWU);
  const snappedEndWU = Math.round((originalEndWU - 0.2) / 0.005) * 0.005;
  const appliedDeltaWU = snappedEndWU - originalEndWU;
  assert.deepEqual(
    resizedWorlds.slice(2).map((item) => item.startWU),
    laterStartsBefore.map((value) => Number((value + appliedDeltaWU).toFixed(6))),
  );
  resizedWorlds.slice(0, -1).forEach((item, index) => {
    assert.equal(
      getWorldEnd(store.getSnapshot().document, item.id),
      resizedWorlds[index + 1].startWU,
      `${item.id} must end exactly where the next World starts.`,
    );
  });
  assert.equal(store.getSnapshot().revision, 1);
  assert.equal(store.undo(), true);
  assert.deepEqual(
    [...store.getSnapshot().document.tracks.worlds.objects]
      .sort((left, right) => left.startWU - right.startWU)
      .slice(2)
      .map((item) => item.startWU),
    laterStartsBefore,
  );
  assert.equal(store.getSnapshot().history.canUndo, false);
});

test('Motion edge gestures preserve activation and commit repeated previews as one command', () => {
  const model = createModel();
  const motion = model.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  assert.ok(motion, 'The canonical editor model needs an editable Motion clip.');
  const original = {
    startWU: motion.startWU,
    activationWU: motion.activationWU,
    endWU: motion.endWU,
  };
  const store = createAboutNarrativeTrackEditorStore(model, {
    initialSelection: { type: 'interaction', id: motion.id },
  });
  assert.equal(store.beginGesture(`Resize Motion ${motion.id}`), true);
  assert.equal(store.updateGestureResizeInteraction(motion.id, 'end', motion.endWU - 0.1), true);
  assert.equal(store.updateGestureResizeInteraction(motion.id, 'end', motion.endWU - 0.2), true);
  assert.equal(store.commitGesture({ requireValid: true }), true);
  const resized = store.getSnapshot().document.tracks.interactions.clips.find((clip) => clip.id === motion.id);
  assert.equal(resized.startWU, original.startWU);
  assert.equal(resized.activationWU, original.activationWU);
  assert.equal(resized.endWU, Number((original.endWU - 0.2).toFixed(6)));
  assert.equal(store.getSnapshot().revision, 1);
  assert.equal(store.undo(), true);
  const restored = store.getSnapshot().document.tracks.interactions.clips.find((clip) => clip.id === motion.id);
  assert.deepEqual(
    [restored.startWU, restored.activationWU, restored.endWU],
    [original.startWU, original.activationWU, original.endWU],
  );
  assert.equal(store.getSnapshot().history.canUndo, false);
});

function getWorldEnd(document, id) {
  const worlds = [...document.tracks.worlds.objects].sort((left, right) => left.startWU - right.startWU);
  const index = worlds.findIndex((world) => world.id === id);
  return worlds[index + 1]?.startWU ?? document.profiles.desktop.storyDurationWU;
}

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

test('store-backed pure operations create, move, copy, paste, duplicate, and delete valid v5 objects', () => {
  const store = createAboutNarrativeTrackEditorStore(createModel());
  assert.equal(store.createObject({ track: 'text', kind: 'title', atWU: 7.1 }), true);
  const titleId = store.getSnapshot().selection.id;
  assert.equal(store.createObject({ track: 'text', kind: 'scroll-block', atWU: 8.2 }), true);
  assert.equal(store.createObject({ track: 'text', kind: 'stub', atWU: 9.2 }), true);
  assert.equal(store.createObject({ track: 'camera', atWU: 0.8 }), true);
  // Use the interaction-free opening gap so this pure-operation test remains
  // independent of the authored ripple clip's release timing.
  assert.equal(store.createObject({ track: 'world', atWU: 3 }), true);
  const worldId = store.getSnapshot().selection.id;
  assert.equal(store.createObject({ track: 'interaction', atWU: 3.2, targetWorldId: worldId }), true);
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

test('Visibility insertion samples the published value without a jump and remains undoable', () => {
  const model = createModel();
  const durationWU = model.profiles.desktop.storyDurationWU;
  model.tracks.visibility.keys = [
    { id: 'visibility-start', atWU: 0, visibility: 0.2, easing: 'linear', locked: true },
    { id: 'visibility-end', atWU: durationWU, visibility: 0.8, easing: 'linear', locked: true },
  ];
  const store = createAboutNarrativeTrackEditorStore(model);
  const atWU = durationWU / 2;

  assert.equal(store.createObject({ track: 'visibility', atWU }), true);
  const selection = store.getSnapshot().selection;
  assert.equal(selection.type, 'visibility-key');
  const inserted = store.getSnapshot().document.tracks.visibility.keys
    .find((key) => key.id === selection.id);
  assert.equal(inserted.atWU, atWU);
  assert.ok(Math.abs(inserted.visibility - 0.5) < 0.000001);
  assert.equal(store.getSnapshot().compiledPlan.valid, true);

  assert.equal(store.undo(), true);
  assert.equal(store.getSnapshot().document.tracks.visibility.keys.length, 2);
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
