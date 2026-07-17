import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const Suspense = __vite__cjsImport1_react["Suspense"]; const lazy = __vite__cjsImport1_react["lazy"];
import { buildRouteHref } from "/src/lib/routes.js?t=1784282071059";
const homeHref = buildRouteHref("home");
const FlockOfBirdsDemo = lazy(
  _c = () => import("/src/routes/flock-of-birds/FlockOfBirdsDemo.jsx").then((module) => ({ default: module.FlockOfBirdsDemo }))
);
_c2 = FlockOfBirdsDemo;
export const FLOCK_OF_BIRDS_ROUTE_RUNTIME = {};
export function getFlockOfBirdsRouteView() {
  return {
    bodyClass: "body flock-of-birds-page",
    studioWindowClassName: "w-embed flock-of-birds-wall",
    studioWindowContent: /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: /* @__PURE__ */ jsxDEV(FlockOfBirdsDemo, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
      lineNumber: 17,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
      lineNumber: 16,
      columnNumber: 5
    }, this),
    headerContent: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Back to home", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
        lineNumber: 25,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
        lineNumber: 24,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
        lineNumber: 23,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
        lineNumber: 28,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
        lineNumber: 29,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
      lineNumber: 22,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
      lineNumber: 21,
      columnNumber: 5
    }, this),
    mainContent: /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer", "aria-label": "Convergence lab" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx",
      lineNumber: 33,
      columnNumber: 18
    }, this)
  };
}
var _c, _c2;
$RefreshReg$(_c, "FlockOfBirdsDemo$lazy");
$RefreshReg$(_c2, "FlockOfBirdsDemo");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/flock-of-birds/FlockOfBirdsRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0JRO0FBaEJSLFNBQVNBLFVBQVVDLFlBQVk7QUFDL0IsU0FBU0Msc0JBQXNCO0FBRS9CLE1BQU1DLFdBQVdELGVBQWUsTUFBTTtBQUN0QyxNQUFNRSxtQkFBbUJIO0FBQUFBLEVBQUlJLEtBQUNBLE1BQzVCLE9BQU8sd0JBQXdCLEVBQUVDLEtBQUssQ0FBQ0MsWUFBWSxFQUFFQyxTQUFTRCxPQUFPSCxpQkFBaUIsRUFBRTtBQUN6RjtBQUFFSyxNQUZHTDtBQUlDLGFBQU1NLCtCQUErQixDQUFDO0FBRXRDLGdCQUFTQywyQkFBMkI7QUFDekMsU0FBTztBQUFBLElBQ0xDLFdBQVc7QUFBQSxJQUNYQyx1QkFBdUI7QUFBQSxJQUN2QkMscUJBQ0UsdUJBQUMsWUFBUyxVQUFVLE1BQ2xCLGlDQUFDLHNCQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBaUIsS0FEbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsSUFFRkMsZUFDRSx1QkFBQyxZQUFPLFdBQVUsVUFDaEIsaUNBQUMsU0FBSSxXQUFVLDRCQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHNCQUNiLGlDQUFDLE9BQUUsTUFBTVosVUFBVSxXQUFVLDBCQUF5QixjQUFXLGdCQUMvRCxpQ0FBQyxPQUFFLFdBQVUsb0JBQW1CLGVBQVksVUFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSwwQkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFDO0FBQUEsTUFDckMsdUJBQUMsU0FBSSxXQUFVLHNDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBaUQ7QUFBQSxTQVBuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBUUEsS0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUE7QUFBQSxJQUVGYSxhQUFhLHVCQUFDLFVBQUssV0FBVSxvQkFBbUIsY0FBVyxxQkFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUErRDtBQUFBLEVBQzlFO0FBQ0Y7QUFBQyxJQUFBWCxJQUFBSTtBQUFBLGFBQUFKLElBQUE7QUFBQSxhQUFBSSxLQUFBIiwibmFtZXMiOlsiU3VzcGVuc2UiLCJsYXp5IiwiYnVpbGRSb3V0ZUhyZWYiLCJob21lSHJlZiIsIkZsb2NrT2ZCaXJkc0RlbW8iLCJfYyIsInRoZW4iLCJtb2R1bGUiLCJkZWZhdWx0IiwiX2MyIiwiRkxPQ0tfT0ZfQklSRFNfUk9VVEVfUlVOVElNRSIsImdldEZsb2NrT2ZCaXJkc1JvdXRlVmlldyIsImJvZHlDbGFzcyIsInN0dWRpb1dpbmRvd0NsYXNzTmFtZSIsInN0dWRpb1dpbmRvd0NvbnRlbnQiLCJoZWFkZXJDb250ZW50IiwibWFpbkNvbnRlbnQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiRmxvY2tPZkJpcmRzUm91dGUuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN1c3BlbnNlLCBsYXp5IH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgYnVpbGRSb3V0ZUhyZWYgfSBmcm9tICcuLi8uLi9saWIvcm91dGVzLmpzJztcblxuY29uc3QgaG9tZUhyZWYgPSBidWlsZFJvdXRlSHJlZignaG9tZScpO1xuY29uc3QgRmxvY2tPZkJpcmRzRGVtbyA9IGxhenkoKCkgPT4gKFxuICBpbXBvcnQoJy4vRmxvY2tPZkJpcmRzRGVtby5qc3gnKS50aGVuKChtb2R1bGUpID0+ICh7IGRlZmF1bHQ6IG1vZHVsZS5GbG9ja09mQmlyZHNEZW1vIH0pKVxuKSk7XG5cbmV4cG9ydCBjb25zdCBGTE9DS19PRl9CSVJEU19ST1VURV9SVU5USU1FID0ge307XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRGbG9ja09mQmlyZHNSb3V0ZVZpZXcoKSB7XG4gIHJldHVybiB7XG4gICAgYm9keUNsYXNzOiAnYm9keSBmbG9jay1vZi1iaXJkcy1wYWdlJyxcbiAgICBzdHVkaW9XaW5kb3dDbGFzc05hbWU6ICd3LWVtYmVkIGZsb2NrLW9mLWJpcmRzLXdhbGwnLFxuICAgIHN0dWRpb1dpbmRvd0NvbnRlbnQ6IChcbiAgICAgIDxTdXNwZW5zZSBmYWxsYmFjaz17bnVsbH0+XG4gICAgICAgIDxGbG9ja09mQmlyZHNEZW1vIC8+XG4gICAgICA8L1N1c3BlbnNlPlxuICAgICksXG4gICAgaGVhZGVyQ29udGVudDogKFxuICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJ1aS10b3BcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ1aS10b3AtbWFpbiByb3V0ZS10b3BiYXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLXRvcGJhcl9fbGVmdFwiPlxuICAgICAgICAgICAgPGEgaHJlZj17aG9tZUhyZWZ9IGNsYXNzTmFtZT1cImdhdGUtYmFjayBhYnMtaWNvbi1idG5cIiBhcmlhLWxhYmVsPVwiQmFjayB0byBob21lXCI+XG4gICAgICAgICAgICAgIDxpIGNsYXNzTmFtZT1cInRpIHRpLWFycm93LWxlZnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICAgICAgPC9hPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19jZW50ZXJcIiAvPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19yaWdodCB1aS10b3AtcmlnaHRcIiAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuICAgICksXG4gICAgbWFpbkNvbnRlbnQ6IDxtYWluIGNsYXNzTmFtZT1cInVpLWNlbnRlci1zcGFjZXJcIiBhcmlhLWxhYmVsPVwiQ29udmVyZ2VuY2UgbGFiXCIgLz4sXG4gIH07XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL2Zsb2NrLW9mLWJpcmRzL0Zsb2NrT2ZCaXJkc1JvdXRlLmpzeCJ9