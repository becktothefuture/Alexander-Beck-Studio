export const SCROLL_PROGRESS_INDICATOR_TICK_COUNT = 18;
export const SCROLL_PROGRESS_INDICATOR_ACTIVE_TICK_COUNT = 2;

const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

export function resolveScrollProgressIndicatorState(
  progress,
  {
    tickCount = SCROLL_PROGRESS_INDICATOR_TICK_COUNT,
    activeTickCount = SCROLL_PROGRESS_INDICATOR_ACTIVE_TICK_COUNT,
  } = {},
) {
  const resolvedTickCount = Math.max(1, Math.round(Number(tickCount) || 1));
  const resolvedActiveTickCount = Math.min(
    resolvedTickCount,
    Math.max(1, Math.round(Number(activeTickCount) || 1)),
  );
  const resolvedProgress = clamp01(progress);
  const maxStartIndex = Math.max(0, resolvedTickCount - resolvedActiveTickCount);

  return {
    progress: resolvedProgress,
    progressValue: Math.round(resolvedProgress * 100),
    activeStartIndex: Math.round(resolvedProgress * maxStartIndex),
    tickCount: resolvedTickCount,
    activeTickCount: resolvedActiveTickCount,
  };
}

export function getScrollElementProgress(element) {
  const scrollTop = Math.max(0, Number(element?.scrollTop) || 0);
  const scrollHeight = Math.max(0, Number(element?.scrollHeight) || 0);
  const clientHeight = Math.max(0, Number(element?.clientHeight) || 0);
  if (clientHeight <= 0 || scrollHeight <= 0) return 0;

  const scrollTravel = Math.max(0, scrollHeight - clientHeight);
  if (scrollTravel <= 0) return 1;
  return clamp01(scrollTop / scrollTravel);
}
