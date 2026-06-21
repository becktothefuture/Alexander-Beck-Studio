import { buildRouteHref } from '../../lib/routes.js';
import { MineralGrowthDemo } from './MineralGrowthDemo.jsx';

const homeHref = buildRouteHref('home');

export const MINERAL_GROWTH_ROUTE_RUNTIME = {};

export function getMineralGrowthRouteView() {
  return {
    bodyClass: 'body mineral-growth-page',
    wallClassName: 'w-embed mineral-growth-wall',
    wallContent: <MineralGrowthDemo />,
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
    mainContent: <main className="ui-center-spacer" aria-label="Mineral Growth lab" />,
  };
}
