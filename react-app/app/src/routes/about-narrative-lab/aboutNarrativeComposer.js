import {
  compileAboutNarrativeCameraMotion,
  sampleAboutNarrativeCameraMotionInto,
} from './aboutNarrativeCameraMotion.js';
import {
  createAboutNarrativePointFieldPreparationDescriptor,
} from './aboutNarrativePointFieldIdentity.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS,
} from './aboutNarrativePointFieldMotion.js';
import {
  compileAboutNarrativePointFieldRuntime,
  createAboutNarrativePointFieldFrameSample,
  sampleAboutNarrativePointFieldRuntimeInto,
} from './aboutNarrativePointFieldRuntime.js';
import {
  applyAboutNarrativePointFieldOverrides,
} from './aboutNarrativePointFieldSchema.js';
import {
  applyAboutNarrativeTrackEasing,
  isAboutNarrativeShortLandscape,
} from './aboutNarrativeMotionMath.js';
import {
  createAboutNarrativeProfileResolver,
  resolveAboutNarrativePointProfile,
} from './aboutNarrativeProfileResolver.js';
import { compileAboutNarrativeRenderSpans } from './aboutNarrativeRenderSpans.js';
import {
  compileAboutNarrativeStoryLayout,
  materializeAboutNarrativeStoryLayout,
} from './aboutNarrativeStoryLayout.js';
import { compileAboutNarrativeJourneyMap } from './aboutNarrativeJourneyMap.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from './aboutNarrativeRuntimePlan.js';
import {
  getAboutNarrativeEditorialFocusOpacity,
  getAboutNarrativeEditorialPhraseOpacity,
  getAboutNarrativeSharedRevealProgress,
} from './aboutNarrativeReveal.js';

const TIME_EPSILON = 0.000001;
const EMPTY_OPTIONS = Object.freeze({});
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const smooth01 = (value) => {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
};

export function getAboutNarrativeComposerOpeningCueOpacity(scrollTop, viewportHeight) {
  const resolvedViewportHeight = Math.max(0, Number(viewportHeight) || 0);
  const fadeDistance = Math.min(72, Math.max(48, resolvedViewportHeight * 0.08));
  return 1 - smooth01((Number(scrollTop) || 0) / fadeDistance);
}

export function getAboutNarrativeComposerEditorialReveal(
  record,
  scrollWU,
  viewportHeight,
  viewportThreshold,
  reducedMotion,
) {
  const viewportY = getAboutNarrativeComposerEditorialViewportY(
    record,
    scrollWU,
    viewportHeight,
    viewportThreshold,
  );
  const revealTravel = Math.max(0.001, Number(record.editorialMotion?.fadeDurationWU) || 0);
  const revealSoftnessWU = Math.max(
    0.001,
    Number(record.revealSoftnessPx || 0) / Math.max(1, viewportHeight),
  );
  const completionViewportY = Number(viewportThreshold) - revealTravel;
  return getAboutNarrativeSharedRevealProgress(
    viewportY,
    completionViewportY + revealSoftnessWU,
    revealSoftnessWU,
    reducedMotion,
  );
}

export function getAboutNarrativeComposerEditorialViewportY(
  record,
  scrollWU,
  viewportHeight,
  viewportThreshold,
) {
  const revealOffsetWU = Number(record.revealOffsetPx || 0) / Math.max(1, viewportHeight);
  return Number(viewportThreshold)
    + revealOffsetWU
    - (Number(scrollWU) - Number(record.startScrollWU));
}

export function getAboutNarrativeComposerEditorialFocusOpacity(...args) {
  return getAboutNarrativeEditorialFocusOpacity(...args);
}

export function getAboutNarrativeComposerEditorialPhraseOpacity(...args) {
  return getAboutNarrativeEditorialPhraseOpacity(...args);
}

export function createAboutNarrativeComposerTitleSample() {
  return createAboutNarrativeTitleFieldSample();
}

export function sampleAboutNarrativeComposerTitleInto(field, storyWU, textMotion, reducedMotion, target) {
  return sampleAboutNarrativeTitleFieldInto(field, storyWU, textMotion, reducedMotion, target);
}

export function createAboutNarrativeComposerContextSample() {
  return {
    visible: false,
    titleOpacity: 0,
    ruleScale: 0,
    descriptionOpacity: 0,
    actionOpacity: 0,
    y: 0,
    elapsedMs: 0,
    previousTimeMs: null,
    complete: false,
  };
}

export const ABOUT_NARRATIVE_ARRIVAL_DURATION_MS = 900;
export const ABOUT_NARRATIVE_FINALE_PHASES = Object.freeze({
  title: Object.freeze({ start: 0, end: 220 }),
  rule: Object.freeze({ start: 100, end: 360 }),
  description: Object.freeze({ start: 180, end: 600 }),
  actions: Object.freeze({ start: 260, end: ABOUT_NARRATIVE_ARRIVAL_DURATION_MS }),
});

function sampleFinalePhase(elapsedMs, phase) {
  return smooth01((elapsedMs - phase.start) / (phase.end - phase.start));
}

export function sampleAboutNarrativeComposerContextInto(
  field, storyWU, reducedMotion, target, options = EMPTY_OPTIONS,
) {
  const wasVisible = target.visible;
  target.visible = storyWU >= Number(field.startWU)
    && storyWU <= Number(field.endWU) + TIME_EPSILON;
  const nowMs = Math.max(0, Number(options.timestampMs) || 0);
  const immediate = reducedMotion || storyWU >= Number(field.endWU) - 0.001;
  if (!target.visible) target.elapsedMs = 0;
  else if (immediate) target.elapsedMs = ABOUT_NARRATIVE_ARRIVAL_DURATION_MS;
  else if (wasVisible && options.visible !== false && target.previousTimeMs != null) {
    target.elapsedMs = Math.min(
      ABOUT_NARRATIVE_ARRIVAL_DURATION_MS,
      target.elapsedMs + Math.max(0, nowMs - target.previousTimeMs),
    );
  }
  // Arrival stays usable at a partial scroll stop without an early camera lock.
  // This clock belongs to the existing timeline, not scroll progress. Keeping
  // it in the reusable sample also preserves arrival through DOM remeasurement.
  target.previousTimeMs = target.visible && options.visible !== false ? nowMs : null;
  target.complete = target.visible && target.elapsedMs >= ABOUT_NARRATIVE_ARRIVAL_DURATION_MS;
  target.titleOpacity = sampleFinalePhase(target.elapsedMs, ABOUT_NARRATIVE_FINALE_PHASES.title);
  target.ruleScale = sampleFinalePhase(target.elapsedMs, ABOUT_NARRATIVE_FINALE_PHASES.rule);
  target.descriptionOpacity = sampleFinalePhase(target.elapsedMs, ABOUT_NARRATIVE_FINALE_PHASES.description);
  target.actionOpacity = sampleFinalePhase(target.elapsedMs, ABOUT_NARRATIVE_FINALE_PHASES.actions);
  // The complete invitation is composed at its final position from its first frame.
  target.y = 0;
  return target;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function findById(items, id, key = 'id') {
  for (let index = 0; index < items.length; index += 1) {
    if (items[index]?.[key] === id) return items[index];
  }
  return null;
}

function mergeLane(keys, overrides = {}) {
  return keys.map((key) => ({ ...clone(key), ...clone(overrides[key.id] || {}) }))
    .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left.id.localeCompare(right.id));
}

function findKeyIndex(keys, storyWU) {
  let low = 0;
  let high = keys.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (Number(keys[middle].atWU) <= storyWU) {
      result = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return result;
}

function createProfileResolver(model, options) {
  return createAboutNarrativeProfileResolver({
    profiles: model.profiles,
    inlineSize: options.inlineSize,
    blockSize: options.blockSize,
    previewLayoutProfile: options.layoutProfile ?? options.previewLayoutProfile,
    prefersReducedMotion: options.prefersReducedMotion,
    previewMotionProfile: options.motionProfile ?? options.previewMotionProfile,
    previewReducedMotion: options.previewReducedMotion,
  });
}

function resolveLane(model, resolver, lane) {
  const overrides = model.profiles[resolver.layoutProfile]?.overrides?.[lane] || {};
  return mergeLane(model.tracks[lane].keys, overrides);
}

function resolveTextFields(model, resolver) {
  const overrides = model.profiles[resolver.layoutProfile]?.overrides?.text || {};
  return model.tracks.text.fields
    .map((field) => ({ ...clone(field), ...clone(overrides[field.id] || {}) }))
    .sort((left, right) => (
      Number(left.startWU) - Number(right.startWU)
      || Number(left.focusWU) - Number(right.focusWU)
      || left.id.localeCompare(right.id)
    ));
}

function rendererTransitionType(type) {
  return type === 'step-end' ? 'cut' : type || 'hold';
}

function createRendererWorlds(pointPlan) {
  const stateById = new Map(pointPlan.rendererStates.map((state) => [state.stateId, state]));
  const seenStateIds = new Set();
  const orderedStates = [];
  pointPlan.keys.forEach((key) => {
    const state = key.rendererState || stateById.get(key.stateId);
    if (!state || seenStateIds.has(state.stateId)) return;
    seenStateIds.add(state.stateId);
    orderedStates.push(state);
  });
  return orderedStates.map((state, index) => {
    const incoming = pointPlan.segments.find((segment) => (
      segment.toStateId === state.stateId
      && segment.fromStateId !== segment.toStateId
    ));
    return deepFreeze({
      ...state,
      startWU: incoming?.startWU ?? pointPlan.keys[0]?.atWU ?? 0,
      transitionIn: {
        startWU: incoming?.startWU ?? 0,
        endWU: incoming?.endWU ?? 0,
        type: index === 0 ? 'cut' : rendererTransitionType(incoming?.transition.type),
        easing: incoming?.transition.easing || 'linear',
        correspondence: incoming?.transition.correspondence || 'index-v1',
      },
    });
  });
}

function preparationVariant(layoutProfile, options) {
  if (layoutProfile === 'desktop') return 'standard';
  return isAboutNarrativeShortLandscape({
    layoutProfile,
    width: options.inlineSize,
    height: options.blockSize,
  }) ? 'mobile-short-landscape' : 'mobile-default';
}

function createRendererPreparation(pointPlan, pointField, pointProfile, options) {
  const variant = preparationVariant(pointPlan.layoutProfile, options);
  const identity = createAboutNarrativePointFieldPreparationDescriptor({
    pointField,
    pointProfile,
    preparationVariant: variant,
    globals: pointPlan.globals,
  });
  const worlds = createRendererWorlds(pointPlan);
  const geometryByStateId = new Map(identity.stateReferences.map((reference) => [
    reference.stateId,
    reference.geometryFingerprint,
  ]));
  const correspondenceByOccurrenceId = new Map(identity.correspondences.map((record) => [
    record.occurrenceId,
    record,
  ]));
  const pairs = worlds.map((world, index) => {
    const fromWorld = worlds[Math.max(0, index - 1)];
    const incoming = pointPlan.segments.find((segment) => (
      segment.toStateId === world.stateId
      && segment.fromStateId !== segment.toStateId
    ));
    const correspondence = correspondenceByOccurrenceId.get(incoming?.occurrenceId);
    return deepFreeze({
      fromWorldId: fromWorld.id,
      toWorldId: world.id,
      inputFingerprint: correspondence?.inputFingerprint
        || geometryByStateId.get(world.stateId)
        || identity.preparationFingerprint,
      occurrenceId: incoming?.occurrenceId || pointPlan.keys[0]?.occurrenceId || world.id,
    });
  });
  return deepFreeze({
    sequenceKey: identity.preparationFingerprint,
    worlds,
    descriptor: {
      inputFingerprint: identity.preparationFingerprint,
      preparationFingerprint: identity.preparationFingerprint,
      profile: pointProfile,
      preparationVariant: variant,
      globals: pointPlan.globals,
      worldRail: pointPlan.globals.worldRail,
      worlds,
      runtimeWorlds: worlds,
      pairs,
      pointFieldPreparation: identity,
    },
  });
}

function createInteractionAdapters(pointPlan) {
  return pointPlan.interactions
    .filter((clip) => clip.type !== 'state-effect')
    .map((clip) => deepFreeze({ ...clip, targetWorldId: clip.targetStateId }));
}

function invalidComposerPlan(pointPlan, diagnostics = []) {
  return deepFreeze({
    ...pointPlan,
    valid: false,
    diagnostics: [...(pointPlan?.diagnostics || []), ...diagnostics],
    directorVersion: 4,
    camera: { moveKeys: [], lookKeys: [], lensKeys: [] },
    visibilityKeys: [],
    worlds: [],
    textFields: [],
    interactionClips: [],
    effects: [],
    renderSpans: [],
    storyLayout: null,
    journeyMap: null,
  });
}

export function compileAboutNarrativeComposerPlan(input, options = EMPTY_OPTIONS) {
  let resolver;
  try {
    resolver = createProfileResolver(input, options);
  } catch (error) {
    return invalidComposerPlan(null, [{
      level: 'error',
      code: 'composer-profile',
      path: 'profiles',
      message: error.message,
    }]);
  }

  // The Story Stack is compiled before every motion system. It derives the
  // page length from ordered content and named gaps, then materializes the
  // numeric timing cache consumed by allocation-sensitive runtime samplers.
  const storyLayout = compileAboutNarrativeStoryLayout(input, {
    profileId: resolver.layoutProfile,
    measurements: options.storyLayoutMeasurements || options.contentPressure,
  });
  if (!storyLayout.valid) return invalidComposerPlan(null, storyLayout.diagnostics);
  const journeyMap = compileAboutNarrativeJourneyMap(storyLayout);
  const runtimeInput = materializeAboutNarrativeStoryLayout(input, storyLayout);
  try {
    resolver = createProfileResolver(runtimeInput, options);
  } catch (error) {
    return invalidComposerPlan(null, [{
      level: 'error',
      code: 'composer-story-profile',
      path: 'profiles',
      message: error.message,
    }]);
  }

  const pointPlan = compileAboutNarrativePointFieldRuntime(runtimeInput, {
    ...options,
    layoutProfile: resolver.layoutProfile,
    motionProfile: resolver.motionProfile,
  });
  if (!pointPlan.valid) return invalidComposerPlan(pointPlan);
  const model = pointPlan.model;
  const pointProfile = resolveAboutNarrativePointProfile(resolver.layoutProfile);
  const visibilityKeys = resolveLane(model, resolver, 'visibility');
  const textFields = resolveTextFields(model, resolver);
  const pointField = applyAboutNarrativePointFieldOverrides(
    model.tracks.pointField,
    model.profiles[resolver.layoutProfile].overrides.pointField,
  );
  let preparation;
  try {
    preparation = createRendererPreparation(pointPlan, pointField, pointProfile, options);
  } catch (error) {
    return invalidComposerPlan(pointPlan, [{
      level: 'error',
      code: 'composer-preparation',
      path: 'tracks.pointField',
      message: error.message,
    }]);
  }
  const camera = compileAboutNarrativeCameraMotion(
    model,
    resolver.layoutProfile,
    preparation.worlds,
    pointProfile,
    options,
  );
  const interactionClips = createInteractionAdapters(pointPlan);
  const effects = pointPlan.interactions.filter((clip) => clip.type === 'state-effect');
  const renderSpanPlan = compileAboutNarrativeRenderSpans({
    textFields,
    worlds: preparation.worlds,
  }, {
    profileId: resolver.layoutProfile,
    resolver,
    contentPressure: options.contentPressure,
  });
  const diagnostics = [
    ...storyLayout.diagnostics,
    ...journeyMap.diagnostics,
    ...pointPlan.diagnostics,
    ...renderSpanPlan.diagnostics,
  ];
  if (!renderSpanPlan.valid || diagnostics.some((item) => item.level === 'error')) {
    return invalidComposerPlan(pointPlan, diagnostics);
  }
  return deepFreeze({
    valid: true,
    diagnostics,
    directorVersion: 4,
    sourceSchemaVersion: Number(input.schemaVersion),
    model,
    resolver,
    profileId: resolver.layoutProfile,
    layoutProfile: resolver.layoutProfile,
    pointProfile,
    motionProfile: resolver.motionProfile,
    reducedMotion: resolver.motionProfile === 'reduced',
    durationWU: resolver.storyDurationWU,
    maxStoryWU: resolver.storyDurationWU,
    globals: model.globals,
    pointFieldPlan: pointPlan,
    pointField,
    camera,
    visibilityKeys,
    worlds: preparation.worlds,
    textFields,
    interactionClips,
    effects,
    renderSpans: renderSpanPlan.spans,
    storyLayout,
    journeyMap,
    worldSequenceKey: preparation.sequenceKey,
    worldPreparationDescriptor: preparation.descriptor,
  });
}

function createMotionEnvelopeSamples() {
  return {
    stagger: { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.stagger },
    path: { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.path },
    flatten: { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.flatten },
  };
}

export function createAboutNarrativeComposerFrameSample() {
  const motion = createMotionEnvelopeSamples();
  const frame = {
    globals: null,
    sourceSchemaVersion: 7,
    storyWU: 0,
    storyTime: 0,
    ambientTime: 0,
    deltaSeconds: 0,
    durationWU: 0,
    layoutProfile: 'desktop',
    pointProfile: 'desktop',
    reducedMotion: false,
    finaleOrbitWU: 0,
    journeyMap: null,
    camera: {
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      lookAtTarget: [0, 0, -1],
      lookAtRoll: 0,
      aimWeight: 0,
      targeted: false,
      fov: 48,
    },
    simulation: { visibility: 1 },
    world: {
      from: null,
      to: null,
      sequence: null,
      sequenceKey: '',
      preparationDescriptor: null,
      transitionProgress: 1,
      parametricMotion: true,
      segmentId: '',
      fromOccurrenceId: '',
      toOccurrenceId: '',
      rawProgress: 1,
      easedProgress: 1,
      visualProgress: 1,
      transition: {
        startWU: 0,
        endWU: 0,
        type: 'hold',
        easing: 'linear',
        correspondence: null,
        ...motion,
      },
    },
    text: {
      activeFieldIds: [],
    },
    interactions: {
      activeClipIds: [],
      activatedClipIds: [],
      activeInteraction: null,
      interactionActivated: false,
      effectWeight: 0,
      effectProgress: 0,
    },
    composerEffects: {
      active: [],
      progress: [],
      weight: [],
      elapsedWU: [],
    },
  };
  Object.defineProperties(frame, {
    _aboutNarrativeComposerFrame: { value: true },
    _pointFieldFrame: { value: createAboutNarrativePointFieldFrameSample() },
  });
  return frame;
}

function isActiveAt(clip, storyWU, durationWU) {
  if (storyWU < Number(clip.startWU)) return false;
  if (storyWU < Number(clip.endWU)) return true;
  return Math.abs(storyWU - durationWU) <= TIME_EPSILON
    && Math.abs(Number(clip.endWU) - durationWU) <= TIME_EPSILON;
}

function sampleVisibility(keys, storyWU, reducedMotion) {
  if (!keys.length) return 1;
  const fromIndex = findKeyIndex(keys, storyWU);
  const from = keys[fromIndex];
  const to = keys[Math.min(keys.length - 1, fromIndex + 1)];
  if (reducedMotion || from === to || storyWU <= Number(keys[0].atWU)) {
    return Number(storyWU <= Number(keys[0].atWU) ? keys[0].visibility : from.visibility);
  }
  const progress = applyAboutNarrativeTrackEasing(
    from.easing,
    (storyWU - Number(from.atWU)) / Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU)),
  );
  return Number(from.visibility)
    + ((Number(to.visibility) - Number(from.visibility)) * progress);
}

function copyIds(target, source) {
  target.length = 0;
  for (let index = 0; index < source.length; index += 1) target.push(source[index]);
}

function collectActiveText(target, textFields, storyWU, durationWU) {
  target.activeFieldIds.length = 0;
  for (let index = 0; index < textFields.length; index += 1) {
    const field = textFields[index];
    if (!isActiveAt(field, storyWU, durationWU)) continue;
    target.activeFieldIds.push(field.id);
  }
}

function smoothRange(value, start, end) {
  return smooth01((value - start) / Math.max(TIME_EPSILON, end - start));
}

function effectWeight(clip, storyWU, reducedMotion) {
  if (!clip || reducedMotion) return 0;
  const startWU = Number(clip.startWU);
  const activationWU = Number(clip.activationWU);
  const endWU = Number(clip.endWU);
  const releaseWU = Math.max(0, Number(clip.parameters?.releaseWU) || 0);
  // Every effect is one continuous attack, sustain, and release envelope.
  // Keeping that shape inside one clip prevents visible resets at handoffs.
  const attack = activationWU <= startWU ? 1 : smoothRange(storyWU, startWU, activationWU);
  const releaseStartWU = Math.max(activationWU, endWU - releaseWU);
  const release = releaseWU <= TIME_EPSILON
    ? 1
    : 1 - smoothRange(storyWU, releaseStartWU, endWU);
  return clamp01(attack * release);
}

function writeMotionEnvelope(target, source) {
  target.mode = source.mode;
  target.amount = source.amount;
  if (Object.hasOwn(target, 'axis')) target.axis = source.axis;
  if (Object.hasOwn(target, 'seed')) target.seed = source.seed;
  if (Object.hasOwn(target, 'frequency')) target.frequency = source.frequency;
  if (Object.hasOwn(target, 'offset')) target.offset = source.offset;
}

function sampleInteractions(plan, pointFrame, frame) {
  copyIds(frame.interactions.activeClipIds, pointFrame.interactions.activeClipIds);
  copyIds(frame.interactions.activatedClipIds, pointFrame.interactions.activatedClipIds);
  frame.interactions.activeInteraction = null;
  frame.interactions.interactionActivated = false;
  frame.interactions.effectWeight = 0;
  frame.interactions.effectProgress = 0;
  const toStateId = pointFrame.world.to?.stateId;
  for (let index = 0; index < plan.interactionClips.length; index += 1) {
    const clip = plan.interactionClips[index];
    if (!isActiveAt(clip, frame.storyWU, frame.durationWU)) continue;
    // The destination Form owns the active interval. Source-Form interactions
    // must not leak into the next morph merely because both geometries are
    // still present in the shader.
    if (clip.targetStateId !== toStateId) continue;
    frame.interactions.activeInteraction = clip;
    frame.interactions.interactionActivated = frame.storyWU >= Number(clip.activationWU);
    frame.interactions.effectWeight = effectWeight(clip, frame.storyWU, frame.reducedMotion);
    frame.interactions.effectProgress = frame.reducedMotion
      ? Number(frame.interactions.interactionActivated)
      : clamp01((frame.storyWU - Number(clip.activationWU))
        / Math.max(TIME_EPSILON, Number(clip.endWU) - Number(clip.activationWU)));
    break;
  }
}

function sampleComposerEffects(plan, pointFrame, frame) {
  const target = frame.composerEffects;
  target.active.length = 0;
  target.progress.length = 0;
  target.weight.length = 0;
  target.elapsedWU.length = 0;
  const owningStateId = pointFrame.world.to?.stateId;
  for (let index = 0; index < plan.effects.length; index += 1) {
    const clip = plan.effects[index];
    if (!isActiveAt(clip, frame.storyWU, frame.durationWU)) continue;
    // Compile-time validation guarantees containment. Keep this runtime guard
    // as the final seam so a stale preview can never compose adjacent Forms.
    if (clip.targetStateId !== owningStateId) continue;
    const elapsedWU = Math.max(0, frame.storyWU - Number(clip.activationWU));
    target.active.push(clip);
    target.progress.push(frame.reducedMotion
      ? Number(frame.storyWU >= Number(clip.activationWU))
      : clamp01(elapsedWU / Math.max(TIME_EPSILON, Number(clip.endWU) - Number(clip.activationWU))));
    target.weight.push(effectWeight(clip, frame.storyWU, frame.reducedMotion));
    target.elapsedWU.push(frame.reducedMotion ? 0 : elapsedWU);
  }
}

export function sampleAboutNarrativeComposerPlanInto(
  plan,
  storyWU,
  target,
  options = EMPTY_OPTIONS,
) {
  if (!plan?.valid) return null;
  if (!target?._aboutNarrativeComposerFrame || !target?._pointFieldFrame) {
    throw new TypeError('sampleAboutNarrativeComposerPlanInto requires a Composer frame sample.');
  }
  const clampedStoryWU = Math.max(0, Math.min(plan.durationWU, Number(storyWU) || 0));
  const pointFrame = sampleAboutNarrativePointFieldRuntimeInto(
    plan.pointFieldPlan,
    clampedStoryWU,
    target._pointFieldFrame,
    options,
  );
  if (!pointFrame) return null;
  const segment = findById(plan.pointFieldPlan.segments, pointFrame.world.segmentId);
  target.sourceSchemaVersion = plan.sourceSchemaVersion;
  target.globals = plan.globals;
  target.storyWU = clampedStoryWU;
  target.storyTime = clampedStoryWU;
  target.ambientTime = plan.reducedMotion ? 0 : Number(options.ambientSeconds) || 0;
  target.deltaSeconds = Math.max(0, Number(options.deltaSeconds) || 0);
  target.durationWU = plan.durationWU;
  target.layoutProfile = plan.layoutProfile;
  target.pointProfile = plan.pointProfile;
  target.reducedMotion = plan.reducedMotion;
  target.finaleOrbitWU = plan.reducedMotion ? 0 : Number(options.finaleOrbitWU) || 0;
  target.journeyMap = plan.journeyMap;
  // Reduced motion settles the complete destination composition at the start
  // of a morph. Sample the camera at the same semantic destination boundary so
  // geometry and viewpoint cut together instead of showing mismatched worlds.
  const cameraStoryWU = plan.reducedMotion
    && segment
    && segment.transition.type !== 'hold'
    ? segment.endWU
    : clampedStoryWU;
  sampleAboutNarrativeCameraMotionInto(
    plan.camera,
    cameraStoryWU,
    plan.reducedMotion,
    target.camera,
    { finaleOrbitWU: target.finaleOrbitWU },
  );
  target.simulation.visibility = sampleVisibility(
    plan.visibilityKeys,
    clampedStoryWU,
    plan.reducedMotion,
  );

  const sampledFromWorld = findById(plan.worlds, pointFrame.world.from?.stateId, 'stateId');
  const toWorld = findById(plan.worlds, pointFrame.world.to?.stateId, 'stateId') || sampledFromWorld;
  const settledPair = segment?.transition.type === 'hold'
    && pointFrame.world.from?.stateId === pointFrame.world.to?.stateId
    ? plan.worldPreparationDescriptor.pairs.find((pair) => pair.toWorldId === toWorld?.id)
    : null;
  const fromWorld = findById(plan.worlds, settledPair?.fromWorldId) || sampledFromWorld;
  target.world.from = fromWorld;
  target.world.to = toWorld;
  target.world.sequence = plan.worlds;
  target.world.sequenceKey = plan.worldSequenceKey;
  target.world.preparationDescriptor = plan.worldPreparationDescriptor;
  target.world.segmentId = pointFrame.world.segmentId;
  target.world.fromOccurrenceId = pointFrame.world.fromOccurrenceId;
  target.world.toOccurrenceId = pointFrame.world.toOccurrenceId;
  target.world.rawProgress = pointFrame.world.rawProgress;
  target.world.easedProgress = pointFrame.world.easedProgress;
  target.world.visualProgress = pointFrame.world.visualProgress;
  target.world.transitionProgress = pointFrame.world.visualProgress;
  target.world.transition.startWU = segment?.startWU ?? clampedStoryWU;
  target.world.transition.endWU = segment?.endWU ?? clampedStoryWU;
  target.world.transition.type = rendererTransitionType(pointFrame.world.transition.type);
  target.world.transition.easing = pointFrame.world.transition.easing;
  target.world.transition.correspondence = pointFrame.world.transition.correspondence;
  writeMotionEnvelope(target.world.transition.stagger, pointFrame.world.transition.stagger);
  writeMotionEnvelope(target.world.transition.path, pointFrame.world.transition.path);
  writeMotionEnvelope(target.world.transition.flatten, pointFrame.world.transition.flatten);

  collectActiveText(
    target.text,
    plan.textFields,
    clampedStoryWU,
    plan.durationWU,
  );
  sampleInteractions(plan, pointFrame, target);
  sampleComposerEffects(plan, pointFrame, target);
  return target;
}

export function getAboutNarrativeComposerPreparationRequest(plan, storyWU) {
  if (!plan?.valid || !plan.worlds.length || !plan.worldPreparationDescriptor) return null;
  const clampedStoryWU = Math.max(0, Math.min(plan.durationWU, Number(storyWU) || 0));
  const keyIndex = findKeyIndex(plan.pointFieldPlan.keys, clampedStoryWU);
  const key = plan.pointFieldPlan.keys[keyIndex];
  const targetStateId = clampedStoryWU >= plan.durationWU
    ? key?.stateId
    : plan.pointFieldPlan.segments[keyIndex]?.toStateId || key?.stateId;
  return key ? {
    sequenceKey: plan.worldSequenceKey,
    descriptor: plan.worldPreparationDescriptor,
    targetWorldId: targetStateId,
    targetOccurrenceId: key.occurrenceId,
  } : null;
}

export function getAboutNarrativeComposerCameraSample(
  plan,
  storyWU,
  target = null,
  options = EMPTY_OPTIONS,
) {
  const sample = target || {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    lookAtTarget: [0, 0, -1],
    lookAtRoll: 0,
    aimWeight: 0,
    targeted: false,
    fov: 48,
  };
  return sampleAboutNarrativeCameraMotionInto(
    plan.camera,
    Number(storyWU),
    plan.reducedMotion,
    sample,
    options,
  );
}
