/** Shared authored controls for the physical behaviour of simulation balls.
 * Gravity is intentionally absent: each scene owns one fixed world-gravity
 * contract, while mass and contact material remain designer-tunable. */
export const BALL_DYNAMICS_CHANGE_EVENT = 'abs:ball-dynamics-change';

export const DEFAULT_BALL_DYNAMICS = Object.freeze({
  massKg: 240,
  restitution: 0.18,
  friction: 0.018,
});

export const BALL_DYNAMICS_LIMITS = Object.freeze({
  massKg: Object.freeze([20, 400]),
  restitution: Object.freeze([0, 1]),
  friction: Object.freeze([0, 1]),
});

function clamp(value, [minimum, maximum], fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? Math.min(maximum, Math.max(minimum, numeric))
    : fallback;
}

/** Accept both canonical names and the flattened compatibility aliases. */
export function normalizeBallDynamics(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    massKg: clamp(source.massKg ?? source.ballMassKg ?? source.ballMass,
      BALL_DYNAMICS_LIMITS.massKg, DEFAULT_BALL_DYNAMICS.massKg),
    restitution: clamp(source.restitution ?? source.REST,
      BALL_DYNAMICS_LIMITS.restitution, DEFAULT_BALL_DYNAMICS.restitution),
    friction: clamp(source.friction ?? source.FRICTION,
      BALL_DYNAMICS_LIMITS.friction, DEFAULT_BALL_DYNAMICS.friction),
  };
}

export function ballDynamicsFromRuntimeConfig(runtime = {}) {
  return normalizeBallDynamics(runtime);
}

/** Publish one live-apply event for every host that renders physical balls. */
export function publishBallDynamicsChange(input, target = globalThis.window) {
  if (!target?.dispatchEvent || typeof globalThis.CustomEvent !== 'function') return false;
  target.dispatchEvent(new CustomEvent(BALL_DYNAMICS_CHANGE_EVENT, {
    detail: normalizeBallDynamics(input),
  }));
  return true;
}
