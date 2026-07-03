import { useEffect, useRef, useState } from 'react';
import {
  CONCEPT_SIMULATION_IDS,
  CONCEPT_SIMULATION_REGISTRY,
  normalizeConceptSimulationConfig,
} from './conceptSimulationConfigs.js';
import { createConceptSimulationRenderer } from './conceptSimulationRenderer.js';
import { withBasePath } from '../../lib/base-path.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  DEFAULT_DAILY_FOCUS_THEME,
  loadDailyFocusJson,
  resolveDailyFocusTheme,
  useDailyFocusReducedMotion,
} from '../daily-focus/dailyFocusTheme.js';
import './concept-simulations-runtime.css';

const SIMULATION_ID = CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC;
const ENTRY = CONCEPT_SIMULATION_REGISTRY[SIMULATION_ID];

export function PressureMosaicRuntime() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(normalizeConceptSimulationConfig(SIMULATION_ID, ENTRY.defaults));
  const themeRef = useRef(DEFAULT_DAILY_FOCUS_THEME);
  const [ready, setReady] = useState(false);
  const reducedMotion = useDailyFocusReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeConfig() {
      const [designSystem, demoConfig] = await Promise.all([
        loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
        loadDailyFocusJson(withBasePath(ENTRY.configPath), ENTRY.defaults),
      ]);

      if (cancelled) return;
      configRef.current = normalizeConceptSimulationConfig(SIMULATION_ID, demoConfig);
      themeRef.current = resolveDailyFocusTheme(designSystem);
      setReady(true);
    }

    loadRuntimeConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return undefined;

    rendererRef.current = createConceptSimulationRenderer({
      canvas,
      simulationId: SIMULATION_ID,
      reducedMotion,
      transparentBackground: true,
      getConfig: () => configRef.current,
      getTheme: () => themeRef.current,
    });
    rendererRef.current.start();

    const handleResize = () => rendererRef.current?.start();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [ready, reducedMotion]);

  return (
    <section
      className="concept-simulation-demo concept-simulation-demo--daily-focus daily-focus-runtime"
      data-simulation-id={SIMULATION_ID}
      data-enabled-in-rotation={String(ENTRY.enabledInRotation)}
      aria-label={ENTRY.ariaLabel}
    >
      <canvas
        ref={canvasRef}
        id={`${SIMULATION_ID}-canvas`}
        className="concept-simulation-canvas"
        role="img"
        aria-label={ENTRY.ariaLabel}
      />
    </section>
  );
}
