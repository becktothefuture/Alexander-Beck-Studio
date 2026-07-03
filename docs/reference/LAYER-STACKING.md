# Layer stacking — semantic homepage scene and overlays

**This file is the canonical source of truth** for z-order, semantic homepage layer ownership, and portfolio drawer placement. **Read it before** changing `#portfolio-sheet-host`, `.fade-content`, `#abs-scene`, `.simulation-contrast-veil`, or where `#portfolioProjectView` is mounted. **When in doubt, align code and comments here first.**

---

## Conceptual stack (bottom → top)

| Order | Conceptual layer | Live owner |
|------:|------------------|------------|
| 1 | **Base Frame** | Browser/body background and outer frame colour. |
| 2 | **App Scene Transform Group** | `#abs-scene.app-scene` — `#abs-scene` remains the compatibility ID; `.app-scene` is the semantic alias. |
| 3 | **Simulation Wall + Scene Effects** | `#simulations.simulation-wall-layer` plus `#scene-effects`, `.noise`, `.inner-wall-gradient-edge`, and `.frame-vignette`. |
| 4 | **Ball Canvas** | `#c.ball-canvas-layer`; the home title/subtitle are visually drawn through the canvas/title-depth renderer. |
| 5 | **Contrast Inner-Shadow Veil** | `.simulation-contrast-veil`, pointer-transparent, `z-index: 180`, above wall/canvas material and below UI. |
| 6 | **UI Layer** | `.fade-content.ui-layer`, `z-index: 200`, contains top chrome, center links, switcher controls, and footer. |
| 7 | **Overlay Layer** | `#portfolio-sheet-host` and `#quote-viewport-host`; no extra wrapper is used. |
| 8 | **Modal Layer** | `#modal-blur-layer.modal-layer` and `#modal-content-layer.modal-layer`, outside `#abs-scene`. |

The semantic names are additive. Do not replace compatibility hooks such as `#abs-scene`, `#simulations`, `.fade-content`, `#hero-title`, `data-abs-*`, `abs:*`, `__ABS_*`, `ABS_*`, `.abs-*`, or `--abs-*` unless every consumer is deliberately migrated and verified.

---

## Portfolio drawer — non-negotiable

| Rule | Detail |
|------|--------|
| **Above route chrome** | When a project is open, the drawer and its **backdrop** MUST paint **above** the **header row** (`.ui-top` / `.route-topbar`) **and** the **footer** (`SiteFooter` / `.ui-bottom`). Those live in **`.fade-content`** (`z-index: 200` in `main.css`). |
| **Do not mount only in `#simulations`** | `#simulations` is `z-index: 100`. Anything that stays **only** inside that subtree cannot stack above `.fade-content` (200). The drawer host must be a **sibling** of `.fade-content` **inside `#abs-scene.app-scene`**, with a **higher `z-index`**. |
| **DOM + CSS** | **`#portfolio-sheet-host`** comes **after** **`.fade-content`** in `#abs-scene` (`StudioShell.jsx`). `portfolio.css`: host `z-index: 220` (idle), **`body.portfolio-project-open`** raises host to **`z-index: 260`** so the sheet is also above **`#quote-viewport-host`** (250). |
| **Geometry** | Host uses the **same inner-wall rectangle** as `#simulations canvas`: `position: fixed` inset `calc(var(--safari-tint-inset) + var(--frame-border-width))` on all sides, **`border-radius: var(--frame-inner-radius)`**, **`overflow: hidden`**. Same **corner-shape** inheritance as canvas (e.g. squircle when `html.abs-corner-shape-squircle`). |

---

## `#abs-scene.app-scene` children (bottom → top)

`#abs-scene.app-scene` uses `transform` (`main.css`), so `position: fixed` descendants are positioned against the scene. **Sibling order + `z-index`** inside `#abs-scene`:

| Order (typical DOM) | z-index | Layer |
|--------------------|--------:|-------|
| 1 | 100 | `#simulations.simulation-wall-layer` |
| 2 | 175 | `.frame-vignette` |
| 3 | **180** | **`.simulation-contrast-veil`** |
| 4 | **200** | **`.fade-content.ui-layer`** (header, main, footer) |
| 5 | **220** / **260** when open | **`#portfolio-sheet-host`** |
| 6 | 250 | `#quote-viewport-host` |

**Implementation:** `react-app/app/src/components/app/StudioShell.jsx` — `.simulation-contrast-veil` sits after `.frame-vignette` and before `.fade-content`; `#portfolio-sheet-host` remains **after** `.fade-content`, **before** `#quote-viewport-host`.
**Mount:** `react-app/app/src/legacy/modules/portfolio/app.js` — `createProjectView()` inserts `#portfolioProjectView` into `#portfolio-sheet-host`.

---

## Inside `#simulations` only (no drawer host here)

| Layer | z-index (typical) | Notes |
|------:|------------------:|-------|
| `.scene-effects` | 1 | Noise under simulation |
| `.shell-wall-slot` / `#c.ball-canvas-layer` | 2 / 10 | Ball canvas layer. The home title/subtitle are visually drawn into this canvas path. |
| `#simulation-front-depth-canvas` | 8 | Compatibility front-pass canvas for title-depth modes. |
| `#portfolioProjectMount` | — | Labels overlay |

---

## Outside `#abs-scene`

Gate/contact/CV modals, dev panel, modal blur/content — higher z-index (`tokens.css`, e.g. `--z-modal-content`). Do not move the portfolio drawer into modal layers unless the product intent is a full app-modal.

---

## Controlled semantic migration

| Compatibility hook | Semantic alias / owner | Reason retained |
| --- | --- | --- |
| `#abs-scene`, `.abs-scene` | `.app-scene` | Transition, modal depth, scene impact, boot, audits, and legacy modules consume the compatibility names. |
| `#simulations` | `.simulation-wall-layer` | Canvas sizing, pointer, portfolio, and audits use the ID. |
| `#c` | `.ball-canvas-layer` | Renderer/audits use the ID; semantic class names the layer. |
| `.fade-content` | `.ui-layer` | Route transitions and pointer pass-through rules use the historical class. |
| `#hero-title`, `.hero-title*` | Canvas title source | Semantic/accessibility source and geometry source for `title-depth.js`. |
| `#portfolio-sheet-host`, `#quote-viewport-host` | Overlay hosts | Existing overlay contract is explicit; no wrapper is needed. |
| `#modal-blur-layer`, `#modal-content-layer` | `.modal-layer` | Two-layer modal architecture stays locked. |

---

## Other references (keep in sync)

- `react-app/app/public/css/main.css` — `.simulation-contrast-veil`, `.fade-content`, `#quote-viewport-host`, `#abs-scene`
- `react-app/app/public/css/portfolio.css` — `#portfolio-sheet-host` (includes comment pointing here)
- `react-app/app/public/css/tokens.css` — “Z-INDEX STACKING ORDER” comment block

---

## Verification (manual)

- Open a project from **home** and **portfolio**: dimmer + sheet cover **header and footer**; backdrop click still closes where implemented.
- With quote host on home: open project → sheet above quote puck (`260` > `250`).
- Inspect home desktop/mobile: veil improves edge contrast without dimming the center, does not intercept pointer events, and remains below UI.
