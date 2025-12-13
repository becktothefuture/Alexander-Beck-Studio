// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           SOUND CONFIG PANEL                                 ║
// ║                  Clean glassmorphism · Collapsible sections                  ║
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
// PANEL HTML TEMPLATE - Clean, functional design
// ════════════════════════════════════════════════════════════════════════════════

const SOUND_PANEL_HTML = `
<header class="sound-panel__header">
  <span class="sound-panel__title">Sound</span>
  <button class="sound-panel__close" aria-label="Close panel">×</button>
</header>

<div class="sound-panel__body">
  <!-- Preset Selector -->
  <div class="sound-panel__section sound-panel__section--preset">
    <select id="soundPresetSelect" class="sound-panel__select">
      <option value="" disabled>Select preset...</option>
    </select>
    <p id="presetDescription" class="sound-panel__description"></p>
  </div>

  <!-- Core Controls (5 most important parameters) -->
  <div class="sound-panel__section sound-panel__section--core">
    <label class="sound-panel__control">
      <span class="sound-panel__label">Master Volume</span>
      <div class="sound-panel__slider-row">
        <input type="range" id="masterGain" class="sound-panel__slider" min="10" max="100" step="1">
        <span class="sound-panel__value" id="masterVal">42%</span>
      </div>
    </label>

    <label class="sound-panel__control">
      <span class="sound-panel__label">Silence Threshold</span>
      <div class="sound-panel__slider-row">
        <input type="range" id="collisionMinImpact" class="sound-panel__slider" min="0" max="30" step="1">
        <span class="sound-panel__value" id="thresholdVal">12%</span>
      </div>
    </label>

    <label class="sound-panel__control">
      <span class="sound-panel__label">Click Length</span>
      <div class="sound-panel__slider-row">
        <input type="range" id="decayTime" class="sound-panel__slider" min="20" max="180" step="1">
        <span class="sound-panel__value" id="decayVal">45ms</span>
      </div>
    </label>

    <label class="sound-panel__control">
      <span class="sound-panel__label">Brightness</span>
      <div class="sound-panel__slider-row">
        <input type="range" id="filterBaseFreq" class="sound-panel__slider" min="300" max="6000" step="50">
        <span class="sound-panel__value" id="filterVal">2100Hz</span>
      </div>
    </label>

    <label class="sound-panel__control">
      <span class="sound-panel__label">Surface Texture (Rolling)</span>
      <div class="sound-panel__slider-row">
        <input type="range" id="rollingGain" class="sound-panel__slider" min="0" max="8" step="0.1">
        <span class="sound-panel__value" id="rollingVal">2.0%</span>
      </div>
    </label>
  </div>
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
  panelElement = document.createElement('aside');
  panelElement.id = 'soundPanel';
  panelElement.className = 'sound-panel';
  panelElement.setAttribute('role', 'dialog');
  panelElement.setAttribute('aria-label', 'Sound configuration');
  panelElement.innerHTML = SOUND_PANEL_HTML;
  
  // Initially hidden
  panelElement.style.display = 'none';
  isVisible = false;
  
  document.body.appendChild(panelElement);
  
  setupPresetSelect();
  setupSliders();
  setupCloseButton();
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
    // Core 5 (1:1 with CONFIG)
    { id: 'masterGain', valId: 'masterVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'collisionMinImpact', valId: 'thresholdVal', format: v => `${v}%`, toConfig: v => v / 100 },
    { id: 'decayTime', valId: 'decayVal', format: v => `${v}ms`, toConfig: v => v / 1000 },
    { id: 'filterBaseFreq', valId: 'filterVal', format: v => `${Math.round(v)}Hz`, toConfig: v => v },
    { id: 'rollingGain', valId: 'rollingVal', format: v => `${v.toFixed(1)}%`, toConfig: v => v / 100 },
  ];
  
  for (const config of sliderConfigs) {
    const slider = panelElement.querySelector(`#${config.id}`);
    const valDisplay = panelElement.querySelector(`#${config.valId}`);
    
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
  
  syncSlidersToConfig();
}

/**
 * Sync all slider positions to current config values
 */
function syncSlidersToConfig() {
  const config = getSoundConfig();
  
  const mappings = [
    { id: 'masterGain', valId: 'masterVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'collisionMinImpact', valId: 'thresholdVal', fromConfig: v => v * 100, format: v => `${Math.round(v)}%` },
    { id: 'decayTime', valId: 'decayVal', fromConfig: v => v * 1000, format: v => `${Math.round(v)}ms` },
    { id: 'filterBaseFreq', valId: 'filterVal', fromConfig: v => v, format: v => `${Math.round(v)}Hz` },
    { id: 'rollingGain', valId: 'rollingVal', fromConfig: v => v * 100, format: v => `${v.toFixed(1)}%` },
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
 * Setup close button
 */
function setupCloseButton() {
  const btn = panelElement.querySelector('.sound-panel__close');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSoundPanel();
    });
  }
}

/**
 * Setup keyboard shortcut (S to toggle)
 */
function setupKeyboardToggle() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }
    
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

export function toggleSoundPanel() {
  if (!panelElement) return;
  
  isVisible = !isVisible;
  panelElement.style.display = isVisible ? '' : 'none';
  
  if (isVisible) {
    syncSlidersToConfig();
  }
}

export function showSoundPanel() {
  if (!panelElement) return;
  isVisible = true;
  panelElement.style.display = '';
  syncSlidersToConfig();
}

export function hideSoundPanel() {
  if (!panelElement) return;
  isVisible = false;
  panelElement.style.display = 'none';
}

export function isSoundPanelVisible() {
  return isVisible;
}
