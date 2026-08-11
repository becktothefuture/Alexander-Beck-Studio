import { cloneAboutNarrativeDocument } from './aboutNarrativeSchema.js';
import {
  ABOUT_NARRATIVE_TRACK_PROFILE_IDS,
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
  normalizeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from './aboutNarrativeTrackSchema.js';
import {
  compileAboutNarrativeCameraKey,
  compileAboutNarrativeCameraOrientationKey,
  sampleAboutNarrativeCameraChannelsInto,
} from './aboutNarrativeCameraSampling.js';
import {
  applyAboutNarrativeTrackEasing,
  applyAboutNarrativeWorldTransitionEasing,
} from './aboutNarrativeMotionMath.js';

/*
 * Sectionless About Narrative track model.
 *
 * Legacy v2/v3/v4 input is accepted only at the persistence boundary. Native v5 input
 * is validated and normalized directly so the canonical sectionless document
 * never re-enters the legacy Section compiler.
 *
 * Do not treat the legacy spans in this file as a new authoring concept. They
 * are migration scaffolding, not persisted schema, editor state, or runtime UI.
 */
export const ABOUT_NARRATIVE_TRACK_MODEL_VERSION = 1;
export { ABOUT_NARRATIVE_TRACK_PROFILE_IDS, ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION };

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function clone(value) {
  return cloneAboutNarrativeDocument(value);
}
export function createAboutNarrativeTrackModel(input) {
  const candidate = clone(input);
  const diagnostics = validateAboutNarrativeTrackDocument(candidate);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    const error = new Error(errors.map((item) => `${item.path}: ${item.message}`).join('\n'));
    error.name = 'AboutNarrativeTrackValidationError';
    error.diagnostics = errors;
    error.original = candidate;
    throw error;
  }
  return deepFreeze(normalizeAboutNarrativeTrackDocument(candidate));
}
export function validateAboutNarrativeTrackModel(model) {
  return validateAboutNarrativeTrackDocument(model);
}

function mix(from, to, progress) {
  return from + ((to - from) * progress);
}

function sampleVisibility(keys, storyWU) {
  if (!keys.length) return 1;
  if (storyWU <= Number(keys[0].atWU)) return Number(keys[0].visibility);
  const last = keys.at(-1);
  if (storyWU >= Number(last.atWU)) return Number(last.visibility);
  let toIndex = 1;
  while (toIndex < keys.length && storyWU > Number(keys[toIndex].atWU)) toIndex += 1;
  const from = keys[toIndex - 1];
  const to = keys[toIndex];
  const spanWU = Math.max(0.000001, Number(to.atWU) - Number(from.atWU));
  const progress = applyAboutNarrativeTrackEasing(
    from.easing,
    (storyWU - Number(from.atWU)) / spanWU,
  );
  return mix(Number(from.visibility), Number(to.visibility), progress);
}

function findActiveWorldIndex(worlds, storyWU) {
  let activeIndex = 0;
  worlds.forEach((world, index) => {
    if (world.startWU <= storyWU) activeIndex = index;
  });
  return activeIndex;
}

function sampleWorldStateInto(worlds, storyWU, target) {
  if (!worlds.length) {
    target.from = null;
    target.to = null;
    target.transitionProgress = 1;
    target.transition = null;
    return target;
  }
  const activeIndex = findActiveWorldIndex(worlds, storyWU);
  const toWorld = worlds[activeIndex];
  const fromWorld = worlds[Math.max(0, activeIndex - 1)] || toWorld;
  const transition = toWorld.transitionIn || null;
  const transitionSpanWU = Math.max(0.000001, (transition?.endWU || 0) - (transition?.startWU || 0));
  let transitionProgress = 1;
  if (transition) {
    if (transition.type === 'cut') {
      transitionProgress = storyWU < transition.startWU ? 0 : 1;
    } else if (transition.type === 'hold') {
      transitionProgress = storyWU < transition.endWU ? 0 : 1;
    } else {
      transitionProgress = applyAboutNarrativeWorldTransitionEasing(
        transition.easing,
        (storyWU - transition.startWU) / transitionSpanWU,
      );
    }
  }
  target.from = fromWorld;
  target.to = toWorld;
  target.transitionProgress = transitionProgress;
  target.transition = transition;
  return target;
}

export function compileAboutNarrativeTrackModel(input) {
  /*
   * Compilation produces sorted immutable indexes for tests and the next runtime
   * migration slice. It accepts only the current v5 track language; legacy
   * documents must cross the persistence migration boundary first.
   */
  const candidate = input?.schemaVersion === ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION && input?.tracks
    ? clone(input)
    : clone(createAboutNarrativeTrackModel(input));
  const diagnostics = validateAboutNarrativeTrackModel(candidate);
  const errors = diagnostics.filter((item) => item.level === 'error');
  const model = errors.length ? candidate : normalizeAboutNarrativeTrackDocument(candidate);
  const durationWU = Number(model.profiles?.desktop?.storyDurationWU || 0);
  const authoredWorlds = [...(model.tracks?.worlds?.objects || [])]
    .sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id));
  const compiledWorlds = authoredWorlds.map((world, index) => ({
    ...world,
    endWU: Number(authoredWorlds[index + 1]?.startWU ?? durationWU),
  }));
  return deepFreeze({
    valid: errors.length === 0,
    diagnostics,
    model,
    durationWU,
    profiles: clone(model.profiles || {}),
    cameraKeys: [...(model.tracks?.camera?.keys || [])]
      .map(compileAboutNarrativeCameraKey)
      .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)),
    cameraOrientationKeys: [...(model.tracks?.camera?.orientationKeys || [])]
      .map(compileAboutNarrativeCameraOrientationKey)
      .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)),
    visibilityKeys: [...(model.tracks?.visibility?.keys || [])]
      .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id)),
    worlds: compiledWorlds,
    textFields: [...(model.tracks?.text?.fields || [])].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)),
    interactionClips: [...(model.tracks?.interactions?.clips || [])].sort((left, right) => left.startWU - right.startWU || left.id.localeCompare(right.id)),
  });
}

export function createAboutNarrativeTrackFrameSample() {
  /*
   * Runtime-facing samples own their arrays. `sampleInto` mutates these stable
   * containers instead of allocating per frame, matching the current hot-path
   * contract before production playback is switched to tracks.
   */
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
  const frame = {
    storyWU: 0,
    durationWU: 0,
    globals: null,
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
      transitionProgress: 1,
      transition: null,
    },
    text: {
      activeFieldIds: [],
    },
    interactions: {
      activeClipIds: [],
      activatedClipIds: [],
    },
  };
  Object.defineProperty(frame, '_cameraKey', { value: cameraKey });
  return frame;
}

function collectActiveTextFieldIds(target, textFields, storyWU) {
  target.length = 0;
  for (const field of textFields) {
    if (storyWU >= field.startWU && storyWU <= field.endWU) target.push(field.id);
  }
  return target;
}

function collectActiveInteractionIds(target, interactionClips, storyWU) {
  target.length = 0;
  for (const clip of interactionClips) {
    if (storyWU >= clip.startWU && storyWU <= clip.endWU) target.push(clip.id);
  }
  return target;
}

function collectActivatedInteractionIds(target, interactionClips, storyWU) {
  target.length = 0;
  for (const clip of interactionClips) {
    if (storyWU >= clip.startWU && storyWU <= clip.endWU && storyWU >= clip.activationWU) target.push(clip.id);
  }
  return target;
}

export function sampleAboutNarrativeTrackPlanInto(plan, storyWU, target) {
  /*
   * Global Story WU is enough to sample the sectionless plan. There is no
   * sectionIndex, localProgress, or section-owned interaction lookup here; the
   * active state comes from sorted track objects and their absolute WU windows.
   */
  if (!plan?.valid) return null;
  if (!target?._cameraKey || !Array.isArray(target.camera?.position) || !Array.isArray(target.text?.activeFieldIds)) {
    throw new TypeError('sampleAboutNarrativeTrackPlanInto requires a frame from createAboutNarrativeTrackFrameSample().');
  }
  const clampedStoryWU = Math.max(0, Math.min(plan.durationWU, Number(storyWU) || 0));
  const globals = plan.model.globals;
  const cameraKey = sampleAboutNarrativeCameraChannelsInto(
    plan.cameraKeys,
    plan.cameraOrientationKeys,
    clampedStoryWU,
    false,
    target._cameraKey,
  );
  const cameraPosition = target.camera.position;
  cameraPosition[0] = cameraKey.position[0];
  cameraPosition[1] = cameraKey.position[1];
  cameraPosition[2] = cameraKey.position[2];
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
  target.storyWU = clampedStoryWU;
  target.durationWU = plan.durationWU;
  target.globals = globals;
  target.camera.fov = cameraKey.fov;
  target.simulation.visibility = sampleVisibility(plan.visibilityKeys, clampedStoryWU);
  sampleWorldStateInto(plan.worlds, clampedStoryWU, target.world);
  collectActiveTextFieldIds(target.text.activeFieldIds, plan.textFields, clampedStoryWU);
  collectActiveInteractionIds(target.interactions.activeClipIds, plan.interactionClips, clampedStoryWU);
  collectActivatedInteractionIds(target.interactions.activatedClipIds, plan.interactionClips, clampedStoryWU);
  return target;
}

export function sampleAboutNarrativeTrackPlan(plan, storyWU) {
  return sampleAboutNarrativeTrackPlanInto(
    plan,
    storyWU,
    createAboutNarrativeTrackFrameSample(),
  );
}
