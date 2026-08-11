const SIXTY_HZ_MODES = new Set([
  'flies',
  'weightless',
  'water',
  'magnetic',
  'elastic-center',
]);

export const PIT_ACTIVE_CADENCE_HOLD_SECONDS = 0.25;
const PIT_CALM_AWAKE_RATIO = 0.01;
const PIT_CALM_MOVEMENT_PX_PER_SECOND = 2;
const PIT_CALM_SPEED_PX_PER_SECOND = 20;
const PIT_CALM_ANGULAR_SPEED_PER_SECOND = 0.035;
const PIT_CALM_OVERLAP_PER_BODY_PX = 0.25;
const PIT_RECENT_POINTER_WINDOW_MS = 180;

function hasFiniteActivityMetric(value) {
  return value !== null
    && value !== undefined
    && value !== ''
    && Number.isFinite(Number(value));
}

export function isPitPhysicsActive(globals = {}, nowMs = 0) {
  const balls = Array.isArray(globals.balls) ? globals.balls : [];
  const bodyCount = balls.length;
  const awakeCount = Number(globals.pitAwakeBodyCount);
  const maxAwakeSpeedSq = Number(globals.pitMaxAwakeSpeedSq);
  const maxAwakeAngularSpeed = Number(globals.pitMaxAwakeAngularSpeed);
  const overlapDebt = Number(globals.pitLastOverlapDebt);
  const dpr = Math.max(1, Number(globals.DPR) || 1);
  const pointerLastMoveMs = Math.max(
    Number(globals.lastPointerMoveMs) || 0,
    Number(globals.pointerLastEventMs) || 0,
  );
  const recentPointerMove = globals.pointerInCanvas === true
    && Number.isFinite(pointerLastMoveMs)
    && (Number(nowMs) - pointerLastMoveMs) <= PIT_RECENT_POINTER_WINDOW_MS;

  if ((Number(globals.warmupFramesRemaining) || 0) > 0) return true;
  if (globals.pointerActive === true || recentPointerMove) return true;
  // Missing activity evidence must retain the authored 120 Hz reference path.
  if (bodyCount <= 0
    || !hasFiniteActivityMetric(globals.pitSleepingBodyCount)
    || !hasFiniteActivityMetric(globals.pitAwakeBodyCount)
    || !hasFiniteActivityMetric(globals.pitMaxAwakeSpeedSq)
    || !hasFiniteActivityMetric(globals.pitMaxAwakeAngularSpeed)
    || !hasFiniteActivityMetric(globals.pitLastOverlapDebt)) return true;

  const calmAwakeLimit = Math.max(1, Math.ceil(bodyCount * PIT_CALM_AWAKE_RATIO));
  const calmMovementSq = (PIT_CALM_MOVEMENT_PX_PER_SECOND * dpr) ** 2;
  const calmSpeedSq = (PIT_CALM_SPEED_PX_PER_SECOND * dpr) ** 2;
  const calmOverlapDebt = PIT_CALM_OVERLAP_PER_BODY_PX * dpr * bodyCount;
  return (awakeCount > calmAwakeLimit && maxAwakeSpeedSq > calmMovementSq)
    || maxAwakeSpeedSq > calmSpeedSq
    || maxAwakeAngularSpeed > PIT_CALM_ANGULAR_SPEED_PER_SECOND
    || overlapDebt > calmOverlapDebt;
}

function resolvePitPhysicsStepSeconds(globals, elapsedSeconds, nowMs) {
  const active = isPitPhysicsActive(globals, nowMs);
  const elapsed = Math.max(0, Math.min(0.1, Number(elapsedSeconds) || 0));
  const previousHold = Math.max(0, Number(globals.pitCadenceHoldSeconds) || 0);
  const holdSeconds = active
    ? PIT_ACTIVE_CADENCE_HOLD_SECONDS
    : Math.max(0, previousHold - elapsed);
  const stepHz = holdSeconds > 0 ? 120 : 60;
  globals.pitCadenceHoldSeconds = holdSeconds;
  globals.pitPhysicsStepHz = stepHz;
  if (globals.performanceAuditEnabled === true) {
    const counter = stepHz === 120 ? 'pitPhysics120HzDecisionCount' : 'pitPhysics60HzDecisionCount';
    globals[counter] = (Number(globals[counter]) || 0) + 1;
  }
  return 1 / stepHz;
}

export function resolvePhysicsStepSeconds(mode, globals = {}, elapsedSeconds = 0, nowMs = 0) {
  if (globals.isMobile || globals.isMobileViewport || SIXTY_HZ_MODES.has(mode)) return 1 / 60;
  if (mode === 'pit') return resolvePitPhysicsStepSeconds(globals, elapsedSeconds, nowMs);
  return 1 / 120;
}

export function shouldSkipSleepingBodyStep(mode, globals = {}) {
  return mode === 'pit'
    || mode === 'portfolio-pit'
    || globals.physicsSkipSleepingSteps !== false;
}
