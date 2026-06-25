import { isSimulationInDailyRotation } from '../../data/simulationCatalog.js';

export const RAIN_PRISM_SIMULATION_REGISTRY_ENTRY = {
  id: 'rain-prism',
  label: 'Rain Prism',
  routeId: 'rain-prism',
  path: '/lab/rain-prism.html',
  componentName: 'RainPrismDemo',
  enabledInRotation: isSimulationInDailyRotation('rain-prism'),
};
