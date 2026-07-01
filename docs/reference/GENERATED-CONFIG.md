# Generated Config

`react-app/app/public/config/design-system.json` is the authored design/config source.

These files are generated compatibility/runtime outputs:

- `react-app/app/public/config/default-config.json`
- `react-app/app/public/config/shell-config.json`
- `react-app/app/public/config/portfolio-config.json`
- `react-app/app/public/config/cv-config.json`

They exist because older runtime loaders and route-specific normalizers still read route-shaped JSON. They should match the values derived from `design-system.json`.

## Commands

Regenerate generated config files:

```bash
npm run flatten:design-config
```

Check that generated files are in sync without writing files:

```bash
npm run check:design-config
```

Build the production site:

```bash
npm run build
```

The root build is canonical because it runs `flatten:design-config` before the Vite build.

## Editing Rule

Do not hand-author generated config outputs. Edit `design-system.json` or use the local dev panel save flow, then regenerate/check the derived files.

Hand edits to generated outputs are risky because the next flatten/build can overwrite them, and because runtime surfaces may disagree if only one output is changed.
