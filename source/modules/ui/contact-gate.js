// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          CONTACT GATE CONTROLLER                             ║
// ║                  Same transition as CV/Portfolio gates                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Goals:
// - Clicking "Contact" (and inline "Let's chat.") opens a gate overlay
// - Gate uses the same logo ↔ gate swap transition as CV/Portfolio
// - Email row copies the email to clipboard (no mailto)
// - Gate includes a small BACK button (arrow + BACK) to close
//
// Privacy:
// - No network calls
// - No user text stored (clipboard copy is a single fixed string)

import { showOverlay, hideOverlay } from './gate-overlay.js';
import { getText } from '../utils/text-loader.js';

const TRANSITION_MS = 400; // Must match password-gate.css transitions
const COPY_FEEDBACK_MS = 1200;

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

export function initContactGate() {
  const CONTACT_EMAIL = getText('contact.email', 'alexander@beck.fyi');
  const BACK_TEXT = getText('gates.common.backText', 'BACK');
  const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
  const TITLE = getText('gates.contact.title', 'Contact');
  const DESC = getText(
    'gates.contact.description',
    'For collaborations, product design work, AI prototyping, or anything that needs a crisp creative + technical brain.'
  );
  const COPY_ARIA = getText('contact.copy.buttonAriaLabel', 'Copy email address');
  const COPIED_TEXT = getText('contact.copy.statusCopied', 'Copied');
  const ERROR_TEXT = getText('contact.copy.statusError', 'Copy failed');

  const triggers = [
    document.getElementById('contact-email'),
    document.getElementById('contact-email-inline')
  ].filter(Boolean);

  const logo = document.getElementById('brand-logo');
  const gate = document.getElementById('contact-gate');
  const gateLabel = document.getElementById('contact-gate-label');
  const gateInputs = document.getElementById('contact-gate-inputs');

  const cvGate = document.getElementById('cv-gate');
  const portfolioGate = document.getElementById('portfolio-gate');

  if (!triggers.length || !logo || !gate || !gateLabel || !gateInputs) {
    console.warn('Contact Gate: Missing required elements');
    return;
  }

  // Match CV/Portfolio structure:
  // - gateLabel: back + title + description (fades in with slight delay)
  // - gateInputs: “field” row (arrives with the gate transition like the digit inputs)
  gateLabel.innerHTML = `
    <div class="gate-nav">
      <button type="button" class="gate-back" data-gate-back aria-label="${BACK_ARIA}">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
        <span>${BACK_TEXT}</span>
      </button>
    </div>
    <h2 class="gate-title">${TITLE}</h2>
    <p class="gate-description">
      ${DESC}
    </p>
  `;

  gateInputs.innerHTML = `
    <div class="contact-email-row" data-email-row>
      <button type="button" class="contact-email-value" data-copy-email aria-label="${COPY_ARIA}">
        <span class="contact-email-text">${CONTACT_EMAIL}</span>
      </button>
      <button type="button" class="contact-email-copy" data-copy-email-icon aria-label="${COPY_ARIA}">
        <i class="ti ti-copy" aria-hidden="true"></i>
      </button>
    </div>
    <div class="contact-copy-status" data-copy-status aria-live="polite"></div>
  `;

  const backBtn = gateLabel.querySelector('[data-gate-back]');
  const emailValueBtn = gateInputs.querySelector('[data-copy-email]');
  const emailCopyBtn = gateInputs.querySelector('[data-copy-email-icon]');
  const emailRow = gateInputs.querySelector('[data-email-row]');
  const statusEl = gateInputs.querySelector('[data-copy-status]');
  const iconI = gateInputs.querySelector('.contact-email-copy i');

  // State
  let isOpen = false;
  let copyTimer = null;

  // Helper to check if any gate is currently active
  const isAnyGateActive = () => {
    return (gate && gate.classList.contains('active')) ||
           (cvGate && cvGate.classList.contains('active')) ||
           (portfolioGate && portfolioGate.classList.contains('active'));
  };

  const setCopyUI = (state) => {
    if (!emailValueBtn || !emailCopyBtn || !statusEl) return;
    if (copyTimer) window.clearTimeout(copyTimer);

    if (state === 'copied') {
      emailRow?.classList?.add?.('is-copied');
      emailRow?.classList?.remove?.('is-error');
      statusEl.textContent = COPIED_TEXT;
      if (iconI) iconI.className = 'ti ti-check';
      copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
      return;
    }

    if (state === 'error') {
      emailRow?.classList?.add?.('is-error');
      emailRow?.classList?.remove?.('is-copied');
      statusEl.textContent = ERROR_TEXT;
      if (iconI) iconI.className = 'ti ti-alert-triangle';
      copyTimer = window.setTimeout(() => setCopyUI('idle'), COPY_FEEDBACK_MS);
      return;
    }

    // idle
    emailRow?.classList?.remove?.('is-copied', 'is-error');
    statusEl.textContent = '';
    if (iconI) iconI.className = 'ti ti-copy';
  };

  const openGate = (e) => {
    e?.preventDefault?.();

    // Check if any other gate is currently open
    const wasAnyGateActive = isAnyGateActive();

    // Close other gates if open (match existing behavior)
    if (cvGate && cvGate.classList.contains('active')) {
      cvGate.classList.remove('active');
      cvGate.setAttribute('aria-hidden', 'true');
      setTimeout(() => cvGate.classList.add('hidden'), TRANSITION_MS);
    }
    if (portfolioGate && portfolioGate.classList.contains('active')) {
      portfolioGate.classList.remove('active');
      portfolioGate.setAttribute('aria-hidden', 'true');
      setTimeout(() => portfolioGate.classList.add('hidden'), TRANSITION_MS);
    }

    isOpen = true;
    
    // Show overlay only if no gate was previously active
    if (!wasAnyGateActive) {
      showOverlay();
    }
    setCopyUI('idle');

    // Animate Logo Out (Up)
    logo.classList.add('fade-out-up');

    // Animate Gate In (Up)
    gate.classList.remove('hidden');
    gate.setAttribute('aria-hidden', 'false');
    void gate.offsetWidth;
    gate.classList.add('active');

    // Focus email button for keyboard users
    emailValueBtn?.focus?.();
  };

  const closeGate = (instant = false) => {
    isOpen = false;
    setCopyUI('idle');

    if (instant) {
      // Instant close: disable transition, remove active, then re-enable
      gate.style.transition = 'none';
      logo.style.transition = 'none';

    gate.classList.remove('active');
    gate.setAttribute('aria-hidden', 'true');
      gate.classList.add('hidden');
      logo.classList.remove('fade-out-up');
      
      // Hide overlay immediately if no other gate is active
      if (!isAnyGateActive()) {
        hideOverlay();
      }
      
      // Re-enable transitions after a frame
      requestAnimationFrame(() => {
        gate.style.removeProperty('transition');
        logo.style.removeProperty('transition');
      });
    } else {
      // Smooth close: use CSS transition
      gate.classList.remove('active');
      gate.setAttribute('aria-hidden', 'true');
    logo.classList.remove('fade-out-up');

    setTimeout(() => {
      if (!isOpen) gate.classList.add('hidden');
      
        // Hide overlay if no other gate is now active
        if (!isAnyGateActive()) {
          hideOverlay();
        }
    }, TRANSITION_MS);
    }
  };

  // Triggers
  // Capture phase so we win against any legacy exported interactions on these links.
  triggers.forEach((t) => t.addEventListener('click', openGate, { capture: true }));
  backBtn?.addEventListener('click', closeGate);
  
  // Click on gate background (not on buttons) also closes instantly
  gate.addEventListener('click', (e) => {
    // Only close if clicking the gate container itself or non-interactive areas
    if (e.target === gate || e.target.classList.contains('gate-label') || 
        e.target.classList.contains('gate-description') || e.target.tagName === 'H2' ||
        e.target.tagName === 'P') {
      closeGate(true);
    }
  });

  // Copy interaction
  const onCopy = async (e) => {
    const ok = await copyToClipboard(CONTACT_EMAIL);
    setCopyUI(ok ? 'copied' : 'error');
  };
  emailValueBtn?.addEventListener('click', onCopy);
  emailCopyBtn?.addEventListener('click', onCopy);

  // Escape closes (consistent with other gates)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) closeGate();
  });
  
  // Close when overlay is clicked (dismiss event from gate-overlay.js)
  document.addEventListener('gate-overlay-dismiss', (e) => {
    if (isOpen) {
      const instant = e.detail?.instant || false;
      closeGate(instant);
    }
  });
}

