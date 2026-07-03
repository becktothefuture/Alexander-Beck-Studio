import { getDailyFocusSimulations, getSimulationLaunchTarget } from '../../data/simulationCatalog.js';
import { getHomeRouteView } from '../home/HomeRoute.jsx';
import { getDailyFocusPureRuntime } from './dailyFocusRuntimes.jsx';
import { SimulationStage } from './SimulationStage.jsx';

const DAILY_FOCUS_ROUTE_IDS = new Set(
  getDailyFocusSimulations()
    .map((entry) => getSimulationLaunchTarget(entry.id))
    .filter((target) => target?.surface === 'lab-route')
    .map((target) => target.id),
);

function isDailyQuery(search = '') {
  return new URLSearchParams(search).get('daily') === '1';
}

function getCurrentSearch() {
  if (typeof window === 'undefined') return '';
  return window.location.search;
}

export function isDailyFocusRouteRequest(routeId, search = getCurrentSearch()) {
  return DAILY_FOCUS_ROUTE_IDS.has(routeId) && isDailyQuery(search);
}

export function getDailyFocusRouteView(routeId) {
  const homeView = getHomeRouteView();
  const wallContent = getDailyFocusPureRuntime(routeId);

  if (!wallContent) return homeView;

  return {
    ...homeView,
    bodyClass: 'body daily-focus-page noise-ready wall-shadow-plate-ready',
    htmlClassName: 'js-enabled abs-home-post-boot-complete',
    wallClassName: 'ball-simulation w-embed daily-focus-wall',
    wallContent: (
      <SimulationStage simulationId={routeId}>
        {wallContent}
      </SimulationStage>
    ),
  };
}
