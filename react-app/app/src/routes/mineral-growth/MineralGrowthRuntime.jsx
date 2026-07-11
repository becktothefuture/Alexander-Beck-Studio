import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_MINERAL_GROWTH_CONFIG,
  normalizeMineralGrowthConfig,
} from './mineralGrowthControls.js';
import { MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY } from './mineralGrowthRegistry.js';
import { createMineralGrowthRenderer } from './mineralGrowthRenderer.js';
import { withBasePath } from '../../lib/base-path.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import './mineral-growth-runtime.css';

const CONFIG_URL = withBasePath('/config/mineral-growth-demo.json');

export function MineralGrowthRuntime() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_MINERAL_GROWTH_CONFIG);
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
        loadDailyFocusJson(CONFIG_URL, DEFAULT_MINERAL_GROWTH_CONFIG),
        loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      configRef.current = normalizeMineralGrowthConfig(demoConfig);
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

    rendererRef.current = createMineralGrowthRenderer({
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
      className="mineral-growth-demo mineral-growth-demo--daily-focus daily-focus-runtime"
      data-simulation-id={MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      aria-label="Mineral Bloom simulation"
    >
      <canvas
        ref={canvasRef}
        id="mineral-growth-canvas"
        className="mineral-growth-canvas"
        role="img"
        aria-label="Mineral Bloom flat growth simulation"
      />
    </section>
  );
}
