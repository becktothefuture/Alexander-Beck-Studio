import { Suspense, lazy } from 'react';
import { buildRouteHref } from '../../lib/routes.js';

const homeHref = buildRouteHref('home');
const WallRepelDemo = lazy(() => (
  import('./WallRepelDemo.jsx').then((module) => ({ default: module.WallRepelDemo }))
));

export const WALL_REPEL_ROUTE_RUNTIME = {};

export function getWallRepelRouteView() {
  return {
    bodyClass: 'body wall-repel-page',
    wallClassName: 'w-embed wall-repel-wall',
    wallContent: (
      <Suspense fallback={null}>
        <WallRepelDemo />
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
    mainContent: <main className="ui-center-spacer" aria-label="Repel Room lab" />,
  };
}
