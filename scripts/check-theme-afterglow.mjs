import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_THEME_TRANSITION, normalizeThemeTransition, parseThemeColour, readableThemeInk, themeContrast, themeProgress,
} from '../react-app/app/src/lib/theme-transition.js';
import { normalizeDesignSystemConfig, deriveLegacyConfigFiles } from '../react-app/app/src/legacy/modules/utils/design-config.js';

test('surface settles before glow and easing is bounded and monotonic', () => {
  const { surfaceDurationMs, glowDurationMs } = DEFAULT_THEME_TRANSITION;
  assert.equal(themeProgress(surfaceDurationMs, surfaceDurationMs), 1);
  assert.ok(themeProgress(surfaceDurationMs, glowDurationMs) < 1);
  assert.equal(themeProgress(glowDurationMs, glowDurationMs), 1);
  let previous = 0;
  for (let elapsed = -10; elapsed <= glowDurationMs + 50; elapsed += 1) {
    const current = themeProgress(elapsed, glowDurationMs);
    assert.ok(current >= previous && current <= 1);
    previous = current;
  }
  assert.equal(themeProgress(0, 0), 1);
});

test('ink remains readable through every intermediate neutral surface in either direction', () => {
  const lightInk = parseThemeColour('#454545');
  const darkInk = parseThemeColour('#f0f0f0');
  for (let value = 0; value <= 255; value += 1) {
    const background = [value, value, value];
    assert.ok(themeContrast(background, readableThemeInk(background, lightInk, darkInk)) >= 4.5);
    assert.ok(themeContrast(background, readableThemeInk(background, darkInk, lightInk)) >= 4.5);
  }
});

test('timings survive canonical normalization and generated shell configuration', () => {
  const config = normalizeDesignSystemConfig({ shell: { motion: { themeTransition: { surfaceDurationMs: 180, glowDurationMs: 360 } } } });
  assert.deepEqual(config.shell.motion.themeTransition, { surfaceDurationMs: 180, glowDurationMs: 360 });
  assert.deepEqual(deriveLegacyConfigFiles(config).shell.motion.themeTransition, config.shell.motion.themeTransition);
  assert.deepEqual(normalizeThemeTransition({ surfaceDurationMs: -10, glowDurationMs: 5000 }), { surfaceDurationMs: 0, glowDurationMs: 1000 });
  assert.deepEqual(normalizeThemeTransition({ surfaceDurationMs: 500, glowDurationMs: 100 }), { surfaceDurationMs: 500, glowDurationMs: 500 });
  assert.deepEqual(normalizeThemeTransition(null), { surfaceDurationMs: 313, glowDurationMs: 500 });
});
