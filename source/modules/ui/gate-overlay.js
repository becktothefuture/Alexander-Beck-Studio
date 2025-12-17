// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         GATE BLUR OVERLAY SYSTEM                            ║
// ║  Centralized overlay controller for password gates with backdrop blur      ║
// ║  Click on overlay dismisses active gate (dispatches 'gate-overlay-dismiss') ║
// ║  Blur is automatically calculated as half of wall thickness                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

let overlayElement = null;
let isEnabled = true;

/**
 * Get wall thickness from CSS variable or state
 */
function getWallThickness() {
    try {
        const style = getComputedStyle(document.documentElement);
        const thickness = style.getPropertyValue('--wall-thickness').trim();
        if (thickness) {
            return parseFloat(thickness) || 12; // Fallback to 12px
        }
    } catch (e) {}
    
    // Fallback to state
    const g = getGlobals();
    return g?.wallThickness || 12;
}

/**
 * Calculate and update blur based on wall thickness
 */
function updateBlurFromWallThickness() {
    if (!overlayElement) return;
    const wallThickness = getWallThickness();
    const blurPx = wallThickness / 2;
    overlayElement.style.setProperty('--gate-overlay-blur', `${blurPx}px`);
}

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
    
    // Ensure overlay is visible (not display: none) when enabled
    overlayElement.style.display = '';
    
    // Inject CSS custom properties from config
    const opacity = config.gateOverlayOpacity ?? 0.01;
    const transitionMs = config.gateOverlayTransitionMs ?? 400;
    const transitionOutMs = config.gateOverlayTransitionOutMs ?? 250;
    const contentDelayMs = config.gateOverlayContentDelayMs ?? 200;
    
    // Depth effect settings
    const depthScale = config.gateDepthScale ?? 0.96;
    const depthY = config.gateDepthTranslateY ?? 8;
    
    // Logo opacity settings (fade when gate is active)
    const logoOpacityInactive = config.logoOpacityInactive ?? 1;
    const logoOpacityActive = config.logoOpacityActive ?? 0.2;
    
    // Logo blur settings (blur when gate is active)
    const logoBlurInactive = config.logoBlurInactive ?? 0;
    const logoBlurActive = config.logoBlurActive ?? 12;
    
    // Set depth variables on root so they are available to all scene elements
    const root = document.documentElement;
    root.style.setProperty('--gate-depth-scale', depthScale);
    root.style.setProperty('--gate-depth-translate-y', `${depthY}px`);
    root.style.setProperty('--gate-depth-duration', `${transitionMs}ms`);
    root.style.setProperty('--gate-depth-out-duration', `${transitionOutMs}ms`);
    root.style.setProperty('--gate-content-delay', `${contentDelayMs}ms`);
    
    // Set logo opacity variables
    root.style.setProperty('--logo-opacity-inactive', logoOpacityInactive);
    root.style.setProperty('--logo-opacity-active-target', logoOpacityActive); // Store target
    root.style.setProperty('--logo-opacity-active', logoOpacityInactive); // Start at inactive
    
    // Set logo blur variables
    root.style.setProperty('--logo-blur-inactive', `${logoBlurInactive}px`);
    root.style.setProperty('--logo-blur-active-target', `${logoBlurActive}px`); // Store target
    root.style.setProperty('--logo-blur-active', `${logoBlurInactive}px`); // Start at inactive
    
    // Blur is calculated as half of wall thickness (not from config)
    updateBlurFromWallThickness();
    
    overlayElement.style.setProperty('--gate-overlay-opacity', opacity);
    overlayElement.style.setProperty('--gate-overlay-transition-duration', `${transitionMs}ms`);
    overlayElement.style.setProperty('--gate-overlay-transition-out-duration', `${transitionOutMs}ms`);
    
    // Ensure initial state: not active, pointer-events: none
    overlayElement.classList.remove('active');
    overlayElement.setAttribute('aria-hidden', 'true');
    
    // Click on overlay dismisses active gate
    overlayElement.addEventListener('click', handleOverlayClick);
    
    // Listen for layout changes to update blur
    window.addEventListener('resize', updateBlurFromWallThickness);
    
    // Also listen for custom layout update events if they exist
    document.addEventListener('layout-updated', updateBlurFromWallThickness);
    
    const blurPx = getWallThickness() / 2;
    console.log(`Gate Overlay: Initialized (opacity: ${opacity}, blur: ${blurPx}px [auto from wall thickness], transition: ${transitionMs}ms, logo: opacity ${logoOpacityInactive}→${logoOpacityActive}, blur ${logoBlurInactive}px→${logoBlurActive}px)`);
}

/**
 * Handle click on overlay - dispatch dismiss event for gates to listen
 */
function handleOverlayClick(e) {
    // Ignore clicks on interactive elements within gates (buttons, inputs, etc.)
    if (e.target.closest('button')) return;
    if (e.target.closest('input')) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('select')) return;
    if (e.target.closest('textarea')) return;
    
    // Accept clicks on overlay OR gate containers (but not their interactive children)
    // This handles cases where gates are above overlay in z-index
    const isGateContainer = e.target.id === 'cv-gate' || 
                           e.target.id === 'portfolio-gate' || 
                           e.target.id === 'contact-gate' ||
                           e.target.classList.contains('gate-label') ||
                           e.target.classList.contains('gate-description');
    
    if (e.target === overlayElement || isGateContainer) {
        // Dispatch custom event with instant flag
        document.dispatchEvent(new CustomEvent('gate-overlay-dismiss', { detail: { instant: true } }));
    }
}

/**
 * Apply depth effect by setting CSS variables on root
 * All depth-affected elements include these variables in their transform chains
 * @param {boolean} active - Whether to apply the depth effect
 */
function applyDepthEffect(active) {
    const root = document.documentElement;
    const scene = document.getElementById('abs-scene');
    
    if (active) {
        // Get depth values from existing CSS vars or use defaults
        const scale = getComputedStyle(root).getPropertyValue('--gate-depth-scale').trim() || '0.96';
        const ty = getComputedStyle(root).getPropertyValue('--gate-depth-translate-y').trim() || '8px';
        const logoOpacityActive = getComputedStyle(root).getPropertyValue('--logo-opacity-active-target').trim() 
                                 || root.style.getPropertyValue('--logo-opacity-active-target') 
                                 || '0.2';
        const logoBlurActive = getComputedStyle(root).getPropertyValue('--logo-blur-active-target').trim() 
                             || root.style.getPropertyValue('--logo-blur-active-target') 
                             || '12px';
        
        root.style.setProperty('--gate-depth-scale-active', scale);
        root.style.setProperty('--gate-depth-ty-active', ty);
        root.style.setProperty('--logo-opacity-active', logoOpacityActive);
        root.style.setProperty('--logo-blur-active', logoBlurActive);
        
        // Add class to scene wrapper for IN duration timing sync
        if (scene) scene.classList.add('gate-depth-active');
    } else {
        // Reset to identity (no effect)
        const logoOpacityInactive = getComputedStyle(root).getPropertyValue('--logo-opacity-inactive').trim() || '1';
        const logoBlurInactive = getComputedStyle(root).getPropertyValue('--logo-blur-inactive').trim() || '0px';
        
        root.style.setProperty('--gate-depth-scale-active', '1');
        root.style.setProperty('--gate-depth-ty-active', '0px');
        root.style.setProperty('--logo-opacity-active', logoOpacityInactive);
        root.style.setProperty('--logo-blur-active', logoBlurInactive);
        
        // Remove class from scene wrapper to use OUT duration timing
        if (scene) scene.classList.remove('gate-depth-active');
    }
}

/**
 * Show the overlay with smooth blur animation
 */
export function showOverlay() {
    if (!overlayElement || !isEnabled) return;
    
    // Ensure blur CSS variable is current
    updateBlurFromWallThickness();
    
    // Remove hidden state
    overlayElement.setAttribute('aria-hidden', 'false');
    
    // Force reflow to ensure transition runs
    void overlayElement.offsetWidth;
    
    // Add active class to trigger CSS transition
    overlayElement.classList.add('active');
    
    // Transform cursor to larger transparent circle
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        // On mobile, don't force-show the custom cursor inside dialogs.
        // (It can appear as an odd floating circle while the keyboard opens.)
        let isMobileViewport = false;
        try {
            isMobileViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
        } catch (e) {}

        if (isMobileViewport) {
            cursor.classList.remove('gate-active');
            cursor.style.display = 'none';
        } else {
            cursor.classList.add('gate-active');
            cursor.style.display = 'block';
        }
    }
    
    // Apply depth effect to scene
    applyDepthEffect(true);
}

/**
 * Hide the overlay with smooth blur animation
 */
export function hideOverlay() {
    if (!overlayElement || !isEnabled) return;
    
    // Remove active class to trigger CSS transition back to 0
    overlayElement.classList.remove('active');
    overlayElement.setAttribute('aria-hidden', 'true');
    
    // Restore normal cursor
    const cursor = document.getElementById('custom-cursor');
    if (cursor) cursor.classList.remove('gate-active');
    
    // Remove depth effect from scene
    applyDepthEffect(false);
}

/**
 * Check if overlay is currently active
 * @returns {boolean} True if overlay is visible
 */
export function isOverlayActive() {
    if (!overlayElement) return false;
    return overlayElement.classList.contains('active');
}

/**
 * Update overlay blur (recalculates from wall thickness)
 * Called when layout changes
 */
export function updateOverlayBlur() {
    updateBlurFromWallThickness();
}

/**
 * Update overlay opacity value (for live control panel adjustment)
 */
export function updateOverlayOpacity(opacity) {
    if (!overlayElement) return;
    overlayElement.style.setProperty('--gate-overlay-opacity', opacity);
}

/**
 * Update overlay transition duration (for live control panel adjustment)
 */
export function updateOverlayTransition(transitionMs) {
    if (!overlayElement) return;
    overlayElement.style.setProperty('--gate-overlay-transition-duration', `${transitionMs}ms`);
    document.documentElement.style.setProperty('--gate-depth-duration', `${transitionMs}ms`);
}

/**
 * Update overlay transition-out duration (for live control panel adjustment)
 */
export function updateOverlayTransitionOut(transitionMs) {
    if (!overlayElement) return;
    overlayElement.style.setProperty('--gate-overlay-transition-out-duration', `${transitionMs}ms`);
    document.documentElement.style.setProperty('--gate-depth-out-duration', `${transitionMs}ms`);
}

/**
 * Update depth scale (for live control panel adjustment)
 */
export function updateGateDepthScale(scale) {
    document.documentElement.style.setProperty('--gate-depth-scale', scale);
}

/**
 * Update content delay (for live control panel adjustment)
 */
export function updateGateContentDelay(ms) {
    document.documentElement.style.setProperty('--gate-content-delay', `${ms}ms`);
}


/**
 * Update depth translate Y (for live control panel adjustment)
 */
export function updateGateDepthTranslateY(px) {
    document.documentElement.style.setProperty('--gate-depth-translate-y', `${px}px`);
}

/**
 * Update logo opacity when inactive (for live control panel adjustment)
 */
export function updateLogoOpacityInactive(opacity) {
    const root = document.documentElement;
    root.style.setProperty('--logo-opacity-inactive', opacity);
    // If gate is inactive, apply immediately
    if (!isOverlayActive()) {
        root.style.setProperty('--logo-opacity-active', opacity);
    }
}

/**
 * Update logo opacity when active (for live control panel adjustment)
 */
export function updateLogoOpacityActive(opacity) {
    const root = document.documentElement;
    // Store the target active opacity
    const storedOpacity = opacity;
    root.style.setProperty('--logo-opacity-active-target', storedOpacity);
    // If gate is active, apply immediately
    if (isOverlayActive()) {
        root.style.setProperty('--logo-opacity-active', storedOpacity);
    }
}

/**
 * Update logo blur when inactive (for live control panel adjustment)
 */
export function updateLogoBlurInactive(px) {
    const root = document.documentElement;
    root.style.setProperty('--logo-blur-inactive', `${px}px`);
    // If gate is inactive, apply immediately
    if (!isOverlayActive()) {
        root.style.setProperty('--logo-blur-active', `${px}px`);
    }
}

/**
 * Update logo blur when active (for live control panel adjustment)
 */
export function updateLogoBlurActive(px) {
    const root = document.documentElement;
    root.style.setProperty('--logo-blur-active-target', `${px}px`);
    // If gate is active, apply immediately
    if (isOverlayActive()) {
        root.style.setProperty('--logo-blur-active', `${px}px`);
    }
}
