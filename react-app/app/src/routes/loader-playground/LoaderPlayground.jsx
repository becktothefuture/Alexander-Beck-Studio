import { useCallback, useEffect, useMemo, useState } from 'react';
import { withBasePath } from '../../lib/base-path.js';
import {
  DEFAULT_LOADER_PLAYGROUND_CONFIG,
  LOADER_DOT_COLORS,
  LOADER_PLAYGROUND_CONTROL_GROUPS,
  LOADER_PLAYGROUND_VARIANTS,
  formatLoaderPlaygroundControlValue,
  getLoaderVariantDefinition,
  normalizeLoaderPlaygroundConfig,
  resolveLoaderPlaygroundControlPatch,
  resolveLoaderPlaygroundControlValue,
} from './loaderPlaygroundControls.js';
import { LOADER_PLAYGROUND_REGISTRY_ENTRY } from './loaderPlaygroundRegistry.js';
import './loader-playground.css';

const CONFIG_URL = withBasePath('/config/loader-playground-demo.json');

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
  anchor.download = 'loader-playground-demo.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}

function LoaderAnimation({ variant, settings }) {
  const style = {
    '--loader-duration': `${settings.durationMs}ms`,
    '--loader-color-cycle': `${settings.colorCycleMs}ms`,
    '--loader-dot-size': `${settings.dotSize}px`,
  };

  return (
    <div
      className={`loader-sample loader-sample--${variant.id} loader-sample--color-${settings.colorMode}`}
      style={style}
      aria-hidden="true"
    >
      <div className="loader-orbit">
        <div className="loader-ring-plane">
          <div className="loader-radius-plane">
            <div className="loader-ring">
              {LOADER_DOT_COLORS.map((color, index) => {
                const angle = index * 60;
                const colorDelay = settings.colorSyncDelayMs
                  + (settings.colorPhaseDirection * index * settings.colorPhaseStepMs);
                return (
                  <span
                    key={`${variant.id}-${color}`}
                    className="loader-dot"
                    style={{
                      '--dot-angle': `${angle}deg`,
                      '--dot-counter-angle': `${-angle}deg`,
                      '--dot-radius': `${settings.radius}px`,
                      '--dot-radius-negative': `${-settings.radius}px`,
                      '--dot-color': color,
                      '--dot-color-delay': `${colorDelay}ms`,
                    }}
                  >
                    <span className="loader-dot-core" />
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoaderCard({ config, isSelected, onSelect, variant }) {
  const settings = config.variants[variant.id] || variant.defaults;
  return (
    <button
      type="button"
      className={`loader-playground-card${isSelected ? ' is-selected' : ''}`}
      onClick={() => onSelect(variant.id)}
      aria-pressed={isSelected}
      aria-label={`${variant.label} loader variant`}
    >
      <span className="loader-playground-card__meta">
        <span className="loader-playground-card__index">
          {String(LOADER_PLAYGROUND_VARIANTS.findIndex((item) => item.id === variant.id) + 1).padStart(2, '0')}
        </span>
        <span className="loader-playground-card__label">{variant.label}</span>
      </span>
      <LoaderAnimation variant={variant} settings={settings} />
    </button>
  );
}

function LoaderPlaygroundControlRow({ config, control, onChange }) {
  const id = `loader-playground-control-${control.id}`;
  const value = resolveLoaderPlaygroundControlValue(control, config);
  const rangeValue = Number.isFinite(Number(value))
    ? Number(value)
    : Number(control.min || 0);

  if (control.type === 'select') {
    return (
      <label className="parameterizer-row loader-playground-control-row" htmlFor={id}>
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
        <span className="parameterizer-value">{formatLoaderPlaygroundControlValue(value, control)}</span>
      </label>
    );
  }

  return (
    <label className="parameterizer-row loader-playground-control-row" htmlFor={id}>
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
      <span className="parameterizer-value">{formatLoaderPlaygroundControlValue(value, control)}</span>
    </label>
  );
}

function LoaderPlaygroundPanel({ config, saveStatus, onChange, onReset, onSave }) {
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(
    LOADER_PLAYGROUND_CONTROL_GROUPS.map((group) => [group.title, group.initiallyOpen !== false]),
  ));
  const activeVariant = getLoaderVariantDefinition(config.selectedVariant);

  return (
    <aside className="parameterizer-panel loader-playground-panel" aria-label="Loader playground controls">
      <div className="parameterizer-header">
        <span className="loader-playground-panel__title">
          <span>Loader</span>
          <span>Playground</span>
        </span>
        <span className="loader-playground-panel__status" role="status" aria-live="polite">
          {saveStatus}
        </span>
      </div>
      <div className="loader-playground-panel__active" aria-live="polite">
        <span>{activeVariant.label}</span>
        <span>{activeVariant.summary}</span>
      </div>
      <div className="parameterizer-scroll">
        {LOADER_PLAYGROUND_CONTROL_GROUPS.map((group) => (
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
            <div className="loader-playground-panel__rows">
              {group.controls.map((control) => (
                <LoaderPlaygroundControlRow
                  key={control.id}
                  config={config}
                  control={control}
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

export function LoaderPlayground() {
  const [config, setConfig] = useState(DEFAULT_LOADER_PLAYGROUND_CONFIG);
  const [saveStatus, setSaveStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    async function loadInitialConfig() {
      const nextConfig = await loadJson(CONFIG_URL, DEFAULT_LOADER_PLAYGROUND_CONFIG);
      if (cancelled) return;
      setConfig(normalizeLoaderPlaygroundConfig(nextConfig));
      setSaveStatus('loaded');
    }

    loadInitialConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateControl = useCallback((control, value, checked) => {
    setSaveStatus('edited');
    setConfig((current) => normalizeLoaderPlaygroundConfig({
      ...current,
      ...resolveLoaderPlaygroundControlPatch(control, value, checked, current),
    }));
  }, []);

  const selectVariant = useCallback((variantId) => {
    updateControl({ id: 'selectedVariant', scope: 'root', type: 'select' }, variantId, false);
  }, [updateControl]);

  const resetConfig = useCallback(() => {
    setSaveStatus('reset');
    setConfig(normalizeLoaderPlaygroundConfig(DEFAULT_LOADER_PLAYGROUND_CONFIG));
  }, []);

  const saveConfig = useCallback(async (configToSave = config) => {
    const normalized = normalizeLoaderPlaygroundConfig(configToSave);
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/loader-playground/config', {
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
  }, [config]);

  const normalizedConfig = useMemo(() => normalizeLoaderPlaygroundConfig(config), [config]);

  useEffect(() => {
    window.__ABS_LOADER_PLAYGROUND__ = {
      getConfig: () => normalizeLoaderPlaygroundConfig(config),
      setConfigPatch: (patch) => {
        setSaveStatus('edited');
        setConfig((current) => normalizeLoaderPlaygroundConfig({ ...current, ...patch }));
      },
      save: () => saveConfig(config),
    };

    return () => {
      delete window.__ABS_LOADER_PLAYGROUND__;
    };
  }, [config, saveConfig]);

  return (
    <main
      className="loader-playground"
      data-simulation-id={LOADER_PLAYGROUND_REGISTRY_ENTRY.id}
      data-enabled-in-rotation={String(LOADER_PLAYGROUND_REGISTRY_ENTRY.enabledInRotation)}
      aria-label="Loader animation playground"
    >
      <section className="loader-playground__grid" aria-label="Loader animation approaches">
        {LOADER_PLAYGROUND_VARIANTS.map((variant) => (
          <LoaderCard
            key={variant.id}
            config={normalizedConfig}
            isSelected={normalizedConfig.selectedVariant === variant.id}
            onSelect={selectVariant}
            variant={variant}
          />
        ))}
      </section>
      <LoaderPlaygroundPanel
        config={normalizedConfig}
        saveStatus={saveStatus}
        onChange={updateControl}
        onReset={resetConfig}
        onSave={() => saveConfig(normalizedConfig)}
      />
    </main>
  );
}
