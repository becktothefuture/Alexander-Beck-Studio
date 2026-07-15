import {
  cloneAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';

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

function mixVector(from, to, progress) {
  return [
    mix(from[0], to[0], progress),
    mix(from[1], to[1], progress),
    mix(from[2], to[2], progress),
  ];
}

function sampleCameraKeys(keys, localProgress, fallbackFov) {
  const fallback = {
    offset: [0, 0, 0],
    lookAtOffset: [0, 0, -1],
    fov: fallbackFov,
    roll: 0,
  };
  if (!keys.length) return fallback;
  if (localProgress <= keys[0].at) return { ...fallback, ...keys[0] };
  if (localProgress >= keys.at(-1).at) return { ...fallback, ...keys.at(-1) };
  let toIndex = 1;
  while (toIndex < keys.length && localProgress > keys[toIndex].at) toIndex += 1;
  const from = keys[toIndex - 1];
  const to = keys[toIndex];
  const span = Math.max(0.00001, to.at - from.at);
  const progress = applyAboutNarrativeEasing(from.easing, (localProgress - from.at) / span);
  return {
    offset: mixVector(from.offset, to.offset, progress),
    lookAtOffset: mixVector(from.lookAtOffset, to.lookAtOffset, progress),
    fov: mix(from.fov, to.fov, progress),
    roll: mix(from.roll, to.roll, progress),
  };
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
    if (positionGap > 0.5) {
      diagnostics.push({
        level: 'warning',
        code: 'camera-position-gap',
        path: `sections.${index}.camera.keys.0`,
        message: `Camera offset changes ${positionGap.toFixed(2)} WU at the Section boundary.`,
      });
    }
    if (Math.abs(to.fov - from.fov) > 8) {
      diagnostics.push({
        level: 'warning',
        code: 'camera-fov-gap',
        path: `sections.${index}.camera.keys.0`,
        message: 'Camera field of view changes abruptly at the Section boundary.',
      });
    }
  });
  return diagnostics;
}

export function compileAboutNarrativeDocument(input, {
  profile = 'desktop',
  measurements = null,
} = {}) {
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
      totalExtentWU: 0,
    });
  }

  const measuredSections = compileMeasurements(document, profile, measurements);
  const maxStoryWU = Math.max(0, (measuredSections.at(-1)?.endWU || 1) - 1);
  const worldStates = compileWorldClips(measuredSections);
  const sections = measuredSections.map((section, index) => Object.freeze({
    ...section,
    camera: Object.freeze({
      ...section.camera,
      keys: Object.freeze([...section.camera.keys].sort((a, b) => a.at - b.at).map(Object.freeze)),
    }),
    worldState: Object.freeze(worldStates[index]),
  }));
  const completeDiagnostics = [
    ...diagnostics,
    ...compileContinuityDiagnostics(sections),
    ...compileWorldTransitionDiagnostics(sections, maxStoryWU),
  ];
  if (completeDiagnostics.some((item) => item.level === 'error')) {
    return Object.freeze({
      valid: false,
      document,
      diagnostics: Object.freeze(completeDiagnostics),
      profile,
      sections: Object.freeze([]),
      totalExtentWU: 0,
      maxStoryWU: 0,
    });
  }

  return Object.freeze({
    valid: true,
    document,
    profile,
    diagnostics: Object.freeze(completeDiagnostics),
    sections: Object.freeze(sections),
    totalExtentWU: sections.at(-1)?.endWU || 0,
    maxStoryWU,
  });
}

export function sampleAboutNarrativePlan(plan, storyWU, {
  ambientSeconds = 0,
  reducedMotion = false,
  liveAmbient = true,
} = {}) {
  if (!plan?.valid || !plan.sections.length) return null;
  const clampedStoryWU = Math.max(0, Math.min(plan.maxStoryWU, Number(storyWU) || 0));
  const sectionIndex = findSectionIndex(plan.sections, clampedStoryWU);
  const section = plan.sections[sectionIndex];
  const localProgress = clamp01((clampedStoryWU - section.startWU) / section.travelWU);
  const globalCamera = plan.document.globals.camera;
  const cadence = Number.isFinite(section.camera.cadenceOverride)
    ? section.camera.cadenceOverride
    : globalCamera.cadence;
  const cameraKey = sampleCameraKeys(
    section.camera.keys,
    reducedMotion ? 0 : localProgress,
    globalCamera.fov,
  );
  const cameraStoryWU = reducedMotion ? section.startWU : clampedStoryWU;
  const cameraPosition = [
    cameraKey.offset[0],
    cameraKey.offset[1],
    globalCamera.startZ - (cameraStoryWU * cadence) + cameraKey.offset[2],
  ];
  const cameraTarget = [
    cameraPosition[0] + cameraKey.lookAtOffset[0],
    cameraPosition[1] + cameraKey.lookAtOffset[1],
    cameraPosition[2] + cameraKey.lookAtOffset[2],
  ];
  const worldState = section.worldState;
  const transition = worldState.activeWorld?.transitionIn || { start: 0, end: 0, type: 'cut', easing: 'linear' };
  const compiledTransition = worldState.transition;
  const transitionSpanWU = Math.max(0.00001, (compiledTransition?.endWU || 0) - (compiledTransition?.startWU || 0));
  const transitionProgress = transition.type === 'cut' || !compiledTransition
    ? 1
    : applyAboutNarrativeEasing(
      transition.easing,
      (clampedStoryWU - compiledTransition.startWU) / transitionSpanWU,
    );

  return {
    globals: plan.document.globals,
    storyWU: clampedStoryWU,
    storyTime: clampedStoryWU,
    ambientTime: reducedMotion || !liveAmbient ? 0 : ambientSeconds,
    reducedMotion,
    sectionIndex,
    section,
    localProgress,
    camera: {
      position: cameraPosition,
      target: cameraTarget,
      fov: reducedMotion ? globalCamera.fov : cameraKey.fov,
      roll: reducedMotion ? 0 : cameraKey.roll,
      cadence,
    },
    world: {
      from: worldState.previousWorld,
      to: worldState.activeWorld,
      changes: worldState.changesWorld,
      transitionProgress: reducedMotion ? 1 : transitionProgress,
      transition: {
        ...transition,
        startWU: compiledTransition?.startWU ?? section.startWU,
        endWU: compiledTransition?.endWU ?? section.startWU,
      },
    },
  };
}

export function sampleAboutNarrativeCue(cue, localProgress, textMotion, reducedMotion = false) {
  if (reducedMotion) {
    return { opacity: 1, scale: 1, blur: 0, x: 0, y: 0, z: 0 };
  }
  if (cue.preset === 'opener-v1' && localProgress <= cue.hold) {
    return { opacity: 1, scale: 1, blur: 0, x: 0, y: 0, z: 0 };
  }
  const enterSpan = Math.max(0.00001, cue.hold - cue.enter);
  const exitSpan = Math.max(0.00001, cue.exit - cue.hold);
  if (localProgress < cue.enter || localProgress > cue.exit) {
    return {
      opacity: 0,
      scale: localProgress < cue.enter ? textMotion.farScale : textMotion.nearScale,
      blur: textMotion.maxBlur,
      x: 0,
      y: localProgress < cue.enter ? 0 : -textMotion.exitDrift,
      z: localProgress < cue.enter ? -textMotion.entryDepth : textMotion.exitDepth,
    };
  }
  if (localProgress <= cue.hold) {
    const progress = applyAboutNarrativeEasing('ease-out', (localProgress - cue.enter) / enterSpan);
    return {
      opacity: progress,
      scale: mix(textMotion.farScale, 1, progress),
      blur: mix(textMotion.maxBlur * 0.85, 0, progress),
      x: 0,
      y: 0,
      z: mix(-textMotion.entryDepth, 0, progress),
    };
  }
  if (cue.exit >= 1 && cue.preset === 'finale-v1') {
    return { opacity: 1, scale: 1, blur: 0, x: 0, y: 0, z: 0 };
  }
  const progress = applyAboutNarrativeEasing('ease-out', (localProgress - cue.hold) / exitSpan);
  return {
    opacity: 1 - progress,
    scale: mix(1, textMotion.nearScale, progress),
    blur: mix(0, textMotion.maxBlur, progress),
    x: 0,
    y: mix(0, -textMotion.exitDrift, progress),
    z: mix(0, textMotion.exitDepth, progress),
  };
}
