import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_DOCUMENT,
} from './aboutNarrativeLabData.js';
import { ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS } from './aboutNarrativeDefinitions.js';
import { ABOUT_INTERACTIVE_STACK_KIND } from './aboutInteractiveStackContract.js';
import { AboutInteractiveStack } from './AboutInteractiveStack.jsx';
import { AboutNarrativeWorld } from './AboutNarrativeWorld.jsx';
import {
  ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT,
  useAboutNarrativeTimeline,
} from './useAboutNarrativeTimeline.js';
import './about-narrative-lab.css';

const INITIAL_ABOUT_NARRATIVE_POINT_FIELD_DOCUMENT = ABOUT_NARRATIVE_DOCUMENT;

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

function selectMotionClip(onSelect, clipId, event) {
  if (!onSelect) return;
  event?.stopPropagation();
  onSelect({ type: 'interaction', id: clipId });
}

function getEditorialEmphasisMatches(text = '', emphasis = []) {
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
  return accepted;
}

function getEditorialTokens(text = '', emphasis = []) {
  const accepted = getEditorialEmphasisMatches(text, emphasis);
  const tokens = [];
  String(text).replace(/\s+|[^\s]+/g, (value, offset) => {
    const end = offset + value.length;
    const match = accepted.find((candidate) => offset < candidate.end && end > candidate.start);
    tokens.push({
      end,
      start: offset,
      text: value,
      tone: match?.tone || null,
      whitespace: /^\s+$/.test(value),
    });
    return value;
  });
  return tokens;
}

function renderEditorialToken(token, tokenIndex, { measure = false } = {}) {
  if (token.whitespace) return token.text;
  const measureProps = measure
    ? { 'data-editorial-measure-word': true, 'data-token-index': tokenIndex }
    : {};
  return token.tone ? (
    <strong
      className="about-narrative-editorial-emphasis"
      key={tokenIndex}
      {...measureProps}
    >
      {token.text}
    </strong>
  ) : <span key={tokenIndex} {...measureProps}>{token.text}</span>;
}

function EditorialLineText({ text = '', emphasis = [], worldGroup = 0 }) {
  const hostRef = useRef(null);
  const measureRef = useRef(null);
  const signatureRef = useRef('');
  const tokens = useMemo(() => getEditorialTokens(text, emphasis), [emphasis, text]);
  const fallbackRange = useMemo(() => {
    const first = tokens.findIndex((token) => !token.whitespace);
    let last = tokens.length - 1;
    while (last >= 0 && tokens[last]?.whitespace) last -= 1;
    return first >= 0 && last >= first ? [{ start: first, end: last }] : [];
  }, [tokens]);
  const [lineRanges, setLineRanges] = useState(fallbackRange);

  useLayoutEffect(() => {
    const measureNode = measureRef.current;
    if (!measureNode || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    let disposed = false;

    const measureLines = () => {
      frame = 0;
      if (disposed) return;
      const wordNodes = Array.from(measureNode.querySelectorAll('[data-editorial-measure-word]'));
      const ranges = [];
      let currentTop = null;
      wordNodes.forEach((wordNode) => {
        const tokenIndex = Number(wordNode.dataset.tokenIndex);
        const top = wordNode.getBoundingClientRect().top;
        if (currentTop == null || Math.abs(top - currentTop) > 1) {
          ranges.push({ start: tokenIndex, end: tokenIndex });
          currentTop = top;
        } else {
          ranges.at(-1).end = tokenIndex;
        }
      });
      const signature = ranges.map((range) => `${range.start}:${range.end}`).join('|');
      if (!signature || signature === signatureRef.current) return;
      signatureRef.current = signature;
      setLineRanges(ranges);
    };
    const scheduleMeasure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(measureLines);
    };
    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(measureNode);
    measureLines();
    window.document.fonts?.ready?.then(scheduleMeasure).catch(() => {});
    window.document.fonts?.addEventListener?.('loadingdone', scheduleMeasure);
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.document.fonts?.removeEventListener?.('loadingdone', scheduleMeasure);
    };
  }, [tokens]);

  useLayoutEffect(() => {
    if (!lineRanges.length) return;
    hostRef.current?.dispatchEvent(new CustomEvent('about:editorial-lines-change', {
      bubbles: true,
    }));
  }, [lineRanges]);

  return (
    <span
      className="about-narrative-editorial-lines"
      data-editorial-line-count={lineRanges.length}
      ref={hostRef}
    >
      <span className="about-narrative-editorial-lines__measure" aria-hidden="true" ref={measureRef}>
        {tokens.map((token, tokenIndex) => renderEditorialToken(token, tokenIndex, { measure: true }))}
      </span>
      <span className="about-narrative-editorial-lines__output">
        {lineRanges.map((range, lineIndex) => (
          <span
            data-editorial-line
            data-editorial-line-index={lineIndex}
            data-world-group={worldGroup || undefined}
            key={`${range.start}-${range.end}`}
          >
            {tokens.slice(range.start, range.end + 1).map((token, rangeIndex) => (
              renderEditorialToken(token, range.start + rangeIndex)
            ))}
            {lineIndex < lineRanges.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </span>
  );
}

function getEditorialLines(text = '') {
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function ClientLogoItem({ item, reveal = false }) {
  const record = typeof item === 'string'
    ? { id: item.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: item, src: '', alt: item }
    : item;
  const scale = Number(record.scale);
  const offsetX = Number(record.offsetX);
  const offsetY = Number(record.offsetY);
  return (
    <li
      data-client-logo={record.id}
      data-editorial-line={reveal ? true : undefined}
      style={{
        '--client-logo-scale': Number.isFinite(scale) ? scale : 1,
        '--client-logo-offset-x': `${Number.isFinite(offsetX) ? offsetX : 0}%`,
        '--client-logo-offset-y': `${Number.isFinite(offsetY) ? offsetY : 0}%`,
      }}
    >
      {record.src ? (
        <>
          <img
            src={record.src}
            alt={record.alt || record.label}
            loading="lazy"
            decoding="async"
            onError={(event) => {
              event.currentTarget.hidden = true;
              if (event.currentTarget.nextElementSibling) event.currentTarget.nextElementSibling.hidden = false;
            }}
          />
          <span hidden>{record.label}</span>
        </>
      ) : <span>{record.label}</span>}
    </li>
  );
}

function ClientLogoGrid({ items = [], label = 'Selected clients' }) {
  return (
    <figure className="about-narrative-client-field">
      {label ? <figcaption data-editorial-line>{label}</figcaption> : null}
      <ul className="about-narrative-client-logos" aria-label="Selected clients">
        {items.map((item) => (
          <ClientLogoItem
            key={typeof item === 'string' ? item : item.id}
            item={item}
            reveal
          />
        ))}
      </ul>
    </figure>
  );
}

function EditorialMediaDeck({ module }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dragStartXRef = useRef(null);
  const items = module.items || [];
  const visibleItems = items.length ? items : [0, 1, 2].map((index) => ({
    id: `placeholder-${index + 1}`,
    label: `Artefact ${index + 1}`,
    src: '',
    alt: '',
    caption: '',
    placeholder: true,
  }));
  const advance = (direction = 1) => {
    if (!items.length) return;
    setActiveIndex((index) => (index + direction + items.length) % items.length);
  };
  return (
    <section
      className="about-narrative-media-deck"
      aria-label={module.label || 'Selected artefacts'}
      data-editorial-line
    >
      <p>{module.label || 'Selected artefacts'}</p>
      <button
        type="button"
        className="about-narrative-media-deck__stage"
        aria-label={items.length ? 'Show next artefact' : 'Image module ready for three to five artefacts'}
        onClick={() => advance(1)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') advance(-1);
          if (event.key === 'ArrowRight') advance(1);
        }}
        onPointerDown={(event) => { dragStartXRef.current = event.clientX; }}
        onPointerUp={(event) => {
          const startX = dragStartXRef.current;
          dragStartXRef.current = null;
          if (startX == null || Math.abs(event.clientX - startX) < 28) return;
          advance(event.clientX < startX ? 1 : -1);
        }}
        disabled={!items.length}
      >
        {visibleItems.map((item, index) => {
          const relativeIndex = (index - activeIndex + visibleItems.length) % visibleItems.length;
          return (
            <span
              className="about-narrative-media-deck__card"
              data-placeholder={item.placeholder ? 'true' : undefined}
              style={{ '--media-card-index': relativeIndex }}
              key={item.id}
            >
              {item.src ? <img src={item.src} alt={item.alt || item.label || ''} /> : null}
              <b>{item.label || 'Image slot'}</b>
              {item.caption ? <small>{item.caption}</small> : null}
            </span>
          );
        })}
      </button>
      {!items.length ? <small>Asset-ready · add 3–5 images and captions in the editor</small> : null}
    </section>
  );
}

function EditorialStack({ block, motionProfile, scrollportRef }) {
  const moduleGapRem = Number(block.moduleGapRem);
  return (
    <div
      className="about-narrative-editorial-stack"
      style={Number.isFinite(moduleGapRem)
        ? { '--about-editorial-stack-gap': `${moduleGapRem}rem` }
        : undefined}
    >
      {(block.modules || []).map((module) => {
        if (module.kind === 'logo-grid') {
          return <ClientLogoGrid key={module.id} items={module.items} label={module.label} />;
        }
        if (module.kind === 'media-deck') {
          return <EditorialMediaDeck key={module.id} module={module} />;
        }
        if (module.kind === ABOUT_INTERACTIVE_STACK_KIND) {
          return (
            <AboutInteractiveStack
              key={module.id}
              module={module}
              motionProfile={motionProfile}
              scrollportRef={scrollportRef}
            />
          );
        }
        return (
          <p className="about-narrative-editorial-copy" key={module.id}>
            <EditorialLineText text={module.text} emphasis={module.emphasis} />
          </p>
        );
      })}
    </div>
  );
}

function ScrollBlockField({ field, onSelect, motionProfile, scrollportRef }) {
  const block = field.block || {};
  const commonProps = {
    'data-text-field-id': field.id,
    'data-primary-copy': true,
    'data-world-influence': block.worldInfluence ? 'true' : undefined,
    onClick: (event) => selectTextField(onSelect, field.id, event),
  };

  if (block.kind === 'highlight') {
    return (
      <h2 {...commonProps} className="about-narrative-editorial-title">
        <EditorialLineText text={block.text} emphasis={block.emphasis} />
      </h2>
    );
  }
  if (block.kind === 'detail') {
    return (
      <p {...commonProps} className="about-narrative-editorial-detail">
        <EditorialLineText text={block.text} emphasis={block.emphasis} />
      </p>
    );
  }
  if (block.kind === 'clients') {
    return (
      <ul {...commonProps} className="about-narrative-client-logos" aria-label="Selected clients">
        {(block.items || []).map((item) => (
          <ClientLogoItem
            key={typeof item === 'string' ? item : item.id}
            item={item}
            reveal
          />
        ))}
      </ul>
    );
  }
  if (block.kind === 'stack') {
    return (
      <section
        {...commonProps}
        className="about-narrative-editorial-unit"
      >
        <EditorialStack
          block={block}
          motionProfile={motionProfile}
          scrollportRef={scrollportRef}
        />
      </section>
    );
  }
  if (block.kind === 'disciplines') {
    return (
      <ol {...commonProps} className="about-narrative-discipline-list" aria-label={block.label || 'Areas of expertise'}>
        {(block.items || []).map((item, itemIndex) => (
          <li key={item}>
            <span className="about-narrative-discipline-list__marker" aria-hidden="true" />
            <span className="about-narrative-discipline-list__number" aria-hidden="true">
              {String(itemIndex + 1).padStart(2, '0')}
            </span>
            <span>
              <EditorialLineText
                text={item}
                emphasis={block.emphasis}
                worldGroup={itemIndex + 1}
              />
            </span>
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
        <ul>{(block.items || []).map((item) => (
          <li key={item}>
            <EditorialLineText text={item} emphasis={block.emphasis} />
          </li>
        ))}</ul>
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
          <EditorialLineText text={line} emphasis={block.emphasis} key={`${lineIndex}-${line}`} />
        ))}
      </p>
    );
  }
  return (
    <p {...commonProps} className="about-narrative-editorial-copy">
      <EditorialLineText text={block.text} emphasis={block.emphasis} />
    </p>
  );
}

function FinaleActions() {
  return (
    <div className="about-narrative-finale-cta is-actions-only">
      <nav className="about-narrative-cta" aria-label="Contact Alexander">
        <a href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}>
          <span className="about-narrative-cta__label">Contact</span>
        </a>
        <a href={ABOUT_NARRATIVE_CONTACT.linkedin} target="_blank" rel="noreferrer">
          <i className="ti ti-brand-linkedin" aria-hidden="true" />
          <span className="about-narrative-visually-hidden">LinkedIn</span>
        </a>
      </nav>
    </div>
  );
}

function TitleField({
  field,
  textMotion,
  isPrimaryTitle,
  onSelect,
}) {
  const Heading = isPrimaryTitle ? 'h1' : 'h2';
  const headingId = isPrimaryTitle ? 'about-route-title' : `${field.id}-title`;
  const isFinale = field.preset === 'finale-v1'
    || field.presentation?.layout === 'text-finale-cta'
    || field.presentation?.layout === 'text-bust-cta';
  const isOpener = field.preset === 'opener-v1';
  const titleStyle = field.titleStyle
    || (isOpener || isFinale ? 'display' : 'standard');
  const authoredViewportY = Number(isOpener || isFinale
    ? textMotion.bookendViewportY
    : textMotion.standardViewportY);
  const viewportYBounds = { min: 0, max: 100 };
  const viewportY = Number.isFinite(authoredViewportY)
    ? Math.min(viewportYBounds.max, Math.max(viewportYBounds.min, authoredViewportY))
    : null;
  const descriptionId = `${field.id}-description`;
  return (
    <section
      className={`about-narrative-spatial-copy about-narrative-text-field${isFinale ? ' is-finale' : ''}`}
      data-text-field-id={field.id}
      data-text-preset={field.preset}
      data-title-style={titleStyle}
      data-title-viewport-y={viewportY == null ? undefined : viewportY}
      style={viewportY == null ? undefined : { '--about-title-viewport-y': `${viewportY}%` }}
      aria-labelledby={headingId}
      aria-describedby={(isOpener || isFinale) && field.description ? descriptionId : undefined}
      onClick={(event) => selectTextField(onSelect, field.id, event)}
    >
      {isFinale ? (
        <div className="about-narrative-finale-content">
          <div className="about-narrative-finale-lockup route-title-lockup">
            <Heading
              id={headingId}
              className="about-narrative-spatial-title about-narrative-spatial-fragment route-bookend-title route-title-lockup__title"
              data-primary-copy
            >
              {field.text}
            </Heading>
            <span className="route-title-lockup__rule" aria-hidden="true" />
            {field.description ? (
              <p
                id={descriptionId}
                className="about-narrative-finale-description route-centered-page__description route-intro-description route-title-lockup__description"
              >
                {field.description}
              </p>
            ) : null}
          </div>
          <FinaleActions />
        </div>
      ) : isOpener ? (
        <div className="about-narrative-opening-copy about-narrative-spatial-fragment route-centered-page__inner route-title-lockup">
          <Heading
            id={headingId}
            className="route-centered-page__title route-bookend-title"
            data-primary-copy
            data-route-enter="identity"
            data-route-enter-order="0"
            data-route-enter-variant="bookend-title"
          >
            {field.text}
          </Heading>
          <span className="route-title-lockup__rule" aria-hidden="true" />
          {field.description ? (
            <p
              id={descriptionId}
              className="route-centered-page__description route-intro-description"
              data-route-enter="context"
            >
              {field.description}
            </p>
          ) : null}
          <div
            className="about-narrative-opening-scroll-cue"
            data-route-enter="action"
            aria-hidden="true"
          >
            <i className="ti ti-arrow-left about-narrative-opening-scroll-cue__icon" />
          </div>
        </div>
      ) : (
        <Heading id={headingId} className="about-narrative-spatial-title about-narrative-spatial-fragment" data-primary-copy>
          {field.text}
        </Heading>
      )}
    </section>
  );
}

function DisciplineRevealField({ reveal, overlayRef, onSelect, selectionType = 'interaction' }) {
  const selectReveal = selectionType === 'text-field' ? selectTextField : selectMotionClip;
  return (
    <ol
      ref={overlayRef}
      className="about-narrative-discipline-reveal"
      data-motion-clip-id={selectionType === 'interaction' ? reveal.id : undefined}
      data-text-field-id={selectionType === 'text-field' ? reveal.id : undefined}
      data-discipline-reveal={reveal.id}
      aria-label="Six connected disciplines"
      onClick={(event) => selectReveal(onSelect, reveal.id, event)}
    >
      {(reveal.items || []).map((item) => (
        <li
          key={item.group}
          data-discipline-group={item.group}
          style={{
            '--discipline-color': `var(${ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS[item.group - 1]})`,
            '--discipline-label-offset': `${reveal.labelOffsetPx}px`,
            '--discipline-label-scale': reveal.labelScale,
          }}
        >
          <span className="about-narrative-discipline-reveal__copy">
            <span className="about-narrative-discipline-reveal__label">{item.label}</span>
            {item.description ? (
              <span className="about-narrative-discipline-reveal__description">{item.description}</span>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

function TextRenderSpan({
  field,
  span,
  textMotion,
  isPrimaryTitle,
  disciplineOverlayRef,
  onSelect,
  motionProfile,
  scrollportRef,
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
            textMotion={textMotion}
            isPrimaryTitle={isPrimaryTitle}
            onSelect={onSelect}
          />
        </div>
      </div>
    );
  }
  if (field.kind === 'discipline-reveal') {
    const reveal = {
      id: field.id,
      items: field.choreography?.items || [],
      labelOffsetPx: field.choreography?.labelOffsetPx || 0,
      labelScale: field.choreography?.labelScale ?? 1,
    };
    return (
      <div
        className="about-narrative-render-span about-narrative-render-span--discipline"
        data-render-span-id={span.id}
        data-presentation-layout={layout}
        style={getRenderSpanStyle(span)}
      >
        <DisciplineRevealField
          reveal={reveal}
          overlayRef={disciplineOverlayRef}
          onSelect={onSelect}
          selectionType="text-field"
        />
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
        <ScrollBlockField
          field={field}
          onSelect={onSelect}
          motionProfile={motionProfile}
          scrollportRef={scrollportRef}
        />
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
  const [playbackDocument, setPlaybackDocument] = useState(INITIAL_ABOUT_NARRATIVE_POINT_FIELD_DOCUMENT);
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const worldRuntimeRef = useRef(null);
  const worldInteractionRef = useRef(null);
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
      import('./aboutNarrativePointFieldEditorStore.js'),
    ]).then(([editor, storeModule]) => {
      if (!active) return;
      const store = storeModule.createAboutNarrativePointFieldEditorStore(
        INITIAL_ABOUT_NARRATIVE_POINT_FIELD_DOCUMENT,
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
  const disciplineRevealMotion = runtimePlan?.disciplineReveal?.sourceType === 'motion'
    ? runtimePlan.disciplineReveal
    : null;
  const Editor = editorModule;
  const globals = runtimePlan?.model?.globals || playbackDocument.globals;
  const contentExtentWU = runtimePlan?.resolver?.contentExtentWU
    || playbackDocument.profiles.desktop.scrollDurationWU + 1;
  const rootStyle = {
    '--about-reading-width': `${globals.readingWidthRem}rem`,
    '--about-title-standard-max-width': `${Number(globals.textMotion.standardMaxWidthCh) || 28}ch`,
    '--about-title-display-max-width': `${Number(globals.textMotion.displayMaxWidthCh) || 22}ch`,
    '--about-text-perspective': `${Number(globals.textMotion.perspective) || 1600}px`,
    '--about-editorial-reveal-threshold': Number(globals.editorialRevealThreshold) || 1,
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
        interactionRef={worldInteractionRef}
        disciplineOverlayRef={disciplineOverlayRef}
        runtimeRef={worldRuntimeRef}
        pointProfile={runtimePlan?.pointProfile}
        showCameraFocusAnchor={editorRequested && __DEV__}
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
                textMotion={globals.textMotion}
                isPrimaryTitle={field.id === primaryTitleId}
                disciplineOverlayRef={disciplineOverlayRef}
                onSelect={select}
                motionProfile={runtimePlan?.motionProfile || 'full'}
                scrollportRef={scrollportRef}
              />
            );
          })}
        </main>
      </div>
      {disciplineRevealMotion ? (
        <div className="about-narrative-motion-layer about-narrative-motion-layer--discipline">
          <DisciplineRevealField
            reveal={disciplineRevealMotion}
            overlayRef={disciplineOverlayRef}
            onSelect={select}
          />
        </div>
      ) : null}
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
