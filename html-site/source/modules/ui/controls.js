// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            UI CONTROLS WIRING                                ║
// ║              Thin orchestrator for panel controls                            ║
// ║    All slider bindings are handled by control-registry.js                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate, populateColorSelect } from '../visual/colors.js';
import { autoSaveSettings } from '../utils/storage.js';
import { bindRegisteredControls } from './control-registry.js';
import { isDev } from '../utils/logger.js';

/**
 * Master controls (shared across pages)
 * - Registry handles all slider/picker bindings via bindRegisteredControls()
 * - This file handles only: theme buttons and color template select
 */
export function setupMasterControls() {
  // ═══════════════════════════════════════════════════════════════════════════
  // BIND ALL REGISTERED CONTROLS FROM REGISTRY (single source of truth)
  // ═══════════════════════════════════════════════════════════════════════════
  bindRegisteredControls();

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR TEMPLATE SELECT — Special handling (not in registry)
  // ═══════════════════════════════════════════════════════════════════════════
  populateColorSelect();
  const colorSelect = document.getElementById('colorSelect');
  if (colorSelect) {
    colorSelect.addEventListener('change', () => {
      applyColorTemplate(colorSelect.value);
      autoSaveSettings();
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME BUTTONS — Manual binding (not in registry)
  // ═══════════════════════════════════════════════════════════════════════════
  const themeAuto = document.getElementById('themeAuto');
  const themeLight = document.getElementById('themeLight');
  const themeDark = document.getElementById('themeDark');
  
  // Theme buttons are handled by dark-mode-v2.js, just add visual feedback here
  [themeAuto, themeLight, themeDark].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        // Remove active from all, add to clicked
        [themeAuto, themeLight, themeDark].forEach(b => b?.classList.remove('active'));
        btn.classList.add('active');
      });
    }
  });
}

/**
 * Index-only controls (home page)
 * - Mode switching disabled in production (Daily Simulation mode)
 * - Mode switching enabled in dev mode (config panel testing)
 */
export function setupIndexControls() {
  setupMasterControls();

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE BUTTONS — Dev-only override for testing
  // ═══════════════════════════════════════════════════════════════════════════
  // In production: Mode buttons are disabled (strict Daily Simulation mode)
  // In dev mode: Mode buttons work for testing (config panel override)
  if (isDev()) {
    const modeButtons = document.querySelectorAll('.mode-button');
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');
        console.log('Mode button clicked (dev override):', mode);
        import('../modes/mode-controller.js')
          .then(({ setMode }) => {
            setMode(mode);
            updateModeButtonsUI(mode);
          })
          .catch(() => {});
      });
    });
  }
}

// Backwards compatibility: the index page historically called `setupControls()`.
export function setupControls() {
  setupIndexControls();
}

/**
 * Update mode button UI to reflect active mode
 */
export function updateModeButtonsUI(activeMode) {
  const buttons = document.querySelectorAll('.mode-button');
  buttons.forEach(btn => {
    const isActive = btn.getAttribute('data-mode') === activeMode;
    btn.classList.toggle('active', isActive);
  });
  
  // Show/hide mode-specific controls
  document.querySelectorAll('.mode-controls').forEach(el => el.classList.remove('active'));
  const controlId = activeMode + 'Controls';
  const activeControls = document.getElementById(controlId);
  if (activeControls) activeControls.classList.add('active');
  
  // Update announcer for accessibility
  const announcer = document.getElementById('announcer');
  if (announcer) {
    const modeNames = {
      'critters': 'Critters',
      'pit': 'Ball Pit',
      'flies': 'Flies to Light', 
      'weightless': 'Zero-G',
      'water': 'Water Swimming',
      'magnetic': 'Magnetic',
      'bubbles': 'Carbonated Bubbles',
      'kaleidoscope-3': 'Kaleidoscope',
      'parallax-linear': 'Parallax (Linear)',
      'parallax-float': 'Parallax (Float)',
      '3d-sphere': '3D Sphere',
      '3d-cube': '3D Cube',
      'starfield-3d': '3D Starfield',
      'elastic-center': 'Elastic Center',
      'particle-fountain': 'Particle Fountain'
    };
    announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
  }

  
}
