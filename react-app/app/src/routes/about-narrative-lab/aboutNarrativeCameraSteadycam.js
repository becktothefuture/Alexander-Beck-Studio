import {
  slerpAboutNarrativeCameraQuaternionInto,
} from './aboutNarrativeCameraRig.js';

const RESPONSE_99_PERCENT = 4.60517;

export const ABOUT_NARRATIVE_CAMERA_STEADYCAM_DEFAULTS = Object.freeze({
  responseMs: 260,
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function copyVector(target, source) {
  target[0] = Number(source?.[0] || 0);
  target[1] = Number(source?.[1] || 0);
  target[2] = Number(source?.[2] || 0);
}

function copyQuaternion(target, source) {
  target[0] = Number(source?.[0] || 0);
  target[1] = Number(source?.[1] || 0);
  target[2] = Number(source?.[2] || 0);
  target[3] = Number(source?.[3] ?? 1);
}

export function createAboutNarrativeCameraSteadycamSample() {
  return {
    initialized: false,
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
  };
}

/**
 * Allocation-free camera rig damping. Position and orientation deliberately
 * share one response so the camera remains coherent through track-aligned
 * gates instead of allowing two independent filters to drift apart.
 */
export function createAboutNarrativeCameraSteadycamController({
  initialNowMs = 0,
} = {}) {
  let responseMs = ABOUT_NARRATIVE_CAMERA_STEADYCAM_DEFAULTS.responseMs;
  let lastUpdateMs = finiteOr(initialNowMs, 0);

  const configure = (camera = {}) => {
    responseMs = clamp(
      finiteOr(camera.steadycamResponseMs, ABOUT_NARRATIVE_CAMERA_STEADYCAM_DEFAULTS.responseMs),
      0,
      1200,
    );
  };

  const reset = (target, position, quaternion, nowMs = lastUpdateMs) => {
    copyVector(target.position, position);
    copyQuaternion(target.quaternion, quaternion);
    target.initialized = true;
    lastUpdateMs = finiteOr(nowMs, lastUpdateMs);
    return target;
  };

  const sampleInto = (
    target,
    position,
    quaternion,
    nowMs,
    snap = false,
  ) => {
    const nextNowMs = finiteOr(nowMs, lastUpdateMs);
    const deltaSeconds = clamp((nextNowMs - lastUpdateMs) / 1000, 0, 0.1);
    lastUpdateMs = nextNowMs;
    if (!target.initialized || snap || responseMs <= 0 || deltaSeconds <= 0) {
      return reset(target, position, quaternion, nextNowMs);
    }

    const alpha = 1 - Math.exp((-RESPONSE_99_PERCENT * deltaSeconds) / (responseMs / 1000));
    target.position[0] += (Number(position?.[0] || 0) - target.position[0]) * alpha;
    target.position[1] += (Number(position?.[1] || 0) - target.position[1]) * alpha;
    target.position[2] += (Number(position?.[2] || 0) - target.position[2]) * alpha;
    slerpAboutNarrativeCameraQuaternionInto(
      target.quaternion,
      target.quaternion,
      quaternion,
      alpha,
    );
    return target;
  };

  const getSnapshot = (sample) => Object.freeze({
    initialized: Boolean(sample?.initialized),
    responseMs,
    position: Object.freeze([...(sample?.position || [0, 0, 0])]),
    quaternion: Object.freeze([...(sample?.quaternion || [0, 0, 0, 1])]),
  });

  return Object.freeze({
    configure,
    reset,
    sampleInto,
    getSnapshot,
  });
}
