# Website-wide visual handoffs

All editing uses `http://localhost:8012`. The production site and port 8014 mirror are review surfaces and cannot author source. Work and About stay fully available in development while production shows Coming soon.

| Surface | Source ownership |
| --- | --- |
| Shared shell, navigation, typography, responsive tokens | `design-system.json`, `tokens.css`, `main.css`, `StudioShell.jsx`, Button Bar and Utility Rail components. Trace runtime projections through `site-shell.js`. |
| Home and Daily Simulation | `HomeRoute.jsx`, `contents-home.json`, shared CSS and active Canvas runtime. Visible title metrics also feed the Canvas; verify both. |
| Work catalogue, snippets, gate and drawers | `routes/playground/`, `routes/portfolio/work/`, `legacy/modules/portfolio/`, `contents-portfolio.json`. Preserve repeated-item identity, access and handoff geometry. Read the portfolio router before writing factual copy. |
| About | `routes/about-narrative-lab/` and `contents-about.json`. DOM typography/layout is editable; Blender remains geometry/camera authority and the local scene panel owns registered runtime controls. |
| Contact | `ContactRouteContent.jsx`, `contact-route.css`, canonical content and `contactRippleConfig.js`. Keep touch targets, email-copy feedback and ripple behaviour. |
| Styleguide | `routes/styleguide/` references production patterns. Change the production owner as well as its specimen. |

`design-mode.config.mjs` contains machine-readable source candidates. `npm run design:review -- <handoff.json>` retains the entire mixed batch and reports token plans separately. It never writes source. A returned path is a candidate to inspect, not proof that it owns a browser selector.

The 25 registered Button Bar tokens have deterministic JSON transactions. Other values are supported through agent review of the actual CSS/JSX/content owner; there is no generic automatic CSS writer. Preserve variable references, expressions, media/container rules, theme selectors and repeated component scope. Never paste a browser override stylesheet into production.

For each saved change, remove preview masking and reload, inspect the affected route and all shared consumers at mobile/intermediate/desktop widths, and check light/dark, keyboard and reduced motion. Then run the appropriate source and browser gates. Canvas objects are not editable DOM layers. Do not claim browser certification while the actual MCP session is disconnected.
