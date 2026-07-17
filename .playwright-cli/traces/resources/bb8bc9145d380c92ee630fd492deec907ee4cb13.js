import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/simulation-launchpad/IssuePanel.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useState = __vite__cjsImport1_react["useState"];
import { X } from "/node_modules/.vite/deps/lucide-react.js?v=6e8fde4d";
export function IssuePanel({ entry, adminApi, onClose, onSaved }) {
  _s();
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [note, setNote] = useState("");
  if (!entry) return null;
  async function handleSubmit(event) {
    event.preventDefault();
    const logged = await adminApi.logIssue(entry, { title, severity, note });
    if (logged) {
      setTitle("");
      setSeverity("medium");
      setNote("");
      if (onSaved) {
        await onSaved();
        return;
      }
      onClose();
    }
  }
  return /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": "simulation-issue-title", children: /* @__PURE__ */ jsxDEV("form", { className: "simulation-dashboard-modal__panel", onSubmit: handleSubmit, children: [
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal__header", children: [
      /* @__PURE__ */ jsxDEV("div", { children: [
        /* @__PURE__ */ jsxDEV("p", { children: "Log issue" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 31,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("h2", { id: "simulation-issue-title", children: entry.name }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 32,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 30,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "simulation-dashboard-icon-button simulation-dashboard-tooltip--below-end", onClick: onClose, "aria-label": "Close issue logger", "data-tooltip": "Close without saving", children: /* @__PURE__ */ jsxDEV(X, { "aria-hidden": "true", size: 16, strokeWidth: 2 }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 35,
        columnNumber: 13
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 34,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
      lineNumber: 29,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("label", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Title" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 40,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "input",
        {
          value: title,
          onChange: (event) => setTitle(event.target.value),
          placeholder: "What is wrong?",
          required: true
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 41,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
      lineNumber: 39,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("label", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Severity" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 50,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("select", { value: severity, onChange: (event) => setSeverity(event.target.value), children: [
        /* @__PURE__ */ jsxDEV("option", { value: "low", children: "Low" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 52,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "medium", children: "Medium" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 53,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "high", children: "High" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 54,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("option", { value: "blocker", children: "Blocker" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 55,
          columnNumber: 13
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 51,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
      lineNumber: 49,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("label", { children: [
      /* @__PURE__ */ jsxDEV("span", { children: "Note" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 60,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV(
        "textarea",
        {
          value: note,
          onChange: (event) => setNote(event.target.value),
          placeholder: "Observed behavior, browser, viewport, or promotion concern.",
          rows: "5"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
          lineNumber: 61,
          columnNumber: 11
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
      lineNumber: 59,
      columnNumber: 9
    }, this),
    /* @__PURE__ */ jsxDEV("div", { className: "simulation-dashboard-modal__actions", children: [
      /* @__PURE__ */ jsxDEV("button", { type: "button", className: "simulation-dashboard-button simulation-dashboard-button--ghost", onClick: onClose, children: "Cancel" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 70,
        columnNumber: 11
      }, this),
      /* @__PURE__ */ jsxDEV("button", { type: "submit", className: "simulation-dashboard-button simulation-dashboard-button--primary", children: "Save issue" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
        lineNumber: 71,
        columnNumber: 11
      }, this)
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
      lineNumber: 69,
      columnNumber: 9
    }, this)
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
    lineNumber: 28,
    columnNumber: 7
  }, this) }, void 0, false, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx",
    lineNumber: 27,
    columnNumber: 5
  }, this);
}
_s(IssuePanel, "VMG5DcXRonCsWYi7wIjgy2pbeHg=");
_c = IssuePanel;
var _c;
$RefreshReg$(_c, "IssuePanel");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/simulation-launchpad/IssuePanel.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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O0FBQUE7QUFBQSxXQVFBO0FBQUEsSUFFQSx1QkFBQyxXQUNDO0FBQUEsNkJBQUMsVUFBSyxvQkFBTjtBQUFBO0FBQUE7QUFBQTtBQUFBLGFBQVU7QUFBQSxNQUNWO0FBQUEsUUFBQztBQUFBO0FBQUEsVUFDQyxPQUFPVDtBQUFBQSxVQUNQLFVBQVUsQ0FBQ0csVUFBVUYsUUFBUUUsTUFBTUssT0FBT0MsS0FBSztBQUFBLFVBQy9DLGFBQVk7QUFBQSxVQUNaLE1BQUs7QUFBQTtBQUFBLFFBSlA7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSVU7QUFBQSxTQU5aO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FRQTtBQUFBLElBRUEsdUJBQUMsU0FBSSxXQUFVLHVDQUNiO0FBQUEsNkJBQUMsWUFBTyxNQUFLLFVBQVMsV0FBVSxrRUFBaUUsU0FBU2hCLFNBQVMsc0JBQW5IO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFBeUg7QUFBQSxNQUN6SCx1QkFBQyxZQUFPLE1BQUssVUFBUyxXQUFVLG9FQUFtRSwwQkFBbkc7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQUE2RztBQUFBLFNBRi9HO0FBQUE7QUFBQTtBQUFBO0FBQUEsV0FHQTtBQUFBLE9BNUNGO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0E2Q0EsS0E5Q0Y7QUFBQTtBQUFBO0FBQUE7QUFBQSxTQStDQTtBQUVKO0FBQUNFLEdBeEVlTCxZQUFVO0FBQUEsS0FBVkE7QUFBVSxJQUFBb0I7QUFBQSxhQUFBQSxJQUFBIiwibmFtZXMiOlsidXNlU3RhdGUiLCJYIiwiSXNzdWVQYW5lbCIsImVudHJ5IiwiYWRtaW5BcGkiLCJvbkNsb3NlIiwib25TYXZlZCIsIl9zIiwidGl0bGUiLCJzZXRUaXRsZSIsInNldmVyaXR5Iiwic2V0U2V2ZXJpdHkiLCJub3RlIiwic2V0Tm90ZSIsImhhbmRsZVN1Ym1pdCIsImV2ZW50IiwicHJldmVudERlZmF1bHQiLCJsb2dnZWQiLCJsb2dJc3N1ZSIsIm5hbWUiLCJ0YXJnZXQiLCJ2YWx1ZSIsIl9jIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIklzc3VlUGFuZWwuanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZVN0YXRlIH0gZnJvbSAncmVhY3QnO1xuaW1wb3J0IHsgWCB9IGZyb20gJ2x1Y2lkZS1yZWFjdCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBJc3N1ZVBhbmVsKHsgZW50cnksIGFkbWluQXBpLCBvbkNsb3NlLCBvblNhdmVkIH0pIHtcbiAgY29uc3QgW3RpdGxlLCBzZXRUaXRsZV0gPSB1c2VTdGF0ZSgnJyk7XG4gIGNvbnN0IFtzZXZlcml0eSwgc2V0U2V2ZXJpdHldID0gdXNlU3RhdGUoJ21lZGl1bScpO1xuICBjb25zdCBbbm90ZSwgc2V0Tm90ZV0gPSB1c2VTdGF0ZSgnJyk7XG5cbiAgaWYgKCFlbnRyeSkgcmV0dXJuIG51bGw7XG5cbiAgYXN5bmMgZnVuY3Rpb24gaGFuZGxlU3VibWl0KGV2ZW50KSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBjb25zdCBsb2dnZWQgPSBhd2FpdCBhZG1pbkFwaS5sb2dJc3N1ZShlbnRyeSwgeyB0aXRsZSwgc2V2ZXJpdHksIG5vdGUgfSk7XG4gICAgaWYgKGxvZ2dlZCkge1xuICAgICAgc2V0VGl0bGUoJycpO1xuICAgICAgc2V0U2V2ZXJpdHkoJ21lZGl1bScpO1xuICAgICAgc2V0Tm90ZSgnJyk7XG4gICAgICBpZiAob25TYXZlZCkge1xuICAgICAgICBhd2FpdCBvblNhdmVkKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIG9uQ2xvc2UoKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gKFxuICAgIDxkaXYgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtbW9kYWxcIiByb2xlPVwiZGlhbG9nXCIgYXJpYS1tb2RhbD1cInRydWVcIiBhcmlhLWxhYmVsbGVkYnk9XCJzaW11bGF0aW9uLWlzc3VlLXRpdGxlXCI+XG4gICAgICA8Zm9ybSBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1tb2RhbF9fcGFuZWxcIiBvblN1Ym1pdD17aGFuZGxlU3VibWl0fT5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1tb2RhbF9faGVhZGVyXCI+XG4gICAgICAgICAgPGRpdj5cbiAgICAgICAgICAgIDxwPkxvZyBpc3N1ZTwvcD5cbiAgICAgICAgICAgIDxoMiBpZD1cInNpbXVsYXRpb24taXNzdWUtdGl0bGVcIj57ZW50cnkubmFtZX08L2gyPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWljb24tYnV0dG9uIHNpbXVsYXRpb24tZGFzaGJvYXJkLXRvb2x0aXAtLWJlbG93LWVuZFwiIG9uQ2xpY2s9e29uQ2xvc2V9IGFyaWEtbGFiZWw9XCJDbG9zZSBpc3N1ZSBsb2dnZXJcIiBkYXRhLXRvb2x0aXA9XCJDbG9zZSB3aXRob3V0IHNhdmluZ1wiPlxuICAgICAgICAgICAgPFggYXJpYS1oaWRkZW49XCJ0cnVlXCIgc2l6ZT17MTZ9IHN0cm9rZVdpZHRoPXsyfSAvPlxuICAgICAgICAgIDwvYnV0dG9uPlxuICAgICAgICA8L2Rpdj5cblxuICAgICAgICA8bGFiZWw+XG4gICAgICAgICAgPHNwYW4+VGl0bGU8L3NwYW4+XG4gICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICB2YWx1ZT17dGl0bGV9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRUaXRsZShldmVudC50YXJnZXQudmFsdWUpfVxuICAgICAgICAgICAgcGxhY2Vob2xkZXI9XCJXaGF0IGlzIHdyb25nP1wiXG4gICAgICAgICAgICByZXF1aXJlZFxuICAgICAgICAgIC8+XG4gICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgPGxhYmVsPlxuICAgICAgICAgIDxzcGFuPlNldmVyaXR5PC9zcGFuPlxuICAgICAgICAgIDxzZWxlY3QgdmFsdWU9e3NldmVyaXR5fSBvbkNoYW5nZT17KGV2ZW50KSA9PiBzZXRTZXZlcml0eShldmVudC50YXJnZXQudmFsdWUpfT5cbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJsb3dcIj5Mb3c8L29wdGlvbj5cbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJtZWRpdW1cIj5NZWRpdW08L29wdGlvbj5cbiAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJoaWdoXCI+SGlnaDwvb3B0aW9uPlxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImJsb2NrZXJcIj5CbG9ja2VyPC9vcHRpb24+XG4gICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgPGxhYmVsPlxuICAgICAgICAgIDxzcGFuPk5vdGU8L3NwYW4+XG4gICAgICAgICAgPHRleHRhcmVhXG4gICAgICAgICAgICB2YWx1ZT17bm90ZX1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHNldE5vdGUoZXZlbnQudGFyZ2V0LnZhbHVlKX1cbiAgICAgICAgICAgIHBsYWNlaG9sZGVyPVwiT2JzZXJ2ZWQgYmVoYXZpb3IsIGJyb3dzZXIsIHZpZXdwb3J0LCBvciBwcm9tb3Rpb24gY29uY2Vybi5cIlxuICAgICAgICAgICAgcm93cz1cIjVcIlxuICAgICAgICAgIC8+XG4gICAgICAgIDwvbGFiZWw+XG5cbiAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJzaW11bGF0aW9uLWRhc2hib2FyZC1tb2RhbF9fYWN0aW9uc1wiPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzTmFtZT1cInNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbiBzaW11bGF0aW9uLWRhc2hib2FyZC1idXR0b24tLWdob3N0XCIgb25DbGljaz17b25DbG9zZX0+Q2FuY2VsPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwic3VibWl0XCIgY2xhc3NOYW1lPVwic2ltdWxhdGlvbi1kYXNoYm9hcmQtYnV0dG9uIHNpbXVsYXRpb24tZGFzaGJvYXJkLWJ1dHRvbi0tcHJpbWFyeVwiPlNhdmUgaXNzdWU8L2J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Zvcm0+XG4gICAgPC9kaXY+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL3NpbXVsYXRpb24tbGF1bmNocGFkL0lzc3VlUGFuZWwuanN4In0=