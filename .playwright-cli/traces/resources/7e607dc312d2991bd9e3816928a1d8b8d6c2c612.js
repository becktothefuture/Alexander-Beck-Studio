// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║  In-window default: solid palette dot. Translucent lens only for drawer,       ║
// ║  modal, dev chrome, and action-hover focus states — see CUSTOM-CURSOR.         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from "/src/legacy/modules/core/state.js";
import { isOverlayActive } from "/src/legacy/modules/ui/modal-overlay.js";
import { triggerCursorExplosion, updateMouseVelocity } from "/src/legacy/modules/visual/cursor-explosion.js";
import { getMouseVelocity, getMouseDirection } from "/src/legacy/modules/input/pointer.js";

let cursorElement = null;
let isInitialized = false;
/** Prevents duplicate `abs-link-hover` listeners across SPA re-bootstrap */
let linkHoverListening = false;
/** Keeps the custom cursor available on React route runtimes that do not boot legacy pointer.js. */
let documentCursorTracking = false;
let isInSimulation = false;
let cachedContainerRect = null;
let rectCacheTime = 0;
const RECT_CACHE_MS = 100; // Cache rect for 100ms to avoid excessive layout reads
const TAP_RING_CSS_PX = 48;
const HOME_DOT_TO_BALL_DIAMETER = 0.88;
const HOME_DOT_FALLBACK_CSS_PX = 24;
const HOME_DOT_MIN_CSS_PX = 11;
const HOME_DOT_MAX_CSS_PX = 53;
const PORTFOLIO_DECK_CURSOR_Z_INDEX = 940;
const HOME_CURSOR_Z_INDEX = 19990;
const TAP_CURSOR_Z_INDEX = 19990;
const MODAL_CURSOR_Z_INDEX = 20000;
let fadeInStarted = false;
let fadeInAnimation = null;
let wasOverLink = false; // Track previous hover state for transition detection
let lastClientX = 0;
let lastClientY = 0;
let lastHoveredLink = null;
let hasLastPointerPosition = false;

function ensureCursorLabel() {
  if (!cursorElement) return null;
  let label = cursorElement.querySelector?.('.abs-cursor-label') ?? null;
  if (!label) {
    label = document.createElement('span');
    label.className = 'abs-cursor-label';
    label.setAttribute('aria-hidden', 'true');
    cursorElement.appendChild(label);
  }
  return label;
}

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

function handleDocumentCursorPointerMove(event) {
  if (event?.pointerType && event.pointerType !== 'mouse') {
    hideCursor();
    return;
  }
  updateCursorPosition(event.clientX, event.clientY);
}

function handleDocumentCursorMouseMove(event) {
  if (window.PointerEvent) return;
  updateCursorPosition(event.clientX, event.clientY);
}

function wireDocumentCursorTracking() {
  if (documentCursorTracking) return;
  document.addEventListener('pointermove', handleDocumentCursorPointerMove, { passive: true });
  document.addEventListener('mousemove', handleDocumentCursorMouseMove, { passive: true });
  document.addEventListener('mouseleave', hideCursor, { passive: true });
  documentCursorTracking = true;
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
 * Check if mouse is inside the visible studio window.
 * The native cursor returns outside this rectangle; the custom circle owns the
 * whole in-window surface, including route UI and modal controls.
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
    rectCacheTime = now;
  }
  
  const rect = cachedContainerRect;
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

function isPortfolioDetailViewOpen() {
  try {
    return Boolean(document?.body?.classList?.contains?.('portfolio-project-open'));
  } catch (e) {
    return false;
  }
}

function shouldElevatePortfolioDeckCursor() {
  try {
    return (
      document?.body?.classList?.contains?.('portfolio-page') &&
      !isPortfolioDetailViewOpen()
    );
  } catch (e) {
    return false;
  }
}

function shouldUseHomeDotCursor() {
  return !isPortfolioDetailViewOpen();
}

function isDevChromeCursorTarget(target) {
  if (!target || !target.closest) return false;
  return Boolean(target.closest('.panel-toggle-btn'));
}

function getHomeCursorDotDiameterCssPx() {
  const globals = getGlobals();
  const canvas = globals.canvas;
  if (!canvas || !(canvas.width > 0)) return HOME_DOT_FALLBACK_CSS_PX;
  let rect;
  try {
    rect = canvas.getBoundingClientRect();
  } catch (e) {
    return HOME_DOT_FALLBACK_CSS_PX;
  }
  const rw = rect.width || 1;
  const avgR = (globals.R_MIN + globals.R_MAX) * 0.5;
  const ballDiameterCanvas = avgR * 2;
  const cssBallDiameter = ballDiameterCanvas * (rw / canvas.width);
  const dot = cssBallDiameter * HOME_DOT_TO_BALL_DIAMETER;
  return Math.max(HOME_DOT_MIN_CSS_PX, Math.min(dot, HOME_DOT_MAX_CSS_PX));
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
    : "var(--color-detected-000000)";
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
    wireDocumentCursorTracking();
    updateCursorSize();
    return;
  }

  const stray = document.getElementById('custom-cursor');
  if (stray?.isConnected) {
    cursorElement = stray;
    isInitialized = true;
    ensureCursorLabel();
    wireLinkHoverListener();
    wireDocumentCursorTracking();
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
  ensureCursorLabel();

  // Insert cursor inside #simulations to be in same stacking context as canvas/wall
  container.appendChild(cursorElement);

  cursorElement.style.display = 'none';
  cursorElement.style.opacity = '1';

  isInitialized = true;
  wireLinkHoverListener();
  wireDocumentCursorTracking();
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

  if (shouldUseHomeDotCursor()) {
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
const FULL_SCALE = 'translate(-50%, -50%) scale(var(--abs-cursor-scale, 1))';

function applyTapRingMount(clientX, clientY, overlayIsActive, actionHover = false) {
  if (cursorElement.parentElement !== document.body) {
    document.body.appendChild(cursorElement);
  }
  cursorElement.style.position = 'fixed';
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  cursorElement.style.zIndex = String(overlayIsActive ? MODAL_CURSOR_Z_INDEX : TAP_CURSOR_Z_INDEX);
  cursorElement.classList.add('abs-cursor-tap');
  cursorElement.classList.toggle('abs-cursor-action-hover', Boolean(actionHover));
  cursorElement.style.width = `${TAP_RING_CSS_PX}px`;
  cursorElement.style.height = `${TAP_RING_CSS_PX}px`;
  cursorElement.style.boxSizing = 'border-box';
  cursorElement.style.transform = FULL_SCALE;
  cursorElement.style.opacity = '';
  cursorElement.style.backgroundColor = '';
  cursorElement.style.border = '';
  cursorElement.classList.remove('abs-cursor-project-hover');
  const label = ensureCursorLabel();
  if (label) label.textContent = '';
}

function applyHomeDotMount(clientX, clientY) {
  if (cursorElement.parentElement !== document.body) {
    document.body.appendChild(cursorElement);
  }
  cursorElement.style.position = 'fixed';
  cursorElement.style.zIndex = shouldElevatePortfolioDeckCursor()
    ? String(PORTFOLIO_DECK_CURSOR_Z_INDEX)
    : String(HOME_CURSOR_Z_INDEX);
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  cursorElement.classList.remove('abs-cursor-tap');
  cursorElement.classList.remove('abs-cursor-action-hover');
  cursorElement.classList.remove('modal-active');
  const d = getHomeCursorDotDiameterCssPx();
  cursorElement.style.width = `${d}px`;
  cursorElement.style.height = `${d}px`;
  cursorElement.style.boxSizing = 'border-box';
  cursorElement.style.transform = FULL_SCALE;
  cursorElement.style.opacity = '1';
  cursorElement.style.backgroundColor = '';
  cursorElement.style.border = 'none';
  cursorElement.classList.remove('abs-cursor-project-hover');
  const label = ensureCursorLabel();
  if (label) label.textContent = '';
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
  hasLastPointerPosition = true;
  
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
  const hoverTarget = document.elementFromPoint(clientX, clientY);
  const useDevChromeTapRing = !overlayIsActive && isDevChromeCursorTarget(hoverTarget);

  const shouldUseHomeDot = shouldUseHomeDotCursor();
  const lensForActionHover = isOverLink && shouldUseHomeDot && !overlayIsActive && !useDevChromeTapRing;
  const homeDot = shouldUseHomeDot && isInSimulation && !overlayIsActive && !useDevChromeTapRing && !lensForActionHover;
  const tapRing = isInSimulation && (overlayIsActive || useDevChromeTapRing || !shouldUseHomeDot || lensForActionHover);

  if (!overlayIsActive) {
    cursorElement.classList.remove('modal-active');
  }

  const showCustomCursor = homeDot || tapRing;
  if (showCustomCursor) {
    document.body.classList.add('abs-in-simulation');
  } else {
    document.body.classList.remove('abs-in-simulation');
  }

  // LINK HOVER: mount first so the implosion reads against the right surface
  if (isOverLink) {
    if (overlayIsActive || tapRing) {
      applyTapRingMount(clientX, clientY, overlayIsActive, true);
    } else if (homeDot) {
      applyHomeDotMount(clientX, clientY);
    } else {
      cursorElement.style.display = 'none';
      return;
    }
    cursorElement.style.display = 'block';
    cursorElement.style.transform = FULL_SCALE;
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
    applyTapRingMount(clientX, clientY, overlayIsActive, isOverLink);
  } else {
    applyHomeDotMount(clientX, clientY);
  }

  cursorElement.style.display = 'block';

  cursorElement.style.transform = FULL_SCALE;
}

export function refreshCursor() {
  if (!cursorElement || !hasLastPointerPosition) return;
  updateCursorPosition(lastClientX, lastClientY);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImN1cnNvci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZdcbi8vIOKVkSAgICAgICAgICAgICAgICAgICAgICAgICAgQ1VTVE9NIENVUlNPUiBSRU5ERVJFUiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOKVkVxuLy8g4pWRICBJbi13aW5kb3cgZGVmYXVsdDogc29saWQgcGFsZXR0ZSBkb3QuIFRyYW5zbHVjZW50IGxlbnMgb25seSBmb3IgZHJhd2VyLCAgICAgICDilZFcbi8vIOKVkSAgbW9kYWwsIGRldiBjaHJvbWUsIGFuZCBhY3Rpb24taG92ZXIgZm9jdXMgc3RhdGVzIOKAlCBzZWUgQ1VTVE9NLUNVUlNPUi4gICAgICAgICDilZFcbi8vIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnVxuXG5pbXBvcnQgeyBnZXRHbG9iYWxzIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgaXNPdmVybGF5QWN0aXZlIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdWkvbW9kYWwtb3ZlcmxheS5qc1wiO1xuaW1wb3J0IHsgdHJpZ2dlckN1cnNvckV4cGxvc2lvbiwgdXBkYXRlTW91c2VWZWxvY2l0eSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9jdXJzb3ItZXhwbG9zaW9uLmpzXCI7XG5pbXBvcnQgeyBnZXRNb3VzZVZlbG9jaXR5LCBnZXRNb3VzZURpcmVjdGlvbiB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL2lucHV0L3BvaW50ZXIuanNcIjtcblxubGV0IGN1cnNvckVsZW1lbnQgPSBudWxsO1xubGV0IGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbi8qKiBQcmV2ZW50cyBkdXBsaWNhdGUgYGFicy1saW5rLWhvdmVyYCBsaXN0ZW5lcnMgYWNyb3NzIFNQQSByZS1ib290c3RyYXAgKi9cbmxldCBsaW5rSG92ZXJMaXN0ZW5pbmcgPSBmYWxzZTtcbi8qKiBLZWVwcyB0aGUgY3VzdG9tIGN1cnNvciBhdmFpbGFibGUgb24gUmVhY3Qgcm91dGUgcnVudGltZXMgdGhhdCBkbyBub3QgYm9vdCBsZWdhY3kgcG9pbnRlci5qcy4gKi9cbmxldCBkb2N1bWVudEN1cnNvclRyYWNraW5nID0gZmFsc2U7XG5sZXQgaXNJblNpbXVsYXRpb24gPSBmYWxzZTtcbmxldCBjYWNoZWRDb250YWluZXJSZWN0ID0gbnVsbDtcbmxldCByZWN0Q2FjaGVUaW1lID0gMDtcbmNvbnN0IFJFQ1RfQ0FDSEVfTVMgPSAxMDA7IC8vIENhY2hlIHJlY3QgZm9yIDEwMG1zIHRvIGF2b2lkIGV4Y2Vzc2l2ZSBsYXlvdXQgcmVhZHNcbmNvbnN0IFRBUF9SSU5HX0NTU19QWCA9IDQ4O1xuY29uc3QgSE9NRV9ET1RfVE9fQkFMTF9ESUFNRVRFUiA9IDAuODg7XG5jb25zdCBIT01FX0RPVF9GQUxMQkFDS19DU1NfUFggPSAyNDtcbmNvbnN0IEhPTUVfRE9UX01JTl9DU1NfUFggPSAxMTtcbmNvbnN0IEhPTUVfRE9UX01BWF9DU1NfUFggPSA1MztcbmNvbnN0IFBPUlRGT0xJT19ERUNLX0NVUlNPUl9aX0lOREVYID0gOTQwO1xuY29uc3QgSE9NRV9DVVJTT1JfWl9JTkRFWCA9IDE5OTkwO1xuY29uc3QgVEFQX0NVUlNPUl9aX0lOREVYID0gMTk5OTA7XG5jb25zdCBNT0RBTF9DVVJTT1JfWl9JTkRFWCA9IDIwMDAwO1xubGV0IGZhZGVJblN0YXJ0ZWQgPSBmYWxzZTtcbmxldCBmYWRlSW5BbmltYXRpb24gPSBudWxsO1xubGV0IHdhc092ZXJMaW5rID0gZmFsc2U7IC8vIFRyYWNrIHByZXZpb3VzIGhvdmVyIHN0YXRlIGZvciB0cmFuc2l0aW9uIGRldGVjdGlvblxubGV0IGxhc3RDbGllbnRYID0gMDtcbmxldCBsYXN0Q2xpZW50WSA9IDA7XG5sZXQgbGFzdEhvdmVyZWRMaW5rID0gbnVsbDtcbmxldCBoYXNMYXN0UG9pbnRlclBvc2l0aW9uID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGVuc3VyZUN1cnNvckxhYmVsKCkge1xuICBpZiAoIWN1cnNvckVsZW1lbnQpIHJldHVybiBudWxsO1xuICBsZXQgbGFiZWwgPSBjdXJzb3JFbGVtZW50LnF1ZXJ5U2VsZWN0b3I/LignLmFicy1jdXJzb3ItbGFiZWwnKSA/PyBudWxsO1xuICBpZiAoIWxhYmVsKSB7XG4gICAgbGFiZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgbGFiZWwuY2xhc3NOYW1lID0gJ2Ficy1jdXJzb3ItbGFiZWwnO1xuICAgIGxhYmVsLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIGN1cnNvckVsZW1lbnQuYXBwZW5kQ2hpbGQobGFiZWwpO1xuICB9XG4gIHJldHVybiBsYWJlbDtcbn1cblxuZnVuY3Rpb24gaGFuZGxlTGlua0hvdmVyRXZlbnQoZXZlbnQpIHtcbiAgdHJ5IHtcbiAgICBsYXN0SG92ZXJlZExpbmsgPSBldmVudD8uZGV0YWlsPy5lbGVtZW50ID8/IG51bGw7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBsYXN0SG92ZXJlZExpbmsgPSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHdpcmVMaW5rSG92ZXJMaXN0ZW5lcigpIHtcbiAgaWYgKGxpbmtIb3Zlckxpc3RlbmluZykgcmV0dXJuO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdhYnMtbGluay1ob3ZlcicsIGhhbmRsZUxpbmtIb3ZlckV2ZW50KTtcbiAgbGlua0hvdmVyTGlzdGVuaW5nID0gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gdW53aXJlTGlua0hvdmVyTGlzdGVuZXIoKSB7XG4gIGlmICghbGlua0hvdmVyTGlzdGVuaW5nKSByZXR1cm47XG4gIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ficy1saW5rLWhvdmVyJywgaGFuZGxlTGlua0hvdmVyRXZlbnQpO1xuICBsaW5rSG92ZXJMaXN0ZW5pbmcgPSBmYWxzZTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRG9jdW1lbnRDdXJzb3JQb2ludGVyTW92ZShldmVudCkge1xuICBpZiAoZXZlbnQ/LnBvaW50ZXJUeXBlICYmIGV2ZW50LnBvaW50ZXJUeXBlICE9PSAnbW91c2UnKSB7XG4gICAgaGlkZUN1cnNvcigpO1xuICAgIHJldHVybjtcbiAgfVxuICB1cGRhdGVDdXJzb3JQb3NpdGlvbihldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZKTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlRG9jdW1lbnRDdXJzb3JNb3VzZU1vdmUoZXZlbnQpIHtcbiAgaWYgKHdpbmRvdy5Qb2ludGVyRXZlbnQpIHJldHVybjtcbiAgdXBkYXRlQ3Vyc29yUG9zaXRpb24oZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSk7XG59XG5cbmZ1bmN0aW9uIHdpcmVEb2N1bWVudEN1cnNvclRyYWNraW5nKCkge1xuICBpZiAoZG9jdW1lbnRDdXJzb3JUcmFja2luZykgcmV0dXJuO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIGhhbmRsZURvY3VtZW50Q3Vyc29yUG9pbnRlck1vdmUsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgaGFuZGxlRG9jdW1lbnRDdXJzb3JNb3VzZU1vdmUsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsIGhpZGVDdXJzb3IsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnRDdXJzb3JUcmFja2luZyA9IHRydWU7XG59XG5cbi8qKlxuICogU1BBIHJlbW91bnRzIGNhbiBkcm9wIGAjY3VzdG9tLWN1cnNvcmAgZnJvbSB0aGUgdHJlZSB3aGlsZSBtb2R1bGUgZmxhZ3Mgc3RheSB0cnVlO1xuICogYHNldHVwQ3VzdG9tQ3Vyc29yKClgIHdvdWxkIHRoZW4gbm8tb3AgYW5kIHBvaW50ZXIgdXBkYXRlcyBoaXQgYSBkZXRhY2hlZCBub2RlLlxuICovXG5mdW5jdGlvbiBkZXRhY2hDdXN0b21DdXJzb3JNb2R1bGVTdGF0ZSgpIHtcbiAgdW53aXJlTGlua0hvdmVyTGlzdGVuZXIoKTtcbiAgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuICBmYWRlSW5TdGFydGVkID0gZmFsc2U7XG4gIGZhZGVJbkFuaW1hdGlvbiA9IG51bGw7XG4gIGN1cnNvckVsZW1lbnQgPSBudWxsO1xuICBjYWNoZWRDb250YWluZXJSZWN0ID0gbnVsbDtcbiAgcmVjdENhY2hlVGltZSA9IDA7XG59XG5cbmZ1bmN0aW9uIGVuc3VyZUxpdmVDdXN0b21DdXJzb3JFbGVtZW50KCkge1xuICBpZiAoY3Vyc29yRWxlbWVudD8uaXNDb25uZWN0ZWQpIHJldHVybjtcbiAgaWYgKGN1cnNvckVsZW1lbnQgJiYgIWN1cnNvckVsZW1lbnQuaXNDb25uZWN0ZWQpIHtcbiAgICBkZXRhY2hDdXN0b21DdXJzb3JNb2R1bGVTdGF0ZSgpO1xuICB9XG4gIHNldHVwQ3VzdG9tQ3Vyc29yKCk7XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgbW91c2UgaXMgaW5zaWRlIHRoZSB2aXNpYmxlIHN0dWRpbyB3aW5kb3cuXG4gKiBUaGUgbmF0aXZlIGN1cnNvciByZXR1cm5zIG91dHNpZGUgdGhpcyByZWN0YW5nbGU7IHRoZSBjdXN0b20gY2lyY2xlIG93bnMgdGhlXG4gKiB3aG9sZSBpbi13aW5kb3cgc3VyZmFjZSwgaW5jbHVkaW5nIHJvdXRlIFVJIGFuZCBtb2RhbCBjb250cm9scy5cbiAqIFVzZXMgY2FjaGVkIGJvdW5kaW5nIHJlY3QgZm9yIHBlcmZvcm1hbmNlXG4gKiBUaGlzIGtlZXBzIGN1cnNvciBiZWhhdmlvciBhbGlnbmVkIHdpdGggdGhlIHNpbXBsaWZpZWQgZnJhbWUgRE9NLlxuICovXG5mdW5jdGlvbiBpc01vdXNlSW5TaW11bGF0aW9uKGNsaWVudFgsIGNsaWVudFkpIHtcbiAgY29uc3QgY29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbXVsYXRpb25zJyk7XG4gIGlmICghY29udGFpbmVyKSByZXR1cm4gZmFsc2U7XG5cbiAgLy8gQ2FjaGUgcmVjdCB0byBhdm9pZCBleHBlbnNpdmUgbGF5b3V0IHJlYWRzIG9uIGV2ZXJ5IG1vdXNlIG1vdmVcbiAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGlmICghY2FjaGVkQ29udGFpbmVyUmVjdCB8fCAobm93IC0gcmVjdENhY2hlVGltZSkgPiBSRUNUX0NBQ0hFX01TKSB7XG4gICAgY2FjaGVkQ29udGFpbmVyUmVjdCA9IGNvbnRhaW5lci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICByZWN0Q2FjaGVUaW1lID0gbm93O1xuICB9XG4gIFxuICBjb25zdCByZWN0ID0gY2FjaGVkQ29udGFpbmVyUmVjdDtcbiAgcmV0dXJuIChcbiAgICBjbGllbnRYID49IHJlY3QubGVmdCAmJlxuICAgIGNsaWVudFggPD0gcmVjdC5yaWdodCAmJlxuICAgIGNsaWVudFkgPj0gcmVjdC50b3AgJiZcbiAgICBjbGllbnRZIDw9IHJlY3QuYm90dG9tXG4gICk7XG59XG5cbmZ1bmN0aW9uIGlzUG9ydGZvbGlvRGV0YWlsVmlld09wZW4oKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZG9jdW1lbnQ/LmJvZHk/LmNsYXNzTGlzdD8uY29udGFpbnM/LigncG9ydGZvbGlvLXByb2plY3Qtb3BlbicpKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzaG91bGRFbGV2YXRlUG9ydGZvbGlvRGVja0N1cnNvcigpIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gKFxuICAgICAgZG9jdW1lbnQ/LmJvZHk/LmNsYXNzTGlzdD8uY29udGFpbnM/LigncG9ydGZvbGlvLXBhZ2UnKSAmJlxuICAgICAgIWlzUG9ydGZvbGlvRGV0YWlsVmlld09wZW4oKVxuICAgICk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gc2hvdWxkVXNlSG9tZURvdEN1cnNvcigpIHtcbiAgcmV0dXJuICFpc1BvcnRmb2xpb0RldGFpbFZpZXdPcGVuKCk7XG59XG5cbmZ1bmN0aW9uIGlzRGV2Q2hyb21lQ3Vyc29yVGFyZ2V0KHRhcmdldCkge1xuICBpZiAoIXRhcmdldCB8fCAhdGFyZ2V0LmNsb3Nlc3QpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuIEJvb2xlYW4odGFyZ2V0LmNsb3Nlc3QoJy5wYW5lbC10b2dnbGUtYnRuJykpO1xufVxuXG5mdW5jdGlvbiBnZXRIb21lQ3Vyc29yRG90RGlhbWV0ZXJDc3NQeCgpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgY2FudmFzID0gZ2xvYmFscy5jYW52YXM7XG4gIGlmICghY2FudmFzIHx8ICEoY2FudmFzLndpZHRoID4gMCkpIHJldHVybiBIT01FX0RPVF9GQUxMQkFDS19DU1NfUFg7XG4gIGxldCByZWN0O1xuICB0cnkge1xuICAgIHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gSE9NRV9ET1RfRkFMTEJBQ0tfQ1NTX1BYO1xuICB9XG4gIGNvbnN0IHJ3ID0gcmVjdC53aWR0aCB8fCAxO1xuICBjb25zdCBhdmdSID0gKGdsb2JhbHMuUl9NSU4gKyBnbG9iYWxzLlJfTUFYKSAqIDAuNTtcbiAgY29uc3QgYmFsbERpYW1ldGVyQ2FudmFzID0gYXZnUiAqIDI7XG4gIGNvbnN0IGNzc0JhbGxEaWFtZXRlciA9IGJhbGxEaWFtZXRlckNhbnZhcyAqIChydyAvIGNhbnZhcy53aWR0aCk7XG4gIGNvbnN0IGRvdCA9IGNzc0JhbGxEaWFtZXRlciAqIEhPTUVfRE9UX1RPX0JBTExfRElBTUVURVI7XG4gIHJldHVybiBNYXRoLm1heChIT01FX0RPVF9NSU5fQ1NTX1BYLCBNYXRoLm1pbihkb3QsIEhPTUVfRE9UX01BWF9DU1NfUFgpKTtcbn1cblxuLyoqXG4gKiBHZXQgdGhlIGN1cnJlbnQgY3Vyc29yIGNvbG9yXG4gKiBVc2VkIGZvciB0cmFpbCByZW5kZXJpbmdcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnNvciBoZXggY29sb3JcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnNvckNvbG9yKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICByZXR1cm4gKGdsb2JhbHM/LmN1cnNvckNvbG9ySGV4ICYmIHR5cGVvZiBnbG9iYWxzLmN1cnNvckNvbG9ySGV4ID09PSAnc3RyaW5nJykgXG4gICAgPyBnbG9iYWxzLmN1cnNvckNvbG9ySGV4IFxuICAgIDogXCJ2YXIoLS1jb2xvci1kZXRlY3RlZC0wMDAwMDApXCI7XG59XG5cbi8vIExlZ2FjeSBleHBvcnQgbmFtZSBmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eVxuZXhwb3J0IGNvbnN0IGdldEN1cnNvckJyaWdodGVuZWRDb2xvciA9IGdldEN1cnNvckNvbG9yO1xuXG4vKipcbiAqIEluaXRpYWxpemUgY3VzdG9tIGN1cnNvciBlbGVtZW50XG4gKiBDcmVhdGVzIGEgY2lyY3VsYXIgY3Vyc29yIHRoYXQgZm9sbG93cyB0aGUgbW91c2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwQ3VzdG9tQ3Vyc29yKCkge1xuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2ltdWxhdGlvbnMnKSB8fCBkb2N1bWVudC5ib2R5O1xuXG4gIGlmIChpc0luaXRpYWxpemVkICYmIGN1cnNvckVsZW1lbnQgJiYgIWN1cnNvckVsZW1lbnQuaXNDb25uZWN0ZWQpIHtcbiAgICBkZXRhY2hDdXN0b21DdXJzb3JNb2R1bGVTdGF0ZSgpO1xuICB9XG5cbiAgaWYgKGlzSW5pdGlhbGl6ZWQgJiYgY3Vyc29yRWxlbWVudD8uaXNDb25uZWN0ZWQpIHtcbiAgICB3aXJlRG9jdW1lbnRDdXJzb3JUcmFja2luZygpO1xuICAgIHVwZGF0ZUN1cnNvclNpemUoKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCBzdHJheSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXN0b20tY3Vyc29yJyk7XG4gIGlmIChzdHJheT8uaXNDb25uZWN0ZWQpIHtcbiAgICBjdXJzb3JFbGVtZW50ID0gc3RyYXk7XG4gICAgaXNJbml0aWFsaXplZCA9IHRydWU7XG4gICAgZW5zdXJlQ3Vyc29yTGFiZWwoKTtcbiAgICB3aXJlTGlua0hvdmVyTGlzdGVuZXIoKTtcbiAgICB3aXJlRG9jdW1lbnRDdXJzb3JUcmFja2luZygpO1xuICAgIHVwZGF0ZUN1cnNvclNpemUoKTtcbiAgICBzdHJheS5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuICAgIGZhZGVJblN0YXJ0ZWQgPSBmYWxzZTtcbiAgICBmYWRlSW5BbmltYXRpb24gPSBudWxsO1xuICAgIHN0YXJ0Q3Vyc29yRmFkZUluKCk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY3Vyc29yRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICBjdXJzb3JFbGVtZW50LmlkID0gJ2N1c3RvbS1jdXJzb3InO1xuICBjdXJzb3JFbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICBlbnN1cmVDdXJzb3JMYWJlbCgpO1xuXG4gIC8vIEluc2VydCBjdXJzb3IgaW5zaWRlICNzaW11bGF0aW9ucyB0byBiZSBpbiBzYW1lIHN0YWNraW5nIGNvbnRleHQgYXMgY2FudmFzL3dhbGxcbiAgY29udGFpbmVyLmFwcGVuZENoaWxkKGN1cnNvckVsZW1lbnQpO1xuXG4gIGN1cnNvckVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gJzEnO1xuXG4gIGlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICB3aXJlTGlua0hvdmVyTGlzdGVuZXIoKTtcbiAgd2lyZURvY3VtZW50Q3Vyc29yVHJhY2tpbmcoKTtcbiAgdXBkYXRlQ3Vyc29yU2l6ZSgpO1xuICBzdGFydEN1cnNvckZhZGVJbigpO1xufVxuXG4vKipcbiAqIFN0YW1wIHdpZHRoL2hlaWdodCBmb3IgY3VycmVudCByb3V0ZSAoaG9tZSBkb3QgdnMgdGFwIHJpbmcpLiBQb2ludGVyIG1vdmUgYXBwbGllcyBtb3VudCArIGNsYXNzZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVDdXJzb3JTaXplKCkge1xuICBpZiAoIWN1cnNvckVsZW1lbnQpIHJldHVybjtcblxuICBjdXJzb3JFbGVtZW50LnN0eWxlLm1hcmdpbkxlZnQgPSAnMCc7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUubWFyZ2luVG9wID0gJzAnO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLmJvcmRlclJhZGl1cyA9ICc1MCUnO1xuXG4gIGlmIChzaG91bGRVc2VIb21lRG90Q3Vyc29yKCkpIHtcbiAgICBjb25zdCBkID0gZ2V0SG9tZUN1cnNvckRvdERpYW1ldGVyQ3NzUHgoKTtcbiAgICBjdXJzb3JFbGVtZW50LnN0eWxlLndpZHRoID0gYCR7ZH1weGA7XG4gICAgY3Vyc29yRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBgJHtkfXB4YDtcbiAgfSBlbHNlIHtcbiAgICBjdXJzb3JFbGVtZW50LnN0eWxlLndpZHRoID0gYCR7VEFQX1JJTkdfQ1NTX1BYfXB4YDtcbiAgICBjdXJzb3JFbGVtZW50LnN0eWxlLmhlaWdodCA9IGAke1RBUF9SSU5HX0NTU19QWH1weGA7XG4gIH1cblxuICBpZiAoIWlzSW5TaW11bGF0aW9uKSB7XG4gICAgY3Vyc29yRWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSBaRVJPX1NDQUxFO1xuICB9XG59XG5cbmNvbnN0IFpFUk9fU0NBTEUgPSAndHJhbnNsYXRlKC01MCUsIC01MCUpIHNjYWxlKDApJztcbmNvbnN0IEZVTExfU0NBTEUgPSAndHJhbnNsYXRlKC01MCUsIC01MCUpIHNjYWxlKHZhcigtLWFicy1jdXJzb3Itc2NhbGUsIDEpKSc7XG5cbmZ1bmN0aW9uIGFwcGx5VGFwUmluZ01vdW50KGNsaWVudFgsIGNsaWVudFksIG92ZXJsYXlJc0FjdGl2ZSwgYWN0aW9uSG92ZXIgPSBmYWxzZSkge1xuICBpZiAoY3Vyc29yRWxlbWVudC5wYXJlbnRFbGVtZW50ICE9PSBkb2N1bWVudC5ib2R5KSB7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjdXJzb3JFbGVtZW50KTtcbiAgfVxuICBjdXJzb3JFbGVtZW50LnN0eWxlLnBvc2l0aW9uID0gJ2ZpeGVkJztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5sZWZ0ID0gYCR7Y2xpZW50WH1weGA7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUudG9wID0gYCR7Y2xpZW50WX1weGA7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUuekluZGV4ID0gU3RyaW5nKG92ZXJsYXlJc0FjdGl2ZSA/IE1PREFMX0NVUlNPUl9aX0lOREVYIDogVEFQX0NVUlNPUl9aX0lOREVYKTtcbiAgY3Vyc29yRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdhYnMtY3Vyc29yLXRhcCcpO1xuICBjdXJzb3JFbGVtZW50LmNsYXNzTGlzdC50b2dnbGUoJ2Ficy1jdXJzb3ItYWN0aW9uLWhvdmVyJywgQm9vbGVhbihhY3Rpb25Ib3ZlcikpO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLndpZHRoID0gYCR7VEFQX1JJTkdfQ1NTX1BYfXB4YDtcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5oZWlnaHQgPSBgJHtUQVBfUklOR19DU1NfUFh9cHhgO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLmJveFNpemluZyA9ICdib3JkZXItYm94JztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSBGVUxMX1NDQUxFO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLm9wYWNpdHkgPSAnJztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5ib3JkZXIgPSAnJztcbiAgY3Vyc29yRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdhYnMtY3Vyc29yLXByb2plY3QtaG92ZXInKTtcbiAgY29uc3QgbGFiZWwgPSBlbnN1cmVDdXJzb3JMYWJlbCgpO1xuICBpZiAobGFiZWwpIGxhYmVsLnRleHRDb250ZW50ID0gJyc7XG59XG5cbmZ1bmN0aW9uIGFwcGx5SG9tZURvdE1vdW50KGNsaWVudFgsIGNsaWVudFkpIHtcbiAgaWYgKGN1cnNvckVsZW1lbnQucGFyZW50RWxlbWVudCAhPT0gZG9jdW1lbnQuYm9keSkge1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY3Vyc29yRWxlbWVudCk7XG4gIH1cbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUuekluZGV4ID0gc2hvdWxkRWxldmF0ZVBvcnRmb2xpb0RlY2tDdXJzb3IoKVxuICAgID8gU3RyaW5nKFBPUlRGT0xJT19ERUNLX0NVUlNPUl9aX0lOREVYKVxuICAgIDogU3RyaW5nKEhPTUVfQ1VSU09SX1pfSU5ERVgpO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLmxlZnQgPSBgJHtjbGllbnRYfXB4YDtcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS50b3AgPSBgJHtjbGllbnRZfXB4YDtcbiAgY3Vyc29yRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdhYnMtY3Vyc29yLXRhcCcpO1xuICBjdXJzb3JFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2Ficy1jdXJzb3ItYWN0aW9uLWhvdmVyJyk7XG4gIGN1cnNvckVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnbW9kYWwtYWN0aXZlJyk7XG4gIGNvbnN0IGQgPSBnZXRIb21lQ3Vyc29yRG90RGlhbWV0ZXJDc3NQeCgpO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLndpZHRoID0gYCR7ZH1weGA7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUuaGVpZ2h0ID0gYCR7ZH1weGA7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUuYm94U2l6aW5nID0gJ2JvcmRlci1ib3gnO1xuICBjdXJzb3JFbGVtZW50LnN0eWxlLnRyYW5zZm9ybSA9IEZVTExfU0NBTEU7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcxJztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSAnJztcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5ib3JkZXIgPSAnbm9uZSc7XG4gIGN1cnNvckVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnYWJzLWN1cnNvci1wcm9qZWN0LWhvdmVyJyk7XG4gIGNvbnN0IGxhYmVsID0gZW5zdXJlQ3Vyc29yTGFiZWwoKTtcbiAgaWYgKGxhYmVsKSBsYWJlbC50ZXh0Q29udGVudCA9ICcnO1xufVxuXG4vKipcbiAqIENoZWNrIGlmIGhvdmVyaW5nIG92ZXIgYSBsaW5rXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBib2R5IGhhcyBhYnMtbGluay1ob3ZlcmluZyBjbGFzc1xuICovXG5mdW5jdGlvbiBpc0hvdmVyaW5nT3ZlckxpbmsoKSB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIEJvb2xlYW4oZG9jdW1lbnQ/LmJvZHk/LmNsYXNzTGlzdD8uY29udGFpbnM/LignYWJzLWxpbmstaG92ZXJpbmcnKSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuLyoqXG4gKiBDaGVjayBpZiBjdXJzb3IgZmFkZS1pbiBoYXMgY29tcGxldGVkXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBmYWRlLWluIGlzIGNvbXBsZXRlIG9yIG5vdCBzdGFydGVkXG4gKi9cbmZ1bmN0aW9uIGlzRmFkZUluQ29tcGxldGUoKSB7XG4gIGlmICghZmFkZUluU3RhcnRlZCkgcmV0dXJuIGZhbHNlOyAvLyBGYWRlLWluIGhhc24ndCBzdGFydGVkIHlldCwgZG9uJ3QgYWxsb3cgb3BhY2l0eSBjaGFuZ2VzXG4gIGlmICghZmFkZUluQW5pbWF0aW9uKSByZXR1cm4gdHJ1ZTsgLy8gQW5pbWF0aW9uIG5vdCBjcmVhdGVkIChmYWxsYmFjayBwYXRoKSwgYWxsb3cgb3BhY2l0eVxuICByZXR1cm4gZmFkZUluQW5pbWF0aW9uLnBsYXlTdGF0ZSA9PT0gJ2ZpbmlzaGVkJztcbn1cblxuLyoqXG4gKiBVcGRhdGUgY3Vyc29yIHBvc2l0aW9uIGFuZCBzdGF0ZVxuICogQ2FsbGVkIGZyb20gcG9pbnRlci5qcyBvbiBtb3VzZSBtb3ZlXG4gKiBAcGFyYW0ge251bWJlcn0gY2xpZW50WCAtIE1vdXNlIFggcG9zaXRpb25cbiAqIEBwYXJhbSB7bnVtYmVyfSBjbGllbnRZIC0gTW91c2UgWSBwb3NpdGlvblxuICovXG4vKipcbiAqIEdldCBjYW52YXMgcG9zaXRpb24gZnJvbSBjbGllbnQgY29vcmRpbmF0ZXNcbiAqIEhlbHBlciBmb3IgZXhwbG9zaW9uIHRyaWdnZXIgKGNvbnZlcnRzIHNjcmVlbiBjb29yZHMgdG8gY2FudmFzIGNvb3JkcylcbiAqIE1hdGNoZXMgcGF0dGVybiBmcm9tIHBvaW50ZXIuanMgZm9yIGNvbnNpc3RlbmN5XG4gKi9cbmZ1bmN0aW9uIGdldENhbnZhc1Bvc2l0aW9uKGNsaWVudFgsIGNsaWVudFkpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgY2FudmFzID0gZ2xvYmFscz8uY2FudmFzO1xuICBpZiAoIWNhbnZhcykgcmV0dXJuIG51bGw7XG4gIFxuICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBjb25zdCBydyA9IHJlY3Qud2lkdGggfHwgMTtcbiAgY29uc3QgcmggPSByZWN0LmhlaWdodCB8fCAxO1xuICBjb25zdCBzeCA9IGNhbnZhcy53aWR0aCAvIHJ3O1xuICBjb25zdCBzeSA9IGNhbnZhcy5oZWlnaHQgLyByaDtcbiAgXG4gIHJldHVybiB7XG4gICAgeDogKGNsaWVudFggLSByZWN0LmxlZnQpICogc3gsXG4gICAgeTogKGNsaWVudFkgLSByZWN0LnRvcCkgKiBzeSxcbiAgICBpbkJvdW5kczogY2xpZW50WCA+PSByZWN0LmxlZnQgJiYgY2xpZW50WCA8PSByZWN0LnJpZ2h0ICYmIFxuICAgICAgICAgICAgICBjbGllbnRZID49IHJlY3QudG9wICYmIGNsaWVudFkgPD0gcmVjdC5ib3R0b21cbiAgfTtcbn1cblxuZnVuY3Rpb24gY2xhbXBUb0NhbnZhcyh4LCB5LCBjYW52YXMpIHtcbiAgcmV0dXJuIHtcbiAgICB4OiBNYXRoLm1heCgwLCBNYXRoLm1pbihjYW52YXMud2lkdGgsIHgpKSxcbiAgICB5OiBNYXRoLm1heCgwLCBNYXRoLm1pbihjYW52YXMuaGVpZ2h0LCB5KSlcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Q2FudmFzUG9pbnRGcm9tVmlld3BvcnQoY2xpZW50WCwgY2xpZW50WSkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjYW52YXMgPSBnbG9iYWxzPy5jYW52YXM7XG4gIGlmICghY2FudmFzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY2FudmFzUG9zID0gZ2V0Q2FudmFzUG9zaXRpb24oY2xpZW50WCwgY2xpZW50WSk7XG4gIGlmICghY2FudmFzUG9zKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY2xhbXBlZCA9IGNhbnZhc1Bvcy5pbkJvdW5kcyA/IGNhbnZhc1BvcyA6IGNsYW1wVG9DYW52YXMoY2FudmFzUG9zLngsIGNhbnZhc1Bvcy55LCBjYW52YXMpO1xuICByZXR1cm4geyB4OiBjbGFtcGVkLngsIHk6IGNsYW1wZWQueSB9O1xufVxuXG5mdW5jdGlvbiBnZXRCdXR0b25FbWlzc2lvblBvaW50cyhlbGVtZW50KSB7XG4gIGlmICghZWxlbWVudD8uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcmVjdCA9IGVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIGlmICghKHJlY3Qud2lkdGggPiAwICYmIHJlY3QuaGVpZ2h0ID4gMCkpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGNlbnRlclggPSByZWN0LmxlZnQgKyByZWN0LndpZHRoICogMC41O1xuICBjb25zdCBjZW50ZXJZID0gcmVjdC50b3AgKyByZWN0LmhlaWdodCAqIDAuNTtcbiAgY29uc3QgY2VudGVyQ2FudmFzID0gZ2V0Q2FudmFzUG9pbnRGcm9tVmlld3BvcnQoY2VudGVyWCwgY2VudGVyWSk7XG4gIGlmICghY2VudGVyQ2FudmFzKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCB2aWV3cG9ydFBvaW50cyA9IFtcbiAgICB7IHg6IHJlY3QubGVmdCwgeTogY2VudGVyWSB9LFxuICAgIHsgeDogcmVjdC5yaWdodCwgeTogY2VudGVyWSB9LFxuICAgIHsgeDogY2VudGVyWCwgeTogcmVjdC50b3AgfSxcbiAgICB7IHg6IGNlbnRlclgsIHk6IHJlY3QuYm90dG9tIH1cbiAgXTtcblxuICBjb25zdCBwb2ludHMgPSB2aWV3cG9ydFBvaW50c1xuICAgIC5tYXAoKHBvaW50KSA9PiBnZXRDYW52YXNQb2ludEZyb21WaWV3cG9ydChwb2ludC54LCBwb2ludC55KSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xuXG4gIGlmICghcG9pbnRzLmxlbmd0aCkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHsgY2VudGVyOiBjZW50ZXJDYW52YXMsIHBvaW50cyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQ3Vyc29yUG9zaXRpb24oY2xpZW50WCwgY2xpZW50WSkge1xuICBlbnN1cmVMaXZlQ3VzdG9tQ3Vyc29yRWxlbWVudCgpO1xuICBpZiAoIWN1cnNvckVsZW1lbnQpIHJldHVybjtcblxuICBsYXN0Q2xpZW50WCA9IGNsaWVudFg7XG4gIGxhc3RDbGllbnRZID0gY2xpZW50WTtcbiAgaGFzTGFzdFBvaW50ZXJQb3NpdGlvbiA9IHRydWU7XG4gIFxuICBjb25zdCBpc092ZXJMaW5rID0gaXNIb3ZlcmluZ092ZXJMaW5rKCk7XG4gIGNvbnN0IGlzTGlua1RyYW5zaXRpb24gPSBpc092ZXJMaW5rICYmICF3YXNPdmVyTGluaztcblxuICBpZiAoaXNMaW5rVHJhbnNpdGlvbikge1xuICAgIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gICAgY29uc3QgY2FudmFzID0gZ2xvYmFscz8uY2FudmFzO1xuICAgIGNvbnN0IGNvbG9yID0gZ2V0Q3Vyc29yQ29sb3IoKTtcbiAgICBjb25zdCB2ZWxvY2l0eSA9IGdldE1vdXNlVmVsb2NpdHkoKTtcbiAgICBjb25zdCBkaXIgPSBnZXRNb3VzZURpcmVjdGlvbigpO1xuICAgIFxuICAgIGNvbnN0IHRyaWdnZXJFeHBsb3Npb24gPSAoKSA9PiB7XG4gICAgICBpZiAoIWNhbnZhcykgcmV0dXJuO1xuICAgICAgXG4gICAgICBsZXQgZW1pdHRlZCA9IGZhbHNlO1xuICAgICAgXG4gICAgICBpZiAobGFzdEhvdmVyZWRMaW5rKSB7XG4gICAgICAgIGNvbnN0IGVtaXNzaW9uID0gZ2V0QnV0dG9uRW1pc3Npb25Qb2ludHMobGFzdEhvdmVyZWRMaW5rKTtcbiAgICAgICAgaWYgKGVtaXNzaW9uKSB7XG4gICAgICAgICAgY29uc3QgcGFydGljbGVTY2FsZSA9IDEgLyBlbWlzc2lvbi5wb2ludHMubGVuZ3RoO1xuICAgICAgICAgIGVtaXNzaW9uLnBvaW50cy5mb3JFYWNoKChwb2ludCkgPT4ge1xuICAgICAgICAgICAgdHJpZ2dlckN1cnNvckV4cGxvc2lvbihwb2ludC54LCBwb2ludC55LCBjb2xvciwgdmVsb2NpdHksIHtcbiAgICAgICAgICAgICAgZW1pc3Npb25DZW50ZXI6IGVtaXNzaW9uLmNlbnRlcixcbiAgICAgICAgICAgICAgcGFydGljbGVTY2FsZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZW1pdHRlZCA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKCFlbWl0dGVkKSB7XG4gICAgICAgIGNvbnN0IGNhbnZhc1BvcyA9IGdldENhbnZhc1Bvc2l0aW9uKGNsaWVudFgsIGNsaWVudFkpO1xuICAgICAgICBpZiAoY2FudmFzUG9zKSB7XG4gICAgICAgICAgY29uc3QgY2xhbXBlZCA9IGNhbnZhc1Bvcy5pbkJvdW5kcyA/IGNhbnZhc1BvcyA6IGNsYW1wVG9DYW52YXMoY2FudmFzUG9zLngsIGNhbnZhc1Bvcy55LCBjYW52YXMpO1xuICAgICAgICAgIGlmIChjbGFtcGVkLnggPj0gMCAmJiBjbGFtcGVkLnkgPj0gMCAmJiBjbGFtcGVkLnggPD0gY2FudmFzLndpZHRoICYmIGNsYW1wZWQueSA8PSBjYW52YXMuaGVpZ2h0KSB7XG4gICAgICAgICAgICB0cmlnZ2VyQ3Vyc29yRXhwbG9zaW9uKGNsYW1wZWQueCwgY2xhbXBlZC55LCBjb2xvciwgdmVsb2NpdHkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoZGlyICYmIChkaXIueCAhPT0gMCB8fCBkaXIueSAhPT0gMCkpIHtcbiAgICAgICAgdXBkYXRlTW91c2VWZWxvY2l0eSh2ZWxvY2l0eSwgZGlyLngsIGRpci55KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHJlcXVlc3RBbmltYXRpb25GcmFtZSh0cmlnZ2VyRXhwbG9zaW9uKTtcbiAgfVxuXG4gIHdhc092ZXJMaW5rID0gaXNPdmVyTGluaztcblxuICBjb25zdCB3YXNJblNpbXVsYXRpb24gPSBpc0luU2ltdWxhdGlvbjtcbiAgaXNJblNpbXVsYXRpb24gPSBpc01vdXNlSW5TaW11bGF0aW9uKGNsaWVudFgsIGNsaWVudFkpO1xuICBjb25zdCBvdmVybGF5SXNBY3RpdmUgPSBpc092ZXJsYXlBY3RpdmUoKTtcbiAgY29uc3QgaG92ZXJUYXJnZXQgPSBkb2N1bWVudC5lbGVtZW50RnJvbVBvaW50KGNsaWVudFgsIGNsaWVudFkpO1xuICBjb25zdCB1c2VEZXZDaHJvbWVUYXBSaW5nID0gIW92ZXJsYXlJc0FjdGl2ZSAmJiBpc0RldkNocm9tZUN1cnNvclRhcmdldChob3ZlclRhcmdldCk7XG5cbiAgY29uc3Qgc2hvdWxkVXNlSG9tZURvdCA9IHNob3VsZFVzZUhvbWVEb3RDdXJzb3IoKTtcbiAgY29uc3QgbGVuc0ZvckFjdGlvbkhvdmVyID0gaXNPdmVyTGluayAmJiBzaG91bGRVc2VIb21lRG90ICYmICFvdmVybGF5SXNBY3RpdmUgJiYgIXVzZURldkNocm9tZVRhcFJpbmc7XG4gIGNvbnN0IGhvbWVEb3QgPSBzaG91bGRVc2VIb21lRG90ICYmIGlzSW5TaW11bGF0aW9uICYmICFvdmVybGF5SXNBY3RpdmUgJiYgIXVzZURldkNocm9tZVRhcFJpbmcgJiYgIWxlbnNGb3JBY3Rpb25Ib3ZlcjtcbiAgY29uc3QgdGFwUmluZyA9IGlzSW5TaW11bGF0aW9uICYmIChvdmVybGF5SXNBY3RpdmUgfHwgdXNlRGV2Q2hyb21lVGFwUmluZyB8fCAhc2hvdWxkVXNlSG9tZURvdCB8fCBsZW5zRm9yQWN0aW9uSG92ZXIpO1xuXG4gIGlmICghb3ZlcmxheUlzQWN0aXZlKSB7XG4gICAgY3Vyc29yRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdtb2RhbC1hY3RpdmUnKTtcbiAgfVxuXG4gIGNvbnN0IHNob3dDdXN0b21DdXJzb3IgPSBob21lRG90IHx8IHRhcFJpbmc7XG4gIGlmIChzaG93Q3VzdG9tQ3Vyc29yKSB7XG4gICAgZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuYWRkKCdhYnMtaW4tc2ltdWxhdGlvbicpO1xuICB9IGVsc2Uge1xuICAgIGRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LnJlbW92ZSgnYWJzLWluLXNpbXVsYXRpb24nKTtcbiAgfVxuXG4gIC8vIExJTksgSE9WRVI6IG1vdW50IGZpcnN0IHNvIHRoZSBpbXBsb3Npb24gcmVhZHMgYWdhaW5zdCB0aGUgcmlnaHQgc3VyZmFjZVxuICBpZiAoaXNPdmVyTGluaykge1xuICAgIGlmIChvdmVybGF5SXNBY3RpdmUgfHwgdGFwUmluZykge1xuICAgICAgYXBwbHlUYXBSaW5nTW91bnQoY2xpZW50WCwgY2xpZW50WSwgb3ZlcmxheUlzQWN0aXZlLCB0cnVlKTtcbiAgICB9IGVsc2UgaWYgKGhvbWVEb3QpIHtcbiAgICAgIGFwcGx5SG9tZURvdE1vdW50KGNsaWVudFgsIGNsaWVudFkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdXJzb3JFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGN1cnNvckVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG4gICAgY3Vyc29yRWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSBGVUxMX1NDQUxFO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICghc2hvd0N1c3RvbUN1cnNvcikge1xuICAgIGN1cnNvckVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcbiAgICBpZiAod2FzSW5TaW11bGF0aW9uKSB7XG4gICAgICBjdXJzb3JFbGVtZW50LnN0eWxlLnRyYW5zZm9ybSA9IFpFUk9fU0NBTEU7XG4gICAgICBjdXJzb3JFbGVtZW50LnN0eWxlLmJhY2tncm91bmRDb2xvciA9ICcnO1xuICAgICAgY3Vyc29yRWxlbWVudC5zdHlsZS5maWx0ZXIgPSAnJztcbiAgICB9XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgaWYgKG92ZXJsYXlJc0FjdGl2ZSB8fCB0YXBSaW5nKSB7XG4gICAgYXBwbHlUYXBSaW5nTW91bnQoY2xpZW50WCwgY2xpZW50WSwgb3ZlcmxheUlzQWN0aXZlLCBpc092ZXJMaW5rKTtcbiAgfSBlbHNlIHtcbiAgICBhcHBseUhvbWVEb3RNb3VudChjbGllbnRYLCBjbGllbnRZKTtcbiAgfVxuXG4gIGN1cnNvckVsZW1lbnQuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XG5cbiAgY3Vyc29yRWxlbWVudC5zdHlsZS50cmFuc2Zvcm0gPSBGVUxMX1NDQUxFO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVmcmVzaEN1cnNvcigpIHtcbiAgaWYgKCFjdXJzb3JFbGVtZW50IHx8ICFoYXNMYXN0UG9pbnRlclBvc2l0aW9uKSByZXR1cm47XG4gIHVwZGF0ZUN1cnNvclBvc2l0aW9uKGxhc3RDbGllbnRYLCBsYXN0Q2xpZW50WSk7XG59XG5cbi8qKlxuICogSGlkZSBjdXJzb3IgKHdoZW4gbW91c2UgbGVhdmVzIHdpbmRvdylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhpZGVDdXJzb3IoKSB7XG4gIGlmICghY3Vyc29yRWxlbWVudCkgcmV0dXJuO1xuICBcbiAgY3Vyc29yRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAvLyBSZXN0b3JlIGRlZmF1bHQgY3Vyc29yIHdoZW4gbW91c2UgbGVhdmVzIHdpbmRvd1xuICBkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5yZW1vdmUoJ2Ficy1pbi1zaW11bGF0aW9uJyk7XG4gIGlzSW5TaW11bGF0aW9uID0gZmFsc2U7XG59XG5cbi8qKlxuICogU2hvdyBjdXJzb3IgKHdoZW4gbW91c2UgZW50ZXJzIHdpbmRvdylcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNob3dDdXJzb3IoKSB7XG4gIGlmICghY3Vyc29yRWxlbWVudCkgcmV0dXJuO1xuICAvLyBXaWxsIGJlIHNob3duL2hpZGRlbiBieSB1cGRhdGVDdXJzb3JQb3NpdGlvbiBiYXNlZCBvbiBsb2NhdGlvblxuICBpc0luU2ltdWxhdGlvbiA9IGZhbHNlO1xufVxuXG4vKipcbiAqIFN0YXJ0IGN1cnNvciBmYWRlLWluIGFuaW1hdGlvblxuICogQ3Vyc29yIGZhZGVzIGluIHNsb3dseSBhZnRlciBwYWdlIGZhZGUtaW4gY29tcGxldGVzLCBlbnN1cmluZyBhbGlnbm1lbnQgd2l0aCB0cmFpbFxuICovXG5mdW5jdGlvbiBzdGFydEN1cnNvckZhZGVJbigpIHtcbiAgaWYgKGZhZGVJblN0YXJ0ZWQgfHwgIWN1cnNvckVsZW1lbnQpIHJldHVybjtcbiAgZmFkZUluU3RhcnRlZCA9IHRydWU7XG4gIGN1cnNvckVsZW1lbnQuc3R5bGUub3BhY2l0eSA9ICcxJztcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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QUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUM5QixDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMvQixDQUFDO0FBQ0QsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUM7QUFDSDs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU07QUFDaEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDMUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUN2RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUM3QixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDbEcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2Qzs7QUFFQSxRQUFRLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUNsRCxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTs7QUFFdkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFD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LENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDMUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0csQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFD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