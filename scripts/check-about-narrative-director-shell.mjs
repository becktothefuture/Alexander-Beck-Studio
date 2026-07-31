import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const editor = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx',
  import.meta.url,
), 'utf8');
const styles = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css',
  import.meta.url,
), 'utf8');
const shell = editor.slice(editor.indexOf('export default function AboutNarrativeEditor'));

test('Director product identity stays separate from the document schema', () => {
  assert.ok(shell.includes('data-editor-product="about-director-3"'));
  assert.ok(shell.includes('About Director <sup>3.0</sup>'));
  assert.ok(shell.includes('Schema v{schemaVersion}'));
  assert.equal(shell.includes('<strong>About Timeline</strong>'), false);
  assert.equal(shell.includes('Save v${persistenceTargetVersion}'), false);
});

test('command bar keeps primary actions visible and moves secondary actions into More', () => {
  [
    'data-director-panel="command-bar"',
    'className={`about-director-source-dot',
    'aria-label="Timeline playhead"',
    'aria-keyshortcuts="Meta+Z Control+Z"',
    '>Undo</button>',
    'aria-controls="about-director-document-menu"',
    '>More</button>',
    'about-director-quick-actions',
    'role="dialog"',
    'aria-label="Director actions"',
    '<summary>Keyboard shortcuts</summary>',
    'Export current draft',
    'Create checkpoint',
    'Restore last saved',
  ].forEach((token) => assert.ok(shell.includes(token), `missing ${token}`));
  assert.ok(shell.includes("snapshot.dirty ? 'Save' : 'Saved'"));
  assert.equal(shell.includes("'Export draft'"), false);
});

test('dock states resize one stable Timeline instance', () => {
  assert.deepEqual(
    [...shell.matchAll(/<Timeline\b/g)].map((match) => match[0]),
    ['<Timeline'],
  );
  ['minimized', 'compact', 'expanded'].forEach((mode) => {
    assert.ok(editor.includes(`id: '${mode}'`), `missing ${mode} dock state`);
  });
  assert.ok(shell.includes('data-timeline-dock={timelineDock}'));
  assert.ok(shell.includes('dockMode={timelineDock}'));
  assert.ok(styles.includes(".about-track-editor[data-timeline-dock='minimized']"));
  assert.ok(styles.includes(".about-track-editor[data-timeline-dock='expanded']"));
});

test('all-tracks mode expands the stable timeline without changing the active editing track', () => {
  [
    'const [showAllTracks, setShowAllTracks] = useState(false)',
    'showAllTracks={showAllTracks}',
    'setShowAllTracks={setShowAllTracks}',
    'const visibleTracks = showAllTracks ? tracks : [activeTrack]',
    'aria-label="Show all timeline tracks"',
    'data-show-all-tracks={showAllTracks ? \'true\' : \'false\'}',
    'visibleTracks.map((track) => (',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
  assert.ok(styles.includes("[data-timeline-all-tracks='true']"));
  assert.ok(styles.includes("[data-show-all-tracks='true'] .about-track-editor-scroll"));
});

test('inspector is contextual and exposes durable panel state', () => {
  [
    'hasUsefulInspectorSelection(',
    'const inspectorVisible = usefulInspectorSelection && inspectorOpen',
    'data-inspector-open={inspectorVisible',
    'data-director-panel="inspector"',
    'hidden={!inspectorVisible}',
  ].forEach((token) => assert.ok(shell.includes(token), `missing ${token}`));
  assert.ok(styles.includes('.about-track-editor-inspector[hidden] { display: none; }'));
});

test('tablet inspector overlays without reducing preview geometry', () => {
  assert.match(styles, /@media \(max-width: 1199px\)[\s\S]*?--about-track-editor-inspector-width: 0px/);
  assert.match(styles, /@media \(max-width: 1199px\)[\s\S]*?\.about-track-editor-inspector \{[\s\S]*?right: 8px;[\s\S]*?bottom: calc\(var\(--about-director-timeline-height\) \+ 8px\);[\s\S]*?width: 316px;/);
});

test('phone and short landscape use mutually exclusive Timeline and Inspector sheets', () => {
  [
    'data-phone-sheet={phoneSheet}',
    'aria-label="Phone authoring panel"',
    "phoneSheet === 'timeline'",
    "phoneSheet === 'inspector'",
  ].forEach((token) => assert.ok(shell.includes(token), `missing ${token}`));
  assert.match(styles, /@media \(max-width: 700px\), \(max-height: 520px\) and \(orientation: landscape\)/);
  assert.ok(styles.includes(".about-track-editor[data-phone-sheet='timeline'] .about-track-editor-inspector"));
  assert.ok(styles.includes(".about-track-editor[data-phone-sheet='inspector'] .about-track-editor-timeline"));
  assert.match(styles, /@media \(max-height: 520px\) and \(orientation: landscape\)[\s\S]*?--about-director-timeline-height: min\(42vh, calc\(100vh - 118px\)\)/);
  assert.match(styles, /@media \(max-height: 520px\) and \(orientation: landscape\)[\s\S]*?data-phone-sheet='inspector'[\s\S]*?height: calc\(100vh - 98px\)/);
});

test('preview and authoring profiles remain separate Director controls', () => {
  assert.ok(shell.includes('data-director-panel="preview-controls"'));
  assert.ok(shell.includes('snapshot.previewState.layoutProfile'));
  assert.ok(shell.includes('value={editScope}'));
  assert.ok(shell.includes('<option value="base">Base</option>'));
  assert.ok(shell.includes('<option value="tablet">Tablet override</option>'));
});
