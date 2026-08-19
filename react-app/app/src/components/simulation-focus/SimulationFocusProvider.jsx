import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
const SWITCHER_EXIT_MS = 160;
const SWITCHER_HOLD_MS = 880;
const SWITCHER_ENTRY_MS = 400;

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
  const [motionPhase, setMotionPhase] = useState('idle');
  const [animatedInlineSize, setAnimatedInlineSize] = useState(null);
  const switcherButtonRef = useRef(null);
  const displayedSimulationRef = useRef(activeSimulation);
  const motionPhaseRef = useRef('idle');
  const exitTimerRef = useRef(null);
  const holdTimerRef = useRef(null);
  const entryTimerRef = useRef(null);
  const widthFrameRef = useRef(null);

  useLayoutEffect(() => {
    if (motionPhase !== 'holding' || !switcherButtonRef.current) return undefined;
    const button = switcherButtonRef.current;
    const previousSize = button.style.getPropertyValue('--simulation-focus-pill-inline-size');

    // Measure the new label at its intrinsic width without ever painting that reset.
    button.style.removeProperty('--simulation-focus-pill-inline-size');
    const nextSize = button.scrollWidth;
    if (previousSize) {
      button.style.setProperty('--simulation-focus-pill-inline-size', previousSize);
    }

    if (!Number.isFinite(nextSize) || nextSize <= 0) return undefined;

    widthFrameRef.current = window.requestAnimationFrame(() => {
      setAnimatedInlineSize(nextSize);
      widthFrameRef.current = null;
    });
    return () => {
      if (widthFrameRef.current !== null) window.cancelAnimationFrame(widthFrameRef.current);
    };
  }, [displayedSimulation?.id, motionPhase]);

  const clearHandoffTimers = useCallback(() => {
    if (exitTimerRef.current) window.clearTimeout(exitTimerRef.current);
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (entryTimerRef.current) window.clearTimeout(entryTimerRef.current);
    exitTimerRef.current = null;
    holdTimerRef.current = null;
    entryTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (!activeSimulation) return undefined;
    if (
      activeSimulation.id === displayedSimulationRef.current?.id
      && motionPhaseRef.current === 'idle'
    ) return undefined;

    clearHandoffTimers();

    if (prefersReducedMotion || !displayedSimulationRef.current) {
      displayedSimulationRef.current = activeSimulation;
      motionPhaseRef.current = 'idle';
      setAnimatedInlineSize(null);
      setDisplayedSimulation(activeSimulation);
      setMotionPhase('idle');
      return undefined;
    }

    const currentWidth = switcherButtonRef.current?.getBoundingClientRect().width;
    if (Number.isFinite(currentWidth) && currentWidth > 0) {
      setAnimatedInlineSize(currentWidth);
    }

    motionPhaseRef.current = 'departing';
    setMotionPhase('departing');

    exitTimerRef.current = window.setTimeout(() => {
      displayedSimulationRef.current = activeSimulation;
      setDisplayedSimulation(activeSimulation);
      motionPhaseRef.current = 'holding';
      setMotionPhase('holding');
      exitTimerRef.current = null;

      holdTimerRef.current = window.setTimeout(() => {
        motionPhaseRef.current = 'arriving';
        setMotionPhase('arriving');
        holdTimerRef.current = null;

        entryTimerRef.current = window.setTimeout(() => {
          motionPhaseRef.current = 'idle';
          setMotionPhase('idle');
          entryTimerRef.current = null;
        }, SWITCHER_ENTRY_MS);
      }, SWITCHER_HOLD_MS);
    }, SWITCHER_EXIT_MS);

    return undefined;
  }, [activeSimulation, clearHandoffTimers, prefersReducedMotion]);

  useEffect(() => () => {
    clearHandoffTimers();
    if (widthFrameRef.current !== null) window.cancelAnimationFrame(widthFrameRef.current);
  }, [clearHandoffTimers]);

  if (!shouldShowSwitcher || !activeSimulation || !displayedSimulation) return null;

  const isAdvancing = motionPhase !== 'idle';
  const isUnavailable = isSelectionPending || isAdvancing;

  return (
    <div
      className="simulation-focus-switcher-slot"
      data-pending={String(isSelectionPending)}
      data-route-enter="control"
    >
      <button
        ref={switcherButtonRef}
        type="button"
        className="abs-labelled-action simulation-focus-pill simulation-focus-switcher"
        data-simulation-id={activeSimulation.id}
        data-sound-action="step"
        data-sound-source="simulation-next"
        data-advancing={String(isAdvancing)}
        data-phase={motionPhase}
        data-transition-phase={simulationTransitionPhase}
        data-motion-preference={prefersReducedMotion ? 'reduced' : 'full'}
        aria-label={isAdvancing
          ? 'Selecting the next simulation'
          : `Show next simulation. Currently ${activeSimulation.name}`}
        aria-busy={isUnavailable ? 'true' : undefined}
        aria-disabled={isUnavailable ? 'true' : undefined}
        disabled={isUnavailable}
        style={animatedInlineSize === null ? undefined : { '--simulation-focus-pill-inline-size': `${animatedInlineSize}px` }}
        onClick={advanceSimulation}
      >
        <span
          className="simulation-focus-pill__label simulation-focus-pill__label--handoff"
          aria-hidden="true"
        >
          {displayedSimulation.name}
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
