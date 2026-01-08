// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     LINK HOVER — CURSOR HIDE SYSTEM                          ║
// ║  Minimal hover detection: hides custom cursor when over interactive elements ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let isInitialized = false;
const HOVER_CLASS = 'abs-link-hovering';

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

  // Exclude portfolio carousel slides
  try {
    if (el.classList?.contains?.('slide')) return null;
    if (el.closest?.('.slide')) return null;
  } catch (e) {}

  return el;
}

function onPointerOver(e) {
  const link = getNearestAction(e.target);
  if (!link || isEventOnPanelUI(link)) return;
  
  try {
    document.body.classList.add(HOVER_CLASS);
  } catch (e) {}
}

function onPointerOut(e) {
  const link = getNearestAction(e.target);
  if (!link) return;

  const to = e.relatedTarget;
  if (to && link.contains(to)) return; // Still within same link

  try {
    document.body.classList.remove(HOVER_CLASS);
  } catch (e) {}
}

export function initLinkCursorHop() {
  if (isInitialized) return;
  isInitialized = true;

  // Clean baseline
  try {
    document.body.classList.remove(HOVER_CLASS);
  } catch (e) {}

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
    try {
      document.body.classList.remove(HOVER_CLASS);
    } catch (e) {}
  }, { passive: true });

  // Cleanup when mouse leaves viewport
  window.addEventListener(
    'mouseout',
    (event) => {
      if (!event.relatedTarget && !event.toElement) {
        try {
          document.body.classList.remove(HOVER_CLASS);
        } catch (e) {}
      }
    },
    { passive: true }
  );
}

// Backwards-compat export (no-op)
export function setLinkHoverMode() {}
