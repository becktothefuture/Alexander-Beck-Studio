import { useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import './button-bar-playground.css';

function ButtonBarPreview({ activeRouteId, onSelectRoute }) {
  return (
    <section
      className="button-bar-playground__stage"
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

function ButtonBarPanel({ activeRouteId }) {
  const activeTab = SHELL_ROUTE_TABS.find((tab) => tab.routeId === activeRouteId) || SHELL_ROUTE_TABS[0];

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
    </aside>
  );
}

export function ButtonBarPlayground() {
  const [activeRouteId, setActiveRouteId] = useState('home');

  return (
    <main className="button-bar-playground" aria-label="Homepage button bar playground">
      <ButtonBarPreview activeRouteId={activeRouteId} onSelectRoute={setActiveRouteId} />
      <ButtonBarPanel activeRouteId={activeRouteId} />
    </main>
  );
}
