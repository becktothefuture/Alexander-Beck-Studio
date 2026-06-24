import { buildRouteHref } from '../../lib/routes.js';
import { ConceptSimulationDemo } from './ConceptSimulationDemo.jsx';
import {
  CONCEPT_SIMULATION_IDS,
  CONCEPT_SIMULATION_REGISTRY,
} from './conceptSimulationConfigs.js';

const homeHref = buildRouteHref('home');

export const APERTURE_BLOOM_ROUTE_RUNTIME = {};
export const PRESSURE_MOSAIC_ROUTE_RUNTIME = {};
export const NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME = {};

function getConceptSimulationRouteView(simulationId) {
  const entry = CONCEPT_SIMULATION_REGISTRY[simulationId];

  return {
    bodyClass: `body concept-simulation-page ${simulationId}-page`,
    wallClassName: `w-embed concept-simulation-wall ${simulationId}-wall`,
    wallContent: <ConceptSimulationDemo simulationId={simulationId} />,
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
    mainContent: <main className="ui-center-spacer" aria-label={`${entry.name} lab`} />,
  };
}

export function getApertureBloomRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.APERTURE_BLOOM);
}

export function getPressureMosaicRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC);
}

export function getNapoleonPointCloudRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD);
}
