import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/simulation-focus/SimulationFocusProvider.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useMemo = __vite__cjsImport1_react["useMemo"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"]





;
import { ChevronsUpDown } from "/node_modules/.vite/deps/lucide-react.js?v=6e8fde4d";
import {
  getDailyFocusSimulations,
  getResolvedSimulationFocus,
  getSimulationLaunchTarget,
  rememberReloadSimulation,
  SIMULATION_FOCUS_CHANGED_EVENT,
  SIMULATION_FOCUS_STORAGE_KEY,
  writeManualSimulationFocus
} from "/src/data/simulationCatalog.js";
import { buildRouteHref } from "/src/lib/routes.js?t=1784282071059";
import { trySpaNavigate } from "/src/lib/spa-navigation.js";
import { triggerHaptic } from "/src/lib/haptics.js";
import {
  dismissGateBackdrop,
  ensureGateModalOverlay,
  getGateModalCloseDurationMs,
  prepareGateModalOpen
} from "/src/legacy/modules/ui/gate-modal-shared.js";
import { SimulationFocusContext, useSimulationFocus } from "/src/components/simulation-focus/SimulationFocusContext.js";
import { SimulationIcon } from "/src/components/simulation-focus/SimulationIcon.jsx";
const FOCUS_MODAL_ID = "simulation-focus-modal";
const CHOOSER_TITLE_ID = "simulation-focus-modal-title";
const SIMULATION_FOCUS_READY_FALLBACK_MS = 850;
const ROUTE_BACKED_SIMULATION_READY_FALLBACK_MS = 13e3;
const DAILY_FOCUS_SIMULATIONS = Object.freeze(getDailyFocusSimulations());
const DAILY_FOCUS_ID_SET = new Set(DAILY_FOCUS_SIMULATIONS.map((entry) => entry.id));
function readUrlMode() {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("mode") || params.get("focus") || params.get("simulation");
  } catch {
    return null;
  }
}
function replaceCurrentUrl(href) {
  if (typeof window === "undefined") return;
  const nextHref = String(href || "");
  if (!nextHref) return;
  const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentHref === nextHref) return;
  try {
    window.history.replaceState(window.history.state || {}, "", nextHref);
  } catch {
  }
}
function applyHomeMode(mode) {
  return import("/src/legacy/modules/modes/mode-controller.js").then((module) => module.setMode(mode));
}
function waitForHomeModeSurface(timeoutMs = 3200) {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const tick = () => {
      const canvas = document.getElementById("c");
      const hasDailyStage = Boolean(document.querySelector(".daily-simulation-layer"));
      const canvasReady = Boolean(canvas && canvas.width >= 64 && canvas.height >= 64);
      if (canvasReady && !hasDailyStage) {
        resolve(true);
        return;
      }
      if (performance.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}
function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter((element) => {
    const styles = window.getComputedStyle(element);
    return styles.display !== "none" && styles.visibility !== "hidden";
  });
}
function publishSimulationSwitchState(simulationId, status, error = null) {
  if (typeof window === "undefined") return;
  const snapshot = Object.freeze({
    simulationId,
    status,
    error: error?.message || String(error || ""),
    at: performance.now()
  });
  window.__ABS_SIMULATION_SWITCH__ = snapshot;
  window.dispatchEvent(new CustomEvent("abs:simulation-switch-state", { detail: snapshot }));
}
export function SimulationFocusProvider({
  routeId,
  surfaceRouteId = routeId,
  transitionCurrentRoute = null,
  children
}) {
  _s();
  const routeIdRef = useRef(routeId);
  const returnFocusRef = useRef(null);
  const closeTimerRef = useRef(null);
  const selectionTimerRef = useRef(null);
  const [focusState, setFocusState] = useState(() => getResolvedSimulationFocus());
  const [homeMode, setHomeMode] = useState(readUrlMode);
  const [optimisticActiveId, setOptimisticActiveId] = useState(null);
  const [isChooserOpen, setChooserOpen] = useState(false);
  const [isChooserClosing, setChooserClosing] = useState(false);
  const [isChooserActive, setChooserActive] = useState(false);
  const refreshFocusState = useCallback(() => {
    setFocusState(getResolvedSimulationFocus());
  }, []);
  useEffect(() => {
    routeIdRef.current = routeId;
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
      selectionTimerRef.current = null;
      dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
    }
    const syncTimer = window.setTimeout(() => {
      setHomeMode(readUrlMode());
      setOptimisticActiveId(null);
      refreshFocusState();
    }, 0);
    return () => {
      window.clearTimeout(syncTimer);
    };
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
    window.addEventListener("bb:modeChanged", handleModeChanged);
    window.addEventListener(SIMULATION_FOCUS_CHANGED_EVENT, handleFocusChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("bb:modeChanged", handleModeChanged);
      window.removeEventListener(SIMULATION_FOCUS_CHANGED_EVENT, handleFocusChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, [refreshFocusState]);
  const routeIsDailyFocus = routeId === "home" && DAILY_FOCUS_ID_SET.has(surfaceRouteId);
  const activeId = optimisticActiveId || (routeIsDailyFocus ? surfaceRouteId : null) || (routeId === "home" && DAILY_FOCUS_ID_SET.has(homeMode) ? homeMode : null) || focusState.activeId;
  const activeSimulation = DAILY_FOCUS_SIMULATIONS.find((entry) => entry.id === activeId) || focusState.activeSimulation || DAILY_FOCUS_SIMULATIONS[0] || null;
  const shouldShowSwitcher = routeId === "home" || routeIsDailyFocus;
  useEffect(() => {
    if (!routeIsDailyFocus) return;
    rememberReloadSimulation(surfaceRouteId);
    const target = getSimulationLaunchTarget(surfaceRouteId);
    if (target?.routeBacked) {
      replaceCurrentUrl(buildRouteHref("home"));
    }
  }, [routeIsDailyFocus, surfaceRouteId]);
  const closeChooser = useCallback((options = {}) => {
    const { haptic = true, restoreFocus = true, keepBackdrop = false } = options;
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    const closeDurationMs = getGateModalCloseDurationMs({ keepBackdrop });
    setChooserActive(false);
    setChooserClosing(true);
    setChooserOpen(false);
    if (haptic) triggerHaptic("close");
    if (!keepBackdrop) {
      dismissGateBackdrop();
    }
    closeTimerRef.current = window.setTimeout(() => {
      setChooserClosing(false);
      closeTimerRef.current = null;
    }, closeDurationMs);
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
    setChooserActive(false);
    returnFocusRef.current = triggerElement;
    setChooserOpen(true);
    triggerHaptic("open");
  }, []);
  const markChooserOverlayReady = useCallback(() => {
    setChooserActive(true);
  }, []);
  useEffect(() => {
    if (shouldShowSwitcher || !isChooserOpen && !isChooserClosing && !isChooserActive) {
      return void 0;
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
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
    }
    dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
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
    if (simulationId === activeId) {
      closeChooser({ restoreFocus: false });
      return true;
    }
    triggerHaptic("step");
    setOptimisticActiveId(simulationId);
    closeChooser({ haptic: false, restoreFocus: false, keepBackdrop: true });
    const closeSettleMs = getGateModalCloseDurationMs({ keepBackdrop: true });
    const transitionOptions = {
      transitionStyle: "simulation-focus",
      readyFallbackMs: target.routeBacked ? ROUTE_BACKED_SIMULATION_READY_FALLBACK_MS : SIMULATION_FOCUS_READY_FALLBACK_MS,
      releaseGateBackdropOnComplete: true
    };
    if (selectionTimerRef.current !== null) {
      window.clearTimeout(selectionTimerRef.current);
    }
    selectionTimerRef.current = window.setTimeout(() => {
      selectionTimerRef.current = null;
      const runSelection = () => {
        const cleanHomeHref = buildRouteHref("home");
        const targetHomeHref = `${cleanHomeHref}?mode=${encodeURIComponent(target.mode || "")}`;
        const previousHomeMode = homeMode;
        const handleSelectionFailure = (error) => {
          setOptimisticActiveId(null);
          setHomeMode(previousHomeMode);
          dismissGateBackdrop({ instant: true });
          publishSimulationSwitchState(simulationId, "failed", error);
        };
        const commitFocusChoice = () => {
          writeManualSimulationFocus(simulationId);
          refreshFocusState();
          publishSimulationSwitchState(simulationId, "ready");
        };
        if (target.surface === "home-mode") {
          const applySelectedHomeMode = async () => {
            const surfaceReady = await waitForHomeModeSurface();
            if (!surfaceReady) throw new Error("Home simulation surface did not become ready");
            setHomeMode(target.mode);
            const applied = await applyHomeMode(target.mode);
            if (applied === false) throw new Error(`Simulation "${target.mode}" failed to initialize`);
            replaceCurrentUrl(cleanHomeHref);
            commitFocusChoice();
            return true;
          };
          if (routeIsDailyFocus) {
            const didNavigate = trySpaNavigate(targetHomeHref, {
              replace: true,
              ...transitionOptions,
              afterRouteReady: applySelectedHomeMode,
              onFailure: handleSelectionFailure
            });
            if (!didNavigate) {
              commitFocusChoice();
              window.location.assign(cleanHomeHref);
            }
            return;
          }
          if (routeIdRef.current === "home") {
            if (typeof transitionCurrentRoute === "function" && transitionCurrentRoute(applySelectedHomeMode, {
              ...transitionOptions,
              onFailure: handleSelectionFailure
            })) {
              return;
            }
            if (trySpaNavigate(targetHomeHref, {
              replace: true,
              ...transitionOptions,
              afterRouteReady: applySelectedHomeMode,
              onFailure: handleSelectionFailure
            })) {
              return;
            }
            void applySelectedHomeMode().catch(handleSelectionFailure).finally(() => dismissGateBackdrop({ instant: true }));
            return;
          }
          if (!trySpaNavigate(targetHomeHref, {
            ...transitionOptions,
            afterRouteReady: applySelectedHomeMode,
            onFailure: handleSelectionFailure
          })) {
            commitFocusChoice();
            window.location.assign(cleanHomeHref);
          }
          return;
        }
        publishSimulationSwitchState(simulationId, "preloading");
        setHomeMode(null);
        if (!trySpaNavigate(target.href, {
          ...transitionOptions,
          onCommit: commitFocusChoice,
          onFailure: handleSelectionFailure
        })) {
          commitFocusChoice();
          window.location.assign(target.href);
        }
      };
      runSelection();
    }, closeSettleMs);
    return true;
  }, [activeId, closeChooser, homeMode, refreshFocusState, routeIsDailyFocus, transitionCurrentRoute]);
  const value = useMemo(
    () => ({
      activeId,
      activeSimulation,
      closeChooser,
      dailyId: focusState.dailyId,
      dailySimulations: DAILY_FOCUS_SIMULATIONS,
      isChooserActive,
      isChooserClosing,
      isChooserMounted: isChooserOpen || isChooserClosing,
      isChooserOpen,
      markChooserOverlayReady,
      openChooser,
      routeId,
      surfaceRouteId,
      selectedId: focusState.selectedId,
      selectSimulation,
      shouldShowSwitcher,
      toggleChooser
    }),
    [
      activeId,
      activeSimulation,
      closeChooser,
      focusState.dailyId,
      focusState.selectedId,
      isChooserActive,
      isChooserClosing,
      isChooserOpen,
      markChooserOverlayReady,
      openChooser,
      routeId,
      surfaceRouteId,
      selectSimulation,
      shouldShowSwitcher,
      toggleChooser
    ]
  );
  return /* @__PURE__ */ jsxDEV(SimulationFocusContext.Provider, { value, children }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
    lineNumber: 442,
    columnNumber: 5
  }, this);
}
_s(SimulationFocusProvider, "0/CTuCPfbxCid0rgbQ9AevYSEpc=");
_c = SimulationFocusProvider;
export function SimulationFocusSwitcher() {
  _s2();
  const {
    activeSimulation,
    isChooserOpen,
    shouldShowSwitcher,
    toggleChooser
  } = useSimulationFocus();
  const buttonRef = useRef(null);
  if (!shouldShowSwitcher || !activeSimulation) return null;
  return /* @__PURE__ */ jsxDEV("div", { className: "simulation-focus-switcher-slot", "data-open": String(isChooserOpen), children: /* @__PURE__ */ jsxDEV(
    "button",
    {
      ref: buttonRef,
      type: "button",
      className: "simulation-focus-pill simulation-focus-switcher",
      "data-simulation-id": activeSimulation.id,
      "aria-haspopup": "dialog",
      "aria-expanded": isChooserOpen,
      "aria-controls": FOCUS_MODAL_ID,
      onClick: () => toggleChooser(buttonRef.current),
      children: [
        /* @__PURE__ */ jsxDEV("span", { className: "simulation-focus-pill__label", children: activeSimulation.name }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
          lineNumber: 471,
          columnNumber: 9
        }, this),
        /* @__PURE__ */ jsxDEV(ChevronsUpDown, { className: "simulation-focus-pill__icon", "aria-hidden": "true", strokeWidth: 1.8 }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
          lineNumber: 472,
          columnNumber: 9
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
      lineNumber: 461,
      columnNumber: 7
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
    lineNumber: 460,
    columnNumber: 5
  }, this);
}
_s2(SimulationFocusSwitcher, "uo4nu6M7kN8K5ayzfykCfUA28kI=", false, function() {
  return [useSimulationFocus];
});
_c2 = SimulationFocusSwitcher;
export function SimulationFocusChooser() {
  _s3();
  const {
    activeId,
    closeChooser,
    dailySimulations,
    isChooserActive,
    isChooserClosing,
    isChooserMounted,
    isChooserOpen,
    markChooserOverlayReady,
    selectSimulation
  } = useSimulationFocus();
  const modalRef = useRef(null);
  useEffect(() => {
    if (!isChooserMounted) return void 0;
    document.documentElement.classList.add("simulation-focus-modal-open");
    return () => {
      document.documentElement.classList.remove("simulation-focus-modal-open");
    };
  }, [isChooserMounted]);
  useEffect(() => {
    if (!isChooserOpen) return void 0;
    let cancelled = false;
    try {
      ensureGateModalOverlay();
      prepareGateModalOpen(modalRef.current, {
        mount: false,
        onReady: () => {
          if (!cancelled) {
            markChooserOverlayReady();
          }
        }
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
    if (!isChooserActive) return void 0;
    const focusFrame = window.requestAnimationFrame(() => {
      const coarsePointer = window.matchMedia?.("(hover: none) and (pointer: coarse)")?.matches;
      const selected = coarsePointer ? null : modalRef.current?.querySelector('[aria-current="true"]');
      const firstButton = modalRef.current?.querySelector("button");
      (selected || (coarsePointer ? modalRef.current : firstButton))?.focus({ preventScroll: true });
    });
    const handleDismiss = () => closeChooser();
    document.addEventListener("modal-overlay-dismiss", handleDismiss);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("modal-overlay-dismiss", handleDismiss);
    };
  }, [closeChooser, isChooserActive]);
  useEffect(() => {
    if (!isChooserActive) return void 0;
    const handleDocumentKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeChooser();
    };
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [closeChooser, isChooserActive]);
  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeChooser();
      return;
    }
    if (event.key !== "Tab") return;
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
    "simulation-focus-modal",
    isChooserActive ? "active" : "",
    isChooserClosing ? "closing" : "",
    !isChooserMounted ? "hidden" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      ref: modalRef,
      id: FOCUS_MODAL_ID,
      className: modalClassName,
      "aria-hidden": isChooserActive ? "false" : "true",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": CHOOSER_TITLE_ID,
      tabIndex: -1,
      onKeyDown: handleKeyDown,
      children: [
        /* @__PURE__ */ jsxDEV("div", { className: "modal-nav simulation-focus-modal__nav", children: /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "gate-back abs-icon-btn",
            "data-modal-back": true,
            "aria-label": "Close simulation chooser",
            onClick: () => closeChooser(),
            children: [
              /* @__PURE__ */ jsxDEV(
                "svg",
                {
                  className: "portfolio-project-view__close-icon",
                  viewBox: "0 0 24 24",
                  width: "24",
                  height: "24",
                  "aria-hidden": "true",
                  focusable: "false",
                  children: /* @__PURE__ */ jsxDEV(
                    "path",
                    {
                      fill: "currentColor",
                      d: "M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
                      lineNumber: 617,
                      columnNumber: 13
                    },
                    this
                  )
                },
                void 0,
                false,
                {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
                  lineNumber: 609,
                  columnNumber: 11
                },
                this
              ),
              /* @__PURE__ */ jsxDEV("span", { children: "BACK" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
                lineNumber: 622,
                columnNumber: 11
              }, this)
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
            lineNumber: 602,
            columnNumber: 9
          },
          this
        ) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
          lineNumber: 601,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { id: CHOOSER_TITLE_ID, className: "simulation-focus-modal__title", children: "Choose a simulation" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
          lineNumber: 626,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "simulation-focus-list", role: "list", children: dailySimulations.map((entry, index) => {
          const isActive = entry.id === activeId;
          return /* @__PURE__ */ jsxDEV(
            "button",
            {
              type: "button",
              className: "simulation-focus-row",
              style: { "--simulation-focus-row-index": index },
              "aria-current": isActive ? "true" : void 0,
              onClick: () => selectSimulation(entry.id),
              children: [
                /* @__PURE__ */ jsxDEV(SimulationIcon, { id: entry.id, className: "simulation-focus-row__icon" }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
                  lineNumber: 640,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV("span", { className: "simulation-focus-row__copy", children: /* @__PURE__ */ jsxDEV("span", { className: "simulation-focus-row__name", children: entry.name }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
                  lineNumber: 642,
                  columnNumber: 17
                }, this) }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
                  lineNumber: 641,
                  columnNumber: 15
                }, this)
              ]
            },
            entry.id,
            true,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
              lineNumber: 632,
              columnNumber: 13
            },
            this
          );
        }) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
          lineNumber: 628,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx",
      lineNumber: 590,
      columnNumber: 5
    },
    this
  );
}
_s3(SimulationFocusChooser, "v1MEG3yaCNBJ8yVgp7Gcj//z6Rg=", false, function() {
  return [useSimulationFocus];
});
_c3 = SimulationFocusChooser;
var _c, _c2, _c3;
$RefreshReg$(_c, "SimulationFocusProvider");
$RefreshReg$(_c2, "SimulationFocusSwitcher");
$RefreshReg$(_c3, "SimulationFocusChooser");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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TCxNQUFNQyxPQUFPc0c7QUFDOUIsaUJBQ0U7QUFBQSxZQUFDO0FBQUE7QUFBQSxjQUVDLE1BQUs7QUFBQSxjQUNMLFdBQVU7QUFBQSxjQUNWLE9BQU8sRUFBRSxnQ0FBZ0NzRixNQUFNO0FBQUEsY0FDL0MsZ0JBQWNDLFdBQVcsU0FBU3BFO0FBQUFBLGNBQ2xDLFNBQVMsTUFBTUcsaUJBQWlCN0gsTUFBTUMsRUFBRTtBQUFBLGNBRXhDO0FBQUEsdUNBQUMsa0JBQWUsSUFBSUQsTUFBTUMsSUFBSSxXQUFVLGdDQUF4QztBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUFvRTtBQUFBLGdCQUNwRSx1QkFBQyxVQUFLLFdBQVUsOEJBQ2QsaUNBQUMsVUFBSyxXQUFVLDhCQUE4QkQsZ0JBQU0rSixRQUFwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUF5RCxLQUQzRDtBQUFBO0FBQUE7QUFBQTtBQUFBLHVCQUVBO0FBQUE7QUFBQTtBQUFBLFlBVksvSixNQUFNQztBQUFBQSxZQURiO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFZQTtBQUFBLFFBRUosQ0FBQyxLQWxCSDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBbUJBO0FBQUE7QUFBQTtBQUFBLElBekRGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQTBEQTtBQUVKO0FBQUNnSyxJQTVLZUQsd0JBQXNCO0FBQUEsVUFXaEM1SyxrQkFBa0I7QUFBQTtBQUFBLE1BWFI0SztBQUFzQixJQUFBK0IsSUFBQUMsS0FBQUM7QUFBQSxhQUFBRixJQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFDLEtBQUEiLCJuYW1lcyI6WyJ1c2VDYWxsYmFjayIsInVzZUVmZmVjdCIsInVzZU1lbW8iLCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsIkNoZXZyb25zVXBEb3duIiwiZ2V0RGFpbHlGb2N1c1NpbXVsYXRpb25zIiwiZ2V0UmVzb2x2ZWRTaW11bGF0aW9uRm9jdXMiLCJnZXRTaW11bGF0aW9uTGF1bmNoVGFyZ2V0IiwicmVtZW1iZXJSZWxvYWRTaW11bGF0aW9uIiwiU0lNVUxBVElPTl9GT0NVU19DSEFOR0VEX0VWRU5UIiwiU0lNVUxBVElPTl9GT0NVU19TVE9SQUdFX0tFWSIsIndyaXRlTWFudWFsU2ltdWxhdGlvbkZvY3VzIiwiYnVpbGRSb3V0ZUhyZWYiLCJ0cnlTcGFOYXZpZ2F0ZSIsInRyaWdnZXJIYXB0aWMiLCJkaXNtaXNzR2F0ZUJhY2tkcm9wIiwiZW5zdXJlR2F0ZU1vZGFsT3ZlcmxheSIsImdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25NcyIsInByZXBhcmVHYXRlTW9kYWxPcGVuIiwiU2ltdWxhdGlvbkZvY3VzQ29udGV4dCIsInVzZVNpbXVsYXRpb25Gb2N1cyIsIlNpbXVsYXRpb25JY29uIiwiRk9DVVNfTU9EQUxfSUQiLCJDSE9PU0VSX1RJVExFX0lEIiwiU0lNVUxBVElPTl9GT0NVU19SRUFEWV9GQUxMQkFDS19NUyIsIlJPVVRFX0JBQ0tFRF9TSU1VTEFUSU9OX1JFQURZX0ZBTExCQUNLX01TIiwiREFJTFlfRk9DVVNfU0lNVUxBVElPTlMiLCJPYmplY3QiLCJmcmVlemUiLCJEQUlMWV9GT0NVU19JRF9TRVQiLCJTZXQiLCJtYXAiLCJlbnRyeSIsImlkIiwicmVhZFVybE1vZGUiLCJ3aW5kb3ciLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJsb2NhdGlvbiIsInNlYXJjaCIsImdldCIsInJlcGxhY2VDdXJyZW50VXJsIiwiaHJlZiIsIm5leHRIcmVmIiwiU3RyaW5nIiwiY3VycmVudEhyZWYiLCJwYXRobmFtZSIsImhhc2giLCJoaXN0b3J5IiwicmVwbGFjZVN0YXRlIiwic3RhdGUiLCJhcHBseUhvbWVNb2RlIiwibW9kZSIsInRoZW4iLCJtb2R1bGUiLCJzZXRNb2RlIiwid2FpdEZvckhvbWVNb2RlU3VyZmFjZSIsInRpbWVvdXRNcyIsIlByb21pc2UiLCJyZXNvbHZlIiwic3RhcnRlZEF0IiwicGVyZm9ybWFuY2UiLCJub3ciLCJ0aWNrIiwiY2FudmFzIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImhhc0RhaWx5U3RhZ2UiLCJCb29sZWFuIiwicXVlcnlTZWxlY3RvciIsImNhbnZhc1JlYWR5Iiwid2lkdGgiLCJoZWlnaHQiLCJyZXF1ZXN0QW5pbWF0aW9uRnJhbWUiLCJnZXRGb2N1c2FibGVFbGVtZW50cyIsImNvbnRhaW5lciIsIkFycmF5IiwiZnJvbSIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmaWx0ZXIiLCJlbGVtZW50Iiwic3R5bGVzIiwiZ2V0Q29tcHV0ZWRTdHlsZSIsImRpc3BsYXkiLCJ2aXNpYmlsaXR5IiwicHVibGlzaFNpbXVsYXRpb25Td2l0Y2hTdGF0ZSIsInNpbXVsYXRpb25JZCIsInN0YXR1cyIsImVycm9yIiwic25hcHNob3QiLCJtZXNzYWdlIiwiYXQiLCJfX0FCU19TSU1VTEFUSU9OX1NXSVRDSF9fIiwiZGlzcGF0Y2hFdmVudCIsIkN1c3RvbUV2ZW50IiwiZGV0YWlsIiwiU2ltdWxhdGlvbkZvY3VzUHJvdmlkZXIiLCJyb3V0ZUlkIiwic3VyZmFjZVJvdXRlSWQiLCJ0cmFuc2l0aW9uQ3VycmVudFJvdXRlIiwiY2hpbGRyZW4iLCJfcyIsInJvdXRlSWRSZWYiLCJyZXR1cm5Gb2N1c1JlZiIsImNsb3NlVGltZXJSZWYiLCJzZWxlY3Rpb25UaW1lclJlZiIsImZvY3VzU3RhdGUiLCJzZXRGb2N1c1N0YXRlIiwiaG9tZU1vZGUiLCJzZXRIb21lTW9kZSIsIm9wdGltaXN0aWNBY3RpdmVJZCIsInNldE9wdGltaXN0aWNBY3RpdmVJZCIsImlzQ2hvb3Nlck9wZW4iLCJzZXRDaG9vc2VyT3BlbiIsImlzQ2hvb3NlckNsb3NpbmciLCJzZXRDaG9vc2VyQ2xvc2luZyIsImlzQ2hvb3NlckFjdGl2ZSIsInNldENob29zZXJBY3RpdmUiLCJyZWZyZXNoRm9jdXNTdGF0ZSIsImN1cnJlbnQiLCJjbGVhclRpbWVvdXQiLCJzdXBwcmVzc1JldHVybkFuaW1hdGlvbiIsImluc3RhbnQiLCJzeW5jVGltZXIiLCJzZXRUaW1lb3V0IiwiaGFuZGxlTW9kZUNoYW5nZWQiLCJldmVudCIsIm5leHRNb2RlIiwiaGFuZGxlU3RvcmFnZSIsImtleSIsImhhbmRsZUZvY3VzQ2hhbmdlZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwicm91dGVJc0RhaWx5Rm9jdXMiLCJoYXMiLCJhY3RpdmVJZCIsImFjdGl2ZVNpbXVsYXRpb24iLCJmaW5kIiwic2hvdWxkU2hvd1N3aXRjaGVyIiwidGFyZ2V0Iiwicm91dGVCYWNrZWQiLCJjbG9zZUNob29zZXIiLCJvcHRpb25zIiwiaGFwdGljIiwicmVzdG9yZUZvY3VzIiwia2VlcEJhY2tkcm9wIiwiY2xvc2VEdXJhdGlvbk1zIiwicmVzdG9yZVRyaWdnZXJGb2N1cyIsImNvbnRhaW5zIiwiZm9jdXMiLCJwcmV2ZW50U2Nyb2xsIiwib3BlbkNob29zZXIiLCJ0cmlnZ2VyRWxlbWVudCIsIm1hcmtDaG9vc2VyT3ZlcmxheVJlYWR5IiwidW5kZWZpbmVkIiwicm91dGVSZXNldFRpbWVyIiwidG9nZ2xlQ2hvb3NlciIsInNlbGVjdFNpbXVsYXRpb24iLCJjbG9zZVNldHRsZU1zIiwidHJhbnNpdGlvbk9wdGlvbnMiLCJ0cmFuc2l0aW9uU3R5bGUiLCJyZWFkeUZhbGxiYWNrTXMiLCJyZWxlYXNlR2F0ZUJhY2tkcm9wT25Db21wbGV0ZSIsInJ1blNlbGVjdGlvbiIsImNsZWFuSG9tZUhyZWYiLCJ0YXJnZXRIb21lSHJlZiIsImVuY29kZVVSSUNvbXBvbmVudCIsInByZXZpb3VzSG9tZU1vZGUiLCJoYW5kbGVTZWxlY3Rpb25GYWlsdXJlIiwiY29tbWl0Rm9jdXNDaG9pY2UiLCJzdXJmYWNlIiwiYXBwbHlTZWxlY3RlZEhvbWVNb2RlIiwic3VyZmFjZVJlYWR5IiwiRXJyb3IiLCJhcHBsaWVkIiwiZGlkTmF2aWdhdGUiLCJyZXBsYWNlIiwiYWZ0ZXJSb3V0ZVJlYWR5Iiwib25GYWlsdXJlIiwiYXNzaWduIiwiY2F0Y2giLCJmaW5hbGx5Iiwib25Db21taXQiLCJ2YWx1ZSIsImRhaWx5SWQiLCJkYWlseVNpbXVsYXRpb25zIiwiaXNDaG9vc2VyTW91bnRlZCIsInNlbGVjdGVkSWQiLCJTaW11bGF0aW9uRm9jdXNTd2l0Y2hlciIsIl9zMiIsImJ1dHRvblJlZiIsIm5hbWUiLCJTaW11bGF0aW9uRm9jdXNDaG9vc2VyIiwiX3MzIiwibW9kYWxSZWYiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGFzc0xpc3QiLCJhZGQiLCJyZW1vdmUiLCJjYW5jZWxsZWQiLCJtb3VudCIsIm9uUmVhZHkiLCJmb2N1c0ZyYW1lIiwiY29hcnNlUG9pbnRlciIsIm1hdGNoTWVkaWEiLCJtYXRjaGVzIiwic2VsZWN0ZWQiLCJmaXJzdEJ1dHRvbiIsImhhbmRsZURpc21pc3MiLCJjYW5jZWxBbmltYXRpb25GcmFtZSIsImhhbmRsZURvY3VtZW50S2V5RG93biIsInByZXZlbnREZWZhdWx0IiwiaGFuZGxlS2V5RG93biIsImZvY3VzYWJsZSIsImxlbmd0aCIsImZpcnN0IiwibGFzdCIsInNoaWZ0S2V5IiwiYWN0aXZlRWxlbWVudCIsIm1vZGFsQ2xhc3NOYW1lIiwiam9pbiIsImluZGV4IiwiaXNBY3RpdmUiLCJfYyIsIl9jMiIsIl9jMyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJTaW11bGF0aW9uRm9jdXNQcm92aWRlci5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgdXNlQ2FsbGJhY2ssXG4gIHVzZUVmZmVjdCxcbiAgdXNlTWVtbyxcbiAgdXNlUmVmLFxuICB1c2VTdGF0ZSxcbn0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgQ2hldnJvbnNVcERvd24gfSBmcm9tICdsdWNpZGUtcmVhY3QnO1xuaW1wb3J0IHtcbiAgZ2V0RGFpbHlGb2N1c1NpbXVsYXRpb25zLFxuICBnZXRSZXNvbHZlZFNpbXVsYXRpb25Gb2N1cyxcbiAgZ2V0U2ltdWxhdGlvbkxhdW5jaFRhcmdldCxcbiAgcmVtZW1iZXJSZWxvYWRTaW11bGF0aW9uLFxuICBTSU1VTEFUSU9OX0ZPQ1VTX0NIQU5HRURfRVZFTlQsXG4gIFNJTVVMQVRJT05fRk9DVVNfU1RPUkFHRV9LRVksXG4gIHdyaXRlTWFudWFsU2ltdWxhdGlvbkZvY3VzLFxufSBmcm9tICcuLi8uLi9kYXRhL3NpbXVsYXRpb25DYXRhbG9nLmpzJztcbmltcG9ydCB7IGJ1aWxkUm91dGVIcmVmIH0gZnJvbSAnLi4vLi4vbGliL3JvdXRlcy5qcyc7XG5pbXBvcnQgeyB0cnlTcGFOYXZpZ2F0ZSB9IGZyb20gJy4uLy4uL2xpYi9zcGEtbmF2aWdhdGlvbi5qcyc7XG5pbXBvcnQgeyB0cmlnZ2VySGFwdGljIH0gZnJvbSAnLi4vLi4vbGliL2hhcHRpY3MuanMnO1xuaW1wb3J0IHtcbiAgZGlzbWlzc0dhdGVCYWNrZHJvcCxcbiAgZW5zdXJlR2F0ZU1vZGFsT3ZlcmxheSxcbiAgZ2V0R2F0ZU1vZGFsQ2xvc2VEdXJhdGlvbk1zLFxuICBwcmVwYXJlR2F0ZU1vZGFsT3Blbixcbn0gZnJvbSAnLi4vLi4vbGVnYWN5L21vZHVsZXMvdWkvZ2F0ZS1tb2RhbC1zaGFyZWQuanMnO1xuaW1wb3J0IHsgU2ltdWxhdGlvbkZvY3VzQ29udGV4dCwgdXNlU2ltdWxhdGlvbkZvY3VzIH0gZnJvbSAnLi9TaW11bGF0aW9uRm9jdXNDb250ZXh0LmpzJztcbmltcG9ydCB7IFNpbXVsYXRpb25JY29uIH0gZnJvbSAnLi9TaW11bGF0aW9uSWNvbi5qc3gnO1xuXG5jb25zdCBGT0NVU19NT0RBTF9JRCA9ICdzaW11bGF0aW9uLWZvY3VzLW1vZGFsJztcbmNvbnN0IENIT09TRVJfVElUTEVfSUQgPSAnc2ltdWxhdGlvbi1mb2N1cy1tb2RhbC10aXRsZSc7XG5jb25zdCBTSU1VTEFUSU9OX0ZPQ1VTX1JFQURZX0ZBTExCQUNLX01TID0gODUwO1xuY29uc3QgUk9VVEVfQkFDS0VEX1NJTVVMQVRJT05fUkVBRFlfRkFMTEJBQ0tfTVMgPSAxMzAwMDtcbmNvbnN0IERBSUxZX0ZPQ1VTX1NJTVVMQVRJT05TID0gT2JqZWN0LmZyZWV6ZShnZXREYWlseUZvY3VzU2ltdWxhdGlvbnMoKSk7XG5jb25zdCBEQUlMWV9GT0NVU19JRF9TRVQgPSBuZXcgU2V0KERBSUxZX0ZPQ1VTX1NJTVVMQVRJT05TLm1hcCgoZW50cnkpID0+IGVudHJ5LmlkKSk7XG5cbmZ1bmN0aW9uIHJlYWRVcmxNb2RlKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgcmV0dXJuIHBhcmFtcy5nZXQoJ21vZGUnKSB8fCBwYXJhbXMuZ2V0KCdmb2N1cycpIHx8IHBhcmFtcy5nZXQoJ3NpbXVsYXRpb24nKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcmVwbGFjZUN1cnJlbnRVcmwoaHJlZikge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybjtcbiAgY29uc3QgbmV4dEhyZWYgPSBTdHJpbmcoaHJlZiB8fCAnJyk7XG4gIGlmICghbmV4dEhyZWYpIHJldHVybjtcbiAgY29uc3QgY3VycmVudEhyZWYgPSBgJHt3aW5kb3cubG9jYXRpb24ucGF0aG5hbWV9JHt3aW5kb3cubG9jYXRpb24uc2VhcmNofSR7d2luZG93LmxvY2F0aW9uLmhhc2h9YDtcbiAgaWYgKGN1cnJlbnRIcmVmID09PSBuZXh0SHJlZikgcmV0dXJuO1xuICB0cnkge1xuICAgIHdpbmRvdy5oaXN0b3J5LnJlcGxhY2VTdGF0ZSh3aW5kb3cuaGlzdG9yeS5zdGF0ZSB8fCB7fSwgJycsIG5leHRIcmVmKTtcbiAgfSBjYXRjaCB7XG4gICAgLyogVVJMIHN5bmMgaXMgYSBwcm9ncmVzc2l2ZSBlbmhhbmNlbWVudDsgcnVudGltZSBtb2RlIGhhcyBhbHJlYWR5IGNoYW5nZWQuICovXG4gIH1cbn1cblxuZnVuY3Rpb24gYXBwbHlIb21lTW9kZShtb2RlKSB7XG4gIHJldHVybiBpbXBvcnQoJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL21vZGVzL21vZGUtY29udHJvbGxlci5qcycpXG4gICAgLnRoZW4oKG1vZHVsZSkgPT4gbW9kdWxlLnNldE1vZGUobW9kZSkpO1xufVxuXG5mdW5jdGlvbiB3YWl0Rm9ySG9tZU1vZGVTdXJmYWNlKHRpbWVvdXRNcyA9IDMyMDApIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShmYWxzZSk7XG4gIH1cblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICBjb25zdCBzdGFydGVkQXQgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICBjb25zdCB0aWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2MnKTtcbiAgICAgIGNvbnN0IGhhc0RhaWx5U3RhZ2UgPSBCb29sZWFuKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5kYWlseS1zaW11bGF0aW9uLWxheWVyJykpO1xuICAgICAgY29uc3QgY2FudmFzUmVhZHkgPSBCb29sZWFuKGNhbnZhcyAmJiBjYW52YXMud2lkdGggPj0gNjQgJiYgY2FudmFzLmhlaWdodCA+PSA2NCk7XG4gICAgICBpZiAoY2FudmFzUmVhZHkgJiYgIWhhc0RhaWx5U3RhZ2UpIHtcbiAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHBlcmZvcm1hbmNlLm5vdygpIC0gc3RhcnRlZEF0ID49IHRpbWVvdXRNcykge1xuICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgICB9O1xuXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSh0aWNrKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGdldEZvY3VzYWJsZUVsZW1lbnRzKGNvbnRhaW5lcikge1xuICBpZiAoIWNvbnRhaW5lcikgcmV0dXJuIFtdO1xuICByZXR1cm4gQXJyYXkuZnJvbShjb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcbiAgICAnYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgW2hyZWZdLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIHNlbGVjdDpub3QoW2Rpc2FibGVkXSksIHRleHRhcmVhOm5vdChbZGlzYWJsZWRdKSwgW3RhYmluZGV4XTpub3QoW3RhYmluZGV4PVwiLTFcIl0pJyxcbiAgKSkuZmlsdGVyKChlbGVtZW50KSA9PiB7XG4gICAgY29uc3Qgc3R5bGVzID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG4gICAgcmV0dXJuIHN0eWxlcy5kaXNwbGF5ICE9PSAnbm9uZScgJiYgc3R5bGVzLnZpc2liaWxpdHkgIT09ICdoaWRkZW4nO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcHVibGlzaFNpbXVsYXRpb25Td2l0Y2hTdGF0ZShzaW11bGF0aW9uSWQsIHN0YXR1cywgZXJyb3IgPSBudWxsKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICBjb25zdCBzbmFwc2hvdCA9IE9iamVjdC5mcmVlemUoe1xuICAgIHNpbXVsYXRpb25JZCxcbiAgICBzdGF0dXMsXG4gICAgZXJyb3I6IGVycm9yPy5tZXNzYWdlIHx8IFN0cmluZyhlcnJvciB8fCAnJyksXG4gICAgYXQ6IHBlcmZvcm1hbmNlLm5vdygpLFxuICB9KTtcbiAgd2luZG93Ll9fQUJTX1NJTVVMQVRJT05fU1dJVENIX18gPSBzbmFwc2hvdDtcbiAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhYnM6c2ltdWxhdGlvbi1zd2l0Y2gtc3RhdGUnLCB7IGRldGFpbDogc25hcHNob3QgfSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gU2ltdWxhdGlvbkZvY3VzUHJvdmlkZXIoe1xuICByb3V0ZUlkLFxuICBzdXJmYWNlUm91dGVJZCA9IHJvdXRlSWQsXG4gIHRyYW5zaXRpb25DdXJyZW50Um91dGUgPSBudWxsLFxuICBjaGlsZHJlbixcbn0pIHtcbiAgY29uc3Qgcm91dGVJZFJlZiA9IHVzZVJlZihyb3V0ZUlkKTtcbiAgY29uc3QgcmV0dXJuRm9jdXNSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGNsb3NlVGltZXJSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHNlbGVjdGlvblRpbWVyUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbZm9jdXNTdGF0ZSwgc2V0Rm9jdXNTdGF0ZV0gPSB1c2VTdGF0ZSgoKSA9PiBnZXRSZXNvbHZlZFNpbXVsYXRpb25Gb2N1cygpKTtcbiAgY29uc3QgW2hvbWVNb2RlLCBzZXRIb21lTW9kZV0gPSB1c2VTdGF0ZShyZWFkVXJsTW9kZSk7XG4gIGNvbnN0IFtvcHRpbWlzdGljQWN0aXZlSWQsIHNldE9wdGltaXN0aWNBY3RpdmVJZF0gPSB1c2VTdGF0ZShudWxsKTtcbiAgY29uc3QgW2lzQ2hvb3Nlck9wZW4sIHNldENob29zZXJPcGVuXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2lzQ2hvb3NlckNsb3NpbmcsIHNldENob29zZXJDbG9zaW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW2lzQ2hvb3NlckFjdGl2ZSwgc2V0Q2hvb3NlckFjdGl2ZV0gPSB1c2VTdGF0ZShmYWxzZSk7XG5cbiAgY29uc3QgcmVmcmVzaEZvY3VzU3RhdGUgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0Rm9jdXNTdGF0ZShnZXRSZXNvbHZlZFNpbXVsYXRpb25Gb2N1cygpKTtcbiAgfSwgW10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgcm91dGVJZFJlZi5jdXJyZW50ID0gcm91dGVJZDtcbiAgICBpZiAoc2VsZWN0aW9uVGltZXJSZWYuY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dChzZWxlY3Rpb25UaW1lclJlZi5jdXJyZW50KTtcbiAgICAgIHNlbGVjdGlvblRpbWVyUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlLCBpbnN0YW50OiB0cnVlIH0pO1xuICAgIH1cbiAgICBjb25zdCBzeW5jVGltZXIgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZXRIb21lTW9kZShyZWFkVXJsTW9kZSgpKTtcbiAgICAgIHNldE9wdGltaXN0aWNBY3RpdmVJZChudWxsKTtcbiAgICAgIHJlZnJlc2hGb2N1c1N0YXRlKCk7XG4gICAgfSwgMCk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoc3luY1RpbWVyKTtcbiAgICB9O1xuICB9LCBbcmVmcmVzaEZvY3VzU3RhdGUsIHJvdXRlSWQsIHN1cmZhY2VSb3V0ZUlkXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBoYW5kbGVNb2RlQ2hhbmdlZCA9IChldmVudCkgPT4ge1xuICAgICAgY29uc3QgbmV4dE1vZGUgPSBldmVudD8uZGV0YWlsPy5tb2RlIHx8IG51bGw7XG4gICAgICBzZXRIb21lTW9kZShuZXh0TW9kZSk7XG4gICAgICBzZXRPcHRpbWlzdGljQWN0aXZlSWQobnVsbCk7XG4gICAgICByZWZyZXNoRm9jdXNTdGF0ZSgpO1xuICAgIH07XG4gICAgY29uc3QgaGFuZGxlU3RvcmFnZSA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKCFldmVudCB8fCBldmVudC5rZXkgPT09IFNJTVVMQVRJT05fRk9DVVNfU1RPUkFHRV9LRVkpIHtcbiAgICAgICAgcmVmcmVzaEZvY3VzU3RhdGUoKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGhhbmRsZUZvY3VzQ2hhbmdlZCA9ICgpID0+IHtcbiAgICAgIHNldEhvbWVNb2RlKHJlYWRVcmxNb2RlKCkpO1xuICAgICAgc2V0T3B0aW1pc3RpY0FjdGl2ZUlkKG51bGwpO1xuICAgICAgcmVmcmVzaEZvY3VzU3RhdGUoKTtcbiAgICB9O1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JiOm1vZGVDaGFuZ2VkJywgaGFuZGxlTW9kZUNoYW5nZWQpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFNJTVVMQVRJT05fRk9DVVNfQ0hBTkdFRF9FVkVOVCwgaGFuZGxlRm9jdXNDaGFuZ2VkKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignc3RvcmFnZScsIGhhbmRsZVN0b3JhZ2UpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignYmI6bW9kZUNoYW5nZWQnLCBoYW5kbGVNb2RlQ2hhbmdlZCk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihTSU1VTEFUSU9OX0ZPQ1VTX0NIQU5HRURfRVZFTlQsIGhhbmRsZUZvY3VzQ2hhbmdlZCk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignc3RvcmFnZScsIGhhbmRsZVN0b3JhZ2UpO1xuICAgIH07XG4gIH0sIFtyZWZyZXNoRm9jdXNTdGF0ZV0pO1xuXG4gIGNvbnN0IHJvdXRlSXNEYWlseUZvY3VzID0gcm91dGVJZCA9PT0gJ2hvbWUnICYmIERBSUxZX0ZPQ1VTX0lEX1NFVC5oYXMoc3VyZmFjZVJvdXRlSWQpO1xuICBjb25zdCBhY3RpdmVJZCA9IG9wdGltaXN0aWNBY3RpdmVJZFxuICAgIHx8IChyb3V0ZUlzRGFpbHlGb2N1cyA/IHN1cmZhY2VSb3V0ZUlkIDogbnVsbClcbiAgICB8fCAocm91dGVJZCA9PT0gJ2hvbWUnICYmIERBSUxZX0ZPQ1VTX0lEX1NFVC5oYXMoaG9tZU1vZGUpID8gaG9tZU1vZGUgOiBudWxsKVxuICAgIHx8IGZvY3VzU3RhdGUuYWN0aXZlSWQ7XG4gIGNvbnN0IGFjdGl2ZVNpbXVsYXRpb24gPSBEQUlMWV9GT0NVU19TSU1VTEFUSU9OUy5maW5kKChlbnRyeSkgPT4gZW50cnkuaWQgPT09IGFjdGl2ZUlkKVxuICAgIHx8IGZvY3VzU3RhdGUuYWN0aXZlU2ltdWxhdGlvblxuICAgIHx8IERBSUxZX0ZPQ1VTX1NJTVVMQVRJT05TWzBdXG4gICAgfHwgbnVsbDtcbiAgY29uc3Qgc2hvdWxkU2hvd1N3aXRjaGVyID0gcm91dGVJZCA9PT0gJ2hvbWUnIHx8IHJvdXRlSXNEYWlseUZvY3VzO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFyb3V0ZUlzRGFpbHlGb2N1cykgcmV0dXJuO1xuICAgIHJlbWVtYmVyUmVsb2FkU2ltdWxhdGlvbihzdXJmYWNlUm91dGVJZCk7XG4gICAgY29uc3QgdGFyZ2V0ID0gZ2V0U2ltdWxhdGlvbkxhdW5jaFRhcmdldChzdXJmYWNlUm91dGVJZCk7XG4gICAgaWYgKHRhcmdldD8ucm91dGVCYWNrZWQpIHtcbiAgICAgIHJlcGxhY2VDdXJyZW50VXJsKGJ1aWxkUm91dGVIcmVmKCdob21lJykpO1xuICAgIH1cbiAgfSwgW3JvdXRlSXNEYWlseUZvY3VzLCBzdXJmYWNlUm91dGVJZF0pO1xuXG4gIGNvbnN0IGNsb3NlQ2hvb3NlciA9IHVzZUNhbGxiYWNrKChvcHRpb25zID0ge30pID0+IHtcbiAgICBjb25zdCB7IGhhcHRpYyA9IHRydWUsIHJlc3RvcmVGb2N1cyA9IHRydWUsIGtlZXBCYWNrZHJvcCA9IGZhbHNlIH0gPSBvcHRpb25zO1xuICAgIGlmIChjbG9zZVRpbWVyUmVmLmN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoY2xvc2VUaW1lclJlZi5jdXJyZW50KTtcbiAgICAgIGNsb3NlVGltZXJSZWYuY3VycmVudCA9IG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNsb3NlRHVyYXRpb25NcyA9IGdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25Ncyh7IGtlZXBCYWNrZHJvcCB9KTtcbiAgICBzZXRDaG9vc2VyQWN0aXZlKGZhbHNlKTtcbiAgICBzZXRDaG9vc2VyQ2xvc2luZyh0cnVlKTtcbiAgICBzZXRDaG9vc2VyT3BlbihmYWxzZSk7XG4gICAgaWYgKGhhcHRpYykgdHJpZ2dlckhhcHRpYygnY2xvc2UnKTtcbiAgICBpZiAoIWtlZXBCYWNrZHJvcCkge1xuICAgICAgZGlzbWlzc0dhdGVCYWNrZHJvcCgpO1xuICAgIH1cbiAgICBjbG9zZVRpbWVyUmVmLmN1cnJlbnQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZXRDaG9vc2VyQ2xvc2luZyhmYWxzZSk7XG4gICAgICBjbG9zZVRpbWVyUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIH0sIGNsb3NlRHVyYXRpb25Ncyk7XG4gICAgaWYgKCFyZXN0b3JlRm9jdXMpIHJldHVybjtcblxuICAgIGNvbnN0IHJlc3RvcmVUcmlnZ2VyRm9jdXMgPSAoKSA9PiB7XG4gICAgICBpZiAocmV0dXJuRm9jdXNSZWYuY3VycmVudCAmJiBkb2N1bWVudC5jb250YWlucyhyZXR1cm5Gb2N1c1JlZi5jdXJyZW50KSkge1xuICAgICAgICByZXR1cm5Gb2N1c1JlZi5jdXJyZW50LmZvY3VzKHsgcHJldmVudFNjcm9sbDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luZG93LnNldFRpbWVvdXQocmVzdG9yZVRyaWdnZXJGb2N1cywgMCk7XG4gICAgd2luZG93LnNldFRpbWVvdXQocmVzdG9yZVRyaWdnZXJGb2N1cywgODApO1xuICAgIHdpbmRvdy5zZXRUaW1lb3V0KHJlc3RvcmVUcmlnZ2VyRm9jdXMsIDE4MCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBvcGVuQ2hvb3NlciA9IHVzZUNhbGxiYWNrKCh0cmlnZ2VyRWxlbWVudCA9IG51bGwpID0+IHtcbiAgICBpZiAoY2xvc2VUaW1lclJlZi5jdXJyZW50ICE9PSBudWxsKSB7XG4gICAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KGNsb3NlVGltZXJSZWYuY3VycmVudCk7XG4gICAgICBjbG9zZVRpbWVyUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgIH1cbiAgICBzZXRDaG9vc2VyQ2xvc2luZyhmYWxzZSk7XG4gICAgc2V0Q2hvb3NlckFjdGl2ZShmYWxzZSk7XG4gICAgcmV0dXJuRm9jdXNSZWYuY3VycmVudCA9IHRyaWdnZXJFbGVtZW50O1xuICAgIHNldENob29zZXJPcGVuKHRydWUpO1xuICAgIHRyaWdnZXJIYXB0aWMoJ29wZW4nKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IG1hcmtDaG9vc2VyT3ZlcmxheVJlYWR5ID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHNldENob29zZXJBY3RpdmUodHJ1ZSk7XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChzaG91bGRTaG93U3dpdGNoZXIgfHwgKCFpc0Nob29zZXJPcGVuICYmICFpc0Nob29zZXJDbG9zaW5nICYmICFpc0Nob29zZXJBY3RpdmUpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlUmVzZXRUaW1lciA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIGlmIChjbG9zZVRpbWVyUmVmLmN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChjbG9zZVRpbWVyUmVmLmN1cnJlbnQpO1xuICAgICAgICBjbG9zZVRpbWVyUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfVxuICAgICAgc2V0Q2hvb3NlckFjdGl2ZShmYWxzZSk7XG4gICAgICBzZXRDaG9vc2VyQ2xvc2luZyhmYWxzZSk7XG4gICAgICBzZXRDaG9vc2VyT3BlbihmYWxzZSk7XG4gICAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKCk7XG4gICAgfSwgMCk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dChyb3V0ZVJlc2V0VGltZXIpO1xuICAgIH07XG4gIH0sIFtpc0Nob29zZXJBY3RpdmUsIGlzQ2hvb3NlckNsb3NpbmcsIGlzQ2hvb3Nlck9wZW4sIHNob3VsZFNob3dTd2l0Y2hlcl0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiAoKSA9PiB7XG4gICAgaWYgKGNsb3NlVGltZXJSZWYuY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dChjbG9zZVRpbWVyUmVmLmN1cnJlbnQpO1xuICAgIH1cbiAgICBpZiAoc2VsZWN0aW9uVGltZXJSZWYuY3VycmVudCAhPT0gbnVsbCkge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dChzZWxlY3Rpb25UaW1lclJlZi5jdXJyZW50KTtcbiAgICB9XG4gICAgZGlzbWlzc0dhdGVCYWNrZHJvcCh7IHN1cHByZXNzUmV0dXJuQW5pbWF0aW9uOiB0cnVlLCBpbnN0YW50OiB0cnVlIH0pO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgdG9nZ2xlQ2hvb3NlciA9IHVzZUNhbGxiYWNrKCh0cmlnZ2VyRWxlbWVudCA9IG51bGwpID0+IHtcbiAgICBpZiAoaXNDaG9vc2VyT3Blbikge1xuICAgICAgY2xvc2VDaG9vc2VyKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIG9wZW5DaG9vc2VyKHRyaWdnZXJFbGVtZW50KTtcbiAgfSwgW2Nsb3NlQ2hvb3NlciwgaXNDaG9vc2VyT3Blbiwgb3BlbkNob29zZXJdKTtcblxuICBjb25zdCBzZWxlY3RTaW11bGF0aW9uID0gdXNlQ2FsbGJhY2soKHNpbXVsYXRpb25JZCkgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IGdldFNpbXVsYXRpb25MYXVuY2hUYXJnZXQoc2ltdWxhdGlvbklkKTtcbiAgICBpZiAoIXRhcmdldCkgcmV0dXJuIGZhbHNlO1xuXG4gICAgaWYgKHNpbXVsYXRpb25JZCA9PT0gYWN0aXZlSWQpIHtcbiAgICAgIGNsb3NlQ2hvb3Nlcih7IHJlc3RvcmVGb2N1czogZmFsc2UgfSk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICB0cmlnZ2VySGFwdGljKCdzdGVwJyk7XG4gICAgc2V0T3B0aW1pc3RpY0FjdGl2ZUlkKHNpbXVsYXRpb25JZCk7XG4gICAgY2xvc2VDaG9vc2VyKHsgaGFwdGljOiBmYWxzZSwgcmVzdG9yZUZvY3VzOiBmYWxzZSwga2VlcEJhY2tkcm9wOiB0cnVlIH0pO1xuXG4gICAgY29uc3QgY2xvc2VTZXR0bGVNcyA9IGdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25Ncyh7IGtlZXBCYWNrZHJvcDogdHJ1ZSB9KTtcbiAgICBjb25zdCB0cmFuc2l0aW9uT3B0aW9ucyA9IHtcbiAgICAgIHRyYW5zaXRpb25TdHlsZTogJ3NpbXVsYXRpb24tZm9jdXMnLFxuICAgICAgcmVhZHlGYWxsYmFja01zOiB0YXJnZXQucm91dGVCYWNrZWRcbiAgICAgICAgPyBST1VURV9CQUNLRURfU0lNVUxBVElPTl9SRUFEWV9GQUxMQkFDS19NU1xuICAgICAgICA6IFNJTVVMQVRJT05fRk9DVVNfUkVBRFlfRkFMTEJBQ0tfTVMsXG4gICAgICByZWxlYXNlR2F0ZUJhY2tkcm9wT25Db21wbGV0ZTogdHJ1ZSxcbiAgICB9O1xuXG4gICAgaWYgKHNlbGVjdGlvblRpbWVyUmVmLmN1cnJlbnQgIT09IG51bGwpIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQoc2VsZWN0aW9uVGltZXJSZWYuY3VycmVudCk7XG4gICAgfVxuICAgIHNlbGVjdGlvblRpbWVyUmVmLmN1cnJlbnQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICBzZWxlY3Rpb25UaW1lclJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICAgIGNvbnN0IHJ1blNlbGVjdGlvbiA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgY2xlYW5Ib21lSHJlZiA9IGJ1aWxkUm91dGVIcmVmKCdob21lJyk7XG4gICAgICAgIGNvbnN0IHRhcmdldEhvbWVIcmVmID0gYCR7Y2xlYW5Ib21lSHJlZn0/bW9kZT0ke2VuY29kZVVSSUNvbXBvbmVudCh0YXJnZXQubW9kZSB8fCAnJyl9YDtcbiAgICAgICAgY29uc3QgcHJldmlvdXNIb21lTW9kZSA9IGhvbWVNb2RlO1xuICAgICAgICBjb25zdCBoYW5kbGVTZWxlY3Rpb25GYWlsdXJlID0gKGVycm9yKSA9PiB7XG4gICAgICAgICAgc2V0T3B0aW1pc3RpY0FjdGl2ZUlkKG51bGwpO1xuICAgICAgICAgIHNldEhvbWVNb2RlKHByZXZpb3VzSG9tZU1vZGUpO1xuICAgICAgICAgIGRpc21pc3NHYXRlQmFja2Ryb3AoeyBpbnN0YW50OiB0cnVlIH0pO1xuICAgICAgICAgIHB1Ymxpc2hTaW11bGF0aW9uU3dpdGNoU3RhdGUoc2ltdWxhdGlvbklkLCAnZmFpbGVkJywgZXJyb3IpO1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBjb21taXRGb2N1c0Nob2ljZSA9ICgpID0+IHtcbiAgICAgICAgICB3cml0ZU1hbnVhbFNpbXVsYXRpb25Gb2N1cyhzaW11bGF0aW9uSWQpO1xuICAgICAgICAgIHJlZnJlc2hGb2N1c1N0YXRlKCk7XG4gICAgICAgICAgcHVibGlzaFNpbXVsYXRpb25Td2l0Y2hTdGF0ZShzaW11bGF0aW9uSWQsICdyZWFkeScpO1xuICAgICAgICB9O1xuICAgICAgICBpZiAodGFyZ2V0LnN1cmZhY2UgPT09ICdob21lLW1vZGUnKSB7XG4gICAgICAgICAgY29uc3QgYXBwbHlTZWxlY3RlZEhvbWVNb2RlID0gYXN5bmMgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc3VyZmFjZVJlYWR5ID0gYXdhaXQgd2FpdEZvckhvbWVNb2RlU3VyZmFjZSgpO1xuICAgICAgICAgICAgaWYgKCFzdXJmYWNlUmVhZHkpIHRocm93IG5ldyBFcnJvcignSG9tZSBzaW11bGF0aW9uIHN1cmZhY2UgZGlkIG5vdCBiZWNvbWUgcmVhZHknKTtcbiAgICAgICAgICAgIHNldEhvbWVNb2RlKHRhcmdldC5tb2RlKTtcbiAgICAgICAgICAgIGNvbnN0IGFwcGxpZWQgPSBhd2FpdCBhcHBseUhvbWVNb2RlKHRhcmdldC5tb2RlKTtcbiAgICAgICAgICAgIGlmIChhcHBsaWVkID09PSBmYWxzZSkgdGhyb3cgbmV3IEVycm9yKGBTaW11bGF0aW9uIFwiJHt0YXJnZXQubW9kZX1cIiBmYWlsZWQgdG8gaW5pdGlhbGl6ZWApO1xuICAgICAgICAgICAgcmVwbGFjZUN1cnJlbnRVcmwoY2xlYW5Ib21lSHJlZik7XG4gICAgICAgICAgICBjb21taXRGb2N1c0Nob2ljZSgpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGlmIChyb3V0ZUlzRGFpbHlGb2N1cykge1xuICAgICAgICAgICAgY29uc3QgZGlkTmF2aWdhdGUgPSB0cnlTcGFOYXZpZ2F0ZSh0YXJnZXRIb21lSHJlZiwge1xuICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgICAuLi50cmFuc2l0aW9uT3B0aW9ucyxcbiAgICAgICAgICAgICAgYWZ0ZXJSb3V0ZVJlYWR5OiBhcHBseVNlbGVjdGVkSG9tZU1vZGUsXG4gICAgICAgICAgICAgIG9uRmFpbHVyZTogaGFuZGxlU2VsZWN0aW9uRmFpbHVyZSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaWYgKCFkaWROYXZpZ2F0ZSkge1xuICAgICAgICAgICAgICBjb21taXRGb2N1c0Nob2ljZSgpO1xuICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uYXNzaWduKGNsZWFuSG9tZUhyZWYpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChyb3V0ZUlkUmVmLmN1cnJlbnQgPT09ICdob21lJykge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0cmFuc2l0aW9uQ3VycmVudFJvdXRlID09PSAnZnVuY3Rpb24nXG4gICAgICAgICAgICAgICYmIHRyYW5zaXRpb25DdXJyZW50Um91dGUoYXBwbHlTZWxlY3RlZEhvbWVNb2RlLCB7XG4gICAgICAgICAgICAgICAgLi4udHJhbnNpdGlvbk9wdGlvbnMsXG4gICAgICAgICAgICAgICAgb25GYWlsdXJlOiBoYW5kbGVTZWxlY3Rpb25GYWlsdXJlLFxuICAgICAgICAgICAgICB9KSkge1xuICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICh0cnlTcGFOYXZpZ2F0ZSh0YXJnZXRIb21lSHJlZiwge1xuICAgICAgICAgICAgICByZXBsYWNlOiB0cnVlLFxuICAgICAgICAgICAgICAuLi50cmFuc2l0aW9uT3B0aW9ucyxcbiAgICAgICAgICAgICAgYWZ0ZXJSb3V0ZVJlYWR5OiBhcHBseVNlbGVjdGVkSG9tZU1vZGUsXG4gICAgICAgICAgICAgIG9uRmFpbHVyZTogaGFuZGxlU2VsZWN0aW9uRmFpbHVyZSxcbiAgICAgICAgICAgIH0pKSB7XG4gICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdm9pZCBhcHBseVNlbGVjdGVkSG9tZU1vZGUoKVxuICAgICAgICAgICAgICAuY2F0Y2goaGFuZGxlU2VsZWN0aW9uRmFpbHVyZSlcbiAgICAgICAgICAgICAgLmZpbmFsbHkoKCkgPT4gZGlzbWlzc0dhdGVCYWNrZHJvcCh7IGluc3RhbnQ6IHRydWUgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmICghdHJ5U3BhTmF2aWdhdGUodGFyZ2V0SG9tZUhyZWYsIHtcbiAgICAgICAgICAgIC4uLnRyYW5zaXRpb25PcHRpb25zLFxuICAgICAgICAgICAgYWZ0ZXJSb3V0ZVJlYWR5OiBhcHBseVNlbGVjdGVkSG9tZU1vZGUsXG4gICAgICAgICAgICBvbkZhaWx1cmU6IGhhbmRsZVNlbGVjdGlvbkZhaWx1cmUsXG4gICAgICAgICAgfSkpIHtcbiAgICAgICAgICAgIGNvbW1pdEZvY3VzQ2hvaWNlKCk7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uYXNzaWduKGNsZWFuSG9tZUhyZWYpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBwdWJsaXNoU2ltdWxhdGlvblN3aXRjaFN0YXRlKHNpbXVsYXRpb25JZCwgJ3ByZWxvYWRpbmcnKTtcbiAgICAgICAgc2V0SG9tZU1vZGUobnVsbCk7XG4gICAgICAgIGlmICghdHJ5U3BhTmF2aWdhdGUodGFyZ2V0LmhyZWYsIHtcbiAgICAgICAgICAuLi50cmFuc2l0aW9uT3B0aW9ucyxcbiAgICAgICAgICBvbkNvbW1pdDogY29tbWl0Rm9jdXNDaG9pY2UsXG4gICAgICAgICAgb25GYWlsdXJlOiBoYW5kbGVTZWxlY3Rpb25GYWlsdXJlLFxuICAgICAgICB9KSkge1xuICAgICAgICAgIGNvbW1pdEZvY3VzQ2hvaWNlKCk7XG4gICAgICAgICAgd2luZG93LmxvY2F0aW9uLmFzc2lnbih0YXJnZXQuaHJlZik7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBydW5TZWxlY3Rpb24oKTtcbiAgICB9LCBjbG9zZVNldHRsZU1zKTtcblxuICAgIHJldHVybiB0cnVlO1xuICB9LCBbYWN0aXZlSWQsIGNsb3NlQ2hvb3NlciwgaG9tZU1vZGUsIHJlZnJlc2hGb2N1c1N0YXRlLCByb3V0ZUlzRGFpbHlGb2N1cywgdHJhbnNpdGlvbkN1cnJlbnRSb3V0ZV0pO1xuXG4gIGNvbnN0IHZhbHVlID0gdXNlTWVtbygoKSA9PiAoe1xuICAgIGFjdGl2ZUlkLFxuICAgIGFjdGl2ZVNpbXVsYXRpb24sXG4gICAgY2xvc2VDaG9vc2VyLFxuICAgIGRhaWx5SWQ6IGZvY3VzU3RhdGUuZGFpbHlJZCxcbiAgICBkYWlseVNpbXVsYXRpb25zOiBEQUlMWV9GT0NVU19TSU1VTEFUSU9OUyxcbiAgICBpc0Nob29zZXJBY3RpdmUsXG4gICAgaXNDaG9vc2VyQ2xvc2luZyxcbiAgICBpc0Nob29zZXJNb3VudGVkOiBpc0Nob29zZXJPcGVuIHx8IGlzQ2hvb3NlckNsb3NpbmcsXG4gICAgaXNDaG9vc2VyT3BlbixcbiAgICBtYXJrQ2hvb3Nlck92ZXJsYXlSZWFkeSxcbiAgICBvcGVuQ2hvb3NlcixcbiAgICByb3V0ZUlkLFxuICAgIHN1cmZhY2VSb3V0ZUlkLFxuICAgIHNlbGVjdGVkSWQ6IGZvY3VzU3RhdGUuc2VsZWN0ZWRJZCxcbiAgICBzZWxlY3RTaW11bGF0aW9uLFxuICAgIHNob3VsZFNob3dTd2l0Y2hlcixcbiAgICB0b2dnbGVDaG9vc2VyLFxuICB9KSwgW1xuICAgIGFjdGl2ZUlkLFxuICAgIGFjdGl2ZVNpbXVsYXRpb24sXG4gICAgY2xvc2VDaG9vc2VyLFxuICAgIGZvY3VzU3RhdGUuZGFpbHlJZCxcbiAgICBmb2N1c1N0YXRlLnNlbGVjdGVkSWQsXG4gICAgaXNDaG9vc2VyQWN0aXZlLFxuICAgIGlzQ2hvb3NlckNsb3NpbmcsXG4gICAgaXNDaG9vc2VyT3BlbixcbiAgICBtYXJrQ2hvb3Nlck92ZXJsYXlSZWFkeSxcbiAgICBvcGVuQ2hvb3NlcixcbiAgICByb3V0ZUlkLFxuICAgIHN1cmZhY2VSb3V0ZUlkLFxuICAgIHNlbGVjdFNpbXVsYXRpb24sXG4gICAgc2hvdWxkU2hvd1N3aXRjaGVyLFxuICAgIHRvZ2dsZUNob29zZXIsXG4gIF0pO1xuXG4gIHJldHVybiAoXG4gICAgPFNpbXVsYXRpb25Gb2N1c0NvbnRleHQuUHJvdmlkZXIgdmFsdWU9e3ZhbHVlfT5cbiAgICAgIHtjaGlsZHJlbn1cbiAgICA8L1NpbXVsYXRpb25Gb2N1c0NvbnRleHQuUHJvdmlkZXI+XG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBTaW11bGF0aW9uRm9jdXNTd2l0Y2hlcigpIHtcbiAgY29uc3Qge1xuICAgIGFjdGl2ZVNpbXVsYXRpb24sXG4gICAgaXNDaG9vc2VyT3BlbixcbiAgICBzaG91bGRTaG93U3dpdGNoZXIsXG4gICAgdG9nZ2xlQ2hvb3NlcixcbiAgfSA9IHVzZVNpbXVsYXRpb25Gb2N1cygpO1xuICBjb25zdCBidXR0b25SZWYgPSB1c2VSZWYobnVsbCk7XG5cbiAgaWYgKCFzaG91bGRTaG93U3dpdGNoZXIgfHwgIWFjdGl2ZVNpbXVsYXRpb24pIHJldHVybiBudWxsO1xuXG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWZvY3VzLXN3aXRjaGVyLXNsb3RcIiBkYXRhLW9wZW49e1N0cmluZyhpc0Nob29zZXJPcGVuKX0+XG4gICAgICA8YnV0dG9uXG4gICAgICAgIHJlZj17YnV0dG9uUmVmfVxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1mb2N1cy1waWxsIHNpbXVsYXRpb24tZm9jdXMtc3dpdGNoZXJcIlxuICAgICAgICBkYXRhLXNpbXVsYXRpb24taWQ9e2FjdGl2ZVNpbXVsYXRpb24uaWR9XG4gICAgICAgIGFyaWEtaGFzcG9wdXA9XCJkaWFsb2dcIlxuICAgICAgICBhcmlhLWV4cGFuZGVkPXtpc0Nob29zZXJPcGVufVxuICAgICAgICBhcmlhLWNvbnRyb2xzPXtGT0NVU19NT0RBTF9JRH1cbiAgICAgICAgb25DbGljaz17KCkgPT4gdG9nZ2xlQ2hvb3NlcihidXR0b25SZWYuY3VycmVudCl9XG4gICAgICA+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZm9jdXMtcGlsbF9fbGFiZWxcIj57YWN0aXZlU2ltdWxhdGlvbi5uYW1lfTwvc3Bhbj5cbiAgICAgICAgPENoZXZyb25zVXBEb3duIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZm9jdXMtcGlsbF9faWNvblwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIHN0cm9rZVdpZHRoPXsxLjh9IC8+XG4gICAgICA8L2J1dHRvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFNpbXVsYXRpb25Gb2N1c0Nob29zZXIoKSB7XG4gIGNvbnN0IHtcbiAgICBhY3RpdmVJZCxcbiAgICBjbG9zZUNob29zZXIsXG4gICAgZGFpbHlTaW11bGF0aW9ucyxcbiAgICBpc0Nob29zZXJBY3RpdmUsXG4gICAgaXNDaG9vc2VyQ2xvc2luZyxcbiAgICBpc0Nob29zZXJNb3VudGVkLFxuICAgIGlzQ2hvb3Nlck9wZW4sXG4gICAgbWFya0Nob29zZXJPdmVybGF5UmVhZHksXG4gICAgc2VsZWN0U2ltdWxhdGlvbixcbiAgfSA9IHVzZVNpbXVsYXRpb25Gb2N1cygpO1xuICBjb25zdCBtb2RhbFJlZiA9IHVzZVJlZihudWxsKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghaXNDaG9vc2VyTW91bnRlZCkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LmFkZCgnc2ltdWxhdGlvbi1mb2N1cy1tb2RhbC1vcGVuJyk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QucmVtb3ZlKCdzaW11bGF0aW9uLWZvY3VzLW1vZGFsLW9wZW4nKTtcbiAgICB9O1xuICB9LCBbaXNDaG9vc2VyTW91bnRlZF0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFpc0Nob29zZXJPcGVuKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcblxuICAgIHRyeSB7XG4gICAgICBlbnN1cmVHYXRlTW9kYWxPdmVybGF5KCk7XG4gICAgICBwcmVwYXJlR2F0ZU1vZGFsT3Blbihtb2RhbFJlZi5jdXJyZW50LCB7XG4gICAgICAgIG1vdW50OiBmYWxzZSxcbiAgICAgICAgb25SZWFkeTogKCkgPT4ge1xuICAgICAgICAgIGlmICghY2FuY2VsbGVkKSB7XG4gICAgICAgICAgICBtYXJrQ2hvb3Nlck92ZXJsYXlSZWFkeSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0gY2F0Y2gge1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIGlmICghY2FuY2VsbGVkKSB7XG4gICAgICAgICAgbWFya0Nob29zZXJPdmVybGF5UmVhZHkoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNhbmNlbGxlZCA9IHRydWU7XG4gICAgfTtcbiAgfSwgW2lzQ2hvb3Nlck9wZW4sIG1hcmtDaG9vc2VyT3ZlcmxheVJlYWR5XSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWlzQ2hvb3NlckFjdGl2ZSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGZvY3VzRnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKCgpID0+IHtcbiAgICAgIGNvbnN0IGNvYXJzZVBvaW50ZXIgPSB3aW5kb3cubWF0Y2hNZWRpYT8uKCcoaG92ZXI6IG5vbmUpIGFuZCAocG9pbnRlcjogY29hcnNlKScpPy5tYXRjaGVzO1xuICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBjb2Fyc2VQb2ludGVyID8gbnVsbCA6IG1vZGFsUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3IoJ1thcmlhLWN1cnJlbnQ9XCJ0cnVlXCJdJyk7XG4gICAgICBjb25zdCBmaXJzdEJ1dHRvbiA9IG1vZGFsUmVmLmN1cnJlbnQ/LnF1ZXJ5U2VsZWN0b3IoJ2J1dHRvbicpO1xuICAgICAgKHNlbGVjdGVkIHx8IChjb2Fyc2VQb2ludGVyID8gbW9kYWxSZWYuY3VycmVudCA6IGZpcnN0QnV0dG9uKSk/LmZvY3VzKHsgcHJldmVudFNjcm9sbDogdHJ1ZSB9KTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGhhbmRsZURpc21pc3MgPSAoKSA9PiBjbG9zZUNob29zZXIoKTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb2RhbC1vdmVybGF5LWRpc21pc3MnLCBoYW5kbGVEaXNtaXNzKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGZvY3VzRnJhbWUpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW9kYWwtb3ZlcmxheS1kaXNtaXNzJywgaGFuZGxlRGlzbWlzcyk7XG4gICAgfTtcbiAgfSwgW2Nsb3NlQ2hvb3NlciwgaXNDaG9vc2VyQWN0aXZlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWlzQ2hvb3NlckFjdGl2ZSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIGNvbnN0IGhhbmRsZURvY3VtZW50S2V5RG93biA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKGV2ZW50LmtleSAhPT0gJ0VzY2FwZScpIHJldHVybjtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBjbG9zZUNob29zZXIoKTtcbiAgICB9O1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGhhbmRsZURvY3VtZW50S2V5RG93bik7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBoYW5kbGVEb2N1bWVudEtleURvd24pO1xuICAgIH07XG4gIH0sIFtjbG9zZUNob29zZXIsIGlzQ2hvb3NlckFjdGl2ZV0pO1xuXG4gIGNvbnN0IGhhbmRsZUtleURvd24gPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGNsb3NlQ2hvb3NlcigpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmIChldmVudC5rZXkgIT09ICdUYWInKSByZXR1cm47XG4gICAgY29uc3QgZm9jdXNhYmxlID0gZ2V0Rm9jdXNhYmxlRWxlbWVudHMobW9kYWxSZWYuY3VycmVudCk7XG4gICAgaWYgKCFmb2N1c2FibGUubGVuZ3RoKSByZXR1cm47XG5cbiAgICBjb25zdCBmaXJzdCA9IGZvY3VzYWJsZVswXTtcbiAgICBjb25zdCBsYXN0ID0gZm9jdXNhYmxlW2ZvY3VzYWJsZS5sZW5ndGggLSAxXTtcbiAgICBpZiAoZXZlbnQuc2hpZnRLZXkgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gZmlyc3QpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBsYXN0LmZvY3VzKCk7XG4gICAgfSBlbHNlIGlmICghZXZlbnQuc2hpZnRLZXkgJiYgZG9jdW1lbnQuYWN0aXZlRWxlbWVudCA9PT0gbGFzdCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGZpcnN0LmZvY3VzKCk7XG4gICAgfVxuICB9O1xuXG4gIGNvbnN0IG1vZGFsQ2xhc3NOYW1lID0gW1xuICAgICdzaW11bGF0aW9uLWZvY3VzLW1vZGFsJyxcbiAgICBpc0Nob29zZXJBY3RpdmUgPyAnYWN0aXZlJyA6ICcnLFxuICAgIGlzQ2hvb3NlckNsb3NpbmcgPyAnY2xvc2luZycgOiAnJyxcbiAgICAhaXNDaG9vc2VyTW91bnRlZCA/ICdoaWRkZW4nIDogJycsXG4gIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXZcbiAgICAgIHJlZj17bW9kYWxSZWZ9XG4gICAgICBpZD17Rk9DVVNfTU9EQUxfSUR9XG4gICAgICBjbGFzc05hbWU9e21vZGFsQ2xhc3NOYW1lfVxuICAgICAgYXJpYS1oaWRkZW49e2lzQ2hvb3NlckFjdGl2ZSA/ICdmYWxzZScgOiAndHJ1ZSd9XG4gICAgICByb2xlPVwiZGlhbG9nXCJcbiAgICAgIGFyaWEtbW9kYWw9XCJ0cnVlXCJcbiAgICAgIGFyaWEtbGFiZWxsZWRieT17Q0hPT1NFUl9USVRMRV9JRH1cbiAgICAgIHRhYkluZGV4PXstMX1cbiAgICAgIG9uS2V5RG93bj17aGFuZGxlS2V5RG93bn1cbiAgICA+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1vZGFsLW5hdiBzaW11bGF0aW9uLWZvY3VzLW1vZGFsX19uYXZcIj5cbiAgICAgICAgPGJ1dHRvblxuICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImdhdGUtYmFjayBhYnMtaWNvbi1idG5cIlxuICAgICAgICAgIGRhdGEtbW9kYWwtYmFja1xuICAgICAgICAgIGFyaWEtbGFiZWw9XCJDbG9zZSBzaW11bGF0aW9uIGNob29zZXJcIlxuICAgICAgICAgIG9uQ2xpY2s9eygpID0+IGNsb3NlQ2hvb3NlcigpfVxuICAgICAgICA+XG4gICAgICAgICAgPHN2Z1xuICAgICAgICAgICAgY2xhc3NOYW1lPVwicG9ydGZvbGlvLXByb2plY3Qtdmlld19fY2xvc2UtaWNvblwiXG4gICAgICAgICAgICB2aWV3Qm94PVwiMCAwIDI0IDI0XCJcbiAgICAgICAgICAgIHdpZHRoPVwiMjRcIlxuICAgICAgICAgICAgaGVpZ2h0PVwiMjRcIlxuICAgICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICAgIGZvY3VzYWJsZT1cImZhbHNlXCJcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8cGF0aFxuICAgICAgICAgICAgICBmaWxsPVwiY3VycmVudENvbG9yXCJcbiAgICAgICAgICAgICAgZD1cIk02LjIyIDQuOTMgMTIgMTAuNzFsNS43OC01Ljc4IDEuMjkgMS4yOUwxMy4yOSAxMmw1Ljc4IDUuNzgtMS4yOSAxLjI5TDEyIDEzLjI5bC01Ljc4IDUuNzgtMS4yOS0xLjI5TDEwLjcxIDEyIDQuOTMgNi4yMnpcIlxuICAgICAgICAgICAgLz5cbiAgICAgICAgICA8L3N2Zz5cbiAgICAgICAgICA8c3Bhbj5CQUNLPC9zcGFuPlxuICAgICAgICA8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8aDIgaWQ9e0NIT09TRVJfVElUTEVfSUR9IGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZm9jdXMtbW9kYWxfX3RpdGxlXCI+Q2hvb3NlIGEgc2ltdWxhdGlvbjwvaDI+XG5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1mb2N1cy1saXN0XCIgcm9sZT1cImxpc3RcIj5cbiAgICAgICAge2RhaWx5U2ltdWxhdGlvbnMubWFwKChlbnRyeSwgaW5kZXgpID0+IHtcbiAgICAgICAgICBjb25zdCBpc0FjdGl2ZSA9IGVudHJ5LmlkID09PSBhY3RpdmVJZDtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgPGJ1dHRvblxuICAgICAgICAgICAgICBrZXk9e2VudHJ5LmlkfVxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1mb2N1cy1yb3dcIlxuICAgICAgICAgICAgICBzdHlsZT17eyAnLS1zaW11bGF0aW9uLWZvY3VzLXJvdy1pbmRleCc6IGluZGV4IH19XG4gICAgICAgICAgICAgIGFyaWEtY3VycmVudD17aXNBY3RpdmUgPyAndHJ1ZScgOiB1bmRlZmluZWR9XG4gICAgICAgICAgICAgIG9uQ2xpY2s9eygpID0+IHNlbGVjdFNpbXVsYXRpb24oZW50cnkuaWQpfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8U2ltdWxhdGlvbkljb24gaWQ9e2VudHJ5LmlkfSBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWZvY3VzLXJvd19faWNvblwiIC8+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZm9jdXMtcm93X19jb3B5XCI+XG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1mb2N1cy1yb3dfX25hbWVcIj57ZW50cnkubmFtZX08L3NwYW4+XG4gICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICAgICk7XG4gICAgICAgIH0pfVxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvY29tcG9uZW50cy9zaW11bGF0aW9uLWZvY3VzL1NpbXVsYXRpb25Gb2N1c1Byb3ZpZGVyLmpzeCJ9