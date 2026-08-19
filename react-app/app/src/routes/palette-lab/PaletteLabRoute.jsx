import { lazy, Suspense } from 'react';
import { buildRouteHref } from '../../lib/routes.js';

const PaletteLabExperience = lazy(() => (
  import('./PaletteLabExperience.jsx')
    .then((module) => ({ default: module.PaletteLabExperience }))
));

const homeHref = buildRouteHref('home');

export const PALETTE_LAB_ROUTE_RUNTIME = {
  exportName: 'bootstrapPaletteLab',
  loadModule: () => import('./palette-lab-bootstrap.js'),
};

export function getPaletteLabRouteView() {
  return {
    bodyClass: 'body palette-lab-page',
    htmlClassName: 'palette-lab-shell',
    studioWindowClassName: 'w-embed palette-lab-wall',
    studioWindowContent: (
      <div className="palette-lab-backdrop" aria-hidden="true">
        <div className="palette-lab-backdrop__layer palette-lab-backdrop__layer--a" />
        <div className="palette-lab-backdrop__layer palette-lab-backdrop__layer--b" />
        <div className="palette-lab-backdrop__grid" />
      </div>
    ),
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <a href={homeHref} className="gate-back abs-icon-btn abs-circular-utility" aria-label="Back to home">
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <div className="route-topbar__center palette-lab-topbar__center" />
          <div className="route-topbar__right ui-top-right" />
        </div>
      </header>
    ),
    mainContent: (
      <main className="ui-center-spacer palette-lab-main" aria-label="London production colour system">
        <Suspense fallback={null}>
          <PaletteLabExperience />
        </Suspense>
      </main>
    ),
  };
}
