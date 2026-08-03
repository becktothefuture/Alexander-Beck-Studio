# View transition orchestration audit — 2026-08-03

This follow-up supersedes the timing and fallback conclusions in `route-material-entry-audit-2026-08-02.md`.

## Objective

Every tab change must use one repeatable order:

1. The outgoing route leaves quickly.
2. The incoming route starts visually blank under the loader cover.
3. Circle material grows from scale 0. Circle opacity does not animate.
4. Cards grow from their centre with a small lift and tilt. Card opacity does not animate.
5. Typography enters last.
6. A later visit repeats the complete sequence.

The physical window, frame, and Button Bar stay stable.

## Defect log

| ID | Surface | Observed defect | Cause | Resolution | Status |
| --- | --- | --- | --- | --- | --- |
| VT-01 | Global | Route content could paint before its entrance preparation, then disappear and enter again. | The destination commit and the first browser paint were not one controlled blank-frame boundary. | Prepare destination material and typography under the cover, then wait for two stable paint turns before `route-in`. | Resolved |
| VT-02 | Global | Repeat visits used a shorter and less ordered entrance. | Repeat timing and stagger compression created a second motion system. | Removed repeat compression. Every visit uses the same phase contract. | Resolved |
| VT-03 | Global | Typography could begin with material or before it. | Some generic hero groups did not include the shared typography start offset. | Apply `typographyDelayMs` to all route typography groups. | Resolved |
| VT-04 | Home | Balls were already full size when Home became visible. | The simulation grow could run while the loader still covered the route. | Home now participates in the shell route lifecycle and starts its indexed scale transition only at `route-in`. | Resolved |
| VT-05 | Contact | The ripple field appeared as a complete background after the text. | Radius and alpha were coupled, and the renderer could not draw controlled transition frames. | Animate radius only. Keep alpha independent. Draw route-out frames and use the shared material timing. | Resolved |
| VT-06 | Lab | The dot grid and project cards appeared at their final state. | The grid renderer had no route scale, and cards had no route-owned entrance. | Add a draw-time dot radius scale. Animate visible cards with the shared centre-scale, lift, and tilt contract. | Resolved |
| VT-07 | Work | The particle scene and cards appeared complete. | Scene particles had no route scale. CSS and RAF transitions could also compete on cards. | Add a per-particle draw scale, use one card controller, and disable competing CSS transitions during route entry and exit. | Resolved |
| VT-08 | About | The opener text could flash. The WebGL field used local timing. Its fallback ambient circles appeared at full radius. | About was outside the shared participant contract. The fallback had no material scale. | Move both WebGL and ambient fallback paths to the shared material controller. The fallback multiplies emitter radius by route scale and never multiplies alpha. | Resolved |
| VT-09 | About fallback | Ambient circles were internally scaling, but the glow appeared after typography. | The atmosphere compositor cancelled the incoming internal scheduler when `route-in` began. | Freeze only the outgoing atmosphere generation. Allow a newly registered incoming source to render during `route-in`. | Resolved |
| VT-10 | Outgoing routes | Destination preload could hold an empty outgoing view, and rapid tab changes could cancel an exit halfway through. | Preload and departure were coupled. A route-out retarget was incorrectly treated as already covered. | Complete the visible departure first, establish the cover, then await preload. During route-out, keep only the latest destination queued and retarget after scale reaches 0. | Resolved |
| VT-11 | Covered retarget | A second hidden exit ran after a rapid retarget. | A resumed covered transaction repeated outgoing participant work. | Skip outgoing exit when the previous visible departure has already completed. | Resolved |
| VT-12 | WebKit | A short fallback could release the route without a reliable blank destination paint. | The old 80 ms paint fallback could win before WebKit painted the prepared state. | Use the stable native RAF boundary with a bounded 500 ms fallback and two destination paint turns. | Resolved |
| VT-13 | Lab cards | Cards appeared to grow from the top-left even though the route motion variables requested a centred scale. | Lab combined camera placement, world scale, and entrance scale on the same top-left-origin element. | Keep camera placement and world scale on the outer item. Apply the shared route-card frame to a new centre-origin inner surface, matching Work. | Resolved |
| VT-14 | Work + Lab cards | Card growth felt fast and abrupt despite the longer duration. | Work and Lab duplicated their card-frame math, used slightly different start scales, and the previous entrance curve front-loaded most of its movement. | Use one shared card-frame helper and the standard cubic ease-out curve. Extend the scene duration, cascade, and typography boundary together. | Resolved |
| VT-15 | Work + Lab cards | Lab cards still read as an opacity fade instead of a material entrance. | The shared card frame animated opacity from 0 to 1 but changed scale by only 3.5%, so opacity dominated the motion. | Remove the route-owned opacity channel. Start the centred card surface at scale 0 and animate scale, lift, and tilt only on both routes. | Resolved |
| VT-16 | About exit | A later About exit could exceed the 500 ms budget and hold the next view. | The full narrative WebGL hot frame continued running while the short route-material controller tried to shrink the scene. | Give the route-material controller exclusive render ownership during exit, then restore the narrative frame only when About is restored or entered. | Resolved |
| VT-17 | About mobile | A measured point-profile replacement could destroy the canvas context or replace an active material controller with a prepared controller at scale 0. | Cleanup forced immediate context loss, and a replacement participant registered after the shell had already published `route-in`. | Defer real context loss by one task, cancel it when React reuses the canvas, and resume an in-progress About entrance when an adapter is replaced. | Resolved |
| VT-18 | About development runtime | WebKit could observe About as ready and then not ready, while Chromium paid for two equivalent WebGL bootstraps. | The point world mounted before the measured runtime plan and React Strict Mode's effect probe also allocated a renderer. | Mount the point world only after the runtime plan resolves and defer adapter construction one task so the Strict Mode probe cancels before allocation. | Resolved |
| VT-19 | Shared material | A long main-thread stall could skip directly from scale 0 to scale 1, or from scale 1 to scale 0. | The first available RAF could arrive after the complete material timeline. | Require one bounded intermediate material paint before accepting the endpoint after a stalled first RAF. | Resolved |

## Shared timing contract

Canonical source: `react-app/app/public/config/design-system.json` → `shell.motion.routeTransition`.

| Phase | Default |
| --- | ---: |
| Outgoing surface | 100 ms |
| Circle delay | 80 ms |
| Circle grow | 1200 ms |
| Circle cascade | 720 ms |
| Typography start | 1100 ms |
| Title reveal | 560 ms |
| Circle exit | 140 ms |
| Exit cascade | 70 ms |
| Typography exit | 100 ms |
| Card lift | 16 px |
| Card tilt | 1.2° |

The circle start scale is fixed at 0. It is not configurable because any non-zero value breaks the blank-frame and scale-only contracts.

## Global controls

The development design panel now contains **View Entrances** with these live controls:

- Scene Grow
- Scene Cascade
- Scene Delay
- Type Start
- Title Reveal
- Circle Exit
- Exit Cascade
- Type Exit
- Card Lift
- Card Tilt

The values apply through `patchShellMotion`, publish matching CSS variables, save to the canonical design system, and flatten into generated runtime configs.

## Performance and cleanup

- One controller owns material entry and exit across DOM, Canvas 2D, and WebGL adapters.
- Material scale uses renderer geometry. Circle opacity is not animated.
- Target lists and delay ratios are prepared outside hot render loops.
- The shared controller uses indexed loops, a persistent frame detail object, and a `WeakMap` for target scale.
- Work and Lab reuse one controller-owned card-frame object instead of allocating per card on every frame.
- Cards have no route-owned opacity variable. Their blank first frame comes from centred scale 0.
- Diagnostic DOM writes are throttled. Lab keeps camera and grid work on one display frame.
- Route animation uses stable native RAF references so legacy runtime instrumentation cannot interrupt it.
- Hidden duplicate exit work and repeat-only timing branches were removed.

## Final Playwright evidence

Strict continuous-RAF reports:

- Chromium desktop: `output/playwright/transition-flows/2026-08-03T10-13-21-230Z-chromium-1280x900-motion.json`
- WebKit desktop: `output/playwright/transition-flows/2026-08-03T10-13-58-086Z-webkit-1280x900-motion.json`
- Chromium mobile: `output/playwright/transition-flows/2026-08-03T10-14-36-790Z-chromium-390x844-motion.json`
- WebKit mobile: `output/playwright/transition-flows/2026-08-03T10-15-09-656Z-webkit-390x844-motion.json`
- Chromium mobile stress: `output/playwright/transition-flows/2026-08-03T12-42-50-120Z-chromium-390x844-motion-stress.json`
- Chromium mobile reduced motion: `output/playwright/transition-flows/2026-08-03T12-42-36-063Z-chromium-390x844-reduced.json`
- No-fade Work ↔ Lab, Chromium desktop: `output/playwright/transition-flows/2026-08-03T12-45-44-650Z-chromium-1280x900-motion.json`
- No-fade Work ↔ Lab, Chromium mobile: `output/playwright/transition-flows/2026-08-03T12-36-27-033Z-chromium-390x844-motion.json`
- No-fade Work ↔ Lab, WebKit desktop: `output/playwright/transition-flows/2026-08-03T12-37-10-723Z-webkit-1280x900-motion.json`
- No-fade Work ↔ Lab, WebKit mobile: `output/playwright/transition-flows/2026-08-03T12-37-52-683Z-webkit-390x844-motion.json`

The focused reruns sampled the same start frame on both routes: no opacity override, scale 0, 16 px lift, and 1.2° tilt. Work's maximum centre-origin error was 0 px. Lab's was 0.24 px. Both settled at scale 1, zero lift, and zero tilt on the first and repeat visits.

Rendered Chromium evidence: `output/playwright/card-no-fade-2026-08-03/contact-sheet.jpg`. Its 36-frame sample log records zero opacity overrides, scale 0 on the first Lab frame, progressive scale during route-in, and scale 1 at settlement.

The audit samples every animation frame and now fails on:

- visible typography or non-zero material on the first destination frame;
- circle opacity-style pops instead of progressive scale;
- typography starting before material;
- card entry with an opacity override, computed Lab opacity below 0.98, or no intermediate scale, lift, and tilt;
- material exit that does not reach scale 0;
- an About ambient fallback that does not composite before typography;
- route-out longer than the 500 ms quick-exit budget;
- incomplete settlement, route mismatch, or transition state leaks.

Fresh rendered video evidence:

- Desktop normal and stress: `output/playwright/route-transition-videos/2026-08-03T10-16-41-637Z-summary.json`
- Mobile normal and stress: `output/playwright/route-transition-videos/2026-08-03T10-17-16-798Z-summary.json`

Additional gates:

- Lab interaction/runtime audit: `output/playwright/playground/2026-08-03T10-27-29-136Z-chromium/report.json`
- Production runtime performance: `output/playwright/runtime-performance/2026-08-03T08-10-02-484Z-chromium-950e8c97.json`
- Repel Room held about 60 FPS in all three cold and three warm samples on a 120 Hz environment.
- Production build and About production check pass.
- Generated design config parity passes.

## Final all-pairs and performance rerun

The final strict matrix covers every directed pair among Home, Work, About, Contact, and Lab. All 80 baseline transitions pass:

- Chromium desktop: `output/playwright/transition-flows/2026-08-03T18-20-35-852Z-chromium-1280x900-motion.json`
- WebKit desktop: `output/playwright/transition-flows/2026-08-03T18-23-07-444Z-webkit-1280x900-motion.json`
- Chromium mobile: `output/playwright/transition-flows/2026-08-03T18-25-40-315Z-chromium-390x844-motion.json`
- WebKit mobile: `output/playwright/transition-flows/2026-08-03T18-18-06-820Z-webkit-390x844-motion.json`

Both five-route 4× CPU passes and both rapid-retarget stress passes also pass:

- Chromium desktop 4× CPU: `output/playwright/transition-flows/2026-08-03T18-28-50-863Z-chromium-1280x900-motion-cpu-4x.json`
- Chromium mobile 4× CPU: `output/playwright/transition-flows/2026-08-03T18-29-50-281Z-chromium-390x844-motion-cpu-4x.json`
- Chromium desktop retarget stress: `output/playwright/transition-flows/2026-08-03T18-30-50-565Z-chromium-1280x900-motion-stress.json`
- Chromium mobile retarget stress: `output/playwright/transition-flows/2026-08-03T18-31-56-457Z-chromium-390x844-motion-stress.json`

These are relative engineering scores for the instrumented development route, not Lighthouse scores. The audit itself reads detailed geometry every frame, and Chromium headless software WebGL amplifies the About cost.

| View | Score | Median first visible | P95 worst frame | Absolute worst frame | Chromium long tasks | 4× CPU worst frame |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 86/100 | 463 ms | 177 ms | 246 ms | 3 / 256 ms | 251 ms |
| Work | 82/100 | 449 ms | 183 ms | 191 ms | 4 / 315 ms | 300 ms |
| About | 45/100 | 1,029 ms | 1,943 ms | 2,010 ms | 123 / 19,777 ms | 917 ms |
| Contact | 94/100 | 386 ms | 142 ms | 151 ms | 0 / 0 ms | 184 ms |
| Lab | 81/100 | 489 ms | 183 ms | 200 ms | 2 / 147 ms | 409 ms |

The three largest measured performance offenders are:

1. About's WebGL point-world bootstrap and hot frame. A headed Chromium check improves the worst frame from the headless 1–2 second range to 675 ms, but still records a 359 ms long task, so the risk is not only a headless artifact.
2. Work destination bootstrap under CPU pressure. Its two 4× samples record 35 long tasks totalling 3,026 ms and a 300 ms worst frame. The long tasks cluster in route-out and route-loading.
3. Lab grid/card startup under CPU pressure. Its two 4× samples record 22 long tasks totalling 1,963 ms and a 409 ms worst frame. The largest block occurs during route-loading, followed by repeated route-in blocks on desktop.

The 4.3–5.4 second route-in phase is mostly authored choreography, not a blocked main thread. It is deliberately scored separately from missing frames and long tasks, but it remains a perceived-speed trade-off.

## Unrelated repository gate

`npm run studio:check` now passes the transition, runtime-performance, scheduler, and hotspot-characterization checks, then stops at `check:portfolio-css-ownership`. The already-modified `scripts/fixtures/portfolio-css-ownership.json` expects 1,587 main-sheet rules and 454 relevant rules; the current analysis returns 1,584 and 451. All overlap and ownership counts still match. The transition task only adds two About paint-guard rules to `main.css` and does not remove Portfolio rules, so it does not rewrite that unrelated user-owned fixture.

`npm run audit:focus-contrast` currently stops on Home's **Work** Button Bar item because the audit expects a `dual-ring` indicator but measures the existing `outline` indicator. The route-motion work does not change Button Bar focus styling. The focused Lab interaction/runtime audit passes with the new card wrapper.
