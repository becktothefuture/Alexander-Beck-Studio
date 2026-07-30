import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createEditorialModule,
  createUniqueDirectorId,
  duplicateDirectorArrayItem,
  moveDirectorArrayItem,
  parseDirectorSource,
  updateDirectorArrayItem,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDirectorText.js';
import {
  createAboutNarrativePointFieldEditorStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditorStore.js';

const canonical = JSON.parse(await readFile(new URL(
  '../react-app/app/public/config/contents-about.json',
  import.meta.url,
), 'utf8'));
const editor = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx',
  import.meta.url,
), 'utf8');

test('structured helpers keep stable IDs and untouched fields through edit, reorder, and duplicate', () => {
  const modules = [
    { id: 'alpha', kind: 'prose', text: 'Alpha', futureValidField: { preserved: true } },
    { id: 'beta', kind: 'prose', text: 'Beta' },
  ];
  const edited = updateDirectorArrayItem(modules, 0, (module) => ({ ...module, text: 'Changed' }));
  assert.deepEqual(edited[0].futureValidField, { preserved: true });
  assert.equal(modules[0].text, 'Alpha');

  const reordered = moveDirectorArrayItem(edited, 0, 1);
  assert.deepEqual(reordered.map((module) => module.id), ['beta', 'alpha']);
  assert.deepEqual(reordered[1].futureValidField, { preserved: true });

  const duplicated = duplicateDirectorArrayItem(reordered, 1, { fallback: 'module' });
  assert.deepEqual(duplicated.map((module) => module.id), ['beta', 'alpha', 'alpha-copy']);
  assert.deepEqual(duplicated[2].futureValidField, { preserved: true });
  assert.equal(createUniqueDirectorId('Alpha', duplicated.map((module) => module.id)), 'alpha-2');
});

test('module creation is deterministic and produces schema-ready required collections', () => {
  const prose = createEditorialModule('prose', []);
  const logo = createEditorialModule('logo-grid', [prose]);
  const interactive = createEditorialModule('interactive-stack', [prose, logo]);
  assert.equal(prose.id, 'paragraph');
  assert.equal(logo.id, 'logo-grid');
  assert.equal(logo.items.length, 1);
  assert.equal(interactive.items.length, 1);
  assert.equal(interactive.items[0].type, 'image');
});

test('advanced source parsing is lossless and reports local errors', () => {
  const source = '{"id":"block","kind":"prose","future":{"nested":true}}';
  assert.deepEqual(parseDirectorSource(source), {
    valid: true,
    value: { id: 'block', kind: 'prose', future: { nested: true } },
    error: '',
  });
  assert.match(parseDirectorSource('{broken').error, /^Invalid JSON:/);
  assert.match(parseDirectorSource('[]').error, /JSON object/);
});

test('one structured action is one atomic store command with undo and redo', () => {
  const store = createAboutNarrativePointFieldEditorStore(canonical, { baselineHash: 'baseline' });
  const field = store.getSnapshot().document.tracks.text.fields
    .find((item) => item.block?.kind === 'stack');
  const before = structuredClone(field.block.modules);
  const next = moveDirectorArrayItem(before, 0, 1);
  const committed = store.commit('Reorder editorial modules', (draft) => {
    const target = draft.tracks.text.fields.find((item) => item.id === field.id);
    target.block.modules = next;
  }, { selectionAfter: { type: 'text-field', id: field.id }, requireValid: true });
  assert.equal(committed, true);
  assert.equal(store.getSnapshot().history.undoLabel, 'Reorder editorial modules');
  assert.deepEqual(store.getSnapshot().document.tracks.text.fields
    .find((item) => item.id === field.id).block.modules.map((module) => module.id),
  next.map((module) => module.id));
  assert.equal(store.undo(), true);
  assert.deepEqual(store.getSnapshot().document.tracks.text.fields
    .find((item) => item.id === field.id).block.modules, before);
  assert.equal(store.redo(), true);
  assert.deepEqual(store.getSnapshot().document.tracks.text.fields
    .find((item) => item.id === field.id).block.modules.map((module) => module.id),
  next.map((module) => module.id));
});

test('editor wires structured workflows and a complete block source escape hatch', () => {
  [
    '<StructuredModulesEditor',
    '<StructuredPlainItemsEditor',
    '<StructuredEmphasisEditor',
    '<StructuredModuleItemsEditor',
    'Edit complete block source',
    'Advanced source ·',
    'aria-invalid={error',
    'data-diagnostic-path',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
});
