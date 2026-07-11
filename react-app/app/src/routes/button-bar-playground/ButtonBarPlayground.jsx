import { useEffect, useRef, useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import './button-bar-playground.css';

const BUTTON_BAR_VARIANT_GROUPS = Object.freeze([
  {
    id: 'current-studies',
    variants: [
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
        usesRouteAccent: true,
      },
      {
        id: 'kinetic-shader',
        number: '03',
        title: 'Kinetic shader',
        description: 'A lightweight, perpetual material field unique to each active route.',
        usesRouteAccent: true,
      },
      {
        id: 'flat-colour',
        number: '04',
        title: 'Flat colour',
        description: 'The route colour as one solid, shadowless active surface.',
        family: 'flat',
        usesRouteAccent: true,
      },
      {
        id: 'selection-lamp',
        number: '05',
        title: 'Selection lamp',
        description: 'Neutral type with a small route-colour light at the button base.',
        family: 'lamp',
        usesRouteAccent: true,
      },
    ],
  },
  {
    id: 'flat-colour-branches',
    anchor: '04 →',
    title: 'Flat colour branches',
    description: 'Keep the decisive fill; test how much space it occupies and how loudly it speaks.',
    variants: [
      {
        id: 'inset-colour',
        number: '06',
        title: 'Inset colour',
        description: 'The flat fill steps inward, leaving a precise dark perimeter inside the hit area.',
        family: 'flat',
        usesRouteAccent: true,
      },
      {
        id: 'deep-colour',
        number: '07',
        title: 'Deep colour',
        description: 'A quieter full-surface fill, mixed toward black with white type on every route.',
        family: 'flat',
        usesRouteAccent: true,
      },
    ],
  },
  {
    id: 'selection-lamp-branches',
    anchor: '05 →',
    title: 'Selection lamp branches',
    description: 'Keep the typography neutral; test the indicator’s reach and sense of life.',
    variants: [
      {
        id: 'long-lamp',
        number: '08',
        title: 'Long lamp',
        description: 'A wider 28×2 signal: clearer at a glance, while remaining materially quiet.',
        family: 'lamp',
        usesRouteAccent: true,
      },
      {
        id: 'breathing-lamp',
        number: '09',
        title: 'Breathing lamp',
        description: 'The original 10×2 light with a slow brightness pulse and a static fallback.',
        family: 'lamp',
        usesRouteAccent: true,
      },
    ],
  },
  {
    id: 'further-proposals',
    anchor: '→',
    title: 'Further proposals',
    description: 'Two hybrids that borrow from the strongest directions without duplicating them.',
    variants: [
      {
        id: 'tint-lamp',
        number: '10',
        title: 'Tint + lamp',
        description: 'A restrained route tint supports the lamp without becoming another filled tab.',
        family: 'lamp',
        usesRouteAccent: true,
      },
      {
        id: 'signal-dot',
        number: '11',
        title: 'Signal dot',
        description: 'The lamp collapses into a 5px ball, bringing selection into the site’s circle language.',
        family: 'lamp',
        usesRouteAccent: true,
      },
    ],
  },
]);

function ButtonBarVariant({
  variant,
  activeRouteId,
  headingLevel = 'h2',
  onSelectRoute,
}) {
  const sampleRef = useRef(null);
  const Heading = headingLevel;
  const headingId = 'button-bar-variant-' + variant.id;
  const sampleClassName = [
    'button-bar-playground__sample',
    'button-bar-playground__sample--' + variant.id,
  ].join(' ');

  useEffect(() => {
    const nav = sampleRef.current?.querySelector('[data-button-bar-nav]');
    nav?.setAttribute('aria-label', variant.title + ' button bar preview');
  }, [activeRouteId, variant.title]);

  return (
    <article
      ref={sampleRef}
      className={sampleClassName}
      aria-labelledby={headingId}
      data-route-accent={variant.usesRouteAccent ? 'true' : undefined}
      data-variant-family={variant.family}
    >
      <header className="button-bar-playground__sample-header">
        <span className="button-bar-playground__sample-number" aria-hidden="true">
          {variant.number}
        </span>
        <div className="button-bar-playground__sample-copy">
          <Heading id={headingId}>{variant.title}</Heading>
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
        {BUTTON_BAR_VARIANT_GROUPS.map((group) => {
          const groupHeadingId = 'button-bar-group-' + group.id;

          return (
            <section
              key={group.id}
              className={'button-bar-playground__variant-group button-bar-playground__variant-group--' + group.id}
              aria-label={group.title ? undefined : 'Current button bar studies'}
              aria-labelledby={group.title ? groupHeadingId : undefined}
            >
              {group.title ? (
                <header className="button-bar-playground__group-header">
                  <span className="button-bar-playground__group-anchor" aria-hidden="true">
                    {group.anchor}
                  </span>
                  <div className="button-bar-playground__group-copy">
                    <h2 id={groupHeadingId}>{group.title}</h2>
                    <p>{group.description}</p>
                  </div>
                </header>
              ) : null}
              {group.variants.map((variant) => (
                <ButtonBarVariant
                  key={variant.id}
                  variant={variant}
                  activeRouteId={activeRouteId}
                  headingLevel={group.title ? 'h3' : 'h2'}
                  onSelectRoute={setActiveRouteId}
                />
              ))}
            </section>
          );
        })}
      </section>
    </main>
  );
}
