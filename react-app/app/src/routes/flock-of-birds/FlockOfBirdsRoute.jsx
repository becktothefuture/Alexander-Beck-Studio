import { buildRouteHref } from '../../lib/routes.js';
import { FlockOfBirdsDemo } from './FlockOfBirdsDemo.jsx';

const homeHref = buildRouteHref('home');

export const FLOCK_OF_BIRDS_ROUTE_RUNTIME = {};

export function getFlockOfBirdsRouteView() {
  return {
    bodyClass: 'body flock-of-birds-page',
    wallClassName: 'w-embed flock-of-birds-wall',
    wallContent: <FlockOfBirdsDemo />,
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
    mainContent: <main className="ui-center-spacer" aria-label="Flock of birds lab" />,
  };
}
