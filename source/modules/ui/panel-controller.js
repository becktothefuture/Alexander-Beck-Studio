// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PANEL CONTROLLER (COMPLETE)                             ║
// ║              Creates panel with full controls from template                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PANEL_HTML } from './panel-html.js';
import { setupControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';
import { getGlobals } from '../core/state.js';

export function setupPanel() {
  const panel = document.getElementById('controlPanel');
  if (!panel) return;
  
  // Inject complete panel HTML
  panel.innerHTML = PANEL_HTML;
  
  // Wire up minimize button
  const minimizeBtn = panel.querySelector('#minimizePanel');
  if (minimizeBtn) {
    minimizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('hidden');
      panel.style.display = panel.classList.contains('hidden') ? 'none' : '';
    });
  }
  
  // Make panel draggable
  setupPanelDragging(panel);
  
  // Wire up all control listeners
  setupControls();
  setupBuildControls();
  
  // Check initial visibility
  const initiallyVisible = typeof __PANEL_INITIALLY_VISIBLE__ !== 'undefined' 
    ? __PANEL_INITIALLY_VISIBLE__ 
    : true;
  if (!initiallyVisible) panel.classList.add('hidden');
}

function setupPanelDragging(panel) {
  const header = panel.querySelector('.panel-header');
  if (!header) return;
  
  let isDragging = false;
  let xOffset = 0, yOffset = 0;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    xOffset = e.clientX - panel.offsetLeft;
    yOffset = e.clientY - panel.offsetTop;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    panel.style.left = (e.clientX - xOffset) + 'px';
    panel.style.top = (e.clientY - yOffset) + 'px';
    panel.style.right = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

function setupControlListeners() {
  const globals = getGlobals();
  
  // Mode buttons
  const modeButtons = document.querySelectorAll('.mode-button');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      // Import setMode dynamically to avoid circular dependency
      import('../modes/mode-controller.js').then(({ setMode }) => {
        setMode(mode);
        updateModeButtonsUI(mode);
      });
    });
  });
  
  // Global size slider
  const sizeSlider = document.getElementById('sizeSliderGlobal');
  const sizeVal = document.getElementById('sizeValGlobal');
  if (sizeSlider && sizeVal) {
    sizeSlider.addEventListener('input', () => {
      globals.sizeScale = parseFloat(sizeSlider.value);
      sizeVal.textContent = globals.sizeScale.toFixed(2);
      updateBallSizes();
    });
  }
  
  // Ball softness slider
  const softnessSlider = document.getElementById('ballSoftnessSliderGlobal');
  const softnessVal = document.getElementById('ballSoftnessValGlobal');
  if (softnessSlider && softnessVal) {
    softnessSlider.addEventListener('input', () => {
      globals.ballSoftness = parseFloat(softnessSlider.value);
      softnessVal.textContent = globals.ballSoftness.toFixed(0);
    });
  }
  
  // Physics sliders (Ball Pit mode)
  const gravitySlider = document.getElementById('gravityPitSlider');
  const gravityVal = document.getElementById('gravityPitVal');
  if (gravitySlider && gravityVal) {
    gravitySlider.addEventListener('input', () => {
      globals.gravityMultiplier = parseFloat(gravitySlider.value);
      globals.G = 1960 * globals.gravityMultiplier;
      gravityVal.textContent = globals.gravityMultiplier.toFixed(2);
    });
  }
  
  // Flies sliders
  const attractSlider = document.getElementById('attractPowerSlider');
  const attractVal = document.getElementById('attractPowerVal');
  if (attractSlider && attractVal) {
    attractSlider.addEventListener('input', () => {
      globals.attractionPower = parseFloat(attractSlider.value);
      attractVal.textContent = globals.attractionPower.toFixed(0);
    });
  }
  
  // Add more listeners as needed...
}

function updateModeButtonsUI(activeMode) {
  const buttons = document.querySelectorAll('.mode-button');
  buttons.forEach(btn => {
    const isActive = btn.getAttribute('data-mode') === activeMode;
    btn.classList.toggle('active', isActive);
  });
  
  // Show/hide mode-specific controls
  document.querySelectorAll('.mode-controls').forEach(el => el.classList.remove('active'));
  const controlId = activeMode + 'Controls';
  const activeControls = document.getElementById(controlId);
  if (activeControls) activeControls.classList.add('active');
}

function updateBallSizes() {
  const globals = getGlobals();
  const baseSize = (globals.R_MIN_BASE + globals.R_MAX_BASE) / 2;
  globals.R_MIN = baseSize * globals.sizeScale * 0.75;
  globals.R_MAX = baseSize * globals.sizeScale * 1.25;
  
  // Update existing balls
  const balls = globals.balls;
  for (let i = 0; i < balls.length; i++) {
    const newSize = (globals.R_MIN + globals.R_MAX) / 2;
    balls[i].r = newSize;
    balls[i].rBase = newSize;
  }
}
