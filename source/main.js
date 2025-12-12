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
import { setMode, MODES, getForceApplicator } from './modules/modes/mode-controller.js';
import { startMainLoop } from './modules/rendering/loop.js';
import { loadSettings } from './modules/utils/storage.js';
import { initCVGate } from './modules/ui/cv-gate.js';

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
 * Ensure .noise-2 element exists (for modular dev where Webflow HTML isn't present).
 * Creates it as a sibling to .noise or as first child of body if .noise doesn't exist.
 */
function ensureNoise2Element() {
  // Check if .noise-2 already exists
  if (document.querySelector('.noise-2')) return;
  
  // Check if we have a noise texture image to use
  const existingNoise = document.querySelector('.noise');
  if (!existingNoise) {
    // No noise system present (modular dev without Webflow assets) - skip
    return;
  }
  
  // Create noise-2 element
  const noise2 = document.createElement('div');
  noise2.className = 'noise-2';
  
  // Copy background-image from existing noise if available
  const noiseStyle = getComputedStyle(existingNoise);
  if (noiseStyle.backgroundImage && noiseStyle.backgroundImage !== 'none') {
    noise2.style.backgroundImage = noiseStyle.backgroundImage;
  }
  
  // Position it fixed, full screen (CSS handles the rest)
  noise2.style.position = 'fixed';
  noise2.style.inset = '0';
  noise2.style.pointerEvents = 'none';
  noise2.style.backgroundRepeat = 'repeat';
  noise2.style.backgroundPosition = '50%';
  noise2.style.backgroundAttachment = 'fixed';
  noise2.style.opacity = '0.03';
  noise2.style.mixBlendMode = 'luminosity';
  
  // Insert after .noise element
  existingNoise.insertAdjacentElement('afterend', noise2);
  console.log('✓ Created .noise-2 element');
}

(async function init() {
  try {
    console.log('🚀 Initializing modular bouncy balls...');
    
    const config = await loadRuntimeConfig();
    initState(config);
    console.log('✓ Config loaded');
    
    // Apply frame padding CSS vars from config (controls border thickness)
    applyFramePaddingCSSVars();
    console.log('✓ Frame padding applied');
    
    // Ensure noise-2 element exists (for modular dev environments)
    ensureNoise2Element();
    
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
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red; background: white;">
      <h2>Initialization Error</h2>
      <pre>${error.message}\n${error.stack}</pre>
    </div>`;
  }
})();
