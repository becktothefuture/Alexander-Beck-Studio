# Live Bézier path binding

## Implemented

- Preserved all 36 surviving meshes, material roles, IDs and base topology from the live scene.
- Replaced the 3,601-point poly rail with 48 aligned Bézier controls. Camera playback retains 2,001 exported poses and the existing 180-second reference timeline.
- Bound 29 static meshes to normalized positions on `FlightRail` through one shared Geometry Nodes group. Ten existing rotation owners and the final wall use fixed native path anchors. Four rotation owners have no remaining mesh children after the author's deletions.
- Kept browser-owned circle spacing and radius unchanged. Blender remains a simple surface authoring scene.
- Updated export to evaluate bound surfaces, transform local ambient motion into world space, and verify the actual final wall distance.

## Editing

Select `FlightRail`, press Tab, and move a control or its aligned handles. Ctrl+T changes bank. Keep Tilt Interpolation set to Linear so native camera and geometry frames agree. Keep the final controls straight for a straight approach. Space plays the camera in Object Mode; Numpad 0 enters camera view.

Static source mesh coordinates are unrolled: X is normalized journey position multiplied by 360, Y is lateral offset and Z is height. Keep their binding modifier. Changes to the rail update the scene immediately; saving and exporting updates the browser.

## Evidence

Evidence lives in `output/about-bezier-binding-20260919/`:

- `recovery/live-before.blend`: unsaved user scene before conversion.
- `rail-fit/linear-tilt-candidate.report.json`: 48-control fit, exact endpoint retention, 2,001-camera saved/reopened proof.
- `prototype/B8-BEZIER-BASIS.md`: diagnosed native EASE banking mismatch; Linear reduces frame reconstruction error to 0.000137 world units without changing controls or positions.
- `audit/final-report.json`: mesh preservation, 3-unit control edit, 6-unit endpoint extension, normalized stations, ambient motion and exact restoration.
- `export-audit/`: source export, strict browser sampling, animated Blender/browser parity and rejection tests.
- `studio-check-final.log`: canonical site gate passed after the final source and export fixes.
- `blender-overview.png` and `browser-*.png`: inspected authoring and website views.

## Review and limits

Independent review found and closed unsafe audit output paths and an insufficient static-binding assertion. CLI refusal checks preserve input bytes, and bypassing the shared surface graph fails the audit.

Large or self-crossing edits can still make scenery overlap; preview the whole flight after changing the route. The inherited close pass near 18.4% progress remains approximately 0.2935 world units at ambient time zero. This check does not certify clearance at every possible animation phase or future path shape.

The local development scene is updated. No commit or production deployment is part of this change.

## Final acceptance

The saved master and served manifest share SHA-256 `d8d5f75dfc807854012d330d5983546f1f55d14a19b09c17a53fc05aa757ee35`. Served camera and geometry bytes match the independently tested final bundle. Six in-app browser observations loaded that exact source without errors; light-theme desktop (1280×720) and mobile (390×844) screenshots were inspected. The browser generates 93,936 circles with the existing spacing/radius settings.

Blender playback advanced from frame 1 to 724 and was stopped. The saved file starts at frame 1 in camera view; the open authoring session has FlightRail selected in an overview. The Blender control claim was released. The existing local server and saved-source watcher remain running.
