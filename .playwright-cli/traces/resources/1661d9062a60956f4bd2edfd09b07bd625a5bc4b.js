import __vite__cjsImport0_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=6e8fde4d"; const Fragment = __vite__cjsImport0_react_jsxDevRuntime["Fragment"]; const jsxDEV = __vite__cjsImport0_react_jsxDevRuntime["jsxDEV"];
import homeContent from "/@id/__x00__virtual:abs-content/home";
import { PortfolioGateRoute } from "/src/routes/portfolio/PortfolioGateRoute.jsx?t=1784282378578";
export const PORTFOLIO_ROUTE_RUNTIME = {
  exportName: "bootstrapPortfolio",
  loadModule: () => import("/src/legacy/modules/portfolio/app.js?t=1784282327552").then(async (module) => {
    await module.preloadPortfolioRoute?.();
    return module;
  })
};
export function getPortfolioRouteView(canonicalHref, routeState = {}) {
  void canonicalHref;
  void routeState;
  const portfolioBlurb = homeContent.portfolio?.blurb || "From early concepts to shipped websites, apps, tools, and platforms.";
  const portfolioHeroEyebrow = homeContent.portfolio?.heroEyebrow || "Alexander Beck";
  const portfolioHeroLines = Array.isArray(homeContent.portfolio?.heroLines) ? homeContent.portfolio.heroLines : [
    "Selected design work."
  ];
  const portfolioHeroAria = [portfolioHeroEyebrow, ...portfolioHeroLines].filter(Boolean).join(" ");
  const portfolioHeroSecondary = portfolioHeroLines[1] || "";
  return {
    bodyClass: "body portfolio-page",
    footerVariant: "portfolio",
    studioWindowClassName: "portfolio-simulation w-embed",
    windowOverlayContent: /* @__PURE__ */ jsxDEV(PortfolioGateRoute, {}, void 0, false, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
      lineNumber: 31,
      columnNumber: 27
    }, this),
    simulationLayer: /* @__PURE__ */ jsxDEV("div", { className: "portfolio-slider-layer", children: [
      /* @__PURE__ */ jsxDEV(
        "canvas",
        {
          className: "portfolio-speed-field-canvas",
          "aria-hidden": "true",
          draggable: "false"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 34,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "canvas",
        {
          id: "c",
          className: "portfolio-pit-canvas portfolio-scroll-canvas",
          "aria-hidden": "true",
          draggable: "false"
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 39,
          columnNumber: 9
        },
        this
      ),
      /* @__PURE__ */ jsxDEV(
        "div",
        {
          id: "portfolioProjectMount",
          className: "portfolio-project-mount portfolio-deck-mount",
          "aria-label": "Portfolio projects",
          "data-intro-title": portfolioHeroLines[0],
          "data-intro-body": portfolioBlurb
        },
        void 0,
        false,
        {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 45,
          columnNumber: 9
        },
        this
      )
    ] }, void 0, true, {
      fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
      lineNumber: 33,
      columnNumber: 5
    }, this),
    uiLayer: {
      chrome: /* @__PURE__ */ jsxDEV("header", { className: "ui-top", "data-portfolio-ui": true, children: [
        /* @__PURE__ */ jsxDEV("div", { className: "ui-top-main route-topbar portfolio-topbar", children: [
          /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__left", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
            lineNumber: 58,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__center", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
            lineNumber: 59,
            columnNumber: 13
          }, this),
          /* @__PURE__ */ jsxDEV("div", { className: "route-topbar__right ui-top-right", "aria-hidden": "true" }, void 0, false, {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
            lineNumber: 60,
            columnNumber: 13
          }, this)
        ] }, void 0, true, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 57,
          columnNumber: 13
        }, this),
        /* @__PURE__ */ jsxDEV("div", { id: "top-elements-soundRow", className: "ui-top-soundRow" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 63,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
        lineNumber: 56,
        columnNumber: 7
      }, this),
      secondary: /* @__PURE__ */ jsxDEV(Fragment, { children: [
        /* @__PURE__ */ jsxDEV("div", { className: "portfolio-route-title-ui", children: /* @__PURE__ */ jsxDEV(
          "h2",
          {
            id: "hero-title",
            className: "hero-title hero-title--portfolio",
            "aria-label": portfolioHeroAria,
            children: [
              /* @__PURE__ */ jsxDEV("span", { className: "hero-title__eyebrow", "data-route-enter": "identity", "data-route-enter-order": "0", children: portfolioHeroEyebrow }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
                lineNumber: 74,
                columnNumber: 15
              }, this),
              /* @__PURE__ */ jsxDEV("span", { className: "hero-title__line", "data-route-enter": "identity", "data-route-enter-order": "1", children: portfolioHeroLines[0] }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
                lineNumber: 75,
                columnNumber: 15
              }, this),
              portfolioHeroSecondary ? /* @__PURE__ */ jsxDEV("span", { className: "hero-title__line hero-title__line--secondary", "data-route-enter": "identity", "data-route-enter-order": "2", children: portfolioHeroSecondary }, void 0, false, {
                fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
                lineNumber: 77,
                columnNumber: 13
              }, this) : null
            ]
          },
          void 0,
          true,
          {
            fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
            lineNumber: 69,
            columnNumber: 13
          },
          this
        ) }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 68,
          columnNumber: 11
        }, this),
        /* @__PURE__ */ jsxDEV("main", { className: "ui-center-spacer", "aria-hidden": "true" }, void 0, false, {
          fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
          lineNumber: 81,
          columnNumber: 11
        }, this)
      ] }, void 0, true, {
        fileName: "/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website/react-app/app/src/routes/portfolio/PortfolioRoute.jsx",
        lineNumber: 67,
        columnNumber: 7
      }, this)
    }
  };
}

//# sourceMappingURL=data:application/json;base64,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WUFFWjtBQUFBLHFDQUFDLFVBQUssV0FBVSx1QkFBc0Isb0JBQWlCLFlBQVcsMEJBQXVCLEtBQUtOLGtDQUE5RjtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUFtSDtBQUFBLGNBQ25ILHVCQUFDLFVBQUssV0FBVSxvQkFBbUIsb0JBQWlCLFlBQVcsMEJBQXVCLEtBQUtFLDZCQUFtQixDQUFDLEtBQS9HO0FBQUE7QUFBQTtBQUFBO0FBQUEscUJBQWlIO0FBQUEsY0FDaEhRLHlCQUNDLHVCQUFDLFVBQUssV0FBVSxnREFBK0Msb0JBQWlCLFlBQVcsMEJBQXVCLEtBQUtBLG9DQUF2SDtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQUE4SSxJQUM1STtBQUFBO0FBQUE7QUFBQSxVQVROO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxRQVVBLEtBWEY7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQVlBO0FBQUEsUUFDQSx1QkFBQyxVQUFLLFdBQVUsb0JBQW1CLGVBQVksVUFBL0M7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQUFxRDtBQUFBLFdBZHZEO0FBQUE7QUFBQTtBQUFBO0FBQUEsYUFlQTtBQUFBLElBRUo7QUFBQSxFQUNGO0FBQ0YiLCJuYW1lcyI6WyJob21lQ29udGVudCIsIlBvcnRmb2xpb0dhdGVSb3V0ZSIsIlBPUlRGT0xJT19ST1VURV9SVU5USU1FIiwiZXhwb3J0TmFtZSIsImxvYWRNb2R1bGUiLCJ0aGVuIiwibW9kdWxlIiwicHJlbG9hZFBvcnRmb2xpb1JvdXRlIiwiZ2V0UG9ydGZvbGlvUm91dGVWaWV3IiwiY2Fub25pY2FsSHJlZiIsInJvdXRlU3RhdGUiLCJwb3J0Zm9saW9CbHVyYiIsInBvcnRmb2xpbyIsImJsdXJiIiwicG9ydGZvbGlvSGVyb0V5ZWJyb3ciLCJoZXJvRXllYnJvdyIsInBvcnRmb2xpb0hlcm9MaW5lcyIsIkFycmF5IiwiaXNBcnJheSIsImhlcm9MaW5lcyIsInBvcnRmb2xpb0hlcm9BcmlhIiwiZmlsdGVyIiwiQm9vbGVhbiIsImpvaW4iLCJwb3J0Zm9saW9IZXJvU2Vjb25kYXJ5IiwiYm9keUNsYXNzIiwiZm9vdGVyVmFyaWFudCIsInN0dWRpb1dpbmRvd0NsYXNzTmFtZSIsIndpbmRvd092ZXJsYXlDb250ZW50Iiwic2ltdWxhdGlvbkxheWVyIiwidWlMYXllciIsImNocm9tZSIsInNlY29uZGFyeSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJQb3J0Zm9saW9Sb3V0ZS5qc3giXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGhvbWVDb250ZW50IGZyb20gJ3ZpcnR1YWw6YWJzLWNvbnRlbnQvaG9tZSc7XG5pbXBvcnQgeyBQb3J0Zm9saW9HYXRlUm91dGUgfSBmcm9tICcuL1BvcnRmb2xpb0dhdGVSb3V0ZS5qc3gnO1xuXG5leHBvcnQgY29uc3QgUE9SVEZPTElPX1JPVVRFX1JVTlRJTUUgPSB7XG4gIGV4cG9ydE5hbWU6ICdib290c3RyYXBQb3J0Zm9saW8nLFxuICBsb2FkTW9kdWxlOiAoKSA9PiBpbXBvcnQoJy4uLy4uL2xlZ2FjeS9tb2R1bGVzL3BvcnRmb2xpby9hcHAuanMnKS50aGVuKGFzeW5jIChtb2R1bGUpID0+IHtcbiAgICBhd2FpdCBtb2R1bGUucHJlbG9hZFBvcnRmb2xpb1JvdXRlPy4oKTtcbiAgICByZXR1cm4gbW9kdWxlO1xuICB9KVxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFBvcnRmb2xpb1JvdXRlVmlldyhjYW5vbmljYWxIcmVmLCByb3V0ZVN0YXRlID0ge30pIHtcbiAgdm9pZCBjYW5vbmljYWxIcmVmO1xuICB2b2lkIHJvdXRlU3RhdGU7XG5cbiAgY29uc3QgcG9ydGZvbGlvQmx1cmIgPSBob21lQ29udGVudC5wb3J0Zm9saW8/LmJsdXJiXG4gICAgfHwgJ0Zyb20gZWFybHkgY29uY2VwdHMgdG8gc2hpcHBlZCB3ZWJzaXRlcywgYXBwcywgdG9vbHMsIGFuZCBwbGF0Zm9ybXMuJztcbiAgY29uc3QgcG9ydGZvbGlvSGVyb0V5ZWJyb3cgPSBob21lQ29udGVudC5wb3J0Zm9saW8/Lmhlcm9FeWVicm93IHx8ICdBbGV4YW5kZXIgQmVjayc7XG4gIGNvbnN0IHBvcnRmb2xpb0hlcm9MaW5lcyA9IEFycmF5LmlzQXJyYXkoaG9tZUNvbnRlbnQucG9ydGZvbGlvPy5oZXJvTGluZXMpXG4gICAgPyBob21lQ29udGVudC5wb3J0Zm9saW8uaGVyb0xpbmVzXG4gICAgOiBbXG4gICAgICAgICdTZWxlY3RlZCBkZXNpZ24gd29yay4nXG4gICAgICBdO1xuICBjb25zdCBwb3J0Zm9saW9IZXJvQXJpYSA9IFtwb3J0Zm9saW9IZXJvRXllYnJvdywgLi4ucG9ydGZvbGlvSGVyb0xpbmVzXS5maWx0ZXIoQm9vbGVhbikuam9pbignICcpO1xuICBjb25zdCBwb3J0Zm9saW9IZXJvU2Vjb25kYXJ5ID0gcG9ydGZvbGlvSGVyb0xpbmVzWzFdIHx8ICcnO1xuXG4gIHJldHVybiB7XG4gICAgYm9keUNsYXNzOiAnYm9keSBwb3J0Zm9saW8tcGFnZScsXG4gICAgZm9vdGVyVmFyaWFudDogJ3BvcnRmb2xpbycsXG4gICAgc3R1ZGlvV2luZG93Q2xhc3NOYW1lOiAncG9ydGZvbGlvLXNpbXVsYXRpb24gdy1lbWJlZCcsXG4gICAgd2luZG93T3ZlcmxheUNvbnRlbnQ6IDxQb3J0Zm9saW9HYXRlUm91dGUgLz4sXG4gICAgc2ltdWxhdGlvbkxheWVyOiAoXG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cInBvcnRmb2xpby1zbGlkZXItbGF5ZXJcIj5cbiAgICAgICAgPGNhbnZhc1xuICAgICAgICAgIGNsYXNzTmFtZT1cInBvcnRmb2xpby1zcGVlZC1maWVsZC1jYW52YXNcIlxuICAgICAgICAgIGFyaWEtaGlkZGVuPVwidHJ1ZVwiXG4gICAgICAgICAgZHJhZ2dhYmxlPVwiZmFsc2VcIlxuICAgICAgICAvPlxuICAgICAgICA8Y2FudmFzXG4gICAgICAgICAgaWQ9XCJjXCJcbiAgICAgICAgICBjbGFzc05hbWU9XCJwb3J0Zm9saW8tcGl0LWNhbnZhcyBwb3J0Zm9saW8tc2Nyb2xsLWNhbnZhc1wiXG4gICAgICAgICAgYXJpYS1oaWRkZW49XCJ0cnVlXCJcbiAgICAgICAgICBkcmFnZ2FibGU9XCJmYWxzZVwiXG4gICAgICAgIC8+XG4gICAgICAgIDxkaXZcbiAgICAgICAgICBpZD1cInBvcnRmb2xpb1Byb2plY3RNb3VudFwiXG4gICAgICAgICAgY2xhc3NOYW1lPVwicG9ydGZvbGlvLXByb2plY3QtbW91bnQgcG9ydGZvbGlvLWRlY2stbW91bnRcIlxuICAgICAgICAgIGFyaWEtbGFiZWw9XCJQb3J0Zm9saW8gcHJvamVjdHNcIlxuICAgICAgICAgIGRhdGEtaW50cm8tdGl0bGU9e3BvcnRmb2xpb0hlcm9MaW5lc1swXX1cbiAgICAgICAgICBkYXRhLWludHJvLWJvZHk9e3BvcnRmb2xpb0JsdXJifVxuICAgICAgICAvPlxuICAgICAgPC9kaXY+XG4gICAgKSxcbiAgICB1aUxheWVyOiB7XG4gICAgICBjaHJvbWU6IChcbiAgICAgICAgPGhlYWRlciBjbGFzc05hbWU9XCJ1aS10b3BcIiBkYXRhLXBvcnRmb2xpby11aT5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwidWktdG9wLW1haW4gcm91dGUtdG9wYmFyIHBvcnRmb2xpby10b3BiYXJcIj5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19sZWZ0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicm91dGUtdG9wYmFyX19jZW50ZXJcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJyb3V0ZS10b3BiYXJfX3JpZ2h0IHVpLXRvcC1yaWdodFwiIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8ZGl2IGlkPVwidG9wLWVsZW1lbnRzLXNvdW5kUm93XCIgY2xhc3NOYW1lPVwidWktdG9wLXNvdW5kUm93XCIgLz5cbiAgICAgICAgPC9oZWFkZXI+XG4gICAgICApLFxuICAgICAgc2Vjb25kYXJ5OiAoXG4gICAgICAgIDw+XG4gICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJwb3J0Zm9saW8tcm91dGUtdGl0bGUtdWlcIj5cbiAgICAgICAgICAgIDxoMlxuICAgICAgICAgICAgICBpZD1cImhlcm8tdGl0bGVcIlxuICAgICAgICAgICAgICBjbGFzc05hbWU9XCJoZXJvLXRpdGxlIGhlcm8tdGl0bGUtLXBvcnRmb2xpb1wiXG4gICAgICAgICAgICAgIGFyaWEtbGFiZWw9e3BvcnRmb2xpb0hlcm9BcmlhfVxuICAgICAgICAgICAgPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJoZXJvLXRpdGxlX19leWVicm93XCIgZGF0YS1yb3V0ZS1lbnRlcj1cImlkZW50aXR5XCIgZGF0YS1yb3V0ZS1lbnRlci1vcmRlcj1cIjBcIj57cG9ydGZvbGlvSGVyb0V5ZWJyb3d9PC9zcGFuPlxuICAgICAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9XCJoZXJvLXRpdGxlX19saW5lXCIgZGF0YS1yb3V0ZS1lbnRlcj1cImlkZW50aXR5XCIgZGF0YS1yb3V0ZS1lbnRlci1vcmRlcj1cIjFcIj57cG9ydGZvbGlvSGVyb0xpbmVzWzBdfTwvc3Bhbj5cbiAgICAgICAgICAgICAge3BvcnRmb2xpb0hlcm9TZWNvbmRhcnkgPyAoXG4gICAgICAgICAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwiaGVyby10aXRsZV9fbGluZSBoZXJvLXRpdGxlX19saW5lLS1zZWNvbmRhcnlcIiBkYXRhLXJvdXRlLWVudGVyPVwiaWRlbnRpdHlcIiBkYXRhLXJvdXRlLWVudGVyLW9yZGVyPVwiMlwiPntwb3J0Zm9saW9IZXJvU2Vjb25kYXJ5fTwvc3Bhbj5cbiAgICAgICAgICAgICAgKSA6IG51bGx9XG4gICAgICAgICAgICA8L2gyPlxuICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDxtYWluIGNsYXNzTmFtZT1cInVpLWNlbnRlci1zcGFjZXJcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPlxuICAgICAgICA8Lz5cbiAgICAgIClcbiAgICB9XG4gIH07XG59XG4iXSwiZmlsZSI6Ii9Vc2Vycy9hbGV4YW5kZXJiZWNrL1Byb2plY3RzLWNvZGUvQWxleGFuZGVyIEJlY2sgU3R1ZGlvIFdlYnNpdGUvcmVhY3QtYXBwL2FwcC9zcmMvcm91dGVzL3BvcnRmb2xpby9Qb3J0Zm9saW9Sb3V0ZS5qc3gifQ==