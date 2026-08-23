const TRACK_EPSILON = 0.000001;
const TRACK_FRAME_SAMPLE_WU = 0.025;

export const ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU = 22;
export const ABOUT_NARRATIVE_LONG_RIDE_ORIGIN_Z = 14;
export const ABOUT_NARRATIVE_LONG_RIDE_FORWARD_UNITS_PER_WU = 18.5;
export const ABOUT_NARRATIVE_LONG_RIDE_LOOK_AHEAD_WU = 0.82;
export const ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV = 85;

export const ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS = Object.freeze({
  background: 3.6,
  intersection: 8.05,
  disciplines: 11.5,
  city: 16.1,
  finale: 20.1,
});

export const ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS = Object.freeze({
  loopStartWU: 7.9,
  loopEndWU: 13.85,
  loopRadiusX: 9.5,
  loopRadiusY: 8.7,
  loopRollDegrees: 360,
  terminalDistanceWU: 1.25,
});

export const ABOUT_NARRATIVE_LONG_RIDE_BASE_STAGES = Object.freeze({
  signal: Object.freeze({ startWU: 0, endWU: 1.2 }),
  hoops: Object.freeze({ startWU: 1.2, endWU: 5.15 }),
  yard: Object.freeze({ startWU: 5.15, endWU: ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopStartWU }),
  loop: Object.freeze({
    startWU: ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopStartWU,
    endWU: ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopEndWU,
  }),
  ignition: Object.freeze({ startWU: ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopEndWU, endWU: 15.1 }),
  living: Object.freeze({ startWU: 15.1, endWU: 18.2 }),
  reveal: Object.freeze({ startWU: 18.2, endWU: 22 }),
  terminal: Object.freeze({
    startWU: 22,
    endWU: 22 + ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.terminalDistanceWU,
  }),
});

const BASE_ANCHOR_VALUES = Object.freeze([
  0,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.background,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.intersection,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.disciplines,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.city,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.finale,
  ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
]);

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const clamp01 = (value) => clamp(Number(value) || 0, 0, 1);

export function resolveAboutNarrativeLongRideBaseStages(parameters = {}) {
  const loopStartWU = clamp(
    Number(parameters.loopStartWU ?? ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopStartWU),
    7.6,
    9,
  );
  const loopEndWU = clamp(
    Number(parameters.loopEndWU ?? ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopEndWU),
    12.8,
    14.3,
  );
  const terminalDistanceWU = clamp(
    Number(parameters.terminalDistanceWU
      ?? ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.terminalDistanceWU),
    0.6,
    2.4,
  );
  return Object.freeze({
    signal: Object.freeze({ startWU: 0, endWU: 1.2 }),
    hoops: Object.freeze({ startWU: 1.2, endWU: 5.15 }),
    yard: Object.freeze({ startWU: 5.15, endWU: loopStartWU }),
    loop: Object.freeze({ startWU: loopStartWU, endWU: loopEndWU }),
    ignition: Object.freeze({ startWU: loopEndWU, endWU: 15.1 }),
    living: Object.freeze({ startWU: 15.1, endWU: 18.2 }),
    reveal: Object.freeze({ startWU: 18.2, endWU: 22 }),
    terminal: Object.freeze({ startWU: 22, endWU: 22 + terminalDistanceWU }),
  });
}

// X/Y describe the ride centreline before authored shape and responsive scale.
// Z is derived from Story WU so copy edits change distance without changing the
// order or physical identity of the places along the route.
function createBaseControlPoints(parameters = {}) {
  const stages = resolveAboutNarrativeLongRideBaseStages(parameters);
  const loopRadiusX = clamp(
    Number(parameters.loopRadiusX ?? ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopRadiusX),
    6,
    14,
  );
  const loopRadiusY = clamp(
    Number(parameters.loopRadiusY ?? ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopRadiusY),
    5,
    12,
  );
  const loopRollDegrees = clamp(
    Number(parameters.loopRollDegrees
      ?? ABOUT_NARRATIVE_LONG_RIDE_DEFAULTS.loopRollDegrees),
    -720,
    720,
  );
  const loopDurationWU = stages.loop.endWU - stages.loop.startWU;
  const loopControls = Array.from({ length: 9 }, (_, index) => {
    const progress = index / 8;
    const angle = progress * Math.PI * 2;
    return {
      atWU: stages.loop.startWU + (loopDurationWU * progress),
      x: Math.sin(angle) * loopRadiusX,
      y: 0.15 + ((1 - Math.cos(angle)) * loopRadiusY),
      bank: progress * loopRollDegrees,
      deckWidth: 5.4 - (Math.sin(progress * Math.PI) * 0.8),
    };
  });
  loopControls.at(-1).y = 0.55;

  const terminalWU = stages.terminal.endWU;
  return Object.freeze([
    Object.freeze({ atWU: 0, x: 0, y: 0.15, bank: 0, deckWidth: 9.5 }),
    Object.freeze({ atWU: 0.8, x: 0, y: 0.05, bank: 0, deckWidth: 7 }),
    // The hoop run makes one broad, legible curve. Every aperture remains
    // centred on this shared rail, so the direction of travel is unambiguous.
    Object.freeze({ atWU: 1.4, x: -1.2, y: 0.15, bank: -2, deckWidth: 6.4 }),
    Object.freeze({ atWU: 2.1, x: -4.8, y: 0.5, bank: -5, deckWidth: 5.8 }),
    Object.freeze({ atWU: 2.9, x: -8.5, y: 1.15, bank: -8, deckWidth: 5.4 }),
    Object.freeze({ atWU: 3.7, x: -10.5, y: 2, bank: -9, deckWidth: 5.2 }),
    Object.freeze({ atWU: 4.5, x: -8.2, y: 2.65, bank: -5, deckWidth: 5.8 }),
    Object.freeze({ atWU: 5.2, x: -4.5, y: 2.4, bank: 0, deckWidth: 7.2 }),
    // A restrained chicane provides pass-by motion without turning the yard
    // into another enclosing tunnel.
    Object.freeze({ atWU: 6.05, x: 2.5, y: 1.25, bank: 4, deckWidth: 8.4 }),
    Object.freeze({ atWU: 6.85, x: 6.8, y: -0.35, bank: 6, deckWidth: 7.7 }),
    Object.freeze({ atWU: 7.45, x: 2, y: -0.6, bank: 2, deckWidth: 6.4 }),
    ...loopControls.map((control) => Object.freeze(control)),
    // The loop now occupies almost twice the prior distance. These controls
    // settle the rail gradually before the living field begins.
    Object.freeze({
      atWU: stages.loop.endWU + 0.55,
      x: 1.2,
      y: 0.85,
      bank: loopRollDegrees,
      deckWidth: 6.7,
    }),
    Object.freeze({ atWU: 15.1, x: -0.75, y: 1.6, bank: loopRollDegrees, deckWidth: 7.4 }),
    // Living structures move around a calm, level camera. Lateral movement
    // narrows before the reveal so the final approach settles onto one
    // straight centreline instead of weaving left and right.
    Object.freeze({ atWU: 16.1, x: 0, y: 0.65, bank: loopRollDegrees, deckWidth: 6.2 }),
    Object.freeze({ atWU: 17.1, x: 0.45, y: 0.85, bank: loopRollDegrees, deckWidth: 5.8 }),
    Object.freeze({ atWU: 18.2, x: 0, y: 1.15, bank: loopRollDegrees, deckWidth: 5.2 }),
    // The final approach is straight, quiet, and free of framing gates.
    Object.freeze({ atWU: 19.2, x: 0, y: 1.65, bank: loopRollDegrees, deckWidth: 4.8 }),
    Object.freeze({ atWU: 20.1, x: 0, y: 2.1, bank: loopRollDegrees, deckWidth: 4.4 }),
    Object.freeze({ atWU: 22, x: 0, y: 2.2, bank: loopRollDegrees, deckWidth: 4.2 }),
    // The invisible rail keeps only a slight upward pitch beyond the last
    // camera position. The authored track owns the remaining depth, so the steadycam
    // does not need a sharp final tilt.
    Object.freeze({ atWU: terminalWU, x: 0, y: 3.25, bank: loopRollDegrees, deckWidth: 3.9 }),
    Object.freeze({ atWU: terminalWU + 0.25, x: 0, y: 3.35, bank: loopRollDegrees, deckWidth: 3.8 }),
  ]);
}

function smoothstep(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
}

function runtimeAnchorValues(parameters, storyDurationWU) {
  const authoredLandmarks = [
    Number(parameters.backgroundAnchorWU ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.background),
    Number(parameters.intersectionAnchorWU ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.intersection),
    Number(parameters.disciplinesAnchorWU ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.disciplines),
    Number(parameters.cityAnchorWU ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.city),
    Number(parameters.finaleAnchorWU ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS.finale),
  ];
  const baseLandmarks = BASE_ANCHOR_VALUES.slice(1, -1);
  const unchangedBaseLandmarks = authoredLandmarks.every((value, index) => (
    Math.abs(value - baseLandmarks[index]) <= TRACK_EPSILON
  ));
  const strictlyOrdered = authoredLandmarks.every((value, index) => (
    Number.isFinite(value)
      && value > (index === 0 ? 0 : authoredLandmarks[index - 1]) + TRACK_EPSILON
      && value < storyDurationWU - TRACK_EPSILON
  ));
  // Direct Shape edits often change only storyDurationWU. Scaling the canonical
  // landmarks keeps that supported path continuous; measured Story Stack input
  // supplies its own valid semantic anchors and therefore keeps local pacing.
  const landmarks = !strictlyOrdered
    || (unchangedBaseLandmarks
      && Math.abs(storyDurationWU - ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU) > TRACK_EPSILON)
    ? baseLandmarks.map((value) => (
      value * (storyDurationWU / ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU)
    ))
    : authoredLandmarks;
  return Object.freeze([0, ...landmarks, storyDurationWU]);
}

export function createAboutNarrativeLongRideStoryMapper(parameters = {}) {
  const storyDurationWU = clamp(
    Number(parameters.storyDurationWU ?? ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU),
    8,
    48,
  );
  const runtimeAnchors = runtimeAnchorValues(parameters, storyDurationWU);
  const runtimeWUAtBaseWU = (baseWU) => {
    const clampedBaseWU = clamp(
      Number(baseWU) || 0,
      0,
      ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
    );
    let segmentIndex = BASE_ANCHOR_VALUES.length - 2;
    for (let index = 0; index < BASE_ANCHOR_VALUES.length - 1; index += 1) {
      if (clampedBaseWU <= BASE_ANCHOR_VALUES[index + 1]) {
        segmentIndex = index;
        break;
      }
    }
    const baseStart = BASE_ANCHOR_VALUES[segmentIndex];
    const baseEnd = BASE_ANCHOR_VALUES[segmentIndex + 1];
    const runtimeStart = runtimeAnchors[segmentIndex];
    const runtimeEnd = runtimeAnchors[segmentIndex + 1];
    const ratio = (clampedBaseWU - baseStart) / Math.max(TRACK_EPSILON, baseEnd - baseStart);
    return runtimeStart + ((runtimeEnd - runtimeStart) * ratio);
  };
  return Object.freeze({ storyDurationWU, runtimeAnchors, runtimeWUAtBaseWU });
}

function writeHermiteValue(from, to, previous, next, progress, field) {
  const duration = Math.max(TRACK_EPSILON, to.atWU - from.atWU);
  const incomingDuration = Math.max(TRACK_EPSILON, to.atWU - previous.atWU);
  const outgoingDuration = Math.max(TRACK_EPSILON, next.atWU - from.atWU);
  const fromTangent = (to[field] - previous[field]) / incomingDuration;
  const toTangent = (next[field] - from[field]) / outgoingDuration;
  const progress2 = progress * progress;
  const progress3 = progress2 * progress;
  const h00 = (2 * progress3) - (3 * progress2) + 1;
  const h10 = progress3 - (2 * progress2) + progress;
  const h01 = (-2 * progress3) + (3 * progress2);
  const h11 = progress3 - progress2;
  return (h00 * from[field])
    + (h10 * duration * fromTangent)
    + (h01 * to[field])
    + (h11 * duration * toTangent);
}

function findSegmentIndex(controlPoints, storyWU) {
  const clampedStoryWU = clamp(
    Number(storyWU) || 0,
    controlPoints[0].atWU,
    controlPoints.at(-1).atWU,
  );
  for (let index = 0; index < controlPoints.length - 1; index += 1) {
    if (clampedStoryWU <= controlPoints[index + 1].atWU + TRACK_EPSILON) return index;
  }
  return controlPoints.length - 2;
}

export function compileAboutNarrativeLongRideTrack(parameters = {}, responsive = {}) {
  const mapper = createAboutNarrativeLongRideStoryMapper(parameters);
  const baseStages = resolveAboutNarrativeLongRideBaseStages(parameters);
  const widthScale = clamp(Number(parameters.widthScale ?? 1), 0.5, 1.6);
  const heightScale = clamp(Number(parameters.heightScale ?? 1), 0.5, 1.6);
  const depthScale = clamp(Number(parameters.depthScale ?? 1), 0.65, 1.35);
  const lookAheadWU = clamp(
    Number(parameters.cameraLookAheadWU ?? ABOUT_NARRATIVE_LONG_RIDE_LOOK_AHEAD_WU),
    0.35,
    1.4,
  );
  const responsiveXScale = Number(responsive.xScale ?? 1);
  const responsiveYScale = Number(responsive.yScale ?? 1);
  const responsiveZScale = Number(responsive.zScale ?? 1);
  const offsetX = Number(responsive.offsetX || 0);
  const offsetY = Number(responsive.offsetY || 0);
  const offsetZ = Number(responsive.offsetZ || 0);
  const controls = createBaseControlPoints(parameters).map((control) => {
    const atWU = control.atWU <= ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU
      ? mapper.runtimeWUAtBaseWU(control.atWU)
      : mapper.storyDurationWU
        + (control.atWU - ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU);
    return Object.freeze({
      baseWU: control.atWU,
      atWU,
      x: offsetX + (control.x * widthScale * responsiveXScale),
      y: offsetY + (control.y * heightScale * responsiveYScale),
      z: offsetZ + ((ABOUT_NARRATIVE_LONG_RIDE_ORIGIN_Z
        - (ABOUT_NARRATIVE_LONG_RIDE_FORWARD_UNITS_PER_WU * atWU * depthScale))
        * responsiveZScale),
      bank: control.bank,
      deckWidth: control.deckWidth * widthScale * responsiveXScale,
    });
  });
  return Object.freeze({
    storyDurationWU: mapper.storyDurationWU,
    tailEndWU: controls.at(-1).atWU,
    controls: Object.freeze(controls),
    mapper,
    baseStages,
    lookAheadWU,
    mobileRollScale: Number(responsive.rollScale ?? 1),
  });
}

export function sampleAboutNarrativeLongRidePositionInto(track, storyWU, target) {
  const controls = track.controls;
  const segmentIndex = findSegmentIndex(controls, storyWU);
  const from = controls[segmentIndex];
  const to = controls[segmentIndex + 1];
  const previous = controls[Math.max(0, segmentIndex - 1)];
  const next = controls[Math.min(controls.length - 1, segmentIndex + 2)];
  const progress = clamp01(
    (Number(storyWU) - from.atWU) / Math.max(TRACK_EPSILON, to.atWU - from.atWU),
  );
  target[0] = writeHermiteValue(from, to, previous, next, progress, 'x');
  target[1] = writeHermiteValue(from, to, previous, next, progress, 'y');
  target[2] = writeHermiteValue(from, to, previous, next, progress, 'z');
  return target;
}

export function sampleAboutNarrativeLongRideTangentInto(
  track,
  storyWU,
  target,
  aheadScratch,
  behindScratch,
) {
  const trackStartWU = track.controls[0].atWU;
  const clampedStoryWU = clamp(Number(storyWU), trackStartWU, track.tailEndWU);
  sampleAboutNarrativeLongRidePositionInto(
    track,
    Math.min(track.tailEndWU, clampedStoryWU + TRACK_FRAME_SAMPLE_WU),
    aheadScratch,
  );
  sampleAboutNarrativeLongRidePositionInto(
    track,
    Math.max(trackStartWU, clampedStoryWU - TRACK_FRAME_SAMPLE_WU),
    behindScratch,
  );
  target[0] = aheadScratch[0] - behindScratch[0];
  target[1] = aheadScratch[1] - behindScratch[1];
  target[2] = aheadScratch[2] - behindScratch[2];
  const length = Math.hypot(target[0], target[1], target[2]) || 1;
  target[0] /= length;
  target[1] /= length;
  target[2] /= length;
  return target;
}

export function sampleAboutNarrativeLongRideBank(track, storyWU) {
  const controls = track.controls;
  const segmentIndex = findSegmentIndex(controls, storyWU);
  const from = controls[segmentIndex];
  const to = controls[segmentIndex + 1];
  const previous = controls[Math.max(0, segmentIndex - 1)];
  const next = controls[Math.min(controls.length - 1, segmentIndex + 2)];
  const progress = clamp01(
    (Number(storyWU) - from.atWU) / Math.max(TRACK_EPSILON, to.atWU - from.atWU),
  );
  return writeHermiteValue(from, to, previous, next, progress, 'bank')
    * track.mobileRollScale;
}

export function sampleAboutNarrativeLongRideDeckWidth(track, storyWU) {
  const controls = track.controls;
  const segmentIndex = findSegmentIndex(controls, storyWU);
  const from = controls[segmentIndex];
  const to = controls[segmentIndex + 1];
  const progress = smoothstep(
    (Number(storyWU) - from.atWU) / Math.max(TRACK_EPSILON, to.atWU - from.atWU),
  );
  return from.deckWidth + ((to.deckWidth - from.deckWidth) * progress);
}

export const ABOUT_NARRATIVE_LONG_RIDE = Object.freeze({
  baseDurationWU: ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
  baseAnchors: ABOUT_NARRATIVE_LONG_RIDE_BASE_ANCHORS,
  originZ: ABOUT_NARRATIVE_LONG_RIDE_ORIGIN_Z,
  forwardUnitsPerWU: ABOUT_NARRATIVE_LONG_RIDE_FORWARD_UNITS_PER_WU,
  estimatedTrackLength: ABOUT_NARRATIVE_LONG_RIDE_FORWARD_UNITS_PER_WU
    * ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
});
