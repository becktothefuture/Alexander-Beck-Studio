import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_DOCUMENT,
} from './aboutNarrativeLabData.js';
import { ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS } from './aboutNarrativeDefinitions.js';
import { normalizeAboutNarrativeTrackDocument } from './aboutNarrativeTrackSchema.js';
import { AboutNarrativeWorld } from './AboutNarrativeWorld.jsx';
import {
  ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT,
  useAboutNarrativeTimeline,
} from './useAboutNarrativeTimeline.js';
import './about-narrative-lab.css';

const INITIAL_ABOUT_NARRATIVE_TRACK_DOCUMENT = normalizeAboutNarrativeTrackDocument(
  ABOUT_NARRATIVE_DOCUMENT,
);

function getRenderSpanStyle(span) {
  const startWU = Number(span.scrollBounds.startWU);
  const focusWU = Number(span.scrollBounds.focusWU);
  const endWU = Number(span.scrollBounds.endWU);
  return {
    '--render-span-start-wu': startWU,
    '--render-span-focus-wu': focusWU,
    '--render-span-end-wu': endWU,
    '--render-span-duration-wu': Math.max(0.001, endWU - startWU),
  };
}

function selectTextField(onSelect, fieldId, event) {
  if (!onSelect) return;
  event?.stopPropagation();
  onSelect({ type: 'text-field', id: fieldId });
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
  matches.sort((left, right) => (
    left.start - right.start
    || right.end - left.end
    || left.emphasisIndex - right.emphasisIndex
  ));
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

function getEditorialLines(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ScrollBlockField({ field, onSelect }) {
  const block = field.block || {};
  const commonProps = {
    'data-text-field-id': field.id,
    'data-primary-copy': true,
    'data-world-influence': block.worldInfluence ? 'true' : undefined,
    onClick: (event) => selectTextField(onSelect, field.id, event),
  };

  if (block.kind === 'highlight') {
    return (
      <h2 {...commonProps} className="about-narrative-editorial-title" data-editorial-line>
        <EditorialText text={block.text} emphasis={block.emphasis} />
      </h2>
    );
  }
  if (block.kind === 'detail') {
    return (
      <p {...commonProps} className="about-narrative-editorial-detail" data-editorial-line>
        <EditorialText text={block.text} emphasis={block.emphasis} />
      </p>
    );
  }
  if (block.kind === 'clients') {
    return (
      <ul {...commonProps} className="about-narrative-client-logos" data-editorial-line aria-label="Selected clients">
        {(block.items || []).map((item) => (
          <li key={item} data-client-logo={item.toLowerCase().replace(/[^a-z0-9]+/g, '-')}>
            {item}
          </li>
        ))}
      </ul>
    );
  }
  if (block.kind === 'disciplines') {
    return (
      <ol {...commonProps} className="about-narrative-discipline-list" aria-label={block.label || 'Areas of expertise'}>
        {(block.items || []).map((item, itemIndex) => (
          <li key={item} data-editorial-line data-world-group={itemIndex + 1}>
            <span className="about-narrative-discipline-list__marker" aria-hidden="true" />
            <span className="about-narrative-discipline-list__number" aria-hidden="true">
              {String(itemIndex + 1).padStart(2, '0')}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  }
  if (block.kind === 'list') {
    const labelId = `${field.id}-label`;
    return (
      <section
        {...commonProps}
        className="about-narrative-editorial-list"
        aria-labelledby={block.label ? labelId : undefined}
        aria-label={block.label ? undefined : 'About Alexander'}
      >
        {block.label ? <p id={labelId} className="about-narrative-editorial-list__label" data-editorial-line>{block.label}</p> : null}
        <ul>{(block.items || []).map((item) => <li key={item} data-editorial-line>{item}</li>)}</ul>
      </section>
    );
  }
  const lines = getEditorialLines(block.text);
  if (lines.length > 1) {
    return (
      <p
        {...commonProps}
        className="about-narrative-editorial-copy about-narrative-editorial-passage"
      >
        {lines.map((line, lineIndex) => (
          <span data-editorial-line key={`${lineIndex}-${line}`}>
            <EditorialText text={line} emphasis={block.emphasis} />
          </span>
        ))}
      </p>
    );
  }
  return (
    <p {...commonProps} className="about-narrative-editorial-copy" data-editorial-line>
      <EditorialText text={block.text} emphasis={block.emphasis} />
    </p>
  );
}

function FinaleActions() {
  return (
    <div className="about-narrative-finale-cta is-actions-only">
      <nav className="about-narrative-cta" aria-label="Contact Alexander">
        <a href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}>
          <span className="about-narrative-cta__label">Email</span>
        </a>
        <a href={ABOUT_NARRATIVE_CONTACT.linkedin} target="_blank" rel="noreferrer">
          <span className="about-narrative-cta__label">LinkedIn</span>
        </a>
      </nav>
    </div>
  );
}

function TitleField({
  field,
  isPrimaryTitle,
  interactionRef,
  onSelect,
}) {
  const Heading = isPrimaryTitle ? 'h1' : 'h2';
  const headingId = isPrimaryTitle ? 'about-route-title' : `${field.id}-title`;
  const isFinale = field.preset === 'finale-v1'
    || field.presentation?.layout === 'text-bust-cta';
  const bustInstructionsId = `${field.id}-bust-instructions`;
  return (
    <section
      className={`about-narrative-spatial-copy about-narrative-text-field${isFinale ? ' is-finale' : ''}`}
      data-text-field-id={field.id}
      data-text-preset={field.preset}
      aria-labelledby={headingId}
      onClick={(event) => selectTextField(onSelect, field.id, event)}
    >
      <Heading id={headingId} className="about-narrative-spatial-title about-narrative-spatial-fragment" data-primary-copy>
        {field.text}
      </Heading>
      {field.preset === 'opener-v1' ? (
        <div className="about-narrative-opening-scroll-cue" aria-hidden="true">
          <i className="ti ti-arrow-left about-narrative-opening-scroll-cue__icon" />
        </div>
      ) : null}
      {isFinale ? (
        <>
          <div
            ref={interactionRef}
            className="about-narrative-bust-interaction"
            data-active="false"
            role="group"
            aria-label="Rotate the point-cloud bust horizontally"
            aria-describedby={bustInstructionsId}
            aria-keyshortcuts="ArrowLeft ArrowRight"
            tabIndex={-1}
          />
          <span id={bustInstructionsId} className="about-narrative-visually-hidden">
            Drag horizontally, or use the left and right arrow keys, to rotate the bust.
          </span>
          <FinaleActions />
        </>
      ) : null}
    </section>
  );
}

function DisciplineRevealField({ field, overlayRef, onSelect }) {
  return (
    <ol
      ref={overlayRef}
      className="about-narrative-discipline-reveal"
      data-text-field-id={field.id}
      data-discipline-reveal={field.id}
      aria-label="Six connected disciplines"
      onClick={(event) => selectTextField(onSelect, field.id, event)}
    >
      {(field.choreography?.items || []).map((item) => (
        <li
          key={item.group}
          data-discipline-group={item.group}
          style={{
            '--discipline-color': `var(${ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS[item.group - 1]})`,
            '--discipline-label-offset': `${field.choreography.labelOffsetPx}px`,
          }}
        >
          <span className="about-narrative-discipline-reveal__label">{item.label}</span>
        </li>
      ))}
    </ol>
  );
}

function TextRenderSpan({
  field,
  span,
  isPrimaryTitle,
  interactionRef,
  disciplineOverlayRef,
  onSelect,
}) {
  if (!field?.publishable || field.kind === 'stub') return null;
  const layout = field.presentation?.layout || span.layoutMode;
  if (field.kind === 'title') {
    return (
      <div
        className={`about-narrative-render-span about-narrative-render-span--title about-narrative-render-span--${layout}`}
        data-render-span-id={span.id}
        data-presentation-layout={layout}
        style={getRenderSpanStyle(span)}
      >
        <div className="about-narrative-spatial-stage">
          <TitleField
            field={field}
            isPrimaryTitle={isPrimaryTitle}
            interactionRef={interactionRef}
            onSelect={onSelect}
          />
        </div>
      </div>
    );
  }
  if (field.kind === 'discipline-reveal') {
    return (
      <div
        className="about-narrative-render-span about-narrative-render-span--discipline"
        data-render-span-id={span.id}
        data-presentation-layout={layout}
        style={getRenderSpanStyle(span)}
      >
        <DisciplineRevealField field={field} overlayRef={disciplineOverlayRef} onSelect={onSelect} />
      </div>
    );
  }
  if (field.kind === 'scroll-block') {
    return (
      <div
        className={`about-narrative-render-span about-narrative-render-span--editorial about-narrative-render-span--${layout}`}
        data-render-span-id={span.id}
        data-presentation-layout={layout}
        style={getRenderSpanStyle(span)}
      >
        <ScrollBlockField field={field} onSelect={onSelect} />
      </div>
    );
  }
  return null;
}

function ScrollProgressIndicator({ activeStartIndex, progress }) {
  const maxStartIndex = Math.max(
    1,
    ABOUT_SCROLL_INDICATOR_TICK_COUNT - ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  );
  const progressValue = Math.round(Math.min(1, Math.max(0, Number(progress) || 0)) * 100);
  const resolvedStartIndex = Number.isFinite(activeStartIndex)
    ? activeStartIndex
    : Math.round((progressValue / 100) * maxStartIndex);
  return (
    <div
      className="about-narrative-indicator"
      data-about-indicator-layer="ui"
      role="progressbar"
      aria-label="About page scroll progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={progressValue}
      aria-valuetext={`${progressValue}% through the About narrative`}
    >
      {Array.from({ length: ABOUT_SCROLL_INDICATOR_TICK_COUNT }, (_, index) => {
        const isActive = index >= resolvedStartIndex
          && index < resolvedStartIndex + ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT;
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
  );
}

export function AboutNarrativeLabExperience({
  routeContentId = 'about-narrative-lab',
  showIndicator = true,
}) {
  const editorRequested = useMemo(() => {
    if (typeof window === 'undefined' || routeContentId !== 'about-narrative-lab') return false;
    const queryRequested = new URLSearchParams(window.location.search).get('edit') === '1';
    const publicPreviewRequested = __CERTIFY__
      && window.location.pathname.startsWith('/editor-preview/');
    return queryRequested || publicPreviewRequested;
  }, [routeContentId]);
  const [editorModule, setEditorModule] = useState(null);
  const [editorStore, setEditorStore] = useState(null);
  const [indicatorHost, setIndicatorHost] = useState(null);
  const [playbackDocument, setPlaybackDocument] = useState(INITIAL_ABOUT_NARRATIVE_TRACK_DOCUMENT);
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const worldRuntimeRef = useRef(null);
  const bustInteractionRef = useRef(null);
  const disciplineOverlayRef = useRef(null);

  useLayoutEffect(() => {
    if (!showIndicator || typeof document === 'undefined') return undefined;
    setIndicatorHost(document.getElementById('shell-persistent-route-ui-host'));
    return undefined;
  }, [routeContentId, showIndicator]);

  useEffect(() => {
    if ((!__DEV__ && !__CERTIFY__) || !editorRequested) return undefined;
    let active = true;
    Promise.all([
      import('./AboutNarrativeEditor.jsx'),
      import('./aboutNarrativeTrackEditorStore.js'),
    ]).then(([editor, storeModule]) => {
      if (!active) return;
      const store = storeModule.createAboutNarrativeTrackEditorStore(
        INITIAL_ABOUT_NARRATIVE_TRACK_DOCUMENT,
      );
      setEditorStore(store);
      setEditorModule(() => editor.default);
    }).catch((error) => console.error('[About narrative] Could not load the development editor.', error));
    return () => { active = false; };
  }, [editorRequested]);

  useEffect(() => {
    if (!editorStore) return undefined;
    const update = () => setPlaybackDocument(editorStore.getSnapshot().document);
    update();
    return editorStore.subscribe(update);
  }, [editorStore]);

  const {
    runtimePlan,
    storyWU,
    storyProgress,
    activeIndicatorStartIndex,
  } = useAboutNarrativeTimeline({
    document: playbackDocument,
    editorStore,
    rootRef,
    worldRuntimeRef,
    scrollportRef,
    contentRef,
  });

  const textFieldsById = useMemo(() => new Map(
    (runtimePlan?.textFields || []).map((field) => [field.id, field]),
  ), [runtimePlan]);
  const primaryTitleId = useMemo(() => (
    runtimePlan?.renderSpans
      ?.map((span) => textFieldsById.get(span.fieldIds[0]))
      .find((field) => field?.kind === 'title' && field.publishable)?.id || ''
  ), [runtimePlan, textFieldsById]);
  const select = editorStore ? (selection) => editorStore.setSelection(selection) : null;
  const Editor = editorModule;
  const globals = runtimePlan?.model?.globals || playbackDocument.globals;
  const contentExtentWU = runtimePlan?.resolver?.contentExtentWU
    || playbackDocument.profiles.desktop.scrollDurationWU + 1;
  const rootStyle = {
    '--about-reading-width': `${globals.readingWidthRem}rem`,
    '--about-text-perspective': `${Number(globals.textMotion.perspective) || 1600}px`,
    '--about-editorial-reveal-threshold': Number(globals.editorialRevealThreshold) || 0.8,
  };
  const contentStyle = {
    '--narrative-content-extent-wu': contentExtentWU,
  };

  return (
    <div
      ref={rootRef}
      className="about-narrative-lab"
      data-route-content={routeContentId}
      data-about-layout-profile={runtimePlan?.layoutProfile || 'desktop'}
      data-about-motion-profile={runtimePlan?.motionProfile || 'full'}
      data-narrative-story-wu={Number(storyWU || 0).toFixed(4)}
      style={rootStyle}
    >
      <AboutNarrativeWorld
        rendererId="three-point-world-v1"
        rootRef={rootRef}
        interactionRef={bustInteractionRef}
        disciplineOverlayRef={disciplineOverlayRef}
        runtimeRef={worldRuntimeRef}
        pointProfile={runtimePlan?.pointProfile}
      />
      <div
        ref={scrollportRef}
        className="about-narrative-scrollport"
        data-lenis-prevent-touch
        tabIndex={0}
        aria-label="About Alexander narrative"
      >
        <main ref={contentRef} className="about-narrative-content" style={contentStyle}>
          {(runtimePlan?.renderSpans || []).map((span) => {
            const field = textFieldsById.get(span.fieldIds[0]);
            if (!field?.publishable || field.kind === 'stub') return null;
            return (
              <TextRenderSpan
                key={span.id}
                field={field}
                span={span}
                isPrimaryTitle={field.id === primaryTitleId}
                interactionRef={bustInteractionRef}
                disciplineOverlayRef={disciplineOverlayRef}
                onSelect={select}
              />
            );
          })}
        </main>
      </div>
      {showIndicator && indicatorHost
        ? createPortal(
          <div className="about-narrative-indicator-layer" data-about-indicator-host="shell-persistent">
            <ScrollProgressIndicator
              activeStartIndex={activeIndicatorStartIndex}
              progress={storyProgress}
            />
          </div>,
          indicatorHost,
        )
        : null}
      {Editor && editorStore && typeof document !== 'undefined'
        ? createPortal(
          <Editor
            store={editorStore}
            runtimeRef={worldRuntimeRef}
            rootRef={rootRef}
            previewOnly={__CERTIFY__ && !__DEV__}
          />,
          document.body,
        )
        : null}
    </div>
  );
}
