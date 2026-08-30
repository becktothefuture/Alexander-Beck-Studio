import { useEffect, useRef, useState } from 'react';
import { LoaderSpinner } from './LoaderSpinner.jsx';

const ROUTE_LABELS = Object.freeze({
  home: 'Home',
  portfolio: 'Work',
  about: 'About',
  contact: 'Contact',
});

const ACTIVE_PHASES = new Set(['route-out', 'route-loading', 'route-in']);

const SUSTAINED_LOADING_DELAY_MS = 240;

export function RouteTransitionLoader({ transitionState = {} }) {
  const {
    phase = 'idle',
    generation = 0,
    pendingRouteId = null,
    activation = null,
    settledGeneration = 0,
    settledRouteId = null,
    loaderPresentation = 'plate',
    loaderBackdropMode = 'opaque',
    loaderSpinnerStartedAt = 0,
  } = transitionState;
  const isActive = ACTIVE_PHASES.has(phase);
  const isExiting = phase === 'route-in';
  const [statusText, setStatusText] = useState('');
  const announcedSettlementRef = useRef(0);

  useEffect(() => {
    if (phase === 'idle') return undefined;

    const clearTimerId = window.setTimeout(() => setStatusText(''), 0);
    if (phase !== 'route-loading' || !pendingRouteId) {
      return () => window.clearTimeout(clearTimerId);
    }

    const pendingLabel = ROUTE_LABELS[pendingRouteId] || 'the next view';
    const loadingTimerId = window.setTimeout(() => {
      setStatusText(`Loading ${pendingLabel}.`);
    }, SUSTAINED_LOADING_DELAY_MS);
    return () => {
      window.clearTimeout(clearTimerId);
      window.clearTimeout(loadingTimerId);
    };
  }, [generation, pendingRouteId, phase]);

  useEffect(() => {
    if (
      phase !== 'idle'
      || activation !== 'pointer'
      || !settledRouteId
      || settledGeneration <= announcedSettlementRef.current
    ) return;
    announcedSettlementRef.current = settledGeneration;
    const timerId = window.setTimeout(() => {
      setStatusText(`${ROUTE_LABELS[settledRouteId] || 'View'} loaded.`);
    }, 0);
    return () => window.clearTimeout(timerId);
  }, [activation, phase, settledGeneration, settledRouteId]);

  return (
    <>
      <div
        className={[
          'route-transition-loader',
          isActive ? 'is-active' : '',
          isExiting ? 'is-exiting' : '',
        ].filter(Boolean).join(' ')}
        data-route-transition-loader
        data-route-transition-loader-state={phase}
        data-route-transition-loader-presentation={loaderPresentation}
        data-route-transition-loader-backdrop={loaderBackdropMode}
        data-route-transition-spinner-started-at={loaderSpinnerStartedAt || undefined}
        data-route-transition-generation={generation}
        aria-hidden="true"
      >
        <div className="route-transition-loader__stage">
          <LoaderSpinner className="route-transition-loader__spinner" />
        </div>
      </div>
      <div
        className="screen-reader route-transition-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-route-transition-status
      >
        {statusText}
      </div>
    </>
  );
}
