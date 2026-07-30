import { ABOUT_NARRATIVE_INTERACTION_DEFINITIONS } from './aboutNarrativeDefinitions.js';
import { ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING } from './aboutNarrativeCameraEasing.js';

export const ABOUT_NARRATIVE_TRACK_EDITING_STEP_WU = 0.005;
export const ABOUT_NARRATIVE_MIN_WORLD_DURATION_WU = 0.25;
export const ABOUT_NARRATIVE_TRACK_CLIPBOARD_VERSION = 1;

const CLIPBOARD_KIND = 'about-narrative-track-objects';
const OBJECT_TYPES = Object.freeze(['camera-key', 'visibility-key', 'world', 'text-field', 'interaction']);
const TRACK_IDS = Object.freeze(['camera', 'visibility', 'world', 'text', 'interaction']);
const TYPE_TO_TRACK = Object.freeze({
  'camera-key': 'camera',
  'visibility-key': 'visibility',
  world: 'world',
  'text-field': 'text',
  interaction: 'interaction',
});
const TRACK_TO_OVERRIDE_SCOPE = Object.freeze({
  camera: 'camera',
  visibility: 'visibility',
  world: 'worlds',
  text: 'text',
  interaction: 'interactions',
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const finite = (value) => Number.isFinite(Number(value));
const cleanWU = (value) => Number(Number(value).toFixed(6));
const clone = (value) => structuredClone(value);

function snapWU(value, step = ABOUT_NARRATIVE_TRACK_EDITING_STEP_WU) {
  return cleanWU(Math.round(Number(value) / step) * step);
}

function resultError(reason, code = 'invalid-edit') {
  return Object.freeze({ valid: false, code, reason });
}

function getTrackCollection(model, trackId) {
  if (trackId === 'camera') return model?.tracks?.camera?.keys;
  if (trackId === 'visibility') return model?.tracks?.visibility?.keys;
  if (trackId === 'world') return model?.tracks?.worlds?.objects;
  if (trackId === 'text') return model?.tracks?.text?.fields;
  if (trackId === 'interaction') return model?.tracks?.interactions?.clips;
  return null;
}

function getObjectTime(object, type) {
  if (type === 'camera-key' || type === 'visibility-key') return Number(object.atWU);
  if (type === 'world') return Number(object.startWU);
  return Number(object.startWU);
}

function getStoryDurationWU(model) {
  const profileDuration = Number(model?.profiles?.desktop?.storyDurationWU);
  if (Number.isFinite(profileDuration) && profileDuration > 0) return profileDuration;
  const times = [
    ...(model?.tracks?.camera?.keys || []).map((item) => item.atWU),
    ...(model?.tracks?.visibility?.keys || []).map((item) => item.atWU),
    ...(model?.tracks?.worlds?.objects || []).map((item) => item.startWU),
    ...(model?.tracks?.pointField?.keys || []).map((item) => item.atWU),
    ...(model?.tracks?.text?.fields || []).map((item) => item.endWU),
    ...(model?.tracks?.interactions?.clips || []).map((item) => item.endWU),
  ].filter(finite).map(Number);
  return Math.max(0, ...times);
}

function scaleTime(value, scale) {
  return finite(value) ? cleanWU(Number(value) * scale) : value;
}

function scaleTransition(transition, scale) {
  if (!transition) return;
  transition.startWU = scaleTime(transition.startWU, scale);
  transition.endWU = scaleTime(transition.endWU, scale);
}

function scaleTimingParameters(parameters, scale) {
  if (!parameters || typeof parameters !== 'object') return;
  Object.entries(parameters).forEach(([key, value]) => {
    if (key.endsWith('WU') && finite(value)) parameters[key] = scaleTime(value, scale);
  });
}

function preserveStoryTimedMotion(parameters, scale) {
  if (!parameters || parameters.timeMode !== 'story' || !finite(parameters.speed)) return;
  parameters.speed = cleanWU(Number(parameters.speed) / scale);
}

function scaleNonTextTiming(model, scale) {
  (model.tracks?.camera?.keys || []).forEach((key) => { key.atWU = scaleTime(key.atWU, scale); });
  (model.tracks?.visibility?.keys || []).forEach((key) => { key.atWU = scaleTime(key.atWU, scale); });
  (model.tracks?.worlds?.objects || []).forEach((world) => {
    world.startWU = scaleTime(world.startWU, scale);
    scaleTransition(world.transitionIn, scale);
    (world.modifiers || []).forEach((modifier) => preserveStoryTimedMotion(modifier.parameters, scale));
  });
  (model.tracks?.pointField?.keys || []).forEach((key) => {
    key.atWU = scaleTime(key.atWU, scale);
  });
  (model.tracks?.pointField?.stateDefinitions || []).forEach((state) => {
    (state.modifiers || []).forEach((modifier) => {
      preserveStoryTimedMotion(modifier.parameters, scale);
    });
  });
  (model.tracks?.interactions?.clips || []).forEach((clip) => {
    clip.startWU = scaleTime(clip.startWU, scale);
    clip.activationWU = scaleTime(clip.activationWU, scale);
    clip.endWU = scaleTime(clip.endWU, scale);
    scaleTimingParameters(clip.parameters, scale);
    preserveStoryTimedMotion(clip.parameters, scale);
  });

  Object.values(model.profiles || {}).forEach((profile) => {
    if (finite(profile.storyDurationWU)) {
      const scrollRatio = finite(profile.scrollDurationWU)
        ? Number(profile.scrollDurationWU) / Number(profile.storyDurationWU)
        : 1;
      profile.storyDurationWU = scaleTime(profile.storyDurationWU, scale);
      if (finite(profile.scrollDurationWU)) {
        profile.scrollDurationWU = cleanWU(profile.storyDurationWU * scrollRatio);
      }
    }
    Object.values(profile.overrides?.camera || {}).forEach((override) => {
      if (finite(override.atWU)) override.atWU = scaleTime(override.atWU, scale);
    });
    Object.values(profile.overrides?.visibility || {}).forEach((override) => {
      if (finite(override.atWU)) override.atWU = scaleTime(override.atWU, scale);
    });
    Object.values(profile.overrides?.worlds || {}).forEach((override) => {
      if (finite(override.startWU)) override.startWU = scaleTime(override.startWU, scale);
      scaleTransition(override.transitionIn, scale);
    });
    Object.values(profile.overrides?.pointField?.keys || {}).forEach((override) => {
      if (finite(override.atWU)) override.atWU = scaleTime(override.atWU, scale);
    });
    Object.values(profile.overrides?.interactions || {}).forEach((override) => {
      if (finite(override.startWU)) override.startWU = scaleTime(override.startWU, scale);
      if (finite(override.activationWU)) override.activationWU = scaleTime(override.activationWU, scale);
      if (finite(override.endWU)) override.endWU = scaleTime(override.endWU, scale);
      scaleTimingParameters(override.parameters, scale);
      preserveStoryTimedMotion(override.parameters, scale);
    });
  });
}

export function synchronizeAboutNarrativeDurationToText(
  model,
  previousDurationWU = getStoryDurationWU(model),
  { allowShrink = false } = {},
) {
  const textDurationWU = Math.max(
    0,
    ...(model.tracks?.text?.fields || []).map((field) => Number(field.endWU)).filter(Number.isFinite),
  );
  if (!(textDurationWU > 0) || !(Number(previousDurationWU) > 0)) return model;
  if (!allowShrink && textDurationWU < Number(previousDurationWU)) return model;
  const scale = textDurationWU / Number(previousDurationWU);
  if (Math.abs(scale - 1) > 0.0000005) scaleNonTextTiming(model, scale);
  return model;
}

function shiftTextOverrideTimes(override, deltaWU) {
  if (!override || typeof override !== 'object') return;
  const shift = (value) => cleanWU(Number(value) + deltaWU);
  if (finite(override.startWU)) override.startWU = shift(override.startWU);
  if (finite(override.focusWU)) override.focusWU = shift(override.focusWU);
  if (finite(override.endWU)) override.endWU = shift(override.endWU);
}

function allObjectEntries(model) {
  return OBJECT_TYPES.flatMap((type) => {
    const track = TYPE_TO_TRACK[type];
    return (getTrackCollection(model, track) || []).map((object) => ({ type, track, object }));
  });
}

function pointFieldObjectIds(model) {
  const pointField = model?.tracks?.pointField;
  return [
    ...(pointField?.stateDefinitions || []),
    ...(pointField?.keys || []),
    ...(pointField?.segments || []),
  ].map((item) => item.id);
}

function getSelectionMembers(selection) {
  if (!selection || !OBJECT_TYPES.includes(selection.type) || !selection.id) return [];
  const members = [{ type: selection.type, id: selection.id }, ...(selection.members || [])];
  const seen = new Set();
  return members.filter((member) => {
    if (!member || member.type !== selection.type || typeof member.id !== 'string') return false;
    const key = `${member.type}:${member.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function makeSelection(primary, members) {
  const selection = { type: primary.type, id: primary.id };
  if (members.length > 1) selection.members = members.map((member) => ({ type: member.type, id: member.id }));
  return selection;
}

function selectionExists(model, selection) {
  return Boolean(getAboutNarrativeTrackObject(model, selection));
}

function readLegacySelectionMap(legacySelectionMap, key) {
  if (legacySelectionMap instanceof Map) return legacySelectionMap.get(key) || null;
  return legacySelectionMap?.[key] || null;
}

function legacySelectionCandidate(selection, model, legacySelectionMap) {
  const sectionId = String(selection?.sectionId || '');
  const mapped = readLegacySelectionMap(
    legacySelectionMap,
    selection?.type === 'cue'
      ? `cue:${sectionId}:${selection.cueId || ''}`
      : selection?.type === 'camera-key'
        ? `camera-key:${sectionId}:${selection.keyIndex}`
        : `${selection?.type || 'section'}:${sectionId}`,
  );
  if (mapped) return mapped;

  if (selection?.type === 'cue' && selection.cueId) {
    return { type: 'text-field', id: `text-${selection.cueId}` };
  }
  if (selection?.type === 'discipline-reveal') {
    const field = (model?.tracks?.text?.fields || []).find((item) => (
      item.kind === 'discipline-reveal'
      && (!sectionId || item.id.includes(sectionId))
    ));
    return field ? { type: 'text-field', id: field.id } : { type: 'track', id: 'text' };
  }
  if (selection?.type === 'camera-key' && Number.isInteger(Number(selection.keyIndex))) {
    return { type: 'camera-key', id: `camera-${sectionId}-${Number(selection.keyIndex)}` };
  }
  if (selection?.type === 'world' || selection?.type === 'section') {
    return { type: 'world', id: `world-${sectionId}` };
  }
  if (selection?.type === 'interaction') {
    const clip = (model?.tracks?.interactions?.clips || []).find((item) => (
      item.id === selection.id || item.id.startsWith(`interaction-${sectionId}-`)
    ));
    return clip ? { type: 'interaction', id: clip.id } : { type: 'track', id: 'interaction' };
  }
  if (selection?.type === 'sequence') {
    const track = selection.track === 'section' ? 'world' : selection.track;
    return { type: 'track', id: TRACK_IDS.includes(track) ? track : 'world' };
  }
  return null;
}

export function normalizeAboutNarrativeTrackSelection(selection, model, {
  legacySelectionMap = null,
  fallbackTrack = 'world',
} = {}) {
  if (selection?.type === 'track' && TRACK_IDS.includes(selection.id)) {
    return { type: 'track', id: selection.id };
  }

  let candidate = selection;
  if (!OBJECT_TYPES.includes(selection?.type) || !selection?.id) {
    candidate = legacySelectionCandidate(selection, model, legacySelectionMap);
  }
  if (candidate?.type === 'track') return candidate;
  if (!candidate || !selectionExists(model, candidate)) {
    const trackId = TYPE_TO_TRACK[candidate?.type] || fallbackTrack;
    return { type: 'track', id: TRACK_IDS.includes(trackId) ? trackId : 'world' };
  }

  const normalizedMembers = getSelectionMembers({
    ...candidate,
    members: selection?.members,
  }).filter((member) => selectionExists(model, member));
  return makeSelection(normalizedMembers[0] || candidate, normalizedMembers.length ? normalizedMembers : [candidate]);
}

export function getAboutNarrativeTrackObject(model, selectionOrType, objectId = null) {
  const selection = typeof selectionOrType === 'string'
    ? { type: selectionOrType, id: objectId }
    : selectionOrType;
  const trackId = TYPE_TO_TRACK[selection?.type];
  if (!trackId || !selection?.id) return null;
  return (getTrackCollection(model, trackId) || []).find((item) => item.id === selection.id) || null;
}

function sortedWorlds(model) {
  return [...(model?.tracks?.worlds?.objects || [])]
    .sort((left, right) => Number(left.startWU) - Number(right.startWU) || left.id.localeCompare(right.id));
}

function getPointFieldStateRanges(model, stateId) {
  const pointField = model?.tracks?.pointField;
  if (!pointField?.keys?.length || !stateId) return [];
  const keys = [...pointField.keys]
    .map((key, index) => ({ ...key, _sourceOrder: index }))
    .sort((left, right) => (
      Number(left.atWU) - Number(right.atWU)
      || left._sourceOrder - right._sourceOrder
    ));
  const ranges = [];
  for (let index = 0; index < keys.length - 1; index += 1) {
    if (keys[index + 1].stateId !== stateId) continue;
    const startWU = Number(keys[index].atWU);
    const endWU = Number(keys[index + 1].atWU);
    const previous = ranges.at(-1);
    if (previous && Math.abs(previous.endWU - startWU) <= 0.000001) {
      previous.endWU = endWU;
    } else {
      ranges.push({ startWU, endWU });
    }
  }
  const finalKey = keys.at(-1);
  if (finalKey.stateId === stateId) {
    const durationWU = getStoryDurationWU(model);
    const previous = ranges.at(-1);
    if (previous && Math.abs(previous.endWU - Number(finalKey.atWU)) <= 0.000001) {
      previous.endWU = durationWU;
    } else {
      ranges.push({ startWU: Number(finalKey.atWU), endWU: durationWU });
    }
  }
  return ranges;
}

function getPointFieldStateRange(model, stateId, atWU) {
  const ranges = getPointFieldStateRanges(model, stateId);
  const time = Number(atWU);
  return ranges.find((range) => time >= range.startWU && time <= range.endWU)
    || ranges[0]
    || null;
}

function getAboutNarrativeActivePointFieldState(model, storyWU) {
  const pointField = model?.tracks?.pointField;
  if (!pointField?.keys?.length) return null;
  const keys = [...pointField.keys]
    .map((key, index) => ({ ...key, _sourceOrder: index }))
    .sort((left, right) => (
      Number(left.atWU) - Number(right.atWU)
      || left._sourceOrder - right._sourceOrder
    ));
  let index = 0;
  while (index < keys.length - 1 && Number(keys[index + 1].atWU) <= Number(storyWU)) {
    index += 1;
  }
  const activeKey = index < keys.length - 1 ? keys[index + 1] : keys[index];
  return pointField.stateDefinitions.find((state) => state.id === activeKey.stateId) || null;
}

export function getAboutNarrativeActiveWorld(model, storyWU) {
  const worlds = sortedWorlds(model);
  let active = null;
  for (const world of worlds) {
    if (Number(world.startWU) <= Number(storyWU)) active = world;
    else break;
  }
  return active;
}

export function getAboutNarrativeTrackObjectRange(model, selectionOrType, objectId = null, {
  cameraWindowWU = 0,
} = {}) {
  const selection = typeof selectionOrType === 'string'
    ? { type: selectionOrType, id: objectId }
    : selectionOrType;
  if (selection?.type === 'track') {
    return TRACK_IDS.includes(selection.id)
      ? { startWU: 0, endWU: getStoryDurationWU(model) }
      : null;
  }
  const object = getAboutNarrativeTrackObject(model, selection);
  if (!object) return null;
  if (selection.type === 'camera-key') {
    return {
      startWU: cleanWU(Number(object.atWU) - Number(cameraWindowWU || 0)),
      endWU: cleanWU(Number(object.atWU) + Number(cameraWindowWU || 0)),
    };
  }
  if (selection.type === 'visibility-key') {
    return {
      startWU: cleanWU(Number(object.atWU) - Number(cameraWindowWU || 0)),
      endWU: cleanWU(Number(object.atWU) + Number(cameraWindowWU || 0)),
    };
  }
  if (selection.type === 'world') {
    const worlds = sortedWorlds(model);
    const index = worlds.findIndex((item) => item.id === object.id);
    return {
      startWU: Number(object.startWU),
      endWU: Number(worlds[index + 1]?.startWU ?? getStoryDurationWU(model)),
    };
  }
  return { startWU: Number(object.startWU), endWU: Number(object.endWU) };
}

function objectMovableTimes(object, type) {
  if (type === 'camera-key' || type === 'visibility-key') return [Number(object.atWU)];
  if (type === 'world') return [
    Number(object.startWU),
    Number(object.anchorWU),
    Number(object.transitionIn?.startWU),
    Number(object.transitionIn?.endWU),
  ].filter(Number.isFinite);
  if (type === 'text-field') return [
    Number(object.startWU),
    Number(object.focusWU),
    Number(object.endWU),
    Number(object.fieldTravelStartWU),
    Number(object.fieldTravelEndWU),
  ].filter(Number.isFinite);
  return [Number(object.startWU), Number(object.activationWU), Number(object.endWU)].filter(Number.isFinite);
}

function shiftObjectTimes(object, type, deltaWU) {
  const shift = (value) => cleanWU(Number(value) + deltaWU);
  if (type === 'camera-key' || type === 'visibility-key') object.atWU = shift(object.atWU);
  if (type === 'world') {
    object.startWU = shift(object.startWU);
    object.anchorWU = shift(object.anchorWU);
    if (object.transitionIn) {
      object.transitionIn.startWU = shift(object.transitionIn.startWU);
      object.transitionIn.endWU = shift(object.transitionIn.endWU);
    }
    delete object.endWU;
  }
  if (type === 'text-field') {
    object.startWU = shift(object.startWU);
    object.focusWU = shift(object.focusWU);
    object.endWU = shift(object.endWU);
    if (finite(object.fieldTravelStartWU)) object.fieldTravelStartWU = shift(object.fieldTravelStartWU);
    if (finite(object.fieldTravelEndWU)) object.fieldTravelEndWU = shift(object.fieldTravelEndWU);
  }
  if (type === 'interaction') {
    object.startWU = shift(object.startWU);
    object.activationWU = shift(object.activationWU);
    object.endWU = shift(object.endWU);
  }
}

function sortTrack(model, trackId) {
  const collection = getTrackCollection(model, trackId);
  const type = OBJECT_TYPES.find((item) => TYPE_TO_TRACK[item] === trackId);
  collection.sort((left, right) => getObjectTime(left, type) - getObjectTime(right, type) || left.id.localeCompare(right.id));
}

function validateEditingModel(model) {
  const durationWU = getStoryDurationWU(model);
  if (!(durationWU > 0)) return resultError('The sectionless narrative needs a positive Story WU duration.', 'story-duration');
  const entries = allObjectEntries(model);
  const ids = new Set();
  for (const { type, object } of entries) {
    if (!object?.id || typeof object.id !== 'string') return resultError('Every track object needs a stable string ID.', 'object-id');
    if (ids.has(object.id)) return resultError(`Track object ID “${object.id}” is duplicated.`, 'duplicate-id');
    ids.add(object.id);
    const times = objectMovableTimes(object, type);
    if (!times.length || times.some((value) => !Number.isFinite(value) || value < 0 || value > durationWU)) {
      return resultError(`${object.id} has timing outside the Story WU range.`, 'object-time');
    }
    if (type === 'text-field' && !(object.startWU <= object.focusWU && object.focusWU <= object.endWU)) {
      return resultError(`${object.id} must keep focusWU between startWU and endWU.`, 'text-window');
    }
    if (type === 'interaction' && !(object.startWU <= object.activationWU && object.activationWU <= object.endWU)) {
      return resultError(`${object.id} must keep activationWU inside its clip.`, 'interaction-window');
    }
    if (type === 'world' && object.transitionIn && object.transitionIn.startWU > object.transitionIn.endWU) {
      return resultError(`${object.id} has an inverted transition window.`, 'world-transition');
    }
  }
  for (const id of pointFieldObjectIds(model)) {
    if (typeof id !== 'string' || !id) {
      return resultError('Every point-field object needs a stable string ID.', 'object-id');
    }
    if (ids.has(id)) return resultError(`Track object ID “${id}” is duplicated.`, 'duplicate-id');
    ids.add(id);
  }

  const worlds = sortedWorlds(model);
  if (!worlds.length && !model?.tracks?.pointField) {
    return resultError('At least one World Start is required.', 'missing-world');
  }
  for (let index = 0; index < worlds.length; index += 1) {
    const world = worlds[index];
    const nextStartWU = Number(worlds[index + 1]?.startWU ?? durationWU);
    if (index && Number(world.startWU) <= Number(worlds[index - 1].startWU)) {
      return resultError('World Starts must have unique increasing WU positions.', 'world-order');
    }
    if (Number(world.transitionIn?.endWU) > nextStartWU) {
      return resultError(`${world.id} transition extends beyond its active World range.`, 'world-transition-range');
    }
  }

  const cameraTimes = [...(model?.tracks?.camera?.keys || [])]
    .sort((left, right) => left.atWU - right.atWU)
    .map((key) => Number(key.atWU));
  if (cameraTimes.some((time, index) => index > 0 && time <= cameraTimes[index - 1])) {
    return resultError('Camera keys must have unique increasing WU positions.', 'camera-order');
  }
  const visibilityTimes = [...(model?.tracks?.visibility?.keys || [])]
    .sort((left, right) => left.atWU - right.atWU)
    .map((key) => Number(key.atWU));
  if (visibilityTimes.some((time, index) => index > 0 && time <= visibilityTimes[index - 1])) {
    return resultError('Visibility keys must have unique increasing WU positions.', 'visibility-order');
  }

  for (const clip of model?.tracks?.interactions?.clips || []) {
    const target = worlds.find((world) => world.id === clip.targetWorldId);
    const pointField = model?.tracks?.pointField;
    if (!target && pointField) {
      if (!pointField.stateDefinitions.some((state) => state.id === clip.targetStateId)) {
        return resultError(`${clip.id} targets a missing point-field state.`, 'interaction-target');
      }
      const keyById = new Map(pointField.keys.map((key) => [key.id, key]));
      const participates = pointField.segments.some((segment) => {
        const fromKey = keyById.get(segment.fromKeyId);
        const toKey = keyById.get(segment.toKeyId);
        return (fromKey?.stateId === clip.targetStateId || toKey?.stateId === clip.targetStateId)
          && Math.max(Number(clip.startWU), Number(fromKey?.atWU))
            < Math.min(Number(clip.endWU), Number(toKey?.atWU));
      });
      if (!participates) {
        return resultError(
          `${clip.id} must overlap a segment that uses its target point-field state.`,
          'interaction-target-window',
        );
      }
      continue;
    }
    const range = target
      ? getAboutNarrativeTrackObjectRange(model, { type: 'world', id: target.id })
      : null;
    if (!range) {
      return resultError(`${clip.id} targets a missing World or point-field state.`, 'interaction-target');
    }
    if (clip.startWU < range.startWU || clip.endWU > range.endWU) {
      return resultError(`${clip.id} extends outside its target's active range.`, 'interaction-target-window');
    }
  }
  return Object.freeze({ valid: true });
}

function resolveSelectedObjects(model, selection) {
  const normalized = normalizeAboutNarrativeTrackSelection(selection, model);
  if (normalized.type === 'track') return resultError('Select one or more track objects first.', 'object-selection');
  const members = getSelectionMembers(normalized);
  const objects = members.map((member) => getAboutNarrativeTrackObject(model, member));
  if (!objects.length || objects.some((object) => !object)) return resultError('The selected track object is no longer available.', 'object-selection');
  return { valid: true, selection: normalized, members, objects, type: normalized.type, track: TYPE_TO_TRACK[normalized.type] };
}

export function moveAboutNarrativeTrackObjectsByWU({
  model,
  selection,
  deltaWU,
  snap = true,
}) {
  const resolved = resolveSelectedObjects(model, selection);
  if (!resolved.valid) return resolved;
  if (!finite(deltaWU)) return resultError('Movement requires a finite WU delta.', 'movement-delta');
  if (resolved.objects.some((object) => object.locked)) return resultError('A protected track object cannot be moved.', 'protected-object');
  const durationWU = getStoryDurationWU(model);
  const previousTextDurationWU = Math.max(
    0,
    ...(model.tracks?.text?.fields || []).map((field) => Number(field.endWU)).filter(Number.isFinite),
  );
  const times = resolved.objects.flatMap((object) => objectMovableTimes(object, resolved.type));
  const minimumDeltaWU = -Math.min(...times);
  const maximumDeltaWU = resolved.type === 'text-field'
    ? 80 - Math.max(...times)
    : durationWU - Math.max(...times);
  const requestedDeltaWU = snap ? snapWU(deltaWU) : cleanWU(deltaWU);
  const appliedDeltaWU = cleanWU(clamp(requestedDeltaWU, minimumDeltaWU, maximumDeltaWU));
  if (Math.abs(appliedDeltaWU) < 0.0000005) {
    return { valid: true, model, selection: resolved.selection, deltaWU: 0, clamped: requestedDeltaWU !== 0 };
  }

  const candidate = clone(model);
  resolved.members.forEach((member) => {
    shiftObjectTimes(getAboutNarrativeTrackObject(candidate, member), resolved.type, appliedDeltaWU);
    if (resolved.type === 'text-field') {
      Object.values(candidate.profiles || {}).forEach((profile) => {
        shiftTextOverrideTimes(profile.overrides?.text?.[member.id], appliedDeltaWU);
      });
    }
  });
  sortTrack(candidate, resolved.track);
  if (resolved.type === 'text-field') {
    synchronizeAboutNarrativeDurationToText(candidate, durationWU, {
      allowShrink: Math.abs(previousTextDurationWU - durationWU) <= 0.000001,
    });
  }
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return {
    valid: true,
    model: candidate,
    selection: resolved.selection,
    deltaWU: appliedDeltaWU,
    clamped: Math.abs(appliedDeltaWU - requestedDeltaWU) > 0.0000005,
  };
}

export function distributeAboutNarrativeTextFieldsEvenly({ model }) {
  const fields = [...(model?.tracks?.text?.fields || [])]
    .sort((left, right) => Number(left.focusWU) - Number(right.focusWU) || left.id.localeCompare(right.id));
  if (fields.length < 3) return resultError('At least three Text elements are needed for even spacing.', 'text-distribution');
  const firstStartWU = Number(fields[0].startWU);
  const lastEndWU = Number(fields.at(-1).endWU);
  const animationDurationWU = fields.reduce(
    (total, field) => total + (Number(field.endWU) - Number(field.startWU)),
    0,
  );
  const gapWU = (lastEndWU - firstStartWU - animationDurationWU) / (fields.length - 1);
  if (!(gapWU >= 0)) return resultError('Text animation windows need more room for even spacing.', 'text-distribution');

  const durationWU = getStoryDurationWU(model);
  const candidate = clone(model);
  const candidateFields = new Map(candidate.tracks.text.fields.map((field) => [field.id, field]));
  let cursorWU = firstStartWU;
  fields.forEach((field, index) => {
    const deltaWU = cleanWU(cursorWU - Number(field.startWU));
    const target = candidateFields.get(field.id);
    shiftObjectTimes(target, 'text-field', deltaWU);
    Object.values(candidate.profiles || {}).forEach((profile) => {
      shiftTextOverrideTimes(profile.overrides?.text?.[field.id], deltaWU);
    });
    cursorWU = Number(target.endWU) + (index < fields.length - 1 ? gapWU : 0);
  });
  sortTrack(candidate, 'text');
  synchronizeAboutNarrativeDurationToText(candidate, durationWU, {
    allowShrink: Math.abs(Number(fields.at(-1).endWU) - durationWU) <= 0.000001,
  });
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return {
    valid: true,
    model: candidate,
    selection: { type: 'track', id: 'text' },
    gapWU: cleanWU(gapWU),
  };
}

export function resizeAboutNarrativeTextFieldEdge({
  model,
  id,
  edge,
  atWU,
  snap = true,
}) {
  if (!['start', 'end'].includes(edge)) return resultError('Text resize edge must be start or end.', 'text-edge');
  if (!finite(atWU)) return resultError('Text resize requires a finite Story WU.', 'text-edge-time');
  const field = getAboutNarrativeTrackObject(model, { type: 'text-field', id });
  if (!field) return resultError(`Text field “${id}” is not available.`, 'object-selection');
  if (field.locked || field.protected) return resultError('A protected Text field cannot be resized.', 'protected-object');
  const durationWU = getStoryDurationWU(model);
  const requestedWU = snap ? snapWU(atWU) : cleanWU(atWU);
  const nextWU = edge === 'start'
    ? clamp(requestedWU, 0, Number(field.focusWU))
    : clamp(requestedWU, Number(field.focusWU), durationWU);
  const candidate = clone(model);
  getAboutNarrativeTrackObject(candidate, { type: 'text-field', id })[`${edge}WU`] = cleanWU(nextWU);
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return { valid: true, model: candidate, object: getAboutNarrativeTrackObject(candidate, { type: 'text-field', id }), clamped: nextWU !== requestedWU };
}

export function resizeAboutNarrativeInteractionEdge({
  model,
  id,
  edge,
  atWU,
  snap = true,
}) {
  if (!['start', 'end'].includes(edge)) return resultError('Motion resize edge must be start or end.', 'interaction-edge');
  if (!finite(atWU)) return resultError('Motion resize requires a finite Story WU.', 'interaction-edge-time');
  const clip = getAboutNarrativeTrackObject(model, { type: 'interaction', id });
  if (!clip) return resultError(`Motion clip “${id}” is not available.`, 'object-selection');
  if (clip.locked || clip.protected) return resultError('A protected Motion clip cannot be resized.', 'protected-object');
  const worldRange = clip.targetStateId
    ? { startWU: 0, endWU: getStoryDurationWU(model) }
    : getAboutNarrativeTrackObjectRange(model, { type: 'world', id: clip.targetWorldId });
  if (!worldRange) {
    return resultError(`Motion clip “${id}” targets a missing World or point-field state.`, 'interaction-target');
  }
  const requestedWU = snap ? snapWU(atWU) : cleanWU(atWU);
  const nextWU = edge === 'start'
    ? clamp(requestedWU, Number(worldRange.startWU), Number(clip.activationWU))
    : clamp(requestedWU, Number(clip.activationWU), Number(worldRange.endWU));
  const candidate = clone(model);
  getAboutNarrativeTrackObject(candidate, { type: 'interaction', id })[`${edge}WU`] = cleanWU(nextWU);
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return {
    valid: true,
    model: candidate,
    object: getAboutNarrativeTrackObject(candidate, { type: 'interaction', id }),
    clamped: nextWU !== requestedWU,
  };
}

function shiftWorldOverrideTimes(override, deltaWU) {
  if (!override || typeof override !== 'object') return;
  const shift = (value) => cleanWU(Number(value) + deltaWU);
  if (finite(override.startWU)) override.startWU = shift(override.startWU);
  if (finite(override.anchorWU)) override.anchorWU = shift(override.anchorWU);
  if (override.transitionIn) {
    if (finite(override.transitionIn.startWU)) override.transitionIn.startWU = shift(override.transitionIn.startWU);
    if (finite(override.transitionIn.endWU)) override.transitionIn.endWU = shift(override.transitionIn.endWU);
  }
}

function shiftInteractionOverrideTimes(override, deltaWU, { pinEnd = false } = {}) {
  if (!override || typeof override !== 'object') return;
  const shift = (value) => cleanWU(Number(value) + deltaWU);
  if (finite(override.startWU)) override.startWU = shift(override.startWU);
  if (finite(override.activationWU)) override.activationWU = shift(override.activationWU);
  if (!pinEnd && finite(override.endWU)) override.endWU = shift(override.endWU);
}

export function resizeAboutNarrativeWorldEnd({
  model,
  id,
  atWU,
  snap = true,
}) {
  if (!finite(atWU)) return resultError('World resize requires a finite Story WU.', 'world-edge-time');
  const worlds = sortedWorlds(model);
  const index = worlds.findIndex((world) => world.id === id);
  if (index < 0) return resultError(`World “${id}” is not available.`, 'object-selection');
  const world = worlds[index];
  if (world.locked || world.protected) return resultError('A protected World cannot be resized.', 'protected-object');
  if (index >= worlds.length - 1) return resultError('The final World ends at the Story boundary and cannot ripple later Worlds.', 'final-world-edge');

  const durationWU = getStoryDurationWU(model);
  const oldEndWU = Number(worlds[index + 1].startWU);
  const currentClips = (model?.tracks?.interactions?.clips || [])
    .filter((clip) => clip.targetWorldId === id);
  const minimumEndWU = Math.max(
    Number(world.startWU) + ABOUT_NARRATIVE_MIN_WORLD_DURATION_WU,
    Number(world.transitionIn?.endWU ?? world.startWU),
    ...currentClips.map((clip) => Number(clip.activationWU)),
  );
  const laterWorlds = worlds.slice(index + 1);
  const laterWorldIds = new Set(laterWorlds.map((item) => item.id));
  const laterClips = (model?.tracks?.interactions?.clips || [])
    .filter((clip) => laterWorldIds.has(clip.targetWorldId));
  const movableLaterTimes = [
    ...laterWorlds.flatMap((item) => objectMovableTimes(item, 'world')),
    ...laterClips.flatMap((clip) => [
      Number(clip.startWU),
      Number(clip.activationWU),
      Math.abs(Number(clip.endWU) - durationWU) < 0.000001 ? null : Number(clip.endWU),
    ].filter(Number.isFinite)),
  ];
  const maximumDeltaWU = durationWU - Math.max(...movableLaterTimes);
  const requestedEndWU = snap ? snapWU(atWU) : cleanWU(atWU);
  const requestedDeltaWU = cleanWU(requestedEndWU - oldEndWU);
  const minimumDeltaWU = cleanWU(minimumEndWU - oldEndWU);
  const appliedDeltaWU = cleanWU(clamp(requestedDeltaWU, minimumDeltaWU, maximumDeltaWU));
  if (Math.abs(appliedDeltaWU) < 0.0000005) {
    return {
      valid: true,
      model,
      object: world,
      endWU: oldEndWU,
      deltaWU: 0,
      clamped: Math.abs(requestedDeltaWU) > 0.0000005,
    };
  }

  const candidate = clone(model);
  const candidateWorlds = sortedWorlds(candidate);
  candidateWorlds.slice(index + 1).forEach((item) => shiftObjectTimes(item, 'world', appliedDeltaWU));
  const nextEndWU = cleanWU(oldEndWU + appliedDeltaWU);
  const candidateClips = candidate.tracks?.interactions?.clips || [];
  candidateClips.forEach((clip) => {
    if (clip.targetWorldId === id) {
      if (Number(clip.endWU) >= oldEndWU - 0.000001 || Number(clip.endWU) > nextEndWU) {
        clip.endWU = nextEndWU;
      }
      return;
    }
    if (!laterWorldIds.has(clip.targetWorldId)) return;
    const pinnedToStoryEnd = Math.abs(Number(clip.endWU) - durationWU) < 0.000001;
    const pinnedEndWU = clip.endWU;
    shiftObjectTimes(clip, 'interaction', appliedDeltaWU);
    if (pinnedToStoryEnd) clip.endWU = pinnedEndWU;
  });

  Object.values(candidate.profiles || {}).forEach((profile) => {
    const overrides = profile?.overrides;
    if (!overrides) return;
    laterWorlds.forEach((item) => shiftWorldOverrideTimes(overrides.worlds?.[item.id], appliedDeltaWU));
    currentClips.forEach((clip) => {
      const override = overrides.interactions?.[clip.id];
      if (override && finite(override.endWU)
        && (Number(override.endWU) >= oldEndWU - 0.000001 || Number(override.endWU) > nextEndWU)) {
        override.endWU = nextEndWU;
      }
    });
    laterClips.forEach((clip) => shiftInteractionOverrideTimes(
      overrides.interactions?.[clip.id],
      appliedDeltaWU,
      { pinEnd: Math.abs(Number(clip.endWU) - durationWU) < 0.000001 },
    ));
  });

  sortTrack(candidate, 'world');
  sortTrack(candidate, 'interaction');
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return {
    valid: true,
    model: candidate,
    object: getAboutNarrativeTrackObject(candidate, { type: 'world', id }),
    endWU: nextEndWU,
    deltaWU: appliedDeltaWU,
    clamped: Math.abs(appliedDeltaWU - requestedDeltaWU) > 0.0000005,
  };
}

function getUsedIds(model) {
  return new Set([
    ...allObjectEntries(model).map(({ object }) => object.id),
    ...pointFieldObjectIds(model),
  ]);
}

function createUniqueId(model, requestedId, base) {
  const ids = getUsedIds(model);
  if (requestedId && !ids.has(requestedId)) return requestedId;
  let suffix = 1;
  let id = base;
  while (ids.has(id)) {
    suffix += 1;
    id = `${base}-${suffix}`;
  }
  return id;
}

function clampWindow(focusWU, leadWU, trailWU, durationWU) {
  const focus = cleanWU(clamp(focusWU, 0, durationWU));
  return {
    startWU: cleanWU(Math.max(0, focus - leadWU)),
    focusWU: focus,
    endWU: cleanWU(Math.min(durationWU, focus + trailWU)),
  };
}

function addCreatedObject(model, type, object) {
  const candidate = clone(model);
  getTrackCollection(candidate, TYPE_TO_TRACK[type]).push(object);
  sortTrack(candidate, TYPE_TO_TRACK[type]);
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return {
    valid: true,
    model: candidate,
    object: getAboutNarrativeTrackObject(candidate, { type, id: object.id }),
    selection: { type, id: object.id },
  };
}

export function createAboutNarrativeTitleAtWU({ model, atWU, id = null, template = {} }) {
  const durationWU = getStoryDurationWU(model);
  const timing = clampWindow(Number(atWU), 0.12, 0.12, durationWU);
  return addCreatedObject(model, 'text-field', {
    ...clone(template),
    id: createUniqueId(model, id, 'title'),
    kind: 'title',
    ...timing,
    movement: template.movement || 'spatial',
    preset: template.preset || 'travelling-title-v1',
    titleStyle: template.titleStyle || 'standard',
    text: template.text || 'New title',
    publishable: template.publishable !== false,
  });
}

export function createAboutNarrativeScrollBlockAtWU({ model, atWU, id = null, template = {} }) {
  const durationWU = getStoryDurationWU(model);
  const timing = clampWindow(Number(atWU) + 0.25, 0.25, 0.25, durationWU);
  return addCreatedObject(model, 'text-field', {
    ...clone(template),
    id: createUniqueId(model, id, 'scroll-block'),
    kind: 'scroll-block',
    ...timing,
    block: clone(template.block || { kind: 'prose', text: 'New editorial paragraph.' }),
    publishable: template.publishable !== false,
  });
}

export function createAboutNarrativeStubAtWU({ model, atWU, id = null, template = {} }) {
  const durationWU = getStoryDurationWU(model);
  const timing = clampWindow(Number(atWU), 0, 0.25, durationWU);
  return addCreatedObject(model, 'text-field', {
    ...clone(template),
    id: createUniqueId(model, id, 'stub'),
    kind: 'stub',
    ...timing,
    text: template.text || '',
    publishable: false,
  });
}

export function createAboutNarrativeCameraKeyAtWU({ model, atWU, id = null, cameraKey = {} }) {
  const durationWU = getStoryDurationWU(model);
  const time = cleanWU(clamp(Number(atWU), 0, durationWU));
  return addCreatedObject(model, 'camera-key', {
    ...clone(cameraKey),
    id: createUniqueId(model, id, 'camera-key'),
    atWU: time,
    position: clone(cameraKey.position || [0, 0, 0]),
    rotation: clone(cameraKey.rotation || [0, 0, 0]),
    fov: Number(cameraKey.fov ?? 48),
    easing: cameraKey.easing || ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING,
    locked: false,
  });
}

export function createAboutNarrativeVisibilityKeyAtWU({ model, atWU, id = null, visibilityKey = {} }) {
  const durationWU = getStoryDurationWU(model);
  const time = cleanWU(clamp(Number(atWU), 0, durationWU));
  return addCreatedObject(model, 'visibility-key', {
    ...clone(visibilityKey),
    id: createUniqueId(model, id, 'visibility-key'),
    atWU: time,
    visibility: Number(visibilityKey.visibility ?? 1),
    easing: visibilityKey.easing || 'smoothstep',
    locked: false,
  });
}

export function createAboutNarrativeWorldAtWU({ model, atWU, id = null, template = null }) {
  const durationWU = getStoryDurationWU(model);
  const time = cleanWU(clamp(Number(atWU), 0, durationWU));
  const active = getAboutNarrativeActiveWorld(model, time);
  const source = clone(template || active || {
    adapterId: 'point-field-v1',
    shapeId: 'cluster-v1',
    seed: 1,
    entryDistanceWU: 4,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: 1 },
    shapeParameters: { density: 1 },
    modifiers: [],
  });
  delete source.endWU;
  return addCreatedObject(model, 'world', {
    ...source,
    id: createUniqueId(model, id, 'world'),
    label: source.label || 'New World',
    startWU: time,
    anchorWU: time,
    transitionIn: {
      startWU: time,
      endWU: time,
      type: 'cut',
      easing: source.transitionIn?.easing || 'linear',
      correspondence: source.transitionIn?.correspondence || 'stable-seed',
    },
    locked: false,
  });
}

export function createAboutNarrativeInteractionAtWU({
  model,
  atWU,
  id = null,
  interactionType = 'horizontal-spin',
  targetWorldId = null,
  targetStateId = null,
  template = {},
}) {
  const durationWU = getStoryDurationWU(model);
  const activationWU = cleanWU(clamp(Number(atWU), 0, durationWU));
  const pointState = targetStateId
    ? model?.tracks?.pointField?.stateDefinitions?.find((state) => state.id === targetStateId)
    : getAboutNarrativeActivePointFieldState(model, activationWU);
  const activeWorld = pointState ? null : targetWorldId
    ? getAboutNarrativeTrackObject(model, { type: 'world', id: targetWorldId })
    : getAboutNarrativeActiveWorld(model, activationWU);
  if (!activeWorld && !pointState) {
    return resultError('Create a World or point-field state before adding an Interaction.', 'interaction-target');
  }
  const worldRange = pointState
    ? getPointFieldStateRange(model, pointState.id, activationWU)
    : getAboutNarrativeTrackObjectRange(model, { type: 'world', id: activeWorld.id });
  const definition = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[interactionType];
  const parameters = definition?.parameters.length
    ? { ...definition.defaultParameters, ...(template.parameters || {}) }
    : template.parameters;
  return addCreatedObject(model, 'interaction', {
    ...clone(template),
    id: createUniqueId(model, id, 'interaction'),
    type: interactionType,
    startWU: cleanWU(Math.max(worldRange.startWU, activationWU - 0.1)),
    activationWU,
    endWU: cleanWU(Math.min(worldRange.endWU, activationWU + 0.5)),
    ...(pointState
      ? { targetStateId: pointState.id }
      : { targetWorldId: activeWorld.id }),
    ...(parameters ? { parameters } : {}),
  });
}

export function createAboutNarrativeTrackObjectAtWU({ model, track, kind = null, ...options }) {
  if (track === 'text' && kind === 'title') return createAboutNarrativeTitleAtWU({ model, ...options });
  if (track === 'text' && kind === 'scroll-block') return createAboutNarrativeScrollBlockAtWU({ model, ...options });
  if (track === 'text' && kind === 'stub') return createAboutNarrativeStubAtWU({ model, ...options });
  if (track === 'camera') return createAboutNarrativeCameraKeyAtWU({ model, ...options });
  if (track === 'visibility') return createAboutNarrativeVisibilityKeyAtWU({ model, ...options });
  if (track === 'world') return createAboutNarrativeWorldAtWU({ model, ...options });
  if (track === 'interaction') return createAboutNarrativeInteractionAtWU({ model, ...options });
  return resultError('Choose a supported Camera, Visibility, World, Text, or Interaction object type.', 'object-kind');
}

export function deleteAboutNarrativeTrackObjects({ model, selection }) {
  const resolved = resolveSelectedObjects(model, selection);
  if (!resolved.valid) return resolved;
  if (resolved.objects.some((object) => object.locked)) return resultError('A protected track object cannot be deleted.', 'protected-object');
  const candidate = clone(model);
  const ids = new Set(resolved.members.map((member) => member.id));
  const collection = getTrackCollection(candidate, resolved.track);
  collection.splice(0, collection.length, ...collection.filter((object) => !ids.has(object.id)));
  const overrideScope = TRACK_TO_OVERRIDE_SCOPE[resolved.track];
  Object.values(candidate.profiles || {}).forEach((profile) => {
    const overrides = profile?.overrides?.[overrideScope];
    if (!overrides) return;
    ids.forEach((id) => delete overrides[id]);
  });
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  return {
    valid: true,
    model: candidate,
    deletedIds: [...ids],
    selection: { type: 'track', id: resolved.track },
  };
}

export function createAboutNarrativeTrackClipboardPayload({ model, selection }) {
  const resolved = resolveSelectedObjects(model, selection);
  if (!resolved.valid) return resolved;
  const ordered = resolved.objects
    .map((object) => clone(object))
    .sort((left, right) => getObjectTime(left, resolved.type) - getObjectTime(right, resolved.type) || left.id.localeCompare(right.id));
  const originWU = getObjectTime(ordered[0], resolved.type);
  return {
    version: ABOUT_NARRATIVE_TRACK_CLIPBOARD_VERSION,
    kind: CLIPBOARD_KIND,
    track: resolved.track,
    originWU: cleanWU(originWU),
    items: ordered.map((object) => ({
      sourceId: object.id,
      offsetWU: cleanWU(getObjectTime(object, resolved.type) - originWU),
      object,
    })),
  };
}

export function validateAboutNarrativeTrackClipboardPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return resultError('The track clipboard is empty or damaged.', 'clipboard-envelope');
  if (payload.version !== ABOUT_NARRATIVE_TRACK_CLIPBOARD_VERSION || payload.kind !== CLIPBOARD_KIND) return resultError('This track clipboard format is not supported.', 'clipboard-version');
  if (!TRACK_IDS.includes(payload.track)) return resultError('The clipboard track is not supported.', 'clipboard-track');
  if (!finite(payload.originWU) || Number(payload.originWU) < 0) return resultError('The clipboard origin must be a non-negative Story WU.', 'clipboard-origin');
  if (!Array.isArray(payload.items) || !payload.items.length || payload.items.length > 100) return resultError('The clipboard must contain between 1 and 100 objects.', 'clipboard-items');
  const allowedEnvelopeKeys = new Set(['version', 'kind', 'track', 'originWU', 'items']);
  if (Object.keys(payload).some((key) => !allowedEnvelopeKeys.has(key))) return resultError('The clipboard contains an unknown envelope field.', 'clipboard-field');
  const ids = new Set();
  for (const item of payload.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return resultError('A clipboard item is damaged.', 'clipboard-item');
    if (Object.keys(item).some((key) => !['sourceId', 'offsetWU', 'object'].includes(key))) return resultError('A clipboard item contains an unknown field.', 'clipboard-field');
    if (typeof item.sourceId !== 'string' || !item.sourceId || ids.has(item.sourceId)) return resultError('Clipboard source IDs must be unique strings.', 'clipboard-id');
    ids.add(item.sourceId);
    if (!finite(item.offsetWU) || Number(item.offsetWU) < 0) return resultError('Clipboard offsets must be non-negative Story WU values.', 'clipboard-offset');
    if (!item.object || typeof item.object !== 'object' || Array.isArray(item.object) || item.object.id !== item.sourceId) return resultError('A clipboard object does not match its source ID.', 'clipboard-object');
    const type = OBJECT_TYPES.find((candidate) => TYPE_TO_TRACK[candidate] === payload.track);
    if (objectMovableTimes(item.object, type).some((value) => !Number.isFinite(value))) return resultError('A clipboard object has invalid timing.', 'clipboard-time');
  }
  return { valid: true, payload: clone(payload) };
}

export function pasteAboutNarrativeTrackClipboardPayload({ model, payload, atWU }) {
  const checked = validateAboutNarrativeTrackClipboardPayload(payload);
  if (!checked.valid) return checked;
  if (!finite(atWU)) return resultError('Paste requires a finite Story WU.', 'paste-time');
  const type = OBJECT_TYPES.find((candidate) => TYPE_TO_TRACK[candidate] === payload.track);
  const durationWU = getStoryDurationWU(model);
  const allTimes = payload.items.flatMap((item) => objectMovableTimes(item.object, type).map((time) => (
    Number(atWU) + Number(item.offsetWU) + (time - getObjectTime(item.object, type))
  )));
  const pasteShiftWU = clamp(0, -Math.min(...allTimes), durationWU - Math.max(...allTimes));
  const candidate = clone(model);
  const idMap = new Map();
  payload.items.forEach((item) => idMap.set(item.sourceId, createUniqueId(candidate, null, item.sourceId)));
  const created = payload.items.map((item) => {
    const object = clone(item.object);
    const targetWU = Number(atWU) + Number(item.offsetWU) + pasteShiftWU;
    shiftObjectTimes(object, type, targetWU - getObjectTime(object, type));
    object.id = idMap.get(item.sourceId);
    if (type === 'text-field' && object.anchor && idMap.has(object.anchor)) object.anchor = idMap.get(object.anchor);
    object.locked = false;
    getTrackCollection(candidate, payload.track).push(object);
    return object;
  });
  sortTrack(candidate, payload.track);
  const validation = validateEditingModel(candidate);
  if (!validation.valid) return validation;
  const members = created.map((object) => ({ type, id: object.id }));
  return {
    valid: true,
    model: candidate,
    objects: created,
    idMap: Object.fromEntries(idMap),
    clamped: Math.abs(pasteShiftWU) > 0.0000005,
    selection: makeSelection(members[0], members),
  };
}

export function duplicateAboutNarrativeTrackObjects({
  model,
  selection,
  offsetWU = 0.1,
}) {
  const payload = createAboutNarrativeTrackClipboardPayload({ model, selection });
  if (!payload.valid && payload.valid === false) return payload;
  return pasteAboutNarrativeTrackClipboardPayload({
    model,
    payload,
    atWU: Number(payload.originWU) + Number(offsetWU),
  });
}

export function deriveAboutNarrativeTrackLoopRange({
  model,
  selection,
  preRollWU = 0,
  postRollWU = 0,
  cameraWindowWU = 0.25,
}) {
  const resolved = resolveSelectedObjects(model, selection);
  if (!resolved.valid) return resolved;
  if (![preRollWU, postRollWU, cameraWindowWU].every(finite) || preRollWU < 0 || postRollWU < 0 || cameraWindowWU <= 0) {
    return resultError('Loop roll and Camera window values must be valid non-negative WU values.', 'loop-window');
  }
  const ranges = resolved.members.map((member) => getAboutNarrativeTrackObjectRange(model, member, null, {
    cameraWindowWU: ['camera-key', 'visibility-key'].includes(member.type) ? cameraWindowWU : 0,
  }));
  const durationWU = getStoryDurationWU(model);
  const startWU = cleanWU(clamp(Math.min(...ranges.map((range) => range.startWU)) - Number(preRollWU), 0, durationWU));
  const endWU = cleanWU(clamp(Math.max(...ranges.map((range) => range.endWU)) + Number(postRollWU), 0, durationWU));
  if (!(endWU > startWU)) return resultError('The selected object has no duration to audition.', 'loop-duration');
  return {
    valid: true,
    startWU,
    endWU,
    sourceType: resolved.type,
    sourceId: resolved.members.map((member) => member.id).join('+'),
  };
}
