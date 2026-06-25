import { isSimulationInDailyRotation } from '../../data/simulationCatalog.js';

export const FLOCK_OF_BIRDS_SIMULATION_REGISTRY_ENTRY = {
  id: 'flock-of-birds',
  label: 'Flock of Birds',
  routeId: 'flock-of-birds',
  path: '/lab/flock-of-birds.html',
  componentName: 'FlockOfBirdsDemo',
  enabledInRotation: isSimulationInDailyRotation('flock-of-birds'),
};
