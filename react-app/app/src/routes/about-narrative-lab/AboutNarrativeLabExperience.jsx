import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ABOUT_NARRATIVE_BACKGROUNDS,
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_CONTROL_GROUPS,
  ABOUT_NARRATIVE_DEFAULT_SETTINGS,
  ABOUT_NARRATIVE_SECTIONS,
  ABOUT_NARRATIVE_SETTINGS_KEY,
} from './aboutNarrativeLabData.js';
import { useAboutNarrativeScroll } from './useAboutNarrativeScroll.js';
import './about-narrative-lab.css';

function readStoredSettings() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(ABOUT_NARRATIVE_SETTINGS_KEY) || '{}');
    return Object.fromEntries(Object.entries(ABOUT_NARRATIVE_DEFAULT_SETTINGS).map(([key, fallback]) => {
      const value = Number(stored[key]);
      return [key, Number.isFinite(value) ? value : fallback];
    }));
  } catch {
    return { ...ABOUT_NARRATIVE_DEFAULT_SETTINGS };
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.insetInlineStart = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand?.('copy') === true;
    textarea.remove();
    return copied;
  }
}

function BackgroundStage({ stage, stageRef, index }) {
  return (
    <img
      ref={stageRef}
      className="about-narrative-background__stage"
      src={stage.src}
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority={index === 0 ? 'high' : 'low'}
      style={{ '--background-weight': index === 0 ? 1 : 0 }}
    />
  );
}

function SpatialSection({ section, index, sectionRef, children }) {
  const Heading = index === 0 ? 'h1' : 'h2';
  const fragments = section.fragments || [section.copy];
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className={`about-narrative-section about-narrative-section--spatial about-narrative-section--${section.variant}`}
      data-narrative-section={section.id}
      data-section-index={index}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-spatial-stage">
        <div className="about-narrative-spatial-copy">
          <p className="about-narrative-section__eyebrow">{String(index + 1).padStart(2, '0')} — {section.label}</p>
          <Heading
            id={`about-narrative-${section.id}-title`}
            className="about-narrative-spatial-title"
            aria-label={section.copy}
            data-primary-copy
          >
            {fragments.map((fragment, fragmentIndex) => (
              <span
                key={fragment}
                className="about-narrative-spatial-fragment"
                data-spatial-fragment
                data-fragment-index={fragmentIndex}
                aria-hidden="true"
              >
                {fragment}{' '}
              </span>
            ))}
          </Heading>
          {section.support?.map((paragraph) => (
            <p key={paragraph} className="about-narrative-spatial-support" data-primary-copy>{paragraph}</p>
          ))}
          {children}
        </div>
      </div>
    </section>
  );
}

function EditorialSection({ section, index, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--editorial"
      data-narrative-section={section.id}
      data-section-index={index}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-editorial-inner">
        <p className="about-narrative-section__eyebrow" data-editorial-line>
          {String(index + 1).padStart(2, '0')} — {section.label}
        </p>
        <h2 id={`about-narrative-${section.id}-title`} className="about-narrative-editorial-title" data-editorial-line>
          {section.label}
        </h2>
        {section.paragraphs.map((paragraph) => (
          <p key={paragraph} className="about-narrative-editorial-copy" data-editorial-line data-primary-copy>{paragraph}</p>
        ))}
        {section.clients ? (
          <ul className="about-narrative-client-ledger" aria-label="Selected client context" data-editorial-line>
            {section.clients.map((client) => <li key={client}>{client}</li>)}
          </ul>
        ) : null}
      </div>
    </section>
  );
}

function CabinetSection({ section, index, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--cabinet"
      data-narrative-section={section.id}
      data-section-index={index}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-editorial-inner">
        <p className="about-narrative-section__eyebrow" data-editorial-line>
          {String(index + 1).padStart(2, '0')} — {section.label}
        </p>
        <h2 id={`about-narrative-${section.id}-title`} className="about-narrative-editorial-title" data-editorial-line>
          Curiosity stays practical.
        </h2>
        <div className="about-narrative-cabinet-grid">
          {section.items.map((item, itemIndex) => (
            <article key={item.title} className="about-narrative-cabinet-item" data-editorial-line>
              <span className="about-narrative-cabinet-index" aria-hidden="true">{String(itemIndex + 1).padStart(2, '0')}</span>
              <h3>{item.title}</h3>
              <p>{item.caption}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionIndicator({ activeIndex }) {
  const section = ABOUT_NARRATIVE_SECTIONS[activeIndex] || ABOUT_NARRATIVE_SECTIONS[0];
  return (
    <div className="about-narrative-indicator" aria-live="polite" aria-atomic="true">
      <span>{String(activeIndex + 1).padStart(2, '0')} / {String(ABOUT_NARRATIVE_SECTIONS.length).padStart(2, '0')}</span>
      <span aria-hidden="true">—</span>
      <strong>{section.label}</strong>
    </div>
  );
}

function formatControlValue(control, value) {
  const decimals = control.step < 0.1 ? 2 : control.step < 1 ? 1 : 0;
  return `${Number(value).toFixed(decimals)}${control.suffix || ''}`;
}

function NarrativeControls({ settings, onChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState('idle');
  const [openGroups, setOpenGroups] = useState(() => new Set(['motion']));
  const launcherRef = useRef(null);
  const closeButtonRef = useRef(null);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      hasOpenedRef.current = true;
      closeButtonRef.current?.focus();
    } else if (hasOpenedRef.current) {
      launcherRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleCopy = useCallback(async () => {
    const copied = await copyText(JSON.stringify(settings, null, 2));
    setCopyState(copied ? 'copied' : 'error');
    window.setTimeout(() => setCopyState('idle'), 1600);
  }, [settings]);

  return createPortal((
    <div className={`about-narrative-controls${isOpen ? ' is-open' : ''}`}>
      {!isOpen ? (
        <button
          ref={launcherRef}
          type="button"
          className="about-narrative-controls__launcher"
          aria-expanded="false"
          aria-controls="about-narrative-parameterizer"
          onClick={() => setIsOpen(true)}
        >
          <i className="ti ti-adjustments-horizontal" aria-hidden="true" />
          <span>Parameters</span>
        </button>
      ) : (
        <aside id="about-narrative-parameterizer" className="parameterizer-panel" aria-label="About narrative parameters">
          <header className="parameterizer-header">
            <span>About narrative</span>
            <button ref={closeButtonRef} type="button" aria-label="Close parameters" onClick={() => setIsOpen(false)}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </header>
          <div className="parameterizer-scroll">
            {ABOUT_NARRATIVE_CONTROL_GROUPS.map((group) => (
              <details
                key={group.id}
                className="parameterizer-folder"
                open={openGroups.has(group.id)}
                onToggle={(event) => {
                  const isExpanded = event.currentTarget.open;
                  setOpenGroups((current) => {
                    const next = new Set(current);
                    if (isExpanded) next.add(group.id);
                    else next.delete(group.id);
                    return next;
                  });
                }}
              >
                <summary className="parameterizer-folder-title">{group.label}</summary>
                {group.controls.map((control) => (
                  <label key={control.id} className="parameterizer-row" title={control.label}>
                    <span className="parameterizer-label">{control.label}</span>
                    <span className="parameterizer-control">
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={settings[control.id]}
                        onChange={(event) => onChange(control.id, Number(event.target.value))}
                      />
                      <output className="parameterizer-value">{formatControlValue(control, settings[control.id])}</output>
                    </span>
                  </label>
                ))}
              </details>
            ))}
          </div>
          <div className="parameterizer-actions">
            <button type="button" onClick={onReset}>Reset</button>
            <button type="button" onClick={handleCopy}>
              {copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy JSON'}
            </button>
          </div>
        </aside>
      )}
    </div>
  ), document.body);
}

export function AboutNarrativeLabExperience() {
  const [settings, setSettings] = useState(readStoredSettings);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const sectionRefs = useRef([]);
  const backgroundRefs = useRef([]);

  const activeSectionIndex = useAboutNarrativeScroll({
    settings,
    sectionData: ABOUT_NARRATIVE_SECTIONS,
    scrollportRef,
    contentRef,
    sectionRefs,
    backgroundRefs,
  });

  const rootStyle = useMemo(() => ({
    '--about-reading-width': `${settings.readingWidth}rem`,
    '--about-opener-height-desktop': `${240 * settings.spatialLength}svh`,
    '--about-spatial-height-desktop': `${200 * settings.spatialLength}svh`,
    '--about-closing-height-desktop': `${220 * settings.spatialLength}svh`,
    '--about-opener-height-mobile': `${190 * settings.spatialLength}svh`,
    '--about-spatial-height-mobile': `${175 * settings.spatialLength}svh`,
    '--about-closing-height-mobile': `${185 * settings.spatialLength}svh`,
  }), [settings]);

  const handleSettingChange = useCallback((key, value) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      window.localStorage.setItem(ABOUT_NARRATIVE_SETTINGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    const next = { ...ABOUT_NARRATIVE_DEFAULT_SETTINGS };
    window.localStorage.removeItem(ABOUT_NARRATIVE_SETTINGS_KEY);
    setSettings(next);
  }, []);

  return (
    <div className="about-narrative-lab" data-route-content="about-narrative-lab" style={rootStyle}>
      <div className="about-narrative-background" aria-hidden="true">
        {ABOUT_NARRATIVE_BACKGROUNDS.map((stage, index) => (
          <BackgroundStage
            key={stage.id}
            stage={stage}
            index={index}
            stageRef={(node) => { backgroundRefs.current[index] = node; }}
          />
        ))}
        <div className="about-narrative-background__scrim" />
      </div>

      <div ref={scrollportRef} className="about-narrative-scrollport" data-lenis-prevent-touch>
        <main ref={contentRef} className="about-narrative-content">
          {ABOUT_NARRATIVE_SECTIONS.map((section, index) => {
            const sectionRef = (node) => { sectionRefs.current[index] = node; };
            if (section.type === 'spatial') {
              return (
                <SpatialSection key={section.id} section={section} index={index} sectionRef={sectionRef}>
                  {section.variant === 'closing' ? (
                    <nav className="about-narrative-cta" aria-label="Contact Alexander">
                      <a href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}>Email me</a>
                      <a href={ABOUT_NARRATIVE_CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
                    </nav>
                  ) : null}
                </SpatialSection>
              );
            }
            if (section.type === 'cabinet') {
              return <CabinetSection key={section.id} section={section} index={index} sectionRef={sectionRef} />;
            }
            return <EditorialSection key={section.id} section={section} index={index} sectionRef={sectionRef} />;
          })}
        </main>
      </div>

      <SectionIndicator activeIndex={activeSectionIndex} />
      <NarrativeControls settings={settings} onChange={handleSettingChange} onReset={handleReset} />
    </div>
  );
}
