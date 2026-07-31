import { useMemo, useRef, useState } from 'react';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
} from './aboutNarrativeDefinitions.js';
import {
  getAboutNarrativePointFieldItemLabel,
  getAboutNarrativePointFieldItemRange,
  getAboutNarrativePointFieldStateUseCount,
} from './aboutNarrativePointFieldEditing.js';
import {
  applyAboutNarrativePointFieldOverrides,
} from './aboutNarrativePointFieldSchema.js';

const PROFILE_IDS = Object.freeze(['desktop', 'tablet', 'mobile']);
const TRANSITION_TYPES = Object.freeze(['morph', 'dissolve-morph', 'hold', 'step-end']);
const KEYBOARD_STEP_WU = 0.05;
const KEYBOARD_LARGE_STEP_WU = 0.25;
const TIME_EPSILON = 0.000001;

const titleCase = (value) => String(value || '')
  .replaceAll('-', ' ')
  .replace(/^./, (letter) => letter.toUpperCase());
const cleanNumber = (value) => Number(Number(value).toFixed(6));

function getPointField(document, editScope) {
  if (!PROFILE_IDS.includes(editScope)) return document.tracks.pointField;
  return applyAboutNarrativePointFieldOverrides(
    document.tracks.pointField,
    document.profiles[editScope].overrides.pointField,
  );
}

function getOverride(document, editScope, type, id) {
  if (!PROFILE_IDS.includes(editScope)) return null;
  const collection = type === 'point-field-state'
    ? 'stateDefinitions'
    : type === 'point-field-key' ? 'keys' : 'segments';
  return document.profiles[editScope].overrides.pointField[collection]?.[id] || null;
}

function stackOffsets(keys) {
  const groups = new Map();
  keys.forEach((key) => {
    const token = cleanNumber(key.atWU);
    if (!groups.has(token)) groups.set(token, []);
    groups.get(token).push(key.id);
  });
  return new Map([...groups.values()].flatMap((ids) => ids.map((id, index) => [
    id,
    index - ((ids.length - 1) / 2),
  ])));
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`about-track-editor-field${wide ? ' is-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumberField({ label, value, disabled = false, min, max, step = 0.01, onCommit }) {
  return (
    <Field label={label}>
      <input
        key={`${label}-${value}`}
        type="number"
        defaultValue={value}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        onBlur={(event) => {
          const next = Number(event.currentTarget.value);
          if (Number.isFinite(next) && next !== Number(value)) onCommit?.(next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            event.currentTarget.value = String(value);
            event.currentTarget.blur();
          }
        }}
      />
    </Field>
  );
}

function TextField({ label, value, disabled = false, onCommit }) {
  return (
    <Field label={label} wide>
      <input
        key={`${label}-${value}`}
        type="text"
        defaultValue={value}
        disabled={disabled}
        onBlur={(event) => {
          const next = event.currentTarget.value.trim();
          if (next && next !== value) onCommit?.(next);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            event.currentTarget.value = String(value);
            event.currentTarget.blur();
          }
        }}
      />
    </Field>
  );
}

function SelectField({ label, value, disabled = false, options, onCommit, wide = false }) {
  return (
    <Field label={label} wide={wide}>
      <select
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onCommit?.(event.currentTarget.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </Field>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  disabled = false,
  onEdit,
}) {
  const gestureRef = useRef(false);
  const latestRef = useRef(value);
  const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  const normalize = (next) => cleanNumber(Math.min(max, Math.max(min, Number(next))));
  const normalizedValue = normalize(value);
  const progress = max > min ? ((normalizedValue - min) / (max - min)) * 100 : 0;
  const emit = (phase, next) => {
    const normalized = normalize(next);
    latestRef.current = normalized;
    onEdit?.({ phase, value: normalized });
  };
  const begin = () => {
    if (disabled || gestureRef.current) return;
    gestureRef.current = true;
    emit('begin', normalizedValue);
  };
  const preview = (next) => {
    begin();
    if (gestureRef.current) emit('preview', next);
  };
  const finish = () => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    emit('commit', latestRef.current);
  };
  const cancel = () => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    emit('cancel', normalizedValue);
  };
  return (
    <div className="about-track-editor-parameter" role="group" aria-label={label}>
      <div className="about-track-editor-parameter__meta">
        <span>{label}</span>
        <small>{min}–{max}</small>
      </div>
      <div className="about-track-editor-parameter__controls">
        <input
          className="about-track-editor-parameter__slider"
          type="range"
          aria-label={`${label} slider`}
          value={normalizedValue}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          style={{ '--parameter-progress': `${progress}%` }}
          onPointerDown={begin}
          onFocus={begin}
          onChange={(event) => preview(event.currentTarget.value)}
          onPointerUp={finish}
          onPointerCancel={cancel}
          onBlur={finish}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            cancel();
            event.currentTarget.blur();
          }}
        />
        <label className="about-track-editor-parameter__exact">
          <span className="about-track-editor-sr-only">{label} exact value</span>
          <input
            key={`${label}-${normalizedValue}`}
            type="number"
            aria-label={`${label} exact value`}
            defaultValue={normalizedValue.toFixed(precision)}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            onBlur={(event) => {
              const next = Number(event.currentTarget.value);
              if (Number.isFinite(next) && normalize(next) !== normalizedValue) {
                emit('commit', next);
              } else {
                event.currentTarget.value = normalizedValue.toFixed(precision);
              }
            }}
          />
          {unit ? <em>{unit}</em> : null}
        </label>
      </div>
    </div>
  );
}

function InspectorFolder({ label, children, count = 0, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="about-track-editor-folder"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary><span>{label}</span><small>{count}</small><i aria-hidden="true" /></summary>
      <div className="about-track-editor-folder__body">{children}</div>
    </details>
  );
}

function OverrideBadge({ visible }) {
  return visible ? <span className="about-point-field-override-badge">Override</span> : null;
}

function EditScopeSummary({ editScope, previewProfile }) {
  return (
    <div className="about-point-field-scope-summary" aria-label="Point field preview and edit scopes">
      <span>Preview: <b>{titleCase(previewProfile)}</b></span>
      <span>Editing: <b>{editScope === 'base' ? 'Base' : `${titleCase(editScope)} override`}</b></span>
    </div>
  );
}

function PointKey({
  pointKey,
  state,
  stackOffset,
  selected,
  overridden,
  pixelsPerWU,
  editScope,
  onSelect,
  onMoveKey,
}) {
  const gestureRef = useRef(null);
  const protectedKey = pointKey.protected === true;
  const selection = { type: 'point-field-key', id: pointKey.id };
  const begin = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect?.(selection);
    if (protectedKey) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startWU: Number(pointKey.atWU),
      latestWU: Number(pointKey.atWU),
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onMoveKey?.({ phase: 'begin', keyId: pointKey.id, atWU: pointKey.atWU, scope: editScope });
  };
  const move = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gesture.latestWU = cleanNumber(gesture.startWU + ((event.clientX - gesture.startX) / pixelsPerWU));
    onMoveKey?.({ phase: 'preview', keyId: pointKey.id, atWU: gesture.latestWU, scope: editScope });
  };
  const finish = (event, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    onMoveKey?.({
      phase: cancelled ? 'cancel' : 'commit',
      keyId: pointKey.id,
      atWU: gesture.latestWU,
      scope: editScope,
    });
  };
  return (
    <button
      type="button"
      className={`about-point-field-key${selected ? ' is-selected' : ''}${protectedKey ? ' is-protected' : ''}${overridden ? ' has-override' : ''}`}
      style={{
        left: Number(pointKey.atWU) * pixelsPerWU,
        '--point-key-stack': stackOffset,
      }}
      aria-label={`${state?.label || pointKey.stateId} key at ${Number(pointKey.atWU).toFixed(3)} WU${protectedKey ? ', protected' : ''}${overridden ? ', profile override' : ''}`}
      aria-pressed={selected}
      data-point-field-selection="point-field-key"
      data-point-field-id={pointKey.id}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onKeyDown={(event) => {
        if (protectedKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const step = event.shiftKey ? KEYBOARD_LARGE_STEP_WU : KEYBOARD_STEP_WU;
        onMoveKey?.({
          phase: 'commit',
          keyId: pointKey.id,
          atWU: cleanNumber(Number(pointKey.atWU) + (direction * step)),
          scope: editScope,
        });
      }}
    >
      <i aria-hidden="true" />
      <span className="about-track-editor-sr-only">{state?.label || pointKey.stateId}</span>
    </button>
  );
}

function PointSegment({
  segment,
  fromKey,
  toKey,
  label,
  selected,
  overridden,
  pixelsPerWU,
  editScope,
  onSelect,
  onMoveSegment,
}) {
  const gestureRef = useRef(null);
  const startWU = Number(fromKey.atWU);
  const endWU = Number(toKey.atWU);
  const width = Math.max(3, (endWU - startWU) * pixelsPerWU);
  const selection = { type: 'point-field-segment', id: segment.id };
  const begin = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    onSelect?.(selection);
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      latestDeltaWU: 0,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    onMoveSegment?.({ phase: 'begin', segmentId: segment.id, deltaWU: 0, scope: editScope });
  };
  const move = (event) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gesture.latestDeltaWU = cleanNumber((event.clientX - gesture.startX) / pixelsPerWU);
    onMoveSegment?.({
      phase: 'preview',
      segmentId: segment.id,
      deltaWU: gesture.latestDeltaWU,
      scope: editScope,
    });
  };
  const finish = (event, cancelled = false) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    onMoveSegment?.({
      phase: cancelled ? 'cancel' : 'commit',
      segmentId: segment.id,
      deltaWU: gesture.latestDeltaWU,
      scope: editScope,
    });
  };
  return (
    <button
      type="button"
      className={`about-point-field-segment is-${segment.transition.type}${selected ? ' is-selected' : ''}${overridden ? ' has-override' : ''}`}
      style={{ left: startWU * pixelsPerWU, width }}
      aria-label={`${label}, ${segment.transition.type}, ${startWU.toFixed(3)} to ${endWU.toFixed(3)} WU${overridden ? ', profile override' : ''}`}
      aria-pressed={selected}
      data-point-field-selection="point-field-segment"
      data-point-field-id={segment.id}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        const direction = event.key === 'ArrowLeft' ? -1 : 1;
        const step = event.shiftKey ? KEYBOARD_LARGE_STEP_WU : KEYBOARD_STEP_WU;
        onMoveSegment?.({
          phase: 'commit',
          segmentId: segment.id,
          deltaWU: direction * step,
          scope: editScope,
        });
      }}
    >
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  );
}

/**
 * Timeline-only Point field lane. The host owns gestures and applies the
 * requested edit through the v6 store; this component owns no authored state.
 */
export function PointFieldLane({
  document,
  selection,
  pixelsPerWU,
  editScope = 'base',
  previewProfile = 'desktop',
  onSelect,
  onMoveKey,
  onMoveSegment,
}) {
  const pointField = useMemo(
    () => getPointField(document, editScope),
    [document, editScope],
  );
  const basePointField = document.tracks.pointField;
  const stateById = useMemo(
    () => new Map(pointField.stateDefinitions.map((state) => [state.id, state])),
    [pointField],
  );
  const keyById = useMemo(
    () => new Map(pointField.keys.map((pointKey) => [pointKey.id, pointKey])),
    [pointField],
  );
  const stacks = useMemo(() => stackOffsets(pointField.keys), [pointField]);
  const baseKeyById = useMemo(
    () => new Map(basePointField.keys.map((pointKey) => [pointKey.id, pointKey])),
    [basePointField],
  );
  return (
    <div
      className="about-point-field-lane"
      role="group"
      aria-label={`Point field timeline. Preview ${previewProfile}. Editing ${editScope}.`}
      data-point-field-edit-scope={editScope}
      data-point-field-preview-profile={previewProfile}
    >
      {PROFILE_IDS.includes(editScope) ? pointField.keys.map((pointKey) => {
        const baseKey = baseKeyById.get(pointKey.id);
        if (!baseKey || Math.abs(Number(baseKey.atWU) - Number(pointKey.atWU)) <= TIME_EPSILON) return null;
        return (
          <i
            className="about-point-field-key-ghost"
            key={`ghost-${pointKey.id}`}
            style={{ left: Number(baseKey.atWU) * pixelsPerWU }}
            title={`Base: ${Number(baseKey.atWU).toFixed(3)} WU`}
            aria-hidden="true"
          />
        );
      }) : null}
      {pointField.segments.map((item) => {
        const fromKey = keyById.get(item.fromKeyId);
        const toKey = keyById.get(item.toKeyId);
        if (!fromKey || !toKey) return null;
        return (
          <PointSegment
            key={item.id}
            segment={item}
            fromKey={fromKey}
            toKey={toKey}
            label={getAboutNarrativePointFieldItemLabel(document, 'point-field-segment', item.id)}
            selected={selection?.type === 'point-field-segment' && selection.id === item.id}
            overridden={Boolean(getOverride(document, editScope, 'point-field-segment', item.id))}
            pixelsPerWU={pixelsPerWU}
            editScope={editScope}
            onSelect={onSelect}
            onMoveSegment={onMoveSegment}
          />
        );
      })}
      {pointField.keys.map((pointKey) => (
        <PointKey
          key={pointKey.id}
          pointKey={pointKey}
          state={stateById.get(pointKey.stateId)}
          stackOffset={stacks.get(pointKey.id) || 0}
          selected={selection?.type === 'point-field-key' && selection.id === pointKey.id}
          overridden={Boolean(getOverride(document, editScope, 'point-field-key', pointKey.id))}
          pixelsPerWU={pixelsPerWU}
          editScope={editScope}
          onSelect={onSelect}
          onMoveKey={onMoveKey}
        />
      ))}
    </div>
  );
}

function StateLibrary({ document, editScope, selection, onSelect }) {
  const pointField = getPointField(document, editScope);
  const firstUse = new Map();
  pointField.keys.forEach((pointKey, index) => {
    if (!firstUse.has(pointKey.stateId)) firstUse.set(pointKey.stateId, index);
  });
  const states = [...pointField.stateDefinitions].sort((left, right) => (
    (firstUse.get(left.id) ?? Number.MAX_SAFE_INTEGER)
    - (firstUse.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    || left.id.localeCompare(right.id)
  ));
  return (
    <div className="about-point-field-state-library" role="group" aria-label="Point field state library">
      {states.map((state) => {
        const uses = getAboutNarrativePointFieldStateUseCount(document, state.id);
        const selected = selection?.type === 'point-field-state' && selection.id === state.id;
        return (
          <button
            type="button"
            key={state.id}
            className={selected ? 'is-selected' : ''}
            aria-pressed={selected}
            onClick={() => onSelect?.({ type: 'point-field-state', id: state.id })}
          >
            <span><b>{state.label}</b><small>{state.shapeId}</small></span>
            <span>{uses.keys} key{uses.keys === 1 ? '' : 's'}</span>
            <OverrideBadge visible={Boolean(getOverride(document, editScope, 'point-field-state', state.id))} />
          </button>
        );
      })}
    </div>
  );
}

function InspectorHeader({ eyebrow, title, id, protectedItem, overridden }) {
  return (
    <header className="about-point-field-inspector-header">
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      <code>{id}</code>
      <div>
        {protectedItem ? <b>Protected</b> : null}
        <OverrideBadge visible={overridden} />
      </div>
    </header>
  );
}

function ResetOverrideButton({ document, editScope, type, id, onResetOverride }) {
  if (!getOverride(document, editScope, type, id)) return null;
  return (
    <button
      type="button"
      className="about-point-field-reset"
      onClick={() => onResetOverride?.({ profileId: editScope, type, id })}
    >
      Reset {titleCase(editScope)} override
    </button>
  );
}

function KeyInspector({
  document,
  pointKey,
  editScope,
  previewProfile,
  onEdit,
  onMoveKey,
  onMakeUnique,
  onResetOverride,
  onDuplicateState,
}) {
  const state = document.tracks.pointField.stateDefinitions.find((item) => item.id === pointKey.stateId);
  if (!state) return null;
  return (
    <StateInspector
      document={document}
      state={state}
      pointKey={pointKey}
      editScope={editScope}
      previewProfile={previewProfile}
      onEdit={onEdit}
      onMoveKey={onMoveKey}
      onMakeUnique={onMakeUnique}
      onResetOverride={onResetOverride}
      onDuplicateState={onDuplicateState}
    />
  );
}

function transitionPatch(onEdit, editScope, segmentId, patch, label, phase = 'commit') {
  onEdit?.({
    phase,
    scope: editScope,
    type: 'point-field-segment',
    id: segmentId,
    patch: { transition: patch },
    label,
  });
}

function SegmentInspector({
  document,
  segment: baseSegment,
  editScope,
  previewProfile,
  storyWU,
  onEdit,
  onResetOverride,
  onSplitSegment,
}) {
  const pointField = getPointField(document, editScope);
  const segment = pointField.segments.find((item) => item.id === baseSegment.id) || baseSegment;
  const fromKey = pointField.keys.find((item) => item.id === segment.fromKeyId);
  const toKey = pointField.keys.find((item) => item.id === segment.toKeyId);
  const sameState = fromKey.stateId === toKey.stateId;
  const range = getAboutNarrativePointFieldItemRange(
    { ...document, tracks: { ...document.tracks, pointField } },
    'point-field-segment',
    segment.id,
  );
  const splitEnabled = editScope === 'base'
    && Number(storyWU) >= Number(range?.startWU)
    && Number(storyWU) <= Number(range?.endWU);
  const motionDisabled = ['hold', 'step-end'].includes(segment.transition.type);
  return (
    <div className="about-track-editor-inspector__content">
      <InspectorHeader
        eyebrow="Point field transition"
        title={getAboutNarrativePointFieldItemLabel(document, 'point-field-segment', segment.id)}
        id={segment.id}
        overridden={Boolean(getOverride(document, editScope, 'point-field-segment', segment.id))}
      />
      <EditScopeSummary editScope={editScope} previewProfile={previewProfile} />
      <div className="about-track-editor-fields about-point-field-transition-fields">
        <NumberField label="Start WU" value={fromKey.atWU} disabled />
        <NumberField label="End WU" value={toKey.atWU} disabled />
        <SelectField
          label="Type"
          value={segment.transition.type}
          wide
          options={(sameState ? ['hold'] : TRANSITION_TYPES.filter((value) => value !== 'hold'))
            .map((value) => ({ value, label: titleCase(value) }))}
          onCommit={(type) => transitionPatch(onEdit, editScope, segment.id, { type }, 'Change point transition type')}
        />
        <SelectField
          label="Easing"
          value={segment.transition.easing}
          disabled={motionDisabled}
          options={ABOUT_NARRATIVE_EASINGS.filter((value) => value !== 'hold')
            .map((value) => ({ value, label: titleCase(value) }))}
          onCommit={(easing) => transitionPatch(onEdit, editScope, segment.id, { easing }, 'Change point transition easing')}
        />
        <SelectField
          label="Correspondence"
          value={segment.transition.correspondence ?? ''}
          disabled={motionDisabled}
          options={[
            { value: '', label: 'Automatic' },
            ...ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((value) => ({ value, label: titleCase(value) })),
          ]}
          onCommit={(value) => transitionPatch(
            onEdit,
            editScope,
            segment.id,
            { correspondence: value || null },
            'Change point correspondence',
          )}
        />
        <InspectorFolder label="Split transition" count={2}>
          <p className="about-track-editor-parameter-note">
            Split at the playhead and duplicate either endpoint state. The new opposite span becomes a hold.
          </p>
          <div className="about-point-field-split-actions">
            <button
              type="button"
              disabled={!splitEnabled}
              onClick={() => onSplitSegment?.({ segmentId: segment.id, atWU: storyWU, duplicate: 'source' })}
            >Duplicate source</button>
            <button
              type="button"
              disabled={!splitEnabled}
              onClick={() => onSplitSegment?.({ segmentId: segment.id, atWU: storyWU, duplicate: 'destination' })}
            >Duplicate destination</button>
          </div>
        </InspectorFolder>
        <ResetOverrideButton
          document={document}
          editScope={editScope}
          type="point-field-segment"
          id={segment.id}
          onResetOverride={onResetOverride}
        />
      </div>
    </div>
  );
}

function statePatch(onEdit, editScope, stateId, patch, label, phase = 'commit') {
  onEdit?.({
    phase,
    scope: editScope,
    type: 'point-field-state',
    id: stateId,
    patch,
    label,
  });
}

function controlValue(state, control) {
  const value = state.shapeParameters?.[control.id];
  return value ?? (control.type === 'select' ? control.options[0] : control.min);
}

function formControlLabel(shapeId, control) {
  if (control.id === 'density') return 'Density';
  if (shapeId === 'discipline-grid-v1' && control.id === 'depthJitter') return 'Depth variation';
  return control.label;
}

function StateInspector({
  document,
  state: baseState,
  pointKey = null,
  editScope,
  previewProfile,
  onEdit,
  onMoveKey,
  onMakeUnique,
  onResetOverride,
  onDuplicateState,
  onDeleteState,
}) {
  const pointField = getPointField(document, editScope);
  const state = pointField.stateDefinitions.find((item) => item.id === baseState.id) || baseState;
  const uses = getAboutNarrativePointFieldStateUseCount(document, state.id);
  const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[state.shapeId];
  const protectedState = baseState.protected === true;
  const baseOnly = editScope === 'base';
  const resolvedKey = pointKey
    ? pointField.keys.find((item) => item.id === pointKey.id) || pointKey
    : null;
  const protectedKey = pointKey?.protected === true;
  const shapeControlGroups = shape ? [
    {
      label: 'Size',
      controls: shape.parameters.filter((control) => control.group === 'shape-dimensions'),
    },
    {
      label: 'Character',
      controls: shape.parameters.filter((control) => control.group !== 'shape-dimensions'),
    },
  ].filter((group) => group.controls.length) : [];
  const edit = (patch, label, phase = 'commit') => statePatch(
    onEdit, editScope, state.id, patch, label, phase,
  );
  const editTransformAxis = (field, axis, value) => {
    const vector = [...state.transform[field]];
    vector[axis] = value;
    edit({ transform: { [field]: vector } }, `Edit state ${field}`);
  };
  return (
    <div className="about-track-editor-inspector__content">
      <InspectorHeader
        eyebrow={pointKey ? 'Point field form' : 'Point field state'}
        title={state.label}
        id={pointKey?.id || state.id}
        protectedItem={protectedState || protectedKey}
        overridden={Boolean(pointKey
          ? getOverride(document, editScope, 'point-field-key', pointKey.id)
          : getOverride(document, editScope, 'point-field-state', state.id))}
      />
      <EditScopeSummary editScope={editScope} previewProfile={previewProfile} />
      <p className="about-track-editor-parameter-note about-point-field-use-note">
        {pointKey ? 'This key uses ' : 'Used by '}
        <b>{state.label}</b>, used by {uses.keys} timeline key{uses.keys === 1 ? '' : 's'} and {uses.interactions} interaction{uses.interactions === 1 ? '' : 's'}.
        Form edits apply to every use.
      </p>
      <div className="about-track-editor-fields">
        {resolvedKey ? (
          <InspectorFolder label="Key" count={2} defaultOpen>
            <div className="about-track-editor-folder__grid">
              <NumberField
                label="Story WU"
                value={resolvedKey.atWU}
                disabled={protectedKey}
                min={0}
                step={0.01}
                onCommit={(atWU) => onMoveKey?.({
                  phase: 'commit', keyId: pointKey.id, atWU, scope: editScope,
                })}
              />
              <SelectField
                label="Form"
                value={resolvedKey.stateId}
                disabled={protectedKey || !baseOnly}
                options={pointField.stateDefinitions.map((item) => ({ value: item.id, label: item.label }))}
                onCommit={(stateId) => onEdit?.({
                  phase: 'commit',
                  scope: 'base',
                  type: 'point-field-key',
                  id: pointKey.id,
                  patch: { stateId },
                  label: 'Change point-field key state',
                })}
              />
            </div>
            {uses.keys > 1 && !protectedKey && baseOnly ? (
              <button type="button" onClick={() => onMakeUnique?.({ keyId: pointKey.id })}>
                Make this form unique
              </button>
            ) : null}
          </InspectorFolder>
        ) : null}
        {baseOnly ? (
          <InspectorFolder label="Form" count={3} defaultOpen>
            <div className="about-track-editor-folder__grid">
              <TextField label="Name" value={state.label} onCommit={(label) => edit({ label }, 'Rename point-field state')} />
              <SelectField
                label="Shape"
                value={state.shapeId}
                disabled={protectedState}
                wide
                options={Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS)
                  .map((item) => ({ value: item.id, label: item.label }))}
                onCommit={(shapeId) => {
                  const definition = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[shapeId];
                  const shapeParameters = Object.fromEntries(definition.parameters.map((control) => [
                    control.id,
                    control.type === 'select' ? control.options[0] : control.min,
                  ]));
                  edit({ shapeId, adapterId: definition.adapterId, shapeParameters }, 'Change point-field shape');
                }}
              />
              <NumberField label="Seed" value={state.seed} min={0} step={1} onCommit={(seed) => edit({ seed: Math.round(seed) }, 'Change state seed')} />
            </div>
          </InspectorFolder>
        ) : (
          <p className="about-track-editor-parameter-note is-wide">
            Shape, seed, parameters, and modifiers inherit from Base. This profile owns placement only.
          </p>
        )}
        {baseOnly && shapeControlGroups.map((group) => (
          <InspectorFolder key={group.label} label={group.label} count={group.controls.length} defaultOpen={group.label === 'Size'}>
            <div className="about-track-editor-folder__grid">
              {group.controls.map((control) => (control.type === 'select' ? (
                <SelectField
                  key={control.id}
                  label={formControlLabel(state.shapeId, control)}
                  value={controlValue(state, control)}
                  options={control.options.map((value) => ({ value, label: titleCase(value) }))}
                  onCommit={(value) => edit({
                    shapeParameters: { ...state.shapeParameters, [control.id]: value },
                  }, `Change ${control.label}`)}
                />
              ) : (
                <RangeField
                  key={control.id}
                  label={formControlLabel(state.shapeId, control)}
                  value={controlValue(state, control)}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  unit={control.unit}
                  onEdit={({ phase, value }) => edit({
                    shapeParameters: { ...state.shapeParameters, [control.id]: value },
                  }, `Shape ${control.label}`, phase)}
                />
              )))}
            </div>
          </InspectorFolder>
        ))}
        <InspectorFolder label="Placement" count={baseOnly ? 10 : 9} defaultOpen>
          <div className="about-track-editor-folder__grid">
            <NumberField label="Rail anchor WU" value={state.railAnchorWU} step={0.01} onCommit={(railAnchorWU) => edit({ railAnchorWU }, 'Move state rail anchor')} />
            {baseOnly ? <NumberField label="Entry distance" value={state.entryDistanceWU} step={0.01} onCommit={(entryDistanceWU) => edit({ entryDistanceWU }, 'Change state entry distance')} /> : null}
            {['position', 'rotation'].flatMap((field) => [0, 1, 2].map((axis) => (
              <NumberField
                key={`${field}-${axis}`}
                label={`${titleCase(field)} ${'XYZ'[axis]}`}
                value={state.transform[field][axis]}
                step={0.01}
                onCommit={(value) => editTransformAxis(field, axis, value)}
              />
            )))}
            <NumberField label="Scale" value={state.transform.scale} min={0.01} step={0.01} onCommit={(scale) => edit({ transform: { scale } }, 'Change state scale')} />
            <NumberField label="Point size" value={state.transform.pointSizeScale ?? 1} min={0.01} step={0.01} onCommit={(pointSizeScale) => edit({ transform: { pointSizeScale } }, 'Change state point size')} />
          </div>
        </InspectorFolder>
        {baseOnly && state.modifiers.map((modifier, modifierIndex) => {
          const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
          if (!definition) return null;
          return (
            <InspectorFolder key={`${modifier.id}-${modifierIndex}`} label={`Modifier · ${definition.label}`} count={definition.parameters.length}>
              <div className="about-track-editor-folder__grid">
                {definition.parameters.map((control) => {
                  const value = modifier.parameters?.[control.id]
                    ?? (control.type === 'select' ? control.options[0] : control.min);
                  const update = (next, phase = 'commit') => {
                    const modifiers = cloneModifiers(state.modifiers);
                    modifiers[modifierIndex].parameters ||= {};
                    modifiers[modifierIndex].parameters[control.id] = next;
                    edit({ modifiers }, `Edit ${definition.label} ${control.label}`, phase);
                  };
                  return control.type === 'select' ? (
                    <SelectField
                      key={control.id}
                      label={control.label}
                      value={value}
                      options={control.options.map((option) => ({ value: option, label: titleCase(option) }))}
                      onCommit={update}
                    />
                  ) : (
                    <RangeField
                      key={control.id}
                      label={control.label}
                      value={value}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      unit={control.unit}
                      onEdit={({ phase, value: next }) => update(next, phase)}
                    />
                  );
                })}
              </div>
            </InspectorFolder>
          );
        })}
        <div className="about-point-field-state-actions">
          <button type="button" disabled={!baseOnly} onClick={() => onDuplicateState?.({ stateId: state.id })}>
            Duplicate state
          </button>
          <button
            type="button"
            className="is-danger"
            disabled={!baseOnly || protectedState || uses.total > 0}
            title={uses.total > 0 ? 'Remove every key and interaction reference first.' : ''}
            onClick={() => onDeleteState?.({ stateId: state.id })}
          >Delete unused state</button>
        </div>
        <ResetOverrideButton
          document={document}
          editScope={editScope}
          type={pointKey ? 'point-field-key' : 'point-field-state'}
          id={pointKey?.id || state.id}
          onResetOverride={onResetOverride}
        />
      </div>
    </div>
  );
}

function cloneModifiers(modifiers) {
  return structuredClone(modifiers || []);
}

/**
 * Inspector router for the v6 Point field. Preview profile is display-only;
 * every edit callback carries the independently selected edit scope.
 */
export function PointFieldInspector({
  document,
  selection,
  editScope = 'base',
  previewProfile = 'desktop',
  storyWU = 0,
  onSelect,
  onEdit,
  onMoveKey,
  onResetOverride,
  onMakeUnique,
  onDuplicateState,
  onDeleteState,
  onSplitSegment,
}) {
  const basePointField = document.tracks.pointField;
  if (selection?.type === 'point-field-key') {
    const pointKey = basePointField.keys.find((item) => item.id === selection.id);
    if (pointKey) return (
      <KeyInspector
        document={document}
        pointKey={pointKey}
        editScope={editScope}
        previewProfile={previewProfile}
        onEdit={onEdit}
        onMoveKey={onMoveKey}
        onMakeUnique={onMakeUnique}
        onResetOverride={onResetOverride}
        onDuplicateState={onDuplicateState}
      />
    );
  }
  if (selection?.type === 'point-field-segment') {
    const segment = basePointField.segments.find((item) => item.id === selection.id);
    if (segment) return (
      <SegmentInspector
        document={document}
        segment={segment}
        editScope={editScope}
        previewProfile={previewProfile}
        storyWU={storyWU}
        onEdit={onEdit}
        onResetOverride={onResetOverride}
        onSplitSegment={onSplitSegment}
      />
    );
  }
  if (selection?.type === 'point-field-state') {
    const state = basePointField.stateDefinitions.find((item) => item.id === selection.id);
    if (state) return (
      <StateInspector
        document={document}
        state={state}
        editScope={editScope}
        previewProfile={previewProfile}
        onEdit={onEdit}
        onResetOverride={onResetOverride}
        onDuplicateState={onDuplicateState}
        onDeleteState={onDeleteState}
      />
    );
  }
  return (
    <div className="about-track-editor-inspector__content">
      <InspectorHeader eyebrow="Point field" title="State library" id="tracks.pointField" />
      <EditScopeSummary editScope={editScope} previewProfile={previewProfile} />
      <p className="about-track-editor-parameter-note about-point-field-library-note">
        States define reusable forms. Keys place those forms in Story WU. Segments control how the same points move between them.
      </p>
      <StateLibrary
        document={document}
        editScope={editScope}
        selection={selection}
        onSelect={onSelect}
      />
    </div>
  );
}
