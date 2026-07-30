import { getAboutNarrativeCameraRotationFromQuaternion } from './aboutNarrativeCameraRig.js';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
} from './aboutNarrativeDefinitions.js';
import {
  deleteAboutNarrativePointFieldState,
  duplicateAboutNarrativePointFieldState,
  makeAboutNarrativePointFieldKeyStateUnique,
  moveAboutNarrativePointFieldKey,
  moveAboutNarrativePointFieldSegment,
  normalizeAboutNarrativePointFieldSelection,
  resetAboutNarrativePointFieldOverride,
  splitAboutNarrativePointFieldSegment,
  writeAboutNarrativePointFieldTarget,
} from './aboutNarrativePointFieldEditing.js';
import {
  compileAboutNarrativeRendererRuntimePlan,
} from './aboutNarrativePointFieldRendererBridge.js';
import { applyAboutNarrativePointFieldOverrides } from './aboutNarrativePointFieldSchema.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES,
  ABOUT_NARRATIVE_POINT_FIELD_MOTION_AXES,
  ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES,
  ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES,
} from './aboutNarrativePointFieldMotion.js';
import { sampleAboutNarrativeRuntimePlan } from './aboutNarrativeRuntimePlan.js';
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
  synchronizeAboutNarrativeDurationToText,
  validateAboutNarrativeTrackClipboardPayload,
} from './aboutNarrativeTrackEditing.js';

const MAX_HISTORY_COMMANDS = 100;
const MAX_HISTORY_BYTES = 5 * 1024 * 1024;
const LAYOUT_PROFILES = new Set(['desktop', 'tablet', 'mobile']);
const ORIENTATIONS = new Set(['portrait', 'landscape']);
const MOTION_PROFILES = new Set(['full', 'reduced']);
const TRANSPORT_OWNERS = new Set(['scroll', 'timeline', 'playback']);
const POINT_FIELD_TYPES = new Set([
  'point-field-state',
  'point-field-key',
  'point-field-segment',
]);
const POINT_FIELD_PROFILE_IDS = Object.freeze(['desktop', 'tablet', 'mobile']);
const POINT_FIELD_TIME_EPSILON = 0.000001;
const POINT_FIELD_COLLECTION_BY_TYPE = Object.freeze({
  'point-field-state': 'stateDefinitions',
  'point-field-key': 'keys',
  'point-field-segment': 'segments',
});
const POINT_FIELD_BASE_PATCH_KEYS = Object.freeze({
  'point-field-state': new Set([
    'label',
    'adapterId',
    'shapeId',
    'seed',
    'railAnchorWU',
    'entryDistanceWU',
    'transform',
    'shapeParameters',
    'modifiers',
  ]),
  'point-field-key': new Set(['stateId']),
  'point-field-segment': new Set(['transition']),
});
const POINT_FIELD_PROFILE_PATCH_KEYS = Object.freeze({
  'point-field-state': new Set(['railAnchorWU', 'transform']),
  'point-field-key': new Set(['atWU']),
  'point-field-segment': new Set(['transition']),
});

export function getAboutNarrativeSaveEligibility(snapshot) {
  if (!snapshot) return Object.freeze({ allowed: false, code: 'missing-state', reason: 'The editor is not ready.' });
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
    return Object.freeze({ allowed: false, code: 'conflict', reason: 'Resolve the canonical conflict before saving.' });
  }
  if (!snapshot.dirty) {
    return Object.freeze({ allowed: false, code: 'clean', reason: 'There are no unsaved changes.' });
  }
  if (!snapshot.baselineHash) {
    return Object.freeze({ allowed: false, code: 'missing-baseline', reason: 'The canonical source hash is unavailable.' });
  }
  const invalid = snapshot.draftState?.valid === false
    || (snapshot.diagnostics || []).some((item) => item.level === 'error');
  if (invalid) {
    return Object.freeze({ allowed: false, code: 'invalid-draft', reason: 'Resolve the draft errors before saving.' });
  }
  if (snapshot.gestureState || snapshot.tryState) {
    return Object.freeze({ allowed: false, code: 'edit-in-progress', reason: 'Finish or cancel the active edit before saving.' });
  }
  return Object.freeze({ allowed: true, code: 'ready', reason: '' });
}

const clone = (value) => structuredClone(value);
const documentsMatch = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const freezeOwned = (value) => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freezeOwned);
  return Object.freeze(value);
};
const documentBytes = (document) => JSON.stringify(document).length * 2;
const cleanWU = (value) => Number(Number(value).toFixed(6));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const isPlainObject = (value) => Boolean(value)
  && typeof value === 'object'
  && !Array.isArray(value);

function mergePointFieldPatch(base, patch) {
  if (!isPlainObject(base) || !isPlainObject(patch)) return clone(patch);
  const output = clone(base);
  Object.entries(patch).forEach(([key, value]) => {
    output[key] = isPlainObject(value) && isPlainObject(output[key])
      ? mergePointFieldPatch(output[key], value)
      : clone(value);
  });
  return output;
}

function invalidPointFieldPreview(reason) {
  return Object.freeze({ valid: false, reason, diagnostics: Object.freeze([]) });
}

function controlsAreValid(parameters, controls) {
  if (!isPlainObject(parameters)) return false;
  return controls.every((control) => {
    const value = parameters[control.id];
    if (control.type === 'select') return control.options.includes(value);
    return Number.isFinite(Number(value))
      && Number(value) >= Number(control.min)
      && Number(value) <= Number(control.max);
  });
}

function statePatchIsLocallyValid(state) {
  if (typeof state.label !== 'string' || !state.label.trim()) return false;
  if (!Number.isInteger(Number(state.seed)) || Number(state.seed) < 0) return false;
  if (!Number.isFinite(Number(state.railAnchorWU))
    || !Number.isFinite(Number(state.entryDistanceWU))) return false;
  const transform = state.transform;
  if (!isPlainObject(transform)) return false;
  if (['position', 'rotation'].some((key) => (
    !Array.isArray(transform[key])
    || transform[key].length !== 3
    || transform[key].some((value) => !Number.isFinite(Number(value)))
  ))) return false;
  if (!Number.isFinite(Number(transform.scale)) || Number(transform.scale) <= 0) return false;
  if (Object.entries(transform).some(([key, value]) => {
    if (['position', 'rotation'].includes(key)) return false;
    if (!Number.isFinite(Number(value))) return true;
    return key.toLowerCase().includes('scale') && Number(value) <= 0;
  })) return false;
  const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[state.shapeId];
  if (!shape || shape.adapterId !== state.adapterId) return false;
  if (!controlsAreValid(state.shapeParameters, shape.parameters)) return false;
  return (state.modifiers || []).every((modifier) => {
    const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
    return definition && controlsAreValid(modifier.parameters, definition.parameters);
  });
}

function finitePatchLeaves(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(finitePatchLeaves);
  if (isPlainObject(value)) return Object.values(value).every(finitePatchLeaves);
  return true;
}

function transitionPatchIsLocallyValid(transition) {
  if (!isPlainObject(transition) || !finitePatchLeaves(transition)) return false;
  if (!['hold', 'morph', 'step-end'].includes(transition.type)) return false;
  if (!ABOUT_NARRATIVE_EASINGS.includes(transition.easing)) return false;
  if (transition.correspondence != null
    && !ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(transition.correspondence)) return false;
  const groups = ['stagger', 'path', 'flatten'];
  if (groups.some((group) => !isPlainObject(transition[group]))) return false;
  if (!ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES.includes(transition.stagger.mode)
    || !ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES.includes(transition.path.mode)
    || !ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES.includes(transition.flatten.mode)) return false;
  if (groups.some((group) => (
    transition[group].axis != null
    && !ABOUT_NARRATIVE_POINT_FIELD_MOTION_AXES.includes(transition[group].axis)
  ))) return false;
  if ([transition.stagger.amount, transition.path.amount, transition.flatten.amount]
    .some((value) => Number(value) < 0 || Number(value) > 1)) return false;
  if (Number(transition.path.frequency) < 0.25 || Number(transition.path.frequency) > 8) return false;
  if (Number(transition.flatten.offset) < -8 || Number(transition.flatten.offset) > 8) return false;
  return true;
}

function previewPointFieldPatch(input, {
  type,
  id,
  scope = 'base',
  patch,
} = {}) {
  if (scope !== 'base' && !POINT_FIELD_PROFILE_IDS.includes(scope)) {
    return invalidPointFieldPreview(`Unknown point-field edit scope “${scope}”.`);
  }
  const collection = POINT_FIELD_COLLECTION_BY_TYPE[type];
  if (!collection) return invalidPointFieldPreview(`Unknown point-field target type “${type}”.`);
  if (!isPlainObject(patch)) {
    return invalidPointFieldPreview('Point-field target patch must be an object.');
  }
  const allowed = scope === 'base'
    ? POINT_FIELD_BASE_PATCH_KEYS[type]
    : POINT_FIELD_PROFILE_PATCH_KEYS[type];
  const unsupported = Object.keys(patch).find((key) => !allowed.has(key));
  if (unsupported) {
    return invalidPointFieldPreview(
      `Field “${unsupported}” cannot be edited in the ${scope} ${type} scope.`,
    );
  }
  if (type === 'point-field-key' && Object.hasOwn(patch, 'atWU')) {
    if (Object.keys(patch).length !== 1) {
      return invalidPointFieldPreview('Key timing must be written as one atomic point-field edit.');
    }
    return previewPointFieldKeyMove(input, { keyId: id, atWU: patch.atWU, scope });
  }
  const document = clone(input);
  const target = document.tracks.pointField[collection].find((item) => item.id === id);
  if (!target) return invalidPointFieldPreview(`Point-field target “${id}” does not exist.`);
  if (target.protected === true && type === 'point-field-key') {
    return invalidPointFieldPreview('Protected point-field keys cannot change state ownership.');
  }
  if (target.protected === true && type === 'point-field-state'
    && (Object.hasOwn(patch, 'adapterId') || Object.hasOwn(patch, 'shapeId'))) {
    return invalidPointFieldPreview('The protected finale state cannot change shape or adapter.');
  }
  if (scope === 'base') Object.assign(target, mergePointFieldPatch(target, patch));
  else {
    const overrides = document.profiles[scope].overrides.pointField[collection];
    overrides[id] = mergePointFieldPatch(overrides[id] || {}, patch);
  }
  const resolvedTarget = scope === 'base'
    ? target
    : getResolvedPointField(document, scope)[collection].find((item) => item.id === id);
  if (type === 'point-field-state' && !statePatchIsLocallyValid(resolvedTarget)) {
    return invalidPointFieldPreview('The point-field state patch is outside its editor-safe bounds.');
  }
  if (type === 'point-field-segment'
    && !transitionPatchIsLocallyValid(resolvedTarget.transition)) {
    return invalidPointFieldPreview('The point-field transition patch is outside its editor-safe bounds.');
  }
  if (type === 'point-field-key' && !document.tracks.pointField.stateDefinitions
    .some((state) => state.id === target.stateId)) {
    return invalidPointFieldPreview('The point-field key targets a missing state.');
  }
  return Object.freeze({
    valid: true,
    document,
    selection: { type, id },
    diagnostics: Object.freeze([]),
  });
}

function hasPointFieldKeyTimeOverride(document, profileId, keyId) {
  return Object.hasOwn(
    document.profiles[profileId].overrides.pointField.keys?.[keyId] || {},
    'atWU',
  );
}

function getResolvedPointField(document, profileId) {
  return applyAboutNarrativePointFieldOverrides(
    document.tracks.pointField,
    document.profiles[profileId].overrides.pointField,
  );
}

function setPointFieldProfileKeyTime(document, profileId, keyId, atWU) {
  const pointFieldOverrides = document.profiles[profileId].overrides.pointField;
  pointFieldOverrides.keys ||= {};
  const baseKey = document.tracks.pointField.keys.find((key) => key.id === keyId);
  if (Math.abs(Number(baseKey.atWU) - Number(atWU)) <= POINT_FIELD_TIME_EPSILON) {
    const existing = pointFieldOverrides.keys[keyId];
    if (existing) {
      delete existing.atWU;
      if (!Object.keys(existing).length) delete pointFieldOverrides.keys[keyId];
    }
    return;
  }
  pointFieldOverrides.keys[keyId] = {
    ...(pointFieldOverrides.keys[keyId] || {}),
    atWU: cleanWU(atWU),
  };
}

function previewPointFieldKeyMove(input, { keyId, atWU, scope = 'base' } = {}) {
  if (!Number.isFinite(Number(atWU))) {
    return invalidPointFieldPreview('Point-field key time must be finite.');
  }
  if (scope !== 'base' && !POINT_FIELD_PROFILE_IDS.includes(scope)) {
    return invalidPointFieldPreview(`Unknown point-field edit scope “${scope}”.`);
  }
  const document = clone(input);
  const key = document.tracks.pointField.keys.find((item) => item.id === keyId);
  if (!key) return invalidPointFieldPreview(`Point-field key “${keyId}” does not exist.`);
  if (key.protected === true) {
    return invalidPointFieldPreview('Protected boundary keys cannot move.');
  }
  const contexts = scope === 'base'
    ? [{
      pointField: document.tracks.pointField,
      durationWU: Number(document.profiles.desktop.storyDurationWU),
    }, ...POINT_FIELD_PROFILE_IDS.flatMap((profileId) => (
      hasPointFieldKeyTimeOverride(document, profileId, keyId) ? [] : [{
        pointField: getResolvedPointField(document, profileId),
        durationWU: Number(document.profiles[profileId].storyDurationWU),
      }]
    ))]
    : [{
      pointField: getResolvedPointField(document, scope),
      durationWU: Number(document.profiles[scope].storyDurationWU),
    }];
  let minimum = 0;
  let maximum = Number.POSITIVE_INFINITY;
  for (const context of contexts) {
    const index = context.pointField.keys.findIndex((item) => item.id === keyId);
    if (index < 0) return invalidPointFieldPreview('The point-field key is missing from a profile.');
    minimum = Math.max(minimum, Number(context.pointField.keys[index - 1]?.atWU ?? 0));
    maximum = Math.min(
      maximum,
      Number(context.pointField.keys[index + 1]?.atWU ?? context.durationWU),
    );
  }
  if (minimum > maximum + POINT_FIELD_TIME_EPSILON) {
    return invalidPointFieldPreview('The resolved profile timelines do not share a valid key range.');
  }
  const appliedAtWU = cleanWU(clamp(Number(atWU), minimum, maximum));
  if (scope === 'base') key.atWU = appliedAtWU;
  else setPointFieldProfileKeyTime(document, scope, keyId, appliedAtWU);
  return Object.freeze({
    valid: true,
    document,
    selection: { type: 'point-field-key', id: keyId },
    diagnostics: Object.freeze([]),
    requestedAtWU: Number(atWU),
    appliedAtWU,
    clamped: Math.abs(appliedAtWU - Number(atWU)) > POINT_FIELD_TIME_EPSILON,
  });
}

function previewPointFieldSegmentMove(input, { segmentId, deltaWU, scope = 'base' } = {}) {
  if (!Number.isFinite(Number(deltaWU))) {
    return invalidPointFieldPreview('Point-field segment movement must be finite.');
  }
  if (scope !== 'base' && !POINT_FIELD_PROFILE_IDS.includes(scope)) {
    return invalidPointFieldPreview(`Unknown point-field edit scope “${scope}”.`);
  }
  const document = clone(input);
  const pointField = document.tracks.pointField;
  const segment = pointField.segments.find((item) => item.id === segmentId);
  if (!segment) return invalidPointFieldPreview(`Point-field segment “${segmentId}” does not exist.`);
  const fromBase = pointField.keys.find((key) => key.id === segment.fromKeyId);
  const toBase = pointField.keys.find((key) => key.id === segment.toKeyId);
  if (fromBase?.protected || toBase?.protected) {
    return invalidPointFieldPreview('A segment touching a protected boundary cannot move as a unit.');
  }
  if (scope === 'base' && POINT_FIELD_PROFILE_IDS.some((profileId) => (
    hasPointFieldKeyTimeOverride(document, profileId, fromBase.id)
    || hasPointFieldKeyTimeOverride(document, profileId, toBase.id)
  ))) {
    return invalidPointFieldPreview(
      'Reset the segment boundary profile overrides or move this segment in each profile.',
    );
  }
  const contexts = scope === 'base'
    ? [pointField, ...POINT_FIELD_PROFILE_IDS.map((profileId) => (
      getResolvedPointField(document, profileId)
    ))]
    : [getResolvedPointField(document, scope)];
  let minimumDelta = Number.NEGATIVE_INFINITY;
  let maximumDelta = Number.POSITIVE_INFINITY;
  for (const resolved of contexts) {
    const segmentIndex = resolved.segments.findIndex((item) => item.id === segmentId);
    if (segmentIndex < 0) {
      return invalidPointFieldPreview('The point-field segment is missing from a profile.');
    }
    const resolvedSegment = resolved.segments[segmentIndex];
    const fromIndex = resolved.keys.findIndex((key) => key.id === resolvedSegment.fromKeyId);
    const toIndex = resolved.keys.findIndex((key) => key.id === resolvedSegment.toKeyId);
    const previousSegment = resolved.segments[segmentIndex - 1];
    const nextSegment = resolved.segments[segmentIndex + 1];
    if ((previousSegment && previousSegment.transition.type !== 'hold')
      || (nextSegment && nextSegment.transition.type !== 'hold')) {
      return invalidPointFieldPreview(
        'A segment can move as a unit only when its neighbouring spans are holds.',
      );
    }
    const fromWU = Number(resolved.keys[fromIndex].atWU);
    const toWU = Number(resolved.keys[toIndex].atWU);
    const previousWU = Number(resolved.keys[fromIndex - 1]?.atWU ?? fromWU);
    const nextWU = Number(resolved.keys[toIndex + 1]?.atWU ?? toWU);
    minimumDelta = Math.max(minimumDelta, previousWU - fromWU);
    maximumDelta = Math.min(maximumDelta, nextWU - toWU);
  }
  if (minimumDelta > maximumDelta + POINT_FIELD_TIME_EPSILON) {
    return invalidPointFieldPreview('The resolved profile timelines do not share a valid segment range.');
  }
  const appliedDeltaWU = cleanWU(clamp(Number(deltaWU), minimumDelta, maximumDelta));
  if (scope === 'base') {
    fromBase.atWU = cleanWU(Number(fromBase.atWU) + appliedDeltaWU);
    toBase.atWU = cleanWU(Number(toBase.atWU) + appliedDeltaWU);
  } else {
    const resolved = getResolvedPointField(document, scope);
    const from = resolved.keys.find((key) => key.id === fromBase.id);
    const to = resolved.keys.find((key) => key.id === toBase.id);
    setPointFieldProfileKeyTime(document, scope, fromBase.id, Number(from.atWU) + appliedDeltaWU);
    setPointFieldProfileKeyTime(document, scope, toBase.id, Number(to.atWU) + appliedDeltaWU);
  }
  return Object.freeze({
    valid: true,
    document,
    selection: { type: 'point-field-segment', id: segmentId },
    diagnostics: Object.freeze([]),
    requestedDeltaWU: Number(deltaWU),
    appliedDeltaWU,
    clamped: Math.abs(appliedDeltaWU - Number(deltaWU)) > POINT_FIELD_TIME_EPSILON,
  });
}

function replaceDraft(draft, document) {
  Object.keys(draft).forEach((key) => delete draft[key]);
  Object.assign(draft, clone(document));
}

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

function makeRejectedEdit(label, diagnostics = [], reason = '') {
  return {
    label,
    reason: reason
      || diagnostics.find((item) => item.level === 'error')?.message
      || 'The edit is not valid.',
    diagnostics: clone(diagnostics),
  };
}

function defaultPreviewState(input = {}) {
  return {
    layoutProfile: LAYOUT_PROFILES.has(input?.layoutProfile)
      ? input.layoutProfile
      : 'desktop',
    orientation: ORIENTATIONS.has(input?.orientation) ? input.orientation : 'landscape',
    motionProfile: MOTION_PROFILES.has(input?.motionProfile) ? input.motionProfile : 'full',
  };
}

function normalizeTransport(input, durationWU) {
  const candidate = input || {};
  const duration = Math.max(0, Number(durationWU) || 0);
  const clampWU = (value) => Math.min(duration, Math.max(0, Number(value) || 0));
  let loop = null;
  if (candidate.loop
    && Number.isFinite(Number(candidate.loop.startWU))
    && Number.isFinite(Number(candidate.loop.endWU))) {
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

function normalizeSelection(selection, document, legacySelectionMap) {
  if (selection?.type === 'track' && selection.id === 'point-field') {
    return { type: 'track', id: 'point-field' };
  }
  if (POINT_FIELD_TYPES.has(selection?.type)) {
    return normalizeAboutNarrativePointFieldSelection(selection, document);
  }
  return normalizeAboutNarrativeTrackSelection(selection, document, {
    legacySelectionMap,
    fallbackTrack: 'text',
  });
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

function getSelectionObject(document, selection) {
  if (selection?.type === 'point-field-state') {
    return document.tracks.pointField.stateDefinitions.find((item) => item.id === selection.id);
  }
  if (selection?.type === 'point-field-key') {
    return document.tracks.pointField.keys.find((item) => item.id === selection.id);
  }
  if (selection?.type === 'point-field-segment') {
    return document.tracks.pointField.segments.find((item) => item.id === selection.id);
  }
  return getAboutNarrativeTrackObject(document, selection);
}

function hasProtectedSelection(document, selection) {
  return selectionMembers(normalizeSelection(selection, document)).some((member) => {
    const object = getSelectionObject(document, member);
    return object?.protected === true || object?.locked === true;
  });
}

function getAllIds(document) {
  return new Set([
    ...(document.tracks?.camera?.keys || []).map((item) => item.id),
    ...(document.tracks?.visibility?.keys || []).map((item) => item.id),
    ...(document.tracks?.pointField?.stateDefinitions || []).map((item) => item.id),
    ...(document.tracks?.pointField?.keys || []).map((item) => item.id),
    ...(document.tracks?.pointField?.segments || []).map((item) => item.id),
    ...(document.tracks?.text?.fields || []).map((item) => item.id),
    ...(document.tracks?.interactions?.clips || []).map((item) => item.id),
  ]);
}

function createUniqueId(document, base) {
  const ids = getAllIds(document);
  let id = base;
  let suffix = 2;
  while (ids.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function prepareOperationDocument(input) {
  const document = clone(input);
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

export function createAboutNarrativePointFieldEditorStore(initialDocument, {
  initialSelection = { type: 'track', id: 'point-field' },
  previewState = null,
  legacySelectionMap = null,
  baselineHash = '',
} = {}) {
  const listeners = new Set();
  const metrics = {
    compilations: 0,
    gestureUpdates: 0,
    publishedDocuments: 0,
  };
  let history = [];
  let historyIndex = -1;
  let historyBytes = 0;
  let gesture = null;
  let tryState = null;
  let snapshot = null;

  const compileCandidate = (document, nextPreviewState = null) => {
    metrics.compilations += 1;
    const activePreview = nextPreviewState || snapshot?.previewState || defaultPreviewState(previewState);
    const plan = compileAboutNarrativeRendererRuntimePlan(document, {
      previewLayoutProfile: activePreview.layoutProfile,
      previewMotionProfile: activePreview.motionProfile,
    });
    return {
      plan,
      document: plan.valid && plan.pointFieldPlan?.model
        ? clone(plan.pointFieldPlan.model)
        : clone(document),
    };
  };

  const initialCandidate = clone(initialDocument);
  const initialCompiled = compileCandidate(initialCandidate, defaultPreviewState(previewState));
  const ownedInitialDocument = initialCompiled.document;
  const baselineDocument = clone(ownedInitialDocument);
  snapshot = {
    document: ownedInitialDocument,
    baselineDocument,
    baselineHash,
    compiledPlan: initialCompiled.plan.valid ? initialCompiled.plan : null,
    lastValidPlan: initialCompiled.plan.valid ? initialCompiled.plan : null,
    diagnostics: clone(initialCompiled.plan.diagnostics || []),
    selection: normalizeSelection(initialSelection, ownedInitialDocument, legacySelectionMap),
    previewState: defaultPreviewState(previewState),
    transport: normalizeTransport(null, initialCompiled.plan.durationWU),
    clipboard: null,
    history: { canUndo: false, canRedo: false, undoLabel: '', redoLabel: '' },
    gestureState: null,
    tryState: null,
    rejectedEdit: null,
    sourceState: { status: baselineHash ? 'ready' : 'loading', message: '', readOnly: false },
    draftState: { revision: 0, dirty: false, valid: initialCompiled.plan.valid },
    previewDocumentState: {
      status: initialCompiled.plan.valid ? 'valid-draft' : 'last-valid-fallback',
      revision: 0,
      preparing: false,
    },
    saveState: { status: 'idle', message: '', savedAt: null },
    recoveryState: { status: 'none', available: false, message: '' },
    checkpointState: { status: 'idle', items: [], message: '' },
    conflictState: {
      available: false,
      currentHash: '',
      remoteDocument: null,
      localDocument: null,
      comparison: null,
      message: '',
    },
    dirty: false,
    revision: 0,
  };

  const refreshReliabilityState = () => {
    const valid = !(snapshot.diagnostics || []).some((item) => item.level === 'error');
    const previewStatus = snapshot.previewDocumentState?.preparing
      ? 'preparing-candidate'
      : valid
        ? snapshot.dirty ? 'valid-draft' : 'saved'
        : 'last-valid-fallback';
    snapshot = {
      ...snapshot,
      draftState: {
        revision: snapshot.revision,
        dirty: snapshot.dirty,
        valid,
      },
      previewDocumentState: {
        ...snapshot.previewDocumentState,
        status: previewStatus,
        revision: snapshot.revision,
      },
    };
  };
  const emit = () => {
    refreshReliabilityState();
    listeners.forEach((listener) => listener());
  };
  const saveStateForDirty = (dirty) => (['saving', 'conflict'].includes(snapshot.saveState.status)
    ? snapshot.saveState
    : { ...snapshot.saveState, status: dirty ? 'idle' : 'saved' });

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
    const normalizedSelection = normalizeSelection(
      afterSelection,
      compiled.document,
      legacySelectionMap,
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
    const dirty = !documentsMatch(compiled.document, snapshot.baselineDocument);
    snapshot = {
      ...snapshot,
      document: compiled.document,
      compiledPlan: nextValidPlan,
      lastValidPlan: nextValidPlan,
      diagnostics: clone(compiled.plan.diagnostics || []),
      selection: normalizedSelection,
      transport: normalizeTransport(snapshot.transport, nextValidPlan?.durationWU),
      gestureState: null,
      tryState: null,
      rejectedEdit: null,
      saveState: saveStateForDirty(dirty),
      dirty,
      revision: snapshot.revision + 1,
    };
    metrics.publishedDocuments += 1;
    gesture = null;
    tryState = null;
    refreshHistoryState();
    emit();
    return true;
  };

  const rejectBusyEdit = (label) => {
    snapshot = {
      ...snapshot,
      rejectedEdit: makeRejectedEdit(
        label,
        [],
        gesture
          ? 'Finish or cancel the active gesture first.'
          : 'Apply or cancel the active try state first.',
      ),
    };
    emit();
    return false;
  };

  const rejectOperation = (label, result) => {
    snapshot = {
      ...snapshot,
      rejectedEdit: makeRejectedEdit(label, result?.diagnostics || [], result?.reason),
    };
    emit();
    return false;
  };

  const applyOperation = (label, result, { requireValid = true } = {}) => {
    const document = result?.document || result?.model;
    if (!result?.valid || !document) return rejectOperation(label, result);
    return publishDocument({
      label,
      document: prepareOperationDocument(document),
      afterSelection: result.selection || snapshot.selection,
      requireValid,
    });
  };

  const applyPointFieldOperation = (label, createResult) => {
    if (gesture || tryState) return rejectBusyEdit(label);
    return applyOperation(label, createResult());
  };

  const updateGestureResult = (result, { deferCompile = false } = {}) => {
    if (!gesture) return false;
    metrics.gestureUpdates += 1;
    const document = result?.document || result?.model;
    if (!result?.valid || !document) {
      snapshot = {
        ...snapshot,
        gestureState: { label: gesture.label, valid: false },
        rejectedEdit: makeRejectedEdit(gesture.label, result?.diagnostics || [], result?.reason),
      };
      emit();
      return false;
    }
    if (deferCompile) {
      const nextDocument = document;
      gesture.deferCompile = true;
      snapshot = {
        ...snapshot,
        document: nextDocument,
        diagnostics: clone(result.diagnostics || []),
        selection: normalizeSelection(
          result.selection || snapshot.selection,
          nextDocument,
          legacySelectionMap,
        ),
        gestureState: { label: gesture.label, valid: true },
        rejectedEdit: null,
        dirty: !documentsMatch(nextDocument, snapshot.baselineDocument),
      };
      emit();
      return true;
    }
    const compiled = compileCandidate(prepareOperationDocument(document));
    const nextValidPlan = compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan;
    snapshot = {
      ...snapshot,
      document: compiled.document,
      compiledPlan: nextValidPlan,
      lastValidPlan: nextValidPlan,
      diagnostics: clone(compiled.plan.diagnostics || []),
      selection: normalizeSelection(
        result.selection || snapshot.selection,
        compiled.document,
        legacySelectionMap,
      ),
      gestureState: { label: gesture.label, valid: compiled.plan.valid },
      rejectedEdit: null,
      dirty: !documentsMatch(compiled.document, snapshot.baselineDocument),
    };
    emit();
    return compiled.plan.valid;
  };

  const store = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    getMetrics() {
      return Object.freeze({ ...metrics });
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
      const dirty = !documentsMatch(compiled.document, snapshot.baselineDocument);
      snapshot = {
        ...snapshot,
        document: compiled.document,
        compiledPlan: nextValidPlan,
        lastValidPlan: nextValidPlan,
        diagnostics: clone(compiled.plan.diagnostics || []),
        selection: normalizeSelection(entry.beforeSelection, compiled.document, legacySelectionMap),
        transport: normalizeTransport(snapshot.transport, nextValidPlan?.durationWU),
        rejectedEdit: null,
        saveState: saveStateForDirty(dirty),
        dirty,
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
      const dirty = !documentsMatch(compiled.document, snapshot.baselineDocument);
      snapshot = {
        ...snapshot,
        document: compiled.document,
        compiledPlan: nextValidPlan,
        lastValidPlan: nextValidPlan,
        diagnostics: clone(compiled.plan.diagnostics || []),
        selection: normalizeSelection(entry.afterSelection, compiled.document, legacySelectionMap),
        transport: normalizeTransport(snapshot.transport, nextValidPlan?.durationWU),
        rejectedEdit: null,
        saveState: saveStateForDirty(dirty),
        dirty,
        revision: snapshot.revision + 1,
      };
      refreshHistoryState();
      emit();
      return true;
    },
    setSelection(selection) {
      snapshot = {
        ...snapshot,
        selection: normalizeSelection(selection, snapshot.document, legacySelectionMap),
      };
      emit();
    },
    beginGesture(label, { selection = snapshot.selection, operation = null } = {}) {
      if (gesture || tryState) return false;
      gesture = {
        label,
        operation,
        startDocument: clone(snapshot.document),
        startSelection: clone(snapshot.selection),
        startCompiledPlan: snapshot.compiledPlan,
        startLastValidPlan: snapshot.lastValidPlan,
        startDiagnostics: clone(snapshot.diagnostics),
        startDirty: snapshot.dirty,
      };
      snapshot = {
        ...snapshot,
        selection: normalizeSelection(selection, snapshot.document, legacySelectionMap),
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
      return updateGestureResult({ valid: true, document: candidate, selection });
    },
    updateGestureMove(deltaWU) {
      if (!gesture) return false;
      if (hasProtectedSelection(gesture.startDocument, gesture.startSelection)) {
        return rejectOperation(gesture.label, { reason: 'A protected object cannot be moved.' });
      }
      return updateGestureResult(moveAboutNarrativeTrackObjectsByWU({
        model: gesture.startDocument,
        selection: gesture.startSelection,
        deltaWU,
      }));
    },
    updateGestureResizeText(id, edge, atWU) {
      if (!gesture) return false;
      return updateGestureResult(resizeAboutNarrativeTextFieldEdge({
        model: gesture.startDocument,
        id,
        edge,
        atWU,
      }));
    },
    updateGestureResizeInteraction(id, edge, atWU) {
      if (!gesture) return false;
      return updateGestureResult(resizeAboutNarrativeInteractionEdge({
        model: gesture.startDocument,
        id,
        edge,
        atWU,
      }));
    },
    updateGestureResizeWorldEnd() {
      return false;
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
      let finalDocument = snapshot.document;
      let finalPlan = snapshot.compiledPlan;
      let finalDiagnostics = snapshot.diagnostics;
      if (start.deferCompile) {
        const compiled = compileCandidate(finalDocument);
        if (requireValid && !compiled.plan.valid) {
          snapshot = {
            ...snapshot,
            diagnostics: clone(compiled.plan.diagnostics || []),
            gestureState: { label: start.label, valid: false },
            rejectedEdit: makeRejectedEdit(start.label, compiled.plan.diagnostics),
          };
          emit();
          return false;
        }
        finalDocument = compiled.document;
        finalPlan = compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan;
        finalDiagnostics = clone(compiled.plan.diagnostics || []);
      }
      const normalizedSelection = normalizeSelection(
        selectionAfter,
        finalDocument,
        legacySelectionMap,
      );
      gesture = null;
      if (documentsMatch(start.startDocument, finalDocument)) {
        snapshot = {
          ...snapshot,
          document: finalDocument,
          compiledPlan: finalPlan,
          lastValidPlan: finalPlan,
          diagnostics: finalDiagnostics,
          selection: normalizedSelection,
          gestureState: null,
        };
        emit();
        return false;
      }
      pushHistory(makeHistoryEntry(
        start.label,
        clone(start.startDocument),
        clone(finalDocument),
        clone(start.startSelection),
        clone(normalizedSelection),
      ));
      const dirty = !documentsMatch(finalDocument, snapshot.baselineDocument);
      snapshot = {
        ...snapshot,
        document: finalDocument,
        compiledPlan: finalPlan,
        lastValidPlan: finalPlan,
        diagnostics: finalDiagnostics,
        selection: normalizedSelection,
        gestureState: null,
        rejectedEdit: null,
        saveState: saveStateForDirty(dirty),
        dirty,
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
        diagnostics: clone(compiled.plan.diagnostics || []),
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
        diagnostics: clone(compiled.plan.diagnostics || []),
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
      const compiled = compileCandidate(snapshot.document, candidate);
      snapshot = {
        ...snapshot,
        previewState: candidate,
        compiledPlan: compiled.plan.valid ? compiled.plan : snapshot.compiledPlan,
        lastValidPlan: compiled.plan.valid ? compiled.plan : snapshot.lastValidPlan,
        diagnostics: clone(compiled.plan.diagnostics || []),
      };
      emit();
      return true;
    },
    setTransport(patch = {}) {
      const candidate = normalizeTransport(
        { ...snapshot.transport, ...patch },
        snapshot.lastValidPlan?.durationWU,
      );
      if (documentsMatch(candidate, snapshot.transport)) return false;
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
      if (!validation.valid) return rejectOperation('Set clipboard', validation);
      snapshot = { ...snapshot, clipboard: clone(validation.payload), rejectedEdit: null };
      emit();
      return true;
    },
    copySelection() {
      if (POINT_FIELD_TYPES.has(snapshot.selection.type)) {
        return rejectOperation('Copy track objects', {
          reason: 'Use the point-field duplicate or make-unique action for reusable states.',
        });
      }
      const payload = createAboutNarrativeTrackClipboardPayload({
        model: snapshot.document,
        selection: snapshot.selection,
      });
      if (payload.valid === false) return rejectOperation('Copy track objects', payload);
      snapshot = { ...snapshot, clipboard: clone(payload), rejectedEdit: null };
      emit();
      return true;
    },
    createObject({ track, kind = null, atWU, ...options }) {
      if (gesture || tryState) return rejectBusyEdit('Create track object');
      if (track === 'world' || track === 'point-field') {
        return rejectOperation('Create track object', {
          reason: 'Use point-field split, duplicate, and make-unique actions for v6 geometry.',
        });
      }
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
      if (['camera', 'visibility'].includes(track) && snapshot.compiledPlan?.valid) {
        const frame = sampleAboutNarrativeRuntimePlan(snapshot.compiledPlan, atWU);
        if (track === 'camera' && !operationOptions.cameraKey) {
          operationOptions.cameraKey = {
            position: [...frame.camera.position],
            rotation: getAboutNarrativeCameraRotationFromQuaternion(frame.camera.quaternion),
            aimEnabled: Number(frame.camera.aimWeight || 0) >= 0.9999,
            lookAtTarget: [...frame.camera.lookAtTarget],
            lookAtRoll: frame.camera.lookAtRoll,
            fov: frame.camera.fov,
          };
        }
        if (track === 'visibility' && !operationOptions.visibilityKey) {
          operationOptions.visibilityKey = { visibility: frame.simulation.visibility };
        }
      }
      if (track === 'interaction') operationOptions.interactionType ||= 'horizontal-spin';
      return applyOperation(`Create ${kind || track}`, createAboutNarrativeTrackObjectAtWU({
        model: snapshot.document,
        track,
        kind,
        atWU,
        ...operationOptions,
      }));
    },
    moveSelection(deltaWU, options = {}) {
      if (gesture || tryState) return rejectBusyEdit('Move track objects');
      if (POINT_FIELD_TYPES.has(snapshot.selection.type)) {
        return rejectOperation('Move track objects', {
          reason: 'Use the point-field key or segment movement action.',
        });
      }
      if (hasProtectedSelection(snapshot.document, snapshot.selection)) {
        return rejectOperation('Move track objects', {
          reason: 'A protected object cannot be moved.',
        });
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
        ...snapshot.document.tracks.text.fields
          .map((item) => Number(item.endWU))
          .filter(Number.isFinite),
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
      if (POINT_FIELD_TYPES.has(snapshot.selection.type)) {
        return rejectOperation('Delete track objects', {
          reason: 'Use the guarded point-field state delete action.',
        });
      }
      if (hasProtectedSelection(snapshot.document, snapshot.selection)) {
        return rejectOperation('Delete track objects', {
          reason: 'A protected object cannot be deleted.',
        });
      }
      return applyOperation('Delete track objects', deleteAboutNarrativeTrackObjects({
        model: snapshot.document,
        selection: snapshot.selection,
      }));
    },
    duplicateSelection(options = {}) {
      if (gesture || tryState) return rejectBusyEdit('Duplicate track objects');
      if (POINT_FIELD_TYPES.has(snapshot.selection.type)) {
        return rejectOperation('Duplicate track objects', {
          reason: 'Use the explicit point-field duplicate action.',
        });
      }
      if (hasProtectedSelection(snapshot.document, snapshot.selection)) {
        return rejectOperation('Duplicate track objects', {
          reason: 'A protected object cannot be duplicated.',
        });
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
    installSource(document, hash, {
      status = 'ready',
      message = '',
      readOnly = false,
      migrations = [],
    } = {}) {
      const compiled = compileCandidate(document);
      if (!compiled.plan.valid) {
        snapshot = {
          ...snapshot,
          sourceState: {
            status: readOnly ? 'read-only' : 'failed',
            message: message || 'The canonical source is not valid.',
            readOnly: Boolean(readOnly),
            diagnostics: clone(compiled.plan.diagnostics || []),
          },
        };
        emit();
        return false;
      }
      const preserveDraft = snapshot.dirty;
      const baselineDocument = clone(compiled.document);
      if (!preserveDraft) {
        history = [];
        historyIndex = -1;
        historyBytes = 0;
        snapshot = {
          ...snapshot,
          document: clone(compiled.document),
          compiledPlan: compiled.plan,
          lastValidPlan: compiled.plan,
          diagnostics: clone(compiled.plan.diagnostics || []),
          selection: normalizeSelection(snapshot.selection, compiled.document, legacySelectionMap),
          transport: normalizeTransport(snapshot.transport, compiled.plan.durationWU),
          revision: 0,
        };
        refreshHistoryState();
      }
      const dirty = preserveDraft && !documentsMatch(snapshot.document, baselineDocument);
      snapshot = {
        ...snapshot,
        baselineDocument,
        baselineHash: String(hash || ''),
        dirty,
        sourceState: {
          status,
          message,
          readOnly: Boolean(readOnly),
          migrations: clone(migrations),
        },
        saveState: { status: dirty ? 'idle' : 'saved', message: '', savedAt: null },
      };
      emit();
      return true;
    },
    setSourceState(sourceState) {
      snapshot = {
        ...snapshot,
        sourceState: { ...snapshot.sourceState, ...clone(sourceState) },
      };
      emit();
    },
    setPreviewCandidatePreparing(preparing) {
      snapshot = {
        ...snapshot,
        previewDocumentState: {
          ...snapshot.previewDocumentState,
          preparing: Boolean(preparing),
        },
      };
      emit();
    },
    createSaveSubmission() {
      return freezeOwned({
        document: freezeOwned(clone(snapshot.document)),
        baselineHash: snapshot.baselineHash,
        revision: snapshot.revision,
      });
    },
    beginSave() {
      if (!store.getSaveEligibility().allowed) return null;
      const submission = store.createSaveSubmission();
      snapshot = {
        ...snapshot,
        saveState: {
          status: 'saving',
          message: 'Validating and saving…',
          submittedRevision: submission.revision,
        },
      };
      emit();
      return submission;
    },
    markSaved(document, hash, submittedRevision = snapshot.revision) {
      const newerEditsExist = snapshot.revision !== submittedRevision;
      const persistedCandidate = compileCandidate(document);
      const persisted = clone(persistedCandidate.document);
      const installPersisted = !newerEditsExist && persistedCandidate.plan.valid;
      const dirty = installPersisted ? false : !documentsMatch(snapshot.document, persisted);
      snapshot = {
        ...snapshot,
        ...(installPersisted ? {
          document: clone(persisted),
          compiledPlan: persistedCandidate.plan,
          lastValidPlan: persistedCandidate.plan,
          diagnostics: clone(persistedCandidate.plan.diagnostics || []),
          selection: normalizeSelection(snapshot.selection, persisted, legacySelectionMap),
          transport: normalizeTransport(snapshot.transport, persistedCandidate.plan.durationWU),
        } : {}),
        baselineDocument: persisted,
        baselineHash: hash,
        dirty,
        sourceState: { ...snapshot.sourceState, status: 'ready', readOnly: false },
        saveState: {
          status: dirty ? 'idle' : 'saved',
          message: newerEditsExist && dirty
            ? 'The submitted revision was saved. Newer edits remain in this draft.'
            : '',
          savedAt: Date.now(),
          submittedRevision,
          persistedRevision: submittedRevision,
        },
        conflictState: {
          available: false,
          currentHash: '',
          remoteDocument: null,
          localDocument: null,
          comparison: null,
          message: '',
        },
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
    markConflict({ currentHash = '', remoteDocument = null, localDocument = null, comparison = null, message = '' } = {}) {
      snapshot = {
        ...snapshot,
        saveState: {
          status: 'conflict',
          message: message || 'The canonical source changed while this draft was open.',
        },
        conflictState: {
          available: true,
          currentHash,
          remoteDocument: clone(remoteDocument),
          localDocument: clone(localDocument || snapshot.document),
          comparison: clone(comparison),
          message,
        },
      };
      emit();
    },
    clearConflict() {
      snapshot = {
        ...snapshot,
        saveState: { ...snapshot.saveState, status: snapshot.dirty ? 'idle' : 'saved', message: '' },
        conflictState: {
          available: false,
          currentHash: '',
          remoteDocument: null,
          localDocument: null,
          comparison: null,
          message: '',
        },
      };
      emit();
    },
    reloadSource(document, hash) {
      const changed = store.replaceDocument('Reload canonical source', document, { requireValid: true });
      if (!changed && !documentsMatch(snapshot.document, document)) return false;
      store.markBaseline(document, hash);
      snapshot = {
        ...snapshot,
        sourceState: { status: 'ready', message: '', readOnly: false },
        conflictState: {
          available: false,
          currentHash: '',
          remoteDocument: null,
          localDocument: null,
          comparison: null,
          message: '',
        },
      };
      emit();
      return true;
    },
    restoreBaseline() {
      if (documentsMatch(snapshot.document, snapshot.baselineDocument)) return false;
      return store.replaceDocument('Restore last saved', snapshot.baselineDocument, { requireValid: true });
    },
    setRecoveryState(recoveryState) {
      snapshot = {
        ...snapshot,
        recoveryState: {
          status: 'none',
          available: false,
          message: '',
          ...clone(recoveryState),
        },
      };
      emit();
    },
    setCheckpointState(checkpointState) {
      snapshot = {
        ...snapshot,
        checkpointState: { ...snapshot.checkpointState, ...clone(checkpointState) },
      };
      emit();
    },
    getSaveEligibility() {
      return getAboutNarrativeSaveEligibility(snapshot);
    },
    markBaseline(document = snapshot.document, hash = snapshot.baselineHash) {
      const baseline = clone(document);
      const dirty = !documentsMatch(snapshot.document, baseline);
      snapshot = {
        ...snapshot,
        baselineDocument: baseline,
        baselineHash: hash,
        dirty,
        saveState: { status: dirty ? 'idle' : 'saved', message: '', savedAt: Date.now() },
      };
      emit();
    },
  };

  store.pointField = Object.freeze({
    select(type, id = '') {
      const selection = typeof type === 'object' ? type : { type, id };
      store.setSelection(selection);
      return snapshot.selection;
    },
    moveKey(options) {
      return applyPointFieldOperation(
        'Move point-field key',
        () => moveAboutNarrativePointFieldKey(snapshot.document, options),
      );
    },
    moveSegment(options) {
      return applyPointFieldOperation(
        'Move point-field segment',
        () => moveAboutNarrativePointFieldSegment(snapshot.document, options),
      );
    },
    beginMoveKey({ keyId, scope = 'base', label = 'Move point-field key' }) {
      return store.beginGesture(label, {
        selection: { type: 'point-field-key', id: keyId },
        operation: { type: 'point-field-key', id: keyId, scope },
      });
    },
    updateMoveKey(atWU) {
      if (gesture?.operation?.type !== 'point-field-key') return false;
      return updateGestureResult(previewPointFieldKeyMove(gesture.startDocument, {
        keyId: gesture.operation.id,
        scope: gesture.operation.scope,
        atWU,
      }), { deferCompile: true });
    },
    beginMoveSegment({ segmentId, scope = 'base', label = 'Move point-field segment' }) {
      return store.beginGesture(label, {
        selection: { type: 'point-field-segment', id: segmentId },
        operation: { type: 'point-field-segment', id: segmentId, scope },
      });
    },
    updateMoveSegment(deltaWU) {
      if (gesture?.operation?.type !== 'point-field-segment') return false;
      return updateGestureResult(previewPointFieldSegmentMove(gesture.startDocument, {
        segmentId: gesture.operation.id,
        scope: gesture.operation.scope,
        deltaWU,
      }), { deferCompile: true });
    },
    beginPatch({
      type,
      id,
      scope = 'base',
      label = 'Edit point-field value',
    } = {}) {
      const targetCheck = previewPointFieldPatch(snapshot.document, {
        type,
        id,
        scope,
        patch: {},
      });
      if (!targetCheck.valid) return rejectOperation(label, targetCheck);
      return store.beginGesture(label, {
        selection: { type, id },
        operation: {
          type: 'point-field-patch',
          targetType: type,
          id,
          scope,
        },
      });
    },
    updatePatch(patch) {
      if (gesture?.operation?.type !== 'point-field-patch') return false;
      return updateGestureResult(previewPointFieldPatch(gesture.startDocument, {
        type: gesture.operation.targetType,
        id: gesture.operation.id,
        scope: gesture.operation.scope,
        patch,
      }), { deferCompile: true });
    },
    commitGesture(options) {
      return store.commitGesture(options);
    },
    cancelGesture() {
      return store.cancelGesture();
    },
    patchKey({ id, scope = 'base', patch }) {
      return applyPointFieldOperation('Edit point-field key', () => (
        writeAboutNarrativePointFieldTarget(
          snapshot.document,
          { type: 'point-field-key', id, scope, patch },
        )
      ));
    },
    patchSegment({ id, scope = 'base', patch }) {
      return applyPointFieldOperation('Edit point-field segment', () => (
        writeAboutNarrativePointFieldTarget(
          snapshot.document,
          { type: 'point-field-segment', id, scope, patch },
        )
      ));
    },
    patchState({ id, scope = 'base', patch }) {
      return applyPointFieldOperation('Edit point-field state', () => (
        writeAboutNarrativePointFieldTarget(
          snapshot.document,
          { type: 'point-field-state', id, scope, patch },
        )
      ));
    },
    resetOverride(options) {
      return applyPointFieldOperation(
        'Reset point-field override',
        () => resetAboutNarrativePointFieldOverride(snapshot.document, options),
      );
    },
    duplicateState(options) {
      return applyPointFieldOperation(
        'Duplicate point-field state',
        () => duplicateAboutNarrativePointFieldState(snapshot.document, options),
      );
    },
    makeKeyStateUnique(options) {
      return applyPointFieldOperation(
        'Make point-field key state unique',
        () => makeAboutNarrativePointFieldKeyStateUnique(snapshot.document, options),
      );
    },
    deleteState(options) {
      return applyPointFieldOperation(
        'Delete point-field state',
        () => deleteAboutNarrativePointFieldState(snapshot.document, options),
      );
    },
    splitSegment(options) {
      return applyPointFieldOperation(
        'Split point-field segment',
        () => splitAboutNarrativePointFieldSegment(snapshot.document, options),
      );
    },
  });

  return store;
}
