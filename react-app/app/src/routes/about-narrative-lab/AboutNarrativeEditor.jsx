import {
  useCallback,
  useEffect,
  useId,
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
  ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS,
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
  ABOUT_NARRATIVE_WORLD_POINT_SIZE_CONTROL,
} from './aboutNarrativeDefinitions.js';
import {
  deriveAboutNarrativeTrackLoopRange,
  getAboutNarrativeTrackObject,
  getAboutNarrativeTrackObjectRange,
} from './aboutNarrativeTrackEditing.js';
import {
  getAboutNarrativePointFieldItemRange,
  getAboutNarrativePointFieldStateParticipationStartWU,
} from './aboutNarrativePointFieldEditing.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
} from './aboutNarrativePointFieldSchema.js';
import {
  PointFieldInspector,
  PointFieldLane,
} from './PointFieldLane.jsx';
import {
  ABOUT_NARRATIVE_DEFAULT_CAMERA_EASING,
  parseAboutNarrativeCameraEasing,
} from './aboutNarrativeCameraEasing.js';
import {
  ABOUT_INTERACTIVE_STACK_CONTROLS,
  ABOUT_INTERACTIVE_STACK_DEFAULTS,
  ABOUT_INTERACTIVE_STACK_KIND,
  ABOUT_INTERACTIVE_STACK_SEED_CONTROL,
} from './aboutInteractiveStackContract.js';
import {
  getAboutNarrativeCameraRotationFromQuaternion,
  writeAboutNarrativeCameraLookAtQuaternion,
  writeAboutNarrativeCameraTargetFromRotation,
} from './aboutNarrativeCameraRig.js';
import {
  clearAboutNarrativeRecoveryDraft,
  compareAboutNarrativeDocuments,
  deleteAboutNarrativeCheckpoint,
  exportAboutNarrativeDocument,
  flushAboutNarrativeRecoveryDraft,
  loadAboutNarrativeSource,
  readAboutNarrativeCheckpointState,
  readAboutNarrativeLocalSave,
  readAboutNarrativeRecoveryDraft,
  saveAboutNarrativeSource,
  writeAboutNarrativeLocalSave,
  writeAboutNarrativeCheckpoint,
} from './aboutNarrativePersistence.js';
import {
  createEditorialItem,
  createEditorialModule,
  createEmphasisEntry,
  duplicateDirectorArrayItem,
  getDirectorFieldError,
  moveDirectorArrayItem,
  parseDirectorSource,
  removeDirectorArrayItem,
  updateDirectorArrayItem,
} from './aboutNarrativeDirectorText.js';
import {
  createAnnouncementDeduper,
  describeAboutDirectorDiagnostic,
} from './aboutNarrativeDirectorDiagnostics.js';
import {
  ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION,
  ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS,
  ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP,
  constrainAboutNarrativeDisciplinePosition,
  getAboutNarrativeDisciplineMinimumSeparation,
  getAboutNarrativeDisciplinePosition,
} from './aboutNarrativeDisciplinePositions.js';
import './about-narrative-editor.css';

const LEGACY_TRACKS = Object.freeze([
  { id: 'camera', label: 'Camera', type: 'camera-key', colour: 'camera' },
  { id: 'visibility', label: 'Visibility', type: 'visibility-key', colour: 'visibility' },
  { id: 'world', label: 'World', type: 'world', colour: 'world' },
  { id: 'text', label: 'Text', type: 'text-field', colour: 'text' },
  { id: 'interaction', label: 'Motion', type: 'interaction', colour: 'interaction' },
]);
const POINT_FIELD_TRACKS = Object.freeze([
  { id: 'camera', label: 'Camera', type: 'camera-key', colour: 'camera' },
  { id: 'visibility', label: 'Visibility', type: 'visibility-key', colour: 'visibility' },
  { id: 'point-field', label: 'Forms', type: 'point-field-key', colour: 'world' },
  { id: 'text', label: 'Text', type: 'text-field', colour: 'text' },
  { id: 'interaction', label: 'Motion', type: 'interaction', colour: 'interaction' },
]);
const TRACK_BY_ID = Object.freeze(Object.fromEntries(
  [...LEGACY_TRACKS, ...POINT_FIELD_TRACKS].map((track) => [track.id, track]),
));
const POINT_FIELD_SELECTION_TYPES = new Set([
  'point-field-key',
  'point-field-segment',
  'point-field-state',
]);
const MIN_TIMELINE_WIDTH = 920;
const BASE_PIXELS_PER_WU = 66;
const TEXT_CONNECTION_EPSILON_WU = 0.0001;
const GRID_RIPPLE_START_STEP_WU = 0.05;
const EDITOR_TYPING_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');
const EDITOR_OWNED_KEYBOARD_TARGET_SELECTOR = [
  'button',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="slider"]',
].join(', ');
const DISCIPLINE_POSITION_X_CONTROL = Object.freeze({
  min: ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x.min,
  max: ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x.max,
  step: ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP,
  unit: '× grid',
});
const DISCIPLINE_POSITION_Y_CONTROL = Object.freeze({
  min: ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y.min,
  max: ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y.max,
  step: ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP,
  unit: '× grid',
});
const EDITORIAL_MODULE_GAP_CONTROL = Object.freeze({
  id: 'moduleGapRem',
  min: 0.5,
  max: 6,
  step: 0.05,
  unit: 'rem',
});
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
      scope: owner.id === 'sequence' ? 'globals' : owner.id,
    }))
)));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(4));
}

function getSelectionTrackId(selection, pointFieldV6 = true) {
  if (selection?.type === 'track') return selection.id;
  if (selection?.type === 'camera-key') return 'camera';
  if (selection?.type === 'visibility-key') return 'visibility';
  if (selection?.type === 'world') return 'world';
  if (selection?.type === 'text-field') return 'text';
  if (selection?.type === 'interaction') return 'interaction';
  if (POINT_FIELD_SELECTION_TYPES.has(selection?.type)) return pointFieldV6 ? 'point-field' : 'world';
  return pointFieldV6 ? 'point-field' : 'world';
}

function getCameraOrbit(object) {
  const position = object.position || [0, 0, 1];
  const target = object.lookAtTarget || [0, 0, 0];
  const x = Number(position[0]) - Number(target[0]);
  const y = Number(position[1]) - Number(target[1]);
  const z = Number(position[2]) - Number(target[2]);
  const distance = Math.max(0.001, Math.hypot(x, y, z));
  return {
    azimuth: Math.atan2(x, z) * (180 / Math.PI),
    elevation: Math.asin(clamp(y / distance, -1, 1)) * (180 / Math.PI),
    distance,
  };
}

function writeCameraOrbit(target, patch) {
  const orbit = { ...getCameraOrbit(target), ...patch };
  const azimuth = orbit.azimuth * (Math.PI / 180);
  const elevation = clamp(orbit.elevation, -90, 90) * (Math.PI / 180);
  const distance = Math.max(0.25, orbit.distance);
  const focus = target.lookAtTarget || [0, 0, 0];
  const horizontal = Math.cos(elevation) * distance;
  target.position = [
    Number(focus[0]) + (Math.sin(azimuth) * horizontal),
    Number(focus[1]) + (Math.sin(elevation) * distance),
    Number(focus[2]) + (Math.cos(azimuth) * horizontal),
  ];
}

function targetMatchesClosest(target, selector) {
  return target instanceof Element && Boolean(target.closest(selector));
}

function isEditorTypingTarget(target) {
  return targetMatchesClosest(target, EDITOR_TYPING_TARGET_SELECTOR);
}

function isEditorOwnedKeyboardTarget(target) {
  return targetMatchesClosest(target, EDITOR_OWNED_KEYBOARD_TARGET_SELECTOR);
}

function isSlashKey(event) {
  return event.key === '/' || event.code === 'Slash';
}

function stopEditorShortcutPropagation(event) {
  event.stopPropagation();
}

function getGridRippleStartControl(document, clip) {
  const targetStartWU = Number(document.schemaVersion) === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION
    ? getAboutNarrativePointFieldStateParticipationStartWU(
      document.tracks.pointField,
      clip.targetStateId,
    )
    : Number(document.tracks.worlds.objects
      .find((world) => world.id === clip.targetWorldId)?.startWU ?? 0);
  const attackWU = Math.max(0, Number(clip.activationWU) - Number(clip.startWU));
  const earliestTargetWU = Number.isFinite(targetStartWU) ? targetStartWU : 0;
  const earliestWU = Math.ceil(earliestTargetWU / GRID_RIPPLE_START_STEP_WU) * GRID_RIPPLE_START_STEP_WU;
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
  if (trackId === 'world') return document.tracks.worlds?.objects || [];
  if (trackId === 'point-field') return [];
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
    if (object.block?.kind === 'stack') {
      return object.block.modules?.some((module) => module.kind === 'logo-grid')
        ? 'Editorial + logos'
        : 'Editorial block';
    }
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

function TextField({
  label,
  value = '',
  disabled = false,
  multiline = false,
  focusId,
  diagnosticPath,
  error = '',
  onCommit,
}) {
  const Element = multiline ? 'textarea' : 'input';
  const errorId = useId();
  return (
    <label className="about-track-editor-field is-wide">
      <span>{label}</span>
      <Element
        key={`${label}-${value}`}
        {...(multiline ? { rows: 4 } : { type: 'text' })}
        data-editor-focus-id={focusId}
        data-diagnostic-path={diagnosticPath}
        defaultValue={value}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        onBlur={(event) => {
          if (event.currentTarget.value !== value) onCommit(event.currentTarget.value);
        }}
      />
      {error ? <small id={errorId} className="about-director-inline-error">{error}</small> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  disabled = false,
  options,
  diagnosticPath,
  error,
  onCommit,
}) {
  const errorId = error && diagnosticPath
    ? `about-director-field-error-${diagnosticPath.replace(/[^a-z0-9]+/gi, '-')}`
    : undefined;
  return (
    <label className="about-track-editor-field">
      <span>{label}</span>
      <select
        value={value}
        disabled={disabled}
        data-diagnostic-path={diagnosticPath}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        onChange={(event) => onCommit(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? <small id={errorId} className="about-director-inline-error">{error}</small> : null}
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

function DisciplinePositionEditor({
  items,
  disabled = false,
  onBegin,
  onPreview,
  onFinish,
  onCancel,
  onCommit,
}) {
  const [profile, setProfile] = useState('desktop');
  const mapRef = useRef(null);
  const gestureRef = useRef(null);
  const xBounds = ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.x;
  const yBounds = ABOUT_NARRATIVE_DISCIPLINE_POSITION_BOUNDS.y;
  const minimumGap = getAboutNarrativeDisciplineMinimumSeparation(items, profile);
  const toPercent = (value, bounds) => (
    6 + (((Number(value) - Number(bounds.min)) / (Number(bounds.max) - Number(bounds.min))) * 88)
  );
  const pointerPosition = (event) => {
    const bounds = mapRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    const normalizedX = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0.06, 0.94);
    const normalizedY = clamp((event.clientY - bounds.top) / Math.max(1, bounds.height), 0.06, 0.94);
    return [
      normalizeControlValue(
        xBounds.min + (((normalizedX - 0.06) / 0.88)
          * (xBounds.max - xBounds.min)),
        DISCIPLINE_POSITION_X_CONTROL,
      ),
      normalizeControlValue(
        yBounds.min + (((normalizedY - 0.06) / 0.88)
          * (yBounds.max - yBounds.min)),
        DISCIPLINE_POSITION_Y_CONTROL,
      ),
    ];
  };
  const previewPointer = (event) => {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const position = pointerPosition(event);
    if (position) onPreview?.(gesture.group, profile, position);
  };
  const beginPointer = (event, group) => {
    if (disabled || onBegin?.(group, profile) === false) return;
    gestureRef.current = { group, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    previewPointer(event);
  };
  const finishPointer = () => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    onFinish?.();
  };
  const cancelPointer = () => {
    if (!gestureRef.current) return;
    gestureRef.current = null;
    onCancel?.();
  };
  const adjustWithKeyboard = (event, item) => {
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (!direction || disabled) return;
    event.preventDefault();
    const amount = ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP * (event.shiftKey ? 5 : 1);
    const current = getAboutNarrativeDisciplinePosition(item, profile);
    onCommit?.(item.group, profile, [
      current[0] + (direction[0] * amount),
      current[1] + (direction[1] * amount),
    ]);
  };

  return (
    <section className="about-track-editor-discipline-position-editor" aria-label="Discipline positions">
      <header>
        <div>
          <strong>Position map</strong>
          <small>Drag anchors or enter exact grid coordinates.</small>
        </div>
        <div className="about-track-editor-discipline-profile" aria-label="Position profile">
          {['desktop', 'mobile'].map((value) => (
            <button
              key={value}
              type="button"
              className={profile === value ? 'is-active' : ''}
              aria-pressed={profile === value}
              onClick={() => setProfile(value)}
            >
              {value === 'desktop' ? 'Desktop' : 'Mobile'}
            </button>
          ))}
        </div>
      </header>
      <div
        ref={mapRef}
        className="about-track-editor-discipline-map"
        aria-label={`${profile} Discipline anchor map`}
      >
        {(items || []).map((item) => {
          const position = getAboutNarrativeDisciplinePosition(item, profile);
          return (
            <button
              key={item.group}
              type="button"
              className="about-track-editor-discipline-map__anchor"
              style={{
                '--discipline-editor-x': `${toPercent(position[0], xBounds)}%`,
                '--discipline-editor-y': `${toPercent(position[1], yBounds)}%`,
                '--discipline-editor-color': `var(${ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS[item.group - 1]})`,
              }}
              disabled={disabled}
              aria-label={`${item.label} position, X ${position[0]}, Y ${position[1]}`}
              onPointerDown={(event) => beginPointer(event, item.group)}
              onPointerMove={(event) => {
                if (gestureRef.current?.pointerId === event.pointerId) previewPointer(event);
              }}
              onPointerUp={finishPointer}
              onPointerCancel={cancelPointer}
              onKeyDown={(event) => adjustWithKeyboard(event, item)}
            >
              {item.group}
            </button>
          );
        })}
      </div>
      <p className="about-track-editor-discipline-gap">
        Minimum gap <b>{minimumGap.toFixed(2)}</b> · protected at {ABOUT_NARRATIVE_DISCIPLINE_MIN_SEPARATION.toFixed(2)}
      </p>
      <div className="about-track-editor-discipline-coordinates">
        {(items || []).map((item) => {
          const position = getAboutNarrativeDisciplinePosition(item, profile);
          const commitAxis = (axis, value) => {
            const next = [...position];
            next[axis] = value;
            onCommit?.(item.group, profile, next);
          };
          return (
            <div className="about-track-editor-discipline-coordinate" key={item.group}>
              <span title={item.label}>
                <i
                  style={{ backgroundColor: `var(${ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS[item.group - 1]})` }}
                  aria-hidden="true"
                />
                {item.group}. {item.label}
              </span>
              <label>
                <span>X</span>
                <input
                  key={`${profile}-${item.group}-x-${position[0]}`}
                  type="number"
                  defaultValue={position[0]}
                  min={xBounds.min}
                  max={xBounds.max}
                  step={ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP}
                  disabled={disabled}
                  aria-label={`${item.label} ${profile} X`}
                  onBlur={(event) => {
                    const value = Number(event.currentTarget.value);
                    if (Number.isFinite(value) && value !== position[0]) commitAxis(0, value);
                    else event.currentTarget.value = String(position[0]);
                  }}
                />
              </label>
              <label>
                <span>Y</span>
                <input
                  key={`${profile}-${item.group}-y-${position[1]}`}
                  type="number"
                  defaultValue={position[1]}
                  min={yBounds.min}
                  max={yBounds.max}
                  step={ABOUT_NARRATIVE_DISCIPLINE_POSITION_STEP}
                  disabled={disabled}
                  aria-label={`${item.label} ${profile} Y`}
                  onBlur={(event) => {
                    const value = Number(event.currentTarget.value);
                    if (Number.isFinite(value) && value !== position[1]) commitAxis(1, value);
                    else event.currentTarget.value = String(position[1]);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
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
          This is the protected finale World. Its Shape and destructive timeline actions stay fixed; its placement, material, and motion controls remain editable.
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
        count={17}
      >
        <div className="about-track-editor-folder__grid">
          {[0, 1, 2].map((axis) => (
            <NumberField key={`position-${axis}`} label={`Position ${'XYZ'[axis]}`} value={object.transform.position[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World position', (target) => { target.transform.position[axis] = value; })} />
          ))}
          {[0, 1, 2].map((axis) => (
            <NumberField key={`rotation-${axis}`} label={`Rotation ${'XYZ'[axis]}`} value={object.transform.rotation[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World rotation', (target) => { target.transform.rotation[axis] = value; })} />
          ))}
          <NumberField label="Scale" value={object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World scale', (target) => { target.transform.scale = value; })} />
          <RangeParameterField
            label={ABOUT_NARRATIVE_WORLD_POINT_SIZE_CONTROL.label}
            ariaLabel={`World ${ABOUT_NARRATIVE_WORLD_POINT_SIZE_CONTROL.label}`}
            value={object.transform.pointSizeScale ?? 1}
            control={ABOUT_NARRATIVE_WORLD_POINT_SIZE_CONTROL}
            disabled={locked}
            {...bindRange('Edit World relative point size', (target, value) => { target.transform.pointSizeScale = value; })}
          />
          <NumberField label="Mobile scale" value={object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World mobile scale', (target) => { target.transform.mobileScale = value; })} />
          <NumberField label="Mobile X scale" value={object.transform.mobileXScale ?? object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World mobile X scale', (target) => { target.transform.mobileXScale = value; })} />
          <NumberField label="Mobile Y offset" value={object.transform.mobileYOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World mobile offset', (target) => { target.transform.mobileYOffset = value; })} />
          <NumberField label="Mobile Z offset" value={object.transform.mobileZOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World mobile offset', (target) => { target.transform.mobileZOffset = value; })} />
          <NumberField label="Landscape scale" value={object.transform.mobileLandscapeScale ?? object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World landscape scale', (target) => { target.transform.mobileLandscapeScale = value; })} />
          <NumberField label="Landscape X scale" value={object.transform.mobileLandscapeXScale ?? object.transform.mobileLandscapeScale ?? object.transform.mobileXScale ?? object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World landscape X scale', (target) => { target.transform.mobileLandscapeXScale = value; })} />
          <NumberField label="Landscape X offset" value={object.transform.mobileLandscapeXOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World landscape offset', (target) => { target.transform.mobileLandscapeXOffset = value; })} />
          <NumberField label="Landscape Y offset" value={object.transform.mobileLandscapeYOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World landscape offset', (target) => { target.transform.mobileLandscapeYOffset = value; })} />
          <NumberField label="Landscape Z offset" value={object.transform.mobileLandscapeZOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World landscape offset', (target) => { target.transform.mobileLandscapeZOffset = value; })} />
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
    scope === 'globals' ? globals[control.id] : globals[scope][control.id]
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
    if (item.scope === 'globals') draft.globals[item.control.id] = value;
    else draft.globals[item.scope][item.control.id] = value;
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
          Text windows define the narrative cadence and Story length. Drag any Text clip to move its complete animation, or restore equal breathing room between animations with the action below.
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

function AdvancedSourceEditor({
  label,
  value,
  disabled = false,
  focusId,
  diagnosticPath,
  externalError = '',
  onCommit,
}) {
  const serialized = useMemo(() => JSON.stringify(value, null, 2), [value]);
  const [parseError, setParseError] = useState('');
  const errorId = useId();
  const error = parseError || externalError;

  return (
    <details className="about-director-advanced-source">
      <summary>Advanced source · {label}</summary>
      <label className="about-track-editor-field is-wide">
        <span>Complete {label.toLowerCase()} JSON</span>
        <textarea
          rows={10}
          key={serialized}
          data-editor-focus-id={focusId}
          data-diagnostic-path={diagnosticPath}
          defaultValue={serialized}
          disabled={disabled}
          spellCheck={false}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={() => {
            if (parseError) setParseError('');
          }}
          onBlur={(event) => {
            const source = event.currentTarget.value;
            if (source === serialized) return;
            const parsed = parseDirectorSource(source);
            if (!parsed.valid) {
              setParseError(parsed.error);
              return;
            }
            setParseError('');
            onCommit(parsed.value);
          }}
        />
        {error ? <small id={errorId} className="about-director-inline-error">{error}</small> : null}
      </label>
      <p>Lossless escape hatch. Structured edits keep fields they do not own.</p>
    </details>
  );
}

function DirectorStructuredField({
  label,
  value = '',
  path,
  error = '',
  disabled = false,
  type = 'text',
  options = [],
  multiline = false,
  onCommit,
}) {
  const errorId = useId();
  const common = {
    'data-editor-focus-id': `diagnostic:${path}`,
    'data-diagnostic-path': path,
    disabled,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? errorId : undefined,
  };
  return (
    <label className="about-track-editor-field is-wide about-director-structured-field">
      <span>{label}</span>
      {options.length ? (
        <select {...common} value={value} onChange={(event) => onCommit(event.target.value)}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : multiline ? (
        <textarea
          {...common}
          rows={4}
          defaultValue={value}
          key={`${path}-${value}`}
          onBlur={(event) => {
            if (event.currentTarget.value !== value) onCommit(event.currentTarget.value);
          }}
        />
      ) : (
        <input
          {...common}
          type={type}
          defaultValue={value}
          key={`${path}-${value}`}
          onBlur={(event) => {
            const next = type === 'number' ? Number(event.currentTarget.value) : event.currentTarget.value;
            if (next !== value && !(type === 'number' && !Number.isFinite(next))) onCommit(next);
          }}
        />
      )}
      {error ? <small id={errorId} className="about-director-inline-error">{error}</small> : null}
    </label>
  );
}

function DirectorItemActions({ index, count, disabled, noun, onMove, onDuplicate, onRemove, removalDisabled = false }) {
  return (
    <div className="about-director-item-actions" aria-label={`${noun} actions`}>
      <button type="button" disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label={`Move ${noun} up`}>↑</button>
      <button type="button" disabled={disabled || index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${noun} down`}>↓</button>
      <button type="button" disabled={disabled} onClick={onDuplicate}>Duplicate</button>
      <button type="button" className="is-danger" disabled={disabled || removalDisabled} onClick={onRemove}>Remove</button>
    </div>
  );
}

function StructuredEmphasisEditor({ items = [], path, diagnostics, disabled, onChange }) {
  return (
    <section className="about-director-structured-section" aria-label="Emphasis entries">
      <header><strong>Emphasis</strong><span>{items.length}</span></header>
      {items.map((item, index) => {
        const itemPath = `${path}.${index}`;
        return (
          <article className="about-director-structured-item" key={`${item.text}-${index}`}>
            <DirectorStructuredField
              label="Highlighted phrase"
              value={item.text || ''}
              path={`${itemPath}.text`}
              error={getDirectorFieldError(diagnostics, `${itemPath}.text`)}
              disabled={disabled}
              onCommit={(value) => onChange(
                updateDirectorArrayItem(items, index, (entry) => ({ ...entry, text: value })),
                'Edit emphasis phrase',
              )}
            />
            <DirectorStructuredField
              label="Tone"
              value={item.tone || 'blue'}
              path={`${itemPath}.tone`}
              error={getDirectorFieldError(diagnostics, `${itemPath}.tone`)}
              disabled={disabled}
              options={['blue', 'green', 'orange'].map((tone) => ({ value: tone, label: tone }))}
              onCommit={(value) => onChange(
                updateDirectorArrayItem(items, index, (entry) => ({ ...entry, tone: value })),
                'Edit emphasis tone',
              )}
            />
            <DirectorItemActions
              index={index}
              count={items.length}
              disabled={disabled}
              noun="emphasis"
              onMove={(direction) => onChange(moveDirectorArrayItem(items, index, direction), 'Reorder emphasis')}
              onDuplicate={() => onChange(duplicateDirectorArrayItem(items, index, { idKey: null }), 'Duplicate emphasis')}
              onRemove={() => onChange(removeDirectorArrayItem(items, index), 'Remove emphasis')}
            />
          </article>
        );
      })}
      <button type="button" disabled={disabled} onClick={() => onChange([...items, createEmphasisEntry()], 'Add emphasis')}>Add emphasis</button>
    </section>
  );
}

function StructuredPlainItemsEditor({ items = [], path, diagnostics, disabled, onChange }) {
  return (
    <section className="about-director-structured-section" aria-label="List items">
      <header><strong>List items</strong><span>{items.length}</span></header>
      {items.map((item, index) => {
        const itemPath = `${path}.${index}`;
        return (
          <article className="about-director-structured-item is-compact" key={`${item}-${index}`}>
            <DirectorStructuredField
              label={`Item ${index + 1}`}
              value={item}
              path={itemPath}
              error={getDirectorFieldError(diagnostics, itemPath)}
              disabled={disabled}
              multiline
              onCommit={(value) => onChange(updateDirectorArrayItem(items, index, () => value), 'Edit list item')}
            />
            <DirectorItemActions
              index={index}
              count={items.length}
              disabled={disabled}
              noun="list item"
              removalDisabled={items.length === 1}
              onMove={(direction) => onChange(moveDirectorArrayItem(items, index, direction), 'Reorder list items')}
              onDuplicate={() => onChange(duplicateDirectorArrayItem(items, index, { idKey: null }), 'Duplicate list item')}
              onRemove={() => onChange(removeDirectorArrayItem(items, index), 'Remove list item')}
            />
          </article>
        );
      })}
      <button type="button" disabled={disabled} onClick={() => onChange([...items, 'New item'], 'Add list item')}>Add list item</button>
    </section>
  );
}

function StructuredModuleItemsEditor({ module, moduleIndex, path, diagnostics, disabled, onChange }) {
  const items = module.items || [];
  const interactive = module.kind === ABOUT_INTERACTIVE_STACK_KIND;
  const required = module.kind === 'logo-grid' || interactive;
  return (
    <section className="about-director-structured-section" aria-label={`${module.kind} items`}>
      <header><strong>{interactive ? 'Media cards' : module.kind === 'logo-grid' ? 'Logos' : 'Media'}</strong><span>{items.length}</span></header>
      {items.map((item, index) => {
        const itemPath = `${path}.items.${index}`;
        const update = (field, value) => onChange(
          updateDirectorArrayItem(items, index, (entry) => ({ ...entry, [field]: value })),
          `Edit ${module.kind} item`,
        );
        return (
          <article className="about-director-structured-item" key={item.id || index}>
            <header><code>{item.id || `item-${index + 1}`}</code></header>
            {module.kind === 'logo-grid' ? (
              <DirectorStructuredField label="Label" value={item.label || ''} path={`${itemPath}.label`} error={getDirectorFieldError(diagnostics, `${itemPath}.label`)} disabled={disabled} onCommit={(value) => update('label', value)} />
            ) : null}
            {interactive ? (
              <DirectorStructuredField
                label="Type"
                value={item.type || 'image'}
                path={`${itemPath}.type`}
                error={getDirectorFieldError(diagnostics, `${itemPath}.type`)}
                disabled={disabled}
                options={[{ value: 'image', label: 'Image' }, { value: 'video', label: 'Video' }]}
                onCommit={(value) => onChange(
                  updateDirectorArrayItem(items, index, (entry) => {
                    const next = { ...entry, type: value };
                    if (value === 'video') next.poster ||= entry.src;
                    else delete next.poster;
                    return next;
                  }),
                  'Edit interactive media type',
                )}
              />
            ) : null}
            <DirectorStructuredField label="Source" value={item.src || ''} path={`${itemPath}.src`} error={getDirectorFieldError(diagnostics, `${itemPath}.src`)} disabled={disabled} onCommit={(value) => update('src', value)} />
            <DirectorStructuredField label="Alt text" value={item.alt || ''} path={`${itemPath}.alt`} error={getDirectorFieldError(diagnostics, `${itemPath}.alt`)} disabled={disabled} multiline onCommit={(value) => update('alt', value)} />
            {interactive && item.type === 'video' ? (
              <DirectorStructuredField label="Poster" value={item.poster || ''} path={`${itemPath}.poster`} error={getDirectorFieldError(diagnostics, `${itemPath}.poster`)} disabled={disabled} onCommit={(value) => update('poster', value)} />
            ) : null}
            {!interactive ? (
              <>
                {module.kind !== 'logo-grid' ? (
                  <DirectorStructuredField label="Label" value={item.label || ''} path={`${itemPath}.label`} error={getDirectorFieldError(diagnostics, `${itemPath}.label`)} disabled={disabled} onCommit={(value) => update('label', value)} />
                ) : null}
                <DirectorStructuredField label="Caption" value={item.caption || ''} path={`${itemPath}.caption`} error={getDirectorFieldError(diagnostics, `${itemPath}.caption`)} disabled={disabled} multiline onCommit={(value) => update('caption', value)} />
                <div className="about-director-structured-grid">
                  <DirectorStructuredField label="Scale" type="number" value={item.scale ?? 1} path={`${itemPath}.scale`} error={getDirectorFieldError(diagnostics, `${itemPath}.scale`)} disabled={disabled} onCommit={(value) => update('scale', value)} />
                  <DirectorStructuredField label="Offset X (%)" type="number" value={item.offsetX ?? 0} path={`${itemPath}.offsetX`} error={getDirectorFieldError(diagnostics, `${itemPath}.offsetX`)} disabled={disabled} onCommit={(value) => update('offsetX', value)} />
                  <DirectorStructuredField label="Offset Y (%)" type="number" value={item.offsetY ?? 0} path={`${itemPath}.offsetY`} error={getDirectorFieldError(diagnostics, `${itemPath}.offsetY`)} disabled={disabled} onCommit={(value) => update('offsetY', value)} />
                </div>
              </>
            ) : null}
            {interactive ? (
              <div className="about-director-structured-grid">
                {['width', 'height', 'aspectRatio'].map((field) => (
                  <DirectorStructuredField key={field} label={field} type="number" value={item[field]} path={`${itemPath}.${field}`} error={getDirectorFieldError(diagnostics, `${itemPath}.${field}`)} disabled={disabled} onCommit={(value) => update(field, value)} />
                ))}
                <DirectorStructuredField label="Fit" value={item.fit || 'cover'} path={`${itemPath}.fit`} error={getDirectorFieldError(diagnostics, `${itemPath}.fit`)} disabled={disabled} options={[{ value: 'cover', label: 'Cover' }, { value: 'contain', label: 'Contain' }]} onCommit={(value) => update('fit', value)} />
              </div>
            ) : null}
            <DirectorItemActions
              index={index}
              count={items.length}
              disabled={disabled}
              noun={`${module.kind} item`}
              removalDisabled={required && items.length === 1}
              onMove={(direction) => onChange(moveDirectorArrayItem(items, index, direction), `Reorder ${module.kind} items`)}
              onDuplicate={() => onChange(duplicateDirectorArrayItem(items, index, { fallback: 'item' }), `Duplicate ${module.kind} item`)}
              onRemove={() => onChange(removeDirectorArrayItem(items, index), `Remove ${module.kind} item`)}
            />
          </article>
        );
      })}
      <button type="button" disabled={disabled} onClick={() => onChange([...items, createEditorialItem(module, items)], `Add ${module.kind} item`)}>Add {interactive ? 'media card' : module.kind === 'logo-grid' ? 'logo' : 'media'}</button>
      <span className="about-director-structured-index">Module {moduleIndex + 1}</span>
    </section>
  );
}

function StructuredModulesEditor({ modules = [], path, diagnostics, disabled, onChange }) {
  const [newKind, setNewKind] = useState('prose');
  return (
    <section className="about-director-modules" aria-label="Editorial modules">
      <header><div><strong>Editorial modules</strong><span>Structured, ordered, lossless</span></div><b>{modules.length}</b></header>
      {modules.map((module, index) => {
        const modulePath = `${path}.${index}`;
        const updateModule = (updater, label) => onChange(
          updateDirectorArrayItem(modules, index, updater),
          label,
        );
        return (
          <article className="about-director-module" key={module.id || index}>
            <header><div><strong>{module.kind}</strong><code>{module.id}</code></div></header>
            {module.kind === 'prose' ? (
              <DirectorStructuredField label="Copy" value={module.text || ''} path={`${modulePath}.text`} error={getDirectorFieldError(diagnostics, `${modulePath}.text`)} disabled={disabled} multiline onCommit={(value) => updateModule((entry) => ({ ...entry, text: value }), 'Edit prose module')} />
            ) : (
              <DirectorStructuredField label="Label" value={module.label || ''} path={`${modulePath}.label`} error={getDirectorFieldError(diagnostics, `${modulePath}.label`)} disabled={disabled} onCommit={(value) => updateModule((entry) => ({ ...entry, label: value }), `Edit ${module.kind} label`)} />
            )}
            {['logo-grid', 'media-deck', ABOUT_INTERACTIVE_STACK_KIND].includes(module.kind) ? (
              <StructuredModuleItemsEditor
                module={module}
                moduleIndex={index}
                path={modulePath}
                diagnostics={diagnostics}
                disabled={disabled}
                onChange={(items, label) => updateModule((entry) => ({ ...entry, items }), label)}
              />
            ) : null}
            {module.kind === 'prose' ? (
              <StructuredEmphasisEditor
                items={module.emphasis || []}
                path={`${modulePath}.emphasis`}
                diagnostics={diagnostics}
                disabled={disabled}
                onChange={(emphasis, label) => updateModule((entry) => ({ ...entry, emphasis }), label)}
              />
            ) : null}
            <DirectorItemActions
              index={index}
              count={modules.length}
              disabled={disabled}
              noun="module"
              removalDisabled={modules.length === 1}
              onMove={(direction) => onChange(moveDirectorArrayItem(modules, index, direction), 'Reorder editorial modules')}
              onDuplicate={() => onChange(duplicateDirectorArrayItem(modules, index, { fallback: 'module' }), 'Duplicate editorial module')}
              onRemove={() => onChange(removeDirectorArrayItem(modules, index), 'Remove editorial module')}
            />
          </article>
        );
      })}
      <div className="about-director-add-row">
        <select aria-label="New module type" value={newKind} disabled={disabled} onChange={(event) => setNewKind(event.target.value)}>
          <option value="prose">Prose</option>
          <option value="logo-grid">Logo grid</option>
          <option value="media-deck">Media deck</option>
          <option value={ABOUT_INTERACTIVE_STACK_KIND}>Interactive stack</option>
        </select>
        <button type="button" disabled={disabled} onClick={() => onChange([...modules, createEditorialModule(newKind, modules)], 'Add editorial module')}>Add module</button>
      </div>
    </section>
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

  const selectObject = () => {
    store.setSelection({ type: track.type, id: object.id });
    store.setTransport({ owner: 'timeline', playing: false, storyWU: getObjectStart(object, track.type) });
  };

  const beginDrag = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    selectObject();
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
        onClick={selectObject}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            selectObject();
            return;
          }
          if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
          event.preventDefault();
          event.stopPropagation();
          selectObject();
          if (locked) return;
          const direction = event.key === 'ArrowLeft' ? -1 : 1;
          store.moveSelection(direction * (event.shiftKey ? 0.1 : 0.01));
        }}
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
  editScope,
  zoom,
  setZoom,
  dockMode,
  setDockMode,
  textMenu,
  setTextMenu,
  interactionMenu,
  setInteractionMenu,
  onOpenTextEditor,
}) {
  const pointFieldV6 = Number(snapshot.document.schemaVersion)
    === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  const tracks = pointFieldV6 ? POINT_FIELD_TRACKS : LEGACY_TRACKS;
  const selectedTrackId = getSelectionTrackId(snapshot.selection, pointFieldV6);
  const timelineSelectionKey = `${snapshot.selection.type || 'none'}:${snapshot.selection.id || ''}`;
  const [trackFocus, setTrackFocus] = useState({
    id: selectedTrackId,
    selectionKey: timelineSelectionKey,
  });
  const activeTrackId = trackFocus.selectionKey === timelineSelectionKey
    ? trackFocus.id
    : selectedTrackId;
  const activeTrack = tracks.find((track) => track.id === activeTrackId) || tracks[0];
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
  const worlds = snapshot.document.tracks.worlds?.objects || [];
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

  const selectTrack = (trackId) => {
    const selectionKey = `track:${trackId}`;
    store.setSelection({ type: 'track', id: trackId });
    setTrackFocus({ id: trackId, selectionKey });
    setTextMenu(false);
    setInteractionMenu(false);
  };

  const fitTimeline = () => {
    const available = Math.max(1, Number(scrollRef.current?.clientWidth || 1) - 24);
    setZoom(clamp(available / Math.max(1, durationWU * BASE_PIXELS_PER_WU), 0.55, 2.5));
  };

  const cycleDockMode = () => {
    const next = dockMode === 'minimized' ? 'compact' : dockMode === 'compact' ? 'expanded' : 'minimized';
    setDockMode(next);
  };

  const movePointFieldKey = ({ phase, keyId, atWU, scope }) => {
    const selection = { type: 'point-field-key', id: keyId };
    if (phase === 'begin') {
      store.pointField.beginMoveKey({ keyId, scope });
    } else if (phase === 'preview') {
      store.pointField.updateMoveKey(atWU);
    } else if (phase === 'cancel') {
      store.pointField.cancelGesture();
    } else if (store.getSnapshot().gestureState) {
      store.pointField.commitGesture({ selectionAfter: selection, requireValid: true });
    } else {
      store.pointField.moveKey({ keyId, atWU, scope });
    }
  };

  const movePointFieldSegment = ({ phase, segmentId, deltaWU, scope }) => {
    const selection = { type: 'point-field-segment', id: segmentId };
    if (phase === 'begin') {
      store.pointField.beginMoveSegment({ segmentId, scope });
    } else if (phase === 'preview') {
      store.pointField.updateMoveSegment(deltaWU);
    } else if (phase === 'cancel') {
      store.pointField.cancelGesture();
    } else if (store.getSnapshot().gestureState) {
      store.pointField.commitGesture({ selectionAfter: selection, requireValid: true });
    } else {
      store.pointField.moveSegment({ segmentId, deltaWU, scope });
    }
  };

  return (
    <section
      className="about-track-editor-timeline"
      aria-label="About narrative global timeline"
      data-director-panel="timeline"
      data-director-dock-state={dockMode}
    >
      <header className="about-track-editor-timeline__toolbar">
        <div className="about-director-track-tabs" role="tablist" aria-label="Timeline track">
          {tracks.map((track) => (
            <button
              type="button"
              role="tab"
              key={track.id}
              className={`is-${track.colour}${activeTrack.id === track.id ? ' is-active' : ''}`}
              aria-selected={activeTrack.id === track.id}
              onClick={() => selectTrack(track.id)}
            >{track.label}</button>
          ))}
        </div>
        <div className="about-director-timeline-tools">
          {activeTrack.id !== 'point-field' ? (
            <div className="about-director-add-menu">
              <button
                type="button"
                className="about-director-add-trigger"
                aria-label={`Add ${activeTrack.label} object at playhead`}
                aria-expanded={activeTrack.id === 'text'
                  ? textMenu
                  : activeTrack.id === 'interaction' ? interactionMenu : undefined}
                aria-controls={activeTrack.id === 'text'
                  ? 'about-director-add-text'
                  : activeTrack.id === 'interaction' ? 'about-director-add-motion' : undefined}
                onClick={() => {
                  if (activeTrack.id === 'text') {
                    setInteractionMenu(false);
                    setTextMenu((open) => !open);
                  } else if (activeTrack.id === 'interaction') {
                    setTextMenu(false);
                    setInteractionMenu((open) => !open);
                  } else createAtPlayhead(activeTrack.id);
                }}
              >+ Add</button>
              {activeTrack.id === 'text' && textMenu ? (
                <div id="about-director-add-text" className="about-track-editor-create-menu" aria-label="Create Text field">
                  <button type="button" onClick={() => createAtPlayhead('text', 'title')}>Title</button>
                  <button type="button" onClick={() => createAtPlayhead('text', 'scroll-block')}>Scroll block</button>
                  <button type="button" onClick={() => createAtPlayhead('text', 'stub')}>Third type <span>Stub · Draft</span></button>
                </div>
              ) : null}
              {activeTrack.id === 'interaction' && interactionMenu ? (
                <div id="about-director-add-motion" className="about-track-editor-create-menu" aria-label="Create Motion clip">
                  <button type="button" onClick={() => createAtPlayhead('interaction', null, 'grid-ripple')}>Wave generator</button>
                  <button type="button" onClick={() => createAtPlayhead('interaction', null, 'horizontal-spin')}>Horizontal spin</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button type="button" onClick={fitTimeline}>Fit</button>
          <details className="about-director-zoom-menu">
            <summary aria-label="Timeline zoom">{Math.round(zoom * 100)}%</summary>
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
          </details>
          <button type="button" aria-label={DIRECTOR_DOCK_MODES.find((mode) => mode.id === dockMode)?.label} onClick={cycleDockMode}>
            {dockMode[0].toUpperCase() + dockMode.slice(1)}
          </button>
        </div>
      </header>
      <div className="about-track-editor-timeline__body">
        <div className="about-track-editor-headers" aria-hidden="false">
          <div className="about-track-editor-ruler-corner">Time</div>
          {[activeTrack].map((track) => (
            <div
              className={`about-track-editor-row-head is-${track.colour}`}
              key={track.id}
            >
              <span className="about-track-editor-row-label">{track.label}</span>
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
            {!pointFieldV6 && activeTrack.id === 'world' ? worlds.map((world) => (
              <i
                className="about-track-editor-world-guide"
                key={world.id}
                style={{ left: world.startWU * pixelsPerWU }}
                aria-hidden="true"
              />
            )) : null}
            {[activeTrack].map((track) => (
              <div className={`about-track-editor-lane is-${track.colour}`} key={track.id} data-track-lane={track.id}>
                {track.id === 'point-field' ? (
                  <PointFieldLane
                    document={snapshot.document}
                    selection={snapshot.selection}
                    pixelsPerWU={pixelsPerWU}
                    editScope={editScope}
                    previewProfile={snapshot.previewState.layoutProfile}
                    onSelect={(selection) => store.pointField.select(selection)}
                    onMoveKey={movePointFieldKey}
                    onMoveSegment={movePointFieldSegment}
                  />
                ) : getTrackItems(snapshot.document, track.id).map((object) => {
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

function ObjectInspector({ snapshot, store, editScope }) {
  const selection = snapshot.selection;
  const pointFieldV6 = Number(snapshot.document.schemaVersion)
    === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  if (pointFieldV6 && (
    POINT_FIELD_SELECTION_TYPES.has(selection.type)
    || (selection.type === 'track' && selection.id === 'point-field')
  )) {
    const moveKey = ({ phase, keyId, atWU, scope }) => {
      const selectionAfter = { type: 'point-field-key', id: keyId };
      if (phase === 'begin') store.pointField.beginMoveKey({ keyId, scope });
      else if (phase === 'preview') store.pointField.updateMoveKey(atWU);
      else if (phase === 'cancel') store.pointField.cancelGesture();
      else if (store.getSnapshot().gestureState) {
        store.pointField.commitGesture({ selectionAfter, requireValid: true });
      } else store.pointField.moveKey({ keyId, atWU, scope });
    };
    const editPointField = ({ phase, scope, type, id, patch, label }) => {
      const selectionAfter = { type, id };
      if (phase === 'begin') {
        store.pointField.beginPatch({ type, id, scope, label });
      } else if (phase === 'preview') {
        store.pointField.updatePatch(patch);
      } else if (phase === 'cancel') {
        store.pointField.cancelGesture();
      } else if (store.getSnapshot().gestureState) {
        store.pointField.updatePatch(patch);
        store.pointField.commitGesture({ selectionAfter, requireValid: true });
      } else {
        const method = type === 'point-field-key'
          ? 'patchKey'
          : type === 'point-field-segment' ? 'patchSegment' : 'patchState';
        store.pointField[method]({ id, scope, patch });
      }
    };
    return (
      <PointFieldInspector
        document={snapshot.document}
        selection={selection}
        editScope={editScope}
        previewProfile={snapshot.previewState.layoutProfile}
        storyWU={snapshot.transport.storyWU}
        onSelect={(nextSelection) => store.pointField.select(nextSelection)}
        onEdit={editPointField}
        onMoveKey={moveKey}
        onResetOverride={(options) => store.pointField.resetOverride(options)}
        onMakeUnique={(options) => store.pointField.makeKeyStateUnique(options)}
        onDuplicateState={(options) => store.pointField.duplicateState(options)}
        onDeleteState={(options) => store.pointField.deleteState(options)}
        onSplitSegment={(options) => store.pointField.splitSegment(options)}
      />
    );
  }
  const object = getAboutNarrativeTrackObject(snapshot.document, selection);
  const editorDiagnostics = [
    ...(snapshot.diagnostics || []),
    ...(snapshot.rejectedEdit?.diagnostics || []),
  ];
  const textFieldIndex = selection.type === 'text-field'
    ? snapshot.document.tracks.text.fields.findIndex((field) => field.id === selection.id)
    : -1;
  const textBlockPath = textFieldIndex >= 0
    ? `tracks.text.fields.${textFieldIndex}.block`
    : '';
  const textFieldPath = textFieldIndex >= 0
    ? `tracks.text.fields.${textFieldIndex}`
    : '';
  const interactionIndex = selection.type === 'interaction'
    ? snapshot.document.tracks.interactions.clips.findIndex((clip) => clip.id === selection.id)
    : -1;
  const interactionPath = interactionIndex >= 0
    ? `tracks.interactions.clips.${interactionIndex}`
    : '';
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
        <p>{pointFieldV6
          ? 'Drag Text and Motion edges to set their windows. Point field keys place reusable states; transition bands shape how the same dots move.'
          : 'Drag Text and Motion edges to set their windows. World ends ripple every later World without gaps; Camera and Visibility keys remain points.'}</p>
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
  const number = (path, value, disabled = locked, label = path) => NumberField({
    label,
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
  const cameraAimEnabled = selection.type === 'camera-key'
    && (object.aimEnabled ?? Array.isArray(object.lookAtTarget));
  const cameraOrbit = selection.type === 'camera-key' ? getCameraOrbit(object) : null;
  const inspectorTypeLabel = {
    'camera-key': 'camera shot',
    'visibility-key': 'visibility change',
    'text-field': 'text',
    interaction: 'motion',
    world: 'form',
  }[selection.type] || selection.type;
  const interactiveStackModule = object.kind === 'scroll-block'
    ? object.block?.modules?.find((module) => module.kind === ABOUT_INTERACTIVE_STACK_KIND)
    : null;
  const mutateInteractiveStackParameter = (target, id, value) => {
    const module = target.block?.modules?.find((entry) => entry.id === interactiveStackModule?.id);
    if (!module) return;
    module.parameters = { ...ABOUT_INTERACTIVE_STACK_DEFAULTS, ...module.parameters };
    module.parameters[id] = value;
  };
  const mutateDisciplinePosition = (target, group, profile, requested) => {
    const items = target.parameters?.items || [];
    const targetItem = items.find((candidate) => Number(candidate.group) === Number(group));
    if (!targetItem) return;
    const position = constrainAboutNarrativeDisciplinePosition(items, group, profile, requested);
    const key = profile === 'mobile' ? 'mobilePosition' : 'position';
    targetItem[key] = position;
  };
  return (
    <div className="about-track-editor-inspector__content">
      <header>
        <span>{inspectorTypeLabel}</span>
        <h2>{getObjectLabel(object, selection.type)}</h2>
        <code>{object.id}</code>
        {boundaryCamera ? <b>Timing fixed · Pose editable</b> : null}
        {locked ? <b>{selection.type === 'visibility-key' ? 'Timing protected' : 'Protected'}</b> : null}
      </header>

      {selection.type === 'camera-key' ? (
        <div className="about-track-editor-fields">
          {number('atWU', object.atWU, boundaryCamera, 'Time')}
          <p className="about-track-editor-parameter-note is-wide">This shot defines the camera at this exact time. Travel easing shapes the move to the next shot.</p>
          <InspectorFolder group={{ id: 'camera-essentials', label: 'Essentials' }} count={cameraAimEnabled ? 5 : 7} defaultOpen>
            <label className="about-track-editor-check">
              <input
                type="checkbox"
                checked={cameraAimEnabled}
                onChange={(event) => commit('Toggle Camera focus anchor', (target) => {
                  if (event.target.checked) {
                    if (!Array.isArray(target.lookAtTarget)) {
                      target.lookAtTarget = writeAboutNarrativeCameraTargetFromRotation(
                        [0, 0, 0],
                        target.position,
                        target.rotation,
                        1,
                      );
                      target.lookAtRoll = 0;
                    }
                    target.aimEnabled = true;
                  } else {
                    if (Array.isArray(target.lookAtTarget)) {
                      target.rotation = getAboutNarrativeCameraRotationFromQuaternion(
                        writeAboutNarrativeCameraLookAtQuaternion(
                          [0, 0, 0, 1],
                          target.position,
                          target.lookAtTarget,
                          target.lookAtRoll,
                        ),
                      );
                    }
                    target.aimEnabled = false;
                  }
                })}
              />
              Focus on 3D anchor
            </label>
            {cameraAimEnabled ? (
              <div className="about-track-editor-camera-rig">
                <section className="about-track-editor-camera-rig__group">
                  <span>Orbit</span>
                  <RangeParameterField
                    label="Angle"
                    ariaLabel="Camera orbit angle"
                    value={cameraOrbit.azimuth}
                    control={{ id: 'orbitAzimuth', min: -180, max: 180, step: 0.1, unit: '°' }}
                    {...bindObjectRange('Orbit Camera horizontally', (target, value) => writeCameraOrbit(target, { azimuth: value }))}
                  />
                  <RangeParameterField
                    label="Elevation"
                    ariaLabel="Camera orbit elevation"
                    value={cameraOrbit.elevation}
                    control={{ id: 'orbitElevation', min: -90, max: 90, step: 0.1, unit: '°' }}
                    {...bindObjectRange('Orbit Camera vertically', (target, value) => writeCameraOrbit(target, { elevation: value }))}
                  />
                  <RangeParameterField
                    label="Distance"
                    ariaLabel="Camera orbit distance"
                    value={cameraOrbit.distance}
                    control={{ id: 'orbitDistance', min: 0.25, max: 80, step: 0.01, unit: 'WU' }}
                    {...bindObjectRange('Change Camera orbit distance', (target, value) => writeCameraOrbit(target, { distance: value }))}
                  />
                </section>
                <section className="about-track-editor-camera-rig__group">
                  <span>Finish</span>
                  {ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS
                    .filter((control) => control.id === 'lookAtRoll' || control.group === 'lens')
                    .map((control) => (
                      <RangeParameterField
                        key={control.id}
                        label={control.label}
                        ariaLabel={`Camera ${control.label}`}
                        value={object[control.id]}
                        control={control}
                        {...bindObjectRange(`Edit Camera ${control.label}`, (target, value) => { target[control.id] = value; })}
                      />
                    ))}
                </section>
              </div>
            ) : (
              <div className="about-track-editor-camera-rig">
                {['position', 'rotation', 'lens'].map((groupId) => (
                  <section className="about-track-editor-camera-rig__group" key={groupId}>
                    <span>{groupId[0].toUpperCase() + groupId.slice(1)}</span>
                    {ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS
                      .filter((control) => control.group === groupId)
                      .map((control) => {
                        const [field, axisText] = control.id.split('.');
                        const axis = axisText == null ? null : Number(axisText);
                        const value = axis == null ? object[field] : object[field]?.[axis] ?? 0;
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
            )}
          </InspectorFolder>
          <InspectorFolder group={{ id: 'camera-advanced', label: 'Advanced coordinates' }} count={cameraAimEnabled ? 6 : 3}>
            <div className="about-track-editor-camera-rig">
              {(cameraAimEnabled ? ['position', 'target'] : ['target']).map((groupId) => (
                <section className="about-track-editor-camera-rig__group" key={groupId}>
                  <span>{groupId === 'target' ? 'Focus anchor' : 'Position'}</span>
                  {ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS
                    .filter((control) => control.group === groupId)
                    .filter((control) => control.id !== 'lookAtRoll')
                    .map((control) => {
                      const [field, axisText] = control.id.split('.');
                      const axis = axisText == null ? null : Number(axisText);
                      const value = axis == null ? object[field] : object[field]?.[axis] ?? 0;
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
              <TextField label="Title" value={object.text} disabled={locked} multiline focusId="text-copy" diagnosticPath={`${textFieldPath}.text`} error={getDirectorFieldError(editorDiagnostics, `${textFieldPath}.text`)} onCommit={(value) => commit('Edit Title', (target) => { target.text = value; })} />
              {object.preset === 'opener-v1' ? (
                <TextField
                  label="Description"
                  value={object.description || ''}
                  disabled={locked}
                  multiline
                  diagnosticPath={`${textFieldPath}.description`}
                  error={getDirectorFieldError(editorDiagnostics, `${textFieldPath}.description`)}
                  onCommit={(value) => commit('Edit Title description', (target) => {
                    if (value.trim()) target.description = value;
                    else delete target.description;
                  })}
                />
              ) : null}
              <SelectField label="Movement" value={object.movement} disabled={locked} options={[{ value: 'spatial', label: 'Spatial' }, { value: 'vertical', label: 'Vertical' }]} onCommit={(value) => commit('Edit Title movement', (target) => { target.movement = value; })} />
              <SelectField label="Title style" value={object.titleStyle || (object.preset === 'opener-v1' || object.preset === 'finale-v1' ? 'display' : 'standard')} disabled={locked} options={ABOUT_NARRATIVE_TITLE_STYLES.map((value) => ({ value, label: value === 'display' ? 'Display · Instrument' : 'Standard · Geist' }))} onCommit={(value) => commit('Edit Title style', (target) => { target.titleStyle = value; })} />
              <TextField label="Motion preset" value={object.preset} disabled={locked} diagnosticPath={`${textFieldPath}.preset`} error={getDirectorFieldError(editorDiagnostics, `${textFieldPath}.preset`)} onCommit={(value) => commit('Edit Title preset', (target) => { target.preset = value; })} />
            </>
          ) : null}
          {object.kind === 'scroll-block' ? (
            <>
              {object.block?.kind !== 'stack' ? <TextField label="Copy" value={object.block?.text || ''} disabled={locked || !('text' in object.block)} multiline focusId={'text' in object.block ? 'text-copy' : undefined} diagnosticPath={`${textBlockPath}.text`} error={getDirectorFieldError(editorDiagnostics, `${textBlockPath}.text`)} onCommit={(value) => commit('Edit Scroll block', (target) => { target.block.text = value; })} /> : null}
              <SelectField
                label="Block kind"
                value={object.block?.kind || 'prose'}
                disabled={locked}
                options={ABOUT_NARRATIVE_BLOCK_KINDS.map((value) => ({ value, label: value }))}
                onCommit={(value) => commit('Edit block kind', (target) => {
                  const itemKind = ['clients', 'disciplines', 'list'].includes(value);
                  if (value === 'stack' && (!Array.isArray(target.block.modules) || target.block.modules.length === 0)) {
                    target.block.modules = [{
                      id: `${target.block.id}-copy`,
                      kind: 'prose',
                      text: target.block.text || 'New editorial paragraph.',
                    }];
                  }
                  if (itemKind && (!Array.isArray(target.block.items) || target.block.items.length === 0)) {
                    target.block.items = [target.block.text || target.block.label || 'Untitled item'];
                  }
                  if (!itemKind && value !== 'stack' && (typeof target.block.text !== 'string' || !target.block.text.trim())) {
                    target.block.text = Array.isArray(target.block.items) && target.block.items.length
                      ? target.block.items.join(', ')
                      : target.block.label || 'Untitled copy';
                  }
                  target.block.kind = value;
                })}
              />
              <TextField label="Block label" value={object.block?.label || ''} disabled={locked} diagnosticPath={`${textBlockPath}.label`} error={getDirectorFieldError(editorDiagnostics, `${textBlockPath}.label`)} onCommit={(value) => commit('Edit block label', (target) => { target.block.label = value; })} />
              {object.block?.kind === 'stack' ? (
                <>
                  <RangeParameterField
                    label="Module spacing"
                    ariaLabel="Editorial module spacing"
                    value={object.block?.moduleGapRem ?? 1.75}
                    control={EDITORIAL_MODULE_GAP_CONTROL}
                    disabled={locked}
                    {...bindObjectRange('Edit Editorial module spacing', (target, value) => {
                      target.block.moduleGapRem = value;
                    })}
                  />
                  {interactiveStackModule ? (
                    <InspectorFolder group={{ id: 'interactive-stack', label: 'Interactive stack' }} count={9} defaultOpen>
                      <p className="about-track-editor-parameter-note is-wide">
                        These values live in this module and update the production-safe preview immediately.
                      </p>
                      {ABOUT_INTERACTIVE_STACK_CONTROLS.map((control) => (
                        <RangeParameterField
                          key={control.id}
                          label={control.label}
                          ariaLabel={`Interactive stack ${control.label}`}
                          value={interactiveStackModule.parameters?.[control.id] ?? ABOUT_INTERACTIVE_STACK_DEFAULTS[control.id]}
                          control={control}
                          disabled={locked}
                          {...bindObjectRange(`Edit Interactive stack ${control.label}`, (target, value) => {
                            mutateInteractiveStackParameter(target, control.id, value);
                          })}
                        />
                      ))}
                      <NumberField
                        label="Seed"
                        value={interactiveStackModule.parameters?.seed ?? ABOUT_INTERACTIVE_STACK_DEFAULTS.seed}
                        disabled={locked}
                        min={ABOUT_INTERACTIVE_STACK_SEED_CONTROL.min}
                        max={ABOUT_INTERACTIVE_STACK_SEED_CONTROL.max}
                        step={1}
                        onCommit={(value) => commit('Edit Interactive stack seed', (target) => {
                          const seed = Math.round(Math.min(
                            ABOUT_INTERACTIVE_STACK_SEED_CONTROL.max,
                            Math.max(ABOUT_INTERACTIVE_STACK_SEED_CONTROL.min, value),
                          ));
                          mutateInteractiveStackParameter(target, 'seed', seed);
                        })}
                      />
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => commit('Reseed Interactive stack', (target) => {
                          mutateInteractiveStackParameter(
                            target,
                            'seed',
                            Date.now() % (ABOUT_INTERACTIVE_STACK_SEED_CONTROL.max + 1),
                          );
                        })}
                      >
                        Reseed order
                      </button>
                    </InspectorFolder>
                  ) : null}
                  <StructuredModulesEditor
                    modules={object.block?.modules || []}
                    path={`${textBlockPath}.modules`}
                    diagnostics={editorDiagnostics}
                    disabled={locked}
                    onChange={(modules, label) => commit(label, (target) => { target.block.modules = modules; })}
                  />
                </>
              ) : (
                ['clients', 'disciplines', 'list'].includes(object.block?.kind) ? (
                  <StructuredPlainItemsEditor
                    items={object.block?.items || []}
                    path={`${textBlockPath}.items`}
                    diagnostics={editorDiagnostics}
                    disabled={locked}
                    onChange={(items, label) => commit(label, (target) => { target.block.items = items; })}
                  />
                ) : null
              )}
              <StructuredEmphasisEditor
                items={object.block?.emphasis || []}
                path={`${textBlockPath}.emphasis`}
                diagnostics={editorDiagnostics}
                disabled={locked}
                onChange={(emphasis, label) => commit(label, (target) => { target.block.emphasis = emphasis; })}
              />
              <AdvancedSourceEditor
                label="Block"
                value={object.block || {}}
                disabled={locked}
                focusId="text-copy"
                diagnosticPath={textBlockPath}
                externalError={getDirectorFieldError(editorDiagnostics, textBlockPath)}
                onCommit={(value) => commit('Edit complete block source', (target) => { target.block = value; })}
              />
              <label className="about-track-editor-check">
                <input type="checkbox" checked={object.block?.worldInfluence === true} disabled={locked} onChange={(event) => commit(`Edit ${pointFieldV6 ? 'Point field' : 'World'} influence`, (target) => { target.block.worldInfluence = event.target.checked; })} />
                Influences the {pointFieldV6 ? 'Point field' : 'World'} presentation
              </label>
            </>
          ) : null}
          {object.kind === 'stub' ? <TextField label="Draft label" value={object.label || ''} disabled={locked} multiline focusId="text-copy" diagnosticPath={`${textFieldPath}.label`} error={getDirectorFieldError(editorDiagnostics, `${textFieldPath}.label`)} onCommit={(value) => commit('Edit Stub label', (target) => { target.label = value; })} /> : null}
          <TextField label="Presentation layout" value={object.presentation?.layout || ''} disabled={locked} diagnosticPath={`${textFieldPath}.presentation.layout`} error={getDirectorFieldError(editorDiagnostics, `${textFieldPath}.presentation.layout`)} onCommit={(value) => commit('Edit Text layout', (target) => { target.presentation = { ...target.presentation, layout: value }; })} />
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
            diagnosticPath={`${interactionPath}.type`}
            error={getDirectorFieldError(editorDiagnostics, `${interactionPath}.type`)}
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
            label={pointFieldV6 ? 'Target state ID' : 'Target World'}
            value={pointFieldV6 ? object.targetStateId : object.targetWorldId}
            disabled={locked}
            options={pointFieldV6
              ? snapshot.document.tracks.pointField.stateDefinitions.map((state) => ({
                value: state.id,
                label: `${state.label} · ${state.id}`,
              }))
              : snapshot.document.tracks.worlds.objects.map((world) => ({ value: world.id, label: world.label || world.id }))}
            onCommit={(value) => commit('Retarget Interaction', (target) => {
              if (pointFieldV6) target.targetStateId = value;
              else target.targetWorldId = value;
            })}
          />
          {object.type === 'discipline-reveal' ? (
            <>
              <p className="about-track-editor-parameter-note is-wide">
                Each label is pinned to a real grid point and reveals as the camera passes it. Colour is locked to its unique simulation group.
              </p>
              <DisciplinePositionEditor
                items={object.parameters?.items || []}
                disabled={locked}
                onBegin={(group, profile) => store.beginGesture(
                  `Move Discipline ${group} ${profile} position`,
                  { selection },
                )}
                onPreview={(group, profile, position) => store.updateGesture((draft) => {
                  const target = getAboutNarrativeTrackObject(draft, selection);
                  if (target) mutateDisciplinePosition(target, group, profile, position);
                }, { selection })}
                onFinish={() => store.commitGesture({ selectionAfter: selection, requireValid: true })}
                onCancel={() => store.cancelGesture()}
                onCommit={(group, profile, position) => commit(
                  `Move Discipline ${group} ${profile} position`,
                  (target) => mutateDisciplinePosition(target, group, profile, position),
                )}
              />
              <div className="about-track-editor-discipline-layout is-wide">
                {(object.parameters?.items || []).map((item) => {
                  return (
                    <InspectorFolder
                      key={`discipline-${item.group}`}
                      group={{ id: `discipline-${item.group}`, label: item.label }}
                      count={2}
                      defaultOpen={item.group === 1}
                    >
                      <div className="about-track-editor-discipline-heading">
                        <span
                          className="about-track-editor-discipline-swatch"
                          style={{ backgroundColor: `var(${ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS[item.group - 1]})` }}
                          aria-hidden="true"
                        />
                        <small>Colour {item.group} · unique</small>
                      </div>
                      <TextField
                        label="Label"
                        value={item.label}
                        disabled={locked}
                        onCommit={(value) => commit('Edit Discipline label', (target) => {
                          const targetItem = target.parameters.items.find((candidate) => candidate.group === item.group);
                          if (targetItem) targetItem.label = value;
                        })}
                      />
                      <TextField
                        label="Description"
                        value={item.description || ''}
                        disabled={locked}
                        onCommit={(value) => commit('Edit Discipline description', (target) => {
                          const targetItem = target.parameters.items.find((candidate) => candidate.group === item.group);
                          if (targetItem) targetItem.description = value;
                        })}
                      />
                    </InspectorFolder>
                  );
                })}
              </div>
            </>
          ) : null}
          {ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[object.type]?.parameters
            .filter((control) => control.group)
            .map((control) => {
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

const publicPreviewBaselineHash = (schemaVersion) => `public-editor-preview-v${schemaVersion}`;

const DIRECTOR_DOCK_MODES = Object.freeze([
  { id: 'minimized', label: 'Minimize timeline' },
  { id: 'compact', label: 'Use compact timeline' },
  { id: 'expanded', label: 'Expand timeline' },
]);

function hasUsefulInspectorSelection(document, selection) {
  if (POINT_FIELD_SELECTION_TYPES.has(selection?.type)) return true;
  if (selection?.type === 'track') {
    return ['camera', 'visibility', 'text', 'point-field'].includes(selection.id);
  }
  return Boolean(getAboutNarrativeTrackObject(document, selection));
}

function getDirectorSaveLabel(snapshot) {
  if (snapshot.sourceState.status === 'read-only') return 'Read only';
  if (snapshot.saveState.status === 'conflict') return 'Conflict';
  if (snapshot.saveState.status === 'saving') return 'Saving';
  if (snapshot.saveState.status === 'failed') return 'Save failed';
  return snapshot.dirty ? 'Unsaved changes' : 'Saved';
}

function humanizeDiagnosticProperty(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/WU\b/g, 'WU')
    .replace(/^./, (character) => character.toUpperCase());
}

function getDiagnosticControlSpec(resolved) {
  const path = String(resolved.diagnostic?.path || '');
  const parts = path.split('.');
  const leaf = parts.at(-1) || resolved.property;
  const selectionType = resolved.selection.type;
  if (selectionType === 'point-field-key') {
    return { label: leaf === 'stateId' ? 'State' : leaf === 'atWU' ? 'Story WU' : humanizeDiagnosticProperty(leaf) };
  }
  if (selectionType === 'point-field-segment') {
    if (path.includes('.stagger.')) return { folder: 'Stagger', label: humanizeDiagnosticProperty(leaf) };
    if (path.includes('.path.')) return { folder: 'Organic path', label: leaf === 'mode' ? 'Path' : humanizeDiagnosticProperty(leaf) };
    if (path.includes('.flatten.')) return { folder: 'Plane motion', label: leaf === 'offset' ? 'Plane position' : humanizeDiagnosticProperty(leaf) };
    return { label: leaf === 'type' ? 'Type' : leaf === 'easing' ? 'Easing' : leaf === 'correspondence' ? 'Correspondence' : humanizeDiagnosticProperty(leaf) };
  }
  if (selectionType === 'point-field-state') {
    if (path.includes('.transform.')) {
      const vectorIndex = Number(leaf);
      const field = parts.at(-2);
      return Number.isInteger(vectorIndex)
        ? { folder: 'Transform', label: `${humanizeDiagnosticProperty(field)} ${'XYZ'[vectorIndex]}` }
        : { folder: 'Transform', label: leaf === 'pointSizeScale' ? 'Point size' : humanizeDiagnosticProperty(leaf) };
    }
    const labels = { shapeId: 'Shape', entryDistanceWU: 'Entry distance', railAnchorWU: 'Rail anchor WU' };
    return { label: labels[leaf] || humanizeDiagnosticProperty(leaf) };
  }
  if (selectionType === 'camera-key') {
    const axis = Number(leaf);
    const field = parts.at(-2);
    const control = ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS.find((candidate) => (
      candidate.id === `${field}.${axis}` || candidate.id === leaf
    ));
    if (control) return { folder: 'Camera rig', label: control.label };
    if (leaf === 'easing') return { ariaLabel: 'Camera easing presets' };
    return { label: humanizeDiagnosticProperty(leaf) };
  }
  if (selectionType === 'visibility-key') {
    return { label: leaf === 'visibility' ? 'Simulation visibility' : leaf === 'easing' ? 'Fade easing' : humanizeDiagnosticProperty(leaf) };
  }
  if (selectionType === 'interaction') {
    const labels = {
      type: 'Motion type',
      startWU: 'Ripple starts',
      activationWU: 'activationWU',
      endWU: 'endWU',
    };
    return { label: labels[leaf] || humanizeDiagnosticProperty(leaf) };
  }
  return { label: humanizeDiagnosticProperty(leaf) };
}

function makeDiagnosticTargetFocusable(target) {
  if (!target) return null;
  if (!target.disabled) return target;
  const owner = target.closest('label, [role="group"], .about-track-editor-field');
  if (!owner) return target;
  owner.tabIndex = -1;
  return owner;
}

function findDiagnosticControl(root, resolved) {
  if (!root) return null;
  const spec = getDiagnosticControlSpec(resolved);
  let scope = root;
  if (spec.folder) {
    const folder = [...root.querySelectorAll('details')].find((candidate) => (
      candidate.querySelector(':scope > summary')?.textContent.trim().startsWith(spec.folder)
    ));
    if (folder) {
      folder.open = true;
      scope = folder;
    }
  }
  if (spec.ariaLabel) {
    const owner = [...scope.querySelectorAll('[aria-label]')].find((candidate) => (
      candidate.getAttribute('aria-label') === spec.ariaLabel
    ));
    return makeDiagnosticTargetFocusable(owner?.matches('button, input, select, textarea, [tabindex]')
      ? owner
      : owner?.querySelector('button, input, select, textarea, [tabindex]'));
  }
  const normalized = spec.label.toLowerCase();
  const label = [...scope.querySelectorAll('label')].find((candidate) => {
    const heading = candidate.querySelector(':scope > span')?.textContent
      || candidate.childNodes[0]?.textContent
      || '';
    return heading.trim().toLowerCase() === normalized;
  });
  if (label) return makeDiagnosticTargetFocusable(label.querySelector('input, select, textarea, button, [tabindex]'));
  const group = [...scope.querySelectorAll('[role="group"][aria-label]')].find((candidate) => (
    candidate.getAttribute('aria-label')?.toLowerCase() === normalized
  ));
  if (group) return makeDiagnosticTargetFocusable(group.querySelector('input, select, textarea, button, [tabindex]'));
  return makeDiagnosticTargetFocusable([...scope.querySelectorAll('[aria-label]')].find((candidate) => (
    candidate.getAttribute('aria-label')?.toLowerCase().startsWith(`${normalized} `)
  )) || null);
}

function DiagnosticsDrawer({ document, diagnostics, onShow, onClose }) {
  const rows = diagnostics.map((diagnostic, index) => ({
    diagnostic,
    key: `${diagnostic.level}-${diagnostic.code}-${diagnostic.path}-${index}`,
    ...describeAboutDirectorDiagnostic(document, diagnostic),
  }));
  return (
    <section
      className="about-director-diagnostics"
      aria-labelledby="about-director-diagnostics-title"
      role="dialog"
      aria-modal="false"
      data-director-panel="diagnostics"
    >
      <header>
        <div>
          <span>Document health</span>
          <h2 id="about-director-diagnostics-title">Diagnostics</h2>
        </div>
        <button type="button" aria-label="Close diagnostics" onClick={onClose}>Close</button>
      </header>
      {rows.length ? (
        <div className="about-director-diagnostics__table-wrap">
          <table>
            <thead><tr><th>Severity</th><th>Object / segment</th><th>Property</th><th>Message</th><th><span className="about-director-visually-hidden">Action</span></th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={`is-${row.severity}`}>
                  <td><span className="about-director-diagnostic-severity">{row.severity}</span></td>
                  <td>{row.object}</td>
                  <td><code>{row.property}</code></td>
                  <td>{row.message}</td>
                  <td><button type="button" onClick={() => onShow(row)}>Show</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="about-director-diagnostics__empty">No active diagnostics. The current plan is valid.</p>}
    </section>
  );
}

export default function AboutNarrativeEditor({ store, rootRef, previewOnly = false }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const schemaVersion = Number(snapshot.document.schemaVersion);
  const pointFieldV6 = schemaVersion === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  const persistenceTargetVersion = pointFieldV6
    ? ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION
    : 5;
  const previewBaselineHash = publicPreviewBaselineHash(persistenceTargetVersion);
  const [initialPreviewLocalSave] = useState(() => (previewOnly
    ? readAboutNarrativeLocalSave({ targetVersion: persistenceTargetVersion })
    : null));
  const [editorVisible, setEditorVisible] = useState(true);
  const [editScope, setEditScope] = useState('base');
  const [zoom, setZoom] = useState(1);
  const [timelineDock, setTimelineDock] = useState('compact');
  const [textMenu, setTextMenu] = useState(false);
  const [interactionMenu, setInteractionMenu] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [phoneSheet, setPhoneSheet] = useState('timeline');
  const [message, setMessage] = useState(() => {
    if (!previewOnly) return 'Loading canonical source…';
    if (initialPreviewLocalSave.status === 'saved') {
      return 'Loaded the version saved on this device.';
    }
    if (initialPreviewLocalSave.status === 'none') {
      return 'Ready. Save keeps changes on this device.';
    }
    return `${initialPreviewLocalSave.reason} Using the published version.`;
  });
  const editorRef = useRef(null);
  const menuTriggerRef = useRef(null);
  const documentMenuTriggerRef = useRef(null);
  const diagnosticsTriggerRef = useRef(null);
  const saveRef = useRef(() => {});
  const announcementDeduperRef = useRef(createAnnouncementDeduper());
  const [announcement, setAnnouncement] = useState('');
  const saving = snapshot.saveState.status === 'saving';
  const recovery = snapshot.recoveryState;
  const baselineHash = snapshot.baselineHash;
  const durationWU = Number(snapshot.compiledPlan?.durationWU
    || snapshot.document.profiles.desktop.storyDurationWU);
  const diagnostics = snapshot.diagnostics || [];
  const errors = diagnostics.filter((item) => item.level === 'error');
  const usefulInspectorSelection = hasUsefulInspectorSelection(
    snapshot.document,
    snapshot.selection,
  );
  const inspectorVisible = usefulInspectorSelection && inspectorOpen;
  const pointFieldSelection = POINT_FIELD_SELECTION_TYPES.has(snapshot.selection.type);
  const saveStateLabel = getDirectorSaveLabel(snapshot);
  const saveEligibility = store.getSaveEligibility();
  const saveBlockingReason = saveEligibility.allowed ? '' : saveEligibility.reason;
  const showStatus = Boolean(
    errors.length
    || snapshot.rejectedEdit?.reason
    || snapshot.previewDocumentState.status === 'last-valid-fallback'
    || ['saving', 'failed', 'conflict'].includes(snapshot.saveState.status)
    || recovery?.status === 'failed'
    || (snapshot.dirty && saveBlockingReason),
  );
  const selectionKey = `${snapshot.selection.type || 'none'}:${snapshot.selection.id || ''}`;
  const previousSelectionKeyRef = useRef(selectionKey);

  useEffect(() => {
    if (selectionKey !== previousSelectionKeyRef.current && usefulInspectorSelection) {
      setInspectorOpen(true);
    }
    previousSelectionKeyRef.current = selectionKey;
  }, [selectionKey, usefulInspectorSelection]);

  useEffect(() => {
    const next = announcementDeduperRef.current(
      snapshot.rejectedEdit?.reason || message || saveStateLabel,
    );
    if (next) setAnnouncement(next);
  }, [message, saveStateLabel, snapshot.rejectedEdit?.reason]);

  const closeDirectorMenu = useCallback(({ restoreFocus = true } = {}) => {
    setActiveMenu(null);
    if (restoreFocus) {
      window.requestAnimationFrame(() => menuTriggerRef.current?.focus());
    }
  }, []);

  const closeDiagnostics = useCallback(({ restoreFocus = true } = {}) => {
    setDiagnosticsOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => diagnosticsTriggerRef.current?.focus());
  }, []);

  const toggleDirectorMenu = useCallback((menu, trigger) => {
    if (activeMenu === menu) {
      closeDirectorMenu();
      return;
    }
    menuTriggerRef.current = trigger;
    setActiveMenu(menu);
    window.requestAnimationFrame(() => {
      editorRef.current
        ?.querySelector(`[data-director-menu-panel="${menu}"] button:not(:disabled)`)
        ?.focus();
    });
  }, [activeMenu, closeDirectorMenu]);

  const refreshConflictCanonical = useCallback(async (currentHash = '') => {
    try {
      const remote = await loadAboutNarrativeSource({ targetVersion: persistenceTargetVersion });
      const latest = store.getSnapshot();
      store.markConflict({
        currentHash: remote.hash || currentHash,
        remoteDocument: remote.document,
        localDocument: latest.document,
        comparison: compareAboutNarrativeDocuments({
          baseline: latest.baselineDocument,
          local: latest.document,
          remote: remote.document,
        }),
        message: 'Canonical changed. Export this draft, compare it, or reload with confirmation.',
      });
      setMessage('Canonical comparison is ready. Local work is preserved.');
      return true;
    } catch (error) {
      store.markConflict({
        currentHash,
        localDocument: store.getSnapshot().document,
        message: `Canonical comparison could not be loaded: ${error.message}. Retry when the source is available.`,
      });
      setMessage('Save conflict: local work is preserved. Canonical fetch can be retried.');
      return false;
    }
  }, [persistenceTargetVersion, store]);

  const save = useCallback(async () => {
    const eligibility = store.getSaveEligibility();
    if (!eligibility.allowed) {
      setMessage(eligibility.reason);
      return;
    }
    if (previewOnly) {
      const submission = store.beginSave();
      if (!submission) return;
      setMessage('Saving on this device…');
      try {
        const persisted = writeAboutNarrativeLocalSave(submission.document, {
          targetVersion: persistenceTargetVersion,
        });
        const reconciliation = store.markSaved(
          persisted.document,
          persisted.hash,
          submission.revision,
        );
        if (reconciliation.clean) {
          const cleared = clearAboutNarrativeRecoveryDraft();
          store.setRecoveryState(cleared);
          setMessage(cleared.status === 'failed'
            ? 'Saved on this device. Local recovery cleanup needs attention.'
            : 'Saved on this device.');
        } else {
          const latest = store.getSnapshot();
          const recoveryResult = flushAboutNarrativeRecoveryDraft({
            document: latest.document,
            baselineHash: latest.baselineHash,
            selection: latest.selection,
            storyWU: latest.transport.storyWU,
            targetVersion: persistenceTargetVersion,
          });
          store.setRecoveryState(recoveryResult);
          setMessage('Saved the submitted revision. Newer edits remain unsaved.');
        }
      } catch (error) {
        store.markSaveFailed(error);
        setMessage(error.message);
      }
      return;
    }
    const submission = store.beginSave();
    if (!submission) return;
    setMessage(`Validating and saving v${persistenceTargetVersion}…`);
    try {
      const persisted = await saveAboutNarrativeSource(
        submission.document,
        submission.baselineHash,
        { targetVersion: persistenceTargetVersion },
      );
      const reconciliation = store.markSaved(
        persisted.document,
        persisted.hash,
        submission.revision,
      );
      if (reconciliation.clean) {
        const cleared = clearAboutNarrativeRecoveryDraft();
        store.setRecoveryState(cleared);
        setMessage(cleared.status === 'failed'
          ? `Saved canonical v${persistenceTargetVersion}. Local recovery cleanup needs attention.`
          : `Saved canonical v${persistenceTargetVersion}.`);
      } else {
        const latest = store.getSnapshot();
        const recoveryResult = flushAboutNarrativeRecoveryDraft({
          document: latest.document,
          baselineHash: latest.baselineHash,
          selection: latest.selection,
          storyWU: latest.transport.storyWU,
          targetVersion: persistenceTargetVersion,
        });
        store.setRecoveryState(recoveryResult);
        setMessage('Saved the submitted revision. Newer edits remain unsaved.');
      }
    } catch (error) {
      if (error.status === 409) {
        store.markConflict({
          currentHash: error.currentHash,
          localDocument: store.getSnapshot().document,
          message: 'Canonical changed. Loading a stable-ID comparison…',
        });
        menuTriggerRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : documentMenuTriggerRef.current;
        setActiveMenu('document');
        await refreshConflictCanonical(error.currentHash);
      } else {
        store.markSaveFailed(error);
        setMessage(error.message);
      }
    }
  }, [persistenceTargetVersion, previewOnly, refreshConflictCanonical, store]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;
    if (editorVisible) {
      // The preview host exposes editor chrome state to the isolated runtime layers.
      // eslint-disable-next-line react-hooks/immutability
      root.dataset.editorActive = 'true';
      root.dataset.editorInspectorOpen = inspectorVisible ? 'true' : 'false';
    } else {
      delete root.dataset.editorActive;
      delete root.dataset.editorInspectorOpen;
    }
    return () => {
      delete root.dataset.editorActive;
      delete root.dataset.editorInspectorOpen;
    };
  }, [editorVisible, inspectorVisible, rootRef]);

  useEffect(() => {
    const root = rootRef?.current;
    if (!root) return undefined;
    const layout = snapshot.previewState.layoutProfile;
    const orientation = snapshot.previewState.orientation;
    // The runtime observes these attributes without coupling to React editor state.
    // eslint-disable-next-line react-hooks/immutability
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
  }, [inspectorVisible, rootRef, snapshot.previewState.layoutProfile, snapshot.previewState.orientation]);

  useEffect(() => {
    if (previewOnly) {
      const bundledSource = store.getSnapshot().document;
      const localSave = initialPreviewLocalSave;
      const source = localSave.status === 'saved' ? localSave.document : bundledSource;
      const sourceHash = localSave.status === 'saved' ? localSave.hash : previewBaselineHash;
      store.installSource(source, sourceHash, {
        status: 'ready',
        migrations: localSave.migrations || [],
      });
      store.setRecoveryState(readAboutNarrativeRecoveryDraft({
        baselineHash: sourceHash,
        targetVersion: persistenceTargetVersion,
      }) || { status: 'none', available: false });
      store.setCheckpointState(readAboutNarrativeCheckpointState({
        targetVersion: persistenceTargetVersion,
      }));
      return undefined;
    }
    let active = true;
    loadAboutNarrativeSource({ targetVersion: persistenceTargetVersion }).then((source) => {
      if (!active) return;
      store.installSource(
        source.document,
        source.hash,
        {
          status: 'ready',
          migrations: source.migrations || [],
          message: source.migrations?.length
            ? `Migrated canonical source to v${persistenceTargetVersion}.`
            : '',
        },
      );
      store.setRecoveryState(readAboutNarrativeRecoveryDraft({
        baselineHash: source.hash,
        targetVersion: persistenceTargetVersion,
      }) || { status: 'none', available: false });
      store.setCheckpointState(readAboutNarrativeCheckpointState({
        targetVersion: persistenceTargetVersion,
      }));
      setMessage(source.migrations?.length
        ? `Loaded and migrated canonical source to v${persistenceTargetVersion}.`
        : `Canonical v${persistenceTargetVersion} ready.`);
    }).catch((error) => {
      if (active) {
        store.setSourceState({
          status: error.code === 'future-schema' ? 'read-only' : 'failed',
          readOnly: error.code === 'future-schema',
          message: error.message,
          diagnostics: error.diagnostics || [],
        });
        setMessage(`Canonical load failed: ${error.message}`);
      }
    });
    return () => { active = false; };
  }, [initialPreviewLocalSave, persistenceTargetVersion, previewBaselineHash, previewOnly, store]);

  useEffect(() => {
    if (!snapshot.dirty || !baselineHash) return undefined;
    const timer = window.setTimeout(() => {
      const result = flushAboutNarrativeRecoveryDraft({
        document: snapshot.document,
        baselineHash,
        selection: snapshot.selection,
        storyWU: snapshot.transport.storyWU,
        targetVersion: persistenceTargetVersion,
      });
      store.setRecoveryState(result);
      if (result.status === 'failed') setMessage(result.reason);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [baselineHash, persistenceTargetVersion, snapshot.dirty, snapshot.document, snapshot.revision, snapshot.selection, snapshot.transport.storyWU, store]);

  useEffect(() => {
    const handlePageHide = () => {
      const current = store.getSnapshot();
      if (!current.dirty || !current.baselineHash) return;
      flushAboutNarrativeRecoveryDraft({
        document: current.document,
        baselineHash: current.baselineHash,
        selection: current.selection,
        storyWU: current.transport.storyWU,
        targetVersion: persistenceTargetVersion,
      });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [persistenceTargetVersion, store]);

  useEffect(() => {
    if (!activeMenu) return undefined;
    const handlePointerDown = (event) => {
      if (event.target.closest('[data-director-menu-root]')) return;
      closeDirectorMenu({ restoreFocus: false });
    };
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
  }, [activeMenu, closeDirectorMenu]);

  useEffect(() => {
    if (!diagnosticsOpen) return undefined;
    const panel = editorRef.current?.querySelector('.about-director-diagnostics');
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDiagnostics();
      }
    };
    const handlePointerDown = (event) => {
      if (panel?.contains(event.target) || diagnosticsTriggerRef.current?.contains(event.target)) return;
      closeDiagnostics({ restoreFocus: false });
    };
    panel?.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    return () => {
      panel?.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, [closeDiagnostics, diagnosticsOpen]);

  useEffect(() => {
    if (!activeMenu) return undefined;
    const panel = editorRef.current?.querySelector(`[data-director-menu-panel="${activeMenu}"]`);
    if (!panel) return undefined;
    window.requestAnimationFrame(() => {
      if (!panel.contains(document.activeElement)) {
        panel.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], summary')?.focus();
      }
    });
    const handleMenuKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeDirectorMenu();
      }
    };
    panel.addEventListener('keydown', handleMenuKeyDown);
    return () => panel.removeEventListener('keydown', handleMenuKeyDown);
  }, [activeMenu, closeDirectorMenu]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const editing = isEditorTypingTarget(target);
      const controlOwnsKeyboard = isEditorOwnedKeyboardTarget(target);
      const overlayOwnsKeyboard = targetMatchesClosest(
        target,
        '[data-director-menu-panel], .about-director-diagnostics',
      );
      const command = event.metaKey || event.ctrlKey;
      if (editing && isSlashKey(event)) {
        // Keep native typing, but prevent the legacy dev-panel shortcut from
        // seeing Slash after the About editor has claimed this route.
        event.stopImmediatePropagation();
        return;
      }
      if (!editing && !command && !event.altKey && isSlashKey(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat && !event.shiftKey) setEditorVisible((visible) => !visible);
        return;
      }
      if (event.key === 'Escape' && diagnosticsOpen) {
        event.preventDefault();
        event.stopPropagation();
        closeDiagnostics();
        return;
      }
      if (!editorVisible || !editorRef.current?.contains(target)) return;
      if (command && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveRef.current();
        return;
      }
      if (editing) return;
      if (event.key === 'Escape') {
        store.cancelGesture();
        store.cancelTry();
        setTextMenu(false);
        setInteractionMenu(false);
        setPhoneSheet('timeline');
        if (activeMenu) closeDirectorMenu();
        return;
      }
      if (overlayOwnsKeyboard) return;
      if (controlOwnsKeyboard && !command) return;
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
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [activeMenu, closeDiagnostics, closeDirectorMenu, diagnosticsOpen, editorVisible, store]);

  const toggleLoop = () => {
    if (snapshot.transport.loop) {
      store.setTransport({ loop: null });
      return;
    }
    const pointFieldRange = POINT_FIELD_SELECTION_TYPES.has(snapshot.selection.type)
      ? getAboutNarrativePointFieldItemRange(
        snapshot.document,
        snapshot.selection.type,
        snapshot.selection.id,
      )
      : null;
    const loop = pointFieldRange
      ? {
        valid: Number(pointFieldRange.endWU) > Number(pointFieldRange.startWU),
        startWU: clamp(Number(pointFieldRange.startWU) - 0.15, 0, durationWU),
        endWU: clamp(Number(pointFieldRange.endWU) + 0.15, 0, durationWU),
        reason: 'The selected Point field item has no duration to audition.',
      }
      : deriveAboutNarrativeTrackLoopRange({
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

  const restoreCheckpoint = (checkpoint) => {
    if (!window.confirm(`Restore “${checkpoint.name}”? You can undo this action.`)) return;
    store.replaceDocument('Restore checkpoint', checkpoint.document, { requireValid: true });
    if (checkpoint.selection) store.setSelection(checkpoint.selection);
    if (Number.isFinite(checkpoint.storyWU)) {
      store.setTransport({ owner: 'timeline', playing: false, storyWU: checkpoint.storyWU });
    }
    setMessage(`Restored ${checkpoint.name}.`);
  };

  const reloadConflictSource = () => {
    const conflict = store.getSnapshot().conflictState;
    if (!conflict.remoteDocument) {
      setMessage('Reload is unavailable until the canonical source can be read. Export the local draft first.');
      return;
    }
    if (!window.confirm('Reload the canonical source? Your local draft will remain available through Undo.')) return;
    store.reloadSource(conflict.remoteDocument, conflict.currentHash);
    const cleared = clearAboutNarrativeRecoveryDraft();
    store.setRecoveryState(cleared);
    setMessage('Reloaded canonical source. Use Undo to return to the local draft.');
  };

  const openTextEditor = useCallback((object) => {
    store.setSelection({ type: 'text-field', id: object.id });
    setInspectorOpen(true);
    if (window.matchMedia('(max-width: 700px)').matches) setPhoneSheet('inspector');
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        document.querySelector('[data-editor-focus-id="text-copy"]')?.focus();
      });
    });
  }, [store]);

  const showDiagnostic = useCallback((resolved) => {
    if (POINT_FIELD_SELECTION_TYPES.has(resolved.selection.type)) {
      store.pointField.select(resolved.selection);
    } else {
      store.setSelection(resolved.selection);
    }
    if (Number.isFinite(resolved.storyWU)) {
      store.setTransport({ owner: 'timeline', playing: false, storyWU: resolved.storyWU });
    }
    setInspectorOpen(true);
    setPhoneSheet('inspector');
    closeDiagnostics({ restoreFocus: false });
    const focus = () => {
      const root = editorRef.current;
      const path = resolved.diagnostic?.path;
      const safePath = path && window.CSS?.escape ? window.CSS.escape(path) : '';
      const target = (safePath ? root?.querySelector(`[data-diagnostic-path="${safePath}"]`) : null)
        || root?.querySelector(`[data-editor-focus-id="${resolved.focusId}"]`)
        || findDiagnosticControl(root?.querySelector('#about-director-inspector'), resolved)
        || root?.querySelector('#about-director-inspector input:not(:disabled), #about-director-inspector textarea:not(:disabled), #about-director-inspector select:not(:disabled), #about-director-inspector button:not(:disabled)');
      target?.focus();
    };
    window.requestAnimationFrame(() => window.requestAnimationFrame(focus));
  }, [closeDiagnostics, store]);

  return (
    <aside
      ref={editorRef}
      className="about-track-editor"
      data-editor-product="about-director-3"
      data-editor-version={pointFieldV6 ? 'point-field-v6' : 'sectionless-v5'}
      data-source-state={snapshot.sourceState.status}
      data-save-state={snapshot.saveState.status}
      data-timeline-dock={timelineDock}
      data-inspector-open={inspectorVisible ? 'true' : 'false'}
      data-phone-sheet={phoneSheet}
      data-mobile-inspector-open={phoneSheet === 'inspector' ? 'true' : 'false'}
      hidden={!editorVisible}
      aria-keyshortcuts="/"
      aria-label="About Director 3.0"
      onKeyDown={stopEditorShortcutPropagation}
    >
      <header className="about-track-editor-topbar" data-director-panel="command-bar">
        <div className="about-track-editor-brand">
          <strong>About Director <sup>3.0</sup></strong>
          <span
            className={`about-director-source-dot is-${snapshot.sourceState.status}`}
            aria-label={`Schema v${schemaVersion}, source ${snapshot.sourceState.status}`}
            title={`Schema v${schemaVersion} · ${snapshot.sourceState.status}`}
          />
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
          <input
            aria-label="Timeline playhead"
            type="range"
            min="0"
            max={durationWU}
            step="0.005"
            value={snapshot.transport.storyWU}
            onChange={(event) => store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(event.target.value) })}
          />
          <output aria-label={`${snapshot.transport.storyWU.toFixed(3)} story units`}>{snapshot.transport.storyWU.toFixed(2)}</output>
        </div>
        <div className="about-track-editor-actions">
          {diagnostics.length ? (
            <button
              type="button"
              ref={diagnosticsTriggerRef}
              className={errors.length ? 'has-errors' : ''}
              aria-controls="about-director-diagnostics"
              aria-expanded={diagnosticsOpen}
              onClick={() => setDiagnosticsOpen((open) => !open)}
            >Issues · {diagnostics.length}</button>
          ) : null}
          <button
            type="button"
            disabled={!snapshot.history.canUndo}
            aria-label={snapshot.history.canUndo
              ? `Undo ${snapshot.history.undoLabel}`
              : 'Undo'}
            aria-keyshortcuts="Meta+Z Control+Z"
            title={snapshot.history.undoLabel || 'Undo the last edit'}
            onClick={() => store.undo()}
          >Undo</button>
          <button
            type="button"
            className="is-save"
            aria-disabled={!saveEligibility.allowed}
            aria-describedby={saveBlockingReason ? 'about-director-save-errors' : undefined}
            data-save-allowed={saveEligibility.allowed ? 'true' : 'false'}
            onClick={(event) => {
              if (!saveEligibility.allowed) {
                event.preventDefault();
                setMessage(saveBlockingReason);
                return;
              }
              save();
            }}
          >
            {saving ? 'Saving…' : snapshot.dirty ? 'Save' : 'Saved'}
          </button>
          <div className="about-director-menu-root" data-director-menu-root>
            <button
              type="button"
              ref={documentMenuTriggerRef}
              aria-haspopup="dialog"
              aria-controls="about-director-document-menu"
              aria-expanded={activeMenu === 'document'}
              onClick={(event) => toggleDirectorMenu('document', event.currentTarget)}
            >More</button>
            {activeMenu === 'document' ? (
              <section
                id="about-director-document-menu"
                className="about-director-menu-panel"
                role="dialog"
                aria-modal="false"
                aria-label="Director actions"
                data-director-menu-panel="document"
                data-director-panel="document-menu"
              >
                <header>
                  <div><strong>About Director</strong><span>Schema v{schemaVersion} · {snapshot.sourceState.status}</span></div>
                  <button type="button" aria-label="Close Director menu" onClick={() => closeDirectorMenu()}>Close</button>
                </header>
                <div className="about-director-quick-actions">
                  <button
                    type="button"
                    disabled={!usefulInspectorSelection}
                    onClick={() => {
                      setInspectorOpen((open) => !open);
                      setPhoneSheet('inspector');
                      closeDirectorMenu({ restoreFocus: false });
                    }}
                  >{inspectorVisible ? 'Close inspector' : 'Open inspector'}</button>
                  <button type="button" className={snapshot.transport.loop ? 'is-active' : ''} onClick={toggleLoop}>
                    {snapshot.transport.loop ? 'Loop on' : 'Loop selection'}
                  </button>
                  <button type="button" disabled={!snapshot.history.canUndo} onClick={() => store.undo()} title={snapshot.history.undoLabel}>Undo</button>
                  <button type="button" disabled={!snapshot.history.canRedo} onClick={() => store.redo()} title={snapshot.history.redoLabel}>Redo</button>
                </div>
                <h3 className="about-director-menu-heading">Document</h3>
                <div className="about-director-document-actions">
                  <button type="button" onClick={() => exportAboutNarrativeDocument(
                    snapshot.document,
                    pointFieldV6 ? 'contents-about-v6.json' : 'contents-about.json',
                    { targetVersion: persistenceTargetVersion },
                  )}>Export current draft</button>
                  <button
                    type="button"
                    disabled={snapshot.checkpointState.status === 'protected'}
                    onClick={() => {
                      try {
                        const timestamp = Date.now();
                        const items = writeAboutNarrativeCheckpoint({
                          id: `checkpoint-${timestamp}`,
                          name: `Manual checkpoint · ${new Date(timestamp).toLocaleString()}`,
                          timestamp,
                          baseSourceHash: baselineHash,
                          document: snapshot.document,
                          selection: snapshot.selection,
                          storyWU: snapshot.transport.storyWU,
                        }, { targetVersion: persistenceTargetVersion });
                        store.setCheckpointState({ status: 'ready', items, message: '' });
                        setMessage('Checkpoint saved locally.');
                      } catch (error) {
                        store.setCheckpointState({ status: 'failed', message: error.message });
                        setMessage(`Checkpoint failed: ${error.message}`);
                      }
                    }}
                  >Create checkpoint</button>
                  <button
                    type="button"
                    disabled={!snapshot.dirty || snapshot.saveState.status === 'saving'}
                    onClick={() => {
                      if (!window.confirm('Restore the last saved source? You can undo this action.')) return;
                      if (store.restoreBaseline()) setMessage('Restored the last saved source.');
                    }}
                  >Restore last saved</button>
                </div>

                {snapshot.conflictState.available ? (
                  <section className="about-track-editor-recovery" aria-label="Save conflict">
                    <strong>Canonical changed while this draft was open.</strong>
                    <p>{snapshot.conflictState.message || 'Local work is preserved. No changes were merged automatically.'}</p>
                    {snapshot.conflictState.comparison ? (
                      <details>
                        <summary>Compare stable fields</summary>
                        <p>{snapshot.conflictState.comparison.localChanges.length} local changes · {snapshot.conflictState.comparison.remoteChanges.length} canonical changes</p>
                        <ul>
                          {snapshot.conflictState.comparison.localChanges.slice(0, 12).map((path) => <li key={`local-${path}`}>Local · {path}</li>)}
                          {snapshot.conflictState.comparison.remoteChanges.slice(0, 12).map((path) => <li key={`remote-${path}`}>Canonical · {path}</li>)}
                        </ul>
                      </details>
                    ) : <p>Comparison is unavailable. Export the local draft before reloading.</p>}
                    <div>
                      <button type="button" onClick={() => exportAboutNarrativeDocument(
                        snapshot.document,
                        'contents-about-local-conflict.json',
                        { targetVersion: persistenceTargetVersion },
                      )}>Export local</button>
                      {snapshot.conflictState.remoteDocument ? (
                        <button type="button" onClick={reloadConflictSource}>Reload canonical</button>
                      ) : (
                        <button type="button" onClick={() => refreshConflictCanonical(snapshot.conflictState.currentHash)}>Retry canonical fetch</button>
                      )}
                    </div>
                  </section>
                ) : null}

                {snapshot.checkpointState.items?.length || ['failed', 'protected'].includes(snapshot.checkpointState.status) ? (
                  <section className="about-track-editor-recovery" aria-label="Local checkpoints">
                    <strong>Local checkpoints</strong>
                    {['failed', 'protected'].includes(snapshot.checkpointState.status) ? <p>{snapshot.checkpointState.message}</p> : null}
                    {snapshot.checkpointState.items?.map((checkpoint) => (
                      <div className="about-director-checkpoint" key={checkpoint.id}>
                        <span>{checkpoint.name}</span>
                        <button type="button" onClick={() => restoreCheckpoint(checkpoint)}>Restore</button>
                        <button type="button" onClick={() => exportAboutNarrativeDocument(
                          checkpoint.document,
                          `${checkpoint.id}.json`,
                          { targetVersion: persistenceTargetVersion },
                        )}>Export</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete “${checkpoint.name}”?`)) return;
                            try {
                              deleteAboutNarrativeCheckpoint(checkpoint.id, {
                                targetVersion: persistenceTargetVersion,
                              });
                              store.setCheckpointState(readAboutNarrativeCheckpointState({
                                targetVersion: persistenceTargetVersion,
                              }));
                            } catch (error) {
                              store.setCheckpointState({ status: 'failed', message: error.message });
                            }
                          }}
                        >Delete</button>
                      </div>
                    ))}
                    {snapshot.checkpointState.protectedItems?.map((checkpoint) => (
                      <div className="about-director-checkpoint" key={checkpoint.storageKey}>
                        <span>{checkpoint.name} · {checkpoint.status}</span>
                        <button type="button" onClick={() => exportAboutNarrativeDocument(
                          checkpoint.original,
                          `${checkpoint.id || checkpoint.storageKey}-protected.json`,
                          { preserveOriginal: true, targetVersion: persistenceTargetVersion },
                        )}>Export original</button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Delete protected checkpoint “${checkpoint.name}”? Export it first if you need its original data.`)) return;
                            try {
                              deleteAboutNarrativeCheckpoint(checkpoint.storageKey, {
                                targetVersion: persistenceTargetVersion,
                              });
                              store.setCheckpointState(readAboutNarrativeCheckpointState({
                                targetVersion: persistenceTargetVersion,
                              }));
                            } catch (error) {
                              store.setCheckpointState({ status: 'failed', message: error.message });
                            }
                          }}
                        >Delete protected</button>
                      </div>
                    ))}
                  </section>
                ) : null}

                {recovery?.available ? (
                  <section className="about-track-editor-recovery" aria-label="Recovery draft">
                    <strong>{recovery.status === 'stale' ? 'Recovery from an earlier source' : 'Recovery draft available'}</strong>
                    <p>{recovery.reason || 'Restore it, export it, or discard it.'}</p>
                    <div>
                      {recovery.document ? <button type="button" onClick={restoreRecovery}>Restore draft</button> : null}
                      {recovery.original !== undefined ? <button type="button" onClick={() => exportAboutNarrativeDocument(recovery.original, 'contents-about-recovered.json', { preserveOriginal: true, targetVersion: persistenceTargetVersion })}>Export original</button> : null}
                      <button type="button" onClick={() => {
                        const cleared = clearAboutNarrativeRecoveryDraft();
                        store.setRecoveryState(cleared);
                      }}>Discard</button>
                    </div>
                  </section>
                ) : null}
                <details className="about-director-help-panel">
                  <summary>Keyboard shortcuts</summary>
                  <dl>
                    <div><dt>/</dt><dd>Show or hide Director</dd></div>
                    <div><dt>Space</dt><dd>Play or pause when Director has focus</dd></div>
                    <div><dt>⌘ S</dt><dd>Save the current draft</dd></div>
                    <div><dt>⌘ Z</dt><dd>Undo</dd></div>
                    <div><dt>⇧ ⌘ Z</dt><dd>Redo</dd></div>
                    <div><dt>← →</dt><dd>Move the selection or playhead</dd></div>
                    <div><dt>Esc</dt><dd>Cancel the active gesture or close a panel</dd></div>
                  </dl>
                </details>
              </section>
            ) : null}
          </div>
          {saveBlockingReason ? (
            <span
              id="about-director-save-errors"
              className="about-director-save-block-reason about-director-visually-hidden"
              role="status"
              aria-live="polite"
            >{saveBlockingReason}</span>
          ) : null}
        </div>
      </header>

      <details className="about-track-editor-preview" data-director-panel="preview-controls">
        <summary>
          <span>Preview</span>
          <strong>
            {snapshot.previewState.layoutProfile[0].toUpperCase() + snapshot.previewState.layoutProfile.slice(1)}
            {' · '}{snapshot.previewState.orientation[0].toUpperCase() + snapshot.previewState.orientation.slice(1)}
            {snapshot.previewState.motionProfile === 'reduced' ? ' · Reduced' : ''}
          </strong>
        </summary>
        <div className="about-track-editor-preview__panel" aria-label="Responsive preview profile">
          <div className="about-track-editor-preview__profiles" role="group" aria-label="Preview device">
            {['desktop', 'tablet', 'mobile'].map((profile) => (
              <button
                type="button"
                key={profile}
                className={snapshot.previewState.layoutProfile === profile ? 'is-active' : ''}
                onClick={() => store.setPreviewState({ layoutProfile: profile })}
              >{profile[0].toUpperCase() + profile.slice(1)}</button>
            ))}
          </div>
          <label>
            Orientation
            <select
              aria-label="Preview orientation"
              value={snapshot.previewState.orientation}
              onChange={(event) => store.setPreviewState({ orientation: event.target.value })}
            >
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
            </select>
          </label>
          <label className="about-track-editor-check">
            <input
              type="checkbox"
              checked={snapshot.previewState.motionProfile === 'reduced'}
              onChange={(event) => store.setPreviewState({ motionProfile: event.target.checked ? 'reduced' : 'full' })}
            />
            Reduced Motion
          </label>
          {pointFieldV6 && pointFieldSelection ? (
            <label className="about-track-editor-edit-scope">
              Forms editing
              <select
                aria-label="Forms edit scope"
                value={editScope}
                onChange={(event) => setEditScope(event.target.value)}
              >
                <option value="base">Base</option>
                <option value="desktop">Desktop override</option>
                <option value="tablet">Tablet override</option>
                <option value="mobile">Mobile override</option>
              </select>
            </label>
          ) : null}
        </div>
      </details>

      <div className="about-director-sheet-switcher" role="group" aria-label="Phone authoring panel">
        <button
          type="button"
          className={phoneSheet === 'timeline' ? 'is-active' : ''}
          aria-pressed={phoneSheet === 'timeline'}
          onClick={() => setPhoneSheet('timeline')}
        >Timeline</button>
        <button
          type="button"
          className={phoneSheet === 'inspector' ? 'is-active' : ''}
          aria-pressed={phoneSheet === 'inspector'}
          disabled={!usefulInspectorSelection}
          onClick={() => {
            setInspectorOpen(true);
            setPhoneSheet('inspector');
          }}
        >Inspector</button>
      </div>

      <Timeline
        snapshot={snapshot}
        store={store}
        editScope={editScope}
        zoom={zoom}
        setZoom={setZoom}
        dockMode={timelineDock}
        setDockMode={setTimelineDock}
        textMenu={textMenu}
        setTextMenu={setTextMenu}
        interactionMenu={interactionMenu}
        setInteractionMenu={setInteractionMenu}
        onOpenTextEditor={openTextEditor}
      />

      <section
        id="about-director-inspector"
        className="about-track-editor-inspector"
        aria-label="Selected object inspector"
        data-director-panel="inspector"
        hidden={!inspectorVisible}
      >
        <button
          type="button"
          className="about-track-editor-inspector-close"
          aria-label="Close inspector"
          onClick={() => {
            setInspectorOpen(false);
            setPhoneSheet('timeline');
          }}
        >Close</button>
        <ObjectInspector
          snapshot={snapshot}
          store={store}
          editScope={editScope}
        />
        {snapshot.selection.type !== 'track' && !pointFieldSelection ? (
          <footer>
            <details className="about-director-object-menu">
              <summary>Object actions</summary>
              <div>
                <button type="button" onClick={() => store.copySelection()}>Copy</button>
                {snapshot.clipboard ? <button type="button" onClick={() => store.pasteClipboard({ atWU: snapshot.transport.storyWU })}>Paste</button> : null}
                <button type="button" onClick={() => store.duplicateSelection()}>Duplicate</button>
                <button type="button" className="is-danger" onClick={() => store.deleteSelection()}>
                  {snapshot.selection.type === 'camera-key' ? 'Delete camera shot' : 'Delete'}
                </button>
              </div>
            </details>
          </footer>
        ) : null}
      </section>

      {diagnosticsOpen ? (
        <div id="about-director-diagnostics">
          <DiagnosticsDrawer
            document={snapshot.document}
            diagnostics={diagnostics}
            onShow={showDiagnostic}
            onClose={() => closeDiagnostics()}
          />
        </div>
      ) : null}

      {showStatus ? (
        <div className="about-track-editor-status" data-director-panel="status">
          <span className={snapshot.dirty ? 'is-dirty' : 'is-clean'}>
            {snapshot.dirty ? 'Unsaved' : previewOnly ? 'Preview' : 'Canonical'}
          </span>
          <p>{snapshot.rejectedEdit?.reason || saveBlockingReason || message}</p>
          {diagnostics.length ? <b>{errors.length} errors · {diagnostics.length - errors.length} notices</b> : null}
          {snapshot.previewDocumentState.status === 'last-valid-fallback' ? (
            <b>Draft differs from preview · showing the last valid plan</b>
          ) : null}
        </div>
      ) : null}

      <p className="about-director-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>

    </aside>
  );
}
