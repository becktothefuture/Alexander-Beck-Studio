# Config Sync System - Usage Guide

## Overview

The config sync system persists config slider changes back to config files when running the **HTML site** in dev mode. The sync server and scripts live in `html-site/` (see `html-site/README.md`). For the React app, config is read from `react-app/app/public/config/` at build/serve time; the sync server is used when developing the isolated HTML site (`npm run dev:html` or from inside `html-site/`).

**HTML site config paths:** `html-site/source/config/default-config.json`, `html-site/source/config/portfolio-config.json`.

## How It Works

1. **User drags a slider** in the config panel
2. **Runtime config updates** immediately (visual feedback)
3. **After 300ms debounce**, the change is sent to the config sync server
4. **Server writes** the change to the appropriate source config file
5. **Next refresh** loads the updated values from the file

## Starting the System

When developing the **HTML site** (e.g. `npm run dev:html` or from inside `html-site/`), you can run the config sync server separately from `html-site/` so slider changes persist to `html-site/source/config/`. From repo root, the interactive menu no longer starts the config sync server by default; run it from `html-site/` if needed.

## Usage

### Main Site Config

1. Open `http://localhost:8001` in your browser
2. Press `/` to open the config panel
3. Adjust any slider (e.g., `gravityMultiplier`, `ballMassKg`)
4. Wait 300ms (debounce period)
5. Check `html-site/source/config/default-config.json` - the value should be updated (when sync server is running from html-site)

### Portfolio Config

1. Open `http://localhost:8001/portfolio.html` in your browser
2. Press `/` to open the portfolio config panel
3. Adjust any slider (e.g., `topLogoWidthVw`, `contentOffset`)
4. Wait 300ms (debounce period)
5. Check `html-site/source/config/portfolio-config.json` - the value should be updated

## Technical Details

### Debouncing

Changes are debounced by 300ms to prevent excessive file writes during rapid slider dragging. Only the final value is written.

### Dev Mode Only

The sync system only works in dev mode (port 8001). In production (port 8000), changes are not persisted.

### Error Handling

If the config sync server is unavailable:
- Changes still apply to runtime config (UI works normally)
- Errors are logged to console (non-blocking)
- No UI disruption

### Supported Control Types

- **Range sliders**: Numeric values (e.g., `1.05`, `300`)
- **Checkboxes**: Boolean values (`true`/`false`)
- **Select dropdowns**: String values
- **Color pickers**: Hex color strings (main site only)

### Nested Paths

Portfolio config supports nested paths (e.g., `runtime.sound.masterGain`). Main site config uses flat paths (e.g., `gravityMultiplier`).

## Troubleshooting

### Changes Not Persisting

1. **Check server is running**: Look for "Config sync server running on http://localhost:8002" in terminal
2. **Check dev mode**: Ensure you're on port 8001 (not 8000)
3. **Check console**: Look for sync errors in browser console
4. **Wait for debounce**: Changes only sync after 300ms of no activity

### Port Conflicts

If port 8002 is already in use:
- Another instance may be running
- Kill the existing process: `lsof -ti:8002 | xargs kill`
- Restart dev mode

### File Permissions

If you see "Failed to write config file" errors:
- Check file permissions on `html-site/source/config/` directory
- Ensure the directory is writable

## API Reference

### Frontend: `syncConfigToFile(configType, path, value)`

```javascript
import { syncConfigToFile } from './modules/utils/config-sync.js';

// Sync a main site config value
syncConfigToFile('default', 'gravityMultiplier', 1.1);

// Sync a portfolio config value
syncConfigToFile('portfolio', 'runtime.sound.masterGain', 0.8);
```

### Backend: POST `/api/config-sync`

```bash
curl -X POST http://localhost:8002/api/config-sync \
  -H "Content-Type: application/json" \
  -d '{
    "configType": "default",
    "path": "gravityMultiplier",
    "value": 1.1
  }'
```

## Architecture

See `docs/development/CONFIG-SYNC-PLAN.md` for detailed architecture and implementation notes.
