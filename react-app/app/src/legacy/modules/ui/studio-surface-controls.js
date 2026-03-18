export const DEFAULT_STUDIO_SURFACE_CONFIG = {
  edgeStrength: 0.16,
  edgeWidth: 0.5,
  fillOpacity: 0.02,
  glowOpacity: 0.27,
  wallEdgeStrength: 0.18,
  wallAmbientStrength: 0.12,
  wallSoftness: 0.45,
};

const CONTROL_SECTIONS = [
  {
    key: 'surfaceSystem',
    title: 'Surface System',
    icon: '✨',
    defaultOpen: true,
    controls: [
      { id: 'edgeStrength', label: 'Light Edge', min: 0, max: 0.45, step: 0.01, unit: '' },
      { id: 'edgeWidth', label: 'Edge Width', min: 0, max: 2.5, step: 0.1, unit: 'px' },
      { id: 'fillOpacity', label: 'Glass Fill', min: 0, max: 0.12, step: 0.005, unit: '' },
      { id: 'glowOpacity', label: 'Glow', min: 0, max: 0.6, step: 0.01, unit: '' },
    ],
  },
  {
    key: 'wallAtmosphere',
    title: 'Wall Atmosphere',
    icon: '🫧',
    defaultOpen: false,
    controls: [
      { id: 'wallEdgeStrength', label: 'Edge Vignette', min: 0, max: 0.8, step: 0.01, unit: '' },
      { id: 'wallAmbientStrength', label: 'Ambient Vignette', min: 0, max: 0.6, step: 0.01, unit: '' },
      { id: 'wallSoftness', label: 'Softness', min: 0, max: 1, step: 0.01, unit: '' },
    ],
  },
];

function clamp(value, min, max, fallback) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readNumber(rootStyle, name, fallback) {
  try {
    const raw = rootStyle.getPropertyValue(name).trim();
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? numeric : fallback;
  } catch (e) {
    return fallback;
  }
}

function readCurrentConfig() {
  const rootStyle = getComputedStyle(document.documentElement);
  const wallEdgeStrength = readNumber(rootStyle, '--frame-vignette-edge-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.wallEdgeStrength);
  const wallAmbientStrength = readNumber(rootStyle, '--frame-vignette-ambient-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.wallAmbientStrength);
  const edgeBlur = readNumber(rootStyle, '--frame-vignette-edge-blur', 30);

  return {
    edgeStrength: readNumber(rootStyle, '--abs-surface-edge-opacity', readNumber(rootStyle, '--quote-glass-edge-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.edgeStrength)),
    edgeWidth: readNumber(rootStyle, '--abs-surface-edge-width', readNumber(rootStyle, '--hover-edge-width', DEFAULT_STUDIO_SURFACE_CONFIG.edgeWidth)),
    fillOpacity: readNumber(rootStyle, '--abs-surface-fill-opacity', readNumber(rootStyle, '--quote-glass-fill-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.fillOpacity)),
    glowOpacity: readNumber(rootStyle, '--abs-surface-glow-opacity', readNumber(rootStyle, '--quote-glass-shadow-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.glowOpacity)),
    wallEdgeStrength,
    wallAmbientStrength,
    wallSoftness: clamp((edgeBlur - 10) / 70, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.wallSoftness),
  };
}

function formatValue(control, value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (!control.unit) return numeric.toFixed(control.step < 0.01 ? 3 : 2).replace(/\.00$/, '');
  return `${numeric.toFixed(control.step < 1 ? 1 : 0).replace(/\.0$/, '')}${control.unit}`;
}

export function applyStudioSurfaceConfig(config) {
  const root = document.documentElement;
  const edgeStrength = clamp(config.edgeStrength, 0, 0.45, DEFAULT_STUDIO_SURFACE_CONFIG.edgeStrength);
  const edgeWidth = clamp(config.edgeWidth, 0, 2.5, DEFAULT_STUDIO_SURFACE_CONFIG.edgeWidth);
  const fillOpacity = clamp(config.fillOpacity, 0, 0.12, DEFAULT_STUDIO_SURFACE_CONFIG.fillOpacity);
  const glowOpacity = clamp(config.glowOpacity, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.glowOpacity);
  const wallEdgeStrength = clamp(config.wallEdgeStrength, 0, 0.8, DEFAULT_STUDIO_SURFACE_CONFIG.wallEdgeStrength);
  const wallAmbientStrength = clamp(config.wallAmbientStrength, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.wallAmbientStrength);
  const wallSoftness = clamp(config.wallSoftness, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.wallSoftness);

  root.style.setProperty('--abs-surface-edge-opacity', `${edgeStrength}`);
  root.style.setProperty('--abs-surface-edge-width', `${edgeWidth}px`);
  root.style.setProperty('--abs-surface-fill-opacity', `${fillOpacity}`);
  root.style.setProperty('--abs-surface-glow-opacity', `${glowOpacity}`);
  root.style.setProperty('--abs-surface-shadow-opacity', `${glowOpacity}`);

  root.style.setProperty('--quote-glass-edge-opacity', `${edgeStrength}`);
  root.style.setProperty('--quote-glass-inner-shadow-opacity', `${Math.max(0, edgeStrength * 0.45)}`);
  root.style.setProperty('--quote-glass-fill-opacity', `${fillOpacity}`);
  root.style.setProperty('--quote-glass-shadow-opacity', `${glowOpacity}`);
  root.style.setProperty('--quote-glass-bottom-edge-opacity', `${Math.max(0, edgeStrength * 0.28)}`);

  root.style.setProperty('--hover-edge-enabled', edgeStrength > 0 ? '1' : '0');
  root.style.setProperty('--hover-edge-width', `${edgeWidth}px`);
  root.style.setProperty('--hover-edge-bottom-opacity', `${Math.max(0, edgeStrength * 1.05)}`);
  root.style.setProperty('--hover-edge-top-opacity', `${Math.max(0, edgeStrength * 0.55)}`);

  root.style.setProperty('--frame-border-gradient-edge-opacity', `${Math.max(0, wallEdgeStrength * 0.18)}`);
  root.style.setProperty('--frame-border-gradient-mid-opacity', `${Math.max(0, wallEdgeStrength * 0.34)}`);
  root.style.setProperty('--frame-vignette-edge-opacity', `${wallEdgeStrength}`);
  root.style.setProperty('--frame-vignette-ambient-opacity', `${wallAmbientStrength}`);
  root.style.setProperty('--frame-vignette-edge-blur', `${Math.round(10 + (wallSoftness * 70))}px`);
  root.style.setProperty('--frame-vignette-ambient-blur', `${Math.round(80 + (wallSoftness * 260))}px`);

  window.__ABS_STUDIO_SURFACE_CONFIG__ = {
    edgeStrength,
    edgeWidth,
    fillOpacity,
    glowOpacity,
    wallEdgeStrength,
    wallAmbientStrength,
    wallSoftness,
  };
}

function generateControlHTML(control, value) {
  return `
    <label class="control-row" data-control-id="studioSurface.${control.id}">
      <div class="control-row-header">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="studioSurface_${control.id}Val">${formatValue(control, value)}</span>
      </div>
      <input
        type="range"
        id="studioSurface_${control.id}Slider"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${value}"
        aria-label="${control.label}"
      />
    </label>
  `;
}

export function generateStudioSurfaceControlsHTML() {
  const config = readCurrentConfig();

  return CONTROL_SECTIONS.map((section) => {
    const controlsHTML = section.controls
      .map((control) => generateControlHTML(control, config[control.id] ?? DEFAULT_STUDIO_SURFACE_CONFIG[control.id]))
      .join('');
    const openAttr = section.defaultOpen ? 'open' : '';
    return `
      <details class="panel-section-accordion" data-studio-surface-section="${section.key}" ${openAttr}>
        <summary class="panel-section-header">
          <span class="section-icon">${section.icon}</span>
          <span class="section-label">${section.title}</span>
        </summary>
        <div class="panel-section-content">
          ${controlsHTML}
        </div>
      </details>
    `;
  }).join('');
}

export function bindStudioSurfaceControls() {
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...readCurrentConfig(),
    ...(window.__ABS_STUDIO_SURFACE_CONFIG__ || {}),
  };

  for (const section of CONTROL_SECTIONS) {
    for (const control of section.controls) {
      const input = document.getElementById(`studioSurface_${control.id}Slider`);
      const output = document.getElementById(`studioSurface_${control.id}Val`);
      if (!input || input.dataset.boundStudioSurface === 'true') continue;

      input.dataset.boundStudioSurface = 'true';
      input.addEventListener('input', () => {
        config[control.id] = clamp(input.value, control.min, control.max, DEFAULT_STUDIO_SURFACE_CONFIG[control.id]);
        if (output) output.textContent = formatValue(control, config[control.id]);
        applyStudioSurfaceConfig(config);
      });
    }
  }

  applyStudioSurfaceConfig(config);
}

export function buildStudioSurfaceSnapshot() {
  return {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...readCurrentConfig(),
    ...(window.__ABS_STUDIO_SURFACE_CONFIG__ || {}),
  };
}

export function buildStudioShellPatch(snapshot, baseShell = {}) {
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...(snapshot || {}),
  };

  const nextShell = {
    ...(baseShell || {}),
    theme: { ...(baseShell?.theme || {}) },
    surface: { ...(baseShell?.surface || {}) },
  };

  nextShell.surface.edgeWidth = `${config.edgeWidth}px`;
  nextShell.surface.fillOpacityLight = config.fillOpacity;
  nextShell.surface.fillOpacityDark = Math.max(config.fillOpacity, Number((config.fillOpacity * 1.4).toFixed(3)));
  nextShell.surface.edgeOpacityLight = config.edgeStrength;
  nextShell.surface.edgeOpacityDark = Math.max(config.edgeStrength, Number((config.edgeStrength * 1.4).toFixed(3)));
  nextShell.surface.innerShadowOpacityLight = Number((config.edgeStrength * 0.45).toFixed(3));
  nextShell.surface.innerShadowOpacityDark = Number((config.edgeStrength * 0.65).toFixed(3));
  nextShell.surface.shadowOpacityLight = Number((config.glowOpacity * 0.58).toFixed(3));
  nextShell.surface.shadowOpacityDark = config.glowOpacity;
  nextShell.surface.glowOpacityLight = Number((config.glowOpacity * 0.58).toFixed(3));
  nextShell.surface.glowOpacityDark = config.glowOpacity;
  nextShell.surface.lightEdgeInset = `${config.edgeWidth}px`;
  nextShell.surface.lightEdgeTopOpacityLight = Number((config.edgeStrength * 0.55).toFixed(3));
  nextShell.surface.lightEdgeTopOpacityDark = Number((config.edgeStrength * 0.72).toFixed(3));
  nextShell.surface.lightEdgeBottomOpacityLight = Number((config.edgeStrength * 0.28).toFixed(3));
  nextShell.surface.lightEdgeBottomOpacityDark = Number((config.edgeStrength * 0.42).toFixed(3));

  nextShell.theme.frameBorderEdgeOpacity = Number((config.wallEdgeStrength * 0.18).toFixed(3));
  nextShell.theme.frameBorderMidOpacity = Number((config.wallEdgeStrength * 0.34).toFixed(3));
  nextShell.theme.frameVignetteEdgeOpacity = config.wallEdgeStrength;
  nextShell.theme.frameVignetteAmbientOpacity = config.wallAmbientStrength;
  nextShell.theme.frameVignetteEdgeBlur = `${Math.round(10 + (config.wallSoftness * 70))}px`;

  return nextShell;
}
