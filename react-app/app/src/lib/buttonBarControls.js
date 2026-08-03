export const BUTTON_BAR_DEFAULTS = Object.freeze({
  buttonBarHeightPx: 56,
  buttonBarInsetPx: 6,
  buttonBarWidthPx: 2400,
  buttonBarMaxWidthPx: 2400,
  buttonBarGapPx: 16,
  buttonBarButtonHeightPx: 40.8,
  buttonBarButtonPaddingXPx: 16,
  buttonBarButtonRadiusPx: 14,
  buttonBarFontSizeRem: 1.032,
  buttonBarButtonBgWindowMixPct: 100,
  buttonBarButtonBgWhiteMixPct: 0,
  buttonBarButtonHoverWhiteMixPct: 2,
  buttonBarButtonActiveWindowMixPct: 100,
  buttonBarButtonActiveWhiteMixPct: 0,
  buttonBarIndicatorOpacity: 0.5,
  buttonBarShadowOpacity: 0.12,
  buttonBarGrooveLightOpacity: 0.12,
  buttonBarActiveGlowPx: 6,
  buttonBarActiveDropPx: 0,
  buttonBarTransitionMs: 140,
  buttonBarPressZTravelPx: 2,
});

const LEGACY_BUTTON_BAR_KEYS = Object.freeze({
  buttonBarHeightPx: 'shellBottomBandHeightPx',
  buttonBarInsetPx: 'shellBottomTabsGapPx',
  buttonBarWidthPx: 'shellTabNavWidthPx',
  buttonBarGapPx: 'shellTabGapPx',
  buttonBarButtonHeightPx: 'shellTabHeightPx',
  buttonBarButtonPaddingXPx: 'shellTabPaddingXPx',
  buttonBarButtonRadiusPx: 'shellTabRadiusPx',
  buttonBarFontSizeRem: 'shellTabFontSizeRem',
  buttonBarButtonBgWindowMixPct: 'shellTabBgWallMixPct',
  buttonBarButtonBgWhiteMixPct: 'shellTabBgWhiteMixPct',
  buttonBarButtonHoverWhiteMixPct: 'shellTabHoverWhiteMixPct',
  buttonBarButtonActiveWindowMixPct: 'shellTabActiveWallMixPct',
  buttonBarButtonActiveWhiteMixPct: 'shellTabActiveWhiteMixPct',
  buttonBarIndicatorOpacity: 'shellTabIndicatorOpacity',
  buttonBarShadowOpacity: 'shellTabShadowOpacity',
  buttonBarGrooveLightOpacity: 'shellTabGrooveLightOpacity',
  buttonBarActiveGlowPx: 'shellTabActiveGlowPx',
  buttonBarActiveDropPx: 'shellTabActiveDropPx',
  buttonBarTransitionMs: 'shellTabTransitionMs',
});

export const BUTTON_BAR_CONTROL_GROUPS = Object.freeze([
  {
    title: 'Layout',
    initiallyOpen: true,
    controls: [
      {
        id: 'buttonBarHeightPx',
        label: 'Bar Height',
        type: 'range',
        min: 56,
        max: 140,
        step: 0.1,
        display: 'px',
      },
      {
        id: 'buttonBarInsetPx',
        label: 'Bar Inset',
        type: 'range',
        min: 6,
        max: 32,
        step: 1,
        display: 'px',
      },
      {
        id: 'buttonBarWidthPx',
        label: 'Bar Width',
        type: 'range',
        min: 480,
        max: 2400,
        step: 10,
        display: 'px',
      },
      {
        id: 'buttonBarMaxWidthPx',
        label: 'Max Width',
        type: 'range',
        min: 620,
        max: 2400,
        step: 10,
        display: 'px',
      },
      {
        id: 'buttonBarGapPx',
        label: 'Button Gap',
        type: 'range',
        min: 4,
        max: 20,
        step: 1,
        display: 'px',
      },
      {
        id: 'buttonBarButtonHeightPx',
        label: 'Button Height',
        type: 'range',
        min: 36,
        max: 64,
        step: 0.1,
        display: 'px',
      },
      {
        id: 'buttonBarButtonPaddingXPx',
        label: 'Label Pad',
        type: 'range',
        min: 8,
        max: 26,
        step: 1,
        display: 'px',
      },
      {
        id: 'buttonBarButtonRadiusPx',
        label: 'Radius',
        type: 'range',
        min: 6,
        max: 24,
        step: 1,
        display: 'px',
      },
      {
        id: 'buttonBarFontSizeRem',
        label: 'Type Size',
        type: 'range',
        min: 0.72,
        max: 1.2,
        step: 0.01,
        display: 'rem',
      },
    ],
  },
  {
    title: 'Appearance',
    initiallyOpen: true,
    controls: [
      {
        id: 'buttonBarButtonBgWindowMixPct',
        label: 'Fill Window',
        type: 'range',
        min: 0,
        max: 98,
        step: 1,
        display: '%',
      },
      {
        id: 'buttonBarButtonBgWhiteMixPct',
        label: 'Fill Lift',
        type: 'range',
        min: 0,
        max: 100,
        step: 1,
        display: '%',
      },
      {
        id: 'buttonBarButtonHoverWhiteMixPct',
        label: 'Hover Lift',
        type: 'range',
        min: 0,
        max: 60,
        step: 1,
        display: '%',
      },
      {
        id: 'buttonBarButtonActiveWindowMixPct',
        label: 'Active Window',
        type: 'range',
        min: 0,
        max: 96,
        step: 1,
        display: '%',
      },
      {
        id: 'buttonBarButtonActiveWhiteMixPct',
        label: 'Active Lift',
        type: 'range',
        min: 0,
        max: 100,
        step: 1,
        display: '%',
      },
      {
        id: 'buttonBarIndicatorOpacity',
        label: 'Indicator',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'ratio',
      },
      {
        id: 'buttonBarShadowOpacity',
        label: 'Shadow',
        type: 'range',
        min: 0,
        max: 0.45,
        step: 0.01,
        display: 'ratio',
      },
      {
        id: 'buttonBarGrooveLightOpacity',
        label: 'Groove Light',
        type: 'range',
        min: 0,
        max: 0.3,
        step: 0.01,
        display: 'ratio',
      },
    ],
  },
  {
    title: 'Motion',
    initiallyOpen: true,
    controls: [
      {
        id: 'buttonBarPressZTravelPx',
        label: 'Press Travel',
        type: 'range',
        min: 0,
        max: 4,
        step: 0.25,
        display: 'px',
      },
      {
        id: 'buttonBarActiveGlowPx',
        label: 'Active Glow',
        type: 'range',
        min: 0,
        max: 32,
        step: 1,
        display: 'px',
      },
      {
        id: 'buttonBarActiveDropPx',
        label: 'Active Drop',
        type: 'range',
        min: 0,
        max: 4,
        step: 0.25,
        display: 'px',
      },
      {
        id: 'buttonBarTransitionMs',
        label: 'Timing',
        type: 'range',
        min: 0,
        max: 280,
        step: 10,
        display: 'ms',
      },
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
      const value = control.type === 'checkbox'
        ? (rawValue === undefined ? Boolean(fallback) : rawValue !== false && rawValue !== 'false' && rawValue !== 0 && rawValue !== '0')
        : clampNumber(rawValue, control.min, control.max, fallback);
      return [control.id, value];
    }),
  );
}

export function applyButtonBarCssVars(source = {}, root = null) {
  const targetRoot = root || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!targetRoot?.style) return;
  const config = normalizeButtonBarConfig(source);
  targetRoot.style.setProperty('--button-bar-height', `${config.buttonBarHeightPx}px`);
  targetRoot.style.setProperty('--button-bar-inset', `${config.buttonBarInsetPx}px`);
  targetRoot.style.setProperty('--button-bar-padding-y', `${config.buttonBarInsetPx}px`);
  targetRoot.style.setProperty('--button-bar-width', `${config.buttonBarWidthPx}px`);
  targetRoot.style.setProperty('--button-bar-max-width', `${config.buttonBarMaxWidthPx}px`);
  targetRoot.style.setProperty('--button-bar-gap', `${config.buttonBarGapPx}px`);
  targetRoot.style.setProperty('--button-bar-button-height', `${config.buttonBarButtonHeightPx}px`);
  targetRoot.style.setProperty('--button-bar-button-padding-x', `${config.buttonBarButtonPaddingXPx}px`);
  targetRoot.style.setProperty('--button-bar-button-radius', `${config.buttonBarButtonRadiusPx}px`);
  targetRoot.style.setProperty('--button-bar-font-size', `${config.buttonBarFontSizeRem}rem`);
  targetRoot.style.setProperty('--button-bar-button-bg-window-mix', `${config.buttonBarButtonBgWindowMixPct}%`);
  targetRoot.style.setProperty('--button-bar-button-bg-white-mix', `${config.buttonBarButtonBgWhiteMixPct}%`);
  targetRoot.style.setProperty('--button-bar-button-hover-white-mix', `${config.buttonBarButtonHoverWhiteMixPct}%`);
  targetRoot.style.setProperty('--button-bar-button-active-window-mix', `${config.buttonBarButtonActiveWindowMixPct}%`);
  targetRoot.style.setProperty('--button-bar-button-active-white-mix', `${config.buttonBarButtonActiveWhiteMixPct}%`);
  targetRoot.style.setProperty('--button-bar-indicator-opacity', String(config.buttonBarIndicatorOpacity));
  targetRoot.style.setProperty('--button-bar-shadow-opacity', String(config.buttonBarShadowOpacity));
  targetRoot.style.setProperty('--button-bar-groove-light-opacity', String(config.buttonBarGrooveLightOpacity));
  targetRoot.style.setProperty('--button-bar-active-glow', `${config.buttonBarActiveGlowPx}px`);
  targetRoot.style.setProperty('--button-bar-active-drop', `${config.buttonBarActiveDropPx}px`);
  targetRoot.style.setProperty('--button-bar-transition-ms', `${config.buttonBarTransitionMs}ms`);
  targetRoot.style.setProperty('--shell-tab-press-projection-y', `${Math.min(1.5, Math.max(0, config.buttonBarPressZTravelPx * 0.5)).toFixed(2)}px`);

  targetRoot.style.setProperty('--shell-bottom-band-height', 'var(--button-bar-responsive-height)');
  targetRoot.style.setProperty('--shell-bottom-tabs-gap', 'var(--button-bar-inset)');
  targetRoot.style.setProperty('--shell-bottom-tabs-padding-y', 'var(--button-bar-padding-y)');
  targetRoot.style.setProperty('--shell-tab-nav-width', 'var(--button-bar-width)');
  targetRoot.style.setProperty('--shell-tab-gap', 'var(--button-bar-gap)');
  targetRoot.style.setProperty('--shell-tab-height', 'var(--button-bar-button-height)');
  targetRoot.style.setProperty('--shell-tab-padding-x', 'var(--button-bar-button-padding-x)');
  targetRoot.style.setProperty('--shell-tab-radius', 'var(--button-bar-button-radius)');
  targetRoot.style.setProperty('--shell-tab-font-size', 'var(--button-bar-font-size)');
  targetRoot.style.setProperty('--shell-tab-bg-wall-mix', 'var(--button-bar-button-bg-window-mix)');
  targetRoot.style.setProperty('--shell-tab-bg-white-mix', 'var(--button-bar-button-bg-white-mix)');
  targetRoot.style.setProperty('--shell-tab-hover-white-mix', 'var(--button-bar-button-hover-white-mix)');
  targetRoot.style.setProperty('--shell-tab-active-wall-mix', 'var(--button-bar-button-active-window-mix)');
  targetRoot.style.setProperty('--shell-tab-active-white-mix', 'var(--button-bar-button-active-white-mix)');
  targetRoot.style.setProperty('--shell-tab-indicator-opacity', 'var(--button-bar-indicator-opacity)');
  targetRoot.style.setProperty('--shell-tab-shadow-opacity', 'var(--button-bar-shadow-opacity)');
  targetRoot.style.setProperty('--shell-tab-active-glow', 'var(--button-bar-active-glow)');
  targetRoot.style.setProperty('--shell-tab-active-drop', 'var(--button-bar-active-drop)');
  targetRoot.style.setProperty('--shell-tab-transition-ms', 'var(--button-bar-transition-ms)');
}

export function formatButtonBarControlValue(value, control) {
  if (control.type === 'checkbox' || control.display === 'boolean') return value ? 'On' : 'Off';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (control.display === 'px') return `${Math.round(numeric)}px`;
  if (control.display === 'subpx') return `${Number(numeric.toFixed(2))}px`;
  if (control.display === 'ms') return `${Math.round(numeric)}ms`;
  if (control.display === '%') return `${Math.round(numeric)}%`;
  if (control.display === 'vh') return `${Math.round(numeric)}vh`;
  if (control.display === 'rem') return `${numeric.toFixed(2)}rem`;
  if (control.display === 'ratio') return numeric.toFixed(2);
  return String(numeric);
}

export function resolveButtonBarControlPatch(control, rawValue) {
  if (!control) return {};
  const value = control.type === 'checkbox'
    ? Boolean(rawValue)
    : clampNumber(rawValue, control.min, control.max, BUTTON_BAR_DEFAULTS[control.id]);
  return { [control.id]: value };
}
