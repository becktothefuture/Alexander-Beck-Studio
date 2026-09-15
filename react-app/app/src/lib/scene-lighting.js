import { normalizeSurfaceFinish } from './surface-finish.js';

// One authored rig, two independent theme profiles. All renderers consume this model.
export const SCENE_LIGHT_DIRECTIONS = [[-1, 'Even'], [0, 'Top'], [45, 'Top right'], [90, 'Right'],
  [135, 'Bottom right'], [180, 'Bottom'], [225, 'Bottom left'], [270, 'Left'], [315, 'Top left']];
export const SCENE_LIGHT_CONTROLS = [
  { id: 'intensity', label: 'Light intensity', min: 0, max: 3, step: 0.01, default: 1 },
  { id: 'direction', label: 'Light direction', options: SCENE_LIGHT_DIRECTIONS, default: -1 },
  { id: 'softness', label: 'Scene softness', min: 0, max: 3, step: 0.05, default: 1 },
  { id: 'thickness', label: 'Scene depth', min: 0, max: 3, step: 0.05, default: 1 },
];
export const MATERIAL_CONTROLS = [
  { id: 'thickness', label: 'Thickness', min: 0, max: 3, step: 0.05, default: 1 },
  { id: 'softness', label: 'Softness', min: 0, max: 3, step: 0.05, default: 1 },
  { id: 'highlight', label: 'Shine', min: 0, max: 3, step: 0.05, default: 1 },
  { id: 'shadow', label: 'Shadow', min: 0, max: 3, step: 0.05, default: 1 },
];
export const SCENE_MATERIALS = [
  { id: 'window', label: 'Window & Utility Rail', description: 'One continuous, softly lit edge.', shadow: false },
  { id: 'navigation', label: 'Menu items', description: 'Soft rubber faces and pressed edges.' },
  { id: 'balls', label: 'Balls & quote puck', description: 'Rounded bodies, soft highlights and shaded sides.' },
  { id: 'buttons', label: 'Buttons inside the window', description: 'Change effect, close, copy email and other actions.' },
  { id: 'cards', label: 'Cards & sheets', description: 'Work previews, project sheets and raised panels.' },
];
const bounded = (value, control) => {
  const n = value == null ? control.default : Number(value);
  if (!Number.isFinite(n)) return control.default;
  if (control.options) return control.options.some(([id]) => id === n) ? n : control.default;
  return Number(Math.max(control.min, Math.min(control.max, n)).toFixed(3));
};
const fields = (source, controls) => Object.fromEntries(controls.map(c => [c.id, bounded(source?.[c.id], c)]));

export function normalizeSceneLighting(input, legacySurface = {}) {
  const old = normalizeSurfaceFinish(legacySurface);
  const migrated = { intensity: old.surfaceLightIntensity, direction: old.surfaceLightDirection,
    softness: old.surfaceEdgeSoftness, thickness: old.surfaceEdgeDepth };
  return Object.fromEntries(['light', 'dark'].map(theme => {
    const profile = input?.[theme];
    return [theme, {
      ...fields(profile || migrated, SCENE_LIGHT_CONTROLS),
      materials: Object.fromEntries(SCENE_MATERIALS.map(material => [material.id,
        fields(profile?.materials?.[material.id], MATERIAL_CONTROLS.filter(c => c.id !== 'shadow' || material.shadow !== false)),
      ])),
    }];
  }));
}

export function resolveSceneMaterial(lighting, theme, material) {
  const profile = lighting[theme === 'dark' ? 'dark' : 'light'];
  const response = profile.materials[material];
  const angle = profile.direction * Math.PI / 180;
  const even = profile.direction === -1;
  return {
    thickness: profile.thickness * response.thickness,
    softness: profile.softness * response.softness,
    highlight: profile.intensity * response.highlight,
    shadow: profile.intensity * (response.shadow ?? 0),
    even,
    x: even ? 0 : Number(Math.sin(angle).toFixed(5)),
    y: even ? 0 : Number(Math.cos(angle).toFixed(5)),
  };
}

export function sceneLightingCssVars(surface = {}, theme = 'light') {
  const lighting = normalizeSceneLighting(surface.lighting, surface);
  const vars = {};
  for (const { id } of SCENE_MATERIALS) {
    const material = resolveSceneMaterial(lighting, theme, id);
    for (const name of ['thickness', 'softness', 'highlight', 'shadow', 'x', 'y']) {
      vars[`--material-${id}-${name}`] = String(material[name]);
    }
    vars[`--material-${id}-lift-y`] = String(material.even ? -1 : material.y);
    vars[`--material-${id}-angle`] = `${material.even ? 180 : lighting[theme].direction + 180}deg`;
    // Preserve each existing finish under Even; directional lighting uses one source.
    vars[`--material-${id}-key-x`] = String(material.even ? (id === 'buttons' ? -1 : 0) : material.x);
    vars[`--material-${id}-key-y`] = String(material.even ? 1 : material.y);
  }
  // The continuous window contour and its existing fine calibration share these aliases.
  const window = resolveSceneMaterial(lighting, theme, 'window');
  Object.assign(vars, {
    '--surface-edge-softness': String(window.softness), '--surface-light-spread': String(window.softness),
    '--surface-edge-depth': String(window.thickness), '--surface-light-intensity': String(window.highlight),
    '--surface-light-direction': String(lighting[theme].direction),
    '--surface-light-x': String(window.x), '--surface-light-y': String(window.y),
    '--surface-key-x': String(window.x), '--surface-key-y': String(window.even ? 1 : window.y),
  });
  return vars;
}

// Called only while baking cached sphere sprites, never by the physics hot path.
export function lightSphereProfile(profile, lighting, theme) {
  const material = resolveSceneMaterial(lighting, theme, 'balls');
  const result = { ...profile };
  if (!material.even) {
    const reach = Math.hypot(profile.keyX, profile.keyY);
    result.keyX = material.x * reach;
    result.keyY = -material.y * reach;
    result.lightAxisX = -material.x;
    result.lightAxisY = material.y;
  }
  const depth = Math.sqrt(material.thickness);
  for (const key of ['keyStrength', 'ambientStrength', 'skyFillStrength', 'fillStrength', 'reflectionBandStrength', 'rimLightStrength', 'horizonFillStrength', 'bounceStrength']) {
    result[key] = Math.min(3, profile[key] * material.highlight * depth);
  }
  for (const key of ['shadowStrength', 'terminatorStrength', 'edgeShadowStrength']) {
    result[key] = Math.min(3, profile[key] * material.shadow * depth);
  }
  if (material.softness !== 1) {
    const softness = Math.max(0.15, material.softness);
    result.keySpread = Math.min(1.5, profile.keySpread * Math.sqrt(softness));
    result.matteRolloff = Math.min(1.15, profile.matteRolloff * Math.sqrt(softness));
    result.rimWidth = Math.min(1, profile.rimWidth * Math.sqrt(softness));
    result.shadowArea = Math.max(0.3, Math.min(1.8, profile.shadowArea * Math.sqrt(softness)));
  }
  return result;
}
