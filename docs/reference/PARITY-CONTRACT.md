# Parity contract

A change is complete only when the authored source, live development result, production build, and relevant browser behavior agree.

## Canonical gate

```bash
npm run check:site
```

This checks malformed tokens, actual Vite HTML entries, the simulation catalog, lint, generated-config parity, production-entry shell parity, config flattening, and the Vite build.

## Configuration parity

For config or panel changes:

1. change the value in development;
2. save to `design-system.json`;
3. reload and confirm persistence;
4. run the root build;
5. run preview without opening the panel;
6. confirm Home, Portfolio, About Me, and Contact.

## Browser gates

- `npm run certify:screens`: fresh production build, four primary routes, desktop/mobile, light/dark
- `npm run audit:canvas-spa`: route-generation and canvas backing-store stability
- `npm run audit:portfolio-gate`: current in-window gate
- `npm run audit:portfolio-carousel`: orbital deck
- `npm run audit:portfolio-drawer`: project drawer
- `npm run audit:transition-flows`: Chromium and WebKit, serially; strict RAF when cadence changed

A green build does not prove visual parity or 60 FPS. Report the actual browsers, viewports, routes, and artifacts checked.
