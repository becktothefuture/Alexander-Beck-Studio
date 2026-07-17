import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/contact/ContactRouteContent.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useCallback = __vite__cjsImport1_react["useCallback"]; const useEffect = __vite__cjsImport1_react["useEffect"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"];
import homeContent from "/@id/__x00__virtual:abs-content/home";
import { triggerHaptic } from "/src/lib/haptics.js";
import { playContactRippleMotif } from "/src/legacy/modules/audio/sound-engine.js";
import { requestContactRippleBurst } from "/src/routes/contact/contactRippleEvents.js";
const COPY_FEEDBACK_MS = 3e3;
async function copyToClipboard(text) {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand?.("copy") === true;
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
export function ContactRouteContent() {
  _s();
  const contact = homeContent.contact || {};
  const [copyState, setCopyState] = useState("idle");
  const resetTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  const email = contact.email || "alexander@beck.fyi";
  const copyText = contact.copy || {};
  const title = contact.title || "Let's talk";
  const description = contact.description || "Hit me up for collaborations and job opportunities. If you need innovative thinking and a creative mind to tackle complex aesthetic, visual, and system problems, get in touch.";
  const setFeedback = useCallback((state) => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    setCopyState(state);
    if (state !== "idle") {
      resetTimerRef.current = window.setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
    }
  }, []);
  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
  }, []);
  const handleCopy = useCallback(async (event) => {
    const button = event.currentTarget;
    requestContactRippleBurst();
    void playContactRippleMotif({ unlockIfNeeded: true });
    const ok = await copyToClipboard(email);
    triggerHaptic(ok ? "success" : "error");
    button.classList.remove("pulse-energy");
    if (pulseTimerRef.current) {
      window.clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    if (ok) {
      void button.offsetWidth;
      button.classList.add("pulse-energy");
      pulseTimerRef.current = window.setTimeout(() => {
        button.classList.remove("pulse-energy");
        pulseTimerRef.current = null;
      }, 800);
    }
    setFeedback(ok ? "copied" : "error");
  }, [email, setFeedback]);
  const statusText = copyState === "copied" ? copyText.statusCopied || "Copied" : copyState === "error" ? copyText.statusError || "Copy failed" : "";
  const iconClass = copyState === "copied" ? "ti ti-check" : copyState === "error" ? "ti ti-alert-triangle" : "ti ti-copy";
  return /* @__PURE__ */ jsxDEV("div", { className: "route-centered-page contact-route", "data-route-content": "contact", children: /* @__PURE__ */ jsxDEV("section", { id: "contact-route-content", className: "route-centered-page__inner contact-route__inner", "aria-labelledby": "contact-route-title", children: [
    /* @__PURE__ */ jsxDEV("h1", { id: "contact-route-title", className: "route-centered-page__title", "data-route-enter": "identity", "data-route-enter-order": "0", children: title }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
      lineNumber: 99,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("p", { id: "contact-route-description", className: "route-centered-page__description", "data-route-enter": "context", children: description }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
      lineNumber: 102,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "contact-route__copy", "data-route-enter": "action", children: [
      /* @__PURE__ */ jsxDEV(
        "button",
        {
          type: "button",
          className: [
            "contact-email-row",
            copyState === "copied" ? "is-copied" : "",
            copyState === "error" ? "is-error" : ""
          ].filter(Boolean).join(" "),
          "data-copy-email": true,
          "aria-label": copyText.buttonAriaLabel || "Copy email address",
          "aria-describedby": "contact-copy-status",
          onClick: handleCopy,
          children: [
            /* @__PURE__ */ jsxDEV("span", { className: "contact-email-text", children: email }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
              lineNumber: 118,
              columnNumber: 13
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: ["contact-email-copy", copyState !== "idle" ? "is-active" : ""].filter(Boolean).join(" "), children: /* @__PURE__ */ jsxDEV("i", { className: iconClass, "aria-hidden": "true" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
              lineNumber: 120,
              columnNumber: 15
            }, this) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
              lineNumber: 119,
              columnNumber: 13
            }, this)
          ]
        },
        void 0,
        true,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
          lineNumber: 106,
          columnNumber: 11
        },
        this
      ),
      /* @__PURE__ */ jsxDEV("div", { id: "contact-copy-status", className: "contact-copy-status", "data-copy-status": true, "aria-live": "polite", children: statusText }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
        lineNumber: 123,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
      lineNumber: 105,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
    lineNumber: 98,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx",
    lineNumber: 97,
    columnNumber: 5
  }, this);
}
_s(ContactRouteContent, "rY/I1/dbMxkisqbMnMKK5y8nCB0=");
_c = ContactRouteContent;
var _c;
$RefreshReg$(_c, "ContactRouteContent");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRouteContent.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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LEVBQUUsRUFBRTRCLE9BQU9DLE9BQU8sRUFBRUMsS0FBSyxHQUFHLEdBQ3ZHLGlDQUFDLE9BQUUsV0FBV0gsV0FBVyxlQUFZLFVBQXJDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBQTJDLEtBRDdDO0FBQUE7QUFBQTtBQUFBO0FBQUEsbUJBRUE7QUFBQTtBQUFBO0FBQUEsUUFmRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFnQkE7QUFBQSxNQUNBLHVCQUFDLFNBQUksSUFBRyx1QkFBc0IsV0FBVSx1QkFBc0Isb0JBQWdCLE1BQUMsYUFBVSxVQUN0Rkgsd0JBREg7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUVBO0FBQUEsU0FwQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxXQXFCQTtBQUFBLE9BNUJGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0E2QkEsS0E5QkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQStCQTtBQUVKO0FBQUMxQixHQTlGZUQscUJBQW1CO0FBQUEsS0FBbkJBO0FBQW1CLElBQUFtQztBQUFBLGFBQUFBLElBQUEiLCJuYW1lcyI6WyJ1c2VDYWxsYmFjayIsInVzZUVmZmVjdCIsInVzZVJlZiIsInVzZVN0YXRlIiwiaG9tZUNvbnRlbnQiLCJ0cmlnZ2VySGFwdGljIiwicGxheUNvbnRhY3RSaXBwbGVNb3RpZiIsInJlcXVlc3RDb250YWN0UmlwcGxlQnVyc3QiLCJDT1BZX0ZFRURCQUNLX01TIiwiY29weVRvQ2xpcGJvYXJkIiwidGV4dCIsIm5hdmlnYXRvciIsImNsaXBib2FyZCIsIndyaXRlVGV4dCIsInRleHRhcmVhIiwiZG9jdW1lbnQiLCJjcmVhdGVFbGVtZW50IiwidmFsdWUiLCJzZXRBdHRyaWJ1dGUiLCJzdHlsZSIsInBvc2l0aW9uIiwibGVmdCIsInRvcCIsImJvZHkiLCJhcHBlbmRDaGlsZCIsInNlbGVjdCIsIm9rIiwiZXhlY0NvbW1hbmQiLCJyZW1vdmVDaGlsZCIsIkNvbnRhY3RSb3V0ZUNvbnRlbnQiLCJfcyIsImNvbnRhY3QiLCJjb3B5U3RhdGUiLCJzZXRDb3B5U3RhdGUiLCJyZXNldFRpbWVyUmVmIiwicHVsc2VUaW1lclJlZiIsImVtYWlsIiwiY29weVRleHQiLCJjb3B5IiwidGl0bGUiLCJkZXNjcmlwdGlvbiIsInNldEZlZWRiYWNrIiwic3RhdGUiLCJjdXJyZW50Iiwid2luZG93IiwiY2xlYXJUaW1lb3V0Iiwic2V0VGltZW91dCIsImhhbmRsZUNvcHkiLCJldmVudCIsImJ1dHRvbiIsImN1cnJlbnRUYXJnZXQiLCJ1bmxvY2tJZk5lZWRlZCIsImNsYXNzTGlzdCIsInJlbW92ZSIsIm9mZnNldFdpZHRoIiwiYWRkIiwic3RhdHVzVGV4dCIsInN0YXR1c0NvcGllZCIsInN0YXR1c0Vycm9yIiwiaWNvbkNsYXNzIiwiZmlsdGVyIiwiQm9vbGVhbiIsImpvaW4iLCJidXR0b25BcmlhTGFiZWwiLCJfYyJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJDb250YWN0Um91dGVDb250ZW50LmpzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VDYWxsYmFjaywgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IGhvbWVDb250ZW50IGZyb20gJ3ZpcnR1YWw6YWJzLWNvbnRlbnQvaG9tZSc7XG5pbXBvcnQgeyB0cmlnZ2VySGFwdGljIH0gZnJvbSAnLi4vLi4vbGliL2hhcHRpY3MuanMnO1xuaW1wb3J0IHsgcGxheUNvbnRhY3RSaXBwbGVNb3RpZiB9IGZyb20gJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL2F1ZGlvL3NvdW5kLWVuZ2luZS5qcyc7XG5pbXBvcnQgeyByZXF1ZXN0Q29udGFjdFJpcHBsZUJ1cnN0IH0gZnJvbSAnLi9jb250YWN0UmlwcGxlRXZlbnRzLmpzJztcblxuY29uc3QgQ09QWV9GRUVEQkFDS19NUyA9IDMwMDA7XG5cbmFzeW5jIGZ1bmN0aW9uIGNvcHlUb0NsaXBib2FyZCh0ZXh0KSB7XG4gIHRyeSB7XG4gICAgaWYgKG5hdmlnYXRvcj8uY2xpcGJvYXJkPy53cml0ZVRleHQpIHtcbiAgICAgIGF3YWl0IG5hdmlnYXRvci5jbGlwYm9hcmQud3JpdGVUZXh0KHRleHQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9IGNhdGNoIHtcbiAgICAvLyBGYWxsIHRocm91Z2ggdG8gdGhlIGxlZ2FjeSBmYWxsYmFjay5cbiAgfVxuXG4gIHRyeSB7XG4gICAgY29uc3QgdGV4dGFyZWEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZXh0YXJlYScpO1xuICAgIHRleHRhcmVhLnZhbHVlID0gdGV4dDtcbiAgICB0ZXh0YXJlYS5zZXRBdHRyaWJ1dGUoJ3JlYWRvbmx5JywgJ3RydWUnKTtcbiAgICB0ZXh0YXJlYS5zdHlsZS5wb3NpdGlvbiA9ICdmaXhlZCc7XG4gICAgdGV4dGFyZWEuc3R5bGUubGVmdCA9ICctOTk5OXB4JztcbiAgICB0ZXh0YXJlYS5zdHlsZS50b3AgPSAnMCc7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh0ZXh0YXJlYSk7XG4gICAgdGV4dGFyZWEuc2VsZWN0KCk7XG4gICAgY29uc3Qgb2sgPSBkb2N1bWVudC5leGVjQ29tbWFuZD8uKCdjb3B5JykgPT09IHRydWU7XG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZCh0ZXh0YXJlYSk7XG4gICAgcmV0dXJuIG9rO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIENvbnRhY3RSb3V0ZUNvbnRlbnQoKSB7XG4gIGNvbnN0IGNvbnRhY3QgPSBob21lQ29udGVudC5jb250YWN0IHx8IHt9O1xuICBjb25zdCBbY29weVN0YXRlLCBzZXRDb3B5U3RhdGVdID0gdXNlU3RhdGUoJ2lkbGUnKTtcbiAgY29uc3QgcmVzZXRUaW1lclJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgcHVsc2VUaW1lclJlZiA9IHVzZVJlZihudWxsKTtcbiAgY29uc3QgZW1haWwgPSBjb250YWN0LmVtYWlsIHx8ICdhbGV4YW5kZXJAYmVjay5meWknO1xuICBjb25zdCBjb3B5VGV4dCA9IGNvbnRhY3QuY29weSB8fCB7fTtcbiAgY29uc3QgdGl0bGUgPSBjb250YWN0LnRpdGxlIHx8IFwiTGV0J3MgdGFsa1wiO1xuICBjb25zdCBkZXNjcmlwdGlvbiA9IGNvbnRhY3QuZGVzY3JpcHRpb25cbiAgICB8fCBcIkhpdCBtZSB1cCBmb3IgY29sbGFib3JhdGlvbnMgYW5kIGpvYiBvcHBvcnR1bml0aWVzLiBJZiB5b3UgbmVlZCBpbm5vdmF0aXZlIHRoaW5raW5nIGFuZCBhIGNyZWF0aXZlIG1pbmQgdG8gdGFja2xlIGNvbXBsZXggYWVzdGhldGljLCB2aXN1YWwsIGFuZCBzeXN0ZW0gcHJvYmxlbXMsIGdldCBpbiB0b3VjaC5cIjtcblxuICBjb25zdCBzZXRGZWVkYmFjayA9IHVzZUNhbGxiYWNrKChzdGF0ZSkgPT4ge1xuICAgIGlmIChyZXNldFRpbWVyUmVmLmN1cnJlbnQpIHtcbiAgICAgIHdpbmRvdy5jbGVhclRpbWVvdXQocmVzZXRUaW1lclJlZi5jdXJyZW50KTtcbiAgICAgIHJlc2V0VGltZXJSZWYuY3VycmVudCA9IG51bGw7XG4gICAgfVxuICAgIHNldENvcHlTdGF0ZShzdGF0ZSk7XG4gICAgaWYgKHN0YXRlICE9PSAnaWRsZScpIHtcbiAgICAgIHJlc2V0VGltZXJSZWYuY3VycmVudCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHNldENvcHlTdGF0ZSgnaWRsZScpLCBDT1BZX0ZFRURCQUNLX01TKTtcbiAgICB9XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4gKCkgPT4ge1xuICAgIGlmIChyZXNldFRpbWVyUmVmLmN1cnJlbnQpIHdpbmRvdy5jbGVhclRpbWVvdXQocmVzZXRUaW1lclJlZi5jdXJyZW50KTtcbiAgICBpZiAocHVsc2VUaW1lclJlZi5jdXJyZW50KSB3aW5kb3cuY2xlYXJUaW1lb3V0KHB1bHNlVGltZXJSZWYuY3VycmVudCk7XG4gIH0sIFtdKTtcblxuICBjb25zdCBoYW5kbGVDb3B5ID0gdXNlQ2FsbGJhY2soYXN5bmMgKGV2ZW50KSA9PiB7XG4gICAgY29uc3QgYnV0dG9uID0gZXZlbnQuY3VycmVudFRhcmdldDtcbiAgICByZXF1ZXN0Q29udGFjdFJpcHBsZUJ1cnN0KCk7XG4gICAgdm9pZCBwbGF5Q29udGFjdFJpcHBsZU1vdGlmKHsgdW5sb2NrSWZOZWVkZWQ6IHRydWUgfSk7XG4gICAgY29uc3Qgb2sgPSBhd2FpdCBjb3B5VG9DbGlwYm9hcmQoZW1haWwpO1xuICAgIHRyaWdnZXJIYXB0aWMob2sgPyAnc3VjY2VzcycgOiAnZXJyb3InKTtcbiAgICBidXR0b24uY2xhc3NMaXN0LnJlbW92ZSgncHVsc2UtZW5lcmd5Jyk7XG4gICAgaWYgKHB1bHNlVGltZXJSZWYuY3VycmVudCkge1xuICAgICAgd2luZG93LmNsZWFyVGltZW91dChwdWxzZVRpbWVyUmVmLmN1cnJlbnQpO1xuICAgICAgcHVsc2VUaW1lclJlZi5jdXJyZW50ID0gbnVsbDtcbiAgICB9XG4gICAgaWYgKG9rKSB7XG4gICAgICB2b2lkIGJ1dHRvbi5vZmZzZXRXaWR0aDtcbiAgICAgIGJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdwdWxzZS1lbmVyZ3knKTtcbiAgICAgIHB1bHNlVGltZXJSZWYuY3VycmVudCA9IHdpbmRvdy5zZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgYnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ3B1bHNlLWVuZXJneScpO1xuICAgICAgICBwdWxzZVRpbWVyUmVmLmN1cnJlbnQgPSBudWxsO1xuICAgICAgfSwgODAwKTtcbiAgICB9XG4gICAgc2V0RmVlZGJhY2sob2sgPyAnY29waWVkJyA6ICdlcnJvcicpO1xuICB9LCBbZW1haWwsIHNldEZlZWRiYWNrXSk7XG5cbiAgY29uc3Qgc3RhdHVzVGV4dCA9IGNvcHlTdGF0ZSA9PT0gJ2NvcGllZCdcbiAgICA/IChjb3B5VGV4dC5zdGF0dXNDb3BpZWQgfHwgJ0NvcGllZCcpXG4gICAgOiBjb3B5U3RhdGUgPT09ICdlcnJvcidcbiAgICAgID8gKGNvcHlUZXh0LnN0YXR1c0Vycm9yIHx8ICdDb3B5IGZhaWxlZCcpXG4gICAgICA6ICcnO1xuICBjb25zdCBpY29uQ2xhc3MgPSBjb3B5U3RhdGUgPT09ICdjb3BpZWQnXG4gICAgPyAndGkgdGktY2hlY2snXG4gICAgOiBjb3B5U3RhdGUgPT09ICdlcnJvcidcbiAgICAgID8gJ3RpIHRpLWFsZXJ0LXRyaWFuZ2xlJ1xuICAgICAgOiAndGkgdGktY29weSc7XG5cbiAgcmV0dXJuIChcbiAgICA8ZGl2IGNsYXNzTmFtZT1cInJvdXRlLWNlbnRlcmVkLXBhZ2UgY29udGFjdC1yb3V0ZVwiIGRhdGEtcm91dGUtY29udGVudD1cImNvbnRhY3RcIj5cbiAgICAgIDxzZWN0aW9uIGlkPVwiY29udGFjdC1yb3V0ZS1jb250ZW50XCIgY2xhc3NOYW1lPVwicm91dGUtY2VudGVyZWQtcGFnZV9faW5uZXIgY29udGFjdC1yb3V0ZV9faW5uZXJcIiBhcmlhLWxhYmVsbGVkYnk9XCJjb250YWN0LXJvdXRlLXRpdGxlXCI+XG4gICAgICAgIDxoMSBpZD1cImNvbnRhY3Qtcm91dGUtdGl0bGVcIiBjbGFzc05hbWU9XCJyb3V0ZS1jZW50ZXJlZC1wYWdlX190aXRsZVwiIGRhdGEtcm91dGUtZW50ZXI9XCJpZGVudGl0eVwiIGRhdGEtcm91dGUtZW50ZXItb3JkZXI9XCIwXCI+XG4gICAgICAgICAge3RpdGxlfVxuICAgICAgICA8L2gxPlxuICAgICAgICA8cCBpZD1cImNvbnRhY3Qtcm91dGUtZGVzY3JpcHRpb25cIiBjbGFzc05hbWU9XCJyb3V0ZS1jZW50ZXJlZC1wYWdlX19kZXNjcmlwdGlvblwiIGRhdGEtcm91dGUtZW50ZXI9XCJjb250ZXh0XCI+XG4gICAgICAgICAge2Rlc2NyaXB0aW9ufVxuICAgICAgICA8L3A+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwiY29udGFjdC1yb3V0ZV9fY29weVwiIGRhdGEtcm91dGUtZW50ZXI9XCJhY3Rpb25cIj5cbiAgICAgICAgICA8YnV0dG9uXG4gICAgICAgICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgICAgICAgIGNsYXNzTmFtZT17W1xuICAgICAgICAgICAgICAnY29udGFjdC1lbWFpbC1yb3cnLFxuICAgICAgICAgICAgICBjb3B5U3RhdGUgPT09ICdjb3BpZWQnID8gJ2lzLWNvcGllZCcgOiAnJyxcbiAgICAgICAgICAgICAgY29weVN0YXRlID09PSAnZXJyb3InID8gJ2lzLWVycm9yJyA6ICcnLFxuICAgICAgICAgICAgXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpfVxuICAgICAgICAgICAgZGF0YS1jb3B5LWVtYWlsXG4gICAgICAgICAgICBhcmlhLWxhYmVsPXtjb3B5VGV4dC5idXR0b25BcmlhTGFiZWwgfHwgJ0NvcHkgZW1haWwgYWRkcmVzcyd9XG4gICAgICAgICAgICBhcmlhLWRlc2NyaWJlZGJ5PVwiY29udGFjdC1jb3B5LXN0YXR1c1wiXG4gICAgICAgICAgICBvbkNsaWNrPXtoYW5kbGVDb3B5fVxuICAgICAgICAgID5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImNvbnRhY3QtZW1haWwtdGV4dFwiPntlbWFpbH08L3NwYW4+XG4gICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e1snY29udGFjdC1lbWFpbC1jb3B5JywgY29weVN0YXRlICE9PSAnaWRsZScgPyAnaXMtYWN0aXZlJyA6ICcnXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpfT5cbiAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPXtpY29uQ2xhc3N9IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgPC9idXR0b24+XG4gICAgICAgICAgPGRpdiBpZD1cImNvbnRhY3QtY29weS1zdGF0dXNcIiBjbGFzc05hbWU9XCJjb250YWN0LWNvcHktc3RhdHVzXCIgZGF0YS1jb3B5LXN0YXR1cyBhcmlhLWxpdmU9XCJwb2xpdGVcIj5cbiAgICAgICAgICAgIHtzdGF0dXNUZXh0fVxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvc2VjdGlvbj5cbiAgICA8L2Rpdj5cbiAgKTtcbn1cbiJdLCJmaWxlIjoiL1VzZXJzL2FsZXhhbmRlcmJlY2svUHJvamVjdHMtY29kZS9BbGV4YW5kZXIgQmVjayBTdHVkaW8gV2Vic2l0ZS9yZWFjdC1hcHAvYXBwL3NyYy9yb3V0ZXMvY29udGFjdC9Db250YWN0Um91dGVDb250ZW50LmpzeCJ9