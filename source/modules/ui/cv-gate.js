/**
 * CV Gate Controller
 * Handles the password protection UI for the CV download.
 */

export function initCVGate() {
    const trigger = document.getElementById('cv-gate-trigger');
    const logo = document.getElementById('brand-logo');
    const gate = document.getElementById('cv-gate');
    const inputs = Array.from(document.querySelectorAll('.cv-digit'));
    const body = document.body;
    
    // Correct Code
    const CODE = '1111';
    
    if (!trigger || !logo || !gate || inputs.length === 0) {
        console.warn('CV Gate: Missing required elements');
        return;
    }

    // State
    let isOpen = false;

    // --- Actions ---

    const openGate = (e) => {
        e.preventDefault();
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
                // Success
                body.classList.add('flash-green');
                setTimeout(() => {
                    window.location.href = 'cv-test.html';
                }, 400);
            } else {
                // Failure
                body.classList.add('flash-red');
                setTimeout(() => {
                    body.classList.remove('flash-red');
                    inputs.forEach(input => input.value = '');
                    inputs[0].focus();
                }, 400);
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



