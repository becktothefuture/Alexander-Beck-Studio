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

console.log('\n🏗️  SIMPLE BUILD PIPELINE STARTING...\n');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  webflowSource: './webflow-export',
  publicDestination: './public',
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
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    console.log('\n🏗️  BUILD PIPELINE STARTING... (modular)\n');
    
    // STEP 1: Clean and copy webflow-export to public
    console.log('📁 Step 1: Copying webflow-export/ to public/...');
    
    if (fs.existsSync(CONFIG.publicDestination)) {
      fs.rmSync(CONFIG.publicDestination, { recursive: true, force: true });
      console.log('   Cleaned existing public/ folder');
    }
    
    copyDir(CONFIG.webflowSource, CONFIG.publicDestination);
    console.log('✅ Webflow design copied to public/\n');
    
    // Safety: ensure Webflow images exist in public/ (favicon, noise gif, etc.)
    // Some environments have shown missing images after copy, so we enforce this.
    const webflowImagesSrc = path.join(CONFIG.webflowSource, 'images');
    const publicImagesDst = path.join(CONFIG.publicDestination, 'images');
    if (fs.existsSync(webflowImagesSrc) && !fs.existsSync(publicImagesDst)) {
      copyDir(webflowImagesSrc, publicImagesDst);
    }
    
    // STEP 2: Bundle modular sources with Rollup
    console.log('📦 Step 2: Bundling modular sources with Rollup...');
    
    // 2a. Copy CSS bundle from source/css → public/css/bouncy-balls.css
    const cssDir = path.join(CONFIG.publicDestination, 'css');
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    const cssMainPath = path.join('source', 'css', 'main.css');
    const cssPanelPath = path.join('source', 'css', 'panel.css');
    const cssPanelDockPath = path.join('source', 'css', 'panel-dock.css');
    const cssSoundPanelPath = path.join('source', 'css', 'sound-panel.css');
    const cssPasswordGatePath = path.join('source', 'css', 'password-gate.css');
    const cssCombined = [cssMainPath, cssPanelPath, cssPanelDockPath, cssSoundPanelPath, cssPasswordGatePath]
      .filter(p => fs.existsSync(p))
      .map(p => fs.readFileSync(p, 'utf-8'))
      .join('\n');
    fs.writeFileSync(path.join(cssDir, 'bouncy-balls.css'), cssCombined);
    console.log('✅ Wrote modular CSS bundle');

    // 2a.1 Ensure Webflow CSS assets remain available (normalize/webflow/site css)
    // Some hosting/local setups rely on these static files being present, and the
    // Webflow-exported HTML still references them.
    const webflowCssDir = path.join(CONFIG.webflowSource, 'css');
    if (fs.existsSync(webflowCssDir)) {
      const webflowCssFiles = fs.readdirSync(webflowCssDir);
      for (const file of webflowCssFiles) {
        if (!file.endsWith('.css')) continue;
        const src = path.join(webflowCssDir, file);
        const dst = path.join(cssDir, file);
        if (!fs.existsSync(dst)) {
          fs.copyFileSync(src, dst);
        }
      }
    }

    // 2b. Prepare JS output directory
    const jsDir = path.join(CONFIG.publicDestination, 'js');
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

    // 2c. Copy runtime config for prod and provide both paths used by loader
    const runtimeConfigSrc = path.join('source', 'config', 'default-config.json');
    const runtimeConfigDstJs = path.join(jsDir, 'config.json');
    const runtimeConfigDstCfg = path.join(CONFIG.publicDestination, 'config', 'default-config.json');
    if (fs.existsSync(runtimeConfigSrc)) {
      fs.copyFileSync(runtimeConfigSrc, runtimeConfigDstJs);
      if (!fs.existsSync(path.dirname(runtimeConfigDstCfg))) {
        fs.mkdirSync(path.dirname(runtimeConfigDstCfg), { recursive: true });
      }
      fs.copyFileSync(runtimeConfigSrc, runtimeConfigDstCfg);
      console.log('✅ Copied runtime config to public/js/config.json and public/config/default-config.json');
    }

    // 2d. Run Rollup via dynamic import to avoid ESM/CJS friction
    const { rollup } = await import('rollup');
    const rollupConfig = await import(path.resolve('rollup.config.mjs'));
    const bundle = await rollup(rollupConfig.default);
    await bundle.write(rollupConfig.default.output);
    console.log('✅ JavaScript bundled via Rollup');

    // 2e. Inject assets into public/index.html
    // NOTE: The webflow export already has #bravia-balls container with canvas
    // We do NOT need to inject a simulation-container - just inject CSS and JS
    const publicIndexPath = path.join(CONFIG.publicDestination, 'index.html');
    let html = fs.readFileSync(publicIndexPath, 'utf-8');
    // Inject theme-color meta tags for mobile browsers (Safari iOS, Chrome Android)
    // These MUST match --frame-color-light/dark in main.css (#0a0a0a)
    const themeColorTags = `
  <!-- Browser Chrome Color - Safari iOS, Chrome Android, Edge -->
  <meta name="theme-color" content="#0a0a0a">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#0a0a0a">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">
  <!-- Apple-specific: Status bar style -->
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-capable" content="yes">
`;
    if (!html.includes('name="theme-color"')) html = html.replace('</head>', `${themeColorTags}</head>`);
    
    const cssTag = '<link id="bravia-balls-css" rel="stylesheet" href="css/bouncy-balls.css">';
    if (!html.includes('id="bravia-balls-css"')) html = html.replace('</head>', `${cssTag}\n</head>`);
    const jsTag = '<script id="bravia-balls-js" src="js/bouncy-balls-embed.js" defer></script>';
    if (!html.includes('id="bravia-balls-js"')) html = html.replace('</body>', `${jsTag}\n</body>`);
    fs.writeFileSync(publicIndexPath, html);
    console.log('✅ Injected modular assets into public/index.html');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎉 BUILD COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('\n❌ BUILD FAILED:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the build
buildProduction();
