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
  DEFAULT_DAILY_FOCUS_THEME,
  useDailyFocusTheme,
} from '../daily-focus/dailyFocusTheme.js';
import { withBasePath } from '../../lib/base-path.js';
import './repel-room-runtime.css';
import './repel-room.css';

const CONFIG_URL = withBasePath('/config/repel-room-demo.json');
const DESIGN_SYSTEM_URL = withBasePath('/config/design-system.json');

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
    <aside className="parameterizer-panel repel-room-panel" aria-label="Tension controls">
      <div className="parameterizer-header">
        <span>Tension</span>
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
  const colorsRef = useRef(DEFAULT_DAILY_FOCUS_THEME);
  const [config, setConfig] = useState(DEFAULT_REPEL_ROOM_CONFIG);
  const [designSystem, setDesignSystem] = useState(null);
  const themeColors = useDailyFocusTheme(designSystem);
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
      setDesignSystem(designSystem);
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
      aria-label="Tension lab"
    >
      <canvas
        ref={canvasRef}
        id="repel-room-canvas"
        className="repel-room-canvas"
        role="img"
        aria-label="Tension flat ball simulation"
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
