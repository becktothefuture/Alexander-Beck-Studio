Type: task
Status: resolved

## Question

What observable and measurable criteria will distinguish healthy conceptual diversity from a visual, motion, interaction, or mobile-coherence failure across the current production Home Daily Simulation collection?

## Answer

### Decision

Use a contract-first, family-aware rubric. Each simulation is judged against the same material, composition, interaction, and mobile quality bar, but it is not required to copy the same speed, body count, spatial pattern, or physical behavior.

The production scope is the current `daily-rotation` catalog: 16 simulations, including 13 Home-canvas modes and 3 route-backed Daily Focus runtimes.

Coherence means:

- comparable material presence and readable visual weight;
- disciplined density and spacing;
- direct use of the shared flat-fill palette language;
- a composed first readable frame and a legible complete Home title;
- one clear physical rule and a visible material event before input;
- meaningful autonomous motion or a convincing physical settling cycle;
- immediate, consequential pointer and touch response;
- similar quality on desktop and mobile.

Coherence does not mean equal speed or identical density. A quiet gravity mode, a swarm, a lattice, and a depth field can all pass if each has a clear motion payoff and still feels made from the same site material.

### Hard gates

Any hard-gate failure makes the simulation a confirmed outlier regardless of its average score.

| Gate | Pass condition |
| --- | --- |
| Runtime integrity | The selected catalog ID becomes the active simulation, reaches an idle transition state, renders nonblank, and route-backed Daily Focus returns to a clean Home URL. |
| First readable frame | A finished composition or clear material event is visible within the first second after readiness; the simulation does not depend on a long unexplained buildup. |
| Scene geometry | Bodies remain inside the shared wall, respect its contour, and show no clipping, unresolved overlap, muddy stacking, or duplicated Canvas contour. |
| Material language | The visible idea is carried by the approved ball, pebble, circle-fallback, or point-field material. No helper lines, rings, underlay blobs, silhouettes, long trails, weather overlays, local lights, bevels, or decorative scaffolding carry the concept. |
| Colour path | Settled front/default bodies use the shared palette directly at full material weight. Whitening or global translucency is a failure unless opacity is limited to documented depth fog, spawn/retire lifecycle, or shared transition behavior. |
| Title legibility | The complete Canvas-rendered Home title remains readable in the default and settled states on desktop and mobile in light and dark themes. Momentary crossings are acceptable; sustained occlusion is not. |
| Named interaction | Pointer and touch input cause a visible named physical action. The first valid input sample must not ease in from an unrelated off-screen or centre state. |
| Mobile bounds and continuity | Mobile count, body scale, DPR, and cadence remain bounded; no blanking, freezing, obvious stutter, accidental page gesture, or interaction loss appears. |

### Score scale

Score every axis from 0 to 4 for desktop and mobile. Where light and dark differ, record the lower score and note the theme-specific failure.

| Score | Meaning |
| --- | --- |
| 4 | Benchmark: memorable, unusually strong, and fully coherent with the collection. |
| 3 | Pass: resolved, engaging, and coherent; no material weakness needs work. |
| 2 | Weak: functional but noticeably less resolved, less legible, or less interesting than the production bar. |
| 1 | Clear outlier: the intended effect is present but substantially compromised. |
| 0 | Broken or absent: the criterion cannot be observed or a severe failure dominates it. |

Do not average scores into one number. A high score in one area must not hide a failure in another.

### Scored axes

| Group | Axis | What to judge |
| --- | --- | --- |
| Visual | Body scale and material weight | Bodies are large and solid enough to read as material. For normal-body modes, Foundation's authored `10.4–14.4px` desktop radius family is the reference and `0.8` is the current mobile body scale. Smaller swarm, depth, and field elements need an explicit conceptual reason and must compensate through a strong aggregate silhouette or field. |
| Visual | Density and negative space | The field has enough material to feel intentional without becoming muddy, uniform, or title-obscuring. Record body count, radius, and approximate occupied area where available; compare within the relevant simulation family before declaring drift. |
| Visual | Composition and hierarchy | The first, settled, active, and post-interaction states feel authored; the title and Home UI retain hierarchy; no important area is accidentally empty or congested. |
| Visual | Palette and surface cohesion | Neutral roles dominate, accents remain consequential, flat fills retain comparable weight, and route-backed rendering still reads as the same wall and material system. Keep this judgment separate from size and density. |
| Visual | Distinct visual payoff | The simulation produces a memorable formation, spatial event, or material behavior. Merely moving large pebbles or generic particles is not enough. |
| Motion | Autonomous motion or settling arc | Before input, something meaningful changes. A quiet mode may settle, but the settling must be readable and the resulting tension or composition must feel intentional rather than dead. |
| Motion | Temporal evolution | Over 20 seconds, motion changes state, reforms structure, cycles with variation, or creates a clear progression instead of looping one weak gesture or remaining visually unchanged. |
| Motion | Physical-rule legibility | A viewer can describe the main behavior in one sentence without reading the simulation label. |
| Interaction | Response salience | Pointer movement and the supported click, tap, drag, or release action produce a visible, proportionate effect quickly enough to feel connected to the gesture. |
| Interaction | Recovery and replay value | After release, the material recovers, reforms, dissipates, or settles in a visually satisfying way and invites another interaction instead of collapsing into noise or the same inert state. |
| Responsive | Mobile parity | Mobile preserves the same concept, hierarchy, motion payoff, and interaction meaning after its deliberate count, scale, and DPR reductions. It need not copy desktop geometry exactly. |
| Responsive | Cadence and input continuity | Motion remains visually continuous and touch samples map directly to the active field. Frame metrics support the judgment but do not replace visual inspection. |

### Family-aware comparison rule

Use the five accepted families as comparison contexts:

- bounded physical pebbles;
- structured fields or lattices;
- soft linked material;
- behavioral swarms;
- budgeted depth or point fields.

A custom route-backed renderer is not a visual family and receives no automatic exception. A smaller body, lower density, or quieter speed is acceptable only when the physical concept requires it and the simulation still passes material presence, concept legibility, interaction response, and sustained-interest criteria.

### Evidence protocol

Use the same controlled sequence for each simulation:

1. Desktop at `1440×960`, DPR 1, in light and dark themes.
2. Mobile at `393×659`, DPR 3 emulation with touch enabled, in light and dark themes.
3. Capture the first readable frame immediately after runtime readiness.
4. Observe and capture an untouched settling/evolution sequence at approximately 1, 5, 10, and 20 seconds.
5. Move the pointer or touch point across centre, edge, and corner regions without clicking to test passive response.
6. Perform the documented tap/click and drag/release gesture where supported.
7. Observe at least 5 seconds of recovery after interaction.
8. Retain a settled screenshot, a short multi-frame motion strip or recording, an active-interaction capture, and the runtime telemetry for each profile.
9. Repeat a suspected random-state failure with a fresh reload before confirming it as an outlier.

Record at minimum: catalog ID and public name, runtime surface, family, theme, viewport, active runtime ID, Canvas CSS/backing size, DPR, body count, body radius or point-size proxy, mobile body scale, observed frame continuity, named interaction, hard-gate results, axis scores, and concise evidence notes.

Automated metrics such as body count, radius, pixel-change ratio, or frame cadence are supporting evidence only. Browser-visible concept strength and motion quality remain the deciding evidence.

### Outlier decision rules

- **Critical outlier:** any hard-gate failure that breaks rendering, containment, title legibility, material language, interaction access, or mobile continuity.
- **High-confidence outlier:** any scored axis is 0 or 1 in any required profile.
- **Consistent weak outlier:** the same axis scores 2 on both desktop and mobile, or two or more axes score 2 within one profile.
- **Mobile-specific outlier:** mobile is at least two score levels below desktop on any axis, or loses the concept or named interaction after responsive reduction.
- **Motion-interest outlier:** autonomous motion/settling and temporal evolution both score below 3, or the physical rule and interaction payoff cannot compensate for a deliberately quiet idle state.
- **Healthy exception:** a simulation differs strongly in speed, density, or body size for a documented family reason, passes every hard gate, and scores at least 3 for concept legibility, visual payoff, interaction response, and mobile parity.
- **Watch item, not yet an outlier:** one isolated score of 2 that does not repeat across profiles or seeds and does not affect a core contract.

This decision unblocks the desktop and mobile evidence captures. Their outputs must use this exact rubric so the later visual-coherence and motion-interest judgments are comparable.
