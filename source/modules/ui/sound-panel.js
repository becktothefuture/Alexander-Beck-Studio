// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOUND CONFIG PANEL                                 ║
// ║           Presets and parameter sliders for collision sounds                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import {
  SOUND_PRESETS,
  getSoundConfig,
  updateSoundConfig,
  applySoundPreset,
  getCurrentPreset,
  getSoundState
} from '../audio/sound-engine.js';

let panelElement = null;
let isVisible = false;

// ════════════════════════════════════════════════════════════════════════════════
// PANEL HTML TEMPLATE
// ════════════════════════════════════════════════════════════════════════════════

const SOUND_PANEL_HTML = `
<div class="panel-header">
  <span><span class="drag-handle">⋮⋮</span> Sound Designer</span>
  <button id="minimizeSoundPanel" type="button" aria-label="Minimize panel">−</button>
</div>
<div class="panel-content">
  <!-- Presets -->
  <div class="group">
    <label>
      <div><span>Preset</span></div>
      <select id="soundPresetSelect"></select>
    </label>
    <div id="presetDescription" class="preset-description"></div>
  </div>
  
  <!-- Envelope -->
  <details open>
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
        <div><span>Filter Cutoff</span><span class="val" id="filterVal">2200Hz</span></div>
        <input type="range" id="filterBaseFreq" min="200" max="8000" step="100" value="2200">
      </label>
      <label>
        <div><span>Filter Resonance</span><span class="val" id="filterQVal">0.7</span></div>
        <input type="range" id="filterQ" min="0.1" max="4" step="0.1" value="0.7">
      </label>
      <label>
        <div><span>Velocity → Brightness</span><span class="val" id="filterVelVal">800Hz</span></div>
        <input type="range" id="filterVelocityRange" min="0" max="3000" step="50" value="800">
      </label>
    </div>
  </details>
  
  <!-- Reverb -->
  <details>
    <summary>Reverb</summary>
    <div class="group">
      <label>
        <div><span>Decay Time</span><span class="val" id="reverbDecayVal">35%</span></div>
        <input type="range" id="reverbDecay" min="5" max="90" step="5" value="35">
      </label>
      <label>
        <div><span>Wet Mix</span><span class="val" id="reverbWetVal">35%</span></div>
        <input type="range" id="reverbWetMix" min="0" max="80" step="5" value="35">
      </label>
    </div>
  </details>
  
  <!-- Volume -->
  <details>
    <summary>Volume</summary>
    <div class="group">
      <label>
        <div><span>Master Volume</span><span class="val" id="masterVal">70%</span></div>
        <input type="range" id="masterGain" min="10" max="100" step="5" value="70">
      </label>
      <label>
        <div><span>Min Collision Vol</span><span class="val" id="minGainVal">12%</span></div>
        <input type="range" id="minGain" min="1" max="40" step="1" value="12">
      </label>
      <label>
        <div><span>Max Collision Vol</span><span class="val" id="maxGainVal">45%</span></div>
        <input type="range" id="maxGain" min="20" max="80" step="1" value="45">
      </label>
    </div>
  </details>
</div>
`;

// ════════════════════════════════════════════════════════════════════════════════
// CREATE & SETUP
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create and inject the sound config panel
 * Press 'S' to toggle visibility
 */
export function createSoundPanel() {
  // Create panel element
  panelElement = document.createElement('div');
  panelElement.id = 'soundPanel';
  panelElement.className = 'panel sound-panel';
  panelElement.setAttribute('role', 'dialog');
  panelElement.setAttribute('aria-label', 'Sound configuration');
  panelElement.innerHTML = SOUND_PANEL_HTML;
  
  // Initially hidden
  panelElement.style.display = 'none';
  isVisible = false;
  
  // Append to body
  document.body.appendChild(panelElement);
  
  // Wire up controls
  setupPresetSelect();
  setupSliders();
  setupMinimizeButton();
  setupDragging();
  setupKeyboardToggle();
  
  console.log('✓ Sound panel created (press S to toggle)');
  return panelElement;
}

/**
 * Setup preset dropdown
 */
function setupPresetSelect() {
  const select = panelElement.querySelector('#soundPresetSelect');
  const description = panelElement.querySelector('#presetDescription');
  if (!select) return;
  
  // Populate options
  for (const [key, preset] of Object.entries(SOUND_PRESETS)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = preset.label;
    select.appendChild(option);
  }
  
  // Set initial value
  select.value = getCurrentPreset();
  updatePresetDescription(getCurrentPreset());
  
  // Change handler
  select.addEventListener('change', () => {
    applySoundPreset(select.value);
    updatePresetDescription(select.value);
    syncSlidersToConfig();
  });
}

/**
 * Update preset description text
 */
function updatePresetDescription(presetName) {
  const description = panelElement.querySelector('#presetDescription');
  const preset = SOUND_PRESETS[presetName];
  if (description && preset) {
    description.textContent = preset.description;
  }
}

/**
 * Setup all parameter sliders
 */
function setupSliders() {
  const sliderConfigs = [
    { id: 'attackTime', valId: 'attackVal', format: v => `${v}ms`, toConfig: v => v / 1000 },
    { id: 'decayTime', valId: 'decayVal', format: v => `${v}ms`, toConfig: v => v / 1000 },
    { id: 'harmonicGain', valId: 'harmonicVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'filterBaseFreq', valId: 'filterVal', format: v => `${v}Hz`, toConfig: v => v },
    { id: 'filterQ', valId: 'filterQVal', format: v => v.toFixed(1), toConfig: v => v },
    { id: 'filterVelocityRange', valId: 'filterVelVal', format: v => `${v}Hz`, toConfig: v => v },
    { id: 'reverbDecay', valId: 'reverbDecayVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'reverbWetMix', valId: 'reverbWetVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'masterGain', valId: 'masterVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'minGain', valId: 'minGainVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'maxGain', valId: 'maxGainVal', format: v => `${v}%`, toConfig: v => v / 100 },
  ];
  
  for (const config of sliderConfigs) {
    const slider = panelElement.querySelector(`#${config.id}`);
    const valDisplay = panelElement.querySelector(`#${config.valId}`);
    
    if (!slider) continue;
    
    slider.addEventListener('input', () => {
      const rawValue = parseFloat(slider.value);
      const configValue = config.toConfig(rawValue);
      
      // Update display
      if (valDisplay) {
        valDisplay.textContent = config.format(rawValue);
      }
      
      // Update config
      updateSoundConfig({ [config.id]: configValue });
    });
  }
  
  // Sync sliders to current config on load
  syncSlidersToConfig();
}

/**
 * Sync all slider positions to current config values
 */
function syncSlidersToConfig() {
  const config = getSoundConfig();
  
  const mappings = [
    { id: 'attackTime', valId: 'attackVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
    { id: 'decayTime', valId: 'decayVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
    { id: 'harmonicGain', valId: 'harmonicVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'filterBaseFreq', valId: 'filterVal', fromConfig: v => v, format: v => `${Math.round(v)}Hz` },
    { id: 'filterQ', valId: 'filterQVal', fromConfig: v => v, format: v => v.toFixed(1) },
    { id: 'filterVelocityRange', valId: 'filterVelVal', fromConfig: v => v, format: v => `${Math.round(v)}Hz` },
    { id: 'reverbDecay', valId: 'reverbDecayVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'reverbWetMix', valId: 'reverbWetVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'masterGain', valId: 'masterVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'minGain', valId: 'minGainVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'maxGain', valId: 'maxGainVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
  ];
  
  for (const mapping of mappings) {
    const slider = panelElement.querySelector(`#${mapping.id}`);
    const valDisplay = panelElement.querySelector(`#${mapping.valId}`);
    
    if (slider && config[mapping.id] !== undefined) {
      const sliderValue = mapping.fromConfig(config[mapping.id]);
      slider.value = sliderValue;
      
      if (valDisplay) {
        valDisplay.textContent = mapping.format(sliderValue);
      }
    }
  }
}

/**
 * Setup minimize button
 */
function setupMinimizeButton() {
  const btn = panelElement.querySelector('#minimizeSoundPanel');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSoundPanel();
    });
  }
}

/**
 * Setup panel dragging
 */
function setupDragging() {
  const header = panelElement.querySelector('.panel-header');
  if (!header) return;
  
  let isDragging = false;
  let xOffset = 0, yOffset = 0;
  
  header.addEventListener('mousedown', (e) => {
    // Don't drag if clicking minimize button
    if (e.target.tagName === 'BUTTON') return;
    
    isDragging = true;
    const rect = panelElement.getBoundingClientRect();
    xOffset = e.clientX - rect.left;
    yOffset = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const x = e.clientX - xOffset;
    const y = e.clientY - yOffset;
    
    // Constrain to viewport
    const maxX = window.innerWidth - panelElement.offsetWidth - 20;
    const maxY = window.innerHeight - panelElement.offsetHeight - 20;
    
    panelElement.style.left = Math.max(20, Math.min(x, maxX)) + 'px';
    panelElement.style.top = Math.max(20, Math.min(y, maxY)) + 'px';
    panelElement.style.right = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    if (header) header.style.cursor = 'move';
  });
}

/**
 * Setup keyboard shortcut (S to toggle)
 */
function setupKeyboardToggle() {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
    // S to toggle sound panel (only when sound is enabled)
    if (e.key === 's' || e.key === 'S') {
      const state = getSoundState();
      if (state.isUnlocked) {
        toggleSoundPanel();
      }
    }
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Toggle panel visibility
 */
export function toggleSoundPanel() {
  if (!panelElement) return;
  
  isVisible = !isVisible;
  panelElement.style.display = isVisible ? '' : 'none';
  
  if (isVisible) {
    syncSlidersToConfig();
  }
}

/**
 * Show the sound panel
 */
export function showSoundPanel() {
  if (!panelElement) return;
  isVisible = true;
  panelElement.style.display = '';
  syncSlidersToConfig();
}

/**
 * Hide the sound panel
 */
export function hideSoundPanel() {
  if (!panelElement) return;
  isVisible = false;
  panelElement.style.display = 'none';
}

/**
 * Get panel visibility state
 */
export function isSoundPanelVisible() {
  return isVisible;
}

