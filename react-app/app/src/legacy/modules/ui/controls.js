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
import { updateModeButtonsUI } from './mode-buttons.js';
import { registerPanelUiDocument, resolvePanelUiDocument } from './panel-ui-context.js';

export { updateModeButtonsUI };

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
  syncSlidersToState({ uiDocument, runOnChange: options.runOnChange });

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
        applyChromeHarmony();
        autoSaveSettings();
      });
    }
  }

}

/**
 * Index-only controls (home page)
 * - Mode switching disabled in production (Daily Simulation mode)
 * - Mode switching enabled in dev mode (config panel testing)
 */
export function setupIndexControls(options = {}) {
  const uiDocument = getUiDocument(options.uiDocument);
  setupMasterControls({ uiDocument, runOnChange: options.runOnChange });

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
