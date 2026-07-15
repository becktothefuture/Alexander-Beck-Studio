import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_DOCUMENT,
} from './aboutNarrativeLabData.js';
import { AboutNarrativeWorld } from './AboutNarrativeWorld.jsx';
import { useAboutNarrativeTimeline } from './useAboutNarrativeTimeline.js';
import './about-narrative-lab.css';

function getSectionStyle(section) {
  return {
    '--section-duration-wu': section.extentWU,
    '--section-duration-mobile-wu': section.mobileExtentWU,
  };
}

function CueText({ cue, onSelect }) {
  return (
    <span
      className="about-narrative-spatial-fragment"
      data-text-cue={cue.id}
      aria-hidden="true"
      onClick={(event) => {
        if (!onSelect) return;
        event.stopPropagation();
        onSelect({ type: 'cue', cueId: cue.id });
      }}
    >
      {cue.text}
    </span>
  );
}

function OpeningSection({ section, index, sectionRef, onSelect }) {
  const semanticCopy = section.text.cues.map((cue) => cue.text).join(' ');
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--opening"
      data-narrative-section={section.id}
      data-section-index={index}
      style={getSectionStyle(section)}
      aria-labelledby="about-route-title"
      onClick={() => onSelect?.({ type: 'section', sectionId: section.id })}
    >
      <div className="about-narrative-opening-inner">
        <h1 id="about-route-title" aria-label={semanticCopy} data-primary-copy>
          {section.text.cues.map((cue) => <CueText cue={cue} key={cue.id} onSelect={(selection) => onSelect?.({ ...selection, sectionId: section.id })} />)}
        </h1>
      </div>
    </section>
  );
}

function SpatialSection({ section, index, sectionRef, onSelect }) {
  const Heading = index === 0 ? 'h1' : 'h2';
  const copy = section.text.cues.map((cue) => cue.text).join(' ');
  const layoutClass = section.layout === 'lower'
    ? 'constellation'
    : section.layout === 'wide' ? 'living-field' : section.layout;
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className={`about-narrative-section about-narrative-section--spatial about-narrative-section--${layoutClass}`}
      data-narrative-section={section.id}
      data-section-index={index}
      style={getSectionStyle(section)}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-spatial-stage">
        <div className="about-narrative-spatial-copy">
          <Heading
            id={`about-narrative-${section.id}-title`}
            className="about-narrative-spatial-title"
            aria-label={copy}
            data-primary-copy
          >
            {section.text.cues.map((cue) => (
              <span
                key={cue.id}
                className="about-narrative-spatial-fragment"
                data-text-cue={cue.id}
                aria-hidden="true"
                onClick={(event) => { event.stopPropagation(); onSelect?.({ type: 'cue', sectionId: section.id, cueId: cue.id }); }}
              >{cue.text}</span>
            ))}
          </Heading>
        </div>
      </div>
    </section>
  );
}

function EditorialList({ block }) {
  return (
    <div className="about-narrative-editorial-list">
      {block.label ? <p className="about-narrative-editorial-list__label" data-editorial-line>{block.label}</p> : null}
      <ul>{block.items.map((item) => <li key={item} data-editorial-line>{item}</li>)}</ul>
    </div>
  );
}

function DisciplineList({ items }) {
  return (
    <ol className="about-narrative-discipline-list" aria-label="Areas of expertise">
      {items.map((item, itemIndex) => (
        <li key={item} data-editorial-line data-world-group={itemIndex + 1}>
          <span className="about-narrative-discipline-list__marker" aria-hidden="true" />
          <span className="about-narrative-discipline-list__number" aria-hidden="true">{String(itemIndex + 1).padStart(2, '0')}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ClientLogos({ items = [] }) {
  return (
    <ul className="about-narrative-client-logos" aria-label="Selected clients" data-editorial-line>
      {items.map((item) => (
        <li key={item} data-client-logo={item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
          {item}
        </li>
      ))}
    </ul>
  );
}

function EditorialSection({ section, index, sectionRef, onSelect }) {
  const highlightedBlock = section.text.blocks.find((block) => block.kind === 'highlight');
  const hasDisciplineList = section.text.blocks.some((block) => block.kind === 'disciplines');
  const finalProseId = hasDisciplineList
    ? [...section.text.blocks].reverse().find((block) => block.kind === 'prose')?.id
    : null;
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className={`about-narrative-section about-narrative-section--editorial${section.layout ? ` about-narrative-section--${section.layout}` : ''}`}
      data-narrative-section={section.id}
      data-section-index={index}
      style={getSectionStyle(section)}
      aria-labelledby={`about-narrative-${section.id}-title`}
      onClick={() => onSelect?.({ type: 'section', sectionId: section.id })}
    >
      <div className="about-narrative-editorial-inner">
        <h2
          id={`about-narrative-${section.id}-title`}
          className="about-narrative-editorial-title"
          data-editorial-line
          data-editorial-block={highlightedBlock?.id}
          data-primary-copy
        >
          {highlightedBlock?.text || section.label}
        </h2>
        {section.text.blocks.map((block) => {
          if (block.id === highlightedBlock?.id) return null;
          if (block.kind === 'list') return <EditorialList key={block.id} block={block} />;
          if (block.kind === 'disciplines') return <DisciplineList key={block.id} items={block.items} />;
          if (block.kind === 'clients') return <ClientLogos key={block.id} items={block.items} />;
          if (block.kind === 'detail') return <p key={block.id} className="about-narrative-editorial-detail" data-editorial-line data-editorial-block={block.id}>{block.text}</p>;
          return (
            <p
              key={block.id}
              className="about-narrative-editorial-copy"
              data-editorial-line
              data-editorial-block={block.id}
              data-world-influence={block.id === finalProseId ? 'true' : undefined}
              data-primary-copy
            >
              {block.text}
            </p>
          );
        })}
      </div>
    </section>
  );
}

function FinaleSection({ section, index, sectionRef, interactionRef, onSelect }) {
  const copy = section.text.cues.map((cue) => cue.text).join(' ');
  const hasSupportingCopy = Boolean(section.text.profile || section.text.prompt);
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--spatial about-narrative-section--closing about-narrative-section--finale"
      data-narrative-section={section.id}
      data-section-index={index}
      style={getSectionStyle(section)}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-spatial-stage about-narrative-finale-stage">
        <div className="about-narrative-spatial-copy about-narrative-finale-copy">
          <h2 id={`about-narrative-${section.id}-title`} className="about-narrative-spatial-title" aria-label={copy} data-primary-copy>
            {section.text.cues.map((cue) => (
              <span key={cue.id} className="about-narrative-spatial-fragment" data-text-cue={cue.id} aria-hidden="true" onClick={() => onSelect?.({ type: 'cue', sectionId: section.id, cueId: cue.id })}>{cue.text}</span>
            ))}
          </h2>
          <div
            ref={interactionRef}
            className="about-narrative-bust-interaction"
            data-active="false"
            role="group"
            aria-label="Rotate the point-cloud bust horizontally"
            tabIndex={-1}
          />
          <div className={`about-narrative-finale-cta${hasSupportingCopy ? '' : ' is-actions-only'}`}>
            {section.text.profile ? <p className="about-narrative-finale-profile">{section.text.profile}</p> : null}
            {section.text.prompt ? <p className="about-narrative-finale-statement">{section.text.prompt}</p> : null}
            <nav className="about-narrative-cta" aria-label="Contact Alexander">
              <a href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}>Email</a>
              <a href={ABOUT_NARRATIVE_CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionIndicator({ activeIndex, count }) {
  return (
    <div className="about-narrative-indicator" aria-label={`Section ${activeIndex + 1} of ${count}`} aria-live="polite" aria-atomic="true">
      <span>{String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span>
    </div>
  );
}

export function AboutNarrativeLabExperience({
  routeContentId = 'about-narrative-lab',
  showIndicator = true,
}) {
  const editorRequested = useMemo(() => (
    typeof window !== 'undefined'
    && routeContentId === 'about-narrative-lab'
    && new URLSearchParams(window.location.search).get('edit') === '1'
  ), [routeContentId]);
  const [editorModule, setEditorModule] = useState(null);
  const [editorStore, setEditorStore] = useState(null);
  const [playbackDocument, setPlaybackDocument] = useState(ABOUT_NARRATIVE_DOCUMENT);
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const sectionRefs = useRef([]);
  const worldRuntimeRef = useRef(null);
  const bustInteractionRef = useRef(null);

  useEffect(() => {
    if (!__DEV__ || !editorRequested) return undefined;
    let active = true;
    Promise.all([
      import('./AboutNarrativeEditor.jsx'),
      import('./aboutNarrativeEditorStore.js'),
    ]).then(([editor, storeModule]) => {
      if (!active) return;
      const store = storeModule.createAboutNarrativeEditorStore(ABOUT_NARRATIVE_DOCUMENT);
      setEditorStore(store);
      setEditorModule(() => editor.default);
    }).catch((error) => console.error('[About narrative] Could not load the development editor.', error));
    return () => { active = false; };
  }, [editorRequested]);

  useEffect(() => {
    if (!editorStore) return undefined;
    const update = () => {
      const state = editorStore.getSnapshot();
      setPlaybackDocument(state.tryState?.document || state.document);
    };
    update();
    return editorStore.subscribe(update);
  }, [editorStore]);

  const activeSectionIndex = useAboutNarrativeTimeline({
    document: playbackDocument,
    editorStore,
    rootRef,
    worldRuntimeRef,
    scrollportRef,
    contentRef,
    sectionRefs,
  });

  const rootStyle = useMemo(() => ({
    '--about-reading-width': `${playbackDocument.globals.readingWidthRem}rem`,
  }), [playbackDocument.globals.readingWidthRem]);
  const select = editorStore ? (selection) => editorStore.setSelection(selection) : null;
  const Editor = editorModule;

  return (
    <div ref={rootRef} className="about-narrative-lab" data-route-content={routeContentId} style={rootStyle}>
      <AboutNarrativeWorld rendererId="three-point-world-v1" rootRef={rootRef} interactionRef={bustInteractionRef} runtimeRef={worldRuntimeRef} />
      <div ref={scrollportRef} className="about-narrative-scrollport" data-lenis-prevent-touch tabIndex={0} aria-label="About Alexander narrative">
        <main ref={contentRef} className="about-narrative-content">
          {playbackDocument.sections.map((section, index) => {
            const sectionRef = (node) => { sectionRefs.current[index] = node; };
            if (section.layout === 'opener') return <OpeningSection key={section.id} section={section} index={index} sectionRef={sectionRef} onSelect={select} />;
            if (section.type === 'spatial') return <SpatialSection key={section.id} section={section} index={index} sectionRef={sectionRef} onSelect={select} />;
            if (section.type === 'finale') return <FinaleSection key={section.id} section={section} index={index} sectionRef={sectionRef} interactionRef={bustInteractionRef} onSelect={select} />;
            return <EditorialSection key={section.id} section={section} index={index} sectionRef={sectionRef} onSelect={select} />;
          })}
        </main>
      </div>
      {showIndicator && !editorStore ? <SectionIndicator activeIndex={activeSectionIndex} count={playbackDocument.sections.length} /> : null}
      {Editor && editorStore ? <Editor store={editorStore} runtimeRef={worldRuntimeRef} rootRef={rootRef} /> : null}
    </div>
  );
}
