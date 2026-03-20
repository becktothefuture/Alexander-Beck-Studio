// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║  Home inner wall: small solid dot (66% on-screen ball). Else: 64px tap ring   ║
// ║  (portfolio/CV/chrome/modal) on body fixed — see docs/reference/CUSTOM-CURSOR  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { isOverlayActive } from '../ui/modal-overlay.js';
import { triggerCursorExplosion, updateMouseVelocity } from '../visual/cursor-explosion.js';
import { getMouseVelocity, getMouseDirection } from '../input/pointer.js';

let cursorElement = null;
let isInitialized = false;
/** Prevents duplicate `abs-link-hover` listeners across SPA re-bootstrap */
let linkHoverListening = false;
let isInSimulation = false;
let cachedContainerRect = null;
let rectCacheTime = 0;
const RECT_CACHE_MS = 100; // Cache rect for 100ms to avoid excessive layout reads
const TAP_RING_CSS_PX = 64;
const HOME_DOT_TO_BALL_DIAMETER = 0.66;
const TAP_CURSOR_Z_INDEX = 19990;
const MODAL_CURSOR_Z_INDEX = 20000;
let cachedFrameInsets = { top: 0, right: 0, bottom: 0, left: 0 };
let fadeInStarted = false;
let fadeInAnimation = null;
let wasOverLink = false; // Track previous hover state for transition detection
let lastClientX = 0;
let lastClientY = 0;
let lastHoveredLink = null;

function handleLinkHoverEvent(event) {
  try {
    lastHoveredLink = event?.detail?.element ?? null;
  } catch (e) {
    lastHoveredLink = null;
  }
}

function wireLinkHoverListener() {
  if (linkHoverListening) return;
  document.addEventListener('abs-link-hover', handleLinkHoverEvent);
  linkHoverListening = true;
}

function unwireLinkHoverListener() {
  if (!linkHoverListening) return;
  document.removeEventListener('abs-link-hover', handleLinkHoverEvent);
  linkHoverListening = false;
}

/**
 * SPA remounts can drop `#custom-cursor` from the tree while module flags stay true;
 * `setupCustomCursor()` would then no-op and pointer updates hit a detached node.
 */
function detachCustomCursorModuleState() {
  unwireLinkHoverListener();
  isInitialized = false;
  fadeInStarted = false;
  fadeInAnimation = null;
  cursorElement = null;
  cachedContainerRect = null;
  rectCacheTime = 0;
}

function ensureLiveCustomCursorElement() {
  if (cursorElement?.isConnected) return;
  if (cursorElement && !cursorElement.isConnected) {
    detachCustomCursorModuleState();
  }
  setupCustomCursor();
}

/**
 * Check if mouse is inside the frame interior (the actual simulation content area).
 * Uses #simulations bounds minus its border widths.
 * Uses cached bounding rect for performance
 * This keeps cursor behavior aligned with the simplified frame DOM.
 */
function isMouseInSimulation(clientX, clientY) {
  const container = document.getElementById('simulations');
  if (!container) return false;

  // Cache rect to avoid expensive layout reads on every mouse move
  const now = performance.now();
  if (!cachedContainerRect || (now - rectCacheTime) > RECT_CACHE_MS) {
    cachedContainerRect = container.getBoundingClientRect();
    const style = getComputedStyle(container);
    cachedFrameInsets = {
      top: Number.parseFloat(style.borderTopWidth) || 0,
      right: Number.parseFloat(style.borderRightWidth) || 0,
      bottom: Number.parseFloat(style.borderBottomWidth) || 0,
      left: Number.parseFloat(style.borderLeftWidth) || 0
    };
    rectCacheTime = now;
  }
  
  const rect = cachedContainerRect;
  const left = rect.left + cachedFrameInsets.left;
  const right = rect.right - cachedFrameInsets.right;
  const top = rect.top + cachedFrameInsets.top;
  const bottom = rect.bottom - cachedFrameInsets.bottom;
  return (
    clientX >= left &&
    clientX <= right &&
    clientY >= top &&
    clientY <= bottom
  );
}

function isHomeIndexRoute() {
  try {
    const b = document.body;
    return (
      !b.classList.contains('portfolio-page') &&
      !b.classList.contains('cv-page') &&
      !b.classList.contains('styleguide-page')
    );
  } catch (e) {
    return false;
  }
}

function getHomeCursorDotDiameterCssPx() {
  const globals = getGlobals();
  const canvas = globals.canvas;
  if (!canvas || !(canvas.width > 0)) return 18;
  let rect;
  try {
    rect = canvas.getBoundingClientRect();
  } catch (e) {
    return 18;
  }
  const rw = rect.width || 1;
  const avgR = (globals.R_MIN + globals.R_MAX) * 0.5;
  const ballDiameterCanvas = avgR * 2;
  const cssBallDiameter = ballDiameterCanvas * (rw / canvas.width);
  const dot = cssBallDiameter * HOME_DOT_TO_BALL_DIAMETER;
  return Math.max(8, Math.min(dot, 40));
}

/**
 * Get the current cursor color
 * Used for trail rendering
 * @returns {string} Cursor hex color
 */
export function getCursorColor() {
  const globals = getGlobals();
  return (globals?.cursorColorHex && typeof globals.cursorColorHex === 'string') 
    ? globals.cursorColorHex 
    : '#000000';
}

// Legacy export name for backward compatibility
export const getCursorBrightenedColor = getCursorColor;

/**
 * Initialize custom cursor element
 * Creates a circular cursor that follows the mouse
 */
export function setupCustomCursor() {
  const container = document.getElementById('simulations') || document.body;

  if (isInitialized && cursorElement && !cursorElement.isConnected) {
    detachCustomCursorModuleState();
  }

  if (isInitialized && cursorElement?.isConnected) {
    updateCursorSize();
    return;
  }

  const stray = document.getElementById('custom-cursor');
  if (stray?.isConnected) {
    cursorElement = stray;
    isInitialized = true;
    wireLinkHoverListener();
    updateCursorSize();
    stray.style.opacity = '1';
    fadeInStarted = false;
    fadeInAnimation = null;
    startCursorFadeIn();
    return;
  }

  cursorElement = document.createElement('div');
  cursorElement.id = 'custom-cursor';
  cursorElement.setAttribute('aria-hidden', 'true');

  // Insert cursor inside #simulations to be in same stacking context as canvas/wall
  container.appendChild(cursorElement);

  cursorElement.style.display = 'none';
  cursorElement.style.opacity = '1';

  isInitialized = true;
  wireLinkHoverListener();
  updateCursorSize();
  startCursorFadeIn();
}

/**
 * Stamp width/height for current route (home dot vs tap ring). Pointer move applies mount + classes.
 */
export function updateCursorSize() {
  if (!cursorElement) return;

  cursorElement.style.marginLeft = '0';
  cursorElement.style.marginTop = '0';
  cursorElement.style.borderRadius = '50%';

  if (isHomeIndexRoute()) {
    const d = getHomeCursorDotDiameterCssPx();
    cursorElement.style.width = `${d}px`;
    cursorElement.style.height = `${d}px`;
  } else {
    cursorElement.style.width = `${TAP_RING_CSS_PX}px`;
    cursorElement.style.height = `${TAP_RING_CSS_PX}px`;
  }

  if (!isInSimulation) {
    cursorElement.style.transform = ZERO_SCALE;
  }
}

const ZERO_SCALE = 'translate(-50%, -50%) scale(0)';
const FULL_SCALE = 'translate(-50%, -50%) scale(1)';

function applyTapRingMount(clientX, clientY, overlayIsActive) {
  if (cursorElement.parentElement !== document.body) {
    document.body.appendChild(cursorElement);
  }
  cursorElement.style.position = 'fixed';
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  cursorElement.style.zIndex = String(overlayIsActive ? MODAL_CURSOR_Z_INDEX : TAP_CURSOR_Z_INDEX);
  cursorElement.classList.add('abs-cursor-tap');
  cursorElement.style.width = `${TAP_RING_CSS_PX}px`;
  cursorElement.style.height = `${TAP_RING_CSS_PX}px`;
  cursorElement.style.boxSizing = 'border-box';
  cursorElement.style.transform = FULL_SCALE;
  cursorElement.style.opacity = '1';
  cursorElement.style.backgroundColor = '';
  cursorElement.style.border = '';
}

function applyHomeDotMount(clientX, clientY) {
  const container = document.getElementById('simulations');
  if (container && cursorElement.parentElement !== container) {
    container.appendChild(cursorElement);
  }
  cursorElement.style.position = 'absolute';
  cursorElement.style.zIndex = '3';
  if (container) {
    const rect = container.getBoundingClientRect();
    cursorElement.style.left = `${clientX - rect.left}px`;
    cursorElement.style.top = `${clientY - rect.top}px`;
  }
  cursorElement.classList.remove('abs-cursor-tap');
  cursorElement.classList.remove('modal-active');
  const d = getHomeCursorDotDiameterCssPx();
  cursorElement.style.width = `${d}px`;
  cursorElement.style.height = `${d}px`;
  cursorElement.style.boxSizing = 'border-box';
  cursorElement.style.transform = FULL_SCALE;
  cursorElement.style.opacity = '1';
  cursorElement.style.backgroundColor = '';
  cursorElement.style.border = 'none';
}

/**
 * Check if hovering over a link
 * @returns {boolean} True if body has abs-link-hovering class
 */
function isHoveringOverLink() {
  try {
    return Boolean(document?.body?.classList?.contains?.('abs-link-hovering'));
  } catch (e) {
    return false;
  }
}

/**
 * Check if cursor fade-in has completed
 * @returns {boolean} True if fade-in is complete or not started
 */
function isFadeInComplete() {
  if (!fadeInStarted) return false; // Fade-in hasn't started yet, don't allow opacity changes
  if (!fadeInAnimation) return true; // Animation not created (fallback path), allow opacity
  return fadeInAnimation.playState === 'finished';
}

/**
 * Update cursor position and state
 * Called from pointer.js on mouse move
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 */
/**
 * Get canvas position from client coordinates
 * Helper for explosion trigger (converts screen coords to canvas coords)
 * Matches pattern from pointer.js for consistency
 */
function getCanvasPosition(clientX, clientY) {
  const globals = getGlobals();
  const canvas = globals?.canvas;
  if (!canvas) return null;
  
  const rect = canvas.getBoundingClientRect();
  const rw = rect.width || 1;
  const rh = rect.height || 1;
  const sx = canvas.width / rw;
  const sy = canvas.height / rh;
  
  return {
    x: (clientX - rect.left) * sx,
    y: (clientY - rect.top) * sy,
    inBounds: clientX >= rect.left && clientX <= rect.right && 
              clientY >= rect.top && clientY <= rect.bottom
  };
}

function clampToCanvas(x, y, canvas) {
  return {
    x: Math.max(0, Math.min(canvas.width, x)),
    y: Math.max(0, Math.min(canvas.height, y))
  };
}

function getCanvasPointFromViewport(clientX, clientY) {
  const globals = getGlobals();
  const canvas = globals?.canvas;
  if (!canvas) return null;
  const canvasPos = getCanvasPosition(clientX, clientY);
  if (!canvasPos) return null;
  const clamped = canvasPos.inBounds ? canvasPos : clampToCanvas(canvasPos.x, canvasPos.y, canvas);
  return { x: clamped.x, y: clamped.y };
}

function getButtonEmissionPoints(element) {
  if (!element?.getBoundingClientRect) return null;
  const rect = element.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return null;

  const centerX = rect.left + rect.width * 0.5;
  const centerY = rect.top + rect.height * 0.5;
  const centerCanvas = getCanvasPointFromViewport(centerX, centerY);
  if (!centerCanvas) return null;

  const viewportPoints = [
    { x: rect.left, y: centerY },
    { x: rect.right, y: centerY },
    { x: centerX, y: rect.top },
    { x: centerX, y: rect.bottom }
  ];

  const points = viewportPoints
    .map((point) => getCanvasPointFromViewport(point.x, point.y))
    .filter(Boolean);

  if (!points.length) return null;

  return { center: centerCanvas, points };
}

export function updateCursorPosition(clientX, clientY) {
  ensureLiveCustomCursorElement();
  if (!cursorElement) return;

  lastClientX = clientX;
  lastClientY = clientY;
  
  const isOverLink = isHoveringOverLink();
  const isLinkTransition = isOverLink && !wasOverLink;

  if (isLinkTransition) {
    const globals = getGlobals();
    const canvas = globals?.canvas;
    const color = getCursorColor();
    const velocity = getMouseVelocity();
    const dir = getMouseDirection();
    
    const triggerExplosion = () => {
      if (!canvas) return;
      
      let emitted = false;
      
      if (lastHoveredLink) {
        const emission = getButtonEmissionPoints(lastHoveredLink);
        if (emission) {
          const particleScale = 1 / emission.points.length;
          emission.points.forEach((point) => {
            triggerCursorExplosion(point.x, point.y, color, velocity, {
              emissionCenter: emission.center,
              particleScale
            });
          });
          emitted = true;
        }
      }
      
      if (!emitted) {
        const canvasPos = getCanvasPosition(clientX, clientY);
        if (canvasPos) {
          const clamped = canvasPos.inBounds ? canvasPos : clampToCanvas(canvasPos.x, canvasPos.y, canvas);
          if (clamped.x >= 0 && clamped.y >= 0 && clamped.x <= canvas.width && clamped.y <= canvas.height) {
            triggerCursorExplosion(clamped.x, clamped.y, color, velocity);
          }
        }
      }
      
      if (dir && (dir.x !== 0 || dir.y !== 0)) {
        updateMouseVelocity(velocity, dir.x, dir.y);
      }
    };
    
    requestAnimationFrame(triggerExplosion);
  }

  wasOverLink = isOverLink;

  const wasInSimulation = isInSimulation;
  isInSimulation = isMouseInSimulation(clientX, clientY);
  const overlayIsActive = isOverlayActive();

  const homeDot =
    isHomeIndexRoute() && isInSimulation && !overlayIsActive;
  const tapRing =
    overlayIsActive || (!homeDot && isInSimulation);

  if (!overlayIsActive) {
    cursorElement.classList.remove('modal-active');
  }

  const showCustomCursor = overlayIsActive || homeDot || tapRing;
  if (showCustomCursor) {
    document.body.classList.add('abs-in-simulation');
  } else {
    document.body.classList.remove('abs-in-simulation');
  }

  // LINK HOVER: mount first so the implosion reads against the right surface
  if (isOverLink) {
    if (overlayIsActive || tapRing) {
      applyTapRingMount(clientX, clientY, overlayIsActive);
    } else if (homeDot) {
      applyHomeDotMount(clientX, clientY);
    } else {
      cursorElement.style.display = 'none';
      return;
    }
    cursorElement.style.display = 'block';
    cursorElement.style.transform = ZERO_SCALE;
    return;
  }

  if (!showCustomCursor) {
    cursorElement.style.display = 'none';
    if (wasInSimulation) {
      cursorElement.style.transform = ZERO_SCALE;
      cursorElement.style.backgroundColor = '';
      cursorElement.style.filter = '';
    }
    return;
  }

  if (overlayIsActive || tapRing) {
    applyTapRingMount(clientX, clientY, overlayIsActive);
  } else {
    applyHomeDotMount(clientX, clientY);
  }

  cursorElement.style.display = 'block';

  if (homeDot && !wasInSimulation) {
    cursorElement.style.transform = ZERO_SCALE;
    cursorElement.offsetHeight;
    requestAnimationFrame(() => {
      if (cursorElement) {
        cursorElement.style.transform = FULL_SCALE;
      }
    });
  }
}

/**
 * Hide cursor (when mouse leaves window)
 */
export function hideCursor() {
  if (!cursorElement) return;
  
  cursorElement.style.display = 'none';
  // Restore default cursor when mouse leaves window
  document.body.classList.remove('abs-in-simulation');
  isInSimulation = false;
}

/**
 * Show cursor (when mouse enters window)
 */
export function showCursor() {
  if (!cursorElement) return;
  // Will be shown/hidden by updateCursorPosition based on location
  isInSimulation = false;
}

/**
 * Start cursor fade-in animation
 * Cursor fades in slowly after page fade-in completes, ensuring alignment with trail
 */
function startCursorFadeIn() {
  if (fadeInStarted || !cursorElement) return;
  fadeInStarted = true;
  cursorElement.style.opacity = '1';
}
