const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;
const QUATERNION_EPSILON = 0.000001;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanDegrees(value) {
  const wrapped = ((Number(value) + 180) % 360 + 360) % 360 - 180;
  return Number((Object.is(wrapped, -0) ? 0 : wrapped).toFixed(6));
}

function normalizeQuaternionInto(target) {
  const length = Math.hypot(target[0], target[1], target[2], target[3]) || 1;
  target[0] /= length;
  target[1] /= length;
  target[2] /= length;
  target[3] /= length;
  return target;
}

export function writeAboutNarrativeCameraQuaternion(target, rotation, { zeroRoll = false } = {}) {
  const x = Number(rotation?.[0] || 0) * DEGREES_TO_RADIANS * 0.5;
  const y = Number(rotation?.[1] || 0) * DEGREES_TO_RADIANS * 0.5;
  const z = (zeroRoll ? 0 : Number(rotation?.[2] || 0)) * DEGREES_TO_RADIANS * 0.5;
  const c1 = Math.cos(x);
  const c2 = Math.cos(y);
  const c3 = Math.cos(z);
  const s1 = Math.sin(x);
  const s2 = Math.sin(y);
  const s3 = Math.sin(z);

  // Three.js Euler order YXZ: yaw, then pitch, then local roll.
  target[0] = (s1 * c2 * c3) + (c1 * s2 * s3);
  target[1] = (c1 * s2 * c3) - (s1 * c2 * s3);
  target[2] = (c1 * c2 * s3) - (s1 * s2 * c3);
  target[3] = (c1 * c2 * c3) + (s1 * s2 * s3);
  return normalizeQuaternionInto(target);
}

export function slerpAboutNarrativeCameraQuaternionInto(target, from, to, progress) {
  let toX = to[0];
  let toY = to[1];
  let toZ = to[2];
  let toW = to[3];
  let dot = (from[0] * toX) + (from[1] * toY) + (from[2] * toZ) + (from[3] * toW);
  if (dot < 0) {
    dot = -dot;
    toX = -toX;
    toY = -toY;
    toZ = -toZ;
    toW = -toW;
  }

  if (dot > 1 - QUATERNION_EPSILON) {
    target[0] = from[0] + ((toX - from[0]) * progress);
    target[1] = from[1] + ((toY - from[1]) * progress);
    target[2] = from[2] + ((toZ - from[2]) * progress);
    target[3] = from[3] + ((toW - from[3]) * progress);
    return normalizeQuaternionInto(target);
  }

  const theta = Math.acos(clamp(dot, -1, 1));
  const sinTheta = Math.sin(theta);
  const fromWeight = Math.sin((1 - progress) * theta) / sinTheta;
  const toWeight = Math.sin(progress * theta) / sinTheta;
  target[0] = (from[0] * fromWeight) + (toX * toWeight);
  target[1] = (from[1] * fromWeight) + (toY * toWeight);
  target[2] = (from[2] * fromWeight) + (toZ * toWeight);
  target[3] = (from[3] * fromWeight) + (toW * toWeight);
  return target;
}

function quaternionFromRotationMatrixInto(target, matrix) {
  const [m11, m12, m13, m21, m22, m23, m31, m32, m33] = matrix;
  const trace = m11 + m22 + m33;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    target[3] = 0.25 / s;
    target[0] = (m32 - m23) * s;
    target[1] = (m13 - m31) * s;
    target[2] = (m21 - m12) * s;
  } else if (m11 > m22 && m11 > m33) {
    const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
    target[3] = (m32 - m23) / s;
    target[0] = 0.25 * s;
    target[1] = (m12 + m21) / s;
    target[2] = (m13 + m31) / s;
  } else if (m22 > m33) {
    const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
    target[3] = (m13 - m31) / s;
    target[0] = (m12 + m21) / s;
    target[1] = 0.25 * s;
    target[2] = (m23 + m32) / s;
  } else {
    const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
    target[3] = (m21 - m12) / s;
    target[0] = (m13 + m31) / s;
    target[1] = (m23 + m32) / s;
    target[2] = 0.25 * s;
  }
  return normalizeQuaternionInto(target);
}

function multiplyQuaternionInto(target, left, right) {
  const [leftX, leftY, leftZ, leftW] = left;
  const [rightX, rightY, rightZ, rightW] = right;
  target[0] = (leftX * rightW) + (leftW * rightX) + (leftY * rightZ) - (leftZ * rightY);
  target[1] = (leftY * rightW) + (leftW * rightY) + (leftZ * rightX) - (leftX * rightZ);
  target[2] = (leftZ * rightW) + (leftW * rightZ) + (leftX * rightY) - (leftY * rightX);
  target[3] = (leftW * rightW) - (leftX * rightX) - (leftY * rightY) - (leftZ * rightZ);
  return normalizeQuaternionInto(target);
}

function writeLegacyLookQuaternion(target, lookAtOffset, roll) {
  const forwardX = Number(lookAtOffset?.[0] || 0);
  const forwardY = Number(lookAtOffset?.[1] || 0);
  const forwardZ = Number(lookAtOffset?.[2] ?? -1);
  const backwardLength = Math.hypot(forwardX, forwardY, forwardZ) || 1;
  const zX = -forwardX / backwardLength;
  const zY = -forwardY / backwardLength;
  const zZ = -forwardZ / backwardLength;
  let xX = zZ;
  let xY = 0;
  let xZ = -zX;
  const xLength = Math.hypot(xX, xY, xZ);
  if (xLength < QUATERNION_EPSILON) {
    xX = 1;
    xY = 0;
    xZ = 0;
  } else {
    xX /= xLength;
    xY /= xLength;
    xZ /= xLength;
  }
  const yX = (zY * xZ) - (zZ * xY);
  const yY = (zZ * xX) - (zX * xZ);
  const yZ = (zX * xY) - (zY * xX);
  const lookQuaternion = quaternionFromRotationMatrixInto([0, 0, 0, 1], [
    xX, yX, zX,
    xY, yY, zY,
    xZ, yZ, zZ,
  ]);
  const halfRoll = -Number(roll || 0) * 0.5;
  const rollQuaternion = [0, 0, Math.sin(halfRoll), Math.cos(halfRoll)];
  return multiplyQuaternionInto(target, lookQuaternion, rollQuaternion);
}

function quaternionToRotationDegrees(quaternion) {
  const [x, y, z, w] = quaternion;
  const m11 = 1 - (2 * ((y * y) + (z * z)));
  const m13 = 2 * ((x * z) + (w * y));
  const m21 = 2 * ((x * y) + (w * z));
  const m22 = 1 - (2 * ((x * x) + (z * z)));
  const m23 = 2 * ((y * z) - (w * x));
  const m31 = 2 * ((x * z) - (w * y));
  const m33 = 1 - (2 * ((x * x) + (y * y)));
  const rotationX = Math.asin(-clamp(m23, -1, 1));
  const singular = Math.abs(m23) >= 0.9999999;
  const rotationY = singular ? Math.atan2(-m31, m11) : Math.atan2(m13, m33);
  const rotationZ = singular ? 0 : Math.atan2(m21, m22);
  return [rotationX, rotationY, rotationZ].map((value) => cleanDegrees(value * RADIANS_TO_DEGREES));
}

export function getAboutNarrativeCameraRotationFromQuaternion(quaternion) {
  return quaternionToRotationDegrees(quaternion);
}

export function migrateLegacyAboutNarrativeCameraPose(key, globals) {
  const originZ = Number(globals?.worldRail?.originZ ?? globals?.camera?.startZ ?? 8);
  const unitsPerWU = Number(globals?.worldRail?.unitsPerWU ?? globals?.camera?.cadence ?? 1);
  const offset = key?.offset || [0, 0, 0];
  const position = [
    Number(offset[0] || 0),
    Number(offset[1] || 0),
    originZ - (Number(key?.atWU || 0) * unitsPerWU) + Number(offset[2] || 0),
  ].map((value) => Number(value.toFixed(6)));
  const quaternion = writeLegacyLookQuaternion([0, 0, 0, 1], key?.lookAtOffset, key?.roll);
  return { position, rotation: quaternionToRotationDegrees(quaternion) };
}
