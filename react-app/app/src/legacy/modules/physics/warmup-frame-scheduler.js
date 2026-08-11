export const DEFAULT_WARMUP_SLICE_BUDGET_MS = 2;
export const DEFAULT_WARMUP_SLICE_HARD_LIMIT_MS = 4;

export function resolveWarmupFrameCount(requestedFrames, bodyCount) {
  if (!(Number(bodyCount) > 0)) return 0;
  return Math.max(0, Math.round(Number(requestedFrames) || 0));
}

function resolveClock(now) {
  if (typeof now === 'function') return now;
  return () => performance.now();
}

/**
 * Consume deterministic warm-up frames without monopolising one display frame.
 * The simulation step owns state; this module only owns wall-clock budgeting.
 */
export function consumeWarmupFrameSlice({
  remainingFrames,
  runFrame,
  now,
  preferredBudgetMs = DEFAULT_WARMUP_SLICE_BUDGET_MS,
  hardLimitMs = DEFAULT_WARMUP_SLICE_HARD_LIMIT_MS,
} = {}) {
  const clock = resolveClock(now);
  const run = typeof runFrame === 'function' ? runFrame : () => {};
  const preferred = Math.max(0.25, Number(preferredBudgetMs) || DEFAULT_WARMUP_SLICE_BUDGET_MS);
  const hardLimit = Math.max(preferred, Number(hardLimitMs) || DEFAULT_WARMUP_SLICE_HARD_LIMIT_MS);
  let remaining = Math.max(0, Math.round(Number(remainingFrames) || 0));
  let consumedFrames = 0;
  const startedAt = clock();

  while (remaining > 0) {
    if (consumedFrames > 0 && (clock() - startedAt) >= preferred) break;
    run();
    remaining -= 1;
    consumedFrames += 1;
    if ((clock() - startedAt) >= hardLimit) break;
  }

  const elapsedMs = Math.max(0, clock() - startedAt);
  return {
    consumedFrames,
    remainingFrames: remaining,
    elapsedMs,
    exceededHardLimit: elapsedMs > hardLimit,
  };
}
