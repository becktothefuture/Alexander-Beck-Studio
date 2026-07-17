import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/app/ShellWindowOverlay.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
function dispatchWindowOverlayDismiss(event) {
  const target = event.target?.closest ? event.target : event.target?.parentElement;
  if (!target?.closest) return;
  if (target.closest("button, input, a, select, textarea")) return;
  const contentLayer = event.currentTarget;
  const modalHost = contentLayer.querySelector("#window-overlay-modal-host");
  const isDismissSurface = target === contentLayer || target === modalHost || target.classList.contains("simulation-focus-modal");
  if (isDismissSurface) {
    document.dispatchEvent(new CustomEvent("modal-overlay-dismiss", {
      detail: { instant: false }
    }));
  }
}
export function ShellWindowOverlay({ children }) {
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: "window-overlay-blur-layer",
        className: "window-overlay-layer window-overlay-blur-layer",
        "aria-hidden": "true"
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx",
        lineNumber: 22,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: "window-overlay-content-layer",
        className: "window-overlay-layer window-overlay-content-layer",
        onClick: dispatchWindowOverlayDismiss,
        children: /* @__PURE__ */ jsxDEV("div", { id: "window-overlay-modal-host", className: "window-overlay-modal-host", children }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx",
          lineNumber: 32,
          columnNumber: 9
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx",
        lineNumber: 27,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx",
    lineNumber: 21,
    columnNumber: 5
  }, this);
}
_c = ShellWindowOverlay;
var _c;
$RefreshReg$(_c, "ShellWindowOverlay");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellWindowOverlay.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBb0JJLG1CQUNFLGNBREY7QUFwQkosU0FBU0EsNkJBQTZCQyxPQUFPO0FBQzNDLFFBQU1DLFNBQVNELE1BQU1DLFFBQVFDLFVBQVVGLE1BQU1DLFNBQVNELE1BQU1DLFFBQVFFO0FBQ3BFLE1BQUksQ0FBQ0YsUUFBUUMsUUFBUztBQUN0QixNQUFJRCxPQUFPQyxRQUFRLG9DQUFvQyxFQUFHO0FBRTFELFFBQU1FLGVBQWVKLE1BQU1LO0FBQzNCLFFBQU1DLFlBQVlGLGFBQWFHLGNBQWMsNEJBQTRCO0FBQ3pFLFFBQU1DLG1CQUFtQlAsV0FBV0csZ0JBQy9CSCxXQUFXSyxhQUNYTCxPQUFPUSxVQUFVQyxTQUFTLHdCQUF3QjtBQUV2RCxNQUFJRixrQkFBa0I7QUFDcEJHLGFBQVNDLGNBQWMsSUFBSUMsWUFBWSx5QkFBeUI7QUFBQSxNQUM5REMsUUFBUSxFQUFFQyxTQUFTLE1BQU07QUFBQSxJQUMzQixDQUFDLENBQUM7QUFBQSxFQUNKO0FBQ0Y7QUFFTyxnQkFBU0MsbUJBQW1CLEVBQUVDLFNBQVMsR0FBRztBQUMvQyxTQUNFLG1DQUNFO0FBQUE7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLElBQUc7QUFBQSxRQUNILFdBQVU7QUFBQSxRQUNWLGVBQVk7QUFBQTtBQUFBLE1BSGQ7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBR29CO0FBQUEsSUFFcEI7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUNDLElBQUc7QUFBQSxRQUNILFdBQVU7QUFBQSxRQUNWLFNBQVNsQjtBQUFBQSxRQUVULGlDQUFDLFNBQUksSUFBRyw2QkFBNEIsV0FBVSw2QkFDM0NrQixZQURIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQTtBQUFBO0FBQUEsTUFQRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFRQTtBQUFBLE9BZEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWVBO0FBRUo7QUFBQ0MsS0FuQmVGO0FBQWtCLElBQUFFO0FBQUEsYUFBQUEsSUFBQSIsIm5hbWVzIjpbImRpc3BhdGNoV2luZG93T3ZlcmxheURpc21pc3MiLCJldmVudCIsInRhcmdldCIsImNsb3Nlc3QiLCJwYXJlbnRFbGVtZW50IiwiY29udGVudExheWVyIiwiY3VycmVudFRhcmdldCIsIm1vZGFsSG9zdCIsInF1ZXJ5U2VsZWN0b3IiLCJpc0Rpc21pc3NTdXJmYWNlIiwiY2xhc3NMaXN0IiwiY29udGFpbnMiLCJkb2N1bWVudCIsImRpc3BhdGNoRXZlbnQiLCJDdXN0b21FdmVudCIsImRldGFpbCIsImluc3RhbnQiLCJTaGVsbFdpbmRvd092ZXJsYXkiLCJjaGlsZHJlbiIsIl9jIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlNoZWxsV2luZG93T3ZlcmxheS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiZnVuY3Rpb24gZGlzcGF0Y2hXaW5kb3dPdmVybGF5RGlzbWlzcyhldmVudCkge1xuICBjb25zdCB0YXJnZXQgPSBldmVudC50YXJnZXQ/LmNsb3Nlc3QgPyBldmVudC50YXJnZXQgOiBldmVudC50YXJnZXQ/LnBhcmVudEVsZW1lbnQ7XG4gIGlmICghdGFyZ2V0Py5jbG9zZXN0KSByZXR1cm47XG4gIGlmICh0YXJnZXQuY2xvc2VzdCgnYnV0dG9uLCBpbnB1dCwgYSwgc2VsZWN0LCB0ZXh0YXJlYScpKSByZXR1cm47XG5cbiAgY29uc3QgY29udGVudExheWVyID0gZXZlbnQuY3VycmVudFRhcmdldDtcbiAgY29uc3QgbW9kYWxIb3N0ID0gY29udGVudExheWVyLnF1ZXJ5U2VsZWN0b3IoJyN3aW5kb3ctb3ZlcmxheS1tb2RhbC1ob3N0Jyk7XG4gIGNvbnN0IGlzRGlzbWlzc1N1cmZhY2UgPSB0YXJnZXQgPT09IGNvbnRlbnRMYXllclxuICAgIHx8IHRhcmdldCA9PT0gbW9kYWxIb3N0XG4gICAgfHwgdGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnc2ltdWxhdGlvbi1mb2N1cy1tb2RhbCcpO1xuXG4gIGlmIChpc0Rpc21pc3NTdXJmYWNlKSB7XG4gICAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ21vZGFsLW92ZXJsYXktZGlzbWlzcycsIHtcbiAgICAgIGRldGFpbDogeyBpbnN0YW50OiBmYWxzZSB9LFxuICAgIH0pKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gU2hlbGxXaW5kb3dPdmVybGF5KHsgY2hpbGRyZW4gfSkge1xuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8ZGl2XG4gICAgICAgIGlkPVwid2luZG93LW92ZXJsYXktYmx1ci1sYXllclwiXG4gICAgICAgIGNsYXNzTmFtZT1cIndpbmRvdy1vdmVybGF5LWxheWVyIHdpbmRvdy1vdmVybGF5LWJsdXItbGF5ZXJcIlxuICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgLz5cbiAgICAgIDxkaXZcbiAgICAgICAgaWQ9XCJ3aW5kb3ctb3ZlcmxheS1jb250ZW50LWxheWVyXCJcbiAgICAgICAgY2xhc3NOYW1lPVwid2luZG93LW92ZXJsYXktbGF5ZXIgd2luZG93LW92ZXJsYXktY29udGVudC1sYXllclwiXG4gICAgICAgIG9uQ2xpY2s9e2Rpc3BhdGNoV2luZG93T3ZlcmxheURpc21pc3N9XG4gICAgICA+XG4gICAgICAgIDxkaXYgaWQ9XCJ3aW5kb3ctb3ZlcmxheS1tb2RhbC1ob3N0XCIgY2xhc3NOYW1lPVwid2luZG93LW92ZXJsYXktbW9kYWwtaG9zdFwiPlxuICAgICAgICAgIHtjaGlsZHJlbn1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8Lz5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9jb21wb25lbnRzL2FwcC9TaGVsbFdpbmRvd092ZXJsYXkuanN4In0=