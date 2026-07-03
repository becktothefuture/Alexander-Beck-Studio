import { Suspense, lazy } from 'react';
import { buildRouteHref } from '../../lib/routes.js';

const homeHref = buildRouteHref('home');
const MineralGrowthDemo = lazy(() => (
  import('./MineralGrowthDemo.jsx').then((module) => ({ default: module.MineralGrowthDemo }))
));

export const MINERAL_GROWTH_ROUTE_RUNTIME = {};

export function getMineralGrowthRouteView() {
  return {
    bodyClass: 'body mineral-growth-page',
    wallClassName: 'w-embed mineral-growth-wall',
    wallContent: (
      <Suspense fallback={null}>
        <MineralGrowthDemo />
      </Suspense>
    ),
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
