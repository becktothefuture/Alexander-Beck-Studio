import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pause, Play } from 'lucide-react';
import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import {
  addStableEventListener, cancelStableAnimationFrame, clearStableTimeout,
  requestStableAnimationFrame, setStableTimeout,
} from '../../lib/legacy-runtime-scope.js';
import { ROUTE_ENTRANCE_START_EVENT } from '../../lib/motion/route-entrance-events.js';
import { registerRouteTransitionParticipant } from '../../lib/motion/route-transition-participants.js';
import { resolveRouteFromPathname } from '../../lib/routes.js';
import {
  resolveScrollProgressIndicatorState, SCROLL_PROGRESS_INDICATOR_TICK_COUNT,
} from '../../lib/scroll-progress-indicator.js';
import {
  readAboutNarrativeHistoryProgress, writeAboutNarrativeHistoryProgress,
} from '../about/aboutNarrativeScrollRestoration.js';
import {
  collectAboutNarrativeFontRequests, createAboutNarrativeFontReadiness,
} from '../about-narrative-lab/aboutNarrativeFontReadiness.js';
import { playContactRippleMotif } from '../../legacy/modules/audio/sound-engine.js';
import { createRollercoasterScene } from './rollercoasterScene.js';
import {
  applyRollercoasterTitlePresentation, createRollercoasterStoryLayout, ROLLERCOASTER_BEAT_IDS,
  ROLLERCOASTER_READING_BEATS, restoreRollercoasterScrollPosition,
  rollercoasterTitleOpacity, sampleRollercoasterScroll, selectRollercoasterCopy,
} from './rollercoasterStory.js';
import './about-rollercoaster.css';

const Controls = import.meta.env.DEV
  ? lazy(() => import('./AboutRollercoasterControls.jsx')) : null;
const CONTACT = Object.freeze({
  email: homeContent.contact?.email || 'alexander@beck.fyi',
  linkedin: homeContent.socials?.items?.linkedin?.url || 'https://www.linkedin.com/in/thisisbeck/',
});
const TYPE_ROLES = ['body', 'smallBody', 'eyebrow', 'mainTitle', 'inbetweenTitle'];
const TYPE_CSS_NAMES = ['body', 'small-body', 'eyebrow', 'main-title', 'inbetween-title'];

function contentStyle(document) {
  const type = document.globals?.typography || {};
  const style = {};
  TYPE_ROLES.forEach((role, index) => {
    style[`--about-${TYPE_CSS_NAMES[index]}-size-scale`] = type[`${role}SizeScale`] ?? 1;
    style[`--about-${TYPE_CSS_NAMES[index]}-line-height-scale`] = type[`${role}LineHeightScale`] ?? 1;
  });
  style['--about-paragraph-spacing-scale'] = type.paragraphSpacingScale ?? 1;
  style['--about-row-spacing-scale'] = type.rowSpacingScale ?? 1;
  style['--about-listing-separation-scale'] = type.listingSeparationScale ?? 1;
  style['--about-client-row-gap-scale'] = type.clientRowGapScale ?? 1;
  style['--about-client-column-gap-scale'] = type.clientColumnGapScale ?? 1;
  style['--about-reading-width'] = `${document.globals?.readingWidthRem ?? 50}rem`;
  return style;
}

function EditorialModule({ block }) {
  if (block.kind === 'stack') return (
    <div className="rollercoaster-editorial-stack">
      {block.label ? <h2 className="rollercoaster-eyebrow">{block.label}</h2> : null}
      {block.modules.map(module => <EditorialModule block={module} key={module.id} />)}
    </div>
  );
  if (block.kind === 'prose') return <p>{block.text}</p>;
  if (block.kind === 'career-sequence') return (
    <section aria-label={block.label}>
      <h3 className="rollercoaster-eyebrow">{block.label}</h3>
      <ol className="rollercoaster-career">
        {block.items.map(item => (
          <li key={item.id}>
            <p className="rollercoaster-career__year">{item.yearLabel}</p>
            <h4>{item.employer}<span>{item.role}</span></h4>
            <p>{item.description}</p>
          </li>
        ))}
      </ol>
      {block.independentWork ? <p>{block.independentWork.label} {block.independentWork.text}</p> : null}
    </section>
  );
  if (block.kind === 'disciplines') return (
    <section aria-label={block.label}>
      <h2 className="rollercoaster-eyebrow">{block.label}</h2>
      <ul className="rollercoaster-disciplines">
        {block.items.map(item => (
          <li key={item.id}>
            <h3>{item.label}</h3>
            <p>{item.description}</p>
          </li>
        ))}
      </ul>
      {block.text ? <p>{block.text}</p> : null}
    </section>
  );
  if (block.kind === 'logo-grid') return (
    <section aria-label={block.label}>
      <h2 className="rollercoaster-eyebrow">{block.label}</h2>
      <ul className="rollercoaster-clients">
        {block.items.map(item => (
          <li key={item.id} data-client-id={item.id}>
            <img src={item.src} alt={item.alt || item.label} style={{ '--client-scale': item.scale || 1 }} />
          </li>
        ))}
      </ul>
    </section>
  );
  return null;
}

function TitleField({ field, opening = false, ending = false, index, count }) {
  const Heading = opening ? 'h1' : 'h2';
  return (
    <div
      className={`rollercoaster-title-field${opening || ending ? ' rollercoaster-title-field--bookend' : ''}`}
      data-title-field={field.id}
      data-text-field-id={field.id}
      data-title-index={index}
      data-title-count={count}
      data-title-opening={opening ? 'true' : undefined}
      data-title-ending={ending ? 'true' : undefined}
    >
      <div className="rollercoaster-title-anchor">
        <Heading
          id={opening ? 'about-route-title' : field.id}
          className="rollercoaster-title route-centered-page__title"
          data-title-ink
        >
          {field.text}
        </Heading>
      </div>
      {field.description || ending ? (
        <div
          className="rollercoaster-title-support"
          data-title-support
          role={ending ? 'region' : undefined}
          aria-label={ending ? 'Get in touch' : undefined}
          tabIndex={ending ? -1 : undefined}
        >
          <span className="route-title-lockup__rule" aria-hidden="true" />
          {field.description ? <p className="route-centered-page__description route-intro-description">{field.description}</p> : null}
          {ending ? (
            <div className="rollercoaster-contact-actions contact-action-stack" data-ending-actions inert>
              <div className="contact-action-stack__primary">
                <CopyEmailAction
                  email={CONTACT.email}
                  onActivate={() => { void playContactRippleMotif({ unlockIfNeeded: false }); }}
                  soundSource="about-copy-email"
                  statusId="about-copy-status"
                />
              </div>
              <div className="contact-action-stack__secondary">
                <LinkedInAction href={CONTACT.linkedin} soundSource="about-linkedin" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// Range gives actual line wrapping; Canvas font metrics trim the surrounding
// font box. This is a once-per-measurement optical alignment, never travel or
// animation. Descriptions and controls do not take part in this calculation.
function centreTitleInk(title, context) {
  title.style.setProperty('--title-ink-x', '0px');
  title.style.setProperty('--title-ink-y', '0px');
  const style = getComputedStyle(title);
  context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  context.fontKerning = style.fontKerning;
  const range = document.createRange();
  const node = title.firstChild;
  const text = node?.textContent || '';
  const box = title.getBoundingClientRect();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let offset = 0;
  for (const glyph of text) {
    range.setStart(node, offset);
    range.setEnd(node, offset + glyph.length);
    offset += glyph.length;
    if (!glyph.trim()) continue;
    const rect = range.getBoundingClientRect();
    const metrics = context.measureText(glyph);
    const fontHeight = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const scale = fontHeight > 0 ? rect.height / fontHeight : 1;
    const baseline = Number.isFinite(fontHeight)
      ? rect.top + (metrics.fontBoundingBoxAscent * scale) : rect.bottom;
    minX = Math.min(minX, rect.left - metrics.actualBoundingBoxLeft);
    maxX = Math.max(maxX, rect.left + metrics.actualBoundingBoxRight);
    minY = Math.min(minY, baseline - (metrics.actualBoundingBoxAscent * scale));
    maxY = Math.max(maxY, baseline + (metrics.actualBoundingBoxDescent * scale));
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY)) return;
  title.style.setProperty('--title-ink-x', `${(box.left + (box.width / 2)) - ((minX + maxX) / 2)}px`);
  title.style.setProperty('--title-ink-y', `${(box.top + (box.height / 2)) - ((minY + maxY) / 2)}px`);
  title.closest('[data-title-field]').style.setProperty('--title-ink-height', `${maxY - minY}px`);
}

function ScrollIndicator({ indicatorRef }) {
  return (
    <div className="rollercoaster-indicator-layer">
      <div
        ref={indicatorRef}
        className="rollercoaster-indicator"
        role="progressbar"
        aria-label="About page scroll progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
      >
        {Array.from({ length: SCROLL_PROGRESS_INDICATOR_TICK_COUNT }, (_, index) => (
          <span className="rollercoaster-indicator__line" key={index} aria-hidden="true" />
        ))}
      </div>
    </div>
  );
}

export function AboutRollercoasterExperience({ routeContentId = 'about', showIndicator = true }) {
  const [contentDocument, setContentDocument] = useState(aboutContent);
  const [sourceMeta, setSourceMeta] = useState(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const indicatorRef = useRef(null);
  const measureRef = useRef(null);
  const reducedMotionRef = useRef(reducedMotion);
  const motionOverrideRef = useRef(false);
  const fields = selectRollercoasterCopy(contentDocument);
  const utilityHost = document.getElementById('shell-route-utility-slot');
  const indicatorHost = document.getElementById('shell-persistent-route-ui-host');

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => { measureRef.current?.(); }, [contentDocument]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const scrollport = scrollportRef.current;
    const content = contentRef.current;
    delete root.dataset.aboutSceneReady;
    root.dataset.aboutLayoutReady = 'false';
    const sections = Array.from(content.querySelectorAll('[data-story-beat]'));
    const titles = Array.from(content.querySelectorAll('[data-title-field]'));
    const titleRecords = titles.map(node => ({
      node, beatId: node.closest('[data-story-beat]').dataset.storyBeat, opacity: -1,
      support: node.querySelector('[data-title-support]'),
      actions: node.querySelector('[data-ending-actions]'),
      options: {
        index: Number(node.dataset.titleIndex), count: Number(node.dataset.titleCount),
        opening: node.dataset.titleOpening === 'true', ending: node.dataset.titleEnding === 'true',
      },
    }));
    // Also clean the former whole-field gate when this component is replaced
    // through hot reload. There is one semantic title, never a hidden clone.
    titles.forEach(node => {
      node.inert = false;
      node.removeAttribute('aria-hidden');
      node.style.removeProperty('visibility');
    });
    const readingNodes = Array.from(content.querySelectorAll('[data-reading-beat]'));
    const glyphContext = document.createElement('canvas').getContext('2d');
    const abortController = new AbortController();
    const frame = { progress: 0, beatId: 'departure', beatIndex: 0, localProgress: 0, scrollTop: 0 };
    const renderFrame = { progress: 0, ambientSeconds: 0, reducedMotion: reducedMotionRef.current };
    let disposed = false;
    let scene = null;
    let layout = null;
    let failed = false;
    let sceneError = null;
    let measuredReady = false;
    let entranceStarted = root.dataset.routeEntranceStarted === 'true';
    let entranceTime = entranceStarted ? performance.now() : null;
    let animationFrame = 0;
    let measurementFrame = 0;
    let historyTimer = 0;
    let previousTime = null;
    let lastIndicatorValue = -1;
    let lastPublishedProgress = -1;
    let lastDiagnosticTime = -Infinity;
    let restoredProgress = readAboutNarrativeHistoryProgress();
    let restored = false;
    let fontState = { ready: false, status: 'loading', diagnostics: [] };

    const signalReady = () => {
      if (disposed || (!failed && (!scene || !measuredReady))) return;
      if (root.dataset.aboutSceneReady === 'true') return;
      root.dataset.aboutSceneReady = 'true';
      window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
    };
    const failScene = (error) => {
      if (disposed || abortController.signal.aborted) return;
      failed = true;
      measuredReady = false;
      layout = null;
      sceneError = error?.message || String(error);
      scene?.dispose();
      scene = null;
      root.dataset.aboutSceneError = 'true';
      root.dataset.aboutSceneErrorMessage = sceneError;
      root.classList.add('is-fallback');
      content.style.removeProperty('height');
      sections.forEach(section => {
        section.style.removeProperty('top');
        section.style.removeProperty('height');
      });
      titleRecords.forEach(record => applyRollercoasterTitlePresentation(record, 1));
      setSceneFailed(true);
      signalReady();
    };
    const currentRouteIsAbout = () => resolveRouteFromPathname(location.pathname)?.id === 'about';
    const flushHistory = () => {
      clearStableTimeout(historyTimer);
      historyTimer = 0;
      if (!restored || !layout || !currentRouteIsAbout() || !root.isConnected) return;
      sampleRollercoasterScroll(layout, scrollport.scrollTop, frame);
      writeAboutNarrativeHistoryProgress(frame.progress);
    };
    const scheduleHistory = () => {
      if (!historyTimer) historyTimer = setStableTimeout(flushHistory, 250);
    };
    const scheduleMeasure = () => {
      if (!measurementFrame && !disposed) measurementFrame = requestStableAnimationFrame(measure);
    };
    const fontReadiness = createAboutNarrativeFontReadiness(document.fonts, scheduleMeasure);

    function measure() {
      measurementFrame = 0;
      if (disposed || root.clientHeight <= 0 || root.clientWidth <= 0) return;
      fontState = fontReadiness.read(collectAboutNarrativeFontRequests(content));
      root.dataset.aboutFontState = fontState.status;
      if (!fontState.ready) return;
      titles.forEach((field) => {
        if (glyphContext) centreTitleInk(field.querySelector('[data-title-ink]'), glyphContext);
      });
      if (!scene) {
        signalReady();
        return;
      }
      const readingHeights = Object.fromEntries(readingNodes.map(node => [
        node.dataset.readingBeat, node.getBoundingClientRect().height,
      ]));
      let next;
      try {
        next = createRollercoasterStoryLayout(scene.meta.beats, {
          viewportHeight: scrollport.clientHeight, readingHeights,
        });
      } catch (error) {
        failScene(error);
        return;
      }
      const previous = layout;
      const preservedProgress = !restored ? restoredProgress
        : sampleRollercoasterScroll(previous, scrollport.scrollTop, frame).progress;
      layout = next;
      content.style.height = `${next.contentHeightPx}px`;
      sections.forEach((section, index) => {
        const segment = next.segments[index];
        section.style.top = `${segment.startPx}px`;
        section.style.height = `${segment.distancePx + next.viewportHeight}px`;
        section.style.setProperty('--beat-copy-offset', `${segment.copyOffsetPx}px`);
        section.style.setProperty('--beat-viewport-height', `${next.viewportHeight}px`);
      });
      // A no-op measurement must never round-trip an unchanged native pixel.
      // Changed reading budgets restore the same authored source position.
      restoreRollercoasterScrollPosition(scrollport, previous, next, preservedProgress, !restored);
      restored = true;
      measuredReady = true;
      scene.resize(root.clientWidth, root.clientHeight);
      root.dataset.aboutLayoutReady = 'true';
      root.dataset.aboutScrollScreens = String(next.totalScreens);
      signalReady();
    }
    measureRef.current = scheduleMeasure;

    function render(now) {
      if (disposed) return;
      const motionReduced = reducedMotionRef.current;
      if (previousTime != null && !document.hidden && entranceStarted && !motionReduced) {
        renderFrame.ambientSeconds += Math.max(0, (now - previousTime) / 1000);
      }
      previousTime = document.hidden ? null : now;
      if (layout && measuredReady) {
        sampleRollercoasterScroll(layout, scrollport.scrollTop, frame);
        renderFrame.progress = frame.progress;
        renderFrame.reducedMotion = motionReduced;
        if (!document.hidden) scene?.render(renderFrame);
        if (frame.progress !== lastPublishedProgress) {
          root.dataset.aboutProgress = String(frame.progress);
          root.dataset.aboutBeat = frame.beatId;
          lastPublishedProgress = frame.progress;
        }
        const entranceOpacity = !entranceStarted ? 0
          : motionReduced ? 1 : Math.min(1, (now - entranceTime) / 320);
        titleRecords.forEach((record) => {
          const active = record.beatId === frame.beatId;
          const opacity = active ? rollercoasterTitleOpacity(frame.localProgress, record.options) * entranceOpacity : 0;
          if (record.opacity === opacity) return;
          record.opacity = opacity;
          applyRollercoasterTitlePresentation(record, opacity);
        });
        const progressValue = Math.round(frame.progress * 100);
        if (indicatorRef.current && progressValue !== lastIndicatorValue) {
          const indicator = indicatorRef.current;
          const state = resolveScrollProgressIndicatorState(frame.progress, {
            tickCount: SCROLL_PROGRESS_INDICATOR_TICK_COUNT,
          });
          indicator.setAttribute('aria-valuenow', String(state.progressValue));
          indicator.setAttribute('aria-valuetext', `${state.progressValue}% through the About story`);
          Array.from(indicator.children).forEach((line, index) => {
            line.classList.toggle('is-active', index >= state.activeStartIndex
              && index < state.activeStartIndex + state.activeTickCount);
          });
          lastIndicatorValue = progressValue;
        }
      }
      // Bounded, read-only DOM diagnostics also work in the native browser's
      // isolated inspection world. They never alter the scene or its clocks.
      if (import.meta.env.DEV && now - lastDiagnosticTime >= 500) {
        root.dataset.aboutRuntimeDiagnostics = JSON.stringify({
          ready: root.dataset.aboutSceneReady === 'true', layoutReady: measuredReady,
          fontState: fontState.status, progress: frame.progress, beat: frame.beatId,
          ambientSeconds: renderFrame.ambientSeconds, reducedMotion: motionReduced,
          scene: scene?.inspect({ pointIndices: [] }) || null, error: sceneError,
        });
        lastDiagnosticTime = now;
      }
      animationFrame = requestStableAnimationFrame(render);
    }

    const inspection = import.meta.env.DEV ? Object.freeze({
      inspect: () => ({
        ready: root.dataset.aboutSceneReady === 'true',
        layoutReady: measuredReady, fontState: structuredClone(fontState),
        progress: frame.progress, beat: frame.beatId, beatProgress: frame.localProgress,
        nativeScrollTop: scrollport.scrollTop, ambientSeconds: renderFrame.ambientSeconds,
        reducedMotion: reducedMotionRef.current, entranceStarted,
        layout: layout ? structuredClone(layout) : null,
        sourceMetadata: scene?.meta ? structuredClone(scene.meta) : null,
        scene: scene?.inspect() || null, error: sceneError,
      }),
    }) : null;
    if (import.meta.env.DEV) window.__aboutRollercoaster = inspection;
    const restoreHistory = () => {
      if (!currentRouteIsAbout()) return;
      restoredProgress = readAboutNarrativeHistoryProgress();
      restored = false;
      scheduleMeasure();
    };
    const startEntrance = (event) => {
      if (event.detail?.routeId !== routeContentId) return;
      entranceStarted = true;
      entranceTime = performance.now();
      previousTime = null;
    };
    const mediaQuery = matchMedia('(prefers-reduced-motion: reduce)');
    const cleanupEvents = [
      addStableEventListener(window, ROUTE_ENTRANCE_START_EVENT, startEntrance),
      addStableEventListener(scrollport, 'scroll', scheduleHistory, { passive: true }),
      addStableEventListener(scrollport, 'scrollend', flushHistory, { passive: true }),
      addStableEventListener(window, 'resize', scheduleMeasure, { passive: true }),
      addStableEventListener(window, 'pagehide', flushHistory),
      addStableEventListener(window, 'pageshow', event => { if (event.persisted) restoreHistory(); }),
      addStableEventListener(window, 'popstate', restoreHistory),
      addStableEventListener(document, 'visibilitychange', () => {
        previousTime = null;
        if (document.hidden) flushHistory();
      }),
      addStableEventListener(mediaQuery, 'change', event => {
        if (!motionOverrideRef.current) setReducedMotion(event.matches);
      }),
      addStableEventListener(content, 'load', scheduleMeasure, { capture: true }),
      addStableEventListener(content, 'focusin', (event) => {
        const support = event.target.closest?.('[data-title-support]');
        if (!support) return;
        const target = event.target.getBoundingClientRect();
        const bounds = support.getBoundingClientRect();
        const safety = 8;
        if (target.bottom + safety > bounds.bottom) support.scrollTop += target.bottom + safety - bounds.bottom;
        else if (target.top - safety < bounds.top) support.scrollTop -= bounds.top - target.top + safety;
      }),
    ];
    const unregister = registerRouteTransitionParticipant({
      id: 'about-rollercoaster-history', routeId: 'about', exit: flushHistory,
    });
    const observer = new ResizeObserver(scheduleMeasure);
    observer.observe(root);
    readingNodes.forEach(node => observer.observe(node));
    titles.forEach(field => observer.observe(field.querySelector('[data-title-ink]')));
    scheduleMeasure();
    animationFrame = requestStableAnimationFrame(render);
    void createRollercoasterScene({
      canvas, signal: abortController.signal,
      onReady: () => {
        if (disposed) return;
        sceneError = null;
        delete root.dataset.aboutSceneErrorMessage;
        scheduleMeasure();
      },
      onError: (error) => {
        if (disposed || abortController.signal.aborted) return;
        sceneError = error?.message || String(error);
        root.dataset.aboutSceneErrorMessage = sceneError;
      },
    }).then((runtime) => {
      if (disposed) { runtime.dispose(); return; }
      scene = runtime;
      failed = false;
      sceneError = null;
      root.classList.remove('is-fallback');
      delete root.dataset.aboutSceneError;
      delete root.dataset.aboutSceneErrorMessage;
      setSceneFailed(false);
      setSourceMeta(runtime.meta);
      scheduleMeasure();
    }).catch(failScene);

    return () => {
      flushHistory();
      disposed = true;
      abortController.abort();
      cancelStableAnimationFrame(animationFrame);
      cancelStableAnimationFrame(measurementFrame);
      clearStableTimeout(historyTimer);
      measureRef.current = null;
      observer.disconnect();
      fontReadiness.destroy();
      cleanupEvents.forEach(cleanup => cleanup());
      unregister();
      scene?.dispose();
      if (import.meta.env.DEV && window.__aboutRollercoaster === inspection) delete window.__aboutRollercoaster;
    };
  }, [routeContentId]);

  return (
    <div
      ref={rootRef}
      className={`about-rollercoaster about-narrative-lab${sceneFailed ? ' is-fallback' : ''}`}
      data-route-content={routeContentId}
      data-about-publication="released"
      data-about-layout-ready="false"
      data-about-font-state="loading"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={contentStyle(contentDocument)}
    >
      <canvas className="rollercoaster-scene" ref={canvasRef} aria-hidden="true" />
      <div
        ref={scrollportRef}
        className="rollercoaster-scrollport"
        data-cursor-default-surface
        tabIndex={0}
        aria-label="About Alex: scroll to read the story"
      >
        {sceneFailed ? <p className="rollercoaster-error" role="status">The scene is unavailable. You can still read my story below.</p> : null}
        <div className="rollercoaster-content" ref={contentRef}>
          {ROLLERCOASTER_BEAT_IDS.map(id => (
            <section className="rollercoaster-beat" data-story-beat={id} key={id}>
              {ROLLERCOASTER_READING_BEATS.includes(id) ? (
                <div className="rollercoaster-reading" data-reading-beat={id}>
                  {fields[id].map(field => (
                    <div data-text-field-id={field.id} key={field.id}>
                      <EditorialModule block={field.block} />
                    </div>
                  ))}
                </div>
              ) : fields[id].length ? (
                <div className="rollercoaster-title-viewport">
                  {fields[id].map((field, index) => (
                    <TitleField
                      key={field.id} field={field} index={index} count={fields[id].length}
                      opening={id === 'departure'} ending={id === 'ending'}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
      {showIndicator && indicatorHost ? createPortal(<ScrollIndicator indicatorRef={indicatorRef} />, indicatorHost) : null}
      {utilityHost ? createPortal(
        <button
          type="button"
          className="shell-utility-control"
          aria-label={reducedMotion ? 'Enable full scene motion' : 'Reduce scene motion'}
          aria-pressed={reducedMotion}
          title={reducedMotion ? 'Enable full scene motion' : 'Reduce scene motion'}
          data-about-motion-control
          data-sound-action="press"
          data-sound-source="about-motion-toggle"
          onClick={() => {
            motionOverrideRef.current = true;
            setReducedMotion(value => !value);
          }}
        >
          <span className="shell-utility-control__icon" aria-hidden="true">
            {reducedMotion ? <Play className="shell-utility-control__glyph" /> : <Pause className="shell-utility-control__glyph" />}
          </span>
        </button>, utilityHost,
      ) : null}
      {Controls ? (
        <Suspense fallback={null}>
          <Controls document={contentDocument} onDocumentChange={setContentDocument} sourceMeta={sourceMeta} />
        </Suspense>
      ) : null}
    </div>
  );
}

export default AboutRollercoasterExperience;
