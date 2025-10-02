#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         PRODUCTION BUILD SYSTEM V2                          ║
// ║        Extract complete simulation from source + Hardcode config            ║
// ║        Merge into Webflow export + Minify everything                        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const { minify: terserMinify } = require('terser');

console.log('🚀 Starting Production Build V2...\n');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  webflowSource: './webflow-export',
  publicDestination: './public',
  sourceFile: './source/balls-source.html',
  configFile: './source/current-config.json',
  backupExisting: true,
  panelVisibleInProduction: false, // Hide panel by default in production
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
    }
  }
  
  return true;
}

/**
 * Extract complete simulation container HTML from balls-source.html
 * This includes the #bravia-balls div with all its contents
 */
function extractSimulationContainer(sourceFile) {
  console.log('🔍 Extracting complete simulation container from source...');
  
  const content = fs.readFileSync(sourceFile, 'utf8');
  
  // Extract the entire #bravia-balls container with all nested HTML
  // Pattern: <div id="bravia-balls"> ... </div> (before </script>)
  const containerMatch = content.match(/<div id="bravia-balls"[^>]*>([\s\S]*?)<\/div>\s*(?=<\/script>|<script)/);
  if (!containerMatch) {
    throw new Error('Could not find #bravia-balls container in source file');
  }
  
  let containerHTML = `<div id="bravia-balls">${containerMatch[1]}</div>`;
  
  // Remove FPS counter for production build
  containerHTML = containerHTML.replace(
    /<div id="fps-counter"[^>]*>[\s\S]*?<\/div>/,
    '<!-- FPS counter removed in production -->'
  );
  console.log('✅ Removed FPS counter for production build');
  
  console.log(`✅ Extracted ${containerHTML.length} chars of HTML container`);
  
  return containerHTML;
}

/**
 * Extract CSS from balls-source.html
 */
function extractCSS(sourceFile) {
  console.log('🎨 Extracting CSS from source...');
  
  const content = fs.readFileSync(sourceFile, 'utf8');
  
  const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/);
  if (!styleMatch) {
    throw new Error('Could not find <style> section in source file');
  }
  
  let cssCode = styleMatch[1];
  
  // Add production-specific CSS overrides at the end to ensure they take precedence
  cssCode += `
  
  /* Production Build Overrides V2.1 - Maximum Compatibility & Performance */
  
  /* INTERACTION LAYER - Highest Priority Z-Index Stack */
  html body #bravia-balls,
  html body #bravia-balls canvas,
  html body div.ball-simulation#bravia-balls {
    /* Ensure simulation is ALWAYS on top (max possible z-index) */
    z-index: 2147483647 !important;
    isolation: isolate !important; /* Create new stacking context */
    
    /* Enable all pointer/touch events */
    pointer-events: auto !important;
    touch-action: auto !important;
    
    /* Visual feedback */
    cursor: default !important;
    
    /* GPU acceleration for smooth rendering */
    will-change: transform !important;
    transform: translateZ(0) !important;
    
    /* Ensure positioning */
    position: fixed !important;
  }
  
  /* Ensure ALL nested elements can receive events */
  #bravia-balls *,
  #bravia-balls canvas,
  #bravia-balls #controlPanel,
  #bravia-balls #controlPanel * {
    pointer-events: auto !important;
  }
  
  /* Override Webflow utility classes with high specificity */
  .w-embed.ball-simulation,
  .ball-simulation.w-embed,
  div[id="bravia-balls"].ball-simulation {
    pointer-events: auto !important;
    touch-action: auto !important;
    z-index: 2147483647 !important;
  }
  
  /* Mobile viewport fixes */
  @media (max-width: 768px) {
    #bravia-balls {
      height: 100dvh !important; /* Dynamic viewport height for mobile address bars */
      min-height: -webkit-fill-available !important;
    }
  }
  
  /* Hide FPS counter completely in production */
  #fps-counter,
  #bravia-balls #fps-counter {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  
  /* Prevent Webflow animations from affecting simulation */
  #bravia-balls,
  #bravia-balls * {
    animation: none !important;
    transition: none !important;
  }
  
  /* Restore only the dark mode transition */
  #bravia-balls {
    transition: background-color 0.3s ease !important;
  }
`;
  
  console.log(`✅ Extracted ${cssCode.length} chars of CSS (with production overrides)`);
  
  return cssCode;
}

/**
 * Extract JavaScript from balls-source.html
 */
function extractJavaScript(sourceFile) {
  console.log('🔧 Extracting JavaScript from source...');
  
  const content = fs.readFileSync(sourceFile, 'utf8');
  
  const scriptMatch = content.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Could not find <script> section in source file');
  }
  
  let jsCode = scriptMatch[1];
  console.log(`✅ Extracted ${jsCode.length} chars of JavaScript`);
  
  return jsCode;
}

/**
 * Load configuration from current-config.json
 */
function loadConfig(configFile) {
  console.log('📋 Loading configuration from current-config.json...');
  
  if (!fs.existsSync(configFile)) {
    console.warn('⚠️  Config file not found, using defaults');
    return {};
  }
  
  const configContent = fs.readFileSync(configFile, 'utf8');
  const config = JSON.parse(configContent);
  
  // Filter out comment keys
  const cleanConfig = {};
  for (const key in config) {
    if (!key.startsWith('_comment')) {
      cleanConfig[key] = config[key];
    }
  }
  
  console.log(`✅ Loaded configuration with ${Object.keys(cleanConfig).length} parameters`);
  return cleanConfig;
}

/**
 * Hardcode config values into JavaScript
 * Replaces default variable declarations with config values
 */
function hardcodeConfigIntoJS(jsCode, config) {
  console.log('💉 Hardcoding configuration values into JavaScript...');
  
  let updatedJS = jsCode;
  let replacementCount = 0;
  
  // Map config keys to JavaScript variable names and their patterns
  const configMap = {
    'gravityMultiplier': { pattern: /let gravityMultiplierPit = [\d.]+;/, value: config.gravityMultiplier },
    'restitution': { pattern: /let REST = [\d.]+;/, value: config.restitution },
    'friction': { pattern: /let FRICTION = [\d.]+;/, value: config.friction },
    'ballMass': { pattern: /let ballMassKg = [\d.]+;/, value: config.ballMass },
    'emitRate': { pattern: /let EMIT_INTERVAL = [\d.]+;/, value: config.emitRate },
    'maxBalls': { pattern: /let MAX_BALLS = \d+;/, value: config.maxBalls },
    'ballScale': { pattern: /let sizeScale = [\d.]+;/, value: config.ballScale },
    'ballVariation': { pattern: /let sizeVariation = [\d.]+;/, value: config.ballVariation },
    'repelRadius': { pattern: /let repelRadius = \d+;/, value: config.repelRadius },
    'repelPower': { pattern: /let repelPower = \d+;/, value: config.repelPower },
    'repelSoftness': { pattern: /let repelSoft = [\d.]+;/, value: config.repelSoftness },
    'trailFade': { pattern: /let trailFadeRate = [\d.]+;/, value: config.trailFade },
    'trailSubtlety': { pattern: /let trailSubtlety = [\d.]+;/, value: config.trailSubtlety },
    'cursorColorIndex': { pattern: /let cursorBallIndex = \d+;/, value: config.cursorColorIndex },
    'vortexSpeedColorEnabled': { pattern: /let vortexSpeedColorEnabled = (true|false);/, value: config.vortexSpeedColorEnabled },
  };
  
  for (const [configKey, mapping] of Object.entries(configMap)) {
    if (config[configKey] !== undefined && mapping.pattern) {
      const varMatch = mapping.pattern.source.match(/let (\w+) =/);
      if (varMatch) {
        const varName = varMatch[1];
        const newDeclaration = `let ${varName} = ${mapping.value};`;
        
        if (mapping.pattern.test(updatedJS)) {
          updatedJS = updatedJS.replace(mapping.pattern, newDeclaration);
          replacementCount++;
          console.log(`   ✓ ${varName} = ${mapping.value}`);
        }
      }
    }
  }
  
  // Hide panel by default in production
  if (CONFIG.panelVisibleInProduction === false) {
    updatedJS = updatedJS.replace(
      /const PANEL_INITIALLY_VISIBLE = true;/,
      'const PANEL_INITIALLY_VISIBLE = false;'
    );
    console.log('   ✓ PANEL_INITIALLY_VISIBLE = false');
    replacementCount++;
  }
  
  console.log(`✅ Hardcoded ${replacementCount} configuration values`);
  return updatedJS;
}

/**
 * Minify JavaScript using Terser
 */
async function minifyJavaScript(jsCode) {
  console.log('🗜️  Minifying JavaScript with Terser...');
  
  const terserOptions = {
    compress: {
      passes: 3,
      drop_console: false,
      dead_code: true,
      unused: true,
      join_vars: true,
      collapse_vars: true,
      reduce_vars: true,
      if_return: true,
      sequences: true,
      properties: true,
      comparisons: true,
      booleans: true,
      loops: true,
      hoist_funs: true,
      hoist_vars: false
    },
    mangle: {
      toplevel: false,
      reserved: ['MODES', 'Ball', 'frame', 'PIXI']
    },
    format: {
      comments: false,
      beautify: false,
      preamble: '// Bouncy Balls Simulation - Minified'
    }
  };
  
  try {
    const result = await terserMinify(jsCode, terserOptions);
    if (!result || !result.code) {
      throw new Error('Terser returned empty output');
    }
    const reduction = Math.round((1 - result.code.length / jsCode.length) * 100);
    console.log(`✅ Minified: ${jsCode.length} → ${result.code.length} chars (${reduction}% reduction)`);
    return result.code;
  } catch (error) {
    console.error('❌ Terser failed:', error.message);
    console.warn('⚠️  Using unminified code');
    return jsCode;
  }
}

/**
 * Validate build output to catch issues before deployment
 */
function validateBuild(htmlContent, cssCode, jsCode) {
  console.log('🔍 Validating build output...');
  
  const issues = [];
  const warnings = [];
  
  // Critical HTML checks
  if (!htmlContent.includes('id="bravia-balls"')) {
    issues.push('❌ Simulation container not found in HTML');
  }
  if (!htmlContent.includes('<canvas id="c"')) {
    issues.push('❌ Canvas element missing');
  }
  if (!htmlContent.includes('Alexander Beck Studio')) {
    issues.push('❌ Webflow content missing - page design not preserved');
  }
  if (!htmlContent.includes('</html>')) {
    issues.push('❌ HTML structure incomplete');
  }
  
  // CSS validation
  if (!cssCode.includes('pointer-events: auto !important')) {
    warnings.push('⚠️  Mouse interaction CSS missing');
  }
  if (!cssCode.includes('z-index: 2147483647')) {
    warnings.push('⚠️  Max z-index override missing');
  }
  if (!cssCode.includes('isolation: isolate')) {
    warnings.push('⚠️  Stacking context isolation missing');
  }
  
  // JavaScript validation
  if (jsCode.length < 10000) {
    issues.push('❌ JavaScript suspiciously small - may be corrupted');
  }
  if (!jsCode.includes('MODES')) {
    issues.push('❌ Core simulation code (MODES) missing');
  }
  if (!jsCode.includes('Ball')) {
    issues.push('❌ Ball class missing from JavaScript');
  }
  if (!jsCode.includes('requestAnimationFrame')) {
    issues.push('❌ Animation loop missing');
  }
  
  // Report issues
  if (issues.length > 0) {
    console.error('\\n❌ BUILD VALIDATION FAILED:\\n');
    issues.forEach(issue => console.error(`   ${issue}`));
    return false;
  }
  
  // Report warnings
  if (warnings.length > 0) {
    console.warn('\\n⚠️  BUILD WARNINGS:\\n');
    warnings.forEach(warning => console.warn(`   ${warning}`));
  }
  
  // Success
  console.log('✅ Build validation passed!');
  console.log(`   HTML: ${htmlContent.length} chars`);
  console.log(`   CSS: ${cssCode.length} chars`);
  console.log(`   JS: ${jsCode.length} chars`);
  
  return true;
}

/**
 * Integrate simulation into Webflow export
 * Replaces the placeholder element with the complete simulation container
 * @param {string} webflowIndexPath - Path to Webflow export index.html (NOT the output!)
 */
function integrateIntoWebflow(webflowIndexPath, containerHTML, cssCode, jsCode) {
  console.log('🔧 Integrating simulation into Webflow export...');
  
  // CRITICAL SAFEGUARD: Ensure we're reading from webflow-export, not public
  if (webflowIndexPath.includes('/public/')) {
    throw new Error('❌ CRITICAL ERROR: Attempting to read from public/ (output) instead of webflow-export/ (source)! This would destroy the Webflow design!');
  }
  
  if (!fs.existsSync(webflowIndexPath)) {
    throw new Error(`❌ Webflow export not found at: ${webflowIndexPath}`);
  }
  
  let htmlContent = fs.readFileSync(webflowIndexPath, 'utf8');
  
  // Find and replace the Webflow placeholder
  // It looks like: <div id="bravia-balls" class="ball-simulation w-embed"><canvas id="c" ...></canvas></div>
  const placeholderPattern = /<div id="bravia-balls" class="ball-simulation w-embed">(?:<canvas[^>]*><\/canvas>)?<\/div>/;
  
  if (placeholderPattern.test(htmlContent)) {
    // Replace placeholder with complete container
    htmlContent = htmlContent.replace(placeholderPattern, containerHTML);
    console.log('✅ Replaced Webflow placeholder with simulation container');
  } else {
    console.warn('⚠️  Could not find Webflow placeholder, appending to body');
    // Fallback: append before </body>
    htmlContent = htmlContent.replace('</body>', `${containerHTML}\n</body>`);
  }
  
  // Inject CSS into <head>
  const cssToInject = `  <style>\n${cssCode}\n  </style>\n</head>`;
  htmlContent = htmlContent.replace('</head>', cssToInject);
  console.log('✅ Injected CSS into <head>');
  
  // Inject JavaScript before </body>
  const jsToInject = `  <script>\n${jsCode}\n  </script>\n</body>`;
  htmlContent = htmlContent.replace('</body>', jsToInject);
  console.log('✅ Injected JavaScript before </body>');
  
  return htmlContent;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILD PROCESS
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    console.log('📋 Build Configuration:');
    console.log(`   Source File: ${CONFIG.sourceFile}`);
    console.log(`   Config File: ${CONFIG.configFile}`);
    console.log(`   Webflow Source: ${CONFIG.webflowSource}`);
    console.log(`   Destination: ${CONFIG.publicDestination}`);
    console.log(`   Panel Visible: ${CONFIG.panelVisibleInProduction}`);
    console.log('');
    
    // Step 1: Backup existing public folder
    if (CONFIG.backupExisting && fs.existsSync(CONFIG.publicDestination)) {
      const backupPath = `${CONFIG.publicDestination}-backup-${Date.now()}`;
      console.log(`📦 Backing up public folder to: ${backupPath}`);
      fs.renameSync(CONFIG.publicDestination, backupPath);
    }
    
    // Step 2: Copy Webflow export to public folder
    console.log('📁 Copying Webflow export to public...');
    if (!copyDirectory(CONFIG.webflowSource, CONFIG.publicDestination)) {
      throw new Error('Failed to copy Webflow export');
    }
    console.log('✅ Webflow export copied');
    console.log('');
    
    // Step 3: Load configuration
    const config = loadConfig(CONFIG.configFile);
    console.log('');
    
    // Step 4: Extract simulation components
    const containerHTML = extractSimulationContainer(CONFIG.sourceFile);
    const cssCode = extractCSS(CONFIG.sourceFile);
    let jsCode = extractJavaScript(CONFIG.sourceFile);
    console.log('');
    
    // Step 5: Hardcode config values into JavaScript
    jsCode = hardcodeConfigIntoJS(jsCode, config);
    console.log('');
    
    // Step 6: Minify JavaScript
    const minifiedJS = await minifyJavaScript(jsCode);
    console.log('');
    
    // Step 7: Integrate into Webflow HTML
    // CRITICAL: Use webflowSource (not publicDestination) to get the original Webflow export
    const webflowIndexPath = path.join(CONFIG.webflowSource, 'index.html');
    const integratedHTML = integrateIntoWebflow(
      webflowIndexPath,
      containerHTML,
      cssCode,
      minifiedJS
    );
    console.log('');
    
    // Step 7.5: Validate build BEFORE writing
    if (!validateBuild(integratedHTML, cssCode, minifiedJS)) {
      throw new Error('Build validation failed - aborting to prevent corrupted deployment');
    }
    console.log('');
    
    // Step 8: Write integrated HTML
    fs.writeFileSync(webflowIndexPath, integratedHTML);
    console.log('✅ Wrote integrated HTML to public/index.html');
    console.log('');
    
    // Step 9: Create standalone files for reference
    const jsDir = path.join(CONFIG.publicDestination, 'js');
    const cssDir = path.join(CONFIG.publicDestination, 'css');
    
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    
    fs.writeFileSync(path.join(jsDir, 'bouncy-balls-embed.js'), minifiedJS);
    fs.writeFileSync(path.join(cssDir, 'bouncy-balls.css'), cssCode);
    console.log('✅ Created standalone CSS and JS files');
    
    // Step 10: Create build info
    const buildInfo = {
      buildTime: new Date().toISOString(),
      sourceFile: CONFIG.sourceFile,
      configFile: CONFIG.configFile,
      webflowSource: CONFIG.webflowSource,
      panelVisible: CONFIG.panelVisibleInProduction,
      jsSize: minifiedJS.length,
      cssSize: cssCode.length,
      htmlSize: containerHTML.length,
      configApplied: Object.keys(config).length,
      version: '2.0.0'
    };
    
    fs.writeFileSync(
      path.join(CONFIG.publicDestination, 'build-info.json'),
      JSON.stringify(buildInfo, null, 2)
    );
    
    console.log('');
    console.log('🎉 BUILD COMPLETE!');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Build Summary:');
    console.log(`   ✅ Complete simulation container extracted`);
    console.log(`   ✅ ${Object.keys(config).length} config values hardcoded`);
    console.log(`   ✅ CSS: ${(cssCode.length / 1024).toFixed(1)}KB`);
    console.log(`   ✅ JS: ${(minifiedJS.length / 1024).toFixed(1)}KB (${Math.round((1 - minifiedJS.length / jsCode.length) * 100)}% reduction)`);
    console.log(`   ✅ HTML: ${(containerHTML.length / 1024).toFixed(1)}KB`);
    console.log(`   ✅ Integrated into Webflow export`);
    console.log(`   ✅ Panel ${CONFIG.panelVisibleInProduction ? 'visible' : 'hidden'} by default (toggle with /)`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('🚀 Ready to deploy from public/ folder!');
    console.log('');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the build
buildProduction();

