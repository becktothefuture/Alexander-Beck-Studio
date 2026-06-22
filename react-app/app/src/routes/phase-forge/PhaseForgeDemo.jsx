import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_PHASE_FORGE_CONFIG,
  PHASE_FORGE_CONTROL_GROUPS,
  formatPhaseForgeControlValue,
  normalizePhaseForgeConfig,
  resolvePhaseForgeControlPatch,
} from './phaseForgeControls.js';
import { PHASE_FORGE_SIMULATION_REGISTRY_ENTRY } from './phaseForgeRegistry.js';
import { createPhaseForgeRenderer } from './phaseForgeRenderer.js';
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { withBasePath } from '../../lib/base-path.js';
import './phase-forge.css';

const CONFIG_URL = withBasePath('/config/phase-forge-demo.json');
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

async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function resolvePhaseForgeTheme(designSystem) {
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
  if (panelParam !== null) return !['0', 'false', 'hide', 'off'].includes(panelParam.toLowerCase());
  if (params.get('daily') === '1') return false;
  return import.meta.env.DEV;
}

function shouldCollapsePanelByDefault() {
  return typeof window !== 'undefined'
    && window.matchMedia('(max-width: 700px)').matches;
}

function PhaseForgeControlRow({ control, value, onChange }) {
  const id = `phase-forge-control-${control.id}`;

  if (control.type === 'checkbox') {
    return (
      <label className="parameterizer-row phase-forge-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control parameterizer-control--check">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          />
        </span>
        <span className="parameterizer-value">{formatPhaseForgeControlValue(value, control)}</span>
      </label>
    );
  }

  if (control.type === 'select') {
    return (
      <label className="parameterizer-row phase-forge-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control">
          <select
            id={id}
            value={value}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          >
            {control.options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </span>
        <span className="parameterizer-value">{formatPhaseForgeControlValue(value, control)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row phase-forge-control-row" htmlFor={id}>
      <span className="parameterizer-label" title={control.label}>{control.label}</span>
      <span className="parameterizer-control">
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={Number.isFinite(Number(value)) ? Number(value) : Number(control.min || 0)}
          onChange={(event) => onChange(control, event.target.value, event.target.checked)}
        />
      </span>
      <span className="parameterizer-value">{formatPhaseForgeControlValue(value, control)}</span>
    </label>
  );
}

function PhaseForgePanel({ config, saveStatus, onChange, onReset, onSave }) {
  const [collapsed, setCollapsed] = useState(shouldCollapsePanelByDefault);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const query = window.matchMedia('(max-width: 700px)');
    const syncCollapsedState = (event) => setCollapsed(event.matches);
    query.addEventListener('change', syncCollapsedState);
    return () => query.removeEventListener('change', syncCollapsedState);
  }, []);

  return (
    <aside
      className="parameterizer-panel phase-forge-panel"
      aria-label="Phase Forge controls"
      data-collapsed={String(collapsed)}
    >
      <div className="parameterizer-header">
        <span>Phase Forge</span>
        <span className="phase-forge-panel__header-right">
          <span className="phase-forge-panel__status" role="status" aria-live="polite">{saveStatus}</span>
          <button
            type="button"
            className="phase-forge-panel__toggle"
            aria-expanded={!collapsed}
            aria-controls="phase-forge-panel-content"
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? 'Open' : 'Close'}
          </button>
        </span>
      </div>
      <div id="phase-forge-panel-content" className="parameterizer-scroll" hidden={collapsed}>
        {PHASE_FORGE_CONTROL_GROUPS.map((group) => (
          <details key={group.title} className="parameterizer-folder" open={group.initiallyOpen !== false}>
            <summary className="parameterizer-folder-title">{group.title}</summary>
            <div className="phase-forge-panel__rows">
              {group.controls.map((control) => (
                <PhaseForgeControlRow
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
      <div className="parameterizer-actions" hidden={collapsed}>
        <button type="button" onClick={onReset}>Reset</button>
        <button type="button" onClick={onSave}>Save</button>
      </div>
    </aside>
  );
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(media.matches);
    media.addEventListener?.('change', handleChange);
    return () => media.removeEventListener?.('change', handleChange);
  }, []);

  return reducedMotion;
}

export function PhaseForgeDemo() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_PHASE_FORGE_CONFIG);
  const colorsRef = useRef(DEFAULT_THEME_COLORS);
  const initialThemeRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_PHASE_FORGE_CONFIG);
  const [themeColors, setThemeColors] = useState(DEFAULT_THEME_COLORS);
  const [saveStatus, setSaveStatus] = useState('loaded');
  const [configReady, setConfigReady] = useState(false);
  const showControlPanel = useMemo(() => shouldShowControlPanel(), []);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConfig() {
      const [demoConfig, designSystem] = await Promise.all([
        loadJson(CONFIG_URL, DEFAULT_PHASE_FORGE_CONFIG),
        loadJson(DESIGN_SYSTEM_URL, null),
      ]);
      if (cancelled) return;
      const nextConfig = normalizePhaseForgeConfig(demoConfig);
      const nextColors = resolvePhaseForgeTheme(designSystem);
      configRef.current = nextConfig;
      colorsRef.current = nextColors;
      setConfig(nextConfig);
      setThemeColors(nextColors);
      setSaveStatus('loaded');
      setConfigReady(true);
    }

    loadInitialConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    configRef.current = config;
    colorsRef.current = themeColors;
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
    for (const [property, value] of [
      ['--abs-wall-base-light', initial.wallBaseLight],
      ['--abs-wall-base-dark', initial.wallBaseDark],
      ['--abs-wall-base', initial.wallBase],
      ['--frame-inner-surface', initial.frameInner],
    ]) {
      if (value) document.documentElement.style.setProperty(property, value);
      else document.documentElement.style.removeProperty(property);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !configReady) return undefined;

    rendererRef.current = createPhaseForgeRenderer({
      canvas,
      reducedMotion,
      getConfig: () => configRef.current,
      getTheme: () => colorsRef.current,
    });
    rendererRef.current.start();

    const handleResize = () => rendererRef.current?.start();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [configReady, reducedMotion]);

  const updateControl = useCallback((control, value, checked) => {
    setSaveStatus('edited');
    setConfig((current) => normalizePhaseForgeConfig({
      ...current,
      ...resolvePhaseForgeControlPatch(control, value, checked),
    }));
  }, []);

  const resetConfig = useCallback(() => {
    const nextConfig = normalizePhaseForgeConfig(DEFAULT_PHASE_FORGE_CONFIG);
    configRef.current = nextConfig;
    setConfig(nextConfig);
    setSaveStatus('reset');
    rendererRef.current?.resetSeed();
  }, []);

  const saveConfig = useCallback(async (configToSave = configRef.current) => {
    const normalized = normalizePhaseForgeConfig(configToSave);
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/phase-forge/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: normalized }),
      });
      if (!response.ok) throw new Error('save unavailable');
      setSaveStatus('saved');
      return true;
    } catch {
      setSaveStatus('save unavailable');
      return false;
    }
  }, []);

  useEffect(() => {
    window.__ABS_PHASE_FORGE__ = {
      setConfigPatch: (patch) => {
        setConfig((current) => {
          const next = normalizePhaseForgeConfig({ ...current, ...patch });
          configRef.current = next;
          return next;
        });
      },
      getConfig: () => configRef.current,
      getThemeColors: () => colorsRef.current,
      getMetrics: () => rendererRef.current?.getMetrics(),
      renderOnce: () => rendererRef.current?.renderOnce(),
      resetSeed: (seed) => rendererRef.current?.resetSeed(seed),
      save: () => saveConfig(configRef.current),
    };

    return () => {
      delete window.__ABS_PHASE_FORGE__;
    };
  }, [saveConfig]);

  return (
    <section
      className="phase-forge-demo"
      data-simulation-id={PHASE_FORGE_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(PHASE_FORGE_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      data-panel-visible={String(showControlPanel)}
      style={{ '--phase-forge-surface': themeColors.active }}
      aria-label="Phase Forge lab"
    >
      <canvas
        ref={canvasRef}
        id="phase-forge-canvas"
        className="phase-forge-canvas"
        role="img"
        aria-label="Discipline particles annealing into a crystalline material under pointer influence"
      />
      {showControlPanel ? (
        <PhaseForgePanel
          config={config}
          saveStatus={saveStatus}
          onChange={updateControl}
          onReset={resetConfig}
          onSave={() => saveConfig(config)}
        />
      ) : null}
    </section>
  );
}
