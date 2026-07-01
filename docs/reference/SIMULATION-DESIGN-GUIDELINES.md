# Simulation Design Guidelines

Canonical guardrails for designing, prototyping, tuning, and promoting simulations in the Alexander Beck Studio Website.

Use this before creating a new mode or lab route. It exists because several prototypes technically worked but failed the site style: overlapping circles, decorative trails, weather overlays, and effects that did not feel like the studio's material system.

Related references:
- [`MODES.md`](./MODES.md) - current registered modes and narrative order
- [`PEBBLE-BODIES.md`](./PEBBLE-BODIES.md) - shared body material language
- [`CONFIGURATION.md`](./CONFIGURATION.md) - runtime/config keys and persistence model
- [`MATERIAL-PRESENCE.md`](./MATERIAL-PRESENCE.md) - continuity and motion principles
- [`PORTFOLIO-PIT-PHYSICS.md`](./PORTFOLIO-PIT-PHYSICS.md) - collision/contact failure modes

---

## 1. North Star

Every simulation should feel like a designed physical artifact inside the wall, not a decorative effect placed over the site.

A strong simulation has:
- one memorable physical rule;
- large enough bodies to read as material;
- clear spacing, contact, or field structure;
- an initial composed state or visible material event before interaction;
- pointer input mapped to a named physical action;
- palette and wall behavior that belong to the existing site.

---

## 2. Base Visual Language

### Bodies

Default to the existing ball/pebble material family:
- smooth, slightly irregular pebble bodies;
- stable visual weight;
- restrained size variation;
- flat palette fills unless a mode has a strong reason for custom rendering;
- render-only organic variation over simple, trusted simulation geometry.

Perfect circles are allowed only as a deliberate fallback:
- tiny dots where the pebble contour would be unreadable;
- direct-render depth fields where the point-cloud concept is explicit;
- performance LOD when a documented mode requires it.

Do not make large, hero-visible bodies into generic circles when they should read as site pebbles.

### Size

Future simulations must preserve cross-mode size coherence.

Use the existing radius scale and count budgets as the reference:
- home pit bodies define the baseline material family;
- hidden/fallback portfolio pit bodies were larger because they were navigation objects;
- point-cloud modes can be smaller, but only when the concept is depth, flocking, or field sampling;
- lab defaults must preserve the same readable pebble contour used by the current rotation.

When in doubt, reduce count before reducing size.

### Color

Use the active London weather/design-system palette and the canonical `colorDistribution` contract.

Rules:
- neutral palette roles should remain dominant;
- saturated colors are accents, not a confetti field;
- bright accents should be rare and consequential;
- do not introduce a parallel color system in a renderer;
- route-backed labs must load palette/theme from `design-system.json`.

---

## 3. Hard Avoid Rules

### No Visible Circle Overlap

Visible overlapping circles are a hard fail for this site.

The simulation can have contact, packing, stacking, compression, or soft-body pressure, but the visible result must not read as unresolved circle collisions. Use one of these:
- real collision separation;
- explicit surface gaps;
- render geometry that stays inside the trusted collision envelope;
- a custom material model where overlap is hidden by a coherent surface, not shown as circle clutter.

Reject any prototype whose main visual is a pile, ring, braid, or cloud of overlapping opaque circles. This was the primary failure of Ferro Weave and must not be repeated.

### No Weather Overlays

Avoid rain-on-glass, veil, prism, weather skin, or screen-overlay concepts unless explicitly requested.

These tend to fight the site's material language because they become:
- a layer over the wall instead of a physical object in the wall;
- trails, streaks, pixels, or blend modes instead of pebbles;
- atmospheric decoration without object permanence.

### No Long Trails As The Main Visual

Trails, ghost layers, color smears, and persistent wake marks should not carry the concept.

Short wake cues are acceptable when they clarify a physical interaction. Long decorative trails are not.

### No Thin Field Or Cursor Lines

Do not add thin stroked lines to simulation canvases as field, cursor, radius, construction, orbit, wake, or helper visuals.

This includes cursor radius rings and nested pointer circles. Forces should read through material motion, spacing, collision response, or broad tonal fields only.

---

## 4. Accepted Simulation Families

These are the proven families in the current collection. New work should fit one of them or intentionally define a stronger alternative.

### Bounded Physical Pebbles

Examples: `pit`, `portfolio-pit`, `water`, `bubbles`, `magnetic`.

Use when the main rule is gravity, contact, buoyancy, drag, pressure, or collision.

Requirements:
- collision/contact must be readable;
- no visible clipping;
- wall containment must match the inner rounded wall;
- sleeping/settling should remove jitter where relevant;
- pointer forces must feel like a hand or field acting on material.

### Structured Field Or Lattice

Examples: `elastic-center`, `weave-field`, `kaleidoscope-3`.

Use when the visual payoff is order, tension, symmetry, weaving, or resonance.

Requirements:
- structure must be visible from the first seconds;
- body spacing must stay disciplined;
- invisible links/fields need an obvious visual payoff;
- motion should loosen and reform the structure without turning into clutter.

### Soft Linked Material

Example: `flubber-blob`.

Use when the simulation is a single material object made from many beads.

Requirements:
- beads must behave as one connected material;
- contact/overlap artifacts must be controlled;
- deformation should be tactile and recoverable;
- complexity must buy visible material quality.

### Behavioral Swarm

Examples: `flock-of-birds`, `critters`, `flies`.

Use when individual agents are less important than collective behavior.

Requirements:
- the rule must be legible without labels;
- separation must prevent muddy clustering;
- pointer influence should redirect or disturb the group, not simply gather it;
- typed arrays or spatial grids should bound neighbor work.

### Budgeted Depth / Object Point Cloud

Examples: `3d-cube`, `3d-sphere`, `starfield-3d`, `parallax-float`.

Use when the concept is spatial depth, camera response, or object rotation.

Requirements:
- dot size must stay coherent with the rest of the site;
- depth fade should clarify space, not make particles disappear;
- object/camera interaction must be graspable;
- avoid familiar starfield/sphere/cube tropes unless the execution is clearly site-specific.

---

## 5. Wall And Scene Contract

The wall is part of the simulation.

Rules:
- render inside the existing `#simulations` wall and canvas model;
- use the active wall surface from shell/design config;
- respect rounded inner-wall geometry and wall insets;
- do not add page-local wall languages, decorative cards, or separate scene frames;
- avoid blend-mode overlays that make the wall feel like a video layer;
- route labs may suppress extra shell effects for focus, but must still feel like the same inner wall.

The first readable frame should already feel composed. Do not rely on a long buildup to make the simulation make sense.

---

## 6. Interaction Rules

Pointer interaction should map to one named physical action:
- pressure;
- drag and release;
- local wake;
- phase/tuning disturbance;
- temporary gap opening;
- field bending;
- material shear.

The named action must be visible in the default lab capture and in the targeted pointer QA pass.

Reduced motion must keep the final composition readable while lowering speed, count, drift, and impulse strength.

---

## 7. Configuration And Parameterizer Rules

Authored design truth is `react-app/app/public/config/design-system.json`. Generated runtime files are compatibility/build outputs.

For route-backed lab prototypes, per-demo JSON is acceptable during exploration, but it must be treated as a lab source and not confused with final design truth.

A control is complete only when it supports:
- live apply in dev;
- save/export to the intended authored source;
- reload parity;
- root build parity;
- preview parity.

Control surfaces should expose only high-signal choices:
- count/density;
- body size;
- field/material strength;
- damping/speed;
- pointer radius/strength;
- target FPS;
- max DPR;
- pause when hidden.

Avoid stale controls. If a value is removed from the UI, remove or bypass its persistence path too.

---

## 8. Route-Backed Lab Checklist

Use a route-backed lab when the prototype needs a custom renderer, typed arrays, its own config, or a focused Parameterizer workflow.

Required pieces:
- `/lab/<id>.html`;
- `src/entries/<id>.jsx`;
- route module under `src/routes/<id>/`;
- route definition in `src/lib/routes.js`;
- route runtime mapping in the React shell;
- Vite build input;
- registry metadata with `enabledInRotation: false` until promoted;
- `/config/<id>-demo.json` or a clearly documented staging-only persistence path;
- dev save endpoint when JSON persistence is expected;
- renderer metrics/debug hook for QA;
- `targetFps`, `maxDpr`, reduced-motion behavior, and visibility pause.

Do not promote a lab into the main rotation until it passes the acceptance gate below.

---

## 9. Promotion Gate

A simulation can be considered for the main narrative only when all are true:

- No visible body clipping, unresolved overlap, or muddy circle stacking.
- The default view reads as a finished composition within the first second.
- The initial scene has a visible material state before interaction.
- Pointer input has a named visible effect: pressure, wake, drag, shear, gap opening, tuning, or field bending.
- It uses the site palette and wall language without new decorative systems.
- It has a clear physical or behavioral identity that can be described in one sentence.
- Mobile count, DPR, and FPS are bounded.
- Reduced motion remains coherent.
- Config values survive save, reload, build, and preview.
- The visual result beats the weaker Extended tier modes, not only the rejected prototype it replaced.

Verification before promotion:
- `npm --prefix react-app/app run lint`
- `npm run build`
- targeted browser/canvas checks for nonblank render, DPR cap, mobile bounds, and pointer effect
- `npm run certify:screens` after integration into shared visual routes
- `npm run audit:canvas-spa` when routing/canvas remount behavior changes
- transition audits when route/motion ownership changes

---

## 10. Lessons From Rejected Directions

### Resonance Bloom

Problem: fixed or weakly changing particle structure became boring; trails and ornamental field marks drifted away from the site material language.

Rule: a resonance concept must visibly reform and lock into a strong structure using bodies, not rely on trails or explanatory field lines.

### Rain Veil / Rain-Like Concepts

Problem: weather/rain/glass ideas quickly read as an overlay or generic atmospheric effect.

Rule: avoid weather simulation language unless the visible material is clearly site-native and object-based.

### Tidal Masonry

Problem: tactile premise was not enough; the result was underwhelming without a distinct visual payoff.

Rule: "large pebbles moving around" is not a concept. The system needs a memorable formation, material event, or physical rule.

### Ferro Weave

Problem: the concept produced overlapping circles, central bunching, and arranged beads instead of a coherent material phenomenon.

Rule: no visible circle overlap, no circular bead piles, no field demo that has to be explained as fluid or ferrofluid. If the material cannot be represented without overlap artifacts, choose a different concept.

### Wall Repel / Repel Room

Problem: early random placement plus repulsion/collision parked in the center and did not create a distinctive composition.

Rule: wall interaction needs launched directional inertia, strong wall kick, clear body separation, mobile-bounded count/DPR, and no visible cursor rings or explanatory field lines.

---

## 11. Design Review Questions

Before coding:

1. What is the one physical rule visitors will remember?
2. What is the default first-frame composition?
3. What visible state change happens before pointer input?
4. What named physical action does pointer input trigger?
5. How are body size, color, and spacing tied to the existing site?
6. What prevents overlap, visual clipping, or muddy clustering?
7. What is the reduced-motion version?
8. Which config source owns the authored values?
9. What will make us delete it quickly if it fails?

If these answers are weak, do not start implementation.
