# Generated configuration

## Authored source

Edit only `react-app/app/public/config/design-system.json`.

## Generated outputs

- `default-config.json`
- `shell-config.json`
- `portfolio-config.json`
- `cv-config.json` — schema/runtime compatibility output, not a live CV page

## Commands

```bash
npm run flatten:design-config
npm run check:design-config
npm run build
```

The canonical root build first checks that production HTML entries share the approved boot and stylesheet shell, then flattens config, then runs Vite. Never hand-author a generated output or use a direct app build as release proof.
