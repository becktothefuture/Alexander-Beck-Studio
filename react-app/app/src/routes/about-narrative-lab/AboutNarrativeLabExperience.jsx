import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ABOUT_NARRATIVE_CONTACT,
  ABOUT_NARRATIVE_CONTROL_GROUPS,
  ABOUT_NARRATIVE_DEFAULT_SETTINGS,
  ABOUT_NARRATIVE_SECTIONS,
  ABOUT_NARRATIVE_SETTINGS_KEY,
} from './aboutNarrativeLabData.js';
import { AboutNarrativeWorld } from './AboutNarrativeWorld.jsx';
import { useAboutNarrativeScroll } from './useAboutNarrativeScroll.js';
import './about-narrative-lab.css';

const INLINE_STUDY_POINTS = Object.freeze(Array.from({ length: 36 }, (_, index) => ({
  id: index,
  x: ((index * 37) % 101) / 100,
  y: ((index * 61) % 97) / 96,
  delay: (index % 9) * -0.18,
})));

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

function OpeningSection({ section, index, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--opening"
      data-narrative-section={section.id}
      data-section-index={index}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-opening-inner">
        <h1 id={`about-narrative-${section.id}-title`} data-editorial-line data-primary-copy>
          {section.copy}
        </h1>
      </div>
    </section>
  );
}

function SpatialSection({ section, index, sectionRef }) {
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
        </div>
      </div>
    </section>
  );
}

function InlinePointStudy() {
  return (
    <figure className="about-narrative-inline-study" data-editorial-line aria-label="Points repeatedly reorganise around one emerging relationship.">
      <div className="about-narrative-inline-study__field" aria-hidden="true">
        {INLINE_STUDY_POINTS.map((point) => (
          <span
            key={point.id}
            style={{
              '--study-x': point.x,
              '--study-y': point.y,
              '--study-dx': `${(0.5 - point.x) * 88}px`,
              '--study-dy': `${(0.5 - point.y) * 40}px`,
              '--study-delay': `${point.delay}s`,
            }}
          />
        ))}
      </div>
      <figcaption>Attention changes the field before it changes the answer.</figcaption>
    </figure>
  );
}

function EditorialSection({ section, index, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className={`about-narrative-section about-narrative-section--editorial${section.variant ? ` about-narrative-section--${section.variant}` : ''}`}
      data-narrative-section={section.id}
      data-section-index={index}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-editorial-inner">
        <h2 id={`about-narrative-${section.id}-title`} className="about-narrative-visually-hidden">
          {section.label}
        </h2>
        {section.prose?.map((paragraph) => (
          <p
            key={paragraph.text}
            className={`about-narrative-editorial-copy${paragraph.emphasis ? ' is-highlighted' : ''}`}
            data-editorial-line
            data-primary-copy
          >
            {paragraph.text}
          </p>
        ))}
        {section.inlineVisual === 'attention-field' ? <InlinePointStudy /> : null}
        {section.details?.map((paragraph) => (
          <p key={paragraph} className="about-narrative-editorial-detail" data-editorial-line>{paragraph}</p>
        ))}
        {section.contact ? (
          <nav className="about-narrative-cta about-narrative-cta--editorial" aria-label="Contact Alexander" data-editorial-line>
            <a href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}>Email me</a>
            <a href={ABOUT_NARRATIVE_CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
          </nav>
        ) : null}
      </div>
    </section>
  );
}

function FinaleSection({ section, index, sectionRef }) {
  return (
    <section
      ref={sectionRef}
      id={`about-narrative-${section.id}`}
      className="about-narrative-section about-narrative-section--spatial about-narrative-section--closing about-narrative-section--finale"
      data-narrative-section={section.id}
      data-section-index={index}
      aria-labelledby={`about-narrative-${section.id}-title`}
    >
      <div className="about-narrative-spatial-stage about-narrative-finale-stage">
        <div className="about-narrative-spatial-copy about-narrative-finale-copy">
          <h2
            id={`about-narrative-${section.id}-title`}
            className="about-narrative-spatial-title"
            aria-label={section.copy}
            data-primary-copy
          >
            {section.fragments.map((fragment, fragmentIndex) => (
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
          </h2>
          <div className="about-narrative-finale-cta">
            <p>{section.cta}</p>
            <nav className="about-narrative-cta" aria-label="Contact Alexander">
              <a href={`mailto:${ABOUT_NARRATIVE_CONTACT.email}`}>Start a conversation</a>
              <a href={ABOUT_NARRATIVE_CONTACT.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionIndicator({ activeIndex }) {
  return (
    <div
      className="about-narrative-indicator"
      aria-label={`Section ${activeIndex + 1} of ${ABOUT_NARRATIVE_SECTIONS.length}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span>{String(activeIndex + 1).padStart(2, '0')} / {String(ABOUT_NARRATIVE_SECTIONS.length).padStart(2, '0')}</span>
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
  const rootRef = useRef(null);
  const scrollportRef = useRef(null);
  const contentRef = useRef(null);
  const sectionRefs = useRef([]);

  const activeSectionIndex = useAboutNarrativeScroll({
    settings,
    sectionData: ABOUT_NARRATIVE_SECTIONS,
    scrollportRef,
    contentRef,
    sectionRefs,
  });

  const rootStyle = useMemo(() => ({
    '--about-reading-width': `${settings.readingWidth}rem`,
    '--about-spatial-height-desktop': `${200 * settings.spatialLength}svh`,
    '--about-closing-height-desktop': `${220 * settings.spatialLength}svh`,
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
    <div ref={rootRef} className="about-narrative-lab" data-route-content="about-narrative-lab" style={rootStyle}>
      <AboutNarrativeWorld
        rendererId="procedural-points-v1"
        rootRef={rootRef}
        scrollportRef={scrollportRef}
        settings={settings}
      />

      <div
        ref={scrollportRef}
        className="about-narrative-scrollport"
        data-lenis-prevent-touch
        tabIndex={0}
        aria-label="About Alexander narrative"
      >
        <main ref={contentRef} className="about-narrative-content">
          {ABOUT_NARRATIVE_SECTIONS.map((section, index) => {
            const sectionRef = (node) => { sectionRefs.current[index] = node; };
            if (section.type === 'opening') {
              return <OpeningSection key={section.id} section={section} index={index} sectionRef={sectionRef} />;
            }
            if (section.type === 'spatial') {
              return (
                <SpatialSection key={section.id} section={section} index={index} sectionRef={sectionRef} />
              );
            }
            if (section.type === 'constellation') {
              return <SpatialSection key={section.id} section={section} index={index} sectionRef={sectionRef} />;
            }
            if (section.type === 'finale') {
              return <FinaleSection key={section.id} section={section} index={index} sectionRef={sectionRef} />;
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
