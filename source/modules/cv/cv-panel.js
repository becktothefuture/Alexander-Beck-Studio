// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           CV CONFIG PANEL                                    ║
// ║                   Control panel for CV page layout                           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const STORAGE_KEY = 'cv_config';

// Default configuration
const DEFAULT_CONFIG = {
  // Left column (photo + intro)
  leftWidth: 32, // vw
  leftPaddingTop: 10, // vh
  leftPaddingBottom: 10, // vh
  leftGap: 2.5, // rem
  
  // Photo
  photoAspectRatio: 0.75, // 3:4 ratio
  photoSize: 115, // % (fills container with slight overflow for jitter effect)
  photoBorderRadius: 1, // rem
  
  // Right column (scrollable content)
  rightPaddingTop: 20, // vh
  rightPaddingBottom: 20, // vh
  rightPaddingX: 2.5, // rem
  rightMaxWidth: 42, // rem
  
  // Typography
  nameSize: 2.2, // rem
  titleSize: 0.9, // rem
  sectionTitleSize: 0.75, // rem
  bodySize: 0.9, // rem
  
  // Spacing
  sectionGap: 3.5, // rem
  paragraphGap: 1.5, // rem
  
  // Colors
  mutedOpacity: 0.6, // for section titles
};

// Load configuration from localStorage
function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (e) {
    return { ...DEFAULT_CONFIG };
  }
}

// Save configuration to localStorage
function saveConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('[CV Panel] Could not save config:', e);
  }
}

// Apply configuration to CSS variables
function applyConfig(config) {
  const root = document.documentElement;
  
  // Left column
  root.style.setProperty('--cv-left-width', `${config.leftWidth}vw`);
  root.style.setProperty('--cv-left-padding-top', `${config.leftPaddingTop}vh`);
  root.style.setProperty('--cv-left-padding-bottom', `${config.leftPaddingBottom}vh`);
  root.style.setProperty('--cv-left-gap', `${config.leftGap}rem`);
  
  // Photo
  root.style.setProperty('--cv-photo-aspect-ratio', config.photoAspectRatio);
  root.style.setProperty('--cv-photo-size', `${config.photoSize}%`);
  root.style.setProperty('--cv-photo-border-radius', `${config.photoBorderRadius}rem`);
  
  // Right column
  root.style.setProperty('--cv-right-padding-top', `${config.rightPaddingTop}vh`);
  root.style.setProperty('--cv-right-padding-bottom', `${config.rightPaddingBottom}vh`);
  root.style.setProperty('--cv-right-padding-x', `${config.rightPaddingX}rem`);
  root.style.setProperty('--cv-right-max-width', `${config.rightMaxWidth}rem`);
  
  // Typography
  root.style.setProperty('--cv-name-size', `${config.nameSize}rem`);
  root.style.setProperty('--cv-title-size', `${config.titleSize}rem`);
  root.style.setProperty('--cv-section-title-size', `${config.sectionTitleSize}rem`);
  root.style.setProperty('--cv-body-size', `${config.bodySize}rem`);
  
  // Spacing
  root.style.setProperty('--cv-section-gap', `${config.sectionGap}rem`);
  root.style.setProperty('--cv-paragraph-gap', `${config.paragraphGap}rem`);
  
  // Colors
  root.style.setProperty('--cv-muted-opacity', config.mutedOpacity);
}

// Create panel HTML
function createPanelHTML() {
  return `
    <div id="cv-config-panel" class="cv-config-panel">
      <div class="cv-panel-header">
        <h3>CV Layout Config</h3>
        <button id="cv-panel-close" class="cv-panel-close" aria-label="Close panel">×</button>
      </div>
      <div class="cv-panel-content">
        
        <details class="cv-panel-section" open>
          <summary>Left Column</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Width (vw)</span>
              <input type="range" id="leftWidth" min="20" max="45" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Top (vh)</span>
              <input type="range" id="leftPaddingTop" min="0" max="20" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Bottom (vh)</span>
              <input type="range" id="leftPaddingBottom" min="0" max="20" step="1" />
              <output></output>
            </label>
            <label>
              <span>Gap (rem)</span>
              <input type="range" id="leftGap" min="0.5" max="5" step="0.25" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section" open>
          <summary>Photo</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Size (%)</span>
              <input type="range" id="photoSize" min="10" max="150" step="1" />
              <output></output>
            </label>
            <label>
              <span>Aspect Ratio</span>
              <input type="range" id="photoAspectRatio" min="0.5" max="1.5" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Border Radius (rem)</span>
              <input type="range" id="photoBorderRadius" min="0" max="3" step="0.1" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Right Column</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Padding Top (vh)</span>
              <input type="range" id="rightPaddingTop" min="0" max="30" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding Bottom (vh)</span>
              <input type="range" id="rightPaddingBottom" min="0" max="30" step="1" />
              <output></output>
            </label>
            <label>
              <span>Padding X (rem)</span>
              <input type="range" id="rightPaddingX" min="0" max="5" step="0.25" />
              <output></output>
            </label>
            <label>
              <span>Max Width (rem)</span>
              <input type="range" id="rightMaxWidth" min="30" max="60" step="1" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Typography</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Name Size (rem)</span>
              <input type="range" id="nameSize" min="1" max="4" step="0.1" />
              <output></output>
            </label>
            <label>
              <span>Title Size (rem)</span>
              <input type="range" id="titleSize" min="0.5" max="1.5" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Section Title (rem)</span>
              <input type="range" id="sectionTitleSize" min="0.5" max="1.2" step="0.05" />
              <output></output>
            </label>
            <label>
              <span>Body Size (rem)</span>
              <input type="range" id="bodySize" min="0.6" max="1.4" step="0.05" />
              <output></output>
            </label>
          </div>
        </details>
        
        <details class="cv-panel-section">
          <summary>Spacing</summary>
          <div class="cv-panel-controls">
            <label>
              <span>Section Gap (rem)</span>
              <input type="range" id="sectionGap" min="1" max="6" step="0.25" />
              <output></output>
            </label>
            <label>
              <span>Paragraph Gap (rem)</span>
              <input type="range" id="paragraphGap" min="0.5" max="3" step="0.25" />
              <output></output>
            </label>
          </div>
        </details>
        
        <div class="cv-panel-actions">
          <button id="cv-panel-reset" class="cv-panel-btn cv-panel-btn--secondary">Reset to Defaults</button>
        </div>
      </div>
    </div>
  `;
}

// Initialize panel
export function initCvPanel() {
  // Create panel toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'cv-panel-toggle';
  toggleBtn.className = 'cv-panel-toggle';
  toggleBtn.setAttribute('aria-label', 'Toggle CV config panel');
  toggleBtn.textContent = '⚙';
  document.body.appendChild(toggleBtn);
  
  // Create panel
  const panelContainer = document.createElement('div');
  panelContainer.innerHTML = createPanelHTML();
  document.body.appendChild(panelContainer.firstElementChild);
  
  const panel = document.getElementById('cv-config-panel');
  const closeBtn = document.getElementById('cv-panel-close');
  const resetBtn = document.getElementById('cv-panel-reset');
  
  let currentConfig = loadConfig();
  applyConfig(currentConfig);
  
  // Bind all controls
  Object.keys(currentConfig).forEach(key => {
    const input = document.getElementById(key);
    if (!input) return;
    
    const output = input.nextElementSibling;
    
    // Set initial value
    input.value = currentConfig[key];
    if (output) output.textContent = currentConfig[key];
    
    // Handle changes
    input.addEventListener('input', () => {
      const value = parseFloat(input.value);
      currentConfig[key] = value;
      if (output) output.textContent = value;
      applyConfig(currentConfig);
      saveConfig(currentConfig);
    });
  });
  
  // Toggle panel (starts hidden)
  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('cv-panel--visible');
  });
  
  // Keyboard shortcut: / key to toggle
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Don't trigger if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      panel.classList.toggle('cv-panel--visible');
    }
  });
  
  // Close panel
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('cv-panel--visible');
  });
  
  // Reset to defaults
  resetBtn.addEventListener('click', () => {
    if (!confirm('Reset all CV layout settings to defaults?')) return;
    
    currentConfig = { ...DEFAULT_CONFIG };
    applyConfig(currentConfig);
    saveConfig(currentConfig);
    
    // Update all inputs
    Object.keys(currentConfig).forEach(key => {
      const input = document.getElementById(key);
      if (!input) return;
      const output = input.nextElementSibling;
      input.value = currentConfig[key];
      if (output) output.textContent = currentConfig[key];
    });
  });
  
  // Close on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('cv-panel--visible')) {
      panel.classList.remove('cv-panel--visible');
    }
  });
  
  console.log('[CV Panel] Initialized');
}
