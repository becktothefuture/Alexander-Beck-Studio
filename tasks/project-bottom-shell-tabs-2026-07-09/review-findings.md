# Review Findings

Created: 2026-07-09

## Review Lanes

| Lane | Reviewer | Result |
| --- | --- | --- |
| Product design | Subagent | Changes requested before PRDs |
| Creative direction | Subagent | Changes requested before PRDs |
| Development architecture | Subagent | Changes requested before PRDs |
| Business analysis | Subagent | PRD split revised |

## Shared Findings

1. Active tab state cannot be derived only from `routeState.route.id`.
   - Gated Portfolio/About requests can resolve to Home while a gate modal is active.
   - The dock needs an explicit display-route contract for requested gated routes, dismissed gates, granted gates, SPA transitions, direct loads, and browser back/forward.

2. Contact route promotion needs full route and build ownership.
   - `/contact.html` needs route registry, `SiteApp` maps, Vite input or equivalent build entry, direct-load readiness, and preview validation.
   - Contact content should reuse the existing content source, but the page needs a shell-native composition rather than a stretched modal.

3. `#main-links` cannot be removed casually.
   - Home readiness and legacy modal/gate modules currently depend on `#main-links .footer_link` and stable trigger IDs.
   - Visual removal requires readiness migration and explicit compatibility behavior.

4. The bottom dock should be screenshot-inspired but constrained to existing site materials.
   - Use `.footer_link` / `.abs-icon-btn` token language, cursor-color fills, readable hover foreground, subtle rim/inset, and reduced-motion-safe transitions.
   - Do not introduce heavy glass, a new palette, or a second chrome system.

5. Bottom frame geometry has more consumers than `#simulations`.
   - The PRD must cover wall, veil, vignette, scene effects/fallbacks, portfolio host, drawer close offsets, footer metadata, edge caption, safe areas, and audits.

6. Route top bars still matter.
   - Bottom tabs own primary navigation.
   - Route top bars may keep local utilities such as back and sound.
   - Remove duplicate text actions only after the dock and gate flows are verified.

## Decisions Applied

- Revised PRD split from six broad topics to six dependency-aware PRDs:
  1. `prd-contact-route-promotion.md`
  2. `prd-route-and-tab-state-foundation.md`
  3. `prd-bottom-frame-geometry.md`
  4. `prd-shell-tab-visual-system.md`
  5. `prd-route-chrome-cleanup-and-legacy-compat.md`
  6. `prd-release-verification-and-docs.md`
- Added per-PRD verification gates rather than deferring validation to final closeout.
- Added active-tab state matrix as a required deliverable.
- Added Contact direct-load/build checks.
- Added mobile safe-area and footer/dock coexistence acceptance criteria.
- Added explicit visual constraints for restrained skeuomorphic treatment.
- Reordered Contact before route/tab foundation so dock targets never point at a missing route.
- Added validation-script migration to affected PRDs because current audits assert `#main-links`, Contact modal, and route-topbar assumptions.
- Defined dock mount as shared footer UI inside `.fade-content` so portfolio drawer layering remains intact.
