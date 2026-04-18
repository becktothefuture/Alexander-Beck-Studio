import { startTransition, useEffect, useEffectEvent, useRef, useState } from 'react';

const DOWNLOAD_HREF = '/downloads/explain-it-like-im.md';
const DOWNLOAD_FILENAME = 'explain-it-like-im.md';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'format', label: 'Format' },
  { id: 'demo', label: 'Demo' },
  { id: 'office', label: 'Office Test' },
  { id: 'download', label: 'Download' },
];

const FORMAT_STEPS = [
  {
    age: '4',
    title: 'Tiny and true',
    copy: 'The first line now has one job: land the core idea fast, without any jargon spill.',
  },
  {
    age: '7',
    title: 'One more moving part',
    copy: 'Keep the same mental picture, then add the next causal step in plain language.',
  },
  {
    age: '12',
    title: 'Mechanism time',
    copy: 'Swap in the real process, define the useful term, and make the structure visible.',
  },
  {
    age: '16',
    title: 'Nuance without fog',
    copy: 'Finish with the clean adult explanation, plus tradeoffs or edge cases when they matter.',
  },
];

const DEMO_BANDS = [
  {
    age: '4',
    copy: 'A surplus means the office still has extra money left.',
  },
  {
    age: '7',
    copy: 'A surplus is money left over after the office buys what it already needed.',
  },
  {
    age: '12',
    copy: 'A budget surplus happens when spending ends up lower than the money set aside, so some of the budget stays unspent.',
  },
  {
    age: '16',
    copy: 'A surplus is the positive remainder after expenses. In organizations, that can create tension because unused budget may be cut in the next cycle.',
  },
];

const OFFICE_CHECKS = [
  'Starts with a tiny answer before the room gets defensive.',
  'Keeps one stable metaphor instead of changing lanes every paragraph.',
  'Gets smart enough for Oscar without losing Michael on line one.',
  'Ships as plain Markdown, so it is easy to edit, store, and version.',
];

const TRUST_MARKS = [
  'Free',
  'Plain .md',
  'No signup',
  'Human-editable',
];

function getClosestElement(elements, targetTop) {
  let closest = null;
  let smallestDistance = Number.POSITIVE_INFINITY;

  elements.forEach((element) => {
    const distance = Math.abs(element.offsetTop - targetTop);
    if (distance < smallestDistance) {
      smallestDistance = distance;
      closest = element;
    }
  });

  return closest;
}

function setImmediateScrollTop(scrollport, top) {
  const previousScrollBehavior = scrollport.style.scrollBehavior;
  scrollport.style.scrollBehavior = 'auto';
  scrollport.scrollTop = top;
  scrollport.getBoundingClientRect();
  scrollport.style.scrollBehavior = previousScrollBehavior;
}

function JumpAction({ interactive, className, onClick, children }) {
  if (!interactive) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

function DownloadAction({ interactive, className, children }) {
  if (!interactive) {
    return (
      <span className={className} aria-hidden="true">
        {children}
      </span>
    );
  }

  return (
    <a className={className} href={DOWNLOAD_HREF} download={DOWNLOAD_FILENAME}>
      {children}
    </a>
  );
}

function LoopSegment({ segmentIndex, interactive, onJump }) {
  return (
    <article
      className={`eli5-segment${interactive ? '' : ' is-clone'}`}
      data-loop-segment={segmentIndex}
      aria-hidden={interactive ? undefined : 'true'}
    >
      <section className="eli5-panel eli5-hero" data-loop-section="overview">
        <div className="eli5-hero__copy">
          <div className="eli5-chip-row">
            <span className="eli5-chip eli5-chip--accent">Free skill</span>
            <span className="eli5-chip">Inspired by "The Surplus" (S5E10)</span>
          </div>
          <p className="eli5-kicker">For every Michael Scott moment in the room</p>
          <h1 className="eli5-hero__title">Explain It Like Im</h1>
          <p className="eli5-hero__lede">
            The format now starts at <code>4:</code>, then grows through <code>7:</code>, <code>12:</code>, and <code>16:</code> so the very first explanation lands fast and the later ones get smarter on purpose.
          </p>
          <p className="eli5-hero__support">
            It is built for the exact office situation where a concept starts sounding too Oscar, somebody panics, and the room needs the short version before it can handle the good version.
          </p>
          <div className="eli5-hero__actions">
            <JumpAction
              interactive={interactive}
              className="eli5-button eli5-button--primary"
              onClick={() => onJump('format')}
            >
              See the new format
            </JumpAction>
            <DownloadAction interactive={interactive} className="eli5-button eli5-button--ghost">
              Download the .md
            </DownloadAction>
          </div>
        </div>

        <div className="eli5-hero__visual">
          <div className="eli5-quote-note">
            <span className="eli5-quote-note__pin" aria-hidden="true" />
            <p className="eli5-quote-note__line">"Explain this to me like I&apos;m five."</p>
            <p className="eli5-quote-note__line eli5-quote-note__line--reply">"I&apos;ll be six."</p>
            <p className="eli5-quote-note__meta">Michael Scott, Dunder Mifflin budget panic mode.</p>
          </div>

          <div className="eli5-age-stack" aria-hidden="true">
            {FORMAT_STEPS.map((step) => (
              <article key={step.age} className={`eli5-age-card eli5-age-card--${step.age}`}>
                <p className="eli5-age-card__age">{step.age}:</p>
                <h2 className="eli5-age-card__title">{step.title}</h2>
                <p className="eli5-age-card__copy">{step.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="eli5-panel eli5-format-panel" data-loop-section="format">
        <div className="eli5-section-heading">
          <p className="eli5-kicker">Formatting update</p>
          <h2 className="eli5-section-title">Short first, then progressively more capable.</h2>
          <p className="eli5-section-copy">
            The output now reads like a clean office note, not a stack of mini essays. Each line starts with the age band label and gets a little more capable than the one before it.
          </p>
        </div>

        <div className="eli5-format-grid">
          {FORMAT_STEPS.map((step) => (
            <article key={step.age} className="eli5-step-card">
              <p className="eli5-step-card__age">{step.age}:</p>
              <h3 className="eli5-step-card__title">{step.title}</h3>
              <p className="eli5-step-card__copy">{step.copy}</p>
            </article>
          ))}
        </div>

        <div className="eli5-format-note">
          <p className="eli5-format-note__label">Default shape</p>
          <p className="eli5-format-note__text">
            <code>4:</code> one short sentence. <code>7:</code> one more causal step. <code>12:</code> the real mechanism. <code>16:</code> nuance without jargon soup.
          </p>
        </div>
      </section>

      <section className="eli5-panel eli5-demo-panel" data-loop-section="demo">
        <div className="eli5-demo-layout">
          <div className="eli5-demo-card">
            <p className="eli5-kicker">Live sample</p>
            <h2 className="eli5-section-title">The budget surplus test.</h2>
            <p className="eli5-section-copy">
              The Office made this kind of explanation famous, so the promo page uses the same office-budget tension to show how the new ladder behaves in practice.
            </p>

            <div className="eli5-demo-stack">
              {DEMO_BANDS.map((band) => (
                <div key={band.age} className="eli5-demo-band">
                  <p className="eli5-demo-band__age">{band.age}:</p>
                  <p className="eli5-demo-band__copy">{band.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <aside className="eli5-rubric-card">
            <p className="eli5-rubric-card__label">What changed</p>
            <ul className="eli5-checklist">
              <li>The first line is now tiny on purpose.</li>
              <li>Each later line adds one real layer instead of padding.</li>
              <li>The final line can stay intelligent without turning smug.</li>
            </ul>
          </aside>
        </div>
      </section>

      <section className="eli5-panel eli5-office-panel" data-loop-section="office">
        <div className="eli5-office-layout">
          <article className="eli5-memo-card">
            <p className="eli5-kicker">Michael Scott compatibility report</p>
            <h2 className="eli5-section-title">Why someone like Michael would love this page.</h2>
            <p className="eli5-section-copy">
              It feels fun, fast, office-y, and a little chaotic, but the logic is tidy underneath. That is the whole trick: playful surface, reliable explanation ladder.
            </p>
            <ul className="eli5-checklist">
              {OFFICE_CHECKS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="eli5-scorecard">
            <p className="eli5-scorecard__label">Conference room scorecard</p>
            <div className="eli5-score-row">
              <span className="eli5-score-row__name">Fun</span>
              <strong className="eli5-score-row__value">High</strong>
            </div>
            <div className="eli5-score-row">
              <span className="eli5-score-row__name">Clarity</span>
              <strong className="eli5-score-row__value">Higher</strong>
            </div>
            <div className="eli5-score-row">
              <span className="eli5-score-row__name">Buzzword risk</span>
              <strong className="eli5-score-row__value">Low</strong>
            </div>
            <div className="eli5-score-row">
              <span className="eli5-score-row__name">Management approval</span>
              <strong className="eli5-score-row__value">Stamped</strong>
            </div>
            <div className="eli5-stamp" aria-hidden="true">APPROVED</div>
          </article>
        </div>
      </section>

      <section className="eli5-panel eli5-download-panel" data-loop-section="download">
        <div className="eli5-download-card">
          <p className="eli5-kicker">Huge call to action, still trustworthy</p>
          <h2 className="eli5-download-card__title">Download the skill as Markdown and use it immediately.</h2>
          <p className="eli5-download-card__copy">
            No login wall. No surprise zip. No weird portal. Just the actual <code>.md</code> file, ready to drop into your skills folder or edit however you want.
          </p>

          <DownloadAction interactive={interactive} className="eli5-download-button">
            Download explain-it-like-im.md
          </DownloadAction>

          <div className="eli5-trust-row" aria-label="Download trust notes">
            {TRUST_MARKS.map((mark) => (
              <span key={mark} className="eli5-trust-pill">
                {mark}
              </span>
            ))}
          </div>

          <p className="eli5-loop-note">
            Keep scrolling. Before the page ever feels finished, it quietly starts again.
          </p>
        </div>
      </section>
    </article>
  );
}

export function ExplainItLikeImPage() {
  const scrollportRef = useRef(null);
  const segmentHeightRef = useRef(0);
  const reduceMotionRef = useRef(false);
  const [activeSection, setActiveSection] = useState(NAV_ITEMS[0].id);
  const [loopReady, setLoopReady] = useState(false);

  const updateMotionPreference = useEffectEvent(() => {
    reduceMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    updateMotionPreference();
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => updateMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const updateActiveSection = useEffectEvent(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    const focusLine = scrollport.scrollTop + scrollport.clientHeight * 0.26;
    const sections = Array.from(scrollport.querySelectorAll('[data-loop-section]'));
    const closest = getClosestElement(sections, focusLine);
    const nextSection = closest?.dataset.loopSection || NAV_ITEMS[0].id;

    startTransition(() => {
      setActiveSection((current) => (current === nextSection ? current : nextSection));
    });
  });

  const syncLoopPosition = useEffectEvent((preserveOffset) => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    const middleSegment = scrollport.querySelector('[data-loop-segment="1"]');
    if (!middleSegment) return;

    const nextHeight = middleSegment.offsetHeight;
    if (!nextHeight) return;

    const previousHeight = segmentHeightRef.current;
    segmentHeightRef.current = nextHeight;

    if (!loopReady) {
      setImmediateScrollTop(scrollport, nextHeight);
      setLoopReady(true);
      updateActiveSection();
      return;
    }

    if (!preserveOffset || !previousHeight) {
      updateActiveSection();
      return;
    }

    const currentOffset = scrollport.scrollTop - previousHeight;
    const normalizedOffset = ((currentOffset % previousHeight) + previousHeight) % previousHeight;
    const maxOffset = Math.max(nextHeight - scrollport.clientHeight, 0);
    setImmediateScrollTop(scrollport, nextHeight + Math.min(normalizedOffset, maxOffset));
    updateActiveSection();
  });

  useEffect(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return undefined;

    const middleSegment = scrollport.querySelector('[data-loop-segment="1"]');
    if (!middleSegment) return undefined;

    let resizeFrame = 0;
    const handleResize = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        syncLoopPosition(true);
      });
    };

    const resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => handleResize())
      : null;

    resizeObserver?.observe(middleSegment);
    window.addEventListener('resize', handleResize);

    const readyFrame = window.requestAnimationFrame(() => {
      syncLoopPosition(false);
    });

    return () => {
      window.cancelAnimationFrame(readyFrame);
      if (resizeFrame) {
        window.cancelAnimationFrame(resizeFrame);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleLoopScroll = useEffectEvent(() => {
    const scrollport = scrollportRef.current;
    const segmentHeight = segmentHeightRef.current;
    if (!scrollport || !segmentHeight) return;

    // Keep three copies of the same page and recenter in the middle copy
    // before the user ever reaches a visible seam.
    if (scrollport.scrollTop < segmentHeight * 0.5) {
      setImmediateScrollTop(scrollport, scrollport.scrollTop + segmentHeight);
    } else if (scrollport.scrollTop >= segmentHeight * 2) {
      setImmediateScrollTop(scrollport, scrollport.scrollTop - segmentHeight);
    }

    updateActiveSection();
  });

  useEffect(() => {
    const scrollport = scrollportRef.current;
    if (!scrollport) return undefined;

    let scrollFrame = 0;
    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        handleLoopScroll();
      });
    };

    scrollport.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      if (scrollFrame) {
        window.cancelAnimationFrame(scrollFrame);
      }
      scrollport.removeEventListener('scroll', onScroll);
    };
  }, []);

  function jumpToSection(sectionId) {
    const scrollport = scrollportRef.current;
    if (!scrollport) return;

    const candidates = Array.from(
      scrollport.querySelectorAll(`[data-loop-section="${sectionId}"]`)
    );
    const focusLine = scrollport.scrollTop + scrollport.clientHeight * 0.18;
    const closest = getClosestElement(candidates, focusLine);

    if (!closest) return;

    const nextTop = Math.max(closest.offsetTop - scrollport.clientHeight * 0.08, 0);
    scrollport.scrollTo({
      top: nextTop,
      behavior: reduceMotionRef.current ? 'auto' : 'smooth',
    });
  }

  return (
    <div className="eli5-site">
      <header className="eli5-nav-shell">
        <div className="eli5-nav">
          <button type="button" className="eli5-brand" onClick={() => jumpToSection('overview')}>
            <span className="eli5-brand__eyebrow">Free skill</span>
            <span className="eli5-brand__name">Explain It Like Im</span>
          </button>

          <nav className="eli5-nav__links" aria-label="Explain It Like Im sections">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`eli5-nav__link${activeSection === item.id ? ' is-active' : ''}`}
                aria-current={activeSection === item.id ? 'true' : undefined}
                onClick={() => jumpToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <a className="eli5-nav__download" href={DOWNLOAD_HREF} download={DOWNLOAD_FILENAME}>
            Get the .md
          </a>
        </div>
      </header>

      <main
        ref={scrollportRef}
        className={`eli5-scrollport${loopReady ? ' is-ready' : ''}`}
        aria-label="Explain It Like Im promotional website"
      >
        <div className="eli5-loop-track">
          {[0, 1, 2].map((segmentIndex) => (
            <LoopSegment
              key={segmentIndex}
              segmentIndex={segmentIndex}
              interactive={segmentIndex === 1}
              onJump={jumpToSection}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
