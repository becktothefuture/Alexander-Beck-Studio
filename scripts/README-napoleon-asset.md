# Napoleon Bust Point-Cloud Asset Pipeline

This pipeline creates lightweight runtime point-cloud assets for `/lab/napoleon-point-cloud.html`.

## Source To Verify

- Title: The bust of Napoleon Bonaparte
- Creator/source: Virtual Museums of Małopolska
- Institution: National Museum in Kraków
- Inventory number: MNK XII-A-810
- Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)
- Sketchfab URL: https://sketchfab.com/3d-models/the-bust-of-napoleon-bonaparte-a177bf0e121641bea6cf1d58ad3efc5b
- Museum object page: https://muzea.malopolska.pl/en/objects-list/1869

The website runtime must load only the generated point-cloud files from `react-app/app/public/models/napoleon-bust/`, not the original Sketchfab/Fab source model.

## Download

1. Open the Sketchfab URL above in a browser.
2. Confirm the title, creator/source, museum attribution, and CC BY 4.0 licence.
3. Use the site’s normal **Download 3D Model** flow. Do not bypass login, licensing, CAPTCHA, payment, or browser safety barriers.
4. Prefer the glTF/GLB/autoconverted download when offered.
5. Save the downloaded `.zip`, `.glb`, `.gltf`, or `.obj` under `source-assets/napoleon-bust/`.

`source-assets/napoleon-bust/` is ignored by git. Keep raw source downloads out of the public runtime bundle.

## Generate Runtime Assets

From the repo root:

```bash
node scripts/process-napoleon-bust.mjs --input source-assets/napoleon-bust/<downloaded-file-or-folder>
```

Outputs:

- `react-app/app/public/models/napoleon-bust/napoleon-points-low.bin` around 5,000 points
- `react-app/app/public/models/napoleon-bust/napoleon-points-medium.bin` around 12,000 points
- `react-app/app/public/models/napoleon-bust/napoleon-points-high.bin` around 24,000 points
- `react-app/app/public/models/napoleon-bust/meta.json`

Binary layout is documented in `meta.json`:

- `float32 position.xyz`
- `float32 normal.xyz` for displacement and interaction only, never lighting
- `float32 seed`
- `float32 colorGroup`

The script samples mesh triangle surface area with a fixed seed, recentres/scales the point cloud, ignores material and texture data, and assigns deterministic colour groups for the site palette/colorDistribution mapping.

## Preview Fallback

If the source archive is not available, this command creates procedural preview assets so the route can be tested:

```bash
node scripts/process-napoleon-bust.mjs --fallback
```

When `meta.json` says `source.status` is `procedural-fallback`, regenerate from the licensed Sketchfab/Fab source before treating the asset as production-ready.

## Blender Manual Fallback

Use Blender if the download is Draco-compressed, has unsupported source formats, contains extra hidden objects, or needs orientation cleanup.

Manual steps:

1. Open Blender.
2. Import the downloaded model with `File > Import` using the matching format.
3. Confirm the visible object is The bust of Napoleon Bonaparte.
4. Delete cameras, lights, hidden helper objects, and any unrelated scene objects.
5. Select only the bust mesh or joined bust mesh objects.
6. Apply transforms with `Object > Apply > All Transforms`.
7. Leave materials/textures unneeded; the point-cloud renderer uses only positions, normals, seeds, and colour groups.
8. Export selected geometry as glTF binary to `source-assets/napoleon-bust/napoleon-clean.glb`.
9. Run:

```bash
node scripts/process-napoleon-bust.mjs --input source-assets/napoleon-bust/napoleon-clean.glb
```

If Blender CLI is installed, the same cleanup can be automated in a local throwaway `.py` script, then exported as an uncompressed GLB before running this processor.

## Verification

After regenerating assets:

```bash
npm --prefix react-app/app run lint
npm run build
npm run preview
```

Then open `http://localhost:8013/lab/napoleon-point-cloud.html` and confirm:

- only flat circular dots are visible;
- the original mesh is never rendered;
- no lights, shadows, glow, bloom, matcap, environment map, or shaded material appears;
- attribution is visible;
- reduced motion and mobile LOD remain readable.
