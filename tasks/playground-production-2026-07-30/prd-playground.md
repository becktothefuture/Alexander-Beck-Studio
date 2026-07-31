# PRD: Playground Production Route

## 1. Introduction

Add Playground as a fifth production view inside the existing Studio Website shell. Playground is an open-ended spatial catalogue for individual visual and interactive pieces. It must feel native to the site's engineered, editorial design language while remaining accessible, deterministic, configurable, and ready for catalogue growth.

## 2. Goals

- Add stable production route ID `playground` at `/playground.html` and `/playground`.
- Preserve the stable physical shell and make the Button Bar support five destinations.
- Provide seamless two-axis panning without application-level zoom.
- Place work deterministically on an append-stable dot-aligned plane.
- Grow the repeated world period from content footprint without a fixed catalogue limit.
- Provide exactly 20 local placeholder pieces: 8 image, 6 video, and 6 code.
- Keep one semantic collection and one interactive instance for each logical item.
- Provide an accessible in-window lightbox with shareable `?work=<id>` state.
- Add a Playground parameter surface that survives live apply, canonical save, reload, build, and preview.
- Meet existing theme, reduced-motion, sound, haptic, cursor, performance, and lifecycle contracts.

## 3. User stories

### US-001: Enter Playground

As a visitor, I want to open Playground from the persistent Button Bar so I can explore it as part of the same site.

Acceptance criteria:

- [x] Five primary destinations remain visible and usable at desktop, tablet, and mobile sizes.
- [x] Direct `/playground.html` and alias `/playground` loads resolve the same route.
- [x] The route title and loading announcements identify Playground.
- [x] Only route-owned content transitions; the physical shell remains fixed.

### US-002: Understand the opening composition

As a visitor, I want a clear title, description, and movement instruction so I know how to use the spatial view.

Acceptance criteria:

- [x] The authored title anchor is logical origin `(0, 0)`.
- [x] The title uses Instrument Serif only for the H1.
- [x] The description uses Geist and the instruction uses Geist Mono.
- [x] The route uses the shared title rule and entrance sequence: identity, context, action, support.
- [x] The first readable frame uses final geometry and a centred title anchor.

### US-003: Pan through an infinite-feeling world

As a visitor, I want to move in any direction without reaching an empty edge.

Acceptance criteria:

- [x] Mouse, pen, touch, wheel, trackpad, arrow keys, and WASD use one camera controller.
- [x] Home recentres on the title.
- [x] Logical camera values remain unbounded.
- [x] Rendered camera values use positive modulo.
- [x] Dynamic neighbouring copies cover the viewport plus the largest item.
- [x] Resize preserves the logical world point under the usable viewport centre.
- [x] Ctrl-wheel and Command-wheel are not converted into route panning or application zoom.

### US-004: Browse deterministic work placement

As an author, I want existing pieces to stay in place when I append new work.

Acceptance criteria:

- [x] Every item has a stable ID and append-only `placementOrder`.
- [x] Placement uses integer grid positions and spans.
- [x] Collision checks include media, labels, gaps, and the protected title region.
- [x] The same seed and catalogue reproduce the same positions and world dimensions.
- [x] Adding item 21 does not move items 1–20.
- [x] Continued additions and increased spans can expand the world.
- [x] Invalid placement configuration fails with a bounded diagnostic.

### US-005: Open media accessibly

As a keyboard, pointer, or assistive-technology user, I want to open and close a selected piece without losing context.

Acceptance criteria:

- [x] Enter, Space, and pointer click open a piece.
- [x] `?work=<item-id>` opens valid work after readiness; invalid IDs fail safely.
- [x] The lightbox is a named dialog inside the studio window.
- [x] Focus is trapped and restored to the exact originating logical item.
- [x] Escape, Back, backdrop, close control, and specified media-shell clicks close it.
- [x] Browser Back closes selection before leaving Playground.
- [x] Background world content is inert and cannot pan while the dialog is open.

### US-006: Consume media without duplicate runtimes

As a visitor, I want media to load reliably without unnecessary playback or duplicated code runtimes.

Acceptance criteria:

- [x] Images lazy-load, decode asynchronously, preserve ratio, and show a fallback on failure.
- [x] World videos remain muted, use posters, play only when sufficiently visible and motion is allowed, and pause on exit or selection change.
- [x] Code previews are local and pointer-inert in the field.
- [x] Active iframes are titled and sandboxed without unnecessary same-origin permission.
- [x] Repeated copies do not duplicate active videos, iframes, tab stops, URLs, or analytics identity.

### US-007: Tune Playground through the established panel

As an author, I want to adjust the world, work, grid, and motion values without editing source code.

Acceptance criteria:

- [x] One schema defines all requested controls and actions.
- [x] Docked and detached hosts use the same schema and runtime owner.
- [x] Live apply updates the route immediately.
- [x] Save writes the canonical `playground` namespace.
- [x] Reload, flatten/build, and preview preserve every authored field.
- [x] Diagnostics are read-only and excluded from canonical config.

## 4. Functional requirements

### Route and shell

- FR-001: Register `playground` in the route manifest with canonical and extensionless paths, title metadata, shared-shell layout, and fifth shell-tab order.
- FR-002: Add production HTML, React entry, Vite input, route descriptor, scene mount, readiness predicate, loader label, validators, and audit matrices.
- FR-003: Keep the exposed band, wall, frame, studio-window clip, Button Bar, theme, sound, and cursor physically stable.
- FR-004: Preserve effective target sizes of at least 44px and Button Bar clearance at all supported viewports.

### Content and placement

- FR-005: Load one canonical `public/config/contents-playground.json` source.
- FR-006: Validate IDs, placement order, types, labels, descriptions, accessibility text, sources, dimensions, aspect ratios, spans, and local safe URLs.
- FR-007: Support any catalogue length without code changes.
- FR-008: Provide balanced, loose, and clustered seeded placement presets.
- FR-009: Protect the measured title lockup and its safe padding from work placement.
- FR-010: Calculate a quantized world boundary from content footprint, labels, gaps, padding, and minimum dimensions.
- FR-011: Default world dimensions must be at least 80 × 56 cells and larger than 2000 × 1400 pixels.

### Camera and grid

- FR-012: Keep logical and rendered camera positions separate.
- FR-013: Calculate the smallest neighbouring-copy set that covers the current viewport.
- FR-014: Use a Canvas 2D dot field with the same camera phase and grid spacing as work.
- FR-015: Use deterministic coordinate hashing and the shared time-of-day palette distribution for sparse coloured material.
- FR-016: Clamp DPR through project conventions and redraw only for camera, viewport, palette, or grid changes.
- FR-017: Use bounded velocity, bounded inertia, pointer capture, and a documented click-versus-drag threshold.
- FR-018: Prevent page-scroll leakage only while route panning is active.
- FR-019: Do not implement route zoom or disable browser zoom.

### Interaction and motion

- FR-020: Nearby work may use bounded world-coordinate pointer attraction as presentation only.
- FR-021: Disable attraction on touch/coarse input, during drag, while a dialog is open, and for reduced motion.
- FR-022: Reduced motion retains panning, wrapping, hierarchy, selection, and focus while removing inertia, overshoot, attraction, scale travel, blur travel, and stagger.
- FR-023: Route-owned sound must use the global sound state and stop on exit.
- FR-024: Route-owned haptics must reuse existing tap/open/close/step semantics and remain supplemental.

### Lightbox and accessibility

- FR-025: The semantic main contains one H1 and one ordered logical collection of 20 unique items.
- FR-026: Repeated visual copies are hidden from accessibility and cannot receive focus.
- FR-027: The lightbox must fit intrinsic media inside studio-window safe insets and Button Bar clearance.
- FR-028: Dialog motion must use the shared large-surface/modal tier and preserve complete reduced-motion behavior.
- FR-029: Text and controls must meet WCAG 2.2 AA in both site themes and use visible focus.

### Configuration

- FR-030: Add canonical `playground` config values with these defaults and bounds: `layoutPreset=balanced` with `balanced|loose|clustered`; numeric `layoutSeed=271828`; `gridSpacingPx=48` from 32–72 step 4; `minimumWorldColumns=80` from 56–160 step 8; `minimumWorldRows=56` from 40–112 step 8; `worldPaddingCells=8` from 4–20 step 1; `targetDensity=0.18` from 0.08–0.32 step 0.01; `itemGapCells=2` from 1–6 step 1; `itemScale=1` from 0.75–1.35 step 0.01; `sizeVariation=0.28` from 0–0.5 step 0.01; `labelGapPx=8` from 4–16 step 1; `dotRadiusPx=3.5` from 2–7 step 0.25; `dotOpacity=0.72` from 0.35–1 step 0.01; `accentFrequency=0.28` from 0.1–0.5 step 0.01; `wheelSensitivity=1` from 0.5–1.6 step 0.01; `dragMomentum=0.84` from 0–0.96 step 0.01; `proximityRadiusPx=320` from 160–480 step 8; and `proximityStrengthPx=18` from 0–30 step 1.
- FR-031: Clamp every configured value to the specified PRD bounds during normalization.
- FR-032: Provide Recenter, Generate new seed, Reset, and Save actions.
- FR-033: Expose read-only counts and world/media diagnostics without persisting them.
- FR-034: Keep topology, zoom policy, click threshold, accessibility, focus, sandbox, palette ownership, media identity, panel geometry, disposal, and safeguards hardcoded.

### Performance and lifecycle

- FR-035: Do not update React state per RAF frame or per pointer movement.
- FR-036: Keep camera and dot hot loops allocation-free and bounded.
- FR-037: Do not promote every world item to its own compositor layer.
- FR-038: Pause or dispose offscreen and inactive media, route animation, listeners, observers, palette subscriptions, audio, and RAF handles.
- FR-039: Preserve SPA remount correctness and generation-safe readiness.

## 5. Non-goals

- No standalone microsite, lab route, admin dashboard, or settings page.
- No masonry grid, scrollable document, zoomable whiteboard, or Work replacement.
- No physical-shell redesign.
- No external CDN, embed service, remote code playground, real client claim, or outcome claim.
- No Playground-specific palette, cursor, mute system, transition orchestrator, persistence system, or `lil-gui` dependency.
- No thin helper rings, connectors, axes, rulers, crosshairs, generic glows, tilt, or cursor trails.

## 6. Design considerations

- Direction: refined spatial instrument with editorial warmth and restrained playful motion.
- The memorable feature is a seamless dot-aligned work field that feels materially connected to the site's existing ball/circle palette language.
- Use the existing title lockup, title rule, semantic typography tokens, soft-control material, and window-clipped overlay hierarchy.
- Keep work labels quiet, aligned, monospaced, and readable rather than converting them into cards or chips.

## 7. Technical considerations

- Current normalization drops unknown top-level namespaces; this must be fixed before save is safe.
- Current route and audit matrices contain hard-coded four-route assumptions.
- The current worktree contains unrelated staged and unstaged changes, including shared route/config files. Preserve them and review only task-owned deltas.
- Existing Button Bar playground code is a development lab and is not the production Playground route.
- The detached panel host exists structurally but needs a valid user-gesture opener and a shared schema registration.

## 8. Success metrics

- All deterministic layout and content tests pass.
- Required source/build gates pass.
- Playground browser audit proves the complete interaction and accessibility contract.
- The five-tab shell has no overlap at 1440 × 1000, 834 × 1194, and 390 × 844 in both themes.
- Chromium and WebKit transition checks pass serially.
- No console/page/local-asset error remains during the verified Playground matrix.
- Independent review has no unresolved critical, high, or medium finding.

## 9. Open questions

- The visible route label remains `Playground` until a later explicit naming decision selects Studio Lab, Sketchbook, or Fieldwork. Internal IDs and paths will not change.
- The root cursor instruction conflicts with current implementation/reference evidence. Playground will not edit cursor behavior; it will inherit the current shared implementation.
