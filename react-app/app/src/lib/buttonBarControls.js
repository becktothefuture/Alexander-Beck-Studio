// One registry owns canonical runtime settings, editor controls and CSS projection.
const control = (name, label, value, min, max, step = 1, unit = 'px') => ({
  id: `tactileNav${name}`, label, default: value, min, max, step, unit,
  type: 'range', display: unit === 'px' ? 'subpx' : unit || 'ratio',
  cssVar: `--tactile-nav-${name.replace(/(Px|Ms)$/, '').replace(/[A-Z]/g, (letter, i) => `${i ? '-' : ''}${letter.toLowerCase()}`)}`,
});

export const BUTTON_BAR_CONTROL_GROUPS = Object.freeze([
  { title: 'Tactile navigation', initiallyOpen: true, controls: [
    control('FaceHeightPx', 'Face height', 33, 28, 40, 0.5),
    control('IconSizePx', 'Icon size', 16, 12, 20, 0.5),
    control('RowPaddingTopPx', 'Group top padding', 8, 0, 32, 0.5),
    control('RowPaddingBottomPx', 'Group bottom padding', 4, 0, 32, 0.5),
    control('GroupMaxWidthPx', 'Group maximum width', 720, 320, 960, 8),
    control('ButtonGapPx', 'Desktop button gap', 7, 2, 12, 0.5),
    control('MobileButtonGapPx', 'Mobile button gap', 6, 2, 10, 0.5),
    control('LabelGapPx', 'Label gap', 7, 4, 10, 0.5),
    control('LabelSizePx', 'Desktop label size', 11.5, 10, 14, 0.5),
    control('MobileLabelSizePx', 'Mobile label size', 11, 10, 14, 0.5),
    control('PressedDepth', 'Pressed depth (shading)', 0, 0, 2, 0.05, ''),
    control('PopStrength', 'Shading rebound', 0, 0, 0.15, 0.01, ''),
    control('SoundVolume', 'Navigation sound volume', 0.15, 0, 0.3, 0.01, ''),
  ] },
  { title: 'Resting light and shadow', initiallyOpen: false, controls: [
    control('RestLightStrength', 'Upper light strength', 0.16, 0, 0.4, 0.01, ''),
    control('RestLightSoftnessPx', 'Upper light softness', 4, 0.5, 10, 0.25),
    control('RestShadowStrength', 'Lower shadow strength', 0.42, 0, 0.6, 0.01, ''),
    control('RestShadowSoftnessPx', 'Lower shadow softness', 4.5, 0.5, 10, 0.25),
  ] },
  { title: 'Pressed light and shadow', initiallyOpen: false, controls: [
    control('InternalLight', 'Internal light', 0.08, 0, 0.12, 0.01, ''),
    control('ColourFalloff', 'Colour falloff', 0.22, 0, 0.4, 0.01, ''),
    control('InsetShadowSoftnessPx', 'Upper shadow softness', 6, 0.5, 14, 0.25),
    control('LowerLightStrength', 'Lower light strength', 0, 0, 0.4, 0.01, ''),
    control('LowerLightSoftnessPx', 'Lower light softness', 4, 0.5, 10, 0.25),
    control('LowerShadowStrength', 'Lower shadow strength', 0, 0, 0.8, 0.01, ''),
    control('LowerShadowSoftnessPx', 'Lower shadow softness', 6, 0.5, 12, 0.25),
  ] },
  { title: 'Advanced timing', initiallyOpen: false, controls: [
    control('PressDurationMs', 'Press duration', 60, 0, 200, 1, 'ms'),
    control('ReleaseDurationMs', 'Release duration', 185, 0, 400, 1, 'ms'),
  ] },
]);
export const BUTTON_BAR_CONTROLS = Object.freeze(BUTTON_BAR_CONTROL_GROUPS.flatMap(group => group.controls));
export const BUTTON_BAR_DEFAULTS = Object.freeze(Object.fromEntries(BUTTON_BAR_CONTROLS.map(c => [c.id, c.default])));

export function normalizeButtonBarConfig(source = {}) {
  return Object.fromEntries(BUTTON_BAR_CONTROLS.map(c => {
    const value = source[c.id] == null ? c.default : Number(source[c.id]);
    return [c.id, Number.isFinite(value) ? Math.min(c.max, Math.max(c.min, value)) : c.default];
  }));
}

export function applyButtonBarCssVars(source = {}, root = null) {
  const target = root || (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target?.style) return;
  const config = normalizeButtonBarConfig(source);
  for (const c of BUTTON_BAR_CONTROLS) target.style.setProperty(c.cssVar, `${config[c.id]}${c.unit}`);
}

export function formatButtonBarControlValue(value, control) {
  return `${Number(Number(value).toFixed(2))}${control.unit || ''}`;
}

export function resolveButtonBarControlPatch(control, rawValue) {
  return control ? { [control.id]: normalizeButtonBarConfig({ [control.id]: rawValue })[control.id] } : {};
}
