import { useEffect, useRef } from 'react';
import { DailyFocusShellBridge } from './DailyFocusShellBridge.jsx';
import { registerSimulationAtmosphereSource } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';

export function SimulationStage({
  simulationId,
  children,
  status = '',
  includeShellBridge = true,
}) {
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !simulationId) return undefined;

    let unregisterSource = null;
    let registeredCanvas = null;
    let registeredKind = '';
    let syncFrame = 0;
    const syncSource = () => {
      const sources = stage.querySelectorAll('[data-simulation-atmosphere-source="true"]');
      const canvas = sources.length === 1 && sources[0] instanceof HTMLCanvasElement
        ? sources[0]
        : null;
      const kind = canvas ? 'canvas' : 'ambient';
      if (canvas === registeredCanvas && kind === registeredKind) return;
      unregisterSource?.();
      unregisterSource = null;
      registeredCanvas = canvas;
      registeredKind = kind;
      unregisterSource = registerSimulationAtmosphereSource({
        id: canvas ? `daily:${simulationId}` : `daily:${simulationId}:ambient`,
        routeId: simulationId,
        kind,
        canvas,
        quietZoneElement: () => document.getElementById('hero-title'),
        scheduler: 'internal',
        opacityElement: canvas,
      });
    };
    const scheduleSync = () => {
      if (syncFrame) return;
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = 0;
        syncSource();
      });
    };

    scheduleSync();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(stage, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (syncFrame) window.cancelAnimationFrame(syncFrame);
      unregisterSource?.();
    };
  }, [simulationId]);

  return (
    <>
      {includeShellBridge ? <DailyFocusShellBridge simulationId={simulationId} /> : null}
      <div
        ref={stageRef}
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
