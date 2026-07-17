import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/palette-lab/PaletteLabExperience.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const startTransition = __vite__cjsImport1_react["startTransition"]; const useState = __vite__cjsImport1_react["useState"];
import { buildRouteHref } from "/src/lib/routes.js?t=1784282071059";
import { LONDON_WEATHER_PALETTES } from "/src/routes/palette-lab/palette-lab-data.js";
function PaletteLabStill({ concept }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "palette-lab-still", children: /* @__PURE__ */ jsxDEV(
    "img",
    {
      className: "palette-lab-still__image",
      src: concept.screenshot,
      alt: `${concept.name} simulation still`
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
      lineNumber: 8,
      columnNumber: 7
    },
    this
  ) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
    lineNumber: 7,
    columnNumber: 5
  }, this);
}
_c = PaletteLabStill;
function PaletteBand({ label, colors }) {
  return /* @__PURE__ */ jsxDEV("div", { className: "palette-lab-band", children: [
    /* @__PURE__ */ jsxDEV("p", { className: "palette-lab-band__label", children: label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
      lineNumber: 20,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "palette-lab-band__swatches", children: colors.map(
      (color) => /* @__PURE__ */ jsxDEV(
        "span",
        {
          className: "palette-lab-band__swatch",
          style: { "--palette-lab-swatch": color },
          title: color.toUpperCase(),
          "aria-label": `${label} colour ${color.toUpperCase()}`
        },
        `${label}-${color}`,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
          lineNumber: 23,
          columnNumber: 9
        },
        this
      )
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
      lineNumber: 21,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
    lineNumber: 19,
    columnNumber: 5
  }, this);
}
_c2 = PaletteBand;
export function PaletteLabExperience() {
  _s();
  const [activeIndex, setActiveIndex] = useState(
    Math.max(
      0,
      LONDON_WEATHER_PALETTES.findIndex((palette) => palette.id === "portlandHaze")
    )
  );
  const active = LONDON_WEATHER_PALETTES[activeIndex] || LONDON_WEATHER_PALETTES[0];
  const selectConcept = (index) => {
    startTransition(() => {
      setActiveIndex(index);
    });
  };
  return /* @__PURE__ */ jsxDEV("section", { className: "palette-lab", "aria-label": "London weather palette review", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__selector", role: "tablist", "aria-label": "Palette concepts", children: LONDON_WEATHER_PALETTES.map((concept, index) => {
      const isActive = index === activeIndex;
      return /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          role: "tab",
          "aria-selected": isActive,
          "aria-controls": `palette-lab-panel-${concept.id}`,
          className: `palette-lab-card${isActive ? " is-active" : ""}`,
          onClick: () => selectConcept(index),
          children: [
            /* @__PURE__ */ jsxDEV("span", { className: "palette-lab-card__weather", children: concept.weather }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 66,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "palette-lab-card__name", children: concept.name }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 67,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "palette-lab-card__swatches", "aria-hidden": "true", children: concept.palette.light.map(
              (color) => /* @__PURE__ */ jsxDEV(
                "span",
                {
                  className: "palette-lab-card__swatch",
                  style: { "--palette-lab-swatch": color }
                },
                `${concept.id}-${color}`,
                false,
                {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                  lineNumber: 70,
                  columnNumber: 17
                },
                this
              )
            ) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 68,
              columnNumber: 15
            }, this)
          ]
        },
        concept.id,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
          lineNumber: 57,
          columnNumber: 13
        },
        this
      );
    }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
      lineNumber: 53,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      "section",
      {
        id: `palette-lab-panel-${active.id}`,
        className: "palette-lab__details",
        "aria-label": `${active.name} palette mood`,
        children: [
          /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__active-copy", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__active-header", children: [
              /* @__PURE__ */ jsxDEV("div", { children: [
                /* @__PURE__ */ jsxDEV("p", { className: "palette-lab__active-weather", children: active.weather }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                  lineNumber: 90,
                  columnNumber: 15
                }, this),
                /* @__PURE__ */ jsxDEV("h2", { className: "palette-lab__active-name", children: active.name }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                  lineNumber: 91,
                  columnNumber: 15
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                lineNumber: 89,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV("p", { className: "palette-lab__active-personality", children: active.personality }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                lineNumber: 93,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 88,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "palette-lab__strapline", children: active.strapline }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 95,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("p", { className: "palette-lab__story", children: active.story }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 96,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__word-cloud", "aria-label": `${active.name} word cloud`, children: active.words.map(
              (word) => /* @__PURE__ */ jsxDEV("span", { className: "palette-lab__word", children: word }, `${active.id}-${word}`, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                lineNumber: 99,
                columnNumber: 13
              }, this)
            ) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 97,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__bands", children: [
              /* @__PURE__ */ jsxDEV(PaletteBand, { label: "Day", colors: active.palette.light }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                lineNumber: 105,
                columnNumber: 13
              }, this),
              /* @__PURE__ */ jsxDEV(PaletteBand, { label: "Night", colors: active.palette.dark }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                lineNumber: 106,
                columnNumber: 13
              }, this)
            ] }, void 0, true, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 104,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV(
              "a",
              {
                className: "palette-lab__open-link",
                href: buildRouteHref("home", { searchParams: { palette: active.slug } }),
                children: "Open live simulation with this palette"
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
                lineNumber: 108,
                columnNumber: 11
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
            lineNumber: 87,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__preview", children: [
            /* @__PURE__ */ jsxDEV(PaletteLabStill, { concept: active }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 116,
              columnNumber: 11
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "palette-lab__preview-caption", children: "Live still from the home simulation, forced into the palette-aware pit scene." }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
              lineNumber: 117,
              columnNumber: 11
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
            lineNumber: 115,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
        lineNumber: 82,
        columnNumber: 7
      },
      this
    )
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx",
    lineNumber: 52,
    columnNumber: 5
  }, this);
}
_s(PaletteLabExperience, "rwCJEsQ/g7xzT6Oe6NwCsCHZY3o=");
_c3 = PaletteLabExperience;
var _c, _c2, _c3;
$RefreshReg$(_c, "PaletteLabStill");
$RefreshReg$(_c2, "PaletteBand");
$RefreshReg$(_c3, "PaletteLabExperience");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/palette-lab/PaletteLabExperience.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBS0E7QUFBQTtBQUFBO0FBQUEsTUF0Q0Y7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBdUNBO0FBQUEsT0FyRUY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQXNFQTtBQUVKO0FBQUNSLEdBeEZlRCxzQkFBb0I7QUFBQSxNQUFwQkE7QUFBb0IsSUFBQVIsSUFBQU8sS0FBQXdCO0FBQUEsYUFBQS9CLElBQUE7QUFBQSxhQUFBTyxLQUFBO0FBQUEsYUFBQXdCLEtBQUEiLCJuYW1lcyI6WyJzdGFydFRyYW5zaXRpb24iLCJ1c2VTdGF0ZSIsImJ1aWxkUm91dGVIcmVmIiwiTE9ORE9OX1dFQVRIRVJfUEFMRVRURVMiLCJQYWxldHRlTGFiU3RpbGwiLCJjb25jZXB0Iiwic2NyZWVuc2hvdCIsIm5hbWUiLCJfYyIsIlBhbGV0dGVCYW5kIiwibGFiZWwiLCJjb2xvcnMiLCJtYXAiLCJjb2xvciIsInRvVXBwZXJDYXNlIiwiX2MyIiwiUGFsZXR0ZUxhYkV4cGVyaWVuY2UiLCJfcyIsImFjdGl2ZUluZGV4Iiwic2V0QWN0aXZlSW5kZXgiLCJNYXRoIiwibWF4IiwiZmluZEluZGV4IiwicGFsZXR0ZSIsImlkIiwiYWN0aXZlIiwic2VsZWN0Q29uY2VwdCIsImluZGV4IiwiaXNBY3RpdmUiLCJ3ZWF0aGVyIiwibGlnaHQiLCJwZXJzb25hbGl0eSIsInN0cmFwbGluZSIsInN0b3J5Iiwid29yZHMiLCJ3b3JkIiwiZGFyayIsInNlYXJjaFBhcmFtcyIsInNsdWciLCJfYzMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiUGFsZXR0ZUxhYkV4cGVyaWVuY2UuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHN0YXJ0VHJhbnNpdGlvbiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBidWlsZFJvdXRlSHJlZiB9IGZyb20gJy4uLy4uL2xpYi9yb3V0ZXMuanMnO1xuaW1wb3J0IHsgTE9ORE9OX1dFQVRIRVJfUEFMRVRURVMgfSBmcm9tICcuL3BhbGV0dGUtbGFiLWRhdGEuanMnO1xuXG5mdW5jdGlvbiBQYWxldHRlTGFiU3RpbGwoeyBjb25jZXB0IH0pIHtcbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiLXN0aWxsXCI+XG4gICAgICA8aW1nXG4gICAgICAgIGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiLXN0aWxsX19pbWFnZVwiXG4gICAgICAgIHNyYz17Y29uY2VwdC5zY3JlZW5zaG90fVxuICAgICAgICBhbHQ9e2Ake2NvbmNlcHQubmFtZX0gc2ltdWxhdGlvbiBzdGlsbGB9XG4gICAgICAvPlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBQYWxldHRlQmFuZCh7IGxhYmVsLCBjb2xvcnMgfSkge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWItYmFuZFwiPlxuICAgICAgPHAgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWItYmFuZF9fbGFiZWxcIj57bGFiZWx9PC9wPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYi1iYW5kX19zd2F0Y2hlc1wiPlxuICAgICAgICB7Y29sb3JzLm1hcCgoY29sb3IpID0+IChcbiAgICAgICAgICA8c3BhblxuICAgICAgICAgICAga2V5PXtgJHtsYWJlbH0tJHtjb2xvcn1gfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWItYmFuZF9fc3dhdGNoXCJcbiAgICAgICAgICAgIHN0eWxlPXt7ICctLXBhbGV0dGUtbGFiLXN3YXRjaCc6IGNvbG9yIH19XG4gICAgICAgICAgICB0aXRsZT17Y29sb3IudG9VcHBlckNhc2UoKX1cbiAgICAgICAgICAgIGFyaWEtbGFiZWw9e2Ake2xhYmVsfSBjb2xvdXIgJHtjb2xvci50b1VwcGVyQ2FzZSgpfWB9XG4gICAgICAgICAgLz5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFBhbGV0dGVMYWJFeHBlcmllbmNlKCkge1xuICBjb25zdCBbYWN0aXZlSW5kZXgsIHNldEFjdGl2ZUluZGV4XSA9IHVzZVN0YXRlKFxuICAgIE1hdGgubWF4KFxuICAgICAgMCxcbiAgICAgIExPTkRPTl9XRUFUSEVSX1BBTEVUVEVTLmZpbmRJbmRleCgocGFsZXR0ZSkgPT4gcGFsZXR0ZS5pZCA9PT0gJ3BvcnRsYW5kSGF6ZScpXG4gICAgKVxuICApO1xuICBjb25zdCBhY3RpdmUgPSBMT05ET05fV0VBVEhFUl9QQUxFVFRFU1thY3RpdmVJbmRleF0gfHwgTE9ORE9OX1dFQVRIRVJfUEFMRVRURVNbMF07XG5cbiAgY29uc3Qgc2VsZWN0Q29uY2VwdCA9IChpbmRleCkgPT4ge1xuICAgIHN0YXJ0VHJhbnNpdGlvbigoKSA9PiB7XG4gICAgICBzZXRBY3RpdmVJbmRleChpbmRleCk7XG4gICAgfSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYlwiIGFyaWEtbGFiZWw9XCJMb25kb24gd2VhdGhlciBwYWxldHRlIHJldmlld1wiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYl9fc2VsZWN0b3JcIiByb2xlPVwidGFibGlzdFwiIGFyaWEtbGFiZWw9XCJQYWxldHRlIGNvbmNlcHRzXCI+XG4gICAgICAgIHtMT05ET05fV0VBVEhFUl9QQUxFVFRFUy5tYXAoKGNvbmNlcHQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgY29uc3QgaXNBY3RpdmUgPSBpbmRleCA9PT0gYWN0aXZlSW5kZXg7XG4gICAgICAgICAgcmV0dXJuIChcbiAgICAgICAgICAgIDxidXR0b25cbiAgICAgICAgICAgICAga2V5PXtjb25jZXB0LmlkfVxuICAgICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgICAgcm9sZT1cInRhYlwiXG4gICAgICAgICAgICAgIGFyaWEtc2VsZWN0ZWQ9e2lzQWN0aXZlfVxuICAgICAgICAgICAgICBhcmlhLWNvbnRyb2xzPXtgcGFsZXR0ZS1sYWItcGFuZWwtJHtjb25jZXB0LmlkfWB9XG4gICAgICAgICAgICAgIGNsYXNzTmFtZT17YHBhbGV0dGUtbGFiLWNhcmQke2lzQWN0aXZlID8gJyBpcy1hY3RpdmUnIDogJyd9YH1cbiAgICAgICAgICAgICAgb25DbGljaz17KCkgPT4gc2VsZWN0Q29uY2VwdChpbmRleCl9XG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiLWNhcmRfX3dlYXRoZXJcIj57Y29uY2VwdC53ZWF0aGVyfTwvc3Bhbj5cbiAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWItY2FyZF9fbmFtZVwiPntjb25jZXB0Lm5hbWV9PC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYi1jYXJkX19zd2F0Y2hlc1wiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICAgICAgICAgIHtjb25jZXB0LnBhbGV0dGUubGlnaHQubWFwKChjb2xvcikgPT4gKFxuICAgICAgICAgICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgICAgICAgICAga2V5PXtgJHtjb25jZXB0LmlkfS0ke2NvbG9yfWB9XG4gICAgICAgICAgICAgICAgICAgIGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiLWNhcmRfX3N3YXRjaFwiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7ICctLXBhbGV0dGUtbGFiLXN3YXRjaCc6IGNvbG9yIH19XG4gICAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgICkpfVxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICApO1xuICAgICAgICB9KX1cbiAgICAgIDwvZGl2PlxuXG4gICAgICA8c2VjdGlvblxuICAgICAgICBpZD17YHBhbGV0dGUtbGFiLXBhbmVsLSR7YWN0aXZlLmlkfWB9XG4gICAgICAgIGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiX19kZXRhaWxzXCJcbiAgICAgICAgYXJpYS1sYWJlbD17YCR7YWN0aXZlLm5hbWV9IHBhbGV0dGUgbW9vZGB9XG4gICAgICA+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWJfX2FjdGl2ZS1jb3B5XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYl9fYWN0aXZlLWhlYWRlclwiPlxuICAgICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWJfX2FjdGl2ZS13ZWF0aGVyXCI+e2FjdGl2ZS53ZWF0aGVyfTwvcD5cbiAgICAgICAgICAgICAgPGgyIGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiX19hY3RpdmUtbmFtZVwiPnthY3RpdmUubmFtZX08L2gyPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJwYWxldHRlLWxhYl9fYWN0aXZlLXBlcnNvbmFsaXR5XCI+e2FjdGl2ZS5wZXJzb25hbGl0eX08L3A+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWJfX3N0cmFwbGluZVwiPnthY3RpdmUuc3RyYXBsaW5lfTwvcD5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJwYWxldHRlLWxhYl9fc3RvcnlcIj57YWN0aXZlLnN0b3J5fTwvcD5cbiAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiX193b3JkLWNsb3VkXCIgYXJpYS1sYWJlbD17YCR7YWN0aXZlLm5hbWV9IHdvcmQgY2xvdWRgfT5cbiAgICAgICAgICAgIHthY3RpdmUud29yZHMubWFwKCh3b3JkKSA9PiAoXG4gICAgICAgICAgICAgIDxzcGFuIGtleT17YCR7YWN0aXZlLmlkfS0ke3dvcmR9YH0gY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWJfX3dvcmRcIj5cbiAgICAgICAgICAgICAgICB7d29yZH1cbiAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYl9fYmFuZHNcIj5cbiAgICAgICAgICAgIDxQYWxldHRlQmFuZCBsYWJlbD1cIkRheVwiIGNvbG9ycz17YWN0aXZlLnBhbGV0dGUubGlnaHR9IC8+XG4gICAgICAgICAgICA8UGFsZXR0ZUJhbmQgbGFiZWw9XCJOaWdodFwiIGNvbG9ycz17YWN0aXZlLnBhbGV0dGUuZGFya30gLz5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8YVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicGFsZXR0ZS1sYWJfX29wZW4tbGlua1wiXG4gICAgICAgICAgICBocmVmPXtidWlsZFJvdXRlSHJlZignaG9tZScsIHsgc2VhcmNoUGFyYW1zOiB7IHBhbGV0dGU6IGFjdGl2ZS5zbHVnIH0gfSl9XG4gICAgICAgICAgPlxuICAgICAgICAgICAgT3BlbiBsaXZlIHNpbXVsYXRpb24gd2l0aCB0aGlzIHBhbGV0dGVcbiAgICAgICAgICA8L2E+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInBhbGV0dGUtbGFiX19wcmV2aWV3XCI+XG4gICAgICAgICAgPFBhbGV0dGVMYWJTdGlsbCBjb25jZXB0PXthY3RpdmV9IC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYWxldHRlLWxhYl9fcHJldmlldy1jYXB0aW9uXCI+XG4gICAgICAgICAgICBMaXZlIHN0aWxsIGZyb20gdGhlIGhvbWUgc2ltdWxhdGlvbiwgZm9yY2VkIGludG8gdGhlIHBhbGV0dGUtYXdhcmUgcGl0IHNjZW5lLlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cbiAgICA8L3NlY3Rpb24+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL3BhbGV0dGUtbGFiL1BhbGV0dGVMYWJFeHBlcmllbmNlLmpzeCJ9