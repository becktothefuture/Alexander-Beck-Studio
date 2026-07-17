import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/simulation-focus/SimulationIcon.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
const ICON_PROPS = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
const DOT_PROPS = {
  fill: "currentColor",
  stroke: "none"
};
const ICONS = {
  pit: PitIcon,
  flies: FliesIcon,
  "3d-cube": CubeIcon,
  water: WaterIcon,
  "repel-room": RepelRoomIcon,
  "wall-repel": RepelRoomIcon,
  "3d-sphere": SphereIcon,
  "starfield-3d": StarfieldIcon,
  "napoleon-point-cloud": PointCloudIcon,
  "pressure-crucible": PressureMosaicIcon,
  "flock-of-birds": FlockIcon,
  "flubber-blob": FlubberBlobIcon,
  "weave-field": WeaveFieldIcon,
  shapes: ShapesIcon,
  "mineral-growth": MineralGrowthIcon,
  "kaleidoscope-3": KaleidoscopeIcon,
  "kaleidoscope-rift": KaleidoscopeRiftIcon,
  "rift-rings": RiftRingsIcon,
  bubbles: BubblesIcon,
  "beach-ball-room": BeachBallRoomIcon
};
export function SimulationIcon({ id, className, title }) {
  const Icon = ICONS[id] || GenericSimulationIcon;
  const accessibilityProps = title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
  return /* @__PURE__ */ jsxDEV(
    "svg",
    {
      ...accessibilityProps,
      className,
      viewBox: "0 0 48 48",
      width: "24",
      height: "24",
      focusable: "false",
      xmlns: "http://www.w3.org/2000/svg",
      children: [
        title ? /* @__PURE__ */ jsxDEV("title", { children: title }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
          lineNumber: 53,
          columnNumber: 16
        }, this) : null,
        /* @__PURE__ */ jsxDEV(Icon, {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
          lineNumber: 54,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 44,
      columnNumber: 5
    },
    this
  );
}
_c = SimulationIcon;
function PitIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M12 18L12 30C12 34 15 37 19 37H29C33 37 36 34 36 30V18" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 62,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M18 30C19.1046 30 20 29.1046 20 28C20 26.8954 19.1046 26 18 26C16.8954 26 16 26.8954 16 28C16 29.1046 16.8954 30 18 30Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 63,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M23 26C24.1046 26 25 25.1046 25 24C25 22.8954 24.1046 22 23 22C21.8954 22 21 22.8954 21 24C21 25.1046 21.8954 26 23 26Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 64,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M26 17C27.1046 17 28 16.1046 28 15C28 13.8954 27.1046 13 26 13C24.8954 13 24 13.8954 24 15C24 16.1046 24.8954 17 26 17Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 65,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M31 24C32.1046 24 33 23.1046 33 22C33 20.8954 32.1046 20 31 20C29.8954 20 29 20.8954 29 22C29 23.1046 29.8954 24 31 24Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 66,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M21 34C22.1046 34 23 33.1046 23 32C23 30.8954 22.1046 30 21 30C19.8954 30 19 30.8954 19 32C19 33.1046 19.8954 34 21 34Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 67,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M27 31C28.1046 31 29 30.1046 29 29C29 27.8954 28.1046 27 27 27C25.8954 27 25 27.8954 25 29C25 30.1046 25.8954 31 27 31Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 68,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 61,
    columnNumber: 5
  }, this);
}
_c2 = PitIcon;
function FliesIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M34 21.2C36.3196 21.2 38.2 19.3196 38.2 17C38.2 14.6804 36.3196 12.8 34 12.8C31.6805 12.8 29.8 14.6804 29.8 17C29.8 19.3196 31.6805 21.2 34 21.2Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 76,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M34 10V12.8M34 21.2V24M27 17H29.8M38.2 17H41" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 77,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M18 22C19.1046 22 20 21.1046 20 20C20 18.8954 19.1046 18 18 18C16.8954 18 16 18.8954 16 20C16 21.1046 16.8954 22 18 22Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 78,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M25 27C26.1046 27 27 26.1046 27 25C27 23.8954 26.1046 23 25 23C23.8954 23 23 23.8954 23 25C23 26.1046 23.8954 27 25 27Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 79,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M20 31C21.1046 31 22 30.1046 22 29C22 27.8954 21.1046 27 20 27C18.8954 27 18 27.8954 18 29C18 30.1046 18.8954 31 20 31Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 80,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M15 36C16.1046 36 17 35.1046 17 34C17 32.8954 16.1046 32 15 32C13.8954 32 13 32.8954 13 34C13 35.1046 13.8954 36 15 36Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 81,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M28 34C29.1046 34 30 33.1046 30 32C30 30.8954 29.1046 30 28 30C26.8954 30 26 30.8954 26 32C26 33.1046 26.8954 34 28 34Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 82,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 75,
    columnNumber: 5
  }, this);
}
_c3 = FliesIcon;
function CubeIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M14 18L24 12L34 18V30L24 36L14 30V18Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 90,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M14 18L24 24M24 24L34 18M24 24V36" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 91,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 20C15.1046 20 16 19.1046 16 18C16 16.8954 15.1046 16 14 16C12.8954 16 12 16.8954 12 18C12 19.1046 12.8954 20 14 20Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 92,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M24 14C25.1046 14 26 13.1046 26 12C26 10.8954 25.1046 10 24 10C22.8954 10 22 10.8954 22 12C22 13.1046 22.8954 14 24 14Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 93,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M34 20C35.1046 20 36 19.1046 36 18C36 16.8954 35.1046 16 34 16C32.8954 16 32 16.8954 32 18C32 19.1046 32.8954 20 34 20Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 94,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 32C15.1046 32 16 31.1046 16 30C16 28.8954 15.1046 28 14 28C12.8954 28 12 28.8954 12 30C12 31.1046 12.8954 32 14 32Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 95,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M24 38C25.1046 38 26 37.1046 26 36C26 34.8954 25.1046 34 24 34C22.8954 34 22 34.8954 22 36C22 37.1046 22.8954 38 24 38Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 96,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M34 32C35.1046 32 36 31.1046 36 30C36 28.8954 35.1046 28 34 28C32.8954 28 32 28.8954 32 30C32 31.1046 32.8954 32 34 32Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 97,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 89,
    columnNumber: 5
  }, this);
}
_c4 = CubeIcon;
function WaterIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M8 17C13 17 13 14 18 14C23 14 23 17 28 17C33 17 33 14 38 14" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 105,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M8 36C13 36 13 33 18 33C23 33 23 36 28 36C33 36 33 33 38 33" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 106,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M32 26C30.8954 26 30 25.1046 30 24C30 22.8954 30.8954 22 32 22C33.1046 22 34 22.8954 34 24C34 25.1046 33.1046 26 32 26Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 107,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M23 30C21.8954 30 21 29.1046 21 28C21 26.8954 21.8954 26 23 26C24.1046 26 25 26.8954 25 28C25 29.1046 24.1046 30 23 30Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 108,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 26C12.8954 26 12 25.1046 12 24C12 22.8954 12.8954 22 14 22C15.1046 22 16 22.8954 16 24C16 25.1046 15.1046 26 14 26Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 109,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 104,
    columnNumber: 5
  }, this);
}
_c5 = WaterIcon;
function RepelRoomIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, strokeWidth: 2.5, d: "M16 12V36" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 117,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M22 20C23.1046 20 24 19.1046 24 18C24 16.8954 23.1046 16 22 16C20.8954 16 20 16.8954 20 18C20 19.1046 20.8954 20 22 20Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 118,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M33 25C34.1046 25 35 24.1046 35 23C35 21.8954 34.1046 21 33 21C31.8954 21 31 21.8954 31 23C31 24.1046 31.8954 25 33 25Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 119,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M26 32C27.1046 32 28 31.1046 28 30C28 28.8954 27.1046 28 26 28C24.8954 28 24 28.8954 24 30C24 31.1046 24.8954 32 26 32Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 120,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 116,
    columnNumber: 5
  }, this);
}
_c6 = RepelRoomIcon;
function SphereIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M27.0753 35.4771C33.4139 33.7787 37.1756 27.2633 35.4771 20.9247C33.7787 14.5861 27.2634 10.8245 20.9247 12.5229C14.5861 14.2213 10.8245 20.7366 12.5229 27.0753C14.2213 33.4139 20.7367 37.1755 27.0753 35.4771Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 128,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M27.0754 35.4771C30.0009 34.6932 30.9956 28.9193 29.2972 22.5806C27.5988 16.242 23.8503 11.739 20.9248 12.5229C17.9993 13.3068 17.0045 19.0807 18.703 25.4194C20.4014 31.758 24.1499 36.261 27.0754 35.4771Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 129,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M12.5229 27.0753C20.6424 28.6847 29.2502 26.3782 35.4772 20.9247" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 130,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 127,
    columnNumber: 5
  }, this);
}
_c7 = SphereIcon;
function StarfieldIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "22.15", cy: "23.15", r: "1.15" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 138,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "16.35", cy: "17.35", r: "1.35" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 139,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "28.45", cy: "20.45", r: "1.45" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 140,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "17.65", cy: "28.65", r: "1.65" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 141,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "28.85", cy: "28.85", r: "1.85" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 142,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "10.1", cy: "11.1", r: "2.1" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 143,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "35.35", cy: "15.35", r: "2.35" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 144,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "10.45", cy: "34.45", r: "2.45" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 145,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "36.85", cy: "36.85", r: "2.85" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 146,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 137,
    columnNumber: 5
  }, this);
}
_c8 = StarfieldIcon;
function PointCloudIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M17.9999 10.8469C24.5669 6.65539 35.8759 9.59823 34.8591 19.6754C34.8449 19.816 34.7979 19.9555 34.7254 20.0767L33.3924 22.3051L37 27.1296C33.4058 28.0308 33.7779 30.8008 33.2388 33.5148C32.9035 35.2025 31.0796 35.8081 29.3908 35.4781C21.8355 34.0019 21.1859 37.7449 19.5633 41" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 154,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M26 31C27.1046 31 28 30.1046 28 29C28 27.8954 27.1046 27 26 27C24.8954 27 24 27.8954 24 29C24 30.1046 24.8954 31 26 31Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 155,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M20 28C21.1046 28 22 27.1046 22 26C22 24.8954 21.1046 24 20 24C18.8954 24 18 24.8954 18 26C18 27.1046 18.8954 28 20 28Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 156,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 22C15.1046 22 16 21.1046 16 20C16 18.8954 15.1046 18 14 18C12.8954 18 12 18.8954 12 20C12 21.1046 12.8954 22 14 22Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 157,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M26 22C27.1046 22 28 21.1046 28 20C28 18.8954 27.1046 18 26 18C24.8954 18 24 18.8954 24 20C24 21.1046 24.8954 22 26 22Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 158,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 153,
    columnNumber: 5
  }, this);
}
_c9 = PointCloudIcon;
function PressureMosaicIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M15 21C16.1046 21 17 20.1046 17 19C17 17.8954 16.1046 17 15 17C13.8954 17 13 17.8954 13 19C13 20.1046 13.8954 21 15 21Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 166,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M24 18C25.1046 18 26 17.1046 26 16C26 14.8954 25.1046 14 24 14C22.8954 14 22 14.8954 22 16C22 17.1046 22.8954 18 24 18Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 167,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M33 21C34.1046 21 35 20.1046 35 19C35 17.8954 34.1046 17 33 17C31.8954 17 31 17.8954 31 19C31 20.1046 31.8954 21 33 21Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 168,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M11 29C12.1046 29 13 28.1046 13 27C13 25.8954 12.1046 25 11 25C9.89543 25 9 25.8954 9 27C9 28.1046 9.89543 29 11 29Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 169,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M19 35C20.1046 35 21 34.1046 21 33C21 31.8954 20.1046 31 19 31C17.8954 31 17 31.8954 17 33C17 34.1046 17.8954 35 19 35Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 170,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M29 35C30.1046 35 31 34.1046 31 33C31 31.8954 30.1046 31 29 31C27.8954 31 27 31.8954 27 33C27 34.1046 27.8954 35 29 35Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 171,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M37 29C38.1046 29 39 28.1046 39 27C39 25.8954 38.1046 25 37 25C35.8954 25 35 25.8954 35 27C35 28.1046 35.8954 29 37 29Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 172,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 165,
    columnNumber: 5
  }, this);
}
_c0 = PressureMosaicIcon;
function FlockIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M38 27C39.1046 27 40 26.1046 40 25C40 23.8954 39.1046 23 38 23C36.8954 23 36 23.8954 36 25C36 26.1046 36.8954 27 38 27Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 180,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M22 27C23.1046 27 24 26.1046 24 25C24 23.8954 23.1046 23 22 23C20.8954 23 20 23.8954 20 25C20 26.1046 20.8954 27 22 27Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 181,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 23C15.1046 23 16 22.1046 16 21C16 19.8954 15.1046 19 14 19C12.8954 19 12 19.8954 12 21C12 22.1046 12.8954 23 14 23Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 182,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 31C15.1046 31 16 30.1046 16 29C16 27.8954 15.1046 27 14 27C12.8954 27 12 27.8954 12 29C12 30.1046 12.8954 31 14 31Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 183,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M30 23C31.1046 23 32 22.1046 32 21C32 19.8954 31.1046 19 30 19C28.8954 19 28 19.8954 28 21C28 22.1046 28.8954 23 30 23Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 184,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M30 31C31.1046 31 32 30.1046 32 29C32 27.8954 31.1046 27 30 27C28.8954 27 28 27.8954 28 29C28 30.1046 28.8954 31 30 31Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 185,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M22 19C23.1046 19 24 18.1046 24 17C24 15.8954 23.1046 15 22 15C20.8954 15 20 15.8954 20 17C20 18.1046 20.8954 19 22 19Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 186,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M22 35C23.1046 35 24 34.1046 24 33C24 31.8954 23.1046 31 22 31C20.8954 31 20 31.8954 20 33C20 34.1046 20.8954 35 22 35Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 187,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 15C15.1046 15 16 14.1046 16 13C16 11.8954 15.1046 11 14 11C12.8954 11 12 11.8954 12 13C12 14.1046 12.8954 15 14 15Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 188,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 39C15.1046 39 16 38.1046 16 37C16 35.8954 15.1046 35 14 35C12.8954 35 12 35.8954 12 37C12 38.1046 12.8954 39 14 39Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 189,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 179,
    columnNumber: 5
  }, this);
}
_c1 = FlockIcon;
function FlubberBlobIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M12.2792 29.8569C11.4559 28.1937 11.2797 26.2839 11.7848 24.4982L12.0094 23.7043C12.7427 21.1118 14.5287 18.9451 16.9336 17.7305L20.6693 15.8438C25.1569 13.5773 30.6076 14.6123 33.952 18.3659L34.7705 19.2845C36.7821 21.5422 37.5017 24.6707 36.6787 27.5804C36.1356 29.5006 34.9594 31.1808 33.3411 32.3484L31.8824 33.4008C29.5404 35.0906 26.7169 36 23.8289 36C21.104 36 18.4326 35.1869 16.1723 33.6649L14.8069 32.7454C13.7276 32.0186 12.8564 31.023 12.2792 29.8569Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 197,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M18 28C19.1046 28 20 27.1046 20 26C20 24.8954 19.1046 24 18 24C16.8954 24 16 24.8954 16 26C16 27.1046 16.8954 28 18 28Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 198,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M22 23C23.1046 23 24 22.1046 24 21C24 19.8954 23.1046 19 22 19C20.8954 19 20 19.8954 20 21C20 22.1046 20.8954 23 22 23Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 199,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M25 32C26.1046 32 27 31.1046 27 30C27 28.8954 26.1046 28 25 28C23.8954 28 23 28.8954 23 30C23 31.1046 23.8954 32 25 32Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 200,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M30 25C31.1046 25 32 24.1046 32 23C32 21.8954 31.1046 21 30 21C28.8954 21 28 21.8954 28 23C28 24.1046 28.8954 25 30 25Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 201,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 196,
    columnNumber: 5
  }, this);
}
_c10 = FlubberBlobIcon;
function WeaveFieldIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M10 18H18M24 18H38" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 209,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M10 30H24M30 30H38" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 210,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M17 10V17M17 23V38" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 211,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M31 10V29M31 35V38" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 212,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M17 20C18.1046 20 19 19.1046 19 18C19 16.8954 18.1046 16 17 16C15.8954 16 15 16.8954 15 18C15 19.1046 15.8954 20 17 20Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 213,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M31 32C32.1046 32 33 31.1046 33 30C33 28.8954 32.1046 28 31 28C29.8954 28 29 28.8954 29 30C29 31.1046 29.8954 32 31 32Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 214,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 208,
    columnNumber: 5
  }, this);
}
_c11 = WeaveFieldIcon;
function ShapesIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M10.9328 24C12.1356 24 13.1106 23.0249 13.1106 21.8221C13.1106 20.6193 12.1356 19.6443 10.9328 19.6443C9.72995 19.6443 8.75488 20.6193 8.75488 21.8221C8.75488 23.0249 9.72995 24 10.9328 24Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 222,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M10.9328 30.5337C12.1356 30.5337 13.1106 29.5586 13.1106 28.3558C13.1106 27.153 12.1356 26.1779 10.9328 26.1779C9.72995 26.1779 8.75488 27.153 8.75488 28.3558C8.75488 29.5586 9.72995 30.5337 10.9328 30.5337Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 223,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M17.4663 30.5337C18.6691 30.5337 19.6442 29.5586 19.6442 28.3558C19.6442 27.153 18.6691 26.1779 17.4663 26.1779C16.2635 26.1779 15.2885 27.153 15.2885 28.3558C15.2885 29.5586 16.2635 30.5337 17.4663 30.5337Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 224,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M10.9328 37.0673C12.1356 37.0673 13.1106 36.0922 13.1106 34.8894C13.1106 33.6866 12.1356 32.7115 10.9328 32.7115C9.72995 32.7115 8.75488 33.6866 8.75488 34.8894C8.75488 36.0922 9.72995 37.0673 10.9328 37.0673Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 225,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M17.4663 37.0673C18.6691 37.0673 19.6442 36.0922 19.6442 34.8894C19.6442 33.6866 18.6691 32.7115 17.4663 32.7115C16.2635 32.7115 15.2885 33.6866 15.2885 34.8894C15.2885 36.0922 16.2635 37.0673 17.4663 37.0673Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 226,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M24 37.0673C25.2028 37.0673 26.1779 36.0922 26.1779 34.8894C26.1779 33.6866 25.2028 32.7115 24 32.7115C22.7972 32.7115 21.8221 33.6866 21.8221 34.8894C21.8221 36.0922 22.7972 37.0673 24 37.0673Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 227,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M30.7204 17.9174C31.571 17.0669 31.571 15.688 30.7204 14.8374C29.8699 13.9869 28.491 13.9869 27.6405 14.8374C26.7899 15.688 26.7899 17.0669 27.6405 17.9174C28.491 18.768 29.8699 18.768 30.7204 17.9174Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 228,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M35.3404 13.2974C36.191 12.4469 36.191 11.0679 35.3404 10.2174C34.4899 9.3669 33.111 9.3669 32.2605 10.2174C31.4099 11.0679 31.4099 12.4469 32.2605 13.2974C33.111 14.1479 34.4899 14.1479 35.3404 13.2974Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 229,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M35.3404 22.5374C36.191 21.6869 36.191 20.308 35.3404 19.4574C34.4899 18.6069 33.111 18.6069 32.2605 19.4574C31.4099 20.308 31.4099 21.6869 32.2605 22.5374C33.111 23.3879 34.4899 23.3879 35.3404 22.5374Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 230,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M39.9604 17.9174C40.811 17.0669 40.811 15.6879 39.9604 14.8374C39.1099 13.9869 37.731 13.9869 36.8804 14.8374C36.0299 15.6879 36.0299 17.0669 36.8804 17.9174C37.731 18.7679 39.1099 18.7679 39.9604 17.9174Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 231,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 221,
    columnNumber: 5
  }, this);
}
_c12 = ShapesIcon;
function MineralGrowthIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M36 29L28 15L18.5 20L14 36L24 38" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 239,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M24 38L18.5 20L11 10L28 15L24 38ZM24 38L36 29" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 240,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 238,
    columnNumber: 5
  }, this);
}
_c13 = MineralGrowthIcon;
function KaleidoscopeIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M24 10L31 24L24 38L17 24L24 10Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 248,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M10 24L24 17L38 24L24 31L10 24Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 249,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M24 26C25.1046 26 26 25.1046 26 24C26 22.8954 25.1046 22 24 22C22.8954 22 22 22.8954 22 24C22 25.1046 22.8954 26 24 26Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 250,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 16C15.1046 16 16 15.1046 16 14C16 12.8954 15.1046 12 14 12C12.8954 12 12 12.8954 12 14C12 15.1046 12.8954 16 14 16Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 251,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M35 16C36.1046 16 37 15.1046 37 14C37 12.8954 36.1046 12 35 12C33.8954 12 33 12.8954 33 14C33 15.1046 33.8954 16 35 16Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 252,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M35 37C36.1046 37 37 36.1046 37 35C37 33.8954 36.1046 33 35 33C33.8954 33 33 33.8954 33 35C33 36.1046 33.8954 37 35 37Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 253,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M14 37C15.1046 37 16 36.1046 16 35C16 33.8954 15.1046 33 14 33C12.8954 33 12 33.8954 12 35C12 36.1046 12.8954 37 14 37Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 254,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 247,
    columnNumber: 5
  }, this);
}
_c14 = KaleidoscopeIcon;
function KaleidoscopeRiftIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M24 9L30 20L24 25L18 20L24 9Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 262,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M24 39L18 28L24 23L30 28L24 39Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 263,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M9 24L20 18L25 24L20 30L9 24Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 264,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M39 24L28 30L23 24L28 18L39 24Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 265,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...DOT_PROPS, d: "M24 26C25.1046 26 26 25.1046 26 24C26 22.8954 25.1046 22 24 22C22.8954 22 22 22.8954 22 24C22 25.1046 22.8954 26 24 26Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 266,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 261,
    columnNumber: 5
  }, this);
}
_c15 = KaleidoscopeRiftIcon;
function RiftRingsIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("circle", { ...ICON_PROPS, cx: "24", cy: "24", r: "5" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 274,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...ICON_PROPS, cx: "24", cy: "24", r: "11" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 275,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...ICON_PROPS, cx: "24", cy: "24", r: "17" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 276,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 273,
    columnNumber: 5
  }, this);
}
_c16 = RiftRingsIcon;
function BubblesIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "18", cy: "36", r: "2.2" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 284,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "29", cy: "35", r: "1.8" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 285,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "23", cy: "30", r: "2.7" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 286,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "33", cy: "27", r: "2.1" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 287,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "16", cy: "25", r: "1.7" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 288,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "26", cy: "20", r: "2.4" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 289,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "34", cy: "16", r: "1.6" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 290,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "20", cy: "12", r: "2" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 291,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 283,
    columnNumber: 5
  }, this);
}
_c17 = BubblesIcon;
function BeachBallRoomIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M36.7061 9.93619H11.2939C10.018 9.93619 8.98364 11.081 8.98364 12.4932V35.5068C8.98364 36.919 10.018 38.0638 11.2939 38.0638H36.7061C37.982 38.0638 39.0164 36.919 39.0164 35.5068V12.4932C39.0164 11.081 37.982 9.93619 36.7061 9.93619Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 299,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M24 32C28.4183 32 32 28.4183 32 24C32 19.5817 28.4183 16 24 16C19.5817 16 16 19.5817 16 24C16 28.4183 19.5817 32 24 32Z" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 300,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M24 16C28 19 28 26 25 32M16 25C21 28 27 28 32 25M19 19C23 21 25 21 29 19" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 301,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 298,
    columnNumber: 5
  }, this);
}
_c18 = BeachBallRoomIcon;
function GenericSimulationIcon() {
  return /* @__PURE__ */ jsxDEV("g", { children: [
    /* @__PURE__ */ jsxDEV("circle", { ...ICON_PROPS, cx: "24", cy: "24", r: "12" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 309,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "24", cy: "14", r: "2" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 310,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "32", cy: "24", r: "2.4" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 311,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "24", cy: "34", r: "2" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 312,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("circle", { ...DOT_PROPS, cx: "16", cy: "24", r: "2.4" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 313,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M18 18c4 4 8 4 12 0" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 314,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { ...ICON_PROPS, d: "M18 30c4-4 8-4 12 0" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
      lineNumber: 315,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx",
    lineNumber: 308,
    columnNumber: 5
  }, this);
}
_c19 = GenericSimulationIcon;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0, _c1, _c10, _c11, _c12, _c13, _c14, _c15, _c16, _c17, _c18, _c19;
$RefreshReg$(_c, "SimulationIcon");
$RefreshReg$(_c2, "PitIcon");
$RefreshReg$(_c3, "FliesIcon");
$RefreshReg$(_c4, "CubeIcon");
$RefreshReg$(_c5, "WaterIcon");
$RefreshReg$(_c6, "RepelRoomIcon");
$RefreshReg$(_c7, "SphereIcon");
$RefreshReg$(_c8, "StarfieldIcon");
$RefreshReg$(_c9, "PointCloudIcon");
$RefreshReg$(_c0, "PressureMosaicIcon");
$RefreshReg$(_c1, "FlockIcon");
$RefreshReg$(_c10, "FlubberBlobIcon");
$RefreshReg$(_c11, "WeaveFieldIcon");
$RefreshReg$(_c12, "ShapesIcon");
$RefreshReg$(_c13, "MineralGrowthIcon");
$RefreshReg$(_c14, "KaleidoscopeIcon");
$RefreshReg$(_c15, "KaleidoscopeRiftIcon");
$RefreshReg$(_c16, "RiftRingsIcon");
$RefreshReg$(_c17, "BubblesIcon");
$RefreshReg$(_c18, "BeachBallRoomIcon");
$RefreshReg$(_c19, "GenericSimulationIcon");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/simulation-focus/SimulationIcon.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QztBQUFBO0FBQUE7QUFBQTtBQUFBLFdBQThDO0FBQUEsSUFDOUMsdUJBQUMsVUFBSyxHQUFJTixZQUFZLEdBQUUseUJBQXhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FBNkM7QUFBQSxJQUM3Qyx1QkFBQyxVQUFLLEdBQUlBLFlBQVksR0FBRSx5QkFBeEI7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQUE2QztBQUFBLE9BUC9DO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FRQTtBQUVKO0FBQUM0RCxPQVpRdkI7QUFBcUIsSUFBQUcsSUFBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsS0FBQUMsTUFBQUMsTUFBQUMsTUFBQUMsTUFBQUMsTUFBQUMsTUFBQUMsTUFBQUMsTUFBQUMsTUFBQUM7QUFBQSxhQUFBcEIsSUFBQTtBQUFBLGFBQUFDLEtBQUE7QUFBQSxhQUFBQyxLQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFDLEtBQUE7QUFBQSxhQUFBQyxLQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFDLEtBQUE7QUFBQSxhQUFBQyxLQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFDLEtBQUE7QUFBQSxhQUFBQyxNQUFBO0FBQUEsYUFBQUMsTUFBQTtBQUFBLGFBQUFDLE1BQUE7QUFBQSxhQUFBQyxNQUFBO0FBQUEsYUFBQUMsTUFBQTtBQUFBLGFBQUFDLE1BQUE7QUFBQSxhQUFBQyxNQUFBO0FBQUEsYUFBQUMsTUFBQTtBQUFBLGFBQUFDLE1BQUE7QUFBQSxhQUFBQyxNQUFBIiwibmFtZXMiOlsiSUNPTl9QUk9QUyIsImZpbGwiLCJzdHJva2UiLCJzdHJva2VXaWR0aCIsInN0cm9rZUxpbmVjYXAiLCJzdHJva2VMaW5lam9pbiIsIkRPVF9QUk9QUyIsIklDT05TIiwicGl0IiwiUGl0SWNvbiIsImZsaWVzIiwiRmxpZXNJY29uIiwiQ3ViZUljb24iLCJ3YXRlciIsIldhdGVySWNvbiIsIlJlcGVsUm9vbUljb24iLCJTcGhlcmVJY29uIiwiU3RhcmZpZWxkSWNvbiIsIlBvaW50Q2xvdWRJY29uIiwiUHJlc3N1cmVNb3NhaWNJY29uIiwiRmxvY2tJY29uIiwiRmx1YmJlckJsb2JJY29uIiwiV2VhdmVGaWVsZEljb24iLCJzaGFwZXMiLCJTaGFwZXNJY29uIiwiTWluZXJhbEdyb3d0aEljb24iLCJLYWxlaWRvc2NvcGVJY29uIiwiS2FsZWlkb3Njb3BlUmlmdEljb24iLCJSaWZ0UmluZ3NJY29uIiwiYnViYmxlcyIsIkJ1YmJsZXNJY29uIiwiQmVhY2hCYWxsUm9vbUljb24iLCJTaW11bGF0aW9uSWNvbiIsImlkIiwiY2xhc3NOYW1lIiwidGl0bGUiLCJJY29uIiwiR2VuZXJpY1NpbXVsYXRpb25JY29uIiwiYWNjZXNzaWJpbGl0eVByb3BzIiwicm9sZSIsIl9jIiwiX2MyIiwiX2MzIiwiX2M0IiwiX2M1IiwiX2M2IiwiX2M3IiwiX2M4IiwiX2M5IiwiX2MwIiwiX2MxIiwiX2MxMCIsIl9jMTEiLCJfYzEyIiwiX2MxMyIsIl9jMTQiLCJfYzE1IiwiX2MxNiIsIl9jMTciLCJfYzE4IiwiX2MxOSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJTaW11bGF0aW9uSWNvbi5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgSUNPTl9QUk9QUyA9IHtcbiAgZmlsbDogJ25vbmUnLFxuICBzdHJva2U6ICdjdXJyZW50Q29sb3InLFxuICBzdHJva2VXaWR0aDogMixcbiAgc3Ryb2tlTGluZWNhcDogJ3JvdW5kJyxcbiAgc3Ryb2tlTGluZWpvaW46ICdyb3VuZCcsXG59O1xuXG5jb25zdCBET1RfUFJPUFMgPSB7XG4gIGZpbGw6ICdjdXJyZW50Q29sb3InLFxuICBzdHJva2U6ICdub25lJyxcbn07XG5cbmNvbnN0IElDT05TID0ge1xuICBwaXQ6IFBpdEljb24sXG4gIGZsaWVzOiBGbGllc0ljb24sXG4gICczZC1jdWJlJzogQ3ViZUljb24sXG4gIHdhdGVyOiBXYXRlckljb24sXG4gICdyZXBlbC1yb29tJzogUmVwZWxSb29tSWNvbixcbiAgJ3dhbGwtcmVwZWwnOiBSZXBlbFJvb21JY29uLFxuICAnM2Qtc3BoZXJlJzogU3BoZXJlSWNvbixcbiAgJ3N0YXJmaWVsZC0zZCc6IFN0YXJmaWVsZEljb24sXG4gICduYXBvbGVvbi1wb2ludC1jbG91ZCc6IFBvaW50Q2xvdWRJY29uLFxuICAncHJlc3N1cmUtY3J1Y2libGUnOiBQcmVzc3VyZU1vc2FpY0ljb24sXG4gICdmbG9jay1vZi1iaXJkcyc6IEZsb2NrSWNvbixcbiAgJ2ZsdWJiZXItYmxvYic6IEZsdWJiZXJCbG9iSWNvbixcbiAgJ3dlYXZlLWZpZWxkJzogV2VhdmVGaWVsZEljb24sXG4gIHNoYXBlczogU2hhcGVzSWNvbixcbiAgJ21pbmVyYWwtZ3Jvd3RoJzogTWluZXJhbEdyb3d0aEljb24sXG4gICdrYWxlaWRvc2NvcGUtMyc6IEthbGVpZG9zY29wZUljb24sXG4gICdrYWxlaWRvc2NvcGUtcmlmdCc6IEthbGVpZG9zY29wZVJpZnRJY29uLFxuICAncmlmdC1yaW5ncyc6IFJpZnRSaW5nc0ljb24sXG4gIGJ1YmJsZXM6IEJ1YmJsZXNJY29uLFxuICAnYmVhY2gtYmFsbC1yb29tJzogQmVhY2hCYWxsUm9vbUljb24sXG59O1xuXG5leHBvcnQgZnVuY3Rpb24gU2ltdWxhdGlvbkljb24oeyBpZCwgY2xhc3NOYW1lLCB0aXRsZSB9KSB7XG4gIGNvbnN0IEljb24gPSBJQ09OU1tpZF0gfHwgR2VuZXJpY1NpbXVsYXRpb25JY29uO1xuICBjb25zdCBhY2Nlc3NpYmlsaXR5UHJvcHMgPSB0aXRsZVxuICAgID8geyByb2xlOiAnaW1nJywgJ2FyaWEtbGFiZWwnOiB0aXRsZSB9XG4gICAgOiB7ICdhcmlhLWhpZGRlbic6IHRydWUgfTtcblxuICByZXR1cm4gKFxuICAgIDxzdmdcbiAgICAgIHsuLi5hY2Nlc3NpYmlsaXR5UHJvcHN9XG4gICAgICBjbGFzc05hbWU9e2NsYXNzTmFtZX1cbiAgICAgIHZpZXdCb3g9XCIwIDAgNDggNDhcIlxuICAgICAgd2lkdGg9XCIyNFwiXG4gICAgICBoZWlnaHQ9XCIyNFwiXG4gICAgICBmb2N1c2FibGU9XCJmYWxzZVwiXG4gICAgICB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCJcbiAgICA+XG4gICAgICB7dGl0bGUgPyA8dGl0bGU+e3RpdGxlfTwvdGl0bGU+IDogbnVsbH1cbiAgICAgIDxJY29uIC8+XG4gICAgPC9zdmc+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFBpdEljb24oKSB7XG4gIHJldHVybiAoXG4gICAgPGc+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0xMiAxOEwxMiAzMEMxMiAzNCAxNSAzNyAxOSAzN0gyOUMzMyAzNyAzNiAzNCAzNiAzMFYxOFwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTE4IDMwQzE5LjEwNDYgMzAgMjAgMjkuMTA0NiAyMCAyOEMyMCAyNi44OTU0IDE5LjEwNDYgMjYgMTggMjZDMTYuODk1NCAyNiAxNiAyNi44OTU0IDE2IDI4QzE2IDI5LjEwNDYgMTYuODk1NCAzMCAxOCAzMFpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yMyAyNkMyNC4xMDQ2IDI2IDI1IDI1LjEwNDYgMjUgMjRDMjUgMjIuODk1NCAyNC4xMDQ2IDIyIDIzIDIyQzIxLjg5NTQgMjIgMjEgMjIuODk1NCAyMSAyNEMyMSAyNS4xMDQ2IDIxLjg5NTQgMjYgMjMgMjZaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMjYgMTdDMjcuMTA0NiAxNyAyOCAxNi4xMDQ2IDI4IDE1QzI4IDEzLjg5NTQgMjcuMTA0NiAxMyAyNiAxM0MyNC44OTU0IDEzIDI0IDEzLjg5NTQgMjQgMTVDMjQgMTYuMTA0NiAyNC44OTU0IDE3IDI2IDE3WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTMxIDI0QzMyLjEwNDYgMjQgMzMgMjMuMTA0NiAzMyAyMkMzMyAyMC44OTU0IDMyLjEwNDYgMjAgMzEgMjBDMjkuODk1NCAyMCAyOSAyMC44OTU0IDI5IDIyQzI5IDIzLjEwNDYgMjkuODk1NCAyNCAzMSAyNFpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yMSAzNEMyMi4xMDQ2IDM0IDIzIDMzLjEwNDYgMjMgMzJDMjMgMzAuODk1NCAyMi4xMDQ2IDMwIDIxIDMwQzE5Ljg5NTQgMzAgMTkgMzAuODk1NCAxOSAzMkMxOSAzMy4xMDQ2IDE5Ljg5NTQgMzQgMjEgMzRaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMjcgMzFDMjguMTA0NiAzMSAyOSAzMC4xMDQ2IDI5IDI5QzI5IDI3Ljg5NTQgMjguMTA0NiAyNyAyNyAyN0MyNS44OTU0IDI3IDI1IDI3Ljg5NTQgMjUgMjlDMjUgMzAuMTA0NiAyNS44OTU0IDMxIDI3IDMxWlwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuXG5mdW5jdGlvbiBGbGllc0ljb24oKSB7XG4gIHJldHVybiAoXG4gICAgPGc+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0zNCAyMS4yQzM2LjMxOTYgMjEuMiAzOC4yIDE5LjMxOTYgMzguMiAxN0MzOC4yIDE0LjY4MDQgMzYuMzE5NiAxMi44IDM0IDEyLjhDMzEuNjgwNSAxMi44IDI5LjggMTQuNjgwNCAyOS44IDE3QzI5LjggMTkuMzE5NiAzMS42ODA1IDIxLjIgMzQgMjEuMlpcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMzQgMTBWMTIuOE0zNCAyMS4yVjI0TTI3IDE3SDI5LjhNMzguMiAxN0g0MVwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTE4IDIyQzE5LjEwNDYgMjIgMjAgMjEuMTA0NiAyMCAyMEMyMCAxOC44OTU0IDE5LjEwNDYgMTggMTggMThDMTYuODk1NCAxOCAxNiAxOC44OTU0IDE2IDIwQzE2IDIxLjEwNDYgMTYuODk1NCAyMiAxOCAyMlpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yNSAyN0MyNi4xMDQ2IDI3IDI3IDI2LjEwNDYgMjcgMjVDMjcgMjMuODk1NCAyNi4xMDQ2IDIzIDI1IDIzQzIzLjg5NTQgMjMgMjMgMjMuODk1NCAyMyAyNUMyMyAyNi4xMDQ2IDIzLjg5NTQgMjcgMjUgMjdaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMjAgMzFDMjEuMTA0NiAzMSAyMiAzMC4xMDQ2IDIyIDI5QzIyIDI3Ljg5NTQgMjEuMTA0NiAyNyAyMCAyN0MxOC44OTU0IDI3IDE4IDI3Ljg5NTQgMTggMjlDMTggMzAuMTA0NiAxOC44OTU0IDMxIDIwIDMxWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTE1IDM2QzE2LjEwNDYgMzYgMTcgMzUuMTA0NiAxNyAzNEMxNyAzMi44OTU0IDE2LjEwNDYgMzIgMTUgMzJDMTMuODk1NCAzMiAxMyAzMi44OTU0IDEzIDM0QzEzIDM1LjEwNDYgMTMuODk1NCAzNiAxNSAzNlpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yOCAzNEMyOS4xMDQ2IDM0IDMwIDMzLjEwNDYgMzAgMzJDMzAgMzAuODk1NCAyOS4xMDQ2IDMwIDI4IDMwQzI2Ljg5NTQgMzAgMjYgMzAuODk1NCAyNiAzMkMyNiAzMy4xMDQ2IDI2Ljg5NTQgMzQgMjggMzRaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEN1YmVJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMTQgMThMMjQgMTJMMzQgMThWMzBMMjQgMzZMMTQgMzBWMThaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTE0IDE4TDI0IDI0TTI0IDI0TDM0IDE4TTI0IDI0VjM2XCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTQgMjBDMTUuMTA0NiAyMCAxNiAxOS4xMDQ2IDE2IDE4QzE2IDE2Ljg5NTQgMTUuMTA0NiAxNiAxNCAxNkMxMi44OTU0IDE2IDEyIDE2Ljg5NTQgMTIgMThDMTIgMTkuMTA0NiAxMi44OTU0IDIwIDE0IDIwWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI0IDE0QzI1LjEwNDYgMTQgMjYgMTMuMTA0NiAyNiAxMkMyNiAxMC44OTU0IDI1LjEwNDYgMTAgMjQgMTBDMjIuODk1NCAxMCAyMiAxMC44OTU0IDIyIDEyQzIyIDEzLjEwNDYgMjIuODk1NCAxNCAyNCAxNFpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zNCAyMEMzNS4xMDQ2IDIwIDM2IDE5LjEwNDYgMzYgMThDMzYgMTYuODk1NCAzNS4xMDQ2IDE2IDM0IDE2QzMyLjg5NTQgMTYgMzIgMTYuODk1NCAzMiAxOEMzMiAxOS4xMDQ2IDMyLjg5NTQgMjAgMzQgMjBaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTQgMzJDMTUuMTA0NiAzMiAxNiAzMS4xMDQ2IDE2IDMwQzE2IDI4Ljg5NTQgMTUuMTA0NiAyOCAxNCAyOEMxMi44OTU0IDI4IDEyIDI4Ljg5NTQgMTIgMzBDMTIgMzEuMTA0NiAxMi44OTU0IDMyIDE0IDMyWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI0IDM4QzI1LjEwNDYgMzggMjYgMzcuMTA0NiAyNiAzNkMyNiAzNC44OTU0IDI1LjEwNDYgMzQgMjQgMzRDMjIuODk1NCAzNCAyMiAzNC44OTU0IDIyIDM2QzIyIDM3LjEwNDYgMjIuODk1NCAzOCAyNCAzOFpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zNCAzMkMzNS4xMDQ2IDMyIDM2IDMxLjEwNDYgMzYgMzBDMzYgMjguODk1NCAzNS4xMDQ2IDI4IDM0IDI4QzMyLjg5NTQgMjggMzIgMjguODk1NCAzMiAzMEMzMiAzMS4xMDQ2IDMyLjg5NTQgMzIgMzQgMzJaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFdhdGVySWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8Zz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTggMTdDMTMgMTcgMTMgMTQgMTggMTRDMjMgMTQgMjMgMTcgMjggMTdDMzMgMTcgMzMgMTQgMzggMTRcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNOCAzNkMxMyAzNiAxMyAzMyAxOCAzM0MyMyAzMyAyMyAzNiAyOCAzNkMzMyAzNiAzMyAzMyAzOCAzM1wiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTMyIDI2QzMwLjg5NTQgMjYgMzAgMjUuMTA0NiAzMCAyNEMzMCAyMi44OTU0IDMwLjg5NTQgMjIgMzIgMjJDMzMuMTA0NiAyMiAzNCAyMi44OTU0IDM0IDI0QzM0IDI1LjEwNDYgMzMuMTA0NiAyNiAzMiAyNlpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yMyAzMEMyMS44OTU0IDMwIDIxIDI5LjEwNDYgMjEgMjhDMjEgMjYuODk1NCAyMS44OTU0IDI2IDIzIDI2QzI0LjEwNDYgMjYgMjUgMjYuODk1NCAyNSAyOEMyNSAyOS4xMDQ2IDI0LjEwNDYgMzAgMjMgMzBaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTQgMjZDMTIuODk1NCAyNiAxMiAyNS4xMDQ2IDEyIDI0QzEyIDIyLjg5NTQgMTIuODk1NCAyMiAxNCAyMkMxNS4xMDQ2IDIyIDE2IDIyLjg5NTQgMTYgMjRDMTYgMjUuMTA0NiAxNS4xMDQ2IDI2IDE0IDI2WlwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuXG5mdW5jdGlvbiBSZXBlbFJvb21JY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IHN0cm9rZVdpZHRoPXsyLjV9IGQ9XCJNMTYgMTJWMzZcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yMiAyMEMyMy4xMDQ2IDIwIDI0IDE5LjEwNDYgMjQgMThDMjQgMTYuODk1NCAyMy4xMDQ2IDE2IDIyIDE2QzIwLjg5NTQgMTYgMjAgMTYuODk1NCAyMCAxOEMyMCAxOS4xMDQ2IDIwLjg5NTQgMjAgMjIgMjBaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMzMgMjVDMzQuMTA0NiAyNSAzNSAyNC4xMDQ2IDM1IDIzQzM1IDIxLjg5NTQgMzQuMTA0NiAyMSAzMyAyMUMzMS44OTU0IDIxIDMxIDIxLjg5NTQgMzEgMjNDMzEgMjQuMTA0NiAzMS44OTU0IDI1IDMzIDI1WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI2IDMyQzI3LjEwNDYgMzIgMjggMzEuMTA0NiAyOCAzMEMyOCAyOC44OTU0IDI3LjEwNDYgMjggMjYgMjhDMjQuODk1NCAyOCAyNCAyOC44OTU0IDI0IDMwQzI0IDMxLjEwNDYgMjQuODk1NCAzMiAyNiAzMlpcIiAvPlxuICAgIDwvZz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU3BoZXJlSWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8Zz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTI3LjA3NTMgMzUuNDc3MUMzMy40MTM5IDMzLjc3ODcgMzcuMTc1NiAyNy4yNjMzIDM1LjQ3NzEgMjAuOTI0N0MzMy43Nzg3IDE0LjU4NjEgMjcuMjYzNCAxMC44MjQ1IDIwLjkyNDcgMTIuNTIyOUMxNC41ODYxIDE0LjIyMTMgMTAuODI0NSAyMC43MzY2IDEyLjUyMjkgMjcuMDc1M0MxNC4yMjEzIDMzLjQxMzkgMjAuNzM2NyAzNy4xNzU1IDI3LjA3NTMgMzUuNDc3MVpcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMjcuMDc1NCAzNS40NzcxQzMwLjAwMDkgMzQuNjkzMiAzMC45OTU2IDI4LjkxOTMgMjkuMjk3MiAyMi41ODA2QzI3LjU5ODggMTYuMjQyIDIzLjg1MDMgMTEuNzM5IDIwLjkyNDggMTIuNTIyOUMxNy45OTkzIDEzLjMwNjggMTcuMDA0NSAxOS4wODA3IDE4LjcwMyAyNS40MTk0QzIwLjQwMTQgMzEuNzU4IDI0LjE0OTkgMzYuMjYxIDI3LjA3NTQgMzUuNDc3MVpcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMTIuNTIyOSAyNy4wNzUzQzIwLjY0MjQgMjguNjg0NyAyOS4yNTAyIDI2LjM3ODIgMzUuNDc3MiAyMC45MjQ3XCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFN0YXJmaWVsZEljb24oKSB7XG4gIHJldHVybiAoXG4gICAgPGc+XG4gICAgICA8Y2lyY2xlIHsuLi5ET1RfUFJPUFN9IGN4PVwiMjIuMTVcIiBjeT1cIjIzLjE1XCIgcj1cIjEuMTVcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjE2LjM1XCIgY3k9XCIxNy4zNVwiIHI9XCIxLjM1XCIgLz5cbiAgICAgIDxjaXJjbGUgey4uLkRPVF9QUk9QU30gY3g9XCIyOC40NVwiIGN5PVwiMjAuNDVcIiByPVwiMS40NVwiIC8+XG4gICAgICA8Y2lyY2xlIHsuLi5ET1RfUFJPUFN9IGN4PVwiMTcuNjVcIiBjeT1cIjI4LjY1XCIgcj1cIjEuNjVcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjI4Ljg1XCIgY3k9XCIyOC44NVwiIHI9XCIxLjg1XCIgLz5cbiAgICAgIDxjaXJjbGUgey4uLkRPVF9QUk9QU30gY3g9XCIxMC4xXCIgY3k9XCIxMS4xXCIgcj1cIjIuMVwiIC8+XG4gICAgICA8Y2lyY2xlIHsuLi5ET1RfUFJPUFN9IGN4PVwiMzUuMzVcIiBjeT1cIjE1LjM1XCIgcj1cIjIuMzVcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjEwLjQ1XCIgY3k9XCIzNC40NVwiIHI9XCIyLjQ1XCIgLz5cbiAgICAgIDxjaXJjbGUgey4uLkRPVF9QUk9QU30gY3g9XCIzNi44NVwiIGN5PVwiMzYuODVcIiByPVwiMi44NVwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuXG5mdW5jdGlvbiBQb2ludENsb3VkSWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8Zz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTE3Ljk5OTkgMTAuODQ2OUMyNC41NjY5IDYuNjU1MzkgMzUuODc1OSA5LjU5ODIzIDM0Ljg1OTEgMTkuNjc1NEMzNC44NDQ5IDE5LjgxNiAzNC43OTc5IDE5Ljk1NTUgMzQuNzI1NCAyMC4wNzY3TDMzLjM5MjQgMjIuMzA1MUwzNyAyNy4xMjk2QzMzLjQwNTggMjguMDMwOCAzMy43Nzc5IDMwLjgwMDggMzMuMjM4OCAzMy41MTQ4QzMyLjkwMzUgMzUuMjAyNSAzMS4wNzk2IDM1LjgwODEgMjkuMzkwOCAzNS40NzgxQzIxLjgzNTUgMzQuMDAxOSAyMS4xODU5IDM3Ljc0NDkgMTkuNTYzMyA0MVwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI2IDMxQzI3LjEwNDYgMzEgMjggMzAuMTA0NiAyOCAyOUMyOCAyNy44OTU0IDI3LjEwNDYgMjcgMjYgMjdDMjQuODk1NCAyNyAyNCAyNy44OTU0IDI0IDI5QzI0IDMwLjEwNDYgMjQuODk1NCAzMSAyNiAzMVpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yMCAyOEMyMS4xMDQ2IDI4IDIyIDI3LjEwNDYgMjIgMjZDMjIgMjQuODk1NCAyMS4xMDQ2IDI0IDIwIDI0QzE4Ljg5NTQgMjQgMTggMjQuODk1NCAxOCAyNkMxOCAyNy4xMDQ2IDE4Ljg5NTQgMjggMjAgMjhaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTQgMjJDMTUuMTA0NiAyMiAxNiAyMS4xMDQ2IDE2IDIwQzE2IDE4Ljg5NTQgMTUuMTA0NiAxOCAxNCAxOEMxMi44OTU0IDE4IDEyIDE4Ljg5NTQgMTIgMjBDMTIgMjEuMTA0NiAxMi44OTU0IDIyIDE0IDIyWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI2IDIyQzI3LjEwNDYgMjIgMjggMjEuMTA0NiAyOCAyMEMyOCAxOC44OTU0IDI3LjEwNDYgMTggMjYgMThDMjQuODk1NCAxOCAyNCAxOC44OTU0IDI0IDIwQzI0IDIxLjEwNDYgMjQuODk1NCAyMiAyNiAyMlpcIiAvPlxuICAgIDwvZz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUHJlc3N1cmVNb3NhaWNJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xNSAyMUMxNi4xMDQ2IDIxIDE3IDIwLjEwNDYgMTcgMTlDMTcgMTcuODk1NCAxNi4xMDQ2IDE3IDE1IDE3QzEzLjg5NTQgMTcgMTMgMTcuODk1NCAxMyAxOUMxMyAyMC4xMDQ2IDEzLjg5NTQgMjEgMTUgMjFaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMjQgMThDMjUuMTA0NiAxOCAyNiAxNy4xMDQ2IDI2IDE2QzI2IDE0Ljg5NTQgMjUuMTA0NiAxNCAyNCAxNEMyMi44OTU0IDE0IDIyIDE0Ljg5NTQgMjIgMTZDMjIgMTcuMTA0NiAyMi44OTU0IDE4IDI0IDE4WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTMzIDIxQzM0LjEwNDYgMjEgMzUgMjAuMTA0NiAzNSAxOUMzNSAxNy44OTU0IDM0LjEwNDYgMTcgMzMgMTdDMzEuODk1NCAxNyAzMSAxNy44OTU0IDMxIDE5QzMxIDIwLjEwNDYgMzEuODk1NCAyMSAzMyAyMVpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xMSAyOUMxMi4xMDQ2IDI5IDEzIDI4LjEwNDYgMTMgMjdDMTMgMjUuODk1NCAxMi4xMDQ2IDI1IDExIDI1QzkuODk1NDMgMjUgOSAyNS44OTU0IDkgMjdDOSAyOC4xMDQ2IDkuODk1NDMgMjkgMTEgMjlaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTkgMzVDMjAuMTA0NiAzNSAyMSAzNC4xMDQ2IDIxIDMzQzIxIDMxLjg5NTQgMjAuMTA0NiAzMSAxOSAzMUMxNy44OTU0IDMxIDE3IDMxLjg5NTQgMTcgMzNDMTcgMzQuMTA0NiAxNy44OTU0IDM1IDE5IDM1WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI5IDM1QzMwLjEwNDYgMzUgMzEgMzQuMTA0NiAzMSAzM0MzMSAzMS44OTU0IDMwLjEwNDYgMzEgMjkgMzFDMjcuODk1NCAzMSAyNyAzMS44OTU0IDI3IDMzQzI3IDM0LjEwNDYgMjcuODk1NCAzNSAyOSAzNVpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zNyAyOUMzOC4xMDQ2IDI5IDM5IDI4LjEwNDYgMzkgMjdDMzkgMjUuODk1NCAzOC4xMDQ2IDI1IDM3IDI1QzM1Ljg5NTQgMjUgMzUgMjUuODk1NCAzNSAyN0MzNSAyOC4xMDQ2IDM1Ljg5NTQgMjkgMzcgMjlaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEZsb2NrSWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8Zz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMzggMjdDMzkuMTA0NiAyNyA0MCAyNi4xMDQ2IDQwIDI1QzQwIDIzLjg5NTQgMzkuMTA0NiAyMyAzOCAyM0MzNi44OTU0IDIzIDM2IDIzLjg5NTQgMzYgMjVDMzYgMjYuMTA0NiAzNi44OTU0IDI3IDM4IDI3WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTIyIDI3QzIzLjEwNDYgMjcgMjQgMjYuMTA0NiAyNCAyNUMyNCAyMy44OTU0IDIzLjEwNDYgMjMgMjIgMjNDMjAuODk1NCAyMyAyMCAyMy44OTU0IDIwIDI1QzIwIDI2LjEwNDYgMjAuODk1NCAyNyAyMiAyN1pcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xNCAyM0MxNS4xMDQ2IDIzIDE2IDIyLjEwNDYgMTYgMjFDMTYgMTkuODk1NCAxNS4xMDQ2IDE5IDE0IDE5QzEyLjg5NTQgMTkgMTIgMTkuODk1NCAxMiAyMUMxMiAyMi4xMDQ2IDEyLjg5NTQgMjMgMTQgMjNaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTQgMzFDMTUuMTA0NiAzMSAxNiAzMC4xMDQ2IDE2IDI5QzE2IDI3Ljg5NTQgMTUuMTA0NiAyNyAxNCAyN0MxMi44OTU0IDI3IDEyIDI3Ljg5NTQgMTIgMjlDMTIgMzAuMTA0NiAxMi44OTU0IDMxIDE0IDMxWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTMwIDIzQzMxLjEwNDYgMjMgMzIgMjIuMTA0NiAzMiAyMUMzMiAxOS44OTU0IDMxLjEwNDYgMTkgMzAgMTlDMjguODk1NCAxOSAyOCAxOS44OTU0IDI4IDIxQzI4IDIyLjEwNDYgMjguODk1NCAyMyAzMCAyM1pcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zMCAzMUMzMS4xMDQ2IDMxIDMyIDMwLjEwNDYgMzIgMjlDMzIgMjcuODk1NCAzMS4xMDQ2IDI3IDMwIDI3QzI4Ljg5NTQgMjcgMjggMjcuODk1NCAyOCAyOUMyOCAzMC4xMDQ2IDI4Ljg5NTQgMzEgMzAgMzFaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMjIgMTlDMjMuMTA0NiAxOSAyNCAxOC4xMDQ2IDI0IDE3QzI0IDE1Ljg5NTQgMjMuMTA0NiAxNSAyMiAxNUMyMC44OTU0IDE1IDIwIDE1Ljg5NTQgMjAgMTdDMjAgMTguMTA0NiAyMC44OTU0IDE5IDIyIDE5WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTIyIDM1QzIzLjEwNDYgMzUgMjQgMzQuMTA0NiAyNCAzM0MyNCAzMS44OTU0IDIzLjEwNDYgMzEgMjIgMzFDMjAuODk1NCAzMSAyMCAzMS44OTU0IDIwIDMzQzIwIDM0LjEwNDYgMjAuODk1NCAzNSAyMiAzNVpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xNCAxNUMxNS4xMDQ2IDE1IDE2IDE0LjEwNDYgMTYgMTNDMTYgMTEuODk1NCAxNS4xMDQ2IDExIDE0IDExQzEyLjg5NTQgMTEgMTIgMTEuODk1NCAxMiAxM0MxMiAxNC4xMDQ2IDEyLjg5NTQgMTUgMTQgMTVaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTQgMzlDMTUuMTA0NiAzOSAxNiAzOC4xMDQ2IDE2IDM3QzE2IDM1Ljg5NTQgMTUuMTA0NiAzNSAxNCAzNUMxMi44OTU0IDM1IDEyIDM1Ljg5NTQgMTIgMzdDMTIgMzguMTA0NiAxMi44OTU0IDM5IDE0IDM5WlwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuXG5mdW5jdGlvbiBGbHViYmVyQmxvYkljb24oKSB7XG4gIHJldHVybiAoXG4gICAgPGc+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0xMi4yNzkyIDI5Ljg1NjlDMTEuNDU1OSAyOC4xOTM3IDExLjI3OTcgMjYuMjgzOSAxMS43ODQ4IDI0LjQ5ODJMMTIuMDA5NCAyMy43MDQzQzEyLjc0MjcgMjEuMTExOCAxNC41Mjg3IDE4Ljk0NTEgMTYuOTMzNiAxNy43MzA1TDIwLjY2OTMgMTUuODQzOEMyNS4xNTY5IDEzLjU3NzMgMzAuNjA3NiAxNC42MTIzIDMzLjk1MiAxOC4zNjU5TDM0Ljc3MDUgMTkuMjg0NUMzNi43ODIxIDIxLjU0MjIgMzcuNTAxNyAyNC42NzA3IDM2LjY3ODcgMjcuNTgwNEMzNi4xMzU2IDI5LjUwMDYgMzQuOTU5NCAzMS4xODA4IDMzLjM0MTEgMzIuMzQ4NEwzMS44ODI0IDMzLjQwMDhDMjkuNTQwNCAzNS4wOTA2IDI2LjcxNjkgMzYgMjMuODI4OSAzNkMyMS4xMDQgMzYgMTguNDMyNiAzNS4xODY5IDE2LjE3MjMgMzMuNjY0OUwxNC44MDY5IDMyLjc0NTRDMTMuNzI3NiAzMi4wMTg2IDEyLjg1NjQgMzEuMDIzIDEyLjI3OTIgMjkuODU2OVpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xOCAyOEMxOS4xMDQ2IDI4IDIwIDI3LjEwNDYgMjAgMjZDMjAgMjQuODk1NCAxOS4xMDQ2IDI0IDE4IDI0QzE2Ljg5NTQgMjQgMTYgMjQuODk1NCAxNiAyNkMxNiAyNy4xMDQ2IDE2Ljg5NTQgMjggMTggMjhaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMjIgMjNDMjMuMTA0NiAyMyAyNCAyMi4xMDQ2IDI0IDIxQzI0IDE5Ljg5NTQgMjMuMTA0NiAxOSAyMiAxOUMyMC44OTU0IDE5IDIwIDE5Ljg5NTQgMjAgMjFDMjAgMjIuMTA0NiAyMC44OTU0IDIzIDIyIDIzWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI1IDMyQzI2LjEwNDYgMzIgMjcgMzEuMTA0NiAyNyAzMEMyNyAyOC44OTU0IDI2LjEwNDYgMjggMjUgMjhDMjMuODk1NCAyOCAyMyAyOC44OTU0IDIzIDMwQzIzIDMxLjEwNDYgMjMuODk1NCAzMiAyNSAzMlpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zMCAyNUMzMS4xMDQ2IDI1IDMyIDI0LjEwNDYgMzIgMjNDMzIgMjEuODk1NCAzMS4xMDQ2IDIxIDMwIDIxQzI4Ljg5NTQgMjEgMjggMjEuODk1NCAyOCAyM0MyOCAyNC4xMDQ2IDI4Ljg5NTQgMjUgMzAgMjVaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFdlYXZlRmllbGRJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMTAgMThIMThNMjQgMThIMzhcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMTAgMzBIMjRNMzAgMzBIMzhcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMTcgMTBWMTdNMTcgMjNWMzhcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMzEgMTBWMjlNMzEgMzVWMzhcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xNyAyMEMxOC4xMDQ2IDIwIDE5IDE5LjEwNDYgMTkgMThDMTkgMTYuODk1NCAxOC4xMDQ2IDE2IDE3IDE2QzE1Ljg5NTQgMTYgMTUgMTYuODk1NCAxNSAxOEMxNSAxOS4xMDQ2IDE1Ljg5NTQgMjAgMTcgMjBaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMzEgMzJDMzIuMTA0NiAzMiAzMyAzMS4xMDQ2IDMzIDMwQzMzIDI4Ljg5NTQgMzIuMTA0NiAyOCAzMSAyOEMyOS44OTU0IDI4IDI5IDI4Ljg5NTQgMjkgMzBDMjkgMzEuMTA0NiAyOS44OTU0IDMyIDMxIDMyWlwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuXG5mdW5jdGlvbiBTaGFwZXNJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xMC45MzI4IDI0QzEyLjEzNTYgMjQgMTMuMTEwNiAyMy4wMjQ5IDEzLjExMDYgMjEuODIyMUMxMy4xMTA2IDIwLjYxOTMgMTIuMTM1NiAxOS42NDQzIDEwLjkzMjggMTkuNjQ0M0M5LjcyOTk1IDE5LjY0NDMgOC43NTQ4OCAyMC42MTkzIDguNzU0ODggMjEuODIyMUM4Ljc1NDg4IDIzLjAyNDkgOS43Mjk5NSAyNCAxMC45MzI4IDI0WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTEwLjkzMjggMzAuNTMzN0MxMi4xMzU2IDMwLjUzMzcgMTMuMTEwNiAyOS41NTg2IDEzLjExMDYgMjguMzU1OEMxMy4xMTA2IDI3LjE1MyAxMi4xMzU2IDI2LjE3NzkgMTAuOTMyOCAyNi4xNzc5QzkuNzI5OTUgMjYuMTc3OSA4Ljc1NDg4IDI3LjE1MyA4Ljc1NDg4IDI4LjM1NThDOC43NTQ4OCAyOS41NTg2IDkuNzI5OTUgMzAuNTMzNyAxMC45MzI4IDMwLjUzMzdaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTcuNDY2MyAzMC41MzM3QzE4LjY2OTEgMzAuNTMzNyAxOS42NDQyIDI5LjU1ODYgMTkuNjQ0MiAyOC4zNTU4QzE5LjY0NDIgMjcuMTUzIDE4LjY2OTEgMjYuMTc3OSAxNy40NjYzIDI2LjE3NzlDMTYuMjYzNSAyNi4xNzc5IDE1LjI4ODUgMjcuMTUzIDE1LjI4ODUgMjguMzU1OEMxNS4yODg1IDI5LjU1ODYgMTYuMjYzNSAzMC41MzM3IDE3LjQ2NjMgMzAuNTMzN1pcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xMC45MzI4IDM3LjA2NzNDMTIuMTM1NiAzNy4wNjczIDEzLjExMDYgMzYuMDkyMiAxMy4xMTA2IDM0Ljg4OTRDMTMuMTEwNiAzMy42ODY2IDEyLjEzNTYgMzIuNzExNSAxMC45MzI4IDMyLjcxMTVDOS43Mjk5NSAzMi43MTE1IDguNzU0ODggMzMuNjg2NiA4Ljc1NDg4IDM0Ljg4OTRDOC43NTQ4OCAzNi4wOTIyIDkuNzI5OTUgMzcuMDY3MyAxMC45MzI4IDM3LjA2NzNaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMTcuNDY2MyAzNy4wNjczQzE4LjY2OTEgMzcuMDY3MyAxOS42NDQyIDM2LjA5MjIgMTkuNjQ0MiAzNC44ODk0QzE5LjY0NDIgMzMuNjg2NiAxOC42NjkxIDMyLjcxMTUgMTcuNDY2MyAzMi43MTE1QzE2LjI2MzUgMzIuNzExNSAxNS4yODg1IDMzLjY4NjYgMTUuMjg4NSAzNC44ODk0QzE1LjI4ODUgMzYuMDkyMiAxNi4yNjM1IDM3LjA2NzMgMTcuNDY2MyAzNy4wNjczWlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI0IDM3LjA2NzNDMjUuMjAyOCAzNy4wNjczIDI2LjE3NzkgMzYuMDkyMiAyNi4xNzc5IDM0Ljg4OTRDMjYuMTc3OSAzMy42ODY2IDI1LjIwMjggMzIuNzExNSAyNCAzMi43MTE1QzIyLjc5NzIgMzIuNzExNSAyMS44MjIxIDMzLjY4NjYgMjEuODIyMSAzNC44ODk0QzIxLjgyMjEgMzYuMDkyMiAyMi43OTcyIDM3LjA2NzMgMjQgMzcuMDY3M1pcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zMC43MjA0IDE3LjkxNzRDMzEuNTcxIDE3LjA2NjkgMzEuNTcxIDE1LjY4OCAzMC43MjA0IDE0LjgzNzRDMjkuODY5OSAxMy45ODY5IDI4LjQ5MSAxMy45ODY5IDI3LjY0MDUgMTQuODM3NEMyNi43ODk5IDE1LjY4OCAyNi43ODk5IDE3LjA2NjkgMjcuNjQwNSAxNy45MTc0QzI4LjQ5MSAxOC43NjggMjkuODY5OSAxOC43NjggMzAuNzIwNCAxNy45MTc0WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTM1LjM0MDQgMTMuMjk3NEMzNi4xOTEgMTIuNDQ2OSAzNi4xOTEgMTEuMDY3OSAzNS4zNDA0IDEwLjIxNzRDMzQuNDg5OSA5LjM2NjkgMzMuMTExIDkuMzY2OSAzMi4yNjA1IDEwLjIxNzRDMzEuNDA5OSAxMS4wNjc5IDMxLjQwOTkgMTIuNDQ2OSAzMi4yNjA1IDEzLjI5NzRDMzMuMTExIDE0LjE0NzkgMzQuNDg5OSAxNC4xNDc5IDM1LjM0MDQgMTMuMjk3NFpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0zNS4zNDA0IDIyLjUzNzRDMzYuMTkxIDIxLjY4NjkgMzYuMTkxIDIwLjMwOCAzNS4zNDA0IDE5LjQ1NzRDMzQuNDg5OSAxOC42MDY5IDMzLjExMSAxOC42MDY5IDMyLjI2MDUgMTkuNDU3NEMzMS40MDk5IDIwLjMwOCAzMS40MDk5IDIxLjY4NjkgMzIuMjYwNSAyMi41Mzc0QzMzLjExMSAyMy4zODc5IDM0LjQ4OTkgMjMuMzg3OSAzNS4zNDA0IDIyLjUzNzRaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMzkuOTYwNCAxNy45MTc0QzQwLjgxMSAxNy4wNjY5IDQwLjgxMSAxNS42ODc5IDM5Ljk2MDQgMTQuODM3NEMzOS4xMDk5IDEzLjk4NjkgMzcuNzMxIDEzLjk4NjkgMzYuODgwNCAxNC44Mzc0QzM2LjAyOTkgMTUuNjg3OSAzNi4wMjk5IDE3LjA2NjkgMzYuODgwNCAxNy45MTc0QzM3LjczMSAxOC43Njc5IDM5LjEwOTkgMTguNzY3OSAzOS45NjA0IDE3LjkxNzRaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIE1pbmVyYWxHcm93dGhJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMzYgMjlMMjggMTVMMTguNSAyMEwxNCAzNkwyNCAzOFwiIC8+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0yNCAzOEwxOC41IDIwTDExIDEwTDI4IDE1TDI0IDM4Wk0yNCAzOEwzNiAyOVwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuXG5mdW5jdGlvbiBLYWxlaWRvc2NvcGVJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMjQgMTBMMzEgMjRMMjQgMzhMMTcgMjRMMjQgMTBaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTEwIDI0TDI0IDE3TDM4IDI0TDI0IDMxTDEwIDI0WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTI0IDI2QzI1LjEwNDYgMjYgMjYgMjUuMTA0NiAyNiAyNEMyNiAyMi44OTU0IDI1LjEwNDYgMjIgMjQgMjJDMjIuODk1NCAyMiAyMiAyMi44OTU0IDIyIDI0QzIyIDI1LjEwNDYgMjIuODk1NCAyNiAyNCAyNlpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xNCAxNkMxNS4xMDQ2IDE2IDE2IDE1LjEwNDYgMTYgMTRDMTYgMTIuODk1NCAxNS4xMDQ2IDEyIDE0IDEyQzEyLjg5NTQgMTIgMTIgMTIuODk1NCAxMiAxNEMxMiAxNS4xMDQ2IDEyLjg5NTQgMTYgMTQgMTZaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5ET1RfUFJPUFN9IGQ9XCJNMzUgMTZDMzYuMTA0NiAxNiAzNyAxNS4xMDQ2IDM3IDE0QzM3IDEyLjg5NTQgMzYuMTA0NiAxMiAzNSAxMkMzMy44OTU0IDEyIDMzIDEyLjg5NTQgMzMgMTRDMzMgMTUuMTA0NiAzMy44OTU0IDE2IDM1IDE2WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uRE9UX1BST1BTfSBkPVwiTTM1IDM3QzM2LjEwNDYgMzcgMzcgMzYuMTA0NiAzNyAzNUMzNyAzMy44OTU0IDM2LjEwNDYgMzMgMzUgMzNDMzMuODk1NCAzMyAzMyAzMy44OTU0IDMzIDM1QzMzIDM2LjEwNDYgMzMuODk1NCAzNyAzNSAzN1pcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0xNCAzN0MxNS4xMDQ2IDM3IDE2IDM2LjEwNDYgMTYgMzVDMTYgMzMuODk1NCAxNS4xMDQ2IDMzIDE0IDMzQzEyLjg5NTQgMzMgMTIgMzMuODk1NCAxMiAzNUMxMiAzNi4xMDQ2IDEyLjg5NTQgMzcgMTQgMzdaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEthbGVpZG9zY29wZVJpZnRJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMjQgOUwzMCAyMEwyNCAyNUwxOCAyMEwyNCA5WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0yNCAzOUwxOCAyOEwyNCAyM0wzMCAyOEwyNCAzOVpcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNOSAyNEwyMCAxOEwyNSAyNEwyMCAzMEw5IDI0WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0zOSAyNEwyOCAzMEwyMyAyNEwyOCAxOEwzOSAyNFpcIiAvPlxuICAgICAgPHBhdGggey4uLkRPVF9QUk9QU30gZD1cIk0yNCAyNkMyNS4xMDQ2IDI2IDI2IDI1LjEwNDYgMjYgMjRDMjYgMjIuODk1NCAyNS4xMDQ2IDIyIDI0IDIyQzIyLjg5NTQgMjIgMjIgMjIuODk1NCAyMiAyNEMyMiAyNS4xMDQ2IDIyLjg5NTQgMjYgMjQgMjZaXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIFJpZnRSaW5nc0ljb24oKSB7XG4gIHJldHVybiAoXG4gICAgPGc+XG4gICAgICA8Y2lyY2xlIHsuLi5JQ09OX1BST1BTfSBjeD1cIjI0XCIgY3k9XCIyNFwiIHI9XCI1XCIgLz5cbiAgICAgIDxjaXJjbGUgey4uLklDT05fUFJPUFN9IGN4PVwiMjRcIiBjeT1cIjI0XCIgcj1cIjExXCIgLz5cbiAgICAgIDxjaXJjbGUgey4uLklDT05fUFJPUFN9IGN4PVwiMjRcIiBjeT1cIjI0XCIgcj1cIjE3XCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEJ1YmJsZXNJY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjE4XCIgY3k9XCIzNlwiIHI9XCIyLjJcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjI5XCIgY3k9XCIzNVwiIHI9XCIxLjhcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjIzXCIgY3k9XCIzMFwiIHI9XCIyLjdcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjMzXCIgY3k9XCIyN1wiIHI9XCIyLjFcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjE2XCIgY3k9XCIyNVwiIHI9XCIxLjdcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjI2XCIgY3k9XCIyMFwiIHI9XCIyLjRcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjM0XCIgY3k9XCIxNlwiIHI9XCIxLjZcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjIwXCIgY3k9XCIxMlwiIHI9XCIyXCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEJlYWNoQmFsbFJvb21JY29uKCkge1xuICByZXR1cm4gKFxuICAgIDxnPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMzYuNzA2MSA5LjkzNjE5SDExLjI5MzlDMTAuMDE4IDkuOTM2MTkgOC45ODM2NCAxMS4wODEgOC45ODM2NCAxMi40OTMyVjM1LjUwNjhDOC45ODM2NCAzNi45MTkgMTAuMDE4IDM4LjA2MzggMTEuMjkzOSAzOC4wNjM4SDM2LjcwNjFDMzcuOTgyIDM4LjA2MzggMzkuMDE2NCAzNi45MTkgMzkuMDE2NCAzNS41MDY4VjEyLjQ5MzJDMzkuMDE2NCAxMS4wODEgMzcuOTgyIDkuOTM2MTkgMzYuNzA2MSA5LjkzNjE5WlwiIC8+XG4gICAgICA8cGF0aCB7Li4uSUNPTl9QUk9QU30gZD1cIk0yNCAzMkMyOC40MTgzIDMyIDMyIDI4LjQxODMgMzIgMjRDMzIgMTkuNTgxNyAyOC40MTgzIDE2IDI0IDE2QzE5LjU4MTcgMTYgMTYgMTkuNTgxNyAxNiAyNEMxNiAyOC40MTgzIDE5LjU4MTcgMzIgMjQgMzJaXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTI0IDE2QzI4IDE5IDI4IDI2IDI1IDMyTTE2IDI1QzIxIDI4IDI3IDI4IDMyIDI1TTE5IDE5QzIzIDIxIDI1IDIxIDI5IDE5XCIgLz5cbiAgICA8L2c+XG4gICk7XG59XG5cbmZ1bmN0aW9uIEdlbmVyaWNTaW11bGF0aW9uSWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8Zz5cbiAgICAgIDxjaXJjbGUgey4uLklDT05fUFJPUFN9IGN4PVwiMjRcIiBjeT1cIjI0XCIgcj1cIjEyXCIgLz5cbiAgICAgIDxjaXJjbGUgey4uLkRPVF9QUk9QU30gY3g9XCIyNFwiIGN5PVwiMTRcIiByPVwiMlwiIC8+XG4gICAgICA8Y2lyY2xlIHsuLi5ET1RfUFJPUFN9IGN4PVwiMzJcIiBjeT1cIjI0XCIgcj1cIjIuNFwiIC8+XG4gICAgICA8Y2lyY2xlIHsuLi5ET1RfUFJPUFN9IGN4PVwiMjRcIiBjeT1cIjM0XCIgcj1cIjJcIiAvPlxuICAgICAgPGNpcmNsZSB7Li4uRE9UX1BST1BTfSBjeD1cIjE2XCIgY3k9XCIyNFwiIHI9XCIyLjRcIiAvPlxuICAgICAgPHBhdGggey4uLklDT05fUFJPUFN9IGQ9XCJNMTggMThjNCA0IDggNCAxMiAwXCIgLz5cbiAgICAgIDxwYXRoIHsuLi5JQ09OX1BST1BTfSBkPVwiTTE4IDMwYzQtNCA4LTQgMTIgMFwiIC8+XG4gICAgPC9nPlxuICApO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL2NvbXBvbmVudHMvc2ltdWxhdGlvbi1mb2N1cy9TaW11bGF0aW9uSWNvbi5qc3gifQ==