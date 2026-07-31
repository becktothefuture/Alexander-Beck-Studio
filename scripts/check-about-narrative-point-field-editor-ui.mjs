import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ABOUT_NARRATIVE_SHAPE_DEFINITIONS } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const component = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/PointFieldLane.jsx',
  import.meta.url,
), 'utf8');
const styles = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css',
  import.meta.url,
), 'utf8');
const canonical = JSON.parse(await readFile(new URL(
  '../react-app/app/public/config/contents-about.json',
  import.meta.url,
), 'utf8'));

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

test('Segment inspector keeps transition basics while hiding advanced path tuning', () => {
  [
    "'morph'",
    "'dissolve-morph'",
    "'hold'",
    "'step-end'",
    'ABOUT_NARRATIVE_EASINGS',
    'ABOUT_NARRATIVE_CORRESPONDENCE_MODES',
    'Split transition',
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
  [
    'function MotionFields',
    'InspectorFolder label="Stagger"',
    'InspectorFolder label="Organic path"',
    'InspectorFolder label="Plane motion"',
  ].forEach((token) => assert.equal(component.includes(token), false, `unexpected ${token}`));
  assert.ok(canonical.tracks.pointField.segments.some((segment) => (
    segment.transition.stagger || segment.transition.path || segment.transition.flatten
  )), 'existing authored transition motion remains in the document');
  assert.equal(component.includes('cubic-bezier'), false);
});

test('selecting a Forms key opens its linked reusable form controls', () => {
  [
    'pointKey={pointKey}',
    "eyebrow={pointKey ? 'Point field form' : 'Point field state'}",
    'InspectorFolder label="Key"',
    'label="Form"',
    'Make this form unique',
    'Form edits apply to every use.',
    'InspectorFolder label="Form"',
    "label: 'Size'",
    "label: 'Character'",
    "control.group === 'shape-dimensions'",
    'InspectorFolder label="Placement"',
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
  const formFolder = component.indexOf('InspectorFolder label="Form"');
  const shapeControls = component.indexOf('baseOnly && shapeControlGroups.map');
  const placementFolder = component.indexOf('InspectorFolder label="Placement"');
  assert.ok(formFolder < shapeControls && shapeControls < placementFolder, 'form controls must precede placement');
});

test('Discipline grid exposes only its supported form controls with schema limits', () => {
  const controls = ABOUT_NARRATIVE_SHAPE_DEFINITIONS['discipline-grid-v1'].parameters;
  assert.deepEqual(controls.map((control) => control.id), ['width', 'height', 'depthJitter', 'density']);
  assert.deepEqual(controls.map((control) => [control.min, control.max]), [
    [1, 48], [1, 32], [0, 3], [0.02, 1],
  ]);
  [
    'formControlLabel',
    "shapeId === 'discipline-grid-v1' && control.id === 'depthJitter'",
    "if (control.id === 'density') return 'Density';",
  ].forEach((token) => assert.ok(component.includes(token), `missing ${token}`));
  ['rowCount', 'columnCount', 'spacing', 'mask'].forEach((token) => (
    assert.equal(component.includes(token), false, `unexpected grid control: ${token}`)
  ));
});

test('Profile editing remains distinct from preview and makes inheritance visible', () => {
  [
    'Preview:',
    'Editing:',
    'profile override',
    'State library',
    'Duplicate state',
    'Delete unused state',
    'Make this form unique',
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
