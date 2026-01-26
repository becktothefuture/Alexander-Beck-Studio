/* Alexander Beck Studio | 2026-01-26 */
import { aG as bindRegisteredControls, aH as populateColorSelect, ad as applyColorTemplate, aI as autoSaveSettings } from './shared.js';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            UI CONTROLS WIRING                                ║
// ║              Thin orchestrator for panel controls                            ║
// ║    All slider bindings are handled by control-registry.js                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝


/**
 * Master controls (shared across pages)
 * - Registry handles all slider/picker bindings via bindRegisteredControls()
 * - This file handles only: theme buttons and color template select
 */
function setupMasterControls() {
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
 * - Adds mode switching UI and related updates
 */
function setupIndexControls() {
  setupMasterControls();

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE BUTTONS — Critical for panel mode switching
  // ═══════════════════════════════════════════════════════════════════════════
  const modeButtons = document.querySelectorAll('.mode-button');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = btn.getAttribute('data-mode');
      console.log('Mode button clicked:', mode);
      import('./shared.js').then(function (n) { return n.aK; })
        .then(({ setMode }) => {
          setMode(mode);
          updateModeButtonsUI(mode);
        })
        .catch(() => {});
    });
  });
}

/**
 * Update mode button UI to reflect active mode
 */
function updateModeButtonsUI(activeMode) {
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
      'vortex': 'Electrons',

      'magnetic': 'Magnetic',
      'bubbles': 'Carbonated Bubbles',
      'kaleidoscope-3': 'Kaleidoscope',
      'neural': 'Neural Network'
    };
    announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
  }

  
}

export { setupIndexControls, setupMasterControls, updateModeButtonsUI };
//# sourceMappingURL=controls.js.map
