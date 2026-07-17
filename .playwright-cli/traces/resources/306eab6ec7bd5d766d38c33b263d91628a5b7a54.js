// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         MODAL BLUR OVERLAY SYSTEM                            ║
// ║  Two-layer architecture: blur layer (isolated) + content layer (modals)      ║
// ║  Separating blur from content eliminates compositing conflicts              ║
// ║  Click on content layer dismisses active modal (modal-overlay-dismiss event)  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from "/src/legacy/modules/core/state.js";
import { readTokenMs, readTokenNumber, readTokenPx, readTokenVar } from "/src/legacy/modules/utils/tokens.js";
import {
    getTransitionPhase,
    isRouteTransitionPhase,
    setTransitionPhase,
    setTransitionReturningState,
    TRANSITION_PHASES
} from "/src/lib/transition-phase.js";

// Two-layer references
let blurLayerElement = null;    // #modal-blur-layer - backdrop-filter only, no children
let contentLayerElement = null; // #modal-content-layer - holds modals, no blur
let modalHostElement = null;    // #modal-modal-host - inside content layer

let isEnabled = true;
let isInitialized = false;
const modalOriginalPlacement = new WeakMap();
let blurExplicitlySet = false; // Track if blur was set from config
let configuredOverlayBlurPx = null;
let configuredOverlayMobileBlurPx = null;

function normalizeBlurPx(value, fallback = null) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

function isMobileOverlayBlurViewport() {
    try {
        return Boolean(
            window.matchMedia?.('(max-width: 600px)')?.matches
            || window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches
        );
    } catch (e) {
        return false;
    }
}

function resolveOverlayBlurPx() {
    if (isMobileOverlayBlurViewport() && configuredOverlayMobileBlurPx !== null) {
        return configuredOverlayMobileBlurPx;
    }
    if (configuredOverlayBlurPx !== null) {
        return configuredOverlayBlurPx;
    }
    return null;
}

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
    if (modalEl.parentNode === host) return;

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

export function getModalCloseDurationMs(fallback = 700) {
    try {
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--modal-overlay-transition-out-duration')
            .trim();
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    } catch (e) {}
    return fallback;
}

export function getGateHandoffDurationMs(fallback = 220) {
    try {
        const routeOutRaw = getComputedStyle(document.documentElement)
            .getPropertyValue('--ui-route-duration-out')
            .trim();
        const uiOutRaw = getComputedStyle(document.documentElement)
            .getPropertyValue('--ui-duration-out')
            .trim();
        const parsed = parseFloat(routeOutRaw || uiOutRaw);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    } catch (e) {}
    return fallback;
}

export function getModalReturnDurationMs(fallback = 240) {
    try {
        const raw = getComputedStyle(document.documentElement)
            .getPropertyValue('--ui-nav-return-duration')
            .trim();
        const parsed = parseFloat(raw);
        if (Number.isFinite(parsed) && parsed >= 0) {
            return parsed;
        }
    } catch (e) {}
    return fallback;
}

export function clearModalReturnState() {
    setTransitionReturningState(false);
}

export function beginModalReturnState(durationMs = getModalReturnDurationMs()) {
    void durationMs;
    setTransitionReturningState(true);
}

function dispatchModalTransitionEvent(name, detail = {}) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(name, { detail }));
}

export function forceHideOverlayModal(modalEl) {
    if (!modalEl) return;

    modalEl.classList.remove('active', 'closing');
    modalEl.classList.add('hidden');
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.dataset.modalState = 'hidden';
    unmountModalFromOverlay(modalEl);
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
 * Only falls back to wall thickness if configured desktop/mobile blur is absent.
 */
export function updateBlurFromWallThickness(reason = 'direct') {
    if (!blurLayerElement) return;

    const configuredBlurPx = resolveOverlayBlurPx();
    if (configuredBlurPx !== null) {
        blurExplicitlySet = true;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${configuredBlurPx}px`);
        return;
    }
    
    // Only auto-calculate if blur was not explicitly set in config
    if (!blurExplicitlySet) {
        const wallThickness = getWallThickness();
        const blurPx = wallThickness / 4;
        blurLayerElement.style.setProperty('--modal-overlay-blur', `${blurPx}px`);
    }
}

/**
 * Detect Safari browser (desktop and iOS)
 * Safari handles backdrop-filter transitions differently - needs smoother easing
 */
function detectSafari() {
    const ua = navigator.userAgent || '';
    const vendor = navigator.vendor || '';
    // Safari: has Safari in UA, Apple vendor, but NOT Chrome/Chromium
    const isSafari = /Safari\//.test(ua) && /Apple/.test(vendor) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua);
    // iOS browsers all use WebKit (including Chrome on iOS)
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return isSafari || isIOS;
}

function handleOverlayBlurRefresh() {
    updateBlurFromWallThickness('viewport-change');
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
    
    // Safari detection: add class for CSS to apply smoother modal easing
    // Safari/iOS handles backdrop-filter transitions poorly with overshoot easing
    if (detectSafari()) {
        document.documentElement.classList.add('is-safari');
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
    
    const tokenBlurPx = readTokenNumber('--modal-overlay-blur', 13.2);
    const tokenMobileBlurPx = readTokenNumber('--modal-overlay-mobile-blur', tokenBlurPx);
    configuredOverlayBlurPx = normalizeBlurPx(config.modalOverlayBlurPx, tokenBlurPx);
    configuredOverlayMobileBlurPx = normalizeBlurPx(config.modalOverlayMobileBlurPx, tokenMobileBlurPx);
    blurExplicitlySet = configuredOverlayBlurPx !== null || configuredOverlayMobileBlurPx !== null;
    updateBlurFromWallThickness('init');

    // SPA: `createLegacyRuntimeScope` removes ALL listeners added during the
    // previous route's bootstrap — including handlers on persistent overlay DOM.
    // Always re-initialize so overlay click, resize, and layout listeners are restored.
    isInitialized = true;

    // Set CSS variables on root for global access (modals, blur layer, etc.)
    root.style.setProperty('--modal-overlay-opacity', opacity);
    if (configuredOverlayBlurPx !== null) {
        root.style.setProperty('--modal-overlay-blur', `${configuredOverlayBlurPx}px`);
    }
    if (configuredOverlayMobileBlurPx !== null) {
        root.style.setProperty('--modal-overlay-mobile-blur', `${configuredOverlayMobileBlurPx}px`);
    }
    root.style.setProperty('--modal-overlay-transition-duration', `${transitionMs}ms`);
    root.style.setProperty('--modal-overlay-transition-out-duration', `${transitionOutMs}ms`);
    
    const preserveActiveBackdrop =
      blurLayerElement.classList.contains('active')
      || contentLayerElement.classList.contains('active')
      || getTransitionPhase() === TRANSITION_PHASES.MODAL_OPEN;

    if (preserveActiveBackdrop) {
      blurLayerElement.classList.add('active');
      contentLayerElement.classList.add('active');
      blurLayerElement.setAttribute('aria-hidden', 'false');
      contentLayerElement.setAttribute('aria-hidden', 'false');
      if (!isRouteTransitionPhase(getTransitionPhase())) {
        setTransitionPhase(TRANSITION_PHASES.MODAL_OPEN);
      }
      applyDepthEffect(true);
    } else {
      // Ensure initial state: not active
      blurLayerElement.classList.remove('active');
      contentLayerElement.classList.remove('active');
      blurLayerElement.setAttribute('aria-hidden', 'true');
      contentLayerElement.setAttribute('aria-hidden', 'true');
      applyDepthEffect(false);
    }
    
    // Click on content layer dismisses active modal
    contentLayerElement.removeEventListener('click', handleOverlayClick, true);
    contentLayerElement.addEventListener('click', handleOverlayClick, { capture: true });
    
    // Listen for layout changes to update desktop/mobile blur.
    window.removeEventListener('resize', handleOverlayBlurRefresh);
    window.addEventListener('resize', handleOverlayBlurRefresh);
    
    // Also listen for custom layout update events if they exist
    document.removeEventListener('layout-updated', handleOverlayBlurRefresh);
    document.addEventListener('layout-updated', handleOverlayBlurRefresh);
    
    const blurPx = resolveOverlayBlurPx() ?? (getWallThickness() / 4);
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

    // Ensure target is an Element (could be Text node, Document, etc.)
    const target = e.target?.closest ? e.target : e.target?.parentElement;
    if (!target?.closest) return;

    // Ignore clicks on interactive elements within modals (buttons, inputs, etc.)
    if (target.closest('button')) return;
    if (target.closest('input')) return;
    if (target.closest('a')) return;
    if (target.closest('select')) return;
    if (target.closest('textarea')) return;
    
    // Accept clicks on content layer, modal host, or modal containers (but not their interactive children)
    const isGateContainer = target.id === 'simulation-focus-modal' ||
                           target.classList.contains('simulation-focus-modal') ||
                           target.classList.contains('modal-label') ||
                           target.classList.contains('modal-description');
    
    const isContentLayerSurface = target === contentLayerElement || target?.id === 'modal-modal-host';
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
        const ty = getComputedStyle(root).getPropertyValue('--modal-depth-translate-y').trim() || "var(--space-sm)";
        const logoBlurActive = getComputedStyle(root).getPropertyValue('--logo-blur-active-target').trim() 
                             || root.style.getPropertyValue('--logo-blur-active-target') 
                             || "var(--radius-md)";
        
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

// Logo/nav fade is now handled purely by CSS via data-abs-transition-phase
// The CSS sets --ui-obscured: 1 which derives opacity: 0 for logo and nav

/**
 * Show the overlay with smooth blur animation
 */
export function showOverlay() {
    if (!blurLayerElement || !contentLayerElement || !isEnabled) return;
    
    // Ensure blur CSS variable is current
    updateBlurFromWallThickness('showOverlay');

    clearModalReturnState();
    setTransitionPhase(TRANSITION_PHASES.MODAL_OPEN);
    dispatchModalTransitionEvent('abs:transition-modal-open');
    
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
            isMobileViewport = Boolean(window.matchMedia && window.matchMedia('(max-width: var(--size-600))').matches);
        } catch (e) {}

        if (isMobileViewport) {
            cursor.classList.remove('modal-active');
            cursor.style.display = 'none';
        } else {
            cursor.classList.add('modal-active');
            cursor.style.display = 'block';
            cursor.style.opacity = '';
        }
    }
    
    // Apply depth effect to scene
    applyDepthEffect(true);
}

/**
 * Hide the overlay with smooth blur animation
 */
export function hideOverlay({ clearReturnState = true, instant = false } = {}) {
    if (!blurLayerElement || !contentLayerElement || !isEnabled) return;

    const wasOverlayActive =
      blurLayerElement.classList.contains('active') ||
      contentLayerElement.classList.contains('active') ||
      getTransitionPhase() === TRANSITION_PHASES.MODAL_OPEN;

    if (!wasOverlayActive) {
      if (clearReturnState) clearModalReturnState();
      return;
    }

    if (clearReturnState) clearModalReturnState();

    const overlayLayers = [blurLayerElement, contentLayerElement];
    if (instant) {
        overlayLayers.forEach((layer) => {
            layer.style.transition = 'none';
        });
    }
    
    // Remove active class from BOTH layers
    blurLayerElement.classList.remove('active');
    contentLayerElement.classList.remove('active');
    
    blurLayerElement.setAttribute('aria-hidden', 'true');
    contentLayerElement.setAttribute('aria-hidden', 'true');
    
    // Restore normal cursor
    const cursor = document.getElementById('custom-cursor');
    if (cursor) cursor.classList.remove('modal-active');
    
    // Remove depth effect from scene
    applyDepthEffect(false);

    if (instant) {
        void blurLayerElement.offsetWidth;
        requestAnimationFrame(() => {
            overlayLayers.forEach((layer) => {
                layer.style.removeProperty('transition');
            });
        });
    }

    if (!isRouteTransitionPhase(getTransitionPhase())) {
        setTransitionPhase(TRANSITION_PHASES.IDLE, { returning: clearReturnState });
        dispatchModalTransitionEvent('abs:transition-modal-close', {
            suppressReturnAnimation: !clearReturnState,
        });
    }
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
        configuredOverlayBlurPx = normalizeBlurPx(blurPx, configuredOverlayBlurPx);
        blurExplicitlySet = true;
        if (configuredOverlayBlurPx !== null) {
            document.documentElement.style.setProperty('--modal-overlay-blur', `${configuredOverlayBlurPx}px`);
        }
        updateBlurFromWallThickness('updateOverlayBlur');
    } else {
        configuredOverlayBlurPx = null;
        blurExplicitlySet = configuredOverlayMobileBlurPx !== null;
        updateBlurFromWallThickness();
    }
}

export function updateOverlayMobileBlur(blurPx) {
    if (!blurLayerElement) return;

    if (blurPx !== undefined) {
        configuredOverlayMobileBlurPx = normalizeBlurPx(blurPx, configuredOverlayMobileBlurPx);
        blurExplicitlySet = true;
        if (configuredOverlayMobileBlurPx !== null) {
            document.documentElement.style.setProperty('--modal-overlay-mobile-blur', `${configuredOverlayMobileBlurPx}px`);
        }
    } else {
        configuredOverlayMobileBlurPx = null;
        blurExplicitlySet = configuredOverlayBlurPx !== null;
    }
    updateBlurFromWallThickness('updateOverlayMobileBlur');
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZGFsLW92ZXJsYXkuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8g4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXXG4vLyDilZEgICAgICAgICAgICAgICAgICAgICAgICAgTU9EQUwgQkxVUiBPVkVSTEFZIFNZU1RFTSAgICAgICAgICAgICAgICAgICAgICAgICAgICDilZFcbi8vIOKVkSAgVHdvLWxheWVyIGFyY2hpdGVjdHVyZTogYmx1ciBsYXllciAoaXNvbGF0ZWQpICsgY29udGVudCBsYXllciAobW9kYWxzKSAgICAgIOKVkVxuLy8g4pWRICBTZXBhcmF0aW5nIGJsdXIgZnJvbSBjb250ZW50IGVsaW1pbmF0ZXMgY29tcG9zaXRpbmcgY29uZmxpY3RzICAgICAgICAgICAgICDilZFcbi8vIOKVkSAgQ2xpY2sgb24gY29udGVudCBsYXllciBkaXNtaXNzZXMgYWN0aXZlIG1vZGFsIChtb2RhbC1vdmVybGF5LWRpc21pc3MgZXZlbnQpICDilZFcbi8vIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnVxuXG5pbXBvcnQgeyBnZXRHbG9iYWxzIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgcmVhZFRva2VuTXMsIHJlYWRUb2tlbk51bWJlciwgcmVhZFRva2VuUHgsIHJlYWRUb2tlblZhciB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3V0aWxzL3Rva2Vucy5qc1wiO1xuaW1wb3J0IHtcbiAgICBnZXRUcmFuc2l0aW9uUGhhc2UsXG4gICAgaXNSb3V0ZVRyYW5zaXRpb25QaGFzZSxcbiAgICBzZXRUcmFuc2l0aW9uUGhhc2UsXG4gICAgc2V0VHJhbnNpdGlvblJldHVybmluZ1N0YXRlLFxuICAgIFRSQU5TSVRJT05fUEhBU0VTXG59IGZyb20gXCIvc3JjL2xpYi90cmFuc2l0aW9uLXBoYXNlLmpzXCI7XG5cbi8vIFR3by1sYXllciByZWZlcmVuY2VzXG5sZXQgYmx1ckxheWVyRWxlbWVudCA9IG51bGw7ICAgIC8vICNtb2RhbC1ibHVyLWxheWVyIC0gYmFja2Ryb3AtZmlsdGVyIG9ubHksIG5vIGNoaWxkcmVuXG5sZXQgY29udGVudExheWVyRWxlbWVudCA9IG51bGw7IC8vICNtb2RhbC1jb250ZW50LWxheWVyIC0gaG9sZHMgbW9kYWxzLCBubyBibHVyXG5sZXQgbW9kYWxIb3N0RWxlbWVudCA9IG51bGw7ICAgIC8vICNtb2RhbC1tb2RhbC1ob3N0IC0gaW5zaWRlIGNvbnRlbnQgbGF5ZXJcblxubGV0IGlzRW5hYmxlZCA9IHRydWU7XG5sZXQgaXNJbml0aWFsaXplZCA9IGZhbHNlO1xuY29uc3QgbW9kYWxPcmlnaW5hbFBsYWNlbWVudCA9IG5ldyBXZWFrTWFwKCk7XG5sZXQgYmx1ckV4cGxpY2l0bHlTZXQgPSBmYWxzZTsgLy8gVHJhY2sgaWYgYmx1ciB3YXMgc2V0IGZyb20gY29uZmlnXG5sZXQgY29uZmlndXJlZE92ZXJsYXlCbHVyUHggPSBudWxsO1xubGV0IGNvbmZpZ3VyZWRPdmVybGF5TW9iaWxlQmx1clB4ID0gbnVsbDtcblxuZnVuY3Rpb24gbm9ybWFsaXplQmx1clB4KHZhbHVlLCBmYWxsYmFjayA9IG51bGwpIHtcbiAgICBjb25zdCBudW1lcmljID0gTnVtYmVyKHZhbHVlKTtcbiAgICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKG51bWVyaWMpICYmIG51bWVyaWMgPj0gMCA/IG51bWVyaWMgOiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gaXNNb2JpbGVPdmVybGF5Qmx1clZpZXdwb3J0KCkge1xuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBCb29sZWFuKFxuICAgICAgICAgICAgd2luZG93Lm1hdGNoTWVkaWE/LignKG1heC13aWR0aDogNjAwcHgpJyk/Lm1hdGNoZXNcbiAgICAgICAgICAgIHx8IHdpbmRvdy5tYXRjaE1lZGlhPy4oJyhob3Zlcjogbm9uZSkgYW5kIChwb2ludGVyOiBjb2Fyc2UpJyk/Lm1hdGNoZXNcbiAgICAgICAgKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVPdmVybGF5Qmx1clB4KCkge1xuICAgIGlmIChpc01vYmlsZU92ZXJsYXlCbHVyVmlld3BvcnQoKSAmJiBjb25maWd1cmVkT3ZlcmxheU1vYmlsZUJsdXJQeCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gY29uZmlndXJlZE92ZXJsYXlNb2JpbGVCbHVyUHg7XG4gICAgfVxuICAgIGlmIChjb25maWd1cmVkT3ZlcmxheUJsdXJQeCAhPT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gY29uZmlndXJlZE92ZXJsYXlCbHVyUHg7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBlbnN1cmVNb2RhbEhvc3QoKSB7XG4gICAgaWYgKCFjb250ZW50TGF5ZXJFbGVtZW50KSByZXR1cm4gbnVsbDtcbiAgICBpZiAobW9kYWxIb3N0RWxlbWVudCAmJiBtb2RhbEhvc3RFbGVtZW50LmlzQ29ubmVjdGVkKSByZXR1cm4gbW9kYWxIb3N0RWxlbWVudDtcblxuICAgIGxldCBob3N0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21vZGFsLW1vZGFsLWhvc3QnKTtcbiAgICBpZiAoIWhvc3QpIHtcbiAgICAgICAgaG9zdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICBob3N0LmlkID0gJ21vZGFsLW1vZGFsLWhvc3QnO1xuICAgICAgICBob3N0LmNsYXNzTmFtZSA9ICdtb2RhbC1tb2RhbC1ob3N0JztcbiAgICAgICAgY29udGVudExheWVyRWxlbWVudC5hcHBlbmRDaGlsZChob3N0KTtcbiAgICB9XG4gICAgbW9kYWxIb3N0RWxlbWVudCA9IGhvc3Q7XG4gICAgcmV0dXJuIG1vZGFsSG9zdEVsZW1lbnQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3VudE1vZGFsSW50b092ZXJsYXkobW9kYWxFbCkge1xuICAgIGlmICghY29udGVudExheWVyRWxlbWVudCB8fCAhbW9kYWxFbCkgcmV0dXJuO1xuICAgIGNvbnN0IGhvc3QgPSBlbnN1cmVNb2RhbEhvc3QoKTtcbiAgICBpZiAoIWhvc3QpIHJldHVybjtcbiAgICBpZiAobW9kYWxFbC5wYXJlbnROb2RlID09PSBob3N0KSByZXR1cm47XG5cbiAgICBpZiAoIW1vZGFsT3JpZ2luYWxQbGFjZW1lbnQuaGFzKG1vZGFsRWwpKSB7XG4gICAgICAgIG1vZGFsT3JpZ2luYWxQbGFjZW1lbnQuc2V0KG1vZGFsRWwsIHsgcGFyZW50OiBtb2RhbEVsLnBhcmVudE5vZGUsIG5leHRTaWJsaW5nOiBtb2RhbEVsLm5leHRTaWJsaW5nIH0pO1xuICAgIH1cbiAgICBob3N0LmFwcGVuZENoaWxkKG1vZGFsRWwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdW5tb3VudE1vZGFsRnJvbU92ZXJsYXkobW9kYWxFbCkge1xuICAgIGlmICghbW9kYWxFbCkgcmV0dXJuO1xuICAgIGNvbnN0IHJlYyA9IG1vZGFsT3JpZ2luYWxQbGFjZW1lbnQuZ2V0KG1vZGFsRWwpO1xuICAgIGlmICghcmVjIHx8ICFyZWMucGFyZW50KSByZXR1cm47XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHJlYy5uZXh0U2libGluZyAmJiByZWMubmV4dFNpYmxpbmcucGFyZW50Tm9kZSA9PT0gcmVjLnBhcmVudCkge1xuICAgICAgICAgICAgcmVjLnBhcmVudC5pbnNlcnRCZWZvcmUobW9kYWxFbCwgcmVjLm5leHRTaWJsaW5nKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlYy5wYXJlbnQuYXBwZW5kQ2hpbGQobW9kYWxFbCk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kYWxDbG9zZUR1cmF0aW9uTXMoZmFsbGJhY2sgPSA3MDApIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCByYXcgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudClcbiAgICAgICAgICAgIC5nZXRQcm9wZXJ0eVZhbHVlKCctLW1vZGFsLW92ZXJsYXktdHJhbnNpdGlvbi1vdXQtZHVyYXRpb24nKVxuICAgICAgICAgICAgLnRyaW0oKTtcbiAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdChyYXcpO1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZWQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxsYmFjaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEdhdGVIYW5kb2ZmRHVyYXRpb25NcyhmYWxsYmFjayA9IDIyMCkge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHJvdXRlT3V0UmF3ID0gZ2V0Q29tcHV0ZWRTdHlsZShkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQpXG4gICAgICAgICAgICAuZ2V0UHJvcGVydHlWYWx1ZSgnLS11aS1yb3V0ZS1kdXJhdGlvbi1vdXQnKVxuICAgICAgICAgICAgLnRyaW0oKTtcbiAgICAgICAgY29uc3QgdWlPdXRSYXcgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudClcbiAgICAgICAgICAgIC5nZXRQcm9wZXJ0eVZhbHVlKCctLXVpLWR1cmF0aW9uLW91dCcpXG4gICAgICAgICAgICAudHJpbSgpO1xuICAgICAgICBjb25zdCBwYXJzZWQgPSBwYXJzZUZsb2F0KHJvdXRlT3V0UmF3IHx8IHVpT3V0UmF3KTtcbiAgICAgICAgaWYgKE51bWJlci5pc0Zpbml0ZShwYXJzZWQpICYmIHBhcnNlZCA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gcGFyc2VkO1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge31cbiAgICByZXR1cm4gZmFsbGJhY2s7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RhbFJldHVybkR1cmF0aW9uTXMoZmFsbGJhY2sgPSAyNDApIHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCByYXcgPSBnZXRDb21wdXRlZFN0eWxlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudClcbiAgICAgICAgICAgIC5nZXRQcm9wZXJ0eVZhbHVlKCctLXVpLW5hdi1yZXR1cm4tZHVyYXRpb24nKVxuICAgICAgICAgICAgLnRyaW0oKTtcbiAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdChyYXcpO1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID49IDApIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJzZWQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7fVxuICAgIHJldHVybiBmYWxsYmFjaztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTW9kYWxSZXR1cm5TdGF0ZSgpIHtcbiAgICBzZXRUcmFuc2l0aW9uUmV0dXJuaW5nU3RhdGUoZmFsc2UpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYmVnaW5Nb2RhbFJldHVyblN0YXRlKGR1cmF0aW9uTXMgPSBnZXRNb2RhbFJldHVybkR1cmF0aW9uTXMoKSkge1xuICAgIHZvaWQgZHVyYXRpb25NcztcbiAgICBzZXRUcmFuc2l0aW9uUmV0dXJuaW5nU3RhdGUodHJ1ZSk7XG59XG5cbmZ1bmN0aW9uIGRpc3BhdGNoTW9kYWxUcmFuc2l0aW9uRXZlbnQobmFtZSwgZGV0YWlsID0ge30pIHtcbiAgICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcbiAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQobmFtZSwgeyBkZXRhaWwgfSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZm9yY2VIaWRlT3ZlcmxheU1vZGFsKG1vZGFsRWwpIHtcbiAgICBpZiAoIW1vZGFsRWwpIHJldHVybjtcblxuICAgIG1vZGFsRWwuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJywgJ2Nsb3NpbmcnKTtcbiAgICBtb2RhbEVsLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgIG1vZGFsRWwuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgbW9kYWxFbC5kYXRhc2V0Lm1vZGFsU3RhdGUgPSAnaGlkZGVuJztcbiAgICB1bm1vdW50TW9kYWxGcm9tT3ZlcmxheShtb2RhbEVsKTtcbn1cblxuLyoqXG4gKiBHZXQgd2FsbCB0aGlja25lc3MgZnJvbSBDU1MgdmFyaWFibGUgb3Igc3RhdGVcbiAqL1xuZnVuY3Rpb24gZ2V0V2FsbFRoaWNrbmVzcygpIHtcbiAgICBjb25zdCB0aGlja25lc3MgPSByZWFkVG9rZW5WYXIoJy0td2FsbC10aGlja25lc3MnLCAnJyk7XG4gICAgaWYgKHRoaWNrbmVzcyAmJiAhL2NhbGNcXCh8dnd8dmh8dm1pbnx2bWF4fCUvaS50ZXN0KHRoaWNrbmVzcykpIHtcbiAgICAgICAgY29uc3QgcGFyc2VkID0gcGFyc2VGbG9hdCh0aGlja25lc3MpO1xuICAgICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHBhcnNlZCkgJiYgcGFyc2VkID4gMCkgcmV0dXJuIHBhcnNlZDtcbiAgICB9XG4gICAgXG4gICAgLy8gRmFsbGJhY2sgdG8gc3RhdGVcbiAgICBjb25zdCBnID0gZ2V0R2xvYmFscygpO1xuICAgIHJldHVybiBnPy53YWxsVGhpY2tuZXNzIHx8IDEyO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSBhbmQgdXBkYXRlIGJsdXIgYmFzZWQgb24gd2FsbCB0aGlja25lc3NcbiAqIE9ubHkgZmFsbHMgYmFjayB0byB3YWxsIHRoaWNrbmVzcyBpZiBjb25maWd1cmVkIGRlc2t0b3AvbW9iaWxlIGJsdXIgaXMgYWJzZW50LlxuICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlQmx1ckZyb21XYWxsVGhpY2tuZXNzKHJlYXNvbiA9ICdkaXJlY3QnKSB7XG4gICAgaWYgKCFibHVyTGF5ZXJFbGVtZW50KSByZXR1cm47XG5cbiAgICBjb25zdCBjb25maWd1cmVkQmx1clB4ID0gcmVzb2x2ZU92ZXJsYXlCbHVyUHgoKTtcbiAgICBpZiAoY29uZmlndXJlZEJsdXJQeCAhPT0gbnVsbCkge1xuICAgICAgICBibHVyRXhwbGljaXRseVNldCA9IHRydWU7XG4gICAgICAgIGJsdXJMYXllckVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS1ibHVyJywgYCR7Y29uZmlndXJlZEJsdXJQeH1weGApO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIC8vIE9ubHkgYXV0by1jYWxjdWxhdGUgaWYgYmx1ciB3YXMgbm90IGV4cGxpY2l0bHkgc2V0IGluIGNvbmZpZ1xuICAgIGlmICghYmx1ckV4cGxpY2l0bHlTZXQpIHtcbiAgICAgICAgY29uc3Qgd2FsbFRoaWNrbmVzcyA9IGdldFdhbGxUaGlja25lc3MoKTtcbiAgICAgICAgY29uc3QgYmx1clB4ID0gd2FsbFRoaWNrbmVzcyAvIDQ7XG4gICAgICAgIGJsdXJMYXllckVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS1ibHVyJywgYCR7Ymx1clB4fXB4YCk7XG4gICAgfVxufVxuXG4vKipcbiAqIERldGVjdCBTYWZhcmkgYnJvd3NlciAoZGVza3RvcCBhbmQgaU9TKVxuICogU2FmYXJpIGhhbmRsZXMgYmFja2Ryb3AtZmlsdGVyIHRyYW5zaXRpb25zIGRpZmZlcmVudGx5IC0gbmVlZHMgc21vb3RoZXIgZWFzaW5nXG4gKi9cbmZ1bmN0aW9uIGRldGVjdFNhZmFyaSgpIHtcbiAgICBjb25zdCB1YSA9IG5hdmlnYXRvci51c2VyQWdlbnQgfHwgJyc7XG4gICAgY29uc3QgdmVuZG9yID0gbmF2aWdhdG9yLnZlbmRvciB8fCAnJztcbiAgICAvLyBTYWZhcmk6IGhhcyBTYWZhcmkgaW4gVUEsIEFwcGxlIHZlbmRvciwgYnV0IE5PVCBDaHJvbWUvQ2hyb21pdW1cbiAgICBjb25zdCBpc1NhZmFyaSA9IC9TYWZhcmlcXC8vLnRlc3QodWEpICYmIC9BcHBsZS8udGVzdCh2ZW5kb3IpICYmICEvQ2hyb21lXFwvLy50ZXN0KHVhKSAmJiAhL0Nocm9taXVtXFwvLy50ZXN0KHVhKTtcbiAgICAvLyBpT1MgYnJvd3NlcnMgYWxsIHVzZSBXZWJLaXQgKGluY2x1ZGluZyBDaHJvbWUgb24gaU9TKVxuICAgIGNvbnN0IGlzSU9TID0gL2lQYWR8aVBob25lfGlQb2QvLnRlc3QodWEpIHx8IChuYXZpZ2F0b3IucGxhdGZvcm0gPT09ICdNYWNJbnRlbCcgJiYgbmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMSk7XG4gICAgcmV0dXJuIGlzU2FmYXJpIHx8IGlzSU9TO1xufVxuXG5mdW5jdGlvbiBoYW5kbGVPdmVybGF5Qmx1clJlZnJlc2goKSB7XG4gICAgdXBkYXRlQmx1ckZyb21XYWxsVGhpY2tuZXNzKCd2aWV3cG9ydC1jaGFuZ2UnKTtcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIHRoZSBtb2RhbCBvdmVybGF5IHN5c3RlbSB3aXRoIGNvbmZpZyB2YWx1ZXNcbiAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBDb25maWd1cmF0aW9uIG9iamVjdCB3aXRoIG92ZXJsYXkgc2V0dGluZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRNb2RhbE92ZXJsYXkoY29uZmlnKSB7XG4gICAgYmx1ckxheWVyRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbC1ibHVyLWxheWVyJyk7XG4gICAgY29udGVudExheWVyRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtb2RhbC1jb250ZW50LWxheWVyJyk7XG4gICAgXG4gICAgaWYgKCFibHVyTGF5ZXJFbGVtZW50IHx8ICFjb250ZW50TGF5ZXJFbGVtZW50KSB7XG4gICAgICAgIGNvbnNvbGUud2FybignTW9kYWwgT3ZlcmxheTogI21vZGFsLWJsdXItbGF5ZXIgb3IgI21vZGFsLWNvbnRlbnQtbGF5ZXIgbm90IGZvdW5kJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgLy8gU2FmYXJpIGRldGVjdGlvbjogYWRkIGNsYXNzIGZvciBDU1MgdG8gYXBwbHkgc21vb3RoZXIgbW9kYWwgZWFzaW5nXG4gICAgLy8gU2FmYXJpL2lPUyBoYW5kbGVzIGJhY2tkcm9wLWZpbHRlciB0cmFuc2l0aW9ucyBwb29ybHkgd2l0aCBvdmVyc2hvb3QgZWFzaW5nXG4gICAgaWYgKGRldGVjdFNhZmFyaSgpKSB7XG4gICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuYWRkKCdpcy1zYWZhcmknKTtcbiAgICB9XG4gICAgXG4gICAgLy8gQ2hlY2sgaWYgb3ZlcmxheSBpcyBlbmFibGVkXG4gICAgaXNFbmFibGVkID0gY29uZmlnLm1vZGFsT3ZlcmxheUVuYWJsZWQgIT09IGZhbHNlO1xuICAgIFxuICAgIGlmICghaXNFbmFibGVkKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdNb2RhbCBPdmVybGF5OiBEaXNhYmxlZCBieSBjb25maWcnKTtcbiAgICAgICAgYmx1ckxheWVyRWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBjb250ZW50TGF5ZXJFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgLy8gRW5zdXJlIGxheWVycyBhcmUgdmlzaWJsZSB3aGVuIGVuYWJsZWRcbiAgICBibHVyTGF5ZXJFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcbiAgICBjb250ZW50TGF5ZXJFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSAnJztcblxuICAgIC8vIEVuc3VyZSBtb2RhbCBob3N0IGV4aXN0c1xuICAgIGVuc3VyZU1vZGFsSG9zdCgpO1xuICAgIFxuICAgIC8vIEluamVjdCBDU1MgY3VzdG9tIHByb3BlcnRpZXMgZnJvbSBjb25maWdcbiAgICBjb25zdCBvcGFjaXR5ID0gY29uZmlnLm1vZGFsT3ZlcmxheU9wYWNpdHkgPz8gcmVhZFRva2VuTnVtYmVyKCctLW1vZGFsLW92ZXJsYXktb3BhY2l0eScsIDAuMDEpO1xuICAgIGNvbnN0IHRyYW5zaXRpb25NcyA9IGNvbmZpZy5tb2RhbE92ZXJsYXlUcmFuc2l0aW9uTXMgPz8gcmVhZFRva2VuTXMoJy0tbW9kYWwtb3ZlcmxheS10cmFuc2l0aW9uLWR1cmF0aW9uJywgODAwKTtcbiAgICBjb25zdCB0cmFuc2l0aW9uT3V0TXMgPSBjb25maWcubW9kYWxPdmVybGF5VHJhbnNpdGlvbk91dE1zID8/IHJlYWRUb2tlbk1zKCctLW1vZGFsLW92ZXJsYXktdHJhbnNpdGlvbi1vdXQtZHVyYXRpb24nLCA2MDApO1xuICAgIGNvbnN0IGNvbnRlbnREZWxheU1zID0gY29uZmlnLm1vZGFsT3ZlcmxheUNvbnRlbnREZWxheU1zID8/IHJlYWRUb2tlbk1zKCctLW1vZGFsLWNvbnRlbnQtZGVsYXknLCAyMDApO1xuICAgIFxuICAgIC8vIERlcHRoIGVmZmVjdCBzZXR0aW5nc1xuICAgIGNvbnN0IGRlcHRoU2NhbGUgPSBjb25maWcubW9kYWxEZXB0aFNjYWxlID8/IHJlYWRUb2tlbk51bWJlcignLS1tb2RhbC1kZXB0aC1zY2FsZScsIDAuOTYpO1xuICAgIGNvbnN0IGRlcHRoWSA9IGNvbmZpZy5tb2RhbERlcHRoVHJhbnNsYXRlWSA/PyByZWFkVG9rZW5QeCgnLS1tb2RhbC1kZXB0aC10cmFuc2xhdGUteScsIDgpO1xuICAgIFxuICAgIC8vIExvZ28gYmx1ciBzZXR0aW5ncyAoYmx1ciB3aGVuIG1vZGFsIGlzIGFjdGl2ZSlcbiAgICBjb25zdCBsb2dvQmx1ckluYWN0aXZlID0gY29uZmlnLmxvZ29CbHVySW5hY3RpdmUgPz8gcmVhZFRva2VuUHgoJy0tbG9nby1ibHVyLWluYWN0aXZlJywgMCk7XG4gICAgY29uc3QgbG9nb0JsdXJBY3RpdmUgPSBjb25maWcubG9nb0JsdXJBY3RpdmUgPz8gcmVhZFRva2VuUHgoJy0tbG9nby1ibHVyLWFjdGl2ZS10YXJnZXQnLCAxMik7XG4gICAgXG4gICAgLy8gU2V0IGRlcHRoIHZhcmlhYmxlcyBvbiByb290IHNvIHRoZXkgYXJlIGF2YWlsYWJsZSB0byBhbGwgc2NlbmUgZWxlbWVudHNcbiAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtZGVwdGgtc2NhbGUnLCBkZXB0aFNjYWxlKTtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLXRyYW5zbGF0ZS15JywgYCR7ZGVwdGhZfXB4YCk7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1kZXB0aC1kdXJhdGlvbicsIGAke3RyYW5zaXRpb25Nc31tc2ApO1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtZGVwdGgtb3V0LWR1cmF0aW9uJywgYCR7dHJhbnNpdGlvbk91dE1zfW1zYCk7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1jb250ZW50LWRlbGF5JywgYCR7Y29udGVudERlbGF5TXN9bXNgKTtcbiAgICBcbiAgICAvLyBTZXQgbG9nbyBibHVyIHZhcmlhYmxlc1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG9nby1ibHVyLWluYWN0aXZlJywgYCR7bG9nb0JsdXJJbmFjdGl2ZX1weGApO1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG9nby1ibHVyLWFjdGl2ZS10YXJnZXQnLCBgJHtsb2dvQmx1ckFjdGl2ZX1weGApO1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG9nby1ibHVyLWFjdGl2ZScsIGAke2xvZ29CbHVySW5hY3RpdmV9cHhgKTtcbiAgICBcbiAgICBjb25zdCB0b2tlbkJsdXJQeCA9IHJlYWRUb2tlbk51bWJlcignLS1tb2RhbC1vdmVybGF5LWJsdXInLCAxMy4yKTtcbiAgICBjb25zdCB0b2tlbk1vYmlsZUJsdXJQeCA9IHJlYWRUb2tlbk51bWJlcignLS1tb2RhbC1vdmVybGF5LW1vYmlsZS1ibHVyJywgdG9rZW5CbHVyUHgpO1xuICAgIGNvbmZpZ3VyZWRPdmVybGF5Qmx1clB4ID0gbm9ybWFsaXplQmx1clB4KGNvbmZpZy5tb2RhbE92ZXJsYXlCbHVyUHgsIHRva2VuQmx1clB4KTtcbiAgICBjb25maWd1cmVkT3ZlcmxheU1vYmlsZUJsdXJQeCA9IG5vcm1hbGl6ZUJsdXJQeChjb25maWcubW9kYWxPdmVybGF5TW9iaWxlQmx1clB4LCB0b2tlbk1vYmlsZUJsdXJQeCk7XG4gICAgYmx1ckV4cGxpY2l0bHlTZXQgPSBjb25maWd1cmVkT3ZlcmxheUJsdXJQeCAhPT0gbnVsbCB8fCBjb25maWd1cmVkT3ZlcmxheU1vYmlsZUJsdXJQeCAhPT0gbnVsbDtcbiAgICB1cGRhdGVCbHVyRnJvbVdhbGxUaGlja25lc3MoJ2luaXQnKTtcblxuICAgIC8vIFNQQTogYGNyZWF0ZUxlZ2FjeVJ1bnRpbWVTY29wZWAgcmVtb3ZlcyBBTEwgbGlzdGVuZXJzIGFkZGVkIGR1cmluZyB0aGVcbiAgICAvLyBwcmV2aW91cyByb3V0ZSdzIGJvb3RzdHJhcCDigJQgaW5jbHVkaW5nIGhhbmRsZXJzIG9uIHBlcnNpc3RlbnQgb3ZlcmxheSBET00uXG4gICAgLy8gQWx3YXlzIHJlLWluaXRpYWxpemUgc28gb3ZlcmxheSBjbGljaywgcmVzaXplLCBhbmQgbGF5b3V0IGxpc3RlbmVycyBhcmUgcmVzdG9yZWQuXG4gICAgaXNJbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICAvLyBTZXQgQ1NTIHZhcmlhYmxlcyBvbiByb290IGZvciBnbG9iYWwgYWNjZXNzIChtb2RhbHMsIGJsdXIgbGF5ZXIsIGV0Yy4pXG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1vdmVybGF5LW9wYWNpdHknLCBvcGFjaXR5KTtcbiAgICBpZiAoY29uZmlndXJlZE92ZXJsYXlCbHVyUHggIT09IG51bGwpIHtcbiAgICAgICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1vdmVybGF5LWJsdXInLCBgJHtjb25maWd1cmVkT3ZlcmxheUJsdXJQeH1weGApO1xuICAgIH1cbiAgICBpZiAoY29uZmlndXJlZE92ZXJsYXlNb2JpbGVCbHVyUHggIT09IG51bGwpIHtcbiAgICAgICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1vdmVybGF5LW1vYmlsZS1ibHVyJywgYCR7Y29uZmlndXJlZE92ZXJsYXlNb2JpbGVCbHVyUHh9cHhgKTtcbiAgICB9XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1vdmVybGF5LXRyYW5zaXRpb24tZHVyYXRpb24nLCBgJHt0cmFuc2l0aW9uTXN9bXNgKTtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLW92ZXJsYXktdHJhbnNpdGlvbi1vdXQtZHVyYXRpb24nLCBgJHt0cmFuc2l0aW9uT3V0TXN9bXNgKTtcbiAgICBcbiAgICBjb25zdCBwcmVzZXJ2ZUFjdGl2ZUJhY2tkcm9wID1cbiAgICAgIGJsdXJMYXllckVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKVxuICAgICAgfHwgY29udGVudExheWVyRWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpXG4gICAgICB8fCBnZXRUcmFuc2l0aW9uUGhhc2UoKSA9PT0gVFJBTlNJVElPTl9QSEFTRVMuTU9EQUxfT1BFTjtcblxuICAgIGlmIChwcmVzZXJ2ZUFjdGl2ZUJhY2tkcm9wKSB7XG4gICAgICBibHVyTGF5ZXJFbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2FjdGl2ZScpO1xuICAgICAgY29udGVudExheWVyRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICAgIGJsdXJMYXllckVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICdmYWxzZScpO1xuICAgICAgY29udGVudExheWVyRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgICBpZiAoIWlzUm91dGVUcmFuc2l0aW9uUGhhc2UoZ2V0VHJhbnNpdGlvblBoYXNlKCkpKSB7XG4gICAgICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5NT0RBTF9PUEVOKTtcbiAgICAgIH1cbiAgICAgIGFwcGx5RGVwdGhFZmZlY3QodHJ1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIEVuc3VyZSBpbml0aWFsIHN0YXRlOiBub3QgYWN0aXZlXG4gICAgICBibHVyTGF5ZXJFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgICAgY29udGVudExheWVyRWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdhY3RpdmUnKTtcbiAgICAgIGJsdXJMYXllckVsZW1lbnQuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICBjb250ZW50TGF5ZXJFbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgYXBwbHlEZXB0aEVmZmVjdChmYWxzZSk7XG4gICAgfVxuICAgIFxuICAgIC8vIENsaWNrIG9uIGNvbnRlbnQgbGF5ZXIgZGlzbWlzc2VzIGFjdGl2ZSBtb2RhbFxuICAgIGNvbnRlbnRMYXllckVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoYW5kbGVPdmVybGF5Q2xpY2ssIHRydWUpO1xuICAgIGNvbnRlbnRMYXllckVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBoYW5kbGVPdmVybGF5Q2xpY2ssIHsgY2FwdHVyZTogdHJ1ZSB9KTtcbiAgICBcbiAgICAvLyBMaXN0ZW4gZm9yIGxheW91dCBjaGFuZ2VzIHRvIHVwZGF0ZSBkZXNrdG9wL21vYmlsZSBibHVyLlxuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdyZXNpemUnLCBoYW5kbGVPdmVybGF5Qmx1clJlZnJlc2gpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBoYW5kbGVPdmVybGF5Qmx1clJlZnJlc2gpO1xuICAgIFxuICAgIC8vIEFsc28gbGlzdGVuIGZvciBjdXN0b20gbGF5b3V0IHVwZGF0ZSBldmVudHMgaWYgdGhleSBleGlzdFxuICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2xheW91dC11cGRhdGVkJywgaGFuZGxlT3ZlcmxheUJsdXJSZWZyZXNoKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdsYXlvdXQtdXBkYXRlZCcsIGhhbmRsZU92ZXJsYXlCbHVyUmVmcmVzaCk7XG4gICAgXG4gICAgY29uc3QgYmx1clB4ID0gcmVzb2x2ZU92ZXJsYXlCbHVyUHgoKSA/PyAoZ2V0V2FsbFRoaWNrbmVzcygpIC8gNCk7XG4gICAgY29uc29sZS5sb2coYE1vZGFsIE92ZXJsYXk6IEluaXRpYWxpemVkICh0d28tbGF5ZXIgYXJjaGl0ZWN0dXJlLCBibHVyOiAke2JsdXJQeH1weCwgdHJhbnNpdGlvbjogJHt0cmFuc2l0aW9uTXN9bXMpYCk7XG59XG5cbi8qKlxuICogSGFuZGxlIGNsaWNrIG9uIGNvbnRlbnQgbGF5ZXIgLSBkaXNwYXRjaCBkaXNtaXNzIGV2ZW50IGZvciBtb2RhbHMgdG8gbGlzdGVuXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZU92ZXJsYXlDbGljayhlKSB7XG4gICAgLy8gSWYgbGF5ZXJzIGFyZSBoaWRkZW4gb3IgZGlzYWJsZWQsIGRvIG5vdGhpbmdcbiAgICBpZiAoIWlzRW5hYmxlZCB8fCAhY29udGVudExheWVyRWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBFbnN1cmUgdGFyZ2V0IGlzIGFuIEVsZW1lbnQgKGNvdWxkIGJlIFRleHQgbm9kZSwgRG9jdW1lbnQsIGV0Yy4pXG4gICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQ/LmNsb3Nlc3QgPyBlLnRhcmdldCA6IGUudGFyZ2V0Py5wYXJlbnRFbGVtZW50O1xuICAgIGlmICghdGFyZ2V0Py5jbG9zZXN0KSByZXR1cm47XG5cbiAgICAvLyBJZ25vcmUgY2xpY2tzIG9uIGludGVyYWN0aXZlIGVsZW1lbnRzIHdpdGhpbiBtb2RhbHMgKGJ1dHRvbnMsIGlucHV0cywgZXRjLilcbiAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJ2J1dHRvbicpKSByZXR1cm47XG4gICAgaWYgKHRhcmdldC5jbG9zZXN0KCdpbnB1dCcpKSByZXR1cm47XG4gICAgaWYgKHRhcmdldC5jbG9zZXN0KCdhJykpIHJldHVybjtcbiAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJ3NlbGVjdCcpKSByZXR1cm47XG4gICAgaWYgKHRhcmdldC5jbG9zZXN0KCd0ZXh0YXJlYScpKSByZXR1cm47XG4gICAgXG4gICAgLy8gQWNjZXB0IGNsaWNrcyBvbiBjb250ZW50IGxheWVyLCBtb2RhbCBob3N0LCBvciBtb2RhbCBjb250YWluZXJzIChidXQgbm90IHRoZWlyIGludGVyYWN0aXZlIGNoaWxkcmVuKVxuICAgIGNvbnN0IGlzR2F0ZUNvbnRhaW5lciA9IHRhcmdldC5pZCA9PT0gJ3NpbXVsYXRpb24tZm9jdXMtbW9kYWwnIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdzaW11bGF0aW9uLWZvY3VzLW1vZGFsJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ21vZGFsLWxhYmVsJykgfHxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5jbGFzc0xpc3QuY29udGFpbnMoJ21vZGFsLWRlc2NyaXB0aW9uJyk7XG4gICAgXG4gICAgY29uc3QgaXNDb250ZW50TGF5ZXJTdXJmYWNlID0gdGFyZ2V0ID09PSBjb250ZW50TGF5ZXJFbGVtZW50IHx8IHRhcmdldD8uaWQgPT09ICdtb2RhbC1tb2RhbC1ob3N0JztcbiAgICBpZiAoaXNDb250ZW50TGF5ZXJTdXJmYWNlIHx8IGlzR2F0ZUNvbnRhaW5lcikge1xuICAgICAgICAvLyBEaXNwYXRjaCBjdXN0b20gZXZlbnQgd2l0aCBpbnN0YW50IGZsYWcgKGZhbHNlID0gc21vb3RoIGNsb3NlKVxuICAgICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnbW9kYWwtb3ZlcmxheS1kaXNtaXNzJywgeyBkZXRhaWw6IHsgaW5zdGFudDogZmFsc2UgfSB9KSk7XG4gICAgfVxufVxuXG4vKipcbiAqIEFwcGx5IGRlcHRoIGVmZmVjdCBieSBzZXR0aW5nIENTUyB2YXJpYWJsZXMgb24gcm9vdFxuICovXG5mdW5jdGlvbiBhcHBseURlcHRoRWZmZWN0KGFjdGl2ZSkge1xuICAgIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gICAgY29uc3Qgc2NlbmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWJzLXNjZW5lJyk7XG4gICAgXG4gICAgaWYgKGFjdGl2ZSkge1xuICAgICAgICBjb25zdCBzY2FsZSA9IGdldENvbXB1dGVkU3R5bGUocm9vdCkuZ2V0UHJvcGVydHlWYWx1ZSgnLS1tb2RhbC1kZXB0aC1zY2FsZScpLnRyaW0oKSB8fCAnMC45Nic7XG4gICAgICAgIGNvbnN0IHR5ID0gZ2V0Q29tcHV0ZWRTdHlsZShyb290KS5nZXRQcm9wZXJ0eVZhbHVlKCctLW1vZGFsLWRlcHRoLXRyYW5zbGF0ZS15JykudHJpbSgpIHx8IFwidmFyKC0tc3BhY2Utc20pXCI7XG4gICAgICAgIGNvbnN0IGxvZ29CbHVyQWN0aXZlID0gZ2V0Q29tcHV0ZWRTdHlsZShyb290KS5nZXRQcm9wZXJ0eVZhbHVlKCctLWxvZ28tYmx1ci1hY3RpdmUtdGFyZ2V0JykudHJpbSgpIFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB8fCByb290LnN0eWxlLmdldFByb3BlcnR5VmFsdWUoJy0tbG9nby1ibHVyLWFjdGl2ZS10YXJnZXQnKSBcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfHwgXCJ2YXIoLS1yYWRpdXMtbWQpXCI7XG4gICAgICAgIFxuICAgICAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLXNjYWxlLWFjdGl2ZScsIHNjYWxlKTtcbiAgICAgICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1kZXB0aC10eS1hY3RpdmUnLCB0eSk7XG4gICAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG9nby1ibHVyLWFjdGl2ZScsIGxvZ29CbHVyQWN0aXZlKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChzY2VuZSkgc2NlbmUuY2xhc3NMaXN0LmFkZCgnZ2F0ZS1kZXB0aC1hY3RpdmUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBsb2dvQmx1ckluYWN0aXZlID0gZ2V0Q29tcHV0ZWRTdHlsZShyb290KS5nZXRQcm9wZXJ0eVZhbHVlKCctLWxvZ28tYmx1ci1pbmFjdGl2ZScpLnRyaW0oKSB8fCAnMHB4JztcblxuICAgICAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLXNjYWxlLWFjdGl2ZScsICcxJyk7XG4gICAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtZGVwdGgtdHktYWN0aXZlJywgJzBweCcpO1xuICAgICAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWxvZ28tYmx1ci1hY3RpdmUnLCBsb2dvQmx1ckluYWN0aXZlKTtcblxuICAgICAgICBpZiAoc2NlbmUpIHNjZW5lLmNsYXNzTGlzdC5yZW1vdmUoJ2dhdGUtZGVwdGgtYWN0aXZlJyk7XG4gICAgfVxufVxuXG4vLyBMb2dvL25hdiBmYWRlIGlzIG5vdyBoYW5kbGVkIHB1cmVseSBieSBDU1MgdmlhIGRhdGEtYWJzLXRyYW5zaXRpb24tcGhhc2Vcbi8vIFRoZSBDU1Mgc2V0cyAtLXVpLW9ic2N1cmVkOiAxIHdoaWNoIGRlcml2ZXMgb3BhY2l0eTogMCBmb3IgbG9nbyBhbmQgbmF2XG5cbi8qKlxuICogU2hvdyB0aGUgb3ZlcmxheSB3aXRoIHNtb290aCBibHVyIGFuaW1hdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gc2hvd092ZXJsYXkoKSB7XG4gICAgaWYgKCFibHVyTGF5ZXJFbGVtZW50IHx8ICFjb250ZW50TGF5ZXJFbGVtZW50IHx8ICFpc0VuYWJsZWQpIHJldHVybjtcbiAgICBcbiAgICAvLyBFbnN1cmUgYmx1ciBDU1MgdmFyaWFibGUgaXMgY3VycmVudFxuICAgIHVwZGF0ZUJsdXJGcm9tV2FsbFRoaWNrbmVzcygnc2hvd092ZXJsYXknKTtcblxuICAgIGNsZWFyTW9kYWxSZXR1cm5TdGF0ZSgpO1xuICAgIHNldFRyYW5zaXRpb25QaGFzZShUUkFOU0lUSU9OX1BIQVNFUy5NT0RBTF9PUEVOKTtcbiAgICBkaXNwYXRjaE1vZGFsVHJhbnNpdGlvbkV2ZW50KCdhYnM6dHJhbnNpdGlvbi1tb2RhbC1vcGVuJyk7XG4gICAgXG4gICAgLy8gVXBkYXRlIGFyaWEgc3RhdGVzXG4gICAgYmx1ckxheWVyRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgY29udGVudExheWVyRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ2ZhbHNlJyk7XG4gICAgXG4gICAgLy8gQWRkIGFjdGl2ZSBjbGFzcyB0byBCT1RIIGxheWVycyBzaW11bHRhbmVvdXNseVxuICAgIC8vIEJsdXIgbGF5ZXIgaGFuZGxlcyBiYWNrZHJvcC1maWx0ZXIgdHJhbnNpdGlvbiBpbmRlcGVuZGVudGx5XG4gICAgLy8gQ29udGVudCBsYXllciBoYW5kbGVzIG1vZGFsIGNvbnRlbnQgd2l0aG91dCBhZmZlY3RpbmcgYmx1clxuICAgIGJsdXJMYXllckVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnYWN0aXZlJyk7XG4gICAgY29udGVudExheWVyRWxlbWVudC5jbGFzc0xpc3QuYWRkKCdhY3RpdmUnKTtcbiAgICBcbiAgICAvLyBUcmFuc2Zvcm0gY3Vyc29yIHRvIGxhcmdlciB0cmFuc3BhcmVudCBjaXJjbGVcbiAgICBjb25zdCBjdXJzb3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY3VzdG9tLWN1cnNvcicpO1xuICAgIGlmIChjdXJzb3IpIHtcbiAgICAgICAgbGV0IGlzTW9iaWxlVmlld3BvcnQgPSBmYWxzZTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGlzTW9iaWxlVmlld3BvcnQgPSBCb29sZWFuKHdpbmRvdy5tYXRjaE1lZGlhICYmIHdpbmRvdy5tYXRjaE1lZGlhKCcobWF4LXdpZHRoOiB2YXIoLS1zaXplLTYwMCkpJykubWF0Y2hlcyk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHt9XG5cbiAgICAgICAgaWYgKGlzTW9iaWxlVmlld3BvcnQpIHtcbiAgICAgICAgICAgIGN1cnNvci5jbGFzc0xpc3QucmVtb3ZlKCdtb2RhbC1hY3RpdmUnKTtcbiAgICAgICAgICAgIGN1cnNvci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3Vyc29yLmNsYXNzTGlzdC5hZGQoJ21vZGFsLWFjdGl2ZScpO1xuICAgICAgICAgICAgY3Vyc29yLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xuICAgICAgICAgICAgY3Vyc29yLnN0eWxlLm9wYWNpdHkgPSAnJztcbiAgICAgICAgfVxuICAgIH1cbiAgICBcbiAgICAvLyBBcHBseSBkZXB0aCBlZmZlY3QgdG8gc2NlbmVcbiAgICBhcHBseURlcHRoRWZmZWN0KHRydWUpO1xufVxuXG4vKipcbiAqIEhpZGUgdGhlIG92ZXJsYXkgd2l0aCBzbW9vdGggYmx1ciBhbmltYXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGhpZGVPdmVybGF5KHsgY2xlYXJSZXR1cm5TdGF0ZSA9IHRydWUsIGluc3RhbnQgPSBmYWxzZSB9ID0ge30pIHtcbiAgICBpZiAoIWJsdXJMYXllckVsZW1lbnQgfHwgIWNvbnRlbnRMYXllckVsZW1lbnQgfHwgIWlzRW5hYmxlZCkgcmV0dXJuO1xuXG4gICAgY29uc3Qgd2FzT3ZlcmxheUFjdGl2ZSA9XG4gICAgICBibHVyTGF5ZXJFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnYWN0aXZlJykgfHxcbiAgICAgIGNvbnRlbnRMYXllckVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdhY3RpdmUnKSB8fFxuICAgICAgZ2V0VHJhbnNpdGlvblBoYXNlKCkgPT09IFRSQU5TSVRJT05fUEhBU0VTLk1PREFMX09QRU47XG5cbiAgICBpZiAoIXdhc092ZXJsYXlBY3RpdmUpIHtcbiAgICAgIGlmIChjbGVhclJldHVyblN0YXRlKSBjbGVhck1vZGFsUmV0dXJuU3RhdGUoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoY2xlYXJSZXR1cm5TdGF0ZSkgY2xlYXJNb2RhbFJldHVyblN0YXRlKCk7XG5cbiAgICBjb25zdCBvdmVybGF5TGF5ZXJzID0gW2JsdXJMYXllckVsZW1lbnQsIGNvbnRlbnRMYXllckVsZW1lbnRdO1xuICAgIGlmIChpbnN0YW50KSB7XG4gICAgICAgIG92ZXJsYXlMYXllcnMuZm9yRWFjaCgobGF5ZXIpID0+IHtcbiAgICAgICAgICAgIGxheWVyLnN0eWxlLnRyYW5zaXRpb24gPSAnbm9uZSc7XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBcbiAgICAvLyBSZW1vdmUgYWN0aXZlIGNsYXNzIGZyb20gQk9USCBsYXllcnNcbiAgICBibHVyTGF5ZXJFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoJ2FjdGl2ZScpO1xuICAgIGNvbnRlbnRMYXllckVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZSgnYWN0aXZlJyk7XG4gICAgXG4gICAgYmx1ckxheWVyRWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICBjb250ZW50TGF5ZXJFbGVtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgIFxuICAgIC8vIFJlc3RvcmUgbm9ybWFsIGN1cnNvclxuICAgIGNvbnN0IGN1cnNvciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjdXN0b20tY3Vyc29yJyk7XG4gICAgaWYgKGN1cnNvcikgY3Vyc29yLmNsYXNzTGlzdC5yZW1vdmUoJ21vZGFsLWFjdGl2ZScpO1xuICAgIFxuICAgIC8vIFJlbW92ZSBkZXB0aCBlZmZlY3QgZnJvbSBzY2VuZVxuICAgIGFwcGx5RGVwdGhFZmZlY3QoZmFsc2UpO1xuXG4gICAgaWYgKGluc3RhbnQpIHtcbiAgICAgICAgdm9pZCBibHVyTGF5ZXJFbGVtZW50Lm9mZnNldFdpZHRoO1xuICAgICAgICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgICAgb3ZlcmxheUxheWVycy5mb3JFYWNoKChsYXllcikgPT4ge1xuICAgICAgICAgICAgICAgIGxheWVyLnN0eWxlLnJlbW92ZVByb3BlcnR5KCd0cmFuc2l0aW9uJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWYgKCFpc1JvdXRlVHJhbnNpdGlvblBoYXNlKGdldFRyYW5zaXRpb25QaGFzZSgpKSkge1xuICAgICAgICBzZXRUcmFuc2l0aW9uUGhhc2UoVFJBTlNJVElPTl9QSEFTRVMuSURMRSwgeyByZXR1cm5pbmc6IGNsZWFyUmV0dXJuU3RhdGUgfSk7XG4gICAgICAgIGRpc3BhdGNoTW9kYWxUcmFuc2l0aW9uRXZlbnQoJ2Ficzp0cmFuc2l0aW9uLW1vZGFsLWNsb3NlJywge1xuICAgICAgICAgICAgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246ICFjbGVhclJldHVyblN0YXRlLFxuICAgICAgICB9KTtcbiAgICB9XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgb3ZlcmxheSBpcyBjdXJyZW50bHkgYWN0aXZlXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBvdmVybGF5IGlzIHZpc2libGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT3ZlcmxheUFjdGl2ZSgpIHtcbiAgICBpZiAoIWNvbnRlbnRMYXllckVsZW1lbnQpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gY29udGVudExheWVyRWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2FjdGl2ZScpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBvdmVybGF5IGJsdXJcbiAqIEBwYXJhbSB7bnVtYmVyfSBbYmx1clB4XSAtIE9wdGlvbmFsIGV4cGxpY2l0IGJsdXIgdmFsdWUgaW4gcGl4ZWxzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVPdmVybGF5Qmx1cihibHVyUHgpIHtcbiAgICBpZiAoIWJsdXJMYXllckVsZW1lbnQpIHJldHVybjtcbiAgICBcbiAgICBpZiAoYmx1clB4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uZmlndXJlZE92ZXJsYXlCbHVyUHggPSBub3JtYWxpemVCbHVyUHgoYmx1clB4LCBjb25maWd1cmVkT3ZlcmxheUJsdXJQeCk7XG4gICAgICAgIGJsdXJFeHBsaWNpdGx5U2V0ID0gdHJ1ZTtcbiAgICAgICAgaWYgKGNvbmZpZ3VyZWRPdmVybGF5Qmx1clB4ICE9PSBudWxsKSB7XG4gICAgICAgICAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS1ibHVyJywgYCR7Y29uZmlndXJlZE92ZXJsYXlCbHVyUHh9cHhgKTtcbiAgICAgICAgfVxuICAgICAgICB1cGRhdGVCbHVyRnJvbVdhbGxUaGlja25lc3MoJ3VwZGF0ZU92ZXJsYXlCbHVyJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY29uZmlndXJlZE92ZXJsYXlCbHVyUHggPSBudWxsO1xuICAgICAgICBibHVyRXhwbGljaXRseVNldCA9IGNvbmZpZ3VyZWRPdmVybGF5TW9iaWxlQmx1clB4ICE9PSBudWxsO1xuICAgICAgICB1cGRhdGVCbHVyRnJvbVdhbGxUaGlja25lc3MoKTtcbiAgICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVPdmVybGF5TW9iaWxlQmx1cihibHVyUHgpIHtcbiAgICBpZiAoIWJsdXJMYXllckVsZW1lbnQpIHJldHVybjtcblxuICAgIGlmIChibHVyUHggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBjb25maWd1cmVkT3ZlcmxheU1vYmlsZUJsdXJQeCA9IG5vcm1hbGl6ZUJsdXJQeChibHVyUHgsIGNvbmZpZ3VyZWRPdmVybGF5TW9iaWxlQmx1clB4KTtcbiAgICAgICAgYmx1ckV4cGxpY2l0bHlTZXQgPSB0cnVlO1xuICAgICAgICBpZiAoY29uZmlndXJlZE92ZXJsYXlNb2JpbGVCbHVyUHggIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1vdmVybGF5LW1vYmlsZS1ibHVyJywgYCR7Y29uZmlndXJlZE92ZXJsYXlNb2JpbGVCbHVyUHh9cHhgKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbmZpZ3VyZWRPdmVybGF5TW9iaWxlQmx1clB4ID0gbnVsbDtcbiAgICAgICAgYmx1ckV4cGxpY2l0bHlTZXQgPSBjb25maWd1cmVkT3ZlcmxheUJsdXJQeCAhPT0gbnVsbDtcbiAgICB9XG4gICAgdXBkYXRlQmx1ckZyb21XYWxsVGhpY2tuZXNzKCd1cGRhdGVPdmVybGF5TW9iaWxlQmx1cicpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBvdmVybGF5IG9wYWNpdHkgdmFsdWUgKGZvciBsaXZlIGNvbnRyb2wgcGFuZWwgYWRqdXN0bWVudClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZU92ZXJsYXlPcGFjaXR5KG9wYWNpdHkpIHtcbiAgICBpZiAoIWJsdXJMYXllckVsZW1lbnQpIHJldHVybjtcbiAgICBibHVyTGF5ZXJFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLW92ZXJsYXktb3BhY2l0eScsIG9wYWNpdHkpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBvdmVybGF5IHRyYW5zaXRpb24gZHVyYXRpb24gKGZvciBsaXZlIGNvbnRyb2wgcGFuZWwgYWRqdXN0bWVudClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZU92ZXJsYXlUcmFuc2l0aW9uKHRyYW5zaXRpb25Ncykge1xuICAgIGlmICghYmx1ckxheWVyRWxlbWVudCkgcmV0dXJuO1xuICAgIGJsdXJMYXllckVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS10cmFuc2l0aW9uLWR1cmF0aW9uJywgYCR7dHJhbnNpdGlvbk1zfW1zYCk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLWR1cmF0aW9uJywgYCR7dHJhbnNpdGlvbk1zfW1zYCk7XG4gICAgYXBwbHlEZXB0aEVmZmVjdChpc092ZXJsYXlBY3RpdmUoKSk7XG59XG5cbi8qKlxuICogVXBkYXRlIG92ZXJsYXkgdHJhbnNpdGlvbi1vdXQgZHVyYXRpb24gKGZvciBsaXZlIGNvbnRyb2wgcGFuZWwgYWRqdXN0bWVudClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZU92ZXJsYXlUcmFuc2l0aW9uT3V0KHRyYW5zaXRpb25Ncykge1xuICAgIGlmICghYmx1ckxheWVyRWxlbWVudCkgcmV0dXJuO1xuICAgIGJsdXJMYXllckVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS10cmFuc2l0aW9uLW91dC1kdXJhdGlvbicsIGAke3RyYW5zaXRpb25Nc31tc2ApO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1kZXB0aC1vdXQtZHVyYXRpb24nLCBgJHt0cmFuc2l0aW9uTXN9bXNgKTtcbiAgICBhcHBseURlcHRoRWZmZWN0KGlzT3ZlcmxheUFjdGl2ZSgpKTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgZGVwdGggc2NhbGUgKGZvciBsaXZlIGNvbnRyb2wgcGFuZWwgYWRqdXN0bWVudClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUdhdGVEZXB0aFNjYWxlKHNjYWxlKSB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLXNjYWxlJywgc2NhbGUpO1xuICAgIGFwcGx5RGVwdGhFZmZlY3QoaXNPdmVybGF5QWN0aXZlKCkpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBjb250ZW50IGRlbGF5IChmb3IgbGl2ZSBjb250cm9sIHBhbmVsIGFkanVzdG1lbnQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVHYXRlQ29udGVudERlbGF5KG1zKSB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWNvbnRlbnQtZGVsYXknLCBgJHttc31tc2ApO1xufVxuXG5cbi8qKlxuICogVXBkYXRlIGRlcHRoIHRyYW5zbGF0ZSBZIChmb3IgbGl2ZSBjb250cm9sIHBhbmVsIGFkanVzdG1lbnQpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVHYXRlRGVwdGhUcmFuc2xhdGVZKHB4KSB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLXRyYW5zbGF0ZS15JywgYCR7cHh9cHhgKTtcbiAgICBhcHBseURlcHRoRWZmZWN0KGlzT3ZlcmxheUFjdGl2ZSgpKTtcbn1cblxuLyoqXG4gKiBVcGRhdGUgbG9nbyBibHVyIHdoZW4gaW5hY3RpdmUgKGZvciBsaXZlIGNvbnRyb2wgcGFuZWwgYWRqdXN0bWVudClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUxvZ29CbHVySW5hY3RpdmUocHgpIHtcbiAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG9nby1ibHVyLWluYWN0aXZlJywgYCR7cHh9cHhgKTtcbiAgICBpZiAoIWlzT3ZlcmxheUFjdGl2ZSgpKSB7XG4gICAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbG9nby1ibHVyLWFjdGl2ZScsIGAke3B4fXB4YCk7XG4gICAgfVxuICAgIGFwcGx5RGVwdGhFZmZlY3QoaXNPdmVybGF5QWN0aXZlKCkpO1xufVxuXG4vKipcbiAqIFVwZGF0ZSBsb2dvIGJsdXIgd2hlbiBhY3RpdmUgKGZvciBsaXZlIGNvbnRyb2wgcGFuZWwgYWRqdXN0bWVudClcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUxvZ29CbHVyQWN0aXZlKHB4KSB7XG4gICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWxvZ28tYmx1ci1hY3RpdmUtdGFyZ2V0JywgYCR7cHh9cHhgKTtcbiAgICBpZiAoaXNPdmVybGF5QWN0aXZlKCkpIHtcbiAgICAgICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1sb2dvLWJsdXItYWN0aXZlJywgYCR7cHh9cHhgKTtcbiAgICB9XG4gICAgYXBwbHlEZXB0aEVmZmVjdChpc092ZXJsYXlBY3RpdmUoKSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDOUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFD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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTTtBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNqQzs7QUFFQSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENB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QUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQ2xILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDM0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BILENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzVCOztBQUVBLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNsRDs7QUFFQSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUM5RCxDQUFDLENBQUM7QUFDRixNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMxRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUM7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUM1RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3BELENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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LENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWU7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDaEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFFLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNyQixDQUFDLENB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QyxDQUFDLEVBQUUsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWE7QUFDekUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU07O0FBRWhDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQzFDLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFFBQVE7QUFDMUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDekUsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztBQUNyRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7QUFDbEQsQ0FBQyxDQUFDO0FBQ0YsUUFBUSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWU7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3JHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNuSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN4RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQzs7QUFFaEgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUM7O0FBRXRFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKOztBQUVBLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQztB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