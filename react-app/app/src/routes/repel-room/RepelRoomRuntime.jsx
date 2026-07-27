import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_REPEL_ROOM_CONFIG,
  normalizeRepelRoomConfig,
} from './repelRoomControls.js';
import { REPEL_ROOM_SIMULATION_REGISTRY_ENTRY } from './repelRoomRegistry.js';
import { createRepelRoomRenderer } from './repelRoomRenderer.js';
import { withBasePath } from '../../lib/base-path.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import './repel-room-runtime.css';

const CONFIG_URL = withBasePath('/config/repel-room-demo.json');

export function RepelRoomRuntime() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_REPEL_ROOM_CONFIG);
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
        loadDailyFocusJson(CONFIG_URL, DEFAULT_REPEL_ROOM_CONFIG),
        loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      configRef.current = normalizeRepelRoomConfig(demoConfig);
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

    rendererRef.current = createRepelRoomRenderer({
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
      className="repel-room-demo repel-room-demo--daily-focus daily-focus-runtime"
      data-simulation-id={REPEL_ROOM_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(REPEL_ROOM_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      aria-label="Tension simulation"
    >
      <canvas
        ref={canvasRef}
        id="repel-room-canvas"
        className="repel-room-canvas"
        data-simulation-atmosphere-source="true"
        role="img"
        aria-label="Tension flat ball simulation"
      />
    </section>
  );
}
