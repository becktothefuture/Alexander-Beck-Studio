// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CONTACT MODAL CONTROLLER                             ║
// ║                  Same transition as CV/Portfolio modals                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Goals:
// - Clicking "Contact" (and inline "Let's chat.") opens a modal overlay
// - Modal uses the same logo ↔ modal swap transition as CV/Portfolio
// - Email row copies the email to clipboard (no mailto)
// - Modal includes a small BACK button (arrow + BACK) to close
//
// Privacy:
// - No network calls
// - No user text stored (clipboard copy is a single fixed string)

import { showOverlay, hideOverlay, mountModalIntoOverlay, unmountModalFromOverlay } from './modal-overlay.js';
import { getText } from '../utils/text-loader.js';

const TRANSITION_MS = 1700; // Must match modal transitions defined in main.css
const COPY_FEEDBACK_MS = 3000;

async function copyToClipboard(text) {
  // Preferred API (secure contexts)
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // Fall through to legacy fallback
  }

  // Legacy fallback (best-effort)
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', 'true');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.('copy') === true;
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

export function initContactModal() {
  const CONTACT_EMAIL = getText('contact.email', 'alexander@beck.fyi');
  const BACK_TEXT = getText('gates.common.backText', 'BACK');
  const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
  const TITLE = getText('gates.contact.title', 'Contact');
  const DESC = getText(
    'gates.contact.description',
    'For collaborations, product design work, AI prototyping, or anything that needs a crisp creative + technical brain. For job opportunities, drop me a note.'
  );
  const COPY_ARIA = getText('contact.copy.buttonAriaLabel', 'Copy email address');
  const COPIED_TEXT = getText('contact.copy.statusCopied', 'Copied');
  const ERROR_TEXT = getText('contact.copy.statusError', 'Copy failed');

  const triggers = [
    document.getElementById('contact-email'),
    document.getElementById('contact-email-inline')
  ].filter(Boolean);

  const logo = document.getElementById('brand-logo');
  const modal = document.getElementById('contact-modal');
  const modalLabel = document.getElementById('contact-modal-label');
  const modalInputs = document.getElementById('contact-modal-inputs');

  const cvGate = document.getElementById('cv-modal');
  const portfolioGate = document.getElementById('portfolio-modal');

  if (!triggers.length || !logo || !modal || !modalLabel || !modalInputs) {
    console.warn('Contact Gate: Missing required elements');
    return;
  }

  // Idempotency check: prevent duplicate listeners if initialized multiple times
  if (modal.dataset.modalInitialized === 'true') return;
  modal.dataset.modalInitialized = 'true';

  // Match CV/Portfolio structure:
  // - modalLabel: back + title + description (fades in with slight delay)
  // - modalInputs: “field” row (arrives with the modal transition like the digit inputs)
  modalLabel.innerHTML = `
    <div class="modal-nav">
      <button type="button" class="gate-back abs-icon-btn" data-modal-back aria-label="${BACK_ARIA}">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
        <span>${BACK_TEXT}</span>
      </button>
    </div>
    <h2 class="modal-title">${TITLE}</h2>
    <p class="modal-description">
      ${DESC}
    </p>
  `;

  modalInputs.innerHTML = `
    <button type="button" class="contact-email-row" data-copy-email aria-label="${COPY_ARIA}">
      <span class="contact-email-text">${CONTACT_EMAIL}</span>
      <span class="contact-email-copy" data-copy-icon-container>
        <i class="ti ti-copy" aria-hidden="true"></i>
      </span>
    </button>
    <div class="contact-copy-status" data-copy-status aria-live="polite"></div>
  `;

  const backBtn = modalLabel.querySelector('[data-modal-back]');
  const emailRowBtn = modalInputs.querySelector('[data-copy-email]');
  const iconContainer = modalInputs.querySelector('[data-copy-icon-container]');
  const statusEl = modalInputs.querySelector('[data-copy-status]');
  const iconI = modalInputs.querySelector('.contact-email-copy i');

  // State
  let isOpen = false;
  let copyTimer = null;
  let lastOpenTime = 0;

  // Helper to check if any modal is currently active
  const isAnyGateActive = () => {
    return (modal && modal.classList.contains('active')) ||
           (cvGate && cvGate.classList.contains('active')) ||
           (portfolioGate && portfolioGate.classList.contains('active'));
  };

  const setCopyUI = (state) => {
    if (!emailRowBtn || !statusEl) return;
    if (copyTimer) window.clearTimeout(copyTimer);

    if (state === 'copied') {
      emailRowBtn.classList.add('is-copied');
      emailRowBtn.classList.remove('is-error');
      statusEl.textContent = COPIED_TEXT;
      if (iconI) {
        iconI.className = 'ti ti-check';
        iconI.parentElement.classList.add('is-active'); // For pop up
      }
      copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
      return;
    }

    if (state === 'error') {
      emailRowBtn.classList.add('is-error');
      emailRowBtn.classList.remove('is-copied');
      statusEl.textContent = ERROR_TEXT;
      if (iconI) {
        iconI.className = 'ti ti-alert-triangle';
        iconI.parentElement.classList.add('is-active');
      }
      copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
      return;
    }

    // idle
    emailRowBtn.classList.remove('is-copied', 'is-error');
    statusEl.textContent = '';
    if (iconI) {
      iconI.className = 'ti ti-copy';
      iconI.parentElement.classList.remove('is-active');
    }
  };

  const openGate = (e) => {
    e?.preventDefault?.();
    lastOpenTime = Date.now();

    // Check if any other modal is currently open
    const wasAnyGateActive = isAnyGateActive();

    // Close other modals if open (match existing behavior)
    if (cvGate && cvGate.classList.contains('active')) {
      cvGate.classList.remove('active');
      cvGate.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        cvGate.classList.add('hidden');
        unmountModalFromOverlay(cvGate);
      }, TRANSITION_MS);
    }
    if (portfolioGate && portfolioGate.classList.contains('active')) {
      portfolioGate.classList.remove('active');
      portfolioGate.setAttribute('aria-hidden', 'true');
      setTimeout(() => {
        portfolioGate.classList.add('hidden');
        unmountModalFromOverlay(portfolioGate);
      }, TRANSITION_MS);
    }

    isOpen = true;
    
    // Show overlay only if no modal was previously active
    if (!wasAnyGateActive) {
      showOverlay();
    }
    setCopyUI('idle');

    // Animate Logo Out (Up)
    logo.classList.add('fade-out-up');

    // Defer modal DOM operations to next frame to avoid interrupting overlay's backdrop-filter transition
    requestAnimationFrame(() => {
      // Modal: mount modal inside overlay flex container
      mountModalIntoOverlay(modal);

      // Animate Modal In (Up)
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      void modal.offsetWidth;
      modal.classList.add('active');

      // Focus email button for keyboard users
      emailRowBtn?.focus?.();
    });
  };

  const closeGate = (instant = false) => {
    // Close must be responsive immediately (Back/background/Escape).
    // Any “ghost click” prevention should be handled via pointer routing, not time blocks.
    isOpen = false;
    setCopyUI('idle');

    if (instant) {
      // Instant close: disable transition, remove active, then re-enable
      modal.style.transition = 'none';
      logo.style.transition = 'none';

    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
      modal.classList.add('hidden');
      unmountModalFromOverlay(modal);
      logo.classList.remove('fade-out-up');
      
      // Hide overlay immediately if no other modal is active
      if (!isAnyGateActive()) {
        hideOverlay();
      }
      
      // Re-enable transitions after a frame
      requestAnimationFrame(() => {
        modal.style.removeProperty('transition');
        logo.style.removeProperty('transition');
      });
    } else {
      // Smooth close: use CSS transition
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      logo.classList.remove('fade-out-up');

      // Hide overlay immediately to animate blur in parallel with content
      if (!isAnyGateActive()) {
        hideOverlay();
      }

      setTimeout(() => {
        if (!isOpen) {
          modal.classList.add('hidden');
          unmountModalFromOverlay(modal);
        }
      }, TRANSITION_MS);
    }
  };

  // Triggers
  // Capture phase so we win against any legacy exported interactions on these links.
  triggers.forEach((t) => t.addEventListener('click', openGate, { capture: true }));
  backBtn?.addEventListener('click', () => closeGate(false));
  
  // Click on modal background (not on buttons) also closes instantly
  modal.addEventListener('click', (e) => {
    // Only close if clicking the modal container itself or non-interactive areas
    if (e.target === modal || e.target.classList.contains('modal-label') || 
        e.target.classList.contains('modal-description') || e.target.tagName === 'H2' ||
        e.target.tagName === 'P') {
      closeGate(false);
    }
  });

  // Copy interaction
  const onCopy = async (e) => {
    const ok = await copyToClipboard(CONTACT_EMAIL);
    
    if (ok) {
      // Trigger pulse animation
      emailRowBtn.classList.remove('pulse-energy');
      void emailRowBtn.offsetWidth; // Force reflow
      emailRowBtn.classList.add('pulse-energy');
      
      // Cleanup class after animation
      setTimeout(() => {
        emailRowBtn.classList.remove('pulse-energy');
      }, 800);
    }
    
    setCopyUI(ok ? 'copied' : 'error');
  };
  emailRowBtn?.addEventListener('click', onCopy);

  // Escape closes (consistent with other modals)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeGate();
  });
  
  // Close when overlay is clicked (dismiss event from modal-overlay.js)
  document.addEventListener('modal-overlay-dismiss', (e) => {
    if (isOpen) {
      const instant = e.detail?.instant || false;
      closeGate(instant);
    }
  });

  // Allow other pages (e.g. portfolio) to route via index and auto-open Contact modal.
  try {
    if (sessionStorage.getItem('abs_open_contact_modal')) {
      sessionStorage.removeItem('abs_open_contact_modal');
      // Defer one frame so other init steps (overlay, layout) are fully settled.
      requestAnimationFrame(() => openGate());
    }
  } catch (e) {}
}
