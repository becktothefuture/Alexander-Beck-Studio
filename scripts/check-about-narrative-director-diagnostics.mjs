import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  describeAboutDirectorDiagnostic,
  resolveAboutDirectorDiagnostic,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDirectorDiagnostics.js';

const canonical = JSON.parse(await readFile(new URL(
  '../react-app/app/public/config/contents-about.json',
  import.meta.url,
), 'utf8'));
const editor = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx',
  import.meta.url,
), 'utf8');

test('Point field index paths resolve to stable selection IDs and Story WU', () => {
  const keyIndex = 2;
  const key = canonical.tracks.pointField.keys[keyIndex];
  const resolvedKey = resolveAboutDirectorDiagnostic(canonical, {
    path: `tracks.pointField.keys.${keyIndex}.atWU`,
  });
  assert.deepEqual(resolvedKey.selection, { type: 'point-field-key', id: key.id });
  assert.equal(resolvedKey.storyWU, key.atWU);

  const segmentIndex = 1;
  const segment = canonical.tracks.pointField.segments[segmentIndex];
  const resolvedSegment = resolveAboutDirectorDiagnostic(canonical, {
    path: `tracks.pointField.segments.${segmentIndex}.transition.easing`,
  });
  assert.deepEqual(resolvedSegment.selection, { type: 'point-field-segment', id: segment.id });
  assert.equal(resolvedSegment.property, 'easing');
});

test('Text paths keep mapping to the same stable object after reorder', () => {
  const reordered = structuredClone(canonical);
  const [field] = reordered.tracks.text.fields.splice(3, 1);
  reordered.tracks.text.fields.unshift(field);
  const resolved = describeAboutDirectorDiagnostic(reordered, {
    level: 'error',
    code: 'unsafe-text',
    path: 'tracks.text.fields.0.block.modules.0.text',
    message: 'Text is not valid.',
  });
  assert.deepEqual(resolved.selection, { type: 'text-field', id: field.id });
  assert.equal(resolved.property, 'text');
  assert.match(resolved.object, new RegExp(field.id));
  assert.equal(resolved.focusId, 'diagnostic:tracks.text.fields.0.block.modules.0.text');
});

test('diagnostics drawer exposes complete columns and Show selection/focus flow', () => {
  [
    'Document health',
    '<th>Severity</th>',
    '<th>Object / segment</th>',
    '<th>Property</th>',
    '<th>Message</th>',
    '>Show</button>',
    'store.pointField.select(resolved.selection)',
    'store.setSelection(resolved.selection)',
    'data-diagnostic-path',
    'findDiagnosticControl(root?.querySelector',
    "selectionType === 'point-field-key'",
    "selectionType === 'point-field-segment'",
    "selectionType === 'point-field-state'",
    "selectionType === 'camera-key'",
    "selectionType === 'visibility-key'",
    "selectionType === 'interaction'",
    "folder: 'Organic path'",
    "folder: 'Camera rig'",
    'target?.focus()',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
  assert.ok(
    editor.includes("type: 'Motion type'"),
    'interaction type diagnostics must target the visible Motion type control',
  );
  assert.ok(
    editor.includes('diagnosticPath={`${interactionPath}.type`}'),
    'Motion type must expose its exact diagnostic path for direct Show focus',
  );
});
