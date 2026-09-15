// Shared by the existing editor, canonical save and shell CSS projection.
const amount = (id, label, cssVar, max = 3, min = 0) => ({
  id, label, cssVar, default: 1, min, max, step: 0.05,
  format: value => `${Math.round(value * 100)}%`,
});
export const SURFACE_FINISH_CONTROLS = [
  amount('surfaceEdgeSoftness', 'Softness', '--surface-edge-softness'),
  amount('surfaceEdgeDepth', 'Bevel', '--surface-edge-depth', 2),
  amount('surfaceLightIntensity', 'Light intensity', '--surface-light-intensity', 2),
  {
    id: 'surfaceLightDirection', label: 'Light direction', cssVar: '--surface-light-direction',
    default: -1, min: -1, max: 315, step: 1,
    options: [[-1, 'Even'], [0, 'Top'], [45, 'Top right'], [90, 'Right'],
      [135, 'Bottom right'], [180, 'Bottom'], [225, 'Bottom left'], [270, 'Left'], [315, 'Top left']],
  },
];
export const SURFACE_FINISH_DEFAULTS = Object.fromEntries(SURFACE_FINISH_CONTROLS.map(c => [c.id, c.default]));

export function normalizeSurfaceFinish(source = {}) {
  return Object.fromEntries(SURFACE_FINISH_CONTROLS.map(control => {
    const value = source?.[control.id] == null ? control.default : Number(source[control.id]);
    const valid = Number.isFinite(value) && (!control.options || control.options.some(([option]) => option === value));
    return [control.id, valid ? Math.min(control.max, Math.max(control.min, value)) : control.default];
  }));
}

export function surfaceFinishCssVars(source) {
  const config = normalizeSurfaceFinish(source);
  const angle = config.surfaceLightDirection * Math.PI / 180;
  const even = config.surfaceLightDirection === -1;
  const x = even ? 0 : Number(Math.sin(angle).toFixed(5));
  const y = even ? 0 : Number(Math.cos(angle).toFixed(5));
  return {
    ...Object.fromEntries(SURFACE_FINISH_CONTROLS.map(c => [c.cssVar, String(config[c.id])])),
    '--surface-light-spread': String(config.surfaceEdgeSoftness),
    '--surface-light-x': String(x), '--surface-light-y': String(y),
    // Small raised controls retain their overhead cue under even window light.
    '--surface-key-x': String(x), '--surface-key-y': String(even ? 1 : y),
  };
}
