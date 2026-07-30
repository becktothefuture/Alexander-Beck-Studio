import {
  ABOUT_NARRATIVE_ADAPTER_DEFINITIONS,
} from './aboutNarrativeDefinitions.js';
import {
  applyAboutNarrativeTrackEasing,
  applyAboutNarrativeWorldTransitionEasing,
} from './aboutNarrativeMotionMath.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  applyAboutNarrativePointFieldOverrides,
  normalizeAboutNarrativePointFieldDocument,
  validateAboutNarrativePointFieldDocument,
} from './aboutNarrativePointFieldSchema.js';
import { segmentRequiresCorrespondence } from './aboutNarrativePointFieldIdentity.js';

const TIME_EPSILON = 0.000001;
const LAYOUT_PROFILES = new Set(['desktop', 'tablet', 'mobile']);
const MOTION_PROFILES = new Set(['full', 'reduced']);
const EMPTY_SAMPLE_OPTIONS = Object.freeze({});

const clone = (value) => (value === undefined ? undefined : structuredClone(value));
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function mergeDeep(base, override) {
  if (!base || typeof base !== 'object' || Array.isArray(base)
    || !override || typeof override !== 'object' || Array.isArray(override)) {
    return clone(override === undefined ? base : override);
  }
  const output = clone(base);
  Object.entries(override).forEach(([key, value]) => {
    output[key] = value && typeof value === 'object' && !Array.isArray(value)
      && output[key] && typeof output[key] === 'object' && !Array.isArray(output[key])
      ? mergeDeep(output[key], value)
      : clone(value);
  });
  return output;
}

function makeDiagnostic(code, path, message) {
  return Object.freeze({ level: 'error', code, path, message });
}

function invalidPlan(diagnostics, model = null, layoutProfile = '', motionProfile = '') {
  return deepFreeze({
    valid: false,
    diagnostics: diagnostics || [],
    model,
    layoutProfile,
    motionProfile,
    reducedMotion: motionProfile === 'reduced',
    durationWU: 0,
    globals: null,
    states: [],
    rendererStates: [],
    keys: [],
    segments: [],
    interactions: [],
    preparationGraph: { stateNodes: [], segmentOccurrences: [] },
  });
}

function resolveProfile(model, options) {
  const layoutProfile = options.layoutProfile || options.previewLayoutProfile || 'desktop';
  const motionProfile = options.motionProfile || options.previewMotionProfile || 'full';
  if (!LAYOUT_PROFILES.has(layoutProfile)) {
    throw new RangeError(`Unknown About Narrative layout profile: ${layoutProfile}.`);
  }
  if (!MOTION_PROFILES.has(motionProfile)) {
    throw new RangeError(`Unknown About Narrative motion profile: ${motionProfile}.`);
  }
  const profile = model.profiles?.[layoutProfile];
  const durationWU = Number(profile?.storyDurationWU);
  if (!(durationWU >= 0) || !Number.isFinite(durationWU)) {
    throw new TypeError(`About Narrative ${layoutProfile} requires a finite Story duration.`);
  }
  return { layoutProfile, motionProfile, profile, durationWU };
}

function stateOrderFromKeys(pointField) {
  const definitions = new Map(pointField.stateDefinitions.map((state) => [state.id, state]));
  const orderedIds = [];
  const seen = new Set();
  pointField.keys.forEach((key) => {
    if (seen.has(key.stateId)) return;
    seen.add(key.stateId);
    orderedIds.push(key.stateId);
  });
  pointField.stateDefinitions.forEach((state) => {
    if (seen.has(state.id)) return;
    seen.add(state.id);
    orderedIds.push(state.id);
  });
  return orderedIds.map((id) => definitions.get(id)).filter(Boolean);
}

function compileState(definition, globals) {
  const railAnchorWU = Number(definition.railAnchorWU);
  const worldRail = globals?.worldRail || {};
  const originZ = Number(worldRail.originZ ?? globals?.camera?.startZ ?? 0);
  const unitsPerWU = Number(worldRail.unitsPerWU ?? globals?.camera?.cadence ?? 0);
  return deepFreeze({
    stateId: definition.id,
    label: definition.label,
    adapterId: definition.adapterId,
    shapeId: definition.shapeId,
    seed: Number(definition.seed),
    railAnchorWU,
    anchorRailZ: originZ - (railAnchorWU * unitsPerWU),
    entryDistanceWU: Number(definition.entryDistanceWU),
    transform: clone(definition.transform),
    shapeParameters: clone(definition.shapeParameters),
    modifiers: clone(definition.modifiers),
    protected: definition.protected === true,
  });
}

function createRendererState(state) {
  return deepFreeze({
    id: state.stateId,
    stateId: state.stateId,
    label: state.label,
    adapterId: state.adapterId,
    shapeId: state.shapeId,
    seed: state.seed,
    railAnchorWU: state.railAnchorWU,
    anchorWU: state.railAnchorWU,
    anchorRailZ: state.anchorRailZ,
    entryDistanceWU: state.entryDistanceWU,
    transform: state.transform,
    shapeParameters: state.shapeParameters,
    modifiers: state.modifiers,
    protected: state.protected,
  });
}

function sortResolvedKeys(keys) {
  return keys.map((key, index) => ({ ...clone(key), _sourceOrder: index }))
    .sort((left, right) => (
      Number(left.atWU) - Number(right.atWU)
      || left._sourceOrder - right._sourceOrder
    ));
}

function compilePointField(pointField, globals) {
  const states = stateOrderFromKeys(pointField).map((state) => compileState(state, globals));
  const stateById = new Map(states.map((state) => [state.stateId, state]));
  const rendererStates = states.map(createRendererState);
  const rendererStateById = new Map(rendererStates.map((state) => [state.stateId, state]));
  const keys = sortResolvedKeys(pointField.keys).map((key, index) => deepFreeze({
    id: key.id,
    occurrenceId: key.id,
    atWU: Number(key.atWU),
    stateId: key.stateId,
    state: stateById.get(key.stateId),
    rendererState: rendererStateById.get(key.stateId),
    protected: key.protected === true,
    sourceOrder: key._sourceOrder,
    index,
  }));
  const segmentByPair = new Map(pointField.segments.map((segment) => [
    `${segment.fromKeyId}->${segment.toKeyId}`,
    segment,
  ]));
  const segments = [];
  for (let index = 0; index < keys.length - 1; index += 1) {
    const fromKey = keys[index];
    const toKey = keys[index + 1];
    const source = segmentByPair.get(`${fromKey.id}->${toKey.id}`);
    const transition = deepFreeze(clone(source.transition));
    segments.push(deepFreeze({
      id: source.id,
      occurrenceId: source.id,
      index,
      fromKeyId: fromKey.id,
      toKeyId: toKey.id,
      fromOccurrenceId: fromKey.occurrenceId,
      toOccurrenceId: toKey.occurrenceId,
      fromStateId: fromKey.stateId,
      toStateId: toKey.stateId,
      fromKey,
      toKey,
      fromState: fromKey.state,
      toState: toKey.state,
      fromRendererState: fromKey.rendererState,
      toRendererState: toKey.rendererState,
      startWU: fromKey.atWU,
      endWU: toKey.atWU,
      durationWU: Math.max(0, toKey.atWU - fromKey.atWU),
      zeroLength: Math.abs(toKey.atWU - fromKey.atWU) <= TIME_EPSILON,
      transition,
    }));
  }
  return { states, stateById, rendererStates, rendererStateById, keys, segments };
}

function compileInteractions(model, profile) {
  const overrides = profile?.overrides?.interactions || {};
  return [...(model.tracks?.interactions?.clips || [])]
    .map((clip) => mergeDeep(clip, overrides[clip.id] || {}))
    .sort((left, right) => (
      Number(left.startWU) - Number(right.startWU)
      || left.id.localeCompare(right.id)
    ));
}

function interactionOverlapsSegment(clip, segment) {
  return Math.max(Number(clip.startWU), segment.startWU)
    < Math.min(Number(clip.endWU), segment.endWU) - TIME_EPSILON;
}

function validateInteractionRuntime(interactions, compiled, durationWU) {
  const diagnostics = [];
  interactions.forEach((clip, index) => {
    const path = `tracks.interactions.clips.${index}`;
    const state = compiled.stateById.get(clip.targetStateId);
    if (!state) {
      diagnostics.push(makeDiagnostic(
        'point-field-interaction-target',
        `${path}.targetStateId`,
        `Interaction target state “${clip.targetStateId}” does not exist.`,
      ));
      return;
    }
    const adapter = ABOUT_NARRATIVE_ADAPTER_DEFINITIONS[state.adapterId];
    if (adapter?.capabilities?.interaction !== true) {
      diagnostics.push(makeDiagnostic(
        'point-field-interaction-capability',
        `${path}.targetStateId`,
        `State “${state.stateId}” does not support point-field interactions.`,
      ));
    }
    if (clip.type === 'discipline-reveal' && state.shapeId !== 'calm-field-v1') {
      diagnostics.push(makeDiagnostic(
        'point-field-discipline-capability',
        `${path}.targetStateId`,
        'Discipline reveal requires the calm-field-v1 semantic-anchor state.',
      ));
    }
    const overlapping = compiled.segments.filter((segment) => interactionOverlapsSegment(clip, segment));
    if (Number(clip.endWU) === durationWU && Number(clip.startWU) <= durationWU) {
      const finalStateId = compiled.keys.at(-1)?.stateId;
      if (finalStateId && finalStateId !== clip.targetStateId) {
        diagnostics.push(makeDiagnostic(
          'point-field-interaction-final-target',
          `${path}.targetStateId`,
          `Final-frame interaction target must be “${finalStateId}”.`,
        ));
      }
    }
    const mismatch = overlapping.find((segment) => segment.toStateId !== clip.targetStateId);
    if (mismatch) {
      diagnostics.push(makeDiagnostic(
        'point-field-interaction-window',
        path,
        `Interaction “${clip.id}” overlaps segment “${mismatch.id}”, whose active destination is “${mismatch.toStateId}”.`,
      ));
    }
  });
  return diagnostics;
}

function createPreparationGraph(compiled) {
  const referencedStateIds = new Set(compiled.keys.map((key) => key.stateId));
  const stateNodes = compiled.states
    .filter((state) => referencedStateIds.has(state.stateId))
    .map((state) => deepFreeze({
      id: state.stateId,
      stateId: state.stateId,
      adapterId: state.adapterId,
      shapeId: state.shapeId,
      seed: state.seed,
      railAnchorWU: state.railAnchorWU,
      anchorRailZ: state.anchorRailZ,
      entryDistanceWU: state.entryDistanceWU,
      transform: state.transform,
      shapeParameters: state.shapeParameters,
    }));
  const segmentOccurrences = compiled.segments
    .filter(segmentRequiresCorrespondence)
    .map((segment) => deepFreeze({
      id: segment.id,
      occurrenceId: segment.occurrenceId,
      fromOccurrenceId: segment.fromOccurrenceId,
      toOccurrenceId: segment.toOccurrenceId,
      fromStateId: segment.fromStateId,
      toStateId: segment.toStateId,
      type: segment.transition.type,
      correspondence: segment.transition.correspondence,
      requiresCorrespondence: true,
    }));
  return deepFreeze({ stateNodes, segmentOccurrences });
}

export function compileAboutNarrativePointFieldRuntime(input, options = EMPTY_SAMPLE_OPTIONS) {
  const candidate = clone(input);
  const sourceDiagnostics = validateAboutNarrativePointFieldDocument(candidate);
  const sourceErrors = sourceDiagnostics.filter((item) => item.level === 'error');
  if (sourceErrors.length) return invalidPlan(sourceDiagnostics, candidate);
  const model = normalizeAboutNarrativePointFieldDocument(candidate);
  let resolvedProfile;
  try {
    resolvedProfile = resolveProfile(model, options);
  } catch (error) {
    return invalidPlan([
      ...sourceDiagnostics,
      makeDiagnostic('point-field-profile', 'profiles', error.message),
    ], model);
  }
  const pointField = applyAboutNarrativePointFieldOverrides(
    model.tracks.pointField,
    resolvedProfile.profile.overrides.pointField,
  );
  const compiled = compilePointField(pointField, model.globals);
  const interactions = compileInteractions(model, resolvedProfile.profile);
  const interactionDiagnostics = validateInteractionRuntime(
    interactions,
    compiled,
    resolvedProfile.durationWU,
  );
  const diagnostics = [...sourceDiagnostics, ...interactionDiagnostics];
  if (interactionDiagnostics.length) {
    return invalidPlan(
      diagnostics,
      model,
      resolvedProfile.layoutProfile,
      resolvedProfile.motionProfile,
    );
  }
  return deepFreeze({
    valid: true,
    diagnostics,
    schemaVersion: ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
    model,
    globals: model.globals,
    layoutProfile: resolvedProfile.layoutProfile,
    motionProfile: resolvedProfile.motionProfile,
    reducedMotion: resolvedProfile.motionProfile === 'reduced',
    durationWU: resolvedProfile.durationWU,
    states: compiled.states,
    rendererStates: compiled.rendererStates,
    keys: compiled.keys,
    segments: compiled.segments,
    interactions,
    preparationGraph: createPreparationGraph(compiled),
  });
}

function writeMotionEnvelope(target, source, fallbackMode) {
  target.mode = source?.mode || fallbackMode;
  target.amount = Number(source?.amount || 0);
}

function writeTransition(target, segment) {
  const transition = segment?.transition;
  target.type = transition?.type || 'hold';
  target.easing = transition?.easing || 'linear';
  target.correspondence = transition?.correspondence ?? null;
  writeMotionEnvelope(target.stagger, transition?.stagger, 'uniform');
  writeMotionEnvelope(target.path, transition?.path, 'direct');
  writeMotionEnvelope(target.flatten, transition?.flatten, 'none');
}

function findActiveKeyIndex(keys, storyWU) {
  let low = 0;
  let high = keys.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (Number(keys[middle].atWU) <= storyWU) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

function isActiveAt(clip, storyWU, durationWU) {
  if (storyWU < Number(clip.startWU)) return false;
  if (storyWU < Number(clip.endWU)) return true;
  return Math.abs(storyWU - durationWU) <= TIME_EPSILON
    && Math.abs(Number(clip.endWU) - durationWU) <= TIME_EPSILON;
}

function collectInteractionIds(target, interactions, storyWU, durationWU, activated) {
  target.length = 0;
  for (let index = 0; index < interactions.length; index += 1) {
    const clip = interactions[index];
    if (!isActiveAt(clip, storyWU, durationWU)) continue;
    if (activated && storyWU < Number(clip.activationWU)) continue;
    target.push(clip.id);
  }
}

export function createAboutNarrativePointFieldFrameSample() {
  const frame = {
    storyWU: 0,
    ambientTime: 0,
    durationWU: 0,
    layoutProfile: 'desktop',
    reducedMotion: false,
    world: {
      from: null,
      to: null,
      fromOccurrenceId: '',
      toOccurrenceId: '',
      segmentId: '',
      rawProgress: 1,
      easedProgress: 1,
      visualProgress: 1,
      transitionProgress: 1,
      transition: {
        type: 'hold',
        easing: 'linear',
        correspondence: null,
        stagger: { mode: 'uniform', amount: 0 },
        path: { mode: 'direct', amount: 0 },
        flatten: { mode: 'none', amount: 0 },
      },
    },
    interactions: {
      activeClipIds: [],
      activatedClipIds: [],
      activeInteraction: null,
      interactionActivated: false,
    },
  };
  Object.defineProperty(frame, '_aboutNarrativePointFieldFrame', { value: true });
  return frame;
}

function writeProgress(target, segment, storyWU, reducedMotion) {
  if (!segment || reducedMotion || segment.transition.type === 'hold') {
    target.rawProgress = 1;
    target.easedProgress = 1;
    target.visualProgress = 1;
    target.transitionProgress = 1;
    return;
  }
  if (segment.zeroLength) {
    target.rawProgress = 1;
    target.easedProgress = 1;
    target.visualProgress = 1;
    target.transitionProgress = 1;
    return;
  }
  const raw = clamp(
    (storyWU - segment.startWU) / Math.max(TIME_EPSILON, segment.durationWU),
    0,
    1,
  );
  target.rawProgress = raw;
  if (segment.transition.type === 'step-end') {
    target.easedProgress = raw;
    target.visualProgress = 0;
    target.transitionProgress = 0;
    return;
  }
  target.easedProgress = applyAboutNarrativeTrackEasing(segment.transition.easing, raw);
  target.visualProgress = applyAboutNarrativeWorldTransitionEasing(
    segment.transition.easing,
    raw,
  );
  target.transitionProgress = target.visualProgress;
}

export function sampleAboutNarrativePointFieldRuntimeInto(
  plan,
  storyWU,
  target,
  options = EMPTY_SAMPLE_OPTIONS,
) {
  if (!plan?.valid) return null;
  if (!target?._aboutNarrativePointFieldFrame
    || !Array.isArray(target.interactions?.activeClipIds)
    || !target.world?.transition?.stagger) {
    throw new TypeError('sampleAboutNarrativePointFieldRuntimeInto requires a frame from createAboutNarrativePointFieldFrameSample().');
  }
  const clampedStoryWU = clamp(Number(storyWU) || 0, 0, plan.durationWU);
  const final = clampedStoryWU >= plan.durationWU;
  const keyIndex = final ? plan.keys.length - 1 : findActiveKeyIndex(plan.keys, clampedStoryWU);
  const segment = final ? null : plan.segments[keyIndex] || null;
  const fromKey = segment?.fromKey || plan.keys[keyIndex] || plan.keys.at(-1);
  const toKey = segment?.toKey || fromKey;

  target.storyWU = clampedStoryWU;
  target.ambientTime = plan.reducedMotion || options.liveAmbient === false
    ? 0
    : Number(options.ambientSeconds) || 0;
  target.durationWU = plan.durationWU;
  target.layoutProfile = plan.layoutProfile;
  target.reducedMotion = plan.reducedMotion;
  target.world.from = fromKey?.rendererState || null;
  target.world.to = toKey?.rendererState || target.world.from;
  target.world.fromOccurrenceId = fromKey?.occurrenceId || '';
  target.world.toOccurrenceId = toKey?.occurrenceId || target.world.fromOccurrenceId;
  target.world.segmentId = segment?.id || '';
  writeProgress(target.world, segment, clampedStoryWU, plan.reducedMotion);
  writeTransition(target.world.transition, segment);

  collectInteractionIds(
    target.interactions.activeClipIds,
    plan.interactions,
    clampedStoryWU,
    plan.durationWU,
    false,
  );
  collectInteractionIds(
    target.interactions.activatedClipIds,
    plan.interactions,
    clampedStoryWU,
    plan.durationWU,
    true,
  );
  target.interactions.activeInteraction = null;
  target.interactions.interactionActivated = false;
  for (const clip of plan.interactions) {
    if (!isActiveAt(clip, clampedStoryWU, plan.durationWU)) continue;
    if (clip.targetStateId !== toKey?.stateId) continue;
    target.interactions.activeInteraction = clip;
    target.interactions.interactionActivated = clampedStoryWU >= Number(clip.activationWU);
    break;
  }
  return target;
}

export function sampleAboutNarrativePointFieldRuntime(
  plan,
  storyWU,
  options = EMPTY_SAMPLE_OPTIONS,
) {
  return sampleAboutNarrativePointFieldRuntimeInto(
    plan,
    storyWU,
    createAboutNarrativePointFieldFrameSample(),
    options,
  );
}
