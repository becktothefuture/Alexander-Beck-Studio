import {
  GRID_START_Y,
  BOARD_HEIGHT,
  BOARD_WIDTH,
} from './boardScene.js';
import { BOARD_PORTRAIT_CHUTE_HEIGHT } from './boardPortraitChute.js';
import { createQuietIntervals } from './boardQuietIntervals.js';

/** Keep real ball positions within the same module when reading gaps reflow. */
export function remapBoardY(y, previous, next) {
  const before = previous?.placement?.modules, after = next?.placement?.modules;
  if (!before || !after) return y;
  for (let index = 0; index < before.length; index += 1) {
    const source = before[index], target = after[index];
    if (y <= source.top + source.height) return y + target.top - source.top;
    const following = before[index + 1], nextFollowing = after[index + 1];
    if (following && y < following.top) {
      const end = source.top + source.height;
      const fraction = (y - end) / Math.max(1, following.top - end);
      return target.top + target.height + fraction * (nextFollowing.top - target.top - target.height);
    }
  }
  return y + after.at(-1).top - before.at(-1).top;
}

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
  const portraitChuteTop = placeY(GRID_START_Y);
  const sceneHeight = portraitChuteTop + BOARD_PORTRAIT_CHUTE_HEIGHT - reservoirTop;
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

  return { compact, height, sceneHeight, portraitChuteTop, reservoirTop, mapY, inverseY, applyToSvg,
    placement, placeY, placePoint };
}
