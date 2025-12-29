# Config Sync System - Implementation Plan

## Overview

A system that automatically persists config slider changes back to source config files (`source/config/default-config.json` or `source/config/portfolio-config.json`) when running in dev mode.

## Architecture

### Components

1. **Config Sync Server** (`scripts/config-sync-server.js`)
   - Node.js HTTP server running on port 8002
   - Receives POST requests with config updates
   - Writes changes to appropriate source config file
   - Only runs in dev mode (when dev server is active)

2. **Config Sync Client** (`source/modules/utils/config-sync.js`)
   - Frontend module that sends config updates to sync server
   - Debounces rapid changes (e.g., slider drags)
   - Only active when `isDev()` returns true
   - Handles errors gracefully (fails silently if server unavailable)

3. **Integration Points**
   - `source/modules/ui/control-registry.js` - Main site config panel
   - `source/modules/portfolio/panel/control-registry.js` - Portfolio config panel
   - Both call `syncConfigToFile()` after `setConfigValue()` updates

4. **Dev Startup Integration**
   - `scripts/dev-startup.js` starts config sync server alongside dev server
   - Only starts when dev mode is selected (port 8001)

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
config-sync-server.js: writes to source/config/default-config.json
  ↓
File updated → Next refresh loads new values
```

## File Structure

```
scripts/
  └── config-sync-server.js    # Node.js server (port 8002)

source/modules/utils/
  └── config-sync.js           # Frontend sync client

source/modules/ui/
  └── control-registry.js      # Main site (integrate sync call)

source/modules/portfolio/panel/
  └── control-registry.js      # Portfolio (integrate sync call)
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
2. Create `scripts/config-sync-server.js`
3. Create `source/modules/utils/config-sync.js`
4. Integrate into main site `control-registry.js`
5. Integrate into portfolio `control-registry.js`
6. Update `dev-startup.js` to start sync server
7. Test end-to-end flow
8. Document usage

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
