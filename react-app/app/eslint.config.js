import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Measured legacy debt baseline (2026-07-31): 32 of 125 files, 84 violations.
// Keep this list explicit so new legacy files receive normal unused-variable checks.
export const LEGACY_UNUSED_VARS_DEBT_FILES = [
  'src/legacy/modules/audio/sound-control-registry.js',
  'src/legacy/modules/audio/sound-engine.js',
  'src/legacy/modules/audio/sound-playground.js',
  'src/legacy/modules/core/state.js',
  'src/legacy/modules/input/pointer.js',
  'src/legacy/modules/modes/critters.js',
  'src/legacy/modules/modes/kaleidoscope.js',
  'src/legacy/modules/modes/magnetic.js',
  'src/legacy/modules/modes/parallax-float.js',
  'src/legacy/modules/modes/particle-fountain.js',
  'src/legacy/modules/modes/pressure-crucible.js',
  'src/legacy/modules/modes/starfield-3d.js',
  'src/legacy/modules/modes/water.js',
  'src/legacy/modules/physics/Ball.js',
  'src/legacy/modules/physics/engine.js',
  'src/legacy/modules/physics/portfolio-body-geometry.js',
  'src/legacy/modules/physics/spawn.js',
  'src/legacy/modules/portfolio/app.js',
  'src/legacy/modules/portfolio/pit-mode.js',
  'src/legacy/modules/portfolio/project-drawer.js',
  'src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js',
  'src/legacy/modules/rendering/effects.js',
  'src/legacy/modules/ui/control-registry.js',
  'src/legacy/modules/ui/keyboard.js',
  'src/legacy/modules/ui/modal-overlay.js',
  'src/legacy/modules/ui/panel-dock.js',
  'src/legacy/modules/ui/scene-impact-react.js',
  'src/legacy/modules/utils/design-config.js',
  'src/legacy/modules/utils/logger.js',
  'src/legacy/modules/visual/colors.js',
  'src/legacy/modules/visual/cursor-explosion.js',
  'src/legacy/modules/visual/pebble-body.js',
]

// These files contain existing best-effort catches. Each exception is explicit so
// a new file cannot silently inherit permission for an empty catch.
export const LEGACY_EMPTY_CATCH_DEBT = [
  { file: 'src/legacy/main.js', reason: 'Runtime diagnostics must not block boot state publication.' },
  { file: 'src/legacy/modules/audio/sound-engine.js', reason: 'Audio capability and cleanup failures are best effort.' },
  { file: 'src/legacy/modules/audio/sound-playground.js', reason: 'Audio node cleanup is best effort.' },
  { file: 'src/legacy/modules/core/state.js', reason: 'Persistence and observer compatibility fallbacks are best effort.' },
  { file: 'src/legacy/modules/input/pointer.js', reason: 'Pointer capability cleanup is best effort.' },
  { file: 'src/legacy/modules/modes/mode-controller.js', reason: 'Mode teardown compatibility fallbacks are best effort.' },
  { file: 'src/legacy/modules/rendering/loop.js', reason: 'Frame-loop cleanup is best effort.' },
  { file: 'src/legacy/modules/rendering/renderer.js', reason: 'Rendering capability and teardown fallbacks are best effort.' },
  { file: 'src/legacy/modules/ui/apply-text.js', reason: 'Optional text application fallback is best effort.' },
  { file: 'src/legacy/modules/ui/control-registry.js', reason: 'Optional control persistence and cleanup are best effort.' },
  { file: 'src/legacy/modules/ui/keyboard.js', reason: 'Keyboard listener cleanup is best effort.' },
  { file: 'src/legacy/modules/ui/legend-filter.js', reason: 'Legend listener and DOM cleanup are best effort.' },
  { file: 'src/legacy/modules/ui/link-cursor-hop.js', reason: 'Optional cursor capability updates are best effort.' },
  { file: 'src/legacy/modules/ui/modal-overlay.js', reason: 'Modal focus and listener cleanup are best effort.' },
  { file: 'src/legacy/modules/ui/panel-dock.js', reason: 'Optional panel capability and persistence fallbacks are best effort.' },
  { file: 'src/legacy/modules/ui/panel-popup-manager.js', reason: 'Popup placement and cleanup fallbacks are best effort.' },
  { file: 'src/legacy/modules/ui/quote-puck.js', reason: 'Optional observer and interaction cleanup are best effort.' },
  { file: 'src/legacy/modules/ui/scene-impact-react.js', reason: 'Optional React bridge and cleanup fallbacks are best effort.' },
  { file: 'src/legacy/modules/ui/studio-surface-controls.js', reason: 'Optional studio-control cleanup is best effort.' },
  { file: 'src/legacy/modules/utils/design-config.js', reason: 'Storage and configuration compatibility fallbacks are best effort.' },
  { file: 'src/legacy/modules/utils/design-system-save.js', reason: 'Development save transport cleanup is best effort.' },
  { file: 'src/legacy/modules/utils/logger.js', reason: 'Diagnostics must never interrupt runtime behavior.' },
  { file: 'src/legacy/modules/utils/performance.js', reason: 'Performance instrumentation is optional and best effort.' },
  { file: 'src/legacy/modules/utils/text-loader.js', reason: 'Optional text loading fallbacks are best effort.' },
  { file: 'src/legacy/modules/visual/dark-mode-v2.js', reason: 'Theme observer and storage fallbacks are best effort.' },
  { file: 'src/legacy/modules/visual/noise-system.js', reason: 'Optional noise capability and teardown are best effort.' },
  { file: 'src/legacy/modules/visual/site-shell.js', reason: 'Shell compatibility and cleanup fallbacks are best effort.' },
  { file: 'src/legacy/modules/visual/wall-frame.js', reason: 'Optional frame observers are best effort.' },
]

export default defineConfig([
  globalIgnores(['dist', 'dist-certify', 'dist-editor-preview']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        __DEV__: 'readonly',
        __CERTIFY__: 'readonly',
        __PANEL_INITIALLY_VISIBLE__: 'readonly',
        UnicornStudio: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['src/legacy/**/*.{js,jsx}'],
    rules: {
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^[A-Z_]',
        // Legacy optional-capability and cleanup catches intentionally ignore failures.
        caughtErrors: 'none',
      }],
      'no-empty': 'error',
    },
  },
  {
    files: LEGACY_UNUSED_VARS_DEBT_FILES,
    rules: {
      // Temporary measured debt allowlist; remove files as focused cleanup lands.
      'no-unused-vars': 'off',
    },
  },
  {
    files: LEGACY_EMPTY_CATCH_DEBT.map(({ file }) => file),
    rules: {
      // Exact catch identities are fail-closed by check-legacy-lint-ratchet.mjs.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['src/hooks/useShellRouteTransition.js'],
    rules: {
      // The simulation-switch callback intentionally participates in the route-queue callback cycle.
      // check-simulation-switch-transaction.mjs protects its queue, supersession, and recovery behavior.
      'react-hooks/immutability': 'off',
    },
  },
  {
    files: ['src/legacy/modules/ui/panel-dock.js'],
    rules: {
      // The reviewed legacy ratchet pins this compatibility assignment until panel cleanup is scoped.
      // check-legacy-lint-ratchet.mjs fails if that exact debt identity changes.
      'no-useless-assignment': 'off',
    },
  },
])
