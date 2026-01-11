// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      SHARED CHROME INITIALIZATION BUNDLE                     ║
// ║  Centralizes common UI initialization across all pages (index, portfolio, CV) ║
// ║      Each page calls this with a config object specifying features to enable  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { initModalOverlay } from './modal-overlay.js';
import { initContactModal } from './contact-modal.js';
import { initCVModal } from './cv-modal.js';
import { initPortfolioModal } from './portfolio-modal.js';
import { initLinkCursorHop } from './link-cursor-hop.js';

/**
 * Initialize shared chrome features across pages
 * @param {Object} options - Configuration object
 * @param {boolean} options.contactModal - Initialize contact modal
 * @param {boolean} options.cvModal - Initialize CV modal
 * @param {boolean} options.portfolioModal - Initialize portfolio modal
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

  // Modal overlay (required for any modal)
  if (contactModal || cvModal || portfolioModal) {
    try {
      initModalOverlay(modalOverlayConfig);
    } catch (e) {
      console.warn('Failed to initialize modal overlay:', e);
    }
  }

  // Individual modals
  if (contactModal) {
    try {
      initContactModal();
    } catch (e) {
      console.warn('Failed to initialize contact modal:', e);
    }
  }

  if (cvModal) {
    try {
      initCVModal();
    } catch (e) {
      console.warn('Failed to initialize CV modal:', e);
    }
  }

  if (portfolioModal) {
    try {
      initPortfolioModal();
    } catch (e) {
      console.warn('Failed to initialize portfolio modal:', e);
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
}
