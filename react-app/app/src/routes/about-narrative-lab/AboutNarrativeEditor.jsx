import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS,
  ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_BLOCK_KINDS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_GLOBAL_CONTROLS,
  ABOUT_NARRATIVE_INTERACTION_DEFINITIONS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TITLE_STYLES,
  ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
  ABOUT_NARRATIVE_VISIBILITY_EASINGS,
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS,
} from './aboutNarrativeDefinitions.js';
import {
  deriveAboutNarrativeTrackLoopRange,
  getAboutNarrativeTrackObject,
  getAboutNarrativeTrackObjectRange,
} from './aboutNarrativeTrackEditing.js';
import {
  ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING,
  parseAboutNarrativeCameraEasing,
} from './aboutNarrativeCameraEasing.js';
import {
  clearAboutNarrativeRecoveryDraft,
  exportAboutNarrativeDocument,
  loadAboutNarrativeSource,
  readAboutNarrativeRecoveryDraft,
  saveAboutNarrativeSource,
  writeAboutNarrativeCheckpoint,
  writeAboutNarrativeRecoveryDraft,
} from './aboutNarrativePersistence.js';
import './about-narrative-editor.css';

const TRACKS = Object.freeze([
  { id: 'camera', label: 'Camera', type: 'camera-key', colour: 'camera' },
  { id: 'visibility', label: 'Visibility', type: 'visibility-key', colour: 'visibility' },
  { id: 'world', label: 'World', type: 'world', colour: 'world' },
  { id: 'text', label: 'Text', type: 'text-field', colour: 'text' },
  { id: 'interaction', label: 'Motion', type: 'interaction', colour: 'interaction' },
]);
const TRACK_BY_ID = Object.freeze(Object.fromEntries(TRACKS.map((track) => [track.id, track])));
const MIN_TIMELINE_WIDTH = 920;
const BASE_PIXELS_PER_WU = 66;
const TEXT_CONNECTION_EPSILON_WU = 0.0001;
const GRID_RIPPLE_START_STEP_WU = 0.05;
const PREVIEW_ASPECT_RATIOS = Object.freeze({
  tablet: Object.freeze({ portrait: 820 / 1180, landscape: 1180 / 820 }),
  mobile: Object.freeze({ portrait: 390 / 844, landscape: 844 / 390 }),
});
const WORLD_CONTROL_GROUP_BY_ID = Object.freeze(Object.fromEntries(
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS.map((group) => [group.id, group]),
));
const WORLD_PARAMETER_GROUP_IDS = Object.freeze(
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS
    .map((group) => group.id)
    .filter((id) => id.startsWith('shape-') || id.startsWith('modifier-')),
);
const TEXT_TRACK_CONTROL_GROUP_BY_ID = Object.freeze(Object.fromEntries(
  ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS.map((group) => [group.id, group]),
));
const CAMERA_TRACK_CONTROL_GROUP_BY_ID = Object.freeze(Object.fromEntries(
  ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS.map((group) => [group.id, group]),
));
const CAMERA_TRACK_CONTROLS = Object.freeze(
  ABOUT_NARRATIVE_GLOBAL_CONTROLS.find((owner) => owner.id === 'camera')?.controls || [],
);
const VISIBILITY_TRACK_CONTROLS = Object.freeze(
  ABOUT_NARRATIVE_GLOBAL_CONTROLS.find((owner) => owner.id === 'material')?.controls || [],
);
const TEXT_TRACK_CONTROLS = Object.freeze(ABOUT_NARRATIVE_GLOBAL_CONTROLS.flatMap((owner) => (
  owner.controls
    .filter((control) => control.group?.startsWith('text-'))
    .map((control) => Object.freeze({
      control,
      scope: owner.id === 'textMotion' ? 'textMotion' : 'globals',
    }))
)));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(4));
}

function getGridRippleStartControl(document, clip) {
  const targetWorld = document.tracks.worlds.objects.find((world) => world.id === clip.targetWorldId);
  const worldStartWU = Number(targetWorld?.startWU ?? 0);
  const attackWU = Math.max(0, Number(clip.activationWU) - Number(clip.startWU));
  const earliestWU = Math.ceil(worldStartWU / GRID_RIPPLE_START_STEP_WU) * GRID_RIPPLE_START_STEP_WU;
  const latestWU = Math.floor(
    (Number(clip.endWU) - attackWU) / GRID_RIPPLE_START_STEP_WU,
  ) * GRID_RIPPLE_START_STEP_WU;
  return {
    id: 'rippleStartWU',
    label: 'Ripple starts',
    type: 'range',
    min: cleanWU(earliestWU),
    max: cleanWU(Math.max(earliestWU, latestWU)),
    step: GRID_RIPPLE_START_STEP_WU,
    unit: 'WU',
  };
}

function getTrackItems(document, trackId) {
  if (trackId === 'camera') return document.tracks.camera.keys;
  if (trackId === 'visibility') return document.tracks.visibility.keys;
  if (trackId === 'world') return document.tracks.worlds.objects;
  if (trackId === 'text') return document.tracks.text.fields;
  return document.tracks.interactions.clips;
}

function getObjectLabel(object, type) {
  if (type === 'camera-key') return object.id.replace(/^camera-/, '') || 'Camera key';
  if (type === 'visibility-key') return object.id.replace(/^visibility-/, '') || 'Visibility key';
  if (type === 'world') return object.label || object.shapeId || object.id;
  if (type === 'interaction') {
    return ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[object.type]?.label || object.type || object.id;
  }
  if (object.kind === 'stub') return object.label || 'Untitled stub';
  if (object.kind === 'scroll-block') {
    if (object.block?.kind === 'clients') return 'Selected clients';
    return object.block?.text || object.block?.label || 'Scroll block';
  }
  if (object.kind === 'discipline-reveal') return 'Discipline reveal';
  return object.text || object.id;
}

function getObjectStart(object, type) {
  return Number(['camera-key', 'visibility-key'].includes(type) ? object.atWU : object.startWU);
}

function getEditorialTextConnections(fields) {
  const connections = new Map();
  const editorialFields = fields
    .filter((field) => field.kind === 'scroll-block')
    .sort((left, right) => Number(left.startWU) - Number(right.startWU)
      || left.id.localeCompare(right.id));

  editorialFields.forEach((field, index) => {
    const next = editorialFields[index + 1];
    const sharesEditorialLayout = field.presentation?.layout === next?.presentation?.layout;
    if (!next
      || !sharesEditorialLayout
      || Math.abs(Number(field.endWU) - Number(next.startWU)) > TEXT_CONNECTION_EPSILON_WU) return;
    connections.set(field.id, { ...connections.get(field.id), after: true });
    connections.set(next.id, { ...connections.get(next.id), before: true });
  });

  return connections;
}

function NumberField({ label, value, disabled = false, step = 0.01, min, max, onCommit }) {
  return (
    <label className="about-track-editor-field">
      <span>{label}</span>
      <input
        key={`${label}-${value}`}
        type="number"
        defaultValue={Number(value)}
        disabled={disabled}
        step={step}
        min={min}
        max={max}
        onBlur={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next) && next !== Number(value)) onCommit(next);
        }}
      />
    </label>
  );
}

function TextField({ label, value = '', disabled = false, multiline = false, focusId, onCommit }) {
  const Element = multiline ? 'textarea' : 'input';
  return (
    <label className="about-track-editor-field is-wide">
      <span>{label}</span>
      <Element
        key={`${label}-${value}`}
        {...(multiline ? { rows: 4 } : { type: 'text' })}
        data-editor-focus-id={focusId}
        defaultValue={value}
        disabled={disabled}
        onBlur={(event) => {
          if (event.currentTarget.value !== value) onCommit(event.currentTarget.value);
        }}
      />
    </label>
  );
}

function SelectField({ label, value, disabled = false, options, onCommit }) {
  return (
    <label className="about-track-editor-field">
      <span>{label}</span>
      <select value={value} disabled={disabled} onChange={(event) => onCommit(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function formatCameraBezier(x1, x2) {
  return `cubic-bezier(${Number(x1).toFixed(2)}, 0, ${Number(x2).toFixed(2)}, 1)`;
}

function CameraBezierField({
  value,
  disabled = false,
  onBegin,
  onPreview,
  onFinish,
  onCancel,
  onCommit,
}) {
  const gestureRef = useRef(false);
  const curve = parseAboutNarrativeCameraEasing(value)
    || parseAboutNarrativeCameraEasing(ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING);
  const commitCurve = (x1, x2) => onCommit?.(formatCameraBezier(x1, x2));
  const previewCurve = (x1, x2) => onPreview?.(formatCameraBezier(x1, x2));
  const updateHandle = (event, handle) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
      || event.currentTarget.getBoundingClientRect();
    const progress = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    if (handle === 'out') previewCurve(clamp(progress, 0.04, 0.96), curve.x2);
    else previewCurve(curve.x1, clamp(progress, 0.04, 0.96));
  };
  const begin = (event, handle) => {
    if (disabled) return;
    gestureRef.current = onBegin?.() !== false;
    if (!gestureRef.current) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateHandle(event, handle);
  };
  const finish = () => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    onFinish?.();
  };
  const keyAdjust = (event, handle) => {
    if (disabled) return;
    const direction = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!direction && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    if (handle === 'out') {
      const next = event.key === 'Home' ? 0.04 : event.key === 'End'
        ? 0.96 : curve.x1 + (direction * 0.01);
      commitCurve(clamp(next, 0.04, 0.96), curve.x2);
      return;
    }
    const next = event.key === 'Home' ? 0.04 : event.key === 'End'
      ? 0.96 : curve.x2 + (direction * 0.01);
    commitCurve(curve.x1, clamp(next, 0.04, 0.96));
  };

  return (
    <section className="about-track-editor-camera-curve" aria-label="Camera travel easing">
      <div className="about-track-editor-camera-curve__heading">
        <div><span>Travel easing</span><strong>Soft cubic curve</strong></div>
        <code>{value}</code>
      </div>
      <p>Controls the position, rotation, and lens from this key to the next: <b>Out</b> delays departure; <b>In</b> lengthens arrival.</p>
      <svg
        className="about-track-editor-camera-curve__graph"
        viewBox="0 0 200 100"
        role="img"
        aria-label="Cubic-bezier graph with adjustable departure and arrival handles"
      >
        <path className="about-track-editor-camera-curve__grid" d="M 0 50 H 200 M 100 0 V 100" />
        <path className="about-track-editor-camera-curve__curve" d={`M 0 100 C ${curve.x1 * 200} 100, ${curve.x2 * 200} 0, 200 0`} />
        <path className="about-track-editor-camera-curve__handle-line" d={`M 0 100 L ${curve.x1 * 200} 100 M 200 0 L ${curve.x2 * 200} 0`} />
        <circle className="about-track-editor-camera-curve__anchor" cx="0" cy="100" r="3" />
        <circle className="about-track-editor-camera-curve__anchor" cx="200" cy="0" r="3" />
        <circle
          className="about-track-editor-camera-curve__handle"
          cx={curve.x1 * 200}
          cy="100"
          r="6"
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label="Departure easing handle"
          aria-valuemin="0.04"
          aria-valuemax="0.96"
          aria-valuenow={curve.x1}
          onPointerDown={(event) => begin(event, 'out')}
          onPointerMove={(event) => { if (gestureRef.current) updateHandle(event, 'out'); }}
          onPointerUp={finish}
          onPointerCancel={() => { gestureRef.current = false; onCancel?.(); }}
          onKeyDown={(event) => keyAdjust(event, 'out')}
        />
        <circle
          className="about-track-editor-camera-curve__handle"
          cx={curve.x2 * 200}
          cy="0"
          r="6"
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-label="Arrival easing handle"
          aria-valuemin="0.04"
          aria-valuemax="0.96"
          aria-valuenow={curve.x2}
          onPointerDown={(event) => begin(event, 'in')}
          onPointerMove={(event) => { if (gestureRef.current) updateHandle(event, 'in'); }}
          onPointerUp={finish}
          onPointerCancel={() => { gestureRef.current = false; onCancel?.(); }}
          onKeyDown={(event) => keyAdjust(event, 'in')}
        />
      </svg>
      <div className="about-track-editor-camera-curve__inputs">
        <NumberField label="Out / acceleration" value={curve.x1} disabled={disabled} min={0.04} max={0.96} step={0.01} onCommit={(next) => commitCurve(clamp(next, 0.04, 0.96), curve.x2)} />
        <NumberField label="In / deceleration" value={curve.x2} disabled={disabled} min={0.04} max={0.96} step={0.01} onCommit={(next) => commitCurve(curve.x1, clamp(next, 0.04, 0.96))} />
      </div>
      <div className="about-track-editor-camera-curve__presets" aria-label="Camera easing presets">
        {[
          ['Balanced', 0.35, 0.65],
          ['Cinematic', 0.32, 0.18],
          ['Measured', 0.48, 0.52],
        ].map(([label, x1, x2]) => (
          <button key={label} type="button" disabled={disabled} className={Math.abs(curve.x1 - x1) < 0.01 && Math.abs(curve.x2 - x2) < 0.01 ? 'is-active' : ''} onClick={() => commitCurve(x1, x2)}>{label}</button>
        ))}
      </div>
    </section>
  );
}

function getControlPrecision(step) {
  const value = String(step);
  if (value.includes('e-')) return Number(value.split('e-')[1]) || 0;
  return value.includes('.') ? value.split('.')[1].length : 0;
}

function normalizeControlValue(value, control) {
  const next = Number(value);
  if (!Number.isFinite(next)) return Number(control.min);
  const precision = Math.max(getControlPrecision(control.step), 0);
  return Number(clamp(next, Number(control.min), Number(control.max)).toFixed(precision));
}

function RangeParameterField({
  label,
  ariaLabel = label,
  value,
  control,
  disabled = false,
  onBegin,
  onPreview,
  onFinish,
  onCancel,
  onCommit,
}) {
  const gestureRef = useRef(false);
  const normalizedValue = normalizeControlValue(value, control);
  const span = Number(control.max) - Number(control.min);
  const progress = span > 0
    ? ((normalizedValue - Number(control.min)) / span) * 100
    : 0;

  const begin = () => {
    if (disabled || gestureRef.current) return gestureRef.current;
    gestureRef.current = onBegin?.() !== false;
    return gestureRef.current;
  };
  const preview = (nextValue) => {
    if (!begin()) return;
    onPreview?.(normalizeControlValue(nextValue, control));
  };
  const finish = () => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    onFinish?.();
  };
  const cancelGesture = () => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    onCancel?.();
  };

  return (
    <div
      className="about-track-editor-parameter"
      role="group"
      aria-label={ariaLabel}
      data-parameter-id={control.id}
    >
      <div className="about-track-editor-parameter__meta">
        <span>{label}</span>
        <small>{control.min}–{control.max}</small>
      </div>
      <div className="about-track-editor-parameter__controls">
        <input
          className="about-track-editor-parameter__slider"
          aria-label={`${ariaLabel} slider`}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={normalizedValue}
          disabled={disabled}
          style={{ '--parameter-progress': `${progress}%` }}
          onPointerDown={begin}
          onFocus={begin}
          onChange={(event) => preview(event.currentTarget.value)}
          onPointerUp={finish}
          onPointerCancel={cancelGesture}
          onBlur={finish}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            cancelGesture();
            event.currentTarget.blur();
          }}
        />
        <label className="about-track-editor-parameter__exact">
          <span className="about-track-editor-sr-only">{ariaLabel} exact value</span>
          <input
            key={`${ariaLabel}-${normalizedValue}`}
            aria-label={`${ariaLabel} exact value`}
            type="number"
            defaultValue={normalizedValue}
            min={control.min}
            max={control.max}
            step={control.step}
            disabled={disabled}
            onBlur={(event) => {
              const next = normalizeControlValue(event.currentTarget.value, control);
              if (next !== normalizedValue) onCommit?.(next);
              else event.currentTarget.value = String(normalizedValue);
            }}
          />
          {control.unit ? <em>{control.unit}</em> : null}
        </label>
      </div>
    </div>
  );
}

function InspectorFolder({ group, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="about-track-editor-folder"
      data-inspector-group={group.id}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{group.label}</span>
        <small>{count}</small>
        <i aria-hidden="true" />
      </summary>
      <div className="about-track-editor-folder__body">{children}</div>
    </details>
  );
}

function ModifierParameterGroup({
  groupId,
  entries,
  firstGroupByModifier,
  locked,
  bindRange,
  commit,
}) {
  const entriesByModifier = new Map();
  entries.forEach((entry) => {
    if (!entriesByModifier.has(entry.modifierIndex)) entriesByModifier.set(entry.modifierIndex, []);
    entriesByModifier.get(entry.modifierIndex).push(entry);
  });

  return [...entriesByModifier.entries()].map(([modifierIndex, modifierEntries]) => {
    const { modifier, definition } = modifierEntries[0];
    const isPrimaryGroup = firstGroupByModifier.get(modifierIndex) === groupId;
    return (
      <section className="about-track-editor-modifier" key={`${modifier.id}-${groupId}`}>
        <header className="about-track-editor-modifier__header">
          <strong>{definition.label}</strong>
          {isPrimaryGroup ? (
            <label>
              <input
                type="checkbox"
                checked={modifier.enabled === true}
                disabled={locked}
                onChange={(event) => commit(`Toggle ${definition.label}`, (target) => {
                  target.modifiers[modifierIndex].enabled = event.target.checked;
                })}
              />
              {modifier.enabled ? 'On' : 'Off'}
            </label>
          ) : <span>{modifier.enabled ? 'On' : 'Off'}</span>}
        </header>
        <div className="about-track-editor-modifier__controls">
          {modifierEntries.map(({ control }) => {
            const controlValue = modifier.parameters?.[control.id];
            const controlName = `${definition.label} ${control.label}`;
            if (control.type === 'select') {
              return (
                <SelectField
                  key={`${modifier.id}-${control.id}`}
                  label={control.label}
                  value={controlValue}
                  disabled={locked}
                  options={control.options.map((value) => ({ value, label: value }))}
                  onCommit={(value) => commit(`Edit ${controlName}`, (target) => {
                    target.modifiers[modifierIndex].parameters[control.id] = value;
                  })}
                />
              );
            }
            const binding = bindRange(`Edit ${controlName}`, (target, value) => {
              target.modifiers[modifierIndex].parameters[control.id] = value;
            });
            return (
              <RangeParameterField
                key={`${modifier.id}-${control.id}`}
                label={control.label}
                ariaLabel={controlName}
                value={controlValue}
                control={control}
                disabled={locked}
                {...binding}
              />
            );
          })}
        </div>
      </section>
    );
  });
}

function WorldInspector({ object, selection, store, locked, finaleShapeLocked, commit }) {
  const shapeDefinition = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[object.shapeId];
  const shapeControlsByGroup = new Map();
  shapeDefinition?.parameters.forEach((control) => {
    if (!shapeControlsByGroup.has(control.group)) shapeControlsByGroup.set(control.group, []);
    shapeControlsByGroup.get(control.group).push(control);
  });

  const modifierEntriesByGroup = new Map();
  const firstGroupByModifier = new Map();
  object.modifiers.forEach((modifier, modifierIndex) => {
    const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
    if (!definition) return;
    definition.parameters.forEach((control) => {
      const groupId = control.group || 'modifier-motion';
      if (!modifierEntriesByGroup.has(groupId)) modifierEntriesByGroup.set(groupId, []);
      modifierEntriesByGroup.get(groupId).push({ modifier, modifierIndex, definition, control });
    });
    const firstGroup = WORLD_PARAMETER_GROUP_IDS.find((groupId) => (
      definition.parameters.some((control) => (control.group || 'modifier-motion') === groupId)
    ));
    if (firstGroup) firstGroupByModifier.set(modifierIndex, firstGroup);
  });

  const firstShapeGroup = WORLD_PARAMETER_GROUP_IDS.find((groupId) => shapeControlsByGroup.has(groupId));
  const firstModifierGroup = WORLD_PARAMETER_GROUP_IDS.find((groupId) => modifierEntriesByGroup.has(groupId));
  const bindRange = (label, mutate) => ({
    onBegin: () => store.beginGesture(label, { selection }),
    onPreview: (value) => store.updateGesture((draft) => {
      const target = getAboutNarrativeTrackObject(draft, selection);
      if (target) mutate(target, value, draft);
    }, { selection }),
    onFinish: () => store.commitGesture({ selectionAfter: selection, requireValid: true }),
    onCancel: () => store.cancelGesture(),
    onCommit: (value) => commit(label, (target, draft) => mutate(target, value, draft)),
  });

  return (
    <div className="about-track-editor-world-folders">
      <p className="about-track-editor-parameter-note">
        Drag any slider for a live preview. Use the value field for exact input.
      </p>
      {finaleShapeLocked ? (
        <p className="about-track-editor-parameter-note">
          This is the required finale bust. Its Shape and destructive timeline actions stay protected; its placement, material, and motion controls are editable.
        </p>
      ) : null}

      <InspectorFolder
        key={`${object.id}-world-setup`}
        group={WORLD_CONTROL_GROUP_BY_ID['world-setup']}
        count={6}
      >
        <div className="about-track-editor-folder__grid">
          <TextField label="Label" value={object.label} disabled={locked} onCommit={(value) => commit('Rename World', (target) => { target.label = value; })} />
          <NumberField label="startWU" value={object.startWU} disabled={locked} onCommit={(value) => commit('Edit startWU', (target) => { target.startWU = cleanWU(value); })} />
          <NumberField label="anchorWU" value={object.anchorWU} disabled={locked} onCommit={(value) => commit('Edit anchorWU', (target) => { target.anchorWU = cleanWU(value); })} />
          <SelectField
            label="Shape"
            value={object.shapeId}
            disabled={locked || finaleShapeLocked}
            options={Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map((shape) => ({ value: shape.id, label: shape.label }))}
            onCommit={(value) => commit('Change World Shape', (target) => {
              const definition = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[value];
              target.shapeId = value;
              target.adapterId = definition.adapterId;
              target.shapeParameters = Object.fromEntries(definition.parameters.map((control) => [
                control.id,
                normalizeControlValue(target.shapeParameters?.[control.id], control),
              ]));
            })}
          />
          <NumberField label="Seed" value={object.seed} disabled={locked} step={1} min={0} onCommit={(value) => commit('Edit World seed', (target) => { target.seed = Math.round(value); })} />
          <NumberField label="Entry distance WU" value={object.entryDistanceWU} disabled={locked} onCommit={(value) => commit('Edit World entry distance', (target) => { target.entryDistanceWU = value; })} />
        </div>
      </InspectorFolder>

      <InspectorFolder
        key={`${object.id}-world-placement`}
        group={WORLD_CONTROL_GROUP_BY_ID['world-placement']}
        count={11}
      >
        <div className="about-track-editor-folder__grid">
          {[0, 1, 2].map((axis) => (
            <NumberField key={`position-${axis}`} label={`Position ${'XYZ'[axis]}`} value={object.transform.position[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World position', (target) => { target.transform.position[axis] = value; })} />
          ))}
          {[0, 1, 2].map((axis) => (
            <NumberField key={`rotation-${axis}`} label={`Rotation ${'XYZ'[axis]}`} value={object.transform.rotation[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World rotation', (target) => { target.transform.rotation[axis] = value; })} />
          ))}
          <NumberField label="Scale" value={object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World scale', (target) => { target.transform.scale = value; })} />
          <NumberField label="Mobile scale" value={object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World mobile scale', (target) => { target.transform.mobileScale = value; })} />
          <NumberField label="Mobile X scale" value={object.transform.mobileXScale ?? object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World mobile X scale', (target) => { target.transform.mobileXScale = value; })} />
          <NumberField label="Mobile Y offset" value={object.transform.mobileYOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World mobile offset', (target) => { target.transform.mobileYOffset = value; })} />
          <NumberField label="Mobile Z offset" value={object.transform.mobileZOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World mobile offset', (target) => { target.transform.mobileZOffset = value; })} />
        </div>
      </InspectorFolder>

      <InspectorFolder
        key={`${object.id}-world-transition`}
        group={WORLD_CONTROL_GROUP_BY_ID['world-transition']}
        count={5}
      >
        <div className="about-track-editor-folder__grid">
          <NumberField label="Transition start WU" value={object.transitionIn.startWU} disabled={locked} onCommit={(value) => commit('Edit World transition', (target) => { target.transitionIn.startWU = value; })} />
          <NumberField label="Transition end WU" value={object.transitionIn.endWU} disabled={locked} onCommit={(value) => commit('Edit World transition', (target) => { target.transitionIn.endWU = value; })} />
          <SelectField label="Transition type" value={object.transitionIn.type} disabled={locked} options={ABOUT_NARRATIVE_TRANSITION_TYPES.map((value) => ({ value, label: value }))} onCommit={(value) => commit('Edit World transition type', (target) => { target.transitionIn.type = value; })} />
          <SelectField label="Transition easing" value={object.transitionIn.easing} disabled={locked} options={ABOUT_NARRATIVE_EASINGS.map((value) => ({ value, label: value }))} onCommit={(value) => commit('Edit World transition easing', (target) => { target.transitionIn.easing = value; })} />
          <SelectField label="Correspondence" value={object.transitionIn.correspondence} disabled={locked} options={ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((value) => ({ value, label: value }))} onCommit={(value) => commit('Edit World correspondence', (target) => { target.transitionIn.correspondence = value; })} />
        </div>
      </InspectorFolder>

      {WORLD_PARAMETER_GROUP_IDS.map((groupId) => {
        const shapeControls = shapeControlsByGroup.get(groupId) || [];
        const modifierEntries = modifierEntriesByGroup.get(groupId) || [];
        const count = shapeControls.length || modifierEntries.length;
        if (!count) return null;
        const group = WORLD_CONTROL_GROUP_BY_ID[groupId];
        return (
          <InspectorFolder
            key={`${object.id}-${groupId}`}
            group={group}
            count={count}
            defaultOpen={groupId === firstShapeGroup || groupId === firstModifierGroup}
          >
            {shapeControls.length ? (
              <div className="about-track-editor-shape-controls">
                {groupId === firstShapeGroup ? <p>{shapeDefinition.description}</p> : null}
                {shapeControls.map((control) => {
                  const binding = bindRange(`Edit ${shapeDefinition.label} ${control.label}`, (target, value) => {
                    target.shapeParameters[control.id] = value;
                  });
                  return (
                    <RangeParameterField
                      key={`${object.shapeId}-${control.id}`}
                      label={control.label}
                      ariaLabel={`${shapeDefinition.label} ${control.label}`}
                      value={object.shapeParameters?.[control.id]}
                      control={control}
                      disabled={locked}
                      {...binding}
                    />
                  );
                })}
              </div>
            ) : null}
            {modifierEntries.length ? (
              <ModifierParameterGroup
                groupId={groupId}
                entries={modifierEntries}
                firstGroupByModifier={firstGroupByModifier}
                locked={locked}
                bindRange={bindRange}
                commit={commit}
              />
            ) : null}
          </InspectorFolder>
        );
      })}
    </div>
  );
}

function CameraTrackInspector({ snapshot, store }) {
  const selection = { type: 'track', id: 'camera' };
  const camera = snapshot.document.globals.camera;
  const getCameraValue = (id) => {
    if (camera[id] != null) return camera[id];
    return 0;
  };
  const getBoundedControl = (control) => {
    if (control.id === 'distanceFogStartWU') {
      return { ...control, max: Math.max(control.min, Number(camera.distanceFogEndWU) - control.step) };
    }
    if (control.id === 'distanceFogEndWU') {
      return { ...control, min: Math.min(control.max, Number(camera.distanceFogStartWU) + control.step) };
    }
    return control;
  };
  const controlsByGroup = new Map();
  CAMERA_TRACK_CONTROLS.forEach((control) => {
    if (!controlsByGroup.has(control.group)) controlsByGroup.set(control.group, []);
    controlsByGroup.get(control.group).push(control);
  });
  const bindRange = (control) => {
    const label = `Edit global ${control.label}`;
    const mutate = (draft, value) => {
      draft.globals.camera[control.id] = value;
    };
    return {
      onBegin: () => store.beginGesture(label, { selection }),
      onPreview: (value) => store.updateGesture((draft) => mutate(draft, value), { selection }),
      onFinish: () => store.commitGesture({ selectionAfter: selection, requireValid: true }),
      onCancel: () => store.cancelGesture(),
      onCommit: (value) => store.commit(label, (draft) => mutate(draft, value), {
        selectionAfter: selection,
        requireValid: true,
      }),
    };
  };

  return (
    <div className="about-track-editor-inspector__content" data-track-settings="camera">
      <header>
        <span>Track settings</span>
        <h2>Global camera</h2>
        <code>globals.camera</code>
      </header>
      <div className="about-track-editor-world-folders about-track-editor-global-folders">
        <p className="about-track-editor-parameter-note">
          Distance fog is global across the sequence. Select a Camera key to edit its pose, lens, and outgoing travel easing.
        </p>
        {ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS.map((group) => {
          const controls = controlsByGroup.get(group.id) || [];
          if (!controls.length) return null;
          return (
            <InspectorFolder
              key={group.id}
              group={CAMERA_TRACK_CONTROL_GROUP_BY_ID[group.id]}
              count={controls.length}
              defaultOpen={group.id === 'camera-fog'}
            >
              <div className="about-track-editor-shape-controls">
                {controls.map((sourceControl) => {
                  const control = getBoundedControl(sourceControl);
                  return (
                    <RangeParameterField
                      key={control.id}
                      label={control.label}
                      ariaLabel={`Global camera ${control.label}`}
                      value={getCameraValue(control.id)}
                      control={control}
                      {...bindRange(control)}
                    />
                  );
                })}
              </div>
            </InspectorFolder>
          );
        })}
      </div>
    </div>
  );
}

function VisibilityTrackInspector({ snapshot, store }) {
  const selection = { type: 'track', id: 'visibility' };
  const pointMaterial = snapshot.document.globals.pointMaterial;
  const bindRange = (control) => {
    const label = `Edit global ${control.label}`;
    const mutate = (draft, value) => { draft.globals.pointMaterial[control.id] = value; };
    return {
      onBegin: () => store.beginGesture(label, { selection }),
      onPreview: (value) => store.updateGesture((draft) => mutate(draft, value), { selection }),
      onFinish: () => store.commitGesture({ selectionAfter: selection, requireValid: true }),
      onCancel: () => store.cancelGesture(),
      onCommit: (value) => store.commit(label, (draft) => mutate(draft, value), {
        selectionAfter: selection,
        requireValid: true,
      }),
    };
  };
  return (
    <div className="about-track-editor-inspector__content" data-track-settings="visibility">
      <header>
        <span>Track settings</span>
        <h2>Simulation visibility</h2>
        <code>globals.pointMaterial</code>
      </header>
      <div className="about-track-editor-world-folders about-track-editor-global-folders">
        <p className="about-track-editor-parameter-note">
          Visibility keys fade the whole simulation independently of the Camera. These settings control the point material at full visibility.
        </p>
        <InspectorFolder group={{ id: 'point-material', label: 'Point material' }} count={VISIBILITY_TRACK_CONTROLS.length} defaultOpen>
          <div className="about-track-editor-shape-controls">
            {VISIBILITY_TRACK_CONTROLS.map((control) => (
              <RangeParameterField
                key={control.id}
                label={control.label}
                ariaLabel={`Point material ${control.label}`}
                value={pointMaterial[control.id]}
                control={control}
                {...bindRange(control)}
              />
            ))}
          </div>
        </InspectorFolder>
      </div>
    </div>
  );
}

function TextTrackInspector({ snapshot, store }) {
  const selection = { type: 'track', id: 'text' };
  const globals = snapshot.document.globals;
  const controlsByGroup = new Map();
  TEXT_TRACK_CONTROLS.forEach((item) => {
    if (!controlsByGroup.has(item.control.group)) controlsByGroup.set(item.control.group, []);
    controlsByGroup.get(item.control.group).push(item);
  });

  const getValue = ({ control, scope }) => (
    scope === 'textMotion' ? globals.textMotion[control.id] : globals[control.id]
  );
  const getBoundedControl = ({ control }) => {
    if (control.id === 'readableStart') {
      return { ...control, max: Math.max(control.min, Number(globals.textMotion.readableEnd) - control.step) };
    }
    if (control.id === 'readableEnd') {
      return { ...control, min: Math.min(control.max, Number(globals.textMotion.readableStart) + control.step) };
    }
    return control;
  };
  const mutateGlobal = (draft, item, value) => {
    if (item.scope === 'textMotion') draft.globals.textMotion[item.control.id] = value;
    else draft.globals[item.control.id] = value;
  };
  const bindRange = (item) => {
    const label = `Edit global ${item.control.label}`;
    return {
      onBegin: () => store.beginGesture(label, { selection }),
      onPreview: (value) => store.updateGesture((draft) => mutateGlobal(draft, item, value), { selection }),
      onFinish: () => store.commitGesture({ selectionAfter: selection, requireValid: true }),
      onCancel: () => store.cancelGesture(),
      onCommit: (value) => store.commit(label, (draft) => mutateGlobal(draft, item, value), {
        selectionAfter: selection,
        requireValid: true,
      }),
    };
  };

  return (
    <div className="about-track-editor-inspector__content" data-track-settings="text">
      <header>
        <span>Track settings</span>
        <h2>Global text animation</h2>
        <code>globals.textMotion</code>
      </header>
      <div className="about-track-editor-world-folders about-track-editor-global-folders">
        <p className="about-track-editor-parameter-note">
          Text focus points define the narrative cadence and Story length. Drag any Text clip to move its complete window, or restore an even rhythm with the action below.
        </p>
        <button type="button" onClick={() => store.distributeTextEvenly()}>Space text evenly</button>
        {ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS.map((group, index) => {
          const items = controlsByGroup.get(group.id) || [];
          if (!items.length) return null;
          return (
            <InspectorFolder
              key={group.id}
              group={TEXT_TRACK_CONTROL_GROUP_BY_ID[group.id]}
              count={items.length}
              defaultOpen={index === 0}
            >
              <div className="about-track-editor-shape-controls">
                {items.map((item) => {
                  const control = getBoundedControl(item);
                  return (
                    <RangeParameterField
                      key={control.id}
                      label={control.label}
                      ariaLabel={`Global text ${control.label}`}
                      value={getValue(item)}
                      control={control}
                      {...bindRange(item)}
                    />
                  );
                })}
              </div>
            </InspectorFolder>
          );
        })}
      </div>
    </div>
  );
}

function JsonField({ label, value, disabled = false, focusId, onCommit, onError }) {
  return (
    <label className="about-track-editor-field is-wide">
      <span>{label}</span>
      <textarea
        key={`${label}-${JSON.stringify(value)}`}
        rows={5}
        data-editor-focus-id={focusId}
        defaultValue={JSON.stringify(value, null, 2)}
        disabled={disabled}
        spellCheck={false}
        onBlur={(event) => {
          try {
            const next = JSON.parse(event.currentTarget.value);
            onCommit(next);
          } catch (error) {
            onError(`${label} is not valid JSON: ${error.message}`);
          }
        }}
      />
    </label>
  );
}

function TrackObject({
  document,
  object,
  track,
  pixelsPerWU,
  selected,
  store,
  onOpenTextEditor,
  connectedBefore = false,
  connectedAfter = false,
}) {
  const pointerRef = useRef(null);
  const resizeRef = useRef(null);
  const range = getAboutNarrativeTrackObjectRange(document, { type: track.type, id: object.id });
  const startWU = range?.startWU ?? getObjectStart(object, track.type);
  const endWU = range?.endWU ?? startWU;
  const locked = object.locked === true || object.protected === true;
  const pointLike = ['camera-key', 'visibility-key'].includes(track.type);
  const left = startWU * pixelsPerWU;
  const width = pointLike
    ? 18
    : track.type === 'world'
      ? Math.max(1, (endWU - startWU) * pixelsPerWU)
      : Math.max(18, (endWU - startWU) * pixelsPerWU);
  const worldIndex = track.type === 'world'
    ? [...document.tracks.worlds.objects]
      .sort((leftWorld, rightWorld) => Number(leftWorld.startWU) - Number(rightWorld.startWU))
      .findIndex((world) => world.id === object.id)
    : -1;
  const canResizeWorld = track.type === 'world'
    && !locked
    && worldIndex >= 0
    && worldIndex < document.tracks.worlds.objects.length - 1;
  const durationEdges = !locked && (track.type === 'interaction'
    || (track.type === 'text-field' && object.kind !== 'title'))
    ? ['start', 'end']
    : canResizeWorld ? ['end'] : [];
  const activationPercent = track.type === 'interaction' && endWU > startWU
    ? clamp(((Number(object.activationWU) - startWU) / (endWU - startWU)) * 100, 0, 100)
    : null;

  const beginDrag = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    store.setSelection({ type: track.type, id: object.id });
    store.setTransport({ owner: 'timeline', playing: false, storyWU: getObjectStart(object, track.type) });
    if (locked) return;
    if (!store.beginGesture(`Move ${track.label}`, { selection: { type: track.type, id: object.id } })) return;
    pointerRef.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event) => {
    if (pointerRef.current?.pointerId !== event.pointerId) return;
    store.updateGestureMove((event.clientX - pointerRef.current.startX) / pixelsPerWU);
  };

  const finishDrag = (event, cancel = false) => {
    if (pointerRef.current?.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    if (cancel) store.cancelGesture();
    else store.commitGesture({ requireValid: true });
  };

  const beginDurationResize = (event, edge) => {
    if (event.button !== 0 || !durationEdges.includes(edge)) return;
    event.preventDefault();
    event.stopPropagation();
    const selection = { type: track.type, id: object.id };
    const edgeWU = edge === 'start' ? startWU : endWU;
    store.setSelection(selection);
    store.setTransport({ owner: 'timeline', playing: false, storyWU: edgeWU });
    if (!store.beginGesture(`Resize ${track.label} ${getObjectLabel(object, track.type)} ${edge}`, {
      selection,
    })) return;
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      edge,
      startWU,
      endWU,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDurationResize = (event) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const edge = resizeRef.current.edge;
    const nextWU = resizeRef.current[`${edge}WU`]
      + ((event.clientX - resizeRef.current.startX) / pixelsPerWU);
    if (track.type === 'world') store.updateGestureResizeWorldEnd(object.id, nextWU);
    else if (track.type === 'text-field') store.updateGestureResizeText(object.id, edge, nextWU);
    else if (track.type === 'interaction') store.updateGestureResizeInteraction(object.id, edge, nextWU);
  };

  const finishDurationResize = (event, cancel = false) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    resizeRef.current = null;
    if (cancel) store.cancelGesture();
    else store.commitGesture({ selectionAfter: { type: track.type, id: object.id }, requireValid: true });
  };

  const resizeDurationWithKeyboard = (event, edge) => {
    if (!durationEdges.includes(edge) || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const stepWU = event.shiftKey ? 0.25 : 0.05;
    const selection = { type: track.type, id: object.id };
    const edgeWU = edge === 'start' ? startWU : endWU;
    store.setSelection(selection);
    if (!store.beginGesture(`Resize ${track.label} ${getObjectLabel(object, track.type)} ${edge}`, { selection })) return;
    const nextWU = edgeWU + (direction * stepWU);
    if (track.type === 'world') store.updateGestureResizeWorldEnd(object.id, nextWU);
    else if (track.type === 'text-field') store.updateGestureResizeText(object.id, edge, nextWU);
    else if (track.type === 'interaction') store.updateGestureResizeInteraction(object.id, edge, nextWU);
    store.commitGesture({ selectionAfter: selection, requireValid: true });
  };

  return (
    <div
      className={`about-track-editor-object is-${track.colour}${durationEdges.includes('start') ? ' has-resize-start' : ''}${durationEdges.includes('end') ? ' has-resize-end' : ''}`}
      style={{ left, width }}
    >
      <button
        type="button"
        className={`about-track-editor-clip is-${track.colour}${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${object.kind === 'stub' ? ' is-draft' : ''}${connectedBefore ? ' is-connected-before' : ''}${connectedAfter ? ' is-connected-after' : ''}`}
        data-track-object-type={track.type}
        data-track-object-id={object.id}
        data-text-kind={track.type === 'text-field' ? object.kind : undefined}
        data-motion-type={track.type === 'interaction' ? object.type : undefined}
        aria-label={`${track.label}: ${getObjectLabel(object, track.type)} at ${getObjectStart(object, track.type).toFixed(3)} WU${locked ? ', protected' : ''}`}
        title={`${getObjectLabel(object, track.type)} · ${startWU.toFixed(3)}–${endWU.toFixed(3)} WU`}
        onPointerDown={beginDrag}
        onPointerMove={updateDrag}
        onPointerUp={(event) => finishDrag(event)}
        onPointerCancel={(event) => finishDrag(event, true)}
        onDoubleClick={(event) => {
          if (track.type !== 'text-field') return;
          event.stopPropagation();
          onOpenTextEditor?.(object);
        }}
      >
        {activationPercent != null ? (
          <i
            className="about-track-editor-clip__activation"
            style={{ left: `${activationPercent}%` }}
            title={`Activates at ${Number(object.activationWU).toFixed(3)} WU`}
            aria-hidden="true"
          />
        ) : null}
        {!pointLike ? <span className="about-track-editor-clip__label">{getObjectLabel(object, track.type)}</span> : null}
        {object.kind === 'stub' ? <span className="about-track-editor-clip__badge">Draft · Not published</span> : null}
        {pointLike ? <span className="about-track-editor-clip__point" aria-hidden="true" /> : null}
      </button>
      {durationEdges.map((edge) => (
        <button
          type="button"
          className={`about-track-editor-duration-resize is-${edge}`}
          data-duration-edge={edge}
          key={edge}
          aria-label={`Resize ${track.label} ${getObjectLabel(object, track.type)} ${edge}`}
          title={track.type === 'world'
            ? `Drag World ${getObjectLabel(object, track.type)} end · later Worlds move with it`
            : `Drag ${track.label} ${getObjectLabel(object, track.type)} ${edge}`}
          onPointerDown={(event) => beginDurationResize(event, edge)}
          onPointerMove={updateDurationResize}
          onPointerUp={(event) => finishDurationResize(event)}
          onPointerCancel={(event) => finishDurationResize(event, true)}
          onKeyDown={(event) => resizeDurationWithKeyboard(event, edge)}
        ><span aria-hidden="true" /></button>
      ))}
    </div>
  );
}

function Timeline({
  snapshot,
  store,
  zoom,
  setZoom,
  textMenu,
  setTextMenu,
  interactionMenu,
  setInteractionMenu,
  onOpenTextEditor,
}) {
  const scrollRef = useRef(null);
  const scrubRef = useRef(null);
  const durationWU = Number(snapshot.compiledPlan?.durationWU
    || snapshot.document.profiles.desktop.storyDurationWU);
  const pixelsPerWU = BASE_PIXELS_PER_WU * zoom;
  const timelineWidth = Math.max(MIN_TIMELINE_WIDTH, durationWU * pixelsPerWU);
  const rulerMarks = useMemo(
    () => Array.from({ length: Math.ceil(durationWU) + 1 }, (_, index) => index),
    [durationWU],
  );
  const worlds = snapshot.document.tracks.worlds.objects;
  const editorialTextConnections = useMemo(
    () => getEditorialTextConnections(snapshot.document.tracks.text.fields),
    [snapshot.document],
  );

  const seekFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextWU = clamp((event.clientX - rect.left) / pixelsPerWU, 0, durationWU);
    store.setTransport({ owner: 'timeline', playing: false, storyWU: cleanWU(nextWU) });
  };

  const beginScrub = (event) => {
    if (event.button !== 0 || event.target.closest('[data-track-object-id]')) return;
    scrubRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromEvent(event);
  };

  const updateScrub = (event) => {
    if (scrubRef.current === event.pointerId) seekFromEvent(event);
  };

  const endScrub = (event) => {
    if (scrubRef.current === event.pointerId) scrubRef.current = null;
  };

  const createAtPlayhead = (trackId, kind = null, interactionType = null) => {
    const interactionDefinition = interactionType
      ? ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[interactionType]
      : null;
    store.createObject({
      track: trackId,
      kind,
      atWU: snapshot.transport.storyWU,
      ...(trackId === 'interaction' ? {
        interactionType: interactionType || 'horizontal-spin',
        template: {
          parameters: { ...(interactionDefinition?.defaultParameters || {}) },
        },
      } : {}),
    });
    setTextMenu(false);
    setInteractionMenu(false);
  };

  return (
    <section className="about-track-editor-timeline" aria-label="About narrative global timeline">
      <header className="about-track-editor-timeline__toolbar">
        <div>
          <strong>Global Story WU</strong>
          <span>Drag clip edges to set duration · World ends ripple with no gaps</span>
        </div>
        <label>
          Zoom
          <input
            type="range"
            min="0.55"
            max="2.5"
            step="0.05"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
      </header>
      <div className="about-track-editor-timeline__body">
        <div className="about-track-editor-headers" aria-hidden="false">
          <div className="about-track-editor-ruler-corner">WU</div>
          {TRACKS.map((track) => (
            <div
              className={`about-track-editor-row-head is-${track.colour}${snapshot.selection.type === 'track' && snapshot.selection.id === track.id ? ' is-selected' : ''}`}
              key={track.id}
            >
              <button
                type="button"
                aria-pressed={snapshot.selection.type === 'track' && snapshot.selection.id === track.id}
                onClick={() => store.setSelection({ type: 'track', id: track.id })}
              >
                {track.label}
              </button>
              <button
                type="button"
                className="about-track-editor-add"
                aria-label={`Add ${track.label} object at playhead`}
                aria-expanded={track.id === 'text'
                  ? textMenu
                  : track.id === 'interaction' ? interactionMenu : undefined}
                onClick={() => {
                  if (track.id === 'text') {
                    setInteractionMenu(false);
                    setTextMenu((open) => !open);
                  } else if (track.id === 'interaction') {
                    setTextMenu(false);
                    setInteractionMenu((open) => !open);
                  }
                  else createAtPlayhead(track.id);
                }}
              >+</button>
              {track.id === 'text' && textMenu ? (
                <div className="about-track-editor-create-menu" role="menu" aria-label="Create Text field">
                  <button type="button" role="menuitem" onClick={() => createAtPlayhead('text', 'title')}>Title</button>
                  <button type="button" role="menuitem" onClick={() => createAtPlayhead('text', 'scroll-block')}>Scroll block</button>
                  <button type="button" role="menuitem" onClick={() => createAtPlayhead('text', 'stub')}>
                    Third type <span>Stub · Draft</span>
                  </button>
                </div>
              ) : null}
              {track.id === 'interaction' && interactionMenu ? (
                <div className="about-track-editor-create-menu" role="menu" aria-label="Create Motion clip">
                  <button type="button" role="menuitem" onClick={() => createAtPlayhead('interaction', null, 'grid-ripple')}>Grid ripple</button>
                  <button type="button" role="menuitem" onClick={() => createAtPlayhead('interaction', null, 'horizontal-spin')}>Horizontal spin</button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="about-track-editor-scroll" ref={scrollRef}>
          <div
            className="about-track-editor-canvas"
            style={{ width: timelineWidth }}
            onPointerDown={beginScrub}
            onPointerMove={updateScrub}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
          >
            <div className="about-track-editor-ruler" aria-hidden="true">
              {rulerMarks.map((mark) => (
                <span key={mark} style={{ left: mark * pixelsPerWU }}><i />{mark}</span>
              ))}
            </div>
            {worlds.map((world) => (
              <i
                className="about-track-editor-world-guide"
                key={world.id}
                style={{ left: world.startWU * pixelsPerWU }}
                aria-hidden="true"
              />
            ))}
            {TRACKS.map((track) => (
              <div className={`about-track-editor-lane is-${track.colour}`} key={track.id} data-track-lane={track.id}>
                {getTrackItems(snapshot.document, track.id).map((object) => {
                  const connection = track.id === 'text'
                    ? editorialTextConnections.get(object.id)
                    : null;
                  return (
                    <TrackObject
                      key={object.id}
                      document={snapshot.document}
                      object={object}
                      track={track}
                      pixelsPerWU={pixelsPerWU}
                      selected={snapshot.selection.type === track.type && snapshot.selection.id === object.id}
                      store={store}
                      onOpenTextEditor={onOpenTextEditor}
                      connectedBefore={connection?.before}
                      connectedAfter={connection?.after}
                    />
                  );
                })}
              </div>
            ))}
            <div
              className="about-track-editor-playhead"
              style={{ left: snapshot.transport.storyWU * pixelsPerWU }}
              aria-hidden="true"
            ><i /></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ObjectInspector({ snapshot, store, onMessage }) {
  const selection = snapshot.selection;
  const object = getAboutNarrativeTrackObject(snapshot.document, selection);
  const track = TRACK_BY_ID[selection.id];
  if (!object && selection.type === 'track' && selection.id === 'camera') {
    return <CameraTrackInspector snapshot={snapshot} store={store} />;
  }
  if (!object && selection.type === 'track' && selection.id === 'visibility') {
    return <VisibilityTrackInspector snapshot={snapshot} store={store} />;
  }
  if (!object && selection.type === 'track' && selection.id === 'text') {
    return <TextTrackInspector snapshot={snapshot} store={store} />;
  }
  if (!object) {
    return (
      <div className="about-track-editor-inspector__empty">
        <span>{track?.label || 'Timeline'}</span>
        <h2>{track ? `${track.label} track` : 'Select an object'}</h2>
        <p>Drag Text and Motion edges to set their windows. World ends ripple every later World without gaps; Camera and Visibility keys remain points.</p>
      </div>
    );
  }

  const finaleWorld = selection.type === 'world' && object.protected === true;
  const boundaryCamera = selection.type === 'camera-key' && object.locked === true;
  const locked = (object.locked === true || object.protected === true)
    && !finaleWorld
    && !boundaryCamera;
  const commit = (label, mutate) => store.commit(label, (draft) => {
    const target = getAboutNarrativeTrackObject(draft, selection);
    if (target) mutate(target, draft);
  }, { selectionAfter: selection, requireValid: true });
  const number = (path, value, disabled = locked) => NumberField({
    label: path,
    value,
    disabled,
    onCommit: (next) => commit(`Edit ${path}`, (target) => { target[path] = cleanWU(next); }),
  });
  const bindObjectRange = (label, mutate) => ({
    onBegin: () => store.beginGesture(label, { selection }),
    onPreview: (value) => store.updateGesture((draft) => {
      const target = getAboutNarrativeTrackObject(draft, selection);
      if (target) mutate(target, value);
    }, { selection }),
    onFinish: () => store.commitGesture({ selectionAfter: selection, requireValid: true }),
    onCancel: () => store.cancelGesture(),
    onCommit: (value) => commit(label, (target) => mutate(target, value)),
  });
  return (
    <div className="about-track-editor-inspector__content">
      <header>
        <span>{selection.type === 'interaction' ? 'motion' : selection.type}</span>
        <h2>{getObjectLabel(object, selection.type)}</h2>
        <code>{object.id}</code>
        {boundaryCamera ? <b>Timing fixed · Pose editable</b> : null}
        {locked ? <b>{selection.type === 'visibility-key' ? 'Timing protected' : 'Protected'}</b> : null}
      </header>

      {selection.type === 'camera-key' ? (
        <div className="about-track-editor-fields">
          {number('atWU', object.atWU, boundaryCamera)}
          <p className="about-track-editor-parameter-note is-wide">This is a shot key. Its pose is the camera at this exact Story WU; the curve below shapes its travel <b>to the next key</b>.</p>
          {boundaryCamera ? <p className="about-track-editor-parameter-note is-wide">This boundary key stays at its Story WU. Position, rotation and field of view are fully editable.</p> : null}
          <InspectorFolder group={{ id: 'camera-rig', label: 'Camera rig' }} count={7} defaultOpen>
            <p className="about-track-editor-parameter-note">
              Position moves the camera in world space. Rotation turns it around the centre of the viewport, like a first-person camera.
            </p>
            <div className="about-track-editor-camera-rig">
              {['position', 'rotation', 'lens'].map((groupId) => (
                <section className="about-track-editor-camera-rig__group" key={groupId}>
                  <span>{groupId === 'lens' ? 'Lens' : groupId[0].toUpperCase() + groupId.slice(1)}</span>
                  {ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS
                    .filter((control) => control.group === groupId)
                    .map((control) => {
                      const [field, axisText] = control.id.split('.');
                      const axis = axisText == null ? null : Number(axisText);
                      const value = axis == null ? object[field] : object[field][axis];
                      return (
                        <RangeParameterField
                          key={control.id}
                          label={control.label}
                          ariaLabel={`Camera ${control.label}`}
                          value={value}
                          control={control}
                          {...bindObjectRange(`Edit Camera ${control.label}`, (target, next) => {
                            if (axis == null) target[field] = next;
                            else target[field][axis] = next;
                          })}
                        />
                      );
                    })}
                </section>
              ))}
            </div>
          </InspectorFolder>
          <InspectorFolder group={{ id: 'camera-easing', label: 'Travel easing' }} count={2}>
            <CameraBezierField
              value={object.easing}
              disabled={!snapshot.document.tracks.camera.keys.some((key) => Number(key.atWU) > Number(object.atWU))}
              onBegin={() => store.beginGesture('Shape Camera travel easing', { selection })}
              onPreview={(value) => store.updateGesture((draft) => {
                const target = getAboutNarrativeTrackObject(draft, selection);
                if (target) target.easing = value;
              }, { selection })}
              onFinish={() => store.commitGesture({ selectionAfter: selection, requireValid: true })}
              onCancel={() => store.cancelGesture()}
              onCommit={(value) => commit('Edit Camera travel easing', (target) => { target.easing = value; })}
            />
          </InspectorFolder>
        </div>
      ) : null}

      {selection.type === 'visibility-key' ? (
        <div className="about-track-editor-fields">
          {number('atWU', object.atWU)}
          {locked ? <p className="about-track-editor-parameter-note is-wide">This boundary key stays at its Story WU; its visibility and outgoing fade easing remain editable.</p> : null}
          <RangeParameterField
            label="Visibility"
            ariaLabel="Simulation visibility"
            value={object.visibility}
            control={{ id: 'visibility', min: 0, max: 1, step: 0.01, unit: '' }}
            {...bindObjectRange('Edit simulation visibility', (target, value) => { target.visibility = value; })}
          />
          <SelectField
            label="Fade easing"
            value={object.easing}
            options={ABOUT_NARRATIVE_VISIBILITY_EASINGS.map((value) => ({ value, label: value }))}
            onCommit={(value) => commit('Edit Visibility fade easing', (target) => { target.easing = value; })}
          />
        </div>
      ) : null}

      {selection.type === 'world' ? (
        <WorldInspector
          key={object.id}
          object={object}
          selection={selection}
          store={store}
          locked={locked}
          finaleShapeLocked={finaleWorld}
          commit={commit}
        />
      ) : null}

      {selection.type === 'text-field' ? (
        <div className="about-track-editor-fields">
          <div className="about-track-editor-kind-row">
            <span>{object.kind}</span>
            {object.kind === 'stub' ? <b>Draft · Not published</b> : null}
          </div>
          <NumberField
            label="startWU"
            value={object.startWU}
            disabled={locked}
            onCommit={(value) => store.setTextTiming(object.id, 'startWU', value)}
          />
          <NumberField
            label="Position WU"
            value={object.focusWU}
            disabled={locked}
            onCommit={(value) => store.moveSelection(value - Number(object.focusWU), { snap: false })}
          />
          <NumberField
            label="endWU"
            value={object.endWU}
            disabled={locked}
            onCommit={(value) => store.setTextTiming(object.id, 'endWU', value)}
          />
          <p className="about-track-editor-parameter-note is-wide">Position WU moves the whole Text element without changing its entrance or exit duration.</p>
          {object.kind === 'title' ? (
            <>
              <TextField label="Title" value={object.text} disabled={locked} multiline focusId="text-copy" onCommit={(value) => commit('Edit Title', (target) => { target.text = value; })} />
              {object.preset === 'opener-v1' ? (
                <TextField
                  label="Description"
                  value={object.description || ''}
                  disabled={locked}
                  multiline
                  onCommit={(value) => commit('Edit Title description', (target) => {
                    if (value.trim()) target.description = value;
                    else delete target.description;
                  })}
                />
              ) : null}
              <SelectField label="Movement" value={object.movement} disabled={locked} options={[{ value: 'spatial', label: 'Spatial' }, { value: 'vertical', label: 'Vertical' }]} onCommit={(value) => commit('Edit Title movement', (target) => { target.movement = value; })} />
              <SelectField label="Title style" value={object.titleStyle || (object.preset === 'opener-v1' || object.preset === 'finale-v1' ? 'display' : 'standard')} disabled={locked} options={ABOUT_NARRATIVE_TITLE_STYLES.map((value) => ({ value, label: value === 'display' ? 'Display · Instrument' : 'Standard · Geist' }))} onCommit={(value) => commit('Edit Title style', (target) => { target.titleStyle = value; })} />
              <TextField label="Motion preset" value={object.preset} disabled={locked} onCommit={(value) => commit('Edit Title preset', (target) => { target.preset = value; })} />
            </>
          ) : null}
          {object.kind === 'scroll-block' ? (
            <>
              <TextField label="Copy" value={object.block?.text || ''} disabled={locked || !('text' in object.block)} multiline focusId={'text' in object.block ? 'text-copy' : undefined} onCommit={(value) => commit('Edit Scroll block', (target) => { target.block.text = value; })} />
              <SelectField
                label="Block kind"
                value={object.block?.kind || 'prose'}
                disabled={locked}
                options={ABOUT_NARRATIVE_BLOCK_KINDS.map((value) => ({ value, label: value }))}
                onCommit={(value) => commit('Edit block kind', (target) => {
                  const itemKind = ['clients', 'disciplines', 'list'].includes(value);
                  if (itemKind && (!Array.isArray(target.block.items) || target.block.items.length === 0)) {
                    target.block.items = [target.block.text || target.block.label || 'Untitled item'];
                  }
                  if (!itemKind && (typeof target.block.text !== 'string' || !target.block.text.trim())) {
                    target.block.text = Array.isArray(target.block.items) && target.block.items.length
                      ? target.block.items.join(', ')
                      : target.block.label || 'Untitled copy';
                  }
                  target.block.kind = value;
                })}
              />
              <TextField label="Block label" value={object.block?.label || ''} disabled={locked} onCommit={(value) => commit('Edit block label', (target) => { target.block.label = value; })} />
              <JsonField label="List items" value={object.block?.items || []} disabled={locked} focusId={!('text' in object.block) ? 'text-copy' : undefined} onCommit={(value) => commit('Edit block items', (target) => { target.block.items = value; })} onError={onMessage} />
              <JsonField label="Emphasis" value={object.block?.emphasis || []} disabled={locked} onCommit={(value) => commit('Edit block emphasis', (target) => { target.block.emphasis = value; })} onError={onMessage} />
              <label className="about-track-editor-check">
                <input type="checkbox" checked={object.block?.worldInfluence === true} disabled={locked} onChange={(event) => commit('Edit World influence', (target) => { target.block.worldInfluence = event.target.checked; })} />
                Influences the World presentation
              </label>
            </>
          ) : null}
          {object.kind === 'stub' ? <TextField label="Draft label" value={object.label || ''} disabled={locked} multiline focusId="text-copy" onCommit={(value) => commit('Edit Stub label', (target) => { target.label = value; })} /> : null}
          <TextField label="Presentation layout" value={object.presentation?.layout || ''} disabled={locked} onCommit={(value) => commit('Edit Text layout', (target) => { target.presentation = { ...target.presentation, layout: value }; })} />
          <label className="about-track-editor-check">
            <input
              type="checkbox"
              checked={object.publishable === true}
              disabled={locked || object.kind === 'stub'}
              onChange={(event) => commit('Change Text publishability', (target) => { target.publishable = event.target.checked; })}
            />
            Published semantic copy
          </label>
        </div>
      ) : null}

      {selection.type === 'interaction' ? (
        <div className="about-track-editor-fields">
          {object.type === 'grid-ripple' ? (
            <>
              <RangeParameterField
                label="Ripple starts"
                ariaLabel="Ripple starts"
                value={object.startWU}
                control={getGridRippleStartControl(snapshot.document, object)}
                disabled={locked}
                {...bindObjectRange('Move ripple start', (target, value) => {
                  const attackWU = Math.max(0, Number(target.activationWU) - Number(target.startWU));
                  target.startWU = cleanWU(value);
                  target.activationWU = cleanWU(Math.min(
                    Number(target.endWU),
                    Number(value) + attackWU,
                  ));
                })}
              />
              <p className="about-track-editor-parameter-note is-wide">
                Moves the ripple onset and full-strength point together, preserving its fade-in timing.
              </p>
            </>
          ) : number('startWU', object.startWU)}
          {number('activationWU', object.activationWU)}
          {number('endWU', object.endWU)}
          <SelectField
            label="Motion type"
            value={object.type}
            disabled={locked}
            options={Object.values(ABOUT_NARRATIVE_INTERACTION_DEFINITIONS).map((definition) => ({
              value: definition.id,
              label: definition.label,
            }))}
            onCommit={(value) => commit('Edit Interaction type', (target) => {
              const definition = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[value];
              target.type = value;
              target.parameters = { ...(definition?.defaultParameters || {}) };
            })}
          />
          <SelectField
            label="Target World"
            value={object.targetWorldId}
            disabled={locked}
            options={snapshot.document.tracks.worlds.objects.map((world) => ({ value: world.id, label: world.label || world.id }))}
            onCommit={(value) => commit('Retarget Interaction', (target) => { target.targetWorldId = value; })}
          />
          {object.type === 'discipline-reveal' ? (
            <>
              <p className="about-track-editor-parameter-note is-wide">
                Activation begins the discipline labels and grid isolation; end holds that treatment until the next handoff.
              </p>
              <JsonField
                label="Discipline labels"
                value={object.parameters?.items || []}
                disabled={locked}
                onCommit={(value) => commit('Edit Discipline labels', (target) => { target.parameters.items = value; })}
                onError={onMessage}
              />
            </>
          ) : null}
          {ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[object.type]?.parameters.map((control) => {
            if (control.type === 'select') {
              return (
                <SelectField
                  key={control.id}
                  label={control.label}
                  value={object.parameters?.[control.id]}
                  disabled={locked}
                  options={control.options.map((value) => ({ value, label: value }))}
                  onCommit={(value) => commit(`Edit ${control.label}`, (target) => {
                    target.parameters[control.id] = value;
                  })}
                />
              );
            }
            return (
              <RangeParameterField
                key={control.id}
                label={control.label}
                ariaLabel={`Interaction ${control.label}`}
                value={object.parameters?.[control.id]}
                control={control}
                disabled={locked}
                {...bindObjectRange(`Edit ${control.label}`, (target, value) => {
                  target.parameters[control.id] = value;
                })}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const PUBLIC_PREVIEW_BASELINE_HASH = 'public-editor-preview-v5';

export default function AboutNarrativeEditor({ store, rootRef, previewOnly = false }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [zoom, setZoom] = useState(1);
  const [textMenu, setTextMenu] = useState(false);
  const [interactionMenu, setInteractionMenu] = useState(false);
  const [baselineHash, setBaselineHash] = useState(previewOnly ? PUBLIC_PREVIEW_BASELINE_HASH : '');
  const [message, setMessage] = useState(previewOnly
    ? 'Public preview: changes stay on this device until exported.'
    : 'Loading canonical source…');
  const [saving, setSaving] = useState(false);
  const [recovery, setRecovery] = useState(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const saveRef = useRef(() => {});
  const durationWU = Number(snapshot.compiledPlan?.durationWU
    || snapshot.document.profiles.desktop.storyDurationWU);

  const save = useCallback(async () => {
    if (saving || !baselineHash) return;
    if (previewOnly) {
      exportAboutNarrativeDocument(store.getSnapshot().document, 'contents-about-preview.json');
      setMessage('Exported this phone preview as contents-about-preview.json.');
      return;
    }
    setSaving(true);
    setMessage('Validating and saving v5…');
    try {
      const persisted = await saveAboutNarrativeSource(store.getSnapshot().document, baselineHash);
      store.replaceDocument('Accept saved canonical source', persisted.document, { requireValid: true });
      store.markBaseline(persisted.document);
      setBaselineHash(persisted.hash);
      clearAboutNarrativeRecoveryDraft();
      setRecovery(null);
      setMessage('Saved canonical v5.');
    } catch (error) {
      setMessage(error.status === 409
        ? 'Save conflict: canonical changed. Export this draft or reload before saving.'
        : error.message);
    } finally {
      setSaving(false);
    }
  }, [baselineHash, previewOnly, saving, store]);
  saveRef.current = save;

  useEffect(() => {
    const root = rootRef?.current;
    if (root) root.dataset.editorActive = 'true';
    return () => {
      if (root) delete root.dataset.editorActive;
    };
  }, [rootRef]);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;
    const layout = snapshot.previewState.layoutProfile;
    const orientation = snapshot.previewState.orientation;
    root.dataset.editorPreviewOrientation = orientation;
    root.dataset.editorPreviewLayout = layout;
    const updatePreviewFrame = () => {
      const ratio = PREVIEW_ASPECT_RATIOS[layout]?.[orientation];
      if (!ratio) {
        root.style.removeProperty('--about-editor-preview-inline-size');
        root.style.removeProperty('--about-editor-preview-block-size');
        return;
      }
      const inspectorWidth = Number.parseFloat(
        getComputedStyle(root).getPropertyValue('--about-track-editor-inspector-width'),
      ) || 0;
      const availableWidth = Math.max(1, root.clientWidth - inspectorWidth);
      const availableHeight = Math.max(1, root.clientHeight);
      const inlineSize = Math.min(availableWidth, availableHeight * ratio);
      const blockSize = inlineSize / ratio;
      root.style.setProperty('--about-editor-preview-inline-size', `${inlineSize.toFixed(2)}px`);
      root.style.setProperty('--about-editor-preview-block-size', `${blockSize.toFixed(2)}px`);
    };
    updatePreviewFrame();
    const observer = new ResizeObserver(updatePreviewFrame);
    observer.observe(root);
    window.addEventListener('resize', updatePreviewFrame);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePreviewFrame);
      delete root.dataset.editorPreviewOrientation;
      delete root.dataset.editorPreviewLayout;
      root.style.removeProperty('--about-editor-preview-inline-size');
      root.style.removeProperty('--about-editor-preview-block-size');
    };
  }, [rootRef, snapshot.previewState.layoutProfile, snapshot.previewState.orientation]);

  useEffect(() => {
    if (previewOnly) {
      const source = store.getSnapshot().document;
      store.markBaseline(source);
      setBaselineHash(PUBLIC_PREVIEW_BASELINE_HASH);
      setRecovery(readAboutNarrativeRecoveryDraft({
        baselineHash: PUBLIC_PREVIEW_BASELINE_HASH,
      }));
      setMessage('Public preview: changes stay on this device until exported.');
      return undefined;
    }
    let active = true;
    loadAboutNarrativeSource().then((source) => {
      if (!active) return;
      const current = store.getSnapshot();
      if (!current.dirty) store.replaceDocument('Load canonical v5', source.document, { requireValid: true });
      store.markBaseline(source.document);
      setBaselineHash(source.hash);
      setRecovery(readAboutNarrativeRecoveryDraft({ baselineHash: source.hash }));
      setMessage(source.migrations?.length ? 'Loaded and migrated canonical source to v5.' : 'Canonical v5 ready.');
    }).catch((error) => {
      if (active) setMessage(`Canonical load failed: ${error.message}`);
    });
    return () => { active = false; };
  }, [previewOnly, store]);

  useEffect(() => {
    if (!snapshot.dirty || !baselineHash) return undefined;
    const timer = window.setTimeout(() => {
      try {
        writeAboutNarrativeRecoveryDraft(snapshot.document, baselineHash, {
          selection: snapshot.selection,
          storyWU: snapshot.transport.storyWU,
        });
      } catch (error) {
        setMessage(error.message);
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [baselineHash, snapshot.dirty, snapshot.document, snapshot.revision, snapshot.selection, snapshot.transport.storyWU]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const editing = target instanceof HTMLElement
        && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveRef.current();
        return;
      }
      if (editing) return;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo(); else store.undo();
      } else if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        store.redo();
      } else if (command && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        store.copySelection();
      } else if (command && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        store.pasteClipboard({ atWU: store.getSnapshot().transport.storyWU });
      } else if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        store.duplicateSelection();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        store.deleteSelection();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const amount = direction * (event.shiftKey ? 0.1 : 0.01);
        if (store.getSnapshot().selection.type === 'track') {
          const state = store.getSnapshot();
          store.setTransport({ owner: 'timeline', playing: false, storyWU: state.transport.storyWU + amount });
        } else store.moveSelection(amount);
      } else if (event.key === ' ') {
        event.preventDefault();
        const state = store.getSnapshot();
        store.setTransport({ owner: state.transport.playing ? 'timeline' : 'playback', playing: !state.transport.playing });
      } else if (event.key === 'Escape') {
        store.cancelGesture();
        store.cancelTry();
        setTextMenu(false);
        setMobileInspectorOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  const toggleLoop = () => {
    if (snapshot.transport.loop) {
      store.setTransport({ loop: null });
      return;
    }
    const loop = deriveAboutNarrativeTrackLoopRange({
      model: snapshot.document,
      selection: snapshot.selection,
      preRollWU: 0.15,
      postRollWU: 0.15,
    });
    if (loop.valid) store.setTransport({ loop: { startWU: loop.startWU, endWU: loop.endWU } });
    else setMessage(loop.reason);
  };

  const restoreRecovery = () => {
    if (!recovery?.document) return;
    store.replaceDocument('Restore recovery draft', recovery.document, { requireValid: true });
    if (recovery.envelope?.selection) store.setSelection(recovery.envelope.selection);
    if (Number.isFinite(recovery.envelope?.storyWU)) store.setTransport({ owner: 'timeline', storyWU: recovery.envelope.storyWU });
    setMessage(recovery.status === 'stale' ? 'Restored stale recovery draft; review before saving.' : 'Recovery draft restored.');
  };

  const diagnostics = snapshot.diagnostics || [];
  const errors = diagnostics.filter((item) => item.level === 'error');
  const openTextEditor = useCallback((object) => {
    store.setSelection({ type: 'text-field', id: object.id });
    if (window.matchMedia('(max-width: 700px)').matches) setMobileInspectorOpen(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.querySelector('[data-editor-focus-id="text-copy"]')?.focus();
      });
    });
  }, [store]);

  return (
    <aside
      className="about-track-editor"
      data-editor-version="sectionless-v5"
      data-mobile-inspector-open={mobileInspectorOpen ? 'true' : 'false'}
      aria-label="About narrative editor"
    >
      <header className="about-track-editor-topbar">
        <div className="about-track-editor-brand">
          <strong>About Timeline</strong>
          <span>v5 · camera + visibility</span>
        </div>
        <div className="about-track-editor-transport" aria-label="Timeline transport">
          <button
            type="button"
            className="is-play"
            aria-label={snapshot.transport.playing ? 'Pause timeline' : 'Play timeline'}
            onClick={() => store.setTransport({
              owner: snapshot.transport.playing ? 'timeline' : 'playback',
              playing: !snapshot.transport.playing,
            })}
          >{snapshot.transport.playing ? 'Pause' : 'Play'}</button>
          <button type="button" className={snapshot.transport.loop ? 'is-active' : ''} onClick={toggleLoop}>Loop</button>
          <input
            aria-label="Story WU playhead"
            type="range"
            min="0"
            max={durationWU}
            step="0.005"
            value={snapshot.transport.storyWU}
            onChange={(event) => store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(event.target.value) })}
          />
          <output>{snapshot.transport.storyWU.toFixed(3)} WU</output>
        </div>
        <div className="about-track-editor-actions">
          <button
            type="button"
            className="about-track-editor-inspector-toggle"
            aria-expanded={mobileInspectorOpen}
            onClick={() => setMobileInspectorOpen((open) => !open)}
          >Inspector</button>
          <button type="button" disabled={!snapshot.history.canUndo} onClick={() => store.undo()} title={snapshot.history.undoLabel}>Undo</button>
          <button type="button" disabled={!snapshot.history.canRedo} onClick={() => store.redo()} title={snapshot.history.redoLabel}>Redo</button>
          <button type="button" onClick={() => exportAboutNarrativeDocument(snapshot.document)}>Export</button>
          <button
            type="button"
            onClick={() => {
              try {
                const timestamp = Date.now();
                writeAboutNarrativeCheckpoint({
                  id: `checkpoint-${timestamp}`,
                  name: `Manual checkpoint · ${new Date(timestamp).toLocaleString()}`,
                  timestamp,
                  baseSourceHash: baselineHash,
                  document: snapshot.document,
                  selection: snapshot.selection,
                  storyWU: snapshot.transport.storyWU,
                });
                setMessage('Checkpoint saved locally.');
              } catch (error) {
                setMessage(`Checkpoint failed: ${error.message}`);
              }
            }}
          >Checkpoint</button>
          <button type="button" className="is-save" disabled={!snapshot.dirty || saving || errors.length > 0 || !baselineHash} onClick={save}>
            {previewOnly
              ? snapshot.dirty ? 'Export draft' : 'Preview ready'
              : saving ? 'Saving…' : snapshot.dirty ? 'Save v5' : 'Saved'}
          </button>
        </div>
      </header>

      <div className="about-track-editor-preview" aria-label="Responsive preview profile">
        {['desktop', 'tablet', 'mobile'].map((profile) => (
          <button
            type="button"
            key={profile}
            className={snapshot.previewState.layoutProfile === profile ? 'is-active' : ''}
            onClick={() => store.setPreviewState({ layoutProfile: profile })}
          >{profile[0].toUpperCase() + profile.slice(1)}</button>
        ))}
        <select
          aria-label="Preview orientation"
          value={snapshot.previewState.orientation}
          onChange={(event) => store.setPreviewState({ orientation: event.target.value })}
        >
          <option value="landscape">Landscape</option>
          <option value="portrait">Portrait</option>
        </select>
        <label>
          <input
            type="checkbox"
            checked={snapshot.previewState.motionProfile === 'reduced'}
            onChange={(event) => store.setPreviewState({ motionProfile: event.target.checked ? 'reduced' : 'full' })}
          />
          Reduced Motion
        </label>
      </div>

      <Timeline
        snapshot={snapshot}
        store={store}
        zoom={zoom}
        setZoom={setZoom}
        textMenu={textMenu}
        setTextMenu={setTextMenu}
        interactionMenu={interactionMenu}
        setInteractionMenu={setInteractionMenu}
        onOpenTextEditor={openTextEditor}
      />

      <section className="about-track-editor-inspector" aria-label="Selected object inspector">
        <button
          type="button"
          className="about-track-editor-inspector-close"
          aria-label="Close inspector"
          onClick={() => setMobileInspectorOpen(false)}
        >Close</button>
        <ObjectInspector snapshot={snapshot} store={store} onMessage={setMessage} />
        <footer>
          <button type="button" disabled={snapshot.selection.type === 'track'} onClick={() => store.copySelection()}>Copy</button>
          <button type="button" disabled={!snapshot.clipboard} onClick={() => store.pasteClipboard({ atWU: snapshot.transport.storyWU })}>Paste</button>
          <button type="button" disabled={snapshot.selection.type === 'track'} onClick={() => store.duplicateSelection()}>Duplicate</button>
          <button type="button" className="is-danger" disabled={snapshot.selection.type === 'track'} onClick={() => store.deleteSelection()}>
            {snapshot.selection.type === 'camera-key' ? 'Delete camera keyframe' : 'Delete'}
          </button>
        </footer>
      </section>

      <div className="about-track-editor-status" role="status" aria-live="polite">
        <span className={snapshot.dirty ? 'is-dirty' : 'is-clean'}>
          {snapshot.dirty ? 'Unsaved' : previewOnly ? 'Preview' : 'Canonical'}
        </span>
        <p>{snapshot.rejectedEdit?.reason || message}</p>
        {diagnostics.length ? <b>{errors.length} errors · {diagnostics.length - errors.length} notices</b> : <b>Plan valid</b>}
      </div>

      {recovery?.available ? (
        <section className="about-track-editor-recovery" aria-label="Recovery draft">
          <strong>{recovery.status === 'stale' ? 'A recovery draft exists from an earlier canonical source.' : 'A recovery draft is available.'}</strong>
          <p>{recovery.reason || 'Restore it, export it, or discard it.'}</p>
          <div>
            {recovery.document ? <button type="button" onClick={restoreRecovery}>Restore draft</button> : null}
            {recovery.original !== undefined ? <button type="button" onClick={() => exportAboutNarrativeDocument(recovery.original, 'contents-about-recovered.json', { preserveOriginal: true })}>Export original</button> : null}
            <button type="button" onClick={() => { clearAboutNarrativeRecoveryDraft(); setRecovery(null); }}>Discard</button>
          </div>
        </section>
      ) : null}
    </aside>
  );
}
