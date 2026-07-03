# Homepage Layer Stack And Semantic Naming Implementation Prompt

Copy everything below this line into GPT-5.5 / Codex when you are ready to implement the revised homepage layering work.

---

You are working in:

`/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website`

You are a senior coding agent implementing a narrow but high-risk visual architecture change to the Alexander Beck Studio homepage. Work carefully. Inspect the real repository first, preserve existing behavior unless explicitly changed below, and do not make broad refactors that are not required for this goal.

## Mission

Implement the revised homepage layer stack so the homepage has:

1. a semantic layer model matching the revised blueprint;
2. a new contrast veil layer above the ball/title canvas and below all UI;
3. the homepage title/subtitle visually rendered through the ball canvas/depth pipeline;
4. the existing semantic and accessible title preserved as the source of truth;
5. no reckless global rename of stable compatibility surfaces.

Use the visual blueprint as an intent reference for layer order:

`/var/folders/rw/9jhrlh_10712yxzp7d29g8440000gn/T/codex-clipboard-cd3e584d-5f6b-4e9e-ab77-f408bb19fc18.png`

If that temporary clipboard path has expired, use the attached blueprint in the Codex thread or the generated asset below.

If the generated blueprint asset exists, also inspect:

`output/imagegen/homepage-layer-blueprint-revised-isometric.png`

The blueprint is not a pixel spec and not a request to add illustrative layers to the live page. It is a conceptual map for z-order, ownership, and naming.

## Target Layer Contract

The live homepage should resolve to this conceptual stack, bottom to top:

1. **Base Frame**: browser background and outer frame.
2. **App Scene Transform Group**: the scene container that transforms/contains the whole scene.
3. **Simulation Wall + Scene Effects**: wall surface, lighting, gradients, shared scene atmosphere, and post-processing-style effects.
4. **Ball Canvas**: simulation balls plus the visually rendered homepage title/subtitle inside the canvas/depth render path.
5. **Contrast Inner-Shadow Veil**: new layer; above Ball Canvas and below UI; pointer-transparent.
6. **UI Layer**: top chrome, simulation switcher pill, center links, footer controls.
7. **Overlay Layer**: portfolio sheet host and quote viewport host.
8. **Modal Layer**: modal blur/content, highest layer.

Do not create visible debug panels, decorative isometric layers, helper outlines, or explanatory overlays in the product. The stack above is an implementation contract, not a new UI feature.

## Required Reading Before Editing

Read these files before proposing or editing:

- `AGENTS.md`
- `docs/reference/LAYER-STACKING.md`
- `docs/reference/CANVAS-RUNTIME.md`
- `docs/reference/MODES.md`
- `docs/reference/SIMULATION-DESIGN-GUIDELINES.md`
- `docs/reference/MATERIAL-PRESENCE.md`
- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/PARITY-CONTRACT.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/COMPONENT-LIBRARY.md`
- `docs/reference/SITE-STYLEGUIDE.md`
- `react-app/app/src/components/app/StudioShell.jsx`
- `react-app/app/src/routes/home/HomeRoute.jsx`
- `react-app/app/src/hooks/useShellRouteTransition.js`
- `react-app/app/src/legacy/modules/rendering/title-depth.js`
- `react-app/app/src/legacy/modules/physics/engine.js`
- `react-app/app/public/css/main.css`
- `react-app/app/public/css/tokens.css`
- `scripts/audit-pointer-title-depth.mjs`
- `package.json`

Use `rg` for discovery. Do not guess selectors, event names, audit hooks, or z-indexes.

## Non-Negotiable Constraints

- Start with `git status --short`. The worktree may already be dirty. Do not revert, overwrite, or reshape unrelated user changes.
- Do not hand-edit generated config outputs. `react-app/app/public/config/design-system.json` is the authored source when config is truly needed.
- Preserve the portfolio drawer stacking contract: portfolio sheet host must remain above header/footer route chrome.
- Preserve modal stacking and the two-layer modal blur/content architecture.
- Preserve `useShellRouteTransition` as the single transition owner.
- Preserve accessibility. Canvas text is visual only. Keep a semantic DOM title/subtitle source available to screen readers and to any route readiness or audit code that still needs measurable text geometry.
- Reuse or extend the existing title-depth contract. Do not create a second competing title-depth system.
- Do not rewrite the simulation engine for modernization.
- Do not add thin stroked helper lines, cursor rings, field outlines, or scaffolding visuals to explain the simulation.
- Do not replace material motion with static illustration.
- Do not claim success until verification has run or the exact blocker is stated.

## Semantic Naming Policy

The prior direction was to remove outdated "ABS" layer nomenclature. Implement that as a controlled semantic migration, not a blind repository-wide search-and-replace.

Classify every candidate name before changing it:

- **Product-facing or documentation layer names**: must use semantic names from the target layer contract.
- **New code introduced for this work**: must use semantic names such as `app-scene`, `simulation-wall`, `ball-canvas`, `simulation-contrast-veil`, `ui-layer`, `overlay-layer`, and `modal-layer`.
- **Existing public compatibility surfaces**: do not rename blindly. This includes selectors, data attributes, window globals, custom events, CSS custom properties, audit environment variables, and script hooks such as `#abs-scene`, `data-abs-*`, `abs:*`, `__ABS_*`, `ABS_*`, `.abs-*`, and `--abs-*`.
- **Existing compatibility surfaces may be renamed only if** every consumer is found, updated, documented, and verified in the same change. If the rename would become broad or risky, keep a temporary compatibility alias and document the follow-up.

Preferred approach:

1. Rename or introduce semantic names at the layer boundaries touched by this work.
2. Keep compatibility aliases only where they protect audits, routes, or external hooks.
3. Update docs so the conceptual model uses semantic names and legacy names are clearly marked as compatibility shims, not product language.
4. Add a final `rg` audit for stale layer terminology and list any intentional compatibility leftovers.

Do not leave visible UI, docs, or new implementation comments using "ABS" as layer terminology.

## Phase 0: Preflight And Inventory

Run:

```bash
git status --short
rg -n "#abs-scene|\\.abs-scene|data-abs-|abs:|__ABS_|ABS_|\\.abs-|--abs-|hero-title|simulation-front-depth-canvas|frame-vignette|portfolio-sheet-host|quote-viewport-host" .
```

Create a short implementation note for yourself before editing:

- current DOM order around `#simulations`, `.frame-vignette`, `.fade-content`, `#portfolio-sheet-host`, and `#quote-viewport-host`;
- current z-index values for canvas, title, frame vignette, UI, overlay hosts, and modals;
- current title-depth behavior by mode;
- exact compatibility names that will stay temporarily;
- exact names that will be migrated in this pass.

If the inventory shows the semantic rename is larger than the visual layer/title work, split the rename into a clearly documented compatibility phase instead of forcing a fragile mega-diff.

## Phase 1: Define The Layer Contract In Code

Update the shell/home structure only as much as needed to make the layers explicit.

Expected outcome:

- The app scene container has a semantic layer role/name in markup or class structure.
- The simulation wall/effects layer remains owned by the shell/canvas runtime, not by scattered page-local wrappers.
- The ball canvas remains the simulation material layer.
- The new contrast veil is an explicit named layer.
- UI chrome remains above the veil.
- overlay hosts remain above UI.
- modal hosts remain highest.

Implementation guidance:

- Prefer adding a small semantic class or wrapper over moving large DOM subtrees.
- Keep `#portfolio-sheet-host` and `#quote-viewport-host` as siblings in the documented stacking relationship unless the docs and audits prove another structure is valid.
- If renaming `#abs-scene` or `.abs-scene`, update all direct consumers and keep compatibility selectors only where required during migration.
- Do not alter route composition, portfolio mounting, or modal mounting except where the layer contract requires a documented selector update.

## Phase 2: Add The Contrast Inner-Shadow Veil

Add a new named layer:

`Contrast Inner-Shadow Veil`

Implementation requirements:

- It sits above the ball canvas/title visual material.
- It sits below all route UI, top chrome, simulation switcher, center links, footer controls, overlays, and modals.
- It is `pointer-events: none`.
- It uses the same color family as the current background/inner wall surface.
- Its maximum edge opacity is 60%.
- Its edge shadow reaches inward by about 25% of the viewport on both axes.
- It has a strong blur so the falloff is soft, not a hard vignette.
- It respects the inner frame radius and squircle/corner-shape system where supported.
- It does not replace the portfolio drawer overlay, modal blur, or route transition overlays.

Suggested CSS shape:

- Use a named element such as `.simulation-contrast-veil`.
- Use inset shadows or pseudo-elements with CSS variables for:
  - veil color;
  - max opacity;
  - horizontal reach;
  - vertical reach;
  - blur strength;
  - radius.
- Prefer existing surface tokens. If a new token is needed, add it at the correct authored source and document it.

Acceptance checks:

- On desktop and mobile, UI text over balls is easier to read at the edges and does not look like a separate dark panel.
- The veil does not intercept pointer events.
- The veil remains below `.fade-content` / UI and below overlay hosts.
- The veil does not create a second frame border.
- The veil does not hide or flatten the balls in the center of the viewport.

## Phase 3: Render The Homepage Title/Subline Through The Canvas

Goal:

The visible homepage title and subtitle should be rendered in the Ball Canvas layer so balls can exist both behind and in front of the title in depth-aware modes.

Preserve:

- semantic title text;
- route readiness checks;
- audit hooks;
- keyboard/screen-reader accessibility;
- reduced-motion expectations;
- current responsive sizing and typography.

Implementation requirements:

1. Keep a semantic DOM source of truth for the title and subtitle.
   - The existing `<h1 id="hero-title">` may remain as the source.
   - If it becomes visually hidden, use an accessibility-safe pattern and keep it measurable if `title-depth.js` or audits require geometry.
   - Do not remove `#hero-title` unless every dependent route, audit, transition, and accessibility path is deliberately replaced.

2. Reuse or extend `title-depth.js`.
   - It already maps the DOM title plane into canvas coordinates.
   - Extend this contract so the canvas renderer can draw text at the same position as the current shell hero slot.
   - Do not introduce a parallel geometry owner.

3. Add a canvas title renderer.
   - It should draw `Alexander Beck.` and `Creative. Technologist.` from the semantic DOM source or a single shared content source.
   - It should match the existing font family, weight, sizing, color, opacity, letter spacing, and responsive transform as closely as possible.
   - It should be DPR-aware and avoid blurry text.
   - It should avoid hot-path allocations in the animation loop. Cache metrics and only recompute when viewport, font load, title source, mode, or relevant CSS variables change.
   - It should handle font loading gracefully.

4. Preserve mixed-depth behavior.
   - Existing depth-aware modes allow balls to appear behind and in front of the title plane.
   - The canvas title must be drawn between the behind-ball pass and the front-ball pass, or the existing front-depth canvas must be adapted so the visual result is equivalent.
   - For non-depth modes, preserve the current intended title/canvas relationship unless the layer contract explicitly changes it.

5. Update audits if needed.
   - `scripts/audit-pointer-title-depth.mjs` should still verify title depth behavior.
   - If the audit currently assumes DOM-visible text, update it to check both the semantic title source and the visual canvas/depth result.

Acceptance checks:

- The visible title is not duplicated.
- Screen readers still have a clear homepage heading.
- The canvas title aligns with the previous shell hero slot.
- Depth-aware modes still show some balls behind and some in front of the title.
- The title does not shimmer, jump, blur excessively, or desync during resize/navigation.
- The route transition system still recognizes the page as ready.

## Phase 4: Controlled Semantic Rename

After the veil and canvas title are stable, complete the semantic naming cleanup only where safe.

Create a migration table in your working notes:

| Old name | New semantic name | Type | Consumers updated | Compatibility alias? | Reason |
| --- | --- | --- | --- | --- | --- |

Candidate semantic names:

- `#app-scene` / `.app-scene` for the app scene transform group.
- `.simulation-wall-layer` for wall/surface/effects ownership.
- `.ball-canvas-layer` for simulation canvas ownership.
- `.simulation-contrast-veil` for the new veil.
- `.ui-layer` or existing route chrome classes for the UI layer.
- `.overlay-layer` only if an explicit wrapper is already needed; do not wrap portfolio/quote hosts unnecessarily.
- `.modal-layer` only if it matches the existing modal architecture.

Rules:

- Do not rename every `abs` occurrence just because it matches text search.
- Do not rename environment variables or audit globals unless every script, package command, and doc command is updated.
- Do not rename design tokens without understanding generated config and token flattening.
- If a name is part of stable historical API, keep it as a compatibility alias and document why.
- If a new semantic name and old compatibility name coexist, ensure both point to one implementation path.

Final stale-name audit:

```bash
rg -n "#abs-scene|\\.abs-scene|data-abs-|abs:|__ABS_|ABS_|\\.abs-|--abs-" react-app docs scripts package.json
```

Report every remaining match as either:

- removed;
- updated;
- intentional compatibility alias;
- out of scope for this pass.

## Phase 5: Documentation Updates

Update docs in the same change so future agents do not rediscover this contract.

At minimum, update:

- `docs/reference/LAYER-STACKING.md`
- `docs/reference/CANVAS-RUNTIME.md`
- `docs/reference/MODES.md`
- `docs/reference/PARITY-CONTRACT.md`

Update these if touched by code changes:

- `docs/reference/TRANSITION-ORCHESTRATION.md`
- `docs/reference/CONFIGURATION.md`
- `docs/reference/COMPONENT-LIBRARY.md`
- `docs/reference/SITE-STYLEGUIDE.md`
- `docs/reference/CUSTOM-CURSOR.md`

Docs must state:

- the new eight-layer conceptual order;
- the exact live DOM/CSS owner for the contrast veil;
- that the title is visually canvas-rendered but remains semantically available in DOM;
- the relationship between title-depth modes and the canvas title renderer;
- any compatibility aliases intentionally left behind.

## Phase 6: Verification

Run the smallest reliable verification set first:

```bash
npm run validate:html-fragments
npm run check:design-config
npm run lint --prefix react-app/app
npm run build
```

Then run dev-server audits. Start the dev server in another terminal:

```bash
npm run dev
```

Against dev:

```bash
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:pointer-title-depth
ABS_DEV_URL=http://127.0.0.1:8012 npm run audit:canvas-spa:quick
```

Preview build:

```bash
npm run preview
```

Against preview:

```bash
ABS_DEV_URL=http://127.0.0.1:8013 npm run audit:portfolio-gate:quick
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=chromium ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
ABS_DEV_URL=http://127.0.0.1:8013 ABS_BROWSER=webkit ABS_TRANSITION_STRICT_RAF=1 npm run audit:transition-flows
```

Run visual certification after the visual layer change:

```bash
npm run certify:screens
```

If any command cannot run, state the exact command, exact error, and whether it blocks confidence.

## Visual QA Checklist

Inspect home on desktop and mobile.

Check:

- center title is visually in the ball canvas layer;
- no duplicate DOM title is visible;
- title/subtitle position matches the old shell hero slot;
- balls can visually layer around the title in depth-aware modes;
- contrast veil is visible mostly near edges, not as a center wash;
- top chrome, simulation switcher, center links, and footer stay above the veil;
- portfolio sheet opens above header/footer and is not dimmed incorrectly by the veil;
- quote viewport host still stacks as documented;
- modal blur/content remains highest;
- custom cursor behavior is unchanged;
- reduced-motion mode remains usable;
- no layout shift during route transitions or resize;
- no new one-color palette dominance or decorative bokeh/orbs.

## Subagent Strategy If Available

Use subagents only when they can stay read-only or have disjoint ownership.

Recommended two-agent thought pass:

1. **Architecture Mapper, read-only**
   - Map current shell DOM, z-indexes, title-depth pipeline, and compatibility names.
   - Output exact files/selectors/functions to touch and exact risks.

2. **Risk Reviewer, read-only**
   - Review the proposed implementation path for accessibility, transition readiness, portfolio stacking, modal stacking, generated config risks, and audit coverage.
   - Output blockers and stronger acceptance criteria.

Do not let workers edit overlapping files unless the orchestrator assigns exact file ownership. The lead agent remains responsible for the final diff and validation.

## Definition Of Done

The task is complete only when:

- The new contrast veil exists as an explicit named layer above canvas/title material and below UI.
- The homepage visible title/subtitle render through the canvas/depth path.
- A semantic DOM title/subtitle source remains available and accessible.
- Depth-aware title layering still works.
- UI, overlay, portfolio, quote, and modal z-order match the target layer contract.
- Documentation reflects the new contract.
- Any semantic renames are controlled, documented, and verified.
- Remaining legacy names are intentionally classified as compatibility surfaces.
- Required verification commands have passed, or any failure is clearly explained with exact output.
- Final diff has been reviewed for unrelated edits.

## Final Report Format

Report concisely:

1. **Files changed**
2. **What changed**
3. **Semantic rename outcome**
   - renamed;
   - compatibility aliases retained;
   - deferred items.
4. **Verification**
   - command;
   - result.
5. **Risks or follow-ups**

Do not commit unless Alexander explicitly asks.
