import {
  compileAboutNarrativeComposerPlan,
} from './aboutNarrativeComposer.js';

export const ABOUT_NARRATIVE_QUALITY_TIERS = Object.freeze(['auto', 'desktop', 'mobile', 'master']);

const QUALITY_TIER_SET = new Set(ABOUT_NARRATIVE_QUALITY_TIERS);

const clone = (value) => structuredClone(value);
const documentsMatch = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function normalizeQualityTier(value) {
  return QUALITY_TIER_SET.has(value) ? value : 'auto';
}

function normalizeTransport(transport, durationWU) {
  const maximum = Math.max(0, Number(durationWU) || 0);
  const storyWU = Math.min(maximum, Math.max(0, Number(transport?.storyWU) || 0));
  return {
    owner: ['scroll', 'timeline', 'playback'].includes(transport?.owner)
      ? transport.owner
      : 'scroll',
    storyWU,
    playing: Boolean(transport?.playing),
    loop: transport?.loop || null,
  };
}

function compileCandidate(document) {
  const plan = compileAboutNarrativeComposerPlan(document);
  return {
    document: clone(document),
    diagnostics: clone(plan.diagnostics || []),
    plan,
    valid: Boolean(plan.valid),
  };
}

export function getAboutNarrativeParameterSaveEligibility(snapshot) {
  if (!snapshot) return Object.freeze({ allowed: false, code: 'missing-state', reason: 'The parameter panel is not ready.' });
  if (snapshot.sourceState?.readOnly || snapshot.sourceState?.status === 'read-only') {
    return Object.freeze({ allowed: false, code: 'read-only', reason: 'The canonical source is read-only.' });
  }
  if (snapshot.sourceState?.status === 'loading') {
    return Object.freeze({ allowed: false, code: 'source-loading', reason: 'Wait for the canonical source to finish loading.' });
  }
  if (snapshot.sourceState?.status === 'failed') {
    return Object.freeze({ allowed: false, code: 'source-failed', reason: 'The canonical source could not be loaded.' });
  }
  if (snapshot.saveState?.status === 'saving') {
    return Object.freeze({ allowed: false, code: 'saving', reason: 'Save is already in progress.' });
  }
  if (snapshot.saveState?.status === 'conflict' || snapshot.conflictState?.available) {
    return Object.freeze({ allowed: false, code: 'conflict', reason: 'Reload the canonical source before saving.' });
  }
  if (!snapshot.dirty) {
    return Object.freeze({ allowed: false, code: 'clean', reason: 'There are no unsaved changes.' });
  }
  if (!snapshot.baselineHash) {
    return Object.freeze({ allowed: false, code: 'missing-baseline', reason: 'The canonical source hash is unavailable.' });
  }
  if (snapshot.draftState?.valid === false) {
    return Object.freeze({ allowed: false, code: 'invalid-draft', reason: 'Resolve the parameter errors before saving.' });
  }
  if (snapshot.gestureState) {
    return Object.freeze({ allowed: false, code: 'edit-in-progress', reason: 'Finish or cancel the active edit before saving.' });
  }
  return Object.freeze({ allowed: true, code: 'ready', reason: '' });
}

/**
 * Small store for the development-only whole-scene parameter panel.
 *
 * The removed Director store owned timeline editing, clipboard operations,
 * responsive authoring profiles, checkpoints, and history. This store owns
 * only live parameter edits, canonical save state, session quality, and the
 * scroll transport contract required by the narrative runtime.
 */
export function createAboutNarrativeParameterStore(initialDocument, {
  baselineHash = '',
  qualityTier = 'auto',
} = {}) {
  const listeners = new Set();
  let gesture = null;
  const initial = compileCandidate(initialDocument);
  let snapshot = {
    document: initial.document,
    baselineDocument: clone(initial.document),
    baselineHash,
    compiledPlan: initial.valid ? initial.plan : null,
    diagnostics: initial.diagnostics,
    previewState: null,
    transport: normalizeTransport(null, initial.plan?.durationWU),
    qualityTier: normalizeQualityTier(qualityTier),
    gestureState: null,
    sourceState: {
      status: baselineHash ? 'ready' : 'loading',
      message: '',
      readOnly: false,
    },
    draftState: { revision: 0, dirty: false, valid: initial.valid },
    saveState: { status: baselineHash ? 'saved' : 'idle', message: '', savedAt: null },
    conflictState: { available: false, currentHash: '', localDocument: null, message: '' },
    dirty: false,
    revision: 0,
  };

  const emit = () => listeners.forEach((listener) => listener());
  const publishDocument = (candidate, { incrementRevision = true } = {}) => {
    const compiled = compileCandidate(candidate);
    const dirty = !documentsMatch(compiled.document, snapshot.baselineDocument);
    snapshot = {
      ...snapshot,
      document: compiled.document,
      compiledPlan: compiled.valid ? compiled.plan : snapshot.compiledPlan,
      diagnostics: compiled.diagnostics,
      transport: normalizeTransport(snapshot.transport, compiled.plan?.durationWU),
      draftState: {
        revision: incrementRevision ? snapshot.revision + 1 : snapshot.revision,
        dirty,
        valid: compiled.valid,
      },
      saveState: ['saving', 'conflict'].includes(snapshot.saveState.status)
        ? snapshot.saveState
        : { ...snapshot.saveState, status: dirty ? 'idle' : 'saved' },
      dirty,
      revision: incrementRevision ? snapshot.revision + 1 : snapshot.revision,
    };
    emit();
    return compiled.valid;
  };

  const store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    setRuntimePlan(plan) {
      if (!plan?.valid || snapshot.compiledPlan === plan) return false;
      snapshot = {
        ...snapshot,
        compiledPlan: plan,
        diagnostics: clone(plan.diagnostics || []),
        transport: normalizeTransport(snapshot.transport, plan.durationWU),
      };
      emit();
      return true;
    },
    setTransport(patch) {
      const nextTransport = normalizeTransport(
        { ...snapshot.transport, ...clone(patch) },
        snapshot.compiledPlan?.durationWU,
      );
      if (JSON.stringify(nextTransport) === JSON.stringify(snapshot.transport)) return false;
      snapshot = { ...snapshot, transport: nextTransport };
      emit();
      return true;
    },
    setQualityTier(nextTier) {
      const qualityTierValue = normalizeQualityTier(nextTier);
      if (qualityTierValue === snapshot.qualityTier) return false;
      snapshot = { ...snapshot, qualityTier: qualityTierValue };
      emit();
      return true;
    },
    commit(label, mutate, { requireValid = false } = {}) {
      if (gesture || typeof mutate !== 'function') return false;
      const candidate = clone(snapshot.document);
      mutate(candidate);
      if (documentsMatch(candidate, snapshot.document)) return false;
      const compiled = compileCandidate(candidate);
      if (requireValid && !compiled.valid) {
        snapshot = { ...snapshot, diagnostics: compiled.diagnostics };
        emit();
        return false;
      }
      return publishDocument(candidate);
    },
    beginGesture(label) {
      if (gesture) return false;
      gesture = {
        label,
        startDocument: clone(snapshot.document),
        startPlan: snapshot.compiledPlan,
        startDiagnostics: clone(snapshot.diagnostics),
        startDirty: snapshot.dirty,
      };
      snapshot = { ...snapshot, gestureState: { label, valid: true } };
      emit();
      return true;
    },
    updateGesture(mutate) {
      if (!gesture || typeof mutate !== 'function') return false;
      const candidate = clone(snapshot.document);
      mutate(candidate);
      const valid = publishDocument(candidate, { incrementRevision: false });
      snapshot = { ...snapshot, gestureState: { label: gesture.label, valid } };
      emit();
      return valid;
    },
    commitGesture({ requireValid = false } = {}) {
      if (!gesture) return false;
      if (requireValid && snapshot.gestureState?.valid !== true) return false;
      const changed = !documentsMatch(gesture.startDocument, snapshot.document);
      gesture = null;
      snapshot = {
        ...snapshot,
        gestureState: null,
        revision: changed ? snapshot.revision + 1 : snapshot.revision,
        draftState: {
          ...snapshot.draftState,
          revision: changed ? snapshot.revision + 1 : snapshot.revision,
        },
      };
      emit();
      return changed;
    },
    cancelGesture() {
      if (!gesture) return false;
      const start = gesture;
      gesture = null;
      snapshot = {
        ...snapshot,
        document: start.startDocument,
        compiledPlan: start.startPlan,
        diagnostics: start.startDiagnostics,
        dirty: start.startDirty,
        draftState: {
          revision: snapshot.revision,
          dirty: start.startDirty,
          valid: true,
        },
        gestureState: null,
      };
      emit();
      return true;
    },
    installSource(document, hash, {
      status = 'ready',
      message = '',
      readOnly = false,
      migrations = [],
    } = {}) {
      const compiled = compileCandidate(document);
      if (!compiled.valid) {
        snapshot = {
          ...snapshot,
          sourceState: {
            status: readOnly ? 'read-only' : 'failed',
            message: message || 'The canonical source is not valid.',
            readOnly: Boolean(readOnly),
            diagnostics: compiled.diagnostics,
          },
        };
        emit();
        return false;
      }
      const preserveDraft = snapshot.dirty;
      const baselineDocument = clone(compiled.document);
      snapshot = {
        ...snapshot,
        ...(preserveDraft ? {} : {
          document: clone(compiled.document),
          compiledPlan: compiled.plan,
          diagnostics: compiled.diagnostics,
          transport: normalizeTransport(snapshot.transport, compiled.plan.durationWU),
          revision: 0,
          draftState: { revision: 0, dirty: false, valid: true },
        }),
        baselineDocument,
        baselineHash: String(hash || ''),
        dirty: preserveDraft && !documentsMatch(snapshot.document, baselineDocument),
        sourceState: {
          status,
          message,
          readOnly: Boolean(readOnly),
          migrations: clone(migrations),
        },
        saveState: {
          status: preserveDraft ? 'idle' : 'saved',
          message: '',
          savedAt: null,
        },
      };
      emit();
      return true;
    },
    setSourceState(sourceState) {
      snapshot = { ...snapshot, sourceState: { ...snapshot.sourceState, ...clone(sourceState) } };
      emit();
    },
    getSaveEligibility() {
      return getAboutNarrativeParameterSaveEligibility(snapshot);
    },
    beginSave() {
      if (!store.getSaveEligibility().allowed) return null;
      const submission = Object.freeze({
        document: clone(snapshot.document),
        baselineHash: snapshot.baselineHash,
        revision: snapshot.revision,
      });
      snapshot = {
        ...snapshot,
        saveState: { status: 'saving', message: 'Validating and saving…', submittedRevision: submission.revision },
      };
      emit();
      return submission;
    },
    markSaved(document, hash, submittedRevision = snapshot.revision) {
      const compiled = compileCandidate(document);
      const newerEditsExist = snapshot.revision !== submittedRevision;
      const installPersisted = compiled.valid && !newerEditsExist;
      const dirty = installPersisted ? false : !documentsMatch(snapshot.document, compiled.document);
      snapshot = {
        ...snapshot,
        ...(installPersisted ? {
          document: clone(compiled.document),
          compiledPlan: compiled.plan,
          diagnostics: compiled.diagnostics,
          transport: normalizeTransport(snapshot.transport, compiled.plan.durationWU),
        } : {}),
        baselineDocument: clone(compiled.document),
        baselineHash: hash,
        dirty,
        draftState: { revision: snapshot.revision, dirty, valid: compiled.valid },
        sourceState: { ...snapshot.sourceState, status: 'ready', readOnly: false },
        saveState: { status: dirty ? 'idle' : 'saved', message: '', savedAt: Date.now() },
        conflictState: { available: false, currentHash: '', localDocument: null, message: '' },
      };
      emit();
      return Object.freeze({ clean: !dirty, newerEditsExist });
    },
    markSaveFailed(error) {
      snapshot = {
        ...snapshot,
        saveState: {
          status: 'failed',
          message: error?.message || String(error || 'Save failed.'),
          failedAt: Date.now(),
          diagnostics: clone(error?.diagnostics || []),
        },
      };
      emit();
    },
    markConflict({ currentHash = '', localDocument = null, message = '' } = {}) {
      snapshot = {
        ...snapshot,
        saveState: { status: 'conflict', message: message || 'The canonical source changed.' },
        conflictState: {
          available: true,
          currentHash,
          localDocument: clone(localDocument || snapshot.document),
          message,
        },
      };
      emit();
    },
    restoreBaseline() {
      if (documentsMatch(snapshot.document, snapshot.baselineDocument)) return false;
      return publishDocument(clone(snapshot.baselineDocument));
    },
  };

  return store;
}
