#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SIMPLE PRODUCTION BUILD PIPELINE                         ║
// ║                                                                              ║
// ║  1. Clean and prepare dist/ from source/ (static assets)                    ║
// ║  2. Bundle CSS/JS via Rollup and inject into dist/index.html                ║
// ║  3. ES module multi-entry build with code-splitting (shared.js chunk)       ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pkg = require('./package.json');
const PROJECT_VERSION = (pkg && pkg.version) ? pkg.version : '0.0.0';

console.log('\n🏗️  SIMPLE BUILD PIPELINE STARTING...\n');

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  // Production output directory (Phase 2: changed from public/ to dist/)
  publicDestination: './dist',
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
    // Skip metadata files that bloat artifacts (e.g., .DS_Store)
    if (item.startsWith('.')) continue;
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
// HELPER: Marker-based HTML edits (safe + deterministic)
// ═══════════════════════════════════════════════════════════════════════════════

function stripBlockBetweenMarkers(html, startMarker, endMarker) {
  const re = new RegExp(
    `<!--\\s*${startMarker}\\s*-->[\\s\\S]*?<!--\\s*${endMarker}\\s*-->\\s*`,
    'g'
  );
  return String(html || '').replace(re, '');
}

function replaceMarker(html, marker, replacement) {
  const re = new RegExp(`<!--\\s*${marker}\\s*-->`, 'g');
  return String(html || '').replace(re, String(replacement ?? ''));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: CSS Minification (enhanced cssnano-lite patterns, no dependencies)
// ═══════════════════════════════════════════════════════════════════════════════

function minifyCSS(css) {
  // Protect calc() expressions: replace with placeholders before minification
  const calcExpressions = [];
  let protected = css.replace(/calc\([^)]+\)/gi, (match) => {
    calcExpressions.push(match);
    return `__CALC_PLACEHOLDER_${calcExpressions.length - 1}__`;
  });
  
  protected = protected
    // Remove CSS comments (preserve /*! license comments */)
    .replace(/\/\*(?!!)[^*]*\*+([^/*][^*]*\*+)*\//g, '')
    // Remove newlines and carriage returns
    .replace(/[\r\n]+/g, '')
    // Collapse multiple spaces/tabs into single space
    .replace(/[\t ]+/g, ' ')
    // Remove space around structural chars { } : ; , > ~ =
    // NOTE: Do NOT include + and - here as they need spaces in calc()
    .replace(/\s*([{};:,>~=])\s*/g, '$1')
    // Remove trailing semicolons before closing braces
    .replace(/;}/g, '}')
    // Remove space around parens (but calc placeholders are already protected)
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
    // Remove empty rules
    .replace(/[^{}]+\{\s*\}/g, '')
    // Final trim
    .trim();
  
  // Restore calc() expressions (minify internal whitespace but preserve + - spacing)
  return protected.replace(/__CALC_PLACEHOLDER_(\d+)__/g, (_, idx) => {
    const expr = calcExpressions[parseInt(idx, 10)];
    // Minify calc internals: collapse whitespace but preserve spaces around + and -
    return expr
      .replace(/\s+/g, ' ')
      .replace(/\(\s+/g, '(')
      .replace(/\s+\)/g, ')')
      .replace(/\s*\*\s*/g, '*')
      .replace(/\s*\/\s*/g, '/');
  });
}

function extractRootCssVars(css) {
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\n\}/);
  if (!rootMatch) return {};
  const block = rootMatch[1];
  const vars = {};
  const varRegex = /--([a-z0-9-_]+)\s*:\s*([^;]+);/gi;
  let match = null;
  while ((match = varRegex.exec(block))) {
    vars[`--${match[1]}`] = String(match[2]).trim();
  }
  return vars;
}

function resolveCssVars(vars) {
  const cache = {};
  const resolving = new Set();

  const resolveValue = (value) => {
    const raw = String(value || '');
    return raw.replace(/var\((--[a-z0-9-_]+)(?:\s*,\s*([^)]+))?\)/gi, (_match, name, fallback) => {
      if (cache[name]) return cache[name];
      if (resolving.has(name)) return String(fallback || '').trim();
      const next = vars[name];
      if (!next) return String(fallback || '').trim();
      resolving.add(name);
      const resolved = resolveValue(next).trim();
      resolving.delete(name);
      cache[name] = resolved;
      return resolved;
    });
  };

  const resolved = {};
  for (const [key, val] of Object.entries(vars)) {
    resolved[key] = resolveValue(val).trim();
  }
  return resolved;
}

function buildTokensSnapshot(css) {
  const cssVars = extractRootCssVars(css);
  const resolved = resolveCssVars(cssVars);
  return { cssVars, resolved };
}

function sanitizeInlineJson(raw) {
  return raw.replace(/</g, '\\u003c');
}

function isValidThemeColor(value) {
  if (!value) return false;
  const v = String(value).trim();
  if (!v) return false;
  if (v.includes('var(')) return false;
  return true;
}

function pickTokenValue(snapshot, name, fallback) {
  if (!snapshot) return fallback;
  const resolved = snapshot.resolved?.[name];
  if (isValidThemeColor(resolved)) return String(resolved).trim();
  const raw = snapshot.cssVars?.[name];
  if (isValidThemeColor(raw)) return String(raw).trim();
  return fallback;
}

function readFrameColorsFromConfig(configPath) {
  const fallback = { light: '#242529', dark: '#1a1a1a' };
  const raw = safeReadFile(configPath);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    const base = String(parsed.frameColor || '').trim();
    const light = String(parsed.frameColorLight || base || fallback.light).trim() || fallback.light;
    const dark = String(parsed.frameColorDark || parsed.frameColor || base || fallback.dark).trim() || fallback.dark;
    return { light, dark };
  } catch (e) {
    return fallback;
  }
}

function buildThemeColorTags(light, dark) {
  const lightColor = String(light).trim();
  const darkColor = String(dark).trim();
  return `
  <!-- Browser Chrome Color - Safari iOS, Chrome Android, Edge -->
  <meta name="theme-color" content="${lightColor}">
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="${lightColor}">
  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="${darkColor}">
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN BUILD FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function buildProduction() {
  try {
    console.log('\n🏗️  BUILD PIPELINE STARTING... (modular)\n');
    
    const buildStamp = Date.now();

    // STEP 1: Clean and prepare dist/ from source/
    console.log('📁 Step 1: Preparing dist/ from source/...');
    
    if (fs.existsSync(CONFIG.publicDestination)) {
      // macOS + concurrent file watchers (dev startup) can cause transient ENOTEMPTY
      // during recursive deletion. Use retries to make the build resilient.
      fs.rmSync(CONFIG.publicDestination, { recursive: true, force: true, maxRetries: 10, retryDelay: 75 });
      console.log('   Cleaned existing dist/ folder');
    }

    // Recreate dist root
    fs.mkdirSync(CONFIG.publicDestination, { recursive: true });

    // Copy static assets from source/
    const sourceImagesDir = path.join('source', 'images');
    const publicImagesDir = path.join(CONFIG.publicDestination, 'images');
    if (fs.existsSync(sourceImagesDir)) copyDir(sourceImagesDir, publicImagesDir);

    // NOTE: We no longer copy `source/modules` into `public/`.
    // - Main site and portfolio are bundled via Rollup.
    // - CV page is bundled via Rollup (public/js/cv-bundle.js).

    // Copy standalone HTML pages from source/ (cv.html, portfolio.html, etc.)
    const standalonePages = ['cv.html', 'portfolio.html', path.join('splat', 'index.html')];
    for (const page of standalonePages) {
      const src = path.join('source', page);
      const dst = path.join(CONFIG.publicDestination, page);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
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
    
    // 2a. Copy CSS bundle from source/css → dist/css/styles.css
    const cssDir = path.join(CONFIG.publicDestination, 'css');
    if (!fs.existsSync(cssDir)) fs.mkdirSync(cssDir, { recursive: true });
    const cssTokensPath = path.join('source', 'css', 'tokens.css');
    const cssNormalizePath = path.join('source', 'css', 'normalize.css');
    const cssMainPath = path.join('source', 'css', 'main.css');
    const cssPanelPath = path.join('source', 'css', 'panel.css');
    const isProd = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
    // Panel CSS: only include in production if explicitly enabled, always include in dev
    const includePanelCSS = isProd ? CONFIG.panelVisibleInProduction : true;
    const cssRaw = [
      cssTokensPath,
      cssNormalizePath,
      cssMainPath,
      ...(includePanelCSS ? [cssPanelPath] : [])
    ]
      .filter(p => fs.existsSync(p))
      .map(p => fs.readFileSync(p, 'utf-8'))
      .join('\n');

    let tokensSnapshot = null;
    if (fs.existsSync(cssTokensPath)) {
      try {
        const tokensSource = fs.readFileSync(cssTokensPath, 'utf-8');
        tokensSnapshot = buildTokensSnapshot(tokensSource);
      } catch (e) {}
    }
    
    // Minify CSS in production builds
    const cssCombined = isProd ? minifyCSS(cssRaw) : cssRaw;
    const cssRawSize = Buffer.byteLength(cssRaw, 'utf-8');
    const cssMinSize = Buffer.byteLength(cssCombined, 'utf-8');
    const cssReduction = Math.round((1 - cssMinSize / cssRawSize) * 100);
    
    fs.writeFileSync(path.join(cssDir, 'styles.css'), cssCombined);
    console.log(`✅ Wrote CSS bundle (${isProd ? `minified: ${Math.round(cssMinSize/1024)}KB, ${cssReduction}% smaller` : 'unminified'})`);

    // Standalone panel styles (DEV-ONLY: panel dock is a config-authoring tool)
    // In production builds we omit panel.css entirely so it cannot leak into deploy artifacts.
    if (!isProd && fs.existsSync(cssPanelPath)) {
      fs.copyFileSync(cssPanelPath, path.join(cssDir, 'panel.css'));
    }
    // Safety: ensure panel.css is never present in production output (even if a prior build leaked it).
    if (isProd) {
      try { fs.rmSync(path.join(cssDir, 'panel.css'), { force: true }); } catch (e) {}
    }
    // Portfolio page styles (kept separate from main bundle)
    const portfolioCssPath = path.join('source', 'css', 'portfolio.css');
    if (fs.existsSync(portfolioCssPath)) {
      const rawPortfolioCss = fs.readFileSync(portfolioCssPath, 'utf-8');
      const portfolioCssOut = isProd ? minifyCSS(rawPortfolioCss) : rawPortfolioCss;
      fs.writeFileSync(path.join(cssDir, 'portfolio.css'), portfolioCssOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} portfolio CSS`);
    }

    // 2b. Prepare JS output directory
    const jsDir = path.join(CONFIG.publicDestination, 'js');
    if (!fs.existsSync(jsDir)) fs.mkdirSync(jsDir, { recursive: true });

    // 2c. Copy runtime config for prod (minified in production)
    const runtimeConfigSrc = path.join('source', 'config', 'default-config.json');
    const runtimeConfigFrameColors = readFrameColorsFromConfig(runtimeConfigSrc);
    const runtimeConfigDstJs = path.join(jsDir, 'config.json');
    const runtimeConfigDstCfg = path.join(CONFIG.publicDestination, 'config', 'default-config.json');
    if (fs.existsSync(runtimeConfigSrc)) {
      const configRaw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
      const configOut = isProd ? JSON.stringify(JSON.parse(configRaw)) : configRaw;
      // Production: config is hardcoded into HTML as window.__RUNTIME_CONFIG__ (no external config files).
      // Dev/preview tooling may still want the raw JSON files.
      if (!isProd) {
        fs.writeFileSync(runtimeConfigDstJs, configOut);
        if (!fs.existsSync(path.dirname(runtimeConfigDstCfg))) {
          fs.mkdirSync(path.dirname(runtimeConfigDstCfg), { recursive: true });
        }
        fs.writeFileSync(runtimeConfigDstCfg, configOut);
      }
      const savedBytes = Buffer.byteLength(configRaw) - Buffer.byteLength(configOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} runtime config (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.2 Copy home contents dictionary (minified in production)
    const runtimeTextSrc = path.join('source', 'config', 'contents-home.json');
    const runtimeTextDstJs = path.join(jsDir, 'contents-home.json');
    const runtimeTextDstCfg = path.join(CONFIG.publicDestination, 'config', 'contents-home.json');
    if (fs.existsSync(runtimeTextSrc)) {
      const textRaw = fs.readFileSync(runtimeTextSrc, 'utf-8');
      const textOut = isProd ? JSON.stringify(JSON.parse(textRaw)) : textRaw;
      // Production: home contents are inlined into public/index.html as window.__TEXT__.
      // Keep JSON artifacts only in dev/non-prod builds for inspection.
      if (!isProd) {
        fs.writeFileSync(runtimeTextDstJs, textOut);
        if (!fs.existsSync(path.dirname(runtimeTextDstCfg))) {
          fs.mkdirSync(path.dirname(runtimeTextDstCfg), { recursive: true });
        }
        fs.writeFileSync(runtimeTextDstCfg, textOut);
      }
      const savedBytes = Buffer.byteLength(textRaw) - Buffer.byteLength(textOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} home contents (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.3 Portfolio config (minified in production)
    const portfolioConfigSrc = path.join('source', 'config', 'portfolio-config.json');
    const portfolioConfigDstJs = path.join(jsDir, 'portfolio-config.json');
    const portfolioConfigDstCfg = path.join(CONFIG.publicDestination, 'config', 'portfolio-config.json');
    if (fs.existsSync(portfolioConfigSrc)) {
      const configRaw = fs.readFileSync(portfolioConfigSrc, 'utf-8');
      const configOut = isProd ? JSON.stringify(JSON.parse(configRaw)) : configRaw;
      // Production: portfolio config is inlined into public/portfolio.html as window.__PORTFOLIO_CONFIG__.
      if (!isProd) {
        fs.writeFileSync(portfolioConfigDstJs, configOut);
        if (!fs.existsSync(path.dirname(portfolioConfigDstCfg))) {
          fs.mkdirSync(path.dirname(portfolioConfigDstCfg), { recursive: true });
        }
        fs.writeFileSync(portfolioConfigDstCfg, configOut);
      }
      const savedBytes = Buffer.byteLength(configRaw) - Buffer.byteLength(configOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} portfolio config (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.4 Portfolio contents (minified in production)
    const portfolioDataSrc = path.join('source', 'config', 'contents-portfolio.json');
    const portfolioDataDstJs = path.join(jsDir, 'contents-portfolio.json');
    const portfolioDataDstCfg = path.join(CONFIG.publicDestination, 'config', 'contents-portfolio.json');
    if (fs.existsSync(portfolioDataSrc)) {
      const dataRaw = fs.readFileSync(portfolioDataSrc, 'utf-8');
      const dataOut = isProd ? JSON.stringify(JSON.parse(dataRaw)) : dataRaw;
      // Production: portfolio page uses inlined configs and does not need JSON artifacts.
      if (!isProd) {
        fs.writeFileSync(portfolioDataDstJs, dataOut);
        if (!fs.existsSync(path.dirname(portfolioDataDstCfg))) {
          fs.mkdirSync(path.dirname(portfolioDataDstCfg), { recursive: true });
        }
        fs.writeFileSync(portfolioDataDstCfg, dataOut);
      }
      const savedBytes = Buffer.byteLength(dataRaw) - Buffer.byteLength(dataOut);
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} portfolio contents (${isProd ? `-${savedBytes}B` : 'unminified'})`);
    }

    // 2c.5 Tokens snapshot (resolved CSS vars for JS consumers)
    if (tokensSnapshot) {
      const tokensOut = isProd ? JSON.stringify(tokensSnapshot) : JSON.stringify(tokensSnapshot, null, 2);
      const tokensDstJs = path.join(jsDir, 'tokens.json');
      const tokensDstCfg = path.join(CONFIG.publicDestination, 'config', 'tokens.json');
      // Production: tokens snapshot is inlined as window.__TOKENS__.
      if (!isProd) {
        fs.writeFileSync(tokensDstJs, tokensOut);
        if (!fs.existsSync(path.dirname(tokensDstCfg))) {
          fs.mkdirSync(path.dirname(tokensDstCfg), { recursive: true });
        }
        fs.writeFileSync(tokensDstCfg, tokensOut);
      }
      console.log(`✅ ${isProd ? 'Minified' : 'Copied'} tokens snapshot (${isProd ? 'minified' : 'unminified'})`);
    }

    // 2c.6 Generate CV images list (scans cv-images folder at build time)
    const cvImagesDir = path.join('source', 'images', 'cv-images');
    const cvImagesConfigDst = path.join(CONFIG.publicDestination, 'config', 'cv-images.json');
    if (fs.existsSync(cvImagesDir)) {
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const files = fs.readdirSync(cvImagesDir);
      const imageFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      }).sort();
      
      const cvImagesData = {
        folder: 'images/cv-images/',
        images: imageFiles,
        count: imageFiles.length,
        generated: new Date().toISOString(),
      };
      
      const cvImagesOut = isProd ? JSON.stringify(cvImagesData) : JSON.stringify(cvImagesData, null, 2);
      if (!fs.existsSync(path.dirname(cvImagesConfigDst))) {
        fs.mkdirSync(path.dirname(cvImagesConfigDst), { recursive: true });
      }
      fs.writeFileSync(cvImagesConfigDst, cvImagesOut);
      console.log(`✅ Generated CV images list (${imageFiles.length} image${imageFiles.length !== 1 ? 's' : ''})`);
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

    const themeLight = pickTokenValue(tokensSnapshot, '--wall-color-light', runtimeConfigFrameColors.light);
    const themeDark = pickTokenValue(tokensSnapshot, '--wall-color-dark', runtimeConfigFrameColors.dark);
    const themeColorTags = buildThemeColorTags(themeLight, themeDark);
    const tokensInline = tokensSnapshot
      ? `<script>window.__TOKENS__=${sanitizeInlineJson(JSON.stringify(tokensSnapshot))};</script>`
      : '';
    const frameVarsStyle = `<style id="frame-config-vars">:root{--frame-color-light:${runtimeConfigFrameColors.light};--frame-color-dark:${runtimeConfigFrameColors.dark};}</style>`;

    const buildMeta = {
      version: PROJECT_VERSION,
      timestamp: buildStamp,
      themeColor: {
        light: themeLight,
        dark: themeDark
      }
    };

    fs.writeFileSync(path.join(CONFIG.publicDestination, 'build-meta.json'), JSON.stringify(buildMeta, null, 2));
    console.log(`✅ Recorded build metadata (v${PROJECT_VERSION} @ ${buildStamp})`);

    // ... (index.html processing logic) ...

    // 2f. (NEW) Inject assets into public/portfolio.html
    const publicPortfolioPath = path.join(CONFIG.publicDestination, 'portfolio.html');
    const portfolioTemplatePath = path.join('source', 'portfolio.html');
    const portfolioTemplate = safeReadFile(portfolioTemplatePath);
    
    if (portfolioTemplate) {
        let pHtml = portfolioTemplate;
        
        // Strip dev-only tooling blocks (keeps production HTML clean).
        pHtml = pHtml.replace(/<!--\s*ABS_LIVE_RELOAD_START\s*-->[\s\S]*?<!--\s*ABS_LIVE_RELOAD_END\s*-->\s*/g, '');

        // Marker-based strip: remove dev blocks, then inject prod assets at explicit markers.
        pHtml = stripBlockBetweenMarkers(pHtml, 'ABS_BUILD_MARKER:CSS_DEV_START', 'ABS_BUILD_MARKER:CSS_DEV_END');
        pHtml = stripBlockBetweenMarkers(pHtml, 'ABS_BUILD_MARKER:JS_DEV_START', 'ABS_BUILD_MARKER:JS_DEV_END');
        
        // Inject production assets (cache-busted with build timestamp)
        // Phase 2: ES module multi-entry build with shared chunk modulepreload
        const bundledCssTag = `<link rel="stylesheet" href="css/styles.css?v=${buildStamp}">`;
        const portfolioCssTag = `<link rel="stylesheet" href="css/portfolio.css?v=${buildStamp}">`;
        const portfolioSharedPreload = `<link rel="modulepreload" href="js/shared.js?v=${buildStamp}">`;
        const portfolioJsTag = `<script type="module" src="js/portfolio.js?v=${buildStamp}"></script>`;

        // Deterministic injection points:
        pHtml = replaceMarker(pHtml, 'ABS_BUILD_MARKER:CSS_PROD', `${bundledCssTag}\n${portfolioCssTag}\n${portfolioSharedPreload}`);
        pHtml = replaceMarker(pHtml, 'ABS_BUILD_MARKER:JS_PROD', portfolioJsTag);

        // Safety: also update any existing portfolio.css/script tags (in case of template drift)
        pHtml = pHtml.replace(/<link[^>]*rel="stylesheet"[^>]*href="css\/portfolio\.css[^"]*"[^>]*>/g, portfolioCssTag);
        pHtml = pHtml.replace(/<script[^>]*src="js\/portfolio-bundle\.js[^"]*"[^>]*><\/script>/g, portfolioJsTag);
        pHtml = pHtml.replace(/<script[^>]*src="js\/portfolio\.js[^"]*"[^>]*><\/script>/g, portfolioJsTag);
        
        // Always replace existing inline scripts to ensure fresh configs
        if (fs.existsSync(portfolioConfigSrc)) {
          try {
            const raw = fs.readFileSync(portfolioConfigSrc, 'utf-8');
            const min = JSON.stringify(JSON.parse(raw));
            const safe = min.replace(/</g, '\\u003c');
            const inline = `<script>window.__PORTFOLIO_CONFIG__=${safe};</script>`;
            // Replace existing or add new
            pHtml = pHtml.replace(/<script>window\.__PORTFOLIO_CONFIG__=[^<]+<\/script>/g, inline);
            if (!pHtml.includes('__PORTFOLIO_CONFIG__')) {
              pHtml = pHtml.replace('</head>', `${inline}\n</head>`);
            }
            console.log('✅ Inlined portfolio config into dist/portfolio.html (hardcoded)');
          } catch (e) {}
        }
        
        // CONFIG: Inline runtime config into portfolio.html (same as index.html)
        // Portfolio page needs runtime config for wall colors and other global parameters
        if (fs.existsSync(runtimeConfigSrc)) {
          try {
            const raw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
            // Prevent accidental </script> termination and keep HTML safe.
            const safe = raw.replace(/</g, '\\u003c');
            const inline = `<script>window.__RUNTIME_CONFIG__=${safe};</script>`;
            // Replace existing or add new
            pHtml = pHtml.replace(/<script>window\.__RUNTIME_CONFIG__=[^<]+<\/script>/g, inline);
            if (!pHtml.includes('__RUNTIME_CONFIG__')) {
              pHtml = pHtml.replace('</head>', `${inline}\n</head>`);
            }
            console.log('✅ Inlined runtime config into dist/portfolio.html (hardcoded)');
          } catch (e) {}
        }

        // Inject build timestamp for cache-busting images (always replace)
        const buildTimestampInline = `<script>window.__BUILD_TIMESTAMP__=${buildStamp};</script>`;
        pHtml = pHtml.replace(/<script>window\.__BUILD_TIMESTAMP__=[^<]+<\/script>/g, buildTimestampInline);
        if (!pHtml.includes('__BUILD_TIMESTAMP__')) {
          pHtml = pHtml.replace('</head>', `${buildTimestampInline}\n</head>`);
        }

        if (tokensInline) {
          // Replace existing or add new
          pHtml = pHtml.replace(/<script>window\.__TOKENS__=[^<]+<\/script>/g, tokensInline);
          if (!pHtml.includes('__TOKENS__')) {
            pHtml = pHtml.replace('</head>', `${tokensInline}\n</head>`);
          }
        }

        // Ensure theme-color tags match tokens (remove any existing ones first).
        pHtml = pHtml.replace(/^\s*<meta\s+name="theme-color"[^>]*>\s*$/gm, '');
        pHtml = pHtml.replace('</head>', `${themeColorTags}\n</head>`);

        // Inject config-driven frame colors so CSS tokens inherit config values
        if (!pHtml.includes('id="frame-config-vars"')) {
          pHtml = pHtml.replace('<head>', `<head>\n${frameVarsStyle}`);
        }

        fs.writeFileSync(publicPortfolioPath, pHtml);
        console.log('✅ Injected production assets into dist/portfolio.html');
    }

    // 2g. Inject assets into dist/splat/index.html
    const publicSplatPath = path.join(CONFIG.publicDestination, 'splat', 'index.html');
    const splatTemplatePath = path.join('source', 'splat', 'index.html');
    const splatTemplate = safeReadFile(splatTemplatePath);

    if (splatTemplate) {
      let sHtml = splatTemplate;

      sHtml = sHtml.replace(/<!--\s*ABS_LIVE_RELOAD_START\s*-->[\s\S]*?<!--\s*ABS_LIVE_RELOAD_END\s*-->\s*/g, '');

      sHtml = stripBlockBetweenMarkers(sHtml, 'ABS_BUILD_MARKER:CSS_DEV_START', 'ABS_BUILD_MARKER:CSS_DEV_END');
      sHtml = stripBlockBetweenMarkers(sHtml, 'ABS_BUILD_MARKER:JS_DEV_START', 'ABS_BUILD_MARKER:JS_DEV_END');

      // Phase 2: ES module multi-entry build with shared chunk modulepreload
      const bundledCssTag = `<link rel="stylesheet" href="../css/styles.css?v=${buildStamp}">`;
      const splatSharedPreload = `<link rel="modulepreload" href="../js/shared.js?v=${buildStamp}">`;
      const splatJsTag = `<script type="module" src="../js/splat.js?v=${buildStamp}"></script>`;

      sHtml = replaceMarker(sHtml, 'ABS_BUILD_MARKER:CSS_PROD', `${bundledCssTag}\n${splatSharedPreload}`);
      sHtml = replaceMarker(sHtml, 'ABS_BUILD_MARKER:JS_PROD', splatJsTag);

      sHtml = sHtml.replace(/<link[^>]*rel="stylesheet"[^>]*href="\.\.\/css\/bouncy-balls\.css[^"]*"[^>]*>/g, bundledCssTag);
      sHtml = sHtml.replace(/<script[^>]*src="\.\.\/js\/splat-bundle\.js[^"]*"[^>]*><\/script>/g, splatJsTag);
      sHtml = sHtml.replace(/<script[^>]*src="\.\.\/js\/splat\.js[^"]*"[^>]*><\/script>/g, splatJsTag);

      if (fs.existsSync(runtimeConfigSrc)) {
        try {
          const raw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
          const safe = raw.replace(/</g, '\\u003c');
          const inline = `<script>window.__RUNTIME_CONFIG__=${safe};</script>`;
          sHtml = sHtml.replace(/<script>window\.__RUNTIME_CONFIG__=[^<]+<\/script>/g, inline);
          if (!sHtml.includes('__RUNTIME_CONFIG__')) {
            sHtml = sHtml.replace('</head>', `${inline}\n</head>`);
          }
          console.log('✅ Inlined runtime config into dist/splat/index.html (hardcoded)');
        } catch (e) {}
      }

      if (tokensInline) {
        sHtml = sHtml.replace(/<script>window\.__TOKENS__=[^<]+<\/script>/g, tokensInline);
        if (!sHtml.includes('__TOKENS__')) {
          sHtml = sHtml.replace('</head>', `${tokensInline}\n</head>`);
        }
      }

      sHtml = sHtml.replace(/^\s*<meta\s+name="theme-color"[^>]*>\s*$/gm, '');
      sHtml = sHtml.replace('</head>', `${themeColorTags}\n</head>`);

      if (!sHtml.includes('id="frame-config-vars"')) {
        sHtml = sHtml.replace('<head>', `<head>\n${frameVarsStyle}`);
      }

      fs.writeFileSync(publicSplatPath, sHtml);
      console.log('✅ Injected production assets into dist/splat/index.html');
    }

    // Strip dev-only tooling blocks (keeps production HTML clean).
    html = html.replace(/<!--\s*ABS_LIVE_RELOAD_START\s*-->[\s\S]*?<!--\s*ABS_LIVE_RELOAD_END\s*-->\s*/g, '');

    // Production template composition (marker-based; avoids regex drift):
    // - Remove dev-only blocks
    // - Inject production CSS/JS at explicit markers in the template
    html = stripBlockBetweenMarkers(html, 'ABS_BUILD_MARKER:CSS_DEV_START', 'ABS_BUILD_MARKER:CSS_DEV_END');
    html = stripBlockBetweenMarkers(html, 'ABS_BUILD_MARKER:JS_DEV_START', 'ABS_BUILD_MARKER:JS_DEV_END');
    
    // FADE SYSTEM: Inject blocking CSS in <head> to prevent FOUC
    // Include transition here so it's defined from the start (no delay, JS handles timing)
    // Blocking style: Hide content immediately, animation handles the reveal
// No transition needed - keyframe animation in main.css handles the fade
const fadeBlockingCSS = `<style id="fade-blocking">#app-frame{opacity:0}</style>`;
    // Replace existing or add new
    html = html.replace(/<style[^>]*id="fade-blocking"[^>]*>[^<]*<\/style>/g, fadeBlockingCSS);
    if (!html.includes('id="fade-blocking"')) {
      html = html.replace('<head>', '<head>\n' + fadeBlockingCSS);
    }

    // CONFIG: Inline runtime config into HTML (hardcoded at build-time).
    // This allows the JS to boot without fetching any config, while still using the
    // config file as the single source of truth (read here, injected into HTML).
    if (fs.existsSync(runtimeConfigSrc)) {
      try {
        const raw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
        // Prevent accidental </script> termination and keep HTML safe.
        const safe = raw.replace(/</g, '\\u003c');
        const inline = `<script>window.__RUNTIME_CONFIG__=${safe};</script>`;
        // Replace existing or add new
        html = html.replace(/<script>window\.__RUNTIME_CONFIG__=[^<]+<\/script>/g, inline);
        if (!html.includes('__RUNTIME_CONFIG__')) {
          html = html.replace('</head>', `${inline}\n</head>`);
        }
        console.log('✅ Inlined runtime config into dist/index.html (hardcoded)');
      } catch (e) {}
    }

    // TEXT: Inline runtime text dictionary into HTML (hardcoded + minified).
    // Guarantees: zero fetch, no copy pop-in, and a single authoring surface.
    if (fs.existsSync(runtimeTextSrc)) {
      try {
        const raw = fs.readFileSync(runtimeTextSrc, 'utf-8');
        const min = JSON.stringify(JSON.parse(raw));
        const safe = min.replace(/</g, '\\u003c');
        const inline = `<script>window.__TEXT__=${safe};</script>`;
        // Replace existing or add new
        html = html.replace(/<script>window\.__TEXT__=[^<]+<\/script>/g, inline);
        if (!html.includes('__TEXT__')) {
          html = html.replace('</head>', `${inline}\n</head>`);
        }
        console.log('✅ Inlined runtime text into dist/index.html as window.__TEXT__ (minified)');
      } catch (e) {}
    }
    
    if (tokensInline) {
      // Replace existing or add new
      html = html.replace(/<script>window\.__TOKENS__=[^<]+<\/script>/g, tokensInline);
      if (!html.includes('__TOKENS__')) {
        html = html.replace('</head>', `${tokensInline}\n</head>`);
      }
    }

    // Inject theme-color meta tags for mobile browsers (Safari iOS, Chrome Android, Edge).
    // These SHOULD match --bg-light / --bg-dark in tokens for first paint.
    html = html.replace(/^\s*<meta\s+name="theme-color"[^>]*>\s*$/gm, '');
    html = html.replace('</head>', `${themeColorTags}\n</head>`);

    // Inject config-driven frame colors so CSS tokens inherit config values
    if (!html.includes('id="frame-config-vars"')) {
      html = html.replace('<head>', `<head>\n${frameVarsStyle}`);
    }
    
    // Inject resource hints for critical assets (preload fonts, preconnect Google Fonts)
    // Note: CSS/JS preloads removed as they're loaded with cache-bust query strings
    if (isProd) {
      const resourceHints = `
  <!-- Resource Hints: Font Preloading + Connection Hints -->
  <link rel="preload" href="fonts/tabler-icons-outline.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
`;
      // Remove existing resource hints and add fresh ones
      html = html.replace(/<link[^>]*rel="preload"[^>]*>/g, '');
      html = html.replace(/<link[^>]*rel="preconnect"[^>]*>/g, '');
      if (!html.includes('rel="preload"')) {
        html = html.replace('<meta charset', `${resourceHints}<meta charset`);
      }
    }
    
    // Inject production assets at explicit markers (single source of truth).
    // Phase 2: ES module multi-entry build with code-splitting
    const cssTag = `<link id="bravia-balls-css" rel="stylesheet" href="css/styles.css?v=${buildStamp}">`;
    // Modulepreload shared chunk for faster loading (browser can parse while main module loads)
    const sharedPreload = `<link rel="modulepreload" href="js/shared.js?v=${buildStamp}">`;
    const jsTag = `<script id="bravia-balls-js" type="module" src="js/app.js?v=${buildStamp}"></script>`;
    html = replaceMarker(html, 'ABS_BUILD_MARKER:CSS_PROD', `${cssTag}\n${sharedPreload}`);
    html = replaceMarker(html, 'ABS_BUILD_MARKER:JS_PROD', jsTag);
    fs.writeFileSync(publicIndexPath, html);
    console.log('✅ Injected modular assets into dist/index.html');

    // 2g. Inject config frame vars + theme-color + production CSS into dist/cv.html
    const publicCvPath = path.join(CONFIG.publicDestination, 'cv.html');
    if (fs.existsSync(publicCvPath)) {
      try {
        let cvHtml = fs.readFileSync(publicCvPath, 'utf-8');
        
        // Marker-based: remove dev CSS block and inject bundled CSS.
        cvHtml = stripBlockBetweenMarkers(cvHtml, 'ABS_BUILD_MARKER:CSS_DEV_START', 'ABS_BUILD_MARKER:CSS_DEV_END');
        
        // Inject production CSS bundle + shared chunk modulepreload
        const bundledCvCssTag = `<link rel="stylesheet" href="css/styles.css?v=${buildStamp}">`;
        const cvSharedPreload = `<link rel="modulepreload" href="js/shared.js?v=${buildStamp}">`;
        cvHtml = replaceMarker(cvHtml, 'ABS_BUILD_MARKER:CSS_PROD', `${bundledCvCssTag}\n${cvSharedPreload}`);

        // Marker-based: remove dev JS block and inject ES module CV entry
        cvHtml = stripBlockBetweenMarkers(cvHtml, 'ABS_BUILD_MARKER:JS_DEV_START', 'ABS_BUILD_MARKER:JS_DEV_END');
        const cvJsTag = `<script type="module" src="js/cv.js?v=${buildStamp}"></script>`;
        cvHtml = replaceMarker(cvHtml, 'ABS_BUILD_MARKER:JS_PROD', cvJsTag);

        // CONFIG: Inline runtime config into cv.html (hardcoded at build-time).
        if (fs.existsSync(runtimeConfigSrc)) {
          try {
            const raw = fs.readFileSync(runtimeConfigSrc, 'utf-8');
            const safe = raw.replace(/</g, '\\u003c');
            const inline = `<script>window.__RUNTIME_CONFIG__=${safe};</script>`;
            cvHtml = cvHtml.replace(/<script>window\.__RUNTIME_CONFIG__=[^<]+<\/script>/g, inline);
            if (!cvHtml.includes('__RUNTIME_CONFIG__')) {
              cvHtml = cvHtml.replace('</head>', `${inline}\n</head>`);
            }
          } catch (e) {}
        }

        // TEXT: Inline runtime text dictionary to avoid fetch attempts on CV page.
        if (fs.existsSync(runtimeTextSrc)) {
          try {
            const raw = fs.readFileSync(runtimeTextSrc, 'utf-8');
            const min = JSON.stringify(JSON.parse(raw));
            const safe = min.replace(/</g, '\\u003c');
            const inline = `<script>window.__TEXT__=${safe};</script>`;
            cvHtml = cvHtml.replace(/<script>window\.__TEXT__=[^<]+<\/script>/g, inline);
            if (!cvHtml.includes('__TEXT__')) {
              cvHtml = cvHtml.replace('</head>', `${inline}\n</head>`);
            }
          } catch (e) {}
        }
        
        // Ensure theme-color tags match tokens (remove any existing ones first).
        cvHtml = cvHtml.replace(/^\s*<meta\s+name="theme-color"[^>]*>\s*$/gm, '');
        cvHtml = cvHtml.replace('</head>', `${themeColorTags}\n</head>`);
        // Inject config-driven frame colors so CSS tokens inherit config values
        if (!cvHtml.includes('id="frame-config-vars"')) {
          cvHtml = cvHtml.replace('<head>', `<head>\n${frameVarsStyle}`);
        }
        fs.writeFileSync(publicCvPath, cvHtml);
        console.log('✅ Injected production CSS + frame vars into dist/cv.html');
      } catch (e) {
        console.warn('⚠️ Could not process cv.html:', e);
      }
    }

    // 2h. Verify build parity (fail fast on drift-prone surfaces)
    try {
      const { verifyBuildParity } = require('./scripts/verify-build-parity.js');
      verifyBuildParity({ publicDir: path.resolve(CONFIG.publicDestination) });
    } catch (e) {
      console.error('❌ Build parity verifier crashed:', e);
      process.exit(1);
    }

    // Report final bundle sizes (including gzip estimates)
    // Phase 2: ES module multi-entry build reports app.js + shared.js
    const jsAppPath = path.join(jsDir, 'app.js');
    const jsSharedPath = path.join(jsDir, 'shared.js');
    const cssPath = path.join(cssDir, 'styles.css');
    
    if (isProd && fs.existsSync(jsAppPath) && fs.existsSync(cssPath)) {
      const jsAppRaw = fs.readFileSync(jsAppPath);
      const jsSharedRaw = fs.existsSync(jsSharedPath) ? fs.readFileSync(jsSharedPath) : Buffer.alloc(0);
      const cssRaw = fs.readFileSync(cssPath);
      const jsAppGzip = zlib.gzipSync(jsAppRaw, { level: 9 });
      const jsSharedGzip = jsSharedRaw.length > 0 ? zlib.gzipSync(jsSharedRaw, { level: 9 }) : Buffer.alloc(0);
      const cssGzip = zlib.gzipSync(cssRaw, { level: 9 });
      
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📊 BUNDLE SIZES (ES Module Multi-Entry):');
      console.log(`   app.js:    ${Math.round(jsAppRaw.length/1024)}KB → ${Math.round(jsAppGzip.length/1024)}KB gzipped`);
      if (jsSharedRaw.length > 0) {
        console.log(`   shared.js: ${Math.round(jsSharedRaw.length/1024)}KB → ${Math.round(jsSharedGzip.length/1024)}KB gzipped`);
      }
      console.log(`   CSS:       ${Math.round(cssRaw.length/1024)}KB → ${Math.round(cssGzip.length/1024)}KB gzipped`);
      const totalGzip = jsAppGzip.length + jsSharedGzip.length + cssGzip.length;
      console.log(`   Total transfer: ~${Math.round(totalGzip/1024)}KB gzipped`);
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
