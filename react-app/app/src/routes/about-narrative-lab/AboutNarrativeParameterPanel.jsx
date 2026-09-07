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
  getAboutSceneControlAvailability,
  resetAboutSceneParameterGroup,
  writeAboutSceneParameter,
} from './aboutSceneControlRegistry.js';
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

function readParameter(snapshot, entry) {
  if (entry.scope === 'session') {
    return snapshot[entry.control.id] ?? entry.control.defaultValue;
  }
  const { document } = snapshot;
  return entry.path.reduce((value, key) => value?.[key], document.globals)
    ?? entry.control.defaultValue;
}

function formatValue(value, step) {
  const numericStep = Number(step);
  const decimals = numericStep >= 1
    ? 0
    : Math.min(3, Math.max(0, String(numericStep).split('.')[1]?.length || 0));
  return Number(value).toFixed(decimals);
}

function ParameterRow({ disabled, disabledReason, entry, groupLabel, sourceFog, store, value }) {
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
        (draft) => writeAboutSceneParameter(draft, entry, nextValue, sourceFog),
        { selection: PANEL_SELECTION },
      );
      return;
    }
    store.commit(label, (draft) => writeAboutSceneParameter(draft, entry, nextValue, sourceFog), {
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

  if (control.type === 'toggle') {
    return (
      <label className="parameterizer-row" htmlFor={controlId} title={control.label}>
        <span className="parameterizer-label">{control.label}</span>
        <span className="parameterizer-control">
          <input
            id={controlId}
            type="checkbox"
            checked={Number(value) > 0}
            disabled={disabled}
            aria-label={`${groupLabel} ${control.label}`}
            onChange={(event) => updateValue(event.target.checked ? 1 : 0)}
          />
        </span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row" htmlFor={controlId} title={disabledReason || control.label}>
      <span className="parameterizer-label">{control.label}{disabledReason ? ` · ${disabledReason}` : ''}</span>
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
          aria-description={disabledReason || undefined}
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
  const [sceneCapabilities, setSceneCapabilities] = useState(null);
  const sceneAssetRoot = blenderPreview?.assetRoot || '/models/about-v2-edited-world';
  const sceneBundleKey = blenderPreview?.bundleHash || blenderPreview?.sourceSha || sceneAssetRoot;
  const motionBehaviors = sceneCapabilities?.bundleKey === sceneBundleKey
    ? sceneCapabilities.motionBehaviors : null;

  useEffect(() => {
    if (!visible) return undefined;
    const controller = new AbortController();
    fetch(`${sceneAssetRoot}/meta.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('The active scene metadata is unavailable.');
        return response.json();
      })
      .then((metadata) => setSceneCapabilities({
        bundleKey: sceneBundleKey,
        motionBehaviors: [...new Set((metadata.motionGroups || [])
          .map((group) => group.motion?.behavior).filter(Boolean))],
      }))
      .catch(() => {
        if (!controller.signal.aborted) setSceneCapabilities({ bundleKey: sceneBundleKey, motionBehaviors: undefined });
      });
    return () => controller.abort();
  }, [sceneAssetRoot, sceneBundleKey, visible]);

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
  const fogOverride = Number(snapshot.document.globals.camera.distanceFogOverride) > 0;
  const effectiveFog = fogOverride ? {
    startWU: snapshot.document.globals.camera.distanceFogStartWU,
    endWU: snapshot.document.globals.camera.distanceFogEndWU,
    curve: snapshot.document.globals.camera.distanceFogCurve,
  } : blenderPreview?.cameraFog;
  const resetGroup = (group) => {
    store.cancelGesture();
    store.commit(`Reset ${group.label}`, (draft) => resetAboutSceneParameterGroup(draft, group), {
      selectionAfter: PANEL_SELECTION, requireValid: true,
    });
  };

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
          Blender owns visible geometry, the camera path, scene visibility, and the default viewing distance. Run the Blender sync watcher, then save the canonical file to update this preview.
        </p>
        <p
          className="about-scene-parameter-panel__source"
          data-blender-preview-status={blenderPreview?.status || 'inactive'}
          title={blenderPreview?.sourceFile || 'Blender preview source'}
        >
          <span>{blenderPreview?.activeSource === 'preview' ? 'Saved Blender preview' : 'Canonical Blender export'}
            {` · ${blenderPreview?.status || 'inactive'}`}
          </span>
          {blenderPreview?.controlCount
            ? ` · ${blenderPreview.controlCount} source controls · ${blenderPreview.sourceSha?.slice(0, 8)}`
            : null}
          {blenderPreview?.bundleHash ? ` · bundle ${blenderPreview.bundleHash.slice(0, 8)}` : null}
          {blenderPreview?.status === 'stale' ? ' · waiting for an export of the saved source' : null}
        </p>
        <p>
          Website controls can override that viewing distance without changing Blender. Moving a distance slider enables the override; switch it off to use the Blender values again.
        </p>
      </div>

      <div className="parameterizer-scroll">
        {ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.map((group, index) => (
          <ParameterFolder key={group.id} group={group} initiallyOpen={index === 0}>
            {group.id === 'page-viewing-distance' ? (
              <p className="about-scene-parameter-panel__note" data-about-effective-fog={fogOverride ? 'website' : 'blender'}>
                {fogOverride ? 'Website override' : 'Blender defaults'}
                {effectiveFog ? ` · ${formatValue(effectiveFog.startWU, 1)}–${formatValue(effectiveFog.endWU, 1)} WU · curve ${formatValue(effectiveFog.curve, 0.01)}` : ' · loading source distance'}
              </p>
            ) : null}

            {group.controls.map((entry) => (
              <ParameterRow
                key={`${entry.scope}-${entry.path.join('.')}`}
                disabled={entry.scope === 'session' ? false : disabled || Boolean(getAboutSceneControlAvailability(entry, motionBehaviors))}
                disabledReason={getAboutSceneControlAvailability(entry, motionBehaviors)}
                entry={entry}
                groupLabel={group.label}
                sourceFog={blenderPreview?.cameraFog}
                store={store}
                value={!fogOverride && effectiveFog && entry.path[0] === 'camera'
                  ? ({ distanceFogStartWU: effectiveFog.startWU, distanceFogEndWU: effectiveFog.endWU, distanceFogCurve: effectiveFog.curve }[entry.control.id]
                    ?? readParameter(snapshot, entry))
                  : readParameter(snapshot, entry)}
              />
            ))}
            <div className="parameterizer-actions">
              <button type="button" disabled={disabled} onClick={() => resetGroup(group)}>
                {group.id === 'page-viewing-distance' ? 'Reset to Blender' : `Reset ${group.label.toLowerCase()}`}
              </button>
            </div>
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
