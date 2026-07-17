import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/portfolio/PortfolioGateRoute.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useLayoutEffect = __vite__cjsImport1_react["useLayoutEffect"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"];
import homeContent from "/@id/__x00__virtual:abs-content/home";
import {
  getGateCodeLength,
  getGateInviteCode,
  hasGateAccess,
  markGateAccess
} from "/src/lib/access-gates.js";
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
    dismissGateBackdrop({ suppressReturnAnimation: true, instant: true });
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
                lineNumber: 288,
                columnNumber: 11
              },
              this
            ) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
              lineNumber: 287,
              columnNumber: 9
            }, this)
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 280,
            columnNumber: 7
          },
          this
        ),
        /* @__PURE__ */ jsxDEV("section", { className: "route-centered-page__inner portfolio-access-gate__inner", children: [
          /* @__PURE__ */ jsxDEV("p", { className: "route-kicker", children: "Private project" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 296,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("h1", { id: "portfolio-access-gate-title", className: "route-centered-page__title", children: title }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 297,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("p", { id: "portfolio-access-gate-description", className: "route-centered-page__description", children: description }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 298,
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
                    lineNumber: 305,
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
              lineNumber: 299,
              columnNumber: 9
            },
            this
          ),
          /* @__PURE__ */ jsxDEV("p", { className: "portfolio-access-gate__status", role: "status", "aria-live": "polite", children: statusMessage }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
            lineNumber: 325,
            columnNumber: 9
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
          lineNumber: 295,
          columnNumber: 7
        }, this)
      ]
    },
    void 0,
    true,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx",
      lineNumber: 268,
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

//# sourceMappingURL=data:application/json;base64,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LCJ1c2VSZWYiLCJ1c2VTdGF0ZSIsImhvbWVDb250ZW50IiwiZ2V0R2F0ZUNvZGVMZW5ndGgiLCJnZXRHYXRlSW52aXRlQ29kZSIsImhhc0dhdGVBY2Nlc3MiLCJtYXJrR2F0ZUFjY2VzcyIsInRyaWdnZXJIYXB0aWMiLCJkaXNtaXNzR2F0ZUJhY2tkcm9wIiwiZW5zdXJlR2F0ZU1vZGFsT3ZlcmxheSIsImdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25NcyIsInByZXBhcmVHYXRlTW9kYWxPcGVuIiwiR0FURV9JRCIsIkFDQ0VQVF9DT05GSVJNQVRJT05fTVMiLCJnZXRGb2N1c2FibGVFbGVtZW50cyIsImNvbnRhaW5lciIsIkFycmF5IiwiZnJvbSIsInF1ZXJ5U2VsZWN0b3JBbGwiLCJmaWx0ZXIiLCJlbGVtZW50IiwiaGFzQXR0cmlidXRlIiwiY2xhbXBHYXRlQ2xvc2VEdXJhdGlvbiIsImR1cmF0aW9uTXMiLCJNYXRoIiwibWF4IiwibWluIiwiTnVtYmVyIiwiUG9ydGZvbGlvR2F0ZVJvdXRlIiwiX3MiLCJnYXRlQ29weSIsImdhdGVzIiwicG9ydGZvbGlvIiwidGl0bGUiLCJkZXNjcmlwdGlvbiIsImNvZGVMZW5ndGgiLCJwaGFzZSIsInNldFBoYXNlIiwiZGlnaXRzIiwic2V0RGlnaXRzIiwibGVuZ3RoIiwic3RhdHVzTWVzc2FnZSIsInNldFN0YXR1c01lc3NhZ2UiLCJtb2RhbFJlZiIsImlucHV0UmVmcyIsInBoYXNlUmVmIiwidGltZXJSZWYiLCJyZXF1ZXN0UmVmIiwiY2xlYXJUaW1lciIsImN1cnJlbnQiLCJ3aW5kb3ciLCJjbGVhclRpbWVvdXQiLCJmb2N1c0lucHV0IiwiaW5kZXgiLCJpbnB1dCIsImZvY3VzIiwicHJldmVudFNjcm9sbCIsInNlbGVjdCIsImZpbmlzaENsb3NlIiwib3V0Y29tZSIsInJlcXVlc3QiLCJkb2N1bWVudCIsImRvY3VtZW50RWxlbWVudCIsImNsYXNzTGlzdCIsInJlbW92ZSIsImRhdGFzZXQiLCJhYnNQb3J0Zm9saW9BY2Nlc3NHYXRlUGhhc2UiLCJkaXNwYXRjaEV2ZW50IiwiQ3VzdG9tRXZlbnQiLCJkZXRhaWwiLCJnYXRlSWQiLCJwcm9qZWN0SWQiLCJiZWdpbkNsb3NlIiwic3VwcHJlc3NSZXR1cm5BbmltYXRpb24iLCJpbnN0YW50IiwiY2xvc2VEdXJhdGlvbk1zIiwia2VlcEJhY2tkcm9wIiwic2V0VGltZW91dCIsInJlamVjdENvZGUiLCJ2YWxpZGF0ZUNvZGUiLCJuZXh0RGlnaXRzIiwiZW50ZXJlZENvZGUiLCJqb2luIiwiaGFuZGxlQWNjZXNzUmVxdWVzdCIsImV2ZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJyb290IiwidG9nZ2xlIiwidW5kZWZpbmVkIiwiY2FuY2VsbGVkIiwibW91bnQiLCJvblJlYWR5IiwicmVxdWVzdEFuaW1hdGlvbkZyYW1lIiwiaGFuZGxlRGlzbWlzcyIsImhhbmRsZURpZ2l0Q2hhbmdlIiwicmF3VmFsdWUiLCJ2YWx1ZSIsIlN0cmluZyIsInJlcGxhY2UiLCJzbGljZSIsImhhbmRsZVBhc3RlIiwic3RhcnRJbmRleCIsInBhc3RlZERpZ2l0cyIsImNsaXBib2FyZERhdGEiLCJnZXREYXRhIiwicHJldmVudERlZmF1bHQiLCJzcGxpdCIsImZvckVhY2giLCJkaWdpdCIsIm9mZnNldCIsImhhbmRsZUtleURvd24iLCJrZXkiLCJ0YXJnZXQiLCJmb2N1c2FibGUiLCJmaXJzdCIsImxhc3QiLCJzaGlmdEtleSIsImFjdGl2ZUVsZW1lbnQiLCJhY2NlcHRlZCIsImFjdGl2ZSIsImNsYXNzTmFtZSIsIkJvb2xlYW4iLCJtYXAiLCJjdXJyZW50VGFyZ2V0IiwiX2MiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiUG9ydGZvbGlvR2F0ZVJvdXRlLmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VDYWxsYmFjaywgdXNlRWZmZWN0LCB1c2VMYXlvdXRFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgaG9tZUNvbnRlbnQgZnJvbSAndmlydHVhbDphYnMtY29udGVudC9ob21lJztcbmltcG9ydCB7XG4gIGdldEdhdGVDb2RlTGVuZ3RoLFxuICBnZXRHYXRlSW52aXRlQ29kZSxcbiAgaGFzR2F0ZUFjY2VzcyxcbiAgbWFya0dhdGVBY2Nlc3MsXG59IGZyb20gJy4uLy4uL2xpYi9hY2Nlc3MtZ2F0ZXMuanMnO1xuaW1wb3J0IHsgdHJpZ2dlckhhcHRpYyB9IGZyb20gJy4uLy4uL2xpYi9oYXB0aWNzLmpzJztcbmltcG9ydCB7XG4gIGRpc21pc3NHYXRlQmFja2Ryb3AsXG4gIGVuc3VyZUdhdGVNb2RhbE92ZXJsYXksXG4gIGdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25NcyxcbiAgcHJlcGFyZUdhdGVNb2RhbE9wZW4sXG59IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3VpL2dhdGUtbW9kYWwtc2hhcmVkLmpzJztcblxuY29uc3QgR0FURV9JRCA9ICdwb3J0Zm9saW8nO1xuY29uc3QgQUNDRVBUX0NPTkZJUk1BVElPTl9NUyA9IDE4MDtcblxuZnVuY3Rpb24gZ2V0Rm9jdXNhYmxlRWxlbWVudHMoY29udGFpbmVyKSB7XG4gIGlmICghY29udGFpbmVyKSByZXR1cm4gW107XG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFxuICAgICdidXR0b246bm90KFtkaXNhYmxlZF0pLCBpbnB1dDpub3QoW2Rpc2FibGVkXSksIFtocmVmXSwgW3RhYmluZGV4XTpub3QoW3RhYmluZGV4PVwiLTFcIl0pJ1xuICApKS5maWx0ZXIoKGVsZW1lbnQpID0+ICFlbGVtZW50Lmhhc0F0dHJpYnV0ZSgnaGlkZGVuJykpO1xufVxuXG5mdW5jdGlvbiBjbGFtcEdhdGVDbG9zZUR1cmF0aW9uKGR1cmF0aW9uTXMpIHtcbiAgcmV0dXJuIE1hdGgubWF4KDE4MCwgTWF0aC5taW4oNDIwLCBOdW1iZXIoZHVyYXRpb25NcykgfHwgMjIwKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBQb3J0Zm9saW9HYXRlUm91dGUoKSB7XG4gIGNvbnN0IGdhdGVDb3B5ID0gaG9tZUNvbnRlbnQuZ2F0ZXM/LnBvcnRmb2xpbyB8fCB7fTtcbiAgY29uc3QgdGl0bGUgPSBnYXRlQ29weS50aXRsZSB8fCAnVmlldyBQb3J0Zm9saW8nO1xuICBjb25zdCBkZXNjcmlwdGlvbiA9IGdhdGVDb3B5LmRlc2NyaXB0aW9uXG4gICAgfHwgJ0dvb2Qgd29yayBkZXNlcnZlcyBnb29kIGNvbnRleHQuIE1hbnkgb2YgbXkgcHJvamVjdHMgYWNyb3NzIGZpbmFuY2UsIGF1dG9tb3RpdmUsIGFuZCBkaWdpdGFsIGlubm92YXRpb24gc3RhcnR1cHMgYXJlIE5EQS1wcm90ZWN0ZWQsIHNvIGFjY2VzcyBpcyBjb2RlLWdhdGVkLic7XG4gIGNvbnN0IGNvZGVMZW5ndGggPSBnZXRHYXRlQ29kZUxlbmd0aChHQVRFX0lEKSB8fCA2O1xuICBjb25zdCBbcGhhc2UsIHNldFBoYXNlXSA9IHVzZVN0YXRlKCdoaWRkZW4nKTtcbiAgY29uc3QgW2RpZ2l0cywgc2V0RGlnaXRzXSA9IHVzZVN0YXRlKCgpID0+IEFycmF5LmZyb20oeyBsZW5ndGg6IGNvZGVMZW5ndGggfSwgKCkgPT4gJycpKTtcbiAgY29uc3QgW3N0YXR1c01lc3NhZ2UsIHNldFN0YXR1c01lc3NhZ2VdID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBtb2RhbFJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgaW5wdXRSZWZzID0gdXNlUmVmKFtdKTtcbiAgY29uc3QgcGhhc2VSZWYgPSB1c2VSZWYocGhhc2UpO1xuICBjb25zdCB0aW1lclJlZiA9IHVzZVJlZigwKTtcbiAgY29uc3QgcmVxdWVzdFJlZiA9IHVzZVJlZihudWxsKTtcblxuICBjb25zdCBjbGVhclRpbWVyID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIGlmICghdGltZXJSZWYuY3VycmVudCkgcmV0dXJuO1xuICAgIHdpbmRvdy5jbGVhclRpbWVvdXQodGltZXJSZWYuY3VycmVudCk7XG4gICAgdGltZXJSZWYuY3VycmVudCA9IDA7XG4gIH0sIFtdKTtcblxuICBjb25zdCBmb2N1c0lucHV0ID0gdXNlQ2FsbGJhY2soKGluZGV4ID0gMCkgPT4ge1xuICAgIGNvbnN0IGlucHV0ID0gaW5wdXRSZWZzLmN1cnJlbnRbaW5kZXhdO1xuICAgIGlmICghaW5wdXQpIHJldHVybjtcbiAgICBpbnB1dC5mb2N1cyh7IHByZXZlbnRTY3JvbGw6IHRydWUgfSk7XG4gICAgaW5wdXQuc2VsZWN0KCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBmaW5pc2hDbG9zZSA9IHVzZUNhbGxiYWNrKChvdXRjb21lKSA9PiB7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIGNvbnN0IHJlcXVlc3QgPSByZXF1ZXN0UmVmLmN1cnJlbnQ7XG4gICAgcmVxdWVzdFJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LnJlbW92ZShcbiAgICAgICdwb3J0Zm9saW8tYWNjZXNzLWdhdGUtb3BlbicsXG4gICAgICAncG9ydGZvbGlvLWFjY2Vzcy1nYXRlLWNsb3NpbmcnXG4gICAgKTtcbiAgICBkZWxldGUgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuYWJzUG9ydGZvbGlvQWNjZXNzR2F0ZVBoYXNlO1xuICAgIHBoYXNlUmVmLmN1cnJlbnQgPSAnaGlkZGVuJztcbiAgICBzZXRQaGFzZSgnaGlkZGVuJyk7XG4gICAgc2V0RGlnaXRzKEFycmF5LmZyb20oeyBsZW5ndGg6IGNvZGVMZW5ndGggfSwgKCkgPT4gJycpKTtcbiAgICBzZXRTdGF0dXNNZXNzYWdlKCcnKTtcbiAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoXG4gICAgICBvdXRjb21lID09PSAnZ3JhbnRlZCdcbiAgICAgICAgPyAnYWJzOnBvcnRmb2xpbzphY2Nlc3MtZ3JhbnRlZCdcbiAgICAgICAgOiAnYWJzOnBvcnRmb2xpbzphY2Nlc3MtZGlzbWlzc2VkJyxcbiAgICAgIHtcbiAgICAgICAgZGV0YWlsOiB7XG4gICAgICAgICAgZ2F0ZUlkOiBHQVRFX0lELFxuICAgICAgICAgIHByb2plY3RJZDogcmVxdWVzdD8ucHJvamVjdElkIHx8ICcnLFxuICAgICAgICB9LFxuICAgICAgfVxuICAgICkpO1xuICB9LCBbY2xlYXJUaW1lciwgY29kZUxlbmd0aF0pO1xuXG4gIGNvbnN0IGJlZ2luQ2xvc2UgPSB1c2VDYWxsYmFjaygob3V0Y29tZSkgPT4ge1xuICAgIGlmIChwaGFzZVJlZi5jdXJyZW50ID09PSAnaGlkZGVuJyB8fCBwaGFzZVJlZi5jdXJyZW50ID09PSAnY2xvc2luZycpIHJldHVybjtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgcGhhc2VSZWYuY3VycmVudCA9ICdjbG9zaW5nJztcbiAgICBzZXRQaGFzZSgnY2xvc2luZycpO1xuICAgIC8vIFRoZSBsZWdhY3kgdmlld3BvcnQgbGF5ZXJzIGFyZSBkZWxpYmVyYXRlbHkgaGlkZGVuIHdoaWxlIHRoaXMgaW4td2luZG93XG4gICAgLy8gZ2F0ZSBwYWludHMuIENsZWFyIHRoZW0gaW5zdGFudGx5IHNvIHRoZWlyIGxvbmdlciBmYWRlIGNhbm5vdCByZWFwcGVhclxuICAgIC8vIGFmdGVyIHRoZSBsb2NhbCAyMjBtcyBjbG9zZSBmaW5pc2hlcy5cbiAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUsIGluc3RhbnQ6IHRydWUgfSk7XG4gICAgY29uc3QgY2xvc2VEdXJhdGlvbk1zID0gY2xhbXBHYXRlQ2xvc2VEdXJhdGlvbihcbiAgICAgIGdldEdhdGVNb2RhbENsb3NlRHVyYXRpb25Ncyh7IGtlZXBCYWNrZHJvcDogdHJ1ZSB9KVxuICAgICk7XG4gICAgdGltZXJSZWYuY3VycmVudCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IGZpbmlzaENsb3NlKG91dGNvbWUpLCBjbG9zZUR1cmF0aW9uTXMpO1xuICB9LCBbY2xlYXJUaW1lciwgZmluaXNoQ2xvc2VdKTtcblxuICBjb25zdCByZWplY3RDb2RlID0gdXNlQ2FsbGJhY2soKCkgPT4ge1xuICAgIHRyaWdnZXJIYXB0aWMoJ2Vycm9yJyk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnVGhhdCBjb2RlIGRpZCBub3QgbWF0Y2guIFRyeSBhZ2Fpbi4nKTtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgdGltZXJSZWYuY3VycmVudCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHNldERpZ2l0cyhBcnJheS5mcm9tKHsgbGVuZ3RoOiBjb2RlTGVuZ3RoIH0sICgpID0+ICcnKSk7XG4gICAgICBmb2N1c0lucHV0KDApO1xuICAgIH0sIDE1MCk7XG4gIH0sIFtjbGVhclRpbWVyLCBjb2RlTGVuZ3RoLCBmb2N1c0lucHV0XSk7XG5cbiAgY29uc3QgdmFsaWRhdGVDb2RlID0gdXNlQ2FsbGJhY2soKG5leHREaWdpdHMpID0+IHtcbiAgICBpZiAocGhhc2VSZWYuY3VycmVudCAhPT0gJ29wZW4nKSByZXR1cm47XG4gICAgY29uc3QgZW50ZXJlZENvZGUgPSBuZXh0RGlnaXRzLmpvaW4oJycpO1xuICAgIGlmIChlbnRlcmVkQ29kZS5sZW5ndGggIT09IGNvZGVMZW5ndGgpIHJldHVybjtcbiAgICBpZiAoZW50ZXJlZENvZGUgIT09IGdldEdhdGVJbnZpdGVDb2RlKEdBVEVfSUQpKSB7XG4gICAgICByZWplY3RDb2RlKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbWFya0dhdGVBY2Nlc3MoR0FURV9JRCk7XG4gICAgaWYgKCFoYXNHYXRlQWNjZXNzKEdBVEVfSUQpKSB7XG4gICAgICBzZXRTdGF0dXNNZXNzYWdlKCdBY2Nlc3MgY291bGQgbm90IGJlIHNhdmVkIGluIHRoaXMgYnJvd3Nlci4gUGxlYXNlIHRyeSBhZ2Fpbi4nKTtcbiAgICAgIHRyaWdnZXJIYXB0aWMoJ2Vycm9yJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcGhhc2VSZWYuY3VycmVudCA9ICdhY2NlcHRlZCc7XG4gICAgc2V0UGhhc2UoJ2FjY2VwdGVkJyk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnQWNjZXNzIGFjY2VwdGVkLiBPcGVuaW5nIHlvdXIgcHJvamVjdC4nKTtcbiAgICB0cmlnZ2VySGFwdGljKCdzdWNjZXNzJyk7XG4gICAgY2xlYXJUaW1lcigpO1xuICAgIHRpbWVyUmVmLmN1cnJlbnQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBiZWdpbkNsb3NlKCdncmFudGVkJyksIEFDQ0VQVF9DT05GSVJNQVRJT05fTVMpO1xuICB9LCBbYmVnaW5DbG9zZSwgY2xlYXJUaW1lciwgY29kZUxlbmd0aCwgcmVqZWN0Q29kZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgLy8gQ29uc3VtZSBzdXBwb3J0ZWQgaW52aXRlLWNvZGUgVVJMIHBhcmFtZXRlcnMgZXZlbiB0aG91Z2ggUG9ydGZvbGlvIGl0c2VsZlxuICAgIC8vIGlzIG5vdyBhIHB1YmxpYyByb3V0ZS5cbiAgICBoYXNHYXRlQWNjZXNzKEdBVEVfSUQpO1xuXG4gICAgY29uc3QgaGFuZGxlQWNjZXNzUmVxdWVzdCA9IChldmVudCkgPT4ge1xuICAgICAgaWYgKChldmVudD8uZGV0YWlsPy5nYXRlSWQgfHwgJycpICE9PSBHQVRFX0lEKSByZXR1cm47XG4gICAgICBpZiAocGhhc2VSZWYuY3VycmVudCAhPT0gJ2hpZGRlbicpIHJldHVybjtcbiAgICAgIHJlcXVlc3RSZWYuY3VycmVudCA9IHtcbiAgICAgICAgcHJvamVjdElkOiBldmVudD8uZGV0YWlsPy5wcm9qZWN0SWQgfHwgJycsXG4gICAgICB9O1xuICAgICAgc2V0RGlnaXRzKEFycmF5LmZyb20oeyBsZW5ndGg6IGNvZGVMZW5ndGggfSwgKCkgPT4gJycpKTtcbiAgICAgIHNldFN0YXR1c01lc3NhZ2UoJycpO1xuICAgICAgcGhhc2VSZWYuY3VycmVudCA9ICdvcGVuaW5nJztcbiAgICAgIHNldFBoYXNlKCdvcGVuaW5nJyk7XG4gICAgfTtcblxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdhYnM6cG9ydGZvbGlvOnJlcXVlc3QtYWNjZXNzJywgaGFuZGxlQWNjZXNzUmVxdWVzdCk7XG4gICAgcmV0dXJuICgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdhYnM6cG9ydGZvbGlvOnJlcXVlc3QtYWNjZXNzJywgaGFuZGxlQWNjZXNzUmVxdWVzdCk7XG4gIH0sIFtjb2RlTGVuZ3RoXSk7XG5cbiAgdXNlTGF5b3V0RWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICAgIHBoYXNlUmVmLmN1cnJlbnQgPSBwaGFzZTtcbiAgICByb290LmRhdGFzZXQuYWJzUG9ydGZvbGlvQWNjZXNzR2F0ZVBoYXNlID0gcGhhc2U7XG4gICAgcm9vdC5jbGFzc0xpc3QudG9nZ2xlKFxuICAgICAgJ3BvcnRmb2xpby1hY2Nlc3MtZ2F0ZS1vcGVuJyxcbiAgICAgIHBoYXNlID09PSAnb3BlbmluZycgfHwgcGhhc2UgPT09ICdvcGVuJyB8fCBwaGFzZSA9PT0gJ2FjY2VwdGVkJ1xuICAgICk7XG4gICAgcm9vdC5jbGFzc0xpc3QudG9nZ2xlKCdwb3J0Zm9saW8tYWNjZXNzLWdhdGUtY2xvc2luZycsIHBoYXNlID09PSAnY2xvc2luZycpO1xuICB9LCBbcGhhc2VdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmIChwaGFzZSAhPT0gJ29wZW5pbmcnKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcbiAgICBlbnN1cmVHYXRlTW9kYWxPdmVybGF5KCk7XG4gICAgcHJlcGFyZUdhdGVNb2RhbE9wZW4obW9kYWxSZWYuY3VycmVudCwge1xuICAgICAgbW91bnQ6IGZhbHNlLFxuICAgICAgb25SZWFkeTogKCkgPT4ge1xuICAgICAgICBpZiAoY2FuY2VsbGVkKSByZXR1cm47XG4gICAgICAgIHBoYXNlUmVmLmN1cnJlbnQgPSAnb3Blbic7XG4gICAgICAgIHNldFBoYXNlKCdvcGVuJyk7XG4gICAgICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4gZm9jdXNJbnB1dCgwKSk7XG4gICAgICB9LFxuICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjYW5jZWxsZWQgPSB0cnVlO1xuICAgIH07XG4gIH0sIFtmb2N1c0lucHV0LCBwaGFzZV0pO1xuXG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKHBoYXNlICE9PSAnb3BlbicpIHJldHVybiB1bmRlZmluZWQ7XG4gICAgY29uc3QgaGFuZGxlRGlzbWlzcyA9ICgpID0+IGJlZ2luQ2xvc2UoJ2Rpc21pc3NlZCcpO1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vZGFsLW92ZXJsYXktZGlzbWlzcycsIGhhbmRsZURpc21pc3MpO1xuICAgIHJldHVybiAoKSA9PiBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdtb2RhbC1vdmVybGF5LWRpc21pc3MnLCBoYW5kbGVEaXNtaXNzKTtcbiAgfSwgW2JlZ2luQ2xvc2UsIHBoYXNlXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+ICgpID0+IHtcbiAgICBjbGVhclRpbWVyKCk7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5yZW1vdmUoXG4gICAgICAncG9ydGZvbGlvLWFjY2Vzcy1nYXRlLW9wZW4nLFxuICAgICAgJ3BvcnRmb2xpby1hY2Nlc3MtZ2F0ZS1jbG9zaW5nJ1xuICAgICk7XG4gICAgZGVsZXRlIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5kYXRhc2V0LmFic1BvcnRmb2xpb0FjY2Vzc0dhdGVQaGFzZTtcbiAgICBkaXNtaXNzR2F0ZUJhY2tkcm9wKHsgc3VwcHJlc3NSZXR1cm5BbmltYXRpb246IHRydWUsIGluc3RhbnQ6IHRydWUgfSk7XG4gIH0sIFtjbGVhclRpbWVyXSk7XG5cbiAgY29uc3QgaGFuZGxlRGlnaXRDaGFuZ2UgPSAoaW5kZXgsIHJhd1ZhbHVlKSA9PiB7XG4gICAgaWYgKHBoYXNlUmVmLmN1cnJlbnQgIT09ICdvcGVuJykgcmV0dXJuO1xuICAgIGNvbnN0IHZhbHVlID0gU3RyaW5nKHJhd1ZhbHVlIHx8ICcnKS5yZXBsYWNlKC9cXEQvZywgJycpLnNsaWNlKC0xKTtcbiAgICBjb25zdCBuZXh0RGlnaXRzID0gWy4uLmRpZ2l0c107XG4gICAgbmV4dERpZ2l0c1tpbmRleF0gPSB2YWx1ZTtcbiAgICBzZXREaWdpdHMobmV4dERpZ2l0cyk7XG4gICAgc2V0U3RhdHVzTWVzc2FnZSgnJyk7XG4gICAgaWYgKHZhbHVlICYmIGluZGV4IDwgY29kZUxlbmd0aCAtIDEpIHtcbiAgICAgIHRyaWdnZXJIYXB0aWMoJ3RhcCcpO1xuICAgICAgZm9jdXNJbnB1dChpbmRleCArIDEpO1xuICAgIH1cbiAgICB2YWxpZGF0ZUNvZGUobmV4dERpZ2l0cyk7XG4gIH07XG5cbiAgY29uc3QgaGFuZGxlUGFzdGUgPSAoZXZlbnQsIHN0YXJ0SW5kZXgpID0+IHtcbiAgICBpZiAocGhhc2VSZWYuY3VycmVudCAhPT0gJ29wZW4nKSByZXR1cm47XG4gICAgY29uc3QgcGFzdGVkRGlnaXRzID0gZXZlbnQuY2xpcGJvYXJkRGF0YS5nZXREYXRhKCd0ZXh0JykucmVwbGFjZSgvXFxEL2csICcnKS5zbGljZSgwLCBjb2RlTGVuZ3RoKTtcbiAgICBpZiAoIXBhc3RlZERpZ2l0cykgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29uc3QgbmV4dERpZ2l0cyA9IFsuLi5kaWdpdHNdO1xuICAgIHBhc3RlZERpZ2l0cy5zcGxpdCgnJykuZm9yRWFjaCgoZGlnaXQsIG9mZnNldCkgPT4ge1xuICAgICAgaWYgKHN0YXJ0SW5kZXggKyBvZmZzZXQgPCBjb2RlTGVuZ3RoKSBuZXh0RGlnaXRzW3N0YXJ0SW5kZXggKyBvZmZzZXRdID0gZGlnaXQ7XG4gICAgfSk7XG4gICAgc2V0RGlnaXRzKG5leHREaWdpdHMpO1xuICAgIHNldFN0YXR1c01lc3NhZ2UoJycpO1xuICAgIGZvY3VzSW5wdXQoTWF0aC5taW4oc3RhcnRJbmRleCArIHBhc3RlZERpZ2l0cy5sZW5ndGgsIGNvZGVMZW5ndGggLSAxKSk7XG4gICAgdmFsaWRhdGVDb2RlKG5leHREaWdpdHMpO1xuICB9O1xuXG4gIGNvbnN0IGhhbmRsZUtleURvd24gPSAoZXZlbnQpID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJyAmJiBwaGFzZVJlZi5jdXJyZW50ID09PSAnb3BlbicpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBiZWdpbkNsb3NlKCdkaXNtaXNzZWQnKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5ID09PSAnQmFja3NwYWNlJykge1xuICAgICAgY29uc3QgaW5kZXggPSBOdW1iZXIoZXZlbnQudGFyZ2V0Py5kYXRhc2V0Py5pbmRleCB8fCAwKTtcbiAgICAgIGlmICghZGlnaXRzW2luZGV4XSAmJiBpbmRleCA+IDApIGZvY3VzSW5wdXQoaW5kZXggLSAxKTtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQua2V5ICE9PSAnVGFiJykgcmV0dXJuO1xuICAgIGNvbnN0IGZvY3VzYWJsZSA9IGdldEZvY3VzYWJsZUVsZW1lbnRzKG1vZGFsUmVmLmN1cnJlbnQpO1xuICAgIGlmICghZm9jdXNhYmxlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGNvbnN0IGZpcnN0ID0gZm9jdXNhYmxlWzBdO1xuICAgIGNvbnN0IGxhc3QgPSBmb2N1c2FibGVbZm9jdXNhYmxlLmxlbmd0aCAtIDFdO1xuICAgIGlmIChldmVudC5zaGlmdEtleSAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSBmaXJzdCkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGxhc3QuZm9jdXMoKTtcbiAgICB9IGVsc2UgaWYgKCFldmVudC5zaGlmdEtleSAmJiBkb2N1bWVudC5hY3RpdmVFbGVtZW50ID09PSBsYXN0KSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgZmlyc3QuZm9jdXMoKTtcbiAgICB9XG4gIH07XG5cbiAgaWYgKHBoYXNlID09PSAnaGlkZGVuJykgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgYWNjZXB0ZWQgPSBwaGFzZSA9PT0gJ2FjY2VwdGVkJztcbiAgY29uc3QgYWN0aXZlID0gcGhhc2UgPT09ICdvcGVuJyB8fCBhY2NlcHRlZDtcbiAgY29uc3QgY2xhc3NOYW1lID0gW1xuICAgICdwb3J0Zm9saW8tYWNjZXNzLWdhdGUgcm91dGUtY2VudGVyZWQtcGFnZScsXG4gICAgYWN0aXZlID8gJ2lzLW9wZW4nIDogJycsXG4gICAgYWNjZXB0ZWQgPyAnaXMtYWNjZXB0ZWQnIDogJycsXG4gICAgcGhhc2UgPT09ICdjbG9zaW5nJyA/ICdpcy1jbG9zaW5nJyA6ICcnLFxuICBdLmZpbHRlcihCb29sZWFuKS5qb2luKCcgJyk7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2XG4gICAgICByZWY9e21vZGFsUmVmfVxuICAgICAgY2xhc3NOYW1lPXtjbGFzc05hbWV9XG4gICAgICBkYXRhLXBvcnRmb2xpby1hY2Nlc3MtZ2F0ZVxuICAgICAgZGF0YS1waGFzZT17cGhhc2V9XG4gICAgICByb2xlPVwiZGlhbG9nXCJcbiAgICAgIGFyaWEtbW9kYWw9XCJ0cnVlXCJcbiAgICAgIGFyaWEtbGFiZWxsZWRieT1cInBvcnRmb2xpby1hY2Nlc3MtZ2F0ZS10aXRsZVwiXG4gICAgICBhcmlhLWRlc2NyaWJlZGJ5PVwicG9ydGZvbGlvLWFjY2Vzcy1nYXRlLWRlc2NyaXB0aW9uXCJcbiAgICAgIGFyaWEtYnVzeT17YWNjZXB0ZWQgPyAndHJ1ZScgOiAnZmFsc2UnfVxuICAgICAgb25LZXlEb3duPXtoYW5kbGVLZXlEb3dufVxuICAgID5cbiAgICAgIDxidXR0b25cbiAgICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICAgIGNsYXNzTmFtZT1cInBvcnRmb2xpby1hY2Nlc3MtZ2F0ZV9fY2xvc2UgYWJzLWljb24tYnRuXCJcbiAgICAgICAgYXJpYS1sYWJlbD1cIkNsb3NlIHBvcnRmb2xpbyBhY2Nlc3MgcHJvbXB0XCJcbiAgICAgICAgZGlzYWJsZWQ9e2FjY2VwdGVkIHx8IHBoYXNlID09PSAnY2xvc2luZyd9XG4gICAgICAgIG9uQ2xpY2s9eygpID0+IGJlZ2luQ2xvc2UoJ2Rpc21pc3NlZCcpfVxuICAgICAgPlxuICAgICAgICA8c3ZnIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiB3aWR0aD1cIjI0XCIgaGVpZ2h0PVwiMjRcIiBhcmlhLWhpZGRlbj1cInRydWVcIiBmb2N1c2FibGU9XCJmYWxzZVwiPlxuICAgICAgICAgIDxwYXRoXG4gICAgICAgICAgICBmaWxsPVwiY3VycmVudENvbG9yXCJcbiAgICAgICAgICAgIGQ9XCJNNi4yMiA0LjkzIDEyIDEwLjcxbDUuNzgtNS43OCAxLjI5IDEuMjlMMTMuMjkgMTJsNS43OCA1Ljc4LTEuMjkgMS4yOUwxMiAxMy4yOWwtNS43OCA1Ljc4LTEuMjktMS4yOUwxMC43MSAxMiA0LjkzIDYuMjJ6XCJcbiAgICAgICAgICAvPlxuICAgICAgICA8L3N2Zz5cbiAgICAgIDwvYnV0dG9uPlxuXG4gICAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJyb3V0ZS1jZW50ZXJlZC1wYWdlX19pbm5lciBwb3J0Zm9saW8tYWNjZXNzLWdhdGVfX2lubmVyXCI+XG4gICAgICAgIDxwIGNsYXNzTmFtZT1cInJvdXRlLWtpY2tlclwiPlByaXZhdGUgcHJvamVjdDwvcD5cbiAgICAgICAgPGgxIGlkPVwicG9ydGZvbGlvLWFjY2Vzcy1nYXRlLXRpdGxlXCIgY2xhc3NOYW1lPVwicm91dGUtY2VudGVyZWQtcGFnZV9fdGl0bGVcIj57dGl0bGV9PC9oMT5cbiAgICAgICAgPHAgaWQ9XCJwb3J0Zm9saW8tYWNjZXNzLWdhdGUtZGVzY3JpcHRpb25cIiBjbGFzc05hbWU9XCJyb3V0ZS1jZW50ZXJlZC1wYWdlX19kZXNjcmlwdGlvblwiPntkZXNjcmlwdGlvbn08L3A+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBjbGFzc05hbWU9e2Bwb3J0Zm9saW8tZ2F0ZS1pbnB1dHMgcG9ydGZvbGlvLWFjY2Vzcy1nYXRlX19pbnB1dHMke3N0YXR1c01lc3NhZ2UgJiYgIWFjY2VwdGVkID8gJyBpcy1lcnJvcicgOiAnJ30ke2FjY2VwdGVkID8gJyBwdWxzZS1lbmVyZ3knIDogJyd9YH1cbiAgICAgICAgICByb2xlPVwiZ3JvdXBcIlxuICAgICAgICAgIGFyaWEtbGFiZWw9XCJQb3J0Zm9saW8gaW52aXRlIGNvZGVcIlxuICAgICAgICA+XG4gICAgICAgICAge2RpZ2l0cy5tYXAoKGRpZ2l0LCBpbmRleCkgPT4gKFxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgIGtleT17YHBvcnRmb2xpby1hY2Nlc3MtZGlnaXQtJHtpbmRleH1gfVxuICAgICAgICAgICAgICByZWY9eyhlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICAgICAgaW5wdXRSZWZzLmN1cnJlbnRbaW5kZXhdID0gZWxlbWVudDtcbiAgICAgICAgICAgICAgfX1cbiAgICAgICAgICAgICAgdHlwZT1cInRleHRcIlxuICAgICAgICAgICAgICBtYXhMZW5ndGg9XCIxXCJcbiAgICAgICAgICAgICAgY2xhc3NOYW1lPVwicG9ydGZvbGlvLWRpZ2l0XCJcbiAgICAgICAgICAgICAgaW5wdXRNb2RlPVwibnVtZXJpY1wiXG4gICAgICAgICAgICAgIHBhdHRlcm49XCJbMC05XVwiXG4gICAgICAgICAgICAgIGRhdGEtaW5kZXg9e2luZGV4fVxuICAgICAgICAgICAgICBhcmlhLWxhYmVsPXtgUG9ydGZvbGlvIGludml0ZSBjb2RlIGRpZ2l0ICR7aW5kZXggKyAxfSBvZiAke2NvZGVMZW5ndGh9YH1cbiAgICAgICAgICAgICAgYXV0b0NvbXBsZXRlPVwib2ZmXCJcbiAgICAgICAgICAgICAgdmFsdWU9e2RpZ2l0fVxuICAgICAgICAgICAgICBkaXNhYmxlZD17YWNjZXB0ZWQgfHwgcGhhc2UgPT09ICdjbG9zaW5nJ31cbiAgICAgICAgICAgICAgb25DaGFuZ2U9eyhldmVudCkgPT4gaGFuZGxlRGlnaXRDaGFuZ2UoaW5kZXgsIGV2ZW50LmN1cnJlbnRUYXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgICBvblBhc3RlPXsoZXZlbnQpID0+IGhhbmRsZVBhc3RlKGV2ZW50LCBpbmRleCl9XG4gICAgICAgICAgICAvPlxuICAgICAgICAgICkpfVxuICAgICAgICA8L2Rpdj5cbiAgICAgICAgPHAgY2xhc3NOYW1lPVwicG9ydGZvbGlvLWFjY2Vzcy1nYXRlX19zdGF0dXNcIiByb2xlPVwic3RhdHVzXCIgYXJpYS1saXZlPVwicG9saXRlXCI+XG4gICAgICAgICAge3N0YXR1c01lc3NhZ2V9XG4gICAgICAgIDwvcD5cbiAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvcG9ydGZvbGlvL1BvcnRmb2xpb0dhdGVSb3V0ZS5qc3gifQ==