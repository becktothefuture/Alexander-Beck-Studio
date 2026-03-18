# Apply Tokens In Figma (Native Variables)

This repo exports grouped token files with slash paths for native Figma grouping.

## Files

- `tokens-mode-light.grouped.dtcg.json`
- `tokens-mode-dark.grouped.dtcg.json`
- `tokens-mode-light.grouped.colors-only.dtcg.json`
- `tokens-mode-dark.grouped.colors-only.dtcg.json`
- `token-name-map.grouped.json` (old CSS var name -> new grouped name)

## Recommended import order

1. Import `tokens-mode-light.grouped.colors-only.dtcg.json` as Light mode.
2. Import `tokens-mode-dark.grouped.colors-only.dtcg.json` as Dark mode.
3. Bind color variables to the design first.
4. Optionally import the full grouped files for non-color tokens.

## Fast binding workflow (for the captured frames)

1. Select one imported frame.
2. In right panel, use `Selection colors`.
3. For each color swatch, choose `Apply variable` and pick grouped token paths like:
   - `color/*`
   - `text/*`
   - `bg/*`
   - `frame/*`
   - `wall/*`
   - `chrome/*`
4. Repeat for the other two frames.
5. For text layers, bind text fill to `text/primary`, `text/muted`, etc.

## Important limitation

Current MCP tools used in this workspace can read variable bindings (`get_variable_defs`) and capture pages, but do not expose a write API to bulk-assign variables to existing Figma nodes. Variable assignment is still a Figma UI step.
