import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_WALL_REPEL_CONFIG,
  normalizeWallRepelConfig,
} from './wallRepelControls.js';
import { WALL_REPEL_SIMULATION_REGISTRY_ENTRY } from './wallRepelRegistry.js';
import { createWallRepelRenderer } from './wallRepelRenderer.js';
import { withBasePath } from '../../lib/base-path.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  DEFAULT_DAILY_FOCUS_THEME,
  loadDailyFocusJson,
  resolveDailyFocusTheme,
  useDailyFocusReducedMotion,
} from '../daily-focus/dailyFocusTheme.js';
import './wall-repel-runtime.css';

const CONFIG_URL = withBasePath('/config/wall-repel-demo.json');

export function WallRepelRuntime() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_WALL_REPEL_CONFIG);
  const themeRef = useRef(DEFAULT_DAILY_FOCUS_THEME);
  const [ready, setReady] = useState(false);
  const reducedMotion = useDailyFocusReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeConfig() {
      const [demoConfig, designSystem] = await Promise.all([
        loadDailyFocusJson(CONFIG_URL, DEFAULT_WALL_REPEL_CONFIG),
        loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      configRef.current = normalizeWallRepelConfig(demoConfig);
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

    rendererRef.current = createWallRepelRenderer({
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
      className="wall-repel-demo wall-repel-demo--daily-focus daily-focus-runtime"
      data-simulation-id={WALL_REPEL_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(WALL_REPEL_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      aria-label="Repel Room simulation"
    >
      <canvas
        ref={canvasRef}
        id="wall-repel-canvas"
        className="wall-repel-canvas"
        role="img"
        aria-label="Wall and pointer repelled ball simulation"
      />
    </section>
  );
}
