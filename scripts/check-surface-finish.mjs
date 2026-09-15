import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSceneLighting, sceneLightingCssVars, resolveSceneMaterial, lightSphereProfile, SCENE_MATERIALS } from '../react-app/app/src/lib/scene-lighting.js';
import { normalizeDesignSystemConfig, deriveLegacyConfigFiles } from '../react-app/app/src/legacy/modules/utils/design-config.js';
import { normalizeSimulationBodyMaterialConfig, resolveSimulationBodyMaterialThemeProfile } from '../react-app/app/src/legacy/modules/rendering/materials/simulation-body-material-config.js';

test('legacy finish migrates once into both modes and leaves only one authored rig', () => {
  const old = { surfaceEdgeSoftness: 1.6, surfaceEdgeDepth: 0.7, surfaceLightIntensity: 0.65, surfaceLightDirection: 315 };
  const config = normalizeDesignSystemConfig({ shell: { surface: { ...old, innerWallRimBlur: '160px', innerWallRimOpacityDark: 0.06 } } });
  assert.deepEqual(normalizeDesignSystemConfig(config), config, 'migration is idempotent');
  for (const surface of [config.shell.surface, deriveLegacyConfigFiles(config).shell.surface]) {
    for (const key of Object.keys(old)) assert.ok(!(key in surface));
    for (const theme of ['light', 'dark']) {
      const p = surface.lighting[theme];
      assert.deepEqual([p.softness, p.thickness, p.intensity, p.direction], [1.6, 0.7, 0.65, 315]);
    }
    assert.equal(surface.innerWallRimBlur, '160px');
    assert.equal(surface.innerWallRimOpacityDark, 0.06);
  }
});

test('neutral keeps existing window axes and exact calibrated sphere profile', () => {
  const lighting = normalizeSceneLighting();
  const css = sceneLightingCssVars({ lighting });
  assert.deepEqual([css['--surface-light-x'], css['--surface-light-y'], css['--surface-key-y']], ['0', '0', '1']);
  for (const theme of ['light', 'dark']) {
    const sphere = resolveSimulationBodyMaterialThemeProfile(normalizeSimulationBodyMaterialConfig(), theme);
    assert.deepEqual(lightSphereProfile(sphere, lighting, theme), sphere);
  }
});

test('theme and material edits remain independent across canonical and flattened config', () => {
  const lighting = normalizeSceneLighting();
  lighting.dark.intensity = 2.3;
  lighting.dark.direction = 270;
  lighting.dark.materials.buttons = { softness: 1.8, thickness: 0.55, highlight: 0.4, shadow: 1.3 };
  const config = normalizeDesignSystemConfig({ shell: { surface: { lighting } } });
  assert.deepEqual(deriveLegacyConfigFiles(config).shell.surface.lighting, lighting);
  assert.deepEqual(config.shell.surface.lighting.light, normalizeSceneLighting().light);
  assert.equal(resolveSceneMaterial(lighting, 'dark', 'window').softness, 1);
  assert.equal(resolveSceneMaterial(lighting, 'dark', 'buttons').softness, 1.8);
});

test('malformed values are bounded, zero survives, and window cannot author a dark rim', () => {
  const lighting = normalizeSceneLighting({ dark: { intensity: 0, softness: Infinity, direction: 17,
    materials: { window: { thickness: -2, shadow: 3 }, buttons: { shadow: 90 } } } });
  assert.equal(lighting.dark.intensity, 0);
  assert.equal(lighting.dark.softness, 1);
  assert.equal(lighting.dark.direction, -1);
  assert.equal(lighting.dark.materials.window.thickness, 0);
  assert.ok(!('shadow' in lighting.dark.materials.window));
  assert.equal(lighting.dark.materials.buttons.shadow, 3);
  for (const { id } of SCENE_MATERIALS) assert.equal(resolveSceneMaterial(lighting, 'dark', id).highlight, 0);
});

test('one direction aligns every material and sphere light with opposing shadows', () => {
  for (const [direction, x, y] of [[0, 0, 1], [90, 1, 0], [180, 0, -1], [270, -1, 0]]) {
    const lighting = normalizeSceneLighting();
    lighting.light.direction = direction;
    const css = sceneLightingCssVars({ lighting });
    for (const { id } of SCENE_MATERIALS) {
      assert.equal(Number(css[`--material-${id}-x`]), x);
      assert.equal(Number(css[`--material-${id}-y`]), y);
    }
    const p = resolveSimulationBodyMaterialThemeProfile(normalizeSimulationBodyMaterialConfig(), 'light');
    const sphere = lightSphereProfile(p, lighting, 'light');
    assert.ok(Math.abs(sphere.keyX - x * Math.hypot(p.keyX, p.keyY)) < 1e-10);
    assert.ok(Math.abs(sphere.keyY + y * Math.hypot(p.keyX, p.keyY)) < 1e-10);
  }
});
