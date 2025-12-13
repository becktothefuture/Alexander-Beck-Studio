/**
 * Portfolio Gate Controller
 * Handles the password protection UI for the portfolio section.
 */

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
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    const pageFlash = document.getElementById('page-flash');
    const gateLabel = document.getElementById('portfolio-gate-label');
    
    // Correct Code
    const CODE = '1234';
    
    if (!trigger || !logo || !gate || inputs.length === 0) {
        console.warn('Portfolio Gate: Missing required elements');
        return;
    }
    
    // Set label text if element exists
    if (gateLabel) {
        gateLabel.innerHTML = `
            <h2 class="gate-title">View Portfolio</h2>
            <p class="gate-description">Good work deserves good context. This small step ensures you're here with intention, not just browsing. Quality takes time—yours and mine.</p>
        `;
    }
    
    // Create page-flash element if it doesn't exist
    const flash = pageFlash || createPageFlash();

    // State
    let isOpen = false;

    // --- Actions ---

    const openGate = (e) => {
        e.preventDefault();
        
        // Close CV gate if it's open
        if (cvGate && cvGate.classList.contains('active')) {
            cvGate.classList.remove('active');
            setTimeout(() => {
                cvGate.classList.add('hidden');
            }, 400);
        }
        
        isOpen = true;
        
        // Animate Logo Out (Up)
        logo.classList.add('fade-out-up');
        
        // Animate Gate In (Up)
        gate.classList.remove('hidden');
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
        
        // Animate Logo In (Down)
        logo.classList.remove('fade-out-up');
        
        setTimeout(() => {
            if (!isOpen) gate.classList.add('hidden');
        }, 400); // Match transition time
    };

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



