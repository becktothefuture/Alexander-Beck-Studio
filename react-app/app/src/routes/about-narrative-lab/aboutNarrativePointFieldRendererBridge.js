import {
  compileAboutNarrativePointFieldRuntime,
  createAboutNarrativePointFieldFrameSample,
  sampleAboutNarrativePointFieldRuntimeInto,
} from './aboutNarrativePointFieldRuntime.js';
import {
  applyAboutNarrativePointFieldOverrides,
  projectAboutNarrativePointFieldDocumentToVersion5,
} from './aboutNarrativePointFieldSchema.js';
import {
  createAboutNarrativePointFieldPreparationDescriptor,
} from './aboutNarrativePointFieldIdentity.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS,
} from './aboutNarrativePointFieldMotion.js';
import {
  isAboutNarrativeShortLandscape,
} from './aboutNarrativeMotionMath.js';
import {
  compileAboutNarrativeRuntimePlan,
  createAboutNarrativeRuntimeFrameSample,
  getAboutNarrativeRuntimePreparationRequest,
  sampleAboutNarrativeRuntimePlanInto,
} from './aboutNarrativeRuntimePlan.js';

const POINT_FIELD_SCHEMA_VERSION = 6;
const TIME_EPSILON = 0.000001;
const EMPTY_OPTIONS = Object.freeze({});

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

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

function rendererTransitionType(type) {
  return type === 'step-end' ? 'cut' : type || 'hold';
}

function preparationVariant(layoutProfile, options) {
  if (layoutProfile === 'desktop') return 'standard';
  return isAboutNarrativeShortLandscape({
    layoutProfile,
    width: options.inlineSize,
    height: options.blockSize,
  }) ? 'mobile-short-landscape' : 'mobile-default';
}

function createRendererWorlds(pointPlan) {
  return pointPlan.rendererStates.map((state, index) => {
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

function createRendererPreparationDescriptor(pointPlan, pointField, basePlan, options) {
  const variant = preparationVariant(basePlan.layoutProfile, options);
  const identity = createAboutNarrativePointFieldPreparationDescriptor({
    pointField,
    pointProfile: basePlan.pointProfile,
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
    descriptor: {
      inputFingerprint: identity.preparationFingerprint,
      preparationFingerprint: identity.preparationFingerprint,
      profile: basePlan.pointProfile,
      preparationVariant: variant,
      globals: pointPlan.globals,
      worldRail: pointPlan.globals.worldRail,
      worlds,
      runtimeWorlds: worlds,
      pairs,
      pointFieldPreparation: identity,
    },
    worlds,
  });
}

function createInteractionAdapters(pointPlan) {
  return pointPlan.interactions.map((clip) => deepFreeze({
    ...clip,
    targetWorldId: clip.targetStateId,
  }));
}

function compileDisciplineReveal(interactions, fallback) {
  const clip = interactions.find((item) => item.type === 'discipline-reveal');
  if (!clip) return fallback;
  const parameters = clip.parameters;
  const effectStartWU = Number(clip.startWU);
  const startWU = Number(clip.activationWU);
  const endWU = Number(clip.endWU);
  const backgroundFadeWU = Number(parameters.backgroundFadeWU);
  return deepFreeze({
    id: clip.id,
    startWU,
    focusWU: startWU + ((endWU - startWU) * 0.5),
    endWU,
    effectStartWU,
    effectEndWU: endWU,
    backgroundFadeWU,
    backgroundFadeEndWU: effectStartWU + backgroundFadeWU,
    backgroundOpacity: Number(parameters.backgroundOpacity),
    reconnectOpacity: Number(parameters.reconnectOpacity),
    pointScale: Number(parameters.pointScale),
    restoreDurationWU: Number(parameters.restoreDurationWU),
    labelOffsetPx: Number(parameters.labelOffsetPx),
    labelScale: Number(parameters.labelScale ?? 1),
    items: parameters.items,
    sourceType: 'motion',
    source: clip,
    motion: clip,
  });
}

export function compileAboutNarrativeRendererRuntimePlan(input, options = EMPTY_OPTIONS) {
  if (Number(input?.schemaVersion) !== POINT_FIELD_SCHEMA_VERSION) {
    return compileAboutNarrativeRuntimePlan(input, options);
  }
  const projected = projectAboutNarrativePointFieldDocumentToVersion5(input);
  projected.tracks.interactions.clips = [];
  Object.values(projected.profiles).forEach((profile) => {
    if (profile?.overrides) profile.overrides.interactions = {};
  });
  const basePlan = compileAboutNarrativeRuntimePlan(projected, options);
  if (!basePlan.valid) return basePlan;
  const pointPlan = compileAboutNarrativePointFieldRuntime(input, {
    ...options,
    layoutProfile: basePlan.layoutProfile,
    motionProfile: basePlan.motionProfile,
  });
  if (!pointPlan.valid) return pointPlan;
  const pointField = applyAboutNarrativePointFieldOverrides(
    pointPlan.model.tracks.pointField,
    pointPlan.model.profiles[pointPlan.layoutProfile].overrides.pointField,
  );
  const preparation = createRendererPreparationDescriptor(
    pointPlan,
    pointField,
    basePlan,
    options,
  );
  const interactionClips = createInteractionAdapters(pointPlan);
  return deepFreeze({
    ...basePlan,
    sourceSchemaVersion: POINT_FIELD_SCHEMA_VERSION,
    pointFieldPlan: pointPlan,
    pointField,
    basePlan,
    worlds: preparation.worlds,
    interactionClips,
    worldSequenceKey: preparation.sequenceKey,
    worldPreparationDescriptor: preparation.descriptor,
    disciplineReveal: compileDisciplineReveal(interactionClips, basePlan.disciplineReveal),
  });
}

function prepareBridgeFrame(frame) {
  frame.sourceSchemaVersion = 5;
  frame.world.parametricMotion = false;
  frame.world.segmentId = '';
  frame.world.fromOccurrenceId = '';
  frame.world.toOccurrenceId = '';
  frame.world.rawProgress = frame.world.transitionProgress;
  frame.world.easedProgress = frame.world.transitionProgress;
  frame.world.visualProgress = frame.world.transitionProgress;
  const defaults = ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS;
  frame.world.transition.stagger.mode = defaults.stagger.mode;
  frame.world.transition.stagger.amount = defaults.stagger.amount;
  frame.world.transition.stagger.axis = defaults.stagger.axis;
  frame.world.transition.stagger.seed = defaults.stagger.seed;
  frame.world.transition.path.mode = defaults.path.mode;
  frame.world.transition.path.amount = defaults.path.amount;
  frame.world.transition.path.axis = defaults.path.axis;
  frame.world.transition.path.frequency = defaults.path.frequency;
  frame.world.transition.path.seed = defaults.path.seed;
  frame.world.transition.flatten.mode = defaults.flatten.mode;
  frame.world.transition.flatten.amount = defaults.flatten.amount;
  frame.world.transition.flatten.axis = defaults.flatten.axis;
  frame.world.transition.flatten.offset = defaults.flatten.offset;
}

export function createAboutNarrativeRendererFrameSample() {
  const frame = createAboutNarrativeRuntimeFrameSample();
  frame.world.parametricMotion = false;
  frame.world.segmentId = '';
  frame.world.fromOccurrenceId = '';
  frame.world.toOccurrenceId = '';
  frame.world.rawProgress = 1;
  frame.world.easedProgress = 1;
  frame.world.visualProgress = 1;
  frame.world.transition.stagger = { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.stagger };
  frame.world.transition.path = { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.path };
  frame.world.transition.flatten = { ...ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.flatten };
  Object.defineProperty(frame, '_pointFieldFrame', {
    value: createAboutNarrativePointFieldFrameSample(),
  });
  return frame;
}

function writeMotionEnvelope(target, source) {
  target.mode = source.mode;
  target.amount = source.amount;
  if (Object.hasOwn(target, 'axis')) target.axis = source.axis;
  if (Object.hasOwn(target, 'seed')) target.seed = source.seed;
  if (Object.hasOwn(target, 'frequency')) target.frequency = source.frequency;
  if (Object.hasOwn(target, 'offset')) target.offset = source.offset;
}

function isActiveAt(clip, storyWU, durationWU) {
  if (storyWU < Number(clip.startWU)) return false;
  if (storyWU < Number(clip.endWU)) return true;
  return Math.abs(storyWU - durationWU) <= TIME_EPSILON
    && Math.abs(Number(clip.endWU) - durationWU) <= TIME_EPSILON;
}

function interactionEffectWeight(clip, storyWU, reducedMotion) {
  if (!clip || reducedMotion || clip.type !== 'grid-ripple') return 0;
  const startWU = Number(clip.startWU);
  const activationWU = Number(clip.activationWU);
  const endWU = Number(clip.endWU);
  const releaseWU = Math.max(0, Number(clip.parameters?.releaseWU) || 0);
  const smooth = (value, start, end) => {
    const progress = clamp01((value - start) / Math.max(TIME_EPSILON, end - start));
    return progress * progress * (3 - (2 * progress));
  };
  const attack = activationWU <= startWU ? 1 : smooth(storyWU, startWU, activationWU);
  const releaseStartWU = Math.max(activationWU, endWU - releaseWU);
  const release = releaseWU <= TIME_EPSILON ? 1 : 1 - smooth(storyWU, releaseStartWU, endWU);
  return clamp01(attack * release);
}

function writeV6Interactions(plan, pointFrame, frame) {
  frame.interactions.activeClipIds.length = 0;
  frame.interactions.activatedClipIds.length = 0;
  for (let index = 0; index < pointFrame.interactions.activeClipIds.length; index += 1) {
    frame.interactions.activeClipIds.push(pointFrame.interactions.activeClipIds[index]);
  }
  for (let index = 0; index < pointFrame.interactions.activatedClipIds.length; index += 1) {
    frame.interactions.activatedClipIds.push(pointFrame.interactions.activatedClipIds[index]);
  }
  frame.interactions.activeInteraction = null;
  frame.interactions.interactionActivated = false;
  frame.interactions.effectWeight = 0;
  const fromStateId = pointFrame.world.from?.stateId;
  const toStateId = pointFrame.world.to?.stateId;
  for (let index = 0; index < plan.interactionClips.length; index += 1) {
    const clip = plan.interactionClips[index];
    if (!isActiveAt(clip, frame.storyWU, frame.durationWU)) continue;
    if (clip.targetStateId !== fromStateId && clip.targetStateId !== toStateId) continue;
    frame.interactions.activeInteraction = clip;
    frame.interactions.interactionActivated = frame.storyWU >= Number(clip.activationWU);
    frame.interactions.effectWeight = interactionEffectWeight(
      clip,
      frame.storyWU,
      frame.reducedMotion,
    );
    break;
  }
}

function smoothRange(value, start, end) {
  const progress = clamp01((value - start) / Math.max(TIME_EPSILON, end - start));
  return progress * progress * (3 - (2 * progress));
}

function writeV6DisciplineReveal(frame, config) {
  const target = frame._disciplineReveal;
  if (!config || !target) {
    frame.disciplineReveal = null;
    return;
  }
  frame.disciplineReveal = target;
  target.id = config.id;
  target.config = config;
  target.storyWU = frame.storyWU;
  target.startWU = config.startWU;
  target.endWU = config.endWU;
  target.backgroundFadeWU = config.backgroundFadeWU;
  target.restoreDurationWU = config.restoreDurationWU;
  target.active = frame.storyWU >= config.effectStartWU && frame.storyWU < config.effectEndWU;
  target.backgroundProgress = !target.active
    ? 0
    : frame.reducedMotion
      ? 1
      : smoothRange(frame.storyWU, config.effectStartWU, config.backgroundFadeEndWU);
  const restoreStartWU = Math.max(
    config.startWU,
    config.effectEndWU - Math.max(0, config.restoreDurationWU),
  );
  target.restoreProgress = frame.reducedMotion
    ? 0
    : smoothRange(frame.storyWU, restoreStartWU, config.effectEndWU);
}

export function sampleAboutNarrativeRendererRuntimePlanInto(
  plan,
  storyWU,
  target,
  options = EMPTY_OPTIONS,
) {
  if (plan?.sourceSchemaVersion !== POINT_FIELD_SCHEMA_VERSION) {
    const frame = sampleAboutNarrativeRuntimePlanInto(plan, storyWU, target, options);
    if (frame) prepareBridgeFrame(frame);
    return frame;
  }
  const frame = sampleAboutNarrativeRuntimePlanInto(
    plan.basePlan,
    storyWU,
    target,
    options,
  );
  const pointFrame = sampleAboutNarrativePointFieldRuntimeInto(
    plan.pointFieldPlan,
    storyWU,
    target._pointFieldFrame,
    options,
  );
  if (!frame || !pointFrame) return null;
  const fromWorld = findById(plan.worlds, pointFrame.world.from?.stateId, 'stateId');
  const toWorld = findById(plan.worlds, pointFrame.world.to?.stateId, 'stateId') || fromWorld;
  const segment = findById(plan.pointFieldPlan.segments, pointFrame.world.segmentId);
  frame.sourceSchemaVersion = POINT_FIELD_SCHEMA_VERSION;
  frame.world.parametricMotion = true;
  frame.world.from = fromWorld;
  frame.world.to = toWorld;
  frame.world.sequence = plan.worlds;
  frame.world.sequenceKey = plan.worldSequenceKey;
  frame.world.preparationDescriptor = plan.worldPreparationDescriptor;
  frame.world.segmentId = pointFrame.world.segmentId;
  frame.world.fromOccurrenceId = pointFrame.world.fromOccurrenceId;
  frame.world.toOccurrenceId = pointFrame.world.toOccurrenceId;
  frame.world.rawProgress = pointFrame.world.rawProgress;
  frame.world.easedProgress = pointFrame.world.easedProgress;
  frame.world.visualProgress = pointFrame.world.visualProgress;
  frame.world.transitionProgress = pointFrame.world.visualProgress;
  frame.world.transition.startWU = segment?.startWU ?? frame.storyWU;
  frame.world.transition.endWU = segment?.endWU ?? frame.storyWU;
  frame.world.transition.type = rendererTransitionType(pointFrame.world.transition.type);
  frame.world.transition.easing = pointFrame.world.transition.easing;
  frame.world.transition.correspondence = pointFrame.world.transition.correspondence;
  writeMotionEnvelope(frame.world.transition.stagger, pointFrame.world.transition.stagger);
  writeMotionEnvelope(frame.world.transition.path, pointFrame.world.transition.path);
  writeMotionEnvelope(frame.world.transition.flatten, pointFrame.world.transition.flatten);
  writeV6Interactions(plan, pointFrame, frame);
  writeV6DisciplineReveal(frame, plan.disciplineReveal);
  return frame;
}

export function getAboutNarrativeRendererPreparationRequest(plan, storyWU) {
  if (plan?.sourceSchemaVersion !== POINT_FIELD_SCHEMA_VERSION) {
    return getAboutNarrativeRuntimePreparationRequest(plan, storyWU);
  }
  if (!plan.valid || !plan.worlds.length || !plan.worldPreparationDescriptor) return null;
  const clampedStoryWU = Math.max(0, Math.min(plan.durationWU, Number(storyWU) || 0));
  const keyIndex = findActiveKeyIndex(plan.pointFieldPlan.keys, clampedStoryWU);
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

export function resolveAboutNarrativePointFieldSeededPhase(pointSeed, motionSeed) {
  let value = ((Math.floor(clamp01(pointSeed) * 0xffffffff) >>> 0)
    ^ (Number(motionSeed) >>> 0)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

export function writeAboutNarrativePointFieldSeedPhases(
  pointSeeds,
  staggerSeed,
  pathSeed,
  phases,
) {
  for (let index = 0; index < pointSeeds.length; index += 1) {
    const offset = index * 2;
    phases[offset] = resolveAboutNarrativePointFieldSeededPhase(
      pointSeeds[index],
      staggerSeed,
    );
    phases[offset + 1] = resolveAboutNarrativePointFieldSeededPhase(
      pointSeeds[index],
      pathSeed,
    );
  }
}

export function writeAboutNarrativePointFieldSpatialPhases(
  positions,
  phases,
) {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (let offset = 0; offset < positions.length; offset += 3) {
    const x = positions[offset];
    const y = positions[offset + 1];
    const z = positions[offset + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }
  const centerX = (minX + maxX) * 0.5;
  const centerZ = (minZ + maxZ) * 0.5;
  let maxRadius = TIME_EPSILON;
  for (let offset = 0; offset < positions.length; offset += 3) {
    maxRadius = Math.max(
      maxRadius,
      Math.hypot(positions[offset] - centerX, positions[offset + 2] - centerZ),
    );
  }
  const rangeX = Math.max(TIME_EPSILON, maxX - minX);
  const rangeY = Math.max(TIME_EPSILON, maxY - minY);
  const rangeZ = Math.max(TIME_EPSILON, maxZ - minZ);
  for (let index = 0, offset = 0; offset < positions.length; index += 1, offset += 3) {
    const phaseOffset = index * 4;
    phases[phaseOffset] = clamp01(
      Math.hypot(positions[offset] - centerX, positions[offset + 2] - centerZ) / maxRadius,
    );
    phases[phaseOffset + 1] = clamp01((positions[offset] - minX) / rangeX);
    phases[phaseOffset + 2] = clamp01((positions[offset + 1] - minY) / rangeY);
    phases[phaseOffset + 3] = clamp01((positions[offset + 2] - minZ) / rangeZ);
  }
}

export function applyAboutNarrativePointFieldMotionToPosition(position, motion) {
  position.x += motion.pathOffset[0];
  position.y += motion.pathOffset[1];
  position.z += motion.pathOffset[2];
  const planeWeight = clamp01(Math.abs(Number(motion.planeOffset) || 0) * 4);
  if (planeWeight <= 0) return position;
  const axis = motion.planeAxis === 'x' || motion.planeAxis === 'z'
    ? motion.planeAxis
    : 'y';
  position[axis] += (Number(motion.planePosition) - position[axis]) * planeWeight;
  return position;
}
