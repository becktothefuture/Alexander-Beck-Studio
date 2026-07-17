import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/concept-simulations/ConceptSimulationRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const Suspense = __vite__cjsImport1_react["Suspense"]; const lazy = __vite__cjsImport1_react["lazy"];
import { buildRouteHref } from "/src/lib/routes.js";
import {
  CONCEPT_SIMULATION_IDS,
  CONCEPT_SIMULATION_REGISTRY
} from "/src/routes/concept-simulations/conceptSimulationConfigs.js";
const homeHref = buildRouteHref("home");
const ConceptSimulationDemo = lazy(
  _c = () => import("/src/routes/concept-simulations/ConceptSimulationDemo.jsx").then((module) => ({ default: module.ConceptSimulationDemo }))
);
_c2 = ConceptSimulationDemo;
export const APERTURE_BLOOM_ROUTE_RUNTIME = {};
export const CONFLUENCE_BRIDGES_ROUTE_RUNTIME = {};
export const NAPOLEON_POINT_CLOUD_ROUTE_RUNTIME = {};
export const RIFT_RINGS_ROUTE_RUNTIME = {};
export const SPATIAL_SCAN_ROUTE_RUNTIME = {};
function getConceptSimulationRouteView(simulationId) {
  const entry = CONCEPT_SIMULATION_REGISTRY[simulationId];
  return {
    bodyClass: `body concept-simulation-page ${simulationId}-page`,
    studioWindowClassName: `w-embed concept-simulation-wall ${simulationId}-wall`,
    studioWindowContent: /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: /* @__PURE__ */ jsxDEV(ConceptSimulationDemo, { simulationId }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
      lineNumber: 27,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
      lineNumber: 26,
      columnNumber: 5
    }, this),
    headerContent: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Back to home", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
        lineNumber: 35,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
        lineNumber: 34,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
        lineNumber: 33,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
        lineNumber: 38,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
        lineNumber: 39,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
      lineNumber: 32,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
      lineNumber: 31,
      columnNumber: 5
    }, this),
    mainContent: /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer", "aria-label": `${entry.name} lab` }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx",
      lineNumber: 43,
      columnNumber: 18
    }, this)
  };
}
export function getApertureBloomRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.APERTURE_BLOOM);
}
export function getConfluenceBridgesRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES);
}
export function getNapoleonPointCloudRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD);
}
export function getRiftRingsRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.RIFT_RINGS);
}
export function getSpatialScanRouteView() {
  return getConceptSimulationRouteView(CONCEPT_SIMULATION_IDS.SPATIAL_SCAN);
}
var _c, _c2;
$RefreshReg$(_c, "ConceptSimulationDemo$lazy");
$RefreshReg$(_c2, "ConceptSimulationDemo");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/concept-simulations/ConceptSimulationRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBMEJRO0FBMUJSLFNBQVNBLFVBQVVDLFlBQVk7QUFDL0IsU0FBU0Msc0JBQXNCO0FBQy9CO0FBQUEsRUFDRUM7QUFBQUEsRUFDQUM7QUFBQUEsT0FDSztBQUVQLE1BQU1DLFdBQVdILGVBQWUsTUFBTTtBQUN0QyxNQUFNSSx3QkFBd0JMO0FBQUFBLEVBQUlNLEtBQUNBLE1BQ2pDLE9BQU8sNkJBQTZCLEVBQUVDLEtBQUssQ0FBQ0MsWUFBWSxFQUFFQyxTQUFTRCxPQUFPSCxzQkFBc0IsRUFBRTtBQUNuRztBQUFFSyxNQUZHTDtBQUlDLGFBQU1NLCtCQUErQixDQUFDO0FBQ3RDLGFBQU1DLG1DQUFtQyxDQUFDO0FBQzFDLGFBQU1DLHFDQUFxQyxDQUFDO0FBQzVDLGFBQU1DLDJCQUEyQixDQUFDO0FBQ2xDLGFBQU1DLDZCQUE2QixDQUFDO0FBRTNDLFNBQVNDLDhCQUE4QkMsY0FBYztBQUNuRCxRQUFNQyxRQUFRZiw0QkFBNEJjLFlBQVk7QUFFdEQsU0FBTztBQUFBLElBQ0xFLFdBQVcsZ0NBQWdDRixZQUFZO0FBQUEsSUFDdkRHLHVCQUF1QixtQ0FBbUNILFlBQVk7QUFBQSxJQUN0RUkscUJBQ0UsdUJBQUMsWUFBUyxVQUFVLE1BQ2xCLGlDQUFDLHlCQUFzQixnQkFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBRUE7QUFBQSxJQUVGQyxlQUNFLHVCQUFDLFlBQU8sV0FBVSxVQUNoQixpQ0FBQyxTQUFJLFdBQVUsNEJBQ2I7QUFBQSw2QkFBQyxTQUFJLFdBQVUsc0JBQ2IsaUNBQUMsT0FBRSxNQUFNbEIsVUFBVSxXQUFVLDBCQUF5QixjQUFXLGdCQUMvRCxpQ0FBQyxPQUFFLFdBQVUsb0JBQW1CLGVBQVksVUFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSwwQkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFDO0FBQUEsTUFDckMsdUJBQUMsU0FBSSxXQUFVLHNDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBaUQ7QUFBQSxTQVBuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBUUEsS0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUE7QUFBQSxJQUVGbUIsYUFBYSx1QkFBQyxVQUFLLFdBQVUsb0JBQW1CLGNBQVksR0FBR0wsTUFBTU0sSUFBSSxVQUE1RDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQW1FO0FBQUEsRUFDbEY7QUFDRjtBQUVPLGdCQUFTQyw0QkFBNEI7QUFDMUMsU0FBT1QsOEJBQThCZCx1QkFBdUJ3QixjQUFjO0FBQzVFO0FBRU8sZ0JBQVNDLGdDQUFnQztBQUM5QyxTQUFPWCw4QkFBOEJkLHVCQUF1QjBCLGtCQUFrQjtBQUNoRjtBQUVPLGdCQUFTQyxpQ0FBaUM7QUFDL0MsU0FBT2IsOEJBQThCZCx1QkFBdUI0QixvQkFBb0I7QUFDbEY7QUFFTyxnQkFBU0Msd0JBQXdCO0FBQ3RDLFNBQU9mLDhCQUE4QmQsdUJBQXVCOEIsVUFBVTtBQUN4RTtBQUVPLGdCQUFTQywwQkFBMEI7QUFDeEMsU0FBT2pCLDhCQUE4QmQsdUJBQXVCZ0MsWUFBWTtBQUMxRTtBQUFDLElBQUE1QixJQUFBSTtBQUFBLGFBQUFKLElBQUE7QUFBQSxhQUFBSSxLQUFBIiwibmFtZXMiOlsiU3VzcGVuc2UiLCJsYXp5IiwiYnVpbGRSb3V0ZUhyZWYiLCJDT05DRVBUX1NJTVVMQVRJT05fSURTIiwiQ09OQ0VQVF9TSU1VTEFUSU9OX1JFR0lTVFJZIiwiaG9tZUhyZWYiLCJDb25jZXB0U2ltdWxhdGlvbkRlbW8iLCJfYyIsInRoZW4iLCJtb2R1bGUiLCJkZWZhdWx0IiwiX2MyIiwiQVBFUlRVUkVfQkxPT01fUk9VVEVfUlVOVElNRSIsIkNPTkZMVUVOQ0VfQlJJREdFU19ST1VURV9SVU5USU1FIiwiTkFQT0xFT05fUE9JTlRfQ0xPVURfUk9VVEVfUlVOVElNRSIsIlJJRlRfUklOR1NfUk9VVEVfUlVOVElNRSIsIlNQQVRJQUxfU0NBTl9ST1VURV9SVU5USU1FIiwiZ2V0Q29uY2VwdFNpbXVsYXRpb25Sb3V0ZVZpZXciLCJzaW11bGF0aW9uSWQiLCJlbnRyeSIsImJvZHlDbGFzcyIsInN0dWRpb1dpbmRvd0NsYXNzTmFtZSIsInN0dWRpb1dpbmRvd0NvbnRlbnQiLCJoZWFkZXJDb250ZW50IiwibWFpbkNvbnRlbnQiLCJuYW1lIiwiZ2V0QXBlcnR1cmVCbG9vbVJvdXRlVmlldyIsIkFQRVJUVVJFX0JMT09NIiwiZ2V0Q29uZmx1ZW5jZUJyaWRnZXNSb3V0ZVZpZXciLCJDT05GTFVFTkNFX0JSSURHRVMiLCJnZXROYXBvbGVvblBvaW50Q2xvdWRSb3V0ZVZpZXciLCJOQVBPTEVPTl9QT0lOVF9DTE9VRCIsImdldFJpZnRSaW5nc1JvdXRlVmlldyIsIlJJRlRfUklOR1MiLCJnZXRTcGF0aWFsU2NhblJvdXRlVmlldyIsIlNQQVRJQUxfU0NBTiJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJDb25jZXB0U2ltdWxhdGlvblJvdXRlLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdXNwZW5zZSwgbGF6eSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGJ1aWxkUm91dGVIcmVmIH0gZnJvbSAnLi4vLi4vbGliL3JvdXRlcy5qcyc7XG5pbXBvcnQge1xuICBDT05DRVBUX1NJTVVMQVRJT05fSURTLFxuICBDT05DRVBUX1NJTVVMQVRJT05fUkVHSVNUUlksXG59IGZyb20gJy4vY29uY2VwdFNpbXVsYXRpb25Db25maWdzLmpzJztcblxuY29uc3QgaG9tZUhyZWYgPSBidWlsZFJvdXRlSHJlZignaG9tZScpO1xuY29uc3QgQ29uY2VwdFNpbXVsYXRpb25EZW1vID0gbGF6eSgoKSA9PiAoXG4gIGltcG9ydCgnLi9Db25jZXB0U2ltdWxhdGlvbkRlbW8uanN4JykudGhlbigobW9kdWxlKSA9PiAoeyBkZWZhdWx0OiBtb2R1bGUuQ29uY2VwdFNpbXVsYXRpb25EZW1vIH0pKVxuKSk7XG5cbmV4cG9ydCBjb25zdCBBUEVSVFVSRV9CTE9PTV9ST1VURV9SVU5USU1FID0ge307XG5leHBvcnQgY29uc3QgQ09ORkxVRU5DRV9CUklER0VTX1JPVVRFX1JVTlRJTUUgPSB7fTtcbmV4cG9ydCBjb25zdCBOQVBPTEVPTl9QT0lOVF9DTE9VRF9ST1VURV9SVU5USU1FID0ge307XG5leHBvcnQgY29uc3QgUklGVF9SSU5HU19ST1VURV9SVU5USU1FID0ge307XG5leHBvcnQgY29uc3QgU1BBVElBTF9TQ0FOX1JPVVRFX1JVTlRJTUUgPSB7fTtcblxuZnVuY3Rpb24gZ2V0Q29uY2VwdFNpbXVsYXRpb25Sb3V0ZVZpZXcoc2ltdWxhdGlvbklkKSB7XG4gIGNvbnN0IGVudHJ5ID0gQ09OQ0VQVF9TSU1VTEFUSU9OX1JFR0lTVFJZW3NpbXVsYXRpb25JZF07XG5cbiAgcmV0dXJuIHtcbiAgICBib2R5Q2xhc3M6IGBib2R5IGNvbmNlcHQtc2ltdWxhdGlvbi1wYWdlICR7c2ltdWxhdGlvbklkfS1wYWdlYCxcbiAgICBzdHVkaW9XaW5kb3dDbGFzc05hbWU6IGB3LWVtYmVkIGNvbmNlcHQtc2ltdWxhdGlvbi13YWxsICR7c2ltdWxhdGlvbklkfS13YWxsYCxcbiAgICBzdHVkaW9XaW5kb3dDb250ZW50OiAoXG4gICAgICA8U3VzcGVuc2UgZmFsbGJhY2s9e251bGx9PlxuICAgICAgICA8Q29uY2VwdFNpbXVsYXRpb25EZW1vIHNpbXVsYXRpb25JZD17c2ltdWxhdGlvbklkfSAvPlxuICAgICAgPC9TdXNwZW5zZT5cbiAgICApLFxuICAgIGhlYWRlckNvbnRlbnQ6IChcbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwidWktdG9wXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidWktdG9wLW1haW4gcm91dGUtdG9wYmFyXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX2xlZnRcIj5cbiAgICAgICAgICAgIDxhIGhyZWY9e2hvbWVIcmVmfSBjbGFzc05hbWU9XCJnYXRlLWJhY2sgYWJzLWljb24tYnRuXCIgYXJpYS1sYWJlbD1cIkJhY2sgdG8gaG9tZVwiPlxuICAgICAgICAgICAgICA8aSBjbGFzc05hbWU9XCJ0aSB0aS1hcnJvdy1sZWZ0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLXRvcGJhcl9fY2VudGVyXCIgLz5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLXRvcGJhcl9fcmlnaHQgdWktdG9wLXJpZ2h0XCIgLz5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2hlYWRlcj5cbiAgICApLFxuICAgIG1haW5Db250ZW50OiA8bWFpbiBjbGFzc05hbWU9XCJ1aS1jZW50ZXItc3BhY2VyXCIgYXJpYS1sYWJlbD17YCR7ZW50cnkubmFtZX0gbGFiYH0gLz4sXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRBcGVydHVyZUJsb29tUm91dGVWaWV3KCkge1xuICByZXR1cm4gZ2V0Q29uY2VwdFNpbXVsYXRpb25Sb3V0ZVZpZXcoQ09OQ0VQVF9TSU1VTEFUSU9OX0lEUy5BUEVSVFVSRV9CTE9PTSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDb25mbHVlbmNlQnJpZGdlc1JvdXRlVmlldygpIHtcbiAgcmV0dXJuIGdldENvbmNlcHRTaW11bGF0aW9uUm91dGVWaWV3KENPTkNFUFRfU0lNVUxBVElPTl9JRFMuQ09ORkxVRU5DRV9CUklER0VTKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE5hcG9sZW9uUG9pbnRDbG91ZFJvdXRlVmlldygpIHtcbiAgcmV0dXJuIGdldENvbmNlcHRTaW11bGF0aW9uUm91dGVWaWV3KENPTkNFUFRfU0lNVUxBVElPTl9JRFMuTkFQT0xFT05fUE9JTlRfQ0xPVUQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmlmdFJpbmdzUm91dGVWaWV3KCkge1xuICByZXR1cm4gZ2V0Q29uY2VwdFNpbXVsYXRpb25Sb3V0ZVZpZXcoQ09OQ0VQVF9TSU1VTEFUSU9OX0lEUy5SSUZUX1JJTkdTKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNwYXRpYWxTY2FuUm91dGVWaWV3KCkge1xuICByZXR1cm4gZ2V0Q29uY2VwdFNpbXVsYXRpb25Sb3V0ZVZpZXcoQ09OQ0VQVF9TSU1VTEFUSU9OX0lEUy5TUEFUSUFMX1NDQU4pO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9jb25jZXB0LXNpbXVsYXRpb25zL0NvbmNlcHRTaW11bGF0aW9uUm91dGUuanN4In0=