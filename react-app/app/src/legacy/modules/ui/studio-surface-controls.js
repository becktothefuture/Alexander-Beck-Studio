import {
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  getGlobals,
} from '../core/state.js';

export const DEFAULT_STUDIO_SURFACE_CONFIG = {
  edgeStrength: 0.06,
  edgeWidth: 0.5,
  fillOpacity: 0.018,
  glowOpacity: 0.18,
  sceneHighlight: 0.3,
  lightFilmOpacity: 0.18,
  contrastVeilOpacityLight: 0.216,
  contrastVeilOpacityDark: 0.348,
  contrastVeilReachX: 25,
  contrastVeilReachY: 25,
  contrastVeilBlurVmax: 7,
  contrastVeilDitherOpacity: 0.035,
  contrastVeilDitherSize: 96,
  scriptMaxWidth: 431,
  scriptPaddingX: 0,
  scriptPaddingY: 0,
  quoteButtonSize: 224,
  quotePaddingX: 28,
  quotePaddingY: 24,
  edgeCaptionDistanceMin: 8,
  edgeCaptionDistanceMax: 48,
  wallThicknessVw: 4,
  frameBorderWidth: 20,
};

const SURFACE_CONTROL_SECTIONS = [
  {
    key: 'surfaceSystem',
    title: 'Universal Surface',
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
    key: 'sceneLight',
    title: 'Scene Light',
    icon: '🫧',
    defaultOpen: false,
    controls: [
      { id: 'sceneHighlight', label: 'Highlight', min: 0, max: 0.6, step: 0.01, unit: '' },
      {
        id: 'lightFilmOpacity',
        label: 'Light Film',
        min: 0,
        max: 0.4,
        step: 0.01,
        unit: '',
        format: value => `${Math.round(value * 100)}%`,
      },
    ],
  },
];

const SHELL_OBJECT_CONTROL_SECTIONS = [
  {
    key: 'shellLayout',
    title: 'Shell Layout',
    icon: '📐',
    defaultOpen: true,
    controls: [
      { id: 'wallThicknessVw', label: 'Outer Wall Size', min: 0.5, max: 12, step: 0.1, unit: 'vw' },
      { id: 'frameBorderWidth', label: 'Wall thickness', min: 0, max: 20, step: 1, unit: 'px' },
    ],
  },
  {
    key: 'quoteSystem',
    title: 'Shell Elements',
    icon: '💬',
    defaultOpen: false,
    controls: [
      { id: 'scriptMaxWidth', label: 'Script Width', min: 240, max: 520, step: 4, unit: 'px' },
      { id: 'scriptPaddingX', label: 'Script Pad X', min: 0, max: 32, step: 1, unit: 'px' },
      { id: 'scriptPaddingY', label: 'Script Pad Y', min: 0, max: 24, step: 1, unit: 'px' },
      { id: 'edgeCaptionDistanceMin', label: 'Caption Near', min: 0, max: 24, step: 1, unit: 'px' },
      { id: 'edgeCaptionDistanceMax', label: 'Caption Far', min: 24, max: 80, step: 1, unit: 'px' },
    ],
  },
  {
    key: 'puck',
    title: 'Quote Puck',
    icon: '🔘',
    defaultOpen: true,
    prependHTML: '', // Injected by panel-dock (puck color controls)
    controls: [
      { id: 'quoteButtonSize', label: 'Size', min: 120, max: 400, step: 4, unit: 'px' },
      { id: 'quotePaddingX', label: 'Pad X', min: 8, max: 48, step: 1, unit: 'px' },
      { id: 'quotePaddingY', label: 'Pad Y', min: 6, max: 40, step: 1, unit: 'px' },
    ],
  },
];

const ALL_CONTROL_SECTIONS = [
  ...SURFACE_CONTROL_SECTIONS,
  ...SHELL_OBJECT_CONTROL_SECTIONS,
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

  return {
    edgeStrength: readNumber(rootStyle, '--abs-surface-edge-opacity', readNumber(rootStyle, '--quote-glass-edge-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.edgeStrength)),
    edgeWidth: readNumber(rootStyle, '--abs-surface-edge-width', readNumber(rootStyle, '--hover-edge-width', DEFAULT_STUDIO_SURFACE_CONFIG.edgeWidth)),
    fillOpacity: readNumber(rootStyle, '--abs-surface-fill-opacity', readNumber(rootStyle, '--quote-glass-fill-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.fillOpacity)),
    glowOpacity: readNumber(rootStyle, '--abs-surface-glow-opacity', readNumber(rootStyle, '--quote-glass-shadow-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.glowOpacity)),
    sceneHighlight: readNumber(rootStyle, '--abs-scene-highlight', readNumber(rootStyle, '--inner-wall-top-light-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.sceneHighlight)),
    lightFilmOpacity: readNumber(rootStyle, '--studio-light-film-opacity', DEFAULT_STUDIO_SURFACE_CONFIG.lightFilmOpacity),
    contrastVeilOpacityLight: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilOpacityLight;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilOpacityLight;
    })(),
    contrastVeilOpacityDark: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilOpacityDark;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilOpacityDark;
    })(),
    contrastVeilReachX: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilReachX;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilReachX;
    })(),
    contrastVeilReachY: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilReachY;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilReachY;
    })(),
    contrastVeilBlurVmax: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilBlurVmax;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilBlurVmax;
    })(),
    contrastVeilDitherOpacity: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilDitherOpacity;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilDitherOpacity;
    })(),
    contrastVeilDitherSize: (() => {
      const g = getGlobals();
      const v = g?.simulationContrastVeilDitherSize;
      return Number.isFinite(v) ? v : DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilDitherSize;
    })(),
    scriptMaxWidth: readNumber(rootStyle, '--decorative-script-max-width', DEFAULT_STUDIO_SURFACE_CONFIG.scriptMaxWidth),
    scriptPaddingX: readNumber(rootStyle, '--decorative-script-padding-left', DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingX),
    scriptPaddingY: readNumber(rootStyle, '--decorative-script-padding-vertical', DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingY),
    quoteButtonSize: readNumber(rootStyle, '--abs-quote-button-size', DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize),
    quotePaddingX: readNumber(rootStyle, '--abs-quote-pad-x', DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingX),
    quotePaddingY: readNumber(rootStyle, '--abs-quote-pad-y', DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingY),
    edgeCaptionDistanceMin: readNumber(rootStyle, '--edge-caption-distance-min', DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin),
    edgeCaptionDistanceMax: readNumber(rootStyle, '--edge-caption-distance-max', DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax),
    wallThicknessVw: (() => {
      const g = getGlobals();
      const v = g?.wallThicknessVw;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.wallThicknessVw;
    })(),
    frameBorderWidth: (() => {
      const g = getGlobals();
      const v = g?.frameBorderWidth;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameBorderWidth;
    })(),
  };
}

function formatValue(control, value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (typeof control.format === 'function') return control.format(numeric);
  if (!control.unit) return numeric.toFixed(control.step < 0.01 ? 3 : 2).replace(/\.00$/, '');
  return `${numeric.toFixed(control.step < 1 ? 1 : 0).replace(/\.0$/, '')}${control.unit}`;
}

function syncStudioRuntimeState(config) {
  try {
    const globals = getGlobals();
    if (!globals || typeof globals !== 'object') return;

    globals.hoverEdgeEnabled = config.edgeStrength > 0;
    globals.hoverEdgeWidth = config.edgeWidth;
    globals.hoverEdgeBottomEnabled = config.edgeStrength > 0;
    globals.hoverEdgeBottomOpacity = Number((config.edgeStrength * 0.78).toFixed(3));
    globals.hoverEdgeTopEnabled = config.edgeStrength > 0;
    globals.hoverEdgeTopOpacity = Number((config.edgeStrength * 0.46).toFixed(3));
    globals.frameBorderGradientEdgeOpacity = Number((config.sceneHighlight * 0.029).toFixed(3));
    globals.frameBorderGradientMidOpacity = Number((config.sceneHighlight * 0.058).toFixed(3));
    globals.studioLightFilmOpacity = config.lightFilmOpacity;
    if (Number.isFinite(config.contrastVeilOpacityLight)) globals.simulationContrastVeilOpacityLight = config.contrastVeilOpacityLight;
    if (Number.isFinite(config.contrastVeilOpacityDark)) globals.simulationContrastVeilOpacityDark = config.contrastVeilOpacityDark;
    if (Number.isFinite(config.contrastVeilReachX)) globals.simulationContrastVeilReachX = config.contrastVeilReachX;
    if (Number.isFinite(config.contrastVeilReachY)) globals.simulationContrastVeilReachY = config.contrastVeilReachY;
    if (Number.isFinite(config.contrastVeilBlurVmax)) globals.simulationContrastVeilBlurVmax = config.contrastVeilBlurVmax;
    if (Number.isFinite(config.contrastVeilDitherOpacity)) globals.simulationContrastVeilDitherOpacity = config.contrastVeilDitherOpacity;
    if (Number.isFinite(config.contrastVeilDitherSize)) globals.simulationContrastVeilDitherSize = config.contrastVeilDitherSize;
    globals.innerWallTopLightOpacityLight = Number(config.sceneHighlight.toFixed(3));
    globals.innerWallTopLightOpacityDark = Number(Math.min(0.82, config.sceneHighlight * 1.33).toFixed(3));
    globals.edgeCaptionDistanceMinPx = Math.round(config.edgeCaptionDistanceMin);
    globals.edgeCaptionDistanceMaxPx = Math.round(config.edgeCaptionDistanceMax);

    applyLayoutCSSVars();
  } catch (e) {}
}

export function applyStudioSurfaceConfig(config) {
  const root = document.documentElement;
  const edgeStrength = clamp(config.edgeStrength, 0, 0.45, DEFAULT_STUDIO_SURFACE_CONFIG.edgeStrength);
  const edgeWidth = clamp(config.edgeWidth, 0, 2.5, DEFAULT_STUDIO_SURFACE_CONFIG.edgeWidth);
  const fillOpacity = clamp(config.fillOpacity, 0, 0.12, DEFAULT_STUDIO_SURFACE_CONFIG.fillOpacity);
  const glowOpacity = clamp(config.glowOpacity, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.glowOpacity);
  const sceneHighlight = clamp(config.sceneHighlight, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.sceneHighlight);
  const lightFilmOpacity = clamp(config.lightFilmOpacity, 0, 0.4, DEFAULT_STUDIO_SURFACE_CONFIG.lightFilmOpacity);
  const contrastVeilOpacityLight = clamp(config.contrastVeilOpacityLight, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilOpacityLight);
  const contrastVeilOpacityDark = clamp(config.contrastVeilOpacityDark, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilOpacityDark);
  const contrastVeilReachX = clamp(config.contrastVeilReachX, 0, 50, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilReachX);
  const contrastVeilReachY = clamp(config.contrastVeilReachY, 0, 50, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilReachY);
  const contrastVeilBlurVmax = clamp(config.contrastVeilBlurVmax, 2, 16, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilBlurVmax);
  const contrastVeilDitherOpacity = clamp(config.contrastVeilDitherOpacity, 0, 0.12, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilDitherOpacity);
  const contrastVeilDitherSize = clamp(config.contrastVeilDitherSize, 24, 240, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilDitherSize);
  const scriptMaxWidth = clamp(config.scriptMaxWidth, 240, 520, DEFAULT_STUDIO_SURFACE_CONFIG.scriptMaxWidth);
  const scriptPaddingX = clamp(config.scriptPaddingX, 0, 32, DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingX);
  const scriptPaddingY = clamp(config.scriptPaddingY, 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingY);
  const quoteButtonSize = clamp(config.quoteButtonSize, 120, 400, DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize);
  const quotePaddingX = clamp(config.quotePaddingX, 8, 48, DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingX);
  const quotePaddingY = clamp(config.quotePaddingY, 6, 40, DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingY);
  const edgeCaptionDistanceMin = clamp(config.edgeCaptionDistanceMin, 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin);
  const edgeCaptionDistanceMax = clamp(config.edgeCaptionDistanceMax, 24, 80, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax);
  const wallThicknessVw = clamp(config.wallThicknessVw, 0.5, 12, DEFAULT_STUDIO_SURFACE_CONFIG.wallThicknessVw);
  const frameBorderWidth = Math.round(clamp(config.frameBorderWidth, 0, 20, DEFAULT_STUDIO_SURFACE_CONFIG.frameBorderWidth));

  // Sync surface config into state first so applyLayoutCSSVars() (e.g. hover-edge vars) uses current values.
  syncStudioRuntimeState({
    edgeStrength,
    edgeWidth,
    sceneHighlight,
    lightFilmOpacity,
    contrastVeilOpacityLight,
    contrastVeilOpacityDark,
    contrastVeilReachX,
    contrastVeilReachY,
    contrastVeilBlurVmax,
    contrastVeilDitherOpacity,
    contrastVeilDitherSize,
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
  });

  const studioSurfaceSnapshot = {
    edgeStrength,
    edgeWidth,
    fillOpacity,
    glowOpacity,
    sceneHighlight,
    lightFilmOpacity,
    contrastVeilOpacityLight,
    contrastVeilOpacityDark,
    contrastVeilReachX,
    contrastVeilReachY,
    contrastVeilBlurVmax,
    contrastVeilDitherOpacity,
    contrastVeilDitherSize,
    scriptMaxWidth,
    scriptPaddingX,
    scriptPaddingY,
    quoteButtonSize,
    quotePaddingX,
    quotePaddingY,
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
    wallThicknessVw,
    frameBorderWidth,
  };
  window.__ABS_STUDIO_SURFACE_CONFIG__ = studioSurfaceSnapshot;

  const g = getGlobals();
  if (g) {
    if (Number.isFinite(wallThicknessVw)) g.wallThicknessVw = wallThicknessVw;
    if (Number.isFinite(frameBorderWidth) && frameBorderWidth >= 0) g.frameBorderWidth = frameBorderWidth;
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
  }

  root.style.setProperty('--abs-surface-edge-opacity', `${edgeStrength}`);
  root.style.setProperty('--abs-surface-edge-width', `${edgeWidth}px`);
  root.style.setProperty('--abs-surface-fill-opacity', `${fillOpacity}`);
  root.style.setProperty('--abs-surface-glow-opacity', `${glowOpacity}`);
  root.style.setProperty('--abs-surface-shadow-opacity', `${glowOpacity}`);

  root.style.setProperty('--quote-glass-edge-opacity', `${edgeStrength}`);
  root.style.setProperty('--quote-glass-inner-shadow-opacity', `${Math.max(0, edgeStrength * 0.25)}`);
  root.style.setProperty('--quote-glass-fill-opacity', `${fillOpacity}`);
  root.style.setProperty('--quote-glass-shadow-opacity', `${glowOpacity}`);
  root.style.setProperty('--quote-glass-bottom-edge-opacity', `${Math.max(0, edgeStrength * 0.12)}`);

  root.style.setProperty('--hover-edge-enabled', edgeStrength > 0 ? '1' : '0');
  root.style.setProperty('--hover-edge-width', `${edgeWidth}px`);
  root.style.setProperty('--hover-edge-bottom-opacity', `${Math.max(0, edgeStrength * 0.78)}`);
  root.style.setProperty('--hover-edge-top-opacity', `${Math.max(0, edgeStrength * 0.46)}`);

  root.style.setProperty('--abs-scene-highlight', `${sceneHighlight}`);
  root.style.setProperty('--studio-light-film-opacity', `${lightFilmOpacity}`);
  root.style.setProperty('--frame-border-gradient-edge-opacity', `${Math.max(0, sceneHighlight * 0.029)}`);
  root.style.setProperty('--frame-border-gradient-mid-opacity', `${Math.max(0, sceneHighlight * 0.058)}`);
  root.style.setProperty('--simulation-contrast-veil-opacity', `${document.body.classList.contains('dark-mode') ? contrastVeilOpacityDark : contrastVeilOpacityLight}`);
  root.style.setProperty('--simulation-contrast-veil-reach-x', `${contrastVeilReachX}vw`);
  root.style.setProperty('--simulation-contrast-veil-reach-y', `${contrastVeilReachY}vh`);
  root.style.setProperty('--simulation-contrast-veil-blur-vmax', `${contrastVeilBlurVmax}`);
  root.style.setProperty('--simulation-contrast-veil-blur', `clamp(42px, ${contrastVeilBlurVmax}vmax, 120px)`);
  root.style.setProperty('--simulation-contrast-veil-dither-opacity', `${contrastVeilDitherOpacity}`);
  root.style.setProperty('--simulation-contrast-veil-dither-size', `${contrastVeilDitherSize}px`);
  root.style.setProperty('--inner-wall-top-light-opacity', `${sceneHighlight}`);
  root.style.setProperty('--inner-wall-top-light-opacity-dark', `${Math.min(0.82, sceneHighlight * 1.33)}`);
  root.style.setProperty('--decorative-script-max-width', `${scriptMaxWidth}px`);
  root.style.setProperty('--decorative-script-padding-left', `${scriptPaddingX}px`);
  root.style.setProperty('--decorative-script-padding-vertical', `${scriptPaddingY}px`);
  root.style.setProperty('--abs-quote-button-size', `${quoteButtonSize}px`);
  root.style.setProperty('--abs-quote-pad-x', `${quotePaddingX}px`);
  root.style.setProperty('--abs-quote-pad-y', `${quotePaddingY}px`);
  root.style.setProperty('--edge-caption-distance-min', `${edgeCaptionDistanceMin}px`);
  root.style.setProperty('--edge-caption-distance-max', `${edgeCaptionDistanceMax}px`);

  syncStudioRuntimeState({
    edgeStrength,
    edgeWidth,
    sceneHighlight,
    contrastVeilOpacityLight,
    contrastVeilOpacityDark,
    contrastVeilReachX,
    contrastVeilReachY,
    contrastVeilBlurVmax,
    contrastVeilDitherOpacity,
    contrastVeilDitherSize,
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
  });
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

function generateSectionSetHTML(sections, options = {}) {
  const config = readCurrentConfig();

  return sections.map((section) => {
    const controlsHTML = section.controls
      .map((control) => generateControlHTML(control, config[control.id] ?? DEFAULT_STUDIO_SURFACE_CONFIG[control.id]))
      .join('');
    const prependHTML = section.key === 'puck' ? (options.puckPrependHTML || section.prependHTML || '') : (section.prependHTML || '');
    const openAttr = section.defaultOpen ? 'open' : '';
    return `
      <details class="panel-section-accordion" data-studio-surface-section="${section.key}" ${openAttr}>
        <summary class="panel-section-header">
          <span class="section-icon">${section.icon}</span>
          <span class="section-label">${section.title}</span>
        </summary>
        <div class="panel-section-content">
          ${prependHTML}
          ${controlsHTML}
        </div>
      </details>
    `;
  }).join('');
}

function getShellObjectSections(options = {}) {
  const sectionKeys = Array.isArray(options.sectionKeys) ? options.sectionKeys : null;
  if (!sectionKeys || sectionKeys.length === 0) return SHELL_OBJECT_CONTROL_SECTIONS;
  return SHELL_OBJECT_CONTROL_SECTIONS.filter((section) => sectionKeys.includes(section.key));
}

export function generateStudioSurfaceControlsHTML() {
  return generateSectionSetHTML(SURFACE_CONTROL_SECTIONS);
}

export function generateStudioShellControlsHTML(options = {}) {
  return generateSectionSetHTML(getShellObjectSections(options), options);
}

export function bindStudioSurfaceControls(options = {}) {
  const uiDocument = options.uiDocument || document;
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...readCurrentConfig(),
    ...(window.__ABS_STUDIO_SURFACE_CONFIG__ || {}),
  };

  for (const section of ALL_CONTROL_SECTIONS) {
    for (const control of section.controls) {
      const input = uiDocument.getElementById(`studioSurface_${control.id}Slider`);
      const output = uiDocument.getElementById(`studioSurface_${control.id}Val`);
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
    layout: { ...(baseShell?.layout || {}) },
    surface: { ...(baseShell?.surface || {}) },
  };

  nextShell.surface.edgeWidth = `${config.edgeWidth}px`;
  nextShell.surface.fillOpacityLight = config.fillOpacity;
  nextShell.surface.fillOpacityDark = Math.max(config.fillOpacity, Number((config.fillOpacity * 1.4).toFixed(3)));
  nextShell.surface.edgeOpacityLight = config.edgeStrength;
  nextShell.surface.edgeOpacityDark = Math.max(config.edgeStrength, Number((config.edgeStrength * 1.4).toFixed(3)));
  nextShell.surface.innerShadowOpacityLight = Number((config.edgeStrength * 0.25).toFixed(3));
  nextShell.surface.innerShadowOpacityDark = Number((config.edgeStrength * 0.38).toFixed(3));
  nextShell.surface.shadowOpacityLight = Number((config.glowOpacity * 0.58).toFixed(3));
  nextShell.surface.shadowOpacityDark = config.glowOpacity;
  nextShell.surface.glowOpacityLight = Number((config.glowOpacity * 0.58).toFixed(3));
  nextShell.surface.glowOpacityDark = config.glowOpacity;
  nextShell.surface.lightEdgeInset = `${config.edgeWidth}px`;
  nextShell.surface.lightEdgeTopOpacityLight = Number((config.edgeStrength * 0.46).toFixed(3));
  nextShell.surface.lightEdgeTopOpacityDark = Number((config.edgeStrength * 0.58).toFixed(3));
  nextShell.surface.lightEdgeBottomOpacityLight = Number((config.edgeStrength * 0.12).toFixed(3));
  nextShell.surface.lightEdgeBottomOpacityDark = Number((config.edgeStrength * 0.2).toFixed(3));

  nextShell.surface.sceneHighlight = config.sceneHighlight;
  nextShell.surface.lightFilmOpacity = config.lightFilmOpacity;
  nextShell.surface.contrastVeilOpacityLight = config.contrastVeilOpacityLight;
  nextShell.surface.contrastVeilOpacityDark = config.contrastVeilOpacityDark;
  nextShell.surface.contrastVeilReachX = config.contrastVeilReachX;
  nextShell.surface.contrastVeilReachY = config.contrastVeilReachY;
  nextShell.surface.contrastVeilBlurVmax = config.contrastVeilBlurVmax;
  nextShell.surface.contrastVeilDitherOpacity = config.contrastVeilDitherOpacity;
  nextShell.surface.contrastVeilDitherSize = config.contrastVeilDitherSize;
  nextShell.theme.frameBorderEdgeOpacity = Number((config.sceneHighlight * 0.029).toFixed(3));
  nextShell.theme.frameBorderMidOpacity = Number((config.sceneHighlight * 0.058).toFixed(3));
  nextShell.layout.decorativeScriptMaxWidth = `${Math.round(config.scriptMaxWidth)}px`;
  nextShell.layout.decorativeScriptPaddingX = `${Math.round(config.scriptPaddingX)}px`;
  nextShell.layout.decorativeScriptPaddingY = `${Math.round(config.scriptPaddingY)}px`;
  nextShell.layout.quoteButtonSize = `${Math.round(config.quoteButtonSize ?? DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize)}px`;
  nextShell.layout.quotePaddingX = `${Math.round(config.quotePaddingX)}px`;
  nextShell.layout.quotePaddingY = `${Math.round(config.quotePaddingY)}px`;
  nextShell.layout.edgeCaptionDistanceMin = `${Math.round(config.edgeCaptionDistanceMin)}px`;
  nextShell.layout.edgeCaptionDistanceMax = `${Math.round(config.edgeCaptionDistanceMax)}px`;
  delete nextShell.layout.quoteMaxWidth;
  delete nextShell.surface.quoteButtonFillOpacity;
  nextShell.motion = { ...(baseShell?.motion || {}) };
  delete nextShell.motion.puckRestitution;
  delete nextShell.motion.puckFriction;
  delete nextShell.motion.puckWallInset;
  delete nextShell.motion.puckMaxSpeed;
  delete nextShell.motion.puckSpinGain;
  delete nextShell.motion.puckSpinFriction;
  delete nextShell.motion.puckWallSquash;
  delete nextShell.motion.puckSoundIntensity;

  return nextShell;
}

export function buildStudioRuntimePatch(snapshot, baseRuntime = {}) {
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...(snapshot || {}),
  };

  const nextRuntime = {
    ...(baseRuntime || {}),
  };

  nextRuntime.hoverEdgeEnabled = config.edgeStrength > 0;
  nextRuntime.hoverEdgeWidth = config.edgeWidth;
  nextRuntime.hoverEdgeBottomEnabled = config.edgeStrength > 0;
  nextRuntime.hoverEdgeBottomOpacity = Number((config.edgeStrength * 0.78).toFixed(3));
  nextRuntime.hoverEdgeTopEnabled = config.edgeStrength > 0;
  nextRuntime.hoverEdgeTopOpacity = Number((config.edgeStrength * 0.46).toFixed(3));
  nextRuntime.frameBorderGradientEdgeOpacity = Number((config.sceneHighlight * 0.029).toFixed(3));
  nextRuntime.frameBorderGradientMidOpacity = Number((config.sceneHighlight * 0.058).toFixed(3));
  nextRuntime.simulationContrastVeilOpacityLight = config.contrastVeilOpacityLight;
  nextRuntime.simulationContrastVeilOpacityDark = config.contrastVeilOpacityDark;
  nextRuntime.simulationContrastVeilReachX = config.contrastVeilReachX;
  nextRuntime.simulationContrastVeilReachY = config.contrastVeilReachY;
  nextRuntime.simulationContrastVeilBlurVmax = config.contrastVeilBlurVmax;
  nextRuntime.simulationContrastVeilDitherOpacity = config.contrastVeilDitherOpacity;
  nextRuntime.simulationContrastVeilDitherSize = config.contrastVeilDitherSize;
  nextRuntime.edgeCaptionDistanceMinPx = Math.round(config.edgeCaptionDistanceMin);
  nextRuntime.edgeCaptionDistanceMaxPx = Math.round(config.edgeCaptionDistanceMax);

  return nextRuntime;
}
