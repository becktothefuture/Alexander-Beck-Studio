// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         GATE BLUR OVERLAY SYSTEM                            ║
// ║  Centralized overlay controller for password gates with backdrop blur      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let overlayElement = null;
let isEnabled = true;

/**
 * Initialize the gate overlay system with config values
 * @param {Object} config - Configuration object with overlay settings
 */
export function initGateOverlay(config) {
    overlayElement = document.getElementById('gate-overlay');
    
    if (!overlayElement) {
        console.warn('Gate Overlay: #gate-overlay element not found');
        return;
    }
    
    // Check if overlay is enabled
    isEnabled = config.gateOverlayEnabled !== false;
    
    if (!isEnabled) {
        console.log('Gate Overlay: Disabled by config');
        overlayElement.style.display = 'none';
        return;
    }
    
    // Inject CSS custom properties from config
    const opacity = config.gateOverlayOpacity ?? 0.1;
    const blurPx = config.gateOverlayBlurPx ?? 10;
    const transitionMs = config.gateOverlayTransitionMs ?? 400;
    
    overlayElement.style.setProperty('--gate-overlay-opacity', opacity);
    overlayElement.style.setProperty('--gate-overlay-blur', `${blurPx}px`);
    overlayElement.style.setProperty('--gate-overlay-transition-duration', `${transitionMs}ms`);
    
    console.log(`Gate Overlay: Initialized (opacity: ${opacity}, blur: ${blurPx}px, transition: ${transitionMs}ms)`);
}

/**
 * Show the overlay with fade-in and blur animation
 */
export function showOverlay() {
    if (!overlayElement || !isEnabled) return;
    
    // Remove hidden state
    overlayElement.setAttribute('aria-hidden', 'false');
    
    // Force reflow to ensure transition runs
    void overlayElement.offsetWidth;
    
    // Add active class to trigger transition
    overlayElement.classList.add('active');
}

/**
 * Hide the overlay with fade-out and blur removal
 */
export function hideOverlay() {
    if (!overlayElement || !isEnabled) return;
    
    // Remove active class to trigger reverse transition
    overlayElement.classList.remove('active');
    overlayElement.setAttribute('aria-hidden', 'true');
}

/**
 * Check if overlay is currently active
 * @returns {boolean} True if overlay is visible
 */
export function isOverlayActive() {
    if (!overlayElement) return false;
    return overlayElement.classList.contains('active');
}

