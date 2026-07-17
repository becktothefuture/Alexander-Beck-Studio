import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/app/DevConfigPanelBridge.jsx");import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};var _s = $RefreshSig$();
import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport0_react["useEffect"];
export function DevConfigPanelBridge() {
  _s();
  useEffect(() => {
    if (!import.meta.env?.DEV) return void 0;
    let cancelled = false;
    import("/src/legacy/modules/ui/keyboard.js").then((mod) => {
      if (!cancelled) mod.setupKeyboardShortcuts?.();
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
_s(DevConfigPanelBridge, "OD7bBpZva5O2jO+Puf00hKivP7c=");
_c = DevConfigPanelBridge;
var _c;
$RefreshReg$(_c, "DevConfigPanelBridge");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/DevConfigPanelBridge.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/DevConfigPanelBridge.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/DevConfigPanelBridge.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IjtBQU1BLFNBQVNBLGlCQUFpQjtBQUVuQixnQkFBU0MsdUJBQXVCO0FBQUFDLEtBQUE7QUFDckNGLFlBQVUsTUFBTTtBQUNkLFFBQUksQ0FBQ0csWUFBWUMsS0FBS0MsSUFBSyxRQUFPQztBQUVsQyxRQUFJQyxZQUFZO0FBQ2hCLFdBQU8scUNBQXFDLEVBQUVDLEtBQUssQ0FBQ0MsUUFBUTtBQUMxRCxVQUFJLENBQUNGLFVBQVdFLEtBQUlDLHlCQUF5QjtBQUFBLElBQy9DLENBQUMsRUFBRUMsTUFBTSxNQUFNO0FBQUEsSUFBQyxDQUFDO0FBRWpCLFdBQU8sTUFBTTtBQUNYSixrQkFBWTtBQUFBLElBQ2Q7QUFBQSxFQUNGLEdBQUcsRUFBRTtBQUVMLFNBQU87QUFDVDtBQUFDTCxHQWZlRCxzQkFBb0I7QUFBQSxLQUFwQkE7QUFBb0IsSUFBQVc7QUFBQSxhQUFBQSxJQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwiRGV2Q29uZmlnUGFuZWxCcmlkZ2UiLCJfcyIsImltcG9ydCIsImVudiIsIkRFViIsInVuZGVmaW5lZCIsImNhbmNlbGxlZCIsInRoZW4iLCJtb2QiLCJzZXR1cEtleWJvYXJkU2hvcnRjdXRzIiwiY2F0Y2giLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJEZXZDb25maWdQYW5lbEJyaWRnZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiLy8g4pWU4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWXXG4vLyDilZEgREVWIENPTkZJRyBQQU5FTCBCUklER0UgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDilZFcbi8vIOKVkSBSZWFjdDogZGV2LW9ubHkgYHNldHVwS2V5Ym9hcmRTaG9ydGN1dHMoKWAgc28gYC9gIHdvcmtzIG9uIGV2ZXJ5IFNQQSByb3V0ZS4gIOKVkVxuLy8g4pWRIFRoZSBvbmx5IHNldHRpbmdzIFVJIGlzIGBwYW5lbC1kb2NrLmpzYCAoc2FtZSBkb2NrIG9uIGhvbWUvcG9ydGZvbGlvL0NWKS4gIOKVkVxuLy8g4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdXG5cbmltcG9ydCB7IHVzZUVmZmVjdCB9IGZyb20gJ3JlYWN0JztcblxuZXhwb3J0IGZ1bmN0aW9uIERldkNvbmZpZ1BhbmVsQnJpZGdlKCkge1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghaW1wb3J0Lm1ldGEuZW52Py5ERVYpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICBsZXQgY2FuY2VsbGVkID0gZmFsc2U7XG4gICAgaW1wb3J0KCcuLi8uLi9sZWdhY3kvbW9kdWxlcy91aS9rZXlib2FyZC5qcycpLnRoZW4oKG1vZCkgPT4ge1xuICAgICAgaWYgKCFjYW5jZWxsZWQpIG1vZC5zZXR1cEtleWJvYXJkU2hvcnRjdXRzPy4oKTtcbiAgICB9KS5jYXRjaCgoKSA9PiB7fSk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY2FuY2VsbGVkID0gdHJ1ZTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgcmV0dXJuIG51bGw7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvY29tcG9uZW50cy9hcHAvRGV2Q29uZmlnUGFuZWxCcmlkZ2UuanN4In0=