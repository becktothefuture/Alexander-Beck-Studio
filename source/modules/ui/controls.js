// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            UI CONTROLS WIRING                                ║
// ║      Wires sliders/selects to global state and systems (subset)             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate, populateColorSelect } from '../visual/colors.js';
import { autoSaveSettings } from '../utils/storage.js';

function bindSlider(id, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('input', () => onChange(el));
}

function setVal(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function setupControls() {
  const g = getGlobals();

  // Global size/softness
  bindSlider('sizeSliderGlobal', (el) => {
    g.sizeScale = parseFloat(el.value);
    setVal('sizeValGlobal', g.sizeScale.toFixed(2));
    // Update current balls to new base size
    const base = (g.R_MIN_BASE + g.R_MAX_BASE) / 2;
    g.R_MIN = base * g.sizeScale * 0.75;
    g.R_MAX = base * g.sizeScale * 1.25;
    const newSize = (g.R_MIN + g.R_MAX) / 2;
    for (let i = 0; i < g.balls.length; i++) {
      g.balls[i].r = newSize; g.balls[i].rBase = newSize;
    }
    autoSaveSettings();
  });
  bindSlider('ballSoftnessSliderGlobal', (el) => {
    g.ballSoftness = parseInt(el.value, 10);
    setVal('ballSoftnessValGlobal', String(g.ballSoftness));
    autoSaveSettings();
  });

  // Ball Pit physics sliders
  bindSlider('gravityPitSlider', (el) => {
    g.gravityMultiplierPit = parseFloat(el.value);
    setVal('gravityPitVal', g.gravityMultiplierPit.toFixed(2));
    if (g.currentMode === 'pit') g.G = g.GE * g.gravityMultiplierPit;
    autoSaveSettings();
  });
  bindSlider('weightPitSlider', (el) => {
    g.ballMassKg = parseFloat(el.value);
    setVal('weightPitVal', g.ballMassKg.toFixed(0));
    for (let i = 0; i < g.balls.length; i++) g.balls[i].m = g.ballMassKg;
    autoSaveSettings();
  });
  bindSlider('restitutionSlider', (el) => {
    g.REST = parseFloat(el.value);
    setVal('restitutionVal', g.REST.toFixed(2));
    autoSaveSettings();
  });
  bindSlider('frictionSlider', (el) => {
    g.FRICTION = parseFloat(el.value);
    setVal('frictionVal', g.FRICTION.toFixed(4));
    autoSaveSettings();
  });

  // Repeller
  const repellerEnabledPit = document.getElementById('repellerEnabledPit');
  if (repellerEnabledPit) {
    repellerEnabledPit.addEventListener('change', () => {
      g.repellerEnabled = !!repellerEnabledPit.checked;
      autoSaveSettings();
    });
  }
  bindSlider('repelSizeSlider', (el) => {
    g.repelRadius = parseFloat(el.value);
    setVal('repelSizeVal', g.repelRadius.toFixed(0));
    autoSaveSettings();
  });
  bindSlider('repelPowerSlider', (el) => {
    const sliderPos = parseFloat(el.value);
    // Map slider [0..10000] to exponential power range
    const s = Math.max(0, Math.min(10000, sliderPos)) / 10000;
    const power = Math.pow(2, (s - 0.5) * 12) * 12000 * 2.0; // approx mapping
    g.repelPower = power;
    setVal('repelPowerVal', Math.round(g.repelPower).toString());
    autoSaveSettings();
  });
  bindSlider('repelSoftSlider', (el) => {
    g.repelSoft = parseFloat(el.value);
    setVal('repelSoftVal', g.repelSoft.toFixed(1));
    autoSaveSettings();
  });

  // Flies sliders
  bindSlider('attractPowerSlider', (el) => {
    g.attractionPower = parseFloat(el.value);
    setVal('attractPowerVal', Math.round(g.attractionPower).toString());
  });
  bindSlider('swarmSpeedSlider', (el) => {
    g.swarmSpeed = parseFloat(el.value);
    setVal('swarmSpeedVal', g.swarmSpeed.toFixed(1));
  });

  // Color template select
  populateColorSelect();
  const colorSelect = document.getElementById('colorSelect');
  if (colorSelect) {
    colorSelect.addEventListener('change', () => {
      applyColorTemplate(colorSelect.value);
      autoSaveSettings();
    });
  }

  // Color pickers update CSS vars directly (palette edits)
  for (let i = 1; i <= 8; i++) {
    const picker = document.getElementById(`color${i}`);
    const display = document.getElementById(`color${i}Val`);
    if (!picker) continue;
    picker.addEventListener('input', () => {
      const hex = picker.value;
      if (display) display.textContent = hex.toUpperCase();
      const idx = i - 1;
      if (g.currentColors && g.currentColors[idx]) g.currentColors[idx] = hex;
      document.documentElement.style.setProperty(`--ball-${i}`, hex);
    });
  }
}



