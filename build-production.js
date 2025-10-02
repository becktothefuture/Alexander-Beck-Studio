#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SIMPLE PRODUCTION BUILD PIPELINE                         ║
// ║                                                                              ║
// ║  1. Copy entire webflow-export/ to public/                                  ║
// ║  2. Replace simulation placeholder in public/index.html                     ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  webflowSource: './webflow-export',
  publicDestination: './public',
  sourceFile: './source/balls-source.html',
  configFile: './source/current-config.json',
  panelVisibleInProduction: false
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Recursively copy directory
// ═══════════════════════════════════════════════════════════════════════════════

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const items = fs.readdirSync(src);
  
  for (const item of items) {
    const srcPath = path.join(src, item);
    const destPath = path.join(dest, item);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT SIMULATION CONTAINER
// ═══════════════════════════════════════════════════════════════════════════════

function extractSimulationContainer(sourceHTML) {
  // Extract everything from <div id="bravia-balls"> to its closing </div>
  const startMatch = sourceHTML.match(/<div[^>]*id=["']bravia-balls["'][^>]*>/);
  if (!startMatch) {
    throw new Error('Could not find #bravia-balls container in source');
  }
  
  const startIndex = startMatch.index;
  const startTag = startMatch[0];
  
  // Find matching closing </div>
  let depth = 1;
  let i = startIndex + startTag.length;
  
  while (i < sourceHTML.length && depth > 0) {
    if (sourceHTML.substr(i, 5) === '<div ') {
      depth++;
      i += 5;
    } else if (sourceHTML.substr(i, 6) === '</div>') {
      depth--;
      if (depth === 0) {
        const containerHTML = sourceHTML.substring(startIndex, i + 6);
        
        // Remove FPS counter
        return containerHTML.replace(/<div[^>]*id=["']fps-counter["'][^>]*>[\s\S]*?<\/div>/g, '');
      }
      i += 6;
    } else {
      i++;
    }
  }
  
  throw new Error('Could not find closing tag for #bravia-balls container');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT CSS
// ═══════════════════════════════════════════════════════════════════════════════

function extractCSS(sourceHTML) {
  const styleMatch = sourceHTML.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) {
    throw new Error('Could not find <style> tag in source');
  }
  
  let css = styleMatch[1].trim();
  
  // Add production overrides for z-index, pointer-events, and overflow
  css += `\n\n/* Production overrides */\nhtml, body { overflow: hidden; margin: 0; padding: 0; }\n#bravia-balls { z-index: 2147483647 !important; isolation: isolate !important; pointer-events: auto !important; touch-action: auto !important; }\n#bravia-balls canvas { pointer-events: auto !important; touch-action: auto !important; will-change: transform; transform: translateZ(0); }\n#bravia-balls.mode-pit { height: 100dvh !important; }\n#bravia-balls.mode-pit canvas { height: 150vh !important; }\n#fps-counter { display: none !important; }\n`;
  
  return css;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACT JAVASCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

function extractJavaScript(sourceHTML) {
  const scriptMatch = sourceHTML.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Could not find <script> tag in source');
  }
  
  let js = scriptMatch[1].trim();
  
  // Hide panel in production
  js = js.replace(/const PANEL_INITIALLY_VISIBLE\s*=\s*true;/g, 'const PANEL_INITIALLY_VISIBLE = false;');
  
  return js;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HARDCODE CONFIG VALUES
// ═══════════════════════════════════════════════════════════════════════════════

function hardcodeConfig(jsCode, config) {
  const configMap = {
    'gravityMultiplierPit': 'gravityMultiplier',
    'gravityMultiplierFlies': 'gravityMultiplier',
    'restitution': 'restitution',
    'friction': 'friction',
    'ballMassKg': 'ballMass',
    'emit_rate': 'emitRate',
    'maxBalls': 'maxBalls',
    'sizeScale': 'ballScale',
    'sizeVariation': 'ballVariation',
    'repelRadius': 'repelRadius',
    'repelPower': 'repelPower',
    'repelSoft': 'repelSoftness',
    'trailFadeRate': 'trailFade',
    'trailAlphaScale': 'trailSubtlety',
    'cursorBallIndex': 'cursorColorIndex',
    'performanceModeActive': 'performanceMode',
    'TARGET_FPS': 'targetFPS',
    'enableLOD': 'enableLOD',
    'vortexSpeedColorEnabled': 'vortexSpeedColorEnabled'
  };
  
  let updatedJS = jsCode;
  let replacementCount = 0;
  
  for (const [varName, configKey] of Object.entries(configMap)) {
    if (config[configKey] !== undefined) {
      const value = config[configKey];
      
      // Match variable declarations: let/const varName = value;
      const regex = new RegExp(`(let|const)\\s+${varName}\\s*=\\s*[^;]+;`, 'g');
      
      if (regex.test(updatedJS)) {
        const replacement = typeof value === 'string' 
          ? `$1 ${varName} = "${value}";`
          : `$1 ${varName} = ${value};`;
        
        updatedJS = updatedJS.replace(regex, replacement);
        replacementCount++;
      }
    }
  }
  
  console.log(`✅ Hardcoded ${replacementCount} config values`);
  return updatedJS;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINIFY JAVASCRIPT
// ═══════════════════════════════════════════════════════════════════════════════

async function minifyJavaScript(jsCode) {
  const result = await terserMinify(jsCode, {
    compress: {
      passes: 3,
      dead_code: true,
      drop_console: false,
      drop_debugger: true,
      pure_funcs: ['console.log'],
      unsafe: true,
      unsafe_math: true,
      unsafe_methods: true
    },
    mangle: {
      toplevel: true,
      safari10: true
    },
    format: {
      comments: false,
      preamble: `/* Alexander Beck Studio - Bouncy Balls Simulation | Built ${new Date().toISOString()} */`
    }
  });
  
  if (result.error) {
    throw new Error(`Terser minification failed: ${result.error}`);
  }
  
  return result.code;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPLACE PLACEHOLDER IN PUBLIC/INDEX.HTML
// ═══════════════════════════════════════════════════════════════════════════════

function replaceSimulationPlaceholder(publicIndexPath, containerHTML, cssCode, jsCode) {
  let html = fs.readFileSync(publicIndexPath, 'utf-8');
  
  // Find the placeholder: <div id="bravia-balls" class="ball-simulation w-embed"><canvas ...></canvas></div>
  const placeholderRegex = /<div[^>]*id=["']bravia-balls["'][^>]*>[\s\S]*?<\/div>/;
  
  if (!placeholderRegex.test(html)) {
    console.warn('⚠️  Could not find placeholder, appending to body');
    html = html.replace('</body>', `${containerHTML}\n</body>`);
  } else {
    html = html.replace(placeholderRegex, containerHTML);
    console.log('✅ Replaced simulation placeholder');
  }
  
  // Inject CSS into <head>
  const cssTag = `<style id="bravia-balls-css">${cssCode}</style>`;
  html = html.replace('</head>', `${cssTag}\n</head>`);
  console.log('✅ Injected CSS into <head>');
  
  // Inject JS before </body>
  const jsTag = `<script id="bravia-balls-js">${jsCode}</script>`;
  html = html.replace('</body>', `${jsTag}\n</body>`);
  console.log('✅ Injected JavaScript before </body>');
  
  // Write back
  fs.writeFileSync(publicIndexPath, html);
  console.log('✅ Wrote updated public/index.html');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    console.log('\n🏗️  SIMPLE BUILD PIPELINE STARTING...\n');
    
    // STEP 1: Clean and copy webflow-export to public
    console.log('📁 Step 1: Copying webflow-export/ to public/...');
    
    if (fs.existsSync(CONFIG.publicDestination)) {
      fs.rmSync(CONFIG.publicDestination, { recursive: true, force: true });
      console.log('   Cleaned existing public/ folder');
    }
    
    copyDir(CONFIG.webflowSource, CONFIG.publicDestination);
    console.log('✅ Webflow design copied to public/\n');
    
    // STEP 2: Extract simulation components
    console.log('📦 Step 2: Extracting simulation from source...');
    const sourceHTML = fs.readFileSync(CONFIG.sourceFile, 'utf-8');
    const config = JSON.parse(fs.readFileSync(CONFIG.configFile, 'utf-8'));
    
    const containerHTML = extractSimulationContainer(sourceHTML);
    const cssCode = extractCSS(sourceHTML);
    let jsCode = extractJavaScript(sourceHTML);
    
    console.log('✅ Extracted simulation components\n');
    
    // STEP 3: Hardcode config
    console.log('⚙️  Step 3: Hardcoding config values...');
    jsCode = hardcodeConfig(jsCode, config);
    console.log('');
    
    // STEP 4: Minify JavaScript
    console.log('🗜️  Step 4: Minifying JavaScript...');
    console.log(`   Before: ${(jsCode.length / 1024).toFixed(1)}KB`);
    const jsMinified = await minifyJavaScript(jsCode);
    console.log(`   After: ${(jsMinified.length / 1024).toFixed(1)}KB`);
    console.log(`   Reduction: ${Math.round((1 - jsMinified.length / jsCode.length) * 100)}%`);
    console.log('');
    
    // STEP 5: Replace placeholder in public/index.html
    console.log('🔄 Step 5: Integrating simulation into public/index.html...');
    const publicIndexPath = path.join(CONFIG.publicDestination, 'index.html');
    replaceSimulationPlaceholder(publicIndexPath, containerHTML, cssCode, jsMinified);
    console.log('');
    
    // STEP 6: Create standalone files
    console.log('📄 Step 6: Creating standalone files...');
    const jsDir = path.join(CONFIG.publicDestination, 'js');
    const cssDir = path.join(CONFIG.publicDestination, 'css');
    
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    
    fs.writeFileSync(path.join(jsDir, 'bouncy-balls-embed.js'), jsMinified);
    fs.writeFileSync(path.join(cssDir, 'bouncy-balls.css'), cssCode);
    console.log('✅ Created js/bouncy-balls-embed.js');
    console.log('✅ Created css/bouncy-balls.css');
    console.log('');
    
    // Success!
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 BUILD COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   ✅ Webflow design preserved in public/`);
    console.log(`   ✅ Simulation placeholder replaced`);
    console.log(`   ✅ CSS: ${(cssCode.length / 1024).toFixed(1)}KB`);
    console.log(`   ✅ JS: ${(jsMinified.length / 1024).toFixed(1)}KB (minified)`);
    console.log(`   ✅ Panel hidden by default (toggle with /)`);
    console.log(`   ✅ Mouse events enabled`);
    console.log('');
    console.log('🚀 Ready to deploy from public/ folder!');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ BUILD FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the build
buildProduction();
