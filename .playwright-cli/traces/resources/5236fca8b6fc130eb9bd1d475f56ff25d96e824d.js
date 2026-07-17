import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/components/SiteFooter.jsx");import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport1_react from "/node_modules/.vite/deps/react.js?v=6e8fde4d"; const useEffect = __vite__cjsImport1_react["useEffect"]; const useState = __vite__cjsImport1_react["useState"];
import homeContent from "/@id/__x00__virtual:abs-content/home";
const SOCIAL_ICON_BY_KEY = Object.freeze({
  appleMusic: "ti-brand-apple",
  linkedin: "ti-brand-linkedin"
});
const SOCIAL_LINKS = Object.entries(homeContent.socials.items).filter(([key, item]) => SOCIAL_ICON_BY_KEY[key] && item?.url).map(_c = ([key, item]) => ({
  href: item.url,
  label: item.ariaLabel || item.screenReaderText || key,
  screenReaderText: item.screenReaderText || item.ariaLabel || key,
  icon: SOCIAL_ICON_BY_KEY[key]
}));
_c2 = SOCIAL_LINKS;
const EDGE_CAPTION = [homeContent.edge.tagline, homeContent.edge.copyright].filter(Boolean).join(" ");
const LONDON_TIME_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
  hour12: true
});
function getLondonTime() {
  return LONDON_TIME_FORMAT.format(/* @__PURE__ */ new Date()).toUpperCase();
}
export function SiteFooter({ variant = "standard" }) {
  _s();
  const showsEdgeCaption = variant !== "portfolio";
  const [londonTime, setLondonTime] = useState(getLondonTime);
  useEffect(() => {
    const update = () => setLondonTime(getLondonTime());
    update();
    const intervalId = window.setInterval(update, 1e3);
    return () => window.clearInterval(intervalId);
  }, []);
  return /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "footer",
      {
        className: "ui-bottom portfolio-footer",
        "data-portfolio-ui": true,
        children: /* @__PURE__ */ jsxDEV("div", { className: "ui-meta-row", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "ui-meta-left", children: /* @__PURE__ */ jsxDEV(
            "div",
            {
              id: "social-links",
              className: "footer_icon-group",
              role: "group",
              "aria-label": homeContent.socials.ariaLabel,
              children: SOCIAL_LINKS.map(
                ({ href, label, screenReaderText, icon }) => /* @__PURE__ */ jsxDEV(
                  "a",
                  {
                    href,
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "footer_icon-link w-inline-block abs-icon-btn",
                    "aria-label": label,
                    children: [
                      /* @__PURE__ */ jsxDEV("i", { className: `ti ${icon}`, "aria-hidden": "true" }, void 0, false, {
                        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                        lineNumber: 70,
                        columnNumber: 19
                      }, this),
                      /* @__PURE__ */ jsxDEV("span", { className: "screen-reader", children: screenReaderText }, void 0, false, {
                        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                        lineNumber: 71,
                        columnNumber: 19
                      }, this)
                    ]
                  },
                  label,
                  true,
                  {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                    lineNumber: 62,
                    columnNumber: 15
                  },
                  this
                )
              )
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
              lineNumber: 55,
              columnNumber: 13
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
            lineNumber: 54,
            columnNumber: 11
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "ui-meta-right", children: /* @__PURE__ */ jsxDEV(
            "div",
            {
              id: "site-year",
              className: "caption meta-caption abs-meta-btn",
              "aria-label": "London local time",
              children: /* @__PURE__ */ jsxDEV("span", { className: "meta-stack", children: [
                /* @__PURE__ */ jsxDEV("span", { className: "meta-location", children: [
                  /* @__PURE__ */ jsxDEV("strong", { className: "location-name", children: "London" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                    lineNumber: 85,
                    columnNumber: 19
                  }, this),
                  /* @__PURE__ */ jsxDEV("span", { className: "meta-separator", "aria-hidden": "true", children: "·" }, void 0, false, {
                    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                    lineNumber: 86,
                    columnNumber: 19
                  }, this)
                ] }, void 0, true, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                  lineNumber: 84,
                  columnNumber: 17
                }, this),
                /* @__PURE__ */ jsxDEV("time", { id: "time-display", children: londonTime }, void 0, false, {
                  fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                  lineNumber: 88,
                  columnNumber: 17
                }, this)
              ] }, void 0, true, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
                lineNumber: 83,
                columnNumber: 15
              }, this)
            },
            void 0,
            false,
            {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
              lineNumber: 78,
              columnNumber: 13
            },
            this
          ) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
            lineNumber: 77,
            columnNumber: 11
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
          lineNumber: 53,
          columnNumber: 9
        }, this)
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
        lineNumber: 49,
        columnNumber: 7
      },
      this
    ),
    showsEdgeCaption ? /* @__PURE__ */ jsxDEV(
      "div",
      {
        id: "edge-caption",
        className: "edge-caption",
        role: "status",
        "aria-live": "polite",
        "aria-atomic": "true",
        children: /* @__PURE__ */ jsxDEV(
          "span",
          {
            id: "edge-caption-tagline",
            className: "edge-caption__line edge-caption__line--tagline",
            children: EDGE_CAPTION
          },
          void 0,
          false,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
            lineNumber: 102,
            columnNumber: 11
          },
          this
        )
      },
      void 0,
      false,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
        lineNumber: 95,
        columnNumber: 7
      },
      this
    ) : null
  ] }, void 0, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx",
    lineNumber: 48,
    columnNumber: 5
  }, this);
}
_s(SiteFooter, "60eWP+OHW+mZ/AwTDmWC/KPjnfM=");
_c3 = SiteFooter;
var _c, _c2, _c3;
$RefreshReg$(_c, "SOCIAL_LINKS$Object.entries(homeContent.socials.items)\n  .filter(([key, item]) => SOCIAL_ICON_BY_KEY[key] && item?.url)\n  .map");
$RefreshReg$(_c2, "SOCIAL_LINKS");
$RefreshReg$(_c3, "SiteFooter");
import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== "undefined" && self instanceof WorkerGlobalScope;
if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react can't detect preamble. Something is wrong."
    );
  }
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}
function $RefreshReg$(type, id) {
  return RefreshRuntime.register(type, "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/components/SiteFooter.jsx " + id);
}
function $RefreshSig$() {
  return RefreshRuntime.createSignatureFunctionForTransform();
}

//# sourceMappingURL=data:application/json;base64,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QUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFhQSxJQUNFO0FBQUEsT0E3RE47QUFBQTtBQUFBO0FBQUE7QUFBQSxTQThEQTtBQUVKO0FBQUNvQixHQTVFZUYsWUFBVTtBQUFBLE1BQVZBO0FBQVUsSUFBQXpCLElBQUFNLEtBQUE4QjtBQUFBLGFBQUFwQyxJQUFBO0FBQUEsYUFBQU0sS0FBQTtBQUFBLGFBQUE4QixLQUFBIiwibmFtZXMiOlsidXNlRWZmZWN0IiwidXNlU3RhdGUiLCJob21lQ29udGVudCIsIlNPQ0lBTF9JQ09OX0JZX0tFWSIsIk9iamVjdCIsImZyZWV6ZSIsImFwcGxlTXVzaWMiLCJsaW5rZWRpbiIsIlNPQ0lBTF9MSU5LUyIsImVudHJpZXMiLCJzb2NpYWxzIiwiaXRlbXMiLCJmaWx0ZXIiLCJrZXkiLCJpdGVtIiwidXJsIiwibWFwIiwiX2MiLCJocmVmIiwibGFiZWwiLCJhcmlhTGFiZWwiLCJzY3JlZW5SZWFkZXJUZXh0IiwiaWNvbiIsIl9jMiIsIkVER0VfQ0FQVElPTiIsImVkZ2UiLCJ0YWdsaW5lIiwiY29weXJpZ2h0IiwiQm9vbGVhbiIsImpvaW4iLCJMT05ET05fVElNRV9GT1JNQVQiLCJJbnRsIiwiRGF0ZVRpbWVGb3JtYXQiLCJ0aW1lWm9uZSIsImhvdXIiLCJtaW51dGUiLCJzZWNvbmQiLCJob3VyMTIiLCJnZXRMb25kb25UaW1lIiwiZm9ybWF0IiwiRGF0ZSIsInRvVXBwZXJDYXNlIiwiU2l0ZUZvb3RlciIsInZhcmlhbnQiLCJfcyIsInNob3dzRWRnZUNhcHRpb24iLCJsb25kb25UaW1lIiwic2V0TG9uZG9uVGltZSIsInVwZGF0ZSIsImludGVydmFsSWQiLCJ3aW5kb3ciLCJzZXRJbnRlcnZhbCIsImNsZWFySW50ZXJ2YWwiLCJfYzMiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZXMiOlsiU2l0ZUZvb3Rlci5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VTdGF0ZSB9IGZyb20gJ3JlYWN0JztcbmltcG9ydCBob21lQ29udGVudCBmcm9tICd2aXJ0dWFsOmFicy1jb250ZW50L2hvbWUnO1xuXG4vKipcbiAqIFNpdGVGb290ZXIg4oCTIHNoYXJlZCBmb290ZXIgKyBlZGdlIGNhcHRpb24gZm9yIGhvbWUsIHBvcnRmb2xpbywgYW5kIENWLlxuICogUmVuZGVyZWQgYnkgU3R1ZGlvU2hlbGwgYXMgdGhlIHNoYXJlZCBzaXRlIGZvb3Rlci5cbiAqL1xuXG5jb25zdCBTT0NJQUxfSUNPTl9CWV9LRVkgPSBPYmplY3QuZnJlZXplKHtcbiAgYXBwbGVNdXNpYzogJ3RpLWJyYW5kLWFwcGxlJyxcbiAgbGlua2VkaW46ICd0aS1icmFuZC1saW5rZWRpbicsXG59KTtcbmNvbnN0IFNPQ0lBTF9MSU5LUyA9IE9iamVjdC5lbnRyaWVzKGhvbWVDb250ZW50LnNvY2lhbHMuaXRlbXMpXG4gIC5maWx0ZXIoKFtrZXksIGl0ZW1dKSA9PiBTT0NJQUxfSUNPTl9CWV9LRVlba2V5XSAmJiBpdGVtPy51cmwpXG4gIC5tYXAoKFtrZXksIGl0ZW1dKSA9PiAoe1xuICAgIGhyZWY6IGl0ZW0udXJsLFxuICAgIGxhYmVsOiBpdGVtLmFyaWFMYWJlbCB8fCBpdGVtLnNjcmVlblJlYWRlclRleHQgfHwga2V5LFxuICAgIHNjcmVlblJlYWRlclRleHQ6IGl0ZW0uc2NyZWVuUmVhZGVyVGV4dCB8fCBpdGVtLmFyaWFMYWJlbCB8fCBrZXksXG4gICAgaWNvbjogU09DSUFMX0lDT05fQllfS0VZW2tleV0sXG4gIH0pKTtcbmNvbnN0IEVER0VfQ0FQVElPTiA9IFtob21lQ29udGVudC5lZGdlLnRhZ2xpbmUsIGhvbWVDb250ZW50LmVkZ2UuY29weXJpZ2h0XVxuICAuZmlsdGVyKEJvb2xlYW4pXG4gIC5qb2luKCcgJyk7XG5jb25zdCBMT05ET05fVElNRV9GT1JNQVQgPSBuZXcgSW50bC5EYXRlVGltZUZvcm1hdCgnZW4tR0InLCB7XG4gIHRpbWVab25lOiAnRXVyb3BlL0xvbmRvbicsXG4gIGhvdXI6ICdudW1lcmljJyxcbiAgbWludXRlOiAnMi1kaWdpdCcsXG4gIHNlY29uZDogJzItZGlnaXQnLFxuICBob3VyMTI6IHRydWUsXG59KTtcblxuZnVuY3Rpb24gZ2V0TG9uZG9uVGltZSgpIHtcbiAgcmV0dXJuIExPTkRPTl9USU1FX0ZPUk1BVC5mb3JtYXQobmV3IERhdGUoKSkudG9VcHBlckNhc2UoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIFNpdGVGb290ZXIoeyB2YXJpYW50ID0gJ3N0YW5kYXJkJyB9KSB7XG4gIGNvbnN0IHNob3dzRWRnZUNhcHRpb24gPSB2YXJpYW50ICE9PSAncG9ydGZvbGlvJztcbiAgY29uc3QgW2xvbmRvblRpbWUsIHNldExvbmRvblRpbWVdID0gdXNlU3RhdGUoZ2V0TG9uZG9uVGltZSk7XG5cbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBjb25zdCB1cGRhdGUgPSAoKSA9PiBzZXRMb25kb25UaW1lKGdldExvbmRvblRpbWUoKSk7XG4gICAgdXBkYXRlKCk7XG4gICAgY29uc3QgaW50ZXJ2YWxJZCA9IHdpbmRvdy5zZXRJbnRlcnZhbCh1cGRhdGUsIDEwMDApO1xuICAgIHJldHVybiAoKSA9PiB3aW5kb3cuY2xlYXJJbnRlcnZhbChpbnRlcnZhbElkKTtcbiAgfSwgW10pO1xuXG4gIHJldHVybiAoXG4gICAgPD5cbiAgICAgIDxmb290ZXJcbiAgICAgICAgY2xhc3NOYW1lPVwidWktYm90dG9tIHBvcnRmb2xpby1mb290ZXJcIlxuICAgICAgICBkYXRhLXBvcnRmb2xpby11aVxuICAgICAgPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cInVpLW1ldGEtcm93XCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ1aS1tZXRhLWxlZnRcIj5cbiAgICAgICAgICAgIDxkaXZcbiAgICAgICAgICAgICAgaWQ9XCJzb2NpYWwtbGlua3NcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJmb290ZXJfaWNvbi1ncm91cFwiXG4gICAgICAgICAgICAgIHJvbGU9XCJncm91cFwiXG4gICAgICAgICAgICAgIGFyaWEtbGFiZWw9e2hvbWVDb250ZW50LnNvY2lhbHMuYXJpYUxhYmVsfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICB7U09DSUFMX0xJTktTLm1hcCgoeyBocmVmLCBsYWJlbCwgc2NyZWVuUmVhZGVyVGV4dCwgaWNvbiB9KSA9PiAoXG4gICAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICAgIGtleT17bGFiZWx9XG4gICAgICAgICAgICAgICAgICBocmVmPXtocmVmfVxuICAgICAgICAgICAgICAgICAgdGFyZ2V0PVwiX2JsYW5rXCJcbiAgICAgICAgICAgICAgICAgIHJlbD1cIm5vb3BlbmVyIG5vcmVmZXJyZXJcIlxuICAgICAgICAgICAgICAgICAgY2xhc3NOYW1lPVwiZm9vdGVyX2ljb24tbGluayB3LWlubGluZS1ibG9jayBhYnMtaWNvbi1idG5cIlxuICAgICAgICAgICAgICAgICAgYXJpYS1sYWJlbD17bGFiZWx9XG4gICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgPGkgY2xhc3NOYW1lPXtgdGkgJHtpY29ufWB9IGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJzY3JlZW4tcmVhZGVyXCI+e3NjcmVlblJlYWRlclRleHR9PC9zcGFuPlxuICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgKSl9XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidWktbWV0YS1yaWdodFwiPlxuICAgICAgICAgICAgPGRpdlxuICAgICAgICAgICAgICBpZD1cInNpdGUteWVhclwiXG4gICAgICAgICAgICAgIGNsYXNzTmFtZT1cImNhcHRpb24gbWV0YS1jYXB0aW9uIGFicy1tZXRhLWJ0blwiXG4gICAgICAgICAgICAgIGFyaWEtbGFiZWw9XCJMb25kb24gbG9jYWwgdGltZVwiXG4gICAgICAgICAgICA+XG4gICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1ldGEtc3RhY2tcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJtZXRhLWxvY2F0aW9uXCI+XG4gICAgICAgICAgICAgICAgICA8c3Ryb25nIGNsYXNzTmFtZT1cImxvY2F0aW9uLW5hbWVcIj5Mb25kb248L3N0cm9uZz5cbiAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cIm1ldGEtc2VwYXJhdG9yXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+wrc8L3NwYW4+XG4gICAgICAgICAgICAgICAgPC9zcGFuPlxuICAgICAgICAgICAgICAgIDx0aW1lIGlkPVwidGltZS1kaXNwbGF5XCI+e2xvbmRvblRpbWV9PC90aW1lPlxuICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Zvb3Rlcj5cbiAgICAgIHtzaG93c0VkZ2VDYXB0aW9uID8gKFxuICAgICAgICA8ZGl2XG4gICAgICAgICAgaWQ9XCJlZGdlLWNhcHRpb25cIlxuICAgICAgICAgIGNsYXNzTmFtZT1cImVkZ2UtY2FwdGlvblwiXG4gICAgICAgICAgcm9sZT1cInN0YXR1c1wiXG4gICAgICAgICAgYXJpYS1saXZlPVwicG9saXRlXCJcbiAgICAgICAgICBhcmlhLWF0b21pYz1cInRydWVcIlxuICAgICAgICA+XG4gICAgICAgICAgPHNwYW5cbiAgICAgICAgICAgIGlkPVwiZWRnZS1jYXB0aW9uLXRhZ2xpbmVcIlxuICAgICAgICAgICAgY2xhc3NOYW1lPVwiZWRnZS1jYXB0aW9uX19saW5lIGVkZ2UtY2FwdGlvbl9fbGluZS0tdGFnbGluZVwiXG4gICAgICAgICAgPlxuICAgICAgICAgICAge0VER0VfQ0FQVElPTn1cbiAgICAgICAgICA8L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgKSA6IG51bGx9XG4gICAgPC8+XG4gICk7XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvY29tcG9uZW50cy9TaXRlRm9vdGVyLmpzeCJ9