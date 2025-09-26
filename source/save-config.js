#!/usr/bin/env node

/**
 * Save Configuration Script
 * 
 * This script updates the current-config.json file with new configuration data.
 * It can be called from the command line or via npm script.
 * 
 * Usage:
 *   node save-config.js '{"key": "value", ...}'
 *   echo '{"key": "value"}' | node save-config.js
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'current-config.json');
const ALT_CONFIG_FILE = path.join(__dirname, 'current-config-2.json');

function saveConfig(configData) {
  try {
    // Parse the config data if it's a string
    const config = typeof configData === 'string' ? JSON.parse(configData) : configData;
    
    // Pretty format the JSON
    const formattedJson = JSON.stringify(config, null, 2);
    
    // Determine which config file to update (prefer current-config.json, fallback to current-config-2.json)
    let targetFile = CONFIG_FILE;
    if (!fs.existsSync(CONFIG_FILE) && fs.existsSync(ALT_CONFIG_FILE)) {
      targetFile = ALT_CONFIG_FILE;
    }
    
    // Write the config file
    fs.writeFileSync(targetFile, formattedJson + '\n');
    
    console.log('✅ Configuration saved successfully!');
    console.log(`📁 File: ${path.basename(targetFile)}`);
    console.log(`📊 Size: ${formattedJson.length} characters`);
    
    // Show a preview of what was saved
    const preview = Object.keys(config).slice(0, 5).join(', ');
    const moreKeys = Object.keys(config).length > 5 ? ` and ${Object.keys(config).length - 5} more...` : '';
    console.log(`🔧 Keys: ${preview}${moreKeys}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to save configuration:', error.message);
    return false;
  }
}

// Handle command line usage
if (require.main === module) {
  let configData = '';
  
  // Check if config data was passed as argument
  if (process.argv[2]) {
    configData = process.argv[2];
    saveConfig(configData);
  } else {
    // Read from stdin (for piped input)
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', (chunk) => {
      configData += chunk;
    });
    
    process.stdin.on('end', () => {
      if (configData.trim()) {
        saveConfig(configData.trim());
      } else {
        console.error('❌ No configuration data provided');
        console.log('Usage: node save-config.js \'{"key": "value"}\'');
        console.log('   or: echo \'{"key": "value"}\' | node save-config.js');
        process.exit(1);
      }
    });
  }
}

module.exports = { saveConfig };

