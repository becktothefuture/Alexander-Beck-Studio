import {
  compileAboutNarrativeTrackModel,
} from './aboutNarrativeTrackModel.js';
import { getAboutNarrativeCameraRotationFromQuaternion } from './aboutNarrativeCameraRig.js';
import {
  compileAboutNarrativeRuntimePlan,
  sampleAboutNarrativeRuntimePlan,
} from './aboutNarrativeRuntimePlan.js';
import {
  createAboutNarrativeTrackClipboardPayload,
  createAboutNarrativeTrackObjectAtWU,
  deleteAboutNarrativeTrackObjects,
  distributeAboutNarrativeTextFieldsEvenly,
  duplicateAboutNarrativeTrackObjects,
  getAboutNarrativeTrackObject,
  moveAboutNarrativeTrackObjectsByWU,
  normalizeAboutNarrativeTrackSelection,
  pasteAboutNarrativeTrackClipboardPayload,
  resizeAboutNarrativeInteractionEdge,
  resizeAboutNarrativeTextFieldEdge,
  resizeAboutNarrativeWorldEnd,
  synchronizeAboutNarrativeDurationToText,
  validateAboutNarrativeTrackClipboardPayload,
} from './aboutNarrativeTrackEditing.js';

const MAX_HISTORY_COMMANDS = 100;
const MAX_HISTORY_BYTES = 5 * 1024 * 1024;
const LAYOUT_PROFILES = new Set(['desktop', 'tablet', 'mobile']);
const ORIENTATIONS = new Set(['portrait', 'landscape']);
const MOTION_PROFILES = new Set(['full', 'reduced']);
const TRANSPORT_OWNERS = new Set(['scroll', 'timeline', 'playback']);

const clone = (value) => structuredClone(value);
const documentBytes = (document) => JSON.stringify(document).length * 2;
const documentsMatch = (left, right) => JSON.stringify(left) === JSON.stringify(right);

function makeHistoryEntry(label, before, after, beforeSelection, afterSelection) {
  return {
    label,
    before,
    after,
    beforeSelection,
    afterSelection,
    bytes: documentBytes(before) + documentBytes(after),
  };
}

function makeRejectedEdit(label, diagnostics, reason = '') {
  return {
    label,
    reason: reason || diagnostics.find((item) => item.level === 'error')?.message || 'The edit is not valid.',
    diagnostics: clone(diagnostics),
  };
}

function replaceDraft(draft, document) {
  Object.keys(draft).forEach((key) => delete draft[key]);
  Object.assign(draft, clone(document));
}

function getAllIds(model) {
  return new Set([
    ...(model?.tracks?.camera?.keys || []).map((item) => item.id),
    ...(model?.tracks?.visibility?.keys || []).map((item) => item.id),
    ...(model?.tracks?.worlds?.objects || []).map((item) => item.id),
    ...(model?.tracks?.text?.fields || []).map((item) => item.id),
    ...(model?.tracks?.interactions?.clips || []).map((item) => item.id),
  ]);
}

function createUniqueId(model, base) {
  const ids = getAllIds(model);
  let id = base;
  let suffix = 2;
  while (ids.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function selectionMembers(selection) {
  if (!selection?.id || selection.type === 'track') return [];
  const members = [{ type: selection.type, id: selection.id }, ...(selection.members || [])];
  const seen = new Set();
  return members.filter((member) => {
    const key = `${member?.type}:${member?.id}`;
    if (!member?.id || member.type !== selection.type || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function hasProtectedSelection(document, selection) {
  return selectionMembers(normalizeAboutNarrativeTrackSelection(selection, document)).some((member) => {
    const object = getAboutNarrativeTrackObject(document, member);
    return object?.protected === true || object?.locked === true;
  });
}

/*
 * The pure editing helpers intentionally do not depend on the strict schema.
 * This boundary removes their migration-only `locked` marker from non-Camera
 * objects and supplies the two required authoring defaults that need stable IDs.
 */
function prepareOperationDocument(input) {
  const document = clone(input);
  (document.tracks?.worlds?.objects || []).forEach((world) => delete world.locked);
  (document.tracks?.visibility?.keys || []).forEach((key) => {
    if (key.locked !== true) key.locked = false;
  });
  (document.tracks?.text?.fields || []).forEach((field) => {
    delete field.locked;
    if (field.kind === 'stub') {
      field.label ||= 'Untitled stub';
      delete field.text;
    }
    if (field.kind === 'scroll-block') {
      field.block ||= {};
      field.block.id ||= `${field.id}-block`;
    }
  });
  (document.tracks?.interactions?.clips || []).forEach((clip) => delete clip.locked);
  return document;
}

function defaultPreviewState(input = {}) {
  const candidate = input || {};
  return {
    layoutProfile: LAYOUT_PROFILES.has(candidate.layoutProfile) ? candidate.layoutProfile : 'desktop',
    orientation: ORIENTATIONS.has(candidate.orientation) ? candidate.orientation : 'landscape',
    motionProfile: MOTION_PROFILES.has(candidate.motionProfile) ? candidate.motionProfile : 'full',
  };
}

function normalizeTransport(input, durationWU) {
  const candidate = input || {};
  const duration = Math.max(0, Number(durationWU) || 0);
  const clampWU = (value) => Math.min(duration, Math.max(0, Number(value) || 0));
  let loop = null;
  if (candidate.loop && Number.isFinite(Number(candidate.loop.startWU)) && Number.isFinite(Number(candidate.loop.endWU))) {
    const startWU = clampWU(candidate.loop.startWU);
    const endWU = clampWU(candidate.loop.endWU);
    if (endWU > startWU) loop = { startWU, endWU };
  }
  return {
    owner: TRANSPORT_OWNERS.has(candidate.owner) ? candidate.owner : 'scroll',
    storyWU: clampWU(candidate.storyWU),
    playing: candidate.playing === true,
    liveAmbient: candidate.liveAmbient !== false,
    loop,
  };
}

export function createAboutNarrativeTrackEditorStore(initialDocument, {
  initialSelection = { type: 'track', id: 'world' },
  previewState = null,
  legacySelectionMap = null,
} = {}) {
  const listeners = new Set();
  const initialCandidate = clone(initialDocument);
  const initialPlan = compileAboutNarrativeTrackModel(initialCandidate);
  const ownedInitialDocument = initialPlan.valid ? clone(initialPlan.model) : initialCandidate;
  const baselineDocument = clone(ownedInitialDocument);
  let history = [];
  let historyIndex = -1;
  let historyBytes = 0;
  let gesture = null;
  let tryState = null;

  let snapshot = {
    document: ownedInitialDocument,
    baselineDocument,
    compiledPlan: initialPlan.valid ? initialPlan : null,
    lastValidPlan: initialPlan.valid ? initialPlan : null,
    diagnostics: clone(initialPlan.diagnostics),
    selection: normalizeAboutNarrativeTrackSelection(initialSelection, ownedInitialDocument, { legacySelectionMap }),
    previewState: defaultPreviewState(previewState),
    transport: normalizeTransport(null, initialPlan.durationWU),
    clipboard: null,
    history: { canUndo: false, canRedo: false, undoLabel: '', redoLabel: '' },
    gestureState: null,
    tryState: null,
    rejectedEdit: null,
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
    history.push(entry);
    historyBytes += entry.bytes;
    historyIndex = history.length - 1;
    trimHistory();
    refreshHistoryState();
  };

  const compileCandidate = (document) => {
    const plan = compileAboutNarrativeTrackModel(document);
    return {
      plan,
      document: plan.valid ? clone(plan.model) : clone(document),
    };
  };

  const publishDocument = ({
    label,
    document,
    beforeDocument = snapshot.document,
    beforeSelection = snapshot.selection,
    afterSelection = snapshot.selection,
    requireValid = false,
    recordHistory = true,
  }) => {
    const compiled = compileCandidate(document);
    if (requireValid && !compiled.plan.valid) {
      snapshot = {
        ...snapshot,
        rejectedEdit: makeRejectedEdit(label, compiled.plan.diagnostics),
      };
      emit();
      return false;
    }
    const normalizedSelection = normalizeAboutNarrativeTrackSelection(
      afterSelection,
      compiled.document,
      { legacySelectionMap },
    );
    if (recordHistory && !documentsMatch(beforeDocument, compiled.document)) {
      pushHistory(makeHistoryEntry(
        label,
        clone(beforeDocument),
        clone(compiled.document),
        clone(beforeSelection),
        clone(normalizedSelection),
      ));
    }
    const nextValidPlan = compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan;
    const nextTransport = normalizeTransport(snapshot.transport, nextValidPlan?.durationWU);
    snapshot = {
      ...snapshot,
      document: compiled.document,
      compiledPlan: nextValidPlan,
      lastValidPlan: nextValidPlan,
      diagnostics: clone(compiled.plan.diagnostics),
      selection: normalizedSelection,
      transport: nextTransport,
      gestureState: null,
      tryState: null,
      rejectedEdit: null,
      dirty: !documentsMatch(compiled.document, snapshot.baselineDocument),
      revision: snapshot.revision + 1,
    };
    gesture = null;
    tryState = null;
    refreshHistoryState();
    emit();
    return true;
  };

  const rejectBusyEdit = (label) => {
    snapshot = {
      ...snapshot,
      rejectedEdit: {
        label,
        reason: gesture ? 'Finish or cancel the active gesture first.' : 'Apply or cancel the active try state first.',
        diagnostics: [],
      },
    };
    emit();
    return false;
  };

  const applyOperation = (label, result, { requireValid = true } = {}) => {
    if (!result?.valid || !result.model) {
      snapshot = {
        ...snapshot,
        rejectedEdit: {
          label,
          reason: result?.reason || 'The track operation could not be completed.',
          diagnostics: [],
        },
      };
      emit();
      return false;
    }
    return publishDocument({
      label,
      document: prepareOperationDocument(result.model),
      afterSelection: result.selection || snapshot.selection,
      requireValid,
    });
  };

  const store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    commit(label, mutate, {
      selectionAfter = snapshot.selection,
      requireValid = false,
    } = {}) {
      if (gesture || tryState) return rejectBusyEdit(label);
      if (typeof mutate !== 'function') return false;
      const candidate = clone(snapshot.document);
      mutate(candidate);
      if (documentsMatch(candidate, snapshot.document)) return false;
      return publishDocument({ label, document: candidate, afterSelection: selectionAfter, requireValid });
    },
    replaceDocument(label, document, options = {}) {
      return store.commit(label, (draft) => replaceDraft(draft, document), options);
    },
    undo() {
      if (gesture || tryState || historyIndex < 0) return false;
      const entry = history[historyIndex];
      historyIndex -= 1;
      const compiled = compileCandidate(entry.before);
      const nextValidPlan = compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan;
      snapshot = {
        ...snapshot,
        document: compiled.document,
        compiledPlan: nextValidPlan,
        lastValidPlan: nextValidPlan,
        diagnostics: clone(compiled.plan.diagnostics),
        selection: normalizeAboutNarrativeTrackSelection(entry.beforeSelection, compiled.document, { legacySelectionMap }),
        transport: normalizeTransport(snapshot.transport, nextValidPlan?.durationWU),
        rejectedEdit: null,
        dirty: !documentsMatch(compiled.document, snapshot.baselineDocument),
        revision: snapshot.revision + 1,
      };
      refreshHistoryState();
      emit();
      return true;
    },
    redo() {
      if (gesture || tryState || historyIndex >= history.length - 1) return false;
      historyIndex += 1;
      const entry = history[historyIndex];
      const compiled = compileCandidate(entry.after);
      const nextValidPlan = compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan;
      snapshot = {
        ...snapshot,
        document: compiled.document,
        compiledPlan: nextValidPlan,
        lastValidPlan: nextValidPlan,
        diagnostics: clone(compiled.plan.diagnostics),
        selection: normalizeAboutNarrativeTrackSelection(entry.afterSelection, compiled.document, { legacySelectionMap }),
        transport: normalizeTransport(snapshot.transport, nextValidPlan?.durationWU),
        rejectedEdit: null,
        dirty: !documentsMatch(compiled.document, snapshot.baselineDocument),
        revision: snapshot.revision + 1,
      };
      refreshHistoryState();
      emit();
      return true;
    },
    setSelection(selection) {
      snapshot = {
        ...snapshot,
        selection: normalizeAboutNarrativeTrackSelection(selection, snapshot.document, { legacySelectionMap }),
      };
      emit();
    },
    beginGesture(label, { selection = snapshot.selection } = {}) {
      if (gesture || tryState) return false;
      gesture = {
        label,
        startDocument: clone(snapshot.document),
        startSelection: clone(snapshot.selection),
        startCompiledPlan: snapshot.compiledPlan,
        startLastValidPlan: snapshot.lastValidPlan,
        startDiagnostics: clone(snapshot.diagnostics),
        startDirty: snapshot.dirty,
      };
      snapshot = {
        ...snapshot,
        selection: normalizeAboutNarrativeTrackSelection(selection, snapshot.document, { legacySelectionMap }),
        gestureState: { label, valid: true },
        rejectedEdit: null,
      };
      emit();
      return true;
    },
    updateGesture(mutate, { selection = snapshot.selection } = {}) {
      if (!gesture || typeof mutate !== 'function') return false;
      const candidate = clone(snapshot.document);
      mutate(candidate);
      const compiled = compileCandidate(candidate);
      const nextValidPlan = compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan;
      snapshot = {
        ...snapshot,
        document: compiled.document,
        compiledPlan: nextValidPlan,
        lastValidPlan: nextValidPlan,
        diagnostics: clone(compiled.plan.diagnostics),
        selection: normalizeAboutNarrativeTrackSelection(selection, compiled.document, { legacySelectionMap }),
        gestureState: { label: gesture.label, valid: compiled.plan.valid },
        rejectedEdit: null,
        dirty: !documentsMatch(compiled.document, snapshot.baselineDocument),
      };
      emit();
      return compiled.plan.valid;
    },
    updateGestureMove(deltaWU) {
      if (!gesture) return false;
      if (hasProtectedSelection(gesture.startDocument, gesture.startSelection)) {
        return applyOperation('Move track objects', { valid: false, reason: 'A protected object cannot be moved.' });
      }
      const result = moveAboutNarrativeTrackObjectsByWU({
        model: gesture.startDocument,
        selection: gesture.startSelection,
        deltaWU,
      });
      if (!result.valid) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: gesture.label, reason: result.reason, diagnostics: [] },
        };
        emit();
        return false;
      }
      return store.updateGesture(
        (draft) => replaceDraft(draft, prepareOperationDocument(result.model)),
        { selection: result.selection },
      );
    },
    updateGestureResizeText(id, edge, atWU) {
      if (!gesture) return false;
      const field = getAboutNarrativeTrackObject(gesture.startDocument, { type: 'text-field', id });
      if (field?.protected === true || field?.locked === true) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: gesture.label, reason: 'A protected Text field cannot be resized.', diagnostics: [] },
        };
        emit();
        return false;
      }
      const result = resizeAboutNarrativeTextFieldEdge({
        model: gesture.startDocument,
        id,
        edge,
        atWU,
      });
      if (!result.valid) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: gesture.label, reason: result.reason, diagnostics: [] },
        };
        emit();
        return false;
      }
      return store.updateGesture(
        (draft) => replaceDraft(draft, prepareOperationDocument(result.model)),
        { selection: { type: 'text-field', id } },
      );
    },
    updateGestureResizeInteraction(id, edge, atWU) {
      if (!gesture) return false;
      const clip = getAboutNarrativeTrackObject(gesture.startDocument, { type: 'interaction', id });
      if (clip?.protected === true || clip?.locked === true) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: gesture.label, reason: 'A protected Motion clip cannot be resized.', diagnostics: [] },
        };
        emit();
        return false;
      }
      const result = resizeAboutNarrativeInteractionEdge({
        model: gesture.startDocument,
        id,
        edge,
        atWU,
      });
      if (!result.valid) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: gesture.label, reason: result.reason, diagnostics: [] },
        };
        emit();
        return false;
      }
      return store.updateGesture(
        (draft) => replaceDraft(draft, prepareOperationDocument(result.model)),
        { selection: { type: 'interaction', id } },
      );
    },
    updateGestureResizeWorldEnd(id, atWU) {
      if (!gesture) return false;
      const result = resizeAboutNarrativeWorldEnd({
        model: gesture.startDocument,
        id,
        atWU,
      });
      if (!result.valid) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: gesture.label, reason: result.reason, diagnostics: [] },
        };
        emit();
        return false;
      }
      return store.updateGesture(
        (draft) => replaceDraft(draft, prepareOperationDocument(result.model)),
        { selection: { type: 'world', id } },
      );
    },
    commitGesture({ selectionAfter = snapshot.selection, requireValid = false } = {}) {
      if (!gesture) return false;
      if (requireValid && snapshot.gestureState?.valid !== true) {
        snapshot = {
          ...snapshot,
          rejectedEdit: makeRejectedEdit(gesture.label, snapshot.diagnostics),
        };
        emit();
        return false;
      }
      const start = gesture;
      const normalizedSelection = normalizeAboutNarrativeTrackSelection(selectionAfter, snapshot.document, { legacySelectionMap });
      gesture = null;
      if (documentsMatch(start.startDocument, snapshot.document)) {
        snapshot = { ...snapshot, selection: normalizedSelection, gestureState: null };
        emit();
        return false;
      }
      pushHistory(makeHistoryEntry(
        start.label,
        clone(start.startDocument),
        clone(snapshot.document),
        clone(start.startSelection),
        clone(normalizedSelection),
      ));
      snapshot = {
        ...snapshot,
        selection: normalizedSelection,
        gestureState: null,
        rejectedEdit: null,
        revision: snapshot.revision + 1,
      };
      refreshHistoryState();
      emit();
      return true;
    },
    cancelGesture() {
      if (!gesture) return false;
      const start = gesture;
      gesture = null;
      snapshot = {
        ...snapshot,
        document: clone(start.startDocument),
        compiledPlan: start.startCompiledPlan,
        lastValidPlan: start.startLastValidPlan,
        diagnostics: clone(start.startDiagnostics),
        selection: clone(start.startSelection),
        gestureState: null,
        rejectedEdit: null,
        dirty: start.startDirty,
      };
      emit();
      return true;
    },
    beginTry(label, mutate) {
      if (gesture || tryState || typeof mutate !== 'function') return false;
      const candidate = clone(snapshot.document);
      mutate(candidate);
      const compiled = compileCandidate(candidate);
      tryState = {
        label,
        document: compiled.document,
        plan: compiled.plan,
        startDiagnostics: clone(snapshot.diagnostics),
      };
      snapshot = {
        ...snapshot,
        diagnostics: clone(compiled.plan.diagnostics),
        tryState: { label, valid: compiled.plan.valid, document: clone(compiled.document) },
        rejectedEdit: null,
      };
      emit();
      return compiled.plan.valid;
    },
    updateTry(mutate) {
      if (!tryState || typeof mutate !== 'function') return false;
      const candidate = clone(tryState.document);
      mutate(candidate);
      const compiled = compileCandidate(candidate);
      tryState = { ...tryState, document: compiled.document, plan: compiled.plan };
      snapshot = {
        ...snapshot,
        diagnostics: clone(compiled.plan.diagnostics),
        tryState: { label: tryState.label, valid: compiled.plan.valid, document: clone(compiled.document) },
        rejectedEdit: null,
      };
      emit();
      return compiled.plan.valid;
    },
    applyTry({ selectionAfter = snapshot.selection } = {}) {
      if (!tryState?.plan?.valid) return false;
      const currentTry = tryState;
      tryState = null;
      snapshot = { ...snapshot, tryState: null };
      return publishDocument({
        label: currentTry.label,
        document: currentTry.document,
        afterSelection: selectionAfter,
        requireValid: true,
      });
    },
    cancelTry() {
      if (!tryState) return false;
      const currentTry = tryState;
      tryState = null;
      snapshot = {
        ...snapshot,
        diagnostics: currentTry.startDiagnostics,
        tryState: null,
        rejectedEdit: null,
      };
      emit();
      return true;
    },
    setPreviewState(patch) {
      const candidate = { ...snapshot.previewState, ...patch };
      if (!LAYOUT_PROFILES.has(candidate.layoutProfile)
        || !ORIENTATIONS.has(candidate.orientation)
        || !MOTION_PROFILES.has(candidate.motionProfile)) return false;
      snapshot = { ...snapshot, previewState: candidate };
      emit();
      return true;
    },
    setTransport(patch = {}) {
      const candidate = normalizeTransport(
        { ...snapshot.transport, ...patch },
        snapshot.lastValidPlan?.durationWU,
      );
      if (JSON.stringify(candidate) === JSON.stringify(snapshot.transport)) return false;
      snapshot = { ...snapshot, transport: candidate };
      emit();
      return true;
    },
    setClipboard(payload) {
      if (payload == null) {
        snapshot = { ...snapshot, clipboard: null };
        emit();
        return true;
      }
      const validation = validateAboutNarrativeTrackClipboardPayload(payload);
      if (!validation.valid) {
        snapshot = {
          ...snapshot,
          rejectedEdit: { label: 'Set clipboard', reason: validation.reason, diagnostics: [] },
        };
        emit();
        return false;
      }
      snapshot = { ...snapshot, clipboard: clone(validation.payload), rejectedEdit: null };
      emit();
      return true;
    },
    copySelection() {
      const payload = createAboutNarrativeTrackClipboardPayload({
        model: snapshot.document,
        selection: snapshot.selection,
      });
      if (payload.valid === false) return applyOperation('Copy track objects', payload);
      snapshot = { ...snapshot, clipboard: clone(payload), rejectedEdit: null };
      emit();
      return true;
    },
    createObject({ track, kind = null, atWU, ...options }) {
      if (gesture || tryState) return rejectBusyEdit('Create track object');
      const base = kind || (track === 'camera'
        ? 'camera-key'
        : track === 'visibility' ? 'visibility-key' : track);
      const id = options.id || createUniqueId(snapshot.document, base);
      const operationOptions = { ...options, id };
      if (track === 'text' && kind === 'scroll-block') {
        operationOptions.template = {
          ...options.template,
          block: {
            id: `${id}-block`,
            kind: 'prose',
            text: 'New editorial paragraph.',
            ...(options.template?.block || {}),
          },
        };
      }
      if (track === 'text' && kind === 'stub') {
        operationOptions.template = { label: 'Untitled stub', ...options.template };
      }
      if (track === 'world') {
        operationOptions.template = options.template
          ? { ...options.template, protected: false }
          : options.template;
      }
      const publishedPlan = ['camera', 'visibility'].includes(track) && snapshot.compiledPlan?.valid
        ? compileAboutNarrativeRuntimePlan(snapshot.document, snapshot.previewState)
        : null;
      if (track === 'camera' && !operationOptions.cameraKey && publishedPlan?.valid) {
        const frame = sampleAboutNarrativeRuntimePlan(publishedPlan, atWU);
        operationOptions.cameraKey = {
          position: [...frame.camera.position],
          rotation: getAboutNarrativeCameraRotationFromQuaternion(frame.camera.quaternion),
          fov: frame.camera.fov,
        };
      }
      if (track === 'visibility' && !operationOptions.visibilityKey && publishedPlan?.valid) {
        const frame = sampleAboutNarrativeRuntimePlan(publishedPlan, atWU);
        operationOptions.visibilityKey = {
          visibility: frame.simulation.visibility,
        };
      }
      if (track === 'interaction') operationOptions.interactionType ||= 'horizontal-spin';
      const result = createAboutNarrativeTrackObjectAtWU({
        model: snapshot.document,
        track,
        kind,
        atWU,
        ...operationOptions,
      });
      if (result.valid && track === 'world') {
        const created = getAboutNarrativeTrackObject(result.model, result.selection);
        if (created) created.protected = false;
      }
      return applyOperation(`Create ${kind || track}`, result);
    },
    moveSelection(deltaWU, options = {}) {
      if (gesture || tryState) return rejectBusyEdit('Move track objects');
      if (hasProtectedSelection(snapshot.document, snapshot.selection)) {
        return applyOperation('Move track objects', { valid: false, reason: 'A protected object cannot be moved.' });
      }
      return applyOperation('Move track objects', moveAboutNarrativeTrackObjectsByWU({
        model: snapshot.document,
        selection: snapshot.selection,
        deltaWU,
        ...options,
      }));
    },
    distributeTextEvenly() {
      if (gesture || tryState) return rejectBusyEdit('Space Text evenly');
      return applyOperation('Space Text evenly', distributeAboutNarrativeTextFieldsEvenly({
        model: snapshot.document,
      }));
    },
    setTextTiming(id, field, value) {
      if (gesture || tryState) return rejectBusyEdit('Edit Text timing');
      if (!['startWU', 'endWU'].includes(field) || !Number.isFinite(Number(value))) return false;
      const previousDurationWU = Number(snapshot.document.profiles?.desktop?.storyDurationWU);
      const previousTextDurationWU = Math.max(
        0,
        ...snapshot.document.tracks.text.fields.map((item) => Number(item.endWU)).filter(Number.isFinite),
      );
      return store.commit('Edit Text timing', (draft) => {
        const target = getAboutNarrativeTrackObject(draft, { type: 'text-field', id });
        if (!target) return;
        target[field] = Number(value);
        synchronizeAboutNarrativeDurationToText(draft, previousDurationWU, {
          allowShrink: Math.abs(previousTextDurationWU - previousDurationWU) <= 0.000001,
        });
      }, { selectionAfter: { type: 'text-field', id }, requireValid: true });
    },
    deleteSelection() {
      if (gesture || tryState) return rejectBusyEdit('Delete track objects');
      if (hasProtectedSelection(snapshot.document, snapshot.selection)) {
        return applyOperation('Delete track objects', { valid: false, reason: 'A protected object cannot be deleted.' });
      }
      return applyOperation('Delete track objects', deleteAboutNarrativeTrackObjects({
        model: snapshot.document,
        selection: snapshot.selection,
      }));
    },
    duplicateSelection(options = {}) {
      if (gesture || tryState) return rejectBusyEdit('Duplicate track objects');
      if (hasProtectedSelection(snapshot.document, snapshot.selection)) {
        return applyOperation('Duplicate track objects', { valid: false, reason: 'A protected object cannot be duplicated.' });
      }
      return applyOperation('Duplicate track objects', duplicateAboutNarrativeTrackObjects({
        model: snapshot.document,
        selection: snapshot.selection,
        ...options,
      }));
    },
    pasteClipboard({ atWU }) {
      if (gesture || tryState) return rejectBusyEdit('Paste track objects');
      return applyOperation('Paste track objects', pasteAboutNarrativeTrackClipboardPayload({
        model: snapshot.document,
        payload: snapshot.clipboard,
        atWU,
      }));
    },
    markBaseline(document = snapshot.document) {
      const baseline = clone(document);
      snapshot = {
        ...snapshot,
        baselineDocument: baseline,
        dirty: !documentsMatch(snapshot.document, baseline),
      };
      emit();
    },
  };

  return store;
}
