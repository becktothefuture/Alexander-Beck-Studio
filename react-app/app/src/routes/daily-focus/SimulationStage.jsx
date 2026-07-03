import { DailyFocusShellBridge } from './DailyFocusShellBridge.jsx';

export function SimulationStage({
  simulationId,
  children,
  status = '',
  includeShellBridge = true,
}) {
  return (
    <>
      {includeShellBridge ? <DailyFocusShellBridge simulationId={simulationId} /> : null}
      <div
        id="simulation-stage"
        className="daily-simulation-layer"
        data-simulation-id={simulationId}
        data-simulation-stage="daily-focus"
      >
        {children}
      </div>
      {status ? (
        <p className="screen-reader" role="status" aria-live="polite">
          {status}
        </p>
      ) : null}
    </>
  );
}
