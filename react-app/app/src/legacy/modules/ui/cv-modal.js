/**
 * CV Modal Controller
 * Handles the invite-gating UI for the CV download.
 */

import { activateModalAccessibility } from './modal-accessibility.js';
import { getText } from '../utils/text-loader.js';
import { navigateWithTransition, NAV_STATES } from '../utils/page-nav.js';
import { consumeGateRequest, markGateAccess } from '../../../lib/access-gates.js';
import { setStableTimeout } from '../../../lib/legacy-runtime-scope.js';
import {
    closeGateModal,
    hideCompetingGateModals,
    isGateModalParticipating,
    openGateModal,
    showGateBackdrop
} from './gate-modal-shared.js';

export function initCVModal() {
    const trigger = document.getElementById('cv-modal-trigger');
    const logo = document.getElementById('brand-logo');
    const modal = document.getElementById('cv-modal');
    const portfolioGate = document.getElementById('portfolio-modal'); // Get portfolio modal to check/close if open
    const contactGate = document.getElementById('contact-modal'); // Get contact modal to check/close if open
    const inputs = Array.from(document.querySelectorAll('.cv-digit'));
    const inputsContainer = document.getElementById('cv-modal-inputs');
    const modalLabel = document.getElementById('cv-modal-label');
    
    // Invite codes add client-side friction only. They are not secure auth.
    const INVITE_CODE = '1111';
    
    if (!trigger || !modal || inputs.length === 0) {
        console.warn('CV Gate: Missing required elements');
        return;
    }
    
    // Logo is optional (not present on CV page)

    // SPA: `createLegacyRuntimeScope` removes ALL listeners added during the
    // previous route's bootstrap — including handlers on persistent modal DOM.
    // Always re-initialize so that trigger bindings, input handlers, and
    // document-level keyboard/overlay listeners are restored.
    modal.dataset.modalInitialized = 'true';
    
    const BACK_TEXT = getText('gates.common.backText', 'BACK');
    const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
    const TITLE = getText('gates.cv.title', 'About me');
    const DESC = getText(
        'gates.cv.description',
        "This is a lightweight invite gate in the browser, not secure authentication. If I shared a code with you, enter it here. Otherwise get in touch and I'll send the CV directly."
    );

    // Set label text if element exists
    if (modalLabel) {
        modalLabel.innerHTML = `
            <div class="modal-nav">
                <button type="button" class="gate-back abs-icon-btn" data-modal-back aria-label="${BACK_ARIA}">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>${BACK_TEXT}</span>
                </button>
            </div>
            <h2 id="cv-modal-title" class="modal-title">${TITLE}</h2>
            <p id="cv-modal-description" class="modal-description">${DESC}</p>
        `;
    }

    modal.setAttribute('aria-labelledby', 'cv-modal-title');
    modal.setAttribute('aria-describedby', 'cv-modal-description');

    if (inputsContainer) {
        inputsContainer.setAttribute('role', 'group');
        inputsContainer.setAttribute('aria-labelledby', 'cv-modal-title');
        inputsContainer.setAttribute('aria-describedby', 'cv-modal-description');
    }

    inputs.forEach((input, index) => {
        input.setAttribute('aria-label', `CV invite code digit ${index + 1} of ${inputs.length}`);
    });

    // State
    let isOpen = false;
    let lastOpenTime = 0;
    let deactivateModalA11y = null;

    // Helper to check if any modal is currently active
    const isAnyGateActive = () => {
        return (modal && modal.classList.contains('active')) ||
               (portfolioGate && portfolioGate.classList.contains('active')) ||
               (contactGate && contactGate.classList.contains('active'));
    };

    // --- Actions ---

    const openGate = (e) => {
        e?.preventDefault?.();
        
        // Check if any other modal is currently open
        const wasAnyGateActive = isAnyGateActive();
        
        // Close portfolio modal if it's open
        hideCompetingGateModals([portfolioGate, contactGate]);
        
        isOpen = true;
        lastOpenTime = Date.now();
        
        // Show overlay only if no modal was previously active
        showGateBackdrop({ logo, hadActiveGate: wasAnyGateActive });

        deactivateModalA11y = activateModalAccessibility(modal, {
            initialFocus: () => inputs[0]
        });

        openGateModal(modal);
    };

    const closeGate = (instant = false, options = {}) => {
        // Close must be responsive immediately (Back/background/Escape).
        isOpen = false;
        deactivateModalA11y?.({ restoreFocus: options.restoreFocus !== false });
        deactivateModalA11y = null;
        
        // Clear inputs
        inputs.forEach(input => input.value = '');
        
        closeGateModal({
            modal,
            logo,
            instant,
            keepOverlayActive: isGateModalParticipating(portfolioGate) || isGateModalParticipating(contactGate),
            shouldFinalize: () => !isOpen
        });
    };

    // Back button closes modal (matches new UI pattern)
    try {
        const backBtn = modalLabel?.querySelector?.('[data-modal-back]');
        if (backBtn) backBtn.addEventListener('click', () => closeGate(false));
    } catch (e) {}
    
    // Click on modal background (not on inputs) also closes instantly
    modal.addEventListener('click', (e) => {
        // Only close if clicking the modal container itself or non-interactive areas
        if (e.target === modal || e.target.classList.contains('modal-label') || 
            e.target.classList.contains('modal-description') || e.target.tagName === 'H2' ||
            e.target.tagName === 'P') {
            closeGate(false);
        }
    });

    const checkCode = () => {
        const enteredCode = inputs.map(input => input.value).join('');
        
        if (enteredCode.length === 4) {
            if (enteredCode === INVITE_CODE) {
                // ═══════════════════════════════════════════════════════════════════
                // GATE UNLOCK ANIMATION SEQUENCE (US-005)
                // 1. Input pulse (200ms) - immediate tactile feedback
                // 2. Success flash (150ms) - green tint overlay
                // 3. Modal dissolve (250ms) - scale up + blur + fade
                // 4. Departure/transition - navigate to destination
                // Total: ~500ms from correct code to navigation start
                // ═══════════════════════════════════════════════════════════════════
                
                // Step 1: Input container pulse
                const inputsContainer = document.querySelector('.cv-modal-inputs');
                if (inputsContainer) {
                    inputsContainer.classList.remove('pulse-energy');
                    void inputsContainer.offsetWidth;
                    inputsContainer.classList.add('pulse-energy');
                }
                
                markGateAccess('cv');

                setStableTimeout(() => {
                    closeGate(false, { restoreFocus: false });
                    navigateWithTransition('cv.html', NAV_STATES.INTERNAL, {
                        transitionStyle: 'gate-success',
                        exitMs: 180,
                        enterMs: 320,
                        readyFallbackMs: 700
                    });
                }, 140);
                
            } else {
                // Failure - clear inputs
                setTimeout(() => {
                    inputs.forEach(input => input.value = '');
                    inputs[0].focus();
                }, 150);
            }
        }
    };

    // --- Event Listeners ---

    trigger.addEventListener('click', openGate);

    // Auto-open check (e.g. navimodald from portfolio page)
    if (consumeGateRequest('cv')) {
        // Small delay to allow page init
        setTimeout(() => openGate(), 300);
    }

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeGate();
        }
    });
    
    // Close when overlay is clicked (dismiss event from modal-overlay.js)
    document.addEventListener('modal-overlay-dismiss', (e) => {
        if (isOpen) {
            const instant = e.detail?.instant || false;
            closeGate(instant);
        }
    });

    inputs.forEach((input, index) => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (input.value === '') {
                    if (index > 0) {
                        inputs[index - 1].focus();
                    } else {
                        // Backspace on empty first input closes modal
                        closeGate();
                    }
                }
            }
        });

        input.addEventListener('input', (e) => {
            const val = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(val)) {
                e.target.value = val.replace(/\D/g, '');
                return;
            }

            if (val.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                } else {
                    // Last digit entered
                    checkCode();
                }
            } else if (val.length > 1) {
                // Handle paste or fast typing
                const chars = val.split('');
                e.target.value = chars[0];
                let nextIndex = index + 1;
                for (let i = 1; i < chars.length && nextIndex < inputs.length; i++) {
                    inputs[nextIndex].value = chars[i];
                    nextIndex++;
                }
                if (nextIndex < inputs.length) {
                    inputs[nextIndex].focus();
                } else {
                    checkCode();
                }
            }
        });
        
        // Prevent default navigation
        input.addEventListener('focus', () => {
            // Optional: Select all on focus
            input.select();
        });
    });
}
