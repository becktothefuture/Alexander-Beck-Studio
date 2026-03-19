# Custom cursor — behaviour contract

## Two cursors (do not merge)

| Cursor | Where | Look & size | DOM |
|--------|--------|-------------|-----|
| **Home dot** | Index route only, **inner wall** (physics inset inside `#bravia-balls`), gate overlay **closed** | Solid `var(--cursor-color)`. Diameter ≈ **0.66 × on-screen ball diameter** (canvas `R_MIN`/`R_MAX` mapped through canvas CSS width). Clamped ~8–40px. | `#custom-cursor` **without** `.abs-cursor-tap` / `.modal-active`. Parent: `#bravia-balls`, `position: absolute`, low z-index (under chrome). |
| **Tap ring** | **Inner wall** only (same inset as physics: portfolio pit, CV wall, index canvas area), **and** while gate overlay is open | Same visual as the old “modal” cursor: **64px** translucent disc + rim (`main.css`: `#custom-cursor.abs-cursor-tap` and `#custom-cursor.modal-active`). | Parent: `document.body`, `position: fixed`, z-index **19990** (tap) or **20000** (modal). Class **`abs-cursor-tap`**; overlay code still adds **`modal-active`**. |

**Rule:** Portfolio must **not** size the cursor from pit `R_MAX` (that produced a huge disc). Tap ring is always **64px** CSS.

**Rule:** Tap ring must stay **visible above** the UI layer (`body` + fixed), not only under `#bravia-balls`.

## Implementation

- `react-app/app/src/legacy/modules/rendering/cursor.js` — `isHomeIndexRoute()`, `isMouseInSimulation()` (inner wall), `applyHomeDotMount`, `applyTapRingMount`, `updateCursorPosition`.
- `react-app/app/public/css/main.css` — `#custom-cursor.abs-cursor-tap`, `#custom-cursor.modal-active` (shared block).
- `react-app/app/src/legacy/modules/ui/modal-overlay.js` — adds/removes `.modal-active` on `#custom-cursor` when gate opens/closes.

## Verification

1. **Home** — Inner wall: small solid dot. Outside inner wall (footer, frame strip, chrome): **default** system cursor.
2. **Portfolio** — Pit (inner wall): 64px tap ring. Top bar / chrome outside inset: default cursor.
3. **Gate open** — Tap ring, z above modal stack.
4. **SPA** — Home ↔ portfolio: no invisible cursor; opacity starts at 1.
