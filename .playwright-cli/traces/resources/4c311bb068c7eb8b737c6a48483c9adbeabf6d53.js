import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/portfolio/PortfolioGateRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useLayoutEffect = __vite__cjsImport1_react["useLayoutEffect"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"];
import homeContent from "/@id/__x00__virtual:abs-content/home";
import {
  getGateCodeLength,
  getGateInviteCode,
  hasGateAccess,
  markGateAccess
} from "/src/lib/access-gates.js?t=1784282071061";
import { triggerHaptic } from "/src/lib/haptics.js";
import {
  dismissGateBackdrop,
  ensureGateModalOverlay,
  getGateModalCloseDurationMs,
  prepareGateModalOpen
} from "/src/legacy/modules/ui/gate-modal-shared.js";
const GATE_ID = "portfolio";
const ACCEPT_CONFIRMATION_MS = 180;
function getFocusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(
    'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
  )).filter((element) => !element.hasAttribute("hidden"));
}
function clampGateCloseDuration(durationMs) {
  return Math.max(180, Math.min(420, Number(durationMs) || 220));
}
export function PortfolioGateRoute() {
  _s();
  const gateCopy = homeContent.gates?.portfolio || {};
  const title = gateCopy.title || "View Portfolio";
  const description = gateCopy.description || "Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated.";
  const codeLength = getGateCodeLength(GATE_ID) || 6;
  const [phase, setPhase] = useState("hidden");
  const [digits, setDigits] = useState(() => Array.from({ length: codeLength }, () => ""));
  const [statusMessage, setStatusMessage] = useState("");
  const modalRef = useRef(null);
  const inputRefs = useRef([]);
  const phaseRef = useRef(phase);
  const timerRef = useRef(0);
  const requestRef = useRef(null);
  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  }, []);
  const focusInput = useCallback((index = 0) => {
    const input = inputRefs.current[index];
    if (!input) return;
    input.focus({ preventScroll: true });
    input.select();
  }, []);
  const finishClose = useCallback((outcome) => {
    clearTimer();
    const request = requestRef.current;
    requestRef.current = null;
    document.documentElement.classList.remove(
      "portfolio-access-gate-open",
      "portfolio-access-gate-closing"
    );
    delete document.documentElement.dataset.absPortfolioAccessGatePhase;
    phaseRef.current = "hidden";
    setPhase("hidden");
    setDigits(Array.from({ length: codeLength }, () => ""));
    setStatusMessage("");
    window.dispatchEvent(new CustomEvent(
      outcome === "granted" ? "abs:portfolio:access-granted" : "abs:portfolio:access-dismissed",
      {
        detail: {
          gateId: GATE_ID,
          projectId: request?.projectId || ""
        }
      }
    ));
  }, [clearTimer, codeLength]);
  const beginClose = useCallback((outcome) => {
    if (phaseRef.current === "hidden" || phaseRef.current === "closing") return;
    clearTimer();
    phaseRef.current = "closing";
    setPhase("closing");
    dismissGateBackdrop({ suppressReturnAnimation: true });
    const closeDurationMs = clampGateCloseDuration(
      getGateModalCloseDurationMs({ keepBackdrop: true })
    );
    timerRef.current = window.setTimeout(() => finishClose(outcome), closeDurationMs);
  }, [clearTimer, finishClose]);
  const rejectCode = useCallback(() => {
    triggerHaptic("error");
    setStatusMessage("That code did not match. Try again.");
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setDigits(Array.from({ length: codeLength }, () => ""));
      focusInput(0);
    }, 150);
  }, [clearTimer, codeLength, focusInput]);
  const validateCode = useCallback((nextDigits) => {
    if (phaseRef.current !== "open") return;
    const enteredCode = nextDigits.join("");
    if (enteredCode.length !== codeLength) return;
    if (enteredCode !== getGateInviteCode(GATE_ID)) {
      rejectCode();
      return;
    }
    markGateAccess(GATE_ID);
    if (!hasGateAccess(GATE_ID)) {
      setStatusMessage("Access could not be saved in this browser. Please try again.");
      triggerHaptic("error");
      return;
    }
    phaseRef.current = "accepted";
    setPhase("accepted");
    setStatusMessage("Access accepted. Opening your project.");
    triggerHaptic("success");
    clearTimer();
    timerRef.current = window.setTimeout(() => beginClose("granted"), ACCEPT_CONFIRMATION_MS);
  }, [beginClose, clearTimer, codeLength, rejectCode]);
  useEffect(() => {
    hasGateAccess(GATE_ID);
    const handleAccessRequest = (event) => {
      if ((event?.detail?.gateId || "") !== GATE_ID) return;
      if (phaseRef.current !== "hidden") return;
      requestRef.current = {
        projectId: event?.detail?.projectId || ""
      };
      setDigits(Array.from({ length: codeLength }, () => ""));
      setStatusMessage("");
      phaseRef.current = "opening";
      setPhase("opening");
    };
    window.addEventListener("abs:portfolio:request-access", handleAccessRequest);
    return () => window.removeEventListener("abs:portfolio:request-access", handleAccessRequest);
  }, [codeLength]);
  useLayoutEffect(() => {
    const root = document.documentElement;
    phaseRef.current = phase;
    root.dataset.absPortfolioAccessGatePhase = phase;
    root.classList.toggle(
      "portfolio-access-gate-open",
      phase === "opening" || phase === "open" || phase === "accepted"
    );
    root.classList.toggle("portfolio-access-gate-closing", phase === "closing");
  }, [phase]);
  useEffect(() => {
    if (phase !== "opening") return void 0;
    let cancelled = false;
    ensureGateModalOverlay();
    prepareGateModalOpen(modalRef.current, {
      mount: false,
      onReady: () => {
        if (cancelled) return;
        phaseRef.current = "open";
        setPhase("open");
        window.requestAnimationFrame(() => focusInput(0));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [focusInput, phase]);
  useEffect(() => {
    if (phase !== "open") return void 0;
    const handleDismiss = () => beginClose("dismissed");
    document.addEventListener("modal-overlay-dismiss", handleDismiss);
    return () => document.removeEventListener("modal-overlay-dismiss", handleDismiss);
  }, [beginClose, phase]);
  useEffect(() => () => {
    clearTimer();
    document.documentElement.classList.remove(
      "portfolio-access-gate-open",
      "portfolio-access-gate-closing"
    );
    delete document.documentElement.dataset.absPortfolioAccessGatePhase;
    dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
  }, [clearTimer]);
  const handleDigitChange = (index, rawValue) => {
    if (phaseRef.current !== "open") return;
    const value = String(rawValue || "").replace(/\D/g, "").slice(-1);
    const nextDigits = [...digits];
    nextDigits[index] = value;
    setDigits(nextDigits);
    setStatusMessage("");
    if (value && index < codeLength - 1) {
      triggerHaptic("tap");
      focusInput(index + 1);
    }
    validateCode(nextDigits);
  };
  const handlePaste = (event, startIndex) => {
    if (phaseRef.current !== "open") return;
    const pastedDigits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, codeLength);
    if (!pastedDigits) return;
    event.preventDefault();
    const nextDigits = [...digits];
    pastedDigits.split("").forEach((digit, offset) => {
      if (startIndex + offset < codeLength) nextDigits[startIndex + offset] = digit;
    });
    setDigits(nextDigits);
    setStatusMessage("");
    focusInput(Math.min(startIndex + pastedDigits.length, codeLength - 1));
    validateCode(nextDigits);
  };
  const handleKeyDown = (event) => {
    if (event.key === "Escape" && phaseRef.current === "open") {
      event.preventDefault();
      beginClose("dismissed");
      return;
    }
    if (event.key === "Backspace") {
      const index = Number(event.target?.dataset?.index || 0);
      if (!digits[index] && index > 0) focusInput(index - 1);
    }
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(modalRef.current);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  if (phase === "hidden") return null;
  const accepted = phase === "accepted";
  const active = phase === "open" || accepted;
  const className = [
    "portfolio-access-gate route-centered-page",
    active ? "is-open" : "",
    accepted ? "is-accepted" : "",
    phase === "closing" ? "is-closing" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      ref: modalRef,
      className,
      "data-portfolio-access-gate": true,
      "data-phase": phase,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "portfolio-access-gate-title",
      "aria-describedby": "portfolio-access-gate-description",
      "aria-busy": accepted ? "true" : "false",
      onKeyDown: handleKeyDown,
      children: [
        /* @__PURE__ */ jsxDEV(
          "button",
          {
            type: "button",
            className: "portfolio-access-gate__close abs-icon-btn",
            "aria-label": "Close portfolio access prompt",
            disabled: accepted || phase === "closing",
            onClick: () => beginClose("dismissed"),
            children: /* @__PURE__ */ jsxDEV("svg", { viewBox: "0 0 24 24", width: "24", height: "24", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxDEV(
              "path",
              {
                fill: "currentColor",
                d: "M6.22 4.93 12 10.71l5.78-5.78 1.29 1.29L13.29 12l5.78 5.78-1.29 1.29L12 13.29l-5.78 5.78-1.29-1.29L10.71 12 4.93 6.22z"
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
                lineNumber: 285,
                columnNumber: 11
              },
              this
            ) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
              lineNumber: 284,
              columnNumber: 9
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 277,
            columnNumber: 7
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("section", { className: "route-centered-page__inner portfolio-access-gate__inner", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "route-kicker", children: "Private project" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 293,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("h1", { id: "portfolio-access-gate-title", className: "route-centered-page__title", children: title }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 294,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("p", { id: "portfolio-access-gate-description", className: "route-centered-page__description", children: description }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 295,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV(
            "div",
            {
              className: `portfolio-gate-inputs portfolio-access-gate__inputs${statusMessage && !accepted ? " is-error" : ""}${accepted ? " pulse-energy" : ""}`,
              role: "group",
              "aria-label": "Portfolio invite code",
              children: digits.map(
                (digit, index) => /* @__PURE__ */ jsxDEV(
                  "input",
                  {
                    ref: (element) => {
                      inputRefs.current[index] = element;
                    },
                    type: "text",
                    maxLength: "1",
                    className: "portfolio-digit",
                    inputMode: "numeric",
                    pattern: "[0-9]",
                    "data-index": index,
                    "aria-label": `Portfolio invite code digit ${index + 1} of ${codeLength}`,
                    autoComplete: "off",
                    value: digit,
                    disabled: accepted || phase === "closing",
                    onChange: (event) => handleDigitChange(index, event.currentTarget.value),
                    onPaste: (event) => handlePaste(event, index)
                  },
                  `portfolio-access-digit-${index}`,
                  false,
                  {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
                    lineNumber: 302,
                    columnNumber: 11
                  },
                  this
                )
              )
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
              lineNumber: 296,
              columnNumber: 9
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("p", { className: "portfolio-access-gate__status", role: "status", "aria-live": "polite", children: statusMessage }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 322,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
          lineNumber: 292,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
      lineNumber: 265,
      columnNumber: 5
    },
    this
  );
}
_s(PortfolioGateRoute, "2taxZ6uhsietH/lSWBHZEfVaPBQ=");
_c = PortfolioGateRoute;
var _c;
$RefreshReg$(_c, "PortfolioGateRoute");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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dXNlU3RhdGUiLCJob21lQ29udGVudCIsImdldEdhdGVDb2RlTGVuZ3RoIiwiZ2V0R2F0ZUludml0ZUNvZGUiLCJoYXNHYXRlQWNjZXNzIiwibWFya0dhdGVBY2Nlc3MiLCJ0cmlnZ2VySGFwdGljIiwiZGlzbWlzc0dhdGVCYWNrZHJvcCIsImVuc3VyZUdhdGVNb2RhbE92ZXJsYXkiLCJnZXRHYXRlTW9kYWxDbG9zZUR1cmF0aW9uTXMiLCJwcmVwYXJlR2F0ZU1vZGFsT3BlbiIsIkdBVEVfSUQiLCJBQ0NFUFRfQ09ORklSTUFUSU9OX01TIiwiZ2V0Rm9jdXNhYmxlRWxlbWVudHMiLCJjb250YWluZXIiLCJBcnJheSIsImZyb20iLCJxdWVyeVNlbGVjdG9yQWxsIiwiZmlsdGVyIiwiZWxlbWVudCIsImhhc0F0dHJpYnV0ZSIsImNsYW1wR2F0ZUNsb3NlRHVyYXRpb24iLCJkdXJhdGlvbk1zIiwiTWF0aCIsIm1heCIsIm1pbiIsIk51bWJlciIsIlBvcnRmb2xpb0dhdGVSb3V0ZSIsIl9zIiwiZ2F0ZUNvcHkiLCJnYXRlcyIsInBvcnRmb2xpbyIsInRpdGxlIiwiZGVzY3JpcHRpb24iLCJjb2RlTGVuZ3RoIiwicGhhc2UiLCJzZXRQaGFzZSIsImRpZ2l0cyIsInNldERpZ2l0cyIsImxlbmd0aCIsInN0YXR1c01lc3NhZ2UiLCJzZXRTdGF0dXNNZXNzYWdlIiwibW9kYWxSZWYiLCJpbnB1dFJlZnMiLCJwaGFzZVJlZiIsInRpbWVyUmVmIiwicmVxdWVzdFJlZiIsImNsZWFyVGltZXIiLCJjdXJyZW50Iiwid2luZG93IiwiY2xlYXJUaW1lb3V0IiwiZm9jdXNJbnB1dCIsImluZGV4IiwiaW5wdXQiLCJmb2N1cyIsInByZXZlbnRTY3JvbGwiLCJzZWxlY3QiLCJmaW5pc2hDbG9zZSIsIm91dGNvbWUiLCJyZXF1ZXN0IiwiZG9jdW1lbnQiLCJkb2N1bWVudEVsZW1lbnQiLCJjbGFzc0xpc3QiLCJyZW1vdmUiLCJkYXRhc2V0IiwiYWJzUG9ydGZvbGlvQWNjZXNzR2F0ZVBoYXNlIiwiZGlzcGF0Y2hFdmVudCIsIkN1c3RvbUV2ZW50IiwiZGV0YWlsIiwiZ2F0ZUlkIiwicHJvamVjdElkIiwiYmVnaW5DbG9zZSIsInN1cHByZXNzUmV0dXJuQW5pbWF0aW9uIiwiY2xvc2VEdXJhdGlvbk1zIiwia2VlcEJhY2tkcm9wIiwic2V0VGltZW91dCIsInJlamVjdENvZGUiLCJ2YWxpZGF0ZUNvZGUiLCJuZXh0RGlnaXRzIiwiZW50ZXJlZENvZGUiLCJqb2luIiwiaGFuZGxlQWNjZXNzUmVxdWVzdCIsImV2ZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJyb290IiwidG9nZ2xlIiwidW5kZWZpbmVkIiwiY2FuY2VsbGVkIiwibW91bnQiLCJvblJlYWR5IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiaGFuZGxlRGlzbWlzcyIsImluc3RhbnQiLCJoYW5kbGVEaWdpdENoYW5nZSIsInJhd1ZhbHVlIiwidmFsdWUiLCJTdHJpbmciLCJyZXBsYWNlIiwic2xpY2UiLCJoYW5kbGVQYXN0ZSIsInN0YXJ0SW5kZXgiLCJwYXN0ZWREaWdpdHMiLCJjbGlwYm9hcmREYXRhIiwiZ2V0RGF0YSIsInByZXZlbnREZWZhdWx0Iiwic3BsaXQiLCJmb3JFYWNoIiwiZGlnaXQiLCJvZmZzZXQiLCJoYW5kbGVLZXlEb3duIiwia2V5IiwidGFyZ2V0IiwiZm9jdXNhYmxlIiwiZmlyc3QiLCJsYXN0Iiwic2hpZnRLZXkiLCJhY3RpdmVFbGVtZW50IiwiYWNjZXB0ZWQiLCJhY3RpdmUiLCJjbGFzc05hbWUiLCJCb29sZWFuIiwibWFwIiwiY3VycmVudFRhcmdldCIsIl9jIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIlBvcnRmb2xpb0dhdGVSb3V0ZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlQ2FsbGJhY2ssIHVzZUVmZmVjdCwgdXNlTGF5b3V0RWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IGhvbWVDb250ZW50IGZyb20gJ3ZpcnR1YWw6YWJzLWNvbnRlbnQvaG9tZSc7XG5pbXBvcnQge1xuICBnZXRHYXRlQ29kZUxlbmd0aCxcbiAgZ2V0R2F0ZUludml0ZUNvZGUsXG4gIGhhc0dhdGVBY2Nlc3MsXG4gIG1hcmtHYXRlQWNjZXNzLFxufSBmcm9tICcuLi8uLi9saWIvYWNjZXNzLWdhdGVzLmpzJztcbmltcG9ydCB7IHRyaWdnZXJIYXB0aWMgfSBmcm9tICcuLi8uLi9saWIvaGFwdGljcy5qcyc7XG5pbXBvcnQge1xuICBkaXNtaXNzR2F0ZUJhY2tkcm9wLFxuICBlbnN1cmVHYXRlTW9kYWxPdmVybGF5LFxuICBnZXRHYXRlTW9kYWxDbG9zZUR1cmF0aW9uTXMsXG4gIHByZXBhcmVHYXRlTW9kYWxPcGVuLFxufSBmcm9tICcuLi8uLi9sZWdhY3kvbW9kdWxlcy91aS9nYXRlLW1vZGFsLXNoYXJlZC5qcyc7XG5cbmNvbnN0IEdBVEVfSUQgPSAncG9ydGZvbGlvJztcbmNvbnN0IEFDQ0VQVF9DT05GSVJNQVRJT05fTVMgPSAxODA7XG5cbmZ1bmN0aW9uIGdldEZvY3VzYWJsZUVsZW1lbnRzKGNvbnRhaW5lcikge1xuICBpZiAoIWNvbnRhaW5lcikgcmV0dXJuIFtdO1xuICByZXR1cm4gQXJyYXkuZnJvbShjb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcbiAgICAnYnV0dG9uOm5vdChbZGlzYWJsZWRdKSwgaW5wdXQ6bm90KFtkaXNhYmxlZF0pLCBbaHJlZl0sIFt0YWJpbmRleF06bm90KFt0YWJpbmRleD1cIi0xXCJdKSdcbiAgKSkuZmlsdGVyKChlbGVtZW50KSA9PiAhZWxlbWVudC5oYXNBdHRyaWJ1dGUoJ2hpZGRlbicpKTtcbn1cblxuZnVuY3Rpb24gY2xhbXBHYXRlQ2xvc2VEdXJhdGlvbihkdXJhdGlvbk1zKSB7XG4gIHJldHVybiBNYXRoLm1heCgxODAsIE1hdGgubWluKDQyMCwgTnVtYmVyKGR1cmF0aW9uTXMpIHx8IDIyMCkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gUG9ydGZvbGlvR2F0ZVJvdXRlKCkge1xuICBjb25zdCBnYXRlQ29weSA9IGhvbWVDb250ZW50LmdhdGVzPy5wb3J0Zm9saW8gfHwge307XG4gIGNvbnN0IHRpdGxlID0gZ2F0ZUNvcHkudGl0bGUgfHwgJ1ZpZXcgUG9ydGZvbGlvJztcbiAgY29uc3QgZGVzY3JpcHRpb24gPSBnYXRlQ29weS5kZXNjcmlwdGlvblxuICAgIHx8ICdHb29kIHdvcmsgZGVzZXJ2ZXMgZ29vZCBjb250ZXh0LiBNYW55IG9mIG15IHByb2plY3RzIGFjcm9zcyBmaW5hbmNlLCBhdXRvbW90aXZlLCBhbmQgZGlnaXRhbCBpbm5vdmF0aW9uIHN0YXJ0dXBzIGFyZSBOREEtcHJvdGVjdGVkLCBzbyBhY2Nlc3MgaXMgY29kZS1nYXRlZC4nO1xuICBjb25zdCBjb2RlTGVuZ3RoID0gZ2V0R2F0ZUNvZGVMZW5ndGgoR0FURV9JRCkgfHwgNjtcbiAgY29uc3QgW3BoYXNlLCBzZXRQaGFzZV0gPSB1c2VTdGF0ZSgnaGlkZGVuJyk7XG4gIGNvbnN0IFtkaWdpdHMsIHNldERpZ2l0c10gPSB1c2VTdGF0ZSgoKSA9PiBBcnJheS5mcm9tKHsgbGVuZ3RoOiBjb2RlTGVuZ3RoIH0sICgpID0+ICcnKSk7XG4gIGNvbnN0IFtzdGF0dXNNZXNzYWdlLCBzZXRTdGF0dXNNZXNzYWdlXSA9IHVzZVN0YXRlKCcnKTtcbiAgY29uc3QgbW9kYWxSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IGlucHV0UmVmcyA9IHVzZVJlZihbXSk7XG4gIGNvbnN0IHBoYXNlUmVmID0gdXNlUmVmKHBoYXNlKTtcbiAgY29uc3QgdGltZXJSZWYgPSB1c2VSZWYoMCk7XG4gIGNvbnN0IHJlcXVlc3RSZWYgPSB1c2VSZWYobnVsbCk7XG5cbiAgY29uc3QgY2xlYXJUaW1lciA9IHVzZUNhbGxiYWNrKCgpID0+IHtcbiAgICBpZiAoIXRpbWVyUmVmLmN1cnJlbnQpIHJldHVybjtcbiAgICB3aW5kb3cuY2xlYXJUaW1lb3V0KHRpbWVyUmVmLmN1cnJlbnQpO1xuICAgIHRpbWVyUmVmLmN1cnJlbnQgPSAwO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgZm9jdXNJbnB1dCA9IHVzZUNhbGxiYWNrKChpbmRleCA9IDApID0+IHtcbiAgICBjb25zdCBpbnB1dCA9IGlucHV0UmVmcy5jdXJyZW50W2luZGV4XTtcbiAgICBpZiAoIWlucHV0KSByZXR1cm47XG4gICAgaW5wdXQuZm9jdXMoeyBwcmV2ZW50U2Nyb2xsOiB0cnVlIH0pO1xuICAgIGlucHV0LnNlbGVjdCgpO1xuICB9LCBbXSk7XG5cbiAgY29uc3QgZmluaXNoQ2xvc2UgPSB1c2VDYWxsYmFjaygob3V0Y29tZSkgPT4ge1xuICAgIGNsZWFyVGltZXIoKTtcbiAgICBjb25zdCByZXF1ZXN0ID0gcmVxdWVzdFJlZi5jdXJyZW50O1xuICAgIHJlcXVlc3RSZWYuY3VycmVudCA9IG51bGw7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXG4gICAgICAncG9ydGZvbGlvLWFjY2Vzcy1nYXRlLW9wZW4nLFxuICAgICAgJ3BvcnRmb2xpby1hY2Nlc3MtZ2F0ZS1jbG9zaW5nJ1xuICAgICk7XG4gICAgZGVsZXRlIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic1BvcnRmb2xpb0FjY2Vzc0dhdGVQaGFzZTtcbiAgICBwaGFzZVJlZi5jdXJyZW50ID0gJ2hpZGRlbic7XG4gICAgc2V0UGhhc2UoJ2hpZGRlbicpO1xuICAgIHNldERpZ2l0cyhBcnJheS5mcm9tKHsgbGVuZ3RoOiBjb2RlTGVuZ3RoIH0sICgpID0+ICcnKSk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnJyk7XG4gICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFxuICAgICAgb3V0Y29tZSA9PT0gJ2dyYW50ZWQnXG4gICAgICAgID8gJ2Ficzpwb3J0Zm9saW86YWNjZXNzLWdyYW50ZWQnXG4gICAgICAgIDogJ2Ficzpwb3J0Zm9saW86YWNjZXNzLWRpc21pc3NlZCcsXG4gICAgICB7XG4gICAgICAgIGRldGFpbDoge1xuICAgICAgICAgIGdhdGVJZDogR0FURV9JRCxcbiAgICAgICAgICBwcm9qZWN0SWQ6IHJlcXVlc3Q/LnByb2plY3RJZCB8fCAnJyxcbiAgICAgICAgfSxcbiAgICAgIH1cbiAgICApKTtcbiAgfSwgW2NsZWFyVGltZXIsIGNvZGVMZW5ndGhdKTtcblxuICBjb25zdCBiZWdpbkNsb3NlID0gdXNlQ2FsbGJhY2soKG91dGNvbWUpID0+IHtcbiAgICBpZiAocGhhc2VSZWYuY3VycmVudCA9PT0gJ2hpZGRlbicgfHwgcGhhc2VSZWYuY3VycmVudCA9PT0gJ2Nsb3NpbmcnKSByZXR1cm47XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHBoYXNlUmVmLmN1cnJlbnQgPSAnY2xvc2luZyc7XG4gICAgc2V0UGhhc2UoJ2Nsb3NpbmcnKTtcbiAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUgfSk7XG4gICAgY29uc3QgY2xvc2VEdXJhdGlvbk1zID0gY2xhbXBHYXRlQ2xvc2VEdXJhdGlvbihcbiAgICAgIGdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25Ncyh7IGtlZXBCYWNrZHJvcDogdHJ1ZSB9KVxuICAgICk7XG4gICAgdGltZXJSZWYuY3VycmVudCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IGZpbmlzaENsb3NlKG91dGNvbWUpLCBjbG9zZUR1cmF0aW9uTXMpO1xuICB9LCBbY2xlYXJUaW1lciwgZmluaXNoQ2xvc2VdKTtcblxuICBjb25zdCByZWplY3RDb2RlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHRyaWdnZXJIYXB0aWMoJ2Vycm9yJyk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnVGhhdCBjb2RlIGRpZCBub3QgbWF0Y2guIFRyeSBhZ2Fpbi4nKTtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgdGltZXJSZWYuY3VycmVudCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHNldERpZ2l0cyhBcnJheS5mcm9tKHsgbGVuZ3RoOiBjb2RlTGVuZ3RoIH0sICgpID0+ICcnKSk7XG4gICAgICBmb2N1c0lucHV0KDApO1xuICAgIH0sIDE1MCk7XG4gIH0sIFtjbGVhclRpbWVyLCBjb2RlTGVuZ3RoLCBmb2N1c0lucHV0XSk7XG5cbiAgY29uc3QgdmFsaWRhdGVDb2RlID0gdXNlQ2FsbGJhY2soKG5leHREaWdpdHMpID0+IHtcbiAgICBpZiAocGhhc2VSZWYuY3VycmVudCAhPT0gJ29wZW4nKSByZXR1cm47XG4gICAgY29uc3QgZW50ZXJlZENvZGUgPSBuZXh0RGlnaXRzLmpvaW4oJycpO1xuICAgIGlmIChlbnRlcmVkQ29kZS5sZW5ndGggIT09IGNvZGVMZW5ndGgpIHJldHVybjtcbiAgICBpZiAoZW50ZXJlZENvZGUgIT09IGdldEdhdGVJbnZpdGVDb2RlKEdBVEVfSUQpKSB7XG4gICAgICByZWplY3RDb2RlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFya0dhdGVBY2Nlc3MoR0FURV9JRCk7XG4gICAgaWYgKCFoYXNHYXRlQWNjZXNzKEdBVEVfSUQpKSB7XG4gICAgICBzZXRTdGF0dXNNZXNzYWdlKCdBY2Nlc3MgY291bGQgbm90IGJlIHNhdmVkIGluIHRoaXMgYnJvd3Nlci4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcbiAgICAgIHRyaWdnZXJIYXB0aWMoJ2Vycm9yJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcGhhc2VSZWYuY3VycmVudCA9ICdhY2NlcHRlZCc7XG4gICAgc2V0UGhhc2UoJ2FjY2VwdGVkJyk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnQWNjZXNzIGFjY2VwdGVkLiBPcGVuaW5nIHlvdXIgcHJvamVjdC4nKTtcbiAgICB0cmlnZ2VySGFwdGljKCdzdWNjZXNzJyk7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHRpbWVyUmVmLmN1cnJlbnQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBiZWdpbkNsb3NlKCdncmFudGVkJyksIEFDQ0VQVF9DT05GSVJNQVRJT05fTVMpO1xuICB9LCBbYmVnaW5DbG9zZSwgY2xlYXJUaW1lciwgY29kZUxlbmd0aCwgcmVqZWN0Q29kZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gQ29uc3VtZSBzdXBwb3J0ZWQgaW52aXRlLWNvZGUgVVJMIHBhcmFtZXRlcnMgZXZlbiB0aG91Z2ggUG9ydGZvbGlvIGl0c2VsZlxuICAgIC8vIGlzIG5vdyBhIHB1YmxpYyByb3V0ZS5cbiAgICBoYXNHYXRlQWNjZXNzKEdBVEVfSUQpO1xuXG4gICAgY29uc3QgaGFuZGxlQWNjZXNzUmVxdWVzdCA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKChldmVudD8uZGV0YWlsPy5nYXRlSWQgfHwgJycpICE9PSBHQVRFX0lEKSByZXR1cm47XG4gICAgICBpZiAocGhhc2VSZWYuY3VycmVudCAhPT0gJ2hpZGRlbicpIHJldHVybjtcbiAgICAgIHJlcXVlc3RSZWYuY3VycmVudCA9IHtcbiAgICAgICAgcHJvamVjdElkOiBldmVudD8uZGV0YWlsPy5wcm9qZWN0SWQgfHwgJycsXG4gICAgICB9O1xuICAgICAgc2V0RGlnaXRzKEFycmF5LmZyb20oeyBsZW5ndGg6IGNvZGVMZW5ndGggfSwgKCkgPT4gJycpKTtcbiAgICAgIHNldFN0YXR1c01lc3NhZ2UoJycpO1xuICAgICAgcGhhc2VSZWYuY3VycmVudCA9ICdvcGVuaW5nJztcbiAgICAgIHNldFBoYXNlKCdvcGVuaW5nJyk7XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdhYnM6cG9ydGZvbGlvOnJlcXVlc3QtYWNjZXNzJywgaGFuZGxlQWNjZXNzUmVxdWVzdCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdhYnM6cG9ydGZvbGlvOnJlcXVlc3QtYWNjZXNzJywgaGFuZGxlQWNjZXNzUmVxdWVzdCk7XG4gIH0sIFtjb2RlTGVuZ3RoXSk7XG5cbiAgdXNlTGF5b3V0RWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIHBoYXNlUmVmLmN1cnJlbnQgPSBwaGFzZTtcbiAgICByb290LmRhdGFzZXQuYWJzUG9ydGZvbGlvQWNjZXNzR2F0ZVBoYXNlID0gcGhhc2U7XG4gICAgcm9vdC5jbGFzc0xpc3QudG9nZ2xlKFxuICAgICAgJ3BvcnRmb2xpby1hY2Nlc3MtZ2F0ZS1vcGVuJyxcbiAgICAgIHBoYXNlID09PSAnb3BlbmluZycgfHwgcGhhc2UgPT09ICdvcGVuJyB8fCBwaGFzZSA9PT0gJ2FjY2VwdGVkJ1xuICAgICk7XG4gICAgcm9vdC5jbGFzc0xpc3QudG9nZ2xlKCdwb3J0Zm9saW8tYWNjZXNzLWdhdGUtY2xvc2luZycsIHBoYXNlID09PSAnY2xvc2luZycpO1xuICB9LCBbcGhhc2VdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChwaGFzZSAhPT0gJ29wZW5pbmcnKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcbiAgICBlbnN1cmVHYXRlTW9kYWxPdmVybGF5KCk7XG4gICAgcHJlcGFyZUdhdGVNb2RhbE9wZW4obW9kYWxSZWYuY3VycmVudCwge1xuICAgICAgbW91bnQ6IGZhbHNlLFxuICAgICAgb25SZWFkeTogKCkgPT4ge1xuICAgICAgICBpZiAoY2FuY2VsbGVkKSByZXR1cm47XG4gICAgICAgIHBoYXNlUmVmLmN1cnJlbnQgPSAnb3Blbic7XG4gICAgICAgIHNldFBoYXNlKCdvcGVuJyk7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gZm9jdXNJbnB1dCgwKSk7XG4gICAgICB9LFxuICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjYW5jZWxsZWQgPSB0cnVlO1xuICAgIH07XG4gIH0sIFtmb2N1c0lucHV0LCBwaGFzZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHBoYXNlICE9PSAnb3BlbicpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3QgaGFuZGxlRGlzbWlzcyA9ICgpID0+IGJlZ2luQ2xvc2UoJ2Rpc21pc3NlZCcpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vZGFsLW92ZXJsYXktZGlzbWlzcycsIGhhbmRsZURpc21pc3MpO1xuICAgIHJldHVybiAoKSA9PiBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb2RhbC1vdmVybGF5LWRpc21pc3MnLCBoYW5kbGVEaXNtaXNzKTtcbiAgfSwgW2JlZ2luQ2xvc2UsIHBoYXNlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+ICgpID0+IHtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXG4gICAgICAncG9ydGZvbGlvLWFjY2Vzcy1nYXRlLW9wZW4nLFxuICAgICAgJ3BvcnRmb2xpby1hY2Nlc3MtZ2F0ZS1jbG9zaW5nJ1xuICAgICk7XG4gICAgZGVsZXRlIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic1BvcnRmb2xpb0FjY2Vzc0dhdGVQaGFzZTtcbiAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUsIGluc3RhbnQ6IHRydWUgfSk7XG4gIH0sIFtjbGVhclRpbWVyXSk7XG5cbiAgY29uc3QgaGFuZGxlRGlnaXRDaGFuZ2UgPSAoaW5kZXgsIHJhd1ZhbHVlKSA9PiB7XG4gICAgaWYgKHBoYXNlUmVmLmN1cnJlbnQgIT09ICdvcGVuJykgcmV0dXJuO1xuICAgIGNvbnN0IHZhbHVlID0gU3RyaW5nKHJhd1ZhbHVlIHx8ICcnKS5yZXBsYWNlKC9cXEQvZywgJycpLnNsaWNlKC0xKTtcbiAgICBjb25zdCBuZXh0RGlnaXRzID0gWy4uLmRpZ2l0c107XG4gICAgbmV4dERpZ2l0c1tpbmRleF0gPSB2YWx1ZTtcbiAgICBzZXREaWdpdHMobmV4dERpZ2l0cyk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnJyk7XG4gICAgaWYgKHZhbHVlICYmIGluZGV4IDwgY29kZUxlbmd0aCAtIDEpIHtcbiAgICAgIHRyaWdnZXJIYXB0aWMoJ3RhcCcpO1xuICAgICAgZm9jdXNJbnB1dChpbmRleCArIDEpO1xuICAgIH1cbiAgICB2YWxpZGF0ZUNvZGUobmV4dERpZ2l0cyk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUGFzdGUgPSAoZXZlbnQsIHN0YXJ0SW5kZXgpID0+IHtcbiAgICBpZiAocGhhc2VSZWYuY3VycmVudCAhPT0gJ29wZW4nKSByZXR1cm47XG4gICAgY29uc3QgcGFzdGVkRGlnaXRzID0gZXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0JykucmVwbGFjZSgvXFxEL2csICcnKS5zbGljZSgwLCBjb2RlTGVuZ3RoKTtcbiAgICBpZiAoIXBhc3RlZERpZ2l0cykgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgbmV4dERpZ2l0cyA9IFsuLi5kaWdpdHNdO1xuICAgIHBhc3RlZERpZ2l0cy5zcGxpdCgnJykuZm9yRWFjaCgoZGlnaXQsIG9mZnNldCkgPT4ge1xuICAgICAgaWYgKHN0YXJ0SW5kZXggKyBvZmZzZXQgPCBjb2RlTGVuZ3RoKSBuZXh0RGlnaXRzW3N0YXJ0SW5kZXggKyBvZmZzZXRdID0gZGlnaXQ7XG4gICAgfSk7XG4gICAgc2V0RGlnaXRzKG5leHREaWdpdHMpO1xuICAgIHNldFN0YXR1c01lc3NhZ2UoJycpO1xuICAgIGZvY3VzSW5wdXQoTWF0aC5taW4oc3RhcnRJbmRleCArIHBhc3RlZERpZ2l0cy5sZW5ndGgsIGNvZGVMZW5ndGggLSAxKSk7XG4gICAgdmFsaWRhdGVDb2RlKG5leHREaWdpdHMpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUtleURvd24gPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJyAmJiBwaGFzZVJlZi5jdXJyZW50ID09PSAnb3BlbicpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBiZWdpbkNsb3NlKCdkaXNtaXNzZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5ID09PSAnQmFja3NwYWNlJykge1xuICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoZXZlbnQudGFyZ2V0Py5kYXRhc2V0Py5pbmRleCB8fCAwKTtcbiAgICAgIGlmICghZGlnaXRzW2luZGV4XSAmJiBpbmRleCA+IDApIGZvY3VzSW5wdXQoaW5kZXggLSAxKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5ICE9PSAnVGFiJykgcmV0dXJuO1xuICAgIGNvbnN0IGZvY3VzYWJsZSA9IGdldEZvY3VzYWJsZUVsZW1lbnRzKG1vZGFsUmVmLmN1cnJlbnQpO1xuICAgIGlmICghZm9jdXNhYmxlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGNvbnN0IGZpcnN0ID0gZm9jdXNhYmxlWzBdO1xuICAgIGNvbnN0IGxhc3QgPSBmb2N1c2FibGVbZm9jdXNhYmxlLmxlbmd0aCAtIDFdO1xuICAgIGlmIChldmVudC5zaGlmdEtleSAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSBmaXJzdCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGxhc3QuZm9jdXMoKTtcbiAgICB9IGVsc2UgaWYgKCFldmVudC5zaGlmdEtleSAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSBsYXN0KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZmlyc3QuZm9jdXMoKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHBoYXNlID09PSAnaGlkZGVuJykgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgYWNjZXB0ZWQgPSBwaGFzZSA9PT0gJ2FjY2VwdGVkJztcbiAgY29uc3QgYWN0aXZlID0gcGhhc2UgPT09ICdvcGVuJyB8fCBhY2NlcHRlZDtcbiAgY29uc3QgY2xhc3NOYW1lID0gW1xuICAgICdwb3J0Zm9saW8tYWNjZXNzLWdhdGUgcm91dGUtY2VudGVyZWQtcGFnZScsXG4gICAgYWN0aXZlID8gJ2lzLW9wZW4nIDogJycsXG4gICAgYWNjZXB0ZWQgPyAnaXMtYWNjZXB0ZWQnIDogJycsXG4gICAgcGhhc2UgPT09ICdjbG9zaW5nJyA/ICdpcy1jbG9zaW5nJyA6ICcnLFxuICBdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICByZWY9e21vZGFsUmVmfVxuICAgICAgY2xhc3NOYW1lPXtjbGFzc05hbWV9XG4gICAgICBkYXRhLXBvcnRmb2xpby1hY2Nlc3MtZ2F0ZVxuICAgICAgZGF0YS1waGFzZT17cGhhc2V9XG4gICAgICByb2xlPVwiZGlhbG9nXCJcbiAgICAgIGFyaWEtbW9kYWw9XCJ0cnVlXCJcbiAgICAgIGFyaWEtbGFiZWxsZWRieT1cInBvcnRmb2xpby1hY2Nlc3MtZ2F0ZS10aXRsZVwiXG4gICAgICBhcmlhLWRlc2NyaWJlZGJ5PVwicG9ydGZvbGlvLWFjY2Vzcy1nYXRlLWRlc2NyaXB0aW9uXCJcbiAgICAgIGFyaWEtYnVzeT17YWNjZXB0ZWQgPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgb25LZXlEb3duPXtoYW5kbGVLZXlEb3dufVxuICAgID5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT1cInBvcnRmb2xpby1hY2Nlc3MtZ2F0ZV9fY2xvc2UgYWJzLWljb24tYnRuXCJcbiAgICAgICAgYXJpYS1sYWJlbD1cIkNsb3NlIHBvcnRmb2xpbyBhY2Nlc3MgcHJvbXB0XCJcbiAgICAgICAgZGlzYWJsZWQ9e2FjY2VwdGVkIHx8IHBoYXNlID09PSAnY2xvc2luZyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IGJlZ2luQ2xvc2UoJ2Rpc21pc3NlZCcpfVxuICAgICAgPlxuICAgICAgICA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiB3aWR0aD1cIjI0XCIgaGVpZ2h0PVwiMjRcIiBhcmlhLWhpZGRlbj1cInRydWVcIiBmb2N1c2FibGU9XCJmYWxzZVwiPlxuICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICBmaWxsPVwiY3VycmVudENvbG9yXCJcbiAgICAgICAgICAgIGQ9XCJNNi4yMiA0LjkzIDEyIDEwLjcxbDUuNzgtNS43OCAxLjI5IDEuMjlMMTMuMjkgMTJsNS43OCA1Ljc4LTEuMjkgMS4yOUwxMiAxMy4yOWwtNS43OCA1Ljc4LTEuMjktMS4yOUwxMC43MSAxMiA0LjkzIDYuMjJ6XCJcbiAgICAgICAgICAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgIDwvYnV0dG9uPlxuXG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJyb3V0ZS1jZW50ZXJlZC1wYWdlX19pbm5lciBwb3J0Zm9saW8tYWNjZXNzLWdhdGVfX2lubmVyXCI+XG4gICAgICAgIDxwIGNsYXNzTmFtZT1cInJvdXRlLWtpY2tlclwiPlByaXZhdGUgcHJvamVjdDwvcD5cbiAgICAgICAgPGgxIGlkPVwicG9ydGZvbGlvLWFjY2Vzcy1nYXRlLXRpdGxlXCIgY2xhc3NOYW1lPVwicm91dGUtY2VudGVyZWQtcGFnZV9fdGl0bGVcIj57dGl0bGV9PC9oMT5cbiAgICAgICAgPHAgaWQ9XCJwb3J0Zm9saW8tYWNjZXNzLWdhdGUtZGVzY3JpcHRpb25cIiBjbGFzc05hbWU9XCJyb3V0ZS1jZW50ZXJlZC1wYWdlX19kZXNjcmlwdGlvblwiPntkZXNjcmlwdGlvbn08L3A+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9e2Bwb3J0Zm9saW8tZ2F0ZS1pbnB1dHMgcG9ydGZvbGlvLWFjY2Vzcy1nYXRlX19pbnB1dHMke3N0YXR1c01lc3NhZ2UgJiYgIWFjY2VwdGVkID8gJyBpcy1lcnJvcicgOiAnJ30ke2FjY2VwdGVkID8gJyBwdWxzZS1lbmVyZ3knIDogJyd9YH1cbiAgICAgICAgICByb2xlPVwiZ3JvdXBcIlxuICAgICAgICAgIGFyaWEtbGFiZWw9XCJQb3J0Zm9saW8gaW52aXRlIGNvZGVcIlxuICAgICAgICA+XG4gICAgICAgICAge2RpZ2l0cy5tYXAoKGRpZ2l0LCBpbmRleCkgPT4gKFxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIGtleT17YHBvcnRmb2xpby1hY2Nlc3MtZGlnaXQtJHtpbmRleH1gfVxuICAgICAgICAgICAgICByZWY9eyhlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgaW5wdXRSZWZzLmN1cnJlbnRbaW5kZXhdID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICBtYXhMZW5ndGg9XCIxXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicG9ydGZvbGlvLWRpZ2l0XCJcbiAgICAgICAgICAgICAgaW5wdXRNb2RlPVwibnVtZXJpY1wiXG4gICAgICAgICAgICAgIHBhdHRlcm49XCJbMC05XVwiXG4gICAgICAgICAgICAgIGRhdGEtaW5kZXg9e2luZGV4fVxuICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgUG9ydGZvbGlvIGludml0ZSBjb2RlIGRpZ2l0ICR7aW5kZXggKyAxfSBvZiAke2NvZGVMZW5ndGh9YH1cbiAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlPVwib2ZmXCJcbiAgICAgICAgICAgICAgdmFsdWU9e2RpZ2l0fVxuICAgICAgICAgICAgICBkaXNhYmxlZD17YWNjZXB0ZWQgfHwgcGhhc2UgPT09ICdjbG9zaW5nJ31cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gaGFuZGxlRGlnaXRDaGFuZ2UoaW5kZXgsIGV2ZW50LmN1cnJlbnRUYXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICBvblBhc3RlPXsoZXZlbnQpID0+IGhhbmRsZVBhc3RlKGV2ZW50LCBpbmRleCl9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHAgY2xhc3NOYW1lPVwicG9ydGZvbGlvLWFjY2Vzcy1nYXRlX19zdGF0dXNcIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+XG4gICAgICAgICAge3N0YXR1c01lc3NhZ2V9XG4gICAgICAgIDwvcD5cbiAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvcG9ydGZvbGlvL1BvcnRmb2xpb0dhdGVSb3V0ZS5qc3gifQ==