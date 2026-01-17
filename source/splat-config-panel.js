// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SPLAT TEST CONFIG PANEL                                    ║
// ║          Styled like main panel with 10+ parameters per simulation           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

// Parameter definitions per simulation variant
export const SPLAT_PARAMETERS = {
  cube: {
    main: [
      { id: 'pointCount', label: 'Point Count', min: 200, max: 2000, step: 50, default: 800 },
      { id: 'modelScale', label: 'Model Scale', min: 0.5, max: 2.5, step: 0.1, default: 1.2 },
      { id: 'focalLength', label: 'Focal Length', min: 400, max: 1500, step: 50, default: 850 },
      { id: 'cubeSize', label: 'Cube Size', min: 0.3, max: 1.5, step: 0.05, default: 0.8 }
    ],
    secondary: [
      { id: 'idleSpeed', label: 'Idle Speed', min: 0, max: 0.1, step: 0.005, default: 0.025 },
      { id: 'tumbleSpeed', label: 'Tumble Speed', min: 0, max: 10, step: 0.2, default: 4.2 },
      { id: 'tumbleDamping', label: 'Tumble Damping', min: 0.9, max: 0.999, step: 0.001, default: 0.987 },
      { id: 'baseRadiusScale', label: 'Dot Size', min: 0.1, max: 0.5, step: 0.01, default: 0.22 }
    ],
    extra: [
      { id: 'centerOffsetY', label: 'Center Y Offset', min: -0.1, max: 0.1, step: 0.01, default: 0 },
      { id: 'orbitRadius', label: 'Orbit Radius', min: 0, max: 0.2, step: 0.01, default: 0.08 },
      { id: 'orbitSpeed', label: 'Orbit Speed', min: 0, max: 2, step: 0.1, default: 0.5 }
    ]
  },
  ducky: {
    main: [
      { id: 'pointCount', label: 'Point Count', min: 500, max: 3000, step: 100, default: 1400 },
      { id: 'modelScale', label: 'Model Scale', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
      { id: 'focalLength', label: 'Focal Length', min: 600, max: 1500, step: 50, default: 920 },
      { id: 'baseRadiusScale', label: 'Dot Size', min: 0.1, max: 0.5, step: 0.01, default: 0.22 }
    ],
    secondary: [
      { id: 'idleSpeed', label: 'Idle Speed', min: 0, max: 0.1, step: 0.005, default: 0.02 },
      { id: 'tumbleSpeed', label: 'Tumble Speed', min: 0, max: 10, step: 0.2, default: 2.0 },
      { id: 'tumbleDamping', label: 'Tumble Damping', min: 0.9, max: 0.999, step: 0.001, default: 0.95 },
      { id: 'floatAmplitude', label: 'Float Amplitude', min: 0, max: 30, step: 1, default: 12 }
    ],
    extra: [
      { id: 'floatSpeed', label: 'Float Speed', min: 0.1, max: 3, step: 0.1, default: 0.8 },
      { id: 'bodyDensity', label: 'Body Density', min: 0.3, max: 0.6, step: 0.05, default: 0.45 },
      { id: 'headDensity', label: 'Head Density', min: 0.15, max: 0.35, step: 0.05, default: 0.25 }
    ]
  },
  room: {
    main: [
      { id: 'pointCount', label: 'Point Count', min: 1000, max: 5000, step: 200, default: 2000 },
      { id: 'modelScale', label: 'Model Scale', min: 1.0, max: 4.0, step: 0.1, default: 2.8 },
      { id: 'focalLength', label: 'Focal Length', min: 400, max: 1200, step: 50, default: 600 },
      { id: 'cameraPanSpeed', label: 'Pan Speed', min: 0, max: 1, step: 0.05, default: 0.3 }
    ],
    secondary: [
      { id: 'boxWidth', label: 'Room Width', min: 1.5, max: 4.0, step: 0.1, default: 2.4 },
      { id: 'boxHeight', label: 'Room Height', min: 0.8, max: 2.5, step: 0.1, default: 1.4 },
      { id: 'boxDepth', label: 'Room Depth', min: 2.0, max: 6.0, step: 0.2, default: 4.2 },
      { id: 'baseRadiusScale', label: 'Dot Size', min: 0.1, max: 0.5, step: 0.01, default: 0.22 }
    ],
    extra: [
      { id: 'idleSpeed', label: 'Idle Speed', min: 0, max: 0.05, step: 0.005, default: 0.015 },
      { id: 'furnitureDensity', label: 'Furniture Density', min: 0.05, max: 0.3, step: 0.05, default: 0.17 },
      { id: 'wallDensity', label: 'Wall Density', min: 0.1, max: 0.3, step: 0.05, default: 0.15 }
    ]
  }
};

let dockElement = null;
let panelElement = null;
let currentVariant = null;
let updateConfigCallback = null;

// Drag state
let dragStartX = 0;
let dragStartY = 0;
let elementStartX = 0;
let elementStartY = 0;
let isDragging = false;
let hasDragged = false;

const STORAGE_KEYS = {
  position: 'splat_panel_position',
  collapsed: 'splat_panel_collapsed',
  hidden: 'splat_panel_hidden',
  size: 'splat_panel_size'
};

function loadPanelCollapsed() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.collapsed);
    return v === 'true';
  } catch (e) {
    return false;
  }
}

function savePanelCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEYS.collapsed, String(collapsed));
  } catch (e) {}
}

function loadPanelHidden() {
  try {
    const v = localStorage.getItem(STORAGE_KEYS.hidden);
    return v === 'true';
  } catch (e) {
    return true; // Hidden by default
  }
}

function savePanelHidden(hidden) {
  try {
    localStorage.setItem(STORAGE_KEYS.hidden, String(hidden));
  } catch (e) {}
}

export function createSplatConfigPanel(variant, config, onConfigUpdate) {
  currentVariant = variant;
  updateConfigCallback = onConfigUpdate;

  // Create or get dock container
  if (!dockElement) {
    dockElement = document.createElement('div');
    dockElement.className = 'panel-dock';
    dockElement.id = 'splatPanelDock';
    dockElement.style.position = 'fixed';
    dockElement.style.top = 'var(--gap-lg, 20px)';
    dockElement.style.right = 'var(--gap-lg, 20px)';
    dockElement.style.zIndex = '10001';
    document.body.appendChild(dockElement);
    
    // Load saved state
    const isHidden = loadPanelHidden();
    dockElement.classList.toggle('hidden', isHidden);
    loadPanelPosition();
    setupDragging();
    // setupResizePersistence will be called after panel is created
  }

  // Remove existing panel
  if (panelElement) {
    panelElement.remove();
  }

  // Create panel container (matches main panel structure)
  panelElement = document.createElement('div');
  panelElement.id = 'splat-config-panel';
  panelElement.className = loadPanelCollapsed() ? 'panel collapsed' : 'panel';
  
  // Load saved size if available (only if meaningfully different from defaults)
  const savedSize = loadPanelSize();
  const cssDefaultWidth = 320;
  const cssDefaultHeight = window.innerHeight * 0.85;
  
  if (savedSize) {
    const widthDiff = Math.abs(savedSize.width - cssDefaultWidth);
    const heightDiff = Math.abs(savedSize.height - cssDefaultHeight);
    if (widthDiff > 5 || heightDiff > 5) {
      panelElement.style.width = `${savedSize.width}px`;
      const maxHeight = window.innerHeight * 0.9;
      panelElement.style.height = `${Math.min(savedSize.height, maxHeight)}px`;
    }
  } else {
    panelElement.style.width = '320px';
    panelElement.style.height = '85vh';
  }
  panelElement.style.maxHeight = '90vh';
  
  // Add range input styling
  if (!document.querySelector('#splat-panel-range-css')) {
    const style = document.createElement('style');
    style.id = 'splat-panel-range-css';
    style.textContent = `
      #splat-config-panel input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        background: var(--panel-brand, hsl(32 95% 44%));
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid var(--panel-background, #18181b);
      }
      #splat-config-panel input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        background: var(--panel-brand, hsl(32 95% 44%));
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid var(--panel-background, #18181b);
      }
      #splat-config-panel input[type="range"]:hover::-webkit-slider-thumb {
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
  }

  // Inject panel CSS if not already loaded
  if (!document.querySelector('#splat-panel-css')) {
    const link = document.createElement('link');
    link.id = 'splat-panel-css';
    link.rel = 'stylesheet';
    link.href = 'css/panel.css';
    document.head.appendChild(link);
  }

  // Get parameter set for current variant
  const variantType = variant.id.includes('cube') ? 'cube' : variant.id.includes('ducky') ? 'ducky' : 'room';
  const params = SPLAT_PARAMETERS[variantType];

  // Build panel HTML with header (like main panel)
  panelElement.innerHTML = `
    <div class="panel-header" style="display: none;"></div>
    <div class="panel-content">
      <div style="position: relative; margin-bottom: var(--panel-gap, 8px); padding-bottom: var(--panel-gap, 8px); border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.1));">
        <div style="font-size: 13px; font-weight: 600; color: var(--panel-foreground, #fff);">
          ${variant.label}
        </div>
        <button class="collapse-btn" id="splat-panel-collapse" style="
          position: absolute;
          top: 0;
          right: 0;
          background: transparent;
          border: none;
          color: var(--panel-muted-foreground, #888);
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
        " aria-label="Collapse panel" title="Collapse">▾</button>
      </div>
      
      ${generateSectionHTML('Main Parameters', params.main, config)}
      ${generateSectionHTML('Secondary Parameters', params.secondary, config)}
      ${generateSectionHTML('Extra Parameters', params.extra, config)}
      
      <div style="margin-top: var(--panel-gap, 8px); padding-top: var(--panel-gap, 8px); border-top: 1px solid var(--panel-border, rgba(255,255,255,0.1)); font-size: 11px; color: var(--panel-muted-foreground, #888);">
        <kbd>/</kbd> toggle panel · Changes apply instantly
      </div>
    </div>
  `;

  // Append panel to dock
  dockElement.appendChild(panelElement);

  // Bind controls
  bindPanelControls(panelElement, params, config);

  // Collapse button
  const collapseBtn = panelElement.querySelector('#splat-panel-collapse');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      togglePanelCollapse();
    });
  }

  // Setup resize observer (only once)
  if (!window._splatResizeObserverSetup) {
    window._splatResizeObserverSetup = true;
    setupResizePersistence();
  }

  return panelElement;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAG FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════════

function setupDragging() {
  if (!dockElement) return;
  
  // Make panel draggable from top border area (orange line)
  dockElement.addEventListener('mousedown', (e) => {
    // Only start drag from top 12px area (where orange line is)
    const rect = dockElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    if (y <= 12 && !e.target.closest('button') && !e.target.closest('input') && !e.target.closest('select')) {
      handleDragStart(e);
    }
  });
  
  dockElement.addEventListener('touchstart', (e) => {
    const rect = dockElement.getBoundingClientRect();
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

// ═══════════════════════════════════════════════════════════════════════════════
// RESIZE FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════════

function setupResizePersistence() {
  // Setup will be called when panel is created
  // This creates a single observer that watches for panelElement changes
  if (typeof ResizeObserver === 'undefined') return;

  let resizeTimeout = 0;
  let currentObserver = null;

  const createObserver = (el) => {
    if (currentObserver) {
      currentObserver.disconnect();
    }
    if (!el) return;

    currentObserver = new ResizeObserver(() => {
      if (!el || !dockElement) return;
      if (el.classList.contains('collapsed')) return;

      window.clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        savePanelSizeFromElement(el);
      }, 150);
    });

    try {
      currentObserver.observe(el);
    } catch (e) {}
  };

  // Watch for panelElement changes
  const checkPanel = () => {
    const panel = document.getElementById('splat-config-panel');
    if (panel && panel !== window._lastObservedPanel) {
      window._lastObservedPanel = panel;
      createObserver(panel);
    }
  };

  // Check initially and after a delay
  checkPanel();
  setTimeout(checkPanel, 100);
  
  // Also observe mutations to catch when panel is recreated
  const observer = new MutationObserver(checkPanel);
  if (dockElement) {
    observer.observe(dockElement, { childList: true, subtree: true });
  }
}

function savePanelSize() {
  if (panelElement) {
    savePanelSizeFromElement(panelElement);
  }
}

function loadPanelSize() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.size);
    if (!raw) return null;
    const size = JSON.parse(raw);
    if (!size || typeof size !== 'object') return null;
    const width = Number(size.width);
    const height = Number(size.height);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
    return { width: Math.round(width), height: Math.round(height) };
  } catch (e) {
    return null;
  }
}

function savePanelSizeFromElement(el) {
  if (!el) return;
  try {
    const width = parseInt(el.style.width) || parseInt(window.getComputedStyle(el).width);
    const height = parseInt(el.style.height) || parseInt(window.getComputedStyle(el).height);
    if (width && height) {
      const size = { width: Math.round(width), height: Math.round(height) };
      localStorage.setItem(STORAGE_KEYS.size, JSON.stringify(size));
    }
  } catch (e) {}
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLAPSE FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════════

function togglePanelCollapse() {
  if (!panelElement) return;
  panelElement.classList.toggle('collapsed');
  savePanelCollapsed(panelElement.classList.contains('collapsed'));
}

function generateSectionHTML(title, params, config) {
  if (!params || params.length === 0) return '';
  
  return `
    <details open style="margin-bottom: var(--panel-gap, 8px);">
      <summary style="
        font-size: 12px;
        font-weight: 600;
        color: var(--panel-foreground, #fff);
        cursor: pointer;
        padding: var(--panel-pad-7, 7px);
        background: var(--panel-muted, rgba(255,255,255,0.05));
        border-radius: var(--panel-radius-sm, 6px);
        user-select: none;
        list-style: none;
      ">
        ${title}
      </summary>
      <div style="padding: var(--panel-pad-7, 7px); display: flex; flex-direction: column; gap: var(--panel-control-gap, 6px);">
        ${params.map(param => generateControlHTML(param, config)).join('')}
      </div>
    </details>
  `;
}

function generateControlHTML(param, config) {
  const value = config[param.id] !== undefined ? config[param.id] : param.default;
  
  return `
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <label style="font-size: 11px; color: var(--panel-foreground, #fff);">${param.label}</label>
        <span style="font-size: 11px; font-variant-numeric: tabular-nums; color: var(--panel-muted-foreground, #888); min-width: 60px; text-align: right;">
          ${formatValue(value, param)}
        </span>
      </div>
        <input 
        type="range" 
        id="splat-param-${param.id}"
        min="${param.min}" 
        max="${param.max}" 
        step="${param.step}" 
        value="${value}"
        style="
          width: 100%;
          height: 6px;
          background: var(--panel-muted, rgba(255,255,255,0.1));
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
          cursor: pointer;
        "
        oninput="this.style.setProperty('--thumb-pos', ((this.value - this.min) / (this.max - this.min) * 100) + '%')"
      />
    </div>
  `;
}

function formatValue(value, param) {
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '0';
  
  // For step < 1, show 3 decimals; for step >= 1, show as integer
  if (param.step < 1) {
    // Show appropriate precision based on step size
    const decimals = param.step < 0.01 ? 3 : param.step < 0.1 ? 2 : 1;
    return numValue.toFixed(decimals);
  }
  return Math.round(numValue).toString();
}

function bindPanelControls(panel, params, config) {
  const allParams = [...params.main, ...params.secondary, ...params.extra];
  
  allParams.forEach(param => {
    const input = panel.querySelector(`#splat-param-${param.id}`);
    if (!input) return;

    const valueDisplay = input.previousElementSibling?.querySelector('span');
    
    input.addEventListener('input', (e) => {
      const newValue = parseFloat(e.target.value);
      
      // Update display
      if (valueDisplay) {
        valueDisplay.textContent = formatValue(newValue, param);
      }
      
      // Update config
      const newConfig = { ...config, [param.id]: newValue };
      
      // Notify callback
      if (updateConfigCallback) {
        updateConfigCallback(currentVariant, newConfig);
      }
    });
  });
}

export function showPanel() {
  if (dockElement) {
    const isHidden = dockElement.classList.contains('hidden');
    dockElement.classList.toggle('hidden', !isHidden);
    savePanelHidden(!isHidden);
  }
}

export function updatePanelVariant(variant, config) {
  if (updateConfigCallback) {
    createSplatConfigPanel(variant, config, updateConfigCallback);
    // Ensure dock is visible when updating
    if (dockElement) {
      dockElement.classList.remove('hidden');
      savePanelHidden(false);
    }
  }
}
