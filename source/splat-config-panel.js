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

let panelElement = null;
let currentVariant = null;
let updateConfigCallback = null;

export function createSplatConfigPanel(variant, config, onConfigUpdate) {
  currentVariant = variant;
  updateConfigCallback = onConfigUpdate;

  // Remove existing panel
  if (panelElement) {
    panelElement.remove();
  }

  // Create panel container
  panelElement = document.createElement('div');
  panelElement.id = 'splat-config-panel';
  panelElement.className = 'panel';
  panelElement.style.position = 'fixed';
  panelElement.style.top = 'var(--gap-lg, 20px)';
  panelElement.style.right = 'var(--gap-lg, 20px)';
  panelElement.style.width = '320px';
  panelElement.style.maxHeight = '85vh';
  panelElement.style.overflowY = 'auto';
  panelElement.style.zIndex = '10001';
  panelElement.style.display = 'none'; // Hidden by default
  panelElement.style.background = 'var(--panel-background, #18181b)';
  panelElement.style.color = 'var(--panel-foreground, #fafafa)';
  panelElement.style.border = '1px solid var(--panel-border, rgba(255,255,255,0.1))';
  panelElement.style.borderTop = '4px solid hsl(32 95% 44%)'; // Orange brand color
  panelElement.style.borderRadius = 'var(--panel-radius-lg, 12px)';
  panelElement.style.boxShadow = 'var(--panel-shadow, 0 10px 15px -3px rgba(0,0,0,0.3))';
  
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

  // Build panel HTML
  panelElement.innerHTML = `
    <div class="panel-content">
      <div style="position: relative; margin-bottom: var(--panel-gap, 8px); padding-bottom: var(--panel-gap, 8px); border-bottom: 1px solid var(--panel-border, rgba(255,255,255,0.1));">
        <div style="font-size: 13px; font-weight: 600; color: var(--panel-foreground, #fff);">
          ${variant.label}
        </div>
        <button id="splat-panel-toggle" style="
          position: absolute;
          top: 0;
          right: 0;
          background: transparent;
          border: 1px solid var(--panel-border, rgba(255,255,255,0.2));
          color: var(--panel-foreground, #fff);
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          opacity: 0.7;
          transition: opacity 0.2s;
        " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">✕</button>
      </div>
      
      ${generateSectionHTML('Main Parameters', params.main, config)}
      ${generateSectionHTML('Secondary Parameters', params.secondary, config)}
      ${generateSectionHTML('Extra Parameters', params.extra, config)}
      
      <div style="margin-top: var(--panel-gap, 8px); padding-top: var(--panel-gap, 8px); border-top: 1px solid var(--panel-border, rgba(255,255,255,0.1)); font-size: 11px; color: var(--panel-muted-foreground, #888);">
        <kbd>/</kbd> toggle panel · Changes apply instantly
      </div>
    </div>
  `;

  document.body.appendChild(panelElement);

  // Bind controls
  bindPanelControls(panelElement, params, config);

  // Toggle button
  const toggleBtn = panelElement.querySelector('#splat-panel-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      panelElement.style.display = 'none';
    });
  }

  return panelElement;
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
  if (panelElement) {
    const isHidden = panelElement.style.display === 'none' || !panelElement.style.display;
    panelElement.style.display = isHidden ? 'block' : 'none';
  }
}

export function updatePanelVariant(variant, config) {
  if (panelElement && updateConfigCallback) {
    createSplatConfigPanel(variant, config, updateConfigCallback);
    panelElement.style.display = 'block';
  }
}
