import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_FLOCK_OF_BIRDS_CONFIG,
  normalizeFlockOfBirdsConfig,
} from './flockOfBirdsControls.js';
import { FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY } from './flockOfBirdsRegistry.js';
import { createFlockOfBirdsRenderer } from './flockOfBirdsRenderer.js';
import { withBasePath } from '../../lib/base-path.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import './flock-of-birds-runtime.css';

const CONFIG_URL = withBasePath('/config/flock-of-birds-demo.json');

export function FlockOfBirdsRuntime() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_FLOCK_OF_BIRDS_CONFIG);
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
      const [demoConfig, designSystem] = await Promise.all([
        loadDailyFocusJson(CONFIG_URL, DEFAULT_FLOCK_OF_BIRDS_CONFIG),
        loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      configRef.current = normalizeFlockOfBirdsConfig(demoConfig);
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

    rendererRef.current = createFlockOfBirdsRenderer({
      canvas,
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
      className="flock-of-birds-demo flock-of-birds-demo--daily-focus daily-focus-runtime"
      data-simulation-id={FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      aria-label="Convergence simulation"
    >
      <canvas
        ref={canvasRef}
        id="flock-of-birds-canvas"
        className="flock-of-birds-canvas"
        role="img"
        aria-label="Convergence flat flock simulation"
      />
    </section>
  );
}
