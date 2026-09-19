import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { ABOUT_SCENE_CONTROL_REGISTRY } from '../about-narrative-lab/aboutSceneControlRegistry.js';
import {
  loadAboutNarrativeSource,
  saveAboutNarrativeSource,
} from '../about-narrative-lab/aboutNarrativePersistence.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  validateAboutNarrativePointFieldDocument,
} from '../about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  ABOUT_VISIBILITY_CONTROLS,
  getRollercoasterAppearanceState,
  getRollercoasterVisibilityBounds,
  loadRollercoasterAppearance,
  revertRollercoasterAppearance,
  saveRollercoasterAppearance,
  setRollercoasterAppearance,
  subscribeRollercoasterAppearance,
} from './rollercoasterAppearance.js';
import '../about-narrative-lab/about-narrative-parameters.css';
import './rollercoaster-controls.css';

const PERSISTENCE_OPTIONS = Object.freeze({
  scope: 'main',
  targetVersion: ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
});
const COPY_KEYS = Object.freeze({
  text: 'Text', description: 'Description', label: 'Label', yearLabel: 'Years',
  employer: 'Employer', role: 'Role', alt: 'Alternative text',
});
const TYPE_CONTROLS = ABOUT_SCENE_CONTROL_REGISTRY.typography;
const clone = value => structuredClone(value);
const sameDocument = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const readPath = (document, path) => path.reduce((value, key) => value?.[key], document);
const readableId = value => String(value || '').replace(/^text-/, '').replaceAll('-', ' ');

// Only reader-facing strings are editable. IDs, assets, timing and scene
// controls are never discovered by a generic object/property editor.
function listCopyControls(document) {
  const controls = [];
  for (const [index, field] of (document?.tracks?.text?.fields || []).entries()) {
    if (field.publishable !== true) continue;
    const fieldLabel = field.text || field.block?.label || readableId(field.id);
    const add = (node, path, context = '') => {
      for (const [key, label] of Object.entries(COPY_KEYS)) {
        if (typeof node?.[key] !== 'string') continue;
        const propertyPath = [...path, key];
        controls.push({
          id: propertyPath.join('.'), path: propertyPath,
          fieldId: field.id, fieldLabel,
          label: context ? `${context} · ${label}` : key === 'text' && field.kind === 'title' ? 'Title' : label,
          value: node[key],
        });
      }
      for (const [childIndex, child] of (node?.modules || []).entries()) {
        add(child, [...path, 'modules', childIndex], readableId(child.id));
      }
      for (const [childIndex, child] of (node?.items || []).entries()) {
        const childPath = [...path, 'items', childIndex];
        if (typeof child === 'string') {
          controls.push({
            id: childPath.join('.'), path: childPath, fieldId: field.id, fieldLabel,
            label: `${context} · Item ${childIndex + 1}`, value: child,
          });
        } else {
          add(child, childPath, child.employer || child.label || readableId(child.id));
        }
      }
      if (node?.independentWork) add(node.independentWork, [...path, 'independentWork'], 'Independent work');
    };
    const path = ['tracks', 'text', 'fields', index];
    add(field, path);
    if (field.block) add(field.block, [...path, 'block']);
  }
  return controls;
}

function editContentDocument(document, controlId, value) {
  const typography = TYPE_CONTROLS.find(control => `globals.typography.${control.id}` === controlId);
  const copy = typography ? null : listCopyControls(document).find(control => control.id === controlId);
  if (!typography && !copy) throw new Error('This value is not a website copy or typography control.');
  if (typography && (!Number.isFinite(value) || value < typography.min || value > typography.max)) {
    throw new Error(`${typography.label} must be between ${typography.min} and ${typography.max}.`);
  }
  if (copy && typeof value !== 'string') throw new Error('Copy must be plain text.');
  const path = typography ? ['globals', 'typography', typography.id] : copy.path;
  const next = clone(document);
  readPath(next, path.slice(0, -1))[path.at(-1)] = value;
  const errors = validateAboutNarrativePointFieldDocument(next).filter(item => item.level === 'error');
  if (errors.length) throw new Error(errors.map(item => item.message).join(' '));
  return next;
}

// This session owns only an unsaved draft and a source hash. The existing
// persistence boundary remains the sole canonical save/validation path.
function createContentEditor(initialDocument, {
  loadSource = loadAboutNarrativeSource,
  saveSource = saveAboutNarrativeSource,
} = {}) {
  const listeners = new Set();
  let operation = 0;
  let snapshot = {
    document: clone(initialDocument), baseline: clone(initialDocument), hash: '',
    status: 'idle', dirty: false, conflict: false, inputError: '',
    message: 'Open the panel to load the canonical copy.', resetRevision: 0,
  };
  const publish = patch => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach(listener => listener());
  };
  const busy = () => ['loading', 'saving'].includes(snapshot.status);
  const editor = {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async load({ discard = false } = {}) {
      if (busy()) return false;
      if ((snapshot.dirty || snapshot.inputError) && !discard) return false;
      const request = ++operation;
      publish({ status: 'loading', message: 'Loading canonical copy…' });
      try {
        const source = await loadSource(PERSISTENCE_OPTIONS);
        if (request !== operation) return false;
        if (!source.hash) throw new Error('The canonical source hash is unavailable.');
        publish({
          document: clone(source.document), baseline: clone(source.document), hash: source.hash,
          status: 'ready', dirty: false, conflict: false, inputError: '',
          message: 'Canonical copy ready.', resetRevision: snapshot.resetRevision + 1,
        });
        return true;
      } catch (error) {
        if (request !== operation) return false;
        publish({
          status: error.code === 'future-schema' ? 'read-only' : 'failed',
          message: error.message || 'The canonical copy could not be loaded.',
        });
        return false;
      }
    },
    change(controlId, value) {
      if (snapshot.status !== 'ready') return false;
      try {
        const document = editContentDocument(snapshot.document, controlId, value);
        publish({ document, dirty: !sameDocument(document, snapshot.baseline), inputError: '', message: 'Unsaved copy or typography changes.' });
        return true;
      } catch (error) {
        publish({ inputError: error.message, message: error.message });
        return false;
      }
    },
    revert() {
      if (busy()) return false;
      publish({
        document: clone(snapshot.baseline), dirty: false, inputError: '',
        message: snapshot.conflict ? 'Draft reverted. Reload the changed source before editing.' : 'Reverted to the last loaded copy.',
        resetRevision: snapshot.resetRevision + 1,
      });
      return true;
    },
    canSave() {
      return snapshot.status === 'ready' && snapshot.dirty && Boolean(snapshot.hash)
        && !snapshot.conflict && !snapshot.inputError;
    },
    async save() {
      if (!editor.canSave()) return false;
      const document = clone(snapshot.document);
      const hash = snapshot.hash;
      const request = ++operation;
      publish({ status: 'saving', message: 'Saving canonical copy…' });
      try {
        const saved = await saveSource(document, hash, PERSISTENCE_OPTIONS);
        if (request !== operation) return false;
        publish({
          document: clone(saved.document), baseline: clone(saved.document), hash: saved.hash,
          status: 'ready', dirty: false, conflict: false,
          message: 'Saved to contents-about.json.', resetRevision: snapshot.resetRevision + 1,
        });
        return true;
      } catch (error) {
        if (request !== operation) return false;
        publish({
          status: error.code === 'future-schema' ? 'read-only' : 'ready',
          conflict: error.status === 409,
          message: error.status === 409
            ? 'Source changed. Your draft is kept. Discard & reload to use the new source.'
            : error.message || 'Save failed. Your draft is kept.',
        });
        return false;
      }
    },
  };
  return editor;
}

function editorEnabled(development, search = '') {
  return Boolean(development) && new URLSearchParams(search).get('edit') !== '0';
}

function editorShortcut(event) {
  const typing = event.target?.isContentEditable || event.target?.closest?.('input, textarea, select, [contenteditable="true"]');
  if (typing || event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.isComposing) return false;
  return event.key === '/' || event.code === 'Slash';
}

function Folder({ label, count, children, open = false }) {
  return (
    <details className="parameterizer-folder" open={open || undefined}>
      <summary className="parameterizer-folder-title"><span>{label}</span><small>{count}</small></summary>
      {children}
    </details>
  );
}

function CopyInput({ control, editor, disabled, invalid }) {
  const [value, setValue] = useState(control.value);
  return (
    <div className="rollercoaster-controls__copy">
      <label htmlFor="rollercoaster-copy-value" title={control.label}>{control.label}</label>
      <textarea
        id="rollercoaster-copy-value"
        aria-label={`${control.fieldLabel} · ${control.label}`}
        aria-describedby="rollercoaster-controls-message"
        aria-invalid={invalid || undefined}
        value={value}
        disabled={disabled}
        spellCheck
        onChange={(event) => {
          setValue(event.target.value);
          editor.change(control.id, event.target.value);
        }}
      />
    </div>
  );
}

function CopyControls({ snapshot, editor, disabled }) {
  const controls = listCopyControls(snapshot.document);
  const fields = [...new Map(controls.map(control => [control.fieldId, control.fieldLabel])).entries()];
  const [selectedField, setSelectedField] = useState(fields[0]?.[0]);
  const [selectedControl, setSelectedControl] = useState('');
  const fieldId = fields.some(([id]) => id === selectedField) ? selectedField : fields[0]?.[0];
  const fieldControls = controls.filter(control => control.fieldId === fieldId);
  const control = fieldControls.find(item => item.id === selectedControl) || fieldControls[0];
  if (!control) return <p className="about-scene-parameter-panel__note">No published copy is available.</p>;
  return (
    <>
      <label className="parameterizer-row" htmlFor="rollercoaster-copy-passage">
        <span className="parameterizer-label">Passage</span>
        <select id="rollercoaster-copy-passage" value={fieldId} disabled={disabled || Boolean(snapshot.inputError)} onChange={event => setSelectedField(event.target.value)}>
          {fields.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <label className="parameterizer-row" htmlFor="rollercoaster-copy-part">
        <span className="parameterizer-label">Copy field</span>
        <select id="rollercoaster-copy-part" value={control.id} disabled={disabled || Boolean(snapshot.inputError)} onChange={event => setSelectedControl(event.target.value)}>
          {fieldControls.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <CopyInput key={`${control.id}:${snapshot.resetRevision}`} control={control} editor={editor} disabled={disabled} invalid={Boolean(snapshot.inputError)} />
    </>
  );
}

function TypeControls({ snapshot, editor, disabled }) {
  return TYPE_CONTROLS.map((control) => {
    const id = `globals.typography.${control.id}`;
    const value = snapshot.document.globals.typography[control.id] ?? control.defaultValue;
    return (
      <label key={id} className="parameterizer-row" htmlFor={id} title={control.label}>
        <span className="parameterizer-label">{control.label}</span>
        <span className="parameterizer-control">
          <input id={id} type="range" min={control.min} max={control.max} step={control.step} value={value}
            disabled={disabled || Boolean(snapshot.inputError)} onChange={event => editor.change(id, Number(event.target.value))} />
          <output className="parameterizer-value" htmlFor={id}>{Number(value).toFixed(2)}{control.unit}</output>
        </span>
      </label>
    );
  });
}

function VisibilityControls({ appearance, disabled, onError }) {
  return <>
    {ABOUT_VISIBILITY_CONTROLS.map((control) => {
      const bounds = getRollercoasterVisibilityBounds(control.id, appearance.config);
      const id = `about-visibility-${control.id}`;
      return <label key={id} className="parameterizer-row" htmlFor={id} title={control.label}>
        <span className="parameterizer-label">{control.label}</span>
        <span className="parameterizer-control">
          <input id={id} type="range" min={bounds.min} max={bounds.max} step={control.step}
            value={appearance.config[control.id]} disabled={disabled || appearance.status !== 'ready'}
            onChange={(event) => {
              try { setRollercoasterAppearance({ [control.id]: Number(event.target.value) }); }
              catch (error) { onError(error.message); }
            }} />
          <output className="parameterizer-value" htmlFor={id}>{appearance.config[control.id].toFixed(2)} {control.unit}</output>
        </span>
      </label>;
    })}
    <p className="about-scene-parameter-panel__note">Ball size linked to Home at 50%. Matched at 8 units; perspective varies with distance.</p>
  </>;
}

async function savePanelChanges(editor, appearance = {
  getState: getRollercoasterAppearanceState,
  save: saveRollercoasterAppearance,
}) {
  const copy = editor.getSnapshot();
  const visibility = appearance.getState();
  if (copy.inputError || (copy.dirty && !editor.canSave())) throw new Error(`Copy not saved. ${copy.message}`);
  if (visibility.dirty && visibility.status !== 'ready') throw new Error(`Visibility not saved. ${visibility.message}`);
  // Design-system persistence can reload the page. Commit valid copy first.
  if (copy.dirty && !await editor.save()) throw new Error(`Copy not saved. ${editor.getSnapshot().message}`);
  if (visibility.dirty) {
    try { await appearance.save(); }
    catch (error) { throw new Error(`${copy.dirty ? 'Copy saved. ' : ''}Visibility not saved. ${error.message}`, { cause: error }); }
  }
  if (copy.dirty && visibility.dirty) return 'Copy, typography and visibility saved.';
  if (visibility.dirty) return 'Visibility settings saved.';
  return 'Copy and typography saved.';
}

function SourceInspector({ meta }) {
  if (!meta) return <p className="about-scene-parameter-panel__note">Waiting for the saved Blender scene.</p>;
  const values = [
    ['Schema', meta.schema], ['Source file', meta.source?.file], ['Source SHA-256', meta.source?.sha256],
    ['Camera SHA-256', meta.cameraSha256], ['Geometry SHA-256', meta.geometry?.sha256],
    ['Surface objects', meta.geometry?.objectCount],
    ['Reference seconds', meta.referenceSeconds], ['Rail length', meta.totalDistanceWU],
    ['Circle density', 'Browser code · rollercoasterField.js'],
  ];
  const sourceControls = (meta.controls || []).filter(control => !String(control.binding).startsWith('fog.') && !['fogNear', 'fogFar'].includes(control.key));
  return (
    <div className="rollercoaster-controls__source" data-rollercoaster-source-inspector>
      <p className="about-scene-parameter-panel__note">Read only · Blender owns surfaces, colour roles, timing and motion. Browser code generates the circles and owns their density.</p>
      <dl>{values.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Not supplied'}</dd></div>)}</dl>
      {sourceControls.length ? <>
        <h3>Saved source controls</h3>
        <dl>{sourceControls.map(control => <div key={control.key}>
          <dt>{control.label}</dt>
          <dd>{JSON.stringify(control.baseline)} {control.unit}{control.range ? ` · allowed ${control.range.join('–')}` : ''}</dd>
        </div>)}</dl>
      </> : null}
      <h3>Authored beat budgets</h3>
      <dl>{(meta.beats || []).map(beat => <div key={beat.id}>
        <dt>{beat.id} · {beat.kind}</dt>
        <dd>{(beat.start * 100).toFixed(1)}–{(beat.end * 100).toFixed(1)}% · {beat.scrollScreens} viewport heights</dd>
      </div>)}</dl>
      <p className="about-scene-parameter-panel__note">Measured copy can extend reading budgets. The source owns the physical endpoints.</p>
      <h3>Authored motion</h3>
      <pre aria-label="Read-only Blender motion groups">{JSON.stringify(meta.motionGroups || [], null, 2)}</pre>
    </div>
  );
}

function DockedControls({ document, onDocumentChange, sourceMeta, disabled }) {
  const [editor] = useState(() => createContentEditor(document));
  const snapshot = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);
  const appearance = useSyncExternalStore(subscribeRollercoasterAppearance, getRollercoasterAppearanceState, getRollercoasterAppearanceState);
  const [visible, setVisible] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const panel = useRef(null);
  const previousFocus = useRef(null);
  const lastAppliedDocument = useRef(snapshot.document);
  const onChange = useRef(onDocumentChange);

  useEffect(() => { onChange.current = onDocumentChange; }, [onDocumentChange]);
  useEffect(() => {
    if (lastAppliedDocument.current === snapshot.document) return;
    lastAppliedDocument.current = snapshot.document;
    onChange.current(snapshot.document);
  }, [snapshot.document]);

  useEffect(() => {
    const handleKey = (event) => {
      if (editorShortcut(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setVisible(value => !value);
      } else if (event.key === 'Escape' && visible && !event.isComposing) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handleKey, { capture: true });
    return () => window.removeEventListener('keydown', handleKey, { capture: true });
  }, [visible]);

  useEffect(() => {
    if (!visible) return undefined;
    previousFocus.current = window.document.activeElement;
    panel.current?.focus();
    if (editor.getSnapshot().status === 'idle') void editor.load();
    if (getRollercoasterAppearanceState().status === 'idle') void loadRollercoasterAppearance().catch(() => false);
    return () => {
      if (previousFocus.current?.isConnected) previousFocus.current.focus?.({ preventScroll: true });
    };
  }, [editor, visible]);

  const busy = actionBusy || ['loading', 'saving'].includes(snapshot.status) || ['loading', 'saving'].includes(appearance.status);
  const readOnly = disabled || busy || snapshot.status !== 'ready';
  const hasDraft = snapshot.dirty || Boolean(snapshot.inputError) || appearance.dirty;
  const report = text => setActionMessage({ text, document: editor.getSnapshot().document, appearance: getRollercoasterAppearanceState().config });
  const save = async () => {
    setActionBusy(true);
    try { report(await savePanelChanges(editor)); }
    catch (error) { report(error.message); }
    finally { setActionBusy(false); }
  };
  const reload = async () => {
    setActionBusy(true);
    const [copy, visibility] = await Promise.allSettled([
      editor.load({ discard: hasDraft }), loadRollercoasterAppearance({ forceReload: true }),
    ]);
    report([
      copy.status === 'fulfilled' && copy.value ? 'Copy reloaded.' : `Copy reload failed. ${editor.getSnapshot().message}`,
      visibility.status === 'fulfilled' ? 'Visibility reloaded.' : `Visibility reload failed. ${visibility.reason.message}`,
    ].join(' '));
    setActionBusy(false);
  };
  const revert = () => {
    editor.revert();
    revertRollercoasterAppearance();
    report(`${editor.getSnapshot().message} ${getRollercoasterAppearanceState().message}`);
  };
  const message = snapshot.inputError || (actionMessage?.document === snapshot.document && actionMessage?.appearance === appearance.config
    ? actionMessage.text : `${snapshot.message} ${appearance.message}`);
  const canSave = hasDraft && !snapshot.inputError && !busy
    && (!snapshot.dirty || editor.canSave()) && (!appearance.dirty || appearance.status === 'ready');
  const status = snapshot.inputError ? 'Check copy' : snapshot.conflict ? 'Source changed'
    : appearance.status === 'conflict' ? 'Source changed'
      : busy ? 'Working…'
        : snapshot.status === 'failed' || snapshot.status === 'read-only' || appearance.status === 'failed' ? 'Source unavailable'
          : hasDraft ? 'Unsaved' : 'Saved';

  return createPortal(
    <aside ref={panel} hidden={!visible} tabIndex={-1}
      className="parameterizer-panel about-scene-parameter-panel rollercoaster-controls"
      data-about-rollercoaster-controls data-panel-state={status}
      data-source-sha256={sourceMeta?.source?.sha256 || ''}
      data-global-keyboard-shortcuts={visible ? 'suspended' : undefined}
      data-keyboard-shortcuts="local" aria-keyshortcuts="/" aria-label="About parameters">
      <header className="parameterizer-header">
        <div><strong>About</strong><span>parameters</span></div>
        <div>
          <button type="button" disabled={busy || disabled} onClick={reload}>
            {hasDraft ? 'Discard & reload' : 'Reload'}
          </button>
          <button type="button" onClick={() => setVisible(false)} aria-label="Close About controls">Close</button>
        </div>
      </header>
      <p className="about-scene-parameter-panel__note">Scene, copy and typography. Press / to toggle.</p>
      <div className="parameterizer-scroll">
        <Folder label="Visibility corridor" count={ABOUT_VISIBILITY_CONTROLS.length} open>
          <VisibilityControls appearance={appearance} disabled={disabled || busy} onError={report} />
        </Folder>
        <Folder label="Copy" count={snapshot.document.tracks.text.fields.length} open>
          <CopyControls snapshot={snapshot} editor={editor} disabled={readOnly} />
        </Folder>
        <Folder label="Typography" count={TYPE_CONTROLS.length}>
          <TypeControls snapshot={snapshot} editor={editor} disabled={readOnly} />
        </Folder>
        <Folder label="Blender source" count="Read only">
          <SourceInspector meta={sourceMeta} />
        </Folder>
        <p id="rollercoaster-controls-message" className="about-scene-parameter-panel__note" role="status" aria-live="polite">
          {message}
        </p>
      </div>
      <footer className="parameterizer-actions">
        <output title={message}>{status}</output>
        <button type="button" disabled={!hasDraft || busy || disabled} onClick={revert}>Revert</button>
        <button type="button" disabled={disabled || !canSave} onClick={save}>Save</button>
      </footer>
    </aside>, window.document.body,
  );
}

export default function AboutRollercoasterControls({ document, onDocumentChange, sourceMeta = null, disabled = false }) {
  if (!editorEnabled(__DEV__, typeof window === 'undefined' ? '' : window.location.search)) return null;
  return <DockedControls document={document} onDocumentChange={onDocumentChange} sourceMeta={sourceMeta} disabled={disabled} />;
}
