/**
 * Portfolio Modal Controller
 * Handles the password-gating UI for the portfolio section.
 */

import { showOverlay, hideOverlay, mountModalIntoOverlay, unmountModalFromOverlay } from './modal-overlay.js';
import { getText } from '../utils/text-loader.js';
import { isDev } from '../utils/logger.js';
import { navigateWithTransition, NAV_STATES } from '../utils/page-nav.js';

export function initPortfolioModal() {
    const trigger = document.getElementById('portfolio-modal-trigger');
    const modal = document.getElementById('portfolio-modal');
    // Brand logo is optional (some layouts remove it); modal should still function without it.
    const logo = document.getElementById('brand-logo');
    const cvGate = document.getElementById('cv-modal'); // Get CV modal to check/close if open
    const contactGate = document.getElementById('contact-modal'); // Get contact modal to check/close if open
    const inputs = Array.from(document.querySelectorAll('.portfolio-digit'));
    const modalLabel = document.getElementById('portfolio-modal-label');
    
    // Correct Code
    const CODE = '1234';
    
    if (!trigger || !modal || inputs.length === 0) {
        console.warn('Portfolio Gate: Missing required elements');
        return;
    }

    if (modal.dataset.modalInitialized === 'true') return;
    modal.dataset.modalInitialized = 'true';
    
    const BACK_TEXT = getText('gates.common.backText', 'BACK');
    const BACK_ARIA = getText('gates.common.backAriaLabel', 'Back');
    const TITLE = getText('gates.portfolio.title', 'View Portfolio');
    const DESC = getText(
        'gates.portfolio.description',
        "Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated."
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

    // State
    let isOpen = false;
    let lastOpenTime = 0;

    // Helper to check if any modal is currently active
    const isAnyGateActive = () => {
        return (modal && modal.classList.contains('active')) ||
               (cvGate && cvGate.classList.contains('active')) ||
               (contactGate && contactGate.classList.contains('active'));
    };

    // --- Actions ---

    const openGate = (e) => {
        if (e) e.preventDefault();
        
        // Check if any other modal is currently open
        const wasAnyGateActive = isAnyGateActive();

        // Prefetch portfolio resources (non-blocking)
        const basePath = (() => {
            try {
                const b = window.PORTFOLIO_BASE || '';
                return b && !b.endsWith('/') ? `${b}/` : b;
            } catch (e) {
                return '';
            }
        })();
        const bundlePath = isDev()
            ? 'modules/portfolio/app.js'
            : 'js/portfolio-bundle.js';
        const prefetchLink = document.createElement('link');
        prefetchLink.rel = 'prefetch';
        prefetchLink.href = `${basePath}${bundlePath}`;
        document.head.appendChild(prefetchLink);
        
        // Warm the cache with a lightweight, non-blocking hint.
        // Use `prefetch` (not `preload`) to avoid “preloaded but not used” console warnings.
        const preloadImg = document.createElement('link');
        preloadImg.rel = 'prefetch';
        // Note: portfolio page assets are chapter-indexed starting at 1.
        preloadImg.href = `${basePath}images/portfolio/pages/chapter-1-1.webp`;
        document.head.appendChild(preloadImg);
        
        // Close CV modal if it's open
        if (cvGate && cvGate.classList.contains('active')) {
            cvGate.classList.remove('active');
            cvGate.setAttribute('aria-hidden', 'true');
            setTimeout(() => {
                cvGate.classList.add('hidden');
                unmountModalFromOverlay(cvGate);
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
        if (logo) logo.classList.add('fade-out-up');
        
        // Fade out CV content on CV page
        const cvContainer = document.querySelector('.cv-scroll-container');
        if (cvContainer) {
            cvContainer.classList.add('fade-out-up');
        }

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
            if (logo) logo.style.transition = 'none';
            
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
            modal.classList.add('hidden');
            unmountModalFromOverlay(modal);
            if (logo) logo.classList.remove('fade-out-up');
            
            // Fade CV content back in on CV page
            const cvContainer = document.querySelector('.cv-scroll-container');
            if (cvContainer) {
                cvContainer.classList.remove('fade-out-up');
            }
            
            // Hide overlay immediately if no other modal is active
            if (!isAnyGateActive()) {
                hideOverlay();
            }
            
            // Re-enable transitions after a frame
            requestAnimationFrame(() => {
                modal.style.removeProperty('transition');
                if (logo) logo.style.removeProperty('transition');
            });
        } else {
            // Smooth close: use CSS transition
            modal.classList.remove('active');
            modal.setAttribute('aria-hidden', 'true');
            if (logo) logo.classList.remove('fade-out-up');
            
            // Fade CV content back in on CV page
            const cvContainer = document.querySelector('.cv-scroll-container');
            if (cvContainer) {
                cvContainer.classList.remove('fade-out-up');
            }
            
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
                // ═══════════════════════════════════════════════════════════════════
                // GATE UNLOCK ANIMATION SEQUENCE (US-005)
                // 1. Input pulse (200ms) - immediate tactile feedback
                // 2. Success flash (150ms) - green tint overlay
                // 3. Modal dissolve (250ms) - scale up + blur + fade
                // 4. Departure/transition - navigate to destination
                // Total: ~500ms from correct code to navigation start
                // ═══════════════════════════════════════════════════════════════════
                
                // Step 1: Input container pulse
                const inputsContainer = document.querySelector('.portfolio-modal-inputs');
                if (inputsContainer) {
                    inputsContainer.classList.remove('pulse-energy');
                    void inputsContainer.offsetWidth;
                    inputsContainer.classList.add('pulse-energy');
                }
                
                // Set session token (soft modal)
                sessionStorage.setItem('abs_portfolio_ok', Date.now());
                
                // Step 2: Modal dissolve animation (after pulse)
                setTimeout(() => {
                    // Use WAAPI for smooth modal dissolve
                    if (typeof modal.animate === 'function') {
                        modal.animate(
                            [
                                { transform: 'scale(1)', opacity: 1, filter: 'blur(0)' },
                                { transform: 'scale(1.03)', opacity: 0, filter: 'blur(4px)' }
                            ],
                            { duration: 250, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
                        );
                    } else {
                        modal.style.transition = 'transform 250ms ease-out, opacity 250ms ease-out, filter 250ms ease-out';
                        modal.style.transform = 'scale(1.03)';
                        modal.style.opacity = '0';
                        modal.style.filter = 'blur(4px)';
                    }
                }, 200);
                
                // Step 4: Navigate (after dissolve is mostly complete)
                setTimeout(() => {
                    navigateWithTransition('portfolio.html', NAV_STATES.INTERNAL);
                }, 450);
                
            } else {
                // Failure - clear inputs
                setTimeout(() => {
                    inputs.forEach(input => input.value = '');
                    inputs[0].focus();
                }, 150);
            }
        }
    };

    // --- Event Listeners ---

    // Auto-open check (if redirected back from portfolio.html)
    if (sessionStorage.getItem('abs_open_portfolio_modal')) {
        sessionStorage.removeItem('abs_open_portfolio_modal');
        // Small delay to allow page init
        setTimeout(() => openGate(), 300);
    }

    trigger.addEventListener('click', openGate);

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
