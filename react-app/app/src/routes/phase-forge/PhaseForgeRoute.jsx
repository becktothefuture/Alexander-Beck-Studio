import { buildRouteHref } from '../../lib/routes.js';
import { PhaseForgeDemo } from './PhaseForgeDemo.jsx';

const homeHref = buildRouteHref('home');

export const PHASE_FORGE_ROUTE_RUNTIME = {};

export function getPhaseForgeRouteView() {
  return {
    bodyClass: 'body phase-forge-page',
    wallClassName: 'w-embed phase-forge-wall',
    wallContent: <PhaseForgeDemo />,
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <a href={homeHref} className="gate-back abs-icon-btn" aria-label="Back to home">
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <div className="route-topbar__center" />
          <div className="route-topbar__right ui-top-right" />
        </div>
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-label="Phase Forge lab" />,
  };
}
