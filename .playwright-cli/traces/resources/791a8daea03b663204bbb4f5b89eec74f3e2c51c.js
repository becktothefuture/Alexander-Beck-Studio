import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/routes/contact/ContactRippleSimulation.jsx");import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false};import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useRef = __vite__cjsImport1_react["useRef"]; const useState = __vite__cjsImport1_react["useState"];
import {
  DAILY_FOCUS_DESIGN_SYSTEM_URL,
  loadDailyFocusJson,
  useDailyFocusReducedMotion,
  useDailyFocusTheme
} from "/src/routes/daily-focus/dailyFocusTheme.js";
import {
  CONTACT_RIPPLE_CONFIG_EVENT,
  getContactRippleConfig,
  setContactRippleConfig
} from "/src/routes/contact/contactRippleConfig.js";
import { CONTACT_RIPPLE_BURST_EVENT } from "/src/routes/contact/contactRippleEvents.js";
import { createContactRippleRenderer } from "/src/routes/contact/contactRippleRenderer.js";
import "/src/routes/contact/contact-route.css";
export function ContactRippleSimulation() {
  _s();
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const [designSystem, setDesignSystem] = useState(null);
  const theme = useDailyFocusTheme(designSystem);
  const themeRef = useRef(theme);
  const reducedMotion = useDailyFocusReducedMotion();
  useEffect(() => {
    themeRef.current = theme;
    rendererRef.current?.start();
  }, [theme]);
  useEffect(() => {
    let cancelled = false;
    loadDailyFocusJson(DAILY_FOCUS_DESIGN_SYSTEM_URL, null).then((nextDesignSystem) => {
      if (!cancelled) setDesignSystem(nextDesignSystem);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!designSystem?.contact) return;
    setContactRippleConfig(designSystem.contact);
  }, [designSystem]);
  useEffect(() => {
    if (!import.meta.env.DEV || !designSystem) return void 0;
    let cancelled = false;
    Promise.all(
      [
        import("/src/legacy/modules/ui/panel-popup-manager.js"),
        import("/src/routes/contact/contactRipplePanel.js")
      ]
    ).then(([panelManager, contactPanel]) => {
      if (cancelled) return;
      panelManager.registerDevPanelRoute({
        page: "contact",
        pageLabel: "Contact Us",
        productLabel: "Alexander Beck Studio",
        panelTitle: "Contact Controls",
        pageSectionTitle: "Contact Us View",
        pageSectionIcon: "✉",
        pageHTML: contactPanel.generateContactRipplePanelHTML(),
        setupPageControls: contactPanel.bindContactRipplePanel,
        masterGroupIds: ["audio"],
        footerHint: "<kbd>/</kbd> panel · live apply · save to design JSON",
        syncInitialControlSideEffects: false
      });
    }).catch((error) => {
      console.warn("Contact panel init failed", error);
    });
    return () => {
      cancelled = true;
    };
  }, [designSystem]);
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return void 0;
    const renderer = createContactRippleRenderer({
      canvas,
      stage,
      reducedMotion,
      getTheme: () => themeRef.current,
      getQuietZoneElement: () => document.getElementById("contact-route-content"),
      getConfig: getContactRippleConfig
    });
    rendererRef.current = renderer;
    renderer.start();
    const handleConfigChange = (event) => {
      renderer.updateConfig?.(event.detail?.config || getContactRippleConfig());
    };
    const handleBurstRequest = () => renderer.burst();
    window.addEventListener(CONTACT_RIPPLE_CONFIG_EVENT, handleConfigChange);
    window.addEventListener(CONTACT_RIPPLE_BURST_EVENT, handleBurstRequest);
    return () => {
      window.removeEventListener(CONTACT_RIPPLE_CONFIG_EVENT, handleConfigChange);
      window.removeEventListener(CONTACT_RIPPLE_BURST_EVENT, handleBurstRequest);
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [reducedMotion]);
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      ref: stageRef,
      className: "contact-ripple-stage",
      "data-contact-ripple-stage": true,
      "data-contact-ripple-state": "loading",
      "data-contact-ripple-burst-count": "0",
      "aria-hidden": "true",
      children: /* @__PURE__ */ jsxDEV(
        "canvas",
        {
          ref: canvasRef,
          className: "contact-ripple-canvas",
          "data-contact-ripple-canvas": true,
          "aria-hidden": "true"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRippleSimulation.jsx",
          lineNumber: 117,
          columnNumber: 7
        },
        this
      )
    },
    void 0,
    false,
    {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRippleSimulation.jsx",
      lineNumber: 109,
      columnNumber: 5
    },
    this
  );
}
_s(ContactRippleSimulation, "66aIf/WB8l1Rslztj0mSbmXQiZU=", false, function() {
  return [useDailyFocusTheme, useDailyFocusReducedMotion];
});
_c = ContactRippleSimulation;
var _c;
$RefreshReg$(_c, "ContactRippleSimulation");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRippleSimulation.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRippleSimulation.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/contact/ContactRippleSimulation.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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dGF0ZSIsIkRBSUxZX0ZPQ1VTX0RFU0lHTl9TWVNURU1fVVJMIiwibG9hZERhaWx5Rm9jdXNKc29uIiwidXNlRGFpbHlGb2N1c1JlZHVjZWRNb3Rpb24iLCJ1c2VEYWlseUZvY3VzVGhlbWUiLCJDT05UQUNUX1JJUFBMRV9DT05GSUdfRVZFTlQiLCJnZXRDb250YWN0UmlwcGxlQ29uZmlnIiwic2V0Q29udGFjdFJpcHBsZUNvbmZpZyIsIkNPTlRBQ1RfUklQUExFX0JVUlNUX0VWRU5UIiwiY3JlYXRlQ29udGFjdFJpcHBsZVJlbmRlcmVyIiwiQ29udGFjdFJpcHBsZVNpbXVsYXRpb24iLCJfcyIsInN0YWdlUmVmIiwiY2FudmFzUmVmIiwicmVuZGVyZXJSZWYiLCJkZXNpZ25TeXN0ZW0iLCJzZXREZXNpZ25TeXN0ZW0iLCJ0aGVtZSIsInRoZW1lUmVmIiwicmVkdWNlZE1vdGlvbiIsImN1cnJlbnQiLCJzdGFydCIsImNhbmNlbGxlZCIsInRoZW4iLCJuZXh0RGVzaWduU3lzdGVtIiwiY29udGFjdCIsImltcG9ydCIsImVudiIsIkRFViIsInVuZGVmaW5lZCIsIlByb21pc2UiLCJhbGwiLCJwYW5lbE1hbmFnZXIiLCJjb250YWN0UGFuZWwiLCJyZWdpc3RlckRldlBhbmVsUm91dGUiLCJwYWdlIiwicGFnZUxhYmVsIiwicHJvZHVjdExhYmVsIiwicGFuZWxUaXRsZSIsInBhZ2VTZWN0aW9uVGl0bGUiLCJwYWdlU2VjdGlvbkljb24iLCJwYWdlSFRNTCIsImdlbmVyYXRlQ29udGFjdFJpcHBsZVBhbmVsSFRNTCIsInNldHVwUGFnZUNvbnRyb2xzIiwiYmluZENvbnRhY3RSaXBwbGVQYW5lbCIsIm1hc3Rlckdyb3VwSWRzIiwiZm9vdGVySGludCIsInN5bmNJbml0aWFsQ29udHJvbFNpZGVFZmZlY3RzIiwiY2F0Y2giLCJlcnJvciIsImNvbnNvbGUiLCJ3YXJuIiwiY2FudmFzIiwic3RhZ2UiLCJyZW5kZXJlciIsImdldFRoZW1lIiwiZ2V0UXVpZXRab25lRWxlbWVudCIsImRvY3VtZW50IiwiZ2V0RWxlbWVudEJ5SWQiLCJnZXRDb25maWciLCJoYW5kbGVDb25maWdDaGFuZ2UiLCJldmVudCIsInVwZGF0ZUNvbmZpZyIsImRldGFpbCIsImNvbmZpZyIsImhhbmRsZUJ1cnN0UmVxdWVzdCIsImJ1cnN0Iiwid2luZG93IiwiYWRkRXZlbnRMaXN0ZW5lciIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJkZXN0cm95IiwiX2MiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiQ29udGFjdFJpcHBsZVNpbXVsYXRpb24uanN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCB7XG4gIERBSUxZX0ZPQ1VTX0RFU0lHTl9TWVNURU1fVVJMLFxuICBsb2FkRGFpbHlGb2N1c0pzb24sXG4gIHVzZURhaWx5Rm9jdXNSZWR1Y2VkTW90aW9uLFxuICB1c2VEYWlseUZvY3VzVGhlbWUsXG59IGZyb20gJy4uL2RhaWx5LWZvY3VzL2RhaWx5Rm9jdXNUaGVtZS5qcyc7XG5pbXBvcnQge1xuICBDT05UQUNUX1JJUFBMRV9DT05GSUdfRVZFTlQsXG4gIGdldENvbnRhY3RSaXBwbGVDb25maWcsXG4gIHNldENvbnRhY3RSaXBwbGVDb25maWcsXG59IGZyb20gJy4vY29udGFjdFJpcHBsZUNvbmZpZy5qcyc7XG5pbXBvcnQgeyBDT05UQUNUX1JJUFBMRV9CVVJTVF9FVkVOVCB9IGZyb20gJy4vY29udGFjdFJpcHBsZUV2ZW50cy5qcyc7XG5pbXBvcnQgeyBjcmVhdGVDb250YWN0UmlwcGxlUmVuZGVyZXIgfSBmcm9tICcuL2NvbnRhY3RSaXBwbGVSZW5kZXJlci5qcyc7XG5pbXBvcnQgJy4vY29udGFjdC1yb3V0ZS5jc3MnO1xuXG5leHBvcnQgZnVuY3Rpb24gQ29udGFjdFJpcHBsZVNpbXVsYXRpb24oKSB7XG4gIGNvbnN0IHN0YWdlUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBjYW52YXNSZWYgPSB1c2VSZWYobnVsbCk7XG4gIGNvbnN0IHJlbmRlcmVyUmVmID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBbZGVzaWduU3lzdGVtLCBzZXREZXNpZ25TeXN0ZW1dID0gdXNlU3RhdGUobnVsbCk7XG4gIGNvbnN0IHRoZW1lID0gdXNlRGFpbHlGb2N1c1RoZW1lKGRlc2lnblN5c3RlbSk7XG4gIGNvbnN0IHRoZW1lUmVmID0gdXNlUmVmKHRoZW1lKTtcbiAgY29uc3QgcmVkdWNlZE1vdGlvbiA9IHVzZURhaWx5Rm9jdXNSZWR1Y2VkTW90aW9uKCk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICB0aGVtZVJlZi5jdXJyZW50ID0gdGhlbWU7XG4gICAgcmVuZGVyZXJSZWYuY3VycmVudD8uc3RhcnQoKTtcbiAgfSwgW3RoZW1lXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBsZXQgY2FuY2VsbGVkID0gZmFsc2U7XG4gICAgbG9hZERhaWx5Rm9jdXNKc29uKERBSUxZX0ZPQ1VTX0RFU0lHTl9TWVNURU1fVVJMLCBudWxsKS50aGVuKChuZXh0RGVzaWduU3lzdGVtKSA9PiB7XG4gICAgICBpZiAoIWNhbmNlbGxlZCkgc2V0RGVzaWduU3lzdGVtKG5leHREZXNpZ25TeXN0ZW0pO1xuICAgIH0pO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICBjYW5jZWxsZWQgPSB0cnVlO1xuICAgIH07XG4gIH0sIFtdKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghZGVzaWduU3lzdGVtPy5jb250YWN0KSByZXR1cm47XG4gICAgc2V0Q29udGFjdFJpcHBsZUNvbmZpZyhkZXNpZ25TeXN0ZW0uY29udGFjdCk7XG4gIH0sIFtkZXNpZ25TeXN0ZW1dKTtcblxuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghaW1wb3J0Lm1ldGEuZW52LkRFViB8fCAhZGVzaWduU3lzdGVtKSByZXR1cm4gdW5kZWZpbmVkO1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcblxuICAgIFByb21pc2UuYWxsKFtcbiAgICAgIGltcG9ydCgnLi4vLi4vbGVnYWN5L21vZHVsZXMvdWkvcGFuZWwtcG9wdXAtbWFuYWdlci5qcycpLFxuICAgICAgaW1wb3J0KCcuL2NvbnRhY3RSaXBwbGVQYW5lbC5qcycpLFxuICAgIF0pLnRoZW4oKFtwYW5lbE1hbmFnZXIsIGNvbnRhY3RQYW5lbF0pID0+IHtcbiAgICAgIGlmIChjYW5jZWxsZWQpIHJldHVybjtcbiAgICAgIHBhbmVsTWFuYWdlci5yZWdpc3RlckRldlBhbmVsUm91dGUoe1xuICAgICAgICBwYWdlOiAnY29udGFjdCcsXG4gICAgICAgIHBhZ2VMYWJlbDogJ0NvbnRhY3QgVXMnLFxuICAgICAgICBwcm9kdWN0TGFiZWw6ICdBbGV4YW5kZXIgQmVjayBTdHVkaW8nLFxuICAgICAgICBwYW5lbFRpdGxlOiAnQ29udGFjdCBDb250cm9scycsXG4gICAgICAgIHBhZ2VTZWN0aW9uVGl0bGU6ICdDb250YWN0IFVzIFZpZXcnLFxuICAgICAgICBwYWdlU2VjdGlvbkljb246ICfinIknLFxuICAgICAgICBwYWdlSFRNTDogY29udGFjdFBhbmVsLmdlbmVyYXRlQ29udGFjdFJpcHBsZVBhbmVsSFRNTCgpLFxuICAgICAgICBzZXR1cFBhZ2VDb250cm9sczogY29udGFjdFBhbmVsLmJpbmRDb250YWN0UmlwcGxlUGFuZWwsXG4gICAgICAgIG1hc3Rlckdyb3VwSWRzOiBbJ2F1ZGlvJ10sXG4gICAgICAgIGZvb3RlckhpbnQ6ICc8a2JkPi88L2tiZD4gcGFuZWwgwrcgbGl2ZSBhcHBseSDCtyBzYXZlIHRvIGRlc2lnbiBKU09OJyxcbiAgICAgICAgc3luY0luaXRpYWxDb250cm9sU2lkZUVmZmVjdHM6IGZhbHNlLFxuICAgICAgfSk7XG4gICAgfSkuY2F0Y2goKGVycm9yKSA9PiB7XG4gICAgICBjb25zb2xlLndhcm4oJ0NvbnRhY3QgcGFuZWwgaW5pdCBmYWlsZWQnLCBlcnJvcik7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgY2FuY2VsbGVkID0gdHJ1ZTtcbiAgICB9O1xuICB9LCBbZGVzaWduU3lzdGVtXSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCBjYW52YXMgPSBjYW52YXNSZWYuY3VycmVudDtcbiAgICBjb25zdCBzdGFnZSA9IHN0YWdlUmVmLmN1cnJlbnQ7XG4gICAgaWYgKCFjYW52YXMgfHwgIXN0YWdlKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgY29uc3QgcmVuZGVyZXIgPSBjcmVhdGVDb250YWN0UmlwcGxlUmVuZGVyZXIoe1xuICAgICAgY2FudmFzLFxuICAgICAgc3RhZ2UsXG4gICAgICByZWR1Y2VkTW90aW9uLFxuICAgICAgZ2V0VGhlbWU6ICgpID0+IHRoZW1lUmVmLmN1cnJlbnQsXG4gICAgICBnZXRRdWlldFpvbmVFbGVtZW50OiAoKSA9PiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29udGFjdC1yb3V0ZS1jb250ZW50JyksXG4gICAgICBnZXRDb25maWc6IGdldENvbnRhY3RSaXBwbGVDb25maWcsXG4gICAgfSk7XG4gICAgcmVuZGVyZXJSZWYuY3VycmVudCA9IHJlbmRlcmVyO1xuICAgIHJlbmRlcmVyLnN0YXJ0KCk7XG5cbiAgICBjb25zdCBoYW5kbGVDb25maWdDaGFuZ2UgPSAoZXZlbnQpID0+IHtcbiAgICAgIHJlbmRlcmVyLnVwZGF0ZUNvbmZpZz8uKGV2ZW50LmRldGFpbD8uY29uZmlnIHx8IGdldENvbnRhY3RSaXBwbGVDb25maWcoKSk7XG4gICAgfTtcbiAgICBjb25zdCBoYW5kbGVCdXJzdFJlcXVlc3QgPSAoKSA9PiByZW5kZXJlci5idXJzdCgpO1xuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKENPTlRBQ1RfUklQUExFX0NPTkZJR19FVkVOVCwgaGFuZGxlQ29uZmlnQ2hhbmdlKTtcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihDT05UQUNUX1JJUFBMRV9CVVJTVF9FVkVOVCwgaGFuZGxlQnVyc3RSZXF1ZXN0KTtcblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihDT05UQUNUX1JJUFBMRV9DT05GSUdfRVZFTlQsIGhhbmRsZUNvbmZpZ0NoYW5nZSk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihDT05UQUNUX1JJUFBMRV9CVVJTVF9FVkVOVCwgaGFuZGxlQnVyc3RSZXF1ZXN0KTtcbiAgICAgIHJlbmRlcmVyLmRlc3Ryb3koKTtcbiAgICAgIGlmIChyZW5kZXJlclJlZi5jdXJyZW50ID09PSByZW5kZXJlcikgcmVuZGVyZXJSZWYuY3VycmVudCA9IG51bGw7XG4gICAgfTtcbiAgfSwgW3JlZHVjZWRNb3Rpb25dKTtcblxuICByZXR1cm4gKFxuICAgIDxkaXZcbiAgICAgIHJlZj17c3RhZ2VSZWZ9XG4gICAgICBjbGFzc05hbWU9XCJjb250YWN0LXJpcHBsZS1zdGFnZVwiXG4gICAgICBkYXRhLWNvbnRhY3QtcmlwcGxlLXN0YWdlXG4gICAgICBkYXRhLWNvbnRhY3QtcmlwcGxlLXN0YXRlPVwibG9hZGluZ1wiXG4gICAgICBkYXRhLWNvbnRhY3QtcmlwcGxlLWJ1cnN0LWNvdW50PVwiMFwiXG4gICAgICBhcmlhLWhpZGRlbj1cInRydWVcIlxuICAgID5cbiAgICAgIDxjYW52YXNcbiAgICAgICAgcmVmPXtjYW52YXNSZWZ9XG4gICAgICAgIGNsYXNzTmFtZT1cImNvbnRhY3QtcmlwcGxlLWNhbnZhc1wiXG4gICAgICAgIGRhdGEtY29udGFjdC1yaXBwbGUtY2FudmFzXG4gICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAvPlxuICAgIDwvZGl2PlxuICApO1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9jb250YWN0L0NvbnRhY3RSaXBwbGVTaW11bGF0aW9uLmpzeCJ9