import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_DOCUMENT,
} from './aboutNarrativeLabData.js';
import { ABOUT_INTERACTIVE_STACK_KIND } from './aboutInteractiveStackContract.js';
import { AboutInteractiveStack } from './AboutInteractiveStack.jsx';
import { AboutNarrativeWorld } from './AboutNarrativeWorld.jsx';
import {
  ABOUT_SCROLL_INDICATOR_ACTIVE_TICK_COUNT,
  ABOUT_SCROLL_INDICATOR_TICK_COUNT,
  useAboutNarrativeTimeline,
} from './useAboutNarrativeTimeline.js';
import { createRouteMaterialEntranceController } from '../../lib/motion/route-material-entrance.js';
import { ROUTE_ENTRANCE_START_EVENT } from '../../lib/motion/route-entrance-events.js';
import { registerRouteTransitionParticipant } from '../../lib/motion/route-transition-participants.js';
import {
  playContactRippleMotif,
  playInteractionSound,
  playScrollDetent,
} from '../../legacy/modules/audio/sound-engine.js';
import './about-narrative-lab.css';

const CANONICAL_ABOUT_EXPERIENCE_VERSION = 'v2';
const ABOUT_SCENE_MODEL_CREDITS = Object.freeze([
  Object.freeze({
    title: 'CRT Computer Monitor',
    author: 'Dan',
    href: 'https://sketchfab.com/3d-models/crt-computer-monitor-f2ff0013f86e4cd0a2aee183a23bdfee',
  }),
  Object.freeze({
    title: 'Cursor 3D',
    author: 'ReliefRain',
    href: 'https://sketchfab.com/3d-models/cursor-3d-fab4012385cc4d6fa7301d68df2ff271',
  }),
  Object.freeze({
    title: 'Generic Mobile Phone',
    author: 'AndrewHunt95',
    href: 'https://sketchfab.com/3d-models/generic-mobile-phone-d771c29639364ace91f8e868b0dec4a3',
  }),
  Object.freeze({
    title: 'Mouse with cable',
    author: 'Aerell Animation',
    href: 'https://sketchfab.com/3d-models/mouse-with-cable-4e673682d6a04cc986039cfc82cade02',
  }),
  Object.freeze({
    title: 'Pencil',
    author: 'farooq.smurf',
    href: 'https://sketchfab.com/3d-models/pencil-9fe73cc296ae407e911d3e511f891b0e',
  }),
]);

function AboutSceneModelCredits() {
  return (
    <details className="about-narrative-model-credits">
      <summary>3D model credits</summary>
      <p>
        Adapted point-cloud versions of{' '}
        {ABOUT_SCENE_MODEL_CREDITS.map((credit, index) => (
          <span key={credit.href}>
            {index > 0 ? (index === ABOUT_SCENE_MODEL_CREDITS.length - 1 ? ', and ' : ', ') : null}
            <a href={credit.href} target="_blank" rel="noreferrer">
              {credit.title} by {credit.author}
            </a>
          </span>
        ))}
        . Resampled and recoloured for this scene. Sources licensed under{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        .
      </p>
    </details>
  );
}

function getRenderSpanStyle(span, storyField = null, storyGap = null) {
  const startWU = Number(span.scrollBounds.startWU);
  const focusWU = Number(span.scrollBounds.focusWU);
  const endWU = Number(span.scrollBounds.endWU);
  return {
    '--render-span-start-wu': startWU,
    '--render-span-focus-wu': focusWU,
    '--render-span-end-wu': endWU,
    '--render-span-duration-wu': Math.max(0.001, endWU - startWU),
    '--story-block-duration-wu': Number(storyField?.durationWU)
      || Math.max(0.001, endWU - startWU),
    '--story-gap-after-wu': Number(storyGap?.durationWU) || 0,
  };
}

function selectTextField(onSelect, fieldId, event) {
  if (!onSelect) return;
  event?.stopPropagation();
  onSelect({ type: 'text-field', id: fieldId });
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

function renderEditorialToken(token, tokenIndex, {
  measure = false,
} = {}) {
  if (token.whitespace) return token.text;
  const measureProps = measure
    ? { 'data-editorial-measure-word': true, 'data-token-index': tokenIndex }
    : token.tone ? { 'data-editorial-emphasis': token.tone } : {};
  return <span key={tokenIndex} {...measureProps}>{token.text}</span>;
}

function EditorialLineText({ text = '', emphasis = [] }) {
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
        {lineRanges.map((range, lineIndex) => {
          const lineTokens = tokens.slice(range.start, range.end + 1);
          return (
            <span
              data-editorial-reveal="line"
              data-editorial-visual-line
              data-editorial-line-index={lineIndex}
              key={`${range.start}-${range.end}`}
            >
              {lineTokens.map((token, rangeIndex) => (
                renderEditorialToken(token, range.start + rangeIndex)
              ))}
              {lineIndex < lineRanges.length - 1 ? ' ' : null}
            </span>
          );
        })}
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

function ClientLogoItem({ item, onSettled, reveal = false }) {
  const record = typeof item === 'string'
    ? { id: item.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: item, src: '', alt: item }
    : item;
  const scale = Number(record.scale);
  const offsetX = Number(record.offsetX);
  const offsetY = Number(record.offsetY);
  return (
    <li
      data-client-logo={record.id}
      data-editorial-reveal={reveal ? 'logo' : undefined}
      data-editorial-atomic-row={reveal ? 'true' : undefined}
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
            loading="eager"
            decoding="async"
            onLoad={() => onSettled?.(record.id)}
            onError={(event) => {
              event.currentTarget.hidden = true;
              if (event.currentTarget.nextElementSibling) event.currentTarget.nextElementSibling.hidden = false;
              onSettled?.(record.id);
            }}
          />
          <span hidden>{record.label}</span>
        </>
      ) : <span>{record.label}</span>}
    </li>
  );
}

function ClientLogoGrid({ items = [], label = 'Selected clients' }) {
  const assetIds = useMemo(() => items.flatMap((item) => {
    if (typeof item === 'string' || !item?.src) return [];
    return [item.id];
  }), [items]);
  const assetSignature = assetIds.join('|');
  const [settledAssets, setSettledAssets] = useState(() => ({
    ids: new Set(),
    signature: assetSignature,
  }));
  const settledAssetIds = settledAssets.signature === assetSignature
    ? settledAssets.ids
    : new Set();
  const fieldReady = assetIds.every((id) => settledAssetIds.has(id));
  const markSettled = (id) => {
    setSettledAssets((current) => {
      const currentIds = current.signature === assetSignature ? current.ids : new Set();
      if (currentIds.has(id)) return current;
      const next = new Set(currentIds);
      next.add(id);
      return { ids: next, signature: assetSignature };
    });
  };
  return (
    <figure
      className="about-narrative-client-field"
      data-client-field-ready={fieldReady ? 'true' : 'false'}
    >
      {label ? (
        <figcaption>
          <EditorialLineText text={label} />
        </figcaption>
      ) : null}
      <ul className="about-narrative-client-logos" aria-label="Selected clients">
        {items.map((item) => (
          <ClientLogoItem
            key={typeof item === 'string' ? item : item.id}
            item={item}
            onSettled={markSettled}
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
  const suppressClickRef = useRef(false);
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
    playInteractionSound('step', { source: 'about-media-deck' });
    setActiveIndex((index) => (index + direction + items.length) % items.length);
  };
  return (
    <section
      className="about-narrative-media-deck"
      aria-label={module.label || 'Selected artefacts'}
      data-editorial-reveal="module"
    >
      <p>{module.label || 'Selected artefacts'}</p>
      <button
        type="button"
        className="about-narrative-media-deck__stage"
        aria-label={items.length ? 'Show next artefact' : 'Image module ready for three to five artefacts'}
        data-sound-action="manual"
        data-sound-source="about-media-deck"
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          advance(1);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') advance(-1);
          if (event.key === 'ArrowRight') advance(1);
        }}
        onPointerDown={(event) => { dragStartXRef.current = event.clientX; }}
        onPointerUp={(event) => {
          const startX = dragStartXRef.current;
          dragStartXRef.current = null;
          if (startX == null || Math.abs(event.clientX - startX) < 28) return;
          suppressClickRef.current = true;
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

function EditorialList({
  items = [],
  label = '',
  emphasis = [],
  labelId = undefined,
  containerProps = {},
}) {
  if (!label && items.length === 1) {
    return (
      <p
        {...containerProps}
        className="about-narrative-editorial-list about-narrative-editorial-pull-sentence"
      >
        <EditorialLineText text={items[0]} emphasis={emphasis} />
      </p>
    );
  }
  return (
    <section
      {...containerProps}
      className="about-narrative-editorial-list"
      aria-labelledby={label && labelId ? labelId : undefined}
      aria-label={label ? undefined : 'About Alexander'}
    >
      {label ? (
        <p id={labelId} className="about-narrative-editorial-list__label">
          <EditorialLineText text={label} />
        </p>
      ) : null}
      <ul>{items.map((item) => (
        <li key={item}>
          <EditorialLineText text={item} emphasis={emphasis} />
        </li>
      ))}</ul>
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
        if (module.kind === 'list') {
          return (
            <EditorialList
              key={module.id}
              items={module.items}
              label={module.label}
              labelId={`${block.id}-${module.id}-label`}
              emphasis={module.emphasis}
            />
          );
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
    // Keep string support for migrated drafts; authored v7 content uses objects
    // so each discipline can carry its explanation without another text track.
    // The list item is the reveal unit: its label and description never separate.
    return (
      <ol {...commonProps} className="about-narrative-discipline-list" aria-label={block.label || 'Areas of expertise'}>
        {(block.items || []).map((item) => {
          const label = typeof item === 'string' ? item : item.label;
          const description = typeof item === 'string' ? '' : item.description;
          const itemId = typeof item === 'string' ? item : item.id;
          const materialRole = itemId === 'motion-and-3d' ? 'motion-3d' : itemId;
          return (
            <li
              data-editorial-reveal="discipline"
              data-material-role={materialRole}
              key={itemId}
            >
              <span className="about-narrative-discipline-list__marker" aria-hidden="true" />
              <span className="about-narrative-discipline-list__copy">
                <strong className="about-narrative-discipline-list__label">{label}</strong>
                {description ? (
                  <span className="about-narrative-discipline-list__description">{description}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    );
  }
  if (block.kind === 'list') {
    const labelId = `${field.id}-label`;
    return (
      <EditorialList
        items={block.items}
        label={block.label}
        labelId={labelId}
        emphasis={block.emphasis}
        containerProps={commonProps}
      />
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

function TitleField({
  field,
  textMotion,
  isPrimaryTitle,
  drawTitleEntrances,
  onFinaleEmailPress,
  onSelect,
  showFinaleEmailAction,
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
              className="about-narrative-spatial-title about-narrative-spatial-fragment route-centered-page__title route-bookend-title route-title-lockup__title"
              data-primary-copy
              data-about-title-draw={drawTitleEntrances ? true : undefined}
              data-route-enter-variant="bookend-title"
            >
              {field.text}
            </Heading>
            <span className="route-title-lockup__rule" aria-hidden="true" />
            {field.description ? (
              <p
                id={descriptionId}
                className="about-narrative-finale-description route-centered-page__description route-intro-description"
                data-route-enter-variant="bookend-description"
              >
                {field.description}
                {!showFinaleEmailAction ? (
                  <>
                    {' '}
                    <a
                      className="about-narrative-finale-description__link"
                      href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}
                      data-sound-action="press"
                      data-sound-source="about-email-link"
                    >
                      Send me an email.
                    </a>
                  </>
                ) : null}
              </p>
            ) : null}
            {showFinaleEmailAction ? (
              <div className="about-narrative-finale-actions contact-action-stack">
                <div className="about-narrative-finale-email contact-action-stack__primary">
                  <CopyEmailAction
                    email={ABOUT_NARRATIVE_CONTACT.email}
                    onActivate={onFinaleEmailPress}
                    soundSource="about-copy-email"
                    statusId="about-copy-status"
                  />
                </div>
                <div className="contact-action-stack__secondary">
                  <LinkedInAction
                    href={ABOUT_NARRATIVE_CONTACT.linkedin}
                    soundSource="about-linkedin"
                  />
                </div>
              </div>
            ) : null}
            <AboutSceneModelCredits />
          </div>
        </div>
      ) : isOpener ? (
        <>
          <div className="about-narrative-opening-copy about-narrative-spatial-fragment route-centered-page__inner route-title-lockup">
            <Heading
              id={headingId}
              className="route-centered-page__title route-bookend-title"
              data-primary-copy
              data-about-title-draw={drawTitleEntrances ? true : undefined}
              data-route-focus-target={isPrimaryTitle ? true : undefined}
              tabIndex={isPrimaryTitle ? -1 : undefined}
              data-route-enter={drawTitleEntrances ? undefined : 'identity'}
              data-route-enter-order={drawTitleEntrances ? undefined : '0'}
              data-route-enter-variant="bookend-title"
            >
              {field.text}
            </Heading>
            <span
              className="route-title-lockup__rule"
              data-about-route-entry-rule
              aria-hidden="true"
            />
            {field.description ? (
              <p
                id={descriptionId}
                className="route-centered-page__description route-intro-description"
                data-route-enter="context"
                data-route-enter-variant="bookend-description"
              >
                {field.description}
              </p>
            ) : null}
          </div>
          <div
            className="about-narrative-opening-scroll-cue"
            data-route-enter="action"
            aria-hidden="true"
          >
            <span className="about-narrative-opening-scroll-cue__label">
              Scroll
            </span>
            <span className="about-narrative-opening-scroll-cue__line" />
          </div>
        </>
      ) : (
        <Heading
          id={headingId}
          className="about-narrative-spatial-title about-narrative-spatial-fragment"
          data-about-title-draw={drawTitleEntrances ? true : undefined}
          data-primary-copy
        >
          {field.text}
        </Heading>
      )}
    </section>
  );
}

function TextRenderSpan({
  field,
  span,
  storyField,
  storyGap,
  textMotion,
  isPrimaryTitle,
  drawTitleEntrances,
  onFinaleEmailPress,
  onSelect,
  showFinaleEmailAction,
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
        style={getRenderSpanStyle(span, storyField, storyGap)}
      >
        <div className="about-narrative-spatial-stage">
          <TitleField
            field={field}
            textMotion={textMotion}
            isPrimaryTitle={isPrimaryTitle}
            drawTitleEntrances={drawTitleEntrances}
            onFinaleEmailPress={onFinaleEmailPress}
            onSelect={onSelect}
            showFinaleEmailAction={showFinaleEmailAction}
          />
        </div>
      </div>
    );
  }
  if (field.kind === 'scroll-block') {
    return (
      <div
        className={`about-narrative-render-span about-narrative-render-span--editorial about-narrative-render-span--${layout}`}
        data-render-span-id={span.id}
        data-presentation-layout={layout}
        style={getRenderSpanStyle(span, storyField, storyGap)}
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
  routeContentId = 'about',
  showIndicator = true,
}) {
  const resolvedExperienceVersion = CANONICAL_ABOUT_EXPERIENCE_VERSION;
  const initialDocument = ABOUT_NARRATIVE_DOCUMENT;
  const [parameterPanelModule, setParameterPanelModule] = useState(null);
  const [parameterPanelVisible, setParameterPanelVisible] = useState(false);
  const [parameterStore, setParameterStore] = useState(null);
  const [parameterQualityTier, setParameterQualityTier] = useState('auto');
  const indicatorHost = useMemo(() => (
    showIndicator && typeof document !== 'undefined'
      ? document.getElementById('shell-persistent-route-ui-host')
      : null
  ), [showIndicator]);
  const [playbackDocument, setPlaybackDocument] = useState(initialDocument);
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const worldRuntimeRef = useRef(null);
  const worldInteractionRef = useRef(null);
  const indicatorLayerRef = useRef(null);
  const handleFinaleEmailPress = useCallback(() => {
    void playContactRippleMotif({ unlockIfNeeded: false });
  }, []);

  useEffect(() => {
    if (!__DEV__ || routeContentId !== 'about') return undefined;
    let active = true;
    Promise.all([
      import('./AboutNarrativeParameterPanel.jsx'),
      import('./aboutNarrativeParameterStore.js'),
    ]).then(([panel, storeModule]) => {
      if (!active) return;
      const store = storeModule.createAboutNarrativeParameterStore(initialDocument);
      setParameterStore(store);
      setParameterPanelModule(() => panel.default);
    }).catch((error) => console.error('[About narrative] Could not load the development parameter panel.', error));
    return () => { active = false; };
  }, [initialDocument, resolvedExperienceVersion, routeContentId]);

  useEffect(() => {
    if (!parameterStore) return undefined;
    const update = () => {
      const snapshot = parameterStore.getSnapshot();
      setPlaybackDocument(snapshot.document);
      setParameterQualityTier(snapshot.qualityTier);
    };
    update();
    return parameterStore.subscribe(update);
  }, [parameterStore]);

  useEffect(() => {
    if (!__DEV__ || routeContentId !== 'about') return undefined;
    const handleSlash = (event) => {
      const slash = event.key === '/' || event.code === 'Slash';
      if (!slash) return;
      const target = event.target;
      const typing = target instanceof Element && Boolean(target.closest(
        'input, textarea, select, [contenteditable="true"]',
      ));
      if (typing) {
        event.stopImmediatePropagation();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) setParameterPanelVisible((visible) => !visible);
    };
    window.addEventListener('keydown', handleSlash, { capture: true });
    return () => window.removeEventListener('keydown', handleSlash, { capture: true });
  }, [routeContentId]);

  const {
    runtimePlan,
    storyWU,
    storyProgress,
    activeIndicatorStartIndex,
  } = useAboutNarrativeTimeline({
    document: playbackDocument,
    editorStore: parameterStore,
    finaleContinuation: resolvedExperienceVersion === 'v2',
    solidTitles: resolvedExperienceVersion === 'v2',
    rootRef,
    worldRuntimeRef,
    scrollportRef,
    contentRef,
    playScrollDetent,
  });

  useLayoutEffect(() => {
    const layer = indicatorLayerRef.current;
    if (!showIndicator || !indicatorHost || !layer) return undefined;

    const revealAccessibility = () => layer.removeAttribute('aria-hidden');
    const hideAccessibility = () => layer.setAttribute('aria-hidden', 'true');
    const controller = createRouteMaterialEntranceController({
      id: 'about-progress-indicator-material',
      routeId: 'about',
      diagnosticRoot: layer,
      getTargets: () => layer.querySelectorAll('.about-narrative-indicator__line'),
      setTargetScale: (line, scale) => {
        line.style.setProperty('--about-indicator-route-scale', scale.toFixed(4));
      },
      getDelayRatio: (line, index, targets, direction) => {
        const lineIndex = Number(line.dataset.lineIndex);
        const ratio = targets.length > 1
          ? (Number.isFinite(lineIndex) ? lineIndex : index) / (targets.length - 1)
          : 0;
        return direction === 'out' ? 1 - ratio : 0.45 + (ratio * 0.55);
      },
    });
    const prepare = (options) => {
      hideAccessibility();
      return controller.prepare(options);
    };
    const enter = async (options) => {
      const completed = await controller.enter(options);
      if (completed) revealAccessibility();
      return completed;
    };
    const settle = (reason) => {
      const settled = controller.settle(reason);
      revealAccessibility();
      return settled;
    };

    prepare();
    const unregister = registerRouteTransitionParticipant({
      id: `about-progress-indicator-material-${routeContentId}`,
      routeId: 'about',
      prepare: ({ signal }) => prepare({ signal }),
      exit: ({ signal }) => {
        hideAccessibility();
        return controller.exit({ signal });
      },
      enter: ({ signal }) => enter({ signal }),
      restore: () => settle('route-restored'),
      cancel: ({ reason }) => settle(reason),
    });
    const handleDirectEntrance = (event) => {
      const routeId = event?.detail?.routeId || '';
      if (event?.detail?.mode !== 'direct') return;
      if (routeId !== 'about') return;
      void enter();
    };
    window.addEventListener(ROUTE_ENTRANCE_START_EVENT, handleDirectEntrance);

    return () => {
      window.removeEventListener(ROUTE_ENTRANCE_START_EVENT, handleDirectEntrance);
      unregister();
      controller.destroy({ settleTargets: false });
    };
  }, [indicatorHost, routeContentId, showIndicator]);

  const textFieldsById = useMemo(() => new Map(
    (runtimePlan?.textFields || []).map((field) => [field.id, field]),
  ), [runtimePlan]);
  const storyFieldsById = useMemo(() => new Map(
    (runtimePlan?.storyLayout?.fields || []).map((field) => [field.id, field]),
  ), [runtimePlan]);
  const storyGapsByFieldId = useMemo(() => new Map(
    (runtimePlan?.storyLayout?.gaps || []).map((gap) => [gap.fromFieldId, gap]),
  ), [runtimePlan]);
  const primaryTitleId = useMemo(() => (
    runtimePlan?.renderSpans
      ?.map((span) => textFieldsById.get(span.fieldIds[0]))
      .find((field) => field?.kind === 'title' && field.publishable)?.id || ''
  ), [runtimePlan, textFieldsById]);
  const ParameterPanel = parameterPanelModule;
  const globals = runtimePlan?.model?.globals || playbackDocument.globals;
  const contentExtentWU = runtimePlan?.resolver?.contentExtentWU
    || playbackDocument.profiles.desktop.scrollDurationWU + 1;
  const rootStyle = {
    '--about-reading-width': `${globals.readingWidthRem}rem`,
    '--about-title-standard-max-width': `${Number(globals.textMotion.standardMaxWidthCh) || 28}ch`,
    '--about-title-display-max-width': `${Number(globals.textMotion.displayMaxWidthCh) || 22}ch`,
    '--about-text-perspective': `${Number(globals.textMotion.perspective) || 1600}px`,
    '--about-editorial-reveal-threshold': Number(globals.editorialRevealThreshold) || 1,
    '--about-editorial-resting-opacity': Number(globals.textMotion.titleExitOpacity ?? 0.2),
  };
  const contentStyle = {
    '--narrative-content-extent-wu': contentExtentWU,
    '--story-editorial-tail-wu': Number(runtimePlan?.storyLayout?.editorialTailWU) || 0.24,
  };

  return (
    <div
      ref={rootRef}
      className="about-narrative-lab"
      data-route-content={routeContentId}
      data-about-layout-profile={runtimePlan?.layoutProfile || 'desktop'}
      data-about-motion-profile={runtimePlan?.motionProfile || 'full'}
      data-about-quality-tier={parameterQualityTier}
      data-about-experience-version={resolvedExperienceVersion}
      data-about-parameter-panel={parameterPanelVisible ? 'open' : 'closed'}
      data-about-story-layout={runtimePlan?.storyLayout?.mode || 'legacy'}
      data-narrative-story-wu={Number(storyWU || 0).toFixed(4)}
      style={rootStyle}
    >
      <div
        className="about-narrative-text-corridor"
        data-about-text-corridor
        aria-hidden="true"
      />
      {runtimePlan ? (
        <AboutNarrativeWorld
          rendererId="three-point-world-v1"
          rootRef={rootRef}
          interactionRef={worldInteractionRef}
          runtimeRef={worldRuntimeRef}
          pointProfile={parameterQualityTier === 'auto'
            ? runtimePlan.pointProfile
            : parameterQualityTier}
          layoutProfile={runtimePlan.layoutProfile}
        />
      ) : null}
      <div
        ref={scrollportRef}
        className="about-narrative-scrollport"
        data-cursor-default-surface
        data-lenis-prevent-touch
        tabIndex={0}
        aria-label="About Alexander narrative"
      >
        <div ref={contentRef} className="about-narrative-content" style={contentStyle}>
          {(runtimePlan?.renderSpans || []).map((span) => {
            const field = textFieldsById.get(span.fieldIds[0]);
            if (!field?.publishable || field.kind === 'stub') return null;
            return (
              <TextRenderSpan
                key={span.id}
                field={field}
                span={span}
                storyField={storyFieldsById.get(field.id)}
                storyGap={storyGapsByFieldId.get(field.id)}
                textMotion={globals.textMotion}
                isPrimaryTitle={field.id === primaryTitleId}
                drawTitleEntrances={resolvedExperienceVersion === 'v2'}
                onFinaleEmailPress={handleFinaleEmailPress}
                onSelect={null}
                showFinaleEmailAction={resolvedExperienceVersion === 'v2'}
                motionProfile={runtimePlan?.motionProfile || 'full'}
                scrollportRef={scrollportRef}
              />
            );
          })}
        </div>
      </div>
      {showIndicator && indicatorHost
        ? createPortal(
          <div
            ref={indicatorLayerRef}
            className="about-narrative-indicator-layer"
            data-about-indicator-host="shell-persistent"
          >
            <ScrollProgressIndicator
              activeStartIndex={activeIndicatorStartIndex}
              progress={storyProgress}
            />
          </div>,
          indicatorHost,
        )
        : null}
      {ParameterPanel && parameterStore && typeof document !== 'undefined'
        ? createPortal(
          <ParameterPanel
            visible={parameterPanelVisible}
            store={parameterStore}
            onRequestClose={() => setParameterPanelVisible(false)}
          />,
          document.body,
        )
        : null}
    </div>
  );
}
