/**
 * Portfolio Gate Controller
 * Handles the password protection UI for the portfolio section.
 */

import { showOverlay, hideOverlay, mountGateIntoOverlay, unmountGateFromOverlay } from './gate-overlay.js';
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

export function initPortfolioGate() {
    const trigger = document.getElementById('portfolio-gate-trigger');
    const logo = document.getElementById('brand-logo');
    const gate = document.getElementById('portfolio-gate');
    const cvGate = document.getElementById('cv-gate'); // Get CV gate to check/close if open
    const contactGate = document.getElementById('contact-gate'); // Get contact gate to check/close if open
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    const pageFlash = document.getElementById('page-flash');
    const gateLabel = document.getElementById('portfolio-gate-label');
    
    // Correct Code
    const CODE = '1234';
    
    if (!trigger || !logo || !gate || inputs.length === 0) {
        console.warn('Portfolio Gate: Missing required elements');
        return;
    }
    
    const BACK_TEXT = getText('gates.common.backText', 'BACK');
    const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
    const TITLE = getText('gates.portfolio.title', 'View Portfolio');
    const DESC = getText(
        'gates.portfolio.description',
        "Good work deserves good context. This small step ensures you're here with intention, not just browsing. Quality takes time—yours and mine."
    );

    // Set label text if element exists
    if (gateLabel) {
        gateLabel.innerHTML = `
            <div class="gate-nav">
                <button type="button" class="gate-back" data-gate-back aria-label="${BACK_ARIA}">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>${BACK_TEXT}</span>
                </button>
            </div>
            <h2 class="gate-title">${TITLE}</h2>
            <p class="gate-description">${DESC}</p>
        `;
    }
    
    // Create page-flash element if it doesn't exist
    const flash = pageFlash || createPageFlash();

    // State
    let isOpen = false;

    // Helper to check if any gate is currently active
    const isAnyGateActive = () => {
        return (gate && gate.classList.contains('active')) ||
               (cvGate && cvGate.classList.contains('active')) ||
               (contactGate && contactGate.classList.contains('active'));
    };

    // --- Actions ---

    const openGate = (e) => {
        e.preventDefault();
        
        // Check if any other gate is currently open
        const wasAnyGateActive = isAnyGateActive();
        
        // Close CV gate if it's open
        if (cvGate && cvGate.classList.contains('active')) {
            cvGate.classList.remove('active');
            cvGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                cvGate.classList.add('hidden');
                unmountGateFromOverlay(cvGate);
            }, 400);
        }

        // Close contact gate if it's open (keep gates mutually exclusive)
        if (contactGate && contactGate.classList.contains('active')) {
            contactGate.classList.remove('active');
            contactGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                contactGate.classList.add('hidden');
                unmountGateFromOverlay(contactGate);
            }, 400);
        }
        
        isOpen = true;
        
        // Show overlay only if no gate was previously active
        if (!wasAnyGateActive) {
            showOverlay();
        }
        
        // Animate Logo Out (Up)
        logo.classList.add('fade-out-up');

        // Modal: mount gate inside overlay flex container
        mountGateIntoOverlay(gate);

        // Animate Gate In (Up)
        gate.classList.remove('hidden');
        gate.setAttribute('aria-hidden', 'false');
        // Force reflow
        void gate.offsetWidth; 
        gate.classList.add('active');
        
        // Focus first input
        inputs[0].focus();
    };

    const closeGate = (instant = false) => {
        isOpen = false;
        
        // Clear inputs
        inputs.forEach(input => input.value = '');
        
        if (instant) {
            // Instant close: disable transition, remove active, then re-enable
            gate.style.transition = 'none';
            logo.style.transition = 'none';
            
        gate.classList.remove('active');
        gate.setAttribute('aria-hidden', 'true');
            gate.classList.add('hidden');
            unmountGateFromOverlay(gate);
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
            if (!isOpen) {
                gate.classList.add('hidden');
                unmountGateFromOverlay(gate);
            }
            
                // Hide overlay if no other gate is now active
                if (!isAnyGateActive()) {
                    hideOverlay();
                }
        }, 400); // Match transition time
        }
    };

    // Back button closes gate (matches new UI pattern)
    try {
        const backBtn = gateLabel?.querySelector?.('[data-gate-back]');
        if (backBtn) backBtn.addEventListener('click', closeGate);
    } catch (e) {}
    
    // Click on gate background (not on inputs) also closes instantly
    gate.addEventListener('click', (e) => {
        // Only close if clicking the gate container itself or non-interactive areas
        if (e.target === gate || e.target.classList.contains('gate-label') || 
            e.target.classList.contains('gate-description') || e.target.tagName === 'H2' ||
            e.target.tagName === 'P') {
            closeGate(true);
        }
    });

    const checkCode = () => {
        const enteredCode = inputs.map(input => input.value).join('');
        
        if (enteredCode.length === 4) {
            if (enteredCode === CODE) {
                // Success - Green flash, then redirect
                triggerFlash(flash, 'success');
                setTimeout(() => {
                    // TODO: Update with actual portfolio URL when ready
                    window.location.href = 'portfolio.html';
                }, 500);
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

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeGate();
        }
    });
    
    // Close when overlay is clicked (dismiss event from gate-overlay.js)
    document.addEventListener('gate-overlay-dismiss', (e) => {
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
                        // Backspace on empty first input closes gate
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



