import {
  ABOUT_NARRATIVE_ADAPTER_DEFINITIONS,
  ABOUT_NARRATIVE_BLOCK_KINDS,
  ABOUT_NARRATIVE_CAMERA_EASINGS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_EMPHASIS_TONES,
  ABOUT_NARRATIVE_INTERACTION_DEFINITIONS,
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
} from './aboutNarrativeDefinitions.js';
import {
  cloneAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';

export const ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION = 3;
export const ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS = Object.freeze(['desktop', 'tablet', 'mobile']);
export const ABOUT_NARRATIVE_TRACK_PROFILE_IDS = Object.freeze([
  ...ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS,
  'reduced-motion',
]);
export const ABOUT_NARRATIVE_TRACK_TEXT_KINDS = Object.freeze([
  'title',
  'scroll-block',
  'stub',
  'discipline-reveal',
]);

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNSAFE_TEXT_PATTERN = /<\/?(?:script|style|iframe)|\bon\w+\s*=|javascript:/i;
const SECTIONLIKE_KEYS = new Set(['sections', 'groups', 'bands', 'chapters']);
const TOP_LEVEL_KEYS = new Set(['schemaVersion', 'globals', 'profiles', 'tracks', 'library']);
const GLOBAL_KEYS = new Set(['scrollSmoothing', 'readingWidthRem', 'editorialRevealThreshold', 'camera', 'pointMaterial', 'swarmTurbulence', 'textMotion']);
const GLOBAL_CAMERA_KEYS = new Set([
  'startZ',
  'cadence',
  'cadenceLocked',
  'fov',
  'distanceFogStartWU',
  'distanceFogEndWU',
]);
const POINT_MATERIAL_KEYS = new Set(['opacity', 'pointSize']);
const SWARM_TURBULENCE_KEYS = new Set(['amplitude', 'speed', 'irregularity', 'individuality', 'axisSpread']);
const TEXT_MOTION_KEYS = new Set(['preset', 'durationScale', 'startY', 'openerStartY', 'endY', 'readableStart', 'readableEnd', 'perspective', 'entryDepth', 'exitDepth', 'maxBlur']);
const PROFILE_KEYS = new Set(['storyDurationWU', 'scrollDurationWU', 'overrides']);
const REDUCED_PROFILE_KEYS = new Set(['mode', 'motionPolicy']);
const OVERRIDE_TRACK_KEYS = new Set(['camera', 'worlds', 'text', 'interactions']);
const TRACK_KEYS = new Set(['camera', 'worlds', 'text', 'interactions']);
const CAMERA_TRACK_KEYS = new Set(['keys']);
const WORLD_TRACK_KEYS = new Set(['objects']);
const TEXT_TRACK_KEYS = new Set(['fields']);
const INTERACTION_TRACK_KEYS = new Set(['clips']);
const CAMERA_KEY_KEYS = new Set(['id', 'atWU', 'offset', 'lookAtOffset', 'fov', 'roll', 'easing', 'locked']);
const WORLD_KEYS = new Set(['id', 'label', 'startWU', 'anchorWU', 'adapterId', 'shapeId', 'seed', 'entryDistanceWU', 'transform', 'transitionIn', 'shapeParameters', 'modifiers', 'protected']);
const TRANSFORM_KEYS = new Set(['position', 'rotation', 'scale', 'mobileScale', 'mobileXScale', 'mobileYOffset', 'mobileZOffset']);
const TRANSITION_KEYS = new Set(['startWU', 'endWU', 'type', 'easing', 'correspondence']);
const MODIFIER_KEYS = new Set(['id', 'enabled', 'parameters']);
const TEXT_BASE_KEYS = new Set(['id', 'kind', 'startWU', 'focusWU', 'endWU', 'publishable', 'presentation', 'protected']);
const TITLE_KEYS = new Set([...TEXT_BASE_KEYS, 'movement', 'preset', 'text', 'anchor']);
const SCROLL_BLOCK_KEYS = new Set([...TEXT_BASE_KEYS, 'block']);
const STUB_KEYS = new Set([...TEXT_BASE_KEYS, 'label']);
const DISCIPLINE_KEYS = new Set([...TEXT_BASE_KEYS, 'fieldTravelStartWU', 'fieldTravelEndWU', 'choreography']);
const PRESENTATION_KEYS = new Set(['layout']);
const BLOCK_KEYS = new Set(['id', 'kind', 'text', 'label', 'items', 'emphasis', 'worldInfluence']);
const EMPHASIS_KEYS = new Set(['text', 'tone']);
const CHOREOGRAPHY_KEYS = new Set(['fieldTravelWU', 'fieldFogStartWU', 'fieldFogEndWU', 'fieldFogStrength', 'staggerWU', 'backgroundFadeWU', 'backgroundOpacity', 'reconnectOpacity', 'pointScale', 'labelOffsetPx', 'labelDurationWU', 'holdWU', 'items']);
const DISCIPLINE_ITEM_KEYS = new Set(['group', 'label']);
const INTERACTION_KEYS = new Set(['id', 'type', 'startWU', 'activationWU', 'endWU', 'targetWorldId', 'parameters', 'protected']);
const LIBRARY_KEYS = new Set(['presets']);
const PRESET_KEYS = new Set(['id', 'label', 'scope', 'protected']);
const CAMERA_OVERRIDE_KEYS = new Set(['atWU', 'offset', 'lookAtOffset', 'fov', 'roll', 'easing']);
const WORLD_OVERRIDE_KEYS = new Set(['startWU', 'anchorWU', 'transform', 'transitionIn']);
const TEXT_OVERRIDE_KEYS = new Set(['startWU', 'focusWU', 'endWU']);
const INTERACTION_OVERRIDE_KEYS = new Set(['startWU', 'activationWU', 'endWU']);

function finite(value) {
  return Number.isFinite(Number(value));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(6));
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function diagnostic(diagnostics, code, path, message, level = 'error') {
  diagnostics.push({ level, code, path, message });
}

function unknownKeys(diagnostics, value, allowed, path) {
  if (!isObject(value)) {
    diagnostic(diagnostics, 'object-envelope', path, 'Expected an object.');
    return;
  }
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) diagnostic(diagnostics, 'unknown-key', `${path}.${key}`, `Unknown field “${key}”.`);
  });
}

function rejectSectionlikeKeys(value, diagnostics, path = 'document') {
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, child]) => {
    if (SECTIONLIKE_KEYS.has(key)) {
      diagnostic(diagnostics, 'sectionlike-key', `${path}.${key}`, `Sectionless documents cannot contain authored “${key}”.`);
    }
    rejectSectionlikeKeys(child, diagnostics, `${path}.${key}`);
  });
}

function validateId(value, seen, diagnostics, path) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    diagnostic(diagnostics, 'object-id', path, 'IDs must be non-empty lower-case slugs.');
    return false;
  }
  if (seen.has(value)) {
    diagnostic(diagnostics, 'duplicate-id', path, `Duplicate authored object ID “${value}”.`);
    return false;
  }
  seen.add(value);
  return true;
}

function validateTime(value, diagnostics, path, { min = 0, max = Number.POSITIVE_INFINITY } = {}) {
  if (!finite(value) || Number(value) < min || Number(value) > max) {
    diagnostic(diagnostics, 'time-range', path, `Timing must be finite and between ${min} and ${Number.isFinite(max) ? max : 'the story end'}.`);
    return false;
  }
  return true;
}

function validateVector(value, diagnostics, path) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((item) => !finite(item))) {
    diagnostic(diagnostics, 'vector', path, 'Expected three finite numbers.');
    return false;
  }
  return true;
}

function validateSafeText(value, diagnostics, path, { required = false, maximum = 1200 } = {}) {
  if (typeof value !== 'string' || (required && !value.trim()) || value.length > maximum || UNSAFE_TEXT_PATTERN.test(value)) {
    diagnostic(diagnostics, 'unsafe-text', path, `Text must be plain${required ? ', non-empty' : ''}, and no longer than ${maximum} characters.`);
    return false;
  }
  return true;
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

function validateGlobals(globals, diagnostics) {
  unknownKeys(diagnostics, globals, GLOBAL_KEYS, 'globals');
  if (!isObject(globals)) return;
  unknownKeys(diagnostics, globals.camera, GLOBAL_CAMERA_KEYS, 'globals.camera');
  unknownKeys(diagnostics, globals.pointMaterial, POINT_MATERIAL_KEYS, 'globals.pointMaterial');
  unknownKeys(diagnostics, globals.swarmTurbulence, SWARM_TURBULENCE_KEYS, 'globals.swarmTurbulence');
  unknownKeys(diagnostics, globals.textMotion, TEXT_MOTION_KEYS, 'globals.textMotion');
  // Reuse the established v2 global contract without allowing the legacy
  // validator to see or normalize any authored v3 track data.
  const shim = {
    schemaVersion: 2,
    globals,
    sections: [{
      id: 'validation-finale', label: 'Validation', type: 'finale', layout: 'center', extentWU: 1,
      mobileExtentWU: 1, text: { cues: [{ id: 'validation-copy', text: 'Validation', enter: 0, hold: 0.5, exit: 1, preset: 'travelling-title-v1', motion: { mode: 'spatial' } }] },
      camera: { keys: [{ at: 0, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: Number(globals?.camera?.fov ?? 48), roll: 0, easing: 'smoothstep' }, { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: Number(globals?.camera?.fov ?? 48), roll: 0, easing: 'smoothstep' }] },
      world: { mode: 'set', adapterId: 'point-field-v1', shapeId: 'bust-v1', seed: 1, entryDistanceWU: 1, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 }, transitionIn: { start: 0, end: 0, type: 'cut', easing: 'linear', correspondence: 'index-v1' }, shapeParameters: { density: 0.5 }, modifiers: [] },
      interaction: { type: 'none' },
    }],
    library: { presets: [] },
  };
  validateAboutNarrativeDocument(shim).forEach((item) => {
    if (item.level === 'error' && item.path.startsWith('globals.')) diagnostics.push(item);
  });
}

function validateProfiles(profiles, diagnostics, durationWU, objectIndexes) {
  if (!isObject(profiles)) {
    diagnostic(diagnostics, 'profiles-envelope', 'profiles', 'Profiles must be an object.');
    return;
  }
  unknownKeys(diagnostics, profiles, new Set(ABOUT_NARRATIVE_TRACK_PROFILE_IDS), 'profiles');
  ABOUT_NARRATIVE_TRACK_LAYOUT_PROFILE_IDS.forEach((profileId) => {
    const profile = profiles[profileId];
    const path = `profiles.${profileId}`;
    unknownKeys(diagnostics, profile, PROFILE_KEYS, path);
    if (!isObject(profile)) return;
    validateTime(profile.storyDurationWU, diagnostics, `${path}.storyDurationWU`, { min: 0.001 });
    validateTime(profile.scrollDurationWU, diagnostics, `${path}.scrollDurationWU`, { min: 0.001 });
    if (finite(profile.storyDurationWU) && Math.abs(Number(profile.storyDurationWU) - durationWU) > 0.000001) {
      diagnostic(diagnostics, 'profile-story-duration', `${path}.storyDurationWU`, 'Layout profiles must share the canonical Story WU duration.');
    }
    validateProfileOverrides(profile.overrides, diagnostics, path, durationWU, objectIndexes);
  });
  const reduced = profiles['reduced-motion'];
  unknownKeys(diagnostics, reduced, REDUCED_PROFILE_KEYS, 'profiles.reduced-motion');
  if (isObject(reduced)) {
    if (reduced.mode !== 'overlay') diagnostic(diagnostics, 'reduced-motion-mode', 'profiles.reduced-motion.mode', 'Reduced Motion must be an overlay.');
    if (reduced.motionPolicy !== 'settled') diagnostic(diagnostics, 'reduced-motion-policy', 'profiles.reduced-motion.motionPolicy', 'Reduced Motion must use the settled policy.');
  }
}

function validateOverrideObject(value, allowed, diagnostics, path) {
  unknownKeys(diagnostics, value, allowed, path);
  return isObject(value);
}

function validateProfileOverrides(overrides, diagnostics, profilePath, durationWU, indexes) {
  const path = `${profilePath}.overrides`;
  unknownKeys(diagnostics, overrides, OVERRIDE_TRACK_KEYS, path);
  if (!isObject(overrides)) return;
  const definitions = [
    ['camera', indexes.camera, CAMERA_OVERRIDE_KEYS],
    ['worlds', indexes.worlds, WORLD_OVERRIDE_KEYS],
    ['text', indexes.text, TEXT_OVERRIDE_KEYS],
    ['interactions', indexes.interactions, INTERACTION_OVERRIDE_KEYS],
  ];
  definitions.forEach(([track, index, allowed]) => {
    const entries = overrides[track];
    const trackPath = `${path}.${track}`;
    if (!isObject(entries)) {
      diagnostic(diagnostics, 'override-envelope', trackPath, 'Profile track overrides must be ID-addressed objects.');
      return;
    }
    Object.entries(entries).forEach(([id, override]) => {
      const itemPath = `${trackPath}.${id}`;
      const base = index.get(id);
      if (!base) diagnostic(diagnostics, 'override-target', itemPath, `Override target “${id}” does not exist on ${track}.`);
      if (!validateOverrideObject(override, allowed, diagnostics, itemPath)) return;
      Object.entries(override).forEach(([key, value]) => {
        if (key.endsWith('WU')) validateTime(value, diagnostics, `${itemPath}.${key}`, { max: durationWU });
      });
      if (track === 'camera') {
        if (override.offset != null) validateVector(override.offset, diagnostics, `${itemPath}.offset`);
        if (override.lookAtOffset != null) validateVector(override.lookAtOffset, diagnostics, `${itemPath}.lookAtOffset`);
        if (override.fov != null && (!finite(override.fov) || override.fov < 20 || override.fov > 90)) diagnostic(diagnostics, 'camera-fov', `${itemPath}.fov`, 'FOV must stay between 20 and 90.');
        if (override.roll != null && !finite(override.roll)) diagnostic(diagnostics, 'camera-roll', `${itemPath}.roll`, 'Roll must be finite.');
        if (override.easing != null && !ABOUT_NARRATIVE_CAMERA_EASINGS.includes(override.easing)) diagnostic(diagnostics, 'camera-easing', `${itemPath}.easing`, 'Unsupported Camera easing.');
      }
      if (track === 'worlds') {
        if (override.transform != null) validateTransform(override.transform, diagnostics, `${itemPath}.transform`, true);
        if (override.transitionIn != null) validateTransition(override.transitionIn, diagnostics, `${itemPath}.transitionIn`, durationWU, true);
      }
      if (base && track === 'text') {
        const start = Number(override.startWU ?? base.startWU);
        const focus = Number(override.focusWU ?? base.focusWU);
        const end = Number(override.endWU ?? base.endWU);
        if (!(start <= focus && focus <= end)) diagnostic(diagnostics, 'override-text-order', itemPath, 'Text override timing must satisfy startWU ≤ focusWU ≤ endWU.');
      }
      if (base && track === 'interactions') {
        const start = Number(override.startWU ?? base.startWU);
        const activation = Number(override.activationWU ?? base.activationWU);
        const end = Number(override.endWU ?? base.endWU);
        if (!(start <= activation && activation <= end)) diagnostic(diagnostics, 'override-interaction-order', itemPath, 'Interaction override timing must satisfy startWU ≤ activationWU ≤ endWU.');
      }
    });
  });

  const cameraKeys = [...indexes.camera.values()];
  let previousCameraWU = -1;
  cameraKeys.forEach((key, index) => {
    const atWU = Number(overrides.camera?.[key.id]?.atWU ?? key.atWU);
    if (atWU <= previousCameraWU) diagnostic(diagnostics, 'profile-camera-order', `${path}.camera.${key.id}.atWU`, 'Profile Camera keys must remain strictly ordered.');
    previousCameraWU = atWU;
    if ((index === 0 && atWU !== 0) || (index === cameraKeys.length - 1 && Math.abs(atWU - durationWU) > 0.000001)) {
      diagnostic(diagnostics, 'profile-camera-endpoint', `${path}.camera.${key.id}.atWU`, 'Profile Camera overrides must preserve Story WU start and end keys.');
    }
  });

  const worlds = [...indexes.worlds.values()];
  const resolvedWorlds = worlds.map((world) => ({
    ...world,
    ...overrides.worlds?.[world.id],
    transitionIn: { ...world.transitionIn, ...(overrides.worlds?.[world.id]?.transitionIn || {}) },
  }));
  let previousWorldWU = -1;
  resolvedWorlds.forEach((world, index) => {
    const itemPath = `${path}.worlds.${world.id}`;
    if (Number(world.startWU) <= previousWorldWU) diagnostic(diagnostics, 'profile-world-order', `${itemPath}.startWU`, 'Profile World Starts must remain strictly ordered.');
    previousWorldWU = Number(world.startWU);
    if (index === 0 && Number(world.startWU) !== 0) diagnostic(diagnostics, 'profile-world-origin', `${itemPath}.startWU`, 'The first profile World must still start at Story WU 0.');
    const nextStartWU = Number(resolvedWorlds[index + 1]?.startWU ?? durationWU);
    if (Number(world.transitionIn.startWU) < Number(world.startWU)
      || Number(world.transitionIn.startWU) > Number(world.transitionIn.endWU)
      || Number(world.transitionIn.endWU) > nextStartWU) {
      diagnostic(diagnostics, 'profile-transition-window', `${itemPath}.transitionIn`, 'Profile World transition must remain between its World Start and the next World Start.');
    }
  });

  indexes.interactions.forEach((clip) => {
    const override = overrides.interactions?.[clip.id] || {};
    const startWU = Number(override.startWU ?? clip.startWU);
    const activationWU = Number(override.activationWU ?? clip.activationWU);
    const endWU = Number(override.endWU ?? clip.endWU);
    const worldIndex = resolvedWorlds.findIndex((world) => world.id === clip.targetWorldId);
    const worldStartWU = Number(resolvedWorlds[worldIndex]?.startWU);
    const worldEndWU = Number(resolvedWorlds[worldIndex + 1]?.startWU ?? durationWU);
    if (!(startWU <= activationWU && activationWU <= endWU)
      || worldIndex < 0
      || startWU < worldStartWU
      || endWU > worldEndWU) {
      diagnostic(diagnostics, 'profile-interaction-window', `${path}.interactions.${clip.id}`, 'Profile interaction timing must remain ordered inside its target World window.');
    }
  });
}

function validateTransform(transform, diagnostics, path, partial = false) {
  unknownKeys(diagnostics, transform, TRANSFORM_KEYS, path);
  if (!isObject(transform)) return;
  if (!partial || transform.position != null) validateVector(transform.position, diagnostics, `${path}.position`);
  if (!partial || transform.rotation != null) validateVector(transform.rotation, diagnostics, `${path}.rotation`);
  if (!partial || transform.scale != null) {
    if (!finite(transform.scale) || Number(transform.scale) <= 0) diagnostic(diagnostics, 'world-scale', `${path}.scale`, 'World scale must be positive and finite.');
  }
  ['mobileScale', 'mobileXScale', 'mobileYOffset', 'mobileZOffset'].forEach((key) => {
    if (transform[key] != null && !finite(transform[key])) diagnostic(diagnostics, 'world-transform-number', `${path}.${key}`, 'Responsive transform values must be finite.');
    if ((key === 'mobileScale' || key === 'mobileXScale')
      && transform[key] != null
      && finite(transform[key])
      && Number(transform[key]) <= 0) {
      diagnostic(diagnostics, 'world-scale', `${path}.${key}`, 'Responsive World scales must be positive.');
    }
  });
}

function validateTransition(transition, diagnostics, path, maximumWU, partial = false) {
  unknownKeys(diagnostics, transition, TRANSITION_KEYS, path);
  if (!isObject(transition)) return;
  if (!partial || transition.startWU != null) validateTime(transition.startWU, diagnostics, `${path}.startWU`, { max: maximumWU });
  if (!partial || transition.endWU != null) validateTime(transition.endWU, diagnostics, `${path}.endWU`, { max: maximumWU });
  if (transition.startWU != null && transition.endWU != null && Number(transition.startWU) > Number(transition.endWU)) diagnostic(diagnostics, 'transition-order', path, 'Transition startWU must not exceed endWU.');
  if (!partial || transition.type != null) if (!ABOUT_NARRATIVE_TRANSITION_TYPES.includes(transition.type)) diagnostic(diagnostics, 'transition-type', `${path}.type`, 'Unsupported transition type.');
  if (!partial || transition.easing != null) if (!ABOUT_NARRATIVE_EASINGS.includes(transition.easing)) diagnostic(diagnostics, 'transition-easing', `${path}.easing`, 'Unsupported transition easing.');
  if (!partial || transition.correspondence != null) if (!ABOUT_NARRATIVE_CORRESPONDENCE_MODES.includes(transition.correspondence)) diagnostic(diagnostics, 'transition-correspondence', `${path}.correspondence`, 'Unsupported correspondence strategy.');
}

function validateBlock(block, diagnostics, path) {
  unknownKeys(diagnostics, block, BLOCK_KEYS, path);
  if (!isObject(block)) return;
  if (!ID_PATTERN.test(block.id || '')) diagnostic(diagnostics, 'block-id', `${path}.id`, 'Block ID must be a lower-case slug.');
  if (!ABOUT_NARRATIVE_BLOCK_KINDS.includes(block.kind)) diagnostic(diagnostics, 'block-kind', `${path}.kind`, 'Unsupported editorial block kind.');
  const itemKind = ['clients', 'disciplines', 'list'].includes(block.kind);
  if (itemKind && (!Array.isArray(block.items) || block.items.length === 0)) {
    diagnostic(diagnostics, 'block-items-required', `${path}.items`, `${block.kind} blocks require at least one item.`);
  }
  if (!itemKind && (typeof block.text !== 'string' || !block.text.trim())) {
    diagnostic(diagnostics, 'block-text-required', `${path}.text`, `${block.kind || 'Editorial'} blocks require non-empty text.`);
  }
  if (block.text != null) validateSafeText(block.text, diagnostics, `${path}.text`);
  if (block.label != null) validateSafeText(block.label, diagnostics, `${path}.label`, { maximum: 120 });
  if (block.items != null) {
    if (!Array.isArray(block.items)) diagnostic(diagnostics, 'block-items', `${path}.items`, 'Block items must be an array.');
    else block.items.forEach((item, index) => validateSafeText(item, diagnostics, `${path}.items.${index}`, { required: true, maximum: 240 }));
  }
  if (block.emphasis != null) {
    if (!Array.isArray(block.emphasis)) diagnostic(diagnostics, 'block-emphasis', `${path}.emphasis`, 'Emphasis must be an array.');
    else block.emphasis.forEach((item, index) => {
      const itemPath = `${path}.emphasis.${index}`;
      unknownKeys(diagnostics, item, EMPHASIS_KEYS, itemPath);
      if (!isObject(item)) return;
      validateSafeText(item.text, diagnostics, `${itemPath}.text`, { required: true });
      if (!ABOUT_NARRATIVE_EMPHASIS_TONES.includes(item.tone)) diagnostic(diagnostics, 'emphasis-tone', `${itemPath}.tone`, 'Unsupported emphasis tone.');
    });
  }
  if (block.worldInfluence != null && typeof block.worldInfluence !== 'boolean') diagnostic(diagnostics, 'world-influence', `${path}.worldInfluence`, 'worldInfluence must be boolean.');
}

function validateTextField(field, index, seen, diagnostics, durationWU) {
  const path = `tracks.text.fields.${index}`;
  const allowed = field?.kind === 'title' ? TITLE_KEYS
    : field?.kind === 'scroll-block' ? SCROLL_BLOCK_KEYS
      : field?.kind === 'stub' ? STUB_KEYS
        : field?.kind === 'discipline-reveal' ? DISCIPLINE_KEYS : TEXT_BASE_KEYS;
  unknownKeys(diagnostics, field, allowed, path);
  if (!isObject(field)) return;
  validateId(field.id, seen, diagnostics, `${path}.id`);
  if (!ABOUT_NARRATIVE_TRACK_TEXT_KINDS.includes(field.kind)) diagnostic(diagnostics, 'text-kind', `${path}.kind`, 'Unsupported Text field kind.');
  ['startWU', 'focusWU', 'endWU'].forEach((key) => validateTime(field[key], diagnostics, `${path}.${key}`, { max: durationWU }));
  if (!(Number(field.startWU) <= Number(field.focusWU) && Number(field.focusWU) <= Number(field.endWU))) diagnostic(diagnostics, 'text-order', path, 'Text timing must satisfy startWU ≤ focusWU ≤ endWU.');
  if (typeof field.publishable !== 'boolean') diagnostic(diagnostics, 'text-publishable', `${path}.publishable`, 'publishable must be boolean.');
  if (field.presentation != null) {
    unknownKeys(diagnostics, field.presentation, PRESENTATION_KEYS, `${path}.presentation`);
    if (isObject(field.presentation)) validateSafeText(field.presentation.layout, diagnostics, `${path}.presentation.layout`, { required: true, maximum: 80 });
  }
  if (field.kind === 'title') {
    validateSafeText(field.text, diagnostics, `${path}.text`, { required: true });
    if (!ABOUT_NARRATIVE_TEXT_MOVEMENT_MODES.includes(field.movement)) diagnostic(diagnostics, 'title-movement', `${path}.movement`, 'Title movement must be spatial or vertical.');
    validateSafeText(field.preset, diagnostics, `${path}.preset`, { required: true, maximum: 80 });
    if (field.anchor != null) validateSafeText(field.anchor, diagnostics, `${path}.anchor`, { required: true, maximum: 80 });
  } else if (field.kind === 'scroll-block') {
    validateBlock(field.block, diagnostics, `${path}.block`);
  } else if (field.kind === 'stub') {
    validateSafeText(field.label, diagnostics, `${path}.label`, { required: true, maximum: 120 });
    if (field.publishable !== false) diagnostic(diagnostics, 'stub-publishable', `${path}.publishable`, 'Stub fields cannot be published.');
  } else if (field.kind === 'discipline-reveal') {
    if (field.protected !== true) diagnostic(diagnostics, 'discipline-protected', `${path}.protected`, 'The migrated Discipline reveal must remain protected.');
    validateTime(field.fieldTravelStartWU, diagnostics, `${path}.fieldTravelStartWU`, { max: durationWU });
    validateTime(field.fieldTravelEndWU, diagnostics, `${path}.fieldTravelEndWU`, { max: durationWU });
    if (Number(field.fieldTravelStartWU) >= Number(field.fieldTravelEndWU)) diagnostic(diagnostics, 'discipline-travel-order', path, 'Discipline field travel start must precede its end.');
    unknownKeys(diagnostics, field.choreography, CHOREOGRAPHY_KEYS, `${path}.choreography`);
    const choreography = field.choreography;
    if (isObject(choreography)) {
      ['fieldTravelWU', 'fieldFogStartWU', 'fieldFogEndWU', 'fieldFogStrength', 'backgroundOpacity', 'reconnectOpacity', 'pointScale', 'labelOffsetPx'].forEach((key) => {
        if (!finite(choreography[key])) diagnostic(diagnostics, 'discipline-number', `${path}.choreography.${key}`, 'Discipline choreography values must be finite.');
      });
      ['staggerWU', 'backgroundFadeWU', 'labelDurationWU', 'holdWU'].forEach((key) => {
        validateTime(choreography[key], diagnostics, `${path}.choreography.${key}`, { max: durationWU });
      });
      if (Number(choreography.fieldFogStartWU) >= Number(choreography.fieldFogEndWU)) diagnostic(diagnostics, 'discipline-fog-order', `${path}.choreography`, 'Discipline fog start must precede its end.');
      if (!Array.isArray(choreography.items) || choreography.items.length !== 6) diagnostic(diagnostics, 'discipline-items', `${path}.choreography.items`, 'Discipline reveal requires exactly six items.');
      else {
        const groups = new Set();
        choreography.items.forEach((item, itemIndex) => {
          const itemPath = `${path}.choreography.items.${itemIndex}`;
          unknownKeys(diagnostics, item, DISCIPLINE_ITEM_KEYS, itemPath);
          if (!Number.isInteger(item?.group) || item.group < 1 || item.group > 6 || groups.has(item.group)) diagnostic(diagnostics, 'discipline-group', `${itemPath}.group`, 'Discipline groups must uniquely cover 1 through 6.');
          groups.add(item?.group);
          validateSafeText(item?.label, diagnostics, `${itemPath}.label`, { required: true, maximum: 80 });
        });
        const lastRevealEndWU = Number(field.startWU)
          + (Math.max(0, choreography.items.length - 1) * Number(choreography.staggerWU))
          + Number(choreography.labelDurationWU)
          + Number(choreography.holdWU);
        if (lastRevealEndWU > Number(field.endWU) + 0.000001) diagnostic(diagnostics, 'discipline-timing', `${path}.choreography`, 'Absolute stagger, label duration, and hold must fit inside the Discipline reveal field.');
      }
    }
  }
}

function validateDisciplineMotionParameters(clip, diagnostics, path) {
  const parameters = clip.parameters;
  if (!isObject(parameters)) return;
  const clipDurationWU = Number(clip.endWU) - Number(clip.startWU);
  const labelCapacityWU = Number(clip.endWU) - Number(clip.activationWU);
  if (Number(parameters.fieldTravelDurationWU) > clipDurationWU + 0.000001) {
    diagnostic(diagnostics, 'discipline-motion-travel', `${path}.parameters.fieldTravelDurationWU`, 'Field travel must fit inside the Discipline reveal Motion clip.');
  }
  if (Number(parameters.labelWindowWU) > labelCapacityWU + 0.000001) {
    diagnostic(diagnostics, 'discipline-motion-label-window', `${path}.parameters.labelWindowWU`, 'The label window must fit between activationWU and the Motion clip end.');
  }
  if (Number(parameters.fieldFogStartWU) >= Number(parameters.fieldFogEndWU)) {
    diagnostic(diagnostics, 'discipline-motion-fog-order', `${path}.parameters`, 'Discipline field fog start must precede its end.');
  }
  const items = parameters.items;
  if (!Array.isArray(items) || items.length !== 6) {
    diagnostic(diagnostics, 'discipline-motion-items', `${path}.parameters.items`, 'Discipline reveal Motion requires exactly six labelled items.');
    return;
  }
  const groups = new Set();
  items.forEach((item, itemIndex) => {
    const itemPath = `${path}.parameters.items.${itemIndex}`;
    unknownKeys(diagnostics, item, DISCIPLINE_ITEM_KEYS, itemPath);
    if (!Number.isInteger(item?.group) || item.group < 1 || item.group > 6 || groups.has(item.group)) {
      diagnostic(diagnostics, 'discipline-motion-group', `${itemPath}.group`, 'Discipline groups must uniquely cover 1 through 6.');
    }
    groups.add(item?.group);
    validateSafeText(item?.label, diagnostics, `${itemPath}.label`, { required: true, maximum: 80 });
  });
  const labelSequenceWU = (Math.max(0, items.length - 1) * Number(parameters.staggerWU))
    + Number(parameters.labelDurationWU)
    + Number(parameters.holdWU);
  if (labelSequenceWU > Number(parameters.labelWindowWU) + 0.000001) {
    diagnostic(diagnostics, 'discipline-motion-timing', `${path}.parameters`, 'Label stagger, reveal duration, and hold must fit inside the label window.');
  }
}

function validateLibrary(library, diagnostics) {
  unknownKeys(diagnostics, library, LIBRARY_KEYS, 'library');
  if (!isObject(library)) return;
  if (!Array.isArray(library.presets)) {
    diagnostic(diagnostics, 'library-presets', 'library.presets', 'Library presets must be an array.');
    return;
  }
  const ids = new Set();
  library.presets.forEach((preset, index) => {
    const path = `library.presets.${index}`;
    unknownKeys(diagnostics, preset, PRESET_KEYS, path);
    if (!isObject(preset)) return;
    validateId(preset.id, ids, diagnostics, `${path}.id`);
    validateSafeText(preset.label, diagnostics, `${path}.label`, { required: true, maximum: 120 });
    validateSafeText(preset.scope, diagnostics, `${path}.scope`, { required: true, maximum: 80 });
    if (preset.protected != null && typeof preset.protected !== 'boolean') diagnostic(diagnostics, 'preset-protected', `${path}.protected`, 'Preset protected must be boolean.');
  });
}

export function validateAboutNarrativeTrackDocument(input) {
  const diagnostics = [];
  if (!isObject(input)) return [{ level: 'error', code: 'document-envelope', path: 'document', message: 'Track document must be an object.' }];
  rejectSectionlikeKeys(input, diagnostics);
  unknownKeys(diagnostics, input, TOP_LEVEL_KEYS, 'document');
  if (input.schemaVersion !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) diagnostic(diagnostics, 'schema-version', 'schemaVersion', 'Track schema version 3 is required.');
  validateGlobals(input.globals, diagnostics);

  const tracks = input.tracks;
  unknownKeys(diagnostics, tracks, TRACK_KEYS, 'tracks');
  if (!isObject(tracks)) return diagnostics;
  unknownKeys(diagnostics, tracks.camera, CAMERA_TRACK_KEYS, 'tracks.camera');
  unknownKeys(diagnostics, tracks.worlds, WORLD_TRACK_KEYS, 'tracks.worlds');
  unknownKeys(diagnostics, tracks.text, TEXT_TRACK_KEYS, 'tracks.text');
  unknownKeys(diagnostics, tracks.interactions, INTERACTION_TRACK_KEYS, 'tracks.interactions');

  const cameraKeys = tracks.camera?.keys;
  const worlds = tracks.worlds?.objects;
  const textFields = tracks.text?.fields;
  const clips = tracks.interactions?.clips;
  if (!Array.isArray(cameraKeys) || cameraKeys.length < 2) diagnostic(diagnostics, 'camera-track', 'tracks.camera.keys', 'Camera track requires at least two keys.');
  if (!Array.isArray(worlds) || worlds.length < 1) diagnostic(diagnostics, 'world-track', 'tracks.worlds.objects', 'World track requires at least one World Start.');
  if (!Array.isArray(textFields)) diagnostic(diagnostics, 'text-track', 'tracks.text.fields', 'Text fields must be an array.');
  if (!Array.isArray(clips)) diagnostic(diagnostics, 'interaction-track', 'tracks.interactions.clips', 'Interaction clips must be an array.');

  const durationWU = Number(input.profiles?.desktop?.storyDurationWU);
  const seen = new Set();
  let previousCameraWU = -1;
  (cameraKeys || []).forEach((key, index) => {
    const path = `tracks.camera.keys.${index}`;
    unknownKeys(diagnostics, key, CAMERA_KEY_KEYS, path);
    if (!isObject(key)) return;
    validateId(key.id, seen, diagnostics, `${path}.id`);
    validateTime(key.atWU, diagnostics, `${path}.atWU`, { max: durationWU });
    if (Number(key.atWU) <= previousCameraWU) diagnostic(diagnostics, 'camera-order', `${path}.atWU`, 'Camera keys must be strictly ordered by atWU.');
    previousCameraWU = Number(key.atWU);
    validateVector(key.offset, diagnostics, `${path}.offset`);
    validateVector(key.lookAtOffset, diagnostics, `${path}.lookAtOffset`);
    if (!finite(key.fov) || key.fov < 20 || key.fov > 90) diagnostic(diagnostics, 'camera-fov', `${path}.fov`, 'FOV must stay between 20 and 90.');
    if (!finite(key.roll)) diagnostic(diagnostics, 'camera-roll', `${path}.roll`, 'Roll must be finite.');
    if (!ABOUT_NARRATIVE_CAMERA_EASINGS.includes(key.easing)) diagnostic(diagnostics, 'camera-easing', `${path}.easing`, 'Unsupported Camera easing.');
    if (typeof key.locked !== 'boolean') diagnostic(diagnostics, 'camera-locked', `${path}.locked`, 'Camera locked must be boolean.');
    if (key.locked !== (index === 0 || index === cameraKeys.length - 1)) diagnostic(diagnostics, 'camera-boundary-lock', `${path}.locked`, 'Only story start and story end Camera keys may be locked.');
  });
  if (cameraKeys?.length && (Number(cameraKeys[0].atWU) !== 0 || Math.abs(Number(cameraKeys.at(-1).atWU) - durationWU) > 0.000001)) diagnostic(diagnostics, 'camera-endpoints', 'tracks.camera.keys', 'Camera keys must cover Story WU 0 through the story duration.');

  let previousWorldWU = -1;
  const worldIds = new Set();
  (worlds || []).forEach((world, index) => {
    const path = `tracks.worlds.objects.${index}`;
    unknownKeys(diagnostics, world, WORLD_KEYS, path);
    if (!isObject(world)) return;
    validateId(world.id, seen, diagnostics, `${path}.id`);
    worldIds.add(world.id);
    validateSafeText(world.label, diagnostics, `${path}.label`, { required: true, maximum: 120 });
    if (world.protected != null && typeof world.protected !== 'boolean') diagnostic(diagnostics, 'world-protected', `${path}.protected`, 'World protected must be boolean.');
    validateTime(world.startWU, diagnostics, `${path}.startWU`, { max: durationWU });
    validateTime(world.anchorWU, diagnostics, `${path}.anchorWU`, { max: durationWU });
    if (Number(world.startWU) <= previousWorldWU) diagnostic(diagnostics, 'world-order', `${path}.startWU`, 'World Starts must be strictly ordered.');
    previousWorldWU = Number(world.startWU);
    if (index === 0 && Number(world.startWU) !== 0) diagnostic(diagnostics, 'world-origin', `${path}.startWU`, 'The first World must start at Story WU 0.');
    const adapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[world.adapterId];
    const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[world.shapeId];
    if (!adapter) diagnostic(diagnostics, 'world-adapter', `${path}.adapterId`, 'Unknown World adapter.');
    if (!shape) diagnostic(diagnostics, 'world-shape', `${path}.shapeId`, 'Unknown World Shape.');
    if (adapter && shape && shape.adapterId !== adapter.id) diagnostic(diagnostics, 'world-shape-adapter', path, 'World Shape is incompatible with its adapter.');
    if (!finite(world.seed) || !Number.isInteger(Number(world.seed))) diagnostic(diagnostics, 'world-seed', `${path}.seed`, 'World seed must be a finite integer.');
    if (!finite(world.entryDistanceWU)) diagnostic(diagnostics, 'world-entry-distance', `${path}.entryDistanceWU`, 'Entry distance must be finite.');
    validateTransform(world.transform, diagnostics, `${path}.transform`);
    const nextStartWU = Number(worlds[index + 1]?.startWU ?? durationWU);
    validateTransition(world.transitionIn, diagnostics, `${path}.transitionIn`, nextStartWU);
    if (Number(world.transitionIn?.startWU) < Number(world.startWU) || Number(world.transitionIn?.endWU) > nextStartWU) diagnostic(diagnostics, 'world-transition-window', `${path}.transitionIn`, 'World transition must remain between this World Start and the next World Start.');
    if (shape && isObject(world.shapeParameters)) {
      unknownKeys(diagnostics, world.shapeParameters, new Set(shape.parameters.map((control) => control.id)), `${path}.shapeParameters`);
      shape.parameters.forEach((control) => validateControlValue(world.shapeParameters[control.id], control, diagnostics, `${path}.shapeParameters.${control.id}`));
    } else if (!isObject(world.shapeParameters)) diagnostic(diagnostics, 'shape-parameters', `${path}.shapeParameters`, 'Shape parameters must be an object.');
    if (!Array.isArray(world.modifiers)) diagnostic(diagnostics, 'world-modifiers', `${path}.modifiers`, 'World modifiers must be an array.');
    else {
      const modifierIds = new Set();
      world.modifiers.forEach((modifier, modifierIndex) => {
        const modifierPath = `${path}.modifiers.${modifierIndex}`;
        unknownKeys(diagnostics, modifier, MODIFIER_KEYS, modifierPath);
        if (!isObject(modifier)) return;
        const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
        if (!definition) diagnostic(diagnostics, 'modifier-id', `${modifierPath}.id`, 'Unknown modifier.');
        if (modifierIds.has(modifier.id)) diagnostic(diagnostics, 'modifier-duplicate', `${modifierPath}.id`, 'A modifier may appear only once in a World stack.');
        modifierIds.add(modifier.id);
        if (typeof modifier.enabled !== 'boolean') diagnostic(diagnostics, 'modifier-enabled', `${modifierPath}.enabled`, 'Modifier enabled must be boolean.');
        if (definition && isObject(modifier.parameters)) {
          unknownKeys(diagnostics, modifier.parameters, new Set(definition.parameters.map((control) => control.id)), `${modifierPath}.parameters`);
          definition.parameters.forEach((control) => validateControlValue(modifier.parameters[control.id], control, diagnostics, `${modifierPath}.parameters.${control.id}`));
        } else if (!isObject(modifier.parameters)) diagnostic(diagnostics, 'modifier-parameters', `${modifierPath}.parameters`, 'Modifier parameters must be an object.');
      });
    }
  });

  let previousTextWU = -1;
  (textFields || []).forEach((field, index) => {
    validateTextField(field, index, seen, diagnostics, durationWU);
    if (Number(field?.startWU) < previousTextWU) diagnostic(diagnostics, 'text-track-order', `tracks.text.fields.${index}.startWU`, 'Text fields must be ordered by startWU.');
    previousTextWU = Number(field?.startWU);
  });

  let previousClipWU = -1;
  (clips || []).forEach((clip, index) => {
    const path = `tracks.interactions.clips.${index}`;
    unknownKeys(diagnostics, clip, INTERACTION_KEYS, path);
    if (!isObject(clip)) return;
    validateId(clip.id, seen, diagnostics, `${path}.id`);
    if (clip.protected != null && typeof clip.protected !== 'boolean') diagnostic(diagnostics, 'interaction-protected', `${path}.protected`, 'Interaction protected must be boolean.');
    ['startWU', 'activationWU', 'endWU'].forEach((key) => validateTime(clip[key], diagnostics, `${path}.${key}`, { max: durationWU }));
    if (!(Number(clip.startWU) <= Number(clip.activationWU) && Number(clip.activationWU) <= Number(clip.endWU))) diagnostic(diagnostics, 'interaction-order', path, 'Interaction timing must satisfy startWU ≤ activationWU ≤ endWU.');
    if (Number(clip.startWU) < previousClipWU) diagnostic(diagnostics, 'interaction-track-order', `${path}.startWU`, 'Interaction clips must be ordered by startWU.');
    previousClipWU = Number(clip.startWU);
    const worldIndex = (worlds || []).findIndex((world) => world.id === clip.targetWorldId);
    if (worldIndex < 0) diagnostic(diagnostics, 'interaction-target', `${path}.targetWorldId`, 'Interaction targetWorldId must reference a World.');
    else {
      const worldStart = Number(worlds[worldIndex].startWU);
      const worldEnd = Number(worlds[worldIndex + 1]?.startWU ?? durationWU);
      if (Number(clip.startWU) < worldStart || Number(clip.endWU) > worldEnd) diagnostic(diagnostics, 'interaction-world-window', path, 'Interaction clip must remain inside its target World active window.');
    }
    const interactionDefinition = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[clip.type];
    if (!interactionDefinition) {
      diagnostic(diagnostics, 'interaction-type', `${path}.type`, 'Unsupported interaction type.');
    } else if (interactionDefinition.parameters.length && !isObject(clip.parameters)) {
      diagnostic(diagnostics, 'interaction-parameters', `${path}.parameters`, 'Interaction parameters must be an object.');
    } else if (isObject(clip.parameters)) {
      const allowedParameterIds = new Set(interactionDefinition.parameters.map((control) => control.id));
      if (clip.type === 'discipline-reveal') allowedParameterIds.add('items');
      unknownKeys(
        diagnostics,
        clip.parameters,
        allowedParameterIds,
        `${path}.parameters`,
      );
      interactionDefinition.parameters.forEach((control) => (
        validateControlValue(clip.parameters[control.id], control, diagnostics, `${path}.parameters.${control.id}`)
      ));
      if (clip.type === 'discipline-reveal') {
        validateDisciplineMotionParameters(clip, diagnostics, path);
        if (worldIndex >= 0 && worlds[worldIndex].shapeId !== 'calm-field-v1') {
          diagnostic(diagnostics, 'discipline-motion-world', `${path}.targetWorldId`, 'Discipline reveal Motion must target the unchanged calm-field World.');
        }
      }
    }
  });

  const disciplineMotionCount = (clips || []).filter((clip) => clip.type === 'discipline-reveal').length;
  const legacyDisciplineFieldCount = (textFields || []).filter((field) => field.kind === 'discipline-reveal').length;
  if (disciplineMotionCount > 1 || (disciplineMotionCount && legacyDisciplineFieldCount)) {
    diagnostic(diagnostics, 'discipline-motion-owner', 'tracks', 'Discipline reveal choreography must have exactly one owner: Motion or legacy Text, never both.');
  }

  const indexes = {
    camera: new Map((cameraKeys || []).map((item) => [item.id, item])),
    worlds: new Map((worlds || []).map((item) => [item.id, item])),
    text: new Map((textFields || []).map((item) => [item.id, item])),
    interactions: new Map((clips || []).map((item) => [item.id, item])),
  };
  validateProfiles(input.profiles, diagnostics, durationWU, indexes);
  validateLibrary(input.library, diagnostics);

  const finale = worlds?.at(-1);
  if (!finale || finale.shapeId !== 'bust-v1' || finale.protected !== true) diagnostic(diagnostics, 'finale-world', 'tracks.worlds.objects', 'The final World must be a protected bust-v1 World.');
  if (finale && !(textFields || []).some((field) => field.publishable && field.startWU <= durationWU && field.endWU >= finale.startWU)) diagnostic(diagnostics, 'finale-text', 'tracks.text.fields', 'The final World requires publishable Text.');
  if (finale && !(clips || []).some((clip) => clip.type === 'horizontal-spin' && clip.targetWorldId === finale.id)) diagnostic(diagnostics, 'finale-interaction', 'tracks.interactions.clips', 'The final bust requires a targeted horizontal-spin interaction.');

  const byteLength = new TextEncoder().encode(JSON.stringify(input)).byteLength;
  if (byteLength > ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES) diagnostic(diagnostics, 'document-size', 'document', 'The About document exceeds the 1MiB safety limit.');
  return diagnostics;
}

export function assertValidAboutNarrativeTrackDocument(document) {
  const diagnostics = validateAboutNarrativeTrackDocument(document);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackValidationError';
    error.diagnostics = diagnostics;
    error.original = cloneAboutNarrativeDocument(document);
    throw error;
  }
  return diagnostics;
}

function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value || {}).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, cloneAboutNarrativeDocument(child)]));
}

function normalizeOverrides(overrides = {}) {
  return {
    camera: sortObjectKeys(overrides.camera),
    worlds: sortObjectKeys(overrides.worlds),
    text: sortObjectKeys(overrides.text),
    interactions: sortObjectKeys(overrides.interactions),
  };
}

export function normalizeAboutNarrativeTrackDocument(input) {
  const source = cloneAboutNarrativeDocument(input);
  return {
    schemaVersion: ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
    globals: source.globals,
    profiles: {
      desktop: { ...source.profiles.desktop, overrides: normalizeOverrides(source.profiles.desktop.overrides) },
      tablet: { ...source.profiles.tablet, overrides: normalizeOverrides(source.profiles.tablet.overrides) },
      mobile: { ...source.profiles.mobile, overrides: normalizeOverrides(source.profiles.mobile.overrides) },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: [...source.tracks.camera.keys].sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)) },
      worlds: { objects: [...source.tracks.worlds.objects].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
      text: { fields: [...source.tracks.text.fields].sort((left, right) => left.startWU - right.startWU || left.focusWU - right.focusWU || left.id.localeCompare(right.id)) },
      interactions: { clips: [...source.tracks.interactions.clips].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)) },
    },
    library: { presets: [...source.library.presets].sort((left, right) => left.id.localeCompare(right.id)) },
  };
}

export function serializeAboutNarrativeTrackDocument(input) {
  assertValidAboutNarrativeTrackDocument(input);
  const normalized = normalizeAboutNarrativeTrackDocument(input);
  assertValidAboutNarrativeTrackDocument(normalized);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}

function legacySpans(document, profile = 'desktop') {
  let startWU = 0;
  return document.sections.map((section) => {
    const extentWU = Number(profile === 'mobile' ? section.mobileExtentWU : section.extentWU);
    const span = { startWU: cleanWU(startWU), travelWU: cleanWU(Math.max(0.001, extentWU - 1)), extentWU };
    startWU += extentWU;
    return [section.id, span];
  });
}

function globalWU(span, local) {
  return cleanWU(span.startWU + (Number(local || 0) * span.travelWU));
}

function migrateCameraKeys(document, spans, durationWU) {
  const keys = [];
  let previousEnd = null;
  document.sections.forEach((section) => {
    const span = spans.get(section.id);
    const localKeys = cloneAboutNarrativeDocument(section.camera.keys);
    if (previousEnd && localKeys[0]) {
      localKeys[0] = { ...localKeys[0], offset: [...previousEnd.offset], lookAtOffset: [...previousEnd.lookAtOffset], fov: previousEnd.fov, roll: previousEnd.roll };
    }
    localKeys.forEach((key, index) => keys.push({
      id: `camera-${section.id}-${index}`,
      atWU: globalWU(span, key.at),
      offset: [...key.offset],
      lookAtOffset: [...key.lookAtOffset],
      fov: Number(key.fov),
      roll: Number(key.roll),
      easing: key.easing,
      locked: false,
    }));
    previousEnd = localKeys.at(-1) || previousEnd;
  });
  keys.sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id));
  keys.forEach((key, index) => { key.locked = index === 0 || index === keys.length - 1; });
  if (keys.at(-1)) keys.at(-1).atWU = durationWU;
  return keys;
}

function migrateWorlds(document, spans) {
  const worlds = document.sections.filter((section) => section.world.mode === 'set').map((section) => {
    const span = spans.get(section.id);
    return {
      id: `world-${section.id}`,
      label: section.label,
      startWU: span.startWU,
      anchorWU: span.startWU,
      adapterId: section.world.adapterId,
      shapeId: section.world.shapeId,
      seed: section.world.seed,
      entryDistanceWU: section.world.entryDistanceWU,
      transform: cloneAboutNarrativeDocument(section.world.transform),
      transitionIn: {
        startWU: globalWU(span, section.world.transitionIn.start),
        endWU: globalWU(span, section.world.transitionIn.end),
        type: section.world.transitionIn.type,
        easing: section.world.transitionIn.easing,
        correspondence: section.world.transitionIn.correspondence,
      },
      shapeParameters: cloneAboutNarrativeDocument(section.world.shapeParameters),
      modifiers: cloneAboutNarrativeDocument(section.world.modifiers || []),
      ...(section.type === 'finale' ? { protected: true } : {}),
    };
  });
  return worlds.sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
}

function presentation(section) {
  return { layout: section.layout };
}

function legacyCueMotionInterval(cue, textMotion, movement) {
  const enter = Number(cue.enter ?? 0);
  const focus = Number(cue.hold ?? ((enter + Number(cue.exit ?? 1)) * 0.5));
  const exit = Number(cue.exit ?? 1);
  if (movement === 'vertical') return { start: enter, focus, end: exit };
  const durationScale = Math.max(0.01, Number(textMotion?.durationScale ?? 1));
  return {
    start: Math.max(0, focus - ((focus - enter) * durationScale)),
    focus,
    end: Math.min(1, focus + ((exit - focus) * durationScale)),
  };
}

function migrateText(document, spans) {
  return document.sections.flatMap((section) => {
    const span = spans.get(section.id);
    const fields = (section.text.cues || []).map((cue) => {
      const movement = cue.motion?.mode === 'vertical' ? 'vertical' : 'spatial';
      const interval = legacyCueMotionInterval(cue, document.globals.textMotion, movement);
      return {
        id: `text-${cue.id}`,
        kind: 'title',
        startWU: globalWU(span, interval.start),
        focusWU: globalWU(span, interval.focus),
        endWU: globalWU(span, interval.end),
        publishable: true,
        presentation: presentation(section),
        movement,
        preset: cue.preset,
        text: cue.text,
        ...(cue.anchor ? { anchor: cue.anchor } : {}),
      };
    });
    const blocks = section.text.blocks || [];
    const segmentWU = span.travelWU / Math.max(1, blocks.length);
    blocks.forEach((block, index) => {
      const startWU = cleanWU(span.startWU + (segmentWU * index));
      const endWU = cleanWU(index === blocks.length - 1 ? span.startWU + span.travelWU : startWU + segmentWU);
      fields.push({ id: `text-${block.id}`, kind: 'scroll-block', startWU, focusWU: cleanWU(startWU + ((endWU - startWU) * 0.5)), endWU, publishable: true, presentation: presentation(section), block: cloneAboutNarrativeDocument(block) });
    });
    const reveal = section.text.disciplineReveal;
    if (reveal) {
      fields.push({
        id: `text-${reveal.id}`,
        kind: 'discipline-reveal',
        startWU: globalWU(span, reveal.start),
        focusWU: globalWU(span, (Number(reveal.start) + Number(reveal.end)) * 0.5),
        endWU: globalWU(span, reveal.end),
        publishable: true,
        protected: true,
        presentation: presentation(section),
        fieldTravelStartWU: globalWU(span, reveal.fieldTravelStart),
        fieldTravelEndWU: globalWU(span, reveal.fieldTravelEnd),
        choreography: {
          fieldTravelWU: reveal.fieldTravelWU,
          fieldFogStartWU: reveal.fieldFogStartWU,
          fieldFogEndWU: reveal.fieldFogEndWU,
          fieldFogStrength: reveal.fieldFogStrength,
          staggerWU: cleanWU(reveal.stagger * span.travelWU),
          backgroundFadeWU: cleanWU(reveal.backgroundFade * span.travelWU),
          backgroundOpacity: reveal.backgroundOpacity,
          reconnectOpacity: reveal.reconnectOpacity,
          pointScale: reveal.pointScale,
          labelOffsetPx: reveal.labelOffsetPx,
          labelDurationWU: cleanWU(reveal.labelDuration * span.travelWU),
          holdWU: cleanWU(reveal.hold * span.travelWU),
          items: cloneAboutNarrativeDocument(reveal.items),
        },
      });
    }
    if (section.text.profile) fields.push({ id: `text-${section.id}-profile`, kind: 'scroll-block', startWU: globalWU(span, 0.62), focusWU: globalWU(span, 0.72), endWU: globalWU(span, 0.9), publishable: true, presentation: presentation(section), block: { id: `${section.id}-profile`, kind: 'prose', text: section.text.profile } });
    if (section.text.prompt) fields.push({ id: `text-${section.id}-prompt`, kind: 'scroll-block', startWU: globalWU(span, 0.72), focusWU: globalWU(span, 0.82), endWU: globalWU(span, 1), publishable: true, presentation: presentation(section), block: { id: `${section.id}-prompt`, kind: 'detail', text: section.text.prompt } });
    return fields;
  }).sort((left, right) => left.startWU - right.startWU || left.focusWU - right.focusWU || left.id.localeCompare(right.id));
}

function activeWorldAt(worlds, storyWU) {
  let active = worlds[0];
  worlds.forEach((world) => { if (world.startWU <= storyWU) active = world; });
  return active;
}

function migrateInteractions(document, spans, worlds, durationWU) {
  return document.sections.flatMap((section) => {
    if (!section.interaction || section.interaction.type === 'none') return [];
    const activationWU = globalWU(spans.get(section.id), section.interaction.activationStart ?? 0);
    const target = activeWorldAt(worlds, activationWU);
    const targetIndex = worlds.findIndex((world) => world.id === target?.id);
    return [{
      id: `interaction-${section.id}`,
      type: section.interaction.type,
      startWU: target.startWU,
      activationWU,
      endWU: cleanWU(worlds[targetIndex + 1]?.startWU ?? durationWU),
      targetWorldId: target.id,
      ...(section.type === 'finale' ? { protected: true } : {}),
    }];
  }).sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
}

export function migrateAboutNarrativeVersion2To3(input) {
  const raw = cloneAboutNarrativeDocument(input);
  const sourceErrors = validateAboutNarrativeDocument(raw, { expectedSchemaVersion: 2 }).filter((item) => item.level === 'error');
  if (sourceErrors.length) {
    const error = new Error(sourceErrors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackMigrationError';
    error.diagnostics = sourceErrors;
    error.original = raw;
    throw error;
  }
  const document = normalizeAboutNarrativeDocument(raw);
  const spans = new Map(legacySpans(document));
  const desktopDurationWU = cleanWU(document.sections.reduce((sum, section) => sum + section.extentWU, 0) - 1);
  const mobileDurationWU = cleanWU(document.sections.reduce((sum, section) => sum + section.mobileExtentWU, 0) - 1);
  const worlds = migrateWorlds(document, spans);
  const emptyOverrides = () => ({ camera: {}, worlds: {}, text: {}, interactions: {} });
  const migrated = {
    schemaVersion: ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
    globals: cloneAboutNarrativeDocument(document.globals),
    profiles: {
      desktop: { storyDurationWU: desktopDurationWU, scrollDurationWU: desktopDurationWU, overrides: emptyOverrides() },
      tablet: { storyDurationWU: desktopDurationWU, scrollDurationWU: desktopDurationWU, overrides: emptyOverrides() },
      mobile: { storyDurationWU: desktopDurationWU, scrollDurationWU: mobileDurationWU, overrides: emptyOverrides() },
      'reduced-motion': { mode: 'overlay', motionPolicy: 'settled' },
    },
    tracks: {
      camera: { keys: migrateCameraKeys(document, spans, desktopDurationWU) },
      worlds: { objects: worlds },
      text: { fields: migrateText(document, spans) },
      interactions: { clips: migrateInteractions(document, spans, worlds, desktopDurationWU) },
    },
    library: cloneAboutNarrativeDocument(document.library || { presets: [] }),
  };
  const normalized = normalizeAboutNarrativeTrackDocument(migrated);
  assertValidAboutNarrativeTrackDocument(normalized);
  return normalized;
}
