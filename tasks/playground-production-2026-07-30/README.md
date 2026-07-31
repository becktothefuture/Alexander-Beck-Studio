# Playground Production Route Packet

## Purpose

This packet owns the design, implementation, integration, and verification of Playground as the fifth production route in the shared Studio Website shell.

The stable route identity is `playground`, with canonical path `/playground.html`, extensionless alias `/playground`, and working visible label `Playground`.

## Product outcome

Playground is a two-dimensional, pannable collection of small image, video, and code pieces. It uses a deterministic, content-sized toroidal world, a camera-aligned dot field, one accessible logical collection, an in-window lightbox, and the existing authoring panel architecture.

The initial catalogue contains exactly 20 local placeholder pieces:

- 8 images;
- 6 videos;
- 6 code demonstrations.

Placeholder labels and Lorem Ipsum descriptions are not portfolio evidence.

## Approved architecture

- React owns the route lifecycle and semantic collection.
- A route-local camera controller owns pointer, touch, wheel, and keyboard movement without React updates per frame.
- A route-local Canvas 2D renderer draws only visible dot intersections and consumes the shared simulation palette.
- The logical camera remains unbounded. Positive modulo is used only for rendering.
- Each logical item has one canonical grid placement. Presentation copies are non-semantic and non-interactive.
- Only the nearest visible instance may own active video or code media.
- The shell remains the owner of the physical frame, Button Bar, theme, cursor, sound, haptics, transitions, and overlay boundaries.
- `public/config/design-system.json` remains the only authored design source.
- One Playground control schema serves docked and detached panel hosts.

## Packet documents

- [Agreed PRD](./prd-playground.md)
- [Dependency graph](./dependency-graph.md)
- [Action sequence](./action-sequence.md)
- [Progress log](./progress-log.md)
- [Verification checklist](./verification-checklist.md)
- [Final verification record](./final-verification-record.md)

## Definition of complete

The route is complete only when the PRD acceptance criteria are satisfied, required source gates pass, Chromium and WebKit route-transition checks pass serially, the documented visual matrix is captured and inspected, configuration survives the full authored round trip, and an independent reviewer has no unresolved critical, high, or medium finding.

No commit, push, publish, or deployment is authorized by this packet.
