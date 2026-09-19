# Parameter ownership and round-trip evidence

17 September 2026. Implementation record. Numeric scene values come from the saved source and its exported `controlDefinitions`, not this document.

| Value | Writable owner | Browser behavior |
| --- | --- | --- |
| Copy, career and clients | `public/config/contents-about.json` | Complete semantic story; canonical copy editor |
| Fifteen typography values | Same document | Live CSS variables, measured prose reflow, save/reload/revert |
| Rail points and tilt | Blender `FlightRail` | Evaluated camera samples, no gaze correction |
| Point geometry and common radius | Saved Blender objects / `About World Controls` | Camera-facing Home circles |
| Point spacing | Authored source sampling | Export rejects changed spacing until surfaces are resampled |
| Fog and beat boundaries | Saved source | Shared distance fog; native scroll mapping |
| Rotation periods, phases and amplitudes | Source motion controller objects | Independent absolute-time loops |
| Final wall wave | Saved source motion definition and Geometry Nodes | Matching displacement equation |
| Gradient finish and active palette | Shared Home material and palette controller | Live theme/palette atlas; Blender packs a reference snapshot |
| Title centre, shell and publication gate | Fixed website contracts | Not adjustable scene controls |

Paths beginning `public/` are relative to `react-app/app/`. The fresh panel is `src/routes/about-rollercoaster/AboutRollercoasterControls.jsx`. It reuses the 280px tool shell and existing validated About persistence server. Scene parameters are read-only there. No property has two writable owners.

## Evidence

- Source is saved and reopened in background Blender. Export proves that perturbing the live rail moves the evaluated camera without changing the saved file.
- Evaluated source points and runtime motion equations are compared at explicit ambient times. Reports are in `output/about-rollercoaster-build-20260917/source/`.
- Before publication, staging is checked by the actual browser contract and against the saved source SHA. Invalid radius, fog, clocks, data hashes and source identity leave the canonical bundle unchanged in publisher tests.
- Browser typography proof: body scale `1 → 1.01`, Save, Reload, read back `1.01`, restore `1`, Save. The entire canonical JSON returned to its original SHA: `cccb029975e234a383c42b9f2c9bc9150a6ff43f474ccb592ce52dff6bcdfd41`.
- Browser live-only body scale `1.8` reflowed with no horizontal overflow. Reload restored the canonical value. This is not a claim of OS/browser 200% zoom verification.

## Limits

Object animation in version 1 uses the ambient clock. Camera travel uses scroll. Scroll-bound object motion is rejected rather than presented as a working control.

Source transform restrictions are enforced by the exporter and documented in the [source guide](../../../source-assets/about-rollercoaster-reset/README.md). A source edit can still make the composition or camera clearance poor: export validation does not replace the scene audit and browser review.

The live Blender MCP connection was unavailable; authoring and evaluation used isolated background Blender. No open user scene was controlled. The preserved planning inventory is in `output/about-rollercoaster-build-20260917/recovery/PARAMETER-OWNERSHIP-planned.md`.
