// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        PASSWORD GATE (CV PROTECTION)                         ║
// ║    4-digit password input that swaps with logo, validates code (1111)       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const CORRECT_CODE = '1111';
let isActive = false;
let passwordInputContainer = null;
let digitInputs = [];

/**
 * Create the 4-digit password input HTML structure
 */
function createPasswordGate() {
  const container = document.createElement('div');
  container.id = 'password-gate';
  container.className = 'password-gate';
  container.innerHTML = `
    <div class="password-gate__inputs">
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="0" />
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="1" />
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="2" />
      <input type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" class="password-gate__digit" data-index="3" />
    </div>
  `;
  
  document.body.appendChild(container);
  return container;
}

/**
 * Show password gate (hide logo, show inputs with animation)
 */
export function showPasswordGate() {
  if (isActive) return;
  isActive = true;
  
  // Create password input if it doesn't exist
  if (!passwordInputContainer) {
    passwordInputContainer = createPasswordGate();
    digitInputs = Array.from(passwordInputContainer.querySelectorAll('.password-gate__digit'));
    setupDigitInputs();
  }
  
  const logo = document.querySelector('.hero__text');
  
  // Trigger animations
  if (logo) {
    logo.classList.add('password-gate-swap-out');
  }
  passwordInputContainer.classList.add('password-gate-active');
  
  // Focus first input after animation
  setTimeout(() => {
    digitInputs[0]?.focus();
  }, 300);
  
  // Add keyboard listener for ESC/BACKSPACE to exit
  document.addEventListener('keydown', handleGlobalKeydown);
}

/**
 * Hide password gate (show logo, hide inputs with animation)
 */
export function hidePasswordGate() {
  if (!isActive) return;
  isActive = false;
  
  const logo = document.querySelector('.hero__text');
  
  // Reverse animations
  if (logo) {
    logo.classList.remove('password-gate-swap-out');
  }
  if (passwordInputContainer) {
    passwordInputContainer.classList.remove('password-gate-active');
  }
  
  // Clear inputs
  clearDigits();
  
  // Remove keyboard listener
  document.removeEventListener('keydown', handleGlobalKeydown);
}

/**
 * Clear all digit inputs
 */
function clearDigits() {
  digitInputs.forEach(input => {
    input.value = '';
  });
  digitInputs[0]?.focus();
}

/**
 * Setup digit input behavior (auto-advance, validation)
 */
function setupDigitInputs() {
  digitInputs.forEach((input, index) => {
    // Handle input
    input.addEventListener('input', (e) => {
      const value = e.target.value;
      
      // Only allow single digits
      if (value.length > 1) {
        e.target.value = value.slice(-1);
      }
      
      // Only allow numbers
      if (!/^\d*$/.test(e.target.value)) {
        e.target.value = '';
        return;
      }
      
      // Auto-advance to next input
      if (e.target.value.length === 1 && index < digitInputs.length - 1) {
        digitInputs[index + 1].focus();
      }
      
      // Check if all 4 digits are filled
      if (index === digitInputs.length - 1 && e.target.value.length === 1) {
        validateCode();
      }
    });
    
    // Handle backspace navigation
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        digitInputs[index - 1].focus();
      }
    });
    
    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      
      pastedData.split('').forEach((digit, i) => {
        if (digitInputs[i]) {
          digitInputs[i].value = digit;
        }
      });
      
      if (pastedData.length === 4) {
        validateCode();
      } else if (pastedData.length > 0) {
        digitInputs[Math.min(pastedData.length, digitInputs.length - 1)].focus();
      }
    });
  });
}

/**
 * Validate the entered code
 */
function validateCode() {
  const enteredCode = digitInputs.map(input => input.value).join('');
  
  if (enteredCode === CORRECT_CODE) {
    // Correct code: green flash, then navigate
    flashPage('success');
    setTimeout(() => {
      window.location.href = 'cv.html';
    }, 800);
  } else {
    // Wrong code: red flash, clear inputs
    flashPage('error');
    setTimeout(() => {
      clearDigits();
    }, 500);
  }
}

/**
 * Flash the entire page (success = green, error = red)
 */
function flashPage(type) {
  const overlay = document.createElement('div');
  overlay.className = `page-flash page-flash--${type}`;
  document.body.appendChild(overlay);
  
  // Trigger animation
  requestAnimationFrame(() => {
    overlay.classList.add('page-flash--active');
  });
  
  // Remove after animation
  setTimeout(() => {
    overlay.classList.remove('page-flash--active');
    setTimeout(() => {
      overlay.remove();
    }, 300);
  }, type === 'success' ? 600 : 300);
}

/**
 * Handle global keydown (ESC/BACKSPACE to exit when no input is focused)
 */
function handleGlobalKeydown(e) {
  // Only handle ESC or BACKSPACE when not in an input (or when first input is empty)
  const isInInput = digitInputs.some(input => input === document.activeElement);
  const firstInputEmpty = !digitInputs[0].value;
  
  if (e.key === 'Escape' || (e.key === 'Backspace' && (!isInInput || (isInInput && firstInputEmpty && document.activeElement === digitInputs[0])))) {
    e.preventDefault();
    hidePasswordGate();
  }
}

/**
 * Initialize password gate (attach to trigger link)
 */
export function initPasswordGate() {
  const trigger = document.getElementById('cv-gate-trigger');
  
  if (trigger) {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      showPasswordGate();
    });
  }
}

