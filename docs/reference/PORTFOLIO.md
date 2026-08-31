# Work

## Product contract

Work is the second of four primary production routes: Home, Work, About, and Contact. Its canonical URL is `/portfolio.html`. `/portfolio`, `/playground.html`, and `/playground` resolve to the same Work route so old links remain valid. There is no separate public Lab tab.

Work combines two levels of authored material in one pannable field:

- **Case studies** are the primary hierarchy. They use larger 4:5 covers without overlaid text, with a strong title and client / Case study metadata below, and open the full studio-window project drawer.
- **Snippets** are the secondary hierarchy. They are smaller image, video, or local-code explorations with one caption of up to five words. Their longer rationale appears below the media only when opened.

The mixed scale is functional hierarchy, not random variation. A visitor should understand that a larger object contains a substantial case study while still discovering smaller experiments between it and the next primary project.

Case-study previews use a compact portrait band (approximately 336–360px wide at the default desktop endpoint), with responsive width and height limits. All previews scale from the usable viewport diagonal between authored mobile and desktop clamps. Snippets retain their smaller relative envelope and intrinsic aspect ratio; captions and touch targets keep their own legibility rules. Every Work media preview shares one generous rounded edge. Hover keeps the tile and its image still, adding only a quiet contact-shadow and inset-edge change over 180ms. There is no nested image zoom or colour shift. Keyboard focus uses a 1px lift without scale so the media cannot cover its contrasting focus ring. Reduced Motion preserves the edge and shadow response without travel or scale. All Work captions and client metadata use Geist.

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

The release-smoke and screen-certification commands expect the held production surface. Use `ABS_WORK_URL=http://localhost:8014 ABS_AUDIT_ROUTE=portfolio npm run audit:focus-contrast` for the read-only development mirror and its gate/drawer focus states, without authoring controls in the visitor focus inventory. The Work-canvas audit defaults to local development on port 8012.

## Catalogue contract

`contents-portfolio.json` is the single live Work content file. It owns the route title and description plus two arrays:

- `projects`: full case-study records consumed by the established drawer and adapted into primary canvas items;
- `snippets`: compact image, video, or code records adapted into secondary canvas items.

`loadWorkCatalog()` loads both arrays and returns one semantic ordered list. It fails when either hierarchy is empty. IDs must be unique across both arrays. Every case study must declare `access: "protected"`; missing access fails closed. Snippets are public.

Case-study placement order is derived from project order. Their larger spans and reviewed anchors are code-owned in `workCatalog.js`. Snippet placement order follows the case studies and retains the established media schema: stable ID, type, reviewed label and description, accessibility text, local poster/preview/source or local code demo, true intrinsic dimensions, and preferred grid span.

Do not create another Work, Portfolio, or Lab content file. Do not promote current website copy into factual authority for new case-study claims. Follow `docs/portfolio/router.yaml` and the portfolio knowledge records before changing project facts.

## Spatial field

The opening title is part of the pannable world. Case studies, snippets, and title exclusion geometry are placed deterministically from stable authored inputs. Salon fills one shared repeating area and scores candidates against empty-space coverage. Its first valid case-study anchor stays near the title; other anchors remain preferences so large cards also populate the edges. Catalogue or geometry edits may recompose existing positions, even without a period change. Camera movement never recomposes the field.

Project spacing includes the complete image and caption. Its minimum gutter follows preview size, and cross-depth neighbours reserve enough clearance for their relative travel anywhere in the visible viewport. Case studies and the title occupy the front plane; snippets travel on a slower plane controlled by **Motion → Snippet depth**. Media sizes, type, rounded edges, and hover material remain unchanged. Both planes consume one camera sample; Reduced Motion uses a single apparent project plane. Every growth attempt repacks the whole field. The final repeat period is exactly the one used to validate seam clearances; projects may cross its edges without creating per-tile margins. See `PLAYGROUND.md` for the packing and density acceptance contracts.

The camera supports pointer drag, touch, wheel, trackpad, arrow keys, and WASD. `Home` recentres the title. Tab enters one roving Work item; directional keys choose the nearest item in that direction and animate its complete footprint to the viewport centre. The logical camera is unbounded and visual copies repeat the finite authored field. Repeated copies accept pointer activation but remain hidden from assistive technology and outside the tab order. They cannot create extra media runtimes. A tap pins the persistent semantic item to the tapped copy's world position before presentation.

The background is a restrained three-layer depth field, not a flat dot grid. Its base parallax factors are `0.16`, `0.34`, and `0.58`; seeded per-point depth variation adds dimension. A stable 72px projected base grid is independent of the project layout grid. Density selects a stable subset of cells, and randomness moves each point within its cell and depth layer. Sampling stride and phase are camera-independent, so neither culling nor world wrapping resamples visible dots. The renderer caps visible work at 1,800 dots, uses the foreground's logical camera sample, redraws only on changes, and sleeps when idle. Dots use the shared active palette, remain circular and hover-inert, and freeze during Reduced Motion.

Do not add a second decorative background animation. Depth comes from the relationship between camera movement, the three dot layers, and the foreground catalogue.

## Centre-and-open interaction

Opening is one continuous spatial transaction:

```text
public/unlocked: idle -> centering + expanding -> open -> closing -> idle
protected:      idle -> centering -> access-pending -> expanding -> open -> closing -> idle
```

Selection animates the exact tapped item's complete footprint to the viewport centre while its media expands. Direct activation starts both in the same update; URL selections use the same geometry once ready. Only the password gate waits for centering. Disabling world input must preserve that intentional camera animation. Reduced Motion resolves centering immediately and uses short fades. A stale or superseded selection must not open.

### Case studies

Protected case studies open the Work access gate after centering. The live spatial route remains mounted while the gate owns focus. Invalid codes preserve the pending item. Close, Escape, or backdrop dismissal clears the intent and restores focus to the originating case-study card. A valid code closes the gate before expansion and grants the existing `abs_portfolio_ok` session/cookie access to all protected case studies.

`WorkCaseStudyPresenter` reuses `PortfolioProjectDrawer` and `PortfolioProjectHandoff`. The selected media grows into the drawer hero through uniform scale and a changing crop, never independent horizontal and vertical stretching. The source is remeasured after image readiness while the camera settles. Closing reverses toward the live source card. The sheet fills the studio-window host with a subtly translucent ground; the Button Bar retains paint and input ownership over the intentional overlap. Route change or unmount cancels the local presentation and removes temporary handoff state.

This is client-side access friction, not secure authentication. Static assets and client code are still delivered to the browser. Do not describe the gate as a security boundary.

### Snippets

`WorkSnippetStage` expands only the selected media using native Web Animations, uniform scale, and crop. Its final size fits the true image/video/code aspect ratio within the available window, with rationale below and a reachable 44px close action above. Text never scales with the image. The existing field remains mounted and inert. The stage traps focus, supports Escape and backdrop/button dismissal, and reverses into the source before restoring focus. It writes `?work=<item-id>`; browser Back closes the stage before leaving Work.

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
ABS_BROWSER=chromium node scripts/audit-work-refinements.mjs
ABS_BROWSER=webkit node scripts/audit-work-refinements.mjs
ABS_AUDIT_ROUTE=portfolio npm run audit:focus-contrast
ABS_BROWSER=chromium npm run audit:transition-flows
ABS_BROWSER=webkit npm run audit:transition-flows
npm run audit:release-smoke
npm run certify:screens
```

Build/preview evidence alone is not enough. Inspect the Work field, both overlay types, the protected gate, drawer/Button Bar stacking, focus, and motion on the real rendered surface.
