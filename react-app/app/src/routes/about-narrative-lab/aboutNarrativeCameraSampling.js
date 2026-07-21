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

function mix(from, to, progress) {
  return from + ((to - from) * progress);
}

function writeVectorMix(target, from, to, progress) {
  target[0] = mix(from[0], to[0], progress);
  target[1] = mix(from[1], to[1], progress);
  target[2] = mix(from[2], to[2], progress);
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
  writeVectorMix(target.position, from.position, to.position, progress);
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
