#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PRODUCTION BUILD SYSTEM                             ║
// ║           Webflow Export + Bouncy Balls Integration + Minification          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Production Build...\n');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  webflowSource: './webflow-export',
  publicDestination: './public',
  sourceFile: './source/balls-source.html',
  backupExisting: true,
  compactSidebar: true,
  sidebarVisible: true, // Set to false for hidden by default
  preserveWebflowStyles: true
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌ Source directory not found: ${src}`);
    return false;
  }
  
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    const stat = fs.statSync(srcPath);
    
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`📄 Copied: ${item}`);
    }
  }
  
  return true;
}

function extractSimulationCode(sourceFile) {
  console.log('🔍 Extracting simulation code...');
  
  const content = fs.readFileSync(sourceFile, 'utf8');
  
  // Extract JavaScript between <script> tags
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Could not find script section in source file');
  }
  
  let jsCode = scriptMatch[1];
  
  // Extract CSS between <style> tags
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  const cssCode = styleMatch ? styleMatch[1] : '';
  
  return { jsCode, cssCode };
}

function createCompactSidebarCSS() {
  return `
/* ═══════════════════════════════════════════════════════════════════════════ */
/* COMPACT SIDEBAR STYLES (Production Build)                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

#bravia-balls .panel {
  position: fixed;
  top: 20px;
  right: 20px;
  color: #fff;
  font: 9px/1.2 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  background: rgba(0,0,0,0.7);
  padding: 6px;
  border-radius: 6px;
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 280px;
  max-height: 85vh;
  overflow-y: auto;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
  z-index: 10000;
  cursor: move;
  transition: opacity 0.2s ease;
}

#bravia-balls .panel.hidden {
  opacity: 0;
  pointer-events: none;
}

#bravia-balls .panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  cursor: grab;
}

#bravia-balls .panel-header:active {
  cursor: grabbing;
}

#bravia-balls .drag-handle {
  opacity: 0.5;
  margin-right: 6px;
  font-size: 8px;
}

#bravia-balls .panel details {
  margin: 2px 0;
}

#bravia-balls .panel summary {
  font-size: 9px;
  font-weight: 600;
  padding: 3px 0;
  cursor: pointer;
  opacity: 0.9;
}

#bravia-balls .panel .group {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 2px 0;
}

#bravia-balls .panel label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 8px;
  gap: 6px;
}

#bravia-balls .panel input[type="range"] {
  width: 60px;
  height: 12px;
  cursor: pointer;
}

#bravia-balls .panel input[type="checkbox"] {
  width: 12px;
  height: 12px;
  cursor: pointer;
}

#bravia-balls .panel input[type="color"] {
  width: 20px;
  height: 12px;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

#bravia-balls .panel select {
  font-size: 8px;
  padding: 2px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px;
  cursor: pointer;
}

#bravia-balls .panel .val,
#bravia-balls .panel .hex-val {
  font-size: 8px;
  opacity: 0.8;
  min-width: 35px;
  text-align: right;
  font-family: monospace;
}

#bravia-balls .panel .hex-val {
  cursor: pointer;
  min-width: 50px;
}

#bravia-balls .panel .mode-switcher {
  display: flex;
  gap: 2px;
  margin: 4px 0;
}

#bravia-balls .panel .mode-button {
  flex: 1;
  padding: 4px 6px;
  font-size: 8px;
  background: rgba(255,255,255,0.1);
  color: #fff;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
}

#bravia-balls .panel .mode-button.active {
  background: rgba(255,255,255,0.3);
  border-color: rgba(255,255,255,0.5);
}

#bravia-balls .panel button {
  font-size: 8px;
  padding: 3px 8px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-weight: 600;
}

#bravia-balls .panel button:hover {
  background: #45a049;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  #bravia-balls .panel {
    max-width: 240px;
    font-size: 8px;
    top: 10px;
    right: 10px;
  }
  
  #bravia-balls .panel input[type="range"] {
    width: 50px;
  }
}
`;
}

function integrateSimulation(webflowIndexPath, simulationCode, compactCSS) {
  console.log('🔧 Integrating simulation into Webflow export...');
  
  let htmlContent = fs.readFileSync(webflowIndexPath, 'utf8');
  
  // Add compact sidebar CSS
  const cssInsertPoint = '</head>';
  const cssToInsert = `  <style>${compactCSS}</style>\n${cssInsertPoint}`;
  htmlContent = htmlContent.replace(cssInsertPoint, cssToInsert);
  
  // Add PixiJS for WebGL support
  const pixiScript = '  <script src="https://cdn.jsdelivr.net/npm/pixi.js@7.3.2/dist/pixi.min.js"></script>\n';
  htmlContent = htmlContent.replace('</head>', pixiScript + '</head>');
  
  // Create compact sidebar HTML
  const sidebarHTML = createCompactSidebarHTML();
  
  // Insert sidebar after the ball simulation div
  const ballSimInsertPoint = '<div id="bravia-balls" class="ball-simulation w-embed"><canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas></div>';
  const ballSimWithSidebar = `<div id="bravia-balls" class="ball-simulation w-embed">
    <canvas id="c" aria-label="Bouncy balls" role="img" draggable="false"></canvas>
    ${sidebarHTML}
  </div>`;
  
  htmlContent = htmlContent.replace(ballSimInsertPoint, ballSimWithSidebar);
  
  // Add simulation JavaScript before closing body tag
  const jsInsertPoint = '</body>';
  const jsToInsert = `  <script>
// ═══════════════════════════════════════════════════════════════════════════
// BOUNCY BALLS SIMULATION (Production Build)
// ═══════════════════════════════════════════════════════════════════════════
${simulationCode.jsCode}
  </script>\n${jsInsertPoint}`;
  
  htmlContent = htmlContent.replace(jsInsertPoint, jsToInsert);
  
  return htmlContent;
}

function createCompactSidebarHTML() {
  return `
    <!-- Compact Control Panel -->
    <div class="panel${CONFIG.sidebarVisible ? '' : ' hidden'}" id="controlPanel">
      <div class="panel-header" id="panelHeader">
        <span><span class="drag-handle">⋮⋮</span>Controls</span>
        <span id="minimizePanel" title="Toggle panel (/)">−</span>
      </div>
      
      <!-- WebGL Toggle -->
      <div style="margin-bottom: 6px; padding: 4px; background: rgba(255,165,0,0.15); border-radius: 3px;">
        <label style="display: flex; align-items: center; gap: 4px;">
          <input type="checkbox" id="useWebGLToggle">
          <span>⚡ WebGL</span>
        </label>
        <div id="rendererStatus" style="font-size: 7px; margin-top: 2px; opacity: 0.7;">Canvas2D Active</div>
      </div>
      
      <!-- Global Settings -->
      <details open>
        <summary>🌐 Global</summary>
        <div class="group">
          <label title="Ball size"><span>Size</span><input type="range" id="sizeSliderGlobal" min="0.1" max="6.0" step="0.05" value="0.7"><span class="val" id="sizeValGlobal">0.7</span></label>
          <label title="Size variation"><span>Variation</span><input type="range" id="sizeVariationSliderGlobal" min="0.0" max="1.0" step="0.05" value="0.15"><span class="val" id="sizeVariationValGlobal">0.15</span></label>
          <label title="Ball softness"><span>Softness</span><input type="range" id="ballSoftnessSliderGlobal" min="0" max="100" step="1" value="40"><span class="val" id="ballSoftnessValGlobal">40</span></label>
        </div>
      </details>
      
      <!-- Glass Morphism -->
      <details>
        <summary>🔮 Glass Effects</summary>
        <div class="group">
          <label><span>Enable</span><input type="checkbox" id="glassMorphismEnabled" checked></label>
          <label title="Illumination preset"><span>Template</span><select id="illuminationSelect">
            <option value="classicRaised">Classic Raised</option>
            <option value="pressedInset">Pressed/Inset</option>
            <option value="softGlow">Soft Glow</option>
            <option value="sharpGlass">Sharp Glass</option>
            <option value="dramaticDepth">Dramatic Depth</option>
          </select></label>
        </div>
      </details>
      
      <!-- Colors -->
      <details>
        <summary>🎨 Colors</summary>
        <div class="group">
          <label><span>Template</span><select id="colorSelect"></select></label>
          <label><span>Color 1</span><input type="color" id="color1" value="#b7bcb7"><span class="hex-val" id="color1Val">#B7BCB7</span></label>
          <label><span>Color 2</span><input type="color" id="color2" value="#e4e9e4"><span class="hex-val" id="color2Val">#E4E9E4</span></label>
        </div>
      </details>
      
      <!-- Mode Switcher -->
      <div style="margin: 6px 0;">
        <div class="mode-switcher">
          <button class="mode-button active" data-mode="pit">🎯 Pit</button>
          <button class="mode-button" data-mode="flies">🕊️ Flies</button>
          <button class="mode-button" data-mode="weightless">🌌 Zero-G</button>
        </div>
      </div>
      
      <!-- Physics -->
      <details>
        <summary>⚡ Physics</summary>
        <div class="group">
          <label><span>Max balls</span><input type="range" id="maxBallsSlider" min="50" max="800" step="25" value="350"><span class="val" id="maxBallsVal">350</span></label>
          <label><span>Gravity</span><input type="range" id="gravityPitSlider" min="0.0" max="2.0" step="0.05" value="0.0"><span class="val" id="gravityPitVal">0.0</span></label>
          <label><span>Bounce</span><input type="range" id="restitutionSlider" min="0.00" max="1.00" step="0.01" value="0.88"><span class="val" id="restitutionVal">0.88</span></label>
        </div>
      </details>
      
      <!-- Build Controls -->
      <div style="margin-top: 8px; text-align: center;">
        <button id="saveConfigBtn">💾 Export Config</button>
      </div>
    </div>`;
}

function minifyJavaScript(jsCode) {
  console.log('🗜️ Minifying JavaScript...');
  
  // Basic minification (remove comments and extra whitespace)
  return jsCode
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/;\s*}/g, ';}') // Clean up semicolons
    .replace(/{\s*/g, '{') // Clean up braces
    .replace(/}\s*/g, '}')
    .replace(/,\s*/g, ',') // Clean up commas
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILD PROCESS
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    console.log('📋 Build Configuration:');
    console.log(`   Webflow Source: ${CONFIG.webflowSource}`);
    console.log(`   Public Destination: ${CONFIG.publicDestination}`);
    console.log(`   Sidebar Visible: ${CONFIG.sidebarVisible}`);
    console.log(`   Compact Sidebar: ${CONFIG.compactSidebar}`);
    console.log('');
    
    // Step 1: Backup existing public folder
    if (CONFIG.backupExisting && fs.existsSync(CONFIG.publicDestination)) {
      const backupPath = `${CONFIG.publicDestination}-backup-${Date.now()}`;
      console.log(`📦 Backing up existing public folder to: ${backupPath}`);
      fs.renameSync(CONFIG.publicDestination, backupPath);
    }
    
    // Step 2: Copy Webflow export to public folder
    console.log('📁 Copying Webflow export to public folder...');
    if (!copyDirectory(CONFIG.webflowSource, CONFIG.publicDestination)) {
      throw new Error('Failed to copy Webflow export');
    }
    
    // Step 3: Extract simulation code
    const simulationCode = extractSimulationCode(CONFIG.sourceFile);
    console.log(`✅ Extracted ${simulationCode.jsCode.length} chars of JavaScript`);
    console.log(`✅ Extracted ${simulationCode.cssCode.length} chars of CSS`);
    
    // Step 4: Create compact sidebar CSS
    const compactCSS = createCompactSidebarCSS();
    
    // Step 5: Integrate simulation into Webflow HTML
    const webflowIndexPath = path.join(CONFIG.publicDestination, 'index.html');
    const integratedHTML = integrateSimulation(webflowIndexPath, simulationCode, compactCSS);
    
    // Step 6: Write integrated HTML
    fs.writeFileSync(webflowIndexPath, integratedHTML);
    console.log('✅ Integrated simulation into Webflow HTML');
    
    // Step 7: Create minified JavaScript file
    const minifiedJS = minifyJavaScript(simulationCode.jsCode);
    const jsOutputPath = path.join(CONFIG.publicDestination, 'js', 'bouncy-balls-embed.js');
    
    // Ensure js directory exists
    const jsDir = path.dirname(jsOutputPath);
    if (!fs.existsSync(jsDir)) {
      fs.mkdirSync(jsDir, { recursive: true });
    }
    
    fs.writeFileSync(jsOutputPath, minifiedJS);
    console.log(`✅ Created minified JavaScript: ${jsOutputPath}`);
    console.log(`📊 Size reduction: ${simulationCode.jsCode.length} → ${minifiedJS.length} chars (${Math.round((1 - minifiedJS.length / simulationCode.jsCode.length) * 100)}% smaller)`);
    
    // Step 8: Create CSS file
    const cssOutputPath = path.join(CONFIG.publicDestination, 'css', 'bouncy-balls.css');
    const fullCSS = simulationCode.cssCode + compactCSS;
    fs.writeFileSync(cssOutputPath, fullCSS);
    console.log(`✅ Created CSS file: ${cssOutputPath}`);
    
    // Step 9: Create build info
    const buildInfo = {
      buildTime: new Date().toISOString(),
      webflowSource: CONFIG.webflowSource,
      sourceFile: CONFIG.sourceFile,
      sidebarVisible: CONFIG.sidebarVisible,
      compactSidebar: CONFIG.compactSidebar,
      jsSize: minifiedJS.length,
      cssSize: fullCSS.length,
      version: '1.0.0'
    };
    
    fs.writeFileSync(
      path.join(CONFIG.publicDestination, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );
    
    console.log('');
    console.log('🎉 BUILD COMPLETE!');
    console.log('');
    console.log('📊 Build Summary:');
    console.log(`   ✅ Webflow export copied successfully`);
    console.log(`   ✅ Simulation integrated with compact sidebar`);
    console.log(`   ✅ JavaScript minified (${Math.round((1 - minifiedJS.length / simulationCode.jsCode.length) * 100)}% reduction)`);
    console.log(`   ✅ CSS optimized and combined`);
    console.log(`   ✅ WebGL support included`);
    console.log(`   ✅ All 5 illumination templates available`);
    console.log(`   ✅ Full configuration export/import`);
    console.log('');
    console.log('🚀 Ready to deploy from public/ folder!');
    console.log('');
    console.log('📝 To rebuild: npm run build');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
buildProduction();
