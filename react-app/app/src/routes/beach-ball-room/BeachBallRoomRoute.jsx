import { buildRouteHref } from '../../lib/routes.js';
import { BeachBallRoomSimulation } from './BeachBallRoomSimulation.jsx';

const homeHref = buildRouteHref('home');

export const BEACH_BALL_ROOM_ROUTE_RUNTIME = {};

export function getBeachBallRoomRouteView() {
  return {
    bodyClass: 'body beach-ball-room-page',
    wallClassName: 'w-embed beach-ball-room-wall',
    wallContent: <BeachBallRoomSimulation />,
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
    mainContent: <main className="ui-center-spacer" aria-label="Beach ball room lab" />,
  };
}
