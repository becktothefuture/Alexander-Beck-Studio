import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/loader-playground/LoaderPlayground.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useMemo = __vite__cjsImport1_react["useMemo"]; const useState = __vite__cjsImport1_react["useState"];
import { withBasePath } from "/src/lib/base-path.js";
import {
  DEFAULT_LOADER_PLAYGROUND_CONFIG,
  LOADER_DOT_COLORS,
  LOADER_PLAYGROUND_CONTROL_GROUPS,
  LOADER_PLAYGROUND_VARIANTS,
  formatLoaderPlaygroundControlValue,
  getLoaderVariantDefinition,
  normalizeLoaderPlaygroundConfig,
  resolveLoaderPlaygroundControlPatch,
  resolveLoaderPlaygroundControlValue
} from "/src/routes/loader-playground/loaderPlaygroundControls.js";
import { LOADER_PLAYGROUND_REGISTRY_ENTRY } from "/src/routes/loader-playground/loaderPlaygroundRegistry.js";
import "/src/routes/loader-playground/loader-playground.css";
const CONFIG_URL = withBasePath("/config/loader-playground-demo.json");
async function loadJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}
function downloadConfig(config) {
  const blob = new Blob([`${JSON.stringify(config, null, 2)}
`], { type: "application/json" });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "loader-playground-demo.json";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}
function LoaderAnimation({ variant, settings }) {
  const style = {
    "--loader-duration": `${settings.durationMs}ms`,
    "--loader-color-cycle": `${settings.colorCycleMs}ms`,
    "--loader-dot-size": `${settings.dotSize}px`
  };
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: `loader-sample loader-sample--${variant.id} loader-sample--color-${settings.colorMode}`,
      style,
      "aria-hidden": "true",
      children: /* @__PURE__ */ jsxDEV("div", { className: "loader-orbit", children: /* @__PURE__ */ jsxDEV("div", { className: "loader-ring-plane", children: /* @__PURE__ */ jsxDEV("div", { className: "loader-radius-plane", children: /* @__PURE__ */ jsxDEV("div", { className: "loader-ring", children: LOADER_DOT_COLORS.map((color, index) => {
        const angle = index * 60;
        const colorDelay = settings.colorSyncDelayMs + settings.colorPhaseDirection * index * settings.colorPhaseStepMs;
        return /* @__PURE__ */ jsxDEV(
          "span",
          {
            className: "loader-dot",
            style: {
              "--dot-angle": `${angle}deg`,
              "--dot-counter-angle": `${-angle}deg`,
              "--dot-radius": `${settings.radius}px`,
              "--dot-radius-negative": `${-settings.radius}px`,
              "--dot-color": color,
              "--dot-color-delay": `${colorDelay}ms`
            },
            children: /* @__PURE__ */ jsxDEV("span", { className: "loader-dot-core" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
              lineNumber: 74,
              columnNumber: 21
            }, this)
          },
          `${variant.id}-${color}`,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
            lineNumber: 62,
            columnNumber: 19
          },
          this
        );
      }) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 56,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 55,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 54,
        columnNumber: 9
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 53,
        columnNumber: 7
      }, this)
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 48,
      columnNumber: 5
    },
    this
  );
}
_c = LoaderAnimation;
function LoaderCard({ config, isSelected, onSelect, variant }) {
  const settings = config.variants[variant.id] || variant.defaults;
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: `loader-playground-card${isSelected ? " is-selected" : ""}`,
      onClick: () => onSelect(variant.id),
      "aria-pressed": isSelected,
      "aria-label": `${variant.label} loader variant`,
      children: [
        /* @__PURE__ */ jsxDEV("span", { className: "loader-playground-card__meta", children: [
          /* @__PURE__ */ jsxDEV("span", { className: "loader-playground-card__index", children: String(LOADER_PLAYGROUND_VARIANTS.findIndex((item) => item.id === variant.id) + 1).padStart(2, "0") }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
            lineNumber: 97,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "loader-playground-card__label", children: variant.label }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
            lineNumber: 100,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 96,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV(LoaderAnimation, { variant, settings }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 102,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 89,
      columnNumber: 5
    },
    this
  );
}
_c2 = LoaderCard;
function LoaderPlaygroundControlRow({ config, control, onChange }) {
  const id = `loader-playground-control-${control.id}`;
  const value = resolveLoaderPlaygroundControlValue(control, config);
  const rangeValue = Number.isFinite(Number(value)) ? Number(value) : Number(control.min || 0);
  if (control.type === "select") {
    return /* @__PURE__ */ jsxDEV("label", { className: "parameterizer-row loader-playground-control-row", htmlFor: id, children: [
      /* @__PURE__ */ jsxDEV("span", { className: "parameterizer-label", title: control.label, children: control.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 117,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "parameterizer-control", children: /* @__PURE__ */ jsxDEV(
        "select",
        {
          id,
          value,
          onChange: (event) => onChange(control, event.target.value, event.target.checked),
          children: control.options.map(
            (option) => /* @__PURE__ */ jsxDEV("option", { value: option.value, children: option.label }, option.value, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
              lineNumber: 125,
              columnNumber: 13
            }, this)
          )
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 119,
          columnNumber: 11
        },
        this
      ) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 118,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "parameterizer-value", children: formatLoaderPlaygroundControlValue(value, control) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 129,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 116,
      columnNumber: 7
    }, this);
  }
  return /* @__PURE__ */ jsxDEV("label", { className: "parameterizer-row loader-playground-control-row", htmlFor: id, children: [
    /* @__PURE__ */ jsxDEV("span", { className: "parameterizer-label", title: control.label, children: control.label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 136,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("span", { className: "parameterizer-control", children: /* @__PURE__ */ jsxDEV(
      "input",
      {
        id,
        type: "range",
        min: control.min,
        max: control.max,
        step: control.step,
        value: rangeValue,
        onChange: (event) => onChange(control, event.target.value, event.target.checked)
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 138,
        columnNumber: 9
      },
      this
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 137,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("span", { className: "parameterizer-value", children: formatLoaderPlaygroundControlValue(value, control) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 148,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
    lineNumber: 135,
    columnNumber: 5
  }, this);
}
_c3 = LoaderPlaygroundControlRow;
function LoaderPlaygroundPanel({ config, saveStatus, onChange, onReset, onSave }) {
  _s();
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(
    LOADER_PLAYGROUND_CONTROL_GROUPS.map((group) => [group.title, group.initiallyOpen !== false])
  ));
  const activeVariant = getLoaderVariantDefinition(config.selectedVariant);
  return /* @__PURE__ */ jsxDEV("aside", { className: "parameterizer-panel loader-playground-panel", "aria-label": "Loader playground controls", children: [
    /* @__PURE__ */ jsxDEV("div", { className: "parameterizer-header", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "loader-playground-panel__title", children: [
        /* @__PURE__ */ jsxDEV("span", { children: "Loader" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 163,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("span", { children: "Playground" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 164,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 162,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "loader-playground-panel__status", role: "status", "aria-live": "polite", children: saveStatus }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 166,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 161,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "loader-playground-panel__active", "aria-live": "polite", children: [
      /* @__PURE__ */ jsxDEV("span", { children: activeVariant.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 171,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("span", { children: activeVariant.summary }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 172,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 170,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "parameterizer-scroll", children: LOADER_PLAYGROUND_CONTROL_GROUPS.map(
      (group) => /* @__PURE__ */ jsxDEV(
        "details",
        {
          className: "parameterizer-folder",
          open: Boolean(openGroups[group.title]),
          onToggle: (event) => {
            const isOpen = event.currentTarget.open;
            setOpenGroups(
              (current) => current[group.title] === isOpen ? current : { ...current, [group.title]: isOpen }
            );
          },
          children: [
            /* @__PURE__ */ jsxDEV("summary", { className: "parameterizer-folder-title", children: group.title }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
              lineNumber: 189,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("div", { className: "loader-playground-panel__rows", children: group.controls.map(
              (control) => /* @__PURE__ */ jsxDEV(
                LoaderPlaygroundControlRow,
                {
                  config,
                  control,
                  onChange
                },
                control.id,
                false,
                {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
                  lineNumber: 192,
                  columnNumber: 13
                },
                this
              )
            ) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
              lineNumber: 190,
              columnNumber: 13
            }, this)
          ]
        },
        group.title,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 176,
          columnNumber: 9
        },
        this
      )
    ) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 174,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "parameterizer-actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: onReset, children: "Reset" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 204,
        columnNumber: 9
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", onClick: onSave, children: "Save" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
        lineNumber: 205,
        columnNumber: 9
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 203,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
    lineNumber: 160,
    columnNumber: 5
  }, this);
}
_s(LoaderPlaygroundPanel, "rWpkxVgFfJzYRCuPEvPwt4e6iEQ=");
_c4 = LoaderPlaygroundPanel;
export function LoaderPlayground() {
  _s2();
  const [config, setConfig] = useState(DEFAULT_LOADER_PLAYGROUND_CONFIG);
  const [saveStatus, setSaveStatus] = useState("loading");
  useEffect(() => {
    let cancelled = false;
    async function loadInitialConfig() {
      const nextConfig = await loadJson(CONFIG_URL, DEFAULT_LOADER_PLAYGROUND_CONFIG);
      if (cancelled) return;
      setConfig(normalizeLoaderPlaygroundConfig(nextConfig));
      setSaveStatus("loaded");
    }
    loadInitialConfig();
    return () => {
      cancelled = true;
    };
  }, []);
  const updateControl = useCallback((control, value, checked) => {
    setSaveStatus("edited");
    setConfig((current) => normalizeLoaderPlaygroundConfig({
      ...current,
      ...resolveLoaderPlaygroundControlPatch(control, value, checked, current)
    }));
  }, []);
  const selectVariant = useCallback((variantId) => {
    updateControl({ id: "selectedVariant", scope: "root", type: "select" }, variantId, false);
  }, [updateControl]);
  const resetConfig = useCallback(() => {
    setSaveStatus("reset");
    setConfig(normalizeLoaderPlaygroundConfig(DEFAULT_LOADER_PLAYGROUND_CONFIG));
  }, []);
  const saveConfig = useCallback(async (configToSave = config) => {
    const normalized = normalizeLoaderPlaygroundConfig(configToSave);
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/loader-playground/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: normalized })
      });
      if (!response.ok) throw new Error("save unavailable");
      setSaveStatus("saved");
      return true;
    } catch {
      downloadConfig(normalized);
      setSaveStatus("downloaded");
      return false;
    }
  }, [config]);
  const normalizedConfig = useMemo(() => normalizeLoaderPlaygroundConfig(config), [config]);
  useEffect(() => {
    window.__ABS_LOADER_PLAYGROUND__ = {
      getConfig: () => normalizeLoaderPlaygroundConfig(config),
      setConfigPatch: (patch) => {
        setSaveStatus("edited");
        setConfig((current) => normalizeLoaderPlaygroundConfig({ ...current, ...patch }));
      },
      save: () => saveConfig(config)
    };
    return () => {
      delete window.__ABS_LOADER_PLAYGROUND__;
    };
  }, [config, saveConfig]);
  return /* @__PURE__ */ jsxDEV(
    "main",
    {
      className: "loader-playground",
      "data-simulation-id": LOADER_PLAYGROUND_REGISTRY_ENTRY.id,
      "data-enabled-in-rotation": String(LOADER_PLAYGROUND_REGISTRY_ENTRY.enabledInRotation),
      "aria-label": "Loader animation playground",
      children: [
        /* @__PURE__ */ jsxDEV("section", { className: "loader-playground__grid", "aria-label": "Loader animation approaches", children: LOADER_PLAYGROUND_VARIANTS.map(
          (variant) => /* @__PURE__ */ jsxDEV(
            LoaderCard,
            {
              config: normalizedConfig,
              isSelected: normalizedConfig.selectedVariant === variant.id,
              onSelect: selectVariant,
              variant
            },
            variant.id,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
              lineNumber: 293,
              columnNumber: 9
            },
            this
          )
        ) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
          lineNumber: 291,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV(
          LoaderPlaygroundPanel,
          {
            config: normalizedConfig,
            saveStatus,
            onChange: updateControl,
            onReset: resetConfig,
            onSave: () => saveConfig(normalizedConfig)
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
            lineNumber: 302,
            columnNumber: 7
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx",
      lineNumber: 285,
      columnNumber: 5
    },
    this
  );
}
_s2(LoaderPlayground, "uAwgLHRnLnmhSDZyqN26nHtmyi8=");
_c5 = LoaderPlayground;
var _c, _c2, _c3, _c4, _c5;
$RefreshReg$(_c, "LoaderAnimation");
$RefreshReg$(_c2, "LoaderCard");
$RefreshReg$(_c3, "LoaderPlaygroundControlRow");
$RefreshReg$(_c4, "LoaderPlaygroundPanel");
$RefreshReg$(_c5, "LoaderPlayground");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/loader-playground/LoaderPlayground.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUEsVUFLbUI7QUFBQSxRQUVwQixLQVRIO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFVQTtBQUFBLFFBQ0E7QUFBQSxVQUFDO0FBQUE7QUFBQSxZQUNDLFFBQVE4RTtBQUFBQSxZQUNSO0FBQUEsWUFDQSxVQUFVWDtBQUFBQSxZQUNWLFNBQVNJO0FBQUFBLFlBQ1QsUUFBUSxNQUFNQyxXQUFXTSxnQkFBZ0I7QUFBQTtBQUFBLFVBTDNDO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQUs2QztBQUFBO0FBQUE7QUFBQSxJQXRCL0M7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEVBd0JBO0FBRUo7QUFBQ2pCLElBcEdlRCxrQkFBZ0I7QUFBQSxNQUFoQkE7QUFBZ0IsSUFBQWpELElBQUFXLEtBQUFnQixLQUFBZ0QsS0FBQUM7QUFBQSxhQUFBNUUsSUFBQTtBQUFBLGFBQUFXLEtBQUE7QUFBQSxhQUFBZ0IsS0FBQTtBQUFBLGFBQUFnRCxLQUFBO0FBQUEsYUFBQUMsS0FBQSIsIm5hbWVzIjpbInVzZUNhbGxiYWNrIiwidXNlRWZmZWN0IiwidXNlTWVtbyIsInVzZVN0YXRlIiwid2l0aEJhc2VQYXRoIiwiREVGQVVMVF9MT0FERVJfUExBWUdST1VORF9DT05GSUciLCJMT0FERVJfRE9UX0NPTE9SUyIsIkxPQURFUl9QTEFZR1JPVU5EX0NPTlRST0xfR1JPVVBTIiwiTE9BREVSX1BMQVlHUk9VTkRfVkFSSUFOVFMiLCJmb3JtYXRMb2FkZXJQbGF5Z3JvdW5kQ29udHJvbFZhbHVlIiwiZ2V0TG9hZGVyVmFyaWFudERlZmluaXRpb24iLCJub3JtYWxpemVMb2FkZXJQbGF5Z3JvdW5kQ29uZmlnIiwicmVzb2x2ZUxvYWRlclBsYXlncm91bmRDb250cm9sUGF0Y2giLCJyZXNvbHZlTG9hZGVyUGxheWdyb3VuZENvbnRyb2xWYWx1ZSIsIkxPQURFUl9QTEFZR1JPVU5EX1JFR0lTVFJZX0VOVFJZIiwiQ09ORklHX1VSTCIsImxvYWRKc29uIiwidXJsIiwiZmFsbGJhY2siLCJyZXNwb25zZSIsImZldGNoIiwiY2FjaGUiLCJvayIsImpzb24iLCJkb3dubG9hZENvbmZpZyIsImNvbmZpZyIsImJsb2IiLCJCbG9iIiwiSlNPTiIsInN0cmluZ2lmeSIsInR5cGUiLCJhbmNob3IiLCJkb2N1bWVudCIsImNyZWF0ZUVsZW1lbnQiLCJocmVmIiwiVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwiZG93bmxvYWQiLCJib2R5IiwiYXBwZW5kQ2hpbGQiLCJjbGljayIsInJlbW92ZUNoaWxkIiwicmV2b2tlT2JqZWN0VVJMIiwiTG9hZGVyQW5pbWF0aW9uIiwidmFyaWFudCIsInNldHRpbmdzIiwic3R5bGUiLCJkdXJhdGlvbk1zIiwiY29sb3JDeWNsZU1zIiwiZG90U2l6ZSIsImlkIiwiY29sb3JNb2RlIiwibWFwIiwiY29sb3IiLCJpbmRleCIsImFuZ2xlIiwiY29sb3JEZWxheSIsImNvbG9yU3luY0RlbGF5TXMiLCJjb2xvclBoYXNlRGlyZWN0aW9uIiwiY29sb3JQaGFzZVN0ZXBNcyIsInJhZGl1cyIsIl9jIiwiTG9hZGVyQ2FyZCIsImlzU2VsZWN0ZWQiLCJvblNlbGVjdCIsInZhcmlhbnRzIiwiZGVmYXVsdHMiLCJsYWJlbCIsIlN0cmluZyIsImZpbmRJbmRleCIsIml0ZW0iLCJwYWRTdGFydCIsIl9jMiIsIkxvYWRlclBsYXlncm91bmRDb250cm9sUm93IiwiY29udHJvbCIsIm9uQ2hhbmdlIiwidmFsdWUiLCJyYW5nZVZhbHVlIiwiTnVtYmVyIiwiaXNGaW5pdGUiLCJtaW4iLCJldmVudCIsInRhcmdldCIsImNoZWNrZWQiLCJvcHRpb25zIiwib3B0aW9uIiwibWF4Iiwic3RlcCIsIl9jMyIsIkxvYWRlclBsYXlncm91bmRQYW5lbCIsInNhdmVTdGF0dXMiLCJvblJlc2V0Iiwib25TYXZlIiwiX3MiLCJvcGVuR3JvdXBzIiwic2V0T3Blbkdyb3VwcyIsIk9iamVjdCIsImZyb21FbnRyaWVzIiwiZ3JvdXAiLCJ0aXRsZSIsImluaXRpYWxseU9wZW4iLCJhY3RpdmVWYXJpYW50Iiwic2VsZWN0ZWRWYXJpYW50Iiwic3VtbWFyeSIsIkJvb2xlYW4iLCJpc09wZW4iLCJjdXJyZW50VGFyZ2V0Iiwib3BlbiIsImN1cnJlbnQiLCJjb250cm9scyIsIkxvYWRlclBsYXlncm91bmQiLCJfczIiLCJzZXRDb25maWciLCJzZXRTYXZlU3RhdHVzIiwiY2FuY2VsbGVkIiwibG9hZEluaXRpYWxDb25maWciLCJuZXh0Q29uZmlnIiwidXBkYXRlQ29udHJvbCIsInNlbGVjdFZhcmlhbnQiLCJ2YXJpYW50SWQiLCJzY29wZSIsInJlc2V0Q29uZmlnIiwic2F2ZUNvbmZpZyIsImNvbmZpZ1RvU2F2ZSIsIm5vcm1hbGl6ZWQiLCJtZXRob2QiLCJoZWFkZXJzIiwiRXJyb3IiLCJub3JtYWxpemVkQ29uZmlnIiwid2luZG93IiwiX19BQlNfTE9BREVSX1BMQVlHUk9VTkRfXyIsImdldENvbmZpZyIsInNldENvbmZpZ1BhdGNoIiwicGF0Y2giLCJzYXZlIiwiZW5hYmxlZEluUm90YXRpb24iLCJfYzQiLCJfYzUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiTG9hZGVyUGxheWdyb3VuZC5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTWVtbywgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyB3aXRoQmFzZVBhdGggfSBmcm9tICcuLi8uLi9saWIvYmFzZS1wYXRoLmpzJztcbmltcG9ydCB7XG4gIERFRkFVTFRfTE9BREVSX1BMQVlHUk9VTkRfQ09ORklHLFxuICBMT0FERVJfRE9UX0NPTE9SUyxcbiAgTE9BREVSX1BMQVlHUk9VTkRfQ09OVFJPTF9HUk9VUFMsXG4gIExPQURFUl9QTEFZR1JPVU5EX1ZBUklBTlRTLFxuICBmb3JtYXRMb2FkZXJQbGF5Z3JvdW5kQ29udHJvbFZhbHVlLFxuICBnZXRMb2FkZXJWYXJpYW50RGVmaW5pdGlvbixcbiAgbm9ybWFsaXplTG9hZGVyUGxheWdyb3VuZENvbmZpZyxcbiAgcmVzb2x2ZUxvYWRlclBsYXlncm91bmRDb250cm9sUGF0Y2gsXG4gIHJlc29sdmVMb2FkZXJQbGF5Z3JvdW5kQ29udHJvbFZhbHVlLFxufSBmcm9tICcuL2xvYWRlclBsYXlncm91bmRDb250cm9scy5qcyc7XG5pbXBvcnQgeyBMT0FERVJfUExBWUdST1VORF9SRUdJU1RSWV9FTlRSWSB9IGZyb20gJy4vbG9hZGVyUGxheWdyb3VuZFJlZ2lzdHJ5LmpzJztcbmltcG9ydCAnLi9sb2FkZXItcGxheWdyb3VuZC5jc3MnO1xuXG5jb25zdCBDT05GSUdfVVJMID0gd2l0aEJhc2VQYXRoKCcvY29uZmlnL2xvYWRlci1wbGF5Z3JvdW5kLWRlbW8uanNvbicpO1xuXG5hc3luYyBmdW5jdGlvbiBsb2FkSnNvbih1cmwsIGZhbGxiYWNrKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHsgY2FjaGU6ICduby1zdG9yZScgfSk7XG4gICAgaWYgKCFyZXNwb25zZS5vaykgcmV0dXJuIGZhbGxiYWNrO1xuICAgIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBmYWxsYmFjaztcbiAgfVxufVxuXG5mdW5jdGlvbiBkb3dubG9hZENvbmZpZyhjb25maWcpIHtcbiAgY29uc3QgYmxvYiA9IG5ldyBCbG9iKFtgJHtKU09OLnN0cmluZ2lmeShjb25maWcsIG51bGwsIDIpfVxcbmBdLCB7IHR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgY29uc3QgYW5jaG9yID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBhbmNob3IuaHJlZiA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gIGFuY2hvci5kb3dubG9hZCA9ICdsb2FkZXItcGxheWdyb3VuZC1kZW1vLmpzb24nO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFuY2hvcik7XG4gIGFuY2hvci5jbGljaygpO1xuICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGFuY2hvcik7XG4gIFVSTC5yZXZva2VPYmplY3RVUkwoYW5jaG9yLmhyZWYpO1xufVxuXG5mdW5jdGlvbiBMb2FkZXJBbmltYXRpb24oeyB2YXJpYW50LCBzZXR0aW5ncyB9KSB7XG4gIGNvbnN0IHN0eWxlID0ge1xuICAgICctLWxvYWRlci1kdXJhdGlvbic6IGAke3NldHRpbmdzLmR1cmF0aW9uTXN9bXNgLFxuICAgICctLWxvYWRlci1jb2xvci1jeWNsZSc6IGAke3NldHRpbmdzLmNvbG9yQ3ljbGVNc31tc2AsXG4gICAgJy0tbG9hZGVyLWRvdC1zaXplJzogYCR7c2V0dGluZ3MuZG90U2l6ZX1weGAsXG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICBjbGFzc05hbWU9e2Bsb2FkZXItc2FtcGxlIGxvYWRlci1zYW1wbGUtLSR7dmFyaWFudC5pZH0gbG9hZGVyLXNhbXBsZS0tY29sb3ItJHtzZXR0aW5ncy5jb2xvck1vZGV9YH1cbiAgICAgIHN0eWxlPXtzdHlsZX1cbiAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJsb2FkZXItb3JiaXRcIj5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsb2FkZXItcmluZy1wbGFuZVwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibG9hZGVyLXJhZGl1cy1wbGFuZVwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsb2FkZXItcmluZ1wiPlxuICAgICAgICAgICAgICB7TE9BREVSX0RPVF9DT0xPUlMubWFwKChjb2xvciwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBhbmdsZSA9IGluZGV4ICogNjA7XG4gICAgICAgICAgICAgICAgY29uc3QgY29sb3JEZWxheSA9IHNldHRpbmdzLmNvbG9yU3luY0RlbGF5TXNcbiAgICAgICAgICAgICAgICAgICsgKHNldHRpbmdzLmNvbG9yUGhhc2VEaXJlY3Rpb24gKiBpbmRleCAqIHNldHRpbmdzLmNvbG9yUGhhc2VTdGVwTXMpO1xuICAgICAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICAgICA8c3BhblxuICAgICAgICAgICAgICAgICAgICBrZXk9e2Ake3ZhcmlhbnQuaWR9LSR7Y29sb3J9YH1cbiAgICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwibG9hZGVyLWRvdFwiXG4gICAgICAgICAgICAgICAgICAgIHN0eWxlPXt7XG4gICAgICAgICAgICAgICAgICAgICAgJy0tZG90LWFuZ2xlJzogYCR7YW5nbGV9ZGVnYCxcbiAgICAgICAgICAgICAgICAgICAgICAnLS1kb3QtY291bnRlci1hbmdsZSc6IGAkey1hbmdsZX1kZWdgLFxuICAgICAgICAgICAgICAgICAgICAgICctLWRvdC1yYWRpdXMnOiBgJHtzZXR0aW5ncy5yYWRpdXN9cHhgLFxuICAgICAgICAgICAgICAgICAgICAgICctLWRvdC1yYWRpdXMtbmVnYXRpdmUnOiBgJHstc2V0dGluZ3MucmFkaXVzfXB4YCxcbiAgICAgICAgICAgICAgICAgICAgICAnLS1kb3QtY29sb3InOiBjb2xvcixcbiAgICAgICAgICAgICAgICAgICAgICAnLS1kb3QtY29sb3ItZGVsYXknOiBgJHtjb2xvckRlbGF5fW1zYCxcbiAgICAgICAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgICAgID5cbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibG9hZGVyLWRvdC1jb3JlXCIgLz5cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj5cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9KX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5mdW5jdGlvbiBMb2FkZXJDYXJkKHsgY29uZmlnLCBpc1NlbGVjdGVkLCBvblNlbGVjdCwgdmFyaWFudCB9KSB7XG4gIGNvbnN0IHNldHRpbmdzID0gY29uZmlnLnZhcmlhbnRzW3ZhcmlhbnQuaWRdIHx8IHZhcmlhbnQuZGVmYXVsdHM7XG4gIHJldHVybiAoXG4gICAgPGJ1dHRvblxuICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICBjbGFzc05hbWU9e2Bsb2FkZXItcGxheWdyb3VuZC1jYXJkJHtpc1NlbGVjdGVkID8gJyBpcy1zZWxlY3RlZCcgOiAnJ31gfVxuICAgICAgb25DbGljaz17KCkgPT4gb25TZWxlY3QodmFyaWFudC5pZCl9XG4gICAgICBhcmlhLXByZXNzZWQ9e2lzU2VsZWN0ZWR9XG4gICAgICBhcmlhLWxhYmVsPXtgJHt2YXJpYW50LmxhYmVsfSBsb2FkZXIgdmFyaWFudGB9XG4gICAgPlxuICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibG9hZGVyLXBsYXlncm91bmQtY2FyZF9fbWV0YVwiPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJsb2FkZXItcGxheWdyb3VuZC1jYXJkX19pbmRleFwiPlxuICAgICAgICAgIHtTdHJpbmcoTE9BREVSX1BMQVlHUk9VTkRfVkFSSUFOVFMuZmluZEluZGV4KChpdGVtKSA9PiBpdGVtLmlkID09PSB2YXJpYW50LmlkKSArIDEpLnBhZFN0YXJ0KDIsICcwJyl9XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibG9hZGVyLXBsYXlncm91bmQtY2FyZF9fbGFiZWxcIj57dmFyaWFudC5sYWJlbH08L3NwYW4+XG4gICAgICA8L3NwYW4+XG4gICAgICA8TG9hZGVyQW5pbWF0aW9uIHZhcmlhbnQ9e3ZhcmlhbnR9IHNldHRpbmdzPXtzZXR0aW5nc30gLz5cbiAgICA8L2J1dHRvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gTG9hZGVyUGxheWdyb3VuZENvbnRyb2xSb3coeyBjb25maWcsIGNvbnRyb2wsIG9uQ2hhbmdlIH0pIHtcbiAgY29uc3QgaWQgPSBgbG9hZGVyLXBsYXlncm91bmQtY29udHJvbC0ke2NvbnRyb2wuaWR9YDtcbiAgY29uc3QgdmFsdWUgPSByZXNvbHZlTG9hZGVyUGxheWdyb3VuZENvbnRyb2xWYWx1ZShjb250cm9sLCBjb25maWcpO1xuICBjb25zdCByYW5nZVZhbHVlID0gTnVtYmVyLmlzRmluaXRlKE51bWJlcih2YWx1ZSkpXG4gICAgPyBOdW1iZXIodmFsdWUpXG4gICAgOiBOdW1iZXIoY29udHJvbC5taW4gfHwgMCk7XG5cbiAgaWYgKGNvbnRyb2wudHlwZSA9PT0gJ3NlbGVjdCcpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGxhYmVsIGNsYXNzTmFtZT1cInBhcmFtZXRlcml6ZXItcm93IGxvYWRlci1wbGF5Z3JvdW5kLWNvbnRyb2wtcm93XCIgaHRtbEZvcj17aWR9PlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJwYXJhbWV0ZXJpemVyLWxhYmVsXCIgdGl0bGU9e2NvbnRyb2wubGFiZWx9Pntjb250cm9sLmxhYmVsfTwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicGFyYW1ldGVyaXplci1jb250cm9sXCI+XG4gICAgICAgICAgPHNlbGVjdFxuICAgICAgICAgICAgaWQ9e2lkfVxuICAgICAgICAgICAgdmFsdWU9e3ZhbHVlfVxuICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gb25DaGFuZ2UoY29udHJvbCwgZXZlbnQudGFyZ2V0LnZhbHVlLCBldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgICAgPlxuICAgICAgICAgICAge2NvbnRyb2wub3B0aW9ucy5tYXAoKG9wdGlvbikgPT4gKFxuICAgICAgICAgICAgICA8b3B0aW9uIGtleT17b3B0aW9uLnZhbHVlfSB2YWx1ZT17b3B0aW9uLnZhbHVlfT57b3B0aW9uLmxhYmVsfTwvb3B0aW9uPlxuICAgICAgICAgICAgKSl9XG4gICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicGFyYW1ldGVyaXplci12YWx1ZVwiPntmb3JtYXRMb2FkZXJQbGF5Z3JvdW5kQ29udHJvbFZhbHVlKHZhbHVlLCBjb250cm9sKX08L3NwYW4+XG4gICAgICA8L2xhYmVsPlxuICAgICk7XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxsYWJlbCBjbGFzc05hbWU9XCJwYXJhbWV0ZXJpemVyLXJvdyBsb2FkZXItcGxheWdyb3VuZC1jb250cm9sLXJvd1wiIGh0bWxGb3I9e2lkfT5cbiAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInBhcmFtZXRlcml6ZXItbGFiZWxcIiB0aXRsZT17Y29udHJvbC5sYWJlbH0+e2NvbnRyb2wubGFiZWx9PC9zcGFuPlxuICAgICAgPHNwYW4gY2xhc3NOYW1lPVwicGFyYW1ldGVyaXplci1jb250cm9sXCI+XG4gICAgICAgIDxpbnB1dFxuICAgICAgICAgIGlkPXtpZH1cbiAgICAgICAgICB0eXBlPVwicmFuZ2VcIlxuICAgICAgICAgIG1pbj17Y29udHJvbC5taW59XG4gICAgICAgICAgbWF4PXtjb250cm9sLm1heH1cbiAgICAgICAgICBzdGVwPXtjb250cm9sLnN0ZXB9XG4gICAgICAgICAgdmFsdWU9e3JhbmdlVmFsdWV9XG4gICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gb25DaGFuZ2UoY29udHJvbCwgZXZlbnQudGFyZ2V0LnZhbHVlLCBldmVudC50YXJnZXQuY2hlY2tlZCl9XG4gICAgICAgIC8+XG4gICAgICA8L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzc05hbWU9XCJwYXJhbWV0ZXJpemVyLXZhbHVlXCI+e2Zvcm1hdExvYWRlclBsYXlncm91bmRDb250cm9sVmFsdWUodmFsdWUsIGNvbnRyb2wpfTwvc3Bhbj5cbiAgICA8L2xhYmVsPlxuICApO1xufVxuXG5mdW5jdGlvbiBMb2FkZXJQbGF5Z3JvdW5kUGFuZWwoeyBjb25maWcsIHNhdmVTdGF0dXMsIG9uQ2hhbmdlLCBvblJlc2V0LCBvblNhdmUgfSkge1xuICBjb25zdCBbb3Blbkdyb3Vwcywgc2V0T3Blbkdyb3Vwc10gPSB1c2VTdGF0ZSgoKSA9PiBPYmplY3QuZnJvbUVudHJpZXMoXG4gICAgTE9BREVSX1BMQVlHUk9VTkRfQ09OVFJPTF9HUk9VUFMubWFwKChncm91cCkgPT4gW2dyb3VwLnRpdGxlLCBncm91cC5pbml0aWFsbHlPcGVuICE9PSBmYWxzZV0pLFxuICApKTtcbiAgY29uc3QgYWN0aXZlVmFyaWFudCA9IGdldExvYWRlclZhcmlhbnREZWZpbml0aW9uKGNvbmZpZy5zZWxlY3RlZFZhcmlhbnQpO1xuXG4gIHJldHVybiAoXG4gICAgPGFzaWRlIGNsYXNzTmFtZT1cInBhcmFtZXRlcml6ZXItcGFuZWwgbG9hZGVyLXBsYXlncm91bmQtcGFuZWxcIiBhcmlhLWxhYmVsPVwiTG9hZGVyIHBsYXlncm91bmQgY29udHJvbHNcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGFyYW1ldGVyaXplci1oZWFkZXJcIj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibG9hZGVyLXBsYXlncm91bmQtcGFuZWxfX3RpdGxlXCI+XG4gICAgICAgICAgPHNwYW4+TG9hZGVyPC9zcGFuPlxuICAgICAgICAgIDxzcGFuPlBsYXlncm91bmQ8L3NwYW4+XG4gICAgICAgIDwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibG9hZGVyLXBsYXlncm91bmQtcGFuZWxfX3N0YXR1c1wiIHJvbGU9XCJzdGF0dXNcIiBhcmlhLWxpdmU9XCJwb2xpdGVcIj5cbiAgICAgICAgICB7c2F2ZVN0YXR1c31cbiAgICAgICAgPC9zcGFuPlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImxvYWRlci1wbGF5Z3JvdW5kLXBhbmVsX19hY3RpdmVcIiBhcmlhLWxpdmU9XCJwb2xpdGVcIj5cbiAgICAgICAgPHNwYW4+e2FjdGl2ZVZhcmlhbnQubGFiZWx9PC9zcGFuPlxuICAgICAgICA8c3Bhbj57YWN0aXZlVmFyaWFudC5zdW1tYXJ5fTwvc3Bhbj5cbiAgICAgIDwvZGl2PlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJwYXJhbWV0ZXJpemVyLXNjcm9sbFwiPlxuICAgICAgICB7TE9BREVSX1BMQVlHUk9VTkRfQ09OVFJPTF9HUk9VUFMubWFwKChncm91cCkgPT4gKFxuICAgICAgICAgIDxkZXRhaWxzXG4gICAgICAgICAgICBrZXk9e2dyb3VwLnRpdGxlfVxuICAgICAgICAgICAgY2xhc3NOYW1lPVwicGFyYW1ldGVyaXplci1mb2xkZXJcIlxuICAgICAgICAgICAgb3Blbj17Qm9vbGVhbihvcGVuR3JvdXBzW2dyb3VwLnRpdGxlXSl9XG4gICAgICAgICAgICBvblRvZ2dsZT17KGV2ZW50KSA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGlzT3BlbiA9IGV2ZW50LmN1cnJlbnRUYXJnZXQub3BlbjtcbiAgICAgICAgICAgICAgc2V0T3Blbkdyb3VwcygoY3VycmVudCkgPT4gKFxuICAgICAgICAgICAgICAgIGN1cnJlbnRbZ3JvdXAudGl0bGVdID09PSBpc09wZW5cbiAgICAgICAgICAgICAgICAgID8gY3VycmVudFxuICAgICAgICAgICAgICAgICAgOiB7IC4uLmN1cnJlbnQsIFtncm91cC50aXRsZV06IGlzT3BlbiB9XG4gICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgfX1cbiAgICAgICAgICA+XG4gICAgICAgICAgICA8c3VtbWFyeSBjbGFzc05hbWU9XCJwYXJhbWV0ZXJpemVyLWZvbGRlci10aXRsZVwiPntncm91cC50aXRsZX08L3N1bW1hcnk+XG4gICAgICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImxvYWRlci1wbGF5Z3JvdW5kLXBhbmVsX19yb3dzXCI+XG4gICAgICAgICAgICAgIHtncm91cC5jb250cm9scy5tYXAoKGNvbnRyb2wpID0+IChcbiAgICAgICAgICAgICAgICA8TG9hZGVyUGxheWdyb3VuZENvbnRyb2xSb3dcbiAgICAgICAgICAgICAgICAgIGtleT17Y29udHJvbC5pZH1cbiAgICAgICAgICAgICAgICAgIGNvbmZpZz17Y29uZmlnfVxuICAgICAgICAgICAgICAgICAgY29udHJvbD17Y29udHJvbH1cbiAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtvbkNoYW5nZX1cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApKX1cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGV0YWlscz5cbiAgICAgICAgKSl9XG4gICAgICA8L2Rpdj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGFyYW1ldGVyaXplci1hY3Rpb25zXCI+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e29uUmVzZXR9PlJlc2V0PC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9e29uU2F2ZX0+U2F2ZTwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9hc2lkZT5cbiAgKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIExvYWRlclBsYXlncm91bmQoKSB7XG4gIGNvbnN0IFtjb25maWcsIHNldENvbmZpZ10gPSB1c2VTdGF0ZShERUZBVUxUX0xPQURFUl9QTEFZR1JPVU5EX0NPTkZJRyk7XG4gIGNvbnN0IFtzYXZlU3RhdHVzLCBzZXRTYXZlU3RhdHVzXSA9IHVzZVN0YXRlKCdsb2FkaW5nJyk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBsZXQgY2FuY2VsbGVkID0gZmFsc2U7XG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEluaXRpYWxDb25maWcoKSB7XG4gICAgICBjb25zdCBuZXh0Q29uZmlnID0gYXdhaXQgbG9hZEpzb24oQ09ORklHX1VSTCwgREVGQVVMVF9MT0FERVJfUExBWUdST1VORF9DT05GSUcpO1xuICAgICAgaWYgKGNhbmNlbGxlZCkgcmV0dXJuO1xuICAgICAgc2V0Q29uZmlnKG5vcm1hbGl6ZUxvYWRlclBsYXlncm91bmRDb25maWcobmV4dENvbmZpZykpO1xuICAgICAgc2V0U2F2ZVN0YXR1cygnbG9hZGVkJyk7XG4gICAgfVxuXG4gICAgbG9hZEluaXRpYWxDb25maWcoKTtcbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY2FuY2VsbGVkID0gdHJ1ZTtcbiAgICB9O1xuICB9LCBbXSk7XG5cbiAgY29uc3QgdXBkYXRlQ29udHJvbCA9IHVzZUNhbGxiYWNrKChjb250cm9sLCB2YWx1ZSwgY2hlY2tlZCkgPT4ge1xuICAgIHNldFNhdmVTdGF0dXMoJ2VkaXRlZCcpO1xuICAgIHNldENvbmZpZygoY3VycmVudCkgPT4gbm9ybWFsaXplTG9hZGVyUGxheWdyb3VuZENvbmZpZyh7XG4gICAgICAuLi5jdXJyZW50LFxuICAgICAgLi4ucmVzb2x2ZUxvYWRlclBsYXlncm91bmRDb250cm9sUGF0Y2goY29udHJvbCwgdmFsdWUsIGNoZWNrZWQsIGN1cnJlbnQpLFxuICAgIH0pKTtcbiAgfSwgW10pO1xuXG4gIGNvbnN0IHNlbGVjdFZhcmlhbnQgPSB1c2VDYWxsYmFjaygodmFyaWFudElkKSA9PiB7XG4gICAgdXBkYXRlQ29udHJvbCh7IGlkOiAnc2VsZWN0ZWRWYXJpYW50Jywgc2NvcGU6ICdyb290JywgdHlwZTogJ3NlbGVjdCcgfSwgdmFyaWFudElkLCBmYWxzZSk7XG4gIH0sIFt1cGRhdGVDb250cm9sXSk7XG5cbiAgY29uc3QgcmVzZXRDb25maWcgPSB1c2VDYWxsYmFjaygoKSA9PiB7XG4gICAgc2V0U2F2ZVN0YXR1cygncmVzZXQnKTtcbiAgICBzZXRDb25maWcobm9ybWFsaXplTG9hZGVyUGxheWdyb3VuZENvbmZpZyhERUZBVUxUX0xPQURFUl9QTEFZR1JPVU5EX0NPTkZJRykpO1xuICB9LCBbXSk7XG5cbiAgY29uc3Qgc2F2ZUNvbmZpZyA9IHVzZUNhbGxiYWNrKGFzeW5jIChjb25maWdUb1NhdmUgPSBjb25maWcpID0+IHtcbiAgICBjb25zdCBub3JtYWxpemVkID0gbm9ybWFsaXplTG9hZGVyUGxheWdyb3VuZENvbmZpZyhjb25maWdUb1NhdmUpO1xuICAgIHNldFNhdmVTdGF0dXMoJ3NhdmluZycpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCcvYXBpL2xvYWRlci1wbGF5Z3JvdW5kL2NvbmZpZycsIHtcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGNvbmZpZzogbm9ybWFsaXplZCB9KSxcbiAgICAgIH0pO1xuXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB0aHJvdyBuZXcgRXJyb3IoJ3NhdmUgdW5hdmFpbGFibGUnKTtcbiAgICAgIHNldFNhdmVTdGF0dXMoJ3NhdmVkJyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIGRvd25sb2FkQ29uZmlnKG5vcm1hbGl6ZWQpO1xuICAgICAgc2V0U2F2ZVN0YXR1cygnZG93bmxvYWRlZCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSwgW2NvbmZpZ10pO1xuXG4gIGNvbnN0IG5vcm1hbGl6ZWRDb25maWcgPSB1c2VNZW1vKCgpID0+IG5vcm1hbGl6ZUxvYWRlclBsYXlncm91bmRDb25maWcoY29uZmlnKSwgW2NvbmZpZ10pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgd2luZG93Ll9fQUJTX0xPQURFUl9QTEFZR1JPVU5EX18gPSB7XG4gICAgICBnZXRDb25maWc6ICgpID0+IG5vcm1hbGl6ZUxvYWRlclBsYXlncm91bmRDb25maWcoY29uZmlnKSxcbiAgICAgIHNldENvbmZpZ1BhdGNoOiAocGF0Y2gpID0+IHtcbiAgICAgICAgc2V0U2F2ZVN0YXR1cygnZWRpdGVkJyk7XG4gICAgICAgIHNldENvbmZpZygoY3VycmVudCkgPT4gbm9ybWFsaXplTG9hZGVyUGxheWdyb3VuZENvbmZpZyh7IC4uLmN1cnJlbnQsIC4uLnBhdGNoIH0pKTtcbiAgICAgIH0sXG4gICAgICBzYXZlOiAoKSA9PiBzYXZlQ29uZmlnKGNvbmZpZyksXG4gICAgfTtcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBkZWxldGUgd2luZG93Ll9fQUJTX0xPQURFUl9QTEFZR1JPVU5EX187XG4gICAgfTtcbiAgfSwgW2NvbmZpZywgc2F2ZUNvbmZpZ10pO1xuXG4gIHJldHVybiAoXG4gICAgPG1haW5cbiAgICAgIGNsYXNzTmFtZT1cImxvYWRlci1wbGF5Z3JvdW5kXCJcbiAgICAgIGRhdGEtc2ltdWxhdGlvbi1pZD17TE9BREVSX1BMQVlHUk9VTkRfUkVHSVNUUllfRU5UUlkuaWR9XG4gICAgICBkYXRhLWVuYWJsZWQtaW4tcm90YXRpb249e1N0cmluZyhMT0FERVJfUExBWUdST1VORF9SRUdJU1RSWV9FTlRSWS5lbmFibGVkSW5Sb3RhdGlvbil9XG4gICAgICBhcmlhLWxhYmVsPVwiTG9hZGVyIGFuaW1hdGlvbiBwbGF5Z3JvdW5kXCJcbiAgICA+XG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJsb2FkZXItcGxheWdyb3VuZF9fZ3JpZFwiIGFyaWEtbGFiZWw9XCJMb2FkZXIgYW5pbWF0aW9uIGFwcHJvYWNoZXNcIj5cbiAgICAgICAge0xPQURFUl9QTEFZR1JPVU5EX1ZBUklBTlRTLm1hcCgodmFyaWFudCkgPT4gKFxuICAgICAgICAgIDxMb2FkZXJDYXJkXG4gICAgICAgICAgICBrZXk9e3ZhcmlhbnQuaWR9XG4gICAgICAgICAgICBjb25maWc9e25vcm1hbGl6ZWRDb25maWd9XG4gICAgICAgICAgICBpc1NlbGVjdGVkPXtub3JtYWxpemVkQ29uZmlnLnNlbGVjdGVkVmFyaWFudCA9PT0gdmFyaWFudC5pZH1cbiAgICAgICAgICAgIG9uU2VsZWN0PXtzZWxlY3RWYXJpYW50fVxuICAgICAgICAgICAgdmFyaWFudD17dmFyaWFudH1cbiAgICAgICAgICAvPlxuICAgICAgICApKX1cbiAgICAgIDwvc2VjdGlvbj5cbiAgICAgIDxMb2FkZXJQbGF5Z3JvdW5kUGFuZWxcbiAgICAgICAgY29uZmlnPXtub3JtYWxpemVkQ29uZmlnfVxuICAgICAgICBzYXZlU3RhdHVzPXtzYXZlU3RhdHVzfVxuICAgICAgICBvbkNoYW5nZT17dXBkYXRlQ29udHJvbH1cbiAgICAgICAgb25SZXNldD17cmVzZXRDb25maWd9XG4gICAgICAgIG9uU2F2ZT17KCkgPT4gc2F2ZUNvbmZpZyhub3JtYWxpemVkQ29uZmlnKX1cbiAgICAgIC8+XG4gICAgPC9tYWluPlxuICApO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9sb2FkZXItcGxheWdyb3VuZC9Mb2FkZXJQbGF5Z3JvdW5kLmpzeCJ9