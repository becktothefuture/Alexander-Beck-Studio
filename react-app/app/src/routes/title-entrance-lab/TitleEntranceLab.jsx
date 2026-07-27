import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import homeContent from 'virtual:abs-content/home';
import { HOME_IDENTITY } from '../../lib/home-identity.js';
import './title-entrance-lab.css';

const TITLE_DURATION_MS = 560;
const LETTER_STEP_MS = 26;
const SUBTITLE_GAP_MS = 140;
const SUBTITLE_DURATION_MS = 480;
const VIEW_OUT_MS = 160;
const VIEW_IN_MS = 230;
const VIEW_EASING = 'cubic-bezier(0.22, 0, 0.16, 1)';

const ROUTE_STUDIES = Object.freeze([
  {
    id: 'home',
    label: 'Home',
    accent: '#00695c',
    titleLines: [HOME_IDENTITY.name, ...HOME_IDENTITY.roleLines],
    subtitle: homeContent.edge?.tagline
      || 'A London-based design practice shaping products, interfaces, and interactive moments.',
  },
  {
    id: 'portfolio',
    label: 'Work',
    accent: '#d7ff2f',
    titleLines: [homeContent.portfolio?.heroLines?.[0] || 'Work'],
    subtitle: homeContent.portfolio?.blurb
      || 'Selected projects from early concepts to shipped websites, apps, tools, and platforms.',
  },
  {
    id: 'about',
    label: 'About Me',
    accent: '#0d5cb6',
    titleLines: ['About Me'],
    subtitle: 'I’ve always been drawn to the complicated bit.',
  },
  {
    id: 'contact',
    label: 'Contact',
    accent: '#ffa000',
    titleLines: [homeContent.contact?.title || "Let’s talk"],
    subtitle: homeContent.contact?.description
      || 'If you’re building something that needs design, technology and AI to move together, send me a note.',
  },
]);

function getGlyphCount(lines) {
  return lines.reduce((count, line) => count + Array.from(line).length, 0);
}

function AnimatedTitle({ study, playing, onTitleComplete }) {
  let glyphIndex = 0;
  const glyphCount = getGlyphCount(study.titleLines);
  const titleText = study.titleLines.join(' ');

  return (
    <h1 className="title-entrance-specimen__title" aria-label={titleText}>
      <span className="screen-reader">{titleText}</span>
      <span aria-hidden="true">
        {study.titleLines.map((line, lineIndex) => (
          <span key={`${study.id}-${line}`} className="title-entrance-specimen__line">
            {Array.from(line).map((glyph) => {
              const index = glyphIndex;
              const isLastGlyph = index === glyphCount - 1;
              glyphIndex += 1;
              return (
                <span
                  key={`${lineIndex}-${index}-${glyph}`}
                  className="title-entrance-specimen__glyph"
                  style={{ '--glyph-index': index }}
                  onAnimationEnd={isLastGlyph && playing ? onTitleComplete : undefined}
                >
                  {glyph === ' ' ? '\u00a0' : glyph}
                </span>
              );
            })}
          </span>
        ))}
      </span>
    </h1>
  );
}

function PhaseReadout({ phase }) {
  const phases = [
    ['transition', 'View transition'],
    ['title', 'Title'],
    ['subtitle', 'Subtitle'],
  ];
  const phaseIndex = phases.findIndex(([id]) => id === phase);
  const completed = phase === 'complete';

  return (
    <ol className="title-entrance-lab__timeline" aria-label="Entrance sequence status">
      {phases.map(([id, label], index) => (
        <li
          key={id}
          className={[
            id === phase ? 'is-active' : '',
            completed || phaseIndex > index ? 'is-complete' : '',
          ].filter(Boolean).join(' ')}
        >
          <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

export function TitleEntranceLab() {
  const [activeId, setActiveId] = useState('home');
  const [phase, setPhase] = useState('transition');
  const [sequenceKey, setSequenceKey] = useState(0);
  const stageRef = useRef(null);
  const transactionRef = useRef(0);
  const study = ROUTE_STUDIES.find((item) => item.id === activeId) || ROUTE_STUDIES[0];
  const glyphCount = getGlyphCount(study.titleLines);
  const subtitleDelay = ((glyphCount - 1) * LETTER_STEP_MS) + TITLE_DURATION_MS + SUBTITLE_GAP_MS;
  const playing = phase !== 'transition';

  const timingStyle = useMemo(() => ({
    '--study-accent': study.accent,
    '--title-duration': `${TITLE_DURATION_MS}ms`,
    '--letter-step': `${LETTER_STEP_MS}ms`,
    '--subtitle-delay': `${subtitleDelay}ms`,
    '--subtitle-duration': `${SUBTITLE_DURATION_MS}ms`,
  }), [study, subtitleDelay]);

  const runTransition = useCallback(async (nextId) => {
    const stage = stageRef.current;
    const transaction = transactionRef.current + 1;
    transactionRef.current = transaction;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    setPhase('transition');
    if (!reducedMotion && stage?.animate) {
      const exitAnimation = stage.animate(
        [
          { opacity: 1, filter: 'blur(0)' },
          { opacity: 0, filter: 'blur(3px)' },
        ],
        { duration: VIEW_OUT_MS, easing: VIEW_EASING, fill: 'forwards' },
      );
      await exitAnimation.finished.catch(() => undefined);
      stage.style.opacity = '0';
      stage.style.filter = 'blur(3px)';
      exitAnimation.cancel();
    }
    if (transactionRef.current !== transaction) return;

    flushSync(() => {
      setPhase('transition');
      setActiveId(nextId);
      setSequenceKey((key) => key + 1);
    });

    if (!reducedMotion && stage?.animate) {
      const enterAnimation = stage.animate(
        [
          { opacity: 0, filter: 'blur(3px)' },
          { opacity: 1, filter: 'blur(0)' },
        ],
        { duration: VIEW_IN_MS, easing: VIEW_EASING, fill: 'forwards' },
      );
      await enterAnimation.finished.catch(() => undefined);
      stage.style.opacity = '1';
      stage.style.filter = 'blur(0)';
      enterAnimation.cancel();
    }
    if (transactionRef.current !== transaction) return;

    if (stage) {
      stage.style.removeProperty('opacity');
      stage.style.removeProperty('filter');
    }
    setPhase(reducedMotion ? 'complete' : 'title');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const begin = async () => {
      await document.fonts?.ready;
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      if (!cancelled) void runTransition('home');
    };
    void begin();
    return () => {
      cancelled = true;
      transactionRef.current += 1;
    };
  }, [runTransition]);

  const handleRouteSelect = (routeId) => {
    if (phase === 'transition' || routeId === activeId) return;
    void runTransition(routeId);
  };

  const handleTitleComplete = () => {
    setPhase((currentPhase) => (currentPhase === 'title' ? 'subtitle' : currentPhase));
  };
  const handleSubtitleComplete = () => {
    setPhase((currentPhase) => (currentPhase === 'subtitle' ? 'complete' : currentPhase));
  };

  return (
    <main className="title-entrance-lab" style={timingStyle}>
      <header className="title-entrance-lab__header">
        <div>
          <p className="title-entrance-lab__eyebrow">Motion study / route identity</p>
          <h2>Uncropped entrance</h2>
        </div>
        <p>
          The view settles first. Then each letter drifts gently in from the left and resolves
          using only position, blur, and opacity. Supporting copy waits for the title to finish.
        </p>
      </header>

      <section className="title-entrance-lab__workbench" aria-label="Route title animation study">
        <div className="title-entrance-lab__controls">
          <nav aria-label="Choose a route title">
            {ROUTE_STUDIES.map((route) => (
              <button
                key={route.id}
                type="button"
                className={route.id === activeId ? 'is-active' : ''}
                aria-pressed={route.id === activeId}
                disabled={phase === 'transition'}
                onClick={() => handleRouteSelect(route.id)}
              >
                <span aria-hidden="true" style={{ background: route.accent }} />
                {route.label}
              </button>
            ))}
          </nav>

          <div className="title-entrance-lab__sequence-controls">
            <PhaseReadout phase={phase} />
            <button
              type="button"
              className="title-entrance-lab__replay"
              disabled={phase === 'transition'}
              onClick={() => void runTransition(activeId)}
            >
              Replay full sequence
            </button>
          </div>
        </div>

        <div className="title-entrance-lab__frame" aria-live="polite">
          <div className="title-entrance-lab__frame-labels" aria-hidden="true">
            <span>{study.label}</span>
            <span>{phase === 'complete' ? 'Settled' : phase}</span>
          </div>

          <div ref={stageRef} className="title-entrance-lab__stage">
            <div
              key={`${activeId}-${sequenceKey}`}
              className={[
                'title-entrance-specimen',
                playing ? 'is-playing' : '',
                phase === 'complete' ? 'is-complete' : '',
              ].filter(Boolean).join(' ')}
            >
              <AnimatedTitle
                study={study}
                playing={playing}
                onTitleComplete={handleTitleComplete}
              />
              <p
                className="title-entrance-specimen__subtitle"
                onAnimationEnd={playing ? handleSubtitleComplete : undefined}
              >
                {study.subtitle}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="title-entrance-lab__notes">
        <p><span>26ms</span> letter interval</p>
        <p><span>560ms</span> letter resolve</p>
        <p><span>140ms</span> title-to-subtitle pause</p>
        <p><span>0</span> clipping masks</p>
      </footer>
    </main>
  );
}
