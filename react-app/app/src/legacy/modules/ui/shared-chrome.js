// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      SHARED CHROME INITIALIZATION BUNDLE                     ║
// ║  Centralizes common UI initialization across all pages (index, portfolio, CV) ║
// ║      Each page calls this with a config object specifying features to enable  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { initModalOverlay } from './modal-overlay.js';
import { initLinkCursorHop } from './link-cursor-hop.js';
import { initTimeDisplay } from './time-display.js';

/**
 * Initialize shared chrome features across pages
 * @param {Object} options - Configuration object
 * @param {boolean} options.contactModal - Legacy no-op; Contact is a route.
 * @param {boolean} options.cvModal - Legacy no-op; About is a route.
 * @param {boolean} options.portfolioModal - Legacy no-op; Portfolio gate is in-window.
 * @param {boolean} options.cursorHiding - Initialize cursor hiding system
 * @param {Object} options.modalOverlayConfig - Config object for modal overlay
 */
export function initSharedChrome(options = {}) {
  const {
    contactModal = false,
    cvModal = false,
    portfolioModal = false,
    cursorHiding = true,
    modalOverlayConfig = {}
  } = options;

  // Modal overlay (still used by the simulation chooser).
  if (contactModal || cvModal || portfolioModal) {
    try {
      initModalOverlay(modalOverlayConfig);
    } catch (e) {
      console.warn('Failed to initialize modal overlay:', e);
    }
  }

  // Cursor hiding system (enabled by default)
  if (cursorHiding) {
    try {
      initLinkCursorHop();
    } catch (e) {
      console.warn('Failed to initialize cursor hiding:', e);
    }
  }

  try {
    initTimeDisplay();
  } catch (e) {
    console.warn('Failed to initialize time display:', e);
  }
}
