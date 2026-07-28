import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ChevronsUpDown } from 'lucide-react';
import {
  getDailyFocusSimulations,
  getResolvedSimulationFocus,
  SIMULATION_FOCUS_CHANGED_EVENT,
  SIMULATION_FOCUS_STORAGE_KEY,
} from '../../data/simulationCatalog.js';
import { triggerHaptic } from '../../lib/haptics.js';
import {
  dismissGateBackdrop,
  ensureGateModalOverlay,
  getGateModalCloseDurationMs,
  prepareGateModalOpen,
} from '../../legacy/modules/ui/gate-modal-shared.js';
import { SimulationFocusContext, useSimulationFocus } from './SimulationFocusContext.js';
import { SimulationIcon } from './SimulationIcon.jsx';

const FOCUS_MODAL_ID = 'simulation-focus-modal';
const CHOOSER_TITLE_ID = 'simulation-focus-modal-title';
const DAILY_FOCUS_SIMULATIONS = Object.freeze(getDailyFocusSimulations());
const DAILY_FOCUS_ID_SET = new Set(DAILY_FOCUS_SIMULATIONS.map((entry) => entry.id));

function readUrlMode() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || params.get('focus') || params.get('simulation');
  } catch {
    return null;
  }
}

function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => {
    const styles = window.getComputedStyle(element);
    return styles.display !== 'none' && styles.visibility !== 'hidden';
  });
}

export function SimulationFocusProvider({
  routeId,
  surfaceRouteId = routeId,
  requestSimulationSwitch,
  simulationSwitchSnapshot,
  children,
}) {
  const returnFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const isSelectionPendingRef = useRef(false);
  const [focusState, setFocusState] = useState(() => getResolvedSimulationFocus());
  const [isChooserOpen, setChooserOpen] = useState(false);
  const [isChooserClosing, setChooserClosing] = useState(false);
  const [isChooserActive, setChooserActive] = useState(false);

  const refreshFocusState = useCallback(() => {
    setFocusState(getResolvedSimulationFocus());
  }, []);

  useEffect(() => {
    const syncTimer = window.setTimeout(() => {
      refreshFocusState();
    }, 0);
    return () => {
      window.clearTimeout(syncTimer);
    };
  }, [refreshFocusState, routeId, surfaceRouteId]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event || event.key === SIMULATION_FOCUS_STORAGE_KEY) {
        refreshFocusState();
      }
    };
    const handleFocusChanged = () => {
      refreshFocusState();
    };

    window.addEventListener(SIMULATION_FOCUS_CHANGED_EVENT, handleFocusChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(SIMULATION_FOCUS_CHANGED_EVENT, handleFocusChanged);
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
  const activeId = (isSelectionPending ? simulationSwitchSnapshot?.fromSimulationId : null)
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

  const closeChooser = useCallback((options = {}) => {
    const {
      haptic = true,
      restoreFocus = true,
      keepBackdrop = false,
      instant = false,
    } = options;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setChooserActive(false);
    setChooserClosing(!instant);
    setChooserOpen(false);
    if (haptic) triggerHaptic('close');
    if (!keepBackdrop) {
      dismissGateBackdrop({ instant });
    }
    if (!instant) {
      const closeDurationMs = getGateModalCloseDurationMs({ keepBackdrop });
      closeTimerRef.current = window.setTimeout(() => {
        setChooserClosing(false);
        closeTimerRef.current = null;
      }, closeDurationMs);
    }
    if (!restoreFocus) return;

    const restoreTriggerFocus = () => {
      if (returnFocusRef.current && document.contains(returnFocusRef.current)) {
        returnFocusRef.current.focus({ preventScroll: true });
      }
    };

    window.setTimeout(restoreTriggerFocus, 0);
    window.setTimeout(restoreTriggerFocus, 80);
    window.setTimeout(restoreTriggerFocus, 180);
  }, []);

  const openChooser = useCallback((triggerElement = null) => {
    if (isSelectionPendingRef.current) return;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setChooserClosing(false);
    setChooserActive(false);
    returnFocusRef.current = triggerElement;
    setChooserOpen(true);
    triggerHaptic('open');
  }, []);

  const markChooserOverlayReady = useCallback(() => {
    setChooserActive(true);
  }, []);

  useEffect(() => {
    if (shouldShowSwitcher || (!isChooserOpen && !isChooserClosing && !isChooserActive)) {
      return undefined;
    }

    const routeResetTimer = window.setTimeout(() => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setChooserActive(false);
      setChooserClosing(false);
      setChooserOpen(false);
      dismissGateBackdrop();
    }, 0);

    return () => {
      window.clearTimeout(routeResetTimer);
    };
  }, [isChooserActive, isChooserClosing, isChooserOpen, shouldShowSwitcher]);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
  }, []);

  const toggleChooser = useCallback((triggerElement = null) => {
    if (isSelectionPendingRef.current) {
      if (isChooserOpen) {
        closeChooser({ haptic: false, restoreFocus: false, instant: true });
      }
      return;
    }
    if (isChooserOpen) {
      closeChooser();
      return;
    }
    openChooser(triggerElement);
  }, [closeChooser, isChooserOpen, openChooser]);

  const selectSimulation = useCallback((simulationId) => {
    if (isSelectionPendingRef.current) {
      closeChooser({ haptic: false, restoreFocus: false, instant: true });
      return false;
    }

    if (simulationId === activeId) {
      closeChooser({ restoreFocus: false });
      return true;
    }

    triggerHaptic('step');
    isSelectionPendingRef.current = true;
    closeChooser({ haptic: false, restoreFocus: false, instant: true });
    const accepted = requestSimulationSwitch?.(simulationId) === true;
    if (!accepted) isSelectionPendingRef.current = false;
    return accepted;
  }, [activeId, closeChooser, requestSimulationSwitch]);

  const value = useMemo(() => ({
    activeId,
    activeSimulation,
    closeChooser,
    dailyId: focusState.dailyId,
    dailySimulations: DAILY_FOCUS_SIMULATIONS,
    isChooserActive,
    isChooserClosing,
    isChooserMounted: isChooserOpen || isChooserClosing,
    isChooserOpen,
    isSelectionPending,
    markChooserOverlayReady,
    openChooser,
    pendingSelectionId,
    routeId,
    simulationTransitionPhase,
    surfaceRouteId,
    selectedId: focusState.selectedId,
    selectSimulation,
    shouldShowSwitcher,
    toggleChooser,
  }), [
    activeId,
    activeSimulation,
    closeChooser,
    focusState.dailyId,
    focusState.selectedId,
    isChooserActive,
    isChooserClosing,
    isChooserOpen,
    isSelectionPending,
    markChooserOverlayReady,
    openChooser,
    pendingSelectionId,
    routeId,
    simulationTransitionPhase,
    surfaceRouteId,
    selectSimulation,
    shouldShowSwitcher,
    toggleChooser,
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
    isChooserOpen,
    isSelectionPending,
    shouldShowSwitcher,
    toggleChooser,
  } = useSimulationFocus();
  const buttonRef = useRef(null);

  if (!shouldShowSwitcher || !activeSimulation) return null;

  return (
    <div
      className="simulation-focus-switcher-slot"
      data-open={String(isChooserOpen)}
      data-pending={String(isSelectionPending)}
      data-route-enter="control"
    >
      <button
        ref={buttonRef}
        type="button"
        className="simulation-focus-pill simulation-focus-switcher"
        data-simulation-id={activeSimulation.id}
        aria-haspopup="dialog"
        aria-expanded={isChooserOpen}
        aria-controls={FOCUS_MODAL_ID}
        aria-busy={isSelectionPending ? 'true' : undefined}
        aria-disabled={isSelectionPending ? 'true' : undefined}
        disabled={isSelectionPending}
        onClick={() => toggleChooser(buttonRef.current)}
      >
        <span className="simulation-focus-pill__label">{activeSimulation.name}</span>
        <ChevronsUpDown className="simulation-focus-pill__icon" aria-hidden="true" strokeWidth={1.8} />
      </button>
    </div>
  );
}

export function SimulationFocusChooser() {
  const {
    activeId,
    closeChooser,
    dailySimulations,
    isChooserActive,
    isChooserClosing,
    isChooserMounted,
    isChooserOpen,
    isSelectionPending,
    markChooserOverlayReady,
    pendingSelectionId,
    selectSimulation,
  } = useSimulationFocus();
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isChooserMounted) return undefined;
    document.documentElement.classList.add('simulation-focus-modal-open');
    return () => {
      document.documentElement.classList.remove('simulation-focus-modal-open');
    };
  }, [isChooserMounted]);

  useEffect(() => {
    if (!isChooserOpen) return undefined;
    let cancelled = false;

    try {
      ensureGateModalOverlay();
      prepareGateModalOpen(modalRef.current, {
        mount: false,
        onReady: () => {
          if (!cancelled) {
            markChooserOverlayReady();
          }
        },
      });
    } catch {
      window.requestAnimationFrame(() => {
        if (!cancelled) {
          markChooserOverlayReady();
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [isChooserOpen, markChooserOverlayReady]);

  useEffect(() => {
    if (!isChooserActive) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      const coarsePointer = window.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches;
      const selected = coarsePointer ? null : modalRef.current?.querySelector('[aria-current="true"]');
      const firstButton = modalRef.current?.querySelector('button');
      (selected || (coarsePointer ? modalRef.current : firstButton))?.focus({ preventScroll: true });
    });

    const handleDismiss = () => closeChooser();
    document.addEventListener('modal-overlay-dismiss', handleDismiss);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('modal-overlay-dismiss', handleDismiss);
    };
  }, [closeChooser, isChooserActive]);

  useEffect(() => {
    if (!isChooserActive) return undefined;

    const handleDocumentKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeChooser();
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [closeChooser, isChooserActive]);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeChooser();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getFocusableElements(modalRef.current);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const modalClassName = [
    'simulation-focus-modal',
    isChooserActive ? 'active' : '',
    isChooserClosing ? 'closing' : '',
    !isChooserMounted ? 'hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={modalRef}
      id={FOCUS_MODAL_ID}
      className={modalClassName}
      aria-hidden={isChooserActive ? 'false' : 'true'}
      role="dialog"
      aria-modal="true"
      aria-labelledby={CHOOSER_TITLE_ID}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      <div className="modal-nav simulation-focus-modal__nav">
        <button
          type="button"
          className="gate-back abs-icon-btn"
          data-modal-back
          aria-label="Close simulation chooser"
          onClick={() => closeChooser()}
        >
          <svg
            className="portfolio-project-view__close-icon"
            viewBox="0 0 24 24"
            width="24"
            height="24"
            aria-hidden="true"
            focusable="false"
          >
            <path
              fill="currentColor"
              d="M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
            />
          </svg>
          <span>BACK</span>
        </button>
      </div>

      <h2 id={CHOOSER_TITLE_ID} className="simulation-focus-modal__title">Choose a simulation</h2>

      <div className="simulation-focus-list" role="list">
        {dailySimulations.map((entry, index) => {
          const isActive = entry.id === activeId;
          const isPending = entry.id === pendingSelectionId;
          return (
            <button
              key={entry.id}
              type="button"
              className="simulation-focus-row"
              data-simulation-id={entry.id}
              style={{ '--simulation-focus-row-index': index }}
              aria-current={isActive ? 'true' : undefined}
              aria-busy={isPending ? 'true' : undefined}
              disabled={isSelectionPending}
              onClick={() => selectSimulation(entry.id)}
            >
              <SimulationIcon id={entry.id} className="simulation-focus-row__icon" />
              <span className="simulation-focus-row__copy">
                <span className="simulation-focus-row__name">{entry.name}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
