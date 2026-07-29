import {
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  getGlobals,
} from '../core/state.js';
import { applyShellLayoutVars, patchShellLayout } from '../visual/site-shell.js';
import { resize } from '../rendering/renderer.js';

export const DEFAULT_STUDIO_SURFACE_CONFIG = {
  scriptMaxWidth: 431,
  scriptPaddingX: 0,
  scriptPaddingY: 0,
  quoteButtonSize: 224,
  quotePaddingX: 28,
  quotePaddingY: 24,
  routeTitleDescriptionGap: 16,
  edgeCaptionDistanceMin: 8,
  edgeCaptionDistanceMax: 48,
  frameInsetMobilePx: 10,
  frameInsetDesktopPx: 16,
  frameRadiusMobilePx: 32,
  frameRadiusDesktopPx: 72,
};

const SHELL_OBJECT_CONTROL_SECTIONS = [
  {
    key: 'frame',
    title: 'Wall Shape',
    icon: '📐',
    defaultOpen: true,
    controls: [
      { id: 'frameInsetMobilePx', label: 'Mobile Size', min: 4, max: 32, step: 1, unit: 'px' },
      { id: 'frameInsetDesktopPx', label: 'Desktop Size', min: 8, max: 48, step: 1, unit: 'px' },
      { id: 'frameRadiusMobilePx', label: 'Mobile Radius', min: 16, max: 64, step: 1, unit: 'px' },
      { id: 'frameRadiusDesktopPx', label: 'Desktop Radius', min: 32, max: 120, step: 1, unit: 'px' },
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
      { id: 'routeTitleDescriptionGap', label: 'Title / Copy Gap', min: 4, max: 40, step: 1, unit: 'px' },
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

const ALL_CONTROL_SECTIONS = SHELL_OBJECT_CONTROL_SECTIONS;

const OBSOLETE_SURFACE_KEYS = [
  'sceneHighlight',
  'contrastVeilOpacityLight',
  'contrastVeilOpacityDark',
  'contrastVeilReachX',
  'contrastVeilReachY',
  'contrastVeilBlurVmax',
  'contrastVeilDitherOpacity',
  'contrastVeilDitherSize',
  'edgeWidth',
  'fillOpacityLight',
  'fillOpacityDark',
  'edgeOpacityLight',
  'edgeOpacityDark',
  'innerShadowOpacityLight',
  'innerShadowOpacityDark',
  'shadowOpacityLight',
  'shadowOpacityDark',
  'glowOpacityLight',
  'glowOpacityDark',
  'lightEdgeInset',
  'lightEdgeBlur',
  'lightEdgeTopOpacityLight',
  'lightEdgeTopOpacityDark',
  'lightEdgeBottomOpacityLight',
  'lightEdgeBottomOpacityDark',
];

const OBSOLETE_THEME_KEYS = [
  'frameBorderEdgeOpacity',
  'frameBorderMidOpacity',
];

const OBSOLETE_RUNTIME_KEYS = [
  'hoverEdgeEnabled',
  'hoverEdgeWidth',
  'hoverEdgeBottomEnabled',
  'hoverEdgeBottomOpacity',
  'hoverEdgeTopEnabled',
  'hoverEdgeTopOpacity',
  'frameBorderGradientEdgeOpacity',
  'frameBorderGradientMidOpacity',
  'innerWallGradientEdgeTopOpacity',
  'innerWallGradientEdgeTopShadowOpacity',
  'innerWallGradientEdgeWidth',
  'simulationContrastVeilOpacityLight',
  'simulationContrastVeilOpacityDark',
  'simulationContrastVeilReachX',
  'simulationContrastVeilReachY',
  'simulationContrastVeilBlurVmax',
  'simulationContrastVeilDitherOpacity',
  'simulationContrastVeilDitherSize',
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
    scriptMaxWidth: readNumber(rootStyle, '--decorative-script-max-width', DEFAULT_STUDIO_SURFACE_CONFIG.scriptMaxWidth),
    scriptPaddingX: readNumber(rootStyle, '--decorative-script-padding-left', DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingX),
    scriptPaddingY: readNumber(rootStyle, '--decorative-script-padding-vertical', DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingY),
    quoteButtonSize: readNumber(rootStyle, '--abs-quote-button-size', DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize),
    quotePaddingX: readNumber(rootStyle, '--abs-quote-pad-x', DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingX),
    quotePaddingY: readNumber(rootStyle, '--abs-quote-pad-y', DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingY),
    routeTitleDescriptionGap: readNumber(rootStyle, '--route-title-description-gap', DEFAULT_STUDIO_SURFACE_CONFIG.routeTitleDescriptionGap),
    edgeCaptionDistanceMin: readNumber(rootStyle, '--edge-caption-distance-min', DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin),
    edgeCaptionDistanceMax: readNumber(rootStyle, '--edge-caption-distance-max', DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax),
    frameInsetMobilePx: (() => {
      const g = getGlobals();
      const v = g?.frameInsetMobilePx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameInsetMobilePx;
    })(),
    frameInsetDesktopPx: (() => {
      const g = getGlobals();
      const v = g?.frameInsetDesktopPx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameInsetDesktopPx;
    })(),
    frameRadiusMobilePx: (() => {
      const g = getGlobals();
      const v = g?.frameRadiusMobilePx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameRadiusMobilePx;
    })(),
    frameRadiusDesktopPx: (() => {
      const g = getGlobals();
      const v = g?.frameRadiusDesktopPx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameRadiusDesktopPx;
    })(),
  };
}

function normalizeResponsiveEndpoints(config, {
  mobileId,
  desktopId,
  mobileMin,
  mobileMax,
  desktopMin,
  desktopMax,
  changedId = null,
}) {
  let mobile = Math.round(clamp(config[mobileId], mobileMin, mobileMax, DEFAULT_STUDIO_SURFACE_CONFIG[mobileId]));
  let desktop = Math.round(clamp(config[desktopId], desktopMin, desktopMax, DEFAULT_STUDIO_SURFACE_CONFIG[desktopId]));

  if (mobile > desktop) {
    if (changedId === mobileId) mobile = desktop;
    else desktop = mobile;
  }

  config[mobileId] = mobile;
  config[desktopId] = desktop;
  return { mobile, desktop };
}

function normalizeFrameInsetEndpoints(config, changedId = null) {
  return normalizeResponsiveEndpoints(config, {
    mobileId: 'frameInsetMobilePx',
    desktopId: 'frameInsetDesktopPx',
    mobileMin: 4,
    mobileMax: 32,
    desktopMin: 8,
    desktopMax: 48,
    changedId,
  });
}

function normalizeFrameRadiusEndpoints(config, changedId = null) {
  return normalizeResponsiveEndpoints(config, {
    mobileId: 'frameRadiusMobilePx',
    desktopId: 'frameRadiusDesktopPx',
    mobileMin: 16,
    mobileMax: 64,
    desktopMin: 32,
    desktopMax: 120,
    changedId,
  });
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

    globals.edgeCaptionDistanceMinPx = Math.round(config.edgeCaptionDistanceMin);
    globals.edgeCaptionDistanceMaxPx = Math.round(config.edgeCaptionDistanceMax);

    applyLayoutCSSVars();
  } catch (e) {}
}

export function applyStudioSurfaceConfig(config, { refreshGeometry = false } = {}) {
  const root = document.documentElement;
  const scriptMaxWidth = clamp(config.scriptMaxWidth, 240, 520, DEFAULT_STUDIO_SURFACE_CONFIG.scriptMaxWidth);
  const scriptPaddingX = clamp(config.scriptPaddingX, 0, 32, DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingX);
  const scriptPaddingY = clamp(config.scriptPaddingY, 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingY);
  const quoteButtonSize = clamp(config.quoteButtonSize, 120, 400, DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize);
  const quotePaddingX = clamp(config.quotePaddingX, 8, 48, DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingX);
  const quotePaddingY = clamp(config.quotePaddingY, 6, 40, DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingY);
  const routeTitleDescriptionGap = clamp(config.routeTitleDescriptionGap, 4, 40, DEFAULT_STUDIO_SURFACE_CONFIG.routeTitleDescriptionGap);
  const edgeCaptionDistanceMin = clamp(config.edgeCaptionDistanceMin, 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin);
  const edgeCaptionDistanceMax = clamp(config.edgeCaptionDistanceMax, 24, 80, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax);
  const frameInset = normalizeFrameInsetEndpoints(config);
  const frameRadius = normalizeFrameRadiusEndpoints(config);

  syncStudioRuntimeState({
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
  });

  const studioSurfaceSnapshot = {
    scriptMaxWidth,
    scriptPaddingX,
    scriptPaddingY,
    quoteButtonSize,
    quotePaddingX,
    quotePaddingY,
    routeTitleDescriptionGap,
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
    frameInsetMobilePx: frameInset.mobile,
    frameInsetDesktopPx: frameInset.desktop,
    frameRadiusMobilePx: frameRadius.mobile,
    frameRadiusDesktopPx: frameRadius.desktop,
  };
  window.__ABS_STUDIO_SURFACE_CONFIG__ = studioSurfaceSnapshot;

  const g = getGlobals();
  if (g) {
    g.frameInsetMobilePx = frameInset.mobile;
    g.frameInsetDesktopPx = frameInset.desktop;
    g.frameRadiusMobilePx = frameRadius.mobile;
    g.frameRadiusDesktopPx = frameRadius.desktop;
    patchShellLayout({
      frameInsetMobile: `${frameInset.mobile}px`,
      frameInsetDesktop: `${frameInset.desktop}px`,
      frameRadiusMobile: `${frameRadius.mobile}px`,
      frameRadiusDesktop: `${frameRadius.desktop}px`,
      routeTitleDescriptionGap: `${routeTitleDescriptionGap}px`,
    });
    applyShellLayoutVars();
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
    if (refreshGeometry) resize();
  }

  root.style.setProperty('--decorative-script-max-width', `${scriptMaxWidth}px`);
  root.style.setProperty('--decorative-script-padding-left', `${scriptPaddingX}px`);
  root.style.setProperty('--decorative-script-padding-vertical', `${scriptPaddingY}px`);
  root.style.setProperty('--abs-quote-button-size', `${quoteButtonSize}px`);
  root.style.setProperty('--abs-quote-pad-x', `${quotePaddingX}px`);
  root.style.setProperty('--abs-quote-pad-y', `${quotePaddingY}px`);
  root.style.setProperty('--route-title-description-gap', `${routeTitleDescriptionGap}px`);
  root.style.setProperty('--edge-caption-distance-min', `${edgeCaptionDistanceMin}px`);
  root.style.setProperty('--edge-caption-distance-max', `${edgeCaptionDistanceMax}px`);

  syncStudioRuntimeState({
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
        const endpointIds = control.id.startsWith('frameInset')
          ? ['frameInsetMobilePx', 'frameInsetDesktopPx']
          : control.id.startsWith('frameRadius')
            ? ['frameRadiusMobilePx', 'frameRadiusDesktopPx']
            : null;
        if (endpointIds) {
          if (control.id.startsWith('frameInset')) normalizeFrameInsetEndpoints(config, control.id);
          else normalizeFrameRadiusEndpoints(config, control.id);
          for (const endpointId of endpointIds) {
            const endpointControl = section.controls.find((candidate) => candidate.id === endpointId);
            const endpointInput = uiDocument.getElementById(`studioSurface_${endpointId}Slider`);
            const endpointOutput = uiDocument.getElementById(`studioSurface_${endpointId}Val`);
            if (endpointInput) endpointInput.value = String(config[endpointId]);
            if (endpointOutput && endpointControl) endpointOutput.textContent = formatValue(endpointControl, config[endpointId]);
          }
        } else if (output) {
          output.textContent = formatValue(control, config[control.id]);
        }
        applyStudioSurfaceConfig(config, { refreshGeometry: Boolean(endpointIds) });
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

  for (const key of OBSOLETE_SURFACE_KEYS) delete nextShell.surface[key];
  for (const key of OBSOLETE_THEME_KEYS) delete nextShell.theme[key];
  nextShell.layout.decorativeScriptMaxWidth = `${Math.round(config.scriptMaxWidth)}px`;
  nextShell.layout.decorativeScriptPaddingX = `${Math.round(config.scriptPaddingX)}px`;
  nextShell.layout.decorativeScriptPaddingY = `${Math.round(config.scriptPaddingY)}px`;
  nextShell.layout.quoteButtonSize = `${Math.round(config.quoteButtonSize ?? DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize)}px`;
  nextShell.layout.quotePaddingX = `${Math.round(config.quotePaddingX)}px`;
  nextShell.layout.quotePaddingY = `${Math.round(config.quotePaddingY)}px`;
  nextShell.layout.routeTitleDescriptionGap = `${Math.round(config.routeTitleDescriptionGap)}px`;
  nextShell.layout.edgeCaptionDistanceMin = `${Math.round(config.edgeCaptionDistanceMin)}px`;
  nextShell.layout.edgeCaptionDistanceMax = `${Math.round(config.edgeCaptionDistanceMax)}px`;
  const frameInset = normalizeFrameInsetEndpoints(config);
  nextShell.layout.frameInsetMobile = `${frameInset.mobile}px`;
  nextShell.layout.frameInsetDesktop = `${frameInset.desktop}px`;
  delete nextShell.layout.frameInsetTablet;
  const frameRadius = normalizeFrameRadiusEndpoints(config);
  nextShell.layout.frameRadiusMobile = `${frameRadius.mobile}px`;
  nextShell.layout.frameRadiusDesktop = `${frameRadius.desktop}px`;
  delete nextShell.layout.frameRadiusTablet;
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

  for (const key of OBSOLETE_RUNTIME_KEYS) delete nextRuntime[key];
  nextRuntime.edgeCaptionDistanceMinPx = Math.round(config.edgeCaptionDistanceMin);
  nextRuntime.edgeCaptionDistanceMaxPx = Math.round(config.edgeCaptionDistanceMax);

  return nextRuntime;
}
