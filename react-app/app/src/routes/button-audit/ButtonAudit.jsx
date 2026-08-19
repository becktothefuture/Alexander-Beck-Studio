import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import {
  getDailyFocusSimulations,
  getResolvedSimulationFocus,
  writeManualSimulationFocus,
} from '../../data/simulationCatalog.js';
import './button-audit.css';

const AUDIT_SIMULATIONS = Object.freeze(getDailyFocusSimulations());
const AUDIT_SWITCHER_EXIT_MS = 160;
const AUDIT_SWITCHER_HOLD_MS = 880;
const AUDIT_SWITCHER_ENTRY_MS = 400;

function getInitialAuditSimulation() {
  const resolved = getResolvedSimulationFocus().activeSimulation;
  return AUDIT_SIMULATIONS.find((simulation) => simulation.id === resolved?.id)
    || AUDIT_SIMULATIONS[0]
    || null;
}

function getNextAuditSimulation(currentId) {
  const currentIndex = AUDIT_SIMULATIONS.findIndex((simulation) => simulation.id === currentId);
  if (currentIndex < 0 || AUDIT_SIMULATIONS.length < 2) return null;
  return AUDIT_SIMULATIONS[(currentIndex + 1) % AUDIT_SIMULATIONS.length];
}

function AuditSimulationSwitcher() {
  const [displayedSimulation, setDisplayedSimulation] = useState(getInitialAuditSimulation);
  const [phase, setPhase] = useState('idle');
  const [animatedInlineSize, setAnimatedInlineSize] = useState(null);
  const buttonRef = useRef(null);
  const phaseRef = useRef('idle');
  const exitTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const entryTimerRef = useRef(null);
  const widthFrameRef = useRef(null);
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    ?? false;

  useLayoutEffect(() => {
    if (phase !== 'holding' || !buttonRef.current) return undefined;
    const button = buttonRef.current;
    const previousSize = button.style.getPropertyValue('--simulation-focus-pill-inline-size');

    button.style.removeProperty('--simulation-focus-pill-inline-size');
    const nextSize = button.scrollWidth;
    if (previousSize) {
      button.style.setProperty('--simulation-focus-pill-inline-size', previousSize);
    }

    if (!Number.isFinite(nextSize) || nextSize <= 0) return undefined;
    widthFrameRef.current = window.requestAnimationFrame(() => {
      setAnimatedInlineSize(nextSize);
      widthFrameRef.current = null;
    });
    return () => {
      if (widthFrameRef.current !== null) window.cancelAnimationFrame(widthFrameRef.current);
    };
  }, [displayedSimulation?.id, phase]);

  useEffect(() => () => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (entryTimerRef.current) window.clearTimeout(entryTimerRef.current);
    if (widthFrameRef.current !== null) window.cancelAnimationFrame(widthFrameRef.current);
  }, []);

  const handleAdvance = useCallback(() => {
    if (phaseRef.current !== 'idle' || !displayedSimulation) return;
    const nextSimulation = getNextAuditSimulation(displayedSimulation.id);
    if (!nextSimulation) return;

    if (prefersReducedMotion) {
      writeManualSimulationFocus(nextSimulation.id);
      setAnimatedInlineSize(null);
      setDisplayedSimulation(nextSimulation);
      return;
    }

    const currentWidth = buttonRef.current?.getBoundingClientRect().width;
    if (Number.isFinite(currentWidth) && currentWidth > 0) {
      setAnimatedInlineSize(currentWidth);
    }

    phaseRef.current = 'departing';
    setPhase('departing');

    exitTimerRef.current = window.setTimeout(() => {
      writeManualSimulationFocus(nextSimulation.id);
      setDisplayedSimulation(nextSimulation);
      phaseRef.current = 'holding';
      setPhase('holding');
      exitTimerRef.current = null;

      holdTimerRef.current = window.setTimeout(() => {
        phaseRef.current = 'arriving';
        setPhase('arriving');
        holdTimerRef.current = null;

        entryTimerRef.current = window.setTimeout(() => {
          phaseRef.current = 'idle';
          setPhase('idle');
          entryTimerRef.current = null;
        }, AUDIT_SWITCHER_ENTRY_MS);
      }, AUDIT_SWITCHER_HOLD_MS);
    }, AUDIT_SWITCHER_EXIT_MS);
  }, [displayedSimulation, prefersReducedMotion]);

  if (!displayedSimulation) return null;

  const isAdvancing = phase !== 'idle';

  return (
    <div
      className="simulation-focus-switcher-slot"
      data-pending={String(isAdvancing)}
      data-route-enter="control"
    >
      <button
        ref={buttonRef}
        type="button"
        className="abs-labelled-action simulation-focus-pill simulation-focus-switcher simulation-focus-switcher--audit"
        data-simulation-id={displayedSimulation.id}
        data-sound-action="step"
        data-sound-source="simulation-next"
        data-advancing={String(isAdvancing)}
        data-phase={phase}
        data-motion-preference={prefersReducedMotion ? 'reduced' : 'full'}
        aria-label={isAdvancing
          ? 'Selecting the next simulation'
          : `Show next simulation. Currently ${displayedSimulation.name}`}
        aria-busy={isAdvancing ? 'true' : undefined}
        aria-disabled={isAdvancing ? 'true' : undefined}
        style={animatedInlineSize === null
          ? undefined
          : { '--simulation-focus-pill-inline-size': `${animatedInlineSize}px` }}
        onClick={handleAdvance}
      >
        <span
          className="simulation-focus-pill__label simulation-focus-pill__label--handoff"
          aria-hidden="true"
        >
          {displayedSimulation.name}
        </span>
        <span className="simulation-focus-pill__icon" aria-hidden="true">
          <RefreshCw strokeWidth={1.8} />
        </span>
      </button>

      <span className="simulation-focus-switcher-status" aria-live="polite">
        {phase === 'idle' ? `Current simulation: ${displayedSimulation.name}` : ''}
      </span>
    </div>
  );
}

function Specimen({ children, id, variant = '' }) {
  return (
    <article
      className={['button-audit-specimen', variant].filter(Boolean).join(' ')}
      data-audit-control={id}
    >
      <div className="button-audit-specimen__stage">{children}</div>
    </article>
  );
}

function EmailSpecimen({ copyText, email, statusId }) {
  return (
    <Specimen id="email-copy">
      <div className="contact-action-stack">
        <div className="contact-action-stack__primary">
          <CopyEmailAction
            copyText={copyText}
            email={email}
            soundSource="button-audit-copy-email"
            statusId={statusId}
          />
        </div>
      </div>
    </Specimen>
  );
}

function LinkedInSpecimen({ href }) {
  return (
    <Specimen id="linkedin">
      <div className="contact-action-stack">
        <div className="contact-action-stack__secondary">
          <LinkedInAction
            href={href}
            soundSource="button-audit-linkedin"
          />
        </div>
      </div>
    </Specimen>
  );
}

export function ButtonAudit() {
  const [theme, setTheme] = useState('dark');
  const contact = homeContent.contact || {};
  const email = contact.email || 'alexander@beck.fyi';
  const linkedin = homeContent.socials?.items?.linkedin?.url
    || 'https://www.linkedin.com/in/thisisbeck/';

  useEffect(() => {
    const isDark = theme === 'dark';
    for (const root of [document.documentElement, document.body]) {
      root.classList.toggle('dark-mode', isDark);
      root.dataset.absTheme = theme;
    }
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <main
      className="button-audit"
      data-audit-theme={theme}
    >
      <div className="button-audit__background" aria-hidden="true" />
      <header className="button-audit__header">
        <h1>Button audit</h1>
        <button
          type="button"
          className="button-audit__theme-toggle"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        >
          <span aria-hidden="true">{theme === 'dark' ? 'Dark' : 'Light'}</span>
        </button>
      </header>

      <section className="button-audit-family" aria-label="Labelled action buttons">
        <div className="button-audit__grid">
          <Specimen id="home-simulation-switcher">
            <AuditSimulationSwitcher />
          </Specimen>

          <EmailSpecimen
            copyText={contact.copy}
            email={email}
            statusId="button-audit-copy-status"
          />

          <LinkedInSpecimen href={linkedin} />
        </div>
      </section>

      <section className="button-audit-family" aria-label="Circular utility buttons">
        <div className="button-audit__grid">
          <Specimen
            id="portfolio-gate-close"
            variant="button-audit-specimen--corner-control"
          >
            <button
              type="button"
              className="portfolio-access-gate__close abs-icon-btn abs-circular-utility"
              aria-label="Close portfolio gate specimen"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
                />
              </svg>
            </button>
          </Specimen>

          <Specimen
            id="lab-media-close"
            variant="button-audit-specimen--corner-control"
          >
            <div className="button-audit-playground-context">
              <button
                type="button"
                className="playground-lightbox__close abs-icon-btn abs-circular-utility"
                aria-label="Close Lab media specimen"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
                  />
                </svg>
              </button>
            </div>
          </Specimen>

          <Specimen
            id="project-view-return"
            variant="button-audit-specimen--corner-control"
          >
            <button
              className="button-audit-utility abs-icon-btn abs-circular-utility"
              type="button"
              aria-label="Back to portfolio projects specimen"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </button>
          </Specimen>
        </div>
      </section>

    </main>
  );
}
