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
  <div class="group" style="margin-bottom: 12px;">
    <button id="soundEnableBtn" style="width: 100%; padding: 10px; font-weight: 600;">
      🔇 Enable Sound
    </button>
    <div style="font-size: 9px; opacity: 0.6; text-align: center; margin-top: 6px;">
      Click to enable collision sounds
    </div>
  </div>
  
  <!-- Presets (only visible when sound enabled) -->
  <div id="soundControlsWrapper" style="display: none;">
    <div class="group">
      <label>
        <div><span>Preset</span></div>
        <select id="soundPresetSelect"></select>
      </label>
      <div id="presetDescription" class="preset-description" style="font-size: 10px; opacity: 0.6; margin-top: 4px;"></div>
    </div>
    
    <!-- Volume -->
    <details>
      <summary>Volume</summary>
      <div class="group">
        <label>
          <div><span>Master</span><span class="val" id="masterVal">70%</span></div>
          <input type="range" id="masterGain" min="10" max="100" step="5" value="70">
        </label>
      </div>
    </details>
    
    <!-- Envelope -->
    <details>
      <summary>Envelope</summary>
      <div class="group">
        <label>
          <div><span>Attack</span><span class="val" id="attackVal">8ms</span></div>
          <input type="range" id="attackTime" min="1" max="50" step="1" value="8">
        </label>
        <label>
          <div><span>Decay</span><span class="val" id="decayVal">80ms</span></div>
          <input type="range" id="decayTime" min="20" max="300" step="5" value="80">
        </label>
      </div>
    </details>
    
    <!-- Tone -->
    <details>
      <summary>Tone</summary>
      <div class="group">
        <label>
          <div><span>Harmonic</span><span class="val" id="harmonicVal">15%</span></div>
          <input type="range" id="harmonicGain" min="0" max="60" step="1" value="15">
        </label>
        <label>
          <div><span>Filter</span><span class="val" id="filterVal">2200Hz</span></div>
          <input type="range" id="filterBaseFreq" min="200" max="8000" step="100" value="2200">
        </label>
      </div>
    </details>
    
    <!-- Reverb -->
    <details>
      <summary>Reverb</summary>
      <div class="group">
        <label>
          <div><span>Decay</span><span class="val" id="reverbDecayVal">35%</span></div>
          <input type="range" id="reverbDecay" min="5" max="90" step="5" value="35">
        </label>
        <label>
          <div><span>Wet Mix</span><span class="val" id="reverbWetVal">35%</span></div>
          <input type="range" id="reverbWetMix" min="0" max="80" step="5" value="35">
        </label>
      </div>
    </details>
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
    { id: 'attackTime', valId: 'attackVal', format: v => `${v}ms`, toConfig: v => v / 1000 },
    { id: 'decayTime', valId: 'decayVal', format: v => `${v}ms`, toConfig: v => v / 1000 },
    { id: 'harmonicGain', valId: 'harmonicVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'filterBaseFreq', valId: 'filterVal', format: v => `${v}Hz`, toConfig: v => v },
    { id: 'reverbDecay', valId: 'reverbDecayVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'reverbWetMix', valId: 'reverbWetVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'masterGain', valId: 'masterVal', format: v => `${v}%`, toConfig: v => v / 100 },
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
    { id: 'attackTime', valId: 'attackVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
    { id: 'decayTime', valId: 'decayVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
    { id: 'harmonicGain', valId: 'harmonicVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'filterBaseFreq', valId: 'filterVal', fromConfig: v => v, format: v => `${Math.round(v)}Hz` },
    { id: 'reverbDecay', valId: 'reverbDecayVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'reverbWetMix', valId: 'reverbWetVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'masterGain', valId: 'masterVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
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

