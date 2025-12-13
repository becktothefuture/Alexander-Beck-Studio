// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       UNIFIED MASTER PANEL                                   ║
// ║           Single panel with collapsible sections                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PANEL_HTML } from './panel-html.js';
import { setupControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';
import { getGlobals } from '../core/state.js';
import {
  SOUND_PRESETS,
  getSoundConfig,
  updateSoundConfig,
  applySoundPreset,
  getCurrentPreset,
  getSoundState,
  SOUND_STATE_EVENT,
  unlockAudio,
  toggleSound,
  initSoundEngine
} from '../audio/sound-engine.js';
import {
  generateSoundControlsHTML,
  bindSoundControls,
  syncSoundControlsToConfig
} from '../audio/sound-control-registry.js';
import { resize } from '../rendering/renderer.js';

let dockElement = null;
let masterPanelElement = null;
let dockToggleElement = null;

// ════════════════════════════════════════════════════════════════════════════════
// STATE PERSISTENCE
// ════════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  position: 'panel_dock_position',
  dockHidden: 'panel_dock_hidden',
  panelCollapsed: 'master_panel_collapsed'
};

function loadPanelCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEYS.panelCollapsed) === 'true';
  } catch (e) {
    return false;
  }
}

function savePanelCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.panelCollapsed, String(collapsed));
  } catch (e) {}
}

function loadDockHiddenState() {
  try {
    return localStorage.getItem(STORAGE_KEYS.dockHidden) === 'true';
  } catch (e) {
    return false;
  }
}

function saveDockHiddenState(hidden) {
  try {
    localStorage.setItem(STORAGE_KEYS.dockHidden, String(hidden));
  } catch (e) {}
}

// ════════════════════════════════════════════════════════════════════════════════
// DRAG STATE
// ════════════════════════════════════════════════════════════════════════════════

let isDragging = false;
let hasDragged = false;
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;

// ════════════════════════════════════════════════════════════════════════════════
// MASTER PANEL HTML
// ════════════════════════════════════════════════════════════════════════════════

function getMasterPanelContent() {
  // Get current CSS values for layout controls
  const getVar = (name) => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return parseInt(val) || 0;
  };
  const frameVal = getVar('--container-border') || 20;
  const radiusVal = getVar('--wall-radius') || 42;
  const contentPadVal = getVar('--content-padding') || 40;

  return `
    <!-- ═══════════════════════════════════════════════════════════════════════
         LAYOUT SECTION - Frame & Content Spacing
         ═══════════════════════════════════════════════════════════════════════ -->
    <details class="panel-section-accordion" id="layoutSection">
      <summary class="panel-section-header">
        <span class="section-icon">📐</span>
        <span class="section-label">Layout</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Frame</span>
            <span class="control-value" id="frameValue">${frameVal}px</span>
          </div>
          <input type="range" id="layoutFrame" min="0" max="100" value="${frameVal}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Content Padding</span>
            <span class="control-value" id="contentPadValue">${contentPadVal}px</span>
          </div>
          <input type="range" id="contentPadding" min="0" max="80" value="${contentPadVal}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Radius</span>
            <span class="control-value" id="radiusValue">${radiusVal}px</span>
          </div>
          <input type="range" id="layoutRadius" min="0" max="100" value="${radiusVal}" />
        </label>
      </div>
    </details>

    <!-- ═══════════════════════════════════════════════════════════════════════
         SOUND SECTION
         ═══════════════════════════════════════════════════════════════════════ -->
    <details class="panel-section-accordion" id="soundSection">
      <summary class="panel-section-header">
        <span class="section-icon">🔊</span>
        <span class="section-label">Sound</span>
      </summary>
      <div class="panel-section-content">
        <div class="sound-enable-row">
          <button id="soundEnableBtn" class="sound-enable-btn">🔇 Enable Sound</button>
        </div>
        <div id="soundControlsWrapper" class="sound-controls" style="display: none;">
          <label class="control-row">
            <span class="control-label">Preset</span>
            <select id="soundPresetSelect" class="control-select"></select>
          </label>
          <p id="presetDescription" class="control-hint"></p>
          ${generateSoundControlsHTML()}
        </div>
      </div>
    </details>

    <!-- ═══════════════════════════════════════════════════════════════════════
         CONTROLS SECTION - Theme & Mode
         ═══════════════════════════════════════════════════════════════════════ -->
    <details class="panel-section-accordion" id="controlsSection" open>
      <summary class="panel-section-header">
        <span class="section-icon">⚙️</span>
        <span class="section-label">Controls</span>
      </summary>
      <div class="panel-section-content">
        ${PANEL_HTML}
      </div>
    </details>
  `;
}

// ════════════════════════════════════════════════════════════════════════════════
// DOCK CREATION
// ════════════════════════════════════════════════════════════════════════════════

export function createPanelDock() {
  // Initialize sound engine (non-blocking)
  initSoundEngine();

  // Remove any legacy placeholders
  try {
    const existingControl = document.getElementById('controlPanel');
    if (existingControl) existingControl.remove();
    const existingSound = document.getElementById('soundPanel');
    if (existingSound) existingSound.remove();
  } catch (e) {}
  
  // Create dock container
  dockElement = document.createElement('div');
  dockElement.className = 'panel-dock';
  dockElement.id = 'panelDock';
  
  // Restore hidden state
  const wasHidden = loadDockHiddenState();
  if (wasHidden) {
    dockElement.classList.add('hidden');
  }
  
  // Create master panel
  masterPanelElement = createMasterPanel();
  dockElement.appendChild(masterPanelElement);
  
  // Create dock toggle button
  dockToggleElement = createDockToggle();
  
  // Append to body as first child for maximum z-index stacking
  document.body.insertBefore(dockElement, document.body.firstChild);
  document.body.insertBefore(dockToggleElement, document.body.firstChild);
  
  // Update toggle visibility
  if (wasHidden && dockToggleElement) {
    dockToggleElement.style.opacity = '1';
    dockToggleElement.style.pointerEvents = 'auto';
  }
  
  // Setup interactions
  setupKeyboardShortcuts();
  setupDragging();
  
  console.log('✓ Panel dock created');
  return dockElement;
}

function createMasterPanel() {
  const panel = document.createElement('div');
  panel.id = 'masterPanel';
  panel.className = loadPanelCollapsed() ? 'panel collapsed' : 'panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Settings');
  
  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <div class="panel-title">
      <span class="drag-indicator" aria-hidden="true">⋮⋮</span>
      <span>Settings</span>
    </div>
    <button class="collapse-btn" aria-label="Collapse panel">▼</button>
  `;
  
  // Content
  const content = document.createElement('div');
  content.className = 'panel-content';
  content.innerHTML = getMasterPanelContent();
  
  panel.appendChild(header);
  panel.appendChild(content);
  
  // Collapse button
  const collapseBtn = header.querySelector('.collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanelCollapse(panel);
    });
  }
  
  // Header click to toggle
  header.addEventListener('click', (e) => {
    if (hasDragged) return;
    if (e.target.closest('button')) return;
    togglePanelCollapse(panel);
  });
  
  // Initialize controls
  setTimeout(() => {
    initializeDarkMode();
    setupControls();
    setupBuildControls();
    setupSoundControls(panel);
    setupLayoutControls(panel);
  }, 0);
  
  return panel;
}

function createDockToggle() {
  const btn = document.createElement('button');
  btn.className = 'dock-toggle';
  btn.id = 'dockToggle';
  btn.setAttribute('aria-label', 'Show settings');
  btn.innerHTML = '⚙️';
  
  btn.addEventListener('click', () => {
    dockElement.classList.remove('hidden');
    btn.style.opacity = '0';
    btn.style.pointerEvents = 'none';
    saveDockHiddenState(false);
  });
  
  return btn;
}

// ════════════════════════════════════════════════════════════════════════════════
// DRAG FUNCTIONALITY
// ════════════════════════════════════════════════════════════════════════════════

function setupDragging() {
  if (!masterPanelElement) return;
  
  const header = masterPanelElement.querySelector('.panel-header');
  if (!header) return;
  
  header.addEventListener('mousedown', handleDragStart);
  header.addEventListener('touchstart', handleDragStart, { passive: false });
  
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('touchmove', handleDragMove, { passive: false });
  document.addEventListener('touchend', handleDragEnd);
  
  loadPanelPosition();
}

function handleDragStart(e) {
  if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const rect = masterPanelElement.getBoundingClientRect();
  dragStartX = clientX;
  dragStartY = clientY;
  elementStartX = rect.left;
  elementStartY = rect.top;
  isDragging = false;
  hasDragged = false;
}

function handleDragMove(e) {
  if (dragStartX === 0 && dragStartY === 0) return;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  const threshold = 5;
  
  if (!isDragging && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
    isDragging = true;
    hasDragged = true;
    masterPanelElement.classList.add('dragging');
    masterPanelElement.style.position = 'fixed';
    masterPanelElement.style.top = `${elementStartY}px`;
    masterPanelElement.style.left = `${elementStartX}px`;
    masterPanelElement.style.right = 'auto';
  }
  
  if (isDragging) {
    let newX = elementStartX + deltaX;
    let newY = elementStartY + deltaY;
    
    const rect = masterPanelElement.getBoundingClientRect();
    newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX));
    newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY));
    
    masterPanelElement.style.left = `${newX}px`;
    masterPanelElement.style.top = `${newY}px`;
    e.preventDefault();
  }
}

function handleDragEnd() {
  if (isDragging) {
    isDragging = false;
    masterPanelElement.classList.remove('dragging');
    savePanelPosition();
  }
  
  dragStartX = 0;
  dragStartY = 0;
  
  setTimeout(() => { hasDragged = false; }, 10);
}

function savePanelPosition() {
  try {
    const pos = {
      left: masterPanelElement.style.left,
      top: masterPanelElement.style.top,
      custom: true
    };
    localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(pos));
  } catch (e) {}
}

function loadPanelPosition() {
  try {
    const pos = JSON.parse(localStorage.getItem(STORAGE_KEYS.position) || '{}');
    if (pos.custom) {
      masterPanelElement.style.position = 'fixed';
      masterPanelElement.style.left = pos.left;
      masterPanelElement.style.top = pos.top;
      masterPanelElement.style.right = 'auto';
    }
  } catch (e) {}
}

export function resetPanelPositions() {
  if (!masterPanelElement) return;
  masterPanelElement.style.position = '';
  masterPanelElement.style.left = '';
  masterPanelElement.style.top = '';
  masterPanelElement.style.right = '';
  try {
    localStorage.removeItem(STORAGE_KEYS.position);
  } catch (e) {}
}

export const resetDockPosition = resetPanelPositions;

// ════════════════════════════════════════════════════════════════════════════════
// PANEL COLLAPSE
// ════════════════════════════════════════════════════════════════════════════════

function togglePanelCollapse(panel) {
  panel.classList.toggle('collapsed');
  savePanelCollapsed(panel.classList.contains('collapsed'));
}

export function expandPanel() {
  if (masterPanelElement) masterPanelElement.classList.remove('collapsed');
}

export function collapsePanel() {
  if (masterPanelElement) masterPanelElement.classList.add('collapsed');
}

export function toggleDock() {
  if (!dockElement) return;
  
  const isHidden = dockElement.classList.toggle('hidden');
  saveDockHiddenState(isHidden);
  
  if (dockToggleElement) {
    dockToggleElement.style.opacity = isHidden ? '1' : '0';
    dockToggleElement.style.pointerEvents = isHidden ? 'auto' : 'none';
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SOUND CONTROLS
// ════════════════════════════════════════════════════════════════════════════════

function setupSoundControls(panel) {
  const enableBtn = panel.querySelector('#soundEnableBtn');
  const controlsWrapper = panel.querySelector('#soundControlsWrapper');
  const presetSelect = panel.querySelector('#soundPresetSelect');
  const presetDesc = panel.querySelector('#presetDescription');
  const soundDetails = panel.querySelector('#soundSection');

  const syncSoundSectionUI = (state, { openIfEnabled = false } = {}) => {
    if (!enableBtn) return;
    const s = state || getSoundState();
    const enabled = !!(s.isUnlocked && s.isEnabled);
    const unlocked = !!s.isUnlocked;

    enableBtn.textContent = unlocked
      ? (enabled ? '🔊 Sound On' : '🔇 Sound Off')
      : '🔇 Enable Sound';

    enableBtn.classList.toggle('enabled', enabled);

    if (controlsWrapper) {
      controlsWrapper.style.display = enabled ? '' : 'none';
    }

    if (openIfEnabled && enabled && soundDetails && !soundDetails.open) {
      soundDetails.open = true;
    }
  };
  
  if (enableBtn) {
    enableBtn.addEventListener('click', async () => {
      const state = getSoundState();
      
      if (!state.isUnlocked) {
        const success = await unlockAudio();
        if (success) {
          syncSoundSectionUI(null, { openIfEnabled: true });
        }
      } else {
        const newState = toggleSound();
        syncSoundSectionUI({ ...state, isEnabled: newState });
      }
    });
  }
  
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
      syncSoundControlsToConfig(panel, getSoundConfig);
    });
  }
  
  bindSoundControls(panel, getSoundConfig, updateSoundConfig);
  syncSoundControlsToConfig(panel, getSoundConfig);

  // Initial state (if sound was enabled elsewhere, show controls immediately)
  syncSoundSectionUI();

  // Stay in sync with external toggles (e.g. the floating sound toggle button)
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener(SOUND_STATE_EVENT, (e) => {
      syncSoundSectionUI(e && e.detail ? e.detail : null);
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// LAYOUT CONTROLS
// ════════════════════════════════════════════════════════════════════════════════

function setupLayoutControls(panel) {
  const frameSlider = panel.querySelector('#layoutFrame');
  const frameValue = panel.querySelector('#frameValue');
  const contentPadSlider = panel.querySelector('#contentPadding');
  const contentPadValue = panel.querySelector('#contentPadValue');
  const radiusSlider = panel.querySelector('#layoutRadius');
  const radiusValue = panel.querySelector('#radiusValue');
  const g = getGlobals();
  
  // Frame (outer dark border around content + wall thickness)
  if (frameSlider && frameValue) {
    frameSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      frameValue.textContent = `${val}px`;
      // Update frame border CSS
      document.documentElement.style.setProperty('--container-border', `${val}px`);
      // Sync wall thickness to frame thickness
      document.documentElement.style.setProperty('--wall-thickness', `${val}px`);
      g.wallThickness = val;
      // Keep state in sync for config export
      g.containerBorder = val;
      // Trigger canvas resize to account for new frame size
      resize();
    });
  }
  
  // Content padding (space between frame edge and content elements)
  if (contentPadSlider && contentPadValue) {
    contentPadSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      contentPadValue.textContent = `${val}px`;
      // Update content padding CSS
      document.documentElement.style.setProperty('--content-padding', `${val}px`);
      // Keep state in sync for config export
      g.contentPadding = val;
    });
  }
  
  // Corner radius (syncs wallRadius + cornerRadius)
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      radiusValue.textContent = `${val}px`;
      document.documentElement.style.setProperty('--wall-radius', `${val}px`);
      // Keep state in sync for config export
      g.wallRadius = val;
      g.cornerRadius = val;
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ════════════════════════════════════════════════════════════════════════════════

function setupKeyboardShortcuts() {
  // Note: / for dock toggle is handled in keyboard.js
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export function getDock() { return dockElement; }
export function getControlPanel() { return masterPanelElement; }
export function getSoundPanel() { return masterPanelElement; }
