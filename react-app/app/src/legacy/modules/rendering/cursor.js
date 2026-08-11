// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CUSTOM CURSOR RENDERER                              ║
// ║  One translucent lens across the production site and every overlay.            ║
// ║  Clickable targets only make the lens smaller and quieter — see CUSTOM-CURSOR. ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { isOverlayActive } from '../ui/modal-overlay.js';

let cursorElement = null;
let isInitialized = false;
/** Prevents duplicate `abs-link-hover` listeners across SPA re-bootstrap */
let linkHoverListening = false;
/** Keeps the custom cursor available on React route runtimes that do not boot legacy pointer.js. */
let documentCursorTracking = false;
let isCustomCursorActive = false;
const STANDARD_CURSOR_CSS_PX = 57.6;
const STANDARD_CURSOR_Z_INDEX = 19990;
const MODAL_CURSOR_Z_INDEX = 20000;
let lastClientX = 0;
let lastClientY = 0;
let hasLastPointerPosition = false;
let lastPointerTarget = null;
let presentationFrameId = 0;

function countAudit(name) {
  const globals = getGlobals();
  if (globalThis.__ABS_ROUTE_PERF_AUDIT__ !== true && globals.performanceAuditEnabled !== true) return;
  globals[name] = (Number(globals[name]) || 0) + 1;
}

function setSimulationCursorOwnership(active) {
  const body = document.body;
  if (!body || body.classList.contains('abs-in-simulation') === active) return;
  body.classList.toggle('abs-in-simulation', active);
  countAudit('cursorBodyClassMutationCount');
}

function handleLinkHoverEvent() {
  if (hasLastPointerPosition) refreshCursor();
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
  if (event?.pointerType && !['mouse', 'pen'].includes(event.pointerType)) {
    hideCursor();
    return;
  }
  updateCursorPosition(event.clientX, event.clientY, event.target);
}

function handleDocumentCursorMouseMove(event) {
  if (window.PointerEvent) return;
  updateCursorPosition(event.clientX, event.clientY, event.target);
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
  cursorElement = null;
}

function ensureLiveCustomCursorElement() {
  if (cursorElement?.isConnected) return;
  if (cursorElement && !cursorElement.isConnected) {
    detachCustomCursorModuleState();
  }
  setupCustomCursor();
}

/**
 * Editors need native pointer affordances for dense controls, text entry, and
 * drag handles. Keep this list rooted in the editor containers so new controls
 * inherit the contract without bespoke cursor rules.
 */
function isNativeEditorCursorTarget(target) {
  if (!target || !target.closest) return false;
  return Boolean(target.closest('.panel, .panel-toggle-btn, .parameterizer-panel, .about-track-editor'));
}

function isClickableCursorTarget(target) {
  if (!target?.closest) return false;
  const action = target.closest([
    'a[href]:not([aria-disabled="true"])',
    'button:not([disabled]):not([aria-disabled="true"])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'summary',
    'label[for]',
    '[role="button"]:not([aria-disabled="true"])',
    '[role="link"]:not([aria-disabled="true"])',
    '[tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])',
  ].join(','));
  const defaultSurface = target.closest('[data-cursor-default-surface]');
  if (defaultSurface && action === defaultSurface) return false;
  return Boolean(action);
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
    wireLinkHoverListener();
    wireDocumentCursorTracking();
    updateCursorSize();
    stray.style.opacity = '1';
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
  wireDocumentCursorTracking();
  updateCursorSize();
}

/**
 * Keep one authored cursor size across every route, shell surface, and overlay.
 */
export function updateCursorSize() {
  if (!cursorElement) return;

  cursorElement.style.marginLeft = '0';
  cursorElement.style.marginTop = '0';
  cursorElement.style.borderRadius = '50%';

  cursorElement.style.width = `${STANDARD_CURSOR_CSS_PX}px`;
  cursorElement.style.height = `${STANDARD_CURSOR_CSS_PX}px`;

  if (!isCustomCursorActive) {
    cursorElement.style.transform = ZERO_SCALE;
  }
}

const ZERO_SCALE = 'translate(-50%, -50%) scale(0)';
const FULL_SCALE = 'translate(-50%, -50%) scale(var(--abs-cursor-scale, 1))';

function applyStandardCursorMount(clientX, clientY, overlayIsActive, interactive = false) {
  if (cursorElement.parentElement !== document.body) {
    document.body.appendChild(cursorElement);
  }
  cursorElement.style.position = 'fixed';
  cursorElement.style.left = `${clientX}px`;
  cursorElement.style.top = `${clientY}px`;
  cursorElement.style.zIndex = String(overlayIsActive ? MODAL_CURSOR_Z_INDEX : STANDARD_CURSOR_Z_INDEX);
  cursorElement.classList.toggle('abs-cursor-interactive', Boolean(interactive));
  cursorElement.classList.remove('abs-cursor-tap', 'abs-cursor-action-hover', 'abs-cursor-project-hover');
  cursorElement.style.width = `${STANDARD_CURSOR_CSS_PX}px`;
  cursorElement.style.height = `${STANDARD_CURSOR_CSS_PX}px`;
  cursorElement.style.boxSizing = 'border-box';
  cursorElement.style.transform = FULL_SCALE;
  cursorElement.style.opacity = '';
  cursorElement.style.backgroundColor = '';
  cursorElement.style.border = '';
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
 * Update cursor position and state
 * Called from pointer.js on mouse move
 * @param {number} clientX - Mouse X position
 * @param {number} clientY - Mouse Y position
 */
export function updateCursorPosition(clientX, clientY, target = null) {
  lastClientX = clientX;
  lastClientY = clientY;
  lastPointerTarget = target;
  hasLastPointerPosition = true;
  if (presentationFrameId) return;
  presentationFrameId = requestAnimationFrame(() => {
    presentationFrameId = 0;
    presentCursorPosition();
  });
}

function presentCursorPosition() {
  ensureLiveCustomCursorElement();
  if (!cursorElement) return;
  const clientX = lastClientX;
  const clientY = lastClientY;
  countAudit('cursorPresentationCount');
  
  const overlayIsActive = isOverlayActive();
  let hoverTarget = lastPointerTarget;
  if (!hoverTarget?.isConnected) {
    hoverTarget = document.elementFromPoint(clientX, clientY);
    countAudit('cursorHitTestCount');
  }

  // Editor surfaces retain the system cursor. Hiding only the native cursor in
  // CSS would leave the custom lens rendered above controls, so yield here.
  if (isNativeEditorCursorTarget(hoverTarget)) {
    setSimulationCursorOwnership(false);
    cursorElement.style.display = 'none';
    isCustomCursorActive = false;
    return;
  }

  const interactive = isClickableCursorTarget(hoverTarget) || isHoveringOverLink();
  isCustomCursorActive = true;
  setSimulationCursorOwnership(true);
  cursorElement.classList.remove('modal-active');
  applyStandardCursorMount(clientX, clientY, overlayIsActive, interactive);
  cursorElement.style.display = 'block';
  cursorElement.style.transform = FULL_SCALE;
}

export function refreshCursor() {
  if (!cursorElement || !hasLastPointerPosition) return;
  lastPointerTarget = null;
  updateCursorPosition(lastClientX, lastClientY);
}

/**
 * Hide cursor when the mouse leaves the document.
 */
export function hideCursor() {
  if (!cursorElement) return;
  if (presentationFrameId) cancelAnimationFrame(presentationFrameId);
  presentationFrameId = 0;
  cursorElement.style.display = 'none';
  setSimulationCursorOwnership(false);
  isCustomCursorActive = false;
}

/**
 * Prepare the cursor to return on the next pointer move.
 */
export function showCursor() {
  if (!cursorElement) return;
  isCustomCursorActive = false;
}
