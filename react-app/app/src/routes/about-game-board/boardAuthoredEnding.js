import { measureRollercoasterEndingCircle } from '../about-rollercoaster/rollercoasterEnding.js';
import { BOARD_HANDOFF_PHASES } from './boardGridHandoffScene.js';
import {
  BOARD_BAND_JOURNEY, createBoardBandJourney, selectBoardTunnelGeometry,
  smoothBandProgress,
} from './boardBandJourney.js';

export const BOARD_AUTHORED_ENDING_SOURCE_START = BOARD_BAND_JOURNEY.sourceStart;

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

/** Map the board's final passage onto the authored Blender ending.
 * The source starts at tunnel-b and continues through its approach and final wall. */
export function boardAuthoredEndingProgress(progress, sourceStart = BOARD_AUTHORED_ENDING_SOURCE_START) {
  const start = clamp01(sourceStart);
  const local = clamp01((clamp01(progress) - BOARD_HANDOFF_PHASES.authoredStart)
    / (1 - BOARD_HANDOFF_PHASES.authoredStart));
  return start + (1 - start) * local;
}

/** Measure the actual contact content so the final Blender wall keeps a clear opening. */
export function measureBoardEndingOpening(canvas, ending) {
  if (!canvas || !ending) return null;
  const canvasBox = canvas.getBoundingClientRect();
  if (canvasBox.width < 2 || canvasBox.height < 2) return null;
  const nodes = ending.querySelectorAll('h2:not([data-about-draw-overlay]), p:not([data-about-draw-overlay]), .about-board-ending__actions > *');
  const boxes = [...nodes].map(node => {
    const box = node.getBoundingClientRect();
    const text = node.matches('h2, p') ? node.ownerDocument.createRange() : null;
    text?.selectNodeContents(node);
    const ink = text?.getBoundingClientRect();
    const horizontal = ink?.width > 0 ? ink : box;
    return {
      left: horizontal.left - canvasBox.left,
      right: horizontal.right - canvasBox.left,
      top: box.top - canvasBox.top,
      bottom: box.bottom - canvasBox.top,
    };
  });
  const circle = measureRollercoasterEndingCircle(boxes);
  if (!circle) return null;
  const left = Math.min(...boxes.map(box => box.left));
  const right = Math.max(...boxes.map(box => box.right));
  const top = Math.min(...boxes.map(box => box.top));
  const bottom = Math.max(...boxes.map(box => box.bottom));
  return { ...circle, halfWidth: (right - left) / 2, halfHeight: (bottom - top) / 2 };
}

export async function createBoardAuthoredEndingScene(options) {
  const { createRollercoasterScene } = await import('../about-rollercoaster/rollercoasterScene.js');
  const { entries, radiusScale, sourceBalls, getGridState, onReady, ...sceneOptions } = options;
  let wrapper;
  function wrap(scene) {
    if (wrapper) return wrapper;
    wrapper = Object.freeze({
      ...scene,
      render(frame = {}) {
        const progress = clamp01(frame.progress);
        return scene.render({ ...frame, progress: boardAuthoredEndingProgress(progress),
          boardJourneyProgress: progress });
      },
      dispose({ retireSurface = false } = {}) {
        // Normal teardown keeps the legacy renderer's attached-canvas policy.
        // A distant board scene can retire its own keyed canvas completely;
        // the route mounts a fresh surface before a later reverse approach.
        const context = retireSurface ? sceneOptions.canvas.getContext('webgl2') : null;
        scene.dispose();
        if (retireSurface) {
          context?.getExtension('WEBGL_lose_context')?.loseContext();
          sceneOptions.canvas.width = 1;
          sceneOptions.canvas.height = 1;
        }
      },
    });
    return wrapper;
  }
  const scene = await createRollercoasterScene({ ...sceneOptions, surfaceBatching: true,
    scrollOwnedCamera: true,
    boardJourney: {
      selectGeometry: selectBoardTunnelGeometry,
      create: context => createBoardBandJourney({ ...context, entries, radiusScale, sourceBalls, getGridState }),
      openingReveal: progress => smoothBandProgress(progress,
        BOARD_BAND_JOURNEY.endingRevealStart, BOARD_BAND_JOURNEY.endingRevealEnd),
    },
    onReady: value => onReady?.(wrap(value)),
  });
  return wrap(scene);
}
