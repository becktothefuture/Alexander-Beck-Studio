#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    FIGMA MCP STATUS CHECK SCRIPT                             ║
// ║                        Alexander Beck Studio Website                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Checks the status of Figma MCP integration components.
 * Usage: node scripts/check-figma-mcp-status.js
 */

const { execSync } = require('child_process');

console.log('🔍 Checking Figma MCP Integration Status...\n');

// Check MCP configuration
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_FILE = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Cursor',
  'User',
  'globalStorage',
  'saoudrizwan.claude-dev',
  'settings',
  'cline_mcp_settings.json'
);

console.log('1️⃣  MCP Configuration:');
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    console.log('   ✅ Configuration file exists');
    console.log('   📄 Content:', JSON.stringify(config, null, 2));
  } catch (err) {
    console.log('   ❌ Configuration file exists but is invalid:', err.message);
  }
} else {
  console.log('   ❌ Configuration file not found at:', CONFIG_FILE);
}

// Check WebSocket server
console.log('\n2️⃣  WebSocket Server:');
try {
  const result = execSync('lsof -i :3055 2>/dev/null || echo "not found"', { encoding: 'utf8' });
  if (result.includes('LISTEN')) {
    console.log('   ✅ WebSocket server is running on port 3055');
  } else {
    console.log('   ⚠️  WebSocket server not found on port 3055');
    console.log('   💡 Try: npm run figma:socket');
  }
} catch (err) {
  console.log('   ❌ Error checking WebSocket server');
}

// Check MCP server process
console.log('\n3️⃣  MCP Server Process:');
try {
  const result = execSync('ps aux | grep "cursor-talk-to-figma-mcp" | grep -v grep || echo "not found"', { encoding: 'utf8' });
  if (!result.includes('not found')) {
    console.log('   ✅ MCP server process is running');
  } else {
    console.log('   ⚠️  MCP server process not found');
    console.log('   💡 MCP server should start automatically when Cursor loads');
  }
} catch (err) {
  console.log('   ❌ Error checking MCP server process');
}

// Check Figma process
console.log('\n4️⃣  Figma Application:');
try {
  const result = execSync('ps aux | grep -i "Figma.app" | grep -v grep | head -1 || echo "not found"', { encoding: 'utf8' });
  if (!result.includes('not found')) {
    console.log('   ✅ Figma is running');
  } else {
    console.log('   ⚠️  Figma is not running');
    console.log('   💡 Open Figma and run the Cursor MCP Plugin');
  }
} catch (err) {
  console.log('   ❌ Error checking Figma');
}

console.log('\n📋 Next Steps:');
console.log('   1. Ensure WebSocket server is running: npm run figma:socket');
console.log('   2. Open Figma and run the "Cursor MCP Plugin"');
console.log('   3. Restart Cursor completely (quit and reopen) for MCP tools to load');
console.log('   4. In Cursor chat, try: "Join channel \\"your-channel\\" in Figma"');
console.log('   5. Then try: "Create a rectangle at (100, 100) with size 200x150"');


