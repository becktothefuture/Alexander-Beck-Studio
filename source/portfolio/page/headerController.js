// headerController.js - minimizes header on zoom or scroll
import { GLOBAL_CONFIG } from './config.js';

export function initializeHeaderController(scrollEngine, zoomManager) {
  const header = document.querySelector('.heading-wrapper');
  if (!header) return;

  function update() {
    const scrollPos = scrollEngine ? scrollEngine.getScrollState().scroll : 0;
    const shouldMinimize = (zoomManager && zoomManager.isFocused && zoomManager.isFocused()) || scrollPos > 0.1;
    header.classList.toggle('header--minimized', shouldMinimize);
    requestAnimationFrame(update);
  }
  update();
} 