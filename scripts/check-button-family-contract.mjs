import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sources = Object.fromEntries(await Promise.all([
  ['main', '../react-app/app/public/css/main.css'],
  ['tokens', '../react-app/app/public/css/tokens.css'],
  ['portfolioStyles', '../react-app/app/public/css/portfolio.css'],
  ['playgroundStyles', '../react-app/app/src/routes/playground/playground.css'],
  ['switcher', '../react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx'],
  ['studioShell', '../react-app/app/src/components/app/StudioShell.jsx'],
  ['copyEmail', '../react-app/app/src/components/app/CopyEmailAction.jsx'],
  ['linkedin', '../react-app/app/src/components/app/LinkedInAction.jsx'],
  ['portfolioGate', '../react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx'],
  ['portfolioDrawer', '../react-app/app/src/legacy/modules/portfolio/project-drawer.js'],
  ['playgroundLightbox', '../react-app/app/src/routes/playground/media/PlaygroundLightbox.jsx'],
  ['buttonAudit', '../react-app/app/src/routes/button-audit/ButtonAudit.jsx'],
  ['buttonAuditStyles', '../react-app/app/src/routes/button-audit/button-audit.css'],
  ['vite', '../react-app/app/vite.config.js'],
  ['studio', './studio.mjs'],
].map(async ([key, path]) => [key, await read(path)])));

test('the requested production controls opt into exactly two explicit families', () => {
  assert.match(
    sources.switcher,
    /className="abs-labelled-action simulation-focus-pill simulation-focus-switcher"/,
  );
  assert.match(sources.copyEmail, /'abs-labelled-action',[\s\S]*?'contact-email-row'/);
  assert.match(sources.linkedin, /className="abs-labelled-action contact-linkedin-action"/);

  for (const [owner, source] of Object.entries({
    portfolioGate: sources.portfolioGate,
    portfolioDrawer: sources.portfolioDrawer,
    playgroundLightbox: sources.playgroundLightbox,
  })) {
    assert.equal(
      (source.match(/\babs-circular-utility\b/g) || []).length,
      1,
      `${owner} must expose one circular utility control`,
    );
  }
});

test('shared CSS owns family geometry, type, material, states, focus, and motion', () => {
  assert.match(
    sources.main,
    /:is\(\.abs-labelled-action, \.abs-circular-utility\.abs-icon-btn\) \{[\s\S]*?border: 0;[\s\S]*?background: var\(--abs-soft-control-fill\);[\s\S]*?box-shadow: var\(--abs-soft-control-shadow-rest\);[\s\S]*?translate: 0 0;[\s\S]*?transition:/,
  );
  assert.match(
    sources.main,
    /\.abs-labelled-action \{[\s\S]*?--abs-labelled-action-height: 44px;[\s\S]*?--abs-labelled-action-font-size: 0\.875rem;[\s\S]*?--abs-labelled-action-icon-size: 1rem;[\s\S]*?--abs-labelled-action-gap: 12px;[\s\S]*?border-radius: var\(--abs-radius-pill\);/,
  );
  assert.match(
    sources.main,
    /\.abs-circular-utility\.abs-icon-btn \{[\s\S]*?--abs-circular-utility-size: 56px;[\s\S]*?--abs-circular-utility-icon-size: 26px;[\s\S]*?aspect-ratio: 1 \/ 1;[\s\S]*?border-radius: 50%;/,
  );
  assert.match(
    sources.main,
    /:hover:where\(:not\(:focus-visible, :disabled\)\) \{[\s\S]*?background: var\(--abs-soft-control-fill-hover\);[\s\S]*?translate: 0 -2px;/,
  );
  assert.match(
    sources.main,
    /:focus-visible \{[\s\S]*?outline: 3px solid var\(--abs-soft-control-focus\);[\s\S]*?box-shadow: var\(--abs-soft-control-shadow-hover\);[\s\S]*?translate: 0 -1px;/,
  );
  assert.match(
    sources.main,
    /:active \{[\s\S]*?--abs-soft-control-translate-duration: var\(--abs-soft-control-press-duration\);[\s\S]*?box-shadow:\s+(?:var\(--abs-soft-control-shadow-pressed\)|none);[\s\S]*?translate: 0 1px;[\s\S]*?transform: none;/,
  );
  assert.match(
    sources.main,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?:is\(\.abs-labelled-action, \.abs-circular-utility\.abs-icon-btn\),[\s\S]*?animation: none !important;[\s\S]*?transition: none !important;/,
  );
  assert.match(
    sources.tokens,
    /--abs-soft-control-shadow-rest:[\s\S]*?inset 0\.5px 0\.5px 0\.5px rgba\(var\(--abs-rgb-white\), 0\.176\)[\s\S]*?--abs-soft-control-shadow-hover:[\s\S]*?0\.256[\s\S]*?--abs-soft-control-shadow-pressed:[\s\S]*?0\.112/,
  );
});

test('component CSS keeps anatomy and placement but no longer forks family states', () => {
  assert.doesNotMatch(
    sources.main,
    /\.contact-linkedin-action:(?:hover|active|focus-visible)/,
  );
  assert.doesNotMatch(
    sources.portfolioStyles,
    /\.portfolio-access-gate__close\.abs-icon-btn:(?:hover|active|focus-visible)/,
  );
  assert.doesNotMatch(
    sources.portfolioStyles,
    /\.portfolio-project-view__back--top\.abs-icon-btn:(?:hover|active|focus-visible)/,
  );
  assert.doesNotMatch(
    sources.playgroundStyles,
    /\.playground-lightbox__close(?::is\([^)]*\)|:(?:hover|active|focus-visible))/,
  );
});

test('production copy confirmation rotates inside one stable label window', () => {
  assert.match(
    sources.copyEmail,
    /data-copy-presentation="label"[\s\S]*?contact-email-label-window[\s\S]*?contact-email-label--idle[\s\S]*?contact-email-label--copied[\s\S]*?ti ti-check[\s\S]*?contact-email-label--error/,
  );
  assert.match(
    sources.main,
    /\.contact-email-label-window \{[\s\S]*?display: grid;[\s\S]*?block-size: 1\.2em;[\s\S]*?overflow: hidden;/,
  );
  assert.match(
    sources.main,
    /\.contact-email-row:is\(\.is-copied, \.is-error\) \.contact-email-label--idle \{[\s\S]*?transform:[\s\S]*?\.contact-email-row\.is-copied \.contact-email-label--copied,[\s\S]*?transform: translate3d\(0, 0, 0\);/,
  );
  assert.match(
    sources.main,
    /\.contact-email-label \{[\s\S]*?block-size: 100%;[\s\S]*?line-height: 1;/,
  );
  assert.match(
    sources.main,
    /\.contact-email-copy,[\s\S]*?\.contact-email-copy i \{[\s\S]*?inline-size: var\(--abs-labelled-action-icon-size\);[\s\S]*?block-size: var\(--abs-labelled-action-icon-size\);/,
  );
  assert.doesNotMatch(sources.copyEmail, /feedbackPresentation|pressPulse|pulse-energy/);
  assert.doesNotMatch(sources.main, /\.contact-email-row\.pulse-energy|contactCopyMaterialFlash/);
});

test('the production switcher uses one label across a three-beat handoff', () => {
  assert.match(
    sources.switcher,
    /SWITCHER_EXIT_MS = 160[\s\S]*?SWITCHER_HOLD_MS = 880[\s\S]*?SWITCHER_ENTRY_MS = 400/,
  );
  assert.equal((sources.switcher.match(/simulation-focus-pill__label--handoff/g) || []).length, 1);
  assert.doesNotMatch(sources.switcher, /simplifiedLabel|label--next|incomingSimulation/);
  assert.match(
    sources.switcher,
    /motionPhaseRef\.current = 'departing'[\s\S]*?setDisplayedSimulation\(activeSimulation\)[\s\S]*?motionPhaseRef\.current = 'holding'[\s\S]*?motionPhaseRef\.current = 'arriving'[\s\S]*?motionPhaseRef\.current = 'idle'/,
  );
  assert.match(
    sources.main,
    /\.simulation-focus-pill\[data-phase='departing'\][\s\S]*?\.simulation-focus-pill\[data-phase='holding'\][\s\S]*?\.simulation-focus-pill\[data-phase='arriving'\]/,
  );
  assert.match(
    sources.main,
    /--simulation-switcher-handoff-duration: 1440ms;[\s\S]*?--simulation-switcher-width-duration: 440ms;[\s\S]*?inline-size var\(--simulation-switcher-width-duration\)[\s\S]*?simulation-switcher-icon-handoff/,
  );
  assert.match(
    sources.main,
    /\.simulation-focus-pill__icon \{[\s\S]*?position: absolute;[\s\S]*?inset-inline-start: calc\([\s\S]*?translate: -50% -50%;[\s\S]*?\.simulation-focus-pill:is\(\[data-phase='departing'\], \[data-phase='holding'\]\)[\s\S]*?inset-inline-start: 50%;/,
  );
  assert.match(sources.buttonAudit, /simulation-focus-pill__label--handoff/);
  assert.doesNotMatch(sources.buttonAuditStyles, /simulation-focus-pill__label--handoff|simulation-switcher-icon-handoff/);
  assert.doesNotMatch(sources.studioShell, /key=\{`controls-\$\{routeRenderKey\}`\}/);
});

test('the promoted controls settle their lift and press with translate-only elasticity', () => {
  assert.match(
    sources.tokens,
    /--abs-soft-control-lift-duration: 420ms;[\s\S]*?--abs-soft-control-lift-easing: cubic-bezier\(0\.2, 1\.55, 0\.36, 1\);[\s\S]*?--abs-soft-control-press-duration: 90ms;/,
  );
  assert.match(
    sources.main,
    /:is\(\.abs-labelled-action, \.abs-circular-utility\.abs-icon-btn\) \{[\s\S]*?translate var\(--abs-soft-control-translate-duration\) var\(--abs-soft-control-translate-easing\)/,
  );
  assert.match(
    sources.buttonAuditStyles,
    /\.button-audit__theme-toggle \{[\s\S]*?translate var\(--button-audit-control-translate-duration\) var\(--button-audit-control-translate-easing\)[\s\S]*?\.button-audit__theme-toggle:active \{[\s\S]*?--button-audit-control-translate-duration: var\(--button-audit-control-press-duration\);/,
  );
  assert.doesNotMatch(
    sources.buttonAuditStyles,
    /\.button-audit :is\(\.abs-labelled-action, \.abs-circular-utility\.abs-icon-btn\)/,
  );
  assert.doesNotMatch(
    sources.main,
    /:is\(\.abs-labelled-action, \.abs-circular-utility\.abs-icon-btn\)(?::[^,{\s]+|:[^{]+)?\s*\{[^}]*\bscale:/,
  );
});

test('the development audit stays unique, themeable, window-surfaced, and routable', () => {
  assert.equal((sources.buttonAudit.match(/<EmailSpecimen\b/g) || []).length, 1);
  assert.equal((sources.buttonAudit.match(/<LinkedInSpecimen\b/g) || []).length, 1);
  assert.equal((sources.buttonAudit.match(/<Specimen\b/g) || []).length, 6);
  assert.doesNotMatch(sources.buttonAudit, /button-audit-specimen__label|\n\s+(?:label|source)=/);

  assert.match(sources.buttonAudit, /<h1>Button audit<\/h1>/);
  assert.match(sources.buttonAuditStyles, /\.button-audit__header h1 \{[\s\S]*?font-size: 0\.625rem;/);
  assert.match(sources.buttonAudit, /className="button-audit__theme-toggle"[\s\S]*?aria-pressed=\{theme === 'dark'\}/);
  assert.match(sources.buttonAudit, /root\.classList\.toggle\('dark-mode', isDark\)/);
  assert.match(sources.buttonAudit, /root\.dataset\.absTheme = theme/);
  assert.match(sources.buttonAuditStyles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.button-audit__theme-toggle[\s\S]*?transition: none !important;/);

  assert.match(sources.buttonAuditStyles, /\.button-audit__background \{[\s\S]*?background: var\(--studio-window-bg\);/);
  assert.doesNotMatch(sources.buttonAudit, /images\.unsplash\.com|Unsplash|Kristīne Kozaka/);

  assert.match(sources.vite, /mode === 'development'[\s\S]*?'lab\/button-audit': resolve\(__dirname, 'lab\/button-audit\.html'\)/);
  assert.match(sources.studio, /const BUTTON_AUDIT_PATH = '\/lab\/button-audit\.html'/);
  assert.match(sources.studio, /isButtonAuditResponse/);
});
