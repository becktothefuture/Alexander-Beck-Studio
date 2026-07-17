import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/mineral-growth/MineralGrowthRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const Suspense = __vite__cjsImport1_react["Suspense"]; const lazy = __vite__cjsImport1_react["lazy"];
import { buildRouteHref } from "/src/lib/routes.js";
const homeHref = buildRouteHref("home");
const MineralGrowthDemo = lazy(
  _c = () => import("/src/routes/mineral-growth/MineralGrowthDemo.jsx").then((module) => ({ default: module.MineralGrowthDemo }))
);
_c2 = MineralGrowthDemo;
export const MINERAL_GROWTH_ROUTE_RUNTIME = {};
export function getMineralGrowthRouteView() {
  return {
    bodyClass: "body mineral-growth-page",
    studioWindowClassName: "w-embed mineral-growth-wall",
    studioWindowContent: /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: /* @__PURE__ */ jsxDEV(MineralGrowthDemo, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
      lineNumber: 17,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
      lineNumber: 16,
      columnNumber: 5
    }, this),
    headerContent: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Back to home", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
        lineNumber: 25,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
        lineNumber: 24,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
        lineNumber: 23,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
        lineNumber: 28,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
        lineNumber: 29,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
      lineNumber: 22,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
      lineNumber: 21,
      columnNumber: 5
    }, this),
    mainContent: /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer", "aria-label": "Formation lab" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx",
      lineNumber: 33,
      columnNumber: 18
    }, this)
  };
}
var _c, _c2;
$RefreshReg$(_c, "MineralGrowthDemo$lazy");
$RefreshReg$(_c2, "MineralGrowthDemo");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/mineral-growth/MineralGrowthRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0JRO0FBaEJSLFNBQVNBLFVBQVVDLFlBQVk7QUFDL0IsU0FBU0Msc0JBQXNCO0FBRS9CLE1BQU1DLFdBQVdELGVBQWUsTUFBTTtBQUN0QyxNQUFNRSxvQkFBb0JIO0FBQUFBLEVBQUlJLEtBQUNBLE1BQzdCLE9BQU8seUJBQXlCLEVBQUVDLEtBQUssQ0FBQ0MsWUFBWSxFQUFFQyxTQUFTRCxPQUFPSCxrQkFBa0IsRUFBRTtBQUMzRjtBQUFFSyxNQUZHTDtBQUlDLGFBQU1NLCtCQUErQixDQUFDO0FBRXRDLGdCQUFTQyw0QkFBNEI7QUFDMUMsU0FBTztBQUFBLElBQ0xDLFdBQVc7QUFBQSxJQUNYQyx1QkFBdUI7QUFBQSxJQUN2QkMscUJBQ0UsdUJBQUMsWUFBUyxVQUFVLE1BQ2xCLGlDQUFDLHVCQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBa0IsS0FEcEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsSUFFRkMsZUFDRSx1QkFBQyxZQUFPLFdBQVUsVUFDaEIsaUNBQUMsU0FBSSxXQUFVLDRCQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHNCQUNiLGlDQUFDLE9BQUUsTUFBTVosVUFBVSxXQUFVLDBCQUF5QixjQUFXLGdCQUMvRCxpQ0FBQyxPQUFFLFdBQVUsb0JBQW1CLGVBQVksVUFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSwwQkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFDO0FBQUEsTUFDckMsdUJBQUMsU0FBSSxXQUFVLHNDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBaUQ7QUFBQSxTQVBuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBUUEsS0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUE7QUFBQSxJQUVGYSxhQUFhLHVCQUFDLFVBQUssV0FBVSxvQkFBbUIsY0FBVyxtQkFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUE2RDtBQUFBLEVBQzVFO0FBQ0Y7QUFBQyxJQUFBWCxJQUFBSTtBQUFBLGFBQUFKLElBQUE7QUFBQSxhQUFBSSxLQUFBIiwibmFtZXMiOlsiU3VzcGVuc2UiLCJsYXp5IiwiYnVpbGRSb3V0ZUhyZWYiLCJob21lSHJlZiIsIk1pbmVyYWxHcm93dGhEZW1vIiwiX2MiLCJ0aGVuIiwibW9kdWxlIiwiZGVmYXVsdCIsIl9jMiIsIk1JTkVSQUxfR1JPV1RIX1JPVVRFX1JVTlRJTUUiLCJnZXRNaW5lcmFsR3Jvd3RoUm91dGVWaWV3IiwiYm9keUNsYXNzIiwic3R1ZGlvV2luZG93Q2xhc3NOYW1lIiwic3R1ZGlvV2luZG93Q29udGVudCIsImhlYWRlckNvbnRlbnQiLCJtYWluQ29udGVudCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJNaW5lcmFsR3Jvd3RoUm91dGUuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN1c3BlbnNlLCBsYXp5IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgYnVpbGRSb3V0ZUhyZWYgfSBmcm9tICcuLi8uLi9saWIvcm91dGVzLmpzJztcblxuY29uc3QgaG9tZUhyZWYgPSBidWlsZFJvdXRlSHJlZignaG9tZScpO1xuY29uc3QgTWluZXJhbEdyb3d0aERlbW8gPSBsYXp5KCgpID0+IChcbiAgaW1wb3J0KCcuL01pbmVyYWxHcm93dGhEZW1vLmpzeCcpLnRoZW4oKG1vZHVsZSkgPT4gKHsgZGVmYXVsdDogbW9kdWxlLk1pbmVyYWxHcm93dGhEZW1vIH0pKVxuKSk7XG5cbmV4cG9ydCBjb25zdCBNSU5FUkFMX0dST1dUSF9ST1VURV9SVU5USU1FID0ge307XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNaW5lcmFsR3Jvd3RoUm91dGVWaWV3KCkge1xuICByZXR1cm4ge1xuICAgIGJvZHlDbGFzczogJ2JvZHkgbWluZXJhbC1ncm93dGgtcGFnZScsXG4gICAgc3R1ZGlvV2luZG93Q2xhc3NOYW1lOiAndy1lbWJlZCBtaW5lcmFsLWdyb3d0aC13YWxsJyxcbiAgICBzdHVkaW9XaW5kb3dDb250ZW50OiAoXG4gICAgICA8U3VzcGVuc2UgZmFsbGJhY2s9e251bGx9PlxuICAgICAgICA8TWluZXJhbEdyb3d0aERlbW8gLz5cbiAgICAgIDwvU3VzcGVuc2U+XG4gICAgKSxcbiAgICBoZWFkZXJDb250ZW50OiAoXG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cInVpLXRvcFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInVpLXRvcC1tYWluIHJvdXRlLXRvcGJhclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19sZWZ0XCI+XG4gICAgICAgICAgICA8YSBocmVmPXtob21lSHJlZn0gY2xhc3NOYW1lPVwiZ2F0ZS1iYWNrIGFicy1pY29uLWJ0blwiIGFyaWEtbGFiZWw9XCJCYWNrIHRvIGhvbWVcIj5cbiAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPVwidGkgdGktYXJyb3ctbGVmdFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICA8L2E+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX2NlbnRlclwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX3JpZ2h0IHVpLXRvcC1yaWdodFwiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9oZWFkZXI+XG4gICAgKSxcbiAgICBtYWluQ29udGVudDogPG1haW4gY2xhc3NOYW1lPVwidWktY2VudGVyLXNwYWNlclwiIGFyaWEtbGFiZWw9XCJGb3JtYXRpb24gbGFiXCIgLz4sXG4gIH07XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL21pbmVyYWwtZ3Jvd3RoL01pbmVyYWxHcm93dGhSb3V0ZS5qc3gifQ==