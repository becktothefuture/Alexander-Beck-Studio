import { createRollercoasterCameraPose, sampleRollercoasterCamera } from './rollercoasterContract.js';
import { ROLLERCOASTER_OPENING_GLSL } from './rollercoasterEnding.js';

export const PARTICLE_BASE_COUNT = 3200;
export const PARTICLE_MAX_COUNT = PARTICLE_BASE_COUNT * 2;
export const PARTICLE_STRIDE = 9;
export const PARTICLE_VISIBILITY = Object.freeze({ nearHidden: 0.25, nearClear: 1.2, farClear: 18, farHidden: 34 });

/** Stable world anchors, built once. Density reveals a prefix, never reseeds it. */
export function createRollercoasterParticles(track) {
  const rows = track.samples;
  const distances = new Float64Array(rows.length);
  for (let i = 1; i < rows.length; i += 1) {
    distances[i] = distances[i - 1] + Math.hypot(
      rows[i][1] - rows[i - 1][1], rows[i][2] - rows[i - 1][2], rows[i][3] - rows[i - 1][3],
    );
  }
  const length = distances.at(-1);
  const points = new Float32Array(PARTICLE_MAX_COUNT * PARTICLE_STRIDE);
  const pose = createRollercoasterCameraPose();
  let seed = 0x1b873593;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  for (let i = 0; i < PARTICLE_MAX_COUNT; i += 1) {
    // Extend both bookends so arrival and the final hold retain a full volume.
    const distance = random() * (length + 54) - 12;
    const clamped = Math.max(0, Math.min(length, distance));
    let low = 0, high = rows.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (distances[middle] <= clamped) low = middle; else high = middle;
    }
    const t = (clamped - distances[low]) / Math.max(1e-9, distances[high] - distances[low]);
    sampleRollercoasterCamera(track, rows[low][0] + (rows[high][0] - rows[low][0]) * t, pose, true);
    const q = pose.quaternion;
    const angle = random() * Math.PI * 2;
    const radius = 0.8 + Math.sqrt(random()) * (7.6 + 1.8 * Math.sin(distance * 0.13));
    const x = Math.cos(angle) * radius + Math.sin(distance * 0.07) * 1.2;
    const y = Math.sin(angle) * radius + Math.cos(distance * 0.09) * 0.9;
    const z = -(distance - clamped);
    // Rotate the cross-section through the unrolled sightline into world space.
    const tx = 2 * (q[1] * z - q[2] * y);
    const ty = 2 * (q[2] * x - q[0] * z);
    const tz = 2 * (q[0] * y - q[1] * x);
    const offset = i * PARTICLE_STRIDE;
    points[offset] = pose.position[0] + x + q[3] * tx + q[1] * tz - q[2] * ty;
    points[offset + 1] = pose.position[1] + y + q[3] * ty + q[2] * tx - q[0] * tz;
    points[offset + 2] = pose.position[2] + z + q[3] * tz + q[0] * ty - q[1] * tx;
    points[offset + 3] = 0.45 + random() ** 2 * 1.9;
    points[offset + 4] = Math.floor(random() * 6);
    points[offset + 5] = random() * Math.PI * 2;
    points[offset + 6] = random() * Math.PI * 2;
    points[offset + 7] = 0.12 + random() * 0.12;
    points[offset + 8] = 0.2 + random() * 0.45;
  }
  return points;
}

export function resolveParticleCount(density) {
  return Math.round(PARTICLE_BASE_COUNT * Math.max(0, Math.min(2, Number.isFinite(density) ? density : 0)));
}

// CPU inspection matches the analytic GPU drift, without frame accumulation.
export function sampleFloatingParticle(points, index, time, target = [0, 0, 0]) {
  const offset = index * PARTICLE_STRIDE;
  const a = points[offset + 5], b = points[offset + 6];
  const phase = time * points[offset + 7], amplitude = points[offset + 8];
  target[0] = points[offset] + (Math.sin(phase + a) - Math.sin(a)) * amplitude;
  target[1] = points[offset + 1] + (Math.sin(phase * 0.73 + b) - Math.sin(b)) * amplitude;
  target[2] = points[offset + 2] + (Math.cos(phase * 0.57 + a) - Math.cos(a)) * amplitude * 0.6;
  return target;
}

export const PARTICLE_VERTEX_SHADER = `
  precision highp float;
  attribute vec3 iPosition;
  attribute float iSize;
  attribute float iPalette;
  attribute vec4 iFloat;
  uniform float uRadius;
  uniform float uFloatTime;
  uniform vec3 uEndingOpeningScreen;
  uniform vec2 uEndingOpeningScreenSize;
  uniform vec2 uViewportPx;
  uniform float uEndingScaleReveal;
  varying vec2 vCircle;
  varying float vPalette;
  varying float vDepth;
  varying float vOpeningClearance;
  ${ROLLERCOASTER_OPENING_GLSL}
  void main() {
    float phase = uFloatTime * iFloat.z;
    vec3 point = iPosition + vec3(
      sin(phase + iFloat.x) - sin(iFloat.x),
      sin(phase * 0.73 + iFloat.y) - sin(iFloat.y),
      (cos(phase * 0.57 + iFloat.x) - cos(iFloat.x)) * 0.6
    ) * iFloat.w;
    vec4 center = modelViewMatrix * vec4(point, 1.0);
    vDepth = -center.z;
    vOpeningClearance = 1.0;
    float openingScale = 1.0;
    if (uEndingOpeningScreen.z > 0.0 && vDepth > 0.0) {
      vec4 projected = projectionMatrix * center;
      vec2 screen = (projected.xy / projected.w * 0.5 + 0.5) * uViewportPx;
      float radius = uRadius * iSize * projectionMatrix[1][1] * uViewportPx.y / (2.0 * vDepth);
      vOpeningClearance = length(screen - uEndingOpeningScreen.xy) - uEndingOpeningScreen.z - radius;
      if (uEndingScaleReveal > 0.0) {
        vec2 delta = screen - uEndingOpeningScreen.xy;
        if (uEndingOpeningScreenSize.x > 0.0) {
          float seed = fract(iFloat.x / 6.28318 + iFloat.y / 9.7);
          float distance = openingOrganicDistance(delta,
            uEndingOpeningScreenSize + vec2(radius), seed);
          openingScale = openingOrganicScale(distance, uEndingScaleReveal, seed);
        } else {
          float safeRadius = uEndingOpeningScreen.z * openingRadiusFactor(delta) + radius;
          openingScale = openingCircleScale(length(delta) / safeRadius, uEndingScaleReveal);
        }
        vOpeningClearance = 1.0;
      }
    }
    center.xy += position.xy * uRadius * iSize * openingScale;
    gl_Position = projectionMatrix * center;
    vCircle = position.xy;
    vPalette = iPalette;
  }
`;
