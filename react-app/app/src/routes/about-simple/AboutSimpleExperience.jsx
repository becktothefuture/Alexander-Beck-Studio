import { useCallback, useEffect, useRef } from 'react';
import aboutContent from 'virtual:abs-content/about';
import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import {
  createAboutNarrativeScrollPersistence,
  readAboutNarrativeHistoryProgress,
} from '../about/aboutNarrativeScrollRestoration.js';
import { mountAboutSimpleWorld } from './AboutSimpleWorld.js';
import './about-simple.css';

const ABOUT_FIELDS = aboutContent?.tracks?.text?.fields || [];
const PASSAGE_START_PROGRESS = 0.075;
const PROOF_START_PROGRESS = 0.6;
const HORIZON_START_PROGRESS = 0.92;

function getField(id) {
  return ABOUT_FIELDS.find((field) => field.id === id) || {};
}

function getModule(fieldId, moduleId) {
  return getField(fieldId)?.block?.modules?.find((module) => module.id === moduleId) || {};
}

function mergeWorldviewHeading() {
  const opening = String(getField('text-complexity-curiosity').text || '')
    .replace(/\s*…\s*$/, '')
    .trim();
  const conclusion = String(getField('text-complexity-listen').text || '')
    .replace(/^\s*…\s*/, '')
    .trim();
  return [opening, conclusion].filter(Boolean).join(' ');
}

function toFiniteNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getActiveAct(progress) {
  if (progress >= HORIZON_START_PROGRESS) return 'open-horizon';
  if (progress >= PROOF_START_PROGRESS) return 'landscape-proof';
  if (progress >= PASSAGE_START_PROGRESS) return 'passage';
  return 'arrival';
}

const OPENING = getField('text-promise-main');
const ORIGIN = getModule('text-background-unit', 'context');
const PRACTICE = getModule('text-background-unit', 'practice');
const CAREER = getModule('text-background-unit', 'career-sequence');
const CLIENTS = getModule('text-disciplines-title', 'selected-clients');
const FINALE = getField('text-epilogue-invitation');
const WORLDVIEW_HEADING = mergeWorldviewHeading();

function ClientLogo({ item }) {
  const scale = toFiniteNumber(item?.scale, 1);
  const offsetX = toFiniteNumber(item?.offsetX, 0);
  const offsetY = toFiniteNumber(item?.offsetY, 0);

  return (
    <li
      className="about-simple__client"
      data-client-logo={item.id}
      style={{
        '--about-simple-logo-scale': String(scale),
        '--about-simple-logo-offset-x': `${offsetX}%`,
        '--about-simple-logo-offset-y': `${offsetY}%`,
      }}
    >
      <img src={item.src} alt={item.alt || item.label || ''} loading="lazy" decoding="async" />
    </li>
  );
}

export function AboutSimpleExperience({ routeContentId = 'about', showIndicator = true }) {
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const canvasRef = useRef(null);
  const runtimeRef = useRef(null);
  const restoredProgressRef = useRef(readAboutNarrativeHistoryProgress());

  const syncScrollProgress = useCallback(() => {
    const root = rootRef.current;
    const scrollport = scrollportRef.current;
    if (!root || !scrollport) return;

    const scrollRange = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    const progress = scrollRange > 0 ? scrollport.scrollTop / scrollRange : 0;
    const boundedProgress = Math.min(1, Math.max(0, progress));
    const formattedProgress = boundedProgress.toFixed(3);

    root.style.setProperty('--about-simple-progress', String(boundedProgress));
    root.dataset.aboutProgress = formattedProgress;
    scrollport.dataset.aboutProgress = formattedProgress;
    runtimeRef.current?.setProgress(boundedProgress);
    const activeAct = getActiveAct(Number(formattedProgress));
    root.dataset.aboutActiveAct = activeAct;
    scrollport.dataset.aboutActiveAct = activeAct;
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return undefined;
    let disposed = false;
    let runtime = null;

    try {
      runtime = mountAboutSimpleWorld(canvas, root);
      runtimeRef.current = runtime;
      runtime.resize();
    } catch (error) {
      runtime?.destroy();
      runtime = null;
      runtimeRef.current = null;
      root.dataset.aboutSceneReady = 'false';
      root.dataset.aboutEntranceState = 'error';
      root.dataset.pointWorldState = 'error';
      console.error('Unable to mount the About point world.', error);
    }

    const restoredProgress = restoredProgressRef.current;
    if (restoredProgress > 0) {
      const scrollport = scrollportRef.current;
      const scrollRange = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      scrollport.scrollTop = scrollRange * restoredProgress;
    }
    syncScrollProgress();
    const scrollPersistence = createAboutNarrativeScrollPersistence(scrollportRef.current);

    if (runtime?.whenReady && typeof runtime.whenReady.then === 'function') {
      runtime.whenReady.then(() => {
        if (disposed || runtimeRef.current !== runtime) return;
        root.dataset.aboutSceneReady = 'true';
        root.dataset.aboutLayoutReady = 'true';
        root.dataset.aboutEntranceState = 'complete';
        root.dataset.pointWorldState = 'ready';
        window.dispatchEvent(new CustomEvent('abs:about-scene-ready'));
      }).catch((error) => {
        if (disposed || runtimeRef.current !== runtime) return;
        root.dataset.aboutSceneReady = 'false';
        root.dataset.aboutEntranceState = 'error';
        root.dataset.pointWorldState = 'error';
        console.error('The About point world failed before its first paint.', error);
      });
    } else if (runtime) {
      root.dataset.pointWorldState = 'error';
      console.error('The About point world did not provide a first-paint readiness signal.');
    }

    const handleResize = () => {
      runtimeRef.current?.resize();
      syncScrollProgress();
    };
    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(handleResize)
      : null;
    resizeObserver?.observe(root);
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      runtimeRef.current?.destroy();
      scrollPersistence.destroy();
      runtimeRef.current = null;
    };
  }, [syncScrollProgress]);

  return (
    <div
      ref={rootRef}
      className="about-narrative-lab about-simple"
      data-about-simple="true"
      data-route-content={routeContentId}
      data-about-scene-ready="false"
      data-about-layout-ready="true"
      data-about-entrance-state="pending"
      data-point-world-state="loading"
      data-about-progress="0.000"
      data-about-active-act="arrival"
    >
      <canvas ref={canvasRef} className="about-simple__canvas" aria-hidden="true" />

      {showIndicator ? (
        <div className="about-simple__progress" aria-hidden="true">
          <span />
        </div>
      ) : null}

      <div
        ref={scrollportRef}
        className="about-simple__scrollport"
        data-about-simple-scrollport="true"
        data-about-progress="0.000"
        data-about-active-act="arrival"
        data-lenis-prevent
        data-lenis-prevent-touch
        data-lenis-prevent-wheel
        role="region"
        aria-labelledby="about-route-title"
        tabIndex={0}
        onScroll={syncScrollProgress}
      >
        <div className="about-simple__story">
          <section
            className="about-simple__act about-simple__act--arrival"
            data-about-act="arrival"
            aria-labelledby="about-route-title"
          >
            <div className="about-simple__lockup about-simple__measure route-title-lockup">
              <h1
                id="about-route-title"
                className="route-centered-page__title route-bookend-title route-title-lockup__title"
                data-route-focus-target
                data-route-enter="identity"
                data-route-enter-order="0"
                data-route-enter-variant="bookend-title"
                tabIndex={-1}
              >
                {OPENING.text}
              </h1>
              <span
                className="route-title-lockup__rule"
                data-about-route-entry-rule
                aria-hidden="true"
              />
              {OPENING.description ? (
                <p className="route-centered-page__description route-intro-description">
                  {OPENING.description}
                </p>
              ) : null}
            </div>
            <p className="about-simple__scroll-cue" aria-hidden="true">
              <span>Scroll</span>
              <i />
            </p>
          </section>

          <section
            className="about-simple__act about-simple__act--passage"
            data-about-act="passage"
            aria-labelledby="about-simple-passage-title"
          >
            <h2 id="about-simple-passage-title" className="about-simple__sr-only">
              Passage
            </h2>
          </section>

          <section
            className="about-simple__act about-simple__act--proof"
            data-about-act="landscape-proof"
            aria-labelledby="about-simple-proof-title"
          >
            <div className="about-simple__proof-block">
              <div className="about-simple__landscape-copy about-simple__measure">
                <h2 id="about-simple-proof-title">{WORLDVIEW_HEADING}</h2>
                <div className="about-simple__body-copy">
                  {ORIGIN.text ? <p>{ORIGIN.text}</p> : null}
                  {PRACTICE.text ? <p>{PRACTICE.text}</p> : null}
                </div>
              </div>

              <div className="about-simple__career">
                <h3>{CAREER.label}</h3>
                <ol>
                  {(CAREER.items || []).map((item) => (
                    <li key={item.id}>
                      <span className="about-simple__career-year">{item.yearLabel}</span>
                      <strong>{item.employer}</strong>
                      <span>{item.role}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <figure className="about-simple__clients">
                <figcaption>{CLIENTS.label}</figcaption>
                <ul aria-label={CLIENTS.label || 'Selected clients'}>
                  {(CLIENTS.items || []).map((item) => <ClientLogo key={item.id} item={item} />)}
                </ul>
              </figure>
            </div>
          </section>

          <section
            className="about-simple__act about-simple__act--horizon"
            data-about-act="open-horizon"
            aria-labelledby="about-simple-finale-title"
          >
            <div className="about-simple__finale about-simple__measure route-title-lockup">
              <h2
                id="about-simple-finale-title"
                className="route-centered-page__title route-bookend-title route-title-lockup__title"
              >
                {FINALE.text}
              </h2>
              <span className="route-title-lockup__rule" aria-hidden="true" />
              {FINALE.description ? (
                <p className="route-centered-page__description route-intro-description">
                  {FINALE.description}
                </p>
              ) : null}
              <div className="about-simple__actions">
                <div className="about-simple__action">
                  <CopyEmailAction
                    email={homeContent.contact?.email}
                    copyText={homeContent.contact?.copy}
                    soundSource="about-copy-email"
                    statusId="about-simple-email-status"
                  />
                </div>
                <div className="about-simple__action">
                  <LinkedInAction
                    href={homeContent.socials?.items?.linkedin?.url}
                    soundSource="about-linkedin-profile"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
