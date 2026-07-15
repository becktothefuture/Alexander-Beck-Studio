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
import { getAboutNarrativeWorldTransitionLimit } from './aboutNarrativeCompiler.js';
import './about-narrative-editor.css';

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const ABOUT_EDITOR_TIMELINE_STORAGE_KEY = 'abs:about-narrative:timeline-open:v1';
const TIMELINE_KEY_EPSILON = 0.004;
const INSPECTOR_EDGE_GAP = 8;

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
    section.camera.keys.forEach((key, keyIndex) => events.push({
      storyWU: toStoryWU(key.at),
      priority: 0,
      selection: { type: 'camera-key', sectionId: section.id, keyIndex },
    }));
    if (section.world.mode === 'set' && section.world.transitionIn.type !== 'cut') {
      ['start', 'end'].forEach((part, partIndex) => events.push({
        storyWU: toStoryWU(section.world.transitionIn[part]),
        priority: 10 + partIndex,
        selection: { type: 'world', sectionId: section.id, keyPart: `transition-${part}` },
      }));
    }
    (section.text.cues || []).forEach((cue, cueIndex) => {
      ['enter', 'hold', 'exit'].forEach((part, partIndex) => events.push({
        storyWU: toStoryWU(cue[part]),
        priority: 20 + (cueIndex * 3) + partIndex,
        selection: { type: 'cue', sectionId: section.id, cueId: cue.id, keyPart: part },
      }));
    });
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
  ]));
  let id = makeSlug(base);
  let suffix = 2;
  while (used.has(id)) {
    id = `${makeSlug(base)}-${suffix}`;
    suffix += 1;
  }
  return id;
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

function Timeline({ store, snapshot }) {
  const { document, compiledPlan, selection, transport } = snapshot;
  const maxWU = Math.max(0.001, compiledPlan?.maxStoryWU || document.sections.reduce((sum, section) => sum + section.extentWU, 0));
  const playhead = `${(transport.storyWU / maxWU) * 100}%`;

  return (
    <div className="about-editor-timeline">
      <div className="about-editor-lane-labels" aria-hidden="true">
        <span>Sections</span><span>Camera</span><span>World</span><span>Text</span><span>Interaction</span>
      </div>
      <div className="about-editor-lanes" data-solo-track={transport.soloTrack || ''} style={{ '--about-editor-playhead': playhead }}>
        <div className="about-editor-playhead" />
        {['section', 'camera', 'world', 'text', 'interaction'].map((lane) => (
          <div className={`about-editor-lane about-editor-lane--${lane}`} key={lane}>
            {document.sections.map((section, sectionIndex) => {
              const compiled = compiledPlan?.sections?.[sectionIndex];
              const startWU = Math.min(maxWU, compiled?.startWU || 0);
              const nextStartWU = Math.min(maxWU, compiledPlan?.sections?.[sectionIndex + 1]?.startWU ?? maxWU);
              const spanWU = Math.max(0.001, nextStartWU - startWU);
              const width = `${(spanWU / maxWU) * 100}%`;
              const inSelectedSection = selection.sectionId === section.id;
              const localPosition = (at) => `${Math.min(100, (Number(at || 0) * (compiled?.travelWU || spanWU) / spanWU) * 100)}%`;
              const extendedLocalPosition = (at) => `${(Number(at || 0) * (compiled?.travelWU || spanWU) / spanWU) * 100}%`;
              const localWidth = (from, to) => `${Math.max(0.35, ((Number(to) - Number(from)) * (compiled?.travelWU || spanWU) / spanWU) * 100)}%`;
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
                return (
                  <button
                    type="button"
                    key={section.id}
                    className={`${isSelected ? 'is-selected' : ''}${inSelectedSection ? ' is-context' : ''}`}
                    style={{ width }}
                    aria-pressed={isSelected}
                    onClick={() => selectAt({ type: 'section' })}
                    title={`${section.label} · ${formatWU(compiled?.resolvedExtentWU || section.extentWU)}`}
                  ><span>{String(sectionIndex + 1).padStart(2, '0')}</span>{section.label}</button>
                );
              }
              if (lane === 'camera') {
                return (
                  <div className="about-editor-clip" key={section.id} style={{ width }}>
                    {section.camera.keys.map((key, keyIndex) => (
                      <button
                        type="button"
                        key={`${key.at}-${keyIndex}`}
                        className={`about-editor-key${inSelectedSection && selection.type === 'camera-key' && selection.keyIndex === keyIndex ? ' is-selected' : ''}`}
                        style={{ left: localPosition(key.at) }}
                        title={`Camera key at ${Math.round(key.at * 100)}%`}
                        aria-label={`Camera key at ${Math.round(key.at * 100)}% through ${section.label}`}
                        aria-pressed={inSelectedSection && selection.type === 'camera-key' && selection.keyIndex === keyIndex}
                        onClick={() => selectAt({ type: 'camera-key', keyIndex }, key.at)}
                      />
                    ))}
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
                  <div className="about-editor-clip" key={section.id} style={{ width }}>
                    {(section.text.cues || []).flatMap((cue) => {
                      const isSelected = inSelectedSection && selection.type === 'cue' && selection.cueId === cue.id;
                      return [
                        <button
                          type="button"
                          className={`about-editor-cue${isSelected ? ' is-selected' : ''}`}
                          key={cue.id}
                          style={{ left: localPosition(cue.enter), width: localWidth(cue.enter, cue.exit) }}
                          onClick={() => selectAt({ type: 'cue', cueId: cue.id }, cue.hold)}
                          aria-pressed={isSelected}
                          title={cue.text}
                        />,
                        ...['enter', 'hold', 'exit'].map((part) => (
                          <button
                            type="button"
                            className={`about-editor-timing-key is-text is-${part}${isSelected && selection.keyPart === part ? ' is-selected' : ''}`}
                            key={`${cue.id}-${part}`}
                            style={{ left: localPosition(cue[part]) }}
                            title={`${part} · ${cue.text}`}
                            aria-label={`${cue.id} ${part} keyframe`}
                            onClick={() => selectAt({ type: 'cue', cueId: cue.id, keyPart: part }, cue[part])}
                          />
                        )),
                      ];
                    })}
                    {(section.text.blocks || []).length ? (
                      <button type="button" className={`about-editor-editorial-clip${inSelectedSection && selection.type === 'section' ? ' is-selected' : ''}`} onClick={() => selectAt({ type: 'section' })}>
                        {section.text.blocks.length} blocks
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
  );
}

function SequenceInspector({ store, snapshot }) {
  const commitGlobal = (group, key, value) => store.commit(`Change ${key}`, (draft) => {
    if (group === 'sequence') draft.globals[key] = value;
    if (group === 'camera') draft.globals.camera[key] = value;
    if (group === 'material') draft.globals.pointMaterial[key] = value;
  }, { coalesceKey: `global:${group}:${key}` });
  return (
    <>
      <header><span>Sequence</span><strong>Global controls</strong></header>
      {ABOUT_NARRATIVE_GLOBAL_CONTROLS.map((group) => (
        <details open key={group.id}>
          <summary>{group.label}</summary>
          {group.controls.map((control) => {
            const target = group.id === 'sequence'
              ? snapshot.document.globals
              : group.id === 'camera' ? snapshot.document.globals.camera : snapshot.document.globals.pointMaterial;
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
        </details>
      ))}
    </>
  );
}

function SectionInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const update = (label, mutate, coalesceKey = null) => store.commit(label, (draft) => {
    mutate(draft.sections[sectionIndex]);
  }, { coalesceKey, selection: snapshot.selection });
  const move = (direction) => store.commit('Reorder Section', (draft) => {
    const toIndex = sectionIndex + direction;
    if (toIndex < 0 || toIndex >= draft.sections.length) return;
    const [moved] = draft.sections.splice(sectionIndex, 1);
    draft.sections.splice(toIndex, 0, moved);
  }, { selection: { type: 'section', sectionId: section.id } });

  return (
    <>
      <header><span>Section {String(sectionIndex + 1).padStart(2, '0')}</span><strong>{section.label}</strong></header>
      {section.locked ? <div className="about-editor-lock"><LockKeyhole aria-hidden="true" /><span>This protected Section cannot be reordered or have its World replaced accidentally.</span><button type="button" onClick={() => update('Unlock protected Section', (draft) => { draft.locked = false; })}>Unlock advanced</button></div> : null}
      <div className="about-editor-inline-actions">
        <button type="button" disabled={section.locked || sectionIndex === 0} onClick={() => move(-1)}>Move earlier</button>
        <button type="button" disabled={section.locked || sectionIndex === snapshot.document.sections.length - 1} onClick={() => move(1)}>Move later</button>
      </div>
      <Property label="Section name"><input value={section.label} onChange={(event) => update('Rename Section', (draft) => { draft.label = event.target.value; }, `section:${section.id}:label`)} /></Property>
      <Property label="Stable ID"><input value={section.id} readOnly /><small>References this Section without tying it to its current meaning.</small></Property>
      <Property label="Type">
        <select value={section.type} disabled={section.type === 'finale'} onChange={(event) => update('Change Section type', (draft) => { draft.type = event.target.value; })}>
          <option value="spatial">Spatial</option><option value="editorial">Editorial</option><option value="finale">Finale</option>
        </select>
      </Property>
      <NumberProperty label="Authored extent" value={section.extentWU} min={1} max={8} step={0.05} unit="WU" onChange={(value) => update('Change Section extent', (draft) => { draft.extentWU = value; }, `section:${section.id}:extent`)} />
      <NumberProperty label="Mobile extent" value={section.mobileExtentWU} min={1} max={8} step={0.05} unit="WU" onChange={(value) => update('Change mobile extent', (draft) => { draft.mobileExtentWU = value; }, `section:${section.id}:mobile`)} />
      {section.type === 'editorial' ? <EditorialBlocks store={store} snapshot={snapshot} section={section} /> : null}
      {section.type !== 'editorial' ? (
        <button
          type="button"
          className="about-editor-wide-action"
          onClick={() => {
            const local = getLocalProgress(snapshot.compiledPlan, section, snapshot.transport.storyWU);
            const id = nextId(snapshot.document, `${section.id}-statement`);
            update('Add text Cue', (draft) => {
              draft.text.cues ||= [];
              draft.text.cues.push({ id, text: 'New travelling statement', enter: Math.max(0, local - 0.12), hold: local, exit: Math.min(1, local + 0.18), preset: 'travelling-title-v1' });
              draft.text.cues.sort((a, b) => a.enter - b.enter);
            });
            store.setSelection({ type: 'cue', sectionId: section.id, cueId: id });
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
  return (
    <details open>
      <summary>Editorial content</summary>
      {(section.text.blocks || []).map((block, blockIndex) => (
        <div className="about-editor-block" key={block.id}>
          <div><code>{block.kind}</code><span>{block.id}</span></div>
          {block.label != null ? <Property label="Label"><input value={block.label} onChange={(event) => updateBlock(blockIndex, 'label', event.target.value)} /></Property> : null}
          {block.text != null ? <Property label="Copy"><textarea rows="5" value={block.text} onChange={(event) => updateBlock(blockIndex, 'text', event.target.value)} /></Property> : null}
          {block.items ? <Property label="Items"><textarea rows="6" value={block.items.join('\n')} onChange={(event) => updateBlock(blockIndex, 'items', event.target.value.split('\n').filter(Boolean))} /></Property> : null}
        </div>
      ))}
      <button type="button" className="about-editor-wide-action" onClick={() => store.commit('Add editorial block', (draft) => {
        draft.sections[sectionIndex].text.blocks.push({ id: nextId(draft, `${section.id}-prose`), kind: 'prose', text: 'New editorial paragraph.' });
      })}>Add prose block</button>
    </details>
  );
}

function CueInspector({ store, snapshot, section }) {
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
  return (
    <>
      <header><span>Text Cue</span><strong>{cue.id}</strong></header>
      <Property label="Statement"><textarea rows="7" value={cue.text} onChange={(event) => update('text', event.target.value)} /></Property>
      <NumberProperty label="Enter" value={cue.enter} min={0} max={1} step={0.005} onChange={(value) => update('enter', Math.min(value, cue.hold))} />
      <NumberProperty label="Hold until" value={cue.hold} min={0} max={1} step={0.005} onChange={(value) => update('hold', Math.max(cue.enter, Math.min(value, cue.exit)))} />
      <NumberProperty label="Exit" value={cue.exit} min={0} max={1} step={0.005} onChange={(value) => update('exit', Math.max(cue.hold, value))} />
      <Property label="Motion preset"><select value={cue.preset} onChange={(event) => update('preset', event.target.value)}><option value="travelling-title-v1">Travelling title</option><option value="opener-v1">Opener</option><option value="finale-v1">Finale hold</option></select></Property>
      <button type="button" className="about-editor-danger" disabled={section.type === 'finale'} onClick={remove}>Delete Cue</button>
    </>
  );
}

function CameraInspector({ store, snapshot, section }) {
  const sectionIndex = getSectionIndex(snapshot.document, section.id);
  const keyIndex = snapshot.selection.keyIndex;
  const key = section.camera.keys[keyIndex];
  const local = getLocalProgress(snapshot.compiledPlan, section, snapshot.transport.storyWU);
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
        { at: 0, offset: [0, -0.45, 0.5], lookAtOffset: [0, 0.3, -1], fov: 56, roll: 0, easing: 'ease-out' },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 46, roll: 0, easing: 'smoothstep' },
      ],
      Resolve: [
        { at: 0, offset: [0.3, 0.2, 0], lookAtOffset: [-0.3, -0.2, -1], fov: 52, roll: 0.14, easing: 'smoothstep' },
        { at: 1, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: 48, roll: 0, easing: 'smoothstep' },
      ],
    };
    draft.sections[sectionIndex].camera.keys = recipes[preset];
  }, { selection: { type: 'section', sectionId: section.id } });
  const setKey = () => store.commit('Set camera key', (draft) => {
    const existingIndex = draft.sections[sectionIndex].camera.keys.findIndex((item) => Math.abs(item.at - local) < 0.0025);
    if (existingIndex >= 0) return;
    draft.sections[sectionIndex].camera.keys.push({ at: local, offset: [0, 0, 0], lookAtOffset: [0, 0, -1], fov: draft.globals.camera.fov, roll: 0, easing: 'smoothstep' });
    draft.sections[sectionIndex].camera.keys.sort((a, b) => a.at - b.at);
  }, { selection: { type: 'section', sectionId: section.id } });
  const recipes = <div className="about-editor-camera-recipes">{['Push', 'Glide', 'Orbit', 'Reveal', 'Resolve'].map((name) => <button type="button" key={name} onClick={() => applyPreset(name)}>{name}</button>)}</div>;
  if (!key) {
    return <><header><span>Camera track</span><strong>Editing Section base</strong></header><p className="about-editor-help">The protected dolly keeps moving forward. Add a key to layer framing, aim, roll, or lens changes on top.</p>{recipes}<button type="button" className="about-editor-wide-action" onClick={setKey}>Set camera key at {Math.round(local * 100)}%</button></>;
  }
  const update = (field, value) => store.commit(`Edit camera ${field}`, (draft) => {
    draft.sections[sectionIndex].camera.keys[keyIndex][field] = value;
  }, { coalesceKey: `camera:${section.id}:${keyIndex}:${field}`, selection: snapshot.selection });
  const updateVector = (field, axis, value) => {
    const next = [...key[field]];
    next[axis] = value;
    update(field, next);
  };
  const isBoundaryKey = key.at === 0 || key.at === 1;
  return (
    <>
      <header><span>Camera key</span><strong>{Math.round(key.at * 100)}% through {section.label}</strong></header>
      {recipes}
      <NumberProperty label="Position" value={key.at} min={0} max={1} step={0.005} disabled={isBoundaryKey} onChange={(value) => update('at', value)} />
      {['X offset', 'Y offset', 'Forward offset'].map((label, axis) => <NumberProperty key={label} label={label} value={key.offset[axis]} min={-8} max={8} step={0.02} unit="WU" onChange={(value) => updateVector('offset', axis, value)} />)}
      {['Aim X', 'Aim Y', 'Aim depth'].map((label, axis) => <NumberProperty key={label} label={label} value={key.lookAtOffset[axis]} min={-8} max={8} step={0.02} unit="WU" onChange={(value) => updateVector('lookAtOffset', axis, value)} />)}
      <NumberProperty label="Field of view" value={key.fov} min={20} max={90} step={1} unit="°" onChange={(value) => update('fov', value)} />
      <NumberProperty label="Roll" value={key.roll} min={-1.2} max={1.2} step={0.01} unit="rad" onChange={(value) => update('roll', value)} />
      <Property label="Easing"><select value={key.easing} onChange={(event) => update('easing', event.target.value)}><option>smoothstep</option><option>linear</option><option>ease-in</option><option>ease-out</option><option>ease-in-out</option><option>hold</option></select></Property>
      <button type="button" className="about-editor-danger" disabled={isBoundaryKey} title={isBoundaryKey ? 'Every Section keeps start and end camera keys.' : ''} onClick={() => store.commit('Delete camera key', (draft) => { draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1); }, { selection: { type: 'section', sectionId: section.id } })}>{isBoundaryKey ? 'Required boundary key' : 'Delete key'}</button>
    </>
  );
}

function WorldInspector({ store, snapshot, section }) {
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

function Inspector({ store, snapshot, timelineOpen }) {
  const inspectorRef = useRef(null);
  const dragRef = useRef(null);
  const lastHeaderClickRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const section = getSection(snapshot.document, snapshot.selection);
  let content = <SectionInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'sequence') content = <SequenceInspector store={store} snapshot={snapshot} />;
  if (snapshot.selection.type === 'cue') content = <CueInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'camera-key') content = <CameraInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'world') content = <WorldInspector store={store} snapshot={snapshot} section={section} />;
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
    ><div className="about-editor-inspector-scroll">{content}<Diagnostics diagnostics={snapshot.diagnostics} /></div></aside>
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
    if (activeSelection.type === 'cue' && activeSelection.cueId) {
      root.querySelector(`[data-text-cue="${CSS.escape(activeSelection.cueId)}"]`)?.classList.add('is-editor-selected');
    }
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
        if (current.tryState) store.cancelTry();
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
  const selected = getSection(snapshot.document, snapshot.selection);
  const compiledSelected = snapshot.compiledPlan?.sections.find((section) => section.id === selected?.id);
  const resolvedExtent = compiledSelected?.resolvedExtentWU || selected?.extentWU || 0;
  const loopActive = Boolean(snapshot.transport.loop?.sectionId === selected?.id);
  const timelineDeletion = getTimelineDeletion(snapshot);
  const toggleLoop = () => store.setTransport({
    loop: loopActive || !compiledSelected ? null : {
      sectionId: selected.id,
      startWU: compiledSelected.startWU,
      endWU: compiledSelected.startWU + compiledSelected.travelWU,
    },
  });
  const toggleSolo = (track) => store.setTransport({
    soloTrack: snapshot.transport.soloTrack === track ? null : track,
  });
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

      <Inspector store={store} snapshot={snapshot} timelineOpen={timelineOpen} />
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
          <span><strong>{selected?.label || 'Sequence'}</strong> {selected ? `${selected.type} · authored ${formatWU(selected.extentWU)} · resolved ${formatWU(resolvedExtent)}` : ''}</span>
          <span>{snapshot.autoKey ? 'Auto-key armed' : 'Auto-key off'}</span>
          <button type="button" className={snapshot.autoKey ? 'is-active' : ''} onClick={() => store.setAutoKey(!snapshot.autoKey)}>◆ Auto-key</button>
          <button type="button" className={loopActive ? 'is-active' : ''} onClick={toggleLoop}>Loop Section</button>
          {['camera', 'world', 'text'].map((track) => <button type="button" key={track} className={snapshot.transport.soloTrack === track ? 'is-active' : ''} onClick={() => toggleSolo(track)}>Solo {track}</button>)}
          {timelineDeletion ? <button type="button" className="about-editor-delete-key" disabled={timelineDeletion.disabled} title={timelineDeletion.message || `${timelineDeletion.label} · Delete/Backspace`} onClick={() => deleteTimelineSelection(store, snapshot)}><Trash2 aria-hidden="true" />{timelineDeletion.label}</button> : null}
          {runtimeMetrics ? <span className="about-editor-hud">{runtimeMetrics.frameTimeMs.toFixed(2)}ms · {runtimeMetrics.drawCalls} draw · {runtimeMetrics.pointCount.toLocaleString()} pts · {runtimeMetrics.activeModifiers} modifiers · {runtimeMetrics.bufferRebuilds} rebuilds</span> : null}
          {checkpoints.length ? <select aria-label="Restore checkpoint" defaultValue="" onChange={(event) => { const found = checkpoints.find((item) => item.id === event.target.value); if (found) { store.replaceDocument(`Restore ${found.name}`, found.document); store.setTransport({ owner: 'timeline', storyWU: found.storyWU, playing: false }); } event.target.value = ''; }}><option value="">Checkpoints ({checkpoints.length})</option>{checkpoints.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : null}
        </div>
        <Timeline store={store} snapshot={snapshot} />
      </div>
      <nav className="about-editor-mobile-tabs" aria-label="Editor panel"><button type="button" className={mobilePane === 'sequence' ? 'is-active' : ''} onClick={() => setMobilePane('sequence')}>Sequence</button><button type="button" className={mobilePane === 'inspect' ? 'is-active' : ''} onClick={() => setMobilePane('inspect')}>Inspect</button><button type="button" className={mobilePane === 'preview' ? 'is-active' : ''} onClick={() => setMobilePane('preview')}>Preview</button></nav>
    </div>
  ), document.body);
}
