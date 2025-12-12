// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                            UI CONTROLS WIRING                                ║
// ║      Wires sliders/selects to global state and systems (subset)             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate, populateColorSelect } from '../visual/colors.js';
import { autoSaveSettings } from '../utils/storage.js';
import { setMode, MODES } from '../modes/mode-controller.js';
import { resize } from '../rendering/renderer.js';
import { applyFramePaddingCSSVars, applyVisualCSSVars } from '../../main.js';

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

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE BUTTONS - Critical for panel mode switching
  // ═══════════════════════════════════════════════════════════════════════════
  const modeButtons = document.querySelectorAll('.mode-button');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const mode = btn.getAttribute('data-mode');
      console.log('Mode button clicked:', mode);
      setMode(mode);
      updateModeButtonsUI(mode);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GLOBAL SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // TWO-LEVEL PADDING CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Container border: outer frame (insets container from viewport)
  bindSlider('containerBorderSlider', (el) => {
    g.containerBorder = parseInt(el.value, 10);
    setVal('containerBorderVal', String(g.containerBorder));
    applyFramePaddingCSSVars();
    resize();
    autoSaveSettings();
  });
  
  // Simulation padding: inner padding (canvas inset from container)
  bindSlider('simulationPaddingSlider', (el) => {
    g.simulationPadding = parseInt(el.value, 10);
    setVal('simulationPaddingVal', String(g.simulationPadding));
    applyFramePaddingCSSVars();
    resize();
    autoSaveSettings();
  });
  
  // Border/Chrome color picker
  const chromeBgPicker = document.getElementById('chromeBgColorPicker');
  if (chromeBgPicker) {
    chromeBgPicker.addEventListener('input', (e) => {
      const color = e.target.value;
      document.documentElement.style.setProperty('--chrome-bg', color);
      document.documentElement.style.setProperty('--chrome-bg-light', color);
      document.documentElement.style.setProperty('--chrome-bg-dark', color);
      g.chromeBgColor = color;
      autoSaveSettings();
    });
  }
  
  // Reset border color to browser default (Canvas system color)
  const chromeBgResetBtn = document.getElementById('chromeBgResetBtn');
  if (chromeBgResetBtn) {
    chromeBgResetBtn.addEventListener('click', () => {
      document.documentElement.style.setProperty('--chrome-bg', 'Canvas');
      document.documentElement.style.setProperty('--chrome-bg-light', 'Canvas');
      document.documentElement.style.setProperty('--chrome-bg-dark', 'Canvas');
      g.chromeBgColor = null; // null means use browser default
      if (chromeBgPicker) {
        // Get the computed Canvas color and update the picker
        const computed = getComputedStyle(document.body).backgroundColor;
        // Convert RGB to hex for the color picker
        const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (match) {
          const hex = '#' + [match[1], match[2], match[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
          chromeBgPicker.value = hex;
        }
      }
      autoSaveSettings();
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL EFFECTS CONTROLS (Noise & Vignette)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Noise texture sizing
  bindSlider('noiseSizeBaseSlider', (el) => {
    const config = { noiseSizeBase: parseInt(el.value, 10) };
    setVal('noiseSizeBaseVal', String(config.noiseSizeBase));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  bindSlider('noiseSizeTopSlider', (el) => {
    const config = { noiseSizeTop: parseInt(el.value, 10) };
    setVal('noiseSizeTopVal', String(config.noiseSizeTop));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  // Noise opacity
  bindSlider('noiseBackOpacitySlider', (el) => {
    const config = { noiseBackOpacity: parseFloat(el.value) };
    setVal('noiseBackOpacityVal', config.noiseBackOpacity.toFixed(3));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  bindSlider('noiseFrontOpacitySlider', (el) => {
    const config = { noiseFrontOpacity: parseFloat(el.value) };
    setVal('noiseFrontOpacityVal', config.noiseFrontOpacity.toFixed(3));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  // Vignette intensity
  bindSlider('vignetteLightIntensitySlider', (el) => {
    const config = { vignetteLightIntensity: parseFloat(el.value) };
    setVal('vignetteLightIntensityVal', config.vignetteLightIntensity.toFixed(2));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  bindSlider('vignetteDarkIntensitySlider', (el) => {
    const config = { vignetteDarkIntensity: parseFloat(el.value) };
    setVal('vignetteDarkIntensityVal', config.vignetteDarkIntensity.toFixed(2));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  // Vignette blur layers (organic depth)
  bindSlider('vignetteBlurOuterSlider', (el) => {
    const config = { vignetteBlurOuter: parseInt(el.value, 10) };
    setVal('vignetteBlurOuterVal', String(config.vignetteBlurOuter));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  bindSlider('vignetteBlurMidSlider', (el) => {
    const config = { vignetteBlurMid: parseInt(el.value, 10) };
    setVal('vignetteBlurMidVal', String(config.vignetteBlurMid));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  bindSlider('vignetteBlurInnerSlider', (el) => {
    const config = { vignetteBlurInner: parseInt(el.value, 10) };
    setVal('vignetteBlurInnerVal', String(config.vignetteBlurInner));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  // Vignette spread and animation
  bindSlider('vignetteSpreadSlider', (el) => {
    const config = { vignetteSpread: parseInt(el.value, 10) };
    setVal('vignetteSpreadVal', String(config.vignetteSpread));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });
  
  bindSlider('vignetteTransitionSlider', (el) => {
    const config = { vignetteTransition: parseInt(el.value, 10) };
    setVal('vignetteTransitionVal', String(config.vignetteTransition));
    applyVisualCSSVars(config);
    autoSaveSettings();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BALL PIT MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════════════════════
  // FLIES MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('fliesBallCountSlider', (el) => {
    g.fliesBallCount = parseInt(el.value, 10);
    setVal('fliesBallCountVal', String(g.fliesBallCount));
    if (g.currentMode === 'flies') {
      import('../modes/flies.js').then(({ initializeFlies }) => {
        initializeFlies();
      });
    }
  });
  bindSlider('attractPowerSlider', (el) => {
    g.attractionPower = parseFloat(el.value);
    setVal('attractPowerVal', Math.round(g.attractionPower).toString());
  });
  bindSlider('swarmSpeedSlider', (el) => {
    g.swarmSpeed = parseFloat(el.value);
    setVal('swarmSpeedVal', g.swarmSpeed.toFixed(1));
  });
  bindSlider('fliesSeparationSlider', (el) => {
    g.fliesSeparation = parseFloat(el.value);
    setVal('fliesSeparationVal', Math.round(g.fliesSeparation).toString());
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ZERO-G MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('weightlessCountSlider', (el) => {
    g.weightlessBallCount = parseInt(el.value, 10);
    setVal('weightlessCountVal', String(g.weightlessBallCount));
    if (g.currentMode === 'weightless') {
      import('../modes/weightless.js').then(({ initializeWeightless }) => {
        initializeWeightless();
      });
    }
  });
  bindSlider('weightlessSpeedSlider', (el) => {
    g.weightlessInitialSpeed = parseFloat(el.value);
    setVal('weightlessSpeedVal', g.weightlessInitialSpeed.toFixed(0));
    if (g.currentMode === 'weightless') {
      import('../modes/weightless.js').then(({ initializeWeightless }) => {
        initializeWeightless();
      });
    }
  });
  bindSlider('weightlessBounceSlider', (el) => {
    g.weightlessBounce = parseFloat(el.value);
    setVal('weightlessBounceVal', g.weightlessBounce.toFixed(2));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WATER MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('waterBallCountSlider', (el) => {
    g.waterBallCount = parseInt(el.value, 10);
    setVal('waterBallCountVal', String(g.waterBallCount));
    if (g.currentMode === 'water') {
      import('../modes/water.js').then(({ initializeWater }) => {
        initializeWater();
      });
    }
    autoSaveSettings();
  });
  bindSlider('waterRippleStrengthSlider', (el) => {
    g.waterRippleStrength = parseFloat(el.value);
    setVal('waterRippleStrengthVal', g.waterRippleStrength.toFixed(0));
    autoSaveSettings();
  });
  bindSlider('waterMotionSlider', (el) => {
    const intensity = parseFloat(el.value);
    g.waterDriftStrength = intensity;
    g.waterInitialVelocity = intensity * 5;
    setVal('waterMotionVal', intensity.toFixed(0));
    if (g.currentMode === 'water') {
      import('../modes/water.js').then(({ initializeWater }) => {
        initializeWater();
      });
    }
    autoSaveSettings();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VORTEX MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('vortexBallCountSlider', (el) => {
    g.vortexBallCount = parseInt(el.value, 10);
    setVal('vortexBallCountVal', String(g.vortexBallCount));
    if (g.currentMode === 'vortex') {
      import('../modes/vortex.js').then(({ initializeVortex }) => {
        initializeVortex();
      });
    }
  });
  bindSlider('vortexSwirlSlider', (el) => {
    g.vortexSwirlStrength = parseFloat(el.value);
    setVal('vortexSwirlVal', g.vortexSwirlStrength.toFixed(0));
  });
  bindSlider('vortexPullSlider', (el) => {
    g.vortexRadialPull = parseFloat(el.value);
    setVal('vortexPullVal', g.vortexRadialPull.toFixed(0));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PING PONG MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('pingPongBallCountSlider', (el) => {
    g.pingPongBallCount = parseInt(el.value, 10);
    setVal('pingPongBallCountVal', String(g.pingPongBallCount));
    if (g.currentMode === 'ping-pong') {
      import('../modes/ping-pong.js').then(({ initializePingPong }) => {
        initializePingPong();
      });
    }
  });
  bindSlider('pingPongSpeedSlider', (el) => {
    g.pingPongSpeed = parseFloat(el.value);
    setVal('pingPongSpeedVal', g.pingPongSpeed.toFixed(0));
    if (g.currentMode === 'ping-pong') {
      import('../modes/ping-pong.js').then(({ initializePingPong }) => {
        initializePingPong();
      });
    }
  });
  bindSlider('pingPongCursorSlider', (el) => {
    g.pingPongCursorRadius = parseFloat(el.value);
    setVal('pingPongCursorVal', g.pingPongCursorRadius.toFixed(0));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAGNETIC MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('magneticBallCountSlider', (el) => {
    g.magneticBallCount = parseInt(el.value, 10);
    setVal('magneticBallCountVal', String(g.magneticBallCount));
    if (g.currentMode === 'magnetic') {
      import('../modes/magnetic.js').then(({ initializeMagnetic }) => {
        initializeMagnetic();
      });
    }
  });
  bindSlider('magneticStrengthSlider', (el) => {
    g.magneticStrength = parseFloat(el.value);
    setVal('magneticStrengthVal', g.magneticStrength.toFixed(0));
  });
  bindSlider('magneticVelocitySlider', (el) => {
    g.magneticMaxVelocity = parseFloat(el.value);
    setVal('magneticVelocityVal', g.magneticMaxVelocity.toFixed(0));
  });
  bindSlider('magneticIntervalSlider', (el) => {
    g.magneticExplosionInterval = parseInt(el.value, 10);
    setVal('magneticIntervalVal', String(g.magneticExplosionInterval));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BUBBLES MODE CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  bindSlider('bubblesRateSlider', (el) => {
    g.bubblesSpawnRate = parseInt(el.value, 10);
    setVal('bubblesRateVal', String(g.bubblesSpawnRate));
  });
  bindSlider('bubblesSpeedSlider', (el) => {
    g.bubblesRiseSpeed = parseFloat(el.value);
    setVal('bubblesSpeedVal', g.bubblesRiseSpeed.toFixed(0));
  });
  bindSlider('bubblesWobbleSlider', (el) => {
    g.bubblesWobble = parseFloat(el.value);
    setVal('bubblesWobbleVal', g.bubblesWobble.toFixed(0));
  });
  bindSlider('bubblesMaxSlider', (el) => {
    g.bubblesMaxCount = parseInt(el.value, 10);
    setVal('bubblesMaxVal', String(g.bubblesMaxCount));
  });
  bindSlider('bubblesDeflectSlider', (el) => {
    g.bubblesDeflectRadius = parseFloat(el.value);
    setVal('bubblesDeflectVal', g.bubblesDeflectRadius.toFixed(0));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COLOR TEMPLATE SELECT
  // ═══════════════════════════════════════════════════════════════════════════
  populateColorSelect();
  const colorSelect = document.getElementById('colorSelect');
  if (colorSelect) {
    colorSelect.addEventListener('change', () => {
      applyColorTemplate(colorSelect.value);
      autoSaveSettings();
    });
  }
}

/**
 * Update mode button UI to reflect active mode
 */
export function updateModeButtonsUI(activeMode) {
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
  
  // Update announcer for accessibility
  const announcer = document.getElementById('announcer');
  if (announcer) {
    const modeNames = {
      'pit': 'Ball Pit',
      'flies': 'Flies to Light', 
      'weightless': 'Zero-G',
      'water': 'Water Swimming',
      'vortex': 'Vortex Sheets',
      'ping-pong': 'Ping Pong',
      'magnetic': 'Magnetic',
      'bubbles': 'Carbonated Bubbles'
    };
    announcer.textContent = `Switched to ${modeNames[activeMode] || activeMode} mode`;
  }
  }
