import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Diamond,
  Info,
  LockKeyhole,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
} from 'lucide-react';
import {
  ABOUT_NARRATIVE_GLOBAL_CONTROLS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS,
  ABOUT_NARRATIVE_EMPHASIS_TONES,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
} from './aboutNarrativeDefinitions.js';
import {
  clearAboutNarrativeRecoveryDraft,
  exportAboutNarrativeDocument,
  loadAboutNarrativeSource,
  readAboutNarrativeCheckpoints,
  readAboutNarrativeRecoveryDraft,
  saveAboutNarrativeSource,
  writeAboutNarrativeCheckpoint,
  writeAboutNarrativeRecoveryDraft,
} from './aboutNarrativePersistence.js';
import {
  assertValidAboutNarrativeDocument,
  cloneAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';
import {
  getAboutNarrativeCueMovement,
  getAboutNarrativeCueMotionInterval,
  getAboutNarrativeWorldTransitionLimit,
  sampleAboutNarrativePlan,
} from './aboutNarrativeCompiler.js';
import {
  captureAboutNarrativePlayheadContext,
  createAboutNarrativeCueClipboardPayload,
  deriveAboutNarrativeLoopRange,
  duplicateAboutNarrativeCueGroup,
  duplicateAboutNarrativeSection,
  getAboutNarrativeCameraKeyTimingBounds,
  getAboutNarrativeCueTimingBounds,
  getAboutNarrativeExtentField,
  getAboutNarrativeSelectionMembers,
  moveAboutNarrativeCueTiming,
  remapAboutNarrativePlayheadContext,
  resolveAboutNarrativeCameraKeyDrop,
  resolveAboutNarrativeCueDistribution,
  resolveAboutNarrativeCueExactGap,
  resolveAboutNarrativeCueGroupMove,
  resolveAboutNarrativeCueGroupAlign,
  resolveAboutNarrativeCueGroupPaste,
  snapAboutNarrativeTimelineValue,
  stitchAboutNarrativeCameraBoundaries,
  toggleAboutNarrativeCueSelection,
  validateAboutNarrativeCueClipboardPayload,
} from './aboutNarrativeTimeline.js';
import './about-narrative-editor.css';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ABOUT_EDITOR_TIMELINE_STORAGE_KEY = 'abs:about-narrative:timeline-open:v1';
const TIMELINE_KEY_EPSILON = 0.004;
const INSPECTOR_EDGE_GAP = 8;
const CAMERA_POSE_FIELDS = new Set(['offset', 'lookAtOffset', 'fov', 'roll']);
const DISCIPLINE_REVEAL_MAX = ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS
  .find((control) => control.id === 'end')?.max || 4;
const DISCIPLINE_BALL_TOKEN_BY_GROUP = Object.freeze({
  1: '--ball-1',
  2: '--ball-4',
  3: '--ball-3',
  4: '--ball-7',
  5: '--ball-8',
  6: '--ball-6',
});
const TIMELINE_GLOBAL_TRACKS = Object.freeze([
  Object.freeze({ lane: 'section', label: 'Sections', groupIds: Object.freeze(['sequence']) }),
  Object.freeze({ lane: 'camera', label: 'Camera', groupIds: Object.freeze(['camera']) }),
  Object.freeze({ lane: 'world', label: 'World', groupIds: Object.freeze(['material', 'swarmTurbulence']) }),
  Object.freeze({ lane: 'text', label: 'Text', groupIds: Object.freeze(['textMotion']) }),
  Object.freeze({ lane: 'interaction', label: 'Interaction', groupIds: Object.freeze([]) }),
]);

function cameraPoseChanges(from, to) {
  if (!from || !to) return false;
  return ['offset', 'lookAtOffset'].some((field) => (
    from[field].some((value, index) => Math.abs(value - to[field][index]) > 0.0001)
  )) || Math.abs(from.fov - to.fov) > 0.0001 || Math.abs(from.roll - to.roll) > 0.0001;
}

function copyCameraPose(target, source) {
  target.offset = [...source.offset];
  target.lookAtOffset = [...source.lookAtOffset];
  target.fov = source.fov;
  target.roll = source.roll;
}

function linkCameraBoundary(document, sectionIndex, keyIndex) {
  const section = document.sections[sectionIndex];
  const key = section?.camera.keys[keyIndex];
  if (!key) return;
  if (keyIndex === 0 && sectionIndex > 0) {
    copyCameraPose(document.sections[sectionIndex - 1].camera.keys.at(-1), key);
  }
  if (keyIndex === section.camera.keys.length - 1 && sectionIndex < document.sections.length - 1) {
    copyCameraPose(document.sections[sectionIndex + 1].camera.keys[0], key);
  }
}

function bridgeCameraSection(document, sectionIndex) {
  const section = document.sections[sectionIndex];
  if (!section?.camera.keys.length) return;
  if (sectionIndex > 0) copyCameraPose(section.camera.keys[0], document.sections[sectionIndex - 1].camera.keys.at(-1));
  if (sectionIndex < document.sections.length - 1) copyCameraPose(section.camera.keys.at(-1), document.sections[sectionIndex + 1].camera.keys[0]);
}

function getInspectorVerticalBounds(inspector, timelineOpen) {
  const editor = inspector.closest('.about-editor');
  const styles = editor ? getComputedStyle(editor) : null;
  const topbarHeight = Number.parseFloat(styles?.getPropertyValue('--about-editor-topbar')) || 44;
  const timelineHeight = timelineOpen
    ? Number.parseFloat(styles?.getPropertyValue('--about-editor-timeline')) || 188
    : 0;
  const buttonBarTop = document.querySelector('[data-button-bar]')?.getBoundingClientRect().top
    ?? window.innerHeight;
  return {
    minTop: topbarHeight + INSPECTOR_EDGE_GAP,
    maxBottom: (timelineOpen ? window.innerHeight - timelineHeight : buttonBarTop) - INSPECTOR_EDGE_GAP,
  };
}

function clampInspectorPosition(inspector, position, timelineOpen) {
  const { minTop, maxBottom } = getInspectorVerticalBounds(inspector, timelineOpen);
  const maxWidth = Math.max(240, window.innerWidth - (INSPECTOR_EDGE_GAP * 2));
  const width = Math.min(position.width, maxWidth);
  const availableHeight = Math.max(240, maxBottom - minTop);
  const height = Math.min(position.height, availableHeight);
  const maxLeft = Math.max(INSPECTOR_EDGE_GAP, window.innerWidth - width - INSPECTOR_EDGE_GAP);
  const maxTop = Math.max(minTop, maxBottom - height);
  return {
    left: Math.min(maxLeft, Math.max(INSPECTOR_EDGE_GAP, position.left)),
    top: Math.min(maxTop, Math.max(minTop, position.top)),
    width,
    height,
  };
}

function getSectionIndex(document, sectionId) {
  return document.sections.findIndex((section) => section.id === sectionId);
}

function getSection(document, selection) {
  const sectionId = selection.sectionId || document.sections[0]?.id;
  return document.sections.find((section) => section.id === sectionId) || document.sections[0];
}

function getLocalProgress(plan, section, storyWU) {
  const compiled = plan?.sections?.find((item) => item.id === section.id);
  return compiled ? clamp01((storyWU - compiled.startWU) / compiled.travelWU) : 0;
}

function formatWU(value) {
  return `${Number(value || 0).toFixed(2)} WU`;
}

function formatCameraPercent(value) {
  return `${Number((Number(value) * 100).toFixed(1))}%`;
}

function isTextEditingTarget(target) {
  return target instanceof HTMLElement
    && (target.matches('input, textarea, select') || target.isContentEditable);
}

function getTimelineKeyframes(snapshot) {
  const plan = snapshot.compiledPlan;
  if (!plan?.sections?.length) return [];
  const events = [];
  plan.sections.forEach((compiled, sectionIndex) => {
    const section = snapshot.document.sections[sectionIndex];
    const toStoryWU = (at) => compiled.startWU + (Number(at || 0) * compiled.travelWU);
    section.camera.keys.forEach((key, keyIndex) => {
      if (key.at === 0 || key.at === 1) return;
      events.push({
        storyWU: toStoryWU(key.at),
        priority: 0,
        selection: { type: 'camera-key', sectionId: section.id, keyIndex },
      });
    });
    if (section.world.mode === 'set' && section.world.transitionIn.type !== 'cut') {
      ['start', 'end'].forEach((part, partIndex) => events.push({
        storyWU: toStoryWU(section.world.transitionIn[part]),
        priority: 10 + partIndex,
        selection: { type: 'world', sectionId: section.id, keyPart: `transition-${part}` },
      }));
    }
    (section.text.cues || []).forEach((cue, cueIndex) => {
      events.push({
        storyWU: toStoryWU(cue.hold),
        priority: 20 + cueIndex,
        selection: { type: 'cue', sectionId: section.id, cueId: cue.id, keyPart: 'focus' },
      });
    });
    if (section.text.disciplineReveal) {
      events.push({
        storyWU: toStoryWU(section.text.disciplineReveal.start),
        priority: 28,
        selection: { type: 'discipline-reveal', sectionId: section.id },
      });
    }
    if (section.interaction?.type !== 'none' && Number.isFinite(section.interaction.activationStart)) {
      events.push({
        storyWU: toStoryWU(section.interaction.activationStart),
        priority: 30,
        selection: { type: 'interaction', sectionId: section.id, keyPart: 'activation' },
      });
    }
  });
  return events.sort((a, b) => (a.storyWU - b.storyWU) || (a.priority - b.priority));
}

function getTimelineDeletion(snapshot) {
  const { selection, document } = snapshot;
  const sectionIndex = getSectionIndex(document, selection.sectionId);
  const section = document.sections[sectionIndex];
  if (!section) return null;
  if (selection.type === 'camera-key') {
    const key = section.camera.keys[selection.keyIndex];
    if (!key) return null;
    const required = key.at === 0 || key.at === 1;
    return {
      label: required ? 'Required camera key' : 'Delete camera key',
      disabled: required,
      message: required ? 'The start and end Camera keys preserve Section continuity and cannot be removed.' : '',
      execute: (store) => store.commit('Delete camera key', (draft) => {
        draft.sections[sectionIndex].camera.keys.splice(selection.keyIndex, 1);
      }, { selection: { type: 'section', sectionId: section.id } }),
    };
  }
  if (selection.type === 'world' && selection.keyPart?.startsWith('transition-')) {
    return {
      label: 'Remove transition',
      disabled: false,
      message: '',
      execute: (store) => store.commit('Remove World transition', (draft) => {
        const transition = draft.sections[sectionIndex].world.transitionIn;
        transition.start = 0;
        transition.end = 0;
        transition.type = 'cut';
      }, { selection: { type: 'world', sectionId: section.id } }),
    };
  }
  if (selection.type === 'interaction' && selection.keyPart === 'activation') {
    return {
      label: 'Remove interaction key',
      disabled: false,
      message: '',
      execute: (store) => store.commit('Remove interaction key', (draft) => {
        draft.sections[sectionIndex].interaction = { type: 'none' };
      }, { selection: { type: 'section', sectionId: section.id } }),
    };
  }
  return null;
}

function deleteTimelineSelection(store, snapshot) {
  const deletion = getTimelineDeletion(snapshot);
  if (!deletion) return false;
  if (deletion.disabled) {
    store.setSaveState({ message: deletion.message });
    return true;
  }
  deletion.execute(store);
  return true;
}

function seekTimelineKeyframe(store, event) {
  if (!event) return;
  store.setSelection(event.selection);
  store.setTransport({ owner: 'timeline', playing: false, storyWU: event.storyWU });
}

function jumpTimelineKeyframe(store, snapshot, direction) {
  const events = getTimelineKeyframes(snapshot);
  const currentWU = snapshot.transport.storyWU;
  const targetPosition = direction > 0
    ? events.find((event) => event.storyWU > currentWU + TIMELINE_KEY_EPSILON)?.storyWU
    : [...events].reverse().find((event) => event.storyWU < currentWU - TIMELINE_KEY_EPSILON)?.storyWU;
  const event = Number.isFinite(targetPosition)
    ? events.find((item) => Math.abs(item.storyWU - targetPosition) < TIMELINE_KEY_EPSILON)
    : null;
  seekTimelineKeyframe(store, event);
}

function makeSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'item';
}

function nextId(document, base) {
  const used = new Set(document.sections.flatMap((section) => [
    section.id,
    ...(section.text.cues || []).map((cue) => cue.id),
    ...(section.text.blocks || []).map((block) => block.id),
    ...(section.text.disciplineReveal ? [section.text.disciplineReveal.id] : []),
  ]));
  let id = makeSlug(base);
  let suffix = 2;
  while (used.has(id)) {
    id = `${makeSlug(base)}-${suffix}`;
    suffix += 1;
  }
  return id;
}

function replaceDraftDocument(draft, nextDocument) {
  Object.keys(draft).forEach((key) => delete draft[key]);
  Object.assign(draft, cloneAboutNarrativeDocument(nextDocument));
}

function applyCueMoves(draft, moves) {
  moves.forEach((move) => {
    const section = draft.sections.find((item) => item.id === move.sectionId);
    const cue = section?.text?.cues?.find((item) => item.id === move.cueId);
    if (cue) Object.assign(cue, { enter: move.enter, hold: move.hold, exit: move.exit });
  });
}

function Property({ label, children, hint = '' }) {
  return (
    <label className="about-editor-property">
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function NumberProperty({ label, value, min, max, step, onChange, unit = '', disabled = false }) {
  return (
    <Property label={label}>
      <div className="about-editor-number">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {unit ? <em>{unit}</em> : null}
      </div>
    </Property>
  );
}

function RangeProperty({ label, start, end, min, max, step, onStartChange, onEndChange, hint = '' }) {
  const startPercent = ((start - min) / Math.max(0.00001, max - min)) * 100;
  const endPercent = ((end - min) / Math.max(0.00001, max - min)) * 100;
  const percentageStep = step * 100;
  const setStart = (value) => onStartChange(Math.min(end - step, Math.max(min, Number(value) || 0)));
  const setEnd = (value) => onEndChange(Math.max(start + step, Math.min(max, Number(value) || 0)));
  return (
    <fieldset
      className="about-editor-range-property"
      data-global-control="clearWindow"
      style={{ '--about-range-start': `${startPercent}%`, '--about-range-end': `${endPercent}%` }}
    >
      <legend>{label}</legend>
      <div className="about-editor-dual-range">
        <span aria-hidden="true" />
        <input type="range" aria-label={`${label} start`} min={min} max={end - step} step={step} value={start} onChange={(event) => setStart(event.target.value)} />
        <input type="range" aria-label={`${label} end`} min={start + step} max={max} step={step} value={end} onChange={(event) => setEnd(event.target.value)} />
      </div>
      <div className="about-editor-range-values">
        <label><span>Starts</span><input type="number" min={min * 100} max={(end - step) * 100} step={percentageStep} value={Math.round(start * 100)} onChange={(event) => setStart(Number(event.target.value) / 100)} /><em>%</em></label>
        <i aria-hidden="true">→</i>
        <label><span>Ends</span><input type="number" min={(start + step) * 100} max={max * 100} step={percentageStep} value={Math.round(end * 100)} onChange={(event) => setEnd(Number(event.target.value) / 100)} /><em>%</em></label>
      </div>
      {hint ? <small>{hint}</small> : null}
    </fieldset>
  );
}

function Transport({ store, snapshot }) {
  const { transport, compiledPlan } = snapshot;
  const maxWU = compiledPlan?.maxStoryWU || 1;
  const play = () => store.setTransport({
    owner: transport.playing ? 'timeline' : 'playback',
    playing: !transport.playing,
    storyWU: transport.storyWU,
  });
  const seek = (storyWU) => store.setTransport({ owner: 'timeline', playing: false, storyWU });
  const selected = getSection(snapshot.document, snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, selected.id);
  const jumpSection = (direction) => {
    const next = snapshot.compiledPlan.sections[Math.max(0, Math.min(snapshot.compiledPlan.sections.length - 1, sectionIndex + direction))];
    if (next) seek(next.startWU);
  };
  return (
    <div className="about-editor-transport">
      <button type="button" title="Previous Section" aria-label="Previous Section" onClick={() => jumpSection(-1)}><SkipBack aria-hidden="true" /></button>
      <button type="button" title="Previous keyframe · Left arrow" aria-label="Previous keyframe" onClick={() => jumpTimelineKeyframe(store, snapshot, -1)}><ChevronLeft aria-hidden="true" /></button>
      <button type="button" className="is-primary" title={transport.playing ? 'Pause' : 'Play'} aria-label={transport.playing ? 'Pause' : 'Play'} onClick={play}>
        {transport.playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      <button type="button" title="Next Section" aria-label="Next Section" onClick={() => jumpSection(1)}><SkipForward aria-hidden="true" /></button>
      <button type="button" title="Next keyframe · Right arrow" aria-label="Next keyframe" onClick={() => jumpTimelineKeyframe(store, snapshot, 1)}><ChevronRight aria-hidden="true" /></button>
      <output>{formatWU(transport.storyWU)}</output>
      <input
        aria-label="Global narrative playhead"
        type="range"
        min="0"
        max={maxWU}
        step="0.002"
        value={Math.min(maxWU, transport.storyWU)}
        onChange={(event) => seek(Number(event.target.value))}
      />
      <button
        type="button"
        className={transport.owner === 'scroll' ? 'is-active' : ''}
        onClick={() => store.setTransport({ owner: 'scroll', playing: false })}
      >Follow scroll</button>
      <button
        type="button"
        className={transport.liveAmbient ? 'is-active' : ''}
        onClick={() => store.setTransport({ liveAmbient: !transport.liveAmbient })}
      >Live ambient</button>
      <select
        aria-label="Preview profile"
        value={snapshot.previewProfile}
        onChange={(event) => store.setPreviewProfile(event.target.value)}
      >
        <option value="desktop">Desktop</option>
        <option value="mobile">Mobile</option>
        <option value="reduced-motion">Reduced motion</option>
      </select>
    </div>
  );
}

function Timeline({ store, snapshot, onOpenGlobal }) {
  const { document, compiledPlan, selection, transport } = snapshot;
  const selectedCueMembers = getAboutNarrativeSelectionMembers(selection);
  const maxWU = Math.max(0.001, compiledPlan?.maxStoryWU || document.sections.reduce((sum, section) => sum + section.extentWU, 0));
  const playhead = `${(transport.storyWU / maxWU) * 100}%`;
  const lanesRef = useRef(null);
  const timingDragRef = useRef(null);
  const previewFrameRef = useRef(null);
  const pendingPreviewRef = useRef(null);
  const suppressedClickRef = useRef(null);
  const [cameraDragPreview, setCameraDragPreview] = useState(null);
  const [sectionResizePreview, setSectionResizePreview] = useState(null);
  const [marquee, setMarquee] = useState(null);

  const queuePreviewFrame = (callback) => {
    pendingPreviewRef.current = callback;
    if (previewFrameRef.current) return;
    previewFrameRef.current = requestAnimationFrame(() => {
      previewFrameRef.current = null;
      const pending = pendingPreviewRef.current;
      pendingPreviewRef.current = null;
      pending?.();
    });
  };
  const flushPreviewFrame = () => {
    if (previewFrameRef.current) cancelAnimationFrame(previewFrameRef.current);
    previewFrameRef.current = null;
    const pending = pendingPreviewRef.current;
    pendingPreviewRef.current = null;
    pending?.();
  };

  const zoomTimeline = (event) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const lanes = lanesRef.current;
    if (!lanes) return;
    const rect = lanes.getBoundingClientRect();
    const pointerX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const storyRatio = (lanes.scrollLeft + pointerX) / Math.max(1, lanes.scrollWidth);
    const currentZoom = Math.max(1, Number(transport.zoom) || 1);
    const nextZoom = Math.min(8, Math.max(1, currentZoom * Math.exp(-event.deltaY * 0.0025)));
    store.setTransport({ zoom: Number(nextZoom.toFixed(3)) });
    requestAnimationFrame(() => {
      lanes.scrollLeft = (storyRatio * lanes.scrollWidth) - pointerX;
    });
  };

  useEffect(() => () => {
    if (previewFrameRef.current) cancelAnimationFrame(previewFrameRef.current);
  }, []);

  const resolveCameraDropAtClientX = (clientX) => {
    const lanes = lanesRef.current;
    const current = store.getSnapshot();
    if (!lanes) return { valid: false, reason: 'The camera timeline is not ready.' };
    const rect = lanes.getBoundingClientRect();
    const contentX = Math.min(
      lanes.scrollWidth,
      Math.max(0, clientX - rect.left + lanes.scrollLeft),
    );
    const storyWU = (contentX / Math.max(1, lanes.scrollWidth))
      * Math.max(0.001, current.compiledPlan?.maxStoryWU || maxWU);
    const drag = timingDragRef.current;
    const drop = resolveAboutNarrativeCameraKeyDrop({
      document: current.document,
      plan: current.compiledPlan,
      sourceSectionIndex: drag?.sectionIndex,
      sourceKeyIndex: drag?.keyIndex,
      storyWU,
    });
    return { ...drop, contentX };
  };

  const beginTimingDrag = (event, drag) => {
    if (drag.locked || event.button !== 0) return;
    const clip = event.currentTarget.parentElement;
    const rect = clip?.getBoundingClientRect();
    if (!rect?.width) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    let nextSelection = drag.selection;
    if (drag.type === 'cue') {
      const currentSelection = store.getSnapshot().selection;
      const currentMembers = getAboutNarrativeSelectionMembers(currentSelection);
      const alreadySelected = currentMembers.some((member) => (
        member.sectionId === drag.selection.sectionId && member.cueId === drag.selection.cueId
      ));
      nextSelection = event.shiftKey
        ? toggleAboutNarrativeCueSelection(currentSelection, drag.selection)
        : alreadySelected && currentMembers.length > 1
          ? { ...drag.selection, members: currentMembers }
          : drag.selection;
      store.beginPreview('Move text Cues');
    }
    timingDragRef.current = {
      ...drag,
      selection: nextSelection,
      members: drag.type === 'cue' ? getAboutNarrativeSelectionMembers(nextSelection) : null,
      startDocument: drag.type === 'cue' ? cloneAboutNarrativeDocument(store.getSnapshot().document) : null,
      startPlan: drag.type === 'cue' ? store.getSnapshot().compiledPlan : null,
      pointerId: event.pointerId,
      rect,
      startX: event.clientX,
      moved: false,
      lastAt: drag.at,
      lastDrop: null,
    };
    store.setSelection(nextSelection);
    store.setTransport({ owner: 'timeline', playing: false, storyWU: drag.storyWU });
  };

  const moveTimingDrag = (event) => {
    const drag = timingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 3) return;
    drag.moved = true;
    if (drag.type === 'camera') {
      const drop = resolveCameraDropAtClientX(event.clientX);
      drag.lastDrop = drop;
      setCameraDragPreview({ ...drop, token: drag.token });
      if (drop.valid) {
        store.setTransport({ owner: 'timeline', playing: false, storyWU: drop.storyWU });
      }
      return;
    }
    if (drag.type === 'discipline-reveal') {
      const deltaLane = (event.clientX - drag.startX) / drag.rect.width;
      const nextAt = Math.min(drag.max, Math.max(
        drag.min,
        snapAboutNarrativeTimelineValue(drag.at + deltaLane),
      ));
      if (Math.abs(nextAt - drag.lastAt) < 0.000001) return;
      const delta = nextAt - drag.lastAt;
      store.commit('Move Discipline reveal', (draft) => {
        const reveal = draft.sections[drag.sectionIndex].text.disciplineReveal;
        if (!reveal) return;
        reveal.start += delta;
        reveal.end += delta;
      }, { coalesceKey: drag.coalesceKey, selection: drag.selection });
      drag.lastAt = nextAt;
      store.setTransport({
        owner: 'timeline',
        playing: false,
        storyWU: drag.sectionStartWU + (nextAt * drag.travelWU),
      });
      return;
    }
    const localDelta = (event.clientX - drag.startX) / drag.rect.width;
    const movement = resolveAboutNarrativeCueGroupMove({
      document: drag.startDocument,
      plan: drag.startPlan,
      members: drag.members,
      primary: drag.selection,
      localDelta,
    });
    if (!movement.valid || Math.abs(movement.deltaWU - (drag.lastDeltaWU || 0)) < 0.000001) return;
    drag.lastDeltaWU = movement.deltaWU;
    queuePreviewFrame(() => {
      store.updatePreview((draft) => {
        movement.moves.forEach((move) => {
          const cue = draft.sections[move.sectionIndex]?.text?.cues?.find((item) => item.id === move.cueId);
          if (cue) Object.assign(cue, { enter: move.enter, hold: move.hold, exit: move.exit });
        });
      }, {
        owner: 'timeline',
        playing: false,
        storyWU: drag.storyWU + movement.deltaWU,
      });
    });
  };

  const endTimingDrag = (event) => {
    const drag = timingDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (drag.type === 'cue') {
      flushPreviewFrame();
      if (event.type === 'pointercancel' || !drag.moved) store.cancelPreview();
      else store.commitPreview(drag.selection);
    }
    if (drag.type === 'camera' && drag.moved && event.type !== 'pointercancel') {
      const drop = drag.lastDrop || resolveCameraDropAtClientX(event.clientX);
      if (drop.valid) {
        store.commit('Move camera key', (draft) => {
          const sourceKeys = draft.sections[drag.sectionIndex]?.camera.keys;
          const [movedKey] = sourceKeys?.splice(drag.keyIndex, 1) || [];
          if (!movedKey) return;
          movedKey.at = drop.at;
          const destinationKeys = draft.sections[drop.sectionIndex].camera.keys;
          destinationKeys.push(movedKey);
          destinationKeys.sort((a, b) => a.at - b.at);
        }, {
          selection: { type: 'camera-key', sectionId: drop.sectionId, keyIndex: drop.keyIndex },
        });
        store.setTransport({ owner: 'timeline', playing: false, storyWU: drop.storyWU });
      } else {
        store.setSaveState({ message: drop.reason || 'That camera key cannot be placed here.' });
      }
    }
    if (drag.moved) {
      suppressedClickRef.current = drag.token;
      window.setTimeout(() => {
        if (suppressedClickRef.current === drag.token) suppressedClickRef.current = null;
      }, 0);
    }
    setCameraDragPreview(null);
    timingDragRef.current = null;
  };

  const handleTimingClick = (token, action) => {
    if (suppressedClickRef.current === token) {
      suppressedClickRef.current = null;
      return;
    }
    action();
  };

  const beginSectionResize = (event, data) => {
    if (data.locked || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const current = store.getSnapshot();
    const field = getAboutNarrativeExtentField(current.previewProfile);
    store.beginPreview(`Resize ${data.sectionLabel}`);
    store.setSelection({ type: 'section', sectionId: data.sectionId });
    timingDragRef.current = {
      type: 'section-resize',
      token: `section-resize:${data.sectionId}`,
      pointerId: event.pointerId,
      startX: event.clientX,
      moved: false,
      sectionId: data.sectionId,
      sectionIndex: data.sectionIndex,
      sectionLabel: data.sectionLabel,
      field,
      startExtent: Number(current.document.sections[data.sectionIndex][field]),
      startMaxWU: Math.max(0.001, current.compiledPlan?.maxStoryWU || maxWU),
      startScrollWidth: Math.max(1, lanesRef.current?.scrollWidth || 1),
      playheadContext: captureAboutNarrativePlayheadContext({
        plan: current.compiledPlan,
        storyWU: current.transport.storyWU,
        resizedSectionId: data.sectionId,
      }),
      selection: { type: 'section', sectionId: data.sectionId },
    };
    setSectionResizePreview({ sectionId: data.sectionId, extent: Number(current.document.sections[data.sectionIndex][field]) });
  };

  const moveSectionResize = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== 'section-resize' || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) < 3) return;
    drag.moved = true;
    const rawExtent = drag.startExtent + (((event.clientX - drag.startX) / drag.startScrollWidth) * drag.startMaxWU);
    const step = event.altKey ? 0.01 : event.shiftKey ? 0.25 : 0.05;
    const extent = Math.min(8, Math.max(1, Math.round(rawExtent / step) * step));
    if (Math.abs(extent - (drag.lastExtent ?? drag.startExtent)) < 0.000001) return;
    drag.lastExtent = Number(extent.toFixed(2));
    setSectionResizePreview({ sectionId: drag.sectionId, extent: drag.lastExtent });
    queuePreviewFrame(() => {
      store.updatePreview((draft) => {
        draft.sections[drag.sectionIndex][drag.field] = drag.lastExtent;
      });
      store.setTransport({
        owner: 'timeline',
        playing: false,
        storyWU: remapAboutNarrativePlayheadContext(drag.playheadContext, store.getSnapshot().compiledPlan),
      });
    });
  };

  const endSectionResize = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== 'section-resize' || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    flushPreviewFrame();
    if (event.type === 'pointercancel' || !drag.moved) store.cancelPreview();
    else store.commitPreview(drag.selection);
    timingDragRef.current = null;
    setSectionResizePreview(null);
  };

  const resetSectionExtent = (sectionId, sectionIndex) => {
    const current = store.getSnapshot();
    const field = getAboutNarrativeExtentField(current.previewProfile);
    const baselineSection = current.baselineDocument.sections.find((item) => item.id === sectionId);
    if (!baselineSection || baselineSection[field] === current.document.sections[sectionIndex][field]) return;
    const context = captureAboutNarrativePlayheadContext({
      plan: current.compiledPlan,
      storyWU: current.transport.storyWU,
      resizedSectionId: sectionId,
    });
    store.beginPreview('Restore saved Section length');
    store.updatePreview((draft) => { draft.sections[sectionIndex][field] = baselineSection[field]; });
    store.setTransport({ storyWU: remapAboutNarrativePlayheadContext(context, store.getSnapshot().compiledPlan) });
    store.commitPreview({ type: 'section', sectionId });
  };

  const beginMarquee = (event) => {
    if (event.button !== 0 || event.target !== event.currentTarget) return;
    const canvas = lanesRef.current?.querySelector('.about-editor-timeline-canvas');
    if (!canvas) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    timingDragRef.current = {
      type: 'marquee',
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      canvasRect: rect,
      additive: event.shiftKey,
    };
    setMarquee({ left: event.clientX - rect.left, top: event.clientY - rect.top, width: 0, height: 0 });
  };

  const moveMarquee = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== 'marquee' || drag.pointerId !== event.pointerId) return;
    const left = Math.min(drag.startClientX, event.clientX) - drag.canvasRect.left;
    const top = Math.min(drag.startClientY, event.clientY) - drag.canvasRect.top;
    setMarquee({
      left,
      top,
      width: Math.abs(event.clientX - drag.startClientX),
      height: Math.abs(event.clientY - drag.startClientY),
    });
  };

  const endMarquee = (event) => {
    const drag = timingDragRef.current;
    if (drag?.type !== 'marquee' || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (event.type !== 'pointercancel') {
      const selectionRect = {
        left: Math.min(drag.startClientX, event.clientX),
        right: Math.max(drag.startClientX, event.clientX),
        top: Math.min(drag.startClientY, event.clientY),
        bottom: Math.max(drag.startClientY, event.clientY),
      };
      const laneRect = lanesRef.current?.getBoundingClientRect();
      const hits = [...(lanesRef.current?.querySelectorAll('.about-editor-cue[data-cue-id]') || [])]
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          const visible = laneRect && rect.right >= laneRect.left && rect.left <= laneRect.right;
          return visible && rect.right >= selectionRect.left && rect.left <= selectionRect.right
            && rect.bottom >= selectionRect.top && rect.top <= selectionRect.bottom;
        })
        .map((node) => ({ type: 'cue', sectionId: node.dataset.sectionId, cueId: node.dataset.cueId, keyPart: 'focus' }));
      if (hits.length) {
        let nextSelection = drag.additive ? store.getSnapshot().selection : hits[0];
        hits.slice(drag.additive ? 0 : 1).forEach((hit) => {
          nextSelection = toggleAboutNarrativeCueSelection(nextSelection, hit);
        });
        store.setSelection(nextSelection);
      }
    }
    timingDragRef.current = null;
    setMarquee(null);
  };

  return (
    <div className="about-editor-timeline">
      <div className="about-editor-lane-labels" aria-label="Timeline tracks">
        {TIMELINE_GLOBAL_TRACKS.map((track) => (
          track.groupIds.length ? (
            <button
              type="button"
              key={track.lane}
              className={selection.type === 'sequence' && selection.track === track.lane ? 'is-active' : ''}
              data-global-track={track.lane}
              aria-label={`Open global ${track.label} controls`}
              aria-pressed={selection.type === 'sequence' && selection.track === track.lane}
              onClick={() => onOpenGlobal?.({ type: 'sequence', track: track.lane, trackLabel: track.label, groupIds: track.groupIds })}
            >{track.label}</button>
          ) : <span key={track.lane}>{track.label}</span>
        ))}
      </div>
      <div ref={lanesRef} className="about-editor-lanes" data-solo-track={transport.soloTrack || ''} onWheel={zoomTimeline}>
        <div className="about-editor-timeline-canvas" style={{ '--about-editor-playhead': playhead, '--about-editor-timeline-zoom': Math.max(1, Number(transport.zoom) || 1) }}>
          <div className="about-editor-playhead" />
          {marquee ? <div className="about-editor-marquee" style={marquee} aria-hidden="true" /> : null}
          {cameraDragPreview ? (
          <div
            className={`about-editor-camera-drag-ghost${cameraDragPreview.valid ? '' : ' is-invalid'}`}
            style={{ left: `${cameraDragPreview.contentX}px` }}
            aria-hidden="true"
          >
            <i />
            <span>{cameraDragPreview.valid ? `${cameraDragPreview.sectionLabel} · ${formatCameraPercent(cameraDragPreview.at)}` : cameraDragPreview.reason}</span>
          </div>
          ) : null}
          {['section', 'camera', 'world', 'text', 'interaction'].map((lane) => (
          <div className={`about-editor-lane about-editor-lane--${lane}`} key={lane}>
            {document.sections.map((section, sectionIndex) => {
              const compiled = compiledPlan?.sections?.[sectionIndex];
              const startWU = Math.min(maxWU, compiled?.startWU || 0);
              const nextStartWU = Math.min(maxWU, compiledPlan?.sections?.[sectionIndex + 1]?.startWU ?? maxWU);
              const spanWU = Math.max(0.001, nextStartWU - startWU);
              const width = `${(spanWU / maxWU) * 100}%`;
              const inSelectedSection = selection.sectionId === section.id;
              const localPercent = (at) => Math.min(100, (Number(at || 0) * (compiled?.travelWU || spanWU) / spanWU) * 100);
              const localPosition = (at) => `${localPercent(at)}%`;
              const extendedLocalPosition = (at) => `${(Number(at || 0) * (compiled?.travelWU || spanWU) / spanWU) * 100}%`;
              const extendedLocalWidth = (from, to) => `${Math.max(0.35, (Number(to) - Number(from)) * (compiled?.travelWU || spanWU) / spanWU * 100)}%`;
              const textPosition = (at) => `${clamp01(Number(at || 0)) * 100}%`;
              const selectAt = (nextSelection, at = 0) => {
                store.setSelection({ sectionId: section.id, ...nextSelection });
                store.setTransport({
                  owner: 'timeline',
                  playing: false,
                  storyWU: startWU + (Number(at || 0) * (compiled?.travelWU || 0)),
                });
              };
              if (lane === 'section') {
                const isSelected = inSelectedSection && selection.type === 'section';
                const resizeExtent = sectionResizePreview?.sectionId === section.id
                  ? sectionResizePreview.extent
                  : Number(section[getAboutNarrativeExtentField(snapshot.previewProfile)]);
                return (
                  <div
                    key={section.id}
                    className={`about-editor-section-clip${isSelected ? ' is-selected' : ''}${inSelectedSection ? ' is-context' : ''}`}
                    style={{ width }}
                    title={`${section.label} · ${formatWU(compiled?.resolvedExtentWU || section.extentWU)}`}
                  >
                    <button type="button" aria-pressed={isSelected} onClick={() => selectAt({ type: 'section' })}>
                      <span>{String(sectionIndex + 1).padStart(2, '0')}</span>{section.label}
                    </button>
                    {sectionResizePreview?.sectionId === section.id ? <output>{formatWU(Math.max(0, resizeExtent - 1))} scroll · {formatWU(resizeExtent)} total</output> : null}
                    <button
                      type="button"
                      className="about-editor-section-resize"
                      disabled={section.locked}
                      aria-label={`Resize ${section.label}`}
                      title={section.locked ? 'Unlock this protected Section to resize it' : `Drag to change ${snapshot.previewProfile === 'mobile' ? 'mobile' : 'desktop'} scroll length · double-click to restore saved length`}
                      onDoubleClick={(event) => { event.preventDefault(); event.stopPropagation(); resetSectionExtent(section.id, sectionIndex); }}
                      onPointerDown={(event) => beginSectionResize(event, { sectionId: section.id, sectionIndex, sectionLabel: section.label, locked: section.locked })}
                      onPointerMove={moveSectionResize}
                      onPointerUp={endSectionResize}
                      onPointerCancel={endSectionResize}
                    />
                  </div>
                );
              }
              if (lane === 'camera') {
                return (
                  <div className="about-editor-clip" key={section.id} style={{ width }}>
                    <div className="about-editor-camera-rail" aria-hidden="true">
                      {section.camera.keys.slice(1).map((key, keyIndex) => {
                        const fromKey = section.camera.keys[keyIndex];
                        const left = localPercent(fromKey.at);
                        const right = localPercent(key.at);
                        return (
                          <span
                            className={cameraPoseChanges(fromKey, key) ? 'is-authored-motion' : 'is-base-dolly'}
                            key={`${section.id}:camera-span:${keyIndex}`}
                            style={{ left: `${left}%`, width: `${Math.max(0.5, right - left)}%` }}
                          />
                        );
                      })}
                    </div>
                    {section.camera.keys.map((key, keyIndex) => {
                      const timingBounds = getAboutNarrativeCameraKeyTimingBounds(section.camera.keys, keyIndex);
                      const token = `camera:${section.id}:${keyIndex}`;
                      const keySelection = { type: 'camera-key', sectionId: section.id, keyIndex };
                      const isSelected = inSelectedSection && selection.type === 'camera-key' && selection.keyIndex === keyIndex;
                      const required = timingBounds.locked;
                      return (
                        <button
                          type="button"
                          key={token}
                          className={`about-editor-key${required ? ' is-boundary' : ' is-draggable'}${isSelected ? ' is-selected' : ''}${cameraDragPreview?.token === token ? ' is-drag-source' : ''}`}
                          style={{ left: localPosition(key.at) }}
                          title={required
                            ? `Protected Camera key at ${formatCameraPercent(key.at)} · select to inspect`
                            : `Camera key at ${formatCameraPercent(key.at)} · drag anywhere on the Camera track`}
                          aria-label={`${required ? 'Protected ' : ''}Camera key at ${formatCameraPercent(key.at)} through ${section.label}`}
                          aria-pressed={isSelected}
                          onPointerDown={required ? undefined : (event) => beginTimingDrag(event, {
                            type: 'camera',
                            token,
                            locked: false,
                            at: key.at,
                            sectionIndex,
                            keyIndex,
                            sectionStartWU: startWU,
                            spanWU,
                            travelWU: compiled?.travelWU || spanWU,
                            storyWU: startWU + (Number(key.at) * (compiled?.travelWU || 0)),
                            selection: keySelection,
                            coalesceKey: `timeline:${token}`,
                          })}
                          onPointerMove={required ? undefined : moveTimingDrag}
                          onPointerUp={required ? undefined : endTimingDrag}
                          onPointerCancel={required ? undefined : endTimingDrag}
                          onClick={() => handleTimingClick(token, () => selectAt({ type: 'camera-key', keyIndex }, key.at))}
                        />
                      );
                    })}
                  </div>
                );
              }
              if (lane === 'world') {
                const isSelected = inSelectedSection && selection.type === 'world';
                const transition = section.world.mode === 'set' && section.world.transitionIn.type !== 'cut'
                  ? section.world.transitionIn
                  : null;
                return (
                  <div className={`about-editor-clip${isSelected ? ' is-selected' : ''}`} key={section.id} style={{ width }}>
                    <button
                      type="button"
                      className={`about-editor-world-clip ${section.world.mode === 'set' ? 'has-world' : ''}${isSelected ? ' is-selected' : ''}`}
                      aria-pressed={isSelected}
                      onClick={() => selectAt({ type: 'world' }, transition ? transition.end : 0)}
                    >{section.world.mode === 'set' ? section.world.shapeId.replace('-v1', '') : 'continue'}</button>
                    {transition ? ['start', 'end'].map((part) => (
                      <button
                        type="button"
                        key={part}
                        className={`about-editor-timing-key is-world${isSelected && selection.keyPart === `transition-${part}` ? ' is-selected' : ''}`}
                        style={{ left: extendedLocalPosition(transition[part]) }}
                        title={`World transition ${part}`}
                        aria-label={`${section.label} World transition ${part}`}
                        onClick={() => selectAt({ type: 'world', keyPart: `transition-${part}` }, transition[part])}
                      />
                    )) : null}
                  </div>
                );
              }
              if (lane === 'text') {
                return (
                  <div
                    className={`about-editor-clip${section.text.disciplineReveal ? ' has-extended-discipline' : ''}`}
                    key={section.id}
                    style={{ width }}
                    onPointerDown={beginMarquee}
                    onPointerMove={moveMarquee}
                    onPointerUp={endMarquee}
                    onPointerCancel={endMarquee}
                  >
                    {(section.text.cues || []).map((cue) => {
                      const isSelected = selectedCueMembers.some((member) => member.sectionId === section.id && member.cueId === cue.id);
                      const isPrimary = selection.type === 'cue' && selection.sectionId === section.id && selection.cueId === cue.id;
                      const movement = getAboutNarrativeCueMovement(cue);
                      const motionInterval = movement === 'spatial'
                        ? getAboutNarrativeCueMotionInterval(cue, document.globals.textMotion)
                        : null;
                      const motionSpan = motionInterval ? Math.max(0.00001, motionInterval.end - motionInterval.start) : 0;
                      const cueStyle = motionInterval ? {
                        left: textPosition(motionInterval.start),
                        width: `${Math.max(0.5, motionSpan * 100)}%`,
                      } : { left: textPosition(cue.hold) };
                      const focusPosition = motionInterval
                        ? `${((cue.hold - motionInterval.start) / motionSpan) * 100}%`
                        : '50%';
                      const timingBounds = getAboutNarrativeCueTimingBounds(cue);
                      const token = `cue:${section.id}:${cue.id}`;
                      const cueSelection = { type: 'cue', sectionId: section.id, cueId: cue.id, keyPart: 'focus' };
                      return (
                        <button
                          type="button"
                          className={`about-editor-cue is-${movement}${timingBounds.min === timingBounds.max ? ' is-boundary' : ' is-draggable'}${isSelected ? ' is-selected' : ''}${isPrimary ? ' is-primary-selection' : ''}`}
                          key={cue.id}
                          data-section-id={section.id}
                          data-cue-id={cue.id}
                          style={cueStyle}
                          aria-label={`${movement === 'vertical' ? 'Vertical' : 'Spatial'} text at ${Math.round(cue.hold * 100)}%${motionInterval ? ` · travels ${Math.round(motionInterval.start * 100)}–${Math.round(motionInterval.end * 100)}%` : ''} · ${cue.text}`}
                          aria-pressed={isSelected}
                          title={`${movement === 'vertical' ? 'Vertical' : 'Spatial'} title · drag to move it; duration stays global · ${cue.text}`}
                          onPointerDown={(event) => beginTimingDrag(event, {
                            type: 'cue',
                            token,
                            locked: timingBounds.min === timingBounds.max,
                            min: timingBounds.min,
                            max: timingBounds.max,
                            at: cue.hold,
                            sectionIndex,
                            cueId: cue.id,
                            sectionStartWU: startWU,
                            spanWU,
                            travelWU: compiled?.travelWU || spanWU,
                            storyWU: startWU + (Number(cue.hold) * (compiled?.travelWU || 0)),
                            selection: cueSelection,
                            coalesceKey: `timeline:${token}`,
                          })}
                          onPointerMove={moveTimingDrag}
                          onPointerUp={endTimingDrag}
                          onPointerCancel={endTimingDrag}
                          onKeyDown={(event) => {
                            if (event.shiftKey && event.code === 'Space') {
                              event.preventDefault();
                              const nextSelection = toggleAboutNarrativeCueSelection(store.getSnapshot().selection, cueSelection);
                              store.setSelection(nextSelection);
                              store.setTransport({ owner: 'timeline', playing: false, storyWU: startWU + (Number(cue.hold) * (compiled?.travelWU || 0)) });
                            }
                          }}
                          onClick={() => handleTimingClick(token, () => {
                            store.setTransport({ owner: 'timeline', playing: false, storyWU: startWU + (Number(cue.hold) * (compiled?.travelWU || 0)) });
                          })}
                        ><span className="about-editor-cue-focus" style={{ left: focusPosition }} aria-hidden="true" /></button>
                      );
                    })}
                    {section.text.disciplineReveal ? (() => {
                      const reveal = section.text.disciplineReveal;
                      const duration = reveal.end - reveal.start;
                      const centre = reveal.start + (duration * 0.5);
                      const isSelected = inSelectedSection && selection.type === 'discipline-reveal';
                      const token = `discipline-reveal:${section.id}:${reveal.id}`;
                      const revealSelection = { type: 'discipline-reveal', sectionId: section.id };
                      return (
                        <button
                          type="button"
                          className={`about-editor-discipline-reveal is-draggable${isSelected ? ' is-selected' : ''}`}
                          style={{ left: extendedLocalPosition(reveal.start), width: extendedLocalWidth(reveal.start, reveal.end) }}
                          aria-label={`Discipline reveal from ${Math.round(reveal.start * 100)}% to ${Math.round(reveal.end * 100)}%`}
                          aria-pressed={isSelected}
                          title="Discipline reveal · drag the complete clip to retime"
                          onPointerDown={(event) => beginTimingDrag(event, {
                            type: 'discipline-reveal',
                            token,
                            locked: false,
                            min: duration * 0.5,
                            max: DISCIPLINE_REVEAL_MAX - (duration * 0.5),
                            at: centre,
                            sectionIndex,
                            sectionStartWU: startWU,
                            spanWU,
                            travelWU: compiled?.travelWU || spanWU,
                            storyWU: startWU + (centre * (compiled?.travelWU || 0)),
                            selection: revealSelection,
                            coalesceKey: `timeline:${token}`,
                          })}
                          onPointerMove={moveTimingDrag}
                          onPointerUp={endTimingDrag}
                          onPointerCancel={endTimingDrag}
                          onClick={() => handleTimingClick(token, () => selectAt({ type: 'discipline-reveal' }, reveal.start))}
                        >Discipline reveal</button>
                      );
                    })() : null}
                    {(section.text.blocks || []).length ? (
                      <button type="button" className={`about-editor-editorial-clip${inSelectedSection && selection.type === 'section' ? ' is-selected' : ''}`} onClick={() => selectAt({ type: 'section' })}>
                        Vertical · {section.text.blocks.length} blocks
                      </button>
                    ) : null}
                  </div>
                );
              }
              const isSelected = inSelectedSection && selection.type === 'interaction';
              const activation = section.interaction?.type !== 'none' ? section.interaction.activationStart : null;
              return (
                <div className={`about-editor-clip${isSelected ? ' is-selected' : ''}`} key={section.id} style={{ width }}>
                  <button
                    type="button"
                    className={`about-editor-interaction-clip ${section.interaction?.type !== 'none' ? 'has-interaction' : ''}${isSelected ? ' is-selected' : ''}`}
                    aria-pressed={isSelected}
                    onClick={() => selectAt({ type: 'interaction' }, activation || 0)}
                  >{section.interaction?.type !== 'none' ? section.interaction.type : ''}</button>
                  {Number.isFinite(activation) ? (
                    <button
                      type="button"
                      className={`about-editor-timing-key is-interaction${isSelected && selection.keyPart === 'activation' ? ' is-selected' : ''}`}
                      style={{ left: localPosition(activation) }}
                      title="Interaction activation"
                      aria-label={`${section.label} interaction activation keyframe`}
                      onClick={() => selectAt({ type: 'interaction', keyPart: 'activation' }, activation)}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SequenceInspector({ store, snapshot }) {
  const commitGlobal = (group, key, value) => store.commit(`Change ${key}`, (draft) => {
    if (group === 'sequence') draft.globals[key] = value;
    else {
      const targetKey = group === 'material' ? 'pointMaterial' : group;
      draft.globals[targetKey][key] = value;
    }
  }, { coalesceKey: `global:${group}:${key}` });
  const requestedGroupIds = snapshot.selection.type === 'sequence'
    ? snapshot.selection.groupIds || []
    : [];
  const groups = requestedGroupIds.length
    ? ABOUT_NARRATIVE_GLOBAL_CONTROLS.filter((group) => requestedGroupIds.includes(group.id))
    : ABOUT_NARRATIVE_GLOBAL_CONTROLS;
  const heading = snapshot.selection.trackLabel
    ? `${snapshot.selection.trackLabel} track`
    : 'Sequence';
  return (
    <>
      <header><span>{heading}</span><strong>Global controls</strong></header>
      {groups.map((group) => (
        <details open key={group.id} data-global-group={group.id}>
          <summary>{group.label}</summary>
          {group.id === 'textMotion' ? <p className="about-editor-help">Every title follows one continuous Y and Z path. Negative Y is higher; positive Y is lower. Travel duration changes the width of every Spatial title block in the Text timeline.</p> : null}
          {group.id === 'swarmTurbulence' ? <p className="about-editor-help">One ambient motion profile drives both the cluster and turbulent field. Each World only scales its strength, so the motion stays continuous while Shapes change.</p> : null}
          {group.controls.map((control) => {
            const target = group.id === 'sequence'
              ? snapshot.document.globals
              : snapshot.document.globals[group.id === 'material' ? 'pointMaterial' : group.id];
            if (group.id === 'textMotion' && control.id === 'readableEnd') return null;
            if (group.id === 'textMotion' && control.id === 'readableStart') {
              return (
                <RangeProperty
                  key="clearWindow"
                  label="Clear window"
                  start={target.readableStart}
                  end={target.readableEnd}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  onStartChange={(value) => commitGlobal(group.id, 'readableStart', value)}
                  onEndChange={(value) => commitGlobal(group.id, 'readableEnd', value)}
                  hint="The title is fully clear inside this part of its own travel. Outside it, blur and opacity build toward the ends."
                />
              );
            }
            return (
              <NumberProperty
                key={control.id}
                label={control.label}
                value={target[control.id]}
                min={control.min}
                max={control.max}
                step={control.step}
                unit={control.unit}
                onChange={(value) => commitGlobal(group.id, control.id, value)}
              />
            );
          })}
          {group.id === 'textMotion' ? <p className="about-editor-help about-editor-depth-help"><strong>Depth moves; blur softens.</strong> Entry depth starts behind the screen on −Z and Exit depth finishes toward you on +Z. Perspective controls how strongly that Z travel changes apparent size; Maximum blur only changes sharpness.</p> : null}
        </details>
      ))}
    </>
  );
}

function SectionInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const compiledSection = snapshot.compiledPlan?.sections?.[sectionIndex];
  const activeExtentField = snapshot.previewProfile === 'mobile' ? 'mobileExtentWU' : 'extentWU';
  const activeExtent = Number(section[activeExtentField]);
  const resolvedExtent = Number(compiledSection?.resolvedExtentWU ?? activeExtent);
  const contentMinimumActive = resolvedExtent > activeExtent + 0.001;
  const baselineSection = snapshot.baselineDocument.sections.find((item) => item.id === section.id);
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => {
    mutate(draft.sections[sectionIndex]);
  }, { coalesceKey, selection: snapshot.selection });
  const move = (direction) => store.commit('Reorder Section', (draft) => {
    const toIndex = sectionIndex + direction;
    if (toIndex < 0 || toIndex >= draft.sections.length) return;
    const [moved] = draft.sections.splice(sectionIndex, 1);
    draft.sections.splice(toIndex, 0, moved);
    replaceDraftDocument(draft, stitchAboutNarrativeCameraBoundaries(draft));
  }, { selection: { type: 'section', sectionId: section.id } });
  const duplicate = () => {
    const result = duplicateAboutNarrativeSection({ document: snapshot.document, sectionId: section.id });
    if (!result.valid) {
      store.setSaveState({ message: result.reason || 'This Section cannot be duplicated.' });
      return;
    }
    store.commit('Duplicate Section', (draft) => replaceDraftDocument(draft, result.document), {
      selection: result.selection,
    });
  };

  return (
    <>
      <header><span>Section {String(sectionIndex + 1).padStart(2, '0')}</span><strong>{section.label}</strong></header>
      {section.locked ? <div className="about-editor-lock"><LockKeyhole aria-hidden="true" /><span>This protected Section cannot be reordered or have its World replaced accidentally.</span><button type="button" onClick={() => update('Unlock protected Section', (draft) => { draft.locked = false; })}>Unlock advanced</button></div> : null}
      <div className="about-editor-inline-actions">
        <button type="button" disabled={section.locked || sectionIndex === 0} onClick={() => move(-1)}>Move earlier</button>
        <button type="button" disabled={section.locked || sectionIndex === snapshot.document.sections.length - 1} onClick={() => move(1)}>Move later</button>
        <button type="button" disabled={section.locked || section.type === 'finale'} onClick={duplicate}>Duplicate</button>
      </div>
      <Property label="Section name"><input value={section.label} onChange={(event) => update('Rename Section', (draft) => { draft.label = event.target.value; }, `section:${section.id}:label`)} /></Property>
      <Property label="Stable ID"><input value={section.id} readOnly /><small>References this Section without tying it to its current meaning.</small></Property>
      <Property label="Type">
        <select value={section.type} disabled={section.type === 'finale'} onChange={(event) => update('Change Section type', (draft) => { draft.type = event.target.value; })}>
          <option value="spatial">Spatial</option><option value="editorial">Editorial</option><option value="finale">Finale</option>
        </select>
      </Property>
      <details open>
        <summary>Section timing</summary>
        <Property label="Scroll travel"><output className="about-editor-readout">{formatWU(Math.max(0, activeExtent - 1))}</output></Property>
        <Property label="Total height"><output className="about-editor-readout">{formatWU(activeExtent)}</output></Property>
        <NumberProperty label="Desktop length" value={section.extentWU} min={1} max={8} step={0.05} unit="WU" onChange={(value) => update('Change desktop Section length', (draft) => { draft.extentWU = value; }, `section:${section.id}:extent`)} />
        <NumberProperty label="Mobile length" value={section.mobileExtentWU} min={1} max={8} step={0.05} unit="WU" onChange={(value) => update('Change mobile Section length', (draft) => { draft.mobileExtentWU = value; }, `section:${section.id}:mobile`)} />
        <Property label="Resolved height"><output className="about-editor-readout">{formatWU(resolvedExtent)}</output></Property>
        {contentMinimumActive ? <p className="about-editor-timing-warning">Content minimum in effect. The rendered copy needs {formatWU(resolvedExtent)} in this profile.</p> : null}
        <button
          type="button"
          className="about-editor-wide-action"
          disabled={!baselineSection || baselineSection[activeExtentField] === section[activeExtentField]}
          onClick={() => update('Restore saved Section length', (draft) => { draft[activeExtentField] = baselineSection[activeExtentField]; })}
        >Reset {snapshot.previewProfile === 'mobile' ? 'mobile' : 'desktop'} length</button>
      </details>
      {section.type === 'editorial' ? <EditorialBlocks store={store} snapshot={snapshot} section={section} /> : null}
      {section.type !== 'editorial' ? (
        <button
          type="button"
          className="about-editor-wide-action"
          onClick={() => {
            const local = getLocalProgress(snapshot.compiledPlan, section, snapshot.transport.storyWU);
            const id = nextId(snapshot.document, `${section.id}-statement`);
            const focus = Math.min(0.92, Math.max(0.08, snapAboutNarrativeTimelineValue(local)));
            update('Add text Cue', (draft) => {
              draft.text.cues ||= [];
              draft.text.cues.push({ id, text: 'New travelling statement', enter: focus - 0.08, hold: focus, exit: focus + 0.08, preset: 'travelling-title-v1', motion: { mode: 'spatial' } });
              draft.text.cues.sort((a, b) => a.hold - b.hold);
            });
            store.setSelection({ type: 'cue', sectionId: section.id, cueId: id, keyPart: 'focus' });
          }}
        >Add text cue at playhead</button>
      ) : null}
    </>
  );
}

function EditorialBlocks({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const updateBlock = (blockIndex, field, value) => store.commit('Edit editorial copy', (draft) => {
    draft.sections[sectionIndex].text.blocks[blockIndex][field] = value;
  }, { coalesceKey: `block:${section.id}:${blockIndex}:${field}`, selection: snapshot.selection });
  const updateEmphasis = (blockIndex, emphasisIndex, field, value) => store.commit('Edit editorial highlight', (draft) => {
    draft.sections[sectionIndex].text.blocks[blockIndex].emphasis[emphasisIndex][field] = value;
  }, { coalesceKey: `block:${section.id}:${blockIndex}:emphasis:${emphasisIndex}:${field}`, selection: snapshot.selection });
  const addEmphasis = (blockIndex) => store.commit('Add editorial highlight', (draft) => {
    const block = draft.sections[sectionIndex].text.blocks[blockIndex];
    block.emphasis ||= [];
    block.emphasis.push({ text: block.text.trim().split(/\s+/).slice(0, 2).join(' '), tone: 'blue' });
  }, { selection: snapshot.selection });
  const removeEmphasis = (blockIndex, emphasisIndex) => store.commit('Remove editorial highlight', (draft) => {
    draft.sections[sectionIndex].text.blocks[blockIndex].emphasis.splice(emphasisIndex, 1);
  }, { selection: snapshot.selection });
  return (
    <details open>
      <summary>Editorial content</summary>
      {(section.text.blocks || []).map((block, blockIndex) => (
        <div className="about-editor-block" key={block.id}>
          <div><code>{block.kind}</code><span>{block.id}</span></div>
          {block.label != null ? <Property label="Label"><input value={block.label} onChange={(event) => updateBlock(blockIndex, 'label', event.target.value)} /></Property> : null}
          {block.text != null ? <Property label="Copy"><textarea rows="5" value={block.text} onChange={(event) => updateBlock(blockIndex, 'text', event.target.value)} /></Property> : null}
          {block.kind === 'prose' ? <Property label="Reconnect point grid"><input type="checkbox" checked={block.worldInfluence === true} onChange={(event) => updateBlock(blockIndex, 'worldInfluence', event.target.checked)} /></Property> : null}
          {block.text != null ? (
            <div className="about-editor-emphasis-controls">
              <span>Highlighted words</span>
              {(block.emphasis || []).map((item, emphasisIndex) => (
                <div className="about-editor-emphasis-row" key={`${block.id}-emphasis-${emphasisIndex}`}>
                  <input aria-label="Highlighted phrase" value={item.text} onChange={(event) => updateEmphasis(blockIndex, emphasisIndex, 'text', event.target.value)} />
                  <select aria-label="Highlight colour" value={item.tone} onChange={(event) => updateEmphasis(blockIndex, emphasisIndex, 'tone', event.target.value)}>
                    {ABOUT_NARRATIVE_EMPHASIS_TONES.map((tone) => <option value={tone} key={tone}>{tone}</option>)}
                  </select>
                  <button type="button" aria-label={`Remove ${item.text || 'empty'} highlight`} onClick={() => removeEmphasis(blockIndex, emphasisIndex)}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addEmphasis(blockIndex)}>Add highlight</button>
            </div>
          ) : null}
          {block.items ? <Property label="Items"><textarea rows="6" value={block.items.join('\n')} onChange={(event) => updateBlock(blockIndex, 'items', event.target.value.split('\n').filter(Boolean))} /></Property> : null}
        </div>
      ))}
      <button type="button" className="about-editor-wide-action" onClick={() => store.commit('Add editorial block', (draft) => {
        draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: 'prose', text: 'New editorial paragraph.' });
      })}>Add prose block</button>
    </details>
  );
}

function CueRhythmAndReuse({ store, snapshot, clipboard, setClipboard }) {
  const members = getAboutNarrativeSelectionMembers(snapshot.selection);
  const [gapWU, setGapWU] = useState(0.35);
  const [anchor, setAnchor] = useState('primary');
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  const previewMoves = (label, result) => {
    if (!result.valid) {
      if (snapshot.tryState) store.cancelTry();
      setPreview(result);
      setMessage(result.reason || 'This arrangement does not fit the selected Sections.');
      return;
    }
    if (snapshot.tryState) store.cancelTry();
    store.beginTry(label, (draft) => applyCueMoves(draft, result.moves));
    setPreview({ ...result, label });
    setMessage('');
  };
  const cancelPreview = () => {
    if (snapshot.tryState) store.cancelTry();
    setPreview(null);
    setMessage('');
  };
  const applyPreview = () => {
    if (!preview?.valid || !snapshot.tryState) return;
    store.applyTry();
    setPreview(null);
    setMessage('');
  };
  const commitCandidate = (label, result) => {
    if (!result?.valid || !result.document) {
      setMessage(result?.reason || 'This operation could not be completed safely.');
      return;
    }
    store.commit(label, (draft) => replaceDraftDocument(draft, result.document), {
      selection: result.selection || snapshot.selection,
    });
    setMessage('');
  };

  const distribute = () => previewMoves('Distribute title rhythm', resolveAboutNarrativeCueDistribution({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    members,
    primary: snapshot.selection,
  }));
  const exactGap = () => previewMoves('Set exact title gap', resolveAboutNarrativeCueExactGap({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    members,
    primary: snapshot.selection,
    gapWU,
    anchor,
  }));
  const alignPrimary = () => previewMoves('Align titles to playhead', resolveAboutNarrativeCueGroupAlign({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    members,
    primary: snapshot.selection,
    playheadWU: snapshot.transport.storyWU,
  }));
  const duplicate = () => commitCandidate('Duplicate title Cues', duplicateAboutNarrativeCueGroup({
    document: snapshot.document,
    members,
    primary: snapshot.selection,
  }));
  const copy = () => {
    const result = createAboutNarrativeCueClipboardPayload({
      document: snapshot.document,
      plan: snapshot.compiledPlan,
      members,
      primary: snapshot.selection,
    });
    const payload = result?.payload || result;
    const validation = validateAboutNarrativeCueClipboardPayload(payload);
    if (result?.valid === false || validation?.valid === false) {
      setMessage(result?.reason || validation?.reason || 'These titles cannot be copied.');
      return;
    }
    setClipboard(payload);
    setMessage(`${members.length} title${members.length === 1 ? '' : 's'} copied for this editor session.`);
  };
  const paste = () => commitCandidate('Paste title Cues', resolveAboutNarrativeCueGroupPaste({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    payload: clipboard,
    destinationSectionId: snapshot.selection.sectionId,
    playheadWU: snapshot.transport.storyWU,
  }));

  const ghostMoves = preview?.valid ? preview.moves : [];
  const maxWU = Math.max(0.001, snapshot.compiledPlan?.maxStoryWU || 1);
  return (
    <details className="about-editor-rhythm" open={members.length > 1}>
      <summary>Rhythm and reuse</summary>
      {members.length > 1 ? (
        <>
          <div className="about-editor-rhythm-actions">
            <button type="button" onClick={distribute}>Distribute evenly</button>
            <button type="button" onClick={alignPrimary}>Align primary to playhead</button>
          </div>
          <div className="about-editor-rhythm-gap">
            <Property label="Exact gap"><input type="number" min="0" max="8" step="0.05" value={gapWU} onChange={(event) => setGapWU(Math.max(0, Number(event.target.value) || 0))} /></Property>
            <Property label="Anchor"><select value={anchor} onChange={(event) => setAnchor(event.target.value)}><option value="primary">Primary</option><option value="first">First</option><option value="last">Last</option></select></Property>
            <button type="button" onClick={exactGap}>Preview exact gap</button>
          </div>
        </>
      ) : null}
      {ghostMoves.length ? (
        <div className="about-editor-rhythm-preview" aria-label="Proposed title rhythm">
          {ghostMoves.map((move) => {
            const compiled = snapshot.compiledPlan.sections.find((item) => item.id === move.sectionId);
            const storyWU = Number(compiled?.startWU || 0) + (move.hold * Number(compiled?.travelWU || 0));
            return <i key={`${move.sectionId}:${move.cueId}`} style={{ left: `${(storyWU / maxWU) * 100}%` }} title={`${move.cueId} · ${formatWU(storyWU)}`} />;
          })}
        </div>
      ) : null}
      {message ? <p className={`about-editor-rhythm-message${preview && !preview.valid ? ' is-error' : ''}`}>{message}</p> : null}
      {preview?.valid && snapshot.tryState ? <div className="about-editor-try"><span>Previewing {preview.label}</span><button type="button" onClick={cancelPreview}>Cancel</button><button type="button" className="is-primary" onClick={applyPreview}>Apply</button></div> : null}
      <div className="about-editor-rhythm-actions">
        <button type="button" onClick={duplicate}>Duplicate {members.length > 1 ? 'selection' : 'title'}</button>
        <button type="button" onClick={copy}>Copy</button>
        <button type="button" disabled={!clipboard} onClick={paste}>Paste at playhead</button>
      </div>
    </details>
  );
}

function CueInspector({ store, snapshot, section, clipboard, setClipboard }) {
  const selectedMembers = getAboutNarrativeSelectionMembers(snapshot.selection);
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const cueIndex = section.text.cues.findIndex((cue) => cue.id === snapshot.selection.cueId);
  const cue = section.text.cues[cueIndex];
  if (!cue) return <SectionInspector store={store} snapshot={snapshot} section={section} />;
  const update = (field, value) => store.commit(`Edit Cue ${field}`, (draft) => {
    draft.sections[sectionIndex].text.cues[cueIndex][field] = value;
  }, { coalesceKey: `cue:${cue.id}:${field}`, selection: snapshot.selection });
  const remove = () => store.commit('Delete text Cue', (draft) => {
    draft.sections[sectionIndex].text.cues.splice(cueIndex, 1);
  }, { selection: { type: 'section', sectionId: section.id } });
  const timingBounds = getAboutNarrativeCueTimingBounds(cue);
  const motionInterval = getAboutNarrativeCueMotionInterval(cue, snapshot.document.globals.textMotion);
  const movement = getAboutNarrativeCueMovement(cue);
  const moveCue = (percent) => store.commit('Move text Cue', (draft) => {
    const target = draft.sections[sectionIndex].text.cues[cueIndex];
    Object.assign(target, moveAboutNarrativeCueTiming(target, percent / 100));
  }, { coalesceKey: `cue:${cue.id}:timing`, selection: { ...snapshot.selection, keyPart: 'focus' } });
  const updateMovement = (mode) => store.commit('Change text movement', (draft) => {
    const target = draft.sections[sectionIndex].text.cues[cueIndex];
    target.motion = { ...target.motion, mode };
  }, { selection: snapshot.selection });
  return (
    <>
      <header><span>Text Cue</span><strong>{cue.id}</strong></header>
      {selectedMembers.length > 1 ? (
        <div className="about-editor-group-summary">
          <strong>{selectedMembers.length} titles selected</strong>
          <ol>{selectedMembers.map((member) => {
            const memberSection = snapshot.document.sections.find((item) => item.id === member.sectionId);
            const memberCue = memberSection?.text?.cues?.find((item) => item.id === member.cueId);
            return <li key={`${member.sectionId}:${member.cueId}`}><span>{memberSection?.label}</span>{memberCue?.text}</li>;
          })}</ol>
          <button type="button" onClick={() => store.setSelection({ type: 'cue', sectionId: section.id, cueId: cue.id, keyPart: 'focus' })}>Keep primary only</button>
        </div>
      ) : null}
      <p className="about-editor-help">Drag the pink timing marker anywhere from 0–100% of its Section. This moves the title's focus time only. Its travel duration, speed, blur, and in/out cadence remain controlled globally under Spatial titles.</p>
      <Property label="Statement"><textarea rows="7" value={cue.text} onChange={(event) => update('text', event.target.value)} /></Property>
      <Property label="Movement"><select value={movement} onChange={(event) => updateMovement(event.target.value)}><option value="spatial">Spatial travel</option><option value="vertical">Vertical scroll</option></select></Property>
      <NumberProperty
        label="Position"
        value={Number((cue.hold * 100).toFixed(1))}
        min={Number((timingBounds.min * 100).toFixed(1))}
        max={Number((timingBounds.max * 100).toFixed(1))}
        step={0.5}
        unit="%"
        disabled={timingBounds.min === timingBounds.max}
        onChange={moveCue}
      />
      {movement === 'spatial' ? (
        <>
          <Property label="Auto travel"><output className="about-editor-readout">{Math.round(motionInterval.start * 100)}–{Math.round(motionInterval.end * 100)}%</output></Property>
          <Property label="Motion preset"><select value={cue.preset} onChange={(event) => update('preset', event.target.value)}><option value="travelling-title-v1">Travelling title</option><option value="opener-v1">Opener</option><option value="finale-v1">Finale</option></select></Property>
        </>
      ) : <Property label="Reveal"><output className="about-editor-readout">Editorial vertical scroll</output></Property>}
      <CueRhythmAndReuse store={store} snapshot={snapshot} clipboard={clipboard} setClipboard={setClipboard} />
      <button type="button" className="about-editor-danger" disabled={section.type === 'finale'} onClick={remove}>Delete Cue</button>
    </>
  );
}

function DisciplineRevealInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const reveal = section.text.disciplineReveal;
  if (!reveal) return <SectionInspector store={store} snapshot={snapshot} section={section} />;
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => {
    mutate(draft.sections[sectionIndex].text.disciplineReveal);
  }, { coalesceKey, selection: snapshot.selection });
  const occupied = ((reveal.items.length - 1) * reveal.stagger) + reveal.labelDuration + reveal.hold;
  const limitsFor = (control) => {
    if (control.id === 'start') return { min: control.min, max: Math.max(control.min, reveal.end - occupied) };
    if (control.id === 'end') return { min: Math.min(control.max, reveal.start + occupied), max: control.max };
    if (control.id === 'stagger') return {
      min: control.min,
      max: Math.max(control.min, (reveal.end - reveal.start - reveal.labelDuration - reveal.hold) / Math.max(1, reveal.items.length - 1)),
    };
    if (control.id === 'labelDuration') return {
      min: control.min,
      max: Math.max(control.min, reveal.end - reveal.start - ((reveal.items.length - 1) * reveal.stagger) - reveal.hold),
    };
    if (control.id === 'hold') return {
      min: control.min,
      max: Math.max(control.min, reveal.end - reveal.start - ((reveal.items.length - 1) * reveal.stagger) - reveal.labelDuration),
    };
    return { min: control.min, max: control.max };
  };
  return (
    <>
      <header><span>Text sequence</span><strong>Discipline reveal</strong></header>
      <p className="about-editor-help">One clip controls the complete six-point sequence. Drag its striped block in the Text lane to move every reveal together.</p>
      <details open><summary>Reveal choreography</summary>
        {ABOUT_NARRATIVE_DISCIPLINE_REVEAL_CONTROLS.map((control) => {
          const limits = limitsFor(control);
          return (
            <NumberProperty
              key={control.id}
              label={control.label}
              value={reveal[control.id]}
              min={limits.min}
              max={limits.max}
              step={control.step}
              unit={control.unit}
              onChange={(value) => update(`Change ${control.label}`, (draft) => { draft[control.id] = value; }, `discipline-reveal:${section.id}:${control.id}`)}
            />
          );
        })}
      </details>
      <details open><summary>Reveal order and labels</summary>
        <div className="about-editor-discipline-items">
          {reveal.items.map((item, itemIndex) => (
            <div className="about-editor-discipline-item" key={item.group}>
              <code>{String(itemIndex + 1).padStart(2, '0')}</code>
              <input value={item.label} aria-label={`Discipline ${itemIndex + 1} label`} onChange={(event) => update('Edit discipline label', (draft) => { draft.items[itemIndex].label = event.target.value; }, `discipline-reveal:${section.id}:item:${item.group}:label`)} />
              <div className="about-editor-discipline-palette" title={`${item.label} uses the Home simulation ${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}`}>
                <i style={{ background: `var(${DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]})` }} />
                <code>{DISCIPLINE_BALL_TOKEN_BY_GROUP[item.group]}</code>
              </div>
              <span>
                <button type="button" disabled={itemIndex === 0} aria-label={`Reveal ${item.label} earlier`} onClick={() => update('Reorder discipline reveal', (draft) => { const [moved] = draft.items.splice(itemIndex, 1); draft.items.splice(itemIndex - 1, 0, moved); })}>↑</button>
                <button type="button" disabled={itemIndex === reveal.items.length - 1} aria-label={`Reveal ${item.label} later`} onClick={() => update('Reorder discipline reveal', (draft) => { const [moved] = draft.items.splice(itemIndex, 1); draft.items.splice(itemIndex + 1, 0, moved); })}>↓</button>
              </span>
            </div>
          ))}
        </div>
      </details>
      <p className="about-editor-help">The six points persist after the labels leave. An editorial block marked “Reconnect point grid” restores the surrounding grid as that paragraph enters.</p>
    </>
  );
}

function CameraInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const keyIndex = snapshot.selection.keyIndex;
  const selectedKey = section.camera.keys[keyIndex];
  const key = selectedKey && selectedKey.at > 0 && selectedKey.at < 1 ? selectedKey : null;
  const local = getLocalProgress(snapshot.compiledPlan, section, snapshot.transport.storyWU);
  const targetAt = Math.min(0.995, Math.max(0.005, snapAboutNarrativeTimelineValue(local)));
  const applyPreset = (preset) => store.commit(`Apply ${preset} camera recipe`, (draft) => {
    const recipes = {
      Push: [
        { at: 0, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: 'smoothstep' },
        { at: 1, offset: [0, 0, -1.2], lookAtOffset: [0, 0, -1], fov: 45, roll: 0, easing: 'smoothstep' },
      ],
      Glide: [
        { at: 0, offset: [-0.8, 0, 0], lookAtOffset: [0.4, 0, -1], fov: 48, roll: 0, easing: 'smoothstep' },
        { at: 1, offset: [0.8, 0, 0], lookAtOffset: [-0.4, 0, -1], fov: 48, roll: 0, easing: 'smoothstep' },
      ],
      Orbit: [
        { at: 0, offset: [-0.7, 0, 0], lookAtOffset: [0.7, 0, -1], fov: 48, roll: -0.08, easing: 'smoothstep' },
        { at: 0.5, offset: [0.7, 0.25, 0], lookAtOffset: [-0.7, -0.1, -1], fov: 48, roll: 0.08, easing: 'smoothstep' },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: 'smoothstep' },
      ],
      Reveal: [
        { at: 0, offset: [0, -0.45, 0.5], lookAtOffset: [0, 0.3, -1], fov: 56, roll: 0, easing: 'smoothstep' },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 46, roll: 0, easing: 'smoothstep' },
      ],
      Resolve: [
        { at: 0, offset: [0.3, 0.2, 0], lookAtOffset: [-0.3, -0.2, -1], fov: 52, roll: 0.14, easing: 'smoothstep' },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: 'smoothstep' },
      ],
    };
    draft.sections[sectionIndex].camera.keys = recipes[preset];
    bridgeCameraSection(draft, sectionIndex);
  }, { selection: { type: 'section', sectionId: section.id } });
  const existingKeyAtPlayhead = section.camera.keys.findIndex((item) => (
    item.at > 0 && item.at < 1 && Math.abs(item.at - targetAt) < 0.0025
  ));
  const setKey = () => {
    if (existingKeyAtPlayhead >= 0) {
      store.setSelection({ type: 'camera-key', sectionId: section.id, keyIndex: existingKeyAtPlayhead });
      return;
    }
    const insertionIndex = section.camera.keys.findIndex((item) => item.at > targetAt);
    const selectedKeyIndex = insertionIndex < 0 ? section.camera.keys.length : insertionIndex;
    const sampled = sampleAboutNarrativePlan(snapshot.compiledPlan, snapshot.transport.storyWU);
    const baseZ = snapshot.document.globals.camera.startZ - (snapshot.transport.storyWU * sampled.camera.cadence);
    const newKey = {
      at: targetAt,
      offset: [sampled.camera.position[0], sampled.camera.position[1], sampled.camera.position[2] - baseZ],
      lookAtOffset: sampled.camera.target.map((value, axis) => value - sampled.camera.position[axis]),
      fov: sampled.camera.fov,
      roll: sampled.camera.roll,
      easing: 'smoothstep',
    };
    store.commit('Set camera key', (draft) => {
      draft.sections[sectionIndex].camera.keys.push(newKey);
      draft.sections[sectionIndex].camera.keys.sort((a, b) => a.at - b.at);
    }, { selection: { type: 'camera-key', sectionId: section.id, keyIndex: selectedKeyIndex } });
  };
  const recipes = <div className="about-editor-camera-recipes">{['Push', 'Glide', 'Orbit', 'Reveal', 'Resolve'].map((name) => <button type="button" key={name} onClick={() => applyPreset(name)}>{name}</button>)}</div>;
  if (!key) {
    return <><header><span>Camera track</span><strong>Editing Section base</strong></header><p className="about-editor-help">The dolly and Section joins are continuous automatically. Add visible keys only where the framing, aim, roll, or lens should change.</p>{recipes}<button type="button" className="about-editor-wide-action" onClick={setKey}>Set camera key at {formatCameraPercent(targetAt)}</button></>;
  }
  const update = (field, value) => store.commit(`Edit camera ${field}`, (draft) => {
    draft.sections[sectionIndex].camera.keys[keyIndex][field] = Array.isArray(value) ? [...value] : value;
    if (CAMERA_POSE_FIELDS.has(field)) linkCameraBoundary(draft, sectionIndex, keyIndex);
  }, { coalesceKey: `camera:${section.id}:${keyIndex}:${field}`, selection: snapshot.selection });
  const updateVector = (field, axis, value) => {
    const next = [...key[field]];
    next[axis] = value;
    update(field, next);
  };
  const timingBounds = getAboutNarrativeCameraKeyTimingBounds(section.camera.keys, keyIndex);
  const extentField = snapshot.previewProfile === 'mobile' ? 'mobileExtentWU' : 'extentWU';
  const extentLabel = snapshot.previewProfile === 'mobile' ? 'Mobile length' : 'Section length';
  const updateExtent = (value) => store.commit('Change Section extent', (draft) => {
    draft.sections[sectionIndex][extentField] = value;
  }, { coalesceKey: `section:${section.id}:${extentField}`, selection: snapshot.selection });
  return (
    <>
      <header><span>Camera key</span><strong>{formatCameraPercent(key.at)} through {section.label}</strong></header>
      {recipes}
      <NumberProperty
        label="Position"
        value={Number((key.at * 100).toFixed(1))}
        min={Number((timingBounds.min * 100).toFixed(1))}
        max={Number((timingBounds.max * 100).toFixed(1))}
        step={0.5}
        unit="%"
        onChange={(value) => update('at', Math.min(timingBounds.max, Math.max(timingBounds.min, snapAboutNarrativeTimelineValue(value / 100))))}
      />
      <NumberProperty label={extentLabel} value={section[extentField]} min={1} max={8} step={0.05} unit="WU" onChange={updateExtent} />
      {['X offset', 'Y offset', 'Forward offset'].map((label, axis) => <NumberProperty key={label} label={label} value={key.offset[axis]} min={-8} max={8} step={0.02} unit="WU" onChange={(value) => updateVector('offset', axis, value)} />)}
      {['Aim X', 'Aim Y', 'Aim depth'].map((label, axis) => <NumberProperty key={label} label={label} value={key.lookAtOffset[axis]} min={-8} max={8} step={0.02} unit="WU" onChange={(value) => updateVector('lookAtOffset', axis, value)} />)}
      <NumberProperty label="Field of view" value={key.fov} min={20} max={90} step={1} unit="°" onChange={(value) => update('fov', value)} />
      <NumberProperty label="Roll" value={key.roll} min={-1.2} max={1.2} step={0.01} unit="rad" onChange={(value) => update('roll', value)} />
      <Property label="Easing"><select value={key.easing} onChange={(event) => update('easing', event.target.value)}><option value="smoothstep">Smoothstep</option><option value="ease-in-out">Ease in out</option></select></Property>
      <button type="button" className="about-editor-wide-action" disabled={existingKeyAtPlayhead >= 0} onClick={setKey}>{existingKeyAtPlayhead >= 0 ? `Camera key already at ${formatCameraPercent(targetAt)}` : `Set another key at ${formatCameraPercent(targetAt)}`}</button>
      <button type="button" className="about-editor-danger" onClick={() => store.commit('Delete camera key', (draft) => { draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1); }, { selection: { type: 'section', sectionId: section.id } })}>Delete key</button>
    </>
  );
}

const CORRESPONDENCE_LABELS = Object.freeze({
  'index-v1': 'Index order',
  'stable-seed': 'Stable seed',
  'spatial-nearest-v1': 'Local travel (approx.)',
  'group-aware': 'Group aware',
});

function WorldInspector({ store, snapshot, section, runtimeMetrics }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  if (section.world.mode !== 'set') {
    return <><header><span>World track</span><strong>Inherited World</strong></header><p className="about-editor-help">This Section keeps the previous World. Choose “Create World clip” only when the shape should change here.</p><button type="button" className="about-editor-wide-action" onClick={() => store.commit('Create World clip', (draft) => {
      draft.sections[sectionIndex].world = cloneAboutNarrativeDocument(draft.sections.slice(0, sectionIndex).reverse().find((item) => item.world.mode === 'set')?.world || draft.sections[0].world);
    })}>Create World clip</button></>;
  }
  const world = section.world;
  const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[world.shapeId];
  const transitionLimit = getAboutNarrativeWorldTransitionLimit(snapshot.compiledPlan, sectionIndex);
  const transitionMax = Math.max(transitionLimit, world.transitionIn.end, 1);
  const transitionEnabled = world.transitionIn.type !== 'cut';
  const correspondenceEnabled = ['morph', 'dissolve-morph'].includes(world.transitionIn.type);
  const previousWorldSection = snapshot.document.sections
    .slice(0, sectionIndex)
    .reverse()
    .find((item) => item.world.mode === 'set');
  const sourceShape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[previousWorldSection?.world.shapeId || world.shapeId];
  const prepared = runtimeMetrics?.preparedWorldIds?.includes(section.id);
  const correspondenceStatus = runtimeMetrics?.correspondenceSequenceState === 'failed'
    ? 'Failed'
    : runtimeMetrics?.correspondenceSequenceState === 'loading'
      ? 'Preparing'
      : prepared
        ? runtimeMetrics?.correspondenceFallback && runtimeMetrics?.correspondenceToWorldId === section.id
          ? 'Baseline fallback'
          : 'Ready'
        : 'Preparing';
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => mutate(draft.sections[sectionIndex].world), { coalesceKey, selection: snapshot.selection });
  const tryShape = (shapeId) => store.beginTry(`Replace Shape with ${ABOUT_NARRATIVE_SHAPE_DEFINITIONS[shapeId].label}`, (draft) => {
    const target = draft.sections[sectionIndex].world;
    target.shapeId = shapeId;
    target.shapeParameters = Object.fromEntries(ABOUT_NARRATIVE_SHAPE_DEFINITIONS[shapeId].parameters.map((control) => [control.id, control.id === 'density' ? 1 : (control.min + control.max) / 2]));
  });
  return (
    <>
      <header><span>World clip</span><strong>{shape?.label || world.shapeId}</strong></header>
      <div className="about-editor-shape-catalog">
        {Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map((item) => (
          <button type="button" key={item.id} disabled={section.locked} className={item.id === world.shapeId ? 'is-selected' : ''} onClick={() => tryShape(item.id)}>
            <i /><span><strong>{item.label}</strong><small>Cost {item.cost} · Point field</small></span>
          </button>
        ))}
      </div>
      {snapshot.tryState ? <div className="about-editor-try"><span>Trying {snapshot.tryState.label}</span><button type="button" onClick={() => store.cancelTry()}>Cancel</button><button type="button" className="is-primary" onClick={() => store.applyTry()}>Apply</button></div> : null}
      <details open><summary>Shape parameters</summary>
        {(shape?.parameters || []).map((control) => <NumberProperty key={control.id} label={control.label} value={world.shapeParameters[control.id]} min={control.min} max={control.max} step={control.step} unit={control.unit} onChange={(value) => update(`Change ${control.label}`, (draft) => { draft.shapeParameters[control.id] = value; }, `world:${section.id}:${control.id}`)} />)}
        <div className="about-editor-inline-actions"><button type="button" onClick={() => update('Reseed Shape', (draft) => { draft.seed = Math.floor(Math.random() * 0xffffffff); })}>Reseed</button><code>{world.seed}</code></div>
      </details>
      <details open><summary>Placement</summary>
        <NumberProperty label="Distance at entry" value={world.entryDistanceWU} min={0.2} max={16} step={0.05} unit="WU" onChange={(value) => update('Move World', (draft) => { draft.entryDistanceWU = value; }, `world:${section.id}:distance`)} />
        <NumberProperty label="Scale" value={world.transform.scale} min={0.1} max={3} step={0.01} onChange={(value) => update('Scale World', (draft) => { draft.transform.scale = value; }, `world:${section.id}:scale`)} />
      </details>
      <details open><summary>Transition in</summary>
        {transitionEnabled ? <>
          <p className="about-editor-help">Timing is relative to this Section: 1 is its end; values above 1 continue across inherited World Sections. The next World begins at {transitionLimit.toFixed(3)}.</p>
          <NumberProperty label="Start" value={world.transitionIn.start} min={0} max={transitionMax} step={0.005} unit="× section" onChange={(value) => update('Change transition start', (draft) => { draft.transitionIn.start = Math.min(value, draft.transitionIn.end); })} />
          <NumberProperty label="End" value={world.transitionIn.end} min={0} max={transitionMax} step={0.005} unit="× section" onChange={(value) => update('Change transition end', (draft) => { draft.transitionIn.end = Math.max(value, draft.transitionIn.start); })} />
          <Property label="Type"><select value={world.transitionIn.type} onChange={(event) => update('Change transition type', (draft) => { draft.transitionIn.type = event.target.value; })}><option value="morph">Morph</option><option value="dissolve-morph">Dissolve morph</option><option value="crossfade">Crossfade</option><option value="hold">Hold</option></select></Property>
          <Property label="Easing"><select value={world.transitionIn.easing} onChange={(event) => update('Change transition easing', (draft) => { draft.transitionIn.easing = event.target.value; })}><option value="linear">Linear</option><option value="smoothstep">Smoothstep</option><option value="ease-in">Ease in</option><option value="ease-out">Ease out</option><option value="ease-in-out">Ease in out</option><option value="hold">Hold</option></select></Property>
          <p className="about-editor-help">Maps {sourceShape?.label || 'previous Shape'} → {shape?.label || world.shapeId}.</p>
          <Property label="Correspondence"><select aria-label="Correspondence" value={world.transitionIn.correspondence} disabled={!correspondenceEnabled} title={correspondenceEnabled ? 'Choose how source points are assigned to target points.' : 'Correspondence applies to Morph and Dissolve morph transitions.'} onChange={(event) => update('Change correspondence', (draft) => { draft.transitionIn.correspondence = event.target.value; })}>{ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((mode) => <option value={mode} key={mode}>{CORRESPONDENCE_LABELS[mode] || mode}</option>)}</select></Property>
          <p className="about-editor-help" role="status" aria-live="polite">Correspondence: {correspondenceStatus}{prepared && runtimeMetrics?.correspondenceToWorldId === section.id && Number.isFinite(runtimeMetrics?.correspondenceImprovement) ? ` · ${Math.round(runtimeMetrics.correspondenceImprovement * 100)}% RMS improvement` : ''}.</p>
          <button type="button" className="about-editor-danger" onClick={() => store.commit('Remove World transition', (draft) => {
            const transition = draft.sections[sectionIndex].world.transitionIn;
            transition.start = 0;
            transition.end = 0;
            transition.type = 'cut';
          }, { selection: { type: 'world', sectionId: section.id } })}>Remove transition keyframes</button>
        </> : <>
          <p className="about-editor-help">This World cuts in at the Section boundary and has no transition keyframes.</p>
          <button type="button" className="about-editor-wide-action" onClick={() => store.commit('Add World transition', (draft) => {
            const transition = draft.sections[sectionIndex].world.transitionIn;
            transition.start = Math.min(0.08, transitionLimit);
            transition.end = Math.min(0.68, transitionLimit);
            transition.type = 'morph';
          }, { selection: { type: 'world', sectionId: section.id } })}>Add transition keyframes</button>
        </>}
      </details>
      <details open><summary>Modifier stack</summary>
        {world.modifiers.map((item, modifierIndex) => {
          const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[item.id];
          const moveModifier = (direction) => update('Reorder modifier', (draft) => {
            const nextIndex = modifierIndex + direction;
            if (nextIndex < 0 || nextIndex >= draft.modifiers.length) return;
            const [moved] = draft.modifiers.splice(modifierIndex, 1);
            draft.modifiers.splice(nextIndex, 0, moved);
          });
          return <div className="about-editor-modifier" key={`${item.id}-${modifierIndex}`}><div><label><input type="checkbox" checked={item.enabled} onChange={(event) => update(`Toggle ${definition?.label}`, (draft) => { draft.modifiers[modifierIndex].enabled = event.target.checked; })} />{definition?.label || item.id}</label><span><button type="button" disabled={modifierIndex === 0} onClick={() => moveModifier(-1)} aria-label="Move modifier up">↑</button><button type="button" disabled={modifierIndex === world.modifiers.length - 1} onClick={() => moveModifier(1)} aria-label="Move modifier down">↓</button> Cost {definition?.cost || '?'}</span></div>{(definition?.parameters || []).map((control) => control.type === 'range' ? <NumberProperty key={control.id} label={control.label} value={item.parameters[control.id]} min={control.min} max={control.max} step={control.step} unit={control.unit} onChange={(value) => update(`Change ${control.label}`, (draft) => { draft.modifiers[modifierIndex].parameters[control.id] = value; }, `modifier:${section.id}:${modifierIndex}:${control.id}`)} /> : <Property key={control.id} label={control.label}><select value={item.parameters[control.id]} onChange={(event) => update(`Change ${control.label}`, (draft) => { draft.modifiers[modifierIndex].parameters[control.id] = event.target.value; })}>{control.options.map((option) => <option key={option}>{option}</option>)}</select></Property>)}</div>;
        })}
      </details>
    </>
  );
}

function Diagnostics({ diagnostics }) {
  if (!diagnostics.length) return <div className="about-editor-diagnostics is-clear"><Check aria-hidden="true" /> No diagnostics</div>;
  return <div className="about-editor-diagnostics">{diagnostics.map((item, index) => {
    const DiagnosticIcon = item.level === 'error' ? CircleAlert : Info;
    return <div key={`${item.code}-${item.path}-${index}`} className={`is-${item.level}`}><DiagnosticIcon aria-hidden="true" /><span><strong>{item.message}</strong><small>{item.path}</small></span></div>;
  })}</div>;
}

function AuditionControls({ store, snapshot }) {
  const [preRollWU, setPreRollWU] = useState(0.18);
  const [postRollWU, setPostRollWU] = useState(0.18);
  const members = getAboutNarrativeSelectionMembers(snapshot.selection);
  const source = snapshot.selection.type === 'cue'
    ? { type: 'cue-group', sectionId: snapshot.selection.sectionId, members, primary: snapshot.selection }
    : ['section', 'world', 'camera-key'].includes(snapshot.selection.type)
      ? snapshot.selection
      : null;
  if (!source) return null;
  const range = deriveAboutNarrativeLoopRange({
    document: snapshot.document,
    plan: snapshot.compiledPlan,
    source,
    preRollWU,
    postRollWU,
  });
  const active = range.valid
    && snapshot.transport.loop?.sourceType === range.sourceType
    && snapshot.transport.loop?.sourceId === range.sourceId;
  const toggle = () => {
    if (active) {
      store.setTransport({ owner: 'timeline', playing: false, loop: null });
      return;
    }
    if (!range.valid) return;
    store.setTransport({
      owner: 'playback',
      playing: true,
      liveAmbient: false,
      storyWU: range.startWU,
      loop: range,
    });
  };
  return (
    <details className="about-editor-audition">
      <summary>Boundary audition</summary>
      <div className="about-editor-audition-range">
        <Property label="Pre-roll"><input type="number" min="0" max="2" step="0.05" value={preRollWU} onChange={(event) => setPreRollWU(Math.max(0, Number(event.target.value) || 0))} /></Property>
        <Property label="Post-roll"><input type="number" min="0" max="2" step="0.05" value={postRollWU} onChange={(event) => setPostRollWU(Math.max(0, Number(event.target.value) || 0))} /></Property>
      </div>
      {range.valid ? <p className="about-editor-help">{formatWU(range.startWU)} → {formatWU(range.endWU)} · ambient motion freezes for a repeatable review.</p> : <p className="about-editor-rhythm-message is-error">{range.reason}</p>}
      <button type="button" className={active ? 'is-active about-editor-wide-action' : 'about-editor-wide-action'} disabled={!range.valid} onClick={toggle}>{active ? 'Stop audition' : 'Loop this selection'}</button>
    </details>
  );
}

function Inspector({ store, snapshot, timelineOpen, runtimeMetrics, clipboard, setClipboard }) {
  const inspectorRef = useRef(null);
  const dragRef = useRef(null);
  const lastHeaderClickRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const section = getSection(snapshot.document, snapshot.selection);
  let content = <SectionInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'sequence') content = <SequenceInspector store={store} snapshot={snapshot} />;
  if (snapshot.selection.type === 'cue') content = <CueInspector store={store} snapshot={snapshot} section={section} clipboard={clipboard} setClipboard={setClipboard} />;
  if (snapshot.selection.type === 'discipline-reveal') content = <DisciplineRevealInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'camera-key') content = <CameraInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'world') content = <WorldInspector store={store} snapshot={snapshot} section={section} runtimeMetrics={runtimeMetrics} />;
  if (snapshot.selection.type === 'interaction') content = <SectionInspector store={store} snapshot={snapshot} section={section} />;

  useEffect(() => {
    const keepInBounds = () => {
      if (window.innerWidth < 760) {
        setPosition(null);
        return;
      }
      setPosition((current) => (
        current && inspectorRef.current
          ? clampInspectorPosition(inspectorRef.current, current, timelineOpen)
          : current
      ));
    };
    keepInBounds();
    window.addEventListener('resize', keepInBounds);
    return () => window.removeEventListener('resize', keepInBounds);
  }, [timelineOpen]);

  const beginDrag = (event) => {
    if (event.button !== 0 || window.innerWidth < 760 || !event.target.closest('header')) return;
    const inspector = inspectorRef.current;
    if (!inspector) return;
    const rect = inspector.getBoundingClientRect();
    const { minTop, maxBottom } = getInspectorVerticalBounds(inspector, timelineOpen);
    const availableHeight = maxBottom - minTop;
    const floatingHeight = Math.min(rect.height, 560, Math.max(240, availableHeight * 0.72));
    const start = clampInspectorPosition(inspector, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: floatingHeight,
    }, timelineOpen);
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      start,
      moved: false,
    };
    inspector.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event) => {
    const drag = dragRef.current;
    const inspector = inspectorRef.current;
    if (!drag || !inspector || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.originX;
    const deltaY = event.clientY - drag.originY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < 3) return;
    drag.moved = true;
    setDragging(true);
    setPosition(clampInspectorPosition(inspector, {
      ...drag.start,
      left: drag.start.left + deltaX,
      top: drag.start.top + deltaY,
    }, timelineOpen));
  };

  const endDrag = (event) => {
    const drag = dragRef.current;
    if (drag?.pointerId !== event.pointerId) return;
    if (!drag.moved) {
      const now = performance.now();
      const previous = lastHeaderClickRef.current;
      if (previous && now - previous.time < 360
        && Math.hypot(event.clientX - previous.x, event.clientY - previous.y) < 6) {
        setPosition(null);
        lastHeaderClickRef.current = null;
      } else {
        lastHeaderClickRef.current = { time: now, x: event.clientX, y: event.clientY };
      }
    }
    dragRef.current = null;
    setDragging(false);
    if (inspectorRef.current?.hasPointerCapture(event.pointerId)) {
      inspectorRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const resetPosition = () => setPosition(null);

  return (
    <aside
      ref={inspectorRef}
      className={`about-editor-inspector${dragging ? ' is-dragging' : ''}`}
      data-floating={position ? 'true' : 'false'}
      style={position ? {
        left: position.left,
        top: position.top,
        right: 'auto',
        bottom: 'auto',
        width: position.width,
        height: position.height,
      } : undefined}
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={resetPosition}
    ><div className="about-editor-inspector-scroll">{content}<AuditionControls store={store} snapshot={snapshot} /><Diagnostics diagnostics={snapshot.diagnostics} /></div></aside>
  );
}

function CameraPathOverlay({ snapshot }) {
  const sections = snapshot.compiledPlan?.sections || [];
  const total = snapshot.compiledPlan?.maxStoryWU || 1;
  return (
    <div className="about-editor-path-overlay" aria-label="Camera path overlay">
      <div><strong>Path · constant cadence</strong><span>{formatWU(snapshot.transport.storyWU)} / {formatWU(total)}</span></div>
      <svg viewBox="0 0 240 112" role="img" aria-label="Camera and World anchors over story distance">
        <path d="M18 56 H222" />
        {sections.map((section) => {
          const x = 18 + ((section.startWU / total) * 204);
          return <g key={section.id} transform={`translate(${x} 56)`}><line y1="-12" y2="12" /><circle r={section.worldState?.changesWorld ? 4 : 2} /><title>{section.label}{section.worldState?.changesWorld ? ` · ${section.worldState.activeWorld.shapeId}` : ''}</title></g>;
        })}
        <g className="is-playhead" transform={`translate(${18 + ((snapshot.transport.storyWU / total) * 204)} 56)`}><path d="M0 -22 L5 -15 H-5 Z" /><line y1="-15" y2="22" /></g>
      </svg>
      <small>Dots are Section boundaries. Large dots are fixed World anchors. The marker is the published camera.</small>
    </div>
  );
}

export default function AboutNarrativeEditor({ store, runtimeRef, rootRef }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [checkpoints, setCheckpoints] = useState(() => readAboutNarrativeCheckpoints());
  const [clipboard, setClipboard] = useState(null);
  const [runtimeMetrics, setRuntimeMetrics] = useState(null);
  const [pathVisible, setPathVisible] = useState(false);
  const [directorView, setDirectorView] = useState(false);
  const [mobilePane, setMobilePane] = useState('sequence');
  const [timelineOpen, setTimelineOpen] = useState(() => (
    window.localStorage.getItem(ABOUT_EDITOR_TIMELINE_STORAGE_KEY) !== 'closed'
  ));
  const importRef = useRef(null);
  const snapshotRef = useRef(snapshot);
  const activeSelection = snapshot.selection;

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    window.localStorage.setItem(ABOUT_EDITOR_TIMELINE_STORAGE_KEY, timelineOpen ? 'open' : 'closed');
  }, [timelineOpen]);

  useEffect(() => {
    const root = rootRef.current;
    const runtime = runtimeRef.current;
    root?.setAttribute('data-editor-active', 'true');
    loadAboutNarrativeSource().then(({ document, hash }) => {
      const current = store.getSnapshot();
      if (!current.dirty) store.replaceDocument('Refresh canonical source', document);
      store.setBaseline(document, hash);
      const recovery = readAboutNarrativeRecoveryDraft();
      if (recovery && recovery.timestamp > Date.now() - (14 * 86400000)) {
        store.setRecoveryState({ available: true, draft: recovery, error: '' });
      }
    }).catch((error) => store.setSaveState({ status: 'failed', message: error.message }));
    return () => {
      root?.removeAttribute('data-editor-active');
      runtime?.setDirectorView?.(false);
    };
  }, [rootRef, runtimeRef, store]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    root.querySelectorAll('.is-editor-selected').forEach((node) => node.classList.remove('is-editor-selected'));
    getAboutNarrativeSelectionMembers(activeSelection).forEach((member) => {
      root.querySelector(`[data-text-cue="${CSS.escape(member.cueId)}"]`)?.classList.add('is-editor-selected');
    });
    root.dataset.editorSelectionType = activeSelection.type || '';
    return () => {
      root.querySelectorAll('.is-editor-selected').forEach((node) => node.classList.remove('is-editor-selected'));
      delete root.dataset.editorSelectionType;
    };
  }, [activeSelection, rootRef]);

  useEffect(() => {
    const interval = window.setInterval(() => setRuntimeMetrics(runtimeRef.current?.getMetrics?.() || null), 500);
    return () => window.clearInterval(interval);
  }, [runtimeRef]);

  useEffect(() => {
    if (!snapshot.dirty) return undefined;
    const timer = window.setTimeout(() => {
      try {
        writeAboutNarrativeRecoveryDraft(snapshot.document, snapshot.baselineHash);
      } catch (error) {
        store.setRecoveryState({ error: `Draft storage failed: ${error.message}` });
      }
    }, 900);
    return () => window.clearTimeout(timer);
  }, [snapshot.baselineHash, snapshot.dirty, snapshot.document, store]);

  useEffect(() => {
    const pagehide = () => {
      const current = snapshotRef.current;
      if (current.dirty) {
        try { writeAboutNarrativeRecoveryDraft(current.document, current.baselineHash); } catch { /* surfaced by normal autosave */ }
      }
    };
    const keydown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        document.querySelector('[data-about-editor-save]')?.click();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? store.redo() : store.undo();
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
        && !isTextEditingTarget(event.target) && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
        event.preventDefault();
        jumpTimelineKeyframe(store, store.getSnapshot(), event.key === 'ArrowRight' ? 1 : -1);
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey
        && !isTextEditingTarget(event.target) && ['Backspace', 'Delete'].includes(event.key)
        && deleteTimelineSelection(store, store.getSnapshot())) {
        event.preventDefault();
      }
      if (event.key === 'Escape') {
        const current = store.getSnapshot();
        if (current.previewState) store.cancelPreview();
        else if (current.tryState) store.cancelTry();
        else if (getAboutNarrativeSelectionMembers(current.selection).length > 1) {
          store.setSelection({
            type: 'cue',
            sectionId: current.selection.sectionId,
            cueId: current.selection.cueId,
            keyPart: current.selection.keyPart || 'focus',
          });
        }
        else if (current.selection.type !== 'section') store.setSelection({ type: 'section', sectionId: current.selection.sectionId });
        else store.setSelection({ type: 'sequence' });
      }
    };
    window.addEventListener('pagehide', pagehide);
    window.addEventListener('keydown', keydown);
    return () => { window.removeEventListener('pagehide', pagehide); window.removeEventListener('keydown', keydown); };
  }, [store]);

  const save = async () => {
    const editorUrl = new URL(window.location.href);
    editorUrl.searchParams.set('edit', '1');
    window.history.replaceState(window.history.state, '', `${editorUrl.pathname}${editorUrl.search}${editorUrl.hash}`);
    const sent = cloneAboutNarrativeDocument(snapshot.document);
    if (snapshot.diagnostics.some((item) => item.level === 'error')) {
      store.setSaveState({ status: 'failed', message: 'Resolve validation errors before saving.' });
      return;
    }
    store.setSaveState({ status: 'saving', message: '' });
    try {
      const result = await saveAboutNarrativeSource(sent, snapshot.baselineHash);
      store.markSaved(sent, result.hash);
      clearAboutNarrativeRecoveryDraft();
    } catch (error) {
      store.setSaveState({ status: error.status === 409 ? 'conflict' : 'failed', message: error.message });
    }
  };

  const addCheckpoint = () => {
    const checkpoint = {
      id: crypto.randomUUID(),
      name: `Checkpoint ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      timestamp: Date.now(),
      storyWU: snapshot.transport.storyWU,
      baseSourceHash: snapshot.baselineHash,
      document: snapshot.document,
    };
    setCheckpoints(writeAboutNarrativeCheckpoint(checkpoint));
  };
  const statusLabel = snapshot.saveState.status === 'saving' ? 'Saving…'
    : snapshot.saveState.status === 'conflict' ? 'Source changed'
      : snapshot.saveState.status === 'failed' ? 'Save failed'
        : snapshot.dirty ? 'Draft' : 'Saved';
  const selected = snapshot.selection.type === 'sequence'
    ? null
    : getSection(snapshot.document, snapshot.selection);
  const compiledSelected = snapshot.compiledPlan?.sections.find((section) => section.id === selected?.id);
  const resolvedExtent = compiledSelected?.resolvedExtentWU || selected?.extentWU || 0;
  const selectedExtent = selected
    ? Number(snapshot.previewProfile === 'mobile' ? selected.mobileExtentWU : selected.extentWU)
    : 0;
  const selectedCueCount = getAboutNarrativeSelectionMembers(snapshot.selection).length;
  const loopActive = Boolean(snapshot.transport.loop);
  const timelineDeletion = getTimelineDeletion(snapshot);
  const toggleLoop = () => {
    if (loopActive) {
      store.setTransport({ owner: 'timeline', playing: false, loop: null });
      return;
    }
    const range = deriveAboutNarrativeLoopRange({
      document: snapshot.document,
      plan: snapshot.compiledPlan,
      source: selected ? { type: 'section', sectionId: selected.id } : null,
    });
    if (range.valid) store.setTransport({ loop: range });
  };
  const toggleSolo = (track) => store.setTransport({
    soloTrack: snapshot.transport.soloTrack === track ? null : track,
  });
  const fitSequence = () => {
    store.setTransport({ zoom: 1 });
    requestAnimationFrame(() => {
      const lanes = document.querySelector('.about-editor-lanes');
      if (lanes) lanes.scrollLeft = 0;
    });
  };
  const fitSection = () => {
    if (!compiledSelected || !snapshot.compiledPlan?.maxStoryWU) return;
    const sectionSpan = Math.max(0.001, compiledSelected.resolvedExtentWU);
    const zoom = Math.min(8, Math.max(1, (snapshot.compiledPlan.maxStoryWU / sectionSpan) * 0.82));
    store.setTransport({ zoom: Number(zoom.toFixed(3)) });
    requestAnimationFrame(() => {
      const lanes = document.querySelector('.about-editor-lanes');
      if (!lanes) return;
      const startRatio = compiledSelected.startWU / snapshot.compiledPlan.maxStoryWU;
      lanes.scrollLeft = Math.max(0, (startRatio * lanes.scrollWidth) - (lanes.clientWidth * 0.08));
    });
  };
  const toggleDirector = () => {
    const next = !directorView;
    setDirectorView(next);
    runtimeRef.current?.setDirectorView?.(next);
  };
  const toggleBefore = () => {
    if (snapshot.tryState?.label === 'Compare saved source') {
      store.cancelTry();
      return;
    }
    if (snapshot.tryState) return;
    store.beginTry('Compare saved source', (draft) => {
      Object.keys(draft).forEach((key) => delete draft[key]);
      Object.assign(draft, cloneAboutNarrativeDocument(snapshot.baselineDocument));
    });
  };

  return createPortal((
    <div
      className="about-editor"
      data-mobile-pane={mobilePane}
      data-timeline-open={timelineOpen ? 'true' : 'false'}
      role="region"
      aria-label="About Narrative creative toolkit"
    >
      <header className="about-editor-topbar">
        <button type="button" className="about-editor-brand" onClick={() => store.setSelection({ type: 'sequence' })}><Diamond aria-hidden="true" /><span>About Narrative</span><small>Creative toolkit</small></button>
        <Transport store={store} snapshot={snapshot} />
        <div className="about-editor-actions">
          <button type="button" disabled={!snapshot.history.canUndo} title={snapshot.history.undoLabel || 'Undo'} aria-label="Undo" onClick={() => store.undo()}><span aria-hidden="true">↶</span></button>
          <button type="button" disabled={!snapshot.history.canRedo} title={snapshot.history.redoLabel || 'Redo'} aria-label="Redo" onClick={() => store.redo()}><span aria-hidden="true">↷</span></button>
          <button type="button" className={pathVisible ? 'is-active' : ''} onClick={() => setPathVisible(!pathVisible)}>Path</button>
          <button type="button" className={directorView ? 'is-active' : ''} onClick={toggleDirector}>{directorView ? 'Director' : 'Camera'}</button>
          <button type="button" className={snapshot.tryState?.label === 'Compare saved source' ? 'is-active' : ''} disabled={snapshot.tryState && snapshot.tryState.label !== 'Compare saved source'} onClick={toggleBefore}>{snapshot.tryState?.label === 'Compare saved source' ? 'Before' : 'After'}</button>
          <details className="about-editor-more">
            <summary>More</summary>
            <div>
              <button type="button" onClick={addCheckpoint}>Checkpoint</button>
              <button type="button" onClick={() => exportAboutNarrativeDocument(snapshot.document)}>Export JSON</button>
              <button type="button" onClick={() => importRef.current?.click()}>Import JSON</button>
            </div>
          </details>
          <input ref={importRef} hidden type="file" accept="application/json" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              const imported = JSON.parse(await file.text());
              assertValidAboutNarrativeDocument(imported);
              store.replaceDocument('Import document', imported);
            } catch (error) { store.setSaveState({ status: 'failed', message: error.message }); }
            event.target.value = '';
          }} />
          <button type="button" data-about-editor-save className="is-save" disabled={snapshot.saveState.status === 'saving'} onClick={save}><span>{statusLabel}</span><kbd>⌘S</kbd></button>
        </div>
      </header>

      {snapshot.recoveryState.available ? <div className="about-editor-recovery"><span>An unsaved draft from {new Date(snapshot.recoveryState.draft.timestamp).toLocaleString()} is available.</span><button type="button" onClick={() => { store.replaceDocument('Recover draft', snapshot.recoveryState.draft.document); store.setRecoveryState({ available: false }); }}>Recover as unsaved copy</button><button type="button" onClick={() => { exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, 'contents-about-recovered.json'); }}>Export</button><button type="button" onClick={() => { clearAboutNarrativeRecoveryDraft(); store.setRecoveryState({ available: false }); }}>Discard</button></div> : null}
      {snapshot.saveState.message ? <div className={`about-editor-save-message is-${snapshot.saveState.status}`}>{snapshot.saveState.message}<button type="button" aria-label="Dismiss message" onClick={() => store.setSaveState({ message: '' })}>×</button></div> : null}

      {pathVisible ? <CameraPathOverlay snapshot={snapshot} /> : null}
      {directorView ? <div className="about-editor-director-controls"><strong>Director View</strong><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 })}>←</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 })}>↑</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 })}>↓</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 })}>→</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 })}>＋</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 })}>−</button><button type="button" onClick={() => runtimeRef.current?.resetDirector?.()}>Reset</button><small>Temporary inspection only. Published Camera keys are unchanged.</small></div> : null}

      <Inspector store={store} snapshot={snapshot} timelineOpen={timelineOpen} runtimeMetrics={runtimeMetrics} clipboard={clipboard} setClipboard={setClipboard} />
      <button
        type="button"
        className="about-editor-timeline-toggle"
        aria-controls="about-editor-timeline-panel"
        aria-expanded={timelineOpen}
        title={timelineOpen ? 'Hide timeline' : 'Show timeline'}
        onClick={() => setTimelineOpen((open) => !open)}
      >{timelineOpen ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}<span>{timelineOpen ? 'Hide timeline' : 'Show timeline'}</span></button>
      <div id="about-editor-timeline-panel" className="about-editor-bottom" aria-hidden={!timelineOpen}>
        <div className="about-editor-contextbar">
          <span><strong>{selected?.label || 'Sequence'}</strong> {selected ? `${selected.type} · ${formatWU(Math.max(0, selectedExtent - 1))} scroll · ${formatWU(selectedExtent)} total${resolvedExtent > selectedExtent + 0.001 ? ` · ${formatWU(resolvedExtent)} resolved` : ''}` : ''}</span>
          {selectedCueCount > 1 ? <span className="about-editor-selection-count">{selectedCueCount} titles selected</span> : null}
          <span>{snapshot.autoKey ? 'Auto-key armed' : 'Auto-key off'}</span>
          <button type="button" className={snapshot.autoKey ? 'is-active' : ''} onClick={() => store.setAutoKey(!snapshot.autoKey)}>◆ Auto-key</button>
          <button type="button" className={loopActive ? 'is-active' : ''} disabled={!selected} onClick={toggleLoop}>{loopActive ? 'Stop audition' : 'Loop Section'}</button>
          <button type="button" onClick={fitSequence}>Fit sequence</button>
          <button type="button" disabled={!compiledSelected} onClick={fitSection}>Fit Section</button>
          {['camera', 'world', 'text'].map((track) => <button type="button" key={track} className={snapshot.transport.soloTrack === track ? 'is-active' : ''} onClick={() => toggleSolo(track)}>Solo {track}</button>)}
          {timelineDeletion ? <button type="button" className="about-editor-delete-key" disabled={timelineDeletion.disabled} title={timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`} onClick={() => deleteTimelineSelection(store, snapshot)}><Trash2 aria-hidden="true" />{timelineDeletion.label}</button> : null}
          {runtimeMetrics ? <span className="about-editor-hud">{runtimeMetrics.frameTimeMs.toFixed(2)}ms · {runtimeMetrics.drawCalls} draw · {runtimeMetrics.pointCount.toLocaleString()} pts · {runtimeMetrics.activeModifiers} modifiers · {runtimeMetrics.bufferRebuilds} rebuilds</span> : null}
          {checkpoints.length ? <select aria-label="Restore checkpoint" defaultValue="" onChange={(event) => { const found = checkpoints.find((item) => item.id === event.target.value); if (found) { store.replaceDocument(`Restore ${found.name}`, found.document); store.setTransport({ owner: 'timeline', storyWU: found.storyWU, playing: false }); } event.target.value = ''; }}><option value="">Checkpoints ({checkpoints.length})</option>{checkpoints.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : null}
        </div>
        <Timeline
          store={store}
          snapshot={snapshot}
          onOpenGlobal={(selection) => {
            store.setSelection(selection);
            setMobilePane('inspect');
          }}
        />
      </div>
      <nav className="about-editor-mobile-tabs" aria-label="Editor panel"><button type="button" className={mobilePane === 'sequence' ? 'is-active' : ''} onClick={() => setMobilePane('sequence')}>Sequence</button><button type="button" className={mobilePane === 'inspect' ? 'is-active' : ''} onClick={() => setMobilePane('inspect')}>Inspect</button><button type="button" className={mobilePane === 'preview' ? 'is-active' : ''} onClick={() => setMobilePane('preview')}>Preview</button></nav>
    </div>
  ), document.body);
}
