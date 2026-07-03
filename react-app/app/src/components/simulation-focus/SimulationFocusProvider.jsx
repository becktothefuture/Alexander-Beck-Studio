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
  getSimulationLaunchTarget,
  SIMULATION_FOCUS_CHANGED_EVENT,
  SIMULATION_FOCUS_STORAGE_KEY,
  writeManualSimulationFocus,
} from '../../data/simulationCatalog.js';
import { buildRouteHref } from '../../lib/routes.js';
import { trySpaNavigate } from '../../lib/spa-navigation.js';
import { SimulationFocusContext, useSimulationFocus } from './SimulationFocusContext.js';
import { SimulationIcon } from './SimulationIcon.jsx';

const FOCUS_MODAL_ID = 'simulation-focus-modal';
const CHOOSER_TITLE_ID = 'simulation-focus-modal-title';
const CHOOSER_CLOSE_SETTLE_MS = 420;
const DAILY_FOCUS_SIMULATIONS = Object.freeze(getDailyFocusSimulations());
const DAILY_FOCUS_ID_SET = new Set(DAILY_FOCUS_SIMULATIONS.map((entry) => entry.id));

let modalOverlayModulePromise = null;

function getModalOverlayModule() {
  if (!modalOverlayModulePromise) {
    modalOverlayModulePromise = import('../../legacy/modules/ui/modal-overlay.js');
  }
  return modalOverlayModulePromise;
}

function readUrlMode() {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || params.get('focus') || params.get('simulation');
  } catch {
    return null;
  }
}

function replaceCurrentUrl(href) {
  if (typeof window === 'undefined') return;
  const nextHref = String(href || '');
  if (!nextHref) return;
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentHref === nextHref) return;
  try {
    window.history.replaceState(window.history.state || {}, '', nextHref);
  } catch {
    /* URL sync is a progressive enhancement; runtime mode has already changed. */
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
  children,
}) {
  const routeIdRef = useRef(routeId);
  const returnFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [focusState, setFocusState] = useState(() => getResolvedSimulationFocus());
  const [homeMode, setHomeMode] = useState(readUrlMode);
  const [optimisticActiveId, setOptimisticActiveId] = useState(null);
  const [isChooserOpen, setChooserOpen] = useState(false);
  const [isChooserClosing, setChooserClosing] = useState(false);

  const refreshFocusState = useCallback(() => {
    setFocusState(getResolvedSimulationFocus());
  }, []);

  useEffect(() => {
    routeIdRef.current = routeId;
    setHomeMode(readUrlMode());
    setOptimisticActiveId(null);
    refreshFocusState();
  }, [refreshFocusState, routeId, surfaceRouteId]);

  useEffect(() => {
    const handleModeChanged = (event) => {
      const nextMode = event?.detail?.mode || null;
      setHomeMode(nextMode);
      setOptimisticActiveId(null);
      refreshFocusState();
    };
    const handleStorage = (event) => {
      if (!event || event.key === SIMULATION_FOCUS_STORAGE_KEY) {
        refreshFocusState();
      }
    };
    const handleFocusChanged = () => {
      setHomeMode(readUrlMode());
      setOptimisticActiveId(null);
      refreshFocusState();
    };

    window.addEventListener('bb:modeChanged', handleModeChanged);
    window.addEventListener(SIMULATION_FOCUS_CHANGED_EVENT, handleFocusChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('bb:modeChanged', handleModeChanged);
      window.removeEventListener(SIMULATION_FOCUS_CHANGED_EVENT, handleFocusChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshFocusState]);

  const routeIsDailyFocus = DAILY_FOCUS_ID_SET.has(surfaceRouteId);
  const activeId = optimisticActiveId
    || (routeIsDailyFocus ? surfaceRouteId : null)
    || (routeId === 'home' && DAILY_FOCUS_ID_SET.has(homeMode) ? homeMode : null)
    || focusState.activeId;
  const activeSimulation = DAILY_FOCUS_SIMULATIONS.find((entry) => entry.id === activeId)
    || focusState.activeSimulation
    || DAILY_FOCUS_SIMULATIONS[0]
    || null;
  const shouldShowSwitcher = routeId === 'home' || routeIsDailyFocus;

  const closeChooser = useCallback((options = {}) => {
    const { restoreFocus = true } = options;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setChooserClosing(true);
    setChooserOpen(false);
    closeTimerRef.current = window.setTimeout(() => {
      setChooserClosing(false);
      closeTimerRef.current = null;
    }, 360);
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
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setChooserClosing(false);
    returnFocusRef.current = triggerElement;
    setChooserOpen(true);
  }, []);

  useEffect(() => () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
  }, []);

  const toggleChooser = useCallback((triggerElement = null) => {
    if (isChooserOpen) {
      closeChooser();
      return;
    }
    openChooser(triggerElement);
  }, [closeChooser, isChooserOpen, openChooser]);

  const selectSimulation = useCallback((simulationId) => {
    const target = getSimulationLaunchTarget(simulationId);
    if (!target) return false;

    setOptimisticActiveId(simulationId);
    closeChooser({ restoreFocus: false });

    window.setTimeout(() => {
      const cleanHomeHref = buildRouteHref('home');
      const commitFocusChoice = () => {
        writeManualSimulationFocus(simulationId);
        refreshFocusState();
      };

      if (target.surface === 'home-mode') {
        commitFocusChoice();

        if (routeIsDailyFocus) {
          setHomeMode(target.mode);
          replaceCurrentUrl(cleanHomeHref);
          return;
        }

        if (routeIdRef.current === 'home') {
          void import('../../legacy/modules/modes/mode-controller.js')
            .then((module) => module.setMode(target.mode))
            .then((applied) => {
              if (applied !== false) {
                replaceCurrentUrl(cleanHomeHref);
              }
            });
          return;
        }

        if (!trySpaNavigate(cleanHomeHref, { transitionStyle: 'simulation-focus', readyFallbackMs: 1100 })) {
          window.location.assign(cleanHomeHref);
        }
        return;
      }

      commitFocusChoice();
      setHomeMode(null);
      replaceCurrentUrl(cleanHomeHref);
    }, CHOOSER_CLOSE_SETTLE_MS);

    return true;
  }, [closeChooser, refreshFocusState, routeIsDailyFocus]);

  const value = useMemo(() => ({
    activeId,
    activeSimulation,
    closeChooser,
    dailyId: focusState.dailyId,
    dailySimulations: DAILY_FOCUS_SIMULATIONS,
    isChooserClosing,
    isChooserMounted: isChooserOpen || isChooserClosing,
    isChooserOpen,
    openChooser,
    routeId,
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
    isChooserClosing,
    isChooserOpen,
    openChooser,
    routeId,
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
    shouldShowSwitcher,
    toggleChooser,
  } = useSimulationFocus();
  const buttonRef = useRef(null);

  if (!shouldShowSwitcher || !activeSimulation) return null;

  return (
    <div className="simulation-focus-switcher-slot" data-open={String(isChooserOpen)}>
      <button
        ref={buttonRef}
        type="button"
        className="simulation-focus-pill simulation-focus-switcher"
        aria-haspopup="dialog"
        aria-expanded={isChooserOpen}
        aria-controls={FOCUS_MODAL_ID}
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
    isChooserClosing,
    isChooserMounted,
    isChooserOpen,
    selectSimulation,
  } = useSimulationFocus();
  const modalRef = useRef(null);
  const overlayInitializedRef = useRef(false);

  useEffect(() => {
    if (!isChooserOpen) return undefined;
    let cancelled = false;
    document.documentElement.classList.add('simulation-focus-modal-open');

    getModalOverlayModule()
      .then((module) => {
        if (cancelled) return;
        if (!overlayInitializedRef.current) {
          module.initModalOverlay({});
          overlayInitializedRef.current = true;
        }
        module.showOverlay();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      document.documentElement.classList.remove('simulation-focus-modal-open');
      getModalOverlayModule()
        .then((module) => module.hideOverlay())
        .catch(() => undefined);
    };
  }, [isChooserOpen]);

  useEffect(() => {
    if (!isChooserOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      const selected = modalRef.current?.querySelector('[aria-current="true"]');
      const firstButton = modalRef.current?.querySelector('button');
      (selected || firstButton)?.focus({ preventScroll: true });
    });

    const handleDismiss = () => closeChooser();
    document.addEventListener('modal-overlay-dismiss', handleDismiss);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('modal-overlay-dismiss', handleDismiss);
    };
  }, [closeChooser, isChooserOpen]);

  useEffect(() => {
    if (!isChooserOpen) return undefined;

    const handleDocumentKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeChooser();
    };

    document.addEventListener('keydown', handleDocumentKeyDown);
    return () => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [closeChooser, isChooserOpen]);

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
    isChooserOpen ? 'active' : '',
    isChooserClosing ? 'closing' : '',
    !isChooserMounted ? 'hidden' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={modalRef}
      id={FOCUS_MODAL_ID}
      className={modalClassName}
      aria-hidden={isChooserOpen ? 'false' : 'true'}
      role="dialog"
      aria-modal="true"
      aria-labelledby={CHOOSER_TITLE_ID}
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
          return (
            <button
              key={entry.id}
              type="button"
              className="simulation-focus-row"
              style={{ '--simulation-focus-row-index': index }}
              aria-current={isActive ? 'true' : undefined}
              onClick={() => selectSimulation(entry.id)}
            >
              <SimulationIcon id={entry.id} className="simulation-focus-row__icon" />
              <span className="simulation-focus-row__copy">
                <span className="simulation-focus-row__name">{entry.name}</span>
                {isActive ? <span className="simulation-focus-row__meta">Active</span> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
