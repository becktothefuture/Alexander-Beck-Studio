# Codebase discovery and audit

Last verified: 2026-07-30
Baseline commit: `956e7eb2` on local `main`
Production application: `react-app/app/`
Audit mode: read-only production review; documentation files only were added

## Executive summary

The repository has a deliberate, mature architecture for an unusually interactive portfolio site. The strongest parts are its stable React shell, explicit bridge to imperative runtimes, authored-versus-generated configuration contract, performance-aware Canvas system, focused design constitution, and broad local validation toolkit.

The main risks are not a need for a framework rewrite. They are contract drift across duplicated route metadata, globally suppressed keyboard focus, inconsistent page semantics, concentration of responsibility in several large orchestrators, broad lint exemptions over active runtime code, overlapping CSS ownership, browser checks that are not required by the deploy workflow, stale prose about About/test behavior, and a very large set of tracked generated browser artifacts.

No production code was changed by this audit. The repository is ready for roadmap planning from the permanent issue IDs in this document.

## Scope and method

The review covered:

- root and app package metadata, lockfiles, scripts, Node requirements, and dependency audit;
- the GitHub Pages workflow and Studio development/publish policy;
- all Vite production inputs and the route/entry registry structure;
- the core application, shell, navigation, lifecycle, transition, and shared route libraries;
- all primary route surfaces and their runtime ownership;
- the Home Canvas, Portfolio, Daily Simulation, and About narrative boundaries;
- state, browser persistence, local write APIs, access gates, and external integrations;
- authored and generated configuration ownership;
- CSS ownership and high-risk global rules;
- source/test/audit inventory and representative validators;
- repository-tracked file classes, ignored artifacts, and large-file pressure;
- focused architecture, design, configuration, runtime, deployment, and portfolio documentation.

The review did not line-read every individual simulation mode, shader, generated file, binary model, media asset, research artifact, or archived task. Those files were classified by ownership and sampled where they affect production contracts. This document does not claim that every asset or historical evidence file was manually inspected.

## Current repository facts

| Measure | Result |
| --- | --- |
| Tracked files | 14,959 |
| Application source JS/JSX/CSS files | 340 |
| Root scripts files | 111 |
| App-local script files | 2 |
| Files using Node test/assert | 37 |
| Script files using Playwright | 48 |
| Root production dependency audit | 0 known vulnerabilities reported |
| App production dependency audit | 0 known vulnerabilities reported |
| Deployment target | Static GitHub Pages |
| Production database/backend | None |
| Production authentication | None |
| Local branch baseline | Clean; six commits ahead of `origin/main` at audit start |

The large tracked-file count is dominated by historical Playwright capture data. See `OPS-001`.

## Architecture assessment

### What is strong

- Every production entry converges on one `SiteApp` and one stable `StudioShell`.
- React and imperative runtimes have an explicit lifecycle bridge with abort, generation, cleanup, ready, and failure semantics.
- The Canvas runtime contains fixed-timestep and allocation-control conventions appropriate to a continuous 60 FPS surface.
- The stable physical shell is separated from route content and has documented theme/layer ownership.
- Canonical authored configuration is clearly separated from generated runtime output.
- Local authoring and public preview have a strong safety boundary: the public mirror blocks `/api/*` and `/@fs/*`.
- About authoring uses schema validation, migration, optimistic concurrency, atomic save, and recovery checkpoints.
- The validation toolkit covers source contracts, catalogs, configuration parity, build output, browser flows, and screenshot certification.
- The design constitution records protected visual contracts and known outliers.

### Where pressure is accumulating

- The route catalog is manually repeated across multiple layers.
- Three central orchestration modules have very large responsibility surfaces.
- Active legacy code receives weaker static analysis than the rest of the app.
- Global and Portfolio styles have overlapping ownership and source-order dependence.
- Accessibility defects are documented but can still pass the canonical release gate.
- The release workflow does not exercise a browser.
- Some operational documentation no longer matches the current About and test architecture.
- Generated browser evidence remains tracked and materially inflates clone/history size.

## File-group review matrix

This matrix records the file-level review at the narrowest useful group boundary. The directory summaries later in this document add strengths, risks, priorities, and learning notes.

| File or group | Purpose and system role | Responsibilities | Dependencies and public interface | Side effects | Complexity |
| --- | --- | --- | --- | --- | --- |
| `src/entries/*.jsx` and HTML entries | Start each built route and converge on `SiteApp`. | Select initial route ID and mount React. | React DOM, `SiteApp`; public interface is the Vite HTML input. | Creates the React root. | Very clear. Thin and consistent. |
| `src/components/app/SiteApp.jsx` | Compose route descriptors with the shared shell. | Resolve view/runtime, sync design/theme/shell state, prewarm routes and media, connect transition state. | Route modules, shared libraries, hooks; exposes the mounted application surface and diagnostic data attributes. | History coordination, event listeners, prewarming, document state. | Slightly complex. Clear role but broad coordination surface. |
| `src/components/app/StudioShell.jsx` and `ShellButtonBar.jsx` | Own persistent physical chrome and navigation. | Render layer hosts, stable shell, route scene wrapper, global overlays, and primary tabs. | Design tokens, route navigation, atmosphere/title hosts; DOM data attributes are used by audits and runtime selectors. | DOM hosts, click navigation, global layer attachment. | Acceptable. Many layers, but ownership is explicit. |
| `src/hooks/useShellRouteTransition.js` and motion helpers | Run route and simulation transition transactions. | URL/history, phases, readiness, recovery, focus, prewarming, participants, and surface state. | Route resolver, lifecycle events, motion/surface utilities; transaction and diagnostic contracts are public to the shell. | History writes, timers, aborts, focus, global events, DOM state. | Difficult to maintain. Responsibility density is high despite strong invariants. |
| `src/hooks/useLegacyRouteRuntime.js` and `src/lib/legacy-runtime-scope.js` | Bridge React lifecycle to imperative routes. | Generation guards, abort, cleanup, ready/fail events, legacy capture fallback. | Lazy runtime exports; interface is the boot context and lifecycle event/data-attribute contract. | Starts/stops runtimes, logs failures, dispatches events. | Very clear. A strong boundary with limited scope. |
| Primary route files under `src/routes/home`, `portfolio`, `about`, and `contact` | Supply semantic content, mount points, and route-local React surfaces. | Route descriptors, content binding, interactive React state, imperative hosts. | Virtual content, shared shell libraries, route-specific runtimes; public interface is each route view/runtime descriptor. | Clipboard, haptics/audio, Canvas mount, local component state. | Acceptable overall; semantic structure is inconsistent. |
| `src/legacy/main.js` and `src/legacy/modules/` | Run the active Home Canvas system. | Runtime boot, fixed-step simulation, rendering, input, mode selection, diagnostics, audio, cleanup. | Canonical config, browser Canvas/audio/pointer APIs; exports Home boot/prewarm and publishes runtime diagnostics. | Continuous RAF, mutable pooled state, Canvas drawing, audio, global events and logs. | Slightly complex by necessity; control and lint boundaries need work. |
| `src/legacy/modules/portfolio/` | Run the Portfolio deck, handoff, and drawer. | Content load, orbital geometry, input/inertia, cards, selection, accessibility, transitions, cleanup. | Portfolio JSON, shell hosts, Lenis/browser APIs; exports prewarm/bootstrap and route readiness. | Fetch, RAF, DOM creation/mutation, focus, Canvas, history-adjacent events. | Difficult to maintain. The main application class owns too many concerns. |
| `src/routes/about-narrative-lab/` | Author and play the spatial About narrative. | Schema/migration, runtime plan, worker preparation, point rendering, editor, recovery, publication. | Three.js, Web Worker, virtual content, local save API; interfaces are schema v5, runtime plans, editor store, and persistence envelopes. | Worker messages, WebGL, localStorage, local API fetch, large runtime buffers. | Slightly complex. The domain is complex but decomposed into explicit contracts. |
| `public/config/`, config loaders, flatteners, and `vite.dev-admin-plugin.js` | Own authored design/content and safe local persistence. | Load, validate, normalize, save, migrate, flatten, and compare canonical data. | JSON schemas/contracts, Vite virtual modules, local HTTP routes; generated config is a build interface. | Local file reads/writes, ETags, atomic rename/fsync for About, browser fetch. | Acceptable. Ownership is clear; request guards are inconsistent. |
| `public/css/main.css`, `portfolio.css`, tokens, and component CSS | Apply the visual constitution and responsive behavior. | Shell, route, overlay, interaction, state, theme, and breakpoint presentation. | Canonical tokens and DOM class/data contracts; the cascade is an implicit interface. | Visual/layout behavior, focus visibility, text selection. | Difficult to maintain in global/Portfolio areas because ownership overlaps. |
| `scripts/`, app scripts, and Node tests | Enforce project-specific source and runtime contracts. | Catalog/schema validation, geometry/transition tests, build checks, browser audits, screenshots, Studio operations. | Node, Playwright, app source/config; public interface is the root command set. | Builds, local servers, browser sessions, screenshots, generated reports. | Acceptable. Broad and purposeful, but the release subset is incomplete. |
| `.github/workflows/gh-pages.yml` | Validate and deploy committed `main`. | Install root/app dependencies, run mutation and dependency checks plus the canonical gate, build and retain the preview artifact, run advisory smoke on `main`, then deploy only after validation. | GitHub Actions, Node 22.19, Pages; pull requests validate and `main` can deploy. | CI validation and production deployment. | Published; one qualifying smoke exists, five later lint-ratchet failures are unresolved remotely, and `main` is unprotected. |

### Comment opportunities

Most performance and compatibility hotspots already explain why they exist. The best additional comments would document the route-registry ownership rule, the intended unknown-route behavior, the source-order dependency between global and Portfolio CSS until it is removed, and the reason for each remaining lint suppression. Comments that restate component markup, loop mechanics, or obvious assignments would not improve the codebase.

## Permanent issue register

| ID | Title | Status | Severity | Confidence | Effort | Change risk |
| --- | --- | --- | --- | --- | --- | --- |
| `OPS-001` | Ignored generated artifacts remain tracked | Resolved | High | High | M for current tree; XL for history | High |
| `A11Y-001` | Global focus styling removes a reliable keyboard indicator | Planned | High | High | M | Medium |
| `A11Y-002` | Home legend filters are click-only | Resolved | Medium | High | S | Low |
| `A11Y-003` | Primary landmarks and heading hierarchy are inconsistent | Resolved | Medium | High | M | Medium |
| `A11Y-004` | Light-theme supporting text misses the normal-text contrast target | Planned | Medium | Medium | S | Low |
| `A11Y-005` | Portfolio reading text inherits disabled selection | Resolved | Low | High | XS | Low |
| `ARCH-001` | Route metadata is duplicated and already drifting | Resolved | Medium | High | M | Medium |
| `ARCH-002` | Standalone routes can be accepted by the SPA bridge but fail to settle | Resolved | Low | High | S-M | Medium |
| `MAINT-001` | Central orchestrators concentrate too many responsibilities | Resolved | Medium | High | L-XL, phased | High |
| `MAINT-002` | Active legacy runtime has broad lint exemptions | Resolved | Medium | High | M, phased | Medium |
| `MAINT-003` | Global and Portfolio CSS ownership overlaps | Planned | Medium | High | L, phased | High |
| `TEST-001` | Deploy validation needs a qualified blocking browser signal | In progress | Medium | High | M | Medium |
| `TEST-002` | Simulation lifecycle fault and WebKit geometry cases were not fully green | Resolved locally | Medium | High | S-M | Medium |
| `PERF-001` | Runtime performance certification was unstable and red at baseline | Partially resolved | Medium | Medium | M | Medium |
| `DOC-001` | About and test documentation contradicts current code | Resolved | Medium | High | S | Low |
| `SEC-001` | Local write endpoints have inconsistent request hardening | Resolved | Low | Medium | S-M | Low |

## OPS-001 — Ignored generated artifacts remain tracked

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-04`, `MILESTONE-09`
- **Severity:** High
- **Confidence:** High
- **Category:** Operations
- **Files:** `.playwright-cli/`, `.playwright-mcp/`, `.gitignore`, `scripts/precommit-check.sh`
- **Related issues:** `TEST-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** M for the current tree; XL for history
- **Change risk:** High

### Summary
Paths that are now ignored still contain large numbers of tracked Playwright captures, dependency files, and temporary outputs. `.playwright-cli` alone accounts for 13,607 tracked files, including more than 13,000 trace screenshots. The current Git object pack is about 1.06 GiB.

### Why it matters
The repository is expensive to clone, index, back up, and review. Browser captures can also preserve DOM, screenshot, and network evidence that was not intended as permanent source. A targeted scan of the current tracked Playwright trace network/trace files did not find authorization or cookie-key matches, so this audit does not claim a confirmed credential leak. The retention model is still unsafe for future captures.

### Affected code and files

- `.playwright-cli/`
- `.playwright-mcp/`
- tracked files under `node_modules/`, `output/`, and `tmp/`
- `.gitignore`
- pre-commit/repository hygiene tooling

### Evidence

- 14,959 tracked files in total.
- 13,607 tracked files under `.playwright-cli`.
- 41 tracked files under `node_modules` and 93 tracked output/temp files.
- These paths are present in `.gitignore`, which does not untrack files already committed.
- Current packed Git objects total about 1.06 GiB.

### Suggested direction
First classify which browser artifacts are durable evidence. Move only intentionally preserved evidence into a documented, small artifact format. Stop tracking the ignored generated paths in a focused cleanup. Consider history rewriting only as a separate, coordinated operation with a backup, collaborator notice, and measured benefit.

### Acceptance criteria

- No ignored generated path is tracked in the current tree unless it has a documented exception.
- Required audit evidence remains reproducible or is stored in a small durable format.
- Repository size before and after the cleanup is measured and reported.
- A fresh clone can install and run `npm run check:site`.
- Any history rewrite has an explicit migration and recovery plan.

### Effort estimate
Medium for current-tree cleanup; extra large if history is rewritten.

### Change risk
High. Evidence can be lost and collaborators can be disrupted if the scope is not resolved first.

### Confidence
High for repository bloat and tracking drift; medium for privacy exposure because no current credential match was found.

### Verification
Run an ignored-but-tracked inventory, measure Git object size, test a fresh clone/install, and run `npm run check:site` after the current-tree cleanup.

### Notes
Current-tree inventory and cleanup were completed through `MILESTONE-04` and `MILESTONE-09`. Git history rewriting remains deferred under `ADR-005` because it invalidates hashes, disrupts collaborators, and is not required to repair current hygiene. Current trace sampling found no authorization or cookie-key match, but that does not prove every historical capture is free of sensitive data.

`MILESTONE-04` was verified on 2026-07-30. Its deterministic policy-effective inventory contained 13,776 ignored tracked paths and 1,099,684,630 indexed bytes, and pre-commit enforcement rejects new staged `.playwright-*`, `node_modules`, `output`, and temporary artifacts by default. After `HD-02` approval, `MILESTONE-09` removed those exact paths from the index only. Independent review found zero staged source paths, verified all local copies remain present, and confirmed the ignored-tracked inventory is zero. No history rewrite occurred.

## A11Y-001 — Global focus styling removes a reliable keyboard indicator

- **Status:** Planned
- **Roadmap milestones:** `MILESTONE-07`
- **Severity:** High
- **Confidence:** High
- **Category:** Accessibility
- **Files:** `react-app/app/public/css/main.css`, `react-app/app/src/components/app/shell-button-bar-dominant.css`
- **Related issues:** `A11Y-002`, `A11Y-003`, `TEST-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** M
- **Change risk:** Medium

### Summary
`public/css/main.css` removes `outline` and `box-shadow` from every `:focus-visible` element. Several component rules repeat the removal, while replacement focus treatments are incomplete and depend on material or color changes.

### Why it matters
Keyboard users can lose track of which control is active. The issue affects primary navigation and route interactions across the site, and it is already recorded as a P0 design outlier.

### Affected code and files

- `react-app/app/public/css/main.css`
- `react-app/app/src/components/app/shell-button-bar-dominant.css`
- route/component CSS with focus overrides
- interactive controls across Home, Portfolio, About, and Contact

### Evidence

- A universal `*:focus-visible` rule sets `outline: none` and `box-shadow: none`.
- The production design constitution records broad focus suppression as a P0 accessibility outlier.
- The canonical gate has no browser accessibility assertion that would fail on missing focus indication.

### Suggested direction
Define one tokenized, shell-compatible focus contract. Restore the browser outline until every interactive component has an equally visible replacement. Verify it on invariant black shell surfaces and both in-window themes.

### Acceptance criteria

- Every keyboard-focusable control has a visible focus indicator.
- The indicator meets the project’s shell/theme visual contract without changing layout.
- Home, Portfolio, About, Contact, the Button Bar, gates, drawer, and modal paths are tab-tested.
- Automated browser coverage checks representative controls for visible focus styling.
- Pointer interaction visuals remain unchanged.

### Effort estimate
Medium.

### Change risk
Medium because a global rule affects many visually locked surfaces.

### Confidence
High.

### Verification
Tab through primary routes in Chromium and WebKit at desktop and mobile sizes. Inspect the actual focus pixels on the wall, frame, in-window themes, gates, drawer, and modal.

### Notes
The dominant Button Bar stylesheet has a specific outline, so the defect is not that every control is invisible. The defect is that the universal suppression leaves no reliable site-wide fallback and replacement coverage is incomplete.

## A11Y-002 — Home legend filters are click-only

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-06`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Accessibility
- **Files:** `react-app/app/src/routes/home/HomeRoute.jsx`, `react-app/app/src/legacy/modules/ui/legend-filter.js`
- **Related issues:** `A11Y-001`, `TEST-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** S
- **Change risk:** Low

### Summary
Home legend items are rendered as `div` elements and receive click listeners. They do not provide button semantics, keyboard activation, or focus participation.

### Why it matters
Keyboard and assistive-technology users cannot discover or operate the expertise filters that pointer users can select.

### Affected code and files

- `react-app/app/src/routes/home/HomeRoute.jsx`
- `react-app/app/src/legacy/modules/ui/legend-filter.js`
- Home legend styling

### Evidence

- Legend items are plain `div` elements with tooltip data.
- Runtime initialization registers click behavior without equivalent keyboard behavior.
- The issue is also named in the production design outlier register.

### Suggested direction
Use semantic `button` elements where possible. Preserve the visual material, add pressed/selected state, and make Enter/Space behavior equivalent to click behavior.

### Acceptance criteria

- Every filter can be reached in a logical tab order.
- Enter and Space produce the same state change as pointer activation.
- The selected state is exposed through semantics such as `aria-pressed`.
- Focus is visibly indicated under `A11Y-001`.
- Canvas filtering and performance remain unchanged.

### Effort estimate
Small.

### Change risk
Low.

### Confidence
High.

### Verification
Use keyboard-only operation on Home, assert button semantics and selected state in the DOM, and run the Home Canvas/SPA audit to confirm filtering remains stable.

### Notes
Changing the element to a semantic button is preferable to adding a custom button role and key handler to a `div`.

Resolved in `MILESTONE-06`. The legend now uses native buttons with `aria-pressed`, an explicitly controlled live status region, and an idempotent runtime disposer. Desktop and mobile activation, clearing, and Canvas SPA remount behavior passed browser verification.

## A11Y-003 — Primary landmarks and heading hierarchy are inconsistent

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-06`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Accessibility
- **Files:** `react-app/app/src/components/app/StudioShell.jsx`, `react-app/app/src/routes/home/HomeRoute.jsx`, `react-app/app/src/routes/portfolio/PortfolioRoute.jsx`, `react-app/app/src/routes/contact/ContactRouteContent.jsx`
- **Related issues:** `TEST-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** M
- **Change risk:** Medium

### Summary
Primary route content is not consistently contained by a meaningful `main` landmark. Home has an empty `main` while the semantic title and interactions are outside it. Portfolio exposes a hidden empty `main`, uses a visible `h2` as its entry title, and hosts the interactive deck elsewhere. Contact has an `h1` but no `main` landmark. About uses `main`.

### Why it matters
Screen-reader landmark navigation and heading navigation do not describe the visible application consistently. A visually sophisticated route should still expose a stable document outline.

### Affected code and files

- `src/components/app/StudioShell.jsx`
- `src/routes/home/HomeRoute.jsx`
- `src/routes/portfolio/PortfolioRoute.jsx`
- `src/legacy/modules/portfolio/app.js`
- `src/routes/contact/ContactRoute.jsx`
- `src/routes/about/AboutRoute.jsx`

### Evidence

- Home and Portfolio render empty or hidden `main` elements separate from their primary experience.
- Portfolio’s runtime-created visible heading is an `h2` and the route has no visible/semantic `h1`.
- Contact’s root content is a `div`/`section` hierarchy without a `main` element.

### Suggested direction
Define a shell-level route-main contract that allows Canvas and imperative mounts to participate without moving their high-frequency ownership into React. Give every primary route one meaningful `main` and one appropriate route-entry `h1`, with visual hiding only where the Canvas owns presentation.

### Acceptance criteria

- Each primary route has one meaningful `main` landmark.
- Each primary route has one semantic `h1` matching its entry purpose.
- No empty landmark is exposed as the route’s primary content.
- Existing visual hierarchy and Canvas ownership do not change.
- Screen-reader and automated DOM checks cover all four routes.

### Effort estimate
Medium.

### Change risk
Medium because route mounts, style selectors, and transition surfaces may depend on the current wrappers.

### Confidence
High.

### Verification
Inspect the accessibility tree for all five primary routes, assert one meaningful `main` and one route `h1`, and run route-transition checks to confirm wrapper changes do not affect lifecycle selectors.

### Notes
The semantic heading can remain visually hidden where the Canvas owns presentation. This finding does not recommend moving Canvas content into the DOM.

Resolved in `MILESTONE-06`. `SiteApp` now supplies explicit route landmark metadata to a stable `#simulations` shell node, so primary routes expose one labelled main landmark without changing the node across SPA transitions. Direct and SPA semantic checks cover Home, Portfolio, production About, and Contact; development About retains its internal landmark contract.

## A11Y-004 — Light-theme supporting text misses the normal-text contrast target

- **Status:** Planned
- **Roadmap milestones:** `MILESTONE-07`
- **Severity:** Medium
- **Confidence:** Medium
- **Category:** Accessibility
- **Files:** `react-app/app/public/config/design-system.json`, `react-app/app/public/css/main.css`
- **Related issues:** `MAINT-003`, `TEST-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** S
- **Change risk:** Low

### Summary
The light-theme route description uses muted text at partial opacity. On the static design-token background, the resulting color is approximately `#727272` over `#e9e9e9`, or about 3.96:1 contrast.

### Why it matters
Normal-size supporting copy should reach 4.5:1. The atmosphere and route effects can change the real pixel result, so static arithmetic is necessary but not sufficient.

### Affected code and files

- `public/config/design-system.json`
- generated color configuration
- `public/css/main.css`, including `.route-centered-page__description`
- Contact and other centered route descriptions

### Evidence

- Light surface token: `#e9e9e9`.
- Muted text token: `#2f2f2f`.
- Supporting description opacity: `0.64`.
- Static alpha composition yields about 3.96:1.
- The design constitution identifies light supporting-copy contrast as a P1 issue.

### Suggested direction
Raise the effective text contrast through the canonical token or component opacity, then verify actual rendered pixels over the full atmosphere range in both browser families.

### Acceptance criteria

- Normal supporting copy measures at least 4.5:1 on its rendered background.
- Dark-theme contrast remains compliant.
- The change is made at the canonical ownership layer and generated config remains in parity.
- Chromium and WebKit screenshots cover the affected route at desktop and mobile sizes.

### Effort estimate
Small.

### Change risk
Low, subject to visual approval.

### Confidence
Medium. Static failure is confirmed; rendered atmosphere sampling remains outstanding.

### Verification
Measure computed/rendered contrast in Chromium and WebKit for light and dark themes at desktop and mobile sizes, including representative atmosphere frames.

### Notes
The issue metadata uses Medium confidence because the user-visible pixel result depends on composited atmosphere. The static token/opacity result is directly supported.

## A11Y-005 — Portfolio reading text inherits disabled selection

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-06`
- **Severity:** Low
- **Confidence:** High
- **Category:** Accessibility
- **Files:** `react-app/app/public/css/main.css`, `react-app/app/public/css/portfolio.css`
- **Related issues:** `MAINT-003`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** XS
- **Change risk:** Low

### Summary
The global page style disables text selection. Portfolio project reading content does not restore `user-select: text` in its current route stylesheet.

### Why it matters
Users cannot reliably select or copy case-study text. This reduces usability for a reading surface and can interfere with some assistive workflows.

### Affected code and files

- `public/css/main.css`
- `public/css/portfolio.css`
- Portfolio project drawer content

### Evidence

- The body/global surface applies `user-select: none`.
- No current Portfolio drawer override was found.
- The design constitution records this as a Portfolio reading-surface issue.

### Suggested direction
Restore selection only on project reading content. Keep drag surfaces and the orbital deck non-selectable.

### Acceptance criteria

- Drawer headings, paragraphs, captions, and links allow text selection.
- Dragging the orbital deck does not begin text selection.
- Pointer, touch, and drawer-close behavior remain unchanged.

### Effort estimate
Extra small.

### Change risk
Low.

### Resolution

Resolved in `MILESTONE-06`. Text selection is restored only for headings, paragraphs, captions, and links inside the Portfolio project reading surface. The orbital deck remains non-selectable, and all six drawers plus desktop, tablet, mobile, stress, remount, and reduced-motion carousel paths passed.

### Confidence
High.

### Verification
Select and copy drawer text with mouse, keyboard, and touch selection where supported. Re-run Portfolio carousel, drawer, and transition audits.

### Notes
Limit the override to reading content. Selection should remain disabled on drag-owned deck surfaces.

## ARCH-001 — Route metadata is duplicated and already drifting

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-05`, `MILESTONE-08`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Architecture
- **Files:** `react-app/app/vite.config.js`, `react-app/app/src/lib/routes.js`, `react-app/app/src/components/app/SiteApp.jsx`, `react-app/app/src/components/app/StudioShell.jsx`
- **Related issues:** `MAINT-001`, `TEST-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** M
- **Change risk:** Medium

### Summary
Route identity is repeated across Vite inputs, HTML files, entry modules, `routes.js`, `SiteApp` descriptors, `StudioShell` route-scene metadata, the simulation catalog, and validators. The baseline audit correctly found that `rift-rings` lacked an explicit shared-shell scene, but incorrectly classified standalone `loader-playground` as another shell omission. M05 corrected that assumption, repaired Rift Rings, removed the unreachable standalone Simulations scene, and added fail-closed relationship validation. Unknown same-origin paths still resolve as Home, which makes `isInternalRouteHref` accept them as valid internal routes.

### Why it matters
Adding or renaming a route requires synchronized edits across several registries. Drift can produce correct-looking content with incorrect route metadata, diagnostics, structured identifiers, prewarming, or transition behavior. Unknown links can be intercepted as Home instead of receiving a normal missing-page response.

### Affected code and files

- `react-app/app/vite.config.js`
- `react-app/app/*.html` and `react-app/app/lab/*.html`
- `src/entries/`
- `src/lib/routes.js`
- `src/components/app/SiteApp.jsx`
- `src/components/app/StudioShell.jsx`
- `src/data/simulationCatalog.js`
- route/entry validation scripts

### Evidence

- The same route identifiers are manually declared at multiple layers.
- Before M05, `rift-rings` fell through to the Home scene wrapper, while `loader-playground` and `simulations` were standalone views that bypassed `StudioShell`; the Simulations switch case was unreachable.
- M05 now derives route-view ownership and standalone/shared-shell applicability from the authored `SiteApp` imports and view functions.
- `npm run validate:route-registry:fixtures` proves 36 omission and drift classes fail closed; the normal validator reconciles 29 Vite inputs, 24 entry modules, 21 `SiteApp` routes, and 15 reachable shell scenes.
- `resolveRouteFromPathname` still falls back to Home for no match.

### Suggested direction
Create one source-readable route manifest that generates or validates the route definitions that can share metadata. Keep view/runtime imports explicit if needed for bundling, but make omission detectable. Distinguish an unknown route from Home at the resolver boundary.

### Acceptance criteria

- Every built route has one validated ID, path, aliases, entry, view descriptor, route-view kind, and catalog relationship where applicable.
- Every shared-shell route has reachable shell metadata; standalone routes cannot add dead shell scenes.
- `rift-rings` exposes its own exact scene identity and literal route-view metadata.
- Unknown same-origin paths are not reported as valid Home links.
- A validator fails when any supported registry drifts.
- Primary route transitions and all lab direct loads still pass.

### Effort estimate
Medium.

### Change risk
Medium because Vite inputs, lazy imports, history handling, and browser audits depend on the current shape.

### Confidence
High.

### Verification
M05 passed the 36-fixture route validator, HTML and simulation validation, the canonical site gate, release smoke, direct Loader/Simulations/Rift checks, and a Home-to-Rift SPA check. M08 must test unknown same-origin links and repeat the complete SPA history/transition matrix if `HD-01` is approved.

### Notes
M05 completed phase 1 on 2026-07-30. The original Loader shell requirement was a false assumption: its view declares `layout: 'standalone'`, and `SiteApp` renders it without `StudioShell`. After `HD-01` approval, M08 created one source-readable manifest for route identity, removed unknown-route Home fallback, preserved explicit view/runtime imports, expanded fail-closed validation to 53 fixtures, and passed independent review.

## ARCH-002 — Standalone routes can be accepted by the SPA bridge but fail to settle

- **Status:** Resolved
- **Roadmap milestones:** None; candidate follow-up after M08 or a dedicated transition milestone
- **Severity:** Low
- **Confidence:** High
- **Category:** Architecture
- **Files:** `react-app/app/src/hooks/useShellRouteTransition.js`, `react-app/app/src/lib/spa-navigation.js`, `react-app/app/src/routes/loader-playground/LoaderPlaygroundRoute.jsx`
- **Related issues:** `ARCH-001`, `MAINT-001`
- **Blocked by:** Route-type ownership decision
- **Blocks:** None
- **Estimated effort:** S-M
- **Change risk:** Medium

### Summary
The internal SPA bridge accepts the known Loader Playground URL and returns `true`, but a Rift-to-Loader probe remained on Rift after the transition rolled back. Loader is a standalone route and its supported catalogue launch opens a new tab, so this is not an M05 shell-metadata defect.

### Why it matters
An internal caller can interpret `true` as a completed SPA handoff even though the standalone destination cannot settle through the shared-shell readiness path.

### Evidence

- `LoaderPlaygroundRoute.jsx` declares `layout: 'standalone'`.
- `SiteApp` renders standalone `mainContent` directly instead of `StudioShell`.
- `__ABS_SPA_NAVIGATE__('/lab/loader-playground.html')` returned `true`, but the route remained Rift Rings after the bounded readiness window with no console or page error.
- The relevant transition and route-type code was unchanged by M05, so the behavior is pre-existing.

### Suggested direction
Make route type explicit at the navigation boundary. Either return `false` so standalone destinations use hard navigation, or add a separately characterized standalone transition path. Do not make standalone views pretend to be shared-shell scenes.

### Acceptance criteria

- A standalone destination either performs a documented hard navigation or settles through an explicitly supported transition path.
- The bridge return value accurately reports whether it handled the destination.
- Shared-shell route transitions, history, readiness, and failure recovery remain unchanged.

### Verification
M08 makes the shared-shell navigation bridge accept only manifest routes with `layout: 'shared-shell'`. Focused Chromium and WebKit probes confirmed Loader and Simulations return `false`, leave the Home URL and shell identity unchanged, and create no route-transition marker. Normal browser/direct-load behavior now owns standalone destinations.

## MAINT-001 — Central orchestrators concentrate too many responsibilities

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-11`, `MILESTONE-13`, `MILESTONE-14`, `MILESTONE-15`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Maintainability
- **Files:** `react-app/app/src/hooks/useShellRouteTransition.js`, `react-app/app/src/legacy/modules/ui/control-registry.js`, `react-app/app/src/legacy/modules/portfolio/app.js`
- **Related issues:** `ARCH-001`, `MAINT-002`, `MAINT-003`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** L-XL, phased
- **Change risk:** High

### Summary
Several modules grew into broad orchestration surfaces: before M13, `src/hooks/useShellRouteTransition.js` was about 3,175 lines; before M14, `src/legacy/modules/ui/control-registry.js` was about 6,753 lines; and before M15, `src/legacy/modules/portfolio/app.js` was about 4,109 lines. Each mixed multiple forms of policy, state, rendering, event binding, timing, recovery, and persistence. M13 reduced the hook to about 2,864 lines by extracting the complete route-readiness observation boundary without moving transaction mutation. M14 reduced the registry to about 6,573 lines by extracting the simulation-atmosphere definition family without moving panel behavior. M15 reduced Portfolio `app.js` to about 3,893 lines and moved data/config/content normalization plus thumbnail prewarming behind focused ownership boundaries without touching orbital interaction.

### Why it matters
The issue is responsibility density, not line count alone. Changes require large context, unrelated contracts can interact through private state, and focused unit testing is difficult. These files sit on animation, route, or authoring hot paths, so broad rewrites have high regression risk.

### Affected code and files

- `src/hooks/useShellRouteTransition.js`
- `src/legacy/modules/ui/control-registry.js`
- `src/legacy/modules/portfolio/app.js`
- their motion, surface, control, drawer, and test helpers

### Evidence

- The transition hook owns URL/history, transaction state, prewarming, route/simulation transitions, readiness, failure recovery, atmosphere coordination, and focus settlement.
- The control registry owns control schemas, visibility persistence, grouping, preset behavior, HTML generation, event binding, and UI synchronization.
- Portfolio’s application class owns configuration, rendering, input, geometry, animation, selection, accessibility, drawer handoff, and lifecycle.
- M13 moved route-specific readiness predicates, generation-qualified events, polling, timeout, failure, cancellation, and cleanup into `src/lib/motion/route-transition-readiness.js`. The hook retains when observation begins and how the result advances or recovers the transaction. Deterministic tests pass 28/28, the hotspot suite passes 12/12, and Chromium/WebKit transition/runtime audits passed independent review.
- M14 moved four simulation-atmosphere sections containing 11 controls into `src/legacy/modules/ui/control-definitions/simulation-atmosphere-controls.js`. The exact 37-section/336-control contract, public exports, rendering, binding, persistence, metadata, parse/format behavior, and representative runtime apply/hydration callbacks passed characterization. The final control suite passes 6/6, the combined hotspot suite passes 14/14, and independent review found no remaining issue.
- M15 moved cached loading and project normalization to `portfolio-data.js`/`portfolio-content.js`, runtime normalization to `portfolio-config.js`, and thumbnail prewarming to `portfolio-prewarm.js`. Its exact-one DOM contract now drives real Chromium/WebKit direct, SPA, and remount assertions. Full Portfolio interaction, drawer, reversal, focus, reduced-motion, and transition evidence passed; independent review accepted the final corrected boundaries.

The planned M11/M13/M14/M15 programme is complete. The remaining large modules are intentional active orchestrators; further extraction requires a new measured issue rather than silently extending this scope.

### Suggested direction
Do not rewrite these systems. Add characterization tests around the existing public behavior, then extract one stable responsibility at a time behind current interfaces. Good first seams are declarative control definitions versus panel rendering, Portfolio content/data normalization versus runtime interaction, and transition observation/diagnostics versus transaction mutation.

### Acceptance criteria

- Each extraction has a named ownership boundary and no user-visible behavior change.
- Existing lifecycle, reduced-motion, reversal, failure recovery, and performance contracts are characterized first.
- Public imports and runtime events remain stable or receive a documented migration.
- Transition, Portfolio, and Canvas audits pass after every phase.
- Hot paths show no new sustained allocations or frame-time regression.

### Effort estimate
Large to extra large, split into independent milestones.

### Change risk
High.

### Confidence
High.

### Verification
For each extraction, run focused characterization tests plus `npm run check:site`; use the relevant Canvas, Portfolio, or transition browser audits and compare frame-time/allocation diagnostics.

### Notes
Large files are not defects by themselves. Keep the current approach until a tested responsibility boundary can be extracted without weakening behavior.

## MAINT-002 — Active legacy runtime has broad lint exemptions

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-10`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Maintainability
- **Files:** `react-app/app/eslint.config.js`, `react-app/app/src/legacy/`
- **Related issues:** `MAINT-001`
- **Blocked by:** A violation inventory and targeted runtime checks
- **Blocks:** None
- **Estimated effort:** M, phased
- **Change risk:** Medium

### Summary
ESLint disables `no-unused-vars` and `no-empty` for all files under `src/legacy/`, even though that directory is active production infrastructure.

### Why it matters
Dead branches, stale imports, accidental empty catches, and abandoned variables are less visible in the largest runtime area. The exception also reinforces the false impression that the directory is disposable.

### Affected code and files

- `react-app/app/eslint.config.js`
- `react-app/app/src/legacy/`

### Evidence

- The ESLint override applies both disabled rules to the full active legacy tree.
- The canonical `check:site` lint step therefore cannot report those issue classes in this subsystem.

### Suggested direction
Inventory violations, classify intentional empty catches and compatibility fields, and narrow exemptions by file or line. Enable `no-unused-vars` first on leaf utilities and newly touched modules. Keep performance placeholders only when their contract is documented.

### Acceptance criteria

- New or modified legacy files receive normal unused-variable checking.
- Empty catches include explicit intent or targeted suppression.
- The broad directory-wide exemption is reduced or removed in measured phases.
- Lint and runtime audits remain green after each phase.

### Effort estimate
Medium, phased.

### Change risk
Medium. Mechanical deletion can remove compatibility or performance-sensitive fields.

### Confidence
High.

### Verification
Enable each rule on a narrow file set, review every new diagnostic, run lint and `npm run check:site`, then exercise the affected runtime path.

### Notes
Compatibility fields and intentionally swallowed optional-capability errors need targeted documentation or suppressions, not mechanical deletion.

Resolved in `MILESTONE-10` with a measured, behavior-neutral ratchet. Normal unused-variable checking now applies to 85 of 118 legacy files; 85 existing findings in 33 files are tracked by exact reviewed signatures. Strict empty-block checking records 138 existing catches in 28 explicitly reasoned best-effort files. Added, removed, shifted, substituted, aliased, traversing, or out-of-tree debt fails the canonical check and requires an explicit baseline review.

## MAINT-003 — Global and Portfolio CSS ownership overlaps

- **Status:** Planned
- **Roadmap milestones:** `MILESTONE-12`, `MILESTONE-16`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Maintainability
- **Files:** `react-app/app/public/css/main.css`, `react-app/app/public/css/portfolio.css`
- **Related issues:** `A11Y-004`, `A11Y-005`
- **Blocked by:** A selector ownership inventory and screenshot baselines
- **Blocks:** None
- **Estimated effort:** L, phased
- **Change risk:** High

### Summary
`public/css/main.css` is about 9,112 lines and still contains Portfolio-specific selectors. `public/css/portfolio.css` is about 2,977 lines and defines overlapping route, gate, hero, and project-sheet behavior. Production loads the global stylesheet before the route stylesheet, making source order part of the contract.

### Why it matters
It is difficult to know which file owns a Portfolio rule. Fixes can depend on cascade order, and visually safe local edits can affect another route or viewport. The design constitution names the intended ownership but the code has not fully converged.

### Affected code and files

- `react-app/app/public/css/main.css`
- `react-app/app/public/css/portfolio.css`
- Portfolio HTML entries and route components
- shared shell and overlay selectors

### Evidence

- Both stylesheets contain Portfolio route, gate, hero, and project-sheet selectors.
- `main.css` is the global bundle, but it contains route-specific blocks.
- Current behavior relies on Portfolio CSS loading after the global file.

### Suggested direction
Create a selector ownership inventory before moving rules. Keep shared shell primitives global and move only truly route-owned rules. Use screenshot diffs and computed-style assertions to make the cascade explicit. Do not combine this with a visual redesign.

### Acceptance criteria

- Every moved selector has one documented owner.
- Shared shell, overlay, and token primitives remain global.
- Portfolio-only presentation is isolated without duplicate declarations.
- Desktop/mobile and light/dark screenshots match approved baselines.
- Chromium and WebKit transition/drawer audits pass.

### Effort estimate
Large, phased.

### Change risk
High because visual regressions can be subtle and viewport-specific.

### Confidence
High.

### Verification
Compare computed styles and approved screenshots before and after every selector move. Run Portfolio gate, carousel, drawer, and Chromium/WebKit transition audits.

### Notes
Treat source order as current behavior. This is an ownership cleanup, not authorization for visual redesign or global CSS-module conversion.

## TEST-001 — Deploy validation needs a qualified blocking browser signal

- **Status:** In progress
- **Roadmap milestones:** `MILESTONE-01`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Testing
- **Files:** `.github/workflows/gh-pages.yml`, `package.json`, `scripts/`
- **Related issues:** `A11Y-001`, `A11Y-002`, `A11Y-003`, `ARCH-001`
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** M
- **Change risk:** Medium

### Summary
At baseline, the GitHub Pages workflow ran only the canonical source/lint/config/build gate. The strengthened workflow is now published and includes pull-request validation plus a bounded production-preview smoke on main pushes. One run qualifies; five later runs fail before smoke at the published lint-ratchet baseline. Blocking promotion and branch protection remain pending.

### Why it matters
The site depends on browser layout, Canvas backing stores, animation lifecycle, focus, computed CSS, history transitions, and browser-family behavior. A green build can still deploy a broken interaction or inaccessible route.

### Affected code and files

- `.github/workflows/gh-pages.yml`
- root `package.json` audit/certification scripts
- `scripts/` Playwright audits
- accessibility behavior across primary routes

### Evidence

- The deploy job runs `npm run check:site` and verifies output files.
- No browser is installed or launched in the workflow.
- No Axe or equivalent accessibility audit was found in the canonical gate.
- Existing browser audits are extensive but optional and can be expensive.

### Suggested direction
Add a small, stable production-preview smoke gate rather than running the full matrix on every deploy. Cover direct load and navigation for the five manifest-derived primary routes, runtime readiness, one Canvas backing-store assertion, and representative keyboard/focus semantics. Keep deep Chromium/WebKit matrices targeted or scheduled.

### Acceptance criteria

- CI builds and serves the production output before deploy.
- A browser loads Home, Portfolio, About, Contact, and Playground without runtime failure.
- Primary navigation and one SPA return path pass.
- Representative focus/landmark assertions fail on regressions.
- The smoke gate has a documented time budget and low flake rate.
- Deep visual/browser-family audits remain available for affected changes.

### Effort estimate
Medium.

### Change risk
Medium, mainly from CI duration and flake management.

### Confidence
High.

### Verification
Run the proposed smoke job repeatedly on pull requests or a test branch, record duration and flake rate, and prove that representative runtime, focus, and landmark regressions fail it.

### Notes
The repository already has deep browser audits. The gap is a small required release signal, not a lack of browser tooling.

`MILESTONE-01` was implemented locally on 2026-07-30 and hardened on 2026-07-31. The current smoke derives all five routes from the manifest, uses route-aware focus discovery, rejects unexpected console errors, covers unknown-path fallback, and retains failure artifacts. The published workflow remains advisory. Run `30616987233` is the first qualifying pass; five later main runs fail before smoke at the published lint-ratchet baseline. Four more qualifying runs plus blocking promotion and branch protection are still required.

## TEST-002 — Simulation lifecycle fault and WebKit geometry cases were not fully green

- **Status:** Resolved locally on 2026-07-31
- **Roadmap milestones:** None; discovered during `MILESTONE-14` integration
- **Severity:** Medium
- **Confidence:** High
- **Category:** Testing and runtime recovery
- **Files:** simulation-switch lifecycle audits and the route/simulation transition runtime
- **Related issues:** `TEST-001`, `PERF-001`
- **Blocked by:** A focused fault-recovery investigation and an evidence-based geometry tolerance decision
- **Blocks:** Release-grade simulation lifecycle certification; does not block the definition-only M14 extraction
- **Estimated effort:** S-M
- **Change risk:** Medium

### Summary

At discovery, Chromium and WebKit preload-fault cases reported `failure-did-not-recover-outgoing:repel-room`. Separate WebKit reduced-motion runs reproduced title-centre drift just above the former threshold.

### Evidence and decision

The corrected focused browser evidence passes Chromium/WebKit geometry and all 6 fault cases. The fault injector proves the intercepted preload request and the loading, retrying, and failed states while preserving the outgoing pit and preventing commit/publication. No production geometry or lifecycle change was required.

### Suggested direction and verification

Keep the analysis contract and focused browser matrix in the canonical local gate. Re-run the broader lifecycle and transition suites when lifecycle production code changes.

## PERF-001 — Runtime performance certification was unstable and red at baseline

- **Status:** Partially resolved on 2026-07-31
- **Roadmap milestones:** None; discovered during `MILESTONE-14` integration
- **Severity:** Medium
- **Confidence:** Medium
- **Category:** Performance testing
- **Files:** runtime-performance audit and simulation frame loops
- **Related issues:** `MAINT-001`, `TEST-002`
- **Blocked by:** A stable warm-up, sampling, and comparison contract
- **Blocks:** Release-grade performance certification; does not block the definition-only M14 extraction
- **Estimated effort:** M
- **Change risk:** Medium

### Summary

At discovery, runtime-performance samples missed the frame-time gate and varied enough that optimization would have been premature. The current contract separates cold and warm repeats, records the environment and exact artifact, caps measured cadence at the observed refresh ceiling, and fails every invalid repeat.

### Evidence and decision

The stable Chromium artifact is a mode-pass. The 2026-07-31 uncontended WebKit schema-v5 baseline measured the then-current 27 launchable entries with valid global and adjacent controls. Production release scoring now follows the current catalog's 16 `daily-rotation` entries, not collection or hidden lab surfaces. Four live modes failed that baseline: `repel-room`, `3d-sphere`, `flubber-blob`, and `rift-rings`. After focused hot-path corrections, those four modes passed 24 of 24 cold/warm repeats in `output/playwright/runtime-performance/targeted-live-webkit.json`, with valid global and adjacent controls and zero performance-gate failures.

### Suggested direction and verification

Keep the thresholds unchanged. The focused four-mode rerun now passes. Run the default 16-mode WebKit certificate once the host is uncontended. The first post-fix full attempt was stopped after the `magnetic` post-control fell to 41.79 rAF FPS with p95 73 ms and p99 127 ms; no artifact from that invalid attempt is accepted. The schema-v5 audit retains start calibration and fresh static rAF controls immediately before and after every mode block. Use `ABS_PERF_MODES` only for explicit lab diagnostics.

## DOC-001 — About and test documentation contradicts current code

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-03`
- **Severity:** Medium
- **Confidence:** High
- **Category:** Documentation
- **Files:** `DESIGN.md`, `SYSTEM-ARCHITECTURE.md`, `README.md`, `docs/development/DEV-WORKFLOW.md`
- **Related issues:** None
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** S
- **Change risk:** Low

### Summary
The production About route currently renders `AboutComingSoon`, while development loads the spatial narrative. `DESIGN.md` records this correctly in one section but later states that production uses the canonical spatial narrative. `SYSTEM-ARCHITECTURE.md` describes the current About route as React-owned Three.js. The README states that there is no unit-test suite even though the repository now contains substantial Node test coverage.

### Why it matters
Contributors can make changes against the wrong production surface or underuse the real test suite. Conflicting source-of-truth prose also weakens future audits and roadmap decisions.

### Affected code and files

- `DESIGN.md`
- `SYSTEM-ARCHITECTURE.md`
- `README.md`
- `docs/development/DEV-WORKFLOW.md`
- `src/routes/about/AboutRoute.jsx`
- Node test scripts

### Evidence

- The About component branches on `import.meta.env.DEV` and renders the coming-soon surface in production.
- Two sections of `DESIGN.md` describe different production About behavior.
- The architecture route table assigns production About to the point-world system.
- Thirty-seven files use Node test/assert APIs.

### Suggested direction
Choose and document the current production contract in one short canonical statement, then align the architecture, design, README, and workflow references. Separate “available development authoring surface” from “public production route.”

### Acceptance criteria

- All current documentation agrees on production and development About behavior.
- The README describes the actual Node/source/browser test layers.
- The workflow source-of-truth list includes canonical About content.
- A documentation review checks links and command names against `package.json`.

### Effort estimate
Small.

### Change risk
Low.

### Confidence
High.

### Verification
Check every changed command against `package.json`, every referenced path against the tree, and build in both development and production modes to confirm the documented About split.

### Notes
`MILESTONE-03` documents current behavior without requiring a launch decision. A future public About launch is deferred to separate product work under `HD-05`; if that decision changes, update code and all canonical documents together instead of only rewriting prose.

Resolved by `MILESTONE-03` on 2026-07-30. `README.md`, `DESIGN.md`, `docs/reference/SYSTEM-ARCHITECTURE.md`, and `docs/development/DEV-WORKFLOW.md` now agree that production renders `AboutComingSoon`, the spatial narrative/editor is development-only, and the repository has source/configuration, Node, and Playwright verification layers. Command, path, malformed-token, focused diff, and integrated site-gate checks passed.

## SEC-001 — Local write endpoints have inconsistent request hardening

- **Status:** Resolved
- **Roadmap milestones:** `MILESTONE-02`
- **Severity:** Low
- **Confidence:** Medium
- **Category:** Security
- **Files:** `react-app/app/vite.dev-admin-plugin.js`, `react-app/app/vite.config.js`
- **Related issues:** None
- **Blocked by:** None
- **Blocks:** None
- **Estimated effort:** S-M
- **Change risk:** Low

### Summary
The local Vite authoring server exposes several JSON write endpoints. The About persistence endpoint uses same-origin, content-type, payload-size, ETag, and atomic-write controls. Other authoring endpoints do not consistently apply the same request limits and origin checks.

### Why it matters
The server is intended for local use and the managed public mirror blocks `/api/*`, which materially limits exposure. Inconsistent middleware still makes accidental non-local binding, hostile local pages, or future endpoint reuse riskier than necessary.

### Affected code and files

- `react-app/app/vite.dev-admin-plugin.js`
- development authoring clients under routes and `src/legacy/modules/utils/`
- Studio public-mirror configuration

### Evidence

- About saves use ETag/`If-Match`, validation, size limits, and atomic replacement.
- Other configuration-save handlers accept JSON writes with a smaller set of shared guards.
- The public mirror guard returns 404 for `/api/*` and `/@fs/*`.
- There is no production write server.

### Suggested direction
Extract shared local-write middleware for same-origin checks, JSON content type, body limits, validation, safe paths, and consistent errors. Keep the public mirror deny rule as a separate outer boundary.

### Acceptance criteria

- Every local write endpoint uses shared origin, content-type, and payload-size checks.
- All file targets are fixed or allowlisted and remain inside canonical config roots.
- The public mirror continues to block `/api/*` and `/@fs/*`.
- Authoring save/reload and conflict-recovery tests pass.
- No production write endpoint is added.

### Effort estimate
Small to medium.

### Change risk
Low if introduced behind endpoint-level tests.

### Confidence
Medium.

### Verification
Add endpoint tests for origin, content type, payload size, invalid JSON, path containment, conflict responses, and the public-mirror deny boundary.

### Notes
This is defense in depth for a local-only surface. The audit found no production write server and does not classify the client-side gate as security.

Resolved by `MILESTONE-02` on 2026-07-30. Every local POST authoring route now uses one strict origin, JSON media-type, declared/streamed size, parse, endpoint-validation, and real-path containment contract. The focused 8-test contract is part of `npm run check:site`; it preserves valid temporary saves, About ETag/conflict/diagnostics, and the public mirror's `/api/*` and `/@fs/*` 404 boundary. Independent review findings were fixed and re-reviewed with no remaining findings.

## Simplification assessment

### Route metadata (`ARCH-001`)

**Current approach**
Route identity is repeated in Vite inputs, HTML/entry modules, route definitions, app descriptors, shell metadata, and catalogs. M05 now validates the relationships completely, but it does not remove the authored duplication.

**Simpler approach**
Use one source-readable manifest for shared route identity and make bundler-specific imports explicit consumers of that manifest. Add complete validation before removing any declaration.

**Why it is simpler**
It reduces duplication, omission risk, and the number of concepts required to add a route.

**Trade-offs**
A generated or shared manifest can obscure bundler imports if it becomes too dynamic. Keep lazy imports and route-specific behavior readable.

**Behavioural impact**
Runtime behavior should remain unchanged, except that unknown paths should stop resolving as valid Home routes.

**Recommendation**
Simplify later. Complete drift validation is now in place; consolidation and unknown-route behavior remain gated by M08 and `HD-01`.

### Central orchestrators (`MAINT-001`)

**Current approach**
The transition hook, control registry, and Portfolio application each centralize related but distinct responsibilities so timing and state stay coordinated.

**Simpler approach**
Extract stable policy/data seams behind the existing runtime interface, one responsibility at a time.

**Why it is simpler**
Smaller ownership surfaces improve testability and reduce hidden coupling without changing the top-level architecture.

**Trade-offs**
Premature extraction can create more indirection, split timing-sensitive state, and make frame behavior harder to reason about.

**Behavioural impact**
Runtime behavior must remain unchanged.

**Recommendation**
Investigate further, then simplify later only where characterization proves a stable seam.

### Global and Portfolio CSS (`MAINT-003`)

**Current approach**
Global and route-specific files share some Portfolio selectors, and source order resolves ownership conflicts.

**Simpler approach**
Keep shell/token primitives global and give each Portfolio-only selector one route-owned location.

**Why it is simpler**
It reduces duplication and makes cascade ownership discoverable.

**Trade-offs**
Moving a rule can change specificity, load order, inheritance, responsive overrides, or transition pixels even when declarations are unchanged.

**Behavioural impact**
Rendered behavior should remain pixel-equivalent.

**Recommendation**
Simplify later, after a selector inventory and approved screenshot baselines.

## Complexity budget

Every recommended change in this audit must improve at least one named property:

| Finding or action | Required complexity benefit |
| --- | --- |
| `A11Y-001` to `A11Y-005` | Improve accessibility and correctness with no added interaction model. |
| `ARCH-001` | Reduce duplication and route coupling; improve validation. |
| `MAINT-001` | Reduce responsibility density and improve testability without adding public layers. |
| `MAINT-002` | Improve static correctness and make intentional exceptions explicit. |
| `MAINT-003` | Reduce duplicate ownership and cascade coupling. |
| `TEST-001` | Improve release confidence with a bounded CI time budget. |
| `DOC-001` | Improve comprehension by removing contradictory authority. |
| `SEC-001` | Improve local security through one shared request contract. |
| `OPS-001` | Reduce repository operational cost and data-retention risk. |

If a proposed change does not deliver its listed benefit, it should not enter the roadmap.

## Performance assessment

The static audit did not confirm a user-visible performance regression. The Canvas, Portfolio, audio, and About systems contain deliberate pooling, fixed-step timing, worker preparation, and allocation-free contracts. Those constraints should be preserved.

The production build reports one size warning for the shared Three.js chunk at about 505 kB minified. It is code-split and primarily supports the About lab and spatial routes, so size alone is not evidence of a primary-route bottleneck. The most important measurement targets are initial primary-route transfer, transition readiness, continuous Canvas frame time, Portfolio input/animation cadence, About worker preparation, and memory after repeated SPA route cycles. Create a `PERF` issue only when profiling shows an observable budget failure or repeated unnecessary work.

## Directory and subsystem summaries

### Root, operations, and release tooling

**Purpose**
Coordinate installation, development, validation, browser certification, public preview, and explicit production publication.

**Responsibilities and data flow**
Root scripts call app-local lint/build commands and repository validators. The Studio CLI manages local Vite, a read-only mirror, and a Cloudflare tunnel. GitHub Actions installs the app package, runs the canonical gate, builds the About editor preview, verifies output, and deploys the static artifact.

**Important concepts**
Managed-process ownership, read-only public preview, canonical gate, explicit production authorization, and static Pages deployment.

**Strongest area**
Clear separation between save, commit, public development preview, and production publication.

**Main risks**
Tracked generated artifacts (`OPS-001`) and browser checks outside the deploy gate (`TEST-001`). Root and app package boundaries are functional but require contributors to follow the documented commands.

**Highest-priority findings**
`OPS-001`, then `TEST-001`.

**Learning note**
Use `npm run studio:status` before relevant work. A public development URL is not production. A push/publish requires explicit authorization.

### Application shell, route descriptors, and lifecycle

**Purpose**
Provide one stable physical shell and coordinate content owned by React and imperative runtimes.

**Responsibilities and data flow**
Entries mount `SiteApp`; route metadata selects a view/runtime; `StudioShell` keeps physical layers stable; the lifecycle hook starts and stops imperative ownership; the transition hook coordinates asynchronous route transactions.

**Important concepts**
Stable shell, route descriptor, transaction phases, runtime generation, abort, cleanup, readiness, and focus settlement.

**Strongest area**
The lifecycle bridge has explicit cancellation, cleanup, readiness, and stale-generation protection.

**Main risks**
Route registry drift (`ARCH-001`) and orchestration concentration (`MAINT-001`). Unknown paths currently collapse to Home.

**Highest-priority findings**
`ARCH-001`, then the characterization work required for `MAINT-001`.

**Learning note**
Do not remount the physical shell for a route change. Do not use React state for per-frame simulation data.

### Primary React route views

**Purpose**
Define semantic content, mount points, and route-specific React surfaces for Home, Portfolio, About, and Contact.

**Responsibilities and data flow**
Home and About receive virtual JSON content; Portfolio hosts an imperative application and runtime-fetched content; Contact is React-owned. Route views expose shell/runtime hooks and accessibility structure.

**Important concepts**
Route view descriptor, semantic content, imperative mount host, production/development About split, and shared primary navigation.

**Strongest area**
Routes have clear descriptor-level ownership and use the shared shell instead of independent page chrome.

**Main risks**
Landmark/heading inconsistency (`A11Y-003`), Home click-only controls (`A11Y-002`), and stale About documentation (`DOC-001`).

**Highest-priority findings**
`A11Y-002` and `A11Y-003`, then `DOC-001`.

**Learning note**
The current production About route is the coming-soon surface. The point-world narrative is a development authoring/playback system.

### Canvas 2D runtime under `src/legacy`

**Purpose**
Run Home simulations, physics, rendering, input, atmosphere, audio, visual title behavior, and development controls.

**Responsibilities and data flow**
Canonical config and content initialize shared runtime state. Pointer input feeds bounded simulation updates. Fixed-step physics mutates preallocated state. The render loop paints Canvas layers and publishes diagnostics/readiness. Mode modules plug into shared physics/render contracts.

**Important concepts**
Fixed timestep, bounded RAF, pooled state, mode contract, Canvas backing store, route lifecycle, and allocation-free hot path.

**Strongest area**
Performance assumptions are explicit: fixed-step integration, pooled resources, reused buffers, and allocation-free hot paths.

**Main risks**
Large control registry (`MAINT-001`) and broad lint exemptions (`MAINT-002`). The historical directory name can lead to unsafe modernization assumptions.

**Highest-priority findings**
`MAINT-002` in narrow tested slices; `MAINT-001` only after characterization.

**Learning note**
This is active infrastructure. Preserve data layout, cleanup, timing, and allocation behavior unless a benchmark proves a safe change.

### Portfolio runtime

**Purpose**
Present an orbital project deck and transition selected media into a project drawer without moving the stable shell.

**Responsibilities and data flow**
Portfolio content loads from canonical JSON. The runtime computes orbital geometry, input inertia, card state, entrance readiness, selection, drawer handoff, focus return, and cleanup.

**Important concepts**
Orbital deck, drag/inertia, entrance readiness, selected-media geometry handoff, project sheet, reversal, reduced motion, and focus return.

**Strongest area**
The selected-media geometry handoff, reversal behavior, and Button Bar layer boundary are explicit contracts.

**Main risks**
Responsibility density in `src/legacy/modules/portfolio/app.js` (`MAINT-001`), CSS ownership overlap (`MAINT-003`), reading text selection (`A11Y-005`), and route semantics (`A11Y-003`).

**Highest-priority findings**
`A11Y-003` and `A11Y-005`, then the preparatory work for `MAINT-003` and `MAINT-001`.

**Learning note**
Do not replace the drawer handoff with a generic modal transition. Preserve reduced motion and focus return.

### About narrative lab and editor

**Purpose**
Author, migrate, prepare, preview, and safely persist the spatial About narrative.

**Responsibilities and data flow**
Canonical JSON passes through schema normalization and migration into a runtime plan. Worker preparation builds correspondence/resources for the point world. The editor saves through a local optimistic-concurrency endpoint and keeps browser recovery checkpoints.

**Important concepts**
Schema v5, migration boundary, runtime plan, correspondence worker, fixed point pool, optimistic concurrency, atomic persistence, and recovery envelope.

**Strongest area**
Data integrity: validation, schema migration, ETag conflict detection, atomic writes, and recovery state.

**Main risks**
Large renderer/editor/schema modules, compatibility code that can be mistaken for dead code, and documentation that overstates its production role (`DOC-001`).

**Highest-priority findings**
`DOC-001`. No About structural refactor should begin without fixture and allocation coverage.

**Learning note**
Do not remove old schema/compiler modules until migration fixtures prove they are unused. Preserve publication and recovery behavior.

### Configuration, content, and local authoring API

**Purpose**
Keep design and editorial state editable, validated, reproducible, and buildable into static runtime output.

**Responsibilities and data flow**
Authored JSON is loaded by virtual modules or runtime fetch. Development APIs save canonical files. Build scripts flatten design configuration. Validators compare source, generated output, and component expectations.

**Important concepts**
Canonical authored source, virtual content module, runtime fetch, normalized save, generated flattening, ETag, and browser storage as non-authoritative state.

**Strongest area**
The canonical-versus-generated ownership contract is unusually clear and has automated parity checks.

**Main risks**
Inconsistent hardening across local write endpoints (`SEC-001`) and the possibility of browser storage being mistaken for authored truth.

**Highest-priority findings**
`SEC-001` as a small defense-in-depth improvement.

**Learning note**
Never hand-edit generated config. Verify live apply, save, reload, flattening, and preview together.

### CSS and design system

**Purpose**
Apply canonical tokens to the stable shell, route surfaces, simulations, overlays, and responsive states.

**Responsibilities and data flow**
Design JSON produces runtime config while CSS tokens and route styles consume the approved visual contract. `DESIGN.md` is the production constitution and outlier register.

**Important concepts**
Token ownership, shell/window theme separation, invariant frame, route stylesheet ownership, source order, layer contract, and responsive breakpoint.

**Strongest area**
The shell/window theme separation, black frame invariance, font ownership, layer rules, and custom cursor are precisely documented.

**Main risks**
Global focus suppression (`A11Y-001`), light supporting contrast (`A11Y-004`), and global/Portfolio CSS overlap (`MAINT-003`).

**Highest-priority findings**
`A11Y-001` first, then `A11Y-004`; prepare `MAINT-003` separately.

**Learning note**
Do not alter wall geometry, frame colors, layer ownership, or font scope as a side effect of cleanup.

### Tests, validators, and browser audits

**Purpose**
Detect source, schema, runtime, visual, route, Canvas, theme, and transition regressions.

**Responsibilities and data flow**
Node tests and source validators inspect contracts without a browser. Build checks flatten config and compile every Vite entry. Playwright scripts exercise production preview across routes, themes, viewports, and browser families. Screenshot output is gitignored.

**Important concepts**
Canonical source gate, production preview, route readiness, browser-family matrix, screenshot certification, strict RAF, and targeted audit selection.

**Strongest area**
Breadth and specificity of project-native audits, especially for Canvas backing stores, theme/frame invariance, and transition flows.

**Main risks**
The deploy workflow uses only the non-browser gate (`TEST-001`), browser suites can be costly, and no canonical automated accessibility rule set was found.

**Highest-priority findings**
`TEST-001`.

**Learning note**
Choose checks proportional to the contract. A green build is not visual parity.

### Documentation, portfolio knowledge, research, and task history

**Purpose**
Preserve architecture rules, design decisions, operational workflows, evidence-backed portfolio knowledge, and implementation history.

**Responsibilities and data flow**
Focused references define current contracts. Portfolio routing selects evidence sources and enforces confirmed claims. Research/tasks capture supporting and historical material.

**Important concepts**
Canonical reference, design constitution, source-linked portfolio fact, candidate claim, contradiction, historical evidence, and active versus archived task.

**Strongest area**
The portfolio knowledge system distinguishes raw evidence, candidate claims, contradictions, and confirmed public facts.

**Main risks**
Current prose can drift from code (`DOC-001`), and historical artifacts can be mistaken for active requirements.

**Highest-priority findings**
`DOC-001`.

**Learning note**
Use `docs/portfolio/router.yaml` before portfolio fact work. American Heart Association final-copy work remains on hold until explicitly released.

## Closed or superseded historical concerns

The following older concerns were re-checked and should not be carried into a roadmap as current defects:

- Root package metadata now defines supported Node and npm engine versions.
- App scripts are real lint/build tasks rather than placeholder commands.
- The canonical site gate now validates simulation catalogs and multiple runtime contracts.
- GitHub Pages runs the canonical `check:site` gate.
- Daily Simulation uses the current route-backed runtime and catalog architecture.

The root package still does not declare a `packageManager` field. This is a low-priority developer-experience improvement, not a release blocker because lockfiles, engines, and canonical install commands are present.

## What should not change

- Do not replace the React shell plus imperative runtime bridge with a single rendering model.
- Do not delete or wholesale rewrite `src/legacy` because of its name.
- Do not move per-frame physics, pointer, Canvas, or orbital state into React state.
- Do not hand-edit generated configuration.
- Do not let the public development mirror expose authoring APIs or filesystem paths.
- Do not make the stable wall, frame, Button Bar, or outside shell transition with route content.
- Do not alter the black frame, theme ownership, cursor, typography scope, or layer stack during unrelated refactors.
- Do not simplify Portfolio by removing selected-media handoff, reversal, reduced motion, or focus return.
- Do not remove About migration/compatibility modules without fixture-backed proof.
- Do not treat client-side gates as authentication.
- Do not publish, push, or commit as part of a refactor unless explicitly authorized.

## Safe modernization opportunities

These changes have favorable risk-to-value ratios when done independently:

1. Fix `A11Y-002` and `A11Y-005` as small semantic/style patches.
2. Reconcile documentation under `DOC-001` without changing behavior.
3. Extend route validation to detect the two current `StudioShell` omissions before consolidating route metadata.
4. Add a small browser smoke job under `TEST-001`; do not begin with the full matrix.
5. Add shared request guards to local write endpoints under `SEC-001`.
6. Inventory and stop tracking current generated artifacts under `OPS-001` before discussing history rewrite.
7. Narrow lint exemptions only in leaf modules that are already under test.
8. Build a CSS selector ownership report before moving any Portfolio rule.
9. Add characterization tests before extracting responsibilities from the large orchestrators.

## Prioritized improvement order

### Phase 1 — Correctness and inclusion

- `A11Y-001` through `A11Y-005`
- `ARCH-001` validator and current drift fix
- `DOC-001`

### Phase 2 — Release confidence and local hardening

- `TEST-001`
- `SEC-001`
- current-tree portion of `OPS-001`

### Phase 3 — Maintainability foundations

- `MAINT-002` in narrow slices
- selector ownership inventory for `MAINT-003`
- characterization seams for `MAINT-001`

### Phase 4 — Behavior-preserving structural work

- route manifest consolidation after validator coverage
- phased CSS ownership cleanup
- phased orchestrator extraction
- optional repository history cleanup after explicit coordination

## Verification model for roadmap work

Every milestone should define its own proof before implementation.

| Change class | Minimum proof |
| --- | --- |
| Documentation only | Link/command check, final diff review. |
| Route metadata | `npm run check:site`, direct load for affected routes, SPA navigation and history audit. |
| Accessibility | DOM semantics, keyboard pass, focus screenshots, relevant browser audit. |
| Theme/frame/CSS | Build, palette/surface audits, Chromium and WebKit frame/theme matrices, screenshot inspection. |
| Canvas/runtime | `check:site`, Canvas SPA audit, strict RAF/performance check where timing changes. |
| Portfolio | Portfolio gate, carousel, drawer, transition-flow audits, reduced-motion path. |
| About authoring | Schema fixtures, save/conflict/recovery tests, `check:about-production`, production preview. |
| Release workflow | Clean CI run, deploy workflow result, and post-deploy `beck.fyi` verification. |
| Repository hygiene | Fresh clone/install/gate, before/after size, evidence retention record. |

## Final audit summary

### Overall architecture summary

The site is a Vite multi-entry static application whose entries mount one React application shell. React owns route and lifecycle coordination; route-specific imperative systems own continuous Canvas, physics, Portfolio, and other high-frequency state. Canonical JSON and design tokens feed both source modules and runtime loaders, while local authoring APIs save files only in development. Production is a static GitHub Pages artifact with no database, server API, user accounts, or real authentication.

### Repository coverage

The audit inspected the root/tooling boundary, all entry and route registries, primary route views, shell/lifecycle/transition architecture, configuration and persistence paths, active Canvas and Portfolio boundaries, the About narrative pipeline, CSS ownership, tests/audits, deployment, generated/tracked file classes, and focused source-of-truth documentation. Individual media files, historical captures, every simulation algorithm, every shader body, and archived research content were classified but not each line-read.

### Areas not fully understood or not verified in a browser

- The intended date or decision for replacing the public About coming-soon route is not recorded consistently.
- The real rendered contrast across animated atmosphere frames was not sampled in this documentation-only pass.
- Keyboard focus, landmarks, and selection behavior were confirmed from source but not re-run across the full Chromium/WebKit matrix.
- Production transfer, frame-time, memory, and route-cycle performance were not profiled, so no `PERF` defect is claimed.
- Historical browser captures were not exhaustively inspected for sensitive content; only targeted trace/network key searches were performed.
- Every individual simulation mode, shader implementation, binary asset, and archived task was not line-read because their shared boundaries were sufficient for this architecture audit.

### Largest complexity hotspots

1. `src/legacy/modules/ui/control-registry.js` — about 6,753 lines of schema, persistence, rendering, binding, and synchronization.
2. `src/legacy/modules/portfolio/app.js` — about 4,109 lines of data, geometry, input, animation, accessibility, and drawer coordination.
3. `src/hooks/useShellRouteTransition.js` — about 3,175 lines of transaction, history, readiness, recovery, focus, and prewarming behavior.
4. `public/css/main.css` plus `public/css/portfolio.css` — about 12,089 lines with overlapping Portfolio ownership.
5. About point-world, editor, and schema modules — large but protected by strong domain tests and explicit contracts.

### Highest-risk findings

1. `A11Y-001` — a global focus fallback is suppressed.
2. `OPS-001` — ignored generated artifacts remain tracked and make repository cleanup sensitive.
3. `ARCH-001` — repeated route metadata remains coupled even though M05 repaired and now detects current drift.
4. `TEST-001` — the deploy gate does not exercise a browser or accessibility rules.
5. `MAINT-001` and `MAINT-003` — high change risk if treated as rewrites instead of phased, characterized work.

### Simplest high-value improvements

1. Make Home legend filters semantic and keyboard-operable (`A11Y-002`).
2. Restore text selection only in Portfolio reading content (`A11Y-005`).
3. Reconcile About and test documentation (`DOC-001`).
4. Keep the completed route validator as the prerequisite for any later registry consolidation (`ARCH-001`).
5. Add one bounded production-preview browser smoke job (`TEST-001`).

### Areas that should not be changed casually

The stable shell/layer model, React-to-imperative lifecycle bridge, Canvas state and allocation contracts, Portfolio selected-media handoff, About schema/migration/persistence boundary, canonical-versus-generated configuration flow, public-mirror deny boundary, and locked visual constitution all need focused proof before change.

### Areas safe to modernise with focused scope

Semantic Home controls, Portfolio reading selection, contradictory documentation, route-registry validation, shared local request guards, small browser smoke coverage, and leaf-level lint enforcement are suitable first milestones. Repository untracking is safe only after an evidence inventory; history rewriting is not a first milestone.

## Audit scores

Scores describe the repository at this baseline, including both production code and supporting systems.

| Area | Score | Rationale |
| --- | --- | --- |
| Code quality | 7.5/10 | Strong runtime contracts, clear naming, thoughtful performance work, and mature failure handling; reduced by accessibility defects, active-code lint gaps, and responsibility density. |
| Maintainability | 6.5/10 | Good modular foundations and focused references; reduced by route duplication, CSS overlap, large orchestrators, and repository artifact bloat. |
| Test confidence | 7.0/10 | Strong source/unit/build checks and many targeted browser audits; reduced because release CI does not run a browser or canonical accessibility checks. |
| Documentation quality | 7.5/10 | Exceptionally detailed design/architecture references and evidence systems; reduced by current About/test contradictions and historical artifact noise. |

## Readiness statement

The codebase is ready for roadmap planning. Use the permanent issue IDs in this document as the backlog keys. Start with accessibility, route-registry validation, documentation truth, and a small browser release smoke. Treat large orchestrator, CSS, and repository-history work as separate, characterization-first programs with explicit rollback and browser evidence.

## Independent verification update — 2026-07-30

This update preserves the baseline audit above. `docs/refactoring-review.md` contains the full evidence, architecture comparison, milestone verdicts, and scores.

### Superseding status table

| Issue | Independent status | Evidence |
| --- | --- | --- |
| `OPS-001` | Verified resolved | M09 commit `7fdb9ec6`; current ignored-tracked inventory is zero. |
| `A11Y-001` | Verified resolved locally | The final coherent M07 report passes all 40 route/browser/theme/viewport states. |
| `A11Y-002` | Verified resolved | Native pressed controls and state synchronization are present. |
| `A11Y-003` | Verified resolved | Five primary direct loads passed landmark and heading checks. |
| `A11Y-004` | Verified resolved locally | M07 rendered-pixel and focus evidence passes all 40 states. |
| `A11Y-005` | Verified resolved | Portfolio reading content is selectable while interaction surfaces remain protected. |
| `ARCH-001` | Verified resolved | Manifest ownership and 55 fail-closed drift fixtures pass. |
| `ARCH-002` | Verified resolved | Standalone destinations decline shared-shell SPA handling. |
| `MAINT-001` | Partially resolved; reopened | Stable seams landed. The current hook, registry, and Portfolio orchestrator are 2,892, 6,269, and 3,707 lines. Portfolio presentation readiness now has focused ownership and fault coverage; the remaining large surfaces still require failure-driven boundaries rather than line-count splitting. |
| `MAINT-002` | Verified resolved | Exact lint ratchet and mutation fixtures pass. |
| `MAINT-003` | Verified resolved locally for approved M16 scope | Fourteen approved Portfolio blocks moved ownership. Rule counts changed 1605/483 to 1589/499, overlaps 428 to 413, exact overlaps 36 to 16, and both approved residual-conflict counts are zero. M12/M16 browser evidence retained computed signature `7de7352b7ce1e3c7a7c0a6c9dc9a65eba19fbf1920c692e85c56f91172219d01`. |
| `TEST-001` | Partially resolved | The workflow is published and has one qualifying smoke. Five later main runs fail at the published lint-ratchet baseline; four more qualifying runs, blocking promotion, and branch protection remain pending. |
| `TEST-002` | Verified resolved locally | Chromium/WebKit geometry and all 6 lifecycle fault cases pass. |
| `PERF-001` | Partially resolved | Chromium has a stable mode-pass artifact. The four live WebKit baseline failures pass their focused 24/24-repeat post-fix certificate with valid controls. The canonical site gate passes. A full 17-mode certificate remains pending after an invalid-host attempt was discarded. |
| `DOC-001` | Verified resolved | About production/development truth is consistent; later programme-record drift is tracked as `DOC-002`. |
| `SEC-001` | Verified resolved | Shared local-write hardening passes 12/12 focused checks. |

### New issue register

#### ARCH-003 — Unknown direct URLs can crash initial route state

- **Category:** Architecture / correctness
- **Severity:** Medium
- **Status:** Verified resolved locally on 2026-07-31
- **Evidence:** Null-route startup now preserves the unknown URL and uses an explicit Home fallback state. The production fallback-host browser audit and route-transition tests pass.
- **Acceptance:** Define explicit null-route startup behavior and pass a browser integration test in which the host returns the app shell for an unknown path.
- **Effort/risk:** Small / low.

#### ARCH-004 — Active legacy runtime retains a cyclic component

- **Category:** Architecture
- **Severity:** Medium
- **Status:** Resolved locally
- **Evidence:** A focused mode-button seam reduced the active component from 12 modules/23 internal edges to 9/15. A route-neutral scene-pointer event port reduced it to 5/8. A mode-runtime bridge then removed the final physics-to-controller dependency and reduced the active graph to zero cyclic components. Event-port, runtime-hook, graph, and mutation contracts pass.
- **Acceptance:** Document the cycle and select at most one stable dependency-inversion seam before implementation.
- **Effort/risk:** Small audit; medium implementation / high if broadened.

#### A11Y-006 — WebKit Portfolio gate can blur its own content

- **Category:** Accessibility / visual correctness
- **Severity:** Medium
- **Status:** Verified resolved locally on 2026-07-31
- **Evidence:** The initial M12 WebKit capture reproduced foreground blur. Removing foreground gate blur/scale animation keeps the gate title, instructions, and code cells sharp over the independently blurred route. The final 40-state M07 report and refreshed M12 browser evidence pass.
- **Acceptance:** Focused WebKit diagnosis plus accepted desktop/mobile light/dark evidence before M12 refresh and M16.
- **Effort/risk:** Small-medium / medium visual risk.

#### DEP-001 — Development and build dependencies have known advisories

- **Category:** Dependencies / security
- **Severity:** High for authoring/build exposure; low for shipped runtime
- **Status:** Verified resolved locally on 2026-07-31
- **Evidence:** Controlled supported updates raised the Node baseline to 22.19 or later. Root and app full and production-only audits report zero findings. Dependency trees, lint, build, and the canonical site gate pass.
- **Primary advisory records:** [Vite](https://github.com/advisories/GHSA-4w7w-66w2-5vf9), [Rollup](https://github.com/advisories/GHSA-mw96-cpmx-2vgc), [basic-ftp](https://github.com/advisories/GHSA-5rq4-664w-9x2c), and [sharp](https://github.com/advisories/GHSA-f88m-g3jw-g9cj).
- **Acceptance:** Apply controlled supported updates, document any reviewed exceptions, and rerun the full canonical and browser gates. Do not apply a blind forced audit fix.
- **Effort/risk:** Medium / medium update churn.

#### DOC-002 — Programme evidence drifted from the current tree

- **Category:** Documentation
- **Severity:** Medium
- **Status:** Resolved for the current programme records on 2026-07-31
- **Evidence:** Current summaries now record 30/25/22/16 route ownership and 129 files with zero unused-variable findings and zero empty catches. Strict mutation probes preserve the zero-debt boundary; earlier values remain only as labelled historical snapshots.
- **Acceptance:** Label historical counts as snapshots and derive volatile current counts from executable checks where practical.
- **Effort/risk:** Small / low.

#### OPS-002 — Refactor work has no isolated integration boundary

- **Category:** Operations / release process
- **Severity:** High
- **Status:** Open; blocks release approval
- **Evidence:** Only M09 has a dedicated commit. The pre-review snapshot contained 68 modified and 37 untracked status entries, including central refactor source mixed with About Director and Playground work.
- **Acceptance:** Preserve all user work, create reviewable commit boundaries, reconcile local/remote commit topology, and reproduce the integrated checks from that state.
- **Effort/risk:** Medium / medium due overlapping files.

#### OPS-003 — Multi-file local authoring writes are not atomic

- **Category:** Operations / local data integrity
- **Severity:** Medium
- **Status:** Verified resolved locally and independently accepted on 2026-07-31
- **Evidence:** A serialized, journaled transaction boundary now covers design writes, simulation writes/deletion, and stage/review/issues writes. All 30 focused containment, failure, rollback, recovery, cleanup, and concurrency checks pass.
- **Acceptance:** Serialize affected operations, use temporary-file atomic replacement where practical, and add injected failure/concurrency tests.
- **Effort/risk:** Medium / medium.

#### TEST-003 — Release-smoke focus helper drifted from route contracts

- **Category:** Testing / release confidence
- **Severity:** High
- **Status:** Verified resolved locally on 2026-07-31
- **Evidence:** The smoke derives five routes from the manifest, uses route-aware focus discovery and a DOM-derived traversal limit, rejects unexpected console errors, and passes the production smoke plus forced-failure contract probes.
- **Acceptance:** Parameterize focus expectations by route, reject unexpected console errors, pass normal and forced-failure smoke runs, and add the current five-route smoke to reviewable CI.
- **Effort/risk:** Small / low.

#### TEST-004 — Canonical local gate omitted stronger runtime contracts

- **Category:** Testing / developer confidence
- **Severity:** Medium
- **Status:** Resolved locally on 2026-07-31
- **Evidence:** `studio:check` previously ran the base About suite but not `check:about-narrative-hardening`; the omitted suite exposed one stale surface-rise assertion after the deliberate grid-preserving handoff change. The assertion now matches that authored behavior, and About passes 398/398 plus hardening 55/55. The canonical gate also now includes the already-passing simulation-switch transaction contract (14/14) and Portfolio CSS ownership contract (14/14).
- **Acceptance:** A visitor-affecting runtime, transition-recovery, or accepted CSS-ownership contract cannot fail while the canonical local gate passes.
- **Effort/risk:** Small / low; about nine seconds of additional deterministic local checks.
