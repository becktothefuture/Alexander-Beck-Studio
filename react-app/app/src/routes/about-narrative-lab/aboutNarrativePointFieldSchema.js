import {
  ABOUT_NARRATIVE_ADAPTER_DEFINITIONS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
} from './aboutNarrativeDefinitions.js';
import {
  applyAboutNarrativeWorldTransitionEasing,
} from './aboutNarrativeMotionMath.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES,
  ABOUT_NARRATIVE_POINT_FIELD_MOTION_AXES,
  ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS,
  ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES,
  ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES,
  resolveAboutNarrativePointFieldTransitionMotion,
} from './aboutNarrativePointFieldMotion.js';
import {
  ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS,
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
  normalizeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from './aboutNarrativeTrackSchema.js';

export const ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION = 6;

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_EPSILON = 0.000001;
const V6_TRANSITION_TYPES = Object.freeze([
  'morph',
  'dissolve-morph',
  'hold',
  'step-end',
]);
const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'globals', 'profiles', 'tracks', 'library']);
const TRACK_KEYS = new Set(['camera', 'visibility', 'pointField', 'text', 'interactions']);
const POINT_FIELD_KEYS = new Set(['stateDefinitions', 'keys', 'segments']);
const STATE_KEYS = new Set([
  'id',
  'label',
  'adapterId',
  'shapeId',
  'seed',
  'railAnchorWU',
  'entryDistanceWU',
  'transform',
  'shapeParameters',
  'modifiers',
  'protected',
]);
const KEY_KEYS = new Set(['id', 'atWU', 'stateId', 'protected']);
const SEGMENT_KEYS = new Set(['id', 'fromKeyId', 'toKeyId', 'transition']);
const TRANSITION_KEYS = new Set([
  'type',
  'easing',
  'correspondence',
  'progress',
  'stagger',
  'path',
  'flatten',
]);
const STAGGER_KEYS = new Set(['mode', 'amount', 'axis', 'seed']);
const PATH_KEYS = new Set(['mode', 'amount', 'axis', 'frequency', 'seed']);
const FLATTEN_KEYS = new Set(['mode', 'amount', 'axis', 'offset']);
const INTERACTION_KEYS = new Set([
  'id',
  'type',
  'startWU',
  'activationWU',
  'endWU',
  'targetStateId',
  'parameters',
  'protected',
]);
const PROFILE_OVERRIDE_KEYS = new Set([
  'camera',
  'visibility',
  'pointField',
  'text',
  'interactions',
]);
const POINT_FIELD_OVERRIDE_KEYS = new Set(['stateDefinitions', 'keys', 'segments']);
const V5_PROJECTION_ONLY_INTERACTION_CODES = new Set([
  'interaction-world-window',
  'profile-interaction-window',
]);
const STATE_OVERRIDE_KEYS = new Set(['railAnchorWU', 'transform']);
const KEY_OVERRIDE_KEYS = new Set(['atWU']);
const SEGMENT_OVERRIDE_KEYS = new Set(['transition']);

const clone = (value) => (value === undefined ? undefined : structuredClone(value));
const finite = (value) => Number.isFinite(Number(value));
const cleanWU = (value) => Number(Number(value).toFixed(6));
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function diagnostic(diagnostics, code, path, message) {
  diagnostics.push({ level: 'error', code, path, message });
}

function unknownKeys(diagnostics, value, allowed, path) {
  if (!isObject(value)) {
    diagnostic(diagnostics, 'object-envelope', path, 'Expected an object.');
    return false;
  }
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) {
      diagnostic(diagnostics, 'unknown-key', `${path}.${key}`, `Unknown field “${key}”.`);
    }
  });
  return true;
}

function validateId(value, seen, diagnostics, path) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    diagnostic(diagnostics, 'object-id', path, 'IDs must be non-empty lower-case slugs.');
    return;
  }
  if (seen.has(value)) diagnostic(diagnostics, 'duplicate-id', path, `Duplicate ID “${value}”.`);
  seen.add(value);
}

function validateVector(value, diagnostics, path) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !finite(item))) {
    diagnostic(diagnostics, 'vector', path, 'Expected three finite numbers.');
  }
}

function validateTransform(transform, diagnostics, path, { partial = false } = {}) {
  const allowed = new Set([
    'position',
    'rotation',
    'scale',
    'pointSizeScale',
    'mobileScale',
    'mobileXScale',
    'mobileYOffset',
    'mobileZOffset',
    'mobileNarrowWidth',
    'mobileWideWidth',
    'mobileNarrowScale',
    'mobileNarrowYOffset',
    'mobileNarrowDensity',
    'mobileLandscapeScale',
    'mobileLandscapeXScale',
    'mobileLandscapeXOffset',
    'mobileLandscapeYOffset',
    'mobileLandscapeZOffset',
  ]);
  if (!unknownKeys(diagnostics, transform, allowed, path)) return;
  if (!partial || transform.position != null) validateVector(transform.position, diagnostics, `${path}.position`);
  if (!partial || transform.rotation != null) validateVector(transform.rotation, diagnostics, `${path}.rotation`);
  ['scale', 'pointSizeScale', 'mobileScale', 'mobileXScale', 'mobileNarrowWidth', 'mobileWideWidth', 'mobileNarrowScale', 'mobileLandscapeScale', 'mobileLandscapeXScale']
    .forEach((key) => {
      const required = key === 'scale' && !partial;
      if ((required || transform[key] != null) && (!finite(transform[key]) || Number(transform[key]) <= 0)) {
        diagnostic(diagnostics, 'state-scale', `${path}.${key}`, 'Scale values must be positive and finite.');
      }
    });
  ['mobileYOffset', 'mobileZOffset', 'mobileNarrowYOffset', 'mobileLandscapeXOffset', 'mobileLandscapeYOffset', 'mobileLandscapeZOffset']
    .forEach((key) => {
      if (transform[key] != null && !finite(transform[key])) {
        diagnostic(diagnostics, 'state-transform-number', `${path}.${key}`, 'Responsive transform values must be finite.');
      }
    });
  if (transform.mobileNarrowDensity != null
    && (!finite(transform.mobileNarrowDensity)
      || Number(transform.mobileNarrowDensity) < 0
      || Number(transform.mobileNarrowDensity) > 1)) {
    diagnostic(diagnostics, 'state-density', `${path}.mobileNarrowDensity`, 'Narrow mobile density must stay between 0 and 1.');
  }
  if (finite(transform.mobileNarrowWidth)
    && finite(transform.mobileWideWidth)
    && Number(transform.mobileNarrowWidth) >= Number(transform.mobileWideWidth)) {
    diagnostic(diagnostics, 'state-responsive-width', path, 'Narrow mobile width must be less than wide mobile width.');
  }
}

function validateControlValue(value, control, diagnostics, path) {
  if (control.type === 'range') {
    if (!finite(value) || Number(value) < control.min || Number(value) > control.max) {
      diagnostic(diagnostics, 'parameter-range', path, `${control.label} must stay between ${control.min} and ${control.max}.`);
    }
  } else if (control.type === 'select' && !control.options.includes(value)) {
    diagnostic(diagnostics, 'parameter-option', path, `${control.label} has an unsupported value.`);
  }
}

function validateStateDefinition(state, diagnostics, path, seenIds) {
  if (!unknownKeys(diagnostics, state, STATE_KEYS, path)) return;
  validateId(state.id, seenIds, diagnostics, `${path}.id`);
  if (typeof state.label !== 'string' || !state.label.trim()) {
    diagnostic(diagnostics, 'state-label', `${path}.label`, 'Point-field states require a label.');
  }
  const adapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[state.adapterId];
  const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[state.shapeId];
  if (!adapter) diagnostic(diagnostics, 'state-adapter', `${path}.adapterId`, 'Unknown point-field adapter.');
  if (!shape) diagnostic(diagnostics, 'state-shape', `${path}.shapeId`, 'Unknown point-field shape.');
  if (adapter && shape && adapter.id !== shape.adapterId) {
    diagnostic(diagnostics, 'state-shape-adapter', path, 'Point-field shape is incompatible with its adapter.');
  }
  if (!Number.isInteger(Number(state.seed))) diagnostic(diagnostics, 'state-seed', `${path}.seed`, 'State seed must be an integer.');
  if (!finite(state.railAnchorWU)) diagnostic(diagnostics, 'state-rail-anchor', `${path}.railAnchorWU`, 'Rail anchor must be finite.');
  if (!finite(state.entryDistanceWU)) diagnostic(diagnostics, 'state-entry-distance', `${path}.entryDistanceWU`, 'Entry distance must be finite.');
  if (state.protected != null && typeof state.protected !== 'boolean') {
    diagnostic(diagnostics, 'state-protected', `${path}.protected`, 'protected must be boolean.');
  }
  validateTransform(state.transform, diagnostics, `${path}.transform`);
  if (!isObject(state.shapeParameters)) {
    diagnostic(diagnostics, 'shape-parameters', `${path}.shapeParameters`, 'Shape parameters must be an object.');
  } else if (shape) {
    unknownKeys(diagnostics, state.shapeParameters, new Set(shape.parameters.map((item) => item.id)), `${path}.shapeParameters`);
    shape.parameters.forEach((control) => {
      validateControlValue(state.shapeParameters[control.id], control, diagnostics, `${path}.shapeParameters.${control.id}`);
    });
  }
  if (!Array.isArray(state.modifiers)) {
    diagnostic(diagnostics, 'state-modifiers', `${path}.modifiers`, 'Modifiers must be an array.');
    return;
  }
  const modifierIds = new Set();
  state.modifiers.forEach((modifier, index) => {
    const modifierPath = `${path}.modifiers.${index}`;
    if (!unknownKeys(diagnostics, modifier, new Set(['id', 'enabled', 'parameters']), modifierPath)) return;
    const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
    if (!definition) diagnostic(diagnostics, 'modifier-id', `${modifierPath}.id`, 'Unknown modifier.');
    if (modifierIds.has(modifier.id)) diagnostic(diagnostics, 'modifier-duplicate', `${modifierPath}.id`, 'A modifier may appear only once.');
    modifierIds.add(modifier.id);
    if (typeof modifier.enabled !== 'boolean') diagnostic(diagnostics, 'modifier-enabled', `${modifierPath}.enabled`, 'enabled must be boolean.');
    if (!isObject(modifier.parameters)) {
      diagnostic(diagnostics, 'modifier-parameters', `${modifierPath}.parameters`, 'Modifier parameters must be an object.');
    } else if (definition) {
      unknownKeys(diagnostics, modifier.parameters, new Set(definition.parameters.map((item) => item.id)), `${modifierPath}.parameters`);
      definition.parameters.forEach((control) => {
        validateControlValue(modifier.parameters[control.id], control, diagnostics, `${modifierPath}.parameters.${control.id}`);
      });
    }
  });
}

function validateMotionEnvelope(value, definition, diagnostics, path) {
  if (value == null) return;
  if (!unknownKeys(diagnostics, value, definition.keys, path)) return;
  if (value.mode != null && !definition.modes.includes(value.mode)) {
    diagnostic(diagnostics, 'transition-motion-mode', `${path}.mode`, 'Unsupported transition motion mode.');
  }
  if (value.amount != null && (
    !finite(value.amount)
    || Number(value.amount) < ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.amount.min
    || Number(value.amount) > ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.amount.max
  )) {
    diagnostic(diagnostics, 'transition-motion-amount', `${path}.amount`, 'Transition motion amount must stay between 0 and 1.');
  }
  if (value.axis != null && !ABOUT_NARRATIVE_POINT_FIELD_MOTION_AXES.includes(value.axis)) {
    diagnostic(diagnostics, 'transition-motion-axis', `${path}.axis`, 'Transition motion axis must be x, y, or z.');
  }
  if (value.seed != null && (
    !Number.isInteger(Number(value.seed))
    || Number(value.seed) < ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.seed.min
    || Number(value.seed) > ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.seed.max
  )) {
    diagnostic(diagnostics, 'transition-motion-seed', `${path}.seed`, 'Transition motion seed must be a 32-bit unsigned integer.');
  }
  if (value.frequency != null && (
    !finite(value.frequency)
    || Number(value.frequency) < ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.frequency.min
    || Number(value.frequency) > ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.frequency.max
  )) {
    diagnostic(diagnostics, 'transition-motion-frequency', `${path}.frequency`, 'Transition path frequency must stay between 0.25 and 8.');
  }
  if (value.offset != null && (
    !finite(value.offset)
    || Number(value.offset) < ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.planeOffset.min
    || Number(value.offset) > ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.planeOffset.max
  )) {
    diagnostic(diagnostics, 'transition-motion-plane-offset', `${path}.offset`, 'Transition plane offset must stay between -8 and 8.');
  }
}

function isNeutralHoldMotion(transition) {
  const motion = resolveAboutNarrativePointFieldTransitionMotion(transition);
  return motion.stagger.mode === 'uniform'
    && motion.stagger.amount === 0
    && motion.path.mode === 'direct'
    && motion.path.amount === 0
    && motion.flatten.mode === 'none'
    && motion.flatten.amount === 0;
}

function validateTransition(transition, diagnostics, path, fromStateId, toStateId) {
  if (!unknownKeys(diagnostics, transition, TRANSITION_KEYS, path)) return;
  if (!V6_TRANSITION_TYPES.includes(transition.type)) {
    diagnostic(
      diagnostics,
      transition.type === 'crossfade' ? 'transition-crossfade-unsupported' : 'transition-type',
      `${path}.type`,
      transition.type === 'crossfade'
        ? 'Schema v6 does not support crossfade transitions.'
        : 'Unsupported point-field transition type.',
    );
  }
  if (!ABOUT_NARRATIVE_EASINGS.includes(transition.easing)) {
    diagnostic(diagnostics, 'transition-easing', `${path}.easing`, 'Unsupported transition easing.');
  }
  const sameState = fromStateId === toStateId;
  if (sameState && transition.type !== 'hold') {
    diagnostic(diagnostics, 'same-state-transition', `${path}.type`, 'Same-state segments must use an explicit neutral hold.');
  }
  if (transition.type === 'hold') {
    if (fromStateId !== toStateId) diagnostic(diagnostics, 'hold-state', path, 'Hold segments must keep the same state.');
    if (transition.progress !== 1) diagnostic(diagnostics, 'hold-progress', `${path}.progress`, 'Hold segments must be explicitly settled at progress 1.');
    if (transition.correspondence !== null) diagnostic(diagnostics, 'hold-correspondence', `${path}.correspondence`, 'Hold segments must not request correspondence.');
    if (!isNeutralHoldMotion(transition)) diagnostic(diagnostics, 'hold-motion', path, 'Hold segments must use neutral stagger, path, and flatten motion.');
  } else {
    if (transition.progress != null) diagnostic(diagnostics, 'transition-progress-owner', `${path}.progress`, 'Only hold segments may persist settled progress.');
    if (transition.correspondence != null && !ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(transition.correspondence)) {
      diagnostic(diagnostics, 'transition-correspondence', `${path}.correspondence`, 'Unsupported correspondence strategy.');
    }
  }
  if (transition.type === 'step-end' && fromStateId === toStateId) {
    diagnostic(diagnostics, 'step-end-state', path, 'step-end is reserved for a change to a different state.');
  }
  validateMotionEnvelope(transition.stagger, {
    keys: STAGGER_KEYS,
    modes: ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES,
  }, diagnostics, `${path}.stagger`);
  validateMotionEnvelope(transition.path, {
    keys: PATH_KEYS,
    modes: ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES,
  }, diagnostics, `${path}.path`);
  validateMotionEnvelope(transition.flatten, {
    keys: FLATTEN_KEYS,
    modes: ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES,
  }, diagnostics, `${path}.flatten`);
}

function sortedKeys(pointField) {
  return [...(pointField?.keys || [])]
    .sort((left, right) => Number(left.atWU) - Number(right.atWU));
}

function validatePointFieldTrack(pointField, diagnostics, path, durationWU) {
  if (!unknownKeys(diagnostics, pointField, POINT_FIELD_KEYS, path)) return;
  const states = pointField.stateDefinitions;
  const keys = pointField.keys;
  const segments = pointField.segments;
  if (!Array.isArray(states) || states.length < 1) diagnostic(diagnostics, 'point-field-states', `${path}.stateDefinitions`, 'Point field requires at least one state definition.');
  if (!Array.isArray(keys) || keys.length < 1) diagnostic(diagnostics, 'point-field-keys', `${path}.keys`, 'Point field requires at least one key.');
  if (!Array.isArray(segments)) diagnostic(diagnostics, 'point-field-segments', `${path}.segments`, 'Point-field segments must be an array.');
  if (!Array.isArray(states) || !Array.isArray(keys) || !Array.isArray(segments)) return;

  const seenIds = new Set();
  states.forEach((state, index) => validateStateDefinition(state, diagnostics, `${path}.stateDefinitions.${index}`, seenIds));
  const stateIds = new Set(states.map((state) => state.id));
  let previousWU = -1;
  keys.forEach((key, index) => {
    const keyPath = `${path}.keys.${index}`;
    if (!unknownKeys(diagnostics, key, KEY_KEYS, keyPath)) return;
    validateId(key.id, seenIds, diagnostics, `${keyPath}.id`);
    if (!finite(key.atWU) || Number(key.atWU) < 0 || Number(key.atWU) > durationWU) {
      diagnostic(diagnostics, 'key-time', `${keyPath}.atWU`, 'Point-field key timing must stay inside Story WU.');
    }
    if (Number(key.atWU) < previousWU) diagnostic(diagnostics, 'key-order', `${keyPath}.atWU`, 'Point-field keys must be ordered by atWU.');
    previousWU = Number(key.atWU);
    if (!stateIds.has(key.stateId)) diagnostic(diagnostics, 'key-state', `${keyPath}.stateId`, `Unknown state “${key.stateId}”.`);
    if (key.protected != null && typeof key.protected !== 'boolean') diagnostic(diagnostics, 'key-protected', `${keyPath}.protected`, 'protected must be boolean.');
  });
  if (keys.length && Number(keys[0].atWU) !== 0) diagnostic(diagnostics, 'key-origin', `${path}.keys.0.atWU`, 'The first point-field key must be at WU 0.');
  if (keys.length && keys[0].protected !== true) diagnostic(diagnostics, 'key-start-protected', `${path}.keys.0.protected`, 'The first point-field key must be protected.');
  if (keys.length && keys.at(-1).protected !== true) diagnostic(diagnostics, 'key-end-protected', `${path}.keys.${keys.length - 1}.protected`, 'The final point-field key must be protected.');
  const finalState = states.find((state) => state.id === keys.at(-1)?.stateId);
  if (finalState?.protected !== true) diagnostic(diagnostics, 'final-state-protected', `${path}.stateDefinitions`, 'The final point-field state must remain protected.');

  const keyById = new Map(keys.map((key) => [key.id, key]));
  const segmentByPair = new Map();
  segments.forEach((segment, index) => {
    const segmentPath = `${path}.segments.${index}`;
    if (!unknownKeys(diagnostics, segment, SEGMENT_KEYS, segmentPath)) return;
    validateId(segment.id, seenIds, diagnostics, `${segmentPath}.id`);
    const fromKey = keyById.get(segment.fromKeyId);
    const toKey = keyById.get(segment.toKeyId);
    if (!fromKey) diagnostic(diagnostics, 'segment-from-key', `${segmentPath}.fromKeyId`, `Unknown key “${segment.fromKeyId}”.`);
    if (!toKey) diagnostic(diagnostics, 'segment-to-key', `${segmentPath}.toKeyId`, `Unknown key “${segment.toKeyId}”.`);
    const pairId = `${segment.fromKeyId}->${segment.toKeyId}`;
    if (segmentByPair.has(pairId)) diagnostic(diagnostics, 'segment-duplicate-pair', segmentPath, 'Adjacent keys may be connected only once.');
    segmentByPair.set(pairId, segment);
    if (fromKey && toKey && Number(toKey.atWU) < Number(fromKey.atWU)) {
      diagnostic(diagnostics, 'segment-order', segmentPath, 'Segment end must not precede its start.');
    }
    validateTransition(segment.transition, diagnostics, `${segmentPath}.transition`, fromKey?.stateId, toKey?.stateId);
  });
  if (segments.length !== Math.max(0, keys.length - 1)) {
    diagnostic(diagnostics, 'segment-count', `${path}.segments`, 'Segments must connect every adjacent point-field key exactly once.');
  }
  for (let index = 0; index < keys.length - 1; index += 1) {
    const pairId = `${keys[index].id}->${keys[index + 1].id}`;
    if (!segmentByPair.has(pairId)) diagnostic(diagnostics, 'segment-adjacency', `${path}.segments`, `Missing adjacent segment ${pairId}.`);
  }
  const settledSequence = keys.map((key) => key.stateId)
    .filter((stateId, index, values) => index === 0 || stateId !== values[index - 1]);
  const visitedStates = new Set();
  settledSequence.forEach((stateId, index) => {
    if (visitedStates.has(stateId)) {
      diagnostic(
        diagnostics,
        'state-recurrence-unsupported',
        `${path}.keys`,
        `State “${stateId}” recurs non-contiguously at settled occurrence ${index}; v5 parity projection cannot represent reusable-state recurrence yet.`,
      );
    }
    visitedStates.add(stateId);
  });
}

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

function applyIdOverrides(items, overrides) {
  return items.map((item) => mergeDeep(item, overrides?.[item.id] || {}));
}

export function applyAboutNarrativePointFieldOverrides(pointField, overrides = {}) {
  return {
    stateDefinitions: applyIdOverrides(pointField.stateDefinitions, overrides.stateDefinitions),
    keys: applyIdOverrides(pointField.keys, overrides.keys),
    segments: applyIdOverrides(pointField.segments, overrides.segments),
  };
}

function validateOverrideMap(value, definitions, allowed, diagnostics, path, validateValue = null) {
  if (!isObject(value)) {
    diagnostic(diagnostics, 'override-envelope', path, 'Point-field overrides must be ID-addressed objects.');
    return;
  }
  const ids = new Set(definitions.map((item) => item.id));
  Object.entries(value).forEach(([id, override]) => {
    const itemPath = `${path}.${id}`;
    if (!ids.has(id)) diagnostic(diagnostics, 'override-target', itemPath, `Override target “${id}” does not exist.`);
    if (!unknownKeys(diagnostics, override, allowed, itemPath)) return;
    validateValue?.(override, itemPath);
  });
}

function validatePointFieldOverrides(overrides, pointField, diagnostics, path, durationWU) {
  if (!unknownKeys(diagnostics, overrides, POINT_FIELD_OVERRIDE_KEYS, path)) return;
  validateOverrideMap(
    overrides.stateDefinitions,
    pointField.stateDefinitions,
    STATE_OVERRIDE_KEYS,
    diagnostics,
    `${path}.stateDefinitions`,
    (override, itemPath) => {
      if (override.railAnchorWU != null && !finite(override.railAnchorWU)) diagnostic(diagnostics, 'state-rail-anchor', `${itemPath}.railAnchorWU`, 'Rail anchor must be finite.');
      if (override.transform != null) validateTransform(override.transform, diagnostics, `${itemPath}.transform`, { partial: true });
    },
  );
  validateOverrideMap(
    overrides.keys,
    pointField.keys,
    KEY_OVERRIDE_KEYS,
    diagnostics,
    `${path}.keys`,
    (override, itemPath) => {
      if (override.atWU != null && (!finite(override.atWU) || Number(override.atWU) < 0 || Number(override.atWU) > durationWU)) {
        diagnostic(diagnostics, 'key-time', `${itemPath}.atWU`, 'Point-field key timing must stay inside Story WU.');
      }
    },
  );
  validateOverrideMap(
    overrides.segments,
    pointField.segments,
    SEGMENT_OVERRIDE_KEYS,
    diagnostics,
    `${path}.segments`,
  );
  validatePointFieldTrack(
    applyAboutNarrativePointFieldOverrides(pointField, overrides),
    diagnostics,
    `${path}.$resolved`,
    durationWU,
  );
}

function mapV6InteractionToV5(clip) {
  const next = clone(clip);
  next.targetWorldId = next.targetStateId;
  delete next.targetStateId;
  return next;
}

function pointFieldError(name, code, path, message) {
  const error = new Error(message);
  error.name = name;
  error.diagnostics = [{ level: 'error', code, path, message }];
  return error;
}

function assertProjectableStateSequence(keys) {
  const settledSequence = keys.map((key) => key.stateId)
    .filter((stateId, index, values) => index === 0 || stateId !== values[index - 1]);
  const visitedStates = new Set();
  for (let index = 0; index < settledSequence.length; index += 1) {
    const stateId = settledSequence[index];
    if (visitedStates.has(stateId)) {
      throw pointFieldError(
        'AboutNarrativePointFieldProjectionError',
        'state-recurrence-unsupported',
        'tracks.pointField.keys',
        `State “${stateId}” recurs non-contiguously at settled occurrence ${index}; v5 parity projection cannot represent reusable-state recurrence yet.`,
      );
    }
    visitedStates.add(stateId);
  }
}

function createV5WorldsFromPointField(pointField) {
  const keys = sortedKeys(pointField);
  assertProjectableStateSequence(keys);
  const stateById = new Map(pointField.stateDefinitions.map((state) => [state.id, state]));
  const segmentByPair = new Map(pointField.segments.map((segment) => [
    `${segment.fromKeyId}->${segment.toKeyId}`,
    segment,
  ]));
  const worlds = [];
  const seenStates = new Set();
  keys.forEach((key, index) => {
    if (seenStates.has(key.stateId)) return;
    const state = stateById.get(key.stateId);
    if (!state) return;
    seenStates.add(key.stateId);
    const previousKey = keys[Math.max(0, index - 1)];
    const incoming = index > 0
      ? segmentByPair.get(`${previousKey.id}->${key.id}`)
      : null;
    const transition = incoming?.transition;
    const startWU = index > 0 ? Number(previousKey.atWU) : Number(key.atWU);
    const v5Type = transition?.type === 'step-end'
      ? 'cut'
      : transition?.type === 'hold' ? 'cut' : transition?.type || 'cut';
    worlds.push({
      id: state.id,
      label: state.label,
      startWU: cleanWU(startWU),
      anchorWU: cleanWU(state.railAnchorWU),
      adapterId: state.adapterId,
      shapeId: state.shapeId,
      seed: state.seed,
      entryDistanceWU: state.entryDistanceWU,
      transform: clone(state.transform),
      transitionIn: {
        startWU: cleanWU(index > 0 ? previousKey.atWU : key.atWU),
        endWU: cleanWU(key.atWU),
        type: v5Type,
        easing: transition?.easing || 'linear',
        correspondence: transition?.correspondence || 'index-v1',
      },
      shapeParameters: clone(state.shapeParameters),
      modifiers: clone(state.modifiers),
      ...(state.protected === true ? { protected: true } : {}),
    });
  });
  return worlds;
}

function deepDiff(base, value) {
  if (JSON.stringify(base) === JSON.stringify(value)) return undefined;
  if (!isObject(base) || !isObject(value)) return clone(value);
  const output = {};
  Object.keys(value).sort().forEach((key) => {
    const difference = deepDiff(base[key], value[key]);
    if (difference !== undefined) output[key] = difference;
  });
  return Object.keys(output).length ? output : undefined;
}

function diffV5Worlds(baseWorlds, resolvedWorlds) {
  const baseById = new Map(baseWorlds.map((world) => [world.id, world]));
  return Object.fromEntries(resolvedWorlds.flatMap((world) => {
    const base = baseById.get(world.id);
    if (!base) return [];
    const candidate = {
      startWU: world.startWU,
      anchorWU: world.anchorWU,
      transform: world.transform,
      transitionIn: world.transitionIn,
    };
    const baseline = {
      startWU: base.startWU,
      anchorWU: base.anchorWU,
      transform: base.transform,
      transitionIn: base.transitionIn,
    };
    const difference = deepDiff(baseline, candidate);
    return difference ? [[world.id, difference]] : [];
  }));
}

export function projectAboutNarrativePointFieldDocumentToVersion5(input) {
  const source = clone(input);
  const baseWorlds = createV5WorldsFromPointField(source.tracks.pointField);
  const profileEntries = Object.entries(source.profiles).map(([profileId, profile]) => {
    if (profileId === 'reduced-motion') return [profileId, clone(profile)];
    const overrides = profile.overrides || {};
    const resolvedPointField = applyAboutNarrativePointFieldOverrides(
      source.tracks.pointField,
      overrides.pointField,
    );
    const resolvedWorlds = createV5WorldsFromPointField(resolvedPointField);
    return [profileId, {
      ...clone(profile),
      overrides: {
        camera: clone(overrides.camera || {}),
        visibility: clone(overrides.visibility || {}),
        worlds: diffV5Worlds(baseWorlds, resolvedWorlds),
        text: clone(overrides.text || {}),
        interactions: clone(overrides.interactions || {}),
      },
    }];
  });
  return {
    schemaVersion: ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
    globals: clone(source.globals),
    profiles: Object.fromEntries(profileEntries),
    tracks: {
      camera: clone(source.tracks.camera),
      visibility: clone(source.tracks.visibility),
      worlds: { objects: baseWorlds },
      text: clone(source.tracks.text),
      interactions: {
        clips: source.tracks.interactions.clips.map(mapV6InteractionToV5),
      },
    },
    library: clone(source.library),
  };
}

function validateV6Interactions(interactions, stateIds, diagnostics, durationWU) {
  if (!unknownKeys(diagnostics, interactions, new Set(['clips']), 'tracks.interactions')) return;
  if (!Array.isArray(interactions.clips)) {
    diagnostic(diagnostics, 'interaction-track', 'tracks.interactions.clips', 'Interaction clips must be an array.');
    return;
  }
  interactions.clips.forEach((clip, index) => {
    const path = `tracks.interactions.clips.${index}`;
    if (!unknownKeys(diagnostics, clip, INTERACTION_KEYS, path)) return;
    if (!stateIds.has(clip.targetStateId)) diagnostic(diagnostics, 'interaction-target', `${path}.targetStateId`, `Unknown target state “${clip.targetStateId}”.`);
    const startWU = Number(clip.startWU);
    const activationWU = Number(clip.activationWU);
    const endWU = Number(clip.endWU);
    if (!(startWU >= 0
      && startWU <= activationWU
      && activationWU <= endWU
      && endWU <= durationWU)) {
      diagnostic(
        diagnostics,
        'interaction-time',
        path,
        'Interaction timing must remain ordered inside the Story duration.',
      );
    }
  });
}

function validateV6ProfileInteractions(input, diagnostics, durationWU) {
  if (!Array.isArray(input.tracks?.interactions?.clips)) return;
  if (!Array.isArray(input.tracks?.pointField?.stateDefinitions)
    || !Array.isArray(input.tracks?.pointField?.keys)
    || !Array.isArray(input.tracks?.pointField?.segments)) return;
  ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS.forEach((profileId) => {
    const profileOverrides = input.profiles?.[profileId]?.overrides || {};
    const overrides = profileOverrides.interactions || {};
    const pointField = applyAboutNarrativePointFieldOverrides(
      input.tracks.pointField,
      profileOverrides.pointField,
    );
    const keyById = new Map(pointField.keys.map((key) => [key.id, key]));
    input.tracks.interactions.clips.forEach((clip) => {
      if (!pointField.stateDefinitions.some((state) => state.id === clip.targetStateId)) return;
      const override = overrides[clip.id] || {};
      const startWU = Number(override.startWU ?? clip.startWU);
      const activationWU = Number(override.activationWU ?? clip.activationWU);
      const endWU = Number(override.endWU ?? clip.endWU);
      if (!(startWU >= 0
        && startWU <= activationWU
        && activationWU <= endWU
        && endWU <= durationWU)) {
        diagnostic(
          diagnostics,
          'profile-interaction-time',
          `profiles.${profileId}.overrides.interactions.${clip.id}`,
          'Profile interaction timing must remain ordered inside the Story duration.',
        );
        return;
      }
      const participates = pointField.segments.some((segment) => {
        const fromKey = keyById.get(segment.fromKeyId);
        const toKey = keyById.get(segment.toKeyId);
        if (!fromKey || !toKey) return false;
        const targetParticipates = fromKey.stateId === clip.targetStateId
          || toKey.stateId === clip.targetStateId;
        return targetParticipates
          && Math.max(startWU, Number(fromKey.atWU))
            < Math.min(endWU, Number(toKey.atWU));
      });
      if (!participates) {
        diagnostic(
          diagnostics,
          'profile-interaction-participation',
          `profiles.${profileId}.overrides.interactions.${clip.id}`,
          `Interaction “${clip.id}” must overlap a point-field segment that uses target state “${clip.targetStateId}”.`,
        );
      }
    });
  });
}

export function validateAboutNarrativePointFieldDocument(input) {
  const diagnostics = [];
  if (!unknownKeys(diagnostics, input, TOP_LEVEL_KEYS, 'document')) return diagnostics;
  if (input.schemaVersion !== ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION) {
    diagnostic(diagnostics, 'schema-version', 'schemaVersion', 'Point-field schema version 6 is required.');
  }
  if (!unknownKeys(diagnostics, input.tracks, TRACK_KEYS, 'tracks')) return diagnostics;
  const durationWU = Number(input.profiles?.desktop?.storyDurationWU);
  validatePointFieldTrack(input.tracks.pointField, diagnostics, 'tracks.pointField', durationWU);
  const stateIds = new Set((input.tracks.pointField?.stateDefinitions || []).map((state) => state.id));
  validateV6Interactions(input.tracks.interactions, stateIds, diagnostics, durationWU);
  validateV6ProfileInteractions(input, diagnostics, durationWU);

  ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS.forEach((profileId) => {
    const profile = input.profiles?.[profileId];
    const path = `profiles.${profileId}.overrides`;
    if (!profile || !unknownKeys(diagnostics, profile.overrides, PROFILE_OVERRIDE_KEYS, path)) return;
    validatePointFieldOverrides(
      profile.overrides.pointField,
      input.tracks.pointField,
      diagnostics,
      `${path}.pointField`,
      durationWU,
    );
  });

  if (!diagnostics.some((item) => item.level === 'error')) {
    try {
      const projected = projectAboutNarrativePointFieldDocumentToVersion5(input);
      validateAboutNarrativeTrackDocument(projected)
        .filter((item) => (
          item.level === 'error'
          && !V5_PROJECTION_ONLY_INTERACTION_CODES.has(item.code)
        ))
        .forEach((item) => diagnostics.push({
          ...item,
          code: `v5-projection-${item.code}`,
        }));
    } catch (error) {
      diagnostic(diagnostics, 'v5-projection', 'document', error.message);
    }
  }
  return diagnostics;
}

function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value || {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => [key, clone(child)]));
}

function normalizePointFieldOverrides(value = {}) {
  return {
    stateDefinitions: sortObjectKeys(value.stateDefinitions),
    keys: sortObjectKeys(value.keys),
    segments: sortObjectKeys(value.segments),
  };
}

function normalizePointField(pointField) {
  const keys = [...pointField.keys]
    .map((key, index) => ({ ...clone(key), _order: index }))
    .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left._order - right._order)
    .map((inputKey) => {
      const key = { ...inputKey, atWU: cleanWU(inputKey.atWU) };
      delete key._order;
      return key;
    });
  const keyOrder = new Map(keys.map((key, index) => [key.id, index]));
  return {
    stateDefinitions: [...pointField.stateDefinitions]
      .map((state) => ({ ...clone(state), railAnchorWU: cleanWU(state.railAnchorWU) }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    keys,
    segments: [...pointField.segments]
      .map(clone)
      .sort((left, right) => (
        (keyOrder.get(left.fromKeyId) ?? Number.MAX_SAFE_INTEGER)
        - (keyOrder.get(right.fromKeyId) ?? Number.MAX_SAFE_INTEGER)
        || left.id.localeCompare(right.id)
      )),
  };
}

export function normalizeAboutNarrativePointFieldDocument(input) {
  const source = clone(input);
  return {
    schemaVersion: ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
    globals: source.globals,
    profiles: {
      desktop: {
        ...source.profiles.desktop,
        overrides: {
          camera: sortObjectKeys(source.profiles.desktop.overrides.camera),
          visibility: sortObjectKeys(source.profiles.desktop.overrides.visibility),
          pointField: normalizePointFieldOverrides(source.profiles.desktop.overrides.pointField),
          text: sortObjectKeys(source.profiles.desktop.overrides.text),
          interactions: sortObjectKeys(source.profiles.desktop.overrides.interactions),
        },
      },
      tablet: {
        ...source.profiles.tablet,
        overrides: {
          camera: sortObjectKeys(source.profiles.tablet.overrides.camera),
          visibility: sortObjectKeys(source.profiles.tablet.overrides.visibility),
          pointField: normalizePointFieldOverrides(source.profiles.tablet.overrides.pointField),
          text: sortObjectKeys(source.profiles.tablet.overrides.text),
          interactions: sortObjectKeys(source.profiles.tablet.overrides.interactions),
        },
      },
      mobile: {
        ...source.profiles.mobile,
        overrides: {
          camera: sortObjectKeys(source.profiles.mobile.overrides.camera),
          visibility: sortObjectKeys(source.profiles.mobile.overrides.visibility),
          pointField: normalizePointFieldOverrides(source.profiles.mobile.overrides.pointField),
          text: sortObjectKeys(source.profiles.mobile.overrides.text),
          interactions: sortObjectKeys(source.profiles.mobile.overrides.interactions),
        },
      },
      'reduced-motion': clone(source.profiles['reduced-motion']),
    },
    tracks: {
      camera: {
        keys: [...source.tracks.camera.keys]
          .map(clone)
          .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left.id.localeCompare(right.id)),
        ...(Array.isArray(source.tracks.camera.orientationKeys) ? {
          orientationKeys: [...source.tracks.camera.orientationKeys]
            .map(clone)
            .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left.id.localeCompare(right.id)),
        } : {}),
      },
      visibility: {
        keys: [...source.tracks.visibility.keys]
          .map(clone)
          .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left.id.localeCompare(right.id)),
      },
      pointField: normalizePointField(source.tracks.pointField),
      text: {
        fields: [...source.tracks.text.fields]
          .map(clone)
          .sort((left, right) => Number(left.startWU) - Number(right.startWU) || left.id.localeCompare(right.id)),
      },
      interactions: {
        clips: [...source.tracks.interactions.clips]
          .map(clone)
          .sort((left, right) => Number(left.startWU) - Number(right.startWU) || left.id.localeCompare(right.id)),
      },
    },
    library: {
      presets: [...source.library.presets]
        .map(clone)
        .sort((left, right) => left.id.localeCompare(right.id)),
    },
  };
}

export function serializeAboutNarrativePointFieldDocument(input) {
  const diagnostics = validateAboutNarrativePointFieldDocument(input);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativePointFieldValidationError';
    error.diagnostics = diagnostics;
    error.original = clone(input);
    throw error;
  }
  const normalized = normalizeAboutNarrativePointFieldDocument(input);
  const normalizedErrors = validateAboutNarrativePointFieldDocument(normalized)
    .filter((item) => item.level === 'error');
  if (normalizedErrors.length) {
    const error = new Error(normalizedErrors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativePointFieldValidationError';
    error.diagnostics = normalizedErrors;
    error.original = clone(input);
    throw error;
  }
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

function neutralTransition(type = 'hold', easing = 'linear', correspondence = null) {
  return {
    type,
    easing,
    correspondence,
    ...(type === 'hold' ? { progress: 1 } : {}),
    stagger: { mode: 'uniform', amount: 0 },
    path: { mode: 'direct', amount: 0 },
    flatten: { mode: 'none', amount: 0 },
  };
}

function keyIdFor(worldId, role) {
  return `key-${worldId}-${role}`;
}

function segmentIdFor(fromKeyId, toKeyId) {
  return `segment-${fromKeyId}-to-${toKeyId}`;
}

function pushSegment(segments, fromKey, toKey, transition) {
  segments.push({
    id: segmentIdFor(fromKey.id, toKey.id),
    fromKeyId: fromKey.id,
    toKeyId: toKey.id,
    transition,
  });
}

function createStateDefinition(world) {
  return {
    id: world.id,
    label: world.label,
    adapterId: world.adapterId,
    shapeId: world.shapeId,
    seed: world.seed,
    railAnchorWU: cleanWU(world.anchorWU),
    entryDistanceWU: world.entryDistanceWU,
    transform: clone(world.transform),
    shapeParameters: clone(world.shapeParameters),
    modifiers: clone(world.modifiers),
    ...(world.protected === true ? { protected: true } : {}),
  };
}

function assertNoV5Crossfade(worlds, pathForWorld) {
  const index = worlds.findIndex((world) => world.transitionIn.type === 'crossfade');
  if (index >= 0) {
    throw pointFieldError(
      'AboutNarrativePointFieldMigrationError',
      'transition-crossfade-unsupported',
      `${pathForWorld(worlds[index], index)}.transitionIn.type`,
      'Schema v6 does not support crossfade transitions.',
    );
  }
}

function v6TransitionFromV5(transition, fromStateId, toStateId) {
  if (fromStateId === toStateId) return neutralTransition('hold');
  const type = ['cut', 'hold'].includes(transition.type) ? 'step-end' : transition.type;
  return neutralTransition(type, transition.easing, transition.correspondence);
}

function createPointFieldFromV5Worlds(worlds, durationWU) {
  const stateDefinitions = worlds.map(createStateDefinition);
  const keys = [];
  const segments = [];
  const firstWorld = worlds[0];
  const firstKey = {
    id: keyIdFor(firstWorld.id, 'initial'),
    atWU: cleanWU(firstWorld.startWU),
    stateId: firstWorld.id,
    protected: true,
  };
  keys.push(firstKey);

  for (let index = 1; index < worlds.length; index += 1) {
    const previousWorld = worlds[index - 1];
    const world = worlds[index];
    const transitionStartWU = cleanWU(world.transitionIn.startWU);
    const transitionEndWU = cleanWU(world.transitionIn.endWU);
    const previousKey = keys.at(-1);
    const departureKey = {
      id: keyIdFor(world.id, 'departure'),
      atWU: transitionStartWU,
      stateId: previousWorld.id,
    };
    keys.push(departureKey);
    pushSegment(segments, previousKey, departureKey, neutralTransition('hold'));
    const arrivalKey = {
      id: keyIdFor(world.id, 'arrival'),
      atWU: transitionEndWU,
      stateId: world.id,
    };
    keys.push(arrivalKey);
    pushSegment(
      segments,
      departureKey,
      arrivalKey,
      v6TransitionFromV5(world.transitionIn, previousWorld.id, world.id),
    );
  }

  const lastWorld = worlds.at(-1);
  const lastKey = keys.at(-1);
  const finalKey = {
    id: keyIdFor(lastWorld.id, 'final'),
    atWU: cleanWU(durationWU),
    stateId: lastWorld.id,
    protected: true,
  };
  keys.push(finalKey);
  pushSegment(segments, lastKey, finalKey, neutralTransition('hold'));
  return { stateDefinitions, keys, segments };
}

function resolveV5Worlds(worlds, overrides = {}) {
  return worlds.map((world) => {
    const override = overrides[world.id] || {};
    return {
      ...clone(world),
      ...clone(override),
      transform: mergeDeep(world.transform, override.transform || {}),
      transitionIn: mergeDeep(world.transitionIn, override.transitionIn || {}),
    };
  });
}

function createPointFieldFromV5WorldsUsingTopology(basePointField, worlds, durationWU) {
  const worldById = new Map(worlds.map((world) => [world.id, world]));
  const stateDefinitions = basePointField.stateDefinitions.map((state) => (
    createStateDefinition(worldById.get(state.id))
  ));
  const firstWorld = worlds[0];
  const lastWorld = worlds.at(-1);
  const keyTimes = new Map([[keyIdFor(firstWorld.id, 'initial'), cleanWU(firstWorld.startWU)]]);

  for (let index = 1; index < worlds.length; index += 1) {
    const world = worlds[index];
    keyTimes.set(keyIdFor(world.id, 'departure'), cleanWU(world.transitionIn.startWU));
    keyTimes.set(keyIdFor(world.id, 'arrival'), cleanWU(world.transitionIn.endWU));
  }
  keyTimes.set(keyIdFor(lastWorld.id, 'final'), cleanWU(durationWU));

  const keys = basePointField.keys.map((key) => ({
    ...clone(key),
    atWU: keyTimes.get(key.id) ?? key.atWU,
  }));
  const keyById = new Map(keys.map((key) => [key.id, key]));
  const worldByArrivalKeyId = new Map(worlds.slice(1).map((world) => [
    keyIdFor(world.id, 'arrival'),
    world,
  ]));
  const segments = basePointField.segments.map((segment) => {
    const world = worldByArrivalKeyId.get(segment.toKeyId);
    if (!world) return { ...clone(segment), transition: neutralTransition('hold') };
    const fromStateId = keyById.get(segment.fromKeyId).stateId;
    const toStateId = keyById.get(segment.toKeyId).stateId;
    return {
      ...clone(segment),
      transition: v6TransitionFromV5(world.transitionIn, fromStateId, toStateId),
    };
  });
  return { stateDefinitions, keys, segments };
}

function diffPointField(base, resolved) {
  const diffScope = (baseItems, resolvedItems) => {
    const baseById = new Map(baseItems.map((item) => [item.id, item]));
    return Object.fromEntries(resolvedItems.flatMap((item) => {
      const difference = deepDiff(baseById.get(item.id), item);
      return difference ? [[item.id, difference]] : [];
    }));
  };
  return {
    stateDefinitions: diffScope(base.stateDefinitions, resolved.stateDefinitions),
    keys: diffScope(base.keys, resolved.keys),
    segments: diffScope(base.segments, resolved.segments),
  };
}

function migrateV5Interaction(clip) {
  const next = clone(clip);
  next.targetStateId = next.targetWorldId;
  delete next.targetWorldId;
  if (next.type === 'discipline-reveal') {
    const parameters = next.parameters || {};
    const clipDurationWU = Math.max(0, Number(next.endWU) - Number(next.startWU));
    const restoreDurationWU = Number.isFinite(Number(parameters.restoreDurationWU))
      ? Number(parameters.restoreDurationWU)
      : 0.3;
    const settleDurationWU = Number.isFinite(Number(parameters.settleDurationWU))
      ? Number(parameters.settleDurationWU)
      : Math.min(0.5, Math.max(0.05, clipDurationWU - restoreDurationWU - 1.2));
    const availableBeatWU = Math.max(1.2, clipDurationWU - settleDurationWU - restoreDurationWU);
    next.parameters = {
      settleDurationWU,
      beatDurationWU: Number.isFinite(Number(parameters.beatDurationWU))
        ? Number(parameters.beatDurationWU)
        : availableBeatWU / 6,
      ...(Number.isFinite(Number(parameters.itemsPerBeat))
        ? { itemsPerBeat: Math.max(1, Math.round(Number(parameters.itemsPerBeat))) }
        : {}),
      formationColumn: Number.isFinite(Number(parameters.formationColumn))
        ? Math.round(Number(parameters.formationColumn))
        : ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationColumn,
      formationRow: Number.isFinite(Number(parameters.formationRow))
        ? Math.round(Number(parameters.formationRow))
        : ABOUT_NARRATIVE_DISCIPLINE_FORMATION_DEFAULTS.formationRow,
      backgroundOpacity: parameters.backgroundOpacity,
      pointScale: parameters.pointScale,
      restoreDurationWU,
      items: (parameters.items || []).map((item) => {
        const migrated = clone(item);
        delete migrated.position;
        delete migrated.mobilePosition;
        return migrated;
      }),
    };
  }
  return next;
}

export function migrateAboutNarrativeVersion5To6(input) {
  const source = clone(input);
  if (Number(source?.schemaVersion) !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    const error = new Error('Point-field migration requires a schema v5 About Narrative document.');
    error.name = 'AboutNarrativePointFieldMigrationError';
    error.original = source;
    throw error;
  }
  const sourceErrors = validateAboutNarrativeTrackDocument(source)
    .filter((item) => item.level === 'error');
  if (sourceErrors.length) {
    const error = new Error(sourceErrors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativePointFieldMigrationError';
    error.diagnostics = sourceErrors;
    error.original = source;
    throw error;
  }
  const v5 = normalizeAboutNarrativeTrackDocument(source);
  const durationWU = Number(v5.profiles.desktop.storyDurationWU);
  const baseWorlds = v5.tracks.worlds.objects;
  assertNoV5Crossfade(baseWorlds, (_world, index) => `tracks.worlds.objects.${index}`);
  const pointField = createPointFieldFromV5Worlds(baseWorlds, durationWU);
  const profiles = Object.fromEntries(Object.entries(v5.profiles).map(([profileId, profile]) => {
    if (profileId === 'reduced-motion') return [profileId, clone(profile)];
    const resolvedWorlds = resolveV5Worlds(baseWorlds, profile.overrides.worlds);
    assertNoV5Crossfade(
      resolvedWorlds,
      (world) => `profiles.${profileId}.overrides.worlds.${world.id}`,
    );
    const resolvedPointField = createPointFieldFromV5WorldsUsingTopology(
      pointField,
      resolvedWorlds,
      durationWU,
    );
    return [profileId, {
      ...clone(profile),
      overrides: {
        camera: clone(profile.overrides.camera),
        visibility: clone(profile.overrides.visibility),
        pointField: diffPointField(pointField, resolvedPointField),
        text: clone(profile.overrides.text),
        interactions: clone(profile.overrides.interactions),
      },
    }];
  }));
  const migrated = {
    schemaVersion: ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
    globals: clone(v5.globals),
    profiles,
    tracks: {
      camera: clone(v5.tracks.camera),
      visibility: clone(v5.tracks.visibility),
      pointField,
      text: clone(v5.tracks.text),
      interactions: {
        clips: v5.tracks.interactions.clips.map(migrateV5Interaction),
      },
    },
    library: clone(v5.library),
  };
  const normalized = normalizeAboutNarrativePointFieldDocument(migrated);
  const diagnostics = validateAboutNarrativePointFieldDocument(normalized);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativePointFieldMigrationError';
    error.diagnostics = diagnostics;
    error.original = source;
    throw error;
  }
  return normalized;
}

export function sampleAboutNarrativePointField(pointField, storyWU, durationWU) {
  const keys = sortedKeys(pointField);
  const valueWU = Math.max(0, Math.min(Number(durationWU), Number(storyWU) || 0));
  if (!keys.length) return null;
  if (valueWU >= Number(keys.at(-1).atWU)) {
    return {
      fromStateId: keys.at(-1).stateId,
      toStateId: keys.at(-1).stateId,
      stateId: keys.at(-1).stateId,
      transitionProgress: 1,
      settled: true,
      segmentId: null,
    };
  }
  let fromIndex = 0;
  for (let index = 0; index < keys.length - 1; index += 1) {
    if (valueWU >= Number(keys[index].atWU)) fromIndex = index;
    else break;
  }
  const fromKey = keys[fromIndex];
  const toKey = keys[fromIndex + 1] || fromKey;
  const segment = pointField.segments.find((item) => (
    item.fromKeyId === fromKey.id && item.toKeyId === toKey.id
  ));
  const transition = segment?.transition;
  const spanWU = Math.max(0.00001, Number(toKey.atWU) - Number(fromKey.atWU));
  let transitionProgress;
  if (transition?.type === 'step-end') transitionProgress = 0;
  else if (!transition || transition.type === 'hold') transitionProgress = 1;
  else transitionProgress = applyAboutNarrativeWorldTransitionEasing(
    transition.easing,
    (valueWU - Number(fromKey.atWU)) / spanWU,
  );
  return {
    fromStateId: fromKey.stateId,
    toStateId: toKey.stateId,
    stateId: toKey.stateId,
    transitionProgress,
    settled: transition?.type === 'hold',
    segmentId: segment?.id || null,
  };
}

export function loadAboutNarrativePointFieldSource(input) {
  const original = clone(input);
  let parsed;
  try {
    parsed = typeof input === 'string' ? JSON.parse(input) : clone(input);
  } catch (error) {
    return Object.freeze({
      status: 'invalid',
      valid: false,
      readOnly: false,
      document: null,
      original,
      diagnostics: Object.freeze([{
        level: 'error',
        code: 'json-parse',
        path: 'document',
        message: error.message,
      }]),
      message: error.message,
    });
  }
  const sourceVersion = Number(parsed?.schemaVersion);
  if (sourceVersion > ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION) {
    return Object.freeze({
      status: 'future',
      valid: false,
      readOnly: true,
      document: clone(parsed),
      original,
      sourceVersion,
      diagnostics: Object.freeze([]),
      message: 'This point-field document was created by a newer editor.',
    });
  }
  const diagnostics = validateAboutNarrativePointFieldDocument(parsed);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    return Object.freeze({
      status: 'invalid',
      valid: false,
      readOnly: false,
      document: null,
      original,
      sourceVersion,
      diagnostics: Object.freeze(diagnostics),
      message: errors.map((item) => `${item.path}: ${item.message}`).join('\n'),
    });
  }
  return Object.freeze({
    status: 'current',
    valid: true,
    readOnly: false,
    document: normalizeAboutNarrativePointFieldDocument(parsed),
    original,
    sourceVersion,
    diagnostics: Object.freeze(diagnostics),
    message: '',
  });
}
