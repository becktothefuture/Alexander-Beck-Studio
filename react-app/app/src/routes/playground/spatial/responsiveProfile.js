const PHONE_VIEWPORT_WIDTH_PX = 480;
const DESKTOP_VIEWPORT_WIDTH_PX = 1024;
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
export function createPlaygroundResponsiveProfile(viewportWidthPx = DESKTOP_VIEWPORT_WIDTH_PX) {
  const width = Number(viewportWidthPx);
  const normalizedWidth = Number.isFinite(width) && width > 0
    ? width
    : DESKTOP_VIEWPORT_WIDTH_PX;
  const compactness = smoothstep(clamp(
    (DESKTOP_VIEWPORT_WIDTH_PX - normalizedWidth)
      / (DESKTOP_VIEWPORT_WIDTH_PX - PHONE_VIEWPORT_WIDTH_PX),
    0,
    1,
  ));
  const worldScale = lerp(1, PHONE_WORLD_SCALE, compactness);

  return Object.freeze({
    viewportWidthPx: normalizedWidth,
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
  return {
    ...source,
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
  };
}
