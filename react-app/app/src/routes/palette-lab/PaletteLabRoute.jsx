import { buildRouteHref } from '../../lib/routes.js';
import { PaletteLabExperience } from './PaletteLabExperience.jsx';

const homeHref = buildRouteHref('home');

export const PALETTE_LAB_ROUTE_RUNTIME = {};

export function getPaletteLabRouteView() {
  return {
    bodyClass: 'body palette-lab-page',
    wallClassName: 'w-embed palette-lab-wall',
    wallContent: (
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
            <a href={homeHref} className="gate-back abs-icon-btn" aria-label="Back to home">
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <div className="route-topbar__center palette-lab-topbar__center">
            <span className="palette-lab-topbar__label">Palette review</span>
          </div>
          <div className="route-topbar__right ui-top-right">
            <blockquote className="decorative-script palette-lab-topline">
              <p>Four London weather chapters, reviewed against the existing simulation surface.</p>
            </blockquote>
          </div>
        </div>
      </header>
    ),
    mainContent: (
      <main className="ui-center-spacer palette-lab-main" aria-label="London weather palette review">
        <PaletteLabExperience />
      </main>
    ),
  };
}
