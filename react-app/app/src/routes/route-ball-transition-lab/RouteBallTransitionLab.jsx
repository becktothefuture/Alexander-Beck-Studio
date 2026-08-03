import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import './route-ball-transition-lab.css';

const ROUTES = Object.freeze([
  {
    id: 'home',
    label: 'Home',
    color: 'var(--ball-4, #00685d)',
  },
  {
    id: 'portfolio',
    label: 'Work',
    color: 'var(--ball-6, #f04430)',
  },
  {
    id: 'about',
    label: 'About Me',
    color: 'var(--ball-7, #4b9185)',
  },
  {
    id: 'contact',
    label: 'Contact',
    color: 'var(--ball-8, #d99716)',
  },
]);

const ROUTE_BY_ID = Object.freeze(Object.fromEntries(ROUTES.map((route) => [route.id, route])));

const BALL_LAYOUTS = Object.freeze({
  home: {
    home: { x: 18, y: 24, size: 8.4 },
    portfolio: { x: 84, y: 31, size: 6.1 },
    about: { x: 78, y: 77, size: 7.4 },
    contact: { x: 17, y: 78, size: 5.3 },
  },
  portfolio: {
    home: { x: 12, y: 66, size: 5.2 },
    portfolio: { x: 84, y: 23, size: 10.6 },
    about: { x: 76, y: 76, size: 6.2 },
    contact: { x: 27, y: 27, size: 7.1 },
  },
  about: {
    home: { x: 88, y: 76, size: 5.1 },
    portfolio: { x: 20, y: 76, size: 6.4 },
    about: { x: 79, y: 25, size: 11.4 },
    contact: { x: 13, y: 25, size: 5.7 },
  },
  contact: {
    home: { x: 24, y: 23, size: 6.5 },
    portfolio: { x: 88, y: 68, size: 5.6 },
    about: { x: 80, y: 19, size: 5.1 },
    contact: { x: 18, y: 78, size: 10.1 },
  },
});

const PHASES = Object.freeze([
  {
    id: 'focus',
    label: 'Acquire',
    duration: 120,
    note: 'The destination colour is selected from the outgoing field.',
  },
  {
    id: 'fill',
    label: 'Fill',
    duration: 520,
    note: 'That solid ball grows beyond the window diagonal.',
  },
  {
    id: 'exchange',
    label: 'Exchange',
    duration: 90,
    note: 'The route swaps only while the window is fully covered.',
  },
  {
    id: 'release',
    label: 'Release',
    duration: 620,
    note: 'The same colour contracts into its destination position.',
  },
]);

const FOCUS_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const FILL_EASING = 'cubic-bezier(0.72, 0, 0.24, 1)';
const RELEASE_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return undefined;
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function getElementGeometry(element, stage) {
  const elementRect = element.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  return {
    x: elementRect.left - stageRect.left + (elementRect.width / 2),
    y: elementRect.top - stageRect.top + (elementRect.height / 2),
    size: elementRect.width,
  };
}

function getCoverGeometry(stage) {
  const { width, height } = stage.getBoundingClientRect();
  return {
    x: width / 2,
    y: height / 2,
    size: Math.hypot(width, height) * 1.08,
  };
}

function getFocusGeometry(geometry) {
  return { ...geometry, size: geometry.size * 1.12 };
}

function geometryTransform({ x, y, size }) {
  const left = x - (size / 2);
  const top = y - (size / 2);
  return `translate3d(${left}px, ${top}px, 0) scale(${size})`;
}

function setPortalGeometry(element, geometry) {
  if (element) element.style.transform = geometryTransform(geometry);
}

async function animatePortal(element, from, to, options, animations) {
  setPortalGeometry(element, from);
  if (!element?.animate) {
    setPortalGeometry(element, to);
    return true;
  }

  const animation = element.animate(
    [
      { transform: geometryTransform(from) },
      { transform: geometryTransform(to) },
    ],
    { ...options, fill: 'forwards' },
  );
  animations.current.add(animation);
  const completed = await animation.finished.then(() => true, () => false);
  if (completed) setPortalGeometry(element, to);
  animation.cancel();
  animations.current.delete(animation);
  return completed;
}

function wait(duration) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

function HomeComposition() {
  return (
    <div className="route-ball-scene__copy route-ball-scene__copy--home">
      <p className="route-ball-scene__kicker">Multidisciplinary studio</p>
      <h1>
        <span>Alexander Beck</span>
        <span>Product designer</span>
      </h1>
      <p className="route-ball-scene__summary">
        Making useful digital things feel clear, tactile, and alive.
      </p>
    </div>
  );
}

function WorkComposition() {
  return (
    <>
      <div className="route-ball-scene__copy route-ball-scene__copy--work">
        <p className="route-ball-scene__kicker">Selected projects / 2022—26</p>
        <h1>Work</h1>
      </div>
      <div className="route-ball-scene__work-deck" aria-hidden="true">
        <article><span>01</span><strong>City layers</strong></article>
        <article><span>02</span><strong>Material logic</strong></article>
        <article><span>03</span><strong>Open systems</strong></article>
      </div>
    </>
  );
}

function AboutComposition() {
  return (
    <>
      <div className="route-ball-scene__copy route-ball-scene__copy--about">
        <p className="route-ball-scene__kicker">Practice / point of view</p>
        <h1>About Me</h1>
        <p className="route-ball-scene__summary">
          I’m drawn to the complicated bit: where product thinking, interaction, and technology meet.
        </p>
      </div>
      <dl className="route-ball-scene__about-index">
        <div><dt>01</dt><dd>Product</dd></div>
        <div><dt>02</dt><dd>Interaction</dd></div>
        <div><dt>03</dt><dd>Creative technology</dd></div>
      </dl>
    </>
  );
}

function ContactComposition() {
  return (
    <div className="route-ball-scene__copy route-ball-scene__copy--contact">
      <p className="route-ball-scene__kicker">New projects / collaborations</p>
      <h1>Let’s talk</h1>
      <p className="route-ball-scene__summary">
        If something interesting is taking shape, send me a note.
      </p>
      <span className="route-ball-scene__email">hello@alexanderbeck.studio</span>
    </div>
  );
}

function RouteComposition({ routeId }) {
  if (routeId === 'portfolio') return <WorkComposition />;
  if (routeId === 'about') return <AboutComposition />;
  if (routeId === 'contact') return <ContactComposition />;
  return <HomeComposition />;
}

function BallField({ routeId, hiddenBallId }) {
  return (
    <div className="route-ball-scene__balls" aria-hidden="true">
      {ROUTES.map((ball) => {
        const layout = BALL_LAYOUTS[routeId][ball.id];
        return (
          <span
            key={ball.id}
            className={[
              'route-ball-scene__ball',
              ball.id === routeId ? 'is-primary' : '',
              ball.id === hiddenBallId ? 'is-hidden' : '',
            ].filter(Boolean).join(' ')}
            data-ball-id={ball.id}
            style={{
              '--ball-color': ball.color,
              '--ball-x': layout.x,
              '--ball-y': layout.y,
              '--ball-size': layout.size,
            }}
          />
        );
      })}
    </div>
  );
}

function PhasePanel({ phase, queuedId, prefersReducedMotion }) {
  const phaseIndex = PHASES.findIndex((item) => item.id === phase);
  const queuedRoute = queuedId ? ROUTE_BY_ID[queuedId] : null;

  return (
    <aside className="route-ball-lab__panel" aria-label="Transition timing">
      <div className="route-ball-lab__panel-header">
        <p>Object handoff</p>
        <span>{prefersReducedMotion ? 'Direct swap' : '1.35 sec'}</span>
      </div>

      <ol className="route-ball-lab__phases">
        {PHASES.map((item, index) => (
          <li
            key={item.id}
            className={[
              item.id === phase ? 'is-active' : '',
              phaseIndex > index ? 'is-complete' : '',
            ].filter(Boolean).join(' ')}
          >
            <div>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.label}</strong>
              <time>{item.duration}ms</time>
            </div>
            <p>{item.note}</p>
          </li>
        ))}
      </ol>

      <div className="route-ball-lab__panel-note">
        <p>Continuity test</p>
        <strong>Does it read as one physical object—not a coloured page wipe?</strong>
        <span>
          {queuedRoute
            ? `${queuedRoute.label} is queued; latest intent wins.`
            : 'Route clicks stay live. A new intent queues behind the current handoff.'}
        </span>
      </div>
    </aside>
  );
}

export function RouteBallTransitionLab() {
  const [activeId, setActiveId] = useState('home');
  const [phase, setPhase] = useState('idle');
  const [portalVisible, setPortalVisible] = useState(false);
  const [portalColor, setPortalColor] = useState(ROUTE_BY_ID.home.color);
  const [hiddenBallId, setHiddenBallId] = useState(null);
  const [queuedId, setQueuedId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const stageRef = useRef(null);
  const sceneRef = useRef(null);
  const portalRef = useRef(null);
  const activeIdRef = useRef(activeId);
  const inFlightRef = useRef(false);
  const currentTargetRef = useRef(null);
  const queuedIdRef = useRef(null);
  const transitionRunnerRef = useRef(null);
  const transactionRef = useRef(0);
  const mountedRef = useRef(true);
  const animationsRef = useRef(new Set());

  useEffect(() => () => {
    mountedRef.current = false;
    transactionRef.current += 1;
    animationsRef.current.forEach((animation) => animation.cancel());
    animationsRef.current.clear();
  }, []);

  const performTransition = useCallback(async (requestedId) => {
    const targetRoute = ROUTE_BY_ID[requestedId] || ROUTE_BY_ID.home;
    const targetId = targetRoute.id;
    const transaction = transactionRef.current + 1;
    transactionRef.current = transaction;
    inFlightRef.current = true;
    currentTargetRef.current = targetId;
    setIsTransitioning(true);
    setQueuedId(null);
    queuedIdRef.current = null;

    const isCurrentTransaction = () => (
      mountedRef.current && transactionRef.current === transaction
    );

    let finished = false;

    try {
      if (prefersReducedMotion) {
        flushSync(() => {
          setPhase('exchange');
          setActiveId(targetId);
        });
        activeIdRef.current = targetId;
        await new Promise((resolve) => window.requestAnimationFrame(resolve));
        if (!isCurrentTransaction()) return;
        setPhase('idle');
        finished = true;
        return;
      }

      const stage = stageRef.current;
      const sourceBall = sceneRef.current?.querySelector(`[data-ball-id="${targetId}"]`);
      if (!stage || !sourceBall) return;

      const sourceGeometry = getElementGeometry(sourceBall, stage);
      const focusGeometry = getFocusGeometry(sourceGeometry);
      const coverGeometry = getCoverGeometry(stage);

      flushSync(() => {
        setPortalColor(targetRoute.color);
        setPortalVisible(true);
        setHiddenBallId(targetId);
        setPhase('focus');
      });

      const portal = portalRef.current;
      setPortalGeometry(portal, sourceGeometry);
      if (!await animatePortal(
        portal,
        sourceGeometry,
        focusGeometry,
        { duration: PHASES[0].duration, easing: FOCUS_EASING },
        animationsRef,
      )) return;
      if (!isCurrentTransaction()) return;

      setPhase('fill');
      if (!await animatePortal(
        portal,
        focusGeometry,
        coverGeometry,
        { duration: PHASES[1].duration, easing: FILL_EASING },
        animationsRef,
      )) return;
      if (!isCurrentTransaction()) return;

      flushSync(() => {
        setPhase('exchange');
        setActiveId(targetId);
      });
      activeIdRef.current = targetId;
      await wait(PHASES[2].duration);
      if (!isCurrentTransaction()) return;

      const destinationBall = sceneRef.current?.querySelector(`[data-ball-id="${targetId}"]`);
      if (!destinationBall) return;
      const destinationGeometry = getElementGeometry(destinationBall, stage);

      setPhase('release');
      const sceneAnimation = sceneRef.current?.animate?.(
        [{ opacity: 0.56 }, { opacity: 1 }],
        { duration: PHASES[3].duration, easing: RELEASE_EASING, fill: 'both' },
      );
      if (sceneAnimation) {
        animationsRef.current.add(sceneAnimation);
        void sceneAnimation.finished
          .catch(() => undefined)
          .finally(() => animationsRef.current.delete(sceneAnimation));
      }

      if (!await animatePortal(
        portal,
        coverGeometry,
        destinationGeometry,
        { duration: PHASES[3].duration, easing: RELEASE_EASING },
        animationsRef,
      )) return;
      if (!isCurrentTransaction()) return;

      sceneAnimation?.cancel();
      animationsRef.current.delete(sceneAnimation);
      flushSync(() => {
        setHiddenBallId(null);
        setPortalVisible(false);
        setPhase('idle');
      });
      finished = true;
    } finally {
      if (isCurrentTransaction()) {
        if (!finished) {
          setHiddenBallId(null);
          setPortalVisible(false);
          setPhase('idle');
        }

        inFlightRef.current = false;
        currentTargetRef.current = null;
        setIsTransitioning(false);

        const queuedTarget = queuedIdRef.current;
        queuedIdRef.current = null;
        setQueuedId(null);
        if (queuedTarget) {
          window.requestAnimationFrame(() => transitionRunnerRef.current?.(queuedTarget));
        }
      }
    }
  }, [prefersReducedMotion]);

  useEffect(() => {
    transitionRunnerRef.current = performTransition;
  }, [performTransition]);

  const requestRoute = useCallback((routeId) => {
    if (!ROUTE_BY_ID[routeId]) return;
    if (inFlightRef.current) {
      if (currentTargetRef.current === routeId) return;
      queuedIdRef.current = routeId;
      setQueuedId(routeId);
      return;
    }
    void transitionRunnerRef.current?.(routeId);
  }, []);

  const activeRoute = ROUTE_BY_ID[activeId] || ROUTE_BY_ID.home;
  const phaseLabel = PHASES.find((item) => item.id === phase)?.label || 'Ready';

  return (
    <main className="route-ball-lab" data-phase={phase}>
      <header className="route-ball-lab__header">
        <div>
          <p className="route-ball-lab__eyebrow">Motion lab / shared material</p>
          <h2>One ball, two scenes</h2>
        </div>
        <p>
          Choose a destination. Its colour is acquired from the current composition, enlarged
          until it covers the studio window, then released into the matching ball on the next view.
          The black frame and navigation remain physically still.
        </p>
      </header>

      <section className="route-ball-lab__workbench" aria-label="Shared ball route transition study">
        <div
          className="route-ball-instrument"
          style={{ '--active-route-color': activeRoute.color }}
          aria-busy={isTransitioning}
        >
          <div ref={stageRef} className="route-ball-instrument__window">
            <div
              ref={sceneRef}
              className={`route-ball-scene route-ball-scene--${activeId}`}
              data-route-id={activeId}
            >
              <RouteComposition routeId={activeId} />
              <BallField routeId={activeId} hiddenBallId={hiddenBallId} />
            </div>

            {portalVisible && (
              <span
                ref={portalRef}
                className="route-ball-instrument__handoff"
                style={{ '--handoff-color': portalColor }}
                aria-hidden="true"
              />
            )}

            <div className="route-ball-instrument__readout" aria-hidden="true">
              <span>{activeRoute.label}</span>
              <span>{phaseLabel}</span>
            </div>
          </div>

          <div className="route-ball-instrument__dock">
            <span className="route-ball-instrument__dock-label" aria-hidden="true">
              ABS / 04
            </span>
            <nav aria-label="Preview route transition">
              {ROUTES.map((route) => (
                <button
                  key={route.id}
                  type="button"
                  className={route.id === activeId ? 'is-active' : ''}
                  style={{ '--route-color': route.color }}
                  aria-pressed={route.id === activeId}
                  data-queued={route.id === queuedId || undefined}
                  onClick={() => requestRoute(route.id)}
                >
                  <span aria-hidden="true" />
                  {route.label}
                </button>
              ))}
            </nav>
            <button
              type="button"
              className="route-ball-instrument__replay"
              disabled={isTransitioning}
              onClick={() => requestRoute(activeIdRef.current)}
            >
              Replay
            </button>
          </div>
        </div>

        <PhasePanel
          phase={phase}
          queuedId={queuedId}
          prefersReducedMotion={prefersReducedMotion}
        />
      </section>

      <p className="route-ball-lab__reduced-note" aria-live="polite">
        {prefersReducedMotion
          ? 'Reduced motion is active: route changes use an immediate scene exchange with no zoom.'
          : `${activeRoute.label} / ${phaseLabel}. Select the active route or Replay to repeat the handoff.`}
      </p>
    </main>
  );
}
