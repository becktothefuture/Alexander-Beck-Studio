const PHONE_VIEWPORT_WIDTH_PX = 480;
const DESKTOP_VIEWPORT_WIDTH_PX = 1024;
const PHONE_WORLD_SCALE = 0.84;
const PHONE_TITLE_SCALE = 0.94;
const PHONE_PROJECT_SPACING_SCALE = 0.8;
const PHONE_DOT_RADIUS_SCALE = 0.875;

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
 * Derives a visual-density profile from the usable Lab width. The authored
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
    titleScale: lerp(1, PHONE_TITLE_SCALE, compactness),
    projectSpacingScale: lerp(1, PHONE_PROJECT_SPACING_SCALE, compactness),
    dotRadiusScale: lerp(1, PHONE_DOT_RADIUS_SCALE, compactness),
    minimumItemTargetPx: 44 / worldScale,
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
    dotRadiusPx: Math.max(
      0.25,
      Number(source.dotRadiusPx || 0.25) * responsiveProfile.dotRadiusScale,
    ),
  };
}
