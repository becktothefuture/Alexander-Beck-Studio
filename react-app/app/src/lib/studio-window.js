import { parseThemeColour } from './theme-transition.js';

export const STUDIO_WINDOW_DEFAULTS = Object.freeze({
  maxWidth: 1920,
  maxHeight: 1080,
  outerSpaceRatio: 0.08,
  insetMultiplier: 3,
});

// Only the outer gutters grow; the authored frame thickness stays unchanged.
export function getStudioWindowInsets({
  width, height, frameInset, menuReserve,
  maxWidth = STUDIO_WINDOW_DEFAULTS.maxWidth,
  maxHeight = STUDIO_WINDOW_DEFAULTS.maxHeight,
  outerSpaceRatio = STUDIO_WINDOW_DEFAULTS.outerSpaceRatio,
  insetMultiplier = STUDIO_WINDOW_DEFAULTS.insetMultiplier,
}) {
  const progress = Math.min(1, Math.max(0, (width - maxWidth) / (maxWidth / 3)));
  const wideInset = Math.max(frameInset * insetMultiplier, height * outerSpaceRatio,
    (height - menuReserve + frameInset - maxHeight) / 2);
  return {
    x: Math.max(frameInset, (width - maxWidth) / 2),
    y: frameInset + (wideInset - frameInset) * progress,
  };
}

// Reach follows source dimensions at a fixed implied depth. Brightness drives
// the shared wall/menu emission, with a small ambient floor in dark mode.
export function getStudioWindowLight(width, height, background) {
  const colour = parseThemeColour(background) || [255, 255, 255];
  return {
    scale: Math.min(1.5, Math.max(0.8, Math.sqrt(width * height / (1280 * 720)))),
    emission: Math.max(0.12, (colour[0] * 0.2126 + colour[1] * 0.7152 + colour[2] * 0.0722) / 255),
  };
}
