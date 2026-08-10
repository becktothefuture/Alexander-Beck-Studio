# Lab

## Production contract

Lab is the fourth primary production route, immediately before Contact. Its canonical entry remains `/playground.html`; `/playground` is the extensionless alias. The internal route ID and source namespace remain `playground` for compatibility. It renders inside the persistent `StudioShell`, and its Button Bar label is **Lab**.

The route is a two-axis spatial catalogue arranged as an eclectic Petersburger or salon hanging. Visitors can pan with pointer drag, touch, wheel, trackpad, arrow keys while the viewport is focused, or WASD. Panning becomes active when the camera is mounted, including while the title entrance is still playing. `Home` recentres the title. Tab enters one roving project focus, then the arrow keys move to the nearest project in that direction and centre its complete media-and-caption footprint. The logical camera is unbounded, while repeated visual copies make the finite authored world feel continuous. Wheel input eases toward its destination and drag release uses filtered velocity for a smoother stop. Drag work is frame-coalesced and bounded on high-refresh displays so the camera retains a stable 60fps-or-better cadence without running the complete render path at 120–240Hz. The Canvas dot field and the project layer commit the same camera sample before each paint, so neither layer trails the other. On narrower usable widths, one derived responsive profile modestly scales the shared world, tightens project placement, maintains a 12px minimum rendered caption size, reduces dot radius, and compensates input so touch remains direct; it never creates a second saved mobile configuration. The atmosphere compositor is renderer-coupled and sleeps when the field is idle. Every dot is a true circle; the Canvas backing store calibrates both CSS axes independently to preserve that shape at fractional sizes and high pixel densities. The field uses low-opacity neutral grey and does not respond to pointer hover. Projects also stay fixed under pointer hover. Fine-pointer devices hide the native cursor inside the Lab route so only the shared custom lens is visible; the detached parameter panel retains its native editor cursor. The route does not add application zoom and does not intercept Ctrl-wheel or Command-wheel browser zoom.

The opening title is part of the pannable world. Instrument Serif is limited to its H1 and the description uses Geist with the shared supporting-description colour. The dot field remains continuous behind the complete title lockup; a broad, theme-aware shadow darkens the field without cutting a hole in the grid. The title keeps a project-collision safe area. A centered four-way Tabler move icon replaces the visible movement sentence; it retains the About opening arrow's compact scale but sits closer to the description. “Drag to explore.” remains available to assistive technology. The ordered entrance remains identity, context, action, then support. Each entrance transaction measures the viewport and current project-card geometry once, then reuses that immutable snapshot for visibility and distance staggering until the transaction is reset.

Each logical item appears once in the semantic ordered list. One roving project button participates in the page tab order at a time; arrow-key movement makes every other project reachable without content-order camera jumps. Its media keeps rounded corners without a visible edge. The left-aligned caption begins after the complete poster or active runtime box, never overlays the thumbnail, uses the Portfolio project-caption typography, and wraps in full; visible image, video, and code tags are omitted. Repeated world copies are visual only: they are hidden from assistive technology and cannot start extra video or code runtimes. Selecting an item opens an asset-only in-window dialog and writes `?work=<item-id>`. The project field remains visually and spatially unchanged behind the enlarged asset: opening the dialog does not replace posters, unmount visible world runtimes, move the camera, dim the field, or blur it. Closing restores focus to the originating logical item; browser Back clears the selection before it leaves Lab.

## Sources and ownership

| Concern | Source |
| --- | --- |
| Route identity and aliases | `react-app/app/src/lib/route-manifest.js` |
| Route composition and lifecycle | `react-app/app/src/routes/playground/PlaygroundRoute.jsx`, `PlaygroundExperience.jsx` |
| Editorial catalogue | `react-app/app/public/config/contents-playground.json` |
| Local image and poster assets | `react-app/app/public/assets/playground/` |
| Local code demonstrations | `react-app/app/src/routes/playground/media/codeDemos.js` |
| Layout, camera, copies, and dot field | `react-app/app/src/routes/playground/spatial/` |
| Media and dialog behavior | `react-app/app/src/routes/playground/media/` |
| Authored design values | `react-app/app/public/config/design-system.json` under `playground` |
| Control schema and canonical save | `react-app/app/src/routes/playground/config/playgroundPanel.js` |

The initial catalogue contains 30 explicit placeholders: 18 image, 6 video, and 6 code items. Their labels, descriptions, and visual assets are temporary. They are not portfolio facts, client claims, contribution claims, or outcome claims. Replace them only with reviewed content and local media.

## Content schema

`contents-playground.json` contains `version`, `title`, `description`, and `items`. Each item requires:

- `id`: unique lower-kebab-case identifier;
- `placementOrder`: unique positive integer;
- `type`: `image`, `video`, or `code`;
- `label`, `description`, and `accessibilityText`: non-empty text;
- `poster` and `preview`: safe root-relative local URLs;
- `intrinsicDimensions.width` and `.height`: positive integers no larger than 8192;
- `preferredGridSpan.columns` and `.rows`: positive integers no larger than 32;
- optional `presentationVariant`: lower-kebab-case name.

Image and video items also require a safe root-relative `source` and must omit `demoId`. Code items require a lower-kebab-case `demoId` and must omit `source`. URLs must begin with one `/`, must not contain a backslash, and must not traverse through `..` path segments.

### Add item 31

Append the new object to `items`. Do not insert it between existing objects. Give it a new stable ID and `placementOrder: 31`. Keep every earlier item's `id`, `placementOrder`, dimensions, and preferred span unchanged if their placement must remain unchanged.

Example image entry:

```json
{
  "id": "image-new-study",
  "placementOrder": 31,
  "type": "image",
  "label": "New Study",
  "description": "Reviewed description of the work.",
  "accessibilityText": "Concise description of the visible image.",
  "poster": "/assets/playground/images/new-study.webp",
  "preview": "/assets/playground/images/new-study.webp",
  "source": "/assets/playground/images/new-study.webp",
  "intrinsicDimensions": { "width": 1600, "height": 1200 },
  "preferredGridSpan": { "columns": 8, "rows": 6 },
  "presentationVariant": "landscape"
}
```

Put the referenced file under `react-app/app/public/assets/playground/`. Use accurate intrinsic pixel dimensions and an intentional integer grid span. The span controls spatial footprint, not the source image crop. Labels and descriptions are included in collision bounds, so longer copy can increase the required footprint.

For a video, provide a local video `source` plus a local poster. The field keeps the poster fully visible while the muted video starts underneath it, waits for the first presented video frame, and only then crossfades the poster away. The video loops and stops when it is no longer owned by the visible selection. Lazy-loaded still images fade in when decoded rather than appearing in one frame. Code previews use the same poster-first handoff and reveal only after their local frame loads. For code, add a unique `demoId`, register the same ID in `codeDemos.js`, and add a bounded local renderer. Code previews use `srcDoc` with `sandbox="allow-scripts"`; do not add a remote embed, external runtime, or `allow-same-origin`.

Replace each placeholder as one complete unit: reviewed copy, accurate accessibility text, local poster/preview/source, true intrinsic dimensions, grid span, and any local code renderer. Remove no shared fallback until the replacement has passed failure-state testing.

## Deterministic placement

Placement is derived from stable item identity, `placementOrder`, the selected preset, `projectSpacing`, and `layoutSeed`. The default salon preset evaluates a bounded low-discrepancy candidate set and accepts the first position that reaches the shared clearance target. This distributes work homogeneously across the wrapped field, including its seams, without losing mixed media spans or off-axis quarter-cell origins. The wider base period prevents the clearance search from fragmenting into a sparse overflow pass. The balanced preset remains available when strict dot alignment is required. Higher project spacing still expands the deterministic composition, but with a restrained radial curve that avoids large unused bands. The narrower responsive profile tightens this expansion and keeps the inter-item safety gap at one grid cell so several projects peek into the initial 320 × 568 view. The exact title exclusion remains intact. The modulo period is then calculated from the resulting project extents, so the repeat area grows with the composition instead of clipping or repeating projects too soon. Existing placements are append-stable when new items are appended and earlier placement inputs stay unchanged. The world period remains grid-quantized while salon item origins use quarter-cells.

Do not regenerate the seed as part of routine content editing. Use **Generate new seed** only for a deliberate full-layout re-composition. Review the complete field after regeneration, then use **Save design configuration** to write the chosen seed to the canonical `playground` namespace. Changing an existing item ID, placement order, span, scale, label footprint, preset, or seed can move work and requires a new full-field review.

## Authoring controls

The development panel has one schema for both docked and detached hosts. Open the docked panel with the settings launcher. Shift-click the same launcher to open the detached panel. Save uses the same pinned action row as the Home panel. The route registers these folders:

- **Composition**: preset, project spacing, item scale, and size variation;
- **Dot field**: grid spacing, dot radius, and neutral opacity. Lower spacing creates a denser grid;
- **Motion**: wheel sensitivity and drag momentum;
- **Actions**: recenter, generate a new seed, and reset Lab values;
- **Diagnostics**: project count, world columns and rows, occupied cells, and visible copies.

Diagnostics are read-only runtime evidence. They are not saved.

The canonical values below include the visible panel controls and the implementation guardrails that are intentionally kept out of routine editing. The dots stay neutral at rest and on pointer hover.

| Field | Default | Allowed values |
| --- | ---: | --- |
| `layoutPreset` | `salon` | `salon`, `balanced`, `loose`, `clustered` |
| `layoutSeed` | `272684` | unsigned 32-bit integer |
| `gridSpacingPx` | `24` | 24–72, step 4 |
| `minimumWorldColumns` | `80` | 56–160, step 8 |
| `minimumWorldRows` | `56` | 40–112, step 8 |
| `worldPaddingCells` | `1` | 1–20, step 1 |
| `projectSpacing` | `1` | 1–2.5, step 0.05 |
| `itemGapCells` | `1` | 1–6, step 1 |
| `itemScale` | `1.35` | 0.75–2, step 0.01 |
| `sizeVariation` | `0.5` | 0–0.5, step 0.01 |
| `labelGapPx` | `8` | 4–16, step 1 |
| `dotRadiusPx` | `2` | 2–7, step 0.25 |
| `dotOpacity` | `0.16` | 0.12–0.6, step 0.01 |
| `wheelSensitivity` | `0.82` | 0.5–1.6, step 0.01 |
| `dragMomentum` | `0.88` | 0–0.96, step 0.01 |

Live panel changes update the current route. **Reset** restores defaults in memory. **Save design configuration** sends a canonical normalized snapshot through the existing local authoring flow. If the write-capable local endpoint is not available, the save flow downloads JSON instead. Browser state and `window.__ABS_PLAYGROUND_CONFIG__` are helpers, not authored truth.

## Verification

Run from the repository root:

```bash
npm run check:site
npm run build
npm run certify:screens
npm run audit:playground
ABS_BROWSER=chromium npm run audit:transition-flows
ABS_BROWSER=webkit npm run audit:transition-flows
```

`npm run audit:playground` proves the route and alias, five-tab shell, centred font-ready title, input and wrapping behavior, grid alignment and hover inertia, semantic catalogue, media ownership, dialog and URL behavior, docked/detached panel parity, canonical save payload, reload dimensions, Reduced Motion, mute integration, SPA cleanup, and local error-free loading in the selected browser. It uses Chromium by default; set `ABS_BROWSER=webkit` for WebKit evidence.

For content work, also check direct `/playground.html`, alias `/playground`, a valid `?work=<id>`, an invalid work ID, keyboard panning, pointer/touch panning, focus return, browser Back, light/dark themes, Reduced Motion, local asset failures, and the detached-panel save path. Inspect desktop, tablet, and mobile captures in Chromium and WebKit. A green build does not replace visual and accessibility inspection.
