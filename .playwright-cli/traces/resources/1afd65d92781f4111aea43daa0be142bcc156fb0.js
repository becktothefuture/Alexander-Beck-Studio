import {
  cloneAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from "/src/routes/about-narrative-lab/aboutNarrativeSchema.js";

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
  const disciplineReveal = compileDisciplineReveal(sections);
  const worldSequence = Object.freeze(sections
    .filter((section) => section.worldState.changesWorld)
    .map((section) => section.worldState.activeWorld));

  return Object.freeze({
    valid: true,
    document,
    profile,
    diagnostics: Object.freeze(completeDiagnostics),
    sections: Object.freeze(sections),
    worldSequence,
    disciplineReveal,
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
  const disciplineReveal = plan.disciplineReveal
    ? {
      ...plan.disciplineReveal,
      localProgress: (clampedStoryWU - plan.disciplineReveal.startWU) / plan.disciplineReveal.travelWU,
    }
    : null;

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
      sequence: plan.worldSequence,
      changes: worldState.changesWorld,
      transitionProgress: reducedMotion ? 1 : transitionProgress,
      transition: {
        ...transition,
        startWU: compiledTransition?.startWU ?? section.startWU,
        endWU: compiledTransition?.endWU ?? section.startWU,
      },
    },
    disciplineReveal,
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

export function getAboutNarrativeCueMovement(cue) {
  return cue.motion?.mode === 'vertical' ? 'vertical' : 'spatial';
}

export function sampleAboutNarrativeCue(cue, localProgress, textMotion, reducedMotion = false) {
  const isOpener = cue.preset === 'opener-v1';
  const openerStartY = Number(textMotion.openerStartY ?? 36);
  if (reducedMotion) {
    return { opacity: 1, scale: 1, blur: 0, x: 0, y: isOpener ? openerStartY : 0, z: 0 };
  }
  const interval = getAboutNarrativeCueMotionInterval(cue, textMotion);
  const startY = Number(textMotion.startY ?? -110);
  const endY = Number(textMotion.endY ?? 130);
  const entryDepth = Number(textMotion.entryDepth ?? 360);
  const exitDepth = Number(textMotion.exitDepth ?? 220);
  const farScale = Number(textMotion.farScale ?? 0.78);
  const nearScale = Number(textMotion.nearScale ?? 1.14);
  const maxBlur = Number(textMotion.maxBlur ?? 22);
  if (localProgress < interval.start || localProgress > interval.end) {
    const before = localProgress < interval.start;
    return {
      opacity: 0,
      scale: before ? farScale : nearScale,
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
      scale: mix(1, nearScale, progress),
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
    scale: mix(farScale, nearScale, progress),
    blur: mix(maxBlur, 0, clarity),
    x: 0,
    y: mix(startY, endY, progress),
    z: mix(-entryDepth, exitDepth, progress),
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0TmFycmF0aXZlQ29tcGlsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBub3JtYWxpemVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICB2YWxpZGF0ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gXCIvc3JjL3JvdXRlcy9hYm91dC1uYXJyYXRpdmUtbGFiL2Fib3V0TmFycmF0aXZlU2NoZW1hLmpzXCI7XG5cbmNvbnN0IGNsYW1wMDEgPSAodmFsdWUpID0+IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHZhbHVlKSk7XG5jb25zdCBtaXggPSAoZnJvbSwgdG8sIHByb2dyZXNzKSA9PiBmcm9tICsgKCh0byAtIGZyb20pICogcHJvZ3Jlc3MpO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZyhuYW1lLCB2YWx1ZSkge1xuICBjb25zdCBwcm9ncmVzcyA9IGNsYW1wMDEodmFsdWUpO1xuICBpZiAobmFtZSA9PT0gJ2xpbmVhcicpIHJldHVybiBwcm9ncmVzcztcbiAgaWYgKG5hbWUgPT09ICdob2xkJykgcmV0dXJuIHByb2dyZXNzIDwgMSA/IDAgOiAxO1xuICBpZiAobmFtZSA9PT0gJ2Vhc2UtaW4nKSByZXR1cm4gcHJvZ3Jlc3MgKiogMztcbiAgaWYgKG5hbWUgPT09ICdlYXNlLW91dCcpIHJldHVybiAxIC0gKCgxIC0gcHJvZ3Jlc3MpICoqIDMpO1xuICBpZiAobmFtZSA9PT0gJ2Vhc2UtaW4tb3V0Jykge1xuICAgIHJldHVybiBwcm9ncmVzcyA8IDAuNSA/IDQgKiAocHJvZ3Jlc3MgKiogMykgOiAxIC0gKCgoLTIgKiBwcm9ncmVzcykgKyAyKSAqKiAzKSAvIDI7XG4gIH1cbiAgcmV0dXJuIHByb2dyZXNzICogcHJvZ3Jlc3MgKiAoMyAtICgyICogcHJvZ3Jlc3MpKTtcbn1cblxuZnVuY3Rpb24gbWl4VmVjdG9yKGZyb20sIHRvLCBwcm9ncmVzcykge1xuICByZXR1cm4gW1xuICAgIG1peChmcm9tWzBdLCB0b1swXSwgcHJvZ3Jlc3MpLFxuICAgIG1peChmcm9tWzFdLCB0b1sxXSwgcHJvZ3Jlc3MpLFxuICAgIG1peChmcm9tWzJdLCB0b1syXSwgcHJvZ3Jlc3MpLFxuICBdO1xufVxuXG5mdW5jdGlvbiBzYW1wbGVDYW1lcmFLZXlzKGtleXMsIGxvY2FsUHJvZ3Jlc3MsIGZhbGxiYWNrRm92KSB7XG4gIGNvbnN0IGZhbGxiYWNrID0ge1xuICAgIG9mZnNldDogWzAsIDAsIDBdLFxuICAgIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSxcbiAgICBmb3Y6IGZhbGxiYWNrRm92LFxuICAgIHJvbGw6IDAsXG4gIH07XG4gIGlmICgha2V5cy5sZW5ndGgpIHJldHVybiBmYWxsYmFjaztcbiAgaWYgKGxvY2FsUHJvZ3Jlc3MgPD0ga2V5c1swXS5hdCkgcmV0dXJuIHsgLi4uZmFsbGJhY2ssIC4uLmtleXNbMF0gfTtcbiAgaWYgKGxvY2FsUHJvZ3Jlc3MgPj0ga2V5cy5hdCgtMSkuYXQpIHJldHVybiB7IC4uLmZhbGxiYWNrLCAuLi5rZXlzLmF0KC0xKSB9O1xuICBsZXQgdG9JbmRleCA9IDE7XG4gIHdoaWxlICh0b0luZGV4IDwga2V5cy5sZW5ndGggJiYgbG9jYWxQcm9ncmVzcyA+IGtleXNbdG9JbmRleF0uYXQpIHRvSW5kZXggKz0gMTtcbiAgY29uc3QgZnJvbSA9IGtleXNbdG9JbmRleCAtIDFdO1xuICBjb25zdCB0byA9IGtleXNbdG9JbmRleF07XG4gIGNvbnN0IHNwYW4gPSBNYXRoLm1heCgwLjAwMDAxLCB0by5hdCAtIGZyb20uYXQpO1xuICBjb25zdCBwcm9ncmVzcyA9IGFwcGx5QWJvdXROYXJyYXRpdmVFYXNpbmcoZnJvbS5lYXNpbmcsIChsb2NhbFByb2dyZXNzIC0gZnJvbS5hdCkgLyBzcGFuKTtcbiAgcmV0dXJuIHtcbiAgICBvZmZzZXQ6IG1peFZlY3Rvcihmcm9tLm9mZnNldCwgdG8ub2Zmc2V0LCBwcm9ncmVzcyksXG4gICAgbG9va0F0T2Zmc2V0OiBtaXhWZWN0b3IoZnJvbS5sb29rQXRPZmZzZXQsIHRvLmxvb2tBdE9mZnNldCwgcHJvZ3Jlc3MpLFxuICAgIGZvdjogbWl4KGZyb20uZm92LCB0by5mb3YsIHByb2dyZXNzKSxcbiAgICByb2xsOiBtaXgoZnJvbS5yb2xsLCB0by5yb2xsLCBwcm9ncmVzcyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRTZWN0aW9uSW5kZXgoc2VjdGlvbnMsIHN0b3J5V1UpIHtcbiAgbGV0IGxvdyA9IDA7XG4gIGxldCBoaWdoID0gc2VjdGlvbnMubGVuZ3RoIC0gMTtcbiAgbGV0IHJlc3VsdCA9IDA7XG4gIHdoaWxlIChsb3cgPD0gaGlnaCkge1xuICAgIGNvbnN0IG1pZGRsZSA9IChsb3cgKyBoaWdoKSA+PiAxO1xuICAgIGlmIChzZWN0aW9uc1ttaWRkbGVdLnN0YXJ0V1UgPD0gc3RvcnlXVSkge1xuICAgICAgcmVzdWx0ID0gbWlkZGxlO1xuICAgICAgbG93ID0gbWlkZGxlICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGlnaCA9IG1pZGRsZSAtIDE7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVNZWFzdXJlbWVudHMoZG9jdW1lbnQsIHByb2ZpbGUsIG1lYXN1cmVtZW50cykge1xuICBsZXQgY3VtdWxhdGl2ZVdVID0gMDtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLm1hcCgoc2VjdGlvbikgPT4ge1xuICAgIGNvbnN0IGF1dGhvcmVkRXh0ZW50V1UgPSBwcm9maWxlID09PSAnbW9iaWxlJyA/IHNlY3Rpb24ubW9iaWxlRXh0ZW50V1UgOiBzZWN0aW9uLmV4dGVudFdVO1xuICAgIGNvbnN0IG1lYXN1cmVtZW50ID0gbWVhc3VyZW1lbnRzPy5bc2VjdGlvbi5pZF07XG4gICAgY29uc3Qgc3RhcnRXVSA9IG1lYXN1cmVtZW50ICYmIE51bWJlci5pc0Zpbml0ZShtZWFzdXJlbWVudC50b3BXVSkgPyBtZWFzdXJlbWVudC50b3BXVSA6IGN1bXVsYXRpdmVXVTtcbiAgICBjb25zdCByZXNvbHZlZEV4dGVudFdVID0gbWVhc3VyZW1lbnQgJiYgTnVtYmVyLmlzRmluaXRlKG1lYXN1cmVtZW50LmV4dGVudFdVKVxuICAgICAgPyBNYXRoLm1heChhdXRob3JlZEV4dGVudFdVLCBtZWFzdXJlbWVudC5leHRlbnRXVSlcbiAgICAgIDogYXV0aG9yZWRFeHRlbnRXVTtcbiAgICBjdW11bGF0aXZlV1UgPSBzdGFydFdVICsgcmVzb2x2ZWRFeHRlbnRXVTtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uc2VjdGlvbixcbiAgICAgIGF1dGhvcmVkRXh0ZW50V1UsXG4gICAgICByZXNvbHZlZEV4dGVudFdVLFxuICAgICAgc3RhcnRXVSxcbiAgICAgIGVuZFdVOiBzdGFydFdVICsgcmVzb2x2ZWRFeHRlbnRXVSxcbiAgICAgIHRyYXZlbFdVOiBNYXRoLm1heCgwLjAwMSwgcmVzb2x2ZWRFeHRlbnRXVSAtIDEpLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb21waWxlV29ybGRDbGlwcyhzZWN0aW9ucykge1xuICBsZXQgYWN0aXZlV29ybGQgPSBudWxsO1xuICBsZXQgYWN0aXZlVHJhbnNpdGlvbiA9IG51bGw7XG4gIHJldHVybiBzZWN0aW9ucy5tYXAoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgY2hhbmdlc1dvcmxkID0gc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JztcbiAgICBpZiAoY2hhbmdlc1dvcmxkKSB7XG4gICAgICBjb25zdCBuZXh0V29ybGQgPSB7XG4gICAgICAgIC4uLmNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzZWN0aW9uLndvcmxkKSxcbiAgICAgICAgc2VjdGlvbklkOiBzZWN0aW9uLmlkLFxuICAgICAgICBzZWN0aW9uSW5kZXg6IGluZGV4LFxuICAgICAgICBzdGFydFdVOiBzZWN0aW9uLnN0YXJ0V1UsXG4gICAgICAgIHRyYXZlbFdVOiBzZWN0aW9uLnRyYXZlbFdVLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHByZXZpb3VzV29ybGQgPSBhY3RpdmVXb3JsZCB8fCBuZXh0V29ybGQ7XG4gICAgICBjb25zdCB0cmFuc2l0aW9uID0gbmV4dFdvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgIGFjdGl2ZVdvcmxkID0gbmV4dFdvcmxkO1xuICAgICAgYWN0aXZlVHJhbnNpdGlvbiA9IHtcbiAgICAgICAgZnJvbVdvcmxkOiBwcmV2aW91c1dvcmxkLFxuICAgICAgICB0b1dvcmxkOiBuZXh0V29ybGQsXG4gICAgICAgIHN0YXJ0V1U6IHNlY3Rpb24uc3RhcnRXVSArICh0cmFuc2l0aW9uLnN0YXJ0ICogc2VjdGlvbi50cmF2ZWxXVSksXG4gICAgICAgIGVuZFdVOiBzZWN0aW9uLnN0YXJ0V1UgKyAodHJhbnNpdGlvbi5lbmQgKiBzZWN0aW9uLnRyYXZlbFdVKSxcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBhY3RpdmVXb3JsZCxcbiAgICAgIHByZXZpb3VzV29ybGQ6IGFjdGl2ZVRyYW5zaXRpb24/LmZyb21Xb3JsZCB8fCBhY3RpdmVXb3JsZCxcbiAgICAgIGNoYW5nZXNXb3JsZCxcbiAgICAgIHRyYW5zaXRpb246IGFjdGl2ZVRyYW5zaXRpb24sXG4gICAgfTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0KHBsYW4sIHNlY3Rpb25JbmRleCkge1xuICBjb25zdCBzZWN0aW9uID0gcGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICBpZiAoIXNlY3Rpb24gfHwgc2VjdGlvbi53b3JsZC5tb2RlICE9PSAnc2V0JykgcmV0dXJuIDE7XG4gIGNvbnN0IG5leHRXb3JsZCA9IHBsYW4uc2VjdGlvbnMuc2xpY2Uoc2VjdGlvbkluZGV4ICsgMSkuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk7XG4gIGNvbnN0IGJvdW5kYXJ5V1UgPSBuZXh0V29ybGQ/LnN0YXJ0V1UgPz8gcGxhbi5tYXhTdG9yeVdVO1xuICByZXR1cm4gTWF0aC5tYXgoMCwgKGJvdW5kYXJ5V1UgLSBzZWN0aW9uLnN0YXJ0V1UpIC8gc2VjdGlvbi50cmF2ZWxXVSk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVXb3JsZFRyYW5zaXRpb25EaWFnbm9zdGljcyhzZWN0aW9ucywgbWF4U3RvcnlXVSkge1xuICBjb25zdCBkaWFnbm9zdGljcyA9IFtdO1xuICBjb25zdCBwbGFuTGlrZSA9IHsgc2VjdGlvbnMsIG1heFN0b3J5V1UgfTtcbiAgc2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbiwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSAhPT0gJ3NldCcgfHwgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSA9PT0gJ2N1dCcpIHJldHVybjtcbiAgICBjb25zdCBsaW1pdCA9IGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQocGxhbkxpa2UsIHNlY3Rpb25JbmRleCk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluLmVuZCA+IGxpbWl0ICsgMC4wMDAwMSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIGxldmVsOiAnZXJyb3InLFxuICAgICAgICBjb2RlOiAndHJhbnNpdGlvbi1vdmVycnVuJyxcbiAgICAgICAgcGF0aDogYHNlY3Rpb25zLiR7c2VjdGlvbkluZGV4fS53b3JsZC50cmFuc2l0aW9uSW4uZW5kYCxcbiAgICAgICAgbWVzc2FnZTogYFRyYW5zaXRpb24gRW5kIG11c3Qgc3RheSBhdCBvciBiZWZvcmUgJHtsaW1pdC50b0ZpeGVkKDMpfSwgd2hlcmUgdGhlIG5leHQgV29ybGQgYmVnaW5zLmAsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZGlhZ25vc3RpY3M7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVDb250aW51aXR5RGlhZ25vc3RpY3Moc2VjdGlvbnMpIHtcbiAgY29uc3QgZGlhZ25vc3RpY3MgPSBbXTtcbiAgc2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBpZiAoaW5kZXggPT09IDAgfHwgIXNlY3Rpb24uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgcHJldmlvdXMgPSBzZWN0aW9uc1tpbmRleCAtIDFdO1xuICAgIGlmICghcHJldmlvdXMuY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgZnJvbSA9IHByZXZpb3VzLmNhbWVyYS5rZXlzLmF0KC0xKTtcbiAgICBjb25zdCB0byA9IHNlY3Rpb24uY2FtZXJhLmtleXNbMF07XG4gICAgY29uc3QgcG9zaXRpb25HYXAgPSBNYXRoLmh5cG90KFxuICAgICAgdG8ub2Zmc2V0WzBdIC0gZnJvbS5vZmZzZXRbMF0sXG4gICAgICB0by5vZmZzZXRbMV0gLSBmcm9tLm9mZnNldFsxXSxcbiAgICAgIHRvLm9mZnNldFsyXSAtIGZyb20ub2Zmc2V0WzJdLFxuICAgICk7XG4gICAgaWYgKHBvc2l0aW9uR2FwID4gMC4wMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLXBvc2l0aW9uLWdhcCcsXG4gICAgICAgIHBhdGg6IGBzZWN0aW9ucy4ke2luZGV4fS5jYW1lcmEua2V5cy4wYCxcbiAgICAgICAgbWVzc2FnZTogYENhbWVyYSBvZmZzZXQgZGlmZmVycyBieSAke3Bvc2l0aW9uR2FwLnRvRml4ZWQoMil9IFdVIGF0IHRoaXMgYm91bmRhcnkuIFBsYXliYWNrIGluaGVyaXRzIHRoZSBwcmV2aW91cyBlbmRwb2ludCB0byBwcmV2ZW50IGEganVtcC5gLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGFpbUdhcCA9IE1hdGguaHlwb3QoXG4gICAgICB0by5sb29rQXRPZmZzZXRbMF0gLSBmcm9tLmxvb2tBdE9mZnNldFswXSxcbiAgICAgIHRvLmxvb2tBdE9mZnNldFsxXSAtIGZyb20ubG9va0F0T2Zmc2V0WzFdLFxuICAgICAgdG8ubG9va0F0T2Zmc2V0WzJdIC0gZnJvbS5sb29rQXRPZmZzZXRbMl0sXG4gICAgKTtcbiAgICBpZiAoYWltR2FwID4gMC4wMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLWFpbS1nYXAnLFxuICAgICAgICBwYXRoOiBgc2VjdGlvbnMuJHtpbmRleH0uY2FtZXJhLmtleXMuMGAsXG4gICAgICAgIG1lc3NhZ2U6ICdDYW1lcmEgYWltIGRpZmZlcnMgYXQgdGhpcyBib3VuZGFyeS4gUGxheWJhY2sgaW5oZXJpdHMgdGhlIHByZXZpb3VzIGVuZHBvaW50IHRvIHByZXZlbnQgYSByb3RhdGlvbiBqdW1wLicsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKE1hdGguYWJzKHRvLmZvdiAtIGZyb20uZm92KSA+IDAuMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLWZvdi1nYXAnLFxuICAgICAgICBwYXRoOiBgc2VjdGlvbnMuJHtpbmRleH0uY2FtZXJhLmtleXMuMGAsXG4gICAgICAgIG1lc3NhZ2U6ICdDYW1lcmEgZmllbGQgb2YgdmlldyBkaWZmZXJzIGF0IHRoaXMgYm91bmRhcnkuIFBsYXliYWNrIGluaGVyaXRzIHRoZSBwcmV2aW91cyBlbmRwb2ludCB0byBwcmV2ZW50IGEgbGVucyBqdW1wLicsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKE1hdGguYWJzKHRvLnJvbGwgLSBmcm9tLnJvbGwpID4gMC4wMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLXJvbGwtZ2FwJyxcbiAgICAgICAgcGF0aDogYHNlY3Rpb25zLiR7aW5kZXh9LmNhbWVyYS5rZXlzLjBgLFxuICAgICAgICBtZXNzYWdlOiAnQ2FtZXJhIHJvbGwgZGlmZmVycyBhdCB0aGlzIGJvdW5kYXJ5LiBQbGF5YmFjayBpbmhlcml0cyB0aGUgcHJldmlvdXMgZW5kcG9pbnQgdG8gcHJldmVudCBhIHJvdGF0aW9uIGp1bXAuJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkaWFnbm9zdGljcztcbn1cblxuZnVuY3Rpb24gaW5oZXJpdENhbWVyYVBvc2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgcmV0dXJuIHtcbiAgICAuLi50YXJnZXQsXG4gICAgb2Zmc2V0OiBbLi4uc291cmNlLm9mZnNldF0sXG4gICAgbG9va0F0T2Zmc2V0OiBbLi4uc291cmNlLmxvb2tBdE9mZnNldF0sXG4gICAgZm92OiBzb3VyY2UuZm92LFxuICAgIHJvbGw6IHNvdXJjZS5yb2xsLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb21waWxlRGlzY2lwbGluZVJldmVhbChzZWN0aW9ucykge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBzZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24udGV4dD8uZGlzY2lwbGluZVJldmVhbCk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCAwKSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgc2VjdGlvbkluZGV4LFxuICAgIHN0YXJ0V1U6IHNlY3Rpb24uc3RhcnRXVSxcbiAgICB0cmF2ZWxXVTogc2VjdGlvbi50cmF2ZWxXVSxcbiAgICBjb25maWc6IE9iamVjdC5mcmVlemUoY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSksXG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW5wdXQsIHtcbiAgcHJvZmlsZSA9ICdkZXNrdG9wJyxcbiAgbWVhc3VyZW1lbnRzID0gbnVsbCxcbn0gPSB7fSkge1xuICBjb25zdCBkb2N1bWVudCA9IG5vcm1hbGl6ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW5wdXQpO1xuICBjb25zdCBkaWFnbm9zdGljcyA9IHZhbGlkYXRlQWJvdXROYXJyYXRpdmVEb2N1bWVudChkb2N1bWVudCk7XG4gIGNvbnN0IGVycm9ycyA9IGRpYWdub3N0aWNzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJyk7XG4gIGlmIChlcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBkaWFnbm9zdGljczogT2JqZWN0LmZyZWV6ZShkaWFnbm9zdGljcyksXG4gICAgICBwcm9maWxlLFxuICAgICAgc2VjdGlvbnM6IE9iamVjdC5mcmVlemUoW10pLFxuICAgICAgdG90YWxFeHRlbnRXVTogMCxcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IG1lYXN1cmVkU2VjdGlvbnMgPSBjb21waWxlTWVhc3VyZW1lbnRzKGRvY3VtZW50LCBwcm9maWxlLCBtZWFzdXJlbWVudHMpO1xuICBjb25zdCBtYXhTdG9yeVdVID0gTWF0aC5tYXgoMCwgKG1lYXN1cmVkU2VjdGlvbnMuYXQoLTEpPy5lbmRXVSB8fCAxKSAtIDEpO1xuICBjb25zdCB3b3JsZFN0YXRlcyA9IGNvbXBpbGVXb3JsZENsaXBzKG1lYXN1cmVkU2VjdGlvbnMpO1xuICBjb25zdCBjb250aW51aXR5RGlhZ25vc3RpY3MgPSBjb21waWxlQ29udGludWl0eURpYWdub3N0aWNzKG1lYXN1cmVkU2VjdGlvbnMpO1xuICBjb25zdCBzZWN0aW9ucyA9IG1lYXN1cmVkU2VjdGlvbnMucmVkdWNlKChjb21waWxlZCwgc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBrZXlzID0gWy4uLnNlY3Rpb24uY2FtZXJhLmtleXNdXG4gICAgICAuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpXG4gICAgICAubWFwKChrZXkpID0+ICh7IC4uLmtleSwgb2Zmc2V0OiBbLi4ua2V5Lm9mZnNldF0sIGxvb2tBdE9mZnNldDogWy4uLmtleS5sb29rQXRPZmZzZXRdIH0pKTtcbiAgICBjb25zdCBwcmV2aW91c0VuZCA9IGNvbXBpbGVkLmF0KC0xKT8uY2FtZXJhLmtleXMuYXQoLTEpO1xuICAgIGlmIChwcmV2aW91c0VuZCAmJiBrZXlzLmxlbmd0aCkga2V5c1swXSA9IGluaGVyaXRDYW1lcmFQb3NlKGtleXNbMF0sIHByZXZpb3VzRW5kKTtcbiAgICBjb21waWxlZC5wdXNoKE9iamVjdC5mcmVlemUoe1xuICAgICAgLi4uc2VjdGlvbixcbiAgICAgIGNhbWVyYTogT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIC4uLnNlY3Rpb24uY2FtZXJhLFxuICAgICAgICBrZXlzOiBPYmplY3QuZnJlZXplKGtleXMubWFwKE9iamVjdC5mcmVlemUpKSxcbiAgICAgIH0pLFxuICAgICAgd29ybGRTdGF0ZTogT2JqZWN0LmZyZWV6ZSh3b3JsZFN0YXRlc1tpbmRleF0pLFxuICAgIH0pKTtcbiAgICByZXR1cm4gY29tcGlsZWQ7XG4gIH0sIFtdKTtcbiAgY29uc3QgY29tcGxldGVEaWFnbm9zdGljcyA9IFtcbiAgICAuLi5kaWFnbm9zdGljcyxcbiAgICAuLi5jb250aW51aXR5RGlhZ25vc3RpY3MsXG4gICAgLi4uY29tcGlsZVdvcmxkVHJhbnNpdGlvbkRpYWdub3N0aWNzKHNlY3Rpb25zLCBtYXhTdG9yeVdVKSxcbiAgXTtcbiAgaWYgKGNvbXBsZXRlRGlhZ25vc3RpY3Muc29tZSgoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJykpIHtcbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICBkb2N1bWVudCxcbiAgICAgIGRpYWdub3N0aWNzOiBPYmplY3QuZnJlZXplKGNvbXBsZXRlRGlhZ25vc3RpY3MpLFxuICAgICAgcHJvZmlsZSxcbiAgICAgIHNlY3Rpb25zOiBPYmplY3QuZnJlZXplKFtdKSxcbiAgICAgIHRvdGFsRXh0ZW50V1U6IDAsXG4gICAgICBtYXhTdG9yeVdVOiAwLFxuICAgIH0pO1xuICB9XG4gIGNvbnN0IGRpc2NpcGxpbmVSZXZlYWwgPSBjb21waWxlRGlzY2lwbGluZVJldmVhbChzZWN0aW9ucyk7XG4gIGNvbnN0IHdvcmxkU2VxdWVuY2UgPSBPYmplY3QuZnJlZXplKHNlY3Rpb25zXG4gICAgLmZpbHRlcigoc2VjdGlvbikgPT4gc2VjdGlvbi53b3JsZFN0YXRlLmNoYW5nZXNXb3JsZClcbiAgICAubWFwKChzZWN0aW9uKSA9PiBzZWN0aW9uLndvcmxkU3RhdGUuYWN0aXZlV29ybGQpKTtcblxuICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQsXG4gICAgcHJvZmlsZSxcbiAgICBkaWFnbm9zdGljczogT2JqZWN0LmZyZWV6ZShjb21wbGV0ZURpYWdub3N0aWNzKSxcbiAgICBzZWN0aW9uczogT2JqZWN0LmZyZWV6ZShzZWN0aW9ucyksXG4gICAgd29ybGRTZXF1ZW5jZSxcbiAgICBkaXNjaXBsaW5lUmV2ZWFsLFxuICAgIHRvdGFsRXh0ZW50V1U6IHNlY3Rpb25zLmF0KC0xKT8uZW5kV1UgfHwgMCxcbiAgICBtYXhTdG9yeVdVLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbihwbGFuLCBzdG9yeVdVLCB7XG4gIGFtYmllbnRTZWNvbmRzID0gMCxcbiAgcmVkdWNlZE1vdGlvbiA9IGZhbHNlLFxuICBsaXZlQW1iaWVudCA9IHRydWUsXG59ID0ge30pIHtcbiAgaWYgKCFwbGFuPy52YWxpZCB8fCAhcGxhbi5zZWN0aW9ucy5sZW5ndGgpIHJldHVybiBudWxsO1xuICBjb25zdCBjbGFtcGVkU3RvcnlXVSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBsYW4ubWF4U3RvcnlXVSwgTnVtYmVyKHN0b3J5V1UpIHx8IDApKTtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZmluZFNlY3Rpb25JbmRleChwbGFuLnNlY3Rpb25zLCBjbGFtcGVkU3RvcnlXVSk7XG4gIGNvbnN0IHNlY3Rpb24gPSBwbGFuLnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IGxvY2FsUHJvZ3Jlc3MgPSBjbGFtcDAxKChjbGFtcGVkU3RvcnlXVSAtIHNlY3Rpb24uc3RhcnRXVSkgLyBzZWN0aW9uLnRyYXZlbFdVKTtcbiAgY29uc3QgZ2xvYmFsQ2FtZXJhID0gcGxhbi5kb2N1bWVudC5nbG9iYWxzLmNhbWVyYTtcbiAgY29uc3QgY2FkZW5jZSA9IE51bWJlci5pc0Zpbml0ZShzZWN0aW9uLmNhbWVyYS5jYWRlbmNlT3ZlcnJpZGUpXG4gICAgPyBzZWN0aW9uLmNhbWVyYS5jYWRlbmNlT3ZlcnJpZGVcbiAgICA6IGdsb2JhbENhbWVyYS5jYWRlbmNlO1xuICBjb25zdCBjYW1lcmFLZXkgPSBzYW1wbGVDYW1lcmFLZXlzKFxuICAgIHNlY3Rpb24uY2FtZXJhLmtleXMsXG4gICAgcmVkdWNlZE1vdGlvbiA/IDAgOiBsb2NhbFByb2dyZXNzLFxuICAgIGdsb2JhbENhbWVyYS5mb3YsXG4gICk7XG4gIGNvbnN0IGNhbWVyYVN0b3J5V1UgPSByZWR1Y2VkTW90aW9uID8gc2VjdGlvbi5zdGFydFdVIDogY2xhbXBlZFN0b3J5V1U7XG4gIGNvbnN0IGNhbWVyYVBvc2l0aW9uID0gW1xuICAgIGNhbWVyYUtleS5vZmZzZXRbMF0sXG4gICAgY2FtZXJhS2V5Lm9mZnNldFsxXSxcbiAgICBnbG9iYWxDYW1lcmEuc3RhcnRaIC0gKGNhbWVyYVN0b3J5V1UgKiBjYWRlbmNlKSArIGNhbWVyYUtleS5vZmZzZXRbMl0sXG4gIF07XG4gIGNvbnN0IGNhbWVyYVRhcmdldCA9IFtcbiAgICBjYW1lcmFQb3NpdGlvblswXSArIGNhbWVyYUtleS5sb29rQXRPZmZzZXRbMF0sXG4gICAgY2FtZXJhUG9zaXRpb25bMV0gKyBjYW1lcmFLZXkubG9va0F0T2Zmc2V0WzFdLFxuICAgIGNhbWVyYVBvc2l0aW9uWzJdICsgY2FtZXJhS2V5Lmxvb2tBdE9mZnNldFsyXSxcbiAgXTtcbiAgY29uc3Qgd29ybGRTdGF0ZSA9IHNlY3Rpb24ud29ybGRTdGF0ZTtcbiAgY29uc3QgdHJhbnNpdGlvbiA9IHdvcmxkU3RhdGUuYWN0aXZlV29ybGQ/LnRyYW5zaXRpb25JbiB8fCB7IHN0YXJ0OiAwLCBlbmQ6IDAsIHR5cGU6ICdjdXQnLCBlYXNpbmc6ICdsaW5lYXInIH07XG4gIGNvbnN0IGNvbXBpbGVkVHJhbnNpdGlvbiA9IHdvcmxkU3RhdGUudHJhbnNpdGlvbjtcbiAgY29uc3QgdHJhbnNpdGlvblNwYW5XVSA9IE1hdGgubWF4KDAuMDAwMDEsIChjb21waWxlZFRyYW5zaXRpb24/LmVuZFdVIHx8IDApIC0gKGNvbXBpbGVkVHJhbnNpdGlvbj8uc3RhcnRXVSB8fCAwKSk7XG4gIGNvbnN0IHRyYW5zaXRpb25Qcm9ncmVzcyA9IHRyYW5zaXRpb24udHlwZSA9PT0gJ2N1dCcgfHwgIWNvbXBpbGVkVHJhbnNpdGlvblxuICAgID8gMVxuICAgIDogYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZyhcbiAgICAgIHRyYW5zaXRpb24uZWFzaW5nLFxuICAgICAgKGNsYW1wZWRTdG9yeVdVIC0gY29tcGlsZWRUcmFuc2l0aW9uLnN0YXJ0V1UpIC8gdHJhbnNpdGlvblNwYW5XVSxcbiAgICApO1xuICBjb25zdCBkaXNjaXBsaW5lUmV2ZWFsID0gcGxhbi5kaXNjaXBsaW5lUmV2ZWFsXG4gICAgPyB7XG4gICAgICAuLi5wbGFuLmRpc2NpcGxpbmVSZXZlYWwsXG4gICAgICBsb2NhbFByb2dyZXNzOiAoY2xhbXBlZFN0b3J5V1UgLSBwbGFuLmRpc2NpcGxpbmVSZXZlYWwuc3RhcnRXVSkgLyBwbGFuLmRpc2NpcGxpbmVSZXZlYWwudHJhdmVsV1UsXG4gICAgfVxuICAgIDogbnVsbDtcblxuICByZXR1cm4ge1xuICAgIGdsb2JhbHM6IHBsYW4uZG9jdW1lbnQuZ2xvYmFscyxcbiAgICBzdG9yeVdVOiBjbGFtcGVkU3RvcnlXVSxcbiAgICBzdG9yeVRpbWU6IGNsYW1wZWRTdG9yeVdVLFxuICAgIGFtYmllbnRUaW1lOiByZWR1Y2VkTW90aW9uIHx8ICFsaXZlQW1iaWVudCA/IDAgOiBhbWJpZW50U2Vjb25kcyxcbiAgICByZWR1Y2VkTW90aW9uLFxuICAgIHNlY3Rpb25JbmRleCxcbiAgICBzZWN0aW9uLFxuICAgIGxvY2FsUHJvZ3Jlc3MsXG4gICAgY2FtZXJhOiB7XG4gICAgICBwb3NpdGlvbjogY2FtZXJhUG9zaXRpb24sXG4gICAgICB0YXJnZXQ6IGNhbWVyYVRhcmdldCxcbiAgICAgIGZvdjogcmVkdWNlZE1vdGlvbiA/IGdsb2JhbENhbWVyYS5mb3YgOiBjYW1lcmFLZXkuZm92LFxuICAgICAgcm9sbDogcmVkdWNlZE1vdGlvbiA/IDAgOiBjYW1lcmFLZXkucm9sbCxcbiAgICAgIGNhZGVuY2UsXG4gICAgfSxcbiAgICB3b3JsZDoge1xuICAgICAgZnJvbTogd29ybGRTdGF0ZS5wcmV2aW91c1dvcmxkLFxuICAgICAgdG86IHdvcmxkU3RhdGUuYWN0aXZlV29ybGQsXG4gICAgICBzZXF1ZW5jZTogcGxhbi53b3JsZFNlcXVlbmNlLFxuICAgICAgY2hhbmdlczogd29ybGRTdGF0ZS5jaGFuZ2VzV29ybGQsXG4gICAgICB0cmFuc2l0aW9uUHJvZ3Jlc3M6IHJlZHVjZWRNb3Rpb24gPyAxIDogdHJhbnNpdGlvblByb2dyZXNzLFxuICAgICAgdHJhbnNpdGlvbjoge1xuICAgICAgICAuLi50cmFuc2l0aW9uLFxuICAgICAgICBzdGFydFdVOiBjb21waWxlZFRyYW5zaXRpb24/LnN0YXJ0V1UgPz8gc2VjdGlvbi5zdGFydFdVLFxuICAgICAgICBlbmRXVTogY29tcGlsZWRUcmFuc2l0aW9uPy5lbmRXVSA/PyBzZWN0aW9uLnN0YXJ0V1UsXG4gICAgICB9LFxuICAgIH0sXG4gICAgZGlzY2lwbGluZVJldmVhbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCB0ZXh0TW90aW9uID0ge30pIHtcbiAgY29uc3QgZW50ZXIgPSBOdW1iZXIoY3VlLmVudGVyID8/IDApO1xuICBjb25zdCBmb2N1cyA9IE51bWJlcihjdWUuaG9sZCA/PyAoKGVudGVyICsgTnVtYmVyKGN1ZS5leGl0ID8/IDEpKSAqIDAuNSkpO1xuICBjb25zdCBleGl0ID0gTnVtYmVyKGN1ZS5leGl0ID8/IDEpO1xuICBjb25zdCBkdXJhdGlvblNjYWxlID0gTWF0aC5tYXgoMC4wMSwgTnVtYmVyKHRleHRNb3Rpb24uZHVyYXRpb25TY2FsZSA/PyAxKSk7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IE1hdGgubWF4KDAsIGZvY3VzIC0gKChmb2N1cyAtIGVudGVyKSAqIGR1cmF0aW9uU2NhbGUpKSxcbiAgICBmb2N1cyxcbiAgICBlbmQ6IE1hdGgubWluKDEsIGZvY3VzICsgKChleGl0IC0gZm9jdXMpICogZHVyYXRpb25TY2FsZSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpIHtcbiAgcmV0dXJuIGN1ZS5tb3Rpb24/Lm1vZGUgPT09ICd2ZXJ0aWNhbCcgPyAndmVydGljYWwnIDogJ3NwYXRpYWwnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlQWJvdXROYXJyYXRpdmVDdWUoY3VlLCBsb2NhbFByb2dyZXNzLCB0ZXh0TW90aW9uLCByZWR1Y2VkTW90aW9uID0gZmFsc2UpIHtcbiAgY29uc3QgaXNPcGVuZXIgPSBjdWUucHJlc2V0ID09PSAnb3BlbmVyLXYxJztcbiAgY29uc3Qgb3BlbmVyU3RhcnRZID0gTnVtYmVyKHRleHRNb3Rpb24ub3BlbmVyU3RhcnRZID8/IDM2KTtcbiAgaWYgKHJlZHVjZWRNb3Rpb24pIHtcbiAgICByZXR1cm4geyBvcGFjaXR5OiAxLCBzY2FsZTogMSwgYmx1cjogMCwgeDogMCwgeTogaXNPcGVuZXIgPyBvcGVuZXJTdGFydFkgOiAwLCB6OiAwIH07XG4gIH1cbiAgY29uc3QgaW50ZXJ2YWwgPSBnZXRBYm91dE5hcnJhdGl2ZUN1ZU1vdGlvbkludGVydmFsKGN1ZSwgdGV4dE1vdGlvbik7XG4gIGNvbnN0IHN0YXJ0WSA9IE51bWJlcih0ZXh0TW90aW9uLnN0YXJ0WSA/PyAtMTEwKTtcbiAgY29uc3QgZW5kWSA9IE51bWJlcih0ZXh0TW90aW9uLmVuZFkgPz8gMTMwKTtcbiAgY29uc3QgZW50cnlEZXB0aCA9IE51bWJlcih0ZXh0TW90aW9uLmVudHJ5RGVwdGggPz8gMzYwKTtcbiAgY29uc3QgZXhpdERlcHRoID0gTnVtYmVyKHRleHRNb3Rpb24uZXhpdERlcHRoID8/IDIyMCk7XG4gIGNvbnN0IGZhclNjYWxlID0gTnVtYmVyKHRleHRNb3Rpb24uZmFyU2NhbGUgPz8gMC43OCk7XG4gIGNvbnN0IG5lYXJTY2FsZSA9IE51bWJlcih0ZXh0TW90aW9uLm5lYXJTY2FsZSA/PyAxLjE0KTtcbiAgY29uc3QgbWF4Qmx1ciA9IE51bWJlcih0ZXh0TW90aW9uLm1heEJsdXIgPz8gMjIpO1xuICBpZiAobG9jYWxQcm9ncmVzcyA8IGludGVydmFsLnN0YXJ0IHx8IGxvY2FsUHJvZ3Jlc3MgPiBpbnRlcnZhbC5lbmQpIHtcbiAgICBjb25zdCBiZWZvcmUgPSBsb2NhbFByb2dyZXNzIDwgaW50ZXJ2YWwuc3RhcnQ7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wYWNpdHk6IDAsXG4gICAgICBzY2FsZTogYmVmb3JlID8gZmFyU2NhbGUgOiBuZWFyU2NhbGUsXG4gICAgICBibHVyOiBtYXhCbHVyLFxuICAgICAgeDogMCxcbiAgICAgIHk6IGJlZm9yZSA/IHN0YXJ0WSA6IGVuZFksXG4gICAgICB6OiBiZWZvcmUgPyAtZW50cnlEZXB0aCA6IGV4aXREZXB0aCxcbiAgICB9O1xuICB9XG4gIGNvbnN0IHNwYW4gPSBNYXRoLm1heCgwLjAwMDAxLCBpbnRlcnZhbC5lbmQgLSBpbnRlcnZhbC5zdGFydCk7XG4gIGNvbnN0IHByb2dyZXNzID0gY2xhbXAwMSgobG9jYWxQcm9ncmVzcyAtIGludGVydmFsLnN0YXJ0KSAvIHNwYW4pO1xuICBjb25zdCByZWFkYWJsZVN0YXJ0ID0gY2xhbXAwMShOdW1iZXIodGV4dE1vdGlvbi5yZWFkYWJsZVN0YXJ0ID8/IDAuMjQpKTtcbiAgY29uc3QgcmVhZGFibGVFbmQgPSBjbGFtcDAxKE51bWJlcih0ZXh0TW90aW9uLnJlYWRhYmxlRW5kID8/IDAuNzYpKTtcbiAgaWYgKGlzT3BlbmVyICYmIGludGVydmFsLnN0YXJ0ID09PSAwKSB7XG4gICAgY29uc3QgZmFkZU91dFByb2dyZXNzID0gcmVhZGFibGVFbmQgPj0gMVxuICAgICAgPyAwXG4gICAgICA6IGNsYW1wMDEoKHByb2dyZXNzIC0gcmVhZGFibGVFbmQpIC8gKDEgLSByZWFkYWJsZUVuZCkpO1xuICAgIGNvbnN0IGNsYXJpdHkgPSAxIC0gYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZygnc21vb3Roc3RlcCcsIGZhZGVPdXRQcm9ncmVzcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wYWNpdHk6IGNsYXJpdHksXG4gICAgICBzY2FsZTogbWl4KDEsIG5lYXJTY2FsZSwgcHJvZ3Jlc3MpLFxuICAgICAgYmx1cjogbWl4KG1heEJsdXIsIDAsIGNsYXJpdHkpLFxuICAgICAgeDogMCxcbiAgICAgIHk6IG1peChvcGVuZXJTdGFydFksIGVuZFksIHByb2dyZXNzKSxcbiAgICAgIHo6IG1peCgwLCBleGl0RGVwdGgsIHByb2dyZXNzKSxcbiAgICB9O1xuICB9XG4gIGNvbnN0IGNsZWFySW4gPSByZWFkYWJsZVN0YXJ0IDw9IDBcbiAgICA/IDFcbiAgICA6IGFwcGx5QWJvdXROYXJyYXRpdmVFYXNpbmcoJ3Ntb290aHN0ZXAnLCBwcm9ncmVzcyAvIHJlYWRhYmxlU3RhcnQpO1xuICBjb25zdCBjbGVhck91dCA9IHJlYWRhYmxlRW5kID49IDFcbiAgICA/IDFcbiAgICA6IDEgLSBhcHBseUFib3V0TmFycmF0aXZlRWFzaW5nKCdzbW9vdGhzdGVwJywgKHByb2dyZXNzIC0gcmVhZGFibGVFbmQpIC8gKDEgLSByZWFkYWJsZUVuZCkpO1xuICBjb25zdCBjbGFyaXR5ID0gTWF0aC5taW4oY2xlYXJJbiwgY2xlYXJPdXQpO1xuICByZXR1cm4ge1xuICAgIG9wYWNpdHk6IGNsYXJpdHksXG4gICAgc2NhbGU6IG1peChmYXJTY2FsZSwgbmVhclNjYWxlLCBwcm9ncmVzcyksXG4gICAgYmx1cjogbWl4KG1heEJsdXIsIDAsIGNsYXJpdHkpLFxuICAgIHg6IDAsXG4gICAgeTogbWl4KHN0YXJ0WSwgZW5kWSwgcHJvZ3Jlc3MpLFxuICAgIHo6IG1peCgtZW50cnlEZXB0aCwgZXhpdERlcHRoLCBwcm9ncmVzcyksXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDO0FBQ1AsQ0FBQyxDQUFDLDJCQUEyQjtBQUM3QixDQUFDLENBQUMsK0JBQStCO0FBQ2pDLENBQUMsQ0FBQyw4QkFBOEI7QUFDaEMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7O0FBRWhFLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzFELEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDOztBQUVuRSxNQUFNLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7QUFDeEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ25EOztBQUVBLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDO0FBQ0g7O0FBRUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFdBQVc7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7QUFDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUMxQixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUNqRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUMzRixDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFD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QyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3pGLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMscUNBQXFDLENBQUMsUUFBUSxDQUFDLENBQUMsWUFBWSxDQUFDO0FBQy9FLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDMUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVc7QUFDcEI7O0FBRUEsUUFBUSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hELENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU07QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU07QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNySixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzVILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXO0FBQ3BC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Q0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9GLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQ3JGLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElB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LEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ2pFOztBQUVBLE1BQU0sQ0FBQyxRQUFRLENBQUMsdUJBQXVCLENBQUMsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvRixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztBQUM3QyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzVELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hGLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxrQ0FBa0MsQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDdEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDN0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN6RCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3hELENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUs7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFD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