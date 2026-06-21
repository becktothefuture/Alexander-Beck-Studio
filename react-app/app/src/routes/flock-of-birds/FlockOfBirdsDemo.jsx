import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_FLOCK_OF_BIRDS_CONFIG,
  FLOCK_OF_BIRDS_CONTROL_GROUPS,
  formatFlockControlValue,
  normalizeFlockOfBirdsConfig,
  resolveFlockControlPatch,
  resolveFlockControlValue,
} from './flockOfBirdsControls.js';
import { FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY } from './flockOfBirdsRegistry.js';
import { createFlockOfBirdsRenderer } from './flockOfBirdsRenderer.js';
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { withBasePath } from '../../lib/base-path.js';
import './flock-of-birds.css';

const CONFIG_URL = withBasePath('/config/flock-of-birds-demo.json');
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

function downloadConfig(config) {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}\n`], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'flock-of-birds-demo.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}

function resolveFlockTheme(designSystem) {
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

function FlockOfBirdsControlRow({ control, value, onChange }) {
  const id = `flock-of-birds-control-${control.id}`;
  const rangeValue = Number.isFinite(Number(value))
    ? Number(value)
    : Number(control.min || 0);

  if (control.type === 'checkbox') {
    return (
      <label className="parameterizer-row flock-of-birds-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control parameterizer-control--check">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          />
        </span>
        <span className="parameterizer-value">{formatFlockControlValue(value, control)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row flock-of-birds-control-row" htmlFor={id}>
      <span className="parameterizer-label" title={control.label}>{control.label}</span>
      <span className="parameterizer-control">
        <input
          id={id}
          type="range"
          min={control.min}
          max={control.max}
          step={control.step}
          value={rangeValue}
          onChange={(event) => onChange(control, event.target.value, event.target.checked)}
        />
      </span>
      <span className="parameterizer-value">{formatFlockControlValue(value, control)}</span>
    </label>
  );
}

function FlockOfBirdsPanel({ config, saveStatus, onChange, onReset, onSave }) {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(
    FLOCK_OF_BIRDS_CONTROL_GROUPS.map((group) => [group.title, group.initiallyOpen !== false]),
  ));

  return (
    <aside className="parameterizer-panel flock-of-birds-panel" aria-label="Flock of birds controls">
      <div className="parameterizer-header">
        <span>Flock of Birds</span>
        <span className="flock-of-birds-panel__status">{saveStatus}</span>
      </div>
      <div className="parameterizer-scroll">
        {FLOCK_OF_BIRDS_CONTROL_GROUPS.map((group) => (
          <details
            key={group.title}
            className="parameterizer-folder"
            open={Boolean(openGroups[group.title])}
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenGroups((current) => (
                current[group.title] === isOpen
                  ? current
                  : { ...current, [group.title]: isOpen }
              ));
            }}
          >
            <summary className="parameterizer-folder-title">{group.title}</summary>
            <div className="flock-of-birds-panel__rows">
              {group.controls.map((control) => (
                <FlockOfBirdsControlRow
                  key={control.id}
                  control={control}
                  value={resolveFlockControlValue(control, config)}
                  onChange={onChange}
                />
              ))}
            </div>
          </details>
        ))}
      </div>
      <div className="parameterizer-actions">
        <button type="button" onClick={onReset}>Reset</button>
        <button type="button" onClick={onSave}>Save</button>
      </div>
    </aside>
  );
}

export function FlockOfBirdsDemo() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_FLOCK_OF_BIRDS_CONFIG);
  const colorsRef = useRef(DEFAULT_THEME_COLORS);
  const initialThemeRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_FLOCK_OF_BIRDS_CONFIG);
  const [themeColors, setThemeColors] = useState(DEFAULT_THEME_COLORS);
  const [saveStatus, setSaveStatus] = useState('loaded');
  const [configReady, setConfigReady] = useState(false);
  const showControlPanel = useMemo(() => shouldShowControlPanel(), []);

  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ), []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConfig() {
      const [demoConfig, designSystem] = await Promise.all([
        loadJson(CONFIG_URL, DEFAULT_FLOCK_OF_BIRDS_CONFIG),
        loadJson(DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      const nextColors = resolveFlockTheme(designSystem);

      setThemeColors(nextColors);
      setConfig(normalizeFlockOfBirdsConfig(demoConfig));
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
    if (!canvas || !configReady) return undefined;

    rendererRef.current = createFlockOfBirdsRenderer({
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
    setConfig((current) => normalizeFlockOfBirdsConfig({
      ...current,
      ...resolveFlockControlPatch(control, value, checked),
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setSaveStatus('reset');
    setConfig(normalizeFlockOfBirdsConfig(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  }, []);

  const saveConfig = useCallback(async (configToSave = configRef.current) => {
    const normalized = normalizeFlockOfBirdsConfig(configToSave);
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/flock-of-birds/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: normalized }),
      });

      if (!response.ok) throw new Error('save unavailable');
      setSaveStatus('saved');
      return true;
    } catch {
      downloadConfig(normalized);
      setSaveStatus('downloaded');
      return false;
    }
  }, []);

  useEffect(() => {
    window.__ABS_FLOCK_OF_BIRDS__ = {
      setConfigPatch: (patch) => {
        setConfig((current) => normalizeFlockOfBirdsConfig({ ...current, ...patch }));
      },
      getConfig: () => configRef.current,
      getMetrics: () => rendererRef.current?.getMetrics(),
      renderOnce: () => rendererRef.current?.renderOnce(),
      save: () => saveConfig(configRef.current),
    };

    return () => {
      delete window.__ABS_FLOCK_OF_BIRDS__;
    };
  }, [saveConfig]);

  return (
    <section
      className="flock-of-birds-demo"
      data-simulation-id={FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      data-panel-visible={String(showControlPanel)}
      style={{
        '--flock-of-birds-ground': `${config.groundLine * 100}%`,
        '--flock-of-birds-surface': themeColors.active,
      }}
      aria-label="Flock of birds lab"
    >
      <canvas
        ref={canvasRef}
        id="flock-of-birds-canvas"
        className="flock-of-birds-canvas"
        role="img"
        aria-label="Flock of birds simulation"
      />
      <div className="flock-of-birds-ground" aria-hidden="true" />
      {showControlPanel ? (
        <FlockOfBirdsPanel
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
