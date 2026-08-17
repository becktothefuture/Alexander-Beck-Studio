import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createAnnouncementDeduper } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDirectorDiagnostics.js';
import { ABOUT_NARRATIVE_CAMERA_FOG_CONTROLS } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const editor = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx',
  import.meta.url,
), 'utf8');
const styles = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css',
  import.meta.url,
), 'utf8');
const v2 = JSON.parse(await readFile(new URL(
  '../react-app/app/public/config/contents-about.json',
  import.meta.url,
), 'utf8'));

test('announcements are deduplicated before reaching the polite live region', () => {
  const announce = createAnnouncementDeduper();
  assert.equal(announce('Saved.'), 'Saved.');
  assert.equal(announce('Saved.'), '');
  assert.equal(announce('Unsaved changes.'), 'Unsaved changes.');
  assert.equal(announce(''), '');
  assert.ok(editor.includes('announcementDeduperRef.current'));
  assert.ok(editor.includes('aria-atomic="true"'));
});

test('modeless panels close without trapping focus and restore their triggers', () => {
  [
    'menuTriggerRef.current?.focus()',
    'diagnosticsTriggerRef.current?.focus()',
    "event.key === 'Escape'",
    'closeDiagnostics({ restoreFocus: false })',
    'role="dialog"',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
  assert.ok(!editor.includes("event.key !== 'Tab'"), 'modeless panels must not trap Tab');
  assert.ok(!editor.includes('document.activeElement === first'), 'modeless panels must not wrap focus');
  assert.ok(
    editor.includes("event.key === 'Escape' && diagnosticsOpen"),
    'the global editor shortcut handler must close Diagnostics after focus leaves the panel',
  );
});

test('shortcuts stay region scoped and Slash remains exclusive', () => {
  [
    'isEditorTypingTarget(target)',
    'isSlashKey(event)',
    'event.stopImmediatePropagation()',
    "!editorRef.current?.contains(target)",
    'if (controlOwnsKeyboard && !command) return;',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
});

test('save errors, inline errors, visible focus, effective targets, and reflow are explicit', () => {
  [
    'aria-disabled={!saveEligibility.allowed}',
    "aria-describedby={saveBlockingReason ? 'about-director-save-errors'",
    'data-save-allowed=',
    'setMessage(saveBlockingReason)',
    'className="about-director-save-block-reason about-director-visually-hidden"',
    'aria-live="polite"',
    "aria-invalid={error ? 'true'",
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
  [
    ".about-track-editor [aria-invalid='true']",
    '.about-director-inline-error',
    '@media (max-width: 700px)',
    'min-height: 44px',
    '@media (max-width: 380px)',
    '.about-director-visually-hidden',
    '.about-track-editor-clip::after',
    '.about-point-field-key::before',
    'width: max(44px, 100%)',
    '.about-track-editor-actions > .about-director-menu-root > button',
    'min-width: 44px',
  ].forEach((token) => assert.ok(styles.includes(token), `missing ${token}`));
});

test('timeline clips expose direct keyboard selection and Text-owned movement guards', () => {
  [
    'onClick={selectObject}',
    "event.key === 'Enter' || event.key === ' '",
    "['ArrowLeft', 'ArrowRight'].includes(event.key)",
    'if (!timingMovable) return;',
    'store.moveSelection(direction * (event.shiftKey ? 0.1 : 0.01))',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
});

test('V2 Director exposes shared, bounded fog controls with live gesture apply', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_CAMERA_FOG_CONTROLS.map((control) => control.id),
    ['distanceFogStartWU', 'distanceFogEndWU'],
  );
  assert.deepEqual(
    ABOUT_NARRATIVE_CAMERA_FOG_CONTROLS.map((control) => v2.globals.camera[control.id]),
    [7, 34],
  );

  const start = editor.indexOf('function DirectorCameraTrackInspector');
  const end = editor.indexOf('function DirectorCameraBeatInspector');
  const directorCamera = editor.slice(start, end);
  [
    "experienceVersion === 'v2'",
    "control.group === 'camera-fog'",
    'getBoundedCameraTrackControl',
    'data-director-camera-atmosphere',
    'RangeParameterField',
    'store.beginGesture',
    'store.updateGesture',
    'store.commitGesture',
    'requireValid: true',
  ].forEach((token) => assert.ok(directorCamera.includes(token), `missing ${token}`));
});

test('add disclosures use ordinary controls and conflict focus return is refreshed', () => {
  [
    "aria-controls={activeTrack.id === 'text'",
    'className="about-director-add-trigger"',
    'id="about-director-add-text"',
    'id="about-director-add-motion"',
    'menuTriggerRef.current = document.activeElement instanceof HTMLElement',
    'ref={documentMenuTriggerRef}',
  ].forEach((token) => assert.ok(editor.includes(token), `missing ${token}`));
  assert.ok(!editor.includes('role="menu"'), 'add disclosure must not claim menu semantics');
  assert.ok(!editor.includes('role="menuitem"'), 'add disclosure controls are ordinary buttons');
});
