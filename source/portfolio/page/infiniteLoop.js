/**
 * INFINITE LOOP SYSTEM
 *
 * This module handles the complex logic for creating seamless infinite page loops.
 * It manages virtual page positioning, scroll wrapping, and ensures smooth transitions
 * when cycling through the notebook pages.
 *
 * KEY CONCEPTS:
 * - Virtual Positioning: Pages can appear at multiple virtual positions simultaneously
 * - Modular Arithmetic: Uses remainder operations to cycle through pages infinitely
 * - Buffer System: Preloads pages in both directions for smooth transitions
 * - Seamless Wrapping: Ensures no visual gaps when looping from end to beginning
 */

import { PAGE_ANIMATION } from './config.js';

/**
 * Calculate the virtual page index for infinite looping
 * This allows pages to appear multiple times in the virtual stack
 *
 * @param {number} virtualIndex - Virtual position in the infinite stack
 * @param {number} totalPages - Total number of actual pages
 * @returns {number} Actual page index (0 to totalPages-1)
 */
export function getActualPageIndex(virtualIndex, totalPages) {
  // Use modulo to wrap the index within the page count
  // Handle negative indices properly
  return ((virtualIndex % totalPages) + totalPages) % totalPages;
}

/**
 * Calculate all virtual positions where a specific page should appear
 * This is used to render the same page at multiple positions for seamless looping
 *
 * @param {number} actualPageIndex - The actual page index (0 to totalPages-1)
 * @param {number} totalPages - Total number of actual pages
 * @param {number} scrollPosition - Current scroll position
 * @param {number} visibleRange - Range of visible positions to check
 * @returns {Array<number>} Array of virtual positions where this page should appear
 */
export function getVirtualPositionsForPage(
  actualPageIndex,
  totalPages,
  scrollPosition,
  visibleRange
) {
  const positions = [];
  const minPos = Math.floor(scrollPosition) - PAGE_ANIMATION.loop.buffer;
  const maxPos = Math.floor(scrollPosition) + visibleRange + PAGE_ANIMATION.loop.buffer;

  // Check all positions in the visible range plus buffer
  for (let virtualPos = minPos; virtualPos <= maxPos; virtualPos++) {
    if (getActualPageIndex(virtualPos, totalPages) === actualPageIndex) {
      positions.push(virtualPos);
    }
  }

  return positions;
}

/**
 * Get the optimal virtual position for a page given the current scroll state
 * This chooses the virtual position that's closest to being visible
 *
 * @param {number} actualPageIndex - The actual page index
 * @param {number} totalPages - Total number of actual pages
 * @param {number} scrollPosition - Current scroll position
 * @param {number} visibleRange - Range of visible positions
 * @returns {number} The best virtual position to use for this page
 */
export function getOptimalVirtualPosition(
  actualPageIndex,
  totalPages,
  scrollPosition,
  visibleRange
) {
  const positions = getVirtualPositionsForPage(
    actualPageIndex,
    totalPages,
    scrollPosition,
    visibleRange
  );

  if (positions.length === 0) {
    return actualPageIndex; // Fallback to actual index
  }

  if (positions.length === 1) {
    return positions[0];
  }

  // Find the position closest to the current scroll that's within visible range
  const targetRange = [scrollPosition - 1, scrollPosition + visibleRange + 1];

  let bestPosition = positions[0];
  let bestDistance = Infinity;

  for (const pos of positions) {
    // Calculate distance to the target range
    let distance;
    if (pos >= targetRange[0] && pos <= targetRange[1]) {
      distance = 0; // Already in range
    } else {
      distance = Math.min(Math.abs(pos - targetRange[0]), Math.abs(pos - targetRange[1]));
    }

    if (distance < bestDistance) {
      bestDistance = distance;
      bestPosition = pos;
    }
  }

  return bestPosition;
}

/**
 * Check if infinite looping is enabled and the page count supports it
 *
 * @param {number} totalPages - Total number of actual pages
 * @returns {boolean} Whether infinite looping should be active
 */
export function shouldUseInfiniteLoop(totalPages) {
  return PAGE_ANIMATION.loop.infinite && totalPages > PAGE_ANIMATION.stack.visibleDepth;
}

/**
 * Normalize scroll position for infinite looping
 * This handles the wrapping logic when scrolling beyond page boundaries
 *
 * @param {number} scroll - Raw scroll position
 * @param {number} totalPages - Total number of actual pages
 * @returns {number} Normalized scroll position
 */
export function normalizeScrollPosition(scroll, totalPages) {
  if (!shouldUseInfiniteLoop(totalPages)) {
    // Standard clamping for non-infinite mode
    return Math.max(0, Math.min(scroll, totalPages - 1));
  }

  // For infinite loop, we don't clamp but we do normalize for performance
  // Keep scroll within a reasonable range to prevent floating point issues
  const maxRange = totalPages * 100; // Allow 100 cycles before normalizing

  if (Math.abs(scroll) > maxRange) {
    // Normalize to equivalent position within reasonable range
    return ((scroll % totalPages) + totalPages) % totalPages;
  }

  return scroll;
}

/**
 * Calculate relative position for infinite looping
 * This is the core function that determines where each page should appear
 *
 * @param {number} actualPageIndex - The actual page index (0 to totalPages-1)
 * @param {number} totalPages - Total number of actual pages
 * @param {number} scrollPosition - Current scroll position
 * @returns {number} Relative position (similar to standard rel calculation)
 */
export function calculateInfiniteRelativePosition(actualPageIndex, totalPages, scrollPosition) {
  if (!shouldUseInfiniteLoop(totalPages)) {
    // Standard calculation for non-infinite mode
    return actualPageIndex - scrollPosition;
  }

  const optimalVirtualPos = getOptimalVirtualPosition(
    actualPageIndex,
    totalPages,
    scrollPosition,
    PAGE_ANIMATION.stack.visibleDepth
  );

  return optimalVirtualPos - scrollPosition;
}

/**
 * Get debug information about the infinite loop state
 *
 * @param {number} scrollPosition - Current scroll position
 * @param {number} totalPages - Total number of actual pages
 * @returns {Object} Debug information object
 */
export function getInfiniteLoopDebugInfo(scrollPosition, totalPages) {
  if (!shouldUseInfiniteLoop(totalPages)) {
    return {
      enabled: false,
      cycle: 0,
      cyclePosition: scrollPosition,
      totalCycles: 0,
    };
  }

  const cycle = Math.floor(scrollPosition / totalPages);
  const cyclePosition = scrollPosition % totalPages;

  return {
    enabled: true,
    cycle,
    cyclePosition: cyclePosition < 0 ? cyclePosition + totalPages : cyclePosition,
    totalCycles: Math.abs(cycle),
    actualScrollRange: [cycle * totalPages, (cycle + 1) * totalPages - 1],
  };
}
