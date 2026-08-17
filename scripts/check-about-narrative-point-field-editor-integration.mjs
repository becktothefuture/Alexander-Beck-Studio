import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

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

test('schema v7 defaults to a semantic Director projection while Advanced retains raw point-field authoring', () => {
  [
    'const LEGACY_TRACKS',
    'const DIRECTOR_TRACKS',
    'const ADVANCED_POINT_FIELD_TRACKS',
    "{ id: 'world', label: 'World', type: 'world'",
    "{ id: 'point-field', group: 'Visuals', label: 'Forms + effects', type: 'point-field-key'",
    "const [detailMode, setDetailMode] = useState('director')",
    '<DirectorPointFieldLane',
    '<PointFieldLane',
    "track.id === 'point-field'",
    "if (trackId === 'point-field') return [];",
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
});

test('Forms and Effects share one timeline lane and one header inspector', () => {
  const pointFieldTracks = source.slice(
    source.indexOf('const ADVANCED_POINT_FIELD_TRACKS'),
    source.indexOf('const TRACK_BY_ID'),
  );
  [
    'function FormSequenceTrackInspector',
    'data-form-effect-track-inspector',
    'inlineEffectControls',
    'function EffectPropertiesPanel',
    'onOpenInspector?.();',
    'label="Start WU"',
    'label="End WU"',
    'label="Duration WU"',
    'label="Motion type"',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  assert.doesNotMatch(pointFieldTracks, /id: 'interaction'/);
  assert.ok(styles.includes('.about-form-effect-sequences'));
  assert.ok(styles.includes('.about-form-effect-inline-controls'));
});

test('Director exposes three story-level lanes, named stages, and one coordinated finale handoff', () => {
  const directorTracks = source.slice(
    source.indexOf('const DIRECTOR_TRACKS'),
    source.indexOf('const ADVANCED_POINT_FIELD_TRACKS'),
  );
  assert.match(directorTracks, /label: 'Fixed moments'/);
  assert.match(directorTracks, /label: 'Camera journey'/);
  assert.match(directorTracks, /label: 'World sequence'/);
  assert.equal((directorTracks.match(/type:/g) || []).length, 3);
  [
    'DirectorCameraLane',
    'DirectorCameraBeatInspector',
    'DirectorWorldStageInspector',
    'DirectorFinaleHandoffInspector',
    'Condensed seed',
    'Reading nebula',
    'Ripple floor',
    'Emerging bust',
    'Text moments set page rhythm',
  ].forEach((token) => assert.ok(source.includes(token), `missing ${token}`));
  assert.ok(styles.includes("data-detail-mode='director'"));
  assert.ok(styles.includes('.about-director-handoff-map'));
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
  assert.ok(laneSource.includes('Do not let the timeline scrubber capture a direct Form'));
  assert.ok(laneSource.includes('Effects share the Form lane but own this lower hit band'));
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

test('one ripple envelope releases through orbit and hands off cleanly to bust assembly', () => {
  const clip = canonical.tracks.interactions.clips.find((item) => (
    item.id === 'interaction-grid-ripple'
  ));
  const next = canonical.tracks.interactions.clips.find((item) => (
    item.id === 'effect-world-emergent-bust-assembly'
  ));
  assert.equal(clip.startWU, 14);
  assert.equal(clip.activationWU, 14.9);
  assert.equal(clip.parameters.releaseWU, 2);
  assert.equal(clip.endWU, next.startWU);
  assert.equal(clip.targetStateId, 'world-grid');
  assert.equal(next.targetStateId, 'world-emergent');
  assert.ok(source.includes('momentBound={pointFieldV6}'));
});

test('v7 Text and Effects cannot create or duplicate loose timeline structure', () => {
  assert.ok(source.includes("!(pointFieldV6 && ['text', 'interaction'].includes(activeTrack.id))"));
  assert.ok(source.includes("!(pointFieldV6 && ['text-field', 'interaction'].includes(snapshot.selection.type))"));
});
