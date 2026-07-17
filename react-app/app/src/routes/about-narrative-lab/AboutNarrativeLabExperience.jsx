import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_DOCUMENT,
} from './aboutNarrativeLabData.js';
import { getAboutNarrativeCueMovement } from './aboutNarrativeCompiler.js';
import { AboutNarrativeWorld } from './AboutNarrativeWorld.jsx';
import {
  ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT,
  useAboutNarrativeTimeline,
} from './useAboutNarrativeTimeline.js';
import './about-narrative-lab.css';

function getSectionStyle(section) {
  return {
    '--section-duration-wu': section.extentWU,
    '--section-duration-mobile-wu': section.mobileExtentWU,
  };
}

function getVerticalCueStyle(cue, section) {
  const desktopExtentWU = Math.max(1, Number(section.extentWU));
  const mobileExtentWU = Math.max(1, Number(section.mobileExtentWU));
  const desktopTravelWU = Math.max(0.001, desktopExtentWU - 1);
  const mobileTravelWU = Math.max(0.001, mobileExtentWU - 1);
  const desktopTop = (0.5 + (Number(cue.hold) * desktopTravelWU)) / desktopExtentWU;
  const mobileTop = (0.5 + (Number(cue.hold) * mobileTravelWU)) / mobileExtentWU;
  return {
    '--vertical-cue-top': `${(desktopTop * 100).toFixed(4)}%`,
    '--vertical-cue-top-mobile': `${(mobileTop * 100).toFixed(4)}%`,
  };
}

function VerticalCueSequence({ cues, section, headingId = null, headingLevel = 2, onSelect }) {
  if (!cues.length) return null;
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="about-narrative-vertical-sequence" data-text-movement="vertical">
      {cues.map((cue, cueIndex) => {
        const isSemanticHeading = Boolean(headingId) && cueIndex === 0;
        const Element = isSemanticHeading ? Heading : 'p';
        return (
          <Element
            key={cue.id}
            id={isSemanticHeading ? headingId : undefined}
            className={`about-narrative-vertical-title${section.layout === 'opener' ? ' is-opener' : ''}`}
            style={getVerticalCueStyle(cue, section)}
            data-text-cue={cue.id}
            data-text-movement="vertical"
            data-editorial-line
            data-primary-copy
            aria-label={isSemanticHeading ? cues.map((item) => item.text).join(' ') : undefined}
            aria-hidden={isSemanticHeading ? undefined : true}
            onClick={(event) => {
              if (!onSelect) return;
              event.stopPropagation();
              onSelect({ type: 'cue', sectionId: section.id, cueId: cue.id });
            }}
          >{cue.text}</Element>
        );
      })}
    </div>
  );
}

function OpeningSection({ section, index, sectionRef, onSelect }) {
  const verticalCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === 'vertical');
  const spatialCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === 'spatial');
  const copy = section.text.cues.map((cue) => cue.text).join(' ');
  const headingId = 'about-route-title';
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--opening"
      data-narrative-section={section.id}
      data-section-index={index}
      style={getSectionStyle(section)}
      aria-labelledby={headingId}
      onClick={() => onSelect?.({ type: 'section', sectionId: section.id })}
      data-text-movement={verticalCues.length && spatialCues.length ? 'mixed' : verticalCues.length ? 'vertical' : 'spatial'}
    >
      <VerticalCueSequence cues={verticalCues} section={section} headingId={spatialCues.length ? null : headingId} headingLevel={1} onSelect={onSelect} />
      {spatialCues.length ? (
        <div className="about-narrative-spatial-stage" data-text-movement="spatial">
          <div className="about-narrative-spatial-copy">
            <h1 id={headingId} className="about-narrative-spatial-title" aria-label={copy} data-primary-copy>
              {spatialCues.map((cue) => (
                <span key={cue.id} className="about-narrative-spatial-fragment" data-text-cue={cue.id} data-text-movement="spatial" aria-hidden="true" onClick={(event) => { event.stopPropagation(); onSelect?.({ type: 'cue', sectionId: section.id, cueId: cue.id }); }}>{cue.text}</span>
              ))}
            </h1>
            <div className="about-narrative-opening-scroll-cue" aria-hidden="true">
              <i className="ti ti-arrow-left about-narrative-opening-scroll-cue__icon" />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SpatialSection({ section, index, sectionRef, onSelect }) {
  const Heading = index === 0 ? 'h1' : 'h2';
  const cues = section.text.cues || [];
  const copy = cues.map((cue) => cue.text).join(' ');
  const verticalCues = cues.filter((cue) => getAboutNarrativeCueMovement(cue) === 'vertical');
  const spatialCues = cues.filter((cue) => getAboutNarrativeCueMovement(cue) === 'spatial');
  const headingId = `about-narrative-${section.id}-title`;
  const hasHeading = verticalCues.length > 0 || spatialCues.length > 0;
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
      aria-labelledby={hasHeading ? headingId : undefined}
      aria-label={hasHeading ? undefined : section.label}
      data-text-movement={verticalCues.length && spatialCues.length ? 'mixed' : verticalCues.length ? 'vertical' : 'spatial'}
    >
      <VerticalCueSequence cues={verticalCues} section={section} headingId={spatialCues.length ? null : headingId} headingLevel={index === 0 ? 1 : 2} onSelect={onSelect} />
      {spatialCues.length ? (
        <div className="about-narrative-spatial-stage" data-text-movement="spatial">
          <div className="about-narrative-spatial-copy">
            <Heading
              id={headingId}
              className="about-narrative-spatial-title"
              aria-label={copy}
              data-primary-copy
            >
              {spatialCues.map((cue) => (
              <span
                key={cue.id}
                className="about-narrative-spatial-fragment"
                data-text-cue={cue.id}
                data-text-movement="spatial"
                aria-hidden="true"
                onClick={(event) => { event.stopPropagation(); onSelect?.({ type: 'cue', sectionId: section.id, cueId: cue.id }); }}
              >{cue.text}</span>
              ))}
            </Heading>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DisciplineRevealOverlay({ reveal, overlayRef }) {
  if (!reveal) return null;
  return (
    <ol
      ref={overlayRef}
      className="about-narrative-discipline-reveal"
      data-discipline-reveal={reveal.id}
      aria-label="Six connected disciplines"
      aria-hidden="true"
    >
      {reveal.items.map((item) => (
        <li
          key={item.group}
          data-discipline-group={item.group}
          data-discipline-tone={item.tone}
          style={{ '--discipline-label-offset': `${reveal.labelOffsetPx}px` }}
        >
          <span className="about-narrative-discipline-reveal__label">{item.label}</span>
        </li>
      ))}
    </ol>
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

function EditorialText({ text = '', emphasis = [] }) {
  if (!emphasis.length) return text;
  const matches = [];
  emphasis.forEach((item, emphasisIndex) => {
    if (!item.text) return;
    let fromIndex = 0;
    while (fromIndex < text.length) {
      const start = text.indexOf(item.text, fromIndex);
      if (start < 0) break;
      matches.push({
        start,
        end: start + item.text.length,
        tone: item.tone,
        emphasisIndex,
      });
      fromIndex = start + item.text.length;
    }
  });
  matches.sort((a, b) => (a.start - b.start) || (b.end - a.end) || (a.emphasisIndex - b.emphasisIndex));
  const accepted = [];
  matches.forEach((match) => {
    if (match.start >= (accepted.at(-1)?.end || 0)) accepted.push(match);
  });
  if (!accepted.length) return text;

  const parts = [];
  let cursor = 0;
  accepted.forEach((match) => {
    if (match.start > cursor) parts.push(text.slice(cursor, match.start));
    parts.push(
      <strong
        className="about-narrative-editorial-emphasis"
        data-emphasis-tone={match.tone}
        key={`${match.start}-${match.end}`}
      >
        {text.slice(match.start, match.end)}
      </strong>,
    );
    cursor = match.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function EditorialSection({ section, index, sectionRef, onSelect }) {
  const highlightedBlock = section.text.blocks.find((block) => block.kind === 'highlight');
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
      data-text-movement="vertical"
    >
      <div className="about-narrative-editorial-inner">
        <h2
          id={`about-narrative-${section.id}-title`}
          className="about-narrative-editorial-title"
          data-editorial-line
          data-editorial-block={highlightedBlock?.id}
          data-primary-copy
        >
          <EditorialText
            text={highlightedBlock?.text || section.label}
            emphasis={highlightedBlock?.emphasis}
          />
        </h2>
        {section.text.blocks.map((block) => {
          if (block.id === highlightedBlock?.id) return null;
          if (block.kind === 'list') return <EditorialList key={block.id} block={block} />;
          if (block.kind === 'disciplines') return <DisciplineList key={block.id} items={block.items} />;
          if (block.kind === 'clients') return <ClientLogos key={block.id} items={block.items} />;
          if (block.kind === 'detail') return <p key={block.id} className="about-narrative-editorial-detail" data-editorial-line data-editorial-block={block.id}><EditorialText text={block.text} emphasis={block.emphasis} /></p>;
          return (
            <p
              key={block.id}
              className="about-narrative-editorial-copy"
              data-editorial-line
              data-editorial-block={block.id}
              data-world-influence={block.worldInfluence ? 'true' : undefined}
              data-primary-copy
            >
              <EditorialText text={block.text} emphasis={block.emphasis} />
            </p>
          );
        })}
      </div>
    </section>
  );
}

function FinaleSection({ section, index, sectionRef, interactionRef, onSelect }) {
  const copy = section.text.cues.map((cue) => cue.text).join(' ');
  const spatialCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === 'spatial');
  const verticalCues = section.text.cues.filter((cue) => getAboutNarrativeCueMovement(cue) === 'vertical');
  const hasSupportingCopy = Boolean(section.text.profile || section.text.prompt);
  const headingId = `about-narrative-${section.id}-title`;
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--spatial about-narrative-section--closing about-narrative-section--finale"
      data-narrative-section={section.id}
      data-section-index={index}
      style={getSectionStyle(section)}
      aria-labelledby={headingId}
      data-text-movement={verticalCues.length && spatialCues.length ? 'mixed' : verticalCues.length ? 'vertical' : 'spatial'}
    >
      <VerticalCueSequence cues={verticalCues} section={section} headingId={spatialCues.length ? null : headingId} headingLevel={2} onSelect={onSelect} />
      <div className="about-narrative-spatial-stage about-narrative-finale-stage">
        <div className="about-narrative-spatial-copy about-narrative-finale-copy">
          {spatialCues.length ? (
            <h2 id={headingId} className="about-narrative-spatial-title" aria-label={copy} data-primary-copy>
              {spatialCues.map((cue) => (
                <span key={cue.id} className="about-narrative-spatial-fragment" data-text-cue={cue.id} data-text-movement="spatial" aria-hidden="true" onClick={() => onSelect?.({ type: 'cue', sectionId: section.id, cueId: cue.id })}>{cue.text}</span>
              ))}
            </h2>
          ) : null}
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

function ScrollProgressIndicator({ activeSectionIndex, activeStartIndex, sectionCount }) {
  const maxStartIndex = Math.max(
    1,
    ABOUT_SCROLL_INDICATOR_TICK_COUNT - ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  );
  const progressValue = Math.round((activeStartIndex / maxStartIndex) * 100);
  const sectionStatus = `Section ${activeSectionIndex + 1} of ${sectionCount}`;
  return (
    <>
      <div
        className="about-narrative-indicator"
        data-about-indicator-layer="ui"
        role="progressbar"
        aria-label="About page scroll progress"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={progressValue}
        aria-valuetext={sectionStatus}
      >
        {Array.from({ length: ABOUT_SCROLL_INDICATOR_TICK_COUNT }, (_, index) => {
          const isActive = index >= activeStartIndex
            && index < activeStartIndex + ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT;
          return (
            <div
              aria-hidden="true"
              className={`about-narrative-indicator__line${isActive ? ' is-active' : ''}`}
              data-active={isActive ? 'true' : 'false'}
              data-line-index={index}
              key={index}
            />
          );
        })}
      </div>
      <span className="about-narrative-visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {sectionStatus}
      </span>
    </>
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
  const [indicatorHost, setIndicatorHost] = useState(null);
  const [playbackDocument, setPlaybackDocument] = useState(ABOUT_NARRATIVE_DOCUMENT);
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const sectionRefs = useRef([]);
  const worldRuntimeRef = useRef(null);
  const bustInteractionRef = useRef(null);
  const disciplineOverlayRef = useRef(null);

  useLayoutEffect(() => {
    if (!showIndicator || typeof document === 'undefined') return undefined;
    const host = document.getElementById('shell-persistent-route-ui-host');
    setIndicatorHost(host);
    return undefined;
  }, [routeContentId, showIndicator]);

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

  const { activeSectionIndex, activeIndicatorStartIndex } = useAboutNarrativeTimeline({
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
  const disciplineReveal = useMemo(() => (
    playbackDocument.sections.find((section) => section.text?.disciplineReveal)?.text.disciplineReveal || null
  ), [playbackDocument]);
  const select = editorStore ? (selection) => editorStore.setSelection(selection) : null;
  const Editor = editorModule;

  return (
    <div ref={rootRef} className="about-narrative-lab" data-route-content={routeContentId} style={rootStyle}>
      <AboutNarrativeWorld rendererId="three-point-world-v1" rootRef={rootRef} interactionRef={bustInteractionRef} disciplineOverlayRef={disciplineOverlayRef} runtimeRef={worldRuntimeRef} />
      <DisciplineRevealOverlay reveal={disciplineReveal} overlayRef={disciplineOverlayRef} />
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
      {showIndicator && indicatorHost
        ? createPortal(
          <div className="about-narrative-indicator-layer" data-about-indicator-host="shell-persistent">
            <ScrollProgressIndicator
              activeSectionIndex={activeSectionIndex}
              activeStartIndex={activeIndicatorStartIndex}
              sectionCount={playbackDocument.sections.length}
            />
          </div>,
          indicatorHost,
        )
        : null}
      {Editor && editorStore ? <Editor store={editorStore} runtimeRef={worldRuntimeRef} rootRef={rootRef} /> : null}
    </div>
  );
}
