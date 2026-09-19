// A critically damped spring adds a short glide to the camera only. Native
// text scrolling, history and the authored rail remain the source of truth.
const RESPONSE = 16;
const SETTLE_EPSILON = 0.000001;

export function stepRollercoasterCamera(state, target, deltaSeconds, snap = false) {
  target = Math.max(0, Math.min(1, target));
  if (snap || !Number.isFinite(state.progress)) {
    state.progress = target;
    state.velocity = 0;
    return target;
  }
  const dt = Math.max(0, Math.min(0.1, deltaSeconds));
  const offset = state.progress - target;
  const impulse = state.velocity + RESPONSE * offset;
  const decay = Math.exp(-RESPONSE * dt);
  const next = target + (offset + impulse * dt) * decay;
  // Keep a quick reversal on the requested side of the destination; never
  // overshoot a title, endpoint or a newly reversed scroll target.
  state.progress = Math.max(Math.min(state.progress, target), Math.min(Math.max(state.progress, target), next));
  state.velocity = state.progress === next ? (state.velocity - RESPONSE * impulse * dt) * decay : 0;
  if (Math.abs(state.progress - target) < SETTLE_EPSILON && Math.abs(state.velocity) < SETTLE_EPSILON * RESPONSE) {
    state.progress = target;
    state.velocity = 0;
  }
  return state.progress;
}
