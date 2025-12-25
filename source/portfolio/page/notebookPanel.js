// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    NOTEBOOK CONTROL PANEL                                    ║
// ║                  Customization UI for Portfolio Page                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { GLOBAL_CONFIG } from './config.js';
import { updateParallaxConfig, getParallaxConfig } from './mouseParallax.js';
import { zoomManager } from './zoomManager.js';

let panelVisible = false;
let panelElement = null;

/**
 * Create the control panel HTML
 */
function createPanelHTML() {
  return `
<div class="notebook-panel panel">
  <div class="panel-header">
    <div class="panel-title">
      <span class="panel-icon">⚙️</span>
      Portfolio Controls
    </div>
    <button class="collapse-btn" aria-label="Close panel">×</button>
  </div>
  
  <div class="panel-content">
    
    <!-- Flip Animation -->
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">📖</span>
        <span class="section-label">Flip Animation</span>
      </summary>
      <div class="panel-section-content">
        <label>
          <div>
            <span>Duration</span>
            <span class="val" id="nb-flip-duration-val">200ms</span>
          </div>
          <input type="range" id="nb-flip-duration" min="100" max="800" step="50" value="200">
        </label>
        
        <label>
          <div>
            <span>Scroll Sensitivity</span>
            <span class="val" id="nb-scroll-sens-val">0.20</span>
          </div>
          <input type="range" id="nb-scroll-sens" min="0.05" max="0.5" step="0.01" value="0.20">
        </label>
      </div>
    </details>
    
    <!-- Mouse Parallax -->
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎯</span>
        <span class="section-label">Mouse Parallax</span>
      </summary>
      <div class="panel-section-content">
        <label>
          <div>
            <span>Enabled</span>
            <input type="checkbox" id="nb-parallax-enabled" checked>
          </div>
        </label>
        
        <label>
          <div>
            <span>Tilt X (Vertical)</span>
            <span class="val" id="nb-parallax-x-val">3°</span>
          </div>
          <input type="range" id="nb-parallax-x" min="0" max="10" step="0.5" value="3">
        </label>
        
        <label>
          <div>
            <span>Tilt Y (Horizontal)</span>
            <span class="val" id="nb-parallax-y-val">5°</span>
          </div>
          <input type="range" id="nb-parallax-y" min="0" max="15" step="0.5" value="5">
        </label>
        
        <label>
          <div>
            <span>Smoothing</span>
            <span class="val" id="nb-parallax-smooth-val">0.12</span>
          </div>
          <input type="range" id="nb-parallax-smooth" min="0.01" max="0.5" step="0.01" value="0.12">
        </label>
      </div>
    </details>
    
    <!-- Page Shadows -->
    <details class="panel-section-accordion">
      <summary class="panel-section-header">
        <span class="section-icon">☁️</span>
        <span class="section-label">Page Shadows</span>
      </summary>
      <div class="panel-section-content">
        <label>
          <div>
            <span>Shadow Blur</span>
            <span class="val" id="nb-shadow-blur-val">12px</span>
          </div>
          <input type="range" id="nb-shadow-blur" min="0" max="40" step="2" value="12">
        </label>
        
        <label>
          <div>
            <span>Shadow Spread</span>
            <span class="val" id="nb-shadow-spread-val">0px</span>
          </div>
          <input type="range" id="nb-shadow-spread" min="-10" max="10" step="1" value="0">
        </label>
        
        <label>
          <div>
            <span>Shadow Opacity</span>
            <span class="val" id="nb-shadow-opacity-val">0.08</span>
          </div>
          <input type="range" id="nb-shadow-opacity" min="0" max="0.3" step="0.01" value="0.08">
        </label>

        <label>
          <div>
            <span>Backface Shadow Strength</span>
            <span class="val" id="nb-backface-shadow-val">120%</span>
          </div>
          <input type="range" id="nb-backface-shadow" min="0.5" max="2" step="0.05" value="1.2">
        </label>
      </div>
    </details>
    
    <!-- 3D Scene -->
    <details class="panel-section-accordion">
      <summary class="panel-section-header">
        <span class="section-icon">📐</span>
        <span class="section-label">3D Scene</span>
      </summary>
      <div class="panel-section-content">
        <label>
          <div>
            <span>Perspective</span>
            <span class="val" id="nb-perspective-val">3000px</span>
          </div>
          <input type="range" id="nb-perspective" min="1000" max="8000" step="100" value="3000">
        </label>
      </div>
    </details>
    
    <!-- Zoom System -->
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🔍</span>
        <span class="section-label">Zoom System</span>
      </summary>
      <div class="panel-section-content">
        <label>
          <div>
            <span>Initial Zoom</span>
            <span class="val" id="nb-zoom-default-val">78%</span>
          </div>
          <input type="range" id="nb-zoom-default" min="0.5" max="1.2" step="0.01" value="0.78">
        </label>
        
        <label>
          <div>
            <span>Focused Zoom</span>
            <span class="val" id="nb-zoom-focused-val">110%</span>
          </div>
          <input type="range" id="nb-zoom-focused" min="0.8" max="1.5" step="0.01" value="1.1">
        </label>
        
        <label>
          <div>
            <span>Transition Speed</span>
            <span class="val" id="nb-zoom-duration-val">350ms</span>
          </div>
          <input type="range" id="nb-zoom-duration" min="100" max="800" step="50" value="350">
        </label>
        
        <label>
          <div>
            <span>Background Blur</span>
            <span class="val" id="nb-zoom-blur-val">8px</span>
          </div>
          <input type="range" id="nb-zoom-blur" min="0" max="16" step="1" value="8">
        </label>
      </div>
    </details>
    
  </div>
</div>
  `;
}

/**
 * Create panel styles - shadcn-inspired design system
 */
function injectPanelStyles() {
  const style = document.createElement('style');
  style.id = 'notebook-panel-styles';
  style.textContent = `
/* Import shadcn-inspired design tokens from studio page */
.notebook-panel {
  /* Design tokens - Dark mode (default) */
  --panel-background: hsl(240 10% 3.9%);
  --panel-foreground: hsl(0 0% 98%);
  --panel-muted: hsl(240 3.7% 15.9%);
  --panel-muted-foreground: hsl(240 5% 64.9%);
  --panel-accent: hsl(240 3.7% 15.9%);
  --panel-border: hsl(240 3.7% 15.9%);
  --panel-ring: hsl(240 4.9% 83.9%);
  --panel-radius: 0.75rem;
  --panel-radius-sm: 0.5rem;
  --panel-pad: 10px;
  --panel-gap: 8px;
  --panel-section-pad: 10px;
  --panel-section-gap: 6px;
  --panel-control-gap: 3px;
  --panel-shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  
  position: fixed;
  top: 10px;
  right: 10px;
  width: 23rem;
  max-height: 80vh;
  font-family: 'Geist', sans-serif;
  font-size: 12.5px;
  line-height: 1.35;
  font-weight: 400;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  background: var(--panel-background);
  color: var(--panel-foreground);
  border: 1px solid var(--panel-border);
  border-radius: var(--panel-radius);
  box-shadow: var(--panel-shadow-lg);
  
  overflow: hidden;
  display: none;
  flex-direction: column;
  z-index: 25000;
  user-select: none;
}

.notebook-panel.visible {
  display: flex;
}

/* Panel Header */
.notebook-panel .panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--panel-pad);
  border-bottom: 1px solid var(--panel-border);
  background: var(--panel-background);
  cursor: default;
}

.notebook-panel .panel-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--panel-foreground);
}

.notebook-panel .panel-icon {
  font-size: 16px;
  opacity: 0.8;
}

.notebook-panel .collapse-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--panel-radius-sm);
  color: var(--panel-muted-foreground);
  font-size: 20px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.notebook-panel .collapse-btn:hover {
  background: var(--panel-accent);
  color: var(--panel-foreground);
}

/* Panel Content */
.notebook-panel .panel-content {
  padding: var(--panel-pad);
  display: flex;
  flex-direction: column;
  gap: var(--panel-gap);
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  user-select: auto;
  cursor: auto;
}

/* Scrollbar */
.notebook-panel .panel-content::-webkit-scrollbar {
  width: 8px;
}

.notebook-panel .panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.notebook-panel .panel-content::-webkit-scrollbar-thumb {
  background: var(--panel-muted);
  border-radius: 4px;
  border: 2px solid var(--panel-background);
}

.notebook-panel .panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--panel-muted-foreground);
}

/* Section Accordions */
.notebook-panel .panel-section-accordion {
  border-bottom: 3px solid var(--panel-border);
  padding-bottom: 6px;
  margin-bottom: 6px;
}

.notebook-panel .panel-section-accordion:last-child {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 0;
}

.notebook-panel .panel-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 var(--panel-pad);
  height: 38px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--panel-foreground);
  cursor: pointer;
  list-style: none;
  user-select: none;
  transition: background 0.15s ease;
}

.notebook-panel .panel-section-header::-webkit-details-marker {
  display: none;
}

.notebook-panel .panel-section-header::after {
  content: '';
  width: 16px;
  height: 16px;
  margin-left: auto;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.notebook-panel .panel-section-accordion[open] > .panel-section-header::after {
  transform: rotate(180deg);
}

.notebook-panel .panel-section-header:hover {
  background: var(--panel-muted);
}

.notebook-panel .section-icon {
  font-size: 16px;
}

.notebook-panel .section-label {
  flex: 1;
}

.notebook-panel .panel-section-content {
  padding: var(--panel-section-pad);
  display: flex;
  flex-direction: column;
  gap: var(--panel-section-gap);
}

/* Labels & Controls */
.notebook-panel label {
  display: flex;
  flex-direction: column;
  gap: var(--panel-control-gap);
}

.notebook-panel label > div:first-child {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  color: var(--panel-muted-foreground);
}

.notebook-panel span.val {
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  font-family: 'Geist Mono', monospace;
  color: var(--panel-foreground);
  min-width: 48px;
  text-align: right;
}

/* Sliders */
.notebook-panel input[type="range"] {
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  background: var(--panel-muted);
  border: none;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
}

.notebook-panel input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--panel-foreground);
  border: none;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.notebook-panel input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.notebook-panel input[type="range"]::-webkit-slider-thumb:active {
  transform: scale(0.95);
}

.notebook-panel input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--panel-foreground);
  border: none;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.notebook-panel input[type="range"]::-moz-range-track {
  height: 6px;
  background: var(--panel-muted);
  border-radius: 9999px;
}

/* Checkboxes */
.notebook-panel input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: hsl(32 95% 44%);
  cursor: pointer;
}
  `;
  document.head.appendChild(style);
}

/**
 * Wire up all control event listeners
 */
function wireControls() {
  const parallaxCfg = getParallaxConfig();
  
  // Flip Duration
  const flipDuration = document.getElementById('nb-flip-duration');
  const flipDurationVal = document.getElementById('nb-flip-duration-val');
  if (flipDuration) {
    flipDuration.value = GLOBAL_CONFIG.ANIMATION.duration;
    flipDurationVal.textContent = `${GLOBAL_CONFIG.ANIMATION.duration}ms`;
    flipDuration.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      GLOBAL_CONFIG.ANIMATION.duration = val;
      flipDurationVal.textContent = `${val}ms`;
      document.documentElement.style.setProperty('--flip-duration', `${val}ms`);
    });
  }
  
  // Scroll Sensitivity
  const scrollSens = document.getElementById('nb-scroll-sens');
  const scrollSensVal = document.getElementById('nb-scroll-sens-val');
  if (scrollSens) {
    scrollSens.value = GLOBAL_CONFIG.ANIMATION.scrollSensitivity;
    scrollSensVal.textContent = GLOBAL_CONFIG.ANIMATION.scrollSensitivity.toFixed(2);
    scrollSens.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      GLOBAL_CONFIG.ANIMATION.scrollSensitivity = val;
      scrollSensVal.textContent = val.toFixed(2);
    });
  }
  
  // Parallax Enabled
  const parallaxEnabled = document.getElementById('nb-parallax-enabled');
  if (parallaxEnabled) {
    parallaxEnabled.checked = parallaxCfg.enabled;
    parallaxEnabled.addEventListener('change', (e) => {
      updateParallaxConfig({ enabled: e.target.checked });
    });
  }
  
  // Parallax X
  const parallaxX = document.getElementById('nb-parallax-x');
  const parallaxXVal = document.getElementById('nb-parallax-x-val');
  if (parallaxX) {
    parallaxX.value = parallaxCfg.maxRotateX;
    parallaxXVal.textContent = `${parallaxCfg.maxRotateX}°`;
    parallaxX.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      updateParallaxConfig({ maxRotateX: val });
      parallaxXVal.textContent = `${val}°`;
    });
  }
  
  // Parallax Y
  const parallaxY = document.getElementById('nb-parallax-y');
  const parallaxYVal = document.getElementById('nb-parallax-y-val');
  if (parallaxY) {
    parallaxY.value = parallaxCfg.maxRotateY;
    parallaxYVal.textContent = `${parallaxCfg.maxRotateY}°`;
    parallaxY.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      updateParallaxConfig({ maxRotateY: val });
      parallaxYVal.textContent = `${val}°`;
    });
  }
  
  // Parallax Smoothing
  const parallaxSmooth = document.getElementById('nb-parallax-smooth');
  const parallaxSmoothVal = document.getElementById('nb-parallax-smooth-val');
  if (parallaxSmooth) {
    parallaxSmooth.value = parallaxCfg.smoothing;
    parallaxSmoothVal.textContent = parallaxCfg.smoothing.toFixed(2);
    parallaxSmooth.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      updateParallaxConfig({ smoothing: val });
      parallaxSmoothVal.textContent = val.toFixed(2);
    });
  }
  
  // Shadow controls
  const shadowBlur = document.getElementById('nb-shadow-blur');
  const shadowBlurVal = document.getElementById('nb-shadow-blur-val');
  if (shadowBlur) {
    shadowBlur.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      shadowBlurVal.textContent = `${val}px`;
      document.documentElement.style.setProperty('--page-shadow-blur', `${val}px`);
    });
  }
  
  const shadowSpread = document.getElementById('nb-shadow-spread');
  const shadowSpreadVal = document.getElementById('nb-shadow-spread-val');
  if (shadowSpread) {
    shadowSpread.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      shadowSpreadVal.textContent = `${val}px`;
      document.documentElement.style.setProperty('--page-shadow-spread', `${val}px`);
    });
  }
  
  const shadowOpacity = document.getElementById('nb-shadow-opacity');
  const shadowOpacityVal = document.getElementById('nb-shadow-opacity-val');
  if (shadowOpacity) {
    shadowOpacity.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      shadowOpacityVal.textContent = val.toFixed(2);
      document.documentElement.style.setProperty('--page-shadow-opacity', val);
    });
  }

  // Backface shadow strength
  const backfaceShadow = document.getElementById('nb-backface-shadow');
  const backfaceShadowVal = document.getElementById('nb-backface-shadow-val');
  if (backfaceShadow) {
    backfaceShadow.value = GLOBAL_CONFIG.BACKFACE.shadowStrength ?? 1.0;
    backfaceShadowVal.textContent = `${Math.round((GLOBAL_CONFIG.BACKFACE.shadowStrength ?? 1) * 100)}%`;
    backfaceShadow.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      GLOBAL_CONFIG.BACKFACE.shadowStrength = val;
      backfaceShadowVal.textContent = `${Math.round(val * 100)}%`;
      document.documentElement.style.setProperty('--backface-shadow-strength', val);
    });
  }
  
  // Perspective
  const perspective = document.getElementById('nb-perspective');
  const perspectiveVal = document.getElementById('nb-perspective-val');
  if (perspective) {
    perspective.value = GLOBAL_CONFIG.SCENE.perspective;
    perspectiveVal.textContent = `${GLOBAL_CONFIG.SCENE.perspective}px`;
    perspective.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      GLOBAL_CONFIG.SCENE.perspective = val;
      perspectiveVal.textContent = `${val}px`;
      document.documentElement.style.setProperty('--perspective-distance', `${val}px`);
    });
  }
  
  // Zoom - Default Scale
  const zoomDefault = document.getElementById('nb-zoom-default');
  const zoomDefaultVal = document.getElementById('nb-zoom-default-val');
  if (zoomDefault) {
    zoomDefault.value = GLOBAL_CONFIG.ZOOM.defaultScale;
    zoomDefaultVal.textContent = `${Math.round(GLOBAL_CONFIG.ZOOM.defaultScale * 100)}%`;
    zoomDefault.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      GLOBAL_CONFIG.ZOOM.defaultScale = val;
      zoomDefaultVal.textContent = `${Math.round(val * 100)}%`;
      document.documentElement.style.setProperty('--notebook-zoom-scale', val);
      console.log(`🔍 Initial zoom updated to ${Math.round(val * 100)}%`);
    });
  }
  
  // Zoom - Focused Scale
  const zoomFocused = document.getElementById('nb-zoom-focused');
  const zoomFocusedVal = document.getElementById('nb-zoom-focused-val');
  if (zoomFocused) {
    zoomFocused.value = GLOBAL_CONFIG.ZOOM.focusedScale;
    zoomFocusedVal.textContent = `${Math.round(GLOBAL_CONFIG.ZOOM.focusedScale * 100)}%`;
    zoomFocused.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      GLOBAL_CONFIG.ZOOM.focusedScale = val;
      zoomFocusedVal.textContent = `${Math.round(val * 100)}%`;
      document.documentElement.style.setProperty('--notebook-zoom-focused-scale', val);
      console.log(`🔍 Focused zoom updated to ${Math.round(val * 100)}%`);
    });
  }
  
  // Zoom - Transition Duration
  const zoomDuration = document.getElementById('nb-zoom-duration');
  const zoomDurationVal = document.getElementById('nb-zoom-duration-val');
  if (zoomDuration) {
    zoomDuration.value = GLOBAL_CONFIG.ZOOM.transitionDuration;
    zoomDurationVal.textContent = `${GLOBAL_CONFIG.ZOOM.transitionDuration}ms`;
    zoomDuration.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      GLOBAL_CONFIG.ZOOM.transitionDuration = val;
      zoomDurationVal.textContent = `${val}ms`;
      document.documentElement.style.setProperty('--zoom-duration', `${val}ms`);
      console.log(`🔍 Zoom transition speed updated to ${val}ms`);
    });
  }
  
  const zoomBlur = document.getElementById('nb-zoom-blur');
  const zoomBlurVal = document.getElementById('nb-zoom-blur-val');
  if (zoomBlur) {
    zoomBlur.value = GLOBAL_CONFIG.ZOOM.background.blurRadius;
    zoomBlurVal.textContent = `${GLOBAL_CONFIG.ZOOM.background.blurRadius}px`;
    zoomBlur.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      GLOBAL_CONFIG.ZOOM.background.blurRadius = val;
      zoomBlurVal.textContent = `${val}px`;
      updateZoomConfig({ backgroundBlurRadius: val });
    });
  }
  
  // Close button
  const closeBtn = panelElement.querySelector('.collapse-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', hidePanel);
  }
}

/**
 * Show panel
 */
function showPanel() {
  if (!panelElement) return;
  panelElement.classList.add('visible');
  panelVisible = true;
}

/**
 * Hide panel
 */
function hidePanel() {
  if (!panelElement) return;
  panelElement.classList.remove('visible');
  panelVisible = false;
}

/**
 * Toggle panel
 */
function togglePanel() {
  if (panelVisible) {
    hidePanel();
  } else {
    showPanel();
  }
}

/**
 * Initialize the panel system
 */
export function initNotebookPanel() {
  // Inject styles
  injectPanelStyles();
  
  // Create panel element
  panelElement = document.createElement('div');
  panelElement.innerHTML = createPanelHTML();
  document.body.appendChild(panelElement);
  panelElement = panelElement.firstElementChild;
  
  // Wire controls
  wireControls();
  
  // Keyboard shortcut: / key
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.matches('input, textarea')) {
      e.preventDefault();
      togglePanel();
    }
  });
  
  console.log('✓ Notebook control panel initialized (press / to toggle)');
  console.log('🔍 Zoom controls available:');
  console.log(`   Initial Zoom: ${Math.round(GLOBAL_CONFIG.ZOOM.defaultScale * 100)}%`);
  console.log(`   Focused Zoom: ${Math.round(GLOBAL_CONFIG.ZOOM.focusedScale * 100)}%`);
  console.log(`   Transition: ${GLOBAL_CONFIG.ZOOM.transitionDuration}ms`);
  console.log(`   Backface Shadow Strength: ${Math.round((GLOBAL_CONFIG.BACKFACE.shadowStrength ?? 1) * 100)}%`);
  console.log('💡 TIP: Use window.notebook.zoom.setScales(0.8, 1.2) for runtime adjustment');
}

