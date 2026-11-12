import { useEffect, useRef, useState } from 'react';
import { ActionButton } from '../../components/app/ActionButton.jsx';
import { ActionLabel } from '../../components/app/ActionLabel.jsx';
import { useButtonInteractions } from '../../lib/useButtonInteractions.js';
import homeContent from 'virtual:abs-content/home';
import { CopyEmailAction } from '../../components/app/CopyEmailAction.jsx';
import { LinkedInAction } from '../../components/app/LinkedInAction.jsx';
import { ShellUtilityControls } from '../../components/app/ShellUtilityControls.jsx';
import { SimulationFocusSwitcher } from '../../components/simulation-focus/SimulationFocusProvider.jsx';
import { SimulationFocusContext } from '../../components/simulation-focus/SimulationFocusContext.js';
import { getDailyFocusSimulations } from '../../data/simulationCatalog.js';
import { ButtonStyleEditor } from './ButtonStyleEditor.jsx';
import '../../components/app/shell-utility-rail.css';
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

function Specimen({ children, id }) {
  return (
    <article
      className="button-audit-specimen"
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
  const [imageUrl, setImageUrl] = useState(null);
  const [showPhoto, setShowPhoto] = useState(true);
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
    <main className="button-audit" data-audit-theme={theme}>
      <header className="button-audit__header">
        <div>
          <h1>Button Playground</h1>
          <p>Review the outlined buttons here. Editor overrides also preview on open site tabs and can be saved to the site.</p>
        </div>
        <a href="/index.html" target="_blank" rel="noopener">Open site ↗</a>
      </header>

      <div className="button-audit__layout">
        <div className="button-audit__preview">
          <div className="button-audit__settings" aria-label="Preview settings">
            <label>
              Backdrop
              <select value={showPhoto ? 'photo' : 'solid'} onChange={event => setShowPhoto(event.currentTarget.value === 'photo')}>
                <option value="photo">Photo</option>
                <option value="solid">Solid</option>
              </select>
            </label>
            <ActionButton variant="secondary" label="Choose image" onClick={() => fileInputRef.current?.click()} />
            <input ref={fileInputRef} hidden aria-label="Use your own image" type="file" accept="image/*" onChange={event => {
              const file = event.currentTarget.files?.[0];
              if (file) { setImageUrl(URL.createObjectURL(file)); setShowPhoto(true); }
              event.currentTarget.value = '';
            }} />
            <ShellUtilityControls previewTheme={theme} onPreviewThemeChange={setTheme} />
          </div>
          <div className="button-audit__surface">
            {showPhoto ? <img className="button-audit__background"
              src={imageUrl || '/images/about/interactive-stack/preview-01.webp'} alt="" /> : null}
            <section className="button-audit-family button-audit-family--actions" aria-label="Contact and effect actions">
              <div className="button-audit__grid">
                <EmailSpecimen copyText={contact.copy} email={email} statusId="button-audit-copy-status" />
                <LinkedInSpecimen href={linkedin} />
                <Specimen id="home-simulation-switcher">
                  <AuditSimulationSwitcher />
                </Specimen>
              </div>
            </section>

            <section className="button-audit-family" aria-label="Circular utility buttons">
              <div className="button-audit__grid">
                <Specimen id="portfolio-gate-close">
                  <ActionButton variant="icon" className="portfolio-access-gate__close" aria-label="Close portfolio gate specimen">
                    <i className="ti ti-x" aria-hidden="true" />
                  </ActionButton>
                </Specimen>
                <Specimen id="lab-media-close">
                  <ActionButton variant="icon" className="playground-lightbox__close" aria-label="Close Lab media specimen">
                    <i className="ti ti-x" aria-hidden="true" />
                  </ActionButton>
                </Specimen>
                <Specimen id="project-view-return">
                  <ActionButton variant="icon" className="button-audit-utility" aria-label="Back to portfolio projects specimen">
                    <i className="ti ti-arrow-left" aria-hidden="true" />
                  </ActionButton>
                </Specimen>
              </div>
            </section>

            <div className="button-audit__native">
              <button type="button" className="abs-labelled-action"><ActionLabel>Native button</ActionLabel></button>
              <ActionButton disabled label="Disabled" />
            </div>
          </div>
        </div>
        <ButtonStyleEditor />
      </div>
    </main>
  );
}
