import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_CHECKPOINTS_KEY,
  ABOUT_NARRATIVE_LOCAL_SAVE_KEY,
  ABOUT_NARRATIVE_RECOVERY_KEY,
  classifyAboutNarrativeRecoveryDraft,
  deleteAboutNarrativeCheckpoint,
  flushAboutNarrativeRecoveryDraft,
  readAboutNarrativeCheckpointState,
  readAboutNarrativeLocalSave,
  readAboutNarrativeRecoveryDraft,
  serializeAboutNarrativeDocumentForExport,
  writeAboutNarrativeCheckpoint,
  writeAboutNarrativeLocalSave,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePersistence.js';
import {
  createAboutNarrativePointFieldEditorStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditorStore.js';
import {
  resolveAboutNarrativeCameraKeyEasingHandles,
  setAboutNarrativeCameraKeyEasingStrength,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraEasing.js';

const canonicalV6 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const editorSource = await readFile(
  new URL('../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx', import.meta.url),
  'utf8',
);

class MemoryStorage {
  constructor() {
    this.values = new Map();
    this.failure = null;
  }

  getItem(key) {
    if (this.failure?.operation === 'get') throw this.failure.error;
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    if (this.failure?.operation === 'set') throw this.failure.error;
    this.values.set(key, String(value));
  }

  removeItem(key) {
    if (this.failure?.operation === 'remove') throw this.failure.error;
    this.values.delete(key);
  }
}

function namedError(name, message) {
  const error = new Error(message);
  error.name = name;
  return error;
}

test('synchronous recovery flush writes the latest revision for pagehide reuse', () => {
  const storage = new MemoryStorage();
  const document = structuredClone(canonicalV6);
  document.globals.readingWidthRem += 0.25;
  const result = flushAboutNarrativeRecoveryDraft({
    document,
    baselineHash: 'baseline-v6',
    selection: { type: 'track', id: 'text' },
    storyWU: 3.5,
    targetVersion: 6,
    storage,
  });
  assert.equal(result.status, 'current');
  const stored = JSON.parse(storage.getItem(ABOUT_NARRATIVE_RECOVERY_KEY));
  assert.equal(stored.document.globals.readingWidthRem, document.globals.readingWidthRem);
  assert.equal(stored.baseSourceHash, 'baseline-v6');
  assert.deepEqual(stored.selection, { type: 'track', id: 'text' });
  assert.equal(stored.storyWU, 3.5);
  assert.match(editorSource, /addEventListener\('pagehide', handlePageHide\)/);
  assert.match(editorSource, /const submission = store\.beginSave\(\)/);
  const saveBlock = editorSource.slice(
    editorSource.indexOf('const save = useCallback'),
    editorSource.indexOf('saveRef.current = save'),
  );
  assert.doesNotMatch(saveBlock, /replaceDocument/);
});

test('public Director Save persists and reloads one validated local baseline', () => {
  const storage = new MemoryStorage();
  const document = structuredClone(canonicalV6);
  document.globals.readingWidthRem += 0.25;
  const saved = writeAboutNarrativeLocalSave(document, {
    targetVersion: 6,
    savedAt: 1234,
    storage,
  });
  assert.equal(saved.status, 'saved');
  assert.match(saved.hash, /^local-v6:[0-9a-f]{8}$/);
  assert.equal(saved.savedAt, 1234);

  const stored = JSON.parse(storage.getItem(ABOUT_NARRATIVE_LOCAL_SAVE_KEY));
  assert.equal(stored.kind, 'local-save');
  assert.equal(stored.document.globals.readingWidthRem, document.globals.readingWidthRem);

  const loaded = readAboutNarrativeLocalSave({ targetVersion: 6, storage });
  assert.equal(loaded.status, 'saved');
  assert.equal(loaded.hash, saved.hash);
  assert.deepEqual(loaded.document, saved.document);
  assert.equal(loaded.savedAt, 1234);

  assert.match(editorSource, /writeAboutNarrativeLocalSave\(submission\.document/);
  assert.match(editorSource, /readAboutNarrativeLocalSave\(\{/);
  assert.doesNotMatch(editorSource, /'Export draft'/);
});

test('camera keyframe ease-in and ease-out survive Director save, reload, and export', () => {
  const storage = new MemoryStorage();
  const document = structuredClone(canonicalV6);
  const selectedIndex = Math.floor(document.tracks.camera.keys.length / 2);
  const selectedKey = document.tracks.camera.keys[selectedIndex];
  const incoming = setAboutNarrativeCameraKeyEasingStrength(
    document.tracks.camera.keys,
    selectedKey.id,
    'incoming',
    0.71,
  );
  const outgoing = setAboutNarrativeCameraKeyEasingStrength(
    document.tracks.camera.keys,
    selectedKey.id,
    'outgoing',
    0.63,
  );
  assert.equal(incoming.segmentKeyId, document.tracks.camera.keys[selectedIndex - 1].id);
  assert.equal(outgoing.segmentKeyId, selectedKey.id);

  writeAboutNarrativeLocalSave(document, { targetVersion: 6, savedAt: 2345, storage });
  const loaded = readAboutNarrativeLocalSave({ targetVersion: 6, storage });
  const loadedHandles = resolveAboutNarrativeCameraKeyEasingHandles(
    loaded.document.tracks.camera.keys,
    selectedKey.id,
  );
  assert.equal(Number(loadedHandles.incoming.strength.toFixed(2)), 0.71);
  assert.equal(Number(loadedHandles.outgoing.strength.toFixed(2)), 0.63);

  const exported = JSON.parse(serializeAboutNarrativeDocumentForExport(
    loaded.document,
    { targetVersion: 6 },
  ));
  const exportedHandles = resolveAboutNarrativeCameraKeyEasingHandles(
    exported.tracks.camera.keys,
    selectedKey.id,
  );
  assert.equal(Number(exportedHandles.incoming.strength.toFixed(2)), 0.71);
  assert.equal(Number(exportedHandles.outgoing.strength.toFixed(2)), 0.63);
});

test('public Director Save reports unavailable, invalid, quota, and security storage', () => {
  const empty = new MemoryStorage();
  assert.deepEqual(
    readAboutNarrativeLocalSave({ targetVersion: 6, storage: empty }),
    { status: 'none', available: false },
  );

  const invalid = new MemoryStorage();
  invalid.setItem(ABOUT_NARRATIVE_LOCAL_SAVE_KEY, '{broken');
  assert.equal(readAboutNarrativeLocalSave({ targetVersion: 6, storage: invalid }).status, 'failed');

  const quota = new MemoryStorage();
  quota.failure = { operation: 'set', error: namedError('QuotaExceededError', 'quota full') };
  assert.throws(
    () => writeAboutNarrativeLocalSave(canonicalV6, { targetVersion: 6, storage: quota }),
    (error) => error.name === 'AboutNarrativeStorageError' && error.code === 'quota',
  );

  const security = new MemoryStorage();
  security.failure = { operation: 'get', error: namedError('SecurityError', 'storage denied') };
  const protectedRead = readAboutNarrativeLocalSave({ targetVersion: 6, storage: security });
  assert.equal(protectedRead.status, 'failed');
  assert.equal(protectedRead.error.code, 'security');
});

test('recovery classifies stale, expired, invalid, future, unreadable, quota, and security failures', () => {
  const now = 1_000_000;
  const envelope = {
    envelopeVersion: 1,
    kind: 'recovery',
    baseSourceHash: 'base',
    timestamp: now,
    document: canonicalV6,
  };
  assert.equal(classifyAboutNarrativeRecoveryDraft(envelope, { baselineHash: 'other', now, targetVersion: 6 }).status, 'stale');
  assert.equal(classifyAboutNarrativeRecoveryDraft(envelope, { now: now + 10, maximumAgeMs: 1, targetVersion: 6 }).status, 'expired');
  assert.equal(classifyAboutNarrativeRecoveryDraft({ ...envelope, timestamp: 'invalid' }, { now, targetVersion: 6 }).status, 'invalid');
  assert.equal(classifyAboutNarrativeRecoveryDraft({ ...envelope, document: { schemaVersion: 7 } }, { now, targetVersion: 6 }).status, 'future');
  assert.equal(classifyAboutNarrativeRecoveryDraft('{broken', { now, targetVersion: 6 }).status, 'unreadable');

  const quotaStorage = new MemoryStorage();
  quotaStorage.failure = { operation: 'set', error: namedError('QuotaExceededError', 'quota full') };
  const quota = flushAboutNarrativeRecoveryDraft({
    document: canonicalV6,
    baselineHash: 'base',
    targetVersion: 6,
    storage: quotaStorage,
  });
  assert.equal(quota.status, 'failed');
  assert.equal(quota.error.code, 'quota');

  const protectedStorage = new MemoryStorage();
  protectedStorage.failure = { operation: 'get', error: namedError('SecurityError', 'storage denied') };
  const security = readAboutNarrativeRecoveryDraft({ targetVersion: 6, storage: protectedStorage });
  assert.equal(security.status, 'failed');
  assert.equal(security.error.code, 'security');

  const invalidDocument = structuredClone(canonicalV6);
  invalidDocument.tracks.pointField.keys[0].atWU = 99;
  const serialization = flushAboutNarrativeRecoveryDraft({
    document: invalidDocument,
    baselineHash: 'base',
    targetVersion: 6,
    storage: new MemoryStorage(),
  });
  assert.equal(serialization.status, 'failed');
  assert.match(serialization.reason, /valid|origin|point-field/i);
});

test('save reconciliation installs a normalized server document only for the current revision', () => {
  const store = createAboutNarrativePointFieldEditorStore(canonicalV6, { baselineHash: 'base' });
  store.commit('Submitted edit', (draft) => { draft.globals.readingWidthRem += 0.25; });
  const submission = store.beginSave();
  const normalized = structuredClone(submission.document);
  normalized.globals.readingWidthRem += 0.125;
  const current = store.markSaved(normalized, 'normalized-hash', submission.revision);
  assert.equal(current.clean, true);
  assert.equal(store.getSnapshot().document.globals.readingWidthRem, normalized.globals.readingWidthRem);
  assert.deepEqual(store.getSnapshot().document, store.getSnapshot().baselineDocument);

  store.commit('New submitted edit', (draft) => { draft.globals.readingWidthRem += 0.25; });
  const staleSubmission = store.beginSave();
  store.commit('Edit during save', (draft) => { draft.globals.readingWidthRem += 0.25; });
  const localValue = store.getSnapshot().document.globals.readingWidthRem;
  const persisted = structuredClone(staleSubmission.document);
  persisted.globals.readingWidthRem += 0.0625;
  const stale = store.markSaved(persisted, 'newer-hash', staleSubmission.revision);
  assert.equal(stale.newerEditsExist, true);
  assert.equal(store.getSnapshot().document.globals.readingWidthRem, localValue);
  assert.equal(store.getSnapshot().baselineDocument.globals.readingWidthRem, persisted.globals.readingWidthRem);
});

test('one store predicate blocks invalid, conflict, read-only, loading, and active-edit saves', () => {
  const makeDirtyStore = () => {
    const store = createAboutNarrativePointFieldEditorStore(canonicalV6, { baselineHash: 'base' });
    store.commit('Dirty', (draft) => { draft.globals.readingWidthRem += 0.25; });
    return store;
  };
  const readOnly = makeDirtyStore();
  readOnly.setSourceState({ status: 'read-only', readOnly: true });
  assert.equal(readOnly.getSaveEligibility().code, 'read-only');
  assert.equal(readOnly.beginSave(), null);

  const conflict = makeDirtyStore();
  conflict.markConflict({ currentHash: 'remote' });
  assert.equal(conflict.getSaveEligibility().code, 'conflict');
  assert.equal(conflict.beginSave(), null);

  const loading = makeDirtyStore();
  loading.setSourceState({ status: 'loading' });
  assert.equal(loading.getSaveEligibility().code, 'source-loading');

  const invalid = makeDirtyStore();
  assert.equal(invalid.beginGesture('Invalid draft'), true);
  assert.equal(invalid.updateGesture((draft) => {
    draft.tracks.pointField.keys[1].stateId = 'missing-state';
  }), false);
  assert.equal(invalid.getSaveEligibility().code, 'invalid-draft');
  assert.equal(invalid.beginSave(), null);

  const active = makeDirtyStore();
  assert.equal(active.beginGesture('Active edit'), true);
  assert.equal(active.getSaveEligibility().code, 'edit-in-progress');
  assert.match(editorSource, /const saveEligibility = store\.getSaveEligibility\(\)/);
  assert.match(editorSource, /Retry canonical fetch/);
});

test('checkpoint state supports list, restore, export, and delete without changing canonical schema', () => {
  const storage = new MemoryStorage();
  const firstDocument = structuredClone(canonicalV6);
  firstDocument.globals.readingWidthRem += 0.25;
  const first = {
    id: 'checkpoint-first',
    name: 'First checkpoint',
    timestamp: 100,
    baseSourceHash: 'base',
    document: firstDocument,
    selection: { type: 'track', id: 'text' },
    storyWU: 4,
  };
  writeAboutNarrativeCheckpoint(first, { targetVersion: 6, storage });
  writeAboutNarrativeCheckpoint({
    ...first,
    id: 'checkpoint-second',
    name: 'Second checkpoint',
    timestamp: 200,
    storyWU: 8,
  }, { targetVersion: 6, storage });

  const state = readAboutNarrativeCheckpointState({ targetVersion: 6, storage });
  assert.equal(state.status, 'ready');
  assert.deepEqual(state.items.map((item) => item.id), ['checkpoint-second', 'checkpoint-first']);
  const restored = state.items[1];
  const store = createAboutNarrativePointFieldEditorStore(canonicalV6, { baselineHash: 'base' });
  assert.equal(store.replaceDocument('Restore checkpoint', restored.document, { requireValid: true }), true);
  store.setSelection(restored.selection);
  store.setTransport({ owner: 'timeline', storyWU: restored.storyWU });
  assert.equal(store.getSnapshot().document.globals.readingWidthRem, firstDocument.globals.readingWidthRem);
  assert.deepEqual(store.getSnapshot().selection, { type: 'track', id: 'text' });
  assert.equal(store.getSnapshot().transport.storyWU, 4);

  const serialized = serializeAboutNarrativeDocumentForExport(restored.document, { targetVersion: 6 });
  assert.equal(JSON.parse(serialized).schemaVersion, 6);
  const remaining = deleteAboutNarrativeCheckpoint('checkpoint-first', { targetVersion: 6, storage });
  assert.deepEqual(remaining.map((item) => item.id), ['checkpoint-second']);
  assert.equal(JSON.parse(storage.getItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY)).length, 1);
});

test('checkpoint storage reports unreadable and quota failures without presenting an empty success state', () => {
  const unreadable = new MemoryStorage();
  unreadable.setItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY, '{broken');
  const state = readAboutNarrativeCheckpointState({ targetVersion: 6, storage: unreadable });
  assert.equal(state.status, 'failed');
  assert.equal(state.items.length, 0);

  const quotaStorage = new MemoryStorage();
  quotaStorage.failure = { operation: 'set', error: namedError('QuotaExceededError', 'checkpoint quota') };
  assert.throws(() => writeAboutNarrativeCheckpoint({
    id: 'checkpoint-quota',
    name: 'Quota checkpoint',
    timestamp: 300,
    document: canonicalV6,
  }, { targetVersion: 6, storage: quotaStorage }), (error) => (
    error.name === 'AboutNarrativeStorageError' && error.code === 'quota'
  ));

  const futureStorage = new MemoryStorage();
  futureStorage.setItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY, JSON.stringify([{
    envelopeVersion: 1,
    kind: 'checkpoint',
    id: 'checkpoint-future',
    name: 'Future checkpoint',
    timestamp: 400,
    document: { schemaVersion: 7, future: true },
  }]));
  const protectedState = readAboutNarrativeCheckpointState({ targetVersion: 6, storage: futureStorage });
  assert.equal(protectedState.status, 'protected');
  assert.equal(protectedState.items.length, 0);
  assert.equal(protectedState.protectedItems[0].status, 'future');
  assert.deepEqual(protectedState.protectedItems[0].original, {
    envelopeVersion: 1,
    kind: 'checkpoint',
    id: 'checkpoint-future',
    name: 'Future checkpoint',
    timestamp: 400,
    document: { schemaVersion: 7, future: true },
  });
  deleteAboutNarrativeCheckpoint(protectedState.protectedItems[0].storageKey, {
    targetVersion: 6,
    storage: futureStorage,
  });
  assert.equal(readAboutNarrativeCheckpointState({ targetVersion: 6, storage: futureStorage }).status, 'ready');
});
