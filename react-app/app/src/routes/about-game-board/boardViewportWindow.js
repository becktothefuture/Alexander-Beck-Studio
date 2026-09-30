const DEFAULT_MAX_SCREENS = 3;
const DEFAULT_REBASE_MARGIN_SCREENS = 0.5;

function finitePositive(value) {
  return Number.isFinite(value) && value > 0;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Keep one bounded strip around the visible part of the tall board.
 *
 * The strip is positioned in CSS pixels inside the native scrolling world.
 * Scrolling therefore moves its last painted pixels with the SVG on the
 * compositor, even when JavaScript is briefly late. Rebase only near the
 * overscan edge or after a large jump.
 */
export function createBoardViewportWindow({
  maxScreens = DEFAULT_MAX_SCREENS,
  rebaseMarginScreens = DEFAULT_REBASE_MARGIN_SCREENS,
} = {}) {
  const resolvedMaxScreens = Math.max(1, Number(maxScreens) || DEFAULT_MAX_SCREENS);
  const numericMarginScreens = Number(rebaseMarginScreens);
  const resolvedMarginScreens = clamp(
    Number.isFinite(numericMarginScreens)
      ? numericMarginScreens : DEFAULT_REBASE_MARGIN_SCREENS,
    0,
    Math.max(0, (resolvedMaxScreens - 1) / 2),
  );
  const state = {
    valid: false,
    revision: 0,
    rebased: false,
    sampledScroll: 0,
    visibleTopCssPx: 0,
    stripOriginCssPx: 0,
    stripHeightCssPx: 0,
    stripEndCssPx: 0,
    worldWidth: 0,
    worldHeight: 0,
    viewportHeight: 0,
  };

  function update({
    scrollTop,
    worldTop,
    worldWidth,
    worldHeight,
    viewportHeight,
    force = false,
  }) {
    if (![scrollTop, worldTop].every(Number.isFinite)
      || !finitePositive(worldWidth)
      || !finitePositive(worldHeight)
      || !finitePositive(viewportHeight)) {
      state.rebased = false;
      return state;
    }

    const stripHeight = Math.min(worldHeight, viewportHeight * resolvedMaxScreens);
    const maximumOrigin = Math.max(0, worldHeight - stripHeight);
    const maximumVisibleTop = Math.max(0, worldHeight - viewportHeight);
    const visibleTop = clamp(scrollTop - worldTop, 0, maximumVisibleTop);
    const targetOrigin = clamp(
      visibleTop - Math.max(0, stripHeight - viewportHeight) / 2,
      0,
      maximumOrigin,
    );
    const dimensionsChanged = !state.valid
      || Math.abs(state.worldWidth - worldWidth) > 0.5
      || Math.abs(state.worldHeight - worldHeight) > 0.5
      || Math.abs(state.viewportHeight - viewportHeight) > 0.5
      || Math.abs(state.stripHeightCssPx - stripHeight) > 0.5;
    const margin = Math.min(
      viewportHeight * resolvedMarginScreens,
      Math.max(0, (stripHeight - viewportHeight) / 2),
    );
    const outsideSafeBand = visibleTop < state.stripOriginCssPx + margin
      || visibleTop + viewportHeight > state.stripEndCssPx - margin;
    const largeJump = state.valid
      && Math.abs(scrollTop - state.sampledScroll) > viewportHeight;
    const shouldRebase = force || dimensionsChanged || outsideSafeBand || largeJump;
    const originChanged = Math.abs(state.stripOriginCssPx - targetOrigin) > 0.5;

    state.valid = true;
    state.rebased = shouldRebase && (originChanged || dimensionsChanged || force);
    state.sampledScroll = scrollTop;
    state.visibleTopCssPx = visibleTop;
    state.worldWidth = worldWidth;
    state.worldHeight = worldHeight;
    state.viewportHeight = viewportHeight;
    if (shouldRebase) {
      state.stripOriginCssPx = targetOrigin;
      state.stripHeightCssPx = stripHeight;
      state.stripEndCssPx = targetOrigin + stripHeight;
      if (state.rebased) state.revision += 1;
    }
    return state;
  }

  function inspect() {
    return { ...state };
  }

  return { update, inspect };
}
