# Work

## Product contract

Work is the second of four primary production routes: Home, Work, About, and Contact. Its canonical URL is `/portfolio.html`. `/portfolio`, `/playground.html`, and `/playground` resolve to the same Work route so old links remain valid. There is no separate public Lab tab.

Work combines two levels of authored material in one pannable field:

- **Case studies** are the primary hierarchy. They are deliberately larger, retain the existing editorial card summary, and open the full project drawer.
- **Snippets** are the secondary hierarchy. They are smaller image, video, or local-code explorations with short descriptions and open in a focused media stage.

The mixed scale is functional hierarchy, not random variation. A visitor should understand that a larger object contains a substantial case study while still discovering smaller experiments between it and the next primary project.

Case-study previews use a compact primary band: they remain larger on average than snippets but do not exceed roughly one third of the approved desktop viewport in either axis. Every Work media preview shares one generous rounded edge. Hover and keyboard focus add a restrained 4px lift, approximately 1% scale, a stronger contact shadow, and a clearer inset edge; captions stay fixed. Reduced Motion preserves the edge and shadow response without travel or scale.

The complete Work system remains available in development and the safe public development mirror. Production builds deliberately render **Coming soon.** instead. `import.meta.env.DEV` is the build-time boundary: production does not mount or prewarm the canvas, gate, or presenters, and there is no URL, browser-storage, or password bypass. Canonical Work URLs, old Lab aliases, shared project URLs, and SPA navigation all use the same held descriptor. Removing this hold requires a separate launch decision. This is a publication control, not asset security: static assets still require server or edge enforcement if they are confidential.

## Sources and ownership

| Concern | Source |
| --- | --- |
| Route identity, aliases, and Button Bar label | `react-app/app/src/lib/route-manifest.js` |
| Route view and readiness prewarm | `react-app/app/src/routes/portfolio/PortfolioRoute.jsx` |
| Production construction screen | `react-app/app/src/routes/portfolio/PortfolioComingSoon.jsx` |
| Unified catalogue adapter | `react-app/app/src/routes/portfolio/work/workCatalog.js` |
| Spatial route composition and interaction | `react-app/app/src/routes/playground/PlaygroundExperience.jsx` |
| Camera, placement, world copies, and depth field | `react-app/app/src/routes/playground/spatial/` |
| Snippet media runtimes | `react-app/app/src/routes/playground/media/` |
| Snippet expansion | `react-app/app/src/routes/portfolio/work/WorkSnippetStage.jsx` |
| Case-study expansion | `react-app/app/src/routes/portfolio/work/WorkCaseStudyPresenter.js` |
| Gate, drawer, and media handoff | `react-app/app/src/routes/portfolio/PortfolioGateRoute.jsx`, `react-app/app/src/legacy/modules/portfolio/` |
| Work-specific styling | `react-app/app/src/routes/portfolio/work/workCanvas.css`, `react-app/app/src/routes/playground/playground.css`, `react-app/app/public/css/portfolio.css` |
| Editorial content | `react-app/app/public/config/contents-portfolio.json` |
| Authored spatial values | `react-app/app/public/config/design-system.json` under the historical `playground` namespace |

The `playground` source/config name is retained internal infrastructure. It is not a public route identity. See [`PLAYGROUND.md`](PLAYGROUND.md).

## Publication checks

`npm run build` checks the compiled production bundle for the hold and rejects emitted Work canvas or presenter code. `npm run audit:work-publication` starts a disposable production preview and tests canonical/legacy URLs, preview/project query attempts, existing access grants, SPA returns, and browser history on desktop/light and mobile/dark/reduced-motion profiles. Run it serially with `ABS_BROWSER=chromium` and `ABS_BROWSER=webkit`. `ABS_WORK_PUBLICATION_URL=https://www.beck.fyi` targets the published site without starting a preview.

The release-smoke and screen-certification commands expect the held production surface. Use `ABS_WORK_URL=http://localhost:8012 ABS_AUDIT_ROUTE=portfolio npm run audit:focus-contrast` for the development canvas and its gate/drawer focus states. The Work-canvas audit also defaults to development on port 8012.

## Catalogue contract

`contents-portfolio.json` is the single live Work content file. It owns the route title and description plus two arrays:

- `projects`: full case-study records consumed by the established drawer and adapted into primary canvas items;
- `snippets`: compact image, video, or code records adapted into secondary canvas items.

`loadWorkCatalog()` loads both arrays and returns one semantic ordered list. It fails when either hierarchy is empty. IDs must be unique across both arrays. Every case study must declare `access: "protected"`; missing access fails closed. Snippets are public.

Case-study placement order is derived from project order. Their larger spans and reviewed anchors are code-owned in `workCatalog.js`. Snippet placement order follows the case studies and retains the established media schema: stable ID, type, reviewed label and description, accessibility text, local poster/preview/source or local code demo, true intrinsic dimensions, and preferred grid span.

Do not create another Work, Portfolio, or Lab content file. Do not promote current website copy into factual authority for new case-study claims. Follow `docs/portfolio/router.yaml` and the portfolio knowledge records before changing project facts.

## Spatial field

The opening title is part of the pannable world. Case studies, snippets, and title exclusion geometry are placed deterministically from stable authored inputs. Existing positions remain append-stable when earlier IDs, ordering, dimensions, spans, anchors, and the layout seed do not change.

The camera supports pointer drag, touch, wheel, trackpad, arrow keys, and WASD. `Home` recentres the title. Tab enters one roving Work item; directional keys choose the nearest item in that direction and animate its complete footprint to the viewport centre. The logical camera is unbounded and visual copies repeat the finite authored field. Copies are decorative, are hidden from assistive technology, and cannot create extra media runtimes.

The background is a restrained three-layer depth field, not a flat dot grid. Its deterministic parallax factors are `0.16`, `0.34`, and `0.58`. The renderer caps total visible work at 1,800 dots, commits the same camera sample as the foreground before paint, redraws only when geometry/camera/theme state changes, and sleeps when idle. Dots remain neutral, circular, and hover-inert.

Do not add a second decorative background animation. Depth comes from the relationship between camera movement, the three dot layers, and the foreground catalogue.

## Centre-then-open interaction

Opening is one continuous spatial transaction:

```text
idle -> centering -> access-pending or expanding -> open -> closing -> idle
```

Selection first animates the chosen item's complete media-and-caption footprint to the viewport centre. Expansion cannot begin until centering settles or Reduced Motion resolves the same geometry immediately. A stale or superseded selection must not open.

### Case studies

Protected case studies open the Work access gate after centering. The live spatial route remains mounted while the gate owns focus. Invalid codes preserve the pending item. Close, Escape, or backdrop dismissal clears the intent and restores focus to the originating case-study card. A valid code closes the gate before expansion and grants the existing `abs_portfolio_ok` session/cookie access to all protected case studies.

`WorkCaseStudyPresenter` reuses `PortfolioProjectDrawer` and `PortfolioProjectHandoff`. The selected card geometry grows into the drawer hero; closing reverses toward the live source card. The sheet covers route content but stops above the Button Bar. The Button Bar retains paint and input ownership over the intentional overlap. Route change or unmount cancels the local presentation and removes temporary handoff state.

This is client-side access friction, not secure authentication. Static assets and client code are still delivered to the browser. Do not describe the gate as a security boundary.

### Snippets

`WorkSnippetStage` expands the selected media from its measured source rectangle into an in-window editorial stage using native Web Animations. The existing field remains mounted and inert behind it. The stage traps focus, supports Escape and backdrop/button dismissal, and reverses into the source before restoring focus. It writes `?work=<item-id>`; browser Back closes the stage before leaving Work.

Reduced Motion keeps the same centering, state, history, focus, and cleanup order with short opacity-led transitions and no large spatial travel.

## Performance and accessibility guardrails

- Keep high-frequency camera and Canvas work outside React state.
- Coalesce pointer movement to animation frames and keep each frame bounded and allocation-light.
- Do not animate layout properties during pan, centre, open, or close. Prefer compositor transforms and opacity.
- Decode only readiness-critical first-view media. Detail media, off-screen snippets, and video playback are not route-ready dependencies.
- Stop off-screen or unowned video/code runtimes. Decorative copies never own a runtime.
- Keep one semantic list item per logical Work item and one roving item in the tab order.
- Preserve visible focus, focus trapping in overlays, focus return, Escape, Back, touch, and keyboard navigation.
- Keep the route world mounted during local overlays; use `inert` for interaction isolation.
- Preserve Button Bar clearance, window clipping, theme boundaries, and the fixed custom cursor contract.
- Never let the dot field keep an idle animation loop solely for visual drift.
- Keep drag input-to-next-paint at or below the audited 180 ms ceiling, keep one gesture below the 120-draw tail ceiling, and prove the camera and dot renderer return to sleep after settlement.

## Release gate

Changes to the production Work route may ship only after:

1. Work catalogue and content validation pass;
2. Chromium and WebKit Work audits pass on desktop and mobile;
3. gate rejection, acceptance, exact-project continuation, and access persistence pass;
4. case-study and snippet open/reverse/focus/history paths pass with and without Reduced Motion;
5. route, theme, frame, transition, and screen certification pass;
6. screenshots are visually inspected in both themes and representative viewports;
7. the final diff is reviewed against unrelated working-tree changes.

Run from the repository root:

```bash
npm run check:work-canvas
npm run check:portfolio-content
npm run check:site
ABS_BROWSER=chromium npm run audit:work-canvas
ABS_BROWSER=webkit npm run audit:work-canvas
ABS_AUDIT_ROUTE=portfolio npm run audit:focus-contrast
ABS_BROWSER=chromium npm run audit:transition-flows
ABS_BROWSER=webkit npm run audit:transition-flows
npm run audit:release-smoke
npm run certify:screens
```

Build/preview evidence alone is not enough. Inspect the Work field, both overlay types, the protected gate, drawer/Button Bar stacking, focus, and motion on the real rendered surface.
