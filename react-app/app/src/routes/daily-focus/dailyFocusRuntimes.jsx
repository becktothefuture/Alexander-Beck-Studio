import { Suspense, lazy } from 'react';

const BeachBallRoomRuntime = lazy(() => (
  import('../beach-ball-room/BeachBallRoomRuntime.jsx')
    .then((module) => ({ default: module.BeachBallRoomRuntime }))
));
const NapoleonPointCloudRuntime = lazy(() => (
  import('../concept-simulations/NapoleonPointCloudRuntime.jsx')
    .then((module) => ({ default: module.NapoleonPointCloudRuntime }))
));
const RiftRingsRuntime = lazy(() => (
  import('../concept-simulations/RiftRingsRuntime.jsx')
    .then((module) => ({ default: module.RiftRingsRuntime }))
));
const FlockOfBirdsRuntime = lazy(() => (
  import('../flock-of-birds/FlockOfBirdsRuntime.jsx')
    .then((module) => ({ default: module.FlockOfBirdsRuntime }))
));
const MineralGrowthRuntime = lazy(() => (
  import('../mineral-growth/MineralGrowthRuntime.jsx')
    .then((module) => ({ default: module.MineralGrowthRuntime }))
));
const RepelRoomRuntime = lazy(() => (
  import('../repel-room/RepelRoomRuntime.jsx')
    .then((module) => ({ default: module.RepelRoomRuntime }))
));

function runtimeElement(element) {
  return (
    <Suspense fallback={null}>
      {element}
    </Suspense>
  );
}

export function getDailyFocusPureRuntime(routeId) {
  switch (routeId) {
    case 'repel-room':
      return runtimeElement(<RepelRoomRuntime />);
    case 'flock-of-birds':
      return runtimeElement(<FlockOfBirdsRuntime />);
    case 'mineral-growth':
      return runtimeElement(<MineralGrowthRuntime />);
    case 'beach-ball-room':
      return runtimeElement(<BeachBallRoomRuntime />);
    case 'napoleon-point-cloud':
      return runtimeElement(<NapoleonPointCloudRuntime />);
    case 'rift-rings':
      return runtimeElement(<RiftRingsRuntime />);
    default:
      return null;
  }
}
