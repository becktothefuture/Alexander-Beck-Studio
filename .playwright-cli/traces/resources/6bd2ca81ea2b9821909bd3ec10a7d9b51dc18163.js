import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import homeContent from "/@id/__x00__virtual:abs-content/home";
import { trySpaNavigate } from "/src/lib/spa-navigation.js";
export const HOME_ROUTE_RUNTIME = {
  exportName: "bootstrapHomePage",
  loadModule: () => import("/src/legacy/main.js")
};
function renderLegendItem(item) {
  return /* @__PURE__ */ jsxDEV("div", { className: "w-layout-hflex legend__item", "data-tooltip": item.tooltip, "data-route-enter": "legend", children: [
    /* @__PURE__ */ jsxDEV("div", { className: `circle ${item.colorClass}`, "aria-hidden": "true" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
      lineNumber: 12,
      columnNumber: 7
    }, this),
    /* @__PURE__ */ jsxDEV("span", { children: item.label }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
      lineNumber: 13,
      columnNumber: 7
    }, this)
  ] }, item.label, true, {
    fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
    lineNumber: 11,
    columnNumber: 5
  }, this);
}
export function getHomeRouteView() {
  const philosophyLink = homeContent.philosophy.link;
  const handleContactClick = (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
      return;
    }
    event.preventDefault();
    if (!trySpaNavigate("/contact.html")) {
      window.location.assign("/contact.html");
    }
  };
  return {
    bodyClass: "body",
    contentRenderKey: "home-shell",
    studioWindowClassName: "ball-simulation w-embed",
    simulationLayer: /* @__PURE__ */ jsxDEV("canvas", { id: "c", className: "ball-canvas-layer", "aria-label": "Bouncy balls", role: "img", draggable: "false" }, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
      lineNumber: 42,
      columnNumber: 5
    }, this),
    heroLayer: /* @__PURE__ */ jsxDEV(
      "h1",
      {
        id: "hero-title",
        className: "hero-title hero-title--canvas-source",
        "data-canvas-title-source": "home",
        "aria-label": "Alexander Beck. Creative. Technologist.",
        children: [
          /* @__PURE__ */ jsxDEV("span", { className: "hero-title__name", "data-route-enter": "identity", "data-route-enter-order": "0", children: "Alexander Beck." }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
            lineNumber: 51,
            columnNumber: 9
          }, this),
          /* @__PURE__ */ jsxDEV("span", { className: "hero-title__role", "data-route-enter": "identity", "data-route-enter-order": "1", children: "Creative. Technologist." }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
            lineNumber: 52,
            columnNumber: 9
          }, this)
        ]
      },
      void 0,
      true,
      {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
        lineNumber: 45,
        columnNumber: 5
      },
      this
    ),
    uiLayer: {
      chrome: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", children: [
        /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "ui-top-left", children: [
            /* @__PURE__ */ jsxDEV("nav", { id: "expertise-legend", className: "legend", "aria-label": homeContent.legend.ariaLabel, children: homeContent.legend.items.map(renderLegendItem) }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
              lineNumber: 60,
              columnNumber: 15
            }, this),
            /* @__PURE__ */ jsxDEV("div", { id: "legend-tooltip-output", className: "legend-tooltip-output", "aria-hidden": "true" }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
              lineNumber: 63,
              columnNumber: 15
            }, this)
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
            lineNumber: 59,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "ui-top-right", children: /* @__PURE__ */ jsxDEV("blockquote", { className: "decorative-script", "data-route-enter": "context", children: /* @__PURE__ */ jsxDEV("p", { children: [
            /* @__PURE__ */ jsxDEV("span", { className: "home-philosophy-copy home-philosophy-copy--full", children: homeContent.philosophy.textBeforeLink }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
              lineNumber: 69,
              columnNumber: 19
            }, this),
            /* @__PURE__ */ jsxDEV("span", { className: "home-philosophy-copy home-philosophy-copy--mobile", children: homeContent.philosophy.mobileTextBeforeLink || homeContent.philosophy.textBeforeLink }, void 0, false, {
              fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
              lineNumber: 72,
              columnNumber: 19
            }, this),
            " ",
            /* @__PURE__ */ jsxDEV(
              "a",
              {
                id: "contact-route-inline",
                href: "/contact.html",
                onClick: handleContactClick,
                children: philosophyLink.text
              },
              void 0,
              false,
              {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
                lineNumber: 76,
                columnNumber: 19
              },
              this
            )
          ] }, void 0, true, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
            lineNumber: 68,
            columnNumber: 17
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
            lineNumber: 67,
            columnNumber: 15
          }, this) }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
            lineNumber: 66,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
          lineNumber: 58,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("div", { id: "top-elements-soundRow", className: "ui-top-soundRow" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
          lineNumber: 88,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
        lineNumber: 57,
        columnNumber: 7
      }, this),
      secondary: /* @__PURE__ */ jsxDEV(Fragment, { children: /* @__PURE__ */ jsxDEV("main", { className: "ui-center" }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
        lineNumber: 93,
        columnNumber: 11
      }, this) }, void 0, false, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/home/HomeRoute.jsx",
        lineNumber: 92,
        columnNumber: 7
      }, this)
    }
  };
}

//# sourceMappingURL=data:application/json;base64,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V0FBVzBCLHdCQUF3QnRDLFlBQVlZLFdBQVd5QixrQkFEekU7QUFBQTtBQUFBO0FBQUE7QUFBQSxtQkFFQTtBQUFBLFlBQ0M7QUFBQSxZQUNEO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQ0MsSUFBRztBQUFBLGdCQUNILE1BQUs7QUFBQSxnQkFDTCxTQUFTdkI7QUFBQUEsZ0JBRVJILHlCQUFlNEI7QUFBQUE7QUFBQUEsY0FMbEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFlBTUE7QUFBQSxlQWRGO0FBQUE7QUFBQTtBQUFBO0FBQUEsaUJBZUEsS0FoQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFpQkEsS0FsQkY7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQkFtQkE7QUFBQSxhQTNCRjtBQUFBO0FBQUE7QUFBQTtBQUFBLGVBNEJBO0FBQUEsUUFFQSx1QkFBQyxTQUFJLElBQUcseUJBQXdCLFdBQVUscUJBQTFDO0FBQUE7QUFBQTtBQUFBO0FBQUEsZUFBMkQ7QUFBQSxXQS9CN0Q7QUFBQTtBQUFBO0FBQUE7QUFBQSxhQWdDQTtBQUFBLE1BRUZDLFdBQ0UsbUNBQ0UsaUNBQUMsVUFBSyxXQUFVLGVBQWhCO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFDQSxLQUZGO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFHQTtBQUFBLElBRUo7QUFBQSxFQUNGO0FBQ0YiLCJuYW1lcyI6WyJob21lQ29udGVudCIsInRyeVNwYU5hdmlnYXRlIiwiSE9NRV9ST1VURV9SVU5USU1FIiwiZXhwb3J0TmFtZSIsImxvYWRNb2R1bGUiLCJyZW5kZXJMZWdlbmRJdGVtIiwiaXRlbSIsInRvb2x0aXAiLCJjb2xvckNsYXNzIiwibGFiZWwiLCJnZXRIb21lUm91dGVWaWV3IiwicGhpbG9zb3BoeUxpbmsiLCJwaGlsb3NvcGh5IiwibGluayIsImhhbmRsZUNvbnRhY3RDbGljayIsImV2ZW50IiwiZGVmYXVsdFByZXZlbnRlZCIsImJ1dHRvbiIsIm1ldGFLZXkiLCJhbHRLZXkiLCJjdHJsS2V5Iiwic2hpZnRLZXkiLCJwcmV2ZW50RGVmYXVsdCIsIndpbmRvdyIsImxvY2F0aW9uIiwiYXNzaWduIiwiYm9keUNsYXNzIiwiY29udGVudFJlbmRlcktleSIsInN0dWRpb1dpbmRvd0NsYXNzTmFtZSIsInNpbXVsYXRpb25MYXllciIsImhlcm9MYXllciIsInVpTGF5ZXIiLCJjaHJvbWUiLCJsZWdlbmQiLCJhcmlhTGFiZWwiLCJpdGVtcyIsIm1hcCIsInRleHRCZWZvcmVMaW5rIiwibW9iaWxlVGV4dEJlZm9yZUxpbmsiLCJ0ZXh0Iiwic2Vjb25kYXJ5Il0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VzIjpbIkhvbWVSb3V0ZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGhvbWVDb250ZW50IGZyb20gJ3ZpcnR1YWw6YWJzLWNvbnRlbnQvaG9tZSc7XG5pbXBvcnQgeyB0cnlTcGFOYXZpZ2F0ZSB9IGZyb20gJy4uLy4uL2xpYi9zcGEtbmF2aWdhdGlvbi5qcyc7XG5cbmV4cG9ydCBjb25zdCBIT01FX1JPVVRFX1JVTlRJTUUgPSB7XG4gIGV4cG9ydE5hbWU6ICdib290c3RyYXBIb21lUGFnZScsXG4gIGxvYWRNb2R1bGU6ICgpID0+IGltcG9ydCgnLi4vLi4vbGVnYWN5L21haW4uanMnKVxufTtcblxuZnVuY3Rpb24gcmVuZGVyTGVnZW5kSXRlbShpdGVtKSB7XG4gIHJldHVybiAoXG4gICAgPGRpdiBrZXk9e2l0ZW0ubGFiZWx9IGNsYXNzTmFtZT1cInctbGF5b3V0LWhmbGV4IGxlZ2VuZF9faXRlbVwiIGRhdGEtdG9vbHRpcD17aXRlbS50b29sdGlwfSBkYXRhLXJvdXRlLWVudGVyPVwibGVnZW5kXCI+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT17YGNpcmNsZSAke2l0ZW0uY29sb3JDbGFzc31gfSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgPHNwYW4+e2l0ZW0ubGFiZWx9PC9zcGFuPlxuICAgIDwvZGl2PlxuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0SG9tZVJvdXRlVmlldygpIHtcbiAgY29uc3QgcGhpbG9zb3BoeUxpbmsgPSBob21lQ29udGVudC5waGlsb3NvcGh5Lmxpbms7XG4gIGNvbnN0IGhhbmRsZUNvbnRhY3RDbGljayA9IChldmVudCkgPT4ge1xuICAgIGlmIChcbiAgICAgIGV2ZW50LmRlZmF1bHRQcmV2ZW50ZWRcbiAgICAgIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMFxuICAgICAgfHwgZXZlbnQubWV0YUtleVxuICAgICAgfHwgZXZlbnQuYWx0S2V5XG4gICAgICB8fCBldmVudC5jdHJsS2V5XG4gICAgICB8fCBldmVudC5zaGlmdEtleVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlmICghdHJ5U3BhTmF2aWdhdGUoJy9jb250YWN0Lmh0bWwnKSkge1xuICAgICAgd2luZG93LmxvY2F0aW9uLmFzc2lnbignL2NvbnRhY3QuaHRtbCcpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4ge1xuICAgIGJvZHlDbGFzczogJ2JvZHknLFxuICAgIGNvbnRlbnRSZW5kZXJLZXk6ICdob21lLXNoZWxsJyxcbiAgICBzdHVkaW9XaW5kb3dDbGFzc05hbWU6ICdiYWxsLXNpbXVsYXRpb24gdy1lbWJlZCcsXG4gICAgc2ltdWxhdGlvbkxheWVyOiAoXG4gICAgICA8Y2FudmFzIGlkPVwiY1wiIGNsYXNzTmFtZT1cImJhbGwtY2FudmFzLWxheWVyXCIgYXJpYS1sYWJlbD1cIkJvdW5jeSBiYWxsc1wiIHJvbGU9XCJpbWdcIiBkcmFnZ2FibGU9XCJmYWxzZVwiIC8+XG4gICAgKSxcbiAgICBoZXJvTGF5ZXI6IChcbiAgICAgIDxoMVxuICAgICAgICBpZD1cImhlcm8tdGl0bGVcIlxuICAgICAgICBjbGFzc05hbWU9XCJoZXJvLXRpdGxlIGhlcm8tdGl0bGUtLWNhbnZhcy1zb3VyY2VcIlxuICAgICAgICBkYXRhLWNhbnZhcy10aXRsZS1zb3VyY2U9XCJob21lXCJcbiAgICAgICAgYXJpYS1sYWJlbD1cIkFsZXhhbmRlciBCZWNrLiBDcmVhdGl2ZS4gVGVjaG5vbG9naXN0LlwiXG4gICAgICA+XG4gICAgICAgIDxzcGFuIGNsYXNzTmFtZT1cImhlcm8tdGl0bGVfX25hbWVcIiBkYXRhLXJvdXRlLWVudGVyPVwiaWRlbnRpdHlcIiBkYXRhLXJvdXRlLWVudGVyLW9yZGVyPVwiMFwiPkFsZXhhbmRlciBCZWNrLjwvc3Bhbj5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaGVyby10aXRsZV9fcm9sZVwiIGRhdGEtcm91dGUtZW50ZXI9XCJpZGVudGl0eVwiIGRhdGEtcm91dGUtZW50ZXItb3JkZXI9XCIxXCI+Q3JlYXRpdmUuIFRlY2hub2xvZ2lzdC48L3NwYW4+XG4gICAgICA8L2gxPlxuICAgICksXG4gICAgdWlMYXllcjoge1xuICAgICAgY2hyb21lOiAoXG4gICAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwidWktdG9wXCI+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ1aS10b3AtbWFpblwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ1aS10b3AtbGVmdFwiPlxuICAgICAgICAgICAgICA8bmF2IGlkPVwiZXhwZXJ0aXNlLWxlZ2VuZFwiIGNsYXNzTmFtZT1cImxlZ2VuZFwiIGFyaWEtbGFiZWw9e2hvbWVDb250ZW50LmxlZ2VuZC5hcmlhTGFiZWx9PlxuICAgICAgICAgICAgICAgIHtob21lQ29udGVudC5sZWdlbmQuaXRlbXMubWFwKHJlbmRlckxlZ2VuZEl0ZW0pfVxuICAgICAgICAgICAgICA8L25hdj5cbiAgICAgICAgICAgICAgPGRpdiBpZD1cImxlZ2VuZC10b29sdGlwLW91dHB1dFwiIGNsYXNzTmFtZT1cImxlZ2VuZC10b29sdGlwLW91dHB1dFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgICA8L2Rpdj5cblxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJ1aS10b3AtcmlnaHRcIj5cbiAgICAgICAgICAgICAgPGJsb2NrcXVvdGUgY2xhc3NOYW1lPVwiZGVjb3JhdGl2ZS1zY3JpcHRcIiBkYXRhLXJvdXRlLWVudGVyPVwiY29udGV4dFwiPlxuICAgICAgICAgICAgICAgIDxwPlxuICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaG9tZS1waGlsb3NvcGh5LWNvcHkgaG9tZS1waGlsb3NvcGh5LWNvcHktLWZ1bGxcIj5cbiAgICAgICAgICAgICAgICAgICAge2hvbWVDb250ZW50LnBoaWxvc29waHkudGV4dEJlZm9yZUxpbmt9XG4gICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJob21lLXBoaWxvc29waHktY29weSBob21lLXBoaWxvc29waHktY29weS0tbW9iaWxlXCI+XG4gICAgICAgICAgICAgICAgICAgIHtob21lQ29udGVudC5waGlsb3NvcGh5Lm1vYmlsZVRleHRCZWZvcmVMaW5rIHx8IGhvbWVDb250ZW50LnBoaWxvc29waHkudGV4dEJlZm9yZUxpbmt9XG4gICAgICAgICAgICAgICAgICA8L3NwYW4+XG4gICAgICAgICAgICAgICAgICB7JyAnfVxuICAgICAgICAgICAgICAgICAgPGFcbiAgICAgICAgICAgICAgICAgICAgaWQ9XCJjb250YWN0LXJvdXRlLWlubGluZVwiXG4gICAgICAgICAgICAgICAgICAgIGhyZWY9XCIvY29udGFjdC5odG1sXCJcbiAgICAgICAgICAgICAgICAgICAgb25DbGljaz17aGFuZGxlQ29udGFjdENsaWNrfVxuICAgICAgICAgICAgICAgICAgPlxuICAgICAgICAgICAgICAgICAgICB7cGhpbG9zb3BoeUxpbmsudGV4dH1cbiAgICAgICAgICAgICAgICAgIDwvYT5cbiAgICAgICAgICAgICAgICA8L3A+XG4gICAgICAgICAgICAgIDwvYmxvY2txdW90ZT5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZGl2PlxuXG4gICAgICAgICAgPGRpdiBpZD1cInRvcC1lbGVtZW50cy1zb3VuZFJvd1wiIGNsYXNzTmFtZT1cInVpLXRvcC1zb3VuZFJvd1wiIC8+XG4gICAgICAgIDwvaGVhZGVyPlxuICAgICAgKSxcbiAgICAgIHNlY29uZGFyeTogKFxuICAgICAgICA8PlxuICAgICAgICAgIDxtYWluIGNsYXNzTmFtZT1cInVpLWNlbnRlclwiPlxuICAgICAgICAgIDwvbWFpbj5cbiAgICAgICAgPC8+XG4gICAgICApXG4gICAgfVxuICB9O1xufVxuIl0sImZpbGUiOiIvVXNlcnMvYWxleGFuZGVyYmVjay9Qcm9qZWN0cy1jb2RlL0FsZXhhbmRlciBCZWNrIFN0dWRpbyBXZWJzaXRlL3JlYWN0LWFwcC9hcHAvc3JjL3JvdXRlcy9ob21lL0hvbWVSb3V0ZS5qc3gifQ==