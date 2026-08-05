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
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import './concept-simulations-runtime.css';

const SIMULATION_ID = CONCEPT_SIMULATION_IDS.RIFT_RINGS;
const ENTRY = CONCEPT_SIMULATION_REGISTRY[SIMULATION_ID];

export function RiftRingsRuntime() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(normalizeConceptSimulationConfig(SIMULATION_ID, ENTRY.defaults));
  const [designSystem, setDesignSystem] = useState(null);
  const theme = useDailyFocusTheme(designSystem);
  const themeRef = useRef(theme);
  const [ready, setReady] = useState(false);
  const reducedMotion = useDailyFocusReducedMotion();

  useEffect(() => {
    themeRef.current = theme;
    rendererRef.current?.start();
  }, [theme]);

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeConfig() {
      const [designSystem, demoConfig] = await Promise.all([
        loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
        loadDailyFocusJson(withBasePath(ENTRY.configPath), ENTRY.defaults),
      ]);

      if (cancelled) return;
      configRef.current = normalizeConceptSimulationConfig(SIMULATION_ID, demoConfig);
      setDesignSystem(designSystem);
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
      useHomeSimulationBodyRadius: true,
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
        id="rift-rings-canvas"
        className="concept-simulation-canvas"
        data-simulation-atmosphere-source="true"
        role="img"
        aria-label={ENTRY.ariaLabel}
      />
    </section>
  );
}
