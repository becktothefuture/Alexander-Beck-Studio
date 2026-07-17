import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/daily-focus/dailyFocusRuntimes.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const Component = __vite__cjsImport1_react["Component"]; const Suspense = __vite__cjsImport1_react["Suspense"]; const lazy = __vite__cjsImport1_react["lazy"];
import {
  DAILY_FOCUS_RUNTIME_EXPORTS,
  hasDailyFocusRuntime,
  loadDailyFocusRuntimeModule,
  publishDailyFocusRuntimeFailure,
  requestDailyFocusRuntimeDocumentRetry
} from "/src/routes/daily-focus/dailyFocusRuntimeLoader.js";
import { getSimulationLaunchTarget } from "/src/data/simulationCatalog.js";
function createLazyRuntime(simulationId) {
  return lazy(() => loadDailyFocusRuntimeModule(simulationId).then((module) => ({
    default: module[DAILY_FOCUS_RUNTIME_EXPORTS[simulationId]]
  })));
}
const RUNTIME_COMPONENTS = Object.freeze({
  "beach-ball-room": createLazyRuntime("beach-ball-room"),
  "rift-rings": createLazyRuntime("rift-rings"),
  "flock-of-birds": createLazyRuntime("flock-of-birds"),
  "mineral-growth": createLazyRuntime("mineral-growth"),
  "repel-room": createLazyRuntime("repel-room")
});
class DailyFocusRuntimeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    publishDailyFocusRuntimeFailure(this.props.simulationId, error);
  }
  render() {
    if (this.state.error) {
      return /* @__PURE__ */ jsxDEV("div", { className: "daily-focus-runtime-status", "data-runtime-status": "failed", role: "status", children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Simulation failed to load." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
          lineNumber: 43,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            onClick: () => {
              const target = getSimulationLaunchTarget(this.props.simulationId);
              const retryUrl = new URL(target?.href || window.location.href, window.location.origin);
              requestDailyFocusRuntimeDocumentRetry(this.props.simulationId);
              retryUrl.searchParams.set("runtimeRetry", String(Date.now()));
              window.location.replace(retryUrl.toString());
            },
            children: "Retry"
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
            lineNumber: 44,
            columnNumber: 11
          },
          this
        )
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
        lineNumber: 42,
        columnNumber: 9
      }, this);
    }
    return this.props.children;
  }
}
function runtimeLoadingState() {
  return /* @__PURE__ */ jsxDEV("div", { className: "daily-focus-runtime-status", "data-runtime-status": "loading", role: "status", children: /* @__PURE__ */ jsxDEV("span", { children: "Loading simulation…" }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
    lineNumber: 69,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
    lineNumber: 68,
    columnNumber: 5
  }, this);
}
function dailyFocusRuntimeSlot(simulationId) {
  const Runtime = RUNTIME_COMPONENTS[simulationId];
  return /* @__PURE__ */ jsxDEV(DailyFocusRuntimeErrorBoundary, { simulationId, children: /* @__PURE__ */ jsxDEV(Suspense, { fallback: runtimeLoadingState(), children: /* @__PURE__ */ jsxDEV(Runtime, {}, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
    lineNumber: 79,
    columnNumber: 9
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
    lineNumber: 78,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx",
    lineNumber: 77,
    columnNumber: 5
  }, this);
}
export function getDailyFocusPureRuntime(routeId) {
  if (!hasDailyFocusRuntime(routeId)) return null;
  return dailyFocusRuntimeSlot(routeId);
}
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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QXFCd0MsT0FBTyxFQUFHLFFBQU87QUFDM0MsU0FBT0gsc0JBQXNCRyxPQUFPO0FBQ3RDIiwibmFtZXMiOlsiQ29tcG9uZW50IiwiU3VzcGVuc2UiLCJsYXp5IiwiREFJTFlfRk9DVVNfUlVOVElNRV9FWFBPUlRTIiwiaGFzRGFpbHlGb2N1c1J1bnRpbWUiLCJsb2FkRGFpbHlGb2N1c1J1bnRpbWVNb2R1bGUiLCJwdWJsaXNoRGFpbHlGb2N1c1J1bnRpbWVGYWlsdXJlIiwicmVxdWVzdERhaWx5Rm9jdXNSdW50aW1lRG9jdW1lbnRSZXRyeSIsImdldFNpbXVsYXRpb25MYXVuY2hUYXJnZXQiLCJjcmVhdGVMYXp5UnVudGltZSIsInNpbXVsYXRpb25JZCIsInRoZW4iLCJtb2R1bGUiLCJkZWZhdWx0IiwiUlVOVElNRV9DT01QT05FTlRTIiwiT2JqZWN0IiwiZnJlZXplIiwiRGFpbHlGb2N1c1J1bnRpbWVFcnJvckJvdW5kYXJ5IiwiY29uc3RydWN0b3IiLCJwcm9wcyIsInN0YXRlIiwiZXJyb3IiLCJnZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IiLCJjb21wb25lbnREaWRDYXRjaCIsInJlbmRlciIsInRhcmdldCIsInJldHJ5VXJsIiwiVVJMIiwiaHJlZiIsIndpbmRvdyIsImxvY2F0aW9uIiwib3JpZ2luIiwic2VhcmNoUGFyYW1zIiwic2V0IiwiU3RyaW5nIiwiRGF0ZSIsIm5vdyIsInJlcGxhY2UiLCJ0b1N0cmluZyIsImNoaWxkcmVuIiwicnVudGltZUxvYWRpbmdTdGF0ZSIsImRhaWx5Rm9jdXNSdW50aW1lU2xvdCIsIlJ1bnRpbWUiLCJnZXREYWlseUZvY3VzUHVyZVJ1bnRpbWUiLCJyb3V0ZUlkIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbImRhaWx5Rm9jdXNSdW50aW1lcy5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29tcG9uZW50LCBTdXNwZW5zZSwgbGF6eSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7XG4gIERBSUxZX0ZPQ1VTX1JVTlRJTUVfRVhQT1JUUyxcbiAgaGFzRGFpbHlGb2N1c1J1bnRpbWUsXG4gIGxvYWREYWlseUZvY3VzUnVudGltZU1vZHVsZSxcbiAgcHVibGlzaERhaWx5Rm9jdXNSdW50aW1lRmFpbHVyZSxcbiAgcmVxdWVzdERhaWx5Rm9jdXNSdW50aW1lRG9jdW1lbnRSZXRyeSxcbn0gZnJvbSAnLi9kYWlseUZvY3VzUnVudGltZUxvYWRlci5qcyc7XG5pbXBvcnQgeyBnZXRTaW11bGF0aW9uTGF1bmNoVGFyZ2V0IH0gZnJvbSAnLi4vLi4vZGF0YS9zaW11bGF0aW9uQ2F0YWxvZy5qcyc7XG5cbmZ1bmN0aW9uIGNyZWF0ZUxhenlSdW50aW1lKHNpbXVsYXRpb25JZCkge1xuICByZXR1cm4gbGF6eSgoKSA9PiBsb2FkRGFpbHlGb2N1c1J1bnRpbWVNb2R1bGUoc2ltdWxhdGlvbklkKS50aGVuKChtb2R1bGUpID0+ICh7XG4gICAgZGVmYXVsdDogbW9kdWxlW0RBSUxZX0ZPQ1VTX1JVTlRJTUVfRVhQT1JUU1tzaW11bGF0aW9uSWRdXSxcbiAgfSkpKTtcbn1cblxuY29uc3QgUlVOVElNRV9DT01QT05FTlRTID0gT2JqZWN0LmZyZWV6ZSh7XG4gICdiZWFjaC1iYWxsLXJvb20nOiBjcmVhdGVMYXp5UnVudGltZSgnYmVhY2gtYmFsbC1yb29tJyksXG4gICdyaWZ0LXJpbmdzJzogY3JlYXRlTGF6eVJ1bnRpbWUoJ3JpZnQtcmluZ3MnKSxcbiAgJ2Zsb2NrLW9mLWJpcmRzJzogY3JlYXRlTGF6eVJ1bnRpbWUoJ2Zsb2NrLW9mLWJpcmRzJyksXG4gICdtaW5lcmFsLWdyb3d0aCc6IGNyZWF0ZUxhenlSdW50aW1lKCdtaW5lcmFsLWdyb3d0aCcpLFxuICAncmVwZWwtcm9vbSc6IGNyZWF0ZUxhenlSdW50aW1lKCdyZXBlbC1yb29tJyksXG59KTtcblxuY2xhc3MgRGFpbHlGb2N1c1J1bnRpbWVFcnJvckJvdW5kYXJ5IGV4dGVuZHMgQ29tcG9uZW50IHtcbiAgY29uc3RydWN0b3IocHJvcHMpIHtcbiAgICBzdXBlcihwcm9wcyk7XG4gICAgdGhpcy5zdGF0ZSA9IHsgZXJyb3I6IG51bGwgfTtcbiAgfVxuXG4gIHN0YXRpYyBnZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IoZXJyb3IpIHtcbiAgICByZXR1cm4geyBlcnJvciB9O1xuICB9XG5cbiAgY29tcG9uZW50RGlkQ2F0Y2goZXJyb3IpIHtcbiAgICBwdWJsaXNoRGFpbHlGb2N1c1J1bnRpbWVGYWlsdXJlKHRoaXMucHJvcHMuc2ltdWxhdGlvbklkLCBlcnJvcik7XG4gIH1cblxuICByZW5kZXIoKSB7XG4gICAgaWYgKHRoaXMuc3RhdGUuZXJyb3IpIHtcbiAgICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZGFpbHktZm9jdXMtcnVudGltZS1zdGF0dXNcIiBkYXRhLXJ1bnRpbWUtc3RhdHVzPVwiZmFpbGVkXCIgcm9sZT1cInN0YXR1c1wiPlxuICAgICAgICAgIDxzcGFuPlNpbXVsYXRpb24gZmFpbGVkIHRvIGxvYWQuPC9zcGFuPlxuICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgICAgICAgb25DbGljaz17KCkgPT4ge1xuICAgICAgICAgICAgICAvLyBXZWJLaXQga2VlcHMgYSByZWplY3RlZCBkeW5hbWljLWltcG9ydCByZXN1bHQgaW4gaXRzIG1vZHVsZSBtYXAuXG4gICAgICAgICAgICAgIC8vIFJlLWVudGVyIHRocm91Z2ggdGhlIGF1dGhvcmVkIGxhdW5jaCBVUkwgYmVjYXVzZSB0aGUgdmlzaWJsZSBIb21lXG4gICAgICAgICAgICAgIC8vIFVSTCBoYXMgYWxyZWFkeSBiZWVuIGNhbm9uaWNhbGl6ZWQgYW5kIG5vIGxvbmdlciBjYXJyaWVzIHRoZSByb3V0ZS5cbiAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZ2V0U2ltdWxhdGlvbkxhdW5jaFRhcmdldCh0aGlzLnByb3BzLnNpbXVsYXRpb25JZCk7XG4gICAgICAgICAgICAgIGNvbnN0IHJldHJ5VXJsID0gbmV3IFVSTCh0YXJnZXQ/LmhyZWYgfHwgd2luZG93LmxvY2F0aW9uLmhyZWYsIHdpbmRvdy5sb2NhdGlvbi5vcmlnaW4pO1xuICAgICAgICAgICAgICByZXF1ZXN0RGFpbHlGb2N1c1J1bnRpbWVEb2N1bWVudFJldHJ5KHRoaXMucHJvcHMuc2ltdWxhdGlvbklkKTtcbiAgICAgICAgICAgICAgcmV0cnlVcmwuc2VhcmNoUGFyYW1zLnNldCgncnVudGltZVJldHJ5JywgU3RyaW5nKERhdGUubm93KCkpKTtcbiAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLnJlcGxhY2UocmV0cnlVcmwudG9TdHJpbmcoKSk7XG4gICAgICAgICAgICB9fVxuICAgICAgICAgID5cbiAgICAgICAgICAgIFJldHJ5XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMucHJvcHMuY2hpbGRyZW47XG4gIH1cbn1cblxuZnVuY3Rpb24gcnVudGltZUxvYWRpbmdTdGF0ZSgpIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImRhaWx5LWZvY3VzLXJ1bnRpbWUtc3RhdHVzXCIgZGF0YS1ydW50aW1lLXN0YXR1cz1cImxvYWRpbmdcIiByb2xlPVwic3RhdHVzXCI+XG4gICAgICA8c3Bhbj5Mb2FkaW5nIHNpbXVsYXRpb27igKY8L3NwYW4+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIGRhaWx5Rm9jdXNSdW50aW1lU2xvdChzaW11bGF0aW9uSWQpIHtcbiAgY29uc3QgUnVudGltZSA9IFJVTlRJTUVfQ09NUE9ORU5UU1tzaW11bGF0aW9uSWRdO1xuICByZXR1cm4gKFxuICAgIDxEYWlseUZvY3VzUnVudGltZUVycm9yQm91bmRhcnkgc2ltdWxhdGlvbklkPXtzaW11bGF0aW9uSWR9PlxuICAgICAgPFN1c3BlbnNlIGZhbGxiYWNrPXtydW50aW1lTG9hZGluZ1N0YXRlKCl9PlxuICAgICAgICA8UnVudGltZSAvPlxuICAgICAgPC9TdXNwZW5zZT5cbiAgICA8L0RhaWx5Rm9jdXNSdW50aW1lRXJyb3JCb3VuZGFyeT5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldERhaWx5Rm9jdXNQdXJlUnVudGltZShyb3V0ZUlkKSB7XG4gIGlmICghaGFzRGFpbHlGb2N1c1J1bnRpbWUocm91dGVJZCkpIHJldHVybiBudWxsO1xuICByZXR1cm4gZGFpbHlGb2N1c1J1bnRpbWVTbG90KHJvdXRlSWQpO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9kYWlseS1mb2N1cy9kYWlseUZvY3VzUnVudGltZXMuanN4In0=