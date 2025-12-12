#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    FIGMA MCP CONFIGURATION SETUP SCRIPT                       ║
// ║                        Alexander Beck Studio Website                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Sets up the Figma MCP server configuration in Cursor's settings directory.
 * This script writes the configuration file to the correct location so Cursor
 * can communicate with Figma through the MCP protocol.
 * 
 * Usage:
 *   node scripts/setup-figma-mcp-config.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Cursor',
  'User',
  'globalStorage',
  'saoudrizwan.claude-dev',
  'settings'
);

const CONFIG_FILE = path.join(CONFIG_DIR, 'cline_mcp_settings.json');

const CONFIG = {
  mcpServers: {
    TalkToFigma: {
      command: "bunx",
      args: [
        "cursor-talk-to-figma-mcp@latest"
      ]
    }
  }
};

try {
  // Create directory if it doesn't exist
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    console.log(`✅ Created directory: ${CONFIG_DIR}`);
  }

  // Read existing config if it exists
  let existingConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const existingContent = fs.readFileSync(CONFIG_FILE, 'utf8');
      existingConfig = JSON.parse(existingContent);
      console.log(`📖 Found existing config at: ${CONFIG_FILE}`);
    } catch (err) {
      console.warn(`⚠️  Could not parse existing config, will overwrite: ${err.message}`);
    }
  }

  // Merge with existing config (preserve other MCP servers if any)
  const mergedConfig = {
    ...existingConfig,
    mcpServers: {
      ...(existingConfig.mcpServers || {}),
      ...CONFIG.mcpServers
    }
  };

  // Write the configuration
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(mergedConfig, null, 2), 'utf8');
  console.log(`✅ Configuration written to: ${CONFIG_FILE}`);
  console.log(`\n📋 Configuration:`);
  console.log(JSON.stringify(mergedConfig, null, 2));
  console.log(`\n⚠️  IMPORTANT: Restart Cursor for the changes to take effect!`);
  
} catch (error) {
  console.error(`❌ Error setting up Figma MCP configuration:`);
  console.error(error);
  process.exit(1);
}


