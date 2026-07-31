import {
  applyAboutNarrativeCameraEasing,
  compileAboutNarrativeCameraEasing,
} from './aboutNarrativeCameraEasing.js';
import {
  slerpAboutNarrativeCameraQuaternionInto,
  writeAboutNarrativeCameraLookAtQuaternion,
  writeAboutNarrativeCameraQuaternion,
  writeAboutNarrativeCameraTargetFromRotation,
} from './aboutNarrativeCameraRig.js';

const CAMERA_TIME_EPSILON = 0.000001;
const CAMERA_ORBIT_EPSILON = 0.000001;
const CAMERA_ORBIT_TARGET_EPSILON = 0.00001;

function mix(from, to, progress) {
  return from + ((to - from) * progress);
}

function writeVectorMix(target, from, to, progress) {
  target[0] = mix(from[0], to[0], progress);
  target[1] = mix(from[1], to[1], progress);
  target[2] = mix(from[2], to[2], progress);
}

function cameraTargetsMatch(from, to) {
  return Math.abs(from[0] - to[0]) <= CAMERA_ORBIT_TARGET_EPSILON
    && Math.abs(from[1] - to[1]) <= CAMERA_ORBIT_TARGET_EPSILON
    && Math.abs(from[2] - to[2]) <= CAMERA_ORBIT_TARGET_EPSILON;
}

function writeCameraOrbitMix(target, from, to, center, progress) {
  if (progress <= 0) {
    target[0] = from[0];
    target[1] = from[1];
    target[2] = from[2];
    return;
  }
  if (progress >= 1) {
    target[0] = to[0];
    target[1] = to[1];
    target[2] = to[2];
    return;
  }

  const fromX = from[0] - center[0];
  const fromY = from[1] - center[1];
  const fromZ = from[2] - center[2];
  const toX = to[0] - center[0];
  const toY = to[1] - center[1];
  const toZ = to[2] - center[2];
  const fromRadius = Math.hypot(fromX, fromY, fromZ);
  const toRadius = Math.hypot(toX, toY, toZ);
  if (fromRadius <= CAMERA_ORBIT_EPSILON || toRadius <= CAMERA_ORBIT_EPSILON) {
    writeVectorMix(target, from, to, progress);
    return;
  }

  const unitFromX = fromX / fromRadius;
  const unitFromY = fromY / fromRadius;
  const unitFromZ = fromZ / fromRadius;
  const unitToX = toX / toRadius;
  const unitToY = toY / toRadius;
  const unitToZ = toZ / toRadius;
  const dot = Math.min(1, Math.max(-1,
    (unitFromX * unitToX) + (unitFromY * unitToY) + (unitFromZ * unitToZ)));
  let directionX;
  let directionY;
  let directionZ;

  if (dot < -1 + CAMERA_ORBIT_EPSILON) {
    let orthogonalX = Math.abs(unitFromX) < 0.9 ? 0 : -unitFromY;
    let orthogonalY = Math.abs(unitFromX) < 0.9 ? unitFromZ : unitFromX;
    let orthogonalZ = Math.abs(unitFromX) < 0.9 ? -unitFromY : 0;
    const orthogonalLength = Math.hypot(orthogonalX, orthogonalY, orthogonalZ) || 1;
    orthogonalX /= orthogonalLength;
    orthogonalY /= orthogonalLength;
    orthogonalZ /= orthogonalLength;
    const angle = Math.PI * progress;
    directionX = (unitFromX * Math.cos(angle)) + (orthogonalX * Math.sin(angle));
    directionY = (unitFromY * Math.cos(angle)) + (orthogonalY * Math.sin(angle));
    directionZ = (unitFromZ * Math.cos(angle)) + (orthogonalZ * Math.sin(angle));
  } else if (dot > 1 - CAMERA_ORBIT_EPSILON) {
    directionX = mix(unitFromX, unitToX, progress);
    directionY = mix(unitFromY, unitToY, progress);
    directionZ = mix(unitFromZ, unitToZ, progress);
    const directionLength = Math.hypot(directionX, directionY, directionZ) || 1;
    directionX /= directionLength;
    directionY /= directionLength;
    directionZ /= directionLength;
  } else {
    const angle = Math.acos(dot);
    const sine = Math.sin(angle);
    const fromWeight = Math.sin((1 - progress) * angle) / sine;
    const toWeight = Math.sin(progress * angle) / sine;
    directionX = (unitFromX * fromWeight) + (unitToX * toWeight);
    directionY = (unitFromY * fromWeight) + (unitToY * toWeight);
    directionZ = (unitFromZ * fromWeight) + (unitToZ * toWeight);
  }

  const radius = mix(fromRadius, toRadius, progress);
  target[0] = center[0] + (directionX * radius);
  target[1] = center[1] + (directionY * radius);
  target[2] = center[2] + (directionZ * radius);
}

function writeQuaternion(target, source) {
  target[0] = source[0];
  target[1] = source[1];
  target[2] = source[2];
  target[3] = source[3];
}

function findCameraKeyIndex(keys, storyWU) {
  let low = 0;
  let high = keys.length - 1;
  let result = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (Number(keys[middle].atWU) <= storyWU) {
      result = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return result;
}

export function compileAboutNarrativeCameraKey(key) {
  const aimEnabled = key?.aimEnabled ?? Array.isArray(key?.lookAtTarget);
  const lookAtTarget = Array.isArray(key?.lookAtTarget)
    ? [...key.lookAtTarget]
    : writeAboutNarrativeCameraTargetFromRotation(
      [0, 0, 0],
      key?.position,
      key?.rotation,
      1,
    );
  const lookAtRoll = Number(key?.lookAtRoll || 0);
  const manualQuaternion = writeAboutNarrativeCameraQuaternion(
    [0, 0, 0, 1],
    key?.rotation,
  );
  return {
    ...key,
    aimEnabled,
    targeted: aimEnabled,
    lookAtTarget,
    lookAtRoll,
    easingCurve: compileAboutNarrativeCameraEasing(key?.easing),
    manualQuaternion,
    quaternion: aimEnabled
      ? writeAboutNarrativeCameraLookAtQuaternion(
        [0, 0, 0, 1],
        key?.position,
        lookAtTarget,
        lookAtRoll,
      )
      : manualQuaternion,
  };
}

export function writeAboutNarrativeCameraSampleFromKey(target, key) {
  const position = key?.position || [0, 0, 0];
  const lookAtTarget = key?.lookAtTarget || [0, 0, -1];
  const quaternion = key?.quaternion || [0, 0, 0, 1];
  target.position[0] = position[0];
  target.position[1] = position[1];
  target.position[2] = position[2];
  target.lookAtTarget[0] = lookAtTarget[0];
  target.lookAtTarget[1] = lookAtTarget[1];
  target.lookAtTarget[2] = lookAtTarget[2];
  writeQuaternion(target.quaternion, quaternion);
  target.lookAtRoll = Number(key?.lookAtRoll || 0);
  target.aimWeight = key?.aimEnabled === true ? 1 : 0;
  target.targeted = target.aimWeight > 0;
  target.fov = Number(key?.fov ?? 48);
  return target;
}

export function sampleAboutNarrativeCameraKeysInto(
  keys,
  storyWU,
  reducedMotion,
  target,
) {
  if (!keys.length) return writeAboutNarrativeCameraSampleFromKey(target, null);
  const fromIndex = findCameraKeyIndex(keys, storyWU);
  const from = keys[fromIndex];
  const to = keys[Math.min(keys.length - 1, fromIndex + 1)];
  if (reducedMotion || from === to || storyWU <= Number(keys[0].atWU)) {
    return writeAboutNarrativeCameraSampleFromKey(
      target,
      storyWU <= Number(keys[0].atWU) ? keys[0] : from,
    );
  }

  const spanWU = Math.max(
    CAMERA_TIME_EPSILON,
    Number(to.atWU) - Number(from.atWU),
  );
  const progress = applyAboutNarrativeCameraEasing(
    from.easingCurve,
    (storyWU - Number(from.atWU)) / spanWU,
  );
  if (from.aimEnabled && to.aimEnabled && cameraTargetsMatch(from.lookAtTarget, to.lookAtTarget)) {
    writeCameraOrbitMix(target.position, from.position, to.position, from.lookAtTarget, progress);
  } else {
    writeVectorMix(target.position, from.position, to.position, progress);
  }
  writeVectorMix(target.lookAtTarget, from.lookAtTarget, to.lookAtTarget, progress);
  target.lookAtRoll = mix(from.lookAtRoll, to.lookAtRoll, progress);
  target.aimWeight = mix(from.aimEnabled ? 1 : 0, to.aimEnabled ? 1 : 0, progress);
  target.targeted = target.aimWeight > 0.0001;
  slerpAboutNarrativeCameraQuaternionInto(
    target.manualQuaternion,
    from.manualQuaternion,
    to.manualQuaternion,
    progress,
  );
  if (target.targeted) {
    writeAboutNarrativeCameraLookAtQuaternion(
      target.aimQuaternion,
      target.position,
      target.lookAtTarget,
      target.lookAtRoll,
    );
    slerpAboutNarrativeCameraQuaternionInto(
      target.quaternion,
      target.manualQuaternion,
      target.aimQuaternion,
      target.aimWeight,
    );
  } else {
    writeQuaternion(target.quaternion, target.manualQuaternion);
  }
  target.fov = mix(from.fov, to.fov, progress);
  return target;
}
