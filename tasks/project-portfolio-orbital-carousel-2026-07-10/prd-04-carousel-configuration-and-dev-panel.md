# PRD 04: Carousel Configuration And Dev Panel

## 1. Overview

Add a dedicated Portfolio Carousel configuration parent category so the orbital carousel can be tuned without code edits. Values must support desktop/mobile min/max interpolation where requested and participate in the canonical config save/flatten workflow.

## 2. Goals

- Create a clear Carousel parent group in the portfolio controls.
- Let the user tune card radius, card spacing, card size, card tilt, dot density, dot radius, scroll sensitivity, snap strength, and responsive min/max behavior.
- Persist changes to `design-system.json`.
- Flatten generated config through the existing build workflow.
- Persist new values under `portfolio.runtime.carousel`, with compatibility reads from `runtime.deck` only during migration.

## 3. User Stories

### US-001: Carousel Tuning Controls

As the site owner, I can tune carousel spacing and density from the panel.

Acceptance criteria:

- [ ] Controls are grouped under a Carousel parent/category.
- [ ] Radius and spacing can be tuned for desktop and mobile.
- [ ] Dot density and dot radius can be tuned.
- [ ] Scroll sensitivity and snap strength can be tuned.
- [ ] Changes apply live without a full reload where practical.

### US-002: Responsive Interpolation

As the site owner, I can set mobile and desktop bounds and let intermediate viewport widths interpolate.

Acceptance criteria:

- [ ] Controls expose min/max or mobile/desktop values for card radius/size/spacing where needed.
- [ ] Runtime interpolation is deterministic.
- [ ] Values produce stable CSS variables for the renderer.
- [ ] Mobile and desktop can be visually fine-tuned independently.

### US-003: Config Persistence

As a maintainer, I can save the tuned carousel and have the same result in preview/build.

Acceptance criteria:

- [ ] Live panel state saves into `design-system.json`.
- [ ] `npm run check:design-config` passes.
- [ ] `npm run build` flattens generated config.
- [ ] Preview build shows the same carousel without panel interaction.

## 4. Functional Requirements

- FR-1: Add runtime config defaults under `portfolio.runtime.carousel`.
- FR-2: Keep backward compatibility by reading existing `runtime.deck` values only as fallbacks; new saves must write `runtime.carousel`.
- FR-3: Add controls in `panel/control-registry.js`.
- FR-4: Add normalization defaults in `portfolio-config.js`.
- FR-5: Apply values in `app.js` through CSS variables and runtime options.
- FR-6: Include controls for:
  - card radius/path radius;
  - card spacing/angle step;
  - card width/height min/max;
  - mobile card width/height min/max;
  - side card rotation;
  - dot dial radius;
  - dot density;
  - dot active emphasis;
  - input sensitivity;
  - settle/snap strength;
  - visible instance count or coverage.
- FR-7: Do not hand-author generated config files.
- FR-8: Update docs and audits to use the new Carousel name/selectors where they reference the old deck controls.
- FR-9: `design-system.json`, generated `portfolio-config.json`, and runtime defaults must agree after flattening.

## 5. Non-Goals

- No new standalone design tool.
- No config UI redesign beyond a new parent category.
- No runtime localStorage as design truth.

## 6. Technical Considerations

- Current `PORTFOLIO_DECK_DEFAULTS` lives in `app.js`.
- Current `CONTROL_SECTIONS.deck` can be renamed or supplemented. Avoid breaking existing selectors/audits without migration.
- `ACTIVE_SECTION_KEYS` and `PORTFOLIO_PAGE_SECTION_KEYS` must include the new category.
- Existing save/export paths need to include every new control.

## 7. Validation

```bash
npm run check:design-config
npm run build
```

Required browser/config loop:

- Change carousel value in dev.
- Save.
- Reload.
- Build.
- Preview.
- Confirm same result without panel interaction.

## 8. Success Metrics

- The user can fine-tune desktop and mobile carousel geometry without code edits.
- No hidden live-only values are required for the final look.

## 9. Open Questions

- Decision: use `portfolio.runtime.carousel` as the persisted namespace and expose the panel section as `Carousel`.
