// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      LOCALSTORAGE PERSISTENCE                                ║
// ║              Extracted from balls-source.html lines 1587-1748                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

const STORAGE_KEY = 'bouncyBallsSettings';
const SETTINGS_VERSION = 2;
const LOCALSTORAGE_ENABLED = false; // Disabled per config

export function saveSettings() {
  if (!LOCALSTORAGE_ENABLED) {
    console.log('⚠️ localStorage is disabled');
    return;
  }
  
  const globals = getGlobals();
  const settings = {
    version: SETTINGS_VERSION,
    currentMode: globals.currentMode,
    gravityMultiplierPit: globals.gravityMultiplierPit,
    sizeScale: globals.sizeScale,
    sizeVariation: globals.sizeVariation,
    ballMassKg: globals.ballMassKg,
    ballSoftness: globals.ballSoftness,
    restitution: globals.REST,
    friction: globals.FRICTION,
    repelPower: globals.repelPower,
    repelRadius: globals.repelRadius,
    repelSoft: globals.repelSoft,
    attractionPower: globals.attractionPower,
    swarmSpeed: globals.swarmSpeed,
    weightlessCount: globals.weightlessCount,
    weightlessInitialSpeed: globals.weightlessInitialSpeed,
    weightlessBounce: globals.weightlessBounce,
    weightlessRepelRadius: globals.weightlessRepelRadius,
    weightlessRepelPower: globals.weightlessRepelPower,
    weightlessRepelSoft: globals.weightlessRepelSoft,
    currentTemplate: globals.currentTemplate,
    autoDarkModeEnabled: globals.autoDarkModeEnabled
  };
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log('✓ Settings saved');
  } catch (e) {
    console.warn('Could not save settings:', e);
  }
}

export function loadSettings() {
  if (!LOCALSTORAGE_ENABLED) {
    console.log('⚠️ localStorage is disabled - using defaults');
    return false;
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      
      if (!settings.version || settings.version !== SETTINGS_VERSION) {
        console.log('🗑️ Clearing old localStorage (version mismatch)');
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      
      const globals = getGlobals();
      if (settings.gravityMultiplierPit !== undefined) globals.gravityMultiplierPit = settings.gravityMultiplierPit;
      if (settings.sizeScale !== undefined) globals.sizeScale = settings.sizeScale;
      if (settings.ballMassKg !== undefined) globals.ballMassKg = settings.ballMassKg;
      if (settings.restitution !== undefined) globals.REST = settings.restitution;
      if (settings.friction !== undefined) globals.FRICTION = settings.friction;
      if (settings.weightlessCount !== undefined) globals.weightlessCount = settings.weightlessCount;
      if (settings.weightlessInitialSpeed !== undefined) globals.weightlessInitialSpeed = settings.weightlessInitialSpeed;
      if (settings.weightlessBounce !== undefined) globals.weightlessBounce = settings.weightlessBounce;
      if (settings.weightlessRepelRadius !== undefined) globals.weightlessRepelRadius = settings.weightlessRepelRadius;
      if (settings.weightlessRepelPower !== undefined) globals.weightlessRepelPower = settings.weightlessRepelPower;
      if (settings.weightlessRepelSoft !== undefined) globals.weightlessRepelSoft = settings.weightlessRepelSoft;
      if (settings.currentTemplate) globals.currentTemplate = settings.currentTemplate;
      if (settings.autoDarkModeEnabled !== undefined) globals.autoDarkModeEnabled = settings.autoDarkModeEnabled;
      
      console.log('✓ Settings loaded');
      return true;
    }
  } catch (e) {
    console.warn('Could not load settings:', e);
  }
  return false;
}

export function autoSaveSettings() {
  clearTimeout(window.settingsSaveTimeout);
  window.settingsSaveTimeout = setTimeout(saveSettings, 500);
}


