# Simulation Launchpad

The local simulation overview lives at:

```bash
npm run dev
open http://127.0.0.1:8012/simulations.html
```

The source of truth is `react-app/app/src/data/simulationCatalog.json`.

Stages:

- `automation-candidate`: fresh daily automation/test-page ideas that may be deleted.
- `collection`: available simulations outside the daily homepage rotation.
- `daily-rotation`: simulations eligible for the live daily homepage.
- `hidden`: internal or disabled simulation surfaces.

The launchpad can change stages and log issue notes while the Vite dev server is running. Those writes land in repo files, not browser storage.

Preview images are generated with:

```bash
npm run sim:capture -- --ids <simulation-id>
```

Run without `--ids` to capture every non-hidden simulation.

Validate the catalog after adding, promoting, hiding, or changing previews:

```bash
npm run sim:validate
```

Spatial Scan source prep and Blender export details live in [`spatial-scan.md`](./spatial-scan.md).
