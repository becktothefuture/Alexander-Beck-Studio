import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/layout/BodyClassManager.jsx");var _s = $RefreshSig$();
import __vite__cjsImport0_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useLayoutEffect = __vite__cjsImport0_react["useLayoutEffect"];
import {
  THEME_ATTR,
  THEME_DARK_CLASS,
  isDarkThemeDocument,
  mergeBodyClassWithTheme
} from "/src/lib/theme-state.js";
function splitClasses(className = "") {
  return String(className).split(/\s+/).map((name) => name.trim()).filter(Boolean);
}
export function BodyClassManager({ className = "", htmlClassName = "", routeId = "" }) {
  _s();
  useLayoutEffect(() => {
    const original = splitClasses(document.body.className).filter((name) => name !== THEME_DARK_CLASS).join(" ");
    const originalRouteId = document.documentElement.dataset.shellRoute;
    const htmlClasses = splitClasses(htmlClassName);
    const theme = isDarkThemeDocument() ? "dark" : "light";
    document.body.className = mergeBodyClassWithTheme(className);
    document.body.setAttribute(THEME_ATTR, theme);
    if (routeId) document.documentElement.dataset.shellRoute = routeId;
    htmlClasses.forEach((name) => document.documentElement.classList.add(name));
    return () => {
      const restoredTheme = isDarkThemeDocument() ? "dark" : "light";
      document.body.className = mergeBodyClassWithTheme(original);
      document.body.setAttribute(THEME_ATTR, restoredTheme);
      if (originalRouteId) document.documentElement.dataset.shellRoute = originalRouteId;
      else
        delete document.documentElement.dataset.shellRoute;
      htmlClasses.forEach((name) => document.documentElement.classList.remove(name));
    };
  }, [className, htmlClassName, routeId]);
  return null;
}
_s(BodyClassManager, "n7/vCynhJvM+pLkyL2DMQUF0odM=");
_c = BodyClassManager;
var _c;
$RefreshReg$(_c, "BodyClassManager");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/layout/BodyClassManager.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/layout/BodyClassManager.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/layout/BodyClassManager.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IjtBQUFBLFNBQVNBLHVCQUF1QjtBQUNoQztBQUFBLEVBQ0VDO0FBQUFBLEVBQ0FDO0FBQUFBLEVBQ0FDO0FBQUFBLEVBQ0FDO0FBQUFBLE9BQ0s7QUFFUCxTQUFTQyxhQUFhQyxZQUFZLElBQUk7QUFDcEMsU0FBT0MsT0FBT0QsU0FBUyxFQUFFRSxNQUFNLEtBQUssRUFBRUMsSUFBSSxDQUFDQyxTQUFTQSxLQUFLQyxLQUFLLENBQUMsRUFBRUMsT0FBT0MsT0FBTztBQUNqRjtBQUVPLGdCQUFTQyxpQkFBaUIsRUFBRVIsWUFBWSxJQUFJUyxnQkFBZ0IsSUFBSUMsVUFBVSxHQUFHLEdBQUc7QUFBQUMsS0FBQTtBQUNyRmpCLGtCQUFnQixNQUFNO0FBQ3BCLFVBQU1rQixXQUFXYixhQUFhYyxTQUFTQyxLQUFLZCxTQUFTLEVBQ2xETSxPQUFPLENBQUNGLFNBQVNBLFNBQVNSLGdCQUFnQixFQUMxQ21CLEtBQUssR0FBRztBQUNYLFVBQU1DLGtCQUFrQkgsU0FBU0ksZ0JBQWdCQyxRQUFRQztBQUN6RCxVQUFNQyxjQUFjckIsYUFBYVUsYUFBYTtBQUM5QyxVQUFNWSxRQUFReEIsb0JBQW9CLElBQUksU0FBUztBQUUvQ2dCLGFBQVNDLEtBQUtkLFlBQVlGLHdCQUF3QkUsU0FBUztBQUMzRGEsYUFBU0MsS0FBS1EsYUFBYTNCLFlBQVkwQixLQUFLO0FBQzVDLFFBQUlYLFFBQVNHLFVBQVNJLGdCQUFnQkMsUUFBUUMsYUFBYVQ7QUFDM0RVLGdCQUFZRyxRQUFRLENBQUNuQixTQUFTUyxTQUFTSSxnQkFBZ0JPLFVBQVVDLElBQUlyQixJQUFJLENBQUM7QUFFMUUsV0FBTyxNQUFNO0FBQ1gsWUFBTXNCLGdCQUFnQjdCLG9CQUFvQixJQUFJLFNBQVM7QUFDdkRnQixlQUFTQyxLQUFLZCxZQUFZRix3QkFBd0JjLFFBQVE7QUFDMURDLGVBQVNDLEtBQUtRLGFBQWEzQixZQUFZK0IsYUFBYTtBQUNwRCxVQUFJVixnQkFBaUJILFVBQVNJLGdCQUFnQkMsUUFBUUMsYUFBYUg7QUFBQUE7QUFDOUQsZUFBT0gsU0FBU0ksZ0JBQWdCQyxRQUFRQztBQUM3Q0Msa0JBQVlHLFFBQVEsQ0FBQ25CLFNBQVNTLFNBQVNJLGdCQUFnQk8sVUFBVUcsT0FBT3ZCLElBQUksQ0FBQztBQUFBLElBQy9FO0FBQUEsRUFDRixHQUFHLENBQUNKLFdBQVdTLGVBQWVDLE9BQU8sQ0FBQztBQUV0QyxTQUFPO0FBQ1Q7QUFBQ0MsR0F6QmVILGtCQUFnQjtBQUFBLEtBQWhCQTtBQUFnQixJQUFBb0I7QUFBQSxhQUFBQSxJQUFBIiwibmFtZXMiOlsidXNlTGF5b3V0RWZmZWN0IiwiVEhFTUVfQVRUUiIsIlRIRU1FX0RBUktfQ0xBU1MiLCJpc0RhcmtUaGVtZURvY3VtZW50IiwibWVyZ2VCb2R5Q2xhc3NXaXRoVGhlbWUiLCJzcGxpdENsYXNzZXMiLCJjbGFzc05hbWUiLCJTdHJpbmciLCJzcGxpdCIsIm1hcCIsIm5hbWUiLCJ0cmltIiwiZmlsdGVyIiwiQm9vbGVhbiIsIkJvZHlDbGFzc01hbmFnZXIiLCJodG1sQ2xhc3NOYW1lIiwicm91dGVJZCIsIl9zIiwib3JpZ2luYWwiLCJkb2N1bWVudCIsImJvZHkiLCJqb2luIiwib3JpZ2luYWxSb3V0ZUlkIiwiZG9jdW1lbnRFbGVtZW50IiwiZGF0YXNldCIsInNoZWxsUm91dGUiLCJodG1sQ2xhc3NlcyIsInRoZW1lIiwic2V0QXR0cmlidXRlIiwiZm9yRWFjaCIsImNsYXNzTGlzdCIsImFkZCIsInJlc3RvcmVkVGhlbWUiLCJyZW1vdmUiLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJCb2R5Q2xhc3NNYW5hZ2VyLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQge1xuICBUSEVNRV9BVFRSLFxuICBUSEVNRV9EQVJLX0NMQVNTLFxuICBpc0RhcmtUaGVtZURvY3VtZW50LFxuICBtZXJnZUJvZHlDbGFzc1dpdGhUaGVtZSxcbn0gZnJvbSAnLi4vLi4vbGliL3RoZW1lLXN0YXRlLmpzJztcblxuZnVuY3Rpb24gc3BsaXRDbGFzc2VzKGNsYXNzTmFtZSA9ICcnKSB7XG4gIHJldHVybiBTdHJpbmcoY2xhc3NOYW1lKS5zcGxpdCgvXFxzKy8pLm1hcCgobmFtZSkgPT4gbmFtZS50cmltKCkpLmZpbHRlcihCb29sZWFuKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIEJvZHlDbGFzc01hbmFnZXIoeyBjbGFzc05hbWUgPSAnJywgaHRtbENsYXNzTmFtZSA9ICcnLCByb3V0ZUlkID0gJycgfSkge1xuICB1c2VMYXlvdXRFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IG9yaWdpbmFsID0gc3BsaXRDbGFzc2VzKGRvY3VtZW50LmJvZHkuY2xhc3NOYW1lKVxuICAgICAgLmZpbHRlcigobmFtZSkgPT4gbmFtZSAhPT0gVEhFTUVfREFSS19DTEFTUylcbiAgICAgIC5qb2luKCcgJyk7XG4gICAgY29uc3Qgb3JpZ2luYWxSb3V0ZUlkID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuc2hlbGxSb3V0ZTtcbiAgICBjb25zdCBodG1sQ2xhc3NlcyA9IHNwbGl0Q2xhc3NlcyhodG1sQ2xhc3NOYW1lKTtcbiAgICBjb25zdCB0aGVtZSA9IGlzRGFya1RoZW1lRG9jdW1lbnQoKSA/ICdkYXJrJyA6ICdsaWdodCc7XG5cbiAgICBkb2N1bWVudC5ib2R5LmNsYXNzTmFtZSA9IG1lcmdlQm9keUNsYXNzV2l0aFRoZW1lKGNsYXNzTmFtZSk7XG4gICAgZG9jdW1lbnQuYm9keS5zZXRBdHRyaWJ1dGUoVEhFTUVfQVRUUiwgdGhlbWUpO1xuICAgIGlmIChyb3V0ZUlkKSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuZGF0YXNldC5zaGVsbFJvdXRlID0gcm91dGVJZDtcbiAgICBodG1sQ2xhc3Nlcy5mb3JFYWNoKChuYW1lKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LmFkZChuYW1lKSk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdG9yZWRUaGVtZSA9IGlzRGFya1RoZW1lRG9jdW1lbnQoKSA/ICdkYXJrJyA6ICdsaWdodCc7XG4gICAgICBkb2N1bWVudC5ib2R5LmNsYXNzTmFtZSA9IG1lcmdlQm9keUNsYXNzV2l0aFRoZW1lKG9yaWdpbmFsKTtcbiAgICAgIGRvY3VtZW50LmJvZHkuc2V0QXR0cmlidXRlKFRIRU1FX0FUVFIsIHJlc3RvcmVkVGhlbWUpO1xuICAgICAgaWYgKG9yaWdpbmFsUm91dGVJZCkgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuc2hlbGxSb3V0ZSA9IG9yaWdpbmFsUm91dGVJZDtcbiAgICAgIGVsc2UgZGVsZXRlIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LnNoZWxsUm91dGU7XG4gICAgICBodG1sQ2xhc3Nlcy5mb3JFYWNoKChuYW1lKSA9PiBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShuYW1lKSk7XG4gICAgfTtcbiAgfSwgW2NsYXNzTmFtZSwgaHRtbENsYXNzTmFtZSwgcm91dGVJZF0pO1xuXG4gIHJldHVybiBudWxsO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL2NvbXBvbmVudHMvbGF5b3V0L0JvZHlDbGFzc01hbmFnZXIuanN4In0=