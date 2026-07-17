import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/beach-ball-room/BeachBallRoomRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const Suspense = __vite__cjsImport1_react["Suspense"]; const lazy = __vite__cjsImport1_react["lazy"];
import { buildRouteHref } from "/src/lib/routes.js?t=1784282071059";
const homeHref = buildRouteHref("home");
const BeachBallRoomSimulation = lazy(
  _c = () => import("/src/routes/beach-ball-room/BeachBallRoomSimulation.jsx").then((module) => ({ default: module.BeachBallRoomSimulation }))
);
_c2 = BeachBallRoomSimulation;
export const BEACH_BALL_ROOM_ROUTE_RUNTIME = {};
export function getBeachBallRoomRouteView() {
  return {
    bodyClass: "body beach-ball-room-page",
    studioWindowClassName: "w-embed beach-ball-room-wall",
    studioWindowContent: /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: /* @__PURE__ */ jsxDEV(BeachBallRoomSimulation, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
      lineNumber: 17,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
      lineNumber: 16,
      columnNumber: 5
    }, this),
    headerContent: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Back to home", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
        lineNumber: 25,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
        lineNumber: 24,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
        lineNumber: 23,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
        lineNumber: 28,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
        lineNumber: 29,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
      lineNumber: 22,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
      lineNumber: 21,
      columnNumber: 5
    }, this),
    mainContent: /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer", "aria-label": "Beach ball room lab" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx",
      lineNumber: 33,
      columnNumber: 18
    }, this)
  };
}
var _c, _c2;
$RefreshReg$(_c, "BeachBallRoomSimulation$lazy");
$RefreshReg$(_c2, "BeachBallRoomSimulation");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/beach-ball-room/BeachBallRoomRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0JRO0FBaEJSLFNBQVNBLFVBQVVDLFlBQVk7QUFDL0IsU0FBU0Msc0JBQXNCO0FBRS9CLE1BQU1DLFdBQVdELGVBQWUsTUFBTTtBQUN0QyxNQUFNRSwwQkFBMEJIO0FBQUFBLEVBQUlJLEtBQUNBLE1BQ25DLE9BQU8sK0JBQStCLEVBQUVDLEtBQUssQ0FBQ0MsWUFBWSxFQUFFQyxTQUFTRCxPQUFPSCx3QkFBd0IsRUFBRTtBQUN2RztBQUFFSyxNQUZHTDtBQUlDLGFBQU1NLGdDQUFnQyxDQUFDO0FBRXZDLGdCQUFTQyw0QkFBNEI7QUFDMUMsU0FBTztBQUFBLElBQ0xDLFdBQVc7QUFBQSxJQUNYQyx1QkFBdUI7QUFBQSxJQUN2QkMscUJBQ0UsdUJBQUMsWUFBUyxVQUFVLE1BQ2xCLGlDQUFDLDZCQUFEO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBd0IsS0FEMUI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsSUFFRkMsZUFDRSx1QkFBQyxZQUFPLFdBQVUsVUFDaEIsaUNBQUMsU0FBSSxXQUFVLDRCQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHNCQUNiLGlDQUFDLE9BQUUsTUFBTVosVUFBVSxXQUFVLDBCQUF5QixjQUFXLGdCQUMvRCxpQ0FBQyxPQUFFLFdBQVUsb0JBQW1CLGVBQVksVUFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSwwQkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFDO0FBQUEsTUFDckMsdUJBQUMsU0FBSSxXQUFVLHNDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBaUQ7QUFBQSxTQVBuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBUUEsS0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUE7QUFBQSxJQUVGYSxhQUFhLHVCQUFDLFVBQUssV0FBVSxvQkFBbUIsY0FBVyx5QkFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFtRTtBQUFBLEVBQ2xGO0FBQ0Y7QUFBQyxJQUFBWCxJQUFBSTtBQUFBLGFBQUFKLElBQUE7QUFBQSxhQUFBSSxLQUFBIiwibmFtZXMiOlsiU3VzcGVuc2UiLCJsYXp5IiwiYnVpbGRSb3V0ZUhyZWYiLCJob21lSHJlZiIsIkJlYWNoQmFsbFJvb21TaW11bGF0aW9uIiwiX2MiLCJ0aGVuIiwibW9kdWxlIiwiZGVmYXVsdCIsIl9jMiIsIkJFQUNIX0JBTExfUk9PTV9ST1VURV9SVU5USU1FIiwiZ2V0QmVhY2hCYWxsUm9vbVJvdXRlVmlldyIsImJvZHlDbGFzcyIsInN0dWRpb1dpbmRvd0NsYXNzTmFtZSIsInN0dWRpb1dpbmRvd0NvbnRlbnQiLCJoZWFkZXJDb250ZW50IiwibWFpbkNvbnRlbnQiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQmVhY2hCYWxsUm9vbVJvdXRlLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTdXNwZW5zZSwgbGF6eSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7IGJ1aWxkUm91dGVIcmVmIH0gZnJvbSAnLi4vLi4vbGliL3JvdXRlcy5qcyc7XG5cbmNvbnN0IGhvbWVIcmVmID0gYnVpbGRSb3V0ZUhyZWYoJ2hvbWUnKTtcbmNvbnN0IEJlYWNoQmFsbFJvb21TaW11bGF0aW9uID0gbGF6eSgoKSA9PiAoXG4gIGltcG9ydCgnLi9CZWFjaEJhbGxSb29tU2ltdWxhdGlvbi5qc3gnKS50aGVuKChtb2R1bGUpID0+ICh7IGRlZmF1bHQ6IG1vZHVsZS5CZWFjaEJhbGxSb29tU2ltdWxhdGlvbiB9KSlcbikpO1xuXG5leHBvcnQgY29uc3QgQkVBQ0hfQkFMTF9ST09NX1JPVVRFX1JVTlRJTUUgPSB7fTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEJlYWNoQmFsbFJvb21Sb3V0ZVZpZXcoKSB7XG4gIHJldHVybiB7XG4gICAgYm9keUNsYXNzOiAnYm9keSBiZWFjaC1iYWxsLXJvb20tcGFnZScsXG4gICAgc3R1ZGlvV2luZG93Q2xhc3NOYW1lOiAndy1lbWJlZCBiZWFjaC1iYWxsLXJvb20td2FsbCcsXG4gICAgc3R1ZGlvV2luZG93Q29udGVudDogKFxuICAgICAgPFN1c3BlbnNlIGZhbGxiYWNrPXtudWxsfT5cbiAgICAgICAgPEJlYWNoQmFsbFJvb21TaW11bGF0aW9uIC8+XG4gICAgICA8L1N1c3BlbnNlPlxuICAgICksXG4gICAgaGVhZGVyQ29udGVudDogKFxuICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJ1aS10b3BcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ1aS10b3AtbWFpbiByb3V0ZS10b3BiYXJcIj5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLXRvcGJhcl9fbGVmdFwiPlxuICAgICAgICAgICAgPGEgaHJlZj17aG9tZUhyZWZ9IGNsYXNzTmFtZT1cImdhdGUtYmFjayBhYnMtaWNvbi1idG5cIiBhcmlhLWxhYmVsPVwiQmFjayB0byBob21lXCI+XG4gICAgICAgICAgICAgIDxpIGNsYXNzTmFtZT1cInRpIHRpLWFycm93LWxlZnRcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICAgICAgPC9hPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19jZW50ZXJcIiAvPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19yaWdodCB1aS10b3AtcmlnaHRcIiAvPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuICAgICksXG4gICAgbWFpbkNvbnRlbnQ6IDxtYWluIGNsYXNzTmFtZT1cInVpLWNlbnRlci1zcGFjZXJcIiBhcmlhLWxhYmVsPVwiQmVhY2ggYmFsbCByb29tIGxhYlwiIC8+LFxuICB9O1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9iZWFjaC1iYWxsLXJvb20vQmVhY2hCYWxsUm9vbVJvdXRlLmpzeCJ9