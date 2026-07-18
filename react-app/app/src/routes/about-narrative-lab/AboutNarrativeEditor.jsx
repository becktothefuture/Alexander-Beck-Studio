import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  ABOUT_NARRATIVE_CAMERA_EASINGS,
  ABOUT_NARRATIVE_BLOCK_KINDS,
  ABOUT_NARRATIVE_CORRESPONDENCE_MODES,
  ABOUT_NARRATIVE_EASINGS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TRANSITION_TYPES,
} from './aboutNarrativeDefinitions.js';
import {
  deriveAboutNarrativeTrackLoopRange,
  getAboutNarrativeTrackObject,
  getAboutNarrativeTrackObjectRange,
} from './aboutNarrativeTrackEditing.js';
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
  { id: 'world', label: 'World', type: 'world', colour: 'world' },
  { id: 'text', label: 'Text', type: 'text-field', colour: 'text' },
  { id: 'interaction', label: 'Interaction', type: 'interaction', colour: 'interaction' },
]);
const TRACK_BY_ID = Object.freeze(Object.fromEntries(TRACKS.map((track) => [track.id, track])));
const MIN_TIMELINE_WIDTH = 920;
const BASE_PIXELS_PER_WU = 66;
const TEXT_CONNECTION_EPSILON_WU = 0.0001;
const PREVIEW_ASPECT_RATIOS = Object.freeze({
  tablet: Object.freeze({ portrait: 820 / 1180, landscape: 1180 / 820 }),
  mobile: Object.freeze({ portrait: 390 / 844, landscape: 844 / 390 }),
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(4));
}

function getTrackItems(document, trackId) {
  if (trackId === 'camera') return document.tracks.camera.keys;
  if (trackId === 'world') return document.tracks.worlds.objects;
  if (trackId === 'text') return document.tracks.text.fields;
  return document.tracks.interactions.clips;
}

function getObjectLabel(object, type) {
  if (type === 'camera-key') return object.id.replace(/^camera-/, '') || 'Camera key';
  if (type === 'world') return object.label || object.shapeId || object.id;
  if (type === 'interaction') return object.type || object.id;
  if (object.kind === 'stub') return object.label || 'Untitled stub';
  if (object.kind === 'scroll-block') {
    if (object.block?.kind === 'clients') return 'Selected clients';
    return object.block?.text || object.block?.label || 'Scroll block';
  }
  if (object.kind === 'discipline-reveal') return 'Discipline reveal';
  return object.text || object.id;
}

function getObjectStart(object, type) {
  return Number(type === 'camera-key' ? object.atWU : object.startWU);
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
  const range = getAboutNarrativeTrackObjectRange(document, { type: track.type, id: object.id });
  const startWU = range?.startWU ?? getObjectStart(object, track.type);
  const endWU = range?.endWU ?? startWU;
  const locked = object.locked === true || object.protected === true;
  const pointLike = track.type === 'camera-key';
  const left = startWU * pixelsPerWU;
  const width = pointLike ? 18 : Math.max(18, (endWU - startWU) * pixelsPerWU);

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

  return (
    <button
      type="button"
      className={`about-track-editor-clip is-${track.colour}${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${object.kind === 'stub' ? ' is-draft' : ''}${connectedBefore ? ' is-connected-before' : ''}${connectedAfter ? ' is-connected-after' : ''}`}
      style={{ left, width }}
      data-track-object-type={track.type}
      data-track-object-id={object.id}
      data-text-kind={track.type === 'text-field' ? object.kind : undefined}
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
      {!pointLike ? <span className="about-track-editor-clip__label">{getObjectLabel(object, track.type)}</span> : null}
      {object.kind === 'stub' ? <span className="about-track-editor-clip__badge">Draft · Not published</span> : null}
      {pointLike ? <span className="about-track-editor-clip__point" aria-hidden="true" /> : null}
    </button>
  );
}

function Timeline({ snapshot, store, zoom, setZoom, textMenu, setTextMenu, onOpenTextEditor }) {
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

  const createAtPlayhead = (trackId, kind = null) => {
    store.createObject({
      track: trackId,
      kind,
      atWU: snapshot.transport.storyWU,
      ...(trackId === 'interaction' ? { interactionType: 'horizontal-spin' } : {}),
    });
    setTextMenu(false);
  };

  return (
    <section className="about-track-editor-timeline" aria-label="About narrative global timeline">
      <header className="about-track-editor-timeline__toolbar">
        <div>
          <strong>Global Story WU</strong>
          <span>No containers · World Starts are anchors</span>
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
            <div className={`about-track-editor-row-head is-${track.colour}`} key={track.id}>
              <button type="button" onClick={() => store.setSelection({ type: 'track', id: track.id })}>
                {track.label}
              </button>
              <button
                type="button"
                className="about-track-editor-add"
                aria-label={`Add ${track.label} object at playhead`}
                aria-expanded={track.id === 'text' ? textMenu : undefined}
                onClick={() => {
                  if (track.id === 'text') setTextMenu((open) => !open);
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
  if (!object) {
    return (
      <div className="about-track-editor-inspector__empty">
        <span>{track?.label || 'Timeline'}</span>
        <h2>{track ? `${track.label} track` : 'Select an object'}</h2>
        <p>Objects are authored independently in absolute Story WU. World Starts provide visual anchors only.</p>
      </div>
    );
  }

  const locked = object.locked === true || object.protected === true;
  const commit = (label, mutate) => store.commit(label, (draft) => {
    const target = getAboutNarrativeTrackObject(draft, selection);
    if (target) mutate(target, draft);
  }, { selectionAfter: selection, requireValid: true });
  const number = (path, value) => NumberField({
    label: path,
    value,
    disabled: locked,
    onCommit: (next) => commit(`Edit ${path}`, (target) => { target[path] = cleanWU(next); }),
  });

  return (
    <div className="about-track-editor-inspector__content">
      <header>
        <span>{selection.type}</span>
        <h2>{getObjectLabel(object, selection.type)}</h2>
        <code>{object.id}</code>
        {locked ? <b>Protected</b> : null}
      </header>

      {selection.type === 'camera-key' ? (
        <div className="about-track-editor-fields">
          {number('atWU', object.atWU)}
          <NumberField label="FOV" value={object.fov} disabled={locked} min={25} max={80} step={1} onCommit={(value) => commit('Edit Camera FOV', (target) => { target.fov = value; })} />
          <NumberField label="Roll" value={object.roll} disabled={locked} step={0.01} onCommit={(value) => commit('Edit Camera roll', (target) => { target.roll = value; })} />
          <SelectField
            label="Easing"
            value={object.easing}
            disabled={locked}
            options={ABOUT_NARRATIVE_CAMERA_EASINGS.map((value) => ({ value, label: value }))}
            onCommit={(value) => commit('Edit Camera easing', (target) => { target.easing = value; })}
          />
          {[0, 1, 2].map((axis) => (
            <NumberField key={`offset-${axis}`} label={`Offset ${'XYZ'[axis]}`} value={object.offset[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit Camera offset', (target) => { target.offset[axis] = value; })} />
          ))}
          {[0, 1, 2].map((axis) => (
            <NumberField key={`look-${axis}`} label={`Look ${'XYZ'[axis]}`} value={object.lookAtOffset[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit Camera aim', (target) => { target.lookAtOffset[axis] = value; })} />
          ))}
        </div>
      ) : null}

      {selection.type === 'world' ? (
        <div className="about-track-editor-fields">
          <TextField label="Label" value={object.label} disabled={locked} onCommit={(value) => commit('Rename World', (target) => { target.label = value; })} />
          {number('startWU', object.startWU)}
          {number('anchorWU', object.anchorWU)}
          <SelectField
            label="Shape"
            value={object.shapeId}
            disabled={locked}
            options={Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).map((shape) => ({ value: shape.id, label: shape.label }))}
            onCommit={(value) => commit('Change World Shape', (target) => {
              const definition = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[value];
              target.shapeId = value;
              target.adapterId = definition.adapterId;
              target.shapeParameters = Object.fromEntries(definition.parameters.map((control) => [
                control.id,
                Number.isFinite(Number(target.shapeParameters?.[control.id]))
                  ? Number(target.shapeParameters[control.id])
                  : Number(control.min),
              ]));
            })}
          />
          <NumberField label="Seed" value={object.seed} disabled={locked} step={1} min={0} onCommit={(value) => commit('Edit World seed', (target) => { target.seed = Math.round(value); })} />
          <NumberField label="Entry distance WU" value={object.entryDistanceWU} disabled={locked} onCommit={(value) => commit('Edit World entry distance', (target) => { target.entryDistanceWU = value; })} />
          {[0, 1, 2].map((axis) => (
            <NumberField key={`position-${axis}`} label={`Position ${'XYZ'[axis]}`} value={object.transform.position[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World position', (target) => { target.transform.position[axis] = value; })} />
          ))}
          {[0, 1, 2].map((axis) => (
            <NumberField key={`rotation-${axis}`} label={`Rotation ${'XYZ'[axis]}`} value={object.transform.rotation[axis]} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World rotation', (target) => { target.transform.rotation[axis] = value; })} />
          ))}
          <NumberField label="Scale" value={object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World scale', (target) => { target.transform.scale = value; })} />
          <NumberField label="Mobile scale" value={object.transform.mobileScale ?? object.transform.scale} disabled={locked} step={0.01} min={0.01} onCommit={(value) => commit('Edit World mobile scale', (target) => { target.transform.mobileScale = value; })} />
          <NumberField label="Mobile Y offset" value={object.transform.mobileYOffset ?? 0} disabled={locked} step={0.01} onCommit={(value) => commit('Edit World mobile offset', (target) => { target.transform.mobileYOffset = value; })} />
          <NumberField label="Transition start WU" value={object.transitionIn.startWU} disabled={locked} onCommit={(value) => commit('Edit World transition', (target) => { target.transitionIn.startWU = value; })} />
          <NumberField label="Transition end WU" value={object.transitionIn.endWU} disabled={locked} onCommit={(value) => commit('Edit World transition', (target) => { target.transitionIn.endWU = value; })} />
          <SelectField label="Transition type" value={object.transitionIn.type} disabled={locked} options={ABOUT_NARRATIVE_TRANSITION_TYPES.map((value) => ({ value, label: value }))} onCommit={(value) => commit('Edit World transition type', (target) => { target.transitionIn.type = value; })} />
          <SelectField label="Transition easing" value={object.transitionIn.easing} disabled={locked} options={ABOUT_NARRATIVE_EASINGS.map((value) => ({ value, label: value }))} onCommit={(value) => commit('Edit World transition easing', (target) => { target.transitionIn.easing = value; })} />
          <SelectField label="Correspondence" value={object.transitionIn.correspondence} disabled={locked} options={ABOUT_NARRATIVE_CORRESPONDENCE_MODES.map((value) => ({ value, label: value }))} onCommit={(value) => commit('Edit World correspondence', (target) => { target.transitionIn.correspondence = value; })} />
          <JsonField label="Shape parameters" value={object.shapeParameters} disabled={locked} onCommit={(value) => commit('Edit Shape parameters', (target) => { target.shapeParameters = value; })} onError={onMessage} />
          <JsonField label="Modifier stack" value={object.modifiers} disabled={locked} onCommit={(value) => commit('Edit World modifiers', (target) => { target.modifiers = value; })} onError={onMessage} />
        </div>
      ) : null}

      {selection.type === 'text-field' ? (
        <div className="about-track-editor-fields">
          <div className="about-track-editor-kind-row">
            <span>{object.kind}</span>
            {object.kind === 'stub' ? <b>Draft · Not published</b> : null}
          </div>
          {number('startWU', object.startWU)}
          {number('focusWU', object.focusWU)}
          {number('endWU', object.endWU)}
          {object.kind === 'title' ? (
            <>
              <TextField label="Title" value={object.text} disabled={locked} multiline focusId="text-copy" onCommit={(value) => commit('Edit Title', (target) => { target.text = value; })} />
              <SelectField label="Movement" value={object.movement} disabled={locked} options={[{ value: 'spatial', label: 'Spatial' }, { value: 'vertical', label: 'Vertical' }]} onCommit={(value) => commit('Edit Title movement', (target) => { target.movement = value; })} />
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
          {number('startWU', object.startWU)}
          {number('activationWU', object.activationWU)}
          {number('endWU', object.endWU)}
          <TextField label="Interaction type" value={object.type} disabled={locked} onCommit={(value) => commit('Edit Interaction type', (target) => { target.type = value; })} />
          <SelectField
            label="Target World"
            value={object.targetWorldId}
            disabled={locked}
            options={snapshot.document.tracks.worlds.objects.map((world) => ({ value: world.id, label: world.label || world.id }))}
            onCommit={(value) => commit('Retarget Interaction', (target) => { target.targetWorldId = value; })}
          />
        </div>
      ) : null}
    </div>
  );
}

const PUBLIC_PREVIEW_BASELINE_HASH = 'public-editor-preview-v3';

export default function AboutNarrativeEditor({ store, rootRef, previewOnly = false }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [zoom, setZoom] = useState(1);
  const [textMenu, setTextMenu] = useState(false);
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
    setMessage('Validating and saving v3…');
    try {
      const persisted = await saveAboutNarrativeSource(store.getSnapshot().document, baselineHash);
      store.replaceDocument('Accept saved canonical source', persisted.document, { requireValid: true });
      store.markBaseline(persisted.document);
      setBaselineHash(persisted.hash);
      clearAboutNarrativeRecoveryDraft();
      setRecovery(null);
      setMessage('Saved canonical v3.');
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
      if (!current.dirty) store.replaceDocument('Load canonical v3', source.document, { requireValid: true });
      store.markBaseline(source.document);
      setBaselineHash(source.hash);
      setRecovery(readAboutNarrativeRecoveryDraft({ baselineHash: source.hash }));
      setMessage(source.migrations?.length ? 'Loaded and migrated canonical source to v3.' : 'Canonical v3 ready.');
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
      data-editor-version="sectionless-v3"
      data-mobile-inspector-open={mobileInspectorOpen ? 'true' : 'false'}
      aria-label="About narrative editor"
    >
      <header className="about-track-editor-topbar">
        <div className="about-track-editor-brand">
          <strong>About Timeline</strong>
          <span>v3 · sectionless</span>
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
              : saving ? 'Saving…' : snapshot.dirty ? 'Save v3' : 'Saved'}
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
          <button type="button" className="is-danger" disabled={snapshot.selection.type === 'track'} onClick={() => store.deleteSelection()}>Delete</button>
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
