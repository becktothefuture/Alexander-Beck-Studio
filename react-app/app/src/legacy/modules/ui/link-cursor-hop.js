// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ACTION HOVER — CUSTOM CURSOR SYSTEM                       ║
// ║  Tracks in-window clickable targets so the cursor can lead the hover state.  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let isInitialized = false;
const HOVER_CLASS = 'abs-link-hovering';
const ACTION_HOVER_CLASS = 'abs-action-hovering';

/** Currently hovered link/button (set on pointerover, cleared on pointerout). Used for power-transfer explosion origin. */
let currentHoveredElement = null;

function isEventOnPanelUI(target) {
  if (!target || !target.closest) return false;
  return Boolean(
    target.closest('#panelDock') ||
    target.closest('#masterPanel') ||
    target.closest('#dockToggle') ||
    target.closest('.panel-dock') ||
    target.closest('.panel')
  );
}

function getNearestAction(target) {
  if (!target || !target.closest) return null;
  const el = target.closest('a, button, [role="button"]');
  if (!el) return null;

  // Dev launcher and persistent Button Bar keep their own cursor/hover contracts.
  if (el.closest('.panel-toggle-btn')) return null;
  if (el.closest('[data-button-bar]')) return null;

  // Exclude portfolio carousel slides
  if (el.classList.contains('slide')) return null;
  if (el.closest('.slide')) return null;

  return el;
}

function clearActionHoverState() {
  currentHoveredElement = null;
  document.body?.classList.remove(HOVER_CLASS);
  document.body?.classList.remove(ACTION_HOVER_CLASS);
}

function onPointerOver(e) {
  const link = getNearestAction(e.target);
  if (!link || isEventOnPanelUI(link)) return;

  const from = e.relatedTarget;
  if ((from && link.contains(from)) || currentHoveredElement === link) return;

  currentHoveredElement = link;
  document.body?.classList.add(HOVER_CLASS);
  document.body?.classList.add(ACTION_HOVER_CLASS);
  if (typeof CustomEvent === 'function') {
    document.body.dispatchEvent(new CustomEvent('abs-link-hover', { detail: { element: link } }));
  }
}

function onPointerOut(e) {
  const link = getNearestAction(e.target);
  if (!link) return;

  const to = e.relatedTarget;
  if (to && link.contains(to)) return; // Still within same link

  clearActionHoverState();
}

export function initLinkCursorHop() {
  if (isInitialized) return;
  isInitialized = true;

  // Clean baseline
  clearActionHoverState();

  // Pointer events
  document.addEventListener('pointerover', onPointerOver, true);
  document.addEventListener('pointerout', onPointerOut, true);

  // Mouse fallback for older browsers
  if (!window.PointerEvent) {
    document.addEventListener('mouseover', onPointerOver, true);
    document.addEventListener('mouseout', onPointerOut, true);
  }

  // Cleanup on blur
  window.addEventListener('blur', () => {
    clearActionHoverState();
  }, { passive: true });

  // Cleanup when mouse leaves viewport
  window.addEventListener(
    'mouseout',
    (event) => {
      if (!event.relatedTarget && !event.toElement) {
        clearActionHoverState();
      }
    },
    { passive: true }
  );
}

/**
 * Return the element currently under hover (when body has abs-link-hovering).
 * Used by cursor power-transfer to emit explosion from button edges.
 * @returns {Element | null}
 */
export function getCurrentHoveredElement() {
  return currentHoveredElement ?? null;
}

// Backwards-compat export (no-op)
export function setLinkHoverMode() {}
