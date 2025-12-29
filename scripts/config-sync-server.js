#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      CONFIG SYNC SERVER                                      ║
// ║                                                                              ║
// ║  Node.js server that persists config slider changes back to source files   ║
// ║  Runs on port 8002, only active in dev mode                                 ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

const PORT = 8002;
const CONFIG_DIR = path.join(__dirname, '..', 'source', 'config');

// Allowed config types (security: prevent arbitrary file writes)
const ALLOWED_CONFIG_TYPES = {
  'default': 'default-config.json',
  'portfolio': 'portfolio-config.json'
};

/**
 * Deep set a value in an object using dot-notation path
 */
function setNestedValue(obj, path, value) {
  const parts = path.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object') {
      cursor[part] = {};
    }
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
  return obj;
}

/**
 * Validate config path (prevent injection attacks)
 */
function validatePath(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') return false;
  // Only allow alphanumeric, dots, underscores, hyphens
  if (!/^[a-zA-Z0-9._-]+$/.test(pathStr)) return false;
  // Prevent path traversal
  if (pathStr.includes('..')) return false;
  return true;
}

/**
 * Handle bulk config save (entire config object at once)
 */
async function handleBulkConfigSave(req, res) {
  // CORS headers for dev mode
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const { configType, config: configObject } = data;

      // Validate config type
      if (!configType || !ALLOWED_CONFIG_TYPES[configType]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: `Invalid configType. Must be one of: ${Object.keys(ALLOWED_CONFIG_TYPES).join(', ')}` 
        }));
        return;
      }

      // Validate config object
      if (!configObject || typeof configObject !== 'object') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid config object' 
        }));
        return;
      }

      // Write entire config file
      const configFileName = ALLOWED_CONFIG_TYPES[configType];
      const configFilePath = path.join(CONFIG_DIR, configFileName);
      
      try {
        const jsonString = JSON.stringify(configObject, null, 2) + '\n';
        await fs.writeFile(configFilePath, jsonString, 'utf8');
        
        console.log(`[config-sync-server] ✅ Bulk save: ${configType} (${Object.keys(configObject).length} keys)`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `Config saved: ${configType} (${Object.keys(configObject).length} keys)`
        }));
      } catch (e) {
        console.error(`[config-sync-server] Failed to write config file:`, e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: `Failed to write config file: ${e.message}` 
        }));
      }

    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: `Invalid request: ${e.message}` 
      }));
    }
  });
}

/**
 * Handle config sync request
 */
async function handleConfigSync(req, res) {
  // CORS headers for dev mode
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    console.warn(`[config-sync-server] Method not allowed: ${req.method}`);
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });
  req.on('end', async () => {
    try {
      const data = JSON.parse(body);
      const { configType, path: configPath, value } = data;

      // Validate config type
      if (!configType || !ALLOWED_CONFIG_TYPES[configType]) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: `Invalid configType. Must be one of: ${Object.keys(ALLOWED_CONFIG_TYPES).join(', ')}` 
        }));
        return;
      }

      // Validate path
      if (!validatePath(configPath)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid config path. Only alphanumeric, dots, underscores, and hyphens allowed.' 
        }));
        return;
      }

      // Load current config
      const configFileName = ALLOWED_CONFIG_TYPES[configType];
      const configFilePath = path.join(CONFIG_DIR, configFileName);
      
      let config;
      try {
        const fileContent = await fs.readFile(configFilePath, 'utf8');
        config = JSON.parse(fileContent);
      } catch (e) {
        console.error(`[config-sync-server] Failed to read config file:`, e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: `Failed to read config file: ${e.message}` 
        }));
        return;
      }

      // Update config value
      setNestedValue(config, configPath, value);

      // Validate JSON before writing (round-trip test)
      try {
        JSON.stringify(config);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: `Invalid JSON structure: ${e.message}` 
        }));
        return;
      }

      // Write updated config
      try {
        const jsonString = JSON.stringify(config, null, 2) + '\n';
        await fs.writeFile(configFilePath, jsonString, 'utf8');
      } catch (e) {
        console.error(`[config-sync-server] Failed to write config file:`, e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: false, 
          error: `Failed to write config file: ${e.message}` 
        }));
        return;
      }

      // Success response
      const successMessage = `Config updated: ${configType}.${configPath} = ${JSON.stringify(value)}`;
      console.log(`[config-sync-server] ✅ ${successMessage}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: successMessage
      }));

    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: false, 
        error: `Invalid request: ${e.message}` 
      }));
    }
  });
}

/**
 * Main request router
 */
function handleRequest(req, res) {
  // Parse URL pathname (simple parsing without URL constructor for compatibility)
  const pathname = req.url.split('?')[0];
  
  // Route bulk save requests
  if (pathname === '/api/config-sync-bulk') {
    handleBulkConfigSave(req, res);
    return;
  }
  
  // Route individual sync requests
  if (pathname === '/api/config-sync') {
    handleConfigSync(req, res);
    return;
  }
  
  // Unknown route
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
}

/**
 * Start the config sync server
 */
function startServer() {
  const server = http.createServer(handleRequest);

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Config sync server: Port ${PORT} already in use`);
      console.error('   Another instance may be running, or port conflict');
      process.exit(1);
    } else {
      console.error(`❌ Config sync server error:`, err);
      process.exit(1);
    }
  });

  server.listen(PORT, () => {
    console.log(`✅ Config sync server running on http://localhost:${PORT}`);
    console.log(`   Syncing to: ${CONFIG_DIR}`);
    console.log(`   Ready to receive config sync requests`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping config sync server...');
    server.close(() => {
      console.log('   Config sync server stopped');
      process.exit(0);
    });
  });
}

// Start server
startServer();
