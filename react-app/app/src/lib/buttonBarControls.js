export const BUTTON_BAR_DEFAULTS = Object.freeze({
  buttonBarHeightPx: 45,
  buttonBarBottomInsetPx: 10.5,
  buttonBarWindowOverlapPx: 15.5,
  buttonBarGapPx: 5,
  buttonBarRouteGapPx: 4,
  buttonBarShellPaddingXPx: 0,
  buttonBarButtonHeightPx: 45,
  buttonBarButtonPaddingXPx: 8,
  buttonBarDesktopPaddingScale: 2,
  buttonBarButtonRadiusPx: 16,
  buttonBarFontSizeRem: 0.625,
  buttonBarDesktopFontScale: 1.6,
  buttonBarActiveInsetPx: 1,
  buttonBarActiveRadiusPx: 15,
  buttonBarActiveDepthPx: 3,
  buttonBarActiveSurfaceOpacity: 0.09,
  buttonBarActiveHighlightOpacity: 0.12,
  buttonBarActiveShadowOpacity: 0.55,
  buttonBarTransitionMs: 360,
});

const LEGACY_BUTTON_BAR_KEYS = Object.freeze({
  buttonBarHeightPx: 'shellBottomBandHeightPx',
  buttonBarBottomInsetPx: 'buttonBarInsetPx',
  buttonBarGapPx: 'shellTabGapPx',
  buttonBarButtonHeightPx: 'shellTabHeightPx',
  buttonBarButtonPaddingXPx: 'shellTabPaddingXPx',
  buttonBarButtonRadiusPx: 'shellTabRadiusPx',
  buttonBarFontSizeRem: 'shellTabFontSizeRem',
  buttonBarTransitionMs: 'shellTabTransitionMs',
});

export const BUTTON_BAR_CONTROL_GROUPS = Object.freeze([
  {
    title: 'Geometry',
    initiallyOpen: true,
    controls: [
      { id: 'buttonBarHeightPx', label: 'Capsule Height', type: 'range', min: 40, max: 56, step: 0.1, display: 'subpx' },
      { id: 'buttonBarBottomInsetPx', label: 'Bottom Inset', type: 'range', min: 0, max: 32, step: 0.5, display: 'subpx' },
      { id: 'buttonBarWindowOverlapPx', label: 'Window Overlap', type: 'range', min: 0, max: 32, step: 0.5, display: 'subpx' },
      { id: 'buttonBarGapPx', label: 'Group Gap', type: 'range', min: 0, max: 16, step: 0.5, display: 'subpx' },
      { id: 'buttonBarRouteGapPx', label: 'Route Gap', type: 'range', min: 0, max: 12, step: 0.5, display: 'subpx' },
      { id: 'buttonBarShellPaddingXPx', label: 'Capsule Pad', type: 'range', min: 0, max: 16, step: 0.5, display: 'subpx' },
      { id: 'buttonBarButtonHeightPx', label: 'Link Height', type: 'range', min: 40, max: 56, step: 0.1, display: 'subpx' },
      { id: 'buttonBarButtonPaddingXPx', label: 'Mobile Link Pad', type: 'range', min: 4, max: 16, step: 0.5, display: 'subpx' },
      { id: 'buttonBarDesktopPaddingScale', label: 'Desktop Pad Scale', type: 'range', min: 1, max: 2.5, step: 0.05, display: 'ratio' },
      { id: 'buttonBarButtonRadiusPx', label: 'Capsule Radius', type: 'range', min: 8, max: 24, step: 0.5, display: 'subpx' },
    ],
  },
  {
    title: 'Typography',
    initiallyOpen: true,
    controls: [
      { id: 'buttonBarFontSizeRem', label: 'Mobile Type Size', type: 'range', min: 0.5, max: 0.875, step: 0.005, display: 'rem' },
      { id: 'buttonBarDesktopFontScale', label: 'Desktop Type Scale', type: 'range', min: 1, max: 2, step: 0.05, display: 'ratio' },
    ],
  },
  {
    title: 'Active Key',
    initiallyOpen: true,
    controls: [
      { id: 'buttonBarActiveInsetPx', label: 'Key Inset', type: 'range', min: 0, max: 8, step: 0.25, display: 'subpx' },
      { id: 'buttonBarActiveRadiusPx', label: 'Key Radius', type: 'range', min: 8, max: 24, step: 0.5, display: 'subpx' },
      { id: 'buttonBarActiveDepthPx', label: 'Key Depth', type: 'range', min: 0, max: 8, step: 0.25, display: 'subpx' },
      { id: 'buttonBarActiveSurfaceOpacity', label: 'Key Surface', type: 'range', min: 0, max: 0.25, step: 0.005, display: 'percent' },
      { id: 'buttonBarActiveHighlightOpacity', label: 'Key Highlight', type: 'range', min: 0, max: 0.25, step: 0.005, display: 'percent' },
      { id: 'buttonBarActiveShadowOpacity', label: 'Key Shadow', type: 'range', min: 0, max: 0.8, step: 0.01, display: 'percent' },
    ],
  },
  {
    title: 'Motion',
    initiallyOpen: true,
    controls: [
      { id: 'buttonBarTransitionMs', label: 'Key Travel', type: 'range', min: 0, max: 800, step: 10, display: 'ms' },
    ],
  },
]);

export const BUTTON_BAR_CONTROLS = Object.freeze(
  BUTTON_BAR_CONTROL_GROUPS.flatMap((group) => group.controls),
);

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readControlValue(input, id) {
  if (Object.prototype.hasOwnProperty.call(input, id)) return input[id];
  const legacyId = LEGACY_BUTTON_BAR_KEYS[id];
  return legacyId && Object.prototype.hasOwnProperty.call(input, legacyId)
    ? input[legacyId]
    : undefined;
}

export function normalizeButtonBarConfig(source = {}) {
  const input = source && typeof source === 'object' ? source : {};
  return Object.fromEntries(
    BUTTON_BAR_CONTROLS.map((control) => {
      const fallback = BUTTON_BAR_DEFAULTS[control.id];
      const rawValue = readControlValue(input, control.id);
      return [control.id, clampNumber(rawValue, control.min, control.max, fallback)];
    }),
  );
}

export function applyButtonBarCssVars(source = {}, root = null) {
  const targetRoot = root || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!targetRoot?.style) return;
  const config = normalizeButtonBarConfig(source);

  targetRoot.style.setProperty('--button-bar-height', `${config.buttonBarHeightPx}px`);
  targetRoot.style.setProperty('--button-bar-bottom-inset', `${config.buttonBarBottomInsetPx}px`);
  targetRoot.style.setProperty('--button-bar-window-overlap', `${config.buttonBarWindowOverlapPx}px`);
  targetRoot.style.setProperty('--button-bar-gap', `${config.buttonBarGapPx}px`);
  targetRoot.style.setProperty('--button-bar-route-gap', `${config.buttonBarRouteGapPx}px`);
  targetRoot.style.setProperty('--button-bar-shell-padding-x', `${config.buttonBarShellPaddingXPx}px`);
  targetRoot.style.setProperty('--button-bar-button-height', `${config.buttonBarButtonHeightPx}px`);
  targetRoot.style.setProperty('--button-bar-button-padding-x', `${config.buttonBarButtonPaddingXPx}px`);
  targetRoot.style.setProperty('--button-bar-desktop-padding-scale', String(config.buttonBarDesktopPaddingScale));
  targetRoot.style.setProperty('--button-bar-button-radius', `${config.buttonBarButtonRadiusPx}px`);
  targetRoot.style.setProperty('--button-bar-font-size', `${config.buttonBarFontSizeRem * 16}px`);
  targetRoot.style.setProperty('--button-bar-desktop-font-scale', String(config.buttonBarDesktopFontScale));
  targetRoot.style.setProperty('--button-bar-active-inset', `${config.buttonBarActiveInsetPx}px`);
  targetRoot.style.setProperty('--button-bar-active-radius', `${config.buttonBarActiveRadiusPx}px`);
  targetRoot.style.setProperty('--button-bar-active-depth', `${config.buttonBarActiveDepthPx}px`);
  targetRoot.style.setProperty('--button-bar-active-depth-blur', `${(config.buttonBarActiveDepthPx * 2) + 2}px`);
  targetRoot.style.setProperty('--button-bar-active-surface-opacity', String(config.buttonBarActiveSurfaceOpacity));
  targetRoot.style.setProperty('--button-bar-active-highlight-opacity', String(config.buttonBarActiveHighlightOpacity));
  targetRoot.style.setProperty('--button-bar-active-shadow-opacity', String(config.buttonBarActiveShadowOpacity));
  targetRoot.style.setProperty('--button-bar-transition-ms', `${config.buttonBarTransitionMs}ms`);
  targetRoot.style.setProperty(
    '--button-bar-frame-reserve',
    'calc(var(--button-bar-height) - var(--button-bar-window-overlap) + var(--button-bar-bottom-inset))',
  );
  targetRoot.style.setProperty(
    '--button-bar-content-clearance',
    'calc(var(--button-bar-window-overlap) + 8px)',
  );

  targetRoot.style.setProperty('--button-bar-responsive-height', 'var(--button-bar-frame-reserve)');
  targetRoot.style.setProperty('--shell-bottom-band-height', 'var(--button-bar-frame-reserve)');
  targetRoot.style.setProperty('--shell-bottom-tabs-gap', 'var(--button-bar-bottom-inset)');
  targetRoot.style.setProperty('--shell-bottom-tabs-padding-y', '0px');
  targetRoot.style.setProperty('--shell-tab-gap', 'var(--button-bar-gap)');
  targetRoot.style.setProperty('--shell-tab-height', 'var(--button-bar-button-height)');
  targetRoot.style.setProperty('--shell-tab-padding-x', 'var(--button-bar-button-padding-x)');
  targetRoot.style.setProperty('--shell-tab-radius', 'var(--button-bar-button-radius)');
  targetRoot.style.setProperty('--shell-tab-font-size', 'var(--button-bar-font-size)');
  targetRoot.style.setProperty('--shell-tab-transition-ms', 'var(--button-bar-transition-ms)');
}

export function formatButtonBarControlValue(value, control) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (control.display === 'px') return `${Math.round(numeric)}px`;
  if (control.display === 'subpx') return `${Number(numeric.toFixed(2))}px`;
  if (control.display === 'ms') return `${Math.round(numeric)}ms`;
  if (control.display === 'rem') return `${numeric.toFixed(3)}rem`;
  if (control.display === 'ratio') return numeric.toFixed(2);
  if (control.display === 'percent') return `${Number((numeric * 100).toFixed(1))}%`;
  return String(numeric);
}

export function resolveButtonBarControlPatch(control, rawValue) {
  if (!control) return {};
  return {
    [control.id]: clampNumber(rawValue, control.min, control.max, BUTTON_BAR_DEFAULTS[control.id]),
  };
}
