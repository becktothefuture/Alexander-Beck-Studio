import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_MINERAL_GROWTH_CONFIG,
  MINERAL_GROWTH_CONTROL_GROUPS,
  formatMineralGrowthControlValue,
  normalizeMineralGrowthConfig,
  resolveMineralGrowthControlPatch,
} from './mineralGrowthControls.js';
import { MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY } from './mineralGrowthRegistry.js';
import { createMineralGrowthRenderer } from './mineralGrowthRenderer.js';
import {
  getLondonWeatherPalette,
  resolveLondonWeatherPaletteId,
} from '../../palette/londonPalettes.js';
import { getTimeOfDayPaletteId } from '../../palette/timeOfDayPalette.js';
import { withBasePath } from '../../lib/base-path.js';
import { useRenderedThemeIsDark } from '../../hooks/useRenderedTheme.js';
import {
  DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
  normalizeMobileSimulationBodyScale,
} from '../../lib/mobileSimulationSizing.js';
import './mineral-growth-runtime.css';
import './mineral-growth.css';

const CONFIG_URL = withBasePath('/config/mineral-growth-demo.json');
const DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');
const DEFAULT_MINERAL_GROWTH_PALETTE_ID = getTimeOfDayPaletteId();
const RAW_DEFAULT_PALETTE = getLondonWeatherPalette(DEFAULT_MINERAL_GROWTH_PALETTE_ID)?.dark || [];
const DEFAULT_PALETTE = RAW_DEFAULT_PALETTE.slice();
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
  mobileSimulationBodyScale: DEFAULT_MOBILE_SIMULATION_BODY_SCALE,
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
  anchor.download = 'mineral-growth-demo.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}

function resolveMineralGrowthTheme(designSystem, isDarkMode) {
  const runtime = designSystem?.runtime || {};
  const paletteId = resolveLondonWeatherPaletteId(
    runtime.paletteId
      || runtime.palette
      || runtime.paletteTemplate
      || runtime.paletteSlug
      || DEFAULT_MINERAL_GROWTH_PALETTE_ID,
  ) || DEFAULT_MINERAL_GROWTH_PALETTE_ID;
  const palette = getLondonWeatherPalette(paletteId);
  const bgLight = runtime.bgLight || DEFAULT_THEME_COLORS.light;
  const bgDark = runtime.bgDark || DEFAULT_THEME_COLORS.dark;
  const activeBg = isDarkMode ? bgDark : bgLight;
  const rawPalette = Array.isArray(isDarkMode ? palette?.dark : palette?.light)
    ? (isDarkMode ? palette.dark : palette.light)
    : DEFAULT_THEME_COLORS.palette;

  return {
    light: bgLight,
    dark: bgDark,
    active: activeBg,
    palette: rawPalette.slice(),
    colorDistribution: Array.isArray(runtime.colorDistribution)
      ? runtime.colorDistribution
      : DEFAULT_THEME_COLORS.colorDistribution,
    mobileSimulationBodyScale: normalizeMobileSimulationBodyScale(
      runtime.mobileSimulationBodyScale,
    ),
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

function shouldCollapsePanelByDefault() {
  return typeof window !== 'undefined'
    && window.matchMedia('(max-width: 700px)').matches;
}

function MineralGrowthControlRow({ control, value, onChange }) {
  const id = `mineral-growth-control-${control.id}`;
  const rangeValue = Number.isFinite(Number(value))
    ? Number(value)
    : Number(control.min || 0);

  if (control.type === 'checkbox') {
    return (
      <label className="parameterizer-row mineral-growth-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control parameterizer-control--check">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          />
        </span>
        <span className="parameterizer-value">{formatMineralGrowthControlValue(value, control)}</span>
      </label>
    );
  }

  if (control.type === 'select') {
    return (
      <label className="parameterizer-row mineral-growth-control-row" htmlFor={id}>
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
        <span className="parameterizer-value">{formatMineralGrowthControlValue(value, control)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row mineral-growth-control-row" htmlFor={id}>
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
      <span className="parameterizer-value">{formatMineralGrowthControlValue(value, control)}</span>
    </label>
  );
}

function MineralGrowthPanel({ config, saveStatus, onChange, onReset, onSave }) {
  const [collapsed, setCollapsed] = useState(shouldCollapsePanelByDefault);
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(
    MINERAL_GROWTH_CONTROL_GROUPS.map((group) => [group.title, group.initiallyOpen !== false]),
  ));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const query = window.matchMedia('(max-width: 700px)');
    const syncCollapsedState = (event) => {
      setCollapsed(event.matches);
    };

    query.addEventListener('change', syncCollapsedState);
    return () => query.removeEventListener('change', syncCollapsedState);
  }, []);

  return (
    <aside
      className="parameterizer-panel mineral-growth-panel"
      aria-label="Formation controls"
      data-collapsed={String(collapsed)}
    >
      <div className="parameterizer-header">
        <span>Formation</span>
        <span className="mineral-growth-panel__header-right">
          <span className="mineral-growth-panel__status" role="status" aria-live="polite">
            {saveStatus}
          </span>
          <button
            type="button"
            className="mineral-growth-panel__toggle"
            aria-expanded={!collapsed}
            aria-controls="mineral-growth-panel-content"
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? 'Open' : 'Close'}
          </button>
        </span>
      </div>
      <div id="mineral-growth-panel-content" className="parameterizer-scroll" hidden={collapsed}>
        {MINERAL_GROWTH_CONTROL_GROUPS.map((group) => (
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
            <div className="mineral-growth-panel__rows">
              {group.controls.map((control) => (
                <MineralGrowthControlRow
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

export function MineralGrowthDemo() {
  const isDark = useRenderedThemeIsDark();
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const configRef = useRef(DEFAULT_MINERAL_GROWTH_CONFIG);
  const colorsRef = useRef(DEFAULT_THEME_COLORS);
  const [config, setConfig] = useState(DEFAULT_MINERAL_GROWTH_CONFIG);
  const [designSystem, setDesignSystem] = useState(null);
  const [themeColors, setThemeColors] = useState(() => resolveMineralGrowthTheme(null, isDark));
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
        loadJson(CONFIG_URL, DEFAULT_MINERAL_GROWTH_CONFIG),
        loadJson(DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      setDesignSystem(designSystem);
      setConfig(normalizeMineralGrowthConfig(demoConfig));
      setSaveStatus('loaded');
      setConfigReady(true);
    }

    loadInitialConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setThemeColors(resolveMineralGrowthTheme(designSystem, isDark));
  }, [designSystem, isDark]);

  useEffect(() => {
    configRef.current = config;
    colorsRef.current = themeColors;
    rendererRef.current?.start();
  }, [config, themeColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !configReady) return undefined;

    rendererRef.current = createMineralGrowthRenderer({
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
    setConfig((current) => normalizeMineralGrowthConfig({
      ...current,
      ...resolveMineralGrowthControlPatch(control, value, checked),
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setSaveStatus('reset');
    setConfig(normalizeMineralGrowthConfig(DEFAULT_MINERAL_GROWTH_CONFIG));
    rendererRef.current?.resetSeed();
  }, []);

  const saveConfig = useCallback(async (configToSave = configRef.current) => {
    const normalized = normalizeMineralGrowthConfig(configToSave);
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/mineral-growth/config', {
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
    window.__ABS_MINERAL_GROWTH__ = {
      setConfigPatch: (patch) => {
        setConfig((current) => {
          const next = normalizeMineralGrowthConfig({ ...current, ...patch });
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
      delete window.__ABS_MINERAL_GROWTH__;
    };
  }, [saveConfig]);

  return (
    <section
      className="mineral-growth-demo"
      data-simulation-id={MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      data-panel-visible={String(showControlPanel)}
      style={{ '--mineral-growth-surface': themeColors.active }}
      aria-label="Formation lab"
    >
      <canvas
        ref={canvasRef}
        id="mineral-growth-canvas"
        className="mineral-growth-canvas"
        role="img"
        aria-label="Formation flat growth simulation"
      />
      {showControlPanel ? (
        <MineralGrowthPanel
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
