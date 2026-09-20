// A critically damped spring adds a short glide to the camera only. Native
// text scrolling, history and the authored rail remain the source of truth.
// About 600 ms to cover 95% of a scroll impulse: a steady glide with a soft stop.
const DEFAULT_GLIDE_MS = 600;
const SETTLE_EPSILON = 0.000001;

export function stepRollercoasterCamera(state, target, deltaSeconds, snap = false, glideMs = DEFAULT_GLIDE_MS) {
  target = Math.max(0, Math.min(1, target));
  if (snap || !Number.isFinite(state.progress)) {
    state.progress = target;
    state.velocity = 0;
    return target;
  }
  const response = 4.8 / (Math.max(200, Math.min(1200, Number.isFinite(glideMs) ? glideMs : DEFAULT_GLIDE_MS)) / 1000);
  const dt = Math.max(0, Math.min(0.1, deltaSeconds));
  const offset = state.progress - target;
  const impulse = state.velocity + response * offset;
  const decay = Math.exp(-response * dt);
  const next = target + (offset + impulse * dt) * decay;
  // Keep a quick reversal on the requested side of the destination; never
  // overshoot a title, endpoint or a newly reversed scroll target.
  state.progress = Math.max(Math.min(state.progress, target), Math.min(Math.max(state.progress, target), next));
  state.velocity = state.progress === next ? (state.velocity - response * impulse * dt) * decay : 0;
  if (Math.abs(state.progress - target) < SETTLE_EPSILON && Math.abs(state.velocity) < SETTLE_EPSILON * response) {
    state.progress = target;
    state.velocity = 0;
  }
  return state.progress;
}
