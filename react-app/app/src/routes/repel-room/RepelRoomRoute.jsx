import { Suspense, lazy } from 'react';
import { buildRouteHref } from '../../lib/routes.js';

const homeHref = buildRouteHref('home');
const RepelRoomDemo = lazy(() => (
  import('./RepelRoomDemo.jsx').then((module) => ({ default: module.RepelRoomDemo }))
));

export const REPEL_ROOM_ROUTE_RUNTIME = {};

export function getRepelRoomRouteView() {
  return {
    bodyClass: 'body repel-room-page',
    studioWindowClassName: 'w-embed repel-room-wall',
    studioWindowContent: (
      <Suspense fallback={null}>
        <RepelRoomDemo />
      </Suspense>
    ),
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <a href={homeHref} className="gate-back abs-icon-btn abs-circular-utility" aria-label="Back to home">
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </a>
          </div>
          <div className="route-topbar__center" />
          <div className="route-topbar__right ui-top-right" />
        </div>
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-label="Tension lab" />,
  };
}
