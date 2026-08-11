# Home simulation performance audit

- Date: 2026-08-11
- Scope: Home simulation runtime, full-code review, representative browser modes, current local working tree
- Outcome: diagnosis and implementation plan; no production runtime code changed

## Executive conclusion

The lag does not come from one uniformly expensive simulation. It comes from several layers spending the same frame budget at the same time:

1. Pointer movement is processed twice. A repeated body-class write then wakes the title renderer and turns one input event into many layout reads.
2. Desktop flat circles use one Canvas path, fill, transform, and state stack per body even when the current appearance is a simple opaque circle.
3. The analytic 3D modes run generic ball physics, then overwrite the result with their own projection. On desktop they can perform this projection twice before one visible frame.
4. Collision work is fixed by a global iteration count. The broad phase revisits cell relationships and computes overlap data that the solver does not use.
5. The overload controller skips physics after advancing the clock. It protects render cadence by making most modes run at 75% or 50% of real time.
6. Several damping values are applied per step rather than per second. This makes a simple global 120 Hz to 60 Hz change visually unsafe.
7. Sleeping work is disabled in the authored config. Pit sleep evaluation is also coupled to an optional collision post-pass.
8. The atmosphere has two fields. The requested change is to remove the tight/small field and retain the broad/large field. This is a useful secondary saving, especially on the Safari fallback path, but it is not the main cause of lag.

The best route to 60 fps is therefore to remove work that does not reach the screen before reducing body count, resolution, atmosphere breadth, depth, or motion character.

## Visual constraints

The performance work should retain these properties:

- Crisp flat palette bodies and the current body counts where possible.
- The broad atmosphere field and its ambient colour response.
- The Canvas title, including real front/behind crossings in the depth modes.
- The current cursor lens, pointer response, drag/throw behavior, impact squash, and route-specific motion.
- Current wedge, spoke, depth, topology, and connected-material concepts.
- Current desktop material feel as the reference when physics timing is normalized.

These are not optional polish. They are part of the product. See `DESIGN.md:11-20`, `DESIGN.md:160-167`, `DESIGN.md:252-272`, and `docs/reference/CANVAS-RUNTIME.md:87-138`.

Unless a reference says otherwise, shortened source paths below are relative to `react-app/app/src/legacy/modules/`. Shortened `public/` paths are relative to `react-app/app/`.

## Measurement status and limits

This report measures the active local working tree at `http://localhost:8012`. The working tree was already dirty. The audit is a current-checkout diagnostic, not release certification. The generated JSON also marks an explicit external development URL as an unowned artifact surface.

Two calibrated idle, headless browser runs covered Pit, Water, 3D Sphere, Kaleidoscope Rift, and Flubber in desktop-hosted iPhone 13 emulation. Each profile used three cold and three warm five-second samples, with adjacent static-rAF controls.

| Browser | Result | Important evidence |
| --- | --- | --- |
| Chromium | All five modes passed | Worst cold repeat was 59.97 fps; cold raw-rAF interval p95 was at most 9.2 ms; throttle stayed at 0. |
| WebKit | Pit and Water cold profiles failed | Pit reached 57.05 fps. Water reached 54.77 fps, raw-rAF interval p95 25 ms, p99 50 ms, longest gap 85 ms, throttle level 1. All warm profiles passed. |

Evidence:

- `output/playwright/runtime-performance/home-simulations-audit-2026-08-11-chromium.json`
- `output/playwright/runtime-performance/home-simulations-audit-2026-08-11-webkit.json`

The result is useful but limited:

- It proves that the idle iPhone 13 emulation profile held the target in headless Chromium on this Mac.
- It proves that the WebKit cold path does not have enough margin in Pit and Water.
- It does not reproduce a physical iPhone GPU, memory limit, power state, or thermal state.
- The standard audit is idle. It does not exercise pointer sweeps, dragging, dense impacts, or title invalidation pressure.
- Average fps is not enough. A current passing repeat can still contain a long gap because `longestGapMs` and render-invocation percentiles are recorded but are not gating predicates.
- Exact pointer, Canvas-command, step-count, material-diagnostic, and atmosphere A/B numbers below are exploratory session probes, not release artifacts. Independent reviewers verified the source mechanisms; repeatable source counters should be added before using these probes as before/after acceptance evidence.

## Proof summary

### 1. Pointer movement amplifies into layout work

There are two document-level pointer paths:

- `rendering/cursor.js:40-58` listens to `pointermove` and updates the cursor.
- `input/pointer.js:164-189` and `input/pointer.js:266-274` listen again and call the same cursor update.

Each cursor update calls `document.elementFromPoint()` and writes `abs-in-simulation` to the body (`rendering/cursor.js:225-251`). The title controller watches all body `class` and `style` mutations (`rendering/title-depth.js:723-742`). A refresh then reads the Canvas, title, line, and glyph rectangles (`rendering/title-depth.js:279-404`).

Independent exploratory headed Chromium probes found:

| Probe | elementFromPoint | Body class mutations | Main Canvas rect reads | Title/glyph rect reads |
| --- | ---: | ---: | ---: | ---: |
| 50 Water pointer moves | 100 | 104 | 50 | 1,989 |
| 100 Water pointer moves | 200 | 200 | 100 | 3,900 |

A standalone call that added the already-present `abs-in-simulation` class still produced one MutationObserver record.

An isolation test guarded only that repeated class add. It delivered 177 pointer events and retained 354 hit tests, but body mutations fell to 6 and title layout reads fell to 10. This isolates the no-op body mutation as the main bridge between pointer movement and title remeasurement.

There is a second title problem. `shouldTrackTitleGeometryEveryFrame()` accepts any running animation in the scene subtree (`rendering/title-depth.js:227-230`). The permanent noise layer runs infinite animations. A 500 ms scene-impact probe caused 144 title layout reads even without pointer movement. The scene transform moves the semantic title and its Canvas parent together, so their relative geometry does not need continuous measurement.

### 2. Desktop flat-circle drawing uses the expensive path

The active authored appearance is favorable for batching:

- `pebbleBlend` is `0`: `public/config/design-system.json:20-25`.
- `simulationBodyMaterial.enabled` is `false`: `public/config/design-system.json:497-519`.

The renderer still chooses its simple compound-circle path from a mobile condition (`physics/engine.js:897-921`). The compound path can fill a full colour group once (`physics/engine.js:1132-1178`). The desktop branch instead saves, translates, begins a path, appends one body, fills, and restores for every ordinary body (`physics/engine.js:1181-1244`).

Exploratory Canvas command instrumentation on the current Water and Pit states found:

| Surface | Bodies | Arcs per visible render | Fills per visible render | Save/restore pairs per visible render |
| --- | ---: | ---: | ---: | ---: |
| Desktop Water | 300 | about 300 | about 300 | about 300 |
| Mobile Water | 144 | about 144 | about 6 | about 16 |
| Desktop Pit | 300 | about 300 | about 300 | about 300 |
| Mobile Pit | 326 | about 326 | about 6 | about 16 |

The safe fix is not `simpleCircleBodies = true` on every desktop frame. That mobile fast path omits squash and can change painter order. The correct fix is run-preserving batching:

- Accumulate only consecutive, opaque, unsquashed, flat circles of compatible colour.
- Flush before alpha, squash, depth, transition, or special-material bodies.
- Draw the exceptional body with the exact current path.
- Resume batching after it.

This preserves impact squash, overlap order, opacity, depth fog, and the current appearance.

### 3. Analytic 3D modes compute positions through the wrong abstraction

The generic desktop engine uses a 1/120 fixed step (`physics/engine.js:501-503`). It calls the full `Ball.step()` for every body (`physics/engine.js:548-554`). That step performs gravity checks, drag, velocity integration, angular damping, sleep state, and squash work.

3D Sphere and 3D Cube then project their parametric points and overwrite the generic position and motion fields. They do not use ball-to-ball collision or wall handling. At a 60 fps output target, desktop can therefore perform two generic steps and two complete point projections before one projection is shown.

Source proof:

- Existing custom-step bypass: `physics/engine.js:493-499`.
- Sphere projection overwrite: `modes/3d-sphere.js:478-550`.
- Cube projection overwrite: `modes/3d-cube.js:180-219`.
- Generic drag and motion work: `physics/Ball.js:280-357`.

The safe design is to separate time integration from visible projection:

- Keep rotation, drag, breathing, coast, and sound state on the approved reference clock.
- Project all points once immediately before render.
- Partition front and rear title layers once and reuse them for both Canvas passes.
- Do not run generic ball physics for these analytic points.

This keeps the same visible geometry while removing overwritten work.

### 4. Collision work is spatially hashed, but still over-computed

The collision system is not a naive full all-pairs solver. It reuses a spatial grid and pair pool. That is good. The remaining problems are in how that structure is traversed:

- It clears arrays for every cell ever stored, including inactive cells (`physics/collision.js:157-175`).
- It visits all nine neighbour directions and rejects duplicate body pairs later (`physics/collision.js:179-213`). A same-cell plus four-forward-cell stencil can visit each cell relationship once.
- It calculates `sqrt()` and stores `overlap` while collecting pairs (`physics/collision.js:198-211`), but the main solver recalculates the distance and does not read the stored overlap (`physics/collision.js:224-260`).
- It runs every configured solver iteration even when a complete iteration no longer changes a visible constraint (`physics/collision.js:238-419`).

The authored base count is four collision iterations. Desktop can run two fixed physics steps per display frame. A dense mode can therefore traverse the collision pairs eight times per visible frame. Pit can add a three-iteration post-wall pass to each fixed step (`physics/engine.js:619-653`).

Recommended exact or perceptually safe savings:

1. Track active grid keys or use generation stamps.
2. Use a forward neighbour stencil.
3. Store only the pair data the solver reads.
4. Exit an iteration when there are no corrections.
5. For dense constraints, continue only until maximum residual penetration is below a DPR-scaled CSS-pixel threshold.
6. Keep the full budget during a fresh impact, active drag, high overlap debt, or high strain.

This spends solver work on visible error rather than on a fixed global count.

### 5. Physics cadence cannot be reduced safely until damping and decay are time-correct

Desktop currently performs about twice as many fixed integration steps as the 60 Hz path. An exploratory diagnostic with 300 bodies counted about 36,093 `Ball.step()` calls per second on the desktop path and about 17,895 after switching to the 60 Hz device path. This proves the step-count difference. It does not prove an isolated fps gain because the mobile flag also changes render quality, batching, wall behavior, and mode-specific branches.

More importantly, several coefficients are multiplied once per fixed step or per update rather than normalized by `dt`:

- Generic body drag: `physics/Ball.js:280-296`.
- Water body damping per fixed step: `modes/water.js:71-78`.
- Water ripple decay per `updatePhysics()` call: `modes/water.js:113-127` and `physics/engine.js:802-806`.
- Magnetic damping: `modes/magnetic.js:97-108`.
- Pressure damping: `modes/pressure-crucible.js:520-524` and `modes/pressure-crucible.js:604-605`.
- Cube tumble damping: `modes/3d-cube.js:104-170`.

Example remaining velocity after one second:

| Per-step factor | 120 Hz | 60 Hz | Visual effect of an uncorrected switch |
| --- | ---: | ---: | --- |
| Generic `0.982` | 0.113 | 0.336 | Bodies retain about 3× more velocity. |
| Water `0.985` | 0.163 | 0.404 | Flow becomes much less viscous. |
| Magnetic `0.998` | 0.786 | 0.887 | Magnetic motion coasts longer. |
| Pressure `0.968` | 0.020 | 0.142 | Pressure retains about 7× more velocity. |

Normalize first against the current desktop reference:

```js
effectiveFactor = authoredFactor ** (dt / (1 / 120));
```

After trajectory and visual parity tests, use per-mode and activity-based cadence:

- Analytic Sphere and Cube: integrate shared state as required, project once per render.
- Pit: 60 Hz baseline, with two 1/120 substeps during the pour, active drag, high speed, or high overlap.
- Water, Magnetic, Weightless, and Elastic: 60 Hz baseline with substeps only when travel per frame exceeds a fraction of the smallest active diameter.
- Fountain modes: retain 120 Hz first. Their launch solver already compensates for cadence and has a contract test.
- Flubber: retain its current update clock first, but stop contact passes on residual convergence.

### 6. Adaptive throttle computes overload in the wrong time domain

The render loop calculates `dt`, advances `last`, and then decides whether physics will run (`rendering/loop.js:271-286`). Level 1 skips one in four physics frames. Level 2 skips every other physics frame (`rendering/loop.js:169-180`). The skipped time is not carried forward.

Result:

- Level 1 simulates about 75% of wall time.
- Level 2 simulates about 50% of wall time.
- Gravity, ripple age, motion, and mode clocks visibly slow under load.

Pit and Flubber are exempt because the source already acknowledges that lost `dt` weakens their physics. The same correctness issue still affects other modes.

Replace this with a debt-preserving overload ladder:

1. Remove duplicate DOM and projection work.
2. Skip a pending secondary atmosphere refresh if the main frame is already late.
3. Stop converged solver passes and non-semantic effects.
4. Keep bounded fixed-step debt and consume it without changing elapsed simulation time.
5. If debt exceeds a safe cap, record the explicit resynchronization. Do not silently slow time.
6. Add render interpolation only to modes that show 60 Hz cadence judder. Do not interpolate pointer-locked bodies.

### 7. Sleep is both disabled and coupled to the wrong condition

The authored config sets `physicsSkipSleepingSteps` to `false` (`public/config/design-system.json:10-15`). This prevents the early return in `Ball.step()` (`physics/Ball.js:238-245`) and disables the global non-Pit sleep evaluation (`physics/engine.js:736-787`).

Pit has a separate structural error. Its sleep and stabilization loop is nested under `shouldRunPostPass` (`physics/engine.js:619-733`). When the pre-wall overlap debt is below the post-pass threshold, Pit does not evaluate sleep. The post-pass gate also uses overlap measured before wall correction, although wall correction is the operation that can create the new overlaps the post-pass is meant to resolve.

Recommended design:

- Move Pit sleep evaluation outside the optional correction pass.
- Gate the post-pass on wall movement plus maximum residual penetration, not aggregate pre-wall debt.
- Enable sleep by mode capability, not globally.
- Keep sleepers as static collision participants.
- Wake from pointer proximity, a neighbour impulse, a field/ripple, a wall correction, a mode change, or a new contact.
- Build the dynamic broad phase from awake bodies plus neighbouring sleepers.

Do not simply turn the current flag on for every mode. Water or Magnetic bodies can otherwise return before their new field force is applied.

### 8. Remove the small atmosphere field; keep the large field

The current authored values are:

- Large spread: `0.08`.
- Small spread: `0.02`.
- Memory: `400 ms`.
- Edge strength: `0`.

See `public/config/design-system.json:479-495`.

The requested direction is sound: retain the broad colour wash and remove the tighter per-body halo. The code already has the internal concept needed for this. `DiffuseGlowEffect` accepts `fieldMode: 'broad'`, but the canonical atmosphere config does not expose it. Setting `smallSpread` to `0` is not sufficient:

- The normalizer clamps it to a minimum of `0.02` (`simulation-atmosphere-config.js:82-100`).
- The effect falls back to `largeBlurRadius * 0.34` when the small radius resolves as falsy (`diffuse-glow-effect.js:181-200`).

Implement an explicit canonical field switch such as `tightFieldEnabled: false` or `fieldMode: 'broad'`. Keep `largeSpread: 0.08` unchanged.

This is an approved visual simplification, not an invisible optimization. Complete the normal config lifecycle: authored config, live apply, canonical save, reload, flattened runtime config, preview, and Chromium/WebKit visual proof. Update the atmosphere contract in `docs/reference/CANVAS-RUNTIME.md` when the direction is implemented.

Structural cost proof per atmosphere composite with current `memoryMs > 0`:

| Effect path | Both fields | Broad only | Saving |
| --- | ---: | ---: | ---: |
| Native Canvas filter | 4 full effect `drawImage` calls | 3 | 1 tight filtered source draw; 25% of these calls |
| Safari spread-pyramid fallback | 38 `drawImage` calls | 18 | 20 calls; about 53% |

The fallback difference comes from two tight passes. Each prepares a nine-tap spread and publishes it. See `diffuse-glow-effect.js:314-391`.

An isolated synthetic Chromium A/B at the current balanced backing size (`540 × 338`) measured a median 5.266 ms for both fields and 3.110 ms for broad only, a 41% reduction inside the isolated effect. This headless synthetic result must not be projected directly to whole-page fps. It proves that the pass removal reduces real work. The source-level draw-count reduction is the more portable proof.

Visual guardrails:

- Keep the broad field radius, intensity, colour strength, 24 fps cadence, and 400 ms memory at first.
- Compare light and dark screenshots in Water, Pit, Sphere, Rift, and Flubber.
- Check that the wall still receives a broad colour response.
- Accept the deliberate loss of the tight halo. Do not compensate by raising body opacity or reducing the broad radius.

### 9. Mode-local improvements

#### Kaleidoscope and Rift

Kaleidoscope can multiply a small source set across many wedges. Each visible replica can enter `drawPebbleBody()`. That helper first attempts the material path inside a save/restore pair even when the material is disabled. It can then use another state stack for its fallback.

Keep the wedge and spoke counts. Instead:

- Resolve flat-circle versus material strategy once per frame or config revision.
- Build one compound opaque-circle path per source body across its replicas.
- Flush around alpha or special cases.
- For circles, remove rotate/translate operations that have no visible result.
- Do not merge overlapping translucent replicas without overlap proof because alpha accumulation would change.

#### Flubber

Flubber can perform up to 21 contact passes and 21 grid builds per visible frame in its full desktop budget: seven top-level builds plus 14 internal rebuilds. It already records maximum overlap. Use that as a stop condition. Retain the full budget during drag, high strain, inter-body collision, or wall impact.

#### Flies

The Flies neighbour search is still O(n²) (`modes/flies.js:109-130`). Reuse a lightweight spatial neighbour structure. This is a mode-local algorithmic improvement with no required visual reduction.

#### 3D Sphere depth order

The Sphere uses a full depth sort each frame. Reuse the previous order with an insertion sort while rotation changes it gradually, and fall back to the native sort after initialization or a large drag jump. This can remain exact. It is lower priority than removing generic physics and duplicate projection.

## What is not the main current cause

### Per-body gradients

The shared body material is disabled. Exploratory live diagnostics reported zero gradient builds, zero per-frame lighting calculations, and zero colour parsing. Do not spend the first performance pass redesigning a material system that is not active.

### A second atmosphere animation loop

Home registers the atmosphere as renderer-coupled. It does not run a second independent Home rAF loop. Its 24 fps cadence is already lower than the main simulation cadence.

### Object count alone

Exploratory headed Chromium profiling held about 60 fps across the representative 58-to-300-body modes. A separate headless desktop surface collapsed across both low- and high-count modes and was likely compositor- or raster-limited. This indicates that full-window Canvas/compositor conditions and cross-system amplification can matter as much as raw count. Body-count reduction should be a final, mode-specific fallback.

### A naive O(n²) collision solver

The common collision path already uses a spatial grid and object pools. Improve its traversal and convergence. Do not replace it based on the assumption that it is still a full all-pairs system.

## Recommended implementation order

### Wave 1 — Remove invisible work

1. One cursor owner. Pass the event target. Use `elementFromPoint()` only for programmatic refresh.
2. Apply body and cursor DOM state only when it changes.
3. Coalesce cursor presentation to one rAF while keeping pointer down/up/cancel and raw velocity sampling immediate.
4. Narrow title invalidation to route, theme, font, title content/glyph revision, resize, and explicit scene-impact endpoints.
5. Cache Canvas mapping while stable; refresh at most once per rAF during a known scene transform.
6. Move Sphere and Cube to a mode-owned integration/projection path. Project once per visible frame.
7. Add run-preserving desktop flat-circle batching.

Expected visual change: none.

### Approved visual simplification — remove the tight atmosphere field

Remove the tight/small field and retain the large field. Ship it through the canonical config lifecycle and the visual gates in this report. The deliberate visual change is the loss of the tight per-body halo; the broad atmosphere remains.

### Wave 2 — Make physics cost follow visible error

1. Optimize active spatial-grid traversal and forward neighbour selection.
2. Remove the unused broad-phase square root and overlap field.
3. Add exact no-change and residual-penetration exits.
4. Decouple Pit sleep from the post-pass.
5. Add per-mode wake rules, then enable step skipping only for proven modes.
6. Use Flubber's overlap residual to stop settled contact passes.

Expected visual change: none above the accepted subpixel tolerance.

### Wave 3 — Make time and cadence correct

1. Convert all per-step damping and decay values to time-normalized forms using 120 Hz as the approved reference.
2. Capture deterministic trajectory baselines before and after conversion.
3. Introduce per-mode 60/120 Hz policy and activity-based substeps.
4. Replace time-dropping throttle with bounded simulation debt.
5. Add selective render interpolation only where visual tests prove it is useful.

Expected visual change: no perceptible change within the trajectory, silhouette, timing, and interaction tolerances defined below. Nonlinear collisions and thresholds mean 60 Hz and 120 Hz paths cannot be assumed to be mathematically identical.

### Wave 4 — Emergency quality ladder only if required

Use only after Waves 1-3:

1. Allow the total Home frame controller to defer one atmosphere publication when the main frame is late, with a maximum output age.
2. Reduce atmosphere backing scale with hysteresis while preserving apparent large spread.
3. Use a hysteretic render-resolution ladder as a final GPU fallback.
4. Reduce mode-specific body count only after all cheaper work is removed.

Do not start with global DPR reduction, fewer wedges, less depth, fewer bodies, or atmosphere removal.

## 60 fps acceptance contract

Test these representative modes:

- Pit: dense collision, sleep, wall correction, pointer wake.
- Water: generic bodies, ripple force, pointer sweep.
- Flubber: dense connected constraints and drag.
- 3D Sphere: analytic projection, depth title, drag and coast.
- Kaleidoscope Rift: replicated rendering and alpha.
- Flies: low-collision control.

Test these states:

1. First five seconds after ready.
2. Settled idle.
3. Deterministic paced pointer sweep.
4. Press/drag/release where supported.
5. Sixty-second warm run; five-minute soak on the two worst modes.

Run headed Chromium and headed WebKit at desktop DPR 1 and 2, plus mobile emulation as a diagnostic. Use physical iPhone Safari before a mobile release claim. Cover light, dark, short landscape, and Reduced Motion.

Required performance gates:

- Average delivered cadence at least 58 fps on a 60 fps target.
- Render interval p95 at most 20 ms.
- Render interval p99 at most 33.4 ms.
- No gap above 50 ms in a stable sample.
- No more than two consecutive missed 60 Hz deadlines.
- No adaptive throttle during certification.
- Interaction-to-next-render p95 at most 33.4 ms.
- Cold-to-warm cadence decay no greater than 5%.
- Stable-title pointer movement causes zero title layout-read increase after initial state ownership.
- Normal pointer movement causes one cursor presentation update per rAF and no repeated body mutations.

Required visual and behavior gates:

- Pixel comparison for settled, pointer-active, impact-squash, transition, and depth-title states.
- Foundation/Pit: same pour shape, stack silhouette, surface gaps, settling time, and wake response.
- Water: same density, drift, ripple radius, decay, and velocity response.
- Sphere/Cube: same centre, silhouette, fog, title crossings, drag gain, release spin, and decay curve.
- Kaleidoscope/Rift: same wedge/spoke count, symmetry, seam behavior, shear, and final-sector coverage.
- Flubber: connected bodies, accepted maximum overlap, wall squish, local drag patch, and recovery time.
- Cursor: same 57.6 px resting lens, 20 px interactive state, 0.72 opacity, overlay depth, and native editor behavior.
- Atmosphere: same large field radius, intensity, colour, cadence, and memory; small field absent by design.

## Audit improvements needed

The current runtime audit records useful data but can pass a visible hitch. Extend it to gate:

- Source-stamped render intervals, not only raw rAF callbacks.
- Late-frame ratio and consecutive misses.
- `longestGapMs`.
- Render-invocation p95 and p99.
- Long tasks and long animation frames.
- Pointer-active and drag profiles.
- Physics counters: integration calls, pair collection, solver passes, maximum residual, sleeping work, and dropped/resynchronized time.
- Canvas phases: bodies, mode renderer, title, and atmosphere publication.
- Random seed, config hash, artifact hash, body count, viewport, DPR, theme, and input script for controlled A/B comparisons.

Use interleaved ABBA order and paired scenes for optimization acceptance. Do not use a mobile flag as an isolated physics A/B because it changes several other systems.

## Independent cross-review

Six read-only reviewers challenged the findings from separate perspectives: rendering, physics/timekeeping, input/layout, visual fidelity, measurement method, and whole-system architecture.

Consensus:

- Remove pointer/title amplification first.
- Use capability-based circle batching, not device-based batching.
- Move analytic 3D modes off generic ball physics.
- Make collision work residual-driven.
- Preserve simulation time under load.
- Retain visual topology, body counts, title depth, and the large atmosphere field.

Corrections made after review:

- Rejected a blanket desktop 120 Hz to 60 Hz switch. Damping must be time-normalized first.
- Downgraded the device-flag 120/60 experiment to step-count evidence because it changes other render and mode paths.
- Rejected a blanket activation of the mobile circle fast path because it can remove squash and change painter order.
- Kept the small-field atmosphere removal as a deliberate scoped visual decision, not as the primary lag fix.
- Added longest-gap, active-input, deterministic-seed, and physical-Safari requirements to the proof standard.

## Commands used

```bash
npm run studio:status

ABS_DEV_URL=http://localhost:8012 \
ABS_BROWSER=chromium \
ABS_DEVICE='iPhone 13' \
ABS_PERF_MODES='pit,water,3d-sphere,kaleidoscope-rift,flubber-blob' \
ABS_PERF_OUTPUT='output/playwright/runtime-performance/home-simulations-audit-2026-08-11-chromium.json' \
npm run audit:runtime-performance

ABS_DEV_URL=http://localhost:8012 \
ABS_BROWSER=webkit \
ABS_DEVICE='iPhone 13' \
ABS_PERF_MODES='pit,water,3d-sphere,kaleidoscope-rift,flubber-blob' \
ABS_PERF_OUTPUT='output/playwright/runtime-performance/home-simulations-audit-2026-08-11-webkit.json' \
npm run audit:runtime-performance

npm run check:runtime-performance-contract
npm run check:render-scheduler-cadence
npm run check:mode-runtime
npm run check:scene-pointer
npm run check:depth-title-layer-state
```

Validation results:

- Runtime performance contract: 16/16 passed.
- Render scheduler cadence: 5/5 passed.
- Mode runtime bridge: 2/2 passed.
- Scene pointer contract: 2/2 passed.
- Depth-title state: 3/3 passed.
- Chromium runtime audit: passed.
- WebKit runtime audit: failed as product evidence for Pit and Water cold profiles; environment controls passed.
- Full `npm run check:site`: stopped at the wall-collision geometry contract because the pre-existing dirty config omits `runtime.simulationCollisionInsetPx` (`undefined !== 0`). This report did not change that config.
