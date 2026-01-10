// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MODAL BLUR OVERLAY SYSTEM                            ║
// ║  Two-layer architecture: blur layer (isolated) + content layer (modals)      ║
// ║  Separating blur from content eliminates compositing conflicts              ║
// ║  Click on content layer dismisses active modal (modal-overlay-dismiss event)  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { readTokenMs, readTokenNumber, readTokenPx, readTokenVar } from '../utils/tokens.js';

// Two-layer references
let blurLayerElement = null;    // #modal-blur-layer - backdrop-filter only, no children
let contentLayerElement = null; // #modal-content-layer - holds modals, no blur
let modalHostElement = null;    // #modal-modal-host - inside content layer

let isEnabled = true;
let isInitialized = false;
const modalOriginalPlacement = new WeakMap();
let blurExplicitlySet = false; // Track if blur was set from config

function ensureModalHost() {
    if (!contentLayerElement) return null;
    if (modalHostElement && modalHostElement.isConnected) return modalHostElement;

    let host = document.getElementById('modal-modal-host');
    if (!host) {
        host = document.createElement('div');
        host.id = 'modal-modal-host';
        host.className = 'modal-modal-host';
        contentLayerElement.appendChild(host);
    }
    modalHostElement = host;
    return modalHostElement;
}

export function mountModalIntoOverlay(modalEl) {
    if (!contentLayerElement || !modalEl) return;
    const host = ensureModalHost();
    if (!host) return;

    if (!modalOriginalPlacement.has(modalEl)) {
        modalOriginalPlacement.set(modalEl, { parent: modalEl.parentNode, nextSibling: modalEl.nextSibling });
    }
    host.appendChild(modalEl);
}

export function unmountModalFromOverlay(modalEl) {
    if (!modalEl) return;
    const rec = modalOriginalPlacement.get(modalEl);
    if (!rec || !rec.parent) return;
    try {
        if (rec.nextSibling && rec.nextSibling.parentNode === rec.parent) {
            rec.parent.insertBefore(modalEl, rec.nextSibling);
        } else {
            rec.parent.appendChild(modalEl);
        }
    } catch (e) {}
}

/**
 * Get wall thickness from CSS variable or state
 */
function getWallThickness() {
    const thickness = readTokenVar('--wall-thickness', '');
    if (thickness && !/calc\(|vw|vh|vmin|vmax|%/i.test(thickness)) {
        const parsed = parseFloat(thickness);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    
    // Fallback to state
    const g = getGlobals();
    return g?.wallThickness || 12;
}

/**
 * Calculate and update blur based on wall thickness
 * Only updates if modalOverlayBlurPx is not explicitly set in config
 */
export function updateBlurFromWallThickness(reason = 'direct') {
    if (!blurLayerElement) return;
    
    // Only auto-calculate if blur was not explicitly set in config
    if (!blurExplicitlySet) {
        const wallThickness = getWallThickness();
        const blurPx = wallThickness / 4;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
    }
}

/**
 * Initialize the modal overlay system with config values
 * @param {Object} config - Configuration object with overlay settings
 */
export function initModalOverlay(config) {
    blurLayerElement = document.getElementById('modal-blur-layer');
    contentLayerElement = document.getElementById('modal-content-layer');
    
    if (!blurLayerElement || !contentLayerElement) {
        console.warn('Modal Overlay: #modal-blur-layer or #modal-content-layer not found');
        return;
    }
    
    // Check if overlay is enabled
    isEnabled = config.modalOverlayEnabled !== false;
    
    if (!isEnabled) {
        console.log('Modal Overlay: Disabled by config');
        blurLayerElement.style.display = 'none';
        contentLayerElement.style.display = 'none';
        return;
    }
    
    // Ensure layers are visible when enabled
    blurLayerElement.style.display = '';
    contentLayerElement.style.display = '';

    // Ensure modal host exists
    ensureModalHost();
    
    // Inject CSS custom properties from config
    const opacity = config.modalOverlayOpacity ?? readTokenNumber('--modal-overlay-opacity', 0.01);
    const transitionMs = config.modalOverlayTransitionMs ?? readTokenMs('--modal-overlay-transition-duration', 800);
    const transitionOutMs = config.modalOverlayTransitionOutMs ?? readTokenMs('--modal-overlay-transition-out-duration', 600);
    const contentDelayMs = config.modalOverlayContentDelayMs ?? readTokenMs('--modal-content-delay', 200);
    
    // Depth effect settings
    const depthScale = config.modalDepthScale ?? readTokenNumber('--modal-depth-scale', 0.96);
    const depthY = config.modalDepthTranslateY ?? readTokenPx('--modal-depth-translate-y', 8);
    
    // Logo blur settings (blur when modal is active)
    const logoBlurInactive = config.logoBlurInactive ?? readTokenPx('--logo-blur-inactive', 0);
    const logoBlurActive = config.logoBlurActive ?? readTokenPx('--logo-blur-active-target', 12);
    
    // Set depth variables on root so they are available to all scene elements
    const root = document.documentElement;
    root.style.setProperty('--modal-depth-scale', depthScale);
    root.style.setProperty('--modal-depth-translate-y', `${depthY}px`);
    root.style.setProperty('--modal-depth-duration', `${transitionMs}ms`);
    root.style.setProperty('--modal-depth-out-duration', `${transitionOutMs}ms`);
    root.style.setProperty('--modal-content-delay', `${contentDelayMs}ms`);
    
    // Set logo blur variables
    root.style.setProperty('--logo-blur-inactive', `${logoBlurInactive}px`);
    root.style.setProperty('--logo-blur-active-target', `${logoBlurActive}px`);
    root.style.setProperty('--logo-blur-active', `${logoBlurInactive}px`);
    
    // Set blur: use config value if provided, otherwise calculate from wall thickness
    if (config.modalOverlayBlurPx !== undefined) {
        blurExplicitlySet = true;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${config.modalOverlayBlurPx}px`);
    } else {
        blurExplicitlySet = false;
        updateBlurFromWallThickness('init');
    }

    // Idempotency check: if already initialized, just update config/blur and return
    if (isInitialized) return;
    isInitialized = true;

    // Set CSS variables on root for global access (modals, blur layer, etc.)
    root.style.setProperty('--modal-overlay-opacity', opacity);
    root.style.setProperty('--modal-overlay-transition-duration', `${transitionMs}ms`);
    root.style.setProperty('--modal-overlay-transition-out-duration', `${transitionOutMs}ms`);
    
    // Ensure initial state: not active
    blurLayerElement.classList.remove('active');
    contentLayerElement.classList.remove('active');
    blurLayerElement.setAttribute('aria-hidden', 'true');
    contentLayerElement.setAttribute('aria-hidden', 'true');
    
    // Explicitly ensure blur is cleared on initialization (no modal active)
    applyDepthEffect(false);
    
    // Click on content layer dismisses active modal
    contentLayerElement.addEventListener('click', handleOverlayClick, { capture: true });
    
    // Listen for layout changes to update blur
    window.addEventListener('resize', () => updateBlurFromWallThickness('resize'));
    
    // Also listen for custom layout update events if they exist
    document.addEventListener('layout-updated', () => updateBlurFromWallThickness('layout-updated'));
    
    const blurPx = getWallThickness() / 2;
    console.log(`Modal Overlay: Initialized (two-layer architecture, blur: ${blurPx}px, transition: ${transitionMs}ms)`);
}

/**
 * Handle click on content layer - dispatch dismiss event for modals to listen
 */
function handleOverlayClick(e) {
    // If layers are hidden or disabled, do nothing
    if (!isEnabled || !contentLayerElement.classList.contains('active')) {
        return;
    }

    // Ignore clicks on interactive elements within modals (buttons, inputs, etc.)
    if (e.target.closest('button')) return;
    if (e.target.closest('input')) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('select')) return;
    if (e.target.closest('textarea')) return;
    
    // Accept clicks on content layer, modal host, or modal containers (but not their interactive children)
    const isGateContainer = e.target.id === 'cv-modal' || 
                           e.target.id === 'portfolio-modal' || 
                           e.target.id === 'contact-modal' ||
                           e.target.classList.contains('modal-label') ||
                           e.target.classList.contains('modal-description');
    
    const isContentLayerSurface = e.target === contentLayerElement || e.target?.id === 'modal-modal-host';
    if (isContentLayerSurface || isGateContainer) {
        // Dispatch custom event with instant flag (false = smooth close)
        document.dispatchEvent(new CustomEvent('modal-overlay-dismiss', { detail: { instant: false } }));
    }
}

/**
 * Apply depth effect by setting CSS variables on root
 */
function applyDepthEffect(active) {
    const root = document.documentElement;
    const scene = document.getElementById('abs-scene');
    
    if (active) {
        const scale = getComputedStyle(root).getPropertyValue('--modal-depth-scale').trim() || '0.96';
        const ty = getComputedStyle(root).getPropertyValue('--modal-depth-translate-y').trim() || '8px';
        const logoBlurActive = getComputedStyle(root).getPropertyValue('--logo-blur-active-target').trim() 
                             || root.style.getPropertyValue('--logo-blur-active-target') 
                             || '12px';
        
        root.style.setProperty('--modal-depth-scale-active', scale);
        root.style.setProperty('--modal-depth-ty-active', ty);
        root.style.setProperty('--logo-blur-active', logoBlurActive);
        
        if (scene) scene.classList.add('gate-depth-active');
    } else {
        const logoBlurInactive = getComputedStyle(root).getPropertyValue('--logo-blur-inactive').trim() || '0px';

        root.style.setProperty('--modal-depth-scale-active', '1');
        root.style.setProperty('--modal-depth-ty-active', '0px');
        root.style.setProperty('--logo-blur-active', logoBlurInactive);

        if (scene) scene.classList.remove('gate-depth-active');
    }
}

/**
 * Fade logo and nav when modal opens/closes
 * Simple: just opacity transitions, CSS handles positioning
 */
function fadeLogoNav(fadeOut = true) {
    const logo = document.getElementById('brand-logo');
    const nav = document.getElementById('main-links');
    const duration = fadeOut ? 500 : 400;
    const targetOpacity = fadeOut ? '0' : '1';
    
    if (logo) {
        logo.style.transition = `opacity ${duration}ms ease-out`;
        logo.style.opacity = targetOpacity;
        if (!fadeOut) {
            setTimeout(() => logo?.style.removeProperty('opacity'), duration);
        }
    }
    
    if (nav) {
        nav.style.transition = `opacity ${duration}ms ease-out`;
        nav.style.opacity = targetOpacity;
        nav.style.pointerEvents = fadeOut ? 'none' : '';
        if (!fadeOut) {
            setTimeout(() => nav?.style.removeProperty('opacity'), duration);
        }
    }
}

/**
 * Show the overlay with smooth blur animation
 */
export function showOverlay() {
    if (!blurLayerElement || !contentLayerElement || !isEnabled) return;
    
    // Ensure blur CSS variable is current
    updateBlurFromWallThickness('showOverlay');

    // Global flag for modal-active styling
    document.documentElement.classList.add('modal-active');
    
    // Fade out logo and nav smoothly
    fadeLogoNav(true);
    
    // Update aria states
    blurLayerElement.setAttribute('aria-hidden', 'false');
    contentLayerElement.setAttribute('aria-hidden', 'false');
    
    // Add active class to BOTH layers simultaneously
    // Blur layer handles backdrop-filter transition independently
    // Content layer handles modal content without affecting blur
    blurLayerElement.classList.add('active');
    contentLayerElement.classList.add('active');
    
    // Transform cursor to larger transparent circle
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        let isMobileViewport = false;
        try {
            isMobileViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: 600px)').matches);
        } catch (e) {}

        if (isMobileViewport) {
            cursor.classList.remove('modal-active');
            cursor.style.display = 'none';
        } else {
            cursor.classList.add('modal-active');
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
    if (!blurLayerElement || !contentLayerElement || !isEnabled) return;
    
    // Remove active class from BOTH layers
    blurLayerElement.classList.remove('active');
    contentLayerElement.classList.remove('active');
    document.documentElement.classList.remove('modal-active');
    
    // Fade logo and nav back in smoothly
    fadeLogoNav(false);
    
    blurLayerElement.setAttribute('aria-hidden', 'true');
    contentLayerElement.setAttribute('aria-hidden', 'true');
    
    // Restore normal cursor
    const cursor = document.getElementById('custom-cursor');
    if (cursor) cursor.classList.remove('modal-active');
    
    // Remove depth effect from scene
    applyDepthEffect(false);
}

/**
 * Check if overlay is currently active
 * @returns {boolean} True if overlay is visible
 */
export function isOverlayActive() {
    if (!contentLayerElement) return false;
    return contentLayerElement.classList.contains('active');
}

/**
 * Update overlay blur
 * @param {number} [blurPx] - Optional explicit blur value in pixels
 */
export function updateOverlayBlur(blurPx) {
    if (!blurLayerElement) return;
    
    if (blurPx !== undefined) {
        blurExplicitlySet = true;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
    } else {
        updateBlurFromWallThickness();
    }
}

/**
 * Update overlay opacity value (for live control panel adjustment)
 */
export function updateOverlayOpacity(opacity) {
    if (!blurLayerElement) return;
    blurLayerElement.style.setProperty('--modal-overlay-opacity', opacity);
}

/**
 * Update overlay transition duration (for live control panel adjustment)
 */
export function updateOverlayTransition(transitionMs) {
    if (!blurLayerElement) return;
    blurLayerElement.style.setProperty('--modal-overlay-transition-duration', `${transitionMs}ms`);
    document.documentElement.style.setProperty('--modal-depth-duration', `${transitionMs}ms`);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update overlay transition-out duration (for live control panel adjustment)
 */
export function updateOverlayTransitionOut(transitionMs) {
    if (!blurLayerElement) return;
    blurLayerElement.style.setProperty('--modal-overlay-transition-out-duration', `${transitionMs}ms`);
    document.documentElement.style.setProperty('--modal-depth-out-duration', `${transitionMs}ms`);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update depth scale (for live control panel adjustment)
 */
export function updateGateDepthScale(scale) {
    document.documentElement.style.setProperty('--modal-depth-scale', scale);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update content delay (for live control panel adjustment)
 */
export function updateGateContentDelay(ms) {
    document.documentElement.style.setProperty('--modal-content-delay', `${ms}ms`);
}


/**
 * Update depth translate Y (for live control panel adjustment)
 */
export function updateGateDepthTranslateY(px) {
    document.documentElement.style.setProperty('--modal-depth-translate-y', `${px}px`);
    applyDepthEffect(isOverlayActive());
}

/**
 * Update logo blur when inactive (for live control panel adjustment)
 */
export function updateLogoBlurInactive(px) {
    const root = document.documentElement;
    root.style.setProperty('--logo-blur-inactive', `${px}px`);
    if (!isOverlayActive()) {
        root.style.setProperty('--logo-blur-active', `${px}px`);
    }
    applyDepthEffect(isOverlayActive());
}

/**
 * Update logo blur when active (for live control panel adjustment)
 */
export function updateLogoBlurActive(px) {
    const root = document.documentElement;
    root.style.setProperty('--logo-blur-active-target', `${px}px`);
    if (isOverlayActive()) {
        root.style.setProperty('--logo-blur-active', `${px}px`);
    }
    applyDepthEffect(isOverlayActive());
}
