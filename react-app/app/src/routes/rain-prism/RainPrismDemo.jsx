import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_RAIN_PRISM_CONFIG,
  RAIN_PRISM_CONTROL_GROUPS,
  formatControlValue,
  normalizeRainPrismConfig,
} from './rainPrismControls.js';
import { RAIN_PRISM_SIMULATION_REGISTRY_ENTRY } from './rainPrismRegistry.js';
import { createRainPrismRenderer } from './rainPrismRenderer.js';
import './rain-prism.css';

const CONFIG_URL = '/config/rain-prism-demo.json';
const DESIGN_SYSTEM_URL = '/config/design-system.json';

const DEFAULT_THEME_COLORS = {
  light: '#efefef',
  dark: '#202020',
  active: '#202020',
};

function getActiveSurfaceColor(config, colors) {
  return config.theme === 'light' ? colors.light : colors.dark;
}

function getSurfaceColorsForMode(colors, mode) {
  return {
    ...colors,
    active: mode === 'light' ? colors.light : colors.dark,
  };
}

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
  anchor.download = 'rain-prism-demo.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}

function coerceControlValue(control, value, checked) {
  if (control.type === 'checkbox') return Boolean(checked);
  if (control.type === 'range') return Number(value);
  return value;
}

function RainPrismControlRow({ control, value, onChange }) {
  const id = `rain-prism-control-${control.id}`;

  if (control.type === 'checkbox') {
    return (
      <label className="parameterizer-row rain-prism-control-row" htmlFor={id}>
        <span className="parameterizer-label" title={control.label}>{control.label}</span>
        <span className="parameterizer-control parameterizer-control--check">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(control, event.target.value, event.target.checked)}
          />
        </span>
        <span className="parameterizer-value">{formatControlValue(value)}</span>
      </label>
    );
  }

  if (control.type === 'select') {
    return (
      <label className="parameterizer-row rain-prism-control-row" htmlFor={id}>
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
        <span className="parameterizer-value">{formatControlValue(value)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row rain-prism-control-row" htmlFor={id}>
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
      <span className="parameterizer-value">{formatControlValue(value)}</span>
    </label>
  );
}

function RainPrismPanel({ config, saveStatus, onChange, onReset, onSave }) {
  return (
    <aside className="parameterizer-panel rain-prism-panel" aria-label="Rain prism controls">
      <div className="parameterizer-header">
        <span>Rain Prism</span>
        <span className="rain-prism-panel__status">{saveStatus}</span>
      </div>
      <div className="parameterizer-scroll">
        {RAIN_PRISM_CONTROL_GROUPS.map((group) => (
          <details key={group.title} className="parameterizer-folder" open>
            <summary className="parameterizer-folder-title">{group.title}</summary>
            <div className="rain-prism-panel__rows">
              {group.controls.map((control) => (
                <RainPrismControlRow
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

export function RainPrismDemo() {
  const lightBaseCanvasRef = useRef(null);
  const lightOverlayCanvasRef = useRef(null);
  const darkBaseCanvasRef = useRef(null);
  const darkOverlayCanvasRef = useRef(null);
  const rendererRefs = useRef({ light: null, dark: null });
  const configRef = useRef(DEFAULT_RAIN_PRISM_CONFIG);
  const colorsRef = useRef(DEFAULT_THEME_COLORS);
  const initialThemeRef = useRef(null);
  const [config, setConfig] = useState(DEFAULT_RAIN_PRISM_CONFIG);
  const [themeColors, setThemeColors] = useState(DEFAULT_THEME_COLORS);
  const [saveStatus, setSaveStatus] = useState('loaded');

  const reducedMotion = useMemo(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ), []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialConfig() {
      const [demoConfig, designSystem] = await Promise.all([
        loadJson(CONFIG_URL, DEFAULT_RAIN_PRISM_CONFIG),
        loadJson(DESIGN_SYSTEM_URL, null),
      ]);

      if (cancelled) return;
      const shellTheme = designSystem?.shell?.theme || {};
      const nextColors = {
        light: shellTheme.wallBaseLight || DEFAULT_THEME_COLORS.light,
        dark: shellTheme.wallBaseDark || DEFAULT_THEME_COLORS.dark,
        active: DEFAULT_THEME_COLORS.active,
      };
      const nextConfig = normalizeRainPrismConfig(demoConfig);
      nextColors.active = getActiveSurfaceColor(nextConfig, nextColors);

      setThemeColors(nextColors);
      setConfig(nextConfig);
      setSaveStatus('loaded');
    }

    loadInitialConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    configRef.current = config;
    colorsRef.current = {
      ...themeColors,
      active: getActiveSurfaceColor(config, themeColors),
    };
    Object.values(rendererRefs.current).forEach((renderer) => renderer?.start());
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
    const activeColor = getActiveSurfaceColor(config, themeColors);
    const isDark = config.theme === 'dark';
    root.classList.toggle('dark-mode', isDark);
    document.body.classList.toggle('dark-mode', isDark);
    root.style.setProperty('--abs-wall-base-light', themeColors.light);
    root.style.setProperty('--abs-wall-base-dark', themeColors.dark);
    root.style.setProperty('--abs-wall-base', activeColor);
    root.style.setProperty('--frame-inner-surface', 'var(--abs-wall-base)');

    return undefined;
  }, [config, themeColors]);

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
    const lightBaseCanvas = lightBaseCanvasRef.current;
    const lightOverlayCanvas = lightOverlayCanvasRef.current;
    const darkBaseCanvas = darkBaseCanvasRef.current;
    const darkOverlayCanvas = darkOverlayCanvasRef.current;
    if (!lightBaseCanvas || !lightOverlayCanvas || !darkBaseCanvas || !darkOverlayCanvas) return undefined;

    rendererRefs.current.light = createRainPrismRenderer({
      baseCanvas: lightBaseCanvas,
      overlayCanvas: lightOverlayCanvas,
      reducedMotion,
      getConfig: () => configRef.current,
      getTheme: () => getSurfaceColorsForMode(colorsRef.current, 'light'),
    });
    rendererRefs.current.dark = createRainPrismRenderer({
      baseCanvas: darkBaseCanvas,
      overlayCanvas: darkOverlayCanvas,
      reducedMotion,
      getConfig: () => configRef.current,
      getTheme: () => getSurfaceColorsForMode(colorsRef.current, 'dark'),
    });

    const handleResize = () => {
      Object.values(rendererRefs.current).forEach((renderer) => renderer?.start());
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      Object.values(rendererRefs.current).forEach((renderer) => renderer?.destroy());
      rendererRefs.current = { light: null, dark: null };
    };
  }, [reducedMotion]);

  const updateControl = useCallback((control, value, checked) => {
    setSaveStatus('edited');
    setConfig((current) => normalizeRainPrismConfig({
      ...current,
      [control.id]: coerceControlValue(control, value, checked),
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setSaveStatus('reset');
    setConfig(normalizeRainPrismConfig(DEFAULT_RAIN_PRISM_CONFIG));
  }, []);

  const saveConfig = useCallback(async (configToSave = configRef.current) => {
    const normalized = normalizeRainPrismConfig(configToSave);
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/rain-prism/config', {
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
    window.__ABS_RAIN_PRISM__ = {
      setConfigPatch: (patch) => {
        setConfig((current) => normalizeRainPrismConfig({ ...current, ...patch }));
      },
      getConfig: () => configRef.current,
      getThemeColors: () => colorsRef.current,
      renderOnce: () => {
        Object.values(rendererRefs.current).forEach((renderer) => renderer?.renderOnce());
      },
      getMetrics: () => ({
        light: rendererRefs.current.light?.getMetrics(),
        dark: rendererRefs.current.dark?.getMetrics(),
      }),
      save: () => saveConfig(configRef.current),
    };

    return () => {
      delete window.__ABS_RAIN_PRISM__;
    };
  }, [saveConfig]);

  const activeColor = getActiveSurfaceColor(config, themeColors);

  return (
    <section
      className="rain-prism-demo"
      data-theme={config.theme}
      data-simulation-id={RAIN_PRISM_SIMULATION_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(RAIN_PRISM_SIMULATION_REGISTRY_ENTRY.enabledInRotation)}
      style={{
        '--rain-prism-surface': activeColor,
        '--rain-prism-overlay-blend': config.blendMode,
      }}
      aria-label="Rain prism display lab"
    >
      <div className="rain-prism-split" aria-hidden="true">
        <div
          className="rain-prism-stage rain-prism-stage--light"
          data-prism-theme="light"
          style={{ '--rain-prism-stage-surface': themeColors.light }}
        >
          <canvas
            ref={lightBaseCanvasRef}
            id="rain-prism-base-light"
            className="rain-prism-canvas rain-prism-canvas--base"
            aria-hidden="true"
          />
          <canvas
            ref={lightOverlayCanvasRef}
            id="rain-prism-overlay-light"
            className="rain-prism-canvas rain-prism-canvas--overlay"
            aria-hidden="true"
          />
        </div>
        <div
          className="rain-prism-stage rain-prism-stage--dark"
          data-prism-theme="dark"
          style={{ '--rain-prism-stage-surface': themeColors.dark }}
        >
          <canvas
            ref={darkBaseCanvasRef}
            id="rain-prism-base-dark"
            className="rain-prism-canvas rain-prism-canvas--base"
            aria-hidden="true"
          />
          <canvas
            ref={darkOverlayCanvasRef}
            id="rain-prism-overlay-dark"
            className="rain-prism-canvas rain-prism-canvas--overlay"
            aria-hidden="true"
          />
        </div>
      </div>
      <div className="rain-prism-demo__grain" aria-hidden="true" />
      <RainPrismPanel
        config={config}
        saveStatus={saveStatus}
        onChange={updateControl}
        onReset={resetConfig}
        onSave={() => saveConfig(config)}
      />
    </section>
  );
}
