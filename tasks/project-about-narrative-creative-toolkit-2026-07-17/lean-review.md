# Independent Lean Engineering Review

## Accepted reductions

- Use one store preview transaction and component-local RAF throttling instead of a general gesture framework.
- Reuse native timeline horizontal scrolling and the existing `transport.zoom` value.
- Show content-driven editorial minimums without hard-clamping against live DOM measurements.
- Keep marquee selection to the visible range in v1; defer edge autoscroll.
- Replace Compress/Expand rhythm actions with one exact-gap control.
- Limit v1 clipboard behavior to Cue groups and Section duplication.
- Keep Camera recipes and World reuse in their existing dedicated systems.
- Use one selectable SVG Camera graph sampled at 48 points.
- Use two screen-space Camera pads rather than projection-aware 3D gizmos.
- Store World presets in the existing document library without a second version or capability framework.
- Put Camera repair commands into the shared diagnostics PRD.
- Use sequential live profile review rather than attempting DOM/WebGL screenshot compositing.
- Extend checkpoints with naming, profile, caps, and management; defer thumbnails.
- Keep runtime performance warnings advisory and avoid false per-modifier attribution.

## Deferred

- Marquee edge autoscroll.
- Generic multi-kind or system clipboard integration.
- Camera curve editing and true 3D viewport gizmos.
- Preset search for a small local library.
- Composited review stills and checkpoint thumbnails.
- Per-modifier performance profiling.

These reductions preserve the requested authoring outcomes while keeping the implementation aligned with the current About Narrative editor.
