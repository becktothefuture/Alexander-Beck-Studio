import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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
import './about-narrative-editor.css';

const clamp01 = (value) => Math.min(1, Math.max(0, value));

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

function NumberProperty({ label, value, min, max, step, onChange, unit = '' }) {
  return (
    <Property label={label}>
      <div className="about-editor-number">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
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
  const timelineKeys = compiledPlan.sections.flatMap((compiled, index) => {
    const authored = snapshot.document.sections[index];
    return [
      ...authored.camera.keys.map((key) => compiled.startWU + (key.at * compiled.travelWU)),
      ...(authored.text.cues || []).flatMap((cue) => [cue.enter, cue.hold, cue.exit].map((at) => compiled.startWU + (at * compiled.travelWU))),
    ];
  }).sort((a, b) => a - b);
  const jumpKey = (direction) => {
    const epsilon = 0.004;
    const next = direction > 0
      ? timelineKeys.find((value) => value > transport.storyWU + epsilon)
      : [...timelineKeys].reverse().find((value) => value < transport.storyWU - epsilon);
    if (Number.isFinite(next)) seek(next);
  };

  return (
    <div className="about-editor-transport">
      <button type="button" title="Previous Section" onClick={() => jumpSection(-1)}><i className="ti ti-chevron-left" /></button>
      <button type="button" title="Previous keyframe" onClick={() => jumpKey(-1)}><i className="ti ti-diamond" /></button>
      <button type="button" className="is-primary" title={transport.playing ? 'Pause' : 'Play'} onClick={play}>
        <i className={`ti ${transport.playing ? 'ti-player-pause-filled' : 'ti-player-play-filled'}`} />
      </button>
      <button type="button" title="Next Section" onClick={() => jumpSection(1)}><i className="ti ti-chevron-right" /></button>
      <button type="button" title="Next keyframe" onClick={() => jumpKey(1)}><i className="ti ti-diamond-filled" /></button>
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
  const total = compiledPlan?.totalExtentWU || document.sections.reduce((sum, section) => sum + section.extentWU, 0);
  const playhead = `${(transport.storyWU / Math.max(0.001, compiledPlan?.maxStoryWU || total)) * 100}%`;

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
              const width = `${((compiled?.resolvedExtentWU || section.extentWU) / total) * 100}%`;
              const selected = selection.sectionId === section.id;
              const select = (nextSelection) => store.setSelection({ sectionId: section.id, ...nextSelection });
              if (lane === 'section') {
                return (
                  <button
                    type="button"
                    key={section.id}
                    className={selected ? 'is-selected' : ''}
                    style={{ width }}
                    onClick={() => select({ type: 'section' })}
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
                        className="about-editor-key"
                        style={{ left: `${key.at * 100}%` }}
                        title={`Camera key at ${Math.round(key.at * 100)}%`}
                        onClick={() => select({ type: 'camera-key', keyIndex })}
                      />
                    ))}
                  </div>
                );
              }
              if (lane === 'world') {
                return (
                  <button
                    type="button"
                    className={`about-editor-clip ${section.world.mode === 'set' ? 'has-world' : ''}`}
                    key={section.id}
                    style={{ width }}
                    onClick={() => select({ type: 'world' })}
                  >{section.world.mode === 'set' ? section.world.shapeId.replace('-v1', '') : 'continue'}</button>
                );
              }
              if (lane === 'text') {
                return (
                  <div className="about-editor-clip" key={section.id} style={{ width }}>
                    {(section.text.cues || []).map((cue) => (
                      <button
                        type="button"
                        className="about-editor-cue"
                        key={cue.id}
                        style={{ left: `${cue.enter * 100}%`, width: `${Math.max(4, (cue.exit - cue.enter) * 100)}%` }}
                        onClick={() => select({ type: 'cue', cueId: cue.id })}
                        title={cue.text}
                      />
                    ))}
                    {(section.text.blocks || []).length ? (
                      <button type="button" className="about-editor-editorial-clip" onClick={() => select({ type: 'section' })}>
                        {section.text.blocks.length} blocks
                      </button>
                    ) : null}
                  </div>
                );
              }
              return (
                <button
                  type="button"
                  className={`about-editor-clip ${section.interaction?.type !== 'none' ? 'has-interaction' : ''}`}
                  key={section.id}
                  style={{ width }}
                  onClick={() => select({ type: 'interaction' })}
                >{section.interaction?.type !== 'none' ? section.interaction.type : ''}</button>
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
      {section.locked ? <div className="about-editor-lock"><i className="ti ti-lock" /><span>This protected Section cannot be reordered or have its World replaced accidentally.</span><button type="button" onClick={() => update('Unlock protected Section', (draft) => { draft.locked = false; })}>Unlock advanced</button></div> : null}
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
  return (
    <>
      <header><span>Camera key</span><strong>{Math.round(key.at * 100)}% through {section.label}</strong></header>
      {recipes}
      <NumberProperty label="Position" value={key.at} min={0} max={1} step={0.005} onChange={(value) => update('at', value)} />
      {['X offset', 'Y offset', 'Forward offset'].map((label, axis) => <NumberProperty key={label} label={label} value={key.offset[axis]} min={-8} max={8} step={0.02} unit="WU" onChange={(value) => updateVector('offset', axis, value)} />)}
      {['Aim X', 'Aim Y', 'Aim depth'].map((label, axis) => <NumberProperty key={label} label={label} value={key.lookAtOffset[axis]} min={-8} max={8} step={0.02} unit="WU" onChange={(value) => updateVector('lookAtOffset', axis, value)} />)}
      <NumberProperty label="Field of view" value={key.fov} min={20} max={90} step={1} unit="°" onChange={(value) => update('fov', value)} />
      <NumberProperty label="Roll" value={key.roll} min={-1.2} max={1.2} step={0.01} unit="rad" onChange={(value) => update('roll', value)} />
      <Property label="Easing"><select value={key.easing} onChange={(event) => update('easing', event.target.value)}><option>smoothstep</option><option>linear</option><option>ease-in</option><option>ease-out</option><option>ease-in-out</option><option>hold</option></select></Property>
      <button type="button" className="about-editor-danger" onClick={() => store.commit('Delete camera key', (draft) => { draft.sections[sectionIndex].camera.keys.splice(keyIndex, 1); }, { selection: { type: 'section', sectionId: section.id } })}>Delete key</button>
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
        <NumberProperty label="Start" value={world.transitionIn.start} min={0} max={1} step={0.005} onChange={(value) => update('Change transition start', (draft) => { draft.transitionIn.start = Math.min(value, draft.transitionIn.end); })} />
        <NumberProperty label="End" value={world.transitionIn.end} min={0} max={1} step={0.005} onChange={(value) => update('Change transition end', (draft) => { draft.transitionIn.end = Math.max(value, draft.transitionIn.start); })} />
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
  if (!diagnostics.length) return <div className="about-editor-diagnostics is-clear"><i className="ti ti-circle-check" /> No diagnostics</div>;
  return <div className="about-editor-diagnostics">{diagnostics.map((item, index) => <div key={`${item.code}-${item.path}-${index}`} className={`is-${item.level}`}><i className={`ti ${item.level === 'error' ? 'ti-alert-triangle' : 'ti-info-circle'}`} /><span><strong>{item.message}</strong><small>{item.path}</small></span></div>)}</div>;
}

function Inspector({ store, snapshot }) {
  const section = getSection(snapshot.document, snapshot.selection);
  let content = <SectionInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'sequence') content = <SequenceInspector store={store} snapshot={snapshot} />;
  if (snapshot.selection.type === 'cue') content = <CueInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'camera-key') content = <CameraInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'world') content = <WorldInspector store={store} snapshot={snapshot} section={section} />;
  if (snapshot.selection.type === 'interaction') content = <SectionInspector store={store} snapshot={snapshot} section={section} />;
  return <aside className="about-editor-inspector"><div className="about-editor-inspector-scroll">{content}<Diagnostics diagnostics={snapshot.diagnostics} /></div></aside>;
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
  const importRef = useRef(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

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

  return (
    <div className="about-editor" data-mobile-pane={mobilePane} role="region" aria-label="About Narrative creative toolkit">
      <header className="about-editor-topbar">
        <button type="button" className="about-editor-brand" onClick={() => store.setSelection({ type: 'sequence' })}><i className="ti ti-route" /><span>About Narrative</span><small>Creative toolkit</small></button>
        <Transport store={store} snapshot={snapshot} />
        <div className="about-editor-actions">
          <button type="button" disabled={!snapshot.history.canUndo} title={snapshot.history.undoLabel} onClick={() => store.undo()}><i className="ti ti-arrow-back-up" /></button>
          <button type="button" disabled={!snapshot.history.canRedo} title={snapshot.history.redoLabel} onClick={() => store.redo()}><i className="ti ti-arrow-forward-up" /></button>
          <button type="button" className={pathVisible ? 'is-active' : ''} onClick={() => setPathVisible(!pathVisible)}>Path</button>
          <button type="button" className={directorView ? 'is-active' : ''} onClick={toggleDirector}>{directorView ? 'Director' : 'Camera'}</button>
          <button type="button" className={snapshot.tryState?.label === 'Compare saved source' ? 'is-active' : ''} disabled={snapshot.tryState && snapshot.tryState.label !== 'Compare saved source'} onClick={toggleBefore}>{snapshot.tryState?.label === 'Compare saved source' ? 'Before' : 'After'}</button>
          <button type="button" onClick={addCheckpoint}>Checkpoint</button>
          <button type="button" onClick={() => exportAboutNarrativeDocument(snapshot.document)}>Export</button>
          <button type="button" onClick={() => importRef.current?.click()}>Import</button>
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
          <button type="button" data-about-editor-save className="is-save" disabled={snapshot.saveState.status === 'saving'} onClick={save}><span>{statusLabel}</span><i className="ti ti-device-floppy" /></button>
        </div>
      </header>

      {snapshot.recoveryState.available ? <div className="about-editor-recovery"><span>An unsaved draft from {new Date(snapshot.recoveryState.draft.timestamp).toLocaleString()} is available.</span><button type="button" onClick={() => { store.replaceDocument('Recover draft', snapshot.recoveryState.draft.document); store.setRecoveryState({ available: false }); }}>Recover as unsaved copy</button><button type="button" onClick={() => { exportAboutNarrativeDocument(snapshot.recoveryState.draft.document, 'contents-about-recovered.json'); }}>Export</button><button type="button" onClick={() => { clearAboutNarrativeRecoveryDraft(); store.setRecoveryState({ available: false }); }}>Discard</button></div> : null}
      {snapshot.saveState.message ? <div className={`about-editor-save-message is-${snapshot.saveState.status}`}>{snapshot.saveState.message}<button type="button" onClick={() => store.setSaveState({ message: '' })}><i className="ti ti-x" /></button></div> : null}

      {pathVisible ? <CameraPathOverlay snapshot={snapshot} /> : null}
      {directorView ? <div className="about-editor-director-controls"><strong>Director View</strong><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ yaw: -0.08 })}>←</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ pitch: 0.08 })}>↑</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ pitch: -0.08 })}>↓</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ yaw: 0.08 })}>→</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ distance: -0.2 })}>＋</button><button type="button" onClick={() => runtimeRef.current?.nudgeDirector?.({ distance: 0.2 })}>−</button><button type="button" onClick={() => runtimeRef.current?.resetDirector?.()}>Reset</button><small>Temporary inspection only. Published Camera keys are unchanged.</small></div> : null}

      <Inspector store={store} snapshot={snapshot} />
      <div className="about-editor-bottom">
        <div className="about-editor-contextbar">
          <span><strong>{selected?.label || 'Sequence'}</strong> {selected ? `${selected.type} · authored ${formatWU(selected.extentWU)} · resolved ${formatWU(resolvedExtent)}` : ''}</span>
          <span>{snapshot.autoKey ? 'Auto-key armed' : 'Auto-key off'}</span>
          <button type="button" className={snapshot.autoKey ? 'is-active' : ''} onClick={() => store.setAutoKey(!snapshot.autoKey)}><i className="ti ti-diamond" /> Auto-key</button>
          <button type="button" className={loopActive ? 'is-active' : ''} onClick={toggleLoop}>Loop Section</button>
          {['camera', 'world', 'text'].map((track) => <button type="button" key={track} className={snapshot.transport.soloTrack === track ? 'is-active' : ''} onClick={() => toggleSolo(track)}>Solo {track}</button>)}
          {runtimeMetrics ? <span className="about-editor-hud">{runtimeMetrics.frameTimeMs.toFixed(2)}ms · {runtimeMetrics.drawCalls} draw · {runtimeMetrics.pointCount.toLocaleString()} pts · {runtimeMetrics.activeModifiers} modifiers · {runtimeMetrics.bufferRebuilds} rebuilds</span> : null}
          {checkpoints.length ? <select aria-label="Restore checkpoint" defaultValue="" onChange={(event) => { const found = checkpoints.find((item) => item.id === event.target.value); if (found) { store.replaceDocument(`Restore ${found.name}`, found.document); store.setTransport({ owner: 'timeline', storyWU: found.storyWU, playing: false }); } event.target.value = ''; }}><option value="">Checkpoints ({checkpoints.length})</option>{checkpoints.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select> : null}
        </div>
        <Timeline store={store} snapshot={snapshot} />
      </div>
      <nav className="about-editor-mobile-tabs" aria-label="Editor panel"><button type="button" className={mobilePane === 'sequence' ? 'is-active' : ''} onClick={() => setMobilePane('sequence')}>Sequence</button><button type="button" className={mobilePane === 'inspect' ? 'is-active' : ''} onClick={() => setMobilePane('inspect')}>Inspect</button><button type="button" className={mobilePane === 'preview' ? 'is-active' : ''} onClick={() => setMobilePane('preview')}>Preview</button></nav>
    </div>
  );
}
