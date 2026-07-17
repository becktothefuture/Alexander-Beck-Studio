import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/app/StudioShell.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useLayoutEffect = __vite__cjsImport1_react["useLayoutEffect"];
import { SiteFooter } from "/src/components/SiteFooter.jsx";
import { ShellButtonBar } from "/src/components/app/ShellButtonBar.jsx";
import { ShellWindowOverlay } from "/src/components/app/ShellWindowOverlay.jsx";
import { trySpaNavigate } from "/src/lib/spa-navigation.js";
function disposeRouteDepthTitleCanvas() {
  if (typeof document === "undefined") return;
  document.getElementById("simulation-front-depth-canvas")?.remove();
  document.getElementById("simulations")?.classList?.remove("simulation-depth-title-layer-active");
}
function RouteSceneMount({ routeRenderKey, children }) {
  switch (routeRenderKey) {
    case "portfolio":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/portfolio", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 17,
        columnNumber: 14
      }, this);
    case "contact":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/contact", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 19,
        columnNumber: 14
      }, this);
    case "about":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/about", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 21,
        columnNumber: 14
      }, this);
    case "about-narrative-lab":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/about-narrative-lab", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 23,
        columnNumber: 14
      }, this);
    case "styleguide":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/styleguide", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 25,
        columnNumber: 14
      }, this);
    case "simulations":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/simulations", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 27,
        columnNumber: 14
      }, this);
    case "palette-lab":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/palette-lab", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 29,
        columnNumber: 14
      }, this);
    case "beach-ball-room":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/beach-ball-room", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 31,
        columnNumber: 14
      }, this);
    case "flock-of-birds":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/flock-of-birds", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 33,
        columnNumber: 14
      }, this);
    case "repel-room":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/repel-room", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 35,
        columnNumber: 14
      }, this);
    case "mineral-growth":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/mineral-growth", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 37,
        columnNumber: 14
      }, this);
    case "aperture-bloom":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/aperture-bloom", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 39,
        columnNumber: 14
      }, this);
    case "confluence-bridges":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/confluence-bridges", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 41,
        columnNumber: 14
      }, this);
    case "napoleon-point-cloud":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/napoleon-point-cloud", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 43,
        columnNumber: 14
      }, this);
    case "spatial-scan":
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/spatial-scan", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 45,
        columnNumber: 14
      }, this);
    case "home":
    default:
      return /* @__PURE__ */ jsxDEV("div", { "data-sfid": "sfid:shell/home", children }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 48,
        columnNumber: 14
      }, this);
  }
}
_c = RouteSceneMount;
function normalizeRouteUiLayer(uiLayer, headerContent, mainContent) {
  const isStructuredLayer = uiLayer && typeof uiLayer === "object" && !Array.isArray(uiLayer) && (Object.prototype.hasOwnProperty.call(uiLayer, "chrome") || Object.prototype.hasOwnProperty.call(uiLayer, "secondary"));
  if (isStructuredLayer) {
    return {
      chrome: uiLayer.chrome ?? null,
      secondary: uiLayer.secondary ?? null
    };
  }
  if (uiLayer !== void 0) {
    return {
      chrome: uiLayer,
      secondary: null
    };
  }
  return {
    chrome: headerContent,
    secondary: mainContent
  };
}
export function StudioShell({
  activeRouteId,
  routeRenderKey,
  contentRenderKey = routeRenderKey,
  studioWindowClassName,
  wallClassName,
  simulationLayer,
  studioWindowContent,
  wallContent,
  heroLayer,
  uiLayer,
  headerContent,
  mainContent,
  heroTitle,
  footerVariant = "standard",
  windowOverlayContent,
  simulationFocusControls,
  simulationFocusModal,
  surfaceRefs
}) {
  _s();
  const routeWindowClassName = studioWindowClassName ?? wallClassName;
  const windowLayerClassName = ["studio-window-layer", "simulation-wall-layer", routeWindowClassName].filter(Boolean).join(" ");
  const routeSimulationLayer = simulationLayer ?? studioWindowContent ?? wallContent;
  const routeHeroLayer = heroLayer ?? heroTitle;
  const routeUiLayer = normalizeRouteUiLayer(uiLayer, headerContent, mainContent);
  useLayoutEffect(() => {
    if (routeRenderKey === "home") return void 0;
    let firstFrame = 0;
    let secondFrame = 0;
    disposeRouteDepthTitleCanvas();
    firstFrame = window.requestAnimationFrame(() => {
      disposeRouteDepthTitleCanvas();
      secondFrame = window.requestAnimationFrame(disposeRouteDepthTitleCanvas);
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [routeRenderKey]);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(RouteSceneMount, { routeRenderKey, children: /* @__PURE__ */ jsxDEV("div", { id: "abs-scene", className: "app-scene abs-scene", children: [
      /* @__PURE__ */ jsxDEV("div", { id: "simulations", className: windowLayerClassName, children: [
        /* @__PURE__ */ jsxDEV("div", { id: "scene-effects", className: "scene-effects", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("div", { className: "noise" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 132,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 131,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "inner-wall-gradient-edge", "aria-hidden": "true" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 134,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            id: "shell-wall-slot",
            ref: surfaceRefs?.wall,
            className: "studio-window-slot shell-wall-slot shell-transition-surface shell-transition-surface--wall",
            children: /* @__PURE__ */ jsxDEV("div", { className: "studio-window-route-root shell-wall-route-root route-simulation-layer", children: routeSimulationLayer }, `window-${routeRenderKey}`, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
              lineNumber: 140,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
            lineNumber: 135,
            columnNumber: 13
          },
          this
        ),
        /* @__PURE__ */ jsxDEV(
          "div",
          {
            id: "shell-hero-slot",
            ref: surfaceRefs?.hero,
            className: "shell-hero-slot shell-transition-surface shell-transition-surface--hero",
            children: /* @__PURE__ */ jsxDEV("div", { className: "shell-hero-surface", children: routeHeroLayer }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
              lineNumber: 149,
              columnNumber: 15
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
            lineNumber: 144,
            columnNumber: 13
          },
          this
        ),
        simulationFocusControls
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 130,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "frame-vignette", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 155,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "simulation-contrast-veil", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 156,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          ref: surfaceRefs?.ui,
          className: "fade-content page-content ui-layer",
          children: /* @__PURE__ */ jsxDEV("div", { id: "app-frame", className: "ui-layer-wrapper", children: [
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                id: "shell-route-slot",
                className: "shell-route-slot",
                children: /* @__PURE__ */ jsxDEV("div", { className: "shell-route-content-root route-ui-layer", children: [
                  /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      ref: surfaceRefs?.chrome,
                      className: "shell-transition-surface shell-transition-surface--chrome",
                      children: routeUiLayer.chrome
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
                      lineNumber: 168,
                      columnNumber: 21
                    },
                    this
                  ),
                  /* @__PURE__ */ jsxDEV(
                    "div",
                    {
                      ref: surfaceRefs?.secondary,
                      className: "shell-transition-surface shell-transition-surface--secondary",
                      children: routeUiLayer.secondary
                    },
                    void 0,
                    false,
                    {
                      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
                      lineNumber: 174,
                      columnNumber: 21
                    },
                    this
                  )
                ] }, `content-${contentRenderKey}`, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
                  lineNumber: 167,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
                lineNumber: 163,
                columnNumber: 17
              },
              this
            ),
            /* @__PURE__ */ jsxDEV(
              "div",
              {
                ref: surfaceRefs?.footer,
                className: "shell-transition-surface shell-transition-surface--footer",
                children: /* @__PURE__ */ jsxDEV(SiteFooter, { variant: footerVariant }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
                  lineNumber: 186,
                  columnNumber: 19
                }, this)
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
                lineNumber: 182,
                columnNumber: 17
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
            lineNumber: 162,
            columnNumber: 13
          }, this)
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 158,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(ShellWindowOverlay, { children: windowOverlayContent ?? simulationFocusModal }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 190,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        ShellButtonBar,
        {
          activeRouteId: activeRouteId || routeRenderKey,
          materialVariant: "dominant-tab",
          onRouteNavigate: (href, tab, options) => trySpaNavigate(href, options)
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 193,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          id: "portfolio-sheet-host",
          className: "portfolio-sheet-host",
          "aria-hidden": "true"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 199,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          id: "quote-viewport-host",
          className: "quote-viewport-host",
          "aria-hidden": "true"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
          lineNumber: 205,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
      lineNumber: 129,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
      lineNumber: 128,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: "shell-persistent-route-ui-host",
        className: "shell-persistent-route-ui-host"
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
        lineNumber: 213,
        columnNumber: 7
      },
      this
    ),
    /* @__PURE__ */ jsxDEV("div", { id: "modal-blur-layer", className: "modal-layer modal-blur-layer", "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
      lineNumber: 218,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { id: "modal-content-layer", className: "modal-layer modal-content-layer", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("div", { id: "modal-modal-host", className: "modal-modal-host" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
      lineNumber: 221,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
      lineNumber: 220,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx",
    lineNumber: 127,
    columnNumber: 5
  }, this);
}
_s(StudioShell, "n7/vCynhJvM+pLkyL2DMQUF0odM=");
_c2 = StudioShell;
var _c, _c2;
$RefreshReg$(_c, "RouteSceneMount");
$RefreshReg$(_c2, "StudioShell");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/StudioShell.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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RztBQUFBLFFBQ0gsV0FBVTtBQUFBO0FBQUEsTUFGWjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFFNEM7QUFBQSxJQUc1Qyx1QkFBQyxTQUFJLElBQUcsb0JBQW1CLFdBQVUsZ0NBQStCLGVBQVksVUFBaEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFzRjtBQUFBLElBRXRGLHVCQUFDLFNBQUksSUFBRyx1QkFBc0IsV0FBVSxtQ0FBa0MsZUFBWSxRQUNwRixpQ0FBQyxTQUFJLElBQUcsb0JBQW1CLFdBQVUsc0JBQXJDO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBdUQsS0FEekQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUVBO0FBQUEsT0EvRkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQWdHQTtBQUVKO0FBQUNwQixHQWhKZWYsYUFBVztBQUFBLE1BQVhBO0FBQVcsSUFBQWYsSUFBQW1EO0FBQUEsYUFBQW5ELElBQUE7QUFBQSxhQUFBbUQsS0FBQSIsIm5hbWVzIjpbInVzZUxheW91dEVmZmVjdCIsIlNpdGVGb290ZXIiLCJTaGVsbEJ1dHRvbkJhciIsIlNoZWxsV2luZG93T3ZlcmxheSIsInRyeVNwYU5hdmlnYXRlIiwiZGlzcG9zZVJvdXRlRGVwdGhUaXRsZUNhbnZhcyIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJyZW1vdmUiLCJjbGFzc0xpc3QiLCJSb3V0ZVNjZW5lTW91bnQiLCJyb3V0ZVJlbmRlcktleSIsImNoaWxkcmVuIiwiX2MiLCJub3JtYWxpemVSb3V0ZVVpTGF5ZXIiLCJ1aUxheWVyIiwiaGVhZGVyQ29udGVudCIsIm1haW5Db250ZW50IiwiaXNTdHJ1Y3R1cmVkTGF5ZXIiLCJBcnJheSIsImlzQXJyYXkiLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJjaHJvbWUiLCJzZWNvbmRhcnkiLCJ1bmRlZmluZWQiLCJTdHVkaW9TaGVsbCIsImFjdGl2ZVJvdXRlSWQiLCJjb250ZW50UmVuZGVyS2V5Iiwic3R1ZGlvV2luZG93Q2xhc3NOYW1lIiwid2FsbENsYXNzTmFtZSIsInNpbXVsYXRpb25MYXllciIsInN0dWRpb1dpbmRvd0NvbnRlbnQiLCJ3YWxsQ29udGVudCIsImhlcm9MYXllciIsImhlcm9UaXRsZSIsImZvb3RlclZhcmlhbnQiLCJ3aW5kb3dPdmVybGF5Q29udGVudCIsInNpbXVsYXRpb25Gb2N1c0NvbnRyb2xzIiwic2ltdWxhdGlvbkZvY3VzTW9kYWwiLCJzdXJmYWNlUmVmcyIsIl9zIiwicm91dGVXaW5kb3dDbGFzc05hbWUiLCJ3aW5kb3dMYXllckNsYXNzTmFtZSIsImZpbHRlciIsIkJvb2xlYW4iLCJqb2luIiwicm91dGVTaW11bGF0aW9uTGF5ZXIiLCJyb3V0ZUhlcm9MYXllciIsInJvdXRlVWlMYXllciIsImZpcnN0RnJhbWUiLCJzZWNvbmRGcmFtZSIsIndpbmRvdyIsInJlcXVlc3RBbmltYXRpb25GcmFtZSIsImNhbmNlbEFuaW1hdGlvbkZyYW1lIiwid2FsbCIsImhlcm8iLCJ1aSIsImZvb3RlciIsImhyZWYiLCJ0YWIiLCJvcHRpb25zIiwiX2MyIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlN0dWRpb1NoZWxsLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VMYXlvdXRFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5cbmltcG9ydCB7IFNpdGVGb290ZXIgfSBmcm9tICcuLi9TaXRlRm9vdGVyLmpzeCc7XG5pbXBvcnQgeyBTaGVsbEJ1dHRvbkJhciB9IGZyb20gJy4vU2hlbGxCdXR0b25CYXIuanN4JztcbmltcG9ydCB7IFNoZWxsV2luZG93T3ZlcmxheSB9IGZyb20gJy4vU2hlbGxXaW5kb3dPdmVybGF5LmpzeCc7XG5pbXBvcnQgeyB0cnlTcGFOYXZpZ2F0ZSB9IGZyb20gJy4uLy4uL2xpYi9zcGEtbmF2aWdhdGlvbi5qcyc7XG5cbmZ1bmN0aW9uIGRpc3Bvc2VSb3V0ZURlcHRoVGl0bGVDYW52YXMoKSB7XG4gIGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSByZXR1cm47XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaW11bGF0aW9uLWZyb250LWRlcHRoLWNhbnZhcycpPy5yZW1vdmUoKTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NpbXVsYXRpb25zJyk/LmNsYXNzTGlzdD8ucmVtb3ZlKCdzaW11bGF0aW9uLWRlcHRoLXRpdGxlLWxheWVyLWFjdGl2ZScpO1xufVxuXG5mdW5jdGlvbiBSb3V0ZVNjZW5lTW91bnQoeyByb3V0ZVJlbmRlcktleSwgY2hpbGRyZW4gfSkge1xuICBzd2l0Y2ggKHJvdXRlUmVuZGVyS2V5KSB7XG4gICAgY2FzZSAncG9ydGZvbGlvJzpcbiAgICAgIHJldHVybiA8ZGl2IGRhdGEtc2ZpZD1cInNmaWQ6c2hlbGwvcG9ydGZvbGlvXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdjb250YWN0JzpcbiAgICAgIHJldHVybiA8ZGl2IGRhdGEtc2ZpZD1cInNmaWQ6c2hlbGwvY29udGFjdFwiPntjaGlsZHJlbn08L2Rpdj47XG4gICAgY2FzZSAnYWJvdXQnOlxuICAgICAgcmV0dXJuIDxkaXYgZGF0YS1zZmlkPVwic2ZpZDpzaGVsbC9hYm91dFwiPntjaGlsZHJlbn08L2Rpdj47XG4gICAgY2FzZSAnYWJvdXQtbmFycmF0aXZlLWxhYic6XG4gICAgICByZXR1cm4gPGRpdiBkYXRhLXNmaWQ9XCJzZmlkOnNoZWxsL2Fib3V0LW5hcnJhdGl2ZS1sYWJcIj57Y2hpbGRyZW59PC9kaXY+O1xuICAgIGNhc2UgJ3N0eWxlZ3VpZGUnOlxuICAgICAgcmV0dXJuIDxkaXYgZGF0YS1zZmlkPVwic2ZpZDpzaGVsbC9zdHlsZWd1aWRlXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdzaW11bGF0aW9ucyc6XG4gICAgICByZXR1cm4gPGRpdiBkYXRhLXNmaWQ9XCJzZmlkOnNoZWxsL3NpbXVsYXRpb25zXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdwYWxldHRlLWxhYic6XG4gICAgICByZXR1cm4gPGRpdiBkYXRhLXNmaWQ9XCJzZmlkOnNoZWxsL3BhbGV0dGUtbGFiXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdiZWFjaC1iYWxsLXJvb20nOlxuICAgICAgcmV0dXJuIDxkaXYgZGF0YS1zZmlkPVwic2ZpZDpzaGVsbC9iZWFjaC1iYWxsLXJvb21cIj57Y2hpbGRyZW59PC9kaXY+O1xuICAgIGNhc2UgJ2Zsb2NrLW9mLWJpcmRzJzpcbiAgICAgIHJldHVybiA8ZGl2IGRhdGEtc2ZpZD1cInNmaWQ6c2hlbGwvZmxvY2stb2YtYmlyZHNcIj57Y2hpbGRyZW59PC9kaXY+O1xuICAgIGNhc2UgJ3JlcGVsLXJvb20nOlxuICAgICAgcmV0dXJuIDxkaXYgZGF0YS1zZmlkPVwic2ZpZDpzaGVsbC9yZXBlbC1yb29tXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdtaW5lcmFsLWdyb3d0aCc6XG4gICAgICByZXR1cm4gPGRpdiBkYXRhLXNmaWQ9XCJzZmlkOnNoZWxsL21pbmVyYWwtZ3Jvd3RoXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdhcGVydHVyZS1ibG9vbSc6XG4gICAgICByZXR1cm4gPGRpdiBkYXRhLXNmaWQ9XCJzZmlkOnNoZWxsL2FwZXJ0dXJlLWJsb29tXCI+e2NoaWxkcmVufTwvZGl2PjtcbiAgICBjYXNlICdjb25mbHVlbmNlLWJyaWRnZXMnOlxuICAgICAgcmV0dXJuIDxkaXYgZGF0YS1zZmlkPVwic2ZpZDpzaGVsbC9jb25mbHVlbmNlLWJyaWRnZXNcIj57Y2hpbGRyZW59PC9kaXY+O1xuICAgIGNhc2UgJ25hcG9sZW9uLXBvaW50LWNsb3VkJzpcbiAgICAgIHJldHVybiA8ZGl2IGRhdGEtc2ZpZD1cInNmaWQ6c2hlbGwvbmFwb2xlb24tcG9pbnQtY2xvdWRcIj57Y2hpbGRyZW59PC9kaXY+O1xuICAgIGNhc2UgJ3NwYXRpYWwtc2Nhbic6XG4gICAgICByZXR1cm4gPGRpdiBkYXRhLXNmaWQ9XCJzZmlkOnNoZWxsL3NwYXRpYWwtc2NhblwiPntjaGlsZHJlbn08L2Rpdj47XG4gICAgY2FzZSAnaG9tZSc6XG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiA8ZGl2IGRhdGEtc2ZpZD1cInNmaWQ6c2hlbGwvaG9tZVwiPntjaGlsZHJlbn08L2Rpdj47XG4gIH1cbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplUm91dGVVaUxheWVyKHVpTGF5ZXIsIGhlYWRlckNvbnRlbnQsIG1haW5Db250ZW50KSB7XG4gIGNvbnN0IGlzU3RydWN0dXJlZExheWVyID0gdWlMYXllclxuICAgICYmIHR5cGVvZiB1aUxheWVyID09PSAnb2JqZWN0J1xuICAgICYmICFBcnJheS5pc0FycmF5KHVpTGF5ZXIpXG4gICAgJiYgKFxuICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHVpTGF5ZXIsICdjaHJvbWUnKVxuICAgICAgfHwgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHVpTGF5ZXIsICdzZWNvbmRhcnknKVxuICAgICk7XG5cbiAgaWYgKGlzU3RydWN0dXJlZExheWVyKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNocm9tZTogdWlMYXllci5jaHJvbWUgPz8gbnVsbCxcbiAgICAgIHNlY29uZGFyeTogdWlMYXllci5zZWNvbmRhcnkgPz8gbnVsbCxcbiAgICB9O1xuICB9XG5cbiAgaWYgKHVpTGF5ZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB7XG4gICAgICBjaHJvbWU6IHVpTGF5ZXIsXG4gICAgICBzZWNvbmRhcnk6IG51bGwsXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY2hyb21lOiBoZWFkZXJDb250ZW50LFxuICAgIHNlY29uZGFyeTogbWFpbkNvbnRlbnQsXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBTdHVkaW9TaGVsbCh7XG4gIGFjdGl2ZVJvdXRlSWQsXG4gIHJvdXRlUmVuZGVyS2V5LFxuICBjb250ZW50UmVuZGVyS2V5ID0gcm91dGVSZW5kZXJLZXksXG4gIHN0dWRpb1dpbmRvd0NsYXNzTmFtZSxcbiAgd2FsbENsYXNzTmFtZSxcbiAgc2ltdWxhdGlvbkxheWVyLFxuICBzdHVkaW9XaW5kb3dDb250ZW50LFxuICB3YWxsQ29udGVudCxcbiAgaGVyb0xheWVyLFxuICB1aUxheWVyLFxuICBoZWFkZXJDb250ZW50LFxuICBtYWluQ29udGVudCxcbiAgaGVyb1RpdGxlLFxuICBmb290ZXJWYXJpYW50ID0gJ3N0YW5kYXJkJyxcbiAgd2luZG93T3ZlcmxheUNvbnRlbnQsXG4gIHNpbXVsYXRpb25Gb2N1c0NvbnRyb2xzLFxuICBzaW11bGF0aW9uRm9jdXNNb2RhbCxcbiAgc3VyZmFjZVJlZnMsXG59KSB7XG4gIGNvbnN0IHJvdXRlV2luZG93Q2xhc3NOYW1lID0gc3R1ZGlvV2luZG93Q2xhc3NOYW1lID8/IHdhbGxDbGFzc05hbWU7XG4gIGNvbnN0IHdpbmRvd0xheWVyQ2xhc3NOYW1lID0gWydzdHVkaW8td2luZG93LWxheWVyJywgJ3NpbXVsYXRpb24td2FsbC1sYXllcicsIHJvdXRlV2luZG93Q2xhc3NOYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpO1xuICAvLyBSb3V0ZSBzY2VuZXMgYW5kIG9wdGlvbmFsIGhlcm8gbWF0ZXJpYWwgc3RheSBiZWxvdyB0aGUgc2hhcmVkIHZlaWwuXG4gIC8vIFZpc2libGUgaW50ZXJmYWNlIGNvcHkgYW5kIGNvbnRyb2xzIGJlbG9uZyBpbiB1aUxheWVyIGFib3ZlIGl0LlxuICBjb25zdCByb3V0ZVNpbXVsYXRpb25MYXllciA9IHNpbXVsYXRpb25MYXllciA/PyBzdHVkaW9XaW5kb3dDb250ZW50ID8/IHdhbGxDb250ZW50O1xuICBjb25zdCByb3V0ZUhlcm9MYXllciA9IGhlcm9MYXllciA/PyBoZXJvVGl0bGU7XG4gIGNvbnN0IHJvdXRlVWlMYXllciA9IG5vcm1hbGl6ZVJvdXRlVWlMYXllcih1aUxheWVyLCBoZWFkZXJDb250ZW50LCBtYWluQ29udGVudCk7XG5cbiAgdXNlTGF5b3V0RWZmZWN0KCgpID0+IHtcbiAgICBpZiAocm91dGVSZW5kZXJLZXkgPT09ICdob21lJykgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIGxldCBmaXJzdEZyYW1lID0gMDtcbiAgICBsZXQgc2Vjb25kRnJhbWUgPSAwO1xuICAgIGRpc3Bvc2VSb3V0ZURlcHRoVGl0bGVDYW52YXMoKTtcbiAgICBmaXJzdEZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSgoKSA9PiB7XG4gICAgICBkaXNwb3NlUm91dGVEZXB0aFRpdGxlQ2FudmFzKCk7XG4gICAgICBzZWNvbmRGcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZGlzcG9zZVJvdXRlRGVwdGhUaXRsZUNhbnZhcyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGZpcnN0RnJhbWUpO1xuICAgICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKHNlY29uZEZyYW1lKTtcbiAgICB9O1xuICB9LCBbcm91dGVSZW5kZXJLZXldKTtcblxuICByZXR1cm4gKFxuICAgIDw+XG4gICAgICA8Um91dGVTY2VuZU1vdW50IHJvdXRlUmVuZGVyS2V5PXtyb3V0ZVJlbmRlcktleX0+XG4gICAgICAgIDxkaXYgaWQ9XCJhYnMtc2NlbmVcIiBjbGFzc05hbWU9XCJhcHAtc2NlbmUgYWJzLXNjZW5lXCI+XG4gICAgICAgICAgPGRpdiBpZD1cInNpbXVsYXRpb25zXCIgY2xhc3NOYW1lPXt3aW5kb3dMYXllckNsYXNzTmFtZX0+XG4gICAgICAgICAgICA8ZGl2IGlkPVwic2NlbmUtZWZmZWN0c1wiIGNsYXNzTmFtZT1cInNjZW5lLWVmZmVjdHNcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJub2lzZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiaW5uZXItd2FsbC1ncmFkaWVudC1lZGdlXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgaWQ9XCJzaGVsbC13YWxsLXNsb3RcIlxuICAgICAgICAgICAgICByZWY9e3N1cmZhY2VSZWZzPy53YWxsfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzdHVkaW8td2luZG93LXNsb3Qgc2hlbGwtd2FsbC1zbG90IHNoZWxsLXRyYW5zaXRpb24tc3VyZmFjZSBzaGVsbC10cmFuc2l0aW9uLXN1cmZhY2UtLXdhbGxcIlxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8ZGl2IGtleT17YHdpbmRvdy0ke3JvdXRlUmVuZGVyS2V5fWB9IGNsYXNzTmFtZT1cInN0dWRpby13aW5kb3ctcm91dGUtcm9vdCBzaGVsbC13YWxsLXJvdXRlLXJvb3Qgcm91dGUtc2ltdWxhdGlvbi1sYXllclwiPlxuICAgICAgICAgICAgICAgIHtyb3V0ZVNpbXVsYXRpb25MYXllcn1cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgaWQ9XCJzaGVsbC1oZXJvLXNsb3RcIlxuICAgICAgICAgICAgICByZWY9e3N1cmZhY2VSZWZzPy5oZXJvfVxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaGVsbC1oZXJvLXNsb3Qgc2hlbGwtdHJhbnNpdGlvbi1zdXJmYWNlIHNoZWxsLXRyYW5zaXRpb24tc3VyZmFjZS0taGVyb1wiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2hlbGwtaGVyby1zdXJmYWNlXCI+XG4gICAgICAgICAgICAgICAge3JvdXRlSGVyb0xheWVyfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAge3NpbXVsYXRpb25Gb2N1c0NvbnRyb2xzfVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiZnJhbWUtdmlnbmV0dGVcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1jb250cmFzdC12ZWlsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cblxuICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgIHJlZj17c3VyZmFjZVJlZnM/LnVpfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZmFkZS1jb250ZW50IHBhZ2UtY29udGVudCB1aS1sYXllclwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAgPGRpdiBpZD1cImFwcC1mcmFtZVwiIGNsYXNzTmFtZT1cInVpLWxheWVyLXdyYXBwZXJcIj5cbiAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICBpZD1cInNoZWxsLXJvdXRlLXNsb3RcIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwic2hlbGwtcm91dGUtc2xvdFwiXG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPGRpdiBrZXk9e2Bjb250ZW50LSR7Y29udGVudFJlbmRlcktleX1gfSBjbGFzc05hbWU9XCJzaGVsbC1yb3V0ZS1jb250ZW50LXJvb3Qgcm91dGUtdWktbGF5ZXJcIj5cbiAgICAgICAgICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICAgICAgICAgIHJlZj17c3VyZmFjZVJlZnM/LmNocm9tZX1cbiAgICAgICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaGVsbC10cmFuc2l0aW9uLXN1cmZhY2Ugc2hlbGwtdHJhbnNpdGlvbi1zdXJmYWNlLS1jaHJvbWVcIlxuICAgICAgICAgICAgICAgICAgICA+XG4gICAgICAgICAgICAgICAgICAgICAge3JvdXRlVWlMYXllci5jaHJvbWV9XG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICAgICAgcmVmPXtzdXJmYWNlUmVmcz8uc2Vjb25kYXJ5fVxuICAgICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInNoZWxsLXRyYW5zaXRpb24tc3VyZmFjZSBzaGVsbC10cmFuc2l0aW9uLXN1cmZhY2UtLXNlY29uZGFyeVwiXG4gICAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgICB7cm91dGVVaUxheWVyLnNlY29uZGFyeX1cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICAgICAgICByZWY9e3N1cmZhY2VSZWZzPy5mb290ZXJ9XG4gICAgICAgICAgICAgICAgICBjbGFzc05hbWU9XCJzaGVsbC10cmFuc2l0aW9uLXN1cmZhY2Ugc2hlbGwtdHJhbnNpdGlvbi1zdXJmYWNlLS1mb290ZXJcIlxuICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgIDxTaXRlRm9vdGVyIHZhcmlhbnQ9e2Zvb3RlclZhcmlhbnR9IC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPFNoZWxsV2luZG93T3ZlcmxheT5cbiAgICAgICAgICAgIHt3aW5kb3dPdmVybGF5Q29udGVudCA/PyBzaW11bGF0aW9uRm9jdXNNb2RhbH1cbiAgICAgICAgICA8L1NoZWxsV2luZG93T3ZlcmxheT5cbiAgICAgICAgICA8U2hlbGxCdXR0b25CYXJcbiAgICAgICAgICAgIGFjdGl2ZVJvdXRlSWQ9e2FjdGl2ZVJvdXRlSWQgfHwgcm91dGVSZW5kZXJLZXl9XG4gICAgICAgICAgICBtYXRlcmlhbFZhcmlhbnQ9XCJkb21pbmFudC10YWJcIlxuICAgICAgICAgICAgb25Sb3V0ZU5hdmlnYXRlPXsoaHJlZiwgdGFiLCBvcHRpb25zKSA9PiB0cnlTcGFOYXZpZ2F0ZShocmVmLCBvcHRpb25zKX1cbiAgICAgICAgICAvPlxuICAgICAgICAgIHsvKiBQb3J0Zm9saW8gZHJhd2VyOiBNVVNUIHN0YWNrIGFib3ZlIGhlYWRlci9mb290ZXIg4oCUIHNlZSBkb2NzL3JlZmVyZW5jZS9MQVlFUi1TVEFDS0lORy5tZCAobmV2ZXIgbW91bnQgb25seSBpbnNpZGUgI3NpbXVsYXRpb25zKS4gKi99XG4gICAgICAgICAgPGRpdlxuICAgICAgICAgICAgaWQ9XCJwb3J0Zm9saW8tc2hlZXQtaG9zdFwiXG4gICAgICAgICAgICBjbGFzc05hbWU9XCJwb3J0Zm9saW8tc2hlZXQtaG9zdFwiXG4gICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgIC8+XG5cbiAgICAgICAgICA8ZGl2XG4gICAgICAgICAgICBpZD1cInF1b3RlLXZpZXdwb3J0LWhvc3RcIlxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicXVvdGUtdmlld3BvcnQtaG9zdFwiXG4gICAgICAgICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9Sb3V0ZVNjZW5lTW91bnQ+XG5cbiAgICAgIDxkaXZcbiAgICAgICAgaWQ9XCJzaGVsbC1wZXJzaXN0ZW50LXJvdXRlLXVpLWhvc3RcIlxuICAgICAgICBjbGFzc05hbWU9XCJzaGVsbC1wZXJzaXN0ZW50LXJvdXRlLXVpLWhvc3RcIlxuICAgICAgLz5cblxuICAgICAgPGRpdiBpZD1cIm1vZGFsLWJsdXItbGF5ZXJcIiBjbGFzc05hbWU9XCJtb2RhbC1sYXllciBtb2RhbC1ibHVyLWxheWVyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cblxuICAgICAgPGRpdiBpZD1cIm1vZGFsLWNvbnRlbnQtbGF5ZXJcIiBjbGFzc05hbWU9XCJtb2RhbC1sYXllciBtb2RhbC1jb250ZW50LWxheWVyXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgIDxkaXYgaWQ9XCJtb2RhbC1tb2RhbC1ob3N0XCIgY2xhc3NOYW1lPVwibW9kYWwtbW9kYWwtaG9zdFwiIC8+XG4gICAgICA8L2Rpdj5cbiAgICA8Lz5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9jb21wb25lbnRzL2FwcC9TdHVkaW9TaGVsbC5qc3gifQ==