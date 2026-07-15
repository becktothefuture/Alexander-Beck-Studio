# About narrative lab implementation brief

## Goal

Build a working React prototype at `/lab/about-narrative.html` inside the production `SiteApp` and `StudioShell`. Keep `/about.html` and `src/routes/about/` unchanged.

The prototype combines professional clarity with four spatial narrative moments. It is working copy, not final public copy.

## Editorial boundary

- Use confirmed professional facts from `ABOUT-NARRATIVE-FRAMEWORK.md`.
- Client names may appear as a ledger.
- Do not publish project-specific S&P Global or Yoti role, contribution, delivery or outcome claims.
- Treat the Beat 6 current-practice method sentence as provisional working language until it is separately verified.
- Required copy must remain 175-220 words, excluding client labels and optional artefact captions.

## Exact working copy

### 01 — Present

> I help organisations shape complex ideas into clear, human and emotionally compelling experiences—especially when the answer is still being figured out.

### 02 — Profile

> I’m a creative designer, technologist and systems thinker based in London. At Critical Mass, I work on digital experiences for the American Heart Association.
>
> Teams bring me in to solve complexity, connect ambitious ideas to practical execution, and turn research, user needs and business ambition into purposeful, surprising work.

### 03 — Perspective

> The whole experience matters: how it works, how it looks, and how it makes people feel.

### 04 — Trajectory

> My path moved from language, technology and visual communication into interaction, behaviour and trust, then into products, brands and systems in implementation. Denaline, Yoti and MRM are the main turns; education stays a quiet footnote.

### 05 — From ambition to reality

> From ambition to reality, I help teams find the organising idea, make it tangible and protect what matters through delivery.

### 06 — Practice

> Today I work through immersion, clear creative direction, genuine collaboration and prototypes people can experience. My client context spans healthcare, finance, mobility, travel, technology and culture.

Client labels: American Heart Association, S&P Global, Yoti, Bentley, Sony, Jaguar Land Rover, McCann, Maybourne Hotels, SunExpress, Lufthansa Group, Turkish Airlines, Tourism Ireland, Experian, Money and Pensions Service, Frankfurt Opera, DCC.

### 07 — Curiosity

Optional captions, excluded from the required word count:

- **iOS keyboard exploration** — Rethinking a familiar input until its assumptions become visible.
- **Spatial interface experiments** — Testing how a website can feel architectural without losing clarity.
- **3D and visual R&D** — Exploring material, motion and atmosphere as product-design tools.

### 08 — Next

> I’m looking for greater responsibility in innovation, creative direction and early-stage experience design—especially around AI, trust, privacy, robotics, digital identity, education and healthcare.
>
> If you are tackling a meaningful problem that is not neatly defined, I’d like to hear from you.

Primary CTA: email from `contents-home.json`. Secondary CTA: LinkedIn from `contents-home.json`.

## Route and component contract

- Register route id `about-narrative-lab` at `/lab/about-narrative.html` in `src/lib/routes.js`.
- Register a Vite input and a matching HTML/entry module.
- Add `navigationRouteId` to the route-view contract. Set it to `about` so the Button Bar visually selects About Me while the canonical route remains the lab.
- Keep route code under `src/routes/about-narrative-lab/`.
- Reusable semantic instances:
  - `SpatialSection`
  - `EditorialSection`
  - `CabinetSection`
  - `BackgroundStage`
  - `SectionIndicator`
  - `NarrativeControls`
- The route adapter owns only descriptor fields and mounts the experience.
- The data/settings module owns copy, clients, assets, defaults, bounds and local storage key.
- The scroll hook owns measurement, Lenis lifecycle, RAF scheduling, CSS-property writes and active-section changes.
- Comments are reserved for progress math, transition windows, settings mapping and the future production-route seam.

## Single progress model

- The Studio window contains one vertical scrollport.
- Desktop wheel input is smoothed with Lenis.
- Touch/mobile uses native inertial scrolling.
- Scroll and resize events schedule one animation frame.
- The frame reads cached section measurements and writes CSS properties through refs.
- React state changes during scrolling only when the active section index changes.
- Do not set React state for per-frame spatial progress, editorial reveal or background weights.

## Section geometry

Spatial sections use sticky `100svh` stages:

- Default: `200svh` desktop / `175svh` mobile.
- Opener: `240svh` desktop / `190svh` mobile.
- Closing: `220svh` desktop / `185svh` mobile.

Editorial sections are content-driven with at least `120svh`. The cabinet uses at least `140svh`.

## Motion values

Spatial type:

- Split each spatial statement into three semantic fragments without changing its wording or accessible heading.
- Move the fragments through one `1600px` perspective camera at roughly `16%`, `50%` and `84%` of section travel.
- Keep the first fragment fully hidden until its sticky stage reaches the viewport; every fragment enters on the viewport centre using depth only, with no lateral or vertical entry drift.
- Far: `translateZ(-520px)`, alternating horizontal drift, scale `0.72`, blur up to `17px`, opacity `0`.
- Readable: centred at `translateZ(0)`, scale `1`, blur `0`, opacity `1`.
- Passing: `translateZ(360px)`, reverse drift, scale `1.42`, blur `20px`, opacity `0`.
- Leave a short clear pause between fragments so the outgoing phrase finishes receding before the next phrase begins resolving.
- Reduced motion removes the camera choreography and restores the fragments as one readable stacked statement.

Editorial copy:

- Reveal line reaches the trigger at `74%` of the visible scrollport.
- Start `12px` lower with `3px` blur and opacity `0`.
- Resolve to zero offset/blur and opacity `1`.

Backgrounds:

- Use the four project-local WebP assets in `public/images/about-narrative-lab/`.
- Section-to-stage map: `0, 0, 1, 1, 2, 2, 2, 3`.
- Crossfade when the next section changes stage, over the final `18%` of the current section.
- Editorial text reveals without changing or darkening the background exposure.

## Controls

One fixed-geometry `.parameterizer-panel` is closed by default.

- Desktop: top left.
- Mobile: bottom drawer inside the Studio window.
- Persist under one route-local local-storage key.
- Actions: Reset and Copy JSON. No backend save.

Controls:

1. Scroll smoothing: `0-1`, default `0.82`.
2. Spatial length: `0.75-1.5`, default `1`.
3. Far scale: `0.55-0.9`, default `0.72`.
4. Near scale: `1.1-1.7`, default `1.42`.
5. Maximum blur: `0-28px`, default `20px`.
6. Fade window: `0.08-0.32`, default `0.18`.
7. Background opacity: `0-0.9`, default `0.58`.
8. Background crossfade: `0.08-0.32`, default `0.18`.
9. Editorial reveal threshold: `0.6-0.9`, default `0.74`.
10. Reading width: `34-56rem`, default `46rem`.

Hardcoded by design: panel width/row rhythm, section labels, background-stage mapping, mobile breakpoint, touch-native behavior and reduced-motion behavior.

## Responsive behavior

- Preserve the shared shell’s existing window and Button Bar geometry.
- All route content and overlays must remain inside the Studio window.
- At `600px` and below, use native touch scrolling, mobile section lengths, compact type and a bottom parameter drawer.
- At `601px` and above, use desktop lengths and the top-left drawer.
- Validate the narrow edge at `320px`, common phone at `390x844`, breakpoint edges at `600px` and `601px`, and desktop at `1440x900`.
- Allow line wrapping; never reduce essential copy below the existing readable type scale.

## Accessibility

- Keep all content in semantic DOM order.
- Use one `h1`; later section titles use `h2`.
- Generated backgrounds are decorative with empty alt text and `aria-hidden` ownership.
- Keyboard users can reach the drawer, every control, Reset, Copy JSON, email and LinkedIn.
- Focus styles remain visible against both studio-window themes.
- Reduced motion disables Lenis, blur, scale, crossfade animation and stagger. Sections become readable native-scroll blocks.
- No essential information depends on motion, hover, background imagery or pointer input.

## Asset prompts

All four use Imagegen built-in mode with the same matte rounded-particle material, charcoal/graphite base and restrained cobalt, amber and acid-lime accents. They are wide, text-free, logo-free and contain no people, objects, thin lines, rings, wireframes, grids or diagrams.

1. **Unresolved density:** layered ambiguous depth, concentrated but calm.
2. **Ordered field:** broad aligned bands and measured spacing without a literal grid.
3. **Responsive/living structure:** adaptive clusters forming a broad central passage.
4. **Open release:** particles disperse toward the edges, leaving generous central depth.

## Acceptance tests

- `/lab/about-narrative.html` loads directly and via SPA navigation resolution.
- `/about.html` source and public render remain unchanged.
- About Me is selected in the Button Bar while the document route id remains `about-narrative-lab`.
- All eight sections become active in order; the indicator matches each midpoint.
- All four background stages crossfade in sync with the mapped sections.
- Spatial copy reaches far/readable/passing states; editorial lines reveal near the configured threshold.
- Controls apply live, persist after reload, Reset restores defaults and Copy JSON returns the one settings object.
- Wheel smoothing works on desktop; touch scrolling remains native.
- Keyboard focus, CTA destinations and reduced motion work.
- The Studio window never overlaps the Button Bar or safe area at `320px`, `390x844`, `600px`, `601px` and `1440x900`.
- `npm run check:site` passes.
- Capture four spatial midpoints, every editorial section and the closing state under `output/playwright/`.
- Complete two final read-only reviews: narrative accuracy and scroll/orchestration simplicity.
