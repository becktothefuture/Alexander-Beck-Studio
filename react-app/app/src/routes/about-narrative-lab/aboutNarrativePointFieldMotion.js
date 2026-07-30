export const ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES = Object.freeze([
  'uniform',
  'random',
  'radial',
  'axis',
]);
export const ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES = Object.freeze([
  'direct',
  'arc',
  'curl',
  'noise',
]);
export const ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES = Object.freeze([
  'none',
  'toward-plane',
  'from-plane',
]);
export const ABOUT_NARRATIVE_POINT_FIELD_MOTION_AXES = Object.freeze(['x', 'y', 'z']);

export const ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS = Object.freeze({
  amount: Object.freeze({ min: 0, max: 1 }),
  frequency: Object.freeze({ min: 0.25, max: 8 }),
  seed: Object.freeze({ min: 0, max: 0xffffffff }),
  planeOffset: Object.freeze({ min: -8, max: 8 }),
});

export const ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS = Object.freeze({
  stagger: Object.freeze({ mode: 'uniform', amount: 0, axis: 'y', seed: 0 }),
  path: Object.freeze({ mode: 'direct', amount: 0, axis: 'y', frequency: 1, seed: 0 }),
  flatten: Object.freeze({ mode: 'none', amount: 0, axis: 'y', offset: 0 }),
});

const EMPTY_POINT = Object.freeze({});
const EMPTY_OPTIONS = Object.freeze({});
const TWO_PI = Math.PI * 2;

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function resolveAxis(value, fallback) {
  return ABOUT_NARRATIVE_POINT_FIELD_MOTION_AXES.includes(value) ? value : fallback;
}

function resolveSeed(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.min(0xffffffff, Math.max(0, number)) : fallback;
}

export function resolveAboutNarrativePointFieldTransitionMotion(transition = {}) {
  const stagger = transition.stagger || {};
  const path = transition.path || {};
  const flatten = transition.flatten || {};
  const defaults = ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS;
  return {
    stagger: {
      mode: ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES.includes(stagger.mode)
        ? stagger.mode
        : defaults.stagger.mode,
      amount: clamp01(stagger.amount),
      axis: resolveAxis(stagger.axis, defaults.stagger.axis),
      seed: resolveSeed(stagger.seed, defaults.stagger.seed),
    },
    path: {
      mode: ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES.includes(path.mode)
        ? path.mode
        : defaults.path.mode,
      amount: clamp01(path.amount),
      axis: resolveAxis(path.axis, defaults.path.axis),
      frequency: Math.min(
        ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.frequency.max,
        Math.max(
          ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.frequency.min,
          Number(path.frequency) || defaults.path.frequency,
        ),
      ),
      seed: resolveSeed(path.seed, defaults.path.seed),
    },
    flatten: {
      mode: ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES.includes(flatten.mode)
        ? flatten.mode
        : defaults.flatten.mode,
      amount: clamp01(flatten.amount),
      axis: resolveAxis(flatten.axis, defaults.flatten.axis),
      offset: Math.min(
        ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.planeOffset.max,
        Math.max(
          ABOUT_NARRATIVE_POINT_FIELD_MOTION_LIMITS.planeOffset.min,
          Number(flatten.offset) || defaults.flatten.offset,
        ),
      ),
    },
  };
}

export function createAboutNarrativePointFieldMotionSample() {
  const sample = {
    progress: 1,
    staggerPhase: 0,
    pathOffset: [0, 0, 0],
    planeProgress: 1,
    planeAxis: 'y',
    planeOffset: 0,
    planePosition: 0,
  };
  Object.defineProperty(sample, '_aboutNarrativePointFieldMotionSample', { value: true });
  return sample;
}

function seededPhase(pointSeed, motionSeed) {
  let value = ((Math.floor(clamp01(pointSeed) * 0xffffffff) >>> 0) ^ motionSeed) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 0xffffffff;
}

function resolveStaggerPhase(stagger, point) {
  if (stagger.mode === 'random') return seededPhase(point.seed, stagger.seed);
  if (stagger.mode === 'radial') return clamp01(point.radialPhase);
  if (stagger.mode === 'axis') {
    const axisPhase = stagger.axis === 'x'
      ? point.xPhase
      : stagger.axis === 'z' ? point.zPhase : point.yPhase;
    return clamp01(axisPhase ?? point.axisPhase);
  }
  return 0;
}

function writeAxisOffset(target, axis, value) {
  if (axis === 'x') target[0] = value;
  else if (axis === 'z') target[2] = value;
  else target[1] = value;
}

function writeCurlOffset(target, axis, angle, amplitude) {
  if (axis === 'x') {
    target[1] = Math.cos(angle) * amplitude;
    target[2] = Math.sin(angle) * amplitude;
  } else if (axis === 'z') {
    target[0] = Math.cos(angle) * amplitude;
    target[1] = Math.sin(angle) * amplitude;
  } else {
    target[0] = Math.cos(angle) * amplitude;
    target[2] = Math.sin(angle) * amplitude;
  }
}

/**
 * Samples renderer-ready per-point motion without allocating. `visualProgress`
 * is authoritative: this function remaps it for stagger but never eases it again.
 */
export function sampleAboutNarrativePointFieldMotionInto(
  transition,
  visualProgress,
  point = EMPTY_POINT,
  target,
  options = EMPTY_OPTIONS,
) {
  if (!target?._aboutNarrativePointFieldMotionSample || !Array.isArray(target.pathOffset)) {
    throw new TypeError('Point-field motion sampling requires a reusable motion sample target.');
  }
  const stagger = transition.stagger || ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.stagger;
  const path = transition.path || ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.path;
  const flatten = transition.flatten || ABOUT_NARRATIVE_POINT_FIELD_MOTION_DEFAULTS.flatten;
  const visual = clamp01(visualProgress);
  const reducedMotion = options.reducedMotion === true;
  const staggerPhase = resolveStaggerPhase(stagger, point);
  let progress = visual;
  if (reducedMotion || transition.type === 'hold') {
    progress = 1;
  } else if (transition.type === 'step-end') {
    progress = visual >= 1 ? 1 : 0;
  } else if (visual >= 1) {
    progress = 1;
  } else if (visual > 0 && stagger.amount > 0) {
    const delay = staggerPhase * stagger.amount;
    progress = clamp01((visual - delay) / Math.max(0.000001, 1 - stagger.amount));
  }

  target.progress = progress;
  target.staggerPhase = staggerPhase;
  target.pathOffset[0] = 0;
  target.pathOffset[1] = 0;
  target.pathOffset[2] = 0;
  if (!reducedMotion && progress > 0 && progress < 1
    && path.amount > 0 && path.mode !== 'direct') {
    const envelope = Math.sin(Math.PI * progress) * path.amount;
    const phase = seededPhase(point.seed, path.seed);
    if (path.mode === 'arc') {
      writeAxisOffset(target.pathOffset, path.axis, envelope);
    } else if (path.mode === 'curl') {
      writeCurlOffset(
        target.pathOffset,
        path.axis,
        (phase * TWO_PI) + (progress * path.frequency * TWO_PI),
        envelope,
      );
    } else if (path.mode === 'noise') {
      const clock = (progress * path.frequency * TWO_PI) + (phase * TWO_PI);
      const primary = Math.sin(clock) * envelope;
      const secondary = Math.sin((clock * 1.37) + 2.1) * envelope;
      const tertiary = Math.cos((clock * 0.83) + 4.2) * envelope;
      if (path.axis === 'x') {
        target.pathOffset[0] = primary;
        target.pathOffset[1] = secondary;
        target.pathOffset[2] = tertiary;
      } else if (path.axis === 'z') {
        target.pathOffset[0] = secondary;
        target.pathOffset[1] = tertiary;
        target.pathOffset[2] = primary;
      } else {
        target.pathOffset[0] = tertiary;
        target.pathOffset[1] = primary;
        target.pathOffset[2] = secondary;
      }
    }
  }

  target.planeAxis = flatten.axis;
  target.planePosition = flatten.offset;
  if (reducedMotion) {
    target.planeProgress = 1;
  } else if (flatten.mode === 'none' || flatten.amount <= 0) {
    target.planeProgress = progress;
  } else if (flatten.mode === 'toward-plane') {
    target.planeProgress = progress + (
      (1 - ((1 - progress) ** 3) - progress) * flatten.amount
    );
  } else {
    target.planeProgress = progress + (((progress ** 3) - progress) * flatten.amount);
  }
  target.planeOffset = target.planeProgress - progress;
  return target;
}
