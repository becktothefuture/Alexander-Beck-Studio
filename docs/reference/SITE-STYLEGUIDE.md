# Site UI styleguide (shell chrome & harmony)

This document is the **authoritative visual spec** for **new interactive UI** that lives on the public site surface (home, portfolio, CV): nav pills, icon buttons, meta controls, modals’ primary fields, and anything else that should feel like the same “instrument” as the existing chrome.

**Out of scope here:** The debug **panel** (`.panel`, `panel.css`) uses a separate, denser control aesthetic—do not copy panel chrome onto shell UI without an explicit design decision.

**Intentionally different surfaces (not shell chrome pills):**

- **Panel / dock** — `panel.css` buttons (shadcn-style muted surfaces).
- **Gate / code modals** — Digit inputs (`.cv-digit`, `.portfolio-digit`) and the contact email row use **field** styling (borders, optional pulse), not the `::before` chrome pill.
- **Archived portfolio slider** — `public/css/archive/portfolio-slider-v1.css` still documents old `.project-detail__links` glass pills; that bundle is **not** linked by current `portfolio.html` (pit runtime uses `portfolio.css` only).

**Related:** [`CONFIGURATION.md`](CONFIGURATION.md) (runtime keys), [`TONE-OF-VOICE.md`](TONE-OF-VOICE.md) (copy), [`QUOTE-PUCK.md`](QUOTE-PUCK.md) (quote control), [`AGENTS.md`](../../AGENTS.md) (tokens & build).

---

## 1. Interactive links and chrome split

Default hover is **not** a cursor-coloured fill. Links and fields **inside the framed window** use the same quiet language as the home legend: foreground lifts to normal text strength and a soft shadow/field appears behind the target in the **window background colour**. Shell chrome and the bottom Button Bar are intentionally separate and keep their own hover/selected behaviour.

### 1.1 Appearance

| Aspect | Rule |
|--------|------|
| **Hover field** | In-window hover shadow/field uses **`var(--frame-inner-surface)`** only. Never tint this shadow with `--cursor-color`, route accents, or arbitrary palette colours. |
| **Persistent states** | Selected/on states may still use their existing active language, e.g. active legend chip, enabled sound, active route tab. Do not confuse those with hover-only feedback. |
| **Glyph / label** | On hover, foreground lifts to the normal surface ink (`--text-primary` or the local drawer ink), not `--cursor-hover-fg`. |
| **Shape** | Corner radius tracks the wall via **`var(--ui-icon-corner-radius)`** (and link hovers use the same). Icon hits are square frames sized with **`--ui-icon-frame-size`** / **`--ui-icon-glyph-size`**. |

### 1.2 Implementation pattern

- **In-window shadow lives on `::before`:** The element stays on its resting surface; the shadow field is a positioned `::before` using `var(--frame-inner-surface)`, blurred, with `opacity: 0` at rest and visible on hover/focus.
- **Stacking:** Children (`i`, `svg`) need **`position: relative; z-index: 1`** so glyphs sit **above** the `::before` layer (same idea as social icon links).
- **Motion:** The field fades softly, following the home legend timing. Avoid hover-only transforms on text where they cause jitter.
- **`prefers-reduced-motion: reduce`:** Keep the affordance visible without relying on motion.

### 1.3 Selectors on the in-window field system

Use these as references when adding siblings:

- **Legend hover:** `.legend__item--interactive::after` — reference behaviour for the soft local field.
- **Simulation switcher:** `.simulation-focus-pill` and `.simulation-focus-row` — in-window chooser controls.
- **Contact row (modal):** `.contact-email-row` uses field styling; hover shadow uses `--frame-inner-surface`, not cursor colour.
- **Portfolio project sheet (pit):** `.portfolio-project-view__links a` — external links in the open project use the in-window `::before` shadow field in `--frame-inner-surface` ([`portfolio.css`](../../react-app/app/public/css/portfolio.css))

### 1.4 Selectors on separate hover systems

- **Bottom Button Bar:** `.button-bar__primary-buttons .shell-tab` keeps its tab hover/selected contract. Do not apply the in-window field to it.
- **Route/top/footer text chrome:** `.footer_link` inside `.ui-main-nav` lifts to normal readable ink on hover/focus/active but does not get the in-window shadow field.
- **Icon/meta chrome:** `.abs-icon-btn`, `.abs-meta-btn`, `#site-year` may lift foreground or keep persistent active state, but do not get the in-window shadow field by default.
- **Quote puck (floating):** **`.quote-display__disk`** = round solid **`var(--cursor-color)`** + shadow (hover scale); **`.quote-display__content`** = text (**`--quote-hover-fg`** / **`--cursor-hover-fg`**); **`#quote-display`** sets **`--_size: calc(var(--abs-quote-button-size) * 0.75)`**; spin is **`--quote-tilt`** on content only (see `main.css` Quote Puck block).
- **Supporting descriptions:** `.decorative-script`, `.modal-description`, and legacy `.gate-description` share the `--supporting-description-*` type recipe so gate copy stays visually aligned. Portfolio intro copy now lives inside the wall deck rather than in the top-right chrome.
- **Legend active:** `.legend__item--active::before` — solid fill + rim; label uses `cursor-hover-fg`

**Sound toggle specifics:** When the control sits in `#sound-toggle-slot` or `.portfolio-sound-slot`, the **slot** must allow hits if a parent uses `pointer-events: none` (set **`pointer-events: auto`** on the slot). Hover/focus color should not lose to `[data-enabled="true"]` resting color—use explicit `.sound-toggle.abs-icon-btn:hover` / `:focus-visible` rules if needed. Active sound uses persistent `cursor-color` plus a colored outline and a contained `sound-toggle__icon--on` SVG.

### 1.5 Route top bar (shell strip — same discipline as the footer)

Any page that shows a **top chrome strip** (Portfolio or a future gated route) must reuse the **same DOM + CSS contract** as the current implementation—**not** a one-off flex row or alternate text-button class.

- **Structure:** `header.ui-top` → `div.ui-top-main.route-topbar` → **`route-topbar__left` | `route-topbar__center` | `route-topbar__right`** (grid `auto 1fr auto`, full width). Center is **in-flow** (no `position: absolute` on the nav).
- **Text actions:** `MainNavLink` renders any primary text buttons (`footer_link`). Hover foreground is unified via `.ui-main-nav` in `main.css`.
- **Icons:** Back uses **`gate-back abs-icon-btn`**. Shared sound/theme controls live in the Button Bar. Portfolio intro copy belongs inside the wall deck, not in the chrome strip.
- **When adding a new route with a top bar:** copy the strip from `PortfolioRoute.jsx`, swap copy and ids only, and extend `COMPONENT-LIBRARY.md` plus `/styleguide.html` if the pattern changes.

Authoritative detail: [`COMPONENT-LIBRARY.md`](COMPONENT-LIBRARY.md) (route top bar section).

---

## 2. Tokens & code locations (source of truth)

| Concern | Where |
|--------|--------|
| In-window hover field | [`react-app/app/public/css/main.css`](../../react-app/app/public/css/main.css) and [`portfolio.css`](../../react-app/app/public/css/portfolio.css) — `--frame-inner-surface` shadow fields |
| Route topbar resting ink | [`react-app/app/public/css/tokens.css`](../../react-app/app/public/css/tokens.css) — `--shell-chrome-ink` |
| Supporting description typography | [`react-app/app/public/css/tokens.css`](../../react-app/app/public/css/tokens.css) — `--supporting-description-*` |
| Portfolio pit **canvas** bodies | Hidden/runtime compatibility guidance only; no disc rim or stroke — fill + optional hover image reveal only; size vs **`√(inner pit area)`** in `pit-mode.js`; see [`PORTFOLIO.md`](PORTFOLIO.md) |
| Cursor + active foreground CSS vars | Set from palette in [`react-app/app/src/legacy/modules/visual/colors.js`](../../react-app/app/src/legacy/modules/visual/colors.js) (`stampCursorCSSVar`, `computeSafeTextOnCursorColor`) |
| Unified rules | [`react-app/app/public/css/main.css`](../../react-app/app/public/css/main.css) — section **“IN-WINDOW SOFT HOVER FIELD”** and **“INTERACTIVE HOVER EFFECTS”** |
| Route topbar layout + sound slot fit | [`react-app/app/public/css/main.css`](../../react-app/app/public/css/main.css) — `body.*-page .route-topbar`, `.portfolio-topnav`, `.portfolio-sound-slot` |

CSS ownership:

- `main.css` owns shared shell chrome, route topbar structure, CV/About route styling, modals, cursor contracts, and home/shared text treatment.
- `portfolio.css` owns portfolio deck, portfolio drawer, portfolio-specific project typography, portfolio route load-state reveal timing, and portfolio-only media/detail motion.
- `src/index.css` is not part of the active app surface; do not recreate Vite starter CSS there.

**Do not** reintroduce multi-layer white gradients + heavy `box-shadow` “glass” on these chrome controls; that contradicts this guide.

---

## 3. Visual harmony principles (new work)

1. **Separate hover from cursor** — Cursor dot and selected/on states can use `--cursor-color`; hover-only shadows should not.
2. **Shell vs page** — Walls, frame, and shared atmosphere come from **shell** config/CSS once; page routes compose layout but should not redefine the wall language or brand tokens (see [`AGENTS.md`](../../AGENTS.md) Config Workflow).
3. **Tokens over literals** — Spacing, radii, type scale: use **`var(--gap-*)`**, **`var(--text-*)`**, **`var(--abs-*)`** aliases from `tokens.css`; avoid raw pixels except where tokens encode `1px` hairlines.
4. **Accessibility** — Respect **`prefers-reduced-motion`**. Global focus outlines are intentionally minimal in places; when adding new primary actions, follow existing focus-visible patterns for that surface (see `main.css` focus blocks for chrome).
5. **Button Bar exception** — The bottom Button Bar is a tab system with its own hover/selected contract. Do not apply the in-window shadow field to it.

---

## 4. Checklist: adding a new chrome control

- [ ] If the control is inside the window, hover shadow uses **`var(--frame-inner-surface)`**.
- [ ] Hover foreground lifts to normal readable ink, not `--cursor-hover-fg`.
- [ ] Selected/on states remain distinct from hover-only states.
- [ ] The bottom Button Bar keeps its tab hover system.
- [ ] Field implemented via **`::before`** only where a soft in-window shadow is required, with content above it (`z-index`).
- [ ] Parent **`pointer-events`** checked if the control sits in a `pointer-events: none` wrapper.
- [ ] Verified on **home, portfolio, CV** in **light and dark** (and mobile width if applicable).

---

## 5. Legacy / config note

`linkHoverIntensityLight` / `Dark` / `Active` are still written to CSS variables for saved configs but **do not drive** current public hover fields. See [`CONFIGURATION.md`](CONFIGURATION.md). Do not reintroduce cursor-coloured hover fills as the default.

---

*Last aligned with implementation in `main.css` / `portfolio.css` (window-colour hover fields + separate Button Bar tabs). Update this doc when those patterns change.*
