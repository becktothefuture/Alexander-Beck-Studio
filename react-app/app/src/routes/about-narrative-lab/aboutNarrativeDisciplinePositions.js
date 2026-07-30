export const ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS = Object.freeze({
  x: Object.freeze({ min: 0.1, max: 0.72 }),
  y: Object.freeze({ min: 0.4, max: 0.95 }),
});

export const ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP = 0.01;
export const ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION = 0.16;

export const ABOUT_NARRATIVE_DISCIPLINE_DESKTOP_POSITIONS = Object.freeze([
  Object.freeze([0.14, 0.50]),
  Object.freeze([0.42, 0.58]),
  Object.freeze([0.70, 0.66]),
  Object.freeze([0.14, 0.76]),
  Object.freeze([0.42, 0.85]),
  Object.freeze([0.70, 0.94]),
]);

export const ABOUT_NARRATIVE_DISCIPLINE_MOBILE_POSITIONS = Object.freeze([
  Object.freeze([0.16, 0.50]),
  Object.freeze([0.62, 0.59]),
  Object.freeze([0.16, 0.68]),
  Object.freeze([0.62, 0.77]),
  Object.freeze([0.16, 0.86]),
  Object.freeze([0.62, 0.95]),
]);

function clamp(value, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : min;
}

function clean(value) {
  return Number(Number(value).toFixed(2));
}

export function getAboutNarrativeDisciplinePosition(item, profile = 'desktop') {
  const groupIndex = Math.max(0, Math.min(5, Math.round(Number(item?.group || 1)) - 1));
  const desktopFallback = ABOUT_NARRATIVE_DISCIPLINE_DESKTOP_POSITIONS[groupIndex];
  const fallback = profile === 'mobile'
    ? ABOUT_NARRATIVE_DISCIPLINE_MOBILE_POSITIONS[groupIndex]
    : desktopFallback;
  const candidate = profile === 'mobile'
    ? item?.mobilePosition || item?.position || fallback
    : item?.position || fallback;
  return [
    clean(clamp(candidate?.[0], ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x.min, ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x.max)),
    clean(clamp(candidate?.[1], ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y.min, ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y.max)),
  ];
}

export function getAboutNarrativeDisciplineMinimumSeparation(items, profile = 'desktop') {
  let minimum = Number.POSITIVE_INFINITY;
  for (let left = 0; left < items.length; left += 1) {
    const leftPosition = getAboutNarrativeDisciplinePosition(items[left], profile);
    for (let right = left + 1; right < items.length; right += 1) {
      const rightPosition = getAboutNarrativeDisciplinePosition(items[right], profile);
      minimum = Math.min(minimum, Math.hypot(
        leftPosition[0] - rightPosition[0],
        leftPosition[1] - rightPosition[1],
      ));
    }
  }
  return Number.isFinite(minimum) ? minimum : 1;
}

function clearsOtherPositions(items, group, profile, position) {
  return items.every((item) => {
    if (Number(item?.group) === Number(group)) return true;
    const other = getAboutNarrativeDisciplinePosition(item, profile);
    return Math.hypot(position[0] - other[0], position[1] - other[1])
      >= ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION - 0.000001;
  });
}

export function constrainAboutNarrativeDisciplinePosition(items, group, profile, requested) {
  const xBounds = ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x;
  const yBounds = ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y;
  const target = [
    clean(clamp(requested?.[0], xBounds.min, xBounds.max)),
    clean(clamp(requested?.[1], yBounds.min, yBounds.max)),
  ];
  if (clearsOtherPositions(items, group, profile, target)) return target;

  const currentItem = items.find((item) => Number(item?.group) === Number(group));
  const current = getAboutNarrativeDisciplinePosition(currentItem, profile);
  let best = clearsOtherPositions(items, group, profile, current) ? current : null;
  let bestDistance = best
    ? Math.hypot(best[0] - target[0], best[1] - target[1])
    : Number.POSITIVE_INFINITY;
  let bestCurrentDistance = best ? 0 : Number.POSITIVE_INFINITY;

  for (let x = xBounds.min; x <= xBounds.max + 0.000001; x += ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP) {
    for (let y = yBounds.min; y <= yBounds.max + 0.000001; y += ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP) {
      const candidate = [clean(x), clean(y)];
      if (!clearsOtherPositions(items, group, profile, candidate)) continue;
      const distance = Math.hypot(candidate[0] - target[0], candidate[1] - target[1]);
      const currentDistance = Math.hypot(candidate[0] - current[0], candidate[1] - current[1]);
      if (distance < bestDistance - 0.000001
        || (Math.abs(distance - bestDistance) <= 0.000001 && currentDistance < bestCurrentDistance)) {
        best = candidate;
        bestDistance = distance;
        bestCurrentDistance = currentDistance;
      }
    }
  }

  return best || current;
}
