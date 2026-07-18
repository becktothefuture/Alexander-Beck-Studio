import { cloneAboutNarrativeDocument } from './aboutNarrativeSchema.js';
import {
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
  migrateAboutNarrativeVersion2To3,
  normalizeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from './aboutNarrativeTrackSchema.js';
import {
  createAboutNarrativeProfileResolver,
  resolveAboutNarrativePointProfile,
} from './aboutNarrativeProfileResolver.js';
import { compileAboutNarrativeRenderSpans } from './aboutNarrativeRenderSpans.js';
import { createAboutNarrativeWorldPreparationDescriptor } from './aboutNarrativeSequenceIdentity.js';

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
  if (input?.schemaVersion === ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
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
  try {
    const migrated = migrateAboutNarrativeVersion2To3(input);
    return {
      valid: true,
      model: normalizeAboutNarrativeTrackDocument(migrated),
      diagnostics: validateAboutNarrativeTrackDocument(migrated),
    };
  } catch (error) {
    return {
      valid: false,
      model: null,
      diagnostics: error?.diagnostics || [diagnostic(
        'runtime-plan-input',
        'document',
        error?.message || 'The About Narrative document could not be compiled.',
      )],
    };
  }
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
  return {
    ...key,
    ...override,
    offset: [...(override.offset || key.offset)],
    lookAtOffset: [...(override.lookAtOffset || key.lookAtOffset)],
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
    .map((key) => mergeCameraKey(key, overrides.camera[key.id]))
    .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id));
  const authoredWorlds = model.tracks.worlds.objects
    .map((world) => mergeWorld(world, overrides.worlds[world.id]))
    .sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
  const worlds = authoredWorlds.map((world, index) => ({
    ...world,
    endWU: Number(authoredWorlds[index + 1]?.startWU ?? durationWU),
    anchorRailZ: Number(model.globals.camera.startZ)
      - (Number(world.anchorWU) * Number(model.globals.camera.cadence)),
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
  return { cameraKeys, worlds, textFields, interactionClips };
}

function compileDisciplineReveal(textFields) {
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
    effectStartWU: Math.min(Number(field.startWU), Number(field.fieldTravelStartWU)),
    effectEndWU: Math.max(Number(field.endWU), Number(field.fieldTravelEndWU)),
    fieldTravelStartWU: Number(field.fieldTravelStartWU),
    fieldTravelEndWU: Number(field.fieldTravelEndWU),
    fieldTravelWU: Number(choreography.fieldTravelWU),
    fieldFogStartWU: Number(choreography.fieldFogStartWU),
    fieldFogEndWU: Number(choreography.fieldFogEndWU),
    fieldFogStrength: Number(choreography.fieldFogStrength),
    staggerWU,
    backgroundFadeWU,
    backgroundFadeEndWU: Number(field.startWU) + backgroundFadeWU,
    backgroundOpacity: Number(choreography.backgroundOpacity),
    reconnectOpacity: Number(choreography.reconnectOpacity),
    pointScale: Number(choreography.pointScale),
    labelOffsetPx: Number(choreography.labelOffsetPx),
    labelDurationWU,
    holdWU,
    labelSequenceEndWU,
    items: choreography.items,
    field,
  };
}

/**
 * Compiles either a strict v3 document or a validated v2 migration into the
 * single immutable sectionless plan consumed by live playback.
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
    worlds: tracks.worlds,
    textFields: tracks.textFields,
    interactionClips: tracks.interactionClips,
    renderSpans: renderSpanPlan.spans,
    worldSequenceKey: preparation.worldSequenceKey,
    worldPreparationDescriptor: preparation.descriptor,
    disciplineReveal: compileDisciplineReveal(tracks.textFields),
  });
}

function applyEasing(name, value) {
  const progress = Math.min(1, Math.max(0, Number(value) || 0));
  if (name === 'linear') return progress;
  if (name === 'hold') return progress < 1 ? 0 : 1;
  if (name === 'ease-in') return progress ** 3;
  if (name === 'ease-out') return 1 - ((1 - progress) ** 3);
  if (name === 'ease-in-out') {
    return progress < 0.5 ? 4 * (progress ** 3) : 1 - (((-2 * progress) + 2) ** 3) / 2;
  }
  return progress * progress * (3 - (2 * progress));
}

function mix(from, to, progress) {
  return from + ((to - from) * progress);
}

function writeCameraKey(target, key, fallbackFov) {
  target.offset[0] = key?.offset?.[0] ?? 0;
  target.offset[1] = key?.offset?.[1] ?? 0;
  target.offset[2] = key?.offset?.[2] ?? 0;
  target.lookAtOffset[0] = key?.lookAtOffset?.[0] ?? 0;
  target.lookAtOffset[1] = key?.lookAtOffset?.[1] ?? 0;
  target.lookAtOffset[2] = key?.lookAtOffset?.[2] ?? -1;
  target.fov = key?.fov ?? fallbackFov;
  target.roll = key?.roll ?? 0;
  return target;
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

function sampleCameraInto(keys, storyWU, fallbackFov, reducedMotion, target) {
  if (!keys.length) return writeCameraKey(target, null, fallbackFov);
  const fromIndex = findIndexAtWU(keys, storyWU, 'atWU');
  const from = keys[fromIndex];
  const to = keys[Math.min(keys.length - 1, fromIndex + 1)];
  if (reducedMotion || from === to || storyWU <= Number(keys[0].atWU)) {
    return writeCameraKey(target, storyWU <= Number(keys[0].atWU) ? keys[0] : from, fallbackFov);
  }
  const spanWU = Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU));
  const progress = applyEasing(from.easing, (storyWU - Number(from.atWU)) / spanWU);
  target.offset[0] = mix(from.offset[0], to.offset[0], progress);
  target.offset[1] = mix(from.offset[1], to.offset[1], progress);
  target.offset[2] = mix(from.offset[2], to.offset[2], progress);
  target.lookAtOffset[0] = mix(from.lookAtOffset[0], to.lookAtOffset[0], progress);
  target.lookAtOffset[1] = mix(from.lookAtOffset[1], to.lookAtOffset[1], progress);
  target.lookAtOffset[2] = mix(from.lookAtOffset[2], to.lookAtOffset[2], progress);
  target.fov = mix(from.fov, to.fov, progress);
  target.roll = mix(from.roll, to.roll, progress);
  return target;
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
  return applyEasing(transition.easing, (storyWU - transition.startWU) / spanWU);
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
  return applyEasing('smoothstep', (value - start) / span);
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
  const openerStartY = Number(textMotion?.openerStartY ?? 36);
  if (reducedMotion) {
    target.opacity = 1;
    target.blur = 0;
    target.x = 0;
    target.y = isOpener ? openerStartY : 0;
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
  // The opener preset defines the sectionless replacement for the old
  // `interval.start === 0` special case.
  if (isOpener) {
    const fadeOutProgress = readableEnd >= 1
      ? 0
      : Math.min(1, Math.max(0, (progress - readableEnd) / (1 - readableEnd)));
    const clarity = 1 - applyEasing('smoothstep', fadeOutProgress);
    target.opacity = clarity;
    target.blur = mix(maxBlur, 0, clarity);
    target.x = 0;
    target.y = mix(openerStartY, endY, progress);
    target.z = mix(0, exitDepth, progress);
    return target;
  }

  const clearIn = readableStart <= 0
    ? 1
    : applyEasing('smoothstep', progress / readableStart);
  const clearOut = readableEnd >= 1
    ? 1
    : 1 - applyEasing('smoothstep', (progress - readableEnd) / (1 - readableEnd));
  const clarity = Math.min(clearIn, clearOut);
  target.opacity = clarity;
  target.blur = mix(maxBlur, 0, clarity);
  target.x = 0;
  target.y = mix(startY, endY, progress);
  target.z = mix(-entryDepth, exitDepth, progress);
  return target;
}

function writeDisciplineReveal(target, config, storyWU, durationWU, reducedMotion) {
  if (!config) return null;
  target.id = config.id;
  target.config = config;
  target.storyWU = storyWU;
  target.startWU = config.startWU;
  target.endWU = config.endWU;
  target.fieldTravelStartWU = config.fieldTravelStartWU;
  target.fieldTravelEndWU = config.fieldTravelEndWU;
  target.staggerWU = config.staggerWU;
  target.backgroundFadeWU = config.backgroundFadeWU;
  target.labelDurationWU = config.labelDurationWU;
  target.holdWU = config.holdWU;
  target.elapsedWU = storyWU - config.startWU;
  target.active = isActiveAt(
    storyWU,
    config.effectStartWU,
    config.effectEndWU,
    durationWU,
  );
  target.labelActive = isActiveAt(storyWU, config.startWU, config.endWU, durationWU);
  target.settled = reducedMotion;
  target.fieldTravelProgress = reducedMotion
    ? (storyWU >= config.startWU ? 1 : 0)
    : smoothRange(storyWU, config.fieldTravelStartWU, config.fieldTravelEndWU);
  target.backgroundProgress = reducedMotion
    ? (target.labelActive ? 1 : 0)
    : smoothRange(storyWU, config.startWU, config.backgroundFadeEndWU);
  return target;
}

export function createAboutNarrativeRuntimeFrameSample() {
  const cameraKey = {
    offset: [0, 0, 0],
    lookAtOffset: [0, 0, -1],
    fov: 48,
    roll: 0,
  };
  const disciplineReveal = {
    id: '',
    config: null,
    storyWU: 0,
    startWU: 0,
    endWU: 0,
    fieldTravelStartWU: 0,
    fieldTravelEndWU: 0,
    staggerWU: 0,
    backgroundFadeWU: 0,
    labelDurationWU: 0,
    holdWU: 0,
    elapsedWU: 0,
    active: false,
    labelActive: false,
    settled: false,
    fieldTravelProgress: 0,
    backgroundProgress: 0,
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
      target: [0, 0, -1],
      fov: 48,
      roll: 0,
      cadence: 1,
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
  const cameraStoryWU = reducedMotion && toWorld ? Number(toWorld.startWU) : clampedStoryWU;
  const cameraKey = sampleCameraInto(
    plan.cameraKeys,
    cameraStoryWU,
    plan.model.globals.camera.fov,
    reducedMotion,
    target._cameraKey,
  );
  const cameraRailZ = plan.model.globals.camera.startZ
    - (cameraStoryWU * plan.model.globals.camera.cadence);
  target.camera.position[0] = cameraKey.offset[0];
  target.camera.position[1] = cameraKey.offset[1];
  target.camera.position[2] = cameraRailZ + cameraKey.offset[2];
  target.camera.target[0] = target.camera.position[0] + cameraKey.lookAtOffset[0];
  target.camera.target[1] = target.camera.position[1] + cameraKey.lookAtOffset[1];
  target.camera.target[2] = target.camera.position[2] + cameraKey.lookAtOffset[2];
  target.camera.fov = reducedMotion ? plan.model.globals.camera.fov : cameraKey.fov;
  target.camera.roll = reducedMotion ? 0 : cameraKey.roll;
  target.camera.cadence = plan.model.globals.camera.cadence;

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
    plan.durationWU,
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
