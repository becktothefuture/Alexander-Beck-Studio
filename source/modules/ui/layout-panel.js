// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        LAYOUT CONTROL PANEL                                 ║
// ║             Controls for padding, radius, and theme                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { toggleDarkMode } from '../visual/dark-mode-v2.js';

export function createLayoutPanel() {
  // Create container
  const panel = document.createElement('div');
  panel.id = 'layout-panel';
  
  // Base styles
  Object.assign(panel.style, {
    position: 'fixed',
    top: '20px',
    left: '20px',
    width: '220px',
    padding: '16px',
    background: 'var(--bg-light)',
    color: 'var(--text-color)',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    zIndex: '10000',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: '13px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(128,128,128,0.2)'
  });

  // Helper to read CSS var
  const getVar = (name) => {
    const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return parseInt(val) || 0;
  };

  // 1. Padding Slider
  addControl(panel, 'Padding', '--container-border', 0, 100, getVar('--container-border'));

  // 2. Radius Slider
  addControl(panel, 'Radius', '--wall-radius', 0, 100, getVar('--wall-radius'));

  // 3. Theme Toggle
  const themeBtn = document.createElement('button');
  themeBtn.textContent = 'Toggle Theme';
  Object.assign(themeBtn.style, {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid currentColor',
    background: 'transparent',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '4px'
  });
  
  themeBtn.onclick = () => {
    toggleDarkMode();
    // Update button text or state if needed
  };
  
  panel.appendChild(themeBtn);
  document.body.appendChild(panel);
}

function addControl(parent, label, cssVar, min, max, initialValue) {
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '4px';
  
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.style.fontWeight = '500';
  
  const valEl = document.createElement('span');
  valEl.textContent = `${initialValue}px`;
  valEl.style.opacity = '0.7';
  valEl.style.fontVariantNumeric = 'tabular-nums';
  
  header.appendChild(labelEl);
  header.appendChild(valEl);
  
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.value = initialValue;
  slider.style.width = '100%';
  slider.style.cursor = 'grab';
  
  slider.oninput = (e) => {
    const val = e.target.value;
    valEl.textContent = `${val}px`;
    document.documentElement.style.setProperty(cssVar, `${val}px`);
  };
  
  wrapper.appendChild(header);
  wrapper.appendChild(slider);
  parent.appendChild(wrapper);
}

