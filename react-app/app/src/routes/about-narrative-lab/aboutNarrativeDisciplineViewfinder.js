export const ABOUT_NARRATIVE_DISCIPLINE_VIEWFINDER = Object.freeze({
  entryStartRatio: 0.95,
  entryCompleteRatio: 0.92,
});

function clamp01(value) {
  return Math.min(1, Math.max(0, Number(value) || 0));
}

function smoothstep(value) {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
}

export function writeAboutNarrativeDisciplineViewfinderWeights(
  target,
  projectedY,
  viewportHeight,
  {
    entryStartRatio = ABOUT_NARRATIVE_DISCIPLINE_VIEWFINDER.entryStartRatio,
    entryCompleteRatio = ABOUT_NARRATIVE_DISCIPLINE_VIEWFINDER.entryCompleteRatio,
  } = ABOUT_NARRATIVE_DISCIPLINE_VIEWFINDER,
) {
  const height = Math.max(1, Number(viewportHeight) || 1);
  const startY = height * Math.max(entryStartRatio, entryCompleteRatio);
  const completeY = height * Math.min(entryStartRatio, entryCompleteRatio);
  const travel = Math.max(1, startY - completeY);
  for (let index = 0; index < target.length; index += 1) {
    const y = Number(projectedY[index]);
    target[index] = Number.isFinite(y)
      ? smoothstep((startY - y) / travel)
      : 0;
  }
  return target;
}
