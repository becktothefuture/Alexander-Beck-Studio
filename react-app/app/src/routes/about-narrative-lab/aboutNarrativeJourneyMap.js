const EPSILON = 0.000001;
const RUNWAY_APPROACH_WU = 0.5;

const PHASE_FIELDS = Object.freeze({
  enter: 'startWU',
  focus: 'focusWU',
  exit: 'endWU',
});

const JOURNEY_ROLES = Object.freeze([
  Object.freeze({
    id: 'opening',
    fieldId: 'text-promise-main',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_STAGE_00']),
    fallbackProgress: 0,
  }),
  Object.freeze({
    id: 'inciting-question',
    fieldId: 'text-complexity-idea',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_STAGE_01']),
    fallbackProgress: 0.05,
  }),
  Object.freeze({
    id: 'portal-entry',
    fieldId: 'text-background-unit',
    phase: 'enter',
    offsetWU: -2.1,
    cueNames: Object.freeze(['ABS_STAGE_02']),
    fallbackProgress: 0.091667,
  }),
  Object.freeze({
    id: 'portal-exit',
    fieldId: 'text-background-unit',
    phase: 'enter',
    offsetWU: -1,
    cueNames: Object.freeze(['ABS_ROUND_PORTALS_EXIT']),
    requiredCueName: 'ABS_ROUND_PORTALS_EXIT',
    fallbackProgress: 0.183333,
  }),
  Object.freeze({
    id: 'portal-release',
    fieldId: 'text-background-unit',
    phase: 'enter',
    offsetWU: -0.16,
    cueNames: Object.freeze(['ABS_ROUND_PORTALS_CLEAR']),
    requiredCueName: 'ABS_ROUND_PORTALS_CLEAR',
    fallbackProgress: 0.2,
  }),
  Object.freeze({
    id: 'personal-origin',
    fieldId: 'text-background-unit',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_PERSONAL_ORIGIN']),
    requiredCueName: 'ABS_PERSONAL_ORIGIN',
    fallbackProgress: 0.216667,
  }),
  Object.freeze({
    id: 'earned-thesis',
    fieldId: 'text-complexity-curiosity',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_TERRAIN_THESIS']),
    requiredCueName: 'ABS_TERRAIN_THESIS',
    fallbackProgress: 0.266667,
  }),
  Object.freeze({
    id: 'landscape-release',
    fieldId: 'text-disciplines-title',
    phase: 'exit',
    offsetWU: -0.16,
    cueNames: Object.freeze(['ABS_CANYON_CLEAR']),
    requiredCueName: 'ABS_CANYON_CLEAR',
    fallbackProgress: 0.458333,
  }),
  Object.freeze({
    id: 'gate-entry',
    fieldId: 'text-life-momentum',
    phase: 'enter',
    offsetWU: -2.1,
    cueNames: Object.freeze(['ABS_ROLL_GATE_START', 'ABS_STAGE_04']),
    fallbackProgress: 0.463333,
  }),
  Object.freeze({
    id: 'gate-exit',
    fieldId: 'text-life-momentum',
    phase: 'enter',
    offsetWU: -1,
    cueNames: Object.freeze(['ABS_ROLL_GATE_END']),
    fallbackProgress: 0.676667,
  }),
  Object.freeze({
    id: 'gate-release',
    fieldId: 'text-life-momentum',
    phase: 'enter',
    offsetWU: -0.16,
    cueNames: Object.freeze(['ABS_GATE_PASSAGE_CLEAR']),
    requiredCueName: 'ABS_GATE_PASSAGE_CLEAR',
    fallbackProgress: 0.7,
  }),
  Object.freeze({
    id: 'method',
    fieldId: 'text-life-momentum',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_METHOD_RELEASE']),
    requiredCueName: 'ABS_METHOD_RELEASE',
    fallbackProgress: 0.725,
  }),
  Object.freeze({
    id: 'lattice-approach',
    fieldId: 'text-life-momentum',
    phase: 'focus',
    cueNames: Object.freeze(['ABS_LATTICE_APPROACH']),
    requiredCueName: 'ABS_LATTICE_APPROACH',
    fallbackProgress: 0.75,
  }),
  Object.freeze({
    id: 'split-lattice-entry',
    fieldId: 'text-life-character',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_SPLIT_LATTICE_ENTRY']),
    requiredCueName: 'ABS_SPLIT_LATTICE_ENTRY',
    fallbackProgress: 0.758333,
  }),
  Object.freeze({
    id: 'finale-deceleration',
    fieldId: 'text-life-character',
    phase: 'exit',
    cueNames: Object.freeze(['ABS_FINALE_DECEL']),
    requiredCueName: 'ABS_FINALE_DECEL',
    fallbackProgress: 0.791667,
  }),
  Object.freeze({
    id: 'camera-lock',
    fieldId: 'text-epilogue-thinking',
    phase: 'exit',
    cueNames: Object.freeze(['ABS_CAMERA_LOCK']),
    requiredCueName: 'ABS_CAMERA_LOCK',
    fallbackProgress: 0.833333,
  }),
  Object.freeze({
    id: 'invitation',
    fieldId: 'text-epilogue-invitation',
    phase: 'enter',
    cueNames: Object.freeze(['ABS_CAMERA_LOCK']),
    requiredCueName: 'ABS_CAMERA_LOCK',
    fallbackProgress: 0.833333,
  }),
  Object.freeze({
    id: 'terminal-hold',
    fieldId: 'text-epilogue-invitation',
    phase: 'exit',
    cueNames: Object.freeze(['ABS_TERMINAL_FRAME']),
    requiredCueName: 'ABS_TERMINAL_FRAME',
    fallbackProgress: 1,
  }),
]);

const clean = (value) => Math.round(Number(value) * 1_000_000) / 1_000_000;
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function fieldTiming(storyLayout, fieldId, phase) {
  const field = storyLayout?.fields?.find((candidate) => candidate.id === fieldId);
  const phaseField = PHASE_FIELDS[phase];
  const value = Number(field?.[phaseField]);
  return Number.isFinite(value) ? value : null;
}

export function compileAboutNarrativeJourneyMap(storyLayout) {
  const diagnostics = [];
  const anchors = JOURNEY_ROLES.map((role) => {
    const fieldWU = fieldTiming(storyLayout, role.fieldId, role.phase);
    // Offsets reserve camera passage inside Text-owned gaps. They never add
    // page length or change the Blender-authored path.
    const storyWU = Number.isFinite(fieldWU) ? fieldWU + (role.offsetWU || 0) : null;
    if (!Number.isFinite(storyWU)) {
      diagnostics.push({
        level: 'warning',
        code: 'journey-story-anchor-missing',
        path: `tracks.text.fields.${role.fieldId}.${PHASE_FIELDS[role.phase]}`,
        message: `The journey role “${role.id}” cannot resolve ${role.fieldId}:${role.phase}.`,
      });
    }
    return {
      ...role,
      storyWU: Number.isFinite(storyWU) ? clean(storyWU) : null,
    };
  });

  anchors.forEach((anchor, index) => {
    if (index === 0 || !Number.isFinite(anchor.storyWU)) return;
    const previous = anchors[index - 1];
    if (Number.isFinite(previous.storyWU) && anchor.storyWU < previous.storyWU - EPSILON) {
      diagnostics.push({
        level: 'error',
        code: 'journey-story-order',
        path: `tracks.text.fields.${anchor.fieldId}`,
        message: `Journey role “${anchor.id}” resolves before “${previous.id}”.`,
      });
    }
  });

  const byId = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const signature = JSON.stringify(anchors.map((anchor) => [
    anchor.id,
    anchor.offsetWU || 0,
    anchor.storyWU,
    anchor.cueNames,
    anchor.requiredCueName,
    anchor.fallbackProgress,
  ]));
  return deepFreeze({
    valid: diagnostics.length === 0,
    diagnostics,
    anchors,
    signature,
    finaleStartWU: byId.get('finale-deceleration')?.storyWU ?? 0,
    runwayStartWU: byId.get('split-lattice-entry')?.storyWU ?? 0,
    lockStoryWU: Number(storyLayout?.durationWU) || Number.POSITIVE_INFINITY,
    invitationStoryWU: byId.get('invitation')?.storyWU ?? Number.POSITIVE_INFINITY,
    durationWU: Number(storyLayout?.durationWU) || 0,
  });
}

function resolveCue(cameraTrack, cueNames, fallbackProgress, requiredCueName) {
  const cues = cameraTrack?.journeyCues || [];
  for (const cueName of cueNames) {
    const cue = cues.find((candidate) => candidate.name === cueName);
    const progress = Number(cue?.progress);
    if (Number.isFinite(progress)) {
      return {
        cueName,
        cueSource: cueName === requiredCueName ? 'semantic' : 'legacy',
        progress: clamp01(progress),
      };
    }
  }
  return {
    cueName: '',
    cueSource: 'fallback',
    progress: clamp01(fallbackProgress),
  };
}

function cameraPathDistances(cameraTrack) {
  const samples = cameraTrack?.samples || [];
  const distances = [0];
  for (let index = 1; index < samples.length; index += 1) {
    const from = samples[index - 1];
    const to = samples[index];
    distances.push(distances[index - 1] + Math.hypot(
      to[0] - from[0], to[1] - from[1], to[2] - from[2],
    ));
  }
  return distances;
}

function distanceAtProgress(distances, progress) {
  const cursor = clamp01(progress) * (distances.length - 1);
  const index = Math.floor(cursor);
  const next = Math.min(index + 1, distances.length - 1);
  return distances[index] + (distances[next] - distances[index]) * (cursor - index);
}

function progressAtDistance(distances, distance) {
  if (distance <= 0) return 0;
  let low = 0;
  let high = distances.length - 1;
  // Upper bound also skips duplicate stationary samples without dividing by 0.
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (distances[middle] <= distance) low = middle + 1;
    else high = middle;
  }
  const from = Math.max(0, low - 1);
  const length = distances[low] - distances[from];
  const mix = length > 0 ? (distance - distances[from]) / length : 0;
  return (from + mix) / Math.max(1, distances.length - 1);
}

export function resolveAboutNarrativeJourneyMap(storyMap, cameraTrack) {
  if (!storyMap?.valid) {
    return deepFreeze({
      valid: false,
      certifiable: false,
      diagnostics: storyMap?.diagnostics || [],
      anchors: [],
      signature: '',
      finaleStartWU: 0,
      runwayStartWU: 0,
      lockStoryWU: Number.POSITIVE_INFINITY,
      lockProgress: 1,
      invitationStoryWU: Number.POSITIVE_INFINITY,
      durationWU: Number(storyMap?.durationWU) || 0,
    });
  }

  const diagnostics = [];
  const anchors = storyMap.anchors.map((anchor) => {
    const cue = resolveCue(
      cameraTrack,
      anchor.cueNames,
      anchor.fallbackProgress,
      anchor.requiredCueName,
    );
    if (anchor.requiredCueName && cue.cueName !== anchor.requiredCueName) {
      diagnostics.push({
        level: 'warning',
        code: 'journey-required-camera-cue-missing',
        path: `cameraTrack.journeyCues.${anchor.requiredCueName}`,
        message: `Journey role “${anchor.id}” requires camera cue “${anchor.requiredCueName}” for certification.`,
      });
    }
    return {
      id: anchor.id,
      storyWU: anchor.storyWU,
      journeyProgress: clean(cue.progress),
      cueName: cue.cueName,
      cueSource: cue.cueSource,
    };
  });
  anchors.forEach((anchor, index) => {
    if (index === 0) return;
    const previous = anchors[index - 1];
    if (anchor.journeyProgress < previous.journeyProgress - EPSILON) {
      diagnostics.push({
        level: 'error',
        code: 'journey-camera-order',
        path: `cameraTrack.journeyCues.${anchor.id}`,
        message: `Journey cue “${anchor.id}” resolves before “${previous.id}”.`,
      });
    }
  });
  const lockProgress = anchors.find((anchor) => anchor.id === 'camera-lock')?.journeyProgress ?? 1;
  // Exported sample time and editorial cues are not physical distance. Measure
  // the existing rail once so equal native scroll always travels equal length,
  // including the export's accelerated sections and its stationary tail.
  const pathDistances = cameraPathDistances(cameraTrack);
  const pathLengthWU = distanceAtProgress(pathDistances, lockProgress);
  if (!(pathLengthWU > EPSILON) || !Number.isFinite(pathLengthWU)) {
    diagnostics.push({
      level: 'error', code: 'journey-camera-distance-invalid', path: 'cameraTrack.samples',
      message: 'The camera rail must contain finite, nonzero travel before its endpoint.',
    });
  }
  for (const anchor of anchors) {
    anchor.cameraDistanceWU = Math.min(pathLengthWU,
      distanceAtProgress(pathDistances, anchor.journeyProgress));
    anchor.cameraStoryWU = pathLengthWU > EPSILON
      ? anchor.cameraDistanceWU / pathLengthWU * storyMap.durationWU : 0;
  }
  const reducedReadingCuts = [
    ['portal-exit', 'personal-origin'], ['gate-exit', 'lattice-approach'],
  ].flatMap(([startId, endId]) => {
    const start = anchors.find((anchor) => anchor.id === startId);
    const end = anchors.find((anchor) => anchor.id === endId);
    return start && end && end.cameraStoryWU > start.cameraStoryWU ? [{
      startWU: start.cameraStoryWU, endWU: end.cameraStoryWU,
      cameraDistanceWU: end.cameraDistanceWU,
    }] : [];
  });

  return deepFreeze({
    valid: !diagnostics.some((item) => item.level === 'error'),
    certifiable: !diagnostics.some((item) => (
      item.level === 'error' || item.code === 'journey-required-camera-cue-missing'
    )),
    diagnostics,
    anchors,
    signature: `${storyMap.signature}:${cameraTrack?.source?.sha256 || cameraTrack?.sampleCount || ''}:scroll-distance-v1`,
    finaleStartWU: storyMap.finaleStartWU,
    runwayStartWU: storyMap.runwayStartWU,
    lockStoryWU: storyMap.durationWU,
    lockProgress,
    pathDistances,
    pathLengthWU,
    reducedReadingCuts,
    invitationStoryWU: storyMap.invitationStoryWU,
    durationWU: storyMap.durationWU,
  });
}

export function createAboutNarrativeJourneySample() {
  return {
    valid: false,
    certifiable: false,
    progress: 0,
    cameraDistanceWU: 0,
    sceneStoryWU: 0,
    finaleProgress: 0,
    runwayProgress: 0,
    runwayApproachProgress: 0,
    locked: false,
    atInvitation: false,
  };
}

export function sampleAboutNarrativeJourneyMapInto(map, storyWU, target, reducedMotion = false) {
  const output = target || createAboutNarrativeJourneySample();
  const time = Math.max(0, Number(storyWU) || 0);
  output.sceneStoryWU = time;
  if (!map?.valid || map.anchors.length < 2) {
    output.valid = false;
    output.certifiable = false;
    output.progress = map?.durationWU > 0 ? clamp01(time / map.durationWU) : 0;
    output.cameraDistanceWU = 0;
    output.finaleProgress = 0;
    output.runwayProgress = 0;
    output.runwayApproachProgress = 0;
    output.locked = false;
    output.atInvitation = false;
    return output;
  }

  output.valid = true;
  output.certifiable = Boolean(map.certifiable);
  output.cameraDistanceWU = clamp01(time / map.durationWU) * map.pathLengthWU;
  if (reducedMotion) {
    // Accessible playback cuts between existing authored poses. It never flies
    // continuously, and it still resolves to the same final world and camera.
    output.cameraDistanceWU = 0;
    output.sceneStoryWU = 0;
    for (const anchor of map.anchors) {
      if (anchor.cameraStoryWU > time + EPSILON) break;
      output.cameraDistanceWU = anchor.cameraDistanceWU;
      output.sceneStoryWU = anchor.cameraStoryWU;
    }
    // Settle directly into the authored reading pose after each passage. The
    // exit pose can still be turned toward the last portal/gate; holding it
    // throughout prose leaves a clipped world beside the text. These cuts use
    // existing camera cues, preserve one scene clock, and never affect normal
    // scroll travel or introduce continuous movement under Reduced Motion.
    for (const cut of map.reducedReadingCuts || []) {
      if (output.sceneStoryWU >= cut.startWU - EPSILON && output.sceneStoryWU < cut.endWU) {
        output.cameraDistanceWU = cut.cameraDistanceWU;
        output.sceneStoryWU = cut.endWU;
      }
    }
  }
  const sceneTime = output.sceneStoryWU;
  output.finaleProgress = clamp01(
    (sceneTime - map.finaleStartWU)
    / Math.max(EPSILON, map.lockStoryWU - map.finaleStartWU),
  );
  output.runwayProgress = clamp01(
    (sceneTime - map.runwayStartWU)
    / Math.max(EPSILON, map.finaleStartWU - map.runwayStartWU),
  );
  output.runwayApproachProgress = clamp01(
    (sceneTime - (map.runwayStartWU - RUNWAY_APPROACH_WU)) / RUNWAY_APPROACH_WU,
  );
  output.locked = time >= map.lockStoryWU - EPSILON;
  output.atInvitation = time >= map.invitationStoryWU - EPSILON;
  output.progress = output.locked
    ? map.lockProgress
    : progressAtDistance(map.pathDistances, output.cameraDistanceWU);
  return output;
}

export const ABOUT_NARRATIVE_JOURNEY_ROLES = JOURNEY_ROLES;
