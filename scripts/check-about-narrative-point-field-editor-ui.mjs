import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const component = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/PointFieldLane.jsx',
  import.meta.url,
), 'utf8');
const styles = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css',
  import.meta.url,
), 'utf8');

test('Point field editor exposes one lane with fixed key, segment, and state selections', () => {
  [
    'export function PointFieldLane',
    'export function PointFieldInspector',
    "type: 'point-field-key'",
    "type: 'point-field-segment'",
    "type: 'point-field-state'",
    'data-point-field-edit-scope',
    'data-point-field-preview-profile',
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
});

test('Point field gestures preserve transaction phases and explicit edit scope', () => {
  ['begin', 'preview', 'commit'].forEach((phase) => {
    assert.ok(component.includes(`phase: '${phase}'`), `missing ${phase} transaction phase`);
  });
  assert.ok(component.includes("'cancel'"), 'missing cancel transaction phase');
  assert.match(component, /onMoveKey\?\.\(\{[\s\S]*?scope: editScope/);
  assert.match(component, /onMoveSegment\?\.\(\{[\s\S]*?scope: editScope/);
  assert.ok(component.includes('gestureRef.current = false'));
});

test('Segment inspector uses named transition controls without free-form easing curves', () => {
  [
    "'morph'",
    "'dissolve-morph'",
    "'hold'",
    "'step-end'",
    'ABOUT_NARRATIVE_EASINGS',
    'ABOUT_NARRATIVE_CORRESPONDENCE_MODES',
    'ABOUT_NARRATIVE_POINT_FIELD_STAGGER_MODES',
    'ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES',
    'ABOUT_NARRATIVE_POINT_FIELD_FLATTEN_MODES',
    'Split transition',
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
  assert.equal(component.includes('cubic-bezier'), false);
});

test('Profile editing remains distinct from preview and makes inheritance visible', () => {
  [
    'Preview:',
    'Editing:',
    'profile override',
    'State library',
    'Duplicate state',
    'Delete unused state',
    'Make this state unique',
    'Reset {titleCase(editScope)} override',
    'inherit from Base',
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
  assert.ok(styles.includes('.about-point-field-key-ghost'));
  assert.ok(styles.includes('.about-point-field-override-badge'));
});

test('Point field controls retain editor accessibility and responsive affordances', () => {
  [
    'aria-pressed={selected}',
    'aria-label="Point field state library"',
    'role="group"',
    'onKeyDown',
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
  assert.ok(component.includes('role="group" aria-label="Point field state library"'));
  assert.equal(component.includes('role="listitem"'), false);
  assert.ok(component.includes('index - ((ids.length - 1) / 2)'));
  assert.match(styles, /\.about-point-field-key[\s\S]*?min-width: 24px;[\s\S]*?min-height: 24px !important;/);
  assert.match(
    styles,
    /\.about-point-field-key \{[\s\S]*?filter: none !important;[\s\S]*?transform: translate\(-50%, -50%\) !important;/,
    'global button hover and press effects must not move or blur timeline keys',
  );
  assert.match(styles, /top: calc\(27px \+ \(var\(--point-key-stack, 0\) \* 24px\)\)/);
  assert.match(styles, /@media \(max-width: 700px\)[\s\S]*?\.about-point-field-state-library > button \{ min-height: 52px; \}/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
