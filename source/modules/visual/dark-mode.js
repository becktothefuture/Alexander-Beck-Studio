// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      DARK MODE STATE MACHINE (COMPLETE)                      ║
// ║              Extracted from balls-source.html lines 983-1100                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate } from './colors.js';

const INIT_STATES = {
  INITIALIZING: 'initializing',
  DETERMINING_MODE: 'determining_mode',
  LOADING_COLORS: 'loading_colors',
  READY: 'ready',
  RUNNING: 'running'
};

const SUNSET_HOUR = 18;
const SUNRISE_HOUR = 6;

let initState = INIT_STATES.INITIALIZING;

export function isNightTime() {
  const now = new Date();
  const hour = now.getHours();
  const isNight = hour >= SUNSET_HOUR || hour < SUNRISE_HOUR;
  console.log(`🌍 Time check: ${hour}:${now.getMinutes().toString().padStart(2,'0')} → ${isNight ? 'Night' : 'Day'} (sunset: ${SUNSET_HOUR}, sunrise: ${SUNRISE_HOUR})`);
  return isNight;
}

export function determineDarkMode() {
  const globals = getGlobals();
  console.log('🔍 STATE: DETERMINING_MODE');
  initState = INIT_STATES.DETERMINING_MODE;
  
  if (!globals.autoDarkModeEnabled) {
    console.log('✓ Dark mode disabled by user → Light mode');
    return false;
  }
  
  const shouldBeDark = isNightTime();
  console.log(`✓ Dark mode determination complete → ${shouldBeDark ? 'DARK' : 'LIGHT'} mode`);
  return shouldBeDark;
}

export function applyDarkMode(enabled) {
  const globals = getGlobals();
  globals.isDarkMode = enabled;
  
  // Apply to container and body
  if (enabled) {
    globals.container.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
  } else {
    globals.container.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
  }
  
  // Switch color palette variant
  applyColorTemplate(globals.currentTemplate);
  
  updateDarkModeUI();
}

export function checkAndApplyDarkMode() {
  const globals = getGlobals();
  if (globals.autoDarkModeEnabled) {
    applyDarkMode(isNightTime());
  }
}

export function updateDarkModeUI() {
  const globals = getGlobals();
  const toggle = document.getElementById('darkModeToggle');
  const status = document.getElementById('darkModeStatus');
  
  if (toggle) toggle.checked = globals.autoDarkModeEnabled;
  
  if (status) {
    const now = new Date();
    const hour = now.getHours();
    const timeStr = `${hour.toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (globals.isDarkMode) {
      status.textContent = `🌙 Night Mode (${timeStr})`;
      status.style.background = 'rgba(100,100,255,0.3)';
    } else {
      status.textContent = `☀️ Day Mode (${timeStr})`;
      status.style.background = 'rgba(255,200,0,0.3)';
    }
  }
}

export function toggleAutoDarkMode() {
  const globals = getGlobals();
  globals.autoDarkModeEnabled = !globals.autoDarkModeEnabled;
  
  if (globals.autoDarkModeEnabled) {
    checkAndApplyDarkMode();
    console.log('🌙 Auto Dark Mode: ENABLED');
  } else {
    applyDarkMode(false);
    console.log('☀️ Auto Dark Mode: DISABLED');
  }
}

export function initializeDarkMode() {
  const isDark = determineDarkMode();
  applyDarkMode(isDark);
  
  // Setup dark mode toggle listener
  const toggle = document.getElementById('darkModeToggle');
  if (toggle) {
    toggle.addEventListener('change', toggleAutoDarkMode);
  }
  
  // Check every minute for time transitions
  setInterval(checkAndApplyDarkMode, 60000);
  
  return isDark;
}


