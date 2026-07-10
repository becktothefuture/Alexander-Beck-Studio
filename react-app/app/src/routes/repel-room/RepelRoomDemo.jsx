import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_REPEL_ROOM_CONFIG,
  REPEL_ROOM_CONTROL_GROUPS,
  formatRepelRoomControlValue,
  normalizeRepelRoomConfig,
  resolveRepelRoomControlPatch,
} from './repelRoomControls.js';
import { REPEL_ROOM_SIMULATION_REGISTRY_ENTRY } from './repelRoomRegistry.js';
import { createRepelRoomRenderer } from './repelRoomRenderer.js';
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { withBasePath } from '../../lib/base-path.js';
import './repel-room-runtime.css';
import './repel-room.css';

const CONFIG_URL = withBasePath('/config/repel-room-demo.json');
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
  { label: 'Product Design', colorIndex: 0, weight: 31 },
  { label: 'Experience Design', colorIndex: 3, weight: 13 },
  { label: 'Art Direction', colorIndex: 2, weight: 16 },
  { label: 'Motion & 3D', colorIndex: 6, weight: 20 },
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
  anchor.download = 'repel-room-demo.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}

function resolveRepelRoomTheme(designSystem) {
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
    light: runtime.bgLight || shellTheme.wallBaseLight || DEFAULT_THEME_COLORS.light,
    dark: runtime.bgDark || shellTheme.wallBaseDark || DEFAULT_THEME_COLORS.dark,
    active: runtime.bgDark || shellTheme.wallBaseDark || DEFAULT_THEME_COLORS.active,
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

  return import.meta.env.DEV;
}

function RepelRoomControlRow({ control, value, onChange }) {
  const id = `repel-room-control-${control.id}`;
  const rangeValue = Number.isFinite(Number(value))
    ? Number(value)
    : Number(control.min || 0);

  if (control.type === 'checkbox') {
    return (
      <label className="parameterizer-row repel-room-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control parameterizer-control--check">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          />
        </span>
        <span className="parameterizer-value">{formatRepelRoomControlValue(value, control)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row repel-room-control-row" htmlFor={id}>
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
      <span className="parameterizer-value">{formatRepelRoomControlValue(value, control)}</span>
    </label>
  );
}

function RepelRoomPanel({ config, saveStatus, onChange, onReset, onSave }) {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(
    REPEL_ROOM_CONTROL_GROUPS.map((group) => [group.title, group.initiallyOpen !== false]),
  ));

  return (
    <aside className="parameterizer-panel repel-room-panel" aria-label="Repel Room controls">
      <div className="parameterizer-header">
        <span>Repel Room</span>
        <span className="repel-room-panel__status">{saveStatus}</span>
      </div>
      <div className="parameterizer-scroll">
        {REPEL_ROOM_CONTROL_GROUPS.map((group) => (
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
            <div className="repel-room-panel__rows">
              {group.controls.map((control) => (
                <RepelRoomControlRow
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
        <button type="button" onClick={onSave}>Save</button>
      </div>
    </aside>
  );
}

export function RepelRoomDemo() {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_REPEL_ROOM_CONFIG);
  const colorsRef = useRef(DEFAULT_THEME_COLORS);
  const initialThemeRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_REPEL_ROOM_CONFIG);
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
        loadJson(CONFIG_URL, DEFAULT_REPEL_ROOM_CONFIG),
        loadJson(DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      const nextColors = resolveRepelRoomTheme(designSystem);

      setThemeColors(nextColors);
      setConfig(normalizeRepelRoomConfig(demoConfig));
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

    rendererRef.current = createRepelRoomRenderer({
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
    setConfig((current) => normalizeRepelRoomConfig({
      ...current,
      ...resolveRepelRoomControlPatch(control, value, checked),
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setSaveStatus('reset');
    setConfig(normalizeRepelRoomConfig(DEFAULT_REPEL_ROOM_CONFIG));
  }, []);

  const saveConfig = useCallback(async (configToSave = configRef.current) => {
    const normalized = normalizeRepelRoomConfig(configToSave);
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/repel-room/config', {
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
    const debugApi = {
      setConfigPatch: (patch) => {
        setConfig((current) => normalizeRepelRoomConfig({ ...current, ...patch }));
      },
      getConfig: () => configRef.current,
      getThemeColors: () => colorsRef.current,
      getMetrics: () => rendererRef.current?.getMetrics(),
      renderOnce: () => rendererRef.current?.renderOnce(),
      save: () => saveConfig(configRef.current),
    };
    window.__STUDIO_REPEL_ROOM__ = debugApi;
    window.__ABS_REPEL_ROOM__ = debugApi;
    window.__ABS_WALL_REPEL__ = debugApi;

    return () => {
      delete window.__STUDIO_REPEL_ROOM__;
      delete window.__ABS_REPEL_ROOM__;
      delete window.__ABS_WALL_REPEL__;
    };
  }, [saveConfig]);

  return (
    <section
      className="repel-room-demo"
      data-simulation-id={REPEL_ROOM_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(REPEL_ROOM_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      data-panel-visible={String(showControlPanel)}
      style={{ '--repel-room-surface': themeColors.active }}
      aria-label="Repel Room lab"
    >
      <canvas
        ref={canvasRef}
        id="repel-room-canvas"
        className="repel-room-canvas"
        role="img"
        aria-label="Repel Room flat ball simulation"
      />
      {showControlPanel ? (
        <RepelRoomPanel
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
