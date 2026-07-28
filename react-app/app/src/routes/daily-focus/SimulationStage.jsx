import { useEffect, useRef } from 'react';
import { DailyFocusShellBridge } from './DailyFocusShellBridge.jsx';
import {
  getSimulationAtmosphereReplacementContext,
  registerSimulationAtmosphereSource,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';

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
    let syncFrame = 0;
    const syncSource = () => {
      const sources = stage.querySelectorAll('[data-simulation-atmosphere-source="true"]');
      const canvas = sources.length === 1 && sources[0] instanceof HTMLCanvasElement
        ? sources[0]
        : null;
      if (!canvas || canvas === registeredCanvas) return;
      unregisterSource?.();
      unregisterSource = null;
      registeredCanvas = canvas;
      const replacement = getSimulationAtmosphereReplacementContext(simulationId);
      unregisterSource = registerSimulationAtmosphereSource({
        id: `daily:${simulationId}`,
        routeId: simulationId,
        transactionId: replacement?.transactionId || '',
        kind: 'canvas',
        canvas,
        quietZoneElement: () => document.getElementById('hero-title'),
        scheduler: 'internal',
        opacityElement: canvas,
        requireRealFrame: true,
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
