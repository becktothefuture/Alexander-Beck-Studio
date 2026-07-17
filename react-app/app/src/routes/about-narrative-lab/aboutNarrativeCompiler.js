import {
  cloneAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';
import { createAboutNarrativeWorldPreparationDescriptor } from './aboutNarrativeSequenceIdentity.js';
import { resolveAboutNarrativeCapabilities } from './aboutNarrativeCapabilities.js';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (from, to, progress) => from + ((to - from) * progress);

export function applyAboutNarrativeEasing(name, value) {
  const progress = clamp01(value);
  if (name === 'linear') return progress;
  if (name === 'hold') return progress < 1 ? 0 : 1;
  if (name === 'ease-in') return progress ** 3;
  if (name === 'ease-out') return 1 - ((1 - progress) ** 3);
  if (name === 'ease-in-out') {
    return progress < 0.5 ? 4 * (progress ** 3) : 1 - (((-2 * progress) + 2) ** 3) / 2;
  }
  return progress * progress * (3 - (2 * progress));
}

function writeVectorMix(target, from, to, progress) {
  target[0] = mix(from[0], to[0], progress);
  target[1] = mix(from[1], to[1], progress);
  target[2] = mix(from[2], to[2], progress);
}

function writeCameraKey(target, key, fallbackFov) {
  const offset = key?.offset;
  const lookAtOffset = key?.lookAtOffset;
  target.offset[0] = offset?.[0] ?? 0;
  target.offset[1] = offset?.[1] ?? 0;
  target.offset[2] = offset?.[2] ?? 0;
  target.lookAtOffset[0] = lookAtOffset?.[0] ?? 0;
  target.lookAtOffset[1] = lookAtOffset?.[1] ?? 0;
  target.lookAtOffset[2] = lookAtOffset?.[2] ?? -1;
  target.fov = key?.fov ?? fallbackFov;
  target.roll = key?.roll ?? 0;
  return target;
}

function sampleCameraKeysInto(keys, localProgress, fallbackFov, target) {
  if (!keys.length) return writeCameraKey(target, null, fallbackFov);
  if (localProgress <= keys[0].at) return writeCameraKey(target, keys[0], fallbackFov);
  const last = keys[keys.length - 1];
  if (localProgress >= last.at) return writeCameraKey(target, last, fallbackFov);
  let toIndex = 1;
  while (toIndex < keys.length && localProgress > keys[toIndex].at) toIndex += 1;
  const from = keys[toIndex - 1];
  const to = keys[toIndex];
  const span = Math.max(0.00001, to.at - from.at);
  const progress = applyAboutNarrativeEasing(from.easing, (localProgress - from.at) / span);
  writeVectorMix(target.offset, from.offset, to.offset, progress);
  writeVectorMix(target.lookAtOffset, from.lookAtOffset, to.lookAtOffset, progress);
  target.fov = mix(from.fov, to.fov, progress);
  target.roll = mix(from.roll, to.roll, progress);
  return target;
}

function findSectionIndex(sections, storyWU) {
  let low = 0;
  let high = sections.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (sections[middle].startWU <= storyWU) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

function compileMeasurements(document, profile, measurements) {
  let cumulativeWU = 0;
  return document.sections.map((section) => {
    const authoredExtentWU = profile === 'mobile' ? section.mobileExtentWU : section.extentWU;
    const measurement = measurements?.[section.id];
    const startWU = measurement && Number.isFinite(measurement.topWU) ? measurement.topWU : cumulativeWU;
    const resolvedExtentWU = measurement && Number.isFinite(measurement.extentWU)
      ? Math.max(authoredExtentWU, measurement.extentWU)
      : authoredExtentWU;
    cumulativeWU = startWU + resolvedExtentWU;
    return {
      ...section,
      authoredExtentWU,
      resolvedExtentWU,
      startWU,
      endWU: startWU + resolvedExtentWU,
      travelWU: Math.max(0.001, resolvedExtentWU - 1),
    };
  });
}

function compileWorldClips(sections) {
  let activeWorld = null;
  let activeTransition = null;
  return sections.map((section, index) => {
    const changesWorld = section.world.mode === 'set';
    if (changesWorld) {
      const nextWorld = {
        ...cloneAboutNarrativeDocument(section.world),
        sectionId: section.id,
        sectionIndex: index,
        startWU: section.startWU,
        travelWU: section.travelWU,
      };
      const previousWorld = activeWorld || nextWorld;
      const transition = nextWorld.transitionIn;
      activeWorld = nextWorld;
      activeTransition = {
        fromWorld: previousWorld,
        toWorld: nextWorld,
        startWU: section.startWU + (transition.start * section.travelWU),
        endWU: section.startWU + (transition.end * section.travelWU),
      };
    }
    return {
      activeWorld,
      previousWorld: activeTransition?.fromWorld || activeWorld,
      changesWorld,
      transition: activeTransition,
    };
  });
}

export function getAboutNarrativeWorldTransitionLimit(plan, sectionIndex) {
  const section = plan?.sections?.[sectionIndex];
  if (!section || section.world.mode !== 'set') return 1;
  const nextWorld = plan.sections.slice(sectionIndex + 1).find((item) => item.world.mode === 'set');
  const boundaryWU = nextWorld?.startWU ?? plan.maxStoryWU;
  return Math.max(0, (boundaryWU - section.startWU) / section.travelWU);
}

function compileWorldTransitionDiagnostics(sections, maxStoryWU) {
  const diagnostics = [];
  const planLike = { sections, maxStoryWU };
  sections.forEach((section, sectionIndex) => {
    if (section.world.mode !== 'set' || section.world.transitionIn.type === 'cut') return;
    const limit = getAboutNarrativeWorldTransitionLimit(planLike, sectionIndex);
    if (section.world.transitionIn.end > limit + 0.00001) {
      diagnostics.push({
        level: 'error',
        code: 'transition-overrun',
        path: `sections.${sectionIndex}.world.transitionIn.end`,
        message: `Transition End must stay at or before ${limit.toFixed(3)}, where the next World begins.`,
      });
    }
  });
  return diagnostics;
}

function compileContinuityDiagnostics(sections) {
  const diagnostics = [];
  sections.forEach((section, index) => {
    if (index === 0 || !section.camera.keys.length) return;
    const previous = sections[index - 1];
    if (!previous.camera.keys.length) return;
    const from = previous.camera.keys.at(-1);
    const to = section.camera.keys[0];
    const positionGap = Math.hypot(
      to.offset[0] - from.offset[0],
      to.offset[1] - from.offset[1],
      to.offset[2] - from.offset[2],
    );
    if (positionGap > 0.001) {
      diagnostics.push({
        level: 'warning',
        code: 'camera-position-gap',
        path: `sections.${index}.camera.keys.0`,
        message: `Camera offset differs by ${positionGap.toFixed(2)} WU at this boundary. Playback inherits the previous endpoint to prevent a jump.`,
      });
    }
    const aimGap = Math.hypot(
      to.lookAtOffset[0] - from.lookAtOffset[0],
      to.lookAtOffset[1] - from.lookAtOffset[1],
      to.lookAtOffset[2] - from.lookAtOffset[2],
    );
    if (aimGap > 0.001) {
      diagnostics.push({
        level: 'warning',
        code: 'camera-aim-gap',
        path: `sections.${index}.camera.keys.0`,
        message: 'Camera aim differs at this boundary. Playback inherits the previous endpoint to prevent a rotation jump.',
      });
    }
    if (Math.abs(to.fov - from.fov) > 0.01) {
      diagnostics.push({
        level: 'warning',
        code: 'camera-fov-gap',
        path: `sections.${index}.camera.keys.0`,
        message: 'Camera field of view differs at this boundary. Playback inherits the previous endpoint to prevent a lens jump.',
      });
    }
    if (Math.abs(to.roll - from.roll) > 0.001) {
      diagnostics.push({
        level: 'warning',
        code: 'camera-roll-gap',
        path: `sections.${index}.camera.keys.0`,
        message: 'Camera roll differs at this boundary. Playback inherits the previous endpoint to prevent a rotation jump.',
      });
    }
  });
  return diagnostics;
}

function compileWorldCapabilityDiagnostics(sections, profile) {
  const diagnostics = [];
  let previousWorld = null;
  sections.forEach((section, sectionIndex) => {
    if (section.world.mode !== 'set') return;
    const targetWorld = section.world;
    const sourceWorld = previousWorld || targetWorld;
    const result = resolveAboutNarrativeCapabilities({
      sourceAdapterId: sourceWorld.adapterId,
      targetAdapterId: targetWorld.adapterId,
      sourceShapeId: sourceWorld.shapeId,
      targetShapeId: targetWorld.shapeId,
      transition: targetWorld.transitionIn,
      interaction: section.interaction,
      rendererProfile: {
        maximumConcurrentGroups: 1,
        maximumDrawCalls: 1,
        pointPoolContract: 'fixed-point-pool-v1',
      },
      reducedMotion: profile === 'reduced-motion',
    });
    result.reasons.forEach((reason) => diagnostics.push({
      level: 'error',
      code: `capability-${reason.code}`,
      path: `sections.${sectionIndex}.world.${reason.path || 'transitionIn'}`,
      message: reason.message,
      alternatives: result.alternatives,
    }));
    result.warnings.forEach((warning) => diagnostics.push({
      level: 'warning',
      code: `capability-${warning.code}`,
      path: `sections.${sectionIndex}.world.${warning.path || 'transitionIn'}`,
      message: warning.message,
    }));
    previousWorld = targetWorld;
  });
  return diagnostics;
}

function inheritCameraPose(target, source) {
  return {
    ...target,
    offset: [...source.offset],
    lookAtOffset: [...source.lookAtOffset],
    fov: source.fov,
    roll: source.roll,
  };
}

function compileDisciplineReveal(sections) {
  const sectionIndex = sections.findIndex((section) => section.text?.disciplineReveal);
  if (sectionIndex < 0) return null;
  const section = sections[sectionIndex];
  return Object.freeze({
    sectionId: section.id,
    sectionIndex,
    startWU: section.startWU,
    travelWU: section.travelWU,
    config: Object.freeze(cloneAboutNarrativeDocument(section.text.disciplineReveal)),
  });
}

export function compileAboutNarrativeDocument(input, {
  profile = 'desktop',
  measurements = null,
} = {}) {
  const sourceDiagnostics = validateAboutNarrativeDocument(input);
  const sourceErrors = sourceDiagnostics.filter((item) => item.level === 'error');
  if (sourceErrors.length) {
    return Object.freeze({
      valid: false,
      document: cloneAboutNarrativeDocument(input),
      diagnostics: Object.freeze(sourceDiagnostics),
      profile,
      sections: Object.freeze([]),
      worldSequenceKey: '',
      worldPreparationDescriptor: null,
      totalExtentWU: 0,
      maxStoryWU: 0,
    });
  }
  const document = normalizeAboutNarrativeDocument(input);
  const diagnostics = validateAboutNarrativeDocument(document);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) {
    return Object.freeze({
      valid: false,
      document,
      diagnostics: Object.freeze(diagnostics),
      profile,
      sections: Object.freeze([]),
      worldSequenceKey: '',
      worldPreparationDescriptor: null,
      totalExtentWU: 0,
    });
  }

  const measuredSections = compileMeasurements(document, profile, measurements);
  const maxStoryWU = Math.max(0, (measuredSections.at(-1)?.endWU || 1) - 1);
  const worldStates = compileWorldClips(measuredSections);
  const continuityDiagnostics = compileContinuityDiagnostics(measuredSections);
  const sections = measuredSections.reduce((compiled, section, index) => {
    const keys = [...section.camera.keys]
      .sort((a, b) => a.at - b.at)
      .map((key) => ({ ...key, offset: [...key.offset], lookAtOffset: [...key.lookAtOffset] }));
    const previousEnd = compiled.at(-1)?.camera.keys.at(-1);
    if (previousEnd && keys.length) keys[0] = inheritCameraPose(keys[0], previousEnd);
    compiled.push(Object.freeze({
      ...section,
      camera: Object.freeze({
        ...section.camera,
        keys: Object.freeze(keys.map(Object.freeze)),
      }),
      worldState: Object.freeze(worldStates[index]),
    }));
    return compiled;
  }, []);
  const completeDiagnostics = [
    ...diagnostics,
    ...continuityDiagnostics,
    ...compileWorldCapabilityDiagnostics(sections, profile),
    ...compileWorldTransitionDiagnostics(sections, maxStoryWU),
  ];
  if (completeDiagnostics.some((item) => item.level === 'error')) {
    return Object.freeze({
      valid: false,
      document,
      diagnostics: Object.freeze(completeDiagnostics),
      profile,
      sections: Object.freeze([]),
      worldSequenceKey: '',
      worldPreparationDescriptor: null,
      totalExtentWU: 0,
      maxStoryWU: 0,
    });
  }
  const disciplineReveal = compileDisciplineReveal(sections);
  const worldSequence = Object.freeze(sections
    .filter((section) => section.worldState.changesWorld)
    .map((section) => section.worldState.activeWorld));
  const preparation = createAboutNarrativeWorldPreparationDescriptor({
    worldSequence,
    globals: document.globals,
    profile,
  });

  return Object.freeze({
    valid: true,
    document,
    profile,
    diagnostics: Object.freeze(completeDiagnostics),
    sections: Object.freeze(sections),
    worldSequence,
    worldSequenceKey: preparation.worldSequenceKey,
    worldPreparationDescriptor: preparation.descriptor,
    disciplineReveal,
    totalExtentWU: sections.at(-1)?.endWU || 0,
    maxStoryWU,
  });
}

const EMPTY_SAMPLE_OPTIONS = Object.freeze({});
const CUT_TRANSITION = Object.freeze({
  start: 0,
  end: 0,
  type: 'cut',
  easing: 'linear',
  correspondence: 'index-v1',
});

export function createAboutNarrativeFrameSample() {
  const cameraKey = {
    offset: [0, 0, 0],
    lookAtOffset: [0, 0, -1],
    fov: 48,
    roll: 0,
  };
  const disciplineReveal = {
    sectionId: '',
    sectionIndex: -1,
    startWU: 0,
    travelWU: 1,
    config: null,
    localProgress: -1,
  };
  const frame = {
    globals: null,
    storyWU: 0,
    storyTime: 0,
    ambientTime: 0,
    reducedMotion: false,
    sectionIndex: 0,
    section: null,
    localProgress: 0,
    deltaSeconds: 0,
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
      changes: false,
      transitionProgress: 1,
      transition: {
        start: 0,
        end: 0,
        type: 'cut',
        easing: 'linear',
        correspondence: 'index-v1',
        startWU: 0,
        endWU: 0,
      },
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

export function sampleAboutNarrativePlanInto(
  plan,
  storyWU,
  target,
  options = EMPTY_SAMPLE_OPTIONS,
) {
  if (!plan?.valid || !plan.sections.length) return null;
  if (!target?._cameraKey || !target?._disciplineReveal) {
    throw new TypeError('sampleAboutNarrativePlanInto requires a frame from createAboutNarrativeFrameSample().');
  }
  const ambientSeconds = Number(options.ambientSeconds) || 0;
  const reducedMotion = Boolean(options.reducedMotion);
  const liveAmbient = options.liveAmbient !== false;
  const clampedStoryWU = Math.max(0, Math.min(plan.maxStoryWU, Number(storyWU) || 0));
  const sectionIndex = findSectionIndex(plan.sections, clampedStoryWU);
  const section = plan.sections[sectionIndex];
  const localProgress = clamp01((clampedStoryWU - section.startWU) / section.travelWU);
  const globalCamera = plan.document.globals.camera;
  const cadence = Number.isFinite(section.camera.cadenceOverride)
    ? section.camera.cadenceOverride
    : globalCamera.cadence;
  const cameraKey = sampleCameraKeysInto(
    section.camera.keys,
    reducedMotion ? 0 : localProgress,
    globalCamera.fov,
    target._cameraKey,
  );
  const cameraStoryWU = reducedMotion ? section.startWU : clampedStoryWU;
  const cameraPosition = target.camera.position;
  cameraPosition[0] = cameraKey.offset[0];
  cameraPosition[1] = cameraKey.offset[1];
  cameraPosition[2] = globalCamera.startZ - (cameraStoryWU * cadence) + cameraKey.offset[2];
  const cameraTarget = target.camera.target;
  cameraTarget[0] = cameraPosition[0] + cameraKey.lookAtOffset[0];
  cameraTarget[1] = cameraPosition[1] + cameraKey.lookAtOffset[1];
  cameraTarget[2] = cameraPosition[2] + cameraKey.lookAtOffset[2];
  const worldState = section.worldState;
  const transition = worldState.activeWorld?.transitionIn || CUT_TRANSITION;
  const compiledTransition = worldState.transition;
  const transitionSpanWU = Math.max(0.00001, (compiledTransition?.endWU || 0) - (compiledTransition?.startWU || 0));
  let transitionProgress = 1;
  if (compiledTransition) {
    if (transition.type === 'cut') {
      transitionProgress = clampedStoryWU < compiledTransition.startWU ? 0 : 1;
    } else if (transition.type === 'hold') {
      transitionProgress = clampedStoryWU < compiledTransition.endWU ? 0 : 1;
    } else {
      transitionProgress = applyAboutNarrativeEasing(
        transition.easing,
        (clampedStoryWU - compiledTransition.startWU) / transitionSpanWU,
      );
    }
  }
  target.globals = plan.document.globals;
  target.storyWU = clampedStoryWU;
  target.storyTime = clampedStoryWU;
  target.ambientTime = reducedMotion || !liveAmbient ? 0 : ambientSeconds;
  target.reducedMotion = reducedMotion;
  target.sectionIndex = sectionIndex;
  target.section = section;
  target.localProgress = localProgress;
  target.camera.fov = reducedMotion ? globalCamera.fov : cameraKey.fov;
  target.camera.roll = reducedMotion ? 0 : cameraKey.roll;
  target.camera.cadence = cadence;
  target.world.from = worldState.previousWorld;
  target.world.to = worldState.activeWorld;
  target.world.sequence = plan.worldSequence;
  target.world.sequenceKey = plan.worldSequenceKey;
  target.world.preparationDescriptor = plan.worldPreparationDescriptor;
  target.world.changes = worldState.changesWorld;
  target.world.transitionProgress = reducedMotion ? 1 : transitionProgress;
  target.world.transition.start = transition.start;
  target.world.transition.end = transition.end;
  target.world.transition.type = transition.type;
  target.world.transition.easing = transition.easing;
  target.world.transition.correspondence = transition.correspondence;
  target.world.transition.startWU = compiledTransition?.startWU ?? section.startWU;
  target.world.transition.endWU = compiledTransition?.endWU ?? section.startWU;

  if (plan.disciplineReveal) {
    const revealTarget = target._disciplineReveal;
    revealTarget.sectionId = plan.disciplineReveal.sectionId;
    revealTarget.sectionIndex = plan.disciplineReveal.sectionIndex;
    revealTarget.startWU = plan.disciplineReveal.startWU;
    revealTarget.travelWU = plan.disciplineReveal.travelWU;
    revealTarget.config = plan.disciplineReveal.config;
    revealTarget.localProgress = (
      clampedStoryWU - plan.disciplineReveal.startWU
    ) / plan.disciplineReveal.travelWU;
    target.disciplineReveal = revealTarget;
  } else {
    target.disciplineReveal = null;
  }
  return target;
}

export function sampleAboutNarrativePlan(plan, storyWU, options = EMPTY_SAMPLE_OPTIONS) {
  return sampleAboutNarrativePlanInto(
    plan,
    storyWU,
    createAboutNarrativeFrameSample(),
    options,
  );
}

export function getAboutNarrativePreparationRequest(plan, storyWU) {
  if (!plan?.valid || !plan.sections.length || !plan.worldPreparationDescriptor) return null;
  const clampedStoryWU = Math.max(0, Math.min(plan.maxStoryWU, Number(storyWU) || 0));
  const sectionIndex = findSectionIndex(plan.sections, clampedStoryWU);
  const targetWorldId = plan.sections[sectionIndex].worldState.activeWorld?.sectionId || '';
  if (!targetWorldId) return null;
  return {
    sequenceKey: plan.worldSequenceKey,
    descriptor: plan.worldPreparationDescriptor,
    targetWorldId,
  };
}

export function getAboutNarrativeCueMotionInterval(cue, textMotion = {}) {
  const enter = Number(cue.enter ?? 0);
  const focus = Number(cue.hold ?? ((enter + Number(cue.exit ?? 1)) * 0.5));
  const exit = Number(cue.exit ?? 1);
  const durationScale = Math.max(0.01, Number(textMotion.durationScale ?? 1));
  return {
    start: Math.max(0, focus - ((focus - enter) * durationScale)),
    focus,
    end: Math.min(1, focus + ((exit - focus) * durationScale)),
  };
}

export function getAboutNarrativeReducedCueIndex(cues = [], localProgress, textMotion = {}) {
  const local = clamp01(Number(localProgress) || 0);
  let closestIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  cues.forEach((cue, cueIndex) => {
    const interval = getAboutNarrativeCueMotionInterval(cue, textMotion);
    if (local < interval.start || local > interval.end) return;
    const distance = Math.abs(local - interval.focus);
    if (distance >= closestDistance) return;
    closestIndex = cueIndex;
    closestDistance = distance;
  });

  return closestIndex;
}

export function getAboutNarrativeCueMovement(cue) {
  return cue.motion?.mode === 'vertical' ? 'vertical' : 'spatial';
}

export function sampleAboutNarrativeCue(cue, localProgress, textMotion, reducedMotion = false) {
  const isOpener = cue.preset === 'opener-v1';
  const openerStartY = Number(textMotion.openerStartY ?? 36);
  if (reducedMotion) {
    return { opacity: 1, blur: 0, x: 0, y: isOpener ? openerStartY : 0, z: 0 };
  }
  const interval = getAboutNarrativeCueMotionInterval(cue, textMotion);
  const startY = Number(textMotion.startY ?? -110);
  const endY = Number(textMotion.endY ?? 130);
  const entryDepth = Number(textMotion.entryDepth ?? 360);
  const exitDepth = Number(textMotion.exitDepth ?? 220);
  const maxBlur = Number(textMotion.maxBlur ?? 22);
  if (localProgress < interval.start || localProgress > interval.end) {
    const before = localProgress < interval.start;
    return {
      opacity: 0,
      blur: maxBlur,
      x: 0,
      y: before ? startY : endY,
      z: before ? -entryDepth : exitDepth,
    };
  }
  const span = Math.max(0.00001, interval.end - interval.start);
  const progress = clamp01((localProgress - interval.start) / span);
  const readableStart = clamp01(Number(textMotion.readableStart ?? 0.24));
  const readableEnd = clamp01(Number(textMotion.readableEnd ?? 0.76));
  if (isOpener && interval.start === 0) {
    const fadeOutProgress = readableEnd >= 1
      ? 0
      : clamp01((progress - readableEnd) / (1 - readableEnd));
    const clarity = 1 - applyAboutNarrativeEasing('smoothstep', fadeOutProgress);
    return {
      opacity: clarity,
      blur: mix(maxBlur, 0, clarity),
      x: 0,
      y: mix(openerStartY, endY, progress),
      z: mix(0, exitDepth, progress),
    };
  }
  const clearIn = readableStart <= 0
    ? 1
    : applyAboutNarrativeEasing('smoothstep', progress / readableStart);
  const clearOut = readableEnd >= 1
    ? 1
    : 1 - applyAboutNarrativeEasing('smoothstep', (progress - readableEnd) / (1 - readableEnd));
  const clarity = Math.min(clearIn, clearOut);
  return {
    opacity: clarity,
    blur: mix(maxBlur, 0, clarity),
    x: 0,
    y: mix(startY, endY, progress),
    z: mix(-entryDepth, exitDepth, progress),
  };
}
