import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getAboutNarrativePointFieldStateParticipationStartWU,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditing.js';

const source = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx',
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

test('schema v6 renders a Point field keyframe lane while v5 retains recovery fallback', () => {
  [
    'const LEGACY_TRACKS',
    'const POINT_FIELD_TRACKS',
    "{ id: 'world', label: 'World', type: 'world'",
    "{ id: 'point-field', label: 'Forms', type: 'point-field-key'",
    'pointFieldV6 ? POINT_FIELD_TRACKS : LEGACY_TRACKS',
    '<PointFieldLane',
    "track.id === 'point-field'",
    "if (trackId === 'point-field') return [];",
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
});

test('Point field inspector callbacks use only the nested transactional store API', () => {
  [
    '<PointFieldInspector',
    'store.pointField.beginMoveKey',
    'store.pointField.updateMoveKey',
    'store.pointField.beginMoveSegment',
    'store.pointField.updateMoveSegment',
    'store.pointField.beginPatch',
    'store.pointField.updatePatch',
    'store.pointField.commitGesture',
    'store.pointField.cancelGesture',
    'store.pointField.resetOverride',
    'store.pointField.makeKeyStateUnique',
    'store.pointField.duplicateState',
    'store.pointField.deleteState',
    'store.pointField.splitSegment',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  assert.equal(source.includes('writeAboutNarrativePointFieldTarget'), false);
});

test('Point field keys keep the timeline playhead aligned during selection and movement', async () => {
  const laneSource = await readFile(new URL(
    '../react-app/app/src/routes/about-narrative-lab/PointFieldLane.jsx',
    import.meta.url,
  ), 'utf8');
  [
    'const syncPointFieldPlayhead = useCallback((atWU) => {',
    'syncPointFieldPlayhead(result?.valid ? result.appliedAtWU : atWU);',
    'onSelect={(selection, atWU) => {',
    'syncPointFieldPlayhead(selectedPointFieldKeyWU);',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  assert.ok(laneSource.includes('onSelect?.(selection, Number(pointKey.atWU));'));
  assert.ok(laneSource.includes("atWU: cancelled ? gesture.startWU : gesture.latestWU"));
  assert.match(styles, /\.about-track-editor-playhead \{[\s\S]*?transform: translateX\(-50%\);/);
});

test('preview profile and Point field edit scope remain independent controls', () => {
  [
    'const [editScope, setEditScope]',
    'aria-label="Forms edit scope"',
    'snapshot.previewState.layoutProfile',
    '<option value="base">Base</option>',
    '<option value="desktop">Desktop override</option>',
    '<option value="tablet">Tablet override</option>',
    '<option value="mobile">Mobile override</option>',
    'editScope={editScope}',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  assert.ok(styles.includes('.about-track-editor-edit-scope'));
  assert.match(styles, /\.about-track-editor-edit-scope \{[\s\S]*?border-top: 1px solid var\(--editor-line\)/);
});

test('v6 persistence, recovery, local Save, export, and interaction labels target state IDs', () => {
  [
    '{ targetVersion: persistenceTargetVersion }',
    'targetVersion: persistenceTargetVersion',
    "'contents-about-v6.json'",
    'writeAboutNarrativeLocalSave(submission.document',
    "label={pointFieldV6 ? 'Target state ID' : 'Target World'}",
    'object.targetStateId',
    'snapshot.document.tracks.pointField.stateDefinitions',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
});

test('Slash remains exclusively owned by editor visibility outside typing controls', () => {
  [
    "event.key === '/' || event.code === 'Slash'",
    'setEditorVisible((visible) => !visible)',
    'event.stopImmediatePropagation()',
    'hidden={!editorVisible}',
    'aria-keyshortcuts="/"',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
});

test('ripple timing can start when its target state first participates in a transition', () => {
  const clip = canonical.tracks.interactions.clips.find((item) => (
    item.id === 'interaction-emergent-ripple'
  ));
  assert.equal(clip.startWU, 19.385);
  assert.equal(
    getAboutNarrativePointFieldStateParticipationStartWU(
      canonical.tracks.pointField,
      clip.targetStateId,
    ),
    19.385,
  );
  assert.ok(source.includes('getAboutNarrativePointFieldStateParticipationStartWU'));
});
