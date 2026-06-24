import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { withBasePath } from '../../lib/base-path.js';
import {
  CONCEPT_SIMULATION_IDS,
  CONCEPT_SIMULATION_REGISTRY,
  normalizeConceptSimulationConfig,
} from './conceptSimulationConfigs.js';
import { createConceptSimulationRenderer } from './conceptSimulationRenderer.js';
import { NapoleonPointCloud } from '../napoleon-point-cloud/NapoleonPointCloud.jsx';
import './concept-simulations.css';

const DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');
const DEFAULT_PALETTE = getLondonWeatherPalette(DEFAULT_LONDON_WEATHER_PALETTE_ID)?.dark || [
  '#a7afb0',
  '#c6cecf',
  '#f5f8f6',
  '#00a5a0',
  '#031210',
  '#d7ff2f',
  '#2c96ff',
  '#ff7e4a',
];
const DEFAULT_COLOR_DISTRIBUTION = [
  { label: 'Product Systems', colorIndex: 0, weight: 31 },
  { label: 'Experience Strategy', colorIndex: 3, weight: 13 },
  { label: 'Art Direction', colorIndex: 2, weight: 16 },
  { label: 'Generative R&D', colorIndex: 6, weight: 20 },
  { label: 'Creative Engineering', colorIndex: 7, weight: 10 },
  { label: 'Parametric Systems', colorIndex: 5, weight: 10 },
];

const DEFAULT_THEME_COLORS = {
  light: '#efefef',
  dark: '#202020',
  active: '#202020',
  palette: DEFAULT_PALETTE,
  colorDistribution: DEFAULT_COLOR_DISTRIBUTION,
};

const NAPOLEON_AMOUNT_OPTIONS = [
  { value: 'low', label: '5k' },
  { value: 'medium', label: '12k' },
  { value: 'high', label: '24k' },
];

const NAPOLEON_CONTROL_GROUPS = [
  {
    title: 'Points',
    controls: [
      {
        id: 'quality',
        type: 'select',
        label: 'Amount',
        options: NAPOLEON_AMOUNT_OPTIONS,
      },
      {
        id: 'pointDensity',
        type: 'range',
        label: 'Density',
        min: 0.12,
        max: 1,
        step: 0.02,
        format: (value) => `${Math.round(Number(value) * 100)}%`,
      },
      {
        id: 'dotSize',
        type: 'range',
        label: 'Size',
        min: 4,
        max: 50,
        step: 0.2,
        format: (value) => Number(value).toFixed(1),
      },
    ],
  },
  {
    title: 'Motion',
    controls: [
      {
        id: 'interactionStrength',
        type: 'range',
        label: 'Mouse',
        min: 0,
        max: 1.4,
        step: 0.01,
        format: (value) => `${Number(value).toFixed(2)}x`,
      },
      {
        id: 'autoRotate',
        type: 'checkbox',
        label: 'Auto',
        format: (value) => (value ? 'on' : 'off'),
      },
    ],
  },
];

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function resolveConceptTheme(designSystem) {
  const runtime = designSystem?.runtime || {};
  const shellTheme = designSystem?.shell?.theme || {};
  const paletteId = resolveLondonWeatherPaletteId(
    runtime.paletteId
      || runtime.palette
      || runtime.paletteTemplate
      || runtime.paletteSlug
      || DEFAULT_LONDON_WEATHER_PALETTE_ID,
  ) || DEFAULT_LONDON_WEATHER_PALETTE_ID;
  const palette = getLondonWeatherPalette(paletteId);

  return {
    light: runtime.bgLight || shellTheme.wallBaseLight || palette?.theme?.wallBaseLight || DEFAULT_THEME_COLORS.light,
    dark: runtime.bgDark || shellTheme.wallBaseDark || palette?.theme?.wallBaseDark || DEFAULT_THEME_COLORS.dark,
    active: runtime.bgDark || shellTheme.wallBaseDark || palette?.theme?.wallBaseDark || DEFAULT_THEME_COLORS.active,
    palette: Array.isArray(palette?.dark) ? palette.dark : DEFAULT_THEME_COLORS.palette,
    colorDistribution: Array.isArray(runtime.colorDistribution)
      ? runtime.colorDistribution
      : DEFAULT_THEME_COLORS.colorDistribution,
  };
}

function shouldShowControlPanel() {
  if (typeof window === 'undefined') return false;

  const params = new URLSearchParams(window.location.search);
  const panelParam = params.get('panel') ?? params.get('controls');
  if (panelParam !== null) {
    return !['0', 'false', 'hide', 'off'].includes(panelParam.toLowerCase());
  }

  if (params.get('daily') === '1') return false;
  return import.meta.env.DEV;
}

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label || String(value);
}

function formatNapoleonControlValue(control, value) {
  if (control.type === 'checkbox') return control.format ? control.format(value) : (value ? 'on' : 'off');
  if (control.type === 'select') return getOptionLabel(control.options, value);
  return control.format ? control.format(value) : Number(value).toFixed(2);
}

function coerceNapoleonControlValue(control, value, checked) {
  if (control.type === 'checkbox') return Boolean(checked);
  if (control.type === 'range') return Number(value);
  return value;
}

function NapoleonControlRow({ control, value, onChange }) {
  const id = `napoleon-control-${control.id}`;

  if (control.type === 'checkbox') {
    return (
      <label className="parameterizer-row napoleon-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control parameterizer-control--check">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          />
        </span>
        <span className="parameterizer-value">{formatNapoleonControlValue(control, value)}</span>
      </label>
    );
  }

  if (control.type === 'select') {
    return (
      <label className="parameterizer-row napoleon-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control">
          <select
            id={id}
            value={value}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          >
            {control.options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </span>
        <span className="parameterizer-value">{formatNapoleonControlValue(control, value)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row napoleon-control-row" htmlFor={id}>
      <span className="parameterizer-label" title={control.label}>{control.label}</span>
      <span className="parameterizer-control">
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={value}
          onChange={(event) => onChange(control, event.target.value, event.target.checked)}
        />
      </span>
      <span className="parameterizer-value">{formatNapoleonControlValue(control, value)}</span>
    </label>
  );
}

function NapoleonPointCloudPanel({ config, onChange, onReset }) {
  return (
    <aside className="parameterizer-panel napoleon-point-cloud-panel" aria-label="Napoleon point cloud controls">
      <div className="parameterizer-header">
        <span>Napoleon</span>
        <span className="napoleon-point-cloud-panel__status">live</span>
      </div>
      <div className="parameterizer-scroll">
        {NAPOLEON_CONTROL_GROUPS.map((group) => (
          <details key={group.title} className="parameterizer-folder" open>
            <summary className="parameterizer-folder-title">{group.title}</summary>
            <div className="napoleon-point-cloud-panel__rows">
              {group.controls.map((control) => (
                <NapoleonControlRow
                  key={control.id}
                  control={control}
                  value={config[control.id]}
                  onChange={onChange}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="parameterizer-actions">
        <button type="button" onClick={onReset}>Reset</button>
      </div>
    </aside>
  );
}

export function ConceptSimulationDemo({ simulationId }) {
  const entry = CONCEPT_SIMULATION_REGISTRY[simulationId];
  const isNapoleonPointCloud = simulationId === CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD;
  const showControlPanel = shouldShowControlPanel();
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [config, setConfig] = useState(() => normalizeConceptSimulationConfig(simulationId, entry.defaults));
  const configRef = useRef(config);
  const themeRef = useRef(DEFAULT_THEME_COLORS);
  const initialThemeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [themeColors, setThemeColors] = useState(DEFAULT_THEME_COLORS);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => setReducedMotion(query.matches);
    updateReducedMotion();
    query.addEventListener?.('change', updateReducedMotion);
    return () => query.removeEventListener?.('change', updateReducedMotion);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConfig() {
      const [designSystem, demoConfig] = await Promise.all([
        loadJson(DESIGN_SYSTEM_URL, null),
        loadJson(withBasePath(entry.configPath), entry.defaults),
      ]);

      if (cancelled) return;
      const nextTheme = resolveConceptTheme(designSystem);
      const nextConfig = normalizeConceptSimulationConfig(simulationId, demoConfig);
      themeRef.current = nextTheme;
      configRef.current = nextConfig;
      setThemeColors(nextTheme);
      setConfig(nextConfig);
      setReady(true);
    }

    loadInitialConfig();
    return () => {
      cancelled = true;
    };
  }, [entry.configPath, entry.defaults, simulationId]);

  useEffect(() => {
    configRef.current = config;
    themeRef.current = themeColors;
    rendererRef.current?.start();
  }, [config, themeColors]);

  useEffect(() => {
    if (initialThemeRef.current === null) {
      initialThemeRef.current = {
        htmlDark: document.documentElement.classList.contains('dark-mode'),
        bodyDark: document.body.classList.contains('dark-mode'),
        wallBaseLight: document.documentElement.style.getPropertyValue('--abs-wall-base-light'),
        wallBaseDark: document.documentElement.style.getPropertyValue('--abs-wall-base-dark'),
        wallBase: document.documentElement.style.getPropertyValue('--abs-wall-base'),
        frameInner: document.documentElement.style.getPropertyValue('--frame-inner-surface'),
      };
    }

    const root = document.documentElement;
    root.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
    root.style.setProperty('--abs-wall-base-light', themeColors.light);
    root.style.setProperty('--abs-wall-base-dark', themeColors.dark);
    root.style.setProperty('--abs-wall-base', themeColors.active);
    root.style.setProperty('--frame-inner-surface', 'var(--abs-wall-base)');

    return undefined;
  }, [themeColors]);

  useEffect(() => () => {
    const initial = initialThemeRef.current;
    if (!initial) return;
    document.documentElement.classList.toggle('dark-mode', initial.htmlDark);
    document.body.classList.toggle('dark-mode', initial.bodyDark);
    if (initial.wallBaseLight) {
      document.documentElement.style.setProperty('--abs-wall-base-light', initial.wallBaseLight);
    } else {
      document.documentElement.style.removeProperty('--abs-wall-base-light');
    }
    if (initial.wallBaseDark) {
      document.documentElement.style.setProperty('--abs-wall-base-dark', initial.wallBaseDark);
    } else {
      document.documentElement.style.removeProperty('--abs-wall-base-dark');
    }
    if (initial.wallBase) {
      document.documentElement.style.setProperty('--abs-wall-base', initial.wallBase);
    } else {
      document.documentElement.style.removeProperty('--abs-wall-base');
    }
    if (initial.frameInner) {
      document.documentElement.style.setProperty('--frame-inner-surface', initial.frameInner);
    } else {
      document.documentElement.style.removeProperty('--frame-inner-surface');
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (isNapoleonPointCloud || !canvas || !ready) return undefined;

    rendererRef.current = createConceptSimulationRenderer({
      canvas,
      simulationId,
      reducedMotion,
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
  }, [isNapoleonPointCloud, ready, reducedMotion, simulationId]);

  useEffect(() => {
    window.__ABS_CONCEPT_SIMULATION__ = {
      simulationId,
      setConfigPatch: (patch) => {
        setConfig((current) => normalizeConceptSimulationConfig(simulationId, { ...current, ...patch }));
      },
      getConfig: () => configRef.current,
      getThemeColors: () => themeRef.current,
      getMetrics: () => (
        isNapoleonPointCloud
          ? window.__ABS_NAPOLEON_POINT_CLOUD__?.getMetrics?.()
          : rendererRef.current?.getMetrics()
      ),
      renderOnce: () => (
        isNapoleonPointCloud
          ? window.__ABS_NAPOLEON_POINT_CLOUD__?.renderOnce?.()
          : rendererRef.current?.renderOnce()
      ),
    };

    return () => {
      delete window.__ABS_CONCEPT_SIMULATION__;
    };
  }, [isNapoleonPointCloud, simulationId]);

  const updateNapoleonControl = useCallback((control, value, checked) => {
    setConfig((current) => {
      const next = {
        ...current,
        [control.id]: coerceNapoleonControlValue(control, value, checked),
      };

      if (control.id === 'quality') {
        next.mobileQuality = next.quality;
      }

      return normalizeConceptSimulationConfig(simulationId, next);
    });
  }, [simulationId]);

  const resetNapoleonControls = useCallback(() => {
    setConfig(normalizeConceptSimulationConfig(simulationId, entry.defaults));
  }, [entry.defaults, simulationId]);

  if (isNapoleonPointCloud) {
    return (
      <section
        className="concept-simulation-demo"
        data-simulation-id={simulationId}
        data-enabled-in-rotation={String(entry.enabledInRotation)}
        data-panel-visible={String(showControlPanel)}
        style={{ '--concept-simulation-surface': themeColors.active }}
        aria-label={`${entry.name} lab`}
      >
        <NapoleonPointCloud
          quality={config.quality}
          mobileQuality={config.mobileQuality}
          pointDensity={config.pointDensity}
          dotSize={config.dotSize}
          dotOpacity={config.dotOpacity}
          colourMode={config.colourMode}
          autoRotate={config.autoRotate}
          rotationSpeed={config.rotationSpeed}
          interactionStrength={config.interactionStrength}
          spread={config.spread}
          focus={config.focus}
          breathingMotion={config.breathingMotion}
          maxDpr={config.maxDpr}
          reducedMotion={reducedMotion}
          theme={themeColors}
          ariaLabel={entry.ariaLabel}
        />
        {showControlPanel ? (
          <NapoleonPointCloudPanel
            config={config}
            onChange={updateNapoleonControl}
            onReset={resetNapoleonControls}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section
      className="concept-simulation-demo"
      data-simulation-id={simulationId}
      data-enabled-in-rotation={String(entry.enabledInRotation)}
      style={{ '--concept-simulation-surface': themeColors.active }}
      aria-label={`${entry.name} lab`}
    >
      <canvas
        ref={canvasRef}
        id={`${simulationId}-canvas`}
        className="concept-simulation-canvas"
        role="img"
        aria-label={entry.ariaLabel}
      />
    </section>
  );
}
