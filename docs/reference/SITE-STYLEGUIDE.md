# Site UI styleguide (shell chrome & harmony)

This document is the **authoritative visual spec** for **new interactive UI** that lives on the public site surface (home, portfolio, CV): nav pills, icon buttons, meta controls, modals’ primary fields, and anything else that should feel like the same “instrument” as the existing chrome.

**Out of scope here:** The debug **panel** (`.panel`, `panel.css`) uses a separate, denser control aesthetic—do not copy panel chrome onto shell UI without an explicit design decision.

**Related:** [`CONFIGURATION.md`](CONFIGURATION.md) (runtime keys), [`TONE-OF-VOICE.md`](TONE-OF-VOICE.md) (copy), [`QUOTE-PUCK.md`](QUOTE-PUCK.md) (quote control), [`AGENTS.md`](../../AGENTS.md) (tokens & build).

---

## 1. Chrome buttons & links (the default)

These are the **solid cursor-colored** hovers: same hue family as the **custom cursor dot**, not a translucent “glass” wash over the page.

### 1.1 Appearance

| Aspect | Rule |
|--------|------|
| **Fill** | **Opaque** `var(--cursor-color)` on hover (and for “on” states that use the same language, e.g. active legend chip). No `color-mix(…, transparent)` for the primary fill. |
| **Rim** | **Subtle inset highlight**, not a frosted stack: `var(--ui-chrome-button-edge)` — light top edge + soft dark bottom edge so the pill reads on any cursor luminance. Dark mode overrides live under `:root.dark-mode` in tokens. |
| **Glyph / label** | On hover, use **`var(--cursor-hover-fg)`** for text and icons so contrast is safe on the solid fill. This is computed in JS from the cursor color (WCAG-oriented), not guessed in CSS. |
| **Shape** | Corner radius tracks the wall via **`var(--ui-icon-corner-radius)`** (and link hovers use the same). Icon hits are square frames sized with **`--ui-icon-frame-size`** / **`--ui-icon-glyph-size`**. |

### 1.2 Implementation pattern

- **Fill lives on `::before`:** The element stays `background: transparent`; the colored surface is a positioned `::before` with `opacity: 0` at rest and **`opacity: 1` + `transform: scale(var(--abs-button-swell-scale))`** on hover where applicable.
- **Stacking:** Children (`i`, `svg`) need **`position: relative; z-index: 1`** so glyphs sit **above** the `::before` layer (same idea as social icon links).
- **Motion:** Fill appearance uses **`var(--ui-chrome-fill-transition-duration)`** (default **120ms**) for background, opacity, and box-shadow. Swell timing uses **`--abs-button-swell-in-duration`** / **`--abs-button-swell-out-duration`** so release still reads clearly.
- **`prefers-reduced-motion: reduce`:** Existing rules remove transform swell on hovers but keep the solid fill visible—do not add new motion-only affordances.

### 1.3 Selectors already on this system

Use these as references when adding siblings:

- **Icon buttons:** `.abs-icon-btn` (e.g. social links, sound toggle with `.sound-toggle.abs-icon-btn`)
- **Text chrome:** `.footer_link`, `.portfolio-cv-link`, `#header-cv-link`
- **Meta:** `.abs-meta-btn`, `#site-year`
- **Quote puck (floating):** Solid fill still comes from `.quote-display::before`. On **hover**, the **visible glass surface** uses the same rim as other chrome: `box-shadow: var(--ui-chrome-button-edge)` plus a slightly lifted outer drop shadow (see `.quote-display:hover` in `main.css`).
- **Contact row (modal):** `.contact-email-row` hover uses the same fill + rim + `cursor-hover-fg`
- **Portfolio project sheet (pit):** `.portfolio-project-view__links a` — external links in the open project use the same `::before` + `--ui-chrome-button-edge` hover treatment ([`portfolio.css`](../../react-app/app/public/css/portfolio.css))
- **Legend active:** `.legend__item--active::before` — solid fill + rim; label uses `cursor-hover-fg`

**Sound toggle specifics:** When the control sits in `#sound-toggle-slot` or `.portfolio-sound-slot`, the **slot** must allow hits if a parent uses `pointer-events: none` (set **`pointer-events: auto`** on the slot). Hover/focus color should not lose to `[data-enabled="true"]` resting color—use explicit `.sound-toggle.abs-icon-btn:hover` / `:focus-visible` rules if needed.

---

## 2. Tokens & code locations (source of truth)

| Concern | Where |
|--------|--------|
| Chrome rim, fill transition duration | [`react-app/app/public/css/tokens.css`](../../react-app/app/public/css/tokens.css) — `--ui-chrome-button-edge`, `--ui-chrome-fill-transition-duration` |
| Cursor + hover foreground CSS vars | Set from palette in [`react-app/app/src/legacy/modules/visual/colors.js`](../../react-app/app/src/legacy/modules/visual/colors.js) (`stampCursorCSSVar`, `computeSafeTextOnCursorColor`) |
| Unified rules | [`react-app/app/public/css/main.css`](../../react-app/app/public/css/main.css) — section **“UNIFIED HOVER BACKGROUND SYSTEM”** and **“INTERACTIVE HOVER EFFECTS”** |
| Portfolio slot tweak | [`react-app/app/public/css/portfolio.css`](../../react-app/app/public/css/portfolio.css) — `.portfolio-sound-slot` |

**Do not** reintroduce multi-layer white gradients + heavy `box-shadow` “glass” on these chrome controls; that contradicts this guide.

---

## 3. Visual harmony principles (new work)

1. **One cursor story** — Cursor dot, chrome hovers, and active filters that use the accent should all read as the **same palette decision**, driven by `--cursor-color` and shared tokens.
2. **Shell vs page** — Walls, frame, and shared atmosphere come from **shell** config/CSS once; page routes compose layout but should not redefine the wall language or brand tokens (see [`AGENTS.md`](../../AGENTS.md) Config Workflow).
3. **Tokens over literals** — Spacing, radii, type scale: use **`var(--gap-*)`**, **`var(--text-*)`**, **`var(--abs-*)`** aliases from `tokens.css`; avoid raw pixels except where tokens encode `1px` hairlines.
4. **Accessibility** — Respect **`prefers-reduced-motion`**. Global focus outlines are intentionally minimal in places; when adding new primary actions, follow existing focus-visible patterns for that surface (see `main.css` focus blocks for chrome).
5. **Contrast** — Any new solid “cursor-colored” surface must pair with a computed or verified foreground (pattern: `cursor-hover-fg` or equivalent), not only `currentColor` on `var(--cursor-color)`.

---

## 4. Checklist: adding a new chrome control

- [ ] Uses **`var(--cursor-color)`** for the opaque hover/active fill (or a documented exception).
- [ ] Uses **`var(--ui-chrome-button-edge)`** for the rim (or extends tokens with a PR note).
- [ ] Foreground on that fill uses **`var(--cursor-hover-fg)`** (or passes WCAG with a documented alternative).
- [ ] Fill implemented via **`::before`** (or the same stacking model) with **icons above** the fill (`z-index`).
- [ ] Transitions use **`--ui-chrome-fill-transition-duration`** for fill-related properties.
- [ ] Parent **`pointer-events`** checked if the control sits in a `pointer-events: none` wrapper.
- [ ] Verified on **home, portfolio, CV** in **light and dark** (and mobile width if applicable).

---

## 5. Legacy / config note

`linkHoverIntensityLight` / `Dark` / `Active` are still written to CSS variables for saved configs but **do not drive** the current solid chrome hovers. See [`CONFIGURATION.md`](CONFIGURATION.md). If you reintroduce tunable hover strength, prefer **mixing cursor with an opaque surface color** rather than transparency into the canvas.

---

*Last aligned with implementation in `main.css` / `tokens.css` / `colors.js` (solid chrome + sound slot parity). Update this doc when those patterns change.*
