# Config Sync System - Implementation Plan

## Overview

A system that persists config slider changes back to config files when running the **HTML site** in dev mode. The server and client now live under the isolated HTML pipeline in `html-site/`.

## Architecture

### Components

1. **Config Sync Server** (`html-site/scripts/config-sync-server.js`)
   - Node.js HTTP server running on port 8002
   - Receives POST requests with config updates
   - Writes changes to appropriate source config file
   - Only runs in dev mode (when dev server is active)

2. **Config Sync Client** (`html-site/source/modules/utils/config-sync.js`)
   - Frontend module that sends config updates to sync server
   - Debounces rapid changes (e.g., slider drags)
   - Only active when `isDev()` returns true
   - Handles errors gracefully (fails silently if server unavailable)

3. **Integration Points**
   - `html-site/source/modules/ui/control-registry.js` - Main site config panel
   - `html-site/source/modules/portfolio/panel/control-registry.js` - Portfolio config panel
   - Both call `syncConfigToFile()` after `setConfigValue()` updates

4. **Running the sync server**
   - Config sync server is started from `html-site/` when developing the HTML site (see `html-site/README.md`). Root `scripts/dev-startup.js` no longer starts it by default.

## Data Flow

```
User drags slider
  ↓
control-registry.js: setConfigValue() updates runtime config
  ↓
config-sync.js: syncConfigToFile() debounced (300ms)
  ↓
POST http://localhost:8002/api/config-sync
  ↓
config-sync-server.js: writes to html-site/source/config/default-config.json
  ↓
File updated → Next refresh loads new values
```

## File Structure

```
html-site/scripts/
  └── config-sync-server.js    # Node.js server (port 8002)

html-site/source/modules/utils/
  └── config-sync.js            # Frontend sync client

html-site/source/modules/ui/
  └── control-registry.js       # Main site (integrate sync call)

html-site/source/modules/portfolio/panel/
  └── control-registry.js       # Portfolio (integrate sync call)
```

## API Specification

### POST `/api/config-sync`

**Request Body:**
```json
{
  "configType": "default" | "portfolio",
  "path": "gravityMultiplier" | "runtime.sound.masterGain" | ...,
  "value": <any JSON value>
}
```

**Response:**
```json
{
  "success": true,
  "message": "Config updated"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Safety Features

1. **Dev Mode Only**: Only syncs when `isDev()` returns true
2. **Debouncing**: Waits 300ms after last change before syncing
3. **Error Handling**: Fails silently if server unavailable (doesn't break UI)
4. **File Validation**: Server validates JSON before writing
5. **Backup**: Server creates backup before overwriting (optional)
6. **Path Validation**: Server validates config paths to prevent injection

## Implementation Steps

1. ✅ Create plan document
2. ✅ Create `html-site/scripts/config-sync-server.js`
3. ✅ Create `html-site/source/modules/utils/config-sync.js`
4. ✅ Integrate into main site and portfolio `control-registry.js`
5. Sync server runs from `html-site/` when needed (see CONFIG-SYNC-USAGE.md)
6. Test end-to-end flow
7. Document usage

## Edge Cases

- **Rapid slider changes**: Debouncing prevents excessive writes
- **Multiple tabs**: Each tab syncs independently (last write wins)
- **Server not running**: Frontend fails silently, no UI impact
- **Invalid JSON**: Server rejects and logs error, doesn't corrupt file
- **File locked**: Server retries once, then fails gracefully
- **Port conflict**: Server logs error and exits (doesn't break dev server)

## Testing Checklist

- [ ] Slider change persists after refresh
- [ ] Debouncing works (rapid changes only write once)
- [ ] Dev mode detection works (no sync in production)
- [ ] Portfolio config syncs correctly
- [ ] Main site config syncs correctly
- [ ] Nested paths work (`runtime.sound.masterGain`)
- [ ] Error handling graceful (server down)
- [ ] Multiple tabs don't conflict
- [ ] JSON validation prevents corruption
