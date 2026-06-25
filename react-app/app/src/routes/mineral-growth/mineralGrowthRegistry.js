import { isSimulationInDailyRotation } from '../../data/simulationCatalog.js';

export const MINERAL_GROWTH_SIMULATION_REGISTRY_ENTRY = {
  id: 'mineral-growth',
  label: 'Mineral Growth',
  routeId: 'mineral-growth',
  path: '/lab/mineral-growth.html',
  componentName: 'MineralGrowthDemo',
  enabledInRotation: isSimulationInDailyRotation('mineral-growth'),
};
