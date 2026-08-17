Parent specification: #44

## What to build

Define and ship the site-wide supported-viewport policy through the existing shared modal cover. Keep ordinary desktop, laptop, tablet, ultrawide-with-height, and portrait-phone viewports available. Cover phone landscape, desktop or landscape viewports that are too short to contain the studio window, and the existing extreme wide or tall cases.

Preserve the cover’s current visual treatment and accessible interruption behavior. Update the durable design documentation so portrait-only phone support and the short-viewport boundary are explicit.

## Acceptance criteria

- The support authority returns explicit modes for phone landscape, short viewport, extreme wide, and extreme tall cases.
- A 390 × 844 portrait phone remains supported.
- A 375 × 667 portrait phone remains supported.
- An 844 × 390 phone-landscape viewport shows the shared cover.
- A 1280 × 500 short desktop viewport shows the shared cover.
- A 1280 × 720 laptop viewport remains supported.
- A 1024 × 768 tablet viewport remains supported.
- A 3440 × 1440 ultrawide viewport remains supported.
- Exact threshold boundaries have deterministic tests.
- Invalid measurements fail open.
- Home, Work, About Me, Lab, and Contact all use the same cover policy.
- When active, the cover has modal semantics, receives focus, and makes the application inert and hidden from assistive technology.
- Resizing from an unsupported viewport into a supported viewport removes the cover and restores the current route without reload.
- Browser evidence exists for every route and every unsupported mode.
- The project’s focused checks and build pass.

## Blocked by

None.
