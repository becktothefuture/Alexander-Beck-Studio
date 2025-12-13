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
import { createSoundToggle } from './modules/ui/sound-toggle.js';
import { createThemeToggle } from './modules/ui/theme-toggle.js';
import { createLayoutPanel } from './modules/ui/layout-panel.js';
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
  root.style.setProperty('--container-border', `${g.containerBorder || 0}px`);
  
  // Inner padding: canvas inset from container
  root.style.setProperty('--simulation-padding', `${g.simulationPadding || 0}px`);
}

/**
 * Apply visual CSS variables (noise opacity/size, vignette, walls) from config to :root
 */
export function applyVisualCSSVars(config) {
  const root = document.documentElement;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // RUBBER WALL SYSTEM - 4 controllable parameters
  // ═══════════════════════════════════════════════════════════════════════════════
  if (config.wallThickness !== undefined) {
    root.style.setProperty('--wall-thickness', `${config.wallThickness}px`);
  }
  if (config.wallSoftness !== undefined) {
    root.style.setProperty('--wall-softness', `${config.wallSoftness}px`);
  }
  if (config.wallRadius !== undefined) {
    root.style.setProperty('--wall-radius', `${config.wallRadius}px`);
  }
  if (config.wallBounceIntensity !== undefined) {
    root.style.setProperty('--wall-bounce-intensity', String(config.wallBounceIntensity));
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
  
  // Vignette intensity
  if (config.vignetteLightIntensity !== undefined) {
    root.style.setProperty('--vignette-light-intensity', String(config.vignetteLightIntensity));
  }
  if (config.vignetteDarkIntensity !== undefined) {
    root.style.setProperty('--vignette-dark-intensity', String(config.vignetteDarkIntensity));
  }
  
  // Vignette blur layers
  if (config.vignetteBlurOuter !== undefined) {
    root.style.setProperty('--vignette-blur-outer', `${config.vignetteBlurOuter}px`);
  }
  if (config.vignetteBlurMid !== undefined) {
    root.style.setProperty('--vignette-blur-mid', `${config.vignetteBlurMid}px`);
  }
  if (config.vignetteBlurInner !== undefined) {
    root.style.setProperty('--vignette-blur-inner', `${config.vignetteBlurInner}px`);
  }
  
  // Vignette spread and animation
  if (config.vignetteSpread !== undefined) {
    root.style.setProperty('--vignette-spread', `${config.vignetteSpread}px`);
  }
  if (config.vignetteX !== undefined) {
    root.style.setProperty('--vignette-x', `${config.vignetteX}px`);
  }
  if (config.vignetteY !== undefined) {
    root.style.setProperty('--vignette-y', `${config.vignetteY}px`);
  }
  if (config.vignetteTransition !== undefined) {
    root.style.setProperty('--vignette-transition', `${config.vignetteTransition}ms`);
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
    
    existingNoise.insertAdjacentElement('afterend', noise2);
    console.log('✓ Created .noise-2 element');
  }
  
  // Create noise-3 if it doesn't exist (on top of noise-2)
  const noise2 = document.querySelector('.noise-2');
  if (noise2 && !document.querySelector('.noise-3')) {
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
    
    noise2.insertAdjacentElement('afterend', noise3);
    console.log('✓ Created .noise-3 element');
  }
}

(async function init() {
  // Mark JS as enabled immediately (for CSS fallback detection)
  document.documentElement.classList.add('js-enabled');
  
  // Wire up control registry to use CSS vars function (avoids circular dependency)
  setApplyVisualCSSVars(applyVisualCSSVars);
  
  try {
    console.log('🚀 Initializing modular bouncy balls...');
    
    const config = await loadRuntimeConfig();
    initState(config);
    console.log('✓ Config loaded');
    
    // Apply frame padding CSS vars from config (controls border thickness)
    applyFramePaddingCSSVars();
    console.log('✓ Frame padding applied');
    
    // Apply visual CSS vars (noise, vignette) from config
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
    
    // Initialize password gate (CV protection)
    initCVGate();
    console.log('✓ Password gate initialized');
    
    // Create quick sound toggle button (bottom-left)
    createSoundToggle();
    console.log('✓ Sound toggle button created');
    
    // Create quick theme toggle button (bottom-left)
    createThemeToggle();
    console.log('✓ Theme toggle button created');
    
    // Create layout control panel (Top-Left)
    createLayoutPanel();
    console.log('✓ Layout panel created');
    
    // Initialize starting mode (Flies by default)
    setMode(MODES.FLIES);
    console.log('✓ Mode initialized');
    
    // Start main render loop
    const getForces = () => getForceApplicator();
    startMainLoop((ball, dt) => {
      const forceFn = getForces();
      if (forceFn) forceFn(ball, dt);
    });
    
    console.log('✅ Bouncy Balls running (modular)');
    
    // PAGE FADE-IN: Signal that everything is ready
    // Small delay ensures first frame renders before fade begins
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.add('page-ready');
        console.log('✓ Page fade-in triggered');
      });
    });
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  }
})();
