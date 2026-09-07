import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { BUTTON_BAR_CONTROLS } from './react-app/app/src/lib/buttonBarControls.js';
import { deriveLegacyConfigFiles, normalizeDesignSystemConfig } from './react-app/app/src/legacy/modules/utils/design-config.js';
import { applyLocalFileTransaction, runSerializedLocalFileOperation } from './scripts/lib/local-file-transaction.mjs';

const directory = 'react-app/app/public/config';
const canonical = `${directory}/design-system.json`;
const projected = {
  runtime: `${directory}/default-config.json`, shell: `${directory}/shell-config.json`,
  portfolio: `${directory}/portfolio-config.json`, cv: `${directory}/cv-config.json`,
};
// Explicit ownership: a runtime projection is not a new stylesheet source.
const buttonBarTokens = [
  ['buttonBarHeightPx', '--button-bar-height'],
  ['buttonBarBottomInsetPx', '--button-bar-bottom-inset'],
  ['buttonBarWindowOverlapPx', '--button-bar-window-overlap'],
  ['buttonBarMobileHeightPx', '--button-bar-mobile-height'],
  ['buttonBarMobileWindowOverlapPx', '--button-bar-mobile-window-overlap'],
  ['buttonBarMobileRadiusPx', '--button-bar-mobile-radius'],
  ['buttonBarMobileIconCellPx', '--button-bar-mobile-icon-cell'],
  ['buttonBarMobileIconSizePx', '--button-bar-mobile-icon-size'],
  ['buttonBarMobileFontSizeRem', '--button-bar-mobile-font-size'],
  ['buttonBarMobileActiveInsetPx', '--button-bar-mobile-active-inset'],
  ['buttonBarDesktopRouteCellPx', '--button-bar-desktop-route-cell'],
  ['buttonBarDesktopIconSizePx', '--button-bar-desktop-icon-size'],
  ['buttonBarDesktopLabelGapPx', '--button-bar-desktop-label-gap'],
  ['buttonBarShellPaddingXPx', '--button-bar-shell-padding-x'],
  ['buttonBarButtonHeightPx', '--button-bar-button-height'],
  ['buttonBarButtonRadiusPx', '--button-bar-button-radius'],
  ['buttonBarFontSizeRem', '--button-bar-font-size'],
  ['buttonBarDesktopFontScale', '--button-bar-desktop-font-scale'],
  ['buttonBarActiveInsetPx', '--button-bar-active-inset'],
  ['buttonBarActiveRadiusPx', '--button-bar-active-radius'],
  ['buttonBarActiveDepthPx', '--button-bar-active-depth'],
  ['buttonBarActiveSurfaceOpacity', '--button-bar-active-surface-opacity'],
  ['buttonBarActiveHighlightOpacity', '--button-bar-active-highlight-opacity'],
  ['buttonBarActiveShadowOpacity', '--button-bar-active-shadow-opacity'],
  ['buttonBarTransitionMs', '--button-bar-transition-ms'],
];

export default {
  id: 'beck.fyi', version: 1,
  origins: ['http://localhost:8012', 'http://127.0.0.1:8012'],
  files: [canonical, ...Object.values(projected)],
  canonical,
  // Source-review coverage is site-wide; deterministic token writes are narrower.
  routeSources: {
    home: ['react-app/app/src/routes/home/HomeRoute.jsx', 'react-app/app/public/config/contents-home.json', 'react-app/app/src/legacy/main.js'],
    portfolio: ['react-app/app/src/routes/playground/PlaygroundExperience.jsx', 'react-app/app/src/routes/portfolio/work', 'react-app/app/src/legacy/modules/portfolio', 'react-app/app/public/config/contents-portfolio.json'],
    about: ['react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx', 'react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css', 'react-app/app/public/config/contents-about.json'],
    contact: ['react-app/app/src/routes/contact/ContactRouteContent.jsx', 'react-app/app/src/routes/contact/contact-route.css', 'react-app/app/src/routes/contact/contactRippleConfig.js'],
    styleguide: ['react-app/app/src/routes/styleguide'],
  },
  sourceReferences: [
    'react-app/app/public/css/tokens.css',
    'react-app/app/public/css/main.css',
    'react-app/app/src/lib/buttonBarControls.js',
    'react-app/app/src/legacy/modules/visual/site-shell.js',
    'react-app/app/src/components/app/StudioShell.jsx',
    'react-app/app/src/components/app/ShellButtonBar.jsx',
    'react-app/app/src/components/app/ShellUtilityRail.jsx',
    'react-app/app/src/components/app/shell-button-bar-dominant.css',
  ],
  bindings: buttonBarTokens.map(([id, cssVar]) => {
    const control = BUTTON_BAR_CONTROLS.find((item) => item.id === id);
    if (!control) throw new Error(`Token registration no longer has an authored control: ${id}`);
    return {
      cssVar, scopes: [':root', 'html'], file: canonical, pointer: `/runtime/${id}`,
      valueType: 'number', min: control.min, max: control.max,
      unit: /Px$|Rem$/u.test(id) ? 'px' : /Ms$/u.test(id) ? 'ms' : '',
      scale: /Rem$/u.test(id) ? 16 : 1,
      context: /Mobile/u.test(id) ? 'Mobile token; preserve desktop and effective-token aliases.'
        : 'Shared or desktop token; preserve existing CSS breakpoint consumers.',
    };
  }),
  validateSnapshot(snapshot) {
    const derived = deriveLegacyConfigFiles(snapshot[canonical].document);
    for (const [key, path] of Object.entries(projected)) {
      if (!isDeepStrictEqual(snapshot[path].document, derived[key])) {
        throw new Error(`Generated configuration is already stale: ${path}. Resolve it before planning edits.`);
      }
    }
  },
  validate(documents) {
    const authored = documents[canonical];
    if (!isDeepStrictEqual(normalizeDesignSystemConfig(authored), authored)) {
      throw new Error('Canonical normalisation would change additional values. Resolve the source conflict before applying.');
    }
  },
  derive(documents) {
    const authored = documents[canonical];
    const derived = deriveLegacyConfigFiles(authored);
    return { [canonical]: authored, ...Object.fromEntries(Object.entries(projected).map(([key, path]) => [path, derived[key]])) };
  },
  withWriteLock: runSerializedLocalFileOperation,
  persist(root, replacements) {
    return applyLocalFileTransaction({ rootPath: resolve(root, directory), replacements });
  },
};
