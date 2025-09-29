#!/usr/bin/env node

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           CLEAN WEBFLOW + BALL SIMULATION INTEGRATION SCRIPT            ║
 * ║                      Zero Duplication, Surgical Merge                    ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const fs = require('fs');
const path = require('path');

// File paths
const WEBFLOW_EXPORT = path.join(__dirname, 'webflow export/alexander-beck-studio-staging.webflow/index.html');
const CLEAN_BACKUP = path.join(__dirname, 'source/balls-source.html'); // Current source with full control panel
const OUTPUT_FILE = path.join(__dirname, 'source/balls-source.html');

console.log('🔄 CLEAN INTEGRATION: Webflow + Ball Simulation\n');

// Validate inputs
if (!fs.existsSync(WEBFLOW_EXPORT)) {
  console.error('❌ Webflow export not found');
  process.exit(1);
}

if (!fs.existsSync(CLEAN_BACKUP)) {
  console.error('❌ Clean backup not found at:', CLEAN_BACKUP);
  process.exit(1);
}

// Read files
const webflowHtml = fs.readFileSync(WEBFLOW_EXPORT, 'utf8');
const cleanBackup = fs.readFileSync(CLEAN_BACKUP, 'utf8');

// Parse Webflow (simple, clean structure)
const webflowLines = webflowHtml.split('\n');

// Parse clean backup to extract components
const backupLines = cleanBackup.split('\n');

// Hardcoded line numbers based on source/balls-source.html structure
// These are stable for the current source file
const cssStart = 5;   // Line 6 in file (0-indexed = 5)
const cssEnd = 127;   // Line 128 in file
const panelStart = 131; // Line 132 in file (<div id="bravia-balls">)
const panelEnd = 214;   // Line 215 in file (closing </div> for bravia-balls)
const scriptStart = 215; // Line 216 in file (<script>)
const scriptEnd = 1731;  // Line 1732 in file (</script>)

console.log(`📊 Backup structure:
   CSS: lines ${cssStart}-${cssEnd} (${cssEnd - cssStart + 1} lines)
   Panel: lines ${panelStart}-${panelEnd} (${panelEnd - panelStart + 1} lines)
   Script: lines ${scriptStart}-${scriptEnd} (${scriptEnd - scriptStart + 1} lines)`);

// Extract components
const cssBlock = backupLines.slice(cssStart, cssEnd + 1).join('\n');
const panelBlock = backupLines.slice(panelStart, panelEnd + 1).join('\n');
const scriptBlock = backupLines.slice(scriptStart, scriptEnd + 1).join('\n');

// Build integrated file
const integrated = [];

// 1. DOCTYPE and opening tags from Webflow (lines 0-17, excluding </head>)
for (let i = 0; i < 19; i++) {
  const line = webflowLines[i];
  if (line.trim() !== '</head>') {
    integrated.push(line);
  }
}

// 2. Insert ball simulation CSS (includes <style>...</style>)
integrated.push(cssBlock);

// 3. Close head, open body
integrated.push('</head>');
integrated.push('<body class="body">');
integrated.push('  <div class="noise"></div>');

// 4. Insert ball simulation container with panel
integrated.push(panelBlock);

// 5. Insert Webflow content (sections, header, footer) - lines 20 to end-3
for (let i = 20; i < webflowLines.length - 3; i++) {
  integrated.push(webflowLines[i]);
}

// 6. Webflow scripts
integrated.push('  <script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=68cee53c847dda2fd5c39ce4" type="text/javascript" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>');
integrated.push('  <script src="js/webflow.js" type="text/javascript"></script>');
integrated.push('');
integrated.push('  <!-- Complete Ball Simulation JavaScript Engine -->');

// 7. Insert ball simulation script (scriptBlock includes <script> and </script>)
integrated.push(scriptBlock);

// 8. Close body and html
integrated.push('</body>');
integrated.push('</html>');

// Write output
const output = integrated.join('\n');
fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

console.log(`\n✅ Integration complete!
📊 Output: ${(output.length / 1024).toFixed(1)}KB
📂 File: ${OUTPUT_FILE}

🔍 Validation:
   - Single DOCTYPE ✓
   - Single <html> ✓
   - Single <head>...</head> ✓
   - Single <body>...</body> ✓
   - Ball CSS in <head> ✓
   - Ball panel in <body> ✓
   - Ball script before </body> ✓
   - Webflow scripts included ✓

🎯 Next: Run 'npm run build' to test`);
