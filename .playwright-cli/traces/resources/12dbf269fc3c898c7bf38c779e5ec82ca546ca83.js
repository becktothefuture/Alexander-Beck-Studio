import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/repel-room/RepelRoomRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const Suspense = __vite__cjsImport1_react["Suspense"]; const lazy = __vite__cjsImport1_react["lazy"];
import { buildRouteHref } from "/src/lib/routes.js?t=1784282071059";
const homeHref = buildRouteHref("home");
const RepelRoomDemo = lazy(
  _c = () => import("/src/routes/repel-room/RepelRoomDemo.jsx").then((module) => ({ default: module.RepelRoomDemo }))
);
_c2 = RepelRoomDemo;
export const REPEL_ROOM_ROUTE_RUNTIME = {};
export function getRepelRoomRouteView() {
  return {
    bodyClass: "body repel-room-page",
    studioWindowClassName: "w-embed repel-room-wall",
    studioWindowContent: /* @__PURE__ */ jsxDEV(Suspense, { fallback: null, children: /* @__PURE__ */ jsxDEV(RepelRoomDemo, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
      lineNumber: 17,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
      lineNumber: 16,
      columnNumber: 5
    }, this),
    headerContent: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Back to home", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
        lineNumber: 25,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
        lineNumber: 24,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
        lineNumber: 23,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
        lineNumber: 28,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
        lineNumber: 29,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
      lineNumber: 22,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
      lineNumber: 21,
      columnNumber: 5
    }, this),
    mainContent: /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer", "aria-label": "Tension lab" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx",
      lineNumber: 33,
      columnNumber: 18
    }, this)
  };
}
var _c, _c2;
$RefreshReg$(_c, "RepelRoomDemo$lazy");
$RefreshReg$(_c2, "RepelRoomDemo");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/repel-room/RepelRoomRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBZ0JRO0FBaEJSLFNBQVNBLFVBQVVDLFlBQVk7QUFDL0IsU0FBU0Msc0JBQXNCO0FBRS9CLE1BQU1DLFdBQVdELGVBQWUsTUFBTTtBQUN0QyxNQUFNRSxnQkFBZ0JIO0FBQUFBLEVBQUlJLEtBQUNBLE1BQ3pCLE9BQU8scUJBQXFCLEVBQUVDLEtBQUssQ0FBQ0MsWUFBWSxFQUFFQyxTQUFTRCxPQUFPSCxjQUFjLEVBQUU7QUFDbkY7QUFBRUssTUFGR0w7QUFJQyxhQUFNTSwyQkFBMkIsQ0FBQztBQUVsQyxnQkFBU0Msd0JBQXdCO0FBQ3RDLFNBQU87QUFBQSxJQUNMQyxXQUFXO0FBQUEsSUFDWEMsdUJBQXVCO0FBQUEsSUFDdkJDLHFCQUNFLHVCQUFDLFlBQVMsVUFBVSxNQUNsQixpQ0FBQyxtQkFBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQWMsS0FEaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsSUFFRkMsZUFDRSx1QkFBQyxZQUFPLFdBQVUsVUFDaEIsaUNBQUMsU0FBSSxXQUFVLDRCQUNiO0FBQUEsNkJBQUMsU0FBSSxXQUFVLHNCQUNiLGlDQUFDLE9BQUUsTUFBTVosVUFBVSxXQUFVLDBCQUF5QixjQUFXLGdCQUMvRCxpQ0FBQyxPQUFFLFdBQVUsb0JBQW1CLGVBQVksVUFBNUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBSUE7QUFBQSxNQUNBLHVCQUFDLFNBQUksV0FBVSwwQkFBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQXFDO0FBQUEsTUFDckMsdUJBQUMsU0FBSSxXQUFVLHNDQUFmO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBaUQ7QUFBQSxTQVBuRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBUUEsS0FURjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBVUE7QUFBQSxJQUVGYSxhQUFhLHVCQUFDLFVBQUssV0FBVSxvQkFBbUIsY0FBVyxpQkFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUEyRDtBQUFBLEVBQzFFO0FBQ0Y7QUFBQyxJQUFBWCxJQUFBSTtBQUFBLGFBQUFKLElBQUE7QUFBQSxhQUFBSSxLQUFBIiwibmFtZXMiOlsiU3VzcGVuc2UiLCJsYXp5IiwiYnVpbGRSb3V0ZUhyZWYiLCJob21lSHJlZiIsIlJlcGVsUm9vbURlbW8iLCJfYyIsInRoZW4iLCJtb2R1bGUiLCJkZWZhdWx0IiwiX2MyIiwiUkVQRUxfUk9PTV9ST1VURV9SVU5USU1FIiwiZ2V0UmVwZWxSb29tUm91dGVWaWV3IiwiYm9keUNsYXNzIiwic3R1ZGlvV2luZG93Q2xhc3NOYW1lIiwic3R1ZGlvV2luZG93Q29udGVudCIsImhlYWRlckNvbnRlbnQiLCJtYWluQ29udGVudCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJSZXBlbFJvb21Sb3V0ZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3VzcGVuc2UsIGxhenkgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBidWlsZFJvdXRlSHJlZiB9IGZyb20gJy4uLy4uL2xpYi9yb3V0ZXMuanMnO1xuXG5jb25zdCBob21lSHJlZiA9IGJ1aWxkUm91dGVIcmVmKCdob21lJyk7XG5jb25zdCBSZXBlbFJvb21EZW1vID0gbGF6eSgoKSA9PiAoXG4gIGltcG9ydCgnLi9SZXBlbFJvb21EZW1vLmpzeCcpLnRoZW4oKG1vZHVsZSkgPT4gKHsgZGVmYXVsdDogbW9kdWxlLlJlcGVsUm9vbURlbW8gfSkpXG4pKTtcblxuZXhwb3J0IGNvbnN0IFJFUEVMX1JPT01fUk9VVEVfUlVOVElNRSA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UmVwZWxSb29tUm91dGVWaWV3KCkge1xuICByZXR1cm4ge1xuICAgIGJvZHlDbGFzczogJ2JvZHkgcmVwZWwtcm9vbS1wYWdlJyxcbiAgICBzdHVkaW9XaW5kb3dDbGFzc05hbWU6ICd3LWVtYmVkIHJlcGVsLXJvb20td2FsbCcsXG4gICAgc3R1ZGlvV2luZG93Q29udGVudDogKFxuICAgICAgPFN1c3BlbnNlIGZhbGxiYWNrPXtudWxsfT5cbiAgICAgICAgPFJlcGVsUm9vbURlbW8gLz5cbiAgICAgIDwvU3VzcGVuc2U+XG4gICAgKSxcbiAgICBoZWFkZXJDb250ZW50OiAoXG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cInVpLXRvcFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInVpLXRvcC1tYWluIHJvdXRlLXRvcGJhclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19sZWZ0XCI+XG4gICAgICAgICAgICA8YSBocmVmPXtob21lSHJlZn0gY2xhc3NOYW1lPVwiZ2F0ZS1iYWNrIGFicy1pY29uLWJ0blwiIGFyaWEtbGFiZWw9XCJCYWNrIHRvIGhvbWVcIj5cbiAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPVwidGkgdGktYXJyb3ctbGVmdFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICA8L2E+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX2NlbnRlclwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX3JpZ2h0IHVpLXRvcC1yaWdodFwiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9oZWFkZXI+XG4gICAgKSxcbiAgICBtYWluQ29udGVudDogPG1haW4gY2xhc3NOYW1lPVwidWktY2VudGVyLXNwYWNlclwiIGFyaWEtbGFiZWw9XCJUZW5zaW9uIGxhYlwiIC8+LFxuICB9O1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9yZXBlbC1yb29tL1JlcGVsUm9vbVJvdXRlLmpzeCJ9