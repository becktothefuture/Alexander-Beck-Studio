// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
// ║                       Modular Architecture Bootstrap                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from './modules/core/constants.js';
import { initState, setCanvas, getGlobals } from './modules/core/state.js';
import { initializeDarkMode } from './modules/visual/dark-mode-v2.js';
import { applyColorTemplate, populateColorSelect } from './modules/visual/colors.js';
import { setupRenderer, getCanvas, getContext, resize } from './modules/rendering/renderer.js';
import { createPanelDock } from './modules/ui/panel-dock.js';
import { setupKeyboardShortcuts } from './modules/ui/keyboard.js';
import { setupPointer } from './modules/input/pointer.js';
import { setupCustomCursor } from './modules/rendering/cursor.js';
import { setMode, MODES, getForceApplicator } from './modules/modes/mode-controller.js';
import { startMainLoop } from './modules/rendering/loop.js';
import { loadSettings } from './modules/utils/storage.js';
import { initCVGate } from './modules/ui/cv-gate.js';
import { initPortfolioGate } from './modules/ui/portfolio-gate.js';
import { createSoundToggle } from './modules/ui/sound-toggle.js';
import { createThemeToggle } from './modules/ui/theme-toggle.js';
// Layout controls now integrated into master panel
import { initBrandLogoCursorScale } from './modules/ui/brand-logo-cursor-scale.js';
import { initBrandLogoBallSpace } from './modules/ui/brand-logo-ball-space.js';
import { setApplyVisualCSSVars } from './modules/ui/control-registry.js';

async function loadRuntimeConfig() {
  try {
    const paths = ['config/default-config.json', 'js/config.json', '../public/js/config.json'];
    for (const path of paths) {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (res.ok) return await res.json();
      } catch (e) {
        // Try next
      }
    }
    throw new Error('No config found');
  } catch (e) {
    console.warn('Config load failed, using defaults');
    return { gravityMultiplier: 1.05, ballMass: 91, maxBalls: 300 };
  }
}

/**
 * Apply two-level padding CSS variables from global state to :root
 * 
 * Two-level system:
 * 1. --container-border: insets #bravia-balls from viewport (reveals body bg as outer frame)
 * 2. --simulation-padding: padding inside container around canvas (inner breathing room)
 * 
 * The canvas radius auto-calculates via CSS: calc(var(--container-radius) - var(--simulation-padding))
 */
export function applyFramePaddingCSSVars() {
  const g = getGlobals();
  const root = document.documentElement;
  
  // Outer frame: container inset from viewport
  root.style.setProperty('--container-border', `${g.containerBorder ?? 20}px`);
  
  // Inner padding: canvas inset from container
  root.style.setProperty('--simulation-padding', `${g.simulationPadding || 0}px`);
}

/**
 * Apply visual CSS variables (noise opacity/size, walls) from config to :root
 */
export function applyVisualCSSVars(config) {
  const root = document.documentElement;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RUBBER WALL SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  if (config.wallThickness !== undefined) {
    root.style.setProperty('--wall-thickness', `${config.wallThickness}px`);
  }
  if (config.wallRadius !== undefined) {
    root.style.setProperty('--wall-radius', `${config.wallRadius}px`);
  }
  
  // Content padding (space between frame edge and content elements)
  if (config.contentPadding !== undefined) {
    root.style.setProperty('--content-padding', `${config.contentPadding}px`);
  }

  // Container inner shadow (inside rounded container wrapper)
  if (config.containerInnerShadowOpacity !== undefined) {
    root.style.setProperty('--container-inner-shadow-opacity', String(config.containerInnerShadowOpacity));
  }
  if (config.containerInnerShadowBlur !== undefined) {
    root.style.setProperty('--container-inner-shadow-blur', `${config.containerInnerShadowBlur}px`);
  }
  if (config.containerInnerShadowSpread !== undefined) {
    root.style.setProperty('--container-inner-shadow-spread', `${config.containerInnerShadowSpread}px`);
  }
  if (config.containerInnerShadowOffsetY !== undefined) {
    root.style.setProperty('--container-inner-shadow-offset-y', `${config.containerInnerShadowOffsetY}px`);
  }
  
  // Noise texture sizing
  if (config.noiseSizeBase !== undefined) {
    root.style.setProperty('--noise-size-base', `${config.noiseSizeBase}px`);
  }
  if (config.noiseSizeTop !== undefined) {
    root.style.setProperty('--noise-size-top', `${config.noiseSizeTop}px`);
  }
  
  // Noise opacity (light mode)
  if (config.noiseBackOpacity !== undefined) {
    root.style.setProperty('--noise-back-opacity', String(config.noiseBackOpacity));
  }
  if (config.noiseFrontOpacity !== undefined) {
    root.style.setProperty('--noise-front-opacity', String(config.noiseFrontOpacity));
  }
  
  // Noise opacity (dark mode)
  if (config.noiseBackOpacityDark !== undefined) {
    root.style.setProperty('--noise-back-opacity-dark', String(config.noiseBackOpacityDark));
  }
  if (config.noiseFrontOpacityDark !== undefined) {
    root.style.setProperty('--noise-front-opacity-dark', String(config.noiseFrontOpacityDark));
  }
}

/**
 * Ensure .noise-2 and .noise-3 elements exist (for modular dev where Webflow HTML isn't present).
 * Creates them as siblings to .noise inside the #bravia-balls container.
 */
function ensureNoiseElements() {
  // Check if we have a noise texture image to use
  const existingNoise = document.querySelector('.noise');
  if (!existingNoise) {
    // No noise system present (modular dev without Webflow assets) - skip
    return;
  }
  
  const noiseStyle = getComputedStyle(existingNoise);
  const bgImage = (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none') 
    ? noiseStyle.backgroundImage 
    : null;
  
  // Create noise-2 if it doesn't exist
  // Append to body (not inside #bravia-balls) to escape stacking context
  if (!document.querySelector('.noise-2')) {
    const noise2 = document.createElement('div');
    noise2.className = 'noise-2';
    if (bgImage) noise2.style.backgroundImage = bgImage;
    
    noise2.style.position = 'fixed';
    noise2.style.inset = '0';
    noise2.style.pointerEvents = 'none';
    noise2.style.backgroundRepeat = 'repeat';
    noise2.style.backgroundPosition = '50%';
    noise2.style.backgroundAttachment = 'fixed';
    noise2.style.mixBlendMode = 'luminosity';
    
    // Append to body, not inside #bravia-balls container
    document.body.appendChild(noise2);
    console.log('✓ Created .noise-2 element');
  }
  
  // Create noise-3 if it doesn't exist (on top of noise-2)
  // Append to body (not inside #bravia-balls) to escape stacking context
  if (!document.querySelector('.noise-3')) {
    const noise3 = document.createElement('div');
    noise3.className = 'noise-3';
    if (bgImage) noise3.style.backgroundImage = bgImage;
    
    noise3.style.position = 'fixed';
    noise3.style.inset = '0';
    noise3.style.pointerEvents = 'none';
    noise3.style.backgroundRepeat = 'repeat';
    noise3.style.backgroundPosition = '50%';
    noise3.style.backgroundAttachment = 'fixed';
    noise3.style.mixBlendMode = 'luminosity';
    
    // Append to body, not inside #bravia-balls container
    document.body.appendChild(noise3);
    console.log('✓ Created .noise-3 element');
  }
}

(async function init() {
  // Mark JS as enabled (for CSS fallback detection)
  document.documentElement.classList.add('js-enabled');
  
  // Wire up control registry to use CSS vars function (avoids circular dependency)
  setApplyVisualCSSVars(applyVisualCSSVars);
  
  try {
    console.log('🚀 Initializing modular bouncy balls...');
    
    const config = await loadRuntimeConfig();
    initState(config);
    console.log('✓ Config loaded');

    // Test/debug compatibility: expose key config-derived values on window
    // (Playwright tests assert these exist and match the runtime config)
    try {
      const g = getGlobals();
      if (typeof window !== 'undefined') {
        window.REST = g.REST;
        window.FRICTION = g.FRICTION;
        window.MAX_BALLS = g.maxBalls;
        window.repelRadius = g.repelRadius;
        window.repelPower = g.repelPower;
      }
    } catch (e) {}
    
    // Apply frame padding CSS vars from config (controls border thickness)
    applyFramePaddingCSSVars();
    console.log('✓ Frame padding applied');
    
    // Apply visual CSS vars (noise, inner shadow) from config
    applyVisualCSSVars(config);
    console.log('✓ Visual effects configured');
    
    // Ensure noise-2 and noise-3 elements exist (for modular dev environments)
    ensureNoiseElements();
    
    // Setup canvas (attaches resize listener, but doesn't resize yet)
    setupRenderer();
    const canvas = getCanvas();
    const ctx = getContext();
    const container = document.getElementById('bravia-balls');
    
    if (!canvas || !ctx || !container) {
      throw new Error('Missing DOM elements');
    }
    
    // Set canvas reference in state (needed for container-relative sizing)
    setCanvas(canvas, ctx, container);
    
    // NOW resize - container is available for container-relative sizing
    resize();
    console.log('✓ Canvas initialized (container-relative sizing)');
    
    // Ensure initial mouseInCanvas state is false for tests
    const globals = getGlobals();
    globals.mouseInCanvas = false;
    if (typeof window !== 'undefined') window.mouseInCanvas = false;
    
    // Setup pointer tracking BEFORE dark mode (needed for interactions)
    setupPointer();
    console.log('✓ Pointer tracking configured');
    
    // Setup custom cursor (circular, matches ball size)
    setupCustomCursor();
    console.log('✓ Custom cursor initialized');

    // Subtle brand logo micro-interaction (cursor distance scaling)
    initBrandLogoCursorScale();

    // Brand logo yields when balls crowd its area (simulation-driven, throttled)
    initBrandLogoBallSpace();
    
    // Load any saved settings
    loadSettings();
    
    // Initialize dark mode BEFORE colors (determines which palette variant to load)
    initializeDarkMode();
    console.log('✓ Dark mode initialized');
    
    // Initialize color system
    applyColorTemplate(getGlobals().currentTemplate);
    console.log('✓ Color system initialized');
    
    // Setup UI - unified panel dock (both panels visible, collapsed by default)
    createPanelDock();
    populateColorSelect();
    console.log('✓ Panel dock created (Sound + Controls)');
    
    setupKeyboardShortcuts();
    console.log('✓ Keyboard shortcuts registered');
    
    // Initialize password gates (CV and Portfolio protection)
    initCVGate();
    console.log('✓ CV password gate initialized');
    
    initPortfolioGate();
    console.log('✓ Portfolio password gate initialized');
    
    // Create quick sound toggle button (bottom-left)
    createSoundToggle();
    console.log('✓ Sound toggle button created');
    
    // Create quick theme toggle button (bottom-left)
    createThemeToggle();
    console.log('✓ Theme toggle button created');
    
    // Layout controls integrated into master panel
    
    // Initialize starting mode (Ball Pit by default)
    setMode(MODES.PIT);
    console.log('✓ Mode initialized');
    
    // Start main render loop
    const getForces = () => getForceApplicator();
    startMainLoop((ball, dt) => {
      const forceFn = getForces();
      if (forceFn) forceFn(ball, dt);
    });
    
    console.log('✅ Bouncy Balls running (modular)');
    
    // ╔══════════════════════════════════════════════════════════════════════════════╗
    // ║                             PAGE FADE-IN                                    ║
    // ╚══════════════════════════════════════════════════════════════════════════════╝
    // Goal: fade ALL UI content (inside #fade-content) from 0 → 1 on reload.
    //
    // Why this is tricky in this project:
    // - Much of the UI is `position: fixed` (Webflow export + our overrides).
    // - Fixed descendants can be composited outside a normal wrapper, so fading
    //   a parent via CSS can appear “broken”.
    // - We solve this with a fixed + transformed `#fade-content` (CSS) and we
    //   run the fade using Web Animations API (WAAPI) for maximum robustness.
    //
    // Failsafe:
    // If, for any reason, the animation gets canceled or never runs, we force
    // the content visible after a short timeout so the page never “sticks” hidden.

    const FADE_DELAY_MS = 400;
    const FADE_DURATION_MS = 3000;
    // Expo-ish ease-out approximation (WAAPI accepts CSS easing strings)
    // Intention: commits quickly, then settles gently.
    const FADE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const FADE_FAILSAFE_MS = FADE_DELAY_MS + FADE_DURATION_MS + 750;

    const forceFadeVisible = (fadeEl, reason) => {
      // Inline style beats stylesheet opacity:0
      fadeEl.style.opacity = '1';
      console.warn(`⚠️ Fade failsafe: forcing #fade-content visible (${reason})`);
    };

    setTimeout(() => {
      const fadeContent = document.getElementById('fade-content');
      if (!fadeContent) {
        console.warn('⚠️ #fade-content not found (fade skipped)');
        return;
      }

      // Accessibility: respect reduced motion by skipping animation entirely.
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
        fadeContent.style.opacity = '1';
        console.log('✓ Page fade-in skipped (prefers-reduced-motion)');
        return;
      }

      // If WAAPI is missing (older browsers / restricted contexts), fall back to inline style.
      if (typeof fadeContent.animate !== 'function') {
        forceFadeVisible(fadeContent, 'WAAPI unsupported');
        return;
      }

      const anim = fadeContent.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: FADE_DURATION_MS,
          easing: FADE_EASING,
          fill: 'forwards',
        }
      );

      // When finished, stamp final opacity as an inline style. This prevents edge cases
      // where a later style recalc/compositing change makes it appear hidden again.
      anim.addEventListener?.('finish', () => {
        fadeContent.style.opacity = '1';
        console.log('✓ Page fade-in finished');
      });

      anim.addEventListener?.('cancel', () => {
        forceFadeVisible(fadeContent, 'animation canceled');
      });

      console.log('✓ Page fade-in started (WAAPI)');

      // Ultimate failsafe: never allow permanent hidden UI.
      setTimeout(() => {
        const opacity = window.getComputedStyle(fadeContent).opacity;
        if (opacity === '0') forceFadeVisible(fadeContent, 'opacity still 0 after failsafe window');
      }, FADE_FAILSAFE_MS);
    }, FADE_DELAY_MS);
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  }
})();
