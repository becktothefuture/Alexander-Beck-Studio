import { useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import './button-bar-playground.css';

const DEPTH_DEFAULTS = {
  perspective: 2000,
  perspectiveOriginY: -50,
  restZ: 10,
  pressZTravel: 9,
};

function getDepthStyle(depth) {
  return {
    '--button-bar-perspective': `${depth.perspective}px`,
    '--button-bar-perspective-origin-y': `${depth.perspectiveOriginY}vh`,
    '--button-bar-rest-z': `${depth.restZ}px`,
    '--shell-tab-press-z': `${depth.pressZTravel * -1}px`,
    '--shell-tab-press-projection-y': `${Math.max(0, depth.pressZTravel * 0.99).toFixed(2)}px`,
  };
}

function DepthControl({ id, label, value, min, max, step = 1, unit, onChange }) {
  return (
    <label className="button-bar-panel__control" htmlFor={id}>
      <span className="button-bar-panel__control-head">
        <span>{label}</span>
        <span className="button-bar-panel__control-value">{value}{unit}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function ButtonBarPreview({ activeRouteId, onSelectRoute, depth }) {
  return (
    <section
      className="button-bar-playground__stage"
      style={getDepthStyle(depth)}
      aria-label="Bottom bar button playground"
    >
      <ShellButtonBar
        activeRouteId={activeRouteId}
        className="button-bar-playground__bar"
        navClassName="button-bar-playground__tabs"
        onRouteSelect={onSelectRoute}
        preview
      />
    </section>
  );
}

function ButtonBarPanel({ activeRouteId, depth, onDepthChange }) {
  const activeTab = SHELL_ROUTE_TABS.find((tab) => tab.routeId === activeRouteId) || SHELL_ROUTE_TABS[0];
  const updateDepth = (key) => (value) => {
    onDepthChange((currentDepth) => ({
      ...currentDepth,
      [key]: value,
    }));
  };

  return (
    <aside className="parameterizer-panel button-bar-panel" aria-label="Button bar review panel">
      <div className="parameterizer-header">
        <span className="button-bar-panel__title">Button Bar</span>
        <span className="button-bar-panel__status" role="status" aria-live="polite">
          coded
        </span>
      </div>
      <div className="button-bar-panel__readout" aria-label="Current button state">
        <span className="button-bar-panel__readout-label">Active</span>
        <span className="button-bar-panel__readout-value">{activeTab.label}</span>
      </div>
      <div className="button-bar-panel__section">
        <div className="button-bar-panel__section-title">Depth</div>
        <DepthControl
          id="button-bar-perspective"
          label="Perspective"
          value={depth.perspective}
          min={900}
          max={3600}
          step={50}
          unit="px"
          onChange={updateDepth('perspective')}
        />
        <DepthControl
          id="button-bar-origin-y"
          label="Origin Y"
          value={depth.perspectiveOriginY}
          min={-120}
          max={40}
          step={2}
          unit="vh"
          onChange={updateDepth('perspectiveOriginY')}
        />
        <DepthControl
          id="button-bar-rest-z"
          label="Bar Z"
          value={depth.restZ}
          min={0}
          max={28}
          step={1}
          unit="px"
          onChange={updateDepth('restZ')}
        />
        <DepthControl
          id="button-bar-press-z"
          label="Press Z Travel"
          value={depth.pressZTravel}
          min={0}
          max={22}
          step={1}
          unit="px"
          onChange={updateDepth('pressZTravel')}
        />
        <button
          type="button"
          className="button-bar-panel__reset"
          onClick={() => onDepthChange(DEPTH_DEFAULTS)}
        >
          Reset depth
        </button>
      </div>
    </aside>
  );
}

export function ButtonBarPlayground() {
  const [activeRouteId, setActiveRouteId] = useState('home');
  const [depth, setDepth] = useState(DEPTH_DEFAULTS);

  return (
    <main className="button-bar-playground" aria-label="Homepage button bar playground">
      <ButtonBarPreview activeRouteId={activeRouteId} onSelectRoute={setActiveRouteId} depth={depth} />
      <ButtonBarPanel activeRouteId={activeRouteId} depth={depth} onDepthChange={setDepth} />
    </main>
  );
}
