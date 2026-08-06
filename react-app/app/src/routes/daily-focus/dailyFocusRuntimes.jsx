import { Component, Suspense, lazy } from 'react';
import {
  DAILY_FOCUS_RUNTIME_EXPORTS,
  hasDailyFocusRuntime,
  loadDailyFocusRuntimeModule,
  publishDailyFocusRuntimeFailure,
  requestDailyFocusRuntimeDocumentRetry,
} from './dailyFocusRuntimeLoader.js';
import { getSimulationLaunchTarget } from '../../data/simulationCatalog.js';

function createLazyRuntime(simulationId) {
  return lazy(() => loadDailyFocusRuntimeModule(simulationId).then((module) => ({
    default: module[DAILY_FOCUS_RUNTIME_EXPORTS[simulationId]],
  })));
}

const RUNTIME_COMPONENTS = Object.freeze({
  'beach-ball-room': createLazyRuntime('beach-ball-room'),
  'flock-of-birds': createLazyRuntime('flock-of-birds'),
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
              // WebKit keeps a rejected dynamic-import result in its module map.
              // Re-enter through the authored launch URL because the visible Home
              // URL has already been canonicalized and no longer carries the route.
              const target = getSimulationLaunchTarget(this.props.simulationId);
              const retryUrl = new URL(target?.href || window.location.href, window.location.origin);
              requestDailyFocusRuntimeDocumentRetry(this.props.simulationId);
              retryUrl.searchParams.set('runtimeRetry', String(Date.now()));
              window.location.replace(retryUrl.toString());
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
