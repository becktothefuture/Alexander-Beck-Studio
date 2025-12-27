// Portfolio panel dock.
// Mirrors the index dock behavior (drag, resize, collapse) with portfolio controls.

import { getPanelHTML } from './panel-html.js';
import { setupControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';

let dockElement = null;
let panelElement = null;
let shortcutsWired = false;

const STORAGE_KEYS = {
  position: 'portfolio_panel_dock_position_v1',
  // v2: default to hidden on load (previous versions defaulted visible).
  dockHidden: 'portfolio_panel_dock_hidden_v2',
  panelCollapsed: 'portfolio_panel_collapsed',
  panelSize: 'portfolio_panel_size',
};

function loadDockHiddenState() {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.dockHidden);
    // Default: hidden on first load (can be summoned with '/').
    if (value === null) return true;
    return value === 'true';
  } catch (e) {
    return true;
  }
}

function loadPanelCollapsed() {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.panelCollapsed);
    if (value === null) return true;
    return value === 'true';
  } catch (e) {
    return true;
  }
}

function savePanelCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.panelCollapsed, String(collapsed));
  } catch (e) {}
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

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;

export function createPanelDock({ config, onMetricsChange, onRuntimeChange, panelTitle = 'Settings', modeLabel = 'DEV MODE' } = {}) {
  if (dockElement) return dockElement;

  dockElement = document.createElement('div');
  dockElement.className = 'panel-dock';
  dockElement.id = 'portfolioPanelDock';

  // Index parity: always start hidden on load (user summons with `/`).
  dockElement.classList.add('hidden');
  saveDockHiddenState(true);
  dockElement.setAttribute('aria-hidden', 'true');

  panelElement = createPanel({ config, onMetricsChange, onRuntimeChange, panelTitle, modeLabel });
  dockElement.appendChild(panelElement);

  document.body.insertBefore(dockElement, document.body.firstChild);

  // Default to top-right via CSS (but allow user drag positioning).
  setupResizePersistence();
  setupDragging();
  bindDockToggleShortcut();

  // If something inside the panel was focused (e.g. restored state), don't let it
  // “trap” the `/` shortcut while hidden.
  try {
    const active = document.activeElement;
    if (active && dockElement.contains(active) && typeof active.blur === 'function') active.blur();
  } catch (e) {}

  return dockElement;
}

function createPanel({ config, onMetricsChange, onRuntimeChange, panelTitle, modeLabel }) {
  const panel = document.createElement('div');
  panel.id = 'portfolioPanel';
  panel.className = loadPanelCollapsed() ? 'panel collapsed' : 'panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Portfolio settings');

  // Header (drag handle + collapse control).
  const header = document.createElement('div');
  header.className = 'panel-header';
  header.innerHTML = `
    <div class="mac-titlebar">
      <div class="mac-traffic" aria-hidden="true">
        <span class="mac-dot mac-dot--red"></span>
        <span class="mac-dot mac-dot--yellow"></span>
        <span class="mac-dot mac-dot--green"></span>
      </div>
      <div class="panel-title mac-title">${panelTitle}</div>
      <div class="mac-right">
        <span class="panel-mode-pill" role="status" aria-label="Runtime mode">${modeLabel}</span>
        <button class="collapse-btn mac-collapse" aria-label="Collapse panel" title="Collapse">▾</button>
      </div>
    </div>
  `;

  const content = document.createElement('div');
  content.className = 'panel-content';
  // Render immediately (HTML only). If something goes wrong (e.g. config missing or module load failure),
  // never leave a blank rectangle.
  try {
    content.innerHTML = getPanelHTML(config);
  } catch (e) {
    content.innerHTML = '';
  }
  if (!content.textContent || content.textContent.trim().length === 0) {
    content.innerHTML = `
      <div class="panel-section panel-section--action">
        <div class="control-hint">Panel failed to load controls. Try reloading the page.</div>
      </div>
    `;
  }

  panel.appendChild(header);
  panel.appendChild(content);

  // Restore size (only if user has manually resized - i.e., significantly different from CSS defaults)
  const savedSize = loadPanelSize();
  if (savedSize) {
    // CSS defaults: width = 23rem (368px), height = 80vh
    // Only apply saved size if it's meaningfully different (user actually resized)
    const cssDefaultWidth = 368; // 23rem
    const cssDefaultHeight = window.innerHeight * 0.8; // 80vh
    const maxSavedHeight = cssDefaultHeight;
    const widthDiff = Math.abs(savedSize.width - cssDefaultWidth);
    const heightDiff = Math.abs(savedSize.height - cssDefaultHeight);
    
    // Only restore if difference is significant (> 5px) - means user manually resized
    if (widthDiff > 5 || heightDiff > 5) {
      panel.style.width = `${savedSize.width}px`;
      panel.style.height = `${Math.min(savedSize.height, maxSavedHeight)}px`;
      panel.style.maxHeight = '80vh';
    }
    // Otherwise, let CSS defaults apply
  }

  const collapseBtn = header.querySelector('.collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      togglePanelCollapse(panel);
    });
  }

  setTimeout(() => {
    setupControls(config, { onMetricsChange, onRuntimeChange });
    setupBuildControls(config);
  }, 0);

  return panel;
}

function setupResizePersistence() {
  if (!panelElement) return;
  if (typeof ResizeObserver === 'undefined') return;

  let timer = 0;
  const observer = new ResizeObserver(() => {
    if (!panelElement) return;
    if (panelElement.classList.contains('collapsed')) return;

    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      savePanelSizeFromElement(panelElement);
    }, 150);
  });

  try {
    observer.observe(panelElement);
  } catch (e) {}
}

function setupDragging() {
  if (!panelElement || !dockElement) return;

  // Make panel draggable from top border area (orange line)
  panelElement.addEventListener('mousedown', (e) => {
    // Only start drag from top 12px area (where orange line is)
    const rect = panelElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y <= 12 && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
      handleDragStart(e);
    }
  });
  panelElement.addEventListener('touchstart', (e) => {
    const rect = panelElement.getBoundingClientRect();
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

function handleDragStart(event) {
  if (event.target.closest('button') || event.target.closest('input') || event.target.closest('select')) return;
  if (!dockElement) return;

  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const rect = dockElement.getBoundingClientRect();
  dragStartX = clientX;
  dragStartY = clientY;
  elementStartX = rect.left;
  elementStartY = rect.top;
  isDragging = false;
}

function handleDragMove(event) {
  if (!dockElement || (dragStartX === 0 && dragStartY === 0)) return;

  const clientX = event.touches ? event.touches[0].clientX : event.clientX;
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;

  const deltaX = clientX - dragStartX;
  const deltaY = clientY - dragStartY;
  const threshold = 5;

  if (!isDragging && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
    isDragging = true;
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
    event.preventDefault();
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
}

function savePanelPosition() {
  try {
    if (!dockElement) return;
    const pos = {
      left: dockElement.style.left,
      top: dockElement.style.top,
      custom: true,
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

export function resetDockPosition() {
  if (!dockElement) return;
  dockElement.style.position = '';
  dockElement.style.left = '';
  dockElement.style.top = '';
  dockElement.style.right = '';
  try {
    localStorage.removeItem(STORAGE_KEYS.position);
  } catch (e) {}
}

function togglePanelCollapse(panel) {
  panel.classList.toggle('collapsed');
  savePanelCollapsed(panel.classList.contains('collapsed'));
}

export function toggleDock() {
  if (!dockElement || !panelElement) return;
  // Index parity: `/` toggles dock hidden state (panel collapse is separate UI).
  const isHidden = dockElement.classList.toggle('hidden');
  saveDockHiddenState(isHidden);
  dockElement.setAttribute('aria-hidden', isHidden ? 'true' : 'false');

  if (!isHidden) {
    try {
      ensureDockOnscreen();
    } catch (e) {}
  }
}

function ensureDockOnscreen() {
  if (!dockElement) return;

  const hasCustomLeft = !!dockElement.style.left;
  const hasCustomTop = !!dockElement.style.top;
  if (!hasCustomLeft && !hasCustomTop) return;

  const rect = dockElement.getBoundingClientRect();
  const vw = window.innerWidth || 0;
  const vh = window.innerHeight || 0;
  if (!vw || !vh) return;

  const edge = 10;
  const totallyOff =
    rect.right < edge ||
    rect.left > vw - edge ||
    rect.bottom < edge ||
    rect.top > vh - edge;

  if (totallyOff) {
    resetDockPosition();
    return;
  }

  const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);
  const nextLeft = clamp(rect.left, edge, Math.max(edge, vw - rect.width - edge));
  const nextTop = clamp(rect.top, edge, Math.max(edge, vh - rect.height - edge));

  dockElement.style.position = 'fixed';
  dockElement.style.left = `${Math.round(nextLeft)}px`;
  dockElement.style.top = `${Math.round(nextTop)}px`;
  dockElement.style.right = 'auto';

  savePanelPosition();
}

function bindDockToggleShortcut() {
  if (shortcutsWired) return;
  shortcutsWired = true;

  window.addEventListener('keydown', (event) => {
    // Allow `/` to always toggle the dock, even if focus is inside a panel control.
    // Only ignore form fields when the focus is outside the dock.
    try {
      const tag = event.target?.tagName;
      const isFormField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      const inDock = !!event.target?.closest?.('.panel-dock');
      if (isFormField && !inDock) return;
    } catch (e) {}
    const key = event.key.toLowerCase();
    if (key !== '/' && event.code !== 'Slash') return;
    event.preventDefault();
    toggleDock();
  });
}

export function getDock() {
  return dockElement;
}
