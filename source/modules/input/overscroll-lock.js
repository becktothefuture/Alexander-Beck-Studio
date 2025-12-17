// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      OVERSCROLL LOCK (iOS RUBBER-BAND FIX)                   ║
// ║   Prevents page rubber-banding / scroll bounce while allowing internal       ║
// ║   scrolling for UI containers (gates + panel).                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * iOS Safari can still rubber-band even when body is overflow:hidden, especially
 * during touchmove gestures. This installs a capture-phase touchmove listener
 * (passive:false) that blocks scrolling unless the gesture originates inside a
 * whitelisted scroll container.
 *
 * IMPORTANT:
 * - We only preventDefault on touchmove, not touchstart, so taps/clicks still work.
 * - We allow scrolling inside gate dialogs (when active) and the panel scroll area.
 */
export function setupOverscrollLock() {
  if (typeof document === 'undefined') return;

  const isAllowedScrollTarget = (target) => {
    if (!(target instanceof Element)) return false;

    // Allow scroll inside active gate dialogs (they are internally scrollable)
    if (target.closest('.cv-gate.active')) return true;
    if (target.closest('.portfolio-gate.active')) return true;
    if (target.closest('.contact-gate.active')) return true;

    // Allow scroll inside the panel content (dock + legacy panel)
    if (target.closest('.panel-dock .panel .panel-content')) return true;
    if (target.closest('#controlPanel')) return true;

    return false;
  };

  document.addEventListener('touchmove', (e) => {
    // If a scrollable UI wants the gesture, let it through.
    if (isAllowedScrollTarget(e.target)) return;

    // Otherwise: lock the page in place (no rubber-banding / bounce).
    // Note: must be passive:false for iOS.
    e.preventDefault();
  }, { passive: false, capture: true });
}


