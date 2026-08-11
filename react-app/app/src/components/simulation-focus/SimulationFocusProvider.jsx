import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshCw } from 'lucide-react';
import {
  getDailyFocusSimulations,
  getResolvedSimulationFocus,
  SIMULATION_FOCUS_CHANGED_EVENT,
  SIMULATION_FOCUS_STORAGE_KEY,
} from '../../data/simulationCatalog.js';
import { triggerHaptic } from '../../lib/haptics.js';
import {
  getWrappedAdjacentItem,
  shouldIgnoreGlobalKeyboardShortcut,
} from '../../lib/global-keyboard-shortcuts.js';
import { SimulationFocusContext, useSimulationFocus } from './SimulationFocusContext.js';

const DAILY_FOCUS_SIMULATIONS = Object.freeze(getDailyFocusSimulations());
const DAILY_FOCUS_ID_SET = new Set(DAILY_FOCUS_SIMULATIONS.map((entry) => entry.id));
const SWITCHER_MOTION_FALLBACK_MS = 620;

function readUrlMode() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || params.get('focus') || params.get('simulation');
  } catch {
    return null;
  }
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mediaQuery) return undefined;
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

export function SimulationFocusProvider({
  routeId,
  surfaceRouteId = routeId,
  requestSimulationSwitch,
  simulationSwitchSnapshot,
  children,
}) {
  const isSelectionPendingRef = useRef(false);
  const [focusState, setFocusState] = useState(() => getResolvedSimulationFocus());

  const refreshFocusState = useCallback(() => {
    setFocusState(getResolvedSimulationFocus());
  }, []);

  useEffect(() => {
    const syncTimer = window.setTimeout(refreshFocusState, 0);
    return () => window.clearTimeout(syncTimer);
  }, [refreshFocusState, routeId, surfaceRouteId]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event || event.key === SIMULATION_FOCUS_STORAGE_KEY) refreshFocusState();
    };

    window.addEventListener(SIMULATION_FOCUS_CHANGED_EVENT, refreshFocusState);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SIMULATION_FOCUS_CHANGED_EVENT, refreshFocusState);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshFocusState]);

  const routeIsDailyFocus = routeId === 'home' && DAILY_FOCUS_ID_SET.has(surfaceRouteId);
  const simulationTransitionPhase = simulationSwitchSnapshot?.phase || 'idle';
  const isSelectionPending = Boolean(simulationSwitchSnapshot?.busy);
  const pendingSelectionId = isSelectionPending
    ? simulationSwitchSnapshot?.targetSimulationId || null
    : null;
  const routeBackedActiveId = routeIsDailyFocus ? surfaceRouteId : null;
  const urlMode = readUrlMode();
  const homeModeActiveId = routeId === 'home' && DAILY_FOCUS_ID_SET.has(urlMode) ? urlMode : null;
  const activeId = pendingSelectionId
    || routeBackedActiveId
    || homeModeActiveId
    || focusState.activeId;
  const activeSimulation = DAILY_FOCUS_SIMULATIONS.find((entry) => entry.id === activeId)
    || (!isSelectionPending ? focusState.activeSimulation : null)
    || DAILY_FOCUS_SIMULATIONS[0]
    || null;
  const shouldShowSwitcher = routeId === 'home' || routeIsDailyFocus;

  useEffect(() => {
    isSelectionPendingRef.current = isSelectionPending;
  }, [isSelectionPending]);

  const advanceSimulation = useCallback(() => {
    if (isSelectionPendingRef.current || !activeId) return false;

    const nextSimulation = getWrappedAdjacentItem(
      DAILY_FOCUS_SIMULATIONS,
      activeId,
      1,
      (simulation) => simulation.id,
    );
    if (!nextSimulation || nextSimulation.id === activeId) return false;

    isSelectionPendingRef.current = true;
    const accepted = requestSimulationSwitch?.(nextSimulation.id) === true;
    if (!accepted) {
      isSelectionPendingRef.current = false;
      return false;
    }

    triggerHaptic('step');
    return true;
  }, [activeId, requestSimulationSwitch]);

  useEffect(() => {
    if (routeId !== 'home' || !shouldShowSwitcher || isSelectionPending) return undefined;

    const handleGlobalSimulationKeyDown = (event) => {
      const isSpace = event.key === ' ' || event.key === 'Spacebar' || event.code === 'Space';
      const routeTab = event.target?.closest?.('[data-route-tab]');
      const allowActiveHomeTab = routeTab?.dataset.routeTab === 'home'
        && routeTab.getAttribute('aria-current') === 'page';
      if (
        !isSpace
        || shouldIgnoreGlobalKeyboardShortcut(event, { allowRouteTab: allowActiveHomeTab })
      ) return;

      event.preventDefault();
      event.stopPropagation();
      advanceSimulation();
    };

    window.addEventListener('keydown', handleGlobalSimulationKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalSimulationKeyDown, true);
  }, [advanceSimulation, isSelectionPending, routeId, shouldShowSwitcher]);

  const value = useMemo(() => ({
    activeId,
    activeSimulation,
    advanceSimulation,
    dailyId: focusState.dailyId,
    isSelectionPending,
    pendingSelectionId,
    routeId,
    shouldShowSwitcher,
    simulationTransitionPhase,
    surfaceRouteId,
  }), [
    activeId,
    activeSimulation,
    advanceSimulation,
    focusState.dailyId,
    isSelectionPending,
    pendingSelectionId,
    routeId,
    shouldShowSwitcher,
    simulationTransitionPhase,
    surfaceRouteId,
  ]);

  return (
    <SimulationFocusContext.Provider value={value}>
      {children}
    </SimulationFocusContext.Provider>
  );
}

export function SimulationFocusSwitcher() {
  const {
    activeSimulation,
    advanceSimulation,
    isSelectionPending,
    shouldShowSwitcher,
    simulationTransitionPhase,
  } = useSimulationFocus();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [displayedSimulation, setDisplayedSimulation] = useState(activeSimulation);
  const [incomingSimulation, setIncomingSimulation] = useState(null);
  const [motionPhase, setMotionPhase] = useState('idle');
  const [observedActiveId, setObservedActiveId] = useState(activeSimulation?.id || null);
  const resetFrameRef = useRef(null);

  if (activeSimulation && activeSimulation.id !== observedActiveId) {
    setObservedActiveId(activeSimulation.id);
    if (prefersReducedMotion || !displayedSimulation) {
      setDisplayedSimulation(activeSimulation);
      setIncomingSimulation(null);
      setMotionPhase('idle');
    } else {
      setIncomingSimulation(activeSimulation);
      setMotionPhase('advancing');
    }
  } else if (prefersReducedMotion && motionPhase === 'advancing' && incomingSimulation) {
    setDisplayedSimulation(incomingSimulation);
    setIncomingSimulation(null);
    setMotionPhase('idle');
  }

  const finishLabelAdvance = useCallback(() => {
    if (motionPhase !== 'advancing' || !incomingSimulation) return;
    setDisplayedSimulation(incomingSimulation);
    setIncomingSimulation(null);
    setMotionPhase('resetting');
    resetFrameRef.current = window.requestAnimationFrame(() => {
      resetFrameRef.current = window.requestAnimationFrame(() => {
        setMotionPhase('idle');
        resetFrameRef.current = null;
      });
    });
  }, [incomingSimulation, motionPhase]);

  useEffect(() => () => {
    if (resetFrameRef.current !== null) window.cancelAnimationFrame(resetFrameRef.current);
  }, []);

  useEffect(() => {
    if (motionPhase !== 'advancing') return undefined;
    const fallbackTimer = window.setTimeout(finishLabelAdvance, SWITCHER_MOTION_FALLBACK_MS);
    return () => window.clearTimeout(fallbackTimer);
  }, [finishLabelAdvance, motionPhase]);

  if (!shouldShowSwitcher || !activeSimulation || !displayedSimulation) return null;

  const nextLabelSimulation = incomingSimulation
    || (activeSimulation.id !== displayedSimulation.id ? activeSimulation : displayedSimulation);
  const isAdvancing = motionPhase === 'advancing';

  return (
    <div
      className="simulation-focus-switcher-slot"
      data-pending={String(isSelectionPending)}
      data-route-enter="control"
    >
      <button
        type="button"
        className="simulation-focus-pill simulation-focus-switcher"
        data-simulation-id={activeSimulation.id}
        data-sound-action="step"
        data-sound-source="simulation-next"
        data-advancing={String(isAdvancing)}
        data-phase={motionPhase}
        data-transition-phase={simulationTransitionPhase}
        aria-label={`Show next simulation. Currently ${activeSimulation.name}`}
        aria-busy={isSelectionPending ? 'true' : undefined}
        aria-disabled={isSelectionPending ? 'true' : undefined}
        disabled={isSelectionPending}
        onClick={advanceSimulation}
      >
        <span className="simulation-focus-pill__label-window" aria-hidden="true">
          <span className="simulation-focus-pill__label simulation-focus-pill__label--current">
            {displayedSimulation.name}
          </span>
          <span
            className="simulation-focus-pill__label simulation-focus-pill__label--next"
            onTransitionEnd={(event) => {
              if (event.propertyName === 'transform') finishLabelAdvance();
            }}
          >
            {nextLabelSimulation.name}
          </span>
        </span>
        <span className="simulation-focus-pill__icon" aria-hidden="true">
          <RefreshCw strokeWidth={1.8} />
        </span>
      </button>

      <span className="simulation-focus-switcher-status" aria-live="polite">
        Current simulation: {activeSimulation.name}
      </span>
    </div>
  );
}
