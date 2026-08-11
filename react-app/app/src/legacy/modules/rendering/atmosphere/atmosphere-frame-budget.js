const DEFAULT_TARGET_FPS = 60;
const MIN_COST_ESTIMATE_MS = 0.25;
const PRESENTATION_MARGIN_MS = 1;

export function resolveAtmosphereMaximumOutputAgeMs(cadenceFps, targetFps = DEFAULT_TARGET_FPS) {
  const atmosphereInterval = 1000 / Math.max(1, Number(cadenceFps) || 24);
  const displayInterval = 1000 / Math.max(1, Number(targetFps) || DEFAULT_TARGET_FPS);
  return atmosphereInterval + displayInterval;
}

/**
 * Defer only an already-presented steady-state atmosphere frame, and only
 * while the retained output remains no more than one display frame overdue.
 */
export function shouldDeferAtmosphereFrame({
  frameBudget,
  nowMs,
  lastCompositeAt,
  cadenceFps,
  costEstimateMs,
  canDefer = true,
} = {}) {
  if (!canDefer || frameBudget?.allowAtmosphereDeferral !== true) return false;
  const deadlineMs = Number(frameBudget.deadlineMs);
  const now = Number(nowMs);
  const lastComposite = Number(lastCompositeAt);
  if (!Number.isFinite(deadlineMs) || !Number.isFinite(now) || lastComposite <= 0) return false;

  const estimatedCost = Math.max(MIN_COST_ESTIMATE_MS, Number(costEstimateMs) || 0);
  const remainingBudgetMs = deadlineMs - now;
  if (remainingBudgetMs >= estimatedCost + PRESENTATION_MARGIN_MS) return false;

  const maximumAgeMs = resolveAtmosphereMaximumOutputAgeMs(
    cadenceFps,
    frameBudget.targetFps,
  );
  const nextDisplayIntervalMs = 1000 / Math.max(
    1,
    Number(frameBudget.targetFps) || DEFAULT_TARGET_FPS,
  );
  return (now - lastComposite + nextDisplayIntervalMs) <= maximumAgeMs;
}
