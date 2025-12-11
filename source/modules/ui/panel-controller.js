// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      PANEL CONTROLLER (COMPLETE)                             ║
// ║              Creates panel with full controls from template                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { PANEL_HTML } from './panel-html.js';
import { setupControls } from './controls.js';
import { setupBuildControls } from './build-controls.js';
import { initializeDarkMode } from '../visual/dark-mode-v2.js';

export function setupPanel() {
  let panel = document.getElementById('controlPanel');
  
  // Ensure panel exists and is a direct child of body for correct z-index
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'controlPanel';
    panel.className = 'panel';
    document.body.appendChild(panel);
  } else if (panel.parentElement !== document.body) {
    // Move existing panel to body if it's trapped in another container
    panel.parentElement.removeChild(panel);
    document.body.appendChild(panel);
  }
  
  // Inject complete panel HTML
  panel.innerHTML = PANEL_HTML;
  initializeDarkMode();
  
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
  
  // Wire up all control listeners (mode buttons, sliders, etc.)
  setupControls();
  setupBuildControls();
  
  // Check initial visibility
  const initiallyVisible = typeof __PANEL_INITIALLY_VISIBLE__ !== 'undefined' 
    ? __PANEL_INITIALLY_VISIBLE__ 
    : true;
  if (!initiallyVisible) panel.classList.add('hidden');
  
  console.log('✓ Panel created');
}

function setupPanelDragging(panel) {
  const header = panel.querySelector('.panel-header');
  if (!header) return;
  
  let isDragging = false;
  let xOffset = 0, yOffset = 0;
  
  header.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = panel.getBoundingClientRect();
    xOffset = e.clientX - rect.left;
    yOffset = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const x = e.clientX - xOffset;
    const y = e.clientY - yOffset;
    
    // Constrain to viewport
    const maxX = window.innerWidth - panel.offsetWidth - 20;
    const maxY = window.innerHeight - panel.offsetHeight - 20;
    
    panel.style.left = Math.max(20, Math.min(x, maxX)) + 'px';
    panel.style.top = Math.max(20, Math.min(y, maxY)) + 'px';
    panel.style.right = 'auto';
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    header.style.cursor = 'move';
  });
}
