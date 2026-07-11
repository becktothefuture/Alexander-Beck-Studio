import { useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import './button-bar-playground.css';

const BUTTON_BAR_VARIANTS = Object.freeze([
  {
    id: 'current',
    number: '00',
    title: 'Current',
    description: 'The production button bar, unchanged.',
  },
  {
    id: 'reduced-radius',
    number: '01',
    title: 'Lower radius',
    description: 'The current treatment with calmer, less pill-like corners.',
  },
  {
    id: 'contrast-plate',
    number: '02',
    title: 'Colour plate',
    description: 'A dimensional route-colour surface with black or white contrast type.',
  },
  {
    id: 'kinetic-shader',
    number: '03',
    title: 'Kinetic shader',
    description: 'A lightweight, perpetual material field unique to each active route.',
  },
  {
    id: 'flat-colour',
    number: '04',
    title: 'Flat colour',
    description: 'The route colour as one solid, shadowless active surface.',
  },
  {
    id: 'selection-lamp',
    number: '05',
    title: 'Selection lamp',
    description: 'Neutral type with a small route-colour light at the button base.',
  },
]);

function ButtonBarVariant({ variant, activeRouteId, onSelectRoute }) {
  const headingId = 'button-bar-variant-' + variant.id;
  const sampleClassName = [
    'button-bar-playground__sample',
    'button-bar-playground__sample--' + variant.id,
  ].join(' ');

  return (
    <article className={sampleClassName} aria-labelledby={headingId}>
      <header className="button-bar-playground__sample-header">
        <span className="button-bar-playground__sample-number" aria-hidden="true">
          {variant.number}
        </span>
        <div className="button-bar-playground__sample-copy">
          <h2 id={headingId}>{variant.title}</h2>
          <p>{variant.description}</p>
        </div>
      </header>
      <div className="button-bar-playground__stage">
        <ShellButtonBar
          activeRouteId={activeRouteId}
          className="button-bar-playground__bar"
          navClassName="button-bar-playground__tabs"
          onRouteSelect={onSelectRoute}
          preview
        />
      </div>
    </article>
  );
}

export function ButtonBarPlayground() {
  const [activeRouteId, setActiveRouteId] = useState('about');
  const activeTab = SHELL_ROUTE_TABS.find((tab) => tab.routeId === activeRouteId)
    || SHELL_ROUTE_TABS[0];

  return (
    <main className="button-bar-playground" aria-labelledby="button-bar-playground-title">
      <header className="button-bar-playground__header">
        <div className="button-bar-playground__intro">
          <div className="button-bar-playground__eyebrow">
            <span>Playground / Button Bar</span>
            <span className="button-bar-playground__palette" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>
          <h1 id="button-bar-playground-title">Active-state studies</h1>
          <p>Tap a route in any row to compare that state across every version.</p>
        </div>
        <div className="button-bar-playground__readout" role="status" aria-live="polite">
          <span>Previewing</span>
          <strong>{activeTab.label}</strong>
        </div>
      </header>

      <section className="button-bar-playground__samples" aria-label="Button bar variants">
        {BUTTON_BAR_VARIANTS.map((variant) => (
          <ButtonBarVariant
            key={variant.id}
            variant={variant}
            activeRouteId={activeRouteId}
            onSelectRoute={setActiveRouteId}
          />
        ))}
      </section>
    </main>
  );
}
