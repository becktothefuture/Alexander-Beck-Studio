import { compileAboutNarrativeDocument } from './aboutNarrativeCompiler.js';
import { cloneAboutNarrativeDocument } from './aboutNarrativeSchema.js';

const MAX_HISTORY_COMMANDS = 100;
const MAX_HISTORY_BYTES = 5 * 1024 * 1024;

function documentSize(document) {
  return JSON.stringify(document).length * 2;
}

function makeHistoryEntry(label, before, after, selection, coalesceKey = null) {
  return {
    label,
    before,
    after,
    selection,
    coalesceKey,
    bytes: documentSize(before) + documentSize(after),
    timestamp: Date.now(),
  };
}

export function createAboutNarrativeEditorStore(initialDocument, {
  baselineHash = '',
  profile = 'desktop',
} = {}) {
  const listeners = new Set();
  const initialPlan = compileAboutNarrativeDocument(initialDocument, { profile });
  let history = [];
  let historyIndex = -1;
  let historyBytes = 0;
  let tryState = null;
  let previewState = null;
  let snapshot = {
    document: cloneAboutNarrativeDocument(initialDocument),
    baselineDocument: cloneAboutNarrativeDocument(initialDocument),
    baselineHash,
    compiledPlan: initialPlan.valid ? initialPlan : null,
    diagnostics: initialPlan.diagnostics,
    selection: { type: 'section', sectionId: initialDocument.sections[0]?.id || null },
    transport: {
      owner: 'scroll',
      storyWU: 0,
      playing: false,
      loop: null,
      followScroll: true,
      liveAmbient: true,
      zoom: 1,
      soloTrack: null,
    },
    previewProfile: profile,
    history: { canUndo: false, canRedo: false, undoLabel: '', redoLabel: '' },
    saveState: { status: 'saved', message: '', savedAt: null },
    recoveryState: { available: false, error: '' },
    conflictState: { available: false, remote: null, comparison: null },
    autoKey: false,
    tryState: null,
    previewState: null,
    dirty: false,
    revision: 0,
  };

  const emit = () => listeners.forEach((listener) => listener());

  const refreshHistoryState = () => {
    snapshot = {
      ...snapshot,
      history: {
        canUndo: historyIndex >= 0,
        canRedo: historyIndex < history.length - 1,
        undoLabel: historyIndex >= 0 ? history[historyIndex].label : '',
        redoLabel: historyIndex < history.length - 1 ? history[historyIndex + 1].label : '',
      },
    };
  };

  const compileAndSet = (document, extra = {}, { incrementRevision = true } = {}) => {
    const plan = compileAboutNarrativeDocument(document, { profile: snapshot.previewProfile });
    snapshot = {
      ...snapshot,
      document,
      compiledPlan: plan.valid ? plan : snapshot.compiledPlan,
      diagnostics: plan.diagnostics,
      dirty: JSON.stringify(document) !== JSON.stringify(snapshot.baselineDocument),
      saveState: snapshot.saveState.status === 'saving'
        ? snapshot.saveState
        : { ...snapshot.saveState, status: 'draft' },
      revision: incrementRevision ? snapshot.revision + 1 : snapshot.revision,
      ...extra,
    };
  };

  const trimHistory = () => {
    while (history.length > MAX_HISTORY_COMMANDS || historyBytes > MAX_HISTORY_BYTES) {
      const removed = history.shift();
      historyBytes -= removed.bytes;
      historyIndex -= 1;
    }
  };

  const pushHistory = (entry) => {
    const removed = history.splice(historyIndex + 1);
    removed.forEach((item) => { historyBytes -= item.bytes; });
    const previous = history.at(-1);
    if (entry.coalesceKey && previous?.coalesceKey === entry.coalesceKey && entry.timestamp - previous.timestamp < 1000) {
      historyBytes -= previous.bytes;
      entry.before = previous.before;
      entry.bytes = documentSize(entry.before) + documentSize(entry.after);
      history[history.length - 1] = entry;
    } else {
      history.push(entry);
      historyIndex = history.length - 1;
    }
    historyBytes += entry.bytes;
    historyIndex = history.length - 1;
    trimHistory();
    refreshHistoryState();
  };

  const store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    commit(label, mutate, { coalesceKey = null, selection = snapshot.selection } = {}) {
      const before = cloneAboutNarrativeDocument(snapshot.document);
      const after = cloneAboutNarrativeDocument(snapshot.document);
      mutate(after);
      if (JSON.stringify(before) === JSON.stringify(after)) return false;
      pushHistory(makeHistoryEntry(label, before, cloneAboutNarrativeDocument(after), selection, coalesceKey));
      tryState = null;
      previewState = null;
      compileAndSet(after, { selection, tryState: null, previewState: null });
      emit();
      return true;
    },
    replaceDocument(label, document) {
      return store.commit(label, (draft) => {
        Object.keys(draft).forEach((key) => delete draft[key]);
        Object.assign(draft, cloneAboutNarrativeDocument(document));
      });
    },
    beginTry(label, mutate) {
      const document = cloneAboutNarrativeDocument(snapshot.document);
      mutate(document);
      const plan = compileAboutNarrativeDocument(document, { profile: snapshot.previewProfile });
      tryState = { label, document, plan };
      snapshot = { ...snapshot, tryState, diagnostics: plan.diagnostics };
      emit();
      return plan.valid;
    },
    applyTry() {
      if (!tryState?.plan.valid) return false;
      const { label, document } = tryState;
      tryState = null;
      return store.replaceDocument(label, document);
    },
    cancelTry() {
      tryState = null;
      snapshot = { ...snapshot, tryState: null, diagnostics: snapshot.compiledPlan?.diagnostics || [] };
      emit();
    },
    beginPreview(label) {
      if (previewState) return false;
      previewState = {
        label,
        startDocument: cloneAboutNarrativeDocument(snapshot.document),
        startTransport: cloneAboutNarrativeDocument(snapshot.transport),
        startCompiledPlan: snapshot.compiledPlan,
        startDiagnostics: snapshot.diagnostics,
        startDirty: snapshot.dirty,
        startSaveState: { ...snapshot.saveState },
        plan: snapshot.compiledPlan,
      };
      snapshot = {
        ...snapshot,
        previewState: { label, valid: Boolean(previewState.plan?.valid) },
      };
      emit();
      return true;
    },
    updatePreview(mutate, transportPatch = null) {
      if (!previewState || typeof mutate !== 'function') return false;
      const document = cloneAboutNarrativeDocument(snapshot.document);
      mutate(document);
      const plan = compileAboutNarrativeDocument(document, { profile: snapshot.previewProfile });
      previewState.plan = plan;
      const resolvedTransportPatch = typeof transportPatch === 'function'
        ? transportPatch(snapshot.transport)
        : transportPatch;
      snapshot = {
        ...snapshot,
        document,
        compiledPlan: plan.valid ? plan : snapshot.compiledPlan,
        diagnostics: plan.diagnostics,
        transport: resolvedTransportPatch
          ? { ...snapshot.transport, ...resolvedTransportPatch }
          : snapshot.transport,
        dirty: JSON.stringify(document) !== JSON.stringify(snapshot.baselineDocument),
        saveState: snapshot.saveState.status === 'saving'
          ? snapshot.saveState
          : { ...snapshot.saveState, status: 'draft' },
        previewState: { label: previewState.label, valid: plan.valid },
      };
      emit();
      return plan.valid;
    },
    commitPreview(selection = snapshot.selection) {
      if (!previewState?.plan?.valid) return false;
      const before = previewState.startDocument;
      const after = cloneAboutNarrativeDocument(snapshot.document);
      const changed = JSON.stringify(before) !== JSON.stringify(after);
      const label = previewState.label;
      previewState = null;
      if (!changed) {
        snapshot = { ...snapshot, selection, previewState: null };
        emit();
        return false;
      }
      pushHistory(makeHistoryEntry(
        label,
        cloneAboutNarrativeDocument(before),
        cloneAboutNarrativeDocument(after),
        selection,
      ));
      compileAndSet(after, { selection, previewState: null });
      emit();
      return true;
    },
    cancelPreview() {
      if (!previewState) return false;
      const start = previewState;
      previewState = null;
      snapshot = {
        ...snapshot,
        document: cloneAboutNarrativeDocument(start.startDocument),
        compiledPlan: start.startCompiledPlan,
        diagnostics: start.startDiagnostics,
        transport: cloneAboutNarrativeDocument(start.startTransport),
        dirty: start.startDirty,
        saveState: start.startSaveState,
        previewState: null,
      };
      emit();
      return true;
    },
    undo() {
      if (historyIndex < 0) return;
      const entry = history[historyIndex];
      historyIndex -= 1;
      compileAndSet(cloneAboutNarrativeDocument(entry.before), { selection: entry.selection });
      refreshHistoryState();
      emit();
    },
    redo() {
      if (historyIndex >= history.length - 1) return;
      historyIndex += 1;
      const entry = history[historyIndex];
      compileAndSet(cloneAboutNarrativeDocument(entry.after), { selection: entry.selection });
      refreshHistoryState();
      emit();
    },
    setSelection(selection) {
      snapshot = { ...snapshot, selection };
      emit();
    },
    setTransport(patch) {
      snapshot = { ...snapshot, transport: { ...snapshot.transport, ...patch } };
      emit();
    },
    setPreviewProfile(previewProfile) {
      const plan = compileAboutNarrativeDocument(snapshot.document, { profile: previewProfile });
      snapshot = {
        ...snapshot,
        previewProfile,
        compiledPlan: plan.valid ? plan : snapshot.compiledPlan,
        diagnostics: plan.diagnostics,
      };
      emit();
    },
    setRuntimePlan(compiledPlan) {
      if (!compiledPlan?.valid) return;
      snapshot = { ...snapshot, compiledPlan, diagnostics: compiledPlan.diagnostics };
      emit();
    },
    setAutoKey(autoKey) {
      snapshot = { ...snapshot, autoKey: Boolean(autoKey) };
      emit();
    },
    setSaveState(saveState) {
      snapshot = { ...snapshot, saveState: { ...snapshot.saveState, ...saveState } };
      emit();
    },
    createSaveSubmission() {
      return Object.freeze({
        document: cloneAboutNarrativeDocument(snapshot.document),
        baselineHash: snapshot.baselineHash,
        revision: snapshot.revision,
      });
    },
    markSaved(document, baselineHash, submittedRevision = snapshot.revision) {
      const baselineDocument = cloneAboutNarrativeDocument(document);
      const newerEditsExist = snapshot.revision !== submittedRevision;
      const dirty = JSON.stringify(snapshot.document) !== JSON.stringify(baselineDocument);
      snapshot = {
        ...snapshot,
        baselineDocument,
        baselineHash,
        dirty,
        saveState: {
          status: dirty ? 'draft' : 'saved',
          message: newerEditsExist && dirty ? 'The submitted revision was saved. Newer edits remain in this draft.' : '',
          savedAt: Date.now(),
          submittedRevision,
          persistedRevision: submittedRevision,
        },
        conflictState: { available: false, remote: null, comparison: null },
      };
      emit();
      return Object.freeze({ clean: !dirty, newerEditsExist });
    },
    setBaseline(document, baselineHash) {
      const baselineDocument = cloneAboutNarrativeDocument(document);
      const dirty = JSON.stringify(snapshot.document) !== JSON.stringify(baselineDocument);
      snapshot = {
        ...snapshot,
        baselineDocument,
        baselineHash,
        dirty,
        saveState: { status: dirty ? 'draft' : 'saved', message: '', savedAt: Date.now() },
      };
      emit();
    },
    restoreBaseline() {
      return store.replaceDocument('Restore last saved', snapshot.baselineDocument);
    },
    setRecoveryState(recoveryState) {
      snapshot = { ...snapshot, recoveryState: { ...snapshot.recoveryState, ...recoveryState } };
      emit();
    },
    setConflictState(conflictState) {
      snapshot = { ...snapshot, conflictState: { ...snapshot.conflictState, ...conflictState } };
      emit();
    },
  };

  return store;
}
