// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
// ║              Extracted from balls-source.html lines 1405-1558                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export const COLOR_TEMPLATES = {
  industrialTeal: { 
    label: 'Industrial Teal',
    light: ['#b7bcb7', '#e4e9e4', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    dark: ['#6b726b', '#3d453d', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
  },
  sunsetCoral: { 
    label: 'Sunset Coral', 
    light: ['#bdbbb8', '#e8e6e3', '#ffffff', '#ff3b3b', '#000000', '#00f5d4', '#1e40af', '#fb923c'],
    dark: ['#716f6b', '#3f3d3a', '#8e8c88', '#ff6b6b', '#d8d8d8', '#00ffe7', '#6ba3ff', '#ffb570']
  },
  violetPunch: { 
    label: 'Violet Punch', 
    light: ['#b8b7c2', '#e6e5ed', '#ffffff', '#9333ea', '#000000', '#dc2626', '#0ea5e9', '#facc15'],
    dark: ['#6d6c7a', '#3a3845', '#8b8a98', '#c266ff', '#dad6e8', '#ff5c5c', '#42d4ff', '#fff066']
  },
  citrusBlast: { 
    label: 'Citrus Blast', 
    light: ['#bfbdb5', '#eae8df', '#ffffff', '#ea580c', '#000000', '#e11d48', '#2563eb', '#059669'],
    dark: ['#74726a', '#403e38', '#918f87', '#ff8c4d', '#dbd9d1', '#ff5c7a', '#6ba3ff', '#00d699']
  },
  cobaltSpark: { 
    label: 'Cobalt Spark', 
    light: ['#b5b8be', '#e3e6eb', '#ffffff', '#1d4ed8', '#000000', '#ea580c', '#db2777', '#d97706'],
    dark: ['#696d75', '#3a3e45', '#878b93', '#6b9dff', '#d6dae2', '#ff8c5c', '#ff66b3', '#ffc266']
  }
};

const COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

export function getCurrentPalette(templateName) {
  const globals = getGlobals();
  const template = COLOR_TEMPLATES[templateName];
  if (!template) return COLOR_TEMPLATES.industrialTeal.light;
  return globals.isDarkMode ? template.dark : template.light;
}

export function pickRandomColor() {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  if (!colors || colors.length === 0) {
    console.warn('No colors available, using fallback');
    return '#ffffff';
  }
  
  const random = Math.random();
  let cumulativeWeight = 0;
  
  for (let i = 0; i < Math.min(colors.length, COLOR_WEIGHTS.length); i++) {
    cumulativeWeight += COLOR_WEIGHTS[i];
    if (random <= cumulativeWeight) {
      return colors[i];
    }
  }
  
  return colors[Math.min(colors.length - 1, 7)];
}

/**
 * Get a specific color by index (0-7)
 * Ensures all 8 colors are accessible for guaranteed representation
 */
export function getColorByIndex(index) {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  if (!colors || colors.length === 0) {
    console.warn('No colors available, using fallback');
    return '#ffffff';
  }
  
  const clampedIndex = Math.max(0, Math.min(7, Math.floor(index)));
  return colors[clampedIndex] || '#ffffff';
}

export function applyColorTemplate(templateName) {
  const globals = getGlobals();
  globals.currentTemplate = templateName;
  globals.currentColors = getCurrentPalette(templateName);
  globals.cursorBallColor = globals.currentColors[globals.cursorBallIndex || 4];
  
  // Update existing ball colors
  updateExistingBallColors();
  
  // Sync CSS variables
  syncPaletteVars(globals.currentColors);
  
  // Update UI color pickers
  updateColorPickersUI();
}

function updateExistingBallColors() {
  const globals = getGlobals();
  const balls = globals.balls;
  
  for (let i = 0; i < balls.length; i++) {
    balls[i].color = pickRandomColor();
  }
}

function syncPaletteVars(colors) {
  try {
    const root = document.documentElement;
    const list = (colors && colors.length ? colors : []).slice(0, 8);
    for (let i = 0; i < 8; i++) {
      const hex = list[i] || '#ffffff';
      root.style.setProperty(`--ball-${i+1}`, hex);
    }
  } catch (_) { /* no-op */ }
}

function updateColorPickersUI() {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  for (let i = 1; i <= 8; i++) {
    const picker = document.getElementById(`color${i}`);
    const display = document.getElementById(`color${i}Val`);
    if (picker && colors[i-1]) {
      picker.value = colors[i-1];
      if (display) display.textContent = colors[i-1].toUpperCase();
    }
  }
}

export function populateColorSelect() {
  const select = document.getElementById('colorSelect');
  if (!select) return;
  
  select.innerHTML = '';
  for (const [key, template] of Object.entries(COLOR_TEMPLATES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.label;
    select.appendChild(option);
  }
  
  const globals = getGlobals();
  select.value = globals.currentTemplate;
}


