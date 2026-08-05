Type: task
Status: resolved
Blocked by: 01

## Question

What does every production Home Daily Simulation look and feel like at desktop size across its first readable frame, settled state, active motion, and supported pointer interactions, and what comparable evidence should be retained for later outlier decisions?

## Answer

### Decision

Retain a matched six-frame sequence for every production Daily Simulation in both themes, plus runtime and sampled-canvas measurements. The complete desktop evidence set is 192 screenshots: 16 simulations × 2 themes × 6 states.

The controlled profile was `1440×960`, DPR 1. Each run captured the first readable frame, 5 seconds, 10 seconds, 20 seconds, a common pointer-move/click/drag sequence, and 5 seconds of recovery. Every simulation reached the requested catalog ID and a ready, idle runtime state. All Home-mode canvases rendered at `1412×906`; the three route-backed Daily Focus entries also returned to the clean Home audit URL.

Evidence:

- [Light review sheets, simulations 1–4](../../../output/playwright/home-simulation-coherence/desktop/review-light-01-04.png)
- [Light review sheets, simulations 5–8](../../../output/playwright/home-simulation-coherence/desktop/review-light-05-08.png)
- [Light review sheets, simulations 9–12](../../../output/playwright/home-simulation-coherence/desktop/review-light-09-12.png)
- [Light supplemental review, simulations 9–10](../../../output/playwright/home-simulation-coherence/desktop/review-light-09-10-small.png)
- [Light review sheets, simulations 13–16](../../../output/playwright/home-simulation-coherence/desktop/review-light-13-16.png)
- [Light supplemental review, simulations 13–14](../../../output/playwright/home-simulation-coherence/desktop/review-light-13-14-small.png)
- [Dark review sheets, simulations 1–4](../../../output/playwright/home-simulation-coherence/desktop/review-dark-01-04.png)
- [Dark supplemental review, simulations 1–2](../../../output/playwright/home-simulation-coherence/desktop/review-dark-01-02-small.png)
- [Dark supplemental review, simulations 3–4](../../../output/playwright/home-simulation-coherence/desktop/review-dark-03-04-small.png)
- [Dark review sheets, simulations 5–8](../../../output/playwright/home-simulation-coherence/desktop/review-dark-05-08.png)
- [Dark review sheets, simulations 9–12](../../../output/playwright/home-simulation-coherence/desktop/review-dark-09-12.png)
- [Dark review sheets, simulations 13–16](../../../output/playwright/home-simulation-coherence/desktop/review-dark-13-16.png)
- [Dark supplemental review, simulations 13–14](../../../output/playwright/home-simulation-coherence/desktop/review-dark-13-14-small.png)
- [Dark supplemental review, simulations 15–16](../../../output/playwright/home-simulation-coherence/desktop/review-dark-15-16-small.png)
- [Raw desktop evidence](../../../output/playwright/home-simulation-coherence/desktop/)

### Desktop scorecard

Scores use the rubric's 0–4 scale and the lower result where light and dark differ. Abbreviations: `Mat` material weight, `Den` density/negative space, `Hier` composition/title hierarchy, `Pal` palette/surface cohesion, `Pay` visual payoff, `Auto` autonomous motion, `Evo` temporal evolution, `Rule` physical-rule legibility, `Resp` interaction salience, and `Rec` recovery/replay value.

| Simulation | Count / radius | Mat | Den | Hier | Pal | Pay | Auto | Evo | Rule | Resp | Rec | Desktop evidence note |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Foundation | 300 / 12.66px | 4 | 3 | 4 | 4 | 4 | 2 | 2 | 4 | 4 | 4 | A convincing gravity pile. It becomes quiet after settling, but the pointer explosion and physical recovery are among the collection's clearest interactions. |
| Attention | 60 / 12.66px | 2 | 2 | 1 | 4 | 2 | 2 | 2 | 3 | 4 | 3 | One small compact cluster leaves most of the wall inactive and repeatedly parks over the title. Pointer movement relocates it decisively. |
| Scaffold | 104 / 12.66px | 2 | 2 | 3 | 4 | 3 | 3 | 3 | 4 | 2 | 3 | The rotating cube is conceptually clear, but a single-particle outline has much less material depth than the strongest modes and the common interaction barely changes its visual state. |
| Flow | 300 / 12.66px | 4 | 1 | 1 | 4 | 4 | 4 | 3 | 4 | 4 | 4 | Strong fluid force and clearing response, but the untouched field is uniformly over-dense and masks the title at every sampled settled interval. |
| Tension | 217–218 / 8.9px | 3 | 3 | 2 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | A strong route-backed swarm that forms clusters, arcs, and open channels. Several high-density states still cross or engulf the title. |
| Continuity | 94 / 12.66px | 3 | 2 | 2 | 4 | 3 | 3 | 3 | 4 | 2 | 3 | The rotating sphere reads, but it is thin and repeatedly occupies the same central/title zone. Pointer input adds little visible consequence. |
| Convergence | 124 / 10.4px | 3 | 3 | 1 | 4 | 4 | 4 | 4 | 4 | 3 | 4 | The flock has excellent autonomous shape change, but its dense horizontal body crosses the title in nearly every sampled state. |
| Cohesion | 120 / 12.66px | 4 | 3 | 2 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | The compact blob has strong identity, deformation, and recovery. Its centre-seeking path repeatedly covers a substantial part of the title. |
| Juxtaposition | 132 / 12.66px | 2 | 2 | 3 | 3 | 2 | 2 | 2 | 2 | 1 | 2 | A sparse, evenly scattered field with no strong aggregate silhouette. Passive, active, and recovery frames are too similar, so the intended weave is hard to see. |
| Refraction | 170 / 12.66px | 4 | 1 | 1 | 4 | 4 | 4 | 4 | 4 | 3 | 3 | High-impact mirrored motion, but the full-wall density competes with the title continuously rather than creating a controlled foreground/background rhythm. |
| Emergence | 160 / 12.66px | 3 | 3 | 3 | 4 | 3 | 4 | 3 | 3 | 2 | 3 | Sustained rising motion and good distribution. It remains less distinctive under the common pointer sequence, but it is the most balanced general field in the current set. |
| Magnetic Field | 180 / 12.66px | 4 | 3 | 2 | 4 | 3 | 0 | 0 | 1 | 4 | 4 | The untouched Canvas was pixel-identical at 1, 5, 10, and 20 seconds in both themes. It becomes highly responsive only after input, making the default experience inert. |
| Perspective | 200 / 12.66px source radius | 1 | 1 | 3 | 2 | 1 | 2 | 2 | 2 | 1 | 2 | The depth field is extremely faint and sparse, especially in light theme. Its points neither establish enough aggregate material nor show a salient pointer event. |
| Multiplicity | 28 source bodies, mirrored / 12.66px | 4 | 4 | 3 | 4 | 4 | 4 | 4 | 4 | 4 | 4 | The strongest structured-field benchmark: concentric rhythm, clear temporal change, decisive interaction, and a coherent recovery without becoming visually generic. |
| Fountain B | 30–86 dynamic / 12.66px | 3 | 2 | 2 | 4 | 3 | 3 | 4 | 4 | 3 | 3 | The choreography develops into a recognisable fountain, but the first readable state can be almost empty and later arcs repeatedly cut through the title. |
| Depth | 1,146 / 7.27px | 1 | 2 | 4 | 3 | 2 | 2 | 2 | 3 | 1 | 2 | The concentric geometry protects the title, but the tiny bodies and low visible coverage make the field feel remote and underpowered. Pointer input produces little obvious change. |

### Collection-level desktop findings

The desktop collection currently has three different quality bars:

1. **Strong material events:** Multiplicity, Foundation during interaction, Tension, Cohesion, and Refraction have memorable shape change and a clear physical identity.
2. **Functional but under-resolved fields:** Scaffold, Continuity, Emergence, and Fountain B communicate their idea, but their material presence, hierarchy, or pointer payoff needs comparison with mobile before a final outlier decision.
3. **Clear desktop outliers:** Magnetic Field is inert without input; Perspective and Depth are too faint/small; Juxtaposition lacks a visible woven structure or interaction delta; Flow is over-dense and compromises the title.

Title interference is a second cross-cutting problem. Attention, Flow, Convergence, Cohesion, and Refraction repeatedly occupy the title zone in settled samples. Tension and Fountain B do this less consistently. These are hard-gate candidates, not yet final failures: the mobile evidence and fresh-state review must distinguish sustained occlusion from acceptable momentary crossings.

Theme parity is generally sound at the renderer level, but the lower-contrast modes lose more material in light theme. Perspective and Depth are clearest examples. Attention and Continuity also feel lighter on the white surface. Dark-theme glow does not rescue weak aggregate geometry.

The best shared target is therefore not one density value. Multiplicity demonstrates structured visual weight, Tension and Cohesion demonstrate autonomous transformation, Foundation demonstrates consequential input and recovery, and Emergence demonstrates usable negative space. Later remediation should borrow those qualities while preserving each simulation's own rule.

### Measurement support

- All 13 Home modes exposed a stable target/adaptive cadence near 60 FPS with no throttle escalation during capture; the route-backed canvases remained visually continuous under the same page-level RAF sampling.
- Home-mode normal-body radius was `12.66px`; accepted exceptions were Tension at `8.9px`, Convergence at `10.4px`, and Depth at `7.27px`. Only Tension and Convergence currently compensate with a strong aggregate silhouette.
- Sampled occupied coverage supports the visual judgment: Perspective was approximately `1.3–1.6%`, Depth `0.9–1.9%`, and Juxtaposition approximately `2.2%`; Flow was approximately `13.5%` before interaction.
- Magnetic Field's untouched frame-difference ratio was exactly `0` across the full 20-second interval in both themes, then rose to approximately `15.5%` after the pointer sequence.
- Foundation's interaction changed approximately `18.5%` of the sampled Canvas after its quiet settled state. Flow changed approximately `25.5%`. These are useful interaction-salience references.

This resolves the desktop capture. The mobile capture must reuse the same states and score order so the later outlier tickets can compare concept retention, touch response, title legibility, and responsive density directly.
