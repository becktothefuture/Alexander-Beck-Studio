import { ActionButton } from '../../components/app/ActionButton.jsx';
import { Suspense, lazy } from 'react';
import { buildRouteHref } from '../../lib/routes.js';

const homeHref = buildRouteHref('home');
const BeachBallRoomSimulation = lazy(() => (
  import('./BeachBallRoomSimulation.jsx').then((module) => ({ default: module.BeachBallRoomSimulation }))
));

export const BEACH_BALL_ROOM_ROUTE_RUNTIME = {};

export function getBeachBallRoomRouteView() {
  return {
    bodyClass: 'body beach-ball-room-page',
    studioWindowClassName: 'w-embed beach-ball-room-wall',
    studioWindowContent: (
      <Suspense fallback={null}>
        <BeachBallRoomSimulation />
      </Suspense>
    ),
    headerContent: (
      <header className="ui-top">
        <div className="ui-top-main route-topbar">
          <div className="route-topbar__left">
            <ActionButton variant="icon" href={homeHref} className="gate-back" aria-label="Back to home">
              <i className="ti ti-arrow-left" aria-hidden="true" />
            </ActionButton>
          </div>
          <div className="route-topbar__center" />
          <div className="route-topbar__right ui-top-right" />
        </div>
      </header>
    ),
    mainContent: <main className="ui-center-spacer" aria-label="Beach ball room lab" />,
  };
}
