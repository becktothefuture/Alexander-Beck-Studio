import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import { buildRouteHref, SHELL_ROUTE_TABS } from "/src/lib/routes.js?t=1784282071059";
import { StyleguideTypographySection } from "/src/routes/styleguide/StyleguideTypography.jsx";
export const STYLEGUIDE_ROUTE_RUNTIME = {
  exportName: "bootstrapStyleguide",
  loadModule: () => import("/src/routes/styleguide/styleguide-bootstrap.js")
};
const homeHref = buildRouteHref("home");
function renderButtonBarSpecimen() {
  return /* @__PURE__ */ jsxDEV("div", { className: "button-bar shell-bottom-band styleguide-button-bar", "data-button-bar": true, children: [
    /* @__PURE__ */ jsxDEV("nav", { className: "button-bar__primary-buttons shell-tab-nav", "aria-label": "Button Bar specimen", children: SHELL_ROUTE_TABS.map(
      (tab) => /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: `button-bar__button shell-tab${tab.iconOnly ? " button-bar__button--icon-only shell-tab--icon-only" : ""}`,
          "data-route-tab": tab.routeId,
          "data-state": tab.routeId === "portfolio" ? "active" : "idle",
          "aria-current": tab.routeId === "portfolio" ? "page" : void 0,
          disabled: true,
          children: [
            /* @__PURE__ */ jsxDEV("i", { className: `ti ${tab.icon} button-bar__icon shell-tab__icon`, "aria-hidden": "true" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 25,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "button-bar__label shell-tab__label", children: tab.label }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 26,
              columnNumber: 13
            }, this)
          ]
        },
        tab.routeId,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 16,
          columnNumber: 9
        },
        this
      )
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 14,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "button-bar__secondary-buttons", role: "group", "aria-label": "Secondary controls specimen", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "button-bar__secondary-button shell-tab shell-tab--icon-only", "aria-label": "Sound off", disabled: true, children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-volume-off button-bar__secondary-icon shell-tab__icon", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 32,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 31,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "button-bar__secondary-button button-bar__theme-toggle shell-tab shell-tab--icon-only", "aria-label": "Theme", disabled: true, children: /* @__PURE__ */ jsxDEV("span", { className: "button-bar__theme-thumb", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 35,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 34,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 30,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
    lineNumber: 13,
    columnNumber: 5
  }, this);
}
function renderSoundOnIcon() {
  return /* @__PURE__ */ jsxDEV("svg", { className: "sound-toggle__icon sound-toggle__icon--on", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false", children: [
    /* @__PURE__ */ jsxDEV("path", { d: "M5 9.25v5.5h3.6l4.6 3.55V5.7L8.6 9.25H5z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 45,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { d: "M16.15 8.6c1.4 1.55 1.4 5.25 0 6.8" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 46,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { d: "M18.75 6.2c2.25 2.65 2.25 8.95 0 11.6" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 47,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
    lineNumber: 44,
    columnNumber: 5
  }, this);
}
export function getStyleguideRouteView() {
  return {
    bodyClass: "body styleguide-page",
    studioWindowClassName: "styleguide-wall w-embed",
    studioWindowContent: /* @__PURE__ */ jsxDEV("div", { className: "styleguide-backdrop", "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 56,
      columnNumber: 26
    }, this),
    headerContent: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Back to home", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 62,
        columnNumber: 15
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 61,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 60,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 65,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 66,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 59,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 58,
      columnNumber: 5
    }, this),
    mainContent: /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer styleguide-main", "aria-label": "Component library", children: /* @__PURE__ */ jsxDEV("div", { className: "styleguide-doc", children: [
      /* @__PURE__ */ jsxDEV("h1", { className: "styleguide-doc__title", children: "Component library" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 73,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "styleguide-doc__lede", children: [
        "The persistent Button Bar owns primary navigation. Route top bars are optional utility strips; icon actions use",
        " ",
        /* @__PURE__ */ jsxDEV("code", { className: "styleguide-doc__code", children: ".abs-icon-btn" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 76,
          columnNumber: 13
        }, this),
        ". Keep About Me title-cased."
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 74,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(StyleguideTypographySection, {}, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 79,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "styleguide-section", "aria-labelledby": "sg-button-bar", children: [
        /* @__PURE__ */ jsxDEV("h2", { id: "sg-button-bar", children: "Button Bar navigation" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 82,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "styleguide-section__hint", children: [
          "Route definitions and labels come from ",
          /* @__PURE__ */ jsxDEV("code", { className: "styleguide-doc__code", children: "SHELL_ROUTE_TABS" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 84,
            columnNumber: 54
          }, this),
          ". The specimen shows Portfolio active, alongside idle routes and the sound/theme group."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 83,
          columnNumber: 13
        }, this),
        renderButtonBarSpecimen()
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 81,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "styleguide-section", "aria-labelledby": "sg-route-topbar", children: [
        /* @__PURE__ */ jsxDEV("h2", { id: "sg-route-topbar", children: "Route utility top bar" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 90,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "styleguide-section__hint", children: "Use only when a route needs a back or utility action. Primary route switching remains in the Button Bar." }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 91,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "styleguide-topbar-frame", children: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", children: /* @__PURE__ */ jsxDEV("span", { className: "gate-back abs-icon-btn styleguide-fake-icon", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 99,
            columnNumber: 23
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 98,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 97,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 102,
            columnNumber: 19
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right", children: /* @__PURE__ */ jsxDEV("button", { type: "button", className: "sound-toggle abs-icon-btn", "aria-label": "Sample sound on", "data-enabled": "true", "aria-pressed": "true", disabled: true, children: renderSoundOnIcon() }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 104,
            columnNumber: 21
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 103,
            columnNumber: 19
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 96,
          columnNumber: 17
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 95,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 94,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 89,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "styleguide-section", "aria-labelledby": "sg-icon", children: [
        /* @__PURE__ */ jsxDEV("h2", { id: "sg-icon", children: "Icon frame buttons" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 114,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("p", { className: "styleguide-section__hint", children: [
          /* @__PURE__ */ jsxDEV("code", { className: "styleguide-doc__code", children: ".abs-icon-btn" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 116,
            columnNumber: 15
          }, this),
          " — sound toggle, gate back, socials."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 115,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "styleguide-sample-row", children: [
          /* @__PURE__ */ jsxDEV("button", { type: "button", className: "sound-toggle abs-icon-btn", "aria-label": "Sample mute", disabled: true, children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-volume-off", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 120,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 119,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("button", { type: "button", className: "sound-toggle abs-icon-btn", "aria-label": "Sample sound on", "data-enabled": "true", "aria-pressed": "true", disabled: true, children: renderSoundOnIcon() }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 122,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("a", { href: homeHref, className: "gate-back abs-icon-btn", "aria-label": "Sample back", children: /* @__PURE__ */ jsxDEV("i", { className: "ti ti-arrow-left", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 126,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 125,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 118,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 113,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "styleguide-section", "aria-labelledby": "sg-legend", children: [
        /* @__PURE__ */ jsxDEV("h2", { id: "sg-legend", children: "Expertise legend row" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 132,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("nav", { className: "legend styleguide-legend-demo", "aria-label": "Sample legend", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "legend__item", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "circle bg-ball-1", "aria-hidden": "true" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 135,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "Strategy" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 136,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 134,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "legend__item", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "circle bg-ball-2", "aria-hidden": "true" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 139,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "Product" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 140,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 138,
            columnNumber: 15
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "legend__item", children: [
            /* @__PURE__ */ jsxDEV("div", { className: "circle bg-ball-3", "aria-hidden": "true" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 143,
              columnNumber: 17
            }, this),
            /* @__PURE__ */ jsxDEV("span", { children: "Motion" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
              lineNumber: 144,
              columnNumber: 17
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 142,
            columnNumber: 15
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 133,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 131,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "styleguide-section", "aria-labelledby": "sg-script", children: [
        /* @__PURE__ */ jsxDEV("h2", { id: "sg-script", children: "Supporting description copy" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 150,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("blockquote", { className: "decorative-script styleguide-script-demo", children: /* @__PURE__ */ jsxDEV("p", { children: [
          "Sample philosophy line with a",
          " ",
          /* @__PURE__ */ jsxDEV("a", { href: homeHref, children: "text link" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
            lineNumber: 154,
            columnNumber: 17
          }, this),
          "."
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 152,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 151,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 149,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("section", { className: "styleguide-section", "aria-labelledby": "sg-meta", children: [
        /* @__PURE__ */ jsxDEV("h2", { id: "sg-meta", children: "Meta / time chip" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 160,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { className: "styleguide-sample-row styleguide-meta-demo", children: /* @__PURE__ */ jsxDEV("button", { type: "button", className: "abs-meta-btn", disabled: true, children: "London · 12:00" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 162,
          columnNumber: 15
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 161,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 159,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("p", { className: "styleguide-doc__footer", children: [
        "Source: ",
        /* @__PURE__ */ jsxDEV("code", { className: "styleguide-doc__code", children: "docs/reference/COMPONENT-LIBRARY.md" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
          lineNumber: 169,
          columnNumber: 21
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
        lineNumber: 168,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 72,
      columnNumber: 9
    }, this) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/styleguide/StyleguideRoute.jsx",
      lineNumber: 71,
      columnNumber: 5
    }, this)
  };
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJtYXBwaW5ncyI6IkFBd0JZO0FBeEJaLFNBQVNBLGdCQUFnQkMsd0JBQXdCO0FBQ2pELFNBQVNDLG1DQUFtQztBQUVyQyxhQUFNQywyQkFBMkI7QUFBQSxFQUN0Q0MsWUFBWTtBQUFBLEVBQ1pDLFlBQVlBLE1BQU0sT0FBTywyQkFBMkI7QUFDdEQ7QUFFQSxNQUFNQyxXQUFXTixlQUFlLE1BQU07QUFFdEMsU0FBU08sMEJBQTBCO0FBQ2pDLFNBQ0UsdUJBQUMsU0FBSSxXQUFVLHNEQUFxRCxtQkFBZSxNQUNqRjtBQUFBLDJCQUFDLFNBQUksV0FBVSw2Q0FBNEMsY0FBVyx1QkFDbkVOLDJCQUFpQk87QUFBQUEsTUFBSSxDQUFDQyxRQUNyQjtBQUFBLFFBQUM7QUFBQTtBQUFBLFVBRUMsTUFBSztBQUFBLFVBQ0wsV0FBVywrQkFBK0JBLElBQUlDLFdBQVcsd0RBQXdELEVBQUU7QUFBQSxVQUNuSCxrQkFBZ0JELElBQUlFO0FBQUFBLFVBQ3BCLGNBQVlGLElBQUlFLFlBQVksY0FBYyxXQUFXO0FBQUEsVUFDckQsZ0JBQWNGLElBQUlFLFlBQVksY0FBYyxTQUFTQztBQUFBQSxVQUNyRCxVQUFRO0FBQUEsVUFFUjtBQUFBLG1DQUFDLE9BQUUsV0FBVyxNQUFNSCxJQUFJSSxJQUFJLHFDQUFxQyxlQUFZLFVBQTdFO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW1GO0FBQUEsWUFDbkYsdUJBQUMsVUFBSyxXQUFVLHNDQUFzQ0osY0FBSUssU0FBMUQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBZ0U7QUFBQTtBQUFBO0FBQUEsUUFUM0RMLElBQUlFO0FBQUFBLFFBRFg7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQVdBO0FBQUEsSUFDRCxLQWRIO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FlQTtBQUFBLElBQ0EsdUJBQUMsU0FBSSxXQUFVLGlDQUFnQyxNQUFLLFNBQVEsY0FBVywrQkFDckU7QUFBQSw2QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLCtEQUE4RCxjQUFXLGFBQVksVUFBUSxNQUMzSCxpQ0FBQyxPQUFFLFdBQVUsK0RBQThELGVBQVksVUFBdkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2RixLQUQvRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBRUE7QUFBQSxNQUNBLHVCQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsd0ZBQXVGLGNBQVcsU0FBUSxVQUFRLE1BQ2hKLGlDQUFDLFVBQUssV0FBVSwyQkFBMEIsZUFBWSxVQUF0RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTRELEtBRDlEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFFQTtBQUFBLFNBTkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQU9BO0FBQUEsT0F4QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQXlCQTtBQUVKO0FBRUEsU0FBU0ksb0JBQW9CO0FBQzNCLFNBQ0UsdUJBQUMsU0FBSSxXQUFVLDZDQUE0QyxTQUFRLGFBQVksZUFBWSxRQUFPLFdBQVUsU0FDMUc7QUFBQSwyQkFBQyxVQUFLLEdBQUUsOENBQVI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUFrRDtBQUFBLElBQ2xELHVCQUFDLFVBQUssR0FBRSx3Q0FBUjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQTRDO0FBQUEsSUFDNUMsdUJBQUMsVUFBSyxHQUFFLDJDQUFSO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBK0M7QUFBQSxPQUhqRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFNBSUE7QUFFSjtBQUVPLGdCQUFTQyx5QkFBeUI7QUFDdkMsU0FBTztBQUFBLElBQ0xDLFdBQVc7QUFBQSxJQUNYQyx1QkFBdUI7QUFBQSxJQUN2QkMscUJBQXFCLHVCQUFDLFNBQUksV0FBVSx1QkFBc0IsZUFBWSxVQUFqRDtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQXVEO0FBQUEsSUFDNUVDLGVBQ0UsdUJBQUMsWUFBTyxXQUFVLFVBQ2hCLGlDQUFDLFNBQUksV0FBVSw0QkFDYjtBQUFBLDZCQUFDLFNBQUksV0FBVSxzQkFDYixpQ0FBQyxPQUFFLE1BQU1kLFVBQVUsV0FBVSwwQkFBeUIsY0FBVyxnQkFDL0QsaUNBQUMsT0FBRSxXQUFVLG9CQUFtQixlQUFZLFVBQTVDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBa0QsS0FEcEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBLEtBSEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUlBO0FBQUEsTUFDQSx1QkFBQyxTQUFJLFdBQVUsMEJBQWY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUFxQztBQUFBLE1BQ3JDLHVCQUFDLFNBQUksV0FBVSxzQ0FBZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQWlEO0FBQUEsU0FQbkQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQVFBLEtBVEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQVVBO0FBQUEsSUFFRmUsYUFDRSx1QkFBQyxVQUFLLFdBQVUsb0NBQW1DLGNBQVcscUJBQzVELGlDQUFDLFNBQUksV0FBVSxrQkFDYjtBQUFBLDZCQUFDLFFBQUcsV0FBVSx5QkFBd0IsaUNBQXRDO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBdUQ7QUFBQSxNQUN2RCx1QkFBQyxPQUFFLFdBQVUsd0JBQXNCO0FBQUE7QUFBQSxRQUMrRTtBQUFBLFFBQ2hILHVCQUFDLFVBQUssV0FBVSx3QkFBdUIsNkJBQXZDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBb0Q7QUFBQSxRQUFPO0FBQUEsV0FGN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUdBO0FBQUEsTUFFQSx1QkFBQyxpQ0FBRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQTRCO0FBQUEsTUFFNUIsdUJBQUMsYUFBUSxXQUFVLHNCQUFxQixtQkFBZ0IsaUJBQ3REO0FBQUEsK0JBQUMsUUFBRyxJQUFHLGlCQUFnQixxQ0FBdkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUE0QztBQUFBLFFBQzVDLHVCQUFDLE9BQUUsV0FBVSw0QkFBMEI7QUFBQTtBQUFBLFVBQ0UsdUJBQUMsVUFBSyxXQUFVLHdCQUF1QixnQ0FBdkM7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBdUQ7QUFBQSxVQUFPO0FBQUEsYUFEdkc7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFDQ2Qsd0JBQXdCO0FBQUEsV0FMM0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQU1BO0FBQUEsTUFFQSx1QkFBQyxhQUFRLFdBQVUsc0JBQXFCLG1CQUFnQixtQkFDdEQ7QUFBQSwrQkFBQyxRQUFHLElBQUcsbUJBQWtCLHFDQUF6QjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQThDO0FBQUEsUUFDOUMsdUJBQUMsT0FBRSxXQUFVLDRCQUEwQix3SEFBdkM7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUVBO0FBQUEsUUFDQSx1QkFBQyxTQUFJLFdBQVUsMkJBQ2IsaUNBQUMsWUFBTyxXQUFVLFVBQ2hCLGlDQUFDLFNBQUksV0FBVSw0QkFDYjtBQUFBLGlDQUFDLFNBQUksV0FBVSxzQkFDYixpQ0FBQyxVQUFLLFdBQVUsK0NBQThDLGVBQVksUUFDeEUsaUNBQUMsT0FBRSxXQUFVLG9CQUFtQixlQUFZLFVBQTVDO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBQWtELEtBRHBEO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUEsS0FIRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUlBO0FBQUEsVUFDQSx1QkFBQyxTQUFJLFdBQVUsd0JBQXVCLGVBQVksVUFBbEQ7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFBd0Q7QUFBQSxVQUN4RCx1QkFBQyxTQUFJLFdBQVUsb0NBQ2IsaUNBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSw2QkFBNEIsY0FBVyxtQkFBa0IsZ0JBQWEsUUFBTyxnQkFBYSxRQUFPLFVBQVEsTUFDdElRLDRCQUFrQixLQURyQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBLEtBSEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFJQTtBQUFBLGFBWEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVlBLEtBYkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWNBLEtBZkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWdCQTtBQUFBLFdBckJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFzQkE7QUFBQSxNQUVBLHVCQUFDLGFBQVEsV0FBVSxzQkFBcUIsbUJBQWdCLFdBQ3REO0FBQUEsK0JBQUMsUUFBRyxJQUFHLFdBQVUsa0NBQWpCO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBbUM7QUFBQSxRQUNuQyx1QkFBQyxPQUFFLFdBQVUsNEJBQ1g7QUFBQSxpQ0FBQyxVQUFLLFdBQVUsd0JBQXVCLDZCQUF2QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFvRDtBQUFBLFVBQU87QUFBQSxhQUQ3RDtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBRUE7QUFBQSxRQUNBLHVCQUFDLFNBQUksV0FBVSx5QkFDYjtBQUFBLGlDQUFDLFlBQU8sTUFBSyxVQUFTLFdBQVUsNkJBQTRCLGNBQVcsZUFBYyxVQUFRLE1BQzNGLGlDQUFDLE9BQUUsV0FBVSxvQkFBbUIsZUFBWSxVQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsVUFDQSx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLDZCQUE0QixjQUFXLG1CQUFrQixnQkFBYSxRQUFPLGdCQUFhLFFBQU8sVUFBUSxNQUN0SUEsNEJBQWtCLEtBRHJCO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBRUE7QUFBQSxVQUNBLHVCQUFDLE9BQUUsTUFBTVQsVUFBVSxXQUFVLDBCQUF5QixjQUFXLGVBQy9ELGlDQUFDLE9BQUUsV0FBVSxvQkFBbUIsZUFBWSxVQUE1QztBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUFrRCxLQURwRDtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUVBO0FBQUEsYUFURjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBVUE7QUFBQSxXQWZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFnQkE7QUFBQSxNQUVBLHVCQUFDLGFBQVEsV0FBVSxzQkFBcUIsbUJBQWdCLGFBQ3REO0FBQUEsK0JBQUMsUUFBRyxJQUFHLGFBQVksb0NBQW5CO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBdUM7QUFBQSxRQUN2Qyx1QkFBQyxTQUFJLFdBQVUsaUNBQWdDLGNBQVcsaUJBQ3hEO0FBQUEsaUNBQUMsU0FBSSxXQUFVLGdCQUNiO0FBQUEsbUNBQUMsU0FBSSxXQUFVLG9CQUFtQixlQUFZLFVBQTlDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW9EO0FBQUEsWUFDcEQsdUJBQUMsVUFBSyx3QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFjO0FBQUEsZUFGaEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFHQTtBQUFBLFVBQ0EsdUJBQUMsU0FBSSxXQUFVLGdCQUNiO0FBQUEsbUNBQUMsU0FBSSxXQUFVLG9CQUFtQixlQUFZLFVBQTlDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQW9EO0FBQUEsWUFDcEQsdUJBQUMsVUFBSyx1QkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLG1CQUFhO0FBQUEsZUFGZjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUdBO0FBQUEsVUFDQSx1QkFBQyxTQUFJLFdBQVUsZ0JBQ2I7QUFBQSxtQ0FBQyxTQUFJLFdBQVUsb0JBQW1CLGVBQVksVUFBOUM7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFBb0Q7QUFBQSxZQUNwRCx1QkFBQyxVQUFLLHNCQUFOO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQVk7QUFBQSxlQUZkO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBR0E7QUFBQSxhQVpGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFhQTtBQUFBLFdBZkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWdCQTtBQUFBLE1BRUEsdUJBQUMsYUFBUSxXQUFVLHNCQUFxQixtQkFBZ0IsYUFDdEQ7QUFBQSwrQkFBQyxRQUFHLElBQUcsYUFBWSwyQ0FBbkI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUE4QztBQUFBLFFBQzlDLHVCQUFDLGdCQUFXLFdBQVUsNENBQ3BCLGlDQUFDLE9BQUM7QUFBQTtBQUFBLFVBQzhCO0FBQUEsVUFDOUIsdUJBQUMsT0FBRSxNQUFNQSxVQUFVLHlCQUFuQjtBQUFBO0FBQUE7QUFBQTtBQUFBLGlCQUE0QjtBQUFBLFVBQUk7QUFBQSxhQUZsQztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBR0EsS0FKRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBS0E7QUFBQSxXQVBGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFRQTtBQUFBLE1BRUEsdUJBQUMsYUFBUSxXQUFVLHNCQUFxQixtQkFBZ0IsV0FDdEQ7QUFBQSwrQkFBQyxRQUFHLElBQUcsV0FBVSxnQ0FBakI7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFpQztBQUFBLFFBQ2pDLHVCQUFDLFNBQUksV0FBVSw4Q0FDYixpQ0FBQyxZQUFPLE1BQUssVUFBUyxXQUFVLGdCQUFlLFVBQVEsb0NBQXZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFFQSxLQUhGO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFJQTtBQUFBLFdBTkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQU9BO0FBQUEsTUFFQSx1QkFBQyxPQUFFLFdBQVUsMEJBQXdCO0FBQUE7QUFBQSxRQUMzQix1QkFBQyxVQUFLLFdBQVUsd0JBQXVCLG1EQUF2QztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBQTBFO0FBQUEsV0FEcEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsU0FsR0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQW1HQSxLQXBHRjtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBcUdBO0FBQUEsRUFFSjtBQUNGIiwibmFtZXMiOlsiYnVpbGRSb3V0ZUhyZWYiLCJTSEVMTF9ST1VURV9UQUJTIiwiU3R5bGVndWlkZVR5cG9ncmFwaHlTZWN0aW9uIiwiU1RZTEVHVUlERV9ST1VURV9SVU5USU1FIiwiZXhwb3J0TmFtZSIsImxvYWRNb2R1bGUiLCJob21lSHJlZiIsInJlbmRlckJ1dHRvbkJhclNwZWNpbWVuIiwibWFwIiwidGFiIiwiaWNvbk9ubHkiLCJyb3V0ZUlkIiwidW5kZWZpbmVkIiwiaWNvbiIsImxhYmVsIiwicmVuZGVyU291bmRPbkljb24iLCJnZXRTdHlsZWd1aWRlUm91dGVWaWV3IiwiYm9keUNsYXNzIiwic3R1ZGlvV2luZG93Q2xhc3NOYW1lIiwic3R1ZGlvV2luZG93Q29udGVudCIsImhlYWRlckNvbnRlbnQiLCJtYWluQ29udGVudCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJTdHlsZWd1aWRlUm91dGUuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGJ1aWxkUm91dGVIcmVmLCBTSEVMTF9ST1VURV9UQUJTIH0gZnJvbSAnLi4vLi4vbGliL3JvdXRlcy5qcyc7XG5pbXBvcnQgeyBTdHlsZWd1aWRlVHlwb2dyYXBoeVNlY3Rpb24gfSBmcm9tICcuL1N0eWxlZ3VpZGVUeXBvZ3JhcGh5LmpzeCc7XG5cbmV4cG9ydCBjb25zdCBTVFlMRUdVSURFX1JPVVRFX1JVTlRJTUUgPSB7XG4gIGV4cG9ydE5hbWU6ICdib290c3RyYXBTdHlsZWd1aWRlJyxcbiAgbG9hZE1vZHVsZTogKCkgPT4gaW1wb3J0KCcuL3N0eWxlZ3VpZGUtYm9vdHN0cmFwLmpzJyksXG59O1xuXG5jb25zdCBob21lSHJlZiA9IGJ1aWxkUm91dGVIcmVmKCdob21lJyk7XG5cbmZ1bmN0aW9uIHJlbmRlckJ1dHRvbkJhclNwZWNpbWVuKCkge1xuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwiYnV0dG9uLWJhciBzaGVsbC1ib3R0b20tYmFuZCBzdHlsZWd1aWRlLWJ1dHRvbi1iYXJcIiBkYXRhLWJ1dHRvbi1iYXI+XG4gICAgICA8bmF2IGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX3ByaW1hcnktYnV0dG9ucyBzaGVsbC10YWItbmF2XCIgYXJpYS1sYWJlbD1cIkJ1dHRvbiBCYXIgc3BlY2ltZW5cIj5cbiAgICAgICAge1NIRUxMX1JPVVRFX1RBQlMubWFwKCh0YWIpID0+IChcbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICBrZXk9e3RhYi5yb3V0ZUlkfVxuICAgICAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgICAgICBjbGFzc05hbWU9e2BidXR0b24tYmFyX19idXR0b24gc2hlbGwtdGFiJHt0YWIuaWNvbk9ubHkgPyAnIGJ1dHRvbi1iYXJfX2J1dHRvbi0taWNvbi1vbmx5IHNoZWxsLXRhYi0taWNvbi1vbmx5JyA6ICcnfWB9XG4gICAgICAgICAgICBkYXRhLXJvdXRlLXRhYj17dGFiLnJvdXRlSWR9XG4gICAgICAgICAgICBkYXRhLXN0YXRlPXt0YWIucm91dGVJZCA9PT0gJ3BvcnRmb2xpbycgPyAnYWN0aXZlJyA6ICdpZGxlJ31cbiAgICAgICAgICAgIGFyaWEtY3VycmVudD17dGFiLnJvdXRlSWQgPT09ICdwb3J0Zm9saW8nID8gJ3BhZ2UnIDogdW5kZWZpbmVkfVxuICAgICAgICAgICAgZGlzYWJsZWRcbiAgICAgICAgICA+XG4gICAgICAgICAgICA8aSBjbGFzc05hbWU9e2B0aSAke3RhYi5pY29ufSBidXR0b24tYmFyX19pY29uIHNoZWxsLXRhYl9faWNvbmB9IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJidXR0b24tYmFyX19sYWJlbCBzaGVsbC10YWJfX2xhYmVsXCI+e3RhYi5sYWJlbH08L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICkpfVxuICAgICAgPC9uYXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX3NlY29uZGFyeS1idXR0b25zXCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbD1cIlNlY29uZGFyeSBjb250cm9scyBzcGVjaW1lblwiPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJidXR0b24tYmFyX19zZWNvbmRhcnktYnV0dG9uIHNoZWxsLXRhYiBzaGVsbC10YWItLWljb24tb25seVwiIGFyaWEtbGFiZWw9XCJTb3VuZCBvZmZcIiBkaXNhYmxlZD5cbiAgICAgICAgICA8aSBjbGFzc05hbWU9XCJ0aSB0aS12b2x1bWUtb2ZmIGJ1dHRvbi1iYXJfX3NlY29uZGFyeS1pY29uIHNoZWxsLXRhYl9faWNvblwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzc05hbWU9XCJidXR0b24tYmFyX19zZWNvbmRhcnktYnV0dG9uIGJ1dHRvbi1iYXJfX3RoZW1lLXRvZ2dsZSBzaGVsbC10YWIgc2hlbGwtdGFiLS1pY29uLW9ubHlcIiBhcmlhLWxhYmVsPVwiVGhlbWVcIiBkaXNhYmxlZD5cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJidXR0b24tYmFyX190aGVtZS10aHVtYlwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgIDwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICk7XG59XG5cbmZ1bmN0aW9uIHJlbmRlclNvdW5kT25JY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxzdmcgY2xhc3NOYW1lPVwic291bmQtdG9nZ2xlX19pY29uIHNvdW5kLXRvZ2dsZV9faWNvbi0tb25cIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgZm9jdXNhYmxlPVwiZmFsc2VcIj5cbiAgICAgIDxwYXRoIGQ9XCJNNSA5LjI1djUuNWgzLjZsNC42IDMuNTVWNS43TDguNiA5LjI1SDV6XCIgLz5cbiAgICAgIDxwYXRoIGQ9XCJNMTYuMTUgOC42YzEuNCAxLjU1IDEuNCA1LjI1IDAgNi44XCIgLz5cbiAgICAgIDxwYXRoIGQ9XCJNMTguNzUgNi4yYzIuMjUgMi42NSAyLjI1IDguOTUgMCAxMS42XCIgLz5cbiAgICA8L3N2Zz5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0eWxlZ3VpZGVSb3V0ZVZpZXcoKSB7XG4gIHJldHVybiB7XG4gICAgYm9keUNsYXNzOiAnYm9keSBzdHlsZWd1aWRlLXBhZ2UnLFxuICAgIHN0dWRpb1dpbmRvd0NsYXNzTmFtZTogJ3N0eWxlZ3VpZGUtd2FsbCB3LWVtYmVkJyxcbiAgICBzdHVkaW9XaW5kb3dDb250ZW50OiA8ZGl2IGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtYmFja2Ryb3BcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPixcbiAgICBoZWFkZXJDb250ZW50OiAoXG4gICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cInVpLXRvcFwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInVpLXRvcC1tYWluIHJvdXRlLXRvcGJhclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19sZWZ0XCI+XG4gICAgICAgICAgICA8YSBocmVmPXtob21lSHJlZn0gY2xhc3NOYW1lPVwiZ2F0ZS1iYWNrIGFicy1pY29uLWJ0blwiIGFyaWEtbGFiZWw9XCJCYWNrIHRvIGhvbWVcIj5cbiAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPVwidGkgdGktYXJyb3ctbGVmdFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICA8L2E+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX2NlbnRlclwiIC8+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX3JpZ2h0IHVpLXRvcC1yaWdodFwiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9oZWFkZXI+XG4gICAgKSxcbiAgICBtYWluQ29udGVudDogKFxuICAgICAgPG1haW4gY2xhc3NOYW1lPVwidWktY2VudGVyLXNwYWNlciBzdHlsZWd1aWRlLW1haW5cIiBhcmlhLWxhYmVsPVwiQ29tcG9uZW50IGxpYnJhcnlcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLWRvY1wiPlxuICAgICAgICAgIDxoMSBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLWRvY19fdGl0bGVcIj5Db21wb25lbnQgbGlicmFyeTwvaDE+XG4gICAgICAgICAgPHAgY2xhc3NOYW1lPVwic3R5bGVndWlkZS1kb2NfX2xlZGVcIj5cbiAgICAgICAgICAgIFRoZSBwZXJzaXN0ZW50IEJ1dHRvbiBCYXIgb3ducyBwcmltYXJ5IG5hdmlnYXRpb24uIFJvdXRlIHRvcCBiYXJzIGFyZSBvcHRpb25hbCB1dGlsaXR5IHN0cmlwczsgaWNvbiBhY3Rpb25zIHVzZXsnICd9XG4gICAgICAgICAgICA8Y29kZSBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLWRvY19fY29kZVwiPi5hYnMtaWNvbi1idG48L2NvZGU+LiBLZWVwIEFib3V0IE1lIHRpdGxlLWNhc2VkLlxuICAgICAgICAgIDwvcD5cblxuICAgICAgICAgIDxTdHlsZWd1aWRlVHlwb2dyYXBoeVNlY3Rpb24gLz5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtc2VjdGlvblwiIGFyaWEtbGFiZWxsZWRieT1cInNnLWJ1dHRvbi1iYXJcIj5cbiAgICAgICAgICAgIDxoMiBpZD1cInNnLWJ1dHRvbi1iYXJcIj5CdXR0b24gQmFyIG5hdmlnYXRpb248L2gyPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwic3R5bGVndWlkZS1zZWN0aW9uX19oaW50XCI+XG4gICAgICAgICAgICAgIFJvdXRlIGRlZmluaXRpb25zIGFuZCBsYWJlbHMgY29tZSBmcm9tIDxjb2RlIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtZG9jX19jb2RlXCI+U0hFTExfUk9VVEVfVEFCUzwvY29kZT4uIFRoZSBzcGVjaW1lbiBzaG93cyBQb3J0Zm9saW8gYWN0aXZlLCBhbG9uZ3NpZGUgaWRsZSByb3V0ZXMgYW5kIHRoZSBzb3VuZC90aGVtZSBncm91cC5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIHtyZW5kZXJCdXR0b25CYXJTcGVjaW1lbigpfVxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtc2VjdGlvblwiIGFyaWEtbGFiZWxsZWRieT1cInNnLXJvdXRlLXRvcGJhclwiPlxuICAgICAgICAgICAgPGgyIGlkPVwic2ctcm91dGUtdG9wYmFyXCI+Um91dGUgdXRpbGl0eSB0b3AgYmFyPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtc2VjdGlvbl9faGludFwiPlxuICAgICAgICAgICAgICBVc2Ugb25seSB3aGVuIGEgcm91dGUgbmVlZHMgYSBiYWNrIG9yIHV0aWxpdHkgYWN0aW9uLiBQcmltYXJ5IHJvdXRlIHN3aXRjaGluZyByZW1haW5zIGluIHRoZSBCdXR0b24gQmFyLlxuICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLXRvcGJhci1mcmFtZVwiPlxuICAgICAgICAgICAgICA8aGVhZGVyIGNsYXNzTmFtZT1cInVpLXRvcFwiPlxuICAgICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidWktdG9wLW1haW4gcm91dGUtdG9wYmFyXCI+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLXRvcGJhcl9fbGVmdFwiPlxuICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJnYXRlLWJhY2sgYWJzLWljb24tYnRuIHN0eWxlZ3VpZGUtZmFrZS1pY29uXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICAgICAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPVwidGkgdGktYXJyb3ctbGVmdFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX2NlbnRlclwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLXRvcGJhcl9fcmlnaHQgdWktdG9wLXJpZ2h0XCI+XG4gICAgICAgICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cInNvdW5kLXRvZ2dsZSBhYnMtaWNvbi1idG5cIiBhcmlhLWxhYmVsPVwiU2FtcGxlIHNvdW5kIG9uXCIgZGF0YS1lbmFibGVkPVwidHJ1ZVwiIGFyaWEtcHJlc3NlZD1cInRydWVcIiBkaXNhYmxlZD5cbiAgICAgICAgICAgICAgICAgICAgICB7cmVuZGVyU291bmRPbkljb24oKX1cbiAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPC9oZWFkZXI+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLXNlY3Rpb25cIiBhcmlhLWxhYmVsbGVkYnk9XCJzZy1pY29uXCI+XG4gICAgICAgICAgICA8aDIgaWQ9XCJzZy1pY29uXCI+SWNvbiBmcmFtZSBidXR0b25zPC9oMj5cbiAgICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtc2VjdGlvbl9faGludFwiPlxuICAgICAgICAgICAgICA8Y29kZSBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLWRvY19fY29kZVwiPi5hYnMtaWNvbi1idG48L2NvZGU+IOKAlCBzb3VuZCB0b2dnbGUsIGdhdGUgYmFjaywgc29jaWFscy5cbiAgICAgICAgICAgIDwvcD5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3R5bGVndWlkZS1zYW1wbGUtcm93XCI+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cInNvdW5kLXRvZ2dsZSBhYnMtaWNvbi1idG5cIiBhcmlhLWxhYmVsPVwiU2FtcGxlIG11dGVcIiBkaXNhYmxlZD5cbiAgICAgICAgICAgICAgICA8aSBjbGFzc05hbWU9XCJ0aSB0aS12b2x1bWUtb2ZmXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cInNvdW5kLXRvZ2dsZSBhYnMtaWNvbi1idG5cIiBhcmlhLWxhYmVsPVwiU2FtcGxlIHNvdW5kIG9uXCIgZGF0YS1lbmFibGVkPVwidHJ1ZVwiIGFyaWEtcHJlc3NlZD1cInRydWVcIiBkaXNhYmxlZD5cbiAgICAgICAgICAgICAgICB7cmVuZGVyU291bmRPbkljb24oKX1cbiAgICAgICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgICAgIDxhIGhyZWY9e2hvbWVIcmVmfSBjbGFzc05hbWU9XCJnYXRlLWJhY2sgYWJzLWljb24tYnRuXCIgYXJpYS1sYWJlbD1cIlNhbXBsZSBiYWNrXCI+XG4gICAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPVwidGkgdGktYXJyb3ctbGVmdFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtc2VjdGlvblwiIGFyaWEtbGFiZWxsZWRieT1cInNnLWxlZ2VuZFwiPlxuICAgICAgICAgICAgPGgyIGlkPVwic2ctbGVnZW5kXCI+RXhwZXJ0aXNlIGxlZ2VuZCByb3c8L2gyPlxuICAgICAgICAgICAgPG5hdiBjbGFzc05hbWU9XCJsZWdlbmQgc3R5bGVndWlkZS1sZWdlbmQtZGVtb1wiIGFyaWEtbGFiZWw9XCJTYW1wbGUgbGVnZW5kXCI+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGVnZW5kX19pdGVtXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjaXJjbGUgYmctYmFsbC0xXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICAgICAgICA8c3Bhbj5TdHJhdGVneTwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibGVnZW5kX19pdGVtXCI+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJjaXJjbGUgYmctYmFsbC0yXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICAgICAgICA8c3Bhbj5Qcm9kdWN0PC9zcGFuPlxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsZWdlbmRfX2l0ZW1cIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNpcmNsZSBiZy1iYWxsLTNcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICAgICAgICAgIDxzcGFuPk1vdGlvbjwvc3Bhbj5cbiAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L25hdj5cbiAgICAgICAgICA8L3NlY3Rpb24+XG5cbiAgICAgICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJzdHlsZWd1aWRlLXNlY3Rpb25cIiBhcmlhLWxhYmVsbGVkYnk9XCJzZy1zY3JpcHRcIj5cbiAgICAgICAgICAgIDxoMiBpZD1cInNnLXNjcmlwdFwiPlN1cHBvcnRpbmcgZGVzY3JpcHRpb24gY29weTwvaDI+XG4gICAgICAgICAgICA8YmxvY2txdW90ZSBjbGFzc05hbWU9XCJkZWNvcmF0aXZlLXNjcmlwdCBzdHlsZWd1aWRlLXNjcmlwdC1kZW1vXCI+XG4gICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgIFNhbXBsZSBwaGlsb3NvcGh5IGxpbmUgd2l0aCBheycgJ31cbiAgICAgICAgICAgICAgICA8YSBocmVmPXtob21lSHJlZn0+dGV4dCBsaW5rPC9hPi5cbiAgICAgICAgICAgICAgPC9wPlxuICAgICAgICAgICAgPC9ibG9ja3F1b3RlPlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtc2VjdGlvblwiIGFyaWEtbGFiZWxsZWRieT1cInNnLW1ldGFcIj5cbiAgICAgICAgICAgIDxoMiBpZD1cInNnLW1ldGFcIj5NZXRhIC8gdGltZSBjaGlwPC9oMj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwic3R5bGVndWlkZS1zYW1wbGUtcm93IHN0eWxlZ3VpZGUtbWV0YS1kZW1vXCI+XG4gICAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cImFicy1tZXRhLWJ0blwiIGRpc2FibGVkPlxuICAgICAgICAgICAgICAgIExvbmRvbiDCtyAxMjowMFxuICAgICAgICAgICAgICA8L2J1dHRvbj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvc2VjdGlvbj5cblxuICAgICAgICAgIDxwIGNsYXNzTmFtZT1cInN0eWxlZ3VpZGUtZG9jX19mb290ZXJcIj5cbiAgICAgICAgICAgIFNvdXJjZTogPGNvZGUgY2xhc3NOYW1lPVwic3R5bGVndWlkZS1kb2NfX2NvZGVcIj5kb2NzL3JlZmVyZW5jZS9DT01QT05FTlQtTElCUkFSWS5tZDwvY29kZT5cbiAgICAgICAgICA8L3A+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9tYWluPlxuICAgICksXG4gIH07XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL3N0eWxlZ3VpZGUvU3R5bGVndWlkZVJvdXRlLmpzeCJ9