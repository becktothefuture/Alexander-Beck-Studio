import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/app/SiteApp.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useLayoutEffect = __vite__cjsImport1_react["useLayoutEffect"]; const useMemo = __vite__cjsImport1_react["useMemo"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"];
import { BodyClassManager } from "/src/components/layout/BodyClassManager.jsx";
import { StudioShell } from "/src/components/app/StudioShell.jsx";
import { getHomeRouteView, HOME_ROUTE_RUNTIME } from "/src/routes/home/HomeRoute.jsx";
import { getPortfolioRouteView, PORTFOLIO_ROUTE_RUNTIME } from "/src/routes/portfolio/PortfolioRoute.jsx";
import { ABOUT_ROUTE_RUNTIME, getAboutRouteView } from "/src/routes/about/AboutRoute.jsx";
import {
  ABOUT_NARRATIVE_LAB_ROUTE_RUNTIME,
  getAboutNarrativeLabRouteView
} from "/src/routes/about-narrative-lab/AboutNarrativeLabRoute.jsx";
import { CONTACT_ROUTE_RUNTIME, getContactRouteView } from "/src/routes/contact/ContactRoute.jsx";
import { getStyleguideRouteView, STYLEGUIDE_ROUTE_RUNTIME } from "/src/routes/styleguide/StyleguideRoute.jsx";
import {
  getSimulationLaunchpadRouteView,
  SIMULATION_LAUNCHPAD_ROUTE_RUNTIME
} from "/src/routes/simulation-launchpad/SimulationLaunchpadRoute.jsx";
import { getPaletteLabRouteView, PALETTE_LAB_ROUTE_RUNTIME } from "/src/routes/palette-lab/PaletteLabRoute.jsx";
import { getBeachBallRoomRouteView, BEACH_BALL_ROOM_ROUTE_RUNTIME } from "/src/routes/beach-ball-room/BeachBallRoomRoute.jsx";
import { getFlockOfBirdsRouteView, FLOCK_OF_BIRDS_ROUTE_RUNTIME } from "/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx";
import { getRepelRoomRouteView, REPEL_ROOM_ROUTE_RUNTIME } from "/src/routes/repel-room/RepelRoomRoute.jsx";
import { getMineralGrowthRouteView, MINERAL_GROWTH_ROUTE_RUNTIME } from "/src/routes/mineral-growth/MineralGrowthRoute.jsx";
import { getLoaderPlaygroundRouteView, LOADER_PLAYGROUND_ROUTE_RUNTIME } from "/src/routes/loader-playground/LoaderPlaygroundRoute.jsx";
import {
  getDailyFocusRouteView,
  isDailyFocusRouteRequest
} from "/src/routes/daily-focus/DailyFocusRoute.jsx";
import { preloadDailyFocusRuntime } from "/src/routes/daily-focus/dailyFocusRuntimeLoader.js";
import {
  APERTURE_BLOOM_ROUTE_RUNTIME,
  CONFLUENCE_BRIDGES_ROUTE_RUNTIME,
  getApertureBloomRouteView,
  getConfluenceBridgesRouteView,
  getNapoleonPointCloudRouteView,
  getRiftRingsRouteView,
  getSpatialScanRouteView,
  NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME,
  RIFT_RINGS_ROUTE_RUNTIME,
  SPATIAL_SCAN_ROUTE_RUNTIME
} from "/src/routes/concept-simulations/ConceptSimulationRoute.jsx";
import { useLegacyRouteRuntime } from "/src/hooks/useLegacyRouteRuntime.js";
import { useShellRouteTransition } from "/src/hooks/useShellRouteTransition.js";
import { useSiteHaptics } from "/src/hooks/useSiteHaptics.js";
import { DevConfigPanelBridge } from "/src/components/app/DevConfigPanelBridge.jsx";
import {
  SimulationFocusChooser,
  SimulationFocusProvider,
  SimulationFocusSwitcher
} from "/src/components/simulation-focus/SimulationFocusProvider.jsx";
import {
  getResolvedSimulationFocus,
  normalizeSimulationId,
  getSimulationLaunchTarget,
  SIMULATION_FOCUS_CHANGED_EVENT,
  SIMULATION_FOCUS_STORAGE_KEY
} from "/src/data/simulationCatalog.js";
import { completeDirectBoot, failDirectBoot } from "/src/legacy/modules/visual/page-orchestrator.js";
import { applyLayoutCSSVars, initState } from "/src/legacy/modules/core/state.js";
import { waitForFonts } from "/src/legacy/modules/utils/font-loader.js";
import { loadRuntimeConfig } from "/src/legacy/modules/utils/runtime-config.js";
import { loadShellConfig, syncShellToDocument } from "/src/legacy/modules/visual/site-shell.js";
import { initializeDarkMode } from "/src/legacy/modules/visual/dark-mode-v2.js";
import { initNoiseSystem } from "/src/legacy/modules/visual/noise-system.js";
import { initLinkCursorHop } from "/src/legacy/modules/ui/link-cursor-hop.js";
import { setupCustomCursor } from "/src/legacy/modules/rendering/cursor.js";
import { applyActiveRouteCursorColor } from "/src/legacy/modules/visual/colors.js";
import { isDarkThemeDocument } from "/src/lib/theme-state.js";
import { getRouteById } from "/src/lib/routes.js";
function defineRouteDescriptor(routeId, definition) {
  return Object.freeze({ ...getRouteById(routeId), ...definition });
}
const ROUTE_DESCRIPTORS = Object.freeze({
  home: defineRouteDescriptor("home", { title: "Alexander Beck Studio", getView: getHomeRouteView, runtime: HOME_ROUTE_RUNTIME }),
  contact: defineRouteDescriptor("contact", { title: "Contact - Alexander Beck Studio", getView: getContactRouteView, runtime: CONTACT_ROUTE_RUNTIME }),
  portfolio: defineRouteDescriptor("portfolio", { title: "Portfolio - Alexander Beck", getView: getPortfolioRouteView, runtime: PORTFOLIO_ROUTE_RUNTIME }),
  about: defineRouteDescriptor("about", { title: "About Me - Alexander Beck Studio", getView: getAboutRouteView, runtime: ABOUT_ROUTE_RUNTIME }),
  "about-narrative-lab": defineRouteDescriptor("about-narrative-lab", {
    title: "About Narrative Lab - Alexander Beck Studio",
    getView: getAboutNarrativeLabRouteView,
    runtime: ABOUT_NARRATIVE_LAB_ROUTE_RUNTIME
  }),
  styleguide: defineRouteDescriptor("styleguide", { getView: getStyleguideRouteView, runtime: STYLEGUIDE_ROUTE_RUNTIME }),
  simulations: defineRouteDescriptor("simulations", { getView: getSimulationLaunchpadRouteView, runtime: SIMULATION_LAUNCHPAD_ROUTE_RUNTIME }),
  "palette-lab": defineRouteDescriptor("palette-lab", { getView: getPaletteLabRouteView, runtime: PALETTE_LAB_ROUTE_RUNTIME }),
  "beach-ball-room": defineRouteDescriptor("beach-ball-room", { getView: getBeachBallRoomRouteView, runtime: BEACH_BALL_ROOM_ROUTE_RUNTIME }),
  "flock-of-birds": defineRouteDescriptor("flock-of-birds", { getView: getFlockOfBirdsRouteView, runtime: FLOCK_OF_BIRDS_ROUTE_RUNTIME }),
  "repel-room": defineRouteDescriptor("repel-room", { getView: getRepelRoomRouteView, runtime: REPEL_ROOM_ROUTE_RUNTIME }),
  "mineral-growth": defineRouteDescriptor("mineral-growth", { getView: getMineralGrowthRouteView, runtime: MINERAL_GROWTH_ROUTE_RUNTIME }),
  "aperture-bloom": defineRouteDescriptor("aperture-bloom", { getView: getApertureBloomRouteView, runtime: APERTURE_BLOOM_ROUTE_RUNTIME }),
  "confluence-bridges": defineRouteDescriptor("confluence-bridges", { getView: getConfluenceBridgesRouteView, runtime: CONFLUENCE_BRIDGES_ROUTE_RUNTIME }),
  "napoleon-point-cloud": defineRouteDescriptor("napoleon-point-cloud", { getView: getNapoleonPointCloudRouteView, runtime: NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME }),
  "rift-rings": defineRouteDescriptor("rift-rings", { getView: getRiftRingsRouteView, runtime: RIFT_RINGS_ROUTE_RUNTIME }),
  "spatial-scan": defineRouteDescriptor("spatial-scan", { getView: getSpatialScanRouteView, runtime: SPATIAL_SCAN_ROUTE_RUNTIME }),
  "loader-playground": defineRouteDescriptor("loader-playground", { getView: getLoaderPlaygroundRouteView, runtime: LOADER_PLAYGROUND_ROUTE_RUNTIME })
});
let sharedShellRuntimeSyncPromise = null;
function syncSharedShellRuntimeState() {
  if (!sharedShellRuntimeSyncPromise) {
    sharedShellRuntimeSyncPromise = Promise.all(
      [
        loadRuntimeConfig(),
        loadShellConfig()
      ]
    ).then(([runtimeConfig, shellConfig]) => {
      initState(runtimeConfig);
      applyLayoutCSSVars();
      syncShellToDocument({
        config: shellConfig,
        isDark: isDarkThemeDocument()
      });
      initNoiseSystem(runtimeConfig);
      initializeDarkMode();
      initLinkCursorHop();
      setupCustomCursor();
    });
  }
  return sharedShellRuntimeSyncPromise;
}
function getSearchFromHref(href) {
  if (!href) return "";
  try {
    return new URL(href, window.location.origin).search;
  } catch {
    return window.location.search;
  }
}
function getRequestedFocusIdFromHref(href) {
  const search = getSearchFromHref(href);
  if (!search) return null;
  const params = new URLSearchParams(search);
  const requestedId = params.get("mode") || params.get("focus") || params.get("simulation") || null;
  return requestedId ? normalizeSimulationId(requestedId) : null;
}
function getHomeDailyFocusRouteId(canonicalHref, routeState) {
  if (routeState?.dailyFocusRouteId) return routeState.dailyFocusRouteId;
  const routeFocusId = routeState?.focusSimulationId || null;
  const routeFocusTarget = routeFocusId ? getSimulationLaunchTarget(routeFocusId) : null;
  if (routeFocusTarget) return routeFocusTarget.routeBacked ? routeFocusTarget.id : null;
  const requestedFocusId = getRequestedFocusIdFromHref(canonicalHref);
  const requestedTarget = requestedFocusId ? getSimulationLaunchTarget(requestedFocusId) : null;
  if (requestedTarget) return requestedTarget.routeBacked ? requestedTarget.id : null;
  const focusState = getResolvedSimulationFocus();
  const activeTarget = focusState.activeId ? getSimulationLaunchTarget(focusState.activeId) : null;
  return activeTarget?.routeBacked ? activeTarget.id : null;
}
function getRouteViewForId(routeId, canonicalHref, routeState, focusRevision = 0) {
  Number(focusRevision);
  if (isDailyFocusRouteRequest(routeId, getSearchFromHref(canonicalHref))) {
    return getDailyFocusRouteView(routeId);
  }
  if (routeId === "home") {
    const dailyFocusRouteId = getHomeDailyFocusRouteId(canonicalHref, routeState);
    if (dailyFocusRouteId) return getDailyFocusRouteView(dailyFocusRouteId);
  }
  return (ROUTE_DESCRIPTORS[routeId] || ROUTE_DESCRIPTORS.home).getView(canonicalHref, routeState);
}
function getRouteRuntimeForId(routeId, canonicalHref, routeState, focusRevision = 0) {
  Number(focusRevision);
  const dailyFocusRouteId = routeState?.dailyFocusRouteId || (isDailyFocusRouteRequest(routeId, getSearchFromHref(canonicalHref)) ? routeId : null) || (routeId === "home" ? getHomeDailyFocusRouteId(canonicalHref, routeState) : null);
  if (dailyFocusRouteId) {
    return {
      loadModule: () => preloadDailyFocusRuntime(dailyFocusRouteId)
    };
  }
  if (routeState?.lockedGateId || routeState?.routeLocked) {
    return {};
  }
  return (ROUTE_DESCRIPTORS[routeId] || ROUTE_DESCRIPTORS.home).runtime;
}
function readProjectFixture(routeId) {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fixture = params.get("fixture");
  if (!fixture) return null;
  if (routeId === "portfolio" && fixture === "portfolio-drawer") {
    const projectIndex = Number.parseInt(params.get("project") || "0", 10);
    return {
      type: fixture,
      projectIndex: Number.isInteger(projectIndex) && projectIndex >= 0 ? projectIndex : 0
    };
  }
  return null;
}
function shouldDeferBootStateForHold() {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") return false;
  try {
    return new URLSearchParams(window.location.search).get("absBootHold") === "1";
  } catch {
    return false;
  }
}
async function markDirectShellRouteReady(routeId, isStandaloneRoute, options = {}) {
  if (typeof document === "undefined") return;
  if (isStandaloneRoute || routeId === "home") return;
  const fontsReady = await waitForFonts();
  if (options.isCancelled?.()) return;
  if (!fontsReady) {
    console.warn("[shell] Critical fonts unavailable; revealing the route with fallback fonts");
    await failDirectBoot({
      detail: "critical-fonts-unavailable",
      selectors: ["#abs-scene", "#app-frame"]
    });
    return;
  }
  const root = document.documentElement;
  root.classList.remove(
    "fonts-loading",
    "entrance-pre-transition",
    "entrance-transitioning",
    "abs-home-post-boot-pending",
    "abs-home-post-boot-enter"
  );
  if (routeId === "portfolio") {
    root.dataset.absBootDetail = "portfolio-preparing";
    return;
  }
  root.classList.add("abs-direct-boot-ready", "entrance-complete", "ui-entered");
  if (options.deferBootState === true) return;
  if (!root.dataset.absBootState || root.dataset.absBootState === "booting") {
    root.dataset.absBootState = "ready";
  }
  if (!root.dataset.absBootDetail || root.dataset.absBootDetail === "held") {
    root.dataset.absBootDetail = "shell-route-ready";
  }
  void completeDirectBoot({
    detail: shouldDeferBootStateForHold() ? "held" : "shell-route-ready",
    selectors: ["#abs-scene", "#app-frame"]
  });
}
export function SiteApp() {
  _s();
  const [simulationFocusRevision, setSimulationFocusRevision] = useState(0);
  const [shellRuntimeReady, setShellRuntimeReady] = useState(false);
  const wallSurfaceRef = useRef(null);
  const heroSurfaceRef = useRef(null);
  const uiSurfaceRef = useRef(null);
  const chromeSurfaceRef = useRef(null);
  const secondarySurfaceRef = useRef(null);
  const footerSurfaceRef = useRef(null);
  const surfaceRefs = useMemo(() => ({
    wall: wallSurfaceRef,
    hero: heroSurfaceRef,
    ui: uiSurfaceRef,
    chrome: chromeSurfaceRef,
    secondary: secondarySurfaceRef,
    footer: footerSurfaceRef
  }), []);
  useEffect(() => {
    const refreshSimulationFocus = () => {
      setSimulationFocusRevision((revision) => revision + 1);
    };
    const handleStorage = (event) => {
      if (!event || event.key === SIMULATION_FOCUS_STORAGE_KEY) {
        refreshSimulationFocus();
      }
    };
    window.addEventListener(SIMULATION_FOCUS_CHANGED_EVENT, refreshSimulationFocus);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(SIMULATION_FOCUS_CHANGED_EVENT, refreshSimulationFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);
  const getRouteView = useCallback(
    (routeId, canonicalHref, routeStateSnapshot) => getRouteViewForId(routeId, canonicalHref, routeStateSnapshot, simulationFocusRevision),
    [simulationFocusRevision]
  );
  const getRouteRuntime = useCallback(
    (routeId, canonicalHref, routeStateSnapshot) => getRouteRuntimeForId(routeId, canonicalHref, routeStateSnapshot, simulationFocusRevision),
    [simulationFocusRevision]
  );
  const {
    routeState,
    activeRouteId,
    routeRuntime,
    routeView,
    transitionCurrentRoute
  } = useShellRouteTransition({
    getRouteView,
    getRouteRuntime,
    surfaceRefs
  });
  const isStandaloneRoute = routeView.layout === "standalone";
  const routeRuntimeActive = shellRuntimeReady && !isStandaloneRoute && routeView.legacyRuntime !== false;
  const routeRuntimeId = routeView.runtimeRouteId || routeState.route.id;
  const isDailyFocusRoute = isDailyFocusRouteRequest(
    routeState.route.id,
    getSearchFromHref(routeState.canonicalHref)
  );
  useSiteHaptics({ routeId: routeState.route.id });
  useLayoutEffect(() => {
    if (isStandaloneRoute) return;
    applyActiveRouteCursorColor(activeRouteId || routeState.route.id);
  }, [activeRouteId, isStandaloneRoute, routeState.route.id]);
  useLayoutEffect(() => {
    if (isStandaloneRoute) return void 0;
    let cancelled = false;
    syncSharedShellRuntimeState().then(() => {
      if (!cancelled) {
        setShellRuntimeReady(true);
      }
    }).catch((error) => {
      console.error("[shell] Failed to sync shared runtime layout", error);
    });
    return () => {
      cancelled = true;
    };
  }, [isStandaloneRoute]);
  useEffect(() => {
    const nextTitle = ROUTE_DESCRIPTORS[routeState.route.id]?.title;
    if (nextTitle && document.title !== nextTitle) {
      document.title = nextTitle;
    }
  }, [routeState.route.id]);
  useLayoutEffect(() => {
    let cancelled = false;
    void markDirectShellRouteReady(routeState.route.id, isStandaloneRoute, {
      deferBootState: isDailyFocusRoute,
      isCancelled: () => cancelled
    });
    return () => {
      cancelled = true;
    };
  }, [isDailyFocusRoute, isStandaloneRoute, routeState.route.id]);
  useLegacyRouteRuntime({
    active: routeRuntimeActive,
    loadModule: routeRuntime.loadModule,
    exportName: routeRuntime.exportName,
    routeId: routeRuntimeId
  });
  useEffect(() => {
    const fixture = readProjectFixture(routeState.route.id);
    if (!fixture || fixture.type !== "portfolio-drawer") {
      return void 0;
    }
    let cancelled = false;
    let fallbackTimer = null;
    const dispatchFixture = () => {
      if (cancelled) return;
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (cancelled) return;
          document.dispatchEvent(new CustomEvent("abs:portfolio:open-project", {
            detail: { index: fixture.projectIndex }
          }));
        });
      });
    };
    const handleRouteReady = (event) => {
      if (event?.detail?.routeId === "portfolio") {
        dispatchFixture();
      }
    };
    window.addEventListener("abs:route-ready", handleRouteReady);
    fallbackTimer = window.setTimeout(dispatchFixture, 1500);
    return () => {
      cancelled = true;
      if (fallbackTimer !== null) {
        window.clearTimeout(fallbackTimer);
      }
      window.removeEventListener("abs:route-ready", handleRouteReady);
    };
  }, [routeState.route.id]);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    !isStandaloneRoute ? /* @__PURE__ */ jsxDEV(DevConfigPanelBridge, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
      lineNumber: 422,
      columnNumber: 29
    }, this) : null,
    /* @__PURE__ */ jsxDEV(
      BodyClassManager,
      {
        className: routeView.bodyClass,
        htmlClassName: routeView.htmlClassName,
        routeId: routeState.route.id
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
        lineNumber: 423,
        columnNumber: 7
      },
      this
    ),
    isStandaloneRoute ? routeView.mainContent : /* @__PURE__ */ jsxDEV(
      SimulationFocusProvider,
      {
        routeId: routeState.route.id,
        surfaceRouteId: routeView.surfaceRouteId || routeState.route.id,
        transitionCurrentRoute,
        children: /* @__PURE__ */ jsxDEV(
          StudioShell,
          {
            activeRouteId: routeView.navigationRouteId || activeRouteId,
            routeRenderKey: routeView.routeRenderKey || routeState.route.id,
            contentRenderKey: routeView.contentRenderKey || routeState.route.id,
            studioWindowClassName: routeView.studioWindowClassName || routeView.wallClassName,
            simulationLayer: routeView.simulationLayer,
            studioWindowContent: routeView.studioWindowContent || routeView.wallContent,
            heroLayer: routeView.heroLayer,
            uiLayer: routeView.uiLayer,
            headerContent: routeView.headerContent,
            mainContent: routeView.mainContent,
            heroTitle: routeView.heroTitle,
            footerVariant: routeView.footerVariant,
            windowOverlayContent: routeView.windowOverlayContent,
            simulationFocusControls: /* @__PURE__ */ jsxDEV(SimulationFocusSwitcher, {}, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
              lineNumber: 450,
              columnNumber: 36
            }, this),
            simulationFocusModal: /* @__PURE__ */ jsxDEV(SimulationFocusChooser, {}, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
              lineNumber: 451,
              columnNumber: 33
            }, this),
            surfaceRefs
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
            lineNumber: 436,
            columnNumber: 11
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
        lineNumber: 431,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx",
    lineNumber: 421,
    columnNumber: 5
  }, this);
}
_s(SiteApp, "iQqcCz4oKTnS1tWHffbqo/e5RPA=", false, function() {
  return [useShellRouteTransition, useSiteHaptics, useLegacyRouteRuntime];
});
_c = SiteApp;
var _c;
$RefreshReg$(_c, "SiteApp");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/SiteApp.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QSxLQTNHUGdIO0FBQU8sSUFBQTBFO0FBQUEsYUFBQUEsSUFBQSIsIm5hbWVzIjpbInVzZUNhbGxiYWNrIiwidXNlRWZmZWN0IiwidXNlTGF5b3V0RWZmZWN0IiwidXNlTWVtbyIsInVzZVJlZiIsInVzZVN0YXRlIiwiQm9keUNsYXNzTWFuYWdlciIsIlN0dWRpb1NoZWxsIiwiZ2V0SG9tZVJvdXRlVmlldyIsIkhPTUVfUk9VVEVfUlVOVElNRSIsImdldFBvcnRmb2xpb1JvdXRlVmlldyIsIlBPUlRGT0xJT19ST1VURV9SVU5USU1FIiwiQUJPVVRfUk9VVEVfUlVOVElNRSIsImdldEFib3V0Um91dGVWaWV3IiwiQUJPVVRfTkFSUkFUSVZFX0xBQl9ST1VURV9SVU5USU1FIiwiZ2V0QWJvdXROYXJyYXRpdmVMYWJSb3V0ZVZpZXciLCJDT05UQUNUX1JPVVRFX1JVTlRJTUUiLCJnZXRDb250YWN0Um91dGVWaWV3IiwiZ2V0U3R5bGVndWlkZVJvdXRlVmlldyIsIlNUWUxFR1VJREVfUk9VVEVfUlVOVElNRSIsImdldFNpbXVsYXRpb25MYXVuY2hwYWRSb3V0ZVZpZXciLCJTSU1VTEFUSU9OX0xBVU5DSFBBRF9ST1VURV9SVU5USU1FIiwiZ2V0UGFsZXR0ZUxhYlJvdXRlVmlldyIsIlBBTEVUVEVfTEFCX1JPVVRFX1JVTlRJTUUiLCJnZXRCZWFjaEJhbGxSb29tUm91dGVWaWV3IiwiQkVBQ0hfQkFMTF9ST09NX1JPVVRFX1JVTlRJTUUiLCJnZXRGbG9ja09mQmlyZHNSb3V0ZVZpZXciLCJGTE9DS19PRl9CSVJEU19ST1VURV9SVU5USU1FIiwiZ2V0UmVwZWxSb29tUm91dGVWaWV3IiwiUkVQRUxfUk9PTV9ST1VURV9SVU5USU1FIiwiZ2V0TWluZXJhbEdyb3d0aFJvdXRlVmlldyIsIk1JTkVSQUxfR1JPV1RIX1JPVVRFX1JVTlRJTUUiLCJnZXRMb2FkZXJQbGF5Z3JvdW5kUm91dGVWaWV3IiwiTE9BREVSX1BMQVlHUk9VTkRfUk9VVEVfUlVOVElNRSIsImdldERhaWx5Rm9jdXNSb3V0ZVZpZXciLCJpc0RhaWx5Rm9jdXNSb3V0ZVJlcXVlc3QiLCJwcmVsb2FkRGFpbHlGb2N1c1J1bnRpbWUiLCJBUEVSVFVSRV9CTE9PTV9ST1VURV9SVU5USU1FIiwiQ09ORkxVRU5DRV9CUklER0VTX1JPVVRFX1JVTlRJTUUiLCJnZXRBcGVydHVyZUJsb29tUm91dGVWaWV3IiwiZ2V0Q29uZmx1ZW5jZUJyaWRnZXNSb3V0ZVZpZXciLCJnZXROYXBvbGVvblBvaW50Q2xvdWRSb3V0ZVZpZXciLCJnZXRSaWZ0UmluZ3NSb3V0ZVZpZXciLCJnZXRTcGF0aWFsU2NhblJvdXRlVmlldyIsIk5BUE9MRU9OX1BPSU5UX0NMT1VEX1JPVVRFX1JVTlRJTUUiLCJSSUZUX1JJTkdTX1JPVVRFX1JVTlRJTUUiLCJTUEFUSUFMX1NDQU5fUk9VVEVfUlVOVElNRSIsInVzZUxlZ2FjeVJvdXRlUnVudGltZSIsInVzZVNoZWxsUm91dGVUcmFuc2l0aW9uIiwidXNlU2l0ZUhhcHRpY3MiLCJEZXZDb25maWdQYW5lbEJyaWRnZSIsIlNpbXVsYXRpb25Gb2N1c0Nob29zZXIiLCJTaW11bGF0aW9uRm9jdXNQcm92aWRlciIsIlNpbXVsYXRpb25Gb2N1c1N3aXRjaGVyIiwiZ2V0UmVzb2x2ZWRTaW11bGF0aW9uRm9jdXMiLCJub3JtYWxpemVTaW11bGF0aW9uSWQiLCJnZXRTaW11bGF0aW9uTGF1bmNoVGFyZ2V0IiwiU0lNVUxBVElPTl9GT0NVU19DSEFOR0VEX0VWRU5UIiwiU0lNVUxBVElPTl9GT0NVU19TVE9SQUdFX0tFWSIsImNvbXBsZXRlRGlyZWN0Qm9vdCIsImZhaWxEaXJlY3RCb290IiwiYXBwbHlMYXlvdXRDU1NWYXJzIiwiaW5pdFN0YXRlIiwid2FpdEZvckZvbnRzIiwibG9hZFJ1bnRpbWVDb25maWciLCJsb2FkU2hlbGxDb25maWciLCJzeW5jU2hlbGxUb0RvY3VtZW50IiwiaW5pdGlhbGl6ZURhcmtNb2RlIiwiaW5pdE5vaXNlU3lzdGVtIiwiaW5pdExpbmtDdXJzb3JIb3AiLCJzZXR1cEN1c3RvbUN1cnNvciIsImFwcGx5QWN0aXZlUm91dGVDdXJzb3JDb2xvciIsImlzRGFya1RoZW1lRG9jdW1lbnQiLCJnZXRSb3V0ZUJ5SWQiLCJkZWZpbmVSb3V0ZURlc2NyaXB0b3IiLCJyb3V0ZUlkIiwiZGVmaW5pdGlvbiIsIk9iamVjdCIsImZyZWV6ZSIsIlJPVVRFX0RFU0NSSVBUT1JTIiwiaG9tZSIsInRpdGxlIiwiZ2V0VmlldyIsInJ1bnRpbWUiLCJjb250YWN0IiwicG9ydGZvbGlvIiwiYWJvdXQiLCJzdHlsZWd1aWRlIiwic2ltdWxhdGlvbnMiLCJzaGFyZWRTaGVsbFJ1bnRpbWVTeW5jUHJvbWlzZSIsInN5bmNTaGFyZWRTaGVsbFJ1bnRpbWVTdGF0ZSIsIlByb21pc2UiLCJhbGwiLCJ0aGVuIiwicnVudGltZUNvbmZpZyIsInNoZWxsQ29uZmlnIiwiY29uZmlnIiwiaXNEYXJrIiwiZ2V0U2VhcmNoRnJvbUhyZWYiLCJocmVmIiwiVVJMIiwid2luZG93IiwibG9jYXRpb24iLCJvcmlnaW4iLCJzZWFyY2giLCJnZXRSZXF1ZXN0ZWRGb2N1c0lkRnJvbUhyZWYiLCJwYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJyZXF1ZXN0ZWRJZCIsImdldCIsImdldEhvbWVEYWlseUZvY3VzUm91dGVJZCIsImNhbm9uaWNhbEhyZWYiLCJyb3V0ZVN0YXRlIiwiZGFpbHlGb2N1c1JvdXRlSWQiLCJyb3V0ZUZvY3VzSWQiLCJmb2N1c1NpbXVsYXRpb25JZCIsInJvdXRlRm9jdXNUYXJnZXQiLCJyb3V0ZUJhY2tlZCIsImlkIiwicmVxdWVzdGVkRm9jdXNJZCIsInJlcXVlc3RlZFRhcmdldCIsImZvY3VzU3RhdGUiLCJhY3RpdmVUYXJnZXQiLCJhY3RpdmVJZCIsImdldFJvdXRlVmlld0ZvcklkIiwiZm9jdXNSZXZpc2lvbiIsIk51bWJlciIsImdldFJvdXRlUnVudGltZUZvcklkIiwibG9hZE1vZHVsZSIsImxvY2tlZEdhdGVJZCIsInJvdXRlTG9ja2VkIiwicmVhZFByb2plY3RGaXh0dXJlIiwiZml4dHVyZSIsInByb2plY3RJbmRleCIsInBhcnNlSW50IiwidHlwZSIsImlzSW50ZWdlciIsInNob3VsZERlZmVyQm9vdFN0YXRlRm9ySG9sZCIsImhvc3QiLCJob3N0bmFtZSIsIm1hcmtEaXJlY3RTaGVsbFJvdXRlUmVhZHkiLCJpc1N0YW5kYWxvbmVSb3V0ZSIsIm9wdGlvbnMiLCJkb2N1bWVudCIsImZvbnRzUmVhZHkiLCJpc0NhbmNlbGxlZCIsImNvbnNvbGUiLCJ3YXJuIiwiZGV0YWlsIiwic2VsZWN0b3JzIiwicm9vdCIsImRvY3VtZW50RWxlbWVudCIsImNsYXNzTGlzdCIsInJlbW92ZSIsImRhdGFzZXQiLCJhYnNCb290RGV0YWlsIiwiYWRkIiwiZGVmZXJCb290U3RhdGUiLCJhYnNCb290U3RhdGUiLCJTaXRlQXBwIiwiX3MiLCJzaW11bGF0aW9uRm9jdXNSZXZpc2lvbiIsInNldFNpbXVsYXRpb25Gb2N1c1JldmlzaW9uIiwic2hlbGxSdW50aW1lUmVhZHkiLCJzZXRTaGVsbFJ1bnRpbWVSZWFkeSIsIndhbGxTdXJmYWNlUmVmIiwiaGVyb1N1cmZhY2VSZWYiLCJ1aVN1cmZhY2VSZWYiLCJjaHJvbWVTdXJmYWNlUmVmIiwic2Vjb25kYXJ5U3VyZmFjZVJlZiIsImZvb3RlclN1cmZhY2VSZWYiLCJzdXJmYWNlUmVmcyIsIndhbGwiLCJoZXJvIiwidWkiLCJjaHJvbWUiLCJzZWNvbmRhcnkiLCJmb290ZXIiLCJyZWZyZXNoU2ltdWxhdGlvbkZvY3VzIiwicmV2aXNpb24iLCJoYW5kbGVTdG9yYWdlIiwiZXZlbnQiLCJrZXkiLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsImdldFJvdXRlVmlldyIsInJvdXRlU3RhdGVTbmFwc2hvdCIsImdldFJvdXRlUnVudGltZSIsImFjdGl2ZVJvdXRlSWQiLCJyb3V0ZVJ1bnRpbWUiLCJyb3V0ZVZpZXciLCJ0cmFuc2l0aW9uQ3VycmVudFJvdXRlIiwibGF5b3V0Iiwicm91dGVSdW50aW1lQWN0aXZlIiwibGVnYWN5UnVudGltZSIsInJvdXRlUnVudGltZUlkIiwicnVudGltZVJvdXRlSWQiLCJyb3V0ZSIsImlzRGFpbHlGb2N1c1JvdXRlIiwidW5kZWZpbmVkIiwiY2FuY2VsbGVkIiwiY2F0Y2giLCJlcnJvciIsIm5leHRUaXRsZSIsImFjdGl2ZSIsImV4cG9ydE5hbWUiLCJmYWxsYmFja1RpbWVyIiwiZGlzcGF0Y2hGaXh0dXJlIiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiZGlzcGF0Y2hFdmVudCIsIkN1c3RvbUV2ZW50IiwiaW5kZXgiLCJoYW5kbGVSb3V0ZVJlYWR5Iiwic2V0VGltZW91dCIsImNsZWFyVGltZW91dCIsImJvZHlDbGFzcyIsImh0bWxDbGFzc05hbWUiLCJtYWluQ29udGVudCIsInN1cmZhY2VSb3V0ZUlkIiwibmF2aWdhdGlvblJvdXRlSWQiLCJyb3V0ZVJlbmRlcktleSIsImNvbnRlbnRSZW5kZXJLZXkiLCJzdHVkaW9XaW5kb3dDbGFzc05hbWUiLCJ3YWxsQ2xhc3NOYW1lIiwic2ltdWxhdGlvbkxheWVyIiwic3R1ZGlvV2luZG93Q29udGVudCIsIndhbGxDb250ZW50IiwiaGVyb0xheWVyIiwidWlMYXllciIsImhlYWRlckNvbnRlbnQiLCJoZXJvVGl0bGUiLCJmb290ZXJWYXJpYW50Iiwid2luZG93T3ZlcmxheUNvbnRlbnQiLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJTaXRlQXBwLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VDYWxsYmFjaywgdXNlRWZmZWN0LCB1c2VMYXlvdXRFZmZlY3QsIHVzZU1lbW8sIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBCb2R5Q2xhc3NNYW5hZ2VyIH0gZnJvbSAnLi4vbGF5b3V0L0JvZHlDbGFzc01hbmFnZXIuanN4JztcbmltcG9ydCB7IFN0dWRpb1NoZWxsIH0gZnJvbSAnLi9TdHVkaW9TaGVsbC5qc3gnO1xuaW1wb3J0IHsgZ2V0SG9tZVJvdXRlVmlldywgSE9NRV9ST1VURV9SVU5USU1FIH0gZnJvbSAnLi4vLi4vcm91dGVzL2hvbWUvSG9tZVJvdXRlLmpzeCc7XG5pbXBvcnQgeyBnZXRQb3J0Zm9saW9Sb3V0ZVZpZXcsIFBPUlRGT0xJT19ST1VURV9SVU5USU1FIH0gZnJvbSAnLi4vLi4vcm91dGVzL3BvcnRmb2xpby9Qb3J0Zm9saW9Sb3V0ZS5qc3gnO1xuaW1wb3J0IHsgQUJPVVRfUk9VVEVfUlVOVElNRSwgZ2V0QWJvdXRSb3V0ZVZpZXcgfSBmcm9tICcuLi8uLi9yb3V0ZXMvYWJvdXQvQWJvdXRSb3V0ZS5qc3gnO1xuaW1wb3J0IHtcbiAgQUJPVVRfTkFSUkFUSVZFX0xBQl9ST1VURV9SVU5USU1FLFxuICBnZXRBYm91dE5hcnJhdGl2ZUxhYlJvdXRlVmlldyxcbn0gZnJvbSAnLi4vLi4vcm91dGVzL2Fib3V0LW5hcnJhdGl2ZS1sYWIvQWJvdXROYXJyYXRpdmVMYWJSb3V0ZS5qc3gnO1xuaW1wb3J0IHsgQ09OVEFDVF9ST1VURV9SVU5USU1FLCBnZXRDb250YWN0Um91dGVWaWV3IH0gZnJvbSAnLi4vLi4vcm91dGVzL2NvbnRhY3QvQ29udGFjdFJvdXRlLmpzeCc7XG5pbXBvcnQgeyBnZXRTdHlsZWd1aWRlUm91dGVWaWV3LCBTVFlMRUdVSURFX1JPVVRFX1JVTlRJTUUgfSBmcm9tICcuLi8uLi9yb3V0ZXMvc3R5bGVndWlkZS9TdHlsZWd1aWRlUm91dGUuanN4JztcbmltcG9ydCB7XG4gIGdldFNpbXVsYXRpb25MYXVuY2hwYWRSb3V0ZVZpZXcsXG4gIFNJTVVMQVRJT05fTEFVTkNIUEFEX1JPVVRFX1JVTlRJTUUsXG59IGZyb20gJy4uLy4uL3JvdXRlcy9zaW11bGF0aW9uLWxhdW5jaHBhZC9TaW11bGF0aW9uTGF1bmNocGFkUm91dGUuanN4JztcbmltcG9ydCB7IGdldFBhbGV0dGVMYWJSb3V0ZVZpZXcsIFBBTEVUVEVfTEFCX1JPVVRFX1JVTlRJTUUgfSBmcm9tICcuLi8uLi9yb3V0ZXMvcGFsZXR0ZS1sYWIvUGFsZXR0ZUxhYlJvdXRlLmpzeCc7XG5pbXBvcnQgeyBnZXRCZWFjaEJhbGxSb29tUm91dGVWaWV3LCBCRUFDSF9CQUxMX1JPT01fUk9VVEVfUlVOVElNRSB9IGZyb20gJy4uLy4uL3JvdXRlcy9iZWFjaC1iYWxsLXJvb20vQmVhY2hCYWxsUm9vbVJvdXRlLmpzeCc7XG5pbXBvcnQgeyBnZXRGbG9ja09mQmlyZHNSb3V0ZVZpZXcsIEZMT0NLX09GX0JJUkRTX1JPVVRFX1JVTlRJTUUgfSBmcm9tICcuLi8uLi9yb3V0ZXMvZmxvY2stb2YtYmlyZHMvRmxvY2tPZkJpcmRzUm91dGUuanN4JztcbmltcG9ydCB7IGdldFJlcGVsUm9vbVJvdXRlVmlldywgUkVQRUxfUk9PTV9ST1VURV9SVU5USU1FIH0gZnJvbSAnLi4vLi4vcm91dGVzL3JlcGVsLXJvb20vUmVwZWxSb29tUm91dGUuanN4JztcbmltcG9ydCB7IGdldE1pbmVyYWxHcm93dGhSb3V0ZVZpZXcsIE1JTkVSQUxfR1JPV1RIX1JPVVRFX1JVTlRJTUUgfSBmcm9tICcuLi8uLi9yb3V0ZXMvbWluZXJhbC1ncm93dGgvTWluZXJhbEdyb3d0aFJvdXRlLmpzeCc7XG5pbXBvcnQgeyBnZXRMb2FkZXJQbGF5Z3JvdW5kUm91dGVWaWV3LCBMT0FERVJfUExBWUdST1VORF9ST1VURV9SVU5USU1FIH0gZnJvbSAnLi4vLi4vcm91dGVzL2xvYWRlci1wbGF5Z3JvdW5kL0xvYWRlclBsYXlncm91bmRSb3V0ZS5qc3gnO1xuaW1wb3J0IHtcbiAgZ2V0RGFpbHlGb2N1c1JvdXRlVmlldyxcbiAgaXNEYWlseUZvY3VzUm91dGVSZXF1ZXN0LFxufSBmcm9tICcuLi8uLi9yb3V0ZXMvZGFpbHktZm9jdXMvRGFpbHlGb2N1c1JvdXRlLmpzeCc7XG5pbXBvcnQgeyBwcmVsb2FkRGFpbHlGb2N1c1J1bnRpbWUgfSBmcm9tICcuLi8uLi9yb3V0ZXMvZGFpbHktZm9jdXMvZGFpbHlGb2N1c1J1bnRpbWVMb2FkZXIuanMnO1xuaW1wb3J0IHtcbiAgQVBFUlRVUkVfQkxPT01fUk9VVEVfUlVOVElNRSxcbiAgQ09ORkxVRU5DRV9CUklER0VTX1JPVVRFX1JVTlRJTUUsXG4gIGdldEFwZXJ0dXJlQmxvb21Sb3V0ZVZpZXcsXG4gIGdldENvbmZsdWVuY2VCcmlkZ2VzUm91dGVWaWV3LFxuICBnZXROYXBvbGVvblBvaW50Q2xvdWRSb3V0ZVZpZXcsXG4gIGdldFJpZnRSaW5nc1JvdXRlVmlldyxcbiAgZ2V0U3BhdGlhbFNjYW5Sb3V0ZVZpZXcsXG4gIE5BUE9MRU9OX1BPSU5UX0NMT1VEX1JPVVRFX1JVTlRJTUUsXG4gIFJJRlRfUklOR1NfUk9VVEVfUlVOVElNRSxcbiAgU1BBVElBTF9TQ0FOX1JPVVRFX1JVTlRJTUUsXG59IGZyb20gJy4uLy4uL3JvdXRlcy9jb25jZXB0LXNpbXVsYXRpb25zL0NvbmNlcHRTaW11bGF0aW9uUm91dGUuanN4JztcbmltcG9ydCB7IHVzZUxlZ2FjeVJvdXRlUnVudGltZSB9IGZyb20gJy4uLy4uL2hvb2tzL3VzZUxlZ2FjeVJvdXRlUnVudGltZS5qcyc7XG5pbXBvcnQgeyB1c2VTaGVsbFJvdXRlVHJhbnNpdGlvbiB9IGZyb20gJy4uLy4uL2hvb2tzL3VzZVNoZWxsUm91dGVUcmFuc2l0aW9uLmpzJztcbmltcG9ydCB7IHVzZVNpdGVIYXB0aWNzIH0gZnJvbSAnLi4vLi4vaG9va3MvdXNlU2l0ZUhhcHRpY3MuanMnO1xuaW1wb3J0IHsgRGV2Q29uZmlnUGFuZWxCcmlkZ2UgfSBmcm9tICcuL0RldkNvbmZpZ1BhbmVsQnJpZGdlLmpzeCc7XG5pbXBvcnQge1xuICBTaW11bGF0aW9uRm9jdXNDaG9vc2VyLFxuICBTaW11bGF0aW9uRm9jdXNQcm92aWRlcixcbiAgU2ltdWxhdGlvbkZvY3VzU3dpdGNoZXIsXG59IGZyb20gJy4uL3NpbXVsYXRpb24tZm9jdXMvU2ltdWxhdGlvbkZvY3VzUHJvdmlkZXIuanN4JztcbmltcG9ydCB7XG4gIGdldFJlc29sdmVkU2ltdWxhdGlvbkZvY3VzLFxuICBub3JtYWxpemVTaW11bGF0aW9uSWQsXG4gIGdldFNpbXVsYXRpb25MYXVuY2hUYXJnZXQsXG4gIFNJTVVMQVRJT05fRk9DVVNfQ0hBTkdFRF9FVkVOVCxcbiAgU0lNVUxBVElPTl9GT0NVU19TVE9SQUdFX0tFWSxcbn0gZnJvbSAnLi4vLi4vZGF0YS9zaW11bGF0aW9uQ2F0YWxvZy5qcyc7XG5pbXBvcnQgeyBjb21wbGV0ZURpcmVjdEJvb3QsIGZhaWxEaXJlY3RCb290IH0gZnJvbSAnLi4vLi4vbGVnYWN5L21vZHVsZXMvdmlzdWFsL3BhZ2Utb3JjaGVzdHJhdG9yLmpzJztcbmltcG9ydCB7IGFwcGx5TGF5b3V0Q1NTVmFycywgaW5pdFN0YXRlIH0gZnJvbSAnLi4vLi4vbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qcyc7XG5pbXBvcnQgeyB3YWl0Rm9yRm9udHMgfSBmcm9tICcuLi8uLi9sZWdhY3kvbW9kdWxlcy91dGlscy9mb250LWxvYWRlci5qcyc7XG5pbXBvcnQgeyBsb2FkUnVudGltZUNvbmZpZyB9IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3V0aWxzL3J1bnRpbWUtY29uZmlnLmpzJztcbmltcG9ydCB7IGxvYWRTaGVsbENvbmZpZywgc3luY1NoZWxsVG9Eb2N1bWVudCB9IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9zaXRlLXNoZWxsLmpzJztcbmltcG9ydCB7IGluaXRpYWxpemVEYXJrTW9kZSB9IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9kYXJrLW1vZGUtdjIuanMnO1xuaW1wb3J0IHsgaW5pdE5vaXNlU3lzdGVtIH0gZnJvbSAnLi4vLi4vbGVnYWN5L21vZHVsZXMvdmlzdWFsL25vaXNlLXN5c3RlbS5qcyc7XG5pbXBvcnQgeyBpbml0TGlua0N1cnNvckhvcCB9IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3VpL2xpbmstY3Vyc29yLWhvcC5qcyc7XG5pbXBvcnQgeyBzZXR1cEN1c3RvbUN1cnNvciB9IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3JlbmRlcmluZy9jdXJzb3IuanMnO1xuaW1wb3J0IHsgYXBwbHlBY3RpdmVSb3V0ZUN1cnNvckNvbG9yIH0gZnJvbSAnLi4vLi4vbGVnYWN5L21vZHVsZXMvdmlzdWFsL2NvbG9ycy5qcyc7XG5pbXBvcnQgeyBpc0RhcmtUaGVtZURvY3VtZW50IH0gZnJvbSAnLi4vLi4vbGliL3RoZW1lLXN0YXRlLmpzJztcbmltcG9ydCB7IGdldFJvdXRlQnlJZCB9IGZyb20gJy4uLy4uL2xpYi9yb3V0ZXMuanMnO1xuXG5mdW5jdGlvbiBkZWZpbmVSb3V0ZURlc2NyaXB0b3Iocm91dGVJZCwgZGVmaW5pdGlvbikge1xuICByZXR1cm4gT2JqZWN0LmZyZWV6ZSh7IC4uLmdldFJvdXRlQnlJZChyb3V0ZUlkKSwgLi4uZGVmaW5pdGlvbiB9KTtcbn1cblxuY29uc3QgUk9VVEVfREVTQ1JJUFRPUlMgPSBPYmplY3QuZnJlZXplKHtcbiAgaG9tZTogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdob21lJywgeyB0aXRsZTogJ0FsZXhhbmRlciBCZWNrIFN0dWRpbycsIGdldFZpZXc6IGdldEhvbWVSb3V0ZVZpZXcsIHJ1bnRpbWU6IEhPTUVfUk9VVEVfUlVOVElNRSB9KSxcbiAgY29udGFjdDogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdjb250YWN0JywgeyB0aXRsZTogJ0NvbnRhY3QgLSBBbGV4YW5kZXIgQmVjayBTdHVkaW8nLCBnZXRWaWV3OiBnZXRDb250YWN0Um91dGVWaWV3LCBydW50aW1lOiBDT05UQUNUX1JPVVRFX1JVTlRJTUUgfSksXG4gIHBvcnRmb2xpbzogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdwb3J0Zm9saW8nLCB7IHRpdGxlOiAnUG9ydGZvbGlvIC0gQWxleGFuZGVyIEJlY2snLCBnZXRWaWV3OiBnZXRQb3J0Zm9saW9Sb3V0ZVZpZXcsIHJ1bnRpbWU6IFBPUlRGT0xJT19ST1VURV9SVU5USU1FIH0pLFxuICBhYm91dDogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdhYm91dCcsIHsgdGl0bGU6ICdBYm91dCBNZSAtIEFsZXhhbmRlciBCZWNrIFN0dWRpbycsIGdldFZpZXc6IGdldEFib3V0Um91dGVWaWV3LCBydW50aW1lOiBBQk9VVF9ST1VURV9SVU5USU1FIH0pLFxuICAnYWJvdXQtbmFycmF0aXZlLWxhYic6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignYWJvdXQtbmFycmF0aXZlLWxhYicsIHtcbiAgICB0aXRsZTogJ0Fib3V0IE5hcnJhdGl2ZSBMYWIgLSBBbGV4YW5kZXIgQmVjayBTdHVkaW8nLFxuICAgIGdldFZpZXc6IGdldEFib3V0TmFycmF0aXZlTGFiUm91dGVWaWV3LFxuICAgIHJ1bnRpbWU6IEFCT1VUX05BUlJBVElWRV9MQUJfUk9VVEVfUlVOVElNRSxcbiAgfSksXG4gIHN0eWxlZ3VpZGU6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignc3R5bGVndWlkZScsIHsgZ2V0VmlldzogZ2V0U3R5bGVndWlkZVJvdXRlVmlldywgcnVudGltZTogU1RZTEVHVUlERV9ST1VURV9SVU5USU1FIH0pLFxuICBzaW11bGF0aW9uczogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdzaW11bGF0aW9ucycsIHsgZ2V0VmlldzogZ2V0U2ltdWxhdGlvbkxhdW5jaHBhZFJvdXRlVmlldywgcnVudGltZTogU0lNVUxBVElPTl9MQVVOQ0hQQURfUk9VVEVfUlVOVElNRSB9KSxcbiAgJ3BhbGV0dGUtbGFiJzogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdwYWxldHRlLWxhYicsIHsgZ2V0VmlldzogZ2V0UGFsZXR0ZUxhYlJvdXRlVmlldywgcnVudGltZTogUEFMRVRURV9MQUJfUk9VVEVfUlVOVElNRSB9KSxcbiAgJ2JlYWNoLWJhbGwtcm9vbSc6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignYmVhY2gtYmFsbC1yb29tJywgeyBnZXRWaWV3OiBnZXRCZWFjaEJhbGxSb29tUm91dGVWaWV3LCBydW50aW1lOiBCRUFDSF9CQUxMX1JPT01fUk9VVEVfUlVOVElNRSB9KSxcbiAgJ2Zsb2NrLW9mLWJpcmRzJzogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdmbG9jay1vZi1iaXJkcycsIHsgZ2V0VmlldzogZ2V0RmxvY2tPZkJpcmRzUm91dGVWaWV3LCBydW50aW1lOiBGTE9DS19PRl9CSVJEU19ST1VURV9SVU5USU1FIH0pLFxuICAncmVwZWwtcm9vbSc6IGRlZmluZVJvdXRlRGVzY3JpcHRvcigncmVwZWwtcm9vbScsIHsgZ2V0VmlldzogZ2V0UmVwZWxSb29tUm91dGVWaWV3LCBydW50aW1lOiBSRVBFTF9ST09NX1JPVVRFX1JVTlRJTUUgfSksXG4gICdtaW5lcmFsLWdyb3d0aCc6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignbWluZXJhbC1ncm93dGgnLCB7IGdldFZpZXc6IGdldE1pbmVyYWxHcm93dGhSb3V0ZVZpZXcsIHJ1bnRpbWU6IE1JTkVSQUxfR1JPV1RIX1JPVVRFX1JVTlRJTUUgfSksXG4gICdhcGVydHVyZS1ibG9vbSc6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignYXBlcnR1cmUtYmxvb20nLCB7IGdldFZpZXc6IGdldEFwZXJ0dXJlQmxvb21Sb3V0ZVZpZXcsIHJ1bnRpbWU6IEFQRVJUVVJFX0JMT09NX1JPVVRFX1JVTlRJTUUgfSksXG4gICdjb25mbHVlbmNlLWJyaWRnZXMnOiBkZWZpbmVSb3V0ZURlc2NyaXB0b3IoJ2NvbmZsdWVuY2UtYnJpZGdlcycsIHsgZ2V0VmlldzogZ2V0Q29uZmx1ZW5jZUJyaWRnZXNSb3V0ZVZpZXcsIHJ1bnRpbWU6IENPTkZMVUVOQ0VfQlJJREdFU19ST1VURV9SVU5USU1FIH0pLFxuICAnbmFwb2xlb24tcG9pbnQtY2xvdWQnOiBkZWZpbmVSb3V0ZURlc2NyaXB0b3IoJ25hcG9sZW9uLXBvaW50LWNsb3VkJywgeyBnZXRWaWV3OiBnZXROYXBvbGVvblBvaW50Q2xvdWRSb3V0ZVZpZXcsIHJ1bnRpbWU6IE5BUE9MRU9OX1BPSU5UX0NMT1VEX1JPVVRFX1JVTlRJTUUgfSksXG4gICdyaWZ0LXJpbmdzJzogZGVmaW5lUm91dGVEZXNjcmlwdG9yKCdyaWZ0LXJpbmdzJywgeyBnZXRWaWV3OiBnZXRSaWZ0UmluZ3NSb3V0ZVZpZXcsIHJ1bnRpbWU6IFJJRlRfUklOR1NfUk9VVEVfUlVOVElNRSB9KSxcbiAgJ3NwYXRpYWwtc2Nhbic6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignc3BhdGlhbC1zY2FuJywgeyBnZXRWaWV3OiBnZXRTcGF0aWFsU2NhblJvdXRlVmlldywgcnVudGltZTogU1BBVElBTF9TQ0FOX1JPVVRFX1JVTlRJTUUgfSksXG4gICdsb2FkZXItcGxheWdyb3VuZCc6IGRlZmluZVJvdXRlRGVzY3JpcHRvcignbG9hZGVyLXBsYXlncm91bmQnLCB7IGdldFZpZXc6IGdldExvYWRlclBsYXlncm91bmRSb3V0ZVZpZXcsIHJ1bnRpbWU6IExPQURFUl9QTEFZR1JPVU5EX1JPVVRFX1JVTlRJTUUgfSksXG59KTtcblxubGV0IHNoYXJlZFNoZWxsUnVudGltZVN5bmNQcm9taXNlID0gbnVsbDtcblxuZnVuY3Rpb24gc3luY1NoYXJlZFNoZWxsUnVudGltZVN0YXRlKCkge1xuICBpZiAoIXNoYXJlZFNoZWxsUnVudGltZVN5bmNQcm9taXNlKSB7XG4gICAgc2hhcmVkU2hlbGxSdW50aW1lU3luY1Byb21pc2UgPSBQcm9taXNlLmFsbChbXG4gICAgICBsb2FkUnVudGltZUNvbmZpZygpLFxuICAgICAgbG9hZFNoZWxsQ29uZmlnKCksXG4gICAgXSkudGhlbigoW3J1bnRpbWVDb25maWcsIHNoZWxsQ29uZmlnXSkgPT4ge1xuICAgICAgaW5pdFN0YXRlKHJ1bnRpbWVDb25maWcpO1xuICAgICAgYXBwbHlMYXlvdXRDU1NWYXJzKCk7XG4gICAgICBzeW5jU2hlbGxUb0RvY3VtZW50KHtcbiAgICAgICAgY29uZmlnOiBzaGVsbENvbmZpZyxcbiAgICAgICAgaXNEYXJrOiBpc0RhcmtUaGVtZURvY3VtZW50KCksXG4gICAgICB9KTtcbiAgICAgIGluaXROb2lzZVN5c3RlbShydW50aW1lQ29uZmlnKTtcbiAgICAgIGluaXRpYWxpemVEYXJrTW9kZSgpO1xuICAgICAgaW5pdExpbmtDdXJzb3JIb3AoKTtcbiAgICAgIHNldHVwQ3VzdG9tQ3Vyc29yKCk7XG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHNoYXJlZFNoZWxsUnVudGltZVN5bmNQcm9taXNlO1xufVxuXG5mdW5jdGlvbiBnZXRTZWFyY2hGcm9tSHJlZihocmVmKSB7XG4gIGlmICghaHJlZikgcmV0dXJuICcnO1xuICB0cnkge1xuICAgIHJldHVybiBuZXcgVVJMKGhyZWYsIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pLnNlYXJjaDtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhdGlvbi5zZWFyY2g7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0UmVxdWVzdGVkRm9jdXNJZEZyb21IcmVmKGhyZWYpIHtcbiAgY29uc3Qgc2VhcmNoID0gZ2V0U2VhcmNoRnJvbUhyZWYoaHJlZik7XG4gIGlmICghc2VhcmNoKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgcGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyhzZWFyY2gpO1xuICBjb25zdCByZXF1ZXN0ZWRJZCA9IHBhcmFtcy5nZXQoJ21vZGUnKSB8fCBwYXJhbXMuZ2V0KCdmb2N1cycpIHx8IHBhcmFtcy5nZXQoJ3NpbXVsYXRpb24nKSB8fCBudWxsO1xuICByZXR1cm4gcmVxdWVzdGVkSWQgPyBub3JtYWxpemVTaW11bGF0aW9uSWQocmVxdWVzdGVkSWQpIDogbnVsbDtcbn1cblxuZnVuY3Rpb24gZ2V0SG9tZURhaWx5Rm9jdXNSb3V0ZUlkKGNhbm9uaWNhbEhyZWYsIHJvdXRlU3RhdGUpIHtcbiAgaWYgKHJvdXRlU3RhdGU/LmRhaWx5Rm9jdXNSb3V0ZUlkKSByZXR1cm4gcm91dGVTdGF0ZS5kYWlseUZvY3VzUm91dGVJZDtcblxuICBjb25zdCByb3V0ZUZvY3VzSWQgPSByb3V0ZVN0YXRlPy5mb2N1c1NpbXVsYXRpb25JZCB8fCBudWxsO1xuICBjb25zdCByb3V0ZUZvY3VzVGFyZ2V0ID0gcm91dGVGb2N1c0lkID8gZ2V0U2ltdWxhdGlvbkxhdW5jaFRhcmdldChyb3V0ZUZvY3VzSWQpIDogbnVsbDtcbiAgaWYgKHJvdXRlRm9jdXNUYXJnZXQpIHJldHVybiByb3V0ZUZvY3VzVGFyZ2V0LnJvdXRlQmFja2VkID8gcm91dGVGb2N1c1RhcmdldC5pZCA6IG51bGw7XG5cbiAgY29uc3QgcmVxdWVzdGVkRm9jdXNJZCA9IGdldFJlcXVlc3RlZEZvY3VzSWRGcm9tSHJlZihjYW5vbmljYWxIcmVmKTtcbiAgY29uc3QgcmVxdWVzdGVkVGFyZ2V0ID0gcmVxdWVzdGVkRm9jdXNJZCA/IGdldFNpbXVsYXRpb25MYXVuY2hUYXJnZXQocmVxdWVzdGVkRm9jdXNJZCkgOiBudWxsO1xuICBpZiAocmVxdWVzdGVkVGFyZ2V0KSByZXR1cm4gcmVxdWVzdGVkVGFyZ2V0LnJvdXRlQmFja2VkID8gcmVxdWVzdGVkVGFyZ2V0LmlkIDogbnVsbDtcblxuICBjb25zdCBmb2N1c1N0YXRlID0gZ2V0UmVzb2x2ZWRTaW11bGF0aW9uRm9jdXMoKTtcbiAgY29uc3QgYWN0aXZlVGFyZ2V0ID0gZm9jdXNTdGF0ZS5hY3RpdmVJZCA/IGdldFNpbXVsYXRpb25MYXVuY2hUYXJnZXQoZm9jdXNTdGF0ZS5hY3RpdmVJZCkgOiBudWxsO1xuICByZXR1cm4gYWN0aXZlVGFyZ2V0Py5yb3V0ZUJhY2tlZCA/IGFjdGl2ZVRhcmdldC5pZCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRlVmlld0ZvcklkKHJvdXRlSWQsIGNhbm9uaWNhbEhyZWYsIHJvdXRlU3RhdGUsIGZvY3VzUmV2aXNpb24gPSAwKSB7XG4gIE51bWJlcihmb2N1c1JldmlzaW9uKTtcbiAgaWYgKGlzRGFpbHlGb2N1c1JvdXRlUmVxdWVzdChyb3V0ZUlkLCBnZXRTZWFyY2hGcm9tSHJlZihjYW5vbmljYWxIcmVmKSkpIHtcbiAgICByZXR1cm4gZ2V0RGFpbHlGb2N1c1JvdXRlVmlldyhyb3V0ZUlkKTtcbiAgfVxuICBpZiAocm91dGVJZCA9PT0gJ2hvbWUnKSB7XG4gICAgY29uc3QgZGFpbHlGb2N1c1JvdXRlSWQgPSBnZXRIb21lRGFpbHlGb2N1c1JvdXRlSWQoY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZSk7XG4gICAgaWYgKGRhaWx5Rm9jdXNSb3V0ZUlkKSByZXR1cm4gZ2V0RGFpbHlGb2N1c1JvdXRlVmlldyhkYWlseUZvY3VzUm91dGVJZCk7XG4gIH1cbiAgcmV0dXJuIChST1VURV9ERVNDUklQVE9SU1tyb3V0ZUlkXSB8fCBST1VURV9ERVNDUklQVE9SUy5ob21lKS5nZXRWaWV3KGNhbm9uaWNhbEhyZWYsIHJvdXRlU3RhdGUpO1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZVJ1bnRpbWVGb3JJZChyb3V0ZUlkLCBjYW5vbmljYWxIcmVmLCByb3V0ZVN0YXRlLCBmb2N1c1JldmlzaW9uID0gMCkge1xuICBOdW1iZXIoZm9jdXNSZXZpc2lvbik7XG4gIGNvbnN0IGRhaWx5Rm9jdXNSb3V0ZUlkID0gcm91dGVTdGF0ZT8uZGFpbHlGb2N1c1JvdXRlSWRcbiAgICB8fCAoaXNEYWlseUZvY3VzUm91dGVSZXF1ZXN0KHJvdXRlSWQsIGdldFNlYXJjaEZyb21IcmVmKGNhbm9uaWNhbEhyZWYpKSA/IHJvdXRlSWQgOiBudWxsKVxuICAgIHx8IChyb3V0ZUlkID09PSAnaG9tZScgPyBnZXRIb21lRGFpbHlGb2N1c1JvdXRlSWQoY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZSkgOiBudWxsKTtcbiAgaWYgKGRhaWx5Rm9jdXNSb3V0ZUlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxvYWRNb2R1bGU6ICgpID0+IHByZWxvYWREYWlseUZvY3VzUnVudGltZShkYWlseUZvY3VzUm91dGVJZCksXG4gICAgfTtcbiAgfVxuICBpZiAoXG4gICAgcm91dGVTdGF0ZT8ubG9ja2VkR2F0ZUlkXG4gICAgfHwgcm91dGVTdGF0ZT8ucm91dGVMb2NrZWRcbiAgKSB7XG4gICAgcmV0dXJuIHt9O1xuICB9XG4gIHJldHVybiAoUk9VVEVfREVTQ1JJUFRPUlNbcm91dGVJZF0gfHwgUk9VVEVfREVTQ1JJUFRPUlMuaG9tZSkucnVudGltZTtcbn1cblxuZnVuY3Rpb24gcmVhZFByb2plY3RGaXh0dXJlKHJvdXRlSWQpIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBwYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICBjb25zdCBmaXh0dXJlID0gcGFyYW1zLmdldCgnZml4dHVyZScpO1xuICBpZiAoIWZpeHR1cmUpIHJldHVybiBudWxsO1xuXG4gIGlmIChyb3V0ZUlkID09PSAncG9ydGZvbGlvJyAmJiBmaXh0dXJlID09PSAncG9ydGZvbGlvLWRyYXdlcicpIHtcbiAgICBjb25zdCBwcm9qZWN0SW5kZXggPSBOdW1iZXIucGFyc2VJbnQocGFyYW1zLmdldCgncHJvamVjdCcpIHx8ICcwJywgMTApO1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiBmaXh0dXJlLFxuICAgICAgcHJvamVjdEluZGV4OiBOdW1iZXIuaXNJbnRlZ2VyKHByb2plY3RJbmRleCkgJiYgcHJvamVjdEluZGV4ID49IDAgPyBwcm9qZWN0SW5kZXggOiAwLFxuICAgIH07XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gc2hvdWxkRGVmZXJCb290U3RhdGVGb3JIb2xkKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBmYWxzZTtcblxuICBjb25zdCBob3N0ID0gd2luZG93LmxvY2F0aW9uLmhvc3RuYW1lO1xuICBpZiAoaG9zdCAhPT0gJ2xvY2FsaG9zdCcgJiYgaG9zdCAhPT0gJzEyNy4wLjAuMScgJiYgaG9zdCAhPT0gJzo6MScpIHJldHVybiBmYWxzZTtcblxuICB0cnkge1xuICAgIHJldHVybiBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpLmdldCgnYWJzQm9vdEhvbGQnKSA9PT0gJzEnO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gbWFya0RpcmVjdFNoZWxsUm91dGVSZWFkeShyb3V0ZUlkLCBpc1N0YW5kYWxvbmVSb3V0ZSwgb3B0aW9ucyA9IHt9KSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm47XG4gIGlmIChpc1N0YW5kYWxvbmVSb3V0ZSB8fCByb3V0ZUlkID09PSAnaG9tZScpIHJldHVybjtcblxuICBjb25zdCBmb250c1JlYWR5ID0gYXdhaXQgd2FpdEZvckZvbnRzKCk7XG4gIGlmIChvcHRpb25zLmlzQ2FuY2VsbGVkPy4oKSkgcmV0dXJuO1xuICBpZiAoIWZvbnRzUmVhZHkpIHtcbiAgICBjb25zb2xlLndhcm4oJ1tzaGVsbF0gQ3JpdGljYWwgZm9udHMgdW5hdmFpbGFibGU7IHJldmVhbGluZyB0aGUgcm91dGUgd2l0aCBmYWxsYmFjayBmb250cycpO1xuICAgIGF3YWl0IGZhaWxEaXJlY3RCb290KHtcbiAgICAgIGRldGFpbDogJ2NyaXRpY2FsLWZvbnRzLXVuYXZhaWxhYmxlJyxcbiAgICAgIHNlbGVjdG9yczogWycjYWJzLXNjZW5lJywgJyNhcHAtZnJhbWUnXSxcbiAgICB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBOb24taG9tZSBzaGVsbCBkaXJlY3QgbG9hZHMgZG8gbm90IHJ1biB0aGUgaG9tZSBwYWdlLW9yY2hlc3RyYXRvciBib290XG4gIC8vIGNvbXBsZXRpb24gcGF0aC4gU2l0ZUFwcCBvd25zIHRoZWlyIGZpbmFsIGJvb3QtcmVhZHkgbWFya2VyIGFmdGVyIHRoZVxuICAvLyByb3V0ZSB2aWV3IGhhcyBtb3VudGVkOyByb3V0ZSBydW50aW1lcyBzdGlsbCBkaXNwYXRjaCBhYnM6cm91dGUtcmVhZHkgZm9yXG4gIC8vIFNQQSB0cmFuc2l0aW9ucyBhbmQgcm91dGUtc3BlY2lmaWMgZml4dHVyZXMuXG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIHJvb3QuY2xhc3NMaXN0LnJlbW92ZShcbiAgICAnZm9udHMtbG9hZGluZycsXG4gICAgJ2VudHJhbmNlLXByZS10cmFuc2l0aW9uJyxcbiAgICAnZW50cmFuY2UtdHJhbnNpdGlvbmluZycsXG4gICAgJ2Ficy1ob21lLXBvc3QtYm9vdC1wZW5kaW5nJyxcbiAgICAnYWJzLWhvbWUtcG9zdC1ib290LWVudGVyJyxcbiAgKTtcblxuICAvLyBQb3J0Zm9saW8gb3ducyBpdHMgZGlyZWN0LWxvYWQgcmVsZWFzZSBiZWNhdXNlIGl0cyBtZWFzdXJlZCBjYXJkIGdlb21ldHJ5XG4gIC8vIGFuZCBhdXRob3JlZCBlbnRyYW5jZSBtdXN0IGJlIHJlYWR5IGJlZm9yZSB0aGUgYm9vdCBvdmVybGF5IGxlYXZlcy5cbiAgaWYgKHJvdXRlSWQgPT09ICdwb3J0Zm9saW8nKSB7XG4gICAgcm9vdC5kYXRhc2V0LmFic0Jvb3REZXRhaWwgPSAncG9ydGZvbGlvLXByZXBhcmluZyc7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcm9vdC5jbGFzc0xpc3QuYWRkKCdhYnMtZGlyZWN0LWJvb3QtcmVhZHknLCAnZW50cmFuY2UtY29tcGxldGUnLCAndWktZW50ZXJlZCcpO1xuXG4gIGlmIChvcHRpb25zLmRlZmVyQm9vdFN0YXRlID09PSB0cnVlKSByZXR1cm47XG5cbiAgaWYgKCFyb290LmRhdGFzZXQuYWJzQm9vdFN0YXRlIHx8IHJvb3QuZGF0YXNldC5hYnNCb290U3RhdGUgPT09ICdib290aW5nJykge1xuICAgIHJvb3QuZGF0YXNldC5hYnNCb290U3RhdGUgPSAncmVhZHknO1xuICB9XG4gIGlmICghcm9vdC5kYXRhc2V0LmFic0Jvb3REZXRhaWwgfHwgcm9vdC5kYXRhc2V0LmFic0Jvb3REZXRhaWwgPT09ICdoZWxkJykge1xuICAgIHJvb3QuZGF0YXNldC5hYnNCb290RGV0YWlsID0gJ3NoZWxsLXJvdXRlLXJlYWR5JztcbiAgfVxuICB2b2lkIGNvbXBsZXRlRGlyZWN0Qm9vdCh7XG4gICAgZGV0YWlsOiBzaG91bGREZWZlckJvb3RTdGF0ZUZvckhvbGQoKSA/ICdoZWxkJyA6ICdzaGVsbC1yb3V0ZS1yZWFkeScsXG4gICAgc2VsZWN0b3JzOiBbJyNhYnMtc2NlbmUnLCAnI2FwcC1mcmFtZSddLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFNpdGVBcHAoKSB7XG4gIGNvbnN0IFtzaW11bGF0aW9uRm9jdXNSZXZpc2lvbiwgc2V0U2ltdWxhdGlvbkZvY3VzUmV2aXNpb25dID0gdXNlU3RhdGUoMCk7XG4gIGNvbnN0IFtzaGVsbFJ1bnRpbWVSZWFkeSwgc2V0U2hlbGxSdW50aW1lUmVhZHldID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCB3YWxsU3VyZmFjZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgaGVyb1N1cmZhY2VSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHVpU3VyZmFjZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgY2hyb21lU3VyZmFjZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc2Vjb25kYXJ5U3VyZmFjZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgZm9vdGVyU3VyZmFjZVJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3Qgc3VyZmFjZVJlZnMgPSB1c2VNZW1vKCgpID0+ICh7XG4gICAgd2FsbDogd2FsbFN1cmZhY2VSZWYsXG4gICAgaGVybzogaGVyb1N1cmZhY2VSZWYsXG4gICAgdWk6IHVpU3VyZmFjZVJlZixcbiAgICBjaHJvbWU6IGNocm9tZVN1cmZhY2VSZWYsXG4gICAgc2Vjb25kYXJ5OiBzZWNvbmRhcnlTdXJmYWNlUmVmLFxuICAgIGZvb3RlcjogZm9vdGVyU3VyZmFjZVJlZixcbiAgfSksIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHJlZnJlc2hTaW11bGF0aW9uRm9jdXMgPSAoKSA9PiB7XG4gICAgICBzZXRTaW11bGF0aW9uRm9jdXNSZXZpc2lvbigocmV2aXNpb24pID0+IHJldmlzaW9uICsgMSk7XG4gICAgfTtcbiAgICBjb25zdCBoYW5kbGVTdG9yYWdlID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoIWV2ZW50IHx8IGV2ZW50LmtleSA9PT0gU0lNVUxBVElPTl9GT0NVU19TVE9SQUdFX0tFWSkge1xuICAgICAgICByZWZyZXNoU2ltdWxhdGlvbkZvY3VzKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFNJTVVMQVRJT05fRk9DVVNfQ0hBTkdFRF9FVkVOVCwgcmVmcmVzaFNpbXVsYXRpb25Gb2N1cyk7XG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3N0b3JhZ2UnLCBoYW5kbGVTdG9yYWdlKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoU0lNVUxBVElPTl9GT0NVU19DSEFOR0VEX0VWRU5ULCByZWZyZXNoU2ltdWxhdGlvbkZvY3VzKTtcbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdzdG9yYWdlJywgaGFuZGxlU3RvcmFnZSk7XG4gICAgfTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IGdldFJvdXRlVmlldyA9IHVzZUNhbGxiYWNrKChyb3V0ZUlkLCBjYW5vbmljYWxIcmVmLCByb3V0ZVN0YXRlU25hcHNob3QpID0+IChcbiAgICBnZXRSb3V0ZVZpZXdGb3JJZChyb3V0ZUlkLCBjYW5vbmljYWxIcmVmLCByb3V0ZVN0YXRlU25hcHNob3QsIHNpbXVsYXRpb25Gb2N1c1JldmlzaW9uKVxuICApLCBbc2ltdWxhdGlvbkZvY3VzUmV2aXNpb25dKTtcblxuICBjb25zdCBnZXRSb3V0ZVJ1bnRpbWUgPSB1c2VDYWxsYmFjaygocm91dGVJZCwgY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZVNuYXBzaG90KSA9PiAoXG4gICAgZ2V0Um91dGVSdW50aW1lRm9ySWQocm91dGVJZCwgY2Fub25pY2FsSHJlZiwgcm91dGVTdGF0ZVNuYXBzaG90LCBzaW11bGF0aW9uRm9jdXNSZXZpc2lvbilcbiAgKSwgW3NpbXVsYXRpb25Gb2N1c1JldmlzaW9uXSk7XG5cbiAgY29uc3Qge1xuICAgIHJvdXRlU3RhdGUsXG4gICAgYWN0aXZlUm91dGVJZCxcbiAgICByb3V0ZVJ1bnRpbWUsXG4gICAgcm91dGVWaWV3LFxuICAgIHRyYW5zaXRpb25DdXJyZW50Um91dGUsXG4gIH0gPSB1c2VTaGVsbFJvdXRlVHJhbnNpdGlvbih7XG4gICAgZ2V0Um91dGVWaWV3LFxuICAgIGdldFJvdXRlUnVudGltZSxcbiAgICBzdXJmYWNlUmVmcyxcbiAgfSk7XG4gIGNvbnN0IGlzU3RhbmRhbG9uZVJvdXRlID0gcm91dGVWaWV3LmxheW91dCA9PT0gJ3N0YW5kYWxvbmUnO1xuICBjb25zdCByb3V0ZVJ1bnRpbWVBY3RpdmUgPSBzaGVsbFJ1bnRpbWVSZWFkeVxuICAgICYmICFpc1N0YW5kYWxvbmVSb3V0ZVxuICAgICYmIHJvdXRlVmlldy5sZWdhY3lSdW50aW1lICE9PSBmYWxzZTtcbiAgY29uc3Qgcm91dGVSdW50aW1lSWQgPSByb3V0ZVZpZXcucnVudGltZVJvdXRlSWQgfHwgcm91dGVTdGF0ZS5yb3V0ZS5pZDtcbiAgY29uc3QgaXNEYWlseUZvY3VzUm91dGUgPSBpc0RhaWx5Rm9jdXNSb3V0ZVJlcXVlc3QoXG4gICAgcm91dGVTdGF0ZS5yb3V0ZS5pZCxcbiAgICBnZXRTZWFyY2hGcm9tSHJlZihyb3V0ZVN0YXRlLmNhbm9uaWNhbEhyZWYpLFxuICApO1xuXG4gIHVzZVNpdGVIYXB0aWNzKHsgcm91dGVJZDogcm91dGVTdGF0ZS5yb3V0ZS5pZCB9KTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChpc1N0YW5kYWxvbmVSb3V0ZSkgcmV0dXJuO1xuICAgIGFwcGx5QWN0aXZlUm91dGVDdXJzb3JDb2xvcihhY3RpdmVSb3V0ZUlkIHx8IHJvdXRlU3RhdGUucm91dGUuaWQpO1xuICB9LCBbYWN0aXZlUm91dGVJZCwgaXNTdGFuZGFsb25lUm91dGUsIHJvdXRlU3RhdGUucm91dGUuaWRdKTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChpc1N0YW5kYWxvbmVSb3V0ZSkgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICBsZXQgY2FuY2VsbGVkID0gZmFsc2U7XG4gICAgc3luY1NoYXJlZFNoZWxsUnVudGltZVN0YXRlKClcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKCFjYW5jZWxsZWQpIHtcbiAgICAgICAgICBzZXRTaGVsbFJ1bnRpbWVSZWFkeSh0cnVlKTtcbiAgICAgICAgfVxuICAgICAgfSlcbiAgICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW3NoZWxsXSBGYWlsZWQgdG8gc3luYyBzaGFyZWQgcnVudGltZSBsYXlvdXQnLCBlcnJvcik7XG4gICAgICB9KTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY2FuY2VsbGVkID0gdHJ1ZTtcbiAgICB9O1xuICB9LCBbaXNTdGFuZGFsb25lUm91dGVdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IG5leHRUaXRsZSA9IFJPVVRFX0RFU0NSSVBUT1JTW3JvdXRlU3RhdGUucm91dGUuaWRdPy50aXRsZTtcbiAgICBpZiAobmV4dFRpdGxlICYmIGRvY3VtZW50LnRpdGxlICE9PSBuZXh0VGl0bGUpIHtcbiAgICAgIGRvY3VtZW50LnRpdGxlID0gbmV4dFRpdGxlO1xuICAgIH1cbiAgfSwgW3JvdXRlU3RhdGUucm91dGUuaWRdKTtcblxuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcbiAgICB2b2lkIG1hcmtEaXJlY3RTaGVsbFJvdXRlUmVhZHkocm91dGVTdGF0ZS5yb3V0ZS5pZCwgaXNTdGFuZGFsb25lUm91dGUsIHtcbiAgICAgIGRlZmVyQm9vdFN0YXRlOiBpc0RhaWx5Rm9jdXNSb3V0ZSxcbiAgICAgIGlzQ2FuY2VsbGVkOiAoKSA9PiBjYW5jZWxsZWQsXG4gICAgfSk7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIGNhbmNlbGxlZCA9IHRydWU7XG4gICAgfTtcbiAgfSwgW2lzRGFpbHlGb2N1c1JvdXRlLCBpc1N0YW5kYWxvbmVSb3V0ZSwgcm91dGVTdGF0ZS5yb3V0ZS5pZF0pO1xuXG4gIHVzZUxlZ2FjeVJvdXRlUnVudGltZSh7XG4gICAgYWN0aXZlOiByb3V0ZVJ1bnRpbWVBY3RpdmUsXG4gICAgbG9hZE1vZHVsZTogcm91dGVSdW50aW1lLmxvYWRNb2R1bGUsXG4gICAgZXhwb3J0TmFtZTogcm91dGVSdW50aW1lLmV4cG9ydE5hbWUsXG4gICAgcm91dGVJZDogcm91dGVSdW50aW1lSWRcbiAgfSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBmaXh0dXJlID0gcmVhZFByb2plY3RGaXh0dXJlKHJvdXRlU3RhdGUucm91dGUuaWQpO1xuICAgIGlmICghZml4dHVyZSB8fCBmaXh0dXJlLnR5cGUgIT09ICdwb3J0Zm9saW8tZHJhd2VyJykge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBsZXQgY2FuY2VsbGVkID0gZmFsc2U7XG4gICAgbGV0IGZhbGxiYWNrVGltZXIgPSBudWxsO1xuXG4gICAgY29uc3QgZGlzcGF0Y2hGaXh0dXJlID0gKCkgPT4ge1xuICAgICAgaWYgKGNhbmNlbGxlZCkgcmV0dXJuO1xuICAgICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgICAgICAgIGlmIChjYW5jZWxsZWQpIHJldHVybjtcbiAgICAgICAgICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYWJzOnBvcnRmb2xpbzpvcGVuLXByb2plY3QnLCB7XG4gICAgICAgICAgICBkZXRhaWw6IHsgaW5kZXg6IGZpeHR1cmUucHJvamVjdEluZGV4IH0sXG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH07XG5cbiAgICBjb25zdCBoYW5kbGVSb3V0ZVJlYWR5ID0gKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoZXZlbnQ/LmRldGFpbD8ucm91dGVJZCA9PT0gJ3BvcnRmb2xpbycpIHtcbiAgICAgICAgZGlzcGF0Y2hGaXh0dXJlKCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdhYnM6cm91dGUtcmVhZHknLCBoYW5kbGVSb3V0ZVJlYWR5KTtcbiAgICBmYWxsYmFja1RpbWVyID0gd2luZG93LnNldFRpbWVvdXQoZGlzcGF0Y2hGaXh0dXJlLCAxNTAwKTtcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjYW5jZWxsZWQgPSB0cnVlO1xuICAgICAgaWYgKGZhbGxiYWNrVGltZXIgIT09IG51bGwpIHtcbiAgICAgICAgd2luZG93LmNsZWFyVGltZW91dChmYWxsYmFja1RpbWVyKTtcbiAgICAgIH1cbiAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdhYnM6cm91dGUtcmVhZHknLCBoYW5kbGVSb3V0ZVJlYWR5KTtcbiAgICB9O1xuICB9LCBbcm91dGVTdGF0ZS5yb3V0ZS5pZF0pO1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIHshaXNTdGFuZGFsb25lUm91dGUgPyA8RGV2Q29uZmlnUGFuZWxCcmlkZ2UgLz4gOiBudWxsfVxuICAgICAgPEJvZHlDbGFzc01hbmFnZXJcbiAgICAgICAgY2xhc3NOYW1lPXtyb3V0ZVZpZXcuYm9keUNsYXNzfVxuICAgICAgICBodG1sQ2xhc3NOYW1lPXtyb3V0ZVZpZXcuaHRtbENsYXNzTmFtZX1cbiAgICAgICAgcm91dGVJZD17cm91dGVTdGF0ZS5yb3V0ZS5pZH1cbiAgICAgIC8+XG4gICAgICB7aXNTdGFuZGFsb25lUm91dGUgPyAoXG4gICAgICAgIHJvdXRlVmlldy5tYWluQ29udGVudFxuICAgICAgKSA6IChcbiAgICAgICAgPFNpbXVsYXRpb25Gb2N1c1Byb3ZpZGVyXG4gICAgICAgICAgcm91dGVJZD17cm91dGVTdGF0ZS5yb3V0ZS5pZH1cbiAgICAgICAgICBzdXJmYWNlUm91dGVJZD17cm91dGVWaWV3LnN1cmZhY2VSb3V0ZUlkIHx8IHJvdXRlU3RhdGUucm91dGUuaWR9XG4gICAgICAgICAgdHJhbnNpdGlvbkN1cnJlbnRSb3V0ZT17dHJhbnNpdGlvbkN1cnJlbnRSb3V0ZX1cbiAgICAgICAgPlxuICAgICAgICAgIDxTdHVkaW9TaGVsbFxuICAgICAgICAgICAgYWN0aXZlUm91dGVJZD17cm91dGVWaWV3Lm5hdmlnYXRpb25Sb3V0ZUlkIHx8IGFjdGl2ZVJvdXRlSWR9XG4gICAgICAgICAgICByb3V0ZVJlbmRlcktleT17cm91dGVWaWV3LnJvdXRlUmVuZGVyS2V5IHx8IHJvdXRlU3RhdGUucm91dGUuaWR9XG4gICAgICAgICAgICBjb250ZW50UmVuZGVyS2V5PXtyb3V0ZVZpZXcuY29udGVudFJlbmRlcktleSB8fCByb3V0ZVN0YXRlLnJvdXRlLmlkfVxuICAgICAgICAgICAgc3R1ZGlvV2luZG93Q2xhc3NOYW1lPXtyb3V0ZVZpZXcuc3R1ZGlvV2luZG93Q2xhc3NOYW1lIHx8IHJvdXRlVmlldy53YWxsQ2xhc3NOYW1lfVxuICAgICAgICAgICAgc2ltdWxhdGlvbkxheWVyPXtyb3V0ZVZpZXcuc2ltdWxhdGlvbkxheWVyfVxuICAgICAgICAgICAgc3R1ZGlvV2luZG93Q29udGVudD17cm91dGVWaWV3LnN0dWRpb1dpbmRvd0NvbnRlbnQgfHwgcm91dGVWaWV3LndhbGxDb250ZW50fVxuICAgICAgICAgICAgaGVyb0xheWVyPXtyb3V0ZVZpZXcuaGVyb0xheWVyfVxuICAgICAgICAgICAgdWlMYXllcj17cm91dGVWaWV3LnVpTGF5ZXJ9XG4gICAgICAgICAgICBoZWFkZXJDb250ZW50PXtyb3V0ZVZpZXcuaGVhZGVyQ29udGVudH1cbiAgICAgICAgICAgIG1haW5Db250ZW50PXtyb3V0ZVZpZXcubWFpbkNvbnRlbnR9XG4gICAgICAgICAgICBoZXJvVGl0bGU9e3JvdXRlVmlldy5oZXJvVGl0bGV9XG4gICAgICAgICAgICBmb290ZXJWYXJpYW50PXtyb3V0ZVZpZXcuZm9vdGVyVmFyaWFudH1cbiAgICAgICAgICAgIHdpbmRvd092ZXJsYXlDb250ZW50PXtyb3V0ZVZpZXcud2luZG93T3ZlcmxheUNvbnRlbnR9XG4gICAgICAgICAgICBzaW11bGF0aW9uRm9jdXNDb250cm9scz17PFNpbXVsYXRpb25Gb2N1c1N3aXRjaGVyIC8+fVxuICAgICAgICAgICAgc2ltdWxhdGlvbkZvY3VzTW9kYWw9ezxTaW11bGF0aW9uRm9jdXNDaG9vc2VyIC8+fVxuICAgICAgICAgICAgc3VyZmFjZVJlZnM9e3N1cmZhY2VSZWZzfVxuICAgICAgICAgIC8+XG4gICAgICAgIDwvU2ltdWxhdGlvbkZvY3VzUHJvdmlkZXI+XG4gICAgICApfVxuICAgIDwvPlxuICApO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL2NvbXBvbmVudHMvYXBwL1NpdGVBcHAuanN4In0=