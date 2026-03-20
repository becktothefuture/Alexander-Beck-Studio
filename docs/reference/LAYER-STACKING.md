# Layer stacking — scene and portfolio sheet

**This file is the canonical source of truth** for z-order and portfolio drawer placement. **Read it before** changing `#portfolio-sheet-host`, `.fade-content`, `#abs-scene`, or where `#portfolioProjectView` is mounted. **When in doubt, align code and comments here first.**

---

## Portfolio drawer — non-negotiable

| Rule | Detail |
|------|--------|
| **Above route chrome** | When a project is open, the drawer and its **backdrop** MUST paint **above** the **header row** (`.ui-top` / `.route-topbar`) **and** the **footer** (`SiteFooter` / `.ui-bottom`). Those live in **`.fade-content`** (`z-index: 200` in `main.css`). |
| **Do not mount only in `#simulations`** | `#simulations` is `z-index: 100`. Anything that stays **only** inside that subtree cannot stack above `.fade-content` (200). The drawer host must be a **sibling** of `.fade-content` **inside `#abs-scene`**, with a **higher `z-index`**. |
| **DOM + CSS** | **`#portfolio-sheet-host`** comes **after** **`.fade-content`** in `#abs-scene` (`StudioShell.jsx`). `portfolio.css`: host `z-index: 220` (idle), **`body.portfolio-project-open`** raises host to **`z-index: 260`** so the sheet is also above **`#quote-viewport-host`** (250). |
| **Geometry** | Host uses the **same inner-wall rectangle** as `#simulations canvas`: `position: fixed` inset `calc(var(--safari-tint-inset) + var(--frame-border-width))` on all sides, **`border-radius: var(--frame-inner-radius)`**, **`overflow: hidden`**. Same **corner-shape** inheritance as canvas (e.g. squircle when `html.abs-corner-shape-squircle`). |

---

## `#abs-scene` children (bottom → top)

`#abs-scene` uses `transform` (`main.css`), so `position: fixed` descendants are positioned against the scene. **Sibling order + `z-index`** inside `#abs-scene`:

| Order (typical DOM) | z-index | Layer |
|--------------------|--------:|-------|
| 1 | 100 | `#simulations` |
| 2 | 175 | `.frame-vignette` |
| 3 | **200** | **`.fade-content`** (header, main, footer) |
| 4 | **220** / **260** when open | **`#portfolio-sheet-host`** |
| 5 | 250 | `#quote-viewport-host` |

**Implementation:** `react-app/app/src/components/app/StudioShell.jsx` — `#portfolio-sheet-host` **after** `.fade-content`, **before** `#quote-viewport-host`.  
**Mount:** `react-app/app/src/legacy/modules/portfolio/app.js` — `createProjectView()` inserts `#portfolioProjectView` into `#portfolio-sheet-host`.

---

## Inside `#simulations` only (no drawer host here)

| Layer | z-index (typical) | Notes |
|------:|------------------:|-------|
| `.scene-effects` | 1 | Noise under simulation |
| `.shell-wall-slot` / `#c` | 2 / 10 | Pit canvas |
| `#portfolioProjectMount` | — | Labels overlay |

---

## Outside `#abs-scene`

Gate/contact/CV modals, dev panel, modal blur — higher z-index (`tokens.css`, e.g. `--z-modal-content`). Do not move the portfolio drawer into modal layers unless the product intent is a full app-modal.

---

## Other references (keep in sync)

- `react-app/app/public/css/main.css` — `.fade-content`, `#quote-viewport-host`, `#abs-scene`
- `react-app/app/public/css/portfolio.css` — `#portfolio-sheet-host` (includes comment pointing here)
- `react-app/app/public/css/tokens.css` — “Z-INDEX STACKING ORDER” comment block

---

## Verification (manual)

- Open a project from **home** and **portfolio**: dimmer + sheet cover **header and footer**; backdrop click still closes where implemented.
- With quote host on home: open project → sheet above quote puck (`260` > `250`).
