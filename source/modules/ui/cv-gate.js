/**
 * CV Gate Controller
 * Handles the password protection UI for the CV download.
 */

import { showOverlay, hideOverlay } from './gate-overlay.js';

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

export function initCVGate() {
    const trigger = document.getElementById('cv-gate-trigger');
    const logo = document.getElementById('brand-logo');
    const gate = document.getElementById('cv-gate');
    const portfolioGate = document.getElementById('portfolio-gate'); // Get portfolio gate to check/close if open
    const contactGate = document.getElementById('contact-gate'); // Get contact gate to check/close if open
    const inputs = Array.from(document.querySelectorAll('.cv-digit'));
    const pageFlash = document.getElementById('page-flash');
    const gateLabel = document.getElementById('cv-gate-label');
    
    // Correct Code
    const CODE = '1111';
    
    if (!trigger || !logo || !gate || inputs.length === 0) {
        console.warn('CV Gate: Missing required elements');
        return;
    }
    
    // Set label text if element exists
    if (gateLabel) {
        gateLabel.innerHTML = `
            <div class="gate-nav">
                <button type="button" class="gate-back" data-gate-back aria-label="Back">
                    <i class="ti ti-arrow-left" aria-hidden="true"></i>
                    <span>BACK</span>
                </button>
            </div>
            <h2 class="gate-title">Download Bio/CV</h2>
            <p class="gate-description">Because spam bots don't deserve nice things—and neither do recruiters who don't read portfolios. This keeps my inbox slightly more civilized.</p>
        `;
    }
    
    // Create page-flash element if it doesn't exist
    const flash = pageFlash || createPageFlash();

    // State
    let isOpen = false;

    // Helper to check if any gate is currently active
    const isAnyGateActive = () => {
        return (gate && gate.classList.contains('active')) ||
               (portfolioGate && portfolioGate.classList.contains('active')) ||
               (contactGate && contactGate.classList.contains('active'));
    };

    // --- Actions ---

    const openGate = (e) => {
        e.preventDefault();
        
        // Check if any other gate is currently open
        const wasAnyGateActive = isAnyGateActive();
        
        // Close portfolio gate if it's open
        if (portfolioGate && portfolioGate.classList.contains('active')) {
            portfolioGate.classList.remove('active');
            portfolioGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                portfolioGate.classList.add('hidden');
            }, 400);
        }

        // Close contact gate if it's open (keep gates mutually exclusive)
        if (contactGate && contactGate.classList.contains('active')) {
            contactGate.classList.remove('active');
            contactGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                contactGate.classList.add('hidden');
            }, 400);
        }
        
        isOpen = true;
        
        // Show overlay only if no gate was previously active
        if (!wasAnyGateActive) {
            showOverlay();
        }
        
        // Animate Logo Out (Up)
        logo.classList.add('fade-out-up');
        
        // Animate Gate In (Up)
        gate.classList.remove('hidden');
        gate.setAttribute('aria-hidden', 'false');
        // Force reflow
        void gate.offsetWidth; 
        gate.classList.add('active');
        
        // Focus first input
        inputs[0].focus();
    };

    const closeGate = () => {
        isOpen = false;
        
        // Clear inputs
        inputs.forEach(input => input.value = '');
        
        // Animate Gate Out (Down)
        gate.classList.remove('active');
        gate.setAttribute('aria-hidden', 'true');
        
        // Animate Logo In (Down)
        logo.classList.remove('fade-out-up');
        
        setTimeout(() => {
            if (!isOpen) gate.classList.add('hidden');
            
            // Hide overlay only if no other gate is now active
            // Small delay to let state settle after closing
            setTimeout(() => {
                if (!isAnyGateActive()) {
                    hideOverlay();
                }
            }, 50);
        }, 400); // Match transition time
    };

    // Back button closes gate (matches new UI pattern)
    try {
        const backBtn = gateLabel?.querySelector?.('[data-gate-back]');
        if (backBtn) backBtn.addEventListener('click', closeGate);
    } catch (e) {}

    const checkCode = () => {
        const enteredCode = inputs.map(input => input.value).join('');
        
        if (enteredCode.length === 4) {
            if (enteredCode === CODE) {
                // Success - Green flash, then redirect
                triggerFlash(flash, 'success');
                setTimeout(() => {
                    window.location.href = 'cv.html';
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

    // Close on Escape or click outside (optional, sticking to ESC for now)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) {
            closeGate();
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



