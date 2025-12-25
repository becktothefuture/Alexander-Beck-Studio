/*
 * 3D NOTEBOOK PAGE TRANSFORMS – User Specification v2.0
 * ====================================================
 *
 * Implements the exact 3D notebook specification:
 * - Pages flip over the top edge and land on a growing pile toward camera
 * - Depth model: Bottom unread Z=5px, each sheet adds 4px
 * - Flip sequence: Lift & hinge (0→50%), drop & settle (50→100%)
 * - All pages in single .page-stack container, no z-index usage
 * - Transform origin: 50% 0 0 (top edge hinge)
 * - Backface visible with grey ::after pseudo-element
 */

import { GLOBAL_CONFIG } from './config.js';
import { clamp } from './utils.js';
import { getPageLiftHeight } from './physics.js';

// User specification constants
const BOTTOM_UNREAD_Z = GLOBAL_CONFIG.DEPTH.bottomUnreadZ;
const SPACING_Z = GLOBAL_CONFIG.DEPTH.spacingZ;

// Derived lift height from paper weight (gsm) for realism
const LIFT_HEIGHT = getPageLiftHeight(
  GLOBAL_CONFIG.PHYSICAL.pageGSM,
  GLOBAL_CONFIG.PHYSICAL.baseLiftPx || 20
);
const DURATION = GLOBAL_CONFIG.ANIMATION.duration; // 600ms

// Track the next landing Z position for flipped pages
let nextLandingZ = 0;

/**
 * Initialize the depth system for a given number of pages
 * @param {number} totalPages - Total number of pages
 */
export function initializeDepthSystem(totalPages) {
  // Calculate initial nextLandingZ: current top unread depth + 4px
  // For 200 pages: bottom at 5px, top at 5 + (199 * 4) = 801px
  // So nextLandingZ = 801 + 4 = 805px
  const topUnreadZ = BOTTOM_UNREAD_Z + (totalPages - 1) * SPACING_Z;
  nextLandingZ = topUnreadZ + SPACING_Z;

  console.log(`🎯 Depth system initialized: ${totalPages} pages, nextLandingZ: ${nextLandingZ}px`);
}

/**
 * Get the resting Z depth for an unread page
 * @param {number} pageIndex - Page index (0-based)
 * @param {number} totalPages - Total number of pages
 * @returns {number} Z depth in pixels
 */
export function getUnreadDepth(pageIndex, totalPages) {
  // Bottom unread sheet: Z = 5px
  // Every unread sheet above it: Z = 5px + 4px × index
  const indexFromBottom = totalPages - 1 - pageIndex;
  return BOTTOM_UNREAD_Z + indexFromBottom * SPACING_Z;
}

/**
 * Get the next landing Z position for a flipped page
 * @returns {number} Z depth in pixels
 */
export function getNextLandingZ() {
  return nextLandingZ;
}

/**
 * Increment the landing Z for the next flip
 */
export function incrementLandingZ() {
  nextLandingZ += SPACING_Z;
}

/**
 * Get landing depth for a flipped page so the read stack grows toward camera.
 * Formula: bottomUnreadZ + (totalPages + pageIndex) * spacingZ
 *  - When pageIndex = 0 (first flipped) it lands exactly one spacing above
 *    the top unread page ( topUnreadZ + spacingZ )
 *  - Each subsequent page lands one spacing above the previous flipped page.
 * @param {number} pageIndex
 * @param {number} totalPages
 * @returns {number}
 */
function getLandingDepth(pageIndex, totalPages) {
  return BOTTOM_UNREAD_Z + pageIndex * SPACING_Z;
}

/**
 * Compute the 3D transform for a page during flip animation
 * Implements the exact user specification with Z-FIGHTING PREVENTION:
 * 1. Start: translateZ(Zrest) rotateX(0deg)
 * 2. Lift & hinge (0→50%): translateZ(Zrest + 35px) rotateX(-90deg) cubic-bezier(.55,.05,.67,.19)
 * 3. Drop & settle (50→100%): translateZ(nextLandingZ) rotateX(-180deg) cubic-bezier(.25,.46,.45,.94)
 *
 * @param {number} pageIndex - Page index
 * @param {number} scrollPosition - Current scroll position (can be fractional)
 * @param {number} totalPages - Total number of pages
 * @returns {Object} Transform and filter properties
 */
export function computeTransform(pageIndex, scrollPosition, totalPages) {
  const currentPageFloat = scrollPosition;
  const rel = currentPageFloat - pageIndex; // Relative position

  // Z-fighting prevention: add tiny micro-offset based on page index
  const microOffset = pageIndex * 0.001; // 0.001px per page index

  // Determine if this page is flipping
  if (rel >= 0 && rel <= 1) {
    // This page is currently flipping
    return computeFlipTransform(pageIndex, rel, totalPages, microOffset);
  } else if (rel < 0) {
    // Page hasn't been reached yet - unread stack
    const restingZ = getUnreadDepth(pageIndex, totalPages) + microOffset;
    return {
      transform: `translateZ(${restingZ}px) rotateX(0deg)`,
      filter: 'none',
    };
  } else {
    // Page has been flipped - read stack
    // Use deterministic landing depth so read stack grows cleanly
    const flippedZ = getLandingDepth(pageIndex, totalPages) + microOffset;
    return {
      transform: `translateZ(${flippedZ}px) rotateX(180deg)`,
      filter: 'none',
    };
  }
}

/**
 * Compute transform for a page that is currently flipping
 * @param {number} pageIndex - Page index
 * @param {number} progress - Flip progress (0-1)
 * @param {number} totalPages - Total number of pages
 * @param {number} microOffset - Micro-offset for Z-fighting prevention
 * @returns {Object} Transform and filter properties
 */
function computeFlipTransform(pageIndex, progress, totalPages, microOffset) {
  const restingZ = getUnreadDepth(pageIndex, totalPages) + microOffset;
  const targetZ = getLandingDepth(pageIndex, totalPages) + microOffset;

  // === Direct control – no easing or damping ===
  const rotX = 180 * progress;

  // Implement lift height: page lifts up during the flip, creating an arc
  // Maximum lift occurs at 50% progress, but use linear progress for smooth arc
  const liftAmount = Math.sin(progress * Math.PI) * LIFT_HEIGHT; // 0→30→0

  // Z position: interpolate from resting to target, plus lift
  const baseZ = restingZ + (targetZ - restingZ) * progress;
  const z = baseZ + liftAmount;

  // No blur effect – return none to improve clarity and performance
  return {
    transform: `translateZ(${z}px) rotateX(${rotX}deg)`,
    filter: 'none',
  };
}

/**
 * Create a CSS animation for a complete page flip
 * @param {HTMLElement} pageElement - The page element to animate
 * @param {number} pageIndex - Page index
 * @param {number} totalPages - Total number of pages
 * @returns {Animation} Web Animations API animation
 */
export function createFlipAnimation(pageElement, pageIndex, totalPages) {
  const restingZ = getUnreadDepth(pageIndex, totalPages);
  const targetZ = getLandingDepth(pageIndex, totalPages);
  const midZ = (restingZ + targetZ) / 2 + LIFT_HEIGHT; // Add lift height at midpoint

  const keyframes = [
    {
      offset: 0,
      transform: `translateZ(${restingZ}px) rotateX(0deg)`,
      filter: 'none',
    },
    {
      offset: 0.5,
      transform: `translateZ(${midZ}px) rotateX(90deg)`,
      filter: 'none',
    },
    {
      offset: 1,
      transform: `translateZ(${targetZ}px) rotateX(180deg)`,
      filter: 'none',
    },
  ];

  const animation = pageElement.animate(keyframes, {
    duration: DURATION,
    fill: 'forwards',
    easing: 'linear',
  });

  // No need to adjust global nextLandingZ – landing depth is deterministic

  return animation;
}

/**
 * Reset the depth system (useful for reinitializing)
 */
export function resetDepthSystem() {
  nextLandingZ = 0;
}

/**
 * Calculate the dynamic rings front base position above the highest possible page
 * Individual ring offsets are applied separately in the render system
 * @param {number} totalPages - Total number of pages
 * @returns {number} Base Z position for rings front in pixels
 */
export function calculateRingsFrontPosition(totalPages) {
  // Calculate the highest possible page position during animation
  // This occurs when the top page (index 0) is lifted during flip
  const topPageRestingZ = getUnreadDepth(0, totalPages);
  const highestPagePosition = topPageRestingZ + LIFT_HEIGHT;

  // Return base position - individual offsets applied in render system
  const ringsFrontBaseZ = highestPagePosition;

  console.log(
    `🔗 Rings front base position: ${ringsFrontBaseZ}px (topPage: ${topPageRestingZ}px + lift: ${LIFT_HEIGHT}px)`
  );

  return ringsFrontBaseZ;
}
