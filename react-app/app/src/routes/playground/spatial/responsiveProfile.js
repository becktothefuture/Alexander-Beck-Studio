import { DEFAULT_PLAYGROUND_CONFIG } from '../config/playgroundConfig.js';

const PHONE_VIEWPORT_WIDTH_PX = 480;
const DESKTOP_VIEWPORT_WIDTH_PX = 1024;
const DESKTOP_VIEWPORT_HEIGHT_PX = 900;
// Preserve the approved 360 × 450 primary envelope and 24px packing baseline.
const REFERENCE_MEDIA_DIAGONAL_PX = Math.hypot(360, 450);
const REFERENCE_GRID_SPACING_PX = 24;
const PHONE_WORLD_SCALE = 0.84;
const PHONE_PROJECT_SPACING_SCALE = 2 / 3;
const PHONE_ITEM_GAP_SCALE = 1 / 3;
const PHONE_DOT_RADIUS_SCALE = 0.875;
const DESKTOP_CAPTION_TITLE_MINIMUM_PX = 12;
const PHONE_CAPTION_TITLE_MINIMUM_PX = 14.4;
const DESKTOP_CAPTION_DESCRIPTION_MINIMUM_PX = 11.52;
const PHONE_CAPTION_DESCRIPTION_MINIMUM_PX = 14.3;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function lerp(start, end, amount) {
  return start + ((end - start) * amount);
}

function smoothstep(value) {
  return value * value * (3 - (2 * value));
}

/**
 * Derives a visual-density profile from the usable Work width. The authored
 * configuration stays desktop-first; this profile only adapts its presentation.
 */
export function createPlaygroundResponsiveProfile(
  viewportWidthPx = DESKTOP_VIEWPORT_WIDTH_PX,
  viewportHeightPx = DESKTOP_VIEWPORT_HEIGHT_PX,
) {
  const width = Number(viewportWidthPx);
  const normalizedWidth = Number.isFinite(width) && width > 0
    ? width
    : DESKTOP_VIEWPORT_WIDTH_PX;
  const height = Number(viewportHeightPx);
  const normalizedHeight = Number.isFinite(height) && height > 0
    ? height
    : DESKTOP_VIEWPORT_HEIGHT_PX;
  const compactness = smoothstep(clamp(
    (DESKTOP_VIEWPORT_WIDTH_PX - normalizedWidth)
      / (DESKTOP_VIEWPORT_WIDTH_PX - PHONE_VIEWPORT_WIDTH_PX),
    0,
    1,
  ));
  const worldScale = lerp(1, PHONE_WORLD_SCALE, compactness);

  return Object.freeze({
    viewportWidthPx: normalizedWidth,
    viewportHeightPx: normalizedHeight,
    viewportDiagonalPx: Math.hypot(normalizedWidth, normalizedHeight),
    compactness,
    worldScale,
    titleScale: 1,
    projectSpacingScale: lerp(1, PHONE_PROJECT_SPACING_SCALE, compactness),
    itemGapScale: lerp(1, PHONE_ITEM_GAP_SCALE, compactness),
    dotRadiusScale: lerp(1, PHONE_DOT_RADIUS_SCALE, compactness),
    minimumItemTargetPx: 44 / worldScale,
    captionTitleMinimumPx: lerp(
      DESKTOP_CAPTION_TITLE_MINIMUM_PX,
      PHONE_CAPTION_TITLE_MINIMUM_PX,
      compactness,
    ),
    captionDescriptionMinimumPx: lerp(
      DESKTOP_CAPTION_DESCRIPTION_MINIMUM_PX,
      PHONE_CAPTION_DESCRIPTION_MINIMUM_PX,
      compactness,
    ),
  });
}

export function applyPlaygroundResponsiveProfile(config, profile) {
  const source = config && typeof config === 'object' ? config : {};
  const responsiveProfile = profile || createPlaygroundResponsiveProfile();
  const value = (key) => Number.isFinite(Number(source[key]))
    ? Number(source[key]) : DEFAULT_PLAYGROUND_CONFIG[key];
  const itemDiagonalPx = clamp(
    responsiveProfile.viewportDiagonalPx * value('itemDiagonalViewportRatio'),
    value('itemDiagonalMinPx'),
    value('itemDiagonalMaxPx'),
  );
  const gridSpacing = Math.max(1, Number(source.gridSpacingPx) || REFERENCE_GRID_SPACING_PX);
  const cellSizePx = responsiveProfile.worldScale * gridSpacing;
  return {
    ...source,
    itemDiagonalPx,
    worldScale: responsiveProfile.worldScale,
    // Convert CSS-pixel diagonal to world cells once per resize/config change.
    // Grid spacing remains a composition control, not a second image-size knob.
    itemViewportScale: itemDiagonalPx / REFERENCE_MEDIA_DIAGONAL_PX
      / responsiveProfile.worldScale * REFERENCE_GRID_SPACING_PX / gridSpacing,
    // Full media + caption clearances grow with the preview clamp. These are
    // geometry safeguards, not additional authored controls or a second scale.
    projectClearanceCells: Math.ceil(clamp(itemDiagonalPx / 10, 48, 72) / cellSizePx * 4) / 4,
    viewportWidthCells: responsiveProfile.viewportWidthPx / cellSizePx,
    viewportHeightCells: responsiveProfile.viewportHeightPx / cellSizePx,
    projectSpacing: Math.max(
      1,
      Number(source.projectSpacing || 1) * responsiveProfile.projectSpacingScale,
    ),
    itemGapCells: Math.max(
      1,
      Math.round(Number(source.itemGapCells || 1) * responsiveProfile.itemGapScale),
    ),
    dotRadiusPx: Math.max(
      0.25,
      Number(source.dotRadiusPx || 0.25) * responsiveProfile.dotRadiusScale,
    ),
    labelFontSizePx: responsiveProfile.captionTitleMinimumPx,
    labelLineHeightPx: responsiveProfile.captionTitleMinimumPx * 1.3,
    labelDescriptionFontSizePx: responsiveProfile.captionDescriptionMinimumPx,
    labelDescriptionLineHeightPx: responsiveProfile.captionDescriptionMinimumPx * 1.36,
    maximumCaseStudyWidthPx: Math.max(160, Math.min(
      itemDiagonalPx * 4 / Math.hypot(4, 5),
      responsiveProfile.viewportWidthPx - 48,
      responsiveProfile.viewportHeightPx * 0.6 * 4 / 5,
    ) / responsiveProfile.worldScale),
  };
}
