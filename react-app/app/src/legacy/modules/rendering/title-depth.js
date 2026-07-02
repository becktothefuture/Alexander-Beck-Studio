import { MODES } from '../core/constants.js';

export const TITLE_DEPTH_PLANE_Z = 0.5;
export const TITLE_SCENE_PLACEMENT = Object.freeze({
  BEHIND: 'behind',
  DEPTH_PLANE: 'depth-plane',
  HIDDEN: 'hidden'
});

const DEPTH_PLANE_TITLE_MODES = new Set([
  MODES.SPHERE_3D,
  MODES.CUBE_3D,
  MODES.PARALLAX_FLOAT
]);

function getCanvasCenter(canvas) {
  return {
    x: canvas ? canvas.width * 0.5 : 0,
    y: canvas ? canvas.height * 0.5 : 0
  };
}

export function resolveTitleScenePlacement(mode) {
  return DEPTH_PLANE_TITLE_MODES.has(mode)
    ? TITLE_SCENE_PLACEMENT.DEPTH_PLANE
    : TITLE_SCENE_PLACEMENT.BEHIND;
}

export function modeUsesDepthTitlePlane(mode) {
  return resolveTitleScenePlacement(mode) === TITLE_SCENE_PLACEMENT.DEPTH_PLANE;
}

export function getHeroTitleCanvasCenter(globals) {
  const canvas = globals?.canvas;
  if (!canvas || typeof document === 'undefined') return getCanvasCenter(canvas);

  const title = document.getElementById('hero-title');
  if (!title) return getCanvasCenter(canvas);

  const canvasRect = canvas.getBoundingClientRect();
  const titleRect = title.getBoundingClientRect();
  if (
    !canvasRect ||
    !titleRect ||
    canvasRect.width <= 0 ||
    canvasRect.height <= 0 ||
    titleRect.width <= 0 ||
    titleRect.height <= 0
  ) {
    return getCanvasCenter(canvas);
  }

  return {
    x: ((titleRect.left + titleRect.width * 0.5) - canvasRect.left) * (canvas.width / canvasRect.width),
    y: ((titleRect.top + titleRect.height * 0.5) - canvasRect.top) * (canvas.height / canvasRect.height)
  };
}
