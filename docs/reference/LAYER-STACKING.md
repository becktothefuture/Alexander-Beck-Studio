# Layer stacking — scene and portfolio sheet

**Agents:** Treat this file as the **canonical reference** for `#abs-scene` z-order and the portfolio project drawer. **Read it before** changing mounts, `z-index`, or where `#portfolioProjectView` is inserted.

## Non-negotiable (portfolio)

When the project bottom sheet / drawer is open, it MUST appear **above** the entire route chrome:

- The **header row** (`.ui-top`, `.route-topbar`, nav, back, sound slot).
- The **footer row** (shared `SiteFooter` / `.ui-bottom`).

That is achieved by **DOM placement + z-index**, not by hiding the header/footer alone.

| Requirement | Detail |
|-------------|--------|
| **Mount target** | Insert `#portfolioProjectView` into **`#portfolio-sheet-host`** when that element exists (`StudioShell.jsx`). |
| **Do not** | Mount the project dialog inside **`#portfolioProjectMount`** or **`#bravia-balls`** for stacking purposes — that subtree sits **below** `.fade-content` (z-index 200) and the drawer will paint **under** the header and footer. |
| **Implementation** | `react-app/app/src/legacy/modules/portfolio/app.js` — `createProjectView()` must prefer `document.getElementById('portfolio-sheet-host')` over `this.mount`. |

## `#abs-scene` children (bottom → top)

All of these participate in the same transformed scene (`#abs-scene` uses `transform`, so `position: fixed` children are positioned against the scene, not the raw viewport).

| Order | z-index (typical) | Layer | Notes |
|------:|------------------:|-------|--------|
| 1 | 100 | `#bravia-balls` | Wall container; pit, canvas, labels in `#portfolioProjectMount`. |
| 2 | 175 | `.frame-vignette` | Inset vignette; pointer-events none. |
| 3 | **200** | **`.fade-content`** | **Route chrome:** header row, main slot, footer. |
| 4 | 250 | `#quote-viewport-host` | Quote / puck host. |
| 5 | **220** (idle) / **260** (open) | **`#portfolio-sheet-host`** | **Project dialog host.** With `body.portfolio-page.portfolio-project-open`, CSS raises the host to **260** so the sheet is above the quote host as well as `.fade-content`. |

Source of truth in CSS:

- `react-app/app/public/css/main.css` — `.fade-content` z-index.
- `react-app/app/public/css/main.css` — `#quote-viewport-host`.
- `react-app/app/public/css/portfolio.css` — `#portfolio-sheet-host` and `body.portfolio-page.portfolio-project-open` override.

The comment block in `react-app/app/public/css/tokens.css` (`:root`, “Z-INDEX STACKING ORDER”) should stay **aligned** with this document when values change.

## Outside `#abs-scene`

Gate/contact/CV modals, dev panel, and modal blur layers sit **outside** `#abs-scene` and use much higher z-index values (see `tokens.css` — e.g. `--z-modal-content`). Do not “fix” the portfolio drawer by pushing it into modal layers unless the product intent is a full app-modal, not a wall-contained sheet.

## Verification (manual)

1. Portfolio route → open any project.
2. Confirm the sheet and dimmed backdrop **cover** the top bar and footer (no nav buttons visually on top of the sheet).
3. Confirm pit labels still mount only in `#portfolioProjectMount` (sheet is separate).

## Related docs

- `docs/reference/CONFIGURATION.md` — portfolio sheet host and config touchpoints.
- `docs/reference/PORTFOLIO.md` — runtime modules and entry points.
