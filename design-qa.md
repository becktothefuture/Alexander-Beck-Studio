# Design QA — Button Bar active key

## Comparison inputs

- Selected reference: `/var/folders/rw/9jhrlh_10712yxzp7d29g8440000gn/T/codex-clipboard-1a4d3aa8-1db5-48ee-92f4-25ae5fa034f6.png`
- Implemented Home state at a 1024 CSS-pixel viewport: `output/playwright/menu-active-state-implementation/home-1024.jpg`
- Component-focused comparison: `output/playwright/menu-active-state-implementation/reference-vs-implementation.png`
- Compared state: Home active, configuration panel closed, default light interior theme.

## Visual review

| Area | Result | Evidence |
| --- | --- | --- |
| Composition | Passed | The Button Bar remains one centred spatial capsule. The active state now occupies the complete Home cell instead of a small dot. |
| Active material | Passed | The shared graphite key has a broad surface, inset top highlight, lower edge definition, and controlled depth shadow. |
| Typography | Passed | Desktop labels are 16px, uppercase, and more legible. They use the next loaded Geist weight (`700`) with slight `0.012em` tracking. The active label is white; inactive labels retain the stable neutral shell ink. |
| Separators | Passed | No divider elements are rendered. The reference separators are intentionally omitted because the selected direction was explicitly amended to remove them. |
| Interaction | Passed | One inert key moves and resizes to the active or pending route. `aria-current` remains on the committed route. |
| Configuration | Passed | Button Bar geometry, typography, active-key material, and motion controls are under the top-level **Menu** group with Menu Inner Edge controls. Live apply and canonical reload use the existing design-config path. |
| Responsive behavior | Passed | Chromium contract coverage passed from 320px to 1440px. WebKit checks passed at 320px, 768px, and 1440px. Route-transition motion passed in Chromium and WebKit. |

## Outcome

The implemented component matches the selected direction at the level requested: a larger, spatial active surface; adjusted labels; one moving key; and no separator lines. The surrounding production shell was preserved.

final result: passed
