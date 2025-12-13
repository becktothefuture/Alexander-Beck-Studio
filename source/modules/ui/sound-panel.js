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

  <!-- Envelope Section -->
  <details class="sound-panel__accordion" open>
    <summary class="sound-panel__accordion-trigger">
      <span>Envelope</span>
      <svg class="sound-panel__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </summary>
    <div class="sound-panel__accordion-content">
      <label class="sound-panel__control">
        <span class="sound-panel__label">Attack</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="attackTime" class="sound-panel__slider" min="0" max="50" step="1">
          <span class="sound-panel__value" id="attackVal">0ms</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Decay</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="decayTime" class="sound-panel__slider" min="20" max="300" step="5">
          <span class="sound-panel__value" id="decayVal">55ms</span>
        </div>
      </label>
    </div>
  </details>

  <!-- Tone Section -->
  <details class="sound-panel__accordion">
    <summary class="sound-panel__accordion-trigger">
      <span>Tone</span>
      <svg class="sound-panel__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </summary>
    <div class="sound-panel__accordion-content">
      <label class="sound-panel__control">
        <span class="sound-panel__label">Harmonic</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="harmonicGain" class="sound-panel__slider" min="0" max="60" step="1">
          <span class="sound-panel__value" id="harmonicVal">9%</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Filter</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="filterBaseFreq" class="sound-panel__slider" min="200" max="8000" step="100">
          <span class="sound-panel__value" id="filterVal">2400Hz</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Resonance</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="filterQ" class="sound-panel__slider" min="0.1" max="4" step="0.1">
          <span class="sound-panel__value" id="filterQVal">0.4</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Velocity → Brightness</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="filterVelocityRange" class="sound-panel__slider" min="0" max="3000" step="50">
          <span class="sound-panel__value" id="filterVelVal">380Hz</span>
        </div>
      </label>
    </div>
  </details>

  <!-- Space Section -->
  <details class="sound-panel__accordion">
    <summary class="sound-panel__accordion-trigger">
      <span>Space</span>
      <svg class="sound-panel__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </summary>
    <div class="sound-panel__accordion-content">
      <label class="sound-panel__control">
        <span class="sound-panel__label">Reverb Decay</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="reverbDecay" class="sound-panel__slider" min="5" max="90" step="5">
          <span class="sound-panel__value" id="reverbDecayVal">28%</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Wet/Dry</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="reverbWetMix" class="sound-panel__slider" min="0" max="80" step="5">
          <span class="sound-panel__value" id="reverbWetVal">22%</span>
        </div>
      </label>
    </div>
  </details>

  <!-- Volume Section -->
  <details class="sound-panel__accordion">
    <summary class="sound-panel__accordion-trigger">
      <span>Volume</span>
      <svg class="sound-panel__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </summary>
    <div class="sound-panel__accordion-content">
      <label class="sound-panel__control">
        <span class="sound-panel__label">Master</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="masterGain" class="sound-panel__slider" min="10" max="100" step="5">
          <span class="sound-panel__value" id="masterVal">52%</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Min</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="minGain" class="sound-panel__slider" min="1" max="40" step="1">
          <span class="sound-panel__value" id="minGainVal">5%</span>
        </div>
      </label>
      <label class="sound-panel__control">
        <span class="sound-panel__label">Max</span>
        <div class="sound-panel__slider-row">
          <input type="range" id="maxGain" class="sound-panel__slider" min="20" max="80" step="1">
          <span class="sound-panel__value" id="maxGainVal">28%</span>
        </div>
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
