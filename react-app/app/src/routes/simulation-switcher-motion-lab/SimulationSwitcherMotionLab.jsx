import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getDailyFocusSimulations } from '../../data/simulationCatalog.js';
import './simulation-switcher-motion-lab.css';

const SIMULATIONS = Object.freeze(getDailyFocusSimulations());
const TRANSITION_FALLBACK_MS = 620;

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

export function SimulationSwitcherMotionLab() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState('idle');
  const resetFrameRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const currentSimulation = SIMULATIONS[currentIndex];
  const nextIndex = (currentIndex + 1) % SIMULATIONS.length;
  const nextSimulation = SIMULATIONS[nextIndex];
  const isAdvancing = phase === 'advancing';

  useEffect(() => () => {
    if (resetFrameRef.current !== null) {
      window.cancelAnimationFrame(resetFrameRef.current);
    }
  }, []);

  const finishAdvance = useCallback(() => {
    if (phase !== 'advancing') return;
    setCurrentIndex(nextIndex);
    setPhase('resetting');
    resetFrameRef.current = window.requestAnimationFrame(() => {
      resetFrameRef.current = window.requestAnimationFrame(() => {
        setPhase('idle');
        resetFrameRef.current = null;
      });
    });
  }, [nextIndex, phase]);

  useEffect(() => {
    if (phase !== 'advancing') return undefined;
    const fallbackTimer = window.setTimeout(finishAdvance, TRANSITION_FALLBACK_MS);
    return () => window.clearTimeout(fallbackTimer);
  }, [finishAdvance, phase]);

  const advanceSimulation = () => {
    if (phase !== 'idle') return;
    if (prefersReducedMotion) {
      setCurrentIndex(nextIndex);
      return;
    }
    setPhase('advancing');
  };

  if (!currentSimulation || !nextSimulation) return null;

  return (
    <main
      className="simulation-switcher-motion-lab"
      data-current-simulation={currentSimulation.id}
      data-phase={phase}
    >
      <section className="simulation-switcher-motion-lab__scene" aria-label="Simulation switcher motion specimen">
        <button
          type="button"
          className="simulation-switcher-motion-lab__pill"
          data-advancing={String(isAdvancing)}
          data-phase={phase}
          aria-label={`Show next simulation. Currently ${currentSimulation.name}`}
          aria-disabled={phase !== 'idle' ? 'true' : undefined}
          onClick={advanceSimulation}
        >
          <span className="simulation-switcher-motion-lab__label-window" aria-hidden="true">
            <span className="simulation-switcher-motion-lab__label simulation-switcher-motion-lab__label--current">
              {currentSimulation.name}
            </span>
            <span
              className="simulation-switcher-motion-lab__label simulation-switcher-motion-lab__label--next"
              onTransitionEnd={(event) => {
                if (event.propertyName === 'transform') finishAdvance();
              }}
            >
              {nextSimulation.name}
            </span>
          </span>
          <span className="simulation-switcher-motion-lab__icon" aria-hidden="true">
            <RefreshCw strokeWidth={1.8} />
          </span>
        </button>

        <span className="simulation-switcher-motion-lab__status" aria-live="polite">
          Current simulation: {currentSimulation.name}
        </span>
      </section>
    </main>
  );
}
