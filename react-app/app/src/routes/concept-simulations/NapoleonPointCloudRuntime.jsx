import { useEffect, useState } from 'react';
import {
  CONCEPT_SIMULATION_IDS,
  CONCEPT_SIMULATION_REGISTRY,
  normalizeConceptSimulationConfig,
} from './conceptSimulationConfigs.js';
import { NapoleonPointCloud } from '../napoleon-point-cloud/NapoleonPointCloud.jsx';
import { withBasePath } from '../../lib/base-path.js';
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  DEFAULT_DAILY_FOCUS_THEME,
  loadDailyFocusJson,
  resolveDailyFocusTheme,
  useDailyFocusReducedMotion,
} from '../daily-focus/dailyFocusTheme.js';
import './concept-simulations-runtime.css';

const SIMULATION_ID = CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD;
const ENTRY = CONCEPT_SIMULATION_REGISTRY[SIMULATION_ID];

export function NapoleonPointCloudRuntime() {
  const [runtimeConfig, setRuntimeConfig] = useState(() => (
    normalizeConceptSimulationConfig(SIMULATION_ID, ENTRY.defaults)
  ));
  const [theme, setTheme] = useState(DEFAULT_DAILY_FOCUS_THEME);
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
      setRuntimeConfig(normalizeConceptSimulationConfig(SIMULATION_ID, demoConfig));
      setTheme(resolveDailyFocusTheme(designSystem));
      setReady(true);
    }

    loadRuntimeConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      className="concept-simulation-demo concept-simulation-demo--daily-focus daily-focus-runtime"
      data-simulation-id={SIMULATION_ID}
      data-enabled-in-rotation={String(ENTRY.enabledInRotation)}
      aria-label={ENTRY.ariaLabel}
    >
      {ready ? (
        <NapoleonPointCloud
          quality={runtimeConfig.quality}
          mobileQuality={runtimeConfig.mobileQuality}
          pointDensity={runtimeConfig.pointDensity}
          dotSize={runtimeConfig.dotSize}
          dotOpacity={runtimeConfig.dotOpacity}
          colourMode={runtimeConfig.colourMode}
          autoRotate={runtimeConfig.autoRotate}
          rotationSpeed={runtimeConfig.rotationSpeed}
          interactionStrength={runtimeConfig.interactionStrength}
          spread={runtimeConfig.spread}
          focus={runtimeConfig.focus}
          breathingMotion={runtimeConfig.breathingMotion}
          depthFogStart={runtimeConfig.depthFogStart}
          depthFogMin={runtimeConfig.depthFogMin}
          maxDpr={runtimeConfig.maxDpr}
          reducedMotion={reducedMotion}
          theme={theme}
          ariaLabel={ENTRY.ariaLabel}
        />
      ) : null}
    </section>
  );
}
