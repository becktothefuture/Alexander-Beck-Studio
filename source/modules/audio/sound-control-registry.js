// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SOUND CONTROL REGISTRY                                   ║
// ║        Centralized definition of all sound panel controls                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Sound Control Registry
 * 
 * Each control defines:
 * - id: matches CONFIG key in sound-engine.js
 * - label: display label
 * - min/max/step: slider range
 * - format: function to format display value
 * - toConfig: function to convert slider value to CONFIG value
 * - fromConfig: function to convert CONFIG value to slider value
 * - group: optional grouping
 */

export const SOUND_CONTROLS = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // CORE (most important for quick tweaking)
  // ═══════════════════════════════════════════════════════════════════════════════
  core: {
    title: 'Core',
    controls: [
      {
        id: 'masterGain',
        label: 'Master Volume',
        min: 10, max: 100, step: 1,
        format: v => `${Math.round(v)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
      {
        id: 'collisionMinImpact',
        label: 'Silence Threshold',
        min: 0, max: 30, step: 1,
        format: v => `${Math.round(v)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENVELOPE (attack/decay shape)
  // ═══════════════════════════════════════════════════════════════════════════════
  envelope: {
    title: 'Envelope',
    controls: [
      {
        id: 'decayTime',
        label: 'Click Length',
        min: 20, max: 180, step: 1,
        format: v => `${Math.round(v)}ms`,
        toConfig: v => v / 1000,
        fromConfig: v => v * 1000,
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // TONE (filter/harmonic character)
  // ═══════════════════════════════════════════════════════════════════════════════
  tone: {
    title: 'Tone',
    controls: [
      {
        id: 'filterBaseFreq',
        label: 'Brightness',
        min: 300, max: 6000, step: 50,
        format: v => `${Math.round(v)}Hz`,
        toConfig: v => v,
        fromConfig: v => v,
      },
      {
        id: 'harmonicGain',
        label: 'Warmth',
        min: 0, max: 50, step: 1,
        format: v => `${Math.round(v)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
      {
        id: 'filterQ',
        label: 'Resonance',
        min: 10, max: 200, step: 5,
        format: v => `${(v / 100).toFixed(2)}`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // SPACE (reverb)
  // ═══════════════════════════════════════════════════════════════════════════════
  space: {
    title: 'Space',
    controls: [
      {
        id: 'reverbWetMix',
        label: 'Reverb Mix',
        min: 0, max: 50, step: 1,
        format: v => `${Math.round(v)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
      {
        id: 'reverbDecay',
        label: 'Room Size',
        min: 5, max: 80, step: 1,
        format: v => `${(v / 100).toFixed(2)}s`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // DYNAMICS (gain limits)
  // ═══════════════════════════════════════════════════════════════════════════════
  dynamics: {
    title: 'Dynamics',
    controls: [
      {
        id: 'minGain',
        label: 'Min Hit Volume',
        min: 0, max: 20, step: 1,
        format: v => `${Math.round(v)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
      {
        id: 'maxGain',
        label: 'Max Hit Volume',
        min: 5, max: 50, step: 1,
        format: v => `${Math.round(v)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // ROLLING (surface friction)
  // ═══════════════════════════════════════════════════════════════════════════════
  rolling: {
    title: 'Surface Texture',
    controls: [
      {
        id: 'rollingGain',
        label: 'Texture Volume',
        min: 0, max: 8, step: 0.1,
        format: v => `${v.toFixed(1)}%`,
        toConfig: v => v / 100,
        fromConfig: v => v * 100,
      },
      {
        id: 'rollingFreq',
        label: 'Texture Pitch',
        min: 50, max: 300, step: 10,
        format: v => `${Math.round(v)}Hz`,
        toConfig: v => v,
        fromConfig: v => v,
      },
    ]
  },
};

/**
 * Generate HTML for all sound controls
 */
export function generateSoundControlsHTML() {
  let html = '';
  
  for (const [sectionKey, section] of Object.entries(SOUND_CONTROLS)) {
    html += `<div class="sound-dock__section">`;
    html += `<div class="sound-dock__section-title">${section.title}</div>`;
    html += `<div class="sound-dock__group">`;
    
    for (const control of section.controls) {
      html += `
        <label class="sound-dock__row">
          <span class="sound-dock__label">${control.label}</span>
          <input type="range" 
            id="sound_${control.id}" 
            class="sound-dock__slider" 
            min="${control.min}" 
            max="${control.max}" 
            step="${control.step}">
          <span class="sound-dock__val" id="sound_${control.id}_val">${control.format(control.fromConfig(0))}</span>
        </label>`;
    }
    
    html += `</div></div>`;
  }
  
  return html;
}

/**
 * Bind all sound controls to the sound engine
 */
export function bindSoundControls(panel, getSoundConfig, updateSoundConfig) {
  for (const section of Object.values(SOUND_CONTROLS)) {
    for (const control of section.controls) {
      const slider = panel.querySelector(`#sound_${control.id}`);
      const valDisplay = panel.querySelector(`#sound_${control.id}_val`);
      
      if (!slider) continue;
      
      slider.addEventListener('input', () => {
        const rawValue = parseFloat(slider.value);
        const configValue = control.toConfig(rawValue);
        
        if (valDisplay) {
          valDisplay.textContent = control.format(rawValue);
        }
        
        updateSoundConfig({ [control.id]: configValue });
      });
    }
  }
}

/**
 * Sync all sound sliders to current config
 */
export function syncSoundControlsToConfig(panel, getSoundConfig) {
  const config = getSoundConfig();
  
  for (const section of Object.values(SOUND_CONTROLS)) {
    for (const control of section.controls) {
      const slider = panel.querySelector(`#sound_${control.id}`);
      const valDisplay = panel.querySelector(`#sound_${control.id}_val`);
      
      if (!slider || config[control.id] === undefined) continue;
      
      const sliderValue = control.fromConfig(config[control.id]);
      slider.value = sliderValue;
      
      if (valDisplay) {
        valDisplay.textContent = control.format(sliderValue);
      }
    }
  }
}

