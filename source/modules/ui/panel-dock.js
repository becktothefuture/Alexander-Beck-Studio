// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PANEL DOCK CONTROLLER                              ║
// ║        Unified container for Control Panel and Sound Panel                  ║
// ║        Both panels collapsed and visible by default                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PANEL_HTML } from './panel-html.js';
import { setupControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';
import {
  SOUND_PRESETS,
  getSoundConfig,
  updateSoundConfig,
  applySoundPreset,
  getCurrentPreset,
  getSoundState,
  unlockAudio,
  toggleSound,
  initSoundEngine
} from '../audio/sound-engine.js';

let dockElement = null;
let controlPanelElement = null;
let soundPanelElement = null;
let dockToggleElement = null;

// ════════════════════════════════════════════════════════════════════════════════
// SOUND PANEL HTML (simplified for dock)
// ════════════════════════════════════════════════════════════════════════════════

const SOUND_PANEL_CONTENT = `
  <!-- Sound Enable/Disable -->
  <div class="sound-dock__enable">
    <button id="soundEnableBtn" class="sound-dock__enable-btn">
      🔇 Enable Sound
    </button>
  </div>
  
  <!-- Controls (visible when sound enabled) -->
  <div id="soundControlsWrapper" class="sound-dock__controls" style="display: none;">
    <!-- Preset -->
    <div class="sound-dock__section">
      <select id="soundPresetSelect" class="sound-dock__select"></select>
      <p id="presetDescription" class="sound-dock__desc"></p>
    </div>
    
    <!-- Core: 5 most important parameters (1:1 with sound-engine CONFIG) -->
    <div class="sound-dock__section">
      <div class="sound-dock__group">
        <label class="sound-dock__row">
          <span class="sound-dock__label">Master</span>
          <input type="range" id="masterGain" class="sound-dock__slider" min="10" max="100" step="1">
          <span class="sound-dock__val" id="masterVal">42%</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Silence Threshold</span>
          <input type="range" id="collisionMinImpact" class="sound-dock__slider" min="0" max="30" step="1">
          <span class="sound-dock__val" id="thresholdVal">12%</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Click Length</span>
          <input type="range" id="decayTime" class="sound-dock__slider" min="20" max="180" step="1">
          <span class="sound-dock__val" id="decayVal">45ms</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Brightness</span>
          <input type="range" id="filterBaseFreq" class="sound-dock__slider" min="300" max="6000" step="50">
          <span class="sound-dock__val" id="filterVal">2100Hz</span>
        </label>
        <label class="sound-dock__row">
          <span class="sound-dock__label">Surface Texture</span>
          <input type="range" id="rollingGain" class="sound-dock__slider" min="0" max="8" step="0.1">
          <span class="sound-dock__val" id="rollingVal">2.0%</span>
        </label>
      </div>
    </div>
  </div>
`;

// ════════════════════════════════════════════════════════════════════════════════
// DOCK CREATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create the unified panel dock with both panels
 */
export function createPanelDock() {
  // Initialize sound engine (non-blocking)
  initSoundEngine();
  
  // Create dock container
  dockElement = document.createElement('div');
  dockElement.className = 'panel-dock';
  dockElement.id = 'panelDock';
  
  // Create Control Panel
  controlPanelElement = createControlPanel();
  
  // Create Sound Panel
  soundPanelElement = createSoundPanel();
  
  // Add panels to dock (Sound on top, Controls below)
  dockElement.appendChild(soundPanelElement);
  dockElement.appendChild(controlPanelElement);
  
  // Create dock toggle button
  dockToggleElement = createDockToggle();
  
  // Append to body
  document.body.appendChild(dockElement);
  document.body.appendChild(dockToggleElement);
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  console.log('✓ Panel dock created (both panels collapsed by default)');
  return dockElement;
}

/**
 * Create the control panel element
 */
function createControlPanel() {
  const panel = document.createElement('div');
  panel.id = 'controlPanel';
  panel.className = 'panel collapsed'; // Start collapsed
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Simulation controls');
  
  // Custom header for dock
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <div class="panel-title">
      <span class="panel-icon">⚙️</span>
      <span>Controls</span>
    </div>
    <button class="collapse-btn" aria-label="Expand/collapse controls">▼</button>
  `;
  
  // Content wrapper
  const content = document.createElement('div');
  content.className = 'panel-content';
  content.innerHTML = PANEL_HTML.replace(/<div class="panel-header"[\s\S]*?<\/div>/, ''); // Remove original header
  
  panel.appendChild(header);
  panel.appendChild(content);
  
  // Setup header click to toggle
  header.addEventListener('click', () => togglePanelCollapse(panel));
  
  // Initialize dark mode and controls
  setTimeout(() => {
    initializeDarkMode();
    setupControls();
    setupBuildControls();
  }, 0);
  
  return panel;
}

/**
 * Create the sound panel element
 */
function createSoundPanel() {
  const panel = document.createElement('div');
  panel.id = 'soundPanel';
  panel.className = 'panel sound-panel collapsed'; // Start collapsed
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Sound configuration');
  
  // Custom header for dock
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <div class="panel-title">
      <span class="panel-icon">🔊</span>
      <span>Sound</span>
    </div>
    <button class="collapse-btn" aria-label="Expand/collapse sound">▼</button>
  `;
  
  // Content wrapper
  const content = document.createElement('div');
  content.className = 'panel-content';
  content.innerHTML = SOUND_PANEL_CONTENT;
  
  panel.appendChild(header);
  panel.appendChild(content);
  
  // Setup header click to toggle
  header.addEventListener('click', () => togglePanelCollapse(panel));
  
  // Setup sound controls
  setTimeout(() => setupSoundControls(panel), 0);
  
  return panel;
}

/**
 * Create the dock toggle button (shows when dock is hidden)
 */
function createDockToggle() {
  const btn = document.createElement('button');
  btn.className = 'dock-toggle';
  btn.id = 'dockToggle';
  btn.setAttribute('aria-label', 'Show panels');
  btn.innerHTML = '⚙️';
  
  btn.addEventListener('click', () => {
    dockElement.classList.remove('hidden');
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
  });
  
  return btn;
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL COLLAPSE/EXPAND
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Toggle a panel's collapsed state
 */
function togglePanelCollapse(panel) {
  panel.classList.toggle('collapsed');
}

/**
 * Expand a specific panel
 */
export function expandPanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.remove('collapsed');
}

/**
 * Collapse a specific panel
 */
export function collapsePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (panel) panel.classList.add('collapsed');
}

/**
 * Toggle the entire dock visibility
 */
export function toggleDock() {
  if (!dockElement) return;
  
  const isHidden = dockElement.classList.toggle('hidden');
  
  if (dockToggleElement) {
    dockToggleElement.style.opacity = isHidden ? '1' : '0';
    dockToggleElement.style.pointerEvents = isHidden ? 'auto' : 'none';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SOUND CONTROLS SETUP
// ════════════════════════════════════════════════════════════════════════════════

function setupSoundControls(panel) {
  const enableBtn = panel.querySelector('#soundEnableBtn');
  const controlsWrapper = panel.querySelector('#soundControlsWrapper');
  const presetSelect = panel.querySelector('#soundPresetSelect');
  const presetDesc = panel.querySelector('#presetDescription');
  
  // Sound enable button
  if (enableBtn) {
    enableBtn.addEventListener('click', async () => {
      const state = getSoundState();
      
      if (!state.isUnlocked) {
        // First click: unlock audio
        const success = await unlockAudio();
        if (success) {
          enableBtn.textContent = '🔊 Sound On';
          enableBtn.style.background = 'rgba(76, 175, 80, 0.3)';
          if (controlsWrapper) controlsWrapper.style.display = '';
          updateSoundIcon(true);
        }
      } else {
        // Toggle sound
        const newState = toggleSound();
        enableBtn.textContent = newState ? '🔊 Sound On' : '🔇 Sound Off';
        enableBtn.style.background = newState ? 'rgba(76, 175, 80, 0.3)' : '';
        if (controlsWrapper) controlsWrapper.style.display = newState ? '' : 'none';
        updateSoundIcon(newState);
      }
    });
  }
  
  // Preset select
  if (presetSelect) {
    for (const [key, preset] of Object.entries(SOUND_PRESETS)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.label;
      presetSelect.appendChild(option);
    }
    
    presetSelect.value = getCurrentPreset();
    if (presetDesc && SOUND_PRESETS[getCurrentPreset()]) {
      presetDesc.textContent = SOUND_PRESETS[getCurrentPreset()].description;
    }
    
    presetSelect.addEventListener('change', () => {
      applySoundPreset(presetSelect.value);
      if (presetDesc && SOUND_PRESETS[presetSelect.value]) {
        presetDesc.textContent = SOUND_PRESETS[presetSelect.value].description;
      }
      syncSoundSliders(panel);
    });
  }
  
  // Setup sliders
  setupSoundSliders(panel);
}

function setupSoundSliders(panel) {
  const sliderConfigs = [
    // Core 5 (1:1 with CONFIG keys in sound-engine.js)
    { id: 'masterGain', valId: 'masterVal', format: v => `${Math.round(v)}%`, toConfig: v => v / 100 },
    { id: 'collisionMinImpact', valId: 'thresholdVal', format: v => `${Math.round(v)}%`, toConfig: v => v / 100 },
    { id: 'decayTime', valId: 'decayVal', format: v => `${Math.round(v)}ms`, toConfig: v => v / 1000 },
    { id: 'filterBaseFreq', valId: 'filterVal', format: v => `${Math.round(v)}Hz`, toConfig: v => v },
    { id: 'rollingGain', valId: 'rollingVal', format: v => `${v.toFixed(1)}%`, toConfig: v => v / 100 },
  ];
  
  for (const config of sliderConfigs) {
    const slider = panel.querySelector(`#${config.id}`);
    const valDisplay = panel.querySelector(`#${config.valId}`);
    
    if (!slider) continue;
    
    slider.addEventListener('input', () => {
      const rawValue = parseFloat(slider.value);
      const configValue = config.toConfig(rawValue);
      
      if (valDisplay) {
        valDisplay.textContent = config.format(rawValue);
      }
      
      updateSoundConfig({ [config.id]: configValue });
    });
  }
  
  syncSoundSliders(panel);
}

function syncSoundSliders(panel) {
  const config = getSoundConfig();
  
  const mappings = [
    { id: 'masterGain', valId: 'masterVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'collisionMinImpact', valId: 'thresholdVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'decayTime', valId: 'decayVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
    { id: 'filterBaseFreq', valId: 'filterVal', fromConfig: v => v, format: v => `${Math.round(v)}Hz` },
    { id: 'rollingGain', valId: 'rollingVal', fromConfig: v => v * 100, format: v => `${v.toFixed(1)}%` },
  ];
  
  for (const mapping of mappings) {
    const slider = panel.querySelector(`#${mapping.id}`);
    const valDisplay = panel.querySelector(`#${mapping.valId}`);
    
    if (slider && config[mapping.id] !== undefined) {
      const sliderValue = mapping.fromConfig(config[mapping.id]);
      slider.value = sliderValue;
      
      if (valDisplay) {
        valDisplay.textContent = mapping.format(sliderValue);
      }
    }
  }
}

function updateSoundIcon(enabled) {
  const header = soundPanelElement?.querySelector('.panel-header .panel-icon');
  if (header) {
    header.textContent = enabled ? '🔊' : '🔇';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS (S and C only - / is handled by keyboard.js)
// ════════════════════════════════════════════════════════════════════════════════

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Skip if typing in input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    
    // Note: / for dock toggle is handled in keyboard.js
    switch (e.key) {
      case 's':
      case 'S':
        // Toggle sound panel collapse
        if (dockElement && !dockElement.classList.contains('hidden') && soundPanelElement) {
          togglePanelCollapse(soundPanelElement);
        }
        break;
      case 'c':
      case 'C':
        // Toggle control panel collapse (avoid conflict with browser shortcuts)
        if (e.ctrlKey || e.metaKey) return; // Don't override Ctrl+C / Cmd+C
        if (dockElement && !dockElement.classList.contains('hidden') && controlPanelElement) {
          togglePanelCollapse(controlPanelElement);
        }
        break;
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export function getDock() { return dockElement; }
export function getControlPanel() { return controlPanelElement; }
export function getSoundPanel() { return soundPanelElement; }

