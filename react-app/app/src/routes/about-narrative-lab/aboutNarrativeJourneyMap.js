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
  journeyRole('finding-form', 'about.01', 0, 'ABS_FINDING_FORM'),
  journeyRole('crossing-entry', 'about.02', 0, 'ABS_CROSSING_ENTRY'),
  journeyRole('crossing-exit', 'about.02', 1, 'ABS_CROSSING_EXIT'),
  journeyRole('wider-field', 'about.03', 0, 'ABS_WIDER_FIELD'),
  journeyRole('panorama', 'about.03', 0.65, 'ABS_PANORAMA'),
  journeyRole('assembly-entry', 'about.04', 0, 'ABS_ASSEMBLY_ENTRY'),
  journeyRole('method', 'about.05', 0, 'ABS_METHOD'),
  journeyRole('river-reveal', 'about.06', 0, 'ABS_RIVER_REVEAL'),
  journeyRole('cathedral-axis', 'about.06', 0.2, 'ABS_CATHEDRAL_AXIS'),
  journeyRole('cathedral-pass', 'about.06', 0.5, 'ABS_CATHEDRAL_PASS'),
  journeyRole('finale-deceleration', 'about.06', 0.7, 'ABS_FINALE_DECEL'),
  journeyRole('invitation', 'about.06', 0.78, 'ABS_INVITATION'),
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
  const riverStartWU = stageTiming(storyLayout, 'about.06', 0);
  const invitationStartWU = storyLayout?.fields?.find((field) => field.id === 'text-epilogue-invitation')?.startWU;
  // Approach cues belong to the text-free lead. Enlarging the invitation must
  // extend its reading/settling interval, never move the approach after it.
  const approachProgress = { 'cathedral-axis': 0.27, 'cathedral-pass': 0.67, 'finale-deceleration': 0.93 };
  const anchors = JOURNEY_ROLES.map((role) => {
    const storyWU = role.id === 'invitation'
      ? invitationStartWU
        ?? stageTiming(storyLayout, role.stageId, role.stageProgress)
      : approachProgress[role.id] != null && Number.isFinite(invitationStartWU)
        ? riverStartWU + (invitationStartWU - riverStartWU) * approachProgress[role.id]
      : stageTiming(storyLayout, role.stageId, role.stageProgress);
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
    runwayStartWU: byId.get('river-reveal')?.storyWU ?? 0,
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
  if (samples.length < 2 || samples.some(sample => !Array.isArray(sample)
    || !sample.slice(0, 3).every(Number.isFinite) || sample.length < 3)) return [];
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
  if (distances.length < 2) return 0;
  const cursor = clamp01(progress) * (distances.length - 1);
  const index = Math.floor(cursor);
  const next = Math.min(index + 1, distances.length - 1);
  return distances[index] + (distances[next] - distances[index]) * (cursor - index);
}

function progressAtDistance(distances, distance) {
  if (distances.length < 2 || distance <= 0) return 0;
  if (distance >= distances.at(-1)) return 1;
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
      journeyProgress,
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
  // Exported frame time is not physical distance. Measure the complete rail
  // once, excluding the stationary tail, so equal scroll increments traverse
  // equal distances regardless of title, reading or finale cue placement.
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
    // Scenery follows the physical camera. Editorial timing remains measured
    // from the content and cannot accelerate or slow down the flight.
    anchor.cameraStoryWU = pathLengthWU > EPSILON
      ? anchor.cameraDistanceWU / pathLengthWU * storyMap.durationWU
      : 0;
  }
  const interpolationAnchors = [];
  for (const anchor of anchors) {
    const previous = interpolationAnchors.at(-1);
    // These are physical checkpoints, not an editorial speed curve. Two text
    // boundaries may coincide without changing the camera's distance mapping.
    if (previous && Math.abs(previous.cameraDistanceWU - anchor.cameraDistanceWU) <= EPSILON) continue;
    interpolationAnchors.push(anchor);
  }
  return deepFreeze({
    valid: !diagnostics.some((item) => item.level === 'error'),
    diagnostics,
    anchors,
    interpolationAnchors,
    signature: `${storyMap.signature}:${cameraTrack?.source?.sha256 || cameraTrack?.sampleCount || ''}:constant-distance-v6`,
    finaleStartWU: anchors.find(anchor => anchor.id === 'finale-deceleration')?.cameraStoryWU ?? 0,
    runwayStartWU: anchors.find(anchor => anchor.id === 'river-reveal')?.cameraStoryWU ?? 0,
    lockStoryWU: storyMap.durationWU,
    lockProgress,
    pathDistances,
    pathLengthWU,
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
