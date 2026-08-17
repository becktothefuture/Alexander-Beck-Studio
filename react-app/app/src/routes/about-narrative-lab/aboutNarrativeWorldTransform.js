import {
  sampleAboutNarrativeResponsiveWorldMaterialInto,
} from './aboutNarrativeResponsiveMaterial.js';

export function createAboutNarrativeWorldTransformSample() {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    xScale: 1,
    presenceRatio: 1,
    responsiveMaterial: {
      scale: 1,
      xScale: 1,
      yOffset: 0,
      presenceRatio: 1,
    },
  };
}

/**
 * Resolve the world matrix inputs shared by the renderer and any camera path
 * that must occupy the rendered geometry. The caller owns `target`, so this is
 * safe to use in compile loops without creating temporary vectors.
 */
export function resolveAboutNarrativeWorldTransformInto(
  world,
  {
    inlineSize = 0,
    compact = false,
    shortLandscape = false,
    anchorRailZ = Number(world?.anchorRailZ || 0),
  } = {},
  target,
) {
  if (!target?.position || !target?.rotation || !target?.responsiveMaterial) {
    throw new TypeError('World transform resolution requires a caller-owned sample.');
  }
  const transform = world?.transform || {};
  const position = transform.position || [0, 0, 0];
  const rotation = transform.rotation || [0, 0, 0];
  const baseScale = Number(transform.scale ?? 1);
  const responsive = sampleAboutNarrativeResponsiveWorldMaterialInto(
    world,
    inlineSize,
    compact,
    shortLandscape,
    target.responsiveMaterial,
  );
  const responsiveScale = shortLandscape && Number.isFinite(transform.mobileLandscapeScale)
    ? Number(transform.mobileLandscapeScale)
    : responsive.scale;
  const scale = compact && Number.isFinite(responsiveScale)
    ? Number(responsiveScale)
    : baseScale;
  const responsiveXScale = shortLandscape && Number.isFinite(transform.mobileLandscapeXScale)
    ? Number(transform.mobileLandscapeXScale)
    : responsive.xScale;
  const xScale = compact && Number.isFinite(responsiveXScale)
    ? Number(responsiveXScale)
    : scale;

  target.position[0] = Number(position[0] || 0)
    + (shortLandscape ? Number(transform.mobileLandscapeXOffset || 0) : 0);
  target.position[1] = Number(position[1] || 0)
    + (compact ? Number(responsive.yOffset || 0) : 0)
    + (shortLandscape ? Number(transform.mobileLandscapeYOffset || 0) : 0);
  target.position[2] = Number(anchorRailZ || 0)
    - Number(world?.entryDistanceWU || 0)
    + Number(position[2] || 0)
    + (compact ? Number(transform.mobileZOffset || 0) : 0)
    + (shortLandscape ? Number(transform.mobileLandscapeZOffset || 0) : 0);
  target.rotation[0] = Number(rotation[0] || 0);
  target.rotation[1] = Number(rotation[1] || 0);
  target.rotation[2] = Number(rotation[2] || 0);
  target.scale = scale;
  target.xScale = xScale;
  target.presenceRatio = responsive.presenceRatio;
  return target;
}
