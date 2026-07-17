import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/daily-focus/SimulationStage.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import { DailyFocusShellBridge } from "/src/routes/daily-focus/DailyFocusShellBridge.jsx";
export function SimulationStage({
  simulationId,
  children,
  status = "",
  includeShellBridge = true
}) {
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    includeShellBridge ? /* @__PURE__ */ jsxDEV(DailyFocusShellBridge, { simulationId }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx",
      lineNumber: 11,
      columnNumber: 29
    }, this) : null,
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: "simulation-stage",
        className: "daily-simulation-layer",
        "data-simulation-id": simulationId,
        "data-simulation-stage": "daily-focus",
        children
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx",
        lineNumber: 12,
        columnNumber: 7
      },
      this
    ),
    status ? /* @__PURE__ */ jsxDEV("p", { className: "screen-reader", role: "status", "aria-live": "polite", children: status }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx",
      lineNumber: 21,
      columnNumber: 7
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx",
    lineNumber: 10,
    columnNumber: 5
  }, this);
}
_c = SimulationStage;
var _c;
$RefreshReg$(_c, "SimulationStage");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/SimulationStage.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBU0ksbUJBQ3dCLGNBRHhCO0FBVEosU0FBU0EsNkJBQTZCO0FBRS9CLGdCQUFTQyxnQkFBZ0I7QUFBQSxFQUM5QkM7QUFBQUEsRUFDQUM7QUFBQUEsRUFDQUMsU0FBUztBQUFBLEVBQ1RDLHFCQUFxQjtBQUN2QixHQUFHO0FBQ0QsU0FDRSxtQ0FDR0E7QUFBQUEseUJBQXFCLHVCQUFDLHlCQUFzQixnQkFBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFrRCxJQUFNO0FBQUEsSUFDOUU7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLElBQUc7QUFBQSxRQUNILFdBQVU7QUFBQSxRQUNWLHNCQUFvQkg7QUFBQUEsUUFDcEIseUJBQXNCO0FBQUEsUUFFckJDO0FBQUFBO0FBQUFBLE1BTkg7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBT0E7QUFBQSxJQUNDQyxTQUNDLHVCQUFDLE9BQUUsV0FBVSxpQkFBZ0IsTUFBSyxVQUFTLGFBQVUsVUFDbERBLG9CQURIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FFQSxJQUNFO0FBQUEsT0FkTjtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBZUE7QUFFSjtBQUFDRSxLQXhCZUw7QUFBZSxJQUFBSztBQUFBLGFBQUFBLElBQUEiLCJuYW1lcyI6WyJEYWlseUZvY3VzU2hlbGxCcmlkZ2UiLCJTaW11bGF0aW9uU3RhZ2UiLCJzaW11bGF0aW9uSWQiLCJjaGlsZHJlbiIsInN0YXR1cyIsImluY2x1ZGVTaGVsbEJyaWRnZSIsIl9jIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlNpbXVsYXRpb25TdGFnZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRGFpbHlGb2N1c1NoZWxsQnJpZGdlIH0gZnJvbSAnLi9EYWlseUZvY3VzU2hlbGxCcmlkZ2UuanN4JztcblxuZXhwb3J0IGZ1bmN0aW9uIFNpbXVsYXRpb25TdGFnZSh7XG4gIHNpbXVsYXRpb25JZCxcbiAgY2hpbGRyZW4sXG4gIHN0YXR1cyA9ICcnLFxuICBpbmNsdWRlU2hlbGxCcmlkZ2UgPSB0cnVlLFxufSkge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICB7aW5jbHVkZVNoZWxsQnJpZGdlID8gPERhaWx5Rm9jdXNTaGVsbEJyaWRnZSBzaW11bGF0aW9uSWQ9e3NpbXVsYXRpb25JZH0gLz4gOiBudWxsfVxuICAgICAgPGRpdlxuICAgICAgICBpZD1cInNpbXVsYXRpb24tc3RhZ2VcIlxuICAgICAgICBjbGFzc05hbWU9XCJkYWlseS1zaW11bGF0aW9uLWxheWVyXCJcbiAgICAgICAgZGF0YS1zaW11bGF0aW9uLWlkPXtzaW11bGF0aW9uSWR9XG4gICAgICAgIGRhdGEtc2ltdWxhdGlvbi1zdGFnZT1cImRhaWx5LWZvY3VzXCJcbiAgICAgID5cbiAgICAgICAge2NoaWxkcmVufVxuICAgICAgPC9kaXY+XG4gICAgICB7c3RhdHVzID8gKFxuICAgICAgICA8cCBjbGFzc05hbWU9XCJzY3JlZW4tcmVhZGVyXCIgcm9sZT1cInN0YXR1c1wiIGFyaWEtbGl2ZT1cInBvbGl0ZVwiPlxuICAgICAgICAgIHtzdGF0dXN9XG4gICAgICAgIDwvcD5cbiAgICAgICkgOiBudWxsfVxuICAgIDwvPlxuICApO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9kYWlseS1mb2N1cy9TaW11bGF0aW9uU3RhZ2UuanN4In0=