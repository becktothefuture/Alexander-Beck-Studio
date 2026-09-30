import {
  BOARD_2D_END_Y,
  BOARD_HEIGHT,
  BOARD_WIDTH,
} from './boardScene.js';
import { createQuietIntervals } from './boardQuietIntervals.js';

/** Artwork and collisions share one coordinate space at every viewport. */
export function createBoardLayout(compact, {
  viewportHeight = 0, boardWidth = BOARD_WIDTH, quietHeights = null,
} = {}) {
  // A single coordinate scale is essential: stretching only the rendered pit
  // made its floors disagree with the Matter colliders on narrow screens.
  // Extend the straight chamber above the original funnel. Translate the
  // viewport origin, never stretch the machine, circles or collision shapes.
  const reservoirTop = viewportHeight > 0 && boardWidth > 0
    ? 825 - viewportHeight * BOARD_WIDTH / boardWidth : 0;
  const placement = quietHeights ? createQuietIntervals(boardWidth, quietHeights) : null;
  const placeY = placement?.placeY || (y => y);
  const placePoint = placement?.placePoint || (point => point);
  const height = placeY(BOARD_HEIGHT) - reservoirTop;
  const sceneHeight = placeY(BOARD_2D_END_Y) - reservoirTop;
  const mapY = y => y - reservoirTop;
  const inverseY = y => y + reservoirTop;

  function applyToSvg(svg) {
    svg.setAttribute('viewBox', `0 ${reservoirTop} ${BOARD_WIDTH} ${height}`);
    svg.setAttribute('height', String(height));
    svg.querySelector('#Geometry')?.removeAttribute('transform');
    // Clear the old phone-only stretch on route remounts and hot reloads.
    for (const id of ['reservoir-left-floor', 'reservoir-right-floor']) {
      svg.querySelector(`#${id}`)?.removeAttribute('transform');
    }
    // Reading pauses are real gaps between shared modules, so no phone-only
    // holes are needed in the garden's rows.
    svg.querySelectorAll('[id^="geometry-bumper-"]').forEach(group => {
      group.style.display = '';
    });
  }

  return { compact, height, sceneHeight, reservoirTop, mapY, inverseY, applyToSvg,
    placement, placeY, placePoint };
}
