import { isSimulationInDailyRotation } from '../../data/simulationCatalog.js';

export const REPEL_ROOM_SIMULATION_REGISTRY_ENTRY = {
  id: 'repel-room',
  label: 'Tension',
  routeId: 'repel-room',
  path: '/lab/repel-room.html',
  componentName: 'RepelRoomDemo',
  enabledInRotation: isSimulationInDailyRotation('repel-room'),
};
