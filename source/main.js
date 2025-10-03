// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      BOUNCY BALLS – MAIN ENTRY (COMPLETE)                    ║
// ║                       Modular Architecture Bootstrap                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { CONSTANTS } from './modules/core/constants.js';
import { initState, setCanvas, getGlobals } from './modules/core/state.js';
import { initializeDarkMode } from './modules/visual/dark-mode.js';
import { applyColorTemplate, populateColorSelect } from './modules/visual/colors.js';
import { setupRenderer, getCanvas, getContext, resize } from './modules/rendering/renderer.js';
import { setupPanel } from './modules/ui/panel-controller.js';
import { setupKeyboardShortcuts } from './modules/ui/keyboard.js';
import { setupPointer } from './modules/input/pointer.js';
import { setMode, MODES, getForceApplicator } from './modules/modes/mode-controller.js';
import { startMainLoop } from './modules/rendering/loop.js';
import { loadSettings } from './modules/utils/storage.js';

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

(async function init() {
  try {
    console.log('🚀 Initializing modular bouncy balls...');
    
    const config = await loadRuntimeConfig();
    initState(config);
    console.log('✓ Config loaded');
    
    // Setup canvas first
    setupRenderer();
    const canvas = getCanvas();
    const ctx = getContext();
    const container = document.getElementById('bravia-balls');
    
    if (!canvas || !ctx || !container) {
      throw new Error('Missing DOM elements');
    }
    
    setCanvas(canvas, ctx, container);
    console.log('✓ Canvas initialized');
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
    
    // Setup UI
    setupPanel();
    populateColorSelect();
    console.log('✓ Panel created');
    
    setupKeyboardShortcuts();
    console.log('✓ Keyboard shortcuts registered');
    
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
