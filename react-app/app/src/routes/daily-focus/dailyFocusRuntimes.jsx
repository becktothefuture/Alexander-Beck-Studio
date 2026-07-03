import { Suspense, lazy } from 'react';

const BeachBallRoomRuntime = lazy(() => (
  import('../beach-ball-room/BeachBallRoomRuntime.jsx')
    .then((module) => ({ default: module.BeachBallRoomRuntime }))
));
const NapoleonPointCloudRuntime = lazy(() => (
  import('../concept-simulations/NapoleonPointCloudRuntime.jsx')
    .then((module) => ({ default: module.NapoleonPointCloudRuntime }))
));
const PressureMosaicRuntime = lazy(() => (
  import('../concept-simulations/PressureMosaicRuntime.jsx')
    .then((module) => ({ default: module.PressureMosaicRuntime }))
));
const FlockOfBirdsRuntime = lazy(() => (
  import('../flock-of-birds/FlockOfBirdsRuntime.jsx')
    .then((module) => ({ default: module.FlockOfBirdsRuntime }))
));
const MineralGrowthRuntime = lazy(() => (
  import('../mineral-growth/MineralGrowthRuntime.jsx')
    .then((module) => ({ default: module.MineralGrowthRuntime }))
));
const WallRepelRuntime = lazy(() => (
  import('../wall-repel/WallRepelRuntime.jsx')
    .then((module) => ({ default: module.WallRepelRuntime }))
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
    case 'wall-repel':
      return runtimeElement(<WallRepelRuntime />);
    case 'flock-of-birds':
      return runtimeElement(<FlockOfBirdsRuntime />);
    case 'mineral-growth':
      return runtimeElement(<MineralGrowthRuntime />);
    case 'beach-ball-room':
      return runtimeElement(<BeachBallRoomRuntime />);
    case 'pressure-mosaic':
      return runtimeElement(<PressureMosaicRuntime />);
    case 'napoleon-point-cloud':
      return runtimeElement(<NapoleonPointCloudRuntime />);
    default:
      return null;
  }
}
