// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       UNIFIED MASTER PANEL                                   ║
// ║           Single panel with collapsible sections                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PANEL_HTML } from './panel-html.js';
import { setupControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';
import { getGlobals, applyLayoutFromVwToPx, applyLayoutCSSVars, getLayoutViewportWidthPx } from '../core/state.js';
import {
  SOUND_PRESETS,
  getSoundConfig,
  updateSoundConfig,
  applySoundPreset,
  getCurrentPreset,
  getSoundState,
  SOUND_STATE_EVENT,
  playTestSound,
  unlockAudio,
  toggleSound
} from '../audio/sound-engine.js';
import {
  generateSoundControlsHTML,
  bindSoundControls,
  syncSoundControlsToConfig
} from '../audio/sound-control-registry.js';
import { resize } from '../rendering/renderer.js';
import { isDev } from '../utils/logger.js';

let dockElement = null;
let masterPanelElement = null;

// ════════════════════════════════════════════════════════════════════════════════
// STATE PERSISTENCE
// ════════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  // v2: avoid inheriting old “too low” positions
  position: 'panel_dock_position_v2',
  dockHidden: 'panel_dock_hidden',
  panelCollapsed: 'master_panel_collapsed',
  panelSize: 'panel_dock_size'
};

function loadPanelCollapsed() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.panelCollapsed);
    // Default: collapsed (avoid obstructing content on first visit).
    if (v === null) return true;
    return v === 'true';
  } catch (e) {
    return true;
  }
}

function savePanelCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.panelCollapsed, String(collapsed));
  } catch (e) {}
}

function loadDockHiddenState() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.dockHidden);
    // Default: hidden (debug panel should not obstruct first visit)
    if (v === null) return true;
    return v === 'true';
  } catch (e) {
    return true;
  }
}

function saveDockHiddenState(hidden) {
  try {
    localStorage.setItem(STORAGE_KEYS.dockHidden, String(hidden));
  } catch (e) {}
}

function loadPanelSize() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.panelSize);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const width = Number(parsed.width);
    const height = Number(parsed.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return {
      width: Math.round(width),
      height: Math.round(height),
    };
  } catch (e) {
    return null;
  }
}

function savePanelSizeFromElement(el) {
  try {
    if (!el) return;
    if (el.classList.contains('collapsed')) return;
    const rect = el.getBoundingClientRect();
    const next = {
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
    localStorage.setItem(STORAGE_KEYS.panelSize, JSON.stringify(next));
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
  const g = getGlobals();
  // Values are vw-native in state; px values are derived once and kept in sync.
  const frameVw = Number(g.containerBorderVw || 0);
  const radiusVw = Number(g.wallRadiusVw || 0);
  const contentPadVw = Number(g.contentPaddingVw || 0);
  const viewportWidthPx = getLayoutViewportWidthPx();
  const viewportWidthLabel = g.layoutViewportWidthPx > 0
    ? `${Math.round(g.layoutViewportWidthPx)}px`
    : `Auto (${Math.round(viewportWidthPx)}px)`;

  const framePx = Math.max(0, Math.round(g.containerBorder ?? 0));
  const radiusPx = Math.max(0, Math.round(g.wallRadius ?? g.cornerRadius ?? 0));
  const contentPadPx = Math.max(0, Math.round(g.contentPadding ?? 0));
  const wallInsetVal = Math.max(0, Math.round(g.wallInset ?? 3));

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
            <span class="control-value" id="frameValue">${frameVw.toFixed(2)}vw · ${framePx}px</span>
          </div>
          <input type="range" id="layoutFrame" min="0" max="8" step="0.05" value="${frameVw || 0}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Content Padding</span>
            <span class="control-value" id="contentPadValue">${contentPadVw.toFixed(2)}vw · ${contentPadPx}px</span>
          </div>
          <input type="range" id="contentPadding" min="0" max="12" step="0.05" value="${contentPadVw || 0}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Radius</span>
            <span class="control-value" id="radiusValue">${radiusVw.toFixed(2)}vw · ${radiusPx}px</span>
          </div>
          <input type="range" id="layoutRadius" min="0" max="20" step="0.05" value="${radiusVw || 0}" />
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Viewport Width</span>
            <span class="control-value" id="viewportWidthValue">${viewportWidthLabel}</span>
          </div>
          <input type="range" id="layoutViewportWidth" min="0" max="2400" step="10" value="${Math.round(g.layoutViewportWidthPx || 0)}" />
          <div class="control-hint">0 = Auto (uses current window width)</div>
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Wall Inset</span>
            <span class="control-value" id="wallInsetValue">${wallInsetVal}px</span>
          </div>
          <input type="range" id="layoutWallInset" min="0" max="20" value="${wallInsetVal}" />
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
          <button id="soundEnableBtn" class="sound-enable-btn" aria-label="Enable sound" title="Enable sound">🔇</button>
        </div>
        <div id="soundControlsWrapper" class="sound-controls" style="display: none;">
          <div class="sound-perf" aria-label="Sound performance controls">
            <button type="button" id="soundTapBtn" class="sound-perf__btn" aria-label="Play test hit">▶︎</button>
            <button type="button" id="soundResetBtn" class="sound-perf__btn" aria-label="Reset to preset">↺</button>
            <button type="button" id="soundShuffleBtn" class="sound-perf__btn" aria-label="Shuffle (subtle) sound">🎲</button>
            <span class="sound-perf__hint">wheel adjusts · shift/alt = fine</span>
          </div>
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
  
  // Always start hidden on load (user summons with `/`)
  dockElement.classList.add('hidden');
  saveDockHiddenState(true);
  
  // Create master panel
  masterPanelElement = createMasterPanel();
  dockElement.appendChild(masterPanelElement);

  // Append to body as first child for maximum z-index stacking
  document.body.insertBefore(dockElement, document.body.firstChild);
  
  // Setup interactions
  setupDragging();
  setupResizePersistence();

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
  const modeLabel = isDev() ? 'DEV MODE' : 'BUILD MODE';
  header.innerHTML = `
    <div class="mac-titlebar">
      <div class="mac-traffic" aria-hidden="true">
        <span class="mac-dot mac-dot--red"></span>
        <span class="mac-dot mac-dot--yellow"></span>
        <span class="mac-dot mac-dot--green"></span>
      </div>
      <div class="panel-title mac-title">Settings</div>
      <div class="mac-right">
        <span class="panel-mode-pill" role="status" aria-label="Runtime mode">${modeLabel}</span>
        <button class="collapse-btn mac-collapse" aria-label="Collapse panel" title="Collapse">▾</button>
      </div>
    </div>
  `;
  
  // Content
  const content = document.createElement('div');
  content.className = 'panel-content';
  content.innerHTML = getMasterPanelContent();
  
  panel.appendChild(header);
  panel.appendChild(content);

  // Restore size (if previously resized)
  const savedSize = loadPanelSize();
  if (savedSize) {
    panel.style.width = `${savedSize.width}px`;
    panel.style.height = `${savedSize.height}px`;
    panel.style.maxHeight = 'none';
  }
  
  // Collapse button
  const collapseBtn = header.querySelector('.collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanelCollapse(panel);
    });
  }
  // Header click should NOT toggle collapse.
  // For a Mac-window feel, the titlebar is for dragging; collapse is explicit via the button.
  
  // Initialize controls
  setTimeout(() => {
    setupControls();
    setupBuildControls();
    setupSoundControls(panel);
    setupLayoutControls(panel);
  }, 0);
  
  return panel;
}

function setupResizePersistence() {
  if (!masterPanelElement) return;
  if (typeof ResizeObserver === 'undefined') return;

  let t = 0;
  const ro = new ResizeObserver(() => {
    if (!masterPanelElement) return;
    // Avoid persisting while collapsed (it forces a short height)
    if (masterPanelElement.classList.contains('collapsed')) return;

    window.clearTimeout(t);
    t = window.setTimeout(() => {
      savePanelSizeFromElement(masterPanelElement);
    }, 150);
  });

  try {
    ro.observe(masterPanelElement);
  } catch (e) {}
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
  if (!dockElement) return;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const rect = dockElement.getBoundingClientRect();
  dragStartX = clientX;
  dragStartY = clientY;
  elementStartX = rect.left;
  elementStartY = rect.top;
  isDragging = false;
  hasDragged = false;
}

function handleDragMove(e) {
  if (dragStartX === 0 && dragStartY === 0) return;
  if (!dockElement) return;
  
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  
  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  const threshold = 5;
  
  if (!isDragging && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
    isDragging = true;
    hasDragged = true;
    dockElement.classList.add('dragging');
    dockElement.style.position = 'fixed';
    dockElement.style.top = `${elementStartY}px`;
    dockElement.style.left = `${elementStartX}px`;
    dockElement.style.right = 'auto';
  }
  
  if (isDragging) {
    let newX = elementStartX + deltaX;
    let newY = elementStartY + deltaY;
    
    const rect = dockElement.getBoundingClientRect();
    newX = Math.max(0, Math.min(window.innerWidth - rect.width, newX));
    newY = Math.max(0, Math.min(window.innerHeight - rect.height, newY));
    
    dockElement.style.left = `${newX}px`;
    dockElement.style.top = `${newY}px`;
    e.preventDefault();
  }
}

function handleDragEnd() {
  if (isDragging) {
    isDragging = false;
    if (dockElement) dockElement.classList.remove('dragging');
    savePanelPosition();
  }
  
  dragStartX = 0;
  dragStartY = 0;
  
  setTimeout(() => { hasDragged = false; }, 10);
}

function savePanelPosition() {
  try {
    if (!dockElement) return;
    const pos = {
      left: dockElement.style.left,
      top: dockElement.style.top,
      custom: true
    };
    localStorage.setItem(STORAGE_KEYS.position, JSON.stringify(pos));
  } catch (e) {}
}

function loadPanelPosition() {
  try {
    if (!dockElement) return;
    const pos = JSON.parse(localStorage.getItem(STORAGE_KEYS.position) || '{}');
    if (pos.custom) {
      dockElement.style.position = 'fixed';
      dockElement.style.left = pos.left;
      dockElement.style.top = pos.top;
      dockElement.style.right = 'auto';
    }
  } catch (e) {}
}

export function resetPanelPositions() {
  if (!dockElement) return;
  dockElement.style.position = '';
  dockElement.style.left = '';
  dockElement.style.top = '';
  dockElement.style.right = '';
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
  // Dev-only safety: if the dock hasn't been created yet (or got removed),
  // create it on-demand so `/` always works.
  if (!dockElement) {
    try {
      createPanelDock();
    } catch (e) {
      return;
    }
  }

  const isHidden = dockElement.classList.toggle('hidden');
  saveDockHiddenState(isHidden);

  // If we're showing, ensure it isn't off-screen due to a stale saved position.
  if (!isHidden) {
    try {
      ensureDockOnscreen();
    } catch (e) {}
  }
}

function ensureDockOnscreen() {
  if (!dockElement) return;

  // If the dock is in its default “right/top” position (no custom left/top),
  // don't interfere.
  const hasCustomLeft = !!dockElement.style.left;
  const hasCustomTop = !!dockElement.style.top;
  if (!hasCustomLeft && !hasCustomTop) return;

  const rect = dockElement.getBoundingClientRect();
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  if (!vw || !vh) return;

  const edge = 10;

  // If rect is wildly out of view, reset to default docked position.
  const totallyOff =
    rect.right < edge ||
    rect.left > vw - edge ||
    rect.bottom < edge ||
    rect.top > vh - edge;
  if (totallyOff) {
    resetPanelPositions();
    return;
  }

  // Clamp to viewport.
  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const nextLeft = clamp(rect.left, edge, Math.max(edge, vw - rect.width - edge));
  const nextTop = clamp(rect.top, edge, Math.max(edge, vh - rect.height - edge));

  dockElement.style.position = 'fixed';
  dockElement.style.left = `${Math.round(nextLeft)}px`;
  dockElement.style.top = `${Math.round(nextTop)}px`;
  dockElement.style.right = 'auto';

  savePanelPosition();
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
  const tapBtn = panel.querySelector('#soundTapBtn');
  const resetBtn = panel.querySelector('#soundResetBtn');
  const shuffleBtn = panel.querySelector('#soundShuffleBtn');

  // Icon-only button labels (no text), with accessible aria-label/title.
  const ICON_SOUND_OFF = '<i class="ti ti-volume-off" aria-hidden="true"></i>';
  const ICON_SOUND_ON = '<i class="ti ti-volume-2" aria-hidden="true"></i>';

  const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
  const jitter = (base, amount) => base + (Math.random() - 0.5) * 2 * amount;

  const syncSoundSectionUI = (state, { openIfEnabled = false } = {}) => {
    if (!enableBtn) return;
    const s = state || getSoundState();
    const enabled = !!(s.isUnlocked && s.isEnabled);
    const unlocked = !!s.isUnlocked;

    // Icon-only (no text). Use aria-label/title for accessibility.
    enableBtn.innerHTML = (unlocked && enabled) ? ICON_SOUND_ON : ICON_SOUND_OFF;
    enableBtn.setAttribute('aria-label', unlocked ? (enabled ? 'Sound on' : 'Sound off') : 'Enable sound');
    enableBtn.title = unlocked ? (enabled ? 'Sound on' : 'Sound off') : 'Enable sound';

    enableBtn.classList.toggle('enabled', enabled);

    if (controlsWrapper) {
      controlsWrapper.style.display = enabled ? '' : 'none';
    }

    if (openIfEnabled && enabled && soundDetails && !soundDetails.open) {
      soundDetails.open = true;
    }
  };

  // Performance controls (audition / reset / gentle shuffle)
  if (tapBtn) {
    tapBtn.addEventListener('click', () => {
      // If sound isn't enabled, do nothing; user can hit "Enable Sound" first
      playTestSound({ intensity: 0.86, radius: 18, xPosition: 0.72 });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const preset = getCurrentPreset();
      applySoundPreset(preset);
      if (presetDesc && SOUND_PRESETS[preset]) presetDesc.textContent = SOUND_PRESETS[preset].description;
      syncSoundControlsToConfig(panel, getSoundConfig);
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      // Subtle, musical micro-randomization: never wild, just "alive".
      const c = getSoundConfig();
      const next = {
        // Tone / crystal
        filterBaseFreq: clamp(jitter(c.filterBaseFreq, 120), 300, 8000),
        filterQ: clamp(jitter(c.filterQ, 0.04), 0.05, 0.9),
        pitchCurve: clamp(jitter(c.pitchCurve, 0.06), 0.6, 1.8),
        sparkleGain: clamp(jitter(c.sparkleGain, 0.03), 0.0, 0.35),
        sparkleDecayMul: clamp(jitter(c.sparkleDecayMul, 0.05), 0.25, 0.95),
        noiseTransientQ: clamp(jitter(c.noiseTransientQ, 0.25), 0.6, 6.0),

        // Space / dynamics
        reverbWetMix: clamp(jitter(c.reverbWetMix, 0.02), 0.0, 0.35),
        reverbDecay: clamp(jitter(c.reverbDecay, 0.03), 0.05, 0.40),
        collisionMinImpact: clamp(jitter(c.collisionMinImpact, 0.03), 0.45, 0.90),

        // Humanization
        variancePitch: clamp(jitter(c.variancePitch, 0.01), 0.0, 0.20),
        varianceGain: clamp(jitter(c.varianceGain, 0.02), 0.0, 0.35),
      };

      updateSoundConfig(next);
      syncSoundControlsToConfig(panel, getSoundConfig);
      playTestSound({ intensity: 0.86, radius: 18, xPosition: 0.72 });
    });
  }
  
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
  const viewportWidthSlider = panel.querySelector('#layoutViewportWidth');
  const viewportWidthValue = panel.querySelector('#viewportWidthValue');
  const wallInsetSlider = panel.querySelector('#layoutWallInset');
  const wallInsetValue = panel.querySelector('#wallInsetValue');
  const g = getGlobals();

  const syncDerivedLayout = ({ triggerResize = false } = {}) => {
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
    if (frameValue) frameValue.textContent = `${(g.containerBorderVw || 0).toFixed(2)}vw · ${Math.round(g.containerBorder || 0)}px`;
    if (contentPadValue) contentPadValue.textContent = `${(g.contentPaddingVw || 0).toFixed(2)}vw · ${Math.round(g.contentPadding || 0)}px`;
    if (radiusValue) radiusValue.textContent = `${(g.wallRadiusVw || 0).toFixed(2)}vw · ${Math.round(g.wallRadius || 0)}px`;
    if (viewportWidthValue) {
      const w = getLayoutViewportWidthPx();
      viewportWidthValue.textContent = g.layoutViewportWidthPx > 0 ? `${Math.round(g.layoutViewportWidthPx)}px` : `Auto (${Math.round(w)}px)`;
    }
    if (triggerResize) resize();
  };
  
  // Frame (outer dark border around content + wall thickness)
  if (frameSlider && frameValue) {
    frameSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!Number.isFinite(val)) return;
      g.containerBorderVw = val;
      // Keep the legacy “frame links thickness + border” behavior:
      g.wallThicknessVw = val;
      syncDerivedLayout({ triggerResize: true });
    });
  }
  
  // Content padding (space between frame edge and content elements)
  if (contentPadSlider && contentPadValue) {
    contentPadSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!Number.isFinite(val)) return;
      g.contentPaddingVw = val;
      syncDerivedLayout();
    });
  }
  
  // Corner radius (syncs wallRadius + cornerRadius)
  if (radiusSlider && radiusValue) {
    radiusSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      if (!Number.isFinite(val)) return;
      g.wallRadiusVw = val;
      syncDerivedLayout();
    });
  }

  // Virtual viewport width (debug): changes the vw→px conversion basis
  if (viewportWidthSlider && viewportWidthValue) {
    viewportWidthSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      g.layoutViewportWidthPx = Number.isFinite(val) ? Math.max(0, val) : 0;
      syncDerivedLayout({ triggerResize: true });
    });
  }

  // Wall inset (physics-only): shrinks the effective collision bounds uniformly
  if (wallInsetSlider && wallInsetValue) {
    wallInsetSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      wallInsetValue.textContent = `${val}px`;
      g.wallInset = val;
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
