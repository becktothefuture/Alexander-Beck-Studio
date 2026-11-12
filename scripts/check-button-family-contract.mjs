import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sources = Object.fromEntries(await Promise.all([
  ['main', '../react-app/app/public/css/main.css'],
  ['styles', '../react-app/app/src/components/app/action-buttons.css'],
  ['overrides', '../react-app/app/src/components/app/button-styles.css'],
  ['rail', '../react-app/app/src/components/app/ShellUtilityControls.jsx'],
  ['buttonBar', '../react-app/app/src/components/app/shell-button-bar-dominant.css'],
  ['button', '../react-app/app/src/components/app/ActionButton.jsx'],
  ['input', '../react-app/app/src/lib/useButtonInteractions.js'],
  ['switcher', '../react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx'],
  ['shell', '../react-app/app/src/components/app/StudioShell.jsx'],
  ['copy', '../react-app/app/src/components/app/CopyEmailAction.jsx'],
  ['linkedin', '../react-app/app/src/components/app/LinkedInAction.jsx'],
  ['audit', '../react-app/app/src/routes/button-audit/ButtonAudit.jsx'],
  ['editor', '../react-app/app/src/routes/button-audit/ButtonStyleEditor.jsx'],
  ['auditStyles', '../react-app/app/src/routes/button-audit/button-audit.css'],
  ['vite', '../react-app/app/vite.config.js'],
  ['drawer', '../react-app/app/src/legacy/modules/portfolio/project-drawer.js'],
].map(async ([key, path]) => [key, await read(path)])));

test('all labelled actions use the shared component and the audit uses real actions', () => {
  for (const source of [sources.copy, sources.linkedin, sources.switcher]) {
    assert.match(source, /<ActionButton/);
    assert.doesNotMatch(source, /<button|useActionPress|pressProps/);
  }
  for (const component of ['CopyEmailAction', 'LinkedInAction', 'SimulationFocusSwitcher']) {
    assert.ok(sources.audit.includes(`<${component}`));
  }
  assert.match(sources.button, /variant === 'icon'/);
  assert.match(sources.button, /<ActionLabel>/);
  assert.match(sources.drawer, /abs-circular-utility/);
});

test('the Home action uses sentence case with no icon or handoff timer', () => {
  const switcher = sources.switcher.split('export function SimulationFocusSwitcher(')[1];
  assert.match(switcher, /variant="secondary"/);
  assert.match(switcher, /label="Change effect"/);
  assert.doesNotMatch(switcher, /RefreshCw|__icon|setTimeout|setAnimatedInlineSize|SWITCHER_HOLD/);
  assert.match(switcher, /aria-disabled=\{isAdvancing/);
  assert.match(sources.styles, /--abs-action-face-size: 36px;/);
  assert.match(sources.styles, /--abs-action-target-size: 48px;/);
});

test('one stylesheet owns action states without route-specific interaction forks', () => {
  for (const source of [sources.main, sources.auditStyles]) {
    assert.doesNotMatch(source, /\.(?:simulation-focus-pill|contact-linkedin-action|contact-email-row)(?::hover|:active|\[data-advancing[^\]]*\])\s*\{/);
    assert.doesNotMatch(source, /--abs-soft-control-translate-duration:/);
  }
  assert.doesNotMatch(sources.styles, /\.simulation-focus-pill/);
  assert.match(sources.styles, /\[data-action-pressed='true'\][\s\S]*?--abs-action-face: color-mix/);
  assert.match(sources.styles, /inset-block-start: calc\(var\(--abs-action-label-optical-y, 0px\) \+ var\(--abs-action-label-offset\)\)/);
  assert.match(sources.styles, /outline: var\(--abs-focus-ring-width\) solid currentColor/);
  assert.doesNotMatch(sources.styles, /soft-control-(?:press|lift)/);
  assert.doesNotMatch(sources.auditStyles, /data-action-pressed/);
});

test('the Button Bar has separate controls and separate style overrides', () => {
  assert.match(sources.rail, /inButtonBar \? '[^']*shell-tab[^']*' : 'abs-icon-btn abs-circular-utility'/);
  assert.match(sources.overrides, /:not\(:where\([\s\S]*?\.shell-tab/);
  assert.doesNotMatch(sources.overrides, /\.tactile-nav__face/);
  assert.doesNotMatch(sources.buttonBar, /--abs-button-(?:font-size|font-weight)/);
});

test('one delegated input handler covers current and dynamically inserted action controls', () => {
  assert.match(sources.input, /abs-labelled-action, \.abs-circular-utility\.abs-icon-btn/);
  assert.match(sources.input, /getAttribute\('aria-disabled'\) !== 'true'/);
  for (const event of ['pointerdown', 'pointerup', 'pointercancel', 'pointerout', 'keydown', 'keyup', 'focusout', 'dragstart']) {
    assert.ok(sources.input.includes(`${event}:`), event);
  }
  assert.match(sources.input, /removeEventListener\(event, listener, true\)/);
  assert.match(sources.input, /removeEventListener\('blur', release\)/);
  assert.match(sources.shell, /useButtonInteractions\(\)/);
  assert.match(sources.audit, /useButtonInteractions\(\)/);
});

test('copy feedback and reduced motion retain accessible state with stable label geometry', () => {
  assert.match(sources.copy, /contact-email-label--idle[\s\S]*?contact-email-label--copied[\s\S]*?contact-email-label--error/);
  assert.match(sources.copy, /aria-live="polite"/);
  assert.match(sources.styles, /\.abs-action-label::after \{[\s\S]*?visibility: hidden;/);
  assert.match(sources.styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?--abs-action-release: 0ms;/);
});

test('the button playground keeps real specimens and uses the canonical write path', () => {
  assert.doesNotMatch(sources.audit, /writeManualSimulationFocus/);
  assert.match(sources.audit, /URL\.revokeObjectURL/);
  assert.doesNotMatch(sources.audit, /<ShellButtonBar/);
  assert.match(sources.audit, /<ShellUtilityControls/);
  assert.match(sources.editor, /\/api\/design-system\/config/);
  assert.match(sources.editor, /expectedButtonStyles: saved/);
  assert.match(sources.auditStyles, /object-fit: cover/);
  assert.match(sources.vite, /mode === 'development'[\s\S]*?'lab\/button-audit': resolve\(__dirname, 'lab\/button-audit\.html'\)/);
});
