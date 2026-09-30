import { applyRollercoasterRoll } from './rollercoasterRoll.js';

export const ROLLERCOASTER_LEAN_DEFAULTS = Object.freeze({ leanAmount: 1, leanWeightMs: 850 });
// Half load at a gentle travel speed. Squared speed gives a bend more weight
// during a push; the soft limit keeps fast trackpad flings within the authored cap.
const HALF_LOAD_SPEED_WU = 6;
const SETTLE_DEGREES = 0.001;

export function createRollercoasterLeanState() {
  return { timeSeconds: NaN, x: 0, y: 0, z: 0, degrees: 0, velocity: 0,
    targetDegrees: 0, authoredDegrees: 0, speedWU: 0 };
}

/** Add scroll inertia to the authored bank, never to the unwrapped tunnel turn.
 * The caller supplies one frame clock. Re-renders at that clock are idempotent.
 * This mutates the reusable sampled pose/state without hot-loop allocations. */
export function applyRollercoasterLean(state, pose, timeSeconds, settings = ROLLERCOASTER_LEAN_DEFAULTS, reset = false) {
  const elapsed = timeSeconds - state.timeSeconds;
  state.authoredDegrees = pose.bankDegrees;
  if (reset || !Number.isFinite(elapsed) || elapsed < 0 || elapsed > 0.25) {
    // A restored page or resumed tab has no travel impulse to carry forward.
    state.degrees = state.velocity = state.targetDegrees = state.speedWU = 0;
  } else if (elapsed > 0) {
    const speed = Math.min(80, Math.hypot(pose.position[0] - state.x,
      pose.position[1] - state.y, pose.position[2] - state.z) / elapsed);
    const load = speed * speed / (speed * speed + HALF_LOAD_SPEED_WU * HALF_LOAD_SPEED_WU);
    const amount = Math.max(0, Math.min(1, settings.leanAmount));
    const target = pose.bankDegrees * amount * load;
    const response = 4.8 / (Math.max(250, Math.min(1400, settings.leanWeightMs)) / 1000);
    const dt = Math.min(0.1, elapsed);
    const offset = state.degrees - target;
    const impulse = state.velocity + response * offset;
    const decay = Math.exp(-response * dt);
    // Exact critically damped angular spring: acceleration, momentum and a soft
    // recovery. Retain velocity through a reversal instead of clipping the angle
    // to the new target, which would remove the sense of mass.
    state.degrees = target + (offset + impulse * dt) * decay;
    state.velocity = (state.velocity - response * impulse * dt) * decay;
    state.targetDegrees = target;
    state.speedWU = speed;
    if (Math.abs(state.degrees - target) < SETTLE_DEGREES && Math.abs(state.velocity) < SETTLE_DEGREES * response) {
      state.degrees = target;
      state.velocity = 0;
    }
  }
  if (reset || elapsed !== 0) {
    state.timeSeconds = timeSeconds;
    [state.x, state.y, state.z] = pose.position;
  }
  // The pure contract remains Blender's reference pose. Replace only its bank
  // contribution in the rendered camera; keep the rail, sightline and 180/360° cues.
  applyRollercoasterRoll(pose.quaternion, state.degrees - pose.bankDegrees);
  pose.bankDegrees = state.degrees;
  pose.rollDegrees = pose.turnDegrees + state.degrees;
  return state.degrees;
}
