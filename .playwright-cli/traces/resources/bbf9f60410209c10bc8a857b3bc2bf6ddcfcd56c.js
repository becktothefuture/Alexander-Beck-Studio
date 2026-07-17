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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFib3V0TmFycmF0aXZlQ29tcGlsZXIuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICBub3JtYWxpemVBYm91dE5hcnJhdGl2ZURvY3VtZW50LFxuICB2YWxpZGF0ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQsXG59IGZyb20gXCIvc3JjL3JvdXRlcy9hYm91dC1uYXJyYXRpdmUtbGFiL2Fib3V0TmFycmF0aXZlU2NoZW1hLmpzXCI7XG5cbmNvbnN0IGNsYW1wMDEgPSAodmFsdWUpID0+IE1hdGgubWluKDEsIE1hdGgubWF4KDAsIHZhbHVlKSk7XG5jb25zdCBtaXggPSAoZnJvbSwgdG8sIHByb2dyZXNzKSA9PiBmcm9tICsgKCh0byAtIGZyb20pICogcHJvZ3Jlc3MpO1xuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZyhuYW1lLCB2YWx1ZSkge1xuICBjb25zdCBwcm9ncmVzcyA9IGNsYW1wMDEodmFsdWUpO1xuICBpZiAobmFtZSA9PT0gJ2xpbmVhcicpIHJldHVybiBwcm9ncmVzcztcbiAgaWYgKG5hbWUgPT09ICdob2xkJykgcmV0dXJuIHByb2dyZXNzIDwgMSA/IDAgOiAxO1xuICBpZiAobmFtZSA9PT0gJ2Vhc2UtaW4nKSByZXR1cm4gcHJvZ3Jlc3MgKiogMztcbiAgaWYgKG5hbWUgPT09ICdlYXNlLW91dCcpIHJldHVybiAxIC0gKCgxIC0gcHJvZ3Jlc3MpICoqIDMpO1xuICBpZiAobmFtZSA9PT0gJ2Vhc2UtaW4tb3V0Jykge1xuICAgIHJldHVybiBwcm9ncmVzcyA8IDAuNSA/IDQgKiAocHJvZ3Jlc3MgKiogMykgOiAxIC0gKCgoLTIgKiBwcm9ncmVzcykgKyAyKSAqKiAzKSAvIDI7XG4gIH1cbiAgcmV0dXJuIHByb2dyZXNzICogcHJvZ3Jlc3MgKiAoMyAtICgyICogcHJvZ3Jlc3MpKTtcbn1cblxuZnVuY3Rpb24gbWl4VmVjdG9yKGZyb20sIHRvLCBwcm9ncmVzcykge1xuICByZXR1cm4gW1xuICAgIG1peChmcm9tWzBdLCB0b1swXSwgcHJvZ3Jlc3MpLFxuICAgIG1peChmcm9tWzFdLCB0b1sxXSwgcHJvZ3Jlc3MpLFxuICAgIG1peChmcm9tWzJdLCB0b1syXSwgcHJvZ3Jlc3MpLFxuICBdO1xufVxuXG5mdW5jdGlvbiBzYW1wbGVDYW1lcmFLZXlzKGtleXMsIGxvY2FsUHJvZ3Jlc3MsIGZhbGxiYWNrRm92KSB7XG4gIGNvbnN0IGZhbGxiYWNrID0ge1xuICAgIG9mZnNldDogWzAsIDAsIDBdLFxuICAgIGxvb2tBdE9mZnNldDogWzAsIDAsIC0xXSxcbiAgICBmb3Y6IGZhbGxiYWNrRm92LFxuICAgIHJvbGw6IDAsXG4gIH07XG4gIGlmICgha2V5cy5sZW5ndGgpIHJldHVybiBmYWxsYmFjaztcbiAgaWYgKGxvY2FsUHJvZ3Jlc3MgPD0ga2V5c1swXS5hdCkgcmV0dXJuIHsgLi4uZmFsbGJhY2ssIC4uLmtleXNbMF0gfTtcbiAgaWYgKGxvY2FsUHJvZ3Jlc3MgPj0ga2V5cy5hdCgtMSkuYXQpIHJldHVybiB7IC4uLmZhbGxiYWNrLCAuLi5rZXlzLmF0KC0xKSB9O1xuICBsZXQgdG9JbmRleCA9IDE7XG4gIHdoaWxlICh0b0luZGV4IDwga2V5cy5sZW5ndGggJiYgbG9jYWxQcm9ncmVzcyA+IGtleXNbdG9JbmRleF0uYXQpIHRvSW5kZXggKz0gMTtcbiAgY29uc3QgZnJvbSA9IGtleXNbdG9JbmRleCAtIDFdO1xuICBjb25zdCB0byA9IGtleXNbdG9JbmRleF07XG4gIGNvbnN0IHNwYW4gPSBNYXRoLm1heCgwLjAwMDAxLCB0by5hdCAtIGZyb20uYXQpO1xuICBjb25zdCBwcm9ncmVzcyA9IGFwcGx5QWJvdXROYXJyYXRpdmVFYXNpbmcoZnJvbS5lYXNpbmcsIChsb2NhbFByb2dyZXNzIC0gZnJvbS5hdCkgLyBzcGFuKTtcbiAgcmV0dXJuIHtcbiAgICBvZmZzZXQ6IG1peFZlY3Rvcihmcm9tLm9mZnNldCwgdG8ub2Zmc2V0LCBwcm9ncmVzcyksXG4gICAgbG9va0F0T2Zmc2V0OiBtaXhWZWN0b3IoZnJvbS5sb29rQXRPZmZzZXQsIHRvLmxvb2tBdE9mZnNldCwgcHJvZ3Jlc3MpLFxuICAgIGZvdjogbWl4KGZyb20uZm92LCB0by5mb3YsIHByb2dyZXNzKSxcbiAgICByb2xsOiBtaXgoZnJvbS5yb2xsLCB0by5yb2xsLCBwcm9ncmVzcyksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGZpbmRTZWN0aW9uSW5kZXgoc2VjdGlvbnMsIHN0b3J5V1UpIHtcbiAgbGV0IGxvdyA9IDA7XG4gIGxldCBoaWdoID0gc2VjdGlvbnMubGVuZ3RoIC0gMTtcbiAgbGV0IHJlc3VsdCA9IDA7XG4gIHdoaWxlIChsb3cgPD0gaGlnaCkge1xuICAgIGNvbnN0IG1pZGRsZSA9IChsb3cgKyBoaWdoKSA+PiAxO1xuICAgIGlmIChzZWN0aW9uc1ttaWRkbGVdLnN0YXJ0V1UgPD0gc3RvcnlXVSkge1xuICAgICAgcmVzdWx0ID0gbWlkZGxlO1xuICAgICAgbG93ID0gbWlkZGxlICsgMTtcbiAgICB9IGVsc2Uge1xuICAgICAgaGlnaCA9IG1pZGRsZSAtIDE7XG4gICAgfVxuICB9XG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVNZWFzdXJlbWVudHMoZG9jdW1lbnQsIHByb2ZpbGUsIG1lYXN1cmVtZW50cykge1xuICBsZXQgY3VtdWxhdGl2ZVdVID0gMDtcbiAgcmV0dXJuIGRvY3VtZW50LnNlY3Rpb25zLm1hcCgoc2VjdGlvbikgPT4ge1xuICAgIGNvbnN0IGF1dGhvcmVkRXh0ZW50V1UgPSBwcm9maWxlID09PSAnbW9iaWxlJyA/IHNlY3Rpb24ubW9iaWxlRXh0ZW50V1UgOiBzZWN0aW9uLmV4dGVudFdVO1xuICAgIGNvbnN0IG1lYXN1cmVtZW50ID0gbWVhc3VyZW1lbnRzPy5bc2VjdGlvbi5pZF07XG4gICAgY29uc3Qgc3RhcnRXVSA9IG1lYXN1cmVtZW50ICYmIE51bWJlci5pc0Zpbml0ZShtZWFzdXJlbWVudC50b3BXVSkgPyBtZWFzdXJlbWVudC50b3BXVSA6IGN1bXVsYXRpdmVXVTtcbiAgICBjb25zdCByZXNvbHZlZEV4dGVudFdVID0gbWVhc3VyZW1lbnQgJiYgTnVtYmVyLmlzRmluaXRlKG1lYXN1cmVtZW50LmV4dGVudFdVKVxuICAgICAgPyBNYXRoLm1heChhdXRob3JlZEV4dGVudFdVLCBtZWFzdXJlbWVudC5leHRlbnRXVSlcbiAgICAgIDogYXV0aG9yZWRFeHRlbnRXVTtcbiAgICBjdW11bGF0aXZlV1UgPSBzdGFydFdVICsgcmVzb2x2ZWRFeHRlbnRXVTtcbiAgICByZXR1cm4ge1xuICAgICAgLi4uc2VjdGlvbixcbiAgICAgIGF1dGhvcmVkRXh0ZW50V1UsXG4gICAgICByZXNvbHZlZEV4dGVudFdVLFxuICAgICAgc3RhcnRXVSxcbiAgICAgIGVuZFdVOiBzdGFydFdVICsgcmVzb2x2ZWRFeHRlbnRXVSxcbiAgICAgIHRyYXZlbFdVOiBNYXRoLm1heCgwLjAwMSwgcmVzb2x2ZWRFeHRlbnRXVSAtIDEpLFxuICAgIH07XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBjb21waWxlV29ybGRDbGlwcyhzZWN0aW9ucykge1xuICBsZXQgYWN0aXZlV29ybGQgPSBudWxsO1xuICBsZXQgYWN0aXZlVHJhbnNpdGlvbiA9IG51bGw7XG4gIHJldHVybiBzZWN0aW9ucy5tYXAoKHNlY3Rpb24sIGluZGV4KSA9PiB7XG4gICAgY29uc3QgY2hhbmdlc1dvcmxkID0gc2VjdGlvbi53b3JsZC5tb2RlID09PSAnc2V0JztcbiAgICBpZiAoY2hhbmdlc1dvcmxkKSB7XG4gICAgICBjb25zdCBuZXh0V29ybGQgPSB7XG4gICAgICAgIC4uLmNsb25lQWJvdXROYXJyYXRpdmVEb2N1bWVudChzZWN0aW9uLndvcmxkKSxcbiAgICAgICAgc2VjdGlvbklkOiBzZWN0aW9uLmlkLFxuICAgICAgICBzZWN0aW9uSW5kZXg6IGluZGV4LFxuICAgICAgICBzdGFydFdVOiBzZWN0aW9uLnN0YXJ0V1UsXG4gICAgICAgIHRyYXZlbFdVOiBzZWN0aW9uLnRyYXZlbFdVLFxuICAgICAgfTtcbiAgICAgIGNvbnN0IHByZXZpb3VzV29ybGQgPSBhY3RpdmVXb3JsZCB8fCBuZXh0V29ybGQ7XG4gICAgICBjb25zdCB0cmFuc2l0aW9uID0gbmV4dFdvcmxkLnRyYW5zaXRpb25JbjtcbiAgICAgIGFjdGl2ZVdvcmxkID0gbmV4dFdvcmxkO1xuICAgICAgYWN0aXZlVHJhbnNpdGlvbiA9IHtcbiAgICAgICAgZnJvbVdvcmxkOiBwcmV2aW91c1dvcmxkLFxuICAgICAgICB0b1dvcmxkOiBuZXh0V29ybGQsXG4gICAgICAgIHN0YXJ0V1U6IHNlY3Rpb24uc3RhcnRXVSArICh0cmFuc2l0aW9uLnN0YXJ0ICogc2VjdGlvbi50cmF2ZWxXVSksXG4gICAgICAgIGVuZFdVOiBzZWN0aW9uLnN0YXJ0V1UgKyAodHJhbnNpdGlvbi5lbmQgKiBzZWN0aW9uLnRyYXZlbFdVKSxcbiAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiB7XG4gICAgICBhY3RpdmVXb3JsZCxcbiAgICAgIHByZXZpb3VzV29ybGQ6IGFjdGl2ZVRyYW5zaXRpb24/LmZyb21Xb3JsZCB8fCBhY3RpdmVXb3JsZCxcbiAgICAgIGNoYW5nZXNXb3JsZCxcbiAgICAgIHRyYW5zaXRpb246IGFjdGl2ZVRyYW5zaXRpb24sXG4gICAgfTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBYm91dE5hcnJhdGl2ZVdvcmxkVHJhbnNpdGlvbkxpbWl0KHBsYW4sIHNlY3Rpb25JbmRleCkge1xuICBjb25zdCBzZWN0aW9uID0gcGxhbj8uc2VjdGlvbnM/LltzZWN0aW9uSW5kZXhdO1xuICBpZiAoIXNlY3Rpb24gfHwgc2VjdGlvbi53b3JsZC5tb2RlICE9PSAnc2V0JykgcmV0dXJuIDE7XG4gIGNvbnN0IG5leHRXb3JsZCA9IHBsYW4uc2VjdGlvbnMuc2xpY2Uoc2VjdGlvbkluZGV4ICsgMSkuZmluZCgoaXRlbSkgPT4gaXRlbS53b3JsZC5tb2RlID09PSAnc2V0Jyk7XG4gIGNvbnN0IGJvdW5kYXJ5V1UgPSBuZXh0V29ybGQ/LnN0YXJ0V1UgPz8gcGxhbi5tYXhTdG9yeVdVO1xuICByZXR1cm4gTWF0aC5tYXgoMCwgKGJvdW5kYXJ5V1UgLSBzZWN0aW9uLnN0YXJ0V1UpIC8gc2VjdGlvbi50cmF2ZWxXVSk7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVXb3JsZFRyYW5zaXRpb25EaWFnbm9zdGljcyhzZWN0aW9ucywgbWF4U3RvcnlXVSkge1xuICBjb25zdCBkaWFnbm9zdGljcyA9IFtdO1xuICBjb25zdCBwbGFuTGlrZSA9IHsgc2VjdGlvbnMsIG1heFN0b3J5V1UgfTtcbiAgc2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbiwgc2VjdGlvbkluZGV4KSA9PiB7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQubW9kZSAhPT0gJ3NldCcgfHwgc2VjdGlvbi53b3JsZC50cmFuc2l0aW9uSW4udHlwZSA9PT0gJ2N1dCcpIHJldHVybjtcbiAgICBjb25zdCBsaW1pdCA9IGdldEFib3V0TmFycmF0aXZlV29ybGRUcmFuc2l0aW9uTGltaXQocGxhbkxpa2UsIHNlY3Rpb25JbmRleCk7XG4gICAgaWYgKHNlY3Rpb24ud29ybGQudHJhbnNpdGlvbkluLmVuZCA+IGxpbWl0ICsgMC4wMDAwMSkge1xuICAgICAgZGlhZ25vc3RpY3MucHVzaCh7XG4gICAgICAgIGxldmVsOiAnZXJyb3InLFxuICAgICAgICBjb2RlOiAndHJhbnNpdGlvbi1vdmVycnVuJyxcbiAgICAgICAgcGF0aDogYHNlY3Rpb25zLiR7c2VjdGlvbkluZGV4fS53b3JsZC50cmFuc2l0aW9uSW4uZW5kYCxcbiAgICAgICAgbWVzc2FnZTogYFRyYW5zaXRpb24gRW5kIG11c3Qgc3RheSBhdCBvciBiZWZvcmUgJHtsaW1pdC50b0ZpeGVkKDMpfSwgd2hlcmUgdGhlIG5leHQgV29ybGQgYmVnaW5zLmAsXG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZGlhZ25vc3RpY3M7XG59XG5cbmZ1bmN0aW9uIGNvbXBpbGVDb250aW51aXR5RGlhZ25vc3RpY3Moc2VjdGlvbnMpIHtcbiAgY29uc3QgZGlhZ25vc3RpY3MgPSBbXTtcbiAgc2VjdGlvbnMuZm9yRWFjaCgoc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBpZiAoaW5kZXggPT09IDAgfHwgIXNlY3Rpb24uY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgcHJldmlvdXMgPSBzZWN0aW9uc1tpbmRleCAtIDFdO1xuICAgIGlmICghcHJldmlvdXMuY2FtZXJhLmtleXMubGVuZ3RoKSByZXR1cm47XG4gICAgY29uc3QgZnJvbSA9IHByZXZpb3VzLmNhbWVyYS5rZXlzLmF0KC0xKTtcbiAgICBjb25zdCB0byA9IHNlY3Rpb24uY2FtZXJhLmtleXNbMF07XG4gICAgY29uc3QgcG9zaXRpb25HYXAgPSBNYXRoLmh5cG90KFxuICAgICAgdG8ub2Zmc2V0WzBdIC0gZnJvbS5vZmZzZXRbMF0sXG4gICAgICB0by5vZmZzZXRbMV0gLSBmcm9tLm9mZnNldFsxXSxcbiAgICAgIHRvLm9mZnNldFsyXSAtIGZyb20ub2Zmc2V0WzJdLFxuICAgICk7XG4gICAgaWYgKHBvc2l0aW9uR2FwID4gMC4wMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLXBvc2l0aW9uLWdhcCcsXG4gICAgICAgIHBhdGg6IGBzZWN0aW9ucy4ke2luZGV4fS5jYW1lcmEua2V5cy4wYCxcbiAgICAgICAgbWVzc2FnZTogYENhbWVyYSBvZmZzZXQgZGlmZmVycyBieSAke3Bvc2l0aW9uR2FwLnRvRml4ZWQoMil9IFdVIGF0IHRoaXMgYm91bmRhcnkuIFBsYXliYWNrIGluaGVyaXRzIHRoZSBwcmV2aW91cyBlbmRwb2ludCB0byBwcmV2ZW50IGEganVtcC5gLFxuICAgICAgfSk7XG4gICAgfVxuICAgIGNvbnN0IGFpbUdhcCA9IE1hdGguaHlwb3QoXG4gICAgICB0by5sb29rQXRPZmZzZXRbMF0gLSBmcm9tLmxvb2tBdE9mZnNldFswXSxcbiAgICAgIHRvLmxvb2tBdE9mZnNldFsxXSAtIGZyb20ubG9va0F0T2Zmc2V0WzFdLFxuICAgICAgdG8ubG9va0F0T2Zmc2V0WzJdIC0gZnJvbS5sb29rQXRPZmZzZXRbMl0sXG4gICAgKTtcbiAgICBpZiAoYWltR2FwID4gMC4wMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLWFpbS1nYXAnLFxuICAgICAgICBwYXRoOiBgc2VjdGlvbnMuJHtpbmRleH0uY2FtZXJhLmtleXMuMGAsXG4gICAgICAgIG1lc3NhZ2U6ICdDYW1lcmEgYWltIGRpZmZlcnMgYXQgdGhpcyBib3VuZGFyeS4gUGxheWJhY2sgaW5oZXJpdHMgdGhlIHByZXZpb3VzIGVuZHBvaW50IHRvIHByZXZlbnQgYSByb3RhdGlvbiBqdW1wLicsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKE1hdGguYWJzKHRvLmZvdiAtIGZyb20uZm92KSA+IDAuMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLWZvdi1nYXAnLFxuICAgICAgICBwYXRoOiBgc2VjdGlvbnMuJHtpbmRleH0uY2FtZXJhLmtleXMuMGAsXG4gICAgICAgIG1lc3NhZ2U6ICdDYW1lcmEgZmllbGQgb2YgdmlldyBkaWZmZXJzIGF0IHRoaXMgYm91bmRhcnkuIFBsYXliYWNrIGluaGVyaXRzIHRoZSBwcmV2aW91cyBlbmRwb2ludCB0byBwcmV2ZW50IGEgbGVucyBqdW1wLicsXG4gICAgICB9KTtcbiAgICB9XG4gICAgaWYgKE1hdGguYWJzKHRvLnJvbGwgLSBmcm9tLnJvbGwpID4gMC4wMDEpIHtcbiAgICAgIGRpYWdub3N0aWNzLnB1c2goe1xuICAgICAgICBsZXZlbDogJ3dhcm5pbmcnLFxuICAgICAgICBjb2RlOiAnY2FtZXJhLXJvbGwtZ2FwJyxcbiAgICAgICAgcGF0aDogYHNlY3Rpb25zLiR7aW5kZXh9LmNhbWVyYS5rZXlzLjBgLFxuICAgICAgICBtZXNzYWdlOiAnQ2FtZXJhIHJvbGwgZGlmZmVycyBhdCB0aGlzIGJvdW5kYXJ5LiBQbGF5YmFjayBpbmhlcml0cyB0aGUgcHJldmlvdXMgZW5kcG9pbnQgdG8gcHJldmVudCBhIHJvdGF0aW9uIGp1bXAuJyxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBkaWFnbm9zdGljcztcbn1cblxuZnVuY3Rpb24gaW5oZXJpdENhbWVyYVBvc2UodGFyZ2V0LCBzb3VyY2UpIHtcbiAgcmV0dXJuIHtcbiAgICAuLi50YXJnZXQsXG4gICAgb2Zmc2V0OiBbLi4uc291cmNlLm9mZnNldF0sXG4gICAgbG9va0F0T2Zmc2V0OiBbLi4uc291cmNlLmxvb2tBdE9mZnNldF0sXG4gICAgZm92OiBzb3VyY2UuZm92LFxuICAgIHJvbGw6IHNvdXJjZS5yb2xsLFxuICB9O1xufVxuXG5mdW5jdGlvbiBjb21waWxlRGlzY2lwbGluZVJldmVhbChzZWN0aW9ucykge1xuICBjb25zdCBzZWN0aW9uSW5kZXggPSBzZWN0aW9ucy5maW5kSW5kZXgoKHNlY3Rpb24pID0+IHNlY3Rpb24udGV4dD8uZGlzY2lwbGluZVJldmVhbCk7XG4gIGlmIChzZWN0aW9uSW5kZXggPCAwKSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgc2VjdGlvbiA9IHNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIHJldHVybiBPYmplY3QuZnJlZXplKHtcbiAgICBzZWN0aW9uSWQ6IHNlY3Rpb24uaWQsXG4gICAgc2VjdGlvbkluZGV4LFxuICAgIHN0YXJ0V1U6IHNlY3Rpb24uc3RhcnRXVSxcbiAgICB0cmF2ZWxXVTogc2VjdGlvbi50cmF2ZWxXVSxcbiAgICBjb25maWc6IE9iamVjdC5mcmVlemUoY2xvbmVBYm91dE5hcnJhdGl2ZURvY3VtZW50KHNlY3Rpb24udGV4dC5kaXNjaXBsaW5lUmV2ZWFsKSksXG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW5wdXQsIHtcbiAgcHJvZmlsZSA9ICdkZXNrdG9wJyxcbiAgbWVhc3VyZW1lbnRzID0gbnVsbCxcbn0gPSB7fSkge1xuICBjb25zdCBkb2N1bWVudCA9IG5vcm1hbGl6ZUFib3V0TmFycmF0aXZlRG9jdW1lbnQoaW5wdXQpO1xuICBjb25zdCBkaWFnbm9zdGljcyA9IHZhbGlkYXRlQWJvdXROYXJyYXRpdmVEb2N1bWVudChkb2N1bWVudCk7XG4gIGNvbnN0IGVycm9ycyA9IGRpYWdub3N0aWNzLmZpbHRlcigoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJyk7XG4gIGlmIChlcnJvcnMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIE9iamVjdC5mcmVlemUoe1xuICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgZG9jdW1lbnQsXG4gICAgICBkaWFnbm9zdGljczogT2JqZWN0LmZyZWV6ZShkaWFnbm9zdGljcyksXG4gICAgICBwcm9maWxlLFxuICAgICAgc2VjdGlvbnM6IE9iamVjdC5mcmVlemUoW10pLFxuICAgICAgdG90YWxFeHRlbnRXVTogMCxcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0IG1lYXN1cmVkU2VjdGlvbnMgPSBjb21waWxlTWVhc3VyZW1lbnRzKGRvY3VtZW50LCBwcm9maWxlLCBtZWFzdXJlbWVudHMpO1xuICBjb25zdCBtYXhTdG9yeVdVID0gTWF0aC5tYXgoMCwgKG1lYXN1cmVkU2VjdGlvbnMuYXQoLTEpPy5lbmRXVSB8fCAxKSAtIDEpO1xuICBjb25zdCB3b3JsZFN0YXRlcyA9IGNvbXBpbGVXb3JsZENsaXBzKG1lYXN1cmVkU2VjdGlvbnMpO1xuICBjb25zdCBjb250aW51aXR5RGlhZ25vc3RpY3MgPSBjb21waWxlQ29udGludWl0eURpYWdub3N0aWNzKG1lYXN1cmVkU2VjdGlvbnMpO1xuICBjb25zdCBzZWN0aW9ucyA9IG1lYXN1cmVkU2VjdGlvbnMucmVkdWNlKChjb21waWxlZCwgc2VjdGlvbiwgaW5kZXgpID0+IHtcbiAgICBjb25zdCBrZXlzID0gWy4uLnNlY3Rpb24uY2FtZXJhLmtleXNdXG4gICAgICAuc29ydCgoYSwgYikgPT4gYS5hdCAtIGIuYXQpXG4gICAgICAubWFwKChrZXkpID0+ICh7IC4uLmtleSwgb2Zmc2V0OiBbLi4ua2V5Lm9mZnNldF0sIGxvb2tBdE9mZnNldDogWy4uLmtleS5sb29rQXRPZmZzZXRdIH0pKTtcbiAgICBjb25zdCBwcmV2aW91c0VuZCA9IGNvbXBpbGVkLmF0KC0xKT8uY2FtZXJhLmtleXMuYXQoLTEpO1xuICAgIGlmIChwcmV2aW91c0VuZCAmJiBrZXlzLmxlbmd0aCkga2V5c1swXSA9IGluaGVyaXRDYW1lcmFQb3NlKGtleXNbMF0sIHByZXZpb3VzRW5kKTtcbiAgICBjb21waWxlZC5wdXNoKE9iamVjdC5mcmVlemUoe1xuICAgICAgLi4uc2VjdGlvbixcbiAgICAgIGNhbWVyYTogT2JqZWN0LmZyZWV6ZSh7XG4gICAgICAgIC4uLnNlY3Rpb24uY2FtZXJhLFxuICAgICAgICBrZXlzOiBPYmplY3QuZnJlZXplKGtleXMubWFwKE9iamVjdC5mcmVlemUpKSxcbiAgICAgIH0pLFxuICAgICAgd29ybGRTdGF0ZTogT2JqZWN0LmZyZWV6ZSh3b3JsZFN0YXRlc1tpbmRleF0pLFxuICAgIH0pKTtcbiAgICByZXR1cm4gY29tcGlsZWQ7XG4gIH0sIFtdKTtcbiAgY29uc3QgY29tcGxldGVEaWFnbm9zdGljcyA9IFtcbiAgICAuLi5kaWFnbm9zdGljcyxcbiAgICAuLi5jb250aW51aXR5RGlhZ25vc3RpY3MsXG4gICAgLi4uY29tcGlsZVdvcmxkVHJhbnNpdGlvbkRpYWdub3N0aWNzKHNlY3Rpb25zLCBtYXhTdG9yeVdVKSxcbiAgXTtcbiAgaWYgKGNvbXBsZXRlRGlhZ25vc3RpY3Muc29tZSgoaXRlbSkgPT4gaXRlbS5sZXZlbCA9PT0gJ2Vycm9yJykpIHtcbiAgICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgICB2YWxpZDogZmFsc2UsXG4gICAgICBkb2N1bWVudCxcbiAgICAgIGRpYWdub3N0aWNzOiBPYmplY3QuZnJlZXplKGNvbXBsZXRlRGlhZ25vc3RpY3MpLFxuICAgICAgcHJvZmlsZSxcbiAgICAgIHNlY3Rpb25zOiBPYmplY3QuZnJlZXplKFtdKSxcbiAgICAgIHRvdGFsRXh0ZW50V1U6IDAsXG4gICAgICBtYXhTdG9yeVdVOiAwLFxuICAgIH0pO1xuICB9XG4gIGNvbnN0IGRpc2NpcGxpbmVSZXZlYWwgPSBjb21waWxlRGlzY2lwbGluZVJldmVhbChzZWN0aW9ucyk7XG4gIGNvbnN0IHdvcmxkU2VxdWVuY2UgPSBPYmplY3QuZnJlZXplKHNlY3Rpb25zXG4gICAgLmZpbHRlcigoc2VjdGlvbikgPT4gc2VjdGlvbi53b3JsZFN0YXRlLmNoYW5nZXNXb3JsZClcbiAgICAubWFwKChzZWN0aW9uKSA9PiBzZWN0aW9uLndvcmxkU3RhdGUuYWN0aXZlV29ybGQpKTtcblxuICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7XG4gICAgdmFsaWQ6IHRydWUsXG4gICAgZG9jdW1lbnQsXG4gICAgcHJvZmlsZSxcbiAgICBkaWFnbm9zdGljczogT2JqZWN0LmZyZWV6ZShjb21wbGV0ZURpYWdub3N0aWNzKSxcbiAgICBzZWN0aW9uczogT2JqZWN0LmZyZWV6ZShzZWN0aW9ucyksXG4gICAgd29ybGRTZXF1ZW5jZSxcbiAgICBkaXNjaXBsaW5lUmV2ZWFsLFxuICAgIHRvdGFsRXh0ZW50V1U6IHNlY3Rpb25zLmF0KC0xKT8uZW5kV1UgfHwgMCxcbiAgICBtYXhTdG9yeVdVLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhbXBsZUFib3V0TmFycmF0aXZlUGxhbihwbGFuLCBzdG9yeVdVLCB7XG4gIGFtYmllbnRTZWNvbmRzID0gMCxcbiAgcmVkdWNlZE1vdGlvbiA9IGZhbHNlLFxuICBsaXZlQW1iaWVudCA9IHRydWUsXG59ID0ge30pIHtcbiAgaWYgKCFwbGFuPy52YWxpZCB8fCAhcGxhbi5zZWN0aW9ucy5sZW5ndGgpIHJldHVybiBudWxsO1xuICBjb25zdCBjbGFtcGVkU3RvcnlXVSA9IE1hdGgubWF4KDAsIE1hdGgubWluKHBsYW4ubWF4U3RvcnlXVSwgTnVtYmVyKHN0b3J5V1UpIHx8IDApKTtcbiAgY29uc3Qgc2VjdGlvbkluZGV4ID0gZmluZFNlY3Rpb25JbmRleChwbGFuLnNlY3Rpb25zLCBjbGFtcGVkU3RvcnlXVSk7XG4gIGNvbnN0IHNlY3Rpb24gPSBwbGFuLnNlY3Rpb25zW3NlY3Rpb25JbmRleF07XG4gIGNvbnN0IGxvY2FsUHJvZ3Jlc3MgPSBjbGFtcDAxKChjbGFtcGVkU3RvcnlXVSAtIHNlY3Rpb24uc3RhcnRXVSkgLyBzZWN0aW9uLnRyYXZlbFdVKTtcbiAgY29uc3QgZ2xvYmFsQ2FtZXJhID0gcGxhbi5kb2N1bWVudC5nbG9iYWxzLmNhbWVyYTtcbiAgY29uc3QgY2FkZW5jZSA9IE51bWJlci5pc0Zpbml0ZShzZWN0aW9uLmNhbWVyYS5jYWRlbmNlT3ZlcnJpZGUpXG4gICAgPyBzZWN0aW9uLmNhbWVyYS5jYWRlbmNlT3ZlcnJpZGVcbiAgICA6IGdsb2JhbENhbWVyYS5jYWRlbmNlO1xuICBjb25zdCBjYW1lcmFLZXkgPSBzYW1wbGVDYW1lcmFLZXlzKFxuICAgIHNlY3Rpb24uY2FtZXJhLmtleXMsXG4gICAgcmVkdWNlZE1vdGlvbiA/IDAgOiBsb2NhbFByb2dyZXNzLFxuICAgIGdsb2JhbENhbWVyYS5mb3YsXG4gICk7XG4gIGNvbnN0IGNhbWVyYVN0b3J5V1UgPSByZWR1Y2VkTW90aW9uID8gc2VjdGlvbi5zdGFydFdVIDogY2xhbXBlZFN0b3J5V1U7XG4gIGNvbnN0IGNhbWVyYVBvc2l0aW9uID0gW1xuICAgIGNhbWVyYUtleS5vZmZzZXRbMF0sXG4gICAgY2FtZXJhS2V5Lm9mZnNldFsxXSxcbiAgICBnbG9iYWxDYW1lcmEuc3RhcnRaIC0gKGNhbWVyYVN0b3J5V1UgKiBjYWRlbmNlKSArIGNhbWVyYUtleS5vZmZzZXRbMl0sXG4gIF07XG4gIGNvbnN0IGNhbWVyYVRhcmdldCA9IFtcbiAgICBjYW1lcmFQb3NpdGlvblswXSArIGNhbWVyYUtleS5sb29rQXRPZmZzZXRbMF0sXG4gICAgY2FtZXJhUG9zaXRpb25bMV0gKyBjYW1lcmFLZXkubG9va0F0T2Zmc2V0WzFdLFxuICAgIGNhbWVyYVBvc2l0aW9uWzJdICsgY2FtZXJhS2V5Lmxvb2tBdE9mZnNldFsyXSxcbiAgXTtcbiAgY29uc3Qgd29ybGRTdGF0ZSA9IHNlY3Rpb24ud29ybGRTdGF0ZTtcbiAgY29uc3QgdHJhbnNpdGlvbiA9IHdvcmxkU3RhdGUuYWN0aXZlV29ybGQ/LnRyYW5zaXRpb25JbiB8fCB7IHN0YXJ0OiAwLCBlbmQ6IDAsIHR5cGU6ICdjdXQnLCBlYXNpbmc6ICdsaW5lYXInIH07XG4gIGNvbnN0IGNvbXBpbGVkVHJhbnNpdGlvbiA9IHdvcmxkU3RhdGUudHJhbnNpdGlvbjtcbiAgY29uc3QgdHJhbnNpdGlvblNwYW5XVSA9IE1hdGgubWF4KDAuMDAwMDEsIChjb21waWxlZFRyYW5zaXRpb24/LmVuZFdVIHx8IDApIC0gKGNvbXBpbGVkVHJhbnNpdGlvbj8uc3RhcnRXVSB8fCAwKSk7XG4gIGNvbnN0IHRyYW5zaXRpb25Qcm9ncmVzcyA9IHRyYW5zaXRpb24udHlwZSA9PT0gJ2N1dCcgfHwgIWNvbXBpbGVkVHJhbnNpdGlvblxuICAgID8gMVxuICAgIDogYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZyhcbiAgICAgIHRyYW5zaXRpb24uZWFzaW5nLFxuICAgICAgKGNsYW1wZWRTdG9yeVdVIC0gY29tcGlsZWRUcmFuc2l0aW9uLnN0YXJ0V1UpIC8gdHJhbnNpdGlvblNwYW5XVSxcbiAgICApO1xuICBjb25zdCBkaXNjaXBsaW5lUmV2ZWFsID0gcGxhbi5kaXNjaXBsaW5lUmV2ZWFsXG4gICAgPyB7XG4gICAgICAuLi5wbGFuLmRpc2NpcGxpbmVSZXZlYWwsXG4gICAgICBsb2NhbFByb2dyZXNzOiAoY2xhbXBlZFN0b3J5V1UgLSBwbGFuLmRpc2NpcGxpbmVSZXZlYWwuc3RhcnRXVSkgLyBwbGFuLmRpc2NpcGxpbmVSZXZlYWwudHJhdmVsV1UsXG4gICAgfVxuICAgIDogbnVsbDtcblxuICByZXR1cm4ge1xuICAgIGdsb2JhbHM6IHBsYW4uZG9jdW1lbnQuZ2xvYmFscyxcbiAgICBzdG9yeVdVOiBjbGFtcGVkU3RvcnlXVSxcbiAgICBzdG9yeVRpbWU6IGNsYW1wZWRTdG9yeVdVLFxuICAgIGFtYmllbnRUaW1lOiByZWR1Y2VkTW90aW9uIHx8ICFsaXZlQW1iaWVudCA/IDAgOiBhbWJpZW50U2Vjb25kcyxcbiAgICByZWR1Y2VkTW90aW9uLFxuICAgIHNlY3Rpb25JbmRleCxcbiAgICBzZWN0aW9uLFxuICAgIGxvY2FsUHJvZ3Jlc3MsXG4gICAgY2FtZXJhOiB7XG4gICAgICBwb3NpdGlvbjogY2FtZXJhUG9zaXRpb24sXG4gICAgICB0YXJnZXQ6IGNhbWVyYVRhcmdldCxcbiAgICAgIGZvdjogcmVkdWNlZE1vdGlvbiA/IGdsb2JhbENhbWVyYS5mb3YgOiBjYW1lcmFLZXkuZm92LFxuICAgICAgcm9sbDogcmVkdWNlZE1vdGlvbiA/IDAgOiBjYW1lcmFLZXkucm9sbCxcbiAgICAgIGNhZGVuY2UsXG4gICAgfSxcbiAgICB3b3JsZDoge1xuICAgICAgZnJvbTogd29ybGRTdGF0ZS5wcmV2aW91c1dvcmxkLFxuICAgICAgdG86IHdvcmxkU3RhdGUuYWN0aXZlV29ybGQsXG4gICAgICBzZXF1ZW5jZTogcGxhbi53b3JsZFNlcXVlbmNlLFxuICAgICAgY2hhbmdlczogd29ybGRTdGF0ZS5jaGFuZ2VzV29ybGQsXG4gICAgICB0cmFuc2l0aW9uUHJvZ3Jlc3M6IHJlZHVjZWRNb3Rpb24gPyAxIDogdHJhbnNpdGlvblByb2dyZXNzLFxuICAgICAgdHJhbnNpdGlvbjoge1xuICAgICAgICAuLi50cmFuc2l0aW9uLFxuICAgICAgICBzdGFydFdVOiBjb21waWxlZFRyYW5zaXRpb24/LnN0YXJ0V1UgPz8gc2VjdGlvbi5zdGFydFdVLFxuICAgICAgICBlbmRXVTogY29tcGlsZWRUcmFuc2l0aW9uPy5lbmRXVSA/PyBzZWN0aW9uLnN0YXJ0V1UsXG4gICAgICB9LFxuICAgIH0sXG4gICAgZGlzY2lwbGluZVJldmVhbCxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCB0ZXh0TW90aW9uID0ge30pIHtcbiAgY29uc3QgZW50ZXIgPSBOdW1iZXIoY3VlLmVudGVyID8/IDApO1xuICBjb25zdCBmb2N1cyA9IE51bWJlcihjdWUuaG9sZCA/PyAoKGVudGVyICsgTnVtYmVyKGN1ZS5leGl0ID8/IDEpKSAqIDAuNSkpO1xuICBjb25zdCBleGl0ID0gTnVtYmVyKGN1ZS5leGl0ID8/IDEpO1xuICBjb25zdCBkdXJhdGlvblNjYWxlID0gTWF0aC5tYXgoMC4wMSwgTnVtYmVyKHRleHRNb3Rpb24uZHVyYXRpb25TY2FsZSA/PyAxKSk7XG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IE1hdGgubWF4KDAsIGZvY3VzIC0gKChmb2N1cyAtIGVudGVyKSAqIGR1cmF0aW9uU2NhbGUpKSxcbiAgICBmb2N1cyxcbiAgICBlbmQ6IE1hdGgubWluKDEsIGZvY3VzICsgKChleGl0IC0gZm9jdXMpICogZHVyYXRpb25TY2FsZSkpLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QWJvdXROYXJyYXRpdmVDdWVNb3ZlbWVudChjdWUpIHtcbiAgcmV0dXJuIGN1ZS5tb3Rpb24/Lm1vZGUgPT09ICd2ZXJ0aWNhbCcgPyAndmVydGljYWwnIDogJ3NwYXRpYWwnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FtcGxlQWJvdXROYXJyYXRpdmVDdWUoY3VlLCBsb2NhbFByb2dyZXNzLCB0ZXh0TW90aW9uLCByZWR1Y2VkTW90aW9uID0gZmFsc2UpIHtcbiAgY29uc3QgaXNPcGVuZXIgPSBjdWUucHJlc2V0ID09PSAnb3BlbmVyLXYxJztcbiAgY29uc3Qgb3BlbmVyU3RhcnRZID0gTnVtYmVyKHRleHRNb3Rpb24ub3BlbmVyU3RhcnRZID8/IDM2KTtcbiAgaWYgKHJlZHVjZWRNb3Rpb24pIHtcbiAgICByZXR1cm4geyBvcGFjaXR5OiAxLCBibHVyOiAwLCB4OiAwLCB5OiBpc09wZW5lciA/IG9wZW5lclN0YXJ0WSA6IDAsIHo6IDAgfTtcbiAgfVxuICBjb25zdCBpbnRlcnZhbCA9IGdldEFib3V0TmFycmF0aXZlQ3VlTW90aW9uSW50ZXJ2YWwoY3VlLCB0ZXh0TW90aW9uKTtcbiAgY29uc3Qgc3RhcnRZID0gTnVtYmVyKHRleHRNb3Rpb24uc3RhcnRZID8/IC0xMTApO1xuICBjb25zdCBlbmRZID0gTnVtYmVyKHRleHRNb3Rpb24uZW5kWSA/PyAxMzApO1xuICBjb25zdCBlbnRyeURlcHRoID0gTnVtYmVyKHRleHRNb3Rpb24uZW50cnlEZXB0aCA/PyAzNjApO1xuICBjb25zdCBleGl0RGVwdGggPSBOdW1iZXIodGV4dE1vdGlvbi5leGl0RGVwdGggPz8gMjIwKTtcbiAgY29uc3QgbWF4Qmx1ciA9IE51bWJlcih0ZXh0TW90aW9uLm1heEJsdXIgPz8gMjIpO1xuICBpZiAobG9jYWxQcm9ncmVzcyA8IGludGVydmFsLnN0YXJ0IHx8IGxvY2FsUHJvZ3Jlc3MgPiBpbnRlcnZhbC5lbmQpIHtcbiAgICBjb25zdCBiZWZvcmUgPSBsb2NhbFByb2dyZXNzIDwgaW50ZXJ2YWwuc3RhcnQ7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wYWNpdHk6IDAsXG4gICAgICBibHVyOiBtYXhCbHVyLFxuICAgICAgeDogMCxcbiAgICAgIHk6IGJlZm9yZSA/IHN0YXJ0WSA6IGVuZFksXG4gICAgICB6OiBiZWZvcmUgPyAtZW50cnlEZXB0aCA6IGV4aXREZXB0aCxcbiAgICB9O1xuICB9XG4gIGNvbnN0IHNwYW4gPSBNYXRoLm1heCgwLjAwMDAxLCBpbnRlcnZhbC5lbmQgLSBpbnRlcnZhbC5zdGFydCk7XG4gIGNvbnN0IHByb2dyZXNzID0gY2xhbXAwMSgobG9jYWxQcm9ncmVzcyAtIGludGVydmFsLnN0YXJ0KSAvIHNwYW4pO1xuICBjb25zdCByZWFkYWJsZVN0YXJ0ID0gY2xhbXAwMShOdW1iZXIodGV4dE1vdGlvbi5yZWFkYWJsZVN0YXJ0ID8/IDAuMjQpKTtcbiAgY29uc3QgcmVhZGFibGVFbmQgPSBjbGFtcDAxKE51bWJlcih0ZXh0TW90aW9uLnJlYWRhYmxlRW5kID8/IDAuNzYpKTtcbiAgaWYgKGlzT3BlbmVyICYmIGludGVydmFsLnN0YXJ0ID09PSAwKSB7XG4gICAgY29uc3QgZmFkZU91dFByb2dyZXNzID0gcmVhZGFibGVFbmQgPj0gMVxuICAgICAgPyAwXG4gICAgICA6IGNsYW1wMDEoKHByb2dyZXNzIC0gcmVhZGFibGVFbmQpIC8gKDEgLSByZWFkYWJsZUVuZCkpO1xuICAgIGNvbnN0IGNsYXJpdHkgPSAxIC0gYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZygnc21vb3Roc3RlcCcsIGZhZGVPdXRQcm9ncmVzcyk7XG4gICAgcmV0dXJuIHtcbiAgICAgIG9wYWNpdHk6IGNsYXJpdHksXG4gICAgICBibHVyOiBtaXgobWF4Qmx1ciwgMCwgY2xhcml0eSksXG4gICAgICB4OiAwLFxuICAgICAgeTogbWl4KG9wZW5lclN0YXJ0WSwgZW5kWSwgcHJvZ3Jlc3MpLFxuICAgICAgejogbWl4KDAsIGV4aXREZXB0aCwgcHJvZ3Jlc3MpLFxuICAgIH07XG4gIH1cbiAgY29uc3QgY2xlYXJJbiA9IHJlYWRhYmxlU3RhcnQgPD0gMFxuICAgID8gMVxuICAgIDogYXBwbHlBYm91dE5hcnJhdGl2ZUVhc2luZygnc21vb3Roc3RlcCcsIHByb2dyZXNzIC8gcmVhZGFibGVTdGFydCk7XG4gIGNvbnN0IGNsZWFyT3V0ID0gcmVhZGFibGVFbmQgPj0gMVxuICAgID8gMVxuICAgIDogMSAtIGFwcGx5QWJvdXROYXJyYXRpdmVFYXNpbmcoJ3Ntb290aHN0ZXAnLCAocHJvZ3Jlc3MgLSByZWFkYWJsZUVuZCkgLyAoMSAtIHJlYWRhYmxlRW5kKSk7XG4gIGNvbnN0IGNsYXJpdHkgPSBNYXRoLm1pbihjbGVhckluLCBjbGVhck91dCk7XG4gIHJldHVybiB7XG4gICAgb3BhY2l0eTogY2xhcml0eSxcbiAgICBibHVyOiBtaXgobWF4Qmx1ciwgMCwgY2xhcml0eSksXG4gICAgeDogMCxcbiAgICB5OiBtaXgoc3RhcnRZLCBlbmRZLCBwcm9ncmVzcyksXG4gICAgejogbWl4KC1lbnRyeURlcHRoLCBleGl0RGVwdGgsIHByb2dyZXNzKSxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxNQUFNLENBQUM7QUFDUCxDQUFDLENBQUMsMkJBQTJCO0FBQzdCLENBQUMsQ0FBQywrQkFBK0I7QUFDakMsQ0FBQyxDQUFDLDhCQUE4QjtBQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQzs7QUFFaEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDMUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7O0FBRW5FLE1BQU0sQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7QUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUTtBQUN4QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0QsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RGLENBQUMsQ0FBQztB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QUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVTtBQUMxRCxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUN2RTs7QUFFQSxRQUFRLENBQUMsaUNBQWlDLENBQUMsUUFBUSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDakUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDekYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMxRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVztBQUNwQjs7QUFFQSxRQUFRLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTtBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTtBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3JKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FB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RUFBRTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDckYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDNUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUUsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUN0RSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUM3QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDdkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENB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LENBQUM7QUFDL0YsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzdDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU87QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQztBQUNIOyJ9