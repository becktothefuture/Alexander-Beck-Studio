# Spatial Scan Lab

The local route is:

```bash
npm run dev
open http://127.0.0.1:8012/lab/spatial-scan.html
open "http://127.0.0.1:8012/lab/spatial-scan.html?mode=loop"
open "http://127.0.0.1:8012/lab/spatial-scan.html?mode=scroll"
open "http://127.0.0.1:8012/lab/spatial-scan.html?mode=orbit"
```

This lab turns a cleaned real-world scan into flat site-circle point-cloud assets plus a baked camera path. It is intentionally not part of the daily rotation until a real scan has been reviewed.

## Scan Handoff

Ask for the first test file exactly this way:

```text
Please provide the test apartment scan file.

Preferred:
- A single `.glb` export from Scaniverse, Polycam, or RealityScan.
- Scan should be one connected apartment walkthrough route, ideally 2-3 rooms for the first test.
- Keep the first test under about 250-500 MB if possible.

Also useful:
- A short note describing the intended route, e.g. "start in hallway, turn into living room, pass kitchen, end by window."
- Optional phone video of the walkthrough for camera reference.
- Optional `.spz` or `.ply` splat export if you want a Gaussian-splat comparison.

Avoid:
- Faces, private documents, readable addresses, sensitive screens, mirrors/glass as hero surfaces, and copyrighted artwork in clear view.
```

Use Scaniverse first. Export a mesh `.glb` for the v1 point-cloud pipeline. Keep any raw `.spz` or `.ply` splat export as a separate comparison asset, not runtime source.

## Self-Recorded Scan Checklist

For the next real pass, record one connected apartment route and send the exported mesh plus a route note. The current pipeline is proven with the Korea Apartment test, so the next run should replace only the scan source and attribution.

Capture guidance:

- Prefer Scaniverse `.glb`; Polycam `.glb` is the backup.
- Walk one continuous route with slow, steady movement.
- Include floors, walls, ceiling edges, doorframes, and room corners; those features make the point cloud read as space.
- Avoid scanning close-up shiny mirrors, readable screens, private documents, addresses, and faces.
- Keep the route short for the first original test: hallway to living room, or living room to kitchen, not the whole apartment.
- Send a short route note, for example: `start in hallway, turn left into living room, pass sofa, end facing windows`.
- Optional: send a phone video of the same route as camera-path reference.

Expected files:

- `apartment-scan.glb`
- optional `walkthrough-reference.mp4`
- optional `scan-notes.txt`

## Blender Prep

1. Open the scan in Blender and save a working `.blend`.
2. Preserve the raw imported scan object; duplicate before cleanup.
3. Set units to meters and check scale against a known measurement such as a door height.
4. Align the floor to world level and apply transforms.
5. Delete cameras, lights, hidden helpers, floating scan fragments, and unrelated objects.
6. Crop to the rooms needed for the intended route.
7. Create or animate a camera named `ABS_CAMERA`.
8. Use a path or keyframes to preview the route through the scan at roughly human eye height.
9. Keep the camera clear of walls, doorframes, mirrors, and unreadable scan holes.

Export cleaned mesh and camera samples:

```bash
/Applications/Blender.app/Contents/MacOS/Blender path/to/apartment.blend --background \
  --python scripts/spatial-scan/export-blender-spatial-scan.py -- \
  --output-dir source-assets/spatial-scan \
  --camera-name ABS_CAMERA \
  --samples 180 \
  --duration 18
```

This writes:

- `source-assets/spatial-scan/spatial-scan-clean.glb`
- `source-assets/spatial-scan/camera-path-source.json`

For a downloaded Sketchfab/Polycam glTF package, the helper can import, clean, create a first-pass camera route, and export in one headless Blender pass:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/spatial-scan/prepare-blender-spatial-scan.py -- \
  --input /path/to/scene.gltf \
  --output-dir source-assets/spatial-scan/korea-apartment \
  --mesh-file korea-apartment-clean.glb \
  --camera-file camera-path-source.json \
  --blend-file korea-apartment-working.blend \
  --samples 180 \
  --duration 18
```

For an original `.glb`, use the same helper with project-specific names:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/spatial-scan/prepare-blender-spatial-scan.py -- \
  --input /path/to/apartment-scan.glb \
  --output-dir source-assets/spatial-scan/original-apartment \
  --mesh-file original-apartment-clean.glb \
  --camera-file camera-path-source.json \
  --blend-file original-apartment-working.blend \
  --samples 180 \
  --duration 18
```

## Runtime Asset Build

Convert the cleaned scan into runtime assets:

```bash
node scripts/spatial-scan/build-spatial-scan-assets.mjs \
  --input source-assets/spatial-scan/korea-apartment/korea-apartment-clean.glb \
  --camera source-assets/spatial-scan/korea-apartment/camera-path-source.json \
  --output react-app/app/public/models/spatial-scan \
  --name spatial-scan \
  --low 40000 \
  --medium 120000 \
  --high 260000 \
  --scale 7.2 \
  --title "Korea Apartment (Free raw scan)" \
  --creator "skelee_kor" \
  --license "CC-BY-NC-SA-4.0" \
  --source-url "https://sketchfab.com/3d-models/korea-apartment-free-raw-scan-cac15ea497624d3bba1189f7cdf6e7bb"
```

The builder writes:

- `spatial-scan-points-low.bin`
- `spatial-scan-points-medium.bin`
- `spatial-scan-points-high.bin`
- `meta.json`
- `camera-path.json`

The camera path is normalized using the same `meta.json.normalization` transform as the point cloud. This keeps the fly-through path spatially aligned with the rendered points.

The current Korea Apartment lab asset is for prototype review only. The source license requires attribution, forbids commercial use, and requires share-alike terms for modified versions.

For an original scan, change the source metadata and keep the same point counts:

```bash
node scripts/spatial-scan/build-spatial-scan-assets.mjs \
  --input source-assets/spatial-scan/original-apartment/original-apartment-clean.glb \
  --camera source-assets/spatial-scan/original-apartment/camera-path-source.json \
  --output react-app/app/public/models/spatial-scan \
  --name spatial-scan \
  --low 40000 \
  --medium 120000 \
  --high 260000 \
  --scale 7.2 \
  --title "Original apartment spatial scan" \
  --creator "Alexander Beck" \
  --license "Original scan"
```

Important implementation detail: `build-spatial-scan-assets.mjs` remaps color groups by surface direction and recomputes camera quaternions from normalized camera positions. Keep both steps enabled; they were required for the scan to read as a room and for the web camera to look through the route rather than upward.

Scroll mode needs both `html` and `body` unlocked for scroll, and the runtime reads scroll progress from `document.scrollingElement`. If scroll feels stuck, verify `html[data-spatial-scan-camera-mode='scroll']` has `overflow-y: auto`.

## Placeholder Assets

Before the real apartment scan arrives, regenerate the procedural placeholder with:

```bash
node scripts/spatial-scan/generate-spatial-scan-placeholder.mjs
```

The placeholder is for route QA only. Do not treat it as production source material.

## Verification

```bash
ls -lh react-app/app/public/models/spatial-scan
node -e "const m=require('./react-app/app/public/models/spatial-scan/meta.json'); console.log(m.lods, m.layout)"
npm run lint --prefix react-app/app
npm run build
```
