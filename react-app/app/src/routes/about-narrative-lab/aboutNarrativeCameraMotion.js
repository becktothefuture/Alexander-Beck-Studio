import {
  applyAboutNarrativeCameraEasing,
  compileAboutNarrativeCameraEasing,
} from './aboutNarrativeCameraEasing.js';
import {
  getAboutNarrativeCameraRotationFromQuaternion,
  slerpAboutNarrativeCameraQuaternionInto,
  writeAboutNarrativeCameraLookAtQuaternion,
  writeAboutNarrativeCameraOrbitPosition,
  writeAboutNarrativeCameraQuaternion,
  writeAboutNarrativeCameraTargetFromRotation,
} from './aboutNarrativeCameraRig.js';
import { isAboutNarrativeShortLandscape } from './aboutNarrativeMotionMath.js';
import {
  ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV,
  compileAboutNarrativeLongRideTrack,
  sampleAboutNarrativeLongRideBank,
  sampleAboutNarrativeLongRidePositionInto,
} from './aboutNarrativeLongRideTrack.js';
import {
  createAboutNarrativeWorldTransformSample,
  resolveAboutNarrativeWorldTransformInto,
} from './aboutNarrativeWorldTransform.js';

const TIME_EPSILON = 0.000001;
const DEGREES_TO_RADIANS = Math.PI / 180;
const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));
const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function mergeLane(keys, overrides = {}) {
  return keys
    .map((key) => ({ ...clone(key), ...clone(overrides[key.id] || {}) }))
    .sort((left, right) => Number(left.atWU) - Number(right.atWU) || left.id.localeCompare(right.id));
}

function findKeyIndex(keys, storyWU) {
  let low = 0;
  let high = keys.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (Number(keys[middle].atWU) <= storyWU) {
      result = middle;
      low = middle + 1;
    } else high = middle - 1;
  }
  return result;
}

function laneProgress(from, to, storyWU, reducedMotion) {
  if (reducedMotion || from === to) return 0;
  const raw = (storyWU - Number(from.atWU))
    / Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU));
  return applyAboutNarrativeCameraEasing(from.easingCurve, clamp01(raw));
}

function writeSecant(target, from, to) {
  const durationWU = Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU));
  for (let axis = 0; axis < 3; axis += 1) {
    target[axis] = (Number(to.position[axis]) - Number(from.position[axis])) / durationWU;
  }
  return target;
}

function writeMonotoneTangent(target, previous, key, next) {
  const incomingDurationWU = Math.max(
    TIME_EPSILON,
    Number(key.atWU) - Number(previous.atWU),
  );
  const outgoingDurationWU = Math.max(
    TIME_EPSILON,
    Number(next.atWU) - Number(key.atWU),
  );
  for (let axis = 0; axis < 3; axis += 1) {
    const incoming = (Number(key.position[axis]) - Number(previous.position[axis]))
      / incomingDurationWU;
    const outgoing = (Number(next.position[axis]) - Number(key.position[axis]))
      / outgoingDurationWU;
    // The harmonic mean preserves matching motion, while a flat or reversing
    // axis eases to rest. This prevents Hermite overshoot from pulling the
    // camera out of a straight corridor before an authored height change.
    target[axis] = incoming * outgoing <= 0
      ? 0
      : (2 * incoming * outgoing) / (incoming + outgoing);
  }
  return target;
}

function compileFluidTangents(moveKeys, orbit) {
  moveKeys.forEach((key, index) => {
    const previous = moveKeys[Math.max(0, index - 1)];
    const next = moveKeys[Math.min(moveKeys.length - 1, index + 1)];
    const incomingFluid = index > 0 && previous.velocityMode === 'fluid';
    const outgoingFluid = index < moveKeys.length - 1 && key.velocityMode === 'fluid';
    const tangent = [0, 0, 0];
    if (incomingFluid && outgoingFluid) {
      writeMonotoneTangent(tangent, previous, key, next);
    } else if (outgoingFluid) {
      writeSecant(tangent, key, next);
    } else if (incomingFluid) {
      writeSecant(tangent, previous, key);
    }
    key.tangent = tangent;
  });

  if (!orbit) return;
  const handoff = moveKeys.find((key) => (
    Math.abs(Number(key.atWU) - Number(orbit.startWU)) <= TIME_EPSILON
  ));
  if (!handoff) return;
  if (orbit.easingCurve?.legacy !== 'linear') {
    // An eased orbit has zero angular velocity at its boundary. Give the
    // preceding Hermite dolly the same resting tangent so forward motion
    // resolves without a sideways snap when orbit ownership begins.
    handoff.tangent = [0, 0, 0];
    return;
  }
  const durationWU = Math.max(TIME_EPSILON, Number(orbit.endWU) - Number(orbit.startWU));
  const angularVelocity = Number(orbit.arcDegrees) * DEGREES_TO_RADIANS / durationWU;
  const offsetX = Number(handoff.position[0]) - Number(orbit.target[0]);
  const offsetZ = Number(handoff.position[2]) - Number(orbit.target[2]);
  handoff.tangent = [
    offsetZ * angularVelocity,
    0,
    -offsetX * angularVelocity,
  ];
}

function fitForwardDollyCadence(moveKeys, orbit, forwardSpeedWU) {
  const speed = Number(forwardSpeedWU);
  const first = moveKeys[0];
  if (!(speed > 0) || !first?.position) return;
  const originWU = Number(first.atWU);
  const originZ = Number(first.position[2]);
  const handoffWU = Number(orbit?.startWU ?? Number.POSITIVE_INFINITY);
  moveKeys.forEach((key) => {
    if (Number(key.atWU) > handoffWU + TIME_EPSILON) return;
    // X and Y remain authored composition controls. Only rail depth is
    // derived, which guarantees one continuous forward cadence while content
    // reflow moves the semantic beats closer together or farther apart.
    key.position = [...key.position];
    key.position[2] = originZ - (speed * (Number(key.atWU) - originWU));
  });
}

function sampleFluidPositionInto(target, from, to, progress) {
  const durationWU = Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU));
  const progress2 = progress * progress;
  const progress3 = progress2 * progress;
  const h00 = (2 * progress3) - (3 * progress2) + 1;
  const h10 = progress3 - (2 * progress2) + progress;
  const h01 = (-2 * progress3) + (3 * progress2);
  const h11 = progress3 - progress2;
  for (let axis = 0; axis < 3; axis += 1) {
    target[axis] = (h00 * Number(from.position[axis]))
      + (h10 * durationWU * Number(from.tangent[axis]))
      + (h01 * Number(to.position[axis]))
      + (h11 * durationWU * Number(to.tangent[axis]));
  }
  return target;
}

function sampleMoveLaneInto(moveKeys, storyWU, reducedMotion, target) {
  const fromIndex = findKeyIndex(moveKeys, storyWU);
  const from = moveKeys[fromIndex];
  const to = moveKeys[Math.min(moveKeys.length - 1, fromIndex + 1)];
  const progress = from.velocityMode === 'fluid' && !reducedMotion && from !== to
    ? clamp01((storyWU - Number(from.atWU))
      / Math.max(TIME_EPSILON, Number(to.atWU) - Number(from.atWU)))
    : laneProgress(from, to, storyWU, reducedMotion);
  if (from.velocityMode === 'fluid' && !reducedMotion && from !== to) {
    return sampleFluidPositionInto(target, from, to, progress);
  }
  for (let axis = 0; axis < 3; axis += 1) {
    target[axis] = Number(from.position[axis])
      + ((Number(to.position[axis]) - Number(from.position[axis])) * progress);
  }
  return target;
}

function sampleRideRollOffset(lookKeys, storyWU, reducedMotion) {
  if (reducedMotion || !lookKeys.length) return 0;
  const fromIndex = findKeyIndex(lookKeys, storyWU);
  const from = lookKeys[fromIndex];
  const to = lookKeys[Math.min(lookKeys.length - 1, fromIndex + 1)];
  const progress = laneProgress(from, to, storyWU, false);
  const fromRoll = Number(from.rollOffset) || 0;
  const toRoll = Number(to.rollOffset) || 0;
  return fromRoll + ((toRoll - fromRoll) * progress);
}

function resolveOrbitTarget(orbit, worlds, pointProfile, layoutProfile, options) {
  if (!orbit) return null;
  const world = worlds.find((candidate) => candidate.stateId === orbit.targetStateId);
  if (!world) return null;
  const compact = pointProfile === 'mobile';
  const shortLandscape = isAboutNarrativeShortLandscape({
    layoutProfile,
    width: options.inlineSize,
    height: options.blockSize,
  });
  const resolved = resolveAboutNarrativeWorldTransformInto(
    world,
    {
      inlineSize: options.inlineSize,
      compact,
      shortLandscape,
      anchorRailZ: Number(world.anchorRailZ || 0),
    },
    createAboutNarrativeWorldTransformSample(),
  );
  return [...resolved.position];
}

function resolveLongRideTrack(worlds, pointProfile, layoutProfile, options) {
  const world = worlds.find((candidate) => candidate.shapeId === 'long-assembly-corridor-v1');
  if (!world) return null;
  const compact = pointProfile === 'mobile';
  const shortLandscape = isAboutNarrativeShortLandscape({
    layoutProfile,
    width: options.inlineSize,
    height: options.blockSize,
  });
  const resolved = resolveAboutNarrativeWorldTransformInto(
    world,
    {
      inlineSize: options.inlineSize,
      compact,
      shortLandscape,
      anchorRailZ: Number(world.anchorRailZ || 0),
    },
    createAboutNarrativeWorldTransformSample(),
  );
  return compileAboutNarrativeLongRideTrack(world.shapeParameters, {
    xScale: resolved.xScale,
    yScale: resolved.scale,
    zScale: resolved.scale,
    offsetX: resolved.position[0],
    offsetY: resolved.position[1],
    offsetZ: resolved.position[2],
    // A full revolution must end level on every viewport. Scaling an
    // unwrapped 360-degree roll would leave compact layouts permanently
    // tilted, so mobile keeps the same physical loop and relies on Reduced
    // Motion for visitors who do not want camera rotation.
    rollScale: 1,
  });
}

export function compileAboutNarrativeCameraMotion(
  document,
  layoutProfile,
  worlds,
  pointProfile,
  options = {},
) {
  const camera = document.tracks.camera;
  const overrides = document.profiles[layoutProfile]?.overrides?.camera || {};
  const ride = resolveLongRideTrack(worlds, pointProfile, layoutProfile, options);
  const orbitTarget = resolveOrbitTarget(
    camera.orbit,
    worlds,
    pointProfile,
    layoutProfile,
    options,
  );
  const orbit = camera.orbit && orbitTarget ? {
    ...clone(camera.orbit),
    target: orbitTarget,
    arcRadians: Number(camera.orbit.arcDegrees) * DEGREES_TO_RADIANS,
    easingCurve: compileAboutNarrativeCameraEasing(camera.orbit.easing || 'smoothstep'),
  } : null;
  const moveKeys = mergeLane(camera.moveKeys, overrides).map((key) => ({
    ...key,
    easingCurve: compileAboutNarrativeCameraEasing(
      ['constant', 'fluid'].includes(key.velocityMode) ? 'linear' : key.easing,
    ),
  }));
  const lookKeys = mergeLane(camera.lookKeys, overrides).map((key) => ({
    ...key,
    easingCurve: compileAboutNarrativeCameraEasing(key.easing),
    quaternion: writeAboutNarrativeCameraQuaternion([0, 0, 0, 1], key.rotation),
  }));
  const lensKeys = mergeLane(camera.lensKeys, overrides).map((key) => ({
    ...key,
    easingCurve: compileAboutNarrativeCameraEasing(key.easing),
  }));
  if (!ride) {
    fitForwardDollyCadence(moveKeys, orbit, document.globals.camera?.forwardSpeedWU);
  }
  compileFluidTangents(moveKeys, orbit);

  if (orbit) {
    const handoffPosition = moveKeys.find((key) => (
      Math.abs(Number(key.atWU) - Number(orbit.startWU)) <= TIME_EPSILON
    ))?.position;
    orbit.startPosition = clone(handoffPosition);
    const lookHandoff = lookKeys.find((key) => (
      Math.abs(Number(key.atWU) - Number(orbit.startWU)) <= TIME_EPSILON
    ));
    if (lookHandoff && handoffPosition) {
      writeAboutNarrativeCameraLookAtQuaternion(
        lookHandoff.quaternion,
        handoffPosition,
        orbit.target,
        0,
      );
      lookHandoff.rotation = getAboutNarrativeCameraRotationFromQuaternion(
        lookHandoff.quaternion,
      );
    }
  }
  return deepFreeze({ moveKeys, lookKeys, lensKeys, orbit, ride });
}

export function sampleAboutNarrativeCameraMotionInto(
  camera,
  storyWU,
  reducedMotion,
  target,
  options = {},
) {
  if (camera.ride) {
    const rideStoryWU = reducedMotion
      ? Number(camera.moveKeys[findKeyIndex(camera.moveKeys, storyWU)].atWU)
      : Number(storyWU);
    const lookAheadWU = Math.min(
      camera.ride.tailEndWU,
      rideStoryWU + camera.ride.lookAheadWU,
    );
    sampleAboutNarrativeLongRidePositionInto(camera.ride, rideStoryWU, target.position);
    sampleAboutNarrativeLongRidePositionInto(camera.ride, lookAheadWU, target.lookAtTarget);
    // Each rectangular gate is authored from this same look-ahead chord and
    // bank, so it emerges square to the camera instead of skewing across it.
    // The authored Look lane remains an additive Director adjustment.
    const rollDegrees = reducedMotion
      ? 0
      : sampleAboutNarrativeLongRideBank(camera.ride, rideStoryWU)
        + sampleRideRollOffset(camera.lookKeys, storyWU, false);
    writeAboutNarrativeCameraLookAtQuaternion(
      target.quaternion,
      target.position,
      target.lookAtTarget,
      rollDegrees,
    );
    target.lookAtRoll = rollDegrees;
  } else {
    sampleMoveLaneInto(camera.moveKeys, storyWU, reducedMotion, target.position);

    const lookFromIndex = findKeyIndex(camera.lookKeys, storyWU);
    const lookFrom = camera.lookKeys[lookFromIndex];
    const lookTo = camera.lookKeys[Math.min(camera.lookKeys.length - 1, lookFromIndex + 1)];
    const lookProgress = laneProgress(lookFrom, lookTo, storyWU, reducedMotion);
    slerpAboutNarrativeCameraQuaternionInto(
      target.quaternion,
      lookFrom.quaternion,
      lookTo.quaternion,
      lookProgress,
    );
    writeAboutNarrativeCameraTargetFromRotation(
      target.lookAtTarget,
      target.position,
      [
        Number(lookFrom.rotation[0]) + ((Number(lookTo.rotation[0]) - Number(lookFrom.rotation[0])) * lookProgress),
        Number(lookFrom.rotation[1]) + ((Number(lookTo.rotation[1]) - Number(lookFrom.rotation[1])) * lookProgress),
        Number(lookFrom.rotation[2]) + ((Number(lookTo.rotation[2]) - Number(lookFrom.rotation[2])) * lookProgress),
      ],
      1,
    );
    target.lookAtRoll = 0;
  }
  target.aimWeight = 0;
  target.targeted = false;

  const orbit = camera.orbit;
  if (orbit && storyWU >= Number(orbit.startWU) && orbit.startPosition) {
    const rawOrbitProgress = reducedMotion
      ? 0
      : clamp01((storyWU - Number(orbit.startWU))
        / Math.max(TIME_EPSILON, Number(orbit.endWU) - Number(orbit.startWU)));
    // The dolly and orbit meet at zero velocity. The same smoothstep family
    // also releases the floor ripple and gathers the bust, so the complete
    // floor-to-form handoff reads as one continuous acceleration curve.
    const orbitProgress = applyAboutNarrativeCameraEasing(
      orbit.easingCurve,
      rawOrbitProgress,
    );
    const orbitDurationWU = Math.max(
      TIME_EPSILON,
      Number(orbit.endWU) - Number(orbit.startWU),
    );
    // Continued end-scroll adds an angular offset to the completed authored
    // orbit. Multiplying by the arrival progress lets that offset unwind
    // smoothly if the visitor scrolls back through the orbit instead of
    // snapping the camera to the canonical angle.
    const finaleOrbitWU = reducedMotion ? 0 : Number(options.finaleOrbitWU) || 0;
    const finaleOrbitProgress = (finaleOrbitWU / orbitDurationWU) * orbitProgress;
    writeAboutNarrativeCameraOrbitPosition(
      target.position,
      orbit.startPosition,
      orbit.target,
      Number(orbit.arcRadians) * (orbitProgress + finaleOrbitProgress),
    );
    writeAboutNarrativeCameraLookAtQuaternion(
      target.quaternion,
      target.position,
      orbit.target,
      0,
    );
    target.lookAtTarget.splice(0, 3, ...orbit.target);
    target.aimWeight = 1;
    target.targeted = true;
  }

  if (camera.ride) {
    target.fov = ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV;
  } else {
    const lensFromIndex = findKeyIndex(camera.lensKeys, storyWU);
    const lensFrom = camera.lensKeys[lensFromIndex];
    const lensTo = camera.lensKeys[Math.min(camera.lensKeys.length - 1, lensFromIndex + 1)];
    const lensProgress = laneProgress(lensFrom, lensTo, storyWU, reducedMotion);
    target.fov = Number(lensFrom.fov)
      + ((Number(lensTo.fov) - Number(lensFrom.fov)) * lensProgress);
  }
  return target;
}
