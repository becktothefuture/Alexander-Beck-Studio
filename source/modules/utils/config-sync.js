// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      CONFIG SYNC CLIENT                                       ║
// ║                                                                              ║
// ║  Frontend module that syncs config changes back to source files via API      ║
// ║  Only active in dev mode (port 8001)                                        ║
// ║  Debounces rapid changes to prevent excessive writes                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { isDev } from './logger.js';

const SYNC_SERVER_URL = 'http://localhost:8002/api/config-sync';
const SYNC_SERVER_BULK_URL = 'http://localhost:8002/api/config-sync-bulk';
const DEBOUNCE_MS = 300; // Wait 300ms after last change before syncing

// Pending sync operations (keyed by configType + path)
const pendingSyncs = new Map();

// Debounce timers (keyed by configType + path)
const debounceTimers = new Map();

/**
 * Generate sync key for debouncing
 */
function getSyncKey(configType, path) {
  return `${configType}:${path}`;
}

/**
 * Sync a config value to the source file
 * 
 * @param {string} configType - 'default' or 'portfolio'
 * @param {string} path - Config path (e.g., 'gravityMultiplier' or 'runtime.sound.masterGain')
 * @param {any} value - Value to set
 */
export async function syncConfigToFile(configType, path, value) {
  // Only sync in dev mode
  if (!isDev()) {
    return;
  }

  // Validate inputs
  if (!configType || !path) {
    console.warn('[config-sync] Invalid sync request:', { configType, path });
    return;
  }

  if (configType !== 'default' && configType !== 'portfolio') {
    console.warn('[config-sync] Invalid configType:', configType);
    return;
  }

  const syncKey = getSyncKey(configType, path);

  // Store pending value (overwrites previous if same key)
  pendingSyncs.set(syncKey, { configType, path, value });

  // Clear existing debounce timer
  if (debounceTimers.has(syncKey)) {
    clearTimeout(debounceTimers.get(syncKey));
  }

  // Set new debounce timer
  const timer = setTimeout(async () => {
    debounceTimers.delete(syncKey);
    
    const pending = pendingSyncs.get(syncKey);
    if (!pending) return;
    
    pendingSyncs.delete(syncKey);

    // Perform sync
    try {
      const response = await fetch(SYNC_SERVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configType: pending.configType,
          path: pending.path,
          value: pending.value
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.warn('[config-sync] Sync failed:', error.error || `HTTP ${response.status}`);
        return;
      }
      // Success: keep quiet (panel remains responsive even if sync server is down).
      await response.json().catch(() => null);
    } catch (e) {
      // Fail silently if server unavailable (doesn't break UI)
      // Only log if it's not a typical network failure.
      if (e?.name !== 'TypeError') console.warn('[config-sync] Sync error:', e?.message);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(syncKey, timer);
}

/**
 * Force immediate sync (bypasses debounce)
 * Useful for testing or when you need immediate persistence
 */
export async function syncConfigToFileImmediate(configType, path, value) {
  if (!isDev()) return;

  // Clear any pending debounce
  const syncKey = getSyncKey(configType, path);
  if (debounceTimers.has(syncKey)) {
    clearTimeout(debounceTimers.get(syncKey));
    debounceTimers.delete(syncKey);
  }
  pendingSyncs.delete(syncKey);

  // Sync immediately
  try {
    const response = await fetch(SYNC_SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configType, path, value })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[config-sync] Immediate sync failed:', error.error || `HTTP ${response.status}`);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (e) {
    if (e.name !== 'TypeError' || !e.message.includes('fetch')) {
      console.warn('[config-sync] Immediate sync error:', e.message);
    }
    return false;
  }
}

/**
 * Save entire config object at once (bulk save)
 * This avoids race conditions from multiple simultaneous writes
 * 
 * @param {string} configType - 'default' or 'portfolio'
 * @param {object} configObject - Complete config object to save
 */
export async function saveConfigBulk(configType, configObject) {
  if (!isDev()) return false;

  try {
    const response = await fetch(SYNC_SERVER_BULK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configType, config: configObject })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.warn('[config-sync] Bulk save failed:', error.error || `HTTP ${response.status}`);
      return false;
    }

    const result = await response.json();
    return result.success;
  } catch (e) {
    if (e.name !== 'TypeError' || !e.message.includes('fetch')) {
      console.warn('[config-sync] Bulk save error:', e.message);
    }
    return false;
  }
}
