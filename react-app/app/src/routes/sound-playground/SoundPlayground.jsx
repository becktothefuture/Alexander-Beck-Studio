import { useCallback, useRef, useState } from 'react';
import {
  getSoundState,
  getWheelSfxConfig,
  initSoundEngine,
  playButtonPressSound,
  playCollisionSound,
  playSoundEnabledMotif,
  playTestSound,
  playWheelCenterClick,
  playWheelClose,
  playWheelOpen,
  playWheelSnap,
  unlockAudio,
  updateWheelSfx,
  updateWheelSfxConfig,
} from '../../legacy/modules/audio/sound-engine.js';
import {
  getSoundPlaygroundScrollCandidateIds,
  playSoundPlaygroundScrollCandidate,
  playSoundPlaygroundScrollPreview,
  unlockSoundPlaygroundAudio,
} from '../../legacy/modules/audio/sound-playground.js';
import {
  triggerDetent,
  triggerImpact,
  triggerPressure,
  triggerRelease,
} from '../../legacy/modules/audio/simulation-audio-adapter.js';
import './sound-playground.css';

const CANDIDATES = Object.freeze([
  {
    id: 'felt-ratchet', number: '01', name: 'Felt Ratchet', tag: 'Recommended starting point',
    description: 'A warm fibre-and-wood detent with a tiny low body. Close, organic, and deliberately unmusical.',
    recipe: 'Noise + sine body · 33ms · 1.38kHz → 820Hz', recommendation: 'Best continuous movement',
    distancePx: 22,
  },
  {
    id: 'crystal-notch', number: '02', name: 'Crystal Notch', tag: 'Foundation family',
    description: 'A much quieter relative of the Foundation crystal-pebble collision. Crisp and familiar, but intentionally sparse.',
    recipe: 'Noise + triangle glint · 25ms · 3.6kHz → 920Hz', recommendation: 'Best family continuity',
    distancePx: 32,
  },
  {
    id: 'air-teeth', number: '03', name: 'Air Teeth', tag: 'Quietest',
    description: 'A dry, paper-like filtered tick with no tonal body. It registers as texture before it registers as a sound.',
    recipe: 'Band-passed noise · 36ms · 2.2kHz → 1.05kHz', recommendation: 'Best long-form reading',
    distancePx: 27,
  },
]);

const INITIAL_FIDGET_BALLS = Object.freeze([
  { id: 'lime', label: 'pressure', x: 23, y: 28, color: 'lime' },
  { id: 'blue', label: 'release', x: 72, y: 39, color: 'blue' },
  { id: 'pink', label: 'impact', x: 48, y: 70, color: 'pink' },
]);

let catalogDetentValue = 0;
let wheelMotionTimers = [];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function playPressReference() {
  if (getSoundState().isUnlocked) playButtonPressSound();
}

function playWheelMotionPreview() {
  const wasContinuous = getWheelSfxConfig().continuousEnabled;
  wheelMotionTimers.forEach((timer) => window.clearTimeout(timer));
  wheelMotionTimers = [];
  updateWheelSfxConfig({ continuousEnabled: true });

  [180, 360, 620, 920, 1320, 720, 300, 0].forEach((speed, index) => {
    wheelMotionTimers.push(window.setTimeout(() => updateWheelSfx(speed), index * 140));
  });
  wheelMotionTimers.push(window.setTimeout(() => {
    updateWheelSfx(0);
    updateWheelSfxConfig({ continuousEnabled: wasContinuous });
  }, 1220));
}

function playCatalogDetent() {
  catalogDetentValue += Math.PI / 10;
  triggerDetent({
    id: 'sound-playground:catalog-detent',
    value: catalogDetentValue,
    velocity: 0.4,
    minIntervalMs: 0,
  });
}

const SOUND_GROUPS = Object.freeze([
  {
    title: 'Interface',
    description: 'The small signals used by buttons, toggles, drawers, and navigation.',
    sounds: [
      { id: 'hover', name: 'Hover', detail: 'Intentionally silent', play: null },
      { id: 'press', name: 'Press', detail: 'Current production press reference', play: playPressReference },
      { id: 'enable', name: 'Enable motif', detail: 'Three-note sound-on confirmation', play: playSoundEnabledMotif },
    ],
  },
  {
    title: 'Wheel / control motion',
    description: 'Sounds used when the portfolio wheel or a control changes state.',
    sounds: [
      { id: 'detent', name: 'Detent', detail: 'Discrete control step', play: playCatalogDetent },
      { id: 'center', name: 'Center click', detail: 'Portfolio wheel passes center', play: playWheelCenterClick },
      { id: 'snap', name: 'Snap', detail: 'Wheel settles into position', play: playWheelSnap },
      { id: 'open', name: 'Open', detail: 'Drawer / sheet opens', play: playWheelOpen },
      { id: 'close', name: 'Close', detail: 'Drawer / sheet closes', play: playWheelClose },
      { id: 'motion', name: 'Tick + swish', detail: 'Continuous wheel motion · reduced', play: playWheelMotionPreview },
    ],
  },
  {
    title: 'Material / physics',
    description: 'The collision voice used by the home pit, quote puck, and simulation adapters.',
    sounds: [
      {
        id: 'impact-soft', name: 'Impact / soft', detail: 'Low-radius, medium-energy collision',
        play: () => playCollisionSound(12, 0.72, 0.32, null),
      },
      {
        id: 'impact-heavy', name: 'Impact / heavy', detail: 'Large-radius, high-energy collision',
        play: () => playCollisionSound(40, 0.98, 0.72, null),
      },
      {
        id: 'pressure', name: 'Pressure', detail: 'Adapter event used during sustained force',
        play: () => triggerPressure({ id: 'sound-playground:catalog-pressure', intensity: 0.78, x: 0.36, minIntervalMs: 0 }),
      },
      {
        id: 'release', name: 'Release', detail: 'Adapter event used when force lets go',
        play: () => triggerRelease({ id: 'sound-playground:catalog-release', intensity: 0.92, x: 0.68, minIntervalMs: 0 }),
      },
      {
        id: 'test-hit', name: 'Test hit', detail: 'Panel audition / collision test sound',
        play: () => playTestSound({ intensity: 0.86, radius: 18, xPosition: 0.72 }),
      },
    ],
  },
]);

function SoundButton({ children, className = '', disabled = false, onClick, onPointerEnter, onPointerDown, onKeyDown }) {
  return (
    <button
      type="button"
      className={`sound-playground__button ${className}`.trim()}
      disabled={disabled}
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      {children}
    </button>
  );
}

function FidgetArea({ isAudioReady }) {
  const stageRef = useRef(null);
  const dragRef = useRef(null);
  const dialDragRef = useRef(null);
  const previousWheelContinuousRef = useRef(false);
  const [balls, setBalls] = useState(INITIAL_FIDGET_BALLS);
  const [dialAngle, setDialAngle] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastAction, setLastAction] = useState('Move something');

  const beginBallDrag = useCallback((event, ball) => {
    if (!isAudioReady || event.button !== 0) return;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      id: ball.id,
      lastX: event.clientX,
      lastY: event.clientY,
      lastAt: performance.now(),
      speed: 0,
    };
    playPressReference();
    triggerImpact({ id: `sound-playground:${ball.id}:grab`, radius: 14, intensity: 0.68, x: 0.5, minIntervalMs: 0 });
    setLastAction('Grab → press + impact');
  }, [isAudioReady]);

  const moveBall = useCallback((event) => {
    const drag = dragRef.current;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const now = performance.now();
    const dt = Math.max(8, now - drag.lastAt);
    const dx = event.clientX - drag.lastX;
    const dy = event.clientY - drag.lastY;
    const speed = Math.hypot(dx, dy) / dt * 1000;
    const x = clamp((event.clientX - rect.left) / rect.width * 100, 8, 92);
    const y = clamp((event.clientY - rect.top) / rect.height * 100, 10, 90);
    const isNearWall = x <= 9 || x >= 91 || y <= 11 || y >= 89;

    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    drag.lastAt = now;
    drag.speed = speed;
    setBalls((current) => current.map((ball) => ball.id === drag.id ? { ...ball, x, y } : ball));

    if (speed > 70) {
      triggerPressure({
        id: `sound-playground:${drag.id}:pressure`,
        intensity: clamp(0.5 + speed / 1800, 0.5, 1),
        x: x / 100,
      });
      setLastAction('Drag → pressure');
    }
    if (isNearWall) {
      triggerImpact({
        id: `sound-playground:${drag.id}:wall`,
        radius: 18,
        intensity: clamp(0.62 + speed / 1700, 0.62, 1),
        x: x / 100,
      });
      setLastAction('Wall → impact');
    }
  }, []);

  const endBallDrag = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    triggerRelease({
      id: `sound-playground:${drag.id}:release`,
      intensity: clamp(0.56 + drag.speed / 1500, 0.56, 1),
      x: clamp(event.clientX / Math.max(1, window.innerWidth), 0.1, 0.9),
      minIntervalMs: 0,
    });
    if (drag.speed > 220) playWheelSnap();
    setLastAction(drag.speed > 220 ? 'Throw → release + snap' : 'Let go → release');
    dragRef.current = null;
  }, []);

  const beginDialDrag = useCallback((event) => {
    if (!isAudioReady || event.button !== 0) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const rect = event.currentTarget.getBoundingClientRect();
    const angle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
    dialDragRef.current = { lastAngle: angle, lastAt: performance.now() };
    previousWheelContinuousRef.current = Boolean(getWheelSfxConfig().continuousEnabled);
    updateWheelSfxConfig({ continuousEnabled: true });
    playPressReference();
    setLastAction('Dial → press');
  }, [isAudioReady]);

  const moveDial = useCallback((event) => {
    const drag = dialDragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const angle = Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2));
    let delta = angle - drag.lastAngle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    const now = performance.now();
    const velocity = delta / Math.max(8, now - drag.lastAt) * 1000;
    drag.lastAngle = angle;
    drag.lastAt = now;
    setDialAngle((current) => current + delta * 180 / Math.PI);
    updateWheelSfx(Math.abs(velocity) * 280);
    if (Math.abs(delta) > 0.01) {
      triggerDetent({
        id: 'sound-playground:fidget-dial',
        value: angle,
        velocity,
        step: Math.PI / 9,
        minIntervalMs: 32,
      });
      setLastAction('Dial → detent + wheel motion');
    }
  }, []);

  const endDialDrag = useCallback((event) => {
    if (!dialDragRef.current) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    updateWheelSfx(0);
    updateWheelSfxConfig({ continuousEnabled: previousWheelContinuousRef.current });
    playWheelSnap();
    setLastAction('Dial settle → snap');
    dialDragRef.current = null;
  }, []);

  const handleDialKeyDown = useCallback((event) => {
    if (!isAudioReady) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      playWheelCenterClick();
      setLastAction('Dial center → center click');
      return;
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    setDialAngle((current) => current + direction * 20);
    catalogDetentValue += direction * Math.PI / 9;
    triggerDetent({ id: 'sound-playground:fidget-dial-keyboard', value: catalogDetentValue, velocity: direction * 0.4, minIntervalMs: 0 });
    setLastAction('Dial key → detent');
  }, [isAudioReady]);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((open) => {
      if (open) playWheelClose();
      else playWheelOpen();
      setLastAction(open ? 'Drawer → close' : 'Drawer → open');
      return !open;
    });
  }, []);

  const resetFidget = useCallback(() => {
    setBalls(INITIAL_FIDGET_BALLS);
    setDialAngle(0);
    playWheelSnap();
    setLastAction('Reset → snap');
  }, []);

  return (
    <aside className="sound-playground__fidget" aria-labelledby="sound-playground-fidget-title">
      <div className="sound-playground__fidget-header">
        <div>
          <span className="sound-playground__section-label">Fidget area</span>
          <h2 id="sound-playground-fidget-title">Pull, spin, press, throw.</h2>
        </div>
        <span className="sound-playground__fidget-status" aria-live="polite">{lastAction}</span>
      </div>

      <div className="sound-playground__fidget-stage" ref={stageRef}>
        <div className="sound-playground__stage-grid" aria-hidden="true" />
        <span className="sound-playground__stage-label sound-playground__stage-label--top">drag / throw</span>
        <span className="sound-playground__stage-label sound-playground__stage-label--bottom">edge = impact</span>
        {balls.map((ball) => (
          <button
            key={ball.id}
            type="button"
            className={`sound-playground__fidget-ball sound-playground__fidget-ball--${ball.color}`}
            style={{ left: `${ball.x}%`, top: `${ball.y}%` }}
            aria-label={`Drag ${ball.label} ball`}
            onPointerDown={(event) => beginBallDrag(event, ball)}
            onPointerMove={moveBall}
            onPointerUp={endBallDrag}
            onPointerCancel={endBallDrag}
          >
            <span>{ball.label}</span>
          </button>
        ))}
        <div className="sound-playground__fidget-dial-wrap">
          <button
            type="button"
            className="sound-playground__fidget-dial"
            style={{ '--dial-angle': `${dialAngle}deg` }}
            aria-label="Spin sound dial"
            onPointerDown={beginDialDrag}
            onPointerMove={moveDial}
            onPointerUp={endDialDrag}
            onPointerCancel={endDialDrag}
            onKeyDown={handleDialKeyDown}
          >
            <i aria-hidden="true" />
            <span>spin</span>
          </button>
          <span className="sound-playground__dial-caption">detent / tick / swish</span>
        </div>
      </div>

      <div className={`sound-playground__fidget-drawer${drawerOpen ? ' is-open' : ''}`}>
        <button type="button" className="sound-playground__drawer-toggle" aria-expanded={drawerOpen} onClick={toggleDrawer} disabled={!isAudioReady}>
          <span>{drawerOpen ? 'Close state drawer' : 'Open state drawer'}</span>
          <strong>{drawerOpen ? '−' : '+'}</strong>
        </button>
        {drawerOpen ? (
          <div className="sound-playground__drawer-copy">
            <span>Open / close are live portfolio drawer sounds.</span>
            <button type="button" onClick={resetFidget} disabled={!isAudioReady}>Reset fidget</button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function SoundCatalogCard({ sound, isAudioReady, onPlay }) {
  const isSilent = typeof sound.play !== 'function';
  return (
    <article className="sound-playground__catalog-card">
      <div className="sound-playground__catalog-meta">
        <span>{sound.id}</span>
        <h3>{sound.name}</h3>
        <p>{sound.detail}</p>
      </div>
      <SoundButton className="sound-playground__catalog-play" disabled={!isAudioReady || isSilent} onClick={() => onPlay(sound)}>
        <span className="sound-playground__button-kicker">{isSilent ? 'Contract' : 'Audition'}</span>
        <strong>{isSilent ? 'No sound' : 'Play sound'}</strong>
      </SoundButton>
    </article>
  );
}

function ScrollCandidateCard({ candidate, isAudioReady, isActive, onPreview }) {
  const scrollStateRef = useRef({ previousTop: 0, previousAt: 0, distance: 0 });
  const [lastAction, setLastAction] = useState('Scroll inside this lane');
  const playContinuous = useCallback(() => onPreview(candidate.id, 'continuous'), [candidate.id, onPreview]);
  const playStep = useCallback(() => onPreview(candidate.id, 'step'), [candidate.id, onPreview]);
  const handleScroll = useCallback((event) => {
    if (!isAudioReady) return;
    const now = performance.now();
    const state = scrollStateRef.current;
    const nextTop = event.currentTarget.scrollTop;
    const delta = nextTop - state.previousTop;
    const elapsed = Math.max(8, now - (state.previousAt || now));
    state.previousTop = nextTop;
    state.previousAt = now;
    state.distance += Math.abs(delta);
    if (state.distance < candidate.distancePx) return;
    state.distance %= candidate.distancePx;
    const didPlay = playSoundPlaygroundScrollCandidate(candidate.id, {
      velocity: Math.min(2200, Math.abs(delta) / elapsed * 1000),
    });
    if (didPlay) {
      setLastAction(`${Math.round(nextTop)}px · live detent`);
      onPreview(candidate.id, 'select-only');
    }
  }, [candidate.distancePx, candidate.id, isAudioReady, onPreview]);

  return (
    <article className={`sound-playground__candidate${isActive ? ' is-active' : ''}`}>
      <div className="sound-playground__candidate-number">{candidate.number}</div>
      <div className="sound-playground__candidate-copy">
        <div className="sound-playground__candidate-title">
          <h3>{candidate.name}</h3>
          <span className={candidate.recommendation ? 'is-recommended' : ''}>{candidate.tag}</span>
        </div>
        <p>{candidate.description}</p>
        <span className="sound-playground__candidate-recipe">{candidate.recipe}</span>
      </div>
      <div className="sound-playground__candidate-actions">
        <SoundButton className="sound-playground__candidate-play" disabled={!isAudioReady} onClick={playContinuous}>
          <span className="sound-playground__button-kicker">Continuous</span>
          <strong>Play movement</strong>
        </SoundButton>
        <SoundButton className="sound-playground__candidate-play" disabled={!isAudioReady} onClick={playStep}>
          <span className="sound-playground__button-kicker">Work</span>
          <strong>Play project step</strong>
        </SoundButton>
      </div>
      <div className="sound-playground__scroll-audition">
        <div className="sound-playground__scroll-audition-heading">
          <span>Live scroll lane</span>
          <output aria-live="polite">{lastAction}</output>
        </div>
        <div
          className="sound-playground__scroll-lane"
          tabIndex={0}
          aria-label={`Scroll to audition ${candidate.name}`}
          onScroll={handleScroll}
        >
          <div className="sound-playground__scroll-lane-track">
            {['Start', 'Drift', 'Move', 'Coast', 'Settle'].map((label, index) => (
              <div key={label} className="sound-playground__scroll-lane-stop">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{label}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function getInitialScrollCandidate() {
  if (typeof window === 'undefined') return null;
  const candidateId = new URLSearchParams(window.location.search).get('scrollSound');
  return CANDIDATES.some((candidate) => candidate.id === candidateId) ? candidateId : null;
}

export function SoundPlayground() {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(getInitialScrollCandidate);
  const [lastCatalogSound, setLastCatalogSound] = useState('Nothing played yet');

  const enableAudio = useCallback(async () => {
    initSoundEngine();
    const [productionReady, playgroundReady] = await Promise.all([
      unlockAudio(),
      unlockSoundPlaygroundAudio(),
    ]);
    setIsAudioReady(Boolean(productionReady && playgroundReady));
  }, []);

  const previewCandidate = useCallback((candidateId, mode = 'continuous') => {
    if (!isAudioReady) return;
    setActiveCandidate(candidateId);
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set('scrollSound', candidateId);
    window.history.replaceState(window.history.state, '', nextUrl);
    if (mode !== 'select-only') playSoundPlaygroundScrollPreview(candidateId, { mode });
  }, [isAudioReady]);

  const playCatalogSound = useCallback((sound) => {
    if (!isAudioReady) return;
    sound.play();
    setLastCatalogSound(sound.name);
  }, [isAudioReady]);

  const candidateIds = getSoundPlaygroundScrollCandidateIds();

  return (
    <main className="sound-playground" aria-labelledby="sound-playground-title">
      <header className="sound-playground__hero">
        <div className="sound-playground__hero-copy">
          <div className="sound-playground__eyebrow">
            <span>Playground / Sound design</span>
            <span className="sound-playground__status" data-ready={isAudioReady ? 'true' : 'false'}>
              <i aria-hidden="true" /> {isAudioReady ? 'Audio ready' : 'Audio locked'}
            </span>
          </div>
          <h1 id="sound-playground-title">Every sound, one place.</h1>
          <p>Fidget with the real interactions on the left. Audition the production catalog on the right. Hover remains silent; the three scroll-wheel candidates at the bottom are isolated prototypes.</p>
        </div>
        <div className="sound-playground__hero-action">
          <button type="button" className="sound-playground__enable" onClick={enableAudio}>
            {isAudioReady ? 'Replay / keep listening' : 'Enable sound'}
          </button>
          <span>Use headphones if you can.</span>
        </div>
      </header>

      <div className="sound-playground__workspace">
        <FidgetArea isAudioReady={isAudioReady} />

        <section className="sound-playground__catalog" aria-labelledby="sound-playground-catalog-title">
          <div className="sound-playground__catalog-header">
            <div>
              <span className="sound-playground__section-label">Production catalog</span>
              <h2 id="sound-playground-catalog-title">The sounds the site actually uses.</h2>
            </div>
            <span className="sound-playground__catalog-status" aria-live="polite">Last played: {lastCatalogSound}</span>
          </div>

          {SOUND_GROUPS.map((group) => (
            <section key={group.title} className="sound-playground__sound-group" aria-labelledby={`sound-group-${group.title}`}>
              <header>
                <h3 id={`sound-group-${group.title}`}>{group.title}</h3>
                <p>{group.description}</p>
              </header>
              <div className="sound-playground__catalog-grid">
                {group.sounds.map((sound) => (
                  <SoundCatalogCard key={sound.id} sound={sound} isAudioReady={isAudioReady} onPlay={playCatalogSound} />
                ))}
              </div>
            </section>
          ))}

          <section className="sound-playground__candidates" aria-labelledby="sound-playground-candidates-title">
            <header>
              <span className="sound-playground__section-label">Scroll candidates</span>
              <h2 id="sound-playground-candidates-title">Three quiet ways to make movement feel physical.</h2>
              <p>Each voice has a continuous pass, a single Work project step, and a live native scroll lane. None is wired into production.</p>
            </header>
            <div className="sound-playground__candidate-list">
              {CANDIDATES.filter((candidate) => candidateIds.includes(candidate.id)).map((candidate) => (
                <ScrollCandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  isAudioReady={isAudioReady}
                  isActive={candidate.id === activeCandidate}
                  onPreview={previewCandidate}
                />
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
