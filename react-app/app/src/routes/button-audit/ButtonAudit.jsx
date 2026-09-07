import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../components/app/ActionButton.jsx';
import { useButtonInteractions } from '../../lib/useButtonInteractions.js';
import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import { SimulationFocusSwitcher } from '../../components/simulation-focus/SimulationFocusProvider.jsx';
import { SimulationFocusContext } from '../../components/simulation-focus/SimulationFocusContext.js';
import { getDailyFocusSimulations } from '../../data/simulationCatalog.js';
import './button-audit.css';

const AUDIT_SIMULATIONS = getDailyFocusSimulations();

function AuditSimulationSwitcher() {
  const [index, setIndex] = useState(0);
  return (
    <SimulationFocusContext.Provider value={{
      activeSimulation: AUDIT_SIMULATIONS[index],
      advanceSimulation: () => setIndex((current) => (current + 1) % AUDIT_SIMULATIONS.length),
      isSelectionPending: false,
      shouldShowSwitcher: true,
      simulationTransitionPhase: 'idle',
    }}>
      <SimulationFocusSwitcher />
    </SimulationFocusContext.Provider>
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
  useButtonInteractions();
  const fileInputRef = useRef(null);
  const [theme, setTheme] = useState('dark');
  const [blur, setBlur] = useState(16);
  const [imageUrl, setImageUrl] = useState(null);
  useEffect(() => () => { if (imageUrl) URL.revokeObjectURL(imageUrl); }, [imageUrl]);
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
      style={{ '--abs-soft-control-blur': `${blur}px` }}
    >
      <img
        className="button-audit__background"
        src={imageUrl || '/images/about/interactive-stack/preview-01.webp'}
        alt=""
      />
      <header className="button-audit__header">
        <div><p className="button-audit__eyebrow">Studio / Interaction study</p><h1>Feel the difference.</h1><p>Press, hold, release. Same touch, every time.</p></div>
        <ActionButton
          variant="secondary"
          label={theme === 'dark' ? 'Dark' : 'Light'}
          className="button-audit__theme-toggle"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-pressed={theme === 'dark'}
          onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
        />
      </header>

      <section className="button-audit__settings" aria-label="Preview settings">
        <label className="button-audit__blur">
          <span>Backdrop blur <output>{blur}px</output></span>
          <input type="range" min="0" max="40" step="1" value={blur}
            onChange={(event) => setBlur(Number(event.target.value))} />
        </label>
        <div className="button-audit__upload">
          <span>Use your own image</span>
          <ActionButton variant="secondary" label="Choose image" onClick={() => fileInputRef.current?.click()} />
          <input ref={fileInputRef} hidden aria-label="Use your own image" type="file" accept="image/*" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setImageUrl(URL.createObjectURL(file));
          }} />
        </div>
        <ActionButton variant="secondary" label="Reset preview" className="button-audit__reset" onClick={() => {
          setBlur(16);
          setImageUrl(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }} />
        <p>Preview settings stay on this page.</p>
      </section>
      <section className="button-audit-family button-audit-family--actions" aria-label="Labelled action buttons">
        <div className="button-audit__grid">
          <EmailSpecimen
            copyText={contact.copy}
            email={email}
            statusId="button-audit-copy-status"
          />

          <LinkedInSpecimen href={linkedin} />
          <Specimen id="home-simulation-switcher">
            <AuditSimulationSwitcher />
          </Specimen>
        </div>
      </section>

      <section className="button-audit-family" aria-label="Circular utility buttons">
        <p className="button-audit__utility-heading">Utility controls / Same material and rebound</p>
        <div className="button-audit__grid">
          <Specimen
            id="portfolio-gate-close"
            variant="button-audit-specimen--corner-control"
          >
            <ActionButton
              variant="icon"
              className="portfolio-access-gate__close"
              aria-label="Close portfolio gate specimen"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
                />
              </svg>
            </ActionButton>
          </Specimen>

          <Specimen
            id="lab-media-close"
            variant="button-audit-specimen--corner-control"
          >
            <div className="button-audit-playground-context">
              <ActionButton
                variant="icon"
                className="playground-lightbox__close"
                aria-label="Close Lab media specimen"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                  <path
                    fill="currentColor"
                    d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
                  />
                </svg>
              </ActionButton>
            </div>
          </Specimen>

          <Specimen
            id="project-view-return"
            variant="button-audit-specimen--corner-control"
          >
            <ActionButton
              variant="icon"
              className="button-audit-utility"
              aria-label="Back to portfolio projects specimen"
            >
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </ActionButton>
          </Specimen>
        </div>
      </section>

      <p className="button-audit__note">Real site components. Try keyboard focus and a long press.</p>
    </main>
  );
}
