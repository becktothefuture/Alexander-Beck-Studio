import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import { AboutNarrativePointWorld3D } from "/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx?t=1784280135025";
export const DEFAULT_ABOUT_NARRATIVE_WORLD = "three-point-world-v1";
function ThreePointWorld({ rootRef, interactionRef, disciplineOverlayRef, runtimeRef }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "about-narrative-world", "data-world-implementation": DEFAULT_ABOUT_NARRATIVE_WORLD, "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV(AboutNarrativePointWorld3D, { rootRef, interactionRef, disciplineOverlayRef, runtimeRef }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx",
    lineNumber: 8,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx",
    lineNumber: 7,
    columnNumber: 5
  }, this);
}
_c = ThreePointWorld;
export const ABOUT_NARRATIVE_WORLD_RENDERERS = Object.freeze({
  [DEFAULT_ABOUT_NARRATIVE_WORLD]: ThreePointWorld
});
export function AboutNarrativeWorld({
  rendererId = DEFAULT_ABOUT_NARRATIVE_WORLD,
  rootRef,
  interactionRef,
  disciplineOverlayRef,
  runtimeRef
}) {
  const Renderer = ABOUT_NARRATIVE_WORLD_RENDERERS[rendererId] || ABOUT_NARRATIVE_WORLD_RENDERERS[DEFAULT_ABOUT_NARRATIVE_WORLD];
  return /* @__PURE__ */ jsxDEV(Renderer, { rootRef, interactionRef, disciplineOverlayRef, runtimeRef }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx",
    lineNumber: 26,
    columnNumber: 10
  }, this);
}
_c2 = AboutNarrativeWorld;
var _c, _c2;
$RefreshReg$(_c, "ThreePointWorld");
$RefreshReg$(_c2, "AboutNarrativeWorld");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/about-narrative-lab/AboutNarrativeWorld.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBT007QUFQTixTQUFTQSxrQ0FBa0M7QUFFcEMsYUFBTUMsZ0NBQWdDO0FBRTdDLFNBQVNDLGdCQUFnQixFQUFFQyxTQUFTQyxnQkFBZ0JDLHNCQUFzQkMsV0FBVyxHQUFHO0FBQ3RGLFNBQ0UsdUJBQUMsU0FBSSxXQUFVLHlCQUF3Qiw2QkFBMkJMLCtCQUErQixlQUFZLFFBQzNHLGlDQUFDLDhCQUEyQixTQUFrQixnQkFBZ0Msc0JBQTRDLGNBQTFIO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FBaUosS0FEbko7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQUVBO0FBRUo7QUFBQ00sS0FOUUw7QUFRRixhQUFNTSxrQ0FBa0NDLE9BQU9DLE9BQU87QUFBQSxFQUMzRCxDQUFDVCw2QkFBNkIsR0FBR0M7QUFDbkMsQ0FBQztBQUVNLGdCQUFTUyxvQkFBb0I7QUFBQSxFQUNsQ0MsYUFBYVg7QUFBQUEsRUFDYkU7QUFBQUEsRUFDQUM7QUFBQUEsRUFDQUM7QUFBQUEsRUFDQUM7QUFDRixHQUFHO0FBQ0QsUUFBTU8sV0FBV0wsZ0NBQWdDSSxVQUFVLEtBQ3RESixnQ0FBZ0NQLDZCQUE2QjtBQUNsRSxTQUFPLHVCQUFDLFlBQVMsU0FBa0IsZ0JBQWdDLHNCQUE0QyxjQUF4RztBQUFBO0FBQUE7QUFBQTtBQUFBLFNBQStIO0FBQ3hJO0FBQUNhLE1BVmVIO0FBQW1CLElBQUFKLElBQUFPO0FBQUEsYUFBQVAsSUFBQTtBQUFBLGFBQUFPLEtBQUEiLCJuYW1lcyI6WyJBYm91dE5hcnJhdGl2ZVBvaW50V29ybGQzRCIsIkRFRkFVTFRfQUJPVVRfTkFSUkFUSVZFX1dPUkxEIiwiVGhyZWVQb2ludFdvcmxkIiwicm9vdFJlZiIsImludGVyYWN0aW9uUmVmIiwiZGlzY2lwbGluZU92ZXJsYXlSZWYiLCJydW50aW1lUmVmIiwiX2MiLCJBQk9VVF9OQVJSQVRJVkVfV09STERfUkVOREVSRVJTIiwiT2JqZWN0IiwiZnJlZXplIiwiQWJvdXROYXJyYXRpdmVXb3JsZCIsInJlbmRlcmVySWQiLCJSZW5kZXJlciIsIl9jMiJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBYm91dE5hcnJhdGl2ZVdvcmxkLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBYm91dE5hcnJhdGl2ZVBvaW50V29ybGQzRCB9IGZyb20gJy4vQWJvdXROYXJyYXRpdmVQb2ludFdvcmxkM0QuanN4JztcblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfQUJPVVRfTkFSUkFUSVZFX1dPUkxEID0gJ3RocmVlLXBvaW50LXdvcmxkLXYxJztcblxuZnVuY3Rpb24gVGhyZWVQb2ludFdvcmxkKHsgcm9vdFJlZiwgaW50ZXJhY3Rpb25SZWYsIGRpc2NpcGxpbmVPdmVybGF5UmVmLCBydW50aW1lUmVmIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cImFib3V0LW5hcnJhdGl2ZS13b3JsZFwiIGRhdGEtd29ybGQtaW1wbGVtZW50YXRpb249e0RFRkFVTFRfQUJPVVRfTkFSUkFUSVZFX1dPUkxEfSBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgIDxBYm91dE5hcnJhdGl2ZVBvaW50V29ybGQzRCByb290UmVmPXtyb290UmVmfSBpbnRlcmFjdGlvblJlZj17aW50ZXJhY3Rpb25SZWZ9IGRpc2NpcGxpbmVPdmVybGF5UmVmPXtkaXNjaXBsaW5lT3ZlcmxheVJlZn0gcnVudGltZVJlZj17cnVudGltZVJlZn0gLz5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGNvbnN0IEFCT1VUX05BUlJBVElWRV9XT1JMRF9SRU5ERVJFUlMgPSBPYmplY3QuZnJlZXplKHtcbiAgW0RFRkFVTFRfQUJPVVRfTkFSUkFUSVZFX1dPUkxEXTogVGhyZWVQb2ludFdvcmxkLFxufSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBBYm91dE5hcnJhdGl2ZVdvcmxkKHtcbiAgcmVuZGVyZXJJZCA9IERFRkFVTFRfQUJPVVRfTkFSUkFUSVZFX1dPUkxELFxuICByb290UmVmLFxuICBpbnRlcmFjdGlvblJlZixcbiAgZGlzY2lwbGluZU92ZXJsYXlSZWYsXG4gIHJ1bnRpbWVSZWYsXG59KSB7XG4gIGNvbnN0IFJlbmRlcmVyID0gQUJPVVRfTkFSUkFUSVZFX1dPUkxEX1JFTkRFUkVSU1tyZW5kZXJlcklkXVxuICAgIHx8IEFCT1VUX05BUlJBVElWRV9XT1JMRF9SRU5ERVJFUlNbREVGQVVMVF9BQk9VVF9OQVJSQVRJVkVfV09STERdO1xuICByZXR1cm4gPFJlbmRlcmVyIHJvb3RSZWY9e3Jvb3RSZWZ9IGludGVyYWN0aW9uUmVmPXtpbnRlcmFjdGlvblJlZn0gZGlzY2lwbGluZU92ZXJsYXlSZWY9e2Rpc2NpcGxpbmVPdmVybGF5UmVmfSBydW50aW1lUmVmPXtydW50aW1lUmVmfSAvPjtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvYWJvdXQtbmFycmF0aXZlLWxhYi9BYm91dE5hcnJhdGl2ZVdvcmxkLmpzeCJ9