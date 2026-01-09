/**
 * CV Modal Controller
 * Handles the password-gating UI for the CV download.
 */

import { showOverlay, hideOverlay, mountModalIntoOverlay, unmountModalFromOverlay } from './modal-overlay.js';
import { getText } from '../utils/text-loader.js';

/**
 * Create the page flash overlay element if it doesn't exist
 */
function createPageFlash() {
    const flash = document.createElement('div');
    flash.id = 'page-flash';
    flash.className = 'page-flash';
    flash.setAttribute('aria-hidden', 'true');
    document.body.appendChild(flash);
    return flash;
}

/**
 * Trigger a flash effect on the page
 * @param {HTMLElement} flashEl - The flash overlay element
 * @param {'success' | 'error'} type - The type of flash
 */
function triggerFlash(flashEl, type) {
    // Remove any existing flash classes
    flashEl.classList.remove('page-flash--success', 'page-flash--error');
    
    // Force reflow to restart animation
    void flashEl.offsetWidth;
    
    // Add the appropriate class
    flashEl.classList.add(`page-flash--${type}`);
    
    // Remove after animation completes
    const duration = type === 'success' ? 600 : 300;
    setTimeout(() => {
        flashEl.classList.remove(`page-flash--${type}`);
    }, duration);
}

export function initCVModal() {
    const trigger = document.getElementById('cv-modal-trigger');
    const logo = document.getElementById('brand-logo');
    const modal = document.getElementById('cv-modal');
    const portfolioGate = document.getElementById('portfolio-modal'); // Get portfolio modal to check/close if open
    const contactGate = document.getElementById('contact-modal'); // Get contact modal to check/close if open
    const inputs = Array.from(document.querySelectorAll('.cv-digit'));
    const pageFlash = document.getElementById('page-flash');
    const modalLabel = document.getElementById('cv-modal-label');
    
    // Correct Code
    const CODE = '1111';
    
    if (!trigger || !logo || !modal || inputs.length === 0) {
        console.warn('CV Gate: Missing required elements');
        return;
    }

    if (modal.dataset.modalInitialized === 'true') return;
    modal.dataset.modalInitialized = 'true';
    
    const BACK_TEXT = getText('modals.common.backText', 'BACK');
    const BACK_ARIA = getText('modals.common.backAriaLabel', 'Back');
    const TITLE = getText('modals.cv.title', 'Bio/CV');
    const DESC = getText(
        'modals.cv.description',
        "Because spam bots don't deserve nice things—and neither do recruiters who don't read portfolios. This keeps my inbox slightly more civilized."
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
            <h2 class="modal-title">${TITLE}</h2>
            <p class="modal-description">${DESC}</p>
        `;
    }
    
    // Create page-flash element if it doesn't exist
    const flash = pageFlash || createPageFlash();

    // State
    let isOpen = false;
    let lastOpenTime = 0;

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
        if (portfolioGate && portfolioGate.classList.contains('active')) {
            portfolioGate.classList.remove('active');
            portfolioGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                portfolioGate.classList.add('hidden');
                unmountModalFromOverlay(portfolioGate);
            }, 400);
        }

        // Close contact modal if it's open (keep modals mutually exclusive)
        if (contactGate && contactGate.classList.contains('active')) {
            contactGate.classList.remove('active');
            contactGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                contactGate.classList.add('hidden');
                unmountModalFromOverlay(contactGate);
            }, 400);
        }
        
        isOpen = true;
        lastOpenTime = Date.now();
        
        // Show overlay only if no modal was previously active
        if (!wasAnyGateActive) {
            showOverlay();
        }
        
        // Animate Logo Out (Up)
        logo.classList.add('fade-out-up');

        // Defer modal DOM operations to next frame to avoid interrupting overlay's backdrop-filter transition
        requestAnimationFrame(() => {
            // Modal: mount modal inside overlay flex container
            mountModalIntoOverlay(modal);

            // Animate Modal In (Up)
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            // Force reflow
            void modal.offsetWidth; 
            modal.classList.add('active');
            
            // Focus first input
            inputs[0].focus();
        });
    };

    const closeGate = (instant = false) => {
        // Close must be responsive immediately (Back/background/Escape).
        isOpen = false;
        
        // Clear inputs
        inputs.forEach(input => input.value = '');
        
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
            }, 1700); // Match transition time
        }
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
            if (enteredCode === CODE) {
                // Success - Pulse on inputs container
                const inputsContainer = document.querySelector('.cv-modal-inputs');
                if (inputsContainer) {
                    inputsContainer.classList.remove('pulse-energy');
                    void inputsContainer.offsetWidth;
                    inputsContainer.classList.add('pulse-energy');
                    
                    setTimeout(() => {
                        inputsContainer.classList.remove('pulse-energy');
                    }, 600);
                }
                
                // Smooth page fade-out + redirect
                setTimeout(() => {
                    document.body.classList.add('page-transitioning');
                    setTimeout(() => {
                        window.location.href = 'cv.html';
                    }, 300); // Fade-out duration
                }, 200); // Brief delay after pulse starts
                
            } else {
                // Failure - Red flash, clear inputs
                triggerFlash(flash, 'error');
                setTimeout(() => {
                    inputs.forEach(input => input.value = '');
                    inputs[0].focus();
                }, 350);
            }
        }
    };

    // --- Event Listeners ---

    trigger.addEventListener('click', openGate);

    // Auto-open check (e.g. navimodald from portfolio page)
    try {
        if (sessionStorage.getItem('abs_open_cv_modal')) {
            sessionStorage.removeItem('abs_open_cv_modal');
            // Small delay to allow page init
            setTimeout(() => openGate(), 300);
        }
    } catch (e) {}

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
