const EPSILON = 0.000001;
const RUNWAY_APPROACH_WU = 0.5;

const journeyRole = (id, stageId, stageProgress, cueName) => Object.freeze({
  id,
  stageId,
  stageProgress,
  cueName,
});

const JOURNEY_ROLES = Object.freeze([
  journeyRole('opening', 'about.00', 0, 'ABS_STAGE_00'),
  journeyRole('inciting-question', 'about.01', 0, 'ABS_STAGE_01'),
  journeyRole('portal-entry', 'about.02', 0, 'ABS_STAGE_02'),
  journeyRole('portal-exit', 'about.02', 1, 'ABS_ROUND_PORTALS_EXIT'),
  journeyRole('portal-release', 'about.02', 1, 'ABS_ROUND_PORTALS_CLEAR'),
  journeyRole('personal-origin', 'about.03', 0, 'ABS_PERSONAL_ORIGIN'),
  journeyRole('earned-thesis', 'about.03', 0.33, 'ABS_TERRAIN_THESIS'),
  journeyRole('landscape-release', 'about.03', 0.9, 'ABS_CANYON_CLEAR'),
  journeyRole('gate-entry', 'about.04', 0, 'ABS_ROLL_GATE_START'),
  journeyRole('method', 'about.05', 0, 'ABS_METHOD_RELEASE'),
  journeyRole('lattice-approach', 'about.05', 0.5, 'ABS_LATTICE_APPROACH'),
  journeyRole('gate-exit', 'about.05', 1, 'ABS_ROLL_GATE_END'),
  journeyRole('gate-release', 'about.05', 1, 'ABS_GATE_PASSAGE_CLEAR'),
  journeyRole('split-lattice-entry', 'about.06', 0, 'ABS_SPLIT_LATTICE_ENTRY'),
  journeyRole('finale-deceleration', 'about.06', 0.3, 'ABS_FINALE_DECEL'),
  journeyRole('invitation', 'about.06', 0.7, 'ABS_INVITATION'),
  journeyRole('camera-lock', 'about.06', 1, 'ABS_CAMERA_LOCK'),
  journeyRole('terminal-hold', 'about.06', 1, 'ABS_TERMINAL_FRAME'),
]);

const clean = (value) => Math.round(Number(value) * 1_000_000) / 1_000_000;
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function stageTiming(storyLayout, stageId, stageProgress) {
  const section = storyLayout?.sections?.find((candidate) => candidate.id === stageId);
  if (!section) return null;
  const startWU = Number(section.sceneStartWU ?? section.startWU);
  const endWU = Number(section.sceneEndWU ?? section.endWU);
  return clean(startWU + (endWU - startWU) * clamp01(stageProgress));
}

export function compileAboutNarrativeJourneyMap(storyLayout) {
  const diagnostics = [];
  const anchors = JOURNEY_ROLES.map((role) => {
    const storyWU = stageTiming(storyLayout, role.stageId, role.stageProgress);
    if (!Number.isFinite(storyWU)) {
      diagnostics.push({
        level: 'warning',
        code: 'journey-story-stage-missing',
        path: `storyLayout.sections.${role.stageId}`,
        message: `The journey role “${role.id}” cannot resolve equal stage “${role.stageId}”.`,
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
        path: `storyLayout.sections.${anchor.stageId}`,
        message: `Journey role “${anchor.id}” resolves before “${previous.id}”.`,
      });
    }
  });

  const byId = new Map(anchors.map((anchor) => [anchor.id, anchor]));
  const signature = JSON.stringify(anchors.map((anchor) => [
    anchor.id,
    anchor.stageId,
    anchor.stageProgress,
    anchor.storyWU,
    anchor.cueName,
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

function resolveCue(cameraTrack, cueName) {
  const cue = cameraTrack?.journeyCues?.find((candidate) => candidate.name === cueName);
  return Number.isFinite(cue?.progress) ? clamp01(cue.progress) : null;
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

// Monotone cubic Hermite rates preserve every semantic Blender cue while
// joining passage and reading speeds continuously. These are compiled once;
// sampling is stateless and reversing scroll retraces the same physical rail.
function writeCameraTravelRates(anchors) {
  const slopes = anchors.slice(1).map((anchor, index) => (
    (anchor.cameraDistanceWU - anchors[index].cameraDistanceWU)
      / Math.max(EPSILON, anchor.storyWU - anchors[index].storyWU)
  ));
  anchors.forEach((anchor, index) => {
    if (index === 0 || index === anchors.length - 1) {
      anchor.cameraRate = 0;
      return;
    }
    const before = slopes[index - 1];
    const after = slopes[index];
    if (before <= EPSILON || after <= EPSILON) {
      anchor.cameraRate = 0;
      return;
    }
    const beforeSpan = anchor.storyWU - anchors[index - 1].storyWU;
    const afterSpan = anchors[index + 1].storyWU - anchor.storyWU;
    const beforeWeight = 2 * afterSpan + beforeSpan;
    const afterWeight = afterSpan + 2 * beforeSpan;
    anchor.cameraRate = (beforeWeight + afterWeight)
      / (beforeWeight / before + afterWeight / after);
  });
}

function cameraDistanceAtStoryWU(anchors, storyWU) {
  if (!anchors.length) return 0;
  if (storyWU <= anchors[0].storyWU) return anchors[0].cameraDistanceWU;
  const last = anchors.at(-1);
  if (storyWU >= last.storyWU) return last.cameraDistanceWU;
  let toIndex = 1;
  while (toIndex < anchors.length && storyWU > anchors[toIndex].storyWU) toIndex += 1;
  const from = anchors[toIndex - 1];
  const to = anchors[toIndex];
  const spanWU = Math.max(EPSILON, to.storyWU - from.storyWU);
  const progress = clamp01((storyWU - from.storyWU) / spanWU);
  const squared = progress * progress;
  const cubed = squared * progress;
  return (2 * cubed - 3 * squared + 1) * from.cameraDistanceWU
    + (cubed - 2 * squared + progress) * spanWU * from.cameraRate
    + (-2 * cubed + 3 * squared) * to.cameraDistanceWU
    + (cubed - squared) * spanWU * to.cameraRate;
}

export function resolveAboutNarrativeJourneyMap(storyMap, cameraTrack) {
  if (!storyMap?.valid) {
    return deepFreeze({
      valid: false,
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
    const journeyProgress = resolveCue(cameraTrack, anchor.cueName);
    if (!Number.isFinite(journeyProgress)) {
      diagnostics.push({
        level: 'error',
        code: 'journey-camera-cue-missing',
        path: `cameraTrack.journeyCues.${anchor.cueName}`,
        message: `Journey role “${anchor.id}” requires Blender camera cue “${anchor.cueName}”.`,
      });
    }
    return {
      id: anchor.id,
      stageId: anchor.stageId,
      stageProgress: anchor.stageProgress,
      storyWU: anchor.storyWU,
      journeyProgress: Number.isFinite(journeyProgress) ? clean(journeyProgress) : null,
      cueName: anchor.cueName,
    };
  });
  anchors.forEach((anchor, index) => {
    if (index === 0 || !Number.isFinite(anchor.journeyProgress)) return;
    const previous = anchors[index - 1];
    if (Number.isFinite(previous.journeyProgress)
      && anchor.journeyProgress < previous.journeyProgress - EPSILON) {
      diagnostics.push({
        level: 'error',
        code: 'journey-camera-order',
        path: `cameraTrack.journeyCues.${anchor.id}`,
        message: `Journey cue “${anchor.id}” resolves before “${previous.id}”.`,
      });
    }
  });
  const authoredLockProgress = anchors.find((anchor) => anchor.id === 'camera-lock')?.journeyProgress;
  const lockProgress = Number.isFinite(authoredLockProgress) ? authoredLockProgress : 1;
  // Exported sample time and editorial cues are not physical distance. Measure
  // the existing rail once so semantic story anchors can target exact Blender
  // positions, including the export's accelerated sections and stationary tail.
  const pathDistances = cameraPathDistances(cameraTrack);
  const pathLengthWU = distanceAtProgress(pathDistances, lockProgress);
  if (!(pathLengthWU > EPSILON) || !Number.isFinite(pathLengthWU)) {
    diagnostics.push({
      level: 'error', code: 'journey-camera-distance-invalid', path: 'cameraTrack.samples',
      message: 'The camera rail must contain finite, nonzero travel before its endpoint.',
    });
  }
  for (const anchor of anchors) {
    anchor.cameraDistanceWU = Number.isFinite(anchor.journeyProgress)
      ? Math.min(pathLengthWU, distanceAtProgress(pathDistances, anchor.journeyProgress))
      : 0;
    // Preserve this compatibility field for visibility consumers. It now uses
    // the semantic story clock, so camera and scene visibility cross each
    // Blender cue at the same content-paced point.
    anchor.cameraStoryWU = anchor.storyWU;
  }
  const interpolationAnchors = [];
  for (const anchor of anchors) {
    const previous = interpolationAnchors.at(-1);
    if (previous && Math.abs(previous.storyWU - anchor.storyWU) <= EPSILON) {
      if (Math.abs(previous.cameraDistanceWU - anchor.cameraDistanceWU) > EPSILON) {
        diagnostics.push({
          level: 'error',
          code: 'journey-coincident-anchor-drift',
          path: `cameraTrack.journeyCues.${anchor.cueName}`,
          message: `Coincident journey cue “${anchor.id}” resolves to a different camera position.`,
        });
      }
      continue;
    }
    interpolationAnchors.push(anchor);
  }
  writeCameraTravelRates(interpolationAnchors);
  const reducedReadingCuts = [
    ['portal-exit', 'personal-origin'], ['gate-entry', 'method'],
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
    diagnostics,
    anchors,
    interpolationAnchors,
    signature: `${storyMap.signature}:${cameraTrack?.source?.sha256 || cameraTrack?.sampleCount || ''}:semantic-monotone-v4`,
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
  output.sceneStoryWU = Math.min(time, map.durationWU);
  output.cameraDistanceWU = cameraDistanceAtStoryWU(
    map.interpolationAnchors || map.anchors,
    output.sceneStoryWU,
  );
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
