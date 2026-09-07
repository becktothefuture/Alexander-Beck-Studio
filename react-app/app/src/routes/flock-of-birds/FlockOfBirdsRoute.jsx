import { ActionButton } from '../../components/app/ActionButton.jsx';
import { Suspense, lazy } from 'react';
import { buildRouteHref } from '../../lib/routes.js';

const homeHref = buildRouteHref('home');
const FlockOfBirdsDemo = lazy(() => (
  import('./FlockOfBirdsDemo.jsx').then((module) => ({ default: module.FlockOfBirdsDemo }))
));

export const FLOCK_OF_BIRDS_ROUTE_RUNTIME = {};

export function getFlockOfBirdsRouteView() {
  return {
    bodyClass: 'body flock-of-birds-page',
    studioWindowClassName: 'w-embed flock-of-birds-wall',
    studioWindowContent: (
      <Suspense fallback={null}>
        <FlockOfBirdsDemo />
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
    mainContent: <main className="ui-center-spacer" aria-label="Convergence lab" />,
  };
}
