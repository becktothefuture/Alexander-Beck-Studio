// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       UNIFIED MASTER PANEL                                   ║
// ║           Single panel with collapsible sections                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// HOME_PANEL_HTML no longer used - mode sections are generated directly
import { setupIndexControls, setupMasterControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';
import {
  generateMasterSectionsHTML,
  generateModeSwitcherHTML,
  generateModeSpecificSectionsHTML,
} from './control-registry.js';
import {
  generateStudioShellControlsHTML,
  generateStudioSurfaceControlsHTML,
} from './studio-surface-controls.js';
import { generatePortfolioPitChromePanelHTML } from '../portfolio/panel/control-registry.js';
import { getGlobals, applyLayoutFromVwToPx, applyLayoutCSSVars, getLayoutViewportWidthPx } from '../core/state.js';
import { isDev } from '../utils/logger.js';
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
  toggleSound,
  playHoverSound
} from '../audio/sound-engine.js';
import {
  bindSoundControls,
  syncSoundControlsToConfig
} from '../audio/sound-control-registry.js';
import { bindStudioSurfaceControls } from './studio-surface-controls.js';
import { navigateToGatePage, navigateToHome } from '../../../lib/access-gates.js';
import { resize } from '../rendering/renderer.js';

let dockElement = null;
let masterPanelElement = null;

// ════════════════════════════════════════════════════════════════════════════════
// STATE PERSISTENCE
// ════════════════════════════════════════════════════════════════════════════════

const STORAGE_KEYS = {
  // v2: avoid inheriting old "too low" positions
  position: 'panel_dock_position_v2',
  dockHidden: 'panel_dock_hidden',
  panelCollapsed: 'master_panel_collapsed',
  // v3: separate dev/prod panel sizes (they have different contexts)
  panelSize: isDev() ? 'panel_dock_size_dev_v3' : 'panel_dock_size_prod_v3'
};

function loadPanelCollapsed() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.panelCollapsed);
    // Default: OPEN in dev mode, collapsed in production
    if (v === null) return !isDev();
    return v === 'true';
  } catch (e) {
    return !isDev();
  }
}

function savePanelCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.panelCollapsed, String(collapsed));
  } catch (e) {}
}

function loadDockHiddenState({ defaultHidden = true } = {}) {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.dockHidden);
    if (v === null) return !!defaultHidden;
    return v === 'true';
  } catch (e) {
    return !!defaultHidden;
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

/** Dev: treat persisted heights below this as invalid (resize-handle accidents). */
function getDevPanelMinHeightPx() {
  try {
    return Math.max(440, Math.round(window.innerHeight * 0.52));
  } catch (e) {
    return 520;
  }
}

function savePanelSizeFromElement(el) {
  try {
    if (!el) return;
    if (el.classList.contains('collapsed')) return;
    const rect = el.getBoundingClientRect();
    let width = Math.round(rect.width);
    let height = Math.round(rect.height);
    if (isDev()) {
      const minH = getDevPanelMinHeightPx();
      if (height < minH) {
        el.style.height = `${minH}px`;
        height = minH;
      }
    }
    localStorage.setItem(STORAGE_KEYS.panelSize, JSON.stringify({ width, height }));
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

function getMasterPanelContent({
  page = 'home',
  pageLabel = 'Home',
  pageHTML = '',
  masterGroupIds = null,
  pageSectionTitle = '',
  pageSectionIcon = '',
  includePageSaveButton = true,
  pageSaveButtonId = 'saveRuntimeConfigBtn',
  pageSaveButtonLabel = '💾 Update JSON',
  footerHint = '<kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>←</kbd><kbd>→</kbd> modes',
  /** Portfolio-only: full panel config object for “Project pit rim” under Simulation. */
  portfolioPanelConfig = null,
} = {}) {
  // Sound controls → embedded in Audio group (preset + actions only; no parameter sliders)
  const soundControlsHTML = `
    <details class="panel-section-accordion" id="soundSection">
      <summary class="panel-section-header">
        <span class="section-icon">🔊</span>
        <span class="section-label">Sound</span>
      </summary>
      <div class="panel-section-content">
        <div class="sound-enable-row">
          <button id="soundEnableBtn" class="sound-enable-btn" aria-label="Enable sound">🔇</button>
        </div>
        <div id="soundControlsWrapper" class="sound-controls" style="display: none;">
          <div class="sound-perf" aria-label="Sound performance controls">
            <button type="button" id="soundTapBtn" class="sound-perf__btn" aria-label="Play test hit">▶︎</button>
            <button type="button" id="soundResetBtn" class="sound-perf__btn" aria-label="Reset to preset">↺</button>
            <button type="button" id="soundShuffleBtn" class="sound-perf__btn" aria-label="Shuffle (subtle) sound">🎲</button>
            <span class="sound-perf__hint">tap shuffle for variation</span>
          </div>
          <label class="control-row">
            <span class="control-label">Preset</span>
            <select id="soundPresetSelect" class="control-select"></select>
          </label>
          <p id="presetDescription" class="control-hint"></p>
        </div>
      </div>
    </details>
  `;

  const pageSectionsHTML = String(pageHTML || '').trim();
  const pageGroupHTML = pageSectionsHTML
    ? `
      <details class="panel-master-group panel-master-group--page" data-group-id="page" open>
        <summary class="panel-master-group-header">
          ${pageSectionIcon ? `<span class="panel-master-group-icon">${pageSectionIcon}</span>` : ''}
          <span class="panel-master-group-title">${pageSectionTitle || pageLabel}</span>
        </summary>
        <div class="panel-master-group-content">
          ${pageSectionsHTML}
        </div>
      </details>
    `
    : '';

  const devViewHTML = isDev()
    ? `
      <div class="panel-section">
        <details class="panel-section-accordion" id="panelViewSection">
          <summary class="panel-section-header">
            <span class="section-icon">↗</span>
            <span class="section-label">Views</span>
          </summary>
          <div class="panel-section-content panel-view-links">
            <button type="button" class="panel-view-btn" data-panel-nav="home" ${page === 'home' ? 'disabled aria-current="page"' : ''}>Home</button>
            <button type="button" class="panel-view-btn" data-panel-nav="portfolio" ${page === 'portfolio' ? 'disabled aria-current="page"' : ''}>Portfolio</button>
            <button type="button" class="panel-view-btn" data-panel-nav="cv" ${page === 'cv' ? 'disabled aria-current="page"' : ''}>CV</button>
            <button type="button" class="panel-view-btn" data-panel-nav="contact">Contact</button>
          </div>
        </details>
      </div>
    `
    : '';

  const actionsHTML = `
    ${devViewHTML}
    ${includePageSaveButton ? `<div class="panel-section panel-section--action"><button id="${pageSaveButtonId}" class="primary">${pageSaveButtonLabel}</button></div>` : ''}
    <div class="panel-footer">${footerHint}</div>
  `;

  // Build all master groups with proper content injection
  // - Theme + Palette → Studio
  // - Outer / inner wall lighting → Light Group
  // - Frame geometry, layers, spacing → Shell
  // - Sound → Audio
  // - Mode switcher + mode-specific sections → Simulation
  //
  // includeRegisteredSections MUST stay true — otherwise every `MASTER_GROUPS.*.sections`
  // slider block is omitted and the panel shows empty groups (only injected prepend/append).
  const portfolioSimulationPrepend =
    page === 'portfolio' && portfolioPanelConfig
      ? `${generatePortfolioPitChromePanelHTML(portfolioPanelConfig)}${generateModeSpecificSectionsHTML()}`
      : '';

  // One master panel everywhere: full `MASTER_GROUPS` + registered sections. Home adds the mode
  // switcher; portfolio adds pit chrome; CV/other routes still get the active mode’s accordion.
  const simulationPrepend =
    page === 'home'
      ? `${generateModeSwitcherHTML()}${generateModeSpecificSectionsHTML()}`
      : page === 'portfolio'
        ? (portfolioSimulationPrepend || generateModeSpecificSectionsHTML())
        : generateModeSpecificSectionsHTML();

  const masterGroupsHTML = generateMasterSectionsHTML({
    prepend: {
      simulation: simulationPrepend,
    },
    append: {
      studio: generateStudioSurfaceControlsHTML(),
      shell: generateStudioShellControlsHTML(),
      audio: soundControlsHTML,
    },
    groupIds: masterGroupIds,
    includeRegisteredSections: true,
  });

  return `
    ${masterGroupsHTML}
    ${pageGroupHTML}
    ${actionsHTML}
  `;
}

// ════════════════════════════════════════════════════════════════════════════════
// DOCK CREATION
// ════════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════════
// PANEL TOGGLE BUTTON (GEAR ICON)
// ════════════════════════════════════════════════════════════════════════════════

function createPanelToggleButton() {
  // Check if button already exists
  if (document.querySelector('.panel-toggle-btn')) return;
  
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'panel-toggle-btn';
  toggleBtn.setAttribute('aria-label', 'Toggle config panel');
  toggleBtn.innerHTML = '⚙';
  toggleBtn.style.display = 'flex';
  
  toggleBtn.addEventListener('click', () => {
    toggleDock();
  });
  
  document.body.appendChild(toggleBtn);
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN PANEL DOCK CREATION
// ════════════════════════════════════════════════════════════════════════════════

export function createPanelDock(options = {}) {
  // DEV-only: dynamically inject panel.css if not already present
  // (Production builds don't include panel.css, so we inject it on-demand)
  if (!document.querySelector('link[href*="panel.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    // Detect base path (dev: css/panel.css, prod: would not reach here)
    link.href = 'css/panel.css';
    document.head.appendChild(link);
  }

  const page = options.page || 'home';
  const pageLabel = options.pageLabel || (page === 'portfolio' ? 'Portfolio' : 'Home');
  // Default to true for home page (save config button), false must be explicit
  const includePageSaveButton = options.includePageSaveButton !== false;
  const pageSaveButtonId = options.pageSaveButtonId || 'saveRuntimeConfigBtn';
  const pageSaveButtonLabel = options.pageSaveButtonLabel || '💾 Save Design JSON';
  const footerHint = options.footerHint || (page === 'portfolio'
    ? '<kbd>/</kbd> panel'
    : '<kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei');
  const panelTitle = options.panelTitle || 'Settings';
  const modeLabel = options.modeLabel || (isDev() ? 'DEV MODE' : 'BUILD MODE');
  const setupPageControls = typeof options.setupPageControls === 'function' ? options.setupPageControls : null;
  const pageHTML = options.pageHTML || '';
  const portfolioPanelConfig = options.portfolioPanelConfig ?? null;
  // Default: full panel (all groups + all registry sections). Pass `masterGroupIds` only to trim.
  const masterGroupIds = Array.isArray(options.masterGroupIds) && options.masterGroupIds.length > 0
    ? options.masterGroupIds
    : null;
  const pageSectionTitle = options.pageSectionTitle || pageLabel;
  const pageSectionIcon = options.pageSectionIcon || (page === 'portfolio' ? '🗂️' : '📄');

  // Remove any legacy placeholders
  try {
    const existingControl = document.getElementById('controlPanel');
    if (existingControl) existingControl.remove();
    const existingSound = document.getElementById('soundPanel');
    if (existingSound) existingSound.remove();
  } catch (e) {}

  // SPA route changes: replace any previous dock/toggle so IDs stay unique and listeners attach cleanly.
  try {
    const prevDock = document.getElementById('panelDock');
    if (prevDock) prevDock.remove();
    document.querySelectorAll('.panel-toggle-btn').forEach((el) => el.remove());
    dockElement = null;
    masterPanelElement = null;
  } catch (e) {}
  
  // Create dock container
  dockElement = document.createElement('div');
  dockElement.className = 'panel-dock';
  if (isDev()) {
    dockElement.classList.add('panel-dock--dev');
  }
  dockElement.id = 'panelDock';

  // Default visibility:
  // - Dev mode: visible by default
  // - Production: hidden by default, use gear button to open
  let defaultHidden = !isDev();
  let isHidden = loadDockHiddenState({ defaultHidden });
  try {
    if (typeof __PANEL_INITIALLY_VISIBLE__ === 'boolean') isHidden = !__PANEL_INITIALLY_VISIBLE__;
  } catch (e) {}

  dockElement.classList.toggle('hidden', !!isHidden);
  saveDockHiddenState(!!isHidden);
  
  // Create master panel
  masterPanelElement = createMasterPanel({
    page,
    panelTitle,
    modeLabel,
    pageLabel,
    pageHTML,
    masterGroupIds,
    pageSectionTitle,
    pageSectionIcon,
    includePageSaveButton,
    pageSaveButtonId,
    pageSaveButtonLabel,
    footerHint,
    setupPageControls,
    portfolioPanelConfig,
  });
  dockElement.appendChild(masterPanelElement);

  // Append to body as first child for maximum z-index stacking
  document.body.insertBefore(dockElement, document.body.firstChild);
  
  // Create gear button toggle (dev-only)
  if (isDev()) {
    createPanelToggleButton();
  }
  
  // Setup interactions
  setupDragging();
  setupResizePersistence();
  setupPanelHoverSounds();

  // `/` panel toggle is centralized in `keyboard.js` (wired from React in dev for all routes).

  return dockElement;
}

function createMasterPanel({
  page,
  panelTitle,
  modeLabel,
  pageLabel,
  pageHTML,
  masterGroupIds,
  pageSectionTitle,
  pageSectionIcon,
  includePageSaveButton,
  pageSaveButtonId,
  pageSaveButtonLabel,
  footerHint,
  setupPageControls,
  portfolioPanelConfig = null,
} = {}) {
  const panel = document.createElement('div');
  panel.id = 'masterPanel';
  panel.className = 'panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Settings');
  
  // Header
  const header = document.createElement('div');
  header.className = 'panel-header';
  const isDark = document.body.classList.contains('dark-mode');
  header.innerHTML = `
    <span class="panel-title">${panelTitle}</span>
    <button class="panel-theme-toggle" aria-label="Toggle light/dark mode" title="Toggle theme">
      ${isDark ? '☀️' : '🌙'}
    </button>
  `;
  
  // Content
  const content = document.createElement('div');
  content.className = 'panel-content';
  content.innerHTML = getMasterPanelContent({
    page,
    pageLabel,
    pageHTML,
    masterGroupIds,
    pageSectionTitle,
    pageSectionIcon,
    includePageSaveButton,
    pageSaveButtonId,
    pageSaveButtonLabel,
    footerHint,
    portfolioPanelConfig,
  });
  
  panel.appendChild(header);
  panel.appendChild(content);

  // Restore size (only if user has manually resized - i.e., significantly different from CSS defaults)
  const savedSize = loadPanelSize();
  if (savedSize) {
    // CSS defaults: width = 23rem (368px), height matches --dock-panel-height (92vh in dev)
    const cssDefaultWidth = 368; // 23rem
    const cssDefaultHeight = window.innerHeight * (isDev() ? 0.92 : 0.8);
    let restoreW = savedSize.width;
    let restoreH = savedSize.height;
    if (isDev() && restoreH < getDevPanelMinHeightPx()) {
      try {
        localStorage.removeItem(STORAGE_KEYS.panelSize);
      } catch (e) {}
      restoreH = Math.max(restoreH, getDevPanelMinHeightPx());
    }
    const widthDiff = Math.abs(restoreW - cssDefaultWidth);
    const heightDiff = Math.abs(restoreH - cssDefaultHeight);

    // Only restore if difference is significant (> 5px) - means user manually resized
    if (widthDiff > 5 || heightDiff > 5) {
      panel.style.width = `${restoreW}px`;
      const maxHeight = window.innerHeight * (isDev() ? 0.92 : 0.9);
      panel.style.height = `${Math.min(Math.max(restoreH, isDev() ? getDevPanelMinHeightPx() : 0), maxHeight)}px`;
      panel.style.maxHeight = isDev() ? '92vh' : '90vh';
    }
    // Otherwise, let CSS defaults apply
  }
  
  // Theme toggle button
  const themeToggleBtn = header.querySelector('.panel-theme-toggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      import('../visual/dark-mode-v2.js').then(({ getCurrentTheme, setTheme }) => {
        const current = getCurrentTheme();
        const next = (current === 'dark' || (current === 'auto' && document.body.classList.contains('dark-mode'))) ? 'light' : 'dark';
        setTheme(next);
        themeToggleBtn.textContent = next === 'dark' ? '☀️' : '🌙';
      }).catch(() => {});
    });
  }
  
  // Initialize controls
  setTimeout(() => {
    // Shared (master) controls are safe on all pages.
    if (page === 'home') {
      setupIndexControls();
    } else {
      setupMasterControls();
    }

    setupBuildControls();
    bindStudioSurfaceControls();
    setupSoundControls(panel);
    setupLayoutControls(panel);
    setupDevViewControls(panel);

    // Page-specific bindings (portfolio carousel, etc).
    try { setupPageControls?.(panel); } catch (e) {}

    // `.mode-controls` blocks stay hidden until `.active`; home toggles via mode buttons.
    // Other routes: show the accordion for the current simulation mode (incl. portfolio-pit → pit).
    if (page !== 'home') {
      try {
        const m = getGlobals()?.currentMode;
        if (m) {
          const modeKey = m === 'portfolio-pit' ? 'pit' : m;
          document.getElementById(`${modeKey}Controls`)?.classList.add('active');
        }
      } catch (e) {}
    }
  }, 0);
  
  return panel;
}

function setupDevViewControls(panel) {
  if (!isDev() || !panel) return;

  panel.querySelectorAll('[data-panel-nav]').forEach((button) => {
    if (button.dataset.panelNavBound === 'true') return;
    button.dataset.panelNavBound = 'true';

    button.addEventListener('click', () => {
      const target = button.dataset.panelNav;
      if (target === 'portfolio' || target === 'cv') {
        navigateToGatePage(target, { allowDevAccess: true });
        return;
      }

      if (target === 'contact') {
        navigateToHome({ openContact: true });
        return;
      }

      navigateToHome();
    });
  });
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
  
  // Make panel draggable from top border area (orange line)
  masterPanelElement.addEventListener('mousedown', (e) => {
    // Only start drag from top 12px area (where orange line is)
    const rect = masterPanelElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y <= 12 && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
      handleDragStart(e);
    }
  });
  masterPanelElement.addEventListener('touchstart', (e) => {
    const rect = masterPanelElement.getBoundingClientRect();
    const touch = e.touches[0];
    const y = touch.clientY - rect.top;
    if (y <= 12 && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
      handleDragStart(e);
    }
  }, { passive: false });
  
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

export function hideDock() {
  if (!dockElement) return;
  dockElement.classList.add('hidden');
  saveDockHiddenState(true);
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
  const viewportWidthSlider = panel.querySelector('#layoutViewportWidth');
  const viewportWidthValue = panel.querySelector('#viewportWidthValue');
  const g = getGlobals();

  const syncDerivedLayout = ({ triggerResize = false } = {}) => {
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
    if (viewportWidthValue) {
      const w = getLayoutViewportWidthPx();
      viewportWidthValue.textContent = g.layoutViewportWidthPx > 0 ? `${Math.round(g.layoutViewportWidthPx)}px` : `Auto (${Math.round(w)}px)`;
    }
    if (triggerResize) {
      try { resize(); } catch (e) {}
    }
    
    // Notify overlay system that layout changed (blur needs recalculation)
    document.dispatchEvent(new CustomEvent('layout-updated'));
  };

  // Virtual viewport width (debug): changes the vw→px conversion basis
  if (viewportWidthSlider && viewportWidthValue) {
    viewportWidthSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      g.layoutViewportWidthPx = Number.isFinite(val) ? Math.max(0, val) : 0;
      syncDerivedLayout({ triggerResize: true });
    });
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// PANEL HOVER SOUNDS
// ════════════════════════════════════════════════════════════════════════════════

function setupPanelHoverSounds() {
  if (!dockElement) return;
  
  dockElement.addEventListener('pointerenter', (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    
    const isButton = target.matches('button, [role="button"], .mode-btn, .mac-dot');
    const isSliderThumb = target.matches('input[type="range"]');
    const isSelect = target.matches('select');
    
    if (isButton || isSliderThumb || isSelect) {
      playHoverSound();
    }
  }, true);
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export function getDock() { return dockElement; }
export function getControlPanel() { return masterPanelElement; }
export function getSoundPanel() { return masterPanelElement; }
