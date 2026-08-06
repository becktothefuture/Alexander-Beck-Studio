const clamp01 = (value) => Math.min(1, Math.max(0, Number(value) || 0));

const smoothstep = (value) => {
  const progress = clamp01(value);
  return progress * progress * (3 - (2 * progress));
};

const mix = (start, end, progress) => (
  Number(start) + ((Number(end) - Number(start)) * progress)
);

export function sampleAboutNarrativeResponsiveWorldMaterialInto(
  world,
  inlineSize,
  compact,
  shortLandscape,
  target,
) {
  const transform = world?.transform || {};
  const baseScale = Number(transform.scale ?? 1);
  const baseDensity = Math.max(0.000001, Number(world?.shapeParameters?.density ?? 1));
  const wideScale = Number(transform.mobileScale ?? baseScale);
  const wideXScale = Number(transform.mobileXScale ?? wideScale);
  const wideYOffset = Number(transform.mobileYOffset || 0);
  target.scale = compact ? wideScale : baseScale;
  target.xScale = compact ? wideXScale : baseScale;
  target.yOffset = compact ? wideYOffset : 0;
  target.presenceRatio = 1;

  if (!compact || shortLandscape) return target;
  const narrowWidth = Number(transform.mobileNarrowWidth);
  const wideWidth = Number(transform.mobileWideWidth);
  if (!Number.isFinite(narrowWidth)
    || !Number.isFinite(wideWidth)
    || wideWidth <= narrowWidth) return target;

  const widthProgress = smoothstep(
    (Number(inlineSize) - narrowWidth) / (wideWidth - narrowWidth),
  );
  const narrowScale = Number(transform.mobileNarrowScale ?? wideScale);
  const narrowYOffset = Number(transform.mobileNarrowYOffset ?? wideYOffset);
  const narrowDensity = Number(transform.mobileNarrowDensity ?? baseDensity);
  target.scale = mix(narrowScale, wideScale, widthProgress);
  target.xScale = mix(narrowScale, wideXScale, widthProgress);
  target.yOffset = mix(narrowYOffset, wideYOffset, widthProgress);
  target.presenceRatio = clamp01(mix(narrowDensity, baseDensity, widthProgress) / baseDensity);
  return target;
}
