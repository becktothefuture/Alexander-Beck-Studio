import { useEffect, useRef, useState } from 'react';
import './studio-light-film.css';

const BALLS = [
  { className: 'ball--one', color: 'var(--ball-4)' },
  { className: 'ball--two', color: 'var(--ball-6)' },
  { className: 'ball--three', color: 'var(--ball-7)' },
  { className: 'ball--four', color: 'var(--ball-8)' },
  { className: 'ball--five', color: 'var(--ball-3)' },
  { className: 'ball--six', color: 'var(--ball-5)' },
];

export function StudioLightFilmDemo() {
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const [intensity, setIntensity] = useState(42);
  const [enabled, setEnabled] = useState(true);
  const [drifting, setDrifting] = useState(true);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let pointerFrame = 0;

    function applyPointer(event) {
      if (reducedMotion) return;
      const rect = stage.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 100;
      const y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * 100;
      cancelAnimationFrame(pointerFrame);
      pointerFrame = requestAnimationFrame(() => {
        stage.style.setProperty('--film-x', `${Math.max(0, Math.min(100, x))}%`);
        stage.style.setProperty('--film-y', `${Math.max(0, Math.min(100, y))}%`);
      });
    }

    function resetPointer() {
      stage.style.setProperty('--film-x', '68%');
      stage.style.setProperty('--film-y', '28%');
    }

    stage.addEventListener('pointermove', applyPointer, { passive: true });
    stage.addEventListener('pointerleave', resetPointer, { passive: true });

    return () => {
      cancelAnimationFrame(pointerFrame);
      stage.removeEventListener('pointermove', applyPointer);
      stage.removeEventListener('pointerleave', resetPointer);
    };
  }, []);

  const filmOpacity = enabled ? intensity / 100 : 0;

  return (
    <main
      ref={frameRef}
      className={`light-film-demo${drifting ? '' : ' is-still'}`}
      style={{ '--film-strength': filmOpacity }}
    >
      <section ref={stageRef} className="light-film-stage" aria-labelledby="light-film-title">
        <div className="light-film-stage__surface" aria-hidden="true" />

        <div className="light-film-balls" aria-hidden="true">
          {BALLS.map((ball) => (
            <span
              key={ball.className}
              className={`light-film-ball ${ball.className}`}
              style={{ '--ball-colour': ball.color }}
            />
          ))}
        </div>

        <div className="light-film-copy">
          <p className="light-film-copy__eyebrow">Alexander Beck Studio · Light study 01</p>
          <h1 id="light-film-title">
            Light,
            <span>as material.</span>
          </h1>
          <p className="light-film-copy__body">
            A transparent spectral film that catches the studio window without touching the interface beneath it.
          </p>
        </div>

        <div className="light-film-effect" aria-hidden="true">
          <div className="light-film-effect__wash" />
          <div className="light-film-effect__prism" />
          <div className="light-film-effect__grain" />
        </div>

        <header className="light-film-nav">
          <a href="/" className="light-film-nav__back" aria-label="Back to Alexander Beck Studio">
            <span aria-hidden="true">←</span>
            <span>Studio</span>
          </a>
          <p>Move through the light</p>
          <span>CSS · No shader</span>
        </header>

        <aside className="light-film-controls" aria-label="Light film controls">
          <button
            type="button"
            className={enabled ? 'is-active' : ''}
            aria-pressed={enabled}
            onClick={() => setEnabled((current) => !current)}
          >
            Film {enabled ? 'on' : 'off'}
          </button>

          <label>
            <span>Intensity</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={intensity}
              onChange={(event) => setIntensity(Number(event.target.value))}
              aria-label="Film intensity"
            />
            <output>{intensity}%</output>
          </label>

          <button
            type="button"
            className={drifting ? 'is-active' : ''}
            aria-pressed={drifting}
            onClick={() => setDrifting((current) => !current)}
          >
            {drifting ? 'Drifting' : 'Still'}
          </button>
        </aside>

        <footer className="light-film-footer">
          <span>Transparent</span>
          <span>Pointer-safe</span>
          <span>Compositor-only motion</span>
        </footer>
      </section>
    </main>
  );
}
