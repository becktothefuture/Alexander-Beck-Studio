#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SIMPLE PRODUCTION BUILD PIPELINE                         ║
// ║                                                                              ║
// ║  1. Clean and prepare public/ from source/ (static assets)                  ║
// ║  2. Bundle CSS/JS and inject into public/index.html                         ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

console.log('\n🏗️  SIMPLE BUILD PIPELINE STARTING...\n');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  publicDestination: './public',
  panelVisibleInProduction: false,
  // Source index is the canonical DOM/layout (dev + prod should match).
  // Build pipeline composes production assets into this template.
  sourceIndexTemplate: './source/index.html'
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

function safeReadFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: CSS Minification (enhanced cssnano-lite patterns, no dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

function minifyCSS(css) {
  return css
    // Remove CSS comments (preserve /*! license comments */)
    .replace(/\/\*(?!!)[^*]*\*+([^/*][^*]*\*+)*\//g, '')
    // Remove newlines and carriage returns
    .replace(/[\r\n]+/g, '')
    // Collapse multiple spaces/tabs into single space
    .replace(/[\t ]+/g, ' ')
    // Remove space around structural chars { } : ; , > + ~ =
    .replace(/\s*([{};:,>+~=])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove space around parens
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    // Remove space around brackets
    .replace(/\[\s+/g, '[')
    .replace(/\s+\]/g, ']')
    // Optimize zero values: 0px → 0, 0em → 0, etc. (except 0%)
    .replace(/\b0(?:px|em|rem|ex|ch|vw|vh|vmin|vmax|cm|mm|in|pt|pc)\b/gi, '0')
    // Remove units from zero in transforms: translate(0px) → translate(0)
    .replace(/translate\(0(px|em|rem|%)?\)/gi, 'translate(0)')
    .replace(/translate3d\(0(px|em|rem|%)?,\s*0(px|em|rem|%)?,\s*0(px|em|rem|%)?\)/gi, 'translate3d(0,0,0)')
    // Optimize colors: rgb(0,0,0) → #000, rgba(0,0,0,1) → #000
    .replace(/rgb\(0,0,0\)/gi, '#000')
    .replace(/rgba\(0,0,0,1\)/gi, '#000')
    .replace(/rgb\(255,255,255\)/gi, '#fff')
    .replace(/rgba\(255,255,255,1\)/gi, '#fff')
    // Shorten hex colors: #ffffff → #fff, #000000 → #000
    .replace(/#([0-9a-f])\1([0-9a-f])\2([0-9a-f])\3/gi, '#$1$2$3')
    // Optimize font-weight: normal → 400, bold → 700
    .replace(/font-weight:normal/gi, 'font-weight:400')
    .replace(/font-weight:bold/gi, 'font-weight:700')
    // Remove leading zeros: 0.5 → .5
    .replace(/:0\.(\d)/g, ':.$1')
    .replace(/\s0\.(\d)/g, ' .$1')
    .replace(/,0\.(\d)/g, ',.$1')
    // Optimize calc(): calc(0px + 10px) → 10px (simple cases)
    .replace(/calc\(0\s*\+\s*([^)]+)\)/gi, '$1')
    .replace(/calc\(([^)]+)\s*\+\s*0\)/gi, '$1')
    // Remove empty rules
    .replace(/[^{}]+\{\s*\}/g, '')
    // Final trim
    .trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    console.log('\n🏗️  BUILD PIPELINE STARTING... (modular)\n');
    
    const buildStamp = Date.now();

    // STEP 1: Clean and prepare public/ from source/
    console.log('📁 Step 1: Preparing public/ from source/...');
    
    if (fs.existsSync(CONFIG.publicDestination)) {
      // macOS + concurrent file watchers (dev startup) can cause transient ENOTEMPTY
      // during recursive deletion. Use retries to make the build resilient.
      fs.rmSync(CONFIG.publicDestination, { recursive: true, force: true, maxRetries: 10, retryDelay: 75 });
      console.log('   Cleaned existing public/ folder');
    }

    // Recreate public root
    fs.mkdirSync(CONFIG.publicDestination, { recursive: true });

    // Copy static assets from source/
    const sourceImagesDir = path.join('source', 'images');
    const publicImagesDir = path.join(CONFIG.publicDestination, 'images');
    if (fs.existsSync(sourceImagesDir)) copyDir(sourceImagesDir, publicImagesDir);

    // Copy standalone HTML pages from source/ (cv.html, portfolio.html, etc.)
    const standalonePages = ['cv.html', 'portfolio.html'];
    for (const page of standalonePages) {
      const src = path.join('source', page);
      const dst = path.join(CONFIG.publicDestination, page);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
      }
    }

    // Ensure self-hosted fonts are available in public/
    // (Used by icon font + any future typography assets)
    const sourceFontsDir = path.join('source', 'fonts');
    const publicFontsDir = path.join(CONFIG.publicDestination, 'fonts');
    if (fs.existsSync(sourceFontsDir)) {
      copyDir(sourceFontsDir, publicFontsDir);
    }
    
    // STEP 2: Bundle modular sources with Rollup
    console.log('📦 Step 2: Bundling modular sources with Rollup...');
    
    // 2a. Copy CSS bundle from source/css → public/css/bouncy-balls.css
    const cssDir = path.join(CONFIG.publicDestination, 'css');
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    const cssNormalizePath = path.join('source', 'css', 'normalize.css');
    const cssMainPath = path.join('source', 'css', 'main.css');
    const cssPanelPath = path.join('source', 'css', 'panel.css');
    const cssPanelDockPath = path.join('source', 'css', 'panel-dock.css');
    const cssSoundPanelPath = path.join('source', 'css', 'sound-panel.css');
    const cssPasswordGatePath = path.join('source', 'css', 'password-gate.css');
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    const includePanelCSS = !(isProd && CONFIG.panelVisibleInProduction === false);
    const cssRaw = [
      cssNormalizePath,
      cssMainPath,
      ...(includePanelCSS ? [cssPanelPath, cssPanelDockPath, cssSoundPanelPath] : []),
      cssPasswordGatePath
    ]
      .filter(p => fs.existsSync(p))
      .map(p => fs.readFileSync(p, 'utf-8'))
      .join('\n');
    
    // Minify CSS in production builds
    const cssCombined = isProd ? minifyCSS(cssRaw) : cssRaw;
    const cssRawSize = Buffer.byteLength(cssRaw, 'utf-8');
    const cssMinSize = Buffer.byteLength(cssCombined, 'utf-8');
    const cssReduction = Math.round((1 - cssMinSize / cssRawSize) * 100);
    
    fs.writeFileSync(path.join(cssDir, 'bouncy-balls.css'), cssCombined);
    console.log(`✅ Wrote CSS bundle (${isProd ? `minified: ${Math.round(cssMinSize/1024)}KB, ${cssReduction}% smaller` : 'unminified'})`);

    // Standalone panel styles (used by portfolio page)
    if (fs.existsSync(cssPanelPath)) {
      fs.copyFileSync(cssPanelPath, path.join(cssDir, 'panel.css'));
    }
    if (fs.existsSync(cssPanelDockPath)) {
      fs.copyFileSync(cssPanelDockPath, path.join(cssDir, 'panel-dock.css'));
    }

    // 2b. Prepare JS output directory
    const jsDir = path.join(CONFIG.publicDestination, 'js');
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

    // 2c. Copy runtime config for prod (minified in production)
    const runtimeConfigSrc = path.join('source', 'config', 'default-config.json');
    const runtimeConfigDstJs = path.join(jsDir, 'config.json');
    const runtimeConfigDstCfg = path.join(CONFIG.publicDestination, 'config', 'default-config.json');
    if (fs.existsSync(runtimeConfigSrc)) {
      const configRaw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
      const configOut = isProd ? JSON.stringify(JSON.parse(configRaw)) : configRaw;
      fs.writeFileSync(runtimeConfigDstJs, configOut);
      if (!fs.existsSync(path.dirname(runtimeConfigDstCfg))) {
        fs.mkdirSync(path.dirname(runtimeConfigDstCfg), { recursive: true });
      }
      fs.writeFileSync(runtimeConfigDstCfg, configOut);
      const savedBytes = Buffer.byteLength(configRaw) - Buffer.byteLength(configOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} runtime config (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.2 Copy text dictionary (minified in production)
    const runtimeTextSrc = path.join('source', 'config', 'text.json');
    const runtimeTextDstJs = path.join(jsDir, 'text.json');
    const runtimeTextDstCfg = path.join(CONFIG.publicDestination, 'config', 'text.json');
    if (fs.existsSync(runtimeTextSrc)) {
      const textRaw = fs.readFileSync(runtimeTextSrc, 'utf-8');
      const textOut = isProd ? JSON.stringify(JSON.parse(textRaw)) : textRaw;
      fs.writeFileSync(runtimeTextDstJs, textOut);
      if (!fs.existsSync(path.dirname(runtimeTextDstCfg))) {
        fs.mkdirSync(path.dirname(runtimeTextDstCfg), { recursive: true });
      }
      fs.writeFileSync(runtimeTextDstCfg, textOut);
      const savedBytes = Buffer.byteLength(textRaw) - Buffer.byteLength(textOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} text dictionary (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.3 Portfolio config (minified in production)
    const portfolioConfigSrc = path.join('source', 'config', 'portfolio-config.json');
    const portfolioConfigDstJs = path.join(jsDir, 'portfolio-config.json');
    const portfolioConfigDstCfg = path.join(CONFIG.publicDestination, 'config', 'portfolio-config.json');
    if (fs.existsSync(portfolioConfigSrc)) {
      const configRaw = fs.readFileSync(portfolioConfigSrc, 'utf-8');
      const configOut = isProd ? JSON.stringify(JSON.parse(configRaw)) : configRaw;
      fs.writeFileSync(portfolioConfigDstJs, configOut);
      if (!fs.existsSync(path.dirname(portfolioConfigDstCfg))) {
        fs.mkdirSync(path.dirname(portfolioConfigDstCfg), { recursive: true });
      }
      fs.writeFileSync(portfolioConfigDstCfg, configOut);
      const savedBytes = Buffer.byteLength(configRaw) - Buffer.byteLength(configOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} portfolio config (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.4 Portfolio page: Copy assets, data, and CSS
    const portfolioSourceBase = path.join('source', 'portfolio', 'page');
    const portfolioPublicBase = path.join(CONFIG.publicDestination, 'portfolio', 'page');
    
    if (fs.existsSync(portfolioSourceBase)) {
      console.log('📓 Preparing portfolio page assets...');
      
      // Ensure dirs exist
      fs.mkdirSync(portfolioPublicBase, { recursive: true });
      fs.mkdirSync(path.join(portfolioPublicBase, 'js'), { recursive: true });
      
      // Copy CSS
      const portfolioCssSrc = path.join(portfolioSourceBase, 'style.css');
      if (fs.existsSync(portfolioCssSrc)) {
         // In a real pipeline we might minify this too, but straight copy is fine for now
         fs.copyFileSync(portfolioCssSrc, path.join(portfolioPublicBase, 'style.css'));
      }
      
      // Copy Assets
      const portfolioAssetsSrc = path.join(portfolioSourceBase, 'assets');
      const portfolioAssetsDst = path.join(portfolioPublicBase, 'assets');
      if (fs.existsSync(portfolioAssetsSrc)) {
        copyDir(portfolioAssetsSrc, portfolioAssetsDst);
      }
      
      // Copy Data
      const portfolioDataSrc = path.join(portfolioSourceBase, 'data');
      const portfolioDataDst = path.join(portfolioPublicBase, 'data');
      if (fs.existsSync(portfolioDataSrc)) {
         copyDir(portfolioDataSrc, portfolioDataDst);
      }
      console.log('✅ Portfolio page assets/data/css copied.');
    }

    // 2d. Run Rollup via dynamic import to avoid ESM/CJS friction
    const { rollup } = await import('rollup');
    const rollupConfig = await import(path.resolve('rollup.config.mjs'));
    const configs = Array.isArray(rollupConfig.default) ? rollupConfig.default : [rollupConfig.default];
    
    for (const config of configs) {
        const bundle = await rollup(config);
        await bundle.write(config.output);
    }
    console.log('✅ JavaScript bundled via Rollup (all inputs)');

    // 2e. Inject assets into public/index.html
    const publicIndexPath = path.join(CONFIG.publicDestination, 'index.html');
    const template = safeReadFile(CONFIG.sourceIndexTemplate);
    if (!template) throw new Error('Missing source index template at ' + CONFIG.sourceIndexTemplate);
    let html = template;

    // ... (index.html processing logic) ...

    // 2f. (NEW) Inject assets into public/portfolio.html
    const publicPortfolioPath = path.join(CONFIG.publicDestination, 'portfolio.html');
    const portfolioTemplatePath = path.join('source', 'portfolio.html');
    const portfolioTemplate = safeReadFile(portfolioTemplatePath);
    
    if (portfolioTemplate) {
        let pHtml = portfolioTemplate;
        
        // Strip dev-only module script / css (will be re-injected for prod)
        pHtml = pHtml.replace(/^\s*<script\s+type="module"\s+src="[^"]+"><\/script>\s*$/gm, '');
        pHtml = pHtml.replace(/^\s*<link\s+rel="stylesheet"\s+href="portfolio\/page\/style\.css">\s*$/gm, '');

        // Strip unbundled CSS links (portfolio should mirror index build behavior)
        pHtml = pHtml
          .replace(/^\s*<!-- Dev Modules CSS \(unbundled\) -->\s*$/gm, '')
          .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/normalize\.css">\s*$/gm, '')
          .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/main\.css">\s*$/gm, '')
          .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/panel\.css">\s*$/gm, '')
          .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/panel-dock\.css">\s*$/gm, '')
          .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/sound-panel\.css">\s*$/gm, '')
          .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/password-gate\.css">\s*$/gm, '');

        if (isProd) {
          pHtml = pHtml.replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/panel\.css">\s*$/gm, '');
          pHtml = pHtml.replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/panel-dock\.css">\s*$/gm, '');
          pHtml = pHtml.replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/sound-panel\.css">\s*$/gm, '');
        }
        
        // Inject production assets (cache-busted)
        const bundledCssTag = `<link rel="stylesheet" href="css/bouncy-balls.css?v=${buildStamp}">`;
        const portfolioCssTag = `<link rel="stylesheet" href="portfolio/page/style.css?v=${buildStamp}">`;
        const portfolioJsTag = `<script src="portfolio/page/js/portfolio-bundle.js?v=${buildStamp}" defer></script>`;
        
        // Insert in head/body
        pHtml = pHtml.replace('</head>', `${bundledCssTag}\n${portfolioCssTag}\n</head>`);
        pHtml = pHtml.replace('</body>', `${portfolioJsTag}\n</body>`);
        
        if (isProd && fs.existsSync(portfolioConfigSrc) && !pHtml.includes('__PORTFOLIO_CONFIG__')) {
          try {
            const raw = fs.readFileSync(portfolioConfigSrc, 'utf-8');
            const min = JSON.stringify(JSON.parse(raw));
            const safe = min.replace(/</g, '\\u003c');
            const inline = `<script>window.__PORTFOLIO_CONFIG__=${safe};</script>`;
            pHtml = pHtml.replace('</head>', `${inline}\n</head>`);
            console.log('✅ Inlined portfolio config into public/portfolio.html (hardcoded)');
          } catch (e) {}
        }

        fs.writeFileSync(publicPortfolioPath, pHtml);
        console.log('✅ Injected production assets into public/portfolio.html');
    }

    // Production template composition:
    // - Remove dev-only CSS links (we ship a single bundled CSS in production)
    // - Remove dev module entry (we ship a single bundled JS in production)
    // - If panel is disabled in production, remove the panel container to avoid
    //   unstyled layout shifts (panel CSS is excluded from the prod bundle).
    html = html
      // Strip unbundled CSS links
      .replace(/^\s*<!-- Dev Modules CSS \(unbundled\) -->\s*$/gm, '')
      .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/normalize\.css">\s*$/gm, '')
      .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/main\.css">\s*$/gm, '')
      .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/panel\.css">\s*$/gm, '')
      .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/panel-dock\.css">\s*$/gm, '')
      .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/sound-panel\.css">\s*$/gm, '')
      .replace(/^\s*<link\s+rel="stylesheet"\s+href="css\/password-gate\.css">\s*$/gm, '')
      // Strip dev ES module entrypoint
      .replace(/^\s*<!-- Use ES module for dev \(instant reload\) -->\s*$/gm, '')
      .replace(/^\s*<script\s+type="module"\s+src="main\.js"><\/script>\s*$/gm, '');

    if (includePanelCSS === false) {
      html = html.replace(/\s*<div class="panel" id="controlPanel"[^>]*><\/div>\s*/m, '\n');
    }
    
    // FADE SYSTEM: Wrap content elements in #fade-content for single-element fade
    // Logo and balls stay outside (always visible), content fades in
    if (!html.includes('id="fade-content"')) {
      // Insert opening wrapper before header.viewport--content
      html = html.replace(
        '<header class="viewport viewport--content">',
        '<div id="fade-content">\n  <header class="viewport viewport--content">'
      );
      
      // Insert closing wrapper after aside.viewport--corners
      html = html.replace(
        /<\/aside>\s*(<script)/,
        '</aside>\n</div>\n$1'
      );
      
      console.log('✅ Wrapped content in #fade-content for fade system');
    }
    
    // FADE SYSTEM: Inject blocking CSS in <head> to prevent FOUC
    // Include transition here so it's defined from the start (no delay, JS handles timing)
    // Blocking style: Hide content immediately, animation handles the reveal
// No transition needed - keyframe animation in main.css handles the fade
const fadeBlockingCSS = `<style id="fade-blocking">#fade-content{opacity:0}</style>`;
    if (!html.includes('id="fade-blocking"')) {
      html = html.replace('<head>', '<head>\n' + fadeBlockingCSS);
    }

    // CONFIG: Inline runtime config into HTML for production (hardcoded at build-time).
    // This allows the JS to boot without fetching any config, while still using the
    // config file as the single source of truth (read here, injected into HTML).
    if (isProd && fs.existsSync(runtimeConfigSrc) && !html.includes('__RUNTIME_CONFIG__')) {
      try {
        const raw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
        // Prevent accidental </script> termination and keep HTML safe.
        const safe = raw.replace(/</g, '\\u003c');
        const inline = `<script>window.__RUNTIME_CONFIG__=${safe};</script>`;
        html = html.replace('</head>', `${inline}\n</head>`);
        console.log('✅ Inlined runtime config into public/index.html (hardcoded)');
      } catch (e) {}
    }

    // TEXT: Inline runtime text dictionary into HTML for production (hardcoded + minified).
    // Guarantees: zero fetch, no copy pop-in, and a single authoring surface.
    if (isProd && fs.existsSync(runtimeTextSrc) && !html.includes('__TEXT__')) {
      try {
        const raw = fs.readFileSync(runtimeTextSrc, 'utf-8');
        const min = JSON.stringify(JSON.parse(raw));
        const safe = min.replace(/</g, '\\u003c');
        const inline = `<script>window.__TEXT__=${safe};</script>`;
        html = html.replace('</head>', `${inline}\n</head>`);
        console.log('✅ Inlined runtime text into public/index.html as window.__TEXT__ (minified)');
      } catch (e) {}
    }
    
    // Inject theme-color meta tags for mobile browsers (Safari iOS, Chrome Android, Edge).
    // These SHOULD match --bg-light / --bg-dark in source/css/main.css for first paint.
    const themeColorTags = `
  <!-- Browser Chrome Color - Safari iOS, Chrome Android, Edge -->
  <meta name="theme-color" content="#f5f5f5">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f5f5">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0a0a0a">
  <!-- PWA: Mobile web app capable (modern + legacy) -->
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
`;
    if (!html.includes('name="theme-color"')) html = html.replace('</head>', `${themeColorTags}</head>`);
    
    // Inject resource hints for critical assets (preload fonts, preconnect Google Fonts)
    // Note: CSS/JS preloads removed as they're loaded with cache-bust query strings
    const resourceHints = `
  <!-- Resource Hints: Font Preloading + Connection Hints -->
  <link rel="preload" href="fonts/tabler-icons-outline.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;
    if (!html.includes('rel="preload"') && isProd) html = html.replace('<meta charset', `${resourceHints}<meta charset`);
    
    const cssTag = '<link id="bravia-balls-css" rel="stylesheet" href="css/bouncy-balls.css?v=' + Date.now() + '">';
    if (!html.includes('id="bravia-balls-css"')) html = html.replace('</head>', `${cssTag}\n</head>`);
    const jsTag = '<script id="bravia-balls-js" src="js/bouncy-balls-embed.js?v=' + Date.now() + '" defer></script>';
    if (!html.includes('id="bravia-balls-js"')) html = html.replace('</body>', `${jsTag}\n</body>`);
    fs.writeFileSync(publicIndexPath, html);
    console.log('✅ Injected modular assets into public/index.html');

    // Report final bundle sizes (including gzip estimates)
    const jsPath = path.join(jsDir, 'bouncy-balls-embed.js');
    const cssPath = path.join(cssDir, 'bouncy-balls.css');
    
    if (isProd && fs.existsSync(jsPath) && fs.existsSync(cssPath)) {
      const jsRaw = fs.readFileSync(jsPath);
      const cssRaw = fs.readFileSync(cssPath);
      const jsGzip = zlib.gzipSync(jsRaw, { level: 9 });
      const cssGzip = zlib.gzipSync(cssRaw, { level: 9 });
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 BUNDLE SIZES:');
      console.log(`   JS:  ${Math.round(jsRaw.length/1024)}KB → ${Math.round(jsGzip.length/1024)}KB gzipped`);
      console.log(`   CSS: ${Math.round(cssRaw.length/1024)}KB → ${Math.round(cssGzip.length/1024)}KB gzipped`);
      console.log(`   Total transfer: ~${Math.round((jsGzip.length + cssGzip.length)/1024)}KB gzipped`);
    }
    
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
