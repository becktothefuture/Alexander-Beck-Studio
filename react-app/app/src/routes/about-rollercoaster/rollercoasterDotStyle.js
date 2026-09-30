// Browser-owned variation around the sampled surface anchors. Seeds are packed
// once per field; animation changes two uniforms, never the instance buffers.
const SEED_MAX = 65535;
const UNIT_CUBE_RADIUS = 1 / Math.sqrt(3);
const TAU = Math.PI * 2;
const PHASE_RATE = TAU / 12;
const REGION_SIZE_WU = 2.4;
const SHARED_FLOW_WEIGHT = 0.7;
const ACCENT_FRACTION = 0.22;

function hash(value) {
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return (value ^ (value >>> 16)) >>> 0;
}

export function createRollercoasterDotSeeds(points) {
  const bits = new Uint32Array(points.buffer, points.byteOffset, points.length);
  const seeds = new Uint16Array(points.length / 6 * 4);
  for (let offset = 0, target = 0; offset < points.length; offset += 6, target += 4) {
    // Identity stays independent of traversal order, colour role and time.
    const seed = hash(hash(bits[offset]) ^ Math.imul(hash(bits[offset + 1]), 0x9e3779b1)
      ^ Math.imul(hash(bits[offset + 2]), 0x85ebca77) ^ Math.imul(points[offset + 5] + 1, 0xc2b2ae3d));
    const x = points[offset], y = points[offset + 1], z = points[offset + 2];
    // Nearby anchors share a slow spatial field, with some individual scatter.
    // Bake it into the existing seeds: no extra shader work or frame-time noise.
    const flowX = Math.sin(x * 0.48 + y * 0.21 + z * 0.17);
    const flowY = Math.sin(-x * 0.19 + y * 0.41 - z * 0.23 + 2.1);
    const flowZ = Math.sin(x * 0.27 - y * 0.16 + z * 0.37 + 4.2);
    for (let lane = 0; lane < 3; lane += 1) {
      const individual = (hash(seed + Math.imul(lane + 1, 0x9e3779b1)) >>> 16) / SEED_MAX;
      const flow = ((lane === 0 ? flowX : lane === 1 ? flowY : flowZ) + 1) * 0.5;
      seeds[target + lane] = Math.round((flow * SHARED_FLOW_WEIGHT + individual * (1 - SHARED_FLOW_WEIGHT)) * SEED_MAX);
    }
    // Warped colour regions make surfaces legible as groups. Scattered accents
    // keep the six-colour mix alive without giving every dot equal prominence.
    const region = hash(hash(Math.floor(x / REGION_SIZE_WU + flowY * 0.4))
      ^ Math.imul(hash(Math.floor(y / REGION_SIZE_WU + flowZ * 0.4)), 0x9e3779b1)
      ^ Math.imul(hash(Math.floor(z / REGION_SIZE_WU + flowX * 0.4)), 0x85ebca77));
    const accent = hash(seed + 0x6a09e667) / 0x100000000;
    const palette = accent < ACCENT_FRACTION ? hash(seed + 0xbb67ae85) % 6 : region % 6;
    const threshold = hash(seed + 0x3c6ef372) / 0x100000000;
    // Keep role and mix threshold in the same normalized 16-bit lane. Clamp
    // within the slot so quantization cannot spill into the neighbouring role.
    seeds[target + 3] = Math.max(Math.ceil(palette * SEED_MAX / 6),
      Math.min(Math.ceil((palette + 1) * SEED_MAX / 6) - 1, Math.round((palette + threshold) * SEED_MAX / 6)));
  }
  return seeds;
}

export function createRollercoasterDotDrift() {
  return { timeSeconds: NaN, phaseA: 0, phaseB: 0, waves: new Float32Array([0, 1, 0, 1]) };
}

export function advanceRollercoasterDotDrift(state, timeSeconds, speed, reducedMotion = false) {
  const delta = timeSeconds - state.timeSeconds;
  state.timeSeconds = timeSeconds;
  // Duplicate renders, suspended tabs and reduced motion do not advance the
  // phase. Integrating speed also lets zero freeze without snapping to time 0.
  if (reducedMotion || !Number.isFinite(delta) || delta <= 0 || delta > 0.25 || speed <= 0) return;
  state.phaseA = (state.phaseA + delta * speed * PHASE_RATE) % TAU;
  state.phaseB = (state.phaseB + delta * speed * PHASE_RATE * 0.731) % TAU;
  state.waves[0] = Math.sin(state.phaseA);
  state.waves[1] = Math.cos(state.phaseA);
  state.waves[2] = Math.sin(state.phaseB);
  state.waves[3] = Math.cos(state.phaseB);
}

// CPU counterparts are for inspection/tests only. The frame loop uses GLSL.
export function sampleRollercoasterDotOffset(seeds, index, distance, drift, waves, output = [0, 0, 0]) {
  const start = index * 4;
  const x = (seeds[start] / SEED_MAX * 2 - 1) * UNIT_CUBE_RADIUS;
  const y = (seeds[start + 1] / SEED_MAX * 2 - 1) * UNIT_CUBE_RADIUS;
  const z = (seeds[start + 2] / SEED_MAX * 2 - 1) * UNIT_CUBE_RADIUS;
  const weight = drift * 0.5;
  output[0] = distance * (x * (1 - weight) + (y * waves[0] + z * waves[1]) * 0.5 * weight);
  output[1] = distance * (y * (1 - weight) + (z * waves[2] + x * waves[3]) * 0.5 * weight);
  output[2] = distance * (z * (1 - weight) + (x * waves[0] + y * waves[3]) * 0.5 * weight);
  return output;
}

export function resolveRollercoasterDotPalette(seed, authoredRole, colorMix) {
  const selection = seed / SEED_MAX * 6;
  return selection - Math.floor(selection) < colorMix ? Math.min(5, Math.floor(selection)) : authoredRole;
}

export const ROLLERCOASTER_DOT_STYLE_GLSL = `
attribute vec4 iDotSeed;
uniform vec3 uDotStyle; // Colour mix, maximum scatter in WU, drift amount.
uniform vec4 uDotDriftWaves;

vec3 surfaceDotOffset() {
  vec3 base = (iDotSeed.xyz * 2.0 - 1.0) * 0.5773502691896258;
  // Each basis has length <= 1. Their half-sum and this convex blend keep
  // every dot inside its scatter envelope for all phases and drift amounts.
  vec3 sway = 0.5 * (base.yzx * uDotDriftWaves.xzx + base.zxy * uDotDriftWaves.yww);
  return mix(base, sway, uDotStyle.z * 0.5) * uDotStyle.y;
}

float surfaceDotPalette(float authoredRole) {
  float selection = iDotSeed.w * 6.0;
  return fract(selection) < uDotStyle.x ? min(5.0, floor(selection)) : authoredRole;
}
`;
