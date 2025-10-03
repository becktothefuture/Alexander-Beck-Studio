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

console.log('\n🏗️  SIMPLE BUILD PIPELINE STARTING...\n');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

function validateConfigConsistency(sourceHTML, config) {
  const issues = [];
  
  // Extract JS default value
  const jsMatch = sourceHTML.match(/let sizeScale = ([\d.]+)/);
  const jsSize = jsMatch ? parseFloat(jsMatch[1]) : null;
  
  // Extract HTML slider default
  const sliderMatch = sourceHTML.match(/id="sizeSliderGlobal"[^>]*value="([\d.]+)"/);
  const sliderSize = sliderMatch ? parseFloat(sliderMatch[1]) : null;
  
  // Config value
  const configSize = config.ballScale ? parseFloat(config.ballScale) : null;
  
  // Validate consistency
  if (jsSize && configSize && jsSize !== configSize) {
    issues.push(`❌ Ball size mismatch: JS=${jsSize}, Config=${configSize}`);
  }
  
  if (sliderSize && configSize && sliderSize !== configSize) {
    issues.push(`⚠️  Slider shows ${sliderSize}, but config is ${configSize}`);
  }
  
  // Check physics presets
  const presetMatches = [...sourceHTML.matchAll(/sizeScale:\s*([\d.]+)/g)];
  const presetSizes = presetMatches.map(m => parseFloat(m[1]));
  const nonStandardSizes = presetSizes.filter(s => s !== configSize);
  
  if (nonStandardSizes.length > 0) {
    const uniqueSizes = [...new Set(nonStandardSizes)];
    if (uniqueSizes.some(s => s !== configSize)) {
      issues.push(`ℹ️  Some presets override ball size: ${uniqueSizes.join(', ')}`);
    }
  }
  
  return issues;
}

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
  
  // Add production overrides for z-index, pointer-events, overflow, and dark mode
  // KEY STRATEGY: Simulation is background layer, Webflow is foreground overlay
  // - Simulation: z-index: 0, pointer-events: auto (receives all mouse events)
  // - Webflow viewport: z-index: 10, pointer-events: none (transparent to clicks)
  // - Interactive elements (links, buttons): pointer-events: auto (explicitly clickable)
  // - Debug panel: z-index: 9999 (always on top)
  css += `\n\n/* Production overrides */\nhtml, body { overflow: hidden; margin: 0; padding: 0; }\n#bravia-balls { position: fixed; bottom: 0; left: 0; width: 100%; height: 100svh; z-index: 0 !important; isolation: isolate !important; pointer-events: auto !important; }\n#bravia-balls canvas { pointer-events: auto !important; touch-action: auto !important; will-change: transform; transform: translateZ(0); height: 100svh !important; }\n#bravia-balls .panel { z-index: 9999 !important; pointer-events: auto !important; position: fixed !important; }\n#bravia-balls .panel * { pointer-events: auto !important; }\n#fps-counter { display: none !important; }\n.viewport { position: relative; z-index: 10 !important; pointer-events: none !important; }\n.viewport a, .viewport button, .viewport input, .viewport select, .viewport textarea { pointer-events: auto !important; }\n.footer_link, .footer_icon-link, .corner { pointer-events: auto !important; }\n\n/* Dark mode: Change Webflow text colors to off-white */\nbody.dark-mode .viewport { color: #f5f5f5 !important; }\nbody.dark-mode .viewport .legend__item { color: #f5f5f5 !important; }\nbody.dark-mode .viewport .header { color: #f5f5f5 !important; }\nbody.dark-mode .viewport .hero__text svg path[fill="#161616"] { fill: #f5f5f5 !important; }\nbody.dark-mode .viewport .hero__text svg ellipse[stroke="black"] { stroke: #f5f5f5 !important; }\nbody.dark-mode .viewport .hero__text svg path[fill="black"] { fill: #f5f5f5 !important; }\nbody.dark-mode .footer_link { color: #f5f5f5 !important; }\nbody.dark-mode .footer_icon-link { color: #f5f5f5 !important; }\nbody.dark-mode .caption { color: #f5f5f5 !important; }\n\n/* Dark mode: Corner SVGs become solid black */\nbody.dark-mode .corner svg path { fill: #000000 !important; }\nbody.dark-mode .corner svg * { fill: #000000 !important; stroke: #000000 !important; }\n`;
  
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
  const applied = [];
  const skipped = [];
  
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
        applied.push(`${configKey} → ${varName}`);
      } else {
        skipped.push(varName);
      }
    }
  }
  
  return { code: updatedJS, applied, skipped };
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
  
  // Normalize Webflow header: ensure only one header.viewport matches strict selector
  html = html.replace(/<header class="viewport viewport--corners"/g, '<header class="viewport--corners"');
  // Write back
  fs.writeFileSync(publicIndexPath, html);
  console.log('✅ Wrote updated public/index.html');
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    const useModules = process.argv.includes('--modules');
    console.log(`\n🏗️  BUILD PIPELINE STARTING... (modules=${useModules})\n`);
    
    // STEP 1: Clean and copy webflow-export to public
    console.log('📁 Step 1: Copying webflow-export/ to public/...');
    
    if (fs.existsSync(CONFIG.publicDestination)) {
      fs.rmSync(CONFIG.publicDestination, { recursive: true, force: true });
      console.log('   Cleaned existing public/ folder');
    }
    
    copyDir(CONFIG.webflowSource, CONFIG.publicDestination);
    console.log('✅ Webflow design copied to public/\n');
    
    // STEP 2: Either run legacy extraction or modular Rollup bundle
    if (useModules) {
      console.log('📦 Step 2: Bundling modular sources with Rollup...');
      // 2a. Copy CSS bundle from source/css → public/css/bouncy-balls.css (concat minimal)
      const cssDir = path.join(CONFIG.publicDestination, 'css');
      if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
      const cssMainPath = path.join('source', 'css', 'main.css');
      const cssPanelPath = path.join('source', 'css', 'panel.css');
      const cssCombined = [cssMainPath, cssPanelPath]
        .filter(p => fs.existsSync(p))
        .map(p => fs.readFileSync(p, 'utf-8'))
        .join('\n');
      fs.writeFileSync(path.join(cssDir, 'bouncy-balls.css'), cssCombined);
      console.log('✅ Wrote modular CSS bundle');

      // 2b. Prepare JS output directory
      const jsDir = path.join(CONFIG.publicDestination, 'js');
      if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

      // 2c. Copy runtime config for dev (also works for prod if desired)
      const runtimeConfigSrc = path.join('source', 'config', 'default-config.json');
      const runtimeConfigDst = path.join(jsDir, 'config.json');
      if (fs.existsSync(runtimeConfigSrc)) {
        fs.copyFileSync(runtimeConfigSrc, runtimeConfigDst);
        console.log('✅ Copied runtime config to public/js/config.json');
      }

      // 2d. Run Rollup via dynamic import to avoid ESM/CJS friction
      const { rollup } = await import('rollup');
      const rollupConfig = await import(path.resolve('rollup.config.mjs'));
      const bundle = await rollup(rollupConfig.default);
      await bundle.write(rollupConfig.default.output);
      console.log('✅ JavaScript bundled via Rollup');

      // 2e. Inject template container and assets into public/index.html
      const publicIndexPath = path.join(CONFIG.publicDestination, 'index.html');
      let html = fs.readFileSync(publicIndexPath, 'utf-8');
      const container = '<div id="bravia-balls"><canvas id="c" aria-label="Interactive bouncy balls physics simulation" role="application" draggable="false"></canvas><div class="panel" id="controlPanel" role="region" aria-label="Simulation controls" tabindex="-1"></div></div>';
      const placeholderRegex = /<div[^>]*id=["']bravia-balls["'][^>]*>[\s\S]*?<\/div>/;
      if (placeholderRegex.test(html)) html = html.replace(placeholderRegex, container); else html = html.replace('</body>', `${container}\n</body>`);
      const cssTag = '<link id="bravia-balls-css" rel="stylesheet" href="css/bouncy-balls.css">';
      if (!html.includes('id="bravia-balls-css"')) html = html.replace('</head>', `${cssTag}\n</head>`);
      const jsTag = '<script id="bravia-balls-js" src="js/bouncy-balls-embed.js" defer></script>';
      if (!html.includes('id="bravia-balls-js"')) html = html.replace('</body>', `${jsTag}\n</body>`);
      fs.writeFileSync(publicIndexPath, html);
      console.log('✅ Injected modular assets into public/index.html');

      console.log('═══════════════════════════════════════════════════════════');
      console.log('🎉 BUILD COMPLETE (modules)!');
      console.log('═══════════════════════════════════════════════════════════');
      return;
    }

    // LEGACY PATH: Extract from balls-source.html
    console.log('📦 Step 2: Extracting simulation from source...');
    const sourceHTML = fs.readFileSync(CONFIG.sourceFile, 'utf-8');
    const config = JSON.parse(fs.readFileSync(CONFIG.configFile, 'utf-8'));
    
    // Validate configuration consistency
    const validationIssues = validateConfigConsistency(sourceHTML, config);
    if (validationIssues.length > 0) {
      console.log('\n⚙️  Configuration Validation:');
      validationIssues.forEach(issue => console.log(`   ${issue}`));
      console.log('');
    }
    
    const containerHTML = extractSimulationContainer(sourceHTML);
    const cssCode = extractCSS(sourceHTML);
    let jsCode = extractJavaScript(sourceHTML);
    
    console.log('✅ Extracted simulation components\n');
    
    // STEP 3: Hardcode config
    console.log('⚙️  Step 3: Hardcoding config values...');
    const configReport = hardcodeConfig(jsCode, config);
    jsCode = configReport.code;
    console.log(`   Applied ${configReport.applied.length} config values:`);
    configReport.applied.forEach(mapping => console.log(`   ✓ ${mapping}`));
    if (configReport.skipped.length > 0) {
      console.log(`   ⚠️  Skipped (not found): ${configReport.skipped.join(', ')}`);
    }
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
    
    // STEP 7: Validate build output
    console.log('🔍 Step 7: Validating build output...');
    const validation = {
      indexHTML: fs.existsSync(publicIndexPath) && fs.statSync(publicIndexPath).size > 10000,
      embedJS: fs.existsSync(path.join(jsDir, 'bouncy-balls-embed.js')),
      embedCSS: fs.existsSync(path.join(cssDir, 'bouncy-balls.css')),
      injectedCSS: fs.readFileSync(publicIndexPath, 'utf-8').includes('id="bravia-balls-css"'),
      injectedJS: fs.readFileSync(publicIndexPath, 'utf-8').includes('id="bravia-balls-js"'),
      placeholderReplaced: !fs.readFileSync(publicIndexPath, 'utf-8').includes('class="ball-simulation w-embed"')
    };
    
    const allValid = Object.values(validation).every(v => v);
    if (!allValid) {
      console.error('❌ Build validation failed:');
      Object.entries(validation).forEach(([key, valid]) => {
        console.error(`   ${valid ? '✓' : '✗'} ${key}`);
      });
      process.exit(1);
    }
    console.log('✅ Build validated successfully');
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
