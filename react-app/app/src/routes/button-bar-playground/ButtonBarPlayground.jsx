import { useEffect, useRef, useState } from 'react';
import { ShellButtonBar } from '../../components/app/ShellButtonBar.jsx';
import { SHELL_ROUTE_TABS } from '../../lib/routes.js';
import './button-bar-playground.css';

const BUTTON_BAR_VARIANT_GROUPS = Object.freeze([
  {
    id: 'physical-studies',
    variants: [
      {
        id: 'final-menu-bar',
        number: '00',
        title: 'Final menu bar',
        description: 'The production choice: Precision Gasket controls with Stepped Cavity wall relief.',
        structure: 'terraced wall channels',
        composition: ['stepped-cavity'],
      },
      {
        id: 'hairline-cutout',
        number: '01',
        title: 'Hairline cutout',
        description: 'Flush wall plates defined by a single dark seam; the selected plate sinks cleanly into its aperture.',
        structure: 'fine horizontal cooling lines',
      },
      {
        id: 'light-edge',
        number: '02',
        title: 'Light edge',
        description: 'A dark upper cut and a pale lower edge give the flush plates a precise machined fit.',
        structure: 'stacked edge-lit fins',
      },
      {
        id: 'continuous-rail',
        number: '03',
        title: 'Continuous rail',
        description: 'The buttons become one fitted control strip, with fine internal joints and a deeper selected bay.',
        structure: 'long recessed guide rails',
      },
      {
        id: 'precision-gasket',
        number: '04',
        title: 'Precision gasket',
        description: 'A narrow double seam suggests a soft mechanical gasket without making the controls look raised.',
        structure: 'paired horizontal pressure bands',
      },
      {
        id: 'stepped-cavity',
        number: '05',
        title: 'Stepped cavity',
        description: 'Each cutout has a shallow inner step; selection drops to the second level with restrained depth.',
        structure: 'terraced wall channels',
      },
      {
        number: '06',
        id: 'ribbed-monolith',
        title: 'Ribbed monolith',
        description: 'The bar sits inside a single architectural wall object whose fine ribs stop around each control cutout.',
        structure: 'dense ribbed wall blocks',
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
    ...(variant.composition || []).map((id) => 'button-bar-playground__sample--' + id),
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
        <div
          className="button-bar-playground__side button-bar-playground__side--left"
          aria-hidden="true"
          data-structure={variant.structure}
        ><i /><i /><i /><i /><i /></div>
        <ShellButtonBar
          activeRouteId={activeRouteId}
          className="button-bar-playground__bar"
          navClassName="button-bar-playground__tabs"
          onRouteSelect={onSelectRoute}
          preview
        />
        <div
          className="button-bar-playground__side button-bar-playground__side--right"
          aria-hidden="true"
          data-structure={variant.structure}
        ><i /><i /><i /><i /><i /></div>
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
          </div>
          <h1 id="button-bar-playground-title">Physical button studies</h1>
          <p>The final production bar followed by six neutral studies. Tap a route to compare the inset state across every version.</p>
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
