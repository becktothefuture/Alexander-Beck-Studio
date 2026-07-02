// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            UI CONTROLS WIRING                                ║
// ║              Thin orchestrator for panel controls                            ║
// ║    All slider bindings are handled by control-registry.js                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { setMode } from '../modes/mode-controller.js';
import { applyColorTemplate, populateColorSelect } from '../visual/colors.js';
import { applyChromeHarmony } from '../visual/chrome-harmony.js';
import { autoSaveSettings } from '../utils/storage.js';
import { bindRegisteredControls, syncSlidersToState } from './control-registry.js';
import { isDev } from '../utils/logger.js';
import { registerPanelUiDocument, resolvePanelUiDocument, forEachPanelUiDocument } from './panel-ui-context.js';

function getUiDocument(uiDocument) {
  return resolvePanelUiDocument(uiDocument);
}

/**
 * Master controls (shared across pages)
 * - Registry handles all slider/picker bindings via bindRegisteredControls()
 * - This file handles only: theme buttons and color template select
 */
export function setupMasterControls(options = {}) {
  const uiDocument = getUiDocument(options.uiDocument);
  if (!uiDocument) return;
  registerPanelUiDocument(uiDocument);

  // ═══════════════════════════════════════════════════════════════════════════
  // BIND ALL REGISTERED CONTROLS FROM REGISTRY (single source of truth)
  // ═══════════════════════════════════════════════════════════════════════════
  bindRegisteredControls({ uiDocument });
  // Match the panel UI to the live runtime state before the user saves/export.
  syncSlidersToState({ uiDocument });

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR TEMPLATE SELECT — Special handling (not in registry)
  // ═══════════════════════════════════════════════════════════════════════════
  populateColorSelect();
  const colorSelect = uiDocument.getElementById('colorSelect');
  if (colorSelect) {
    if (colorSelect.dataset.panelBound !== 'true') {
      colorSelect.dataset.panelBound = 'true';
      colorSelect.addEventListener('change', () => {
        applyColorTemplate(colorSelect.value);
        applyChromeHarmony(Boolean(getGlobals().isDarkMode));
        autoSaveSettings();
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // THEME BUTTONS — Manual binding (not in registry)
  // ═══════════════════════════════════════════════════════════════════════════
  const themeAuto = uiDocument.getElementById('themeAuto');
  const themeLight = uiDocument.getElementById('themeLight');
  const themeDark = uiDocument.getElementById('themeDark');
  
  // Theme buttons are handled by dark-mode-v2.js, just add visual feedback here
  [themeAuto, themeLight, themeDark].forEach(btn => {
    if (btn) {
      if (btn.dataset.panelBound === 'true') return;
      btn.dataset.panelBound = 'true';
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
export function setupIndexControls(options = {}) {
  const uiDocument = getUiDocument(options.uiDocument);
  setupMasterControls({ uiDocument });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE BUTTONS — Dev-only override for testing
  // ═══════════════════════════════════════════════════════════════════════════
  // In production: Mode buttons are disabled (strict Daily Simulation mode)
  // In dev mode: Mode buttons work for testing (config panel override)
  if (isDev()) {
    const modeButtons = uiDocument?.querySelectorAll('.mode-button') || [];
    modeButtons.forEach(btn => {
      if (btn.dataset.panelBound === 'true') return;
      btn.dataset.panelBound = 'true';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const mode = btn.getAttribute('data-mode');
        console.log('Mode button clicked (dev override):', mode);
        setMode(mode);
        updateModeButtonsUI(mode, { uiDocument });
      });
    });
  }

  const currentMode = getGlobals()?.currentMode;
  if (currentMode) {
    updateModeButtonsUI(currentMode, { uiDocument });
  }
}

// Backwards compatibility: the index page historically called `setupControls()`.
export function setupControls() {
  setupIndexControls();
}

/**
 * Update mode button UI to reflect active mode
 */
export function updateModeButtonsUI(activeMode, options = {}) {
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
    'elastic-center': 'Tension Loom',
    'flock-of-birds': 'Flock of Birds',
    'wall-repel': 'Repel Room',
    'aperture-bloom': 'Aperture Bloom',
    'pressure-mosaic': 'Pressure Mosaic',
    'mineral-growth': 'Mineral Growth',
    'weave-field': 'Weave Field',
    'pressure-crucible': 'Polarity Flux',
    'particle-fountain': 'Particle Fountain',
    'napoleon-point-cloud': 'Napoleon Point Cloud'
  };

  const applyModeUi = (uiDocument) => {
    const buttons = uiDocument.querySelectorAll('.mode-button');
    buttons.forEach(btn => {
      const isActive = btn.getAttribute('data-mode') === activeMode;
      btn.classList.toggle('active', isActive);
    });

    uiDocument.querySelectorAll('.mode-controls').forEach(el => el.classList.remove('active'));
    const controlId = activeMode + 'Controls';
    const activeControls = uiDocument.getElementById(controlId);
    if (activeControls) activeControls.classList.add('active');

    const announcer = uiDocument.getElementById('announcer');
    if (announcer) {
      announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
    }
  };

  if (options.uiDocument) {
    const explicitDocument = getUiDocument(options.uiDocument);
    if (explicitDocument) {
      applyModeUi(explicitDocument);
      return;
    }
  }

  let applied = false;
  forEachPanelUiDocument((uiDocument) => {
    applyModeUi(uiDocument);
    applied = true;
  });
  if (!applied) {
    const fallbackDocument = getUiDocument();
    if (fallbackDocument) applyModeUi(fallbackDocument);
  }
}
