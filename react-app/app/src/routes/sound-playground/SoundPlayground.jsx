import { useCallback, useRef, useState } from 'react';
import {
  getSoundState,
  getWheelSfxConfig,
  initSoundEngine,
  playButtonPressSound,
  playCollisionSound,
  playHoverSound,
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
  getSoundPlaygroundCandidateIds,
  playSoundPlaygroundHover,
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
    id: 'air-whisper', number: '01', name: 'Air Whisper', tag: 'Recommended',
    description: 'A filtered breath with no pitched click. Reads as presence, not feedback.',
    recipe: 'Band-passed noise · 55ms · 1.2kHz → 760Hz', recommendation: 'Best everyday hover',
  },
  {
    id: 'soft-bloom', number: '02', name: 'Soft Bloom', tag: 'Recommended',
    description: 'A tiny triangle tone that opens slowly, then melts away. More character, still quiet.',
    recipe: 'Triangle tone · 170ms · 720Hz → 520Hz', recommendation: 'Best expressive hover',
  },
  {
    id: 'velvet-tap', number: '03', name: 'Velvet Tap', tag: 'Material',
    description: 'A low, rounded body with the transient removed. Tactile, soft, and slightly physical.',
    recipe: 'Sine body · 105ms · 210Hz → 150Hz',
  },
  {
    id: 'magnetic-halo', number: '04', name: 'Magnetic Halo', tag: 'Spatial',
    description: 'Two close tones create a barely-there shimmer, like a control waking up under a fingertip.',
    recipe: 'Detuned sine pair · 190ms · ±7 cents',
  },
  {
    id: 'elastic-ping', number: '05', name: 'Elastic Ping', tag: 'Playful',
    description: 'A soft falling pitch with a longer tail. Distinctive, but more audible than the other options.',
    recipe: 'Sine body · 230ms · 560Hz → 310Hz',
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
      { id: 'hover', name: 'Hover', detail: 'Quiet wheel detent · no swish', play: playHoverSound },
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
    description: 'The collision voice used by the home pit, quote puck, bubbles, and simulation adapters.',
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
  return (
    <article className="sound-playground__catalog-card">
      <div className="sound-playground__catalog-meta">
        <span>{sound.id}</span>
        <h3>{sound.name}</h3>
        <p>{sound.detail}</p>
      </div>
      <SoundButton className="sound-playground__catalog-play" disabled={!isAudioReady} onClick={() => onPlay(sound)}>
        <span className="sound-playground__button-kicker">Audition</span>
        <strong>Play sound</strong>
      </SoundButton>
    </article>
  );
}

function HoverCandidateCard({ candidate, isAudioReady, isActive, onPreview }) {
  const playCandidate = useCallback(() => onPreview(candidate.id), [candidate.id, onPreview]);

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
      <SoundButton
        className="sound-playground__candidate-play"
        disabled={!isAudioReady}
        onClick={playCandidate}
      >
        <strong>Play sound</strong>
      </SoundButton>
    </article>
  );
}

export function SoundPlayground() {
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [lastCatalogSound, setLastCatalogSound] = useState('Nothing played yet');

  const enableAudio = useCallback(async () => {
    initSoundEngine();
    const [productionReady, playgroundReady] = await Promise.all([
      unlockAudio(),
      unlockSoundPlaygroundAudio(),
    ]);
    setIsAudioReady(Boolean(productionReady && playgroundReady));
  }, []);

  const previewCandidate = useCallback((candidateId) => {
    if (!isAudioReady) return;
    setActiveCandidate(candidateId);
    playSoundPlaygroundHover(candidateId);
  }, [isAudioReady]);

  const playCatalogSound = useCallback((sound) => {
    if (!isAudioReady) return;
    sound.play();
    setLastCatalogSound(sound.name);
  }, [isAudioReady]);

  const candidateIds = getSoundPlaygroundCandidateIds();

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
          <p>Fidget with the real interactions on the left. Audition the full production sound catalog on the right. The five hover ideas stay at the bottom for comparison.</p>
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
              <span className="sound-playground__section-label">Hover candidates</span>
              <h2 id="sound-playground-candidates-title">Five ways to make hover feel like a hint.</h2>
              <p>These are exploratory alternatives, not yet wired into production.</p>
            </header>
            <div className="sound-playground__candidate-list">
              {CANDIDATES.filter((candidate) => candidateIds.includes(candidate.id)).map((candidate) => (
                <HoverCandidateCard
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
