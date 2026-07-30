import {
  applyAboutNarrativePointFieldOverrides,
  normalizeAboutNarrativePointFieldDocument,
  validateAboutNarrativePointFieldDocument,
} from './aboutNarrativePointFieldSchema.js';

export const ABOUT_NARRATIVE_POINT_FIELD_SELECTION_TYPES = Object.freeze([
  'point-field-state',
  'point-field-key',
  'point-field-segment',
]);

const PROFILE_IDS = Object.freeze(['desktop', 'tablet', 'mobile']);
const SELECTION_TYPES = new Set(ABOUT_NARRATIVE_POINT_FIELD_SELECTION_TYPES);
const TIME_EPSILON = 0.000001;

const BASE_PATCH_KEYS = Object.freeze({
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
const PROFILE_PATCH_KEYS = Object.freeze({
  'point-field-state': new Set(['railAnchorWU', 'transform']),
  'point-field-key': new Set(['atWU']),
  'point-field-segment': new Set(['transition']),
});
const COLLECTION_BY_TYPE = Object.freeze({
  'point-field-state': 'stateDefinitions',
  'point-field-key': 'keys',
  'point-field-segment': 'segments',
});

const clone = (value) => (value === undefined ? undefined : structuredClone(value));
const cleanWU = (value) => Number(Number(value).toFixed(6));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function mergeDeep(base, override) {
  if (!isObject(base) || !isObject(override)) return clone(override === undefined ? base : override);
  const output = clone(base);
  Object.entries(override).forEach(([key, value]) => {
    output[key] = isObject(value) && isObject(output[key])
      ? mergeDeep(output[key], value)
      : clone(value);
  });
  return output;
}

function deepDiff(base, value) {
  if (JSON.stringify(base) === JSON.stringify(value)) return undefined;
  if (!isObject(base) || !isObject(value)) return clone(value);
  const output = {};
  Object.keys(value).forEach((key) => {
    const difference = deepDiff(base[key], value[key]);
    if (difference !== undefined) output[key] = difference;
  });
  return Object.keys(output).length ? output : undefined;
}

function invalidResult(code, reason, diagnostics = []) {
  return Object.freeze({
    valid: false,
    changed: false,
    code,
    reason,
    diagnostics: Object.freeze(clone(diagnostics)),
  });
}

function prepareDocument(input) {
  const source = clone(input);
  const diagnostics = validateAboutNarrativePointFieldDocument(source);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    return invalidResult(
      'invalid-document',
      errors[0]?.message || 'The point-field document is invalid.',
      diagnostics,
    );
  }
  return { valid: true, document: normalizeAboutNarrativePointFieldDocument(source) };
}

function commitDocument(before, candidate, selection, metadata = {}) {
  const diagnostics = validateAboutNarrativePointFieldDocument(candidate);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    return invalidResult(
      metadata.code || 'invalid-edit',
      errors[0]?.message || 'The point-field edit is invalid.',
      diagnostics,
    );
  }
  const document = normalizeAboutNarrativePointFieldDocument(candidate);
  return Object.freeze({
    valid: true,
    changed: JSON.stringify(before) !== JSON.stringify(document),
    document,
    selection: normalizeAboutNarrativePointFieldSelection(selection, document),
    diagnostics: Object.freeze(clone(diagnostics)),
    ...metadata,
  });
}

function uniqueId(document, preferred) {
  const pointField = document.tracks.pointField;
  const ids = new Set([
    ...pointField.stateDefinitions.map((item) => item.id),
    ...pointField.keys.map((item) => item.id),
    ...pointField.segments.map((item) => item.id),
  ]);
  const base = String(preferred || 'point-field-item')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'point-field-item';
  let id = base;
  let suffix = 2;
  while (ids.has(id)) {
    id = `${base}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function getPointField(document) {
  return document?.tracks?.pointField || null;
}

function getCollection(document, type) {
  const collection = COLLECTION_BY_TYPE[type];
  return collection ? getPointField(document)?.[collection] || [] : [];
}

function getItem(document, type, id) {
  return getCollection(document, type).find((item) => item.id === id) || null;
}

function profilePointField(document, profileId) {
  return applyAboutNarrativePointFieldOverrides(
    document.tracks.pointField,
    document.profiles[profileId].overrides.pointField,
  );
}

function resolvedPointField(document, scope) {
  return scope === 'base' ? document.tracks.pointField : profilePointField(document, scope);
}

function requireScope(scope) {
  return scope === 'base' || PROFILE_IDS.includes(scope);
}

function keyIndex(pointField, keyId) {
  return pointField.keys.findIndex((key) => key.id === keyId);
}

function segmentIndex(pointField, segmentId) {
  return pointField.segments.findIndex((segment) => segment.id === segmentId);
}

function hasOwnTimeOverride(document, profileId, keyId) {
  return Object.hasOwn(
    document.profiles[profileId].overrides.pointField.keys?.[keyId] || {},
    'atWU',
  );
}

function setProfileKeyTime(document, profileId, keyId, atWU) {
  const pointFieldOverrides = document.profiles[profileId].overrides.pointField;
  pointFieldOverrides.keys ||= {};
  const baseKey = getItem(document, 'point-field-key', keyId);
  if (Math.abs(Number(baseKey.atWU) - Number(atWU)) <= TIME_EPSILON) {
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

function keyTimingContexts(document, scope, keyId) {
  if (scope !== 'base') {
    return [{
      pointField: resolvedPointField(document, scope),
      durationWU: Number(document.profiles[scope].storyDurationWU),
    }];
  }
  return [{
    pointField: document.tracks.pointField,
    durationWU: Number(document.profiles.desktop.storyDurationWU),
  }, ...PROFILE_IDS.flatMap((profileId) => (
    hasOwnTimeOverride(document, profileId, keyId) ? [] : [{
      pointField: profilePointField(document, profileId),
      durationWU: Number(document.profiles[profileId].storyDurationWU),
    }]
  ))];
}

function keyBounds(document, scope, keyId) {
  let minimum = 0;
  let maximum = Number.POSITIVE_INFINITY;
  for (const context of keyTimingContexts(document, scope, keyId)) {
    const { pointField, durationWU } = context;
    const index = keyIndex(pointField, keyId);
    if (index < 0) return null;
    minimum = Math.max(minimum, Number(pointField.keys[index - 1]?.atWU ?? 0));
    maximum = Math.min(
      maximum,
      Number(pointField.keys[index + 1]?.atWU ?? durationWU),
    );
  }
  return { minimum, maximum };
}

function neutralHoldTransition() {
  return {
    type: 'hold',
    easing: 'linear',
    correspondence: null,
    progress: 1,
    stagger: { mode: 'uniform', amount: 0 },
    path: { mode: 'direct', amount: 0 },
    flatten: { mode: 'none', amount: 0 },
  };
}

function defaultMorphTransition() {
  return {
    type: 'morph',
    easing: 'smoothstep',
    correspondence: 'index-v1',
    stagger: { mode: 'uniform', amount: 0 },
    path: { mode: 'direct', amount: 0 },
    flatten: { mode: 'none', amount: 0 },
  };
}

function repairTransitionForStates(transition, fromStateId, toStateId) {
  if (fromStateId === toStateId) return neutralHoldTransition();
  if (transition?.type === 'hold') return defaultMorphTransition();
  return clone(transition || defaultMorphTransition());
}

function stateIdsForSegment(pointField, segment) {
  return {
    fromStateId: pointField.keys.find((key) => key.id === segment.fromKeyId)?.stateId,
    toStateId: pointField.keys.find((key) => key.id === segment.toKeyId)?.stateId,
  };
}

function repairAdjacentTransitions(document, keyId) {
  const pointField = document.tracks.pointField;
  const index = keyIndex(pointField, keyId);
  const adjacent = pointField.segments.filter((segment) => (
    segment.fromKeyId === keyId || segment.toKeyId === keyId
  ));
  adjacent.forEach((segment) => {
    const { fromStateId, toStateId } = stateIdsForSegment(pointField, segment);
    segment.transition = repairTransitionForStates(segment.transition, fromStateId, toStateId);
  });
  if (index < 0) return;
  PROFILE_IDS.forEach((profileId) => {
    const overrides = document.profiles[profileId].overrides.pointField.segments;
    adjacent.forEach((baseSegment) => {
      const existing = overrides[baseSegment.id];
      if (!existing?.transition) return;
      const resolvedTransition = mergeDeep(baseSegment.transition, existing.transition);
      const repaired = repairTransitionForStates(
        resolvedTransition,
        stateIdsForSegment(pointField, baseSegment).fromStateId,
        stateIdsForSegment(pointField, baseSegment).toStateId,
      );
      const difference = deepDiff(baseSegment.transition, repaired);
      if (difference) overrides[baseSegment.id] = { transition: difference };
      else delete overrides[baseSegment.id];
    });
  });
}

/** Returns a stable track selection or the Point field track fallback. */
export function normalizeAboutNarrativePointFieldSelection(selection, document) {
  if (selection?.type === 'track' && selection.id === 'point-field') {
    return { type: 'track', id: 'point-field' };
  }
  if (SELECTION_TYPES.has(selection?.type) && getItem(document, selection.type, selection.id)) {
    return { type: selection.type, id: selection.id };
  }
  return { type: 'track', id: 'point-field' };
}

/** Remaps a selection after topology changes, then verifies the target still exists. */
export function remapAboutNarrativePointFieldSelection(selection, remap, document) {
  if (!SELECTION_TYPES.has(selection?.type)) {
    return normalizeAboutNarrativePointFieldSelection(selection, document);
  }
  const nextId = remap?.[selection.type]?.[selection.id] || selection.id;
  return normalizeAboutNarrativePointFieldSelection({ type: selection.type, id: nextId }, document);
}

export function getAboutNarrativePointFieldSelectionObject(document, selection) {
  return SELECTION_TYPES.has(selection?.type)
    ? getItem(document, selection.type, selection.id)
    : null;
}

export function getAboutNarrativePointFieldItemRange(document, selectionOrType, itemId = '') {
  const selection = typeof selectionOrType === 'string'
    ? { type: selectionOrType, id: itemId }
    : selectionOrType;
  const pointField = getPointField(document);
  const item = getAboutNarrativePointFieldSelectionObject(document, selection);
  if (!pointField || !item) return null;
  if (selection.type === 'point-field-key') {
    return { startWU: Number(item.atWU), endWU: Number(item.atWU) };
  }
  if (selection.type === 'point-field-segment') {
    const from = pointField.keys.find((key) => key.id === item.fromKeyId);
    const to = pointField.keys.find((key) => key.id === item.toKeyId);
    return from && to ? { startWU: Number(from.atWU), endWU: Number(to.atWU) } : null;
  }
  const uses = pointField.keys.filter((key) => key.stateId === item.id);
  if (!uses.length) return null;
  return {
    startWU: Math.min(...uses.map((key) => Number(key.atWU))),
    endWU: Math.max(...uses.map((key) => Number(key.atWU))),
  };
}

export function getAboutNarrativePointFieldItemLabel(document, selectionOrType, itemId = '') {
  const selection = typeof selectionOrType === 'string'
    ? { type: selectionOrType, id: itemId }
    : selectionOrType;
  const pointField = getPointField(document);
  const item = getAboutNarrativePointFieldSelectionObject(document, selection);
  if (!pointField || !item) return '';
  const stateById = new Map(pointField.stateDefinitions.map((state) => [state.id, state]));
  if (selection.type === 'point-field-state') return item.label || item.id;
  if (selection.type === 'point-field-key') {
    return `${stateById.get(item.stateId)?.label || item.stateId} key`;
  }
  const from = pointField.keys.find((key) => key.id === item.fromKeyId);
  const to = pointField.keys.find((key) => key.id === item.toKeyId);
  const fromLabel = stateById.get(from?.stateId)?.label || from?.stateId || 'Unknown';
  const toLabel = stateById.get(to?.stateId)?.label || to?.stateId || 'Unknown';
  return from?.stateId === to?.stateId ? `${fromLabel} hold` : `${fromLabel} → ${toLabel}`;
}

export function getAboutNarrativePointFieldStateUseCount(document, stateId) {
  const keys = getPointField(document)?.keys.filter((key) => key.stateId === stateId).length || 0;
  const interactions = document?.tracks?.interactions?.clips
    ?.filter((clip) => clip.targetStateId === stateId).length || 0;
  return Object.freeze({ keys, interactions, total: keys + interactions });
}

export function moveAboutNarrativePointFieldKey(input, {
  keyId,
  atWU,
  scope = 'base',
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  if (!requireScope(scope)) return invalidResult('edit-scope', `Unknown point-field edit scope “${scope}”.`);
  if (!Number.isFinite(Number(atWU))) return invalidResult('key-time', 'Point-field key time must be finite.');
  const document = prepared.document;
  const key = getItem(document, 'point-field-key', keyId);
  if (!key) return invalidResult('missing-key', `Point-field key “${keyId}” does not exist.`);
  if (key.protected === true) return invalidResult('protected-key', 'Protected boundary keys cannot move.');
  const bounds = keyBounds(document, scope, keyId);
  if (!bounds || bounds.minimum > bounds.maximum + TIME_EPSILON) {
    return invalidResult('key-bounds', 'The resolved profile timelines do not share a valid key range.');
  }
  const nextWU = cleanWU(clamp(Number(atWU), bounds.minimum, bounds.maximum));
  if (scope === 'base') key.atWU = nextWU;
  else setProfileKeyTime(document, scope, keyId, nextWU);
  return commitDocument(input, document, { type: 'point-field-key', id: keyId }, {
    requestedAtWU: Number(atWU),
    appliedAtWU: nextWU,
    clamped: Math.abs(nextWU - Number(atWU)) > TIME_EPSILON,
  });
}

export function moveAboutNarrativePointFieldSegment(input, {
  segmentId,
  deltaWU,
  scope = 'base',
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  if (!requireScope(scope)) return invalidResult('edit-scope', `Unknown point-field edit scope “${scope}”.`);
  if (!Number.isFinite(Number(deltaWU))) return invalidResult('segment-delta', 'Point-field segment movement must be finite.');
  const document = prepared.document;
  const baseSegment = getItem(document, 'point-field-segment', segmentId);
  if (!baseSegment) return invalidResult('missing-segment', `Point-field segment “${segmentId}” does not exist.`);
  const fromBase = getItem(document, 'point-field-key', baseSegment.fromKeyId);
  const toBase = getItem(document, 'point-field-key', baseSegment.toKeyId);
  if (fromBase?.protected || toBase?.protected) {
    return invalidResult('protected-segment-edge', 'A segment touching a protected boundary cannot move as a unit.');
  }
  if (scope === 'base' && PROFILE_IDS.some((profileId) => (
    hasOwnTimeOverride(document, profileId, fromBase.id)
    || hasOwnTimeOverride(document, profileId, toBase.id)
  ))) {
    return invalidResult(
      'profile-key-override',
      'Reset the segment boundary profile overrides or move this segment in each profile.',
    );
  }
  const contexts = scope === 'base'
    ? [document.tracks.pointField, ...PROFILE_IDS.map((profileId) => profilePointField(document, profileId))]
    : [profilePointField(document, scope)];
  let minimumDelta = Number.NEGATIVE_INFINITY;
  let maximumDelta = Number.POSITIVE_INFINITY;
  for (const pointField of contexts) {
    const index = segmentIndex(pointField, segmentId);
    if (index < 0) return invalidResult('missing-segment', `Point-field segment “${segmentId}” does not exist in every resolved profile.`);
    const segment = pointField.segments[index];
    const fromIndex = keyIndex(pointField, segment.fromKeyId);
    const toIndex = keyIndex(pointField, segment.toKeyId);
    const previousSegment = pointField.segments[index - 1];
    const nextSegment = pointField.segments[index + 1];
    if ((previousSegment && previousSegment.transition.type !== 'hold')
      || (nextSegment && nextSegment.transition.type !== 'hold')) {
      return invalidResult('segment-neighbour-motion', 'A segment can move as a unit only when its neighbouring spans are holds.');
    }
    const fromWU = Number(pointField.keys[fromIndex].atWU);
    const toWU = Number(pointField.keys[toIndex].atWU);
    const previousWU = Number(pointField.keys[fromIndex - 1]?.atWU ?? fromWU);
    const nextWU = Number(pointField.keys[toIndex + 1]?.atWU ?? toWU);
    minimumDelta = Math.max(minimumDelta, previousWU - fromWU);
    maximumDelta = Math.min(maximumDelta, nextWU - toWU);
  }
  if (minimumDelta > maximumDelta + TIME_EPSILON) {
    return invalidResult('segment-bounds', 'The resolved profile timelines do not share a valid segment movement range.');
  }
  const appliedDeltaWU = cleanWU(clamp(Number(deltaWU), minimumDelta, maximumDelta));
  if (scope === 'base') {
    fromBase.atWU = cleanWU(Number(fromBase.atWU) + appliedDeltaWU);
    toBase.atWU = cleanWU(Number(toBase.atWU) + appliedDeltaWU);
  } else {
    const resolved = profilePointField(document, scope);
    const from = resolved.keys.find((key) => key.id === fromBase.id);
    const to = resolved.keys.find((key) => key.id === toBase.id);
    setProfileKeyTime(document, scope, fromBase.id, Number(from.atWU) + appliedDeltaWU);
    setProfileKeyTime(document, scope, toBase.id, Number(to.atWU) + appliedDeltaWU);
  }
  return commitDocument(input, document, { type: 'point-field-segment', id: segmentId }, {
    requestedDeltaWU: Number(deltaWU),
    appliedDeltaWU,
    clamped: Math.abs(appliedDeltaWU - Number(deltaWU)) > TIME_EPSILON,
  });
}

export function duplicateAboutNarrativePointFieldState(input, {
  stateId,
  id = '',
  label = '',
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  const document = prepared.document;
  const source = getItem(document, 'point-field-state', stateId);
  if (!source) return invalidResult('missing-state', `Point-field state “${stateId}” does not exist.`);
  const nextId = uniqueId(document, id || `${stateId}-copy`);
  const duplicate = {
    ...clone(source),
    id: nextId,
    label: String(label || `${source.label} copy`),
  };
  delete duplicate.protected;
  document.tracks.pointField.stateDefinitions.push(duplicate);
  PROFILE_IDS.forEach((profileId) => {
    const overrides = document.profiles[profileId].overrides.pointField.stateDefinitions;
    if (overrides[source.id]) overrides[nextId] = clone(overrides[source.id]);
  });
  return commitDocument(input, document, { type: 'point-field-state', id: nextId }, { stateId: nextId });
}

export function makeAboutNarrativePointFieldKeyStateUnique(input, {
  keyId,
  id = '',
  label = '',
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  const document = prepared.document;
  const key = getItem(document, 'point-field-key', keyId);
  if (!key) return invalidResult('missing-key', `Point-field key “${keyId}” does not exist.`);
  if (key.protected === true) return invalidResult('protected-key', 'Protected boundary keys cannot change state ownership.');
  const source = getItem(document, 'point-field-state', key.stateId);
  const nextId = uniqueId(document, id || `${source.id}-copy`);
  const duplicate = {
    ...clone(source),
    id: nextId,
    label: String(label || `${source.label} copy`),
  };
  delete duplicate.protected;
  document.tracks.pointField.stateDefinitions.push(duplicate);
  PROFILE_IDS.forEach((profileId) => {
    const overrides = document.profiles[profileId].overrides.pointField.stateDefinitions;
    if (overrides[source.id]) overrides[nextId] = clone(overrides[source.id]);
  });
  key.stateId = nextId;
  repairAdjacentTransitions(document, keyId);
  return commitDocument(input, document, { type: 'point-field-key', id: keyId }, { stateId: nextId });
}

export function deleteAboutNarrativePointFieldState(input, { stateId } = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  const document = prepared.document;
  const state = getItem(document, 'point-field-state', stateId);
  if (!state) return invalidResult('missing-state', `Point-field state “${stateId}” does not exist.`);
  if (state.protected === true) return invalidResult('protected-state', 'The protected finale state cannot be deleted.');
  const uses = getAboutNarrativePointFieldStateUseCount(document, stateId);
  if (uses.total > 0) {
    return invalidResult(
      'state-in-use',
      `State “${stateId}” is still used by ${uses.keys} key(s) and ${uses.interactions} interaction(s).`,
    );
  }
  document.tracks.pointField.stateDefinitions = document.tracks.pointField.stateDefinitions
    .filter((item) => item.id !== stateId);
  PROFILE_IDS.forEach((profileId) => {
    delete document.profiles[profileId].overrides.pointField.stateDefinitions[stateId];
  });
  return commitDocument(input, document, { type: 'track', id: 'point-field' }, { deletedStateId: stateId });
}

/**
 * Splits one segment by duplicating either its source or destination key state.
 * The original segment ID stays with the transition-bearing half; the other
 * half becomes an explicit settled hold.
 */
export function splitAboutNarrativePointFieldSegment(input, {
  segmentId,
  atWU,
  duplicate = 'source',
  keyId = '',
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  if (!['source', 'destination'].includes(duplicate)) {
    return invalidResult('split-mode', 'Segment split mode must duplicate the source or destination state.');
  }
  if (!Number.isFinite(Number(atWU))) return invalidResult('split-time', 'Segment split time must be finite.');
  const document = prepared.document;
  const pointField = document.tracks.pointField;
  const index = segmentIndex(pointField, segmentId);
  if (index < 0) return invalidResult('missing-segment', `Point-field segment “${segmentId}” does not exist.`);
  let minimum = Number.NEGATIVE_INFINITY;
  let maximum = Number.POSITIVE_INFINITY;
  for (const resolved of [pointField, ...PROFILE_IDS.map((profileId) => profilePointField(document, profileId))]) {
    const resolvedSegment = resolved.segments.find((segment) => segment.id === segmentId);
    const from = resolved.keys.find((key) => key.id === resolvedSegment.fromKeyId);
    const to = resolved.keys.find((key) => key.id === resolvedSegment.toKeyId);
    minimum = Math.max(minimum, Number(from.atWU));
    maximum = Math.min(maximum, Number(to.atWU));
  }
  if (minimum > maximum + TIME_EPSILON) {
    return invalidResult('split-bounds', 'The resolved profile segments do not share a splittable time range.');
  }
  const appliedAtWU = cleanWU(clamp(Number(atWU), minimum, maximum));
  const segment = pointField.segments[index];
  const fromKey = pointField.keys.find((key) => key.id === segment.fromKeyId);
  const toKey = pointField.keys.find((key) => key.id === segment.toKeyId);
  const nextKeyId = uniqueId(document, keyId || `key-${segment.id}-split`);
  const nextKey = {
    id: nextKeyId,
    atWU: appliedAtWU,
    stateId: duplicate === 'source' ? fromKey.stateId : toKey.stateId,
  };
  const fromIndex = keyIndex(pointField, fromKey.id);
  pointField.keys.splice(fromIndex + 1, 0, nextKey);
  const holdSegment = {
    id: uniqueId(document, `segment-${nextKeyId}-hold`),
    fromKeyId: duplicate === 'source' ? fromKey.id : nextKeyId,
    toKeyId: duplicate === 'source' ? nextKeyId : toKey.id,
    transition: neutralHoldTransition(),
  };
  if (duplicate === 'source') {
    pointField.segments.splice(index, 1, holdSegment, {
      ...segment,
      fromKeyId: nextKeyId,
    });
  } else {
    pointField.segments.splice(index, 1, {
      ...segment,
      toKeyId: nextKeyId,
    }, holdSegment);
  }
  return commitDocument(input, document, { type: 'point-field-key', id: nextKeyId }, {
    keyId: nextKeyId,
    retainedSegmentId: segmentId,
    createdSegmentId: holdSegment.id,
    requestedAtWU: Number(atWU),
    appliedAtWU,
    clamped: Math.abs(appliedAtWU - Number(atWU)) > TIME_EPSILON,
  });
}

export function writeAboutNarrativePointFieldTarget(input, {
  scope = 'base',
  type,
  id,
  patch,
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  if (!requireScope(scope)) return invalidResult('edit-scope', `Unknown point-field edit scope “${scope}”.`);
  if (!SELECTION_TYPES.has(type)) return invalidResult('target-type', `Unknown point-field target type “${type}”.`);
  if (!isObject(patch)) return invalidResult('target-patch', 'Point-field target patch must be an object.');
  const allowed = scope === 'base' ? BASE_PATCH_KEYS[type] : PROFILE_PATCH_KEYS[type];
  const unsupported = Object.keys(patch).find((key) => !allowed.has(key));
  if (unsupported) {
    return invalidResult(
      'target-patch-scope',
      `Field “${unsupported}” cannot be edited in the ${scope} ${type} scope.`,
    );
  }
  if (type === 'point-field-key' && Object.hasOwn(patch, 'atWU')) {
    if (Object.keys(patch).length !== 1) {
      return invalidResult('target-patch-scope', 'Key timing must be written as one atomic point-field edit.');
    }
    return moveAboutNarrativePointFieldKey(prepared.document, { keyId: id, atWU: patch.atWU, scope });
  }
  const document = prepared.document;
  const target = getItem(document, type, id);
  if (!target) return invalidResult('missing-target', `Point-field target “${id}” does not exist.`);
  if (target.protected === true && type === 'point-field-key') {
    return invalidResult('protected-target', 'Protected point-field keys cannot change state ownership.');
  }
  if (target.protected === true && type === 'point-field-state'
    && (Object.hasOwn(patch, 'adapterId') || Object.hasOwn(patch, 'shapeId'))) {
    return invalidResult('protected-target', 'The protected finale state cannot change shape or adapter.');
  }
  if (scope === 'base') Object.assign(target, mergeDeep(target, patch));
  else {
    const collection = COLLECTION_BY_TYPE[type];
    const overrides = document.profiles[scope].overrides.pointField[collection];
    overrides[id] = mergeDeep(overrides[id] || {}, patch);
  }
  if (type === 'point-field-key' && Object.hasOwn(patch, 'stateId')) repairAdjacentTransitions(document, id);
  return commitDocument(input, document, { type, id });
}

export function resetAboutNarrativePointFieldOverride(input, {
  profileId,
  type,
  id,
} = {}) {
  const prepared = prepareDocument(input);
  if (!prepared.valid) return prepared;
  if (!PROFILE_IDS.includes(profileId)) return invalidResult('edit-scope', `Unknown point-field profile “${profileId}”.`);
  if (!SELECTION_TYPES.has(type)) return invalidResult('target-type', `Unknown point-field target type “${type}”.`);
  const document = prepared.document;
  const collection = COLLECTION_BY_TYPE[type];
  delete document.profiles[profileId].overrides.pointField[collection][id];
  return commitDocument(input, document, { type, id }, { resetProfileId: profileId });
}
