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
  ABOUT_NARRATIVE_CAMERA_EASINGS,
  ABOUT_NARRATIVE_SCROLL_SMOOTHING_CONTROL,
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
  ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS,
  ABOUT_NARRATIVE_VISIBILITY_EASINGS,
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS,
  ABOUT_NARRATIVE_WORLD_POINT_SIZE_CONTROL,
} from './aboutNarrativeDefinitions.js';
import {
  deriveAboutNarrativeTrackLoopRange,
  getAboutNarrativeTextStoryDurationWU,
  getAboutNarrativeTrackObject,
  getAboutNarrativeTrackObjectRange,
} from './aboutNarrativeTrackEditing.js';
import {
  getAboutNarrativePointFieldItemRange,
} from './aboutNarrativePointFieldEditing.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  applyAboutNarrativePointFieldOverrides,
} from './aboutNarrativePointFieldSchema.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES,
} from './aboutNarrativePointFieldMotion.js';
import {
  ABOUT_NARRATIVE_MOMENT_PHASES,
  getAboutNarrativeMomentAtWU,
  getAboutNarrativeMomentTarget,
  getAboutNarrativeMomentTargets,
  getAboutNarrativeStoryMoments,
  refreshAboutNarrativeMomentTriggers,
  resolveAboutNarrativeMomentTriggerWU,
  setAboutNarrativeMomentTrigger,
} from './aboutNarrativeMoments.js';
import {
  getAboutNarrativeFormSequence,
} from './aboutNarrativeFormSequence.js';
import {
  DirectorPointFieldLane,
  PointFieldInspector,
  PointFieldLane,
} from './PointFieldLane.jsx';
import {
  ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX,
  ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN,
  resolveAboutNarrativeCameraKeyEasingHandles,
  setAboutNarrativeCameraKeyEasingStrength,
} from './aboutNarrativeCameraEasing.js';
import {
  ABOUT_INTERACTIVE_STACK_CONTROLS,
  ABOUT_INTERACTIVE_STACK_DEFAULTS,
  ABOUT_INTERACTIVE_STACK_KIND,
  ABOUT_INTERACTIVE_STACK_SEED_CONTROL,
} from './aboutInteractiveStackContract.js';
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
import { analyseAboutNarrativeComposerPlan } from './aboutNarrativeDirectorAnalysis.js';
import {
  ABOUT_NARRATIVE_STORY_FOCUS_MODES,
  ABOUT_NARRATIVE_STORY_GAP_PRESETS,
  compileAboutNarrativeStoryLayout,
} from './aboutNarrativeStoryLayout.js';
import {
  ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU,
  compileAboutNarrativeLongRideTrack,
} from './aboutNarrativeLongRideTrack.js';
import './about-narrative-editor.css';

const LEGACY_TRACKS = Object.freeze([
  { id: 'camera', label: 'Camera travel', type: 'camera-key', colour: 'camera' },
  { id: 'camera-orientation', label: 'Camera tilt', type: 'camera-orientation-key', colour: 'camera' },
  { id: 'visibility', label: 'Visibility', type: 'visibility-key', colour: 'visibility' },
  { id: 'world', label: 'World', type: 'world', colour: 'world' },
  { id: 'text', label: 'Text', type: 'text-field', colour: 'text' },
  { id: 'interaction', label: 'Motion', type: 'interaction', colour: 'interaction' },
]);
// Director is the default authoring projection. It deliberately exposes only
// the two choreographic decisions an author makes. The Story Stack sits above
// the timeline because content order and length are page structure, not clips.
// Advanced retains the normalized runtime channels for precision diagnostics.
const DIRECTOR_TRACKS = Object.freeze([
  { id: 'camera', group: 'Direction', label: 'Camera journey', type: 'camera-key', colour: 'camera' },
  { id: 'point-field', group: 'Direction', label: 'World sequence', type: 'point-field-key', colour: 'world' },
]);
const V2_DIRECTOR_TRACKS = Object.freeze([
  { id: 'camera', group: 'Immersion', label: 'Camera travel', type: 'camera-key', colour: 'camera' },
  { id: 'point-field', group: 'Story motion', label: 'Permanent corridor', type: 'point-field-key', colour: 'world' },
]);
const ADVANCED_POINT_FIELD_TRACKS = Object.freeze([
  { id: 'text', group: 'Story', label: 'Text spine', type: 'text-field', colour: 'text', master: true },
  { id: 'camera', group: 'Camera', label: 'Move', type: 'camera-key', colour: 'camera' },
  { id: 'camera-orientation', group: 'Camera', label: 'Look', type: 'camera-orientation-key', colour: 'camera' },
  { id: 'camera-lens', group: 'Camera', label: 'Lens', type: 'camera-lens-key', colour: 'camera' },
  // Form geometry, its story interval, and every Effect inside that interval
  // are one authoring sequence. The runtime storage stays normalized, while
  // the editor presents the linked material as one lane and one inspector.
  { id: 'point-field', group: 'Visuals', label: 'Forms + effects', type: 'point-field-key', colour: 'world' },
]);
const V2_ADVANCED_POINT_FIELD_TRACKS = Object.freeze([
  { id: 'text', group: 'Story', label: 'Text spine', type: 'text-field', colour: 'text', master: true },
  { id: 'camera', group: 'Immersion', label: 'Move', type: 'camera-key', colour: 'camera' },
  { id: 'camera-orientation', group: 'Immersion', label: 'Look', type: 'camera-orientation-key', colour: 'camera' },
  { id: 'point-field', group: 'Story motion', label: 'Corridor + effect', type: 'point-field-key', colour: 'world' },
]);
const TRACK_BY_ID = Object.freeze(Object.fromEntries(
  [...LEGACY_TRACKS, ...ADVANCED_POINT_FIELD_TRACKS, ...DIRECTOR_TRACKS]
    .map((track) => [track.id, track]),
));
const POINT_FIELD_SELECTION_TYPES = new Set([
  'point-field-key',
  'point-field-segment',
  'point-field-state',
]);
const CAMERA_SELECTION_TYPES = new Set(['camera-key', 'camera-orientation-key', 'camera-lens-key']);
const MIN_TIMELINE_WIDTH = 520;
const BASE_PIXELS_PER_WU = 66;
const TEXT_CONNECTION_EPSILON_WU = 0.0001;
const GRID_RIPPLE_START_STEP_WU = 0.05;
const MAGNETIC_SNAP_DISTANCE_PX = 8;
const CAMERA_BEAT_LABELS = Object.freeze({
  'move-material-establish': 'Outside the material',
  'move-material-interior': 'Enter the interior',
  'move-material-passage': 'Find structure',
  'move-material-passage-deep': 'Travel the passage',
  'move-material-world': 'Become the world',
  'move-material-final': 'Keep turning',
  'move-orb-establish': 'Establish seed',
  'move-field-flight-start': 'Enter the field',
  'move-complexity-exit': 'Leave the nebula',
  'move-grid-flight-start': 'Meet the floor',
  'move-grid-flight-descend': 'Lower to the grid',
  'move-grid-flight-approach': 'Approach the centre',
  'move-bust-orbit-start': 'Begin orbit',
  'move-ride-threshold': 'Opening signal',
  'move-ride-material-yard': 'Enter the hoops',
  'move-ride-hoops': 'Follow the curve',
  'move-ride-archive': 'Pass the yard',
  'move-ride-question-drop': 'Approach the loop',
  'move-ride-interchange': 'Enter the roll',
  'move-ride-workshops': 'Climb through gates',
  'move-ride-assembly-hall': 'Complete the loop',
  'move-ride-pressure-wall': 'Ignite the system',
  'move-ride-transfer-bridge': 'Release into life',
  'move-ride-city': 'Cross the living field',
  'move-ride-terminal': 'Reveal the portrait',
  'move-ride-beyond': 'Arrive',
});
const V2_LONG_RIDE_STAGES = Object.freeze([
  Object.freeze({ id: 'signal', label: 'Opening signal', description: 'A single point in the fog' }),
  Object.freeze({ id: 'hoops', label: 'Round hoop curve', description: 'Centred apertures bend left' }),
  Object.freeze({ id: 'yard', label: 'Pass-by yard', description: 'Landmarks move past the rail' }),
  Object.freeze({ id: 'loop', label: 'Long gate loop', description: 'Camera and square gates roll together' }),
  Object.freeze({ id: 'ignition', label: 'System ignition', description: 'Ordered structures switch on' }),
  Object.freeze({ id: 'living', label: 'Living field', description: 'The environment begins to oscillate' }),
  Object.freeze({ id: 'reveal', label: 'Open approach', description: 'Noise falls away before the finish' }),
  Object.freeze({ id: 'terminal', label: 'Portrait arrival', description: 'The bust resolves from the fog' }),
]);
const DIRECTOR_STAGE_LABELS = Object.freeze({
  'world-promise': 'Condensed seed',
  'world-complexity': 'Reading nebula',
  'world-grid': 'Ripple floor',
  'world-emergent': 'Emerging bust',
});
const DIRECTOR_EFFECT_LABELS = Object.freeze({
  'effect-world-promise-swarm-life': 'Gather',
  'effect-world-complexity-swarm-life': 'Flow',
  'effect-world-grid-ambient-drift': 'Settle',
  'interaction-grid-ripple': 'Finale handoff',
  'effect-world-emergent-bust-assembly': 'Assemble',
});

function titleCase(value) {
  return String(value || '').replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase());
}

function collectTimelineSnapTargets(document) {
  const values = [];
  const add = (value) => {
    const next = Number(value);
    if (Number.isFinite(next)) values.push(next);
  };
  const camera = document?.tracks?.camera || {};
  [camera.moveKeys, camera.lookKeys, camera.lensKeys].forEach((keys) => (
    (keys || []).forEach((key) => add(key.atWU))
  ));
  add(camera.orbit?.startWU);
  add(camera.orbit?.endWU);
  (document?.tracks?.visibility?.keys || []).forEach((key) => add(key.atWU));
  (document?.tracks?.pointField?.keys || []).forEach((key) => add(key.atWU));
  (document?.tracks?.text?.fields || []).forEach((field) => {
    add(field.startWU);
    add(field.focusWU);
    add(field.endWU);
  });
  (document?.tracks?.interactions?.clips || []).forEach((clip) => {
    add(clip.startWU);
    add(clip.activationWU);
    add(clip.endWU);
  });
  return [...new Set(values.map((value) => Number(value.toFixed(3))))]
    .sort((left, right) => left - right);
}

function resolveMagneticTimelineSnap({
  startWU,
  endWU,
  deltaWU,
  targets,
  pixelsPerWU,
  disabled = false,
}) {
  const rawDeltaWU = Number(deltaWU);
  if (disabled || !Number.isFinite(rawDeltaWU)) return { deltaWU: rawDeltaWU, atWU: null };
  const thresholdWU = MAGNETIC_SNAP_DISTANCE_PX / Math.max(1, Number(pixelsPerWU));
  let closest = null;
  [Number(startWU), Number(endWU)].filter(Number.isFinite).forEach((edgeWU) => {
    const requestedWU = edgeWU + rawDeltaWU;
    targets.forEach((targetWU) => {
      const distanceWU = Number(targetWU) - requestedWU;
      if (Math.abs(distanceWU) > thresholdWU) return;
      if (!closest || Math.abs(distanceWU) < Math.abs(closest.distanceWU)) {
        closest = { atWU: Number(targetWU), distanceWU };
      }
    });
  });
  return closest
    ? { deltaWU: rawDeltaWU + closest.distanceWU, atWU: closest.atWU }
    : { deltaWU: rawDeltaWU, atWU: null };
}
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
const CAMERA_EASING_PRESETS = Object.freeze([
  Object.freeze({ label: 'Balanced', incoming: 0.35, outgoing: 0.35 }),
  Object.freeze({ label: 'Cinematic', incoming: 0.82, outgoing: 0.32 }),
  Object.freeze({ label: 'Measured', incoming: 0.48, outgoing: 0.48 }),
]);
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
const CAMERA_ROLL_OFFSET_CONTROL = ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS.find(
  (control) => control.id === 'rollOffset',
);
const POINT_MATERIAL_CONTROLS = Object.freeze(
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
  if (selection?.type === 'camera-orientation-key') return 'camera-orientation';
  if (selection?.type === 'camera-lens-key') return 'camera-lens';
  if (selection?.type === 'visibility-key') return 'visibility';
  if (selection?.type === 'world') return 'world';
  if (selection?.type === 'text-field') return 'text';
  if (selection?.type === 'interaction') return pointFieldV6 ? 'point-field' : 'interaction';
  if (POINT_FIELD_SELECTION_TYPES.has(selection?.type)) return pointFieldV6 ? 'point-field' : 'world';
  return pointFieldV6 ? 'text' : 'world';
}

function getDirectorSelectionTrackId(selection) {
  const trackId = getSelectionTrackId(selection, true);
  if (['camera', 'camera-orientation', 'camera-lens'].includes(trackId)) return 'camera';
  if (trackId === 'point-field' || selection?.type === 'interaction') return 'point-field';
  return 'text';
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

function getTrackItems(document, trackId) {
  if (trackId === 'camera') return document.tracks.camera.moveKeys || document.tracks.camera.keys;
  if (trackId === 'camera-orientation') return document.tracks.camera.lookKeys || document.tracks.camera.orientationKeys || [];
  if (trackId === 'camera-lens') return document.tracks.camera.lensKeys || [];
  if (trackId === 'visibility') return document.tracks.visibility.keys;
  if (trackId === 'world') return document.tracks.worlds?.objects || [];
  if (trackId === 'point-field') return [];
  if (trackId === 'text') return document.tracks.text.fields;
  return document.tracks.interactions.clips;
}

function getObjectLabel(object, type) {
  if (type === 'camera-key') return object.id.replace(/^camera-/, '') || 'Camera key';
  if (type === 'camera-orientation-key') return object.id.replace(/^camera-/, '') || 'Camera tilt key';
  if (type === 'camera-lens-key') return object.id.replace(/^camera-/, '') || 'Camera lens key';
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
  return object.text || object.id;
}

function getObjectStart(object, type) {
  return Number(['camera-key', 'camera-orientation-key', 'camera-lens-key', 'visibility-key'].includes(type) ? object.atWU : object.startWU);
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
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            event.currentTarget.value = String(value);
            event.currentTarget.blur();
          }
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

/**
 * Animation timing is always expressed relative to immutable Text moments.
 * The timeline may move the animation, but that gesture updates this binding
 * rather than changing the editorial spine or leaving a loose absolute time.
 */
function MomentBindingFields({
  document,
  store,
  selection,
  selectionAfter = selection,
  bindingKey = 'trigger',
  disabled = false,
  label = 'Moment trigger',
}) {
  const target = getAboutNarrativeMomentTarget(document, selection)?.object;
  const trigger = target?.[bindingKey];
  const moments = getAboutNarrativeStoryMoments(document);
  const storyLayout = useMemo(
    () => compileAboutNarrativeStoryLayout(document, { profileId: 'desktop' }),
    [document],
  );
  if (!target || !trigger || !moments.length) return null;
  const gapAnchor = trigger.anchorType === 'gap' || Boolean(trigger.gapId);
  const resolvedWU = resolveAboutNarrativeMomentTriggerWU(
    document,
    trigger,
    { storyLayout },
  );
  const momentLabelById = new Map(moments.map((moment) => [moment.id, moment.label]));

  const commitBinding = (patch) => store.commit(`Bind ${label}`, (draft) => {
    const draftTarget = getAboutNarrativeMomentTarget(draft, selection)?.object;
    if (!draftTarget) return;
    setAboutNarrativeMomentTrigger(draft, selection, {
      ...draftTarget[bindingKey],
      ...patch,
    }, { bindingKey, storyLayout });
  }, { selectionAfter, requireValid: true });

  return (
    <section className="about-director-moment-binding" data-moment-binding={bindingKey}>
      <header>
        <strong>{label}</strong>
        <small>Bound to Story · {bindingKey === 'endTrigger' ? 'ends' : 'fires'} at {Number(
          resolvedWU ?? (bindingKey === 'endTrigger'
            ? target.endWU
            : target.activationWU ?? target.startWU ?? target.atWU),
        ).toFixed(2)} WU</small>
      </header>
      <div className="about-director-moment-binding__fields">
        {gapAnchor ? (
          <>
            <SelectField
              label="Story gap"
              value={trigger.gapId}
              disabled={disabled}
              options={storyLayout.gaps.map((gap) => ({
                value: gap.id,
                label: `${momentLabelById.get(gap.fromFieldId)} → ${momentLabelById.get(gap.toFieldId)}`,
              }))}
              onCommit={(gapId) => commitBinding({ gapId })}
            />
            <NumberField
              label="Position in gap"
              value={trigger.progress}
              disabled={disabled}
              step={0.05}
              min={0}
              max={1}
              onCommit={(progress) => commitBinding({ progress })}
            />
          </>
        ) : (
          <>
            <SelectField
              label="Text moment"
              value={trigger.momentId}
              disabled={disabled}
              options={moments.map((moment) => ({ value: moment.id, label: moment.label }))}
              onCommit={(momentId) => commitBinding({ momentId })}
            />
            <SelectField
              label="Moment phase"
              value={trigger.phase}
              disabled={disabled}
              options={ABOUT_NARRATIVE_MOMENT_PHASES.map((phase) => ({ value: phase.id, label: phase.label }))}
              onCommit={(phase) => commitBinding({ phase })}
            />
          </>
        )}
        <NumberField
          label="Fine offset"
          value={trigger.offsetWU}
          disabled={disabled}
          step={0.01}
          min={-3}
          max={3}
          onCommit={(offsetWU) => commitBinding({ offsetWU })}
        />
      </div>
      <p>{gapAnchor
        ? 'This event stays inside the intentional transition gap, even when copy above it reflows.'
        : 'Text moments are derived from content. Change the phase or offset to position this animation around the editorial rhythm.'}</p>
    </section>
  );
}

function CameraEasingHandleField({
  direction,
  handle,
  onBegin,
  onPreview,
  onFinish,
  onCancel,
  onCommit,
}) {
  const gestureRef = useRef(false);
  const incoming = direction === 'incoming';
  const label = incoming ? 'Ease into keyframe' : 'Ease out of keyframe';
  if (!handle) {
    return (
      <section
        className="about-track-editor-camera-curve is-unavailable"
        data-camera-easing-side={direction}
        data-camera-easing-available="false"
        aria-label={label}
      >
        <div className="about-track-editor-camera-curve__heading">
          <div><span>{label}</span><strong>{incoming ? 'Story start' : 'Story end'}</strong></div>
        </div>
        <p>{incoming
          ? 'The first camera has no incoming move.'
          : 'The final camera has no outgoing move.'}</p>
      </section>
    );
  }

  const { curve } = handle;
  const strength = clamp(
    handle.strength,
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN,
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX,
  );
  const commitStrength = (value) => onCommit?.(clamp(
    value,
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN,
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX,
  ));
  const previewStrength = (value) => onPreview?.(clamp(
    value,
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN,
    ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX,
  ));
  const updateHandle = (event) => {
    const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect()
      || event.currentTarget.getBoundingClientRect();
    const progress = clamp((event.clientX - bounds.left) / Math.max(1, bounds.width), 0, 1);
    previewStrength(incoming ? 1 - progress : progress);
  };
  const begin = (event) => {
    gestureRef.current = onBegin?.(direction) !== false;
    if (!gestureRef.current) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    updateHandle(event);
  };
  const finish = () => {
    if (!gestureRef.current) return;
    gestureRef.current = false;
    onFinish?.();
  };
  const keyAdjust = (event) => {
    const keyDirection = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!keyDirection && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = event.key === 'Home' ? ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN
      : event.key === 'End' ? ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX
        : strength + (keyDirection * 0.01);
    commitStrength(next);
  };
  const handleX = (incoming ? curve.x2 : curve.x1) * 200;
  const handleY = incoming ? 0 : 100;
  const contextHandleX = (incoming ? curve.x1 : curve.x2) * 200;
  const contextHandleY = incoming ? 100 : 0;
  const connectedLabel = incoming
    ? `From ${getObjectLabel(handle.fromKey, 'camera-key')}`
    : `To ${getObjectLabel(handle.toKey, 'camera-key')}`;

  return (
    <section
      className="about-track-editor-camera-curve"
      data-camera-easing-side={direction}
      data-camera-easing-available="true"
      data-camera-easing-segment={handle.ownerKey.id}
      aria-label={label}
    >
      <div className="about-track-editor-camera-curve__heading">
        <div><span>{label}</span><strong title={connectedLabel}>{connectedLabel}</strong></div>
        <code>{handle.easing}</code>
      </div>
      <p>{incoming
        ? 'Higher values make the arrival into this camera longer and softer.'
        : 'Higher values make the departure from this camera longer and softer.'}</p>
      <svg
        className="about-track-editor-camera-curve__graph"
        viewBox="0 0 200 100"
        role="img"
        aria-label={`${label} cubic-bezier graph`}
      >
        <path className="about-track-editor-camera-curve__grid" d="M 0 50 H 200 M 100 0 V 100" />
        <path className="about-track-editor-camera-curve__curve" d={`M 0 100 C ${curve.x1 * 200} 100, ${curve.x2 * 200} 0, 200 0`} />
        <path className="about-track-editor-camera-curve__handle-line" d={`M 0 100 L ${curve.x1 * 200} 100 M 200 0 L ${curve.x2 * 200} 0`} />
        <circle className="about-track-editor-camera-curve__anchor" cx="0" cy="100" r="3" />
        <circle className="about-track-editor-camera-curve__anchor" cx="200" cy="0" r="3" />
        <circle
          className="about-track-editor-camera-curve__handle is-context"
          cx={contextHandleX}
          cy={contextHandleY}
          r="5"
          aria-hidden="true"
        />
        <circle
          className="about-track-editor-camera-curve__handle"
          cx={handleX}
          cy={handleY}
          r="6"
          tabIndex={0}
          role="slider"
          aria-label={`${label} strength`}
          aria-valuemin={ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN}
          aria-valuemax={ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX}
          aria-valuenow={Number(strength.toFixed(2))}
          onPointerDown={begin}
          onPointerMove={(event) => { if (gestureRef.current) updateHandle(event); }}
          onPointerUp={finish}
          onPointerCancel={() => { gestureRef.current = false; onCancel?.(); }}
          onKeyDown={keyAdjust}
        />
      </svg>
      <div className="about-track-editor-camera-curve__inputs">
        <NumberField
          label={incoming ? 'Ease-in strength' : 'Ease-out strength'}
          value={Number(strength.toFixed(2))}
          min={ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MIN}
          max={ABOUT_NARRATIVE_CAMERA_EASING_STRENGTH_MAX}
          step={0.01}
          onCommit={commitStrength}
        />
      </div>
    </section>
  );
}

function CameraKeyframeEasingField({
  context,
  description = 'Each control belongs to this camera keyframe. Position, rotation, focus, and lens use the same easing.',
  onBegin,
  onPreview,
  onFinish,
  onCancel,
  onCommit,
  onPreset,
}) {
  const availableDirections = ['incoming', 'outgoing'].filter((direction) => context?.[direction]);
  return (
    <section className="about-track-editor-camera-easing" aria-label="Selected camera keyframe easing">
      <div className="about-track-editor-camera-easing__heading">
        <span>Selected camera easing</span>
        <strong>Arrival + departure</strong>
      </div>
      <p>{description}</p>
      <div className="about-track-editor-camera-easing__sides">
        {['incoming', 'outgoing'].map((direction) => (
          <CameraEasingHandleField
            key={direction}
            direction={direction}
            handle={context?.[direction] || null}
            onBegin={onBegin}
            onPreview={(value) => onPreview?.(direction, value)}
            onFinish={onFinish}
            onCancel={onCancel}
            onCommit={(value) => onCommit?.(direction, value)}
          />
        ))}
      </div>
      <div className="about-track-editor-camera-curve__presets" aria-label="Camera keyframe easing presets">
        {CAMERA_EASING_PRESETS.map((preset) => {
          const active = availableDirections.length > 0 && availableDirections.every((direction) => (
            Math.abs(context[direction].strength - preset[direction]) < 0.01
          ));
          return (
            <button
              key={preset.label}
              type="button"
              className={active ? 'is-active' : ''}
              onClick={() => onPreset?.(preset)}
            >{preset.label}</button>
          );
        })}
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
  precisionWindow = null,
  rangeKey = ariaLabel,
}) {
  const gestureRef = useRef(false);
  const normalizedValue = normalizeControlValue(value, control);
  const [precisionRange, setPrecisionRange] = useState({ key: rangeKey, center: normalizedValue });
  const [fineMode, setFineMode] = useState(Boolean(precisionWindow));
  const precisionCenter = precisionRange.key === rangeKey
    ? precisionRange.center
    : normalizedValue;
  const fineWindow = Math.max(Number(control.step), Number(precisionWindow) || 0);
  const fineMin = Math.max(Number(control.min), precisionCenter - fineWindow);
  const fineMax = Math.min(Number(control.max), precisionCenter + fineWindow);
  const sliderMin = fineMode && fineWindow > 0 ? fineMin : Number(control.min);
  const sliderMax = fineMode && fineWindow > 0 ? fineMax : Number(control.max);
  const span = sliderMax - sliderMin;
  const progress = span > 0
    ? ((normalizedValue - sliderMin) / span) * 100
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
        <span className="about-track-editor-parameter__range">
          <small>{fineMode && fineWindow > 0
            ? `${Number(fineMin.toFixed(getControlPrecision(control.step)))}–${Number(fineMax.toFixed(getControlPrecision(control.step)))}`
            : `${control.min}–${control.max}`}</small>
          {fineWindow > 0 ? (
            <button
              type="button"
              className={fineMode ? 'is-active' : ''}
              aria-pressed={fineMode}
              title={fineMode ? 'Use the full parameter range' : 'Use a precision range around the current value'}
              onClick={() => {
                setPrecisionRange({ key: rangeKey, center: normalizedValue });
                setFineMode((current) => !current);
              }}
            >{fineMode ? 'Fine' : 'Full'}</button>
          ) : null}
        </span>
      </div>
      <div className="about-track-editor-parameter__controls">
        <input
          className="about-track-editor-parameter__slider"
          aria-label={`${ariaLabel} slider`}
          type="range"
          min={sliderMin}
          max={sliderMax}
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
  shapeDefinition?.parameters.filter((control) => !control.derived).forEach((control) => {
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
        count={object.id === 'world-promise' ? 22 : 17}
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
          {object.id === 'world-promise' ? (
            <>
              <NumberField label="Narrow mobile width" value={object.transform.mobileNarrowWidth ?? 390} disabled={locked} step={1} min={1} onCommit={(value) => commit('Edit opening mobile envelope', (target) => { target.transform.mobileNarrowWidth = value; })} />
              <NumberField label="Wide mobile width" value={object.transform.mobileWideWidth ?? 768} disabled={locked} step={1} min={1} onCommit={(value) => commit('Edit opening mobile envelope', (target) => { target.transform.mobileWideWidth = value; })} />
              <NumberField label="Narrow mobile scale" value={object.transform.mobileNarrowScale ?? object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit opening mobile envelope', (target) => { target.transform.mobileNarrowScale = value; })} />
              <NumberField label="Narrow mobile Y offset" value={object.transform.mobileNarrowYOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit opening mobile envelope', (target) => { target.transform.mobileNarrowYOffset = value; })} />
              <NumberField label="Narrow mobile density" value={object.transform.mobileNarrowDensity ?? object.shapeParameters?.density ?? 1} disabled={locked} step={0.01} min={0} max={1} onCommit={(value) => commit('Edit opening mobile envelope', (target) => { target.transform.mobileNarrowDensity = value; })} />
            </>
          ) : null}
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

function getBoundedCameraTrackControl(control, camera = {}) {
  if (control.id === 'distanceFogStartWU') {
    return {
      ...control,
      max: Math.max(control.min, Number(camera.distanceFogEndWU) - control.step),
    };
  }
  if (control.id === 'distanceFogEndWU') {
    return {
      ...control,
      min: Math.min(control.max, Number(camera.distanceFogStartWU) + control.step),
    };
  }
  return control;
}

function CameraTrackInspector({ snapshot, store }) {
  const selection = { type: 'track', id: 'camera' };
  const camera = snapshot.document.globals.camera;
  const cameraTrack = snapshot.document.tracks.camera;
  const orbit = cameraTrack.orbit;
  const formStates = snapshot.document.tracks.pointField?.stateDefinitions || [];
  const getCameraValue = (id) => {
    if (camera[id] != null) return camera[id];
    return 0;
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
  // This is an intentional reset recipe, not a second source of truth. Keep it
  // aligned with the authored camera track when the overall story arc changes.
  const applyFluidFieldFlight = () => store.commit('Apply continuous field flight', (draft) => {
    draft.tracks.camera.moveKeys = [
      { id: 'move-orb-establish', atWU: 0, position: [0, 0.98, 5.9], easing: 'cubic-bezier(0.55, 0, 0.75, 1)', velocityMode: 'eased', locked: false },
      { id: 'move-field-flight-start', atWU: 0.8, position: [0, 1, 4.7], easing: 'linear', velocityMode: 'fluid', locked: false },
      { id: 'move-complexity-exit', atWU: 8.4, position: [0, 1, -6.7], easing: 'linear', velocityMode: 'fluid', locked: false },
      { id: 'move-grid-flight-start', atWU: 12.4, position: [0, 4.98, -12.7], easing: 'linear', velocityMode: 'fluid', locked: false },
      { id: 'move-grid-flight-descend', atWU: 14.2, position: [0, 3.78, -15.4], easing: 'linear', velocityMode: 'fluid', locked: false },
      { id: 'move-grid-flight-approach', atWU: 16.1, position: [0, 2.03, -18.25], easing: 'linear', velocityMode: 'fluid', locked: false },
      { id: 'move-bust-orbit-start', atWU: 17.2, position: [0, 1.52, -19.08], easing: 'linear', velocityMode: 'fluid', locked: false },
    ];
    draft.tracks.camera.lookKeys = [
      { id: 'look-orb-establish', atWU: 0, rotation: [0, 0, 0], easing: 'cubic-bezier(0.55, 0, 0.75, 1)', locked: false },
      { id: 'look-field-flight-start', atWU: 0.8, rotation: [0, 0, 0], easing: 'linear', locked: false },
      { id: 'look-complexity-exit', atWU: 8.4, rotation: [0, 0, 0], easing: 'linear', locked: false },
      { id: 'look-grid-flight-start', atWU: 12.4, rotation: [-10, 0, 0], easing: 'smoothstep', locked: false },
      { id: 'look-grid-flight-descend', atWU: 14.2, rotation: [-16, 0, 0], easing: 'smoothstep', locked: false },
      { id: 'look-grid-flight-approach', atWU: 16.1, rotation: [-12, 0, 0], easing: 'smoothstep', locked: false },
      { id: 'look-bust-orbit-start', atWU: 17.2, rotation: [-7.2, 0, 0], easing: 'smoothstep', locked: false },
    ];
    draft.tracks.camera.lensKeys = [
      { id: 'lens-orb-establish', atWU: 0, fov: 46, easing: 'cubic-bezier(0.55, 0, 0.75, 1)', locked: false },
      { id: 'lens-field-flight-start', atWU: 0.8, fov: 48, easing: 'linear', locked: false },
      { id: 'lens-grid-flight-start', atWU: 12.4, fov: 52, easing: 'smoothstep', locked: false },
      { id: 'lens-bust-orbit-start', atWU: 17.2, fov: 50, easing: 'linear', locked: false },
    ];
    draft.tracks.camera.orbit = {
      id: 'orbit-bust-finale',
      startWU: 17.2,
      endWU: 22,
      targetStateId: 'world-emergent',
      arcDegrees: 360,
      easing: 'smoothstep',
    };
    // Recipes choose useful starting beats, then immediately convert those
    // beats into durable Text-moment bindings before the edit is validated.
    getAboutNarrativeMomentTargets(draft).forEach((entry) => {
      refreshAboutNarrativeMomentTriggers(draft, { type: entry.type, id: entry.id });
    });
  }, { selectionAfter: selection, requireValid: true });

  const commitOrbit = (label, mutate) => store.commit(label, (draft) => {
    if (!draft.tracks.camera.orbit) return;
    mutate(draft.tracks.camera.orbit, draft.tracks.camera);
  }, { selectionAfter: selection, requireValid: true });

  return (
    <div className="about-track-editor-inspector__content" data-track-settings="camera">
      <header>
        <span>Track settings</span>
        <h2>Global camera</h2>
        <code>globals.camera</code>
      </header>
      <div className="about-track-editor-world-folders about-track-editor-global-folders">
        <p className="about-track-editor-parameter-note">
          Move stays fluid while the points are visible. The final orbit owns the camera position and keeps Look aimed at its Form.
        </p>
        <section className="about-director-recipe">
          <div><strong>Continuous field flight</strong><small>Fly through the deep field, settle onto the floor, then complete one target-locked bust orbit.</small></div>
          <button type="button" onClick={applyFluidFieldFlight}>Apply recipe</button>
        </section>
        {orbit ? (
          <section className="about-director-camera-orbit" aria-label="Final camera orbit">
            <header>
              <strong>Final orbit</strong>
              <small>Camera circles the selected Form once and always looks at its anchor.</small>
            </header>
            <div className="about-track-editor-shape-controls">
              <MomentBindingFields
                document={snapshot.document}
                store={store}
                selection={{ type: 'camera-orbit', id: orbit.id }}
                label="Orbit begins"
              />
              <MomentBindingFields
                document={snapshot.document}
                store={store}
                selection={{ type: 'camera-orbit', id: orbit.id }}
                bindingKey="endTrigger"
                label="Orbit completes"
              />
              <NumberField
                label="Arc °"
                value={orbit.arcDegrees}
                step={1}
                min={-360}
                max={360}
                onCommit={(value) => commitOrbit('Edit final orbit arc', (target) => { target.arcDegrees = value; })}
              />
              <SelectField
                label="Orbit easing"
                value={orbit.easing || 'smoothstep'}
                options={ABOUT_NARRATIVE_CAMERA_EASINGS.map((value) => ({ value, label: value }))}
                onCommit={(value) => commitOrbit('Edit final orbit easing', (target) => { target.easing = value; })}
              />
              <label className="about-track-editor-field">
                <span>Target Form</span>
                <select
                  value={orbit.targetStateId}
                  onChange={(event) => commitOrbit('Retarget final orbit', (target) => { target.targetStateId = event.target.value; })}
                >
                  {formStates.map((state) => <option key={state.id} value={state.id}>{state.label || state.id}</option>)}
                </select>
              </label>
            </div>
          </section>
        ) : null}
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
                  const control = getBoundedCameraTrackControl(sourceControl, camera);
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

function PointMaterialTrackInspector({ experienceVersion = 'v1', snapshot, store }) {
  const selection = { type: 'track', id: 'material' };
  const pointMaterial = snapshot.document.globals.pointMaterial;
  const visibleControls = experienceVersion === 'v2'
    ? POINT_MATERIAL_CONTROLS.filter((control) => ['opacity', 'pointSize'].includes(control.id))
    : POINT_MATERIAL_CONTROLS;
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
    <div className="about-track-editor-inspector__content" data-track-settings="material">
      <header>
        <span>Visual settings</span>
        <h2>{experienceVersion === 'v2' ? 'Point material' : 'Point material and pointer pressure'}</h2>
        <code>globals.pointMaterial</code>
      </header>
      <div className="about-track-editor-world-folders about-track-editor-global-folders">
        <p className="about-track-editor-parameter-note">
          {experienceVersion === 'v2'
            ? 'Point material is global and has no timing of its own. The Story Stack sets the shared ride distance and the three local activation windows.'
            : 'Point material and mouse pressure are global and have no timing of their own. They apply live while Text moments own the timing of Forms and Effects.'}
        </p>
        <InspectorFolder group={{ id: 'point-material', label: experienceVersion === 'v2' ? 'Point material' : 'Point material and pointer pressure' }} count={visibleControls.length} defaultOpen>
          <div className="about-track-editor-shape-controls">
            {visibleControls.map((control) => (
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
        <h2>Global text</h2>
        <code>globals</code>
      </header>
      <div className="about-track-editor-world-folders about-track-editor-global-folders">
        <p className="about-track-editor-parameter-note">
          Text is the fixed Story spine. Its order and timing define scroll rhythm and page length. Edit copy here; adjust Camera, Forms, and Effects around its moments.
        </p>
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

function StructuredDisciplineItemsEditor({ items = [], path, diagnostics, disabled, onChange }) {
  return (
    <section className="about-director-structured-section" aria-label="Discipline items">
      <header><strong>Disciplines</strong><span>{items.length}</span></header>
      {items.map((item, index) => {
        const normalizedItem = typeof item === 'string'
          ? { id: `discipline-${index + 1}`, label: item, description: '' }
          : item;
        const itemPath = `${path}.${index}`;
        const update = (field, value) => onChange(
          updateDirectorArrayItem(items, index, () => ({ ...normalizedItem, [field]: value })),
          `Edit discipline ${field}`,
        );
        return (
          <article className="about-director-structured-item" key={`${normalizedItem.id}-${index}`}>
            <DirectorStructuredField
              label={`Discipline ${index + 1}`}
              value={normalizedItem.label}
              path={`${itemPath}.label`}
              error={getDirectorFieldError(diagnostics, `${itemPath}.label`)}
              disabled={disabled}
              onCommit={(value) => update('label', value)}
            />
            <DirectorStructuredField
              label="Description"
              value={normalizedItem.description}
              path={`${itemPath}.description`}
              error={getDirectorFieldError(diagnostics, `${itemPath}.description`)}
              disabled={disabled}
              multiline
              onCommit={(value) => update('description', value)}
            />
            <DirectorItemActions
              index={index}
              count={items.length}
              disabled={disabled}
              noun="discipline"
              removalDisabled={items.length === 1}
              onMove={(direction) => onChange(moveDirectorArrayItem(items, index, direction), 'Reorder disciplines')}
              onDuplicate={() => onChange(duplicateDirectorArrayItem(items, index, { idKey: 'id' }), 'Duplicate discipline')}
              onRemove={() => onChange(removeDirectorArrayItem(items, index), 'Remove discipline')}
            />
          </article>
        );
      })}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange([
          ...items,
          { id: `discipline-${items.length + 1}`, label: 'New discipline', description: 'Describe this discipline.' },
        ], 'Add discipline')}
      >Add discipline</button>
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
  snapTargets = [],
  onSnap = null,
}) {
  const pointerRef = useRef(null);
  const resizeRef = useRef(null);
  const range = getAboutNarrativeTrackObjectRange(document, { type: track.type, id: object.id });
  const startWU = range?.startWU ?? getObjectStart(object, track.type);
  const endWU = range?.endWU ?? startWU;
  const locked = !CAMERA_SELECTION_TYPES.has(track.type)
    && (object.locked === true || object.protected === true);
  const momentBound = Number(document.schemaVersion) >= 7
    && track.type !== 'text-field'
    && Boolean(object.trigger?.momentId);
  const fixedTextSpine = Number(document.schemaVersion) >= 7 && track.type === 'text-field';
  const timingMovable = !locked && !fixedTextSpine;
  const pointLike = ['camera-key', 'camera-orientation-key', 'camera-lens-key', 'visibility-key'].includes(track.type);
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
  const durationEdges = timingMovable && (track.type === 'interaction'
    || (track.type === 'text-field' && object.kind !== 'title'))
    ? ['start', 'end']
    : canResizeWorld ? ['end'] : [];
  const activationPercent = track.type === 'interaction' && endWU > startWU
    ? clamp(((Number(object.activationWU) - startWU) / (endWU - startWU)) * 100, 0, 100)
    : null;
  const boundMoment = object.trigger?.momentId
    ? getAboutNarrativeStoryMoments(document).find((moment) => moment.id === object.trigger.momentId)
    : null;
  const bindingTitle = boundMoment
    ? `${boundMoment.label} · ${object.trigger.phase} ${Number(object.trigger.offsetWU) >= 0 ? '+' : ''}${Number(object.trigger.offsetWU).toFixed(2)} WU`
    : null;

  const selectObject = () => {
    store.setSelection({ type: track.type, id: object.id });
    store.setTransport({ owner: 'timeline', playing: false, storyWU: getObjectStart(object, track.type) });
  };

  const beginDrag = (event) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    selectObject();
    if (!timingMovable) return;
    if (!store.beginGesture(`Move ${track.label}`, {
      selection: { type: track.type, id: object.id },
    })) return;
    pointerRef.current = { pointerId: event.pointerId, startX: event.clientX };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateDrag = (event) => {
    if (pointerRef.current?.pointerId !== event.pointerId) return;
    const snap = resolveMagneticTimelineSnap({
      startWU,
      endWU,
      deltaWU: (event.clientX - pointerRef.current.startX) / pixelsPerWU,
      targets: snapTargets,
      pixelsPerWU,
      disabled: event.altKey,
    });
    onSnap?.(snap.atWU);
    store.updateGestureMove(snap.deltaWU);
  };

  const finishDrag = (event, cancel = false) => {
    if (pointerRef.current?.pointerId !== event.pointerId) return;
    pointerRef.current = null;
    onSnap?.(null);
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
    const edgeWU = resizeRef.current[`${edge}WU`];
    const snap = resolveMagneticTimelineSnap({
      startWU: edgeWU,
      endWU: edgeWU,
      deltaWU: (event.clientX - resizeRef.current.startX) / pixelsPerWU,
      targets: snapTargets,
      pixelsPerWU,
      disabled: event.altKey,
    });
    const nextWU = edgeWU + snap.deltaWU;
    onSnap?.(snap.atWU);
    if (track.type === 'world') store.updateGestureResizeWorldEnd(object.id, nextWU);
    else if (track.type === 'text-field') store.updateGestureResizeText(object.id, edge, nextWU);
    else if (track.type === 'interaction') store.updateGestureResizeInteraction(object.id, edge, nextWU);
  };

  const finishDurationResize = (event, cancel = false) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    event.stopPropagation();
    resizeRef.current = null;
    onSnap?.(null);
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
      className={`about-track-editor-object is-${track.colour}${pointLike ? ' is-point' : ''}${durationEdges.includes('start') ? ' has-resize-start' : ''}${durationEdges.includes('end') ? ' has-resize-end' : ''}`}
      style={{ left, width }}
    >
      <button
        type="button"
      className={`about-track-editor-clip is-${track.colour}${selected ? ' is-selected' : ''}${boundMoment ? ' is-moment-bound' : ''}${fixedTextSpine ? ' is-text-spine-fixed' : ''}${locked ? ' is-locked' : ''}${object.kind === 'stub' ? ' is-draft' : ''}${connectedBefore ? ' is-connected-before' : ''}${connectedAfter ? ' is-connected-after' : ''}`}
        data-track-object-type={track.type}
        data-track-object-id={object.id}
        data-moment-id={object.trigger?.momentId}
        data-text-kind={track.type === 'text-field' ? object.kind : undefined}
      data-motion-type={track.type === 'interaction' ? object.type : undefined}
      data-timing-owner={fixedTextSpine ? 'text-spine' : undefined}
      data-moment-bound={momentBound ? 'true' : undefined}
      aria-label={`${track.label}: ${getObjectLabel(object, track.type)} at ${getObjectStart(object, track.type).toFixed(3)} WU${locked ? ', protected' : ''}${fixedTextSpine ? ', fixed editorial timing' : ''}${momentBound ? ', adjustable and bound to a fixed Text moment' : ''}`}
      title={`${getObjectLabel(object, track.type)} · ${startWU.toFixed(3)}–${endWU.toFixed(3)} WU${bindingTitle ? ` · ${bindingTitle}` : ''}${fixedTextSpine ? ' · fixed editorial timing' : ''}${momentBound ? ' · drag to adjust its Text-moment binding' : ''}`}
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
          if (!timingMovable) return;
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

/**
 * One semantic camera lane derived from Move, Look, Lens, and Orbit. The lane
 * selects the canonical Move key for the beat; its inspector then exposes the
 * matching pitch and lens values without asking authors to coordinate tracks.
 */
function DirectorCameraLane({ document, selection, pixelsPerWU, durationWU, store, onOpenInspector }) {
  const camera = document.tracks.camera;
  const keys = [...(camera.moveKeys || [])].sort((left, right) => Number(left.atWU) - Number(right.atWU));
  return (
    <div className="about-director-camera-journey" role="group" aria-label="Camera journey beats">
      {keys.map((key, index) => {
        const nextWU = Number(keys[index + 1]?.atWU ?? durationWU);
        const selected = CAMERA_SELECTION_TYPES.has(selection?.type)
          && Math.abs(Number(getAboutNarrativeTrackObject(document, selection)?.atWU) - Number(key.atWU)) < 0.0001;
        return (
          <button
            type="button"
            key={key.id}
            className={`${selected ? 'is-selected' : ''}${key.id === 'move-bust-orbit-start' ? ' is-orbit' : ''}`}
            data-track-object-id={key.id}
            style={{
              left: Number(key.atWU) * pixelsPerWU,
              width: Math.max(16, (nextWU - Number(key.atWU)) * pixelsPerWU),
            }}
            aria-pressed={selected}
            title={`${CAMERA_BEAT_LABELS[key.id] || key.id} · bound to ${key.trigger?.momentId || 'story'}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              store.setSelection({ type: 'camera-key', id: key.id });
              store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(key.atWU) });
              window.requestAnimationFrame(() => onOpenInspector?.());
            }}
          >
            <span>{CAMERA_BEAT_LABELS[key.id] || key.id}</span>
            {key.id === 'move-bust-orbit-start' ? <small>Orbit · 360° + scroll</small> : null}
          </button>
        );
      })}
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
  showAllTracks,
  setShowAllTracks,
  textMenu,
  setTextMenu,
  interactionMenu,
  setInteractionMenu,
  detailMode,
  setDetailMode,
  onOpenTextEditor,
  onOpenInspector,
  experienceVersion = 'v1',
}) {
  const pointFieldV6 = Number(snapshot.document.schemaVersion)
    === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  const directorMode = pointFieldV6 && detailMode === 'director';
  const materialScoreV2 = experienceVersion === 'v2';
  const tracks = pointFieldV6
    ? (directorMode
      ? materialScoreV2 ? V2_DIRECTOR_TRACKS : DIRECTOR_TRACKS
      : materialScoreV2 ? V2_ADVANCED_POINT_FIELD_TRACKS : ADVANCED_POINT_FIELD_TRACKS)
    : LEGACY_TRACKS;
  const timelineDocument = directorMode && snapshot.compiledPlan?.model
    ? snapshot.compiledPlan.model
    : snapshot.document;
  const storyTrack = tracks.find((track) => track.id === 'text') || tracks[0];
  const selectedTrackId = directorMode
    ? getDirectorSelectionTrackId(snapshot.selection)
    : getSelectionTrackId(snapshot.selection, pointFieldV6);
  const timelineSelectionKey = `${snapshot.selection.type || 'none'}:${snapshot.selection.id || ''}`;
  const [trackFocus, setTrackFocus] = useState({
    id: selectedTrackId,
    selectionKey: timelineSelectionKey,
  });
  const [snapGuideWU, setSnapGuideWU] = useState(null);
  const [autoFit, setAutoFit] = useState(true);
  const activeTrackId = trackFocus.selectionKey === timelineSelectionKey
    ? trackFocus.id
    : selectedTrackId;
  const activeTrack = tracks.find((track) => track.id === activeTrackId) || storyTrack;
  // Text is the immutable narrative ruler, so it remains visible while another
  // lane is edited. Camera, Forms, and Effects move against this fixed context.
  const visibleTracks = directorMode
    ? tracks
    : showAllTracks || activeTrack.id === storyTrack.id
    ? (showAllTracks ? tracks : [storyTrack])
    : [storyTrack, activeTrack];
  const laneHeight = directorMode ? 44 : showAllTracks || visibleTracks.length > 1 ? 32 : 54;
  const scrollRef = useRef(null);
  const scrubRef = useRef(null);
  const durationWU = Number(snapshot.compiledPlan?.durationWU
    || snapshot.document.profiles.desktop.storyDurationWU);
  const textDurationWU = directorMode
    ? Number(snapshot.compiledPlan?.storyLayout?.durationWU || durationWU)
    : getAboutNarrativeTextStoryDurationWU(snapshot.document);
  const materialSettingsSelected = snapshot.selection.type === 'track'
    && snapshot.selection.id === 'material';
  const pixelsPerWU = BASE_PIXELS_PER_WU * zoom;
  const timelineWidth = Math.max(MIN_TIMELINE_WIDTH, durationWU * pixelsPerWU);
  const rulerMarks = useMemo(
    () => Array.from({ length: Math.ceil(durationWU) + 1 }, (_, index) => index),
    [durationWU],
  );
  const worlds = timelineDocument.tracks.worlds?.objects || [];
  const editorialTextConnections = useMemo(
    () => getEditorialTextConnections(snapshot.document.tracks.text.fields),
    [snapshot.document],
  );
  const selectedPointFieldKeyWU = useMemo(() => {
    if (snapshot.selection.type !== 'point-field-key') return null;
    const pointField = editScope === 'base'
      ? timelineDocument.tracks.pointField
      : applyAboutNarrativePointFieldOverrides(
        timelineDocument.tracks.pointField,
        timelineDocument.profiles[editScope].overrides.pointField,
      );
    const pointKey = pointField.keys.find((key) => key.id === snapshot.selection.id);
    return Number.isFinite(Number(pointKey?.atWU)) ? Number(pointKey.atWU) : null;
  }, [editScope, snapshot.selection.id, snapshot.selection.type, timelineDocument]);
  const directorAnalysis = useMemo(
    () => analyseAboutNarrativeComposerPlan(snapshot.compiledPlan),
    [snapshot.compiledPlan],
  );
  const snapTargets = useMemo(
    () => collectTimelineSnapTargets(timelineDocument),
    [timelineDocument],
  );
  const moments = useMemo(
    () => getAboutNarrativeStoryMoments(timelineDocument),
    [timelineDocument],
  );
  const activeMoment = useMemo(
    () => getAboutNarrativeMomentAtWU(timelineDocument, snapshot.transport.storyWU),
    [timelineDocument, snapshot.transport.storyWU],
  );
  const storyFieldsById = useMemo(() => new Map(
    (snapshot.compiledPlan?.storyLayout?.fields || []).map((field) => [field.id, field]),
  ), [snapshot.compiledPlan]);
  const storyGapsByFieldId = useMemo(() => new Map(
    (snapshot.compiledPlan?.storyLayout?.gaps || []).map((gap) => [gap.fromFieldId, gap]),
  ), [snapshot.compiledPlan]);

  const seekFromEvent = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const nextWU = clamp((event.clientX - rect.left) / pixelsPerWU, 0, durationWU);
    store.setTransport({ owner: 'timeline', playing: false, storyWU: cleanWU(nextWU) });
  };

  const syncPointFieldPlayhead = useCallback((atWU) => {
    if (!Number.isFinite(Number(atWU))) return;
    store.setTransport({
      owner: 'timeline',
      playing: false,
      storyWU: cleanWU(clamp(Number(atWU), 0, durationWU)),
    });
  }, [durationWU, store]);

  useEffect(() => {
    syncPointFieldPlayhead(selectedPointFieldKeyWU);
  }, [selectedPointFieldKeyWU, syncPointFieldPlayhead]);

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
    // A selected track can be clicked again without changing store selection.
    // Open explicitly so the track header always behaves as an inspector trigger.
    onOpenInspector?.();
  };

  const selectPointStyle = () => {
    const selectionKey = 'track:material';
    store.setSelection({ type: 'track', id: 'material' });
    // Point style is a global visual setting, not a timed lane. Keep the Text
    // spine visible while its inspector is open instead of fabricating an
    // empty Material row on the timeline.
    setTrackFocus({ id: storyTrack.id, selectionKey });
    setTextMenu(false);
    setInteractionMenu(false);
  };

  const applyTimelineFit = useCallback(() => {
    const available = Math.max(1, Number(scrollRef.current?.clientWidth || 1) - 24);
    setZoom(clamp(available / Math.max(1, durationWU * BASE_PIXELS_PER_WU), 0.35, 2.5));
  }, [durationWU, setZoom]);

  useEffect(() => {
    if (!autoFit || !scrollRef.current) return undefined;
    const update = () => applyTimelineFit();
    update();
    const observer = new ResizeObserver(update);
    observer.observe(scrollRef.current);
    return () => observer.disconnect();
  }, [applyTimelineFit, autoFit]);

  const fitTimeline = () => {
    setAutoFit(true);
    applyTimelineFit();
  };

  const showMoment = (atWU, fieldId = null) => {
    store.setTransport({ owner: 'timeline', playing: false, storyWU: atWU });
    if (fieldId) {
      store.setSelection({ type: 'text-field', id: fieldId });
      window.requestAnimationFrame(() => onOpenInspector?.());
    }
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.scrollTo({
      left: Math.max(0, (atWU * pixelsPerWU) - (scroll.clientWidth / 2)),
      behavior: 'smooth',
    });
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
      const result = store.pointField.moveKey({ keyId, atWU, scope });
      syncPointFieldPlayhead(result?.valid ? result.appliedAtWU : atWU);
      return;
    }
    syncPointFieldPlayhead(atWU);
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
      data-show-all-tracks={directorMode || showAllTracks ? 'true' : 'false'}
      data-detail-mode={directorMode ? 'director' : 'advanced'}
      data-text-story-duration={textDurationWU.toFixed(3)}
    >
      <header className="about-track-editor-timeline__toolbar">
        <nav className="about-director-scene-nav" aria-label="Story Stack">
          {directorMode ? (
            <button
              type="button"
              className="about-director-story-stack-heading"
              aria-label="Open Story Stack settings"
              onClick={() => selectTrack('text')}
            >Story Stack<small>Copy sets length</small></button>
          ) : <span>Moments</span>}
          {moments.map((moment) => (
            <button
              type="button"
              key={moment.id}
              className={activeMoment?.id === moment.id ? 'is-active' : ''}
              aria-current={activeMoment?.id === moment.id ? 'step' : undefined}
              title={`${moment.label} · enter ${moment.startWU.toFixed(2)}, focus ${moment.focusWU.toFixed(2)}, exit ${moment.endWU.toFixed(2)} WU`}
              onClick={() => showMoment(moment.focusWU, directorMode ? moment.id : null)}
            >
              <b>{moment.label}</b>
              {directorMode ? (
                <small>
                  {storyFieldsById.get(moment.id)?.durationWU?.toFixed(2) || '—'} screens
                  {storyGapsByFieldId.get(moment.id)
                    ? ` · ${storyGapsByFieldId.get(moment.id).preset} gap`
                    : ' · ending'}
                </small>
              ) : <small>{moment.focusWU.toFixed(2)}</small>}
            </button>
          ))}
        </nav>
        <div className="about-director-track-tabs" role="tablist" aria-label="Timeline track">
          {tracks.map((track) => (
            <button
              type="button"
              role="tab"
              key={track.id}
              className={`is-${track.colour}${activeTrack.id === track.id ? ' is-active' : ''}`}
              data-track-master={track.master ? 'true' : undefined}
              aria-selected={activeTrack.id === track.id}
              onClick={() => selectTrack(track.id)}
            >{track.group ? <small>{track.group}</small> : null}{track.label}</button>
          ))}
        </div>
        <div className="about-director-timeline-tools">
          {pointFieldV6 ? (
            <div className="about-director-detail-switch" role="group" aria-label="Timeline detail">
              <button
                type="button"
                className={directorMode ? 'is-active' : ''}
                aria-pressed={directorMode}
                onClick={() => setDetailMode('director')}
              >Director</button>
              <button
                type="button"
                className={!directorMode ? 'is-active' : ''}
                aria-pressed={!directorMode}
                onClick={() => {
                  setDetailMode('advanced');
                  setShowAllTracks(true);
                }}
              >Advanced</button>
            </div>
          ) : null}
          {!directorMode ? (
            <>
              <output className="about-director-playhead-readout" aria-label="Current Story WU">
                <strong>{Number(snapshot.transport.storyWU).toFixed(2)}</strong><small>WU</small>
              </output>
              <strong
                className="about-director-story-spine-readout"
                title="The final publishable Text exit defines the page length"
              >Text spine <span>{textDurationWU.toFixed(2)} WU</span></strong>
            </>
          ) : null}
          <strong className="about-director-text-owner-note">
            {directorMode
              ? materialScoreV2
                ? 'Copy length + named gaps set the page · Depth and material follow'
                : 'Copy length + named gaps set the page · Camera and World follow'
              : 'Text moments set page rhythm · direct Camera and World around them'}
          </strong>
          {directorAnalysis.gaps.length ? (
            <strong className="about-director-coverage-warning" title={directorAnalysis.gaps.map((gap) => `${gap.startWU.toFixed(2)}–${gap.endWU.toFixed(2)} WU`).join(', ')}>
              {directorAnalysis.gaps.length} dead-air {directorAnalysis.gaps.length === 1 ? 'gap' : 'gaps'}
            </strong>
          ) : <strong className="about-director-coverage-ok">Coverage clear</strong>}
          {!directorMode ? (
            <button
              type="button"
              className={showAllTracks ? 'is-active' : ''}
              aria-pressed={showAllTracks}
              aria-label="Show all timeline tracks"
              title="Show every track at once"
              onClick={() => {
                const next = !showAllTracks;
                setShowAllTracks(next);
                if (next) setDockMode('expanded');
              }}
            >All tracks</button>
          ) : null}
          {pointFieldV6 ? (
            <button
              type="button"
              className={materialSettingsSelected ? 'is-active' : ''}
              aria-pressed={materialSettingsSelected}
              title="Open global point appearance settings; these values do not have timeline timing"
              onClick={selectPointStyle}
            >Point style</button>
          ) : null}
          {!directorMode && !materialSettingsSelected
            && activeTrack.id !== 'point-field'
            // The v7 Text spine is canonical page structure, and Effects are a
            // complete Form-owned sequence. Neither accepts loose timeline
            // objects; their copy/parameters and bound animation timing remain editable.
            && !(pointFieldV6 && ['text', 'interaction'].includes(activeTrack.id)) ? (
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
                  <button type="button" onClick={() => createAtPlayhead('interaction', null, 'state-effect')}>State effect</button>
                  <button type="button" onClick={() => createAtPlayhead('interaction', null, 'grid-ripple')}>Wave generator</button>
                  <button type="button" onClick={() => createAtPlayhead('interaction', null, 'horizontal-spin')}>Horizontal spin</button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button type="button" onClick={fitTimeline}>Fit</button>
          {!directorMode ? <details className="about-director-zoom-menu">
            <summary aria-label="Timeline zoom">{Math.round(zoom * 100)}%</summary>
            <label>
              Zoom
              <input
                type="range"
                min="0.55"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(event) => {
                  setAutoFit(false);
                  setZoom(Number(event.target.value));
                }}
              />
            </label>
          </details> : null}
          <button type="button" aria-label={DIRECTOR_DOCK_MODES.find((mode) => mode.id === dockMode)?.label} onClick={cycleDockMode}>
            {dockMode[0].toUpperCase() + dockMode.slice(1)}
          </button>
        </div>
      </header>
      <div className="about-track-editor-timeline__body">
        <div
          className="about-track-editor-headers"
          aria-hidden="false"
          style={{ gridTemplateRows: `28px repeat(${visibleTracks.length}, ${laneHeight}px)` }}
        >
          <div className="about-track-editor-ruler-corner">{directorMode ? 'Story anchors' : 'Time'}</div>
          {visibleTracks.map((track) => (
            <button
              type="button"
              className={`about-track-editor-row-head is-${track.colour}`}
              key={track.id}
              data-track-master={track.master ? 'true' : undefined}
              aria-label={`Select ${track.group ? `${track.group} ` : ''}${track.label} lane`}
              onClick={() => selectTrack(track.id)}
            >
              <span className="about-track-editor-row-label">{track.group ? <small>{track.group}</small> : null}{track.label}</span>
            </button>
          ))}
        </div>
        <div className="about-track-editor-scroll" ref={scrollRef}>
          <div
            className="about-track-editor-canvas"
            style={{
              width: timelineWidth,
              height: 28 + (visibleTracks.length * laneHeight),
              gridTemplateRows: `28px repeat(${visibleTracks.length}, ${laneHeight}px)`,
            }}
            onPointerDown={beginScrub}
            onPointerMove={updateScrub}
            onPointerUp={endScrub}
            onPointerCancel={endScrub}
          >
            <div className="about-track-editor-ruler" aria-hidden="true">
              {directorMode ? moments.map((moment, index) => (
                <span
                  className="about-director-moment-ruler-label"
                  key={moment.id}
                  style={{ left: moment.startWU * pixelsPerWU }}
                  title={`${index + 1}. ${moment.label}`}
                ><i />{index + 1}</span>
              )) : rulerMarks.map((mark) => (
                <span key={mark} style={{ left: mark * pixelsPerWU }}><i />{mark}</span>
              ))}
            </div>
            <div
              className="about-director-moment-bands"
              style={{ top: 28, height: visibleTracks.length * laneHeight }}
              aria-hidden="true"
            >
              {moments.map((moment, index) => {
                const nextStartWU = moments[index + 1]?.startWU ?? durationWU;
                return (
                  <i
                    key={moment.id}
                    data-moment-id={moment.id}
                    className={activeMoment?.id === moment.id ? 'is-active' : ''}
                    style={{
                      left: moment.startWU * pixelsPerWU,
                      width: Math.max(1, (nextStartWU - moment.startWU) * pixelsPerWU),
                    }}
                  ><span>{index + 1}</span></i>
                );
              })}
            </div>
            <div className="about-director-coverage-strip" aria-label="Narrative activity coverage">
              {directorAnalysis.coverage.map((segment) => (
                <i
                  key={`${segment.type}-${segment.startWU}`}
                  className={`is-${segment.type}`}
                  style={{
                    left: segment.startWU * pixelsPerWU,
                    width: Math.max(1, (segment.endWU - segment.startWU) * pixelsPerWU),
                  }}
                  title={`${segment.type} · ${segment.startWU.toFixed(2)}–${segment.endWU.toFixed(2)} WU`}
                />
              ))}
            </div>
            {!pointFieldV6 && !showAllTracks && activeTrack.id === 'world' ? worlds.map((world) => (
              <i
                className="about-track-editor-world-guide"
                key={world.id}
                style={{ left: world.startWU * pixelsPerWU }}
                aria-hidden="true"
              />
            )) : null}
            {visibleTracks.map((track) => (
              <div
                className={`about-track-editor-lane is-${track.colour}`}
                key={track.id}
                data-track-lane={track.id}
                data-track-master={track.master ? 'true' : undefined}
              >
                {!directorMode && (track.id === 'camera' || track.id === 'camera-orientation') ? (
                  <div className="about-director-velocity-graph" aria-hidden="true">
                    {(track.id === 'camera' ? directorAnalysis.camera.move : directorAnalysis.camera.look).map((segment) => {
                      const maximum = track.id === 'camera' ? 4 : 180;
                      return (
                        <i
                          key={segment.id}
                          style={{
                            left: segment.startWU * pixelsPerWU,
                            width: Math.max(1, (segment.endWU - segment.startWU) * pixelsPerWU),
                            height: `${Math.max(2, Math.min(100, (segment.value / maximum) * 100))}%`,
                          }}
                          title={`${track.id === 'camera' ? 'Translation' : 'Angular'} velocity ${segment.value.toFixed(2)} ${track.id === 'camera' ? 'WU/WU' : '°/WU'}`}
                        />
                      );
                    })}
                  </div>
                ) : null}
                {track.id === 'point-field' ? (
                  directorMode ? (
                    <DirectorPointFieldLane
                      document={timelineDocument}
                      selection={snapshot.selection}
                      pixelsPerWU={pixelsPerWU}
                      editScope={editScope}
                      previewProfile={snapshot.previewState.layoutProfile}
                      onSelect={(selection, atWU) => {
                        store.pointField.select(selection);
                        syncPointFieldPlayhead(atWU);
                        window.requestAnimationFrame(() => onOpenInspector?.());
                      }}
                    />
                  ) : <PointFieldLane
                    document={timelineDocument}
                    selection={snapshot.selection}
                    pixelsPerWU={pixelsPerWU}
                    editScope={editScope}
                    previewProfile={snapshot.previewState.layoutProfile}
                    momentBound={pointFieldV6}
                    onSelect={(selection, atWU) => {
                      store.pointField.select(selection);
                      syncPointFieldPlayhead(atWU);
                      // Forms and Effects are one authoring lane. Selecting
                      // either band must reveal its controls immediately;
                      // requiring a second click on the lane header makes the
                      // unified sequence look selectable but feel inert.
                      window.requestAnimationFrame(() => onOpenInspector?.());
                    }}
                    onMoveKey={movePointFieldKey}
                    onMoveSegment={movePointFieldSegment}
                  />
                ) : directorMode && track.id === 'camera' ? (
                  <DirectorCameraLane
                    document={snapshot.document}
                    selection={snapshot.selection}
                    pixelsPerWU={pixelsPerWU}
                    durationWU={durationWU}
                    store={store}
                    onOpenInspector={onOpenInspector}
                  />
                ) : (
                  <>
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
                          snapTargets={snapTargets}
                          onSnap={setSnapGuideWU}
                        />
                      );
                    })}
                    {!directorMode && track.id === 'camera' && snapshot.document.tracks.camera.orbit ? (
                      <button
                        type="button"
                        className="about-director-camera-orbit-band"
                        style={{
                          left: Number(snapshot.document.tracks.camera.orbit.startWU) * pixelsPerWU,
                          width: Math.max(18, (
                            Number(snapshot.document.tracks.camera.orbit.endWU)
                            - Number(snapshot.document.tracks.camera.orbit.startWU)
                          ) * pixelsPerWU),
                        }}
                        title={`Target-locked orbit · ${snapshot.document.tracks.camera.orbit.startWU}–${snapshot.document.tracks.camera.orbit.endWU} WU`}
                        onClick={(event) => {
                          event.stopPropagation();
                          store.setSelection({ type: 'track', id: 'camera' });
                          store.setTransport({
                            owner: 'timeline',
                            playing: false,
                            storyWU: Number(snapshot.document.tracks.camera.orbit.startWU),
                          });
                        }}
                      >Orbit</button>
                    ) : null}
                  </>
                )}
              </div>
            ))}
            <div
              className="about-director-story-end"
              style={{ left: textDurationWU * pixelsPerWU }}
              title={`Page end follows Text at ${textDurationWU.toFixed(2)} WU`}
              aria-hidden="true"
            ><span>Page end</span></div>
            <div
              className="about-track-editor-playhead"
              style={{ left: snapshot.transport.storyWU * pixelsPerWU }}
              aria-hidden="true"
            ><i /></div>
            {snapGuideWU != null ? (
              <div
                className="about-director-snap-guide"
                style={{ left: snapGuideWU * pixelsPerWU }}
                aria-hidden="true"
              ><span>Snap {snapGuideWU.toFixed(2)}</span></div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Effects stay normalized in tracks.interactions for the renderer, but this
 * editor is intentionally embedded inside the owning Form sequence. Keeping
 * the editor here prevents the authoring model from drifting back into two
 * unrelated timelines.
 */
function EffectPropertiesPanel({
  snapshot,
  store,
  effect,
  sequence,
  selectionAfter,
  onSelectEffect,
  defaultOpen = false,
}) {
  const selection = { type: 'interaction', id: effect.id };
  const definition = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[effect.type];
  const locked = effect.locked === true || effect.protected === true;
  const commit = (label, mutate) => store.commit(label, (draft) => {
    const target = getAboutNarrativeTrackObject(draft, selection);
    if (!target) return;
    mutate(target, draft);
  }, { selectionAfter, requireValid: true });
  const bindRange = (label, mutate) => ({
    onBegin: () => store.beginGesture(label, { selection: selectionAfter }),
    onPreview: (value) => store.updateGesture((draft) => {
      const target = getAboutNarrativeTrackObject(draft, selection);
      if (target) mutate(target, value, draft);
    }, { selection: selectionAfter }),
    onFinish: () => store.commitGesture({ selectionAfter, requireValid: true }),
    onCancel: () => store.cancelGesture(),
    onCommit: (value) => commit(label, (target, draft) => mutate(target, value, draft)),
  });
  const setEffectEnd = (target, endWU, draft) => {
    target.endWU = cleanWU(clamp(
      Number(endWU),
      Number(target.activationWU),
      Number(sequence.endWU),
    ));
    refreshAboutNarrativeMomentTriggers(draft, selection);
  };
  const modifierDefinition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[effect.parameters?.effectId];

  return (
    <InspectorFolder
      group={{
        id: `sequence-effect-${effect.id}`,
        label: definition?.label || effect.type,
      }}
      count={(definition?.parameters.length || 0) + 4}
      defaultOpen={defaultOpen}
    >
      <div className="about-form-effect-inline-heading">
        <span>{Number(effect.startWU).toFixed(2)}–{Number(effect.endWU).toFixed(2)} WU</span>
        <button type="button" onClick={() => onSelectEffect?.(effect)}>Focus effect</button>
      </div>
      <div className="about-track-editor-folder__grid about-form-effect-sequence-fields">
        <NumberField
          label="Start WU"
          value={effect.startWU}
          disabled={locked}
          min={sequence.startWU}
          max={effect.activationWU}
          step={0.01}
          onCommit={(startWU) => commit('Edit Effect start', (target) => {
            target.startWU = cleanWU(clamp(
              Number(startWU),
              Number(sequence.startWU),
              Number(target.activationWU),
            ));
          })}
        />
        <NumberField
          label="Full strength WU"
          value={effect.activationWU}
          disabled
          min={sequence.startWU}
          max={sequence.endWU}
          step={0.01}
          onCommit={() => {}}
        />
        <NumberField
          label="End WU"
          value={effect.endWU}
          disabled={locked}
          min={effect.activationWU}
          max={sequence.endWU}
          step={0.01}
          onCommit={(endWU) => commit('Edit Effect end', (target, draft) => {
            setEffectEnd(target, endWU, draft);
          })}
        />
        <NumberField
          label="Duration WU"
          value={cleanWU(Number(effect.endWU) - Number(effect.startWU))}
          disabled={locked}
          min={Math.max(0, Number(effect.activationWU) - Number(effect.startWU))}
          max={Math.max(0, Number(sequence.endWU) - Number(effect.startWU))}
          step={0.01}
          onCommit={(durationWU) => commit('Edit Effect duration', (target, draft) => {
            setEffectEnd(target, Number(target.startWU) + Number(durationWU), draft);
          })}
        />
      </div>
      <MomentBindingFields
        document={snapshot.document}
        store={store}
        selection={selection}
        selectionAfter={selectionAfter}
        disabled={locked}
        label="Effect reaches full strength"
      />
      <MomentBindingFields
        document={snapshot.document}
        store={store}
        selection={selection}
        selectionAfter={selectionAfter}
        bindingKey="endTrigger"
        disabled={locked}
        label="Effect ends"
      />
      <SelectField
        label="Motion type"
        value={effect.type}
        disabled={locked}
        options={Object.values(ABOUT_NARRATIVE_INTERACTION_DEFINITIONS).map((entry) => ({
          value: entry.id,
          label: entry.label,
        }))}
        onCommit={(value) => commit('Edit Effect type', (target) => {
          const nextDefinition = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[value];
          target.type = value;
          target.parameters = { ...(nextDefinition?.defaultParameters || {}) };
        })}
      />
      <label className="about-track-editor-field">
        <span>Owning Form</span>
        <input
          value={snapshot.document.tracks.pointField.stateDefinitions.find(
            (state) => state.id === effect.targetStateId,
          )?.label || effect.targetStateId}
          disabled
          readOnly
        />
      </label>
      {effect.type === 'state-effect' ? (
        <>
          <SelectField
            label="Effect"
            value={effect.parameters?.effectId || 'ambient-drift-v1'}
            disabled={locked}
            options={Object.values(ABOUT_NARRATIVE_MODIFIER_DEFINITIONS).map((entry) => ({
              value: entry.id,
              label: entry.label,
            }))}
            onCommit={(value) => commit('Change state effect', (target) => {
              const nextDefinition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[value];
              target.parameters = {
                effectId: value,
                releaseWU: Number(target.parameters?.releaseWU || 0),
                ...Object.fromEntries((nextDefinition?.parameters || [])
                  .filter((control) => control.id !== 'timeMode')
                  .map((control) => [control.id, control.min ?? control.options?.[0] ?? 0])),
              };
            })}
          />
          {(modifierDefinition?.parameters || [])
            .filter((control) => control.id !== 'timeMode')
            .map((control) => (control.type === 'select' ? (
              <SelectField
                key={control.id}
                label={control.label}
                value={effect.parameters?.[control.id]}
                disabled={locked}
                options={control.options.map((value) => ({ value, label: value }))}
                onCommit={(value) => commit(`Edit ${control.label}`, (target) => {
                  target.parameters[control.id] = value;
                })}
              />
            ) : (
              <RangeParameterField
                key={control.id}
                label={control.label}
                ariaLabel={`Effect ${control.label}`}
                value={effect.parameters?.[control.id] ?? control.min ?? 0}
                control={control}
                disabled={locked}
                {...bindRange(`Edit ${control.label}`, (target, value) => {
                  target.parameters[control.id] = value;
                })}
              />
            )))}
          <RangeParameterField
            label="Release"
            ariaLabel="Effect release"
            value={effect.parameters?.releaseWU || 0}
            control={{ id: 'releaseWU', min: 0, max: 4, step: 0.01, unit: ' WU' }}
            disabled={locked}
            {...bindRange('Edit effect release', (target, value) => {
              target.parameters.releaseWU = value;
            })}
          />
        </>
      ) : null}
      {definition?.parameters
        .filter((control) => control.group)
        .map((control) => {
          const value = effect.parameters?.[control.id]
            ?? definition.defaultParameters?.[control.id];
          return control.type === 'select' ? (
            <SelectField
              key={control.id}
              label={control.label}
              value={value}
              disabled={locked}
              options={control.options.map((option) => ({ value: option, label: option }))}
              onCommit={(nextValue) => commit(`Edit ${control.label}`, (target) => {
                target.parameters[control.id] = nextValue;
              })}
            />
          ) : (
            <RangeParameterField
              key={control.id}
              label={control.label}
              ariaLabel={`Effect ${control.label}`}
              value={value}
              control={control}
              disabled={locked}
              {...bindRange(`Edit ${control.label}`, (target, nextValue) => {
                target.parameters[control.id] = nextValue;
              })}
            />
          );
        })}
    </InspectorFolder>
  );
}

function FormTransitionPanel({ snapshot, store, sequence }) {
  const pointField = snapshot.document.tracks.pointField;
  // A Form sequence can merge its arrival morph and following hold. Its first
  // segment is therefore the authored transformation into the Form; matching
  // both outer keys would skip that morph and incorrectly report a Hold.
  const segment = pointField.segments.find((candidate) => (
    candidate.fromKeyId === sequence.fromKeyId
  ));
  if (!segment || segment.transition.type === 'hold') {
    return (
      <div className="about-form-transition-summary is-hold">
        <span>Transformation</span><b>Hold</b><small>The same Form continues.</small>
      </div>
    );
  }

  const selectionAfter = snapshot.selection;
  const patchTransition = (draft, patch) => {
    const target = draft.tracks.pointField.segments.find((candidate) => candidate.id === segment.id);
    if (!target) return;
    // Director edits the essential movement character as a deep patch. The
    // Advanced inspector retains axes, seeds, and plane controls without
    // creating a second timing model.
    target.transition = {
      ...target.transition,
      ...patch,
      path: { ...target.transition.path, ...(patch.path || {}) },
      stagger: { ...target.transition.stagger, ...(patch.stagger || {}) },
      flatten: { ...target.transition.flatten, ...(patch.flatten || {}) },
    };
  };
  const commit = (label, patch) => store.commit(label, (draft) => {
    patchTransition(draft, patch);
  }, { selectionAfter, requireValid: true });
  const bindRange = (label, patchForValue) => ({
    onBegin: () => store.beginGesture(label, { selection: selectionAfter }),
    onPreview: (value) => store.updateGesture((draft) => {
      patchTransition(draft, patchForValue(value));
    }, { selection: selectionAfter }),
    onFinish: () => store.commitGesture({ selectionAfter, requireValid: true }),
    onCancel: () => store.cancelGesture(),
    onCommit: (value) => commit(label, patchForValue(value)),
  });
  const path = segment.transition.path;
  const stagger = segment.transition.stagger;
  return (
    <InspectorFolder
      group={{ id: `form-transition-${segment.id}`, label: 'Transformation' }}
      count={4}
      defaultOpen
    >
      <p className="about-track-editor-parameter-note">
        The same solid points flow into this Form. Path and stagger shape the handoff; opacity never does.
      </p>
      <div className="about-track-editor-folder__grid about-form-transition-fields">
        <SelectField
          label="Movement"
          value={path.mode}
          options={ABOUT_NARRATIVE_POINT_FIELD_PATH_MODES.map((value) => ({
            value,
            label: value === 'flow' ? 'Flow · recommended' : titleCase(value),
          }))}
          onCommit={(mode) => commit('Change Form movement', { path: { mode } })}
        />
        <SelectField
          label="Curve"
          value={segment.transition.easing}
          options={ABOUT_NARRATIVE_EASINGS
            .filter((value) => value !== 'hold')
            .map((value) => ({ value, label: titleCase(value) }))}
          onCommit={(easing) => commit('Change Form transition curve', { easing })}
        />
        <RangeParameterField
          label="Flow"
          ariaLabel="Form transition flow amount"
          value={path.amount}
          control={{ id: 'pathAmount', min: 0, max: 1, step: 0.01 }}
          disabled={path.mode === 'direct'}
          {...bindRange('Shape Form flow', (amount) => ({ path: { amount } }))}
        />
        <RangeParameterField
          label="Stagger"
          ariaLabel="Form transition stagger amount"
          value={stagger.amount}
          control={{ id: 'staggerAmount', min: 0, max: 0.4, step: 0.01 }}
          {...bindRange('Shape Form stagger', (amount) => ({ stagger: { amount } }))}
        />
      </div>
      <p className="about-track-editor-parameter-note">
        Advanced exposes correspondence, axis, seed, frequency, and floor-plane controls.
      </p>
    </InspectorFolder>
  );
}

function FormSequencePanel({
  snapshot,
  store,
  pointKey,
  onSelectEffect,
  title = 'Sequence timing',
  inlineEffectControls = false,
}) {
  if (!pointKey) return null;
  const sequences = getAboutNarrativeFormSequence(
    snapshot.document.tracks.pointField,
    snapshot.document.profiles.desktop.storyDurationWU,
  );
  const sequence = sequences.find((range) => (
    range.stateId === pointKey.stateId
    && Number(pointKey.atWU) >= Number(range.startWU) - 0.000001
    && Number(pointKey.atWU) <= Number(range.endWU) + 0.000001
  ));
  if (!sequence) return null;
  const effects = (snapshot.document.tracks.interactions?.clips || []).filter((clip) => (
    clip.targetStateId === sequence.stateId
    && Number(clip.activationWU) >= Number(sequence.startWU) - 0.000001
    && Number(clip.activationWU) <= Number(sequence.endWU) + 0.000001
  ));
  const fromKey = snapshot.document.tracks.pointField.keys.find(
    (key) => key.id === sequence.fromKeyId,
  );
  const toKey = snapshot.document.tracks.pointField.keys.find(
    (key) => key.id === sequence.toKeyId,
  );
  const moveBoundary = (key, atWU) => {
    if (!key || key.protected === true) return;
    store.pointField.moveKey({ keyId: key.id, atWU, scope: 'base' });
  };

  return (
    <InspectorFolder
      group={{ id: `form-effect-sequence-${sequence.toKeyId}`, label: title }}
      count={effects.length + 3}
      defaultOpen
    >
      <p className="about-track-editor-parameter-note">
        The Form interval and its Effects are linked. Changing either boundary scales every Effect
        proportionally inside the sequence.
      </p>
      <div className="about-track-editor-folder__grid about-form-effect-sequence-fields">
        <NumberField
          label="Start WU"
          value={sequence.startWU}
          disabled={fromKey?.protected === true}
          min={0}
          step={0.01}
          onCommit={(startWU) => moveBoundary(fromKey, startWU)}
        />
        <NumberField
          label="End WU"
          value={sequence.endWU}
          disabled={toKey?.protected === true}
          min={0}
          step={0.01}
          onCommit={(endWU) => moveBoundary(toKey, endWU)}
        />
        <NumberField
          label="Duration WU"
          value={cleanWU(Number(sequence.endWU) - Number(sequence.startWU))}
          disabled={toKey?.protected === true}
          min={0}
          step={0.01}
          onCommit={(durationWU) => moveBoundary(
            toKey,
            cleanWU(Number(sequence.startWU) + Math.max(0, durationWU)),
          )}
        />
      </div>
      <FormTransitionPanel snapshot={snapshot} store={store} sequence={sequence} />
      {inlineEffectControls ? (
        <div className="about-form-effect-inline-controls" aria-label="Effects in this Form sequence">
          {effects.length ? effects.map((effect) => (
            <EffectPropertiesPanel
              key={effect.id}
              snapshot={snapshot}
              store={store}
              effect={effect}
              sequence={sequence}
              selectionAfter={snapshot.selection}
              onSelectEffect={onSelectEffect}
            />
          )) : <p>No additional Effect is active in this Form interval.</p>}
        </div>
      ) : (
        <div className="about-form-effect-sequence-list" role="list" aria-label="Effects in this Form sequence">
          {effects.length ? effects.map((effect) => (
            <button
              type="button"
              role="listitem"
              key={effect.id}
              onClick={() => onSelectEffect(effect)}
            >
              <span>
                <strong>{ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[effect.type]?.label || effect.type}</strong>
                <small>{Number(effect.startWU).toFixed(2)}–{Number(effect.endWU).toFixed(2)} WU</small>
              </span>
              <b>Focus</b>
            </button>
          )) : <p>No additional Effect is active in this Form interval.</p>}
        </div>
      )}
    </InspectorFolder>
  );
}

function FormSequenceTrackInspector({ snapshot, store }) {
  const pointField = snapshot.document.tracks.pointField;
  const stateById = new Map(pointField.stateDefinitions.map((state) => [state.id, state]));
  const keyById = new Map(pointField.keys.map((key) => [key.id, key]));
  const sequences = getAboutNarrativeFormSequence(
    pointField,
    snapshot.document.profiles.desktop.storyDurationWU,
  );
  const selectEffect = (effect) => {
    store.setSelection({ type: 'interaction', id: effect.id });
    store.setTransport({
      owner: 'timeline',
      playing: false,
      storyWU: Number(effect.activationWU),
    });
  };
  return (
    <div className="about-track-editor-inspector__content" data-form-effect-track-inspector>
      <header>
        <span>Visual sequence</span>
        <h2>Forms + effects</h2>
        <code>tracks.pointField + tracks.interactions</code>
      </header>
      <p className="about-track-editor-parameter-note is-wide">
        Each Form owns one continuous interval and every Effect inside it. Set the sequence timing
        here, then open an Effect below to tune its motion properties.
      </p>
      <div className="about-form-effect-track-sequences">
        {sequences.map((sequence) => (
          <FormSequencePanel
            key={`${sequence.fromKeyId}-${sequence.toKeyId}`}
            snapshot={snapshot}
            store={store}
            pointKey={keyById.get(sequence.toKeyId)}
            title={stateById.get(sequence.stateId)?.label || sequence.stateId}
            onSelectEffect={selectEffect}
            inlineEffectControls
          />
        ))}
      </div>
    </div>
  );
}

function DirectorStoryStackInspector({ snapshot, store }) {
  const selection = { type: 'track', id: 'text' };
  const storyLayout = snapshot.compiledPlan?.storyLayout
    || compileAboutNarrativeStoryLayout(snapshot.document, { profileId: 'desktop' });
  const runtimeDocument = snapshot.compiledPlan?.model || snapshot.document;
  const authoredById = new Map(
    snapshot.document.tracks.text.fields.map((field) => [field.id, field]),
  );
  const runtimeById = new Map(
    runtimeDocument.tracks.text.fields.map((field) => [field.id, field]),
  );
  const gapByFieldId = new Map(
    (storyLayout.gaps || []).map((gap) => [gap.fromFieldId, gap]),
  );
  const selectField = (storyField) => {
    const runtimeField = runtimeById.get(storyField.id);
    store.setSelection({ type: 'text-field', id: storyField.id });
    store.setTransport({
      owner: 'timeline',
      playing: false,
      storyWU: Number(runtimeField?.focusWU ?? storyField.focusWU ?? storyField.startWU),
    });
  };
  return (
    <div
      className="about-track-editor-inspector__content about-director-semantic-inspector"
      data-director-story-stack-inspector
    >
      <header><span>Story structure</span><h2>Content sets the pace</h2></header>
      <p className="about-track-editor-parameter-note is-wide">
        Blocks remain in ordinary reading order. Their measured copy height plus the named gap
        determines page length; every Camera and World anchor follows that result.
      </p>
      <section className="about-director-semantic-group">
        <header><strong>Page rhythm</strong><small>{storyLayout.fields.length} blocks · {storyLayout.durationWU.toFixed(2)} screens</small></header>
        <div className="about-track-editor-fields">
          <NumberField
            label="Reading corridor"
            value={snapshot.document.globals.readingWidthRem}
            min={30}
            max={90}
            step={1}
            onCommit={(value) => store.commit('Edit reading corridor', (draft) => {
              draft.globals.readingWidthRem = value;
            }, { selectionAfter: selection, requireValid: true })}
          />
        </div>
        <p>Changing the corridor can rewrap editorial copy, so the measured block and every later story anchor update together.</p>
      </section>
      <div className="about-director-semantic-list" role="list" aria-label="Ordered Story Stack blocks">
        {storyLayout.fields.map((storyField, index) => {
          const authored = authoredById.get(storyField.id);
          const gap = gapByFieldId.get(storyField.id);
          return (
            <button type="button" role="listitem" key={storyField.id} onClick={() => selectField(storyField)}>
              <b>{index + 1}</b>
              <span>
                <strong>{getObjectLabel(authored || storyField, 'text-field')}</strong>
                <small>{authored?.kind === 'scroll-block' ? 'Editorial' : 'Title'} · {storyField.durationWU.toFixed(2)} screens · {gap ? `${gap.preset} gap` : 'ending'}</small>
              </span>
              <em>Open</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DirectorCameraTrackInspector({ experienceVersion = 'v1', snapshot, store }) {
  const selection = { type: 'track', id: 'camera' };
  const camera = snapshot.compiledPlan?.camera || snapshot.document.tracks.camera;
  const authoredCamera = snapshot.document.globals.camera || {};
  const rideState = experienceVersion === 'v2'
    ? snapshot.document.tracks.pointField.stateDefinitions.find(
      (state) => state.shapeId === 'long-assembly-corridor-v1',
    )
    : null;
  const steadicamControls = experienceVersion === 'v2'
    ? CAMERA_TRACK_CONTROLS.filter((control) => (
      control.group === 'camera-steadicam'
      && ['steadycamResponseMs', 'pointerPanDegrees'].includes(control.id)
    ))
    : [];
  const fogControls = experienceVersion === 'v2'
    ? CAMERA_TRACK_CONTROLS
      .filter((control) => control.group === 'camera-fog')
      .map((control) => getBoundedCameraTrackControl(control, authoredCamera))
    : [];
  const bindCameraRange = (control) => {
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
  const bindScrollRange = () => {
    const label = 'Edit camera track glide';
    const mutate = (draft, value) => {
      draft.globals.scrollSmoothing = value;
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
  const selectBeat = (key) => {
    store.setSelection({ type: 'camera-key', id: key.id });
    store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(key.atWU) });
  };
  return (
    <div className="about-track-editor-inspector__content about-director-semantic-inspector">
      <header>
        <span>Camera journey</span>
        <h2>One continuous ride</h2>
      </header>
      <p className="about-track-editor-parameter-note is-wide">
        The permanent track curves, climbs, drops, and banks between stable reading beats. Camera and architecture share the same spatial path.
      </p>
      <section className="about-director-semantic-group">
        <header><strong>Journey pace</strong><small>{rideState ? 'Shared track distance' : 'Physical distance per Story WU'}</small></header>
        <div className="about-track-editor-fields">
          {rideState ? (
            <NumberField
              label="Travel distance"
              value={rideState.shapeParameters?.depthScale ?? 1}
              min={0.65}
              max={1.35}
              step={0.01}
              onCommit={(value) => {
                store.pointField.patchState({
                  id: rideState.id,
                  scope: 'base',
                  patch: { shapeParameters: { depthScale: value } },
                });
                store.setSelection(selection);
              }}
            />
          ) : (
            <NumberField
              label="Forward speed"
              value={snapshot.document.globals.camera?.forwardSpeedWU ?? 1.5}
              min={0.1}
              max={24}
              step={0.05}
              onCommit={(value) => store.commit('Edit camera forward speed', (draft) => {
                draft.globals.camera.forwardSpeedWU = value;
              }, { selectionAfter: selection, requireValid: true })}
            />
          )}
        </div>
      </section>
      {rideState ? (
        <section
          className="about-director-semantic-group"
          data-director-camera-steadicam
          aria-label="Camera steadicam response"
        >
          <header><strong>Steadicam response</strong><small>Track and mouse input</small></header>
          <div className="about-track-editor-shape-controls">
            <RangeParameterField
              label={ABOUT_NARRATIVE_SCROLL_SMOOTHING_CONTROL.label}
              ariaLabel="Camera track glide"
              value={snapshot.document.globals.scrollSmoothing}
              control={ABOUT_NARRATIVE_SCROLL_SMOOTHING_CONTROL}
              precisionWindow={0.2}
              {...bindScrollRange()}
            />
            {steadicamControls.map((control) => (
              <RangeParameterField
                key={control.id}
                label={control.label}
                ariaLabel={`Global camera ${control.label}`}
                value={authoredCamera[control.id]}
                control={control}
                precisionWindow={control.id === 'pointerPanDegrees' ? 2 : 400}
                {...bindCameraRange(control)}
              />
            ))}
          </div>
          <p className="about-director-semantic-note">
            Glide eases scroll travel. Mouse pan adds a small local look offset without changing the track or roll. Field of view stays fixed at 85°.
          </p>
        </section>
      ) : null}
      {fogControls.length ? (
        <section
          className="about-director-semantic-group"
          data-director-camera-atmosphere
          aria-label="Camera fog reveal"
        >
          <header><strong>Fog reveal</strong><small>Camera-space distance</small></header>
          <div className="about-track-editor-shape-controls">
            {fogControls.map((control) => (
              <RangeParameterField
                key={control.id}
                label={control.label}
                ariaLabel={`Global camera ${control.label}`}
                value={authoredCamera[control.id]}
                control={control}
                precisionWindow={4}
                {...bindCameraRange(control)}
              />
            ))}
          </div>
          <p className="about-director-semantic-note">
            Fog begins where distant structures start to disappear. Fully faded keeps later
            architecture hidden until the camera reaches it.
          </p>
        </section>
      ) : null}
      <div className="about-director-semantic-list" role="list" aria-label="Camera beats">
        {(camera.moveKeys || []).map((key, index) => (
          <button type="button" role="listitem" key={key.id} onClick={() => selectBeat(key)}>
            <b>{index + 1}</b>
            <span><strong>{CAMERA_BEAT_LABELS[key.id] || key.id}</strong><small>{key.trigger?.gapId
              ? 'final transition gap'
              : key.trigger?.momentId?.replace(/^text-/, '').replaceAll('-', ' ')}</small></span>
            <em>{key.id === 'move-bust-orbit-start' ? 'Orbit' : 'Open'}</em>
          </button>
        ))}
      </div>
      <button
        type="button"
        className="about-director-finale-link"
        onClick={() => {
          store.setSelection({ type: 'interaction', id: 'interaction-grid-ripple' });
          store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(camera.orbit?.startWU || 0) });
        }}
      >Tune the finale handoff</button>
    </div>
  );
}

function DirectorCameraBeatInspector({ experienceVersion = 'v1', snapshot, store }) {
  const selection = snapshot.selection;
  const camera = snapshot.document.tracks.camera;
  const move = getAboutNarrativeTrackObject(snapshot.document, selection);
  const related = [
    { type: 'camera-key', object: move },
    { type: 'camera-orientation-key', object: camera.lookKeys?.find((key) => Math.abs(Number(key.atWU) - Number(move?.atWU)) < 0.0001) },
    experienceVersion === 'v2' ? null : {
      type: 'camera-lens-key',
      object: camera.lensKeys?.find((key) => Math.abs(Number(key.atWU) - Number(move?.atWU)) < 0.0001),
    },
  ].filter((entry) => entry?.object);
  const look = related.find((entry) => entry.type === 'camera-orientation-key')?.object;
  const lens = related.find((entry) => entry.type === 'camera-lens-key')?.object;
  const moments = getAboutNarrativeStoryMoments(snapshot.document);
  const trigger = move?.trigger;
  const storyLayout = snapshot.compiledPlan?.storyLayout
    || compileAboutNarrativeStoryLayout(snapshot.document, { profileId: 'desktop' });
  const gapAnchor = trigger?.anchorType === 'gap' || Boolean(trigger?.gapId);
  const runtimeMove = snapshot.compiledPlan?.camera?.moveKeys?.find((key) => key.id === move?.id);
  const momentLabelById = new Map(moments.map((moment) => [moment.id, moment.label]));
  if (!move) return null;
  const commit = (label, mutate) => store.commit(label, (draft) => {
    const draftMove = getAboutNarrativeTrackObject(draft, selection);
    if (!draftMove) return;
    const draftLook = draft.tracks.camera.lookKeys?.find((key) => key.id === look?.id);
    const draftLens = draft.tracks.camera.lensKeys?.find((key) => key.id === lens?.id);
    mutate({ move: draftMove, look: draftLook, lens: draftLens }, draft);
  }, { selectionAfter: selection, requireValid: true });
  const commitBinding = (patch) => store.commit('Move camera beat', (draft) => {
    related.forEach((entry) => {
      setAboutNarrativeMomentTrigger(draft, { type: entry.type, id: entry.object.id }, {
        ...entry.object.trigger,
        ...patch,
      }, { storyLayout });
    });
    if (move.id === 'move-bust-orbit-start' && draft.tracks.camera.orbit) {
      setAboutNarrativeMomentTrigger(draft, {
        type: 'camera-orbit',
        id: draft.tracks.camera.orbit.id,
      }, { ...draft.tracks.camera.orbit.trigger, ...patch }, { storyLayout });
    }
  }, { selectionAfter: selection, requireValid: true });
  return (
    <div className="about-track-editor-inspector__content about-director-semantic-inspector">
      <header>
        <span>Camera beat</span>
        <h2>{CAMERA_BEAT_LABELS[move.id] || move.id}</h2>
        <code>{experienceVersion === 'v2' ? 'Move + Look · 85° fixed' : `Move + Look${lens ? ' + Lens' : ''}`}</code>
      </header>
      <section className="about-director-semantic-group">
        <header><strong>Story anchor</strong><small>Content remains authoritative</small></header>
        <div className="about-track-editor-fields">
          {gapAnchor ? (
            <>
              <SelectField
                label="Story gap"
                value={trigger.gapId}
                options={storyLayout.gaps.map((gap) => ({
                  value: gap.id,
                  label: `${momentLabelById.get(gap.fromFieldId)} → ${momentLabelById.get(gap.toFieldId)}`,
                }))}
                onCommit={(value) => commitBinding({ gapId: value })}
              />
              <NumberField label="Position in gap" value={trigger.progress} min={0} max={1} step={0.05} onCommit={(value) => commitBinding({ progress: value })} />
            </>
          ) : (
            <>
              <SelectField
                label="Moment"
                value={trigger?.momentId || moments[0]?.id}
                options={moments.map((moment) => ({ value: moment.id, label: moment.label }))}
                onCommit={(value) => commitBinding({ momentId: value })}
              />
              <SelectField
                label="Phase"
                value={trigger?.phase || 'focus'}
                options={ABOUT_NARRATIVE_MOMENT_PHASES.map((phase) => ({ value: phase.id, label: phase.label }))}
                onCommit={(value) => commitBinding({ phase: value })}
              />
            </>
          )}
          <NumberField label="Offset" value={trigger?.offsetWU || 0} step={0.05} onCommit={(value) => commitBinding({ offsetWU: value })} />
        </div>
      </section>
      <section className="about-director-semantic-group">
        <header><strong>Movement</strong><small>{experienceVersion === 'v2' ? 'Physical track + local direction' : 'No sideways drift'}</small></header>
        <div className="about-track-editor-fields">
          <NumberField label={experienceVersion === 'v2' ? 'Calculated track position' : 'Calculated forward position'} value={runtimeMove?.position?.[2] ?? move.position?.[2] ?? 0} disabled step={0.05} onCommit={() => {}} />
          {experienceVersion !== 'v2' ? <NumberField label="Height" value={move.position?.[1] || 0} step={0.05} onCommit={(value) => commit('Edit camera height', ({ move: target }) => { target.position[1] = value; })} /> : null}
          {experienceVersion !== 'v2' && look ? <NumberField label="Downward angle" value={look.rotation?.[0] || 0} step={0.1} min={-89} max={89} onCommit={(value) => commit('Edit camera angle', ({ look: target }) => { target.rotation[0] = value; })} /> : null}
          {experienceVersion === 'v2' && look ? <NumberField label={CAMERA_ROLL_OFFSET_CONTROL.label} value={look.rollOffset || 0} step={CAMERA_ROLL_OFFSET_CONTROL.step} min={CAMERA_ROLL_OFFSET_CONTROL.min} max={CAMERA_ROLL_OFFSET_CONTROL.max} onCommit={(value) => commit('Edit camera roll', ({ look: target }) => { target.rollOffset = value; })} /> : null}
          {experienceVersion !== 'v2' && lens ? <NumberField label="Field of view" value={lens.fov} step={0.5} min={20} max={100} onCommit={(value) => commit('Edit camera lens', ({ lens: target }) => { target.fov = value; })} /> : null}
          {experienceVersion !== 'v2' ? <SelectField
            label="Pace"
            value={move.velocityMode || 'fluid'}
            options={[{ value: 'fluid', label: 'Continuous' }, { value: 'eased', label: 'Ease at beat' }]}
            onCommit={(value) => commit('Edit camera pace', ({ move: target }) => { target.velocityMode = value; })}
          /> : null}
          <SelectField
            label="Curve"
            value={move.easing || 'linear'}
            options={ABOUT_NARRATIVE_CAMERA_EASINGS.map((value) => ({ value, label: value }))}
            onCommit={(value) => commit('Edit camera curve', (targets) => {
              targets.move.easing = value;
              if (targets.look) targets.look.easing = value;
              if (targets.lens) targets.lens.easing = value;
            })}
          />
        </div>
        {experienceVersion === 'v2' ? (
          <p className="about-director-semantic-note">
            Additional roll blends between Camera beats and adds to the corridor bank. Use the World sequence to change the length and total roll of the physical loop.
          </p>
        ) : null}
      </section>
      {move.id === 'move-bust-orbit-start' ? (
        <button type="button" className="about-director-finale-link" onClick={() => store.setSelection({ type: 'interaction', id: 'interaction-grid-ripple' })}>
          Open shared finale handoff
        </button>
      ) : null}
    </div>
  );
}

function DirectorWorldTrackInspector({ experienceVersion = 'v1', snapshot, store }) {
  // Director shows the content-derived projection, while Advanced retains the
  // authored timing caches. This prevents the simplified view from reporting
  // stale WU positions after copy reflows and changes the Story Stack length.
  const runtimeDocument = snapshot.compiledPlan?.model || snapshot.document;
  const pointField = runtimeDocument.tracks.pointField;
  const stateById = new Map(pointField.stateDefinitions.map((state) => [state.id, state]));
  const sequences = getAboutNarrativeFormSequence(
    pointField,
    runtimeDocument.profiles.desktop.storyDurationWU,
  );
  const effects = runtimeDocument.tracks.interactions?.clips || [];
  const longAssemblyV2 = experienceVersion === 'v2';
  const rideState = longAssemblyV2
    ? pointField.stateDefinitions.find((state) => state.shapeId === 'long-assembly-corridor-v1')
    : null;
  const rideSequence = rideState
    ? sequences.find((sequence) => sequence.stateId === rideState.id)
    : null;
  const rideTrack = rideState
    ? compileAboutNarrativeLongRideTrack(rideState.shapeParameters)
    : null;
  const rideStages = rideTrack ? V2_LONG_RIDE_STAGES.map((stage) => {
    const baseRange = rideTrack.baseStages[stage.id];
    const toRuntimeWU = (baseWU) => (
      baseWU <= ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU
        ? rideTrack.mapper.runtimeWUAtBaseWU(baseWU)
        : rideTrack.storyDurationWU
          + (baseWU - ABOUT_NARRATIVE_LONG_RIDE_BASE_DURATION_WU)
    );
    return {
      ...stage,
      startWU: toRuntimeWU(baseRange.startWU),
      endWU: toRuntimeWU(baseRange.endWU),
      description: stage.id === 'loop'
        ? `${Number(rideState.shapeParameters?.loopRollDegrees ?? 360)}° camera-and-gate roll`
        : stage.description,
    };
  }) : [];
  return (
    <div className="about-track-editor-inspector__content about-director-semantic-inspector">
      <header><span>{longAssemblyV2 ? 'Continuous ride' : 'World sequence'}</span><h2>{longAssemblyV2 ? 'The Long Assembly' : 'Four connected stages'}</h2></header>
      <p className="about-track-editor-parameter-note is-wide">{longAssemblyV2
        ? 'One permanent point-built world and its camera share a measured track. Select any place to jump there, then tune the corridor without changing the text order.'
        : 'Each stage owns its form and effects. Its start and end remain bound to the fixed editorial moments.'}</p>
      <div className="about-director-semantic-list" role={longAssemblyV2 ? 'group' : 'list'} aria-label={longAssemblyV2 ? 'Long Assembly ride progression' : 'World stages'} data-long-ride-progression={longAssemblyV2 || undefined}>
        {longAssemblyV2 ? rideStages.map((stage, index) => (
          <button
            type="button"
            key={stage.id}
            onClick={() => {
              if (rideSequence?.toKeyId) {
                store.pointField.select({ type: 'point-field-key', id: rideSequence.toKeyId });
              }
              store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(stage.startWU) });
            }}
          >
            <b>{index + 1}</b>
            <span>
              <strong>{stage.label}</strong>
              <small>{stage.description} · {stage.startWU.toFixed(2)}–{stage.endWU.toFixed(2)} WU</small>
            </span>
            <em>Go</em>
          </button>
        )) : sequences.map((sequence, index) => {
          const owned = effects.filter((effect) => effect.targetStateId === sequence.stateId);
          const stage = DIRECTOR_STAGE_LABELS[sequence.stateId] || stateById.get(sequence.stateId)?.label || sequence.stateId;
          return (
            <button
              type="button"
              role="listitem"
              key={sequence.toKeyId}
              onClick={() => {
                store.pointField.select({ type: 'point-field-key', id: sequence.toKeyId });
                store.setTransport({ owner: 'timeline', playing: false, storyWU: Number(sequence.startWU) });
              }}
            >
              <b>{index + 1}</b><span><strong>{stage}</strong><small>{owned.map((effect) => DIRECTOR_EFFECT_LABELS[effect.id] || effect.type).join(' · ')}</small></span><em>Open</em>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DirectorWorldStageInspector({ experienceVersion = 'v1', snapshot, store, editScope }) {
  const selection = snapshot.selection;
  const pointField = editScope === 'base'
    ? snapshot.document.tracks.pointField
    : applyAboutNarrativePointFieldOverrides(
      snapshot.document.tracks.pointField,
      snapshot.document.profiles[editScope].overrides.pointField,
    );
  const key = pointField.keys.find((item) => item.id === selection.id);
  const sequences = getAboutNarrativeFormSequence(pointField, snapshot.document.profiles.desktop.storyDurationWU);
  const sequence = sequences.find((item) => item.toKeyId === key?.id)
    || sequences.find((item) => item.stateId === key?.stateId);
  const state = pointField.stateDefinitions.find((item) => item.id === sequence?.stateId);
  if (!key || !sequence || !state) return null;
  const basePointField = snapshot.document.tracks.pointField;
  const baseSequence = getAboutNarrativeFormSequence(basePointField, snapshot.document.profiles.desktop.storyDurationWU)
    .find((item) => item.stateId === sequence.stateId);
  const effects = snapshot.document.tracks.interactions?.clips?.filter((effect) => effect.targetStateId === sequence.stateId) || [];
  const patchState = (patch) => {
    store.pointField.patchState({ id: state.id, scope: editScope, patch });
    store.pointField.select(selection);
  };
  const stageName = DIRECTOR_STAGE_LABELS[state.id] || state.label || state.id;
  const longAssemblyV2 = experienceVersion === 'v2'
    && state.shapeId === 'long-assembly-corridor-v1';
  return (
    <div className="about-track-editor-inspector__content about-director-semantic-inspector">
      <header><span>{longAssemblyV2 ? 'Permanent corridor' : 'World stage'}</span><h2>{stageName}</h2><code>{state.shapeId}</code></header>
      <section className="about-director-semantic-group">
        <header><strong>Story interval</strong><small>Move bindings, not the text</small></header>
        <MomentBindingFields
          document={snapshot.document}
          store={store}
          selection={{ type: 'point-field-key', id: baseSequence?.fromKeyId || sequence.fromKeyId }}
          selectionAfter={selection}
          label="Stage begins"
        />
        <MomentBindingFields document={snapshot.document} store={store} selection={{ type: 'point-field-key', id: baseSequence?.toKeyId || sequence.toKeyId }} selectionAfter={selection} label="Stage ends" />
      </section>
      <FormTransitionPanel
        snapshot={snapshot}
        store={store}
        sequence={baseSequence || sequence}
      />
      <section className="about-director-semantic-group">
        <header><strong>{longAssemblyV2 ? 'Corridor essentials' : 'Form essentials'}</strong><small>{editScope === 'base' ? 'All screens' : `${titleCase(editScope)} override`}</small></header>
        <div className="about-track-editor-fields">
          <NumberField label="Point size" value={state.transform?.pointSizeScale ?? 1} step={0.05} min={0.2} max={3} onCommit={(value) => patchState({ transform: { pointSizeScale: value } })} />
          <NumberField label="Form scale" value={state.transform?.scale ?? 1} step={0.05} min={0.1} max={4} onCommit={(value) => patchState({ transform: { scale: value } })} />
          <NumberField label="Density" value={state.shapeParameters?.density ?? 0.5} step={0.01} min={0.01} max={1} onCommit={(value) => patchState({ shapeParameters: { density: value } })} />
          {longAssemblyV2 && editScope === 'base' ? <>
            <NumberField label="Corridor width" value={state.shapeParameters?.widthScale ?? 1} step={0.01} min={0.5} max={1.6} onCommit={(value) => patchState({ shapeParameters: { widthScale: value } })} />
            <NumberField label="Corridor height" value={state.shapeParameters?.heightScale ?? 1} step={0.01} min={0.5} max={1.6} onCommit={(value) => patchState({ shapeParameters: { heightScale: value } })} />
            <NumberField label="Landmark spacing" value={state.shapeParameters?.depthScale ?? 1} step={0.01} min={0.65} max={1.35} onCommit={(value) => patchState({ shapeParameters: { depthScale: value } })} />
            <NumberField label="Opening circle size" value={state.shapeParameters?.signalRadius ?? 1.85} step={0.05} min={0.7} max={3} onCommit={(value) => patchState({ shapeParameters: { signalRadius: value } })} />
            <NumberField label="Opening circle height" value={state.shapeParameters?.signalYOffset ?? 2.7} step={0.05} min={-0.5} max={5} onCommit={(value) => patchState({ shapeParameters: { signalYOffset: value } })} />
            <NumberField label="Round hoop size" value={state.shapeParameters?.hoopRadius ?? 4.35} step={0.05} min={3} max={6} onCommit={(value) => patchState({ shapeParameters: { hoopRadius: value } })} />
            <NumberField label="Round hoop count" value={state.shapeParameters?.hoopCount ?? 18} step={1} min={10} max={26} onCommit={(value) => patchState({ shapeParameters: { hoopCount: value } })} />
            <NumberField label="Loop begins" value={state.shapeParameters?.loopStartWU ?? 7.9} step={0.05} min={7.6} max={9} onCommit={(value) => patchState({ shapeParameters: { loopStartWU: value } })} />
            <NumberField label="Loop completes" value={state.shapeParameters?.loopEndWU ?? 13.85} step={0.05} min={12.8} max={14.3} onCommit={(value) => patchState({ shapeParameters: { loopEndWU: value } })} />
            <NumberField label="Physical loop roll" value={state.shapeParameters?.loopRollDegrees ?? 360} step={5} min={-720} max={720} onCommit={(value) => patchState({ shapeParameters: { loopRollDegrees: value } })} />
            <NumberField label="Loop width" value={state.shapeParameters?.loopRadiusX ?? 9.5} step={0.1} min={6} max={14} onCommit={(value) => patchState({ shapeParameters: { loopRadiusX: value } })} />
            <NumberField label="Loop height" value={state.shapeParameters?.loopRadiusY ?? 8.7} step={0.1} min={5} max={12} onCommit={(value) => patchState({ shapeParameters: { loopRadiusY: value } })} />
            <NumberField label="Loop gate count" value={state.shapeParameters?.loopGateCount ?? 22} step={1} min={14} max={30} onCommit={(value) => patchState({ shapeParameters: { loopGateCount: value } })} />
            <NumberField label="Ocean arrival distance" value={state.shapeParameters?.terminalDistanceWU ?? 1.25} step={0.05} min={0.6} max={2.4} onCommit={(value) => patchState({ shapeParameters: { terminalDistanceWU: value } })} />
            <NumberField label="Ocean height" value={state.shapeParameters?.oceanHeight ?? -6.2} step={0.05} min={-8} max={2} onCommit={(value) => patchState({ shapeParameters: { oceanHeight: value } })} />
            <NumberField label="Ocean density" value={state.shapeParameters?.oceanDensity ?? 0.9} step={0.01} min={0.1} max={1} onCommit={(value) => patchState({ shapeParameters: { oceanDensity: value } })} />
            <NumberField label="Ocean wave height" value={state.shapeParameters?.oceanAmplitude ?? 2.05} step={0.01} min={0} max={3} onCommit={(value) => patchState({ shapeParameters: { oceanAmplitude: value } })} />
            <NumberField label="Ocean wave speed" value={state.shapeParameters?.oceanSpeed ?? 1.04} step={0.01} min={0} max={3} onCommit={(value) => patchState({ shapeParameters: { oceanSpeed: value } })} />
            <NumberField label="Ocean horizontal chop" value={state.shapeParameters?.oceanChop ?? 1.08} step={0.01} min={0} max={1.6} onCommit={(value) => patchState({ shapeParameters: { oceanChop: value } })} />
            <NumberField label="Ocean dot size" value={state.shapeParameters?.oceanPointScale ?? 1.18} step={0.01} min={0.5} max={1.6} onCommit={(value) => patchState({ shapeParameters: { oceanPointScale: value } })} />
            <NumberField label="Ocean horizon depth" value={state.shapeParameters?.oceanFogDistanceScale ?? 24} step={0.05} min={1} max={32} onCommit={(value) => patchState({ shapeParameters: { oceanFogDistanceScale: value } })} />
            <NumberField label="Splash activity" value={state.shapeParameters?.oceanSplashAmount ?? 1.2} step={0.01} min={0} max={1.5} onCommit={(value) => patchState({ shapeParameters: { oceanSplashAmount: value } })} />
            <NumberField label="Splash height" value={state.shapeParameters?.oceanSplashHeight ?? 4.4} step={0.05} min={0} max={6} onCommit={(value) => patchState({ shapeParameters: { oceanSplashHeight: value } })} />
          </> : null}
          {longAssemblyV2 ? (
            <p className="about-director-semantic-note">
              Story depth follows measured Text length. Opening, hoop, loop, and ocean controls update this one shared ride live. Full revolutions such as 360° and 720° finish level.
            </p>
          ) : null}
          {state.id === 'world-complexity' ? <>
            <NumberField label="Field depth" value={state.shapeParameters?.depth ?? 72} step={1} min={20} max={160} onCommit={(value) => patchState({ shapeParameters: { depth: value } })} />
            <NumberField label="Reading corridor" value={state.shapeParameters?.corridorRadius ?? 4.5} step={0.1} min={1} max={12} onCommit={(value) => patchState({ shapeParameters: { corridorRadius: value } })} />
            <NumberField label="Turbulence" value={state.shapeParameters?.turbulence ?? 0.72} step={0.01} min={0} max={2} onCommit={(value) => patchState({ shapeParameters: { turbulence: value } })} />
          </> : null}
          {state.id === 'world-grid' ? <>
            <NumberField label="Floor height" value={state.shapeParameters?.height ?? -1.72} step={0.05} min={-5} max={2} onCommit={(value) => patchState({ shapeParameters: { height: value } })} />
            <NumberField label="Grid noise" value={state.shapeParameters?.jitter ?? 0} step={0.01} min={0} max={1} onCommit={(value) => patchState({ shapeParameters: { jitter: value } })} />
          </> : null}
        </div>
      </section>
      <section className="about-director-semantic-group">
        <header><strong>Stage effects</strong><small>{effects.length}</small></header>
        <div className="about-director-effect-links">
          {effects.map((effect) => (
            <button type="button" key={effect.id} onClick={() => store.setSelection({ type: 'interaction', id: effect.id })}>
              <span>{DIRECTOR_EFFECT_LABELS[effect.id] || ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[effect.type]?.label || effect.type}</span><small>Tune</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function DirectorAnchorBindingFields({ document, label, trigger, onCommit }) {
  const moments = getAboutNarrativeStoryMoments(document);
  if (!trigger || !moments.length) return null;
  const storyLayout = compileAboutNarrativeStoryLayout(document, { profileId: 'desktop' });
  const gapAnchor = trigger.anchorType === 'gap' || Boolean(trigger.gapId);
  const momentLabelById = new Map(moments.map((moment) => [moment.id, moment.label]));
  return (
    <div className="about-director-moment-binding">
      <header><strong>{label}</strong><small>Moves every linked channel</small></header>
      <div className="about-director-moment-binding__fields">
        {gapAnchor ? (
          <>
            <SelectField
              label="Story gap"
              value={trigger.gapId}
              options={storyLayout.gaps.map((gap) => ({
                value: gap.id,
                label: `${momentLabelById.get(gap.fromFieldId)} → ${momentLabelById.get(gap.toFieldId)}`,
              }))}
              onCommit={(value) => onCommit({ ...trigger, gapId: value })}
            />
            <NumberField
              label="Position in gap"
              value={trigger.progress}
              min={0}
              max={1}
              step={0.05}
              onCommit={(value) => onCommit({ ...trigger, progress: value })}
            />
          </>
        ) : (
          <>
            <SelectField
              label="Text moment"
              value={trigger.momentId}
              options={moments.map((moment) => ({ value: moment.id, label: moment.label }))}
              onCommit={(value) => onCommit({ ...trigger, momentId: value })}
            />
            <SelectField
              label="Moment phase"
              value={trigger.phase}
              options={ABOUT_NARRATIVE_MOMENT_PHASES.map((phase) => ({ value: phase.id, label: phase.label }))}
              onCommit={(value) => onCommit({ ...trigger, phase: value })}
            />
          </>
        )}
        <NumberField
          label="Fine offset"
          value={trigger.offsetWU || 0}
          step={0.05}
          onCommit={(value) => onCommit({ ...trigger, offsetWU: value })}
        />
      </div>
      <p>{gapAnchor
        ? 'The gap stretches with the Story Stack; linked Camera, Wave, Form, and Effect owners keep their relative handoff position.'
        : 'This derived Text anchor updates its linked Camera, Wave, Form, and Effect owners together.'}</p>
    </div>
  );
}

function DirectorFinaleHandoffInspector({ snapshot, store }) {
  const selection = snapshot.selection;
  const runtimeDocument = snapshot.compiledPlan?.model || snapshot.document;
  const ripple = getAboutNarrativeTrackObject(snapshot.document, selection);
  const runtimeRipple = getAboutNarrativeTrackObject(runtimeDocument, selection) || ripple;
  const orbit = snapshot.document.tracks.camera.orbit;
  const runtimeOrbit = runtimeDocument.tracks.camera.orbit || orbit;
  const bustEffect = snapshot.document.tracks.interactions.clips.find((effect) => effect.id === 'effect-world-emergent-bust-assembly');
  const runtimeBustEffect = runtimeDocument.tracks.interactions.clips.find((effect) => effect.id === 'effect-world-emergent-bust-assembly') || bustEffect;
  const bustArrival = snapshot.document.tracks.pointField.keys.find((key) => key.id === 'key-world-emergent-arrival');
  const runtimeBustArrival = runtimeDocument.tracks.pointField.keys.find((key) => key.id === 'key-world-emergent-arrival') || bustArrival;
  const finaleMoment = snapshot.document.tracks.text.fields.find((field) => field.id === 'text-epilogue-invitation');
  const runtimeFinaleMoment = runtimeDocument.tracks.text.fields.find((field) => field.id === 'text-epilogue-invitation') || finaleMoment;
  const storyLayout = snapshot.compiledPlan?.storyLayout
    || compileAboutNarrativeStoryLayout(snapshot.document, { profileId: 'desktop' });
  if (!ripple) return null;
  const commitRipple = (label, mutate) => store.commit(label, (draft) => {
    const target = getAboutNarrativeTrackObject(draft, selection);
    if (target) mutate(target, draft);
  }, { selectionAfter: selection, requireValid: true });
  const commitOrbitBinding = (trigger) => store.commit('Move shared orbit anchor', (draft) => {
    const draftOrbit = draft.tracks.camera.orbit;
    const draftRipple = draft.tracks.interactions.clips.find((effect) => effect.id === ripple.id);
    if (!draftOrbit || !draftRipple) return;
    setAboutNarrativeMomentTrigger(
      draft,
      { type: 'camera-orbit', id: draftOrbit.id },
      trigger,
      { storyLayout },
    );
    ['moveKeys', 'lookKeys', 'lensKeys'].forEach((lane) => {
      const key = draft.tracks.camera[lane]?.find((item) => item.id.endsWith('bust-orbit-start'));
      if (!key) return;
      const type = lane === 'moveKeys'
        ? 'camera-key'
        : lane === 'lookKeys' ? 'camera-orientation-key' : 'camera-lens-key';
      setAboutNarrativeMomentTrigger(draft, { type, id: key.id }, trigger, { storyLayout });
    });
    draftRipple.parameters.releaseWU = cleanWU(
      Number(draftRipple.endWU) - Number(draftOrbit.startWU),
    );
  }, { selectionAfter: selection, requireValid: true });
  const commitBustStartBinding = (trigger) => store.commit('Move shared bust anchor', (draft) => {
    const draftRipple = draft.tracks.interactions.clips.find((effect) => effect.id === ripple.id);
    const draftBust = draft.tracks.interactions.clips.find((effect) => effect.id === bustEffect?.id);
    const departure = draft.tracks.pointField.keys.find((key) => key.id === 'key-world-emergent-departure');
    if (!draftRipple || !draftBust || !departure) return;
    setAboutNarrativeMomentTrigger(
      draft,
      { type: 'interaction', id: draftRipple.id },
      trigger,
      { bindingKey: 'endTrigger', storyLayout },
    );
    setAboutNarrativeMomentTrigger(
      draft,
      { type: 'interaction', id: draftBust.id },
      trigger,
      { storyLayout },
    );
    setAboutNarrativeMomentTrigger(
      draft,
      { type: 'point-field-key', id: departure.id },
      trigger,
      { storyLayout },
    );
    draftRipple.parameters.releaseWU = cleanWU(
      Number(draftRipple.endWU) - Number(draft.tracks.camera.orbit?.startWU || draftRipple.endWU),
    );
  }, { selectionAfter: selection, requireValid: true });
  return (
    <div className="about-track-editor-inspector__content about-director-semantic-inspector" data-director-finale-handoff>
      <header><span>Coordinated sequence</span><h2>Finale handoff</h2><code>Waves → orbit → bust</code></header>
      <p className="about-track-editor-parameter-note is-wide">These controls describe one continuous acceleration curve. Text focus remains a fixed recognition checkpoint.</p>
      <div className="about-director-handoff-map" aria-label="Finale handoff anchors">
        <span><b>1</b><strong>Waves soften in</strong><small>{(Number(runtimeRipple.activationWU) - Number(runtimeRipple.startWU)).toFixed(2)} lead</small></span>
        <span><b>2</b><strong>Orbit begins</strong><small>{Number(runtimeOrbit?.startWU).toFixed(2)}</small></span>
        <span><b>3</b><strong>Bust starts</strong><small>{Number(runtimeBustEffect?.startWU).toFixed(2)}</small></span>
        <span className="is-fixed"><b>4</b><strong>Bust recognisable</strong><small>Fixed at text focus {Number(runtimeFinaleMoment?.focusWU).toFixed(2)}</small></span>
        <span><b>5</b><strong>Bust resolves</strong><small>{Number(runtimeBustArrival?.atWU).toFixed(2)}</small></span>
      </div>
      <section className="about-director-semantic-group">
        <header><strong>Wave envelope</strong><small>Soft · sustain · release</small></header>
        <div className="about-track-editor-fields">
          <NumberField label="Soft entrance" value={cleanWU(Number(runtimeRipple.activationWU) - Number(runtimeRipple.startWU))} step={0.05} min={0.1} max={4} onCommit={(value) => commitRipple('Edit wave entrance', (target) => { target.startWU = cleanWU(Number(target.activationWU) - value); })} />
          <NumberField label="Peak strength" value={ripple.parameters?.amplitude ?? 1} step={0.05} min={0} max={3} onCommit={(value) => commitRipple('Edit wave strength', (target) => { target.parameters.amplitude = value; })} />
          <NumberField label="Wave speed" value={ripple.parameters?.speed ?? 0.38} step={0.01} min={0.05} max={2} onCommit={(value) => commitRipple('Edit wave speed', (target) => { target.parameters.speed = value; })} />
          <NumberField label="Wave frequency" value={ripple.parameters?.frequency ?? 1.65} step={0.05} min={0.1} max={5} onCommit={(value) => commitRipple('Edit wave frequency', (target) => { target.parameters.frequency = value; })} />
          <NumberField label="Calculated release" value={runtimeRipple.parameters?.releaseWU ?? 0} disabled step={0.05} onCommit={() => {}} />
        </div>
      </section>
      <section className="about-director-semantic-group">
        <header><strong>Shared anchors</strong><small>Bound to story moments</small></header>
        <MomentBindingFields document={snapshot.document} store={store} selection={selection} selectionAfter={selection} label="Waves reach full energy" />
        {orbit ? <DirectorAnchorBindingFields document={snapshot.document} label="Orbit begins" trigger={orbit.trigger} onCommit={commitOrbitBinding} /> : null}
        {bustEffect ? <DirectorAnchorBindingFields document={snapshot.document} label="Bust starts" trigger={bustEffect.trigger} onCommit={commitBustStartBinding} /> : null}
        {bustArrival ? <MomentBindingFields document={snapshot.document} store={store} selection={{ type: 'point-field-key', id: bustArrival.id }} selectionAfter={selection} label="Bust resolves" /> : null}
      </section>
      <section className="about-director-semantic-group">
        <header><strong>Orbit</strong><small>Continues with further scrolling</small></header>
        <div className="about-track-editor-fields">
          <NumberField label="Initial arc" value={orbit?.arcDegrees ?? 360} step={5} min={-360} max={360} onCommit={(value) => store.commit('Edit orbit arc', (draft) => { draft.tracks.camera.orbit.arcDegrees = value; }, { selectionAfter: selection, requireValid: true })} />
          <SelectField label="Orbit curve" value={orbit?.easing || 'smoothstep'} options={ABOUT_NARRATIVE_CAMERA_EASINGS.map((value) => ({ value, label: value }))} onCommit={(value) => store.commit('Edit orbit curve', (draft) => { draft.tracks.camera.orbit.easing = value; }, { selectionAfter: selection, requireValid: true })} />
        </div>
      </section>
    </div>
  );
}

function DirectorPageParametersInspector({ snapshot, store }) {
  const selection = { type: 'track', id: 'effects' };
  const rideState = snapshot.document.tracks.pointField.stateDefinitions.find(
    (state) => state.shapeId === 'long-assembly-corridor-v1',
  );
  const parameterCount = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.reduce(
    (count, group) => count + group.controls.length,
    0,
  );
  const readValue = (entry) => {
    if (entry.scope === 'long-assembly') {
      return rideState?.shapeParameters?.[entry.control.id];
    }
    return entry.path.reduce((value, key) => value?.[key], snapshot.document.globals);
  };
  const mutateValue = (draft, entry, value) => {
    if (entry.scope === 'long-assembly') {
      const target = draft.tracks.pointField.stateDefinitions.find(
        (state) => state.id === rideState?.id,
      );
      if (target) target.shapeParameters[entry.control.id] = value;
      return;
    }
    const leaf = entry.path.at(-1);
    const target = entry.path.slice(0, -1).reduce((object, key) => object[key], draft.globals);
    target[leaf] = value;
  };
  const bindRange = (entry) => {
    const label = `Edit page ${entry.control.label}`;
    const mutate = (draft, value) => mutateValue(draft, entry, value);
    return {
      onBegin: () => store.beginGesture(label, { selection }),
      onPreview: (value) => store.updateGesture(
        (draft) => mutate(draft, value),
        { selection },
      ),
      onFinish: () => store.commitGesture({ selectionAfter: selection, requireValid: true }),
      onCancel: () => store.cancelGesture(),
      onCommit: (value) => store.commit(label, (draft) => mutate(draft, value), {
        selectionAfter: selection,
        requireValid: true,
      }),
    };
  };

  return (
    <div
      className="about-track-editor-inspector__content about-director-semantic-inspector about-director-page-parameters"
      data-director-page-parameters
    >
      <header>
        <span>Whole-page controls</span>
        <h2>Page parameters</h2>
        <code>{parameterCount} live controls · {ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.length} categories · 85° FOV</code>
      </header>
      <p className="about-track-editor-parameter-note is-wide">
        Tune the high-impact parts of the ride from one place. Every value updates the current
        preview and saves to the canonical contents-about.json document. Lower-level implementation
        values stay fixed.
      </p>
      <div className="about-track-editor-world-folders">
        {ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.map((group, groupIndex) => (
          <InspectorFolder
            key={group.id}
            group={group}
            count={group.controls.length}
            defaultOpen={groupIndex === 0}
          >
            <div className="about-track-editor-shape-controls">
              {group.controls.map((entry) => (
                <RangeParameterField
                  key={`${entry.scope}-${entry.path.join('.')}`}
                  label={entry.control.label}
                  ariaLabel={`${group.label} ${entry.control.label}`}
                  value={readValue(entry)}
                  control={entry.control}
                  {...bindRange(entry)}
                />
              ))}
            </div>
          </InspectorFolder>
        ))}
      </div>
    </div>
  );
}

function ObjectInspector({ experienceVersion = 'v1', snapshot, store, editScope, detailMode = 'advanced' }) {
  const selection = snapshot.selection;
  const pointFieldV6 = Number(snapshot.document.schemaVersion)
    === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  if (pointFieldV6 && experienceVersion === 'v2'
    && selection.type === 'track' && selection.id === 'effects') {
    return <DirectorPageParametersInspector snapshot={snapshot} store={store} />;
  }
  if (pointFieldV6 && detailMode === 'director') {
    if (selection.type === 'track' && selection.id === 'text') return <DirectorStoryStackInspector snapshot={snapshot} store={store} />;
    if (selection.type === 'track' && selection.id === 'camera') return <DirectorCameraTrackInspector experienceVersion={experienceVersion} snapshot={snapshot} store={store} />;
    if (selection.type === 'camera-key') return <DirectorCameraBeatInspector experienceVersion={experienceVersion} snapshot={snapshot} store={store} />;
    if (selection.type === 'track' && selection.id === 'point-field') return <DirectorWorldTrackInspector experienceVersion={experienceVersion} snapshot={snapshot} store={store} />;
    if (selection.type === 'point-field-key') return <DirectorWorldStageInspector experienceVersion={experienceVersion} snapshot={snapshot} store={store} editScope={editScope} />;
    if (selection.type === 'interaction' && selection.id === 'interaction-grid-ripple') return <DirectorFinaleHandoffInspector snapshot={snapshot} store={store} />;
  }
  if (pointFieldV6 && selection.type === 'track' && selection.id === 'point-field') {
    return <FormSequenceTrackInspector snapshot={snapshot} store={store} />;
  }
  if (pointFieldV6 && (
    POINT_FIELD_SELECTION_TYPES.has(selection.type)
    || (selection.type === 'track' && selection.id === 'point-field')
  )) {
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
        fixedStructure={experienceVersion === 'v2'}
        onSelect={(nextSelection) => store.pointField.select(nextSelection)}
        onEdit={editPointField}
        momentBinding={selection.type === 'point-field-key' ? (
          <MomentBindingFields
            document={snapshot.document}
            store={store}
            selection={selection}
            disabled={getAboutNarrativeMomentTarget(snapshot.document, selection)?.object?.protected === true}
          />
        ) : null}
        sequencePanel={selection.type === 'point-field-key' ? (
          <FormSequencePanel
            snapshot={snapshot}
            store={store}
            pointKey={snapshot.document.tracks.pointField.keys.find((key) => key.id === selection.id)}
            onSelectEffect={(effect) => {
              store.setSelection({ type: 'interaction', id: effect.id });
              store.setTransport({
                owner: 'timeline',
                playing: false,
                storyWU: Number(effect.activationWU),
              });
            }}
          />
        ) : null}
        onResetOverride={(options) => store.pointField.resetOverride(options)}
        onMakeUnique={(options) => store.pointField.makeKeyStateUnique(options)}
        onDuplicateState={(options) => store.pointField.duplicateState(options)}
        onDeleteState={(options) => store.pointField.deleteState(options)}
        onSplitSegment={(options) => store.pointField.splitSegment(options)}
      />
    );
  }
  const object = getAboutNarrativeTrackObject(snapshot.document, selection);
  const storyLayoutField = selection.type === 'text-field'
    ? snapshot.compiledPlan?.storyLayout?.fields?.find((field) => field.id === selection.id)
    : null;
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
  const interactionSequence = selection.type === 'interaction'
    ? getAboutNarrativeFormSequence(
      snapshot.document.tracks.pointField,
      snapshot.document.profiles.desktop.storyDurationWU,
    ).find((range) => (
      range.stateId === object?.targetStateId
      && Number(object?.activationWU) >= Number(range.startWU) - 0.000001
      && Number(object?.activationWU) <= Number(range.endWU) + 0.000001
    ))
    : null;
  const interactionSequenceKey = interactionSequence
    ? snapshot.document.tracks.pointField.keys.find((key) => key.id === interactionSequence.toKeyId)
    : null;
  if (!object && selection.type === 'track' && selection.id === 'camera') {
    return <CameraTrackInspector snapshot={snapshot} store={store} />;
  }
  if (!object && selection.type === 'track' && selection.id === 'material') {
    return <PointMaterialTrackInspector experienceVersion={experienceVersion} snapshot={snapshot} store={store} />;
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
          ? selection.id === 'interaction'
            ? 'Effects form one sequence with no overlaps. Move or resize an Effect around the fixed Text moments; each Effect stays inside the interval owned by its target Form.'
            : 'Text is the fixed page ruler. Move Camera, Forms, Visibility, and Effects around its moment bindings; transition bands shape how the same dots move.'
          : 'Drag Text and Motion edges to set their windows. World ends ripple every later World without gaps; Camera and Visibility keys remain points.'}</p>
      </div>
    );
  }

  const finaleWorld = selection.type === 'world' && object.protected === true;
  const cameraObject = CAMERA_SELECTION_TYPES.has(selection.type);
  const locked = (object.locked === true || object.protected === true)
    && !finaleWorld
    && !cameraObject;
  const commit = (label, mutate) => store.commit(label, (draft) => {
    const target = getAboutNarrativeTrackObject(draft, selection);
    if (target) mutate(target, draft);
  }, { selectionAfter: selection, requireValid: true });
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
  const cameraEasingContext = selection.type === 'camera-key'
    ? resolveAboutNarrativeCameraKeyEasingHandles(
      snapshot.document.tracks.camera.moveKeys || snapshot.document.tracks.camera.keys,
      selection.id,
    )
    : selection.type === 'camera-orientation-key'
      ? resolveAboutNarrativeCameraKeyEasingHandles(
        snapshot.document.tracks.camera.lookKeys || snapshot.document.tracks.camera.orientationKeys || [],
        selection.id,
      )
      : selection.type === 'camera-lens-key'
        ? resolveAboutNarrativeCameraKeyEasingHandles(
          snapshot.document.tracks.camera.lensKeys || [],
          selection.id,
        )
    : null;
  const inspectorTypeLabel = {
    'camera-key': 'camera move',
    'camera-orientation-key': 'camera look',
    'camera-lens-key': 'camera lens',
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
  return (
    <div className="about-track-editor-inspector__content">
      <header>
        <span>{inspectorTypeLabel}</span>
        <h2>{getObjectLabel(object, selection.type)}</h2>
        <code>{object.id}</code>
        {locked ? <b>{selection.type === 'visibility-key' ? 'Timing protected' : 'Protected'}</b> : null}
      </header>

      {[...CAMERA_SELECTION_TYPES, 'visibility-key', 'interaction'].includes(selection.type) ? (
        <MomentBindingFields
          document={snapshot.document}
          store={store}
          selection={selection}
          disabled={locked}
        />
      ) : null}

      {selection.type === 'camera-key' ? (
        <div className="about-track-editor-fields">
          <p className="about-track-editor-parameter-note is-wide">Move owns XYZ only. Look and Lens continue on independent lanes, so changing travel cannot reset the pitch or FOV.</p>
          <InspectorFolder group={{ id: 'camera-essentials', label: 'Essentials' }} count={4} defaultOpen>
            <div className="about-track-editor-camera-rig">
              <section className="about-track-editor-camera-rig__group">
                <span>Position</span>
                {ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS
                    .filter((control) => control.group === 'position')
                    .map((control) => {
                      const axis = Number(control.id.split('.')[1]);
                      return (
                        <RangeParameterField
                          key={control.id}
                          label={control.label}
                          ariaLabel={`Camera move ${control.label}`}
                          value={object.position?.[axis] ?? 0}
                          control={control}
                          precisionWindow={2}
                          rangeKey={`${object.id}:${control.id}`}
                          {...bindObjectRange(`Edit Camera ${control.label}`, (target, next) => {
                            target.position[axis] = next;
                          })}
                        />
                      );
                    })}
              </section>
            </div>
            <SelectField
              label="Velocity"
              value={object.velocityMode || 'eased'}
              options={[
                { value: 'fluid', label: 'Fluid' },
                { value: 'constant', label: 'Constant' },
                { value: 'eased', label: 'Eased' },
              ]}
              onCommit={(value) => commit('Edit Camera velocity mode', (target) => { target.velocityMode = value; })}
            />
          </InspectorFolder>
          <InspectorFolder group={{ id: 'camera-easing', label: 'Curve' }} count={2}>
            <CameraKeyframeEasingField
              context={cameraEasingContext}
              description={object.velocityMode === 'constant'
                ? 'Constant velocity uses a linear segment. Change Velocity to Eased to shape this curve.'
                : object.velocityMode === 'fluid'
                  ? 'Fluid velocity keeps one continuous tangent through adjacent Move keys. Curve handles do not interrupt the path.'
                  : 'These handles shape translation only.'}
              onBegin={(direction) => store.beginGesture(
                `Shape Camera Move ${direction === 'incoming' ? 'ease in' : 'ease out'}`,
                { selection },
              )}
              onPreview={(direction, value) => store.updateGesture((draft) => {
                setAboutNarrativeCameraKeyEasingStrength(
                  draft.tracks.camera.moveKeys,
                  selection.id,
                  direction,
                  value,
                );
              }, { selection })}
              onFinish={() => store.commitGesture({ selectionAfter: selection, requireValid: true })}
              onCancel={() => store.cancelGesture()}
              onCommit={(direction, value) => commit(
                `Edit Camera ${direction === 'incoming' ? 'ease in' : 'ease out'}`,
                (_target, draft) => setAboutNarrativeCameraKeyEasingStrength(
                  draft.tracks.camera.moveKeys,
                  selection.id,
                  direction,
                  value,
                ),
              )}
              onPreset={(preset) => commit(
                `Apply Camera ${preset.label} easing`,
                (_target, draft) => {
                  ['incoming', 'outgoing'].forEach((direction) => {
                    setAboutNarrativeCameraKeyEasingStrength(
                      draft.tracks.camera.moveKeys,
                      selection.id,
                      direction,
                      preset[direction],
                    );
                  });
                },
              )}
            />
          </InspectorFolder>
        </div>
      ) : null}

      {selection.type === 'camera-orientation-key' ? (
        <div className="about-track-editor-fields">
          <p className="about-track-editor-parameter-note is-wide">
            {experienceVersion === 'v2'
              ? 'The corridor owns pitch and yaw. This key adds a smooth local roll to the physical track bank; Move and Lens remain independent.'
              : 'Look owns pitch, yaw, and roll across the complete story. Move and Lens continue independently.'}
          </p>
          <InspectorFolder group={{ id: 'camera-orientation', label: 'Essentials' }} count={experienceVersion === 'v2' ? 1 : 3} defaultOpen>
            <div className="about-track-editor-camera-rig">
              <section className="about-track-editor-camera-rig__group">
                <span>{experienceVersion === 'v2' ? 'Ride roll' : 'Rotation'}</span>
                {experienceVersion === 'v2' ? (
                  <RangeParameterField
                    label={CAMERA_ROLL_OFFSET_CONTROL.label}
                    ariaLabel={`Camera look ${CAMERA_ROLL_OFFSET_CONTROL.label}`}
                    value={object.rollOffset ?? 0}
                    control={CAMERA_ROLL_OFFSET_CONTROL}
                    precisionWindow={90}
                    rangeKey={`${object.id}:${CAMERA_ROLL_OFFSET_CONTROL.id}`}
                    {...bindObjectRange('Edit Camera look roll', (target, next) => {
                      target.rollOffset = next;
                    })}
                  />
                ) : ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS
                  .filter((control) => control.group === 'rotation')
                  .map((control) => {
                    const axis = Number(control.id.split('.')[1]);
                    return (
                      <RangeParameterField
                        key={control.id}
                        label={control.label}
                        ariaLabel={`Camera look ${control.label}`}
                        value={object.rotation?.[axis] ?? 0}
                        control={control}
                        precisionWindow={45}
                        rangeKey={`${object.id}:${control.id}`}
                        {...bindObjectRange(`Edit Camera look ${control.label}`, (target, next) => {
                          target.rotation[axis] = next;
                        })}
                      />
                    );
                  })}
              </section>
            </div>
          </InspectorFolder>
          <InspectorFolder group={{ id: 'camera-orientation-easing', label: 'Curve' }} count={2}>
            <CameraKeyframeEasingField
              context={cameraEasingContext}
              description="These handles shape angular velocity only. Move and Lens keep their own timing."
              onBegin={(direction) => store.beginGesture(
                `Shape Camera Look ${direction === 'incoming' ? 'ease in' : 'ease out'}`,
                { selection },
              )}
              onPreview={(direction, value) => store.updateGesture((draft) => {
                setAboutNarrativeCameraKeyEasingStrength(
                  draft.tracks.camera.lookKeys,
                  selection.id,
                  direction,
                  value,
                );
              }, { selection })}
              onFinish={() => store.commitGesture({ selectionAfter: selection, requireValid: true })}
              onCancel={() => store.cancelGesture()}
              onCommit={(direction, value) => commit(
                `Edit Camera Look ${direction === 'incoming' ? 'ease in' : 'ease out'}`,
                (_target, draft) => setAboutNarrativeCameraKeyEasingStrength(
                  draft.tracks.camera.lookKeys,
                  selection.id,
                  direction,
                  value,
                ),
              )}
              onPreset={(preset) => commit(
                `Apply Camera Look ${preset.label} easing`,
                (_target, draft) => {
                  ['incoming', 'outgoing'].forEach((direction) => {
                    setAboutNarrativeCameraKeyEasingStrength(
                      draft.tracks.camera.lookKeys,
                      selection.id,
                      direction,
                      preset[direction],
                    );
                  });
                },
              )}
            />
          </InspectorFolder>
        </div>
      ) : null}

      {selection.type === 'camera-lens-key' ? (
        <div className="about-track-editor-fields">
          <p className="about-track-editor-parameter-note is-wide">
            Lens owns FOV only. Camera position and orientation continue unchanged.
          </p>
          <InspectorFolder group={{ id: 'camera-lens', label: 'Essentials' }} count={1} defaultOpen>
            <RangeParameterField
              label="Field of view"
              ariaLabel="Camera field of view"
              value={object.fov}
              control={{ id: 'fov', min: 20, max: 100, step: 0.1, unit: '°' }}
              precisionWindow={15}
              rangeKey={`${object.id}:fov`}
              {...bindObjectRange('Edit Camera field of view', (target, next) => { target.fov = next; })}
            />
          </InspectorFolder>
          <InspectorFolder group={{ id: 'camera-lens-easing', label: 'Curve' }} count={2}>
            <CameraKeyframeEasingField
              context={cameraEasingContext}
              description="These handles shape FOV only. Move and Look keep their own timing."
              onBegin={(direction) => store.beginGesture(
                `Shape Camera Lens ${direction === 'incoming' ? 'ease in' : 'ease out'}`,
                { selection },
              )}
              onPreview={(direction, value) => store.updateGesture((draft) => {
                setAboutNarrativeCameraKeyEasingStrength(
                  draft.tracks.camera.lensKeys,
                  selection.id,
                  direction,
                  value,
                );
              }, { selection })}
              onFinish={() => store.commitGesture({ selectionAfter: selection, requireValid: true })}
              onCancel={() => store.cancelGesture()}
              onCommit={(direction, value) => commit(
                `Edit Camera Lens ${direction === 'incoming' ? 'ease in' : 'ease out'}`,
                (_target, draft) => setAboutNarrativeCameraKeyEasingStrength(
                  draft.tracks.camera.lensKeys,
                  selection.id,
                  direction,
                  value,
                ),
              )}
              onPreset={(preset) => commit(
                `Apply Camera Lens ${preset.label} easing`,
                (_target, draft) => {
                  ['incoming', 'outgoing'].forEach((direction) => {
                    setAboutNarrativeCameraKeyEasingStrength(
                      draft.tracks.camera.lensKeys,
                      selection.id,
                      direction,
                      preset[direction],
                    );
                  });
                },
              )}
            />
          </InspectorFolder>
        </div>
      ) : null}

      {selection.type === 'visibility-key' ? (
        <div className="about-track-editor-fields">
          {locked ? <p className="about-track-editor-parameter-note is-wide">This boundary key stays tied to its Text moment; its visibility and outgoing fade easing remain editable.</p> : null}
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
          {detailMode === 'director' && object.flow ? (
            <>
              <NumberField
                label="Minimum section length"
                value={object.flow.minScreens}
                min={0.2}
                max={12}
                step={0.05}
                onCommit={(value) => commit('Edit Story block minimum length', (target) => {
                  target.flow.minScreens = value;
                })}
              />
              <NumberField
                label="Calculated length"
                value={storyLayoutField?.durationWU ?? object.flow.minScreens}
                disabled
                step={0.01}
                onCommit={() => {}}
              />
              <SelectField
                label="Gap after"
                value={object.flow.gapAfter}
                options={Object.keys(ABOUT_NARRATIVE_STORY_GAP_PRESETS).map((value) => ({
                  value,
                  label: titleCase(value),
                }))}
                onCommit={(value) => commit('Edit Story block gap', (target) => {
                  target.flow.gapAfter = value;
                })}
              />
              <SelectField
                label="Focus point"
                value={object.flow.focusMode}
                options={ABOUT_NARRATIVE_STORY_FOCUS_MODES.map((value) => ({
                  value,
                  label: value === 'reading-start' ? 'Reading start' : 'Middle',
                }))}
                onCommit={(value) => commit('Edit Story block focus', (target) => {
                  target.flow.focusMode = value;
                  delete target.flow.focusOffsetScreens;
                })}
              />
              <p className="about-track-editor-parameter-note is-wide">
                Copy height sets the calculated length. The minimum prevents a short block from
                rushing past; the named gap adds intentional breathing room after it. Camera,
                Forms, and Effects follow the derived Enter, Focus, and Exit anchors.
              </p>
            </>
          ) : (
            <>
              <NumberField label="Enter WU" value={object.startWU} disabled onCommit={() => {}} />
              <NumberField label="Focus WU" value={object.focusWU} disabled onCommit={() => {}} />
              <NumberField label="Exit WU" value={object.endWU} disabled onCommit={() => {}} />
              <p className="about-track-editor-parameter-note is-wide">
                Advanced shows the persisted timing cache for diagnostics. Director derives the
                live anchors from Story Stack content and gaps.
              </p>
            </>
          )}
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
              <SelectField label="Title style" value={object.titleStyle || (object.preset === 'opener-v1' || object.preset === 'finale-v1' ? 'display' : 'standard')} disabled={locked} options={ABOUT_NARRATIVE_TITLE_STYLES.map((value) => ({ value, label: value === 'display' ? 'Display · Instrument' : 'Narrative · Instrument' }))} onCommit={(value) => commit('Edit Title style', (target) => { target.titleStyle = value; })} />
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
                    value={object.block?.moduleGapRem ?? 4.6}
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
                object.block?.kind === 'disciplines' ? (
                  <StructuredDisciplineItemsEditor
                    items={object.block?.items || []}
                    path={`${textBlockPath}.items`}
                    diagnostics={editorDiagnostics}
                    disabled={locked}
                    onChange={(items, label) => commit(label, (target) => { target.block.items = items; })}
                  />
                ) : ['clients', 'list'].includes(object.block?.kind) ? (
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
          {pointFieldV6 && interactionSequenceKey ? (
            <FormSequencePanel
              snapshot={snapshot}
              store={store}
              pointKey={interactionSequenceKey}
              onSelectEffect={(effect) => {
                store.setSelection({ type: 'interaction', id: effect.id });
                store.setTransport({
                  owner: 'timeline',
                  playing: false,
                  storyWU: Number(effect.activationWU),
                });
              }}
            />
          ) : null}
          <InspectorFolder
            group={{ id: `effect-properties-${object.id}`, label: 'Effect properties' }}
            count={ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[object.type]?.parameters.length || 1}
            defaultOpen
          >
            <MomentBindingFields
              document={snapshot.document}
              store={store}
              selection={selection}
              bindingKey="endTrigger"
              disabled={locked}
              label="Effect ends"
            />
          {object.type === 'grid-ripple' ? (
            <>
              <RangeParameterField
                label="Soft-start lead"
                ariaLabel="Ripple soft-start lead"
                value={Math.max(0, Number(object.activationWU) - Number(object.startWU))}
                control={{
                  id: 'attackLeadWU',
                  min: 0,
                  max: Math.max(0.1, Number(object.activationWU)),
                  step: GRID_RIPPLE_START_STEP_WU,
                  unit: ' WU',
                }}
                disabled={locked}
                {...bindObjectRange('Edit ripple soft-start lead', (target, value) => {
                  target.startWU = cleanWU(Math.max(0, Number(target.activationWU) - Number(value)));
                })}
              />
              <p className="about-track-editor-parameter-note is-wide">
                Sets how early the waves begin to gather before the Text-owned full-strength moment.
              </p>
            </>
          ) : (
            <NumberField
              label="Attack lead WU"
              value={Math.max(0, Number(object.activationWU) - Number(object.startWU))}
              disabled={locked}
              min={0}
              max={Math.max(0, Number(object.activationWU))}
              onCommit={(value) => commit('Edit effect attack lead', (target) => {
                target.startWU = cleanWU(Math.max(0, Number(target.activationWU) - Number(value)));
              })}
            />
          )}
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
          {object.type === 'state-effect' ? (
            <>
              <SelectField
                label="Effect"
                value={object.parameters?.effectId || 'ambient-drift-v1'}
                disabled={locked}
                options={Object.values(ABOUT_NARRATIVE_MODIFIER_DEFINITIONS).map((definition) => ({
                  value: definition.id,
                  label: definition.label,
                }))}
                onCommit={(value) => commit('Change state effect', (target) => {
                  const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[value];
                  target.parameters = {
                    effectId: value,
                    releaseWU: Number(target.parameters?.releaseWU || 0),
                    ...Object.fromEntries((definition?.parameters || [])
                      .filter((control) => control.id !== 'timeMode')
                      .map((control) => [control.id, control.min ?? control.options?.[0] ?? 0])),
                  };
                })}
              />
              {(ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[object.parameters?.effectId]?.parameters || [])
                .filter((control) => control.id !== 'timeMode')
                .map((control) => (control.type === 'select' ? (
                  <SelectField
                    key={control.id}
                    label={control.label}
                    value={object.parameters?.[control.id]}
                    disabled={locked}
                    options={control.options.map((value) => ({ value, label: value }))}
                    onCommit={(value) => commit(`Edit ${control.label}`, (target) => { target.parameters[control.id] = value; })}
                  />
                ) : (
                  <RangeParameterField
                    key={control.id}
                    label={control.label}
                    ariaLabel={`Effect ${control.label}`}
                    value={object.parameters?.[control.id] ?? control.min ?? 0}
                    control={control}
                    disabled={locked}
                    {...bindObjectRange(`Edit ${control.label}`, (target, value) => { target.parameters[control.id] = value; })}
                  />
                )))}
              <RangeParameterField
                label="Release"
                ariaLabel="Effect release"
                value={object.parameters?.releaseWU || 0}
                control={{ id: 'releaseWU', min: 0, max: 4, step: 0.01, unit: 'WU' }}
                disabled={locked}
                {...bindObjectRange('Edit effect release', (target, value) => { target.parameters.releaseWU = value; })}
              />
            </>
          ) : null}
          {ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[object.type]?.parameters
            .filter((control) => control.group)
            .map((control) => {
            const controlValue = object.parameters?.[control.id]
              ?? ABOUT_NARRATIVE_INTERACTION_DEFINITIONS[object.type]
                ?.defaultParameters?.[control.id];
            if (control.type === 'select') {
              return (
                <SelectField
                  key={control.id}
                  label={control.label}
                  value={controlValue}
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
                value={controlValue}
                control={control}
                disabled={locked}
                {...bindObjectRange(`Edit ${control.label}`, (target, value) => {
                  target.parameters[control.id] = value;
                })}
              />
            );
          })}
          </InspectorFolder>
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
    return ['camera', 'camera-orientation', 'camera-lens', 'visibility', 'material', 'text', 'point-field', 'effects'].includes(selection.id);
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
  if (selectionType === 'camera-orientation-key') {
    const axis = Number(leaf);
    const field = parts.at(-2);
    const control = ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS.find((candidate) => (
      candidate.id === `${field}.${axis}` || candidate.id === leaf
    ));
    if (control) return { folder: 'Tilt orientation', label: control.label };
    if (leaf === 'easing') return { ariaLabel: 'Camera keyframe easing presets' };
    return { label: humanizeDiagnosticProperty(leaf) };
  }
  if (selectionType === 'camera-lens-key') {
    if (leaf === 'easing') return { ariaLabel: 'Camera keyframe easing presets' };
    return { folder: 'Essentials', label: leaf === 'fov' ? 'Field of view' : humanizeDiagnosticProperty(leaf) };
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

export default function AboutNarrativeEditor({
  experienceVersion = 'v2',
  persistenceScope = 'main',
  store,
  rootRef,
  previewOnly = false,
}) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const schemaVersion = Number(snapshot.document.schemaVersion);
  const pointFieldV6 = schemaVersion === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  const persistenceTargetVersion = pointFieldV6
    ? ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION
    : 5;
  const persistenceOptions = useMemo(() => ({
    scope: persistenceScope,
    targetVersion: persistenceTargetVersion,
  }), [persistenceScope, persistenceTargetVersion]);
  const exportFileName = 'contents-about.json';
  const previewBaselineHash = publicPreviewBaselineHash(persistenceTargetVersion);
  const [initialPreviewLocalSave] = useState(() => (previewOnly
    ? readAboutNarrativeLocalSave(persistenceOptions)
    : null));
  const [editorVisible, setEditorVisible] = useState(true);
  const [editScope, setEditScope] = useState('base');
  const [zoom, setZoom] = useState(1);
  const [timelineDock, setTimelineDock] = useState('expanded');
  const [detailMode, setDetailMode] = useState('director');
  const [showAllTracks, setShowAllTracks] = useState(false);
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
      const remote = await loadAboutNarrativeSource(persistenceOptions);
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
  }, [persistenceOptions, store]);

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
          ...persistenceOptions,
        });
        const reconciliation = store.markSaved(
          persisted.document,
          persisted.hash,
          submission.revision,
        );
        if (reconciliation.clean) {
          const cleared = clearAboutNarrativeRecoveryDraft(persistenceOptions);
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
            ...persistenceOptions,
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
        persistenceOptions,
      );
      const reconciliation = store.markSaved(
        persisted.document,
        persisted.hash,
        submission.revision,
      );
      if (reconciliation.clean) {
        const cleared = clearAboutNarrativeRecoveryDraft(persistenceOptions);
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
          ...persistenceOptions,
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
  }, [persistenceOptions, persistenceTargetVersion, previewOnly, refreshConflictCanonical, store]);

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
      root.dataset.editorInspectorLayout = 'standard';
    } else {
      delete root.dataset.editorActive;
      delete root.dataset.editorInspectorOpen;
      delete root.dataset.editorInspectorLayout;
    }
    return () => {
      delete root.dataset.editorActive;
      delete root.dataset.editorInspectorOpen;
      delete root.dataset.editorInspectorLayout;
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
        ...persistenceOptions,
      }) || { status: 'none', available: false });
      store.setCheckpointState(readAboutNarrativeCheckpointState(persistenceOptions));
      return undefined;
    }
    let active = true;
    loadAboutNarrativeSource(persistenceOptions).then((source) => {
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
        ...persistenceOptions,
      }) || { status: 'none', available: false });
      store.setCheckpointState(readAboutNarrativeCheckpointState(persistenceOptions));
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
  }, [initialPreviewLocalSave, persistenceOptions, persistenceTargetVersion, previewBaselineHash, previewOnly, store]);

  useEffect(() => {
    if (!snapshot.dirty || !baselineHash) return undefined;
    const timer = window.setTimeout(() => {
      const result = flushAboutNarrativeRecoveryDraft({
        document: snapshot.document,
        baselineHash,
        selection: snapshot.selection,
        storyWU: snapshot.transport.storyWU,
        ...persistenceOptions,
      });
      store.setRecoveryState(result);
      if (result.status === 'failed') setMessage(result.reason);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [baselineHash, persistenceOptions, snapshot.dirty, snapshot.document, snapshot.revision, snapshot.selection, snapshot.transport.storyWU, store]);

  useEffect(() => {
    const handlePageHide = () => {
      const current = store.getSnapshot();
      if (!current.dirty || !current.baselineHash) return;
      flushAboutNarrativeRecoveryDraft({
        document: current.document,
        baselineHash: current.baselineHash,
        selection: current.selection,
        storyWU: current.transport.storyWU,
        ...persistenceOptions,
      });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [persistenceOptions, store]);

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
    const cleared = clearAboutNarrativeRecoveryDraft(persistenceOptions);
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
      data-editor-product="about-director-4"
      data-editor-version={pointFieldV6 ? 'composer-v7' : 'sectionless-v5'}
      data-about-experience-version={experienceVersion}
      data-source-state={snapshot.sourceState.status}
      data-save-state={snapshot.saveState.status}
      data-timeline-dock={timelineDock}
      data-timeline-all-tracks={showAllTracks ? 'true' : 'false'}
      data-editor-detail-mode={detailMode}
      data-inspector-open={inspectorVisible ? 'true' : 'false'}
      data-inspector-layout="standard"
      data-phone-sheet={phoneSheet}
      data-mobile-inspector-open={phoneSheet === 'inspector' ? 'true' : 'false'}
      hidden={!editorVisible}
      aria-keyshortcuts="/"
      aria-label="About Director 4.0"
      onKeyDown={stopEditorShortcutPropagation}
    >
      <header className="about-track-editor-topbar" data-director-panel="command-bar">
        <div className="about-track-editor-brand">
          <strong>About Director</strong>
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
          {experienceVersion === 'v2' ? (
            <button
              type="button"
              className={snapshot.selection.type === 'track'
                && snapshot.selection.id === 'effects'
                && inspectorVisible ? 'is-active' : ''}
              aria-pressed={snapshot.selection.type === 'track'
                && snapshot.selection.id === 'effects'
                && inspectorVisible}
              aria-controls="about-director-inspector"
              onClick={() => {
                store.setSelection({ type: 'track', id: 'effects' });
                setInspectorOpen(true);
                setPhoneSheet('inspector');
              }}
            >Parameters</button>
          ) : null}
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
                    exportFileName,
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
                        }, persistenceOptions);
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
                                ...persistenceOptions,
                              });
                              store.setCheckpointState(readAboutNarrativeCheckpointState(persistenceOptions));
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
                                ...persistenceOptions,
                              });
                              store.setCheckpointState(readAboutNarrativeCheckpointState(persistenceOptions));
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
                        const cleared = clearAboutNarrativeRecoveryDraft(persistenceOptions);
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
        experienceVersion={experienceVersion}
        snapshot={snapshot}
        store={store}
        editScope={editScope}
        zoom={zoom}
        setZoom={setZoom}
        dockMode={timelineDock}
        setDockMode={setTimelineDock}
        showAllTracks={showAllTracks}
        setShowAllTracks={setShowAllTracks}
        textMenu={textMenu}
        setTextMenu={setTextMenu}
        interactionMenu={interactionMenu}
        setInteractionMenu={setInteractionMenu}
        detailMode={detailMode}
        setDetailMode={setDetailMode}
        onOpenTextEditor={openTextEditor}
        onOpenInspector={() => {
          setInspectorOpen(true);
          setPhoneSheet('inspector');
        }}
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
          experienceVersion={experienceVersion}
          snapshot={snapshot}
          store={store}
          editScope={editScope}
          detailMode={detailMode}
        />
        {snapshot.selection.type !== 'track'
          && !pointFieldSelection
          && !(pointFieldV6 && ['text-field', 'interaction'].includes(snapshot.selection.type)) ? (
          <footer>
            <details className="about-director-object-menu">
              <summary>Object actions</summary>
              <div>
                {!(pointFieldV6 && snapshot.selection.type === 'interaction') ? (
                  <>
                    <button type="button" onClick={() => store.copySelection()}>Copy</button>
                    {snapshot.clipboard ? <button type="button" onClick={() => store.pasteClipboard({ atWU: snapshot.transport.storyWU })}>Paste</button> : null}
                    <button type="button" onClick={() => store.duplicateSelection()}>Duplicate</button>
                  </>
                ) : null}
                <button type="button" className="is-danger" onClick={() => store.deleteSelection()}>
                  {snapshot.selection.type === 'camera-key'
                    ? 'Delete camera move key'
                    : snapshot.selection.type === 'camera-orientation-key'
                      ? 'Delete camera tilt key'
                      : snapshot.selection.type === 'camera-lens-key'
                        ? 'Delete camera lens key'
                      : 'Delete'}
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
