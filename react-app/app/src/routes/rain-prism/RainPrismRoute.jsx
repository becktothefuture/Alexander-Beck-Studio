import { buildRouteHref } from '../../lib/routes.js';
import { RainPrismDemo } from './RainPrismDemo.jsx';

const homeHref = buildRouteHref('home');

export const RAIN_PRISM_ROUTE_RUNTIME = {};

export function getRainPrismRouteView() {
  return {
    bodyClass: 'body rain-prism-page',
    wallClassName: 'w-embed rain-prism-wall',
    wallContent: <RainPrismDemo />,
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
    mainContent: <main className="ui-center-spacer" aria-label="Rain prism lab" />,
  };
}
