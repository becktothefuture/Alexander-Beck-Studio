import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/app/ShellButtonBar.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$(), _s2 = $RefreshSig$(), _s3 = $RefreshSig$(), _s4 = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useState = __vite__cjsImport1_react["useState"];
import {
  SOUND_STATE_EVENT,
  getSoundState,
  initSoundEngine,
  playButtonPressSound,
  playSoundEnabledMotif,
  toggleSound,
  unlockAudio
} from "/src/legacy/modules/audio/sound-engine.js";
import { getCurrentTheme, setTheme } from "/src/legacy/modules/visual/dark-mode-v2.js";
import { SHELL_ROUTE_TABS } from "/src/lib/routes.js";
import { useRenderedThemeIsDark } from "/src/hooks/useRenderedTheme.js";
import { THEME_CHANGE_EVENT } from "/src/lib/theme-state.js";
import "/src/components/app/shell-button-bar-dominant.css";
function readSoundButtonState() {
  try {
    const soundState = getSoundState();
    return {
      isUnlocked: Boolean(soundState?.isUnlocked),
      isEnabled: Boolean(soundState?.isUnlocked && soundState?.isEnabled)
    };
  } catch {
    return {
      isUnlocked: false,
      isEnabled: false
    };
  }
}
function getNormalizedActiveRouteId(activeRouteId) {
  return activeRouteId;
}
function getRouteTabById(routeId) {
  return SHELL_ROUTE_TABS.find((tab) => tab.routeId === routeId);
}
function playButtonBarPressSound() {
  playButtonPressSound();
}
function isPrimaryPointerPress(event) {
  return event.pointerType === "touch" || event.pointerType === "pen" || event.button === 0;
}
function beginCapturedPointerPress(event) {
  if (!isPrimaryPointerPress(event)) return false;
  event.currentTarget.dataset.buttonBarPointerPress = "true";
  event.currentTarget.setPointerCapture?.(event.pointerId);
  return true;
}
function completeCapturedPointerPress(event) {
  if (!isPrimaryPointerPress(event)) return false;
  const didBeginOnControl = event.currentTarget.dataset.buttonBarPointerPress === "true";
  delete event.currentTarget.dataset.buttonBarPointerPress;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
  return didBeginOnControl;
}
function markPointerActivated(event) {
  event.currentTarget.dataset.buttonBarPointerActivated = "true";
}
function consumePointerActivated(event) {
  if (event.currentTarget.dataset.buttonBarPointerActivated !== "true") return false;
  delete event.currentTarget.dataset.buttonBarPointerActivated;
  return true;
}
function isKeyboardPress(event) {
  return !event.repeat && (event.key === "Enter" || event.key === " ");
}
function isModifiedRouteEvent(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}
function getRouteButtonClassName(tab) {
  return [
    "button-bar__button",
    "shell-tab",
    tab.iconOnly ? "button-bar__button--icon-only shell-tab--icon-only" : ""
  ].filter(Boolean).join(" ");
}
function ButtonBarIcon({ tab, className = "button-bar__icon shell-tab__icon" }) {
  return /* @__PURE__ */ jsxDEV("i", { className: `ti ${tab.icon} ${className}`, "aria-hidden": "true" }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
    lineNumber: 90,
    columnNumber: 10
  }, this);
}
_c = ButtonBarIcon;
function RouteButtonContent({ tab, decoration }) {
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    decoration,
    /* @__PURE__ */ jsxDEV(ButtonBarIcon, { tab }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 97,
      columnNumber: 7
    }, this),
    tab.iconOnly ? /* @__PURE__ */ jsxDEV(Fragment, { children: [
      /* @__PURE__ */ jsxDEV("span", { className: "screen-reader", children: tab.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
        lineNumber: 100,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("span", { className: "button-bar__label button-bar__label--mobile-only shell-tab__label", "aria-hidden": "true", children: tab.label }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
        lineNumber: 101,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 99,
      columnNumber: 7
    }, this) : /* @__PURE__ */ jsxDEV("span", { className: "button-bar__label shell-tab__label", children: tab.label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 104,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
    lineNumber: 95,
    columnNumber: 5
  }, this);
}
_c2 = RouteButtonContent;
function SunIcon() {
  return /* @__PURE__ */ jsxDEV("svg", { className: "button-bar__secondary-svg", viewBox: "0 0 24 24", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxDEV("circle", { cx: "12", cy: "12", r: "4" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 113,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("path", { d: "M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 114,
      columnNumber: 7
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
    lineNumber: 112,
    columnNumber: 5
  }, this);
}
_c3 = SunIcon;
function MoonIcon() {
  return /* @__PURE__ */ jsxDEV("svg", { className: "button-bar__secondary-svg", viewBox: "0 0 24 24", "aria-hidden": "true", children: /* @__PURE__ */ jsxDEV("path", { d: "M20.35 14.64A8.7 8.7 0 0 1 9.36 3.65a8.7 8.7 0 1 0 10.99 10.99Z" }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
    lineNumber: 122,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
    lineNumber: 121,
    columnNumber: 5
  }, this);
}
_c4 = MoonIcon;
function useCurrentThemePreference() {
  _s();
  const [preference, setPreference] = useState(() => getCurrentTheme());
  useEffect(() => {
    const syncPreference = (event) => {
      setPreference(event?.detail?.theme || getCurrentTheme());
    };
    window.addEventListener(THEME_CHANGE_EVENT, syncPreference);
    syncPreference();
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncPreference);
  }, []);
  return preference;
}
_s(useCurrentThemePreference, "FZB6ZvxJlYqvwu+UglcUH9Y0Xxk=");
function BottomThemeToggle({ decoration, previewTheme, onPreviewThemeChange }) {
  _s2();
  const renderedThemeIsDark = useRenderedThemeIsDark();
  const isDark = previewTheme ? previewTheme === "dark" : renderedThemeIsDark;
  const nextTheme = isDark ? "light" : "dark";
  const activateTheme = () => {
    if (onPreviewThemeChange) {
      onPreviewThemeChange(nextTheme);
      return;
    }
    setTheme(nextTheme);
  };
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "button-bar__secondary-button button-bar__theme-toggle shell-tab shell-tab--icon-only",
      "aria-label": isDark ? "Switch to light mode" : "Switch to dark mode",
      "aria-pressed": isDark ? "true" : "false",
      "data-state": isDark ? "dark" : "light",
      onPointerDown: (event) => {
        if (beginCapturedPointerPress(event)) playButtonBarPressSound();
      },
      onPointerUp: (event) => {
        if (!completeCapturedPointerPress(event)) return;
        markPointerActivated(event);
        activateTheme();
      },
      onKeyDown: (event) => {
        if (isKeyboardPress(event)) playButtonBarPressSound();
      },
      onClick: (event) => {
        if (consumePointerActivated(event)) return;
        activateTheme();
      },
      children: [
        decoration,
        /* @__PURE__ */ jsxDEV("span", { className: "button-bar__theme-thumb", "aria-hidden": "true", children: isDark ? /* @__PURE__ */ jsxDEV(MoonIcon, {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 178,
          columnNumber: 19
        }, this) : /* @__PURE__ */ jsxDEV(SunIcon, {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 178,
          columnNumber: 34
        }, this) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 177,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "screen-reader", children: isDark ? "Switch to light mode" : "Switch to dark mode" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 180,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 154,
      columnNumber: 5
    },
    this
  );
}
_s2(BottomThemeToggle, "P1HiVsyIiY74DdDe+9QH3+FNDXU=", false, function() {
  return [useRenderedThemeIsDark];
});
_c5 = BottomThemeToggle;
function BottomSoundToggle({ decoration }) {
  _s3();
  const [soundState, setSoundState] = useState(readSoundButtonState);
  const isEnabled = soundState.isUnlocked && soundState.isEnabled;
  useEffect(() => {
    initSoundEngine();
    const syncSoundState = (event) => {
      if (event?.detail) {
        setSoundState({
          isUnlocked: Boolean(event.detail.isUnlocked),
          isEnabled: Boolean(event.detail.isUnlocked && event.detail.isEnabled)
        });
        return;
      }
      setSoundState(readSoundButtonState());
    };
    syncSoundState();
    window.addEventListener(SOUND_STATE_EVENT, syncSoundState);
    return () => {
      window.removeEventListener(SOUND_STATE_EVENT, syncSoundState);
    };
  }, []);
  const handleClick = async () => {
    const currentState = readSoundButtonState();
    if (!currentState.isUnlocked) {
      const didUnlock = await unlockAudio();
      setSoundState(readSoundButtonState());
      if (didUnlock && readSoundButtonState().isEnabled) {
        playSoundEnabledMotif();
      }
      return;
    }
    const isNowEnabled = toggleSound();
    setSoundState(readSoundButtonState());
    if (isNowEnabled) {
      playSoundEnabledMotif();
    }
  };
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "button-bar__secondary-button button-bar__sound-toggle shell-tab shell-tab--icon-only",
      "aria-label": isEnabled ? "Sound on" : "Sound off",
      "aria-pressed": isEnabled ? "true" : "false",
      "data-state": isEnabled ? "active" : "idle",
      "data-enabled": isEnabled ? "true" : "false",
      onPointerDown: (event) => {
        if (beginCapturedPointerPress(event)) playButtonBarPressSound();
      },
      onPointerUp: (event) => {
        if (!completeCapturedPointerPress(event)) return;
        markPointerActivated(event);
        handleClick();
      },
      onKeyDown: (event) => {
        if (isKeyboardPress(event)) playButtonBarPressSound();
      },
      onClick: (event) => {
        if (consumePointerActivated(event)) return;
        handleClick();
      },
      children: [
        decoration,
        /* @__PURE__ */ jsxDEV("i", { className: `ti ${isEnabled ? "ti-volume-2" : "ti-volume-off"} button-bar__secondary-icon shell-tab__icon`, "aria-hidden": "true" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 255,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "screen-reader", children: isEnabled ? "Sound on" : "Sound off" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 256,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 231,
      columnNumber: 5
    },
    this
  );
}
_s3(BottomSoundToggle, "VdIPotPvjjTdu0FUWMlhwSBzp+M=");
_c6 = BottomSoundToggle;
function BottomMobileThemeReset() {
  _s4();
  const preference = useCurrentThemePreference();
  const isDark = useRenderedThemeIsDark();
  if (preference === "auto") return null;
  return /* @__PURE__ */ jsxDEV(
    "button",
    {
      type: "button",
      className: "button-bar__secondary-button button-bar__mobile-theme-reset shell-tab shell-tab--icon-only",
      "aria-label": `Use device theme instead of manual ${preference} mode`,
      "data-state": isDark ? "dark" : "light",
      onClick: () => setTheme("auto"),
      children: [
        isDark ? /* @__PURE__ */ jsxDEV(MoonIcon, {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 274,
          columnNumber: 17
        }, this) : /* @__PURE__ */ jsxDEV(SunIcon, {}, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 274,
          columnNumber: 32
        }, this),
        /* @__PURE__ */ jsxDEV("span", { className: "screen-reader", children: "Use device theme" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 275,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 267,
      columnNumber: 5
    },
    this
  );
}
_s4(BottomMobileThemeReset, "obWEX2m5I4FFFGHDiAYaFTBikyY=", false, function() {
  return [useCurrentThemePreference, useRenderedThemeIsDark];
});
_c7 = BottomMobileThemeReset;
function SecondaryButtons({
  preview,
  previewTheme,
  onPreviewThemeChange,
  renderDecoration
}) {
  return /* @__PURE__ */ jsxDEV("div", { className: "button-bar__secondary-buttons", role: "group", "aria-label": "Secondary buttons", "data-button-group": "secondary-buttons", children: [
    /* @__PURE__ */ jsxDEV(BottomSoundToggle, { decoration: renderDecoration?.({ controlId: "sound" }) }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 288,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV(
      BottomThemeToggle,
      {
        decoration: renderDecoration?.({ controlId: "theme" }),
        previewTheme,
        onPreviewThemeChange
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
        lineNumber: 289,
        columnNumber: 7
      },
      this
    ),
    !preview ? /* @__PURE__ */ jsxDEV(BottomMobileThemeReset, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 294,
      columnNumber: 19
    }, this) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
    lineNumber: 287,
    columnNumber: 5
  }, this);
}
_c8 = SecondaryButtons;
function RouteButton({
  tab,
  isActive,
  onRouteNavigate,
  onRouteSelect,
  renderDecoration
}) {
  const selectRoute = () => {
    if (isActive) return;
    onRouteSelect?.(tab.routeId, tab);
  };
  const navigateRoute = () => {
    if (isActive) return;
    if (!onRouteNavigate?.(tab.href, tab, { source: "button-bar", preemptTransition: true })) {
      window.location.assign(tab.href);
    }
  };
  const commonProps = {
    className: getRouteButtonClassName(tab),
    "data-button-bar-item": tab.routeId,
    "data-route-tab": tab.routeId,
    "data-state": isActive ? "active" : "idle",
    "aria-label": tab.ariaLabel,
    "aria-current": isActive ? "page" : void 0,
    onPointerDown: (event) => {
      if (isActive) return;
      if (isModifiedRouteEvent(event)) return;
      if (beginCapturedPointerPress(event)) {
        playButtonBarPressSound();
        markPointerActivated(event);
        if (!onRouteSelect) {
          event.preventDefault();
          navigateRoute();
        }
      }
    },
    onPointerUp: (event) => {
      if (isActive) return;
      if (!completeCapturedPointerPress(event)) return;
      if (onRouteSelect) selectRoute();
    },
    onKeyDown: (event) => {
      if (!isActive && isKeyboardPress(event)) playButtonBarPressSound();
    }
  };
  const decoration = renderDecoration?.(tab);
  if (onRouteSelect) {
    return /* @__PURE__ */ jsxDEV(
      "button",
      {
        type: "button",
        ...commonProps,
        onClick: (event) => {
          if (consumePointerActivated(event)) return;
          selectRoute();
        },
        children: /* @__PURE__ */ jsxDEV(RouteButtonContent, { tab, decoration }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 359,
          columnNumber: 9
        }, this)
      },
      tab.routeId,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
        lineNumber: 350,
        columnNumber: 7
      },
      this
    );
  }
  const handleClick = (event) => {
    if (consumePointerActivated(event)) {
      event.preventDefault();
      return;
    }
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    navigateRoute();
  };
  return /* @__PURE__ */ jsxDEV(
    "a",
    {
      href: tab.href,
      ...commonProps,
      onClick: handleClick,
      children: /* @__PURE__ */ jsxDEV(RouteButtonContent, { tab, decoration }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
        lineNumber: 392,
        columnNumber: 7
      }, this)
    },
    tab.routeId,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 386,
      columnNumber: 5
    },
    this
  );
}
_c9 = RouteButton;
export function ShellButtonBar({
  activeRouteId,
  className = "shell-bottom-band",
  materialVariant,
  navClassName = "",
  onRouteNavigate,
  onRouteSelect,
  preview = false,
  previewTheme,
  onPreviewThemeChange,
  renderRouteButtonDecoration,
  renderSecondaryButtonDecoration
}) {
  const normalizedActiveRouteId = getNormalizedActiveRouteId(activeRouteId);
  const activeRouteTab = getRouteTabById(normalizedActiveRouteId);
  const barClassName = ["button-bar", className].filter(Boolean).join(" ");
  const primaryNavClassName = [
    "button-bar__primary-buttons",
    "button-bar__nav",
    "shell-tab-nav",
    navClassName
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      className: barClassName,
      "data-button-bar": true,
      "data-shell-bottom-band": !preview ? "" : void 0,
      "data-button-bar-preview": preview ? "" : void 0,
      "data-button-bar-material": materialVariant || void 0,
      children: [
        /* @__PURE__ */ jsxDEV(
          "nav",
          {
            className: primaryNavClassName,
            "aria-label": preview ? "Playground route buttons" : "Primary buttons",
            "data-button-group": "primary-buttons",
            "data-button-bar-nav": true,
            "data-route-tabs": true,
            "data-active-route": activeRouteTab?.routeId,
            children: [
              /* @__PURE__ */ jsxDEV("span", { className: "button-bar__active-pill", "aria-hidden": "true" }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
                lineNumber: 436,
                columnNumber: 9
              }, this),
              SHELL_ROUTE_TABS.map(
                (tab) => /* @__PURE__ */ jsxDEV(
                  RouteButton,
                  {
                    tab,
                    isActive: tab.routeId === normalizedActiveRouteId,
                    onRouteNavigate,
                    onRouteSelect,
                    renderDecoration: renderRouteButtonDecoration
                  },
                  tab.routeId,
                  false,
                  {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
                    lineNumber: 438,
                    columnNumber: 9
                  },
                  this
                )
              )
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
            lineNumber: 428,
            columnNumber: 7
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("div", { className: "button-bar__divider", "aria-hidden": "true" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
          lineNumber: 448,
          columnNumber: 7
        }, this),
        /* @__PURE__ */ jsxDEV(
          SecondaryButtons,
          {
            preview,
            previewTheme,
            onPreviewThemeChange,
            renderDecoration: renderSecondaryButtonDecoration
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
            lineNumber: 449,
            columnNumber: 7
          },
          this
        )
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx",
      lineNumber: 421,
      columnNumber: 5
    },
    this
  );
}
_c0 = ShellButtonBar;
var _c, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c0;
$RefreshReg$(_c, "ButtonBarIcon");
$RefreshReg$(_c2, "RouteButtonContent");
$RefreshReg$(_c3, "SunIcon");
$RefreshReg$(_c4, "MoonIcon");
$RefreshReg$(_c5, "BottomThemeToggle");
$RefreshReg$(_c6, "BottomSoundToggle");
$RefreshReg$(_c7, "BottomMobileThemeReset");
$RefreshReg$(_c8, "SecondaryButtons");
$RefreshReg$(_c9, "RouteButton");
$RefreshReg$(_c0, "ShellButtonBar");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/app/ShellButtonBar.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUEsWUFDQSxrQkFBa0JxRztBQUFBQTtBQUFBQSxVQUpwQjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJb0Q7QUFBQTtBQUFBO0FBQUEsSUFoQ3REO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQWtDQTtBQUVKO0FBQUNNLE1BNURlVjtBQUFjLElBQUE5RCxJQUFBSSxLQUFBRSxLQUFBRSxLQUFBaUUsS0FBQUMsS0FBQUMsS0FBQWxDLEtBQUFvQixLQUFBVztBQUFBLGFBQUF4RSxJQUFBO0FBQUEsYUFBQUksS0FBQTtBQUFBLGFBQUFFLEtBQUE7QUFBQSxhQUFBRSxLQUFBO0FBQUEsYUFBQWlFLEtBQUE7QUFBQSxhQUFBQyxLQUFBO0FBQUEsYUFBQUMsS0FBQTtBQUFBLGFBQUFsQyxLQUFBO0FBQUEsYUFBQW9CLEtBQUE7QUFBQSxhQUFBVyxLQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJTT1VORF9TVEFURV9FVkVOVCIsImdldFNvdW5kU3RhdGUiLCJpbml0U291bmRFbmdpbmUiLCJwbGF5QnV0dG9uUHJlc3NTb3VuZCIsInBsYXlTb3VuZEVuYWJsZWRNb3RpZiIsInRvZ2dsZVNvdW5kIiwidW5sb2NrQXVkaW8iLCJnZXRDdXJyZW50VGhlbWUiLCJzZXRUaGVtZSIsIlNIRUxMX1JPVVRFX1RBQlMiLCJ1c2VSZW5kZXJlZFRoZW1lSXNEYXJrIiwiVEhFTUVfQ0hBTkdFX0VWRU5UIiwicmVhZFNvdW5kQnV0dG9uU3RhdGUiLCJzb3VuZFN0YXRlIiwiaXNVbmxvY2tlZCIsIkJvb2xlYW4iLCJpc0VuYWJsZWQiLCJnZXROb3JtYWxpemVkQWN0aXZlUm91dGVJZCIsImFjdGl2ZVJvdXRlSWQiLCJnZXRSb3V0ZVRhYkJ5SWQiLCJyb3V0ZUlkIiwiZmluZCIsInRhYiIsInBsYXlCdXR0b25CYXJQcmVzc1NvdW5kIiwiaXNQcmltYXJ5UG9pbnRlclByZXNzIiwiZXZlbnQiLCJwb2ludGVyVHlwZSIsImJ1dHRvbiIsImJlZ2luQ2FwdHVyZWRQb2ludGVyUHJlc3MiLCJjdXJyZW50VGFyZ2V0IiwiZGF0YXNldCIsImJ1dHRvbkJhclBvaW50ZXJQcmVzcyIsInNldFBvaW50ZXJDYXB0dXJlIiwicG9pbnRlcklkIiwiY29tcGxldGVDYXB0dXJlZFBvaW50ZXJQcmVzcyIsImRpZEJlZ2luT25Db250cm9sIiwicmVsZWFzZVBvaW50ZXJDYXB0dXJlIiwibWFya1BvaW50ZXJBY3RpdmF0ZWQiLCJidXR0b25CYXJQb2ludGVyQWN0aXZhdGVkIiwiY29uc3VtZVBvaW50ZXJBY3RpdmF0ZWQiLCJpc0tleWJvYXJkUHJlc3MiLCJyZXBlYXQiLCJrZXkiLCJpc01vZGlmaWVkUm91dGVFdmVudCIsIm1ldGFLZXkiLCJhbHRLZXkiLCJjdHJsS2V5Iiwic2hpZnRLZXkiLCJnZXRSb3V0ZUJ1dHRvbkNsYXNzTmFtZSIsImljb25Pbmx5IiwiZmlsdGVyIiwiam9pbiIsIkJ1dHRvbkJhckljb24iLCJjbGFzc05hbWUiLCJpY29uIiwiX2MiLCJSb3V0ZUJ1dHRvbkNvbnRlbnQiLCJkZWNvcmF0aW9uIiwibGFiZWwiLCJfYzIiLCJTdW5JY29uIiwiX2MzIiwiTW9vbkljb24iLCJfYzQiLCJ1c2VDdXJyZW50VGhlbWVQcmVmZXJlbmNlIiwiX3MiLCJwcmVmZXJlbmNlIiwic2V0UHJlZmVyZW5jZSIsInN5bmNQcmVmZXJlbmNlIiwiZGV0YWlsIiwidGhlbWUiLCJ3aW5kb3ciLCJhZGRFdmVudExpc3RlbmVyIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIkJvdHRvbVRoZW1lVG9nZ2xlIiwicHJldmlld1RoZW1lIiwib25QcmV2aWV3VGhlbWVDaGFuZ2UiLCJfczIiLCJyZW5kZXJlZFRoZW1lSXNEYXJrIiwiaXNEYXJrIiwibmV4dFRoZW1lIiwiYWN0aXZhdGVUaGVtZSIsIkJvdHRvbVNvdW5kVG9nZ2xlIiwiX3MzIiwic2V0U291bmRTdGF0ZSIsInN5bmNTb3VuZFN0YXRlIiwiaGFuZGxlQ2xpY2siLCJjdXJyZW50U3RhdGUiLCJkaWRVbmxvY2siLCJpc05vd0VuYWJsZWQiLCJCb3R0b21Nb2JpbGVUaGVtZVJlc2V0IiwiX3M0IiwiU2Vjb25kYXJ5QnV0dG9ucyIsInByZXZpZXciLCJyZW5kZXJEZWNvcmF0aW9uIiwiY29udHJvbElkIiwiX2M4IiwiUm91dGVCdXR0b24iLCJpc0FjdGl2ZSIsIm9uUm91dGVOYXZpZ2F0ZSIsIm9uUm91dGVTZWxlY3QiLCJzZWxlY3RSb3V0ZSIsIm5hdmlnYXRlUm91dGUiLCJocmVmIiwic291cmNlIiwicHJlZW1wdFRyYW5zaXRpb24iLCJsb2NhdGlvbiIsImFzc2lnbiIsImNvbW1vblByb3BzIiwiYXJpYUxhYmVsIiwidW5kZWZpbmVkIiwib25Qb2ludGVyRG93biIsInByZXZlbnREZWZhdWx0Iiwib25Qb2ludGVyVXAiLCJvbktleURvd24iLCJkZWZhdWx0UHJldmVudGVkIiwiX2M5IiwiU2hlbGxCdXR0b25CYXIiLCJtYXRlcmlhbFZhcmlhbnQiLCJuYXZDbGFzc05hbWUiLCJyZW5kZXJSb3V0ZUJ1dHRvbkRlY29yYXRpb24iLCJyZW5kZXJTZWNvbmRhcnlCdXR0b25EZWNvcmF0aW9uIiwibm9ybWFsaXplZEFjdGl2ZVJvdXRlSWQiLCJhY3RpdmVSb3V0ZVRhYiIsImJhckNsYXNzTmFtZSIsInByaW1hcnlOYXZDbGFzc05hbWUiLCJtYXAiLCJfYzAiLCJfYzUiLCJfYzYiLCJfYzciXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiU2hlbGxCdXR0b25CYXIuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQge1xuICBTT1VORF9TVEFURV9FVkVOVCxcbiAgZ2V0U291bmRTdGF0ZSxcbiAgaW5pdFNvdW5kRW5naW5lLFxuICBwbGF5QnV0dG9uUHJlc3NTb3VuZCxcbiAgcGxheVNvdW5kRW5hYmxlZE1vdGlmLFxuICB0b2dnbGVTb3VuZCxcbiAgdW5sb2NrQXVkaW8sXG59IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL2F1ZGlvL3NvdW5kLWVuZ2luZS5qcyc7XG5pbXBvcnQgeyBnZXRDdXJyZW50VGhlbWUsIHNldFRoZW1lIH0gZnJvbSAnLi4vLi4vbGVnYWN5L21vZHVsZXMvdmlzdWFsL2RhcmstbW9kZS12Mi5qcyc7XG5pbXBvcnQgeyBTSEVMTF9ST1VURV9UQUJTIH0gZnJvbSAnLi4vLi4vbGliL3JvdXRlcy5qcyc7XG5pbXBvcnQgeyB1c2VSZW5kZXJlZFRoZW1lSXNEYXJrIH0gZnJvbSAnLi4vLi4vaG9va3MvdXNlUmVuZGVyZWRUaGVtZS5qcyc7XG5pbXBvcnQgeyBUSEVNRV9DSEFOR0VfRVZFTlQgfSBmcm9tICcuLi8uLi9saWIvdGhlbWUtc3RhdGUuanMnO1xuaW1wb3J0ICcuL3NoZWxsLWJ1dHRvbi1iYXItZG9taW5hbnQuY3NzJztcblxuZnVuY3Rpb24gcmVhZFNvdW5kQnV0dG9uU3RhdGUoKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc291bmRTdGF0ZSA9IGdldFNvdW5kU3RhdGUoKTtcbiAgICByZXR1cm4ge1xuICAgICAgaXNVbmxvY2tlZDogQm9vbGVhbihzb3VuZFN0YXRlPy5pc1VubG9ja2VkKSxcbiAgICAgIGlzRW5hYmxlZDogQm9vbGVhbihzb3VuZFN0YXRlPy5pc1VubG9ja2VkICYmIHNvdW5kU3RhdGU/LmlzRW5hYmxlZCksXG4gICAgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGlzVW5sb2NrZWQ6IGZhbHNlLFxuICAgICAgaXNFbmFibGVkOiBmYWxzZSxcbiAgICB9O1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldE5vcm1hbGl6ZWRBY3RpdmVSb3V0ZUlkKGFjdGl2ZVJvdXRlSWQpIHtcbiAgcmV0dXJuIGFjdGl2ZVJvdXRlSWQ7XG59XG5cbmZ1bmN0aW9uIGdldFJvdXRlVGFiQnlJZChyb3V0ZUlkKSB7XG4gIHJldHVybiBTSEVMTF9ST1VURV9UQUJTLmZpbmQoKHRhYikgPT4gdGFiLnJvdXRlSWQgPT09IHJvdXRlSWQpO1xufVxuXG5mdW5jdGlvbiBwbGF5QnV0dG9uQmFyUHJlc3NTb3VuZCgpIHtcbiAgcGxheUJ1dHRvblByZXNzU291bmQoKTtcbn1cblxuZnVuY3Rpb24gaXNQcmltYXJ5UG9pbnRlclByZXNzKGV2ZW50KSB7XG4gIHJldHVybiBldmVudC5wb2ludGVyVHlwZSA9PT0gJ3RvdWNoJyB8fCBldmVudC5wb2ludGVyVHlwZSA9PT0gJ3BlbicgfHwgZXZlbnQuYnV0dG9uID09PSAwO1xufVxuXG5mdW5jdGlvbiBiZWdpbkNhcHR1cmVkUG9pbnRlclByZXNzKGV2ZW50KSB7XG4gIGlmICghaXNQcmltYXJ5UG9pbnRlclByZXNzKGV2ZW50KSkgcmV0dXJuIGZhbHNlO1xuICBldmVudC5jdXJyZW50VGFyZ2V0LmRhdGFzZXQuYnV0dG9uQmFyUG9pbnRlclByZXNzID0gJ3RydWUnO1xuICBldmVudC5jdXJyZW50VGFyZ2V0LnNldFBvaW50ZXJDYXB0dXJlPy4oZXZlbnQucG9pbnRlcklkKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGNvbXBsZXRlQ2FwdHVyZWRQb2ludGVyUHJlc3MoZXZlbnQpIHtcbiAgaWYgKCFpc1ByaW1hcnlQb2ludGVyUHJlc3MoZXZlbnQpKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGRpZEJlZ2luT25Db250cm9sID0gZXZlbnQuY3VycmVudFRhcmdldC5kYXRhc2V0LmJ1dHRvbkJhclBvaW50ZXJQcmVzcyA9PT0gJ3RydWUnO1xuICBkZWxldGUgZXZlbnQuY3VycmVudFRhcmdldC5kYXRhc2V0LmJ1dHRvbkJhclBvaW50ZXJQcmVzcztcbiAgZXZlbnQuY3VycmVudFRhcmdldC5yZWxlYXNlUG9pbnRlckNhcHR1cmU/LihldmVudC5wb2ludGVySWQpO1xuICByZXR1cm4gZGlkQmVnaW5PbkNvbnRyb2w7XG59XG5cbmZ1bmN0aW9uIG1hcmtQb2ludGVyQWN0aXZhdGVkKGV2ZW50KSB7XG4gIGV2ZW50LmN1cnJlbnRUYXJnZXQuZGF0YXNldC5idXR0b25CYXJQb2ludGVyQWN0aXZhdGVkID0gJ3RydWUnO1xufVxuXG5mdW5jdGlvbiBjb25zdW1lUG9pbnRlckFjdGl2YXRlZChldmVudCkge1xuICBpZiAoZXZlbnQuY3VycmVudFRhcmdldC5kYXRhc2V0LmJ1dHRvbkJhclBvaW50ZXJBY3RpdmF0ZWQgIT09ICd0cnVlJykgcmV0dXJuIGZhbHNlO1xuICBkZWxldGUgZXZlbnQuY3VycmVudFRhcmdldC5kYXRhc2V0LmJ1dHRvbkJhclBvaW50ZXJBY3RpdmF0ZWQ7XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBpc0tleWJvYXJkUHJlc3MoZXZlbnQpIHtcbiAgcmV0dXJuICFldmVudC5yZXBlYXQgJiYgKGV2ZW50LmtleSA9PT0gJ0VudGVyJyB8fCBldmVudC5rZXkgPT09ICcgJyk7XG59XG5cbmZ1bmN0aW9uIGlzTW9kaWZpZWRSb3V0ZUV2ZW50KGV2ZW50KSB7XG4gIHJldHVybiBldmVudC5tZXRhS2V5IHx8IGV2ZW50LmFsdEtleSB8fCBldmVudC5jdHJsS2V5IHx8IGV2ZW50LnNoaWZ0S2V5O1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZUJ1dHRvbkNsYXNzTmFtZSh0YWIpIHtcbiAgcmV0dXJuIFtcbiAgICAnYnV0dG9uLWJhcl9fYnV0dG9uJyxcbiAgICAnc2hlbGwtdGFiJyxcbiAgICB0YWIuaWNvbk9ubHkgPyAnYnV0dG9uLWJhcl9fYnV0dG9uLS1pY29uLW9ubHkgc2hlbGwtdGFiLS1pY29uLW9ubHknIDogJycsXG4gIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcbn1cblxuZnVuY3Rpb24gQnV0dG9uQmFySWNvbih7IHRhYiwgY2xhc3NOYW1lID0gJ2J1dHRvbi1iYXJfX2ljb24gc2hlbGwtdGFiX19pY29uJyB9KSB7XG4gIHJldHVybiA8aSBjbGFzc05hbWU9e2B0aSAke3RhYi5pY29ufSAke2NsYXNzTmFtZX1gfSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPjtcbn1cblxuZnVuY3Rpb24gUm91dGVCdXR0b25Db250ZW50KHsgdGFiLCBkZWNvcmF0aW9uIH0pIHtcbiAgcmV0dXJuIChcbiAgICA8PlxuICAgICAge2RlY29yYXRpb259XG4gICAgICA8QnV0dG9uQmFySWNvbiB0YWI9e3RhYn0gLz5cbiAgICAgIHt0YWIuaWNvbk9ubHkgPyAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwic2NyZWVuLXJlYWRlclwiPnt0YWIubGFiZWx9PC9zcGFuPlxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX2xhYmVsIGJ1dHRvbi1iYXJfX2xhYmVsLS1tb2JpbGUtb25seSBzaGVsbC10YWJfX2xhYmVsXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+e3RhYi5sYWJlbH08L3NwYW4+XG4gICAgICAgIDwvPlxuICAgICAgKSA6IChcbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiYnV0dG9uLWJhcl9fbGFiZWwgc2hlbGwtdGFiX19sYWJlbFwiPnt0YWIubGFiZWx9PC9zcGFuPlxuICAgICAgKX1cbiAgICA8Lz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU3VuSWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8c3ZnIGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX3NlY29uZGFyeS1zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICA8Y2lyY2xlIGN4PVwiMTJcIiBjeT1cIjEyXCIgcj1cIjRcIiAvPlxuICAgICAgPHBhdGggZD1cIk0xMiAydjIuMk0xMiAxOS44VjIyTTQuOTMgNC45M2wxLjU2IDEuNTZNMTcuNTEgMTcuNTFsMS41NiAxLjU2TTIgMTJoMi4yTTE5LjggMTJIMjJNNC45MyAxOS4wN2wxLjU2LTEuNTZNMTcuNTEgNi40OWwxLjU2LTEuNTZcIiAvPlxuICAgIDwvc3ZnPlxuICApO1xufVxuXG5mdW5jdGlvbiBNb29uSWNvbigpIHtcbiAgcmV0dXJuIChcbiAgICA8c3ZnIGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX3NlY29uZGFyeS1zdmdcIiB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XG4gICAgICA8cGF0aCBkPVwiTTIwLjM1IDE0LjY0QTguNyA4LjcgMCAwIDEgOS4zNiAzLjY1YTguNyA4LjcgMCAxIDAgMTAuOTkgMTAuOTlaXCIgLz5cbiAgICA8L3N2Zz5cbiAgKTtcbn1cblxuZnVuY3Rpb24gdXNlQ3VycmVudFRoZW1lUHJlZmVyZW5jZSgpIHtcbiAgY29uc3QgW3ByZWZlcmVuY2UsIHNldFByZWZlcmVuY2VdID0gdXNlU3RhdGUoKCkgPT4gZ2V0Q3VycmVudFRoZW1lKCkpO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGNvbnN0IHN5bmNQcmVmZXJlbmNlID0gKGV2ZW50KSA9PiB7XG4gICAgICBzZXRQcmVmZXJlbmNlKGV2ZW50Py5kZXRhaWw/LnRoZW1lIHx8IGdldEN1cnJlbnRUaGVtZSgpKTtcbiAgICB9O1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFRIRU1FX0NIQU5HRV9FVkVOVCwgc3luY1ByZWZlcmVuY2UpO1xuICAgIHN5bmNQcmVmZXJlbmNlKCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFRIRU1FX0NIQU5HRV9FVkVOVCwgc3luY1ByZWZlcmVuY2UpO1xuICB9LCBbXSk7XG4gIHJldHVybiBwcmVmZXJlbmNlO1xufVxuXG5mdW5jdGlvbiBCb3R0b21UaGVtZVRvZ2dsZSh7IGRlY29yYXRpb24sIHByZXZpZXdUaGVtZSwgb25QcmV2aWV3VGhlbWVDaGFuZ2UgfSkge1xuICBjb25zdCByZW5kZXJlZFRoZW1lSXNEYXJrID0gdXNlUmVuZGVyZWRUaGVtZUlzRGFyaygpO1xuICBjb25zdCBpc0RhcmsgPSBwcmV2aWV3VGhlbWUgPyBwcmV2aWV3VGhlbWUgPT09ICdkYXJrJyA6IHJlbmRlcmVkVGhlbWVJc0Rhcms7XG5cbiAgY29uc3QgbmV4dFRoZW1lID0gaXNEYXJrID8gJ2xpZ2h0JyA6ICdkYXJrJztcbiAgY29uc3QgYWN0aXZhdGVUaGVtZSA9ICgpID0+IHtcbiAgICBpZiAob25QcmV2aWV3VGhlbWVDaGFuZ2UpIHtcbiAgICAgIG9uUHJldmlld1RoZW1lQ2hhbmdlKG5leHRUaGVtZSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHNldFRoZW1lKG5leHRUaGVtZSk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8YnV0dG9uXG4gICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgIGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX3NlY29uZGFyeS1idXR0b24gYnV0dG9uLWJhcl9fdGhlbWUtdG9nZ2xlIHNoZWxsLXRhYiBzaGVsbC10YWItLWljb24tb25seVwiXG4gICAgICBhcmlhLWxhYmVsPXtpc0RhcmsgPyAnU3dpdGNoIHRvIGxpZ2h0IG1vZGUnIDogJ1N3aXRjaCB0byBkYXJrIG1vZGUnfVxuICAgICAgYXJpYS1wcmVzc2VkPXtpc0RhcmsgPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgZGF0YS1zdGF0ZT17aXNEYXJrID8gJ2RhcmsnIDogJ2xpZ2h0J31cbiAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4ge1xuICAgICAgICBpZiAoYmVnaW5DYXB0dXJlZFBvaW50ZXJQcmVzcyhldmVudCkpIHBsYXlCdXR0b25CYXJQcmVzc1NvdW5kKCk7XG4gICAgICB9fVxuICAgICAgb25Qb2ludGVyVXA9eyhldmVudCkgPT4ge1xuICAgICAgICBpZiAoIWNvbXBsZXRlQ2FwdHVyZWRQb2ludGVyUHJlc3MoZXZlbnQpKSByZXR1cm47XG4gICAgICAgIG1hcmtQb2ludGVyQWN0aXZhdGVkKGV2ZW50KTtcbiAgICAgICAgYWN0aXZhdGVUaGVtZSgpO1xuICAgICAgfX1cbiAgICAgIG9uS2V5RG93bj17KGV2ZW50KSA9PiB7XG4gICAgICAgIGlmIChpc0tleWJvYXJkUHJlc3MoZXZlbnQpKSBwbGF5QnV0dG9uQmFyUHJlc3NTb3VuZCgpO1xuICAgICAgfX1cbiAgICAgIG9uQ2xpY2s9eyhldmVudCkgPT4ge1xuICAgICAgICBpZiAoY29uc3VtZVBvaW50ZXJBY3RpdmF0ZWQoZXZlbnQpKSByZXR1cm47XG4gICAgICAgIGFjdGl2YXRlVGhlbWUoKTtcbiAgICAgIH19XG4gICAgPlxuICAgICAge2RlY29yYXRpb259XG4gICAgICA8c3BhbiBjbGFzc05hbWU9XCJidXR0b24tYmFyX190aGVtZS10aHVtYlwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiPlxuICAgICAgICB7aXNEYXJrID8gPE1vb25JY29uIC8+IDogPFN1bkljb24gLz59XG4gICAgICA8L3NwYW4+XG4gICAgICA8c3BhbiBjbGFzc05hbWU9XCJzY3JlZW4tcmVhZGVyXCI+e2lzRGFyayA/ICdTd2l0Y2ggdG8gbGlnaHQgbW9kZScgOiAnU3dpdGNoIHRvIGRhcmsgbW9kZSd9PC9zcGFuPlxuICAgIDwvYnV0dG9uPlxuICApO1xufVxuXG5mdW5jdGlvbiBCb3R0b21Tb3VuZFRvZ2dsZSh7IGRlY29yYXRpb24gfSkge1xuICBjb25zdCBbc291bmRTdGF0ZSwgc2V0U291bmRTdGF0ZV0gPSB1c2VTdGF0ZShyZWFkU291bmRCdXR0b25TdGF0ZSk7XG4gIGNvbnN0IGlzRW5hYmxlZCA9IHNvdW5kU3RhdGUuaXNVbmxvY2tlZCAmJiBzb3VuZFN0YXRlLmlzRW5hYmxlZDtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGluaXRTb3VuZEVuZ2luZSgpO1xuXG4gICAgY29uc3Qgc3luY1NvdW5kU3RhdGUgPSAoZXZlbnQpID0+IHtcbiAgICAgIGlmIChldmVudD8uZGV0YWlsKSB7XG4gICAgICAgIHNldFNvdW5kU3RhdGUoe1xuICAgICAgICAgIGlzVW5sb2NrZWQ6IEJvb2xlYW4oZXZlbnQuZGV0YWlsLmlzVW5sb2NrZWQpLFxuICAgICAgICAgIGlzRW5hYmxlZDogQm9vbGVhbihldmVudC5kZXRhaWwuaXNVbmxvY2tlZCAmJiBldmVudC5kZXRhaWwuaXNFbmFibGVkKSxcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgc2V0U291bmRTdGF0ZShyZWFkU291bmRCdXR0b25TdGF0ZSgpKTtcbiAgICB9O1xuXG4gICAgc3luY1NvdW5kU3RhdGUoKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihTT1VORF9TVEFURV9FVkVOVCwgc3luY1NvdW5kU3RhdGUpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihTT1VORF9TVEFURV9FVkVOVCwgc3luY1NvdW5kU3RhdGUpO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICBjb25zdCBoYW5kbGVDbGljayA9IGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBjdXJyZW50U3RhdGUgPSByZWFkU291bmRCdXR0b25TdGF0ZSgpO1xuXG4gICAgaWYgKCFjdXJyZW50U3RhdGUuaXNVbmxvY2tlZCkge1xuICAgICAgY29uc3QgZGlkVW5sb2NrID0gYXdhaXQgdW5sb2NrQXVkaW8oKTtcbiAgICAgIHNldFNvdW5kU3RhdGUocmVhZFNvdW5kQnV0dG9uU3RhdGUoKSk7XG4gICAgICBpZiAoZGlkVW5sb2NrICYmIHJlYWRTb3VuZEJ1dHRvblN0YXRlKCkuaXNFbmFibGVkKSB7XG4gICAgICAgIHBsYXlTb3VuZEVuYWJsZWRNb3RpZigpO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGlzTm93RW5hYmxlZCA9IHRvZ2dsZVNvdW5kKCk7XG4gICAgc2V0U291bmRTdGF0ZShyZWFkU291bmRCdXR0b25TdGF0ZSgpKTtcbiAgICBpZiAoaXNOb3dFbmFibGVkKSB7XG4gICAgICBwbGF5U291bmRFbmFibGVkTW90aWYoKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8YnV0dG9uXG4gICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgIGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX3NlY29uZGFyeS1idXR0b24gYnV0dG9uLWJhcl9fc291bmQtdG9nZ2xlIHNoZWxsLXRhYiBzaGVsbC10YWItLWljb24tb25seVwiXG4gICAgICBhcmlhLWxhYmVsPXtpc0VuYWJsZWQgPyAnU291bmQgb24nIDogJ1NvdW5kIG9mZid9XG4gICAgICBhcmlhLXByZXNzZWQ9e2lzRW5hYmxlZCA/ICd0cnVlJyA6ICdmYWxzZSd9XG4gICAgICBkYXRhLXN0YXRlPXtpc0VuYWJsZWQgPyAnYWN0aXZlJyA6ICdpZGxlJ31cbiAgICAgIGRhdGEtZW5hYmxlZD17aXNFbmFibGVkID8gJ3RydWUnIDogJ2ZhbHNlJ31cbiAgICAgIG9uUG9pbnRlckRvd249eyhldmVudCkgPT4ge1xuICAgICAgICBpZiAoYmVnaW5DYXB0dXJlZFBvaW50ZXJQcmVzcyhldmVudCkpIHBsYXlCdXR0b25CYXJQcmVzc1NvdW5kKCk7XG4gICAgICB9fVxuICAgICAgb25Qb2ludGVyVXA9eyhldmVudCkgPT4ge1xuICAgICAgICBpZiAoIWNvbXBsZXRlQ2FwdHVyZWRQb2ludGVyUHJlc3MoZXZlbnQpKSByZXR1cm47XG4gICAgICAgIG1hcmtQb2ludGVyQWN0aXZhdGVkKGV2ZW50KTtcbiAgICAgICAgaGFuZGxlQ2xpY2soKTtcbiAgICAgIH19XG4gICAgICBvbktleURvd249eyhldmVudCkgPT4ge1xuICAgICAgICBpZiAoaXNLZXlib2FyZFByZXNzKGV2ZW50KSkgcGxheUJ1dHRvbkJhclByZXNzU291bmQoKTtcbiAgICAgIH19XG4gICAgICBvbkNsaWNrPXsoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKGNvbnN1bWVQb2ludGVyQWN0aXZhdGVkKGV2ZW50KSkgcmV0dXJuO1xuICAgICAgICBoYW5kbGVDbGljaygpO1xuICAgICAgfX1cbiAgICA+XG4gICAgICB7ZGVjb3JhdGlvbn1cbiAgICAgIDxpIGNsYXNzTmFtZT17YHRpICR7aXNFbmFibGVkID8gJ3RpLXZvbHVtZS0yJyA6ICd0aS12b2x1bWUtb2ZmJ30gYnV0dG9uLWJhcl9fc2Vjb25kYXJ5LWljb24gc2hlbGwtdGFiX19pY29uYH0gYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgIDxzcGFuIGNsYXNzTmFtZT1cInNjcmVlbi1yZWFkZXJcIj57aXNFbmFibGVkID8gJ1NvdW5kIG9uJyA6ICdTb3VuZCBvZmYnfTwvc3Bhbj5cbiAgICA8L2J1dHRvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gQm90dG9tTW9iaWxlVGhlbWVSZXNldCgpIHtcbiAgY29uc3QgcHJlZmVyZW5jZSA9IHVzZUN1cnJlbnRUaGVtZVByZWZlcmVuY2UoKTtcbiAgY29uc3QgaXNEYXJrID0gdXNlUmVuZGVyZWRUaGVtZUlzRGFyaygpO1xuICBpZiAocHJlZmVyZW5jZSA9PT0gJ2F1dG8nKSByZXR1cm4gbnVsbDtcblxuICByZXR1cm4gKFxuICAgIDxidXR0b25cbiAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgY2xhc3NOYW1lPVwiYnV0dG9uLWJhcl9fc2Vjb25kYXJ5LWJ1dHRvbiBidXR0b24tYmFyX19tb2JpbGUtdGhlbWUtcmVzZXQgc2hlbGwtdGFiIHNoZWxsLXRhYi0taWNvbi1vbmx5XCJcbiAgICAgIGFyaWEtbGFiZWw9e2BVc2UgZGV2aWNlIHRoZW1lIGluc3RlYWQgb2YgbWFudWFsICR7cHJlZmVyZW5jZX0gbW9kZWB9XG4gICAgICBkYXRhLXN0YXRlPXtpc0RhcmsgPyAnZGFyaycgOiAnbGlnaHQnfVxuICAgICAgb25DbGljaz17KCkgPT4gc2V0VGhlbWUoJ2F1dG8nKX1cbiAgICA+XG4gICAgICB7aXNEYXJrID8gPE1vb25JY29uIC8+IDogPFN1bkljb24gLz59XG4gICAgICA8c3BhbiBjbGFzc05hbWU9XCJzY3JlZW4tcmVhZGVyXCI+VXNlIGRldmljZSB0aGVtZTwvc3Bhbj5cbiAgICA8L2J1dHRvbj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gU2Vjb25kYXJ5QnV0dG9ucyh7XG4gIHByZXZpZXcsXG4gIHByZXZpZXdUaGVtZSxcbiAgb25QcmV2aWV3VGhlbWVDaGFuZ2UsXG4gIHJlbmRlckRlY29yYXRpb24sXG59KSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBjbGFzc05hbWU9XCJidXR0b24tYmFyX19zZWNvbmRhcnktYnV0dG9uc1wiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWw9XCJTZWNvbmRhcnkgYnV0dG9uc1wiIGRhdGEtYnV0dG9uLWdyb3VwPVwic2Vjb25kYXJ5LWJ1dHRvbnNcIj5cbiAgICAgIDxCb3R0b21Tb3VuZFRvZ2dsZSBkZWNvcmF0aW9uPXtyZW5kZXJEZWNvcmF0aW9uPy4oeyBjb250cm9sSWQ6ICdzb3VuZCcgfSl9IC8+XG4gICAgICA8Qm90dG9tVGhlbWVUb2dnbGVcbiAgICAgICAgZGVjb3JhdGlvbj17cmVuZGVyRGVjb3JhdGlvbj8uKHsgY29udHJvbElkOiAndGhlbWUnIH0pfVxuICAgICAgICBwcmV2aWV3VGhlbWU9e3ByZXZpZXdUaGVtZX1cbiAgICAgICAgb25QcmV2aWV3VGhlbWVDaGFuZ2U9e29uUHJldmlld1RoZW1lQ2hhbmdlfVxuICAgICAgLz5cbiAgICAgIHshcHJldmlldyA/IDxCb3R0b21Nb2JpbGVUaGVtZVJlc2V0IC8+IDogbnVsbH1cbiAgICA8L2Rpdj5cbiAgKTtcbn1cblxuZnVuY3Rpb24gUm91dGVCdXR0b24oe1xuICB0YWIsXG4gIGlzQWN0aXZlLFxuICBvblJvdXRlTmF2aWdhdGUsXG4gIG9uUm91dGVTZWxlY3QsXG4gIHJlbmRlckRlY29yYXRpb24sXG59KSB7XG4gIGNvbnN0IHNlbGVjdFJvdXRlID0gKCkgPT4ge1xuICAgIGlmIChpc0FjdGl2ZSkgcmV0dXJuO1xuICAgIG9uUm91dGVTZWxlY3Q/Lih0YWIucm91dGVJZCwgdGFiKTtcbiAgfTtcblxuICBjb25zdCBuYXZpZ2F0ZVJvdXRlID0gKCkgPT4ge1xuICAgIGlmIChpc0FjdGl2ZSkgcmV0dXJuO1xuICAgIGlmICghb25Sb3V0ZU5hdmlnYXRlPy4odGFiLmhyZWYsIHRhYiwgeyBzb3VyY2U6ICdidXR0b24tYmFyJywgcHJlZW1wdFRyYW5zaXRpb246IHRydWUgfSkpIHtcbiAgICAgIHdpbmRvdy5sb2NhdGlvbi5hc3NpZ24odGFiLmhyZWYpO1xuICAgIH1cbiAgfTtcblxuICBjb25zdCBjb21tb25Qcm9wcyA9IHtcbiAgICBjbGFzc05hbWU6IGdldFJvdXRlQnV0dG9uQ2xhc3NOYW1lKHRhYiksXG4gICAgJ2RhdGEtYnV0dG9uLWJhci1pdGVtJzogdGFiLnJvdXRlSWQsXG4gICAgJ2RhdGEtcm91dGUtdGFiJzogdGFiLnJvdXRlSWQsXG4gICAgJ2RhdGEtc3RhdGUnOiBpc0FjdGl2ZSA/ICdhY3RpdmUnIDogJ2lkbGUnLFxuICAgICdhcmlhLWxhYmVsJzogdGFiLmFyaWFMYWJlbCxcbiAgICAnYXJpYS1jdXJyZW50JzogaXNBY3RpdmUgPyAncGFnZScgOiB1bmRlZmluZWQsXG4gICAgb25Qb2ludGVyRG93bjogKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoaXNBY3RpdmUpIHJldHVybjtcbiAgICAgIGlmIChpc01vZGlmaWVkUm91dGVFdmVudChldmVudCkpIHJldHVybjtcbiAgICAgIGlmIChiZWdpbkNhcHR1cmVkUG9pbnRlclByZXNzKGV2ZW50KSkge1xuICAgICAgICBwbGF5QnV0dG9uQmFyUHJlc3NTb3VuZCgpO1xuICAgICAgICBtYXJrUG9pbnRlckFjdGl2YXRlZChldmVudCk7XG4gICAgICAgIGlmICghb25Sb3V0ZVNlbGVjdCkge1xuICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgbmF2aWdhdGVSb3V0ZSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBvblBvaW50ZXJVcDogKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoaXNBY3RpdmUpIHJldHVybjtcbiAgICAgIGlmICghY29tcGxldGVDYXB0dXJlZFBvaW50ZXJQcmVzcyhldmVudCkpIHJldHVybjtcbiAgICAgIGlmIChvblJvdXRlU2VsZWN0KSBzZWxlY3RSb3V0ZSgpO1xuICAgIH0sXG4gICAgb25LZXlEb3duOiAoZXZlbnQpID0+IHtcbiAgICAgIGlmICghaXNBY3RpdmUgJiYgaXNLZXlib2FyZFByZXNzKGV2ZW50KSkgcGxheUJ1dHRvbkJhclByZXNzU291bmQoKTtcbiAgICB9LFxuICB9O1xuICBjb25zdCBkZWNvcmF0aW9uID0gcmVuZGVyRGVjb3JhdGlvbj8uKHRhYik7XG5cbiAgaWYgKG9uUm91dGVTZWxlY3QpIHtcbiAgICByZXR1cm4gKFxuICAgICAgPGJ1dHRvblxuICAgICAgICBrZXk9e3RhYi5yb3V0ZUlkfVxuICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgey4uLmNvbW1vblByb3BzfVxuICAgICAgICBvbkNsaWNrPXsoZXZlbnQpID0+IHtcbiAgICAgICAgICBpZiAoY29uc3VtZVBvaW50ZXJBY3RpdmF0ZWQoZXZlbnQpKSByZXR1cm47XG4gICAgICAgICAgc2VsZWN0Um91dGUoKTtcbiAgICAgICAgfX1cbiAgICAgID5cbiAgICAgICAgPFJvdXRlQnV0dG9uQ29udGVudCB0YWI9e3RhYn0gZGVjb3JhdGlvbj17ZGVjb3JhdGlvbn0gLz5cbiAgICAgIDwvYnV0dG9uPlxuICAgICk7XG4gIH1cblxuICBjb25zdCBoYW5kbGVDbGljayA9IChldmVudCkgPT4ge1xuICAgIGlmIChjb25zdW1lUG9pbnRlckFjdGl2YXRlZChldmVudCkpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgaWYgKFxuICAgICAgZXZlbnQuZGVmYXVsdFByZXZlbnRlZFxuICAgICAgfHwgZXZlbnQuYnV0dG9uICE9PSAwXG4gICAgICB8fCBldmVudC5tZXRhS2V5XG4gICAgICB8fCBldmVudC5hbHRLZXlcbiAgICAgIHx8IGV2ZW50LmN0cmxLZXlcbiAgICAgIHx8IGV2ZW50LnNoaWZ0S2V5XG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBuYXZpZ2F0ZVJvdXRlKCk7XG4gIH07XG5cbiAgcmV0dXJuIChcbiAgICA8YVxuICAgICAga2V5PXt0YWIucm91dGVJZH1cbiAgICAgIGhyZWY9e3RhYi5ocmVmfVxuICAgICAgey4uLmNvbW1vblByb3BzfVxuICAgICAgb25DbGljaz17aGFuZGxlQ2xpY2t9XG4gICAgPlxuICAgICAgPFJvdXRlQnV0dG9uQ29udGVudCB0YWI9e3RhYn0gZGVjb3JhdGlvbj17ZGVjb3JhdGlvbn0gLz5cbiAgICA8L2E+XG4gICk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBTaGVsbEJ1dHRvbkJhcih7XG4gIGFjdGl2ZVJvdXRlSWQsXG4gIGNsYXNzTmFtZSA9ICdzaGVsbC1ib3R0b20tYmFuZCcsXG4gIG1hdGVyaWFsVmFyaWFudCxcbiAgbmF2Q2xhc3NOYW1lID0gJycsXG4gIG9uUm91dGVOYXZpZ2F0ZSxcbiAgb25Sb3V0ZVNlbGVjdCxcbiAgcHJldmlldyA9IGZhbHNlLFxuICBwcmV2aWV3VGhlbWUsXG4gIG9uUHJldmlld1RoZW1lQ2hhbmdlLFxuICByZW5kZXJSb3V0ZUJ1dHRvbkRlY29yYXRpb24sXG4gIHJlbmRlclNlY29uZGFyeUJ1dHRvbkRlY29yYXRpb24sXG59KSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWRBY3RpdmVSb3V0ZUlkID0gZ2V0Tm9ybWFsaXplZEFjdGl2ZVJvdXRlSWQoYWN0aXZlUm91dGVJZCk7XG4gIGNvbnN0IGFjdGl2ZVJvdXRlVGFiID0gZ2V0Um91dGVUYWJCeUlkKG5vcm1hbGl6ZWRBY3RpdmVSb3V0ZUlkKTtcbiAgY29uc3QgYmFyQ2xhc3NOYW1lID0gWydidXR0b24tYmFyJywgY2xhc3NOYW1lXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpO1xuICBjb25zdCBwcmltYXJ5TmF2Q2xhc3NOYW1lID0gW1xuICAgICdidXR0b24tYmFyX19wcmltYXJ5LWJ1dHRvbnMnLFxuICAgICdidXR0b24tYmFyX19uYXYnLFxuICAgICdzaGVsbC10YWItbmF2JyxcbiAgICBuYXZDbGFzc05hbWUsXG4gIF0uZmlsdGVyKEJvb2xlYW4pLmpvaW4oJyAnKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXZcbiAgICAgIGNsYXNzTmFtZT17YmFyQ2xhc3NOYW1lfVxuICAgICAgZGF0YS1idXR0b24tYmFyXG4gICAgICBkYXRhLXNoZWxsLWJvdHRvbS1iYW5kPXshcHJldmlldyA/ICcnIDogdW5kZWZpbmVkfVxuICAgICAgZGF0YS1idXR0b24tYmFyLXByZXZpZXc9e3ByZXZpZXcgPyAnJyA6IHVuZGVmaW5lZH1cbiAgICAgIGRhdGEtYnV0dG9uLWJhci1tYXRlcmlhbD17bWF0ZXJpYWxWYXJpYW50IHx8IHVuZGVmaW5lZH1cbiAgICA+XG4gICAgICA8bmF2XG4gICAgICAgIGNsYXNzTmFtZT17cHJpbWFyeU5hdkNsYXNzTmFtZX1cbiAgICAgICAgYXJpYS1sYWJlbD17cHJldmlldyA/ICdQbGF5Z3JvdW5kIHJvdXRlIGJ1dHRvbnMnIDogJ1ByaW1hcnkgYnV0dG9ucyd9XG4gICAgICAgIGRhdGEtYnV0dG9uLWdyb3VwPVwicHJpbWFyeS1idXR0b25zXCJcbiAgICAgICAgZGF0YS1idXR0b24tYmFyLW5hdlxuICAgICAgICBkYXRhLXJvdXRlLXRhYnNcbiAgICAgICAgZGF0YS1hY3RpdmUtcm91dGU9e2FjdGl2ZVJvdXRlVGFiPy5yb3V0ZUlkfVxuICAgICAgPlxuICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJidXR0b24tYmFyX19hY3RpdmUtcGlsbFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgIHtTSEVMTF9ST1VURV9UQUJTLm1hcCgodGFiKSA9PiAoXG4gICAgICAgICAgPFJvdXRlQnV0dG9uXG4gICAgICAgICAgICBrZXk9e3RhYi5yb3V0ZUlkfVxuICAgICAgICAgICAgdGFiPXt0YWJ9XG4gICAgICAgICAgICBpc0FjdGl2ZT17dGFiLnJvdXRlSWQgPT09IG5vcm1hbGl6ZWRBY3RpdmVSb3V0ZUlkfVxuICAgICAgICAgICAgb25Sb3V0ZU5hdmlnYXRlPXtvblJvdXRlTmF2aWdhdGV9XG4gICAgICAgICAgICBvblJvdXRlU2VsZWN0PXtvblJvdXRlU2VsZWN0fVxuICAgICAgICAgICAgcmVuZGVyRGVjb3JhdGlvbj17cmVuZGVyUm91dGVCdXR0b25EZWNvcmF0aW9ufVxuICAgICAgICAgIC8+XG4gICAgICAgICkpfVxuICAgICAgPC9uYXY+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImJ1dHRvbi1iYXJfX2RpdmlkZXJcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgPFNlY29uZGFyeUJ1dHRvbnNcbiAgICAgICAgcHJldmlldz17cHJldmlld31cbiAgICAgICAgcHJldmlld1RoZW1lPXtwcmV2aWV3VGhlbWV9XG4gICAgICAgIG9uUHJldmlld1RoZW1lQ2hhbmdlPXtvblByZXZpZXdUaGVtZUNoYW5nZX1cbiAgICAgICAgcmVuZGVyRGVjb3JhdGlvbj17cmVuZGVyU2Vjb25kYXJ5QnV0dG9uRGVjb3JhdGlvbn1cbiAgICAgIC8+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvY29tcG9uZW50cy9hcHAvU2hlbGxCdXR0b25CYXIuanN4In0=