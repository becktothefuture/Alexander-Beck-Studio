import { Component, Suspense, lazy } from 'react';
import {
  DAILY_FOCUS_RUNTIME_EXPORTS,
  hasDailyFocusRuntime,
  loadDailyFocusRuntimeModule,
  publishDailyFocusRuntimeFailure,
} from './dailyFocusRuntimeLoader.js';
import { getSimulationLaunchTarget } from '../../data/simulationCatalog.js';

function createLazyRuntime(simulationId) {
  return lazy(() => loadDailyFocusRuntimeModule(simulationId).then((module) => ({
    default: module[DAILY_FOCUS_RUNTIME_EXPORTS[simulationId]],
  })));
}

const RUNTIME_COMPONENTS = Object.freeze({
  'beach-ball-room': createLazyRuntime('beach-ball-room'),
  'napoleon-point-cloud': createLazyRuntime('napoleon-point-cloud'),
  'rift-rings': createLazyRuntime('rift-rings'),
  'flock-of-birds': createLazyRuntime('flock-of-birds'),
  'mineral-growth': createLazyRuntime('mineral-growth'),
  'repel-room': createLazyRuntime('repel-room'),
});

class DailyFocusRuntimeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    publishDailyFocusRuntimeFailure(this.props.simulationId, error);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="daily-focus-runtime-status" data-runtime-status="failed" role="status">
          <span>Simulation failed to load.</span>
          <button
            type="button"
            onClick={() => {
              const target = getSimulationLaunchTarget(this.props.simulationId);
              window.location.assign(target?.href || window.location.href);
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function runtimeLoadingState() {
  return (
    <div className="daily-focus-runtime-status" data-runtime-status="loading" role="status">
      <span>Loading simulation…</span>
    </div>
  );
}

function dailyFocusRuntimeSlot(simulationId) {
  const Runtime = RUNTIME_COMPONENTS[simulationId];
  return (
    <DailyFocusRuntimeErrorBoundary simulationId={simulationId}>
      <Suspense fallback={runtimeLoadingState()}>
        <Runtime />
      </Suspense>
    </DailyFocusRuntimeErrorBoundary>
  );
}

export function getDailyFocusPureRuntime(routeId) {
  if (!hasDailyFocusRuntime(routeId)) return null;
  return dailyFocusRuntimeSlot(routeId);
}
