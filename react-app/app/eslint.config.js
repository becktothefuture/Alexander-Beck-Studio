import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// Measured legacy debt baseline (2026-07-31): 0 of 128 files, 0 violations.
// Keep this list explicit so new legacy files receive normal unused-variable checks.
export const LEGACY_UNUSED_VARS_DEBT_FILES = []

// These files contain existing best-effort catches. Each exception is explicit so
// a new file cannot silently inherit permission for an empty catch.
export const LEGACY_EMPTY_CATCH_DEBT = []

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
    files: ['src/hooks/useShellRouteTransition.js'],
    rules: {
      // The simulation-switch callback intentionally participates in the route-queue callback cycle.
      // check-simulation-switch-transaction.mjs protects its queue, supersession, and recovery behavior.
      'react-hooks/immutability': 'off',
    },
  },
])
