import { cloneAboutNarrativeDocument } from './aboutNarrativeSchema.js';
import {
  normalizeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from './aboutNarrativeTrackSchema.js';
import {
  compileAboutNarrativeCameraKey,
  sampleAboutNarrativeCameraKeysInto,
} from './aboutNarrativeCameraSampling.js';
import {
  createAboutNarrativeProfileResolver,
  resolveAboutNarrativePointProfile,
} from './aboutNarrativeProfileResolver.js';
import { compileAboutNarrativeRenderSpans } from './aboutNarrativeRenderSpans.js';
import { createAboutNarrativeWorldPreparationDescriptor } from './aboutNarrativeSequenceIdentity.js';
import {
  applyAboutNarrativeTrackEasing,
  applyAboutNarrativeWorldTransitionEasing,
} from './aboutNarrativeMotionMath.js';

const EMPTY_SAMPLE_OPTIONS = Object.freeze({});
const TIME_EPSILON = 0.000001;

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function clone(value) {
  return cloneAboutNarrativeDocument(value);
}

function diagnostic(code, path, message, details = {}) {
  return { level: 'error', code, path, message, ...details };
}

function invalidPlan({
  diagnostics,
  model = null,
  layoutProfile = '',
  motionProfile = '',
} = {}) {
  return deepFreeze({
    valid: false,
    diagnostics: diagnostics || [],
    model,
    resolver: null,
    profileId: layoutProfile,
    layoutProfile,
    pointProfile: '',
    motionProfile,
    durationWU: 0,
    maxStoryWU: 0,
    cameraKeys: [],
    visibilityKeys: [],
    worlds: [],
    textFields: [],
    interactionClips: [],
    renderSpans: [],
    worldSequenceKey: '',
    worldPreparationDescriptor: null,
    disciplineReveal: null,
  });
}

function resolveTrackModel(input) {
  const candidate = clone(input);
  const diagnostics = validateAboutNarrativeTrackDocument(candidate);
  if (diagnostics.some((item) => item.level === 'error')) {
    return { valid: false, model: candidate, diagnostics };
  }
  return {
    valid: true,
    model: normalizeAboutNarrativeTrackDocument(candidate),
    diagnostics,
  };
}

function resolveProfiles(model, options) {
  const previewLayoutProfile = options.layoutProfile ?? options.previewLayoutProfile;
  const previewMotionProfile = options.motionProfile ?? options.previewMotionProfile;
  return createAboutNarrativeProfileResolver({
    profiles: model.profiles,
    inlineSize: options.inlineSize,
    blockSize: options.blockSize,
    previewLayoutProfile,
    prefersReducedMotion: options.prefersReducedMotion,
    previewMotionProfile,
    previewReducedMotion: options.previewReducedMotion,
  });
}

function mergeCameraKey(key, override = {}) {
  const hasTargetOverride = Object.hasOwn(override, 'lookAtTarget');
  const lookAtTarget = hasTargetOverride ? override.lookAtTarget : key.lookAtTarget;
  const aimEnabled = override.aimEnabled
    ?? (hasTargetOverride && Array.isArray(lookAtTarget) ? true : key.aimEnabled);
  return {
    ...key,
    ...override,
    aimEnabled,
    position: [...(override.position || key.position)],
    rotation: [...(override.rotation || key.rotation)],
    ...(lookAtTarget == null ? {} : { lookAtTarget: [...lookAtTarget] }),
    ...(lookAtTarget == null && hasTargetOverride ? { lookAtTarget: null } : {}),
  };
}

function mergeWorld(world, override = {}) {
  return {
    ...world,
    ...override,
    transform: {
      ...world.transform,
      ...(override.transform || {}),
      position: [...(override.transform?.position || world.transform.position)],
      rotation: [...(override.transform?.rotation || world.transform.rotation)],
    },
    transitionIn: {
      ...world.transitionIn,
      ...(override.transitionIn || {}),
    },
  };
}

function applyProfileOverrides(model, resolver) {
  const overrides = model.profiles[resolver.layoutProfile].overrides;
  const durationWU = resolver.storyDurationWU;
  const cameraKeys = model.tracks.camera.keys
    .map((key) => {
      const merged = mergeCameraKey(key, overrides.camera[key.id]);
      return compileAboutNarrativeCameraKey(merged);
    })
    .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id));
  const visibilityKeys = model.tracks.visibility.keys
    .map((key) => ({ ...key, ...(overrides.visibility[key.id] || {}) }))
    .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id));
  const authoredWorlds = model.tracks.worlds.objects
    .map((world) => mergeWorld(world, overrides.worlds[world.id]))
    .sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
  const worlds = authoredWorlds.map((world, index) => ({
    ...world,
    endWU: Number(authoredWorlds[index + 1]?.startWU ?? durationWU),
    anchorRailZ: Number(model.globals.worldRail.originZ)
      - (Number(world.anchorWU) * Number(model.globals.worldRail.unitsPerWU)),
  }));
  const textFields = model.tracks.text.fields
    .map((field) => ({ ...field, ...(overrides.text[field.id] || {}) }))
    .sort((left, right) => (
      left.startWU - right.startWU
      || left.focusWU - right.focusWU
      || left.id.localeCompare(right.id)
    ));
  const interactionClips = model.tracks.interactions.clips
    .map((clip) => ({ ...clip, ...(overrides.interactions[clip.id] || {}) }))
    .sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
  return { cameraKeys, visibilityKeys, worlds, textFields, interactionClips };
}

function compileLegacyDisciplineReveal(textFields) {
  const field = textFields.find((item) => item.kind === 'discipline-reveal');
  if (!field) return null;
  const choreography = field.choreography;
  const staggerWU = Number(choreography.staggerWU);
  const backgroundFadeWU = Number(choreography.backgroundFadeWU);
  const labelDurationWU = Number(choreography.labelDurationWU);
  const holdWU = Number(choreography.holdWU);
  const labelSequenceEndWU = Number(field.startWU)
    + (Math.max(0, choreography.items.length - 1) * staggerWU)
    + labelDurationWU
    + holdWU;
  return {
    id: field.id,
    startWU: Number(field.startWU),
    focusWU: Number(field.focusWU),
    endWU: Number(field.endWU),
    effectStartWU: Number(field.startWU),
    effectEndWU: Number(field.endWU),
    staggerWU,
    backgroundFadeWU,
    backgroundFadeEndWU: Number(field.startWU) + backgroundFadeWU,
    backgroundOpacity: Number(choreography.backgroundOpacity),
    reconnectOpacity: Number(choreography.reconnectOpacity),
    pointScale: Number(choreography.pointScale),
    restoreDurationWU: 0,
    labelOffsetPx: Number(choreography.labelOffsetPx),
    labelScale: Number(choreography.labelScale ?? 1),
    labelDurationWU,
    holdWU,
    labelSequenceEndWU,
    items: choreography.items,
    sourceType: 'legacy-text',
    source: field,
    field,
  };
}

function compileDisciplineReveal(textFields, interactionClips) {
  const clip = interactionClips.find((item) => item.type === 'discipline-reveal');
  if (!clip) return compileLegacyDisciplineReveal(textFields);
  const parameters = clip.parameters;
  const effectStartWU = Number(clip.startWU);
  const startWU = Number(clip.activationWU);
  const effectEndWU = Number(clip.endWU);
  const endWU = effectEndWU;
  const settleDurationWU = Number(parameters.settleDurationWU);
  const beatDurationWU = Number(parameters.beatDurationWU);
  const sequenceStartWU = effectStartWU + settleDurationWU;
  const sequenceEndWU = sequenceStartWU + (parameters.items.length * beatDurationWU);
  return {
    id: clip.id,
    startWU,
    focusWU: startWU + ((endWU - startWU) * 0.5),
    endWU,
    effectStartWU,
    effectEndWU,
    settleDurationWU,
    beatDurationWU,
    sequenceStartWU,
    sequenceEndWU,
    backgroundFadeWU: settleDurationWU,
    backgroundFadeEndWU: sequenceStartWU,
    backgroundOpacity: Number(parameters.backgroundOpacity),
    reconnectOpacity: 1,
    pointScale: Number(parameters.pointScale),
    restoreDurationWU: Number(parameters.restoreDurationWU),
    items: parameters.items,
    sourceType: 'motion',
    source: clip,
    motion: clip,
  };
}

/**
 * Compiles one validated schema-v5 document into the immutable sectionless
 * plan consumed by live playback. Legacy import belongs to persistence.
 */
export function compileAboutNarrativeRuntimePlan(input, options = {}) {
  const resolvedInput = resolveTrackModel(input);
  if (!resolvedInput.valid) {
    return invalidPlan({ diagnostics: resolvedInput.diagnostics, model: resolvedInput.model });
  }
  const model = resolvedInput.model;
  let resolver;
  try {
    resolver = resolveProfiles(model, options);
  } catch (error) {
    return invalidPlan({
      diagnostics: [diagnostic('runtime-profile', 'profiles', error.message)],
      model,
    });
  }

  const tracks = applyProfileOverrides(model, resolver);
  let preparation;
  try {
    preparation = createAboutNarrativeWorldPreparationDescriptor({
      worldSequence: tracks.worlds,
      globals: model.globals,
      profile: resolver.layoutProfile,
    });
  } catch (error) {
    return invalidPlan({
      diagnostics: [
        ...resolvedInput.diagnostics,
        diagnostic('runtime-preparation', 'tracks.worlds', error.message),
      ],
      model,
      layoutProfile: resolver.layoutProfile,
      motionProfile: resolver.motionProfile,
    });
  }

  const renderSpanPlan = compileAboutNarrativeRenderSpans(tracks, {
    profileId: resolver.layoutProfile,
    resolver,
    contentPressure: options.contentPressure,
  });
  const diagnostics = [...resolvedInput.diagnostics, ...renderSpanPlan.diagnostics];
  if (!renderSpanPlan.valid || diagnostics.some((item) => item.level === 'error')) {
    return invalidPlan({
      diagnostics,
      model,
      layoutProfile: resolver.layoutProfile,
      motionProfile: resolver.motionProfile,
    });
  }

  return deepFreeze({
    valid: true,
    diagnostics,
    model,
    resolver,
    profileId: resolver.layoutProfile,
    layoutProfile: resolver.layoutProfile,
    pointProfile: resolveAboutNarrativePointProfile(resolver.layoutProfile),
    motionProfile: resolver.motionProfile,
    durationWU: resolver.storyDurationWU,
    maxStoryWU: resolver.storyDurationWU,
    cameraKeys: tracks.cameraKeys,
    visibilityKeys: tracks.visibilityKeys,
    worlds: tracks.worlds,
    textFields: tracks.textFields,
    interactionClips: tracks.interactionClips,
    renderSpans: renderSpanPlan.spans,
    worldSequenceKey: preparation.worldSequenceKey,
    worldPreparationDescriptor: preparation.descriptor,
    disciplineReveal: compileDisciplineReveal(tracks.textFields, tracks.interactionClips),
  });
}

function mix(from, to, progress) {
  return from + ((to - from) * progress);
}

function findIndexAtWU(items, storyWU, key) {
  let low = 0;
  let high = items.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (Number(items[middle][key]) <= storyWU) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

function sampleVisibility(keys, storyWU, reducedMotion) {
  if (!keys.length) return 1;
  const fromIndex = findIndexAtWU(keys, storyWU, 'atWU');
  const from = keys[fromIndex];
  const to = keys[Math.min(keys.length - 1, fromIndex + 1)];
  if (reducedMotion || from === to || storyWU <= Number(keys[0].atWU)) {
    return Number(storyWU <= Number(keys[0].atWU) ? keys[0].visibility : from.visibility);
  }
  const spanWU = Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU));
  const progress = applyAboutNarrativeTrackEasing(
    from.easing,
    (storyWU - Number(from.atWU)) / spanWU,
  );
  return mix(Number(from.visibility), Number(to.visibility), progress);
}

function isActiveAt(storyWU, startWU, endWU, durationWU) {
  if (storyWU < Number(startWU)) return false;
  if (storyWU < Number(endWU)) return true;
  return Math.abs(storyWU - durationWU) <= TIME_EPSILON
    && Math.abs(Number(endWU) - durationWU) <= TIME_EPSILON;
}

function writeTransition(target, transition) {
  target.startWU = Number(transition?.startWU || 0);
  target.endWU = Number(transition?.endWU || 0);
  target.type = transition?.type || 'cut';
  target.easing = transition?.easing || 'linear';
  target.correspondence = transition?.correspondence || 'index-v1';
}

function getTransitionProgress(world, storyWU, reducedMotion) {
  if (!world || reducedMotion) return 1;
  const transition = world.transitionIn;
  if (!transition) return 1;
  if (transition.type === 'cut') return storyWU < transition.startWU ? 0 : 1;
  if (transition.type === 'hold') return storyWU < transition.endWU ? 0 : 1;
  // Preserve the established zero-duration morph sampling guard exactly. The
  // first World uses a self-morph at WU 0 during legacy migration.
  const spanWU = Math.max(0.00001, transition.endWU - transition.startWU);
  return applyAboutNarrativeWorldTransitionEasing(
    transition.easing,
    (storyWU - transition.startWU) / spanWU,
  );
}

function collectActiveIds(target, items, storyWU, durationWU, activation = false) {
  target.length = 0;
  for (const item of items) {
    if (!isActiveAt(storyWU, item.startWU, item.endWU, durationWU)) continue;
    if (!activation || storyWU >= Number(item.activationWU)) target.push(item.id);
  }
}

function smoothRange(value, start, end) {
  const span = Math.max(TIME_EPSILON, end - start);
  return applyAboutNarrativeTrackEasing('smoothstep', (value - start) / span);
}

function getInteractionEffectWeight(clip, storyWU, reducedMotion) {
  if (!clip || reducedMotion || clip.type !== 'grid-ripple') return 0;
  const startWU = Number(clip.startWU);
  const activationWU = Number(clip.activationWU);
  const endWU = Number(clip.endWU);
  const releaseWU = Math.max(0, Number(clip.parameters?.releaseWU) || 0);
  const attack = activationWU <= startWU
    ? 1
    : smoothRange(storyWU, startWU, activationWU);
  const releaseStartWU = Math.max(activationWU, endWU - releaseWU);
  const release = releaseWU <= TIME_EPSILON
    ? 1
    : 1 - smoothRange(storyWU, releaseStartWU, endWU);
  return Math.max(0, Math.min(1, attack * release));
}

export function createAboutNarrativeTitleFieldSample() {
  const target = {
    opacity: 0,
    blur: 0,
    x: 0,
    y: 0,
    z: 0,
  };
  Object.defineProperty(target, '_aboutNarrativeTitleFieldSample', { value: true });
  return target;
}

/**
 * Samples one spatial Title directly from its persisted absolute motion
 * window. No Section lookup or local progress reconstruction is involved.
 */
export function sampleAboutNarrativeTitleFieldInto(
  field,
  storyWU,
  textMotion,
  reducedMotion,
  target,
) {
  if (!target?._aboutNarrativeTitleFieldSample) {
    throw new TypeError('sampleAboutNarrativeTitleFieldInto requires a target from createAboutNarrativeTitleFieldSample().');
  }
  const isOpener = field?.preset === 'opener-v1';
  const isFinale = field?.preset === 'finale-v1';
  const openerStartY = Number(textMotion?.openerStartY ?? 36);
  if (reducedMotion) {
    target.opacity = 1;
    target.blur = 0;
    target.x = 0;
    target.y = 0;
    target.z = 0;
    return target;
  }

  const startWU = Number(field?.startWU ?? 0);
  const endWU = Number(field?.endWU ?? startWU);
  const valueWU = Number(storyWU) || 0;
  const startY = Number(textMotion?.startY ?? -110);
  const endY = Number(textMotion?.endY ?? 130);
  const entryDepth = Number(textMotion?.entryDepth ?? 360);
  const exitDepth = Number(textMotion?.exitDepth ?? 220);
  const maxBlur = Number(textMotion?.maxBlur ?? 22);
  if (isFinale) {
    const focusWU = Math.max(startWU + 0.00001, Number(field?.focusWU ?? endWU));
    if (valueWU < startWU) {
      target.opacity = 0;
      target.blur = 0;
      target.x = 0;
      target.y = 0;
      target.z = 0;
      return target;
    }
    const entryProgress = applyAboutNarrativeTrackEasing(
      'smoothstep',
      (valueWU - startWU) / (focusWU - startWU),
    );
    target.opacity = entryProgress;
    target.blur = 0;
    target.x = 0;
    target.y = 0;
    target.z = 0;
    return target;
  }
  if (isOpener) {
    const spanWU = Math.max(0.00001, endWU - startWU);
    const progress = Math.min(1, Math.max(0, (valueWU - startWU) / spanWU));
    const exitProgress = applyAboutNarrativeTrackEasing('smoothstep', progress);
    target.opacity = valueWU > endWU ? 0 : 1 - exitProgress;
    target.blur = 0;
    target.x = 0;
    target.y = mix(openerStartY, endY, exitProgress);
    target.z = 0;
    return target;
  }
  if (valueWU < startWU || valueWU > endWU) {
    const before = valueWU < startWU;
    target.opacity = 0;
    target.blur = maxBlur;
    target.x = 0;
    target.y = before ? startY : endY;
    target.z = before ? -entryDepth : exitDepth;
    return target;
  }

  const spanWU = Math.max(0.00001, endWU - startWU);
  const progress = Math.min(1, Math.max(0, (valueWU - startWU) / spanWU));
  const readableStart = Math.min(1, Math.max(0, Number(textMotion?.readableStart ?? 0.24)));
  const readableEnd = Math.min(1, Math.max(0, Number(textMotion?.readableEnd ?? 0.76)));
  const clearIn = readableStart <= 0
    ? 1
    : applyAboutNarrativeTrackEasing('smoothstep', progress / readableStart);
  const clearOut = readableEnd >= 1
    ? 1
    : 1 - applyAboutNarrativeTrackEasing(
      'smoothstep',
      (progress - readableEnd) / (1 - readableEnd),
    );
  const clarity = Math.min(clearIn, clearOut);
  target.opacity = clarity;
  target.blur = mix(maxBlur, 0, clarity);
  target.x = 0;
  target.y = mix(startY, endY, progress);
  target.z = mix(-entryDepth, exitDepth, progress);
  return target;
}

function writeDisciplineReveal(target, config, storyWU, reducedMotion) {
  if (!config) return null;
  target.id = config.id;
  target.config = config;
  target.storyWU = storyWU;
  target.startWU = config.startWU;
  target.endWU = config.endWU;
  target.backgroundFadeWU = config.backgroundFadeWU;
  target.restoreDurationWU = config.restoreDurationWU;
  target.sequenceStartWU = config.sequenceStartWU;
  target.sequenceEndWU = config.sequenceEndWU;
  target.active = storyWU >= config.effectStartWU && storyWU < config.effectEndWU;
  target.backgroundProgress = !target.active
    ? 0
    : reducedMotion
      ? 1
      : smoothRange(storyWU, config.effectStartWU, config.backgroundFadeEndWU);
  const restoreStartWU = config.sequenceEndWU;
  target.restoreProgress = reducedMotion
    ? 0
    : smoothRange(storyWU, restoreStartWU, config.effectEndWU);
  target.activeIndex = -1;
  target.activeGroup = 0;
  target.beatProgress = 0;
  target.activeReveal = 0;
  target.copyOffsetY = 0;
  if (storyWU >= config.sequenceStartWU && storyWU < config.sequenceEndWU) {
    const sequenceWU = storyWU - config.sequenceStartWU;
    const activeIndex = Math.min(
      config.items.length - 1,
      Math.floor(sequenceWU / config.beatDurationWU),
    );
    const beatProgress = (sequenceWU - (activeIndex * config.beatDurationWU))
      / config.beatDurationWU;
    const entrance = reducedMotion ? 1 : smoothRange(beatProgress, 0, 0.2);
    const exit = reducedMotion ? 0 : smoothRange(beatProgress, 0.8, 1);
    target.activeIndex = activeIndex;
    target.activeGroup = Number(config.items[activeIndex]?.group || 0);
    target.beatProgress = beatProgress;
    target.activeReveal = reducedMotion ? 1 : Math.min(entrance, 1 - exit);
    target.copyOffsetY = reducedMotion ? 0 : ((1 - entrance) * 18) - (exit * 18);
  }
  return target;
}

export function createAboutNarrativeRuntimeFrameSample() {
  const cameraKey = {
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    manualQuaternion: [0, 0, 0, 1],
    aimQuaternion: [0, 0, 0, 1],
    lookAtTarget: [0, 0, 0],
    lookAtRoll: 0,
    aimWeight: 0,
    targeted: false,
    fov: 48,
  };
  const disciplineReveal = {
    id: '',
    config: null,
    storyWU: 0,
    startWU: 0,
    endWU: 0,
    backgroundFadeWU: 0,
    restoreDurationWU: 0,
    sequenceStartWU: 0,
    sequenceEndWU: 0,
    active: false,
    backgroundProgress: 0,
    restoreProgress: 0,
    activeIndex: -1,
    activeGroup: 0,
    beatProgress: 0,
    activeReveal: 0,
    copyOffsetY: 0,
  };
  const frame = {
    globals: null,
    storyWU: 0,
    storyTime: 0,
    ambientTime: 0,
    deltaSeconds: 0,
    durationWU: 0,
    layoutProfile: 'desktop',
    pointProfile: 'desktop',
    reducedMotion: false,
    camera: {
      position: [0, 0, 0],
      quaternion: [0, 0, 0, 1],
      lookAtTarget: [0, 0, 0],
      lookAtRoll: 0,
      aimWeight: 0,
      targeted: false,
      fov: 48,
    },
    simulation: {
      visibility: 1,
    },
    world: {
      from: null,
      to: null,
      sequence: null,
      sequenceKey: '',
      preparationDescriptor: null,
      transitionProgress: 1,
      transition: {
        startWU: 0,
        endWU: 0,
        type: 'cut',
        easing: 'linear',
        correspondence: 'index-v1',
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
    },
    disciplineReveal: null,
    editorialSignals: {
      disciplineFocus: 0,
      gridInfluence: 0,
    },
  };
  Object.defineProperties(frame, {
    _cameraKey: { value: cameraKey },
    _disciplineReveal: { value: disciplineReveal },
  });
  return frame;
}

export function sampleAboutNarrativeRuntimePlanInto(
  plan,
  storyWU,
  target,
  options = EMPTY_SAMPLE_OPTIONS,
) {
  if (!plan?.valid) return null;
  if (!target?._cameraKey || !target?._disciplineReveal
    || !Array.isArray(target.camera?.position)
    || !Array.isArray(target.text?.activeFieldIds)
    || !Array.isArray(target.interactions?.activeClipIds)) {
    throw new TypeError('sampleAboutNarrativeRuntimePlanInto requires a frame from createAboutNarrativeRuntimeFrameSample().');
  }
  const clampedStoryWU = Math.max(0, Math.min(plan.maxStoryWU, Number(storyWU) || 0));
  const reducedMotion = plan.motionProfile === 'reduced';
  const activeWorldIndex = findIndexAtWU(plan.worlds, clampedStoryWU, 'startWU');
  const toWorld = plan.worlds[activeWorldIndex] || null;
  const fromWorld = plan.worlds[Math.max(0, activeWorldIndex - 1)] || toWorld;
  const cameraKey = sampleAboutNarrativeCameraKeysInto(
    plan.cameraKeys,
    clampedStoryWU,
    reducedMotion,
    target._cameraKey,
  );
  target.camera.position[0] = cameraKey.position[0];
  target.camera.position[1] = cameraKey.position[1];
  target.camera.position[2] = cameraKey.position[2];
  target.camera.quaternion[0] = cameraKey.quaternion[0];
  target.camera.quaternion[1] = cameraKey.quaternion[1];
  target.camera.quaternion[2] = cameraKey.quaternion[2];
  target.camera.quaternion[3] = cameraKey.quaternion[3];
  target.camera.lookAtTarget[0] = cameraKey.lookAtTarget[0];
  target.camera.lookAtTarget[1] = cameraKey.lookAtTarget[1];
  target.camera.lookAtTarget[2] = cameraKey.lookAtTarget[2];
  target.camera.lookAtRoll = cameraKey.lookAtRoll;
  target.camera.aimWeight = cameraKey.aimWeight;
  target.camera.targeted = cameraKey.targeted;
  target.camera.fov = cameraKey.fov;
  target.simulation.visibility = sampleVisibility(
    plan.visibilityKeys,
    clampedStoryWU,
    reducedMotion,
  );

  target.globals = plan.model.globals;
  target.storyWU = clampedStoryWU;
  target.storyTime = clampedStoryWU;
  target.ambientTime = reducedMotion || options.liveAmbient === false
    ? 0
    : Number(options.ambientSeconds) || 0;
  target.deltaSeconds = Math.max(0, Number(options.deltaSeconds) || 0);
  target.durationWU = plan.durationWU;
  target.layoutProfile = plan.layoutProfile;
  target.pointProfile = plan.pointProfile;
  target.reducedMotion = reducedMotion;

  target.world.from = fromWorld;
  target.world.to = toWorld;
  target.world.sequence = plan.worlds;
  target.world.sequenceKey = plan.worldSequenceKey;
  target.world.preparationDescriptor = plan.worldPreparationDescriptor;
  target.world.transitionProgress = getTransitionProgress(toWorld, clampedStoryWU, reducedMotion);
  writeTransition(target.world.transition, toWorld?.transitionIn);

  collectActiveIds(
    target.text.activeFieldIds,
    plan.textFields,
    clampedStoryWU,
    plan.durationWU,
  );
  collectActiveIds(
    target.interactions.activeClipIds,
    plan.interactionClips,
    clampedStoryWU,
    plan.durationWU,
  );
  collectActiveIds(
    target.interactions.activatedClipIds,
    plan.interactionClips,
    clampedStoryWU,
    plan.durationWU,
    true,
  );
  target.interactions.activeInteraction = null;
  target.interactions.interactionActivated = false;
  target.interactions.effectWeight = 0;
  for (const clip of plan.interactionClips) {
    if (!isActiveAt(clampedStoryWU, clip.startWU, clip.endWU, plan.durationWU)) continue;
    if (clip.targetWorldId !== toWorld?.id) continue;
    target.interactions.activeInteraction = clip;
    target.interactions.interactionActivated = clampedStoryWU >= Number(clip.activationWU);
    target.interactions.effectWeight = getInteractionEffectWeight(
      clip,
      clampedStoryWU,
      reducedMotion,
    );
    break;
  }

  target.disciplineReveal = writeDisciplineReveal(
    target._disciplineReveal,
    plan.disciplineReveal,
    clampedStoryWU,
    reducedMotion,
  );
  target.editorialSignals.disciplineFocus = 0;
  target.editorialSignals.gridInfluence = 0;
  return target;
}

export function sampleAboutNarrativeRuntimePlan(plan, storyWU, options = EMPTY_SAMPLE_OPTIONS) {
  return sampleAboutNarrativeRuntimePlanInto(
    plan,
    storyWU,
    createAboutNarrativeRuntimeFrameSample(),
    options,
  );
}

export function getAboutNarrativeRuntimePreparationRequest(plan, storyWU) {
  if (!plan?.valid || !plan.worlds.length || !plan.worldPreparationDescriptor) return null;
  const clampedStoryWU = Math.max(0, Math.min(plan.maxStoryWU, Number(storyWU) || 0));
  const targetWorld = plan.worlds[findIndexAtWU(plan.worlds, clampedStoryWU, 'startWU')];
  if (!targetWorld) return null;
  return {
    sequenceKey: plan.worldSequenceKey,
    descriptor: plan.worldPreparationDescriptor,
    targetWorldId: targetWorld.id,
  };
}
