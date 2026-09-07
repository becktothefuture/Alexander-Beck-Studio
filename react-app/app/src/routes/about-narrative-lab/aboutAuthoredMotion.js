// One clock and transform contract for Blender-authored idle motion. Scroll
// changes the camera, never the phase of a living object.
export const ABOUT_AUTHORED_MOTION_CAPACITY = 32;
export const ABOUT_AUTHORED_MOTION_TYPES = Object.freeze({
  'continuous-rotation': 1,
  'terrain-wave': 2,
  'bounded-rotation': 3,
});

export function createAboutAuthoredMotion(groups = []) {
  const capacity = ABOUT_AUTHORED_MOTION_CAPACITY;
  const state = {
    types: new Uint8Array(capacity),
    pivots: new Float32Array(capacity * 3),
    vectors: new Float32Array(capacity * 4),
    phases: new Float64Array(capacity),
    speeds: new Float64Array(capacity),
    amplitudes: new Float64Array(capacity),
    previousTime: null,
  };
  for (const { id, motion } of groups) {
    if (!motion) continue;
    if (!Number.isInteger(id) || id < 0 || id >= capacity) {
      throw new RangeError('Authored motion group exceeds renderer capacity.');
    }
    const type = ABOUT_AUTHORED_MOTION_TYPES[motion.behavior];
    if (!type) throw new TypeError(`Unsupported authored motion: ${motion.behavior}`);
    state.types[id] = type;
    state.vectors.set(motion.axis, id * 4);
    state.speeds[id] = type === 3
      ? Math.PI * 2 / motion.periodSeconds
      : Number(motion.radiansPerSecond);
    if (type === 2) {
      state.amplitudes[id] = motion.amplitudeWU;
      state.pivots.set([motion.amplitudeWU, motion.wavelengthWU, motion.secondaryScale], id * 3);
    } else {
      state.pivots.set(motion.pivotWU, id * 3);
      state.amplitudes[id] = type === 3 ? motion.amplitudeRadians : 1;
    }
  }
  return state;
}

export function advanceAboutAuthoredMotion(state, ambientTime, controls, reducedMotion) {
  const time = Math.max(0, Number(ambientTime) || 0);
  const delta = state.previousTime == null ? time : Math.max(0, time - state.previousTime);
  state.previousTime = time;
  for (let id = 0; id < state.types.length; id += 1) {
    const type = state.types[id];
    if (!type) continue;
    const speed = type === 2 ? controls.terrainSpeed
      : type === 3 ? controls.bustTurnSpeed : controls.bodyRotationSpeed;
    if (!reducedMotion) state.phases[id] = (state.phases[id] + delta * state.speeds[id]
      * controls.masterMotionSpeed * speed * (type === 1 ? controls.masterMotionIntensity : 1))
      % (Math.PI * 2);
    const phase = state.phases[id] % (Math.PI * 2);
    const intensity = reducedMotion ? 0 : controls.masterMotionIntensity;
    state.vectors[id * 4 + 3] = type === 3
      ? Math.sin(phase) * state.amplitudes[id] * controls.bustTurnAmount * intensity
      : type === 2 ? phase : reducedMotion ? 0 : phase;
    if (type === 2) state.pivots[id * 3] = state.amplitudes[id]
      * controls.terrainAmplitude * intensity;
  }
  return state;
}

export function applyAboutAuthoredMotion(vector, groupId, state, normal = false) {
  const type = state?.types[groupId];
  if (!type) return vector;
  const p = groupId * 3;
  const v = groupId * 4;
  const axisX = state.vectors[v], axisY = state.vectors[v + 1], axisZ = state.vectors[v + 2];
  const phase = state.vectors[v + 3];
  if (type === 2) {
    if (normal) return vector;
    const spatial = (vector.x + vector.z * 0.61) * Math.PI * 2 / state.pivots[p + 1];
    const displacement = state.pivots[p] * (Math.sin(spatial + phase) - Math.sin(spatial)
      + state.pivots[p + 2] * (Math.sin(spatial * 1.73 - phase * 0.64 + 1.2)
        - Math.sin(spatial * 1.73 + 1.2)));
    vector.x += axisX * displacement;
    vector.y += axisY * displacement;
    vector.z += axisZ * displacement;
    return vector;
  }
  const pivotX = normal ? 0 : state.pivots[p];
  const pivotY = normal ? 0 : state.pivots[p + 1];
  const pivotZ = normal ? 0 : state.pivots[p + 2];
  const x = vector.x - pivotX, y = vector.y - pivotY, z = vector.z - pivotZ;
  const cosine = Math.cos(phase), sine = Math.sin(phase), remaining = 1 - cosine;
  const projection = axisX * x + axisY * y + axisZ * z;
  vector.set(
    pivotX + x * cosine + (axisY * z - axisZ * y) * sine + axisX * projection * remaining,
    pivotY + y * cosine + (axisZ * x - axisX * z) * sine + axisY * projection * remaining,
    pivotZ + z * cosine + (axisX * y - axisY * x) * sine + axisZ * projection * remaining,
  );
  return vector;
}
