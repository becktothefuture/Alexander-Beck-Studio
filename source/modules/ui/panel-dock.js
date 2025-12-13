// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PANEL DOCK CONTROLLER                              ║
// ║        Unified container for Control Panel and Sound Panel                  ║
// ║        Both panels collapsed and visible by default                         ║
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
  unlockAudio,
  toggleSound,
  initSoundEngine
} from '../audio/sound-engine.js';
import {
  generateSoundControlsHTML,
  bindSoundControls,
  syncSoundControlsToConfig
} from '../audio/sound-control-registry.js';

let dockElement = null;
let controlPanelElement = null;
let soundPanelElement = null;
let dockToggleElement = null;

// ════════════════════════════════════════════════════════════════════════════════
// STATE PERSISTENCE
// ════════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  position: 'panel_dock_position',
  dockHidden: 'panel_dock_hidden',
  collapseState: 'panel_dock_collapse'
};

function loadCollapseState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.collapseState);
    return stored ? JSON.parse(stored) : { control: true, sound: true }; // collapsed by default
  } catch (e) {
    return { control: true, sound: true };
  }
}

function saveCollapseState() {
  try {
    const state = {
      control: controlPanelElement?.classList.contains('collapsed') ?? true,
      sound: soundPanelElement?.classList.contains('collapsed') ?? true
    };
    localStorage.setItem(STORAGE_KEYS.collapseState, JSON.stringify(state));
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
let hasDragged = false; // True if we moved more than threshold during this gesture
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let draggedElement = null; // The panel being dragged (individual panel, not dock)

// ════════════════════════════════════════════════════════════════════════════════
// SOUND PANEL HTML (simplified for dock)
// ════════════════════════════════════════════════════════════════════════════════

// Generate sound panel content dynamically from registry
function getSoundPanelContent() {
  return `
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
    
    <!-- All controls from registry -->
    ${generateSoundControlsHTML()}
  </div>
`;
}

// ════════════════════════════════════════════════════════════════════════════════
// DOCK CREATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create the unified panel dock with both panels
 */
export function createPanelDock() {
  // Initialize sound engine (non-blocking)
  initSoundEngine();

  // Remove any legacy/injected placeholders (duplicate IDs break binding + styling)
  // Production build may inject a #controlPanel placeholder; the dock creates its own.
  try {
    const existingControl = document.getElementById('controlPanel');
    if (existingControl && !existingControl.closest('.panel-dock')) {
      existingControl.remove();
    }
    const existingSound = document.getElementById('soundPanel');
    if (existingSound && !existingSound.closest('.panel-dock')) {
      existingSound.remove();
    }
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
  
  // Create Control Panel
  controlPanelElement = createControlPanel();
  
  // Create Sound Panel
  soundPanelElement = createSoundPanel();
  
  // Add panels to dock (Sound on top, Controls below)
  dockElement.appendChild(soundPanelElement);
  dockElement.appendChild(controlPanelElement);
  
  // Create dock toggle button
  dockToggleElement = createDockToggle();
  
  // Append to simulation container so styling can be safely scoped under #bravia-balls
  // (and to avoid collisions with Webflow/global site CSS).
  const container = getGlobals().container || document.body;
  container.appendChild(dockElement);
  container.appendChild(dockToggleElement);
  
  // Update toggle button visibility based on dock state
  if (wasHidden && dockToggleElement) {
    dockToggleElement.style.opacity = '1';
    dockToggleElement.style.pointerEvents = 'auto';
  }
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Setup dragging
  setupDragging();
  
  console.log('✓ Panel dock created');
  return dockElement;
}

/**
 * Create the control panel element
 */
function createControlPanel() {
  const collapseState = loadCollapseState();
  
  const panel = document.createElement('div');
  panel.id = 'controlPanel';
  panel.className = collapseState.control ? 'panel collapsed' : 'panel';
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
  
  // Make the chevron button actually toggle (header click ignores buttons)
  const collapseBtn = header.querySelector('.collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanelCollapse(panel);
    });
  }
  
  // Setup header click to toggle (separate from drag)
  header.addEventListener('click', (e) => {
    // Don't toggle if we just dragged
    if (hasDragged) return;
    // Don't toggle if clicking on a button inside header
    if (e.target.closest('button')) return;
    togglePanelCollapse(panel);
  });
  
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
  const collapseState = loadCollapseState();
  
  const panel = document.createElement('div');
  panel.id = 'soundPanel';
  panel.className = collapseState.sound ? 'panel sound-panel collapsed' : 'panel sound-panel';
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
  content.innerHTML = getSoundPanelContent();
  
  panel.appendChild(header);
  panel.appendChild(content);
  
  // Make the chevron button actually toggle (header click ignores buttons)
  const collapseBtn = header.querySelector('.collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanelCollapse(panel);
    });
  }
  
  // Setup header click to toggle (separate from drag)
  header.addEventListener('click', (e) => {
    // Don't toggle if we just dragged
    if (hasDragged) return;
    // Don't toggle if clicking on a button inside header
    if (e.target.closest('button')) return;
    togglePanelCollapse(panel);
  });
  
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
// DRAG FUNCTIONALITY
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Setup drag handlers for the dock
 */
function setupDragging() {
  if (!dockElement) return;
  
  // Get all panel headers in the dock
  const headers = dockElement.querySelectorAll('.panel-header');
  
  headers.forEach(header => {
    // Add drag handle indicator
    const titleEl = header.querySelector('.panel-title');
    if (titleEl && !titleEl.querySelector('.drag-indicator')) {
      const dragIndicator = document.createElement('span');
      dragIndicator.className = 'drag-indicator';
      dragIndicator.innerHTML = '⋮⋮';
      dragIndicator.setAttribute('aria-hidden', 'true');
      titleEl.insertBefore(dragIndicator, titleEl.firstChild);
    }
    
    // Mouse events
    header.addEventListener('mousedown', handleDragStart);
    
    // Touch events
    header.addEventListener('touchstart', handleDragStart, { passive: false });
  });
  
  // Global move/end listeners
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('touchmove', handleDragMove, { passive: false });
  document.addEventListener('touchend', handleDragEnd);
  
  // Load saved panel positions
  loadPanelPositions();
}

/**
 * Handle drag start
 */
function handleDragStart(e) {
  // Only drag from header, not from buttons or controls
  if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
    return;
  }
  
  // Check if this is a collapse toggle (short click) or drag start
  const header = e.target.closest('.panel-header');
  if (!header) return;
  
  // Find the panel this header belongs to
  const panel = header.closest('.panel');
  if (!panel) return;
  
  // Get position
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  // Store start positions
  dragStartX = clientX;
  dragStartY = clientY;
  
  // Get panel's current position
  const rect = panel.getBoundingClientRect();
  elementStartX = rect.left;
  elementStartY = rect.top;
  
  // Store reference to dragged panel
  draggedElement = panel;
  
  // Mark as potentially dragging (will confirm after threshold)
  isDragging = false;
  hasDragged = false; // Reset drag flag at gesture start
  
  // NOTE: Do NOT call e.preventDefault() here — it blocks the click event!
  // We'll only prevent default during actual drag movement.
}

/**
 * Handle drag move
 */
function handleDragMove(e) {
  if (dragStartX === 0 && dragStartY === 0 || !draggedElement) return;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  
  // Threshold to differentiate click from drag
  const dragThreshold = 5;
  
  if (!isDragging && (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold)) {
    isDragging = true;
    hasDragged = true; // Flag for click handlers to ignore this gesture
    draggedElement.classList.add('dragging');
    
    // Detach panel from dock flow and position absolutely
    draggedElement.style.position = 'fixed';
    draggedElement.style.top = `${elementStartY}px`;
    draggedElement.style.left = `${elementStartX}px`;
    draggedElement.style.right = 'auto';
    draggedElement.style.zIndex = '10001'; // Above dock
  }
  
  if (isDragging) {
    // Calculate new position
    let newX = elementStartX + deltaX;
    let newY = elementStartY + deltaY;
    
    // Constrain to viewport
    const panelRect = draggedElement.getBoundingClientRect();
    const minX = 0;
    const maxX = window.innerWidth - panelRect.width;
    const minY = 0;
    const maxY = window.innerHeight - panelRect.height;
    
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));
    
    // Apply position
    draggedElement.style.left = `${newX}px`;
    draggedElement.style.top = `${newY}px`;
    
    // Prevent text selection during drag
    e.preventDefault();
  }
}

/**
 * Handle drag end
 */
function handleDragEnd(e) {
  if (isDragging && draggedElement) {
    isDragging = false;
    draggedElement.classList.remove('dragging');
    
    // Save panel position
    savePanelPosition(draggedElement);
  }
  
  // Reset drag tracking
  dragStartX = 0;
  dragStartY = 0;
  draggedElement = null;
  
  // Reset hasDragged after click event has had a chance to fire
  // (click fires after mouseup, so a small delay ensures the click handler sees hasDragged)
  setTimeout(() => {
    hasDragged = false;
  }, 10);
}

/**
 * Save individual panel position to localStorage
 */
function savePanelPosition(panel) {
  if (!panel) return;
  
  try {
    const positions = JSON.parse(localStorage.getItem(STORAGE_KEYS.position) || '{}');
    positions[panel.id] = {
      left: panel.style.left,
      top: panel.style.top,
      useCustomPosition: true
    };
    localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(positions));
  } catch (e) {}
}

/**
 * Load panel positions from localStorage
 */
function loadPanelPositions() {
  try {
    const positions = JSON.parse(localStorage.getItem(STORAGE_KEYS.position) || '{}');
    
    // Apply positions to each panel
    [controlPanelElement, soundPanelElement].forEach(panel => {
      if (!panel) return;
      const pos = positions[panel.id];
      if (pos && pos.useCustomPosition) {
        panel.style.position = 'fixed';
        panel.style.left = pos.left;
        panel.style.top = pos.top;
        panel.style.right = 'auto';
        panel.style.zIndex = '10001';
      }
    });
  } catch (e) {}
}

/**
 * Reset all panels to default dock position
 */
export function resetPanelPositions() {
  [controlPanelElement, soundPanelElement].forEach(panel => {
    if (!panel) return;
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.zIndex = '';
  });
  
  try {
    localStorage.removeItem(STORAGE_KEYS.position);
  } catch (e) {}
}

// Legacy export for backwards compatibility
export const resetDockPosition = resetPanelPositions;

// ════════════════════════════════════════════════════════════════════════════════
// PANEL COLLAPSE/EXPAND
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Toggle a panel's collapsed state
 */
function togglePanelCollapse(panel) {
  panel.classList.toggle('collapsed');
  saveCollapseState();
  
  // Update collapse button arrow
  const collapseBtn = panel.querySelector('.collapse-btn');
  const isCollapsed = panel.classList.contains('collapsed');
  if (collapseBtn) {
    collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand panel' : 'Collapse panel');
  }
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
  saveDockHiddenState(isHidden);
  
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
      // Sync all controls from registry
      syncSoundControlsToConfig(panel, getSoundConfig);
    });
  }
  
  // Bind all controls from registry
  bindSoundControls(panel, getSoundConfig, updateSoundConfig);
  
  // Initial sync
  syncSoundControlsToConfig(panel, getSoundConfig);
}

// Sound slider functions now handled by sound-control-registry.js

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

