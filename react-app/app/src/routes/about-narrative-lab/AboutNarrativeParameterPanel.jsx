import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS,
} from './aboutNarrativeDefinitions.js';
import {
  loadAboutNarrativeSource,
  saveAboutNarrativeSource,
} from './aboutNarrativePersistence.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
} from './aboutNarrativePointFieldSchema.js';
import './about-narrative-parameters.css';

const PANEL_SELECTION = Object.freeze({ type: 'track', id: 'effects' });
const PERSISTENCE_OPTIONS = Object.freeze({
  scope: 'main',
  targetVersion: ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
});

function getRideState(document) {
  return document.tracks.pointField.stateDefinitions.find(
    (state) => state.shapeId === 'long-assembly-corridor-v1',
  );
}

function readParameter(snapshot, entry) {
  if (entry.scope === 'session') {
    return snapshot[entry.control.id] ?? entry.control.defaultValue;
  }
  const { document } = snapshot;
  if (entry.scope === 'long-assembly') {
    return getRideState(document)?.shapeParameters?.[entry.control.id]
      ?? entry.control.defaultValue;
  }
  return entry.path.reduce((value, key) => value?.[key], document.globals)
    ?? entry.control.defaultValue;
}

function mutateParameter(document, entry, value) {
  if (entry.scope === 'long-assembly') {
    const state = getRideState(document);
    if (state) state.shapeParameters[entry.control.id] = value;
    return;
  }
  const leaf = entry.path.at(-1);
  const target = entry.path.slice(0, -1).reduce((value, key) => value[key], document.globals);
  target[leaf] = value;
}

function formatValue(value, step) {
  const numericStep = Number(step);
  const decimals = numericStep >= 1
    ? 0
    : Math.min(3, Math.max(0, String(numericStep).split('.')[1]?.length || 0));
  return Number(value).toFixed(decimals);
}

function ParameterRow({ disabled, entry, groupLabel, store, value }) {
  const control = entry.control;
  const controlId = `about-scene-${entry.scope}-${entry.path.join('-')}`;
  if (control.type === 'select') {
    return (
      <label className="parameterizer-row" htmlFor={controlId} title={control.label}>
        <span className="parameterizer-label">{control.label}</span>
        <span className="parameterizer-control parameterizer-control--select">
          <select
            id={controlId}
            value={value}
            aria-label={`${groupLabel} ${control.label}`}
            onChange={(event) => store.setQualityTier(event.target.value)}
          >
            {control.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <span className="parameterizer-session-badge">Session</span>
        </span>
      </label>
    );
  }
  const label = `Edit ${control.label}`;
  const beginGesture = () => {
    if (disabled || store.getSnapshot().gestureState) return;
    store.beginGesture(label, { selection: PANEL_SELECTION });
  };
  const updateValue = (nextValue) => {
    if (!Number.isFinite(nextValue)) return;
    if (store.getSnapshot().gestureState) {
      store.updateGesture(
        (draft) => mutateParameter(draft, entry, nextValue),
        { selection: PANEL_SELECTION },
      );
      return;
    }
    store.commit(label, (draft) => mutateParameter(draft, entry, nextValue), {
      selectionAfter: PANEL_SELECTION,
      requireValid: true,
    });
  };
  const finishGesture = () => {
    if (!store.getSnapshot().gestureState) return;
    store.commitGesture({ selectionAfter: PANEL_SELECTION, requireValid: true });
  };
  const cancelGesture = () => {
    if (store.getSnapshot().gestureState) store.cancelGesture();
  };

  return (
    <label className="parameterizer-row" htmlFor={controlId} title={control.label}>
      <span className="parameterizer-label">{control.label}</span>
      <span className="parameterizer-control">
        <input
          id={controlId}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          disabled={disabled}
          aria-label={`${groupLabel} ${control.label}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture?.(event.pointerId);
            beginGesture();
          }}
          onPointerUp={finishGesture}
          onPointerCancel={cancelGesture}
          onBlur={finishGesture}
          onChange={(event) => updateValue(Number(event.target.value))}
        />
        <output className="parameterizer-value" htmlFor={controlId}>
          {formatValue(value, control.step)}{control.unit || ''}
        </output>
      </span>
    </label>
  );
}

function ParameterFolder({ children, group, initiallyOpen }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details
      className="parameterizer-folder"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="parameterizer-folder-title">
        <span>{group.label}</span>
        <small>{group.controls.length}</small>
      </summary>
      <div>{children}</div>
    </details>
  );
}

function getPanelStatus(snapshot, message) {
  if (snapshot.sourceState.status === 'loading') return 'Loading…';
  if (snapshot.sourceState.status === 'failed') return message || 'Load failed';
  if (snapshot.sourceState.status === 'read-only') return 'Read only';
  if (snapshot.saveState.status === 'saving') return 'Saving…';
  if (snapshot.saveState.status === 'failed') return message || 'Save failed';
  if (snapshot.saveState.status === 'conflict') return 'Source changed';
  if (snapshot.dirty) return 'Unsaved';
  if (snapshot.saveState.status === 'saved') return 'Saved';
  return 'Ready';
}

function createParameterSnapshotReader(store) {
  let previous = null;
  let parameters = null;
  return () => {
    const next = store.getSnapshot();
    // The form does not display the playhead. Scroll transport updates must
    // not render all of its controls, including while the panel is hidden.
    if (!previous || Object.keys(next).some((key) => key !== 'transport' && next[key] !== previous[key])) {
      parameters = { ...next };
      delete parameters.transport;
    }
    previous = next;
    return parameters;
  };
}

export default function AboutNarrativeParameterPanel({
  blenderPreview,
  onRequestClose,
  store,
  visible,
}) {
  const getParameterSnapshot = useMemo(() => createParameterSnapshotReader(store), [store]);
  const snapshot = useSyncExternalStore(store.subscribe, getParameterSnapshot, getParameterSnapshot);
  const panelRef = useRef(null);
  const [message, setMessage] = useState('Loading canonical source…');
  const controls = useMemo(() => ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap(
    (group) => group.controls,
  ), []);

  useEffect(() => {
    let active = true;
    loadAboutNarrativeSource(PERSISTENCE_OPTIONS).then((source) => {
      if (!active) return;
      store.installSource(source.document, source.hash, {
        status: 'ready',
        migrations: source.migrations || [],
      });
      setMessage(source.migrations?.length ? 'Canonical source migrated and ready.' : 'Canonical source ready.');
    }).catch((error) => {
      if (!active) return;
      store.setSourceState({
        status: error.code === 'future-schema' ? 'read-only' : 'failed',
        readOnly: error.code === 'future-schema',
        message: error.message,
        diagnostics: error.diagnostics || [],
      });
      setMessage(error.message);
    });
    return () => { active = false; };
  }, [store]);

  useEffect(() => {
    if (!visible) return undefined;
    window.requestAnimationFrame(() => panelRef.current?.focus());
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onRequestClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onRequestClose, visible]);

  const save = useCallback(async () => {
    const eligibility = store.getSaveEligibility();
    if (!eligibility.allowed) {
      setMessage(eligibility.reason);
      return;
    }
    const submission = store.beginSave();
    if (!submission) return;
    setMessage('Saving canonical source…');
    try {
      const persisted = await saveAboutNarrativeSource(
        submission.document,
        submission.baselineHash,
        PERSISTENCE_OPTIONS,
      );
      store.markSaved(persisted.document, persisted.hash, submission.revision);
      setMessage('Saved to contents-about.json.');
    } catch (error) {
      if (error.status === 409) {
        store.markConflict({
          currentHash: error.currentHash,
          localDocument: store.getSnapshot().document,
          message: 'The canonical source changed. Reload before saving this draft.',
        });
      } else {
        store.markSaveFailed(error);
      }
      setMessage(error.message);
    }
  }, [store]);

  const revert = useCallback(() => {
    store.cancelGesture();
    if (store.restoreBaseline()) setMessage('Reverted to the last loaded source.');
  }, [store]);

  const saveEligibility = store.getSaveEligibility();
  const disabled = snapshot.sourceState.status !== 'ready'
    || snapshot.saveState.status === 'saving'
    || snapshot.sourceState.readOnly;
  const status = getPanelStatus(snapshot, message);

  return (
    <aside
      ref={panelRef}
      className="parameterizer-panel about-scene-parameter-panel"
      data-about-scene-parameters
      data-control-count={controls.length}
      data-global-keyboard-shortcuts={visible ? 'suspended' : undefined}
      data-keyboard-shortcuts="local"
      data-panel-state={snapshot.dirty ? 'dirty' : snapshot.sourceState.status}
      aria-keyshortcuts="/"
      aria-label="About scene parameters"
      hidden={!visible}
      tabIndex={-1}
    >
      <header className="parameterizer-header">
        <div>
          <strong>About preview</strong>
          <span>Runtime parameters</span>
        </div>
        <button type="button" onClick={onRequestClose}>Close</button>
      </header>

      <div className="about-scene-parameter-panel__note">
        <p>
          Blender owns every visible geometry, the camera, scene visibility, and draw-distance fog. Save the canonical Blender file to update this development preview.
        </p>
        <p
          className="about-scene-parameter-panel__source"
          data-blender-preview-status={blenderPreview?.status || 'inactive'}
          title={blenderPreview?.sourceFile || 'Blender preview source'}
        >
          <span>{blenderPreview?.status === 'ready' ? 'Blender synced' : 'Blender preview'}</span>
          {blenderPreview?.controlCount
            ? ` · ${blenderPreview.controlCount} source controls · ${blenderPreview.sourceSha.slice(0, 8)}`
            : ` · ${blenderPreview?.status || 'inactive'}`}
        </p>
        <p>
          The controls below affect the browser runtime only. They never write to or replace Blender parameters.
        </p>
      </div>

      <div className="parameterizer-scroll">
        {ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.map((group, index) => (
          <ParameterFolder key={group.id} group={group} initiallyOpen={index === 0}>
            {group.controls.map((entry) => (
              <ParameterRow
                key={`${entry.scope}-${entry.path.join('.')}`}
                disabled={entry.scope === 'session' ? false : disabled}
                entry={entry}
                groupLabel={group.label}
                store={store}
                value={readParameter(snapshot, entry)}
              />
            ))}
          </ParameterFolder>
        ))}
      </div>

      <footer className="parameterizer-actions">
        <output aria-live="polite" title={message}>{status}</output>
        <button type="button" disabled={!snapshot.dirty || disabled} onClick={revert}>Revert</button>
        <button
          type="button"
          disabled={!saveEligibility.allowed}
          title={saveEligibility.allowed ? 'Save to contents-about.json' : saveEligibility.reason}
          onClick={save}
        >
          Save
        </button>
      </footer>
    </aside>
  );
}
