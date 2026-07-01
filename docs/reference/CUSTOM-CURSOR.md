# Custom cursor — behaviour contract

## Two cursors (do not merge)

| Cursor | Where | Look & size | DOM |
|--------|--------|-------------|-----|
| **Home dot** | Home route inner wall, plus the portfolio inner wall/deck background when the detail view is closed, gate overlay **closed** | Solid `var(--cursor-color)`. Diameter ≈ **0.66 × on-screen ball diameter** (canvas `R_MIN`/`R_MAX` mapped through canvas CSS width). Clamped ~8–40px. | `#custom-cursor` **without** `.abs-cursor-tap` / `.modal-active`. Parent: `#simulations`, `position: absolute`, low z-index (under chrome). |
| **Portfolio project hover** | Portfolio deck cards while the detail view is closed | Same `#custom-cursor` as the home dot, enlarged into a solid cursor-colour ball with centered `View project` text using `--cursor-hover-fg` for contrast. The card itself does not render an inline “View project” label. | `#custom-cursor.abs-cursor-project-hover`, parent stays `#simulations`, z-index elevated above the deck. |
| **Tap ring** | **Inner wall** only for portfolio detail view / CV / index modal states, **and** while gate overlay is open | Same visual as the old “modal” cursor: **64px** translucent disc + rim (`main.css`: `#custom-cursor.abs-cursor-tap` and `#custom-cursor.modal-active`). | Parent: `document.body`, `position: fixed`, z-index **19990** (tap) or **20000** (modal). Class **`abs-cursor-tap`**; overlay code still adds **`modal-active`**. |

**Rule:** Portfolio route uses the **home dot** in the pit by default. Only the **portfolio detail view** switches to the 64px tap ring.

**Rule:** Portfolio must **not** size the tap ring from pit `R_MAX` (that produced a huge disc). Tap ring is always **64px** CSS.

**Rule:** Tap ring must stay **visible above** the UI layer (`body` + fixed), not only under `#simulations`.

## Implementation

- `react-app/app/src/legacy/modules/rendering/cursor.js` — `isHomeIndexRoute()`, `isMouseInSimulation()` (inner wall), project-card hover hit testing, `applyHomeDotMount`, `applyTapRingMount`, `updateCursorPosition`.
- `react-app/app/public/css/main.css` — `#custom-cursor.abs-cursor-tap`, `#custom-cursor.modal-active` (shared block).
- `react-app/app/public/css/portfolio.css` — `#custom-cursor.abs-cursor-project-hover` and the centered cursor label.
- `react-app/app/src/legacy/modules/ui/modal-overlay.js` — adds/removes `.modal-active` on `#custom-cursor` when gate opens/closes.

## Verification

1. **Home** — Inner wall: small solid dot. Outside inner wall (footer, frame strip, chrome): **default** system cursor.
2. **Portfolio** — Inner wall/deck background: home dot until the project detail view opens. While the detail view is open: 64px tap ring. Top bar / chrome outside inset: default cursor.
3. **Gate open** — Tap ring, z above modal stack.
4. **SPA** — Home ↔ portfolio: no invisible cursor; opacity starts at 1.
