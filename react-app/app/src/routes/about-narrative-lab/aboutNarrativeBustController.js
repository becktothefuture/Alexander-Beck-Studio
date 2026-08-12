export const ABOUT_NARRATIVE_BUST_STATES = Object.freeze({
  OUTSIDE: 'outside',
  FORMING: 'forming',
  SETTLED: 'settled',
  DRAGGING: 'dragging',
  RESUME_DELAY: 'resume-delay',
  AUTO_ROTATING: 'auto-rotating',
});

const SETTLED_PROGRESS = 0.9999;
const DEFAULT_KEYBOARD_STEP = 0.16;
const EMPTY_SAMPLE_INPUT = Object.freeze({});

function finiteOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nonNegative(value, fallback = 0) {
  return Math.max(0, finiteOr(value, fallback));
}

/**
 * Owns the bust's story and ambient state without reading the wall clock.
 * Callers supply deltaSeconds, so deterministic scrubbing and hidden tabs never
 * advance yaw accidentally. Hot-path methods mutate one stable snapshot object.
 */
export function createAboutNarrativeBustController({
  keyboardStep = DEFAULT_KEYBOARD_STEP,
  settledProgress = SETTLED_PROGRESS,
} = {}) {
  const snapshot = {
    state: ABOUT_NARRATIVE_BUST_STATES.OUTSIDE,
    yaw: 0,
    formationYaw: 0,
    resumeRemaining: 0,
    pointerId: null,
    interactive: false,
    hidden: false,
    reducedMotion: false,
  };

  let isBust = false;
  let settled = false;
  let speed = 0;
  let resumeDelay = 0;
  let dragStartX = 0;
  let dragStartYaw = 0;
  let dragWidth = 320;
  let dragSensitivity = 1;

  const leave = () => {
    isBust = false;
    settled = false;
    snapshot.state = ABOUT_NARRATIVE_BUST_STATES.OUTSIDE;
    snapshot.yaw = 0;
    snapshot.formationYaw = 0;
    snapshot.resumeRemaining = 0;
    snapshot.pointerId = null;
    snapshot.interactive = false;
    snapshot.hidden = false;
    snapshot.reducedMotion = false;
    return snapshot;
  };

  const sample = (input = EMPTY_SAMPLE_INPUT) => {
    const active = input.active === true;
    const transitionProgress = input.transitionProgress ?? 0;
    const deltaSeconds = input.deltaSeconds ?? 0;
    const nextSpeed = input.speed ?? speed;
    const nextResumeDelay = input.resumeDelay ?? resumeDelay;
    const liveAmbient = input.liveAmbient !== false;
    const deterministicScrub = input.deterministicScrub === true;
    const reducedMotion = input.reducedMotion === true;
    const hidden = input.hidden === true;
    if (!active) return leave();

    const wasBust = isBust;
    const wasSettled = settled;
    const progress = finiteOr(transitionProgress);
    isBust = true;
    settled = progress >= finiteOr(settledProgress, SETTLED_PROGRESS);
    speed = finiteOr(nextSpeed);
    resumeDelay = nonNegative(nextResumeDelay);
    snapshot.hidden = Boolean(hidden);
    snapshot.reducedMotion = Boolean(reducedMotion);
    snapshot.interactive = settled;

    if (!settled) {
      if (snapshot.state !== ABOUT_NARRATIVE_BUST_STATES.FORMING) {
        snapshot.formationYaw = wasBust ? snapshot.yaw : 0;
      }
      snapshot.yaw = snapshot.formationYaw;
      snapshot.state = ABOUT_NARRATIVE_BUST_STATES.FORMING;
      snapshot.resumeRemaining = 0;
      snapshot.pointerId = null;
      return snapshot;
    }

    if (!wasBust) {
      // A cold direct seek starts from a deterministic front-facing bust.
      snapshot.yaw = 0;
      snapshot.formationYaw = 0;
      snapshot.resumeRemaining = 0;
      snapshot.state = ABOUT_NARRATIVE_BUST_STATES.SETTLED;
      return snapshot;
    }

    if (!wasSettled || snapshot.state === ABOUT_NARRATIVE_BUST_STATES.FORMING) {
      // Preserve the formation yaw exactly at the boundary. Ambient motion may
      // begin on a later sample, never in the boundary-crossing sample.
      snapshot.yaw = snapshot.formationYaw;
      snapshot.resumeRemaining = resumeDelay;
      snapshot.state = resumeDelay > 0
        ? ABOUT_NARRATIVE_BUST_STATES.RESUME_DELAY
        : ABOUT_NARRATIVE_BUST_STATES.SETTLED;
      return snapshot;
    }

    if (snapshot.state === ABOUT_NARRATIVE_BUST_STATES.DRAGGING) return snapshot;

    const autoAllowed = isBust
      && settled
      && !snapshot.hidden
      && !snapshot.reducedMotion
      && liveAmbient
      && !deterministicScrub;
    if (!autoAllowed) {
      snapshot.state = ABOUT_NARRATIVE_BUST_STATES.SETTLED;
      return snapshot;
    }

    if (snapshot.resumeRemaining > 0) {
      snapshot.resumeRemaining = Math.max(
        0,
        snapshot.resumeRemaining - nonNegative(deltaSeconds),
      );
      if (snapshot.resumeRemaining > 0) {
        snapshot.state = ABOUT_NARRATIVE_BUST_STATES.RESUME_DELAY;
        return snapshot;
      }
    }

    snapshot.state = ABOUT_NARRATIVE_BUST_STATES.AUTO_ROTATING;
    snapshot.yaw += nonNegative(deltaSeconds) * speed;
    return snapshot;
  };

  const beginDrag = ({
    pointerId,
    x,
    width = 320,
    sensitivity = 1,
  } = {}) => {
    if (!isBust || !settled || snapshot.hidden) return false;
    snapshot.pointerId = pointerId;
    dragStartX = finiteOr(x);
    dragStartYaw = snapshot.yaw;
    dragWidth = Math.max(320, nonNegative(width, 320));
    dragSensitivity = finiteOr(sensitivity, 1);
    snapshot.state = ABOUT_NARRATIVE_BUST_STATES.DRAGGING;
    snapshot.resumeRemaining = 0;
    return true;
  };

  const dragTo = ({ pointerId, x } = {}) => {
    if (
      snapshot.state !== ABOUT_NARRATIVE_BUST_STATES.DRAGGING
      || snapshot.pointerId !== pointerId
    ) return false;
    snapshot.yaw = dragStartYaw
      + (((finiteOr(x) - dragStartX) / dragWidth) * Math.PI * 2 * dragSensitivity);
    return true;
  };

  const endDrag = ({ pointerId } = {}) => {
    if (
      snapshot.state !== ABOUT_NARRATIVE_BUST_STATES.DRAGGING
      || snapshot.pointerId !== pointerId
    ) return false;
    snapshot.pointerId = null;
    snapshot.resumeRemaining = resumeDelay;
    snapshot.state = resumeDelay > 0
      ? ABOUT_NARRATIVE_BUST_STATES.RESUME_DELAY
      : ABOUT_NARRATIVE_BUST_STATES.SETTLED;
    return true;
  };

  const rotateByKeyboard = (direction) => {
    if (!isBust || !settled || snapshot.hidden) return false;
    const sign = direction === 'left' || direction === -1
      ? -1
      : direction === 'right' || direction === 1 ? 1 : 0;
    if (sign === 0) return false;
    snapshot.yaw += sign * finiteOr(keyboardStep, DEFAULT_KEYBOARD_STEP);
    snapshot.resumeRemaining = resumeDelay;
    snapshot.state = resumeDelay > 0
      ? ABOUT_NARRATIVE_BUST_STATES.RESUME_DELAY
      : ABOUT_NARRATIVE_BUST_STATES.SETTLED;
    return true;
  };

  const cancelInteraction = () => {
    snapshot.pointerId = null;
    if (!isBust) return false;
    snapshot.resumeRemaining = 0;
    snapshot.state = settled
      ? ABOUT_NARRATIVE_BUST_STATES.SETTLED
      : ABOUT_NARRATIVE_BUST_STATES.FORMING;
    return true;
  };

  const setYaw = (yaw) => {
    if (snapshot.state === ABOUT_NARRATIVE_BUST_STATES.DRAGGING) return false;
    snapshot.yaw = finiteOr(yaw);
    snapshot.formationYaw = snapshot.yaw;
    return true;
  };

  const writeSnapshot = (target) => {
    target.state = snapshot.state;
    target.yaw = snapshot.yaw;
    target.formationYaw = snapshot.formationYaw;
    target.resumeRemaining = snapshot.resumeRemaining;
    target.pointerId = snapshot.pointerId;
    target.interactive = snapshot.interactive;
    target.hidden = snapshot.hidden;
    target.reducedMotion = snapshot.reducedMotion;
    return target;
  };

  return Object.freeze({
    sample,
    beginDrag,
    dragTo,
    endDrag,
    rotateByKeyboard,
    cancelInteraction,
    setYaw,
    leave,
    get state() { return snapshot.state; },
    get yaw() { return snapshot.yaw; },
    get interactive() { return snapshot.interactive; },
    writeSnapshot,
  });
}
